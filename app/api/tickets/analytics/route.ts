import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/supabase'

export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })

    // Get user session
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError) throw authError
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Get user's role and SBU
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select(`
        role,
        tier_assignments (
          tier,
          sbu_id
        )
      `)
      .eq('id', session.user.id)
      .single()

    if (profileError) throw profileError

    // Build query based on user's role and SBU
    let query = supabase
      .from('tickets')
      .select(`
        *,
        sbu:sbu_id(
          name
        )
      `)
      .eq('is_deleted', false)

    // Apply role-based filters
    if (userProfile.role === 'agent') {
      const sbuId = userProfile.tier_assignments?.[0]?.sbu_id
      if (!sbuId) {
        return new NextResponse('Agent not assigned to any SBU', { status: 400 })
      }
      query = query
        .eq('sbu_id', sbuId)
        .or(`assigned_to.eq.${session.user.id},created_by.eq.${session.user.id}`)
    } else if (userProfile.role === 'manager') {
      const sbuId = userProfile.tier_assignments?.[0]?.sbu_id
      if (!sbuId) {
        return new NextResponse('Manager not assigned to any SBU', { status: 400 })
      }
      query = query.eq('sbu_id', sbuId)
    }

    const { data: tickets, error: ticketsError } = await query
    if (ticketsError) throw ticketsError

    // Calculate analytics
    const analytics = {
      total: tickets.length,
      resolved: tickets.filter(t => t.status === 'resolved').length,
      byPriority: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      },
      byStatus: {
        open: 0,
        in_progress: 0,
        resolved: 0,
        closed: 0
      },
      bySBU: {} as Record<string, {
        total: number
        resolved: number
        avgResolutionTime: number
      }>,
      byDate: [] as { date: string; count: number }[]
    }

    // Process tickets
    tickets.forEach(ticket => {
      // Count by priority
      analytics.byPriority[ticket.priority as keyof typeof analytics.byPriority]++

      // Count by status
      analytics.byStatus[ticket.status as keyof typeof analytics.byStatus]++

      // Process SBU data
      const sbuName = ticket.sbu?.name || 'Unknown'
      if (!analytics.bySBU[sbuName]) {
        analytics.bySBU[sbuName] = {
          total: 0,
          resolved: 0,
          avgResolutionTime: 0
        }
      }
      analytics.bySBU[sbuName].total++
      
      if (ticket.status === 'resolved' && ticket.resolved_at) {
        analytics.bySBU[sbuName].resolved++
        const resolutionTime = new Date(ticket.resolved_at).getTime() - new Date(ticket.created_at).getTime()
        analytics.bySBU[sbuName].avgResolutionTime = 
          (analytics.bySBU[sbuName].avgResolutionTime * (analytics.bySBU[sbuName].resolved - 1) + resolutionTime) / 
          analytics.bySBU[sbuName].resolved
      }

      // Process date data
      const date = new Date(ticket.created_at).toISOString().split('T')[0]
      const dateEntry = analytics.byDate.find(d => d.date === date)
      if (dateEntry) {
        dateEntry.count++
      } else {
        analytics.byDate.push({ date, count: 1 })
      }
    })

    // Sort dates
    analytics.byDate.sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json(analytics)
  } catch (error) {
    console.error('Error:', error)
    return new NextResponse(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500 }
    )
  }
}
