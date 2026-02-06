import { createContext, useContext, useEffect, useState } from 'react'
import type { ConsoleConfig } from './config'
import { setConfig } from './config'

const ConfigContext = createContext<ConsoleConfig | null>(null)

export function useConfig(): ConsoleConfig {
  const config = useContext(ConfigContext)
  if (!config) {
    throw new Error('useConfig must be used within a ConfigProvider')
  }
  return config
}

interface ConfigProviderProps {
  children: React.ReactNode
}

export function ConfigProvider({ children }: ConfigProviderProps) {
  const [config, setConfigState] = useState<ConsoleConfig | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const doFetch = async () => {
      setError(null)
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 5000)

        const res = await fetch('/api/config', {
          signal: controller.signal,
        })
        clearTimeout(timeout)

        if (!res.ok) {
          throw new Error(`Config fetch failed: ${res.status}`)
        }

        const data: ConsoleConfig = await res.json()
        if (!cancelled) {
          setConfig(data)
          setConfigState(data)
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load configuration'
          setError(message)
        }
      }
    }

    doFetch()
    return () => {
      cancelled = true
    }
  }, [])

  // Auto-retry on error
  useEffect(() => {
    if (!error) return

    let cancelled = false
    const controller = new AbortController()
    let timeout: ReturnType<typeof setTimeout> | undefined

    const timer = setTimeout(() => {
      if (cancelled) return
      setError(null)
      timeout = setTimeout(() => controller.abort(), 5000)

      fetch('/api/config', { signal: controller.signal })
        .then((res) => {
          clearTimeout(timeout)
          if (!res.ok) throw new Error(`Config fetch failed: ${res.status}`)
          return res.json()
        })
        .then((data: ConsoleConfig) => {
          if (!cancelled) {
            setConfig(data)
            setConfigState(data)
          }
        })
        .catch((err) => {
          clearTimeout(timeout)
          if (!cancelled) {
            const message = err instanceof Error ? err.message : 'Failed to load configuration'
            setError(message)
          }
        })
    }, 3000)

    return () => {
      cancelled = true
      clearTimeout(timer)
      clearTimeout(timeout)
      controller.abort()
    }
  }, [error])

  if (error) {
    return (
      <div className="fixed inset-0 bg-[#0A0A0A] flex flex-col items-center justify-center font-mono">
        <div className="text-[#F4F4F4] text-sm mb-2">Unable to connect to console server</div>
        <div className="text-[#9CA3AF] text-xs mb-6">{error}</div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-[#F3F724] text-black text-xs font-medium rounded hover:bg-[#F3F724]/90 transition-colors"
        >
          Retry
        </button>
        <div className="text-[#9CA3AF] text-[10px] mt-4">Retrying automatically...</div>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="fixed inset-0 bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#F3F724]/30 border-t-[#F3F724] rounded-full animate-spin" />
      </div>
    )
  }

  return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>
}
