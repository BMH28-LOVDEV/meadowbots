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
      allowed_emails: {
        Row: {
          added_by: string | null
          created_at: string
          email: string
          id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      pit_scouting_entries: {
        Row: {
          auto_artifacts_scored: string | null
          auto_clear: string | null
          auto_description: string | null
          auto_start_position: string | null
          created_at: string
          endgame_park_features: string | null
          endgame_park_features_other: string | null
          endgame_parking: string | null
          endgame_strategy: string | null
          id: string
          scoring_zone: string | null
          scouter_name: string
          strengths: string | null
          strengths_weaknesses: string | null
          team_name: string | null
          team_number: string
          teleop_focus: string | null
          teleop_scoring_zone: string | null
          weaknesses: string | null
        }
        Insert: {
          auto_artifacts_scored?: string | null
          auto_clear?: string | null
          auto_description?: string | null
          auto_start_position?: string | null
          created_at?: string
          endgame_park_features?: string | null
          endgame_park_features_other?: string | null
          endgame_parking?: string | null
          endgame_strategy?: string | null
          id?: string
          scoring_zone?: string | null
          scouter_name: string
          strengths?: string | null
          strengths_weaknesses?: string | null
          team_name?: string | null
          team_number: string
          teleop_focus?: string | null
          teleop_scoring_zone?: string | null
          weaknesses?: string | null
        }
        Update: {
          auto_artifacts_scored?: string | null
          auto_clear?: string | null
          auto_description?: string | null
          auto_start_position?: string | null
          created_at?: string
          endgame_park_features?: string | null
          endgame_park_features_other?: string | null
          endgame_parking?: string | null
          endgame_strategy?: string | null
          id?: string
          scoring_zone?: string | null
          scouter_name?: string
          strengths?: string | null
          strengths_weaknesses?: string | null
          team_name?: string | null
          team_number?: string
          teleop_focus?: string | null
          teleop_scoring_zone?: string | null
          weaknesses?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approval_status: string
          created_at: string
          display_name: string
          id: string
          role: string
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          approval_status?: string
          created_at?: string
          display_name: string
          id?: string
          role?: string
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          approval_status?: string
          created_at?: string
          display_name?: string
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      scouting_entries: {
        Row: {
          alliance_won: string | null
          auto_artifacts_scored: string | null
          auto_consistency: string | null
          auto_launch_line: string | null
          auto_leave: string | null
          auto_pattern_alignment: string | null
          endgame_alliance_assist: string | null
          endgame_parking: string | null
          good_match: string | null
          id: string
          match_number: string | null
          match_score: number | null
          penalties: string[] | null
          penalty_points_given: number | null
          scouter_name: string
          special_features: string | null
          team_name: string | null
          team_number: string
          teleop_artifact_classification: string | null
          teleop_ball_capacity: string | null
          teleop_cycle_speed: string | null
          teleop_gate_interaction: string | null
          teleop_intake_method: string | null
          teleop_overflow_management: string | null
          teleop_shooting_accuracy: string | null
          timestamp: string
        }
        Insert: {
          alliance_won?: string | null
          auto_artifacts_scored?: string | null
          auto_consistency?: string | null
          auto_launch_line?: string | null
          auto_leave?: string | null
          auto_pattern_alignment?: string | null
          endgame_alliance_assist?: string | null
          endgame_parking?: string | null
          good_match?: string | null
          id?: string
          match_number?: string | null
          match_score?: number | null
          penalties?: string[] | null
          penalty_points_given?: number | null
          scouter_name: string
          special_features?: string | null
          team_name?: string | null
          team_number: string
          teleop_artifact_classification?: string | null
          teleop_ball_capacity?: string | null
          teleop_cycle_speed?: string | null
          teleop_gate_interaction?: string | null
          teleop_intake_method?: string | null
          teleop_overflow_management?: string | null
          teleop_shooting_accuracy?: string | null
          timestamp?: string
        }
        Update: {
          alliance_won?: string | null
          auto_artifacts_scored?: string | null
          auto_consistency?: string | null
          auto_launch_line?: string | null
          auto_leave?: string | null
          auto_pattern_alignment?: string | null
          endgame_alliance_assist?: string | null
          endgame_parking?: string | null
          good_match?: string | null
          id?: string
          match_number?: string | null
          match_score?: number | null
          penalties?: string[] | null
          penalty_points_given?: number | null
          scouter_name?: string
          special_features?: string | null
          team_name?: string | null
          team_number?: string
          teleop_artifact_classification?: string | null
          teleop_ball_capacity?: string | null
          teleop_cycle_speed?: string | null
          teleop_gate_interaction?: string | null
          teleop_intake_method?: string | null
          teleop_overflow_management?: string | null
          teleop_shooting_accuracy?: string | null
          timestamp?: string
        }
        Relationships: []
      }
      team_assignments: {
        Row: {
          created_at: string
          id: string
          qual_matches: string[] | null
          scout_name: string
          team_name: string
          team_number: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          qual_matches?: string[] | null
          scout_name: string
          team_name?: string
          team_number: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          qual_matches?: string[] | null
          scout_name?: string
          team_name?: string
          team_number?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_master: { Args: { _user_id: string }; Returns: boolean }
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
    Enums: {},
  },
} as const
