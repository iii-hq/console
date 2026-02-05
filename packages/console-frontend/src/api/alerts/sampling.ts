import { DEVTOOLS_API, MANAGEMENT_API } from '../config'
import { unwrapResponse } from '../utils'

// ============================================================================
// Sampling Rules Types (engine.sampling.*)
// ============================================================================

export interface SamplingRule {
  name: string
  pattern: string
  ratio: number
  priority: number
}

export interface SamplingRulesResponse {
  traces: {
    default_ratio: number
    rules: SamplingRule[]
    parent_based: boolean
  }
  logs: {
    sampling_ratio: number
  }
  timestamp: number
}

// ============================================================================
// Sampling Rules Function (engine.sampling.*)
// ============================================================================

export async function fetchSamplingRules(): Promise<SamplingRulesResponse> {
  try {
    const res = await fetch(`${DEVTOOLS_API}/sampling/rules`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
    if (res.ok) {
      return unwrapResponse<SamplingRulesResponse>(res)
    }
  } catch {
    // Fall through to management API
  }

  const res = await fetch(`${MANAGEMENT_API}/sampling/rules`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error('Failed to fetch sampling rules')
  return res.json()
}
