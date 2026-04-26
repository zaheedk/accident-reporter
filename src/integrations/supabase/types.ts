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
      call_recordings: {
        Row: {
          claim_id: string
          created_at: string
          duration_seconds: number | null
          file_name: string
          file_path: string
          file_size: number
          id: string
          notes: string | null
          recording_url: string | null
          status: string
          summary: string | null
          transcript: string | null
          twilio_call_sid: string | null
          user_id: string
        }
        Insert: {
          claim_id: string
          created_at?: string
          duration_seconds?: number | null
          file_name?: string
          file_path: string
          file_size?: number
          id?: string
          notes?: string | null
          recording_url?: string | null
          status?: string
          summary?: string | null
          transcript?: string | null
          twilio_call_sid?: string | null
          user_id: string
        }
        Update: {
          claim_id?: string
          created_at?: string
          duration_seconds?: number | null
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          notes?: string | null
          recording_url?: string | null
          status?: string
          summary?: string | null
          transcript?: string | null
          twilio_call_sid?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_recordings_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_messages: {
        Row: {
          body: string
          claim_id: string
          created_at: string
          direction: string
          from_email: string
          id: string
          resend_message_id: string | null
          subject: string
          to_email: string
          user_id: string
        }
        Insert: {
          body?: string
          claim_id: string
          created_at?: string
          direction?: string
          from_email?: string
          id?: string
          resend_message_id?: string | null
          subject?: string
          to_email?: string
          user_id: string
        }
        Update: {
          body?: string
          claim_id?: string
          created_at?: string
          direction?: string
          from_email?: string
          id?: string
          resend_message_id?: string | null
          subject?: string
          to_email?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "claim_messages_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
        ]
      }
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
          at_fault: string
          blame_description: string
          claim_number: number | null
          courtesy_car_email_sent_at: string | null
          courtesy_car_requested: boolean
          created_at: string
          damage_description: string
          description: string
          driver_consumed_substance: boolean
          id: string
          incident_date: string
          incident_location: string
          incident_time: string
          incident_type: string
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
          report_number: string | null
          road_condition: string
          selected_panel_shop_id: string | null
          speed_before_braking: string
          status: string
          substance_details: string
          third_parties: Json
          towing_company: string
          updated_at: string
          user_claim_number: string
          user_id: string
          vehicle_id: string
          vehicle_towed: boolean
          vehicle_usage: string
          weather_condition: string
          witnesses: Json
        }
        Insert: {
          anyone_hurt?: boolean
          at_fault?: string
          blame_description?: string
          claim_number?: number | null
          courtesy_car_email_sent_at?: string | null
          courtesy_car_requested?: boolean
          created_at?: string
          damage_description?: string
          description?: string
          driver_consumed_substance?: boolean
          id?: string
          incident_date?: string
          incident_location?: string
          incident_time?: string
          incident_type?: string
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
          report_number?: string | null
          road_condition?: string
          selected_panel_shop_id?: string | null
          speed_before_braking?: string
          status?: string
          substance_details?: string
          third_parties?: Json
          towing_company?: string
          updated_at?: string
          user_claim_number?: string
          user_id: string
          vehicle_id?: string
          vehicle_towed?: boolean
          vehicle_usage?: string
          weather_condition?: string
          witnesses?: Json
        }
        Update: {
          anyone_hurt?: boolean
          at_fault?: string
          blame_description?: string
          claim_number?: number | null
          courtesy_car_email_sent_at?: string | null
          courtesy_car_requested?: boolean
          created_at?: string
          damage_description?: string
          description?: string
          driver_consumed_substance?: boolean
          id?: string
          incident_date?: string
          incident_location?: string
          incident_time?: string
          incident_type?: string
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
          report_number?: string | null
          road_condition?: string
          selected_panel_shop_id?: string | null
          speed_before_braking?: string
          status?: string
          substance_details?: string
          third_parties?: Json
          towing_company?: string
          updated_at?: string
          user_claim_number?: string
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
      dashcam_videos: {
        Row: {
          claim_id: string
          created_at: string
          duration_seconds: number | null
          file_name: string
          file_path: string
          file_size: number
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          claim_id: string
          created_at?: string
          duration_seconds?: number | null
          file_name?: string
          file_path: string
          file_size?: number
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          claim_id?: string
          created_at?: string
          duration_seconds?: number | null
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashcam_videos_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      email_verification_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      families: {
        Row: {
          created_at: string
          head_user_id: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          head_user_id: string
          id?: string
          name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          head_user_id?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      family_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          code: string
          created_at: string
          email: string | null
          expires_at: string
          family_id: string
          id: string
          invited_by: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          code: string
          created_at?: string
          email?: string | null
          expires_at?: string
          family_id: string
          id?: string
          invited_by: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          code?: string
          created_at?: string
          email?: string | null
          expires_at?: string
          family_id?: string
          id?: string
          invited_by?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_invites_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          family_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          family_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          family_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_companies: {
        Row: {
          claims_method: string
          claims_portal_url: string
          created_at: string
          email: string
          id: string
          name: string
          phone: string
        }
        Insert: {
          claims_method?: string
          claims_portal_url?: string
          created_at?: string
          email?: string
          id?: string
          name: string
          phone?: string
        }
        Update: {
          claims_method?: string
          claims_portal_url?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string
        }
        Relationships: []
      }
      login_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          rego_number: string
          token: string
          used: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          rego_number?: string
          token: string
          used?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          rego_number?: string
          token?: string
          used?: boolean
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
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
      phone_otps: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          otp_code: string
          phone_number: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          otp_code: string
          phone_number: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          otp_code?: string
          phone_number?: string
          verified?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          email_verified: boolean
          id: string
          is_active: boolean
          license_expiry: string | null
          license_number: string | null
          phone_number: string | null
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          email_verified?: boolean
          id?: string
          is_active?: boolean
          license_expiry?: string | null
          license_number?: string | null
          phone_number?: string | null
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          email_verified?: boolean
          id?: string
          is_active?: boolean
          license_expiry?: string | null
          license_number?: string | null
          phone_number?: string | null
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
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
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tow_companies: {
        Row: {
          address: string
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          phone: string
          region: string
        }
        Insert: {
          address?: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          phone?: string
          region?: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          phone?: string
          region?: string
        }
        Relationships: []
      }
      tp_photos: {
        Row: {
          claim_id: string
          created_at: string
          file_name: string
          file_path: string
          id: string
          tp_index: number
          type: string
          user_id: string
        }
        Insert: {
          claim_id: string
          created_at?: string
          file_name?: string
          file_path: string
          id?: string
          tp_index: number
          type: string
          user_id: string
        }
        Update: {
          claim_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          tp_index?: number
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tp_photos_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
        ]
      }
      user_documents: {
        Row: {
          category: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          notes: string | null
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          file_name?: string
          file_path: string
          file_size?: number
          id?: string
          notes?: string | null
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          notes?: string | null
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_documents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
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
          is_active: boolean
          make: string
          model: string
          modification_details: string | null
          modified: boolean
          photo_url: string
          rego_expiry: string
          rego_number: string
          slug: string | null
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
          is_active?: boolean
          make?: string
          model?: string
          modification_details?: string | null
          modified?: boolean
          photo_url?: string
          rego_expiry?: string
          rego_number?: string
          slug?: string | null
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
          is_active?: boolean
          make?: string
          model?: string
          modification_details?: string | null
          modified?: boolean
          photo_url?: string
          rego_expiry?: string
          rego_number?: string
          slug?: string | null
          updated_at?: string
          user_id?: string
          wof_expiry?: string
          year?: string
        }
        Relationships: []
      }
      widget_tokens: {
        Row: {
          created_at: string
          device_label: string
          expires_at: string
          id: string
          last_used_at: string | null
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_label?: string
          expires_at?: string
          id?: string
          last_used_at?: string | null
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_label?: string
          expires_at?: string
          id?: string
          last_used_at?: string | null
          token?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      are_in_same_family: {
        Args: { _user_a: string; _user_b: string }
        Returns: boolean
      }
      can_access_user_data: {
        Args: { _owner: string; _viewer: string }
        Returns: boolean
      }
      current_user_family_id: { Args: never; Returns: string }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      family_head_for_user: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_family_head: {
        Args: { _family_id: string; _user_id: string }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      user_family_id: { Args: { _user_id: string }; Returns: string }
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
