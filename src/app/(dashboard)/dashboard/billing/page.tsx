'use client'

import * as React from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { createClient } from '@/lib/supabase/client'
import { upgradePlanAction } from '@/app/actions/billing'
import { CreditCard, CheckCircle2, ShieldAlert, Sparkles, Loader2, DollarSign } from 'lucide-react'

export default function BillingPage() {
  const { toast } = useToast()
  const [currentPlan, setCurrentPlan] = React.useState<'free' | 'pro' | 'enterprise'>('free')
  const [loading, setLoading] = React.useState(true)
  const [checkoutLoading, setCheckoutLoading] = React.useState<string | null>(null) // holds plan name being purchased
  const supabase = createClient() as any

  const loadBillingInfo = React.useCallback(async () => {
    setLoading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single()

      if (profile?.org_id) {
        const { data: org } = await supabase
          .from('organizations')
          .select('settings')
          .eq('id', profile.org_id)
          .single()

        if (org?.settings && org.settings.plan) {
          setCurrentPlan(org.settings.plan)
        }
      }
    }
    setLoading(false)
  }, [supabase])

  React.useEffect(() => {
    loadBillingInfo()
  }, [loadBillingInfo])

  const handleCheckout = async (plan: 'pro' | 'enterprise', provider: 'stripe' | 'paypal') => {
    setCheckoutLoading(`${plan}_${provider}`)
    
    toast({
      type: 'info',
      description: `Redirecting to secure ${provider === 'stripe' ? 'Stripe Secure' : 'PayPal Express'} portal...`,
    })

    const result = await upgradePlanAction(plan, provider)

    if (result.error) {
      toast({ type: 'error', description: result.error })
    } else if (result.url) {
      // Redirect to the real Stripe or PayPal checkout session
      window.location.href = result.url
    } else {
      toast({
        type: 'success',
        description: `Successfully upgraded to ${plan.toUpperCase()} SDR plan! Payment confirmed.`,
      })
      setCurrentPlan(plan)
    }
    setCheckoutLoading(null)
  }

  const tiers = [
    {
      name: 'free',
      label: 'Starter Free',
      price: '$0',
      period: 'forever',
      description: 'Test autonomous outreach campaigns with core features.',
      features: [
        '50 automated emails per day limit',
        'Basic research & enrichment profiles',
        'Gemini 2.5 Flash model access',
        'Standard pipeline board',
      ],
      cta: 'Current Plan',
      popular: false,
    },
    {
      name: 'pro',
      label: 'Pro SDR Autopilot',
      price: '$79',
      period: 'per month',
      description: 'Fully unlock your autonomous AI outbound engine.',
      features: [
        'Unlimited daily email sending capacity',
        'High Reasoning Llama 3.3 model access',
        'Automatic Apollo.io enrichment',
        'Cal.com scheduling automation',
        'Priority Approvals queue priority',
      ],
      cta: 'Upgrade with',
      popular: true,
    },
    {
      name: 'enterprise',
      label: 'Enterprise Scale',
      price: '$249',
      period: 'per month',
      description: 'For agencies and high-volume sales setups.',
      features: [
        'Custom fine-tuned agent personality',
        'Multi-tenant team workspaces',
        'Dedicated IP sending domains',
        'Custom vector database indexing',
        'VIP response handling support',
      ],
      cta: 'Upgrade with',
      popular: false,
    },
  ]

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
          <CreditCard className="h-8 w-8 text-violet-400" /> Subscription & Plans
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Manage your subscription plans, view billing metrics, and configure checkout secure gateways.
        </p>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
        </div>
      ) : (
        <div className="space-y-12">
          {/* Current Plan Overview Banner */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-950/40 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-violet-600/5 rounded-full blur-[80px] pointer-events-none" />
            <div className="space-y-2 z-10">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">Your Organization Status</span>
                <Badge variant={currentPlan === 'free' ? 'default' : 'success'}>
                  {currentPlan === 'free' ? 'Basic Account' : 'Premium Member'}
                </Badge>
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Current Tier: <span className="text-transparent bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text font-extrabold capitalize">{currentPlan} Plan</span>
              </h2>
              <p className="text-sm text-slate-400">
                {currentPlan === 'free'
                  ? 'Your account is limited to basic SDR models and 50 daily emails. Upgrade to unlock full autopilot.'
                  : 'Your account is fully optimized. You have unlimited outreach campaigns and Cal.com webhooks enabled.'}
              </p>
            </div>
            {currentPlan !== 'free' && (
              <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center gap-3">
                <Sparkles className="h-6 w-6" />
                <div className="text-xs">
                  <p className="font-semibold">PRO AUTOPILOT ENABLED</p>
                  <p className="text-slate-400">Next renewal scheduled on monthly billing interval.</p>
                </div>
              </div>
            )}
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {tiers.map((tier) => {
              const isCurrent = currentPlan === tier.name
              const isPurchase = tier.name !== 'free'
              
              return (
                <Card
                  key={tier.name}
                  className={`border-slate-800/80 bg-slate-950/40 backdrop-blur-md flex flex-col relative transition-all duration-300 hover:scale-[1.01] ${
                    tier.popular ? 'border-violet-500/60 shadow-lg shadow-violet-500/5 ring-1 ring-violet-500/30' : ''
                  }`}
                >
                  {tier.popular && (
                    <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-violet-600 to-cyan-500 text-white text-xxs font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-violet-500/20 shadow">
                      Most Popular
                    </div>
                  )}

                  <CardHeader className="pt-8">
                    <CardTitle className="text-xl capitalize text-white font-bold">{tier.label}</CardTitle>
                    <CardDescription className="text-xs text-slate-400 mt-1">{tier.description}</CardDescription>
                  </CardHeader>

                  <CardContent className="p-6 flex-1 space-y-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-white tracking-tight">{tier.price}</span>
                      <span className="text-xs text-slate-500">/{tier.period}</span>
                    </div>

                    <ul className="space-y-3 text-sm text-slate-300">
                      {tier.features.map((feat, i) => (
                        <li key={i} className="flex gap-2.5 items-start">
                          <CheckCircle2 className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>

                  <CardFooter className="p-6 border-t border-slate-900/60 flex flex-col gap-3">
                    {isCurrent ? (
                      <Button className="w-full" variant="outline" disabled>
                        Active Plan
                      </Button>
                    ) : isPurchase ? (
                      <div className="w-full space-y-2">
                        {/* Stripe button */}
                        <Button
                          className="w-full flex items-center justify-center gap-2"
                          variant="premium"
                          disabled={checkoutLoading !== null}
                          onClick={() => handleCheckout(tier.name as any, 'stripe')}
                        >
                          {checkoutLoading === `${tier.name}_stripe` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CreditCard className="h-4 w-4" /> Upgrade with Stripe
                            </>
                          )}
                        </Button>
                        {/* PayPal button */}
                        <Button
                          className="w-full flex items-center justify-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20"
                          disabled={checkoutLoading !== null}
                          onClick={() => handleCheckout(tier.name as any, 'paypal')}
                        >
                          {checkoutLoading === `${tier.name}_paypal` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <DollarSign className="h-4 w-4" /> Upgrade with PayPal
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <Button className="w-full" variant="outline" disabled>
                        Starter Default
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
