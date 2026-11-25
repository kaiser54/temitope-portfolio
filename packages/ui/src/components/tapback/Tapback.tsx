/**
 * iMessage (macOS 26) tapback: click the reaction badge on a message and the badge grows into the
 * tapback bar while a "who reacted" card blurs in at the top of the conversation.
 *
 * Every value here was read off a 60 fps screen recording, frame by frame (2× retina, so recorded
 * pixels ÷ 2 = CSS px). Times are from the click:
 *   0–50ms     badge takes the press
 *   50–100ms   badge drains from blue to grey glass, its emoji blurs out
 *   60–300ms   badge stretches into the 284 × 38 bar, mostly leftwards, overshooting a little
 *   120–500ms  emojis grow in from small and blurred, left to right, ~35ms apart
 *   ~140ms     the blue "yours" circle slides in from the right; the thought-bubble tail grows a 😀
 *   0–200ms    the rest of the chat dims
 *   100–450ms  the reactions card blurs in under the conversation title
 * Closing runs it backwards in about a third of a second: emojis blur out, the bar shrinks back
 * into the badge, then the blue returns.
 */
import {
  AnimatePresence,
  LazyMotion,
  MotionConfig,
  domAnimation,
  m,
  useReducedMotion,
  type Transition,
} from 'motion/react'
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import './tapback.css'

export type Reaction = { id: string; label: string; glyph: string }

export const REACTIONS: Reaction[] = [
  { id: 'love', label: 'Heart', glyph: '🩷' },
  { id: 'like', label: 'Thumbs up', glyph: '👍' },
  { id: 'dislike', label: 'Thumbs down', glyph: '👎' },
  { id: 'haha', label: 'Ha ha', glyph: 'HAHA' },
  { id: 'wow', label: 'Exclamation', glyph: '‼️' },
  { id: 'question', label: 'Question', glyph: '❓' },
  { id: 'fire', label: 'Fire', glyph: '🔥' },
  { id: 'cry', label: 'Crying', glyph: '😭' },
  { id: 'eyes', label: 'Eyes', glyph: '👀' },
  { id: 'pray', label: 'Folded hands', glyph: '🙏' },
  { id: 'party', label: 'Party', glyph: '🎉' },
]

/*
 * Geometry, in CSS px from the message bubble's top-right corner (the anchor).
 * Badge: 30px circle centred 2px in from the right edge and 9px above the top.
 * Bar: 284 × 38, its right edge 46px right of the badge's centre, its bottom 7px above the bubble.
 */
const BADGE = { left: -17, top: -24, width: 30, height: 30, borderRadius: 15 }
const BAR = { left: -240, top: -45, width: 284, height: 38, borderRadius: 19 }
/** Emoji pitch in the bar: first centre 20px in, then every 38px (so the 8th is cut in half by the edge) */
const PITCH = 38
const FIRST = 20
/** Tail: the badge's 5px dot travels down-right and becomes the bar's 7px dot */
const DOT_CLOSED = { left: 9.5, top: 7.5, width: 5, height: 5 }
const DOT_OPEN = { left: 38.5, top: 28.5, width: 7, height: 7 }

const BLUE = '#0b7bfe'
const GLASS = '#2b2c2f'

/** Stretch the timings of a transition, for slow-motion viewing. */
const slow = (t: Transition, k: number): Transition => {
  const out = { ...t } as Record<string, unknown>
  for (const key of ['duration', 'visualDuration', 'delay'] as const) {
    if (typeof out[key] === 'number') out[key] = (out[key] as number) * k
  }
  return out as Transition
}

export type TapbackProps = {
  /** Time multiplier: 1 is real speed, 4 is quarter speed */
  speed?: number
  /** Delay between emojis growing in, in ms */
  stagger?: number
  /** Blur the emojis and the card start from, in px */
  blur?: number
  /** Bounce of the bar's stretch and the emojis landing (0–1) */
  bounce?: number
}

export function Tapback(props: TapbackProps) {
  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">
        <Chat {...props} />
      </MotionConfig>
    </LazyMotion>
  )
}

function Chat({ speed = 1, stagger = 35, blur = 6, bounce = 0.25 }: TapbackProps) {
  const reduced = useReducedMotion() ?? false
  const [open, setOpen] = useState(false)
  const [mine, setMine] = useState<string | null>('fire')
  /** The blue circle has finished its entrance, so later moves skip the delay */
  const [settled, setSettled] = useState(false)
  const badgeRef = useRef<HTMLButtonElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<number>(0)

  const k = speed
  const b = reduced ? 0 : blur
  const T = {
    geometryOpen: reduced ? { duration: 0 } : slow({ type: 'spring', visualDuration: 0.34, bounce, delay: 0.04 }, k),
    geometryClose: reduced
      ? { duration: 0 }
      : slow({ type: 'spring', visualDuration: 0.26, bounce: 0, delay: 0.08 }, k),
    drain: slow({ duration: 0.1, ease: 'easeOut' }, k),
    // The blue only comes back once the bar is nearly badge-sized again.
    refill: slow({ duration: 0.14, ease: 'easeOut', delay: 0.26 }, k),
  } satisfies Record<string, Transition>

  const reaction = REACTIONS.find((r) => r.id === mine) ?? null

  const close = useCallback((focusBadge = false) => {
    window.clearTimeout(closeTimer.current)
    setOpen(false)
    if (focusBadge) badgeRef.current?.focus()
  }, [])

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])
  useEffect(() => {
    if (!open) setSettled(false)
  }, [open])

  // Escape closes from anywhere while the bar is up.
  useEffect(() => {
    if (!open) return
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && close(true)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  // Move focus into the bar on open: onto your reaction, or the first one.
  useEffect(() => {
    if (!open) return
    const id = requestAnimationFrame(() => {
      const bar = barRef.current
      const target = bar?.querySelector<HTMLButtonElement>('[aria-pressed="true"]') ?? bar?.querySelector('button')
      target?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(id)
  }, [open])

  const pick = (id: string) => {
    // Picking your own reaction again takes it off, as in Messages.
    setMine((cur) => (cur === id ? null : id))
    window.clearTimeout(closeTimer.current)
    // Hold long enough to watch the blue circle land on the new one, then close.
    closeTimer.current = window.setTimeout(() => close(true), 260 * k)
  }

  const onBarKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    const buttons = [...(barRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])]
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement)
    const next = buttons[Math.max(0, Math.min(buttons.length - 1, i + (e.key === 'ArrowRight' ? 1 : -1)))]
    next?.focus()
    next?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    e.preventDefault()
  }

  const selectedIndex = REACTIONS.findIndex((r) => r.id === mine)

  return (
    <div className="tb-chat" data-open={open || undefined}>
      <div className="tb-scene">
        {/* Who reacted with what: centred above the message, where Messages puts it under the title. */}
        <div className="tb-card-anchor">
          <AnimatePresence>
            {open && reaction && (
              <m.div
                className="tb-card"
                role="status"
                aria-label={`You reacted ${reaction.label}`}
                initial={{
                  opacity: 0,
                  scale: 0.9,
                  y: -8,
                  filter: `blur(${b * 2.4}px)`,
                }}
                animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                exit={{
                  opacity: 0,
                  scale: 0.96,
                  y: -4,
                  filter: `blur(${b * 1.6}px)`,
                  transition: slow({ duration: 0.2, ease: 'easeIn' }, k),
                }}
                transition={slow(
                  reduced
                    ? { duration: 0.2 }
                    : {
                        type: 'spring',
                        visualDuration: 0.36,
                        bounce: 0.12,
                        delay: 0.1,
                      },
                  k,
                )}
              >
                <span className="tb-card-glyph">
                  <AnimatePresence initial={false} mode="popLayout">
                    <m.span
                      key={reaction.id}
                      initial={{
                        opacity: 0,
                        scale: 0.5,
                        filter: `blur(${b}px)`,
                      }}
                      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, scale: 0.5, filter: `blur(${b}px)` }}
                      transition={slow({ type: 'spring', visualDuration: 0.25, bounce: 0.3 }, k)}
                    >
                      <Glyph r={reaction} />
                    </m.span>
                  </AnimatePresence>
                </span>
                <span className="tb-card-tail" aria-hidden>
                  <i />
                  <i />
                </span>
                <span className="tb-card-avatar" aria-hidden>
                  M
                </span>
              </m.div>
            )}
          </AnimatePresence>
        </div>

        <div className="tb-target" onDoubleClick={() => !open && setOpen(true)}>
          <div className="tb-preview">
            <Preview />
            {/* Everything that grows out of the badge hangs off the bubble's top-right corner. */}
            <div className="tb-anchor">
              <m.button
                ref={badgeRef}
                type="button"
                className="tb-capsule"
                aria-label={reaction ? `You reacted ${reaction.label}. Show tapbacks` : 'Show tapbacks'}
                aria-expanded={open}
                tabIndex={open || !reaction ? -1 : 0}
                initial={false}
                animate={{
                  ...(open ? BAR : BADGE),
                  backgroundColor: open ? GLASS : BLUE,
                  scale: open || reaction ? 1 : 0,
                  opacity: open || reaction ? 1 : 0,
                }}
                transition={{
                  default: open ? T.geometryOpen : T.geometryClose,
                  backgroundColor: open ? T.drain : T.refill,
                }}
                whileTap={open ? undefined : { scale: 0.88 }}
                onClick={() => !open && setOpen(true)}
              />
              <m.span
                className="tb-dot"
                aria-hidden
                initial={false}
                animate={{
                  ...(open ? DOT_OPEN : DOT_CLOSED),
                  backgroundColor: open ? GLASS : BLUE,
                  scale: open || reaction ? 1 : 0,
                }}
                transition={{
                  default: open ? T.geometryOpen : T.geometryClose,
                  backgroundColor: open ? T.drain : T.refill,
                }}
              />

              {/* The badge's own emoji: blurs out where it sits, comes back once the blue has. */}
              <AnimatePresence initial={false} mode="popLayout">
                {reaction && (
                  <m.span
                    key={reaction.id}
                    className="tb-badge-glyph"
                    aria-hidden
                    initial={{ opacity: 0, scale: 0.4, filter: `blur(${b}px)` }}
                    animate={
                      open
                        ? {
                            opacity: 0,
                            scale: 0.8,
                            filter: `blur(${b * 0.7}px)`,
                            transition: T.drain,
                          }
                        : {
                            opacity: 1,
                            scale: 1,
                            filter: 'blur(0px)',
                            transition: slow(
                              {
                                type: 'spring',
                                visualDuration: 0.3,
                                bounce: 0.4,
                                delay: 0.22,
                              },
                              k,
                            ),
                          }
                    }
                    exit={{
                      opacity: 0,
                      scale: 0.4,
                      filter: `blur(${b}px)`,
                      transition: slow({ duration: 0.12 }, k),
                    }}
                  >
                    <Glyph r={reaction} />
                  </m.span>
                )}
              </AnimatePresence>

              {/* The bar's contents, clipped to the open bar. */}
              <div
                ref={barRef}
                className="tb-track"
                role="toolbar"
                aria-label="Tapbacks"
                aria-hidden={!open}
                onKeyDown={onBarKey}
              >
                <AnimatePresence>
                  {open && (
                    <m.div key="list" className="tb-list" exit={{ opacity: 1 }}>
                      {selectedIndex >= 0 && (
                        <m.span
                          className="tb-selected"
                          aria-hidden
                          initial={{
                            opacity: 0,
                            scale: 0.6,
                            x: FIRST - 17 + selectedIndex * PITCH + 24,
                          }}
                          animate={{
                            opacity: 1,
                            scale: 1,
                            x: FIRST - 17 + selectedIndex * PITCH,
                          }}
                          exit={{
                            opacity: 0,
                            scale: 0.7,
                            filter: `blur(${b}px)`,
                            transition: slow({ duration: 0.12 }, k),
                          }}
                          transition={{
                            default: slow(
                              {
                                type: 'spring',
                                visualDuration: 0.3,
                                bounce: 0.3,
                                delay: 0.14,
                              },
                              k,
                            ),
                            // Picking another reaction: no entrance delay, just a quick glide to it.
                            x: slow(
                              {
                                type: 'spring',
                                visualDuration: 0.3,
                                bounce: 0.3,
                                delay: settled ? 0 : 0.14,
                              },
                              k,
                            ),
                          }}
                          onAnimationComplete={() => setSettled(true)}
                        />
                      )}
                      {REACTIONS.map((r, i) => (
                        <m.button
                          key={r.id}
                          type="button"
                          className="tb-item"
                          aria-label={r.label}
                          aria-pressed={r.id === mine}
                          tabIndex={open ? 0 : -1}
                          initial={{
                            opacity: 0,
                            scale: 0.3,
                            filter: `blur(${b}px)`,
                          }}
                          animate={{
                            opacity: 1,
                            scale: 1,
                            filter: 'blur(0px)',
                          }}
                          exit={{
                            opacity: 0,
                            scale: 0.6,
                            filter: `blur(${b}px)`,
                            transition: slow(
                              {
                                duration: 0.12,
                                ease: 'easeIn',
                                delay: reduced ? 0 : (REACTIONS.length - i) * 0.006,
                              },
                              k,
                            ),
                          }}
                          transition={slow(
                            reduced
                              ? { duration: 0.15 }
                              : {
                                  type: 'spring',
                                  visualDuration: 0.35,
                                  bounce: Math.min(1, bounce + 0.2),
                                  delay: 0.12 + (i * stagger) / 1000,
                                },
                            k,
                          )}
                          whileTap={{ scale: 0.82 }}
                          onClick={() => pick(r.id)}
                        >
                          <Glyph r={r} />
                        </m.button>
                      ))}
                    </m.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Thought-bubble tail: grows a 😀 for picking any emoji (not wired up here). */}
              <AnimatePresence>
                {open && (
                  <m.span
                    className="tb-more"
                    aria-hidden
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{
                      opacity: 0,
                      scale: 0.3,
                      transition: slow({ duration: 0.12 }, k),
                    }}
                    transition={slow(
                      reduced
                        ? { duration: 0.15 }
                        : {
                            type: 'spring',
                            visualDuration: 0.3,
                            bounce: 0.35,
                            delay: 0.16,
                          },
                      k,
                    )}
                  >
                    <Smiley />
                  </m.span>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Dims the ground behind the bar and the card; clicking it closes. */}
      <AnimatePresence>
        {open && (
          <m.div
            className="tb-dim"
            onClick={() => close()}
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              transition: slow({ duration: 0.2, ease: 'easeOut' }, k),
            }}
            exit={{
              opacity: 0,
              transition: slow({ duration: 0.25, ease: 'easeOut', delay: 0.05 }, k),
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/** Apple's "Ha ha" tapback is lettering, not an emoji. */
function Glyph({ r }: { r: Reaction }) {
  if (r.glyph === 'HAHA')
    return (
      <span className="tb-haha">
        HA
        <br />
        HA
      </span>
    )
  return <span className="tb-emoji">{r.glyph}</span>
}

function Smiley() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <circle cx="9" cy="9" r="8" fill="currentColor" />
      <circle cx="6.2" cy="7" r="1.2" fill="#2b2c2f" />
      <circle cx="11.8" cy="7" r="1.2" fill="#2b2c2f" />
      <path d="M5 10.2c.9 2 2.3 3 4 3s3.1-1 4-3z" fill="#2b2c2f" />
    </svg>
  )
}

/** Stand-in for the recorded message: a website screenshot in Messages' blue link frame. */
function Preview() {
  return (
    <div className="tb-shot" aria-label="Screenshot of the Kōfi coffee website" role="img">
      <div className="tb-shot-left">
        <i className="tb-shot-hero" />
        <i />
        <i />
        <i />
      </div>
      <div className="tb-shot-right">
        <span className="tb-shot-brand">kōfi</span>
        <span className="tb-shot-head">
          Good coffee.
          <br />
          Close to home.
        </span>
        <i className="tb-shot-cup" />
      </div>
    </div>
  )
}
