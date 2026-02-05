import { createFileRoute } from '@tanstack/react-router'
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  GitBranch,
  Hash,
  RefreshCw,
  Search,
  Timer,
  Wifi,
  WifiOff,
  X,
  XCircle,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchTraces } from '@/api'
import { FlameGraph } from '@/components/traces/FlameGraph'
import { ServiceBreakdown } from '@/components/traces/ServiceBreakdown'
import { SpanPanel } from '@/components/traces/SpanPanel'
import { TraceFilters } from '@/components/traces/TraceFilters'
import { TraceHeader } from '@/components/traces/TraceHeader'
import { TraceMap } from '@/components/traces/TraceMap'
import { ViewSwitcher, type ViewType } from '@/components/traces/ViewSwitcher'
import { WaterfallChart } from '@/components/traces/WaterfallChart'
import { Badge, Button, Input } from '@/components/ui/card'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Pagination } from '@/components/ui/pagination'
import { useTraceFilters } from '@/hooks/useTraceFilters'
import {
  toMs,
  toWaterfallData,
  type VisualizationSpan,
  type WaterfallData,
} from '@/lib/traceTransform'

export const Route = createFileRoute('/traces')({
  component: TracesPage,
})

interface TraceGroup {
  traceId: string
  trace_id: string
  rootOperation: string
  root_operation: string
  status: 'ok' | 'error' | 'pending'
  startTime: number
  endTime?: number
  duration?: number
  spanCount: number
  services: string[]
}

function formatTime(timestamp: number): string {
  // Convert from milliseconds to JavaScript Date
  // If timestamp looks like nanoseconds (very large number > year 2100 in ms), convert it
  const timestampMs = timestamp > 4102444800000 ? timestamp / 1_000_000 : timestamp
  const date = new Date(timestampMs)

  // Check if date is valid
  if (Number.isNaN(date.getTime())) {
    return 'Invalid Date'
  }

  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatDuration(ms: number | undefined): string {
  if (!ms) return '-'
  if (ms < 1) return '<1ms'
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function TracesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showSystem, setShowSystem] = useState(false)
  const [traceGroups, setTraceGroups] = useState<TraceGroup[]>([])
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null)
  const [isConnected] = useState(true)
  const [hasOtelConfigured, setHasOtelConfigured] = useState(false)

  const [activeView, setActiveView] = useState<ViewType>('waterfall')
  const [selectedSpan, setSelectedSpan] = useState<VisualizationSpan | null>(null)
  const [waterfallData, setWaterfallData] = useState<WaterfallData | null>(null)
  const [isLoadingSpans, setIsLoadingSpans] = useState(false)
  const [spansError, setSpansError] = useState<string | null>(null)

  const {
    filters: filterState,
    updateFilter,
    resetFilters,
    getActiveFilterCount,
    validationWarnings,
    clearValidationWarnings,
  } = useTraceFilters()

  const activeFilterCount = getActiveFilterCount()

  const loadTraces = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await fetchTraces({ limit: 10000 })

      if (data.spans && data.spans.length > 0) {
        const traceMap = new Map<string, typeof data.spans>()

        for (const span of data.spans) {
          const existing = traceMap.get(span.trace_id) || []
          existing.push(span)
          traceMap.set(span.trace_id, existing)
        }

        const traces: TraceGroup[] = []

        for (const [traceId, traceSpans] of traceMap) {
          const spanIds = new Set(traceSpans.map((s) => s.span_id))
          const rootSpan = traceSpans.find(
            (s) => !s.parent_span_id || !spanIds.has(s.parent_span_id),
          )

          if (!rootSpan) continue

          const minStart = Math.min(...traceSpans.map((s) => toMs(s.start_time_unix_nano)))
          const maxEnd = Math.max(...traceSpans.map((s) => toMs(s.end_time_unix_nano)))
          const duration = maxEnd - minStart

          const hasError = traceSpans.some((s) => s.status.toLowerCase() === 'error')
          const services = [...new Set(traceSpans.map((s) => s.service_name || 'unknown'))]

          traces.push({
            traceId,
            trace_id: traceId,
            rootOperation: rootSpan.name,
            root_operation: rootSpan.name,
            status: hasError ? 'error' : 'ok',
            startTime: minStart,
            endTime: maxEnd,
            duration,
            spanCount: traceSpans.length,
            services,
          })
        }

        traces.sort((a, b) => b.startTime - a.startTime)

        setTraceGroups(traces)
        setHasOtelConfigured(true)
      } else {
        setHasOtelConfigured(false)
      }
    } catch (error) {
      console.error('Failed to load traces:', error)
      setHasOtelConfigured(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadTraceSpans = useCallback(async (traceId: string) => {
    setIsLoadingSpans(true)
    setSpansError(null)
    setWaterfallData(null)

    try {
      const data = await fetchTraces({ trace_id: traceId })

      if (data.spans && data.spans.length > 0) {
        const wfData = toWaterfallData(data.spans, traceId)

        if (wfData) {
          setWaterfallData(wfData)
          setSpansError(null)
        } else {
          console.warn('[Traces] toWaterfallData returned null')
          setSpansError('Failed to process span data')
        }
      } else {
        console.warn('[Traces] No spans found for trace:', traceId)
        setSpansError('No span data available for this trace')
      }
    } catch (error) {
      console.error('[Traces] Failed to load trace spans:', error)
      setSpansError(error instanceof Error ? error.message : 'Failed to load trace details')
    } finally {
      setIsLoadingSpans(false)
    }
  }, [])

  useEffect(() => {
    loadTraces()
  }, [loadTraces])

  useEffect(() => {
    if (selectedTraceId) {
      loadTraceSpans(selectedTraceId)
    } else {
      setWaterfallData(null)
      setSelectedSpan(null)
      setSpansError(null)
      setIsLoadingSpans(false)
    }
  }, [selectedTraceId, loadTraceSpans])

  const selectedTrace = traceGroups.find((g) => g.traceId === selectedTraceId)

  const totalPages = Math.max(1, Math.ceil(traceGroups.length / filterState.pageSize))

  const stats = useMemo(
    () => ({
      totalTraces: traceGroups.length,
      totalSpans: traceGroups.reduce((sum, g) => sum + g.spanCount, 0),
      errorCount: traceGroups.filter((g) => g.status === 'error').length,
      avgDuration:
        traceGroups.length > 0
          ? traceGroups.reduce((sum, g) => sum + (g.duration || 0), 0) / traceGroups.length
          : 0,
    }),
    [traceGroups],
  )

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 md:px-5 py-2 md:py-3 bg-dark-gray/30 border-b border-border">
        <div className="flex items-center gap-2 md:gap-4 flex-wrap">
          <h1 className="text-sm md:text-base font-semibold flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-cyan-400" />
            Traces
          </h1>
          <Badge
            variant={isConnected ? 'success' : 'error'}
            className="gap-1 text-[10px] md:text-xs"
          >
            {isConnected ? (
              <Wifi className="w-2.5 h-2.5 md:w-3 md:h-3" />
            ) : (
              <WifiOff className="w-2.5 h-2.5 md:w-3 md:h-3" />
            )}
            <span className="hidden sm:inline">{isConnected ? 'Live' : 'Offline'}</span>
          </Badge>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2">
          <Button
            variant={showSystem ? 'accent' : 'ghost'}
            size="sm"
            onClick={() => setShowSystem(!showSystem)}
            className="h-6 md:h-7 text-[10px] md:text-xs px-2"
          >
            {showSystem ? (
              <Eye className="w-3 h-3 md:mr-1.5" />
            ) : (
              <EyeOff className="w-3 h-3 md:mr-1.5" />
            )}
            <span className={`hidden md:inline ${showSystem ? '' : 'line-through opacity-60'}`}>
              System
            </span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadTraces}
            disabled={isLoading}
            className="h-7 text-xs text-muted hover:text-foreground"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 p-2 border-b border-border bg-dark-gray/20">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9 h-9 font-medium"
            placeholder="Search by Trace ID or Operation"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 px-2 text-xs text-muted">
          <div className="flex items-center gap-1.5">
            <Hash className="w-3 h-3" />
            <span className="font-medium text-foreground tabular-nums">{stats.totalTraces}</span>
            traces
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-3 h-3" />
            <span className="font-medium text-foreground tabular-nums">{stats.totalSpans}</span>
            spans
          </div>
          {stats.errorCount > 0 && (
            <div className="flex items-center gap-1.5 text-error">
              <XCircle className="w-3 h-3" />
              <span className="font-medium tabular-nums">{stats.errorCount}</span>
              errors
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Timer className="w-3 h-3" />
            <span className="font-medium text-foreground tabular-nums">
              {formatDuration(stats.avgDuration)}
            </span>
            avg
          </div>
        </div>
      </div>

      {hasOtelConfigured && (
        <div className="px-4 py-2 border-b border-border">
          <ErrorBoundary>
            <TraceFilters
              filters={filterState}
              onFilterChange={updateFilter}
              onClear={resetFilters}
              activeCount={activeFilterCount}
              validationWarnings={validationWarnings}
              onClearWarnings={clearValidationWarnings}
              isLoading={isLoading}
            />
          </ErrorBoundary>
        </div>
      )}

      {!hasOtelConfigured && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mb-4 mx-auto rounded-2xl bg-dark-gray border border-border flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-yellow" />
            </div>
            <h3 className="text-sm font-medium mb-2">OpenTelemetry Not Configured</h3>
            <p className="text-xs text-muted mb-4">
              Configure{' '}
              <code className="bg-dark-gray px-1 rounded font-mono">opentelemetry-rust</code> in the
              iii engine to enable distributed tracing.
            </p>
            <a
              href="https://github.com/open-telemetry/opentelemetry-rust"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-yellow hover:underline"
            >
              Learn more about OpenTelemetry <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}

      {hasOtelConfigured && (
        <div className="flex-1 flex overflow-hidden">
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              {isLoading && traceGroups.length === 0 ? (
                <div className="flex items-center justify-center h-32">
                  <RefreshCw className="w-5 h-5 text-muted animate-spin" />
                </div>
              ) : traceGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 px-4">
                  <div className="w-12 h-12 mb-3 rounded-xl bg-dark-gray border border-border flex items-center justify-center">
                    <GitBranch className="w-6 h-6 text-muted" />
                  </div>
                  <div className="text-sm font-medium mb-1">No traces found</div>
                  <div className="text-xs text-muted text-center">
                    Traces will appear here when OpenTelemetry is configured
                  </div>
                </div>
              ) : (
                traceGroups.map((group) => {
                  const isSelected = selectedTraceId === group.traceId

                  return (
                    <button
                      key={group.traceId}
                      type="button"
                      onClick={() => setSelectedTraceId(isSelected ? null : group.traceId)}
                      className={`w-full p-3 border-b border-border text-left transition-colors
                        ${isSelected ? 'bg-primary/10 border-l-2 border-l-primary' : 'hover:bg-dark-gray/50'}
                      `}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {group.status === 'ok' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                        ) : group.status === 'error' ? (
                          <XCircle className="w-3.5 h-3.5 text-error" />
                        ) : (
                          <Activity className="w-3.5 h-3.5 text-yellow animate-pulse" />
                        )}
                        <span className="font-medium text-sm truncate flex-1">
                          {group.rootOperation}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[10px] text-muted">
                        <code className="font-mono">{group.traceId.slice(0, 8)}</code>
                        <span className="flex items-center gap-1">
                          <Zap className="w-2.5 h-2.5" />
                          {group.spanCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <Timer className="w-2.5 h-2.5" />
                          {formatDuration(group.duration)}
                        </span>
                        <span className="ml-auto">{formatTime(group.startTime)}</span>
                      </div>
                    </button>
                  )
                })
              )}
            </div>

            {traceGroups.length > 0 && (
              <div className="flex-shrink-0 bg-background/95 backdrop-blur border-t border-border px-3 py-2">
                <Pagination
                  currentPage={filterState.page}
                  totalPages={totalPages}
                  totalItems={traceGroups.length}
                  pageSize={filterState.pageSize}
                  onPageChange={(page) => updateFilter('page', page)}
                  onPageSizeChange={(pageSize) => updateFilter('pageSize', pageSize)}
                  pageSizeOptions={[25, 50, 100]}
                />
              </div>
            )}
          </div>

          {selectedTrace && (
            <div className="w-[500px] border-l border-border bg-dark-gray/20 flex flex-col h-full overflow-hidden">
              {isLoadingSpans && (
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                  <RefreshCw className="w-8 h-8 text-yellow animate-spin mb-4" />
                  <div className="text-sm font-medium mb-2">Loading trace details...</div>
                  <div className="text-xs text-muted">
                    Trace ID: {selectedTrace.traceId.slice(0, 8)}
                  </div>
                </div>
              )}

              {!isLoadingSpans && spansError && (
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                  <div className="w-12 h-12 mb-4 rounded-xl bg-dark-gray border border-border flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-error" />
                  </div>
                  <div className="text-sm font-medium mb-2 text-error">
                    Failed to load trace details
                  </div>
                  <div className="text-xs text-muted text-center mb-4 max-w-xs">{spansError}</div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => loadTraceSpans(selectedTrace.traceId)}
                    className="text-xs"
                  >
                    <RefreshCw className="w-3 h-3 mr-1.5" />
                    Retry
                  </Button>
                </div>
              )}

              {!isLoadingSpans && !spansError && waterfallData && (
                <>
                  <TraceHeader data={waterfallData} traceId={selectedTrace.traceId} />

                  <div className="border-b border-border p-4">
                    <ViewSwitcher currentView={activeView} onViewChange={setActiveView} />
                  </div>

                  <div className="flex-1 overflow-auto">
                    {activeView === 'waterfall' && (
                      <WaterfallChart data={waterfallData} onSpanClick={setSelectedSpan} />
                    )}

                    {activeView === 'flamegraph' && (
                      <FlameGraph data={waterfallData} onSpanClick={setSelectedSpan} />
                    )}

                    {activeView === 'map' && (
                      <TraceMap data={waterfallData} onSpanClick={setSelectedSpan} />
                    )}
                  </div>

                  <div className="border-t border-border">
                    <ServiceBreakdown data={waterfallData} />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <SpanPanel span={selectedSpan} onClose={() => setSelectedSpan(null)} />
    </div>
  )
}
