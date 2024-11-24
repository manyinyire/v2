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
      user_profiles_new: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          user_id: string
          full_name: string
          email: string
          role: 'user' | 'agent' | 'manager' | 'admin'
          sbu: string
          status: 'pending' | 'active' | 'inactive'
          avatar_url: string | null
          last_login: string | null
          settings: Json | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id: string
          full_name: string
          email: string
          role?: 'user' | 'agent' | 'manager' | 'admin'
          sbu: string
          status?: 'pending' | 'active' | 'inactive'
          avatar_url?: string | null
          last_login?: string | null
          settings?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          full_name?: string
          email?: string
          role?: 'user' | 'agent' | 'manager' | 'admin'
          sbu?: string
          status?: 'pending' | 'active' | 'inactive'
          avatar_url?: string | null
          last_login?: string | null
          settings?: Json | null
        }
      }
      tickets: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          title: string
          description: string
          status: 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'ESCALATED_TIER1' | 'ESCALATED_TIER2' | 'ESCALATED_TIER3' | 'RESOLVED' | 'CLOSED'
          priority: 'low' | 'medium' | 'high' | 'urgent'
          created_by: string
          assigned_to: string | null
          sbu_id: string
          resolved_at: string | null
          closed_at: string | null
          sla_deadline: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          title: string
          description: string
          status?: 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'ESCALATED_TIER1' | 'ESCALATED_TIER2' | 'ESCALATED_TIER3' | 'RESOLVED' | 'CLOSED'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          created_by: string
          assigned_to?: string | null
          sbu_id: string
          resolved_at?: string | null
          closed_at?: string | null
          sla_deadline?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          title?: string
          description?: string
          status?: 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'ESCALATED_TIER1' | 'ESCALATED_TIER2' | 'ESCALATED_TIER3' | 'RESOLVED' | 'CLOSED'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          created_by?: string
          assigned_to?: string | null
          sbu_id?: string
          resolved_at?: string | null
          closed_at?: string | null
          sla_deadline?: string | null
          metadata?: Json | null
        }
      }
      sla_configs: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          sbu_id: string
          status: 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'ESCALATED_TIER1' | 'ESCALATED_TIER2' | 'ESCALATED_TIER3' | 'RESOLVED' | 'CLOSED'
          priority: 'low' | 'medium' | 'high' | 'urgent'
          sla_hours: number
          is_active: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          sbu_id: string
          status: 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'ESCALATED_TIER1' | 'ESCALATED_TIER2' | 'ESCALATED_TIER3' | 'RESOLVED' | 'CLOSED'
          priority: 'low' | 'medium' | 'high' | 'urgent'
          sla_hours: number
          is_active?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          sbu_id?: string
          status?: 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'ESCALATED_TIER1' | 'ESCALATED_TIER2' | 'ESCALATED_TIER3' | 'RESOLVED' | 'CLOSED'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          sla_hours?: number
          is_active?: boolean
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
          metadata: Json | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          ticket_id: string
          user_id: string
          content: string
          is_internal?: boolean
          metadata?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          ticket_id?: string
          user_id?: string
          content?: string
          is_internal?: boolean
          metadata?: Json | null
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
    }
    Enums: {
      user_role: 'user' | 'agent' | 'manager' | 'admin'
      ticket_status: 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'ESCALATED_TIER1' | 'ESCALATED_TIER2' | 'ESCALATED_TIER3' | 'RESOLVED' | 'CLOSED'
      ticket_priority: 'low' | 'medium' | 'high' | 'urgent'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}