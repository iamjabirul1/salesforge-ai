-- Enable pgcrypto for uuid generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE contact_status AS ENUM ('new', 'contacted', 'replied', 'bounced', 'do_not_contact');
CREATE TYPE deal_stage AS ENUM ('discovery', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost');
CREATE TYPE activity_type AS ENUM ('email_sent', 'email_received', 'email_opened', 'meeting_scheduled', 'note_added', 'deal_stage_changed', 'proposal_sent', 'call');
CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'paused', 'completed');
CREATE TYPE outreach_channel AS ENUM ('email', 'linkedin', 'whatsapp');
CREATE TYPE outreach_status AS ENUM ('pending', 'approved', 'rejected', 'sending', 'sent', 'failed');
CREATE TYPE agent_type AS ENUM ('ceo', 'research', 'email_writer', 'follow_up');
CREATE TYPE agent_run_status AS ENUM ('running', 'completed', 'failed', 'waiting_approval');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');

-- 1. Organizations
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Profiles (users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY, -- references auth.users.id
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  full_name TEXT,
  email TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Companies
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  domain TEXT,
  industry TEXT,
  size_range TEXT,
  revenue_range TEXT,
  location TEXT,
  description TEXT,
  technologies TEXT[] DEFAULT '{}'::text[],
  enrichment_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Contacts (leads/prospects)
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  company_name TEXT,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  job_title TEXT,
  linkedin_url TEXT,
  website TEXT,
  industry TEXT,
  company_size TEXT,
  lead_score INT DEFAULT 0,
  status contact_status DEFAULT 'new',
  source TEXT,
  enrichment_data JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT '{}'::text[],
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Deals
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  value DECIMAL(12, 2) DEFAULT 0.00,
  stage deal_stage NOT NULL DEFAULT 'discovery',
  probability INT DEFAULT 10,
  expected_close_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Campaigns
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status campaign_status DEFAULT 'draft',
  target_icp JSONB DEFAULT '{}'::jsonb,
  sequence_steps JSONB DEFAULT '[]'::jsonb,
  stats JSONB DEFAULT '{"sent":0,"opened":0,"clicked":0,"replied":0,"bounced":0}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Email Templates
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}'::text[],
  category TEXT,
  performance_stats JSONB DEFAULT '{"sent":0,"opened":0,"clicked":0,"replied":0}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Outreach Queue (emails pending send or approval)
CREATE TABLE outreach_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  channel outreach_channel DEFAULT 'email',
  status outreach_status DEFAULT 'pending',
  subject TEXT,
  body TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  requires_approval BOOLEAN DEFAULT TRUE,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Activities (CRM timeline)
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  type activity_type NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Agent Runs (state machine for AI orchestration)
CREATE TABLE agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_type agent_type NOT NULL,
  goal JSONB NOT NULL,
  status agent_run_status DEFAULT 'running',
  state JSONB DEFAULT '{}'::jsonb,
  result JSONB DEFAULT '{}'::jsonb,
  parent_run_id UUID REFERENCES agent_runs(id),
  tokens_used INT DEFAULT 0,
  cost_usd DECIMAL(10, 4) DEFAULT 0.0000,
  error TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Approval Queue (human-in-the-loop)
CREATE TABLE approval_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_run_id UUID REFERENCES agent_runs(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- e.g. 'send_email', 'approve_proposal'
  context JSONB DEFAULT '{}'::jsonb, -- contains references like email_id, proposal details
  status approval_status DEFAULT 'pending',
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. ICP Definitions
CREATE TABLE icp_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Knowledge Base (for objection handling and QA)
CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}'::text[],
  usage_count INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. User Settings
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- references auth.users.id
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  openrouter_api_key_encrypted TEXT,
  apollo_api_key_encrypted TEXT,
  resend_api_key TEXT,
  default_model TEXT DEFAULT 'google/gemini-2.5-flash',
  email_sending_domain TEXT,
  daily_email_limit INT DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

-- Trigger function for updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Set triggers
CREATE TRIGGER set_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_deals_updated_at BEFORE UPDATE ON deals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_icp_definitions_updated_at BEFORE UPDATE ON icp_definitions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE icp_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies
-- Organizations: A profile can read their own organization
CREATE POLICY org_select_policy ON organizations 
  FOR SELECT USING (id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- Profiles: A user can read their own profile and profiles in their organization
CREATE POLICY profile_policy ON profiles 
  FOR ALL USING (id = auth.uid() OR org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- For other tables, restrict to rows belonging to the user's org_id
CREATE POLICY company_policy ON companies FOR ALL USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY contact_policy ON contacts FOR ALL USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY deal_policy ON deals FOR ALL USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY campaign_policy ON campaigns FOR ALL USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY email_template_policy ON email_templates FOR ALL USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY outreach_queue_policy ON outreach_queue FOR ALL USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY activity_policy ON activities FOR ALL USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY agent_run_policy ON agent_runs FOR ALL USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY approval_queue_policy ON approval_queue FOR ALL USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY icp_definition_policy ON icp_definitions FOR ALL USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY knowledge_base_policy ON knowledge_base FOR ALL USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY user_settings_policy ON user_settings FOR ALL USING (user_id = auth.uid());
