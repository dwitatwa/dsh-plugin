import { resolveHome } from './lib/disk.js'
import { makeHandlers } from './lib/routes.js'

/** The two routes this feature owns. */
export const ROUTES = {
  list: '/plugins/toolkit/archived-sessions/list',
  delete: '/plugins/toolkit/archived-sessions/delete',
}

export const inject = ['webServer', 'workspaceRegistry', 'sessionPersistence', 'agents']

/**
 * Register the archived-sessions routes on the local web server.
 * @param {object} ctx - the plugin context.
 */
export function apply(ctx) {
  const home = resolveHome(process.env)
  const handlers = makeHandlers({
    home,
    origin: () => ctx.webServer.getOrigin(),
    registry: ctx.workspaceRegistry,
    persistence: ctx.sessionPersistence,
    agents: { get: (id) => ctx.get('agents')?.get(id) },
    activity: (sessionId) =>
      ctx.waterfall('workspace/session-activity', { sessionId }, () => Promise.resolve([])),
    stop: async (sessionId) => {
      try {
        await ctx.parallel('workspace/session-stop', { sessionId })
      } catch (error) {
        ctx.logger?.warn?.(error)
      }
    },
    log: ctx.logger,
  })

  ctx.effect(() => ctx.webServer.register({ kind: 'exact', path: ROUTES.list, handler: handlers.list }))
  ctx.effect(() => ctx.webServer.register({ kind: 'exact', path: ROUTES.delete, handler: handlers.del }))
}
