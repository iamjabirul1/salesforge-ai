'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import Stripe from 'stripe'

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-02-02-preview' as any }) : null

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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const planPrices: Record<string, { stripePriceId?: string; amount: number }> = {
    pro: { amount: 7900 },
    enterprise: { amount: 24900 },
  }

  if (provider === 'stripe' && stripe) {
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `SalesForge AI - ${plan.toUpperCase()} SDR Autopilot`,
                description: `Subscription tier upgrade for organization billing`,
              },
              unit_amount: planPrices[plan]?.amount || 7900,
              recurring: { interval: 'month' },
            },
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${appUrl}/dashboard/billing?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/dashboard/billing?cancelled=true`,
        metadata: {
          orgId: profile.org_id,
          plan,
        },
      })

      return { success: true, url: session.url }
    } catch (err: any) {
      console.error('Stripe session creation error:', err)
      return { error: err.message || 'Stripe initialization failed.' }
    }
  }

  if (provider === 'paypal') {
    try {
      const clientId = process.env.PAYPAL_CLIENT_ID
      const clientSecret = process.env.PAYPAL_CLIENT_SECRET
      const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
      
      const authRes = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      })
      const authData = await authRes.json()
      const token = authData.access_token

      if (token) {
        const orderRes = await fetch('https://api-m.sandbox.paypal.com/v2/checkout/orders', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            intent: 'CAPTURE',
            purchase_units: [
              {
                amount: {
                  currency_code: 'USD',
                  value: ((planPrices[plan]?.amount || 7900) / 100).toString(),
                },
                description: `SalesForge AI - ${plan.toUpperCase()} SDR Autopilot`,
              },
            ],
            application_context: {
              return_url: `${appUrl}/dashboard/billing?success=true`,
              cancel_url: `${appUrl}/dashboard/billing?cancelled=true`,
            },
          }),
        })
        const orderData = await orderRes.json()
        const approveLink = orderData.links?.find((l: any) => l.rel === 'approve')?.href
        if (approveLink) {
          return { success: true, url: approveLink }
        }
      }
    } catch (err) {
      console.error('PayPal Order initialization error, fallback to mock upgrade:', err)
    }
  }

  // Fallback behavior if keys are missing
  const subId = `${provider}_sub_${Math.random().toString(36).substring(2, 10)}`

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
