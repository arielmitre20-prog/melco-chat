/**
 * Preload injected into every web app view (isolated world, sandboxed).
 *
 * It swaps the page's Notification API for a shim so Hamsket can route web
 * notifications through native OS notifications — labelled with the account,
 * respecting per-account mute and Do Not Disturb, and switching to the right
 * account when clicked.
 */
import { contextBridge, ipcRenderer } from 'electron'

const TAG = '__hamsket'

// Runs in the page's main world, before any page script.
function installNotificationShim(tag: string): void {
  const instances = new Map<number, EventTarget & { onclick?: ((e: Event) => void) | null }>()
  let seq = 0

  const post = (id: number, title: unknown, opts?: NotificationOptions) =>
    window.postMessage({ [tag]: 'notify', id, title: String(title ?? ''), body: String(opts?.body ?? ''), silent: !!opts?.silent }, '*')

  class HamsketNotification extends EventTarget {
    static get permission(): NotificationPermission {
      return 'granted'
    }
    static requestPermission(cb?: (p: NotificationPermission) => void): Promise<NotificationPermission> {
      cb?.('granted')
      return Promise.resolve('granted')
    }
    static readonly maxActions = 0
    onclick: ((e: Event) => void) | null = null
    onclose: ((e: Event) => void) | null = null
    onshow: ((e: Event) => void) | null = null
    onerror: ((e: Event) => void) | null = null
    readonly title: string
    readonly body: string
    readonly tag: string
    readonly data: unknown
    readonly icon: string
    constructor(title: string, opts: NotificationOptions = {}) {
      super()
      this.title = title
      this.body = opts.body ?? ''
      this.tag = opts.tag ?? ''
      this.data = opts.data
      this.icon = opts.icon ?? ''
      const id = ++seq
      instances.set(id, this)
      if (instances.size > 50) instances.delete(instances.keys().next().value as number)
      post(id, title, opts)
      setTimeout(() => {
        const e = new Event('show')
        this.onshow?.(e)
        this.dispatchEvent(e)
      })
    }
    close(): void {}
  }

  Object.defineProperty(window, 'Notification', { value: HamsketNotification, writable: true, configurable: true })

  if ('ServiceWorkerRegistration' in window) {
    ServiceWorkerRegistration.prototype.showNotification = function (title: string, opts?: NotificationOptions) {
      post(++seq, title, opts)
      return Promise.resolve()
    }
  }

  window.addEventListener('message', (ev) => {
    if (ev.source !== window || ev.data?.[tag] !== 'click') return
    const n = instances.get(ev.data.id)
    if (!n) return
    const e = new Event('click')
    n.onclick?.(e)
    n.dispatchEvent(e)
  })
}

try {
  contextBridge.executeInMainWorld({ func: installNotificationShim, args: [TAG] })
} catch {
  // Older runtime or restricted frame: fall back to the page's own notifications.
}

window.addEventListener('message', (ev) => {
  if (ev.source !== window || ev.data?.[TAG] !== 'notify') return
  const { id, title, body, silent } = ev.data
  ipcRenderer.send('svc:notify', { id, title, body, silent })
})

ipcRenderer.on('svc:notification-click', (_e, id: number) => {
  window.postMessage({ [TAG]: 'click', id }, '*')
})
