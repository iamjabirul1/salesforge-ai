-- Add facebook and x channels to outreach_channel enum if not exists
ALTER TYPE outreach_channel ADD VALUE IF NOT EXISTS 'facebook';
ALTER TYPE outreach_channel ADD VALUE IF NOT EXISTS 'x';
