import type { VisualizationSpan } from '@/lib/traceTransform'

interface SpanInfoTabProps {
  span: VisualizationSpan
}

function formatDuration(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`
  if (ms < 1000) return `${ms.toFixed(2)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-[#1D1D1D] last:border-0">
      <span className="text-sm text-gray-400 min-w-[120px]">{label}</span>
      <span className={`text-sm text-white text-right break-all ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  )
}

export function SpanInfoTab({ span }: SpanInfoTabProps) {
  const service = span.service_name || span.name.split('.')[0]
  const statusColor = {
    ok: 'bg-green-500',
    error: 'bg-red-500',
    unset: 'bg-gray-500',
  }[span.status]

  const statusLabel = {
    ok: 'OK',
    error: 'ERROR',
    unset: 'UNSET',
  }[span.status]

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#141414] rounded-lg p-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Duration
          </div>
          <div className="font-mono text-2xl font-bold text-[#F3F724]">
            {formatDuration(span.duration_ms)}
          </div>
        </div>
        <div className="bg-[#141414] rounded-lg p-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Status
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${statusColor}`} />
            <span className="font-mono text-lg font-bold text-white">{statusLabel}</span>
          </div>
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Service Information
        </div>
        <div className="bg-[#141414] rounded-lg p-4 space-y-0">
          <InfoRow label="Service" value={service} />
          <InfoRow label="Operation" value={span.name} />
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Span Identifiers
        </div>
        <div className="bg-[#141414] rounded-lg p-4 space-y-0">
          <InfoRow label="Trace ID" value={span.trace_id} mono />
          <InfoRow label="Span ID" value={span.span_id} mono />
          {span.parent_span_id && (
            <InfoRow label="Parent Span ID" value={span.parent_span_id} mono />
          )}
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Hierarchy
        </div>
        <div className="bg-[#141414] rounded-lg p-4 space-y-0">
          <InfoRow label="Depth" value={span.depth.toString()} />
          {span.parent_span_id ? (
            <InfoRow label="Type" value="Child Span" />
          ) : (
            <InfoRow label="Type" value="Root Span" />
          )}
        </div>
      </div>
    </div>
  )
}
