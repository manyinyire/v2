'use client'

import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from 'react'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error: authError } = await supabase.auth.getSession()
        console.log('Login page - auth state:', { session, error: authError })
        if (authError) {
          setError(authError.message)
        }
      } catch (err) {
        console.error('Auth error:', err)
        setError('Failed to check authentication status')
      }
    }
    checkAuth()
  }, [supabase.auth])

  if (error) {
    return <div className="text-red-500">{error}</div>
  }

  return (
    <Card className="w-full max-w-md mx-4">
      <CardHeader>
        <CardTitle>Login to EQMS</CardTitle>
      </CardHeader>
      <CardContent>
        <Auth
          supabaseClient={supabase}
          appearance={{ 
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#2563eb',
                  brandAccent: '#1d4ed8'
                }
              }
            }
          }}
          magicLink={false}
          providers={[]}
          redirectTo={`${window.location.origin}/auth/callback`}
          theme="dark"
          showLinks={true}
          view="sign_in"
        />
      </CardContent>
    </Card>
  )
}