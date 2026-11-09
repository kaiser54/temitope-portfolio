/**
 * Routes and per-route metadata. Shared by the app (client-side navigation + <head> updates)
 * and scripts/prerender.ts (writes a static HTML file per route at build time).
 * Imports use the .ts extension so Node can run this file directly.
 */
import { NOTE_TAGS, explorations, notes, profile, projects, type NoteTag } from './content.ts'

export type Section = 'work' | 'explorations' | 'notes'
export type NoteFilter = 'all' | NoteTag
/** `home` marks the bare homepage (/), which shows Work but has its own URL and metadata. */
export type Route = { section: Section; filter: NoteFilter; home?: boolean; note?: string }

export function parseRoute(pathname: string): Route | null {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === '/') return { section: 'work', filter: 'all', home: true }
  if (path === '/work') return { section: 'work', filter: 'all' }
  if (path === '/explorations') return { section: 'explorations', filter: 'all' }
  if (path === '/notes') return { section: 'notes', filter: 'all' }
  const m = path.match(/^\/notes\/([^/]+)$/)
  if (!m) return null
  const tag = NOTE_TAGS.find((t) => t.slug === m[1])
  if (tag) return { section: 'notes', filter: tag.value }
  const note = notes.find((n) => n.slug === m[1])
  return note ? { section: 'notes', filter: 'all', note: note.slug } : null
}

export function pathFor({ section, filter, home, note }: Route): string {
  if (note) return `/notes/${note}`
  if (section === 'work') return home ? '/' : '/work'
  if (section === 'explorations') return '/explorations'
  if (filter === 'all') return '/notes'
  return `/notes/${NOTE_TAGS.find((t) => t.value === filter)!.slug}`
}

export const ALL_ROUTES: Route[] = [
  { section: 'work', filter: 'all', home: true },
  { section: 'work', filter: 'all' },
  { section: 'explorations', filter: 'all' },
  { section: 'notes', filter: 'all' },
  ...NOTE_TAGS.map((t) => ({ section: 'notes' as const, filter: t.value })),
  ...notes.filter((n) => n.slug).map((n) => ({ section: 'notes' as const, filter: 'all' as const, note: n.slug })),
]

export function routeMeta(route: Route): { title: string; description: string } {
  const name = profile.name
  if (route.note) {
    const n = notes.find((x) => x.slug === route.note)!
    return { title: `${n.title} — ${name}`, description: n.summary ?? n.title }
  }
  if (route.section === 'work' && !route.home) {
    const names = projects.map((p) => p.name)
    return {
      title: `Work — ${name}`,
      description: `Selected work by ${name}: ${names.slice(0, -1).join(', ')} and ${names.at(-1)} — fintech, commerce and procurement products.`,
    }
  }
  if (route.section === 'explorations') {
    return {
      title: `Explorations — ${name}`,
      description: `Interaction experiments by ${name}: ${explorations.map((x) => x.title.toLowerCase()).join(', ')}.`,
    }
  }
  if (route.section === 'work') {
    return {
      title: `${name} — ${profile.role}`,
      description: `${name} is a ${profile.role.toLowerCase()} in ${profile.location} building fintech, commerce and procurement products.`,
    }
  }
  if (route.filter === 'all') {
    return {
      title: `Notes — ${name}`,
      description: `Writing and build logs by ${name} on frontend engineering, interface details and the decisions behind them.`,
    }
  }
  const tag = NOTE_TAGS.find((t) => t.value === route.filter)!
  return {
    title: `${tag.plural} — ${name}`,
    description: `${tag.plural} by ${name}: notes on frontend engineering and the decisions behind the work.`,
  }
}
