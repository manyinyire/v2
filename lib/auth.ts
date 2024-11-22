import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { type Database } from '@/types/database'

export const createClient = () => 
  createClientComponentClient<Database>()

// Helper to get user role
export const getUserRole = async () => {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user?.user_metadata?.role
}

// Helper to check if user is admin
export const isAdmin = async () => {
  const role = await getUserRole()
  return role === 'admin'
} 