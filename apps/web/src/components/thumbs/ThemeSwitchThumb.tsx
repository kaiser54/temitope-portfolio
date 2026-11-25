import { useEffect, useState } from 'react'
// Straight from the kit's files, not its index, so this chunk carries only the stage and the window
import type { Act } from '../../stageshow/kit/act'
import { Stage } from '../../stageshow/kit/stage'
import { Bar, Window } from '../../stageshow/kit/window'
import { RollingText } from '../RollingText'
import './theme-switch-thumb.css'

/**
 * Note card thumbnail for "Rolling a Theme Switcher, Letter by Letter" (a stageshow close-up).
 *
 * This site's footer at 1.3x in a quiet browser window, running off the bottom. The cursor clicks the
 * switch: the letters roll Light → Dark → System → Light with the real RollingText, and the page's
 * colours change in the same frame as the click, as the note describes. Three clicks bring it back to
 * where it began, so the loop's reset is the story's own last beat.
 *
 * Real strings: the address, the footer's name and the switch's word. Everything else is filler.
 * Dark is the poster: the frame that shows a click changed the page.
 */

const WORDS = ['Light', 'Dark', 'System'] as const
type S = { i: number }

const initial: S = { i: 0 }
const poster: S = { i: 1 }

/** Where the cursor waits, before the first click and between clicks: the empty footer between the name
 *  and the switch, on the switch's own line. Measured on the footer row, whose width never changes, so it
 *  doesn't drift as the word does. It starts here too, so the loop's last frame is its first. */
const REST = { at: 'footer', x: 0.71, y: 0.72 }

async function script(a: Act<S>) {
  await a.wait(1000)
  for (const next of [1, 2, 0]) {
    if (next === 1) a.mark('click')
    // the tip just under the word's right end, so the word stays readable as it rolls
    await a.click({ at: 'switch', x: 0.82, y: 1.05 })
    a.set({ i: next })
    await a.wait(450)
    await a.move(REST)
    await a.wait(next === 0 ? 1100 : 1700)
  }
}

/** The site's own theme, so the browser chrome matches the card it sits on (the page inside keeps its story). */
function useSiteDark() {
  const read = () => document.documentElement.dataset.theme === 'dark'
  const [dark, setDark] = useState(read)
  useEffect(() => {
    const mo = new MutationObserver(() => setDark(read()))
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => mo.disconnect()
  }, [])
  return dark
}

export default function ThemeSwitchThumb() {
  const siteDark = useSiteDark()
  return (
    <Stage
      theme={siteDark ? 'dark' : 'light'}
      width={552}
      height={220}
      compact={{ below: 500, width: 342, height: 200 }}
      initial={initial}
      poster={poster}
      script={script}
      play="loop"
      cursor={{ at: REST, style: 'large' }}
      className="tst"
    >
      {(s, _rect, layout) => {
        const dark = s.i === 1
        return (
          <div className="tst-zoom">
            <Window url="temitopeagboola.com" urlShape="pill" className="tst-win" style={{ width: layout === 'compact' ? 270 : 388 }}>
              <div className="tst-page" data-dark={dark || undefined}>
                <div className="tst-card">
                  <Bar w={layout === 'compact' ? 120 : 168} h={6} r={3} style={{ background: 'var(--p-bar-strong)' }} />
                  <Bar w={layout === 'compact' ? 170 : 236} h={5} r={2.5} style={{ background: 'var(--p-bar)' }} />
                </div>
                <div className="tst-footer" data-target="footer">
                  <span className="tst-name">© 2026 Temitope Agboola</span>
                  <span className="tst-switch" data-target="switch" data-cursor="pointer">
                    <RollingText text={WORDS[s.i]} />
                  </span>
                </div>
              </div>
            </Window>
          </div>
        )
      }}
    </Stage>
  )
}
