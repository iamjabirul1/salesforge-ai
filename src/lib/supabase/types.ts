export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          settings: Json
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          settings?: Json
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          settings?: Json
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          org_id: string | null
          full_name: string | null
          email: string
          avatar_url: string | null
          role: string
          created_at: string
        }
        Insert: {
          id: string
          org_id?: string | null
          full_name?: string | null
          email: string
          avatar_url?: string | null
          role?: string
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string | null
          full_name?: string | null
          email?: string
          avatar_url?: string | null
          role?: string
          created_at?: string
        }
      }
      companies: {
        Row: {
          id: string
          org_id: string
          name: string
          domain: string | null
          industry: string | null
          size_range: string | null
          revenue_range: string | null
          location: string | null
          description: string | null
          technologies: string[]
          enrichment_data: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          name: string
          domain?: string | null
          industry?: string | null
          size_range?: string | null
          revenue_range?: string | null
          location?: string | null
          description?: string | null
          technologies?: string[]
          enrichment_data?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          name?: string
          domain?: string | null
          industry?: string | null
          size_range?: string | null
          revenue_range?: string | null
          location?: string | null
          description?: string | null
          technologies?: string[]
          enrichment_data?: Json
          created_at?: string
          updated_at?: string
        }
      }
      contacts: {
        Row: {
          id: string
          org_id: string
          first_name: string | null
          last_name: string | null
          email: string
          phone: string | null
          company_name: string | null
          company_id: string | null
          job_title: string | null
          linkedin_url: string | null
          website: string | null
          industry: string | null
          company_size: string | null
          lead_score: number
          status: 'new' | 'contacted' | 'replied' | 'bounced' | 'do_not_contact'
          source: string | null
          enrichment_data: Json
          tags: string[]
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          first_name?: string | null
          last_name?: string | null
          email: string
          phone?: string | null
          company_name?: string | null
          company_id?: string | null
          job_title?: string | null
          linkedin_url?: string | null
          website?: string | null
          industry?: string | null
          company_size?: string | null
          lead_score?: number
          status?: 'new' | 'contacted' | 'replied' | 'bounced' | 'do_not_contact'
          source?: string | null
          enrichment_data?: Json
          tags?: string[]
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          first_name?: string | null
          last_name?: string | null
          email?: string
          phone?: string | null
          company_name?: string | null
          company_id?: string | null
          job_title?: string | null
          linkedin_url?: string | null
          website?: string | null
          industry?: string | null
          company_size?: string | null
          lead_score?: number
          status?: 'new' | 'contacted' | 'replied' | 'bounced' | 'do_not_contact'
          source?: string | null
          enrichment_data?: Json
          tags?: string[]
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      deals: {
        Row: {
          id: string
          org_id: string
          contact_id: string | null
          company_id: string | null
          title: string
          value: number
          stage: 'discovery' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost'
          probability: number
          expected_close_date: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          contact_id?: string | null
          company_id?: string | null
          title: string
          value?: number
          stage?: 'discovery' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost'
          probability?: number
          expected_close_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          contact_id?: string | null
          company_id?: string | null
          title?: string
          value?: number
          stage?: 'discovery' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost'
          probability?: number
          expected_close_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      campaigns: {
        Row: {
          id: string
          org_id: string
          name: string
          status: 'draft' | 'active' | 'paused' | 'completed'
          target_icp: Json
          sequence_steps: Json
          stats: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          name: string
          status?: 'draft' | 'active' | 'paused' | 'completed'
          target_icp?: Json
          sequence_steps?: Json
          stats?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          name?: string
          status?: 'draft' | 'active' | 'paused' | 'completed'
          target_icp?: Json
          sequence_steps?: Json
          stats?: Json
          created_at?: string
          updated_at?: string
        }
      }
      email_templates: {
        Row: {
          id: string
          org_id: string
          name: string
          subject: string
          body: string
          variables: string[]
          category: string | null
          performance_stats: Json
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          name: string
          subject: string
          body: string
          variables?: string[]
          category?: string | null
          performance_stats?: Json
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          name?: string
          subject?: string
          body?: string
          variables?: string[]
          category?: string | null
          performance_stats?: Json
          created_at?: string
        }
      }
      outreach_queue: {
        Row: {
          id: string
          org_id: string
          campaign_id: string | null
          contact_id: string
          channel: 'email' | 'linkedin' | 'whatsapp'
          status: 'pending' | 'approved' | 'rejected' | 'sending' | 'sent' | 'failed'
          subject: string | null
          body: string | null
          scheduled_at: string
          sent_at: string | null
          opened_at: string | null
          clicked_at: string | null
          replied_at: string | null
          requires_approval: boolean
          approved_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          campaign_id?: string | null
          contact_id: string
          channel?: 'email' | 'linkedin' | 'whatsapp'
          status?: 'pending' | 'approved' | 'rejected' | 'sending' | 'sent' | 'failed'
          subject?: string | null
          body?: string | null
          scheduled_at?: string
          sent_at?: string | null
          opened_at?: string | null
          clicked_at?: string | null
          replied_at?: string | null
          requires_approval?: boolean
          approved_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          campaign_id?: string | null
          contact_id?: string
          channel?: 'email' | 'linkedin' | 'whatsapp'
          status?: 'pending' | 'approved' | 'rejected' | 'sending' | 'sent' | 'failed'
          subject?: string | null
          body?: string | null
          scheduled_at?: string
          sent_at?: string | null
          opened_at?: string | null
          clicked_at?: string | null
          replied_at?: string | null
          requires_approval?: boolean
          approved_by?: string | null
          created_at?: string
        }
      }
      activities: {
        Row: {
          id: string
          org_id: string
          contact_id: string | null
          deal_id: string | null
          type: 'email_sent' | 'email_received' | 'email_opened' | 'meeting_scheduled' | 'note_added' | 'deal_stage_changed' | 'proposal_sent' | 'call'
          subject: string
          description: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          contact_id?: string | null
          deal_id?: string | null
          type: 'email_sent' | 'email_received' | 'email_opened' | 'meeting_scheduled' | 'note_added' | 'deal_stage_changed' | 'proposal_sent' | 'call'
          subject: string
          description?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          contact_id?: string | null
          deal_id?: string | null
          type?: 'email_sent' | 'email_received' | 'email_opened' | 'meeting_scheduled' | 'note_added' | 'deal_stage_changed' | 'proposal_sent' | 'call'
          subject?: string
          description?: string | null
          metadata?: Json
          created_at?: string
        }
      }
      agent_runs: {
        Row: {
          id: string
          org_id: string
          agent_type: 'ceo' | 'research' | 'email_writer' | 'follow_up'
          goal: Json
          status: 'running' | 'completed' | 'failed' | 'waiting_approval'
          state: Json
          result: Json
          parent_run_id: string | null
          tokens_used: number
          cost_usd: number
          error: string | null
          started_at: string
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          agent_type: 'ceo' | 'research' | 'email_writer' | 'follow_up'
          goal: Json
          status?: 'running' | 'completed' | 'failed' | 'waiting_approval'
          state?: Json
          result?: Json
          parent_run_id?: string | null
          tokens_used?: number
          cost_usd?: number
          error?: string | null
          started_at?: string
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          agent_type?: 'ceo' | 'research' | 'email_writer' | 'follow_up'
          goal?: Json
          status?: 'running' | 'completed' | 'failed' | 'waiting_approval'
          state?: Json
          result?: Json
          parent_run_id?: string | null
          tokens_used?: number
          cost_usd?: number
          error?: string | null
          started_at?: string
          completed_at?: string | null
          created_at?: string
        }
      }
      approval_queue: {
        Row: {
          id: string
          org_id: string
          agent_run_id: string | null
          action_type: string
          context: Json
          status: 'pending' | 'approved' | 'rejected'
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          agent_run_id?: string | null
          action_type: string
          context?: Json
          status?: 'pending' | 'approved' | 'rejected'
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          agent_run_id?: string | null
          action_type?: string
          context?: Json
          status?: 'pending' | 'approved' | 'rejected'
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
      }
      icp_definitions: {
        Row: {
          id: string
          org_id: string
          name: string
          criteria: Json
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          name: string
          criteria?: Json
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          name?: string
          criteria?: Json
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      knowledge_base: {
        Row: {
          id: string
          org_id: string
          category: string
          question: string
          answer: string
          tags: string[]
          usage_count: number
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          category: string
          question: string
          answer: string
          tags?: string[]
          usage_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          category?: string
          question?: string
          answer?: string
          tags?: string[]
          usage_count?: number
          created_at?: string
        }
      }
      user_settings: {
        Row: {
          id: string
          user_id: string
          org_id: string | null
          openrouter_api_key_encrypted: string | null
          apollo_api_key_encrypted: string | null
          resend_api_key: string | null
          default_model: string
          email_sending_domain: string | null
          daily_email_limit: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          org_id?: string | null
          openrouter_api_key_encrypted?: string | null
          apollo_api_key_encrypted?: string | null
          resend_api_key?: string | null
          default_model?: string
          email_sending_domain?: string | null
          daily_email_limit?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          org_id?: string | null
          openrouter_api_key_encrypted?: string | null
          apollo_api_key_encrypted?: string | null
          resend_api_key?: string | null
          default_model?: string
          email_sending_domain?: string | null
          daily_email_limit?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      contact_status: 'new' | 'contacted' | 'replied' | 'bounced' | 'do_not_contact'
      deal_stage: 'discovery' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost'
      activity_type: 'email_sent' | 'email_received' | 'email_opened' | 'meeting_scheduled' | 'note_added' | 'deal_stage_changed' | 'proposal_sent' | 'call'
      campaign_status: 'draft' | 'active' | 'paused' | 'completed'
      outreach_channel: 'email' | 'linkedin' | 'whatsapp'
      outreach_status: 'pending' | 'approved' | 'rejected' | 'sending' | 'sent' | 'failed'
      agent_type: 'ceo' | 'research' | 'email_writer' | 'follow_up'
      agent_run_status: 'running' | 'completed' | 'failed' | 'waiting_approval'
      approval_status: 'pending' | 'approved' | 'rejected'
    }
  }
}
