/**
 * Dev-only: render a share image per note to public/og/notes/<slug>.png (1200×630).
 * Same "corner note" look as public/og.png, with the note's title in place of the name.
 *
 *   node scripts/og-notes.ts            # only notes that don't have an image yet
 *   node scripts/og-notes.ts --force    # re-render all
 *
 * Needs Google Chrome installed locally (set CHROME to override the path). The images are
 * committed; the build (scripts/prerender.ts) uses one if it exists and falls back to og.png.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { notes, profile } from '../src/content.ts'

const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'og', 'notes')
const force = process.argv.includes('--force')
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

mkdirSync(outDir, { recursive: true })
const tmp = mkdtempSync(join(tmpdir(), 'og-notes-'))

for (const note of notes) {
  if (!note.slug) continue
  const out = join(outDir, `${note.slug}.png`)
  if (existsSync(out) && !force) continue

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    * { margin: 0; box-sizing: border-box; }
    html, body { width: 1200px; height: 630px; overflow: hidden; background: #f9f9f9; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif;
           -webkit-font-smoothing: antialiased; }
    .note { position: absolute; left: 80px; right: 120px; bottom: 84px; }
    b { display: block; font-size: 58px; font-weight: 500; line-height: 1.15; letter-spacing: -0.01em; color: #595959; }
    p { margin-top: 18px; font-size: 40px; font-weight: 400; color: #8d8d8d; }
  </style></head><body><div class="note"><b>${esc(note.title)}</b><p>${esc(profile.name)} · Notes</p></div></body></html>`

  const page = join(tmp, `${note.slug}.html`)
  writeFileSync(page, html)
  execFileSync(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--window-size=1200,630',
    `--screenshot=${out}`,
    `file://${page}`,
  ], { stdio: 'ignore' })
  console.log(`wrote public/og/notes/${note.slug}.png`)
}

rmSync(tmp, { recursive: true, force: true })
