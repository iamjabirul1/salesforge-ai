'use server'

import { createClient } from '@/lib/supabase/server'

export async function updateDealStageAction(
  dealId: string,
  newStage: 'discovery' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost'
) {
  const supabase = (await createClient()) as any

  // 1. Fetch current deal to get original stage
  const { data: deal, error: dealError } = await supabase
    .from('deals')
    .select('*, contacts(*)')
    .eq('id', dealId)
    .single()

  if (dealError || !deal) {
    return { error: 'Deal not found' }
  }

  // 2. Update deal stage
  const { error: updateError } = await supabase
    .from('deals')
    .update({ stage: newStage })
    .eq('id', dealId)

  if (updateError) {
    return { error: updateError.message }
  }

  // 3. Log activity in CRM timeline
  const companyName = deal.contacts?.company_name || 'Prospect'
  await supabase.from('activities').insert({
    org_id: deal.org_id,
    contact_id: deal.contact_id,
    deal_id: dealId,
    type: 'deal_stage_changed',
    subject: `Deal Stage Updated`,
    description: `Deal "${deal.title}" moved from ${deal.stage} to ${newStage}.`,
    metadata: { previous_stage: deal.stage, new_stage: newStage },
  })

  return { success: true }
}

export async function addDealAction(
  contactId: string,
  title: string,
  value: number,
  stage: 'discovery' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost'
) {
  const supabase = (await createClient()) as any

  // Fetch contact to get org_id and company_id
  const { data: contact, error: contactError } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .single()

  if (contactError || !contact) {
    return { error: 'Contact not found' }
  }

  const { data: newDeal, error: dealError } = await supabase
    .from('deals')
    .insert({
      org_id: contact.org_id,
      contact_id: contactId,
      company_id: contact.company_id,
      title,
      value,
      stage,
      probability: stage === 'discovery' ? 10 : stage === 'qualification' ? 25 : stage === 'proposal' ? 50 : stage === 'negotiation' ? 75 : stage === 'closed_won' ? 100 : 0,
    })
    .select('id')
    .single()

  if (dealError || !newDeal) {
    return { error: dealError?.message || 'Failed to create deal' }
  }

  // Log activity
  await supabase.from('activities').insert({
    org_id: contact.org_id,
    contact_id: contactId,
    deal_id: newDeal.id,
    type: 'deal_stage_changed',
    subject: `Deal Created`,
    description: `New deal "${title}" created at stage ${stage} with value $${value.toLocaleString()}.`,
  })

  return { success: true }
}
