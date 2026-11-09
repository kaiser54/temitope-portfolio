import { useRef, type MouseEvent, type PointerEvent } from 'react'

/**
 * Horizontal swipe between tab panels (touch, pen and mouse).
 * - Direction lock: a gesture that starts mostly vertical is left to the page (scrolling).
 * - The active panel follows the finger with heavy rubber-band resistance (stiffer with no tab that way).
 * - Release past ~22% of the width (finger travel), or flick faster than ~0.35px/ms, to switch.
 * - Letting go without switching springs back with a small bounce.
 * - A drag never turns into a click on whatever it started on.
 */
// Same heavy feel as the footer string: the content moves much less than the finger.
const heavy = (d: number) => Math.sign(d) * 0.9 * Math.abs(d) ** 0.68 // 40 → ~11px, 200 → ~33px
const heavier = (d: number) => Math.sign(d) * 0.6 * Math.abs(d) ** 0.6 // no tab that way: stiffer still

const springs = new WeakMap<HTMLElement, number>()
const stopSpring = (panel: HTMLElement) => cancelAnimationFrame(springs.get(panel) ?? 0)

/** Spring the panel back to 0 with a little overshoot (bounce), then clear inline styles. */
function springBack(panel: HTMLElement, from: number) {
  stopSpring(panel)
  const k = 420
  const c = 15 // low damping → visible bounce
  let x = from
  let v = 0
  let last = performance.now()
  panel.style.transition = 'opacity 220ms ease'
  panel.style.opacity = ''
  const step = (now: number) => {
    let dt = Math.min((now - last) / 1000, 1 / 30)
    last = now
    while (dt > 0) {
      const h = Math.min(dt, 1 / 240)
      v += (-k * x - c * v) * h
      x += v * h
      dt -= h
    }
    if (Math.abs(x) < 0.05 && Math.abs(v) < 0.05) {
      panel.style.transform = ''
      panel.style.transition = ''
      return
    }
    panel.style.transform = `translateX(${x}px)`
    springs.set(panel, requestAnimationFrame(step))
  }
  springs.set(panel, requestAnimationFrame(step))
}

export function useSwipeTabs({
  canGo,
  go,
  onDrag,
  onRelease,
}: {
  canGo: (dir: 1 | -1) => boolean
  go: (dir: 1 | -1) => void
  /** finger distance while dragging horizontally (negative = toward the next tab) */
  onDrag?: (rawX: number) => void
  /** gesture ended without switching */
  onRelease?: () => void
}) {
  const drag = useRef<{
    id: number
    x0: number
    y0: number
    dx: number
    raw: number
    v: number
    lastX: number
    lastT: number
    axis: 'x' | 'y' | null
    panel: HTMLElement | null
    width: number
  } | null>(null)
  const swallowClick = useRef(false)
  /** window listeners for the current gesture, so a release anywhere always ends it */
  const unlisten = useRef<(() => void) | null>(null)

  const activePanel = (root: HTMLElement) =>
    root.querySelector<HTMLElement>('.tab-panel:not([data-ending-style]):not([hidden])')

  const end = (cancelled: boolean) => {
    unlisten.current?.()
    unlisten.current = null
    const d = drag.current
    drag.current = null
    if (!d || d.axis !== 'x' || !d.panel) return
    document.documentElement.classList.remove('is-swiping')
    swallowClick.current = true
    setTimeout(() => (swallowClick.current = false), 0)

    const dir: 1 | -1 = d.raw < 0 ? 1 : -1 // dragging left → next tab (to the right)
    // decide on the finger's travel (not the resisted offset), so heavy feel ≠ harder to switch
    const far = Math.abs(d.raw) > d.width * 0.22
    const flick = Math.abs(d.v) > 0.35 && Math.sign(d.v) === Math.sign(d.raw)
    const panel = d.panel

    if (!cancelled && (far || flick) && canGo(dir)) {
      // carry on in the thrown direction while the next tab slides in from the other side
      panel.style.transition = 'transform 220ms var(--ease-out-quint), opacity 180ms ease'
      panel.style.transform = `translateX(${d.dx - dir * 48}px)`
      panel.style.opacity = '0'
      // incoming panel lands with a small bounce
      const root = document.documentElement
      root.classList.add('swipe-commit')
      setTimeout(() => root.classList.remove('swipe-commit'), 700)
      go(dir)
    } else {
      springBack(panel, d.dx)
      onRelease?.()
    }
  }

  return {
    onPointerDown(e: PointerEvent<HTMLElement>) {
      if (e.button !== 0) return
      if (drag.current) end(true) // a stale gesture never survives a new press
      drag.current = {
        id: e.pointerId,
        x0: e.clientX,
        y0: e.clientY,
        dx: 0,
        raw: 0,
        v: 0,
        lastX: e.clientX,
        lastT: e.timeStamp,
        axis: null,
        panel: null,
        width: e.currentTarget.getBoundingClientRect().width,
      }
      // Release anywhere (even outside the content, before the drag "locks") ends the gesture;
      // so does the window losing focus mid-drag (e.g. Cmd-Tab).
      const id = e.pointerId
      const onUp = (ev: globalThis.PointerEvent) => ev.pointerId === id && end(false)
      const onCancel = (ev: globalThis.PointerEvent) => ev.pointerId === id && end(true)
      const onBlur = () => end(true)
      window.addEventListener('pointerup', onUp, true)
      window.addEventListener('pointercancel', onCancel, true)
      window.addEventListener('blur', onBlur)
      unlisten.current = () => {
        window.removeEventListener('pointerup', onUp, true)
        window.removeEventListener('pointercancel', onCancel, true)
        window.removeEventListener('blur', onBlur)
      }
    },
    onPointerMove(e: PointerEvent<HTMLElement>) {
      const d = drag.current
      if (!d || e.pointerId !== d.id) return
      // mouse moving with no button held means we missed the release — end it, never "stick"
      if (e.pointerType === 'mouse' && e.buttons === 0) return end(false)
      const rawX = e.clientX - d.x0
      const rawY = e.clientY - d.y0

      if (!d.axis) {
        if (Math.hypot(rawX, rawY) < 8) return
        d.axis = Math.abs(rawX) > Math.abs(rawY) * 1.2 ? 'x' : 'y'
        if (d.axis === 'y') return void (drag.current = null) // let the page scroll
        d.panel = activePanel(e.currentTarget)
        if (!d.panel) return void (drag.current = null)
        e.currentTarget.setPointerCapture(e.pointerId)
        stopSpring(d.panel) // grabbing mid-bounce picks it up where it is
        d.panel.style.transition = 'none'
        document.documentElement.classList.add('is-swiping')
        window.getSelection()?.removeAllRanges()
      }

      const dir: 1 | -1 = rawX < 0 ? 1 : -1
      const dx = canGo(dir) ? heavy(rawX) : heavier(rawX)
      d.raw = rawX
      onDrag?.(canGo(dir) ? rawX : rawX * 0.3)
      const dt = Math.max(e.timeStamp - d.lastT, 1)
      d.v = (e.clientX - d.lastX) / dt
      d.lastX = e.clientX
      d.lastT = e.timeStamp
      d.dx = dx
      d.panel!.style.transform = `translateX(${dx}px)`
      d.panel!.style.opacity = String(1 - Math.min(Math.abs(dx) / 120, 1) * 0.35)
    },
    onPointerUp() {
      end(false)
    },
    onPointerCancel() {
      end(true)
    },
    onLostPointerCapture() {
      end(false)
    },
    /** swallow the click that follows a drag, so a swipe never opens a project */
    onClickCapture(e: MouseEvent<HTMLElement>) {
      if (swallowClick.current) {
        e.preventDefault()
        e.stopPropagation()
        swallowClick.current = false
      }
    },
  }
}
