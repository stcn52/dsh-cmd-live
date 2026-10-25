/**
 * Interactive terminal sessions for the sidebar panel.
 *
 * Each session is a real PTY allocated through `ctx.subprocess.spawnTerminal` —
 * the same seam the built-in terminal uses — so the shell receives a genuine
 * terminal: line editing, job control, colours and `Ctrl+C` all behave. This
 * module owns only the bounded replay buffer and the subscriber fan-out; the
 * subprocess provider owns the PTY, its process group and termination.
 *
 * Sessions live in this host process and survive a page refresh; they end when
 * the panel closes them or the plugin unloads.
 * @module dsh-cmd-live/terms
 */

import { StringDecoder } from 'node:string_decoder'

/** Largest single output frame kept; xterm handles anything, but the JSON frame should stay small. */
const MAX_CHUNK_CHARS = 64 * 1024

/** Largest accepted input write (one keypress batch is far smaller). */
const MAX_INPUT_CHARS = 64 * 1024

/**
 * Create the terminal manager.
 * @param settings - resolved plugin config.
 * @param deps - test seams: `now`, `shell`, `cwd`, `random`.
 * @returns manager API used by the routes.
 */
export function createTermManager(settings, deps = {}) {
  const now = deps.now ?? (() => Date.now())
  const shell = deps.shell ?? settings.terminal.shell ?? process.env.SHELL ?? '/bin/bash'
  const cwd = deps.cwd ?? settings.terminal.cwd ?? process.cwd()
  const random = deps.random ?? Math.random
  /** @type {Map<string, object>} */
  const sessions = new Map()
  let subprocess = null
  let counter = 0
  let disposed = false

  /**
   * Bind the subprocess provider that allocates PTYs.
   * @param service - `ctx.subprocess`.
   */
  function attach(service) {
    subprocess = service
  }

  /** @returns true when a PTY backend is available. */
  function available() {
    return subprocess !== null && !disposed
  }

  /**
   * Project one session to its wire shape (no output chunks).
   * @param session - internal session.
   * @returns plain object.
   */
  function meta(session) {
    return {
      id: session.id,
      title: session.title,
      pid: session.pid,
      status: session.status,
      cols: session.cols,
      rows: session.rows,
      createdAt: session.createdAt,
      endedAt: session.endedAt,
      exitCode: session.exitCode,
      signal: session.signal,
      error: session.error,
      bytes: session.bytes,
      truncated: session.truncated,
    }
  }

  /**
   * Allocate a PTY and start its shell.
   * @param options - optional `cols`, `rows`, `title`.
   * @returns the new session's metadata.
   */
  async function create(options = {}) {
    if (disposed) throw new Error('the terminal manager is disposed')
    if (subprocess === null) throw new Error('no subprocess provider is mounted in this composition')
    const cols = clampInt(options.cols, settings.terminal.cols, 20, 500)
    const rows = clampInt(options.rows, settings.terminal.rows, 5, 200)

    const handle = await subprocess.spawnTerminal({
      argv: [shell, '-l'],
      cwd,
      rows,
      cols,
      terminalType: 'xterm-256color',
      env: { TERM: 'xterm-256color', COLORTERM: 'truecolor' },
      graceMs: 1000,
    })

    counter += 1
    const session = {
      id: `term_${counter.toString(36)}_${random().toString(36).slice(2, 6)}`,
      title: typeof options.title === 'string' && options.title.trim() !== '' ? options.title.trim().slice(0, 60) : `终端 ${counter}`,
      pid: handle.pid ?? null,
      status: 'running',
      cols,
      rows,
      createdAt: now(),
      endedAt: null,
      exitCode: null,
      signal: null,
      error: null,
      handle,
      decoder: new StringDecoder('utf8'),
      chunks: [],
      floorSeq: 0,
      nextSeq: 0,
      bytes: 0,
      truncated: false,
      subscribers: new Set(),
    }
    sessions.set(session.id, session)

    handle.output.on('data', buffer => {
      if (disposed) return
      const text = session.decoder.write(buffer)
      if (text !== '') append(session, text)
    })
    handle.output.on('end', () => {
      const tail = session.decoder.end()
      if (tail !== '') append(session, tail)
    })
    // A transport error is reported through `done`; the stream error itself
    // must not become an unhandled emitter error.
    handle.output.on('error', () => {})
    handle.done.then(
      outcome => finish(session, outcome, null),
      error => finish(session, null, error),
    )
    return meta(session)
  }

  /**
   * Append one decoded output chunk and trim the replay buffer.
   * @param session - internal session.
   * @param text - UTF-8 text.
   */
  function append(session, text) {
    let body = text
    if (body.length > MAX_CHUNK_CHARS) {
      // A pathological write: keep the tail, mark the gap so clients reseed.
      body = body.slice(-MAX_CHUNK_CHARS)
      session.truncated = true
    }
    const chunk = { seq: session.nextSeq, text: body }
    session.nextSeq += 1
    session.chunks.push(chunk)
    session.bytes += body.length
    while (session.chunks.length > settings.terminal.maxChunks || session.bytes > settings.terminal.maxBytes) {
      const removed = session.chunks.shift()
      if (removed === undefined) break
      session.bytes -= removed.text.length
      session.floorSeq = removed.seq + 1
      session.truncated = true
    }
    for (const listener of session.subscribers) {
      try {
        listener('data', chunk)
      } catch {
        // A slow or broken follower must not break the PTY reader.
      }
    }
  }

  /**
   * Mark a session exited and tell its followers.
   * @param session - internal session.
   * @param outcome - process outcome.
   * @param error - transport error, when any.
   */
  function finish(session, outcome, error) {
    if (session.status !== 'running') return
    if (error) session.error = describe(error)
    session.status = 'exited'
    session.endedAt = now()
    session.exitCode = typeof outcome?.exitCode === 'number' ? outcome.exitCode : null
    session.signal = outcome?.signal ?? null
    for (const listener of session.subscribers) {
      try {
        listener('exit', meta(session))
      } catch {
        // Same rationale as output.
      }
    }
  }

  /**
   * Resolve a session or throw a routable error.
   * @param id - session id.
   * @returns the session.
   */
  function requireSession(id) {
    const session = sessions.get(id)
    if (session === undefined) throw new TermError(404, `terminal "${id}" is not known`)
    return session
  }

  /**
   * Write text to a terminal's input.
   * @param id - session id.
   * @param data - text to deliver unchanged.
   * @returns the session's metadata.
   */
  function input(id, data) {
    const session = requireSession(id)
    if (session.status !== 'running') throw new TermError(409, 'the terminal has already exited')
    if (typeof data !== 'string') throw new TermError(400, 'data must be a string')
    if (data.length > MAX_INPUT_CHARS) throw new TermError(413, 'input is too large')
    if (data === '') return meta(session)
    session.handle.write(data).catch(() => {
      // The process may exit between the check and the write; the exit frame
      // already tells the panel what happened.
    })
    return meta(session)
  }

  /**
   * Resize a terminal.
   * @param id - session id.
   * @param cols - columns.
   * @param rows - rows.
   * @returns the session's metadata.
   */
  async function resize(id, cols, rows) {
    const session = requireSession(id)
    const nextCols = clampInt(cols, session.cols, 20, 500)
    const nextRows = clampInt(rows, session.rows, 5, 200)
    if (session.status === 'running') await session.handle.resize(nextCols, nextRows)
    session.cols = nextCols
    session.rows = nextRows
    return meta(session)
  }

  /**
   * Terminate a session and drop it from the list.
   * @param id - session id.
   * @returns true when the session existed.
   */
  async function close(id) {
    const session = sessions.get(id)
    if (session === undefined) return false
    sessions.delete(id)
    if (session.status === 'running') {
      try {
        await session.handle.terminate()
      } catch {
        // Cleanup failure leaves the process to the provider's disposal path.
      }
    }
    finish(session, { exitCode: session.exitCode, signal: session.signal }, null)
    session.subscribers.clear()
    return true
  }

  /** @returns session metadata list, oldest first. */
  function list() {
    return [...sessions.values()].sort((left, right) => left.createdAt - right.createdAt).map(meta)
  }

  /**
   * Replay a session's buffer and follow it.
   * @param id - session id.
   * @param since - first sequence number the caller already has.
   * @param listener - `(event, payload)` callback.
   * @returns `{ terminal, reset, chunks, nextSeq, unsubscribe }`, or null when unknown.
   */
  function subscribe(id, since, listener) {
    const session = sessions.get(id)
    if (session === undefined) return null
    const from = Number.isFinite(since) ? Math.max(0, Math.trunc(since)) : 0
    const reset = from < session.floorSeq
    const chunks = session.chunks.filter(chunk => chunk.seq >= (reset ? 0 : from))
    session.subscribers.add(listener)
    return {
      terminal: meta(session),
      reset,
      chunks,
      nextSeq: session.nextSeq,
      floorSeq: session.floorSeq,
      unsubscribe: () => session.subscribers.delete(listener),
    }
  }

  /**
   * Close every session; the provider also kills PTYs on its own disposal.
   * @returns a promise settled after every termination attempt.
   */
  async function dispose() {
    if (disposed) return
    disposed = true
    const all = [...sessions.values()]
    sessions.clear()
    for (const session of all) {
      if (session.status === 'running') {
        try {
          await session.handle.terminate()
        } catch {
          // Best effort: the provider's disposal owns the hard stop.
        }
      }
      session.subscribers.clear()
    }
  }

  return { attach, available, create, input, resize, close, list, subscribe, dispose }
}

/** A route-friendly terminal failure. */
export class TermError extends Error {
  /**
   * @param status - HTTP status the route should answer with.
   * @param message - human message.
   */
  constructor(status, message) {
    super(message)
    this.name = 'TermError'
    this.status = status
  }
}

/**
 * @param value - candidate.
 * @param fallback - default.
 * @param min - lower bound.
 * @param max - upper bound.
 * @returns an integer inside the bounds.
 */
function clampInt(value, fallback, min, max) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(value)))
}

/**
 * @param error - unknown rejection.
 * @returns a readable message.
 */
function describe(error) {
  return error instanceof Error ? error.message : String(error)
}
