import { PreviewCard } from '@base-ui/react/preview-card'
import { m, type Transition } from 'motion/react'
import { useRef, useState, type ComponentProps, type ReactNode } from 'react'

type HoverCardProps = Omit<ComponentProps<typeof PreviewCard.Trigger>, 'children'> & {
  trigger: ReactNode
  children: ReactNode
}

type Actions = NonNullable<ComponentProps<typeof PreviewCard.Root>['actionsRef']>['current']

/** Opens with a small spring from its trigger; closes quicker than it opens. */
const OPEN: Transition = { type: 'spring', visualDuration: 0.2, bounce: 0.2 }
const CLOSE: Transition = { duration: 0.12, ease: [0.23, 1, 0.32, 1] }
const shown = { opacity: 1, scale: 1, filter: 'blur(0px)' }
const hiddenState = { opacity: 0, scale: 0.96, filter: 'blur(2px)' }

/**
 * Inline trigger that reveals a small card on hover / focus.
 * The popup is a Motion element; Base UI is told to wait for its exit (preventUnmountOnClose) and
 * unmounts it when the close animation finishes, so reopening mid-close just turns it around.
 * Needs a LazyMotion provider above it (the app's MotionProvider).
 */
export function HoverCard({ trigger, children, className, ...props }: HoverCardProps) {
  const [open, setOpen] = useState(false)
  const actions = useRef<Actions>(null)
  return (
    <PreviewCard.Root
      open={open}
      actionsRef={actions}
      onOpenChange={(next, details) => {
        if (!next) details.preventUnmountOnClose()
        setOpen(next)
      }}
    >
      <PreviewCard.Trigger delay={250} closeDelay={100} className={className as string} {...props}>
        {trigger}
      </PreviewCard.Trigger>
      <PreviewCard.Portal>
        <PreviewCard.Positioner sideOffset={8}>
          <PreviewCard.Popup
            className="ui-hover-card"
            render={
              <m.div
                initial={hiddenState}
                animate={open ? shown : hiddenState}
                transition={open ? OPEN : CLOSE}
                onAnimationComplete={() => {
                  if (!open) actions.current?.unmount()
                }}
              />
            }
          >
            {children}
          </PreviewCard.Popup>
        </PreviewCard.Positioner>
      </PreviewCard.Portal>
    </PreviewCard.Root>
  )
}
