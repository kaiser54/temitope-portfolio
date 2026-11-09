/**
 * Spring-driven underline whose two edges move independently, so it can stretch like rubber.
 * - follow(): pointer pulls the nearest edge with rubber-band resistance (stiff, near-critical spring)
 * - release(): edges snap back to the active tab with a loose spring, so it overshoots and wobbles
 * - select(): leading edge springs ahead, trailing edge follows, so it stretches in transit
 */
type Spring = { k: number; c: number }
type Edge = { x: number; v: number; target: number; spring: Spring }

const FOLLOW: Spring = { k: 900, c: 54 } // tracks the pointer, barely any overshoot
const RELEASE: Spring = { k: 420, c: 15 } // let go: overshoot + a couple of wobbles ("dangle")
const LEAD: Spring = { k: 520, c: 34 } // switching tabs: front edge
const TRAIL: Spring = { k: 240, c: 25 } // switching tabs: back edge lags → stretch

/** Apple-style rubber banding: grows ~linearly at first, then resists more and more. */
const rubber = (d: number, dim: number, c = 0.55) => (1 - 1 / ((d * c) / dim + 1)) * dim

export class RubberIndicator {
  private l: Edge = { x: 0, v: 0, target: 0, spring: FOLLOW }
  private r: Edge = { x: 0, v: 0, target: 0, spring: FOLLOW }
  private raf = 0
  private last = 0
  private rest = { left: 0, right: 0 }
  private el: HTMLElement
  private reduced: boolean

  constructor(el: HTMLElement) {
    this.el = el
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  /** Jump straight to a tab (first paint, resize). */
  place(left: number, right: number) {
    this.rest = { left, right }
    this.l = { ...this.l, x: left, v: 0, target: left }
    this.r = { ...this.r, x: right, v: 0, target: right }
    this.render()
  }

  /** Active tab changed: travel there, front edge leading. */
  select(left: number, right: number) {
    const movingRight = left > this.rest.left
    this.rest = { left, right }
    this.l.spring = movingRight ? TRAIL : LEAD
    this.r.spring = movingRight ? LEAD : TRAIL
    this.to(left, right)
  }

  /** Pointer at x (list coordinates): stretch toward it with resistance. */
  follow(x: number, listWidth: number) {
    const { left, right } = this.rest
    this.l.spring = this.r.spring = FOLLOW
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
    this.l.spring = this.r.spring = FOLLOW
    const ext = rubber(amount, listWidth)
    if (dir === 1) this.to(left + ext * 0.08, right + ext)
    else this.to(left - ext, right - ext * 0.08)
  }

  /** Let go: snap back to the active tab and dangle. */
  release() {
    this.l.spring = this.r.spring = RELEASE
    this.to(this.rest.left, this.rest.right)
  }

  destroy() {
    cancelAnimationFrame(this.raf)
  }

  private to(left: number, right: number) {
    this.l.target = left
    this.r.target = right
    if (this.reduced) {
      this.l.x = this.rest.left
      this.r.x = this.rest.right
      this.render()
      return
    }
    if (!this.raf) {
      this.last = performance.now()
      this.raf = requestAnimationFrame(this.tick)
    }
  }

  private tick = (now: number) => {
    let dt = Math.min((now - this.last) / 1000, 1 / 30)
    this.last = now
    // fixed sub-steps keep stiff springs stable
    while (dt > 0) {
      const h = Math.min(dt, 1 / 240)
      for (const e of [this.l, this.r]) {
        const a = -e.spring.k * (e.x - e.target) - e.spring.c * e.v
        e.v += a * h
        e.x += e.v * h
      }
      dt -= h
    }
    const settled = [this.l, this.r].every((e) => Math.abs(e.x - e.target) < 0.05 && Math.abs(e.v) < 0.05)
    if (settled) {
      this.l.x = this.l.target
      this.r.x = this.r.target
      this.l.v = this.r.v = 0
      this.raf = 0
    } else {
      this.raf = requestAnimationFrame(this.tick)
    }
    this.render()
  }

  private render() {
    const width = Math.max(this.r.x - this.l.x, 2)
    const restWidth = Math.max(this.rest.right - this.rest.left, 1)
    // conserve "volume": thinner as it stretches, a touch thicker when squashed
    const stretch = width / restWidth - 1
    const thickness = Math.min(Math.max(1 - stretch * 0.35, 0.5), 1.15)
    this.el.style.width = `${width}px`
    this.el.style.transform = `translateX(${this.l.x}px) scaleY(${thickness})`
  }
}
