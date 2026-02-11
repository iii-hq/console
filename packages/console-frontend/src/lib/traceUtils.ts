import { useCallback, useRef, useState } from 'react'

export function formatDuration(ms: number): string {
  if (ms < 0.001) return '0μs'
  if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`
  if (ms < 1000) return `${ms.toFixed(2)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

export function useCopyToClipboard(timeout = 2000) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const copy = useCallback(
    (key: string, text: string) => {
      navigator.clipboard.writeText(text).catch(() => {})
      setCopiedKey(key)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setCopiedKey(null), timeout)
    },
    [timeout],
  )

  return { copiedKey, copy }
}
