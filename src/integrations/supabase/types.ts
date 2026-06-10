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
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      cms_content: {
        Row: {
          body: string | null
          key: string
          metadata: Json | null
          title: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body?: string | null
          key: string
          metadata?: Json | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body?: string | null
          key?: string
          metadata?: Json | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer: string
          created_at: string
          id: string
          question: string
          sort_order: number
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          question: string
          sort_order?: number
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          question?: string
          sort_order?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          balance_available: number
          balance_pending: number
          bio: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          payout_details: string | null
          payout_method: string | null
          status: Database["public"]["Enums"]["user_status"]
          total_earned: number
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          balance_available?: number
          balance_pending?: number
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          payout_details?: string | null
          payout_method?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          total_earned?: number
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          balance_available?: number
          balance_pending?: number
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          payout_details?: string | null
          payout_method?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          total_earned?: number
          updated_at?: string
        }
        Relationships: []
      }
      task_submissions: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          proof_text: string | null
          proof_url: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          reward_amount: number
          status: Database["public"]["Enums"]["submission_status"]
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          proof_text?: string | null
          proof_url?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          reward_amount?: number
          status?: Database["public"]["Enums"]["submission_status"]
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          proof_text?: string | null
          proof_url?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          reward_amount?: number
          status?: Database["public"]["Enums"]["submission_status"]
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_submissions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          action: Database["public"]["Enums"]["task_action"]
          created_at: string
          created_by: string | null
          description: string
          difficulty: string
          end_at: string | null
          id: string
          per_user_limit: number
          platform: Database["public"]["Enums"]["task_platform"]
          proof_instructions: string | null
          proof_type: Database["public"]["Enums"]["proof_type"]
          reward_amount: number
          start_at: string | null
          status: Database["public"]["Enums"]["task_status"]
          target_url: string | null
          title: string
          total_paid: number
          total_payout_cap: number | null
          updated_at: string
        }
        Insert: {
          action: Database["public"]["Enums"]["task_action"]
          created_at?: string
          created_by?: string | null
          description: string
          difficulty?: string
          end_at?: string | null
          id?: string
          per_user_limit?: number
          platform: Database["public"]["Enums"]["task_platform"]
          proof_instructions?: string | null
          proof_type?: Database["public"]["Enums"]["proof_type"]
          reward_amount: number
          start_at?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          target_url?: string | null
          title: string
          total_paid?: number
          total_payout_cap?: number | null
          updated_at?: string
        }
        Update: {
          action?: Database["public"]["Enums"]["task_action"]
          created_at?: string
          created_by?: string | null
          description?: string
          difficulty?: string
          end_at?: string | null
          id?: string
          per_user_limit?: number
          platform?: Database["public"]["Enums"]["task_platform"]
          proof_instructions?: string | null
          proof_type?: Database["public"]["Enums"]["proof_type"]
          reward_amount?: number
          start_at?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          target_url?: string | null
          title?: string
          total_paid?: number
          total_payout_cap?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          approved: boolean
          author_name: string
          author_role: string | null
          avatar_url: string | null
          content: string
          created_at: string
          id: string
          rating: number | null
          submitted_by: string | null
        }
        Insert: {
          approved?: boolean
          author_name: string
          author_role?: string | null
          avatar_url?: string | null
          content: string
          created_at?: string
          id?: string
          rating?: number | null
          submitted_by?: string | null
        }
        Update: {
          approved?: boolean
          author_name?: string
          author_role?: string | null
          avatar_url?: string | null
          content?: string
          created_at?: string
          id?: string
          rating?: number | null
          submitted_by?: string | null
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
      withdrawals: {
        Row: {
          admin_id: string | null
          amount: number
          details: string | null
          id: string
          method: string
          notes: string | null
          processed_at: string | null
          requested_at: string
          status: Database["public"]["Enums"]["withdrawal_status"]
          user_id: string
        }
        Insert: {
          admin_id?: string | null
          amount: number
          details?: string | null
          id?: string
          method: string
          notes?: string | null
          processed_at?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["withdrawal_status"]
          user_id: string
        }
        Update: {
          admin_id?: string | null
          amount?: number
          details?: string | null
          id?: string
          method?: string
          notes?: string | null
          processed_at?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["withdrawal_status"]
          user_id?: string
        }
        Relationships: []
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
      app_role: "admin" | "moderator" | "user"
      proof_type: "url" | "screenshot" | "text"
      submission_status: "pending" | "approved" | "rejected"
      task_action:
        | "view"
        | "like"
        | "subscribe"
        | "follow"
        | "comment"
        | "share"
      task_platform:
        | "youtube"
        | "instagram"
        | "tiktok"
        | "twitter"
        | "facebook"
        | "telegram"
        | "other"
      task_status: "draft" | "active" | "expired" | "archived"
      user_status: "active" | "suspended"
      withdrawal_status: "pending" | "approved" | "rejected" | "processed"
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
      app_role: ["admin", "moderator", "user"],
      proof_type: ["url", "screenshot", "text"],
      submission_status: ["pending", "approved", "rejected"],
      task_action: ["view", "like", "subscribe", "follow", "comment", "share"],
      task_platform: [
        "youtube",
        "instagram",
        "tiktok",
        "twitter",
        "facebook",
        "telegram",
        "other",
      ],
      task_status: ["draft", "active", "expired", "archived"],
      user_status: ["active", "suspended"],
      withdrawal_status: ["pending", "approved", "rejected", "processed"],
    },
  },
} as const
