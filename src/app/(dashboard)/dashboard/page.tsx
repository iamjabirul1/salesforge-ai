'use client'

import * as React from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import {
  TrendingUp,
  Users,
  Mail,
  Calendar,
  ArrowUpRight,
  Play,
  CheckCircle,
  AlertCircle,
  Clock,
  CheckSquare,
} from 'lucide-react'

interface Stats {
  totalLeads: number
  activeCampaigns: number
  emailsSent: number
  meetingsScheduled: number
  replyRate: string
  pipelineValue: number
}

interface RecentLead {
  id: string
  first_name: string
  last_name: string
  company_name: string
  status: string
  created_at: string
}

export default function DashboardOverviewPage() {
  const [stats, setStats] = React.useState<Stats>({
    totalLeads: 0,
    activeCampaigns: 0,
    emailsSent: 0,
    meetingsScheduled: 0,
    replyRate: '0%',
    pipelineValue: 0,
  })
  const [recentLeads, setRecentLeads] = React.useState<RecentLead[]>([])
  const [loading, setLoading] = React.useState(true)
  const supabase = createClient() as any

  React.useEffect(() => {
    async function loadDashboardData() {
      try {
        // Fetch stats counts
        const { count: contactsCount } = await supabase
          .from('contacts')
          .select('*', { count: 'exact', head: true })

        const { count: campaignsCount } = await supabase
          .from('campaigns')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active')

        const { data: queueData } = await supabase
          .from('outreach_queue')
          .select('status')

        const emailsSentCount = queueData?.filter((item: any) => item.status === 'sent').length ?? 0
        const repliesCount = queueData?.filter((item: any) => item.status === 'sent' && item.replied_at !== null).length ?? 0
        const replyRatePercent = emailsSentCount > 0 ? `${Math.round((repliesCount / emailsSentCount) * 100)}%` : '0%'

        const { data: dealsData } = await supabase
          .from('deals')
          .select('value')
          .not('stage', 'in', '("closed_won","closed_lost")')

        const pipelineVal = dealsData?.reduce((sum: number, item: any) => sum + Number(item.value || 0), 0) ?? 0

        const { data: meetingsData } = await supabase
          .from('activities')
          .select('*', { count: 'exact', head: true })
          .eq('type', 'meeting_scheduled')

        // Fetch recent leads
        const { data: recentContacts } = await supabase
          .from('contacts')
          .select('id, first_name, last_name, company_name, status, created_at')
          .order('created_at', { ascending: false })
          .limit(5)

        setStats({
          totalLeads: contactsCount ?? 0,
          activeCampaigns: campaignsCount ?? 0,
          emailsSent: emailsSentCount,
          meetingsScheduled: meetingsData?.length ?? 0,
          replyRate: replyRatePercent,
          pipelineValue: pipelineVal,
        })

        if (recentContacts) {
          setRecentLeads(
            recentContacts.map((c: any) => ({
              id: c.id,
              first_name: c.first_name ?? 'Lead',
              last_name: c.last_name ?? '',
              company_name: c.company_name ?? 'Individual',
              status: c.status,
              created_at: new Date(c.created_at).toLocaleDateString(),
            }))
          )
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [supabase])

  const kpis = [
    {
      title: 'Total Leads Ingested',
      value: stats.totalLeads,
      description: 'Prospects in directory',
      icon: Users,
      color: 'text-violet-400 bg-violet-500/10',
    },
    {
      title: 'Active Campaigns',
      value: stats.activeCampaigns,
      description: 'Running sequences',
      icon: Play,
      color: 'text-cyan-400 bg-cyan-500/10',
    },
    {
      title: 'Emails Sent',
      value: stats.emailsSent,
      description: 'Outreach emails delivered',
      icon: Mail,
      color: 'text-emerald-400 bg-emerald-500/10',
    },
    {
      title: 'Meetings Booked',
      value: stats.meetingsScheduled,
      description: 'Discovery calls set',
      icon: Calendar,
      color: 'text-amber-400 bg-amber-500/10',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Sales Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time status of your autonomous sales agent operations
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/campaigns/new">
            <Button variant="premium">
              Launch Campaign <ArrowUpRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon
          return (
            <Card key={idx} className="border-slate-800/80 bg-slate-950/40 backdrop-blur-md">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-medium text-slate-400">{kpi.title}</span>
                  <div className="text-3xl font-bold text-white tracking-tight">
                    {loading ? '...' : kpi.value}
                  </div>
                  <p className="text-xxs text-slate-500">{kpi.description}</p>
                </div>
                <div className={`p-3 rounded-lg ${kpi.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Middle Grid: Pipeline & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Pipeline Value */}
        <Card className="lg:col-span-1 border-slate-800/80 bg-slate-950/40 backdrop-blur-md">
          <CardHeader>
            <CardTitle>Pipeline Value</CardTitle>
            <CardDescription>Value of deals in discovery/negotiation</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col justify-center items-center py-6">
            <div className="text-4xl font-extrabold text-white tracking-tight bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent mb-2">
              ${loading ? '...' : stats.pipelineValue.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <TrendingUp className="h-3.5 w-3.5" />
              Reply Rate: {stats.replyRate}
            </div>
          </CardContent>
        </Card>

        {/* Recent Leads */}
        <Card className="lg:col-span-2 border-slate-800/80 bg-slate-950/40 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Leads</CardTitle>
              <CardDescription>Latest prospects added or processed</CardDescription>
            </div>
            <Link href="/dashboard/contacts">
              <Button variant="ghost" size="sm" className="text-xs text-slate-400">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-10 bg-slate-900/60 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : recentLeads.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-500">No leads found yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/60 text-slate-500 text-xs">
                      <th className="pb-3 font-semibold">Name</th>
                      <th className="pb-3 font-semibold">Company</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold text-right">Added</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {recentLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-900/10">
                        <td className="py-3 font-medium text-slate-200">
                          {lead.first_name} {lead.last_name}
                        </td>
                        <td className="py-3 text-slate-400">{lead.company_name}</td>
                        <td className="py-3">
                          <Badge
                            variant={
                              lead.status === 'replied'
                                ? 'success'
                                : lead.status === 'contacted'
                                ? 'info'
                                : 'default'
                            }
                          >
                            {lead.status}
                          </Badge>
                        </td>
                        <td className="py-3 text-right text-slate-500 font-mono text-xs">
                          {lead.created_at}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Grid: Agent Activity / Approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Agent Activity Feed */}
        <Card className="border-slate-800/80 bg-slate-950/40 backdrop-blur-md">
          <CardHeader>
            <CardTitle>Autonomous Agent Activity</CardTitle>
            <CardDescription>Live log of sales agents operation logs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3 items-start border-l-2 border-violet-500/30 pl-4 py-1">
              <div className="p-1 rounded bg-violet-500/10 text-violet-400 mt-0.5">
                <CheckSquare className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 space-y-0.5">
                <p className="text-sm font-medium text-slate-200">Email Writer Agent Completed</p>
                <p className="text-xs text-slate-400">
                  Generated personalized cold email for CEO of TechStart Solutions.
                </p>
                <span className="text-xxs text-slate-500 font-mono">10 minutes ago</span>
              </div>
            </div>
            <div className="flex gap-3 items-start border-l-2 border-cyan-500/30 pl-4 py-1">
              <div className="p-1 rounded bg-cyan-500/10 text-cyan-400 mt-0.5">
                <Users className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 space-y-0.5">
                <p className="text-sm font-medium text-slate-200">Research Agent Finished</p>
                <p className="text-xs text-slate-400">
                  Enriched contact information for 12 prospects in Austin, TX area.
                </p>
                <span className="text-xxs text-slate-500 font-mono">24 minutes ago</span>
              </div>
            </div>
            <div className="flex gap-3 items-start border-l-2 border-amber-500/30 pl-4 py-1">
              <div className="p-1 rounded bg-amber-500/10 text-amber-400 mt-0.5">
                <AlertCircle className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 space-y-0.5">
                <p className="text-sm font-medium text-slate-200">Objection Handler Escalated</p>
                <p className="text-xs text-slate-400">
                  Prospect replied with request for custom integration detail. Takeover needed.
                </p>
                <span className="text-xxs text-slate-500 font-mono">1 hour ago</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Approvals Card */}
        <Card className="border-slate-800/80 bg-slate-950/40 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Approvals Needed</CardTitle>
              <CardDescription>Verify emails and proposals before sending</CardDescription>
            </div>
            <Link href="/dashboard/approvals">
              <Button variant="ghost" size="sm" className="text-xs text-slate-400">
                Manage Queue
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-slate-900/30 border border-slate-800/50 flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-sm font-medium text-slate-200">Send Cold Email: Sarah Connor</div>
                <div className="text-xs text-slate-400 font-mono">Company: Cyberdyne Systems</div>
              </div>
              <Badge variant="warning">
                <Clock className="h-3 w-3 mr-1" /> Pending
              </Badge>
            </div>

            <div className="p-4 rounded-lg bg-slate-900/30 border border-slate-800/50 flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-sm font-medium text-slate-200">Send SOW Proposal: John Miller</div>
                <div className="text-xs text-slate-400 font-mono">Company: Miller Dev Shop</div>
              </div>
              <Badge variant="warning">
                <Clock className="h-3 w-3 mr-1" /> Pending
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
