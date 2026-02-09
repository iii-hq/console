import type { VisualizationSpan } from '@/lib/traceTransform'
import { toMs } from '@/lib/traceTransform'

interface SpanLogsTabProps {
  span: VisualizationSpan
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  })
}

export function SpanLogsTab({ span }: SpanLogsTabProps) {
  const events = span.events || []

  if (events.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-400">No events logged for this span</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-3">
      {events.map((event, index) => (
        <div key={`${event.timestamp}-${index}`} className="bg-[#141414] rounded-lg p-4 space-y-2">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="text-sm font-semibold text-white mb-1">{event.name}</div>
              <div className="text-xs font-mono text-gray-400">
                {formatTimestamp(toMs(event.timestamp))}
              </div>
            </div>
          </div>

          {event.attributes && Object.keys(event.attributes).length > 0 && (
            <div className="mt-3 pt-3 border-t border-[#1D1D1D]">
              <div className="text-xs text-gray-500 mb-2">Attributes:</div>
              <div className="space-y-1">
                {Object.entries(event.attributes).map(([key, value]) => (
                  <div key={key} className="flex items-start gap-2 text-xs">
                    <span className="text-gray-400 font-mono">{key}:</span>
                    <span className="text-gray-300 font-mono break-all">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      <div className="text-xs text-gray-500 text-center pt-4">
        {events.length} event{events.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
