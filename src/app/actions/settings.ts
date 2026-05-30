'use server'

import { createClient } from '@/lib/supabase/server'

export async function saveSettingsAction(
  openrouterKey: string,
  apolloKey: string,
  resendKey: string,
  sendingDomain: string,
  model: string,
  emailLimit: number
) {
  const supabase = (await createClient()) as any

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  // Check if settings record exists
  const { data: existing } = await supabase
    .from('user_settings')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  const payload = {
    user_id: user.id,
    openrouter_api_key_encrypted: openrouterKey || null,
    apollo_api_key_encrypted: apolloKey || null,
    resend_api_key: resendKey || null,
    email_sending_domain: sendingDomain || null,
    default_model: model || 'google/gemini-2.5-flash',
    daily_email_limit: emailLimit || 50,
  }

  let error
  if (existing) {
    const { error: updateError } = await supabase
      .from('user_settings')
      .update(payload)
      .eq('user_id', user.id)
    error = updateError
  } else {
    const { error: insertError } = await supabase.from('user_settings').insert(payload)
    error = insertError
  }

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function addKbEntryAction(category: string, question: string, answer: string) {
  const supabase = (await createClient()) as any

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  // Fetch org_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) return { error: 'Org ID not found' }

  const { error } = await supabase.from('knowledge_base').insert({
    org_id: profile.org_id,
    category,
    question,
    answer,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function deleteKbEntryAction(id: string) {
  const supabase = (await createClient()) as any

  const { error } = await supabase.from('knowledge_base').delete().eq('id', id)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
