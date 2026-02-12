import { getDevtoolsApi } from '../config'
import { unwrapResponse } from '../utils'

export type JobState = 'waiting' | 'active' | 'delayed' | 'dlq'

export interface QueueInfo {
  name: string
  waiting: number
  active: number
  delayed: number
  dlq: number
  total: number
}

export interface QueueJob {
  id: string
  queue: string
  data: unknown
  attempts_made: number
  max_attempts: number
  backoff_delay_ms: number
  created_at: number
  process_at?: number
  group_id?: string
}

export interface DlqEntry {
  job: QueueJob
  error: string
  failed_at: number
}

export async function fetchQueues(): Promise<{ queues: QueueInfo[] }> {
  const res = await fetch(`${getDevtoolsApi()}/queues`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error('Failed to fetch queues')
  const data = await unwrapResponse<{ queues: QueueInfo[] }>(res)
  return { queues: data.queues || [] }
}

export async function fetchQueueStats(queue: string): Promise<QueueInfo> {
  const res = await fetch(`${getDevtoolsApi()}/queues/stats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ queue }),
  })
  if (!res.ok) throw new Error('Failed to fetch queue stats')
  return await unwrapResponse<QueueInfo>(res)
}

export async function fetchQueueJobs(
  queue: string,
  state: JobState,
  offset: number,
  limit: number,
): Promise<{ jobs: unknown[]; count: number; offset: number; limit: number }> {
  const res = await fetch(`${getDevtoolsApi()}/queues/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ queue, state, offset, limit }),
  })
  if (!res.ok) throw new Error('Failed to fetch queue jobs')
  return await unwrapResponse<{ jobs: unknown[]; count: number; offset: number; limit: number }>(
    res,
  )
}

export async function fetchQueueJob(queue: string, jobId: string): Promise<QueueJob | null> {
  const res = await fetch(`${getDevtoolsApi()}/queues/job`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ queue, job_id: jobId }),
  })
  if (!res.ok) return null
  return await unwrapResponse<QueueJob>(res)
}

export async function redriveQueue(queue: string): Promise<void> {
  const res = await fetch(`${getDevtoolsApi()}/queues/redrive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ queue }),
  })
  if (!res.ok) throw new Error('Failed to redrive queue')
}
