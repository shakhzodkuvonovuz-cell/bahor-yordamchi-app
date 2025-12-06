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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      beta_feedback: {
        Row: {
          app_version: string | null
          category: string
          created_at: string
          email: string | null
          id: string
          message: string
          route: string | null
          screenshot_url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          app_version?: string | null
          category: string
          created_at?: string
          email?: string | null
          id?: string
          message: string
          route?: string | null
          screenshot_url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          app_version?: string | null
          category?: string
          created_at?: string
          email?: string | null
          id?: string
          message?: string
          route?: string | null
          screenshot_url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      chat_attachments: {
        Row: {
          bucket: string
          created_at: string
          id: string
          message_id: string | null
          mime_type: string | null
          original_name: string | null
          path: string
          size_bytes: number | null
          thread_id: string | null
          user_id: string
        }
        Insert: {
          bucket?: string
          created_at?: string
          id?: string
          message_id?: string | null
          mime_type?: string | null
          original_name?: string | null
          path: string
          size_bytes?: number | null
          thread_id?: string | null
          user_id: string
        }
        Update: {
          bucket?: string
          created_at?: string
          id?: string
          message_id?: string | null
          mime_type?: string | null
          original_name?: string | null
          path?: string
          size_bytes?: number | null
          thread_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_attachments_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          meta: Json | null
          model: string | null
          reaction: string | null
          role: string
          thread_id: string
          tokens_in: number | null
          tokens_out: number | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          meta?: Json | null
          model?: string | null
          reaction?: string | null
          role: string
          thread_id: string
          tokens_in?: number | null
          tokens_out?: number | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          meta?: Json | null
          model?: string | null
          reaction?: string | null
          role?: string
          thread_id?: string
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          created_at: string
          id: string
          is_archived: boolean
          last_message_preview: string | null
          message_count: number | null
          mode: string
          summary: string | null
          summary_updated_at: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_archived?: boolean
          last_message_preview?: string | null
          message_count?: number | null
          mode?: string
          summary?: string | null
          summary_updated_at?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_archived?: boolean
          last_message_preview?: string | null
          message_count?: number | null
          mode?: string
          summary?: string | null
          summary_updated_at?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_usage: {
        Row: {
          date: string
          messages_count: number
          user_id: string
        }
        Insert: {
          date: string
          messages_count?: number
          user_id: string
        }
        Update: {
          date?: string
          messages_count?: number
          user_id?: string
        }
        Relationships: []
      }
      doc_jobs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          ilove_server: string | null
          ilove_task: string | null
          input: Json
          result_file_id: string | null
          status: string
          tool: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          ilove_server?: string | null
          ilove_task?: string | null
          input: Json
          result_file_id?: string | null
          status?: string
          tool: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          ilove_server?: string | null
          ilove_task?: string | null
          input?: Json
          result_file_id?: string | null
          status?: string
          tool?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doc_jobs_result_file_id_fkey"
            columns: ["result_file_id"]
            isOneToOne: false
            referencedRelation: "user_files"
            referencedColumns: ["id"]
          },
        ]
      }
      global_usage_counters: {
        Row: {
          date: string
          searches_used: number
          vision_used: number
        }
        Insert: {
          date: string
          searches_used?: number
          vision_used?: number
        }
        Update: {
          date?: string
          searches_used?: number
          vision_used?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          daily_limit: number | null
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string
          language: string | null
          last_name: string | null
          last_reset_date: string | null
          messages_today: number | null
          phone: string | null
          plan: string | null
          theme: string | null
          trial_expires_at: string | null
          trial_started_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          daily_limit?: number | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          language?: string | null
          last_name?: string | null
          last_reset_date?: string | null
          messages_today?: number | null
          phone?: string | null
          plan?: string | null
          theme?: string | null
          trial_expires_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          daily_limit?: number | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          language?: string | null
          last_name?: string | null
          last_reset_date?: string | null
          messages_today?: number | null
          phone?: string | null
          plan?: string | null
          theme?: string | null
          trial_expires_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      space_invites: {
        Row: {
          code: string
          created_at: string | null
          created_by: string
          id: string
          revoked: boolean | null
          space_id: string
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by: string
          id?: string
          revoked?: boolean | null
          space_id: string
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string
          id?: string
          revoked?: boolean | null
          space_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_invites_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      space_join_requests: {
        Row: {
          created_at: string | null
          id: string
          invite_code: string
          note: string | null
          requester_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          space_id: string
          status: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          invite_code: string
          note?: string | null
          requester_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          space_id: string
          status?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          invite_code?: string
          note?: string | null
          requester_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          space_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_join_requests_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      space_members: {
        Row: {
          id: string
          joined_at: string | null
          role: string
          space_id: string
          status: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          role?: string
          space_id: string
          status?: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          role?: string
          space_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_members_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      space_messages: {
        Row: {
          content: string | null
          created_at: string | null
          file_id: string | null
          id: string
          kind: string
          sender_id: string
          space_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          file_id?: string | null
          id?: string
          kind?: string
          sender_id: string
          space_id: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          file_id?: string | null
          id?: string
          kind?: string
          sender_id?: string
          space_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_messages_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      spaces: {
        Row: {
          created_at: string | null
          goal: string | null
          id: string
          name: string
          owner_id: string
          template: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          goal?: string | null
          id?: string
          name: string
          owner_id: string
          template?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          goal?: string | null
          id?: string
          name?: string
          owner_id?: string
          template?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      usage_counters: {
        Row: {
          date: string
          files_used: number
          messages_used: number
          searches_used: number
          user_id: string
          vision_used: number
        }
        Insert: {
          date: string
          files_used?: number
          messages_used?: number
          searches_used?: number
          user_id: string
          vision_used?: number
        }
        Update: {
          date?: string
          files_used?: number
          messages_used?: number
          searches_used?: number
          user_id?: string
          vision_used?: number
        }
        Relationships: []
      }
      user_entitlements: {
        Row: {
          created_at: string
          expires_at: string | null
          flags: Json
          note: string | null
          plan: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          flags?: Json
          note?: string | null
          plan?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          flags?: Json
          note?: string | null
          plan?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_files: {
        Row: {
          bucket: string
          created_at: string
          error_message: string | null
          id: string
          meta: Json
          mime_type: string
          path: string
          size_bytes: number | null
          source: string
          status: string
          title: string
          tool: string
          user_id: string
        }
        Insert: {
          bucket?: string
          created_at?: string
          error_message?: string | null
          id?: string
          meta?: Json
          mime_type?: string
          path: string
          size_bytes?: number | null
          source?: string
          status?: string
          title: string
          tool: string
          user_id: string
        }
        Update: {
          bucket?: string
          created_at?: string
          error_message?: string | null
          id?: string
          meta?: Json
          mime_type?: string
          path?: string
          size_bytes?: number | null
          source?: string
          status?: string
          title?: string
          tool?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_and_increment_usage:
        | {
            Args: {
              p_is_bypass?: boolean
              p_user_id: string
              p_wants_file?: boolean
              p_wants_search?: boolean
              p_wants_vision?: boolean
            }
            Returns: Json
          }
        | {
            Args: { p_date: string; p_limit: number; p_user_id: string }
            Returns: Json
          }
      get_effective_entitlement: { Args: { p_user_id: string }; Returns: Json }
      get_or_create_trial: {
        Args: { p_trial_days?: number; p_user_id: string }
        Returns: Json
      }
      get_trial_status: { Args: { p_user_id: string }; Returns: Json }
      increment_daily_usage: {
        Args: { p_today: string; p_user_id: string }
        Returns: Json
      }
      is_space_admin: { Args: { _space_id: string }; Returns: boolean }
      is_space_member: { Args: { _space_id: string }; Returns: boolean }
      normalize_preview: {
        Args: { content: string; max_length?: number }
        Returns: string
      }
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
