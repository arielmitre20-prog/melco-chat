/// <reference types="vite/client" />
import type { MelcochatApi } from '../../preload/index'

declare global {
  interface Window {
    melcochat: MelcochatApi
  }
}
