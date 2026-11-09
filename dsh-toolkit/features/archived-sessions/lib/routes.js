import { deleteSessions } from './delete.js'
import { dirBytes, findSessionLogDirs } from './disk.js'
import { HttpError, hostAllowed, originAllowed, readJsonBody, sendJson } from '../../../lib/http.js'
import { readTitle, readWorkspaceStore } from './workspace.js'

/** The delete body cap. */
const BODY_LIMIT = 64 * 1024
/** The header a cross-site form cannot set. */
const MARKER = 'x-archived-sessions'

function headerOf(snapshot) {
  return snapshot?.header ?? snapshot
}

async function sumLogBytes(home, sessionId) {
  let total = 0
  for (const dir of await findSessionLogDirs(home, sessionId)) total += await dirBytes(dir)
  return total
}

function fail(res, error, log) {
  const known = error instanceof HttpError
  const status = known ? error.status : 500
  const message = known ? error.message : 'internal error'
  if (!known) log?.warn?.(error)
  sendJson(res, status, { error: message })
}

/**
 * Build the two route handlers.
 * @param {object} deps - the host dependencies.
 * @returns {{ list: Function, del: Function }} the handlers.
 */
export function makeHandlers(deps) {
  const { home, origin, registry, persistence, agents, activity, stop, log } = deps

  const ownOrigin = () => (typeof origin === 'function' ? origin() : origin)

  const requireOwnPage = (req) => {
    if (!originAllowed(req, ownOrigin()) || !hostAllowed(req, ownOrigin())) {
      throw new HttpError(403, 'origin refused')
    }
  }

  const readStore = async () => {
    const store = await readWorkspaceStore(home)
    if (!store.ok) throw new HttpError(500, 'cannot read the workspace store')
    return store
  }

  const archivedIds = async () => (await readStore()).archived
  const isLive = (id) => agents?.get?.(id)?.status === 'running'
  const hasActivity = async (id) => {
    const found = await activity(id)
    return Array.isArray(found) ? found.length > 0 : Boolean(found)
  }

  return {
    async list(req, res) {
      try {
        requireOwnPage(req)
        if ((req.method ?? 'GET').toUpperCase() !== 'GET') throw new HttpError(405, 'method not allowed')
        const store = await readStore()
        const archived = store.archived
        let degraded = false
        let snapshots = []
        try {
          snapshots = await persistence.list()
        } catch (error) {
          degraded = true
          log?.warn?.(error)
        }
        const byId = new Map()
        for (const snapshot of snapshots) {
          const header = headerOf(snapshot)
          if (typeof header?.id === 'string') byId.set(header.id, snapshot)
        }
        const parentOf = new Map()
        for (const snapshot of snapshots) {
          const header = headerOf(snapshot)
          if (typeof header?.id === 'string' && typeof header.parentSession === 'string') {
            parentOf.set(header.id, header.parentSession)
          }
        }
        const countChildren = (id) => {
          let total = 0
          for (const [child, parent] of parentOf) {
            let cursor = parent
            for (let hop = 0; hop < 64 && cursor !== undefined; hop += 1) {
              if (cursor === id) {
                total += 1
                break
              }
              cursor = parentOf.get(cursor)
            }
          }
          return total
        }
        const sessions = []
        for (const id of archived) {
          const snapshot = byId.get(id)
          const header = headerOf(snapshot)
          sessions.push({
            id,
            title: (await readTitle(home, id)) ?? null,
            workspace: store.workspaceOf.get(id) ?? null,
            createdAt: typeof header?.createdAt === 'number' ? new Date(header.createdAt).toISOString() : null,
            bytes: typeof snapshot?.sizeBytes === 'number' ? snapshot.sizeBytes : await sumLogBytes(home, id),
            live: isLive(id) || (await hasActivity(id)),
            children: countChildren(id),
          })
        }
        sendJson(res, 200, { sessions, degraded })
      } catch (error) {
        fail(res, error, log)
      }
    },

    async del(req, res) {
      try {
        requireOwnPage(req)
        if ((req.method ?? '').toUpperCase() !== 'POST') throw new HttpError(405, 'method not allowed')
        if (req.headers?.[MARKER] !== '1') throw new HttpError(403, 'missing request marker')
        const body = await readJsonBody(req, BODY_LIMIT)
        if (body === null || typeof body !== 'object' || !Array.isArray(body.ids)) {
          throw new HttpError(400, 'body must be { ids: string[] }')
        }
        if (body.ids.some((id) => typeof id !== 'string')) throw new HttpError(400, 'every id must be a string')
        const report = await deleteSessions({
          ids: body.ids,
          home,
          archivedIds,
          headers: async () => {
            const snapshots = await persistence.list()
            return snapshots.map((snapshot) => {
              const header = headerOf(snapshot)
              return { id: header?.id, parentSession: header?.parentSession }
            })
          },
          isLive,
          hasActivity,
          stop,
          unarchive: (id) => registry.unarchiveSession(id),
          unpin: (id) => registry.unpinSession(id),
          detach: async (id) => {
            const store = await readStore()
            const workspaceId = store.workspaceIdOf.get(id)
            if (workspaceId === undefined) return
            const workspace = registry.get(workspaceId)
            if (workspace === undefined) return
            await workspace.detachSession(id)
          },
        })
        sendJson(res, 200, report)
      } catch (error) {
        fail(res, error, log)
      }
    },
  }
}
