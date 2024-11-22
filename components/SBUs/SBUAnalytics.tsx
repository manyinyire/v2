"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface SLABreachData {
  sbuName: string;
  breachCount: number;
  totalTickets: number;
  breachPercentage: number;
}

interface WeeklyTrendData {
  week: string;
  tickets: number;
  avgResponseTime: number;
}

interface TicketsByTier {
  name: string;
  value: number;
}

// Sample data - Replace with actual data from your backend
const slaBreachData: SLABreachData[] = [
  { sbuName: "Convience", breachCount: 23, totalTickets: 100, breachPercentage: 23 },
  { sbuName: "Xarani", breachCount: 15, totalTickets: 150, breachPercentage: 10 },
  { sbuName: "Bank", breachCount: 8, totalTickets: 200, breachPercentage: 4 },
];

const weeklyTrends: WeeklyTrendData[] = [
  { week: "Week 1", tickets: 45, avgResponseTime: 25 },
  { week: "Week 2", tickets: 52, avgResponseTime: 22 },
  { week: "Week 3", tickets: 48, avgResponseTime: 28 },
  { week: "Week 4", tickets: 60, avgResponseTime: 20 },
];

const ticketsByTier: TicketsByTier[] = [
  { name: "Tier 1", value: 150 },
  { name: "Tier 2", value: 80 },
  { name: "Tier 3", value: 30 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

export function SBUAnalytics() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Summary Cards */}
        <Card>
          <CardHeader>
            <CardTitle>Total Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {slaBreachData.reduce((acc, curr) => acc + curr.totalTickets, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SLA Breaches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {slaBreachData.reduce((acc, curr) => acc + curr.breachCount, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Avg Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {Math.round(weeklyTrends.reduce((acc, curr) => acc + curr.avgResponseTime, 0) / weeklyTrends.length)}m
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SLA Breach by SBU */}
        <Card>
          <CardHeader>
            <CardTitle>SLA Breaches by SBU</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart width={500} height={300} data={slaBreachData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="sbuName" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="breachPercentage" fill="#ff4d4f" name="Breach %" />
            </BarChart>
          </CardContent>
        </Card>

        {/* Weekly Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart width={500} height={300} data={weeklyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="tickets" stroke="#8884d8" name="Tickets" />
              <Line yAxisId="right" type="monotone" dataKey="avgResponseTime" stroke="#82ca9d" name="Avg Response (min)" />
            </LineChart>
          </CardContent>
        </Card>

        {/* Tickets by Tier */}
        <Card>
          <CardHeader>
            <CardTitle>Tickets by Tier</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <PieChart width={400} height={300}>
              <Pie
                data={ticketsByTier}
                cx={200}
                cy={150}
                innerRadius={60}
                outerRadius={80}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
                label
              >
                {ticketsByTier.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </CardContent>
        </Card>

        {/* Top SLA Offenders Table */}
        <Card>
          <CardHeader>
            <CardTitle>SLA Breach Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SBU</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Tickets</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Breaches</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Breach %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {slaBreachData.map((sbu) => (
                    <tr key={sbu.sbuName}>
                      <td className="px-6 py-4 whitespace-nowrap">{sbu.sbuName}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{sbu.totalTickets}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{sbu.breachCount}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{sbu.breachPercentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 