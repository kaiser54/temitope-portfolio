import { SelectPrimitive as Select, Tabs } from '@repo/ui'
import { ChevronDown } from 'lucide-react'
import { AnimatePresence, m, useIsPresent, useMotionValue, useReducedMotion, useTransform, type MotionValue, type Variants } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState, type ComponentProps, type CSSProperties, type MouseEvent, type ReactNode } from 'react'
import { NOTE_TAGS, explorations, notes, projects, type NoteTag } from '../content'
import { navigate, useRoute } from '../router'
import { easeOutQuint, springs } from '../motion'
import { pathFor, type NoteFilter, type Section } from '../seo'
import { Explorations } from './Explorations'
import { Notes } from './Notes'
import { Projects } from './Projects'
import { RubberIndicator } from './RubberIndicator'
import { useSwipeTabs } from './useSwipeTabs'

type SectionId = Section
export type { NoteFilter }

const FILTERS = [
  { value: 'all' as const, label: 'Notes' },
  ...NOTE_TAGS.map((t) => ({ value: t.value as NoteFilter, label: t.plural })),
]

/** How far a panel travels when tabs change, and how far a thrown panel keeps going. */
const SHIFT = 28
const THROW = 48

/** `still`: reduced motion, so panels only cross-fade (no slide, no blur), as before the migration. */
type PanelMotion = { dir: 1 | -1; thrown: boolean; still?: boolean }

/**
 * Panels slide with direction: moving to a tab on the right, the new panel comes in from the right
 * while the old one leaves to the left. After a swipe the old panel is thrown on from where the finger
 * left it, and the new one lands with an overshoot.
 */
const panelVariants: Variants = {
  enter: ({ dir, still }: PanelMotion) => ({ opacity: 0, x: still ? 0 : dir * SHIFT, filter: still ? 'blur(0px)' : 'blur(3px)' }),
  center: ({ thrown }: PanelMotion) => ({
    opacity: 1,
    x: 0,
    filter: 'blur(0px)', // same on server and client, so hydration matches
    transition: {
      x: thrown ? springs.land : springs.arrive,
      opacity: { duration: 0.26, ease: easeOutQuint },
      filter: { duration: 0.26, ease: easeOutQuint },
    },
  }),
  // leaving: quicker, and it never blocks the incoming panel
  exit: ({ dir, thrown, still }: PanelMotion) => ({
    opacity: 0,
    x: still ? 0 : -dir * (thrown ? THROW : SHIFT),
    filter: still ? 'blur(0px)' : 'blur(3px)',
    transition: { x: { duration: 0.22, ease: easeOutQuint }, opacity: { duration: 0.18 }, filter: { duration: 0.18 } },
  }),
}

/** One tab panel. Outer layer: enter / exit. Inner layer: the swipe offset (and the fade it implies). */
function TabPanel({
  value,
  motion,
  register,
  children,
}: {
  value: Section
  motion: PanelMotion
  register: (x: MotionValue<number>) => () => void
  children: ReactNode
}) {
  const x = useMotionValue(0)
  const opacity = useTransform(x, (v) => 1 - Math.min(Math.abs(v) / 120, 1) * 0.35)
  const present = useIsPresent()
  useEffect(() => (present ? register(x) : undefined), [present, register, x])
  return (
    <m.div
      className="tab-panel"
      role="tabpanel"
      id={`panel-${value}`}
      aria-labelledby={`tab-${value}`}
      tabIndex={0}
      inert={!present || undefined}
      custom={motion}
      variants={panelVariants}
      initial="enter"
      animate="center"
      exit="exit"
    >
      <m.div style={{ x, opacity }}>{children}</m.div>
    </m.div>
  )
}

/** Let modified clicks (new tab, etc.) behave natively; plain clicks stay in the app. */
const spaClick = (e: MouseEvent<HTMLAnchorElement>) => {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
  e.preventDefault()
}

export function SectionTabs({ index }: { index: number }) {
  const route = useRoute()
  const { section, filter } = route
  const [menuOpen, setMenuOpen] = useState(false)
  const menuActions = useRef<NonNullable<ComponentProps<typeof Select.Root>['actionsRef']>['current']>(null)

  const visibleNotes = filter === 'all' ? notes : notes.filter((n) => n.tags.includes(filter))
  const notesLabel = FILTERS.find((f) => f.value === filter)!.label

  // Real routes: / · /work · /notes · /notes/writing · /notes/build-logs · /explorations
  // (<head> is kept in sync by App)

  const selectSection = (value: SectionId) => {
    // Notes keeps the last-used filter only via its own path; switching tabs goes to the section root
    if (value !== section) navigate({ section: value, filter: 'all' })
  }
  const selectFilter = (value: NoteFilter) => navigate({ section: 'notes', filter: value })

  // Swipe left/right on the content to move between tabs (same order as the tab bar)
  const ORDER: SectionId[] = ['work', 'notes', 'explorations']
  const at = ORDER.indexOf(section)

  // Direction (and whether it was a swipe) for the panel transition, worked out when the section changes.
  const thrownRef = useRef(false)
  const prevSection = useRef(section)
  const panelMotion = useRef<PanelMotion>({ dir: 1, thrown: false })
  if (prevSection.current !== section) {
    panelMotion.current = { dir: at > ORDER.indexOf(prevSection.current) ? 1 : -1, thrown: thrownRef.current }
    thrownRef.current = false
    prevSection.current = section
  }
  const reduced = useReducedMotion() ?? false
  const panelCustom = { ...panelMotion.current, still: reduced }

  // The panel on screen hands its drag offset to the swipe gesture.
  const activeX = useRef<MotionValue<number> | null>(null)
  const registerPanel = useRef((x: MotionValue<number>) => {
    activeX.current = x
    return () => {
      if (activeX.current === x) activeX.current = null
    }
  }).current

  const swipe = useSwipeTabs({
    panel: () => activeX.current,
    canGo: (dir) => at + dir >= 0 && at + dir < ORDER.length,
    go: (dir, thrown) => {
      thrownRef.current = thrown
      navigate({ section: ORDER[at + dir], filter: 'all' })
    },
    // underline stretches toward the tab you're dragging to, and snaps back if you don't switch
    onDrag: (rawX) => {
      const list = listRef.current
      if (list) rubber.current?.pull(rawX < 0 ? 1 : -1, Math.abs(rawX) * 0.6, list.clientWidth)
    },
    onRelease: () => rubber.current?.release(),
  })

  // ---- rubber underline ----
  const listRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLSpanElement>(null)
  const notesUnitRef = useRef<HTMLSpanElement>(null)
  const rubber = useRef<RubberIndicator | null>(null)
  const firstPaint = useRef(true)
  const sectionRef = useRef(section)
  sectionRef.current = section

  /** Active tab's edges in list coordinates (Notes includes its chevron). */
  const activeEdges = () => {
    const tab = listRef.current?.querySelector<HTMLElement>(`[data-section="${sectionRef.current}"]`)
    if (!tab) return null
    return { left: tab.offsetLeft, right: tab.offsetLeft + tab.offsetWidth }
  }

  useEffect(() => () => rubber.current?.destroy(), [])

  // Place on first paint; travel (or resize, when the Notes label changes) after that.
  useLayoutEffect(() => {
    const edges = activeEdges()
    if (!edges || !barRef.current) return
    rubber.current ??= new RubberIndicator(barRef.current)
    if (firstPaint.current) rubber.current.place(edges.left, edges.right)
    else rubber.current.select(edges.left, edges.right)
    firstPaint.current = false
  }, [section, filter])

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    let first = true
    const ro = new ResizeObserver(() => {
      if (first) return void (first = false)
      const edges = activeEdges()
      if (edges) rubber.current?.place(edges.left, edges.right)
    })
    ro.observe(list)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Tabs.Root
      value={section}
      onValueChange={(v) => selectSection(v as SectionId)}
      className="enter flex flex-col gap-4"
      style={{ '--i': index } as CSSProperties}
    >
      <Tabs.List
        ref={listRef}
        aria-label="Portfolio sections"
        className="section-tabs"
        onPointerMove={(e) => {
          if (e.pointerType !== 'mouse' || menuOpen) return
          const list = e.currentTarget.getBoundingClientRect()
          rubber.current?.follow(e.clientX - list.left, list.width)
        }}
        onPointerLeave={() => rubber.current?.release()}
      >
        <Tabs.Tab
          value="work"
          id="tab-work"
          aria-controls="panel-work"
          className="section-tab"
          data-section="work"
          nativeButton={false}
          render={<a href="/work" onClick={spaClick} />}
          onClick={() => {
            // on the homepage Work is already active, so the tab change won't fire — go to /work
            if (route.home) navigate({ section: 'work', filter: 'all' })
          }}
        >
          Work
          <sup>{projects.length}</sup>
        </Tabs.Tab>

        {/* Notes tab + its filter chevron move as one unit, like a Twitter tab with a menu */}
        <span ref={notesUnitRef} className="section-unit" data-section="notes">
          <Tabs.Tab
            value="notes"
            id="tab-notes"
            aria-controls="panel-notes"
            className="section-tab"
            nativeButton={false}
            render={<a href={pathFor({ section: 'notes', filter })} onClick={spaClick} />}
            onClick={() => {
              // already on Notes → clicking the tab opens the filter
              if (section === 'notes') setMenuOpen(true)
            }}
          >
            {notesLabel}
            <sup>{visibleNotes.length}</sup>
          </Tabs.Tab>
          <Select.Root
            value={filter}
            items={FILTERS}
            onValueChange={(v) => selectFilter(v as NoteFilter)}
            open={menuOpen}
            actionsRef={menuActions}
            onOpenChange={(open, details) => {
              // the menu plays its own close animation, then unmounts (see Select.Popup below)
              if (!open) details.preventUnmountOnClose()
              setMenuOpen(open)
              if (open) rubber.current?.release()
            }}
          >
            {/* Invisible value laid exactly over the tab label: Base UI aligns the selected
                option with it, so the menu opens over the tab like a native select */}
            <Select.Value aria-hidden className="tab-select-value" />
            <Select.Trigger className="tab-chevron" aria-label="Filter notes">
              <m.span
                aria-hidden
                style={{ display: 'grid' }}
                initial={false}
                animate={{ rotate: menuOpen ? 180 : 0 }}
                transition={springs.turn}
              >
                <ChevronDown size={14} strokeWidth={1.75} />
              </m.span>
            </Select.Trigger>
            <Select.Portal>
              <Select.Positioner alignItemWithTrigger className="ui-select-positioner">
                <Select.Popup
                  className="ui-select-popup tab-select-popup"
                  render={
                    <m.div
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={menuOpen ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.96 }}
                      transition={menuOpen ? springs.pop : { duration: 0.1, ease: easeOutQuint }}
                      onAnimationComplete={() => {
                        if (!menuOpen) menuActions.current?.unmount()
                      }}
                    />
                  }
                >
                  <Select.List>
                    {FILTERS.map((f) => {
                      const count = f.value === 'all' ? notes.length : notes.filter((n) => n.tags.includes(f.value as NoteTag)).length
                      return (
                        <Select.Item key={f.value} value={f.value} className="ui-select-item">
                          <Select.ItemText>{f.label}</Select.ItemText>
                          <span className="flex items-center gap-2">
                            <span className="text-xs text-faint tabular-nums">{count}</span>
                            {/* fixed slot so counts line up whether or not the row is checked */}
                            <span className="grid w-3 place-items-center">
                            <Select.ItemIndicator className="ui-select-check">
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                                <path d="M2.5 6.5l2.25 2.25L9.5 3.75" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </Select.ItemIndicator>
                            </span>
                          </span>
                        </Select.Item>
                      )
                    })}
                  </Select.List>
                </Select.Popup>
              </Select.Positioner>
            </Select.Portal>
          </Select.Root>
        </span>

        <Tabs.Tab
          value="explorations"
          id="tab-explorations"
          aria-controls="panel-explorations"
          className="section-tab"
          data-section="explorations"
          nativeButton={false}
          render={<a href="/explorations" onClick={spaClick} />}
        >
          Explorations
          <sup>{explorations.length}</sup>
        </Tabs.Tab>

        <span ref={barRef} aria-hidden className="section-indicator" />
      </Tabs.List>

      {/* Panels are rendered here rather than with Tabs.Panel, so the outgoing one can animate out. */}
      <div className="tab-panels" {...swipe}>
        <AnimatePresence initial={false} custom={panelCustom}>
          <TabPanel key={section} value={section} motion={panelCustom} register={registerPanel}>
            {section === 'work' ? (
              <Projects items={projects} />
            ) : section === 'notes' ? (
              <Notes filter={filter} items={visibleNotes} />
            ) : (
              <Explorations />
            )}
          </TabPanel>
        </AnimatePresence>
      </div>
    </Tabs.Root>
  )
}
