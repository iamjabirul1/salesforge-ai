'use client'

import * as React from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { createClient } from '@/lib/supabase/client'
import {
  Bot,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  Briefcase,
  MapPin,
  Sparkles,
} from 'lucide-react'

interface AgentRun {
  id: string
  agent_type: string
  status: string
  goal: any
  state: any
  result: any
  error: string | null
  created_at: string
}

export default function AgentsPage() {
  const { toast } = useToast()
  const [campaigns, setCampaigns] = React.useState<{ id: string; name: string }[]>([])
  const [selectedCampaignId, setSelectedCampaignId] = React.useState('')
  const [industries, setIndustries] = React.useState('AI SaaS, tech start-ups')
  const [locations, setLocations] = React.useState('Austin, TX')
  const [jobTitles, setJobTitles] = React.useState('CEO, Founder, Head of Sales')
  const [customPrompt, setCustomPrompt] = React.useState('Find fast-growing startups who need consulting help.')
  const [loading, setLoading] = React.useState(false)
  const [runs, setRuns] = React.useState<AgentRun[]>([])
  const [selectedRun, setSelectedRun] = React.useState<AgentRun | null>(null)
  const [selectedRunSubRuns, setSelectedRunSubRuns] = React.useState<AgentRun[]>([])
  const [polling, setPolling] = React.useState(false)
  const supabase = createClient() as any

  // Load campaigns and runs
  const loadInitialData = React.useCallback(async () => {
    // 1. Get campaigns
    const { data: campaignList } = await supabase
      .from('campaigns')
      .select('id, name')
      .order('created_at', { ascending: false })

    if (campaignList && campaignList.length > 0) {
      setCampaigns(campaignList)
      setSelectedCampaignId(campaignList[0].id)
    } else {
      // Create a default campaign if none exist
      const { data: userProfile } = await supabase.auth.getUser()
      if (userProfile.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('org_id')
          .eq('id', userProfile.user.id)
          .single()

        if (profile?.org_id) {
          const { data: newCampaign } = await supabase
            .from('campaigns')
            .insert({
              org_id: profile.org_id,
              name: 'Default Consulting Outreach',
              status: 'draft',
              target_icp: { industries: ['AI SaaS'], locations: ['Austin, TX'] },
              sequence_steps: [{ step: 1, delay_days: 0, subject: 'Default subject' }],
            })
            .select('id, name')
            .single()

          if (newCampaign) {
            setCampaigns([newCampaign])
            setSelectedCampaignId(newCampaign.id)
          }
        }
      }
    }

    // 2. Get past runs
    const { data: runList } = await supabase
      .from('agent_runs')
      .select('*')
      .eq('agent_type', 'ceo')
      .order('created_at', { ascending: false })
      .limit(10)

    if (runList) {
      setRuns(runList)
      if (runList.length > 0 && !selectedRun) {
        setSelectedRun(runList[0])
      }
    }
  }, [supabase, selectedRun])

  React.useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  // Poll current selected run if it is running
  React.useEffect(() => {
    let intervalId: any
    if (selectedRun && (selectedRun.status === 'running' || selectedRun.status === 'pending')) {
      setPolling(true)
      intervalId = setInterval(async () => {
        const response = await fetch(`/api/agents/status/${selectedRun.id}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setSelectedRun(data.run)
            setSelectedRunSubRuns(data.subRuns)
            
            // If run finished, stop polling and refresh list
            if (data.run.status !== 'running' && data.run.status !== 'pending') {
              setPolling(false)
              loadInitialData()
            }
          }
        }
      }, 3000)
    } else {
      setPolling(false)
    }

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [selectedRun, loadInitialData])

  // Get sub-runs for selected completed run
  React.useEffect(() => {
    async function fetchSubRuns() {
      if (selectedRun && selectedRun.status !== 'running' && selectedRun.status !== 'pending') {
        const response = await fetch(`/api/agents/status/${selectedRun.id}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setSelectedRunSubRuns(data.subRuns)
          }
        }
      }
    }
    fetchSubRuns()
  }, [selectedRun])

  const handleLaunchAgent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCampaignId) {
      toast({ type: 'error', description: 'Please select a campaign first' })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: selectedCampaignId,
          criteria: {
            industries: industries.split(',').map((s) => s.trim()),
            company_sizes: [],
            locations: locations.split(',').map((s) => s.trim()),
            job_titles: jobTitles.split(',').map((s) => s.trim()),
            custom_prompt: customPrompt,
          },
        }),
      })

      const data = await response.json()
      if (response.ok && data.success) {
        toast({ type: 'success', description: 'CEO Orchestrator agent launched successfully!' })
        // Set selected run to trigger polling
        const newRun: AgentRun = {
          id: data.runId,
          agent_type: 'ceo',
          status: 'running',
          goal: {},
          state: { current_step: 'Initializing agent run...' },
          result: null,
          error: null,
          created_at: new Date().toISOString(),
        }
        setSelectedRun(newRun)
        setRuns((prev) => [newRun, ...prev])
      } else {
        toast({ type: 'error', description: data.error || 'Failed to launch agent' })
      }
    } catch (err: any) {
      toast({ type: 'error', description: err.message || 'Network error occurred' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
          <Bot className="h-8 w-8 text-violet-400" /> AI Agent Control Room
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Configure and launch your multi-agent sales organization runs
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Launcher Config Column */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-slate-800/80 bg-slate-950/40 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-md">
                <Sparkles className="h-4 w-4 text-violet-400" /> Launch Target Run
              </CardTitle>
              <CardDescription>Define target filters and goals for agent run</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLaunchAgent} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Outreach Campaign</label>
                  <select
                    value={selectedCampaignId}
                    onChange={(e) => setSelectedCampaignId(e.target.value)}
                    className="flex h-10 w-full rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:border-transparent transition-all"
                  >
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id} className="bg-slate-950">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Target Industries</label>
                  <Input
                    value={industries}
                    onChange={(e) => setIndustries(e.target.value)}
                    placeholder="SaaS, Agency, E-commerce"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Target Location</label>
                  <Input
                    value={locations}
                    onChange={(e) => setLocations(e.target.value)}
                    placeholder="Austin, TX, San Francisco, CA"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Target Job Titles</label>
                  <Input
                    value={jobTitles}
                    onChange={(e) => setJobTitles(e.target.value)}
                    placeholder="CEO, CTO, Marketing Director"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Research Focus Goal</label>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    className="flex min-h-[80px] w-full rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:border-transparent transition-all"
                    placeholder="Find consulting leads..."
                  />
                </div>

                <Button className="w-full mt-4" type="submit" variant="premium" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Launching...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" /> Execute Agent Team
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Past runs listing */}
          <Card className="border-slate-800/80 bg-slate-950/40 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-md">Run Execution History</CardTitle>
              <CardDescription>Select past run to view trace details</CardDescription>
            </CardHeader>
            <CardContent className="p-0 max-h-[300px] overflow-y-auto">
              <div className="divide-y divide-slate-800/40">
                {runs.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRun(r)}
                    className={`w-full p-4 text-left transition-colors flex items-center justify-between hover:bg-slate-900/20 ${
                      selectedRun?.id === r.id ? 'bg-slate-900/40 border-l-2 border-violet-500' : ''
                    }`}
                  >
                    <div className="space-y-0.5 max-w-[70%]">
                      <div className="text-sm font-semibold text-slate-200 truncate">
                        {r.goal?.criteria?.industries?.join(', ') || 'Global ICP'}
                      </div>
                      <div className="text-xxs text-slate-500 font-mono">
                        {new Date(r.created_at).toLocaleString()}
                      </div>
                    </div>
                    <Badge
                      variant={
                        r.status === 'completed'
                          ? 'success'
                          : r.status === 'running'
                          ? 'info'
                          : r.status === 'failed'
                          ? 'destructive'
                          : 'warning'
                      }
                    >
                      {r.status}
                    </Badge>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Trace Monitor Column */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-800/80 bg-slate-950/40 backdrop-blur-md h-full flex flex-col">
            <CardHeader className="border-b border-slate-800/40">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-md flex items-center gap-2">
                    Agent Trace Monitor
                    {polling && <Loader2 className="h-4 w-4 text-violet-400 animate-spin" />}
                  </CardTitle>
                  <CardDescription className="font-mono text-xs">
                    Run ID: {selectedRun?.id || 'No run selected'}
                  </CardDescription>
                </div>
                {selectedRun && (
                  <Badge variant={selectedRun.status === 'completed' ? 'success' : 'warning'}>
                    {selectedRun.status}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-6 space-y-6 overflow-y-auto">
              {!selectedRun ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-500 gap-2">
                  <Bot className="h-12 w-12 text-slate-700" />
                  <p className="text-sm">Launch a target run or select from history to monitor</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Goal detail card */}
                  <div className="p-4 rounded-lg bg-slate-900/30 border border-slate-800/60 space-y-2">
                    <div className="text-xs font-semibold text-slate-400">Target Filters Set:</div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Briefcase className="h-3.5 w-3.5 text-violet-400" />
                        {selectedRun.goal?.criteria?.industries?.join(', ') || 'Any'}
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <MapPin className="h-3.5 w-3.5 text-cyan-400" />
                        {selectedRun.goal?.criteria?.locations?.join(', ') || 'Global'}
                      </div>
                    </div>
                  </div>

                  {/* Execution Trace Timeline */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-slate-200">Execution Timeline</h4>
                    <div className="space-y-4">
                      {/* Parent Orchestration status */}
                      <div className="flex gap-4">
                        <div className="relative flex items-center justify-center">
                          <div className="h-8 w-8 rounded-full border border-violet-500 bg-violet-950/60 flex items-center justify-center z-10">
                            <Bot className="h-4 w-4 text-violet-400" />
                          </div>
                          <div className="absolute top-8 bottom-0 w-0.5 bg-slate-800" />
                        </div>
                        <div className="flex-1 py-1">
                          <div className="text-sm font-semibold text-slate-200">
                            CEO Agent (Orchestrator)
                          </div>
                          <div className="text-xs text-slate-400">
                            {selectedRun.state?.current_step || 'Initializing execution...'}
                          </div>
                          {selectedRun.result && (
                            <div className="text-xs text-emerald-400 mt-1 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Found {selectedRun.result.contacts_found} leads, drafted{' '}
                              {selectedRun.result.emails_drafted} outreach emails.
                            </div>
                          )}
                          {selectedRun.error && (
                            <div className="text-xs text-red-400 mt-1 font-semibold flex items-center gap-1">
                              <XCircle className="h-3.5 w-3.5" />
                              Error: {selectedRun.error}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Sub runs listing */}
                      {selectedRunSubRuns.map((sr, idx) => {
                        const isLast = idx === selectedRunSubRuns.length - 1
                        const StatusIcon =
                          sr.status === 'completed'
                            ? CheckCircle2
                            : sr.status === 'failed'
                            ? XCircle
                            : Loader2
                        const iconColor =
                          sr.status === 'completed'
                            ? 'text-emerald-400'
                            : sr.status === 'failed'
                            ? 'text-red-400'
                            : 'text-violet-400 animate-spin'

                        return (
                          <div key={sr.id} className="flex gap-4">
                            <div className="relative flex items-center justify-center">
                              <div className="h-8 w-8 rounded-full border border-slate-800 bg-slate-900 flex items-center justify-center z-10">
                                <StatusIcon className={`h-4 w-4 ${iconColor}`} />
                              </div>
                              {!isLast && <div className="absolute top-8 bottom-0 w-0.5 bg-slate-800" />}
                            </div>
                            <div className="flex-1 py-1">
                              <div className="text-sm font-semibold text-slate-200">
                                {sr.agent_type.toUpperCase()} Agent
                              </div>
                              <div className="text-xs text-slate-400">
                                {sr.state?.current_step ||
                                  (sr.status === 'completed' ? 'Execution completed' : 'Waiting...')}
                              </div>
                              {sr.result && (
                                <div className="text-xxs text-slate-500 font-mono mt-1">
                                  Result: {JSON.stringify(sr.result)}
                                </div>
                              )}
                              {sr.error && (
                                <div className="text-xs text-red-400 mt-1 flex items-center gap-1">
                                  <XCircle className="h-3.5 w-3.5" />
                                  Error: {sr.error}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
