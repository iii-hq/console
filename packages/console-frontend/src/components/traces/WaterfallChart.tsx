import { ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { VisualizationSpan, WaterfallData } from '@/lib/traceTransform'

interface WaterfallChartProps {
  data: WaterfallData
  onSpanClick: (span: VisualizationSpan) => void
  selectedSpanId?: string | null
}

interface SpanNode extends VisualizationSpan {
  children: SpanNode[]
  isExpanded: boolean
  isCriticalPath: boolean
}

function formatDuration(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`
  if (ms < 1000) return `${ms.toFixed(2)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function buildSpanTree(spans: VisualizationSpan[]): SpanNode[] {
  const spanMap = new Map<string, SpanNode>()
  const roots: SpanNode[] = []

  spans.forEach((span) => {
    spanMap.set(span.span_id, {
      ...span,
      children: [],
      isExpanded: true,
      isCriticalPath: false,
    })
  })

  spans.forEach((span) => {
    const node = spanMap.get(span.span_id)!
    if (span.parent_span_id && spanMap.has(span.parent_span_id)) {
      spanMap.get(span.parent_span_id)?.children.push(node)
    } else {
      roots.push(node)
    }
  })

  function markCriticalPath(node: SpanNode): number {
    if (node.children.length === 0) {
      node.isCriticalPath = true
      return node.duration_ms
    }

    let maxDuration = 0
    let criticalChild: SpanNode | null = null

    node.children.forEach((child) => {
      const duration = markCriticalPath(child)
      if (duration > maxDuration) {
        maxDuration = duration
        criticalChild = child
      }
    })

    node.isCriticalPath = true
    node.children.forEach((child) => {
      if (child !== criticalChild) {
        unmarkCriticalPath(child)
      }
    })

    return node.duration_ms + maxDuration
  }

  function unmarkCriticalPath(node: SpanNode) {
    node.isCriticalPath = false
    node.children.forEach(unmarkCriticalPath)
  }

  roots.forEach(markCriticalPath)

  return roots
}

function flattenTree(nodes: SpanNode[], expandedIds: Set<string>): SpanNode[] {
  const result: SpanNode[] = []

  function traverse(node: SpanNode) {
    result.push(node)
    if (expandedIds.has(node.span_id)) {
      node.children.forEach(traverse)
    }
  }

  nodes.forEach(traverse)
  return result
}

export function WaterfallChart({ data, onSpanClick, selectedSpanId }: WaterfallChartProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [showCriticalPath, setShowCriticalPath] = useState(false)
  const [hoveredSpanId, setHoveredSpanId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollPosition, setScrollPosition] = useState(0)

  const totalMs = data.total_duration_ms || 1
  const rulerMarks = [0, 25, 50, 75, 100].map((pct) => ({
    pct,
    label: formatDuration((totalMs * pct) / 100),
  }))

  const spanTree = useMemo(() => buildSpanTree(data.spans), [data.spans])

  useEffect(() => {
    const allIds = new Set(data.spans.map((s) => s.span_id))
    setExpandedIds(allIds)
  }, [data.spans])

  const visibleSpans = useMemo(() => flattenTree(spanTree, expandedIds), [spanTree, expandedIds])

  const toggleExpand = (spanId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(spanId)) {
        next.delete(spanId)
      } else {
        next.add(spanId)
      }
      return next
    })
  }

  const expandAll = () => {
    setExpandedIds(new Set(data.spans.map((s) => s.span_id)))
  }

  const collapseAll = () => {
    setExpandedIds(new Set())
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement
    setScrollPosition(target.scrollTop)
  }

  const miniMapHeight = 80
  const contentHeight = visibleSpans.length * 32
  const viewportRatio = containerRef.current ? containerRef.current.clientHeight / contentHeight : 1
  const thumbHeight = Math.max(20, miniMapHeight * viewportRatio)
  const thumbPosition =
    containerRef.current && contentHeight > 0 ? (scrollPosition / contentHeight) * miniMapHeight : 0

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1D1D1D] bg-[#141414]/30">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="px-2 py-1 text-xs text-gray-400 hover:text-[#F4F4F4] hover:bg-[#1D1D1D] rounded transition-colors"
          >
            Expand all
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="px-2 py-1 text-xs text-gray-400 hover:text-[#F4F4F4] hover:bg-[#1D1D1D] rounded transition-colors"
          >
            Collapse all
          </button>
          <div className="w-px h-4 bg-[#1D1D1D] mx-1" />
          <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showCriticalPath}
              onChange={(e) => setShowCriticalPath(e.target.checked)}
              className="rounded border-[#1D1D1D] bg-[#141414] text-[#F3F724] focus:ring-[#F3F724]/30"
            />
            Show critical path
          </label>
        </div>
        <div className="text-xs text-gray-400">
          {visibleSpans.length} of {data.span_count} spans
        </div>
      </div>

      <div className="grid grid-cols-[300px_1fr] gap-4 px-3 py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wide border-b border-[#1D1D1D] bg-[#141414]/50">
        <span>Span</span>
        <div className="flex justify-between">
          {rulerMarks.map(({ pct, label }) => (
            <span key={pct} className="font-mono">
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div ref={containerRef} className="flex-1 overflow-y-auto" onScroll={handleScroll}>
          {visibleSpans.map((span) => {
            const hasChildren = span.children.length > 0
            const isExpanded = expandedIds.has(span.span_id)
            const isCritical = showCriticalPath && span.isCriticalPath
            const isSelected = selectedSpanId === span.span_id
            const isHovered = hoveredSpanId === span.span_id

            const statusColors = {
              ok: '#22C55E',
              error: '#EF4444',
              unset: '#6B7280',
            }

            let barStyle
            if (isCritical) {
              barStyle = { background: 'linear-gradient(to right, #F97316, #FB923C)' }
            } else if (span.status === 'error') {
              barStyle = { background: 'linear-gradient(to right, #EF4444, #DC2626)' }
            } else if (span.status === 'ok') {
              barStyle = { background: 'linear-gradient(to right, #22C55E, #16A34A)' }
            } else {
              barStyle = { background: 'linear-gradient(to right, #6B7280, #4B5563)' }
            }

            return (
              <div
                key={span.span_id}
                className={`
                  grid grid-cols-[300px_1fr] gap-4 px-3 py-1 items-center transition-colors cursor-pointer
                  ${isSelected ? 'bg-[#F3F724]/[0.06] border-l-2 border-l-[#F3F724]' : isHovered ? 'bg-[#1D1D1D]' : 'hover:bg-[#1D1D1D]/50'}
                  ${isCritical && !isSelected ? 'bg-orange-500/5' : ''}
                `}
                onClick={() => onSpanClick(span)}
                onMouseEnter={() => setHoveredSpanId(span.span_id)}
                onMouseLeave={() => setHoveredSpanId(null)}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="flex-shrink-0 flex" style={{ width: span.depth * 16 }}>
                    {Array.from({ length: span.depth }).map((_, i) => (
                      <div key={i} className="w-4 h-6 border-l border-[#1D1D1D]/50" />
                    ))}
                  </div>

                  {hasChildren ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleExpand(span.span_id)
                      }}
                      className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-[#F4F4F4] flex-shrink-0"
                    >
                      <ChevronRight
                        className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      />
                    </button>
                  ) : (
                    <div className="w-4 h-4 flex-shrink-0" />
                  )}

                  <div
                    className="w-2 h-2 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: statusColors[span.status] }}
                  />

                  <span
                    className={`text-[13px] font-medium truncate ${isSelected ? 'text-[#F3F724]' : 'text-[#F4F4F4]'}`}
                    title={span.name}
                  >
                    {span.name}
                  </span>

                  <span className="font-mono text-[11px] text-gray-400 flex-shrink-0 ml-auto">
                    {formatDuration(span.duration_ms)}
                  </span>
                </div>

                <div className="relative h-6 rounded bg-[linear-gradient(90deg,transparent_0%,transparent_25%,#1D1D1D_25%,#1D1D1D_25.1%,transparent_25.1%,transparent_50%,#1D1D1D_50%,#1D1D1D_50.1%,transparent_50.1%,transparent_75%,#1D1D1D_75%,#1D1D1D_75.1%,transparent_75.1%)]">
                  <div
                    className={`
                      absolute h-4 top-1 rounded-[3px] min-w-[3px] transition-all duration-150
                      ${isSelected ? 'scale-y-[1.3] shadow-[0_0_6px_rgba(243,247,36,0.4)]' : isHovered ? 'scale-y-[1.2] shadow-[0_0_0_2px_rgba(243,247,36,0.3)]' : ''}
                    `}
                    style={{
                      ...barStyle,
                      left: `${span.start_percent}%`,
                      width: `${Math.max(0.5, span.width_percent)}%`,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {contentHeight > (containerRef.current?.clientHeight || 0) && (
          <div className="w-16 border-l border-[#1D1D1D] bg-[#141414]/50 flex-shrink-0 relative p-2">
            <div className="text-[9px] text-gray-400 uppercase tracking-wider mb-2">Map</div>
            <div
              className="relative bg-[#1D1D1D] rounded overflow-hidden"
              style={{ height: miniMapHeight }}
            >
              {data.spans.map((span, i) => {
                const isError = span.status === 'error'
                const barColor = isError ? '#EF4444' : '#6B7280'

                return (
                  <div
                    key={span.span_id}
                    className="absolute h-[2px]"
                    style={{
                      backgroundColor: barColor,
                      opacity: isError ? 0.7 : 0.5,
                      top: `${(i / data.spans.length) * 100}%`,
                      left: `${span.start_percent}%`,
                      width: `${Math.max(2, span.width_percent)}%`,
                    }}
                  />
                )
              })}
              <div
                className="absolute left-0 right-0 bg-[#F3F724]/20 border border-[#F3F724]/40 rounded-sm"
                style={{
                  top: thumbPosition,
                  height: thumbHeight,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
