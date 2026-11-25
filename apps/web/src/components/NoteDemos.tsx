import { animate } from '../animate'
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { Fig, Key, Segmented, Tiles } from './NoteKit'
import { RollingText, type RollVariant } from './RollingText'
import { Scrubber } from './Scrubber'

const WORDS = ['Light', 'Dark', 'System']
const SPEEDS = [
  { label: '1×', value: 1 },
  { label: '½×', value: 2 },
  { label: '¼×', value: 4 },
]

/** One clickable rolling word, right-aligned like the footer switch so its left edge moves. */
function Cycler({
  name,
  variant,
  speed,
  bounds,
  vars,
  removeAfter,
}: {
  name: string
  variant?: RollVariant
  speed: number
  bounds: boolean
  vars?: CSSProperties
  removeAfter?: number
}) {
  const [i, setI] = useState(0)
  return (
    <button
      type="button"
      className="note-roll-button"
      aria-label={`${name}: ${WORDS[i]}. Click to switch`}
      onClick={() => setI((n) => (n + 1) % WORDS.length)}
    >
      <RollingText text={WORDS[i]} variant={variant} speed={speed} bounds={bounds} vars={vars} removeAfter={removeAfter} />
    </button>
  )
}

/* ---------- The demo, with its values under it ---------- */

const EASES = [
  { label: 'Ease-out', value: 'cubic-bezier(0.23, 1, 0.32, 1)' },
  { label: 'Ease', value: 'ease' },
  { label: 'Linear', value: 'linear' },
  { label: 'Back', value: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
]
const DEFAULTS = { duration: 300, stagger: 18, travel: 70, blur: 2, ease: EASES[0].value }
const ON_OFF = [
  { label: 'Off', value: 'off' },
  { label: 'On', value: 'on' },
]

/** The switch as it ships, with every value it reads in rows under the card. */
export function RollDemo() {
  const [t, setT] = useState(DEFAULTS)
  const [bounds, setBounds] = useState(false)
  const set = <K extends keyof typeof DEFAULTS>(k: K) => (v: (typeof DEFAULTS)[K]) => setT((s) => ({ ...s, [k]: v }))
  const changed = JSON.stringify(t) !== JSON.stringify(DEFAULTS)
  const vars = {
    '--roll-in': `${t.duration}ms`,
    '--roll-stagger': `${t.stagger}ms`,
    '--roll-travel': `${t.travel}%`,
    '--roll-blur': `${t.blur}px`,
    '--roll-ease': t.ease,
  } as CSSProperties

  return (
    <figure className="note-demo">
      <div className="note-demo-stage">
        <Cycler name="Theme" speed={1} bounds={bounds} vars={vars} removeAfter={t.duration + t.stagger * 6 + 120} />
      </div>
      <div className="note-tweaks">
        <Scrubber label="Duration" value={t.duration} min={100} max={1200} step={10} format={(v) => `${v}ms`} onChange={set('duration')} />
        <Scrubber label="Stagger" value={t.stagger} min={0} max={80} format={(v) => `${v}ms`} onChange={set('stagger')} />
        <Scrubber label="Travel" value={t.travel} min={0} max={140} step={5} format={(v) => `${v}%`} onChange={set('travel')} />
        <Scrubber label="Blur" value={t.blur} min={0} max={10} step={0.5} format={(v) => `${v}px`} onChange={set('blur')} />
        <Scrubber
          label="Curve"
          variant="pips"
          value={EASES.findIndex((e) => e.value === t.ease)}
          min={0}
          max={EASES.length - 1}
          format={(n) => EASES[n].label}
          onChange={(n) => set('ease')(EASES[n].value)}
        />
        <div className="note-tweaks-row">
          <span className="note-tweaks-label">Bounds</span>
          <Segmented label="Bounds" options={ON_OFF} value={bounds ? 'on' : 'off'} onChange={(v) => setBounds(v === 'on')} />
          <button type="button" className="note-reset" disabled={!changed} onClick={() => setT(DEFAULTS)}>
            Reset
          </button>
        </div>
      </div>
      <figcaption>
        Every value it ships with. Drag a row, or focus it and use the arrow keys. Turn on Bounds to see the box.
      </figcaption>
    </figure>
  )
}

/* ---------- Comparisons ---------- */

function useSpeed(initial: number) {
  const [speed, setSpeed] = useState(initial)
  return { speed, aside: <Segmented label="Speed" options={SPEEDS} value={speed} onChange={setSpeed} /> }
}

/** v1 (keyframes) vs final (transitions): click each twice, fast. */
export function InterruptDemo() {
  const { speed, aside } = useSpeed(2)
  return (
    <Fig title="Keyframes and Transitions" aside={aside} caption="Click each twice, fast. Only one of them carries on.">
      <Tiles
        items={[
          { label: 'Keyframes', spec: 'Restarts when clicked mid-roll', children: <Cycler name="Keyframes" variant="keyframes" speed={speed} bounds={false} /> },
          { label: 'Transitions', spec: 'Carries on from where it is', children: <Cycler name="Transitions" speed={speed} bounds={false} /> },
        ]}
      />
    </Fig>
  )
}

/** v2 (inline-grid) vs final (pinned): the shake. */
export function ShakeDemo() {
  const { speed, aside } = useSpeed(4)
  return (
    <Fig title="Grid Cell and Pinned Words" aside={aside} caption="Go from System to Light and watch the right edge.">
      <Tiles
        items={[
          { label: 'Grid cell', spec: 'As wide as the widest word', children: <Cycler name="Grid" variant="grid" speed={speed} bounds /> },
          { label: 'Pinned', spec: 'Every word on the right edge', children: <Cycler name="Pinned" speed={speed} bounds /> },
        ]}
      />
    </Fig>
  )
}

/* ---------- Timeline: the roll frozen at any millisecond ---------- */

/** cubic-bezier easing, solved for x by bisection. */
function bezier(x1: number, y1: number, x2: number, y2: number) {
  const at = (a: number, b: number, t: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3
  return (x: number) => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    let lo = 0
    let hi = 1
    let t = x
    for (let i = 0; i < 24; i++) {
      t = (lo + hi) / 2
      if (at(x1, x2, t) < x) lo = t
      else hi = t
    }
    return at(y1, y2, t)
  }
}
const easeOut = bezier(0.23, 1, 0.32, 1)
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

// The shipped values: in 300ms (fade 240ms), 18ms apart; out 200ms (fade 160ms), 12ms apart.
const FROM = 'Dark'
const TO = 'System'
const END = 400
const lettersIn = (i: number, ms: number) => ({
  move: easeOut(clamp01((ms - 18 * i) / 300)),
  fade: easeOut(clamp01((ms - 18 * i) / 240)),
})
const lettersOut = (i: number, ms: number) => ({
  move: easeOut(clamp01((ms - 12 * i) / 200)),
  fade: easeOut(clamp01((ms - 12 * i) / 160)),
})

const curvePath = (f: (ms: number) => number) => {
  let d = ''
  for (let ms = 0; ms <= END; ms += 2) d += `${ms ? 'L' : 'M'}${ms} ${100 - 100 * f(ms)}`
  return d
}
const CURVES = {
  in: [...TO].map((_, i) => curvePath((ms) => lettersIn(i, ms).move)),
  out: [...FROM].map((_, i) => curvePath((ms) => 1 - lettersOut(i, ms).move)),
}

/** Dark → System, frozen at a chosen millisecond, over the curve of every letter. */
export function TimelineDemo() {
  const [t, setT] = useState(120)
  const [playing, setPlaying] = useState(false)
  const tRef = useRef(t)
  tRef.current = t
  const fromRef = useRef<HTMLSpanElement>(null)
  const toRef = useRef<HTMLSpanElement>(null)
  const [widths, setWidths] = useState<[number, number]>()
  const [dragging, setDragging] = useState(false)
  const [easing, setEasing] = useState(false)
  const scrubTo = (e: React.PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    setT(Math.round(clamp01((e.clientX - r.left) / r.width) * END))
  }

  useLayoutEffect(() => {
    const measure = () => setWidths([fromRef.current!.offsetWidth, toRef.current!.offsetWidth])
    measure()
    document.fonts?.ready.then(measure)
  }, [])

  // Play at ¼× speed from wherever the playhead is (or from 0 at the end): a linear tween of t.
  useEffect(() => {
    if (!playing) return
    const from = tRef.current
    const controls = animate(from, END, {
      duration: ((END - from) * 4) / 1000,
      ease: 'linear',
      onUpdate: setT,
      onComplete: () => setPlaying(false),
    })
    return () => controls.stop()
  }, [playing])

  const ms = Math.round(t)
  const width = widths && widths[0] + (widths[1] - widths[0]) * easeOut(clamp01(t / 300))

  return (
    <Fig
      title="Roll Phases"
      aside={
        <>
          <Key>System arrives</Key>
          <Key dashed tone="faint">Dark leaves</Key>
        </>
      }
      caption="Every letter's position against time. Dark is gone by 236 ms; System's last letter settles at 390 ms."
    >
      <div className="note-timeline">
        <div className="note-timeline-stage" aria-label={`Dark rolling to System, ${ms}ms in`} role="img">
          <span className="roll note-timeline-word" style={{ width }}>
            <span ref={fromRef} className="roll-word" aria-hidden>
              {[...FROM].map((ch, i) => {
                const o = lettersOut(i, t)
                return (
                  <span
                    key={i}
                    className="roll-letter"
                    style={{ transform: `translateY(${-70 * o.move}%)`, opacity: 1 - o.fade, filter: `blur(${2 * o.fade}px)` }}
                  >
                    {ch}
                  </span>
                )
              })}
            </span>
            <span ref={toRef} className="roll-word" aria-hidden>
              {[...TO].map((ch, i) => {
                const o = lettersIn(i, t)
                return (
                  <span
                    key={i}
                    className="roll-letter"
                    style={{
                      transform: `translateY(${70 * (1 - o.move)}%)`,
                      opacity: o.fade,
                      filter: `blur(${2 * (1 - o.fade)}px)`,
                    }}
                  >
                    {ch}
                  </span>
                )
              })}
            </span>
          </span>
        </div>

        <div>
          {/* Drag anywhere on the chart to scrub (the Time row below has the keyboard).
              A press eases the playhead to the cursor; moving then glues it there. */}
          <div
            className="note-chart"
            aria-hidden
            data-easing={easing || undefined}
            data-dragging={dragging || undefined}
            onPointerDown={(e) => {
              if (e.button !== 0) return
              e.currentTarget.setPointerCapture(e.pointerId)
              setPlaying(false)
              setDragging(true)
              setEasing(true)
              scrubTo(e)
            }}
            onPointerMove={(e) => {
              if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
              setEasing(false)
              scrubTo(e)
            }}
            onPointerUp={() => setDragging(false)}
            onPointerCancel={() => setDragging(false)}
            onLostPointerCapture={() => setDragging(false)}
          >
            <span className="note-chart-y" data-at="top">done</span>
            <span className="note-chart-y" data-at="bottom">start</span>
            <svg viewBox="0 -2 400 104" preserveAspectRatio="none">
              {[0, 100].map((y) => (
                <path key={y} className="c-grid" d={`M0 ${y}H400`} />
              ))}
              {CURVES.out.map((d, i) => (
                <path key={`o${i}`} className="c-out" d={d} />
              ))}
              {CURVES.in.map((d, i) => (
                <path key={`i${i}`} className="c-in" d={d} />
              ))}
            </svg>
            <span className="note-mark" style={{ left: '75%' }}>
              <span>300 ms, the width settles</span>
            </span>
            <span className="note-playhead" style={{ left: `${(t / END) * 100}%` }} />
          </div>
          <div className="note-ticks" aria-hidden>
            {[0, 200, 400].map((v) => (
              <span key={v}>{v ? `${v} ms` : 0}</span>
            ))}
          </div>
        </div>

        <div className="note-timeline-controls">
          <Scrubber
            label="Time"
            value={ms}
            min={0}
            max={END}
            format={(v) => `${v}ms`}
            onChange={(v) => {
              setPlaying(false)
              setT(v)
            }}
          />
          <button
            type="button"
            className="note-btn note-play"
            onClick={() => {
              if (!playing && t >= END) {
                tRef.current = 0
                setT(0)
              }
              setPlaying((p) => !p)
            }}
          >
            <RollingText text={playing ? 'Pause' : 'Play ¼×'} />
          </button>
        </div>
      </div>
    </Fig>
  )
}
