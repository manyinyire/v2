"use client"

import { useState } from 'react'
import { useTickets } from '@/hooks/useTickets'
import { useUser } from '@/hooks/useUser'
import { TicketTable } from '@/components/EscalatedQueryDashboard/TicketTable'
import { TicketDetails } from './TicketDetails'
import { TicketComments } from './TicketComments'
import { AssignTicketDialog } from './AssignTicketDialog'
import { ResolveTicketDialog } from './ResolveTicketDialog'
import { FilterBar } from './FilterBar'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Ticket, FilterState, UserProfile } from '@/types'

interface TicketListProps {
  defaultFilters?: FilterState
}

export function TicketList({ defaultFilters }: TicketListProps) {
  const router = useRouter()
  const { profile, isLoading: userLoading } = useUser()
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [showComments, setShowComments] = useState(false)
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [showResolveDialog, setShowResolveDialog] = useState(false)

  const {
    tickets,
    loading,
    error,
    pagination,
    filters,
    setPagination,
    setFilters,
    assignTicket,
    resolveTicket,
    escalateTicket,
    addComment,
  } = useTickets({
    userRole: profile?.role,
    sbuId: profile?.sbu_id,
  })

  // Check if user can perform actions based on role
  const canAssignTickets = profile?.role === 'agent' || profile?.role === 'manager' || profile?.role === 'admin'
  const canResolveTickets = profile?.role === 'agent' || profile?.role === 'manager' || profile?.role === 'admin'
  const canEscalateTickets = profile?.role === 'agent' || profile?.role === 'manager'
  const canCreateTickets = !!profile

  // Handle viewing ticket details
  const handleViewTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket)
  }

  // Handle assigning ticket
  const handleAssignTicket = async (ticketId: string, userId: string) => {
    if (!canAssignTickets) return
    await assignTicket(ticketId, userId)
    setShowAssignDialog(false)
  }

  // Handle ticket comments
  const handleShowComments = (ticketId: string) => {
    const ticket = tickets.find(t => t.id === ticketId)
    if (ticket) {
      setSelectedTicket(ticket)
      setShowComments(true)
    }
  }

  // Handle adding comment
  const handleAddComment = async (ticketId: string, content: string, isInternal: boolean) => {
    // Only allow internal comments for agents, managers, and admins
    if (isInternal && !canAssignTickets) return
    await addComment(ticketId, content, isInternal)
    setShowComments(false)
  }

  // Handle resolving ticket
  const handleResolveTicket = async (ticketId: string, resolution: string) => {
    if (!canResolveTickets) return
    await resolveTicket(ticketId, resolution)
    setShowResolveDialog(false)
  }

  // Handle escalating ticket
  const handleEscalateTicket = async (ticketId: string) => {
    if (!canEscalateTickets) return
    await escalateTicket(ticketId)
  }

  // Handle creating new ticket
  const handleCreateTicket = () => {
    router.push('/tickets/new')
  }

  if (userLoading) {
    return <LoadingSpinner />
  }

  if (!profile) {
    return (
      <Alert>
        <AlertDescription>
          Please sign in to view tickets
        </AlertDescription>
      </Alert>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error.message}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Tickets</h1>
        {canCreateTickets && (
          <Button onClick={handleCreateTicket}>
            <Plus className="w-4 h-4 mr-2" />
            Create Ticket
          </Button>
        )}
      </div>

      <FilterBar
        filters={filters}
        onFilterChange={setFilters}
        userRole={profile.role}
      />
      
      {loading === 'loading' ? (
        <LoadingSpinner />
      ) : (
        <>
          <TicketTable
            tickets={tickets}
            showAssignee={true}
            onView={handleViewTicket}
            onAssign={canAssignTickets ? (id) => {
              const ticket = tickets.find(t => t.id === id)
              if (ticket) {
                setSelectedTicket(ticket)
                setShowAssignDialog(true)
              }
            } : undefined}
            onResolve={canResolveTickets ? (id) => {
              const ticket = tickets.find(t => t.id === id)
              if (ticket) {
                setSelectedTicket(ticket)
                setShowResolveDialog(true)
              }
            } : undefined}
            onEscalate={canEscalateTickets ? handleEscalateTicket : undefined}
            onComment={handleShowComments}
            userRole={profile.role}
          />

          {selectedTicket && (
            <>
              <TicketDetails
                ticket={{
                  ...selectedTicket,
                  creator: selectedTicket.creator!,
                  assignee: selectedTicket.assignee,
                  resolution: selectedTicket.resolution
                }}
                onAssign={canAssignTickets ? handleAssignTicket : undefined}
                onResolve={canResolveTickets ? handleResolveTicket : undefined}
                onEscalate={canEscalateTickets ? handleEscalateTicket : undefined}
              />

              {showComments && (
                <TicketComments
                  ticketId={selectedTicket.id}
                  onAddComment={handleAddComment}
                  userRole={profile.role}
                />
              )}

              {showAssignDialog && (
                <AssignTicketDialog
                  isOpen={showAssignDialog}
                  onOpenChange={setShowAssignDialog}
                  onAssign={(userId) => handleAssignTicket(selectedTicket.id, userId)}
                  currentAssignee={selectedTicket.assignee?.id}
                />
              )}

              {showResolveDialog && (
                <ResolveTicketDialog
                  isOpen={showResolveDialog}
                  onOpenChange={setShowResolveDialog}
                  onResolve={(resolution) => handleResolveTicket(selectedTicket.id, resolution)}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}