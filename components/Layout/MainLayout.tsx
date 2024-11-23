"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { MainNav } from "./MainNav"
import { ModeToggle } from "./ModeToggle"
import { UserNav } from "./UserNav"
import { useAuth } from "@/contexts/AuthContext"
import { Loader2 } from "lucide-react"

interface MainLayoutProps {
  children: React.ReactNode
}

interface UserProfile {
  id: string
  full_name: string
  avatar_url?: string
  role: string
  sbu_id: string | null
  email: string
}

interface MainNavProps {
  userRole: string
  sbu: string | null
}

interface UserNavProps {
  name: string
  email: string
  imageUrl: string
  role: string
}

export function MainLayout({ children }: MainLayoutProps) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin')
    }
  }, [user, router, loading])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-card border-r">
        <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center justify-between flex-shrink-0 px-4">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">EQMS</h1>
            </div>
          </div>
          <div className="mt-5 flex-1 flex flex-col">
            <MainNav userRole={profile.role} sbu={profile.sbu_id} />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        <div className="sticky top-0 z-10 flex h-16 flex-shrink-0 bg-card border-b">
          <div className="flex flex-1 justify-between px-4">
            <div className="flex lg:hidden items-center">
              <h1 className="text-xl font-semibold">EQMS</h1>
            </div>
            <div className="ml-4 flex items-center">
              <UserNav />
            </div>
          </div>
        </div>
        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}