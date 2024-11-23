/**
 * @swagger
 * /api/tickets/priority:
 *   put:
 *     summary: Update ticket priority
 *     description: Update the priority of a ticket. Access is controlled by user role and ticket ownership.
 *     tags:
 *       - Tickets
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ticketId
 *               - priority
 *             properties:
 *               ticketId:
 *                 type: string
 *                 format: uuid
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *     responses:
 *       200:
 *         description: Ticket priority updated successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Ticket not found
 *       500:
 *         description: Internal server error
 */

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/supabase'

type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'

export async function PUT(request: Request) {
  try {
    const { ticketId, priority } = await request.json()

    // Validate input
    if (!ticketId || !priority) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const validPriorities: TicketPriority[] = ['low', 'medium', 'high', 'urgent']
    if (!validPriorities.includes(priority.toLowerCase() as TicketPriority)) {
      return NextResponse.json(
        { error: 'Invalid priority value' },
        { status: 400 }
      )
    }

    const supabase = createRouteHandlerClient<Database>({ cookies })

    // Get user session
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's role
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles_new')
      .select('role')
      .eq('user_id', session.user.id)
      .single()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
      return NextResponse.json(
        { error: 'Error fetching user profile' },
        { status: 500 }
      )
    }

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Get current ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single()

    if (ticketError) {
      console.error('Error fetching ticket:', ticketError)
      return NextResponse.json(
        { error: 'Error fetching ticket' },
        { status: 500 }
      )
    }

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Check permissions
    const canUpdatePriority = 
      userProfile.role === 'admin' ||
      userProfile.role === 'manager' ||
      (userProfile.role === 'agent' && ticket.assigned_to === session.user.id)

    if (!canUpdatePriority) {
      return NextResponse.json(
        { error: 'Insufficient permissions to update ticket priority' },
        { status: 403 }
      )
    }

    // Update ticket priority
    const { data: updatedTicket, error: updateError } = await supabase
      .from('tickets')
      .update({ 
        priority: priority.toLowerCase() as TicketPriority,
        updated_at: new Date().toISOString()
      })
      .eq('id', ticketId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating ticket:', updateError)
      return NextResponse.json(
        { error: 'Failed to update ticket priority' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Ticket priority updated successfully',
      ticket: updatedTicket
    })

  } catch (err) {
    console.error('Error in ticket priority update:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
