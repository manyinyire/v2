import { createClient } from '@supabase/supabase-js';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { Database } from '../types/supabase';
import { sendEmailAlert } from '../utils/emailService';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Mock email service
vi.mock('../utils/emailService', () => ({
  sendEmailAlert: vi.fn()
}));

describe('Ticket Lifecycle Test', () => {
  let testUser: any;
  let testAgent: any;
  let testManager: any;
  let testSBU: any;
  let testTicket: any;

  beforeAll(async () => {
    // Clean up any existing test data
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it('should create test users and assign roles', async () => {
    // Create end user
    const { data: user, error: userError } = await supabase.auth.signUp({
      email: 'testuser@example.com',
      password: 'testpassword123'
    });
    expect(userError).toBeNull();
    testUser = user;

    // Create agent
    const { data: agent, error: agentError } = await supabase.auth.signUp({
      email: 'testagent@example.com',
      password: 'testpassword123'
    });
    expect(agentError).toBeNull();
    testAgent = agent;

    // Create manager
    const { data: manager, error: managerError } = await supabase.auth.signUp({
      email: 'testmanager@example.com',
      password: 'testpassword123'
    });
    expect(managerError).toBeNull();
    testManager = manager;

    // Set roles
    await supabase.from('user_profiles').insert([
      {
        user_id: testUser.user.id,
        full_name: 'Test User',
        role: 'user'
      },
      {
        user_id: testAgent.user.id,
        full_name: 'Test Agent',
        role: 'agent'
      },
      {
        user_id: testManager.user.id,
        full_name: 'Test Manager',
        role: 'manager'
      }
    ]);
  });

  it('should create an SBU and assign users', async () => {
    const { data: sbu, error: sbuError } = await supabase
      .from('sbus')
      .insert({
        name: 'Test SBU',
        description: 'Test Strategic Business Unit'
      })
      .select()
      .single();

    expect(sbuError).toBeNull();
    expect(sbu).not.toBeNull();
    testSBU = sbu;

    // Assign users to SBU
    const { error: assignError } = await supabase
      .from('user_profiles')
      .update({ sbu_id: testSBU.id })
      .in('user_id', [testUser.user.id, testAgent.user.id, testManager.user.id]);

    expect(assignError).toBeNull();
  });

  it('should create a ticket and verify initial state', async () => {
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .insert({
        title: 'Test Ticket',
        description: 'This is a test ticket',
        status: 'new',
        priority: 'medium',
        created_by: testUser.user.id,
        sbu_id: testSBU.id,
        sla_time: 24
      })
      .select()
      .single();

    expect(ticketError).toBeNull();
    expect(ticket).not.toBeNull();
    testTicket = ticket;

    // Verify email notification for new ticket
    expect(sendEmailAlert).toHaveBeenCalledWith({
      to: 'testmanager@example.com',
      subject: 'New Ticket Created',
      ticketId: ticket.id,
      status: 'new'
    });
  });

  it('should assign ticket to agent', async () => {
    const { error: assignError } = await supabase
      .from('tickets')
      .update({
        status: 'assigned',
        assigned_to: testAgent.user.id
      })
      .eq('id', testTicket.id);

    expect(assignError).toBeNull();

    // Verify email notifications
    expect(sendEmailAlert).toHaveBeenCalledWith({
      to: 'testagent@example.com',
      subject: 'Ticket Assigned',
      ticketId: testTicket.id,
      status: 'assigned'
    });
  });

  it('should escalate ticket', async () => {
    const { error: escalateError } = await supabase
      .from('tickets')
      .update({
        status: 'escalated',
        priority: 'high'
      })
      .eq('id', testTicket.id);

    expect(escalateError).toBeNull();

    // Verify email notifications
    expect(sendEmailAlert).toHaveBeenCalledWith({
      to: 'testmanager@example.com',
      subject: 'Ticket Escalated',
      ticketId: testTicket.id,
      status: 'escalated'
    });
  });

  it('should resolve ticket', async () => {
    const { error: resolveError } = await supabase
      .from('tickets')
      .update({
        status: 'resolved',
        resolution: 'Test resolution details'
      })
      .eq('id', testTicket.id);

    expect(resolveError).toBeNull();

    // Verify email notifications
    expect(sendEmailAlert).toHaveBeenCalledWith({
      to: 'testuser@example.com',
      subject: 'Ticket Resolved',
      ticketId: testTicket.id,
      status: 'resolved'
    });
  });
});

async function cleanupTestData() {
  // Delete test tickets
  await supabase
    .from('tickets')
    .delete()
    .eq('title', 'Test Ticket');

  // Delete test SBU
  await supabase
    .from('sbus')
    .delete()
    .eq('name', 'Test SBU');

  // Delete test user profiles
  await supabase
    .from('user_profiles')
    .delete()
    .in('email', [
      'testuser@example.com',
      'testagent@example.com',
      'testmanager@example.com'
    ]);

  // Delete test users
  const testEmails = [
    'testuser@example.com',
    'testagent@example.com',
    'testmanager@example.com'
  ];
  for (const email of testEmails) {
    const { data: user } = await supabase
      .from('auth.users')
      .select('id')
      .eq('email', email)
      .single();
    if (user) {
      await supabase.auth.admin.deleteUser(user.id);
    }
  }
}
