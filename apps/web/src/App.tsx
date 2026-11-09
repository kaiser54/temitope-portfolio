import { useEffect, type CSSProperties } from 'react'
import { contact, profile } from './content'
import { Company } from './components/Company'
import { LocalTime } from './components/LocalTime'
import { ThemeToggle } from './components/ThemeToggle'
import { FooterString } from './components/FooterString'
import { SectionTabs } from './components/SectionTabs'
import { NotePage } from './components/NotePage'
import { applyHead, useRoute } from './router'
import { MotionProvider } from './motion'

const visibleContact = contact.filter((g) => !g.hidden)

export function App() {
  const route = useRoute()
  // <title> + description for every route (home, sections, filters, notes)
  useEffect(() => applyHead(route), [route.section, route.filter, route.home, route.note])

  return (
    <MotionProvider>
    <main className="mx-auto flex min-h-dvh max-w-[600px] flex-col gap-16 px-6 pt-12 pb-20 font-sans text-[15px] leading-relaxed sm:pt-16 sm:pb-28">
      {route.notFound ? (
        <section className="enter flex flex-col gap-4" style={{ '--i': 0 } as CSSProperties}>
          <h1 className="font-medium">Page not found</h1>
          <p className="text-muted">
            There's nothing at this address.{' '}
            <a className="link-dotted" href="/">
              Go to the homepage
            </a>
          </p>
        </section>
      ) : route.note ? (
        <NotePage key={route.note} slug={route.note} />
      ) : (
      <>
      <header className="enter flex flex-col gap-6" style={{ '--i': 0 } as CSSProperties}>
        <div>
          <span className="avatar-hit mb-4">
            <img
              src="/avatar.jpg"
              alt={profile.name}
              width={40}
              height={40}
              className="avatar size-10 rounded-full object-cover"
            />
          </span>
          <h1 className="font-medium">{profile.name}</h1>
          <p className="text-muted">
            {profile.role} · {profile.location} · <LocalTime timeZone={profile.timeZone} />
          </p>
        </div>
        <div className="flex flex-col gap-4 text-muted">
          {profile.intro.map((segments, i) => (
            <p key={i} className="text-pretty">
              {segments.map((seg, j) =>
                typeof seg === 'string' ? seg : <Company key={j} id={seg.company} />,
              )}
            </p>
          ))}
        </div>
        {visibleContact.length > 0 && (
        <div className="grid grid-cols-2 gap-6 pt-2 text-sm">
          {visibleContact.map((group) => (
            <div key={group.title} className="flex flex-col gap-2">
              <h2 className="text-faint">{group.title}</h2>
              <ul className="flex flex-col gap-1.5">
                {group.links.map((l) => (
                  <li key={l.href}>
                    <a
                      className="link-dotted"
                      href={l.href}
                      {...(l.href.startsWith('http') && { target: '_blank', rel: 'noreferrer' })}
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        )}
      </header>

      <SectionTabs index={1} />
      </>
      )}


      <footer
        className="enter mt-auto flex flex-col text-sm text-faint"
        style={{ '--i': 2 } as CSSProperties}
      >
        <FooterString />
        <div className="flex items-center justify-between gap-4 pt-6">
          <p suppressHydrationWarning>© {new Date().getFullYear()} {profile.name}</p>
          <ThemeToggle />
        </div>
      </footer>
    </main>
    </MotionProvider>
  )
}
