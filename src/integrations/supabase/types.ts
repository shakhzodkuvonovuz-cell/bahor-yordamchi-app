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
      agent_files: {
        Row: {
          created_at: string
          extracted_text: string | null
          extraction_status: string
          filename: string
          id: string
          mime_type: string | null
          run_id: string | null
          size_bytes: number | null
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          extracted_text?: string | null
          extraction_status?: string
          filename: string
          id?: string
          mime_type?: string | null
          run_id?: string | null
          size_bytes?: number | null
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          extracted_text?: string | null
          extraction_status?: string
          filename?: string
          id?: string
          mime_type?: string | null
          run_id?: string | null
          size_bytes?: number | null
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_files_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_pinned: boolean | null
          metadata: Json | null
          role: string
          thread_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          metadata?: Json | null
          role: string
          thread_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          metadata?: Json | null
          role?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "agent_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_runs: {
        Row: {
          constraints_json: Json | null
          created_at: string
          final_output: string | null
          goal: string
          id: string
          plan: Json | null
          sources: Json | null
          status: string
          thread_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          constraints_json?: Json | null
          created_at?: string
          final_output?: string | null
          goal: string
          id?: string
          plan?: Json | null
          sources?: Json | null
          status?: string
          thread_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          constraints_json?: Json | null
          created_at?: string
          final_output?: string | null
          goal?: string
          id?: string
          plan?: Json | null
          sources?: Json | null
          status?: string
          thread_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "agent_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_steps: {
        Row: {
          created_at: string
          error: string | null
          id: string
          rationale: string | null
          run_id: string
          status: string
          step_index: number
          title: string
          tool_input: Json | null
          tool_name: string | null
          tool_output: Json | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          rationale?: string | null
          run_id: string
          status?: string
          step_index: number
          title: string
          tool_input?: Json | null
          tool_name?: string | null
          tool_output?: Json | null
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          rationale?: string | null
          run_id?: string
          status?: string
          step_index?: number
          title?: string
          tool_input?: Json | null
          tool_name?: string | null
          tool_output?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_steps_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_threads: {
        Row: {
          created_at: string
          id: string
          pinned_context: Json | null
          rolling_summary: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pinned_context?: Json | null
          rolling_summary?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pinned_context?: Json | null
          rolling_summary?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      attachment_text: {
        Row: {
          attachment_id: string
          char_count: number | null
          created_at: string
          error: string | null
          id: string
          status: string
          summary: string | null
          text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attachment_id: string
          char_count?: number | null
          created_at?: string
          error?: string | null
          id?: string
          status?: string
          summary?: string | null
          text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attachment_id?: string
          char_count?: number | null
          created_at?: string
          error?: string | null
          id?: string
          status?: string
          summary?: string | null
          text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachment_text_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: true
            referencedRelation: "chat_attachments"
            referencedColumns: ["id"]
          },
        ]
      }
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
      circle_ai_cards: {
        Row: {
          auto_title: string
          circle_id: string
          content_md: string
          created_at: string
          creator_id: string
          id: string
          meta: Json
          pinned: boolean
          source_last_message_at: string | null
          source_message_count: number
          title: string | null
          type: string
        }
        Insert: {
          auto_title?: string
          circle_id: string
          content_md: string
          created_at?: string
          creator_id: string
          id?: string
          meta?: Json
          pinned?: boolean
          source_last_message_at?: string | null
          source_message_count?: number
          title?: string | null
          type: string
        }
        Update: {
          auto_title?: string
          circle_id?: string
          content_md?: string
          created_at?: string
          creator_id?: string
          id?: string
          meta?: Json
          pinned?: boolean
          source_last_message_at?: string | null
          source_message_count?: number
          title?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_ai_cards_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
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
      image_generations: {
        Row: {
          aspect_ratio: string | null
          created_at: string
          file_path: string
          guidance_scale: number | null
          id: string
          mime_type: string
          negative_prompt_en: string | null
          num_inference_steps: number | null
          prompt_en: string
          prompt_uz: string
          seed: number | null
          status: string
          user_id: string
        }
        Insert: {
          aspect_ratio?: string | null
          created_at?: string
          file_path: string
          guidance_scale?: number | null
          id?: string
          mime_type?: string
          negative_prompt_en?: string | null
          num_inference_steps?: number | null
          prompt_en: string
          prompt_uz: string
          seed?: number | null
          status?: string
          user_id: string
        }
        Update: {
          aspect_ratio?: string | null
          created_at?: string
          file_path?: string
          guidance_scale?: number | null
          id?: string
          mime_type?: string
          negative_prompt_en?: string | null
          num_inference_steps?: number | null
          prompt_en?: string
          prompt_uz?: string
          seed?: number | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      premium_waitlist: {
        Row: {
          contact: string
          created_at: string
          id: string
          name: string | null
          plan: string
        }
        Insert: {
          contact: string
          created_at?: string
          id?: string
          name?: string | null
          plan: string
        }
        Update: {
          contact?: string
          created_at?: string
          id?: string
          name?: string | null
          plan?: string
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
      search_cache: {
        Row: {
          created_at: string
          cx: string
          expires_at: string
          id: string
          locale: string | null
          query_norm: string
          result_json: Json
        }
        Insert: {
          created_at?: string
          cx: string
          expires_at: string
          id?: string
          locale?: string | null
          query_norm: string
          result_json: Json
        }
        Update: {
          created_at?: string
          cx?: string
          expires_at?: string
          id?: string
          locale?: string | null
          query_norm?: string
          result_json?: Json
        }
        Relationships: []
      }
      search_global_burst: {
        Row: {
          count: number
          minute_bucket: string
        }
        Insert: {
          count?: number
          minute_bucket: string
        }
        Update: {
          count?: number
          minute_bucket?: string
        }
        Relationships: []
      }
      search_usage: {
        Row: {
          count: number
          day: string
          user_id: string
        }
        Insert: {
          count?: number
          day?: string
          user_id: string
        }
        Update: {
          count?: number
          day?: string
          user_id?: string
        }
        Relationships: []
      }
      space_files: {
        Row: {
          created_at: string | null
          id: string
          mime_type: string | null
          original_name: string
          pinned: boolean | null
          size_bytes: number | null
          space_id: string
          storage_path: string
          uploader_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          mime_type?: string | null
          original_name: string
          pinned?: boolean | null
          size_bytes?: number | null
          space_id: string
          storage_path: string
          uploader_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          mime_type?: string | null
          original_name?: string
          pinned?: boolean | null
          size_bytes?: number | null
          space_id?: string
          storage_path?: string
          uploader_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_files_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
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
          requester_avatar_url: string | null
          requester_id: string
          requester_name: string | null
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
          requester_avatar_url?: string | null
          requester_id: string
          requester_name?: string | null
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
          requester_avatar_url?: string | null
          requester_id?: string
          requester_name?: string | null
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
      space_message_attachments: {
        Row: {
          bucket: string
          created_at: string | null
          filename: string
          id: string
          message_id: string
          mime_type: string | null
          path: string
          size_bytes: number | null
          space_id: string
          uploader_id: string
        }
        Insert: {
          bucket?: string
          created_at?: string | null
          filename: string
          id?: string
          message_id: string
          mime_type?: string | null
          path: string
          size_bytes?: number | null
          space_id: string
          uploader_id: string
        }
        Update: {
          bucket?: string
          created_at?: string | null
          filename?: string
          id?: string
          message_id?: string
          mime_type?: string | null
          path?: string
          size_bytes?: number | null
          space_id?: string
          uploader_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "space_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_message_attachments_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      space_message_reads: {
        Row: {
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "space_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      space_messages: {
        Row: {
          attachments: Json | null
          client_id: string | null
          content: string | null
          created_at: string | null
          deleted_at: string | null
          edited_at: string | null
          file_id: string | null
          id: string
          reply_to_id: string | null
          sender_id: string
          space_id: string
          type: string
        }
        Insert: {
          attachments?: Json | null
          client_id?: string | null
          content?: string | null
          created_at?: string | null
          deleted_at?: string | null
          edited_at?: string | null
          file_id?: string | null
          id?: string
          reply_to_id?: string | null
          sender_id: string
          space_id: string
          type?: string
        }
        Update: {
          attachments?: Json | null
          client_id?: string | null
          content?: string | null
          created_at?: string | null
          deleted_at?: string | null
          edited_at?: string | null
          file_id?: string | null
          id?: string
          reply_to_id?: string | null
          sender_id?: string
          space_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "space_messages"
            referencedColumns: ["id"]
          },
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
          icon_color: string | null
          icon_emoji: string | null
          id: string
          name: string
          owner_id: string
          template: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          goal?: string | null
          icon_color?: string | null
          icon_emoji?: string | null
          id?: string
          name: string
          owner_id: string
          template?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          goal?: string | null
          icon_color?: string | null
          icon_emoji?: string | null
          id?: string
          name?: string
          owner_id?: string
          template?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tool_decisions: {
        Row: {
          blockers_hit: string[] | null
          confidence: number | null
          created_at: string
          detected_language: string | null
          explicit_command: boolean | null
          id: string
          image_intent: boolean | null
          message_preview: string
          search_intent: boolean | null
          selected_tool: string
          ui_language: string | null
          user_id: string
        }
        Insert: {
          blockers_hit?: string[] | null
          confidence?: number | null
          created_at?: string
          detected_language?: string | null
          explicit_command?: boolean | null
          id?: string
          image_intent?: boolean | null
          message_preview: string
          search_intent?: boolean | null
          selected_tool?: string
          ui_language?: string | null
          user_id: string
        }
        Update: {
          blockers_hit?: string[] | null
          confidence?: number | null
          created_at?: string
          detected_language?: string | null
          explicit_command?: boolean | null
          id?: string
          image_intent?: boolean | null
          message_preview?: string
          search_intent?: boolean | null
          selected_tool?: string
          ui_language?: string | null
          user_id?: string
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
      usage_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          meta: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          meta?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          meta?: Json
          user_id?: string
        }
        Relationships: []
      }
      user_devices: {
        Row: {
          created_at: string
          device_id: string
          device_label: string | null
          id: string
          last_seen_at: string
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          device_label?: string | null
          id?: string
          last_seen_at?: string
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          device_label?: string | null
          id?: string
          last_seen_at?: string
          revoked_at?: string | null
          user_id?: string
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
      profile_display: {
        Row: {
          avatar_url: string | null
          first_name: string | null
          full_name: string | null
          last_name: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          first_name?: string | null
          full_name?: string | null
          last_name?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          first_name?: string | null
          full_name?: string | null
          last_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_and_increment_usage:
        | {
            Args: { p_date: string; p_limit: number; p_user_id: string }
            Returns: Json
          }
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
      cleanup_search_cache: { Args: never; Returns: number }
      get_effective_entitlement: { Args: { p_user_id: string }; Returns: Json }
      get_or_create_trial: {
        Args: { p_trial_days?: number; p_user_id: string }
        Returns: Json
      }
      get_space_by_invite_code: { Args: { p_code: string }; Returns: Json }
      get_trial_status: { Args: { p_user_id: string }; Returns: Json }
      get_usage_summary: { Args: { p_date?: string }; Returns: Json }
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
