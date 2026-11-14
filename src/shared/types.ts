export type Category = 'ai' | 'messaging' | 'email' | 'work' | 'social' | 'media' | 'custom'

/** How unread counts are detected for a service. */
export type UnreadStrategy = 'title' | 'none'

/**
 * `core`: first-class, the multi-account flow is designed around it.
 * `candidate`: added to the catalog, still to be validated (see docs/SERVICE-VALIDATION.md).
 */
export type CatalogStatus = 'core' | 'candidate'

export interface CatalogService {
  id: string
  name: string
  category: Category
  /** Start URL. May contain `{workspace}` when `template` is set. */
  url: string
  /** Hex brand color used for the monogram tile until the favicon loads. */
  color: string
  unread: UnreadStrategy
  status: CatalogStatus
  description?: string
  /** If set, the user must fill this placeholder (e.g. Slack workspace, self-hosted host). */
  template?: { label: string; placeholder: string }
  /** Short hint shown when adding the service. */
  note?: string
}

/** One signed-in instance of a service. Each has its own isolated browser session. */
export interface Account {
  id: string
  serviceId: string
  /** User-facing label, e.g. "Work" or "personal@…". */
  label: string
  url: string
  /** Electron session partition. `persist:` prefix keeps cookies across restarts. */
  partition: string
  color: string
  favicon?: string
  muted: boolean
  notifications: boolean
  /** Unloaded from memory until opened again. */
  hibernated?: boolean
  /** Optional proxy rules, e.g. "socks5://127.0.0.1:1080". */
  proxy?: string
  zoom?: number
  createdAt: number
}

export type ThemePref = 'system' | 'light' | 'dark'

export interface Settings {
  theme: ThemePref
  sidebarCollapsed: boolean
  doNotDisturb: boolean
  closeToTray: boolean
  startMinimized: boolean
  launchAtLogin: boolean
  /** Minutes of inactivity before a background account is hibernated. 0 = never. */
  autoHibernateMinutes: number
  spellcheck: boolean
  showUnreadInDock: boolean
}

export interface AppState {
  version: 1
  accounts: Account[]
  activeId: string | null
  settings: Settings
}

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

export interface ViewStatus {
  id: string
  unread: number
  /** Has activity but no countable number (e.g. a dot). */
  indirect: boolean
  title: string
  loading: boolean
  canGoBack: boolean
  canGoForward: boolean
  url: string
  favicon?: string
  crashed?: boolean
}

export type Command =
  | { type: 'switch-index'; index: number }
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'settings' }
  | { type: 'add' }
  | { type: 'palette' }
  | { type: 'toggle-sidebar' }
  | { type: 'toggle-dnd' }
  | { type: 'activate'; id: string }
  | { type: 'zoom'; id: string; zoom: number }

export type AccountAction =
  | 'edit'
  | 'add-another'
  | 'reload'
  | 'hibernate'
  | 'wake'
  | 'mute'
  | 'notifications'
  | 'signout'
  | 'devtools'
  | 'remove'

export type ViewAction = 'back' | 'forward' | 'reload' | 'home'

export interface Boot {
  state: AppState
  platform: NodeJS.Platform
  /** Native window material behind the translucent sidebar. */
  material: 'vibrancy' | 'mica' | 'none'
  version: string
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  sidebarCollapsed: false,
  doNotDisturb: false,
  closeToTray: true,
  startMinimized: false,
  launchAtLogin: false,
  autoHibernateMinutes: 0,
  spellcheck: true,
  showUnreadInDock: true
}
