import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveConfig } from '../src/core/config.js'
import { createRegistry } from '../src/core/registry.js'

/**
 * A stand-in for the handle `ctx.shell.execute` resolves with: offset readers
 * over two buffers plus a controllable `done` promise.
 */
function fakeExecution() {
  const buffers = { stdout: '', stderr: '' }
  const readers = {}
  for (const stream of ['stdout', 'stderr']) {
    readers[stream] = {
      readFrom(offset) {
        const text = buffers[stream].slice(offset)
        return { text, nextOffset: buffers[stream].length, lossy: false }
      },
    }
  }
  let publish
  const done = new Promise(resolve => { publish = resolve })
  const execution = {
    observed: readers,
    done,
    exitCode: null,
    signal: null,
    result: async () => {
      await done
      return {
        exitCode: execution.exitCode,
        signal: execution.signal,
        timedOut: execution.timedOut === true,
        aborted: execution.aborted === true,
      }
    },
    write(stream, text) {
      buffers[stream] += text
    },
    finish(exitCode = 0) {
      execution.exitCode = exitCode
      publish()
    },
  }
  return execution
}

/** Let the observe() promise chain settle. */
function settle() {
  return new Promise(resolve => setTimeout(resolve, 0))
}

test('a command appears immediately and streams complete lines', async () => {
  const settings = resolveConfig({ pollIntervalMs: 60000 })
  const registry = createRegistry(settings)
  const record = registry.create({ command: 'echo hi', workdir: '/tmp', timeoutMs: 120000 })
  const execution = fakeExecution()
  registry.observe(record, execution)

  assert.equal(registry.list().length, 1)
  assert.equal(registry.list()[0].status, 'running')
  assert.equal(registry.list()[0].command, 'echo hi')

  execution.write('stdout', 'hello\nwor')
  registry.poll()
  let output = registry.outputSince(record.id, 0)
  assert.deepEqual(output.lines.map(line => line.text), ['hello'])

  execution.write('stdout', 'ld\n')
  registry.poll()
  output = registry.outputSince(record.id, 0)
  assert.deepEqual(output.lines.map(line => line.text), ['hello', 'world'])

  execution.finish(0)
  await settle()
  const meta = registry.get(record.id)
  assert.equal(meta.status, 'done')
  assert.equal(meta.exitCode, 0)
  assert.ok(meta.durationMs !== null)
  registry.dispose()
})

test('stderr is retained as its own line kind', async () => {
  const registry = createRegistry(resolveConfig({ pollIntervalMs: 60000 }))
  const record = registry.create({ command: 'fail', workdir: '/tmp' })
  const execution = fakeExecution()
  registry.observe(record, execution)
  execution.write('stdout', 'out line\n')
  execution.write('stderr', 'err line\n')
  registry.poll()
  const kinds = registry.outputSince(record.id, 0).lines.map(line => line.kind + ':' + line.text)
  assert.deepEqual(kinds, ['out:out line', 'err:err line'])
  registry.dispose()
})

test('a nonzero exit is classified failed', async () => {
  const registry = createRegistry(resolveConfig({ pollIntervalMs: 60000 }))
  const record = registry.create({ command: 'false' })
  const execution = fakeExecution()
  registry.observe(record, execution)
  execution.finish(1)
  await settle()
  assert.equal(registry.get(record.id).status, 'failed')
  assert.equal(registry.get(record.id).exitCode, 1)
  registry.dispose()
})

test('a timeout result wins over the exit code', async () => {
  const registry = createRegistry(resolveConfig({ pollIntervalMs: 60000 }))
  const record = registry.create({ command: 'sleep 99' })
  const execution = fakeExecution()
  execution.timedOut = true
  registry.observe(record, execution)
  execution.finish(null)
  await settle()
  assert.equal(registry.get(record.id).status, 'timeout')
  assert.equal(registry.get(record.id).timedOut, true)
  registry.dispose()
})

test('an execute rejection is recorded as failed', () => {
  const registry = createRegistry(resolveConfig({}))
  const record = registry.create({ command: 'blocked' })
  registry.fail(record, new Error('sandbox denied'))
  const meta = registry.get(record.id)
  assert.equal(meta.status, 'failed')
  assert.match(meta.error, /sandbox denied/)
  registry.dispose()
})

test('retention trims old lines and tells clients to reset', async () => {
  const registry = createRegistry(resolveConfig({ maxLines: 20, pollIntervalMs: 60000 }))
  const events = []
  registry.subscribe((event, payload) => events.push({ event, payload }))
  const record = registry.create({ command: 'noisy' })
  const execution = fakeExecution()
  registry.observe(record, execution)
  const all = []
  for (let index = 1; index <= 25; index += 1) all.push(String(index))
  execution.write('stdout', all.join('\n') + '\n')
  registry.poll()

  const output = registry.outputSince(record.id, 0)
  assert.equal(output.truncated, true)
  assert.equal(output.lines.length, 20)
  assert.deepEqual(output.lines.map(line => line.text), all.slice(5))
  const reset = events.filter(item => item.event === 'output' && item.payload.reset === true)
  assert.equal(reset.length, 1)
  assert.equal(reset[0].payload.lines.length, 20)
  registry.dispose()
})

test('finished commands are pruned before running ones', async () => {
  let clock = 1000
  const registry = createRegistry(resolveConfig({ maxCommands: 2, pollIntervalMs: 60000 }), { now: () => clock++ })
  const first = registry.create({ command: 'first' })
  const firstExecution = fakeExecution()
  registry.observe(first, firstExecution)
  firstExecution.finish(0)
  await settle()

  const running = registry.create({ command: 'second' })
  registry.observe(running, fakeExecution())
  registry.create({ command: 'third' })

  const ids = registry.list().map(meta => meta.command)
  assert.deepEqual(ids, ['third', 'second'])
  assert.equal(ids.includes('first'), false)
  registry.dispose()
})

test('outputSince filters by sequence number', async () => {
  const registry = createRegistry(resolveConfig({ pollIntervalMs: 60000 }))
  const record = registry.create({ command: 'seq' })
  const execution = fakeExecution()
  registry.observe(record, execution)
  execution.write('stdout', 'a\nb\nc\n')
  registry.poll()
  const tail = registry.outputSince(record.id, 1)
  assert.deepEqual(tail.lines.map(line => line.text), ['b', 'c'])
  assert.equal(tail.nextSeq, 3)
  registry.dispose()
})

test('text() marks stderr lines', () => {
  const registry = createRegistry(resolveConfig({ pollIntervalMs: 60000 }))
  const record = registry.create({ command: 'mixed' })
  const execution = fakeExecution()
  registry.observe(record, execution)
  execution.write('stdout', 'ok\n')
  execution.write('stderr', 'bad\n')
  registry.poll()
  assert.equal(registry.text(record.id), 'ok\n[stderr] bad\n')
  registry.dispose()
})
