import { Select as Base } from '@base-ui/react/select'

export type SelectItem<V extends string> = { value: V; label: string }

type SelectProps<V extends string> = {
  value: V
  onValueChange: (value: V) => void
  items: SelectItem<V>[]
  'aria-label': string
  className?: string
}

/** Compact select: text trigger with a chevron, popup that scales from the trigger. */
export function Select<V extends string>({ value, onValueChange, items, className, ...rest }: SelectProps<V>) {
  return (
    <Base.Root value={value} onValueChange={(v) => onValueChange(v as V)} items={items}>
      <Base.Trigger className={`ui-select-trigger ${className ?? ''}`} aria-label={rest['aria-label']}>
        <Base.Value />
        <Base.Icon className="ui-select-icon">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
            <path d="M3 4l2-2 2 2M3 6l2 2 2-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Base.Icon>
      </Base.Trigger>
      <Base.Portal>
        <Base.Positioner sideOffset={6} alignItemWithTrigger={false} align="end" className="ui-select-positioner">
          <Base.Popup className="ui-select-popup">
            <Base.List>
              {items.map((item) => (
                <Base.Item key={item.value} value={item.value} className="ui-select-item">
                  <Base.ItemText>{item.label}</Base.ItemText>
                  <Base.ItemIndicator className="ui-select-check">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                      <path d="M2.5 6.5l2.25 2.25L9.5 3.75" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Base.ItemIndicator>
                </Base.Item>
              ))}
            </Base.List>
          </Base.Popup>
        </Base.Positioner>
      </Base.Portal>
    </Base.Root>
  )
}
