import { Accordion as Base } from '@base-ui/react/accordion'
import type { ComponentProps } from 'react'

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ')

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

export function AccordionPanel({ className, ...props }: ComponentProps<typeof Base.Panel>) {
  return <Base.Panel className={cx('ui-accordion-panel', className as string)} {...props} />
}
