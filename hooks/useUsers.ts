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

export function useUsers() {
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
  const createUser = useCallback(async (data: NewUser) => {
    try {
      setLoading('loading')

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: Math.random().toString(36).slice(-8), // Generate random password
        options: {
          data: {
            full_name: data.full_name,
            role: data.role
          }
        }
      })

      if (authError) throw authError

      // Create user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: authData.user!.id,
          full_name: data.full_name,
          role: data.role,
          is_active: true
        })

      if (profileError) throw profileError

      // Create tier assignment if SBU is provided
      if (data.sbu_id) {
        const { error: tierError } = await supabase
          .from('tier_assignments')
          .insert({
            user_id: authData.user!.id,
            sbu_id: data.sbu_id,
            tier: '1'
          })

        if (tierError) throw tierError
      }

      toast.success('User created successfully')
      await fetchUsers()
      setLoading('success')
    } catch (error) {
      handleError(error)
    }
  }, [supabase, fetchUsers, handleError])

  // Update an existing user
  const updateUser = useCallback(async (data: UpdateUser) => {
    try {
      setLoading('loading')

      // Update user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          full_name: data.full_name,
          role: data.role
        })
        .eq('id', data.id)

      if (profileError) throw profileError

      // Update email if provided
      if (data.email) {
        const { error: authError } = await supabase.auth.updateUser({
          email: data.email
        })

        if (authError) throw authError
      }

      // Update tier assignment if SBU is provided
      if (data.sbu_id) {
        // Remove existing assignments
        await supabase
          .from('tier_assignments')
          .delete()
          .eq('user_id', data.id)

        // Add new assignment
        const { error: tierError } = await supabase
          .from('tier_assignments')
          .insert({
            user_id: data.id,
            sbu_id: data.sbu_id,
            tier: data.tier || '1'
          })

        if (tierError) throw tierError
      }

      toast.success('User updated successfully')
      await fetchUsers()
      setLoading('success')
    } catch (error) {
      handleError(error)
    }
  }, [supabase, fetchUsers, handleError])

  // Delete a user
  const deleteUser = useCallback(async (userId: string) => {
    try {
      setLoading('loading')

      // Delete tier assignments first
      await supabase
        .from('tier_assignments')
        .delete()
        .eq('user_id', userId)

      // Soft delete user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ is_active: false })
        .eq('id', userId)

      if (profileError) throw profileError

      toast.success('User deleted successfully')
      await fetchUsers()
      setLoading('success')
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
