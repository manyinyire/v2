import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { QueryFormConfig } from '@/types/settings'

export function useQueryForms() {
  const [forms, setForms] = useState<QueryFormConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    fetchForms()
  }, [])

  const fetchForms = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('query_forms')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setForms(data)
    } catch (error) {
      setError(error as Error)
      console.error('Error fetching forms:', error)
    } finally {
      setLoading(false)
    }
  }

  const createForm = async (formData: Omit<QueryFormConfig, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('query_forms')
        .insert([formData])
        .select()
        .single()

      if (error) throw error

      setForms((prev) => [data, ...prev])
      return data
    } catch (error) {
      console.error('Error creating form:', error)
      throw error
    }
  }

  const updateForm = async (id: string, formData: Partial<QueryFormConfig>) => {
    try {
      const { data, error } = await supabase
        .from('query_forms')
        .update(formData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      setForms((prev) =>
        prev.map((form) => (form.id === id ? { ...form, ...data } : form))
      )
      return data
    } catch (error) {
      console.error('Error updating form:', error)
      throw error
    }
  }

  const deleteForm = async (id: string) => {
    try {
      const { error } = await supabase
        .from('query_forms')
        .delete()
        .eq('id', id)

      if (error) throw error

      setForms((prev) => prev.filter((form) => form.id !== id))
    } catch (error) {
      console.error('Error deleting form:', error)
      throw error
    }
  }

  return {
    forms,
    loading,
    error,
    createForm,
    updateForm,
    deleteForm,
    refetch: fetchForms,
  }
}
