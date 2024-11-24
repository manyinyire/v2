import React, { useState, useMemo, useEffect } from 'react'
import { useTickets } from '@/hooks/useTickets'
import { useAuth } from '@/contexts/AuthContext'
import type { Ticket, TicketStatus, UserProfile } from '@/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { BarChart, LineChart, DonutChart } from '@tremor/react'
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Filter, 
  Plus, 
  RefreshCcw,
  Search,
  SlidersHorizontal
} from 'lucide-react'
import { QueryForm } from './QueryForm'
import { TicketTable } from './TicketTable'
import { TicketStats } from './TicketStats'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'
import { useSession } from '@/providers/SessionProvider'
import { AuthUser } from '@/types/auth'
import toast from 'react-hot-toast'

interface FilterState {
  status?: TicketStatus[]
  priority?: string[]
  sbu_id?: string[]
  created_by?: string[]
  assigned_to?: string[]
  search?: string
  dateRange?: {
    start: Date
    end: Date
  }
}

interface TicketStatsData {
  total: number
  open: number
  resolvedToday: number
  avgResolutionTime: number
}

interface VolumeDataPoint {
  date: string
  'Total Tickets': number
  'High Priority': number
  'Medium Priority': number
  'Low Priority': number
}

interface StatusDataPoint {
  status: string
  count: number
}

interface SBUDataPoint {
  sbu: string
  total: number
  resolved: number
  resolutionRate: number
}

export function EscalatedQueryDashboard() {
  const { session } = useSession()
  const { profile } = useAuth()
  const {
    tickets,
    loading,
    error,
    filters,
    setFilters,
    createTicket,
    updateTicket,
    deleteTicket
  } = useTickets()

  const supabase = createClientComponentClient<Database>()

  // State for analytics data
  const [stats, setStats] = React.useState<TicketStatsData | null>(null)
  const [volumeData, setVolumeData] = React.useState<VolumeDataPoint[]>([])
  const [statusData, setStatusData] = React.useState<StatusDataPoint[]>([])
  const [sbuData, setSbuData] = React.useState<SBUDataPoint[]>([])

  // Filter states
  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<TicketStatus>("NEW")
  const [sbuFilter, setSbuFilter] = React.useState("all")
  const [activeTab, setActiveTab] = React.useState("overview")
  const [selectedTicket, setSelectedTicket] = React.useState<Ticket | null>(null)
  const [selectedUser, setSelectedUser] = React.useState<UserProfile | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)

  // Fetch tickets with current filters
  const fetchTickets = React.useCallback(async () => {
    const { data: ticketsData, error } = await supabase
      .from('tickets')
      .select(`
        *,
        sbu:sbus(*),
        assigned_user:profiles(*),
        created_by_user:profiles(*)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching tickets:', error)
      return
    }

    return ticketsData
  }, [supabase])

  // Fetch analytics data
  const fetchAnalytics = React.useCallback(async () => {
    try {
      // Fetch ticket stats
      const { data: statsData } = await supabase.rpc('get_ticket_stats')
      if (statsData) setStats(statsData)

      // Fetch volume data
      const { data: volumeData } = await supabase.rpc('get_ticket_volume', {
        days: 30
      })
      if (volumeData) {
        setVolumeData(volumeData.map((day: any) => ({
          date: day.date,
          'Total Tickets': day.total_count,
          'High Priority': day.high_priority_count,
          'Medium Priority': day.medium_priority_count,
          'Low Priority': day.low_priority_count
        })))
      }

      // Fetch status distribution
      const { data: statusData } = await supabase.rpc('get_ticket_status_distribution')
      if (statusData) setStatusData(statusData)

      // Fetch SBU performance
      const { data: sbuData } = await supabase.rpc('get_sbu_performance')
      if (sbuData) setSbuData(sbuData)
    } catch (error) {
      console.error('Error fetching analytics:', error)
    }
  }, [supabase])

  // Fetch data on mount and tab change
  React.useEffect(() => {
    fetchTickets()
    fetchAnalytics()
  }, [fetchTickets, fetchAnalytics])

  // Handle refresh
  const handleRefresh = () => {
    fetchTickets()
    fetchAnalytics()
  }

  // Set up real-time subscription for tickets
  React.useEffect(() => {
    const channel = supabase
      .channel('tickets-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets'
        },
        () => {
          fetchTickets()
          fetchAnalytics()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, fetchTickets, fetchAnalytics])

  const handleCreateTicket = async (data: any) => {
    try {
      await createTicket(data)
      toast.success('Ticket created successfully')
      setIsCreateDialogOpen(false)
    } catch (error) {
      toast.error('Failed to create ticket')
    }
  }

  const handleAssignTicket = async (ticketId: string) => {
    try {
      await updateTicket(ticketId, { status: 'ASSIGNED' })
      toast.success('Ticket assigned successfully')
    } catch (error) {
      toast.error('Failed to assign ticket')
    }
  }

  const handleResolveTicket = async (ticketId: string) => {
    try {
      await updateTicket(ticketId, { status: 'RESOLVED' })
      toast.success('Ticket resolved successfully')
    } catch (error) {
      toast.error('Failed to resolve ticket')
    }
  }

  const handleEscalateTicket = async (ticketId: string) => {
    try {
      await updateTicket(ticketId, { status: 'ESCALATED_TIER1' })
      toast.success('Ticket escalated successfully')
    } catch (error) {
      toast.error('Failed to escalate ticket')
    }
  }

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(prev => ({
      ...prev,
      status: newFilters.status,
      priority: newFilters.priority,
      sbu_id: Array.isArray(newFilters.sbu_id) ? newFilters.sbu_id[0] : newFilters.sbu_id,
      created_by: newFilters.created_by,
      assigned_to: Array.isArray(newFilters.assigned_to) ? newFilters.assigned_to[0] : newFilters.assigned_to,
      search: newFilters.search,
      dateRange: newFilters.dateRange
    }))
  }

  // Filter and transform tickets
  const filteredTickets = useMemo(() => {
    return tickets
      .filter(ticket => {
        const matchesSearch = searchQuery
          ? ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ticket.description.toLowerCase().includes(searchQuery.toLowerCase())
          : true
        const matchesStatus = statusFilter
          ? ticket.status === statusFilter
          : true
        return matchesSearch && matchesStatus
      })
      .map(ticket => ({
        ...ticket,
        assignee: ticket.assignee as UserProfile | undefined
      }))
  }, [tickets, searchQuery, statusFilter])

  if (!profile) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Escalated Query Dashboard</h1>
          <p className="text-muted-foreground">
            Manage and track escalated support tickets
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Ticket
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="tickets">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search tickets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              <Select value={statusFilter} onValueChange={(value: TicketStatus) => setStatusFilter(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NEW">New</SelectItem>
                  <SelectItem value="ASSIGNED">Assigned</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                  <SelectItem value="ESCALATED_TIER1">Escalated (Tier 1)</SelectItem>
                  <SelectItem value="ESCALATED_TIER2">Escalated (Tier 2)</SelectItem>
                  <SelectItem value="ESCALATED_TIER3">Escalated (Tier 3)</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <TicketTable
              tickets={filteredTickets}
              userRole={profile.role}
              onView={setSelectedTicket}
              onAssign={handleAssignTicket}
              onResolve={handleResolveTicket}
              onEscalate={handleEscalateTicket} onComment={function (ticketId: string): void {
                throw new Error('Function not implemented.')
              } }            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}