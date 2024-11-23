'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { Database } from '@/types/database'

type UserProfile = Database['public']['Tables']['user_profiles']['Row']

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signUp: (email: string, password: string, fullName: string, sbu: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updateProfile: (data: Partial<UserProfile>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    // Check initial session
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setUser(session.user)
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', session.user.id)
            .single()
          setProfile(profile)
        }
      } catch (error) {
        console.error('Error checking session:', error)
      } finally {
        setLoading(false)
      }
    }

    checkSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user)
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single()
        setProfile(profile)
      } else {
        setUser(null)
        setProfile(null)
      }
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signUp = async (email: string, password: string, fullName: string, sbu: string) => {
    const { error: signUpError, data } = await supabase.auth.signUp({
      email,
      password,
    })

    if (signUpError) throw signUpError

    if (data.user) {
      // Create user profile with pending status
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: data.user.id,
          full_name: fullName,
          sbu,
          status: 'pending',
          role: 'user',
          email: email,
        })

      if (profileError) throw profileError

      // Notify SBU managers of new signup
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          type: 'new_user',
          recipient_sbu: sbu,
          content: `New user signup: ${fullName} (${email}) for ${sbu} SBU`,
          metadata: {
            user_id: data.user.id,
            sbu,
            email,
            full_name: fullName,
          }
        })

      if (notificationError) throw notificationError
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error: signInError, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) throw signInError

    // Check if user is approved
    if (data.user) {
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('status')
        .eq('user_id', data.user.id)
        .single()

      if (profileError) throw profileError

      if (profile.status !== 'approved') {
        await supabase.auth.signOut()
        throw new Error('Your account is pending approval from SBU management.')
      }
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    router.push('/auth/signin')
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    if (error) throw error
  }

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) throw new Error('No user logged in')

    const { error } = await supabase
      .from('user_profiles')
      .update(data)
      .eq('user_id', user.id)

    if (error) throw error

    setProfile((prev: UserProfile | null) => prev ? { ...prev, ...data } : null)
  }

  const value = {
    user,
    profile,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateProfile,
    loading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
