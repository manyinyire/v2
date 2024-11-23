import { useCallback, useEffect, useState } from 'react'
import { useSupabase } from '@/providers/SupabaseProvider'
import { toast } from 'sonner'
import { Database } from '@/types/supabase'
import { useSession } from '@/providers/SessionProvider'
import { PostgrestError } from '@supabase/supabase-js'
import type { Ticket } from '@/types'

type TicketFilters = {
  status?: string[]
  priority?: string[]
  sbu_id?: string
  assigned_to?: string
  search?: string
  dateRange?: {
    start: Date
    end: Date
  }
}

type TicketInput = Omit<
  Database['public']['Tables']['tickets']['Insert'],
  'id' | 'created_at' | 'updated_at'
>

type TicketUpdate = Partial<TicketInput>

export function useTickets() {
  const { supabase } = useSupabase()
  const { session } = useSession()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<PostgrestError | null>(null)
  const [filters, setFilters] = useState<TicketFilters>({})

  // Helper function to build the base query with role-based access
  const buildBaseQuery = useCallback(async () => {
    if (!session?.user?.id) return null

    // Get user's role and SBU
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select(`
        role,
        tier_assignments (
          tier,
          sbu_id
        )
      `)
      .eq('id', session.user.id)
      .single()

    if (profileError) {
      throw profileError
    }

    let query = supabase
      .from('tickets')
      .select(`
        *,
        sbu:sbu_id (
          id,
          name
        ),
        creator:created_by (
          id,
          email,
          full_name,
          role,
          sbu_id,
          avatar_url,
          created_at,
          updated_at
        ),
        assignee:assigned_to (
          id,
          email,
          full_name,
          role,
          sbu_id,
          avatar_url,
          created_at,
          updated_at
        )
      `)
      .eq('is_deleted', false)

    // Apply role-based filters
    if (userProfile.role === 'agent') {
      const sbuId = userProfile.tier_assignments?.[0]?.sbu_id
      if (!sbuId) throw new Error('Agent not assigned to any SBU')
      query = query
        .eq('sbu_id', sbuId)
        .or(`assignee.eq.${session.user.id},creator.eq.${session.user.id}`)
    } else if (userProfile.role === 'manager') {
      const sbuId = userProfile.tier_assignments?.[0]?.sbu_id
      if (!sbuId) throw new Error('Manager not assigned to any SBU')
      query = query.eq('sbu_id', sbuId)
    }

    return query
  }, [supabase, session])

  // Apply filters to query
  const applyFilters = useCallback((query: any, currentFilters: TicketFilters) => {
    if (currentFilters.status?.length) {
      query = query.in('status', currentFilters.status)
    }
    if (currentFilters.priority?.length) {
      query = query.in('priority', currentFilters.priority)
    }
    if (currentFilters.sbu_id) {
      query = query.eq('sbu_id', currentFilters.sbu_id)
    }
    if (currentFilters.assigned_to) {
      query = query.eq('assignee', currentFilters.assigned_to)
    }
    if (currentFilters.search) {
      query = query.or(`title.ilike.%${currentFilters.search}%,description.ilike.%${currentFilters.search}%`)
    }
    if (currentFilters.dateRange) {
      query = query
        .gte('created_at', currentFilters.dateRange.start.toISOString())
        .lte('created_at', currentFilters.dateRange.end.toISOString())
    }
    return query
  }, [])

  // Fetch tickets with current filters
  const fetchTickets = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const query = await buildBaseQuery()
      if (!query) {
        setTickets([])
        return
      }

      const { data: ticketsData, error: ticketsError } = await query

      if (ticketsError) {
        setError(ticketsError)
        return
      }

      // Transform the data to match the expected types
      const transformedTickets = ticketsData.map(ticket => ({
        ...ticket,
        created_by: ticket.creator?.id || ticket.created_by,
        assigned_to: ticket.assignee?.id || ticket.assigned_to,
        creator: ticket.creator,
        assignee: ticket.assignee,
        sbu: ticket.sbu
      }))

      setTickets(transformedTickets)
    } catch (err) {
      setError(err as PostgrestError)
    } finally {
      setLoading(false)
    }
  }, [buildBaseQuery])

  // Create new ticket
  const createTicket = useCallback(async (ticketData: TicketInput) => {
    try {
      if (!session?.user?.id) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('tickets')
        .insert({
          ...ticketData,
          created_by: session.user.id,
          status: ticketData.status || 'open'
        })
        .select()
        .single()

      if (error) throw error

      setTickets(prev => [data as Ticket, ...prev])
      toast.success('Ticket created successfully')
      return data
    } catch (err) {
      const error = err as PostgrestError
      toast.error('Failed to create ticket')
      throw error
    }
  }, [supabase, session])

  // Update ticket
  const updateTicket = useCallback(async (id: string, updates: TicketUpdate) => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      setTickets(prev =>
        prev.map(ticket => (ticket.id === id ? { ...ticket, ...data } as Ticket : ticket))
      )
      toast.success('Ticket updated successfully')
      return data
    } catch (err) {
      const error = err as PostgrestError
      toast.error('Failed to update ticket')
      throw error
    }
  }, [supabase])

  // Delete ticket (soft delete)
  const deleteTicket = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ is_deleted: true })
        .eq('id', id)

      if (error) throw error

      setTickets(prev => prev.filter(ticket => ticket.id !== id))
      toast.success('Ticket deleted successfully')
    } catch (err) {
      const error = err as PostgrestError
      toast.error('Failed to delete ticket')
      throw error
    }
  }, [supabase])

  // Subscribe to real-time updates
  useEffect(() => {
    if (!session?.user?.id) return

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
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, session, fetchTickets])

  // Initial fetch and filter changes
  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  return {
    tickets,
    loading,
    error,
    filters,
    setFilters,
    createTicket,
    updateTicket,
    deleteTicket,
    refetch: fetchTickets
  }
}