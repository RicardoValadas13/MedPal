export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          birth_date: string | null
          sns_number: string | null
          timezone: string
          locale: string
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          birth_date?: string | null
          sns_number?: string | null
          timezone?: string
          locale?: string
        }
        Update: {
          full_name?: string | null
          birth_date?: string | null
          sns_number?: string | null
          timezone?: string
          locale?: string
        }
      }
      prescriptions: {
        Row: {
          id: string
          user_id: string
          source_type: 'rsp_pdf' | 'photo' | 'image'
          file_path: string
          status: 'uploaded' | 'processing' | 'extracted' | 'confirmed' | 'failed'
          prescribed_at: string | null
          doctor_name: string | null
          rsp_number: string | null
          access_code: string | null
          raw_extraction: Json | null
          created_at: string
        }
        Insert: {
          user_id: string
          source_type: 'rsp_pdf' | 'photo' | 'image'
          file_path: string
          status?: 'uploaded' | 'processing' | 'extracted' | 'confirmed' | 'failed'
          prescribed_at?: string | null
          doctor_name?: string | null
          rsp_number?: string | null
          access_code?: string | null
          raw_extraction?: Json | null
        }
        Update: {
          status?: 'uploaded' | 'processing' | 'extracted' | 'confirmed' | 'failed'
          prescribed_at?: string | null
          doctor_name?: string | null
          rsp_number?: string | null
          access_code?: string | null
          raw_extraction?: Json | null
        }
      }
      prescription_items: {
        Row: {
          id: string
          prescription_id: string
          drug_id: string | null
          extracted_name: string
          extracted_dosage: string | null
          extracted_form: string | null
          quantity: number | null
          posology_text: string | null
          posology_structured: Json | null
          match_confidence: number | null
          match_status: 'matched' | 'ambiguous' | 'unmatched' | 'manual'
          field_confidences: Json | null
          created_at: string
        }
        Insert: {
          prescription_id: string
          drug_id?: string | null
          extracted_name: string
          extracted_dosage?: string | null
          extracted_form?: string | null
          quantity?: number | null
          posology_text?: string | null
          posology_structured?: Json | null
          match_confidence?: number | null
          match_status?: 'matched' | 'ambiguous' | 'unmatched' | 'manual'
          field_confidences?: Json | null
        }
        Update: {
          drug_id?: string | null
          extracted_name?: string
          extracted_dosage?: string | null
          extracted_form?: string | null
          quantity?: number | null
          posology_text?: string | null
          posology_structured?: Json | null
          match_confidence?: number | null
          match_status?: 'matched' | 'ambiguous' | 'unmatched' | 'manual'
          field_confidences?: Json | null
        }
      }
      drugs: {
        Row: {
          id: string
          aim_number: string | null
          cnpem_code: string | null
          name: string
          active_substance: string | null
          strength: string | null
          form: string | null
          route: string | null
          atc_code: string | null
          leaflet_url: string | null
          rcm_url: string | null
          is_marketed: boolean
          last_synced_at: string | null
        }
        Insert: {
          aim_number?: string | null
          cnpem_code?: string | null
          name: string
          active_substance?: string | null
          strength?: string | null
          form?: string | null
          route?: string | null
          atc_code?: string | null
          leaflet_url?: string | null
          rcm_url?: string | null
          is_marketed?: boolean
          last_synced_at?: string | null
        }
        Update: {
          aim_number?: string | null
          cnpem_code?: string | null
          name?: string
          active_substance?: string | null
          strength?: string | null
          form?: string | null
          route?: string | null
          atc_code?: string | null
          leaflet_url?: string | null
          rcm_url?: string | null
          is_marketed?: boolean
          last_synced_at?: string | null
        }
      }
      user_medications: {
        Row: {
          id: string
          user_id: string
          drug_id: string | null
          prescription_item_id: string | null
          display_name: string
          dosage: string | null
          start_date: string | null
          end_date: string | null
          source: 'prescription' | 'manual'
          quantity_on_hand: number | null
          refill_threshold: number | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          user_id: string
          drug_id?: string | null
          prescription_item_id?: string | null
          display_name: string
          dosage?: string | null
          start_date?: string | null
          end_date?: string | null
          source: 'prescription' | 'manual'
          quantity_on_hand?: number | null
          refill_threshold?: number | null
          is_active?: boolean
        }
        Update: {
          drug_id?: string | null
          display_name?: string
          dosage?: string | null
          start_date?: string | null
          end_date?: string | null
          source?: 'prescription' | 'manual'
          quantity_on_hand?: number | null
          refill_threshold?: number | null
          is_active?: boolean
        }
      }
      schedules: {
        Row: {
          id: string
          user_medication_id: string
          time_of_day: string
          days_of_week: number[]
          dose_amount: number | null
          dose_unit: string | null
          with_food: boolean
          created_at: string
        }
        Insert: {
          user_medication_id: string
          time_of_day: string
          days_of_week?: number[]
          dose_amount?: number | null
          dose_unit?: string | null
          with_food?: boolean
        }
        Update: {
          time_of_day?: string
          days_of_week?: number[]
          dose_amount?: number | null
          dose_unit?: string | null
          with_food?: boolean
        }
      }
      intake_events: {
        Row: {
          id: string
          user_medication_id: string
          schedule_id: string
          scheduled_at: string
          status: 'pending' | 'taken' | 'skipped' | 'missed' | 'snoozed'
          responded_at: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          user_medication_id: string
          schedule_id: string
          scheduled_at: string
          status?: 'pending' | 'taken' | 'skipped' | 'missed' | 'snoozed'
          responded_at?: string | null
          notes?: string | null
        }
        Update: {
          status?: 'pending' | 'taken' | 'skipped' | 'missed' | 'snoozed'
          responded_at?: string | null
          notes?: string | null
        }
      }
      checkins: {
        Row: {
          id: string
          user_id: string
          user_medication_id: string | null
          recorded_at: string
          mood: number | null
          symptoms: string[] | null
          side_effects: string[] | null
          notes: string | null
        }
        Insert: {
          user_id: string
          user_medication_id?: string | null
          recorded_at?: string
          mood?: number | null
          symptoms?: string[] | null
          side_effects?: string[] | null
          notes?: string | null
        }
        Update: {
          mood?: number | null
          symptoms?: string[] | null
          side_effects?: string[] | null
          notes?: string | null
        }
      }
      conversations: {
        Row: {
          id: string
          user_id: string
          created_at: string
        }
        Insert: {
          user_id: string
        }
        Update: Record<string, never>
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          role: 'user' | 'assistant'
          content: string
          context_refs: Json | null
          created_at: string
        }
        Insert: {
          conversation_id: string
          role: 'user' | 'assistant'
          content: string
          context_refs?: Json | null
        }
        Update: {
          content?: string
          context_refs?: Json | null
        }
      }
      patient_profiles: {
        Row: {
          id: string
          full_name: string | null
          address: string | null
          floor: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          caregiver_contact_name: string | null
          caregiver_contact_phone: string | null
          country: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          address?: string | null
          floor?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          caregiver_contact_name?: string | null
          caregiver_contact_phone?: string | null
          country?: string
        }
        Update: {
          full_name?: string | null
          address?: string | null
          floor?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          caregiver_contact_name?: string | null
          caregiver_contact_phone?: string | null
          country?: string
          updated_at?: string
        }
      }
      caregiver_settings: {
        Row: {
          user_id: string
          pin_hash: string
          missed_med_alert: boolean
          emergency_voice: boolean
          critical_med_ids: string[]
          updated_at: string
        }
        Insert: {
          user_id: string
          pin_hash: string
          missed_med_alert?: boolean
          emergency_voice?: boolean
          critical_med_ids?: string[]
        }
        Update: {
          pin_hash?: string
          missed_med_alert?: boolean
          emergency_voice?: boolean
          critical_med_ids?: string[]
          updated_at?: string
        }
      }
      calendar_links: {
        Row: {
          id: string
          schedule_id: string
          provider: string
          external_event_id: string | null
          synced_at: string | null
        }
        Insert: {
          schedule_id: string
          provider: string
          external_event_id?: string | null
          synced_at?: string | null
        }
        Update: {
          external_event_id?: string | null
          synced_at?: string | null
        }
      }
    }
  }
}

// Convenience row types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Prescription = Database['public']['Tables']['prescriptions']['Row']
export type PrescriptionItem = Database['public']['Tables']['prescription_items']['Row']
export type Drug = Database['public']['Tables']['drugs']['Row']
export type UserMedication = Database['public']['Tables']['user_medications']['Row']
export type Schedule = Database['public']['Tables']['schedules']['Row']
export type IntakeEvent = Database['public']['Tables']['intake_events']['Row']
export type Checkin = Database['public']['Tables']['checkins']['Row']
export type Conversation = Database['public']['Tables']['conversations']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type PatientProfile = Database['public']['Tables']['patient_profiles']['Row']
export type CaregiverSettings = Database['public']['Tables']['caregiver_settings']['Row']
