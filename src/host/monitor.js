/**
 * The observation point: `ctx.shell.execute`.
 *
 * Every model-facing bash call — foreground, background job, hook command —
 * resolves to this one service method, so a thin wrapper around it sees the
 * command, its workdir, the live process handle and the captured
 * stdout/stderr readers without changing the tool surface or the sandbox
 * policy. The wrapper is transparent: argument passing, `this`, the returned
 * handle and thrown errors are the original ones.
 *
 * Cordis hands services out through a traceable proxy; patching that proxy
 * would write to a shadow object instead of the service, so the wrapper goes
 * onto the raw instance (`Symbol.for('cordis.original')`) and is removed again
 * when the plugin unloads.
 * @module dsh-cmd-live/host/monitor
 */

/** Cordis' raw-instance escape hatch on a traceable service proxy. */
const ORIGINAL = Symbol.for('cordis.original')

/** Marks an instance already wrapped, so a reload cannot stack two wrappers. */
const PATCHED = Symbol.for('dsh-cmd-live.patched')

/**
 * Wrap the shell executor's `execute` and feed the registry.
 * @param shellCtx - the injected context that provides `shell`.
 * @param registry - command registry.
 * @returns a detach function, or null when the service is missing or already wrapped.
 */
export function attachShellMonitor(shellCtx, registry) {
  const shellValue = shellCtx?.shell
  if (!shellValue) return null
  const raw = shellValue[ORIGINAL] ?? shellValue
  if (typeof raw.execute !== 'function') return null
  if (raw[PATCHED] === true) return null

  const previousExecute = raw.execute
  const hadOwn = Object.prototype.hasOwnProperty.call(raw, 'execute')

  raw.execute = async function dshCmdLiveExecute(spec) {
    let record = null
    try {
      record = registry.create({
        command: typeof spec?.command === 'string' ? spec.command : '',
        workdir: typeof spec?.workdir === 'string' ? spec.workdir : '',
        timeoutMs: typeof spec?.timeoutMs === 'number' ? spec.timeoutMs : null,
      })
    } catch {
      // A bookkeeping failure must never stop the command from running.
      record = null
    }
    let execution
    try {
      execution = await previousExecute.call(raw, spec)
    } catch (error) {
      if (record !== null) {
        try {
          registry.fail(record, error)
        } catch {
          // Same rationale.
        }
      }
      throw error
    }
    if (record !== null) {
      try {
        registry.observe(record, execution)
      } catch {
        // The command already runs; losing its panel row is acceptable.
      }
    }
    return execution
  }

  raw[PATCHED] = true
  return function detach() {
    if (raw[PATCHED] !== true) return
    if (hadOwn) raw.execute = previousExecute
    else delete raw.execute
    delete raw[PATCHED]
  }
}
