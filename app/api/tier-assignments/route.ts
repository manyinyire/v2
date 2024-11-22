/**
 * @swagger
 * /api/tier-assignments:
 *   get:
 *     summary: Get tier assignments
 *     description: Retrieve tier assignments based on user role. Admins and managers can view all assignments, while agents can only view their own.
 *     tags:
 *       - Tier Assignments
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved tier assignments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 assignments:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       user_id:
 *                         type: string
 *                       sbu_id:
 *                         type: string
 *                       tier:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       updated_at:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { Database } from '@/types/supabase'

// GET /api/tier-assignments - Get all tier assignments
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

    // Only admin and managers can view all tier assignments
    if (!['admin', 'manager'].includes(userProfile.role)) {
      // For agents, only show their own assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from('tier_assignments')
        .select(`
          *,
          sbu:sbus(*),
          user:user_profiles(*)
        `)
        .eq('user_id', session.user.id)

      if (assignmentsError) {
        return NextResponse.json({ error: 'Failed to fetch tier assignments' }, { status: 500 })
      }

      return NextResponse.json({ assignments })
    }

    // Get all tier assignments with related data
    const { data: assignments, error: assignmentsError } = await supabase
      .from('tier_assignments')
      .select(`
        *,
        sbu:sbus(*),
        user:user_profiles(*)
      `)

    if (assignmentsError) {
      return NextResponse.json({ error: 'Failed to fetch tier assignments' }, { status: 500 })
    }

    return NextResponse.json({ assignments })
  } catch (error) {
    console.error('Error in GET /api/tier-assignments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * @swagger
 * /api/tier-assignments:
 *   post:
 *     summary: Create a new tier assignment
 *     description: Create a new tier assignment for a user to an SBU. Only accessible by admins and managers.
 *     tags:
 *       - Tier Assignments
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - sbu_id
 *               - tier
 *             properties:
 *               user_id:
 *                 type: string
 *                 description: ID of the user to assign
 *               sbu_id:
 *                 type: string
 *                 description: ID of the SBU to assign to
 *               tier:
 *                 type: string
 *                 description: Tier level for the assignment
 *     responses:
 *       201:
 *         description: Successfully created tier assignment
 *       400:
 *         description: Bad request - missing required fields or assignment already exists
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - user does not have required role
 *       500:
 *         description: Internal server error
 */
// POST /api/tier-assignments - Create a new tier assignment
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

    // Only admin and managers can create tier assignments
    if (!['admin', 'manager'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { user_id, sbu_id, tier } = body

    // Validate required fields
    if (!user_id || !sbu_id || !tier) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if assignment already exists
    const { data: existing } = await supabase
      .from('tier_assignments')
      .select('*')
      .eq('user_id', user_id)
      .eq('sbu_id', sbu_id)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Assignment already exists' },
        { status: 400 }
      )
    }

    // Create the tier assignment
    const { data: assignment, error: createError } = await supabase
      .from('tier_assignments')
      .insert({
        user_id,
        sbu_id,
        tier
      })
      .select(`
        *,
        sbu:sbus(*),
        user:user_profiles(*)
      `)
      .single()

    if (createError) {
      return NextResponse.json(
        { error: 'Failed to create tier assignment' },
        { status: 500 }
      )
    }

    return NextResponse.json({ assignment }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/tier-assignments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * @swagger
 * /api/tier-assignments/{id}:
 *   delete:
 *     summary: Delete a tier assignment
 *     description: Delete an existing tier assignment. Only accessible by admins and managers.
 *     tags:
 *       - Tier Assignments
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the tier assignment to delete
 *     responses:
 *       200:
 *         description: Successfully deleted tier assignment
 *       400:
 *         description: Bad request - missing assignment ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - user does not have required role
 *       500:
 *         description: Internal server error
 */
// DELETE /api/tier-assignments/:id - Delete a tier assignment
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

    // Only admin and managers can delete tier assignments
    if (!['admin', 'manager'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get assignment ID from URL
    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing assignment ID' }, { status: 400 })
    }

    // Delete the tier assignment
    const { error: deleteError } = await supabase
      .from('tier_assignments')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete tier assignment' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/tier-assignments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
