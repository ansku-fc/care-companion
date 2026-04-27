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
          attachment_url: string | null
          coordination_category: string | null
          created_at: string
          end_time: string
          id: string
          is_external_specialist: boolean
          is_home_visit: boolean
          is_labs: boolean
          is_nurse_visit: boolean
          is_onboarding: boolean
          lab_package: string | null
          lab_tests_selected: Json | null
          notes: string | null
          other_doctor_name: string | null
          patient_id: string
          provider_id: string | null
          specialist_location: string | null
          specialist_name: string | null
          start_time: string
          title: string
          visit_modality: string
        }
        Insert: {
          appointment_type?: Database["public"]["Enums"]["appointment_type"]
          attachment_url?: string | null
          coordination_category?: string | null
          created_at?: string
          end_time: string
          id?: string
          is_external_specialist?: boolean
          is_home_visit?: boolean
          is_labs?: boolean
          is_nurse_visit?: boolean
          is_onboarding?: boolean
          lab_package?: string | null
          lab_tests_selected?: Json | null
          notes?: string | null
          other_doctor_name?: string | null
          patient_id: string
          provider_id?: string | null
          specialist_location?: string | null
          specialist_name?: string | null
          start_time: string
          title: string
          visit_modality?: string
        }
        Update: {
          appointment_type?: Database["public"]["Enums"]["appointment_type"]
          attachment_url?: string | null
          coordination_category?: string | null
          created_at?: string
          end_time?: string
          id?: string
          is_external_specialist?: boolean
          is_home_visit?: boolean
          is_labs?: boolean
          is_nurse_visit?: boolean
          is_onboarding?: boolean
          lab_package?: string | null
          lab_tests_selected?: Json | null
          notes?: string | null
          other_doctor_name?: string | null
          patient_id?: string
          provider_id?: string | null
          specialist_location?: string | null
          specialist_name?: string | null
          start_time?: string
          title?: string
          visit_modality?: string
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
      health_reports: {
        Row: {
          created_at: string
          created_by: string
          dimension_texts: Json
          id: string
          overview_recommendations: string | null
          overview_summary: string | null
          patient_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          dimension_texts?: Json
          id?: string
          overview_recommendations?: string | null
          overview_summary?: string | null
          patient_id: string
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          dimension_texts?: Json
          id?: string
          overview_recommendations?: string | null
          overview_summary?: string | null
          patient_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_reports_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_orders: {
        Row: {
          appointment_id: string | null
          created_at: string
          created_by: string
          destination: string | null
          id: string
          internal_note: string | null
          markers: string[]
          packages: string[]
          patient_id: string
          requisition_file_path: string | null
          results_file_path: string | null
          results_received_at: string | null
          sent_at: string | null
          sent_by: string | null
          status: string
          updated_at: string
          visit_id: string | null
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          created_by: string
          destination?: string | null
          id?: string
          internal_note?: string | null
          markers?: string[]
          packages?: string[]
          patient_id: string
          requisition_file_path?: string | null
          results_file_path?: string | null
          results_received_at?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          updated_at?: string
          visit_id?: string | null
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          created_by?: string
          destination?: string | null
          id?: string
          internal_note?: string | null
          markers?: string[]
          packages?: string[]
          patient_id?: string
          requisition_file_path?: string | null
          results_file_path?: string | null
          results_received_at?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          updated_at?: string
          visit_id?: string | null
        }
        Relationships: []
      }
      marker_annotations: {
        Row: {
          annotation_date: string
          author_name: string
          created_at: string
          created_by: string
          id: string
          marker_key: string
          patient_id: string
          text: string
          updated_at: string
        }
        Insert: {
          annotation_date?: string
          author_name?: string
          created_at?: string
          created_by: string
          id?: string
          marker_key: string
          patient_id: string
          text: string
          updated_at?: string
        }
        Update: {
          annotation_date?: string
          author_name?: string
          created_at?: string
          created_by?: string
          id?: string
          marker_key?: string
          patient_id?: string
          text?: string
          updated_at?: string
        }
        Relationships: []
      }
      patient_allergies: {
        Row: {
          allergen: string
          created_at: string
          created_by: string
          icd_code: string | null
          id: string
          notes: string | null
          patient_id: string
          reaction: string | null
          severity: string
          status: string
          updated_at: string
        }
        Insert: {
          allergen: string
          created_at?: string
          created_by: string
          icd_code?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          reaction?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Update: {
          allergen?: string
          created_at?: string
          created_by?: string
          icd_code?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          reaction?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_allergies_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_care_team: {
        Row: {
          created_at: string
          created_by: string
          email: string | null
          id: string
          is_active: boolean
          member_name: string
          patient_id: string
          phone: string | null
          role: string
          specialty: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          is_active?: boolean
          member_name: string
          patient_id: string
          phone?: string | null
          role: string
          specialty?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          is_active?: boolean
          member_name?: string
          patient_id?: string
          phone?: string | null
          role?: string
          specialty?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_care_team_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_clinical_considerations: {
        Row: {
          category: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          patient_id: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          patient_id: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          patient_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_clinical_considerations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_diagnoses: {
        Row: {
          created_at: string
          created_by: string
          diagnosed_date: string | null
          diagnosis: string
          icd_code: string | null
          id: string
          notes: string | null
          patient_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          diagnosed_date?: string | null
          diagnosis: string
          icd_code?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          diagnosed_date?: string | null
          diagnosis?: string
          icd_code?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_diagnoses_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_health_categories: {
        Row: {
          category: string
          id: string
          patient_id: string
          recommendations: string | null
          status: string
          summary: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category: string
          id?: string
          patient_id: string
          recommendations?: string | null
          status?: string
          summary?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          id?: string
          patient_id?: string
          recommendations?: string | null
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
      patient_health_files: {
        Row: {
          created_at: string
          created_by: string
          file_category: string
          file_name: string
          file_path: string
          file_size: number | null
          health_dimension: string | null
          id: string
          notes: string | null
          patient_id: string
          source: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          file_category: string
          file_name: string
          file_path: string
          file_size?: number | null
          health_dimension?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          source?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          file_category?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          health_dimension?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          source?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_health_files_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_lab_results: {
        Row: {
          afos_alp_u_l: number | null
          alat_asat_ratio: number | null
          alat_u_l: number | null
          apoe_e4: boolean | null
          blood_pressure_diastolic: number | null
          blood_pressure_systolic: number | null
          calcium_adjusted_mmol_l: number | null
          calcium_ionised_mmol_l: number | null
          calcium_mmol_l: number | null
          created_at: string
          created_by: string
          creatinine_umol_l: number | null
          cystatin_c: number | null
          egfr: number | null
          ferritin_ug_l: number | null
          fev1_percent: number | null
          folate_ug_l: number | null
          free_t4_pmol_l: number | null
          fvc_percent: number | null
          gt_u_l: number | null
          hba1c_mmol_mol: number | null
          holotranscobalamin_pmol_l: number | null
          id: string
          iron_serum_umol_l: number | null
          lab_order_id: string | null
          ldl_mmol_l: number | null
          magnesium_mmol_l: number | null
          patient_id: string
          pef_percent: number | null
          phosphate_mmol_l: number | null
          potassium_mmol_l: number | null
          prealbumin_g_l: number | null
          result_date: string
          sodium_mmol_l: number | null
          source: string
          source_filename: string | null
          testosterone_estrogen_abnormal: boolean | null
          total_protein_g_l: number | null
          transferrin_g_l: number | null
          transferrin_receptor_mg_l: number | null
          transferrin_saturation_pct: number | null
          tsh_mu_l: number | null
          u_alb_krea_abnormal: boolean | null
          updated_at: string
          urine_acr_mg_mmol: number | null
          visit_id: string | null
          vitamin_b12_total_ng_l: number | null
          vitamin_d_25oh_nmol_l: number | null
        }
        Insert: {
          afos_alp_u_l?: number | null
          alat_asat_ratio?: number | null
          alat_u_l?: number | null
          apoe_e4?: boolean | null
          blood_pressure_diastolic?: number | null
          blood_pressure_systolic?: number | null
          calcium_adjusted_mmol_l?: number | null
          calcium_ionised_mmol_l?: number | null
          calcium_mmol_l?: number | null
          created_at?: string
          created_by: string
          creatinine_umol_l?: number | null
          cystatin_c?: number | null
          egfr?: number | null
          ferritin_ug_l?: number | null
          fev1_percent?: number | null
          folate_ug_l?: number | null
          free_t4_pmol_l?: number | null
          fvc_percent?: number | null
          gt_u_l?: number | null
          hba1c_mmol_mol?: number | null
          holotranscobalamin_pmol_l?: number | null
          id?: string
          iron_serum_umol_l?: number | null
          lab_order_id?: string | null
          ldl_mmol_l?: number | null
          magnesium_mmol_l?: number | null
          patient_id: string
          pef_percent?: number | null
          phosphate_mmol_l?: number | null
          potassium_mmol_l?: number | null
          prealbumin_g_l?: number | null
          result_date?: string
          sodium_mmol_l?: number | null
          source?: string
          source_filename?: string | null
          testosterone_estrogen_abnormal?: boolean | null
          total_protein_g_l?: number | null
          transferrin_g_l?: number | null
          transferrin_receptor_mg_l?: number | null
          transferrin_saturation_pct?: number | null
          tsh_mu_l?: number | null
          u_alb_krea_abnormal?: boolean | null
          updated_at?: string
          urine_acr_mg_mmol?: number | null
          visit_id?: string | null
          vitamin_b12_total_ng_l?: number | null
          vitamin_d_25oh_nmol_l?: number | null
        }
        Update: {
          afos_alp_u_l?: number | null
          alat_asat_ratio?: number | null
          alat_u_l?: number | null
          apoe_e4?: boolean | null
          blood_pressure_diastolic?: number | null
          blood_pressure_systolic?: number | null
          calcium_adjusted_mmol_l?: number | null
          calcium_ionised_mmol_l?: number | null
          calcium_mmol_l?: number | null
          created_at?: string
          created_by?: string
          creatinine_umol_l?: number | null
          cystatin_c?: number | null
          egfr?: number | null
          ferritin_ug_l?: number | null
          fev1_percent?: number | null
          folate_ug_l?: number | null
          free_t4_pmol_l?: number | null
          fvc_percent?: number | null
          gt_u_l?: number | null
          hba1c_mmol_mol?: number | null
          holotranscobalamin_pmol_l?: number | null
          id?: string
          iron_serum_umol_l?: number | null
          lab_order_id?: string | null
          ldl_mmol_l?: number | null
          magnesium_mmol_l?: number | null
          patient_id?: string
          pef_percent?: number | null
          phosphate_mmol_l?: number | null
          potassium_mmol_l?: number | null
          prealbumin_g_l?: number | null
          result_date?: string
          sodium_mmol_l?: number | null
          source?: string
          source_filename?: string | null
          testosterone_estrogen_abnormal?: boolean | null
          total_protein_g_l?: number | null
          transferrin_g_l?: number | null
          transferrin_receptor_mg_l?: number | null
          transferrin_saturation_pct?: number | null
          tsh_mu_l?: number | null
          u_alb_krea_abnormal?: boolean | null
          updated_at?: string
          urine_acr_mg_mmol?: number | null
          visit_id?: string | null
          vitamin_b12_total_ng_l?: number | null
          vitamin_d_25oh_nmol_l?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_lab_results_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_medication_logs: {
        Row: {
          change_date: string
          change_type: string
          changed_by: string
          created_at: string
          id: string
          medication_id: string
          new_dose: string | null
          new_frequency: string | null
          notes: string | null
          patient_id: string
          previous_dose: string | null
          previous_frequency: string | null
        }
        Insert: {
          change_date?: string
          change_type?: string
          changed_by: string
          created_at?: string
          id?: string
          medication_id: string
          new_dose?: string | null
          new_frequency?: string | null
          notes?: string | null
          patient_id: string
          previous_dose?: string | null
          previous_frequency?: string | null
        }
        Update: {
          change_date?: string
          change_type?: string
          changed_by?: string
          created_at?: string
          id?: string
          medication_id?: string
          new_dose?: string | null
          new_frequency?: string | null
          notes?: string | null
          patient_id?: string
          previous_dose?: string | null
          previous_frequency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_medication_logs_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "patient_medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_medication_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_medications: {
        Row: {
          created_at: string
          created_by: string
          dose: string | null
          end_date: string | null
          frequency: string | null
          id: string
          indication: string | null
          medication_name: string
          patient_id: string
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          dose?: string | null
          end_date?: string | null
          frequency?: string | null
          id?: string
          indication?: string | null
          medication_name: string
          patient_id: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          dose?: string | null
          end_date?: string | null
          frequency?: string | null
          id?: string
          indication?: string | null
          medication_name?: string
          patient_id?: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_medications_patient_id_fkey"
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
          bp1_diastolic: number | null
          bp1_systolic: number | null
          bp2_diastolic: number | null
          bp2_systolic: number | null
          cancer_screening_breast: boolean | null
          cancer_screening_cervical: boolean | null
          cancer_screening_colorectal: boolean | null
          cardio_easy_hours_per_week: number | null
          cardio_moderate_hours_per_week: number | null
          cardio_vigorous_hours_per_week: number | null
          created_at: string
          created_by: string
          current_step: number
          deep_sleep_percent: number | null
          draft: boolean
          ecg_notes: string | null
          education_level: string | null
          exercise_met_hours: number | null
          extra_data: Json
          fiber_g_per_day: number | null
          fish_g_per_day: number | null
          fruits_vegetables_g_per_day: number | null
          gad2_score: number | null
          gad7_score: number | null
          genetic_cancer: boolean | null
          genetic_cardiovascular: boolean | null
          genetic_melanoma: boolean | null
          genetic_nervous_system: boolean | null
          height_cm: number | null
          hip_circumference_cm: number | null
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
          occupation: string | null
          other_substances: boolean | null
          other_substances_notes: string | null
          patient_id: string
          phq2_score: number | null
          prev_brain_damage: boolean | null
          prev_brain_damage_notes: string | null
          prev_cancer: boolean | null
          prev_cancer_notes: string | null
          prev_osteoporotic_fracture: boolean | null
          prev_osteoporotic_fracture_notes: string | null
          prev_precancerous: boolean | null
          prev_precancerous_notes: string | null
          red_meat_g_per_day: number | null
          sedentary_hours_per_day: number | null
          shift_work: boolean | null
          skin_condition: number | null
          sleep_hours_per_night: number | null
          sleep_quality: number | null
          smoking: string | null
          social_support_perceived: number | null
          sodium_g_per_day: number | null
          strength_hours_per_week: number | null
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
          bp1_diastolic?: number | null
          bp1_systolic?: number | null
          bp2_diastolic?: number | null
          bp2_systolic?: number | null
          cancer_screening_breast?: boolean | null
          cancer_screening_cervical?: boolean | null
          cancer_screening_colorectal?: boolean | null
          cardio_easy_hours_per_week?: number | null
          cardio_moderate_hours_per_week?: number | null
          cardio_vigorous_hours_per_week?: number | null
          created_at?: string
          created_by: string
          current_step?: number
          deep_sleep_percent?: number | null
          draft?: boolean
          ecg_notes?: string | null
          education_level?: string | null
          exercise_met_hours?: number | null
          extra_data?: Json
          fiber_g_per_day?: number | null
          fish_g_per_day?: number | null
          fruits_vegetables_g_per_day?: number | null
          gad2_score?: number | null
          gad7_score?: number | null
          genetic_cancer?: boolean | null
          genetic_cardiovascular?: boolean | null
          genetic_melanoma?: boolean | null
          genetic_nervous_system?: boolean | null
          height_cm?: number | null
          hip_circumference_cm?: number | null
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
          occupation?: string | null
          other_substances?: boolean | null
          other_substances_notes?: string | null
          patient_id: string
          phq2_score?: number | null
          prev_brain_damage?: boolean | null
          prev_brain_damage_notes?: string | null
          prev_cancer?: boolean | null
          prev_cancer_notes?: string | null
          prev_osteoporotic_fracture?: boolean | null
          prev_osteoporotic_fracture_notes?: string | null
          prev_precancerous?: boolean | null
          prev_precancerous_notes?: string | null
          red_meat_g_per_day?: number | null
          sedentary_hours_per_day?: number | null
          shift_work?: boolean | null
          skin_condition?: number | null
          sleep_hours_per_night?: number | null
          sleep_quality?: number | null
          smoking?: string | null
          social_support_perceived?: number | null
          sodium_g_per_day?: number | null
          strength_hours_per_week?: number | null
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
          bp1_diastolic?: number | null
          bp1_systolic?: number | null
          bp2_diastolic?: number | null
          bp2_systolic?: number | null
          cancer_screening_breast?: boolean | null
          cancer_screening_cervical?: boolean | null
          cancer_screening_colorectal?: boolean | null
          cardio_easy_hours_per_week?: number | null
          cardio_moderate_hours_per_week?: number | null
          cardio_vigorous_hours_per_week?: number | null
          created_at?: string
          created_by?: string
          current_step?: number
          deep_sleep_percent?: number | null
          draft?: boolean
          ecg_notes?: string | null
          education_level?: string | null
          exercise_met_hours?: number | null
          extra_data?: Json
          fiber_g_per_day?: number | null
          fish_g_per_day?: number | null
          fruits_vegetables_g_per_day?: number | null
          gad2_score?: number | null
          gad7_score?: number | null
          genetic_cancer?: boolean | null
          genetic_cardiovascular?: boolean | null
          genetic_melanoma?: boolean | null
          genetic_nervous_system?: boolean | null
          height_cm?: number | null
          hip_circumference_cm?: number | null
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
          occupation?: string | null
          other_substances?: boolean | null
          other_substances_notes?: string | null
          patient_id?: string
          phq2_score?: number | null
          prev_brain_damage?: boolean | null
          prev_brain_damage_notes?: string | null
          prev_cancer?: boolean | null
          prev_cancer_notes?: string | null
          prev_osteoporotic_fracture?: boolean | null
          prev_osteoporotic_fracture_notes?: string | null
          prev_precancerous?: boolean | null
          prev_precancerous_notes?: string | null
          red_meat_g_per_day?: number | null
          sedentary_hours_per_day?: number | null
          shift_work?: boolean | null
          skin_condition?: number | null
          sleep_hours_per_night?: number | null
          sleep_quality?: number | null
          smoking?: string | null
          social_support_perceived?: number | null
          sodium_g_per_day?: number | null
          strength_hours_per_week?: number | null
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
      patient_relationships: {
        Row: {
          created_at: string
          created_by: string
          id: string
          patient_id: string
          related_patient_id: string
          relationship_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          patient_id: string
          related_patient_id: string
          relationship_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          patient_id?: string
          related_patient_id?: string
          relationship_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_relationships_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_relationships_related_patient_id_fkey"
            columns: ["related_patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          assigned_doctor_id: string | null
          billing_email: string | null
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
          health_recommendations: string | null
          health_summary: string | null
          id: string
          insurance_number: string | null
          insurance_provider: string | null
          notes: string | null
          onboarding_status: string
          payer_name: string | null
          payer_same_as_patient: boolean
          personal_id: string | null
          phone: string | null
          post_code: string | null
          primary_language: string | null
          tier: Database["public"]["Enums"]["patient_tier"] | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          assigned_doctor_id?: string | null
          billing_email?: string | null
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
          health_recommendations?: string | null
          health_summary?: string | null
          id?: string
          insurance_number?: string | null
          insurance_provider?: string | null
          notes?: string | null
          onboarding_status?: string
          payer_name?: string | null
          payer_same_as_patient?: boolean
          personal_id?: string | null
          phone?: string | null
          post_code?: string | null
          primary_language?: string | null
          tier?: Database["public"]["Enums"]["patient_tier"] | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          assigned_doctor_id?: string | null
          billing_email?: string | null
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
          health_recommendations?: string | null
          health_summary?: string | null
          id?: string
          insurance_number?: string | null
          insurance_provider?: string | null
          notes?: string | null
          onboarding_status?: string
          payer_name?: string | null
          payer_same_as_patient?: boolean
          personal_id?: string | null
          phone?: string | null
          post_code?: string | null
          primary_language?: string | null
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
          assignee_name: string | null
          assignee_type: string | null
          category: Database["public"]["Enums"]["task_category"]
          clinical_source: string | null
          created_at: string
          created_by: string
          created_from: string | null
          description: string | null
          due_date: string | null
          id: string
          patient_id: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          referral_progress: Json
          scheduled_appointment_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          task_category: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          assignee_name?: string | null
          assignee_type?: string | null
          category: Database["public"]["Enums"]["task_category"]
          clinical_source?: string | null
          created_at?: string
          created_by: string
          created_from?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          patient_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          referral_progress?: Json
          scheduled_appointment_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          task_category?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          assignee_name?: string | null
          assignee_type?: string | null
          category?: Database["public"]["Enums"]["task_category"]
          clinical_source?: string | null
          created_at?: string
          created_by?: string
          created_from?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          patient_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          referral_progress?: Json
          scheduled_appointment_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          task_category?: string
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
          {
            foreignKeyName: "tasks_scheduled_appointment_id_fkey"
            columns: ["scheduled_appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          patient_id: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          patient_id?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          patient_id?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
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
          attending_doctor: string | null
          attending_nurse: string | null
          chief_complaint: string | null
          clinical_notes: string | null
          created_at: string
          id: string
          internal_note_to_nurse: string | null
          lab_order_id: string | null
          notes: string | null
          outcomes: string | null
          patient_id: string
          provider_id: string
          visit_date: string
          visit_mode: string | null
          visit_time: string | null
          visit_type: string | null
          vitals: Json | null
        }
        Insert: {
          attending_doctor?: string | null
          attending_nurse?: string | null
          chief_complaint?: string | null
          clinical_notes?: string | null
          created_at?: string
          id?: string
          internal_note_to_nurse?: string | null
          lab_order_id?: string | null
          notes?: string | null
          outcomes?: string | null
          patient_id: string
          provider_id: string
          visit_date?: string
          visit_mode?: string | null
          visit_time?: string | null
          visit_type?: string | null
          vitals?: Json | null
        }
        Update: {
          attending_doctor?: string | null
          attending_nurse?: string | null
          chief_complaint?: string | null
          clinical_notes?: string | null
          created_at?: string
          id?: string
          internal_note_to_nurse?: string | null
          lab_order_id?: string | null
          notes?: string | null
          outcomes?: string | null
          patient_id?: string
          provider_id?: string
          visit_date?: string
          visit_mode?: string | null
          visit_time?: string | null
          visit_type?: string | null
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
        | "doctor_meeting"
        | "nurse_task"
        | "working_time"
        | "onboarding"
        | "annual_checkup"
        | "acute_consultation"
        | "care_coordination"
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
        | "clinical"
        | "referral"
        | "administrative"
      task_priority: "urgent" | "high" | "medium" | "low"
      task_status: "todo" | "in_progress" | "done" | "deferred"
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
        "doctor_meeting",
        "nurse_task",
        "working_time",
        "onboarding",
        "annual_checkup",
        "acute_consultation",
        "care_coordination",
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
        "clinical",
        "referral",
        "administrative",
      ],
      task_priority: ["urgent", "high", "medium", "low"],
      task_status: ["todo", "in_progress", "done", "deferred"],
    },
  },
} as const
