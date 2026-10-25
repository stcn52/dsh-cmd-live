/**
 * Command registry: one record per `ctx.shell.execute` call, its bounded output
 * tail, and subscriber fan-out for the SSE endpoint.
 *
 * Nothing is persisted. A host restart drops the history, which is the honest
 * lifetime for "what is running right now"; the panel is an activity monitor,
 * not an audit log.
 * @module dsh-cmd-live/registry
 */

import { drainLines, finishLine } from './lines.js'

/** Stream → line kind pairs, in display priority order. */
const STREAMS = [
  ['stdout', 'out'],
  ['stderr', 'err'],
]

/** How many characters of a command string the record keeps as its label. */
const MAX_COMMAND_CHARS = 4000

/**
 * Create the command registry.
 * @param settings - resolved plugin config.
 * @param deps - test seams: `now`.
 * @returns registry API used by the monitor, the routes and the tests.
 */
export function createRegistry(settings, deps = {}) {
  const now = deps.now ?? (() => Date.now())
  /** @type {Map<string, object>} */
  const records = new Map()
  /** insertion order of ids, oldest first */
  const order = []
  /** @type {Set<(event: string, payload: unknown) => void>} */
  const subscribers = new Set()
  let timer = null
  let disposed = false
  let idCounter = 0

  /**
   * Register one observer of registry events (`start`, `output`, `end`).
   * @param listener - callback; a throwing listener is ignored.
   * @returns unsubscribe function.
   */
  function subscribe(listener) {
    subscribers.add(listener)
    return () => subscribers.delete(listener)
  }

  /**
   * Fan one event out to every observer.
   * @param event - event name.
   * @param payload - JSON-serializable payload.
   */
  function broadcast(event, payload) {
    for (const listener of [...subscribers]) {
      try {
        listener(event, payload)
      } catch {
        // An observer (the SSE route) must never break the monitor.
      }
    }
  }

  /**
   * Project a record to its wire shape (metadata only, no output lines).
   * @param record - internal record.
   * @returns plain object safe for JSON.
   */
  function meta(record) {
    return {
      id: record.id,
      command: record.command,
      workdir: record.workdir,
      timeoutMs: record.timeoutMs,
      status: record.status,
      startedAt: record.startedAt,
      endedAt: record.endedAt,
      durationMs: record.endedAt === null ? null : record.endedAt - record.startedAt,
      exitCode: record.exitCode,
      signal: record.signal,
      timedOut: record.timedOut,
      aborted: record.aborted,
      killed: record.killedByUser,
      error: record.error,
      lineCount: record.totalLines,
      truncated: record.truncated,
      floorSeq: record.floorSeq,
      nextSeq: record.nextSeq,
    }
  }

  /**
   * Start tracking a command that is about to execute.
   * @param input - command facts from the resolved shell spec.
   * @returns the new record.
   */
  function create(input = {}) {
    const command = typeof input.command === 'string' ? input.command.slice(0, MAX_COMMAND_CHARS) : ''
    const record = {
      id: `cmd_${(++idCounter).toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      command,
      workdir: typeof input.workdir === 'string' ? input.workdir : '',
      timeoutMs: typeof input.timeoutMs === 'number' ? input.timeoutMs : null,
      startedAt: now(),
      endedAt: null,
      status: 'running',
      exitCode: null,
      signal: null,
      timedOut: false,
      aborted: false,
      error: null,
      /** @type {{seq: number, kind: 'out' | 'err', text: string}[]} */
      lines: [],
      floorSeq: 0,
      nextSeq: 0,
      totalLines: 0,
      bytes: 0,
      truncated: false,
      resetPending: false,
      killedByUser: false,
      offsets: { stdout: 0, stderr: 0 },
      carry: { out: '', err: '' },
      execution: null,
    }
    records.set(record.id, record)
    order.push(record.id)
    prune()
    broadcast('start', meta(record))
    return record
  }

  /**
   * Keep the retained window bounded without evicting live commands.
   *
   * A finished record is the cheapest to lose; only when every retained record
   * is still running does the list exceed the cap (a burst of parallel shell
   * calls is more interesting than the cap).
   */
  function prune() {
    while (order.length > settings.maxCommands) {
      let victim = -1
      for (let index = 0; index < order.length; index += 1) {
        const candidate = records.get(order[index])
        if (candidate && candidate.status !== 'running') {
          victim = index
          break
        }
      }
      if (victim === -1) return
      const [id] = order.splice(victim, 1)
      records.delete(id)
    }
  }

  /**
   * Append one display line to a record, trimming older output.
   * @param record - internal record.
   * @param kind - `out` or `err`.
   * @param text - the complete line.
   * @returns the stored entry.
   */
  function pushLine(record, kind, text) {
    const entry = { seq: record.nextSeq, kind, text }
    record.nextSeq += 1
    record.totalLines += 1
    record.lines.push(entry)
    record.bytes += text.length + 1
    trim(record)
    return entry
  }

  /**
   * Drop the oldest lines until both ceilings hold.
   * @param record - internal record.
   */
  function trim(record) {
    let dropped = false
    while (record.lines.length > settings.maxLines || record.bytes > settings.maxBytes) {
      const removed = record.lines.shift()
      if (removed === undefined) break
      record.bytes -= removed.text.length + 1
      record.floorSeq = removed.seq + 1
      record.truncated = true
      dropped = true
    }
    // Clients holding the previous tail must replace it, not append to it.
    if (dropped) record.resetPending = true
  }

  /**
   * Split a chunk and append its complete lines.
   * @param record - internal record.
   * @param kind - `out` or `err`.
   * @param text - raw chunk.
   * @returns the appended entries.
   */
  function appendChunk(record, kind, text) {
    if (typeof text !== 'string' || text === '') return []
    const { lines, carry } = drainLines(text, record.carry[kind])
    record.carry[kind] = carry
    return lines.map(line => pushLine(record, kind, line))
  }

  /**
   * Read one captured stream from its saved offset.
   * @param record - internal record.
   * @param stream - `stdout` or `stderr`.
   * @returns `{ text, lossy }`, or null when the handle exposes no reader.
   */
  function readStream(record, stream) {
    const reader = record.execution?.observed?.[stream]
    if (!reader || typeof reader.readFrom !== 'function') return null
    let read
    try {
      read = reader.readFrom(record.offsets[stream] ?? 0)
    } catch {
      return null
    }
    if (typeof read?.nextOffset === 'number') record.offsets[stream] = read.nextOffset
    return {
      text: typeof read?.text === 'string' ? read.text : '',
      lossy: read?.lossy === true,
    }
  }

  /**
   * Clear retained output after a lossy read, so the tail shown is the server's
   * real tail rather than a duplicate of already-delivered lines.
   * @param record - internal record.
   */
  function resetLines(record) {
    record.lines = []
    record.bytes = 0
    record.floorSeq = record.nextSeq
  }

  /**
   * Pull every byte produced since the last poll and publish it.
   * @param record - internal record.
   * @returns true when clients were told to replace their buffer.
   */
  function drainRecord(record) {
    if (record.execution === null || record.status !== 'running') return false
    let reset = false
    const appended = []
    for (const [stream, kind] of STREAMS) {
      const read = readStream(record, stream)
      if (read === null) continue
      if (read.lossy) {
        // The requested offset slid out of the in-memory window; the reader
        // returns the whole retained tail, so replace instead of append.
        resetLines(record)
        reset = true
      }
      appended.push(...appendChunk(record, kind, read.text))
    }
    if (record.resetPending) reset = true
    if (reset) {
      record.resetPending = false
      broadcast('output', {
        id: record.id,
        reset: true,
        floorSeq: record.floorSeq,
        nextSeq: record.nextSeq,
        lines: record.lines.slice(),
      })
    } else if (appended.length > 0) {
      broadcast('output', { id: record.id, lines: appended })
    }
    return reset
  }

  /**
   * Publish anything still sitting in a partial line.
   * @param record - internal record.
   * @returns the appended entries.
   */
  function flushCarry(record) {
    const appended = []
    for (const [, kind] of STREAMS) {
      const carry = record.carry[kind]
      if (carry === '') continue
      record.carry[kind] = ''
      appended.push(pushLine(record, kind, finishLine(carry)))
    }
    return appended
  }

  /**
   * Poll every running record once.
   */
  function poll() {
    if (disposed) return
    let running = false
    for (const record of records.values()) {
      if (record.status !== 'running') continue
      running = true
      try {
        drainRecord(record)
      } catch {
        // A broken reader must not stop the other commands from updating.
      }
    }
    if (!running) stopTimer()
  }

  /** Arm the shared poll timer when it is not running. */
  function ensureTimer() {
    if (timer !== null || disposed) return
    timer = setInterval(poll, settings.pollIntervalMs)
    timer.unref?.()
  }

  /** Disarm the poll timer. */
  function stopTimer() {
    if (timer === null) return
    clearInterval(timer)
    timer = null
  }

  /**
   * Attach a spawned execution handle and watch it to completion.
   * @param record - the record created for this execution.
   * @param execution - the handle `ctx.shell.execute` resolved.
   */
  function observe(record, execution) {
    record.execution = execution
    if (!execution || typeof execution.done?.then !== 'function') {
      finish(record, { error: 'the shell execution handle has no done promise' })
      return
    }
    // result() carries the first-cause classification (timeout vs cancel); it
    // resolves at process close, exactly when done settles.
    const outcome = typeof execution.result === 'function'
      ? execution.result().then(value => ({
        exitCode: value?.exitCode ?? null,
        signal: value?.signal ?? null,
        timedOut: value?.timedOut === true,
        aborted: value?.aborted === true,
      })).catch(error => ({ error: describe(error) }))
      : Promise.resolve({})
    execution.done.then(
      () => outcome,
      () => outcome,
    ).then(
      settled => finish(record, settled ?? {}),
      error => finish(record, { error: describe(error) }),
    )
    ensureTimer()
  }

  /**
   * Mark a record failed when `ctx.shell.execute` itself rejected.
   * @param record - the record created for the rejected call.
   * @param error - the rejection cause.
   */
  function fail(record, error) {
    if (record.status !== 'running') return
    record.endedAt = now()
    record.error = describe(error)
    record.status = 'failed'
    broadcast('end', meta(record))
  }

  /**
   * Ask the shell executor to stop a running command.
   *
   * The handle's `kill()` is the seam's only termination verb. A handle that
   * already settled reports false and the record stays as it is; the panel shows
   * the eventual settle normally.
   * @param id - command id.
   * @returns `{ killed, command }`; `command` is null for an unknown id.
   */
  function kill(id) {
    const record = records.get(id)
    if (record === undefined) return { killed: false, command: null }
    if (record.status !== 'running') return { killed: false, command: meta(record) }
    record.killedByUser = true
    let killed = false
    try {
      killed = record.execution?.kill?.() === true
    } catch {
      killed = false
    }
    if (!killed) {
      record.killedByUser = false
      return { killed: false, command: meta(record) }
    }
    return { killed: true, command: meta(record) }
  }

  /**
   * Settle a record: final drain, classify, publish.
   * @param record - internal record.
   * @param outcome - result facts (or `{ error }`).
   */
  function finish(record, outcome) {
    if (record.status !== 'running') return
    record.endedAt = now()
    if (outcome.error) record.error = outcome.error
    record.timedOut = outcome.timedOut === true
    record.aborted = outcome.aborted === true
    record.exitCode = typeof outcome.exitCode === 'number' ? outcome.exitCode : null
    record.signal = outcome.signal ?? null
    try {
      drainRecord(record)
    } catch {
      // Final reads are best-effort; the classification below still settles.
    }
    const extra = flushCarry(record)
    if (record.resetPending) {
      record.resetPending = false
      broadcast('output', {
        id: record.id,
        reset: true,
        floorSeq: record.floorSeq,
        nextSeq: record.nextSeq,
        lines: record.lines.slice(),
      })
    } else if (extra.length > 0) {
      broadcast('output', { id: record.id, lines: extra })
    }
    record.status = record.killedByUser
      ? 'canceled'
      : record.timedOut
        ? 'timeout'
        : record.aborted
          ? 'canceled'
          : record.error !== null || record.exitCode !== 0
            ? 'failed'
            : 'done'
    broadcast('end', meta(record))
  }

  /**
   * Retained records, running first and newest first.
   * @returns metadata list.
   */
  function list() {
    const all = [...records.values()]
    all.sort((left, right) => {
      const leftRunning = left.status === 'running' ? 0 : 1
      const rightRunning = right.status === 'running' ? 0 : 1
      if (leftRunning !== rightRunning) return leftRunning - rightRunning
      if (leftRunning === 0) return right.startedAt - left.startedAt
      return (right.endedAt ?? right.startedAt) - (left.endedAt ?? left.startedAt)
    })
    return all.map(meta)
  }

  /**
   * One record's metadata.
   * @param id - command id.
   * @returns metadata, or null when unknown.
   */
  function get(id) {
    const record = records.get(id)
    return record === undefined ? null : meta(record)
  }

  /**
   * Retained output lines from a sequence number onward.
   * @param id - command id.
   * @param since - first sequence number to include.
   * @returns `{ id, status, floorSeq, nextSeq, truncated, lines }`, or null when unknown.
   */
  function outputSince(id, since = 0) {
    const record = records.get(id)
    if (record === undefined) return null
    const from = Number.isFinite(since) ? Math.max(0, Math.trunc(since)) : 0
    return {
      id: record.id,
      status: record.status,
      floorSeq: record.floorSeq,
      nextSeq: record.nextSeq,
      truncated: record.truncated,
      lines: record.lines.filter(line => line.seq >= from),
    }
  }

  /**
   * Retained output as plain text (stderr marked per line).
   * @param id - command id.
   * @returns text, or null when unknown.
   */
  function text(id) {
    const record = records.get(id)
    if (record === undefined) return null
    if (record.lines.length === 0) return ''
    return record.lines
      .map(line => (line.kind === 'err' ? `[stderr] ${line.text}` : line.text))
      .join('\n') + '\n'
  }

  /** Drop every record, observer and timer. */
  function dispose() {
    disposed = true
    stopTimer()
    subscribers.clear()
    records.clear()
    order.length = 0
  }

  return {
    subscribe,
    create,
    observe,
    fail,
    kill,
    poll,
    list,
    get,
    outputSince,
    text,
    dispose,
    /** @internal test seam */
    finish,
  }
}

/**
 * @param error - unknown rejection.
 * @returns a readable one-line message.
 */
function describe(error) {
  if (error instanceof Error) return error.message
  return String(error)
}
