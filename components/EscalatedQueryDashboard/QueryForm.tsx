"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { toast } from "sonner"
import type { QueryFormData } from '@/types/forms'

interface QueryFormProps {
  onSubmit: (data: QueryFormData) => Promise<void>
}

export function QueryForm({ onSubmit }: QueryFormProps) {
  const [formData, setFormData] = useState<QueryFormData>({
    sbu: "",
    queryDescription: "",
    cardNumber: "",
    systemModule: "",
    accountNumber: "",
    queryType: ""
  })

  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSubmit(formData)
      setFormData({
        sbu: "",
        queryDescription: "",
        cardNumber: "",
        systemModule: "",
        accountNumber: "",
        queryType: ""
      })
      toast.success("Query submitted successfully")
    } catch (error) {
      console.error("Error submitting query:", error)
      toast.error("Failed to submit query")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Submit Query</CardTitle>
          <CardDescription>
            Fill out the form below to submit your query.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="sbu">Strategic Business Unit (SBU)</Label>
            <Select
              value={formData.sbu}
              onValueChange={(value) => setFormData(prev => ({ ...prev, sbu: value }))}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select SBU" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer-support">Customer Support</SelectItem>
                <SelectItem value="technical-support">Technical Support</SelectItem>
                <SelectItem value="billing-support">Billing Support</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="queryType">Query Type</Label>
            <RadioGroup
              value={formData.queryType}
              onValueChange={(value) => setFormData(prev => ({ ...prev, queryType: value }))}
              required
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="general" id="general" />
                <Label htmlFor="general">General</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="technical" id="technical" />
                <Label htmlFor="technical">Technical</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="billing" id="billing" />
                <Label htmlFor="billing">Billing</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cardNumber">Card Number (Optional)</Label>
            <Input
              id="cardNumber"
              value={formData.cardNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, cardNumber: e.target.value }))}
              placeholder="Enter card number if applicable"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="systemModule">System Module (Optional)</Label>
            <Input
              id="systemModule"
              value={formData.systemModule}
              onChange={(e) => setFormData(prev => ({ ...prev, systemModule: e.target.value }))}
              placeholder="Enter system module if applicable"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountNumber">Account Number (Optional)</Label>
            <Input
              id="accountNumber"
              value={formData.accountNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
              placeholder="Enter account number if applicable"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="queryDescription">Query Description</Label>
            <Textarea
              id="queryDescription"
              value={formData.queryDescription}
              onChange={(e) => setFormData(prev => ({ ...prev, queryDescription: e.target.value }))}
              placeholder="Describe your query in detail"
              required
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={loading}>
            {loading ? "Submitting..." : "Submit Query"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}