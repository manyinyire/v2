import { useState, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'
import { toast } from 'sonner'

type UserRole = Database['public']['Enums']['user_role']

interface User {
  id: string
  full_name: string
  email: string
  role: UserRole
  avatar_url?: string
  created_at: string
  last_sign_in_at?: string
  sbu_id?: string
  sbu_name?: string
  tier?: string
}

interface NewUser {
  email: string
  full_name: string
  role: UserRole
  sbu_id?: string
}

interface UpdateUser {
  id: string
  full_name?: string
  email?: string
  role?: UserRole
  sbu_id?: string
  tier?: string
}

type UserProfileWithRelations = Database['public']['Tables']['user_profiles']['Row'] & {
  users: {
    email: string
    last_sign_in_at: string | null
  } | null
  tier_assignments: Array<{
    tier: string
    sbus: {
      id: string
      name: string
    } | null
  } | null> | null
}

export function useUserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClientComponentClient<Database>()

  // Helper function to handle errors
  const handleError = useCallback((error: any) => {
    console.error('Error:', error)
    setError(error instanceof Error ? error : new Error('An unexpected error occurred'))
    setLoading('error')
    toast.error(error instanceof Error ? error.message : 'An unexpected error occurred')
  }, [])

  // Fetch users with their relationships
  const fetchUsers = useCallback(async () => {
    try {
      setLoading('loading')
      
      const { data: userProfiles, error: profileError } = await supabase
        .from('user_profiles')
        .select(`
          id,
          full_name,
          role,
          avatar_url,
          created_at,
          tier_assignments (
            tier,
            sbus (
              id,
              name
            )
          ),
          users (
            email,
            last_sign_in_at
          )
        `)
        .eq('is_active', true)
        .returns<UserProfileWithRelations[]>()

      if (profileError) throw profileError

      // Transform the data
      const transformedUsers = userProfiles.map(profile => ({
        id: profile.id,
        full_name: profile.full_name || '',
        email: profile.users?.email || '',
        role: profile.role as UserRole,
        avatar_url: profile.avatar_url || undefined,
        created_at: profile.created_at,
        last_sign_in_at: profile.users?.last_sign_in_at || undefined,
        sbu_id: profile.tier_assignments?.[0]?.sbus?.id || undefined,
        sbu_name: profile.tier_assignments?.[0]?.sbus?.name || undefined,
        tier: profile.tier_assignments?.[0]?.tier || undefined
      }))

      setUsers(transformedUsers)
      setLoading('success')
    } catch (error) {
      handleError(error)
    }
  }, [supabase, handleError])

  // Create a new user
  const createUser = useCallback(async ({ email, full_name, role, sbu_id }: NewUser) => {
    try {
      setLoading('loading')

      // Create auth user first
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: Math.random().toString(36).slice(-8), // Generate random password
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (authError) throw authError

      // Create user profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: authData.user!.id,
          full_name,
          role,
          is_active: true
        })
        .select()
        .single()

      if (profileError) throw profileError

      // If SBU is provided, create tier assignment
      if (sbu_id) {
        const { error: tierError } = await supabase
          .from('tier_assignments')
          .insert({
            user_id: authData.user!.id,
            sbu_id,
            tier: 'standard'
          })

        if (tierError) throw tierError
      }

      await fetchUsers()
      setLoading('success')
      toast.success('User created successfully')
    } catch (error) {
      handleError(error)
    }
  }, [supabase, fetchUsers, handleError])

  // Update user
  const updateUser = useCallback(async ({ id, ...updates }: UpdateUser) => {
    try {
      setLoading('loading')

      // Update profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          full_name: updates.full_name,
          role: updates.role
        })
        .eq('id', id)

      if (profileError) throw profileError

      // Update tier assignment if SBU or tier is changed
      if (updates.sbu_id || updates.tier) {
        const { error: tierError } = await supabase
          .from('tier_assignments')
          .upsert({
            user_id: id,
            sbu_id: updates.sbu_id,
            tier: updates.tier || 'standard'
          })

        if (tierError) throw tierError
      }

      await fetchUsers()
      setLoading('success')
      toast.success('User updated successfully')
    } catch (error) {
      handleError(error)
    }
  }, [supabase, fetchUsers, handleError])

  // Delete user (soft delete)
  const deleteUser = useCallback(async (id: string) => {
    try {
      setLoading('loading')

      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: false })
        .eq('id', id)

      if (error) throw error

      await fetchUsers()
      setLoading('success')
      toast.success('User deleted successfully')
    } catch (error) {
      handleError(error)
    }
  }, [supabase, fetchUsers, handleError])

  return {
    users,
    loading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser
  }
}
