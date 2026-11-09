import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type Ref } from 'react'

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

type WordItem = { id: number; theme: Theme; enter: boolean }

/** One word, split into letters. Letters use CSS transitions so rapid clicks retarget instead of restarting. */
function Word({ text, out, enter, ref }: { text: string; out: boolean; enter: boolean; ref?: Ref<HTMLSpanElement> }) {
  return (
    <span ref={ref} aria-hidden className="roll-word" data-out={out || undefined} data-enter={enter || undefined}>
      {[...text].map((ch, i) => (
        <span key={i} className="roll-letter" style={{ '--i': i } as CSSProperties}>
          {ch}
        </span>
      ))}
    </span>
  )
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(readTheme)
  const [words, setWords] = useState<WordItem[]>(() => [{ id: 0, theme: readTheme(), enter: false }])
  const currentId = useRef(0)
  const current = useRef<HTMLSpanElement>(null)
  const [width, setWidth] = useState<number>()

  // Measure the incoming word so the container's width can ease to it.
  useLayoutEffect(() => {
    setWidth(current.current?.offsetWidth)
  }, [theme])

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
        const id = ++currentId.current
        setTheme(next)
        setWords((ws) => [...ws, { id, theme: next, enter: true }])
        // Drop words that have finished leaving.
        window.setTimeout(() => setWords((ws) => ws.filter((w) => w.id >= currentId.current)), 400)
      }}
    >
      <span className="roll" style={{ width }}>
        {words.map((w) => {
          const isCurrent = w.id === currentId.current
          return (
            <Word
              key={w.id}
              ref={isCurrent ? current : undefined}
              text={LABEL[w.theme]}
              out={!isCurrent}
              enter={w.enter}
            />
          )
        })}
      </span>
    </button>
  )
}
