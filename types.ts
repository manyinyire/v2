import type { Database } from './types/supabase'

// Define table types
type Tables = Database['public']['Tables']

// Base table types
export type UserProfile = {
  id: string
  full_name: string | null
  role: 'admin' | 'manager' | 'agent'
  created_at: string
  updated_at: string
}

export type SBU = {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export type TicketStatus = 'open' | 'escalated_tier1' | 'escalated_tier2' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Ticket {
  id: string
  title: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  created_by: UserProfile
  assigned_to: UserProfile | null
  sbu: SBU
  sla_time: number
  created_at: string
  updated_at: string
  card_number?: string | null
  system_module?: string | null
  account_number?: string | null
  query_type?: string | null
}

export interface SbuWithRelations extends SBU {
  sla_configs: {
    id: string
    ticket_status: 'open' | 'escalated_tier1' | 'escalated_tier2'
    sla_time: number
  }[]
  tier_assignments: {
    id: string
    user_id: string
    tier: string
    user: {
      id: string
      full_name: string | null
    }
  }[]
}