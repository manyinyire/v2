import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/supabase'

type SBU = Database['public']['Tables']['sbus']['Row']
type UserProfile = Database['public']['Tables']['user_profiles']['Row']
type User = Database['public']['Tables']['users']['Row']

interface SBUWithProfiles extends SBU {
  user_profiles: Array<UserProfile & {
    users: User | null
  }> | null
}

export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => Promise.resolve(cookieStore) })

    // Fetch SBUs with related data
    const { data, error: sbusError } = await supabase
      .from('sbus')
      .select(`
        id,
        name,
        description,
        created_at,
        user_profiles (
          id,
          user_id,
          full_name,
          avatar_url,
          users (
            email,
            role
          )
        )
      `)

    if (sbusError) throw sbusError

    if (!data) {
      return NextResponse.json({ error: 'No SBUs found' }, { status: 404 })
    }

    // Transform the data to match the expected format
    const transformedSBUs = (data as unknown as SBUWithProfiles[]).map(sbu => ({
      id: sbu.id,
      name: sbu.name,
      description: sbu.description || '',
      status: 'active',
      lastUpdated: sbu.created_at,
      users: sbu.user_profiles?.reduce<Record<string, {
        id: string
        full_name: string
        email: string
        role: string
      }>>((acc, profile) => {
        if (profile && profile.user_id) {
          acc[profile.user_id] = {
            id: profile.user_id,
            full_name: profile.full_name,
            email: profile.users?.email || '',
            role: profile.users?.role || 'agent'
          }
        }
        return acc
      }, {}) || {}
    }))

    return NextResponse.json({ sbus: transformedSBUs })
  } catch (error) {
    console.error('Error fetching SBUs:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}