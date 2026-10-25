import { test } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { resolveConfig } from '../src/core/config.js'
import { createRegistry } from '../src/core/registry.js'
import { registerRoutes } from '../src/host/routes.js'

/** Capture the one route registration the plugin makes. */
function mount(registry) {
  const registrations = []
  const webCtx = {
    webServer: {
      register(spec) {
        registrations.push(spec)
        return () => {}
      },
    },
    effect(callback) {
      return callback()
    },
  }
  const ctx = {
    inject(_services, callback) {
      callback(webCtx)
    },
    effect(callback) {
      callback()
    },
  }
  registerRoutes(ctx, registry)
  assert.equal(registrations.length, 1)
  assert.equal(registrations[0].path, '/cmd-live')
  return registrations[0]
}

/** Start a throwaway HTTP server around the route handler. */
function serve(registration) {
  const server = http.createServer((req, res) => registration.handler(req, res))
  return new Promise(resolve => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      resolve({ server, base: `http://127.0.0.1:${port}` })
    })
  })
}

/** A record with two complete lines and no live handle. */
function seed(registry) {
  const record = registry.create({ command: 'printf hi', workdir: '/tmp' })
  registry.finish(record, { exitCode: 0 })
  return record
}

test('the commands route lists retained records', async () => {
  const registry = createRegistry(resolveConfig({}))
  seed(registry)
  const { server, base } = await serve(mount(registry))
  try {
    const response = await fetch(`${base}/cmd-live/commands`)
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.equal(body.commands.length, 1)
    assert.equal(body.commands[0].command, 'printf hi')
  } finally {
    server.close()
    registry.dispose()
  }
})

test('unknown ids and routes return readable errors', async () => {
  const registry = createRegistry(resolveConfig({}))
  const { server, base } = await serve(mount(registry))
  try {
    const missing = await fetch(`${base}/cmd-live/output?id=nope`)
    assert.equal(missing.status, 404)
    assert.match((await missing.json()).error, /not known/)

    const unknown = await fetch(`${base}/cmd-live/nope`)
    assert.equal(unknown.status, 404)

    const wrongMethod = await fetch(`${base}/cmd-live/commands`, { method: 'POST' })
    assert.equal(wrongMethod.status, 405)
  } finally {
    server.close()
    registry.dispose()
  }
})

test('the stream route sends an init snapshot first', async () => {
  const registry = createRegistry(resolveConfig({}))
  seed(registry)
  const { server, base } = await serve(mount(registry))
  const controller = new AbortController()
  try {
    const response = await fetch(`${base}/cmd-live/stream`, { signal: controller.signal })
    assert.equal(response.status, 200)
    assert.match(response.headers.get('content-type'), /text\/event-stream/)
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let text = ''
    while (!text.includes('event: init')) {
      const { value, done } = await reader.read()
      if (done) break
      text += decoder.decode(value, { stream: true })
    }
    assert.match(text, /event: init/)
    assert.match(text, /printf hi/)
  } finally {
    controller.abort()
    server.close()
    registry.dispose()
  }
})

test('the kill route stops a running command', async () => {
  const registry = createRegistry(resolveConfig({}))
  const record = registry.create({ command: 'sleep 99' })
  let killed = false
  registry.observe(record, {
    observed: {},
    done: new Promise(() => {}),
    result: () => new Promise(() => {}),
    kill: () => { killed = true; return true },
  })
  const { server, base } = await serve(mount(registry))
  try {
    const response = await fetch(`${base}/cmd-live/kill`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: record.id }),
    })
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.equal(body.killed, true)
    assert.equal(killed, true)

    const missing = await fetch(`${base}/cmd-live/kill`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 'nope' }),
    })
    assert.equal(missing.status, 404)

    const wrongMethod = await fetch(`${base}/cmd-live/kill`)
    assert.equal(wrongMethod.status, 405)
  } finally {
    server.close()
    registry.dispose()
  }
})
