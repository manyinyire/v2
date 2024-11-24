import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { UserProfile, ApiError } from '@/types'

export function useUser() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)

  useEffect(() => {
    async function getProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setProfile(null)
          return
        }

        const { data: profile, error } = await supabase
          .from('user_profiles_new')
          .select('*, sbu:sbus(*)')
          .eq('user_id', user.id)
          .single()

        if (error) throw error

        setProfile(profile)
      } catch (error) {
        setError(error as ApiError)
      } finally {
        setIsLoading(false)
      }
    }

    getProfile()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        getProfile()
      } else {
        setProfile(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return { profile, isLoading, error }
}
