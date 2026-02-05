import { AlertCircle } from 'lucide-react'
import type { VisualizationSpan } from '@/lib/traceTransform'

interface SpanErrorsTabProps {
  span: VisualizationSpan
}

export function SpanErrorsTab({ span }: SpanErrorsTabProps) {
  const hasError = span.status === 'error'

  const errorMessage = span.attributes?.['error.message'] as string | undefined
  const errorType = span.attributes?.['error.type'] as string | undefined
  const errorStack = span.attributes?.['error.stack'] as string | undefined
  const exceptionMessage = span.attributes?.['exception.message'] as string | undefined
  const exceptionType = span.attributes?.['exception.type'] as string | undefined
  const exceptionStacktrace = span.attributes?.['exception.stacktrace'] as string | undefined

  const displayMessage = errorMessage || exceptionMessage
  const displayType = errorType || exceptionType
  const displayStack = errorStack || exceptionStacktrace

  if (!hasError) {
    return (
      <div className="p-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4">
          <span className="text-3xl">✓</span>
        </div>
        <p className="text-gray-400">No errors detected in this span</p>
        <p className="text-sm text-gray-500 mt-2">Status: OK</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-red-400 mb-1">Error Detected</div>
            <div className="text-sm text-gray-300">This span completed with an error status</div>
          </div>
        </div>
      </div>

      {displayType && (
        <div className="bg-[#141414] rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-2">Error Type</div>
          <div className="text-sm font-mono text-white">{displayType}</div>
        </div>
      )}

      {displayMessage && (
        <div className="bg-[#141414] rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-2">Error Message</div>
          <div className="text-sm text-white whitespace-pre-wrap break-words">{displayMessage}</div>
        </div>
      )}

      {displayStack && (
        <div className="bg-[#141414] rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-2">Stack Trace</div>
          <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap break-words overflow-x-auto">
            {displayStack}
          </pre>
        </div>
      )}

      {!displayMessage && !displayType && !displayStack && (
        <div className="bg-[#141414] rounded-lg p-4 text-center">
          <p className="text-sm text-gray-400">No additional error details available</p>
          <p className="text-xs text-gray-500 mt-2">
            The span status is marked as error, but no error attributes were recorded
          </p>
        </div>
      )}
    </div>
  )
}
