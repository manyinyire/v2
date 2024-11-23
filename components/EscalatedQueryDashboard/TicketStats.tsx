'use client'

import { BarChart2, AlertCircle, Bell, Users, Clock, CheckCircle2, SlidersHorizontal } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type Ticket } from '@/types'
import { useEffect, useState } from 'react'

interface TicketStatsProps {
  stats: {
    total: number;
    open: number;
    resolvedToday: number;
    avgResolutionTime: number;
  } | null;
  statusData: Array<{
    status: string;
    count: number;
  }> | null;
  sbuData: Array<{
    sbu: string;
    total: number;
    resolved: number;
    resolutionRate: number;
  }> | null;
}

export function TicketStats({ stats, statusData, sbuData }: TicketStatsProps) {
  if (!stats || !statusData || !sbuData) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-muted-foreground">
              {stats.open} open tickets
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            <div>
              <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
              <p className="text-2xl font-bold">{stats.resolvedToday}</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-muted-foreground">
              {stats.avgResolutionTime} hours avg. resolution time
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            <div>
              <CardTitle className="text-sm font-medium">Status Breakdown</CardTitle>
              <div className="mt-2 space-y-1">
                {statusData.map((status) => (
                  <div key={status.status} className="flex justify-between text-sm">
                    <span className="capitalize">{status.status}</span>
                    <span className="font-medium">{status.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            <div>
              <CardTitle className="text-sm font-medium">SBU Performance</CardTitle>
              <div className="mt-2 space-y-1">
                {sbuData.map((sbu) => (
                  <div key={sbu.sbu} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{sbu.sbu}</span>
                      <span className="font-medium">{sbu.resolutionRate}%</span>
                    </div>
                    <div className="h-1 bg-secondary">
                      <div
                        className="h-1 bg-primary"
                        style={{ width: `${sbu.resolutionRate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}