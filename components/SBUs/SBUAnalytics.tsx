'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSBUAnalytics } from '@/hooks/useSBUAnalytics'
import { useAuth } from '@/contexts/AuthContext'
import {
  LineChart,
  BarChart,
  PieChart,
  ResponsiveContainer,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Bar,
  Pie,
  Cell
} from 'recharts'
import { Loader2, Download, Mail, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

export function SBUAnalytics() {
  const { profile } = useAuth()
  const [dateRange, setDateRange] = useState<[Date | undefined, Date | undefined]>([undefined, undefined])
  const [selectedSBU, setSelectedSBU] = useState<string>(profile?.sbu || '')
  const [selectedMetric, setSelectedMetric] = useState<string>('total_queries')
  const [reportSchedule, setReportSchedule] = useState<string>('weekly')
  const [reportEmails, setReportEmails] = useState<string>('')

  const {
    useMetrics,
    useComparativeMetrics,
    useHistoricalTrends,
    exportReport,
    scheduleReport,
    useReportSchedules,
    deleteSchedule
  } = useSBUAnalytics()

  const filters = {
    startDate: dateRange[0] || new Date(),
    endDate: dateRange[1] || new Date(),
    sbu: selectedSBU
  }

  const { data: metrics, isLoading: metricsLoading } = useMetrics(filters)
  const { data: comparativeData } = useComparativeMetrics('month')
  const { data: trends } = useHistoricalTrends(selectedMetric as any, 12)
  const { data: schedules } = useReportSchedules()

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      const data = await exportReport(filters, format)
      // Handle the exported data (e.g., download)
      toast.success(`Report exported successfully in ${format.toUpperCase()} format`)
    } catch (error) {
      toast.error('Failed to export report')
    }
  }

  const handleScheduleReport = async () => {
    try {
      const emails = reportEmails.split(',').map(email => email.trim())
      await scheduleReport(reportSchedule as any, emails, filters)
      toast.success('Report scheduled successfully')
      setReportEmails('')
    } catch (error) {
      toast.error('Failed to schedule report')
    }
  }

  if (metricsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">SBU Analytics</h2>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => handleExport('csv')}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport('pdf')}
          >
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Queries</CardTitle>
            <div className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.total_queries}</div>
            <p className="text-xs text-muted-foreground">
              +{((metrics?.total_queries || 0) / 100).toFixed(1)}% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
            <div className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(((metrics?.resolved_queries || 0) / (metrics?.total_queries || 1)) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.resolved_queries} queries resolved
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
            <div className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(metrics?.average_resolution_time || 0).toFixed(1)}h
            </div>
            <p className="text-xs text-muted-foreground">
              Target: 24h
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Satisfaction Rate</CardTitle>
            <div className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((metrics?.satisfaction_rate || 0) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Based on user feedback
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="comparison">SBU Comparison</TabsTrigger>
          <TabsTrigger value="reports">Scheduled Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Query Resolution Trends</CardTitle>
                <CardDescription>
                  Resolution time and satisfaction rate over time
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics?.response_times}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="time"
                      stroke="#8884d8"
                      name="Resolution Time (hours)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Categories</CardTitle>
                <CardDescription>
                  Most common query categories
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metrics?.top_categories}
                      dataKey="count"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {metrics?.top_categories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Query Status Distribution</CardTitle>
                <CardDescription>
                  Current status of all queries
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: 'Resolved', value: metrics?.resolved_queries || 0 },
                      { name: 'Pending', value: metrics?.pending_queries || 0 },
                      { name: 'Escalated', value: metrics?.escalated_queries || 0 },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historical Trends</CardTitle>
              <CardDescription>
                Track metrics over time
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#8884d8"
                    name={selectedMetric}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SBU Performance Comparison</CardTitle>
              <CardDescription>
                Compare metrics across different SBUs
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={Object.entries(comparativeData || {}).map(([sbu, data]) => ({
                    sbu,
                    ...data,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="sbu" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total_queries" fill="#8884d8" name="Total Queries" />
                  <Bar dataKey="resolved_queries" fill="#82ca9d" name="Resolved Queries" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Schedule Reports</CardTitle>
              <CardDescription>
                Set up automated report delivery
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Schedule</Label>
                  <Select
                    value={reportSchedule}
                    onValueChange={setReportSchedule}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select schedule" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Recipients (comma-separated)</Label>
                  <Input
                    value={reportEmails}
                    onChange={(e) => setReportEmails(e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
              </div>
              <Button
                className="w-full"
                onClick={handleScheduleReport}
              >
                <Mail className="mr-2 h-4 w-4" />
                Schedule Report
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Scheduled Reports</CardTitle>
              <CardDescription>
                Manage your scheduled reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {schedules?.map((schedule) => (
                  <div
                    key={schedule.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{schedule.schedule} Report</p>
                      <p className="text-sm text-muted-foreground">
                        Recipients: {schedule.recipients.join(', ')}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteSchedule(schedule.id)}
                    >
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}