import type { Database } from './supabase'

// Enum Types
export type UserRole = Database['public']['Enums']['user_role']
export type TicketStatus = Database['public']['Enums']['ticket_status']
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'

// Base Types from Database
type Tables = Database['public']['Tables']
type DbSBU = Tables['sbus']['Row']
type DbUserProfile = Tables['user_profiles']['Row']
type DbTicket = Tables['tickets']['Row']
type DbTicketComment = Tables['ticket_comments']['Row']
type DbTicketHistory = Tables['ticket_history']['Row']
type DbSLAConfig = Tables['sla_configs']['Row']

// Enhanced Types with Relationships
export interface SBU extends DbSBU {
  tickets?: Ticket[]
  users?: UserProfile[]
  sla_configs?: SLAConfig[]
}

export interface UserProfile extends DbUserProfile {
  id: string
  email: string
  full_name: string
  role: UserRole
  sbu_id: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
  sbu?: SBU
  assigned_tickets?: Ticket[]
  created_tickets?: Ticket[]
  ticket_comments?: TicketComment[]
  ticket_history?: TicketHistory[]
}

export interface SLAConfig extends DbSLAConfig {
  id: string
  sbu_id: string
  priority: TicketPriority
  response_time_hours: number
  resolution_time_hours: number
  created_at: string
  updated_at: string
  sbu?: SBU
}

export interface Ticket extends DbTicket {
  id: string
  title: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  created_by: string
  assigned_to: string | null
  resolution: string | null
  created_at: string
  updated_at: string
  sbu_id: string
  card_number: string | null
  system_module: string | null
  account_number: string | null
  query_type: string | null
  is_active: boolean
  sbu?: SBU
  creator?: UserProfile
  assignee?: UserProfile
  comments?: TicketComment[]
  history?: TicketHistory[]
  sla_config?: SLAConfig
}

export interface TicketComment extends DbTicketComment {
  id: string
  ticket_id: string
  content: string
  created_at: string
  updated_at: string
  user_id: string
  is_internal: boolean
  user?: UserProfile
  ticket?: Ticket
}

export interface TicketHistory extends DbTicketHistory {
  ticket: Ticket
  changed_by_user: UserProfile
}

// Form Types
export interface CreateTicketForm {
  title: string
  description: string
  priority: TicketPriority
  sbu_id: string
  card_number?: string
  system_module?: string
  account_number?: string
  query_type?: string
}

export interface UpdateTicketForm {
  status?: TicketStatus
  priority?: TicketPriority
  assigned_to?: string
  resolution?: string
}

export interface AddCommentForm {
  content: string
  is_internal: boolean
}

// State Types
export interface FilterState {
  status?: TicketStatus[]
  priority?: TicketPriority[]
  sbu_id?: string[]
  created_by?: string[]
  assigned_to?: string[]
  search?: string
  dateRange?: {
    start: Date
    end: Date
  }
}

export interface PaginationState {
  page: number
  pageSize: number
  total: number
}

export interface SortState {
  field: keyof Ticket
  direction: 'asc' | 'desc'
}

// Loading States
export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

// Error Types
export interface ApiError extends Error {
  status?: number
  code?: string
  message: string
}

// Auth Types
export interface User {
  id: string
  email: string
  role: UserRole
  profile: UserProfile
  sbu: SBU | null
}

export interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  isLoading: boolean
  error: ApiError | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

// Component Props Types
export interface TicketTableProps {
  tickets: (Ticket & { assignee?: UserProfile })[]
  showAssignee?: boolean
  onView?: (ticket: Ticket) => void
  onAssign?: (ticketId: string) => void
  onEscalate?: (ticketId: string) => void
  onResolve?: (ticketId: string) => void
  onComment?: (ticketId: string) => void
  userRole?: UserRole
}

export interface FilterBarProps {
  filters: FilterState
  onFilterChange: (filters: FilterState) => void
  userRole?: UserRole
}

export interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

// Utility Types
export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>
export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] }