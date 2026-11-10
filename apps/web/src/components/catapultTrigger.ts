/**
 * The avatar's entry into the catapult (./catapult.ts), which is only fetched when it's about to be used:
 * on hover (desktop) or on the first press (touch).
 *
 * Press and hold to release it: a quick tap does nothing, and moving off before the hold completes cancels,
 * so stray taps and scroll swipes never knock it loose. While held the avatar sinks a little (the wrapper's
 * data-holding, see index.css); when the hold completes it pops free under the finger and the drag carries on.
 */
import type { PointerEvent } from 'react'
import { prefersReducedMotion } from '../motion'

/** How long to hold before the avatar comes free. */
export const HOLD_MS = 450
/** Moving further than this before then cancels the hold (it was a scroll or a slip). */
const SLOP = 10

let loading: Promise<typeof import('./catapult')> | null = null
export const preloadCatapult = () => (loading ??= import('./catapult'))

export function startCatapult(
  e: PointerEvent<HTMLElement>,
  img: HTMLImageElement | null,
  onRelease?: () => void,
) {
  if (!img || e.button !== 0 || prefersReducedMotion()) return
  e.preventDefault() // no native image drag, no text selection, no long-press menu
  const wrapper = e.currentTarget
  const pointerId = e.pointerId
  const start = { x: e.clientX, y: e.clientY }
  const last = { ...start }
  const mod = preloadCatapult()

  wrapper.dataset.holding = ''
  const done = () => {
    window.clearTimeout(timer)
    delete wrapper.dataset.holding
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', cancel)
    window.removeEventListener('pointercancel', cancel)
  }
  const move = (ev: globalThis.PointerEvent) => {
    if (ev.pointerId !== pointerId) return
    last.x = ev.clientX
    last.y = ev.clientY
    if (Math.hypot(last.x - start.x, last.y - start.y) > SLOP) done()
  }
  const cancel = (ev: globalThis.PointerEvent) => ev.pointerId === pointerId && done()
  const timer = window.setTimeout(() => {
    done()
    navigator.vibrate?.(12) // a small click where supported (Android)
    onRelease?.()
    // Still held: the catapult takes over the drag from here (its own window listeners).
    void mod.then((m) => m.grabAvatar(img, last.x, last.y))
  }, HOLD_MS)

  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', cancel)
  window.addEventListener('pointercancel', cancel)
}
