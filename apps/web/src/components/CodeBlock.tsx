import { Copy, FileText } from 'lucide-react'
import { useMemo } from 'react'
import { CopyIconButton } from './IconButton'
import { highlight, type Lang } from './highlight'

/**
 * Titled, syntax-coloured block for code and prompts in notes: a faint shell holding a file icon,
 * the filename and a copy button, with the code on a raised inner card.
 *
 * - `lang="code"` colours CSS and TS/TSX (both can share one block).
 * - `lang="prompt"` colours plain-English prompts: headings, list markers and inline values; it wraps
 *   and caps its height.
 */
export function CodeBlock({ title, code, lang = 'code' }: { title: string; code: string; lang?: Lang }) {
  const tokens = useMemo(() => highlight(code, lang), [code, lang])

  return (
    <div className="note-code" data-lang={lang}>
      <div className="note-code-file">
        <span className="note-code-name">
          <FileText size={14} strokeWidth={1.75} aria-hidden />
          {title}
        </span>
        <CopyIconButton
          label={`Copy ${title}`}
          text={() => code}
          size={14}
          icon={<Copy size={14} strokeWidth={1.75} aria-hidden />}
        />
      </div>
      <pre>
        <code>
          {tokens.map((t, i) => (t.kind ? <span key={i} className={`tok-${t.kind}`}>{t.text}</span> : t.text))}
        </code>
      </pre>
    </div>
  )
}
