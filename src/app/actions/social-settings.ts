'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveSocialSettingsAction(credentials: {
  rapidapiKey?: string
  linkedinUrl?: string
  xUrl?: string
  facebookUrl?: string
}) {
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

  if (!profile?.org_id) return { error: 'Organization not found' }

  // Fetch existing org settings
  const { data: org } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', profile.org_id)
    .single()

  const existingSettings = org?.settings || {}

  // Update org settings
  const { error } = await supabase
    .from('organizations')
    .update({
      settings: {
        ...existingSettings,
        social_rapidapi_key: credentials.rapidapiKey || null,
        social_linkedin_url: credentials.linkedinUrl || null,
        social_x_url: credentials.xUrl || null,
        social_facebook_url: credentials.facebookUrl || null,
      },
    })
    .eq('id', profile.org_id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/settings')
  return { success: true }
}

export async function getSocialSettingsAction() {
  const supabase = (await createClient()) as any

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) return { error: 'Organization not found' }

  const { data: org } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', profile.org_id)
    .single()

  const settings = org?.settings || {}

  return {
    rapidapiKey: settings.social_rapidapi_key || '',
    linkedinUrl: settings.social_linkedin_url || '',
    xUrl: settings.social_x_url || '',
    facebookUrl: settings.social_facebook_url || '',
  }
}
