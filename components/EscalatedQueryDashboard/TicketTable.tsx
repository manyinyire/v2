"use client"

import { Eye, ArrowUpCircle, CheckCircle } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { SLACountdown } from './SLACountdown'
import { TicketStatus } from '../../types/TicketStatus'

export interface Ticket {
  id: string
  sbu: string
  status: TicketStatus;
  description: string;
  createdAt: number;
  assignee?: string;
  slaTime: number;
}

interface TicketTableProps {
  tickets: Ticket[]
  showAssignee?: boolean
  onUpdate: (id: string, status: TicketStatus, slaTime: number) => void
  onEscalate: (id: string) => void
  onResolve: (id: string) => void
}

export function TicketTable({ tickets, showAssignee, onUpdate, onEscalate, onResolve }: TicketTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Tickets</CardTitle>
        <CardDescription>Overview of the latest escalated queries</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Ticket ID</TableHead>
              <TableHead>SBU</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">SLA</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map(ticket => (
              <TableRow key={ticket.id}>
                <TableCell className="font-medium">{ticket.id}</TableCell>
                <TableCell>{ticket.sbu}</TableCell>
                <TableCell>{ticket.status}</TableCell>
                <TableCell className="text-right">
                  {ticket.status !== 'Resolved' ? (
                    <SLACountdown
                      ticket={ticket}
                      onUpdate={onUpdate}
                    />
                  ) : (
                    <span className="text-green-500">Resolved</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Ticket Details: {ticket.id}</DialogTitle>
                          <DialogDescription>
                            SBU: {ticket.sbu}<br />
                            Status: {ticket.status}<br />
                            Created: {new Date(ticket.createdAt).toLocaleString()}<br />
                            Description: {ticket.description}
                          </DialogDescription>
                        </DialogHeader>
                      </DialogContent>
                    </Dialog>
                    {ticket.status !== 'Resolved' && ticket.status !== 'Escalated (Tier 3)' && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => onEscalate(ticket.id)}
                      >
                        <ArrowUpCircle className="h-4 w-4" />
                      </Button>
                    )}
                    {ticket.status !== 'Resolved' && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => onResolve(ticket.id)}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
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