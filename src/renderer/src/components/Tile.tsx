import { useEffect, useState } from 'react'

/**
 * App tile: the site's own favicon once known, otherwise a monogram on the
 * brand color. No third-party logos are bundled.
 */
export function Tile({ name, color, favicon, size }: { name: string; color: string; favicon?: string; size?: 'lg' }) {
  const [broken, setBroken] = useState(false)
  useEffect(() => setBroken(false), [favicon])
  const showIcon = favicon && !broken
  return (
    <div className={`tile ${size ?? ''}`} style={showIcon ? undefined : { background: color }}>
      {showIcon ? (
        <img src={favicon} alt="" draggable={false} onError={() => setBroken(true)} />
      ) : (
        name.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 1).toUpperCase() || '•'
      )}
    </div>
  )
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button role="switch" aria-checked={on} aria-label={label} className={`switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)} />
}

export function Sheet({
  title,
  onClose,
  children,
  footer,
  narrow,
  head
}: {
  title?: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  narrow?: boolean
  head?: React.ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`sheet ${narrow ? 'narrow' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        {head ?? (
          <div className="sheet-head">
            <h3>{title}</h3>
          </div>
        )}
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>
  )
}
