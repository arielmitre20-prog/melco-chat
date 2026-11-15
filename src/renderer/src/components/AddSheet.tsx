import { useMemo, useState } from 'react'
import { ChevronLeft, Search, X } from 'lucide-react'
import { CATALOG, CATEGORIES, resolveUrl } from '../../../shared/catalog'
import type { Account, CatalogService, Category } from '../../../shared/types'
import { ACCOUNT_COLORS } from '../util'
import { Sheet, Tile } from './Tile'

interface Props {
  accounts: Account[]
  initialServiceId?: string
  onAdd: (service: CatalogService, label: string, url: string, color: string) => void
  onClose: () => void
}

export function AddSheet({ accounts, initialServiceId, onAdd, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<Category | 'all'>('ai')
  const [picked, setPicked] = useState<CatalogService | undefined>(() => CATALOG.find((s) => s.id === initialServiceId))

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return CATALOG.filter((s) =>
      q ? `${s.name} ${s.description ?? ''} ${s.id}`.toLowerCase().includes(q) : cat === 'all' || s.category === cat
    )
  }, [query, cat])

  const head = (
    <div className="sheet-head">
      {picked && !initialServiceId && (
        <button className="icon-btn" onClick={() => setPicked(undefined)} title="Back">
          <ChevronLeft size={18} />
        </button>
      )}
      <h3>{picked ? `Add ${picked.name}` : 'Add an account'}</h3>
      <button className="icon-btn" onClick={onClose} title="Close">
        <X size={16} />
      </button>
    </div>
  )

  if (picked) return <Configure service={picked} accounts={accounts} head={head} onAdd={onAdd} onClose={onClose} />

  return (
    <Sheet title="Add an account" onClose={onClose} head={head}>
      <div className="search-field">
        <Search size={14} />
        <input autoFocus placeholder="Search apps and AI chats" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {!query && (
        <div className="segmented" style={{ marginTop: 12 }}>
          {[...CATEGORIES, { id: 'all' as const, label: 'All' }].map((c) => (
            <button key={c.id} className={cat === c.id ? 'on' : ''} onClick={() => setCat(c.id)}>
              {c.label}
            </button>
          ))}
        </div>
      )}
      <div className="svc-grid">
        {list.map((s) => {
          const n = accounts.filter((a) => a.serviceId === s.id).length
          return (
            <button key={s.id} className="svc" onClick={() => setPicked(s)}>
              <Tile name={s.name} color={s.color} />
              <span className="meta">
                <div className="name">{s.name}</div>
                <div className="sub">{n ? `${n} account${n > 1 ? 's' : ''} added` : (s.description ?? hostLabel(s))}</div>
              </span>
            </button>
          )
        })}
        {!list.length && <p style={{ color: 'var(--text-2)' }}>No match. Use “Custom web app” to add any URL.</p>}
      </div>
    </Sheet>
  )
}

const hostLabel = (s: CatalogService) => (s.template ? 'Self-hosted / workspace' : s.url.replace(/^https?:\/\//, '').split('/')[0])

function Configure({
  service,
  accounts,
  head,
  onAdd,
  onClose
}: {
  service: CatalogService
  accounts: Account[]
  head: React.ReactNode
  onAdd: Props['onAdd']
  onClose: () => void
}) {
  const existing = accounts.filter((a) => a.serviceId === service.id).length
  const [label, setLabel] = useState(existing ? `Account ${existing + 1}` : '')
  const [tpl, setTpl] = useState('')
  const [color, setColor] = useState(ACCOUNT_COLORS[existing % ACCOUNT_COLORS.length])
  const valid = !service.template || tpl.trim().length > 0

  const submit = () => valid && onAdd(service, label.trim(), resolveUrl(service, tpl), color)

  return (
    <Sheet
      narrow
      title={`Add ${service.name}`}
      onClose={onClose}
      head={head}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" disabled={!valid} onClick={submit}>
            Add Account
          </button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <div className="pick-head">
          <Tile name={service.name} color={service.color} size="lg" />
          <div>
            <div className="name">{service.name}</div>
            <div style={{ color: 'var(--text-2)', fontSize: 12 }}>{service.description ?? hostLabel(service)}</div>
          </div>
        </div>

        {service.template && (
          <div className="stack">
            <label htmlFor="tpl">{service.template.label}</label>
            <input id="tpl" className="field" autoFocus placeholder={service.template.placeholder} value={tpl} onChange={(e) => setTpl(e.target.value)} />
          </div>
        )}

        <div className="stack">
          <label htmlFor="label">Account label</label>
          <input
            id="label"
            className="field"
            autoFocus={!service.template}
            placeholder="e.g. Work, Personal, alex@company.com"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>

        <div className="stack">
          <label>Color</label>
          <div className="swatches">
            {ACCOUNT_COLORS.map((c) => (
              <button type="button" key={c} className={`swatch ${c === color ? 'on' : ''}`} style={{ background: c }} onClick={() => setColor(c)} aria-label={c} />
            ))}
          </div>
        </div>

        <div className="note">
          Every account runs in its own isolated session — separate cookies, storage and login. Add as many {service.name} accounts as you
          like and use them side by side.
        </div>
        {service.note && <div className="note">{service.note}</div>}
        <button type="submit" hidden />
      </form>
    </Sheet>
  )
}
