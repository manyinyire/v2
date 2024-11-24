import { createClient } from './client'
import { Database } from '@/types/supabase'

// Tickets
export const getTickets = async (sbuId?: string) => {
  const supabase = createClient()
  const query = supabase
    .from('tickets')
    .select('*, created_by:user_profiles_new(*), assigned_to:user_profiles_new(*)')
  
  if (sbuId) {
    query.eq('sbu_id', sbuId)
  }
  
  return await query.order('created_at', { ascending: false })
}

export const createTicket = async (data: Database['public']['Tables']['tickets']['Insert']) => {
  const supabase = createClient()
  return await supabase.from('tickets').insert(data).select().single()
}

export const updateTicket = async (id: string, data: Database['public']['Tables']['tickets']['Update']) => {
  const supabase = createClient()
  return await supabase.from('tickets').update(data).eq('id', id).select().single()
}

// SBUs
export const getSBUs = async () => {
  const supabase = createClient()
  return await supabase.from('sbus').select('*')
}

export const getSBUById = async (id: string) => {
  const supabase = createClient()
  return await supabase.from('sbus').select('*').eq('id', id).single()
}

// User Profiles
export const getUserProfile = async (userId: string) => {
  const supabase = createClient()
  return await supabase.from('user_profiles_new').select('*').eq('id', userId).single()
}

export const updateUserProfile = async (userId: string, data: Database['public']['Tables']['user_profiles_new']['Update']) => {
  const supabase = createClient()
  return await supabase.from('user_profiles_new').update(data).eq('id', userId)
}

// Settings
export const getUserSettings = async (userId: string) => {
  const supabase = createClient()
  return await supabase.from('settings').select('*').eq('user_id', userId).single()
}

export const updateUserSettings = async (userId: string, data: Database['public']['Tables']['settings']['Update']) => {
  const supabase = createClient()
  return await supabase.from('settings').update(data).eq('user_id', userId)
}

// Tier Assignments
export const getUserTiers = async (userId: string) => {
  const supabase = createClient()
  return await supabase
    .from('tier_assignments')
    .select('*, sbu:sbus(*)')
    .eq('user_id', userId)
}

export const assignTier = async (data: Database['public']['Tables']['tier_assignments']['Insert']) => {
  const supabase = createClient()
  return await supabase.from('tier_assignments').insert(data).select().single()
}

export const updateTierAssignment = async (id: string, data: Database['public']['Tables']['tier_assignments']['Update']) => {
  const supabase = createClient()
  return await supabase.from('tier_assignments').update(data).eq('id', id)
}
