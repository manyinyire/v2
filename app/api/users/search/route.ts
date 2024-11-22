import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { Database } from '@/types/supabase'

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })

    // Get current user's session
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError) throw authError
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get search query from URL
    const url = new URL(request.url)
    const query = url.searchParams.get('q')
    if (!query) {
      return NextResponse.json({ users: [] })
    }

    // Search for users by full name or email
    const { data: users, error: searchError } = await supabase
      .from('user_profiles')
      .select('id, full_name, email, role')
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(10)

    if (searchError) {
      console.error('Failed to search users:', searchError)
      return NextResponse.json({ error: 'Failed to search users' }, { status: 500 })
    }

    // Transform the response
    const transformedUsers = users?.map(user => ({
      id: user.id,
      full_name: user.full_name || 'Unknown',
      email: user.email || '',
      role: user.role
    })) || []

    return NextResponse.json({ users: transformedUsers })
  } catch (error) {
    console.error('Unexpected error in GET /api/users/search:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
