import { FC, useState } from 'react'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Clock, User2 } from 'lucide-react'
import { TicketComments } from './TicketComments'
import { AssignTicketDialog } from './AssignTicketDialog'
import { ResolveTicketDialog } from './ResolveTicketDialog'
import { useUser } from '@/hooks/useUser'
import { toast } from 'sonner'
import type { Ticket, UserProfile } from '@/types'
import type { Database } from '@/types/supabase'

type UserRole = Database['public']['Enums']['user_role']
type TicketStatus = Database['public']['Enums']['ticket_status']
type TicketPriority = Database['public']['Enums']['ticket_priority']

const priorityColors: Record<TicketPriority, string> = {
  low: 'bg-gray-500',
  medium: 'bg-blue-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500'
}

const statusColors: Record<TicketStatus, string> = {
  new: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  assigned: 'bg-purple-100 text-purple-800',
  escalated: 'bg-red-100 text-red-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800'
}

interface AssignTicketDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onAssign: (userId: string) => Promise<void>
  currentAssignee?: string
}

interface ResolveTicketDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onResolve: (resolution: string) => Promise<void>
}

interface TicketDetailsProps {
  ticket: Ticket & {
    creator: UserProfile
    assignee?: UserProfile
  }
  onAssign?: (ticketId: string, userId: string) => Promise<void>
  onResolve?: (ticketId: string, resolution: string) => Promise<void>
  onEscalate?: (ticketId: string) => Promise<void>
  className?: string
}

export const TicketDetails: FC<TicketDetailsProps> = ({
  ticket,
  onAssign,
  onResolve,
  onEscalate,
  className = ''
}) => {
  const { profile } = useUser()
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false)

  const handleAssign = async (userId: string) => {
    try {
      await onAssign?.(ticket.id, userId)
      toast.success('Ticket assigned successfully')
      setIsAssignDialogOpen(false)
    } catch (error) {
      console.error('Error assigning ticket:', error)
      toast.error('Failed to assign ticket')
    }
  }

  const handleResolve = async (resolution: string) => {
    try {
      await onResolve?.(ticket.id, resolution)
      toast.success('Ticket resolved successfully')
      setIsResolveDialogOpen(false)
    } catch (error) {
      console.error('Error resolving ticket:', error)
      toast.error('Failed to resolve ticket')
    }
  }

  const handleEscalate = async () => {
    try {
      await onEscalate?.(ticket.id)
      toast.success('Ticket escalated successfully')
    } catch (error) {
      console.error('Error escalating ticket:', error)
      toast.error('Failed to escalate ticket')
    }
  }

  const getInitials = (name: string) => {
    const names = name.split(' ')
    return names.length > 1 ? `${names[0].charAt(0)}${names[1].charAt(0)}` : name.charAt(0)
  }

  const userRole = profile?.role as UserRole | undefined

  return (
    <Card className={className}>
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold">{ticket.title}</h2>
            <p className="text-sm text-muted-foreground">
              Ticket #{ticket.id}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={priorityColors[ticket.priority]}>
              {ticket.priority}
            </Badge>
            <Badge variant={statusColors[ticket.status] || 'default'}>
              {ticket.status}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-8">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <User2 className="h-4 w-4 opacity-70" />
              <span className="text-sm font-medium">Created by</span>
              {ticket.creator && (
                <div className="flex items-center space-x-2">
                  <Avatar>
                    <AvatarImage src={ticket.creator.avatar_url || ''} alt={ticket.creator.full_name || ''} />
                    <AvatarFallback>{getInitials(ticket.creator.full_name || '')}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{ticket.creator.full_name}</p>
                    <p className="text-xs text-gray-500">{ticket.creator.role}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 opacity-70" />
              <span className="text-sm font-medium">Created at</span>
              <span className="text-sm">{format(new Date(ticket.created_at), 'PPpp')}</span>
            </div>

            <div className="flex items-center gap-2">
              <User2 className="h-4 w-4 opacity-70" />
              <span className="text-sm font-medium">Assigned to</span>
              {ticket.assignee && (
                <div className="flex items-center space-x-2">
                  <Avatar>
                    <AvatarImage src={ticket.assignee.avatar_url || ''} alt={ticket.assignee.full_name || ''} />
                    <AvatarFallback>{getInitials(ticket.assignee.full_name || '')}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{ticket.assignee.full_name}</p>
                    <p className="text-xs text-gray-500">{ticket.assignee.role}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Description</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ticket.description}</p>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Comments</h3>
            <div className="flex items-center gap-2">
              {userRole && userRole !== 'user' && (
                <div className="flex items-center gap-2">
                  {!ticket.assignee && (
                    <Button onClick={() => onAssign?.(ticket.id)} variant="outline" size="sm">
                      <User2 className="mr-2 h-4 w-4" />
                      Assign
                    </Button>
                  )}
                  {ticket.status !== 'resolved' && (
                    <Button onClick={() => onResolve?.(ticket.id)} variant="outline" size="sm">
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Resolve
                    </Button>
                  )}
                  {ticket.status !== 'escalated' && (
                    <Button onClick={() => onEscalate?.(ticket.id)} variant="outline" size="sm">
                      <ArrowUpCircle className="mr-2 h-4 w-4" />
                      Escalate
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          <TicketComments ticketId={ticket.id} />
        </div>
      </CardContent>

      {onAssign && (
        <AssignTicketDialog
          isOpen={isAssignDialogOpen}
          onOpenChange={setIsAssignDialogOpen}
          onAssign={handleAssign}
          currentAssignee={ticket.assignee?.id}
        />
      )}

      {onResolve && (
        <ResolveTicketDialog 
          isOpen={isResolveDialogOpen}
          onOpenChange={setIsResolveDialogOpen}
          onResolve={handleResolve}
        />
      )}
    </Card>
  )
}
