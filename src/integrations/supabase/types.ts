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
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          item_id: string
          item_name: string
          performed_by: string
          performed_by_name: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          item_id: string
          item_name: string
          performed_by: string
          performed_by_name: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          item_id?: string
          item_name?: string
          performed_by?: string
          performed_by_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      bundle_items: {
        Row: {
          bundle_id: string
          created_at: string
          id: string
          item_id: string
        }
        Insert: {
          bundle_id: string
          created_at?: string
          id?: string
          item_id: string
        }
        Update: {
          bundle_id?: string
          created_at?: string
          id?: string
          item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bundle_items_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      bundles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          bundle_id: string | null
          category: string
          checked_out_at: string | null
          checked_out_by: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_consumable: boolean | null
          location: string
          location_id: string | null
          name: string
          qr_code: string
          quantity: number | null
          status: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          bundle_id?: string | null
          category: string
          checked_out_at?: string | null
          checked_out_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_consumable?: boolean | null
          location: string
          location_id?: string | null
          name: string
          qr_code: string
          quantity?: number | null
          status?: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          bundle_id?: string | null
          category?: string
          checked_out_at?: string | null
          checked_out_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_consumable?: boolean | null
          location?: string
          location_id?: string | null
          name?: string
          qr_code?: string
          quantity?: number | null
          status?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      item_requests: {
        Row: {
          admin_proposed_date: string | null
          admin_response: string | null
          confirmed_date: string | null
          created_at: string
          free_reduced_lunch: string | null
          id: string
          item_id: string
          item_name: string
          message: string | null
          number_of_students: number | null
          preferred_dates: string[] | null
          requester_email: string | null
          requester_id: string
          requester_name: string
          requester_organization: string | null
          return_due_date: string | null
          return_reminder_sent_at: string | null
          special_groups: string[] | null
          status: string
          updated_at: string
          usage_days: number | null
          usage_hours: number | null
        }
        Insert: {
          admin_proposed_date?: string | null
          admin_response?: string | null
          confirmed_date?: string | null
          created_at?: string
          free_reduced_lunch?: string | null
          id?: string
          item_id: string
          item_name: string
          message?: string | null
          number_of_students?: number | null
          preferred_dates?: string[] | null
          requester_email?: string | null
          requester_id: string
          requester_name: string
          requester_organization?: string | null
          return_due_date?: string | null
          return_reminder_sent_at?: string | null
          special_groups?: string[] | null
          status?: string
          updated_at?: string
          usage_days?: number | null
          usage_hours?: number | null
        }
        Update: {
          admin_proposed_date?: string | null
          admin_response?: string | null
          confirmed_date?: string | null
          created_at?: string
          free_reduced_lunch?: string | null
          id?: string
          item_id?: string
          item_name?: string
          message?: string | null
          number_of_students?: number | null
          preferred_dates?: string[] | null
          requester_email?: string | null
          requester_id?: string
          requester_name?: string
          requester_organization?: string | null
          return_due_date?: string | null
          return_reminder_sent_at?: string | null
          special_groups?: string[] | null
          status?: string
          updated_at?: string
          usage_days?: number | null
          usage_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "item_requests_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          updated_at: string
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      ohio_schools: {
        Row: {
          address: string | null
          building_name: string
          city: string | null
          county: string | null
          created_at: string
          district_irn: string | null
          district_name: string | null
          enrollment_by_grade: Json
          high_grade: string | null
          irn: string
          low_grade: string | null
          pct_economically_disadvantaged: number | null
          pct_english_learners: number | null
          pct_gifted: number | null
          pct_students_with_disabilities: number | null
          race_ethnicity: Json
          school_year: string
          total_enrollment: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          building_name: string
          city?: string | null
          county?: string | null
          created_at?: string
          district_irn?: string | null
          district_name?: string | null
          enrollment_by_grade?: Json
          high_grade?: string | null
          irn: string
          low_grade?: string | null
          pct_economically_disadvantaged?: number | null
          pct_english_learners?: number | null
          pct_gifted?: number | null
          pct_students_with_disabilities?: number | null
          race_ethnicity?: Json
          school_year: string
          total_enrollment?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          building_name?: string
          city?: string | null
          county?: string | null
          created_at?: string
          district_irn?: string | null
          district_name?: string | null
          enrollment_by_grade?: Json
          high_grade?: string | null
          irn?: string
          low_grade?: string | null
          pct_economically_disadvantaged?: number | null
          pct_english_learners?: number | null
          pct_gifted?: number | null
          pct_students_with_disabilities?: number | null
          race_ethnicity?: Json
          school_year?: string
          total_enrollment?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      organization_schools: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          school_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          school_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_schools_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_schools_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "partner_schools"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          org_type: string
          profile_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          org_type?: string
          profile_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          org_type?: string
          profile_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_schools: {
        Row: {
          address: string | null
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          notes: string | null
          ohio_irn: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          notes?: string | null
          ohio_irn?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          notes?: string | null
          ohio_irn?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_schools_ohio_irn_fkey"
            columns: ["ohio_irn"]
            isOneToOne: false
            referencedRelation: "ohio_schools"
            referencedColumns: ["irn"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          organization_address: string | null
          organization_latitude: number | null
          organization_longitude: number | null
          organization_name: string | null
          position: string | null
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          organization_address?: string | null
          organization_latitude?: number | null
          organization_longitude?: number | null
          organization_name?: string | null
          position?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          organization_address?: string | null
          organization_latitude?: number | null
          organization_longitude?: number | null
          organization_name?: string | null
          position?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          file_path: string | null
          id: string
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          type: string
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_path?: string | null
          id?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          type: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_path?: string | null
          id?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          type?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      teacher_school_assignments: {
        Row: {
          created_at: string
          demographics_snapshot: Json
          grade_high: string
          grade_low: string
          id: string
          notes: string | null
          program_name: string | null
          program_type: string | null
          school_id: string
          school_year: string | null
          students_served: number | null
          subject: string | null
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          demographics_snapshot?: Json
          grade_high: string
          grade_low: string
          id?: string
          notes?: string | null
          program_name?: string | null
          program_type?: string | null
          school_id: string
          school_year?: string | null
          students_served?: number | null
          subject?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          demographics_snapshot?: Json
          grade_high?: string
          grade_low?: string
          id?: string
          notes?: string | null
          program_name?: string | null
          program_type?: string | null
          school_id?: string
          school_year?: string | null
          students_served?: number | null
          subject?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_school_assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "partner_schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_school_assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          profile_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          profile_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          profile_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teachers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          role?: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_check_in_out: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_member: { Args: never; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "user" | "member"
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
      app_role: ["admin", "user", "member"],
    },
  },
} as const
