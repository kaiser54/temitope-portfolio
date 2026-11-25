import { AnimatePresence, m } from 'motion/react'
import { useState, type ReactNode } from 'react'
import { easeOutQuint, springs } from '../motion'

/**
 * Small icon buttons for note pages (Copy Prompt, Copy Link, View Source, code copy).
 *
 * - Press: the button springs down to 88% and bounces back (`springs.turn`).
 * - Copy: the icon shrinks and blurs out while a tick pops in on the same spring and draws its stroke.
 *   It swaps back after 1.6s.
 * MotionConfig's reducedMotion="user" drops the scale and keeps the fades.
 */

const PRESS = { scale: 0.88 }

const swap = {
  initial: { opacity: 0, scale: 0.4, filter: 'blur(3px)' },
  animate: { opacity: 1, scale: 1, filter: 'blur(0px)', transition: springs.turn },
  exit: { opacity: 0, scale: 0.4, filter: 'blur(3px)', transition: { duration: 0.12, ease: easeOutQuint } },
}

/** A tick whose stroke draws in as it pops. Same geometry as lucide's Check. */
function DrawnCheck({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <m.path
        d="M20 6 9 17l-5-5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.28, ease: easeOutQuint, delay: 0.06 }}
      />
    </svg>
  )
}

/** Swaps between two icons with a pop. `initial={false}` keeps the prerendered icon visible. */
export function IconSwap({ on, off, size }: { on: boolean; off: ReactNode; size: number }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <m.span key={on ? 'on' : 'off'} className="icon-swap" {...swap}>
        {on ? <DrawnCheck size={size} /> : off}
      </m.span>
    </AnimatePresence>
  )
}

/** Icon button that copies text: press spring, then the icon pops into a drawn tick. */
export function CopyIconButton({
  label,
  text,
  icon,
  size = 16,
}: {
  label: string
  text: () => string
  icon: ReactNode
  size?: number
}) {
  const [copied, setCopied] = useState(false)
  return (
    <m.button
      type="button"
      className="note-icon-btn"
      aria-label={copied ? 'Copied' : label}
      data-tip={copied ? 'Copied' : label}
      whileTap={PRESS}
      transition={springs.turn}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text())
          setCopied(true)
          setTimeout(() => setCopied(false), 1600)
        } catch {
          // clipboard blocked: nothing to confirm
        }
      }}
    >
      <IconSwap on={copied} off={icon} size={size} />
    </m.button>
  )
}

/** Icon link with the same press spring. */
export function IconLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <m.a
      className="note-icon-btn"
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      data-tip={label}
      whileTap={PRESS}
      transition={springs.turn}
    >
      {children}
    </m.a>
  )
}
