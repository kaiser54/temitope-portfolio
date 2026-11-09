import { useLayoutEffect, useState } from 'react'

export function LocalTime({ timeZone }: { timeZone: string }) {
  const format = () =>
    new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone }).format(new Date())
  // Empty in the prerendered HTML (the build doesn't know the visitor's time); filled before first paint.
  const [time, setTime] = useState('')

  useLayoutEffect(() => {
    setTime(format())
    const id = setInterval(() => setTime(format()), 15_000)
    return () => clearInterval(id)
  }, [])

  return <time className="tabular-nums">{time}</time>
}
