import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth } from './AuthContext'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock Supabase client
vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: vi.fn(),
}))

// Test component to access auth context
function TestComponent() {
  const auth = useAuth()
  return (
    <div>
      <div data-testid="loading">{auth.loading.toString()}</div>
      <div data-testid="user">{auth.user?.email || 'no user'}</div>
      <button onClick={() => auth.signIn('test@example.com', 'password')}>
        Sign In
      </button>
      <button onClick={() => auth.signOut()}>Sign Out</button>
      <button onClick={() => auth.updateProfile({ full_name: 'Test User' })}>
        Update Profile
      </button>
    </div>
  )
}

describe('AuthContext', () => {
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getSession: vi.fn(),
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } },
        })),
        signInWithPassword: vi.fn(),
        signOut: vi.fn(),
        signUp: vi.fn(),
        resetPasswordForEmail: vi.fn(),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(),
        })),
        insert: vi.fn(),
      })),
    }

    ;(createClientComponentClient as any).mockReturnValue(mockSupabase)
  })

  it('initializes with loading state', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )
    expect(screen.getByTestId('loading').textContent).toBe('true')
  })

  it('handles successful sign in', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: {}, error: null })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    const signInButton = screen.getByText('Sign In')
    await act(async () => {
      await userEvent.click(signInButton)
    })

    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password',
    })
  })

  it('handles sign in error', async () => {
    const error = new Error('Invalid credentials')
    mockSupabase.auth.signInWithPassword.mockRejectedValue(error)

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    const signInButton = screen.getByText('Sign In')
    await act(async () => {
      await userEvent.click(signInButton)
    })

    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalled()
  })

  it('handles successful sign out', async () => {
    mockSupabase.auth.signOut.mockResolvedValue({ error: null })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    const signOutButton = screen.getByText('Sign Out')
    await act(async () => {
      await userEvent.click(signOutButton)
    })

    expect(mockSupabase.auth.signOut).toHaveBeenCalled()
  })

  it('handles profile update', async () => {
    mockSupabase.from().update().eq.mockResolvedValue({ error: null })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    const updateButton = screen.getByText('Update Profile')
    await act(async () => {
      await userEvent.click(updateButton)
    })

    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('user_profiles_new')
    })
  })

  it('handles session check on mount', async () => {
    const mockSession = {
      user: { id: '123', email: 'test@example.com' },
    }
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: mockSession }, error: null })
    mockSupabase.from().select().eq().single.mockResolvedValue({
      data: { id: '123', full_name: 'Test User' },
      error: null,
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('test@example.com')
    })
  })

  it('handles session check error', async () => {
    const error = new Error('Session check failed')
    mockSupabase.auth.getSession.mockRejectedValue(error)

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })
  })
})
