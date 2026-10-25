import { test } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { PassThrough } from 'node:stream'
import { resolveConfig } from '../src/core/config.js'
import { createRegistry } from '../src/core/registry.js'
import { createTermManager } from '../src/core/terms.js'
import { registerRoutes } from '../src/host/routes.js'

/** Capture the one route registration the plugin makes. */
function mount(registry, terms) {
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
  registerRoutes(ctx, registry, terms)
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

/** Fake PTY provider for the terminal routes. */
function fakeSubprocess() {
  const handles = []
  return {
    handles,
    async spawnTerminal() {
      const output = new PassThrough()
      let publish
      const done = new Promise(resolve => { publish = resolve })
      const handle = {
        pid: 4242,
        output,
        done,
        written: [],
        async write(data) { handle.written.push(data) },
        async resize() {},
        async terminate() { output.end(); publish({ exitCode: 0, signal: null }) },
        push(text) { output.write(Buffer.from(text, 'utf8')) },
      }
      output.on('end', () => publish({ exitCode: 0, signal: null }))
      handles.push(handle)
      return handle
    },
  }
}

test('terminal routes create, stream, accept input and close', async () => {
  const registry = createRegistry(resolveConfig({}))
  const subprocess = fakeSubprocess()
  const terms = createTermManager(resolveConfig({}))
  terms.attach(subprocess)
  const { server, base } = await serve(mount(registry, terms))
  try {
    const created = await fetch(`${base}/cmd-live/term/create`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ cols: 90, rows: 24 }),
    })
    assert.equal(created.status, 201)
    const { terminal } = await created.json()
    assert.equal(terminal.status, 'running')

    const listed = await (await fetch(`${base}/cmd-live/term/list`)).json()
    assert.equal(listed.available, true)
    assert.equal(listed.terminals.length, 1)

    const controller = new AbortController()
    const stream = await fetch(`${base}/cmd-live/term/stream?id=${terminal.id}`, { signal: controller.signal })
    assert.equal(stream.status, 200)
    const reader = stream.body.getReader()
    const decoder = new TextDecoder()
    let text = ''
    while (!text.includes('event: init')) {
      const { value, done } = await reader.read()
      if (done) break
      text += decoder.decode(value, { stream: true })
    }
    assert.match(text, /event: init/)
    subprocess.handles[0].push('prompt$ ')
    await new Promise(resolve => setTimeout(resolve, 30))
    text += decoder.decode(await reader.read().then(r => r.value ?? new Uint8Array()), { stream: true })
    assert.match(text, /event: data/)
    controller.abort()

    const input = await fetch(`${base}/cmd-live/term/input`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: terminal.id, data: 'ls\r' }),
    })
    assert.equal(input.status, 200)
    assert.deepEqual(subprocess.handles[0].written, ['ls\r'])

    const resized = await fetch(`${base}/cmd-live/term/resize`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: terminal.id, cols: 120, rows: 40 }),
    })
    assert.equal(resized.status, 200)

    const closed = await fetch(`${base}/cmd-live/term/close`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: terminal.id }),
    })
    assert.equal(closed.status, 200)
    assert.equal((await (await fetch(`${base}/cmd-live/term/list`)).json()).terminals.length, 0)
  } finally {
    server.close()
    await terms.dispose()
    registry.dispose()
  }
})

test('terminal routes report an unavailable backend', async () => {
  const registry = createRegistry(resolveConfig({}))
  const terms = createTermManager(resolveConfig({}))
  const { server, base } = await serve(mount(registry, terms))
  try {
    const listed = await (await fetch(`${base}/cmd-live/term/list`)).json()
    assert.equal(listed.available, false)
    const created = await fetch(`${base}/cmd-live/term/create`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    })
    assert.equal(created.status, 503)
  } finally {
    server.close()
    await terms.dispose()
    registry.dispose()
  }
})

test('the vendored xterm assets are served from the package', async () => {
  const registry = createRegistry(resolveConfig({}))
  const { server, base } = await serve(mount(registry))
  try {
    const js = await fetch(`${base}/cmd-live/vendor/xterm.js`)
    assert.equal(js.status, 200)
    assert.match(js.headers.get('content-type'), /javascript/)
    assert.ok((await js.text()).length > 100000)
    const css = await fetch(`${base}/cmd-live/vendor/xterm.css`)
    assert.match(css.headers.get('content-type'), /text\/css/)
    const missing = await fetch(`${base}/cmd-live/vendor/nope.js`)
    assert.equal(missing.status, 404)
  } finally {
    server.close()
    registry.dispose()
  }
})
