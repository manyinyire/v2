"use client"

import { useTickets } from '@/hooks/useTickets'
import { TicketTable } from '@/components/EscalatedQueryDashboard/TicketTable'

type TicketFilter = 'all' | 'open' | 'escalated' | 'resolved'

interface TicketListProps {
  filter: TicketFilter
}

interface Ticket {
  // ... existing properties ...
  assignee?: string; // or whatever type your assignee should be
}

export function TicketList({ filter }: TicketListProps) {
  const {
    tickets,
    handleTicketUpdate,
    handleManualEscalation,
    handleResolveTicket,
  } = useTickets()

  const filteredTickets = tickets.filter(ticket => {
    switch (filter) {
      case 'open':
        // Only show tickets that are Open and have an assignee
        return ticket.status === 'Open' && 'assignee' in ticket
      case 'escalated':
        // Only show tickets that are Escalated and have an assignee
        return ticket.status.startsWith('Escalated') && 'assignee' in ticket
      case 'resolved':
        return ticket.status === 'Resolved'
      default:
        return true
    }
  })

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-8">
        {filter === 'all' ? 'All Tickets' : 
         filter === 'open' ? 'Open Tickets' :
         filter === 'escalated' ? 'Escalated Tickets' : 'Resolved Tickets'}
      </h1>
      <TicketTable
        tickets={filteredTickets as any}
        showAssignee={filter === 'open' || filter === 'escalated'}
        onUpdate={handleTicketUpdate}
        onEscalate={handleManualEscalation}
        onResolve={handleResolveTicket}
      />
    </div>
  )
}