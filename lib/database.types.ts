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
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          beat_track_id: string
          created_at: string
          finished_at: string | null
          id: string
          week_start: string
          winner_track_id: string | null
        }
        Insert: {
          beat_track_id: string
          created_at?: string
          finished_at?: string | null
          id?: string
          week_start: string
          winner_track_id?: string | null
        }
        Update: {
          beat_track_id?: string
          created_at?: string
          finished_at?: string | null
          id?: string
          week_start?: string
          winner_track_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenges_beat_track_id_fkey"
            columns: ["beat_track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_winner_track_id_fkey"
            columns: ["winner_track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
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
      editor_picks: {
        Row: {
          created_at: string
          note: string | null
          picked_by: string | null
          track_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          note?: string | null
          picked_by?: string | null
          track_id: string
          week_start: string
        }
        Update: {
          created_at?: string
          note?: string | null
          picked_by?: string | null
          track_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "editor_picks_picked_by_fkey"
            columns: ["picked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "editor_picks_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
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
      interests: {
        Row: {
          answered_at: string | null
          artist_id: string
          created_at: string
          scout_id: string
          source: string
          status: string
        }
        Insert: {
          answered_at?: string | null
          artist_id: string
          created_at?: string
          scout_id: string
          source?: string
          status?: string
        }
        Update: {
          answered_at?: string | null
          artist_id?: string
          created_at?: string
          scout_id?: string
          source?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "interests_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interests_scout_id_fkey"
            columns: ["scout_id"]
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
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          data: Json
          dedupe: string | null
          entity_id: string | null
          id: string
          read_at: string | null
          track_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          data?: Json
          dedupe?: string | null
          entity_id?: string | null
          id?: string
          read_at?: string | null
          track_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          data?: Json
          dedupe?: string | null
          entity_id?: string | null
          id?: string
          read_at?: string | null
          track_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          body: string
          city: number | null
          closed: boolean
          created_at: string
          deadline: string
          genre: string | null
          id: string
          scout_id: string
          seeking: string
          title: string
        }
        Insert: {
          body: string
          city?: number | null
          closed?: boolean
          created_at?: string
          deadline: string
          genre?: string | null
          id?: string
          scout_id: string
          seeking: string
          title: string
        }
        Update: {
          body?: string
          city?: number | null
          closed?: boolean
          created_at?: string
          deadline?: string
          genre?: string | null
          id?: string
          scout_id?: string
          seeking?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_scout_id_fkey"
            columns: ["scout_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_applications: {
        Row: {
          artist_id: string
          created_at: string
          note: string | null
          opportunity_id: string
          status: string
          track_id: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          note?: string | null
          opportunity_id: string
          status?: string
          track_id: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          note?: string | null
          opportunity_id?: string
          status?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_applications_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_applications_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_applications_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
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
      profile_views: {
        Row: {
          day: string
          profile_id: string
          viewer_id: string
        }
        Insert: {
          day: string
          profile_id: string
          viewer_id: string
        }
        Update: {
          day?: string
          profile_id?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_views_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_views_viewer_id_fkey"
            columns: ["viewer_id"]
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
          suspended_at: string | null
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
          suspended_at?: string | null
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
          suspended_at?: string | null
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
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_resolved_by_fkey"
            columns: ["resolved_by"]
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
      scout_alerts: {
        Row: {
          city: number | null
          created_at: string
          genre: string | null
          id: string
          min_week_votes: number
          scout_id: string
        }
        Insert: {
          city?: number | null
          created_at?: string
          genre?: string | null
          id?: string
          min_week_votes?: number
          scout_id: string
        }
        Update: {
          city?: number | null
          created_at?: string
          genre?: string | null
          id?: string
          min_week_votes?: number
          scout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scout_alerts_scout_id_fkey"
            columns: ["scout_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scout_applications: {
        Row: {
          about: string
          contact_email: string
          contact_person: string
          created_at: string
          kind: string
          org_name: string
          reviewed_at: string | null
          status: string
          user_id: string
          website: string | null
        }
        Insert: {
          about: string
          contact_email: string
          contact_person: string
          created_at?: string
          kind: string
          org_name: string
          reviewed_at?: string | null
          status?: string
          user_id: string
          website?: string | null
        }
        Update: {
          about?: string
          contact_email?: string
          contact_person?: string
          created_at?: string
          kind?: string
          org_name?: string
          reviewed_at?: string | null
          status?: string
          user_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scout_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scout_favorites: {
        Row: {
          artist_id: string
          created_at: string
          note: string | null
          scout_id: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          note?: string | null
          scout_id: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          note?: string | null
          scout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scout_favorites_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scout_favorites_scout_id_fkey"
            columns: ["scout_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      swipes: {
        Row: {
          action: string
          created_at: string
          track_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          track_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          track_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "swipes_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swipes_user_id_fkey"
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
          challenge_candidate: boolean
          challenge_id: string | null
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
          challenge_candidate?: boolean
          challenge_id?: string | null
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
          challenge_candidate?: boolean
          challenge_id?: string | null
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
          {
            foreignKeyName: "tracks_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          genres: string[]
          tags: string[]
          user_id: string
        }
        Insert: {
          genres?: string[]
          tags?: string[]
          user_id: string
        }
        Update: {
          genres?: string[]
          tags?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
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
      city_artist_counts: {
        Row: {
          artists: number | null
          city: number | null
        }
        Relationships: []
      }
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
      scout_profiles: {
        Row: {
          kind: string | null
          org_name: string | null
          user_id: string | null
          website: string | null
        }
        Insert: {
          kind?: string | null
          org_name?: string | null
          user_id?: string | null
          website?: string | null
        }
        Update: {
          kind?: string | null
          org_name?: string | null
          user_id?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scout_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      admin_close_opportunity: { Args: { p_opp: string }; Returns: undefined }
      admin_delete_comment: { Args: { p_comment: string }; Returns: undefined }
      alert_matches: {
        Args: never
        Returns: {
          alert_id: string
          artist_id: string
          score: number
          track_id: string
        }[]
      }
      answer_interest: {
        Args: { p_accept: boolean; p_scout: string }
        Returns: undefined
      }
      apply_scout: {
        Args: {
          p_about: string
          p_contact_email: string
          p_contact_person: string
          p_kind: string
          p_org_name: string
          p_website: string
        }
        Returns: undefined
      }
      approve_scout: {
        Args: { p_approve: boolean; p_user: string }
        Returns: undefined
      }
      archive_finished_periods: { Args: never; Returns: number }
      artist_stats: {
        Args: never
        Returns: {
          followers: number
          likes: number
          plays: number
          saves: number
          scout_views_week: number
          votes: number
        }[]
      }
      can_rate: { Args: { p_track: string }; Returns: boolean }
      cast_vote: { Args: { p_track: string }; Returns: boolean }
      challenge_standings: {
        Args: { p_challenge: string }
        Returns: {
          artist_id: string
          last_vote_at: string
          rank: number
          score: number
          track_id: string
        }[]
      }
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
      create_challenge: {
        Args: { p_beat: string; p_week: string }
        Returns: string
      }
      daily_notifications: { Args: never; Returns: undefined }
      discover_feed: {
        Args: {
          p_city?: number
          p_genre?: string
          p_limit?: number
          p_mood?: string
          p_tag?: string
        }
        Returns: {
          score: number
          track_id: string
        }[]
      }
      finish_challenges: { Args: never; Returns: number }
      has_role: { Args: { p_role: string }; Returns: boolean }
      is_active_track: { Args: { p_track: string }; Returns: boolean }
      is_blocked: {
        Args: { p_blocked: string; p_blocker: string }
        Returns: boolean
      }
      is_challenge_beatmaker: {
        Args: { p_artist: string; p_track: string }
        Returns: boolean
      }
      is_open_opportunity: { Args: { p_opp: string }; Returns: boolean }
      my_matches: {
        Args: never
        Returns: {
          artist_id: string
          contact_person: string
          email: string
          matched_at: string
          other_id: string
          scout_id: string
        }[]
      }
      notify: {
        Args: {
          p_actor?: string
          p_data?: Json
          p_dedupe?: string
          p_entity?: string
          p_track?: string
          p_type: string
          p_user: string
        }
        Returns: undefined
      }
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
      record_profile_view: { Args: { p_profile: string }; Returns: undefined }
      require_admin: { Args: never; Returns: undefined }
      resolve_report: {
        Args: { p_report: string; p_status: string }
        Returns: undefined
      }
      review_application: {
        Args: { p_artist: string; p_opp: string; p_status: string }
        Returns: undefined
      }
      scout_search: {
        Args: {
          p_city?: number
          p_genre?: string
          p_min_votes?: number
          p_open_only?: boolean
          p_sort?: string
        }
        Returns: {
          artist_id: string
          total_votes: number
          week_votes: number
        }[]
      }
      search_artists: {
        Args: { p_city?: number; p_q: string }
        Returns: {
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
          suspended_at: string | null
          username: string
        }[]
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      search_pattern: { Args: { p_q: string }; Returns: string }
      search_tracks: {
        Args: { p_city?: number; p_genre?: string; p_q: string; p_tag?: string }
        Returns: {
          artist_id: string
          audio_path: string
          challenge_candidate: boolean
          challenge_id: string | null
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
        }[]
        SetofOptions: {
          from: "*"
          to: "tracks"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      send_interest: { Args: { p_artist: string }; Returns: undefined }
      set_editor_pick: {
        Args: { p_note: string; p_track: string }
        Returns: undefined
      }
      set_track_status: {
        Args: { p_status: string; p_track: string }
        Returns: undefined
      }
      start_play: { Args: { p_track: string }; Returns: undefined }
      suspend_user: {
        Args: { p_on: boolean; p_user: string }
        Returns: undefined
      }
      suspicious_vote_clusters: {
        Args: never
        Returns: {
          ip: string
          users: string[]
          votes: number
        }[]
      }
      tr_today: { Args: never; Returns: string }
      void_votes: { Args: { p_user: string }; Returns: number }
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
