/**
 * Motion setup shared by the whole site.
 *
 * - `MotionProvider`: LazyMotion (strict, so only the light `m` components are used) with the
 *   animation features fetched after first paint, plus MotionConfig so components respect
 *   prefers-reduced-motion.
 * - Spring tokens: every spring on the site, in one place. The hand-written springs this replaced
 *   were `{ k, c }` with mass 1, which map 1:1 onto Motion's stiffness / damping.
 * - `prefersReducedMotion()`: imperative animations (animate on a motion value) don't read
 *   MotionConfig, so gesture code checks this directly.
 */
import { LazyMotion, MotionConfig, type Transition } from 'motion/react'
import { useEffect, type ReactNode } from 'react'
import { loadAnimate } from './animate'

const loadFeatures = () => import('./motion-features').then((m) => m.default)

export function MotionProvider({ children }: { children: ReactNode }) {
  // Fetch the animation engine once the page is idle, so gestures never wait on it.
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200))
    idle(() => void loadAnimate())
  }, [])
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  )
}

const spring = (stiffness: number, damping: number): Transition => ({ type: 'spring', stiffness, damping, mass: 1 })

export const springs = {
  /** Tab underline: tracks the pointer, barely any overshoot */
  follow: spring(900, 54),
  /** Tab underline / swipe: let go, so it overshoots and wobbles ("dangle") */
  release: spring(420, 15),
  /** Tab underline switching tabs: front edge */
  lead: spring(520, 34),
  /** Tab underline switching tabs: back edge lags, so it stretches */
  trail: spring(240, 25),
  /** Footer string: follows the finger with a little lag, so it feels weighty */
  hold: spring(520, 40),
  /** Footer string: let go, heavy and slow to settle */
  pluck: spring(380, 6),
  /** Footer string with reduced motion: straight back, no wobble */
  settle: spring(380, 40),
  /** Tab panel arriving after a swipe: lands with a small overshoot */
  land: { type: 'spring', visualDuration: 0.45, bounce: 0.3 } as Transition,
  /** Tab panel arriving from a click / route change */
  arrive: { type: 'spring', visualDuration: 0.34, bounce: 0.12 } as Transition,
  /** Shared row highlight sliding between projects */
  glide: { type: 'spring', visualDuration: 0.24, bounce: 0.15 } as Transition,
  /** Accordion height: no bounce, content shouldn't jiggle */
  fold: { type: 'spring', visualDuration: 0.3, bounce: 0 } as Transition,
  /** Small icons turning (plus → ×, chevron) */
  turn: { type: 'spring', visualDuration: 0.25, bounce: 0.35 } as Transition,
  /** Popovers (select menu, hover card) opening */
  pop: { type: 'spring', visualDuration: 0.2, bounce: 0.2 } as Transition,
} satisfies Record<string, Transition>

/** The site's ease-out (CSS var --ease-out-quint), for the few tweened (non-spring) moves. */
export const easeOutQuint = [0.23, 1, 0.32, 1] as const

/** Rest thresholds matching the hand-written springs (0.05px / 0.05px·s⁻¹). */
export const rest = { restDelta: 0.05, restSpeed: 0.05 }

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
