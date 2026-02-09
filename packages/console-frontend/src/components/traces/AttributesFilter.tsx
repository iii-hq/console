'use client'

import { Check, Plus, Tag, X } from 'lucide-react'
import { useEffect, useState } from 'react'

interface AttributesFilterProps {
  value: [string, string][]
  onChange: (attrs: [string, string][]) => void
}

const COMMON_ATTRIBUTES = [
  'http.request.method',
  'http.response.status_code',
  'http.route',
  'url.path',
  'code.file.path',
  'code.module.name',
  'thread.name',
]

export function AttributesFilter({ value, onChange }: AttributesFilterProps) {
  const [draft, setDraft] = useState<[string, string][]>(value)
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    setDraft(value)
    setIsDirty(false)
  }, [value])

  const updateDraft = (newDraft: [string, string][]) => {
    setDraft(newDraft)
    setIsDirty(true)
  }

  const handleAdd = () => {
    updateDraft([...draft, ['', '']])
  }

  const handleRemove = (index: number) => {
    updateDraft(draft.filter((_, i) => i !== index))
  }

  const handleKeyChange = (index: number, key: string) => {
    const newAttrs = [...draft]
    newAttrs[index] = [key, newAttrs[index][1]]
    updateDraft(newAttrs)
  }

  const handleValueChange = (index: number, val: string) => {
    const newAttrs = [...draft]
    newAttrs[index] = [newAttrs[index][0], val]
    updateDraft(newAttrs)
  }

  const handleSuggestionClick = (key: string) => {
    updateDraft([...draft, [key, '']])
  }

  const handleApply = () => {
    const filtered = draft.filter(([k]) => k.trim() !== '')
    onChange(filtered)
    setIsDirty(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isDirty) {
      handleApply()
    }
  }

  return (
    <div className="space-y-2">
      {draft.length === 0 ? (
        <div className="text-xs text-[#5B5B5B] italic font-mono">
          Filter by span attributes (e.g. http.request.method = POST)
        </div>
      ) : (
        <div className="space-y-2">
          {draft.map(([key, val], index) => (
            <div
              key={`${index}-${key}`}
              className="group flex items-center gap-2 bg-[#0A0A0A] border border-[#1D1D1D] rounded-md p-2 hover:border-[#2D2D2D] transition-colors"
            >
              <input
                type="text"
                placeholder="key"
                value={key}
                onChange={(e) => handleKeyChange(index, e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent border-none text-xs text-[#F4F4F4] placeholder-[#5B5B5B] focus:outline-none font-mono"
              />
              <span className="text-[#5B5B5B] text-xs font-mono">=</span>
              <input
                type="text"
                placeholder="value"
                value={val}
                onChange={(e) => handleValueChange(index, e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent border-none text-xs text-[#F4F4F4] placeholder-[#5B5B5B] focus:outline-none font-mono"
              />
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="p-1 text-[#5B5B5B] hover:text-red-400 hover:bg-[#141414] rounded transition-all opacity-0 group-hover:opacity-100"
                title="Remove"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAdd}
            className="flex items-center gap-1 px-2 py-1 text-xs font-mono text-[#F3F724] hover:bg-[#141414] rounded transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add
          </button>

          {isDirty && (
            <button
              type="button"
              onClick={handleApply}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono bg-yellow/10 border border-yellow/30 text-yellow rounded hover:bg-yellow/20 transition-colors"
            >
              <Check className="w-3 h-3" />
              Apply
            </button>
          )}
        </div>

        {draft.length === 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {COMMON_ATTRIBUTES.map((attr) => (
              <button
                key={attr}
                type="button"
                onClick={() => handleSuggestionClick(attr)}
                className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono text-[#9CA3AF] bg-[#0A0A0A] border border-[#1D1D1D] rounded hover:border-[#F3F724] hover:text-[#F3F724] transition-colors"
                title={`Add ${attr}`}
              >
                <Tag className="w-2.5 h-2.5" />
                {attr}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
