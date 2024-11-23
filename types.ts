import type { Database } from './types/supabase'

// Define table types
type Tables = Database['public']['Tables']

// Base table types
export type UserProfile = {
  id: string
  full_name: string | null
  role: Database['public']['Enums']['user_role']
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

export type UserRole = Database['public']['Enums']['user_role']
export type TicketStatus = Database['public']['Enums']['ticket_status']
export type TicketPriority = Database['public']['Enums']['ticket_priority']

export interface Ticket {
  [x: string]: any
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
    ticket_status: TicketStatus
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