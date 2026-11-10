/**
 * Post-build: write a static HTML entry per route so each URL ships its own <title>,
 * description and social tags in the initial HTML (good for search + link previews).
 *
 *   dist/index.html                → /
 *   dist/notes.html                → /notes
 *   dist/notes/<tag-slug>.html     → /notes/writing, /notes/build-logs
 *   dist/404.html                  → any other path (served with a 404 status)
 *
 * Each file also contains the page's rendered HTML (from the SSR build of src/entry-server.tsx),
 * so crawlers and link previews see the content without running JavaScript.
 *
 * Flat files + `cleanUrls` (vercel.json) serve /notes without a trailing slash or redirect.
 *
 * Absolute URLs (canonical, og:url, og:image, sitemap.xml, robots.txt) use SITE_URL, which
 * defaults to the production domain. Override it for another host (e.g. a preview).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { companies, contact, notes, profile } from '../src/content.ts'
import { ALL_ROUTES, NOT_FOUND, pathFor, routeMeta } from '../src/seo.ts'
import { ogPathFor } from '../src/og-cards.ts'
// @ts-expect-error built by `vite build --ssr` just before this script runs
import { render } from '../dist-server/entry-server.js'

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const template = readFileSync(join(dist, 'index.html'), 'utf8')
const site = (process.env.SITE_URL || 'https://temitopeagboola.com').replace(/\/+$/, '')

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

for (const route of [...ALL_ROUTES, NOT_FOUND]) {
  const path = pathFor(route)
  const { title, description } = routeMeta(route)
  // /work shows the same content as the homepage, so it points search engines at /.
  const canonicalPath = path === '/work' ? '/' : path
  // /notes/writing, /notes/build-logs: thin filtered copies of /notes. Google may follow them but shouldn't list
  // them (they were outranking real pages with the header as their snippet).
  const filterPage = route.section === 'notes' && route.filter !== 'all' && !route.note
  const url = `${site}${canonicalPath}`
  const note = route.note ? notes.find((n) => n.slug === route.note) : undefined

  // Share image (1200×630): the page's own (public/og/pages|notes/…, made by scripts/og-images.ts), or the
  // homepage's public/og.png. Link previews need an absolute URL.
  const own = route.home || route.notFound ? null : ogPathFor(path)
  const image = `${site}${own && existsSync(join(dist, own)) ? own : '/og.png'}`
  const jsonLd = route.home ? personLd() : note ? articleLd(note, title, description, url, image) : null
  const tags = [
    `<meta property="og:type" content="${note ? 'article' : 'website'}" />`,
    `<meta property="og:site_name" content="Temitope Agboola" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${image.endsWith('/og.png') ? 'Temitope Agboola, Frontend &amp; Product Engineer' : esc(title)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:image" content="${image}" />`,
    `<meta name="twitter:creator" content="@kaiser_major" />`,
    route.notFound
      ? `<meta name="robots" content="noindex" />`
      : filterPage
        ? `<meta name="robots" content="noindex, follow" />` // no canonical: don't send mixed signals
        : `<link rel="canonical" href="${url}" />`,
    !route.notFound && `<meta property="og:url" content="${url}" />`,
    note?.date && `<meta property="article:published_time" content="${note.date}" />`,
    jsonLd && `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`,
  ].filter(Boolean)

  const html = template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta\s+name="description"[\s\S]*?\/>/, `<meta name="description" content="${esc(description)}" />`)
    .replace('</head>', `    ${tags.join('\n    ')}\n  </head>`)
    .replace('<div id="root"></div>', () => `<div id="root">${render(path)}</div>`)

  const out = path === '/' ? join(dist, 'index.html') : join(dist, `${path.slice(1)}.html`)
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, html)
  console.log(`prerendered ${path.padEnd(20)} ${title}`)
}

const listed = (r: (typeof ALL_ROUTES)[number]) =>
  pathFor(r) !== '/work' && !(r.section === 'notes' && r.filter !== 'all' && !r.note)
const urls = ALL_ROUTES.filter(listed).map((r) => {
  const date = r.note && notes.find((n) => n.slug === r.note)?.date
  return `  <url><loc>${site}${pathFor(r)}</loc>${date ? `<lastmod>${date}</lastmod>` : ''}</url>`
})
writeFileSync(
  join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
)
writeFileSync(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`)
console.log(`wrote sitemap.xml and robots.txt for ${site}`)

/** Structured data for the homepage: who this site is about, and the profiles that are also them. */
function personLd() {
  const sameAs = contact.flatMap((c) => c.links.map((l) => l.href)).filter((h) => h.startsWith('https://'))
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        '@id': `${site}/#person`,
        name: profile.name,
        jobTitle: profile.role,
        url: `${site}/`,
        image: `${site}/avatar.jpg`,
        address: { '@type': 'PostalAddress', addressLocality: 'Lagos', addressCountry: 'NG' },
        sameAs,
        worksFor: (['quality', 'passpoint'] as const).map((k) => ({
          '@type': 'Organization',
          name: companies[k].name,
          url: companies[k].href,
        })),
        knowsAbout: ['Frontend engineering', 'React', 'TypeScript', 'Interface design', 'Fintech', 'Payments', 'E-commerce'],
      },
      { '@type': 'WebSite', '@id': `${site}/#website`, url: `${site}/`, name: profile.name, publisher: { '@id': `${site}/#person` } },
    ],
  }
}

function articleLd(note: (typeof notes)[number], title: string, description: string, url: string, image: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: note.title,
    name: title,
    description,
    url,
    mainEntityOfPage: url,
    image,
    ...(note.date && { datePublished: note.date, dateModified: note.date }),
    author: { '@type': 'Person', name: profile.name, url: `${site}/` },
  }
}
