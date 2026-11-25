import { lazy, Suspense, useEffect, useState } from 'react'
import { Segmented } from '../components/NoteKit'
import { Scrubber } from '../components/Scrubber'

// Separate chunk: motion and the demo only load on this note.
const Tapback = lazy(() => import('@repo/ui/tapback').then((m) => ({ default: m.Tapback })))

export const TAPBACK_PROMPT = `Build the iMessage (macOS 26, dark) tapback in React with Motion (motion/react). Values were read off a 60 fps screen recording; CSS px.

Anatomy
- Reaction badge: 30px circle, #0b7bfe, centred 2px in from the message bubble's right edge and 9px above its top. 15px emoji inside. A 5px dot hangs off its lower right (centre +14, +19 from the badge centre).
- Tapback bar: 284 × 38, radius 19, #2b2c2f with a 0.5px white/10% inner hairline. Right edge 46px right of the badge centre, bottom 7px above the bubble. Emojis 22px, centres 20px in then every 38px; the 8th is cut in half by the edge (the row scrolls). Your reaction sits on a 34px #0b7bfe circle.
- Tail: the badge dot becomes a 7px dot at (+44, +41); a 34px circle with a grey 😀 grows at (+26, +16).
- Reactions card: 122 × 120, radius 26, #2a2a2d, centred 8px under the conversation title. A 48px #3a3a3e circle with the reaction, two thought-bubble dots (7px, 4px), then a 30px avatar.
- Dim: black at 50% over everything except the message, the bar and the card.

Open (from the click)
- 0–100ms: badge colour #0b7bfe → #2b2c2f (100ms ease-out). Its emoji fades to 0, scale 0.8, blur 4px.
- 40ms: badge box animates to the bar box (left/top/width/height/radius), spring visualDuration 0.34, bounce 0.25. Mostly grows left; the left edge overshoots a little.
- 120ms + i × 35ms: each emoji from opacity 0, scale 0.3, blur 6px to 1/1/0, spring visualDuration 0.35, bounce 0.45.
- 140ms: blue "yours" circle slides in from 24px to the right, scale 0.6 → 1, spring 0.3 / 0.3.
- 160ms: 😀 tail circle scale 0 → 1, spring 0.3 / 0.35, origin top-left.
- 0–200ms: dim fades in, ease-out.
- 100ms: card from opacity 0, scale 0.9, y −8, blur 14px to rest, spring visualDuration 0.36, bounce 0.12, origin top centre.

Close (click outside, Escape, or after picking)
- Emojis: opacity 0, scale 0.6, blur 6px over 120ms ease-in, last one first (6ms apart).
- 80ms: bar box back to the badge box, spring visualDuration 0.26, bounce 0.
- 200ms: colour back to blue over 140ms; badge emoji springs back in (0.3 / 0.4) at 220ms.
- Card: opacity 0, scale 0.96, y −4, blur 10px over 200ms ease-in. Dim fades out over 250ms after 50ms.

Interruptible
- Every value is a spring or tween on the current value, so reopening mid-close carries on from where it is.
- Picking a reaction moves the blue circle to it, updates the badge and card, and closes after 260ms. Picking your own again removes it; the badge scales to 0.

Details
- The badge is a button with aria-expanded; the bar is role="toolbar" with Left/Right arrow keys and focus starts on your reaction. Escape closes and returns focus to the badge.
- "Ha ha" is lettering (two lines of HA, 900 weight, blue gradient), not an emoji.

Reduced motion
- No blur, no stagger, no bounce; the bar and badge swap instantly and everything else fades over 150–200ms.`

const DEFAULTS = { stagger: 35, blur: 6, bounce: 0.25, speed: 1 }
const SPEEDS = [
  { label: '1×', value: 1 },
  { label: '½×', value: 2 },
  { label: '¼×', value: 4 },
]

/** The tapback, live, with the values it reads in rows under the card. */
function TapbackDemo() {
  // Client only: the prerendered page shows the empty stage, then the demo loads after hydration.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const [t, setT] = useState(DEFAULTS)
  const set = <K extends keyof typeof DEFAULTS>(k: K) => (v: (typeof DEFAULTS)[K]) => setT((s) => ({ ...s, [k]: v }))
  const changed = JSON.stringify(t) !== JSON.stringify(DEFAULTS)
  const fallback = <div className="note-tapback-fallback" />

  return (
    <figure className="note-demo">
      <div className="note-demo-stage note-tapback-stage">
        {mounted ? (
          <Suspense fallback={fallback}>
            <Tapback {...t} />
          </Suspense>
        ) : (
          fallback
        )}
      </div>
      <div className="note-tweaks">
        <Scrubber label="Stagger" value={t.stagger} min={0} max={100} format={(v) => `${v}ms`} onChange={set('stagger')} />
        <Scrubber label="Blur" value={t.blur} min={0} max={12} step={0.5} format={(v) => `${v}px`} onChange={set('blur')} />
        <Scrubber label="Bounce" value={t.bounce} min={0} max={0.6} step={0.05} format={(v) => v.toFixed(2)} onChange={set('bounce')} />
        <div className="note-tweaks-row">
          <span className="note-tweaks-label">Speed</span>
          <Segmented label="Speed" options={SPEEDS} value={t.speed} onChange={set('speed')} />
          <button type="button" className="note-reset" disabled={!changed} onClick={() => setT(DEFAULTS)}>
            Reset
          </button>
        </div>
      </div>
      <figcaption>
        Click the 🔥 on the message, then pick another reaction, or click outside to close. Slow it to ¼× to
        watch it frame by frame.
      </figcaption>
    </figure>
  )
}

/** Build log: the iMessage tapback. Draft: the demo is in; the write-up comes next. */
export function TapbackNote() {
  return (
    <>
      <p>
        Click a reaction in Messages and the little badge stretches into the whole tapback bar, while a card at the top
        tells you who reacted. I recorded it at 60 fps and went through it frame by frame. This is the rebuild, with
        those values.
      </p>
      <TapbackDemo />
    </>
  )
}
