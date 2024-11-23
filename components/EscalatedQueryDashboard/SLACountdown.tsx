"use client"

import { useState, useEffect, useCallback } from 'react'
import { type Ticket, type TicketStatus, type SLAConfig } from '@/types'
import { formatTime } from '@/lib/utils'
import { useSupabase } from '@/lib/supabase/client'

interface SLACountdownProps {
  ticket: Ticket
  onUpdate?: (id: string, status: TicketStatus) => void
}

export function SLACountdown({ ticket, onUpdate }: SLACountdownProps) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [slaConfig, setSLAConfig] = useState<SLAConfig | null>(null)
  const { supabase } = useSupabase()

  // Fetch SLA configuration for the ticket's SBU
  useEffect(() => {
    async function fetchSLAConfig() {
      const { data: slaConfigData, error } = await supabase
        .from('sla_configs')
        .select('*')
        .eq('sbu_id', ticket.sbu_id)
        .eq('priority', ticket.priority)
        .single()

      if (error) {
        console.error('Error fetching SLA config:', error)
        return
      }

      setSLAConfig(slaConfigData)
      setTimeLeft(getSLATime(ticket.status, slaConfigData))
    }

    fetchSLAConfig()
  }, [ticket.sbu_id, ticket.priority, supabase, ticket.status])

  function getSLATime(status: TicketStatus, config: SLAConfig | null): number {
    if (!config) return 0

    const createdAt = new Date(ticket.created_at).getTime()
    const now = new Date().getTime()
    const elapsedTime = Math.floor((now - createdAt) / 1000) // elapsed time in seconds

    switch (status) {
      case 'new':
        return Math.max(0, config.new_ticket_sla - elapsedTime)
      case 'escalated_tier1':
        return Math.max(0, config.tier1_sla - elapsedTime)
      case 'escalated_tier2':
        return Math.max(0, config.tier2_sla - elapsedTime)
      case 'escalated_tier3':
        return Math.max(0, config.tier3_sla - elapsedTime)
      default:
        return 0
    }
  }

  const updateTicket = useCallback(() => {
    if (!onUpdate || !slaConfig) return

    let newStatus: TicketStatus

    switch (ticket.status) {
      case 'new':
        newStatus = 'escalated_tier1'
        break
      case 'escalated_tier1':
        newStatus = 'escalated_tier2'
        break
      case 'escalated_tier2':
        newStatus = 'escalated_tier3'
        break
      default:
        return
    }

    onUpdate(ticket.id, newStatus)
  }, [ticket, onUpdate, slaConfig])

  useEffect(() => {
    if (
      !timeLeft ||
      ticket.status === 'resolved' || 
      ticket.status === 'closed' || 
      ticket.status === 'assigned' || 
      ticket.status === 'in_progress'
    ) {
      return
    }

    if (timeLeft <= 0) {
      updateTicket()
      return
    }

    const timer = setInterval(() => {
      setTimeLeft(prevTime => prevTime !== null ? prevTime - 1 : null)
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft, updateTicket, ticket.status])

  if (
    ticket.status === 'resolved' || 
    ticket.status === 'closed' || 
    ticket.status === 'assigned' || 
    ticket.status === 'in_progress'
  ) {
    return <span className="text-green-500">-</span>
  }

  if (timeLeft === null) {
    return <span className="text-gray-500">Loading...</span>
  }

  const getTimeLeftColor = (timeLeft: number, status: TicketStatus): string => {
    if (!slaConfig) return "text-gray-700"
    
    const warningThreshold = status === 'new'
      ? slaConfig.new_ticket_warning
      : status === 'escalated_tier1'
      ? slaConfig.tier1_warning
      : status === 'escalated_tier2'
      ? slaConfig.tier2_warning
      : status === 'escalated_tier3'
      ? slaConfig.tier3_warning
      : 300 // default 5 minutes

    return timeLeft < warningThreshold ? "text-red-500" : "text-gray-700"
  }

  return (
    <div className="flex items-center gap-2">
      <span className={getTimeLeftColor(timeLeft, ticket.status)}>
        {formatTime(timeLeft)}
      </span>
    </div>
  )
}