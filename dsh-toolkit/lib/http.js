/** A refusal this plugin answers with an HTTP status. */
export class HttpError extends Error {
  /**
   * @param {number} status - the HTTP status to answer.
   * @param {string} message - the reason, safe to return.
   */
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

function normalizeOrigin(value) {
  return String(value ?? '')
    .trim()
    .replace(/\/+$/, '')
    .toLowerCase()
}

function parseUrl(value) {
  try {
    return new URL(value)
  } catch {
    return null
  }
}

function bareHostname(value) {
  return String(value ?? '')
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .toLowerCase()
}

function isLoopback(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
}

/**
 * Whether the request comes from this app's own page.
 * A loopback alias on the same port counts, because the server binds one address while the user may open another.
 * @param {{ headers?: Record<string, unknown> }} req - the incoming request.
 * @param {string} origin - this server's origin.
 * @returns {boolean} true when allowed.
 */
export function originAllowed(req, origin) {
  const raw = req?.headers?.origin
  if (raw === undefined || raw === '') return true
  const own = normalizeOrigin(origin)
  const value = normalizeOrigin(raw)
  if (own === '' || value === '') return false
  if (value === own) return true
  const asked = parseUrl(value)
  const mine = parseUrl(own)
  if (asked === null || mine === null) return false
  return isLoopback(bareHostname(mine.hostname)) && isLoopback(bareHostname(asked.hostname)) && asked.port === mine.port
}

/**
 * Whether the Host header names this app on loopback, which stops a DNS-rebinding page from reading the list.
 * @param {{ headers?: Record<string, unknown> }} req - the incoming request.
 * @param {string} origin - this server's origin.
 * @returns {boolean} true when allowed.
 */
export function hostAllowed(req, origin) {
  const raw = req?.headers?.host
  if (raw === undefined || raw === '') return true
  const mine = parseUrl(normalizeOrigin(origin))
  if (mine === null) return false
  const seen = parseUrl(`http://${String(raw).trim()}`)
  if (seen === null) return false
  const myHost = bareHostname(mine.hostname)
  const seenHost = bareHostname(seen.hostname)
  if (seenHost === myHost) return true
  return isLoopback(myHost) && isLoopback(seenHost)
}

/**
 * Read and parse a JSON request body with a size cap.
 * @param {AsyncIterable<Buffer|string>} req - the incoming request.
 * @param {number} limitBytes - the cap.
 * @returns {Promise<unknown>} the parsed body.
 * @throws {HttpError} 413 past the cap, 400 on a parse failure.
 */
export async function readJsonBody(req, limitBytes) {
  let total = 0
  const chunks = []
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    total += buffer.length
    if (total > limitBytes) throw new HttpError(413, 'body too large')
    chunks.push(buffer)
  }
  const text = Buffer.concat(chunks).toString('utf8')
  try {
    return JSON.parse(text)
  } catch {
    throw new HttpError(400, 'body is not JSON')
  }
}

/**
 * Send a JSON body with no caching.
 * @param {{ writeHead: Function, end: Function }} res - the node response.
 * @param {number} status - the HTTP status.
 * @param {object} body - the JSON body.
 */
export function sendJson(res, status, body) {
  const text = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(text),
    'cache-control': 'no-store',
  })
  res.end(text)
}
