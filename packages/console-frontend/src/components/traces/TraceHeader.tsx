import { AlertCircle, Clock, Copy, Layers, X } from 'lucide-react'
import { useState } from 'react'
import { getServiceColor } from '@/lib/traceColors'
import type { WaterfallData } from '@/lib/traceTransform'

interface TraceHeaderProps {
  data: WaterfallData
  traceId: string
  onClose: () => void
}

function formatDuration(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`
  if (ms < 1000) return `${ms.toFixed(2)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

export function TraceHeader({ data, traceId, onClose }: TraceHeaderProps) {
  const [copied, setCopied] = useState(false)
  const rootSpan = data.spans.find((s) => s.depth === 0)
  const errorCount = data.spans.filter((s) => s.status === 'error').length
  const hasErrors = errorCount > 0

  const services = new Set(data.spans.map((s) => s.service_name).filter(Boolean))
  const serviceCount = Math.max(services.size, 1)
  const serviceList = Array.from(services).filter(Boolean)
  const rootService = rootSpan?.service_name || rootSpan?.name.split('.')[0] || 'trace'

  const copyTraceId = () => {
    navigator.clipboard.writeText(traceId)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="bg-[#0A0A0A] border-b border-[#1D1D1D] flex-shrink-0">
      {/* Row 1: service badge + operation name + close */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-1.5">
        <div className="px-1.5 py-0.5 rounded text-[10px] font-medium tracking-wide flex-shrink-0 bg-[#22C55E]/8 text-[#22C55E] border border-[#22C55E]/15">
          {rootService}
        </div>
        <h2
          className="text-sm font-semibold text-[#F4F4F4] leading-tight truncate flex-1 min-w-0"
          title={rootSpan?.name || 'Trace Details'}
        >
          {rootSpan?.name || 'Trace Details'}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="p-1 hover:bg-[#1D1D1D] rounded-md transition-colors group flex-shrink-0"
          aria-label="Close trace detail"
          title="Close (Esc)"
        >
          <X className="w-3.5 h-3.5 text-gray-500 group-hover:text-gray-300" />
        </button>
      </div>

      {/* Row 2: trace ID + stat pills */}
      <div className="flex items-center gap-2 px-4 pb-2.5 flex-wrap">
        <button
          type="button"
          onClick={copyTraceId}
          className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 transition-colors font-mono group"
        >
          <span>{traceId.substring(0, 12)}</span>
          {copied ? (
            <span className="text-[#22C55E] text-[9px]">copied</span>
          ) : (
            <Copy className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </button>

        <div className="w-px h-3 bg-[#1D1D1D]" />

        <div className="flex items-center gap-1 px-2 py-0.5 bg-[#141414] border border-[#1D1D1D] rounded">
          <Clock className="w-2.5 h-2.5 text-[#F3F724]" />
          <span className="text-[11px] font-mono font-semibold text-[#F3F724]">
            {formatDuration(data.total_duration_ms)}
          </span>
        </div>

        <div className="flex items-center gap-1 px-2 py-0.5 bg-[#141414] border border-[#1D1D1D] rounded">
          <Layers className="w-2.5 h-2.5 text-gray-400" />
          <span className="text-[10px] font-mono text-gray-400">{data.span_count} spans</span>
        </div>

        <div className="flex items-center gap-1 px-2 py-0.5 bg-[#141414] border border-[#1D1D1D] rounded">
          <span className="text-[10px] font-mono text-gray-400">{serviceCount} svc</span>
        </div>

        {hasErrors && (
          <div className="flex items-center gap-1 px-2 py-0.5 bg-[#EF4444]/8 border border-[#EF4444]/15 rounded">
            <AlertCircle className="w-2.5 h-2.5 text-[#EF4444]" />
            <span className="text-[10px] font-mono font-semibold text-[#EF4444]">
              {errorCount} err
            </span>
          </div>
        )}
      </div>

      {/* Service distribution bar */}
      {serviceList.length > 1 && (
        <div className="px-4 pb-2.5">
          <div className="flex h-1.5 rounded-full overflow-hidden bg-[#141414] border border-[#1D1D1D]">
            {serviceList.map((svc) => {
              const svcSpans = data.spans.filter(
                (s) => (s.service_name || s.name.split('.')[0]) === svc,
              )
              const svcDuration = svcSpans.reduce((sum, s) => sum + s.duration_ms, 0)
              const pct = (svcDuration / data.total_duration_ms) * 100

              return (
                <div
                  key={svc}
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${Math.max(2, pct)}%`,
                    backgroundColor: getServiceColor(svc!),
                    opacity: 0.8,
                  }}
                  title={`${svc}: ${pct.toFixed(1)}%`}
                />
              )
            })}
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            {serviceList.map((svc) => (
              <div key={svc} className="flex items-center gap-1 text-[9px] text-gray-500">
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: getServiceColor(svc!) }}
                />
                <span className="font-mono truncate">{svc}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
