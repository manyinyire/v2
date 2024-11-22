import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { Database } from '@/types/supabase'
import { SupabaseClient } from '@supabase/supabase-js'

// Load environment variables
config()

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) throw new Error('NEXT_PUBLIC_SUPABASE_URL is required')
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required')

// Initialize Supabase client with admin privileges
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function createOrUpdateUser(
  supabase: SupabaseClient<Database>,
  userData: { 
    email: string; 
    password: string; 
    name: string; 
    role: 'admin' | 'manager' | 'agent' 
  }
) {
  const { email, password, name, role } = userData
  
  console.log(`Processing user: ${email}`)
  
  // First, try to delete the existing user if any
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const matchingUser = existingUsers?.users?.find(user => user.email === email)
  
  if (matchingUser) {
    const userId = matchingUser.id
    console.log(`Deleting existing user: ${email}`)
    await supabase.auth.admin.deleteUser(userId)
  }
  
  // Create new user
  console.log(`Creating new user: ${email}`)
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name, role }
  })
  
  if (error) {
    console.error(`Error creating user ${email}:`, error)
    return null
  }
  
  console.log(`Created user successfully: ${email}`)
  
  // Create user profile
  const { error: profileError } = await supabase
    .from('user_profiles')
    .upsert({
      id: data.user.id,
      full_name: name,
      role: role as 'admin' | 'manager' | 'agent'
    })
  
  if (profileError) {
    console.error(`Error creating profile for ${email}:`, profileError)
  } else {
    console.log(`Created profile for ${email}`)
  }
  
  return data.user
}

async function seed() {
  try {
    console.log('🧹 Cleaning database...')
    
    // First delete all data from tables in correct order (cascade)
    const tables = [
      'tickets',
      'tier_assignments',
      'sla_configs',
      'sbus',
      'user_profiles'
    ] as const satisfies readonly (keyof Database['public']['Tables'])[]
    
    for (const table of tables) {
      console.log(`Cleaning ${table}...`)
      const { error } = await supabase.from(table).delete().not('id', 'is', null)
      if (error) {
        console.error(`Error cleaning ${table}:`, error)
      }
    }

    // Soft delete all users
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()
    if (usersError) {
      console.error('Error fetching users:', usersError)
    } else {
      console.log(`Found ${users.length} users to soft delete`)
      
      for (const user of users) {
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          user.id,
          { user_metadata: { banned: true } }
        )
        if (updateError) {
          console.error(`Error soft deleting user ${user.email}:`, updateError)
        } else {
          console.log(`Soft deleted user: ${user.email}`)
        }
      }
    }

    console.log('✅ Database cleaned')
    
    // Add a delay to ensure all operations are complete
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    console.log('🌱 Starting seed...')

    // Create or update demo users with different roles
    const demoUsers = [
      {
        email: 'admin@outrisk.co.zw',
        password: 'demo123456',
        name: 'Admin User',
        role: 'admin' as const
      },
      {
        email: 'manager@outrisk.co.zw',
        password: 'demo123456',
        name: 'Manager User',
        role: 'manager' as const
      },
      {
        email: 'agent1@outrisk.co.zw',
        password: 'demo123456',
        name: 'Agent One',
        role: 'agent' as const
      },
      {
        email: 'agent2@outrisk.co.zw',
        password: 'demo123456',
        name: 'Agent Two',
        role: 'agent' as const
      },
      {
        email: 'agent3@outrisk.co.zw',
        password: 'demo123456',
        name: 'Agent Three',
        role: 'agent' as const
      }
    ] satisfies Array<{
      email: string;
      password: string;
      name: string;
      role: 'admin' | 'manager' | 'agent';
    }>
    
    console.log('Creating users...')
    const createdUsers = []
    for (const userData of demoUsers) {
      const user = await createOrUpdateUser(supabase, userData)
      if (user) createdUsers.push(user)
    }
    
    console.log(`✅ Created ${createdUsers.length} users`)

    // Create SBUs
    const sbus = [
      {
        name: 'Customer Support',
        description: 'Handle customer inquiries and general support tickets',
        status: 'active'
      },
      {
        name: 'Technical Support',
        description: 'Handle technical issues and product-related problems',
        status: 'active'
      },
      {
        name: 'Billing Support',
        description: 'Handle billing inquiries and payment-related issues',
        status: 'active'
      }
    ]

    const { data: createdSBUs, error: sbuError } = await supabase
      .from('sbus')
      .insert(sbus)
      .select()

    if (sbuError) {
      throw sbuError
    }

    console.log('✅ Created SBUs')

    // Create SLA configs for each SBU
    for (const sbu of createdSBUs) {
      const slaConfigs = [
        {
          sbu_id: sbu.id,
          ticket_status: 'open' as const,
          sla_time: 30 // 30 minutes
        },
        {
          sbu_id: sbu.id,
          ticket_status: 'escalated_tier1' as const,
          sla_time: 60 // 1 hour
        },
        {
          sbu_id: sbu.id,
          ticket_status: 'escalated_tier2' as const,
          sla_time: 120 // 2 hours
        }
      ]

      const { error: slaError } = await supabase
        .from('sla_configs')
        .insert(slaConfigs)

      if (slaError) {
        console.error(`Error creating SLA configs for SBU ${sbu.name}:`, slaError)
        continue
      }
    }

    console.log('✅ Created SLA configurations')

    // After creating users and SBUs, assign users to SBUs
    console.log('Assigning users to SBUs...')
    const agentUsers = createdUsers.filter(user => 
      user.user_metadata.role === 'agent'
    )

    // Distribute agents across SBUs
    for (let i = 0; i < agentUsers.length; i++) {
      const sbuIndex = i % createdSBUs.length
      const sbu = createdSBUs[sbuIndex]
      const agent = agentUsers[i]
      
      const { error: assignmentError } = await supabase
        .from('tier_assignments')
        .insert({
          user_id: agent.id,
          sbu_id: sbu.id,
          tier: `tier${(i % 3) + 1}`
        })

      if (assignmentError) {
        console.error(`Error assigning user ${agent.id} to SBU ${sbu.id}:`, assignmentError)
      } else {
        console.log(`✅ Assigned ${agent.email} to ${sbu.name}`)
      }
    }

    console.log('✅ Created tier assignments')

    // Create sample tickets
    const ticketStatuses = ['open', 'escalated_tier1', 'escalated_tier2', 'resolved', 'closed'] as const
    const priorities = ['low', 'medium', 'high', 'urgent'] as const
    const sampleTickets = []

    for (const sbu of createdSBUs) {
      // Create 5 tickets per SBU
      for (let i = 0; i < 5; i++) {
        const status = ticketStatuses[Math.floor(Math.random() * ticketStatuses.length)]
        const priority = priorities[Math.floor(Math.random() * priorities.length)]
        const assignedAgent = agentUsers[Math.floor(Math.random() * agentUsers.length)]

        sampleTickets.push({
          title: `Sample Ticket ${i + 1} for ${sbu.name}`,
          description: `This is a sample ticket for testing purposes in ${sbu.name}`,
          status,
          priority,
          sbu_id: sbu.id,
          assigned_to: assignedAgent.id,
          created_by: createdUsers[0].id, // Admin creates all tickets for demo
          current_tier: `tier${Math.floor(Math.random() * 3) + 1}`,
          resolved_at: status === 'resolved' || status === 'closed' 
            ? new Date().toISOString()
            : null
        })
      }
    }

    const { error: ticketError } = await supabase
      .from('tickets')
      .insert(sampleTickets)

    if (ticketError) {
      throw ticketError
    }

    console.log('✅ Created sample tickets')
    console.log('✅ Seed completed successfully!')

  } catch (error) {
    console.error('❌ Seed failed:', error)
  }
}

seed()