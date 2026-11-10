/**
 * Dev-only: render the site's icons from the avatar, round with transparent corners.
 *
 *   public/favicon.ico        16, 32 and 48px in one file (what /favicon.ico fetchers, and Google, ask for)
 *   public/favicon.png        96px  (rel="icon"; Google wants a multiple of 48px square)
 *   public/icon-192.png       192px (web app manifest, Android)
 *   public/icon-512.png       512px (web app manifest, splash / install)
 *
 * apple-touch-icon.png stays square: iOS rounds it itself and fills transparent corners with black.
 *
 *   pnpm icons
 *
 * Needs Google Chrome installed locally (set CHROME to override the path). The icons are committed.
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')
const source = join(publicDir, 'og-avatar.jpg') // 400px square photo
const tmp = mkdtempSync(join(tmpdir(), 'icons-'))
const photo = `data:image/jpeg;base64,${readFileSync(source).toString('base64')}`

/** One round icon, `size` px square, transparent outside the circle. */
function render(size: number): Buffer {
  const page = join(tmp, `icon-${size}.html`)
  const out = join(tmp, `icon-${size}.png`)
  writeFileSync(
    page,
    `<!doctype html><html><head><style>
      html, body { margin: 0; background: transparent; width: ${size}px; height: ${size}px; overflow: hidden; }
      img { display: block; width: ${size}px; height: ${size}px; border-radius: 50%; object-fit: cover; }
    </style></head><body><img src="${photo}"></body></html>`,
  )
  execFileSync(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--default-background-color=00000000',
      `--window-size=${size},${size}`,
      `--screenshot=${out}`,
      `file://${page}`,
    ],
    { stdio: 'ignore' },
  )
  return readFileSync(out)
}

/** An .ico holding PNG images (supported everywhere that matters since Windows Vista). */
function ico(images: { size: number; png: Buffer }[]): Buffer {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(images.length, 4)
  const entries: Buffer[] = []
  let offset = 6 + 16 * images.length
  for (const { size, png } of images) {
    const e = Buffer.alloc(16)
    e.writeUInt8(size >= 256 ? 0 : size, 0) // width
    e.writeUInt8(size >= 256 ? 0 : size, 1) // height
    e.writeUInt8(0, 2) // palette
    e.writeUInt8(0, 3) // reserved
    e.writeUInt16LE(1, 4) // colour planes
    e.writeUInt16LE(32, 6) // bits per pixel
    e.writeUInt32LE(png.length, 8)
    e.writeUInt32LE(offset, 12)
    offset += png.length
    entries.push(e)
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.png)])
}

const sizes = [16, 32, 48, 96, 192, 512]
const pngs = Object.fromEntries(sizes.map((s) => [s, render(s)])) as Record<number, Buffer>

writeFileSync(join(publicDir, 'favicon.ico'), ico([16, 32, 48].map((size) => ({ size, png: pngs[size] }))))
writeFileSync(join(publicDir, 'favicon.png'), pngs[96])
writeFileSync(join(publicDir, 'icon-192.png'), pngs[192])
writeFileSync(join(publicDir, 'icon-512.png'), pngs[512])
rmSync(tmp, { recursive: true, force: true })
console.log('wrote public/favicon.ico (16/32/48), favicon.png (96), icon-192.png, icon-512.png')
