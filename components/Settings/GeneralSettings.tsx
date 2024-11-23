"use client"

import { useState } from 'react'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { ImageUpload } from '@/components/ui/image-upload'
import { ColorPicker } from '@/components/ui/color-picker'
import type { SystemSettings } from '@/types/settings'

const generalSettingsSchema = z.object({
  company_name: z.string().min(1, "Company name is required"),
  company_logo_url: z.string().url("Please enter a valid URL").optional(),
  primary_color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Please enter a valid hex color"),
  secondary_color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Please enter a valid hex color"),
})

type GeneralSettingsForm = z.infer<typeof generalSettingsSchema>

interface GeneralSettingsProps {
  settings: SystemSettings
  onUpdate: (settings: Partial<SystemSettings>) => Promise<void>
}

export function GeneralSettings({ settings, onUpdate }: GeneralSettingsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<GeneralSettingsForm>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      company_name: settings.company_name,
      company_logo_url: settings.company_logo_url,
      primary_color: settings.primary_color,
      secondary_color: settings.secondary_color,
    },
  })

  const onSubmit = async (data: GeneralSettingsForm) => {
    setIsSubmitting(true)
    try {
      await onUpdate(data)
      toast.success("Settings updated successfully")
    } catch (error) {
      console.error("Failed to update settings:", error)
      toast.error("Failed to update settings")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="company_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>
                This will be displayed in the application title and emails
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="company_logo_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Logo</FormLabel>
              <FormControl>
                <ImageUpload
                  value={field.value}
                  onChange={field.onChange}
                  onRemove={() => field.onChange("")}
                />
              </FormControl>
              <FormDescription>
                Upload your company logo (recommended size: 200x50px)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="primary_color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Primary Color</FormLabel>
                <FormControl>
                  <ColorPicker {...field} />
                </FormControl>
                <FormDescription>
                  Main color used throughout the application
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="secondary_color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Secondary Color</FormLabel>
                <FormControl>
                  <ColorPicker {...field} />
                </FormControl>
                <FormDescription>
                  Accent color used for highlights and CTAs
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
