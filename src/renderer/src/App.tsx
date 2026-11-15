import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Snowflake } from 'lucide-react'
import { CATEGORIES, getService } from '../../shared/catalog'
import type { Account, AccountAction, AppState, Boot, CatalogService, Command, Settings, ViewStatus } from '../../shared/types'
import { AddSheet } from './components/AddSheet'
import { EditSheet } from './components/EditSheet'
import { Palette } from './components/Palette'
import { SettingsSheet } from './components/SettingsSheet'
import { Sidebar } from './components/Sidebar'
import { Tile } from './components/Tile'
import { Toolbar } from './components/Toolbar'
import { displayName, drawBadge, serviceName } from './util'

const api = window.melcochat

type SheetState =
  | { kind: 'add'; serviceId?: string }
  | { kind: 'edit'; id: string }
  | { kind: 'settings' }
  | { kind: 'palette' }
  | null

const QUICK = ['chatgpt', 'claude', 'gemini', 'venice', 'whatsapp', 'gmail', 'slack', 'telegram']

/** Sidebar order: grouped by category, then by user order. Drives Ctrl/⌘+1…9. */
const visualOrder = (accounts: Account[]) =>
  CATEGORIES.flatMap((c) => accounts.filter((a) => (getService(a.serviceId)?.category ?? 'custom') === c.id))

export function App({ boot }: { boot: Boot }) {
  const [state, setState] = useState<AppState>(boot.state)
  const [statuses, setStatuses] = useState<Record<string, ViewStatus>>({})
  const [sheet, setSheet] = useState<SheetState>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const isMac = boot.platform === 'darwin'

  const { accounts, activeId, settings } = state
  const ordered = useMemo(() => visualOrder(accounts), [accounts])
  const active = accounts.find((a) => a.id === activeId)

  // ── persistence ────────────────────────────────────────────────────────
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const t = setTimeout(() => api.save(state), 250)
    return () => clearTimeout(t)
  }, [state])

  const patchAccount = useCallback((id: string, patch: Partial<Account>) => {
    setState((s) => ({ ...s, accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)) }))
  }, [])
  const setSettings = useCallback((settings: Settings) => setState((s) => ({ ...s, settings })), [])
  const activate = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      activeId: id,
      accounts: s.accounts.map((a) => (a.id === id && a.hibernated ? { ...a, hibernated: false } : a))
    }))
    setSheet(null)
  }, [])

  // Theme: explicit attribute so the UI never depends on media-query timing.
  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme
  }, [settings.theme])

  // Keep a valid selection.
  useEffect(() => {
    if (!active && ordered.length) setState((s) => ({ ...s, activeId: ordered[0].id }))
  }, [active, ordered])

  // ── native views follow the stage rect ─────────────────────────────────
  const overlay = sheet !== null
  const syncViews = useCallback(() => {
    const el = stageRef.current
    const r = el?.getBoundingClientRect()
    const bounds = r ? { x: r.left, y: r.top, width: r.width, height: r.height } : { x: 0, y: 0, width: 0, height: 0 }
    api.syncViews(accounts, activeId, bounds, overlay)
  }, [accounts, activeId, overlay])

  useLayoutEffect(() => {
    syncViews()
    const el = stageRef.current
    if (!el) return
    const ro = new ResizeObserver(() => syncViews())
    ro.observe(el)
    window.addEventListener('resize', syncViews)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', syncViews)
    }
  }, [syncViews, settings.sidebarCollapsed])

  // ── events from main ───────────────────────────────────────────────────
  useEffect(() => {
    const offStatus = api.onStatus((s) => {
      setStatuses((prev) => ({ ...prev, [s.id]: s }))
      if (s.favicon) {
        setState((st) =>
          st.accounts.some((a) => a.id === s.id && a.favicon !== s.favicon)
            ? { ...st, accounts: st.accounts.map((a) => (a.id === s.id ? { ...a, favicon: s.favicon } : a)) }
            : st
        )
      }
    })
    const offHib = api.onHibernated((ids) =>
      setState((s) => ({ ...s, accounts: s.accounts.map((a) => (ids.includes(a.id) ? { ...a, hibernated: true } : a)) }))
    )
    return () => {
      offStatus()
      offHib()
    }
  }, [])

  const stateRef = useRef({ ordered, activeId, settings, sheet })
  stateRef.current = { ordered, activeId, settings, sheet }

  useEffect(
    () =>
      api.onCommand((c: Command) => {
        const { ordered, activeId, settings, sheet } = stateRef.current
        const idx = ordered.findIndex((a) => a.id === activeId)
        switch (c.type) {
          case 'switch-index':
            if (ordered[c.index]) activate(ordered[c.index].id)
            break
          case 'next':
          case 'prev':
            if (ordered.length) activate(ordered[(idx + (c.type === 'next' ? 1 : -1) + ordered.length) % ordered.length].id)
            break
          case 'activate':
            activate(c.id)
            break
          case 'settings':
            setSheet(sheet?.kind === 'settings' ? null : { kind: 'settings' })
            break
          case 'add':
            setSheet({ kind: 'add' })
            break
          case 'palette':
            setSheet(sheet?.kind === 'palette' ? null : { kind: 'palette' })
            break
          case 'toggle-sidebar':
            setSettings({ ...settings, sidebarCollapsed: !settings.sidebarCollapsed })
            break
          case 'toggle-dnd':
            setSettings({ ...settings, doNotDisturb: !settings.doNotDisturb })
            break
          case 'zoom':
            patchAccount(c.id, { zoom: c.zoom })
            break
        }
      }),
    [activate, patchAccount, setSettings]
  )

  // ── unread badge ───────────────────────────────────────────────────────
  useEffect(() => {
    let count = 0
    let indirect = false
    for (const a of accounts) {
      if (!a.notifications) continue
      count += statuses[a.id]?.unread ?? 0
      indirect ||= !!statuses[a.id]?.indirect
    }
    api.setBadge(count, indirect, boot.platform === 'win32' ? drawBadge(count, indirect) : null)
  }, [accounts, statuses, boot.platform])

  // ── account operations ─────────────────────────────────────────────────
  const addAccount = (service: CatalogService, label: string, url: string, color: string) => {
    const id = crypto.randomUUID()
    const account: Account = {
      id,
      serviceId: service.id,
      label,
      url,
      partition: `persist:acct-${id}`,
      color,
      muted: false,
      notifications: true,
      createdAt: Date.now()
    }
    setState((s) => ({ ...s, accounts: [...s.accounts, account], activeId: id }))
    setSheet(null)
  }

  const removeFromState = (id: string) =>
    setState((s) => {
      const rest = s.accounts.filter((a) => a.id !== id)
      return { ...s, accounts: rest, activeId: s.activeId === id ? (visualOrder(rest)[0]?.id ?? null) : s.activeId }
    })

  const runAction = async (a: Account, action: AccountAction | null) => {
    switch (action) {
      case 'edit':
        return setSheet({ kind: 'edit', id: a.id })
      case 'add-another':
        return setSheet({ kind: 'add', serviceId: a.serviceId })
      case 'reload':
        return api.viewAction(a.id, 'reload')
      case 'hibernate': {
        if (a.id === activeId) {
          const next = ordered.find((x) => x.id !== a.id && !x.hibernated)
          setState((s) => ({ ...s, activeId: next?.id ?? s.activeId }))
          if (!next) return
        }
        return patchAccount(a.id, { hibernated: true })
      }
      case 'wake':
        return patchAccount(a.id, { hibernated: false })
      case 'mute':
        return patchAccount(a.id, { muted: !a.muted })
      case 'notifications':
        return patchAccount(a.id, { notifications: !a.notifications })
      case 'devtools':
        return api.devtools(a.id)
      case 'signout': {
        const sharing = accounts.filter((x) => x.id !== a.id && x.partition === a.partition)
        const detail = sharing.length
          ? `This session is shared with ${sharing.map(displayName).join(', ')}, which will be signed out too.`
          : 'Clears cookies, storage and cache for this account only. Other accounts stay signed in.'
        if (await api.confirm(`Sign out of “${displayName(a)}”?`, detail, 'Sign Out')) await api.clearAccount(a)
        return
      }
      case 'remove': {
        // Keep the session data while another account still uses it.
        const shared = accounts.some((x) => x.id !== a.id && x.partition === a.partition)
        const detail = shared
          ? 'The account will be removed. Its sign-in stays, because another account shares it.'
          : 'The account and all of its session data will be deleted from Melcochat.'
        if (await api.confirm(`Remove “${displayName(a)}”?`, detail, 'Remove')) {
          if (!shared) await api.removeAccount(a)
          removeFromState(a.id)
        }
        return
      }
    }
  }

  const openMenu = async (a: Account) => runAction(a, await api.accountMenu(a))

  const reorder = (dragId: string, beforeId: string) =>
    setState((s) => {
      const list = s.accounts.filter((a) => a.id !== dragId)
      const moved = s.accounts.find((a) => a.id === dragId)!
      list.splice(list.findIndex((a) => a.id === beforeId), 0, moved)
      return { ...s, accounts: list }
    })

  // ── render ─────────────────────────────────────────────────────────────
  const status = active ? statuses[active.id] : undefined
  const editing = sheet?.kind === 'edit' ? accounts.find((a) => a.id === sheet.id) : undefined

  return (
    <div className="app">
      <Sidebar
        accounts={accounts}
        activeId={activeId}
        statuses={statuses}
        collapsed={settings.sidebarCollapsed}
        dnd={settings.doNotDisturb}
        isMac={isMac}
        onSelect={activate}
        onMenu={openMenu}
        onReorder={reorder}
        onAdd={() => setSheet({ kind: 'add' })}
        onSettings={() => setSheet({ kind: 'settings' })}
        onPalette={() => setSheet({ kind: 'palette' })}
        onToggleDnd={() => setSettings({ ...settings, doNotDisturb: !settings.doNotDisturb })}
        onToggleCollapse={() => setSettings({ ...settings, sidebarCollapsed: !settings.sidebarCollapsed })}
      />

      <main className="main">
        <Toolbar
          account={active}
          status={status}
          onAction={(x) => active && api.viewAction(active.id, x)}
          onToggleMute={() => active && patchAccount(active.id, { muted: !active.muted })}
          onToggleNotifications={() => active && patchAccount(active.id, { notifications: !active.notifications })}
          onMenu={() => active && openMenu(active)}
        />
        <div className="stage" ref={stageRef}>
          {!accounts.length ? (
            <Welcome onQuick={(id) => setSheet({ kind: 'add', serviceId: id })} onBrowse={() => setSheet({ kind: 'add' })} />
          ) : active && status?.crashed ? (
            <div className="stage-msg">
              <div>
                <h2>{displayName(active)} stopped responding</h2>
                <button className="btn" onClick={() => api.viewAction(active.id, 'reload')}>
                  Reload
                </button>
              </div>
            </div>
          ) : active && sheet ? (
            <div className="stage-msg">
              <div>
                <Tile name={serviceName(active)} color={getService(active.serviceId)?.color ?? active.color} favicon={status?.favicon ?? active.favicon} size="lg" />
              </div>
            </div>
          ) : active?.hibernated ? (
            <div className="stage-msg">
              <div>
                <Snowflake size={28} />
                <h2>Hibernated</h2>
              </div>
            </div>
          ) : null}
        </div>
      </main>

      {sheet?.kind === 'add' && (
        <AddSheet accounts={accounts} initialServiceId={sheet.serviceId} onAdd={addAccount} onClose={() => setSheet(null)} />
      )}
      {editing && (
        <EditSheet
          account={editing}
          accounts={accounts}
          onClose={() => setSheet(null)}
          onSave={(a) => {
            patchAccount(a.id, a)
            setSheet(null)
          }}
        />
      )}
      {sheet?.kind === 'settings' && (
        <SettingsSheet settings={settings} version={boot.version} onChange={setSettings} onClose={() => setSheet(null)} />
      )}
      {sheet?.kind === 'palette' && (
        <Palette
          accounts={ordered}
          statuses={statuses}
          isMac={isMac}
          onPick={activate}
          onAddService={(serviceId) => setSheet({ kind: 'add', serviceId })}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  )
}

function Welcome({ onQuick, onBrowse }: { onQuick: (id: string) => void; onBrowse: () => void }) {
  return (
    <div className="welcome">
      <img src="./icon.png" width={72} height={72} alt="" draggable={false} />
      <h1>Welcome to Melcochat</h1>
      <p>
        All your web apps and AI chats in one calm window. Every account gets its own isolated session, so you can keep several ChatGPT,
        Claude or Gemini accounts signed in at once.
      </p>
      <div className="quick-grid">
        {QUICK.map((id) => {
          const s = getService(id)!
          return (
            <button key={id} className="quick" onClick={() => onQuick(id)}>
              <Tile name={s.name} color={s.color} size="lg" />
              <span>{s.name}</span>
            </button>
          )
        })}
      </div>
      <button className="link-btn" onClick={onBrowse}>
        Browse all {`${CATEGORIES.length - 1}`} categories →
      </button>
    </div>
  )
}
