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
      quiz_sessions: {
        Row: {
          age: number | null
          challenges: string[] | null
          city: string | null
          created_at: string
          email: string | null
          first_name: string | null
          funnel_status: string | null
          health_conditions: boolean | null
          id: string
          last_name: string | null
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
          residents: number | null
          roi_report: Json | null
          solar_interest: boolean | null
          square_footage: string | null
          state: string | null
          street_address: string | null
          system_age: number | null
          total_discount_earned: number | null
          updated_at: string
          upload_bill: string | null
          upload_breaker: string | null
          upload_outdoor: string | null
          upload_thermostat: string | null
          zip_code: string | null
        }
        Insert: {
          age?: number | null
          challenges?: string[] | null
          city?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          funnel_status?: string | null
          health_conditions?: boolean | null
          id?: string
          last_name?: string | null
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
          residents?: number | null
          roi_report?: Json | null
          solar_interest?: boolean | null
          square_footage?: string | null
          state?: string | null
          street_address?: string | null
          system_age?: number | null
          total_discount_earned?: number | null
          updated_at?: string
          upload_bill?: string | null
          upload_breaker?: string | null
          upload_outdoor?: string | null
          upload_thermostat?: string | null
          zip_code?: string | null
        }
        Update: {
          age?: number | null
          challenges?: string[] | null
          city?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          funnel_status?: string | null
          health_conditions?: boolean | null
          id?: string
          last_name?: string | null
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
          residents?: number | null
          roi_report?: Json | null
          solar_interest?: boolean | null
          square_footage?: string | null
          state?: string | null
          street_address?: string | null
          system_age?: number | null
          total_discount_earned?: number | null
          updated_at?: string
          upload_bill?: string | null
          upload_breaker?: string | null
          upload_outdoor?: string | null
          upload_thermostat?: string | null
          zip_code?: string | null
        }
        Relationships: []
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
