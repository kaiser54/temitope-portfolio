import { m } from 'motion/react'
import { useEffect, useRef } from 'react'
import { NOTE_TAGS, type Note, type NoteTag } from '../content'
import { easeOutQuint } from '../motion'
import type { NoteFilter } from './SectionTabs'
import { navigate } from '../router'

const tagLabel = (t: NoteTag) => NOTE_TAGS.find((x) => x.value === t)?.label ?? t

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(iso))

/** Filtered list of notes; the filter itself lives in the Notes tab (see SectionTabs). */
export function Notes({ filter, items: visible }: { filter: NoteFilter; items: Note[] }) {
  // Ease the list in when the filter changes, but not on first render (the page / tab is already animating
  // in, and prerendered HTML must not start invisible).
  const mounted = useRef(false)
  useEffect(() => {
    mounted.current = true
  }, [])

  const emptyLabel =
    filter === 'all' ? 'notes' : (NOTE_TAGS.find((t) => t.value === filter)?.plural ?? '').toLowerCase()

  return (
    <div className="flex flex-col gap-3">
      {/* keyed by filter so the list eases in on each change */}
      <m.div
        key={filter}
        initial={mounted.current ? { opacity: 0, y: 3, filter: 'blur(2px)' } : false}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.22, ease: easeOutQuint }}
      >
        {visible.length === 0 ? (
          <p className="py-2.5 text-muted">No {emptyLabel} yet — on the way.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {visible.map((n) => {
              const body = (
                <>
                  <span className="text-sm text-faint tabular-nums sm:pt-px">{n.date ? formatDate(n.date) : 'Soon'}</span>
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                      <span className="font-medium">{n.title}</span>
                      <span className="text-sm text-faint">{n.tags.map(tagLabel).join(' · ')}</span>
                    </span>
                    {n.summary && <span className="text-pretty text-muted">{n.summary}</span>}
                  </span>
                </>
              )
              const row = 'note-row grid gap-1 py-2.5 sm:grid-cols-[4.5rem_1fr] sm:gap-0'
              return (
                <li key={n.title}>
                  {n.slug ? (
                    <a
                      href={`/notes/${n.slug}`}
                      className={`${row} note-link`}
                      onClick={(e) => {
                        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
                        e.preventDefault()
                        navigate({ section: 'notes', filter: 'all', note: n.slug })
                      }}
                    >
                      {body}
                    </a>
                  ) : n.href ? (
                    <a href={n.href} className={`${row} note-link`}>
                      {body}
                    </a>
                  ) : (
                    <div className={row} aria-disabled>
                      {body}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </m.div>
    </div>
  )
}
