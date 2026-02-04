import { DEVTOOLS_API, MANAGEMENT_API } from './config'

interface WrappedResponse<T> {
  status_code: number
  headers: [string, string][]
  body: T
}

async function unwrapResponse<T>(res: Response): Promise<T> {
  const data = await res.json()

  if (data && typeof data === 'object' && 'status_code' in data && 'body' in data) {
    const wrapped = data as WrappedResponse<T>
    if (wrapped.status_code !== 200) {
      throw new Error(`API Error: ${JSON.stringify(wrapped.body)}`)
    }
    return wrapped.body
  }

  return data as T
}

export async function fetchWithFallback<T>(
  devtoolsPath: string,
  managementPath: string,
  options?: RequestInit,
): Promise<T> {
  try {
    const res = await fetch(`${DEVTOOLS_API}${devtoolsPath}`, options)
    if (res.ok) {
      return await unwrapResponse<T>(res)
    }
  } catch {
    // Fall through to management API
  }

  const res = await fetch(`${MANAGEMENT_API}${managementPath}`, options)
  if (!res.ok) throw new Error(`Failed to fetch from ${managementPath}`)
  return await unwrapResponse<T>(res)
}

export type { WrappedResponse }
export { unwrapResponse }
