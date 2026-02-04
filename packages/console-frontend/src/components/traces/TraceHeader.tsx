import { AlertCircle } from 'lucide-react'
import type { WaterfallData } from '@/lib/traceTransform'

interface TraceHeaderProps {
  data: WaterfallData
  traceId: string
}

function formatDuration(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`
  if (ms < 1000) return `${ms.toFixed(2)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

export function TraceHeader({ data, traceId }: TraceHeaderProps) {
  const rootSpan = data.spans.find((s) => s.depth === 0)
  const errorCount = data.spans.filter((s) => s.status === 'error').length
  const hasErrors = errorCount > 0

  const services = new Set(data.spans.map((s) => s.service_name).filter(Boolean))
  const serviceCount = Math.max(services.size, 1)

  return (
    <div className="bg-[#141414] border-b border-[#1D1D1D] px-5 py-4 flex-shrink-0">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-white truncate mb-1">
            {rootSpan?.name || 'Trace Details'}
          </h2>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="font-mono" title={traceId}>
              ID: {traceId.substring(0, 16)}...
            </span>
            {hasErrors && (
              <span className="flex items-center gap-1 text-[#EF4444]">
                <AlertCircle className="w-3 h-3" />
                {errorCount} {errorCount === 1 ? 'error' : 'errors'}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-8 ml-6">
          <div className="text-center">
            <div className="font-mono text-2xl font-bold text-[#F3F724]">
              {formatDuration(data.total_duration_ms)}
            </div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">
              Duration
            </div>
          </div>
          <div className="text-center">
            <div className="font-mono text-2xl font-bold text-purple-400">{data.span_count}</div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Spans</div>
          </div>
          <div className="text-center">
            <div className="font-mono text-2xl font-bold text-cyan-400">{serviceCount}</div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">
              Services
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
