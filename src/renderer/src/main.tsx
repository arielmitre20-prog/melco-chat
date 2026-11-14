import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles.css'

void window.hamsket.load().then((boot) => {
  const root = document.documentElement
  root.dataset.platform = boot.platform
  root.dataset.material = boot.material
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App boot={boot} />
    </StrictMode>
  )
})
