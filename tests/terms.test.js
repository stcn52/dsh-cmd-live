import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PassThrough } from 'node:stream'
import { resolveConfig } from '../src/core/config.js'
import { createTermManager } from '../src/core/terms.js'

/** Minimal PTY provider: a PassThrough output plus recorded control calls. */
function fakeSubprocess() {
  const handles = []
  return {
    handles,
    async spawnTerminal(spec) {
      const output = new PassThrough()
      let publish
      const done = new Promise(resolve => { publish = resolve })
      const handle = {
        pid: 2000 + handles.length,
        output,
        done,
        written: [],
        resizes: [],
        terminated: false,
        async write(data) { handle.written.push(data) },
        async resize(cols, rows) { handle.resizes.push([cols, rows]) },
        async terminate() {
          handle.terminated = true
          output.end()
          publish({ exitCode: 0, signal: null })
        },
        push(text) { output.write(Buffer.from(text, 'utf8')) },
      }
      output.on('end', () => publish({ exitCode: 0, signal: null }))
      handles.push(handle)
      return handle
    },
  }
}

function setup() {
  const subprocess = fakeSubprocess()
  const terms = createTermManager(resolveConfig({ terminal: { maxChunks: 3 } }))
  terms.attach(subprocess)
  return { subprocess, terms }
}

test('create returns a running session and streams decoded output', async () => {
  const { subprocess, terms } = setup()
  const meta = await terms.create({ cols: 90, rows: 24 })
  assert.equal(meta.status, 'running')
  assert.equal(meta.cols, 90)
  assert.equal(meta.rows, 24)

  const events = []
  const subscription = terms.subscribe(meta.id, 0, (event, payload) => events.push({ event, payload }))
  assert.equal(subscription.reset, false)
  assert.deepEqual(subscription.chunks, [])

  subprocess.handles[0].push('hello')
  assert.deepEqual(events.map(item => item.event), ['data'])
  assert.equal(events[0].payload.text, 'hello')

  subprocess.handles[0].push(' world\n')
  const replay = terms.subscribe(meta.id, 0, () => {})
  assert.equal(replay.chunks.map(chunk => chunk.text).join(''), 'hello world\n')
  await terms.dispose()
})

test('input, resize and close reach the handle', async () => {
  const { subprocess, terms } = setup()
  const meta = await terms.create()
  terms.input(meta.id, 'ls\r')
  assert.deepEqual(subprocess.handles[0].written, ['ls\r'])

  await terms.resize(meta.id, 120, 40)
  assert.deepEqual(subprocess.handles[0].resizes, [[120, 40]])
  assert.equal(terms.list()[0].cols, 120)

  assert.equal(await terms.close(meta.id), true)
  assert.equal(subprocess.handles[0].terminated, true)
  assert.equal(terms.list().length, 0)
  assert.throws(() => terms.input(meta.id, 'x'), /not known/)
})

test('an exited terminal reports its status and replays the tail', async () => {
  const { subprocess, terms } = setup()
  const meta = await terms.create()
  subprocess.handles[0].push('bye')
  subprocess.handles[0].output.end()
  await subprocess.handles[0].done
  await new Promise(resolve => setTimeout(resolve, 10))

  const listed = terms.list()[0]
  assert.equal(listed.status, 'exited')
  assert.equal(listed.exitCode, 0)
  assert.throws(() => terms.input(meta.id, 'x'), /exited/)
  const replay = terms.subscribe(meta.id, 0, () => {})
  assert.equal(replay.chunks.map(chunk => chunk.text).join(''), 'bye')
  await terms.dispose()
})

test('the replay buffer is bounded and reports a reset point', async () => {
  const { subprocess, terms } = setup()
  const meta = await terms.create()
  const handle = subprocess.handles[0]
  handle.push('a')
  handle.push('b')
  handle.push('c')
  handle.push('d')
  handle.push('e')
  const fresh = terms.subscribe(meta.id, 0, () => {})
  assert.equal(fresh.reset, true)
  assert.deepEqual(fresh.chunks.map(chunk => chunk.text), ['b', 'c', 'd', 'e'])
  assert.equal(fresh.floorSeq, 1)
  await terms.dispose()
})

test('input after exit is refused, and unknown ids are routable errors', async () => {
  const { terms } = setup()
  await terms.create()
  assert.throws(() => terms.input('nope', 'x'), error => error.status === 404)
  await terms.dispose()
  await assert.rejects(() => terms.create(), /disposed/)
})
