/**
 * Dev-only: render a share image (1200×630) for every inner page.
 *
 *   public/og/pages/<key>.png   sections and note filters (/work → work, /notes/build-logs → notes-build-logs)
 *   public/og/notes/<slug>.png  each note
 *
 * The cards themselves (pages, wording, layout) live in src/og-cards.ts; preview them in og-preview.html.
 *
 *   pnpm og:images            # only pages that don't have an image yet
 *   pnpm og:images --force    # re-render all
 *
 * Needs Google Chrome installed locally (set CHROME to override the path). The images are committed;
 * the build (scripts/prerender.ts) uses a page's own image if it exists and falls back to og.png.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ogCardHtml, ogCards, ogPathFor } from '../src/og-cards.ts'

const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')
const force = process.argv.includes('--force')

const tmp = mkdtempSync(join(tmpdir(), 'og-images-'))
for (const card of ogCards) {
  const rel = ogPathFor(card.path)
  const out = join(publicDir, rel)
  if (existsSync(out) && !force) continue
  mkdirSync(dirname(out), { recursive: true })
  const page = join(tmp, 'card.html')
  writeFileSync(page, ogCardHtml(card))
  execFileSync(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--window-size=1200,630',
      `--screenshot=${out}`,
      `file://${page}`,
    ],
    { stdio: 'ignore' },
  )
  console.log(`wrote public${rel}  (${card.title})`)
}
rmSync(tmp, { recursive: true, force: true })
