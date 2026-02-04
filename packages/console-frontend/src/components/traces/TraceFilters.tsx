'use client'

import { AlertTriangle, ChevronDown, ChevronUp, X } from 'lucide-react'
import { useState } from 'react'
import type { TraceFilterState } from '@/hooks/useTraceFilters'
import { AttributesFilter } from './AttributesFilter'

interface TraceFiltersProps {
  filters: TraceFilterState
  onFilterChange: (key: string, value: unknown) => void
  onClear: () => void
  activeCount: number
  validationWarnings?: {
    durationSwapped?: boolean
    timeRangeSwapped?: boolean
  }
  onClearWarnings?: () => void
  isLoading?: boolean
}

const timeRangePresets = [
  { label: 'Last 15m', value: 15 * 60 * 1000 },
  { label: 'Last 1h', value: 60 * 60 * 1000 },
  { label: 'Last 6h', value: 6 * 60 * 60 * 1000 },
  { label: 'Last 24h', value: 24 * 60 * 60 * 1000 },
  { label: 'Last 7d', value: 7 * 24 * 60 * 60 * 1000 },
]

const sortByOptions = [
  { label: 'Start Time', value: 'start_time' },
  { label: 'Duration', value: 'duration' },
  { label: 'Service Name', value: 'service_name' },
]

export function TraceFilters({
  filters,
  onFilterChange,
  onClear,
  activeCount,
  validationWarnings,
  onClearWarnings,
  isLoading,
}: TraceFiltersProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [showTimeRangeMenu, setShowTimeRangeMenu] = useState(false)
  const [showSortByMenu, setShowSortByMenu] = useState(false)
  const [showAttributesPanel, setShowAttributesPanel] = useState(false)

  const handleServiceNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange('serviceName', e.target.value || undefined)
  }

  const handleOperationNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange('operationName', e.target.value || undefined)
  }

  const handleMinDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? Number.parseInt(e.target.value, 10) : null
    onFilterChange('minDurationMs', value)
  }

  const handleMaxDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? Number.parseInt(e.target.value, 10) : null
    onFilterChange('maxDurationMs', value)
  }

  const handleStatusChange = (status: 'ok' | 'error' | 'unset' | null) => {
    onFilterChange('status', status)
    setShowStatusMenu(false)
  }

  const handleTimeRangeChange = (milliseconds: number) => {
    const now = Date.now()
    onFilterChange('startTime', now - milliseconds)
    onFilterChange('endTime', now)
    setShowTimeRangeMenu(false)
  }

  const handleSortByChange = (sortBy: 'start_time' | 'duration' | 'service_name') => {
    onFilterChange('sortBy', sortBy)
    setShowSortByMenu(false)
  }

  const toggleSortOrder = () => {
    onFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')
  }

  const handleAttributesChange = (attrs: [string, string][]) => {
    onFilterChange('attributes', attrs.length > 0 ? attrs : undefined)
  }

  const getStatusLabel = () => {
    if (!filters.status) return 'All Statuses'
    return filters.status.charAt(0).toUpperCase() + filters.status.slice(1)
  }

  const getTimeRangeLabel = () => {
    if (!filters.startTime || !filters.endTime) return 'Time Range'
    const diff = filters.endTime - filters.startTime
    const preset = timeRangePresets.find((p) => p.value === diff)
    return preset ? preset.label : 'Custom'
  }

  const getSortByLabel = () => {
    const option = sortByOptions.find((o) => o.value === filters.sortBy)
    return option ? option.label : 'Start Time'
  }

  return (
    <div className="space-y-3" data-testid="trace-filters">
      {(validationWarnings?.durationSwapped || validationWarnings?.timeRangeSwapped) && (
        <div className="flex items-center justify-between px-3 py-2 bg-yellow-950/20 border border-yellow-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-400">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">
              {validationWarnings.durationSwapped && 'Min/max duration swapped. '}
              {validationWarnings.timeRangeSwapped && 'Start/end time swapped. '}
              Values corrected automatically.
            </span>
          </div>
          {onClearWarnings && (
            <button
              type="button"
              onClick={onClearWarnings}
              className="text-yellow-400 hover:text-yellow-300 transition-colors"
              title="Dismiss warning"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-950/20 border border-blue-500/30 rounded-lg">
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-blue-400">Applying filters...</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {/* Service Name Input */}
        <input
          type="text"
          placeholder="Service (e.g., api-*)"
          value={filters.serviceName || ''}
          onChange={handleServiceNameChange}
          className="px-3 py-1.5 bg-[#141414] border border-[#1D1D1D] rounded-lg text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-[#F3F724] transition-colors"
        />

        {/* Operation Name Input */}
        <input
          type="text"
          placeholder="Operation (e.g., GET *)"
          value={filters.operationName || ''}
          onChange={handleOperationNameChange}
          className="px-3 py-1.5 bg-[#141414] border border-[#1D1D1D] rounded-lg text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-[#F3F724] transition-colors"
        />

        {/* Status Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowStatusMenu(!showStatusMenu)}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${
                filters.status
                  ? 'bg-[#F3F724] text-black'
                  : 'bg-[#141414] text-gray-400 hover:bg-[#1A1A1A]'
              }
            `}
          >
            {getStatusLabel()}
            <ChevronDown className="w-3 h-3" />
          </button>
          {showStatusMenu && (
            <div className="absolute top-full mt-1 left-0 bg-[#141414] border border-[#1D1D1D] rounded-lg shadow-lg z-10 min-w-[140px]">
              <button
                type="button"
                onClick={() => handleStatusChange(null)}
                className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-[#1A1A1A] first:rounded-t-lg"
              >
                All Statuses
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange('ok')}
                className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-[#1A1A1A]"
              >
                OK
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange('error')}
                className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-[#1A1A1A]"
              >
                Error
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange('unset')}
                className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-[#1A1A1A] last:rounded-b-lg"
              >
                Unset
              </button>
            </div>
          )}
        </div>

        {/* Duration Min */}
        <input
          type="number"
          placeholder="Min ms"
          value={filters.minDurationMs ?? ''}
          onChange={handleMinDurationChange}
          className="w-24 px-3 py-1.5 bg-[#141414] border border-[#1D1D1D] rounded-lg text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-[#F3F724] transition-colors"
        />

        {/* Duration Max */}
        <input
          type="number"
          placeholder="Max ms"
          value={filters.maxDurationMs ?? ''}
          onChange={handleMaxDurationChange}
          className="w-24 px-3 py-1.5 bg-[#141414] border border-[#1D1D1D] rounded-lg text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-[#F3F724] transition-colors"
        />

        {/* Time Range Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowTimeRangeMenu(!showTimeRangeMenu)}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${
                filters.startTime && filters.endTime
                  ? 'bg-[#F3F724] text-black'
                  : 'bg-[#141414] text-gray-400 hover:bg-[#1A1A1A]'
              }
            `}
          >
            {getTimeRangeLabel()}
            <ChevronDown className="w-3 h-3" />
          </button>
          {showTimeRangeMenu && (
            <div className="absolute top-full mt-1 left-0 bg-[#141414] border border-[#1D1D1D] rounded-lg shadow-lg z-10 min-w-[120px]">
              {timeRangePresets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleTimeRangeChange(preset.value)}
                  className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-[#1A1A1A] first:rounded-t-lg last:rounded-b-lg"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sort By Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowSortByMenu(!showSortByMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-[#141414] text-gray-400 hover:bg-[#1A1A1A] transition-colors"
          >
            Sort: {getSortByLabel()}
            <ChevronDown className="w-3 h-3" />
          </button>
          {showSortByMenu && (
            <div className="absolute top-full mt-1 left-0 bg-[#141414] border border-[#1D1D1D] rounded-lg shadow-lg z-10 min-w-[140px]">
              {sortByOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    handleSortByChange(option.value as 'start_time' | 'duration' | 'service_name')
                  }
                  className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-[#1A1A1A] first:rounded-t-lg last:rounded-b-lg"
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sort Order Toggle */}
        <button
          type="button"
          onClick={toggleSortOrder}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-[#141414] text-gray-400 hover:bg-[#1A1A1A] transition-colors"
          title={filters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}
        >
          {filters.sortOrder === 'asc' ? (
            <>
              <ChevronUp className="w-3 h-3" />
              Asc
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" />
              Desc
            </>
          )}
        </button>

        {/* Attributes Toggle */}
        <button
          type="button"
          onClick={() => setShowAttributesPanel(!showAttributesPanel)}
          className={`
            px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
            ${
              filters.attributes && filters.attributes.length > 0
                ? 'bg-[#F3F724] text-black'
                : 'bg-[#141414] text-gray-400 hover:bg-[#1A1A1A]'
            }
          `}
        >
          Attributes{' '}
          {filters.attributes && filters.attributes.length > 0 && `(${filters.attributes.length})`}
        </button>

        {/* Clear All */}
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-[#141414] text-gray-400 hover:bg-[#1A1A1A] transition-colors"
          >
            Clear All ({activeCount})
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Attributes Panel (Expandable) */}
      {showAttributesPanel && (
        <div className="p-4 bg-[#141414] border border-[#1D1D1D] rounded-lg">
          <AttributesFilter value={filters.attributes || []} onChange={handleAttributesChange} />
        </div>
      )}
    </div>
  )
}
