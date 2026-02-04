'use client'

import { Plus, X } from 'lucide-react'
import { useState } from 'react'

interface AttributesFilterProps {
  value: [string, string][]
  onChange: (attrs: [string, string][]) => void
}

export function AttributesFilter({ value, onChange }: AttributesFilterProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  const handleAdd = () => {
    onChange([...value, ['', '']])
    setEditingIndex(value.length)
  }

  const handleRemove = (index: number) => {
    const newAttrs = value.filter((_, i) => i !== index)
    onChange(newAttrs)
    if (editingIndex === index) {
      setEditingIndex(null)
    }
  }

  const handleKeyChange = (index: number, key: string) => {
    const newAttrs = [...value]
    newAttrs[index] = [key, newAttrs[index][1]]
    onChange(newAttrs)
  }

  const handleValueChange = (index: number, val: string) => {
    const newAttrs = [...value]
    newAttrs[index] = [newAttrs[index][0], val]
    onChange(newAttrs)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-300">Attribute Filters</h3>
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#F3F724] hover:bg-[#1A1A1A] rounded transition-colors"
        >
          <Plus className="w-3 h-3" />
          Add Attribute
        </button>
      </div>

      {value.length === 0 ? (
        <p className="text-sm text-gray-500 italic">
          No attributes set. Click "Add Attribute" to filter by key-value pairs.
        </p>
      ) : (
        <div className="space-y-2">
          {value.map(([key, val], index) => (
            <div key={`${index}-${key}`} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Key (e.g., http.method)"
                value={key}
                onChange={(e) => handleKeyChange(index, e.target.value)}
                onFocus={() => setEditingIndex(index)}
                onBlur={() => setEditingIndex(null)}
                className="flex-1 px-3 py-1.5 bg-[#0A0A0A] border border-[#1D1D1D] rounded text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-[#F3F724] transition-colors"
              />
              <span className="text-gray-500">=</span>
              <input
                type="text"
                placeholder="Value (e.g., POST)"
                value={val}
                onChange={(e) => handleValueChange(index, e.target.value)}
                onFocus={() => setEditingIndex(index)}
                onBlur={() => setEditingIndex(null)}
                className="flex-1 px-3 py-1.5 bg-[#0A0A0A] border border-[#1D1D1D] rounded text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-[#F3F724] transition-colors"
              />
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-[#1A1A1A] rounded transition-colors"
                title="Remove attribute"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
