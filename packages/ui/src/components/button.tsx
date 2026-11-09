import { Button as BaseButton } from '@base-ui/react/button'
import type { ComponentProps } from 'react'

export function Button({ className = '', ...props }: ComponentProps<typeof BaseButton>) {
  return (
    <BaseButton
      className={`inline-flex h-9 items-center justify-center rounded-md bg-neutral-900 px-4 text-sm font-medium text-white transition-colors hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 data-disabled:opacity-50 ${className}`}
      {...props}
    />
  )
}
