import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })

    // Fetch user profiles with their roles
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select(`
        id,
        user_id,
        full_name,
        avatar_url,
        sbu_id,
        users (
          email,
          role
        )
      `)

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    // Transform the data to match the expected format
    const transformedUsers = users.map(user => ({
      id: user.user_id,
      full_name: user.full_name,
      email: user.users?.email || '',
      role: user.users?.role || 'agent',
      avatar_url: user.avatar_url,
      sbu_id: user.sbu_id
    }))

    return NextResponse.json({ users: transformedUsers })
  } catch (error) {
    console.error('Error in users API:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const body = await request.json()
    const { email, full_name, role, sbu_id } = body

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name, role }
    })

    if (authError) throw authError

    // Create user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        full_name,
        role
      })

    if (profileError) throw profileError

    // If SBU is provided, create tier assignment
    if (sbu_id) {
      const { error: tierError } = await supabase
        .from('tier_assignments')
        .insert({
          user_id: authData.user.id,
          sbu_id,
          tier: 'default'
        })

      if (tierError) throw tierError
    }

    return NextResponse.json({ message: 'User created successfully' })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to create user'
    }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    const body = await request.json()
    const { id, full_name, role, email, sbu_id } = body

    // Update user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({ full_name, role })
      .eq('id', id)

    if (profileError) throw profileError

    // Update email if provided
    if (email) {
      const { error: authError } = await supabase.auth.admin.updateUserById(
        id,
        { email }
      )
      if (authError) throw authError
    }

    // Update SBU assignment if provided
    if (sbu_id) {
      // First, remove existing assignments
      await supabase
        .from('tier_assignments')
        .delete()
        .eq('user_id', id)

      // Then add new assignment
      const { error: tierError } = await supabase
        .from('tier_assignments')
        .insert({
          user_id: id,
          sbu_id,
          tier: 'default'
        })

      if (tierError) throw tierError
    }

    return NextResponse.json({ message: 'User updated successfully' })
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to update user'
    }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Delete tier assignments first
    await supabase
      .from('tier_assignments')
      .delete()
      .eq('user_id', id)

    // Delete user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', id)

    if (profileError) throw profileError

    // Delete auth user
    const { error: authError } = await supabase.auth.admin.deleteUser(id)

    if (authError) throw authError

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to delete user'
    }, { status: 500 })
  }
}