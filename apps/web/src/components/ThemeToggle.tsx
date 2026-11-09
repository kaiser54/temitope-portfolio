import { useEffect, useState } from 'react'
import { RollingText } from './RollingText'

type Theme = 'light' | 'dark' | 'system'

const ORDER: Theme[] = ['light', 'dark', 'system']
const LABEL: Record<Theme, string> = { light: 'Light', dark: 'Dark', system: 'System' }
const COLOR = { light: '#f9f9f9', dark: '#090909' }
const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)')

function readTheme(): Theme {
  try {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark' || saved === 'system') return saved
  } catch {
    // storage unavailable
  }
  return 'light'
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  const dark = theme === 'dark' || (theme === 'system' && darkQuery().matches)
  // Suspend colour transitions for a frame so the whole page (button included) switches in one go.
  root.classList.add('theme-switching')
  if (dark) root.dataset.theme = 'dark'
  else delete root.dataset.theme
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute('content', dark ? COLOR.dark : COLOR.light)
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('theme-switching')))
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(readTheme)

  // Follow the OS while on "system".
  useEffect(() => {
    if (theme !== 'system') return
    const mq = darkQuery()
    const onChange = () => applyTheme('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length]

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={`Theme: ${LABEL[theme]}. Switch to ${LABEL[next]}`}
      onClick={() => {
        applyTheme(next)
        try {
          localStorage.setItem('theme', next)
        } catch {
          // theme still applies for this visit
        }
        setTheme(next)
      }}
    >
      <RollingText text={LABEL[theme]} />
    </button>
  )
}
