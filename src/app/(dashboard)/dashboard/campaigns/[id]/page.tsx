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
  Loader2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
} from 'lucide-react'

interface CampaignDetail {
  id: string
  name: string
  status: string
  target_icp: any
  stats: {
    sent: number
    opened: number
    clicked: number
    replied: number
  }
  created_at: string
}

interface CampaignLead {
  id: string
  status: string
  contact: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string
    company_name: string | null
    job_title: string | null
  }
}

export default function CampaignDetailPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const { toast } = useToast()
  
  const [campaign, setCampaign] = React.useState<CampaignDetail | null>(null)
  const [leads, setLeads] = React.useState<CampaignLead[]>([])
  const [loading, setLoading] = React.useState(true)
  const supabase = createClient()

  const loadData = React.useCallback(async () => {
    setLoading(true)

    // 1. Fetch Campaign
    const { data: campaignData, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single()

    if (campaignError || !campaignData) {
      toast({ type: 'error', description: 'Campaign not found.' })
      router.push('/dashboard/campaigns')
      return
    }

    setCampaign(campaignData as CampaignDetail)

    // 2. Fetch Campaign Leads from outreach_queue
    const { data: queueData } = await supabase
      .from('outreach_queue')
      .select('id, status, contact:contacts(id, first_name, last_name, email, company_name, job_title)')
      .eq('campaign_id', id)
      .order('created_at', { ascending: false })

    if (queueData) {
      setLeads(
        queueData.map((item: any) => ({
          id: item.id,
          status: item.status,
          contact: {
            id: item.contact.id,
            first_name: item.contact.first_name,
            last_name: item.contact.last_name,
            email: item.contact.email,
            company_name: item.contact.company_name,
            job_title: item.contact.job_title,
          },
        }))
      )
    }

    setLoading(false)
  }, [id, supabase, router, toast])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  return (
    <div className="space-y-8">
      {/* Back link */}
      <div>
        <Link
          href="/dashboard/campaigns"
          className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" /> Back to Campaigns
        </Link>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
        </div>
      ) : !campaign ? (
        <div className="text-center py-20 text-slate-500">Campaign not found.</div>
      ) : (
        <div className="space-y-8">
          {/* Main info header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
                {campaign.name}
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Targeting ICP: {campaign.target_icp?.industries?.join(', ') || 'Global'}
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={loadData}>
                <RefreshCw className="h-4 w-4 mr-2" /> Refresh
              </Button>
              <Badge variant={campaign.status === 'active' ? 'success' : 'warning'}>
                {campaign.status}
              </Badge>
            </div>
          </div>

          {/* Stats Analytics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-slate-800/80 bg-slate-950/40 backdrop-blur-md">
              <CardContent className="p-6">
                <div className="text-xs font-semibold text-slate-400 uppercase">Emails Sent</div>
                <div className="text-3xl font-bold text-white tracking-tight mt-1">
                  {campaign.stats?.sent || 0}
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-800/80 bg-slate-950/40 backdrop-blur-md">
              <CardContent className="p-6">
                <div className="text-xs font-semibold text-slate-400 uppercase">Emails Opened</div>
                <div className="text-3xl font-bold text-white tracking-tight mt-1">
                  {campaign.stats?.opened || 0}
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-800/80 bg-slate-950/40 backdrop-blur-md">
              <CardContent className="p-6">
                <div className="text-xs font-semibold text-slate-400 uppercase">Open Rate</div>
                <div className="text-3xl font-bold text-white tracking-tight mt-1">
                  {campaign.stats?.sent > 0
                    ? `${Math.round((campaign.stats.opened / campaign.stats.sent) * 100)}%`
                    : '0%'}
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-800/80 bg-slate-950/40 backdrop-blur-md">
              <CardContent className="p-6">
                <div className="text-xs font-semibold text-slate-400 uppercase">Replies</div>
                <div className="text-3xl font-bold text-white tracking-tight mt-1">
                  {campaign.stats?.replied || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Outreach targeted list */}
          <Card className="border-slate-800/80 bg-slate-950/40 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-md">Campaign Prospects & Queue Status</CardTitle>
              <CardDescription>Chronological list of emails sent or held for review</CardDescription>
            </CardHeader>
            <CardContent>
              {leads.length === 0 ? (
                <div className="text-center py-20 text-slate-500 text-sm">
                  No outreach history found for this campaign yet. AI Agent is processing...
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 text-xs">
                        <th className="pb-3 font-semibold">Name</th>
                        <th className="pb-3 font-semibold">Email</th>
                        <th className="pb-3 font-semibold">Company & Job Title</th>
                        <th className="pb-3 font-semibold">Queue Status</th>
                        <th className="pb-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 text-slate-300">
                      {leads.map((l) => (
                        <tr key={l.id} className="hover:bg-slate-900/10">
                          <td className="py-4 font-semibold text-slate-200">
                            {l.contact.first_name || ''} {l.contact.last_name || ''}
                          </td>
                          <td className="py-4 text-slate-400 font-mono text-xs">{l.contact.email}</td>
                          <td className="py-4">
                            <div className="text-slate-300 font-medium">
                              {l.contact.company_name || 'Individual'}
                            </div>
                            <div className="text-slate-500 text-xxs mt-0.5">
                              {l.contact.job_title || 'N/A'}
                            </div>
                          </td>
                          <td className="py-4">
                            <Badge
                              variant={
                                l.status === 'sent'
                                  ? 'success'
                                  : l.status === 'pending'
                                  ? 'warning'
                                  : l.status === 'rejected'
                                  ? 'destructive'
                                  : 'default'
                              }
                            >
                              {l.status === 'pending' ? 'Holding for Approval' : l.status}
                            </Badge>
                          </td>
                          <td className="py-4 text-right">
                            <Link href={`/dashboard/contacts/${l.contact.id}`}>
                              <Button variant="ghost" size="sm" className="text-xs">
                                <Eye className="h-3.5 w-3.5 mr-1" /> View Timeline
                              </Button>
                            </Link>
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
      )}
    </div>
  )
}
