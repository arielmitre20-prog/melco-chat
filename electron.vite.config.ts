import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    build: { outDir: 'out/main', rollupOptions: { input: resolve(__dirname, 'src/main/index.ts') } }
  },
  preload: {
    build: {
      outDir: 'out/preload',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts'),
          service: resolve(__dirname, 'src/preload/service.ts')
        },
        // Sandboxed preloads must be a single CommonJS file.
        output: { format: 'cjs', entryFileNames: '[name].js' }
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    build: { outDir: 'out/renderer', rollupOptions: { input: resolve(__dirname, 'src/renderer/index.html') } },
    plugins: [react()]
  }
})
