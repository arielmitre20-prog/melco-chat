import { getService } from '../../shared/catalog'
import type { Account } from '../../shared/types'

export const serviceName = (a: Account) => getService(a.serviceId)?.name ?? 'Web app'

/** Primary line in lists: the account label, or the service name. */
export const displayName = (a: Account) => a.label || serviceName(a)

export const hostOf = (url: string) => {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

/** Windows taskbar overlay badge (macOS/Linux use native badge text). */
export function drawBadge(count: number, indirect: boolean): string | null {
  if (!count && !indirect) return null
  const c = document.createElement('canvas')
  c.width = c.height = 32
  const g = c.getContext('2d')!
  g.fillStyle = '#ff3b30'
  g.beginPath()
  g.arc(16, 16, 15, 0, Math.PI * 2)
  g.fill()
  if (count) {
    const text = count > 99 ? '99+' : String(count)
    g.fillStyle = '#fff'
    g.font = `600 ${text.length > 2 ? 13 : 18}px "Segoe UI", system-ui, sans-serif`
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText(text, 16, 17)
  }
  return c.toDataURL()
}

export const ACCOUNT_COLORS = ['#0a84ff', '#30d158', '#ff9f0a', '#ff375f', '#bf5af2', '#64d2ff', '#ffd60a', '#8e8e93']
