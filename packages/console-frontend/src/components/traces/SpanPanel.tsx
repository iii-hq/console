import { X } from 'lucide-react'
import { useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { VisualizationSpan } from '@/lib/traceTransform'
import { SpanBaggageTab } from './SpanBaggageTab'
import { SpanErrorsTab } from './SpanErrorsTab'
import { SpanInfoTab } from './SpanInfoTab'
import { SpanLogsTab } from './SpanLogsTab'
import { SpanTagsTab } from './SpanTagsTab'

interface SpanPanelProps {
  span: VisualizationSpan | null
  onClose: () => void
}

export function SpanPanel({ span, onClose }: SpanPanelProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  if (!span) return null

  const hasError = span.status === 'error'
  const attrCount = Object.keys(span.attributes || {}).length
  const eventCount = span.events?.length || 0

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[600px] bg-[#0A0A0A] border-l border-[#1D1D1D] shadow-2xl z-50 overflow-hidden flex flex-col animate-slide-in">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#1D1D1D]">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-white truncate">{span.name}</h2>
          <p className="text-sm text-gray-400 truncate">Span ID: {span.span_id.slice(0, 16)}...</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="ml-4 p-2 hover:bg-[#141414] rounded transition-colors"
          aria-label="Close panel"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="info" className="h-full flex flex-col">
          <TabsList className="px-6 pt-4">
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="tags">
              Tags
              {attrCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-[#1D1D1D] rounded">{attrCount}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="logs">
              Logs
              {eventCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-[#1D1D1D] rounded">
                  {eventCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="errors">
              Errors
              {hasError && <span className="ml-2 w-2 h-2 bg-red-500 rounded-full" />}
            </TabsTrigger>
            <TabsTrigger value="baggage">Baggage</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="info" className="mt-0">
              <SpanInfoTab span={span} />
            </TabsContent>
            <TabsContent value="tags" className="mt-0">
              <SpanTagsTab span={span} />
            </TabsContent>
            <TabsContent value="logs" className="mt-0">
              <SpanLogsTab span={span} />
            </TabsContent>
            <TabsContent value="errors" className="mt-0">
              <SpanErrorsTab span={span} />
            </TabsContent>
            <TabsContent value="baggage" className="mt-0">
              <SpanBaggageTab span={span} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}
