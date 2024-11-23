"use client"

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { GeneralSettings } from './GeneralSettings'
import { EmailSettings } from './EmailSettings'
import { PasswordSettings } from './PasswordSettings'
import { FormBuilder } from './FormBuilder'
import { useSettings } from '@/hooks/useSettings'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { SystemSettings } from '@/types/settings'

export function SettingsPage() {
  const { settings, loading, error, updateSettings } = useSettings()
  const [activeTab, setActiveTab] = useState('general')

  if (loading) {
    return <LoadingSpinner />
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">System Settings</h1>
        <p className="text-muted-foreground">Manage your system configuration and preferences</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="password">Password Policy</TabsTrigger>
          <TabsTrigger value="forms">Custom Forms</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Configure your company information and branding
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GeneralSettings
                settings={settings}
                onUpdate={updateSettings}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle>Email Settings</CardTitle>
              <CardDescription>
                Configure your email server and notification settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmailSettings
                settings={settings}
                onUpdate={updateSettings}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>Password Policy</CardTitle>
              <CardDescription>
                Configure password requirements and security settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PasswordSettings
                settings={settings}
                onUpdate={updateSettings}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forms">
          <Card>
            <CardHeader>
              <CardTitle>Custom Forms</CardTitle>
              <CardDescription>
                Configure custom form fields for each SBU
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormBuilder />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
