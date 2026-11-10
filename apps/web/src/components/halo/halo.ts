/**
 * Shockwave halo over a project card.
 *
 * A faint halo of light grows from the point that was clicked, across the open project card only, and fades
 * out in 1s: four soft colour rings (Aurora), a lens that bends the card's text a few px as it passes, a trace
 * of colour split, a glass bevel at the card's edges, and a glint along the card's outline.
 *
 * - Drawing: one WebGL2 canvas laid over the Work list while a halo runs (nothing at rest), one fragment pass.
 *   The halo is clipped to the clicked project's card (its rounded rectangle), read live from that project
 *   each frame, so it follows the card opening or closing, but never the hover highlight moving to other rows. It
 *   opening or closing.
 * - The bend needs the page as an image: a one-off snapshot of the clicked project (modern-screenshot, text only,
 *   so fast and faithful), taken with its details forced fully open in the copy. While a card opens or closes
 *   only the height that clips its details animates; the details themselves are already laid out, so that one
 *   picture is right at every moment of the animation and the bend can run while the card moves. Until the
 *   snapshot lands (a few tens of ms) the halo is overlay only: rings, glints and the edge line.
 * - Timing: a click on the row (open / close) runs the halo for exactly as long as the card takes to open
 *   (ACCORDION_DURATION); a click inside an open card runs the full 1s.
 * - Light mode tints the page; dark mode adds light (screen). Switching theme mid-halo cross-fades.
 * - Reduced motion: no bend, split or glints; the rings fade in and out in place at half strength (600ms).
 *
 * Loaded on demand (see haloTrigger.ts). Runs on Motion's frame loop.
 */
import { cancelFrame, frame } from 'motion/react'
import { ACCORDION_DURATION } from '@repo/ui'
import { domToCanvas } from 'modern-screenshot'
import { prefersReducedMotion } from '../../motion'

// ---- tuning (the spec's defaults) -----------------------------------------------------------------
const DURATION = 1000 // ms: a click inside an open card
const ROW_DURATION = ACCORDION_DURATION * 1000 // ms: a click that opens / closes it, in step with the card
const REDUCED_DURATION = 600
const START_RADIUS = 20 // px: grows from the click
const RING_WIDTH = 110 // w
const LENS = 7 // px: peak push
const SPLIT = { r: 1.08, b: 0.92 }
const FRAME_FADE = 56 // px: lens fades out before the card's edge
// Edge refraction. The spec's 60px / 22px is for a page with wide margins; this card's text starts 12px from its
// edge, so the bevel lives in that empty padding only and never warps a letter.
const BEVEL = { reach: 14, pull: 5, line: 7 }
/** The card reaches 0.75rem past the Work list on each side (.row-highlight), so the canvas does too. */
const BLEED = 12
const CORNER = 8 // px: the card's radius (.row-highlight, 0.5rem)
const DPR_CAP = 2

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
uniform vec4 uCard;        // card rect (x, y, w, h), css px, list-local
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
uniform float uComposite;  // 1: draw the full page from the snapshot; 0: overlay only
uniform float uFade;       // 1 → 0 over the last stretch: hands the card back to the real page
uniform sampler2D uPage;   // snapshot of the list
uniform vec4 uShot;        // where the snapshot sits on the canvas (x, y, w, h), css px
uniform vec3 uCardBg;      // the card's own colour, for the strip the snapshot doesn't cover
uniform vec4 uHole;        // the plus / × icon (x, y, w, h): left to the live page so it keeps turning

const float LENS = ${LENS.toFixed(1)};
const float FRAME_FADE = ${FRAME_FADE.toFixed(1)};

// signed distance to the card's rounded rectangle (negative inside)
float cardSdf(vec2 p) {
  vec2 c = uCard.xy + uCard.zw * 0.5;
  vec2 q = abs(p - c) - uCard.zw * 0.5 + uCorner;
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
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return uCardBg;
  return texture(uPage, uv).rgb; // row 0 is the top of the snapshot
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uSize.y * uDpr - gl_FragCoord.y) / uDpr; // css px, y down
  float sdf = cardSdf(p);
  float clip = clamp(0.5 - sdf * uDpr, 0.0, 1.0);
  if (clip <= 0.0) { outColor = vec4(0.0); return; }

  vec2 d = p - uCenter;
  float dist = length(d);
  vec2 dir = dist > 1e-3 ? d / dist : vec2(0.0);
  float x = (dist - uRadius) / uW;
  float alpha = uStrength * exp(-1.1 * pow(x * 0.5, 2.0));
  vec3 ring = ringColor(x);

  float inset = max(-sdf, 0.0); // distance to the card's edge, inside

  // ---- lens: one bend for the whole halo, faded before the edge so it stays straight
  float z = x * 0.75;
  float push = LENS * 2.33 * z * exp(-z * z) * uStrength * uBend * smoothstep(0.0, FRAME_FADE, inset);
  vec2 offset = dir * push;

  // ---- glass bevel: within 60px of the edge, read from further in, so content stretches toward it
  vec2 c = uCard.xy + uCard.zw * 0.5;
  vec2 rel = p - c;
  vec2 halfSize = uCard.zw * 0.5;
  vec2 inward = abs(rel.x) / halfSize.x > abs(rel.y) / halfSize.y ? vec2(-sign(rel.x), 0.0) : vec2(0.0, -sign(rel.y));
  float edgeT = clamp(1.0 - inset / ${BEVEL.reach.toFixed(1)}, 0.0, 1.0);
  offset -= inward * ${BEVEL.pull.toFixed(1)} * edgeT * edgeT * alpha * uBend; // read further in

  // ---- the page, bent, with a trace of colour split
  vec3 base;
  vec2 q = p - offset;
  if (uComposite > 0.5) {
    base = vec3(page(p - offset * ${SPLIT.r}).r, page(q).g, page(p - offset * ${SPLIT.b}).b);
  } else {
    base = vec3(0.0);
  }

  // ---- glint: the card's own 1px outline catches the light, read at its bent position
  float line = clamp(1.0 - abs(cardSdf(q) + 0.5) * 1.5, 0.0, 1.0);
  float glint = uStrength * exp(-1.4 * pow(x * 0.5, 2.0)) * mix(0.3, 0.14, uDark) * line * uGlint;
  vec3 glintColor = mix(ring, vec3(1.0), 0.2);

  // ---- thin line of light where the halo meets the edge
  float edgeLine = exp(-inset / ${BEVEL.line.toFixed(1)}) * alpha;
  vec3 edgeColor = mix(ring, vec3(1.0), 0.45);

  // Over the plus / × icon the live page shows through (so it keeps turning), with the same tint on top:
  // light mixes toward the ring (ordinary alpha); dark adds light (alpha 0 = additive, ~screen on a dark card).
  vec2 inHole = step(uHole.xy, p) * step(p, uHole.xy + uHole.zw);
  if (uComposite > 0.5 && inHole.x * inHole.y > 0.5) {
    float k = alpha * 0.24;
    vec4 lightTint = vec4(ring * k, k);
    vec4 darkTint = vec4(ring * alpha * 0.45 * (1.0 - uCardBg), 0.0);
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
    // the whole card comes from the snapshot while it runs: blending the bent copy with the real text would
    // show both (ghosting). Unbent, the snapshot matches the page, so nothing pops when it ends.
    outColor = vec4(col, 1.0) * clip * uFade;
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

// ---- state ----------------------------------------------------------------------------------------
type Run = {
  id: number
  start: number
  duration: number
  center: { x: number; y: number }
  growth: number
  reduced: boolean
  bendTarget: number // 1 once the snapshot is in
  bend: number
  shot: { w: number; h: number } | null // the snapshot's size, css px (an opening card's full size)
}

let gl: WebGL2RenderingContext | null = null
let canvas: HTMLCanvasElement | null = null
let program: WebGLProgram | null = null
let texture: WebGLTexture | null = null
let uniforms: Record<string, WebGLUniformLocation | null> = {}
let host: HTMLElement | null = null // the Work list
let card: HTMLElement | null = null // the clicked project (row + details); the halo stays on its card

/** The card's box: the project's own box, widened by the 0.75rem the card (.row-highlight) reaches past it. */
const cardRect = (el: HTMLElement) => {
  const r = el.getBoundingClientRect()
  return new DOMRect(r.left - BLEED, r.top, r.width + BLEED * 2, r.height)
}
let run: Run | null = null
let runs = 0
let dark = 0
let running = false
let unsupported = false
let cardBg: [number, number, number] = [0.94, 0.94, 0.94]

const isDark = () => document.documentElement.dataset.theme === 'dark'

/**
 * Set up WebGL (context, shader compile) ahead of the first click: the first compile can take hundreds of
 * ms, which on the click itself would freeze the card's opening. Called on idle when the pointer enters the list.
 */
export function warmHalo(list: HTMLElement) {
  if (unsupported || (gl && canvas?.parentElement === list)) return
  host = list
  ensureGl()
  if (gl && program) {
    // draw once, invisibly, so the driver finishes compiling now rather than on first use
    gl.useProgram(program)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    gl.finish()
  }
}

/**
 * Start (or restart) a halo.
 * @param list   the Work list (canvas and snapshot cover it)
 * @param item   the clicked project; the halo is clipped to its card (not the shared highlight, which moves
 *               to whichever row is hovered)
 * @param clientX/clientY where it was clicked
 * @param onRow  the click opens or closes the card: the halo runs for as long as that takes
 * @param shockwave  bend the card (lens, colour split, edge refraction); false is the halo alone: rings,
 *                   glints and the edge light
 */
export function triggerHalo(
  list: HTMLElement,
  item: HTMLElement,
  clientX: number,
  clientY: number,
  onRow: boolean,
  shockwave = true,
) {
  if (unsupported) return
  host = list
  card = item
  if (!ensureGl()) return
  const box = list.getBoundingClientRect()
  const cardBox = cardRect(item)
  const center = { x: clientX - box.left + BLEED, y: clientY - box.top }
  // grow from the click to just past the card's farthest corner, measured at its full open size (an opening
  // card is still short at the click)
  const bottom = cardBox.top + fullHeight(item)
  const corners = [
    [cardBox.left, cardBox.top],
    [cardBox.right, cardBox.top],
    [cardBox.left, bottom],
    [cardBox.right, bottom],
  ].map(([x, y]) => Math.hypot(x - clientX, y - clientY))
  const far = Math.max(...corners)
  const reduced = prefersReducedMotion()
  run = {
    id: ++runs,
    start: performance.now(),
    duration: reduced ? REDUCED_DURATION : onRow ? ROW_DURATION : DURATION,
    center,
    growth: far + RING_WIDTH * 1.5 - START_RADIUS,
    reduced,
    bendTarget: 0,
    bend: 0,
    shot: null,
  }
  dark = isDark() ? 1 : 0
  resize()
  canvas!.style.display = 'block'
  if (shockwave && !reduced) snapshot(run.id, item) // no snapshot, no bend: the halo stays overlay only
  if (!running) {
    running = true
    frame.update(tick, true)
  }
}

// ---- snapshot (for the bend) ------------------------------------------------------------------------

/** The project's height with its details fully open (row + the details' natural height). */
function fullHeight(item: HTMLElement) {
  const panel = item.querySelector<HTMLElement>('.ui-accordion-panel')
  const row = item.querySelector<HTMLElement>('.ui-accordion-trigger')?.parentElement
  return panel && row ? row.offsetHeight + panel.scrollHeight : item.offsetHeight
}

/** The card's colour (--hover) as 0..1 rgb, flattened onto the page if it's translucent. */
function cardColour(): [number, number, number] {
  const probe = document.createElement('i')
  probe.style.color = 'var(--hover)'
  document.body.append(probe)
  const read = (c: string) => c.match(/[\d.]+/g)!.map(Number)
  const [r, g, b, a = 1] = read(getComputedStyle(probe).color)
  probe.remove()
  const [pr, pg, pb] = read(getComputedStyle(document.body).backgroundColor)
  const mix = (v: number, under: number) => (v * a + under * (1 - a)) / 255
  return [mix(r, pr), mix(g, pg), mix(b, pb)]
}

/** Snapshots taken ahead of time (on hover), so a click doesn't have to wait for one. */
const shots = new WeakMap<HTMLElement, { key: string; shot: HTMLCanvasElement; bg: [number, number, number] }>()
const shotKey = (item: HTMLElement) => `${isDark()}|${item.offsetWidth}|${Math.min(window.devicePixelRatio || 1, DPR_CAP)}`

/** Take (or reuse) the project's snapshot: details forced fully open, on the card's own colour. */
async function takeShot(item: HTMLElement) {
  const key = shotKey(item)
  const cached = shots.get(item)
  if (cached?.key === key) return cached
  const bg = cardColour()
  const shot = await domToCanvas(item, {
    scale: Math.min(window.devicePixelRatio || 1, DPR_CAP),
    backgroundColor: `rgb(${bg.map((v) => Math.round(v * 255)).join(' ')})`, // the card's colour behind the text
    font: false, // the site uses system fonts: nothing to embed, and skipping it saves the stylesheet scan
    height: fullHeight(item),
    // In the copy only: details fully open, so the picture is right however far the card has opened.
    onCloneNode: (clone) => {
      const panel = (clone as HTMLElement).querySelector<HTMLElement>('.ui-accordion-panel')
      if (!panel) return
      panel.style.height = 'auto'
      panel.removeAttribute('inert')
    },
  })
  const entry = { key, shot, bg }
  shots.set(item, entry)
  return entry
}

/** Hovering a project: snapshot it while idle, ready for a click. */
export function prepareHalo(item: HTMLElement) {
  if (unsupported || prefersReducedMotion()) return
  void takeShot(item).catch(() => {})
}

async function snapshot(id: number, item: HTMLElement) {
  if (!gl) return
  try {
    const { shot, bg } = await takeShot(item)
    if (!run || run.id !== id || !gl) return // a newer click took over
    cardBg = bg
    const k = Math.min(window.devicePixelRatio || 1, DPR_CAP)
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
  if (!run || !gl || !canvas || !host || !card) return stop()
  const t = (performance.now() - run.start) / run.duration
  if (t >= 1) return stop()

  // theme cross-fade
  dark += ((isDark() ? 1 : 0) - dark) * 0.18
  run.bend += (run.bendTarget - run.bend) * 0.25 // fades in when the snapshot lands

  let radius: number
  let strength: number
  if (run.reduced) {
    radius = START_RADIUS + run.growth * 0.5 // in place
    strength = 0.5 * Math.sin(Math.PI * t)
  } else {
    radius = START_RADIUS + (run.growth * (1 - 2 ** (-9 * t))) / (1 - 2 ** -9)
    strength = Math.min(1, t / 0.03) * (1 - t ** 2.2)
  }

  resize() // the list grows / shrinks while a card opens or closes
  const box = host.getBoundingClientRect()
  const ib = card.getBoundingClientRect()
  const c = cardRect(card)
  const composite = run.bend > 0.01 && run.shot ? 1 : 0
  canvas.style.mixBlendMode = !composite && dark > 0.5 ? 'screen' : 'normal'

  gl.useProgram(program)
  const width = box.width + BLEED * 2
  gl.uniform2f(uniforms.uSize, width, box.height)
  gl.uniform1f(uniforms.uDpr, canvas.width / Math.max(width, 1))
  gl.uniform4f(uniforms.uCard, c.left - box.left + BLEED, c.top - box.top, c.width, c.height)
  // the snapshot is the project at its full open size, pinned to the project's top-left (it follows the
  // project if something above it moves)
  const shot = run.shot ?? { w: ib.width, h: ib.height }
  gl.uniform4f(uniforms.uShot, ib.left - box.left + BLEED, ib.top - box.top, shot.w, shot.h)
  gl.uniform3f(uniforms.uCardBg, ...cardBg)
  const icon = card.querySelector('.ui-accordion-trigger .icon')?.getBoundingClientRect()
  if (icon) gl.uniform4f(uniforms.uHole, icon.left - box.left + BLEED - 3, icon.top - box.top - 3, icon.width + 6, icon.height + 6)
  else gl.uniform4f(uniforms.uHole, 0, 0, 0, 0)
  gl.uniform1f(uniforms.uCorner, CORNER)
  gl.uniform2f(uniforms.uCenter, run.center.x, run.center.y)
  gl.uniform1f(uniforms.uRadius, radius)
  gl.uniform1f(uniforms.uStrength, strength)
  gl.uniform1f(uniforms.uW, RING_WIDTH)
  gl.uniform1f(uniforms.uDark, dark)
  gl.uniform1f(uniforms.uBend, run.reduced ? 0 : run.bend)
  gl.uniform1f(uniforms.uGlint, run.reduced ? 0 : 1)
  gl.uniform1f(uniforms.uComposite, composite)
  // the last 15%: by now nothing is bent, so cross-fading the snapshot into the live page can't ghost, and
  // anything that changed underneath (the hover card moved on) eases in rather than popping
  gl.uniform1f(uniforms.uFade, Math.min(1, (1 - t) / 0.15))
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

// ---- GL setup -----------------------------------------------------------------------------------
function resize(): boolean {
  if (!canvas || !host) return false
  const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP)
  const w = Math.round((host.clientWidth + BLEED * 2) * dpr)
  const h = Math.round(host.clientHeight * dpr)
  if (canvas.width === w && canvas.height === h) return false
  canvas.width = w
  canvas.height = h
  return true
}

function ensureGl(): boolean {
  if (gl && canvas && host && canvas.parentElement === host) return true
  canvas?.remove()
  canvas = document.createElement('canvas')
  canvas.className = 'halo-canvas'
  canvas.setAttribute('aria-hidden', 'true')
  host!.append(canvas)
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
    'uSize', 'uDpr', 'uCard', 'uCorner', 'uCenter', 'uRadius', 'uStrength', 'uW',
    'uDark', 'uBend', 'uGlint', 'uComposite', 'uFade', 'uPage', 'uShot', 'uCardBg', 'uHole',
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
