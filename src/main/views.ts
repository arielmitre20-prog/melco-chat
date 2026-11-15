import {
  BrowserWindow,
  Menu,
  WebContentsView,
  clipboard,
  desktopCapturer,
  dialog,
  session as electronSession,
  shell,
  type MenuItemConstructorOptions,
  type Session,
  type WebContents
} from 'electron'
import { join } from 'node:path'
import { getService } from '../shared/catalog'
import { parseTitleUnread } from '../shared/unread'
import type { Account, Bounds, Settings, ViewStatus } from '../shared/types'
import { chromeUserAgent, firefoxUserAgent, isGoogleAuth, isGoogleRejection } from './userAgent'

interface Entry {
  view: WebContentsView
  account: Account
  status: ViewStatus
  lastActive: number
  proxy?: string
}

const ALLOWED_PERMISSIONS = new Set([
  'notifications',
  'media',
  'mediaKeySystem',
  'clipboard-read',
  'clipboard-sanitized-write',
  'fullscreen',
  'pointerLock',
  'display-capture',
  'speaker-selection',
  'window-management'
])

const isHttp = (url: string) => /^https?:\/\//i.test(url)

/**
 * Owns one WebContentsView per account. Every account lives in its own persistent
 * session partition, so cookies/storage never leak between accounts — this is what
 * makes "three ChatGPT accounts side by side" work.
 */
export class ViewManager {
  private entries = new Map<string, Entry>()
  private configured = new Set<string>()
  private googleWarned = new Set<string>()
  private activeId: string | null = null
  private bounds: Bounds = { x: 0, y: 0, width: 0, height: 0 }
  private overlay = false

  constructor(
    private win: BrowserWindow,
    private getSettings: () => Settings,
    private onStatus: (s: ViewStatus) => void,
    private onShortcut: (wc: WebContents, input: Electron.Input) => boolean
  ) {}

  get active(): WebContents | undefined {
    return this.activeId ? this.entries.get(this.activeId)?.view.webContents : undefined
  }

  accountFor(wc: WebContents): Account | undefined {
    for (const e of this.entries.values()) if (e.view.webContents === wc) return e.account
    return undefined
  }

  get(id: string): WebContents | undefined {
    return this.entries.get(id)?.view.webContents
  }

  /** Reconcile live views with the account list sent by the renderer. */
  sync(accounts: Account[], activeId: string | null, bounds: Bounds, overlay: boolean): void {
    this.bounds = bounds
    this.overlay = overlay
    const wanted = new Map(accounts.map((a) => [a.id, a]))

    for (const id of [...this.entries.keys()]) {
      const a = wanted.get(id)
      if (!a || (a.hibernated && id !== activeId)) this.destroy(id)
    }

    for (const a of accounts) {
      const existing = this.entries.get(a.id)
      if (existing) {
        const urlChanged = existing.account.url !== a.url
        existing.account = a
        this.applyAccount(existing, urlChanged)
      } else if (!a.hibernated || a.id === activeId) {
        this.create(a)
      }
    }

    this.activeId = activeId && this.entries.has(activeId) ? activeId : null
    const active = this.activeId ? this.entries.get(this.activeId) : undefined
    if (active) active.lastActive = Date.now()
    this.layout()
  }

  layout(): void {
    const b = this.bounds
    for (const [id, e] of this.entries) {
      const visible = id === this.activeId && !this.overlay && b.width > 0
      e.view.setVisible(visible)
      if (visible) e.view.setBounds({ x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width), height: Math.round(b.height) })
    }
    if (this.activeId && !this.overlay) {
      const wc = this.entries.get(this.activeId)?.view.webContents
      if (wc && this.win.isFocused()) wc.focus()
    }
  }

  setSpellcheck(enabled: boolean): void {
    for (const p of this.configured) electronSession.fromPartition(p).setSpellCheckerEnabled(enabled)
  }

  /** Accounts idle longer than `minutes` (and not visible) are unloaded. Returns their ids. */
  hibernateIdle(minutes: number): string[] {
    if (minutes <= 0) return []
    const cutoff = Date.now() - minutes * 60_000
    const out: string[] = []
    for (const [id, e] of this.entries) {
      if (id !== this.activeId && e.lastActive < cutoff) {
        this.destroy(id)
        out.push(id)
      }
    }
    return out
  }

  hibernate(id: string): void {
    if (id !== this.activeId) this.destroy(id)
  }

  /** Sign out: wipe cookies, storage and cache of one account's partition. */
  async clearData(account: Account): Promise<void> {
    const ses = electronSession.fromPartition(account.partition)
    await ses.clearStorageData()
    await ses.clearCache()
    await ses.clearAuthCache()
    this.entries.get(account.id)?.view.webContents.loadURL(account.url)
  }

  async remove(account: Account): Promise<void> {
    this.destroy(account.id)
    const ses = electronSession.fromPartition(account.partition)
    await ses.clearStorageData()
    await ses.clearCache()
  }

  destroyAll(): void {
    for (const id of [...this.entries.keys()]) this.destroy(id)
  }

  // ── internals ──────────────────────────────────────────────────────────

  private destroy(id: string): void {
    const e = this.entries.get(id)
    if (!e) return
    this.win.contentView.removeChildView(e.view)
    if (!e.view.webContents.isDestroyed()) e.view.webContents.close()
    this.entries.delete(id)
  }

  private configureSession(account: Account): Session {
    const ses = electronSession.fromPartition(account.partition)
    if (this.configured.has(account.partition)) return ses
    this.configured.add(account.partition)

    const chromeUA = chromeUserAgent()
    ses.setUserAgent(chromeUA)
    ses.setSpellCheckerEnabled(this.getSettings().spellcheck)

    ses.webRequest.onBeforeSendHeaders((details, cb) => {
      const headers = { ...details.requestHeaders }
      if (isGoogleAuth(details.url)) {
        headers['User-Agent'] = firefoxUserAgent()
        for (const k of Object.keys(headers)) if (k.toLowerCase().startsWith('sec-ch-ua')) delete headers[k]
      }
      cb({ requestHeaders: headers })
    })

    ses.setPermissionRequestHandler((_wc, permission, cb) => cb(ALLOWED_PERMISSIONS.has(permission)))
    ses.setPermissionCheckHandler((_wc, permission) => ALLOWED_PERMISSIONS.has(permission))
    ses.setDisplayMediaRequestHandler(
      (_req, cb) => {
        // Fallback where no OS picker exists (Windows): share the primary screen.
        desktopCapturer
          .getSources({ types: ['screen'] })
          .then((sources) => cb(sources[0] ? { video: sources[0], audio: process.platform === 'win32' ? 'loopback' : undefined } : {}))
          .catch(() => cb({}))
      },
      { useSystemPicker: true }
    )
    return ses
  }

  private create(account: Account): void {
    this.configureSession(account)
    const view = new WebContentsView({
      webPreferences: {
        partition: account.partition,
        preload: join(__dirname, '../preload/service.js'),
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
        spellcheck: this.getSettings().spellcheck,
        backgroundThrottling: true
      }
    })
    view.setBackgroundColor('#ffffff') // browser default canvas; pages without a background expect white
    view.setVisible(false)
    view.setBorderRadius(12) // matches the .stage card in the UI
    this.win.contentView.addChildView(view)

    const entry: Entry = {
      view,
      account,
      lastActive: Date.now(),
      status: {
        id: account.id,
        unread: 0,
        indirect: false,
        title: '',
        loading: true,
        canGoBack: false,
        canGoForward: false,
        url: account.url,
        favicon: account.favicon
      }
    }
    this.entries.set(account.id, entry)
    this.wire(entry)
    this.applyAccount(entry, false)
    view.webContents.loadURL(account.url).catch(() => {})
  }

  private applyAccount(e: Entry, reload: boolean): void {
    const wc = e.view.webContents
    const a = e.account
    wc.setAudioMuted(a.muted || this.getSettings().doNotDisturb)
    if (a.zoom && wc.getZoomFactor() !== a.zoom) wc.setZoomFactor(a.zoom)
    if ((a.proxy ?? '') !== (e.proxy ?? '')) {
      e.proxy = a.proxy
      const ses = electronSession.fromPartition(a.partition)
      void ses.setProxy(a.proxy ? { proxyRules: a.proxy } : { mode: 'system' }).then(() => wc.reload())
    }
    if (reload) wc.loadURL(a.url).catch(() => {})
  }

  refreshAudio(): void {
    for (const e of this.entries.values()) this.applyAccount(e, false)
  }

  private emit(e: Entry, patch: Partial<ViewStatus>): void {
    const wc = e.view.webContents
    e.status = {
      ...e.status,
      ...patch,
      canGoBack: wc.navigationHistory.canGoBack(),
      canGoForward: wc.navigationHistory.canGoForward(),
      url: wc.getURL() || e.status.url
    }
    this.onStatus(e.status)
  }

  private wire(e: Entry): void {
    const wc = e.view.webContents
    const strategy = getService(e.account.serviceId)?.unread ?? 'title'

    wc.on('page-title-updated', (_ev, title) => {
      const u = strategy === 'title' ? parseTitleUnread(title) : { count: 0, indirect: false }
      this.emit(e, { title, unread: u.count, indirect: u.indirect })
    })
    wc.on('page-favicon-updated', (_ev, favicons) => {
      const icon = favicons.find((f) => /\.(svg|png)(\?|$)/i.test(f)) ?? favicons[0]
      if (icon) this.emit(e, { favicon: icon })
    })
    wc.on('did-start-loading', () => this.emit(e, { loading: true, crashed: false }))
    wc.on('did-stop-loading', () => this.emit(e, { loading: false }))
    wc.on('did-navigate', (_ev, url) => {
      this.emit(e, {})
      if (isGoogleRejection(url)) this.googleBlocked(e)
    })
    // Google's sign-in is a single-page app: the rejection usually arrives as an in-page navigation.
    wc.on('did-navigate-in-page', (_ev, url) => {
      this.emit(e, {})
      if (isGoogleRejection(url)) this.googleBlocked(e)
    })
    wc.on('render-process-gone', () => this.emit(e, { crashed: true, loading: false }))
    wc.on('before-input-event', (ev, input) => {
      if (this.onShortcut(wc, input)) ev.preventDefault()
    })

    wc.setWindowOpenHandler(({ url, disposition }) => {
      // Real popups (OAuth "Sign in with Google/Apple/Microsoft", payment windows)
      // must share the account's session, so they open in-app.
      if (disposition === 'new-window' || url === 'about:blank') {
        return {
          action: 'allow',
          overrideBrowserWindowOptions: {
            width: 520,
            height: 720,
            parent: this.win,
            autoHideMenuBar: true,
            webPreferences: { partition: e.account.partition, sandbox: true, contextIsolation: true }
          }
        }
      }
      if (isHttp(url)) void shell.openExternal(url)
      return { action: 'deny' }
    })

    // "Continue with Google" popups hit the same block; close them and explain.
    wc.on('did-create-window', (popup) => {
      const check = (_ev: unknown, url: string): void => {
        if (!isGoogleRejection(url)) return
        popup.close()
        this.googleBlocked(e)
      }
      popup.webContents.on('did-navigate', check)
      popup.webContents.on('did-navigate-in-page', check)
    })

    wc.on('context-menu', (_ev, p) => this.contextMenu(wc, p))
  }

  /**
   * Google refuses sign-in inside embedded browsers, whatever user agent they present.
   * Instead of leaving the user on a dead end, explain once and offer the real browser.
   */
  private googleBlocked(e: Entry): void {
    if (this.googleWarned.has(e.account.id)) return
    this.googleWarned.add(e.account.id)
    const name = getService(e.account.serviceId)?.name ?? 'This service'
    void dialog
      .showMessageBox(this.win, {
        type: 'info',
        title: 'Google blocked the sign-in',
        message: "Google doesn't allow signing in from inside apps like Melcochat.",
        detail:
          `This is a Google security policy for embedded browsers, not a problem with your account. You can keep using ${name} in your regular browser.`,
        buttons: ['Open in Browser', 'Close'],
        defaultId: 0,
        cancelId: 1
      })
      .then(({ response }) => {
        if (response === 0) void shell.openExternal(e.account.url)
      })
  }

  private contextMenu(wc: WebContents, p: Electron.ContextMenuParams): void {
    const items: MenuItemConstructorOptions[] = []
    if (p.misspelledWord) {
      for (const s of p.dictionarySuggestions.slice(0, 5)) items.push({ label: s, click: () => wc.replaceMisspelling(s) })
      items.push({ label: 'Add to dictionary', click: () => wc.session.addWordToSpellCheckerDictionary(p.misspelledWord) })
      items.push({ type: 'separator' })
    }
    if (p.linkURL && isHttp(p.linkURL)) {
      items.push({ label: 'Open link in browser', click: () => shell.openExternal(p.linkURL) })
      items.push({ label: 'Copy link', click: () => clipboard.writeText(p.linkURL) })
      items.push({ type: 'separator' })
    }
    if (p.mediaType === 'image' && p.srcURL) {
      items.push({ label: 'Copy image', click: () => wc.copyImageAt(p.x, p.y) })
      items.push({ label: 'Save image as…', click: () => wc.downloadURL(p.srcURL) })
      items.push({ type: 'separator' })
    }
    if (p.isEditable) {
      items.push({ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'pasteAndMatchStyle' }, { role: 'selectAll' })
    } else if (p.selectionText) {
      items.push({ role: 'copy' })
    }
    if (items.length && items[items.length - 1].type !== 'separator') items.push({ type: 'separator' })
    items.push(
      { label: 'Back', enabled: wc.navigationHistory.canGoBack(), click: () => wc.navigationHistory.goBack() },
      { label: 'Forward', enabled: wc.navigationHistory.canGoForward(), click: () => wc.navigationHistory.goForward() },
      { label: 'Reload', click: () => wc.reload() },
      { type: 'separator' },
      { label: 'Inspect element', click: () => wc.inspectElement(p.x, p.y) }
    )
    Menu.buildFromTemplate(items).popup({ window: this.win })
  }
}
