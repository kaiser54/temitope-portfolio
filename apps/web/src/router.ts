import { useSyncExternalStore } from 'react'
import { flushSync } from 'react-dom'
import { morphNote } from './noteMorph'
import { NOT_FOUND, parseRoute, pathFor, routeMeta, type Route } from './seo'

/** Tiny pathname router: pushState navigation + back/forward, no library needed for a few routes. */
const listeners = new Set<() => void>()
let lastPath: string | null = null

/** Re-render subscribers now, so a view transition can snapshot the new page. */
const notify = () => flushSync(() => listeners.forEach((l) => l()))

/**
 * Every route change goes through here. Opening or leaving a note morphs the card into the page and back
 * (noteMorph.ts); note → note starts at the top; anything else just re-renders.
 */
function changeRoute(from: string, to: string, commit: () => void) {
  const a = parseRoute(from)?.note
  const b = parseRoute(to)?.note
  if (!a !== !b) return morphNote({ opening: b, closing: a, commit })
  commit()
  if (a && b) window.scrollTo(0, 0)
}

// Back / forward: the URL has already changed, so committing is just re-rendering.
function onPopState() {
  const from = lastPath ?? window.location.pathname
  lastPath = window.location.pathname
  changeRoute(from, lastPath, notify)
}

function subscribe(cb: () => void) {
  if (lastPath === null) {
    lastPath = window.location.pathname
    window.addEventListener('popstate', onPopState)
  }
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export function navigate(route: Route, { replace = false } = {}) {
  const path = pathFor(route)
  const from = window.location.pathname
  if (path === from) return
  changeRoute(from, path, () => {
    window.history[replace ? 'replaceState' : 'pushState'](null, '', path)
    lastPath = path
    notify()
  })
}

/** Path rendered at build time (scripts/prerender.ts); the browser always reads the real URL. */
let serverPath = '/'
export function setServerPath(path: string) {
  serverPath = path
}
const getPath = () => (typeof window === 'undefined' ? serverPath : window.location.pathname)

export function useRoute(): Route {
  const pathname = useSyncExternalStore(subscribe, getPath, getPath)
  return parseRoute(pathname) ?? NOT_FOUND
}

/** Keep <title> and the description in sync after client-side navigation. */
export function applyHead(route: Route) {
  const { title, description } = routeMeta(route)
  document.title = title
  document.querySelector('meta[name="description"]')?.setAttribute('content', description)
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', title)
  document.querySelector('meta[property="og:description"]')?.setAttribute('content', description)
}

/** Old ?section=notes&tag=… links → the real route. Returns true if the URL changed. */
export function normalizeInitialUrl(): boolean {
  const q = new URLSearchParams(window.location.search)
  if (q.has('section') || q.has('tag')) {
    const tag = q.get('tag')
    const legacy = q.get('section') === 'notes'
      ? parseRoute(tag ? `/notes/${tag === 'build-log' ? 'build-logs' : tag}` : '/notes') ?? { section: 'notes' as const, filter: 'all' as const }
      : { section: 'work' as const, filter: 'all' as const, home: true }
    window.history.replaceState(null, '', pathFor(legacy))
    return true
  }
  return false
}
