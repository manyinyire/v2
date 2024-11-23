"use client"

import { useState } from 'react'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import type { SystemSettings } from '@/types/settings'

const emailSettingsSchema = z.object({
  smtp_host: z.string().min(1, "SMTP host is required"),
  smtp_port: z.coerce.number().int().min(1).max(65535),
  smtp_user: z.string().min(1, "SMTP username is required"),
  smtp_password: z.string().min(1, "SMTP password is required"),
  from_email: z.string().email("Please enter a valid email"),
  from_name: z.string().min(1, "From name is required"),
  enable_notifications: z.boolean(),
  notification_templates: z.object({
    ticket_created: z.string().min(1, "Template is required"),
    ticket_assigned: z.string().min(1, "Template is required"),
    ticket_updated: z.string().min(1, "Template is required"),
    ticket_resolved: z.string().min(1, "Template is required")
  })
})

type EmailSettingsForm = z.infer<typeof emailSettingsSchema>

interface EmailSettingsProps {
  settings: SystemSettings
  onUpdate: (settings: Partial<SystemSettings>) => Promise<void>
}

type FormField = {
  onChange: (...event: any[]) => void;
  onBlur: () => void;
  value: any;
  name: string;
  ref: React.Ref<any>;
}

export function EmailSettings({ settings, onUpdate }: EmailSettingsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isTestingConnection, setIsTestingConnection] = useState(false)

  const form = useForm<EmailSettingsForm>({
    resolver: zodResolver(emailSettingsSchema),
    defaultValues: {
      smtp_host: settings.email_settings.smtp_host,
      smtp_port: settings.email_settings.smtp_port,
      smtp_user: settings.email_settings.smtp_user,
      smtp_password: settings.email_settings.smtp_password,
      from_email: settings.email_settings.from_email,
      from_name: settings.email_settings.from_name,
      enable_notifications: settings.email_settings.enable_notifications,
      notification_templates: settings.email_settings.notification_templates,
    },
  })

  const onSubmit = async (data: EmailSettingsForm) => {
    setIsSubmitting(true)
    try {
      await onUpdate({ email_settings: data })
      toast.success("Email settings updated successfully")
    } catch (error) {
      console.error("Failed to update email settings:", error)
      toast.error("Failed to update email settings")
    } finally {
      setIsSubmitting(false)
    }
  }

  const testConnection = async () => {
    setIsTestingConnection(true)
    try {
      const data = form.getValues()
      // Call your API to test SMTP connection
      await fetch('/api/settings/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtp_host: data.smtp_host,
          smtp_port: data.smtp_port,
          smtp_user: data.smtp_user,
          smtp_password: data.smtp_password,
        }),
      })
      toast.success("Email connection test successful")
    } catch (error) {
      console.error("Failed to test email connection:", error)
      toast.error("Failed to test email connection")
    } finally {
      setIsTestingConnection(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="smtp_host"
            render={({ field }: { field: FormField }) => (
              <FormItem>
                <FormLabel>SMTP Host</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="smtp.example.com" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="smtp_port"
            render={({ field }: { field: FormField }) => (
              <FormItem>
                <FormLabel>SMTP Port</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="smtp_user"
            render={({ field }: { field: FormField }) => (
              <FormItem>
                <FormLabel>SMTP Username</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="smtp_password"
            render={({ field }: { field: FormField }) => (
              <FormItem>
                <FormLabel>SMTP Password</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="from_email"
            render={({ field }: { field: FormField }) => (
              <FormItem>
                <FormLabel>From Email</FormLabel>
                <FormControl>
                  <Input {...field} type="email" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="from_name"
            render={({ field }: { field: FormField }) => (
              <FormItem>
                <FormLabel>From Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="enable_notifications"
          render={({ field }: { field: FormField }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel>Enable Email Notifications</FormLabel>
                <FormDescription>
                  Send automated emails for ticket updates
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Email Templates</h3>
          <div className="space-y-4">
            {Object.entries(form.getValues().notification_templates).map(([key, value]) => (
              <FormField
                key={key}
                control={form.control}
                name={`notification_templates.${key}` as any}
                render={({ field }: { field: FormField }) => (
                  <FormItem>
                    <FormLabel>
                      {key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={4}
                        placeholder="Enter email template..."
                      />
                    </FormControl>
                    <FormDescription>
                      Available variables: {'{ticket_id}'}, {'{user_name}'}, {'{ticket_status}'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={testConnection}
            disabled={isTestingConnection}
          >
            {isTestingConnection ? "Testing..." : "Test Connection"}
          </Button>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
