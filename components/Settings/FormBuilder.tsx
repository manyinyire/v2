"use client"

import { useState } from 'react'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DragDropContext, Draggable, Droppable, DropResult } from '@hello-pangea/dnd'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import { toast } from "sonner"
import { useQueryForms } from '@/hooks/useQueryForms'
import { useAuth } from '@/contexts/AuthContext'
import type { CustomFormField, QueryFormConfig } from '@/types/settings'

const formFieldSchema = z.object({
  field_name: z.string().min(1, "Field name is required"),
  field_type: z.enum(['text', 'number', 'select', 'textarea', 'radio', 'checkbox', 'date']),
  label: z.string().min(1, "Label is required"),
  placeholder: z.string().optional(),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
  validation: z.object({
    pattern: z.string().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
  }).optional(),
  order: z.number(),
})

const queryFormSchema = z.object({
  name: z.string().min(1, "Form name is required"),
  description: z.string().optional(),
  fields: z.array(formFieldSchema),
})

type FormFieldInput = z.infer<typeof formFieldSchema>
type QueryFormInput = z.infer<typeof queryFormSchema>

export function FormBuilder() {
  const [activeTab, setActiveTab] = useState('forms')
  const [selectedForm, setSelectedForm] = useState<QueryFormConfig | null>(null)
  const { forms, loading, error, createForm, updateForm, deleteForm } = useQueryForms()
  const { profile } = useAuth()

  const form = useForm<QueryFormInput>({
    resolver: zodResolver(queryFormSchema),
    defaultValues: {
      name: '',
      description: '',
      fields: [],
    },
  })

  const onSubmit = async (data: QueryFormInput) => {
    try {
      if (!profile?.sbu_id) {
        toast.error("No SBU assigned to user")
        return
      }

      const formData: Omit<QueryFormConfig, 'id'> = {
        ...data,
        sbu_id: profile.sbu_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        fields: data.fields.map((field): CustomFormField => ({
          ...field,
          id: crypto.randomUUID(),
          sbu_id: profile.sbu_id!,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }))
      }

      if (selectedForm) {
        await updateForm(selectedForm.id, formData)
        toast.success("Form updated successfully")
      } else {
        await createForm(formData)
        toast.success("Form created successfully")
      }
      form.reset()
      setSelectedForm(null)
    } catch (error) {
      console.error("Failed to save form:", error)
      toast.error("Failed to save form")
    }
  }

  const addField = () => {
    const fields = form.getValues('fields')
    form.setValue('fields', [
      ...fields,
      {
        field_name: '',
        field_type: 'text',
        label: '',
        required: false,
        order: fields.length,
      },
    ])
  }

  const removeField = (index: number) => {
    const fields = form.getValues('fields')
    form.setValue('fields', fields.filter((_, i) => i !== index))
  }

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return

    const fields = form.getValues('fields')
    const [reorderedField] = fields.splice(result.source.index, 1)
    fields.splice(result.destination.index, 0, reorderedField)

    // Update order values
    const updatedFields = fields.map((field, index) => ({
      ...field,
      order: index,
    }))

    form.setValue('fields', updatedFields)
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="forms">Forms</TabsTrigger>
          <TabsTrigger value="builder">Form Builder</TabsTrigger>
        </TabsList>

        <TabsContent value="forms">
          <div className="grid gap-4">
            {forms?.map((formConfig) => (
              <Card key={formConfig.id}>
                <CardHeader>
                  <CardTitle>{formConfig.name}</CardTitle>
                  {formConfig.description && <CardDescription>{formConfig.description}</CardDescription>}
                </CardHeader>
                <CardFooter className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      form.reset(formConfig)
                      setSelectedForm(formConfig)
                      setActiveTab('builder')
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => deleteForm(formConfig.id)}
                  >
                    Delete
                  </Button>
                </CardFooter>
              </Card>
            ))}

            <Card className="flex items-center justify-center">
              <Button
                variant="ghost"
                className="h-[200px] w-full"
                onClick={() => {
                  form.reset()
                  setSelectedForm(null)
                  setActiveTab('builder')
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create New Form
              </Button>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="builder">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>Form Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Form Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Form Fields</CardTitle>
                    <CardDescription>
                      Drag and drop to reorder fields
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addField}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Field
                  </Button>
                </CardHeader>
                <CardContent>
                  <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="fields">
                      {(provided: any) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                        >
                          {form.watch('fields').map((field, index) => (
                            <Draggable
                              key={index}
                              draggableId={`field-${index}`}
                              index={index}
                            >
                              {(provided: any) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className="mb-4"
                                >
                                  <Card>
                                    <CardHeader className="flex flex-row items-center">
                                      <div {...provided.dragHandleProps}>
                                        <GripVertical className="h-5 w-5" />
                                      </div>
                                      <div className="flex-1">Field {index + 1}</div>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeField(index)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                      <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                          control={form.control}
                                          name={`fields.${index}.field_name`}
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormLabel>Field Name</FormLabel>
                                              <FormControl>
                                                <Input {...field} />
                                              </FormControl>
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />

                                        <FormField
                                          control={form.control}
                                          name={`fields.${index}.field_type`}
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormLabel>Field Type</FormLabel>
                                              <FormControl>
                                                <Select
                                                  value={field.value}
                                                  onValueChange={field.onChange}
                                                >
                                                  <SelectTrigger>
                                                    <SelectValue />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    <SelectItem value="text">Text</SelectItem>
                                                    <SelectItem value="number">Number</SelectItem>
                                                    <SelectItem value="select">Select</SelectItem>
                                                    <SelectItem value="textarea">Textarea</SelectItem>
                                                    <SelectItem value="radio">Radio</SelectItem>
                                                    <SelectItem value="checkbox">Checkbox</SelectItem>
                                                    <SelectItem value="date">Date</SelectItem>
                                                  </SelectContent>
                                                </Select>
                                              </FormControl>
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />
                                      </div>

                                      <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                          control={form.control}
                                          name={`fields.${index}.label`}
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormLabel>Label</FormLabel>
                                              <FormControl>
                                                <Input {...field} />
                                              </FormControl>
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />

                                        <FormField
                                          control={form.control}
                                          name={`fields.${index}.placeholder`}
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormLabel>Placeholder</FormLabel>
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
                                        name={`fields.${index}.required`}
                                        render={({ field }) => (
                                          <FormItem className="flex items-center gap-2">
                                            <FormControl>
                                              <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                              />
                                            </FormControl>
                                            <FormLabel>Required Field</FormLabel>
                                          </FormItem>
                                        )}
                                      />

                                      {['select', 'radio', 'checkbox'].includes(form.watch(`fields.${index}.field_type`)) && (
                                        <FormField
                                          control={form.control}
                                          name={`fields.${index}.options`}
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormLabel>Options</FormLabel>
                                              <FormControl>
                                                <Input
                                                  {...field}
                                                  value={field.value?.join(', ') || ''}
                                                  onChange={(e) => field.onChange(e.target.value.split(',').map(s => s.trim()))}
                                                  placeholder="Option 1, Option 2, Option 3"
                                                />
                                              </FormControl>
                                              <FormDescription>
                                                Separate options with commas
                                              </FormDescription>
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />
                                      )}
                                    </CardContent>
                                  </Card>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                </CardContent>
              </Card>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    form.reset()
                    setSelectedForm(null)
                    setActiveTab('forms')
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {selectedForm ? 'Update Form' : 'Create Form'}
                </Button>
              </div>
            </form>
          </Form>
        </TabsContent>
      </Tabs>
    </div>
  )
}
