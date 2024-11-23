import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'

export interface UserProfile {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  sbu: string
  role: string
  phone_number: string | null
  department: string | null
  position: string | null
  last_login: string | null
}

export function useProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false)
      return
    }

    async function fetchProfile() {
      try {
        if (!user?.id) {
          setProfile(null)
          return
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (error) throw error

        setProfile(data)
        setError(null)
      } catch (err) {
        console.error('Error fetching profile:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch profile')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [user?.id, supabase])

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user?.id) return { error: new Error('No user logged in') }

    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error

      setProfile(data)
      return { data, error: null }
    } catch (err) {
      console.error('Error updating profile:', err)
      return { error: err instanceof Error ? err : new Error('Failed to update profile') }
    } finally {
      setIsLoading(false)
    }
  }

  const updateAvatar = async (file: File) => {
    if (!user?.id) return { error: new Error('No user logged in') }

    try {
      setIsLoading(true)

      // Upload image
      const fileExt = file.name.split('.').pop()
      const filePath = `${user.id}/avatar.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // Update profile
      const { data, error } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error

      setProfile(data)
      return { data, error: null }
    } catch (err) {
      console.error('Error updating avatar:', err)
      return { error: err instanceof Error ? err : new Error('Failed to update avatar') }
    } finally {
      setIsLoading(false)
    }
  }

  return {
    profile,
    isLoading,
    error,
    updateProfile,
    updateAvatar
  }
}
