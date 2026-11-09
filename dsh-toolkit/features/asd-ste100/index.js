/**
 * Global ASD-STE100 writing rule for every agent on this host.
 *
 * The section registers in the host plane, so every session and every agent
 * preset merges it into its own system prompt. The name is unique to this
 * feature, so no preset persona can shadow it. Set `enabled: false` in the
 * row config to stop the rule without removing the plugin. The settings page
 * reads and changes this value through two routes this feature owns.
 *
 * @module @local/dsh-toolkit/features/asd-ste100
 */

import { sendJson } from '../../lib/http.js'

/** The prompt registry and the route carrier this row contributes to. */
const inject = ['systemPrompt', 'webServer']

/** The routes this feature owns. */
const ROUTES = {
  state: '/plugins/toolkit/asd-ste100/state',
  set: '/plugins/toolkit/asd-ste100/set',
}

/** Section order: after the persona (0), before plan policy (500). */
const ORDER = 100

/**
 * The instruction text. Each sentence obeys the rule that it states.
 */
const STYLE = `Write all prose for the user in ASD-STE100 Simplified Technical English.
- Keep each sentence to 20 words or less.
- Give one instruction in one sentence.
- Use the active voice. Name the actor.
- Use simple present, past, or future tense. Do not use perfect tenses.
- Write "must" for a requirement. Write "do not" for a prohibition.
- Use one word for one meaning. Do not change words for variety.
- Keep noun clusters to three words or less.
- Keep each paragraph to six sentences or less.
- Use a list for three or more parallel items.
- Do not use idioms, slang, or figures of speech.
- Keep technical names, file paths, commands, and identifiers as written.
- Do not apply this rule to code, file content, or quoted text.
- Write a summary first, then the detail.
- State facts without filler. Do not use marketing words.`

/**
 * The current enabled state of this feature.
 * @param {object} config - the plugin config.
 * @returns {boolean} true when the rule applies.
 */
function isEnabled(config) {
  return config?.enabled !== false
}

/**
 * Persist the next enabled state through the config editor.
 * @param {object} ctx - the plugin context.
 * @param {object} entry - the Loader entry of this row.
 * @param {boolean} enabled - the next state.
 * @returns {Promise<void>} resolves after the Loader reconciles the change.
 */
async function persist(ctx, entry, enabled) {
  const editor = ctx.get('configEditor')
  if (entry === undefined || editor === undefined) {
    throw new Error('Configuration cannot be saved in this profile')
  }
  await editor.edit(entry, (current, inherited) => ({
    ...(inherited ?? {}),
    ...(current ?? {}),
    enabled,
  }))
}

/**
 * Refuse a request that does not come from this app's own page.
 * @param {object} req - the incoming request.
 * @param {string} origin - this server's origin.
 * @returns {boolean} true when allowed.
 */
function ownPage(req, origin) {
  const raw = req?.headers?.origin
  if (typeof raw !== 'string' || raw === '') return true
  return raw === origin
}

/**
 * Register the style section and the two settings routes.
 * @param {object} ctx - the plugin context; the host plane makes the section global.
 * @param {object} [config] - optional plugin config; `enabled: false` stops the rule.
 */
function apply(ctx, config) {
  const entry = ctx.fiber?.entry

  if (isEnabled(config)) {
    ctx.effect(
      () =>
        ctx.systemPrompt.section({
          name: 'local:asd-ste100-style',
          order: ORDER,
          text: STYLE,
        }),
      'asd-ste100-style.section()',
    )
  }

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: ROUTES.state,
    handler: (req, res) => {
      try {
        const origin = ctx.webServer.getOrigin()
        if (!ownPage(req, origin)) {
          sendJson(res, 403, { error: 'origin refused' })
          return
        }
        sendJson(res, 200, { enabled: isEnabled(config) })
      } catch (error) {
        ctx.logger?.warn?.(error)
        sendJson(res, 500, { error: 'internal error' })
      }
    },
  }))

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: ROUTES.set,
    handler: async (req, res) => {
      try {
        const origin = ctx.webServer.getOrigin()
        if (!ownPage(req, origin)) {
          sendJson(res, 403, { error: 'origin refused' })
          return
        }
        if ((req.method ?? '').toUpperCase() !== 'POST') {
          sendJson(res, 405, { error: 'method not allowed' })
          return
        }
        const chunks = []
        let total = 0
        for await (const chunk of req) {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
          total += buffer.length
          if (total > 4096) throw new Error('body too large')
          chunks.push(buffer)
        }
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
        if (body?.enabled === undefined) throw new Error('missing enabled')
        await persist(ctx, entry, body.enabled === true)
        sendJson(res, 200, { enabled: body.enabled === true, saved: true })
      } catch (error) {
        ctx.logger?.warn?.(error)
        sendJson(res, 500, { error: error instanceof Error ? error.message : 'internal error' })
      }
    },
  }))
}

export { apply, inject }
