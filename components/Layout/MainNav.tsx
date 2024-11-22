"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  BarChart2, 
  Ticket, 
  Users, 
  FileText, 
  Settings, 
  Building2
} from "lucide-react"

export function MainNav() {
  const pathname = usePathname()

  const navItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: BarChart2,
    },
    {
      title: "Tickets",
      href: "/tickets",
      icon: Ticket,
    },
    {
      title: "Users",
      href: "/users",
      icon: Users,
    },
    {
      title: "Reports",
      href: "/reports",
      icon: FileText,
    },
    {
      title: "SBUs",
      href: "/sbus",
      icon: Building2,
    },
    {
      title: "Settings",
      href: "/settings",
      icon: Settings,
    },
  ]

  return (
    <nav className="flex flex-col space-y-1">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground",
            pathname === item.href ? "bg-accent text-accent-foreground" : "text-muted-foreground"
          )}
        >
          <item.icon className="h-4 w-4 mr-2" />
          {item.title}
        </Link>
      ))}
    </nav>
  )
}