import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveConfig } from '../src/core/config.js'
import { createRegistry } from '../src/core/registry.js'
import { attachShellMonitor } from '../src/host/monitor.js'

/** Minimal shell executor stand-in with one live execution. */
function fakeShell() {
  const executions = []
  return {
    executions,
    async execute(spec) {
      const execution = {
        observed: {
          stdout: { readFrom: () => ({ text: '', nextOffset: 0, lossy: false }) },
          stderr: { readFrom: () => ({ text: '', nextOffset: 0, lossy: false }) },
        },
        done: Promise.resolve(),
        result: async () => ({ exitCode: 0, signal: null, timedOut: false, aborted: false }),
        spec,
      }
      executions.push(execution)
      return execution
    },
  }
}

test('every execute call becomes a command record', async () => {
  const registry = createRegistry(resolveConfig({ pollIntervalMs: 60000 }))
  const shell = fakeShell()
  const detach = attachShellMonitor({ shell }, registry)
  assert.equal(typeof detach, 'function')

  const execution = await shell.execute({ command: 'ls -la', workdir: '/work', timeoutMs: 5000 })
  assert.equal(execution.spec.command, 'ls -la')

  const list = registry.list()
  assert.equal(list.length, 1)
  assert.equal(list[0].command, 'ls -la')
  assert.equal(list[0].workdir, '/work')
  assert.equal(list[0].timeoutMs, 5000)

  detach()
  registry.dispose()
})

test('the wrapper is removed on detach and restored idempotently', () => {
  const registry = createRegistry(resolveConfig({}))
  const shell = fakeShell()
  const original = shell.execute
  const detach = attachShellMonitor({ shell }, registry)
  assert.notEqual(shell.execute, original)
  assert.equal(attachShellMonitor({ shell }, registry), null)

  detach()
  assert.equal(shell.execute, original)
  detach()
  assert.equal(shell.execute, original)
  registry.dispose()
})

test('a rejected execute is rethrown and recorded', async () => {
  const registry = createRegistry(resolveConfig({}))
  const shell = {
    async execute() {
      throw new Error('executor unavailable')
    },
  }
  attachShellMonitor({ shell }, registry)
  await assert.rejects(() => shell.execute({ command: 'nope' }), /executor unavailable/)
  const list = registry.list()
  assert.equal(list.length, 1)
  assert.equal(list[0].status, 'failed')
  assert.match(list[0].error, /executor unavailable/)
  registry.dispose()
})
