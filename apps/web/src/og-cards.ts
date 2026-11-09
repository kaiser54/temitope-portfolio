/**
 * Share-image cards for inner pages: which pages get one, what they say, and how they're laid out.
 * One source for all three users:
 *   - scripts/og-images.ts renders each card to a PNG,
 *   - scripts/prerender.ts points each page's og:image at its PNG,
 *   - og-preview.html shows them live in messenger mock-ups while you design.
 * No Node imports here, so it runs in the browser too.
 */
import { NOTE_TAGS, explorations, notes, profile, projects } from './content.ts'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** Where a page's image lives, relative to public/. Shared with prerender.ts. */
export const ogPathFor = (path: string) => {
  const note = path.match(/^\/notes\/([^/]+)$/)?.[1]
  if (note && notes.some((n) => n.slug === note)) return `/og/notes/${note}.png`
  return `/og/pages/${path.slice(1).replace(/\//g, '-')}.png`
}

const datedNotes = (tag?: string) => notes.filter((n) => n.date && (!tag || n.tags.includes(tag as never))).length

export type OgCard = { path: string; title: string; byline: string }
export const ogCards: OgCard[] = [
  { path: '/work', title: 'Work', byline: `${profile.name} · ${plural(projects.length, 'project')}` },
  { path: '/notes', title: 'Notes', byline: `${profile.name} · writing and build logs` },
  ...NOTE_TAGS.map((t) => ({
    path: `/notes/${t.slug}`,
    title: t.plural,
    byline: `${profile.name} · ${plural(datedNotes(t.value), 'note')}`,
  })),
  {
    path: '/explorations',
    title: 'Explorations',
    byline: `${profile.name} · ${plural(explorations.length, 'interaction experiment')}`,
  },
  ...notes
    .filter((n) => n.slug)
    .map((n) => ({ path: `/notes/${n.slug}`, title: n.title, byline: `${profile.name} · Notes` })),
]

/** The card as a standalone 1200×630 HTML document. */
export const ogCardHtml = ({ title, byline }: OgCard) => `<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 630px; overflow: hidden; background: #f9f9f9; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif;
         -webkit-font-smoothing: antialiased; }
  .note { position: absolute; left: 80px; right: 120px; bottom: 84px; }
  b { display: block; font-size: 58px; font-weight: 500; line-height: 1.15; letter-spacing: -0.01em; color: #595959; }
  p { margin-top: 18px; font-size: 40px; font-weight: 400; color: #8d8d8d; }
</style></head><body><div class="note"><b>${esc(title)}</b><p>${esc(byline)}</p></div></body></html>`
