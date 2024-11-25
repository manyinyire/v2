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
  '/auth/verify-email',
  '/auth/pending-approval',
  '/auth/inactive',
  '/api/auth'
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
  '/settings/system',
  '/api/admin'
]

export async function middleware(req: NextRequest) {
  console.log(' Middleware triggered for path:', req.nextUrl.pathname)
  const res = NextResponse.next()

  try {
    // Initialize Supabase client
    const supabase = createMiddlewareClient({ req, res })

    // Refresh session if needed
    const { data: { session: refreshedSession } } = await supabase.auth.getSession()
    console.log('Session after refresh:', refreshedSession ? 'Exists' : 'None')

    // Get current session
    const { data: { session } } = await supabase.auth.getSession()
    console.log('Current session:', session ? 'Exists' : 'None')

    // Check if current route is public
    const isPublicRoute = publicRoutes.some(route => 
      req.nextUrl.pathname.startsWith(route)
    )
    console.log('Is public route:', isPublicRoute)

    // Check if current route is auth-only
    const isAuthOnlyRoute = authOnlyRoutes.some(route => 
      req.nextUrl.pathname.startsWith(route)
    )
    console.log('Is auth-only route:', isAuthOnlyRoute)

    // Check if current route is admin-only
    const isAdminRoute = adminRoutes.some(route => 
      req.nextUrl.pathname.startsWith(route)
    )
    console.log('Is admin-only route:', isAdminRoute)

    // If authenticated and trying to access auth pages, redirect to home
    if (session && isAuthOnlyRoute) {
      console.log('Authenticated user trying to access auth page, redirecting to home')
      return NextResponse.redirect(new URL('/', req.url))
    }

    // If on a public route, allow access
    if (isPublicRoute) {
      console.log('Allowing access to public route')
      return res
    }

    // If not authenticated and trying to access protected route, redirect to login
    if (!session) {
      console.log('No session, redirecting to login')
      const loginUrl = new URL('/auth/login', req.url)
      loginUrl.searchParams.set('redirectTo', req.nextUrl.pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Check admin access for admin routes
    if (isAdminRoute) {
      console.log('Checking admin access')
      const { data: profile } = await supabase
        .from('user_profiles_new')
        .select('role')
        .eq('user_id', session.user.id)
        .single()

      if (!profile || profile.role !== 'admin') {
        console.log('Not an admin, redirecting to home')
        return NextResponse.redirect(new URL('/', req.url))
      }
    }

    // User is authenticated and authorized, proceed
    console.log('User is authenticated and authorized')
    return res
  } catch (error) {
    console.error('Middleware error:', error)
    
    // For any unexpected errors, redirect to login
    const loginUrl = new URL('/auth/login', req.url)
    loginUrl.searchParams.set('redirectTo', req.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }
}

// Configure matcher to exclude specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes that should be public
     */
    '/((?!_next/static|_next/image|favicon.ico|public/|api/public/).*)',
  ],
}
