/**
 * Shockwave halo.
 *
 * A faint halo of light grows from a point and fades out: four soft colour rings (Aurora), a lens that bends the
 * text under it a few px as it passes, a trace of colour split and, on a card, a glass bevel at its edges and a
 * glint along its outline. Two places use it, each a "region":
 *
 * - A project card (Work): from the point that was clicked, clipped to that project's card (read live each
 *   frame, so it follows the card opening or closing, never the hover highlight moving to other rows). A click on
 *   the row runs it for as long as the card takes to open (ACCORDION_DURATION); a click inside runs the full 1s.
 * - The page, from the avatar: it charges (a tight halo gathers round the avatar) while the avatar is held, then
 *   bursts across the whole window as it drops (see catapultTrigger.ts). Let go early and the charge fades.
 *
 * - Drawing: one WebGL2 canvas, moved to whichever region is running, shown only while a halo runs.
 * - The bend needs the page as an image: a one-off snapshot (modern-screenshot; the site is text and system
 *   fonts, so it's quick and faithful), taken ahead of time on hover where possible.
 *   - Card: the clicked project with its details forced fully open in the copy, so the picture is right at every
 *     moment of an open / close. The whole card is drawn from it while the halo runs.
 *   - Page: the content column (outside it there's only background). Only the moving band of the wave is drawn
 *     from it; everywhere else the live page
 *     shows through, so anything that changes meanwhile (the avatar leaving, words knocked off by it) is never
 *     shown twice.
 * - Light mode tints the page; dark mode adds light (screen). Switching theme mid-halo cross-fades.
 * - Reduced motion: no bend, split or glints; the rings fade in and out in place at half strength (600ms).
 *
 * Loaded on demand (see haloTrigger.ts, catapultTrigger.ts). Runs on Motion's frame loop.
 */
import { cancelFrame, frame } from 'motion/react'
import { ACCORDION_DURATION } from '@repo/ui'
import { domToCanvas } from 'modern-screenshot'
import { prefersReducedMotion } from '../../motion'

// ---- tuning (the spec's defaults) -----------------------------------------------------------------
const DURATION = 1000 // ms: a click inside an open card, or the avatar's burst
const ROW_DURATION = ACCORDION_DURATION * 1000 // ms: a click that opens / closes a card, in step with it
const REDUCED_DURATION = 600
const START_RADIUS = 20 // px: grows from the click
const RING_WIDTH = 110 // w
const LENS = 7 // px: peak push
const SPLIT = { r: 1.08, b: 0.92 }
const FRAME_FADE = 56 // px: lens fades out before the area's edge
// Edge refraction (cards only). The spec's 60px / 22px is for a page with wide margins; a card's text starts
// 12px from its edge, so the bevel lives in that empty padding only and never warps a letter.
const BEVEL = { reach: 14, pull: 5, line: 7 }
/** A card reaches 0.75rem past the Work list on each side (.row-highlight), so its canvas does too. */
const BLEED = 12
const CORNER = 8 // px: a card's radius (.row-highlight, 0.5rem)
const DPR_CAP = 2
/** The avatar's charge: a tight halo hugging the 40px avatar, gathering while it's held. */
const CHARGE = { radius: 24, grow: 8, width: 34, strength: 0.55, ms: 300, fadeMs: 160 }

/** Aurora, inside to outside; tuned brighter on dark, softer on light. */
const AURORA = {
  dark: [
    [80, 140, 255],
    [160, 110, 255],
    [255, 110, 180],
    [255, 190, 140],
  ],
  light: [
    [110, 150, 255],
    [180, 130, 255],
    [255, 130, 190],
    [255, 180, 120],
  ],
}

// ---- shader ---------------------------------------------------------------------------------------
const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`

const FRAG = `#version 300 es
precision highp float;
out vec4 outColor;

uniform vec2 uSize;        // canvas, css px
uniform float uDpr;
uniform vec4 uClip;        // the area (x, y, w, h), css px, canvas-local
uniform float uCorner;
uniform vec2 uCenter;      // halo centre
uniform float uRadius;
uniform float uStrength;   // 0..1 over time
uniform float uW;          // ring width
uniform vec3 uPalLight[4];
uniform vec3 uPalDark[4];
uniform float uDark;       // 0 light .. 1 dark (cross-fades)
uniform float uBend;       // 0..1: bend / split / refraction on (needs the snapshot)
uniform float uGlint;      // 0..1: glints on
uniform float uEdges;      // 1: a card (bevel, glint, edge light); 0: the page column (no edges to light)
uniform float uBand;       // 1: draw from the snapshot only in the moving band; 0: the whole area
uniform float uGain;       // how strongly the rings show (the bare page needs more than a grey card)
uniform float uLens;       // px: peak push of the bend
uniform float uComposite;  // 1: draw the page from the snapshot; 0: overlay only
uniform float uFade;       // 1 → 0 over the last stretch: hands the area back to the real page
uniform sampler2D uPage;   // the snapshot
uniform vec4 uShot;        // where the snapshot sits on the canvas (x, y, w, h), css px
uniform vec3 uBg;          // the area's own colour, for anywhere the snapshot doesn't cover
uniform vec4 uHole;        // left to the live page (x, y, w, h): the card's turning icon, or the avatar

const float FRAME_FADE = ${FRAME_FADE.toFixed(1)};

// signed distance to the area's rounded rectangle (negative inside)
float areaSdf(vec2 p) {
  vec2 c = uClip.xy + uClip.zw * 0.5;
  vec2 q = abs(p - c) - uClip.zw * 0.5 + uCorner;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uCorner;
}

vec3 ringColor(float x) {
  vec3 sum = vec3(0.0);
  float wsum = 0.0;
  for (int i = 0; i < 4; i++) {
    float c = float(i) - 1.5;
    float wt = exp(-pow((x - c) / 0.8, 2.0));
    sum += mix(uPalLight[i], uPalDark[i], uDark) * wt;
    wsum += wt;
  }
  return sum / max(wsum, 1e-4);
}

vec3 page(vec2 p) {
  vec2 uv = (p - uShot.xy) / uShot.zw;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return uBg;
  return texture(uPage, uv).rgb; // row 0 is the top of the snapshot
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uSize.y * uDpr - gl_FragCoord.y) / uDpr; // css px, y down
  float sdf = areaSdf(p);
  float clip = clamp(0.5 - sdf * uDpr, 0.0, 1.0);
  if (clip <= 0.0) { outColor = vec4(0.0); return; }

  vec2 d = p - uCenter;
  float dist = length(d);
  vec2 dir = dist > 1e-3 ? d / dist : vec2(0.0);
  float x = (dist - uRadius) / uW;
  // up to 2: on the page the rings can tint twice as deep as on a card (gain 1 never passes 1)
  float alpha = min(2.0, uStrength * uGain * exp(-1.1 * pow(x * 0.5, 2.0)));
  vec3 ring = ringColor(x);

  float inset = max(-sdf, 0.0); // distance to the area's edge, inside

  // ---- lens: one bend for the whole halo, faded before the edge so it stays straight
  float z = x * 0.75;
  float push = uLens * 2.33 * z * exp(-z * z) * uStrength * uBend * smoothstep(0.0, FRAME_FADE, inset);
  vec2 offset = dir * push;

  // ---- glass bevel (cards): near the edge, read from further in, so content stretches toward it
  vec2 c = uClip.xy + uClip.zw * 0.5;
  vec2 rel = p - c;
  vec2 halfSize = uClip.zw * 0.5;
  vec2 inward = abs(rel.x) / halfSize.x > abs(rel.y) / halfSize.y ? vec2(-sign(rel.x), 0.0) : vec2(0.0, -sign(rel.y));
  float edgeT = clamp(1.0 - inset / ${BEVEL.reach.toFixed(1)}, 0.0, 1.0);
  offset -= inward * ${BEVEL.pull.toFixed(1)} * edgeT * edgeT * alpha * uBend * uEdges;

  // ---- the page, bent, with a trace of colour split
  vec3 base;
  vec2 q = p - offset;
  if (uComposite > 0.5) {
    base = vec3(page(p - offset * ${SPLIT.r}).r, page(q).g, page(p - offset * ${SPLIT.b}).b);
  } else {
    base = vec3(0.0);
  }

  // ---- glint (cards): the 1px outline catches the light, read at its bent position
  float line = clamp(1.0 - abs(areaSdf(q) + 0.5) * 1.5, 0.0, 1.0);
  float glint = uStrength * exp(-1.4 * pow(x * 0.5, 2.0)) * mix(0.3, 0.14, uDark) * line * uGlint * uEdges;
  vec3 glintColor = mix(ring, vec3(1.0), 0.2);

  // ---- thin line of light where the halo meets the edge (cards)
  float edgeLine = exp(-inset / ${BEVEL.line.toFixed(1)}) * alpha * uEdges;
  vec3 edgeColor = mix(ring, vec3(1.0), 0.45);

  // Over the hole the live page shows through (a card's turning icon, the avatar that just left), with the same
  // tint on top: light mixes toward the ring (ordinary alpha); dark adds light (alpha 0 = additive, ~screen).
  vec2 inHole = step(uHole.xy, p) * step(p, uHole.xy + uHole.zw);
  if (uComposite > 0.5 && inHole.x * inHole.y > 0.5) {
    float k = alpha * 0.24;
    vec4 lightTint = vec4(ring * k * 1.2, k); // = mix(page, ring, k) + ring * k * 0.2, as everywhere else
    vec4 darkTint = vec4(ring * alpha * 0.45 * (1.0 - uBg), 0.0);
    outColor = mix(lightTint, darkTint, uDark) * clip * uFade;
    return;
  }

  if (uComposite > 0.5) {
    vec3 lightCol = mix(base, ring, alpha * 0.24) + ring * alpha * 0.24 * 0.2;
    vec3 darkCol = 1.0 - (1.0 - base) * (1.0 - ring * alpha * 0.3 * 1.5);
    vec3 col = mix(lightCol, darkCol, uDark);
    col = mix(col, glintColor, glint);
    col = mix(col, 1.0 - (1.0 - col) * (1.0 - edgeColor * edgeLine * 0.6), uDark);
    col = mix(col, mix(col, edgeColor, edgeLine * 0.5), 1.0 - uDark);
    // Card: the whole card comes from the snapshot (blending a bent copy with the real text would show both).
    // Page: only the band where the wave is; outside it the bend is ~0, so the switch at its edge is invisible.
    float band = mix(1.0, smoothstep(0.004, 0.03, max(alpha, abs(push) / uLens)), uBand);
    outColor = vec4(col, 1.0) * clip * uFade * band;
  } else if (uDark > 0.5) {
    // overlay, dark: the canvas is blended with screen, so black leaves the page alone
    vec3 add = ring * alpha * 0.45 + glintColor * glint + edgeColor * edgeLine * 0.6;
    outColor = vec4(add * clip, clip);
  } else {
    // overlay, light: tint with ordinary alpha (premultiplied: each layer's colour times its own alpha)
    float a = clamp(alpha * 0.24 + glint + edgeLine * 0.5, 0.0, 1.0);
    vec3 pm = ring * alpha * 0.24 + glintColor * glint + edgeColor * edgeLine * 0.5;
    outColor = vec4(pm, a) * clip;
  }
}`

// ---- regions --------------------------------------------------------------------------------------
type Shot = { key: string; shot: HTMLCanvasElement; bg: [number, number, number] }

type Region = {
  host: HTMLElement // the canvas goes in here
  fixed: boolean // canvas over the viewport (page) or absolute in the host (card)
  bleed: number // extra width each side of the host (card)
  clip(): DOMRect // the area, viewport coords
  corner: number
  edges: boolean // bevel, glint, edge light
  band: boolean // composite only in the wave's band
  gain: number // ring strength: 1 on a card; the bare page needs more to read
  lens: number // px: how far the bend pushes
  pin(): DOMRect // what the snapshot is a picture of (it's drawn pinned to this element's top-left)
  shot(): Promise<Shot>
  hole(): DOMRect | null
  far(cx: number, cy: number): number // how far the wave has to grow
}

const isDark = () => document.documentElement.dataset.theme === 'dark'
const dprNow = () => Math.min(window.devicePixelRatio || 1, DPR_CAP)
const farthest = (r: DOMRect, cx: number, cy: number, bottom = r.bottom) =>
  Math.max(
    ...[
      [r.left, r.top],
      [r.right, r.top],
      [r.left, bottom],
      [r.right, bottom],
    ].map(([x, y]) => Math.hypot(x - cx, y - cy)),
  )
const rgbOf = (c: string) => c.match(/[\d.]+/g)!.map(Number)

/** A colour token as 0..1 rgb, flattened onto the page if it's translucent. */
function colour(token: string): [number, number, number] {
  const probe = document.createElement('i')
  probe.style.color = token
  document.body.append(probe)
  const [r, g, b, a = 1] = rgbOf(getComputedStyle(probe).color)
  probe.remove()
  const [pr, pg, pb] = rgbOf(getComputedStyle(document.body).backgroundColor)
  const mix = (v: number, under: number) => (v * a + under * (1 - a)) / 255
  return [mix(r, pr), mix(g, pg), mix(b, pb)]
}
const css = (c: [number, number, number]) => `rgb(${c.map((v) => Math.round(v * 255)).join(' ')})`

const shots = new WeakMap<HTMLElement, Shot>()
async function cachedShot(el: HTMLElement, key: string, take: () => Promise<Omit<Shot, 'key'>>) {
  const hit = shots.get(el)
  if (hit?.key === key) return hit
  const entry = { key, ...(await take()) }
  shots.set(el, entry)
  return entry
}

// -- a project card --
/** The card's box: the project's own box, widened by the 0.75rem the card (.row-highlight) reaches past it. */
const cardRect = (el: HTMLElement) => {
  const r = el.getBoundingClientRect()
  return new DOMRect(r.left - BLEED, r.top, r.width + BLEED * 2, r.height)
}
/** The project's height with its details fully open (row + the details' natural height). */
function fullHeight(item: HTMLElement) {
  const panel = item.querySelector<HTMLElement>('.ui-accordion-panel')
  const row = item.querySelector<HTMLElement>('.ui-accordion-trigger')?.parentElement
  return panel && row ? row.offsetHeight + panel.scrollHeight : item.offsetHeight
}
function cardRegion(list: HTMLElement, item: HTMLElement): Region {
  return {
    host: list,
    fixed: false,
    bleed: BLEED,
    clip: () => cardRect(item),
    corner: CORNER,
    edges: true,
    band: false,
    gain: 1,
    lens: LENS,
    pin: () => item.getBoundingClientRect(),
    shot: () =>
      cachedShot(item, `${isDark()}|${item.offsetWidth}|${dprNow()}`, async () => {
        const bg = colour('var(--hover)')
        const shot = await domToCanvas(item, {
          scale: dprNow(),
          backgroundColor: css(bg), // the card's colour behind the text
          font: false, // system fonts: nothing to embed, and skipping it saves the stylesheet scan
          height: fullHeight(item),
          // In the copy only: details fully open, so the picture is right however far the card has opened.
          onCloneNode: (clone) => {
            const panel = (clone as HTMLElement).querySelector<HTMLElement>('.ui-accordion-panel')
            if (!panel) return
            panel.style.height = 'auto'
            panel.removeAttribute('inert')
          },
        })
        return { shot, bg }
      }),
    hole: () => {
      const icon = item.querySelector('.ui-accordion-trigger .icon')?.getBoundingClientRect()
      return icon ? new DOMRect(icon.left - 3, icon.top - 3, icon.width + 6, icon.height + 6) : null
    },
    far: (cx, cy) => {
      const r = cardRect(item)
      return farthest(r, cx, cy, r.top + fullHeight(item)) // at its full open size
    },
  }
}

// -- the page, from the avatar --
// The wave sweeps the whole window (not just the 600px content column); the snapshot is of the column, and
// outside it the page is plain background (uBg), so there's nothing there to bend.
function pageRegion(column: HTMLElement, avatar: HTMLElement): Region {
  const visible = () => new DOMRect(0, 0, window.innerWidth, window.innerHeight)
  return {
    host: document.body,
    fixed: true,
    bleed: 0,
    clip: visible,
    corner: 0,
    edges: false,
    band: true,
    gain: 2.8, // tints up to twice as deep as a card
    lens: 10, // and bends further
    pin: () => column.getBoundingClientRect(),
    shot: () =>
      cachedShot(
        column,
        `${isDark()}|${column.offsetWidth}|${column.scrollHeight}|${location.pathname}|${dprNow()}`,
        async () => {
          const bg = colour('var(--bg)')
          const shot = await domToCanvas(column, {
            scale: dprNow(),
            backgroundColor: css(bg),
            font: false,
            // the hint and anything the catapult adds come and go: leave them out of the picture
            filter: (n) =>
              !(n instanceof Element && n.matches('.avatar-hint, .catapult-layer, .halo-canvas')),
          })
          return { shot, bg }
        },
      ),
    hole: () => {
      const r = avatar.getBoundingClientRect() // the avatar has left for the catapult; show what's really there
      return new DOMRect(r.left - 4, r.top - 4, r.width + 8, r.height + 8)
    },
    far: (cx, cy) => farthest(visible(), cx, cy),
  }
}

// ---- state ----------------------------------------------------------------------------------------
type Run = {
  id: number
  region: Region
  phase: 'charge' | 'burst' | 'fade'
  start: number
  duration: number
  center: { x: number; y: number } // canvas-local (so a card's stays put if the page scrolls)
  growth: number
  reduced: boolean
  bendTarget: number // 1 once the snapshot is in
  bend: number
  shot: { w: number; h: number } | null
  bg: [number, number, number]
  fadeFrom: number // strength when a charge was let go
}

let gl: WebGL2RenderingContext | null = null
let canvas: HTMLCanvasElement | null = null
let program: WebGLProgram | null = null
let texture: WebGLTexture | null = null
let uniforms: Record<string, WebGLUniformLocation | null> = {}
let run: Run | null = null
let runs = 0
let dark = 0
let running = false
let unsupported = false

/**
 * Set up WebGL (context, shader compile) ahead of the first use: the first compile can take hundreds of ms,
 * which on the click itself would freeze the page. Called on idle when the pointer nears something that uses it.
 */
export function warmHalo() {
  if (unsupported || gl) return
  if (!ensureGl(document.body)) return
  gl!.useProgram(program)
  gl!.drawArrays(gl!.TRIANGLES, 0, 3) // draw once, invisibly, so the driver finishes compiling now
  gl!.finish()
}

function begin(region: Region, cx: number, cy: number, phase: Run['phase'], duration: number, shockwave: boolean) {
  if (unsupported || !ensureGl(region.host)) return null
  attach(region)
  const o = origin(region)
  const reduced = prefersReducedMotion()
  run = {
    id: ++runs,
    region,
    phase,
    start: performance.now(),
    duration: reduced && phase === 'burst' ? REDUCED_DURATION : duration,
    center: { x: cx - o.x, y: cy - o.y },
    growth: region.far(cx, cy) + RING_WIDTH * 1.5 - START_RADIUS,
    reduced,
    bendTarget: 0,
    bend: 0,
    shot: null,
    bg: [0.94, 0.94, 0.94],
    fadeFrom: 0,
  }
  dark = isDark() ? 1 : 0
  resize()
  canvas!.style.display = 'block'
  if (shockwave && !reduced) snapshot(run.id)
  if (!running) {
    running = true
    frame.update(tick, true)
  }
  return run
}

/**
 * A halo on a project card.
 * @param list   the Work list (the canvas sits in it)
 * @param item   the clicked project; the halo is clipped to its card
 * @param clientX/clientY where it was clicked
 * @param onRow  the click opens or closes the card: the halo runs for as long as that takes
 * @param shockwave  bend the card; false is the halo alone (rings, glints, edge light)
 */
export function triggerHalo(
  list: HTMLElement,
  item: HTMLElement,
  clientX: number,
  clientY: number,
  onRow: boolean,
  shockwave = true,
) {
  begin(cardRegion(list, item), clientX, clientY, 'burst', onRow ? ROW_DURATION : DURATION, shockwave)
}

/** Hovering a project: snapshot it while idle, ready for a click. */
export function prepareHalo(item: HTMLElement) {
  if (unsupported || prefersReducedMotion()) return
  void cardRegion(item.parentElement ?? document.body, item).shot().catch(() => {})
}

// -- the avatar --
const column = () => document.querySelector('main')
/** Hovering the avatar: set up WebGL and snapshot the page while idle, ready for a hold. */
export function prepareAvatarHalo(avatar: HTMLElement) {
  if (unsupported || prefersReducedMotion()) return
  warmHalo()
  const main = column()
  if (main) void pageRegion(main, avatar).shot().catch(() => {})
}
/** The avatar is pressed: a halo gathers round it while it's held. */
export function chargeAvatarHalo(avatar: HTMLElement) {
  const main = column()
  if (!main || prefersReducedMotion()) return
  const r = avatar.getBoundingClientRect()
  begin(pageRegion(main, avatar), r.left + r.width / 2, r.top + r.height / 2, 'charge', CHARGE.ms, true)
}
/** The hold completed and the avatar drops: the charge bursts across the page. */
export function burstAvatarHalo() {
  if (!run || run.phase !== 'charge') return
  run.phase = 'burst'
  run.start = performance.now()
  run.duration = DURATION
}
/** Let go before the hold completed: the charge fades away. */
export function cancelAvatarHalo() {
  if (!run || run.phase !== 'charge') return
  run.fadeFrom = chargeStrength(performance.now() - run.start)
  run.phase = 'fade'
  run.start = performance.now()
  run.duration = CHARGE.fadeMs
}
const easeOut = (t: number) => 1 - (1 - t) ** 3
const chargeStrength = (ms: number) => CHARGE.strength * easeOut(Math.min(1, ms / CHARGE.ms))

// ---- snapshot (for the bend) ------------------------------------------------------------------------
async function snapshot(id: number) {
  const r = run
  if (!gl || !r) return
  try {
    const { shot, bg } = await r.region.shot()
    if (!run || run.id !== id || !gl) return // something newer took over
    run.bg = bg
    const k = dprNow()
    run.shot = { w: shot.width / k, h: shot.height / k }
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, shot)
    run.bendTarget = 1
  } catch {
    // no snapshot: stays overlay only
  }
}

// ---- loop ---------------------------------------------------------------------------------------
function tick() {
  if (!run || !gl || !canvas) return stop()
  const elapsed = performance.now() - run.start
  const t = elapsed / run.duration
  const region = run.region

  // theme cross-fade
  dark += ((isDark() ? 1 : 0) - dark) * 0.18

  let radius: number
  let strength: number
  let width = RING_WIDTH
  let bend = 0
  if (run.phase === 'charge') {
    // gathering: holds at full charge until the burst (or a cancel) takes over
    radius = CHARGE.radius + CHARGE.grow * easeOut(Math.min(1, t))
    strength = chargeStrength(elapsed)
    width = CHARGE.width
  } else if (run.phase === 'fade') {
    if (t >= 1) return stop()
    radius = CHARGE.radius + CHARGE.grow
    strength = run.fadeFrom * (1 - easeOut(t))
    width = CHARGE.width
  } else {
    if (t >= 1) return stop()
    run.bend += (run.bendTarget - run.bend) * 0.25 // fades in when the snapshot lands
    bend = run.reduced ? 0 : run.bend
    if (run.reduced) {
      radius = START_RADIUS + run.growth * 0.5 // in place
      strength = 0.5 * Math.sin(Math.PI * t)
    } else {
      radius = START_RADIUS + (run.growth * (1 - 2 ** (-9 * t))) / (1 - 2 ** -9)
      strength = Math.min(1, t / 0.03) * (1 - t ** 2.2)
      // a charge bursts: start from its tight ring and its strength, widening into the full wave
      if (region.band) {
        const k = easeOut(Math.min(1, t / 0.15))
        width = CHARGE.width + (RING_WIDTH - CHARGE.width) * k
        radius = Math.max(radius, CHARGE.radius + CHARGE.grow)
        strength = Math.max(strength, CHARGE.strength * (1 - k))
      }
    }
  }

  resize()
  const o = origin(region)
  const local = (r: DOMRect) => [r.left - o.x, r.top - o.y, r.width, r.height] as const
  const composite = bend > 0.01 && run.shot ? 1 : 0
  canvas.style.mixBlendMode = !composite && dark > 0.5 ? 'screen' : 'normal'

  gl.useProgram(program)
  const size = canvasSize(region)
  gl.uniform2f(uniforms.uSize, size.w, size.h)
  gl.uniform1f(uniforms.uDpr, canvas.width / Math.max(size.w, 1))
  gl.uniform4f(uniforms.uClip, ...local(region.clip()))
  const pin = region.pin()
  const shot = run.shot ?? { w: pin.width, h: pin.height }
  gl.uniform4f(uniforms.uShot, pin.left - o.x, pin.top - o.y, shot.w, shot.h)
  gl.uniform3f(uniforms.uBg, ...run.bg)
  const hole = region.hole()
  if (hole) gl.uniform4f(uniforms.uHole, ...local(hole))
  else gl.uniform4f(uniforms.uHole, 0, 0, 0, 0)
  gl.uniform1f(uniforms.uCorner, region.corner)
  gl.uniform2f(uniforms.uCenter, run.center.x, run.center.y)
  gl.uniform1f(uniforms.uRadius, radius)
  gl.uniform1f(uniforms.uStrength, strength)
  gl.uniform1f(uniforms.uW, width)
  gl.uniform1f(uniforms.uDark, dark)
  gl.uniform1f(uniforms.uBend, bend)
  gl.uniform1f(uniforms.uGlint, run.reduced ? 0 : 1)
  gl.uniform1f(uniforms.uEdges, region.edges ? 1 : 0)
  gl.uniform1f(uniforms.uBand, region.band ? 1 : 0)
  gl.uniform1f(uniforms.uGain, region.gain)
  gl.uniform1f(uniforms.uLens, region.lens)
  gl.uniform1f(uniforms.uComposite, composite)
  // the last 15%: by now nothing is bent, so cross-fading the snapshot into the live page can't ghost, and
  // anything that changed underneath eases in rather than popping
  gl.uniform1f(uniforms.uFade, run.phase === 'burst' ? Math.min(1, (1 - t) / 0.15) : 1)
  gl.uniform1i(uniforms.uPage, 0)
  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.viewport(0, 0, canvas.width, canvas.height)
  gl.clearColor(0, 0, 0, 0)
  gl.clear(gl.COLOR_BUFFER_BIT)
  gl.drawArrays(gl.TRIANGLES, 0, 3)
}

function stop() {
  running = false
  cancelFrame(tick)
  run = null
  if (canvas) canvas.style.display = 'none' // nothing drawn at rest
}

// ---- canvas & GL setup ----------------------------------------------------------------------------
/** The canvas's top-left in viewport coords. */
function origin(region: Region) {
  if (region.fixed) return { x: 0, y: 0 }
  const r = region.host.getBoundingClientRect()
  return { x: r.left - region.bleed, y: r.top }
}
function canvasSize(region: Region) {
  if (region.fixed) return { w: window.innerWidth, h: window.innerHeight }
  return { w: region.host.clientWidth + region.bleed * 2, h: region.host.clientHeight }
}

/** Move the canvas to the running region (a canvas keeps its WebGL context when it moves). */
function attach(region: Region) {
  if (!canvas) return
  if (canvas.parentElement !== region.host) region.host.append(canvas)
  if (region.fixed) canvas.dataset.fixed = ''
  else delete canvas.dataset.fixed
}

function resize() {
  if (!canvas || !run) return
  const dpr = dprNow()
  const { w: cw, h: ch } = canvasSize(run.region)
  const w = Math.round(cw * dpr)
  const h = Math.round(ch * dpr)
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w
    canvas.height = h
  }
}

function ensureGl(host: HTMLElement): boolean {
  if (gl && canvas) return true
  canvas = document.createElement('canvas')
  canvas.className = 'halo-canvas'
  canvas.setAttribute('aria-hidden', 'true')
  host.append(canvas)
  gl = canvas.getContext('webgl2', { premultipliedAlpha: true, antialias: false })
  if (!gl) {
    unsupported = true
    canvas.remove()
    canvas = null
    return false
  }
  const compile = (type: number, src: string) => {
    const s = gl!.createShader(type)!
    gl!.shaderSource(s, src)
    gl!.compileShader(s)
    if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) throw new Error(gl!.getShaderInfoLog(s) ?? 'shader')
    return s
  }
  try {
    program = gl.createProgram()!
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT))
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'link')
  } catch (e) {
    console.warn('halo: shader failed, disabled', e)
    unsupported = true
    canvas.remove()
    return false
  }
  gl.useProgram(program)
  // one triangle that covers the screen
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(program, 'aPos')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

  for (const name of [
    'uSize', 'uDpr', 'uClip', 'uCorner', 'uCenter', 'uRadius', 'uStrength', 'uW', 'uDark', 'uBend', 'uGlint',
    'uEdges', 'uBand', 'uGain', 'uLens', 'uComposite', 'uFade', 'uPage', 'uShot', 'uBg', 'uHole',
  ]) uniforms[name] = gl.getUniformLocation(program, name)
  const pal = (rows: number[][]) => new Float32Array(rows.flatMap((c) => c.map((v) => v / 255)))
  gl.uniform3fv(gl.getUniformLocation(program, 'uPalLight'), pal(AURORA.light))
  gl.uniform3fv(gl.getUniformLocation(program, 'uPalDark'), pal(AURORA.dark))

  texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4))
  return true
}
