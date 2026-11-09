import type { MotionValue } from 'motion/react'
import { animate } from '../animate'
import { useRef, type MouseEvent, type PointerEvent } from 'react'
import { rest, springs } from '../motion'

/**
 * Horizontal swipe between tab panels (touch, pen and mouse).
 * - Direction lock: a gesture that starts mostly vertical is left to the page (scrolling).
 * - The active panel follows the finger with heavy rubber-band resistance (stiffer with no tab that way).
 * - Release past ~22% of the width (finger travel), or flick faster than ~0.35px/ms, to switch.
 * - Letting go without switching springs back with a small bounce (Motion spring, keeps velocity).
 * - A drag never turns into a click on whatever it started on.
 *
 * The panel's drag offset is a Motion value owned by the panel (see SectionTabs' TabPanel); its
 * opacity is derived from it, so springing back fades it in for free.
 */
// Same heavy feel as the footer string: the content moves much less than the finger.
const heavy = (d: number) => Math.sign(d) * 0.9 * Math.abs(d) ** 0.68 // 40 → ~11px, 200 → ~33px
const heavier = (d: number) => Math.sign(d) * 0.6 * Math.abs(d) ** 0.6 // no tab that way: stiffer still

export function useSwipeTabs({
  panel,
  canGo,
  go,
  onDrag,
  onRelease,
}: {
  /** drag offset of the panel currently on screen */
  panel: () => MotionValue<number> | null
  canGo: (dir: 1 | -1) => boolean
  /** switch tab; `thrown` means it came from a swipe (the panels use a springier landing) */
  go: (dir: 1 | -1, thrown: boolean) => void
  /** finger distance while dragging horizontally (negative = toward the next tab) */
  onDrag?: (rawX: number) => void
  /** gesture ended without switching */
  onRelease?: () => void
}) {
  const drag = useRef<{
    id: number
    x0: number
    y0: number
    raw: number
    v: number
    lastX: number
    lastT: number
    axis: 'x' | 'y' | null
    x: MotionValue<number> | null
    width: number
  } | null>(null)
  const swallowClick = useRef(false)
  /** window listeners for the current gesture, so a release anywhere always ends it */
  const unlisten = useRef<(() => void) | null>(null)

  const end = (cancelled: boolean) => {
    unlisten.current?.()
    unlisten.current = null
    const d = drag.current
    drag.current = null
    if (!d || d.axis !== 'x' || !d.x) return
    document.documentElement.classList.remove('is-swiping')
    swallowClick.current = true
    setTimeout(() => (swallowClick.current = false), 0)

    const dir: 1 | -1 = d.raw < 0 ? 1 : -1 // dragging left → next tab (to the right)
    // decide on the finger's travel (not the resisted offset), so heavy feel ≠ harder to switch
    const far = Math.abs(d.raw) > d.width * 0.22
    const flick = Math.abs(d.v) > 0.35 && Math.sign(d.v) === Math.sign(d.raw)

    if (!cancelled && (far || flick) && canGo(dir)) {
      // The panel keeps its drag offset and is thrown on by its exit animation.
      go(dir, true)
    } else {
      animate(d.x, 0, { ...springs.release, ...rest })
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
        raw: 0,
        v: 0,
        lastX: e.clientX,
        lastT: e.timeStamp,
        axis: null,
        x: null,
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
        d.x = panel()
        if (!d.x) return void (drag.current = null)
        e.currentTarget.setPointerCapture(e.pointerId)
        d.x.stop() // grabbing mid-bounce picks it up where the finger is
        document.documentElement.classList.add('is-swiping')
        window.getSelection()?.removeAllRanges()
      }

      const dir: 1 | -1 = rawX < 0 ? 1 : -1
      d.raw = rawX
      onDrag?.(canGo(dir) ? rawX : rawX * 0.3)
      const dt = Math.max(e.timeStamp - d.lastT, 1)
      d.v = (e.clientX - d.lastX) / dt
      d.lastX = e.clientX
      d.lastT = e.timeStamp
      d.x!.jump(canGo(dir) ? heavy(rawX) : heavier(rawX))
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
