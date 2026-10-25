/**
 * Plugin configuration: the few knobs that bound what the panel keeps.
 *
 * The monitor never runs a command of its own — it observes `ctx.shell`, the
 * seam every model-facing bash call already goes through — so there is no
 * command, cwd or environment to validate here. The only deployment decisions
 * are retention and polling cadence.
 * @module dsh-cmd-live/config
 */

/** Defaults; the bundle patch mirrors these so a deployment edit is obvious. */
export const DEFAULTS = {
  maxCommands: 60,
  maxLines: 400,
  maxBytes: 262144,
  pollIntervalMs: 350,
  // The interactive terminal tab: a real PTY owned by this host process.
  terminal: {
    shell: null,
    cwd: null,
    cols: 100,
    rows: 28,
    maxChunks: 4000,
    maxBytes: 1048576,
  },
}

/**
 * Resolve the plugin row config into a frozen settings object.
 * @param raw - the plugin row config (may be undefined).
 * @returns normalized settings.
 */
export function resolveConfig(raw) {
  const config = raw ?? {}
  const settings = {
    // Enough history to answer "what did DSH just do?", small enough that the
    // whole panel snapshot stays a few hundred kilobytes at worst.
    maxCommands: positiveInt(config.maxCommands, DEFAULTS.maxCommands, 1, 500),
    maxLines: positiveInt(config.maxLines, DEFAULTS.maxLines, 20, 5000),
    maxBytes: positiveInt(config.maxBytes, DEFAULTS.maxBytes, 4096, 8 * 1024 * 1024),
    pollIntervalMs: positiveInt(config.pollIntervalMs, DEFAULTS.pollIntervalMs, 100, 5000),
    terminal: {
      // A path in this host's execution world; null means `$SHELL`, then /bin/bash.
      shell: typeof config.terminal?.shell === 'string' && config.terminal.shell.trim() !== ''
        ? config.terminal.shell.trim()
        : null,
      // null means the host process working directory.
      cwd: typeof config.terminal?.cwd === 'string' && config.terminal.cwd.trim() !== ''
        ? config.terminal.cwd.trim()
        : null,
      cols: positiveInt(config.terminal?.cols, DEFAULTS.terminal.cols, 20, 500),
      rows: positiveInt(config.terminal?.rows, DEFAULTS.terminal.rows, 5, 200),
      maxChunks: positiveInt(config.terminal?.maxChunks, DEFAULTS.terminal.maxChunks, 4, 20000),
      maxBytes: positiveInt(config.terminal?.maxBytes, DEFAULTS.terminal.maxBytes, 65536, 16 * 1024 * 1024),
    },
  }
  if (settings.terminal.shell !== null && !settings.terminal.shell.startsWith('/')) {
    throw new Error(`dsh-cmd-live: config.terminal.shell "${settings.terminal.shell}" must be an absolute path`)
  }
  if (settings.terminal.cwd !== null && !settings.terminal.cwd.startsWith('/')) {
    throw new Error(`dsh-cmd-live: config.terminal.cwd "${settings.terminal.cwd}" must be an absolute path`)
  }
  return Object.freeze(settings)
}

/**
 * @param value - candidate.
 * @param fallback - default.
 * @param min - lower bound.
 * @param max - upper bound.
 * @returns an integer inside the bounds.
 */
function positiveInt(value, fallback, min, max) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  const rounded = Math.trunc(value)
  if (rounded < min) return min
  if (rounded > max) return max
  return rounded
}
