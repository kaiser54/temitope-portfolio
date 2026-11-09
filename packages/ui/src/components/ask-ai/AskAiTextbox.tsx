/**
 * Ship's letter input with the "Ask AI" selection popover, recreated for the portfolio notes.
 *
 * Design: Figma "Daash Restaurant" → "AI - For text" (26310:3529): sizes, colours, type, icons and shadows.
 * Behaviour: Ship web app, src/components/LetterInput (LetterInputProvider.tsx, ai/AiChat.tsx): the open delay,
 * views, springs, height-driven durations and streamed replies. What differs from Ship:
 * - A contentEditable stands in for Quill, and the popover is positioned inside the demo instead of in a
 *   Radix portal, so it scrolls with the page.
 * - The AI is `respond` (canned replies by default), not the enhance API.
 */
import { AnimatePresence, LazyMotion, MotionConfig, domMax, m, type Transition } from 'motion/react'
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { fakeRespond, SAMPLE_LETTER, type EnhanceRequest, type Respond } from './dummy'
import arrowUndoUp from './assets/arrow-undo-up.svg'
import arrowUp from './assets/arrow-up.svg'
import checkmark from './assets/checkmark.svg'
import chevronLeft from './assets/chevron-left.svg'
import crossLarge from './assets/cross-large.svg'
import expand from './assets/expand.svg'
import popoverArrow from './assets/popover-arrow.svg'
import stop from './assets/stop.svg'
import { Collapse, Voice } from './icons'
import './ask-ai.css'

type View = 'actions' | 'improve' | 'input' | 'change-ai-tone' | 'fix-spelling'
type Rect = { left: number; top: number; width: number; height: number }
type Selection = { rect: Rect; rects: Rect[]; text: string; range: Range }

const ACTIONS: { label: string; intent: View; gradient?: boolean }[] = [
  { label: 'Improve', intent: 'improve' },
  { label: 'Change tone', intent: 'change-ai-tone' },
  { label: 'Fix spelling', intent: 'fix-spelling' },
  { label: 'Ask AI', intent: 'input', gradient: true },
]
const TONES = ['Romantic', 'Warm', 'Playful', 'Sincere', 'Sweet', 'Thoughtful', 'Gentle', 'Passionate']

/** Delay before the popover opens after a selection settles */
const OPEN_DELAY_MS = 500
/** Popover inner width per view (Figma: 305, 289 and 380 wide with the 4px padding) */
const WIDTH = { actions: 297, loader: 281, input: 372 }
/** Gap between the arrow's frame and the highlighted line (Figma: ~5px) */
const SIDE_OFFSET = 5
/** The highlight covers the 21px line box: 2px above the glyphs' rect, 4px taller */
const HIGHLIGHT = { above: 2, extra: 4 }
const SPRING_LAYOUT: Transition = { duration: 0.4, type: 'spring', bounce: 0.2 }
const CHIP_SPRING: Transition = { type: 'spring', bounce: 0.2, duration: 0.3 }

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export type AskAiTextboxProps = {
  /** Paragraphs the letter starts with */
  initialText?: string[]
  /** Produces the AI reply. Defaults to canned replies after ~1.4s. */
  respond?: Respond
  className?: string
  style?: CSSProperties
}

export function AskAiTextbox({ initialText = SAMPLE_LETTER, respond = fakeRespond, className, style }: AskAiTextboxProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [counts, setCounts] = useState({ words: 0, chars: 0 })
  const [expanded, setExpanded] = useState(false)
  const initialHtml = useMemo(
    () => initialText.map((p) => `<p>${p ? escapeHtml(p) : '<br>'}</p>`).join(''),
    [initialText],
  )

  const updateCounts = useCallback(() => {
    const el = editorRef.current
    if (!el) return
    const text = el.innerText.replace(/\n$/, '')
    const words = text.trim().split(/\s+/).filter(Boolean).length
    setCounts({ words, chars: text.length })
  }, [])

  useLayoutEffect(updateCounts, [updateCounts])

  // Selection tracking (Quill's "selection-change"): rects are kept relative to the demo root.
  useEffect(() => {
    const onChange = () => {
      const editor = editorRef.current
      const root = rootRef.current
      const sel = document.getSelection()
      if (!editor || !root || !sel || sel.rangeCount === 0) return
      // Focus or selection moved outside the editor (e.g. into the popover): keep the last selection.
      if (!sel.anchorNode || !editor.contains(sel.anchorNode)) return
      if (sel.isCollapsed) return setSelection(null)
      const range = sel.getRangeAt(0)
      const text = sel.toString().trim()
      if (!text) return setSelection(null)
      const base = root.getBoundingClientRect()
      const local = (r: DOMRect): Rect => ({ left: r.left - base.left, top: r.top - base.top, width: r.width, height: r.height })
      setSelection({
        rect: local(range.getBoundingClientRect()),
        rects: Array.from(range.getClientRects())
          .filter((r) => r.width > 0 && r.height > 0)
          .map(local),
        text,
        range: range.cloneRange(),
      })
    }
    const clear = () => setSelection(null)
    document.addEventListener('selectionchange', onChange)
    window.addEventListener('resize', clear)
    return () => {
      document.removeEventListener('selectionchange', onChange)
      window.removeEventListener('resize', clear)
    }
  }, [])

  const placeCaret = useCallback((node: Node, after: boolean) => {
    const editor = editorRef.current
    if (!editor) return
    const r = document.createRange()
    if (after) r.setStartAfter(node)
    else r.setStart(node, 0)
    r.collapse(true)
    editor.focus({ preventScroll: true })
    const sel = document.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(r)
  }, [])

  const replaceSelection = useCallback(
    (text: string) => {
      const range = selection?.range
      if (range) {
        range.deleteContents()
        const node = document.createTextNode(text)
        range.insertNode(node)
        placeCaret(node, true)
        updateCounts()
      }
      setSelection(null)
    },
    [selection, placeCaret, updateCounts],
  )

  const clearSelection = useCallback(() => {
    const range = selection?.range
    if (range) {
      range.collapse(false)
      const sel = document.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
    setSelection(null)
  }, [selection])

  const clearText = useCallback(() => {
    const el = editorRef.current
    if (!el) return
    el.innerHTML = '<p><br></p>'
    setSelection(null)
    updateCounts()
  }, [updateCounts])

  const hasText = counts.chars > 0

  return (
    // domMax (layout animations) lives in this lazy chunk only; the site itself loads the lighter domAnimation.
    <LazyMotion features={domMax}>
    <MotionConfig reducedMotion="user">
      <div ref={rootRef} className={['ask-ai', className].filter(Boolean).join(' ')} style={style}>
        <m.div layout transition={SPRING_LAYOUT} className="ask-ai-root" style={{ borderRadius: 24 }}>
          <m.div layout transition={SPRING_LAYOUT} className="ask-ai-header">
            <h4 className="ask-ai-label ask-ai-micro">Express how you feel</h4>
            <button
              type="button"
              className="ask-ai-icon-button ask-ai-press"
              aria-label={expanded ? 'Collapse' : 'Expand'}
              onClick={() => setExpanded((e) => !e)}
            >
              {expanded ? <Collapse /> : <img src={expand} width={12} height={12} alt="" />}
            </button>
          </m.div>

          <m.div
              layout
              transition={SPRING_LAYOUT}
              className="ask-ai-field"
              style={{ borderRadius: 16 }}
              animate={{ minHeight: expanded ? 320 : 0 }}
              onMouseDown={(e) => {
                // Clicking the padding focuses the editor, like Ship's handleTextAreaMouseDown.
                if (e.target === e.currentTarget) {
                  e.preventDefault()
                  editorRef.current?.focus()
                }
              }}
            >
                <div className="ask-ai-editor-row" data-empty={!hasText || undefined}>
                  <div
                    ref={editorRef}
                    className="ask-ai-editor"
                    contentEditable
                    suppressContentEditableWarning
                    spellCheck={false}
                    role="textbox"
                    aria-multiline
                    aria-label="Letter"
                    onInput={updateCounts}
                    dangerouslySetInnerHTML={{ __html: initialHtml }}
                  />
                  {!hasText && (
                    <button
                      type="button"
                      className="ask-ai-voice ask-ai-press"
                      aria-label="Record"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={() => editorRef.current?.focus()}
                    >
                      <Voice />
                    </button>
                  )}
                </div>
          </m.div>

          <m.div layout transition={SPRING_LAYOUT} className="ask-ai-footer">
            <div className="ask-ai-counts ask-ai-micro">
              <span>Words: {counts.words}</span>
              <span>Characters: {counts.chars}</span>
            </div>
            <button type="button" className="ask-ai-clear ask-ai-micro ask-ai-press" onClick={clearText}>
              Clear
            </button>
          </m.div>
        </m.div>

        {selection?.rects.map((r, i) => (
          <div
            key={`${r.left}-${r.top}-${i}`}
            className="ask-ai-highlight"
            style={{
              left: r.left,
              top: r.top - HIGHLIGHT.above,
              width: Math.max(r.width, 1),
              height: Math.max(r.height, 1) + HIGHLIGHT.extra,
            }}
          />
        ))}

        <AiPopover
          selection={selection}
          rootRef={rootRef}
          respond={respond}
          onReplace={replaceSelection}
          onDiscard={clearSelection}
        />
      </div>
    </MotionConfig>
    </LazyMotion>
  )
}

/* ------------------------------------------------------------------ */
/* Popover: state from AiChatProvider, layout from AiChatPopoverRoot   */
/* ------------------------------------------------------------------ */

function AiPopover({
  selection,
  rootRef,
  respond,
  onReplace,
  onDiscard,
}: {
  selection: Selection | null
  rootRef: React.RefObject<HTMLDivElement | null>
  respond: Respond
  onReplace: (text: string) => void
  onDiscard: () => void
}) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<View>('actions')
  const [enhancing, setEnhancing] = useState(false)
  const [loaderText, setLoaderText] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [pending, setPending] = useState<string | null>(null)
  const [showingResult, setShowingResult] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const lastRequestRef = useRef<{ req: EnhanceRequest; loader: string } | null>(null)
  const inputRef = useRef<HTMLDivElement | null>(null)

  const abort = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  // Open 500ms after the selection settles; reset everything when it clears.
  useEffect(() => {
    if (!selection) {
      abort()
      setOpen(false)
      setView('actions')
      setEnhancing(false)
      setPending(null)
      setShowingResult(false)
      setInputValue('')
      return
    }
    const id = window.setTimeout(() => setOpen(true), OPEN_DELAY_MS)
    return () => window.clearTimeout(id)
  }, [selection, abort])

  useEffect(() => {
    if (view !== 'input') setShowingResult(false)
  }, [view])

  const run = useCallback(
    (req: EnhanceRequest, loader: string) => {
      abort()
      const controller = new AbortController()
      abortRef.current = controller
      lastRequestRef.current = { req, loader }
      setLoaderText(loader)
      setEnhancing(true)
      respond(req, controller.signal)
        .then((text) => {
          if (controller.signal.aborted) return
          abortRef.current = null
          setEnhancing(false)
          setPending(text.trim())
          setShowingResult(true)
          setView('input')
        })
        .catch(() => {})
    },
    [abort, respond],
  )

  const text = selection?.text ?? ''
  const actions = {
    choose: (intent: View) => {
      setView(intent)
      if (intent === 'improve') run({ action: 'improve', text }, 'Improving...')
      if (intent === 'fix-spelling') run({ action: 'fix-spelling', text }, 'Fixing spelling...')
    },
    tone: (tone: string) => run({ action: 'tone', text, tone }, 'Changing tone...'),
    send: (prompt: string) => run({ action: 'prompt', text, prompt }, 'working on it...'),
    // Ship's "Try again" only re-sends a custom prompt; here it repeats whichever request produced the result.
    tryAgain: () => lastRequestRef.current && run(lastRequestRef.current.req, lastRequestRef.current.loader),
    stop: () => {
      abort()
      setEnhancing(false)
      setLoaderText('')
      setView('actions')
    },
    discard: () => {
      abort()
      onDiscard()
    },
    replace: () => onReplace(inputValue),
    back: () => setView('actions'),
  }

  // Stream the reply into the input editor: ~60 chunks, 20ms apart.
  useEffect(() => {
    if (view !== 'input' || pending == null) return
    let i = 0
    let id = 0
    const step = () => {
      const el = inputRef.current
      if (!el) {
        id = window.setTimeout(step, 16)
        return
      }
      if (i === 0) el.textContent = ''
      const next = Math.min(pending.length, i + Math.max(1, Math.ceil(pending.length / 60)))
      el.textContent += pending.slice(i, next)
      i = next
      setInputValue(el.textContent ?? '')
      if (i < pending.length) id = window.setTimeout(step, 20)
      else setPending(null)
    }
    step()
    return () => window.clearTimeout(id)
  }, [view, pending])

  // Height-driven duration (AiChatPopoverRoot): bigger jumps take longer, 150–270ms.
  const [measureRef, height] = useHeight()
  const prevHeight = useRef(0)
  const duration = useMemo(() => {
    const prev = prevHeight.current
    prevHeight.current = height
    if (!prev) return 0.15
    return Math.min(Math.max(Math.abs(height - prev) / 500, 0.15), 0.27)
  }, [height])

  const rootWidth = rootRef.current?.clientWidth ?? 0
  // Ship caps the popover at 90vw; here it also stays inside the demo (4px padding + 8px each side).
  const loading = enhancing || view === 'improve' || view === 'fix-spelling'
  const target = view === 'input' && !loading ? WIDTH.input : loading ? WIDTH.loader : WIDTH.actions
  const innerWidth = rootWidth ? Math.min(target, rootWidth - 24) : target
  const anchor = selection && {
    left: clampCenter(selection.rect.left + selection.rect.width / 2, innerWidth + 8, rootWidth),
    top: selection.rect.top - HIGHLIGHT.above - SIDE_OFFSET,
  }

  const key = enhancing ? 'loader' : view
  let body: ReactNode
  if (loading) {
    body = <LoaderView text={loaderText || 'Loading...'} onStop={actions.stop} />
  } else if (view === 'input') {
    body = (
      <InputView
        inputRef={inputRef}
        value={inputValue}
        onInput={setInputValue}
        showingResult={showingResult}
        onBack={actions.back}
        onSend={() => actions.send(inputValue)}
        onTryAgain={actions.tryAgain}
        onDiscard={actions.discard}
        onReplace={actions.replace}
      />
    )
  } else if (view === 'change-ai-tone') {
    body = <ToneView onBack={actions.back} onTone={actions.tone} />
  } else {
    body = <ActionsView onChoose={actions.choose} />
  }

  return (
    <AnimatePresence>
      {open && anchor && (
        <div className="ask-ai-anchor" style={{ left: anchor.left, top: anchor.top }}>
          {/* tailwindcss-animate: fade-in-0 zoom-in-95 slide-in-from-bottom-2, 150ms */}
          <m.div
            className="ask-ai-shell"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <div className="ask-ai-popover" role="dialog" aria-label="Ask AI">
              <m.div
                className="ask-ai-size"
                initial={false}
                animate={{ height: height || 24, width: innerWidth }}
                transition={{ duration, ease: [0.25, 1, 0.5, 1] }}
              >
                <div ref={measureRef} className="ask-ai-measure">
                  <AnimatePresence initial={false} mode="popLayout">
                    <m.div
                      key={key}
                      initial={{ opacity: 0, scale: 0.96, filter: 'blur(8px)' }}
                      animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, scale: 0.96, filter: 'blur(8px)' }}
                      transition={{ duration, ease: [0.26, 0.08, 0.25, 1] }}
                    >
                      {body}
                    </m.div>
                  </AnimatePresence>
                </div>
              </m.div>
            </div>
            <div className="ask-ai-arrow" aria-hidden>
              <img src={popoverArrow} width={13.4329} height={9.1485} alt="" />
            </div>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  )
}

/** Centre x for a box of `width`, kept 8px inside the demo (Radix's collision padding, roughly). */
function clampCenter(x: number, width: number, bounds: number) {
  if (!bounds) return x
  const half = width / 2
  return Math.min(Math.max(x, half + 8), Math.max(half + 8, bounds - half - 8))
}

/** react-use-measure, height only. */
function useHeight() {
  const [height, setHeight] = useState(0)
  const ro = useRef<ResizeObserver | null>(null)
  const ref = useCallback((el: HTMLDivElement | null) => {
    ro.current?.disconnect()
    if (!el) return
    ro.current = new ResizeObserver(([entry]) => setHeight(entry.target.getBoundingClientRect().height))
    ro.current.observe(el)
  }, [])
  return [ref, height] as const
}

/* ------------------------------ Views ------------------------------ */

function ActionsView({ onChoose }: { onChoose: (v: View) => void }) {
  return (
    <div className="ask-ai-row">
      <HoverPills>
        {ACTIONS.map(({ label, intent, gradient }) => ({
          id: label,
          wide: gradient,
          onClick: () => onChoose(intent),
          content: (
            <p className="ask-ai-micro" data-gradient={gradient || undefined}>
              {label}
            </p>
          ),
        }))}
      </HoverPills>
    </div>
  )
}

function ToneView({ onBack, onTone }: { onBack: () => void; onTone: (t: string) => void }) {
  return (
    <div className="ask-ai-tones">
      <button type="button" className="ask-ai-chip ask-ai-back-chip" aria-label="Back" onClick={onBack}>
        <img src={arrowUndoUp} width={14} height={14} alt="" />
      </button>
      <div className="ask-ai-tone-track">
        <div className="ask-ai-tone-scroll">
          <HoverPills>
            {TONES.map((tone) => ({ id: tone, onClick: () => onTone(tone), content: <p className="ask-ai-micro">{tone}</p> }))}
          </HoverPills>
        </div>
        <div className="ask-ai-tone-fade" data-side="left" />
        <div className="ask-ai-tone-fade" data-side="right" />
      </div>
    </div>
  )
}

function LoaderView({ text, onStop }: { text: string; onStop: () => void }) {
  return (
    <div className="ask-ai-loader">
      <Shimmer text={text} />
      <button type="button" className="ask-ai-stop ask-ai-press" aria-label="Cancel" onClick={onStop}>
        <img src={stop} width={16} height={16} alt="" />
      </button>
    </div>
  )
}

function InputView({
  inputRef,
  value,
  onInput,
  showingResult,
  onBack,
  onSend,
  onTryAgain,
  onDiscard,
  onReplace,
}: {
  inputRef: React.RefObject<HTMLDivElement | null>
  value: string
  onInput: (v: string) => void
  showingResult: boolean
  onBack: () => void
  onSend: () => void
  onTryAgain: () => void
  onDiscard: () => void
  onReplace: () => void
}) {
  const hasInput = value.trim().length > 0

  // Focus the editor when the view opens (Quill's focus() after init).
  useEffect(() => {
    const id = requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }))
    return () => cancelAnimationFrame(id)
  }, [inputRef])

  return (
    <div className="ask-ai-input-view">
      <div className="ask-ai-input-host">
        <div
          ref={inputRef}
          className="ask-ai-input"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline
          aria-label="Ask AI"
          data-placeholder="Make it better"
          data-empty={!hasInput || undefined}
          onInput={(e) => onInput(e.currentTarget.innerText.trim())}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !showingResult && hasInput) {
              e.preventDefault()
              onSend()
            }
          }}
        />
      </div>
      {showingResult ? (
        <div className="ask-ai-input-actions">
          <button type="button" className="ask-ai-pill-button ask-ai-micro ask-ai-press" data-tone="dark" onClick={onTryAgain}>
            <img src={arrowUndoUp} width={14} height={14} alt="" />
            Try again
          </button>
          <div className="ask-ai-input-group">
            <button type="button" className="ask-ai-pill-button ask-ai-micro ask-ai-press" data-tone="dark" onClick={onDiscard}>
              <img src={crossLarge} width={14} height={14} alt="" />
              Discard
            </button>
            <button
              type="button"
              className="ask-ai-pill-button ask-ai-micro ask-ai-press"
              data-tone="light"
              disabled={!hasInput}
              onClick={onReplace}
            >
              <img src={checkmark} width={14} height={14} alt="" />
              Replace
            </button>
          </div>
        </div>
      ) : (
        <div className="ask-ai-input-actions">
          <button type="button" className="ask-ai-round ask-ai-press" data-tone="dark" aria-label="Back" onClick={onBack}>
            <img src={chevronLeft} width={14} height={14} alt="" />
          </button>
          <button
            type="button"
            className="ask-ai-round ask-ai-press"
            data-tone="light"
            aria-label="Send"
            disabled={!hasInput}
            onClick={onSend}
          >
            <img src={arrowUp} width={14} height={14} alt="" />
          </button>
        </div>
      )}
    </div>
  )
}

/* --------------------------- Primitives --------------------------- */

/** AnimatedBackground (enableHover): one pill that springs between hovered items. None until hovered, as in Figma. */
function HoverPills({
  children,
}: {
  children: { id: string; wide?: boolean; onClick: () => void; content: ReactNode }[]
}) {
  const [active, setActive] = useState<string | null>(null)
  const layoutId = `ask-ai-pill-${useId()}`
  return (
    <>
      {children.map(({ id, wide, onClick, content }) => (
        <button
          key={id}
          type="button"
          className="ask-ai-chip"
          data-wide={wide || undefined}
          data-checked={active === id}
          onMouseEnter={() => setActive(id)}
          onMouseLeave={() => setActive(null)}
          onClick={onClick}
        >
          <AnimatePresence initial={false}>
            {active === id && (
              <m.div
                layoutId={layoutId}
                className="ask-ai-chip-pill"
                transition={CHIP_SPRING}
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            )}
          </AnimatePresence>
          <div className="ask-ai-chip-label">{content}</div>
        </button>
      ))}
    </>
  )
}

/** ShimmeringText: a white band sweeping across #888 text, 1s, 0.5s apart. */
function Shimmer({ text }: { text: string }) {
  const spread = text.length * 2
  return (
    <m.span
      className="ask-ai-shimmer ask-ai-micro"
      style={{
        backgroundImage: `linear-gradient(90deg, transparent calc(50% - ${spread}px), #fff, transparent calc(50% + ${spread}px)), linear-gradient(#888888, #888888)`,
      }}
      initial={{ backgroundPosition: '100% center', opacity: 0 }}
      animate={{ backgroundPosition: '0% center', opacity: 1 }}
      transition={{
        backgroundPosition: { repeat: Infinity, duration: 1, repeatDelay: 0.5, ease: 'linear' },
        opacity: { duration: 1 },
      }}
    >
      {text}
    </m.span>
  )
}
