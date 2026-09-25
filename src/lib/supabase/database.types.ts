export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      exercise_media: {
        Row: {
          alt_text: string | null
          attribution: string | null
          created_at: string
          exercise_id: string
          external_url: string | null
          id: string
          is_primary: boolean
          media_type: string
          original_source_url: string | null
          owner_id: string | null
          sort_order: number
          source_cell: string | null
          source_sheet: string | null
          status: string
          storage_path: string | null
          updated_at: string
        }
        Insert: {
          alt_text?: string | null
          attribution?: string | null
          created_at?: string
          exercise_id: string
          external_url?: string | null
          id?: string
          is_primary?: boolean
          media_type: string
          original_source_url?: string | null
          owner_id?: string | null
          sort_order?: number
          source_cell?: string | null
          source_sheet?: string | null
          status?: string
          storage_path?: string | null
          updated_at?: string
        }
        Update: {
          alt_text?: string | null
          attribution?: string | null
          created_at?: string
          exercise_id?: string
          external_url?: string | null
          id?: string
          is_primary?: boolean
          media_type?: string
          original_source_url?: string | null
          owner_id?: string | null
          sort_order?: number
          source_cell?: string | null
          source_sheet?: string | null
          status?: string
          storage_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_media_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_media_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          aliases: string[]
          created_at: string
          default_rest_seconds: number | null
          description: string | null
          equipment: string | null
          id: string
          muscle_group: string | null
          name: string
          owner_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          aliases?: string[]
          created_at?: string
          default_rest_seconds?: number | null
          description?: string | null
          equipment?: string | null
          id?: string
          muscle_group?: string | null
          name: string
          owner_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          aliases?: string[]
          created_at?: string
          default_rest_seconds?: number | null
          description?: string | null
          equipment?: string | null
          id?: string
          muscle_group?: string | null
          name?: string
          owner_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercises_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_records: {
        Row: {
          achieved_at: string
          athlete_id: string
          created_at: string
          exercise_id: string
          id: string
          record_type: string
          source_session_id: string | null
          unit: string
          value: number
        }
        Insert: {
          achieved_at: string
          athlete_id: string
          created_at?: string
          exercise_id: string
          id?: string
          record_type: string
          source_session_id?: string | null
          unit: string
          value: number
        }
        Update: {
          achieved_at?: string
          athlete_id?: string
          created_at?: string
          exercise_id?: string
          id?: string
          record_type?: string
          source_session_id?: string | null
          unit?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "personal_records_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_records_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_records_source_session_id_fkey"
            columns: ["source_session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          locale: string
          preferred_units: string
          source_context: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
          locale?: string
          preferred_units?: string
          source_context?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          locale?: string
          preferred_units?: string
          source_context?: Json
          updated_at?: string
        }
        Relationships: []
      }
      program_phases: {
        Row: {
          description: string | null
          end_week: number | null
          id: string
          label: string | null
          name: string
          program_id: string
          sort_order: number
          source_cell: string | null
          source_sheet: string | null
          start_week: number | null
        }
        Insert: {
          description?: string | null
          end_week?: number | null
          id?: string
          label?: string | null
          name: string
          program_id: string
          sort_order?: number
          source_cell?: string | null
          source_sheet?: string | null
          start_week?: number | null
        }
        Update: {
          description?: string | null
          end_week?: number | null
          id?: string
          label?: string | null
          name?: string
          program_id?: string
          sort_order?: number
          source_cell?: string | null
          source_sheet?: string | null
          start_week?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "program_phases_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "training_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_weeks: {
        Row: {
          id: string
          name: string | null
          phase_id: string | null
          program_id: string
          source_sheet: string | null
          status: string
          week_number: number
        }
        Insert: {
          id?: string
          name?: string | null
          phase_id?: string | null
          program_id: string
          source_sheet?: string | null
          status?: string
          week_number: number
        }
        Update: {
          id?: string
          name?: string | null
          phase_id?: string | null
          program_id?: string
          source_sheet?: string | null
          status?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "program_weeks_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "program_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_weeks_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "training_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      session_exercises: {
        Row: {
          id: string
          notes: string
          session_id: string
          status: string
          workout_item_id: string
        }
        Insert: {
          id?: string
          notes?: string
          session_id: string
          status?: string
          workout_item_id: string
        }
        Update: {
          id?: string
          notes?: string
          session_id?: string
          status?: string
          workout_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_exercises_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_exercises_workout_item_id_fkey"
            columns: ["workout_item_id"]
            isOneToOne: false
            referencedRelation: "workout_items"
            referencedColumns: ["id"]
          },
        ]
      }
      session_sets: {
        Row: {
          actual_reps: number | null
          actual_weight: number | null
          actual_weight_unit: string | null
          completed_at: string | null
          duration_sec: number | null
          id: string
          rpe: number | null
          session_exercise_id: string
          set_number: number
          target_reps: number | null
          target_weight: number | null
          target_weight_unit: string | null
        }
        Insert: {
          actual_reps?: number | null
          actual_weight?: number | null
          actual_weight_unit?: string | null
          completed_at?: string | null
          duration_sec?: number | null
          id?: string
          rpe?: number | null
          session_exercise_id: string
          set_number: number
          target_reps?: number | null
          target_weight?: number | null
          target_weight_unit?: string | null
        }
        Update: {
          actual_reps?: number | null
          actual_weight?: number | null
          actual_weight_unit?: string | null
          completed_at?: string | null
          duration_sec?: number | null
          id?: string
          rpe?: number | null
          session_exercise_id?: string
          set_number?: number
          target_reps?: number | null
          target_weight?: number | null
          target_weight_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_sets_session_exercise_id_fkey"
            columns: ["session_exercise_id"]
            isOneToOne: false
            referencedRelation: "session_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      strength_test_template_sets: {
        Row: {
          id: string
          rest_raw: string | null
          rest_seconds: number | null
          set_number: number
          source_cell: string | null
          target_reps: number | null
          target_weight: number | null
          template_id: string
          weight_raw: string | null
          weight_unit: string | null
        }
        Insert: {
          id?: string
          rest_raw?: string | null
          rest_seconds?: number | null
          set_number: number
          source_cell?: string | null
          target_reps?: number | null
          target_weight?: number | null
          template_id: string
          weight_raw?: string | null
          weight_unit?: string | null
        }
        Update: {
          id?: string
          rest_raw?: string | null
          rest_seconds?: number | null
          set_number?: number
          source_cell?: string | null
          target_reps?: number | null
          target_weight?: number | null
          template_id?: string
          weight_raw?: string | null
          weight_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "strength_test_template_sets_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "strength_test_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      strength_test_templates: {
        Row: {
          exercise_id: string
          formula_name: string | null
          formula_source: string | null
          id: string
          name: string
          program_id: string
          slug: string
          source_cell: string | null
          source_estimated_1rm: number | null
          source_sheet: string | null
        }
        Insert: {
          exercise_id: string
          formula_name?: string | null
          formula_source?: string | null
          id?: string
          name: string
          program_id: string
          slug: string
          source_cell?: string | null
          source_estimated_1rm?: number | null
          source_sheet?: string | null
        }
        Update: {
          exercise_id?: string
          formula_name?: string | null
          formula_source?: string | null
          id?: string
          name?: string
          program_id?: string
          slug?: string
          source_cell?: string | null
          source_estimated_1rm?: number | null
          source_sheet?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "strength_test_templates_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strength_test_templates_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "training_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      strength_tests: {
        Row: {
          athlete_id: string
          created_at: string
          estimated_1rm: number | null
          exercise_id: string
          formula: string | null
          id: string
          performed_at: string
          repetitions: number | null
          result_weight: number | null
          template_id: string | null
          weight_unit: string | null
        }
        Insert: {
          athlete_id: string
          created_at?: string
          estimated_1rm?: number | null
          exercise_id: string
          formula?: string | null
          id?: string
          performed_at?: string
          repetitions?: number | null
          result_weight?: number | null
          template_id?: string | null
          weight_unit?: string | null
        }
        Update: {
          athlete_id?: string
          created_at?: string
          estimated_1rm?: number | null
          exercise_id?: string
          formula?: string | null
          id?: string
          performed_at?: string
          repetitions?: number | null
          result_weight?: number | null
          template_id?: string | null
          weight_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "strength_tests_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strength_tests_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strength_tests_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "strength_test_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      training_programs: {
        Row: {
          athlete_id: string
          created_at: string
          description: string | null
          id: string
          metadata: Json
          name: string
          source: string | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          name: string
          source?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          name?: string
          source?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_programs_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          athlete_id: string
          created_at: string
          dark_mode: boolean
          notifications_enabled: boolean
          preferred_weight_unit: string
          timer_sound: boolean
          updated_at: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          dark_mode?: boolean
          notifications_enabled?: boolean
          preferred_weight_unit?: string
          timer_sound?: boolean
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          dark_mode?: boolean
          notifications_enabled?: boolean
          preferred_weight_unit?: string
          timer_sound?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_days: {
        Row: {
          day_number: number
          description: string | null
          estimated_duration_min: number | null
          id: string
          program_week_id: string
          sort_order: number
          source_cell: string | null
          source_sheet: string | null
          title: string
        }
        Insert: {
          day_number: number
          description?: string | null
          estimated_duration_min?: number | null
          id?: string
          program_week_id: string
          sort_order?: number
          source_cell?: string | null
          source_sheet?: string | null
          title: string
        }
        Update: {
          day_number?: number
          description?: string | null
          estimated_duration_min?: number | null
          id?: string
          program_week_id?: string
          sort_order?: number
          source_cell?: string | null
          source_sheet?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_days_program_week_id_fkey"
            columns: ["program_week_id"]
            isOneToOne: false
            referencedRelation: "program_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_items: {
        Row: {
          cardio: Json | null
          exercise_id: string
          id: string
          intensity: string | null
          item_kind: string
          laterality: string | null
          load_raw: string | null
          notes: string | null
          prescribed_duration_sec: number | null
          prescribed_reps: number | null
          prescribed_sets: number | null
          prescribed_weight: number | null
          prescription_mode: string | null
          rest_raw: string | null
          rest_seconds: number | null
          sort_order: number
          source_cell: string | null
          source_location: string | null
          source_sheet: string | null
          source_url: string | null
          strength_test_ref: string | null
          target_raw: string | null
          weight_quantity: number | null
          weight_unit: string | null
          workout_section_id: string
        }
        Insert: {
          cardio?: Json | null
          exercise_id: string
          id?: string
          intensity?: string | null
          item_kind?: string
          laterality?: string | null
          load_raw?: string | null
          notes?: string | null
          prescribed_duration_sec?: number | null
          prescribed_reps?: number | null
          prescribed_sets?: number | null
          prescribed_weight?: number | null
          prescription_mode?: string | null
          rest_raw?: string | null
          rest_seconds?: number | null
          sort_order?: number
          source_cell?: string | null
          source_location?: string | null
          source_sheet?: string | null
          source_url?: string | null
          strength_test_ref?: string | null
          target_raw?: string | null
          weight_quantity?: number | null
          weight_unit?: string | null
          workout_section_id: string
        }
        Update: {
          cardio?: Json | null
          exercise_id?: string
          id?: string
          intensity?: string | null
          item_kind?: string
          laterality?: string | null
          load_raw?: string | null
          notes?: string | null
          prescribed_duration_sec?: number | null
          prescribed_reps?: number | null
          prescribed_sets?: number | null
          prescribed_weight?: number | null
          prescription_mode?: string | null
          rest_raw?: string | null
          rest_seconds?: number | null
          sort_order?: number
          source_cell?: string | null
          source_location?: string | null
          source_sheet?: string | null
          source_url?: string | null
          strength_test_ref?: string | null
          target_raw?: string | null
          weight_quantity?: number | null
          weight_unit?: string | null
          workout_section_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_items_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_items_workout_section_id_fkey"
            columns: ["workout_section_id"]
            isOneToOne: false
            referencedRelation: "workout_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sections: {
        Row: {
          id: string
          instructions: string | null
          section_type: string
          sort_order: number
          source_cell: string | null
          source_sheet: string | null
          title: string
          workout_day_id: string
        }
        Insert: {
          id?: string
          instructions?: string | null
          section_type: string
          sort_order?: number
          source_cell?: string | null
          source_sheet?: string | null
          title: string
          workout_day_id: string
        }
        Update: {
          id?: string
          instructions?: string | null
          section_type?: string
          sort_order?: number
          source_cell?: string | null
          source_sheet?: string | null
          title?: string
          workout_day_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sections_workout_day_id_fkey"
            columns: ["workout_day_id"]
            isOneToOne: false
            referencedRelation: "workout_days"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          athlete_id: string
          completed_at: string | null
          created_at: string
          id: string
          notes: string
          started_at: string
          status: string
          updated_at: string
          workout_day_id: string
        }
        Insert: {
          athlete_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string
          started_at?: string
          status?: string
          updated_at?: string
          workout_day_id: string
        }
        Update: {
          athlete_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string
          started_at?: string
          status?: string
          updated_at?: string
          workout_day_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_workout_day_id_fkey"
            columns: ["workout_day_id"]
            isOneToOne: false
            referencedRelation: "workout_days"
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
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

