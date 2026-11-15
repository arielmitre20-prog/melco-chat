import { X } from 'lucide-react'
import type { Settings, ThemePref } from '../../../shared/types'
import { Sheet, Switch } from './Tile'

export function SettingsSheet({
  settings,
  version,
  onChange,
  onClose
}: {
  settings: Settings
  version: string
  onChange: (s: Settings) => void
  onClose: () => void
}) {
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => onChange({ ...settings, [k]: v })
  const toggle = (k: keyof Settings, label: string, hint?: string) => (
    <div className="row">
      <span className="label">
        {label}
        {hint && <div className="hint">{hint}</div>}
      </span>
      <Switch label={label} on={settings[k] as boolean} onChange={(v) => set(k, v as never)} />
    </div>
  )

  return (
    <Sheet
      narrow
      title="Settings"
      onClose={onClose}
      head={
        <div className="sheet-head">
          <h3>Settings</h3>
          <button className="icon-btn" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>
      }
    >
      <div className="group-label">Appearance</div>
      <div className="group">
        <div className="row">
          <span className="label">Theme</span>
          <div className="segmented">
            {(['system', 'light', 'dark'] as ThemePref[]).map((t) => (
              <button key={t} className={settings.theme === t ? 'on' : ''} onClick={() => set('theme', t)}>
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
        {toggle('sidebarCollapsed', 'Compact sidebar', 'Icons only')}
      </div>

      <div className="group-label">Notifications</div>
      <div className="group">
        {toggle('doNotDisturb', 'Do Not Disturb', 'Silences notifications and audio from every account')}
        {toggle('showUnreadInDock', 'Unread badge on app icon')}
      </div>

      <div className="group-label">Startup & window</div>
      <div className="group">
        {toggle('launchAtLogin', 'Open at login')}
        {toggle('startMinimized', 'Start hidden in tray')}
        {toggle('closeToTray', 'Keep running when window is closed')}
      </div>

      <div className="group-label">Performance</div>
      <div className="group">
        <div className="row">
          <span className="label">
            Hibernate idle accounts
            <div className="hint">Frees memory; hibernated accounts don't receive notifications</div>
          </span>
          <select className="field" value={settings.autoHibernateMinutes} onChange={(e) => set('autoHibernateMinutes', Number(e.target.value))}>
            <option value={0}>Never</option>
            <option value={15}>After 15 min</option>
            <option value={30}>After 30 min</option>
            <option value={60}>After 1 hour</option>
            <option value={240}>After 4 hours</option>
          </select>
        </div>
        {toggle('spellcheck', 'Spell checking')}
      </div>

      <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 11 }}>Melcochat {version} · GPL-3.0</div>
    </Sheet>
  )
}
