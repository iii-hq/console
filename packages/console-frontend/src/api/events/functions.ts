import { DEVTOOLS_API, MANAGEMENT_API } from '../config'
import { unwrapResponse } from '../utils'

// ============================================================================
// Types
// ============================================================================

export interface FunctionInfo {
  function_path: string
  description: string | null
  metadata: Record<string, unknown> | null
  request_format: unknown | null
  response_format: unknown | null
  internal?: boolean
}

export interface TriggerInfo {
  id: string
  trigger_type: string
  function_path: string
  config: Record<string, unknown>
  internal?: boolean
}

export interface TriggerTypeInfo {
  id: string
  description: string
}

export interface EventsInfo {
  topic: string
  stream: string
  description: string
}

// ============================================================================
// Functions
// ============================================================================

export async function fetchFunctions(): Promise<{ functions: FunctionInfo[]; count: number }> {
  const res = await fetch(`${DEVTOOLS_API}/functions`)
  if (!res.ok) throw new Error('Failed to fetch functions')
  const data = await unwrapResponse<{ functions: FunctionInfo[] }>(res)
  return {
    functions: data.functions || [],
    count: (data.functions || []).length,
  }
}

export async function fetchTriggers(): Promise<{ triggers: TriggerInfo[]; count: number }> {
  try {
    const res = await fetch(`${DEVTOOLS_API}/triggers`)
    if (res.ok) {
      const data = await unwrapResponse<{ triggers: TriggerInfo[] }>(res)
      return {
        triggers: data.triggers || [],
        count: (data.triggers || []).length,
      }
    }
  } catch {
    // Fall through to management API
  }

  const res = await fetch(`${MANAGEMENT_API}/triggers`)
  if (!res.ok) throw new Error('Failed to fetch triggers')
  const data = await res.json()
  return {
    triggers: data.triggers || [],
    count: (data.triggers || []).length,
  }
}

export async function fetchTriggerTypes(): Promise<{
  trigger_types: string[]
  count: number
}> {
  const res = await fetch(`${DEVTOOLS_API}/trigger-types`)
  if (!res.ok) throw new Error('Failed to fetch trigger types')
  const data = await unwrapResponse<{ trigger_types: string[] }>(res)
  return {
    trigger_types: data.trigger_types || [],
    count: (data.trigger_types || []).length,
  }
}

export async function fetchEventsInfo(): Promise<EventsInfo> {
  const res = await fetch(`${DEVTOOLS_API}/events`)
  if (!res.ok) throw new Error('Failed to fetch events info')
  return unwrapResponse(res)
}
