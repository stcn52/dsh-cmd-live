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
 *
 * The surface is read-only on purpose: a panel that shows every command the
 * agent runs must not become a second way to run one.
 * @module dsh-cmd-live/host/routes
 */

/** Route prefix claimed by this plugin. */
export const ROUTE_PREFIX = '/cmd-live'

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
export function registerRoutes(ctx, registry) {
  if (typeof ctx.inject !== 'function') return false
  ctx.inject(['webServer'], webCtx => {
    webCtx.effect(() => webCtx.webServer.register({
      kind: 'prefix',
      path: ROUTE_PREFIX,
      handler: (req, res) => {
        try {
          handle(req, res, registry)
        } catch (error) {
          if (res.writableEnded) return
          try {
            sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) })
          } catch {
            res.end()
          }
        }
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
function handle(req, res, registry) {
  const url = new URL(req.url ?? '/', 'http://localhost')
  const path = url.pathname
  const method = req.method ?? 'GET'

  if (method !== 'GET') {
    sendJson(res, 405, { error: 'GET required' })
    return
  }

  if (path === `${ROUTE_PREFIX}/commands`) {
    sendJson(res, 200, { commands: registry.list(), serverTime: Date.now() })
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
