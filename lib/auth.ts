import { createClientComponentClient, SupabaseClient } from '@supabase/auth-helpers-nextjs'
import { type Database } from '@/types/database'

export const createClient = () => 
  createClientComponentClient<Database>()

// Helper to get user role
export const getUserRole = async () => {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user?.user_metadata?.role as string | undefined
}

// Helper to check if user is admin
export const isAdmin = async () => {
  const role = await getUserRole()
  return role === 'admin'
}

// Helper to check user role from server component
export const checkUserRole = async (supabase: SupabaseClient<Database>) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  return profile?.role || null
}

// Helper to check if user has required role
export const hasRequiredRole = async (requiredRoles: string[]) => {
  const role = await getUserRole()
  return role ? requiredRoles.includes(role) : false
}

// Helper to check if user has access to SBU
export const hasAccessToSBU = async (sbuId: string) => {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return false

  const { data: profile } = await supabase
    .from('profiles')
    .select('sbu, role')
    .eq('id', session.user.id)
    .single()

  if (!profile) return false
  
  // Admins have access to all SBUs
  if (profile.role === 'admin') return true
  
  // Users only have access to their assigned SBU
  return profile.sbu === sbuId
}