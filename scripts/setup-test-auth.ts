const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupTestUser() {
  try {
    // Create test user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: 'test@example.com',
      password: 'test123',
      email_confirm: true
    });

    if (authError) throw authError;

    // Create user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authUser.user.id,
        full_name: 'Test Admin',
        role: 'admin'
      });

    if (profileError) throw profileError;

    // Sign in to get token
    const { data: { session }, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'test123'
    });

    if (signInError) throw signInError;

    console.log('Test user created successfully!');
    console.log('Access Token:', session?.access_token);
    
  } catch (error) {
    console.error('Error setting up test user:', error);
  }
}

setupTestUser();
