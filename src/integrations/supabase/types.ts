export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      agent_activity: {
        Row: {
          action_type: string
          agent_name: string | null
          cost_usd: number | null
          created_at: string | null
          error_detail: string | null
          homeowner_id: string | null
          id: string
          input_summary: string | null
          lead_id: string | null
          output_summary: string | null
          success: boolean | null
          tokens_used: number | null
        }
        Insert: {
          action_type: string
          agent_name?: string | null
          cost_usd?: number | null
          created_at?: string | null
          error_detail?: string | null
          homeowner_id?: string | null
          id?: string
          input_summary?: string | null
          lead_id?: string | null
          output_summary?: string | null
          success?: boolean | null
          tokens_used?: number | null
        }
        Update: {
          action_type?: string
          agent_name?: string | null
          cost_usd?: number | null
          created_at?: string | null
          error_detail?: string | null
          homeowner_id?: string | null
          id?: string
          input_summary?: string | null
          lead_id?: string | null
          output_summary?: string | null
          success?: boolean | null
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_activity_homeowner_id_fkey"
            columns: ["homeowner_id"]
            isOneToOne: false
            referencedRelation: "homeowners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_activity_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          both_spouses_confirmed: boolean | null
          created_at: string | null
          homeowner_id: string
          id: string
          lead_id: string
          meet_link: string | null
          outcome: string | null
          pre_brief_generated: boolean | null
          pre_brief_notes: string | null
          rep_notes: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          status: string | null
          time_slot: string | null
          will_notified_email_at: string | null
          will_notified_sms_at: string | null
        }
        Insert: {
          both_spouses_confirmed?: boolean | null
          created_at?: string | null
          homeowner_id: string
          id?: string
          lead_id: string
          meet_link?: string | null
          outcome?: string | null
          pre_brief_generated?: boolean | null
          pre_brief_notes?: string | null
          rep_notes?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: string | null
          time_slot?: string | null
          will_notified_email_at?: string | null
          will_notified_sms_at?: string | null
        }
        Update: {
          both_spouses_confirmed?: boolean | null
          created_at?: string | null
          homeowner_id?: string
          id?: string
          lead_id?: string
          meet_link?: string | null
          outcome?: string | null
          pre_brief_generated?: boolean | null
          pre_brief_notes?: string | null
          rep_notes?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: string | null
          time_slot?: string | null
          will_notified_email_at?: string | null
          will_notified_sms_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_homeowner_id_fkey"
            columns: ["homeowner_id"]
            isOneToOne: false
            referencedRelation: "homeowners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      closed_deals: {
        Row: {
          commission_amount: number | null
          contractor_id: string | null
          created_at: string | null
          equipment_option: string | null
          final_revenue: number | null
          homeowner_id: string
          id: string
          installed_at: string | null
          is_self_generated: boolean | null
          lead_id: string
          proposal_id: string | null
          self_gen_commission_rate: number | null
        }
        Insert: {
          commission_amount?: number | null
          contractor_id?: string | null
          created_at?: string | null
          equipment_option?: string | null
          final_revenue?: number | null
          homeowner_id: string
          id?: string
          installed_at?: string | null
          is_self_generated?: boolean | null
          lead_id: string
          proposal_id?: string | null
          self_gen_commission_rate?: number | null
        }
        Update: {
          commission_amount?: number | null
          contractor_id?: string | null
          created_at?: string | null
          equipment_option?: string | null
          final_revenue?: number | null
          homeowner_id?: string
          id?: string
          installed_at?: string | null
          is_self_generated?: boolean | null
          lead_id?: string
          proposal_id?: string | null
          self_gen_commission_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "closed_deals_contractor_id_fk"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closed_deals_homeowner_id_fkey"
            columns: ["homeowner_id"]
            isOneToOne: false
            referencedRelation: "homeowners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closed_deals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closed_deals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_records: {
        Row: {
          address: string
          channel: string
          consented: boolean
          created_at: string
          disclosure_text: string
          disclosure_version: string
          id: string
          ip_address: string | null
          method: string
          page_url: string | null
          quiz_session_id: string | null
          user_agent: string | null
        }
        Insert: {
          address: string
          channel: string
          consented: boolean
          created_at?: string
          disclosure_text: string
          disclosure_version: string
          id?: string
          ip_address?: string | null
          method?: string
          page_url?: string | null
          quiz_session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          address?: string
          channel?: string
          consented?: boolean
          created_at?: string
          disclosure_text?: string
          disclosure_version?: string
          id?: string
          ip_address?: string | null
          method?: string
          page_url?: string | null
          quiz_session_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consent_records_quiz_session_id_fkey"
            columns: ["quiz_session_id"]
            isOneToOne: false
            referencedRelation: "quiz_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      contractors: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      cora_reminders: {
        Row: {
          attempts: number
          created_at: string
          id: string
          last_error: string | null
          message: string
          milestone: string
          phone: string | null
          provider_sid: string | null
          quiz_session_id: string
          send_at: string
          sent_at: string | null
          status: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          message: string
          milestone: string
          phone?: string | null
          provider_sid?: string | null
          quiz_session_id: string
          send_at: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          message?: string
          milestone?: string
          phone?: string | null
          provider_sid?: string | null
          quiz_session_id?: string
          send_at?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "cora_reminders_quiz_session_id_fkey"
            columns: ["quiz_session_id"]
            isOneToOne: false
            referencedRelation: "quiz_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_options: {
        Row: {
          base_price: number
          created_at: string | null
          description: string | null
          id: string
          option_name: string
        }
        Insert: {
          base_price: number
          created_at?: string | null
          description?: string | null
          id?: string
          option_name: string
        }
        Update: {
          base_price?: number
          created_at?: string | null
          description?: string | null
          id?: string
          option_name?: string
        }
        Relationships: []
      }
      funnel_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json
          quiz_session_id: string | null
          step: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          quiz_session_id?: string | null
          step?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          quiz_session_id?: string | null
          step?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funnel_events_quiz_session_id_fkey"
            columns: ["quiz_session_id"]
            isOneToOne: false
            referencedRelation: "quiz_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      homeowners: {
        Row: {
          address: string | null
          city: string | null
          consent_given: boolean
          consent_text: string | null
          consented_at: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          hear_eligible: boolean | null
          household_income_range: string | null
          id: string
          last_name: string | null
          phone: string | null
          session_id: string
          state: string | null
          updated_at: string | null
          utility_provider: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          consent_given?: boolean
          consent_text?: string | null
          consented_at?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          hear_eligible?: boolean | null
          household_income_range?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          session_id: string
          state?: string | null
          updated_at?: string | null
          utility_provider?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          consent_given?: boolean
          consent_text?: string | null
          consented_at?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          hear_eligible?: boolean | null
          household_income_range?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          session_id?: string
          state?: string | null
          updated_at?: string | null
          utility_provider?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          assigned_rep: string | null
          contractor_id: string | null
          created_at: string | null
          followup_attempt_count: number | null
          homeowner_id: string
          id: string
          is_self_generated: boolean | null
          last_contacted_at: string | null
          lead_source: string | null
          lost_reason: string | null
          next_followup_at: string | null
          notes: string | null
          pipeline_stage: string
          quiz_result_id: string | null
          stage_updated_at: string | null
          system_id: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_rep?: string | null
          contractor_id?: string | null
          created_at?: string | null
          followup_attempt_count?: number | null
          homeowner_id: string
          id?: string
          is_self_generated?: boolean | null
          last_contacted_at?: string | null
          lead_source?: string | null
          lost_reason?: string | null
          next_followup_at?: string | null
          notes?: string | null
          pipeline_stage?: string
          quiz_result_id?: string | null
          stage_updated_at?: string | null
          system_id?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_rep?: string | null
          contractor_id?: string | null
          created_at?: string | null
          followup_attempt_count?: number | null
          homeowner_id?: string
          id?: string
          is_self_generated?: boolean | null
          last_contacted_at?: string | null
          lead_source?: string | null
          lost_reason?: string | null
          next_followup_at?: string | null
          notes?: string | null
          pipeline_stage?: string
          quiz_result_id?: string | null
          stage_updated_at?: string | null
          system_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_contractor_id_fk"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_homeowner_id_fkey"
            columns: ["homeowner_id"]
            isOneToOne: true
            referencedRelation: "homeowners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_quiz_result_id_fkey"
            columns: ["quiz_result_id"]
            isOneToOne: false
            referencedRelation: "quiz_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
        ]
      }
      market_data: {
        Row: {
          expires_at: string | null
          id: string
          is_fallback: boolean | null
          rate_kwh: number
          scraped_at: string | null
          source_url: string | null
          state: string | null
          utility_name: string | null
          zip_code: string
        }
        Insert: {
          expires_at?: string | null
          id?: string
          is_fallback?: boolean | null
          rate_kwh: number
          scraped_at?: string | null
          source_url?: string | null
          state?: string | null
          utility_name?: string | null
          zip_code: string
        }
        Update: {
          expires_at?: string | null
          id?: string
          is_fallback?: boolean | null
          rate_kwh?: number
          scraped_at?: string | null
          source_url?: string | null
          state?: string | null
          utility_name?: string | null
          zip_code?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: Json
          created_at: string | null
          id: string
          role: string
          session_id: string
          step: string | null
          tool_name: string | null
        }
        Insert: {
          content: Json
          created_at?: string | null
          id?: string
          role: string
          session_id: string
          step?: string | null
          tool_name?: string | null
        }
        Update: {
          content?: Json
          created_at?: string | null
          id?: string
          role?: string
          session_id?: string
          step?: string | null
          tool_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          created_at: string | null
          homeowner_id: string
          id: string
          image_type: string
          ocr_confidence: number | null
          ocr_error: string | null
          ocr_raw_output: Json | null
          ocr_status: string | null
          processed_at: string | null
          storage_path: string
          upload_attempt: number | null
        }
        Insert: {
          created_at?: string | null
          homeowner_id: string
          id?: string
          image_type: string
          ocr_confidence?: number | null
          ocr_error?: string | null
          ocr_raw_output?: Json | null
          ocr_status?: string | null
          processed_at?: string | null
          storage_path: string
          upload_attempt?: number | null
        }
        Update: {
          created_at?: string | null
          homeowner_id?: string
          id?: string
          image_type?: string
          ocr_confidence?: number | null
          ocr_error?: string | null
          ocr_raw_output?: Json | null
          ocr_status?: string | null
          processed_at?: string | null
          storage_path?: string
          upload_attempt?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "photos_homeowner_id_fkey"
            columns: ["homeowner_id"]
            isOneToOne: false
            referencedRelation: "homeowners"
            referencedColumns: ["id"]
          },
        ]
      }
      prolinkhub: {
        Row: {
          id: number
          message: Json | null
          session_id: string | null
        }
        Insert: {
          id?: number
          message?: Json | null
          session_id?: string | null
        }
        Update: {
          id?: number
          message?: Json | null
          session_id?: string | null
        }
        Relationships: []
      }
      property_intelligence: {
        Row: {
          city: string | null
          confidence_tier: string | null
          county_verified_sqft: number | null
          county_year_built: number | null
          created_at: string
          enrichment_confidence: number | null
          homeowner_reported_sqft: string | null
          homeowner_reported_system_age: number | null
          id: string
          permit_last_hvac_date: string | null
          permit_silence_years: number | null
          primary_source:
          | Database["public"]["Enums"]["intelligence_source"]
          | null
          quiz_session_id: string | null
          raw_payload: Json | null
          source_permit:
          | Database["public"]["Enums"]["intelligence_source"]
          | null
          source_sqft: Database["public"]["Enums"]["intelligence_source"] | null
          source_year_built:
          | Database["public"]["Enums"]["intelligence_source"]
          | null
          sqft_locked: boolean
          state: string | null
          street_address: string | null
          updated_at: string
          year_built_locked: boolean
          zip_code: string | null
        }
        Insert: {
          city?: string | null
          confidence_tier?: string | null
          county_verified_sqft?: number | null
          county_year_built?: number | null
          created_at?: string
          enrichment_confidence?: number | null
          homeowner_reported_sqft?: string | null
          homeowner_reported_system_age?: number | null
          id?: string
          permit_last_hvac_date?: string | null
          permit_silence_years?: number | null
          primary_source?:
          | Database["public"]["Enums"]["intelligence_source"]
          | null
          quiz_session_id?: string | null
          raw_payload?: Json | null
          source_permit?:
          | Database["public"]["Enums"]["intelligence_source"]
          | null
          source_sqft?:
          | Database["public"]["Enums"]["intelligence_source"]
          | null
          source_year_built?:
          | Database["public"]["Enums"]["intelligence_source"]
          | null
          sqft_locked?: boolean
          state?: string | null
          street_address?: string | null
          updated_at?: string
          year_built_locked?: boolean
          zip_code?: string | null
        }
        Update: {
          city?: string | null
          confidence_tier?: string | null
          county_verified_sqft?: number | null
          county_year_built?: number | null
          created_at?: string
          enrichment_confidence?: number | null
          homeowner_reported_sqft?: string | null
          homeowner_reported_system_age?: number | null
          id?: string
          permit_last_hvac_date?: string | null
          permit_silence_years?: number | null
          primary_source?:
          | Database["public"]["Enums"]["intelligence_source"]
          | null
          quiz_session_id?: string | null
          raw_payload?: Json | null
          source_permit?:
          | Database["public"]["Enums"]["intelligence_source"]
          | null
          source_sqft?:
          | Database["public"]["Enums"]["intelligence_source"]
          | null
          source_year_built?:
          | Database["public"]["Enums"]["intelligence_source"]
          | null
          sqft_locked?: boolean
          state?: string | null
          street_address?: string | null
          updated_at?: string
          year_built_locked?: boolean
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_intelligence_quiz_session_id_fkey"
            columns: ["quiz_session_id"]
            isOneToOne: false
            referencedRelation: "quiz_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          base_price: number | null
          created_at: string | null
          discount_amount: number | null
          equipment_option: string | null
          federal_credit_applied: boolean | null
          final_price: number | null
          follow_up_count: number | null
          hear_rebate_applied: boolean | null
          homeowner_id: string
          id: string
          lead_id: string
          notes: string | null
          signature_status: string | null
          updated_at: string | null
        }
        Insert: {
          base_price?: number | null
          created_at?: string | null
          discount_amount?: number | null
          equipment_option?: string | null
          federal_credit_applied?: boolean | null
          final_price?: number | null
          follow_up_count?: number | null
          hear_rebate_applied?: boolean | null
          homeowner_id: string
          id?: string
          lead_id: string
          notes?: string | null
          signature_status?: string | null
          updated_at?: string | null
        }
        Update: {
          base_price?: number | null
          created_at?: string | null
          discount_amount?: number | null
          equipment_option?: string | null
          federal_credit_applied?: boolean | null
          final_price?: number | null
          follow_up_count?: number | null
          hear_rebate_applied?: boolean | null
          homeowner_id?: string
          id?: string
          lead_id?: string
          notes?: string | null
          signature_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_homeowner_id_fkey"
            columns: ["homeowner_id"]
            isOneToOne: false
            referencedRelation: "homeowners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_answers: {
        Row: {
          answer_value: string
          created_at: string | null
          homeowner_id: string
          id: string
          question_id: string
        }
        Insert: {
          answer_value: string
          created_at?: string | null
          homeowner_id: string
          id?: string
          question_id: string
        }
        Update: {
          answer_value?: string
          created_at?: string | null
          homeowner_id?: string
          id?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_answers_homeowner_id_fkey"
            columns: ["homeowner_id"]
            isOneToOne: false
            referencedRelation: "homeowners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          answer_options: Json
          created_at: string | null
          id: string
          question_key: string
          question_order: number
          question_text: string
        }
        Insert: {
          answer_options: Json
          created_at?: string | null
          id?: string
          question_key: string
          question_order: number
          question_text: string
        }
        Update: {
          answer_options?: Json
          created_at?: string | null
          id?: string
          question_key?: string
          question_order?: number
          question_text?: string
        }
        Relationships: []
      }
      quiz_results: {
        Row: {
          annual_recovery: number | null
          bill_points: number | null
          calculation_status: string | null
          comfort_points: number | null
          created_at: string | null
          decade_recovery: number | null
          discount_amount: number | null
          discount_unlocked: boolean | null
          eds_points: number | null
          guzzler_score: number | null
          homeowner_id: string
          hot_lead_flag: boolean | null
          id: string
          monthly_leak: number | null
          photos_uploaded: boolean | null
          score_category: string | null
          sizing_mismatch_bonus: number | null
          system_age_points: number | null
          updated_at: string | null
        }
        Insert: {
          annual_recovery?: number | null
          bill_points?: number | null
          calculation_status?: string | null
          comfort_points?: number | null
          created_at?: string | null
          decade_recovery?: number | null
          discount_amount?: number | null
          discount_unlocked?: boolean | null
          eds_points?: number | null
          guzzler_score?: number | null
          homeowner_id: string
          hot_lead_flag?: boolean | null
          id?: string
          monthly_leak?: number | null
          photos_uploaded?: boolean | null
          score_category?: string | null
          sizing_mismatch_bonus?: number | null
          system_age_points?: number | null
          updated_at?: string | null
        }
        Update: {
          annual_recovery?: number | null
          bill_points?: number | null
          calculation_status?: string | null
          comfort_points?: number | null
          created_at?: string | null
          decade_recovery?: number | null
          discount_amount?: number | null
          discount_unlocked?: boolean | null
          eds_points?: number | null
          guzzler_score?: number | null
          homeowner_id?: string
          hot_lead_flag?: boolean | null
          id?: string
          monthly_leak?: number | null
          photos_uploaded?: boolean | null
          score_category?: string | null
          sizing_mismatch_bonus?: number | null
          system_age_points?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_results_homeowner_id_fkey"
            columns: ["homeowner_id"]
            isOneToOne: true
            referencedRelation: "homeowners"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_sessions: {
        Row: {
          age: number | null
          challenges: string[] | null
          city: string | null
          created_at: string
          email: string | null
          entry_intent: string | null
          first_name: string | null
          funnel_status: string | null
          guzzler_report: Json | null
          guzzler_score: number | null
          health_conditions: boolean | null
          id: string
          last_name: string | null
          lead_source: string | null
          num_systems: string | null
          pain_bills: number | null
          pain_confidence: number | null
          pain_confusion: number | null
          pain_emergencies: number | null
          pain_financial: number | null
          pain_health: number | null
          pain_moisture: number | null
          pain_system_age: number | null
          pain_temperature: number | null
          pain_trust: number | null
          phone: string | null
          project_tier: string | null
          quiz_completed_at: string | null
          referrer: string | null
          residents: number | null
          roi_report: Json | null
          sms_consent: boolean
          sms_consent_at: string | null
          solar_interest: boolean | null
          square_footage: string | null
          state: string | null
          street_address: string | null
          system_age: number | null
          total_discount_earned: number | null
          updated_at: string
          upload_air_handler: string | null
          upload_bill: string | null
          upload_breaker: string | null
          upload_outdoor: string | null
          upload_thermostat: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          zip_code: string | null
        }
        Insert: {
          age?: number | null
          challenges?: string[] | null
          city?: string | null
          created_at?: string
          email?: string | null
          entry_intent?: string | null
          first_name?: string | null
          funnel_status?: string | null
          guzzler_report?: Json | null
          guzzler_score?: number | null
          health_conditions?: boolean | null
          id?: string
          last_name?: string | null
          lead_source?: string | null
          num_systems?: string | null
          pain_bills?: number | null
          pain_confidence?: number | null
          pain_confusion?: number | null
          pain_emergencies?: number | null
          pain_financial?: number | null
          pain_health?: number | null
          pain_moisture?: number | null
          pain_system_age?: number | null
          pain_temperature?: number | null
          pain_trust?: number | null
          phone?: string | null
          project_tier?: string | null
          quiz_completed_at?: string | null
          referrer?: string | null
          residents?: number | null
          roi_report?: Json | null
          sms_consent?: boolean
          sms_consent_at?: string | null
          solar_interest?: boolean | null
          square_footage?: string | null
          state?: string | null
          street_address?: string | null
          system_age?: number | null
          total_discount_earned?: number | null
          updated_at?: string
          upload_air_handler?: string | null
          upload_bill?: string | null
          upload_breaker?: string | null
          upload_outdoor?: string | null
          upload_thermostat?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          zip_code?: string | null
        }
        Update: {
          age?: number | null
          challenges?: string[] | null
          city?: string | null
          created_at?: string
          email?: string | null
          entry_intent?: string | null
          first_name?: string | null
          funnel_status?: string | null
          guzzler_report?: Json | null
          guzzler_score?: number | null
          health_conditions?: boolean | null
          id?: string
          last_name?: string | null
          lead_source?: string | null
          num_systems?: string | null
          pain_bills?: number | null
          pain_confidence?: number | null
          pain_confusion?: number | null
          pain_emergencies?: number | null
          pain_financial?: number | null
          pain_health?: number | null
          pain_moisture?: number | null
          pain_system_age?: number | null
          pain_temperature?: number | null
          pain_trust?: number | null
          phone?: string | null
          project_tier?: string | null
          quiz_completed_at?: string | null
          referrer?: string | null
          residents?: number | null
          roi_report?: Json | null
          sms_consent?: boolean
          sms_consent_at?: string | null
          solar_interest?: boolean | null
          square_footage?: string | null
          state?: string | null
          street_address?: string | null
          system_age?: number | null
          total_discount_earned?: number | null
          updated_at?: string
          upload_air_handler?: string | null
          upload_bill?: string | null
          upload_breaker?: string | null
          upload_outdoor?: string | null
          upload_thermostat?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      rebate_programs: {
        Row: {
          admin_agency: string | null
          deadline_notes: string | null
          display_mode: string | null
          eligible_measures: string[] | null
          friction_level: string | null
          fuel_switching_allowed: boolean | null
          fuel_switching_ends_on: string | null
          id: string
          income_qualified: boolean
          income_tier: string | null
          last_verified: string
          max_amount_usd: number | null
          point_of_sale: boolean | null
          program_name: string
          scope_requirements: Json | null
          source_url: string | null
          state: string
          status: string
          utility_or_emc: string | null
        }
        Insert: {
          admin_agency?: string | null
          deadline_notes?: string | null
          display_mode?: string | null
          eligible_measures?: string[] | null
          friction_level?: string | null
          fuel_switching_allowed?: boolean | null
          fuel_switching_ends_on?: string | null
          id?: string
          income_qualified?: boolean
          income_tier?: string | null
          last_verified: string
          max_amount_usd?: number | null
          point_of_sale?: boolean | null
          program_name: string
          scope_requirements?: Json | null
          source_url?: string | null
          state: string
          status?: string
          utility_or_emc?: string | null
        }
        Update: {
          admin_agency?: string | null
          deadline_notes?: string | null
          display_mode?: string | null
          eligible_measures?: string[] | null
          friction_level?: string | null
          fuel_switching_allowed?: boolean | null
          fuel_switching_ends_on?: string | null
          id?: string
          income_qualified?: boolean
          income_tier?: string | null
          last_verified?: string
          max_amount_usd?: number | null
          point_of_sale?: boolean | null
          program_name?: string
          scope_requirements?: Json | null
          source_url?: string | null
          state?: string
          status?: string
          utility_or_emc?: string | null
        }
        Relationships: []
      }
      repair_calc_config: {
        Row: {
          key: string
          notes: string | null
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          notes?: string | null
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          notes?: string | null
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      repair_history: {
        Row: {
          contractor_name: string | null
          homeowner_id: string | null
          id: string
          monthly_payment_usd: number | null
          quiz_session_id: string
          raw_conversation_extract: Json | null
          regret_formula_version: string | null
          repair_component: string | null
          repair_cost_usd: number | null
          repair_count_24mo: number | null
          repair_date_approx: string | null
          repair_regret_score: number | null
          repair_within_24mo: boolean
          reported_at: string
          still_having_issues: boolean | null
          was_financed: boolean | null
        }
        Insert: {
          contractor_name?: string | null
          homeowner_id?: string | null
          id?: string
          monthly_payment_usd?: number | null
          quiz_session_id: string
          raw_conversation_extract?: Json | null
          regret_formula_version?: string | null
          repair_component?: string | null
          repair_cost_usd?: number | null
          repair_count_24mo?: number | null
          repair_date_approx?: string | null
          repair_regret_score?: number | null
          repair_within_24mo: boolean
          reported_at?: string
          still_having_issues?: boolean | null
          was_financed?: boolean | null
        }
        Update: {
          contractor_name?: string | null
          homeowner_id?: string | null
          id?: string
          monthly_payment_usd?: number | null
          quiz_session_id?: string
          raw_conversation_extract?: Json | null
          regret_formula_version?: string | null
          repair_component?: string | null
          repair_cost_usd?: number | null
          repair_count_24mo?: number | null
          repair_date_approx?: string | null
          repair_regret_score?: number | null
          repair_within_24mo?: boolean
          reported_at?: string
          still_having_issues?: boolean | null
          was_financed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "repair_history_homeowner_id_fkey"
            columns: ["homeowner_id"]
            isOneToOne: false
            referencedRelation: "homeowners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_history_quiz_session_id_fkey"
            columns: ["quiz_session_id"]
            isOneToOne: false
            referencedRelation: "quiz_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_replace_analysis: {
        Row: {
          active_repair_payment_usd: number | null
          applicable_rebates: Json | null
          created_at: string
          cumulative_repair_cost_24mo: number | null
          est_monthly_energy_waste_usd: number | null
          est_replacement_cost_usd: number | null
          est_replacement_monthly_usd: number | null
          five_year_keep_cost_usd: number | null
          five_year_replace_cost_usd: number | null
          guzzler_band: string | null
          id: string
          quiz_session_id: string
          reasoning_summary: string | null
          recommendation: string
          recommendation_confidence: string | null
          repair_cost_pct_of_replacement: number | null
          system_age_years: number | null
          system_type: string | null
        }
        Insert: {
          active_repair_payment_usd?: number | null
          applicable_rebates?: Json | null
          created_at?: string
          cumulative_repair_cost_24mo?: number | null
          est_monthly_energy_waste_usd?: number | null
          est_replacement_cost_usd?: number | null
          est_replacement_monthly_usd?: number | null
          five_year_keep_cost_usd?: number | null
          five_year_replace_cost_usd?: number | null
          guzzler_band?: string | null
          id?: string
          quiz_session_id: string
          reasoning_summary?: string | null
          recommendation: string
          recommendation_confidence?: string | null
          repair_cost_pct_of_replacement?: number | null
          system_age_years?: number | null
          system_type?: string | null
        }
        Update: {
          active_repair_payment_usd?: number | null
          applicable_rebates?: Json | null
          created_at?: string
          cumulative_repair_cost_24mo?: number | null
          est_monthly_energy_waste_usd?: number | null
          est_replacement_cost_usd?: number | null
          est_replacement_monthly_usd?: number | null
          five_year_keep_cost_usd?: number | null
          five_year_replace_cost_usd?: number | null
          guzzler_band?: string | null
          id?: string
          quiz_session_id?: string
          reasoning_summary?: string | null
          recommendation?: string
          recommendation_confidence?: string | null
          repair_cost_pct_of_replacement?: number | null
          system_age_years?: number | null
          system_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repair_replace_analysis_quiz_session_id_fkey"
            columns: ["quiz_session_id"]
            isOneToOne: false
            referencedRelation: "quiz_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      report_requests: {
        Row: {
          attempts: number
          created_at: string
          email: string
          id: string
          last_error: string | null
          pdf_url: string | null
          provider_id: string | null
          quiz_session_id: string
          sent_at: string | null
          status: string
          suppression_override: boolean
          suppression_override_at: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          email: string
          id?: string
          last_error?: string | null
          pdf_url?: string | null
          provider_id?: string | null
          quiz_session_id: string
          sent_at?: string | null
          status?: string
          suppression_override?: boolean
          suppression_override_at?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          email?: string
          id?: string
          last_error?: string | null
          pdf_url?: string | null
          provider_id?: string | null
          quiz_session_id?: string
          sent_at?: string | null
          status?: string
          suppression_override?: boolean
          suppression_override_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_requests_quiz_session_id_fkey"
            columns: ["quiz_session_id"]
            isOneToOne: true
            referencedRelation: "quiz_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string | null
          current_step: string | null
          guzzler_score: number | null
          homeowner_id: string
          id: string
          last_active_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_step?: string | null
          guzzler_score?: number | null
          homeowner_id: string
          id?: string
          last_active_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_step?: string | null
          guzzler_score?: number | null
          homeowner_id?: string
          id?: string
          last_active_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_homeowner_id_fkey"
            columns: ["homeowner_id"]
            isOneToOne: false
            referencedRelation: "homeowners"
            referencedColumns: ["id"]
          },
        ]
      }
      suppression_list: {
        Row: {
          address: string
          channel: string
          created_at: string
          id: string
          last_inbound: string | null
          reason: string
          source: string | null
          updated_at: string
        }
        Insert: {
          address: string
          channel: string
          created_at?: string
          id?: string
          last_inbound?: string | null
          reason?: string
          source?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          channel?: string
          created_at?: string
          id?: string
          last_inbound?: string | null
          reason?: string
          source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      systems: {
        Row: {
          annual_utility_spend: number | null
          brand: string | null
          breaker_amps: number | null
          created_at: string | null
          estimated_efficiency: string | null
          hazardous_panel_detail: string | null
          hazardous_panel_flag: boolean | null
          homeowner_id: string
          hvac_model: string | null
          hvac_serial: string | null
          id: string
          kwh_trend_12mo: Json | null
          kwh_usage: number | null
          local_rate_kwh: number | null
          monthly_utility_spend: number | null
          photo_analysis_notes: string | null
          rate_source: string | null
          refrigerant_type: string | null
          system_age_years: number | null
          system_size_tons: number | null
          system_type: string | null
          thermostat_type: string | null
          updated_at: string | null
        }
        Insert: {
          annual_utility_spend?: number | null
          brand?: string | null
          breaker_amps?: number | null
          created_at?: string | null
          estimated_efficiency?: string | null
          hazardous_panel_detail?: string | null
          hazardous_panel_flag?: boolean | null
          homeowner_id: string
          hvac_model?: string | null
          hvac_serial?: string | null
          id?: string
          kwh_trend_12mo?: Json | null
          kwh_usage?: number | null
          local_rate_kwh?: number | null
          monthly_utility_spend?: number | null
          photo_analysis_notes?: string | null
          rate_source?: string | null
          refrigerant_type?: string | null
          system_age_years?: number | null
          system_size_tons?: number | null
          system_type?: string | null
          thermostat_type?: string | null
          updated_at?: string | null
        }
        Update: {
          annual_utility_spend?: number | null
          brand?: string | null
          breaker_amps?: number | null
          created_at?: string | null
          estimated_efficiency?: string | null
          hazardous_panel_detail?: string | null
          hazardous_panel_flag?: boolean | null
          homeowner_id?: string
          hvac_model?: string | null
          hvac_serial?: string | null
          id?: string
          kwh_trend_12mo?: Json | null
          kwh_usage?: number | null
          local_rate_kwh?: number | null
          monthly_utility_spend?: number | null
          photo_analysis_notes?: string | null
          rate_source?: string | null
          refrigerant_type?: string | null
          system_age_years?: number | null
          system_size_tons?: number | null
          system_type?: string | null
          thermostat_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "systems_homeowner_id_fkey"
            columns: ["homeowner_id"]
            isOneToOne: true
            referencedRelation: "homeowners"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consent_record_create: {
        Args: {
          p_address: string
          p_channel: string
          p_consented: boolean
          p_page_url?: string
          p_quiz_session_id: string
          p_user_agent?: string
          p_version: string
        }
        Returns: string
      }
      is_contractor: { Args: never; Returns: boolean }
      quiz_session_create: { Args: { p_patch: Json }; Returns: string }
      quiz_session_get: { Args: { p_id: string }; Returns: Json }
      quiz_session_stamp_completed: {
        Args: { p_completed_at: string; p_id: string }
        Returns: undefined
      }
      quiz_session_update: {
        Args: { p_id: string; p_patch: Json }
        Returns: undefined
      }
      sms_consent_disclosure: { Args: { p_version: string }; Returns: string }
    }
    Enums: {
      intelligence_source: "County" | "Shovels" | "Zillow" | "EDS"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
  | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
    DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
    DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
  | keyof DefaultSchema["Enums"]
  | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof DefaultSchema["CompositeTypes"]
  | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      intelligence_source: ["County", "Shovels", "Zillow", "EDS"],
    },
  },
} as const
