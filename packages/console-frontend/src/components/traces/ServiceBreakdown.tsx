import { useMemo } from 'react'
import { getServiceColor } from '@/lib/traceColors'
import type { WaterfallData } from '@/lib/traceTransform'

interface ServiceBreakdownProps {
  data: WaterfallData
}

interface ServiceStats {
  name: string
  color: string
  spanCount: number
  totalDuration: number
  errorCount: number
  percentage: number
}

function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.ceil((percentile / 100) * sorted.length) - 1
  return sorted[Math.max(0, index)]
}

function formatDuration(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`
  if (ms < 1000) return `${ms.toFixed(2)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

export function ServiceBreakdown({ data }: ServiceBreakdownProps) {
  const { serviceStats, percentiles } = useMemo(() => {
    const statsMap = new Map<string, ServiceStats>()
    const durations: number[] = []

    for (const span of data.spans) {
      const serviceName = span.service_name || span.name.split('.')[0]

      // Only include valid duration values
      if (Number.isFinite(span.duration_ms)) {
        durations.push(span.duration_ms)
      }

      if (!statsMap.has(serviceName)) {
        statsMap.set(serviceName, {
          name: serviceName,
          color: getServiceColor(serviceName),
          spanCount: 0,
          totalDuration: 0,
          errorCount: 0,
          percentage: 0,
        })
      }

      const stats = statsMap.get(serviceName)!
      stats.spanCount++
      stats.totalDuration += Number.isFinite(span.duration_ms) ? span.duration_ms : 0
      if (span.status === 'error') stats.errorCount++
    }

    const totalDuration = data.total_duration_ms
    for (const stats of statsMap.values()) {
      stats.percentage = (stats.totalDuration / totalDuration) * 100
    }

    const serviceStats = Array.from(statsMap.values()).sort(
      (a, b) => b.totalDuration - a.totalDuration,
    )

    const percentiles = {
      p50: calculatePercentile(durations, 50),
      p95: calculatePercentile(durations, 95),
      p99: calculatePercentile(durations, 99),
      max: durations.length > 0 ? Math.max(...durations) : 0,
    }

    return { serviceStats, percentiles }
  }, [data])

  const pieChartData = useMemo(() => {
    let currentAngle = 0
    return serviceStats.map((service) => {
      const angle = (service.percentage / 100) * 360
      const startAngle = currentAngle
      const endAngle = currentAngle + angle
      currentAngle = endAngle

      const startRad = (startAngle - 90) * (Math.PI / 180)
      const endRad = (endAngle - 90) * (Math.PI / 180)

      const x1 = 50 + 40 * Math.cos(startRad)
      const y1 = 50 + 40 * Math.sin(startRad)
      const x2 = 50 + 40 * Math.cos(endRad)
      const y2 = 50 + 40 * Math.sin(endRad)

      const largeArc = angle > 180 ? 1 : 0

      return {
        service,
        path: `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`,
      }
    })
  }, [serviceStats])

  return (
    <div className="bg-[#141414] rounded-lg p-6 space-y-6">
      <h3 className="text-lg font-semibold text-white">Service Breakdown</h3>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[#0A0A0A] rounded-lg p-4">
          <div className="text-xs text-gray-400 mb-1">p50</div>
          <div className="text-lg font-mono font-bold text-white">
            {formatDuration(percentiles.p50)}
          </div>
        </div>
        <div className="bg-[#0A0A0A] rounded-lg p-4">
          <div className="text-xs text-gray-400 mb-1">p95</div>
          <div className="text-lg font-mono font-bold text-white">
            {formatDuration(percentiles.p95)}
          </div>
        </div>
        <div className="bg-[#0A0A0A] rounded-lg p-4">
          <div className="text-xs text-gray-400 mb-1">p99</div>
          <div className="text-lg font-mono font-bold text-white">
            {formatDuration(percentiles.p99)}
          </div>
        </div>
        <div className="bg-[#0A0A0A] rounded-lg p-4">
          <div className="text-xs text-gray-400 mb-1">max</div>
          <div className="text-lg font-mono font-bold text-white">
            {formatDuration(percentiles.max)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <svg viewBox="0 0 100 100" className="w-full max-w-[200px] mx-auto">
            {pieChartData.map(({ service, path }) => (
              <path
                key={service.name}
                d={path}
                fill={service.color}
                stroke="#0A0A0A"
                strokeWidth="0.5"
              />
            ))}
          </svg>
        </div>

        <div className="space-y-2">
          {serviceStats.map((service) => (
            <div key={service.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: service.color }} />
                <span className="text-white">{service.name}</span>
              </div>
              <span className="text-gray-400">{service.percentage.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1D1D1D]">
              <th className="text-left py-2 text-gray-400 font-medium">Service</th>
              <th className="text-right py-2 text-gray-400 font-medium">Spans</th>
              <th className="text-right py-2 text-gray-400 font-medium">Duration</th>
              <th className="text-right py-2 text-gray-400 font-medium">Errors</th>
            </tr>
          </thead>
          <tbody>
            {serviceStats.map((service) => (
              <tr key={service.name} className="border-b border-[#1D1D1D] last:border-0">
                <td className="py-2 text-white">{service.name}</td>
                <td className="py-2 text-right text-gray-300">{service.spanCount}</td>
                <td className="py-2 text-right text-gray-300 font-mono">
                  {formatDuration(service.totalDuration)}
                </td>
                <td className="py-2 text-right">
                  <span
                    className={
                      service.errorCount > 0 ? 'text-red-500 font-semibold' : 'text-gray-300'
                    }
                  >
                    {service.errorCount}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
