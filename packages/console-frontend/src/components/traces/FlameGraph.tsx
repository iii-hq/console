import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getServiceColor, SPAN_STATUS_COLORS } from '@/lib/traceColors'
import type { VisualizationSpan, WaterfallData } from '@/lib/traceTransform'

interface FlameGraphProps {
  data: WaterfallData
  onSpanClick: (span: VisualizationSpan) => void
}

interface FlameNode {
  span: VisualizationSpan
  x: number
  width: number
  depth: number
  children: FlameNode[]
}

const STATUS_COLORS = {
  ok: { bg: SPAN_STATUS_COLORS.ok, hover: '#4ade80' },
  error: { bg: SPAN_STATUS_COLORS.error, hover: '#f87171' },
  unset: { bg: SPAN_STATUS_COLORS.unset, hover: '#9ca3af' },
}

function buildFlameNodes(spans: VisualizationSpan[]): FlameNode[] {
  const spanMap = new Map<string, FlameNode>()
  const roots: FlameNode[] = []

  // Create nodes with position data
  for (const span of spans) {
    const node: FlameNode = {
      span,
      x: span.start_percent,
      width: span.width_percent,
      depth: span.depth,
      children: [],
    }
    spanMap.set(span.span_id, node)
  }

  // Build tree
  for (const span of spans) {
    const node = spanMap.get(span.span_id)
    if (!node) continue

    if (span.parent_span_id && spanMap.has(span.parent_span_id)) {
      const parent = spanMap.get(span.parent_span_id)
      if (parent) parent.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

function flattenFlameNodes(nodes: FlameNode[]): FlameNode[] {
  const result: FlameNode[] = []

  function traverse(node: FlameNode) {
    result.push(node)
    for (const child of node.children) {
      traverse(child)
    }
  }

  for (const node of nodes) {
    traverse(node)
  }
  return result
}

function formatDuration(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`
  if (ms < 1000) return `${ms.toFixed(2)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

export function FlameGraph({ data, onSpanClick }: FlameGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoveredNode, setHoveredNode] = useState<FlameNode | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [colorBy, setColorBy] = useState<'status' | 'service'>('status')
  const [zoomLevel, setZoomLevel] = useState(1)
  const [panOffset, setPanOffset] = useState(0)

  const ROW_HEIGHT = 24
  const ROW_GAP = 2
  const PADDING = 16

  const flameNodes = useMemo(() => buildFlameNodes(data.spans), [data.spans])
  const flatNodes = useMemo(() => flattenFlameNodes(flameNodes), [flameNodes])
  const maxDepth = useMemo(() => Math.max(...data.spans.map((s) => s.depth), 0) + 1, [data.spans])

  // Generate service color map
  const serviceColorMap = useMemo(() => {
    const services = new Set<string>()
    for (const span of data.spans) {
      const service = span.service_name || span.name.split('.')[0]
      services.add(service)
    }
    const map = new Map<string, string>()
    for (const service of services) {
      map.set(service, getServiceColor(service))
    }
    return map
  }, [data.spans])

  const getNodeColor = useCallback(
    (node: FlameNode, isHovered: boolean) => {
      if (colorBy === 'status') {
        const status = node.span.status
        const colors = STATUS_COLORS[status]
        return isHovered ? colors.hover : colors.bg
      }
      const service = node.span.service_name || node.span.name.split('.')[0]
      const color = serviceColorMap.get(service) || '#6e7681'
      return isHovered ? color : `${color}cc`
    },
    [colorBy, serviceColorMap],
  )

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const width = container.clientWidth
    const height = maxDepth * (ROW_HEIGHT + ROW_GAP) + PADDING * 2

    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.scale(dpr, dpr)

    // Clear
    ctx.fillStyle = '#0A0A0A'
    ctx.fillRect(0, 0, width, height)

    // Draw grid lines
    ctx.strokeStyle = '#1D1D1D'
    ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const x = PADDING + (width - PADDING * 2) * (i / 4)
      ctx.beginPath()
      ctx.moveTo(x, PADDING)
      ctx.lineTo(x, height - PADDING)
      ctx.stroke()
    }

    // Draw spans
    const graphWidth = (width - PADDING * 2) * zoomLevel
    const offsetX = panOffset

    for (const node of flatNodes) {
      const x = PADDING + (node.x / 100) * graphWidth - offsetX
      const w = Math.max(2, (node.width / 100) * graphWidth)
      const y = PADDING + node.depth * (ROW_HEIGHT + ROW_GAP)

      // Skip if out of view
      if (x + w < 0 || x > width) continue

      const isHovered = hoveredNode?.span.span_id === node.span.span_id

      // Draw bar
      ctx.fillStyle = getNodeColor(node, isHovered)
      ctx.beginPath()
      ctx.roundRect(x, y, w, ROW_HEIGHT, 3)
      ctx.fill()

      // Draw border for hovered
      if (isHovered) {
        ctx.strokeStyle = '#F3F724'
        ctx.lineWidth = 2
        ctx.stroke()
      }

      // Draw text if wide enough
      if (w > 40) {
        ctx.fillStyle = '#F4F4F4'
        ctx.font = '11px JetBrains Mono, monospace'
        ctx.textBaseline = 'middle'

        const text = node.span.name
        const maxTextWidth = w - 8
        let displayText = text

        // Truncate text if needed
        while (ctx.measureText(displayText).width > maxTextWidth && displayText.length > 3) {
          displayText = `${displayText.slice(0, -4)}...`
        }

        if (displayText.length > 3) {
          ctx.fillText(displayText, x + 4, y + ROW_HEIGHT / 2)
        }
      }
    }

    // Draw time ruler
    ctx.fillStyle = '#9CA3AF'
    ctx.font = '10px JetBrains Mono, monospace'
    ctx.textBaseline = 'top'
    for (let i = 0; i <= 4; i++) {
      const x = PADDING + (width - PADDING * 2) * (i / 4)
      const time = formatDuration(
        (data.total_duration_ms / zoomLevel) * (i / 4) +
          (panOffset / graphWidth) * data.total_duration_ms,
      )
      ctx.fillText(time, x, height - PADDING + 4)
    }
  }, [flatNodes, maxDepth, hoveredNode, getNodeColor, zoomLevel, panOffset, data.total_duration_ms])

  useEffect(() => {
    draw()

    const handleResize = () => draw()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [draw])

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const width = container.clientWidth
    const graphWidth = (width - PADDING * 2) * zoomLevel

    // Find hovered node
    let found: FlameNode | null = null
    for (const node of flatNodes) {
      const nodeX = PADDING + (node.x / 100) * graphWidth - panOffset
      const nodeW = Math.max(2, (node.width / 100) * graphWidth)
      const nodeY = PADDING + node.depth * (ROW_HEIGHT + ROW_GAP)

      if (x >= nodeX && x <= nodeX + nodeW && y >= nodeY && y <= nodeY + ROW_HEIGHT) {
        found = node
        break
      }
    }

    setHoveredNode(found)
    setTooltipPos({ x: e.clientX, y: e.clientY })
  }

  const handleMouseLeave = () => {
    setHoveredNode(null)
  }

  const handleClick = () => {
    if (hoveredNode) {
      onSpanClick(hoveredNode.span)
    }
  }

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      setZoomLevel((prev) => Math.max(1, Math.min(10, prev * delta)))
    } else {
      setPanOffset((prev) => Math.max(0, prev + e.deltaY))
    }
  }

  const handleReset = () => {
    setZoomLevel(1)
    setPanOffset(0)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Color by:</span>
          <button
            type="button"
            onClick={() => setColorBy('status')}
            className={`px-3 py-1 text-sm rounded ${
              colorBy === 'status'
                ? 'bg-[#F3F724] text-black'
                : 'bg-[#141414] text-gray-400 hover:text-white'
            }`}
          >
            Status
          </button>
          <button
            type="button"
            onClick={() => setColorBy('service')}
            className={`px-3 py-1 text-sm rounded ${
              colorBy === 'service'
                ? 'bg-[#F3F724] text-black'
                : 'bg-[#141414] text-gray-400 hover:text-white'
            }`}
          >
            Service
          </button>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="px-3 py-1 text-sm bg-[#141414] text-gray-400 hover:text-white rounded"
        >
          Reset View
        </button>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="relative w-full">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          onWheel={handleWheel}
          className="cursor-pointer"
        />
      </div>

      {/* Tooltip */}
      {hoveredNode && (
        <div
          className="fixed z-50 bg-[#141414] border border-[#1D1D1D] rounded px-3 py-2 text-sm pointer-events-none"
          style={{
            left: tooltipPos.x + 10,
            top: tooltipPos.y + 10,
          }}
        >
          <div className="font-semibold text-white">{hoveredNode.span.name}</div>
          <div className="text-gray-400">
            Duration: {formatDuration(hoveredNode.span.duration_ms)}
          </div>
          <div className="text-gray-400">Status: {hoveredNode.span.status}</div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm text-gray-400">
        {colorBy === 'status' ? (
          <>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: STATUS_COLORS.ok.bg }} />
              <span>OK</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: STATUS_COLORS.error.bg }}
              />
              <span>Error</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: STATUS_COLORS.unset.bg }}
              />
              <span>Unset</span>
            </div>
          </>
        ) : (
          <span>Colors represent different services</span>
        )}
      </div>
    </div>
  )
}
