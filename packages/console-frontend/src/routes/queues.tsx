import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { AlertTriangle, Inbox, Loader2, RefreshCw, Search, SkullIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { DlqEntry, JobState, QueueInfo, QueueJob } from '@/api'
import { redriveQueue } from '@/api'
import { queueJobsQuery, queuesQuery } from '@/api/queries'
import { Badge, Button, Input } from '@/components/ui/card'
import { JsonViewer } from '@/components/ui/json-viewer'
import { Pagination } from '@/components/ui/pagination'

export const Route = createFileRoute('/queues')({
  component: QueuesPage,
  loader: ({ context: { queryClient } }) => {
    void queryClient.prefetchQuery(queuesQuery)
  },
})

type ViewMode = 'queues' | 'dlq'

const QUEUE_TABS: { key: JobState; label: string }[] = [
  { key: 'waiting', label: 'Waiting' },
  { key: 'active', label: 'Active' },
  { key: 'delayed', label: 'Delayed' },
]

function formatTimestamp(ts: number): string {
  if (!ts) return '-'
  const d = new Date(ts)
  return d.toLocaleString()
}

function truncateId(id: string, len = 12): string {
  if (!id) return '-'
  return id.length > len ? `${id.slice(0, len)}...` : id
}

function QueuesPage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedQueue, setSelectedQueue] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('queues')
  const [activeTab, setActiveTab] = useState<JobState>('waiting')
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)
  const [redriveConfirm, setRedriveConfirm] = useState(false)

  const { data: queuesData, isLoading: loadingQueues } = useQuery(queuesQuery)
  const queues = queuesData?.queues || []

  const currentJobState: JobState = viewMode === 'dlq' ? 'dlq' : activeTab
  const offset = (page - 1) * pageSize

  const {
    data: jobsData,
    isLoading: loadingJobs,
    refetch: refetchJobs,
  } = useQuery({
    ...queueJobsQuery(selectedQueue || '', currentJobState, offset, pageSize),
    enabled: !!selectedQueue,
  })

  const jobs = jobsData?.jobs || []

  const [redriveError, setRedriveError] = useState<string | null>(null)

  const redriveMutation = useMutation({
    mutationFn: (queue: string) => redriveQueue(queue),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queues'] })
      if (selectedQueue) {
        queryClient.invalidateQueries({
          queryKey: ['queue-jobs', selectedQueue],
        })
      }
      setRedriveConfirm(false)
      setRedriveError(null)
    },
    onError: (err: Error) => {
      setRedriveError(err.message || 'Redrive failed')
    },
  })

  const filteredQueues = useMemo(
    () =>
      queues.filter(
        (q: QueueInfo) => !searchQuery || q.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [queues, searchQuery],
  )

  const queuesWithDlq = useMemo(
    () => filteredQueues.filter((q: QueueInfo) => q.dlq > 0),
    [filteredQueues],
  )

  const totalDlqCount = useMemo(
    () => queues.reduce((sum: number, q: QueueInfo) => sum + q.dlq, 0),
    [queues],
  )

  useEffect(() => {
    if (queues.length > 0 && !selectedQueue) {
      setSelectedQueue(queues[0].name)
    }
  }, [queues, selectedQueue])

  const handleSelectQueue = (name: string, mode: ViewMode) => {
    setSelectedQueue(name)
    setViewMode(mode)
    setSelectedJobId(null)
    setPage(1)
    if (mode === 'queues') setActiveTab('waiting')
    setRedriveConfirm(false)
    setShowMobileSidebar(false)
  }

  const handleTabChange = (tab: JobState) => {
    setActiveTab(tab)
    setPage(1)
    setSelectedJobId(null)
  }

  const selectedQueueInfo = queues.find((q: QueueInfo) => q.name === selectedQueue)

  const getCountForTab = (tab: JobState): number => {
    if (!selectedQueueInfo) return 0
    return selectedQueueInfo[tab] ?? 0
  }

  const currentCount = getCountForTab(currentJobState)

  const selectedJob = useMemo(() => {
    if (!selectedJobId || jobs.length === 0) return null
    const isDlq = viewMode === 'dlq'
    return (
      jobs.find((j) => {
        const jobData: QueueJob = isDlq ? (j as DlqEntry).job : (j as QueueJob)
        return jobData?.id === selectedJobId
      }) ?? null
    )
  }, [selectedJobId, jobs, viewMode])

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 grid grid-cols-1 md:grid-cols-[240px_1fr] lg:grid-cols-[280px_1fr_320px] gap-0 overflow-hidden">
        {/* Left sidebar */}
        <div className="hidden md:flex flex-col border-r border-[#1D1D1D] overflow-hidden">
          <div className="p-3 border-b border-[#1D1D1D]">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5B5B5B]" />
              <Input
                placeholder="Search queues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-[10px]"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingQueues ? (
              <div className="flex items-center justify-center py-8 text-muted">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            ) : filteredQueues.length === 0 ? (
              <div className="p-4 text-center text-[10px] text-[#5B5B5B] uppercase tracking-wider">
                No queues found
              </div>
            ) : (
              <>
                <div className="px-3 pt-3 pb-1.5">
                  <span className="text-[9px] font-medium tracking-[0.15em] uppercase text-[#5B5B5B]">
                    Queues
                  </span>
                </div>
                {filteredQueues.map((q: QueueInfo) => (
                  <button
                    type="button"
                    key={`queue-${q.name}`}
                    onClick={() => handleSelectQueue(q.name, 'queues')}
                    className={`w-full text-left px-3 py-2 border-b border-[#1D1D1D]/50 transition-colors ${
                      selectedQueue === q.name && viewMode === 'queues'
                        ? 'bg-white/[0.05]'
                        : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono truncate">{q.name}</span>
                      <div className="flex items-center gap-1.5">
                        {q.waiting > 0 && <Badge variant="default">{q.waiting}</Badge>}
                        {q.active > 0 && (
                          <Badge variant="default">
                            <Loader2 className="w-2.5 h-2.5 animate-spin mr-0.5" />
                            {q.active}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))}

                <div className="px-3 pt-4 pb-1.5 flex items-center justify-between">
                  <span className="text-[9px] font-medium tracking-[0.15em] uppercase text-[#EF4444]/70">
                    Dead Letter
                  </span>
                  {totalDlqCount > 0 && <Badge variant="error">{totalDlqCount}</Badge>}
                </div>
                {queuesWithDlq.length === 0 ? (
                  <div className="px-3 py-3 text-[10px] text-[#5B5B5B]/50 italic">
                    No failed jobs
                  </div>
                ) : (
                  queuesWithDlq.map((q: QueueInfo) => (
                    <button
                      type="button"
                      key={`dlq-${q.name}`}
                      onClick={() => handleSelectQueue(q.name, 'dlq')}
                      className={`w-full text-left px-3 py-2 border-b border-[#1D1D1D]/50 transition-colors ${
                        selectedQueue === q.name && viewMode === 'dlq'
                          ? 'bg-[#EF4444]/[0.08]'
                          : 'hover:bg-[#EF4444]/[0.03]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="w-3 h-3 text-[#EF4444]/50" />
                          <span className="text-xs font-mono truncate text-[#EF4444]/80">
                            {q.name}
                          </span>
                        </div>
                        <Badge variant="error">{q.dlq}</Badge>
                      </div>
                    </button>
                  ))
                )}
              </>
            )}
          </div>
        </div>

        {/* Center - Jobs table */}
        <div className="flex flex-col overflow-hidden">
          {selectedQueue ? (
            <>
              <div
                className={`px-4 py-3 border-b flex items-center justify-between ${
                  viewMode === 'dlq'
                    ? 'border-[#EF4444]/20 bg-[#EF4444]/[0.03]'
                    : 'border-[#1D1D1D]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="md:hidden p-1.5 rounded hover:bg-[#1D1D1D]"
                    onClick={() => setShowMobileSidebar(!showMobileSidebar)}
                  >
                    <Inbox className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-2">
                    {viewMode === 'dlq' && <SkullIcon className="w-4 h-4 text-[#EF4444]" />}
                    <div>
                      <h2
                        className={`text-sm font-mono font-medium ${viewMode === 'dlq' ? 'text-[#EF4444]' : ''}`}
                      >
                        {selectedQueue}
                        {viewMode === 'dlq' && (
                          <span className="text-[10px] text-[#EF4444]/60 ml-2">DLQ</span>
                        )}
                      </h2>
                      {selectedQueueInfo && (
                        <span className="text-[10px] text-[#5B5B5B] tracking-wider uppercase">
                          {viewMode === 'dlq'
                            ? `${selectedQueueInfo.dlq} failed jobs`
                            : `${selectedQueueInfo.total} total jobs`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {viewMode === 'dlq' &&
                    selectedQueueInfo &&
                    selectedQueueInfo.dlq > 0 &&
                    (redriveConfirm ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#5B5B5B]">
                          Redrive all back to queue?
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRedriveConfirm(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={redriveMutation.isPending}
                          onClick={() => redriveMutation.mutate(selectedQueue)}
                        >
                          {redriveMutation.isPending ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            'Confirm Redrive'
                          )}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRedriveConfirm(true)}
                        className="border-[#EF4444]/30 text-[#EF4444] hover:bg-[#EF4444]/10"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Redrive All
                      </Button>
                    ))}
                  {redriveError && (
                    <span className="text-[10px] text-[#EF4444]">{redriveError}</span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      queryClient.invalidateQueries({ queryKey: ['queues'] })
                      refetchJobs()
                    }}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {viewMode === 'queues' && (
                <div className="flex border-b border-[#1D1D1D] px-4">
                  {QUEUE_TABS.map((tab) => {
                    const count = getCountForTab(tab.key)
                    return (
                      <button
                        type="button"
                        key={tab.key}
                        onClick={() => handleTabChange(tab.key)}
                        className={`flex items-center gap-2 px-3 py-2.5 text-[10px] tracking-wider uppercase border-b-2 transition-colors ${
                          activeTab === tab.key
                            ? 'border-white text-white'
                            : 'border-transparent text-[#5B5B5B] hover:text-[#F4F4F4]'
                        }`}
                      >
                        {tab.label}
                        {count > 0 && <Badge variant="default">{count}</Badge>}
                      </button>
                    )
                  })}
                </div>
              )}

              <div className="flex-1 overflow-y-auto">
                {loadingJobs ? (
                  <div className="flex items-center justify-center py-12 text-muted">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                ) : jobs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-[#5B5B5B]">
                    {viewMode === 'dlq' ? (
                      <AlertTriangle className="w-8 h-8 mb-2 opacity-30" />
                    ) : (
                      <Inbox className="w-8 h-8 mb-2 opacity-30" />
                    )}
                    <span className="text-[10px] uppercase tracking-wider">
                      {viewMode === 'dlq' ? 'No failed jobs' : `No ${activeTab} jobs`}
                    </span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="border-b border-[#1D1D1D]">
                        <tr>
                          <th className="text-left py-3 px-4 text-[10px] font-medium tracking-wider uppercase text-[#5B5B5B]">
                            {viewMode === 'dlq' ? 'Job ID' : 'ID'}
                          </th>
                          <th className="text-left py-3 px-4 text-[10px] font-medium tracking-wider uppercase text-[#5B5B5B]">
                            Data
                          </th>
                          <th className="text-left py-3 px-4 text-[10px] font-medium tracking-wider uppercase text-[#5B5B5B]">
                            {viewMode === 'dlq' ? 'Error' : 'Attempts'}
                          </th>
                          <th className="text-left py-3 px-4 text-[10px] font-medium tracking-wider uppercase text-[#5B5B5B]">
                            {viewMode === 'dlq'
                              ? 'Failed At'
                              : activeTab === 'delayed'
                                ? 'Process At'
                                : 'Created'}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {jobs.map((job: QueueJob | DlqEntry, idx: number) => {
                          const isDlq = viewMode === 'dlq'
                          const dlqEntry = isDlq ? (job as DlqEntry) : null
                          const jobData: QueueJob = isDlq
                            ? (job as DlqEntry).job
                            : (job as QueueJob)
                          const jobId = jobData?.id || `job-${idx}`

                          return (
                            <tr
                              key={jobId}
                              onClick={() => setSelectedJobId(jobId)}
                              className={`border-b border-[#1D1D1D] transition-colors cursor-pointer ${
                                selectedJobId === jobId
                                  ? 'bg-white/[0.05]'
                                  : 'hover:bg-white/[0.02]'
                              }`}
                            >
                              <td className="py-3 px-4 font-mono text-[11px]">
                                {truncateId(jobId)}
                              </td>
                              <td className="py-3 px-4 max-w-[200px]">
                                <span className="text-[#5B5B5B] truncate block text-[11px]">
                                  {JSON.stringify(jobData?.data || '').slice(0, 60)}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                {isDlq ? (
                                  <span className="text-[#EF4444] text-[11px] truncate block max-w-[150px]">
                                    {dlqEntry?.error || 'Unknown error'}
                                  </span>
                                ) : (
                                  <span className="text-[11px]">
                                    {String(jobData?.attempts_made || 0)}/
                                    {String(jobData?.max_attempts || '-')}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-[#5B5B5B] text-[11px]">
                                {formatTimestamp(
                                  isDlq
                                    ? (dlqEntry?.failed_at as number)
                                    : activeTab === 'delayed'
                                      ? (jobData?.process_at as number)
                                      : (jobData?.created_at as number),
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {jobs.length > 0 && (
                <div className="border-t border-[#1D1D1D] px-4 py-2">
                  <Pagination
                    currentPage={page}
                    totalPages={Math.max(1, Math.ceil(currentCount / pageSize))}
                    totalItems={currentCount}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    onPageSizeChange={(size) => {
                      setPageSize(size)
                      setPage(1)
                    }}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-[#5B5B5B]">
              <Inbox className="w-10 h-10 mb-3 opacity-20" />
              <span className="text-xs uppercase tracking-wider">
                {loadingQueues ? 'Loading queues...' : 'No queues available'}
              </span>
            </div>
          )}
        </div>

        {/* Right panel - Job detail */}
        {selectedJob && (
          <div className="hidden lg:flex flex-col border-l border-[#1D1D1D] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1D1D1D] flex items-center justify-between">
              <span className="text-[10px] tracking-wider uppercase text-[#5B5B5B]">
                Job Detail
              </span>
              <button
                type="button"
                onClick={() => setSelectedJobId(null)}
                className="text-[#5B5B5B] hover:text-white transition-colors text-xs"
              >
                &times;
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <JobDetailPanel job={selectedJob as QueueJob | DlqEntry} isDlq={viewMode === 'dlq'} />
            </div>
          </div>
        )}
      </div>

      {showMobileSidebar && (
        <>
          <div
            role="presentation"
            className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowMobileSidebar(false)}
          />
          <div className="md:hidden fixed left-0 top-0 bottom-0 w-64 z-50 bg-black border-r border-[#1D1D1D] flex flex-col">
            <div className="p-3 border-b border-[#1D1D1D] flex items-center justify-between">
              <span className="text-xs tracking-wider uppercase">Queues</span>
              <button
                type="button"
                onClick={() => setShowMobileSidebar(false)}
                className="text-[#5B5B5B]"
              >
                &times;
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredQueues.map((q: QueueInfo) => (
                <button
                  type="button"
                  key={q.name}
                  onClick={() => handleSelectQueue(q.name, 'queues')}
                  className={`w-full text-left px-3 py-2.5 border-b border-[#1D1D1D] text-xs font-mono ${
                    selectedQueue === q.name && viewMode === 'queues' ? 'bg-white/[0.05]' : ''
                  }`}
                >
                  {q.name}
                </button>
              ))}
              {queuesWithDlq.length > 0 && (
                <>
                  <div className="px-3 pt-3 pb-1.5">
                    <span className="text-[9px] font-medium tracking-[0.15em] uppercase text-[#EF4444]/70">
                      Dead Letter
                    </span>
                  </div>
                  {queuesWithDlq.map((q: QueueInfo) => (
                    <button
                      type="button"
                      key={`dlq-mobile-${q.name}`}
                      onClick={() => handleSelectQueue(q.name, 'dlq')}
                      className={`w-full text-left px-3 py-2.5 border-b border-[#1D1D1D] text-xs font-mono text-[#EF4444]/80 ${
                        selectedQueue === q.name && viewMode === 'dlq' ? 'bg-[#EF4444]/[0.08]' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{q.name}</span>
                        <Badge variant="error">{q.dlq}</Badge>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function JobDetailPanel({ job, isDlq }: { job: QueueJob | DlqEntry; isDlq: boolean }) {
  const dlqEntry = isDlq ? (job as DlqEntry) : null
  const jobData: QueueJob = isDlq ? (job as DlqEntry).job : (job as QueueJob)

  if (!jobData) return null

  return (
    <>
      <div className="space-y-2">
        <h4 className="text-[10px] tracking-wider uppercase text-[#5B5B5B]">Metadata</h4>
        <dl className="space-y-1.5 text-[11px]">
          <div className="flex justify-between">
            <dt className="text-[#5B5B5B]">ID</dt>
            <dd className="font-mono">{jobData.id || '-'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[#5B5B5B]">Queue</dt>
            <dd className="font-mono">{jobData.queue || '-'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[#5B5B5B]">Attempts</dt>
            <dd>
              {jobData.attempts_made || 0} / {jobData.max_attempts || '-'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[#5B5B5B]">Backoff</dt>
            <dd>{jobData.backoff_delay_ms || 0}ms</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[#5B5B5B]">Created</dt>
            <dd>{formatTimestamp(jobData.created_at)}</dd>
          </div>
          {jobData.process_at && (
            <div className="flex justify-between">
              <dt className="text-[#5B5B5B]">Process At</dt>
              <dd>{formatTimestamp(jobData.process_at)}</dd>
            </div>
          )}
          {jobData.group_id && (
            <div className="flex justify-between">
              <dt className="text-[#5B5B5B]">Group</dt>
              <dd className="font-mono">{jobData.group_id}</dd>
            </div>
          )}
        </dl>
      </div>

      {isDlq && dlqEntry && (
        <div className="space-y-2">
          <h4 className="text-[10px] tracking-wider uppercase text-[#EF4444]">Error</h4>
          <div className="bg-[#EF4444]/10 border border-[#EF4444]/20 rounded p-3">
            <p className="text-[11px] text-[#EF4444] break-words">
              {dlqEntry.error || 'Unknown error'}
            </p>
            <p className="text-[10px] text-[#5B5B5B] mt-1">
              Failed at: {formatTimestamp(dlqEntry.failed_at)}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h4 className="text-[10px] tracking-wider uppercase text-[#5B5B5B]">Payload</h4>
        <div className="bg-[#0A0A0A] border border-[#1D1D1D] rounded p-3 overflow-x-auto">
          <JsonViewer data={jobData.data} maxDepth={5} />
        </div>
      </div>
    </>
  )
}
