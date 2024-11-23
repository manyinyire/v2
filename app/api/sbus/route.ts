import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/types/supabase'
import { checkUserRole } from '@/lib/auth'

type SBU = Database['public']['Tables']['sbus']['Row']
type UserProfile = Database['public']['Tables']['user_profiles']['Row']
type TierAssignment = {
  id: string
  user_id: string
  tier: 1 | 2 | 3
}
type SLAConfig = {
  id: string
  ticket_status: 'new' | 'in_progress' | 'pending' | 'resolved'
  sla_time: number
}

interface SBUWithRelations extends SBU {
  tier_assignments?: TierAssignment[]
  sla_configs?: SLAConfig[]
  user_profiles?: UserProfile[]
}

interface SLAConfigPayload {
  new: number
  in_progress: number
  pending: number
  resolved: number
}

interface SBUCreatePayload {
  name: string
  description?: string
  slaConfigs: SLAConfigPayload
  tierAssignments?: {
    tier1: string[] // user IDs
    tier2: string[]
    tier3: string[]
  }
}

interface SBUUpdatePayload extends Partial<SBUCreatePayload> {
  is_active?: boolean
}

// Helper function to validate SBU payload
function validateSBUPayload(payload: SBUCreatePayload | SBUUpdatePayload): string | null {
  if ('name' in payload && (!payload.name || payload.name.trim().length === 0)) {
    return 'SBU name is required'
  }
  
  if ('slaConfigs' in payload) {
    const slaConfigs = payload.slaConfigs as SLAConfigPayload
    if (Object.values(slaConfigs).some(time => time <= 0)) {
      return 'SLA times must be positive numbers'
    }
  }

  return null
}

// GET - Fetch all SBUs or a specific SBU
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })
    
    // Check user role
    const userRole = await checkUserRole(supabase)
    if (!userRole) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const sbuId = url.searchParams.get('id')
    
    const query = supabase
      .from('sbus')
      .select(`
        *,
        tier_assignments (
          id,
          user_id,
          tier
        ),
        sla_configs (
          id,
          ticket_status,
          sla_time
        ),
        user_profiles (
          id,
          full_name,
          role
        )
      `)

    const { data: sbusData, error: sbusError } = sbuId
      ? await query.eq('id', sbuId).single()
      : await query

    if (sbusError) throw sbusError

    if (!sbusData) {
      return NextResponse.json({ error: 'No SBUs found' }, { status: 404 })
    }

    // Transform the data
    const transformData = (sbu: SBUWithRelations) => {
      const tierAssignments = {
        tier1: [] as string[],
        tier2: [] as string[],
        tier3: [] as string[]
      }

      // Group users by tier
      sbu.tier_assignments?.forEach(assignment => {
        const tier = `tier${assignment.tier}` as keyof typeof tierAssignments
        if (assignment.user_id) {
          tierAssignments[tier].push(assignment.user_id)
        }
      })

      // Transform SLA configs into a more usable format
      const slaConfigs = sbu.sla_configs?.reduce<SLAConfigPayload>((acc, config) => ({
        ...acc,
        [config.ticket_status]: config.sla_time
      }), {
        new: 0,
        in_progress: 0,
        pending: 0,
        resolved: 0
      })

      return {
        id: sbu.id,
        name: sbu.name,
        description: sbu.description,
        is_active: sbu.is_active,
        created_at: sbu.created_at,
        updated_at: sbu.updated_at,
        slaConfigs,
        tierAssignments,
        users: sbu.user_profiles?.reduce((acc, profile) => ({
          ...acc,
          [profile.id]: {
            id: profile.id,
            full_name: profile.full_name,
            role: profile.role
          }
        }), {})
      }
    }

    const transformedData = Array.isArray(sbusData) 
      ? sbusData.map(transformData)
      : transformData(sbusData)

    return NextResponse.json({ sbus: transformedData })
  } catch (error) {
    console.error('Error fetching SBUs:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// POST - Create a new SBU
export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })
    
    // Check admin role
    const userRole = await checkUserRole(supabase)
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 })
    }

    const payload: SBUCreatePayload = await request.json()
    
    // Validate payload
    const validationError = validateSBUPayload(payload)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    // Start a transaction
    const { data: sbu, error: sbuError } = await supabase
      .from('sbus')
      .insert({
        name: payload.name,
        description: payload.description,
        is_active: true
      })
      .select()
      .single()

    if (sbuError) throw sbuError

    // Insert SLA configs
    const slaConfigsToInsert = Object.entries(payload.slaConfigs).map(([status, time]) => ({
      sbu_id: sbu.id,
      ticket_status: status,
      sla_time: time
    }))

    const { error: slaError } = await supabase
      .from('sla_configs')
      .insert(slaConfigsToInsert)

    if (slaError) throw slaError

    // Insert tier assignments if provided
    if (payload.tierAssignments) {
      const tierAssignmentsToInsert = Object.entries(payload.tierAssignments)
        .flatMap(([tier, userIds]) =>
          userIds.map(userId => ({
            sbu_id: sbu.id,
            user_id: userId,
            tier: tier.charAt(tier.length - 1)
          }))
        )

      const { error: tierError } = await supabase
        .from('tier_assignments')
        .insert(tierAssignmentsToInsert)

      if (tierError) throw tierError
    }

    return NextResponse.json({ sbu }, { status: 201 })
  } catch (error) {
    console.error('Error creating SBU:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// PATCH - Update an existing SBU
export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })
    
    // Check admin role
    const userRole = await checkUserRole(supabase)
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 })
    }

    const url = new URL(request.url)
    const sbuId = url.searchParams.get('id')
    
    if (!sbuId) {
      return NextResponse.json({ error: 'SBU ID is required' }, { status: 400 })
    }

    const payload: SBUUpdatePayload = await request.json()
    
    // Validate payload
    const validationError = validateSBUPayload(payload)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    // Update SBU basic info
    const { error: sbuError } = await supabase
      .from('sbus')
      .update({
        ...(payload.name && { name: payload.name }),
        ...(payload.description && { description: payload.description }),
        ...(payload.is_active !== undefined && { is_active: payload.is_active })
      })
      .eq('id', sbuId)

    if (sbuError) throw sbuError

    // Update SLA configs if provided
    if (payload.slaConfigs) {
      // Delete existing configs
      await supabase
        .from('sla_configs')
        .delete()
        .eq('sbu_id', sbuId)

      // Insert new configs
      const slaConfigsToInsert = Object.entries(payload.slaConfigs).map(([status, time]) => ({
        sbu_id: sbuId,
        ticket_status: status,
        sla_time: time
      }))

      const { error: slaError } = await supabase
        .from('sla_configs')
        .insert(slaConfigsToInsert)

      if (slaError) throw slaError
    }

    // Update tier assignments if provided
    if (payload.tierAssignments) {
      // Delete existing assignments
      await supabase
        .from('tier_assignments')
        .delete()
        .eq('sbu_id', sbuId)

      // Insert new assignments
      const tierAssignmentsToInsert = Object.entries(payload.tierAssignments)
        .flatMap(([tier, userIds]) =>
          userIds.map(userId => ({
            sbu_id: sbuId,
            user_id: userId,
            tier: tier.charAt(tier.length - 1)
          }))
        )

      const { error: tierError } = await supabase
        .from('tier_assignments')
        .insert(tierAssignmentsToInsert)

      if (tierError) throw tierError
    }

    // Fetch updated SBU with all relations
    const { data: updatedSBU, error: fetchError } = await supabase
      .from('sbus')
      .select(`
        *,
        tier_assignments (
          id,
          user_id,
          tier
        ),
        sla_configs (
          id,
          ticket_status,
          sla_time
        ),
        user_profiles (
          id,
          full_name,
          role
        )
      `)
      .eq('id', sbuId)
      .single()

    if (fetchError) throw fetchError

    return NextResponse.json({ sbu: updatedSBU })
  } catch (error) {
    console.error('Error updating SBU:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// DELETE - Soft delete an SBU
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })
    
    // Check admin role
    const userRole = await checkUserRole(supabase)
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 })
    }

    const url = new URL(request.url)
    const sbuId = url.searchParams.get('id')
    
    if (!sbuId) {
      return NextResponse.json({ error: 'SBU ID is required' }, { status: 400 })
    }

    // Soft delete by updating status
    const { error: deleteError } = await supabase
      .from('sbus')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', sbuId)

    if (deleteError) throw deleteError

    return NextResponse.json({ message: 'SBU successfully deactivated' })
  } catch (error) {
    console.error('Error deleting SBU:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}