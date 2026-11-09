/**
 * Telegram sender for the notification bundle.
 *
 * The Host posts one message for each notice. This file only pushes text out:
 * no update polling, no replies, and no buttons.
 */

/** The credential name that holds the bot token. */
const TOKEN_NAME = 'TELEGRAM_BOT_TOKEN'
/** The Bot API root; the token follows it in each request. */
const API_BASE = 'https://api.telegram.org'
/** The chat that receives the notices. */
const DEFAULT_CHAT_ID = '1106051131'
/** The notice kinds that reach Telegram. */
const DEFAULT_KINDS = ['done', 'input']
/** One request must not block the queue forever. */
const REQUEST_TIMEOUT_MS = 10000
/** One chat must not get more than one message in this window. */
const MIN_GAP_MS = 1100
/** A 429 answer without retry_after waits this long. */
const FALLBACK_RETRY_MS = 2000
/** Telegram rejects a longer text. */
const MAX_TEXT = 4000
/** The headline of each notice kind. */
const LABELS = {
  done: 'Task done',
  input: 'Your input is needed',
}
/** The title of a session without a name. */
const UNTITLED = 'Untitled session'

/**
 * Read a non-empty string, or a fallback.
 * @param {*} value - the candidate.
 * @param {string} fallback - the fallback.
 * @returns {string} the chosen string.
 */
function stringOr(value, fallback) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : fallback
}

/**
 * Describe a thrown value without its stack.
 * @param {*} error - the value.
 * @returns {string} a short description.
 */
function describe(error) {
  if (error === null || error === undefined) return 'unknown error'
  if (typeof error === 'string') return error
  const name = typeof error.name === 'string' ? error.name : 'Error'
  const message = typeof error.message === 'string' ? error.message : String(error)
  return `${name}: ${message}`.slice(0, 300)
}

/**
 * Build one sender for one Host context.
 * @param {object} ctx - the plugin context.
 * @param {object} [options] - optional settings: chatId and kinds.
 * @returns {object} notify, test, snapshot, and dispose.
 */
export function createTelegram(ctx, options = {}) {
  const chatId = stringOr(options?.chatId, DEFAULT_CHAT_ID)
  const configured = Array.isArray(options?.kinds) ? options.kinds : DEFAULT_KINDS
  const kinds = new Set(configured.filter((kind) => kind === 'done' || kind === 'input'))
  const stats = { sent: 0, failed: 0, skipped: 0, lastError: null, lastSentAt: null, pending: 0 }

  let closed = false
  let lastSentAt = 0
  let chain = Promise.resolve()
  let warnedNoToken = false

  /**
   * Wait before the next step.
   * @param {number} ms - the delay.
   * @returns {Promise<void>} resolves after the delay.
   */
  const sleep = (ms) => new Promise((resolve) => {
    const timer = setTimeout(resolve, ms)
    if (typeof timer?.unref === 'function') timer.unref()
  })

  /**
   * Read the bot token from the credential store at each send.
   * @returns {Promise<string|undefined>} the token.
   */
  async function readToken() {
    const credentials = ctx.get('credentials')
    if (credentials === undefined || credentials === null) return undefined
    try {
      const resolved = await credentials.resolve(TOKEN_NAME)
      const value = typeof resolved?.value === 'string' ? resolved.value.trim() : ''
      return value === '' ? undefined : value
    } catch (error) {
      ctx.logger?.warn?.(error)
      return undefined
    }
  }

  /**
   * Post one text to the chat. The token never leaves this call.
   * @param {string} token - the bot token.
   * @param {string} text - the message text.
   * @returns {Promise<object>} status, ok, and the parsed body.
   */
  async function post(token, text) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    try {
      const response = await fetch(`${API_BASE}/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          link_preview_options: { is_disabled: true },
        }),
        signal: controller.signal,
      })
      const body = await response.json().catch(() => undefined)
      return { status: response.status, ok: body?.ok === true, body }
    } finally {
      clearTimeout(timer)
    }
  }

  /**
   * Send one text, with one retry after a rate-limit answer.
   * @param {string} text - the message text.
   * @param {number} [attempt] - the attempt number.
   * @returns {Promise<object>} ok, or ok with an error string.
   */
  async function deliver(text, attempt = 0) {
    const token = await readToken()
    if (token === undefined) {
      stats.skipped += 1
      if (!warnedNoToken) {
        warnedNoToken = true
        ctx.logger?.warn?.(`agent-notify: ${TOKEN_NAME} is not configured`)
      }
      return { ok: false, error: 'token missing' }
    }
    const gap = Date.now() - lastSentAt
    if (gap < MIN_GAP_MS) await sleep(MIN_GAP_MS - gap)
    let result
    try {
      result = await post(token, text)
    } catch (error) {
      stats.failed += 1
      stats.lastError = describe(error)
      ctx.logger?.warn?.(`agent-notify: telegram send failed: ${stats.lastError}`)
      return { ok: false, error: stats.lastError }
    }
    if (result.ok) {
      stats.sent += 1
      stats.lastSentAt = new Date().toISOString()
      stats.lastError = null
      lastSentAt = Date.now()
      return { ok: true }
    }
    const retryAfter = Number(result.body?.parameters?.retry_after)
    if (result.status === 429 && attempt < 1) {
      const wait = Number.isFinite(retryAfter) ? Math.min(60, Math.max(1, retryAfter)) : FALLBACK_RETRY_MS / 1000
      await sleep(wait * 1000)
      return deliver(text, attempt + 1)
    }
    stats.failed += 1
    const reason = typeof result.body?.description === 'string' ? result.body.description : 'no description'
    stats.lastError = `HTTP ${result.status}: ${reason}`.slice(0, 300)
    ctx.logger?.warn?.(`agent-notify: telegram send failed: ${stats.lastError}`)
    return { ok: false, error: stats.lastError }
  }

  /**
   * Queue one notice for the chat.
   * @param {'done'|'input'} kind - the notice kind.
   * @param {object} notice - the notice with a title.
   */
  function notify(kind, notice) {
    if (closed) return
    if (!kinds.has(kind)) {
      stats.skipped += 1
      return
    }
    const title = stringOr(notice?.title, UNTITLED)
    const label = LABELS[kind] ?? LABELS.done
    const text = `${label}: ${title}`.slice(0, MAX_TEXT)
    stats.pending += 1
    chain = chain.then(async () => {
      try {
        await deliver(text)
      } finally {
        stats.pending = Math.max(0, stats.pending - 1)
      }
    })
  }

  /**
   * Send one test message now.
   * @returns {Promise<object>} the result and the counters.
   */
  async function test() {
    const result = await deliver(`Test message from DSH at ${new Date().toISOString()}`)
    return { ...result, telegram: snapshot() }
  }

  /**
   * Copy the counters.
   * @returns {object} the counters.
   */
  function snapshot() {
    return { ...stats, kinds: [...kinds], chatId }
  }

  /** Stop the queue on unload. */
  function dispose() {
    closed = true
  }

  return { notify, test, snapshot, dispose }
}
