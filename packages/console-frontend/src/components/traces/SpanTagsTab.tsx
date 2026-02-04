import { Copy, Search } from 'lucide-react'
import { useState } from 'react'
import type { VisualizationSpan } from '@/lib/traceTransform'

interface SpanTagsTabProps {
  span: VisualizationSpan
}

export function SpanTagsTab({ span }: SpanTagsTabProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const attributes = span.attributes || {}
  const entries = Object.entries(attributes)

  const filteredEntries = entries.filter(([key, value]) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return key.toLowerCase().includes(query) || String(value).toLowerCase().includes(query)
  })

  const copyToClipboard = (key: string, value: unknown) => {
    const text = `${key}: ${JSON.stringify(value)}`
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  if (entries.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-400">No attributes found for this span</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search attributes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-[#141414] border border-[#1D1D1D] rounded text-white placeholder-gray-500 focus:outline-none focus:border-[#F3F724]"
        />
      </div>

      <div className="space-y-2">
        {filteredEntries.map(([key, value]) => (
          <div
            key={key}
            className="bg-[#141414] rounded-lg p-4 hover:bg-[#1A1A1A] transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-mono text-[#F3F724] mb-1">{key}</div>
                <div className="text-sm text-gray-300 break-all font-mono">
                  {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(key, value)}
                className="flex-shrink-0 p-2 hover:bg-[#0A0A0A] rounded transition-colors"
                aria-label={`Copy ${key}`}
              >
                {copiedKey === key ? (
                  <span className="text-xs text-green-500">✓</span>
                ) : (
                  <Copy className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredEntries.length === 0 && searchQuery && (
        <div className="text-center py-8">
          <p className="text-gray-400">No attributes match "{searchQuery}"</p>
        </div>
      )}

      <div className="text-xs text-gray-500 text-center pt-4">
        {filteredEntries.length} of {entries.length} attributes
      </div>
    </div>
  )
}
