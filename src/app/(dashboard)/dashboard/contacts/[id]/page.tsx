'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft,
  Mail,
  User,
  Building,
  Activity,
  Send,
  Loader2,
  Sparkles,
  ExternalLink,
  MessageSquare,
  MessageCircleOff,
  Flame,
  ThermometerSun,
  Snowflake,
  Lightbulb,
  BarChart2,
} from 'lucide-react'

interface ContactDetail {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  phone: string | null
  company_name: string | null
  company_id: string | null
  job_title: string | null
  linkedin_url: string | null
  website: string | null
  industry: string | null
  company_size: string | null
  lead_score: number
  status: string
  source: string | null
  enrichment_data: any
  notes: string | null
  created_at: string
}

interface ActivityItem {
  id: string
  type: string
  subject: string
  description: string | null
  created_at: string
  metadata: any
}

export default function ContactDetailPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const { toast } = useToast()
  
  const [contact, setContact] = React.useState<ContactDetail | null>(null)
  const [activities, setActivities] = React.useState<ActivityItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [simulating, setSimulating] = React.useState(false)
  const [simulationText, setSimulationText] = React.useState("I'm interested, but is this compatible with Node.js applications?")
  
  const supabase = createClient() as any

  const loadData = React.useCallback(async () => {
    setLoading(true)
    
    // 1. Fetch contact details
    const { data: contactData, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', id)
      .single()

    if (contactError || !contactData) {
      toast({ type: 'error', description: 'Failed to load contact details.' })
      router.push('/dashboard/contacts')
      return
    }

    setContact(contactData as ContactDetail)

    // 2. Fetch activity timeline
    const { data: activityData } = await supabase
      .from('activities')
      .select('*')
      .eq('contact_id', id)
      .order('created_at', { ascending: false })

    if (activityData) {
      setActivities(activityData as ActivityItem[])
    }

    setLoading(false)
  }, [id, supabase, router, toast])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  // Handle Simulated Reply
  const handleSimulateReply = async () => {
    if (!simulationText.trim() || !contact) return
    setSimulating(true)

    // Find the latest outreach email sent to this contact
    const { data: outreach } = await supabase
      .from('outreach_queue')
      .select('*')
      .eq('contact_id', contact.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!outreach) {
      toast({
        type: 'error',
        description: 'You must send at least one outreach email to this contact first to simulate a reply.',
      })
      setSimulating(false)
      return
    }

    try {
      const response = await fetch('/api/webhooks/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'reply_simulated',
          outreach_id: (outreach as any).id,
          reply_text: simulationText,
        }),
      })

      const data = await response.json()
      if (response.ok && data.success) {
        toast({
          type: 'success',
          description: `Reply simulated! Follow-Up Agent classified it as "${data.result.category}".`,
        })
        setSimulationText('')
        loadData()
      } else {
        toast({ type: 'error', description: data.error || 'Simulation failed' })
      }
    } catch (err: any) {
      toast({ type: 'error', description: err.message || 'Simulation network error' })
    } finally {
      setSimulating(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Back button */}
      <div>
        <Link
          href="/dashboard/contacts"
          className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" /> Back to Contacts
        </Link>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
        </div>
      ) : !contact ? (
        <div className="text-center py-20 text-slate-500">Contact not found.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Profile Card */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-slate-800/80 bg-slate-950/40 backdrop-blur-md relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3">
                <Badge variant="secondary">Score: {contact.lead_score}</Badge>
              </div>
              <CardContent className="p-6 pt-8 flex flex-col items-center text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold border border-violet-500/20 shadow-md">
                  {contact.first_name ? contact.first_name.charAt(0).toUpperCase() : 'L'}
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-white">
                    {contact.first_name || ''} {contact.last_name || ''}
                  </h2>
                  <p className="text-xs text-slate-400 font-medium">{contact.job_title || 'No Job Title'}</p>
                </div>
                <Badge
                  variant={
                    contact.status === 'replied'
                      ? 'success'
                      : contact.status === 'contacted'
                      ? 'info'
                      : contact.status === 'do_not_contact'
                      ? 'destructive'
                      : 'default'
                  }
                >
                  {contact.status}
                </Badge>
              </CardContent>
            </Card>

            {/* Firmographics Info */}
            <Card className="border-slate-800/80 bg-slate-950/40 backdrop-blur-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Lead Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3.5 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" /> Email
                  </span>
                  <span className="font-mono text-slate-200">{contact.email}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Building className="h-3.5 w-3.5" /> Company
                  </span>
                  <span className="text-slate-200">{contact.company_name || 'Individual'}</span>
                </div>
                {contact.website && (
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Website</span>
                    <a
                      href={contact.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-violet-400 hover:underline flex items-center gap-1"
                    >
                      {contact.website.replace(/^https?:\/\/(www\.)?/, '')}{' '}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                {contact.industry && (
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Industry</span>
                    <span className="text-slate-200">{contact.industry}</span>
                  </div>
                )}
                {contact.company_size && (
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Company Size</span>
                    <span className="text-slate-200">{contact.company_size} employees</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Lead Intelligence Card */}
            {(contact.enrichment_data?.lead_tag || contact.enrichment_data?.personalization_hooks?.length > 0) && (
              <Card className="border-slate-800/80 bg-slate-950/40 backdrop-blur-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-violet-400" /> AI Lead Intelligence
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  {/* Lead Tag */}
                  {contact.enrichment_data?.lead_tag && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Lead Temperature</span>
                      <span className={`px-2 py-1 rounded-full border font-bold flex items-center gap-1 ${
                        contact.enrichment_data.lead_tag === 'HOT'
                          ? 'text-red-400 bg-red-500/10 border-red-500/20'
                          : contact.enrichment_data.lead_tag === 'WARM'
                          ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                          : 'text-sky-400 bg-sky-500/10 border-sky-500/20'
                      }`}>
                        {contact.enrichment_data.lead_tag === 'HOT' && <Flame className="h-3 w-3" />}
                        {contact.enrichment_data.lead_tag === 'WARM' && <ThermometerSun className="h-3 w-3" />}
                        {contact.enrichment_data.lead_tag === 'COLD' && <Snowflake className="h-3 w-3" />}
                        {contact.enrichment_data.lead_tag}
                      </span>
                    </div>
                  )}

                  {/* Score Rationale */}
                  {contact.enrichment_data?.score_rationale && (
                    <p className="text-slate-400 italic border-l border-slate-700 pl-3 leading-relaxed">
                      {contact.enrichment_data.score_rationale}
                    </p>
                  )}

                  {/* Score Breakdown Bars */}
                  {contact.enrichment_data?.score_contributions && (
                    <div className="space-y-2">
                      <div className="text-slate-500 font-semibold">Score Breakdown</div>
                      {(contact.enrichment_data.score_contributions as any[]).map((c: any) => (
                        <div key={c.attribute} className="space-y-1">
                          <div className="flex justify-between text-slate-400">
                            <span className="capitalize">{c.attribute.replace(/_/g, ' ')}</span>
                            <span className="font-mono text-slate-300">{c.score}/{c.weight}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-violet-500/70 rounded-full transition-all"
                              style={{ width: `${Math.round((c.score / c.weight) * 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Personalization Hooks */}
                  {contact.enrichment_data?.personalization_hooks?.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-slate-500 font-semibold flex items-center gap-1.5">
                        <Lightbulb className="h-3 w-3 text-violet-400" /> Personalization Hooks
                      </div>
                      {(contact.enrichment_data.personalization_hooks as any[]).map((hook: any, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-slate-300">
                          <span className="text-violet-400 mt-0.5">→</span>
                          <span>{hook.text}</span>
                          <span className="ml-auto text-slate-600 font-mono">{Math.round(hook.confidence * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right/Middle Column: Timeline & Simulator */}
          <div className="lg:col-span-2 space-y-6">
            {/* Simulation Widget */}
            <Card className="border-slate-800/80 bg-slate-950/40 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-400 animate-pulse" /> Simulate Prospect Reply
                </CardTitle>
                <CardDescription>
                  Simulate receiving an email from this prospect to trigger the autonomous follow-up loops
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <textarea
                  value={simulationText}
                  onChange={(e) => setSimulationText(e.target.value)}
                  className="flex min-h-[60px] w-full rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:border-transparent transition-all"
                  placeholder="Type simulated reply text..."
                  disabled={simulating}
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSimulationText("No budget for this right now, maybe in Q3.")
                    }
                    disabled={simulating}
                  >
                    Objection Simulation
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSimulationText("Stop emailing me, unsubscribe.")
                    }
                    disabled={simulating}
                  >
                    Opt-out Simulation
                  </Button>
                  <Button variant="premium" size="sm" onClick={handleSimulateReply} disabled={simulating}>
                    {simulating ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Processing...
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5 mr-2" /> Send Reply
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card className="border-slate-800/80 bg-slate-950/40 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-violet-400" /> CRM Activity Timeline
                </CardTitle>
                <CardDescription>Interaction logs and agent history for this contact</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {activities.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-sm">
                    No activities recorded yet.
                  </div>
                ) : (
                  <div className="space-y-6 relative pl-4 border-l border-slate-800/80 ml-2">
                    {activities.map((a) => {
                      const date = new Date(a.created_at).toLocaleString()
                      return (
                        <div key={a.id} className="relative space-y-1">
                          {/* Timeline dot */}
                          <div className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-violet-500 shadow shadow-violet-500/50" />
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-200">{a.subject}</span>
                            <span className="text-xxs text-slate-500 font-mono">{date}</span>
                          </div>
                          <p className="text-xs text-slate-400">{a.description}</p>
                          {a.metadata?.body && (
                            <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/60 mt-2 text-xxs text-slate-400 font-mono whitespace-pre-wrap">
                              {a.metadata.body}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
