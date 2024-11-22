/**
 * @swagger
 * /api/sla-configs:
 *   get:
 *     summary: Get SLA configurations
 *     description: Retrieve all SLA configurations. Only accessible by admins and managers.
 *     tags:
 *       - SLA Configurations
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved SLA configurations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 slaConfigs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SLAConfig'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - user is not an admin or manager
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

// GET /api/sla-configs - Get all SLA configs
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
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (profileError) {
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 })
    }

    // Only admin and managers can view SLA configs
    if (!['admin', 'manager'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get SLA configs with SBU information
    const { data: slaConfigs, error: configsError } = await supabase
      .from('sla_configs')
      .select(`
        *,
        sbu:sbus(*)
      `)

    if (configsError) {
      return NextResponse.json({ error: 'Failed to fetch SLA configs' }, { status: 500 })
    }

    return NextResponse.json({ slaConfigs })
  } catch (error) {
    console.error('Error in GET /api/sla-configs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * @swagger
 * /api/sla-configs:
 *   post:
 *     summary: Create a new SLA configuration
 *     description: Create a new SLA configuration for an SBU. Only accessible by admins.
 *     tags:
 *       - SLA Configurations
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sbu_id
 *               - ticket_status
 *               - sla_time
 *             properties:
 *               sbu_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the SBU this configuration belongs to
 *               ticket_status:
 *                 type: string
 *                 description: Ticket status for this SLA
 *               sla_time:
 *                 type: integer
 *                 description: SLA time in minutes
 *     responses:
 *       201:
 *         description: Successfully created SLA configuration
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 slaConfig:
 *                   $ref: '#/components/schemas/SLAConfig'
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
 *       403:
 *         description: Forbidden - user is not an admin
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
// POST /api/sla-configs - Create a new SLA config
export async function POST(request: Request) {
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
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (profileError) {
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 })
    }

    // Only admin can create SLA configs
    if (userProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { sbu_id, ticket_status, sla_time } = body

    // Validate required fields
    if (!sbu_id || !ticket_status || !sla_time) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create the SLA config
    const { data: slaConfig, error: createError } = await supabase
      .from('sla_configs')
      .insert({
        sbu_id,
        ticket_status,
        sla_time
      })
      .select(`
        *,
        sbu:sbus(*)
      `)
      .single()

    if (createError) {
      return NextResponse.json(
        { error: 'Failed to create SLA config' },
        { status: 500 }
      )
    }

    return NextResponse.json({ slaConfig }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/sla-configs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * @swagger
 * /api/sla-configs/{id}:
 *   put:
 *     summary: Update an SLA configuration
 *     description: Update an existing SLA configuration. Only accessible by admins.
 *     tags:
 *       - SLA Configurations
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the SLA configuration to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ticket_status:
 *                 type: string
 *                 description: Ticket status for this SLA
 *               sla_time:
 *                 type: integer
 *                 description: SLA time in minutes
 *     responses:
 *       200:
 *         description: Successfully updated SLA configuration
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 slaConfig:
 *                   $ref: '#/components/schemas/SLAConfig'
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
 *         description: Forbidden - user is not an admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: SLA configuration not found
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
// PUT /api/sla-configs/:id - Update an SLA config
export async function PUT(request: Request) {
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
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (profileError) {
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 })
    }

    // Only admin can update SLA configs
    if (userProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Parse request body and URL
    const body = await request.json()
    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing SLA config ID' }, { status: 400 })
    }

    // Update the SLA config
    const { data: slaConfig, error: updateError } = await supabase
      .from('sla_configs')
      .update(body)
      .eq('id', id)
      .select(`
        *,
        sbu:sbus(*)
      `)
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update SLA config' },
        { status: 500 }
      )
    }

    return NextResponse.json({ slaConfig })
  } catch (error) {
    console.error('Error in PUT /api/sla-configs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * @swagger
 * /api/sla-configs/{id}:
 *   delete:
 *     summary: Delete an SLA configuration
 *     description: Delete an existing SLA configuration. Only accessible by admins.
 *     tags:
 *       - SLA Configurations
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the SLA configuration to delete
 *     responses:
 *       200:
 *         description: Successfully deleted SLA configuration
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
 *         description: SLA configuration not found
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
// DELETE /api/sla-configs/:id - Delete an SLA config
export async function DELETE(request: Request) {
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
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (profileError) {
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 })
    }

    // Only admin can delete SLA configs
    if (userProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get SLA config ID from URL
    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing SLA config ID' }, { status: 400 })
    }

    // Delete the SLA config
    const { error: deleteError } = await supabase
      .from('sla_configs')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete SLA config' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/sla-configs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
