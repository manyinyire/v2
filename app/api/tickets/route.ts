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
 *           enum: ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'ESCALATED_TIER1', 'ESCALATED_TIER2', 'ESCALATED_TIER3', 'RESOLVED', 'CLOSED']
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
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search tickets by title or description
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number for pagination
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *         description: Number of tickets per page
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
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     pageSize:
 *                       type: integer
 *                     total:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/supabase'

export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    const { searchParams } = new URL(request.url)

    // Get user session
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError) throw authError
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's role and SBU
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles_new')
      .select('role, sbu_id')
      .eq('user_id', session.user.id)
      .single()

    if (profileError) throw profileError
    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Build query
    let query = supabase
      .from('tickets')
      .select(`
        *,
        assigned_to:user_profiles_new!assigned_to(full_name, email),
        created_by:user_profiles_new!created_by(full_name, email),
        sbu:sbus(name)
      `)

    // Apply filters based on user role
    if (userProfile.role === 'agent') {
      query = query.eq('assigned_to', session.user.id)
    } else if (userProfile.role === 'user') {
      query = query.eq('created_by', session.user.id)
    } else if (userProfile.role === 'manager') {
      query = query.eq('sbu_id', userProfile.sbu_id)
    }
    // Admins can see all tickets

    // Apply status filter
    const status = searchParams.get('status')
    if (status) {
      query = query.eq('status', status)
    }

    // Apply priority filter
    const priority = searchParams.get('priority')
    if (priority) {
      query = query.eq('priority', priority)
    }

    // Apply SBU filter (only for admins and managers)
    const sbuId = searchParams.get('sbu_id')
    if (sbuId && ['admin', 'manager'].includes(userProfile.role)) {
      query = query.eq('sbu_id', sbuId)
    }

    // Apply search filter
    const search = searchParams.get('search')
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    }

    // Apply pagination
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    const start = (page - 1) * pageSize
    const end = start + pageSize - 1

    // Get total count for pagination
    const { count } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })

    // Get paginated results
    const { data: tickets, error: ticketsError } = await query
      .order('created_at', { ascending: false })
      .range(start, end)

    if (ticketsError) throw ticketsError

    return NextResponse.json({
      tickets,
      pagination: {
        page,
        pageSize,
        total: count
      }
    })

  } catch (error) {
    console.error('Error in GET /api/tickets:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * @swagger
 * /api/tickets:
 *   post:
 *     summary: Create a new ticket
 *     description: Create a new ticket in the system
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
 *               description:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *               sbu_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Ticket created successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    const body = await request.json()

    // Get user session
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError) throw authError
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate required fields
    const { title, description, priority, sbu_id } = body
    if (!title || !description || !priority || !sbu_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .insert({
        title,
        description,
        priority,
        sbu_id,
        status: 'NEW',
        created_by: session.user.id
      })
      .select()
      .single()

    if (ticketError) throw ticketError

    return NextResponse.json(ticket, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/tickets:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * @swagger
 * /api/tickets:
 *   put:
 *     summary: Update a ticket
 *     description: Update an existing ticket. Only admins, managers, and assigned agents can update tickets.
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
 *               - id
 *             properties:
 *               id:
 *                 type: string
 *                 format: uuid
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *               status:
 *                 type: string
 *                 enum: ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'ESCALATED_TIER1', 'ESCALATED_TIER2', 'ESCALATED_TIER3', 'RESOLVED', 'CLOSED']
 *               assigned_to:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Ticket updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Ticket not found
 *       500:
 *         description: Internal server error
 */
export async function PUT(request: Request) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    const body = await request.json()

    // Get user session
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError) throw authError
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's role
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles_new')
      .select('role, sbu_id')
      .eq('user_id', session.user.id)
      .single()

    if (profileError) throw profileError
    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Get current ticket
    const { data: currentTicket, error: ticketError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', body.id)
      .single()

    if (ticketError) throw ticketError
    if (!currentTicket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Check permissions
    const canUpdate = userProfile.role === 'admin' ||
      userProfile.role === 'manager' ||
      (userProfile.role === 'agent' && currentTicket.assigned_to === session.user.id)

    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update ticket
    const { data: ticket, error: updateError } = await supabase
      .from('tickets')
      .update({
        title: body.title,
        description: body.description,
        priority: body.priority,
        status: body.status,
        assigned_to: body.assigned_to,
        updated_at: new Date().toISOString()
      })
      .eq('id', body.id)
      .select()
      .single()

    if (updateError) throw updateError

    return NextResponse.json(ticket)

  } catch (error) {
    console.error('Error in PUT /api/tickets:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * @swagger
 * /api/tickets:
 *   delete:
 *     summary: Delete a ticket
 *     description: Delete an existing ticket. Only admins and managers can delete tickets.
 *     tags:
 *       - Tickets
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Ticket ID
 *     responses:
 *       200:
 *         description: Ticket deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Ticket not found
 *       500:
 *         description: Internal server error
 */
export async function DELETE(request: Request) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Missing ticket ID' },
        { status: 400 }
      )
    }

    // Get user session
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError) throw authError
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's role
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles_new')
      .select('role')
      .eq('user_id', session.user.id)
      .single()

    if (profileError) throw profileError
    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Check permissions
    if (!['admin', 'manager'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete ticket
    const { error: deleteError } = await supabase
      .from('tickets')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    return NextResponse.json({ message: 'Ticket deleted successfully' })

  } catch (error) {
    console.error('Error in DELETE /api/tickets:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
