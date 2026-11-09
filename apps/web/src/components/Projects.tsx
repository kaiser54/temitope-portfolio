import { Plus } from 'lucide-react'
import { m, useMotionValue } from 'motion/react'
import { animate } from '../animate'
import { useEffect, useRef, useState, type FocusEvent, type PointerEvent } from 'react'
import { AccordionItem, AccordionPanel, AccordionRoot, AccordionTrigger } from '@repo/ui'
import type { Project } from '../content'
import { prefersReducedMotion, springs } from '../motion'
import { haloFromClick, readyHalo, warmUpHalo } from './halo/haloTrigger'

/** "2023—26" → 2026, "2024" → 2024. Projects are grouped by the latest year worked on. */
const endYear = (range: string) => {
  const [start, end] = range.split('—')
  if (!end) return Number(start)
  return Number(start.slice(0, 4 - end.length) + end)
}

function groupByYear(items: Project[]) {
  const groups = new Map<number, Project[]>()
  for (const p of items) {
    const y = endYear(p.year)
    groups.set(y, [...(groups.get(y) ?? []), p])
  }
  return [...groups.entries()].sort((a, b) => b[0] - a[0])
}

export function Projects({ items }: { items: Project[] }) {
  const [open, setOpen] = useState<string[]>([])
  const listRef = useRef<HTMLDivElement>(null)
  const highlightRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLElement | null>(null)
  // The highlight's top and height, sprung together so it glides between rows of different heights.
  const y = useMotionValue(0)
  const height = useMotionValue(0)

  /** Slide the shared highlight onto a row. `snap` places it without sliding. */
  const moveTo = (row: HTMLElement, snap = false, focus?: boolean) => {
    const hl = highlightRef.current
    if (!hl) return
    activeRef.current = row
    if (focus !== undefined) {
      if (focus) hl.dataset.focus = ''
      else delete hl.dataset.focus
    }
    // First appearance: fade in at the row instead of sliding in from the top.
    const list = listRef.current!.getBoundingClientRect()
    const r = row.getBoundingClientRect()
    // Horizontal placement is pure CSS (pinned to the project column); Motion sets top + height.
    const top = r.top - list.top
    if (snap || !('visible' in hl.dataset) || prefersReducedMotion()) {
      y.jump(top)
      height.jump(r.height)
    } else {
      animate(y, top, springs.glide)
      animate(height, r.height, springs.glide)
    }
    hl.dataset.visible = ''
  }

  const hide = () => {
    activeRef.current = null
    if (!highlightRef.current) return
    delete highlightRef.current.dataset.visible
    delete highlightRef.current.dataset.focus
  }

  // Rows shift and items grow while a panel opens or closes; keep the highlight glued to the active item.
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const ro = new ResizeObserver(() => {
      if (activeRef.current) moveTo(activeRef.current, true)
    })
    ro.observe(list)
    return () => ro.disconnect()
  }, [])

  /**
   * Opening a project closes the one above it, and that collapse would drag the clicked row
   * up the page. Pin the row where it was clicked: whenever the closing project shrinks,
   * scroll up by the same amount.
   *
   * The correction runs in a ResizeObserver, not requestAnimationFrame: observers fire after
   * layout but before paint, so the scroll lands in the same frame as the shift and the row
   * never paints out of place. A rAF loop reads last frame's layout and corrects a frame late,
   * which shows up as a stutter.
   */
  const anchorStop = useRef<(() => void) | null>(null)
  const pinRow = (trigger: HTMLElement) => {
    anchorStop.current?.()
    // Only pin when the project that's closing sits above the clicked row and has scrolled
    // (partly) off the top. If it's fully on screen, the reader watches it fold away and the
    // rows rising to meet it reads naturally; pinning there would scroll the page under them.
    const item = trigger.closest('.project-item')
    const open = listRef.current?.querySelector<HTMLElement>('.project-item:has([data-panel-open])')
    if (!item || !open || open === item) return
    const above = open.compareDocumentPosition(item) & Node.DOCUMENT_POSITION_FOLLOWING
    if (!above || open.getBoundingClientRect().top >= 0) return
    // Compensate exactly the height the closing project loses (it sits wholly above the row),
    // rather than chasing the row's position. That never fights the reader's own scrolling,
    // including trackpad momentum still arriving after the click, so nothing has to cancel it.
    let lastHeight = open.getBoundingClientRect().height
    const ro = new ResizeObserver(() => {
      const height = open.getBoundingClientRect().height
      const lost = lastHeight - height
      lastHeight = height
      if (lost !== 0) window.scrollTo({ top: window.scrollY - lost, behavior: 'instant' })
    })
    ro.observe(open)
    // Safety net: the panel transition is 280ms; stop well after it has settled.
    const timeout = window.setTimeout(() => stop(), 600)
    const stop = () => {
      ro.disconnect()
      window.clearTimeout(timeout)
      anchorStop.current = null
    }
    anchorStop.current = stop
  }
  useEffect(() => () => anchorStop.current?.(), [])

  // Target the whole item (row + open panel), so an open project highlights as one card.
  const onPointerEnter = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'mouse') moveTo(e.currentTarget, false, false)
    readyHalo(e.currentTarget) // snapshot it now, so a click starts its shockwave without a hitch
  }
  const onFocus = (e: FocusEvent<HTMLElement>) => {
    const item = e.currentTarget.closest<HTMLElement>('.project-item')
    if (item && e.currentTarget.matches(':focus-visible')) moveTo(item, false, true)
  }

  return (
    <div
      ref={listRef}
      className="relative [overflow-anchor:none] [--year-col:0px] sm:[--year-col:4.5rem]"
      onPointerEnter={() => warmUpHalo(listRef.current)}
      onPointerLeave={() => {
        // Keep the card (and its focus ring) if a row has keyboard focus.
        if (!listRef.current?.querySelector(':focus-visible')) hide()
      }}
      onBlur={(e) => {
        // Focus left the list (keyboard): drop the card. But a click inside an open project's details also
        // takes focus off its row; the pointer is still over the card then, so keep it.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null) && !e.currentTarget.matches(':hover')) hide()
      }}
    >
      <m.div ref={highlightRef} aria-hidden className="row-highlight" style={{ y, height }} />
      <AccordionRoot className="gap-6 sm:gap-4" value={open} onValueChange={(v) => setOpen(v as string[])}>
        {groupByYear(items).map(([year, group]) => (
          <div key={year} className="flex flex-col sm:grid sm:grid-cols-[var(--year-col)_1fr]">
            <h3 className="pb-1 text-sm text-faint tabular-nums sm:pt-[0.7rem] sm:pb-0">{year}</h3>
            <div className="flex flex-col">
              {group.map((p) => (
                <AccordionItem
                  key={p.name}
                  value={p.name}
                  className="project-item"
                  onPointerEnter={onPointerEnter}
                  // shockwave halo across the card from wherever it's clicked (components/halo)
                  onClick={(e) => haloFromClick(e, listRef.current)}
                >
                  <AccordionTrigger onFocus={onFocus} onClick={(e) => pinRow(e.currentTarget)}>
                    <span className="font-medium">{p.name}</span>
                    <span className="min-w-0 flex-1 truncate text-muted">{p.kind}</span>
                    <m.span
                      aria-hidden
                      className="icon shrink-0 self-center text-faint"
                      initial={false}
                      animate={{ rotate: open.includes(p.name) ? 45 : 0 }}
                      transition={springs.turn}
                    >
                      <Plus size={14} strokeWidth={1.5} />
                    </m.span>
                  </AccordionTrigger>
                  <AccordionPanel>
                    <div className="flex flex-col gap-3 pt-1 pb-5 text-muted">
                      <p className="text-sm text-faint tabular-nums">
                        {p.year}
                        {p.stat && <span className="text-fg"> · {p.stat}</span>}
                      </p>
                      <ul className="flex flex-col gap-2">
                        {p.points.map((point) => (
                          <li key={point} className="text-pretty">
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </AccordionPanel>
                </AccordionItem>
              ))}
            </div>
          </div>
        ))}
      </AccordionRoot>
    </div>
  )
}
