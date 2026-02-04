import { DEVTOOLS_API } from '../config'

export async function invokeFunction(
  functionPath: string,
  input?: unknown,
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const res = await fetch(`${DEVTOOLS_API}/invoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ function_path: functionPath, input: input || {} }),
    })

    if (res.ok) {
      const data = await res.json()
      return { success: true, data }
    } else {
      const error = await res.text()
      return { success: false, error: error || 'Invocation failed' }
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error' }
  }
}

export async function emitEvent(
  topic: string,
  data: unknown,
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${DEVTOOLS_API}/emit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, data }),
    })

    if (res.ok) {
      return { success: true }
    } else {
      const error = await res.text()
      if (res.status === 404) {
        return {
          success: false,
          error: 'Event emit endpoint not available. Add /_console/emit to DevTools module.',
        }
      }
      return { success: false, error: error || 'Emit failed' }
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error' }
  }
}

export async function triggerCron(
  triggerId: string,
  functionPath?: string,
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const res = await fetch(`${DEVTOOLS_API}/cron/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trigger_id: triggerId, function_path: functionPath }),
    })

    if (res.ok) {
      const data = await res.json()
      return { success: true, data }
    } else {
      if (res.status === 404) {
        return {
          success: false,
          error:
            'Cron trigger endpoint not available. Add /_console/cron/trigger to DevTools module.',
        }
      }
      const error = await res.text()
      return { success: false, error: error || 'Trigger failed' }
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error' }
  }
}
