import { CodeXml, FileText, Link } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { CopyIconButton, IconLink } from './IconButton'
import { useEnterClass } from '../noteMorph'
import { notes } from '../content'
import { navigate } from '../router'
import { AskAiNote } from '../notes/AskAiNote'
import { THEME_SWITCHER_PROMPT, ThemeSwitcherNote } from '../notes/ThemeSwitcherNote'

const REPO = 'https://github.com/kaiser54/temitope-portfolio'

/** Note bodies by slug, with the agent prompt behind Copy Prompt and the code behind View Source. */
const BODIES: Record<string, { Body: () => ReactNode; prompt?: string; source: string }> = {
  'theme-switcher': {
    Body: ThemeSwitcherNote,
    prompt: THEME_SWITCHER_PROMPT,
    source: `${REPO}/blob/main/apps/web/src/components/RollingText.tsx`,
  },
  'ask-ai': { Body: AskAiNote, source: `${REPO}/tree/main/packages/ui/src/components/ask-ai` },
}

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(iso))

export function NotePage({ slug }: { slug: string }) {
  const note = notes.find((n) => n.slug === slug)
  const entry = BODIES[slug]
  // Arriving by morph, the card is the entrance: skip the page's own fade-up.
  const enter = useEnterClass()
  if (!note || !entry) return null
  const { Body, prompt, source } = entry

  return (
    <article className="relative flex flex-col gap-8">
      {/* What the list card grows into (and shrinks back from): see noteMorph.ts */}
      <div className="note-sheet" aria-hidden />
      <header className={`${enter} flex flex-col gap-6`} style={{ '--i': 0 } as CSSProperties}>
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
        <div className="note-head">
          <div>
            <h1 className="note-title text-pretty">{note.title}</h1>
            {note.date ? (
              <time className="text-muted" dateTime={note.date}>
                {formatDate(note.date)}
              </time>
            ) : (
              <p className="text-muted">Draft</p>
            )}
          </div>
          <div className="note-actions">
            {prompt && <CopyIconButton label="Copy Prompt" text={() => prompt} icon={<FileText size={16} strokeWidth={1.75} aria-hidden />} />}
            <CopyIconButton
              label="Copy Link"
              text={() => window.location.origin + window.location.pathname}
              icon={<Link size={16} strokeWidth={1.75} aria-hidden />}
            />
            <IconLink href={source} label="View Source">
              <CodeXml size={16} strokeWidth={1.75} aria-hidden />
            </IconLink>
          </div>
        </div>
      </header>
      <div className={`note-body ${enter}`} style={{ '--i': 1 } as CSSProperties}>
        <Body />
        <p className="note-source">
          Source:{' '}
          <a href={source} target="_blank" rel="noreferrer">
            GitHub
          </a>
        </p>
      </div>
    </article>
  )
}
