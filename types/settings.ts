// System Settings Types
export interface SystemSettings {
  id: string
  company_name: string
  company_logo_url: string
  primary_color: string
  secondary_color: string
  email_settings: EmailSettings
  password_policy: PasswordPolicy
  created_at: string
  updated_at: string
}

export interface EmailSettings {
  smtp_host: string
  smtp_port: number
  smtp_user: string
  smtp_password: string
  from_email: string
  from_name: string
  enable_notifications: boolean
  notification_templates: {
    ticket_created: string
    ticket_assigned: string
    ticket_updated: string
    ticket_resolved: string
  }
}

export interface PasswordPolicy {
  min_length: number
  require_uppercase: boolean
  require_lowercase: boolean
  require_numbers: boolean
  require_special_chars: boolean
  max_age_days: number
  prevent_reuse: number
}

// Custom Form Field Types
export interface CustomFormField {
  id: string
  sbu_id: string
  field_name: string
  field_type: 'text' | 'number' | 'select' | 'textarea' | 'radio' | 'checkbox' | 'date'
  label: string
  placeholder?: string
  required: boolean
  options?: string[] // For select, radio, checkbox fields
  validation?: {
    pattern?: string
    min?: number
    max?: number
    minLength?: number
    maxLength?: number
  }
  order: number
  created_at: string
  updated_at: string
}

export interface QueryFormConfig {
  id: string
  sbu_id: string
  name: string
  description?: string
  fields: CustomFormField[]
  created_at: string
  updated_at: string
}

export interface DynamicFormData {
  [key: string]: string | number | boolean | string[]
}
