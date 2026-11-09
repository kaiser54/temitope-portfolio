import { lazy, Suspense, useEffect, useState } from 'react'

// Separate chunk: motion and the demo only load on this note.
const AskAiTextbox = lazy(() => import('@repo/ui/ask-ai').then((m) => ({ default: m.AskAiTextbox })))

/** Ship's letter input, live: highlight text and the AI popover opens above it. */
function AskAiDemo() {
  // Client only: the prerendered page shows the placeholder, then the demo loads after hydration.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const fallback = <div className="note-askai-fallback" />
  return (
    <figure className="note-figure note-figure-wide">
      <div className="note-stage note-askai-stage">
        <div className="note-askai">
          {mounted ? (
            <Suspense fallback={fallback}>
              <AskAiTextbox />
            </Suspense>
          ) : (
            fallback
          )}
        </div>
      </div>
      <figcaption>Highlight any part of the letter. The AI replies here are canned.</figcaption>
    </figure>
  )
}

/** Build log: highlight text, ask AI. Draft: the demo is in; the write-up comes next. */
export function AskAiNote() {
  return (
    <>
      <p>
        In Ship's letter editor you can highlight any text and ask AI to improve it, fix its spelling, change its tone,
        or do whatever you ask. This is the real component, rebuilt with the same values.
      </p>
      <AskAiDemo />
    </>
  )
}
