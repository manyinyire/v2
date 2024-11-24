'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { Database } from '@/types/database'

type UserProfile = Database['public']['Tables']['user_profiles_new']['Row']

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
            .from('user_profiles_new')
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
          .from('user_profiles_new')
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
        .from('user_profiles_new')
        .insert({
          user_id: data.user.id,
          full_name: fullName,
          sbu,
          status: 'pending',
          role: 'user',
          email: email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (profileError) throw profileError

      toast.success('Account created successfully! Please wait for admin approval.')
      router.push('/auth/pending-approval')
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles_new')
      .select('*')
      .eq('email', email)
      .single()

    if (profileError) throw profileError

    if (profile.status === 'pending') {
      await supabase.auth.signOut()
      router.push('/auth/pending-approval')
      throw new Error('Your account is pending approval')
    }

    if (profile.status === 'inactive') {
      await supabase.auth.signOut()
      router.push('/auth/inactive')
      throw new Error('Your account has been deactivated')
    }

    // Update last_login timestamp
    await supabase
      .from('user_profiles_new')
      .update({
        last_login: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', profile.user_id)

    router.refresh()
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
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
      .from('user_profiles_new')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)

    if (error) throw error

    const { data: updatedProfile, error: fetchError } = await supabase
      .from('user_profiles_new')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (fetchError) throw fetchError
    setProfile(updatedProfile)
  }

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateProfile,
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
