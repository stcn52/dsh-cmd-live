/**
 * dsh-cmd-live — live command monitor for the DeepSeek Harness sidebar.
 *
 * One registry feeds two surfaces: the HTTP/SSE routes the panel talks to, and
 * the shell-executor wrapper that fills it. The plugin imports nothing from
 * `@deepseek-ai/*`: it consumes the `shell` and `webServer` services through
 * cordis injection plus Node built-ins, so it loads from a profile without peer
 * resolution.
 * @module dsh-cmd-live
 */

import { resolveConfig } from './core/config.js'
import { createRegistry } from './core/registry.js'
import { createTermManager } from './core/terms.js'
import { attachShellMonitor } from './host/monitor.js'
import { registerRoutes } from './host/routes.js'

/** Cordis plugin name; also the settings namespace of the plugin row. */
export const name = 'cmd-live'

/**
 * Build the registry and mount both halves.
 *
 * Neither `shell` nor `webServer` is a hard dependency: a headless profile
 * simply never gets the panel, and a composition without the bash seam keeps
 * empty routes instead of failing to load.
 * @param ctx - Cordis context.
 * @param config - the plugin row's config; validated here so a deployment typo
 * fails at load instead of producing a silently wrong panel.
 */
export function apply(ctx, config) {
  // A bad config must not take the host down: fall back to the defaults and
  // record the problem where a human will see it.
  let settings
  try {
    settings = resolveConfig(config)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (typeof ctx.logger?.warn === 'function') ctx.logger.warn(`dsh-cmd-live: ${message}; using defaults`)
    settings = resolveConfig({})
  }

  const registry = createRegistry(settings)
  const terms = createTermManager(settings, {
    // Open the shell where the agent's last command ran; fall back to $HOME.
    cwd: () => registry.lastWorkdir() ?? process.env.HOME ?? process.cwd(),
  })
  ctx.effect(() => () => registry.dispose())
  ctx.effect(() => () => terms.dispose())

  if (typeof ctx.inject === 'function') {
    // The PTY provider is the same seam the built-in terminal uses; without it
    // (headless or a composition without terminals) the command list still works.
    ctx.inject(['subprocess'], subCtx => {
      try {
        terms.attach(subCtx.subprocess)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (typeof ctx.logger?.warn === 'function') ctx.logger.warn(`dsh-cmd-live: cannot attach the PTY provider: ${message}`)
      }
    })

    ctx.inject(['shell'], shellCtx => {
      try {
        const detach = attachShellMonitor(shellCtx, registry)
        if (typeof detach === 'function') {
          shellCtx.effect(() => detach)
        } else if (typeof ctx.logger?.warn === 'function') {
          ctx.logger.warn('dsh-cmd-live: ctx.shell has no observable execute (or is already wrapped); the panel stays empty')
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (typeof ctx.logger?.warn === 'function') ctx.logger.warn(`dsh-cmd-live: cannot observe ctx.shell: ${message}`)
      }
    })
  }

  registerRoutes(ctx, registry, terms)
}
