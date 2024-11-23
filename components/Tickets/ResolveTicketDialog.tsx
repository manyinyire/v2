"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { Ticket } from '@/types'

interface ResolveTicketDialogProps {
  ticket: Ticket
  onResolve: (ticketId: string, resolution: string) => Promise<void>
  onClose: () => void
}

export function ResolveTicketDialog({ ticket, onResolve, onClose }: ResolveTicketDialogProps) {
  const [resolution, setResolution] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resolution.trim()) return

    setIsSubmitting(true)
    try {
      await onResolve(ticket.id, resolution)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolve Ticket #{ticket.id}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="resolution" className="text-sm font-medium">
              Resolution Details
            </label>
            <Textarea
              id="resolution"
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="Describe how the ticket was resolved..."
              className="min-h-[150px]"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!resolution.trim() || isSubmitting}
            >
              {isSubmitting ? 'Resolving...' : 'Resolve Ticket'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
