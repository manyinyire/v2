"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bell, Mail, Clock, Shield, Database } from 'lucide-react'
import { toast } from "sonner"

export function Settings() {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    autoEscalation: true,
    slaWarningTime: 30,
    defaultSBU: "customer-support",
    darkMode: false,
    auditLog: true,
    backupFrequency: "daily",
    twoFactorAuth: false
  })

  const handleSaveSettings = () => {
    toast.success("Settings saved successfully")
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <Button onClick={handleSaveSettings}>Save Changes</Button>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Notification Settings</CardTitle>
            <CardDescription>Configure your notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Notifications
                </Label>
                <p className="text-sm text-muted-foreground">Receive email notifications for important updates</p>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SLA Settings</CardTitle>
            <CardDescription>Configure SLA and escalation settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Auto Escalation
                </Label>
                <p className="text-sm text-muted-foreground">Automatically escalate tickets based on SLA</p>
              </div>
              <Switch
                checked={settings.autoEscalation}
                onCheckedChange={(checked) => setSettings({ ...settings, autoEscalation: checked })}
              />
            </div>
            <div className="space-y-2">
              <Label>SLA Warning Time (minutes)</Label>
              <Input
                type="number"
                value={settings.slaWarningTime}
                onChange={(e) => setSettings({ ...settings, slaWarningTime: parseInt(e.target.value) })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Default Settings</CardTitle>
            <CardDescription>Configure system-wide defaults</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Default SBU</Label>
              <Select
                value={settings.defaultSBU}
                onValueChange={(value) => setSettings({ ...settings, defaultSBU: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select default SBU" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer-support">Customer Support</SelectItem>
                  <SelectItem value="technical-support">Technical Support</SelectItem>
                  <SelectItem value="billing-support">Billing Support</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}