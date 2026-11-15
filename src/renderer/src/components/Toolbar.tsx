import { Bell, BellOff, ChevronLeft, ChevronRight, Ellipsis, House, RotateCw, Volume2, VolumeX } from 'lucide-react'
import type { Account, ViewStatus } from '../../../shared/types'
import { displayName, hostOf, serviceName } from '../util'

interface Props {
  account?: Account
  status?: ViewStatus
  onAction: (a: 'back' | 'forward' | 'reload' | 'home') => void
  onToggleMute: () => void
  onToggleNotifications: () => void
  onMenu: () => void
}

export function Toolbar({ account, status, onAction, onToggleMute, onToggleNotifications, onMenu }: Props) {
  const disabled = !account || account.hibernated
  return (
    <header className="toolbar drag">
      <button className="icon-btn" title="Back" disabled={disabled || !status?.canGoBack} onClick={() => onAction('back')}>
        <ChevronLeft size={18} />
      </button>
      <button className="icon-btn" title="Forward" disabled={disabled || !status?.canGoForward} onClick={() => onAction('forward')}>
        <ChevronRight size={18} />
      </button>
      <button className="icon-btn" title="Reload" disabled={disabled} onClick={() => onAction('reload')}>
        <RotateCw size={15} className={status?.loading ? 'spin' : ''} />
      </button>
      <button className="icon-btn" title="Go to start page" disabled={disabled} onClick={() => onAction('home')}>
        <House size={15} />
      </button>

      <div className="title">
        {account && (
          <>
            <strong>{displayName(account)}</strong>
            <span className="host">
              {account.label ? `${serviceName(account)} · ` : ''}
              {hostOf(status?.url || account.url)}
            </span>
          </>
        )}
      </div>

      {account && (
        <>
          <button
            className="icon-btn"
            title={account.notifications ? 'Notifications on' : 'Notifications off'}
            onClick={onToggleNotifications}
          >
            {account.notifications ? <Bell size={15} /> : <BellOff size={15} />}
          </button>
          <button className="icon-btn" title={account.muted ? 'Audio muted' : 'Audio on'} onClick={onToggleMute}>
            {account.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <button className="icon-btn" title="Account options" onClick={onMenu}>
            <Ellipsis size={16} />
          </button>
        </>
      )}
    </header>
  )
}
