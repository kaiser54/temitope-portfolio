import type { CSSProperties, ReactNode } from 'react'
import { NOTE_TAGS, notes } from '../content'
import { navigate } from '../router'
import { ThemeSwitcherNote } from '../notes/ThemeSwitcherNote'

/** Note bodies by slug. */
const BODIES: Record<string, () => ReactNode> = {
  'theme-switcher': ThemeSwitcherNote,
}

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso))

export function NotePage({ slug }: { slug: string }) {
  const note = notes.find((n) => n.slug === slug)
  const Body = BODIES[slug]
  if (!note || !Body) return null
  const tags = note.tags.map((t) => NOTE_TAGS.find((x) => x.value === t)?.label ?? t).join(' · ')

  return (
    <article className="flex flex-col gap-10">
      <header className="enter flex flex-col gap-6" style={{ '--i': 0 } as CSSProperties}>
        <a
          href="/notes"
          className="note-back"
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
            e.preventDefault()
            navigate({ section: 'notes', filter: 'all' })
          }}
        >
          ← Notes
        </a>
        <div>
          <h1 className="font-medium text-pretty">{note.title}</h1>
          <p className="text-faint">
            {note.date && <time dateTime={note.date}>{formatDate(note.date)}</time>}
            {tags && ` · ${tags}`}
          </p>
        </div>
      </header>
      <div className="note-body enter" style={{ '--i': 1 } as CSSProperties}>
        <Body />
      </div>
    </article>
  )
}
