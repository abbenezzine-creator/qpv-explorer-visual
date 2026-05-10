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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      actions: {
        Row: {
          annee: number | null
          assoc_id: string
          axis_key: string | null
          budget: number | null
          budget_financeurs: Json | null
          commune: string | null
          created_at: string
          created_by: string | null
          date_debut: string | null
          date_fin: string | null
          description: string | null
          duree: string | null
          fonctions: string[] | null
          heure_debut: string | null
          heure_fin: string | null
          id: string
          jours: string[] | null
          lieu_principal: string | null
          lieux: Json | null
          nb_beneficiaires_prevu: number | null
          nb_beneficiaires_reel: number | null
          objectifs: string | null
          public_quartiers: Json
          qpv_key: string | null
          quartiers: string[] | null
          recurrence: string | null
          recurrence_detail: string | null
          recurrence_fin: string | null
          recurrence_nb: number | null
          ref: string | null
          reference_administrative: string | null
          statut: string
          thematique: string | null
          titre: string
          tranches_age: string[] | null
          type_action: string | null
          updated_at: string
        }
        Insert: {
          annee?: number | null
          assoc_id: string
          axis_key?: string | null
          budget?: number | null
          budget_financeurs?: Json | null
          commune?: string | null
          created_at?: string
          created_by?: string | null
          date_debut?: string | null
          date_fin?: string | null
          description?: string | null
          duree?: string | null
          fonctions?: string[] | null
          heure_debut?: string | null
          heure_fin?: string | null
          id?: string
          jours?: string[] | null
          lieu_principal?: string | null
          lieux?: Json | null
          nb_beneficiaires_prevu?: number | null
          nb_beneficiaires_reel?: number | null
          objectifs?: string | null
          public_quartiers?: Json
          qpv_key?: string | null
          quartiers?: string[] | null
          recurrence?: string | null
          recurrence_detail?: string | null
          recurrence_fin?: string | null
          recurrence_nb?: number | null
          ref?: string | null
          reference_administrative?: string | null
          statut?: string
          thematique?: string | null
          titre: string
          tranches_age?: string[] | null
          type_action?: string | null
          updated_at?: string
        }
        Update: {
          annee?: number | null
          assoc_id?: string
          axis_key?: string | null
          budget?: number | null
          budget_financeurs?: Json | null
          commune?: string | null
          created_at?: string
          created_by?: string | null
          date_debut?: string | null
          date_fin?: string | null
          description?: string | null
          duree?: string | null
          fonctions?: string[] | null
          heure_debut?: string | null
          heure_fin?: string | null
          id?: string
          jours?: string[] | null
          lieu_principal?: string | null
          lieux?: Json | null
          nb_beneficiaires_prevu?: number | null
          nb_beneficiaires_reel?: number | null
          objectifs?: string | null
          public_quartiers?: Json
          qpv_key?: string | null
          quartiers?: string[] | null
          recurrence?: string | null
          recurrence_detail?: string | null
          recurrence_fin?: string | null
          recurrence_nb?: number | null
          ref?: string | null
          reference_administrative?: string | null
          statut?: string
          thematique?: string | null
          titre?: string
          tranches_age?: string[] | null
          type_action?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "actions_assoc_id_fkey"
            columns: ["assoc_id"]
            isOneToOne: false
            referencedRelation: "associations"
            referencedColumns: ["id"]
          },
        ]
      }
      associations: {
        Row: {
          adresse: string | null
          code_postal: string | null
          commune: string | null
          contact_nom: string | null
          created_at: string
          description: string | null
          id: string
          login: string | null
          nom: string
          password: string | null
          qpv_key: string | null
          statut_contact: string | null
          updated_at: string
          ville: string | null
        }
        Insert: {
          adresse?: string | null
          code_postal?: string | null
          commune?: string | null
          contact_nom?: string | null
          created_at?: string
          description?: string | null
          id?: string
          login?: string | null
          nom: string
          password?: string | null
          qpv_key?: string | null
          statut_contact?: string | null
          updated_at?: string
          ville?: string | null
        }
        Update: {
          adresse?: string | null
          code_postal?: string | null
          commune?: string | null
          contact_nom?: string | null
          created_at?: string
          description?: string | null
          id?: string
          login?: string | null
          nom?: string
          password?: string | null
          qpv_key?: string | null
          statut_contact?: string | null
          updated_at?: string
          ville?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          assoc_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          file_path: string | null
          file_size: number | null
          id: string
          mime_type: string | null
          titre: string
          type: string | null
          updated_at: string
          url: string | null
          visible_all: boolean
          visible_assoc_ids: string[]
        }
        Insert: {
          assoc_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          titre: string
          type?: string | null
          updated_at?: string
          url?: string | null
          visible_all?: boolean
          visible_assoc_ids?: string[]
        }
        Update: {
          assoc_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          titre?: string
          type?: string | null
          updated_at?: string
          url?: string | null
          visible_all?: boolean
          visible_assoc_ids?: string[]
        }
        Relationships: []
      }
      evaluations: {
        Row: {
          action_id: string
          beneficiaire_age: number | null
          beneficiaire_genre: string | null
          beneficiaire_nom: string | null
          commentaire: string | null
          created_at: string
          created_by: string | null
          id: string
          phase: string
          reponses: Json
        }
        Insert: {
          action_id: string
          beneficiaire_age?: number | null
          beneficiaire_genre?: string | null
          beneficiaire_nom?: string | null
          commentaire?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          phase: string
          reponses?: Json
        }
        Update: {
          action_id?: string
          beneficiaire_age?: number | null
          beneficiaire_genre?: string | null
          beneficiaire_nom?: string | null
          commentaire?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          phase?: string
          reponses?: Json
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "actions"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations_beneficiaires: {
        Row: {
          action_id: string
          beneficiaire_age: number | null
          beneficiaire_genre: string | null
          beneficiaire_nom: string | null
          commentaire: string | null
          created_at: string
          created_by: string | null
          id: string
          phase: string
          reponses: Json
          satisfaction: number | null
          updated_at: string
        }
        Insert: {
          action_id: string
          beneficiaire_age?: number | null
          beneficiaire_genre?: string | null
          beneficiaire_nom?: string | null
          commentaire?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          phase: string
          reponses?: Json
          satisfaction?: number | null
          updated_at?: string
        }
        Update: {
          action_id?: string
          beneficiaire_age?: number | null
          beneficiaire_genre?: string | null
          beneficiaire_nom?: string | null
          commentaire?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          phase?: string
          reponses?: Json
          satisfaction?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_beneficiaires_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "actions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          assoc_id: string | null
          created_at: string
          email: string | null
          id: string
          nom: string | null
          updated_at: string
        }
        Insert: {
          assoc_id?: string | null
          created_at?: string
          email?: string | null
          id: string
          nom?: string | null
          updated_at?: string
        }
        Update: {
          assoc_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nom?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_assoc_id_fkey"
            columns: ["assoc_id"]
            isOneToOne: false
            referencedRelation: "associations"
            referencedColumns: ["id"]
          },
        ]
      }
      referentiel_qualite: {
        Row: {
          action_id: string
          assoc_id: string
          c1: number | null
          c10: number | null
          c2: number | null
          c3: number | null
          c4: number | null
          c5: number | null
          c6: number | null
          c7: number | null
          c8: number | null
          c9: number | null
          created_at: string
          created_by: string | null
          id: string
          score_global: number | null
          synthese: string | null
          updated_at: string
        }
        Insert: {
          action_id: string
          assoc_id: string
          c1?: number | null
          c10?: number | null
          c2?: number | null
          c3?: number | null
          c4?: number | null
          c5?: number | null
          c6?: number | null
          c7?: number | null
          c8?: number | null
          c9?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          score_global?: number | null
          synthese?: string | null
          updated_at?: string
        }
        Update: {
          action_id?: string
          assoc_id?: string
          c1?: number | null
          c10?: number | null
          c2?: number | null
          c3?: number | null
          c4?: number | null
          c5?: number | null
          c6?: number | null
          c7?: number | null
          c8?: number | null
          c9?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          score_global?: number | null
          synthese?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referentiel_qualite_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referentiel_qualite_assoc_id_fkey"
            columns: ["assoc_id"]
            isOneToOne: false
            referencedRelation: "associations"
            referencedColumns: ["id"]
          },
        ]
      }
      thematic_responses: {
        Row: {
          answers: Json
          common: Json
          created_at: string
          id: string
          phase: string
          theme_id: string | null
          theme_name: string
        }
        Insert: {
          answers?: Json
          common?: Json
          created_at?: string
          id?: string
          phase: string
          theme_id?: string | null
          theme_name: string
        }
        Update: {
          answers?: Json
          common?: Json
          created_at?: string
          id?: string
          phase?: string
          theme_id?: string | null
          theme_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "thematic_responses_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "thematic_themes"
            referencedColumns: ["id"]
          },
        ]
      }
      thematic_themes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          questions_after: Json
          questions_before: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          questions_after?: Json
          questions_before?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          questions_after?: Json
          questions_before?: Json
          updated_at?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      action_assoc_id: { Args: { _action_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_assoc_id: { Args: { _user_id: string }; Returns: string }
    }
    Enums: {
      app_role: "superadmin" | "admin_asso" | "agent" | "viewer"
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
      app_role: ["superadmin", "admin_asso", "agent", "viewer"],
    },
  },
} as const
