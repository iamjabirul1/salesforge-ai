'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Sparkles, Loader2, Play, CheckCircle } from 'lucide-react'

export default function NewCampaignPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [step, setStep] = React.useState(1)
  const [loading, setLoading] = React.useState(false)

  // Campaign parameters
  const [campaignName, setCampaignName] = React.useState('Consulting Outreach Sequence')
  const [industries, setIndustries] = React.useState('AI SaaS, software development')
  const [locations, setLocations] = React.useState('United States')
  const [jobTitles, setJobTitles] = React.useState('CEO, Founder, Head of Sales')
  const [customPrompt, setCustomPrompt] = React.useState('Identify consulting clients who need capacity scaling.')

  const supabase = createClient() as any

  const handleLaunchCampaign = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // 1. Get user session & org_id
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      toast({ type: 'error', description: 'Unauthorized' })
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (!profile?.org_id) {
      toast({ type: 'error', description: 'Organization profile not found' })
      setLoading(false)
      return
    }

    // 2. Create the campaign record
    const targetIcp = {
      industries: industries.split(',').map((s) => s.trim()),
      locations: locations.split(',').map((s) => s.trim()),
      job_titles: jobTitles.split(',').map((s) => s.trim()),
      custom_prompt: customPrompt,
    }

    const { data: newCampaign, error: campaignError } = await supabase
      .from('campaigns')
      .insert({
        org_id: profile.org_id,
        name: campaignName,
        status: 'draft',
        target_icp: targetIcp,
        sequence_steps: [
          { step: 1, delay_days: 0, subject: 'Default cold outreach' },
          { step: 2, delay_days: 3, subject: 'Follow up' },
        ],
      })
      .select('id')
      .single()

    if (campaignError || !newCampaign) {
      toast({ type: 'error', description: campaignError?.message || 'Failed to create campaign record' })
      setLoading(false)
      return
    }

    // 3. Trigger CEO Agent Orchestrator Run
    try {
      const response = await fetch('/api/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: newCampaign.id,
          criteria: targetIcp,
        }),
      })

      const data = await response.json()
      if (response.ok && data.success) {
        toast({
          type: 'success',
          description: 'Orchestration campaign created! AI Agent team execution launched.',
        })
        router.push('/dashboard/agents') // Go to agent trace monitor
      } else {
        toast({ type: 'error', description: data.error || 'Agent launch failed.' })
      }
    } catch (err: any) {
      toast({ type: 'error', description: err.message || 'Orchestrator communication error.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Back button */}
      <div>
        <Link
          href="/dashboard/campaigns"
          className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" /> Back to Campaigns
        </Link>
      </div>

      <div className="max-w-2xl mx-auto">
        <Card className="border-slate-800/80 bg-slate-950/40 backdrop-blur-md relative overflow-hidden">
          {/* Progress bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-slate-900">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-300"
              style={{ width: `${step === 1 ? 50 : 100}%` }}
            />
          </div>

          <CardHeader className="pt-8">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-400" /> New Campaign Wizard
            </CardTitle>
            <CardDescription>
              Step {step} of 2 — {step === 1 ? 'Define Target Audience' : 'Review Campaign Details'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {step === 1 ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Target Industries</label>
                  <Input
                    placeholder="E.g., AI SaaS, Consulting, Marketing Agency"
                    value={industries}
                    onChange={(e) => setIndustries(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Target Location</label>
                  <Input
                    placeholder="E.g., Austin, TX, United States"
                    value={locations}
                    onChange={(e) => setLocations(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Target Job Titles</label>
                  <Input
                    placeholder="E.g., CEO, Founder, VP Sales"
                    value={jobTitles}
                    onChange={(e) => setJobTitles(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Research Focus Prompt</label>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    className="flex min-h-[100px] w-full rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:border-transparent transition-all"
                    placeholder="E.g., Find fast-growing tech companies looking to build customized ML models..."
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Campaign Name</label>
                  <Input
                    placeholder="Sequence Name"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    required
                  />
                </div>

                {/* Review criteria list */}
                <div className="p-4 rounded-lg bg-slate-900/40 border border-slate-800/80 space-y-3 text-sm text-slate-300">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    ICP Criteria Review:
                  </div>
                  <div>
                    <span className="font-semibold text-slate-400">Industries:</span> {industries}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-400">Locations:</span> {locations}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-400">Job Titles:</span> {jobTitles}
                  </div>
                  <div className="border-t border-slate-800/60 pt-2 text-xs italic text-slate-400">
                    On launch, our autonomous agents will immediately begin researching matching contacts, enrichment profiles, and generating cold emails.
                  </div>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-between p-6 border-t border-slate-800/40">
            {step === 1 ? (
              <>
                <div />
                <Button variant="premium" onClick={() => setStep(2)}>
                  Continue Review
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setStep(1)} disabled={loading}>
                  Back
                </Button>
                <Button variant="premium" onClick={handleLaunchCampaign} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Launching Agent...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" /> Launch Agent Campaign
                    </>
                  )}
                </Button>
              </>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
