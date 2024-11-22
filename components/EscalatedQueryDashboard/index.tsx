"use client"

import React from 'react'
import { TicketStats } from './TicketStats'
import { QueryForm } from './QueryForm'
import { TicketTable } from './TicketTable'
import { useTickets } from '@/hooks/useTickets'

export function EscalatedQueryDashboard() {
  const {
    tickets,
    handleSubmit,
    handleTicketUpdate,
    handleManualEscalation,
    handleResolveTicket,
  } = useTickets()

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-8">Escalated Query Management System</h1>
      <TicketStats tickets={tickets} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <QueryForm onSubmit={handleSubmit} />
        <TicketTable
          tickets={tickets}
          onUpdate={handleTicketUpdate}
          onEscalate={handleManualEscalation}
          onResolve={handleResolveTicket}
        />
      </div>
    </div>
  )
}