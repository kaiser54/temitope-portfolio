import { useState, type CSSProperties, type ReactNode } from 'react'
import { RollingText, type RollVariant } from './RollingText'

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

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  onChange: (v: number) => void
}) {
  return (
    <label className="note-slider">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} />
      <output>
        {value}
        {unit}
      </output>
    </label>
  )
}

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
        <Slider label="Duration" value={t.duration} min={100} max={1200} step={10} unit="ms" onChange={set('duration')} />
        <Slider label="Stagger" value={t.stagger} min={0} max={80} step={1} unit="ms" onChange={set('stagger')} />
        <Slider label="Travel" value={t.travel} min={0} max={140} step={5} unit="%" onChange={set('travel')} />
        <Slider label="Blur" value={t.blur} min={0} max={10} step={0.5} unit="px" onChange={set('blur')} />
        <div className="note-tweaks-row">
          <Chips label="Curve" options={EASES} value={t.ease} onChange={set('ease')} />
        </div>
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
