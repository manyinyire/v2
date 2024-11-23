"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDistanceToNow, format } from 'date-fns'
import { useUser } from '@/hooks/useUser'
import type { Database } from '@/types/supabase'
import type { Ticket } from '@/types'

type UserRole = Database['public']['Enums']['user_role']
type TabValue = 'all' | 'internal' | 'external'

interface TicketComment {
  id: string
  created_at: string
  content: string
  is_internal: boolean
  user: {
    id: string
    name: string
    role: UserRole
    avatar_url?: string | null
  }
}

interface TicketCommentsProps {
  ticketId: string
  onAddComment?: (ticketId: string, content: string, isInternal: boolean) => Promise<void>
  className?: string
}

export function TicketComments({ ticketId, onAddComment, className = '' }: TicketCommentsProps) {
  const { profile } = useUser()
  const [newComment, setNewComment] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<TabValue>('all')
  const [comments, setComments] = useState<TicketComment[]>([])

  const userRole = profile?.role || 'user'

  // Check permissions
  const canViewInternalComments = ['agent', 'manager', 'admin'].includes(userRole as UserRole)
  const canAddInternalComments = ['agent', 'manager', 'admin'].includes(userRole as UserRole)

  // Filter comments based on permissions and active tab
  const filteredComments = comments.filter(comment => {
    if (!canViewInternalComments && comment.is_internal) return false
    if (activeTab === 'internal') return comment.is_internal
    if (activeTab === 'external') return !comment.is_internal
    return true
  })

  // Sort comments by date (newest first)
  const sortedComments = [...filteredComments].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !profile?.id) return
    if (isInternal && !canAddInternalComments) return

    setIsSubmitting(true)
    try {
      await onAddComment?.(ticketId, newComment, isInternal)
      setNewComment('')
      setIsInternal(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {canViewInternalComments && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All Comments</TabsTrigger>
            <TabsTrigger value="internal">Internal Only</TabsTrigger>
            <TabsTrigger value="external">External Only</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      <ScrollArea className="h-[400px] pr-4">
        {sortedComments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No comments yet</p>
        ) : (
          <div className="space-y-4">
            {sortedComments.map((comment) => (
              <div
                key={comment.id}
                className={`p-4 rounded-lg ${
                  comment.is_internal
                    ? 'bg-muted/50 border border-muted-foreground/20'
                    : 'bg-background border'
                }`}
              >
                <div className="flex items-start gap-4">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={comment.user.avatar_url || undefined} />
                    <AvatarFallback>{getInitials(comment.user.name)}</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-grow space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{comment.user.name}</span>
                        {comment.is_internal && (
                          <Badge variant="outline" className="text-xs">
                            Internal
                          </Badge>
                        )}
                        {comment.user.role !== 'user' && (
                          <Badge variant="secondary" className="text-xs">
                            {comment.user.role}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-col items-end text-sm text-muted-foreground">
                        <span>{format(new Date(comment.created_at), 'MMM d, yyyy')}</span>
                        <span>{format(new Date(comment.created_at), 'h:mm a')}</span>
                      </div>
                    </div>
                    <p className="whitespace-pre-wrap text-sm">{comment.content}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Type your comment here..."
          className="min-h-[100px] resize-none"
        />
        
        <div className="flex items-center justify-between">
          {canAddInternalComments && (
            <div className="flex items-center space-x-2">
              <Switch
                id="internal"
                checked={isInternal}
                onCheckedChange={setIsInternal}
              />
              <Label htmlFor="internal">Internal comment</Label>
            </div>
          )}
          
          <Button
            type="submit"
            disabled={!newComment.trim() || isSubmitting || !profile?.id}
          >
            {isSubmitting ? 'Adding...' : 'Add Comment'}
          </Button>
        </div>
      </form>
    </div>
  )
}
