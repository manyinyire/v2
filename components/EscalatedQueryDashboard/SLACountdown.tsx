"use client"

import { useState, useEffect, useCallback } from 'react'
import { type Ticket, type TicketStatus } from '@/types'
import { SLA_TIMES, formatTime } from '@/lib/utils'

interface SLACountdownProps {
  ticket: Ticket
  onUpdate: (id: string, status: TicketStatus, slaTime: number) => void
}

export function SLACountdown({ ticket, onUpdate }: SLACountdownProps) {
  const [timeLeft, setTimeLeft] = useState(ticket.slaTime)

  const updateTicket = useCallback(() => {
    let newStatus: TicketStatus = ticket.status
    let newSlaTime = 0

    switch (ticket.status) {
      case 'Open':
        newStatus = 'Escalated (Tier 1)'
        newSlaTime = SLA_TIMES.TIER_1
        break
      case 'Escalated (Tier 1)':
        newStatus = 'Escalated (Tier 2)'
        newSlaTime = SLA_TIMES.TIER_2
        break
      case 'Escalated (Tier 2)':
        newStatus = 'Escalated (Tier 3)'
        break
      default:
        return
    }

    onUpdate(ticket.id, newStatus, newSlaTime)
  }, [ticket, onUpdate])

  useEffect(() => {
    if (timeLeft <= 0) {
      updateTicket()
      return
    }

    const timer = setInterval(() => {
      setTimeLeft(prevTime => prevTime - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft, updateTicket])

  return (
    <span className={`font-mono ${timeLeft <= 10 ? 'text-red-500' : ''}`}>
      {formatTime(timeLeft)}
    </span>
  )
}