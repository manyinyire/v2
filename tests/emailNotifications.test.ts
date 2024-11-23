import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { User } from '@supabase/supabase-js'
import type { Database } from '../types/supabase'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.test' })

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Configure longer timeout for hooks
const HOOK_TIMEOUT = 30000

// Helper function to wait
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Helper function to retry operations
async function retry<T>(
  operation: () => Promise<T>,
  maxAttempts = 3,
  delay = 1000
): Promise<T> {
  let lastError: any
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      if (attempt === maxAttempts) throw error
      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`)
      await wait(delay)
    }
  }
  
  throw lastError
}

// Helper function to clean up a user
async function cleanupUser(email: string) {
  try {
    console.log(`Cleaning up user: ${email}`)
    
    // First try to find user in auth.users
    const { data: users } = await supabase.auth.admin.listUsers()
    const user = users.users.find(u => u.email === email)
    
    if (user) {
      console.log(`Found user with ID: ${user.id}`)
      
      // Delete all tickets associated with the user
      console.log('Deleting associated tickets...')
      await supabase.from('tickets')
        .delete()
        .or(`created_by.eq.${user.id},assigned_to.eq.${user.id}`)

      // Delete user profile
      console.log('Deleting user profile...')
      await supabase
        .from('user_profiles')
        .delete()
        .eq('user_id', user.id)
      
      // Delete auth user
      console.log('Deleting auth user...')
      await retry(async () => {
        await supabase.auth.admin.deleteUser(user.id)
      })
      
      console.log('User cleanup completed')
    } else {
      console.log('User not found in auth.users')
      
      // Try to find and delete any orphaned profiles
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', email)

      if (profiles && profiles.length > 0) {
        console.log('Found orphaned user profile, deleting...')
        await supabase
          .from('user_profiles')
          .delete()
          .eq('email', email)
      }
      
      // Direct database cleanup for auth.users
      console.log('Attempting direct database cleanup...')
      try {
        const { error } = await supabase.rpc('delete_user_by_email', { p_email: email })
        if (error) {
          if (error.code === 'PGRST202') {
            console.log('delete_user_by_email function not found, skipping direct cleanup')
          } else {
            console.error('Failed to delete user via RPC:', error)
          }
        }
      } catch (error) {
        console.error('Error calling delete_user_by_email:', error)
      }
    }

    // Wait a bit to ensure deletion is processed
    await wait(3000)
  } catch (error) {
    console.error(`Error cleaning up user ${email}:`, error)
  }
}

describe('Email Notification System', () => {
  let testUser: User | null = null
  let testAgent: User | null = null
  let testSbuId: string | null = null

  beforeAll(async () => {
    try {
      console.log('Starting test setup...')
      
      // Clean up any existing test users first
      console.log('Cleaning up existing test users...')
      await cleanupUser('test@example.com')
      await cleanupUser('agent@example.com')
      
      // Wait a bit to ensure cleanup is complete
      await wait(5000)
      
      // Create test SBU
      console.log('Creating test SBU...')
      const { data: sbu, error: sbuError } = await supabase
        .from('service_business_units')
        .upsert([
          {
            name: 'Test SBU',
            description: 'Test SBU for email notifications',
          },
        ])
        .select()
        .single()
      
      if (sbuError) {
        console.error('Failed to create SBU:', sbuError)
        throw sbuError
      }
      if (!sbu) {
        throw new Error('Failed to create SBU')
      }
      
      testSbuId = sbu.id
      console.log('Created SBU with ID:', testSbuId)

      // Create test user with retry
      console.log('Creating test user...')
      let auth;
      try {
        const result = await retry(async () => {
          return await supabase.auth.admin.createUser({
            email: 'test@example.com',
            password: 'testpassword123',
            email_confirm: true
          })
        })
        auth = result.data
        if (result.error) throw result.error
      } catch (error) {
        console.error('Failed to create test user:', error)
        throw error
      }

      if (!auth.user) throw new Error('Failed to create test user')
      
      testUser = auth.user
      console.log('Created test user with ID:', testUser.id)
      
      // Create user profile
      console.log('Creating user profile...')
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: testUser.id,
          email: testUser.email,
          full_name: 'Test User',
          sbu_id: testSbuId
        })
      
      if (profileError) {
        console.error('Failed to create user profile:', profileError)
        throw profileError
      }

      // Create test agent
      console.log('Creating test agent...')
      let agentAuth;
      try {
        const result = await retry(async () => {
          return await supabase.auth.admin.createUser({
            email: 'agent@example.com',
            password: 'agentpassword123',
            email_confirm: true
          })
        })
        agentAuth = result.data
        if (result.error) throw result.error
      } catch (error) {
        console.error('Failed to create test agent:', error)
        throw error
      }

      if (!agentAuth.user) throw new Error('Failed to create test agent')
      
      testAgent = agentAuth.user
      console.log('Created test agent with ID:', testAgent.id)
      
      // Create agent profile
      console.log('Creating agent profile...')
      const { error: agentProfileError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: testAgent.id,
          email: testAgent.email,
          full_name: 'Test Agent',
          sbu_id: testSbuId,
          is_agent: true
        })
      
      if (agentProfileError) {
        console.error('Failed to create agent profile:', agentProfileError)
        throw agentProfileError
      }

      console.log('Test setup completed successfully')
    } catch (error) {
      console.error('Error in test setup:', error)
      throw error
    }
  }, HOOK_TIMEOUT)

  afterAll(async () => {
    try {
      console.log('Starting test cleanup...')
      await cleanupUser('test@example.com')
      await cleanupUser('agent@example.com')
      
      if (testSbuId) {
        console.log('Cleaning up test SBU...')
        await supabase
          .from('service_business_units')
          .delete()
          .eq('id', testSbuId)
      }
      
      console.log('Test cleanup completed successfully')
    } catch (error) {
      console.error('Error in test cleanup:', error)
    }
  }, HOOK_TIMEOUT)

  it('should create a ticket and send new ticket notification', async () => {
    expect(testUser).not.toBeNull()
    expect(testSbuId).not.toBeNull()

    // Create a new ticket
    const { data: ticket, error } = await supabase
      .from('tickets')
      .insert({
        title: 'Test Ticket',
        description: 'Test ticket for email notification',
        status: 'new',
        priority: 'medium',
        created_by: testUser!.id,
        sbu_id: testSbuId!
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(ticket).not.toBeNull()

    // Verify the user profile has an email
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('user_id', testUser!.id)
      .single()

    expect(profile?.email).toBe('test@example.com')

    // Make API call to send email
    const emailResponse = await fetch('http://localhost:3000/api/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: profile?.email,
        subject: 'New Ticket Created',
        ticketId: ticket!.id,
        type: 'new_ticket',
        status: 'new'
      })
    })

    expect(emailResponse.ok).toBe(true)
  })

  it('should update ticket status and send notification', async () => {
    expect(testUser).not.toBeNull()
    expect(testAgent).not.toBeNull()
    expect(testSbuId).not.toBeNull()

    // Create a new ticket first
    const { data: ticket, error: createError } = await supabase
      .from('tickets')
      .insert({
        title: 'Test Ticket',
        description: 'Test ticket for status update notification',
        status: 'new',
        priority: 'medium',
        created_by: testUser!.id,
        sbu_id: testSbuId!
      })
      .select()
      .single()

    expect(createError).toBeNull()
    expect(ticket).not.toBeNull()

    // Update ticket status to assigned
    const { error: updateError } = await supabase
      .from('tickets')
      .update({
        status: 'assigned',
        assigned_to: testAgent!.id
      })
      .eq('id', ticket!.id)

    expect(updateError).toBeNull()

    // Send email notification to agent
    const emailResponse = await fetch('http://localhost:3000/api/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: 'agent@example.com',
        subject: 'Ticket Assigned',
        ticketId: ticket!.id,
        type: 'ticket_assigned',
        status: 'assigned'
      })
    })

    expect(emailResponse.ok).toBe(true)
  })

  it('should send escalation notifications', async () => {
    expect(testUser).not.toBeNull()
    expect(testAgent).not.toBeNull()
    expect(testSbuId).not.toBeNull()

    // Create a new ticket first
    const { data: ticket, error: createError } = await supabase
      .from('tickets')
      .insert({
        title: 'Test Ticket',
        description: 'Test ticket for escalation notification',
        status: 'new',
        priority: 'medium',
        created_by: testUser!.id,
        sbu_id: testSbuId!
      })
      .select()
      .single()

    expect(createError).toBeNull()
    expect(ticket).not.toBeNull()

    // Update ticket status to escalated
    const { error: updateError } = await supabase
      .from('tickets')
      .update({
        status: 'escalated'
      })
      .eq('id', ticket!.id)

    expect(updateError).toBeNull()

    // Get all relevant users who should be notified
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('sbu_id', testSbuId!)
      .eq('is_agent', true)

    expect(profiles).not.toBeNull()
    expect(profiles!.length).toBeGreaterThan(0)

    // Send notifications to all relevant parties
    for (const profile of profiles!) {
      const emailResponse = await fetch('http://localhost:3000/api/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: profile.email,
          subject: 'Ticket Escalated',
          ticketId: ticket!.id,
          type: 'ticket_escalated',
          status: 'escalated'
        })
      })

      expect(emailResponse.ok).toBe(true)
    }
  })

  it('should send resolution notification', async () => {
    expect(testUser).not.toBeNull()
    expect(testSbuId).not.toBeNull()

    // Create a new ticket first
    const { data: ticket, error: createError } = await supabase
      .from('tickets')
      .insert({
        title: 'Test Ticket',
        description: 'Test ticket for resolution notification',
        status: 'new',
        priority: 'medium',
        created_by: testUser!.id,
        sbu_id: testSbuId!
      })
      .select()
      .single()

    expect(createError).toBeNull()
    expect(ticket).not.toBeNull()

    // Update ticket status to resolved
    const { error: updateError } = await supabase
      .from('tickets')
      .update({
        status: 'resolved',
        resolution: 'Test resolution'
      })
      .eq('id', ticket!.id)

    expect(updateError).toBeNull()

    // Send resolution notification to creator
    const emailResponse = await fetch('http://localhost:3000/api/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: testUser!.email,
        subject: 'Ticket Resolved',
        ticketId: ticket!.id,
        type: 'ticket_resolved',
        status: 'resolved'
      })
    })

    expect(emailResponse.ok).toBe(true)
  })
})
