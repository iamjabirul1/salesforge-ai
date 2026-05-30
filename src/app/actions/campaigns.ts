'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createCampaignAction(
  name: string,
  targetIcp: object,
  sequenceSteps: object[]
): Promise<{ success?: boolean; campaignId?: string; error?: string }> {
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
  if (!profile?.org_id) return { error: 'No organization' }

  const { data, error } = await supabase.from('campaigns').insert({
    org_id: profile.org_id,
    name,
    status: 'draft',
    target_icp: targetIcp,
    sequence_steps: sequenceSteps,
    stats: { sent: 0, opened: 0, clicked: 0, replied: 0, bounced: 0 },
  }).select('id').single()

  if (error) return { error: error.message }
  revalidatePath('/dashboard/campaigns')
  return { success: true, campaignId: data.id }
}

export async function updateCampaignStatusAction(
  campaignId: string,
  status: 'active' | 'paused' | 'completed'
): Promise<{ success?: boolean; error?: string }> {
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase.from('campaigns').update({ status }).eq('id', campaignId)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/campaigns')
  return { success: true }
}

export async function deleteCampaignAction(campaignId: string): Promise<{ success?: boolean; error?: string }> {
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase.from('campaigns').delete().eq('id', campaignId)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/campaigns')
  return { success: true }
}
