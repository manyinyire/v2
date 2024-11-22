import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/supabase'

type TicketStatus = 'open' | 'escalated_tier1' | 'escalated_tier2' | 'resolved' | 'closed'

export async function PATCH(request: Request) {
  try {
    const { ticketId, status } = await request.json()

    if (!ticketId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate status
    const validStatuses: TicketStatus[] = ['open', 'escalated_tier1', 'escalated_tier2', 'resolved', 'closed']
    if (!validStatuses.includes(status as TicketStatus)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      )
    }

    const supabase = createRouteHandlerClient<Database>({ cookies })

    // Get current user session
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Update ticket status
    const { error: updateError } = await supabase
      .from('tickets')
      .update({ 
        status: status as TicketStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', ticketId)

    if (updateError) {
      console.error('Error updating ticket:', updateError)
      return NextResponse.json(
        { error: 'Failed to update ticket status' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      message: 'Ticket status updated successfully',
      ticketId,
      status
    })
  } catch (err) {
    console.error('Error in ticket status update:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
