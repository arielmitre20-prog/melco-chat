import { app } from 'electron'
import { readFileSync, renameSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { DEFAULT_SETTINGS, type AppState } from '../shared/types'

const file = (name: string) => join(app.getPath('userData'), name)

function readJson<T>(name: string): T | undefined {
  try {
    return JSON.parse(readFileSync(file(name), 'utf8')) as T
  } catch {
    return undefined
  }
}

/** Atomic write: never leaves a half-written config behind on crash. */
function writeJson(name: string, data: unknown): void {
  mkdirSync(app.getPath('userData'), { recursive: true })
  const tmp = file(`${name}.tmp`)
  writeFileSync(tmp, JSON.stringify(data, null, 2))
  renameSync(tmp, file(name))
}

export function loadState(): AppState {
  const s = readJson<Partial<AppState>>('state.json')
  return {
    version: 1,
    accounts: Array.isArray(s?.accounts) ? s.accounts : [],
    activeId: s?.activeId ?? null,
    settings: { ...DEFAULT_SETTINGS, ...(s?.settings ?? {}) }
  }
}

export const saveState = (state: AppState) => writeJson('state.json', state)

export interface WindowState {
  x?: number
  y?: number
  width: number
  height: number
  maximized: boolean
}

export const loadWindowState = (): WindowState =>
  readJson<WindowState>('window.json') ?? { width: 1280, height: 820, maximized: false }

export const saveWindowState = (w: WindowState) => writeJson('window.json', w)
