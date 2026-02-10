import { Clock, Database, Globe, ListOrdered, Zap } from 'lucide-react'
import type { NodeData } from '../../../api/flows/types'
import { BaseNode } from './base-node'

function TriggerIcon({ type }: { type: string }) {
  const cls = 'w-3 h-3'
  switch (type) {
    case 'event':
      return <Zap className={cls} />
    case 'api':
      return <Globe className={cls} />
    case 'cron':
      return <Clock className={cls} />
    case 'queue':
      return <ListOrdered className={cls} />
    case 'state':
      return <Database className={cls} />
    default:
      return null
  }
}

export function ApiFlowNode({ data }: { data: NodeData }) {
  const hasMultiple = data.triggers && data.triggers.length > 1

  return (
    <BaseNode
      data={data}
      variant="api"
      title={data.name}
      subtitle={data.description}
      disableSourceHandle={!data.emits?.length && !data.virtualEmits?.length}
      disableTargetHandle={!data.subscribes?.length && !data.virtualSubscribes?.length}
    >
      {hasMultiple && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">
            Triggers ({data.triggers.length})
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1.5 items-center text-[10px]">
            {data.triggers.map((trigger, i) => (
              <div key={`${trigger.type}-${i}`} className="contents">
                <span className="px-1.5 py-0.5 rounded bg-[#1D1D1D] text-[#9CA3AF] font-mono flex items-center gap-1">
                  <TriggerIcon type={trigger.type} />
                  {trigger.type}
                </span>
                <span className="text-[#9CA3AF] font-mono truncate">
                  {trigger.type === 'event' && trigger.topic}
                  {trigger.type === 'api' &&
                    trigger.method &&
                    trigger.path &&
                    `${trigger.method} ${trigger.path}`}
                  {trigger.type === 'cron' && trigger.cronExpression}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {!hasMultiple && data.webhookUrl && (
        <div className="text-[10px] text-[#9CA3AF] font-mono">{data.webhookUrl}</div>
      )}
    </BaseNode>
  )
}
