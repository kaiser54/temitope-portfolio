import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'

/**
 * A slider drawn as a 32px bordered row: label at the start, value at the end, a fill from the
 * left and a 2px handle line at its edge. Modelled on Fluid Functionalism's default slider.
 *
 * - "scrubber": continuous. A press springs the fill to the value; a drag then glues it to the cursor.
 * - "pips": one dot per step, the fill eases on every snap. Use `format` to show named steps.
 *
 * Every moving layer reads one registered custom property, --p (0–1), so a single CSS transition
 * keeps fill, line and preview in step. A hidden native range input owns focus, arrow keys and
 * ARIA; pointer input never reaches it, so a press eases instead of jumping.
 */
export function Scrubber({
  label,
  value,
  min,
  max,
  step = 1,
  format = String,
  onChange,
  variant = 'scrubber',
  disabled = false,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  format?: (v: number) => string
  onChange: (v: number) => void
  variant?: 'scrubber' | 'pips'
  disabled?: boolean
}) {
  const rowRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pressed = useRef(false)
  const [dragging, setDragging] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [hoverAt, setHoverAt] = useState<number | null>(null)
  const [tipReady, setTipReady] = useState(false)

  const span = max - min || 1
  const p = (value - min) / span
  const decimals = (String(step).split('.')[1] ?? '').length
  const pips = variant === 'pips'
  const stepValues = pips ? Array.from({ length: Math.round(span / step) + 1 }, (_, i) => min + i * step) : []
  // Reserve the widest value, so the slot never changes width as the number does.
  const valueCh = Math.max(...(pips ? stepValues : [min, max]).map((v) => format(v).length))

  // The tooltip waits 100ms into a hover, so sweeping across the row doesn't flash it.
  useEffect(() => {
    if (!hovered) return setTipReady(false)
    const id = setTimeout(() => setTipReady(true), 100)
    return () => clearTimeout(id)
  }, [hovered])

  const valueAt = (clientX: number) => {
    const rect = rowRef.current!.getBoundingClientRect()
    // Pips sit 12px in from each edge; the scrubber uses the whole row.
    const inset = pips ? 12 : 0
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left - inset) / (rect.width - inset * 2)))
    const snapped = Math.round((ratio * span) / step) * step + min
    return +Math.min(max, Math.max(min, snapped)).toFixed(decimals)
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled || (e.pointerType === 'mouse' && e.button !== 0)) return
    e.preventDefault()
    pressed.current = true
    setHoverAt(null)
    e.currentTarget.setPointerCapture(e.pointerId)
    inputRef.current?.focus({ preventScroll: true })
    onChange(valueAt(e.clientX))
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (pressed.current) {
      // Scrubber: glued to the cursor from the first move. Pips keep easing between snaps.
      if (!pips && !dragging) setDragging(true)
      const v = valueAt(e.clientX)
      if (v !== value) onChange(v)
      return
    }
    if (e.pointerType === 'mouse') setHoverAt((valueAt(e.clientX) - min) / span)
  }
  const onPointerUp = () => {
    pressed.current = false
    setDragging(false)
    setHoverAt(null)
  }

  const active = hovered || focused
  const showPreview = hoverAt !== null && !pressed.current

  return (
    <div
      className="scrub"
      data-variant={variant}
      data-dragging={dragging || undefined}
      data-active={active || undefined}
      data-focus={focused || undefined}
      data-disabled={disabled || undefined}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHovered(true)}
      onPointerLeave={() => {
        setHovered(false)
        setHoverAt(null)
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        className="scrub-tip"
        data-show={(showPreview && tipReady) || undefined}
        style={{ '--h': hoverAt ?? 0 } as CSSProperties}
        aria-hidden
      >
        {hoverAt !== null && format(+(min + hoverAt * span).toFixed(decimals))}
      </div>

      <div ref={rowRef} className="scrub-row" style={{ '--p': p, '--h': hoverAt ?? p } as CSSProperties}>
        <input
          ref={inputRef}
          className="scrub-input"
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          aria-label={label}
          aria-valuetext={format(value)}
          tabIndex={0}
          onChange={(e) => onChange(+e.target.value)}
          onFocus={(e) => e.currentTarget.matches(':focus-visible') && setFocused(true)}
          onBlur={() => setFocused(false)}
        />

        {pips &&
          stepValues.map((v) => (
            <span key={v} className="scrub-dot" style={{ '--q': (v - min) / span } as CSSProperties} />
          ))}

        {/* Copies of the words on the row's colour, so dots never run under the text. */}
        <div className="scrub-text scrub-occlude" aria-hidden>
          <span>{label}</span>
          <span style={{ minWidth: `${valueCh}ch` }}>{format(value)}</span>
        </div>

        <span className="scrub-fill" />
        <span className="scrub-preview" data-show={showPreview || undefined} />
        <span className="scrub-line" />

        <div className="scrub-text" aria-hidden>
          <span>{label}</span>
          <span className="scrub-value" style={{ minWidth: `${valueCh}ch` }}>
            {format(value)}
          </span>
        </div>
      </div>
    </div>
  )
}
