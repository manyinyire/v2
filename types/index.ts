// Import database types
import type { Database } from './supabase'

// Define table types
type Tables = Database['public']['Tables']

// Base table types
export type UserProfile = Tables['user_profiles']['Row']
export type SBU = Tables['sbus']['Row']
export type SLAConfig = Tables['sla_configs']['Row']
export type RawTicket = Tables['tickets']['Row']

// Export ticket status type from the database schema
export type TicketStatus = RawTicket['status']

// Enhanced types with relationships
export interface Ticket {
  id: string
  title: string
  description: string
  status: TicketStatus
  priority: 'low' | 'medium' | 'high' | 'urgent'
  sla_time: number
  created_at: string
  updated_at: string
  card_number?: string | null
  system_module?: string | null
  account_number?: string | null
  query_type?: string | null
  sbu_id: string
  created_by: UserProfile
  assigned_to: UserProfile | null
  sbu: SBU
}

// Re-export form types
export * from './forms'

// Re-export database types
export type { Database }