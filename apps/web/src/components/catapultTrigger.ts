/**
 * The avatar's entry into the catapult (./catapult.ts), which is only fetched when it's about to be used:
 * on hover (desktop) or on the first press (touch). A press that ends before the code arrives still
 * counts as a (gentle) drop.
 */
import type { PointerEvent } from 'react'
import { prefersReducedMotion } from '../motion'

let loading: Promise<typeof import('./catapult')> | null = null
export const preloadCatapult = () => (loading ??= import('./catapult'))

export function startCatapult(e: PointerEvent<HTMLElement>, img: HTMLImageElement | null) {
  if (!img || e.button !== 0 || prefersReducedMotion()) return
  e.preventDefault() // no native image drag, no text selection
  const { clientX, clientY } = e
  let releasedEarly = false
  const early = () => (releasedEarly = true)
  window.addEventListener('pointerup', early, { once: true })
  preloadCatapult().then((m) => {
    window.removeEventListener('pointerup', early)
    m.grabAvatar(img, clientX, clientY)
    if (releasedEarly) window.dispatchEvent(new PointerEvent('pointerup'))
  })
}

/** Drop the avatar without a gesture (the hint bubble's button). */
export function dropCatapult(img: HTMLImageElement | null) {
  if (!img || prefersReducedMotion()) return
  void preloadCatapult().then((m) => m.dropAvatar(img))
}
