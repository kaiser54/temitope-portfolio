import { AnimatePresence, m } from 'motion/react'
import { useEffect, useState } from 'react'
import { prefersReducedMotion } from '../motion'

const SEEN = 'avatar-hint-seen'

/** Filled pointing hand, drawn for this hint (16×16). */
function TapHand() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
      <path
        fill="currentColor"
        d="M6.75 1.5c.69 0 1.25.56 1.25 1.25V7h.25V6.25a1.25 1.25 0 0 1 2.5 0V7h.1a1.2 1.2 0 0 1 2.4.25V8a1.13 1.13 0 0 1 2.25.25V11a4.5 4.5 0 0 1-4.5 4.5H9.2a4.5 4.5 0 0 1-3.6-1.8L3.1 10.4a1.3 1.3 0 0 1 2-1.6l.4.5V2.75c0-.69.56-1.25 1.25-1.25Z"
      />
    </svg>
  )
}

/**
 * "Tap to drop": a callout beside the avatar pointing at it, hinting at the catapult (components/catapult.ts).
 * Client-only (never in the prerendered HTML), shown until the avatar is first used, then remembered. `show` lets the parent hide it the moment the avatar is pressed.
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
          <m.button
            type="button"
            className="avatar-hint-callout"
            style={{ originX: 0, originY: 0.5 }}
            initial={{ opacity: 0, x: -6, scale: 0.94 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -4, scale: 0.96, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', visualDuration: 0.35, bounce: 0.3 }}
            onPointerDown={(e) => e.stopPropagation()} // don't start a drag on the avatar underneath
            onClick={onDrop}
          >
            <svg className="avatar-hint-tail" width="6" height="12" viewBox="0 0 6 12" aria-hidden>
              <path d="M6 0v12L1.06 7.06a1.5 1.5 0 0 1 0-2.12Z" fill="currentColor" />
            </svg>
            <m.span
              aria-hidden
              className="avatar-hint-hand"
              animate={{ scale: [1, 0.8, 1], y: [0, 1.5, 0] }}
              transition={{ duration: 0.5, times: [0, 0.35, 1], repeat: Infinity, repeatDelay: 1.9, delay: 0.8 }}
            >
              <TapHand />
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
