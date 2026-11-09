/**
 * Spring-driven underline whose two edges move independently, so it can stretch like rubber.
 * - follow(): pointer pulls the nearest edge with rubber-band resistance (stiff, near-critical spring)
 * - release(): edges snap back to the active tab with a loose spring, so it overshoots and wobbles
 * - select(): leading edge springs ahead, trailing edge follows, so it stretches in transit
 *
 * Each edge is a Motion value animated by its own spring. Retargeting mid-flight (every pointer move)
 * keeps the edge's current velocity, which is what makes the stretch and the wobble read as one material.
 */
import { motionValue, type AnimationPlaybackControls, type MotionValue, type Transition } from 'motion/react'
import { animate } from '../animate'
import { prefersReducedMotion, rest, springs } from '../motion'

/** Apple-style rubber banding: grows ~linearly at first, then resists more and more. */
const rubber = (d: number, dim: number, c = 0.55) => (1 - 1 / ((d * c) / dim + 1)) * dim

type Edge = { x: MotionValue<number>; anim?: AnimationPlaybackControls; spring: Transition }

export class RubberIndicator {
  private l: Edge = { x: motionValue(0), spring: springs.follow }
  private r: Edge = { x: motionValue(0), spring: springs.follow }
  private rest = { left: 0, right: 0 }
  private el: HTMLElement
  private reduced = prefersReducedMotion()

  constructor(el: HTMLElement) {
    this.el = el
    // The listeners live as long as the instance (and its motion values), so they're never removed:
    // React StrictMode runs the unmount cleanup and then reuses this same instance.
    const render = () => this.render()
    this.l.x.on('change', render)
    this.r.x.on('change', render)
  }

  /** Jump straight to a tab (first paint, resize). */
  place(left: number, right: number) {
    this.rest = { left, right }
    this.l.anim?.stop()
    this.r.anim?.stop()
    this.l.x.jump(left)
    this.r.x.jump(right)
    this.render()
  }

  /** Active tab changed: travel there, front edge leading. */
  select(left: number, right: number) {
    const movingRight = left > this.rest.left
    this.rest = { left, right }
    this.l.spring = movingRight ? springs.trail : springs.lead
    this.r.spring = movingRight ? springs.lead : springs.trail
    this.to(left, right)
  }

  /** Pointer at x (list coordinates): stretch toward it with resistance. */
  follow(x: number, listWidth: number) {
    const { left, right } = this.rest
    this.l.spring = this.r.spring = springs.follow
    if (x > right) {
      const ext = rubber(x - right, listWidth)
      this.to(left + ext * 0.08, right + ext) // far edge pulls, near edge creeps
    } else if (x < left) {
      const ext = rubber(left - x, listWidth)
      this.to(left - ext, right - ext * 0.08)
    } else {
      this.release()
    }
  }

  /** Content is being dragged: stretch toward the neighbouring tab (dir 1 = right, -1 = left). */
  pull(dir: 1 | -1, amount: number, listWidth: number) {
    const { left, right } = this.rest
    this.l.spring = this.r.spring = springs.follow
    const ext = rubber(amount, listWidth)
    if (dir === 1) this.to(left + ext * 0.08, right + ext)
    else this.to(left - ext, right - ext * 0.08)
  }

  /** Let go: snap back to the active tab and dangle. */
  release() {
    this.l.spring = this.r.spring = springs.release
    this.to(this.rest.left, this.rest.right)
  }

  /** Stop any spring in flight (unmount). Safe to keep using the instance afterwards. */
  destroy() {
    this.l.anim?.stop()
    this.r.anim?.stop()
  }

  private to(left: number, right: number) {
    if (this.reduced) return this.place(this.rest.left, this.rest.right)
    for (const [edge, target] of [
      [this.l, left],
      [this.r, right],
    ] as const) {
      // Already resting there: don't restart a finished spring on every pointer move.
      if (edge.x.get() === target && !edge.x.isAnimating()) continue
      edge.anim = animate(edge.x, target, { ...edge.spring, ...rest })
    }
  }

  private render() {
    const l = this.l.x.get()
    const r = this.r.x.get()
    const width = Math.max(r - l, 2)
    const restWidth = Math.max(this.rest.right - this.rest.left, 1)
    // conserve "volume": thinner as it stretches, a touch thicker when squashed
    const stretch = width / restWidth - 1
    const thickness = Math.min(Math.max(1 - stretch * 0.35, 0.5), 1.15)
    this.el.style.width = `${width}px`
    this.el.style.transform = `translateX(${l}px) scaleY(${thickness})`
  }
}
