import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Calendar,
  ChevronRight,
  Clock,
  Database,
  Globe,
  MessageSquare,
  Server,
  TrendingUp,
  Users,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createMetricsSubscription } from '@/api'
import { useConfig } from '@/api/config-provider'
import {
  functionsQuery,
  metricsHistoryQuery,
  statusQuery,
  streamsQuery,
  triggersQuery,
} from '@/api/queries'
import { Badge, Card, CardContent, CardHeader, CardTitle, StatCard } from '@/components/ui/card'

export const Route = createFileRoute('/')({
  component: DashboardPage,
  loader: ({ context: { queryClient } }) => {
    // Use prefetchQuery instead of ensureQueryData to avoid throwing on errors
    // The components will handle loading/error states gracefully
    Promise.allSettled([
      queryClient.prefetchQuery(statusQuery),
      queryClient.prefetchQuery(functionsQuery),
      queryClient.prefetchQuery(triggersQuery),
      queryClient.prefetchQuery(streamsQuery),
      queryClient.prefetchQuery(metricsHistoryQuery(100)),
    ])
  },
})

interface MiniChartProps {
  data: number[]
  color: string
  height?: number
}

function MiniChart({ data, color, height = 40 }: MiniChartProps) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-10 text-[10px] text-muted">
        Collecting data...
      </div>
    )
  }

  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  const points = data
    .map((value, i) => {
      const x = (i / (data.length - 1)) * 100
      const y = ((max - value) / range) * height
      return `${x},${y}`
    })
    .join(' ')

  const areaPoints = `0,${height} ${points} 100,${height}`

  return (
    <svg viewBox={`0 0 100 ${height}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#gradient-${color})`} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

interface MetricsChartProps {
  title: string
  value: number | string
  data: number[]
  color: string
  icon: React.ElementType
  trend?: number
}

function MetricsChart({ title, value, data, color, icon: Icon, trend }: MetricsChartProps) {
  return (
    <div className="bg-dark-gray/40 rounded-xl border border-border p-4 hover:border-muted/40 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md" style={{ backgroundColor: `${color}20` }}>
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          <span className="text-xs font-medium text-muted uppercase tracking-wider">{title}</span>
        </div>
        {trend !== undefined && trend !== 0 && (
          <div
            className={`flex items-center gap-1 text-[10px] font-medium ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}
          >
            <TrendingUp className={`w-3 h-3 ${trend < 0 ? 'rotate-180' : ''}`} />
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-bold mb-3">{value}</div>
      <div className="h-10">
        <MiniChart data={data} color={color} />
      </div>
    </div>
  )
}

function DashboardPage() {
  const queryClient = useQueryClient()
  const [streamConnected, setStreamConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const { data: statusData, isLoading: statusLoading, isError: statusError } = useQuery(statusQuery)
  const {
    data: functionsData,
    isLoading: functionsLoading,
    isError: functionsError,
  } = useQuery(functionsQuery)
  const {
    data: triggersData,
    isLoading: triggersLoading,
    isError: triggersError,
  } = useQuery(triggersQuery)
  const { data: streamsData, isError: streamsError } = useQuery(streamsQuery)
  const { data: metricsHistoryData } = useQuery(metricsHistoryQuery(100))

  const config = useConfig()
  const loading = statusLoading || functionsLoading || triggersLoading
  const hasError = statusError || functionsError || triggersError || streamsError

  // Subscribe to real-time metrics
  useEffect(() => {
    const subscription = createMetricsSubscription(queryClient)
    subscription.connect()
    setStreamConnected(true)

    return () => {
      subscription.disconnect()
      setStreamConnected(false)
    }
  }, [queryClient])

  // Track last update when metrics change
  useEffect(() => {
    if (metricsHistoryData?.history?.length) {
      setLastUpdate(new Date())
    }
  }, [metricsHistoryData])

  const status = statusData ?? null
  const triggers = triggersData?.triggers ?? []
  const functions = functionsData?.functions ?? []
  const streams = streamsData?.streams ?? []
  const metricsHistory = metricsHistoryData?.history ?? []

  const isOnline = status !== null

  const userTriggers = triggers.filter((t) => !t.internal)
  const userFunctions = functions.filter((f) => !f.internal)

  const functionsChartData = useMemo(
    () => metricsHistory.map((m) => m.functions_count),
    [metricsHistory],
  )

  const triggersChartData = useMemo(
    () => metricsHistory.map((m) => m.triggers_count),
    [metricsHistory],
  )

  const workersData = useMemo(() => metricsHistory.map((m) => m.workers_count), [metricsHistory])

  const uptimeData = useMemo(() => metricsHistory.map((m) => m.uptime_seconds), [metricsHistory])

  const calculateTrend = useCallback((data: number[]): number => {
    if (data.length < 2) return 0
    const recent = data.slice(-5)
    const older = data.slice(0, 5)
    if (older.length === 0 || recent.length === 0) return 0
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length
    if (olderAvg === 0) return 0
    return Math.round(((recentAvg - olderAvg) / olderAvg) * 100)
  }, [])

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-[1800px] mx-auto">
      {hasError && (
        <div className="bg-yellow/10 border border-yellow/30 rounded-lg p-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-yellow">Connection Issue</p>
            <p className="text-xs text-muted">
              Unable to connect to the iii engine. Check that it's running on the expected host and
              port.
            </p>
          </div>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg md:text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-[10px] md:text-xs text-muted mt-1 tracking-wide">
            System overview
            {streamConnected && <span className="ml-2 text-[#22C55E]">• Live</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`
            flex items-center gap-1.5 px-2 py-1 md:px-3 md:py-1.5 rounded-full border
            ${streamConnected ? 'border-[#F3F724]/40' : 'border-border'}
          `}
          >
            {streamConnected ? (
              <Wifi className="w-3 h-3 text-[#F3F724]" />
            ) : (
              <WifiOff className="w-3 h-3 text-muted" />
            )}
            <span className="text-[9px] md:text-[10px] tracking-[0.1em] uppercase text-muted hidden sm:inline">
              {streamConnected ? 'Live' : 'Connecting'}
            </span>
          </div>
          <div
            className={`
            flex items-center gap-1.5 px-2 py-1 md:px-4 md:py-2 rounded-full border
            ${isOnline ? 'border-[#22C55E]/40' : 'border-[#EF4444]/40'}
          `}
          >
            <div
              className={`
              w-2 h-2 rounded-full
              ${
                isOnline
                  ? 'bg-[#22C55E] shadow-[0_0_8px_#22C55E]'
                  : 'bg-[#EF4444] shadow-[0_0_8px_#EF4444]'
              }
            `}
            />
            <span className="text-[10px] md:text-[11px] tracking-[0.1em] uppercase text-foreground">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:gap-4 grid-cols-2 xl:grid-cols-4">
        <MetricsChart
          title="Functions"
          value={loading ? '—' : userFunctions.length}
          data={functionsChartData}
          color="#22C55E"
          icon={Activity}
          trend={calculateTrend(functionsChartData)}
        />
        <MetricsChart
          title="Triggers"
          value={loading ? '—' : userTriggers.length}
          data={triggersChartData}
          color="#F3F724"
          icon={Zap}
          trend={calculateTrend(triggersChartData)}
        />
        <MetricsChart
          title="Workers"
          value={loading ? '—' : (status?.workers ?? 0)}
          data={workersData}
          color="#06B6D4"
          icon={Users}
          trend={calculateTrend(workersData)}
        />
        <MetricsChart
          title="Uptime"
          value={loading ? '—' : (status?.uptime_formatted ?? '—')}
          data={uptimeData}
          color="#A855F7"
          icon={Clock}
        />
      </div>

      <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2">
        <StatCard
          title="Version"
          value={loading ? '—' : (status?.version ?? '—')}
          subtitle="Engine"
          icon={Server}
        />
        <div className="bg-dark-gray/40 rounded-xl border border-border p-3 md:p-4 flex items-center gap-3 md:gap-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] md:text-xs text-muted uppercase tracking-wider mb-1">
              Metrics
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-base md:text-lg font-bold">{metricsHistory.length}</div>
              <span className="text-[10px] md:text-xs text-muted">points</span>
            </div>
          </div>
          {streamConnected && (
            <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live
            </div>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="text-sm md:text-base">Application Flow</CardTitle>
          <div className="text-[9px] md:text-[10px] text-muted">
            How triggers, functions, and streams connect
          </div>
        </CardHeader>
        <CardContent className="p-3 md:p-6">
          {loading ? (
            <div className="text-xs text-muted py-8 text-center">Loading...</div>
          ) : userTriggers.length === 0 && userFunctions.length === 0 ? (
            <div className="text-xs text-muted py-8 text-center border border-dashed border-border rounded">
              <div className="mb-2">No application components registered</div>
              <div className="text-[10px] text-muted/60">
                Register functions and triggers using the SDK to see your application flow
              </div>
            </div>
          ) : (
            <div className="relative overflow-hidden">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 lg:gap-2 py-2 md:py-4">
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] md:text-[11px] font-bold text-muted uppercase tracking-[0.15em] md:tracking-[0.2em] mb-3 md:mb-4 text-center">
                    Triggers
                  </div>
                  <div className="space-y-2 md:space-y-3">
                    {userTriggers.filter((t) => t.trigger_type === 'api').length > 0 && (
                      <div className="bg-cyan-500/15 border border-cyan-500/40 rounded-lg md:rounded-xl p-3 md:p-4 shadow-[0_0_15px_rgba(6,182,212,0.05)]">
                        <div className="flex items-center gap-2 mb-2 md:mb-3">
                          <Globe className="w-3.5 h-3.5 md:w-4 md:h-4 text-cyan-400" />
                          <span className="text-[10px] md:text-xs font-bold text-cyan-400 tracking-wider uppercase">
                            REST API
                          </span>
                        </div>
                        <div className="space-y-1.5 md:space-y-2">
                          {userTriggers
                            .filter((t) => t.trigger_type === 'api')
                            .slice(0, 3)
                            .map((t) => (
                              <div
                                key={t.id}
                                className="text-[10px] md:text-[11px] font-mono text-foreground/90 flex items-center gap-1.5 md:gap-2 bg-black/40 px-1.5 md:px-2 py-1 md:py-1.5 rounded border border-cyan-500/10 overflow-hidden"
                              >
                                <span className="text-cyan-400/80 flex-shrink-0">→</span>
                                <span className="text-cyan-300/90 flex-shrink-0">
                                  {(t.config as { http_method?: string })?.http_method || 'GET'}
                                </span>
                                <span className="truncate">
                                  /
                                  {(t.config as { api_path?: string })?.api_path ||
                                    t.function_id?.replace(/^api\./, '').replace(/\./g, '/')}
                                </span>
                              </div>
                            ))}
                          {userTriggers.filter((t) => t.trigger_type === 'api').length > 3 && (
                            <div className="text-[9px] md:text-[10px] text-cyan-400/60 font-medium pl-2 italic">
                              +{userTriggers.filter((t) => t.trigger_type === 'api').length - 3}{' '}
                              more
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {userTriggers.filter((t) => t.trigger_type === 'cron').length > 0 && (
                      <div className="bg-orange-500/15 border border-orange-500/40 rounded-lg md:rounded-xl p-3 md:p-4 shadow-[0_0_15px_rgba(249,115,22,0.05)]">
                        <div className="flex items-center gap-2 mb-2 md:mb-3">
                          <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-orange-400" />
                          <span className="text-[10px] md:text-xs font-bold text-orange-400 tracking-wider uppercase">
                            Scheduled
                          </span>
                        </div>
                        <div className="space-y-1.5 md:space-y-2">
                          {userTriggers
                            .filter((t) => t.trigger_type === 'cron')
                            .slice(0, 2)
                            .map((t) => (
                              <div
                                key={t.id}
                                className="text-[10px] md:text-[11px] font-mono text-foreground/90 bg-black/40 px-1.5 md:px-2 py-1 md:py-1.5 rounded border border-orange-500/10 truncate"
                              >
                                <span className="text-orange-400/80 pr-1">⏱</span>
                                {(t.config as { schedule?: string })?.schedule || 'scheduled'}
                              </div>
                            ))}
                          {userTriggers.filter((t) => t.trigger_type === 'cron').length > 2 && (
                            <div className="text-[9px] md:text-[10px] text-orange-400/60 font-medium pl-2 italic">
                              +{userTriggers.filter((t) => t.trigger_type === 'cron').length - 2}{' '}
                              more
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {userTriggers.filter((t) => t.trigger_type === 'event').length > 0 && (
                      <div className="bg-purple-500/15 border border-purple-500/40 rounded-lg md:rounded-xl p-3 md:p-4 shadow-[0_0_15px_rgba(168,85,247,0.05)]">
                        <div className="flex items-center gap-2 mb-1.5 md:mb-2">
                          <MessageSquare className="w-3.5 h-3.5 md:w-4 md:h-4 text-purple-400" />
                          <span className="text-[10px] md:text-xs font-bold text-purple-400 tracking-wider uppercase">
                            Events
                          </span>
                        </div>
                        <div className="text-[10px] md:text-[11px] text-foreground/80 pl-1 font-medium italic">
                          {userTriggers.filter((t) => t.trigger_type === 'event').length} listeners
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="hidden lg:flex flex-shrink-0 items-center justify-center w-12 xl:w-16">
                  <div className="flex flex-col items-center gap-2 opacity-60 group hover:opacity-100 transition-all duration-300">
                    <div className="text-[7px] xl:text-[8px] text-muted font-bold uppercase tracking-[0.15em] bg-dark-gray px-1 py-0.5 rounded border border-border/60 shadow-sm">
                      invoke
                    </div>
                    <div className="flex items-center justify-center w-full">
                      <div className="h-[1px] w-2 xl:w-4 bg-gradient-to-r from-transparent to-muted/40" />
                      <div className="w-5 h-5 xl:w-6 xl:h-6 rounded-full border border-border/80 bg-black flex items-center justify-center shadow-lg">
                        <ChevronRight className="w-2.5 h-2.5 xl:w-3 xl:h-3 text-muted" />
                      </div>
                      <div className="h-[1px] w-2 xl:w-4 bg-gradient-to-r from-muted/40 to-transparent" />
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-[10px] md:text-[11px] font-bold text-muted uppercase tracking-[0.15em] md:tracking-[0.2em] mb-3 md:mb-4 text-center">
                    Functions
                  </div>
                  <div className="bg-dark-gray/40 border border-border/60 rounded-lg md:rounded-xl p-3 md:p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3 md:mb-4 border-b border-border/30 pb-2 md:pb-3">
                      <Activity className="w-3.5 h-3.5 md:w-4 md:h-4 text-foreground" />
                      <span className="text-[10px] md:text-xs font-bold tracking-wide uppercase">
                        {userFunctions.length} Functions
                      </span>
                    </div>
                    <div className="space-y-1.5 md:space-y-2 max-h-[200px] md:max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
                      {userFunctions.slice(0, 6).map((f) => (
                        <div
                          key={f.function_id}
                          className="text-[10px] md:text-[11px] font-mono text-foreground/90 bg-black/30 px-2 md:px-3 py-1.5 md:py-2 rounded border border-border/20 truncate"
                        >
                          {f.function_id}
                        </div>
                      ))}
                      {userFunctions.length > 6 && (
                        <div className="text-[9px] md:text-[10px] text-muted font-medium pl-2 italic">
                          +{userFunctions.length - 6} more
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="hidden lg:flex flex-shrink-0 items-center justify-center w-12 xl:w-16">
                  <div className="flex flex-col items-center gap-2 opacity-60 group hover:opacity-100 transition-all duration-300">
                    <div className="text-[7px] xl:text-[8px] text-muted font-bold uppercase tracking-[0.15em] bg-dark-gray px-1 py-0.5 rounded border border-border/60 shadow-sm">
                      r/w
                    </div>
                    <div className="flex items-center justify-center w-full">
                      <div className="h-[1px] w-2 xl:w-4 bg-gradient-to-r from-transparent to-muted/40" />
                      <div className="w-5 h-5 xl:w-6 xl:h-6 rounded-full border border-border/80 bg-black flex items-center justify-center shadow-lg">
                        <ChevronRight className="w-2.5 h-2.5 xl:w-3 xl:h-3 text-muted" />
                      </div>
                      <div className="h-[1px] w-2 xl:w-4 bg-gradient-to-r from-muted/40 to-transparent" />
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-[10px] md:text-[11px] font-bold text-muted uppercase tracking-[0.15em] md:tracking-[0.2em] mb-3 md:mb-4 text-center">
                    States
                  </div>
                  {streams.filter((s) => !s.internal).length > 0 ? (
                    <div className="bg-blue-500/15 border border-blue-500/40 rounded-lg md:rounded-xl p-3 md:p-4 shadow-[0_0_15px_rgba(59,130,246,0.05)]">
                      <div className="flex items-center gap-2 mb-2 md:mb-3">
                        <Database className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-400" />
                        <span className="text-[10px] md:text-xs font-bold text-blue-400 tracking-wider uppercase">
                          KV Store
                        </span>
                      </div>
                      <div className="space-y-1.5 md:space-y-2">
                        {streams
                          .filter((s) => !s.internal)
                          .slice(0, 4)
                          .map((s) => (
                            <div
                              key={s.id}
                              className="text-[10px] md:text-[11px] font-mono text-foreground/90 bg-black/40 px-1.5 md:px-2 py-1 md:py-1.5 rounded border border-blue-500/10 truncate"
                            >
                              <span className="text-blue-400/60 pr-1 font-bold">⚡</span>
                              {s.id}
                            </div>
                          ))}
                        {streams.filter((s) => !s.internal).length > 4 && (
                          <div className="text-[9px] md:text-[10px] text-blue-400/60 font-medium pl-2 italic">
                            +{streams.filter((s) => !s.internal).length - 4} more
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-dark-gray/30 border border-dashed border-border/60 rounded-lg md:rounded-xl p-3 md:p-4 text-center">
                      <Database className="w-4 h-4 md:w-5 md:h-5 text-muted/40 mb-1.5 md:mb-2 mx-auto" />
                      <div className="text-[9px] md:text-[10px] font-bold text-muted/60 uppercase tracking-widest">
                        No States
                      </div>
                    </div>
                  )}
                </div>

                <div className="hidden lg:flex flex-shrink-0 items-center justify-center w-2 xl:w-4 self-stretch">
                  <div className="w-[1px] h-full bg-gradient-to-b from-transparent via-border/40 to-transparent" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-[10px] md:text-[11px] font-bold text-muted uppercase tracking-[0.15em] md:tracking-[0.2em] mb-3 md:mb-4 text-center">
                    Streams
                  </div>
                  <div className="bg-green-500/15 border border-green-500/40 rounded-lg md:rounded-xl p-3 md:p-4 shadow-[0_0_15px_rgba(34,197,94,0.05)]">
                    <div className="flex items-center gap-2 mb-2 md:mb-3">
                      <Wifi className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-400" />
                      <span className="text-[10px] md:text-xs font-bold text-green-400 tracking-wider uppercase">
                        WebSocket
                      </span>
                    </div>
                    <div className="space-y-1.5 md:space-y-2">
                      <div className="text-[10px] md:text-[11px] text-foreground/90 bg-black/40 px-1.5 md:px-2 py-1 md:py-1.5 rounded border border-green-500/10">
                        <div className="flex items-center gap-1.5 md:gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                          <span className="font-medium">Real-time</span>
                        </div>
                      </div>
                      <div className="text-[10px] md:text-[11px] font-mono text-foreground/80 bg-black/40 px-1.5 md:px-2 py-1 md:py-1.5 rounded border border-green-500/10 truncate">
                        <span className="text-green-400/60 pr-1">ws://</span>:{config.wsPort}
                      </div>
                      <div className="flex items-center gap-2 md:gap-3 text-[9px] md:text-[10px] text-green-400/80 pt-0.5 md:pt-1">
                        <span className="flex items-center gap-1">↓ In</span>
                        <span className="flex items-center gap-1">↑ Out</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-4 mt-4 md:mt-6 pt-4 md:pt-6 border-t border-border/40">
                <div className="flex items-center gap-1.5 md:gap-2 group cursor-default">
                  <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-sm bg-cyan-500/40 border border-cyan-500/60" />
                  <span className="text-[8px] md:text-[10px] font-bold text-muted uppercase tracking-wider">
                    API
                  </span>
                </div>
                <div className="flex items-center gap-1.5 md:gap-2 group cursor-default">
                  <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-sm bg-orange-500/40 border border-orange-500/60" />
                  <span className="text-[8px] md:text-[10px] font-bold text-muted uppercase tracking-wider">
                    Cron
                  </span>
                </div>
                <div className="flex items-center gap-1.5 md:gap-2 group cursor-default">
                  <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-sm bg-purple-500/40 border border-purple-500/60" />
                  <span className="text-[8px] md:text-[10px] font-bold text-muted uppercase tracking-wider">
                    Events
                  </span>
                </div>
                <div className="flex items-center gap-1.5 md:gap-2 group cursor-default">
                  <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-sm bg-blue-500/40 border border-blue-500/60" />
                  <span className="text-[8px] md:text-[10px] font-bold text-muted uppercase tracking-wider">
                    States
                  </span>
                </div>
                <div className="flex items-center gap-1.5 md:gap-2 group cursor-default">
                  <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-sm bg-green-500/40 border border-green-500/60" />
                  <span className="text-[8px] md:text-[10px] font-bold text-muted uppercase tracking-wider">
                    Streams
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-3 items-start">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 md:p-6">
            <CardTitle className="text-sm md:text-base">Registered Triggers</CardTitle>
            <Link
              to="/handlers"
              className="text-[9px] md:text-[10px] tracking-wider uppercase text-[#5B5B5B] hover:text-[#F3F724] transition-colors flex items-center gap-1 group"
            >
              View All{' '}
              <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
            {loading ? (
              <div className="text-xs text-[#5B5B5B] py-6 md:py-8 text-center">Loading...</div>
            ) : userTriggers.length === 0 ? (
              <div className="text-xs text-[#5B5B5B] py-6 md:py-8 text-center border border-dashed border-[#1D1D1D] rounded">
                No user triggers registered
                {triggers.length > 0 && (
                  <div className="text-[9px] text-muted mt-1">
                    ({triggers.length} system triggers hidden)
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b border-[#1D1D1D]">
                    <tr className="border-b border-[#1D1D1D]">
                      <th className="text-left py-2 md:py-3 px-3 md:px-4 text-[10px] md:text-xs font-medium tracking-wider uppercase text-[#5B5B5B]">
                        Type
                      </th>
                      <th className="text-left py-2 md:py-3 px-3 md:px-4 text-[10px] md:text-xs font-medium tracking-wider uppercase text-[#5B5B5B] hidden sm:table-cell">
                        ID
                      </th>
                      <th className="text-left py-2 md:py-3 px-3 md:px-4 text-[10px] md:text-xs font-medium tracking-wider uppercase text-[#5B5B5B]">
                        Function
                      </th>
                      <th className="text-left py-2 md:py-3 px-3 md:px-4 text-[10px] md:text-xs font-medium tracking-wider uppercase text-[#5B5B5B]">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {userTriggers.slice(0, 4).map((trigger) => (
                      <tr
                        key={trigger.id}
                        className="border-b border-[#1D1D1D] transition-colors hover:bg-white/[0.02]"
                      >
                        <td className="py-2 md:py-3 px-3 md:px-4 text-[#F4F4F4]">
                          <Badge variant="outline" className="text-[9px] md:text-[10px]">
                            {trigger.trigger_type}
                          </Badge>
                        </td>
                        <td className="py-2 md:py-3 px-3 md:px-4 text-[#F4F4F4] font-mono text-[9px] md:text-[10px] text-[#5B5B5B] hidden sm:table-cell">
                          {trigger.id.length > 16 ? `${trigger.id.slice(0, 16)}...` : trigger.id}
                        </td>
                        <td className="py-2 md:py-3 px-3 md:px-4 text-[#F4F4F4] font-mono text-[9px] md:text-[10px] max-w-[100px] md:max-w-none truncate">
                          {trigger.function_id || '—'}
                        </td>
                        <td className="py-2 md:py-3 px-3 md:px-4 text-[#F4F4F4]">
                          <Badge variant="success" className="text-[9px] md:text-[10px]">
                            Active
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-3 md:space-y-4">
          <Card>
            <CardHeader className="p-3 md:p-6 pb-2 md:pb-4">
              <CardTitle className="text-sm md:text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                <Link to="/states" className="block group">
                  <div className="p-2 md:p-3 rounded border border-[#1D1D1D] group-hover:border-blue-500/40 transition-colors cursor-pointer">
                    <div className="text-[10px] md:text-xs font-medium group-hover:text-blue-400 transition-colors">
                      States
                    </div>
                    <div className="text-[8px] md:text-[10px] text-[#5B5B5B] mt-0.5 hidden md:block">
                      Key-value store
                    </div>
                  </div>
                </Link>
                <Link to="/streams" className="block group">
                  <div className="p-2 md:p-3 rounded border border-[#1D1D1D] group-hover:border-green-500/40 transition-colors cursor-pointer">
                    <div className="text-[10px] md:text-xs font-medium group-hover:text-green-400 transition-colors">
                      Streams
                    </div>
                    <div className="text-[8px] md:text-[10px] text-[#5B5B5B] mt-0.5 hidden md:block">
                      WebSocket flow
                    </div>
                  </div>
                </Link>
                <Link to="/logs" className="block group">
                  <div className="p-2 md:p-3 rounded border border-[#1D1D1D] group-hover:border-[#F3F724]/40 transition-colors cursor-pointer">
                    <div className="text-[10px] md:text-xs font-medium group-hover:text-[#F3F724] transition-colors">
                      Logs
                    </div>
                    <div className="text-[8px] md:text-[10px] text-[#5B5B5B] mt-0.5 hidden md:block">
                      Debug events
                    </div>
                  </div>
                </Link>
                <Link to="/config" className="block group">
                  <div className="p-2 md:p-3 rounded border border-[#1D1D1D] group-hover:border-[#F3F724]/40 transition-colors cursor-pointer">
                    <div className="text-[10px] md:text-xs font-medium group-hover:text-[#F3F724] transition-colors">
                      Config
                    </div>
                    <div className="text-[8px] md:text-[10px] text-[#5B5B5B] mt-0.5 hidden md:block">
                      Settings
                    </div>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-3 md:p-6 pb-2 md:pb-4">
              <CardTitle className="text-sm md:text-base">System Info</CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0 md:pt-0 space-y-2 md:space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[9px] md:text-[10px] text-muted uppercase tracking-wider">
                  Uptime
                </span>
                <span className="text-[10px] md:text-xs font-mono">
                  {status?.uptime_formatted || '—'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[9px] md:text-[10px] text-muted uppercase tracking-wider">
                  API
                </span>
                <span className="text-[10px] md:text-xs font-mono">:{config.enginePort}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[9px] md:text-[10px] text-muted uppercase tracking-wider">
                  WS
                </span>
                <span className="text-[10px] md:text-xs font-mono">:{config.wsPort}</span>
              </div>
              {lastUpdate && (
                <div className="flex justify-between items-center pt-2 border-t border-border">
                  <span className="text-[9px] md:text-[10px] text-muted uppercase tracking-wider">
                    Updated
                  </span>
                  <span className="text-[10px] md:text-xs font-mono text-[#F3F724]">
                    {lastUpdate.toLocaleTimeString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {!loading && !isOnline && (
        <Card className="border-[#EF4444]/50 bg-[#EF4444]/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[#EF4444]" />
              <div>
                <div className="text-xs font-medium text-[#EF4444]">Engine Connection Failed</div>
                <div className="text-[10px] text-[#5B5B5B] mt-0.5">
                  Unable to connect to the iii engine. Make sure the engine is running with DevTools
                  module enabled.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
