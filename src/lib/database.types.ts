export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          id: string
          note: string | null
          session_id: string
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          id?: string
          note?: string | null
          session_id: string
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          id?: string
          note?: string | null
          session_id?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      ensemble_weekdays: {
        Row: {
          ensemble_id: string
          weekday: number
        }
        Insert: {
          ensemble_id: string
          weekday: number
        }
        Update: {
          ensemble_id?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "ensemble_weekdays_ensemble_id_fkey"
            columns: ["ensemble_id"]
            isOneToOne: false
            referencedRelation: "ensembles"
            referencedColumns: ["id"]
          },
        ]
      }
      ensembles: {
        Row: {
          color: string
          created_at: string
          duration_minutes: number
          id: string
          location: string | null
          name: string
          season_end: string | null
          season_start: string | null
          sort_order: number
          start_time: string
        }
        Insert: {
          color?: string
          created_at?: string
          duration_minutes: number
          id?: string
          location?: string | null
          name: string
          season_end?: string | null
          season_start?: string | null
          sort_order?: number
          start_time: string
        }
        Update: {
          color?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          location?: string | null
          name?: string
          season_end?: string | null
          season_start?: string | null
          sort_order?: number
          start_time?: string
        }
        Relationships: []
      }
      session_ensembles: {
        Row: {
          ensemble_id: string
          session_date: string
          session_id: string
          session_kind: Database["public"]["Enums"]["session_kind"]
        }
        Insert: {
          ensemble_id: string
          session_date: string
          session_id: string
          session_kind: Database["public"]["Enums"]["session_kind"]
        }
        Update: {
          ensemble_id?: string
          session_date?: string
          session_id?: string
          session_kind?: Database["public"]["Enums"]["session_kind"]
        }
        Relationships: [
          {
            foreignKeyName: "session_ensembles_ensemble_id_fkey"
            columns: ["ensemble_id"]
            isOneToOne: false
            referencedRelation: "ensembles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_ensembles_session_id_session_date_session_kind_fkey"
            columns: ["session_id", "session_date", "session_kind"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id", "date", "kind"]
          },
        ]
      }
      sessions: {
        Row: {
          cancel_note: string | null
          cancel_reason: Database["public"]["Enums"]["cancel_reason"] | null
          created_at: string
          date: string
          id: string
          kind: Database["public"]["Enums"]["session_kind"]
          rehearsal_note: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["session_status"]
          title: string | null
        }
        Insert: {
          cancel_note?: string | null
          cancel_reason?: Database["public"]["Enums"]["cancel_reason"] | null
          created_at?: string
          date: string
          id?: string
          kind: Database["public"]["Enums"]["session_kind"]
          rehearsal_note?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          title?: string | null
        }
        Update: {
          cancel_note?: string | null
          cancel_reason?: Database["public"]["Enums"]["cancel_reason"] | null
          created_at?: string
          date?: string
          id?: string
          kind?: Database["public"]["Enums"]["session_kind"]
          rehearsal_note?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          title?: string | null
        }
        Relationships: []
      }
      share_links: {
        Row: {
          created_at: string
          ensemble_id: string | null
          id: string
          label: string | null
          revoked: boolean
          scope: Database["public"]["Enums"]["share_scope"]
          token: string
        }
        Insert: {
          created_at?: string
          ensemble_id?: string | null
          id?: string
          label?: string | null
          revoked?: boolean
          scope: Database["public"]["Enums"]["share_scope"]
          token?: string
        }
        Update: {
          created_at?: string
          ensemble_id?: string | null
          id?: string
          label?: string | null
          revoked?: boolean
          scope?: Database["public"]["Enums"]["share_scope"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_links_ensemble_id_fkey"
            columns: ["ensemble_id"]
            isOneToOne: false
            referencedRelation: "ensembles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_ensembles: {
        Row: {
          ensemble_id: string
          joined_on: string
          student_id: string
          terminated_on: string | null
        }
        Insert: {
          ensemble_id: string
          joined_on: string
          student_id: string
          terminated_on?: string | null
        }
        Update: {
          ensemble_id?: string
          joined_on?: string
          student_id?: string
          terminated_on?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_ensembles_ensemble_id_fkey"
            columns: ["ensemble_id"]
            isOneToOne: false
            referencedRelation: "ensembles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_ensembles_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          created_at: string
          first_name: string
          grade: string | null
          id: string
          instrument: string | null
          last_name: string
        }
        Insert: {
          created_at?: string
          first_name: string
          grade?: string | null
          id?: string
          instrument?: string | null
          last_name: string
        }
        Update: {
          created_at?: string
          first_name?: string
          grade?: string | null
          id?: string
          instrument?: string | null
          last_name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bulk_create_rehearsals: {
        Args: {
          p_ensemble_id: string
          p_from: string
          p_to: string
          p_weekdays: number[]
        }
        Returns: number
      }
      set_ensemble_weekdays: {
        Args: { p_ensemble_id: string; p_weekdays: number[] }
        Returns: undefined
      }
      create_session: {
        Args: {
          p_date: string
          p_ensemble_ids: string[]
          p_kind: Database["public"]["Enums"]["session_kind"]
          p_start_time: string | null
          p_title: string | null
        }
        Returns: {
          cancel_note: string | null
          cancel_reason: Database["public"]["Enums"]["cancel_reason"] | null
          created_at: string
          date: string
          id: string
          kind: Database["public"]["Enums"]["session_kind"]
          rehearsal_note: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["session_status"]
          title: string | null
        }
      }
      get_or_create_rehearsal: {
        Args: { p_date: string; p_ensemble_id: string }
        Returns: {
          cancel_note: string | null
          cancel_reason: Database["public"]["Enums"]["cancel_reason"] | null
          created_at: string
          date: string
          id: string
          kind: Database["public"]["Enums"]["session_kind"]
          rehearsal_note: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["session_status"]
          title: string | null
        }
      }
      import_students: {
        Args: { p_ensemble_id: string; p_joined_on: string; p_rows: Json }
        Returns: Json
      }
      session_roster: {
        Args: { p_session_id: string }
        Returns: {
          created_at: string
          first_name: string
          grade: string | null
          id: string
          instrument: string | null
          last_name: string
        }[]
      }
      set_session_ensembles: {
        Args: { p_ensemble_ids: string[]; p_session_id: string }
        Returns: undefined
      }
    }
    Enums: {
      attendance_status: "present" | "absent" | "late" | "excused"
      cancel_reason: "holiday" | "sickness" | "other"
      session_kind:
        | "rehearsal"
        | "special_rehearsal"
        | "field_trip"
        | "exam"
        | "concert"
        | "other"
      session_status: "scheduled" | "held" | "canceled"
      share_scope: "all" | "single_ensemble"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals["public"]

export type Tables<
  T extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]),
> = (DefaultSchema["Tables"] & DefaultSchema["Views"])[T] extends { Row: infer R } ? R : never

export type TablesInsert<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T] extends { Insert: infer I } ? I : never

export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T] extends { Update: infer U } ? U : never

export type Enums<T extends keyof DefaultSchema["Enums"]> = DefaultSchema["Enums"][T]

export const Constants = {
  public: {
    Enums: {
      attendance_status: ["present", "absent", "late", "excused"],
      cancel_reason: ["holiday", "sickness", "other"],
      session_kind: [
        "rehearsal",
        "special_rehearsal",
        "field_trip",
        "exam",
        "concert",
        "other",
      ],
      session_status: ["held", "canceled"],
      share_scope: ["all", "single_ensemble"],
    },
  },
} as const
