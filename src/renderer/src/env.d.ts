/// <reference types="vite/client" />
import type { HamsketApi } from '../../preload/index'

declare global {
  interface Window {
    hamsket: HamsketApi
  }
}
