import { AnimatePresence, m } from 'motion/react'
import { Pointer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { prefersReducedMotion } from '../motion'

const SEEN = 'avatar-hint-seen'

/** Thought-bubble pop: each piece springs in after the last. */
const pop = (delay: number) => ({
  initial: { opacity: 0, scale: 0.4 },
  animate: { opacity: 1, scale: 1, transition: { type: 'spring' as const, visualDuration: 0.35, bounce: 0.45, delay } },
  exit: { opacity: 0, scale: 0.6, transition: { duration: 0.12 } },
})

/**
 * "Tap to drop" bubble beside the avatar, hinting at the catapult (components/catapult.ts).
 * Client-only (never in the prerendered HTML), shown until the avatar is first used, then remembered.
 * `show` lets the parent hide it the moment the avatar is pressed.
 */
export function AvatarHint({ show, onDrop }: { show: boolean; onDrop: () => void }) {
  const [eligible, setEligible] = useState(false)
  useEffect(() => {
    let seen = false
    try {
      seen = localStorage.getItem(SEEN) === '1'
    } catch {
      // storage unavailable: show it this visit
    }
    if (seen || prefersReducedMotion()) return
    const id = window.setTimeout(() => setEligible(true), 1400) // after the page has settled in
    return () => window.clearTimeout(id)
  }, [])

  return (
    <AnimatePresence>
      {eligible && show && (
        <span className="avatar-hint" key="hint">
          <m.span className="avatar-hint-dot" data-size="lg" {...pop(0)} />
          <m.span className="avatar-hint-dot" data-size="sm" {...pop(0.07)} />
          <m.button
            type="button"
            className="avatar-hint-pill"
            style={{ originX: 0, originY: 0.5 }}
            {...pop(0.14)}
            onPointerDown={(e) => e.stopPropagation()} // don't start a drag on the avatar underneath
            onClick={onDrop}
          >
            <m.span
              aria-hidden
              className="avatar-hint-hand"
              animate={{ scale: [1, 0.82, 1], y: [0, 1.5, 0] }}
              transition={{ duration: 0.5, times: [0, 0.35, 1], repeat: Infinity, repeatDelay: 1.8, delay: 1 }}
            >
              <Pointer size={14} strokeWidth={2.25} />
            </m.span>
            Tap to drop
          </m.button>
        </span>
      )}
    </AnimatePresence>
  )
}

/** Remember that the avatar has been played with, so the hint stays away next time. */
export function markAvatarHintSeen() {
  try {
    localStorage.setItem(SEEN, '1')
  } catch {
    // fine: it just shows again next visit
  }
}
