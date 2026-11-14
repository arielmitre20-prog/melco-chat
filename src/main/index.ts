import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  nativeImage,
  nativeTheme,
  Notification,
  shell,
  Tray,
  type MenuItemConstructorOptions,
  type WebContents
} from 'electron'
import { release } from 'node:os'
import { join } from 'node:path'
import type { Account, AccountAction, AppState, Boot, Bounds, Command, ViewAction, ViewStatus } from '../shared/types'
import { loadState, loadWindowState, saveState, saveWindowState } from './store'
import { ViewManager } from './views'

const isMac = process.platform === 'darwin'
const isWin = process.platform === 'win32'
const supportsMica = isWin && Number(release().split('.')[2] ?? 0) >= 22000
const resource = (name: string) => join(app.getAppPath(), 'resources', name)

app.setName('Hamsket')
// Portable mode / testing: keep all data in a custom folder.
if (process.env.HAMSKET_USER_DATA) app.setPath('userData', process.env.HAMSKET_USER_DATA)
if (isWin) app.setAppUserModelId('io.github.hamsket')

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let state: AppState = loadState()
let win: BrowserWindow
let views: ViewManager
let tray: Tray | null = null
let quitting = false

const send = (channel: string, ...args: unknown[]) => {
  if (win && !win.isDestroyed()) win.webContents.send(channel, ...args)
}
const command = (c: Command) => send('command', c)

function showWindow(): void {
  if (win.isMinimized()) win.restore()
  win.show()
  win.focus()
}

// ── Keyboard shortcuts (work no matter which web app has focus) ────────────
function handleShortcut(_wc: WebContents, input: Electron.Input): boolean {
  if (input.type !== 'keyDown') return false
  const mod = isMac ? input.meta : input.control
  const key = input.key.toLowerCase()
  const active = views?.active
  const run = (fn: () => void) => (fn(), true)

  if (mod && !input.shift && /^[1-9]$/.test(key)) return run(() => command({ type: 'switch-index', index: Number(key) - 1 }))
  if (input.control && key === 'tab') return run(() => command({ type: input.shift ? 'prev' : 'next' }))
  if (mod && key === ',') return run(() => command({ type: 'settings' }))
  if (mod && key === 'k') return run(() => command({ type: 'palette' }))
  if (mod && key === 't') return run(() => command({ type: 'add' }))
  if (mod && key === '\\') return run(() => command({ type: 'toggle-sidebar' }))
  if (mod && input.shift && key === 'd') return run(() => command({ type: 'toggle-dnd' }))
  if (!active) return false
  if ((mod && key === 'r') || key === 'f5') return run(() => (input.shift ? active.reloadIgnoringCache() : active.reload()))
  if ((mod && key === '[') || (input.alt && key === 'arrowleft')) return run(() => active.navigationHistory.goBack())
  if ((mod && key === ']') || (input.alt && key === 'arrowright')) return run(() => active.navigationHistory.goForward())
  if ((mod && input.alt && key === 'i') || key === 'f12') return run(() => active.toggleDevTools())
  if (mod && ['=', '+', '-', '0'].includes(key)) {
    return run(() => {
      const z = key === '0' ? 1 : Math.min(3, Math.max(0.3, active.getZoomFactor() + (key === '-' ? -0.1 : 0.1)))
      active.setZoomFactor(z)
      const acct = views.accountFor(active)
      if (acct) command({ type: 'zoom', id: acct.id, zoom: Math.round(z * 100) / 100 })
    })
  }
  return false
}

// ── Window ────────────────────────────────────────────────────────────────
function createWindow(): void {
  const ws = loadWindowState()
  const dark = nativeTheme.shouldUseDarkColors
  win = new BrowserWindow({
    x: ws.x,
    y: ws.y,
    width: ws.width,
    height: ws.height,
    minWidth: 720,
    minHeight: 480,
    show: false,
    title: 'Hamsket',
    icon: resource('icon.png'),
    backgroundColor: isMac || supportsMica ? '#00000000' : dark ? '#1c1c1e' : '#f5f5f7',
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    trafficLightPosition: { x: 18, y: 18 },
    titleBarOverlay: isMac ? undefined : { color: '#00000000', symbolColor: dark ? '#f5f5f7' : '#1d1d1f', height: 48 },
    vibrancy: isMac ? 'sidebar' : undefined,
    visualEffectState: isMac ? 'followWindow' : undefined,
    backgroundMaterial: supportsMica ? 'mica' : undefined,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  })
  if (ws.maximized) win.maximize()

  views = new ViewManager(win, () => state.settings, (s: ViewStatus) => send('view:status', s), handleShortcut)

  win.webContents.on('before-input-event', (ev, input) => {
    if (handleShortcut(win.webContents, input)) ev.preventDefault()
  })
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (e) => e.preventDefault())

  win.once('ready-to-show', () => {
    if (!state.settings.startMinimized) win.show()
  })
  win.on('focus', () => views.layout())
  win.on('close', (e) => {
    const b = win.getNormalBounds()
    saveWindowState({ ...b, maximized: win.isMaximized() })
    if (!quitting && (isMac || state.settings.closeToTray)) {
      e.preventDefault()
      win.hide()
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) void win.loadURL(process.env.ELECTRON_RENDERER_URL)
  else void win.loadFile(join(__dirname, '../renderer/index.html'))
}

nativeTheme.on('updated', () => {
  if (!isMac && win && !win.isDestroyed()) {
    win.setTitleBarOverlay({ color: '#00000000', symbolColor: nativeTheme.shouldUseDarkColors ? '#f5f5f7' : '#1d1d1f', height: 48 })
  }
})

// ── Tray & app menu ───────────────────────────────────────────────────────
function buildTray(): void {
  if (tray) return
  const img = nativeImage.createFromPath(resource(isMac ? 'trayTemplate.png' : 'tray.png'))
  tray = new Tray(img.isEmpty() ? nativeImage.createEmpty() : img)
  tray.setToolTip('Hamsket')
  tray.on('click', () => (win.isVisible() && win.isFocused() ? win.hide() : showWindow()))
  updateTrayMenu()
}

function updateTrayMenu(): void {
  tray?.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Show Hamsket', click: showWindow },
      { type: 'separator' },
      { label: 'Do Not Disturb', type: 'checkbox', checked: state.settings.doNotDisturb, click: () => command({ type: 'toggle-dnd' }) },
      { type: 'separator' },
      { label: 'Quit', role: 'quit' }
    ])
  )
}

function buildAppMenu(): void {
  const template: MenuItemConstructorOptions[] = [
    ...(isMac ? [{ role: 'appMenu' as const }] : []),
    {
      label: 'File',
      submenu: [
        { label: 'Add Account…', click: () => command({ type: 'add' }) },
        { label: 'Settings…', click: () => command({ type: 'settings' }) },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { label: 'Quick Switcher', click: () => command({ type: 'palette' }) },
        { label: 'Toggle Sidebar', click: () => command({ type: 'toggle-sidebar' }) },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { label: 'App Developer Tools', click: () => win.webContents.toggleDevTools() }
      ]
    },
    { role: 'windowMenu' }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

// ── Settings side-effects ─────────────────────────────────────────────────
function applySettings(prev: AppState['settings'] | null): void {
  const s = state.settings
  nativeTheme.themeSource = s.theme
  if (!prev || prev.launchAtLogin !== s.launchAtLogin) {
    if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: s.launchAtLogin })
  }
  if (prev && prev.doNotDisturb !== s.doNotDisturb) {
    views.refreshAudio()
    updateTrayMenu()
  }
  if (prev && prev.spellcheck !== s.spellcheck) views.setSpellcheck(s.spellcheck)
}

// ── IPC ───────────────────────────────────────────────────────────────────
function registerIpc(): void {
  ipcMain.handle('state:load', (): Boot => ({
    state,
    platform: process.platform,
    material: isMac ? 'vibrancy' : supportsMica ? 'mica' : 'none',
    version: app.getVersion()
  }))

  ipcMain.on('state:save', (_e, next: AppState) => {
    const prev = state.settings
    state = next
    saveState(state)
    applySettings(prev)
  })

  ipcMain.on('views:sync', (_e, accounts: Account[], activeId: string | null, bounds: Bounds, overlay: boolean) => {
    views.sync(accounts, activeId, bounds, overlay)
  })

  ipcMain.on('view:action', (_e, id: string, action: ViewAction) => {
    const wc = views.get(id)
    const acct = state.accounts.find((a) => a.id === id)
    if (!wc) return
    if (action === 'back') wc.navigationHistory.goBack()
    if (action === 'forward') wc.navigationHistory.goForward()
    if (action === 'reload') wc.reload()
    if (action === 'home' && acct) void wc.loadURL(acct.url)
  })

  ipcMain.handle('account:menu', (_e, a: Account): Promise<AccountAction | null> => {
    return new Promise((resolve) => {
      let picked: AccountAction | null = null
      const pick = (x: AccountAction) => () => (picked = x)
      const menu = Menu.buildFromTemplate([
        { label: 'Edit Account…', click: pick('edit') },
        { label: 'Add Another Account of This Service', click: pick('add-another') },
        { type: 'separator' },
        { label: 'Reload', click: pick('reload') },
        a.hibernated ? { label: 'Wake Up', click: pick('wake') } : { label: 'Hibernate (free memory)', click: pick('hibernate') },
        { type: 'separator' },
        { label: 'Mute Audio', type: 'checkbox', checked: a.muted, click: pick('mute') },
        { label: 'Show Notifications', type: 'checkbox', checked: a.notifications, click: pick('notifications') },
        { type: 'separator' },
        { label: 'Developer Tools', click: pick('devtools') },
        { label: 'Sign Out (Clear Session Data)…', click: pick('signout') },
        { label: 'Remove Account…', click: pick('remove') }
      ])
      menu.popup({ window: win, callback: () => setImmediate(() => resolve(picked)) })
    })
  })

  ipcMain.handle('account:devtools', (_e, id: string) => views.get(id)?.openDevTools({ mode: 'detach' }))
  ipcMain.handle('account:hibernate', (_e, id: string) => views.hibernate(id))
  ipcMain.handle('account:clear', (_e, a: Account) => views.clearData(a))
  ipcMain.handle('account:remove', (_e, a: Account) => views.remove(a))

  ipcMain.handle('dialog:confirm', async (_e, message: string, detail: string, confirmLabel: string) => {
    const r = await dialog.showMessageBox(win, {
      type: 'warning',
      message,
      detail,
      buttons: [confirmLabel, 'Cancel'],
      defaultId: 1,
      cancelId: 1
    })
    return r.response === 0
  })

  ipcMain.on('app:badge', (_e, count: number, indirect: boolean, dataUrl: string | null) => {
    const show = state.settings.showUnreadInDock
    if (isMac) app.dock?.setBadge(show ? (count > 0 ? String(count) : indirect ? '•' : '') : '')
    else if (isWin) win.setOverlayIcon(show && dataUrl ? nativeImage.createFromDataURL(dataUrl) : null, count ? `${count} unread` : '')
    else app.setBadgeCount(show ? count : 0)
    tray?.setToolTip(count ? `Hamsket — ${count} unread` : 'Hamsket')
    if (isWin && count > 0 && show && !win.isFocused()) win.flashFrame(true)
  })

  ipcMain.on('open-external', (_e, url: string) => {
    if (/^https?:\/\//.test(url)) void shell.openExternal(url)
  })

  // Notifications forwarded from web apps (see preload/service.ts).
  ipcMain.on('svc:notify', (e, p: { id: number; title: string; body: string; silent?: boolean }) => {
    const acct = views.accountFor(e.sender)
    if (!acct || state.settings.doNotDisturb || !acct.notifications || !Notification.isSupported()) return
    const n = new Notification({
      title: p.title || acct.label,
      subtitle: acct.label,
      body: isMac ? p.body : `${p.body}\n${acct.label}`.trim(),
      silent: acct.muted || p.silent
    })
    n.on('click', () => {
      showWindow()
      command({ type: 'activate', id: acct.id })
      if (!e.sender.isDestroyed()) e.sender.send('svc:notification-click', p.id)
    })
    n.show()
  })
}

// ── Lifecycle ─────────────────────────────────────────────────────────────
app.on('second-instance', () => win && showWindow())
app.on('activate', () => win && showWindow())
app.on('before-quit', () => {
  quitting = true
})

void app.whenReady().then(() => {
  registerIpc()
  createWindow()
  applySettings(null)
  buildAppMenu()
  buildTray()

  setInterval(() => {
    const ids = views.hibernateIdle(state.settings.autoHibernateMinutes)
    if (ids.length) send('accounts:hibernated', ids)
  }, 60_000)
})

app.on('window-all-closed', () => {
  if (!isMac) app.quit()
})
