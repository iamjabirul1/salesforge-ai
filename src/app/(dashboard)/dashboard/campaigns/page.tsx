'use client'

import * as React from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { createClient } from '@/lib/supabase/client'
import { Mail, Plus, Play, Pause, Trash2, Loader2, ArrowUpRight, BarChart2 } from 'lucide-react'

interface Campaign {
  id: string
  name: string
  status: 'draft' | 'active' | 'paused' | 'completed'
  target_icp: any
  stats: {
    sent: number
    opened: number
    clicked: number
    replied: number
  }
  created_at: string
}

export default function CampaignsPage() {
  const { toast } = useToast()
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([])
  const [loading, setLoading] = React.useState(true)
  const supabase = createClient() as any

  const loadCampaigns = React.useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('campaigns')
      .select('id, name, status, target_icp, stats, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      toast({ type: 'error', description: 'Failed to load campaigns.' })
    } else if (data) {
      setCampaigns(data as Campaign[])
    }
    setLoading(false)
  }, [supabase, toast])

  React.useEffect(() => {
    loadCampaigns()
  }, [loadCampaigns])

  const toggleCampaignStatus = async (campaign: Campaign) => {
    const newStatus = campaign.status === 'active' ? 'paused' : 'active'
    const { error } = await supabase
      .from('campaigns')
      .update({ status: newStatus })
      .eq('id', campaign.id)

    if (error) {
      toast({ type: 'error', description: error.message })
    } else {
      toast({ type: 'success', description: `Campaign status updated to ${newStatus}.` })
      setCampaigns((prev) =>
        prev.map((c) => (c.id === campaign.id ? { ...c, status: newStatus } : c))
      )
    }
  }

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign? All outreach queue entries will be deleted.')) return

    const { error } = await supabase.from('campaigns').delete().eq('id', id)
    if (error) {
      toast({ type: 'error', description: error.message })
    } else {
      toast({ type: 'success', description: 'Campaign deleted.' })
      setCampaigns((prev) => prev.filter((c) => c.id !== id))
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <Mail className="h-8 w-8 text-violet-400" /> Outreach Campaigns
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Build, launch, and monitor automated outbound sales sequences
          </p>
        </div>
        <div>
          <Link href="/dashboard/campaigns/new">
            <Button variant="premium">
              <Plus className="h-4 w-4 mr-2" /> New Campaign
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="h-96 rounded-xl border border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-500 gap-3">
          <Mail className="h-16 w-16 text-slate-700" />
          <h3 className="text-lg font-semibold text-slate-400">No campaigns created</h3>
          <p className="text-sm max-w-xs text-center text-slate-500">
            Get started by launching your first AI-driven sales outreach campaign.
          </p>
          <Link href="/dashboard/campaigns/new" className="mt-2">
            <Button variant="premium">
              Launch Wizard
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {campaigns.map((c) => {
            const hasStats = c.stats
            const sent = hasStats?.sent || 0
            const opened = hasStats?.opened || 0
            const replied = hasStats?.replied || 0
            const openRate = sent > 0 ? `${Math.round((opened / sent) * 100)}%` : '0%'
            const replyRate = sent > 0 ? `${Math.round((replied / sent) * 100)}%` : '0%'

            return (
              <Card key={c.id} className="border-slate-800/80 bg-slate-950/40 backdrop-blur-md relative group flex flex-col justify-between">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1 max-w-[70%]">
                      <Link
                        href={`/dashboard/campaigns/${c.id}`}
                        className="hover:text-violet-400 transition-colors text-lg font-bold text-white block truncate"
                      >
                        {c.name}
                      </Link>
                      <CardDescription className="text-xxs font-mono truncate">
                        ICP: {c.target_icp?.industries?.join(', ') || 'Global'}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={
                        c.status === 'active'
                          ? 'success'
                          : c.status === 'paused'
                          ? 'warning'
                          : c.status === 'completed'
                          ? 'info'
                          : 'default'
                      }
                    >
                      {c.status}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Campaign stats panel */}
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-slate-900/40 border border-slate-800/80 text-center">
                    <div>
                      <div className="text-slate-500 text-xxs font-semibold uppercase">Sent</div>
                      <div className="text-lg font-bold text-slate-200">{sent}</div>
                    </div>
                    <div>
                      <div className="text-slate-500 text-xxs font-semibold uppercase">Open Rate</div>
                      <div className="text-lg font-bold text-slate-200">{openRate}</div>
                    </div>
                    <div>
                      <div className="text-slate-500 text-xxs font-semibold uppercase">Replies</div>
                      <div className="text-lg font-bold text-slate-200">{replied}</div>
                    </div>
                  </div>
                </CardContent>

                <div className="p-4 border-t border-slate-800/60 flex items-center justify-between mt-auto">
                  <button
                    onClick={() => handleDeleteCampaign(c.id)}
                    className="text-slate-500 hover:text-red-400 p-2 rounded hover:bg-red-950/20 transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <div className="flex gap-2">
                    <Link href={`/dashboard/campaigns/${c.id}`}>
                      <Button variant="ghost" size="sm" className="text-xs">
                        <BarChart2 className="h-3.5 w-3.5 mr-1" /> Analytics
                      </Button>
                    </Link>

                    {c.status !== 'completed' && (
                      <Button variant="outline" size="sm" onClick={() => toggleCampaignStatus(c)}>
                        {c.status === 'active' ? (
                          <>
                            <Pause className="h-3.5 w-3.5 mr-1" /> Pause
                          </>
                        ) : (
                          <>
                            <Play className="h-3.5 w-3.5 mr-1" /> Launch
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
