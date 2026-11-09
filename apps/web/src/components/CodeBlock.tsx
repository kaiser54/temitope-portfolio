import { useMemo, useState } from 'react'
import { highlight, type Lang } from './highlight'
import { RollingText } from './RollingText'

/**
 * Titled, syntax-coloured block for code and prompts in notes.
 *
 * - `lang="code"` colours CSS and TS/TSX (both can share one block).
 * - `lang="prompt"` colours plain-English prompts: headings, list markers and inline values; it wraps
 *   and caps its height.
 * - `copy` adds a Copy button whose label rolls to "Copied" with the same component as the theme switch.
 */
export function CodeBlock({
  title,
  code,
  lang = 'code',
  copy = lang === 'prompt',
}: {
  title: string
  code: string
  lang?: Lang
  copy?: boolean
}) {
  const tokens = useMemo(() => highlight(code, lang), [code, lang])
  const [copied, setCopied] = useState(false)

  return (
    <div className="note-code" data-lang={lang}>
      <div className="note-code-file">
        <span>{title}</span>
        {copy && (
          <button
            type="button"
            className="note-copy"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(code)
                setCopied(true)
                setTimeout(() => setCopied(false), 1600)
              } catch {
                // clipboard blocked: the text is still selectable below
              }
            }}
          >
            <RollingText text={copied ? 'Copied' : 'Copy'} />
          </button>
        )}
      </div>
      <pre>
        <code>
          {tokens.map((t, i) => (t.kind ? <span key={i} className={`tok-${t.kind}`}>{t.text}</span> : t.text))}
        </code>
      </pre>
    </div>
  )
}
