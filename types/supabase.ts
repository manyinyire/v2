export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      sbus: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          name: string
          description: string | null
          is_active: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          name: string
          description?: string | null
          is_active?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          name?: string
          description?: string | null
          is_active?: boolean
        }
      }
      user_profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          user_id: string
          full_name: string
          email: string
          role: Database['public']['Enums']['user_role']
          sbu_id: string | null
          is_active: boolean
          avatar_url: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id: string
          full_name: string
          email: string
          role?: Database['public']['Enums']['user_role']
          sbu_id?: string | null
          is_active?: boolean
          avatar_url?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          full_name?: string
          email?: string
          role?: Database['public']['Enums']['user_role']
          sbu_id?: string | null
          is_active?: boolean
          avatar_url?: string | null
        }
      }
      sla_configs: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          sbu_id: string
          priority: Database['public']['Enums']['ticket_priority']
          response_time_hours: number
          resolution_time_hours: number
          is_active: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          sbu_id: string
          priority: Database['public']['Enums']['ticket_priority']
          response_time_hours?: number
          resolution_time_hours?: number
          is_active?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          sbu_id?: string
          priority?: Database['public']['Enums']['ticket_priority']
          response_time_hours?: number
          resolution_time_hours?: number
          is_active?: boolean
        }
      }
      tickets: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          title: string
          description: string
          status: Database['public']['Enums']['ticket_status']
          priority: Database['public']['Enums']['ticket_priority']
          sla_time: number
          created_by: string
          assigned_to: string | null
          sbu_id: string
          resolution: string | null
          card_number: string | null
          system_module: string | null
          account_number: string | null
          query_type: string | null
          is_active: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          title: string
          description: string
          status?: Database['public']['Enums']['ticket_status']
          priority?: Database['public']['Enums']['ticket_priority']
          sla_time?: number
          created_by: string
          assigned_to?: string | null
          sbu_id: string
          resolution?: string | null
          card_number?: string | null
          system_module?: string | null
          account_number?: string | null
          query_type?: string | null
          is_active?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          title?: string
          description?: string
          status?: Database['public']['Enums']['ticket_status']
          priority?: Database['public']['Enums']['ticket_priority']
          sla_time?: number
          created_by?: string
          assigned_to?: string | null
          sbu_id?: string
          resolution?: string | null
          card_number?: string | null
          system_module?: string | null
          account_number?: string | null
          query_type?: string | null
          is_active?: boolean
        }
      }
      ticket_history: {
        Row: {
          id: string
          created_at: string
          ticket_id: string
          changed_by: string
          field_name: string
          old_value: string | null
          new_value: string
        }
        Insert: {
          id?: string
          created_at?: string
          ticket_id: string
          changed_by: string
          field_name: string
          old_value?: string | null
          new_value: string
        }
        Update: {
          id?: string
          created_at?: string
          ticket_id?: string
          changed_by?: string
          field_name?: string
          old_value?: string | null
          new_value?: string
        }
      }
      ticket_comments: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          ticket_id: string
          user_id: string
          content: string
          is_internal: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          ticket_id: string
          user_id: string
          content: string
          is_internal?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          ticket_id?: string
          user_id?: string
          content?: string
          is_internal?: boolean
        }
      }
    }
    Enums: {
      user_role: 'user' | 'agent' | 'manager' | 'admin'
      ticket_status: 'new' | 'assigned' | 'in_progress' | 'escalated' | 'resolved' | 'closed'
      ticket_priority: 'low' | 'medium' | 'high' | 'urgent'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}