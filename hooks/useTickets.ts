import { useState, useEffect, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'
import type { Ticket, TicketStatus, UserProfile, SBU } from '@/types'
import { toast } from 'sonner'

type DbTicket = Database['public']['Tables']['tickets']['Row']

export function useTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClientComponentClient<Database>()

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true)
      console.log('Fetching tickets...')
      
      const { data: { session }, error: authError } = await supabase.auth.getSession()
      if (authError) throw authError
      if (!session) throw new Error('No authenticated session')

      console.log('User session:', session.user.id)

      // Get user's role
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, full_name, role, created_at, updated_at')
        .eq('id', session.user.id)
        .single()

      if (profileError) throw profileError
      if (!userProfile) throw new Error('User profile not found')

      console.log('User profile:', userProfile)

      // First, fetch tickets
      let ticketQuery = supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false })

      // Add role-based filters
      if (userProfile.role === 'agent') {
        ticketQuery = ticketQuery.eq('assigned_to', session.user.id)
      }

      const { data: ticketsData, error: ticketsError } = await ticketQuery

      if (ticketsError) {
        console.error('Error fetching tickets:', ticketsError)
        throw ticketsError
      }

      if (!ticketsData || ticketsData.length === 0) {
        console.log('No tickets found')
        setTickets([])
        return
      }

      // Get all unique user IDs from tickets
      const userIds = new Set<string>()
      ticketsData.forEach(ticket => {
        if (ticket.created_by) userIds.add(ticket.created_by)
        if (ticket.assigned_to) userIds.add(ticket.assigned_to)
      })

      // Fetch user profiles
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('id, full_name, role, created_at, updated_at')
        .in('id', Array.from(userIds))

      if (usersError) {
        console.error('Error fetching users:', usersError)
        throw usersError
      }

      // Create a map of user IDs to user profiles
      const userMap = new Map<string, UserProfile>()
      usersData?.forEach(user => userMap.set(user.id, user))

      // Fetch SBUs for all tickets
      const sbuIds = new Set(ticketsData.map(t => t.sbu_id))
      const { data: sbusData, error: sbusError } = await supabase
        .from('sbus')
        .select('id, name, description, created_at, updated_at')
        .in('id', Array.from(sbuIds))

      if (sbusError) {
        console.error('Error fetching SBUs:', sbusError)
        throw sbusError
      }

      // Create a map of SBU IDs to SBU objects
      const sbuMap = new Map<string, SBU>()
      sbusData?.forEach(sbu => sbuMap.set(sbu.id, sbu))

      // Transform the data to match our Ticket type
      const transformedTickets: Ticket[] = ticketsData.map(ticket => {
        const sbuData = sbuMap.get(ticket.sbu_id)
        if (!sbuData) {
          throw new Error(`No SBU found for ticket ${ticket.id}`)
        }

        const creatorData = userMap.get(ticket.created_by)
        if (!creatorData) {
          throw new Error(`No creator found for ticket ${ticket.id}`)
        }

        const assigneeData = ticket.assigned_to ? userMap.get(ticket.assigned_to) : null

        return {
          id: ticket.id,
          title: ticket.title,
          description: ticket.description,
          status: ticket.status as TicketStatus,
          priority: ticket.priority,
          sla_time: ticket.sla_time,
          created_at: ticket.created_at,
          updated_at: ticket.updated_at,
          card_number: ticket.card_number,
          system_module: ticket.system_module,
          account_number: ticket.account_number,
          query_type: ticket.query_type,
          created_by: creatorData,
          assigned_to: assigneeData || null,
          sbu: sbuData
        }
      })

      console.log('Transformed tickets:', transformedTickets)
      setTickets(transformedTickets)
      setError(null)
    } catch (err) {
      console.error('Error in fetchTickets:', err)
      setError(err as Error)
      toast.error('Failed to fetch tickets')
      setTickets([]) // Reset tickets on error
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchTickets()

    // Set up real-time subscription for tickets
    const channel = supabase
      .channel('tickets-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets'
        },
        (payload) => {
          console.log('Ticket change detected:', payload)
          fetchTickets()
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status)
      })

    return () => {
      console.log('Cleaning up subscription')
      supabase.removeChannel(channel)
    }
  }, [fetchTickets, supabase])

  const handleManualEscalation = useCallback(async (ticketId: string) => {
    try {
      console.log('Manually escalating ticket:', ticketId)
      const response = await fetch('/api/tickets/status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId,
          status: 'escalated_tier1' as TicketStatus
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to escalate ticket')
      }

      console.log('Ticket escalated successfully')
      await fetchTickets() // Refresh tickets after escalation
      toast.success('Ticket escalated successfully')
    } catch (err) {
      console.error('Error escalating ticket:', err)
      toast.error('Failed to escalate ticket')
    }
  }, [fetchTickets])

  const handleResolveTicket = useCallback(async (ticketId: string) => {
    try {
      console.log('Resolving ticket:', ticketId)
      const response = await fetch('/api/tickets/status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId,
          status: 'resolved' as TicketStatus
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to resolve ticket')
      }

      console.log('Ticket resolved successfully')
      await fetchTickets() // Refresh tickets after resolution
      toast.success('Ticket resolved successfully')
    } catch (err) {
      console.error('Error resolving ticket:', err)
      toast.error('Failed to resolve ticket')
    }
  }, [fetchTickets])

  const handleTicketUpdate = useCallback(async (ticketId: string, updates: Partial<DbTicket>) => {
    try {
      console.log('Updating ticket:', ticketId, updates)
      
      // If status is being updated, use the status API
      if (updates.status) {
        const response = await fetch('/api/tickets/status', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ticketId,
            status: updates.status as TicketStatus
          })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.message || 'Failed to update ticket status')
        }
      } else {
        // Handle other updates via Supabase
        const { error } = await supabase
          .from('tickets')
          .update(updates)
          .eq('id', ticketId)

        if (error) throw error
      }
      
      console.log('Ticket updated successfully')
      await fetchTickets() // Refresh tickets after update
      toast.success('Ticket updated successfully')
    } catch (err) {
      console.error('Error updating ticket:', err)
      toast.error('Failed to update ticket')
    }
  }, [supabase, fetchTickets])

  return { 
    tickets, 
    loading, 
    error, 
    refetch: fetchTickets,
    handleTicketUpdate,
    handleManualEscalation,
    handleResolveTicket
  }
}