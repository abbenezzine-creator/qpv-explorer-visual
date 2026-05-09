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
          assoc_id: string
          axis_key: string | null
          budget: number | null
          created_at: string
          created_by: string | null
          date_debut: string | null
          date_fin: string | null
          description: string | null
          id: string
          nb_beneficiaires_prevu: number | null
          nb_beneficiaires_reel: number | null
          qpv_key: string | null
          statut: string
          titre: string
          updated_at: string
        }
        Insert: {
          assoc_id: string
          axis_key?: string | null
          budget?: number | null
          created_at?: string
          created_by?: string | null
          date_debut?: string | null
          date_fin?: string | null
          description?: string | null
          id?: string
          nb_beneficiaires_prevu?: number | null
          nb_beneficiaires_reel?: number | null
          qpv_key?: string | null
          statut?: string
          titre: string
          updated_at?: string
        }
        Update: {
          assoc_id?: string
          axis_key?: string | null
          budget?: number | null
          created_at?: string
          created_by?: string | null
          date_debut?: string | null
          date_fin?: string | null
          description?: string | null
          id?: string
          nb_beneficiaires_prevu?: number | null
          nb_beneficiaires_reel?: number | null
          qpv_key?: string | null
          statut?: string
          titre?: string
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
          commune: string | null
          created_at: string
          description: string | null
          id: string
          nom: string
          qpv_key: string | null
          updated_at: string
        }
        Insert: {
          commune?: string | null
          created_at?: string
          description?: string | null
          id?: string
          nom: string
          qpv_key?: string | null
          updated_at?: string
        }
        Update: {
          commune?: string | null
          created_at?: string
          description?: string | null
          id?: string
          nom?: string
          qpv_key?: string | null
          updated_at?: string
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
