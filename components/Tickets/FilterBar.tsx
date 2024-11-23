"use client"

import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { DatePickerWithRange } from '@/components/ui/date-range-picker'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'
import { DateRange } from "react-day-picker"
import type { TicketStatus, TicketPriority, UserRole } from '../types'

interface FilterState {
  status?: TicketStatus[]
  priority?: TicketPriority[]
  search?: string
  dateRange?: {
    start: Date
    end: Date
  }
}

interface FilterBarProps {
  filters: FilterState
  onFilterChange: (filters: FilterState) => void
  userRole?: UserRole
}

const statusOptions = [
  'new',
  'assigned',
  'in_progress',
  'escalated',
  'resolved',
  'closed'
] as const

const priorityOptions = [
  'low',
  'medium',
  'high',
  'urgent'
] as const

export function FilterBar({ filters, onFilterChange, userRole }: FilterBarProps) {
  const [searchQuery, setSearchQuery] = useState(filters.search || '')
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    filters.dateRange ? {
      from: filters.dateRange.start,
      to: filters.dateRange.end
    } : undefined
  )

  const handleStatusChange = (value: string) => {
    onFilterChange({
      ...filters,
      status: value ? [value as TicketStatus] : undefined
    })
  }

  const handlePriorityChange = (value: string) => {
    onFilterChange({
      ...filters,
      priority: value ? [value as TicketPriority] : undefined
    })
  }

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range)
    onFilterChange({
      ...filters,
      dateRange: range ? {
        start: range.from!,
        end: range.to!
      } : undefined
    })
  }

  const handleSearch = () => {
    onFilterChange({
      ...filters,
      search: searchQuery
    })
  }

  const handleReset = () => {
    setSearchQuery('')
    setDateRange(undefined)
    onFilterChange({
      status: undefined,
      priority: undefined,
      search: undefined,
      dateRange: undefined
    })
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button variant="outline" size="icon" onClick={handleSearch}>
              <Search className="h-4 w-4" />
            </Button>
          </div>

          <Select
            value={filters.status?.[0]}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Status</SelectItem>
              {statusOptions.map(status => (
                <SelectItem key={status} value={status}>
                  {status.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.priority?.[0]}
            onValueChange={handlePriorityChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Priority</SelectItem>
              {priorityOptions.map(priority => (
                <SelectItem key={priority} value={priority}>
                  {priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DatePickerWithRange
            date={dateRange}
            setDate={handleDateRangeChange}
          />

          <Button variant="outline" onClick={handleReset} className="flex gap-2">
            <X className="h-4 w-4" />
            Reset Filters
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
