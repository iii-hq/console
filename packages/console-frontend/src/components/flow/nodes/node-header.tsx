import { clsx } from 'clsx'
import { CalendarClock, CircleOff, Database, Link2, ListOrdered, Waypoints } from 'lucide-react'

type Variant = 'event' | 'api' | 'noop' | 'cron' | 'queue' | 'state'

const iconStyles: Record<Variant, string> = {
  event: 'bg-blue-500/20 text-blue-400',
  api: 'bg-[#F3F724]/20 text-[#F3F724]',
  noop: 'bg-purple-500/20 text-purple-400',
  cron: 'bg-orange-500/20 text-orange-400',
  queue: 'bg-teal-500/20 text-teal-400',
  state: 'bg-emerald-500/20 text-emerald-400',
}

function NodeIcon({ variant }: { variant: Variant }) {
  const cls = 'w-4 h-4'
  switch (variant) {
    case 'cron':
      return <CalendarClock className={cls} />
    case 'api':
      return <Link2 className={cls} />
    case 'noop':
      return <CircleOff className={cls} />
    case 'event':
      return <Waypoints className={cls} />
    case 'queue':
      return <ListOrdered className={cls} />
    case 'state':
      return <Database className={cls} />
  }
}

type Props = {
  text: string
  variant: Variant
  triggers?: Array<{ type: string }>
  children?: React.ReactNode
}

const triggerOrder: Record<string, number> = {
  api: 1,
  event: 2,
  queue: 3,
  state: 4,
  cron: 5,
  noop: 6,
}

export function NodeHeader({ text, variant, children, triggers }: Props) {
  const showMultiple = triggers && triggers.length > 1
  const sorted = showMultiple
    ? [...triggers].sort((a, b) => (triggerOrder[a.type] ?? 5) - (triggerOrder[b.type] ?? 5))
    : triggers

  return (
    <div className="flex items-center gap-2 p-2 border-b border-[#1D1D1D]">
      {showMultiple ? (
        <div className="flex gap-1">
          {sorted?.map((trigger) => (
            <div
              key={trigger.type}
              className={clsx(
                'rounded-md p-1.5',
                iconStyles[trigger.type as Variant] || iconStyles.event,
              )}
            >
              <NodeIcon variant={trigger.type as Variant} />
            </div>
          ))}
        </div>
      ) : (
        <div className={clsx('rounded-md p-1.5', iconStyles[variant])}>
          <NodeIcon variant={variant} />
        </div>
      )}
      <div className="flex flex-1 justify-between items-start gap-3">
        <div className="text-xs font-semibold text-[#F4F4F4] leading-tight tracking-tight">
          {text}
        </div>
        {children}
      </div>
    </div>
  )
}
