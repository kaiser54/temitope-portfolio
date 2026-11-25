import type { CSSProperties, ReactNode } from 'react'

/**
 * Building blocks for note pages, after Raphael Salaja's work pages:
 * numbered figures with a hairline header, comparison tiles, segmented controls and footnotes.
 */

/** Inline value: `300ms`, `cubic-bezier(…)`. */
export const C = ({ children }: { children: ReactNode }) => <code className="note-inline">{children}</code>

/**
 * "Figure N  Title" header with an optional legend or control on the right, a hairline above and
 * below the content, and a centred caption. Numbered by a CSS counter on .note-body.
 */
export function Fig({
  title,
  aside,
  caption,
  children,
}: {
  title: string
  aside?: ReactNode
  caption?: ReactNode
  children: ReactNode
}) {
  return (
    <figure className="note-fig">
      <div className="note-fig-head">
        <p className="note-fig-title">{title}</p>
        {aside && <div className="note-fig-aside">{aside}</div>}
      </div>
      <div className="note-fig-body">{children}</div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  )
}

/** Legend entry for a figure header: a short solid or dashed line, then its label. */
export const Key = ({ dashed, tone = 'fg', children }: { dashed?: boolean; tone?: 'fg' | 'faint' | 'accent'; children: ReactNode }) => (
  <span className="note-key" data-dashed={dashed || undefined} data-tone={tone}>
    <i aria-hidden />
    {children}
  </span>
)

/** Side-by-side tiles, each labelled with a name and one line of spec under it. */
export function Tiles({ items }: { items: { label: string; spec: string; children: ReactNode }[] }) {
  return (
    <div className="note-tiles" style={{ '--n': items.length } as CSSProperties}>
      {items.map((t) => (
        <div key={t.label} className="note-tile">
          <div className="note-tile-box">{t.children}</div>
          <p className="note-tile-label">{t.label}</p>
          <p className="note-tile-spec">{t.spec}</p>
        </div>
      ))}
    </div>
  )
}

/** Segmented control: the active option is a raised chip. */
export function Segmented<T extends string | number>({
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
    <div className="note-seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Superscript footnote reference. */
export const Ref = ({ n }: { n: number }) => (
  <sup className="note-ref">
    <a className="note-ref-link" href={`#fn-${n}`} id={`ref-${n}`} aria-label={`Footnote ${n}`}>
      {n}
    </a>
  </sup>
)

/** Numbered footnotes under a hairline, each with a link back to its reference. */
export function Footnotes({ children }: { children: ReactNode[] }) {
  return (
    <section className="note-footnotes" aria-label="Footnotes">
      <ol>
        {children.map((c, i) => (
          <li key={i} id={`fn-${i + 1}`}>
            <span className="note-fn-n">{i + 1}</span>
            <span>
              {c}{' '}
              <a href={`#ref-${i + 1}`} className="note-fn-back" aria-label="Back to text">
                ↩
              </a>
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

/** External link that opens in a new tab. */
export const Ext = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} target="_blank" rel="noreferrer">
    {children}
  </a>
)
