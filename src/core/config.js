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
