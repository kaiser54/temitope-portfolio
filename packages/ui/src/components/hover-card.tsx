import { PreviewCard } from '@base-ui/react/preview-card'
import type { ComponentProps, ReactNode } from 'react'

type HoverCardProps = Omit<ComponentProps<typeof PreviewCard.Trigger>, 'children'> & {
  trigger: ReactNode
  children: ReactNode
}

/** Inline trigger that reveals a small card on hover / focus. */
export function HoverCard({ trigger, children, className, ...props }: HoverCardProps) {
  return (
    <PreviewCard.Root>
      <PreviewCard.Trigger delay={250} closeDelay={100} className={className as string} {...props}>
        {trigger}
      </PreviewCard.Trigger>
      <PreviewCard.Portal>
        <PreviewCard.Positioner sideOffset={8}>
          <PreviewCard.Popup className="ui-hover-card">{children}</PreviewCard.Popup>
        </PreviewCard.Positioner>
      </PreviewCard.Portal>
    </PreviewCard.Root>
  )
}
