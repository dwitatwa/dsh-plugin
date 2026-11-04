/**
 * Global ASD-STE100 writing rule for every agent on this host.
 *
 * The section registers in the host plane, so every session and every agent
 * preset merges it into its own system prompt. The name is unique to this
 * plugin, so no preset persona can shadow it.
 *
 * @module @local/asd-ste100-style
 */

/** Cordis plugin name. */
const name = 'asd-ste100-style'

/** The prompt registry this row contributes to. */
const inject = ['systemPrompt']

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
 * Register the style section in the calling context's scope.
 * @param ctx - the plugin context; the host plane makes the section global.
 */
function apply(ctx) {
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

export { apply, inject, name }
