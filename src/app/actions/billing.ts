'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function upgradePlanAction(plan: 'free' | 'pro' | 'enterprise', provider: 'stripe' | 'paypal') {
  const supabase = (await createClient()) as any

  // 1. Get current user session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  // 2. Fetch user's org_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) {
    return { error: 'Organization not found.' }
  }

  // 3. Simulated network delay for payment verification
  await new Promise((resolve) => setTimeout(resolve, 2000))

  const subId = `${provider}_sub_${Math.random().toString(36).substring(2, 10)}`

  // 4. Update the organization settings with plan detail
  const { error } = await supabase
    .from('organizations')
    .update({
      settings: {
        plan,
        subscription_id: subId,
        payment_provider: provider,
        upgraded_at: new Date().toISOString(),
      },
    })
    .eq('id', profile.org_id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/billing')
  return { success: true, plan, subscriptionId: subId }
}
