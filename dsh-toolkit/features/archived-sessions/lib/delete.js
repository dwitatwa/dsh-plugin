import { removeSessionFiles } from './disk.js'
import { expandDescendants } from './sessions.js'

const MAX_WAIT_MS = 10_000
const POLL_MS = 250
const VALID_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const isValidId = (id) => typeof id === 'string' && VALID_ID.test(id)

/**
 * Wait until a session reports neither a live agent nor activity, or the wait budget runs out.
 * @param {string} id - the session id.
 * @param {(id: string) => Promise<boolean>} busy - the probe.
 * @param {number} waitMs - the budget.
 * @param {number} pollMs - the poll interval.
 * @returns {Promise<boolean>} true when the work drained.
 */
async function waitForIdle(id, busy, waitMs, pollMs) {
  const deadline = Date.now() + waitMs
  while (await busy(id)) {
    if (Date.now() >= deadline) return false
    await sleep(pollMs)
  }
  return true
}

/**
 * Order ids deepest first, so no child is orphaned by its parent's removal.
 * @param {string[]} ids - the ids to order.
 * @param {Map<string, string>} parentOf - child id to parent id.
 * @returns {string[]} the ordered ids.
 */
function deepestFirst(ids, parentOf) {
  const depth = (id) => {
    let level = 0
    let cursor = parentOf.get(id)
    while (cursor !== undefined && level < 64) {
      level += 1
      cursor = parentOf.get(cursor)
    }
    return level
  }
  return ids
    .map((id, index) => ({ id, index, depth: depth(id) }))
    .sort((left, right) => right.depth - left.depth || left.index - right.index)
    .map((entry) => entry.id)
}

/**
 * Permanently delete sessions and their descendants: stop work, remove the data, then clear archival.
 * @param {object} options - the delete options and its host dependencies.
 * @returns {Promise<{ deleted: string[], skipped: Array<{ id: string, reason: string }>, freedBytes: number, childrenDeleted: number, notCleared: Array<{ id: string, reason: string }> }>} the report.
 */
export async function deleteSessions(options) {
  const {
    ids = [],
    home,
    archivedIds,
    headers,
    isLive,
    hasActivity,
    stop,
    unarchive,
    unpin,
    detach,
    waitMs = MAX_WAIT_MS,
    pollMs = POLL_MS,
  } = options

  const archived = new Set(await archivedIds())
  const picked = [...new Set(ids)]
  const pickedArchived = picked.filter((id) => isValidId(id) && archived.has(id))

  let known = []
  let cascadeUnknown = false
  try {
    known = await headers()
  } catch {
    known = []
    cascadeUnknown = true
  }

  const parentOf = new Map()
  for (const header of known ?? []) {
    if (typeof header?.id === 'string' && typeof header?.parentSession === 'string') {
      parentOf.set(header.id, header.parentSession)
    }
  }

  const expansion = expandDescendants(known ?? [], pickedArchived)
  const children = new Set(expansion.children)
  const deletable = new Set([...pickedArchived, ...expansion.children])
  const seen = new Set(picked)
  const queue = [...picked]
  for (const id of expansion.all) {
    if (seen.has(id)) continue
    seen.add(id)
    queue.push(id)
  }
  const order = deepestFirst(queue, parentOf)

  const deleted = []
  const skipped = []
  const notCleared = []
  let freedBytes = 0

  const busy = async (id) => isLive(id) || (await hasActivity(id))

  for (const id of order) {
    if (!isValidId(id)) {
      skipped.push({ id: String(id), reason: 'invalid id' })
      continue
    }
    if (!deletable.has(id)) {
      skipped.push({ id, reason: 'not archived' })
      continue
    }
    try {
      if (await busy(id)) {
        await stop(id)
        const drained = await waitForIdle(id, busy, waitMs, pollMs)
        if (!drained) {
          skipped.push({ id, reason: 'still stopping' })
          continue
        }
      }
      const removal = await removeSessionFiles(home, id)
      freedBytes += removal.bytes
      deleted.push(id)
      try {
        await unarchive(id)
        await unpin(id)
        if (typeof detach === 'function') await detach(id)
      } catch (error) {
        notCleared.push({ id, reason: error instanceof Error ? error.message : String(error) })
      }
    } catch (error) {
      skipped.push({ id, reason: error instanceof Error ? error.message : String(error) })
    }
  }

  return {
    deleted,
    skipped,
    freedBytes,
    childrenDeleted: deleted.filter((id) => children.has(id)).length,
    notCleared,
    cascadeUnknown,
  }
}
