'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { Database } from '@/types/database'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

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
    const checkSession = async () => {
      try {
        console.log('AuthContext - checking session')
        const { data: { session }, error } = await supabase.auth.getSession()
        console.log('AuthContext - session:', session)
        
        if (error) {
          console.error('Session error:', error)
          return
        }

        if (session?.user) {
          setUser(session.user)
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles_new')
            .select('*')
            .eq('user_id', session.user.id)
            .single()
          
          if (profileError) {
            console.error('Profile error:', profileError)
          } else {
            console.log('AuthContext - profile:', profile)
            setProfile(profile)
          }
        }
      } catch (error) {
        console.error('Error checking session:', error)
      } finally {
        setLoading(false)
      }
    }

    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthContext - auth state changed:', event, session)
      
      if (session?.user) {
        setUser(session.user)
        const { data: profile, error } = await supabase
          .from('user_profiles_new')
          .select('*')
          .eq('user_id', session.user.id)
          .single()
        
        if (error) {
          console.error('Profile error:', error)
        } else {
          console.log('AuthContext - updated profile:', profile)
          setProfile(profile)
        }
      } else {
        setUser(null)
        setProfile(null)
      }
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router])

  const signUp = async (email: string, password: string, fullName: string, sbu: string) => {
    try {
      const { data: { user: newUser }, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) throw error

      if (newUser) {
        const { error: profileError } = await supabase
          .from('user_profiles_new')
          .insert([
            {
              user_id: newUser.id,
              full_name: fullName,
              email,
              sbu_id: sbu,
              role: 'user',
            },
          ])

        if (profileError) throw profileError
        toast.success('Registration successful! Please check your email to verify your account.')
      }
    } catch (error: any) {
      toast.error(error.message)
      throw error
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      router.push('/dashboard')
    } catch (error: any) {
      toast.error(error.message)
      throw error
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      router.push('/auth/login')
    } catch (error: any) {
      toast.error(error.message)
      throw error
    }
  }

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
      })
      if (error) throw error
      toast.success('Password reset instructions sent to your email.')
    } catch (error: any) {
      toast.error(error.message)
      throw error
    }
  }

  const updateProfile = async (data: Partial<UserProfile>) => {
    try {
      if (!user) throw new Error('No user logged in')

      const { error } = await supabase
        .from('user_profiles_new')
        .update(data)
        .eq('user_id', user.id)

      if (error) throw error
      
      setProfile((prev: UserProfile | null) => prev ? { ...prev, ...data } : null)
      toast.success('Profile updated successfully!')
    } catch (error: any) {
      toast.error(error.message)
      throw error
    }
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

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
