import { useState } from 'react'
import { ChevronDown, Moon, PanelLeft, Plus, Search, Settings } from 'lucide-react'
import { CATEGORIES, getService } from '../../../shared/catalog'
import type { Account, Category, ViewStatus } from '../../../shared/types'
import { displayName, serviceName } from '../util'
import { Tile } from './Tile'

interface Props {
  accounts: Account[]
  activeId: string | null
  statuses: Record<string, ViewStatus>
  collapsed: boolean
  dnd: boolean
  isMac: boolean
  onSelect: (id: string) => void
  onMenu: (a: Account) => void
  onReorder: (dragId: string, beforeId: string) => void
  onAdd: () => void
  onSettings: () => void
  onPalette: () => void
  onToggleDnd: () => void
  onToggleCollapse: () => void
}

const loadClosed = (): Record<string, boolean> => {
  try {
    return JSON.parse(localStorage.getItem('closedGroups') ?? '{}')
  } catch {
    return {}
  }
}

export function Sidebar(p: Props) {
  const [closed, setClosed] = useState<Record<string, boolean>>(loadClosed)
  const [drag, setDrag] = useState<{ id: string; over?: string } | null>(null)

  const toggleGroup = (c: Category) => {
    const next = { ...closed, [c]: !closed[c] }
    setClosed(next)
    try {
      localStorage.setItem('closedGroups', JSON.stringify(next))
    } catch {
      /* storage unavailable */
    }
  }

  const perService = new Map<string, number>()
  for (const a of p.accounts) perService.set(a.serviceId, (perService.get(a.serviceId) ?? 0) + 1)

  const groups = CATEGORIES.map((c) => ({
    ...c,
    items: p.accounts.filter((a) => (getService(a.serviceId)?.category ?? 'custom') === c.id)
  })).filter((g) => g.items.length)

  return (
    <aside className={`sidebar ${p.collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-top drag">
        <span className="brand">Melcochat</span>
        <button className="icon-btn" title="Toggle sidebar (Ctrl/⌘ \)" onClick={p.onToggleCollapse}>
          <PanelLeft size={16} />
        </button>
      </div>

      <button className="search-pill" onClick={p.onPalette} title="Quick switcher">
        <Search size={14} />
        <span>Search</span>
        <kbd>{p.isMac ? '⌘K' : 'Ctrl K'}</kbd>
      </button>

      <nav className="groups">
        {groups.map((g) => (
          <section key={g.id}>
            <button className={`group-title ${closed[g.id] ? 'closed' : ''}`} onClick={() => toggleGroup(g.id)}>
              <ChevronDown size={12} />
              <span>{g.label}</span>
            </button>
            {!closed[g.id] &&
              g.items.map((a) => {
                const s = p.statuses[a.id]
                const multi = (perService.get(a.serviceId) ?? 0) > 1
                const sub = a.label ? serviceName(a) : a.hibernated ? 'Hibernated' : ''
                const badge = s?.unread ? (
                  <span className="count">{s.unread > 99 ? '99+' : s.unread}</span>
                ) : s?.indirect ? (
                  <span className="count dot" />
                ) : null
                return (
                  <button
                    key={a.id}
                    className={`item ${a.id === p.activeId ? 'active' : ''} ${a.hibernated ? 'hibernated' : ''} ${drag?.over === a.id ? 'drop-target' : ''}`}
                    title={`${displayName(a)}${a.label ? ` — ${serviceName(a)}` : ''}`}
                    onClick={() => p.onSelect(a.id)}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      p.onMenu(a)
                    }}
                    draggable
                    onDragStart={() => setDrag({ id: a.id })}
                    onDragOver={(e) => {
                      e.preventDefault()
                      if (drag && drag.over !== a.id) setDrag({ ...drag, over: a.id })
                    }}
                    onDragEnd={() => setDrag(null)}
                    onDrop={() => {
                      if (drag && drag.id !== a.id) p.onReorder(drag.id, a.id)
                      setDrag(null)
                    }}
                  >
                    <span className="tile-wrap">
                      <Tile name={serviceName(a)} color={getService(a.serviceId)?.color ?? a.color} favicon={s?.favicon ?? a.favicon} />
                      {multi && <span className="acct-dot" style={{ background: a.color }} />}
                      <span className="corner">{badge}</span>
                    </span>
                    <span className="meta">
                      <div className="name">{displayName(a)}</div>
                      {sub && <div className="sub">{sub}</div>}
                    </span>
                    {badge}
                  </button>
                )
              })}
          </section>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <button className="add" onClick={p.onAdd} title="Add account (Ctrl/⌘ T)">
          <Plus size={16} />
          <span>Add</span>
        </button>
        <button className={`icon-btn ${p.dnd ? 'on' : ''}`} title={p.dnd ? 'Do Not Disturb is on' : 'Do Not Disturb'} onClick={p.onToggleDnd}>
          <Moon size={16} fill={p.dnd ? 'currentColor' : 'none'} />
        </button>
        <button className="icon-btn" title="Settings (Ctrl/⌘ ,)" onClick={p.onSettings}>
          <Settings size={16} />
        </button>
      </div>
    </aside>
  )
}
