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
 * Set SITE_URL (e.g. SITE_URL=https://yourdomain.com) to also emit canonical/og:url,
 * sitemap.xml and robots.txt.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ALL_ROUTES, pathFor, routeMeta } from '../src/seo.ts'

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const template = readFileSync(join(dist, 'index.html'), 'utf8')
const site = process.env.SITE_URL?.replace(/\/+$/, '')

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

for (const route of ALL_ROUTES) {
  const path = pathFor(route)
  const { title, description } = routeMeta(route)
  const url = site ? `${site}${path === '/' ? '/' : path}` : null

  // Share image (public/og.png, 1200×630). Link previews need an absolute URL, so it's only
  // fully reliable once SITE_URL is set; without it a root-relative path is used as a fallback.
  const image = `${site ?? ''}/og.png`
  const tags = [
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Temitope Agboola" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="Temitope Agboola, Frontend &amp; Product Engineer" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:image" content="${image}" />`,
    url && `<link rel="canonical" href="${url}" />`,
    url && `<meta property="og:url" content="${url}" />`,
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

if (site) {
  const urls = ALL_ROUTES.map((r) => `  <url><loc>${site}${pathFor(r)}</loc></url>`).join('\n')
  writeFileSync(
    join(dist, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
  )
  writeFileSync(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`)
  console.log('wrote sitemap.xml and robots.txt')
} else {
  console.log('SITE_URL not set — skipped canonical URLs, sitemap.xml and robots.txt')
}
