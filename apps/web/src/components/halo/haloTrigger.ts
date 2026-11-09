/**
 * Entry to the halo (./halo.ts), fetched only when it's about to be used: when the pointer enters the Work
 * list, or on the first click there.
 */
import type { MouseEvent } from 'react'

/**
 * Whether opening a project (a click on its row) bends the card with the shockwave. Off: the halo still runs
 * with the card as it opens (rings, glints, edge light), just without the bend; the full shockwave is for
 * clicks inside an open card. Set to true to have it bend the card as it opens too. Closing is always quiet.
 */
export const SHOCKWAVE_ON_OPEN_CLOSE = false

let loading: Promise<typeof import('./halo')> | null = null
export const preloadHalo = () => (loading ??= import('./halo'))

const idle = (cb: () => void) => (window.requestIdleCallback ?? ((f: () => void) => window.setTimeout(f, 50)))(cb)

/** Pointer on a project: snapshot it while idle, so a click on it starts without a hitch. */
export function readyHalo(item: HTMLElement) {
  void preloadHalo().then((m) => idle(() => m.prepareHalo(item)))
}

/** Fetch the halo and set up WebGL while idle, so the first click only has to draw. */
export function warmUpHalo(list: HTMLElement | null) {
  if (!list) return
  void preloadHalo().then((m) => idle(() => m.warmHalo(list)))
}

/**
 * A click on a project card (the row, or anywhere in its open details): the halo starts straight away.
 * A click on the row opens the card (halo in step with it, see halo.ts; it only bends the card when
 * SHOCKWAVE_ON_OPEN_CLOSE is on) or closes it (nothing).
 */
export function haloFromClick(e: MouseEvent<HTMLElement>, list: HTMLElement | null) {
  const item = e.currentTarget // the clicked project: the halo stays on its card
  if (!list) return
  const box = item.getBoundingClientRect()
  // keyboard "clicks" have no position: start from the middle of the row
  const x = e.detail === 0 ? box.left + box.width / 2 : e.clientX
  const y = e.detail === 0 ? box.top + 22 : e.clientY
  const onRow = !!(e.target as Element).closest('.ui-accordion-trigger')
  // Base UI updates the card after this handler, so data-open is still the state before the click:
  // open now means this click closes it, and closing gets neither halo nor shockwave.
  if (onRow && item.hasAttribute('data-open')) return
  const shockwave = !onRow || SHOCKWAVE_ON_OPEN_CLOSE
  void preloadHalo().then((m) => m.triggerHalo(list, item, x, y, onRow, shockwave))
}
