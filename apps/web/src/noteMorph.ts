/**
 * Note card ⇄ note page, as one surface (View Transitions API).
 *
 * Opening: the clicked card's surface grows into a sheet the size of the page while its words fade out,
 * the title flies into the page's heading, and the page fades in underneath as the surface clears.
 * Closing runs the other way and puts the list back at the scroll it was left at, so the card lands
 * in its own slot.
 *
 * Names in play (the CSS is under "Note morph" in index.css):
 * - `note-card`:  the card ⇄ `.note-sheet`, an empty viewport-tall box behind the page's top
 * - `note-title`: the card's title ⇄ the page's <h1>
 * The page side carries its names in markup; the card side is named here, only on the card that moves,
 * because a name may belong to one element at a time.
 *
 * Without the API, or with reduced motion, the route simply changes.
 */
import { useState } from 'react'
import { prefersReducedMotion } from './motion'

let morphing = false
let listScroll = 0

/** True while a morph is swapping the DOM: pages mounting then skip their `.enter` entrance. */
export const isMorphing = () => morphing

/** `'enter'` normally, `''` when this component mounted inside a morph. Decided once, at mount. */
export function useEnterClass() {
  const [cls] = useState(() => (morphing ? '' : 'enter'))
  return cls
}

const cardFor = (slug: string) => document.querySelector<HTMLElement>(`[data-note-slug="${CSS.escape(slug)}"]`)

function nameCard(slug: string | undefined) {
  document.querySelectorAll<HTMLElement>('[data-note-slug]').forEach((el) => {
    const on = el.dataset.noteSlug === slug
    el.style.viewTransitionName = on ? 'note-card' : ''
    const title = el.querySelector<HTMLElement>('.note-card-title')
    if (title) title.style.viewTransitionName = on ? 'note-title' : ''
  })
}

type ViewTransitionDoc = Document & { startViewTransition?: (update: () => void) => { finished: Promise<void> } }

/**
 * Run `commit` (push the URL and render the new route synchronously) as a morph between the card for
 * `opening`/`closing` and its page.
 */
export function morphNote({ opening, closing, commit }: { opening?: string; closing?: string; commit: () => void }) {
  const slug = (opening ?? closing)!
  if (opening) listScroll = window.scrollY

  const swap = () => {
    commit()
    if (opening) window.scrollTo(0, 0)
    else {
      window.scrollTo(0, listScroll)
      const card = cardFor(slug)
      // the list may have changed height (filter, viewport): make sure the card is on screen to land in
      if (card) {
        const r = card.getBoundingClientRect()
        if (r.bottom < 0 || r.top > window.innerHeight) card.scrollIntoView({ block: 'center' })
      }
      nameCard(slug)
    }
  }

  const doc = document as ViewTransitionDoc
  if (!doc.startViewTransition || prefersReducedMotion()) {
    swap()
    return
  }

  nameCard(opening)
  const root = document.documentElement
  root.dataset.noteMorph = opening ? 'open' : 'close'
  morphing = true
  const vt = doc.startViewTransition(() => {
    swap()
    morphing = false
  })
  vt.finished.finally(() => {
    delete root.dataset.noteMorph
    nameCard(undefined)
  })
}
