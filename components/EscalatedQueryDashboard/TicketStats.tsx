'use client'

import { BarChart2, AlertCircle, Bell, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type Ticket } from '@/types'
import { useEffect, useState } from 'react'

interface TicketStatsProps {
  tickets: Ticket[]
}

export function TicketStats({ tickets }: TicketStatsProps) {
  const [lastHourCount, setLastHourCount] = useState(0)
  const [last24HoursResolved, setLast24HoursResolved] = useState(0)
  const [stats, setStats] = useState({
    openTickets: 0,
    escalatedTickets: 0,
    resolvedTickets: 0
  })

  useEffect(() => {
    console.log('Calculating stats for tickets:', tickets)

    // Calculate tickets created in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const ticketsLastHour = tickets.filter(t => {
      const createdAt = new Date(t.created_at)
      console.log('Checking ticket:', { id: t.id, created_at: t.created_at, isLastHour: createdAt > oneHourAgo })
      return createdAt > oneHourAgo
    }).length

    // Calculate tickets resolved in the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const resolvedLast24Hours = tickets.filter(t => {
      const updatedAt = new Date(t.updated_at)
      const isResolved = typeof t.status === 'string' && 
        (t.status.toLowerCase() === 'resolved' || t.status.toLowerCase() === 'closed')
      console.log('Checking resolved ticket:', { 
        id: t.id, 
        status: t.status, 
        updated_at: t.updated_at, 
        isLast24Hours: updatedAt > twentyFourHoursAgo && isResolved
      })
      return isResolved && updatedAt > twentyFourHoursAgo
    }).length

    // Calculate current ticket stats
    const newStats = {
      openTickets: tickets.filter(t => 
        typeof t.status === 'string' && 
        t.status.toLowerCase() === 'open'
      ).length,
      escalatedTickets: tickets.filter(t => 
        typeof t.status === 'string' && 
        (t.status === 'escalated_tier1' || t.status === 'escalated_tier2')
      ).length,
      resolvedTickets: tickets.filter(t => 
        typeof t.status === 'string' && 
        (t.status === 'resolved' || t.status === 'closed')
      ).length
    }

    console.log('Stats calculated:', {
      totalTickets: tickets.length,
      ...newStats,
      ticketsLastHour,
      resolvedLast24Hours
    })

    setLastHourCount(ticketsLastHour)
    setLast24HoursResolved(resolvedLast24Hours)
    setStats(newStats)
  }, [tickets])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Queries</CardTitle>
          <BarChart2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{tickets.length}</div>
          <p className="text-xs text-muted-foreground">
            {lastHourCount > 0 ? `+${lastHourCount}` : 'No new tickets'} in the last hour
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.openTickets}</div>
          <p className="text-xs text-muted-foreground">Awaiting assignment or action</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Escalated Tickets</CardTitle>
          <Bell className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.escalatedTickets}</div>
          <p className="text-xs text-muted-foreground">Tier 1, 2, and 3</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Resolved Tickets</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{last24HoursResolved}</div>
          <p className="text-xs text-muted-foreground">In the last 24 hours</p>
        </CardContent>
      </Card>
    </div>
  )
}