/**
 * Host half of the notification feature.
 *
 * It watches the two moments the user asked for, keeps them in a small queue,
 * and serves the queue to the page. The Client half shows the notices.
 */

import { createTelegram } from './telegram.js'
import { sendJson } from '../../lib/http.js'

/** The routes this feature owns. */
export const ROUTES = {
  pending: '/plugins/toolkit/agent-notify/pending',
  test: '/plugins/toolkit/agent-notify/test',
}

/** Queue bounds: keep the newest notices only. */
const MAX_QUEUE = 200
/** Notices older than this are not delivered. */
const MAX_AGE_MS = 5 * 60 * 1000
/** One question can arrive on two signals; keep one notice per window. */
const INPUT_DEDUPE_MS = 5000

/** A hard dependency on the route carrier and the live session store. */
export const inject = ['webServer', 'sessions']

/**
 * Register the notification source and its routes.
 * @param {object} ctx - the plugin context.
 * @param {object} [config] - optional plugin config; `telegram.chatId` and `telegram.kinds` override the defaults.
 */
export function apply(ctx, config) {
  const queue = []
  const recentInput = new Map()
  const attached = new Set()
  const scopedDisposers = new Set()
  const stats = { status: 0, approval: 0, question: 0, tool: 0, pushed: 0, agents: 0 }
  const telegram = createTelegram(ctx, config?.telegram)
  let seq = 0

  /* Stop the outbound queue when this plugin unloads. */
  ctx.effect(() => () => telegram.dispose())

  /**
   * Read a live session, or undefined.
   * @param {string} sessionId - the session id.
   * @returns {object|undefined} the session.
   */
  const sessionOf = (sessionId) => {
    try {
      return ctx.sessions?.get?.(sessionId)
    } catch {
      return undefined
    }
  }

  /**
   * A child agent belongs to a parent turn, so it never notifies the user.
   * @param {string} sessionId - the session id.
   * @returns {boolean} true for a subagent session.
   */
  const isSubagent = (sessionId) => {
    const session = sessionOf(sessionId)
    const header = session?.header
    if (header === undefined || header === null) return false
    if (header.origin === 'subagent') return true
    return typeof header.delegationDepth === 'number' && header.delegationDepth > 0
  }

  /**
   * Read the durable title of a session when one exists.
   * @param {string} sessionId - the session id.
   * @returns {string|null} the title.
   */
  const titleOf = (sessionId) => {
    const session = sessionOf(sessionId)
    if (session === undefined) return null
    try {
      const snapshot = ctx.get('sessionTitle')?.get?.(session)
      const title = snapshot?.title
      return typeof title === 'string' && title !== '' ? title : null
    } catch {
      return null
    }
  }

  /**
   * Append one notice to the queue.
   * @param {'done'|'input'} kind - the notice kind.
   * @param {string} sessionId - the session id.
   */
  const push = (kind, sessionId) => {
    if (typeof sessionId !== 'string' || sessionId === '') return
    if (isSubagent(sessionId)) return
    seq += 1
    stats.pushed += 1
    const notice = { seq, kind, sessionId, title: titleOf(sessionId), time: Date.now() }
    queue.push(notice)
    while (queue.length > MAX_QUEUE) queue.shift()
    /* The chat copy never blocks the copy for the page. */
    telegram.notify(kind, notice)
  }

  /**
   * Report that one session needs an answer, at most once per window.
   * @param {string|undefined} sessionId - the session id.
   */
  const pushInput = (sessionId) => {
    if (typeof sessionId !== 'string' || sessionId === '') return
    const now = Date.now()
    const last = recentInput.get(sessionId) ?? 0
    if (now - last < INPUT_DEDUPE_MS) return
    recentInput.set(sessionId, now)
    push('input', sessionId)
  }

  /**
   * Listen to one agent's own scope, where its answerer waterfalls dispatch.
   * @param {object} agent - the live agent.
   */
  const attach = (agent) => {
    try {
      const agentCtx = agent?.ctx
      const id = agent?.id
      if (agentCtx === undefined || agentCtx === null) return
      if (typeof id !== 'string' || id === '') return
      if (attached.has(id)) return
      attached.add(id)
      stats.agents += 1
      const offQuestion = agentCtx.on('user-questions/request', (request, next) => {
        stats.question += 1
        pushInput(id)
        return next()
      })
      const offApproval = agentCtx.on('approval/request', (request, next) => {
        stats.approval += 1
        pushInput(id)
        return next()
      })
      if (typeof offQuestion === 'function') scopedDisposers.add(offQuestion)
      if (typeof offApproval === 'function') scopedDisposers.add(offApproval)
    } catch (error) {
      ctx.logger?.warn?.(error)
    }
  }

  /* Release every borrowed agent registration when this plugin unloads. */
  ctx.effect(() => () => {
    for (const dispose of scopedDisposers) {
      try {
        dispose()
      } catch (error) {
        ctx.logger?.warn?.(error)
      }
    }
    scopedDisposers.clear()
    attached.clear()
  })

  /* A task finished: the agent that owns a top-level session went idle. */
  ctx.effect(() => ctx.on('agent/status', (payload) => {
    stats.status += 1
    if (payload?.status !== 'idle') return
    push('done', payload?.agent?.id)
  }, { global: true }))

  /* The question reaches the caller before dispatch, and the call names the agent. */
  ctx.effect(() => ctx.on('tools/pre-execute', (exec, next) => {
    try {
      if (exec?.name === 'ask_user_question') {
        stats.tool += 1
        pushInput(exec?.agent?.id)
      }
    } catch (error) {
      ctx.logger?.warn?.(error)
    }
    return next()
  }, { global: true }))

  /* Agents that already run when this plugin mounts. */
  for (const agent of ctx.get('agents')?.list?.() ?? []) attach(agent)

  ctx.effect(() => ctx.on('agent/created', (payload) => {
    attach(payload?.agent)
  }, { global: true }))

  ctx.effect(() => ctx.on('agent/disposed', (payload) => {
    const id = payload?.agent?.id
    if (typeof id === 'string') attached.delete(id)
  }, { global: true }))

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: ROUTES.pending,
    handler: (req, res) => {
      try {
        const origin = ctx.webServer.getOrigin()
        const requested = req.headers?.origin
        if (typeof requested === 'string' && requested !== '' && requested !== origin) {
          sendJson(res, 403, { error: 'origin refused' })
          return
        }
        if ((req.method ?? 'GET').toUpperCase() !== 'GET') {
          sendJson(res, 405, { error: 'method not allowed' })
          return
        }
        const url = new URL(req.url ?? ROUTES.pending, origin)
        /* No cursor yet: the page just loaded, so it starts from the newest notice. */
        const raw = url.searchParams.get('since')
        if (raw === null || raw === '') {
          sendJson(res, 200, { cursor: seq, notices: [], debug: { ...stats, telegram: telegram.snapshot() } })
          return
        }
        const parsed = Number(raw)
        let since = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
        /* The Host restarted, so an older cursor is not meaningful. */
        if (since > seq) since = 0
        const cutoff = Date.now() - MAX_AGE_MS
        const notices = []
        for (const notice of queue) {
          if (notice.seq <= since || notice.time < cutoff) continue
          notices.push({ seq: notice.seq, kind: notice.kind, sessionId: notice.sessionId, title: notice.title })
        }
        sendJson(res, 200, { cursor: seq, notices, debug: { ...stats, telegram: telegram.snapshot() } })
      } catch (error) {
        ctx.logger?.warn?.(error)
        sendJson(res, 500, { error: 'internal error' })
      }
    },
  }))

  /* One test message, so the chat path is checkable without a real notice. */
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: ROUTES.test,
    handler: async (req, res) => {
      try {
        const origin = ctx.webServer.getOrigin()
        const requested = req.headers?.origin
        if (typeof requested === 'string' && requested !== '' && requested !== origin) {
          sendJson(res, 403, { error: 'origin refused' })
          return
        }
        if ((req.method ?? 'GET').toUpperCase() !== 'POST') {
          sendJson(res, 405, { error: 'method not allowed' })
          return
        }
        const result = await telegram.test()
        sendJson(res, result.ok ? 200 : 502, result)
      } catch (error) {
        ctx.logger?.warn?.(error)
        sendJson(res, 500, { error: 'internal error' })
      }
    },
  }))
}
