import { Package } from 'lucide-react'
import type { VisualizationSpan } from '@/lib/traceTransform'

interface SpanBaggageTabProps {
  span: VisualizationSpan
}

export function SpanBaggageTab({ span }: SpanBaggageTabProps) {
  const baggageEntries = Object.entries(span.attributes || {})
    .filter(([key]) => key.startsWith('baggage.'))
    .map(([key, value]) => [key.replace('baggage.', ''), value] as [string, unknown])

  if (baggageEntries.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#141414] mb-4">
          <Package className="w-8 h-8 text-gray-500" />
        </div>
        <p className="text-gray-400 mb-2">No baggage context found</p>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          W3C Baggage is used to propagate user-defined properties across service boundaries. No
          baggage was attached to this span.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <div className="bg-[#141414] rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Package className="w-4 h-4 text-[#F3F724]" />
          <span className="text-sm font-semibold text-white">W3C Baggage Context</span>
        </div>
        <p className="text-xs text-gray-400">
          Baggage allows propagating key-value pairs across distributed traces
        </p>
      </div>

      <div className="space-y-2">
        {baggageEntries.map(([key, value]) => (
          <div key={key} className="bg-[#141414] rounded-lg p-4">
            <div className="text-sm font-mono text-[#F3F724] mb-1">{key}</div>
            <div className="text-sm text-gray-300 break-all font-mono">
              {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
            </div>
          </div>
        ))}
      </div>

      <div className="text-xs text-gray-500 text-center pt-4">
        {baggageEntries.length} baggage item{baggageEntries.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
