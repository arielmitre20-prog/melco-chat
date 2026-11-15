/**
 * Most web apps advertise unread messages in the document title:
 *   "(3) WhatsApp", "Inbox (12) - me@gmail.com", "[5] Element", "• Slack | general", "* Discord".
 * Returns the count, or `indirect` when there is activity without a number.
 */
export function parseTitleUnread(title: string): { count: number; indirect: boolean } {
  const t = title.trim()
  const m = t.match(/^\((\d[\d,.]*)\+?\)/) ?? t.match(/^\[(\d[\d,.]*)\+?\]/) ?? t.match(/\((\d[\d,.]*)\+?\)/)
  if (m) {
    const count = parseInt(m[1].replace(/[,.]/g, ''), 10)
    if (Number.isFinite(count) && count > 0) return { count, indirect: false }
  }
  if (/^[•●*!]\s/.test(t)) return { count: 0, indirect: true }
  return { count: 0, indirect: false }
}
