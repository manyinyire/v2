'use client'

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
  sbu?: string
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
      .from('user_profiles_new')
      .select('*')
      .eq('user_id', session.user.id)
      .single()

    if (profileError) {
      throw profileError
    }

    let query = supabase
      .from('tickets')
      .select(`
        *,
        creator:created_by (
          user_id,
          email,
          full_name,
          role,
          sbu,
          avatar_url,
          created_at,
          updated_at,
          status
        ),
        assignee:assigned_to (
          user_id,
          email,
          full_name,
          role,
          sbu,
          avatar_url,
          created_at,
          updated_at,
          status
        )
      `)

    // Apply role-based filters
    if (userProfile.role === 'agent') {
      query = query
        .eq('sbu_id', userProfile.sbu)
        .or(`assigned_to.eq.${session.user.id},created_by.eq.${session.user.id}`)
    } else if (userProfile.role === 'manager') {
      query = query.eq('sbu_id', userProfile.sbu)
    }

    return { query, userProfile }
  }, [session, supabase])

  // Fetch tickets with filters
  const fetchTickets = useCallback(async () => {
    if (!session?.user?.id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const result = await buildBaseQuery()
      if (!result) {
        setLoading(false)
        return
      }

      const { query } = result
      let filteredQuery = query

      // Apply filters
      if (filters.status?.length) {
        filteredQuery = filteredQuery.in('status', filters.status)
      }
      if (filters.priority?.length) {
        filteredQuery = filteredQuery.in('priority', filters.priority)
      }
      if (filters.sbu) {
        filteredQuery = filteredQuery.eq('sbu_id', filters.sbu)
      }
      if (filters.assigned_to) {
        filteredQuery = filteredQuery.eq('assigned_to', filters.assigned_to)
      }
      if (filters.search) {
        filteredQuery = filteredQuery.or(
          `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        )
      }
      if (filters.dateRange) {
        filteredQuery = filteredQuery
          .gte('created_at', filters.dateRange.start.toISOString())
          .lte('created_at', filters.dateRange.end.toISOString())
      }

      // Order by created_at desc
      const { data, error: fetchError } = await filteredQuery
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      setTickets(data || [])
    } catch (err) {
      console.error('Error fetching tickets:', err)
      setError(err as PostgrestError)
      toast.error('Failed to fetch tickets')
    } finally {
      setLoading(false)
    }
  }, [buildBaseQuery, filters, session])

  // Create a new ticket
  const createTicket = async (input: TicketInput) => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .insert({
          ...input,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      setTickets(prev => [data, ...prev])
      toast.success('Ticket created successfully')
      return data
    } catch (err) {
      console.error('Error creating ticket:', err)
      toast.error('Failed to create ticket')
      throw err
    }
  }

  // Update a ticket
  const updateTicket = async (id: string, updates: TicketUpdate) => {
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
        prev.map(ticket => (ticket.id === id ? data : ticket))
      )
      toast.success('Ticket updated successfully')
      return data
    } catch (err) {
      console.error('Error updating ticket:', err)
      toast.error('Failed to update ticket')
      throw err
    }
  }

  // Delete a ticket (soft delete)
  const deleteTicket = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({
          is_deleted: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error

      setTickets(prev => prev.filter(ticket => ticket.id !== id))
      toast.success('Ticket deleted successfully')
    } catch (err) {
      console.error('Error deleting ticket:', err)
      toast.error('Failed to delete ticket')
      throw err
    }
  }

  // Fetch tickets when session or filters change
  useEffect(() => {
    fetchTickets()
  }, [fetchTickets, session?.user?.id])

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