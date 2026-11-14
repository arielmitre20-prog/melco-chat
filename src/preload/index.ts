import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { Account, AccountAction, AppState, Boot, Bounds, Command, ViewAction, ViewStatus } from '../shared/types'

const on = <T extends unknown[]>(channel: string, fn: (...args: T) => void) => {
  const listener = (_e: IpcRendererEvent, ...args: unknown[]) => fn(...(args as T))
  ipcRenderer.on(channel, listener)
  return () => {
    ipcRenderer.removeListener(channel, listener)
  }
}

const api = {
  load: (): Promise<Boot> => ipcRenderer.invoke('state:load'),
  save: (s: AppState) => ipcRenderer.send('state:save', s),
  syncViews: (accounts: Account[], activeId: string | null, bounds: Bounds, overlay: boolean) =>
    ipcRenderer.send('views:sync', accounts, activeId, bounds, overlay),
  viewAction: (id: string, action: ViewAction) => ipcRenderer.send('view:action', id, action),
  accountMenu: (a: Account): Promise<AccountAction | null> => ipcRenderer.invoke('account:menu', a),
  devtools: (id: string) => ipcRenderer.invoke('account:devtools', id),
  clearAccount: (a: Account) => ipcRenderer.invoke('account:clear', a),
  removeAccount: (a: Account) => ipcRenderer.invoke('account:remove', a),
  confirm: (message: string, detail: string, confirmLabel: string): Promise<boolean> =>
    ipcRenderer.invoke('dialog:confirm', message, detail, confirmLabel),
  setBadge: (count: number, indirect: boolean, dataUrl: string | null) => ipcRenderer.send('app:badge', count, indirect, dataUrl),
  openExternal: (url: string) => ipcRenderer.send('open-external', url),
  onStatus: (fn: (s: ViewStatus) => void) => on('view:status', fn),
  onCommand: (fn: (c: Command) => void) => on('command', fn),
  onHibernated: (fn: (ids: string[]) => void) => on('accounts:hibernated', fn)
}

export type HamsketApi = typeof api

contextBridge.exposeInMainWorld('hamsket', api)
