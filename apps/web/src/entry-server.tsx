/** Build-time entry: renders a route to HTML for scripts/prerender.ts. Not shipped to the browser. */
import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { App } from './App'
import { setServerPath } from './router'

export function render(path: string): string {
  setServerPath(path)
  return renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
