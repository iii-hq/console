import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  Activity,
  Calendar,
  Check,
  CheckCircle,
  ChevronRight,
  Clock,
  Copy,
  Globe,
  Loader2,
  MessageSquare,
  Play,
  RefreshCw,
  Search,
  Send,
  Terminal,
  X,
  XCircle,
  Zap,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import type { FunctionInfo, TriggerInfo } from '@/api'
import { emitEvent, functionsQuery, triggerCron, triggersQuery } from '@/api'
import { getConfig } from '@/api/config'
import { Badge, Button, Input, Select } from '@/components/ui/card'
import { JsonViewer } from '@/components/ui/json-viewer'

export const Route = createFileRoute('/triggers')({
  component: TriggersPage,
  loader: ({ context: { queryClient } }) => {
    Promise.allSettled([
      queryClient.prefetchQuery(triggersQuery()),
      queryClient.prefetchQuery(functionsQuery()),
    ])
  },
})

interface TriggerResult {
  success: boolean
  message: string
  status?: number
  duration?: number
  data?: unknown
}

function TriggersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showSystem, setShowSystem] = useState(false)
  const [selectedTrigger, setSelectedTrigger] = useState<TriggerInfo | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<string | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  // HTTP invoke state
  const [httpMethod, setHttpMethod] = useState('GET')
  const [pathParams, setPathParams] = useState<Record<string, string>>({})
  const [queryParams, setQueryParams] = useState<Record<string, string>>({})
  const [requestBody, setRequestBody] = useState('{}')

  // Event emit state
  const [eventPayload, setEventPayload] = useState('{"test": true}')

  // Shared invoke state
  const [invoking, setInvoking] = useState(false)
  const [triggerResult, setTriggerResult] = useState<TriggerResult | null>(null)

  const {
    data: triggersData,
    isLoading: loadingTriggers,
    refetch: refetchTriggers,
  } = useQuery(triggersQuery({ include_internal: showSystem }))
  const { data: functionsData, refetch: refetchFunctions } = useQuery(
    functionsQuery({ include_internal: showSystem }),
  )

  const triggers = triggersData?.triggers || []
  const functions = functionsData?.functions || []
  const loading = loadingTriggers

  const getFunction = (functionId: string): FunctionInfo | undefined => {
    return functions.find((f) => f.function_id === functionId)
  }

  const typeCounts = useMemo(() => {
    const relevant = showSystem ? triggers : triggers.filter((t) => !t.internal)
    const counts: Record<string, number> = { http: 0, cron: 0, event: 0, other: 0 }
    for (const t of relevant) {
      if (t.trigger_type === 'http') counts.http++
      else if (t.trigger_type === 'cron') counts.cron++
      else if (t.trigger_type === 'event') counts.event++
      else counts.other++
    }
    return counts
  }, [triggers, showSystem])

  const userTriggers = triggers.filter((t) => !t.internal)

  const filteredTriggers = triggers.filter((t) => {
    if (!showSystem && t.internal) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesTrigger =
        t.id.toLowerCase().includes(query) || t.trigger_type.toLowerCase().includes(query)
      const matchesFunction = t.function_id.toLowerCase().includes(query)
      const config = t.config as Record<string, unknown>
      const matchesConfig =
        (config.api_path && String(config.api_path).toLowerCase().includes(query)) ||
        (config.topic && String(config.topic).toLowerCase().includes(query)) ||
        (config.expression && String(config.expression).toLowerCase().includes(query))
      if (!matchesTrigger && !matchesFunction && !matchesConfig) return false
    }
    if (filterType) {
      if (filterType === 'other') {
        if (['http', 'cron', 'event'].includes(t.trigger_type)) return false
      } else {
        if (t.trigger_type !== filterType) return false
      }
    }
    return true
  })

  const groupedTriggers = filteredTriggers.reduce(
    (acc, trigger) => {
      const group = trigger.trigger_type.toUpperCase()
      if (!acc[group]) acc[group] = []
      acc[group].push(trigger)
      return acc
    },
    {} as Record<string, TriggerInfo[]>,
  )

  const groupOrder = ['HTTP', 'CRON', 'EVENT']
  const groups = Object.keys(groupedTriggers).sort((a, b) => {
    const aIdx = groupOrder.indexOf(a)
    const bIdx = groupOrder.indexOf(b)
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx
    if (aIdx !== -1) return -1
    if (bIdx !== -1) return 1
    return a.localeCompare(b)
  })

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
    })
  }

  const loadData = () => {
    refetchTriggers()
    refetchFunctions()
  }

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const getTriggerIcon = (trigger: TriggerInfo) => {
    switch (trigger.trigger_type) {
      case 'http':
        return <Globe className="w-4 h-4 text-cyan-400" />
      case 'cron':
        return <Calendar className="w-4 h-4 text-orange-400" />
      case 'event':
        return <MessageSquare className="w-4 h-4 text-purple-400" />
      case 'streams:join':
      case 'streams:leave':
        return <Zap className="w-4 h-4 text-success" />
      default:
        return <Zap className="w-4 h-4 text-muted" />
    }
  }

  const getTriggerBadgeClass = (type: string) => {
    switch (type) {
      case 'http':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
      case 'cron':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30'
      case 'event':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30'
      default:
        return ''
    }
  }

  const parseCronExpression = (expression: string): { readable: string; nextRun: string } => {
    if (!expression) return { readable: 'No schedule', nextRun: 'Unknown' }
    const parts = expression.split(' ')
    if (parts.length < 5) return { readable: expression, nextRun: 'Unknown' }
    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts
    let readable = ''
    if (minute === '*' && hour === '*') {
      readable = 'Every minute'
    } else if (minute.startsWith('*/')) {
      readable = `Every ${minute.slice(2)} minutes`
    } else if (hour.startsWith('*/')) {
      readable = `Every ${hour.slice(2)} hours`
    } else if (
      minute === '0' &&
      hour === '0' &&
      dayOfMonth === '*' &&
      month === '*' &&
      dayOfWeek === '*'
    ) {
      readable = 'Daily at midnight'
    } else if (
      minute === '0' &&
      hour !== '*' &&
      dayOfMonth === '*' &&
      month === '*' &&
      dayOfWeek === '*'
    ) {
      readable = `Daily at ${hour}:00`
    } else if (
      minute !== '*' &&
      hour !== '*' &&
      dayOfMonth === '*' &&
      month === '*' &&
      dayOfWeek === '*'
    ) {
      readable = `Daily at ${hour}:${minute.padStart(2, '0')}`
    } else if (dayOfWeek === '0') {
      readable = `Weekly on Sunday at ${hour}:${minute.padStart(2, '0')}`
    } else if (dayOfWeek === '1-5' || dayOfWeek === 'MON-FRI') {
      readable = `Weekdays at ${hour}:${minute.padStart(2, '0')}`
    } else {
      readable = expression
    }
    const now = new Date()
    let nextRun = 'Soon'
    if (minute.startsWith('*/')) {
      const interval = parseInt(minute.slice(2), 10)
      const nextMinute = Math.ceil(now.getMinutes() / interval) * interval
      if (nextMinute >= 60) {
        nextRun = `In ~${interval} min`
      } else {
        nextRun = `In ~${nextMinute - now.getMinutes()} min`
      }
    } else if (hour === '0' && minute === '0') {
      nextRun = 'At midnight'
    }
    return { readable, nextRun }
  }

  const getTriggerSummary = (trigger: TriggerInfo): string => {
    const config = trigger.config as Record<string, unknown>
    switch (trigger.trigger_type) {
      case 'http': {
        const method = (config.http_method as string) || 'GET'
        const path = (config.api_path as string) || ''
        return `${method} /${path.replace(/^\//, '')}`
      }
      case 'cron': {
        const expr = (config.expression as string) || ''
        return parseCronExpression(expr).readable
      }
      case 'event':
        return (config.topic as string) || 'No topic'
      default:
        return trigger.trigger_type
    }
  }

  const handleSelectTrigger = (trigger: TriggerInfo) => {
    if (selectedTrigger?.id === trigger.id) {
      setSelectedTrigger(null)
    } else {
      setSelectedTrigger(trigger)
      setTriggerResult(null)

      if (trigger.trigger_type === 'http') {
        const config = trigger.config as { api_path?: string; http_method?: string }
        setHttpMethod(config.http_method || 'GET')
        const path = config.api_path || ''
        const matches = path.match(/:([a-zA-Z_]+)/g)
        if (matches) {
          const params: Record<string, string> = {}
          matches.forEach((m) => (params[m.slice(1)] = ''))
          setPathParams(params)
        } else {
          setPathParams({})
        }
        setQueryParams({})
        const method = config.http_method || 'GET'
        if (method === 'POST' || method === 'PUT') {
          setRequestBody('{\n  \n}')
        } else {
          setRequestBody('{}')
        }
      } else if (trigger.trigger_type === 'event') {
        setEventPayload('{"test": true}')
      }
    }
  }

  const invokeHttp = async (trigger: TriggerInfo) => {
    const config = trigger.config as { api_path?: string; http_method?: string }
    let path = (config.api_path || '').replace(/^\//, '')
    const method = httpMethod || config.http_method || 'GET'

    setInvoking(true)
    setTriggerResult(null)
    const startTime = Date.now()

    try {
      const pathParamMatches = path.match(/:([a-zA-Z_]+)/g)
      if (pathParamMatches) {
        for (const match of pathParamMatches) {
          const paramName = match.slice(1)
          const value = pathParams[paramName]
          if (!value) {
            setTriggerResult({ success: false, message: `Missing path parameter: ${paramName}` })
            setInvoking(false)
            return
          }
          path = path.replace(match, encodeURIComponent(value))
        }
      }

      const queryEntries = Object.entries(queryParams).filter(([_, v]) => v)
      const queryString =
        queryEntries.length > 0
          ? `?${queryEntries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')}`
          : ''

      const fetchOptions: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json' },
      }
      if (method !== 'GET' && method !== 'HEAD') {
        try {
          JSON.parse(requestBody)
          fetchOptions.body = requestBody
        } catch {
          setTriggerResult({ success: false, message: 'Invalid JSON in request body' })
          setInvoking(false)
          return
        }
      }

      const { engineHost, enginePort } = getConfig()
      const protocol = window.location.protocol
      const fullUrl = `${protocol}//${engineHost}:${enginePort}/${path}${queryString}`
      const response = await fetch(fullUrl, fetchOptions)
      const duration = Date.now() - startTime

      let data
      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        data = await response.json()
      } else {
        data = await response.text()
      }

      setTriggerResult({
        success: response.ok,
        message: response.ok ? 'Request successful' : `HTTP ${response.status}`,
        status: response.status,
        duration,
        data,
      })
    } catch (err) {
      setTriggerResult({
        success: false,
        message: err instanceof Error ? err.message : 'Request failed',
        duration: Date.now() - startTime,
      })
    } finally {
      setInvoking(false)
    }
  }

  const invokeCron = async (trigger: TriggerInfo) => {
    setInvoking(true)
    setTriggerResult(null)
    try {
      const result = await triggerCron(trigger.id, trigger.function_id)
      setTriggerResult({
        success: result.success,
        message: result.success
          ? 'Cron job triggered successfully!'
          : result.error || 'Failed to trigger',
      })
    } catch (err) {
      setTriggerResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to trigger',
      })
    } finally {
      setInvoking(false)
    }
  }

  const invokeEvent = async (trigger: TriggerInfo) => {
    const config = trigger.config as { topic?: string }
    const topic = config.topic || ''
    setInvoking(true)
    setTriggerResult(null)
    try {
      const payload = JSON.parse(eventPayload)
      const result = await emitEvent(topic, payload)
      setTriggerResult({
        success: result.success,
        message: result.success ? `Event emitted to "${topic}"!` : result.error || 'Failed to emit',
      })
    } catch {
      setTriggerResult({ success: false, message: 'Invalid JSON payload' })
    } finally {
      setInvoking(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 md:px-5 py-3 md:py-4 bg-dark-gray/30 border-b border-border">
        <div className="flex items-center gap-2 md:gap-4 flex-wrap">
          <h1 className="text-sm md:text-base font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4" />
            <span>Triggers</span>
          </h1>
          <Badge variant="success" className="gap-1 text-[10px] md:text-xs">
            <Activity className="w-2.5 h-2.5 md:w-3 md:h-3" />
            {userTriggers.length}
          </Badge>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2">
          <Button
            variant={showSystem ? 'accent' : 'ghost'}
            size="sm"
            onClick={() => setShowSystem(!showSystem)}
            className="h-6 md:h-7 text-[10px] md:text-xs px-2"
          >
            <span className={`hidden md:inline ${showSystem ? '' : 'line-through opacity-60'}`}>
              System
            </span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="h-7 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-2 p-2 border-b border-border bg-dark-gray/20">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9 h-9"
            placeholder="Search triggers, functions, paths, topics..."
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 px-2 border-l border-border">
          <button
            onClick={() => setFilterType(null)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium tracking-wider uppercase transition-colors ${
              !filterType
                ? 'bg-white/10 text-foreground'
                : 'text-muted hover:text-foreground hover:bg-white/5'
            }`}
          >
            All
            <span className="tabular-nums">
              {showSystem ? triggers.length : userTriggers.length}
            </span>
          </button>
          {typeCounts.http > 0 && (
            <button
              onClick={() => setFilterType(filterType === 'http' ? null : 'http')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium tracking-wider uppercase transition-colors ${
                filterType === 'http'
                  ? 'bg-cyan-500/15 text-cyan-400'
                  : 'text-muted hover:text-cyan-400 hover:bg-cyan-500/10'
              }`}
            >
              <Globe className="w-3 h-3" />
              <span className="hidden lg:inline">HTTP</span>
              <span className="tabular-nums">{typeCounts.http}</span>
            </button>
          )}
          {typeCounts.cron > 0 && (
            <button
              onClick={() => setFilterType(filterType === 'cron' ? null : 'cron')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium tracking-wider uppercase transition-colors ${
                filterType === 'cron'
                  ? 'bg-orange-500/15 text-orange-400'
                  : 'text-muted hover:text-orange-400 hover:bg-orange-500/10'
              }`}
            >
              <Calendar className="w-3 h-3" />
              <span className="hidden lg:inline">Cron</span>
              <span className="tabular-nums">{typeCounts.cron}</span>
            </button>
          )}
          {typeCounts.event > 0 && (
            <button
              onClick={() => setFilterType(filterType === 'event' ? null : 'event')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium tracking-wider uppercase transition-colors ${
                filterType === 'event'
                  ? 'bg-purple-500/15 text-purple-400'
                  : 'text-muted hover:text-purple-400 hover:bg-purple-500/10'
              }`}
            >
              <MessageSquare className="w-3 h-3" />
              <span className="hidden lg:inline">Event</span>
              <span className="tabular-nums">{typeCounts.event}</span>
            </button>
          )}
          {typeCounts.other > 0 && (
            <button
              onClick={() => setFilterType(filterType === 'other' ? null : 'other')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium tracking-wider uppercase transition-colors ${
                filterType === 'other'
                  ? 'bg-white/10 text-foreground'
                  : 'text-muted hover:text-foreground hover:bg-white/5'
              }`}
            >
              <Zap className="w-3 h-3" />
              <span className="hidden lg:inline">Other</span>
              <span className="tabular-nums">{typeCounts.other}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div
        className={`flex-1 flex overflow-hidden ${selectedTrigger ? 'divide-x divide-border' : ''}`}
      >
        {/* Trigger List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              Loading triggers...
            </div>
          ) : filteredTriggers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Zap className="w-12 h-12 text-muted/30 mb-4" />
              <div className="text-sm font-medium mb-1">No triggers found</div>
              <div className="text-xs text-muted">
                {searchQuery ? 'Try a different search term' : 'Register triggers using the SDK'}
              </div>
            </div>
          ) : (
            groups.map((group) => (
              <div key={group}>
                <button
                  onClick={() => toggleGroup(group)}
                  className="flex items-center gap-2 mb-3 cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <ChevronRight
                    className={`w-3 h-3 text-muted transition-transform duration-150 ${!collapsedGroups.has(group) ? 'rotate-90' : ''}`}
                  />
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                    {group}
                  </Badge>
                  <span className="text-[10px] text-muted">
                    {groupedTriggers[group].length} triggers
                  </span>
                </button>
                {!collapsedGroups.has(group) && (
                  <div className="space-y-1">
                    {groupedTriggers[group].map((trigger) => {
                      const isSelected = selectedTrigger?.id === trigger.id
                      const fn = getFunction(trigger.function_id)

                      return (
                        <div
                          key={trigger.id}
                          onClick={() => handleSelectTrigger(trigger)}
                          className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all
                            ${
                              isSelected
                                ? 'bg-primary/10 border border-primary/30 ring-1 ring-primary/20'
                                : 'bg-dark-gray/30 border border-transparent hover:bg-dark-gray/50 hover:border-border'
                            }
                          `}
                        >
                          <div className="shrink-0">{getTriggerIcon(trigger)}</div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-mono text-sm font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}
                              >
                                {getTriggerSummary(trigger)}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-[9px] uppercase ${getTriggerBadgeClass(trigger.trigger_type)}`}
                              >
                                {trigger.trigger_type}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted font-mono mt-0.5 flex items-center gap-1.5">
                              <span className="text-yellow">{trigger.function_id}</span>
                              {fn?.description && (
                                <span className="text-muted/60 truncate">- {fn.description}</span>
                              )}
                            </div>
                          </div>

                          <ChevronRight
                            className={`w-4 h-4 text-muted shrink-0 transition-transform ${isSelected ? 'rotate-90' : ''}`}
                          />
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Detail Panel */}
        {selectedTrigger && (
          <div
            className="
              fixed inset-0 z-50 md:relative md:inset-auto
              w-full md:w-[360px] lg:w-[480px] shrink-0
              flex flex-col h-full overflow-hidden bg-background md:bg-dark-gray/20 border-l border-border
            "
          >
            <div className="px-3 md:px-4 py-2 md:py-3 border-b border-border bg-dark-gray/30 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  {getTriggerIcon(selectedTrigger)}
                  <h2 className="font-medium text-xs md:text-sm truncate">
                    {getTriggerSummary(selectedTrigger)}
                  </h2>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => copyToClipboard(selectedTrigger.id, 'id')}
                    className="p-1.5 hover:bg-dark-gray rounded transition-colors"
                    title="Copy trigger ID"
                  >
                    {copied === 'id' ? (
                      <Check className="w-3.5 h-3.5 text-success" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-muted" />
                    )}
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedTrigger(null)}
                    className="h-7 w-7 md:h-6 md:w-6 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="text-[11px] text-muted leading-relaxed">
                Function: <span className="text-yellow">{selectedTrigger.function_id}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* HTTP Trigger Detail */}
              {selectedTrigger.trigger_type === 'http' &&
                (() => {
                  const config = selectedTrigger.config as {
                    api_path?: string
                    http_method?: string
                  }
                  const apiPath = (config.api_path || '').replace(/^\//, '')

                  return (
                    <>
                      <div>
                        <div className="text-[10px] text-muted uppercase tracking-wider mb-2">
                          API Endpoint
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-xs font-mono bg-black/40 text-cyan-400 px-3 py-2 rounded border border-cyan-500/20">
                            {httpMethod} {window.location.protocol}
                            {'//'}
                            {getConfig().engineHost}:{getConfig().enginePort}/{apiPath}
                          </code>
                          <button
                            onClick={() => {
                              const { engineHost, enginePort } = getConfig()
                              copyToClipboard(
                                `${window.location.protocol}//${engineHost}:${enginePort}/${apiPath}`,
                                'endpoint',
                              )
                            }}
                            className="p-1.5 hover:bg-dark-gray rounded transition-colors"
                          >
                            {copied === 'endpoint' ? (
                              <Check className="w-3.5 h-3.5 text-success" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-muted" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="border-t border-border pt-4">
                        <div className="text-[10px] text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                          <Terminal className="w-3 h-3" />
                          Test API
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Select
                              value={httpMethod}
                              onChange={(e) => setHttpMethod(e.target.value)}
                              className="w-24 h-8 text-xs"
                            >
                              <option value="GET">GET</option>
                              <option value="POST">POST</option>
                              <option value="PUT">PUT</option>
                              <option value="PATCH">PATCH</option>
                              <option value="DELETE">DELETE</option>
                            </Select>
                            <code className="flex-1 text-xs font-mono text-muted bg-black/30 px-2 py-1.5 rounded truncate">
                              /{apiPath}
                            </code>
                          </div>

                          {Object.keys(pathParams).length > 0 && (
                            <div className="space-y-2">
                              <div className="text-[10px] text-muted uppercase tracking-wider">
                                Path Parameters
                              </div>
                              {Object.keys(pathParams).map((param) => (
                                <div key={param} className="flex items-center gap-2">
                                  <label className="text-xs font-mono text-orange-400 w-20 shrink-0">
                                    :{param}
                                  </label>
                                  <Input
                                    value={pathParams[param]}
                                    onChange={(e) =>
                                      setPathParams((prev) => ({
                                        ...prev,
                                        [param]: e.target.value,
                                      }))
                                    }
                                    placeholder={`Enter ${param}`}
                                    className="h-8 text-xs font-mono"
                                  />
                                </div>
                              ))}
                            </div>
                          )}

                          {httpMethod === 'GET' && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="text-[10px] text-muted uppercase tracking-wider">
                                  Query Parameters
                                </div>
                                <button
                                  onClick={() =>
                                    setQueryParams((prev) => ({
                                      ...prev,
                                      [`param${Object.keys(prev).length + 1}`]: '',
                                    }))
                                  }
                                  className="text-[10px] text-cyan-400 hover:text-cyan-300"
                                >
                                  + Add
                                </button>
                              </div>
                              {Object.keys(queryParams).length === 0 ? (
                                <div className="text-[10px] text-muted italic">
                                  No query parameters
                                </div>
                              ) : (
                                Object.entries(queryParams).map(([key, value], idx) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <Input
                                      value={key}
                                      onChange={(e) => {
                                        const newParams = { ...queryParams }
                                        delete newParams[key]
                                        newParams[e.target.value] = value
                                        setQueryParams(newParams)
                                      }}
                                      placeholder="key"
                                      className="h-7 text-xs font-mono w-24"
                                    />
                                    <span className="text-muted">=</span>
                                    <Input
                                      value={value}
                                      onChange={(e) =>
                                        setQueryParams((prev) => ({
                                          ...prev,
                                          [key]: e.target.value,
                                        }))
                                      }
                                      placeholder="value"
                                      className="h-7 text-xs font-mono flex-1"
                                    />
                                    <button
                                      onClick={() => {
                                        const newParams = { ...queryParams }
                                        delete newParams[key]
                                        setQueryParams(newParams)
                                      }}
                                      className="p-1 text-muted hover:text-error"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>
                          )}

                          {(httpMethod === 'POST' ||
                            httpMethod === 'PUT' ||
                            httpMethod === 'PATCH') && (
                            <div>
                              <div className="text-[10px] text-muted uppercase tracking-wider mb-1.5">
                                Request Body (JSON)
                              </div>
                              <textarea
                                value={requestBody}
                                onChange={(e) => setRequestBody(e.target.value)}
                                className="w-full h-24 text-xs font-mono bg-black/40 text-foreground px-3 py-2 rounded border border-border focus:border-primary focus:outline-none resize-none"
                                placeholder='{"key": "value"}'
                              />
                            </div>
                          )}

                          <Button
                            onClick={() => invokeHttp(selectedTrigger)}
                            disabled={invoking}
                            className="w-full h-9"
                          >
                            {invoking ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Send className="w-3.5 h-3.5 mr-2" />
                                Send Request
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </>
                  )
                })()}

              {/* Cron Trigger Detail */}
              {selectedTrigger.trigger_type === 'cron' &&
                (() => {
                  const config = selectedTrigger.config as {
                    expression?: string
                    description?: string
                  }
                  const expression = config.expression || ''
                  const { readable, nextRun } = parseCronExpression(expression)

                  return (
                    <>
                      <div>
                        <div className="text-[10px] text-muted uppercase tracking-wider mb-2">
                          Schedule
                        </div>
                        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-orange-400" />
                            <span className="text-sm font-medium text-orange-400">{readable}</span>
                          </div>
                          <code className="text-xs font-mono text-orange-400/70 block">
                            {expression}
                          </code>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-dark-gray/50 rounded-lg p-3">
                          <div className="text-[10px] text-muted uppercase tracking-wider mb-1">
                            Next Run
                          </div>
                          <div className="flex items-center gap-1.5 text-sm">
                            <Clock className="w-3.5 h-3.5 text-orange-400" />
                            <span className="text-foreground">{nextRun}</span>
                          </div>
                        </div>
                        <div className="bg-dark-gray/50 rounded-lg p-3">
                          <div className="text-[10px] text-muted uppercase tracking-wider mb-1">
                            Status
                          </div>
                          <div className="flex items-center gap-1.5 text-sm">
                            <Activity className="w-3.5 h-3.5 text-success" />
                            <span className="text-success">Active</span>
                          </div>
                        </div>
                      </div>

                      {config.description && (
                        <div>
                          <div className="text-[10px] text-muted uppercase tracking-wider mb-2">
                            Description
                          </div>
                          <p className="text-xs text-muted">{config.description}</p>
                        </div>
                      )}

                      <div className="border-t border-border pt-4">
                        <div className="text-[10px] text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                          <Play className="w-3 h-3" />
                          Manual Trigger
                        </div>
                        <Button
                          className="w-full h-9"
                          disabled={invoking}
                          onClick={() => invokeCron(selectedTrigger)}
                        >
                          {invoking ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                              Running...
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 mr-2" />
                              Run Now
                            </>
                          )}
                        </Button>
                      </div>
                    </>
                  )
                })()}

              {/* Event Trigger Detail */}
              {selectedTrigger.trigger_type === 'event' &&
                (() => {
                  const config = selectedTrigger.config as { topic?: string; description?: string }
                  const topic = config.topic || 'Unknown'

                  return (
                    <>
                      <div>
                        <div className="text-[10px] text-muted uppercase tracking-wider mb-2">
                          Event Topic
                        </div>
                        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-purple-400" />
                            <code className="text-sm font-mono text-purple-400">{topic}</code>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-dark-gray/50 rounded-lg p-3">
                          <div className="text-[10px] text-muted uppercase tracking-wider mb-1">
                            Type
                          </div>
                          <div className="flex items-center gap-1.5 text-sm">
                            <Zap className="w-3.5 h-3.5 text-purple-400" />
                            <span className="text-foreground">Subscriber</span>
                          </div>
                        </div>
                        <div className="bg-dark-gray/50 rounded-lg p-3">
                          <div className="text-[10px] text-muted uppercase tracking-wider mb-1">
                            Status
                          </div>
                          <div className="flex items-center gap-1.5 text-sm">
                            <Activity className="w-3.5 h-3.5 text-success" />
                            <span className="text-success">Listening</span>
                          </div>
                        </div>
                      </div>

                      {config.description && (
                        <div>
                          <div className="text-[10px] text-muted uppercase tracking-wider mb-2">
                            Description
                          </div>
                          <p className="text-xs text-muted">{config.description}</p>
                        </div>
                      )}

                      <div className="border-t border-border pt-4">
                        <div className="text-[10px] text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                          <Send className="w-3 h-3" />
                          Emit Test Event
                        </div>
                        <div className="space-y-2">
                          <textarea
                            className="w-full h-24 text-xs font-mono bg-black/40 text-foreground px-3 py-2 rounded border border-border focus:border-primary focus:outline-none resize-none"
                            placeholder='{"test": "data"}'
                            value={eventPayload}
                            onChange={(e) => setEventPayload(e.target.value)}
                          />
                          <Button
                            className="w-full h-9"
                            disabled={invoking}
                            onClick={() => invokeEvent(selectedTrigger)}
                          >
                            {invoking ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                                Emitting...
                              </>
                            ) : (
                              <>
                                <Send className="w-3.5 h-3.5 mr-2" />
                                Emit Event
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </>
                  )
                })()}

              {/* Other trigger types - show config */}
              {!['http', 'cron', 'event'].includes(selectedTrigger.trigger_type) && (
                <div>
                  <div className="text-[10px] text-muted uppercase tracking-wider mb-2">
                    Trigger Info
                  </div>
                  <div className="bg-dark-gray/50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-muted" />
                      <span className="text-sm font-medium">{selectedTrigger.trigger_type}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Result display */}
              {triggerResult && (
                <div
                  className={`border rounded-lg overflow-hidden ${
                    triggerResult.success
                      ? 'border-success/30 bg-success/5'
                      : 'border-error/30 bg-error/5'
                  }`}
                >
                  <div
                    className={`flex items-center justify-between px-3 py-2 border-b ${
                      triggerResult.success ? 'border-success/20' : 'border-error/20'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {triggerResult.success ? (
                        <CheckCircle className="w-3.5 h-3.5 text-success" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-error" />
                      )}
                      <span
                        className={`text-xs font-medium ${triggerResult.success ? 'text-success' : 'text-error'}`}
                      >
                        {triggerResult.status || (triggerResult.success ? 'Success' : 'Error')}
                      </span>
                    </div>
                    {triggerResult.duration && (
                      <span className="text-[10px] text-muted">{triggerResult.duration}ms</span>
                    )}
                  </div>
                  <div className="p-3 overflow-x-auto max-h-48 overflow-y-auto">
                    {triggerResult.data ? (
                      <JsonViewer data={triggerResult.data} collapsed={false} maxDepth={4} />
                    ) : (
                      <span className="text-[11px] font-mono text-muted">
                        {triggerResult.message}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Raw Configuration */}
              <div>
                <div className="text-[10px] text-muted uppercase tracking-wider mb-2">
                  Configuration
                </div>
                <pre className="text-[10px] font-mono bg-black/40 px-3 py-2 rounded overflow-x-auto max-h-32 text-muted">
                  {JSON.stringify(selectedTrigger.config, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
