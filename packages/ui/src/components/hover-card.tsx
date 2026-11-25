import { PreviewCard } from '@base-ui/react/preview-card'
import { m, type Transition } from 'motion/react'
import { useRef, useState, type ComponentProps, type ReactNode } from 'react'

type Actions = NonNullable<ComponentProps<typeof PreviewCard.Root>['actionsRef']>['current']

/** One card shared by many triggers. Create it once, outside render, and pass it to both parts. */
export const createHoverCardHandle = PreviewCard.createHandle
export type HoverCardHandle<P> = ReturnType<typeof PreviewCard.createHandle<P>>

/** Opens with a small spring from its trigger; closes quicker than it opens. */
const OPEN: Transition = { type: 'spring', visualDuration: 0.2, bounce: 0.2 }
const CLOSE: Transition = { duration: 0.12, ease: [0.23, 1, 0.32, 1] }
const shown = { opacity: 1, scale: 1, filter: 'blur(0px)' }
const hiddenState = { opacity: 0, scale: 0.96, filter: 'blur(2px)' }

type TriggerProps<P> = Omit<ComponentProps<typeof PreviewCard.Trigger>, 'children' | 'handle' | 'payload'> & {
  handle: HoverCardHandle<P>
  payload: P
  children: ReactNode
}

/** Inline link that opens the shared card for its `payload`. */
export function HoverCardTrigger<P>({ handle, payload, className, ...props }: TriggerProps<P>) {
  return (
    <PreviewCard.Trigger
      handle={handle}
      payload={payload}
      delay={250}
      closeDelay={100}
      className={className as string}
      {...props}
    />
  )
}

/**
 * The card itself, rendered once per handle. While it is open, moving to another trigger keeps it
 * open: it glides to the new trigger and its content crossfades (see `.ui-hover-card-*` styles),
 * instead of one card closing and the next one starting over.
 * The popup is a Motion element; Base UI waits for its exit (preventUnmountOnClose) and unmounts
 * it when the close animation finishes, so reopening mid-close just turns it around.
 * Needs a LazyMotion provider above it (the app's MotionProvider).
 */
export function HoverCard<P>({
  handle,
  className,
  children,
}: {
  handle: HoverCardHandle<P>
  /** Classes for the card surface (border, background, radius…), which stays put while content swaps */
  className?: string
  children: (payload: P) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  // Set once the open animation has played. Until then the positioner must jump straight to its
  // trigger; after it, position changes (switching triggers, the trigger reflowing) glide.
  const [settled, setSettled] = useState(false)
  const actions = useRef<Actions>(null)
  return (
    <PreviewCard.Root
      handle={handle}
      actionsRef={actions}
      onOpenChange={(next, details) => {
        if (!next) details.preventUnmountOnClose()
        setOpen(next)
      }}
    >
      {({ payload }) => (
        <PreviewCard.Portal>
          <PreviewCard.Positioner
            sideOffset={8}
            className="ui-hover-card-positioner"
            data-settled={settled || undefined}
          >
            <PreviewCard.Popup
              className={className ? `ui-hover-card ${className}` : 'ui-hover-card'}
              render={
                <m.div
                  initial={hiddenState}
                  animate={open ? shown : hiddenState}
                  transition={open ? OPEN : CLOSE}
                  onAnimationComplete={() => {
                    setSettled(open)
                    if (!open) actions.current?.unmount()
                  }}
                />
              }
            >
              <PreviewCard.Viewport className="ui-hover-card-viewport">
                {payload !== undefined && children(payload)}
              </PreviewCard.Viewport>
            </PreviewCard.Popup>
          </PreviewCard.Positioner>
        </PreviewCard.Portal>
      )}
    </PreviewCard.Root>
  )
}
