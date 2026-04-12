/**
 * Tipos públicos de Supabase alineados con Prisma (User, Bot, Contract).
 * Cuando ejecutes `supabase gen types`, sustituye este archivo por la salida oficial
 * o fusiona los tipos para mantener Row/Insert/Update exactos al esquema real.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

/** Alineado con `public.internal_api_key_scope` en Postgres (migración universal). */
type PublicSchemaEnums = {
  internal_api_key_scope: 'READ_ONLY' | 'FULL_ACCESS'
}

export type Database = {
  public: {
    Tables: {
      User: {
        Row: {
          id: string
          email: string
          name: string
          role: string
          tier: string
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          role?: string
          tier?: string
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: string
          tier?: string
          createdAt?: string
          updatedAt?: string
        }
        Relationships: []
      }
      InternalApiKey: {
        Row: {
          id: string
          name: string
          apiKey: string
          scope: PublicSchemaEnums['internal_api_key_scope']
          targetAppOrEngine: string
          ownerId: string
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          name: string
          apiKey: string
          scope?: PublicSchemaEnums['internal_api_key_scope']
          targetAppOrEngine: string
          ownerId: string
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          name?: string
          apiKey?: string
          scope?: PublicSchemaEnums['internal_api_key_scope']
          targetAppOrEngine?: string
          ownerId?: string
          createdAt?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: 'InternalApiKey_ownerId_fkey'
            columns: ['ownerId']
            isOneToOne: false
            referencedRelation: 'User'
            referencedColumns: ['id']
          },
        ]
      }
      Bot: {
        Row: {
          id: string
          name: string
          status: string
          modelId: string
          avatarUrl: string | null
          mainApp: string
          sourceApp: string | null
          subApp: string | null
          metadata: Json | null
          ownerId: string
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          name: string
          status: string
          modelId: string
          avatarUrl?: string | null
          mainApp?: string
          sourceApp?: string | null
          subApp?: string | null
          metadata?: Json | null
          ownerId: string
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          name?: string
          status?: string
          modelId?: string
          avatarUrl?: string | null
          mainApp?: string
          sourceApp?: string | null
          subApp?: string | null
          metadata?: Json | null
          ownerId?: string
          createdAt?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: 'Bot_ownerId_fkey'
            columns: ['ownerId']
            isOneToOne: false
            referencedRelation: 'User'
            referencedColumns: ['id']
          },
        ]
      }
      Contract: {
        Row: {
          id: string
          title: string
          status: string
          mainApp: string
          subApp: string | null
          metadata: Json | null
          ownerId: string
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          title: string
          status: string
          mainApp?: string
          subApp?: string | null
          metadata?: Json | null
          ownerId: string
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          title?: string
          status?: string
          mainApp?: string
          subApp?: string | null
          metadata?: Json | null
          ownerId?: string
          createdAt?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: 'Contract_ownerId_fkey'
            columns: ['ownerId']
            isOneToOne: false
            referencedRelation: 'User'
            referencedColumns: ['id']
          },
        ]
      }
      Document: {
        Row: {
          id: string
          name: string
          fileUrl: string
          fileType: string
          size: number
          bucketPath: string
          mainApp: string
          subApp: string | null
          metadata: Json | null
          ownerId: string
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          name: string
          fileUrl: string
          fileType: string
          size: number
          bucketPath: string
          mainApp: string
          subApp?: string | null
          metadata?: Json | null
          ownerId: string
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          name?: string
          fileUrl?: string
          fileType?: string
          size?: number
          bucketPath?: string
          mainApp?: string
          subApp?: string | null
          metadata?: Json | null
          ownerId?: string
          createdAt?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: 'Document_ownerId_fkey'
            columns: ['ownerId']
            isOneToOne: false
            referencedRelation: 'User'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: PublicSchemaEnums
    CompositeTypes: Record<string, never>
  }
}
