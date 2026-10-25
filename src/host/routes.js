/**
 * Host HTTP surface for the command panel.
 *
 * The client bundle runs in the browser and cannot read the host's process
 * table, so these routes are the only data channel:
 *
 *   GET /cmd-live/commands           retained commands, running first
 *   GET /cmd-live/output?id&since    one command's retained lines from a seq
 *   GET /cmd-live/text?id            one command's retained output as text
 *   GET /cmd-live/stream             SSE: init snapshot, then start/output/end
 *   POST /cmd-live/kill              stop one running command
 *
 * Terminal half (real PTY, see `core/terms.js`):
 *
 *   GET  /cmd-live/term/list         retained terminal sessions
 *   POST /cmd-live/term/create       allocate one PTY
 *   GET  /cmd-live/term/stream?id&since  SSE: replay buffer, then live output
 *   POST /cmd-live/term/input        write terminal input
 *   POST /cmd-live/term/resize       change the PTY grid
 *   POST /cmd-live/term/close        terminate one PTY
 *   GET  /cmd-live/vendor/*          the vendored xterm assets
 *
 * The only mutating call is `kill`: the panel can stop a command it already
 * shows, but it can never start one. The surface stays a monitor, not a shell.
 * @module dsh-cmd-live/host/routes
 */

import { readFileSync } from 'node:fs'

/** Route prefix claimed by this plugin. */
export const ROUTE_PREFIX = '/cmd-live'

/** This package's version, echoed by `/commands` so a stale host is visible. */
const PLUGIN_VERSION = (() => {
  try {
    return JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')).version ?? null
  } catch {
    return null
  }
})()

/** Upper bound for a JSON request body; the panel sends a short id. */
const MAX_BODY_BYTES = 128 * 1024

/** Vendored browser assets; served from this package, never from a CDN. */
const VENDOR = {
  'xterm.js': { file: 'xterm.js', type: 'application/javascript; charset=utf-8' },
  'xterm.css': { file: 'xterm.css', type: 'text/css; charset=utf-8' },
  'addon-fit.js': { file: 'addon-fit.js', type: 'application/javascript; charset=utf-8' },
}

/** Cache of vendored file bodies read from the package directory. */
const vendorCache = new Map()

/** Heartbeat interval: proxies drop an idle SSE connection otherwise. */
const PING_INTERVAL_MS = 15000

/**
 * Send one JSON response.
 * @param res - server response.
 * @param status - HTTP status code.
 * @param value - JSON-serializable body.
 */
function sendJson(res, status, value) {
  const body = JSON.stringify(value)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  })
  res.end(body)
}

/**
 * Send plain text.
 * @param res - server response.
 * @param status - HTTP status code.
 * @param type - media type.
 * @param body - response body.
 */
function sendText(res, status, type, body) {
  res.writeHead(status, {
    'content-type': `${type}; charset=utf-8`,
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  })
  res.end(body)
}

/**
 * Write one named SSE event.
 * @param res - server response.
 * @param name - event name.
 * @param value - JSON payload.
 */
function writeEvent(res, name, value) {
  res.write(`event: ${name}\ndata: ${JSON.stringify(value)}\n\n`)
}

/**
 * Stream the registry: one init snapshot, then live events until the client
 * disconnects.
 * @param req - server request.
 * @param res - server response.
 * @param registry - command registry.
 */
function streamRegistry(req, res, registry) {
  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    'x-accel-buffering': 'no',
  })
  res.write('retry: 3000\n\n')
  res.write(': connected\n\n')
  // The snapshot and the subscription happen in the same tick, so no start
  // event can slip between them.
  const unsubscribe = registry.subscribe((event, payload) => {
    if (!res.writableEnded) writeEvent(res, event, payload)
  })
  writeEvent(res, 'init', { commands: registry.list(), serverTime: Date.now() })
  const ping = setInterval(() => {
    if (!res.writableEnded) res.write(': ping\n\n')
  }, PING_INTERVAL_MS)
  ping.unref?.()
  req.on('close', () => {
    clearInterval(ping)
    unsubscribe()
  })
}

/**
 * Read a small JSON object body.
 * @param req - server request.
 * @returns the parsed object ({} when empty).
 */
async function readJson(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) throw new Error('request body is too large')
    chunks.push(chunk)
  }
  if (size === 0) return {}
  const text = Buffer.concat(chunks).toString('utf8').trim()
  if (text === '') return {}
  const parsed = JSON.parse(text)
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('request body must be a JSON object')
  }
  return parsed
}

/**
 * Serve one vendored xterm asset.
 * @param res - server response.
 * @param name - requested file name.
 */
function serveVendor(res, name) {
  const entry = VENDOR[name]
  if (entry === undefined) {
    sendJson(res, 404, { error: `unknown vendor asset "${name}"` })
    return
  }
  let body = vendorCache.get(entry.file)
  if (body === undefined) {
    try {
      body = readFileSync(new URL(`../../vendor/${entry.file}`, import.meta.url))
      vendorCache.set(entry.file, body)
    } catch (error) {
      sendJson(res, 500, { error: describe(error) })
      return
    }
  }
  res.writeHead(200, {
    'content-type': entry.type,
    'cache-control': 'public, max-age=3600',
    'content-length': body.length,
  })
  res.end(body)
}

/**
 * Stream a terminal: replay the buffer, then follow output until it exits or
 * the browser disconnects.
 * @param req - server request.
 * @param res - server response.
 * @param terms - terminal manager.
 * @param url - parsed request URL.
 */
function streamTerminal(req, res, terms, url) {
  const id = url.searchParams.get('id')
  if (id === null || id === '') {
    sendJson(res, 400, { error: 'id is required' })
    return
  }
  if (terms === null || terms === undefined) {
    sendJson(res, 503, { error: 'the terminal backend is not mounted' })
    return
  }
  const sinceRaw = url.searchParams.get('since')
  const since = sinceRaw === null ? 0 : Number(sinceRaw)
  const subscription = terms.subscribe(id, since, (event, payload) => {
    if (res.writableEnded) return
    if (event === 'data') {
      writeEvent(res, 'data', { seq: payload.seq, text: payload.text })
      return
    }
    writeEvent(res, 'exit', payload)
    res.end()
    subscription.unsubscribe()
  })
  if (subscription === null) {
    sendJson(res, 404, { error: `terminal "${id}" is not known` })
    return
  }
  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    'x-accel-buffering': 'no',
  })
  res.write('retry: 3000\n\n: connected\n\n')
  writeEvent(res, 'init', {
    terminal: subscription.terminal,
    reset: subscription.reset,
    nextSeq: subscription.nextSeq,
    floorSeq: subscription.floorSeq,
    chunks: subscription.chunks,
  })
  if (subscription.terminal.status !== 'running') {
    res.end()
    subscription.unsubscribe()
    return
  }
  const ping = setInterval(() => {
    if (!res.writableEnded) res.write(': ping\n\n')
  }, PING_INTERVAL_MS)
  ping.unref?.()
  req.on('close', () => {
    clearInterval(ping)
    subscription.unsubscribe()
  })
}

/**
 * @param error - unknown value.
 * @returns a readable message.
 */
function describe(error) {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Mount the HTTP surface.
 *
 * Services are reached through cordis injection, not a name lookup: `ctx.get()`
 * takes a plugin, so `ctx.get('webServer')` quietly returns undefined and every
 * route 404s. Injecting also covers both legitimate orderings — a web server
 * that loads after this plugin, and a headless profile that has none at all,
 * where the callback simply never runs and the host half does nothing.
 * @param ctx - Cordis context.
 * @param registry - command registry.
 * @returns true when the routes were handed to the injection scope.
 */
export function registerRoutes(ctx, registry, terms) {
  if (typeof ctx.inject !== 'function') return false
  ctx.inject(['webServer'], webCtx => {
    webCtx.effect(() => webCtx.webServer.register({
      kind: 'prefix',
      path: ROUTE_PREFIX,
      handler: (req, res) => {
        handle(req, res, registry, terms).catch(error => {
          if (res.writableEnded) return
          try {
            sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) })
          } catch {
            res.end()
          }
        })
      },
    }))
  })
  return true
}

/**
 * Route one request.
 * @param req - server request.
 * @param res - server response.
 * @param registry - command registry.
 */
async function handle(req, res, registry, terms) {
  const url = new URL(req.url ?? '/', 'http://localhost')
  const path = url.pathname
  const method = req.method ?? 'GET'

  if (path.startsWith(`${ROUTE_PREFIX}/vendor/`)) {
    if (method !== 'GET') {
      sendJson(res, 405, { error: 'GET required' })
      return
    }
    serveVendor(res, path.slice(`${ROUTE_PREFIX}/vendor/`.length))
    return
  }

  if (path === `${ROUTE_PREFIX}/term/list`) {
    if (method !== 'GET') {
      sendJson(res, 405, { error: 'GET required' })
      return
    }
    sendJson(res, 200, {
      available: terms !== null && terms !== undefined && terms.available(),
      terminals: terms === null || terms === undefined ? [] : terms.list(),
    })
    return
  }

  if (path === `${ROUTE_PREFIX}/term/create`) {
    if (method !== 'POST') {
      sendJson(res, 405, { error: 'POST required' })
      return
    }
    if (terms === null || terms === undefined || !terms.available()) {
      sendJson(res, 503, { error: 'this host has no PTY backend (restart DSH with the current plugin build)' })
      return
    }
    let body
    try {
      body = await readJson(req)
    } catch (error) {
      sendJson(res, 400, { error: describe(error) })
      return
    }
    try {
      const terminal = await terms.create({ cols: body.cols, rows: body.rows, title: body.title })
      sendJson(res, 201, { terminal })
    } catch (error) {
      sendJson(res, 500, { error: describe(error) })
    }
    return
  }

  if (path === `${ROUTE_PREFIX}/term/stream`) {
    if (method !== 'GET') {
      sendJson(res, 405, { error: 'GET required' })
      return
    }
    streamTerminal(req, res, terms, url)
    return
  }

  if (path === `${ROUTE_PREFIX}/term/input` || path === `${ROUTE_PREFIX}/term/resize` || path === `${ROUTE_PREFIX}/term/close`) {
    if (method !== 'POST') {
      sendJson(res, 405, { error: 'POST required' })
      return
    }
    if (terms === null || terms === undefined) {
      sendJson(res, 503, { error: 'the terminal backend is not mounted' })
      return
    }
    let body
    try {
      body = await readJson(req)
    } catch (error) {
      sendJson(res, 400, { error: describe(error) })
      return
    }
    const id = typeof body.id === 'string' ? body.id : ''
    if (id === '') {
      sendJson(res, 400, { error: 'id is required' })
      return
    }
    try {
      if (path.endsWith('/input')) {
        sendJson(res, 200, { terminal: terms.input(id, body.data) })
      } else if (path.endsWith('/resize')) {
        sendJson(res, 200, { terminal: await terms.resize(id, body.cols, body.rows) })
      } else {
        const closed = await terms.close(id)
        sendJson(res, closed ? 200 : 404, closed ? { closed: true } : { error: `terminal "${id}" is not known` })
      }
    } catch (error) {
      const status = typeof error?.status === 'number' ? error.status : 500
      sendJson(res, status, { error: describe(error) })
    }
    return
  }

  if (path === `${ROUTE_PREFIX}/kill`) {
    if (method !== 'POST') {
      sendJson(res, 405, { error: 'POST required' })
      return
    }
    let body
    try {
      body = await readJson(req)
    } catch (error) {
      sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) })
      return
    }
    const id = typeof body.id === 'string' ? body.id : ''
    if (id === '') {
      sendJson(res, 400, { error: 'id is required' })
      return
    }
    const result = registry.kill(id)
    if (result.command === null) {
      sendJson(res, 404, { error: `command "${id}" is not known` })
      return
    }
    sendJson(res, result.killed ? 200 : 409, result)
    return
  }

  if (method !== 'GET') {
    sendJson(res, 405, { error: 'GET required' })
    return
  }

  if (path === `${ROUTE_PREFIX}/commands`) {
    sendJson(res, 200, { commands: registry.list(), serverTime: Date.now(), version: PLUGIN_VERSION })
    return
  }

  if (path === `${ROUTE_PREFIX}/stream`) {
    streamRegistry(req, res, registry)
    return
  }

  if (path === `${ROUTE_PREFIX}/output`) {
    const id = url.searchParams.get('id')
    if (id === null || id === '') {
      sendJson(res, 400, { error: 'id is required' })
      return
    }
    const sinceRaw = url.searchParams.get('since')
    const since = sinceRaw === null ? 0 : Number(sinceRaw)
    const output = registry.outputSince(id, Number.isFinite(since) ? since : 0)
    if (output === null) {
      sendJson(res, 404, { error: `command "${id}" is not known (a host restart clears history)` })
      return
    }
    sendJson(res, 200, output)
    return
  }

  if (path === `${ROUTE_PREFIX}/text`) {
    const id = url.searchParams.get('id')
    if (id === null || id === '') {
      sendJson(res, 400, { error: 'id is required' })
      return
    }
    const text = registry.text(id)
    if (text === null) {
      sendJson(res, 404, { error: `command "${id}" is not known` })
      return
    }
    sendText(res, 200, 'text/plain', text)
    return
  }

  sendJson(res, 404, { error: `unknown route ${method} ${path}` })
}
