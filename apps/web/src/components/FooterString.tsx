import { useEffect, useRef, type PointerEvent } from 'react'

/**
 * The footer divider as a plucked string: grab it anywhere, drag up or down and it bends at the
 * grab point with rubber-band resistance; let go and a lightly damped spring makes it vibrate
 * back to rest. Decorative only (aria-hidden), so it never gets in the way of content.
 */
const H = 160 // drawing area; the line sits in the middle with room to bend both ways
const MID = H / 2
const HOLD = { k: 520, c: 40 } // follows the pointer with a little lag, so it feels weighty
const RELEASE = { k: 380, c: 6 } // let go: heavier string → slower, deeper swings
const SETTLE = { k: 380, c: 40 } // reduced motion: straight back, no wobble

// No limit — like real elastic, each extra pixel of pull bends it a little less. Heavy:
// 40px → ~11px, 200px → ~33px, 400px → ~53px
const rubber = (d: number) => Math.sign(d) * 0.9 * Math.abs(d) ** 0.68

export function FooterString() {
  const pathRef = useRef<SVGPathElement>(null)
  const s = useRef({ y: 0, v: 0, target: 0, gx: 500, spring: HOLD, dragging: false, startY: 0, raf: 0, last: 0 })

  const draw = () => {
    const { y, gx } = s.current
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

  const tick = (now: number) => {
    const st = s.current
    let dt = Math.min((now - st.last) / 1000, 1 / 30)
    st.last = now
    while (dt > 0) {
      const h = Math.min(dt, 1 / 240)
      const a = -st.spring.k * (st.y - st.target) - st.spring.c * st.v
      st.v += a * h
      st.y += st.v * h
      dt -= h
    }
    draw()
    if (!st.dragging && Math.abs(st.y - st.target) < 0.05 && Math.abs(st.v) < 0.05) {
      st.y = st.target
      st.v = 0
      st.raf = 0
      draw()
      return
    }
    st.raf = requestAnimationFrame(tick)
  }

  const run = () => {
    const st = s.current
    if (!st.raf) {
      st.last = performance.now()
      st.raf = requestAnimationFrame(tick)
    }
  }

  useEffect(() => {
    draw()
    const st = s.current
    return () => cancelAnimationFrame(st.raf)
  }, [])

  const onPointerDown = (e: PointerEvent<SVGRectElement>) => {
    const st = s.current
    const box = e.currentTarget.ownerSVGElement!.getBoundingClientRect()
    e.preventDefault() // no text selection while dragging
    e.currentTarget.setPointerCapture(e.pointerId)
    document.documentElement.classList.add('is-plucking')
    st.dragging = true
    st.spring = HOLD
    st.startY = e.clientY - st.y // keep any current bend so grabbing mid-wobble doesn't jump
    st.gx = ((e.clientX - box.left) / box.width) * 1000
    run()
  }

  const onPointerMove = (e: PointerEvent<SVGRectElement>) => {
    const st = s.current
    if (!st.dragging) return
    const box = e.currentTarget.ownerSVGElement!.getBoundingClientRect()
    st.gx = Math.min(Math.max(((e.clientX - box.left) / box.width) * 1000, 40), 960)
    st.target = rubber(e.clientY - st.startY)
    run()
  }

  const onRelease = () => {
    const st = s.current
    if (!st.dragging) return
    st.dragging = false
    document.documentElement.classList.remove('is-plucking')
    st.target = 0
    st.spring = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? SETTLE : RELEASE
    run()
  }

  return (
    <div className="footer-string" aria-hidden>
      <svg viewBox={`0 0 1000 ${H}`} preserveAspectRatio="none" height={H}>
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
