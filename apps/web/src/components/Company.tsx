import { HoverCard } from '@repo/ui'
import { companies, type CompanyKey } from '../content'

// Warm the image cache when the pointer reaches a name, so the card opens with its image ready.
const preloaded = new Set<string>()
function preload(src?: string) {
  if (!src || preloaded.has(src)) return
  preloaded.add(src)
  new Image().src = src
}

export function Company({ id }: { id: CompanyKey }) {
  const c = companies[id]
  return (
    <HoverCard
      onPointerEnter={() => preload(c.og)}
      onFocus={() => preload(c.og)}
      href={c.href}
      {...(c.href && { target: '_blank', rel: 'noreferrer' })}
      className="company"
      trigger={
        <>
          <span aria-hidden className="company-mark" data-tile={'logoOnTile' in c || undefined}>
            {c.logo ? <img src={c.logo} alt="" /> : <span>{c.initial}</span>}
          </span>
          {c.name}
        </>
      }
    >
      <div className="flex w-72 flex-col overflow-hidden rounded-xl border border-line bg-surface text-sm shadow-card">
        {c.og && (
          <img
            src={c.og}
            alt=""
            width={1200}
            height={630}
            decoding="async"
            className="og-image aspect-1200/630 w-full border-b border-line object-cover object-top"
            onLoad={(e) => (e.currentTarget.dataset.loaded = '')}
          />
        )}
        <div className="flex flex-col gap-1 p-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-medium text-fg">{c.name}</span>
            <span className="text-faint tabular-nums">{c.years}</span>
          </div>
          <p className="text-muted">{c.role}</p>
          <p className="text-pretty text-muted">{c.blurb}</p>
        </div>
      </div>
    </HoverCard>
  )
}
