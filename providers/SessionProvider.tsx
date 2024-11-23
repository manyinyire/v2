'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Session } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'

interface SessionContextType {
  session: Session | null
  loading: boolean
  error: Error | null
}

const SessionContext = createContext<SessionContextType>({
  session: null,
  loading: true,
  error: null
})

export function useSession() {
  return useContext(SessionContext)
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    // Initial session check
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        setError(error)
      } else {
        setSession(session)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  return (
    <SessionContext.Provider value={{ session, loading, error }}>
      {children}
    </SessionContext.Provider>
  )
}
