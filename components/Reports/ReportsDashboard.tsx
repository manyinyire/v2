"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DatePickerWithRange } from '@/components/ui/date-range-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { addDays } from "date-fns"
import { DateRange } from "react-day-picker"
import { Button } from "@/components/ui/button"
import * as XLSX from 'xlsx'; // Import XLSX for Excel generation
import jsPDF from 'jspdf'; // Import jsPDF for PDF generation

export function ReportsDashboard() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 7),
  })
  const [sbu, setSbu] = useState("all")
  const [status, setStatus] = useState("all")

  const handleGenerateReport = () => {
    if (!date || !date.from || !date.to) return; // Ensure date range is defined and has both from and to dates
    const reportData = [
      { DateRange: `${date.from.toLocaleDateString()} - ${date.to.toLocaleDateString()}`, SBU: sbu, Status: status },
      // Add more data rows as needed
    ];

    // Generate Excel Report
    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, "report.xlsx");

    // Generate PDF Report
    const doc = new jsPDF();
    doc.text("Report", 20, 20);
    if (date && date.from && date.to) {
      doc.text(`Date Range: ${date.from.toLocaleDateString()} - ${date.to.toLocaleDateString()}`, 20, 30);
    }
    doc.text(`SBU: ${sbu}`, 20, 40);
    doc.text(`Status: ${status}`, 20, 50);
    doc.save("report.pdf");
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-8">Reports</h1>
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div>
              <Label>Date Range</Label>
              <DatePickerWithRange date={date} setDate={setDate} />
            </div>
            <div>
              <Label>SBU</Label>
              <Select value={sbu} onValueChange={setSbu}>
                <SelectTrigger>
                  <SelectValue placeholder="Select SBU" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All SBUs</SelectItem>
                  <SelectItem value="customer-support">Customer Support</SelectItem>
                  <SelectItem value="technical-support">Technical Support</SelectItem>
                  <SelectItem value="billing-support">Billing Support</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ticket Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="escalated">Escalated</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Button onClick={handleGenerateReport}>Generate Report</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}