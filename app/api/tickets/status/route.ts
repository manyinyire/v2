/**
 * @swagger
 * /api/tickets/status:
 *   patch:
 *     summary: Update ticket status
 *     description: Update the status of a ticket. Access is controlled by user role and ticket ownership.
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
 *               - status
 *             properties:
 *               ticketId:
 *                 type: string
 *                 format: uuid
 *               status:
 *                 type: string
 *                 enum: ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'ESCALATED_TIER1', 'ESCALATED_TIER2', 'ESCALATED_TIER3', 'RESOLVED', 'CLOSED']
 *     responses:
 *       200:
 *         description: Ticket status updated successfully
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

type TicketStatus = 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'ESCALATED_TIER1' | 'ESCALATED_TIER2' | 'ESCALATED_TIER3' | 'RESOLVED' | 'CLOSED'

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
    const validStatuses: TicketStatus[] = [
      'NEW',
      'ASSIGNED',
      'IN_PROGRESS',
      'ESCALATED_TIER1',
      'ESCALATED_TIER2',
      'ESCALATED_TIER3',
      'RESOLVED',
      'CLOSED'
    ]
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

    // Get user's role and SBU
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles_new')
      .select('role, sbu_id')
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
    const canUpdateStatus = 
      userProfile.role === 'admin' ||
      userProfile.role === 'manager' ||
      (userProfile.role === 'agent' && ticket.assigned_to === session.user.id)

    if (!canUpdateStatus) {
      return NextResponse.json(
        { error: 'Insufficient permissions to update ticket status' },
        { status: 403 }
      )
    }

    // Get SLA config for new status
    const { data: slaConfig, error: slaError } = await supabase
      .from('sla_configs')
      .select('sla_time')
      .eq('sbu_id', ticket.sbu_id)
      .eq('ticket_status', status)
      .single()

    if (slaError) {
      console.error('Error fetching SLA config:', slaError)
      return NextResponse.json(
        { error: 'Error fetching SLA configuration' },
        { status: 500 }
      )
    }

    // Calculate SLA deadline based on config
    const slaDeadline = slaConfig?.sla_time 
      ? new Date(Date.now() + slaConfig.sla_time * 60 * 60 * 1000) // Convert hours to milliseconds
      : null

    // Update ticket status
    const { error: updateError } = await supabase
      .from('tickets')
      .update({ 
        status: status as TicketStatus,
        updated_at: new Date().toISOString(),
        sla_deadline: slaDeadline?.toISOString(),
        ...(status === 'RESOLVED' ? { resolved_at: new Date().toISOString() } : {}),
        ...(status === 'CLOSED' ? { closed_at: new Date().toISOString() } : {})
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
      status,
      sla_deadline: slaDeadline
    })
  } catch (err) {
    console.error('Error in ticket status update:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
