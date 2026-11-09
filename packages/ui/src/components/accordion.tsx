import { Accordion as Base } from '@base-ui/react/accordion'
import { m, useReducedMotion, type Transition } from 'motion/react'
import type { ComponentProps } from 'react'

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ')

/** How long a panel takes to open or close, in seconds (anything timed to it, like the halo, reads this). */
export const ACCORDION_DURATION = 0.28

/** Opening / closing a panel: quick and plain (280ms ease-out-quint). Bounce is for gestures, not content. */
const FOLD: Transition = { duration: ACCORDION_DURATION, ease: [0.23, 1, 0.32, 1] }

export function AccordionRoot({ className, ...props }: ComponentProps<typeof Base.Root>) {
  return <Base.Root className={cx('flex flex-col', className as string)} {...props} />
}

export function AccordionItem({ className, ...props }: ComponentProps<typeof Base.Item>) {
  return <Base.Item className={cx('group/item', className as string)} {...props} />
}

export function AccordionTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof Base.Trigger>) {
  return (
    <Base.Header className="m-0">
      <Base.Trigger className={cx('ui-accordion-trigger', className as string)} {...props}>
        {children}
      </Base.Trigger>
    </Base.Header>
  )
}

/**
 * Panel whose height is animated by Motion (interruptible, starts from wherever it is).
 * It stays mounted: Base UI would hide it as soon as its own (CSS) transition ends, which a
 * main-thread Motion animation isn't, so a closed panel is `inert` and 0px tall instead of `hidden`.
 * Needs a LazyMotion provider above it (the app's MotionProvider).
 */
export function AccordionPanel({
  className,
  transition = FOLD,
  ...props
}: Omit<ComponentProps<typeof Base.Panel>, 'render' | 'keepMounted'> & { transition?: Transition }) {
  const reduced = useReducedMotion()
  return (
    <Base.Panel
      keepMounted
      className={cx('ui-accordion-panel', className as string)}
      {...props}
      render={({ hidden: _hidden, ...rest }, state) => (
        <m.div
          {...(rest as ComponentProps<typeof m.div>)}
          inert={!state.open || undefined}
          initial={false}
          animate={{ height: state.open ? 'auto' : 0 }}
          transition={reduced ? { duration: 0 } : transition}
        />
      )}
    />
  )
}
