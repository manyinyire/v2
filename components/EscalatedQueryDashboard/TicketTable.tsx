"use client"

import { Eye, ArrowUpCircle, CheckCircle, MessageSquare } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { SLACountdown } from './SLACountdown'
import type { Ticket, TicketStatus, TicketPriority, UserProfile } from '@/types'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface TicketTableProps {
  tickets: (Ticket & {
    assignee?: UserProfile
  })[]
  showAssignee?: boolean
  onView: (ticket: Ticket) => void
  onAssign?: (ticketId: string) => void
  onEscalate?: (ticketId: string) => void
  onResolve?: (ticketId: string) => void
  onComment: (ticketId: string) => void
  userRole: 'user' | 'agent' | 'manager' | 'admin'
}

const priorityColors: Record<TicketPriority, string> = {
  low: 'bg-gray-500',
  medium: 'bg-blue-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500'
}

const statusColors: Record<TicketStatus, string> = {
  new: 'bg-gray-500',
  assigned: 'bg-blue-500',
  in_progress: 'bg-yellow-500',
  escalated: 'bg-orange-500',
  resolved: 'bg-green-500',
  closed: 'bg-gray-700'
}

export function TicketTable({ 
  tickets, 
  showAssignee, 
  onView,
  onAssign,
  onEscalate, 
  onResolve,
  onComment,
  userRole
}: TicketTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tickets</CardTitle>
        <CardDescription>
          View and manage support tickets
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              {showAssignee && <TableHead>Assignee</TableHead>}
              <TableHead>Created</TableHead>
              <TableHead>SLA</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell>{ticket.id}</TableCell>
                <TableCell>{ticket.title}</TableCell>
                <TableCell>
                  <Badge className={cn("text-white", statusColors[ticket.status])}>
                    {ticket.status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={cn("text-white", priorityColors[ticket.priority])}>
                    {ticket.priority}
                  </Badge>
                </TableCell>
                {showAssignee && (
                  <TableCell>
                    {ticket.assignee?.full_name || 'Unassigned'}
                  </TableCell>
                )}
                <TableCell>
                  {format(new Date(ticket.created_at), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  <SLACountdown 
                    ticket={ticket}
                    onUpdate={onEscalate ? 
                      (id, status) => {
                        if (status.startsWith('ESCALATED_')) {
                          onEscalate(id)
                        }
                      } : undefined
                    }
                  />
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onView(ticket)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {onAssign && userRole !== 'user' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onAssign(ticket.id)}
                      >
                        <ArrowUpCircle className="h-4 w-4" />
                      </Button>
                    )}
                    {onResolve && userRole !== 'user' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onResolve(ticket.id)}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onComment(ticket.id)}
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}