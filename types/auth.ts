export type UserRole = 'admin' | 'support' | 'user'

export interface UserMetadata {
  role: UserRole
  sbu?: string
  tier?: string
}

export interface AuthUser {
  id: string
  email: string
  user_metadata: UserMetadata
} 