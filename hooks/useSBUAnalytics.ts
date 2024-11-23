import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { startOfMonth, endOfMonth, format, subMonths, startOfYear, endOfYear } from 'date-fns'
import { useAuth } from '@/contexts/AuthContext'

export interface SLABreachData {
  sbuName: string
  breachCount: number
  totalTickets: number
  breachPercentage: number
}

export interface WeeklyTrendData {
  week: string
  tickets: number
  avgResponseTime: number
}

export interface TicketsByTier {
  name: string
  value: number
}

export interface SBUAnalyticsData {
  slaBreachData: SLABreachData[]
  weeklyTrends: WeeklyTrendData[]
  ticketsByTier: TicketsByTier[]
  totalTickets: number
  totalBreaches: number
  avgResponseTime: number
  loading: boolean
  error: string | null
}

export interface QueryMetrics {
  total_queries: number
  resolved_queries: number
  pending_queries: number
  escalated_queries: number
  average_resolution_time: number
  satisfaction_rate: number
}

export interface SBUMetrics extends QueryMetrics {
  sbu: string
  active_users: number
  top_categories: { category: string; count: number }[]
  response_times: { date: string; time: number }[]
  query_trends: { date: string; count: number }[]
  satisfaction_trends: { date: string; rate: number }[]
}

export interface AnalyticsFilters {
  startDate: Date
  endDate: Date
  sbu?: string
  category?: string
  priority?: string
  status?: string
}

export function useSBUAnalytics() {
  const { profile } = useAuth()
  const supabase = createClientComponentClient()
  const queryClient = useQueryClient()

  const [analyticsData, setAnalyticsData] = useState<SBUAnalyticsData>({
    slaBreachData: [],
    weeklyTrends: [],
    ticketsByTier: [],
    totalTickets: 0,
    totalBreaches: 0,
    avgResponseTime: 0,
    loading: true,
    error: null,
  })

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      // Fetch SLA breach data by SBU
      const { data: slaData, error: slaError } = await supabase
        .from('tickets')
        .select('sbu_name, created_at, resolution_time, priority')

      if (slaError) throw slaError

      // Process SLA breach data
      const sbuMap = new Map<string, { breachCount: number; totalTickets: number }>()
      slaData?.forEach(ticket => {
        const sbu = ticket.sbu_name
        const current = sbuMap.get(sbu) || { breachCount: 0, totalTickets: 0 }
        
        // Calculate SLA breach based on priority and resolution time
        const hasBreached = calculateSLABreach(ticket.priority, ticket.resolution_time)
        
        sbuMap.set(sbu, {
          breachCount: current.breachCount + (hasBreached ? 1 : 0),
          totalTickets: current.totalTickets + 1
        })
      })

      const slaBreachData: SLABreachData[] = Array.from(sbuMap.entries()).map(([sbuName, data]) => ({
        sbuName,
        breachCount: data.breachCount,
        totalTickets: data.totalTickets,
        breachPercentage: Math.round((data.breachCount / data.totalTickets) * 100)
      }))

      // Calculate weekly trends
      const weeklyTrends = await calculateWeeklyTrends(slaData || [])

      // Calculate tickets by tier
      const ticketsByTier = calculateTicketsByTier(slaData || [])

      // Calculate overall metrics
      const totalTickets = slaData?.length || 0
      const totalBreaches = slaBreachData.reduce((acc, curr) => acc + curr.breachCount, 0)
      const avgResponseTime = calculateAverageResponseTime(slaData || [])

      setAnalyticsData({
        slaBreachData,
        weeklyTrends,
        ticketsByTier,
        totalTickets,
        totalBreaches,
        avgResponseTime,
        loading: false,
        error: null
      })

    } catch (error) {
      console.error('Error fetching analytics:', error)
      setAnalyticsData(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to fetch analytics data'
      }))
      toast.error("Failed to fetch analytics data", {
        description: "Please try again later or contact support if the issue persists."
      })
    }
  }

  // Helper function to format date range for queries
  const getDateRange = (period: 'month' | 'year' | 'custom', customRange?: { start: Date; end: Date }) => {
    const now = new Date()
    switch (period) {
      case 'month':
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        }
      case 'year':
        return {
          start: startOfYear(now),
          end: endOfYear(now)
        }
      case 'custom':
        return {
          start: customRange?.start || startOfMonth(now),
          end: customRange?.end || endOfMonth(now)
        }
    }
  }

  // Fetch SBU metrics with filters
  const useMetrics = (filters: AnalyticsFilters) => {
    return useQuery({
      queryKey: ['sbu-metrics', filters],
      queryFn: async () => {
        const { data, error } = await supabase
          .rpc('get_sbu_metrics', {
            p_start_date: filters.startDate.toISOString(),
            p_end_date: filters.endDate.toISOString(),
            p_sbu: filters.sbu || profile?.sbu,
            p_category: filters.category,
            p_priority: filters.priority,
            p_status: filters.status
          })

        if (error) throw error
        return data as SBUMetrics
      }
    })
  }

  // Fetch comparative metrics across SBUs
  const useComparativeMetrics = (period: 'month' | 'year') => {
    const { start, end } = getDateRange(period)
    
    return useQuery({
      queryKey: ['comparative-metrics', period],
      queryFn: async () => {
        const { data, error } = await supabase
          .rpc('get_comparative_metrics', {
            p_start_date: start.toISOString(),
            p_end_date: end.toISOString()
          })

        if (error) throw error
        return data as Record<string, SBUMetrics>
      }
    })
  }

  // Fetch historical trends
  const useHistoricalTrends = (metric: keyof QueryMetrics, months: number = 12) => {
    return useQuery({
      queryKey: ['historical-trends', metric, months],
      queryFn: async () => {
        const endDate = new Date()
        const startDate = subMonths(endDate, months)

        const { data, error } = await supabase
          .rpc('get_historical_trends', {
            p_start_date: startDate.toISOString(),
            p_end_date: endDate.toISOString(),
            p_metric: metric,
            p_sbu: profile?.sbu
          })

        if (error) throw error
        return data as Array<{ date: string; value: number }>
      }
    })
  }

  // Export report data
  const exportReport = async (filters: AnalyticsFilters, format: 'csv' | 'pdf') => {
    const { data, error } = await supabase
      .rpc('export_sbu_report', {
        p_start_date: filters.startDate.toISOString(),
        p_end_date: filters.endDate.toISOString(),
        p_sbu: filters.sbu || profile?.sbu,
        p_format: format
      })

    if (error) throw error
    return data
  }

  // Schedule automated reports
  const scheduleReport = async (
    schedule: 'daily' | 'weekly' | 'monthly',
    recipients: string[],
    filters: Partial<AnalyticsFilters>
  ) => {
    const { error } = await supabase
      .from('scheduled_reports')
      .insert({
        user_id: profile?.user_id,
        sbu: filters.sbu || profile?.sbu,
        schedule,
        recipients,
        filters
      })

    if (error) throw error
  }

  // Get report schedules
  const useReportSchedules = () => {
    return useQuery({
      queryKey: ['report-schedules'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('scheduled_reports')
          .select('*')
          .eq('user_id', profile?.user_id)

        if (error) throw error
        return data
      }
    })
  }

  // Delete report schedule
  const deleteSchedule = async (scheduleId: string) => {
    const { error } = await supabase
      .from('scheduled_reports')
      .delete()
      .eq('id', scheduleId)

    if (error) throw error
    
    // Invalidate schedules query
    queryClient.invalidateQueries({ queryKey: ['report-schedules'] })
  }

  return {
    analyticsData,
    useMetrics,
    useComparativeMetrics,
    useHistoricalTrends,
    exportReport,
    scheduleReport,
    useReportSchedules,
    deleteSchedule
  }
}

// Helper functions
function calculateSLABreach(priority: string, resolutionTime: number): boolean {
  const slaThresholds = {
    high: 4 * 60, // 4 hours in minutes
    medium: 8 * 60, // 8 hours in minutes
    low: 24 * 60 // 24 hours in minutes
  }
  
  const threshold = slaThresholds[priority.toLowerCase() as keyof typeof slaThresholds] || slaThresholds.medium
  return resolutionTime > threshold
}

async function calculateWeeklyTrends(tickets: any[]): Promise<WeeklyTrendData[]> {
  const weeks: WeeklyTrendData[] = []
  const now = new Date()
  
  for (let i = 3; i >= 0; i--) {
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - (i * 7))
    
    const weekTickets = tickets.filter(ticket => {
      const ticketDate = new Date(ticket.created_at)
      return ticketDate >= weekStart && ticketDate < new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
    })
    
    weeks.push({
      week: `Week ${4 - i}`,
      tickets: weekTickets.length,
      avgResponseTime: calculateAverageResponseTime(weekTickets)
    })
  }
  
  return weeks
}

function calculateTicketsByTier(tickets: any[]): TicketsByTier[] {
  const tierCounts = {
    'Tier 1': 0,
    'Tier 2': 0,
    'Tier 3': 0
  }
  
  tickets.forEach(ticket => {
    const tier = determineTier(ticket.priority)
    tierCounts[tier]++
  })
  
  return Object.entries(tierCounts).map(([name, value]) => ({ name, value }))
}

function determineTier(priority: string): 'Tier 1' | 'Tier 2' | 'Tier 3' {
  switch (priority.toLowerCase()) {
    case 'high':
      return 'Tier 1'
    case 'medium':
      return 'Tier 2'
    default:
      return 'Tier 3'
  }
}

function calculateAverageResponseTime(tickets: any[]): number {
  if (tickets.length === 0) return 0
  const totalTime = tickets.reduce((acc, ticket) => acc + (ticket.resolution_time || 0), 0)
  return Math.round(totalTime / tickets.length)
}
