/**
 * Host half of the toolkit UI row.
 *
 * This row exists so the Client runner loads the package's client module
 * (`./client`), which registers the Toolkit settings section, the General
 * settings rows, and the notice overlay. The host half itself owns nothing.
 */

/** The UI needs no host service. */
const inject = []

/**
 * Register nothing on the host plane.
 * @param {object} _ctx - the plugin context, unused.
 */
function apply(_ctx) {}

export { apply, inject }
