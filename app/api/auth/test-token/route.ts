import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Sign in with test credentials
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'test123'
    });

    if (error) throw error;

    // Get the session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) throw sessionError;

    return NextResponse.json({ 
      token: session?.access_token,
      user: data.user 
    });
  } catch (error) {
    console.error('Error in test-token:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
  }
}
