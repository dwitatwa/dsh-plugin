/**
 * Expand the picked sessions to their whole descendant set.
 * @param {Array<{ id: string, parentSession?: string }>} headers - stored session headers.
 * @param {string[]} pickedIds - the sessions the user picked.
 * @returns {{ all: string[], children: string[] }} every id in discovery order, and the added descendants.
 */
export function expandDescendants(headers, pickedIds) {
  const childrenOf = new Map()
  for (const header of headers ?? []) {
    if (header?.parentSession === undefined || header?.id === undefined) continue
    const list = childrenOf.get(header.parentSession)
    if (list === undefined) childrenOf.set(header.parentSession, [header.id])
    else list.push(header.id)
  }
  const picked = new Set(pickedIds ?? [])
  const seen = new Set()
  const all = []
  const queue = [...picked]
  while (queue.length > 0) {
    const id = queue.shift()
    if (seen.has(id)) continue
    seen.add(id)
    all.push(id)
    for (const child of childrenOf.get(id) ?? []) if (!seen.has(child)) queue.push(child)
  }
  const children = all.filter((id) => !picked.has(id))
  return { all, children }
}
