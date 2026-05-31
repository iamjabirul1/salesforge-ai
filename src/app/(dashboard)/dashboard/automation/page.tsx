'use client'

import * as React from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import {
  Mail,
  Loader2,
  Send,
  Eye,
  MousePointer,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Zap,
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'

interface OutreachItem {
  id: string
  channel: string
  status: string
  subject: string | null
  body: string | null
  sent_at: string | null
  opened_at: string | null
  clicked_at: string | null
  replied_at: string | null
  scheduled_at: string | null
  contact: {
    first_name: string
    last_name: string
    email: string
    company_name: string
  } | null
}

interface EmailStats {
  total: number
  sent: number
  opened: number
  clicked: number
  replied: number
  failed: number
  pending: number
}

export default function EmailAutomationPage() {
  const { toast } = useToast()
  const [items, setItems] = React.useState<OutreachItem[]>([])
  const [stats, setStats] = React.useState<EmailStats>({
    total: 0, sent: 0, opened: 0, clicked: 0, replied: 0, failed: 0, pending: 0,
  })
  const [loading, setLoading] = React.useState(true)
  const [processing, setProcessing] = React.useState(false)
  const [filterChannel, setFilterChannel] = React.useState<string>('all')
  const [filterStatus, setFilterStatus] = React.useState<string>('all')
  const supabase = createClient() as any

  const loadData = React.useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('outreach_queue')
        .select(`
          id, channel, status, subject, body, sent_at, opened_at, clicked_at, replied_at, scheduled_at,
          contacts(first_name, last_name, email, company_name)
        `)
        .order('scheduled_at', { ascending: false })
        .limit(100)

      if (filterChannel !== 'all') {
        query = query.eq('channel', filterChannel)
      }
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus)
      }

      const { data, error } = await query

      if (error) throw error

      const mapped: OutreachItem[] = (data || []).map((item: any) => ({
        ...item,
        contact: item.contacts || null,
      }))

      setItems(mapped)

      // Compute stats
      const all = data || []
      setStats({
        total: all.length,
        sent: all.filter((i: any) => i.status === 'sent').length,
        opened: all.filter((i: any) => i.opened_at !== null).length,
        clicked: all.filter((i: any) => i.clicked_at !== null).length,
        replied: all.filter((i: any) => i.replied_at !== null).length,
        failed: all.filter((i: any) => i.status === 'failed' || i.status === 'bounced').length,
        pending: all.filter((i: any) => i.status === 'pending' || i.status === 'approved').length,
      })
    } catch (err: any) {
      toast({ type: 'error', description: err.message || 'Failed to load email data' })
    } finally {
      setLoading(false)
    }
  }, [supabase, filterChannel, filterStatus, toast])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  const handleTriggerQueue = async () => {
    setProcessing(true)
    try {
      const res = await fetch('/api/cron/process-queue', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        toast({
          type: 'success',
          description: `Queue processed! Sent: ${data.processed}, Errors: ${data.errors}, Follow-ups: ${data.followupsScheduled}`,
        })
        loadData()
      } else {
        toast({ type: 'error', description: data.error || 'Queue processing failed' })
      }
    } catch (err: any) {
      toast({ type: 'error', description: err.message })
    } finally {
      setProcessing(false)
    }
  }

  const getChannelBadgeColor = (channel: string) => {
    switch (channel) {
      case 'email': return 'bg-violet-500/10 text-violet-400 border-violet-500/20'
      case 'linkedin': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'x': return 'bg-slate-500/10 text-slate-300 border-slate-500/20'
      case 'facebook': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
    }
  }

  const getStatusBadgeVariant = (status: string): 'default' | 'success' | 'warning' | 'destructive' | 'info' => {
    switch (status) {
      case 'sent': return 'success'
      case 'pending': return 'warning'
      case 'approved': return 'info'
      case 'failed':
      case 'bounced': return 'destructive'
      default: return 'default'
    }
  }

  const kpis = [
    { label: 'Total Outreach', value: stats.total, icon: Mail, color: 'text-violet-400 bg-violet-500/10' },
    { label: 'Sent', value: stats.sent, icon: Send, color: 'text-emerald-400 bg-emerald-500/10' },
    { label: 'Opened', value: stats.opened, icon: Eye, color: 'text-cyan-400 bg-cyan-500/10' },
    { label: 'Clicked', value: stats.clicked, icon: MousePointer, color: 'text-amber-400 bg-amber-500/10' },
    { label: 'Replied', value: stats.replied, icon: MessageSquare, color: 'text-pink-400 bg-pink-500/10' },
    { label: 'Failed / Bounced', value: stats.failed, icon: AlertTriangle, color: 'text-red-400 bg-red-500/10' },
  ]

  const channels = ['all', 'email', 'linkedin', 'x', 'facebook']
  const statuses = ['all', 'pending', 'approved', 'sent', 'failed']

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <Mail className="h-8 w-8 text-violet-400" /> Email & Social Automation
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Monitor all outreach across email, LinkedIn, X, and Facebook
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="premium" size="sm" onClick={handleTriggerQueue} disabled={processing}>
            {processing ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
            ) : (
              <><Zap className="h-4 w-4 mr-2" /> Trigger Queue</>
            )}
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <Card key={kpi.label} className="border-slate-800/80 bg-slate-950/40 backdrop-blur-md">
              <CardContent className="p-4 flex flex-col gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${kpi.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="text-2xl font-bold text-white">
                  {loading ? '...' : kpi.value}
                </div>
                <div className="text-xs text-slate-500">{kpi.label}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Open Rate calculation */}
      {!loading && stats.sent > 0 && (
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/30 backdrop-blur-md flex flex-wrap gap-6 text-sm">
          <div className="space-y-0.5">
            <div className="text-xs text-slate-500">Open Rate</div>
            <div className="font-bold text-white">{Math.round((stats.opened / stats.sent) * 100)}%</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-xs text-slate-500">Click Rate</div>
            <div className="font-bold text-white">{stats.opened > 0 ? Math.round((stats.clicked / stats.opened) * 100) : 0}%</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-xs text-slate-500">Reply Rate</div>
            <div className="font-bold text-white">{Math.round((stats.replied / stats.sent) * 100)}%</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-xs text-slate-500">Delivery Rate</div>
            <div className="font-bold text-white">{Math.round(((stats.sent - stats.failed) / Math.max(stats.sent, 1)) * 100)}%</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Channel:</span>
        {channels.map((ch) => (
          <button
            key={ch}
            onClick={() => setFilterChannel(ch)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all duration-200 capitalize ${
              filterChannel === ch
                ? 'bg-violet-500 border-violet-500 text-white'
                : 'border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            {ch === 'all' ? 'All Channels' : ch}
          </button>
        ))}

        <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider ml-4">Status:</span>
        {statuses.map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all duration-200 capitalize ${
              filterStatus === st
                ? 'bg-violet-500 border-violet-500 text-white'
                : 'border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            {st === 'all' ? 'All Status' : st}
          </button>
        ))}
      </div>

      {/* Outreach Table */}
      <Card className="border-slate-800/80 bg-slate-950/40 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-md">Outreach Log ({items.length})</CardTitle>
          <CardDescription>Full history of AI-generated messages across all channels</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 text-slate-500 border border-dashed border-slate-800 rounded-xl">
              <Mail className="h-12 w-12 mx-auto mb-3 text-slate-700" />
              <p className="font-semibold text-slate-400">No outreach items found</p>
              <p className="text-sm mt-1">Launch a campaign to start generating outreach</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/60 text-slate-500 text-xs">
                    <th className="pb-3 font-semibold">Contact</th>
                    <th className="pb-3 font-semibold">Channel</th>
                    <th className="pb-3 font-semibold">Subject</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold">Engagement</th>
                    <th className="pb-3 font-semibold text-right">Scheduled</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-900/20">
                      <td className="py-3 pr-4">
                        <div className="font-medium text-slate-200 whitespace-nowrap">
                          {item.contact ? `${item.contact.first_name} ${item.contact.last_name}` : 'Unknown'}
                        </div>
                        <div className="text-xs text-slate-500 font-mono truncate max-w-[150px]">
                          {item.contact?.company_name || item.contact?.email || '—'}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border capitalize ${getChannelBadgeColor(item.channel)}`}>
                          {item.channel}
                        </span>
                      </td>
                      <td className="py-3 pr-4 max-w-[200px]">
                        <div className="text-slate-300 truncate text-xs">{item.subject || '—'}</div>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={getStatusBadgeVariant(item.status)}>
                          {item.status}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex gap-2 items-center text-xs">
                          {item.opened_at && (
                            <span title="Opened" className="text-cyan-400 flex items-center gap-0.5">
                              <Eye className="h-3 w-3" />
                            </span>
                          )}
                          {item.clicked_at && (
                            <span title="Clicked" className="text-amber-400 flex items-center gap-0.5">
                              <MousePointer className="h-3 w-3" />
                            </span>
                          )}
                          {item.replied_at && (
                            <span title="Replied" className="text-emerald-400 flex items-center gap-0.5">
                              <MessageSquare className="h-3 w-3" />
                            </span>
                          )}
                          {!item.opened_at && !item.clicked_at && !item.replied_at && item.status === 'sent' && (
                            <span className="text-slate-600">—</span>
                          )}
                          {item.status === 'pending' && (
                            <span title="Pending approval" className="text-amber-400">
                              <Clock className="h-3 w-3" />
                            </span>
                          )}
                          {(item.status === 'failed' || item.status === 'bounced') && (
                            <span title="Failed" className="text-red-400">
                              <AlertTriangle className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 text-right text-xs text-slate-500 font-mono whitespace-nowrap">
                        {item.scheduled_at ? new Date(item.scheduled_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Guide */}
      <Card className="border-violet-500/20 bg-violet-500/5 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-sm text-violet-300 flex items-center gap-2">
            <Zap className="h-4 w-4" /> Email Automation Setup Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-300 leading-relaxed">
          <div className="space-y-2">
            <h4 className="font-bold text-violet-300">📧 1. Configure Email Gateway</h4>
            <p>Go to <strong>Settings → API Credentials</strong> and add your Brevo API key. Brevo offers 300 free emails/day with no domain verification needed.</p>
          </div>
          <div className="space-y-2">
            <h4 className="font-bold text-violet-300">🤖 2. Run Your First Campaign</h4>
            <p>Go to <strong>Campaigns → New Campaign</strong>, define your target ICP, and launch. AI agents will research contacts and generate personalized outreach in minutes.</p>
          </div>
          <div className="space-y-2">
            <h4 className="font-bold text-violet-300">⚡ 3. Automate Queue Processing</h4>
            <p>Click <strong>"Trigger Queue"</strong> above to manually process approved emails. Or set up a Vercel cron at <code className="bg-slate-900 px-1 rounded">/api/cron/process-queue</code> to automate.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
