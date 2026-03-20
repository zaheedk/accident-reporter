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
      claim_photos: {
        Row: {
          claim_id: string
          created_at: string
          file_name: string
          file_path: string
          id: string
          user_id: string
        }
        Insert: {
          claim_id: string
          created_at?: string
          file_name?: string
          file_path: string
          id?: string
          user_id: string
        }
        Update: {
          claim_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "claim_photos_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
        ]
      }
      claims: {
        Row: {
          anyone_hurt: boolean
          blame_description: string
          created_at: string
          damage_description: string
          description: string
          driver_consumed_substance: boolean
          id: string
          incident_date: string
          incident_location: string
          incident_time: string
          injury_details: string
          insurance_company: string
          journey_details: string
          liability_admitted: boolean
          liability_details: string
          other_property_damage: string
          other_property_owner: string
          police_attended: boolean
          police_officer_details: string
          repairer_address: string
          repairer_name: string
          repairer_phone: string
          road_condition: string
          selected_panel_shop_id: string | null
          speed_before_braking: string
          status: string
          substance_details: string
          third_parties: Json
          towing_company: string
          updated_at: string
          user_id: string
          vehicle_id: string
          vehicle_towed: boolean
          vehicle_usage: string
          weather_condition: string
          witnesses: Json
        }
        Insert: {
          anyone_hurt?: boolean
          blame_description?: string
          created_at?: string
          damage_description?: string
          description?: string
          driver_consumed_substance?: boolean
          id?: string
          incident_date?: string
          incident_location?: string
          incident_time?: string
          injury_details?: string
          insurance_company?: string
          journey_details?: string
          liability_admitted?: boolean
          liability_details?: string
          other_property_damage?: string
          other_property_owner?: string
          police_attended?: boolean
          police_officer_details?: string
          repairer_address?: string
          repairer_name?: string
          repairer_phone?: string
          road_condition?: string
          selected_panel_shop_id?: string | null
          speed_before_braking?: string
          status?: string
          substance_details?: string
          third_parties?: Json
          towing_company?: string
          updated_at?: string
          user_id: string
          vehicle_id?: string
          vehicle_towed?: boolean
          vehicle_usage?: string
          weather_condition?: string
          witnesses?: Json
        }
        Update: {
          anyone_hurt?: boolean
          blame_description?: string
          created_at?: string
          damage_description?: string
          description?: string
          driver_consumed_substance?: boolean
          id?: string
          incident_date?: string
          incident_location?: string
          incident_time?: string
          injury_details?: string
          insurance_company?: string
          journey_details?: string
          liability_admitted?: boolean
          liability_details?: string
          other_property_damage?: string
          other_property_owner?: string
          police_attended?: boolean
          police_officer_details?: string
          repairer_address?: string
          repairer_name?: string
          repairer_phone?: string
          road_condition?: string
          selected_panel_shop_id?: string | null
          speed_before_braking?: string
          status?: string
          substance_details?: string
          third_parties?: Json
          towing_company?: string
          updated_at?: string
          user_id?: string
          vehicle_id?: string
          vehicle_towed?: boolean
          vehicle_usage?: string
          weather_condition?: string
          witnesses?: Json
        }
        Relationships: [
          {
            foreignKeyName: "claims_selected_panel_shop_id_fkey"
            columns: ["selected_panel_shop_id"]
            isOneToOne: false
            referencedRelation: "panel_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_companies: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          phone: string
        }
        Insert: {
          created_at?: string
          email?: string
          id?: string
          name: string
          phone?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string
        }
        Relationships: []
      }
      panel_shops: {
        Row: {
          address: string
          city: string
          created_at: string
          email: string
          google_rating: number
          id: string
          name: string
          phone: string
          region: string
          updated_at: string
          website: string
        }
        Insert: {
          address: string
          city?: string
          created_at?: string
          email?: string
          google_rating?: number
          id?: string
          name: string
          phone?: string
          region?: string
          updated_at?: string
          website?: string
        }
        Update: {
          address?: string
          city?: string
          created_at?: string
          email?: string
          google_rating?: number
          id?: string
          name?: string
          phone?: string
          region?: string
          updated_at?: string
          website?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          is_active: boolean
          phone_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          phone_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          phone_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      repair_requests: {
        Row: {
          claim_id: string
          created_at: string
          id: string
          insurance_company: string
          panel_shop_id: string
          status: string
          user_id: string
        }
        Insert: {
          claim_id: string
          created_at?: string
          id?: string
          insurance_company?: string
          panel_shop_id: string
          status?: string
          user_id: string
        }
        Update: {
          claim_id?: string
          created_at?: string
          id?: string
          insurance_company?: string
          panel_shop_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_requests_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_requests_panel_shop_id_fkey"
            columns: ["panel_shop_id"]
            isOneToOne: false
            referencedRelation: "panel_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      tow_companies: {
        Row: {
          address: string
          created_at: string
          id: string
          name: string
          phone: string
        }
        Insert: {
          address?: string
          created_at?: string
          id?: string
          name: string
          phone?: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          name?: string
          phone?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          color: string
          created_at: string
          finance_arrangement: boolean
          finance_details: string | null
          id: string
          insurance_company: string
          insurance_expiry: string
          insurance_policy_number: string
          make: string
          model: string
          modification_details: string | null
          modified: boolean
          rego_expiry: string
          rego_number: string
          updated_at: string
          user_id: string
          wof_expiry: string
          year: string
        }
        Insert: {
          color?: string
          created_at?: string
          finance_arrangement?: boolean
          finance_details?: string | null
          id?: string
          insurance_company?: string
          insurance_expiry?: string
          insurance_policy_number?: string
          make?: string
          model?: string
          modification_details?: string | null
          modified?: boolean
          rego_expiry?: string
          rego_number?: string
          updated_at?: string
          user_id: string
          wof_expiry?: string
          year?: string
        }
        Update: {
          color?: string
          created_at?: string
          finance_arrangement?: boolean
          finance_details?: string | null
          id?: string
          insurance_company?: string
          insurance_expiry?: string
          insurance_policy_number?: string
          make?: string
          model?: string
          modification_details?: string | null
          modified?: boolean
          rego_expiry?: string
          rego_number?: string
          updated_at?: string
          user_id?: string
          wof_expiry?: string
          year?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
