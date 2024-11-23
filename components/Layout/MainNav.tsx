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
  Building2,
  ShieldCheck,
  History
} from "lucide-react"

interface MainNavProps {
  userRole: string
  sbu: string
}

export function MainNav({ userRole, sbu }: MainNavProps) {
  const pathname = usePathname()

  const baseNavItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: BarChart2,
      roles: ["user", "manager", "admin"],
    },
    {
      title: "Tickets",
      href: "/tickets",
      icon: Ticket,
      roles: ["user", "manager", "admin"],
    },
    {
      title: "Reports",
      href: "/reports",
      icon: FileText,
      roles: ["manager", "admin"],
    },
    {
      title: "Analytics",
      href: `/sbus/${sbu}/analytics`,
      icon: BarChart2,
      roles: ["manager", "admin"],
    },
  ]

  const adminNavItems = [
    {
      title: "Users",
      href: "/users",
      icon: Users,
      roles: ["admin"],
    },
    {
      title: "SBUs",
      href: "/sbus",
      icon: Building2,
      roles: ["admin"],
    },
    {
      title: "Approvals",
      href: "/approvals",
      icon: ShieldCheck,
      roles: ["admin"],
    },
    {
      title: "Audit Log",
      href: "/audit",
      icon: History,
      roles: ["admin"],
    },
  ]

  const settingsItem = {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    roles: ["user", "manager", "admin"],
  }

  const navItems = [
    ...baseNavItems,
    ...(userRole === "admin" ? adminNavItems : []),
    settingsItem,
  ].filter(item => item.roles.includes(userRole))

  return (
    <nav className="flex flex-col space-y-1">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors",
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