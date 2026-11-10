/**
 * Avatar catapult: drag the avatar onto the footer string, pull back, let go.
 *
 * - Drag: a copy of the avatar lifts off and follows the pointer on a heavy spring. Let go anywhere
 *   and it's flung with the velocity it had.
 * - Load: push it down onto the footer line and it sits on the string; pulling further stretches the
 *   string (rubber-band resistance), sideways too, to aim.
 * - Fire: release and it's launched away from the pull, harder the further it was stretched, while the
 *   string twangs.
 * - Fly: gravity, rolling spin, bounces off every edge of the window, losing energy each time. Grab it
 *   again mid-air if you like.
 * - Scatter: any word it hits is knocked away with spin and tumbles, landing wherever it lands; it stays
 *   scattered until the avatar has finished bouncing, then everything springs back together. The page's
 *   own text is never changed: the original words are hidden with the CSS Custom Highlight API and
 *   flying copies are drawn on top, so React's DOM is untouched.
 * - Home: once it has come to rest (or on Escape) the avatar and every word spring back.
 *
 * Motion has no rigid-body physics, so this integrates its own forces; it runs on Motion's frame loop
 * so it batches with every other animation on the page. Loaded on demand (see catapultTrigger.ts).
 */
import { cancelFrame, frame } from 'motion/react'
import { footerString } from './FooterString'

// ---- tuning -------------------------------------------------------------------------------------
const R = 20 // avatar radius (it's 40px)
const GRAVITY = 2600 // px/s²
const BOUNCE = 0.72 // energy kept off a wall
const FLOOR_FRICTION = 0.9 // horizontal speed kept per floor bounce
const ROLL_DRAG = 2.4 // rolling resistance on the floor, per second
const FOLLOW = { k: 700, c: 48 } // drag: heavy, a little lag behind the finger
const HOME = { k: 170, c: 21 } // springing back to the header: one soft overshoot
const POWER = 36 // launch speed per px of stretch
const SLING = (d: number) => 0.9 * Math.max(d, 0) ** 0.86 // pull → stretch: lighter than the pluck, so it can load up
const UNLOAD = 34 // lift this far above the line to take it off the string
const REST_BEFORE_HOME = 1.1 // s resting on the floor before it heads home
const HIT_SPEED = 140 // slower than this, it nudges nothing
const TRAMPOLINE = { k: 900, c: 3 } // landing on the string: sinks ~50px at full speed, keeps ~85% of its bounce
const SETTLE_ON_STRING = { below: 260, c: 30 } // land slower than this (px/s) and it settles instead of hopping forever
const STRING_GRIP = 1.2 // the string's drag on sideways motion while it's on it, per second

const WORD_GRAVITY = 1700
const WORD_DRAG = 1.1 // air drag per second
const WORD_BOUNCE = 0.45
const WORD_HOME = { k: 150, c: 17 }

// ---- state ---------------------------------------------------------------------------------------
type Vec = { x: number; y: number }
type Word = {
  range: Range
  key: string
  el: HTMLSpanElement
  w: number
  h: number
  x: number // top-left, viewport
  y: number
  vx: number
  vy: number
  rot: number
  vr: number
  age: number
  returning: boolean
}
type Candidate = { range: Range; key: string; page: DOMRect; parent: Element }

let layer: HTMLDivElement | null = null
let ball: HTMLDivElement | null = null // the flying copy: a wrapper (it carries the big grab area) around the photo
let source: HTMLImageElement | null = null
let phase: 'idle' | 'drag' | 'fly' | 'home' = 'idle'
const pos: Vec = { x: 0, y: 0 } // ball centre, viewport
const vel: Vec = { x: 0, y: 0 }
let rot = 0
let vrot = 0
const pointer: Vec = { x: 0, y: 0 }
const grab: Vec = { x: 0, y: 0 } // pointer offset from the ball centre
let loaded: { x: number } | null = null // sitting on the string (x where it was loaded)
let stretch = 0
let resting = 0
let onString = false // bouncing on the footer string
let stringDamping = TRAMPOLINE.c // per landing: springy, or heavy if it came in slowly
let line: { left: number; right: number; y: number } | null = null // the string, read once per frame
let candidates: Candidate[] = []
const flying = new Map<string, Word>()
let highlight: Highlight | null = null
let running = false
let unlisten: (() => void) | null = null

const supportsHighlights = () => typeof CSS !== 'undefined' && 'highlights' in CSS && typeof Highlight !== 'undefined'

// ---- public --------------------------------------------------------------------------------------

/** Pointer went down on the avatar (or on the ball mid-flight). */
export function grabAvatar(img: HTMLImageElement, clientX: number, clientY: number) {
  ensureLayer()
  leaveString()
  if (!ball) {
    source = img
    const r = img.getBoundingClientRect()
    pos.x = r.left + r.width / 2
    pos.y = r.top + r.height / 2
    vel.x = vel.y = 0
    rot = vrot = 0
    const photo = img.cloneNode() as HTMLImageElement
    photo.removeAttribute('width')
    photo.removeAttribute('height')
    photo.alt = ''
    photo.className = 'catapult-ball-photo avatar'
    ball = document.createElement('div')
    ball.className = 'catapult-ball'
    ball.append(photo)
    // The wrapper's ::before is a large invisible grab area, so it's easy to catch while it's moving.
    ball.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return
      e.preventDefault()
      grabAvatar(source!, e.clientX, e.clientY)
    })
    layer!.append(ball)
    img.style.visibility = 'hidden'
  }
  phase = 'drag'
  resting = 0
  pointer.x = clientX
  pointer.y = clientY
  grab.x = clientX - pos.x
  grab.y = clientY - pos.y
  document.documentElement.classList.add('is-slinging')
  listen()
  start()
}

// ---- input ---------------------------------------------------------------------------------------

function listen() {
  unlisten?.()
  const move = (e: PointerEvent) => {
    pointer.x = e.clientX
    pointer.y = e.clientY
  }
  const up = () => letGo()
  const key = (e: KeyboardEvent) => e.key === 'Escape' && sendHome()
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
  window.addEventListener('pointercancel', up)
  window.addEventListener('blur', up)
  window.addEventListener('keydown', key)
  unlisten = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    window.removeEventListener('pointercancel', up)
    window.removeEventListener('blur', up)
    unlisten = () => window.removeEventListener('keydown', key) // Escape keeps working while it flies
  }
}

function letGo() {
  if (phase !== 'drag') return
  unlisten?.()
  document.documentElement.classList.remove('is-slinging')
  if (loaded && stretch > 10) {
    // Fire: away from the pull, harder the further it was stretched.
    vel.x = (loaded.x - pos.x) * POWER * 0.55
    vel.y = -stretch * POWER
    vrot = vel.x * 0.4
  }
  if (loaded) footerString()?.release()
  loaded = null
  stretch = 0
  if (!candidates.length) gatherWords()
  phase = 'fly'
}

/** Off the trampoline: the string springs back carrying the ball's vertical speed, so it twangs. */
function leaveString(velocity = 0) {
  if (!onString) return
  onString = false
  footerString()?.release(velocity)
}

function sendHome() {
  if (phase === 'drag') letGo()
  leaveString(vel.y)
  phase = 'home'
  for (const w of flying.values()) w.returning = true
}

// ---- loop ----------------------------------------------------------------------------------------

function start() {
  if (running) return
  running = true
  frame.update(tick, true)
}

function stop() {
  running = false
  cancelFrame(tick)
}

function tick({ delta }: { delta: number }) {
  // Fixed sub-steps keep stiff springs and fast bounces stable.
  let dt = Math.min(delta / 1000, 1 / 30)
  line = footerString()?.line() ?? null
  while (dt > 0) {
    const h = Math.min(dt, 1 / 240)
    stepBall(h)
    stepWords(h)
    dt -= h
  }
  render()
  if (phase === 'idle' && flying.size === 0) finish()
}

function stepBall(h: number) {
  const W = window.innerWidth
  const H = window.innerHeight
  if (phase === 'drag') {
    let tx = pointer.x - grab.x
    let ty = pointer.y - grab.y
    if (line) {
      const onLine = tx > line.left + R && tx < line.right - R
      if (!loaded && onLine && pos.y + R >= line.y && pos.y + R <= line.y + 24) loaded = { x: pos.x }
      if (loaded) {
        const pull = ty + R - line.y
        if (pull < -UNLOAD || !onLine) {
          loaded = null
          stretch = 0
          footerString()?.release()
        } else {
          stretch = SLING(pull)
          ty = line.y - R + stretch
          tx = Math.min(Math.max(tx, line.left + R), line.right - R)
        }
      }
    }
    vel.x += (FOLLOW.k * (tx - pos.x) - FOLLOW.c * vel.x) * h
    vel.y += (FOLLOW.k * (ty - pos.y) - FOLLOW.c * vel.y) * h
    pos.x += vel.x * h
    pos.y += vel.y * h
    rot += (vel.x / R) * h * 20 // a little tilt as it's dragged
    rot *= 1 - 6 * h
    if (loaded && line) footerString()?.hold(pos.x, Math.max(pos.y + R - line.y, 0))
    return
  }

  if (phase === 'fly') {
    vel.y += GRAVITY * h
    // Trampoline: falling onto the footer line from above, the string gives under it and throws it back.
    if (line) {
      const within = pos.x > line.left && pos.x < line.right
      const depth = pos.y + R - line.y
      if (!onString && within && vel.y > 0 && depth >= 0 && depth - vel.y * h <= 1) {
        onString = true
        stringDamping = vel.y < SETTLE_ON_STRING.below ? SETTLE_ON_STRING.c : TRAMPOLINE.c
      }
      if (onString) {
        if (!within || depth < 0) leaveString(vel.y)
        else {
          vel.y += (-TRAMPOLINE.k * depth - stringDamping * vel.y) * h
          vel.x *= 1 - STRING_GRIP * h
          footerString()?.hold(pos.x, depth)
        }
      }
    }
    pos.x += vel.x * h
    pos.y += vel.y * h
    let onFloor = false
    if (pos.x < R) [pos.x, vel.x, vrot] = [R, -vel.x * BOUNCE, -vrot * BOUNCE]
    if (pos.x > W - R) [pos.x, vel.x, vrot] = [W - R, -vel.x * BOUNCE, -vrot * BOUNCE]
    if (pos.y < R) [pos.y, vel.y] = [R, -vel.y * BOUNCE]
    if (pos.y > H - R) {
      pos.y = H - R
      vel.y = Math.abs(vel.y) < 160 ? 0 : -vel.y * BOUNCE // the last tiny hops die out
      vel.x *= vel.y === 0 ? 1 - ROLL_DRAG * h : FLOOR_FRICTION
      onFloor = true
      vrot = (vel.x / R) * (180 / Math.PI) // rolls along the floor
    }
    rot += vrot * h
    if (Math.hypot(vel.x, vel.y) > HIT_SPEED) hitWords()
    const still = Math.abs(vel.x) < 10 && (vel.y === 0 || (onString && Math.abs(vel.y) < 25))
    resting = (onFloor || onString) && still ? resting + h : 0
    if (resting > REST_BEFORE_HOME) sendHome()
    return
  }

  if (phase === 'home' && source) {
    const r = source.getBoundingClientRect()
    const hx = r.left + r.width / 2
    const hy = r.top + r.height / 2
    vel.x += (HOME.k * (hx - pos.x) - HOME.c * vel.x) * h
    vel.y += (HOME.k * (hy - pos.y) - HOME.c * vel.y) * h
    pos.x += vel.x * h
    pos.y += vel.y * h
    vrot += (HOME.k * (nearestTurn(rot) - rot) - HOME.c * vrot) * h
    rot += vrot * h
    if (Math.hypot(hx - pos.x, hy - pos.y) < 0.6 && Math.hypot(vel.x, vel.y) < 8) land()
  }
}

/** Spin back to the closest upright angle, not all the way round. */
const nearestTurn = (deg: number) => Math.round(deg / 360) * 360

function land() {
  source!.style.visibility = ''
  ball?.remove()
  ball = null
  phase = 'idle'
  for (const w of flying.values()) w.returning = true
}

// ---- words ---------------------------------------------------------------------------------------

/** Every word on the page as a Range, with its box in page coordinates. Nothing in the DOM changes. */
function gatherWords() {
  candidates = []
  const root = document.querySelector('main')
  if (!root || !supportsHighlights()) return
  // Only words you can see: not in collapsed (inert) project panels, a leaving tab panel, hidden or
  // decorative bits, or the demos that own their own text.
  const skip =
    '[inert], [hidden], [contenteditable], .ask-ai, svg, script, style, [aria-hidden="true"], input, textarea, .catapult-layer'
  const visible = (el: Element) => el.checkVisibility?.({ opacityProperty: true, visibilityProperty: true }) ?? true
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => {
      const el = n.parentElement
      return !el || el.closest(skip) || !n.textContent?.trim() || !visible(el)
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT
    },
  })
  // The box text can actually show in: its overflow-clipping ancestors intersected (so words cut off by an
  // ellipsis or a collapsed panel don't count). Cached per element.
  const clips = new Map<Element, DOMRect | null>()
  const clipOf = (el: Element | null): DOMRect | null => {
    if (!el || el === root) return null
    if (clips.has(el)) return clips.get(el)!
    const outer = clipOf(el.parentElement)
    const cs = getComputedStyle(el)
    let box = outer
    if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
      const r = el.getBoundingClientRect()
      box = outer
        ? new DOMRect(
            Math.max(r.left, outer.left),
            Math.max(r.top, outer.top),
            Math.max(0, Math.min(r.right, outer.right) - Math.max(r.left, outer.left)),
            Math.max(0, Math.min(r.bottom, outer.bottom) - Math.max(r.top, outer.top)),
          )
        : r
    }
    clips.set(el, box)
    return box
  }
  let i = 0
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    const text = node.textContent ?? ''
    for (const m of text.matchAll(/\S+/g)) {
      const range = document.createRange()
      range.setStart(node, m.index)
      range.setEnd(node, m.index + m[0].length)
      const r = range.getBoundingClientRect()
      if (!r.width || !r.height) continue
      const clip = clipOf(node.parentElement)
      if (clip && (r.left + r.width / 2 > clip.right || r.left + r.width / 2 < clip.left || r.top + r.height / 2 > clip.bottom || r.top + r.height / 2 < clip.top)) continue
      candidates.push({
        range,
        key: `${i}:${m.index}`,
        page: new DOMRect(r.left + scrollX, r.top + scrollY, r.width, r.height),
        parent: node.parentElement!,
      })
    }
    i++
  }
}

function hitWords() {
  const px = pos.x + scrollX
  const py = pos.y + scrollY
  const speed = Math.hypot(vel.x, vel.y)
  for (const c of candidates) {
    if (flying.has(c.key)) continue
    const r = c.page
    // circle vs box
    const nx = Math.max(r.left, Math.min(px, r.right))
    const ny = Math.max(r.top, Math.min(py, r.bottom))
    if ((px - nx) ** 2 + (py - ny) ** 2 > R * R) continue
    launchWord(c, speed)
    vel.x *= 0.993 // every hit costs it a little momentum (it can plough through a whole paragraph)
    vel.y *= 0.993
  }
}

function launchWord(c: Candidate, speed: number) {
  const view = c.range.getBoundingClientRect()
  const cx = view.left + view.width / 2
  const cy = view.top + view.height / 2
  const dx = cx - pos.x
  const dy = cy - pos.y
  const d = Math.hypot(dx, dy) || 1
  const push = speed * 0.5 + 260
  const el = document.createElement('span')
  el.className = 'catapult-word'
  el.textContent = c.range.toString()
  const cs = getComputedStyle(c.parent)
  Object.assign(el.style, {
    fontFamily: cs.fontFamily,
    fontSize: cs.fontSize,
    fontWeight: cs.fontWeight,
    fontStyle: cs.fontStyle,
    fontFeatureSettings: cs.fontFeatureSettings,
    letterSpacing: cs.letterSpacing,
    color: cs.color,
    lineHeight: `${view.height}px`,
    height: `${view.height}px`,
  })
  layer!.append(el)
  if (!highlight) {
    highlight = new Highlight()
    CSS.highlights.set('catapult-scattered', highlight)
  }
  highlight.add(c.range)
  flying.set(c.key, {
    range: c.range,
    key: c.key,
    el,
    w: view.width,
    h: view.height,
    x: view.left,
    y: view.top,
    vx: (dx / d) * push + vel.x * 0.35,
    vy: (dy / d) * push + vel.y * 0.35 - 120,
    rot: 0,
    vr: (Math.random() - 0.5) * 1400,
    age: 0,
    returning: false,
  })
}

function stepWords(h: number) {
  const W = window.innerWidth
  const H = window.innerHeight
  for (const w of flying.values()) {
    w.age += h
    // Words stay scattered while the avatar is still in play; they all go home with it (sendHome / Escape).
    if (w.returning) {
      const home = w.range.getBoundingClientRect()
      w.vx += (WORD_HOME.k * (home.left - w.x) - WORD_HOME.c * w.vx) * h
      w.vy += (WORD_HOME.k * (home.top - w.y) - WORD_HOME.c * w.vy) * h
      w.vr += (WORD_HOME.k * (nearestTurn(w.rot) - w.rot) - WORD_HOME.c * w.vr) * h
      w.x += w.vx * h
      w.y += w.vy * h
      w.rot += w.vr * h
      const settled =
        Math.hypot(home.left - w.x, home.top - w.y) < 0.5 && Math.hypot(w.vx, w.vy) < 6 && Math.abs(w.vr) < 6
      if (settled) {
        w.el.remove()
        highlight?.delete(w.range)
        flying.delete(w.key)
      }
      continue
    }
    w.vy += WORD_GRAVITY * h
    const drag = 1 - WORD_DRAG * h
    w.vx *= drag
    w.vy *= drag
    w.vr *= 1 - 0.8 * h
    w.x += w.vx * h
    w.y += w.vy * h
    w.rot += w.vr * h
    if (w.x < 0) [w.x, w.vx] = [0, -w.vx * WORD_BOUNCE]
    if (w.x + w.w > W) [w.x, w.vx] = [W - w.w, -w.vx * WORD_BOUNCE]
    if (w.y < 0) [w.y, w.vy] = [0, -w.vy * WORD_BOUNCE]
    if (w.y + w.h > H) {
      // Land on the floor: bounce while there's height in it, then lie there and slide to a stop.
      w.y = H - w.h
      if (Math.abs(w.vy) < 120) {
        w.vy = 0
        w.vx *= 1 - 5 * h
        w.vr *= 1 - 8 * h
      } else {
        w.vy = -w.vy * WORD_BOUNCE
        w.vx *= 0.8
      }
    }
  }
}

// ---- drawing / teardown ----------------------------------------------------------------------------

function ensureLayer() {
  if (layer) return
  layer = document.createElement('div')
  layer.className = 'catapult-layer'
  layer.setAttribute('aria-hidden', 'true')
  document.body.append(layer)
}

function render() {
  if (ball) ball.style.transform = `translate(${pos.x - R}px, ${pos.y - R}px) rotate(${rot}deg)`
  for (const w of flying.values()) w.el.style.transform = `translate(${w.x}px, ${w.y}px) rotate(${w.rot}deg)`
}

function finish() {
  stop()
  unlisten?.()
  unlisten = null
  candidates = []
  if (highlight) {
    CSS.highlights.delete('catapult-scattered')
    highlight = null
  }
  layer?.remove()
  layer = null
}
