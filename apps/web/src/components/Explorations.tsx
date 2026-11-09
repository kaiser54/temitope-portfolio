import { explorations } from '../content'

/** Interaction experiments, in the same row rhythm as Work and Notes. */
export function Explorations() {
  if (explorations.length === 0) {
    return (
      <p className="py-2.5 text-muted">
        Nothing here yet — prototypes and interaction experiments are on the way.
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-1">
      {explorations.map((x) => {
        const body = (
          <>
            <span className="text-sm text-faint tabular-nums sm:pt-px">{x.year}</span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="font-medium">{x.title}</span>
              <span className="text-pretty text-muted">{x.summary}</span>
            </span>
          </>
        )
        const row = 'note-row grid gap-1 py-2.5 sm:grid-cols-[4.5rem_1fr] sm:gap-0'
        return (
          <li key={x.title}>
            {x.href ? (
              <a href={x.href} className={`${row} note-link`}>
                {body}
              </a>
            ) : (
              <div className={row}>{body}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
