import { homedir } from 'node:os'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import { readdir, rm, stat } from 'node:fs/promises'

/** A session id this plugin will act on: no separators, no leading dot, bounded length. */
const SESSION_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/

/**
 * Resolve the DeepSeek Harness home the same way `@deepseek-ai/dsh-home-paths` does.
 * @param {NodeJS.ProcessEnv} env - process environment.
 * @returns {string} the absolute harness home.
 */
export function resolveHome(env = process.env) {
  const override = env?.DSH_HOME
  if (typeof override === 'string' && override.trim() !== '') return override
  return join(homedir(), '.dsh')
}

/** Canonical comparison form: absolute, and lowercased on Windows. */
function canonical(path) {
  const absolute = resolve(path)
  return process.platform === 'win32' ? absolute.toLowerCase() : absolute
}

/**
 * Whether `candidate` lies strictly inside `root`.
 * @param {string} root - the allowed root.
 * @param {string} candidate - the path to test.
 * @returns {boolean} true only for a descendant of root.
 */
export function isInside(root, candidate) {
  const rel = relative(canonical(root), canonical(candidate))
  if (rel === '' || isAbsolute(rel)) return false
  return rel !== '..' && !rel.startsWith(`..${sep}`) && !rel.startsWith('../')
}

/**
 * The projection-cache file of one session.
 * @param {string} home - the harness home.
 * @param {string} sessionId - the session id.
 * @returns {string} the cache file path.
 */
export function projcacheFile(home, sessionId) {
  return join(home, 'storages', 'session_projcache', 'sessions', `${sessionId}.json`)
}

/**
 * Every stored log folder of one session id, under any workspace slug.
 * @param {string} home - the harness home.
 * @param {string} sessionId - the session id.
 * @returns {Promise<string[]>} the existing folders.
 */
export async function findSessionLogDirs(home, sessionId) {
  if (typeof sessionId !== 'string' || !SESSION_ID.test(sessionId)) return []
  const root = join(home, 'sessions')
  let slugs
  try {
    slugs = await readdir(root)
  } catch {
    return []
  }
  const found = []
  for (const slug of slugs) {
    const candidate = join(root, slug, sessionId)
    if (!isInside(root, candidate)) continue
    try {
      if ((await stat(candidate)).isDirectory()) found.push(candidate)
    } catch {
      // Not this slug.
    }
  }
  return found
}

/**
 * Total size of the regular files under one directory, recursively.
 * @param {string} dir - the directory.
 * @returns {Promise<number>} the byte count.
 */
export async function dirBytes(dir) {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return 0
  }
  let total = 0
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) total += await dirBytes(path)
    else if (entry.isFile()) {
      try {
        total += (await stat(path)).size
      } catch {
        // Vanished between listing and stat.
      }
    }
  }
  return total
}

/**
 * Remove one session's log folders and its projection cache.
 * @param {string} home - the harness home.
 * @param {string} sessionId - the session id.
 * @returns {Promise<{ removed: string[], bytes: number }>} removed paths and freed bytes.
 * @throws when the id is malformed or a path would leave the data roots.
 */
export async function removeSessionFiles(home, sessionId) {
  if (typeof sessionId !== 'string' || !SESSION_ID.test(sessionId)) {
    throw new Error(`archived-sessions: refusing invalid session id ${JSON.stringify(sessionId)}`)
  }
  const sessionsRoot = join(home, 'sessions')
  const cacheRoot = join(home, 'storages', 'session_projcache', 'sessions')
  const cache = projcacheFile(home, sessionId)
  if (!isInside(cacheRoot, cache)) {
    throw new Error(`archived-sessions: cache path escapes the data root for ${sessionId}`)
  }
  const dirs = await findSessionLogDirs(home, sessionId)
  for (const dir of dirs) {
    if (!isInside(sessionsRoot, dir)) {
      throw new Error(`archived-sessions: log path escapes the data root for ${sessionId}`)
    }
  }
  let bytes = 0
  for (const dir of dirs) bytes += await dirBytes(dir)
  const removed = []
  for (const dir of dirs) {
    await rm(dir, { recursive: true, force: true })
    removed.push(dir)
  }
  const hasCache = await stat(cache).then((s) => s.isFile()).catch(() => false)
  if (hasCache) {
    await rm(cache, { force: true })
    removed.push(cache)
  }
  return { removed, bytes }
}
