import { useSyncExternalStore } from 'react'
import { parseRoute, pathFor, routeMeta, type Route } from './seo'

/** Tiny pathname router: pushState navigation + back/forward, no library needed for a few routes. */
const listeners = new Set<() => void>()

function subscribe(cb: () => void) {
  listeners.add(cb)
  window.addEventListener('popstate', cb)
  return () => {
    listeners.delete(cb)
    window.removeEventListener('popstate', cb)
  }
}

export function navigate(route: Route, { replace = false } = {}) {
  const path = pathFor(route)
  if (path === window.location.pathname) return
  const pageChange = !!route.note || !!parseRoute(window.location.pathname)?.note
  window.history[replace ? 'replaceState' : 'pushState'](null, '', path)
  listeners.forEach((l) => l())
  // opening or leaving a note is a new page: start at the top
  if (pageChange) window.scrollTo(0, 0)
}

export function useRoute(): Route {
  const pathname = useSyncExternalStore(subscribe, () => window.location.pathname)
  return parseRoute(pathname) ?? { section: 'work', filter: 'all', home: true }
}

/** Keep <title> and the description in sync after client-side navigation. */
export function applyHead(route: Route) {
  const { title, description } = routeMeta(route)
  document.title = title
  document.querySelector('meta[name="description"]')?.setAttribute('content', description)
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', title)
  document.querySelector('meta[property="og:description"]')?.setAttribute('content', description)
}

/** Old ?section=notes&tag=… links and unknown paths → the real route. */
export function normalizeInitialUrl() {
  const q = new URLSearchParams(window.location.search)
  if (q.has('section') || q.has('tag')) {
    const tag = q.get('tag')
    const legacy = q.get('section') === 'notes'
      ? parseRoute(tag ? `/notes/${tag === 'build-log' ? 'build-logs' : tag}` : '/notes') ?? { section: 'notes' as const, filter: 'all' as const }
      : { section: 'work' as const, filter: 'all' as const, home: true }
    window.history.replaceState(null, '', pathFor(legacy))
  } else if (!parseRoute(window.location.pathname)) {
    window.history.replaceState(null, '', '/')
  }
}
