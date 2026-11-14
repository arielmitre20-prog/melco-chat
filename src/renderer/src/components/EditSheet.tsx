import { useState } from 'react'
import type { Account } from '../../../shared/types'
import { ACCOUNT_COLORS, serviceName } from '../util'
import { Sheet, Switch } from './Tile'

export function EditSheet({ account, onSave, onClose }: { account: Account; onSave: (a: Account) => void; onClose: () => void }) {
  const [a, setA] = useState(account)
  const set = <K extends keyof Account>(k: K, v: Account[K]) => setA((prev) => ({ ...prev, [k]: v }))
  const urlValid = /^https?:\/\/\S+$/i.test(a.url)

  return (
    <Sheet
      narrow
      title={`Edit ${serviceName(account)} account`}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" disabled={!urlValid} onClick={() => onSave({ ...a, label: a.label.trim(), proxy: a.proxy?.trim() || undefined })}>
            Save
          </button>
        </>
      }
    >
      <div className="stack">
        <label htmlFor="e-label">Label</label>
        <input id="e-label" className="field" autoFocus value={a.label} placeholder={serviceName(account)} onChange={(e) => set('label', e.target.value)} />
      </div>
      <div className="stack">
        <label htmlFor="e-url">Start URL</label>
        <input id="e-url" className="field" value={a.url} onChange={(e) => set('url', e.target.value)} />
      </div>
      <div className="stack">
        <label>Color</label>
        <div className="swatches">
          {ACCOUNT_COLORS.map((c) => (
            <button key={c} className={`swatch ${c === a.color ? 'on' : ''}`} style={{ background: c }} onClick={() => set('color', c)} aria-label={c} />
          ))}
        </div>
      </div>
      <div className="stack">
        <label htmlFor="e-proxy">Proxy (optional)</label>
        <input id="e-proxy" className="field" placeholder="socks5://127.0.0.1:1080 or http://host:8080" value={a.proxy ?? ''} onChange={(e) => set('proxy', e.target.value)} />
      </div>
      <div className="group">
        <div className="row">
          <span className="label">Show notifications</span>
          <Switch label="Show notifications" on={a.notifications} onChange={(v) => set('notifications', v)} />
        </div>
        <div className="row">
          <span className="label">Mute audio</span>
          <Switch label="Mute audio" on={a.muted} onChange={(v) => set('muted', v)} />
        </div>
        <div className="row">
          <span className="label">
            Zoom
            <div className="hint">Ctrl/⌘ + and − also work inside the app</div>
          </span>
          <select className="field" value={a.zoom ?? 1} onChange={(e) => set('zoom', Number(e.target.value))}>
            {[0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5].map((z) => (
              <option key={z} value={z}>
                {Math.round(z * 100)}%
              </option>
            ))}
          </select>
        </div>
      </div>
    </Sheet>
  )
}
