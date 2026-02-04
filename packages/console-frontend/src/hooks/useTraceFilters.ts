'use client'

import { useCallback, useEffect, useState } from 'react'
import type { TracesFilterParams } from '@/api'

export interface TraceFilterState {
  serviceName?: string
  operationName?: string
  status?: 'ok' | 'error' | 'unset' | null
  minDurationMs?: number | null
  maxDurationMs?: number | null
  startTime?: number | null
  endTime?: number | null
  attributes?: [string, string][]
  sortBy?: 'start_time' | 'duration' | 'service_name'
  sortOrder?: 'asc' | 'desc'
  page: number
  pageSize: number
}

const defaultFilters: TraceFilterState = {
  serviceName: undefined,
  operationName: undefined,
  status: null,
  minDurationMs: null,
  maxDurationMs: null,
  startTime: null,
  endTime: null,
  attributes: undefined,
  sortBy: 'start_time',
  sortOrder: 'desc',
  page: 1,
  pageSize: 50,
}

/**
 * Hook for managing trace filter state with server-side pagination.
 *
 * Features:
 * - 300ms debouncing for text inputs (serviceName, operationName)
 * - Automatic page reset when filters change
 * - Type-safe API parameter conversion (camelCase → snake_case)
 * - Range validation (auto-swaps min/max if invalid)
 *
 * @returns {Object} Filter state and control functions
 * @returns {TraceFilterState} filters - Current filter state
 * @returns {Function} updateFilter - Update a single filter field
 * @returns {Function} resetFilters - Reset all filters to defaults
 * @returns {Function} getActiveFilterCount - Count non-default filters
 * @returns {Function} getApiParams - Convert to API-ready parameters
 *
 * @example
 * const { filters, updateFilter, getApiParams } = useTraceFilters()
 *
 * updateFilter('serviceName', 'api-gateway')
 * updateFilter('minDurationMs', 100)
 *
 * const apiParams = getApiParams()
 * // { service_name: "api-gateway", min_duration_ms: 100, offset: 0, limit: 50 }
 */
export function useTraceFilters() {
  const [filters, setFilters] = useState<TraceFilterState>(defaultFilters)
  const [debouncedServiceName, setDebouncedServiceName] = useState<string | undefined>(undefined)
  const [debouncedOperationName, setDebouncedOperationName] = useState<string | undefined>(
    undefined,
  )

  const [serviceNameTimer, setServiceNameTimer] = useState<NodeJS.Timeout | null>(null)
  const [operationNameTimer, setOperationNameTimer] = useState<NodeJS.Timeout | null>(null)

  const [validationWarnings, setValidationWarnings] = useState<{
    durationSwapped?: boolean
    timeRangeSwapped?: boolean
  }>({})

  useEffect(() => {
    return () => {
      if (serviceNameTimer) clearTimeout(serviceNameTimer)
      if (operationNameTimer) clearTimeout(operationNameTimer)
    }
  }, [serviceNameTimer, operationNameTimer])

  /**
   * Update a single filter field
   * Resets page to 1 when any filter changes (except page/pageSize)
   */
  const updateFilter = useCallback(
    (key: string, value: unknown) => {
      setFilters((prev) => {
        const newFilters = { ...prev, [key]: value }

        // Reset page to 1 when any filter changes (except page/pageSize)
        if (key !== 'page' && key !== 'pageSize') {
          newFilters.page = 1
        }

        return newFilters
      })

      // Handle debouncing for text inputs
      if (key === 'serviceName') {
        if (serviceNameTimer) clearTimeout(serviceNameTimer)
        const timer = setTimeout(() => {
          setDebouncedServiceName(value as string | undefined)
        }, 300)
        setServiceNameTimer(timer)
      }

      if (key === 'operationName') {
        if (operationNameTimer) clearTimeout(operationNameTimer)
        const timer = setTimeout(() => {
          setDebouncedOperationName(value as string | undefined)
        }, 300)
        setOperationNameTimer(timer)
      }
    },
    [serviceNameTimer, operationNameTimer],
  )

  /**
   * Reset all filters to defaults
   */
  const resetFilters = useCallback(() => {
    setFilters(defaultFilters)
    setDebouncedServiceName(undefined)
    setDebouncedOperationName(undefined)
    if (serviceNameTimer) clearTimeout(serviceNameTimer)
    if (operationNameTimer) clearTimeout(operationNameTimer)
  }, [serviceNameTimer, operationNameTimer])

  /**
   * Count active (non-default) filters
   */
  const getActiveFilterCount = useCallback(() => {
    let count = 0
    if (filters.serviceName) count++
    if (filters.operationName) count++
    if (filters.status !== null && filters.status !== undefined) count++
    if (filters.minDurationMs !== null) count++
    if (filters.maxDurationMs !== null) count++
    if (filters.startTime !== null) count++
    if (filters.endTime !== null) count++
    if (filters.attributes && filters.attributes.length > 0) count++
    if (filters.sortBy !== 'start_time') count++
    if (filters.sortOrder !== 'desc') count++
    return count
  }, [filters])

  /**
   * Convert filter state to API params object
   * Maps camelCase state properties to snake_case API parameters
   * Filters out undefined, null, and empty strings
   */
  const getApiParams = useCallback((): TracesFilterParams => {
    const params: TracesFilterParams = {
      offset: (filters.page - 1) * filters.pageSize,
      limit: filters.pageSize,
    }

    const warnings: { durationSwapped?: boolean; timeRangeSwapped?: boolean } = {}

    if (filters.serviceName) params.service_name = filters.serviceName
    if (filters.operationName) params.name = filters.operationName
    if (filters.status !== null && filters.status !== undefined) params.status = filters.status

    if (
      filters.minDurationMs !== null &&
      filters.minDurationMs !== undefined &&
      filters.maxDurationMs !== null &&
      filters.maxDurationMs !== undefined
    ) {
      if (filters.minDurationMs > filters.maxDurationMs) {
        params.min_duration_ms = filters.maxDurationMs
        params.max_duration_ms = filters.minDurationMs
        warnings.durationSwapped = true
      } else {
        params.min_duration_ms = filters.minDurationMs
        params.max_duration_ms = filters.maxDurationMs
      }
    } else {
      if (filters.minDurationMs !== null && filters.minDurationMs !== undefined)
        params.min_duration_ms = filters.minDurationMs
      if (filters.maxDurationMs !== null && filters.maxDurationMs !== undefined)
        params.max_duration_ms = filters.maxDurationMs
    }

    if (
      filters.startTime !== null &&
      filters.startTime !== undefined &&
      filters.endTime !== null &&
      filters.endTime !== undefined
    ) {
      if (filters.startTime > filters.endTime) {
        params.start_time = filters.endTime
        params.end_time = filters.startTime
        warnings.timeRangeSwapped = true
      } else {
        params.start_time = filters.startTime
        params.end_time = filters.endTime
      }
    } else {
      if (filters.startTime !== null && filters.startTime !== undefined)
        params.start_time = filters.startTime
      if (filters.endTime !== null && filters.endTime !== undefined)
        params.end_time = filters.endTime
    }

    setValidationWarnings(warnings)

    if (filters.attributes && filters.attributes.length > 0) params.attributes = filters.attributes
    if (filters.sortBy) params.sort_by = filters.sortBy
    if (filters.sortOrder) params.sort_order = filters.sortOrder

    return params
  }, [filters])

  const clearValidationWarnings = useCallback(() => {
    setValidationWarnings({})
  }, [])

  return {
    filters,
    debouncedServiceName,
    debouncedOperationName,
    updateFilter,
    resetFilters,
    getActiveFilterCount,
    getApiParams,
    validationWarnings,
    clearValidationWarnings,
  }
}
