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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      artist_contacts: {
        Row: {
          email: string
          profile_id: string
        }
        Insert: {
          email: string
          profile_id: string
        }
        Update: {
          email?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_contacts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      banned_terms: {
        Row: {
          pattern: string
        }
        Insert: {
          pattern: string
        }
        Update: {
          pattern?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          at_sec: number | null
          author_id: string
          body: string
          created_at: string
          id: string
          track_id: string
        }
        Insert: {
          at_sec?: number | null
          author_id: string
          body: string
          created_at?: string
          id?: string
          track_id: string
        }
        Update: {
          at_sec?: number | null
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      ear_points: {
        Row: {
          awarded_at: string
          period: string
          period_start: string
          points: number
          track_id: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          period: string
          period_start: string
          points: number
          track_id: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          period?: string
          period_start?: string
          points?: number
          track_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ear_points_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ear_points_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          followee_id: string
          follower_id: string
        }
        Insert: {
          created_at?: string
          followee_id: string
          follower_id: string
        }
        Update: {
          created_at?: string
          followee_id?: string
          follower_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_followee_id_fkey"
            columns: ["followee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string
          track_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          track_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          track_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plays: {
        Row: {
          counted_at: string | null
          day: string
          started_at: string
          track_id: string
          user_id: string
        }
        Insert: {
          counted_at?: string | null
          day: string
          started_at?: string
          track_id: string
          user_id: string
        }
        Update: {
          counted_at?: string | null
          day?: string
          started_at?: string
          track_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plays_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plays_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          bio: string | null
          city: number | null
          created_at: string
          display_name: string | null
          featured_track_id: string | null
          genres: string[]
          id: string
          open_to_discovery: boolean
          role: string
          socials: Json
          username: string
        }
        Insert: {
          avatar_path?: string | null
          bio?: string | null
          city?: number | null
          created_at?: string
          display_name?: string | null
          featured_track_id?: string | null
          genres?: string[]
          id: string
          open_to_discovery?: boolean
          role: string
          socials?: Json
          username: string
        }
        Update: {
          avatar_path?: string | null
          bio?: string | null
          city?: number | null
          created_at?: string
          display_name?: string | null
          featured_track_id?: string | null
          genres?: string[]
          id?: string
          open_to_discovery?: boolean
          role?: string
          socials?: Json
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_featured_track_id_fkey"
            columns: ["featured_track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      ranking_snapshots: {
        Row: {
          artist_id: string
          city: number | null
          genre: string
          last_vote_at: string
          period: string
          period_start: string
          rank_all: number
          rank_city: number | null
          rank_genre: number
          score: number
          track_id: string
        }
        Insert: {
          artist_id: string
          city?: number | null
          genre: string
          last_vote_at: string
          period: string
          period_start: string
          rank_all: number
          rank_city?: number | null
          rank_genre: number
          score: number
          track_id: string
        }
        Update: {
          artist_id?: string
          city?: number | null
          genre?: string
          last_vote_at?: string
          period?: string
          period_start?: string
          rank_all?: number
          rank_city?: number | null
          rank_genre?: number
          score?: number
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ranking_snapshots_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ranking_snapshots_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      ratings: {
        Row: {
          created_at: string
          s1: number
          s2: number
          s3: number
          s4: number
          track_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          s1: number
          s2: number
          s3: number
          s4: number
          track_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          s1?: number
          s2?: number
          s3?: number
          s4?: number
          track_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saves: {
        Row: {
          created_at: string
          track_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          track_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          track_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saves_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      track_features: {
        Row: {
          artist_id: string
          track_id: string
        }
        Insert: {
          artist_id: string
          track_id: string
        }
        Update: {
          artist_id?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_features_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_features_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      tracks: {
        Row: {
          artist_id: string
          audio_path: string
          comments_enabled: boolean
          cover_path: string | null
          created_at: string
          description: string | null
          duration_sec: number | null
          genre: string
          hook_sec: number
          id: string
          links: Json
          moods: string[]
          rights_confirmed: boolean
          seeking_vocal: boolean
          status: string
          tags: string[]
          title: string
          waveform: number[] | null
        }
        Insert: {
          artist_id: string
          audio_path: string
          comments_enabled?: boolean
          cover_path?: string | null
          created_at?: string
          description?: string | null
          duration_sec?: number | null
          genre: string
          hook_sec?: number
          id?: string
          links?: Json
          moods?: string[]
          rights_confirmed: boolean
          seeking_vocal?: boolean
          status?: string
          tags?: string[]
          title: string
          waveform?: number[] | null
        }
        Update: {
          artist_id?: string
          audio_path?: string
          comments_enabled?: boolean
          cover_path?: string | null
          created_at?: string
          description?: string | null
          duration_sec?: number | null
          genre?: string
          hook_sec?: number
          id?: string
          links?: Json
          moods?: string[]
          rights_confirmed?: boolean
          seeking_vocal?: boolean
          status?: string
          tags?: string[]
          title?: string
          waveform?: number[] | null
        }
        Relationships: [
          {
            foreignKeyName: "tracks_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      votes: {
        Row: {
          counts: boolean
          created_at: string
          track_id: string
          voter_id: string
          votes_before: number
          week_start: string
        }
        Insert: {
          counts: boolean
          created_at?: string
          track_id: string
          voter_id: string
          votes_before: number
          week_start: string
        }
        Update: {
          counts?: boolean
          created_at?: string
          track_id?: string
          voter_id?: string
          votes_before?: number
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      ear_leaderboard: {
        Row: {
          month_start: string | null
          points: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ear_points_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ranking_live: {
        Row: {
          artist_id: string | null
          city: number | null
          genre: string | null
          last_vote_at: string | null
          period: string | null
          period_start: string | null
          rank_all: number | null
          rank_city: number | null
          rank_genre: number | null
          score: number | null
          track_id: string | null
        }
        Relationships: []
      }
      rising_live: {
        Row: {
          artist_id: string | null
          city: number | null
          genre: string | null
          last_vote_at: string | null
          rank_all: number | null
          rank_city: number | null
          rank_genre: number | null
          score: number | null
          track_id: string | null
        }
        Relationships: []
      }
      track_vote_totals: {
        Row: {
          track_id: string | null
          votes: number | null
        }
        Relationships: [
          {
            foreignKeyName: "votes_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      archive_finished_periods: { Args: never; Returns: number }
      can_rate: { Args: { p_track: string }; Returns: boolean }
      cast_vote: { Args: { p_track: string }; Returns: boolean }
      compute_ranking: {
        Args: { p_period: string; p_start: string }
        Returns: {
          artist_id: string
          city: number
          genre: string
          last_vote_at: string
          rank_all: number
          rank_city: number
          rank_genre: number
          score: number
          track_id: string
        }[]
      }
      count_play: { Args: { p_track: string }; Returns: boolean }
      is_active_track: { Args: { p_track: string }; Returns: boolean }
      period_start: {
        Args: { p_at?: string; p_period: string }
        Returns: string
      }
      ranking: {
        Args: {
          p_city?: number
          p_genre?: string
          p_period: string
          p_start: string
        }
        Returns: {
          archived: boolean
          artist_id: string
          city: number
          genre: string
          last_vote_at: string
          rank: number
          score: number
          track_id: string
        }[]
      }
      rating_summary: {
        Args: { p_track: string }
        Returns: {
          a1: number
          a2: number
          a3: number
          a4: number
          n: number
        }[]
      }
      start_play: { Args: { p_track: string }; Returns: undefined }
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
