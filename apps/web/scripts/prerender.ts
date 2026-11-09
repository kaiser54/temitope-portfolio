/**
 * Post-build: write a static HTML entry per route so each URL ships its own <title>,
 * description and social tags in the initial HTML (good for search + link previews).
 *
 *   dist/index.html                → /
 *   dist/notes.html                → /notes
 *   dist/notes/<tag-slug>.html     → /notes/writing, /notes/build-logs
 *
 * Flat files + `cleanUrls` (vercel.json) serve /notes without a trailing slash or redirect.
 *
 * Absolute URLs (canonical, og:url, og:image, sitemap.xml, robots.txt) use SITE_URL, which
 * defaults to the production domain. Override it for another host (e.g. a preview).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { contact, notes, profile } from '../src/content.ts'
import { ALL_ROUTES, pathFor, routeMeta } from '../src/seo.ts'

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const template = readFileSync(join(dist, 'index.html'), 'utf8')
const site = (process.env.SITE_URL || 'https://temitopeagboola.com').replace(/\/+$/, '')

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

for (const route of ALL_ROUTES) {
  const path = pathFor(route)
  const { title, description } = routeMeta(route)
  // /work shows the same content as the homepage, so it points search engines at /.
  const canonicalPath = path === '/work' ? '/' : path
  const url = `${site}${canonicalPath}`
  const note = route.note ? notes.find((n) => n.slug === route.note) : undefined

  // Share image (public/og.png, 1200×630). Link previews need an absolute URL.
  const image = `${site}/og.png`
  const jsonLd = route.home ? personLd() : note ? articleLd(note, title, description, url) : null
  const tags = [
    `<meta property="og:type" content="${note ? 'article' : 'website'}" />`,
    `<meta property="og:site_name" content="Temitope Agboola" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="Temitope Agboola, Frontend &amp; Product Engineer" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:image" content="${image}" />`,
    `<meta name="twitter:creator" content="@kaiser_major" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:url" content="${url}" />`,
    note?.date && `<meta property="article:published_time" content="${note.date}" />`,
    jsonLd && `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`,
  ].filter(Boolean)

  const html = template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta\s+name="description"[\s\S]*?\/>/, `<meta name="description" content="${esc(description)}" />`)
    .replace('</head>', `    ${tags.join('\n    ')}\n  </head>`)

  const out = path === '/' ? join(dist, 'index.html') : join(dist, `${path.slice(1)}.html`)
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, html)
  console.log(`prerendered ${path.padEnd(20)} ${title}`)
}

const urls = ALL_ROUTES.filter((r) => pathFor(r) !== '/work').map((r) => {
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
      },
      { '@type': 'WebSite', '@id': `${site}/#website`, url: `${site}/`, name: profile.name, publisher: { '@id': `${site}/#person` } },
    ],
  }
}

function articleLd(note: (typeof notes)[number], title: string, description: string, url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: note.title,
    name: title,
    description,
    url,
    mainEntityOfPage: url,
    image: `${site}/og.png`,
    ...(note.date && { datePublished: note.date, dateModified: note.date }),
    author: { '@type': 'Person', name: profile.name, url: `${site}/` },
  }
}
