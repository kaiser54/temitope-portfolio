import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'
import { normalizeInitialUrl } from './router'

const changed = normalizeInitialUrl()
const root = document.getElementById('root')!
const app = (
  <StrictMode>
    <App />
  </StrictMode>
)

// Pages ship prerendered HTML (scripts/prerender.ts): attach to it. If an old link was rewritten to a
// different route, that HTML is for the wrong page, so render fresh instead.
if (root.hasChildNodes() && !changed) hydrateRoot(root, app)
else {
  root.textContent = ''
  createRoot(root).render(app)
}
