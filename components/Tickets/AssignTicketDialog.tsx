"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useUserManagement } from '@/hooks/useUserManagement'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { User2 } from 'lucide-react'
import type { Database } from '@/types/supabase'

type UserRole = Database['public']['Enums']['user_role']
type User = {
  id: string
  email: string
  role: UserRole
  profile: {
    full_name: string
    avatar_url?: string
  }
}

interface AssignTicketDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onAssign: (userId: string) => void
  currentAssignee?: string
}

export function AssignTicketDialog({
  isOpen,
  onOpenChange,
  onAssign,
  currentAssignee
}: AssignTicketDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>(currentAssignee || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { users, loading, error } = useUserManagement()

  // Filter users to only show agents and managers
  const eligibleUsers = users?.filter(user => 
    user.role === 'agent' || user.role === 'manager'
  ) || []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUserId) return

    setIsSubmitting(true)
    try {
      await onAssign(selectedUserId)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to assign ticket:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedUser = eligibleUsers.find(user => user.id === selectedUserId)

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign Ticket</DialogTitle>
          <DialogDescription>
            Select an agent or manager to handle this ticket
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {loading ? (
            <div className="flex justify-center p-4">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertDescription>
                {error.message || 'Failed to load users'}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <Select
                value={selectedUserId}
                onValueChange={setSelectedUserId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an assignee" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <Avatar>
                          <AvatarImage src={user.profile?.avatar_url} />
                          <AvatarFallback>
                            <User2 className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <span>{user.profile?.full_name || user.email}</span>
                        <span className="text-xs text-muted-foreground">
                          ({user.role})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedUser && (
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarImage src={selectedUser.profile?.avatar_url} />
                    <AvatarFallback>
                      <User2 className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{selectedUser.profile?.full_name || selectedUser.email}</div>
                    <div className="text-sm text-muted-foreground">
                      {selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!selectedUserId || isSubmitting || loading || error ? true : undefined}
            >
              {isSubmitting ? 'Assigning...' : 'Assign Ticket'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
