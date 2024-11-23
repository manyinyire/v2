'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { createClientComponentClient, type SupabaseClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'

interface SupabaseContextType {
  supabase: SupabaseClient<Database>
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined)

export function useSupabase() {
  const context = useContext(SupabaseContext)
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider')
  }
  return context
}

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createClientComponentClient<Database>())

  return (
    <SupabaseContext.Provider value={{ supabase }}>
      {children}
    </SupabaseContext.Provider>
  )
}
