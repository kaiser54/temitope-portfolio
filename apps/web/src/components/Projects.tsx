import { Plus } from 'lucide-react'
import { useEffect, useRef, type FocusEvent, type PointerEvent } from 'react'
import { AccordionItem, AccordionPanel, AccordionRoot, AccordionTrigger } from '@repo/ui'
import type { Project } from '../content'

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
  const listRef = useRef<HTMLDivElement>(null)
  const highlightRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLElement | null>(null)

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
    // Horizontal placement is pure CSS (pinned to the project column); JS only sets top + height.
    const place = () => {
      hl.style.transform = `translateY(${r.top - list.top}px)`
      hl.style.height = `${r.height}px`
    }
    if (snap || !('visible' in hl.dataset)) {
      hl.dataset.snap = ''
      place()
      void hl.offsetHeight // commit position before re-enabling the slide
      delete hl.dataset.snap
    } else {
      place()
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

  // Target the whole item (row + open panel), so an open project highlights as one card.
  const onPointerEnter = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'mouse') moveTo(e.currentTarget, false, false)
  }
  const onFocus = (e: FocusEvent<HTMLElement>) => {
    const item = e.currentTarget.closest<HTMLElement>('.project-item')
    if (item && e.currentTarget.matches(':focus-visible')) moveTo(item, false, true)
  }

  return (
    <div ref={listRef} className="relative [--year-col:0px] sm:[--year-col:4.5rem]" onPointerLeave={() => {
        // Keep the card (and its focus ring) if a row has keyboard focus.
        if (!listRef.current?.querySelector(':focus-visible')) hide()
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) hide()
      }}
    >
      <div ref={highlightRef} aria-hidden className="row-highlight" />
      <AccordionRoot className="gap-6 sm:gap-4">
        {groupByYear(items).map(([year, group]) => (
          <div key={year} className="flex flex-col sm:grid sm:grid-cols-[var(--year-col)_1fr]">
            <h3 className="pb-1 text-sm text-faint tabular-nums sm:pt-[0.7rem] sm:pb-0">{year}</h3>
            <div className="flex flex-col">
              {group.map((p) => (
                <AccordionItem key={p.name} className="project-item" onPointerEnter={onPointerEnter}>
                  <AccordionTrigger onFocus={onFocus}>
                    <span className="font-medium">{p.name}</span>
                    <span className="min-w-0 flex-1 truncate text-muted">{p.kind}</span>
                    <Plus aria-hidden className="icon shrink-0 self-center text-faint" size={14} strokeWidth={1.5} />
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
