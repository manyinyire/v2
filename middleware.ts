import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// List of public routes that don't require authentication
const publicRoutes = [
  '/auth/login',
  '/auth/signup',
  '/auth/callback',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email'
]

// List of auth-only routes that should redirect to home if authenticated
const authOnlyRoutes = [
  '/auth/login',
  '/auth/signup',
  '/auth/forgot-password'
]

// List of admin-only routes
const adminRoutes = [
  '/admin',
  '/settings/system'
]

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  try {
    // Initialize Supabase client
    const supabase = createMiddlewareClient({ req, res })

    // Refresh session if needed
    await supabase.auth.getSession()

    // For auth callback, just proceed with the response
    if (req.nextUrl.pathname === '/auth/callback') {
      return res
    }

    // Get current session
    const { data: { session } } = await supabase.auth.getSession()

    // Check if current route is public
    const isPublicRoute = publicRoutes.some(route => 
      req.nextUrl.pathname.startsWith(route)
    )

    // Check if current route is auth-only
    const isAuthOnlyRoute = authOnlyRoutes.some(route => 
      req.nextUrl.pathname.startsWith(route)
    )

    // Check if current route is admin-only
    const isAdminRoute = adminRoutes.some(route => 
      req.nextUrl.pathname.startsWith(route)
    )

    // If authenticated and trying to access auth pages, redirect to home
    if (session && isAuthOnlyRoute) {
      return NextResponse.redirect(new URL('/', req.url))
    }

    // If on a public route, allow access
    if (isPublicRoute) {
      return res
    }

    // If not authenticated and trying to access protected route, redirect to login
    if (!session) {
      const loginUrl = new URL('/auth/login', req.url)
      loginUrl.searchParams.set('redirectTo', req.nextUrl.pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Check admin access
    if (isAdminRoute) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', session.user.id)
        .single()

      if (!profile || profile.role !== 'admin') {
        return NextResponse.redirect(new URL('/', req.url))
      }
    }

    // User is authenticated and authorized, proceed
    return res
  } catch (error) {
    console.error('Middleware error:', error)
    
    // For any unexpected errors, redirect to login
    const loginUrl = new URL('/auth/login', req.url)
    loginUrl.searchParams.set('redirectTo', req.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }
}

// Update the matcher to exclude static files and api routes
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ],
}
