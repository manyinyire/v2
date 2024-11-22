'use client'

import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { createClient } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useSearchParams } from 'next/navigation'
import { ThemeProvider } from '@/components/ThemeProvider'
import { Toaster } from '@/components/ui/sonner'

export default function LoginPage() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo')

  const getURL = () => {
    let url = process?.env?.NEXT_PUBLIC_SITE_URL ?? // Set this in your .env file
      process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel
      'http://localhost:3000/'
    
    // Make sure to include `https://` when not localhost.
    url = url.includes('http') ? url : `https://${url}`
    // Make sure to include trailing `/`
    url = url.charAt(url.length - 1) === '/' ? url : `${url}/`
    return url
  }

  const getRedirectURL = () => {
    const baseURL = `${getURL()}auth/callback`
    return redirectTo 
      ? `${baseURL}?redirectTo=${encodeURIComponent(redirectTo)}`
      : baseURL
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle>Login to EQMS</CardTitle>
        </CardHeader>
        <CardContent>
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            providers={['google', 'github']}
            redirectTo={getRedirectURL()}
            theme="dark"
            showLinks={false}
            view="sign_in"
          />
        </CardContent>
      </Card>
      <Toaster />
    </ThemeProvider>
  )
}