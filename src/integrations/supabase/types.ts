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
      appointments: {
        Row: {
          appointment_type: Database["public"]["Enums"]["appointment_type"]
          created_at: string
          end_time: string
          id: string
          notes: string | null
          patient_id: string
          provider_id: string
          start_time: string
          title: string
        }
        Insert: {
          appointment_type?: Database["public"]["Enums"]["appointment_type"]
          created_at?: string
          end_time: string
          id?: string
          notes?: string | null
          patient_id: string
          provider_id: string
          start_time: string
          title: string
        }
        Update: {
          appointment_type?: Database["public"]["Enums"]["appointment_type"]
          created_at?: string
          end_time?: string
          id?: string
          notes?: string | null
          patient_id?: string
          provider_id?: string
          start_time?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_hours: {
        Row: {
          created_at: string
          date: string
          hours: number
          id: string
          notes: string | null
          patient_tier: Database["public"]["Enums"]["patient_tier"]
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          hours?: number
          id?: string
          notes?: string | null
          patient_tier: Database["public"]["Enums"]["patient_tier"]
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          hours?: number
          id?: string
          notes?: string | null
          patient_tier?: Database["public"]["Enums"]["patient_tier"]
          user_id?: string
        }
        Relationships: []
      }
      patient_health_categories: {
        Row: {
          category: string
          id: string
          patient_id: string
          status: string
          summary: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category: string
          id?: string
          patient_id: string
          status?: string
          summary?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          id?: string
          patient_id?: string
          status?: string
          summary?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_health_categories_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_onboarding: {
        Row: {
          age: number | null
          alcohol_units_per_week: number | null
          bmi: number | null
          cancer_screening_breast: boolean | null
          cancer_screening_cervical: boolean | null
          cancer_screening_colorectal: boolean | null
          created_at: string
          created_by: string
          deep_sleep_percent: number | null
          exercise_met_hours: number | null
          fiber_g_per_day: number | null
          fish_g_per_day: number | null
          fruits_vegetables_g_per_day: number | null
          gad7_score: number | null
          genetic_cancer: boolean | null
          genetic_cardiovascular: boolean | null
          genetic_melanoma: boolean | null
          genetic_nervous_system: boolean | null
          height_cm: number | null
          id: string
          illness_cancer: boolean | null
          illness_cancer_notes: string | null
          illness_cardiovascular: boolean | null
          illness_cardiovascular_notes: string | null
          illness_gastrointestinal: boolean | null
          illness_gastrointestinal_notes: string | null
          illness_hormone: boolean | null
          illness_immune: boolean | null
          illness_kidney: boolean | null
          illness_kidney_notes: string | null
          illness_liver: boolean | null
          illness_mental_health: boolean | null
          illness_mental_health_notes: string | null
          illness_musculoskeletal: boolean | null
          illness_musculoskeletal_notes: string | null
          illness_neurological: boolean | null
          illness_senses: boolean | null
          illness_senses_notes: string | null
          infections_per_year: number | null
          insomnia: boolean | null
          job_strain_perceived: number | null
          other_substances: boolean | null
          other_substances_notes: string | null
          patient_id: string
          prev_brain_damage: boolean | null
          prev_cancer: boolean | null
          prev_osteoporotic_fracture: boolean | null
          prev_precancerous: boolean | null
          red_meat_g_per_day: number | null
          skin_condition: number | null
          sleep_hours_per_night: number | null
          sleep_quality: number | null
          smoking: string | null
          social_support_perceived: number | null
          sodium_g_per_day: number | null
          stress_perceived: number | null
          substance_use_perceived: number | null
          sugar_g_per_day: number | null
          sun_exposure: boolean | null
          symptom_balance: boolean | null
          symptom_gastrointestinal: boolean | null
          symptom_hearing: boolean | null
          symptom_immune_allergies: boolean | null
          symptom_joint_pain: boolean | null
          symptom_kidney_function: boolean | null
          symptom_menstruation_menopause: boolean | null
          symptom_mobility_restriction: boolean | null
          symptom_mucous_membranes: boolean | null
          symptom_neurological: boolean | null
          symptom_respiratory: boolean | null
          symptom_skin_rash: boolean | null
          symptom_sleep_apnoea: boolean | null
          symptom_smell: boolean | null
          symptom_vision: boolean | null
          updated_at: string
          vision_acuity: number | null
          waist_circumference_cm: number | null
          waist_to_hip_ratio: number | null
          weight_kg: number | null
        }
        Insert: {
          age?: number | null
          alcohol_units_per_week?: number | null
          bmi?: number | null
          cancer_screening_breast?: boolean | null
          cancer_screening_cervical?: boolean | null
          cancer_screening_colorectal?: boolean | null
          created_at?: string
          created_by: string
          deep_sleep_percent?: number | null
          exercise_met_hours?: number | null
          fiber_g_per_day?: number | null
          fish_g_per_day?: number | null
          fruits_vegetables_g_per_day?: number | null
          gad7_score?: number | null
          genetic_cancer?: boolean | null
          genetic_cardiovascular?: boolean | null
          genetic_melanoma?: boolean | null
          genetic_nervous_system?: boolean | null
          height_cm?: number | null
          id?: string
          illness_cancer?: boolean | null
          illness_cancer_notes?: string | null
          illness_cardiovascular?: boolean | null
          illness_cardiovascular_notes?: string | null
          illness_gastrointestinal?: boolean | null
          illness_gastrointestinal_notes?: string | null
          illness_hormone?: boolean | null
          illness_immune?: boolean | null
          illness_kidney?: boolean | null
          illness_kidney_notes?: string | null
          illness_liver?: boolean | null
          illness_mental_health?: boolean | null
          illness_mental_health_notes?: string | null
          illness_musculoskeletal?: boolean | null
          illness_musculoskeletal_notes?: string | null
          illness_neurological?: boolean | null
          illness_senses?: boolean | null
          illness_senses_notes?: string | null
          infections_per_year?: number | null
          insomnia?: boolean | null
          job_strain_perceived?: number | null
          other_substances?: boolean | null
          other_substances_notes?: string | null
          patient_id: string
          prev_brain_damage?: boolean | null
          prev_cancer?: boolean | null
          prev_osteoporotic_fracture?: boolean | null
          prev_precancerous?: boolean | null
          red_meat_g_per_day?: number | null
          skin_condition?: number | null
          sleep_hours_per_night?: number | null
          sleep_quality?: number | null
          smoking?: string | null
          social_support_perceived?: number | null
          sodium_g_per_day?: number | null
          stress_perceived?: number | null
          substance_use_perceived?: number | null
          sugar_g_per_day?: number | null
          sun_exposure?: boolean | null
          symptom_balance?: boolean | null
          symptom_gastrointestinal?: boolean | null
          symptom_hearing?: boolean | null
          symptom_immune_allergies?: boolean | null
          symptom_joint_pain?: boolean | null
          symptom_kidney_function?: boolean | null
          symptom_menstruation_menopause?: boolean | null
          symptom_mobility_restriction?: boolean | null
          symptom_mucous_membranes?: boolean | null
          symptom_neurological?: boolean | null
          symptom_respiratory?: boolean | null
          symptom_skin_rash?: boolean | null
          symptom_sleep_apnoea?: boolean | null
          symptom_smell?: boolean | null
          symptom_vision?: boolean | null
          updated_at?: string
          vision_acuity?: number | null
          waist_circumference_cm?: number | null
          waist_to_hip_ratio?: number | null
          weight_kg?: number | null
        }
        Update: {
          age?: number | null
          alcohol_units_per_week?: number | null
          bmi?: number | null
          cancer_screening_breast?: boolean | null
          cancer_screening_cervical?: boolean | null
          cancer_screening_colorectal?: boolean | null
          created_at?: string
          created_by?: string
          deep_sleep_percent?: number | null
          exercise_met_hours?: number | null
          fiber_g_per_day?: number | null
          fish_g_per_day?: number | null
          fruits_vegetables_g_per_day?: number | null
          gad7_score?: number | null
          genetic_cancer?: boolean | null
          genetic_cardiovascular?: boolean | null
          genetic_melanoma?: boolean | null
          genetic_nervous_system?: boolean | null
          height_cm?: number | null
          id?: string
          illness_cancer?: boolean | null
          illness_cancer_notes?: string | null
          illness_cardiovascular?: boolean | null
          illness_cardiovascular_notes?: string | null
          illness_gastrointestinal?: boolean | null
          illness_gastrointestinal_notes?: string | null
          illness_hormone?: boolean | null
          illness_immune?: boolean | null
          illness_kidney?: boolean | null
          illness_kidney_notes?: string | null
          illness_liver?: boolean | null
          illness_mental_health?: boolean | null
          illness_mental_health_notes?: string | null
          illness_musculoskeletal?: boolean | null
          illness_musculoskeletal_notes?: string | null
          illness_neurological?: boolean | null
          illness_senses?: boolean | null
          illness_senses_notes?: string | null
          infections_per_year?: number | null
          insomnia?: boolean | null
          job_strain_perceived?: number | null
          other_substances?: boolean | null
          other_substances_notes?: string | null
          patient_id?: string
          prev_brain_damage?: boolean | null
          prev_cancer?: boolean | null
          prev_osteoporotic_fracture?: boolean | null
          prev_precancerous?: boolean | null
          red_meat_g_per_day?: number | null
          skin_condition?: number | null
          sleep_hours_per_night?: number | null
          sleep_quality?: number | null
          smoking?: string | null
          social_support_perceived?: number | null
          sodium_g_per_day?: number | null
          stress_perceived?: number | null
          substance_use_perceived?: number | null
          sugar_g_per_day?: number | null
          sun_exposure?: boolean | null
          symptom_balance?: boolean | null
          symptom_gastrointestinal?: boolean | null
          symptom_hearing?: boolean | null
          symptom_immune_allergies?: boolean | null
          symptom_joint_pain?: boolean | null
          symptom_kidney_function?: boolean | null
          symptom_menstruation_menopause?: boolean | null
          symptom_mobility_restriction?: boolean | null
          symptom_mucous_membranes?: boolean | null
          symptom_neurological?: boolean | null
          symptom_respiratory?: boolean | null
          symptom_skin_rash?: boolean | null
          symptom_sleep_apnoea?: boolean | null
          symptom_smell?: boolean | null
          symptom_vision?: boolean | null
          updated_at?: string
          vision_acuity?: number | null
          waist_circumference_cm?: number | null
          waist_to_hip_ratio?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_onboarding_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          created_by: string
          date_of_birth: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string
          gender: string | null
          id: string
          insurance_number: string | null
          insurance_provider: string | null
          notes: string | null
          phone: string | null
          post_code: string | null
          tier: Database["public"]["Enums"]["patient_tier"] | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by: string
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name: string
          gender?: string | null
          id?: string
          insurance_number?: string | null
          insurance_provider?: string | null
          notes?: string | null
          phone?: string | null
          post_code?: string | null
          tier?: Database["public"]["Enums"]["patient_tier"] | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          insurance_number?: string | null
          insurance_provider?: string | null
          notes?: string | null
          phone?: string | null
          post_code?: string | null
          tier?: Database["public"]["Enums"]["patient_tier"] | null
          updated_at?: string
        }
        Relationships: []
      }
      personal_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          category: Database["public"]["Enums"]["task_category"]
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          patient_id: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category: Database["public"]["Enums"]["task_category"]
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          patient_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["task_category"]
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          patient_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visit_notes: {
        Row: {
          chief_complaint: string | null
          created_at: string
          id: string
          notes: string | null
          patient_id: string
          provider_id: string
          visit_date: string
          vitals: Json | null
        }
        Insert: {
          chief_complaint?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          patient_id: string
          provider_id: string
          visit_date?: string
          vitals?: Json | null
        }
        Update: {
          chief_complaint?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          patient_id?: string
          provider_id?: string
          visit_date?: string
          vitals?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "visit_notes_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
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
      app_role: "doctor" | "nurse"
      appointment_type:
        | "consultation"
        | "follow_up"
        | "procedure"
        | "check_up"
        | "urgent"
      patient_tier:
        | "tier_1"
        | "tier_2"
        | "tier_3"
        | "tier_4"
        | "children"
        | "onboarding"
        | "acute"
        | "case_management"
      task_category:
        | "clinical_review"
        | "client_communication"
        | "care_coordination"
        | "documentation_reporting"
      task_priority: "urgent" | "high" | "medium" | "low"
      task_status: "todo" | "in_progress" | "done"
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
      app_role: ["doctor", "nurse"],
      appointment_type: [
        "consultation",
        "follow_up",
        "procedure",
        "check_up",
        "urgent",
      ],
      patient_tier: [
        "tier_1",
        "tier_2",
        "tier_3",
        "tier_4",
        "children",
        "onboarding",
        "acute",
        "case_management",
      ],
      task_category: [
        "clinical_review",
        "client_communication",
        "care_coordination",
        "documentation_reporting",
      ],
      task_priority: ["urgent", "high", "medium", "low"],
      task_status: ["todo", "in_progress", "done"],
    },
  },
} as const
