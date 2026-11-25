import { m } from 'motion/react'
import { lazy, Suspense, useEffect, useRef, useState, type ComponentType, type LazyExoticComponent } from 'react'
import { NOTE_TAGS, type Note, type NoteTag } from '../content'
import { easeOutQuint } from '../motion'
import type { NoteFilter } from './SectionTabs'
import { navigate } from '../router'

/**
 * Animated thumbnails for note cards, by slug (stageshow scenes, components/thumbs). Each is its own chunk,
 * loaded after hydration, so the kit never reaches the main bundle or the prerendered HTML.
 */
const THUMBS: Record<string, LazyExoticComponent<ComponentType>> = {
  'theme-switcher': lazy(() => import('./thumbs/ThemeSwitchThumb')),
}

function NoteThumb({ slug }: { slug: string }) {
  const Thumb = THUMBS[slug]
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!Thumb) return null
  const hold = <span className="note-card-thumb-hold" />
  return (
    <span className="note-card-thumb" aria-hidden>
      {mounted ? <Suspense fallback={hold}>{<Thumb />}</Suspense> : hold}
    </span>
  )
}

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
          <ul className="flex flex-col gap-2">
            {visible.map((n) => {
              const body = (
                <>
                  {n.slug && <NoteThumb slug={n.slug} />}
                  <span className="note-card-title">{n.title}</span>
                  {n.summary && <span className="note-card-summary">{n.summary}</span>}
                  <span className="note-card-meta">
                    {n.date ? formatDate(n.date) : 'Soon'} · {n.tags.map(tagLabel).join(' · ')}
                  </span>
                </>
              )
              return (
                <li key={n.title}>
                  {n.slug ? (
                    // Opens with a morph: this card grows into the note's page (noteMorph.ts)
                    <a
                      href={`/notes/${n.slug}`}
                      className="note-card"
                      data-note-slug={n.slug}
                      onClick={(e) => {
                        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
                        e.preventDefault()
                        navigate({ section: 'notes', filter: 'all', note: n.slug })
                      }}
                    >
                      {body}
                    </a>
                  ) : n.href ? (
                    <a href={n.href} className="note-card">
                      {body}
                    </a>
                  ) : (
                    <div className="note-card" aria-disabled>
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
