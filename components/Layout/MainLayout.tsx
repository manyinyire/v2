"use client"

import { MainNav } from "./MainNav"
import { ModeToggle } from "./ModeToggle"
import { UserNav } from "./UserNav"

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-card border-r">
        <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center justify-between flex-shrink-0 px-4">
            <h1 className="text-xl font-semibold">EQMS</h1>
            <ModeToggle />
          </div>
          <div className="mt-8 flex-grow px-4">
            <MainNav />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        <div className="sticky top-0 z-10 flex h-16 flex-shrink-0 bg-card border-b">
          <div className="flex flex-1 justify-end px-4">
            <div className="ml-4 flex items-center">
              <UserNav />
            </div>
          </div>
        </div>
        <main className="flex-1">
          <div className="py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}