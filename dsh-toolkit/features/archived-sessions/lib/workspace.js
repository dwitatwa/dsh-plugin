import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { projcacheFile } from './disk.js'

const EMPTY = (ok) => ({ archived: [], pinned: [], workspaceOf: new Map(), workspaceIdOf: new Map(), ok })

async function readJson(path) {
  try {
    return { value: JSON.parse(await readFile(path, 'utf8')), ok: true }
  } catch (error) {
    const missing = error?.code === 'ENOENT'
    return { value: undefined, ok: missing }
  }
}

/**
 * Read the durable workspace store: the archived set, the pinned set, and the workspace of each session.
 * @param {string} home - the harness home.
 * @returns {Promise<{ archived: string[], pinned: string[], workspaceOf: Map<string, string>, ok: boolean }>} the store; `ok` is false when an existing store cannot be read.
 */
export async function readWorkspaceStore(home) {
  const { value, ok } = await readJson(join(home, 'storages', 'workspace.json'))
  if (!ok) return EMPTY(false)
  if (value === null || typeof value !== 'object') return EMPTY(true)
  const globals = value.global ?? {}
  const archived = Array.isArray(globals.archivedSessionIds)
    ? globals.archivedSessionIds.filter((id) => typeof id === 'string')
    : []
  const pinned = Array.isArray(globals.pinnedSessionIds)
    ? globals.pinnedSessionIds.filter((id) => typeof id === 'string')
    : []
  const workspaceOf = new Map()
  const workspaceIdOf = new Map()
  const tables = value.tables?.workspaces
  if (tables !== null && typeof tables === 'object') {
    for (const [workspaceId, workspace] of Object.entries(tables)) {
      if (workspace === null || typeof workspace !== 'object') continue
      const title = typeof workspace.title === 'string' ? workspace.title : undefined
      if (title === undefined || !Array.isArray(workspace.sessionIds)) continue
      for (const id of workspace.sessionIds) {
        if (typeof id !== 'string') continue
        if (!workspaceOf.has(id)) workspaceOf.set(id, title)
        if (!workspaceIdOf.has(id)) workspaceIdOf.set(id, workspaceId)
      }
    }
  }
  return { archived, pinned, workspaceOf, workspaceIdOf, ok: true }
}

/**
 * Read one session's stored title from its projection cache.
 * @param {string} home - the harness home.
 * @param {string} sessionId - the session id.
 * @returns {Promise<string | undefined>} the title when stored.
 */
export async function readTitle(home, sessionId) {
  const { value } = await readJson(projcacheFile(home, sessionId))
  const title = value?.record?.rows?.title?.val
  return typeof title === 'string' && title.trim() !== '' ? title : undefined
}
