/**
 * `animate()` without putting Motion's animation engine in the main bundle.
 *
 * The engine (~26 kB gzip) is what springs and tweens run on. Importing `animate` from motion/react
 * statically would ship it before first paint; here it's fetched on idle after hydration (the same
 * chunk LazyMotion's features share), so it's ready long before anyone grabs a tab or the footer.
 * If something animates before it has arrived, the call runs as soon as it lands (a few ms).
 */
import type { animate as AnimateFn, AnimationPlaybackControls } from 'motion/react'

type Animate = typeof AnimateFn
let engine: Animate | null = null
let loading: Promise<Animate> | null = null

export function loadAnimate(): Promise<Animate> {
  loading ??= import('./motion-engine').then((m) => (engine = m.animate))
  return loading
}

/** Same call signatures as Motion's `animate`. Returns a handle whose `stop()` works even before load. */
export const animate = ((...args: Parameters<Animate>) => {
  if (engine) return (engine as (...a: unknown[]) => AnimationPlaybackControls)(...args)
  let controls: AnimationPlaybackControls | null = null
  let stopped = false
  loadAnimate().then((run) => {
    if (!stopped) controls = (run as (...a: unknown[]) => AnimationPlaybackControls)(...args)
  })
  return {
    stop: () => {
      stopped = true
      controls?.stop()
    },
  } as AnimationPlaybackControls
}) as Animate
