'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { User } from '@supabase/supabase-js'
import Image from 'next/image'

interface Profile {
  id: string
  full_name: string
  avatar_url: string | null
}

export default function UserAccountNav() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        setProfile(profile)
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        setProfile(profile)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  return (
    <div className="flex items-center gap-3">
      {user && profile ? (
        <>
          {profile.avatar_url && (
            <Image
              src={profile.avatar_url}
              alt={profile.full_name}
              width={32}
              height={32}
              className="rounded-full"
            />
          )}
          <div className="flex flex-col">
            <span className="text-sm font-medium">{profile.full_name}</span>
            <span className="text-xs text-gray-500">{user.email}</span>
          </div>
          <button
            onClick={async () => {
              await supabase.auth.signOut()
            }}
            className="text-sm text-gray-700 hover:text-gray-900"
          >
            Sign out
          </button>
        </>
      ) : (
        <span>Not logged in</span>
      )}
    </div>
  )
} 