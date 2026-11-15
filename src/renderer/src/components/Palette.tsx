import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { CATALOG, getService } from '../../../shared/catalog'
import type { Account, CatalogService, ViewStatus } from '../../../shared/types'
import { displayName, serviceName } from '../util'
import { Tile } from './Tile'

type Row = { kind: 'account'; account: Account; index: number } | { kind: 'add'; service: CatalogService }

export function Palette({
  accounts,
  statuses,
  isMac,
  onPick,
  onAddService,
  onClose
}: {
  accounts: Account[]
  statuses: Record<string, ViewStatus>
  isMac: boolean
  onPick: (id: string) => void
  onAddService: (serviceId: string) => void
  onClose: () => void
}) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const rows = useMemo<Row[]>(() => {
    const query = q.trim().toLowerCase()
    const match = (s: string) => !query || s.toLowerCase().includes(query)
    const acc: Row[] = accounts
      .map((a, index) => ({ kind: 'account' as const, account: a, index }))
      .filter((r) => match(`${displayName(r.account)} ${serviceName(r.account)}`))
    const add: Row[] = query ? CATALOG.filter((s) => match(s.name)).slice(0, 6).map((s) => ({ kind: 'add' as const, service: s })) : []
    return [...acc, ...add]
  }, [q, accounts])

  useEffect(() => setSel(0), [q])
  useEffect(() => {
    listRef.current?.querySelector('.sel')?.scrollIntoView({ block: 'nearest' })
  }, [sel])

  const choose = (r?: Row) => {
    if (!r) return
    if (r.kind === 'account') onPick(r.account.id)
    else onAddService(r.service.id)
  }

  const firstAdd = rows.findIndex((r) => r.kind === 'add')

  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet narrow" role="dialog" aria-label="Quick switcher">
        <div style={{ padding: 10, borderBottom: '0.5px solid var(--line)' }}>
          <div className="search-field">
            <Search size={14} />
            <input
              autoFocus
              placeholder="Jump to an account or add an app…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') (e.preventDefault(), setSel((s) => Math.min(rows.length - 1, s + 1)))
                if (e.key === 'ArrowUp') (e.preventDefault(), setSel((s) => Math.max(0, s - 1)))
                if (e.key === 'Enter') choose(rows[sel])
                if (e.key === 'Escape') onClose()
              }}
            />
          </div>
        </div>
        <div className="palette-list" ref={listRef}>
          {rows.map((r, i) => (
            <div key={r.kind === 'account' ? r.account.id : `add-${r.service.id}`}>
              {i === firstAdd && <div className="palette-section">Add new</div>}
              <button className={`palette-item ${i === sel ? 'sel' : ''}`} onMouseEnter={() => setSel(i)} onClick={() => choose(r)}>
                {r.kind === 'account' ? (
                  <>
                    <Tile
                      name={serviceName(r.account)}
                      color={getService(r.account.serviceId)?.color ?? r.account.color}
                      favicon={statuses[r.account.id]?.favicon ?? r.account.favicon}
                    />
                    <span>
                      <div>{displayName(r.account)}</div>
                      {r.account.label && <div className="sub">{serviceName(r.account)}</div>}
                    </span>
                    {r.index < 9 && <kbd>{isMac ? `⌘${r.index + 1}` : `Ctrl ${r.index + 1}`}</kbd>}
                  </>
                ) : (
                  <>
                    <Tile name={r.service.name} color={r.service.color} />
                    <span>Add {r.service.name}</span>
                    <Plus size={14} style={{ marginLeft: 'auto' }} />
                  </>
                )}
              </button>
            </div>
          ))}
          {!rows.length && <div className="palette-section">Nothing found</div>}
        </div>
      </div>
    </div>
  )
}
