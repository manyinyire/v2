/**
 * @swagger
 * /api/tickets:
 *   get:
 *     summary: Get tickets
 *     description: Retrieve tickets based on user role. Admins and managers can view all tickets, while agents can only view tickets assigned to them.
 *     tags:
 *       - Tickets
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, in_progress, pending, resolved, closed]
 *         description: Filter tickets by status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *         description: Filter tickets by priority
 *       - in: query
 *         name: sbu_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter tickets by SBU
 *     responses:
 *       200:
 *         description: Successfully retrieved tickets
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tickets:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Ticket'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { Database } from '@/types/supabase'

// GET /api/tickets - Get all tickets (with role-based filtering)
export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    // Get current user's session
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError) throw authError
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's role
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (profileError) {
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 })
    }

    // Build query based on role
    const query = supabase
      .from('tickets')
      .select(`
        *,
        user_profiles!tickets_created_by_fkey(*),
        assigned_user:user_profiles!tickets_assigned_to_fkey(*),
        sbu(*)
      `)

    // Apply role-based filters
    if (userProfile.role === 'agent') {
      query.eq('assigned_to', session.user.id)
    }

    const { data: tickets, error: ticketsError } = await query

    if (ticketsError) {
      return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 })
    }

    return NextResponse.json({ tickets })
  } catch (error) {
    console.error('Error in GET /api/tickets:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * @swagger
 * /api/tickets:
 *   post:
 *     summary: Create a new ticket
 *     description: Create a new ticket in the system. The ticket will be automatically assigned based on SLA configurations.
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
 *               - title
 *               - description
 *               - priority
 *               - sbu_id
 *             properties:
 *               title:
 *                 type: string
 *                 description: Title of the ticket
 *               description:
 *                 type: string
 *                 description: Detailed description of the issue
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *                 description: Priority level of the ticket
 *               sbu_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the SBU this ticket belongs to
 *     responses:
 *       201:
 *         description: Successfully created ticket
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ticket:
 *                   $ref: '#/components/schemas/Ticket'
 *       400:
 *         description: Bad request - missing or invalid fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// POST /api/tickets - Create a new ticket
export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    // Get current user's session
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError) throw authError
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const {
      title,
      description,
      priority,
      sbu_id,
      card_number,
      system_module,
      account_number,
      query_type
    } = body

    // Validate required fields
    if (!title || !description || !priority || !sbu_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get SLA config for the SBU
    const { data: slaConfig, error: slaError } = await supabase
      .from('sla_configs')
      .select('sla_time')
      .eq('sbu_id', sbu_id)
      .eq('ticket_status', 'open')
      .single()

    if (slaError) {
      return NextResponse.json(
        { error: 'Failed to fetch SLA config' },
        { status: 500 }
      )
    }

    // Create the ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .insert({
        title,
        description,
        priority,
        sbu_id,
        status: 'open',
        created_by: session.user.id,
        sla_time: slaConfig.sla_time,
        card_number,
        system_module,
        account_number,
        query_type
      })
      .select(`
        *,
        user_profiles!tickets_created_by_fkey(*),
        assigned_user:user_profiles!tickets_assigned_to_fkey(*),
        sbu(*)
      `)
      .single()

    if (ticketError) {
      return NextResponse.json(
        { error: 'Failed to create ticket' },
        { status: 500 }
      )
    }

    return NextResponse.json({ ticket }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/tickets:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * @swagger
 * /api/tickets/{id}:
 *   put:
 *     summary: Update a ticket
 *     description: Update an existing ticket. Users can only update tickets they have access to based on their role.
 *     tags:
 *       - Tickets
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the ticket to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Title of the ticket
 *               description:
 *                 type: string
 *                 description: Detailed description of the issue
 *               status:
 *                 type: string
 *                 enum: [open, in_progress, pending, resolved, closed]
 *                 description: Current status of the ticket
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *                 description: Priority level of the ticket
 *               assigned_to:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the user this ticket is assigned to
 *     responses:
 *       200:
 *         description: Successfully updated ticket
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ticket:
 *                   $ref: '#/components/schemas/Ticket'
 *       400:
 *         description: Bad request - invalid fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - user does not have access to this ticket
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Ticket not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// PUT /api/tickets/:id - Update a ticket
export async function PUT(request: Request) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    // Get current user's session
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError) throw authError
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body and URL
    const body = await request.json()
    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing ticket ID' }, { status: 400 })
    }

    // Get current ticket
    const { data: currentTicket, error: ticketError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', id)
      .single()

    if (ticketError) {
      return NextResponse.json(
        { error: 'Failed to fetch current ticket' },
        { status: 500 }
      )
    }

    // Check if status is being updated
    if (body.status && body.status !== currentTicket.status) {
      // Get SLA config for new status
      const { data: slaConfig, error: slaError } = await supabase
        .from('sla_configs')
        .select('sla_time')
        .eq('sbu_id', currentTicket.sbu_id)
        .eq('ticket_status', body.status)
        .single()

      if (!slaError && slaConfig) {
        body.sla_time = slaConfig.sla_time
      }
    }

    // Update the ticket
    const { data: ticket, error: updateError } = await supabase
      .from('tickets')
      .update(body)
      .eq('id', id)
      .select(`
        *,
        user_profiles!tickets_created_by_fkey(*),
        assigned_user:user_profiles!tickets_assigned_to_fkey(*),
        sbu(*)
      `)
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update ticket' },
        { status: 500 }
      )
    }

    return NextResponse.json({ ticket })
  } catch (error) {
    console.error('Error in PUT /api/tickets:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * @swagger
 * /api/tickets/{id}:
 *   delete:
 *     summary: Delete a ticket
 *     description: Delete an existing ticket. Only accessible by admins.
 *     tags:
 *       - Tickets
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the ticket to delete
 *     responses:
 *       200:
 *         description: Successfully deleted ticket
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - user is not an admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Ticket not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// DELETE /api/tickets/:id - Delete a ticket
export async function DELETE(request: Request) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    // Get current user's session
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError) throw authError
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get ticket ID from URL
    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing ticket ID' }, { status: 400 })
    }

    // Delete the ticket
    const { error: deleteError } = await supabase
      .from('tickets')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete ticket' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/tickets:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
