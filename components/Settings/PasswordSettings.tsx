"use client"

import { useState } from 'react'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import type { SystemSettings } from '@/types/settings'

const passwordSettingsSchema = z.object({
  min_length: z.number().int().min(8).max(128),
  require_uppercase: z.boolean(),
  require_lowercase: z.boolean(),
  require_numbers: z.boolean(),
  require_special_chars: z.boolean(),
  max_age_days: z.number().int().min(0).max(365),
  prevent_reuse: z.number().int().min(0).max(24),
})

type PasswordSettingsForm = z.infer<typeof passwordSettingsSchema>

interface PasswordSettingsProps {
  settings: SystemSettings
  onUpdate: (settings: Partial<SystemSettings>) => Promise<void>
}

export function PasswordSettings({ settings, onUpdate }: PasswordSettingsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<PasswordSettingsForm>({
    resolver: zodResolver(passwordSettingsSchema),
    defaultValues: {
      min_length: settings.password_policy.min_length,
      require_uppercase: settings.password_policy.require_uppercase,
      require_lowercase: settings.password_policy.require_lowercase,
      require_numbers: settings.password_policy.require_numbers,
      require_special_chars: settings.password_policy.require_special_chars,
      max_age_days: settings.password_policy.max_age_days,
      prevent_reuse: settings.password_policy.prevent_reuse,
    },
  })

  const onSubmit = async (data: PasswordSettingsForm) => {
    setIsSubmitting(true)
    try {
      await onUpdate({ password_policy: data })
      toast.success("Password policy updated successfully")
    } catch (error) {
      console.error("Failed to update password policy:", error)
      toast.error("Failed to update password policy")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="min_length"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Minimum Password Length</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                />
              </FormControl>
              <FormDescription>
                Minimum number of characters required for passwords (8-128)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <FormField
            control={form.control}
            name="require_uppercase"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel>Require Uppercase Letters</FormLabel>
                  <FormDescription>
                    Require at least one uppercase letter
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

          <FormField
            control={form.control}
            name="require_lowercase"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel>Require Lowercase Letters</FormLabel>
                  <FormDescription>
                    Require at least one lowercase letter
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

          <FormField
            control={form.control}
            name="require_numbers"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel>Require Numbers</FormLabel>
                  <FormDescription>
                    Require at least one number
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

          <FormField
            control={form.control}
            name="require_special_chars"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel>Require Special Characters</FormLabel>
                  <FormDescription>
                    Require at least one special character (!@#$%^&*)
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
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="max_age_days"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Maximum Password Age</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                  />
                </FormControl>
                <FormDescription>
                  Days before password expires (0 for never)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="prevent_reuse"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prevent Password Reuse</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                  />
                </FormControl>
                <FormDescription>
                  Number of previous passwords to remember (0-24)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </Form>
  )
}
