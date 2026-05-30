'use client'

import * as React from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { createClient } from '@/lib/supabase/client'
import { saveSettingsAction, addKbEntryAction, deleteKbEntryAction } from '@/app/actions/settings'
import { saveSocialSettingsAction, getSocialSettingsAction } from '@/app/actions/social-settings'
import { Settings, Key, HelpCircle, Save, Plus, Trash2, Loader2, Bot, Info, ShieldCheck, HelpCircle as HelpIcon } from 'lucide-react'

interface KbEntry {
  id: string
  category: string
  question: string
  answer: string
}

export default function SettingsPage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = React.useState<'keys' | 'kb' | 'social'>('keys')
  const [loading, setLoading] = React.useState(true)
  const [actionLoading, setActionLoading] = React.useState(false)

  // API Config settings
  const [openrouterKey, setOpenrouterKey] = React.useState('')
  const [apolloKey, setApolloKey] = React.useState('')
  const [resendKey, setResendKey] = React.useState('')
  const [sendingDomain, setSendingDomain] = React.useState('')
  const [model, setModel] = React.useState('google/gemini-2.5-flash:free')
  const [emailLimit, setEmailLimit] = React.useState(50)

  // Social automation placeholders
  const [rapidapiKey, setRapidapiKey] = React.useState('')
  const [linkedinUrl, setLinkedinUrl] = React.useState('')
  const [xUrl, setXUrl] = React.useState('')
  const [facebookUrl, setFacebookUrl] = React.useState('')

  // Knowledge base state
  const [kbEntries, setKbEntries] = React.useState<KbEntry[]>([])
  const [kbCategory, setKbCategory] = React.useState('Pricing')
  const [kbQuestion, setKbQuestion] = React.useState('Too expensive')
  const [kbAnswer, setKbAnswer] = React.useState("Our consulting helps you scale capacity without full-time hire cost. Let's look at the ROI.")

  const supabase = createClient() as any

  const loadSettingsAndKb = React.useCallback(async () => {
    setLoading(true)

    // 1. Load API settings
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const { data: settings } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (settings) {
        setOpenrouterKey(settings.openrouter_api_key_encrypted || '')
        setApolloKey(settings.apollo_api_key_encrypted || '')
        setResendKey(settings.resend_api_key || '')
        setSendingDomain(settings.email_sending_domain || '')
        setModel(settings.default_model || 'google/gemini-2.5-flash:free')
        setEmailLimit(settings.daily_email_limit || 50)
      }

      // 2. Load Knowledge base entries
      const { data: kbData } = await supabase
        .from('knowledge_base')
        .select('*')
        .order('created_at', { ascending: false })

      if (kbData) {
        setKbEntries(kbData as KbEntry[])
      }

      // 3. Load Social settings
      const socialResult = await getSocialSettingsAction()
      if (socialResult && !socialResult.error) {
        setRapidapiKey(socialResult.rapidapiKey || '')
        setLinkedinUrl(socialResult.linkedinUrl || '')
        setXUrl(socialResult.xUrl || '')
        setFacebookUrl(socialResult.facebookUrl || '')
      }
    }

    setLoading(false)
  }, [supabase])

  React.useEffect(() => {
    loadSettingsAndKb()
  }, [loadSettingsAndKb])

  const handleSaveSocialSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionLoading(true)

    const result = await saveSocialSettingsAction({
      rapidapiKey,
      linkedinUrl,
      xUrl,
      facebookUrl,
    })

    if (result.error) {
      toast({ type: 'error', description: result.error })
    } else {
      toast({ type: 'success', description: 'Social integration configurations saved.' })
      loadSettingsAndKb()
    }
    setActionLoading(false)
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionLoading(true)

    const result = await saveSettingsAction(
      openrouterKey,
      apolloKey,
      resendKey,
      sendingDomain,
      model,
      emailLimit
    )

    if (result.error) {
      toast({ type: 'error', description: result.error })
    } else {
      toast({ type: 'success', description: 'API credentials saved successfully.' })
    }
    setActionLoading(false)
  }

  const handleAddKbEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!kbQuestion || !kbAnswer) {
      toast({ type: 'error', description: 'All knowledge base fields are required.' })
      return
    }

    setActionLoading(true)

    const result = await addKbEntryAction(kbCategory, kbQuestion, kbAnswer)
    if (result.error) {
      toast({ type: 'error', description: result.error })
    } else {
      toast({ type: 'success', description: 'Objection response pair saved.' })
      setKbQuestion('')
      setKbAnswer('')
      loadSettingsAndKb()
    }
    setActionLoading(false)
  }

  const handleDeleteKbEntry = async (id: string) => {
    const result = await deleteKbEntryAction(id)
    if (result.error) {
      toast({ type: 'error', description: result.error })
    } else {
      toast({ type: 'success', description: 'Entry removed.' })
      setKbEntries((prev) => prev.filter((item) => item.id !== id))
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
          <Settings className="h-8 w-8 text-violet-400" /> Settings Panel
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Configure API credentials, choose AI models, and train objection handlers
        </p>
      </div>

      {/* Tabs selector */}
      <div className="flex gap-2 border-b border-slate-800 pb-px">
        <button
          onClick={() => setActiveTab('keys')}
          className={`px-4 py-2.5 text-sm font-semibold transition-all duration-200 border-b-2 -mb-px flex items-center gap-2 ${
            activeTab === 'keys'
              ? 'border-violet-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Key className="h-4 w-4" /> API Credentials
        </button>
        <button
          onClick={() => setActiveTab('social')}
          className={`px-4 py-2.5 text-sm font-semibold transition-all duration-200 border-b-2 -mb-px flex items-center gap-2 ${
            activeTab === 'social'
              ? 'border-violet-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bot className="h-4 w-4" /> Social Automation
        </button>
        <button
          onClick={() => setActiveTab('kb')}
          className={`px-4 py-2.5 text-sm font-semibold transition-all duration-200 border-b-2 -mb-px flex items-center gap-2 ${
            activeTab === 'kb'
              ? 'border-violet-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <HelpCircle className="h-4 w-4" /> Objection Training
        </button>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
        </div>
      ) : activeTab === 'keys' ? (
        /* KEYS TAB */
        <Card className="border-slate-800/80 bg-slate-950/40 backdrop-blur-md max-w-xl">
          <CardHeader>
            <CardTitle>Configuration Settings</CardTitle>
            <CardDescription>Setup external integrations and default agent parameters</CardDescription>
          </CardHeader>
          <form onSubmit={handleSaveSettings}>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">OpenRouter API Key</label>
                <Input
                  type="password"
                  placeholder="sk-or-v1-..."
                  value={openrouterKey}
                  onChange={(e) => setOpenrouterKey(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Apollo.io API Key</label>
                <Input
                  type="password"
                  placeholder="apollo-key-..."
                  value={apolloKey}
                  onChange={(e) => setApolloKey(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Resend API Key</label>
                <Input
                  type="password"
                  placeholder="re_..."
                  value={resendKey}
                  onChange={(e) => setResendKey(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Email Domain & Cal.com Scheduling Handle</label>
                <Input
                  placeholder="updates.salesforge-ai.com or cal-username"
                  value={sendingDomain}
                  onChange={(e) => setSendingDomain(e.target.value)}
                />
                <span className="text-[10px] text-slate-500 font-mono">
                  If set to "cal-username", emails will auto-inject "https://cal.com/cal-username"
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Default AI Model Gateway</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:border-transparent transition-all"
                >
                  <option value="google/gemini-2.5-flash:free" className="bg-slate-950">
                    Gemini 2.5 Flash Free (Recommended)
                  </option>
                  <option value="meta-llama/llama-3.3-70b-instruct:free" className="bg-slate-950">
                    Llama 3.3 70B Free (High Reasoning)
                  </option>
                  <option value="qwen/qwen-2.5-72b-instruct:free" className="bg-slate-950">
                    Qwen 2.5 72B Free (General Writing)
                  </option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Daily Sending Limit</label>
                <Input
                  type="number"
                  placeholder="50"
                  value={emailLimit}
                  onChange={(e) => setEmailLimit(Number(e.target.value) || 50)}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end p-6 border-t border-slate-800/40">
              <Button type="submit" variant="premium" disabled={actionLoading}>
                {actionLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" /> Save Config
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      ) : activeTab === 'social' ? (
        /* SOCIAL TAB */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Configuration Form */}
          <div className="lg:col-span-1.5 space-y-6">
            <Card className="border-slate-800/80 bg-slate-950/40 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-md flex items-center gap-2">
                  <Bot className="h-4 w-4 text-violet-400" /> Social Channel Credentials
                </CardTitle>
                <CardDescription>
                  Configure unofficial scrapers and gateways to automate DMs on social platforms
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSaveSocialSettings}>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">RapidAPI Unified Token</label>
                    <Input
                      type="password"
                      placeholder="E.g., rapidapi_secret_key_..."
                      value={rapidapiKey}
                      onChange={(e) => setRapidapiKey(e.target.value)}
                    />
                    <span className="text-[10px] text-slate-500 font-mono">
                      Provides authentication header for the scraper API endpoints below.
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">LinkedIn Automation Gateway URL</label>
                    <Input
                      placeholder="E.g., https://linkedin-scraper.p.rapidapi.com/send"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                    />
                    <span className="text-[10px] text-slate-500 font-mono">
                      Placeholder for RapidAPI LinkedIn DM endpoint (Proxycurl / RapidAPI).
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">X / Twitter Automation Gateway URL</label>
                    <Input
                      placeholder="E.g., https://twitter-dm.p.rapidapi.com/send"
                      value={xUrl}
                      onChange={(e) => setXUrl(e.target.value)}
                    />
                    <span className="text-[10px] text-slate-500 font-mono">
                      Endpoint for automated direct messaging/replies on X.
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Facebook / Meta Scraper URL</label>
                    <Input
                      placeholder="E.g., https://meta-messenger.p.rapidapi.com/send"
                      value={facebookUrl}
                      onChange={(e) => setFacebookUrl(e.target.value)}
                    />
                    <span className="text-[10px] text-slate-500 font-mono">
                      Messenger endpoint for corporate Facebook pages outreach.
                    </span>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end p-6 border-t border-slate-800/40">
                  <Button type="submit" variant="premium" disabled={actionLoading}>
                    {actionLoading ? 'Saving...' : 'Save Social Settings'}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>

          {/* Setup Guide, Hints, and Next Steps for New Users */}
          <div className="lg:col-span-1.5 space-y-6">
            <Card className="border-slate-800/80 bg-slate-950/40 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-violet-400">
                  <Info className="h-4 w-4" /> Next Steps & Setup Suggestions
                </CardTitle>
                <CardDescription>
                  Follow these suggestions to configure and run your first autopilot campaign
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 text-sm text-slate-300 leading-relaxed">
                <div className="space-y-2">
                  <h4 className="font-semibold text-white flex items-center gap-1.5 text-xs">
                    <ShieldCheck className="h-4 w-4 text-emerald-400 animate-pulse" /> 1. IP Whitelist check (Brevo)
                  </h4>
                  <p className="text-xs text-slate-400">
                    If you configure a Brevo API key, remember to open your Brevo panel and allow connection from any IP. Brevo security whitelists are strict by default.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-white flex items-center gap-1.5 text-xs">
                    💡 2. Social Automation Fallbacks
                  </h4>
                  <p className="text-xs text-slate-400">
                    If you leave these URL placeholders empty, the Approvals Queue will fall back to safe manual operations: clicking **"Copy & Open Social"** will open the prospect's profile directly and copy the AI-tailored message to your clipboard for instant manual sending!
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-white flex items-center gap-1.5 text-xs">
                    📅 3. Cal.com Meeting Booking
                  </h4>
                  <p className="text-xs text-slate-400">
                    Under the **Credentials** tab, paste your Cal.com scheduling handle in the "Email Domain & Cal.com Scheduling Handle" input. The AI writing agent will auto-inject your scheduling link in generated emails, and bookings will automatically advance deals on the Pipeline board.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-white flex items-center gap-1.5 text-xs">
                    🚀 4. Trigger Campaign Sequence
                  </h4>
                  <p className="text-xs text-slate-400">
                    Once configs are ready, go to **Campaigns**, create a consulting outreach wizard sequence, and trigger the run. Watch your dashboard update in real-time!
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* KB TAB */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add entry form */}
          <div className="lg:col-span-1">
            <Card className="border-slate-800/80 bg-slate-950/40 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-md flex items-center gap-2">
                  <Bot className="h-4 w-4 text-violet-400" /> Train Objection Rebuttal
                </CardTitle>
                <CardDescription>
                  Enter prospective objections and corresponding rebuttals to train follow-up agents
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleAddKbEntry}>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Objection Category</label>
                    <select
                      value={kbCategory}
                      onChange={(e) => setKbCategory(e.target.value)}
                      className="flex h-10 w-full rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:border-transparent transition-all"
                    >
                      <option value="Pricing" className="bg-slate-950">Pricing / Budget</option>
                      <option value="Authority" className="bg-slate-950">No Authority</option>
                      <option value="Competitor" className="bg-slate-950">Competitor Vendor</option>
                      <option value="Timing" className="bg-slate-950">Not Ready / Timing</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Objection Trigger Question/Statement</label>
                    <Input
                      placeholder="Pricing is too high..."
                      value={kbQuestion}
                      onChange={(e) => setKbQuestion(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Our Rebuttal Reconstructed</label>
                    <textarea
                      className="flex min-h-[120px] w-full rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:border-transparent transition-all"
                      placeholder="Explain target value..."
                      value={kbAnswer}
                      onChange={(e) => setKbAnswer(e.target.value)}
                      required
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end p-6 border-t border-slate-800/40">
                  <Button type="submit" variant="premium" disabled={actionLoading}>
                    {actionLoading ? 'Saving...' : 'Add objection'}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>

          {/* List entries */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-semibold text-slate-300">Objection Rebuttal Rules ({kbEntries.length})</h3>
            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {kbEntries.length === 0 ? (
                <div className="text-center py-20 text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  No objections registered yet.
                </div>
              ) : (
                kbEntries.map((item) => (
                  <Card key={item.id} className="border-slate-800/80 bg-slate-950/40 backdrop-blur-md group">
                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-sm font-bold">{item.question}</CardTitle>
                        <CardDescription className="text-xxs">Category: {item.category}</CardDescription>
                      </div>
                      <button
                        onClick={() => handleDeleteKbEntry(item.id)}
                        className="text-slate-500 hover:text-red-400 p-1.5 rounded hover:bg-red-950/20 opacity-0 group-hover:opacity-100 transition-all duration-200"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </CardHeader>
                    <CardContent className="text-xs text-slate-400 leading-relaxed pl-6 border-l border-violet-500/30">
                      {item.answer}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
