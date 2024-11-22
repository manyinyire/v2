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
      tickets: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          title: string
          description: string
          status: 'open' | 'in_progress' | 'resolved' | 'closed'
          priority: 'low' | 'medium' | 'high' | 'urgent'
          assigned_to?: string
          created_by: string
          customer_id?: string
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          title: string
          description: string
          status?: 'open' | 'in_progress' | 'resolved' | 'closed'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          assigned_to?: string
          created_by: string
          customer_id?: string
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          title?: string
          description?: string
          status?: 'open' | 'in_progress' | 'resolved' | 'closed'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          assigned_to?: string
          created_by?: string
          customer_id?: string
        }
      }
      sla_configs: {
        Row: {
          id: string
          created_at: string
          priority: 'low' | 'medium' | 'high' | 'urgent'
          response_time_hours: number
          resolution_time_hours: number
        }
        Insert: {
          id?: string
          created_at?: string
          priority: 'low' | 'medium' | 'high' | 'urgent'
          response_time_hours: number
          resolution_time_hours: number
        }
        Update: {
          id?: string
          created_at?: string
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          response_time_hours?: number
          resolution_time_hours?: number
        }
      }
      tier_assignments: {
        Row: {
          id: string
          created_at: string
          customer_id: string
          tier: 'basic' | 'premium' | 'enterprise'
        }
        Insert: {
          id?: string
          created_at?: string
          customer_id: string
          tier: 'basic' | 'premium' | 'enterprise'
        }
        Update: {
          id?: string
          created_at?: string
          customer_id?: string
          tier?: 'basic' | 'premium' | 'enterprise'
        }
      }
      users: {
        Row: {
          id: string
          created_at: string
          email: string
          name: string
          role: 'admin' | 'manager' | 'agent'
        }
        Insert: {
          id?: string
          created_at?: string
          email: string
          name: string
          role?: 'admin' | 'manager' | 'agent'
        }
        Update: {
          id?: string
          created_at?: string
          email?: string
          name?: string
          role?: 'admin' | 'manager' | 'agent'
        }
      }
      user_profiles: {
        Row: {
          id: string
          created_at: string
          user_id: string
          full_name: string
          avatar_url?: string
          sbu_id?: string
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          full_name: string
          avatar_url?: string
          sbu_id?: string
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          full_name?: string
          avatar_url?: string
          sbu_id?: string
        }
      }
      sbus: {
        Row: {
          id: string
          created_at: string
          name: string
          description?: string
          parent_sbu_id?: string
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          description?: string
          parent_sbu_id?: string
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          description?: string
          parent_sbu_id?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}