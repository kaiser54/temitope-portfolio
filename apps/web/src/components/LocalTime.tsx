import { useEffect, useState } from 'react'

export function LocalTime({ timeZone }: { timeZone: string }) {
  const format = () =>
    new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone }).format(new Date())
  const [time, setTime] = useState(format)

  useEffect(() => {
    const id = setInterval(() => setTime(format()), 15_000)
    return () => clearInterval(id)
  }, [])

  return <time className="tabular-nums">{time}</time>
}
