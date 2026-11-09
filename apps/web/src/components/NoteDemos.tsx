import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { RollingText, type RollVariant } from './RollingText'
import { Scrubber } from './Scrubber'

const WORDS = ['Light', 'Dark', 'System']
const SPEEDS = [
  { label: '1×', value: 1 },
  { label: '½×', value: 2 },
  { label: '¼×', value: 4 },
]

/** Framed demo with a caption. */
export function Figure({ children, caption, controls }: { children: ReactNode; caption?: ReactNode; controls?: ReactNode }) {
  return (
    <figure className="note-figure">
      <div className="note-stage">{children}</div>
      {controls && <div className="note-controls">{controls}</div>}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  )
}

function Chips<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { label: string; value: T }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="note-chips" role="group" aria-label={label}>
      <span className="note-chips-label">{label}</span>
      {options.map((o) => (
        <button key={String(o.value)} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** One clickable rolling word, right-aligned like the footer switch so its left edge moves. */
function Cycler({
  variant,
  speed,
  bounds,
  label,
  vars,
  removeAfter,
}: {
  variant?: RollVariant
  speed: number
  bounds: boolean
  label?: string
  vars?: CSSProperties
  removeAfter?: number
}) {
  const [i, setI] = useState(0)
  return (
    <div className="note-cycler">
      {label && <span className="note-cycler-label">{label}</span>}
      <button
        type="button"
        className="note-roll-button"
        aria-label={`${label ? `${label}: ` : ''}${WORDS[i]}. Click to switch`}
        onClick={() => setI((n) => (n + 1) % WORDS.length)}
      >
        <RollingText text={WORDS[i]} variant={variant} speed={speed} bounds={bounds} vars={vars} removeAfter={removeAfter} />
      </button>
    </div>
  )
}

const EASES = [
  { label: 'Ease-out', value: 'cubic-bezier(0.23, 1, 0.32, 1)' },
  { label: 'Ease', value: 'ease' },
  { label: 'Linear', value: 'linear' },
  { label: 'Back', value: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
]
const DEFAULTS = { duration: 300, stagger: 18, travel: 70, blur: 2, ease: EASES[0].value }

/** The switch as it ships, with every timing exposed. */
export function TweakDemo() {
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
    <figure className="note-figure">
      <div className="note-stage">
        <Cycler speed={1} bounds={bounds} vars={vars} removeAfter={t.duration + t.stagger * 6 + 120} />
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
          format={(i) => EASES[i].label}
          onChange={(i) => set('ease')(EASES[i].value)}
        />
        <div className="note-tweaks-row">
          <Chips
            label="Bounds"
            options={[
              { label: 'Off', value: 'off' },
              { label: 'On', value: 'on' },
            ]}
            value={bounds ? 'on' : 'off'}
            onChange={(v) => setBounds(v === 'on')}
          />
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

/** v1 (keyframes) vs final (transitions): click each twice, fast. */
export function InterruptDemo() {
  const [speed, setSpeed] = useState(2)
  return (
    <Figure
      caption="Click each twice, fast."
      controls={<Chips label="Speed" options={SPEEDS} value={speed} onChange={setSpeed} />}
    >
      <div className="note-pair">
        <Cycler label="Keyframes" variant="keyframes" speed={speed} bounds={false} />
        <Cycler label="Transitions" speed={speed} bounds={false} />
      </div>
    </Figure>
  )
}

/** v2 (inline-grid) vs final (pinned): the shake. */
export function ShakeDemo() {
  const [speed, setSpeed] = useState(4)
  return (
    <Figure
      caption="Go from System to Light and watch the right edge."
      controls={<Chips label="Speed" options={SPEEDS} value={speed} onChange={setSpeed} />}
    >
      <div className="note-pair">
        <Cycler label="Grid" variant="grid" speed={speed} bounds />
        <Cycler label="Pinned" speed={speed} bounds />
      </div>
    </Figure>
  )
}

/** Copyable prompt; the button label rolls Copy → Copied with the same component. */
export function PromptBlock({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="note-code">
      <div className="note-code-file note-prompt-head">
        <span>Prompt</span>
        <button
          type="button"
          className="note-copy"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(prompt)
              setCopied(true)
              setTimeout(() => setCopied(false), 1600)
            } catch {
              // clipboard blocked: the text is still selectable below
            }
          }}
        >
          <RollingText text={copied ? 'Copied' : 'Copy'} />
        </button>
      </div>
      <pre className="note-prompt">
        <code>{prompt}</code>
      </pre>
    </div>
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

  useLayoutEffect(() => {
    const measure = () => setWidths([fromRef.current!.offsetWidth, toRef.current!.offsetWidth])
    measure()
    document.fonts?.ready.then(measure)
  }, [])

  // Play at ¼× speed from wherever the playhead is (or from 0 at the end).
  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    let cur = tRef.current
    const tick = (now: number) => {
      cur = Math.min(END, cur + (now - last) / 4)
      last = now
      setT(cur)
      if (cur >= END) setPlaying(false)
      else raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing])

  const ms = Math.round(t)
  const width = widths && widths[0] + (widths[1] - widths[0]) * easeOut(clamp01(t / 300))

  return (
    <figure className="note-figure">
      <div className="note-stage">
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
            <div className="note-chart" aria-hidden>
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
              <span className="note-playhead" style={{ left: `${(t / END) * 100}%` }} />
            </div>
            <div className="note-ticks" aria-hidden>
              {[0, 100, 200, 300, 400].map((v) => (
                <span key={v}>{v}ms</span>
              ))}
            </div>
          </div>

          <div className="note-legend">
            <span className="l-in"><i />System arrives, 18ms apart</span>
            <span className="l-out"><i />Dark leaves, 12ms apart</span>
          </div>
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
          className="note-play"
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
      <figcaption>
        Drag through the roll. Dark is gone by 236ms; System's last letter settles at 390ms. The width finishes
        with the first letter, at 300ms.
      </figcaption>
    </figure>
  )
}
