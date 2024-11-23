import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'
import { useCallback } from 'react'

export const createClient = () => createClientComponentClient<Database>()

export function useSupabase() {
  const supabase = createClient()

  const getClient = useCallback(() => {
    return supabase
  }, [supabase])

  return { supabase: getClient() }
}
