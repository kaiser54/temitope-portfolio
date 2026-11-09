import { useLayoutEffect, useRef, useState, type CSSProperties, type Ref } from 'react'

/**
 * Text that rolls letter by letter when it changes: the old word's letters roll up and out,
 * the new word's roll in from below, and the box eases to the new word's width.
 *
 * Used by the footer theme switch and by the demos in the theme-switcher note. The demo-only
 * props recreate earlier versions so the note can show the bugs side by side:
 * - `variant="keyframes"` — letters animate with @keyframes (interrupting restarts them)
 * - `variant="grid"`      — words sit in an inline-grid column (they shake while the width animates)
 */
export type RollVariant = 'final' | 'keyframes' | 'grid'

type WordItem = { id: number; text: string; enter: boolean }

function Word({ text, out, enter, ref }: { text: string; out: boolean; enter: boolean; ref?: Ref<HTMLSpanElement> }) {
  return (
    <span ref={ref} aria-hidden className="roll-word" data-out={out || undefined} data-enter={enter || undefined}>
      {[...text].map((ch, i) => (
        <span key={i} className="roll-letter" style={{ '--i': i } as CSSProperties}>
          {ch}
        </span>
      ))}
    </span>
  )
}

export function RollingText({
  text,
  variant = 'final',
  speed = 1,
  bounds = false,
  vars,
  removeAfter = 400,
}: {
  text: string
  variant?: RollVariant
  /** duration multiplier: 1 = real speed, 2 = half speed, 4 = quarter speed */
  speed?: number
  /** outline the animating box (demo aid) */
  bounds?: boolean
  /** override timing variables (--roll-in, --roll-stagger, --roll-travel, --roll-blur, --roll-ease) */
  vars?: CSSProperties
  /** ms before a word that has left is removed (scaled by speed) */
  removeAfter?: number
}) {
  const [words, setWords] = useState<WordItem[]>(() => [{ id: 0, text, enter: false }])
  const currentId = useRef(0)
  const lastText = useRef(text)
  const current = useRef<HTMLSpanElement>(null)
  const [width, setWidth] = useState<number>()

  // read at the moment of a change, so tweaking speed/timing never cancels a pending cleanup
  const timing = useRef({ removeAfter, speed })
  timing.current = { removeAfter, speed }

  // New text: keep the current word mounted and flip it to "out", add the new one as "in".
  useLayoutEffect(() => {
    if (text === lastText.current) return
    lastText.current = text
    const id = ++currentId.current
    setWords((ws) => [...ws, { id, text, enter: true }])
    // drop words once they've finished leaving
    const { removeAfter: after, speed: s } = timing.current
    window.setTimeout(() => setWords((ws) => ws.filter((w) => w.id >= currentId.current)), after * s)
  }, [text])

  // Measure the incoming word so the box's width can ease to it.
  useLayoutEffect(() => {
    setWidth(current.current?.offsetWidth)
  }, [words])

  return (
    <span
      className="roll"
      data-variant={variant === 'final' ? undefined : variant}
      data-bounds={bounds || undefined}
      style={{ ...vars, width, '--roll-speed': speed } as CSSProperties}
    >
      {words.map((w) => {
        const isCurrent = w.id === currentId.current
        return (
          <Word key={w.id} ref={isCurrent ? current : undefined} text={w.text} out={!isCurrent} enter={w.enter} />
        )
      })}
    </span>
  )
}
