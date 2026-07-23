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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
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
      quiz_answers: {
        Row: {
          answer_text: string | null
          answer_value: number | null
          created_at: string
          id: string
          question_id: string | null
          question_number: number
          quiz_id: string
        }
        Insert: {
          answer_text?: string | null
          answer_value?: number | null
          created_at?: string
          id?: string
          question_id?: string | null
          question_number: number
          quiz_id: string
        }
        Update: {
          answer_text?: string | null
          answer_value?: number | null
          created_at?: string
          id?: string
          question_id?: string | null
          question_number?: number
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_answers_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quiz_sessions"
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
          eligible_measures: string[] | null
          fuel_switching_allowed: boolean | null
          fuel_switching_ends_on: string | null
          id: string
          income_qualified: boolean
          income_tier: string | null
          last_verified: string
          max_amount_usd: number | null
          point_of_sale: boolean | null
          program_name: string
          source_url: string | null
          state: string
          status: string
          utility_or_emc: string | null
        }
        Insert: {
          admin_agency?: string | null
          deadline_notes?: string | null
          eligible_measures?: string[] | null
          fuel_switching_allowed?: boolean | null
          fuel_switching_ends_on?: string | null
          id?: string
          income_qualified?: boolean
          income_tier?: string | null
          last_verified: string
          max_amount_usd?: number | null
          point_of_sale?: boolean | null
          program_name: string
          source_url?: string | null
          state: string
          status?: string
          utility_or_emc?: string | null
        }
        Update: {
          admin_agency?: string | null
          deadline_notes?: string | null
          eligible_measures?: string[] | null
          fuel_switching_allowed?: boolean | null
          fuel_switching_ends_on?: string | null
          id?: string
          income_qualified?: boolean
          income_tier?: string | null
          last_verified?: string
          max_amount_usd?: number | null
          point_of_sale?: boolean | null
          program_name?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  public: {
    Enums: {
      intelligence_source: ["County", "Shovels", "Zillow", "EDS"],
    },
  },
} as const
