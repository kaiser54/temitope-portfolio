import { useMotionValue, useMotionValueEvent } from 'motion/react'
import { animate } from '../animate'
import { useEffect, useRef, type PointerEvent } from 'react'
import { prefersReducedMotion, rest, springs } from '../motion'

/**
 * The footer divider as a plucked string: grab it anywhere, drag up or down and it bends at the
 * grab point with rubber-band resistance; let go and a lightly damped spring makes it vibrate
 * back to rest. Decorative only (aria-hidden), so it never gets in the way of content.
 *
 * The bend is a Motion value: while held it springs toward the (rubber-banded) finger, and on release
 * a loose spring takes it home, starting with whatever velocity the drag left it.
 */
const H = 160 // drawing area; the line sits in the middle with room to bend both ways
const MID = H / 2

// No limit — like real elastic, each extra pixel of pull bends it a little less. Heavy:
// 40px → ~11px, 200px → ~33px, 400px → ~53px
const rubber = (d: number) => Math.sign(d) * 0.9 * Math.abs(d) ** 0.68

/**
 * Lets something other than a pointer hold the string (the avatar catapult, ./catapult.ts):
 * `line()` is where the line sits on screen, `hold()` pins it at a point with a bend, `release()`
 * lets it go with the usual twang.
 */
export type StringHandle = {
  line(): { left: number; right: number; y: number } | null
  hold(clientX: number, bendPx: number): void
  /** let go; `velocity` (px/s, + = down) carries the bend's motion into the twang */
  release(velocity?: number): void
}
let handle: StringHandle | null = null
export const footerString = () => handle

export function FooterString() {
  const pathRef = useRef<SVGPathElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const bend = useMotionValue(0)
  const s = useRef({ gx: 500, dragging: false, startY: 0 })

  const draw = () => {
    const y = bend.get()
    const { gx } = s.current
    if (!pathRef.current) return
    // Only the two ends are anchored: each half leaves its end at an angle, heading straight for
    // the grab point, and rounds off under the finger (flat tangent there, so the peak sits exactly
    // under the pointer).
    const by = MID + y
    const lr = gx * 0.3 // rounding on each side of the finger
    const rr = (1000 - gx) * 0.3
    pathRef.current?.setAttribute(
      'd',
      `M0 ${MID} C${gx / 3} ${MID + y / 3} ${gx - lr} ${by} ${gx} ${by} ` +
        `C${gx + rr} ${by} ${1000 - (1000 - gx) / 3} ${MID + y / 3} 1000 ${MID}`,
    )
  }

  useMotionValueEvent(bend, 'change', draw)
  const springTo = (target: number, spring: typeof springs.hold) => animate(bend, target, { ...spring, ...rest })

  useEffect(() => {
    draw()
    const toGx = (clientX: number, box: DOMRect) =>
      Math.min(Math.max(((clientX - box.left) / box.width) * 1000, 40), 960)
    handle = {
      line: () => {
        const box = svgRef.current?.getBoundingClientRect()
        return box ? { left: box.left, right: box.right, y: box.top + (box.height * MID) / H } : null
      },
      hold: (clientX, bendPx) => {
        const box = svgRef.current?.getBoundingClientRect()
        if (!box) return
        s.current.gx = toGx(clientX, box)
        bend.jump(bendPx) // pinned to whatever is pulling it, no lag
        draw()
      },
      release: (velocity = 0) =>
        animate(bend, 0, { ...(prefersReducedMotion() ? springs.settle : springs.pluck), ...rest, velocity }),
    }
    return () => {
      bend.stop()
      handle = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onPointerDown = (e: PointerEvent<SVGRectElement>) => {
    const st = s.current
    const box = e.currentTarget.ownerSVGElement!.getBoundingClientRect()
    e.preventDefault() // no text selection while dragging
    e.currentTarget.setPointerCapture(e.pointerId)
    document.documentElement.classList.add('is-plucking')
    st.dragging = true
    bend.stop() // grabbing mid-wobble holds it where it is
    st.startY = e.clientY - bend.get() // ...and keeps that bend, so it doesn't jump
    st.gx = ((e.clientX - box.left) / box.width) * 1000
    draw()
  }

  const onPointerMove = (e: PointerEvent<SVGRectElement>) => {
    const st = s.current
    if (!st.dragging) return
    const box = e.currentTarget.ownerSVGElement!.getBoundingClientRect()
    st.gx = Math.min(Math.max(((e.clientX - box.left) / box.width) * 1000, 40), 960)
    springTo(rubber(e.clientY - st.startY), springs.hold)
  }

  const onRelease = () => {
    const st = s.current
    if (!st.dragging) return
    st.dragging = false
    document.documentElement.classList.remove('is-plucking')
    springTo(0, prefersReducedMotion() ? springs.settle : springs.pluck)
  }

  return (
    <div className="footer-string" aria-hidden>
      <svg ref={svgRef} viewBox={`0 0 1000 ${H}`} preserveAspectRatio="none" height={H}>
        <path ref={pathRef} vectorEffect="non-scaling-stroke" />
        {/* generous invisible grab band around the line */}
        <rect
          x="0"
          y={MID - 14}
          width="1000"
          height="28"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onRelease}
          onPointerCancel={onRelease}
          onLostPointerCapture={onRelease}
        />
      </svg>
    </div>
  )
}
