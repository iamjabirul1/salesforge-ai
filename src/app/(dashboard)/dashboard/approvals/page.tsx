'use client'

import * as React from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { approveAction, rejectAction } from '@/app/actions/approvals'
import { createClient } from '@/lib/supabase/client'
import { complianceChecker } from '@/lib/social/compliance'
import type { SocialPlatform } from '@/lib/social/platform-rules'
import {
  CheckSquare, Check, X, Loader2, Clock, AlertTriangle,
  Flame, ThermometerSun, Snowflake, FlipHorizontal, ShieldCheck, ShieldAlert,
  Lightbulb
} from 'lucide-react'

interface ApprovalItem {
  id: string
  action_type: string
  status: string
  context: {
    outreach_id?: string
    contact_id?: string
    prospect_name?: string
    company_name?: string
    subject?: string
    body?: string
    subject_b?: string
    body_b?: string
    original_reply?: string
    category?: string
    escalated?: boolean
    reason?: string
    channel?: string
    social_url?: string
    lead_score?: number
    lead_tag?: 'HOT' | 'WARM' | 'COLD'
    hooks?: Array<{ type: string; text: string; confidence: number }>
    has_ab_variant?: boolean
  }
  created_at: string
}

export default function ApprovalsPage() {
  const { toast } = useToast()
  const [items, setItems] = React.useState<ApprovalItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selectedItem, setSelectedItem] = React.useState<ApprovalItem | null>(null)
  const [editedSubject, setEditedSubject] = React.useState('')
  const [editedBody, setEditedBody] = React.useState('')
  const [activeVariant, setActiveVariant] = React.useState<'A' | 'B'>('A')
  const [actionLoading, setActionLoading] = React.useState(false)
  const supabase = createClient() as any

  const loadApprovals = React.useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('approval_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      toast({ type: 'error', description: 'Failed to load approvals queue.' })
    } else if (data) {
      setItems(data as ApprovalItem[])
      if (data.length > 0) {
        selectItemData(data[0] as ApprovalItem, 'A')
      } else {
        setSelectedItem(null)
      }
    }
    setLoading(false)
  }, [supabase, toast])

  React.useEffect(() => {
    loadApprovals()
  }, [loadApprovals])

  const selectItemData = (item: ApprovalItem, variant: 'A' | 'B' = 'A') => {
    setSelectedItem(item)
    setActiveVariant(variant)
    if (variant === 'B' && item.context?.body_b) {
      setEditedSubject(item.context?.subject_b || item.context?.subject || '')
      setEditedBody(item.context?.body_b || '')
    } else {
      setEditedSubject(item.context?.subject || '')
      setEditedBody(item.context?.body || '')
    }
  }

  const selectItem = (item: ApprovalItem) => selectItemData(item, 'A')

  const switchVariant = (variant: 'A' | 'B') => {
    if (!selectedItem) return
    selectItemData(selectedItem, variant)
  }

  const handleApprove = async () => {
    if (!selectedItem) return
    setActionLoading(true)

    const isSocial = selectedItem.action_type === 'send_social_message'
    const channel = selectedItem.context?.channel || 'email'

    const result = await approveAction(selectedItem.id, editedSubject, editedBody)

    if (result.error) {
      toast({ type: 'error', description: result.error })
    } else {
      if (isSocial) {
        navigator.clipboard.writeText(editedBody)
        toast({
          type: 'success',
          description: `Message copied! Approved and marked as sent on ${channel.toUpperCase()}.`,
        })
        if (selectedItem.context?.social_url) {
          window.open(selectedItem.context.social_url, '_blank')
        }
      } else {
        toast({ type: 'success', description: 'Outreach email approved and sent!' })
      }
      loadApprovals()
    }
    setActionLoading(false)
  }

  const handleReject = async () => {
    if (!selectedItem) return
    setActionLoading(true)
    const result = await rejectAction(selectedItem.id)
    if (result.error) {
      toast({ type: 'error', description: result.error })
    } else {
      toast({ type: 'success', description: 'Draft rejected.' })
      loadApprovals()
    }
    setActionLoading(false)
  }

  const handleCopyOnly = () => {
    if (!selectedItem) return
    navigator.clipboard.writeText(editedBody)
    toast({ type: 'success', description: 'Message copied to clipboard!' })
  }

  // Compliance check for the current message
  const complianceResult = React.useMemo(() => {
    if (!selectedItem || !editedBody) return null
    const channel = (selectedItem.context?.channel || 'email') as SocialPlatform
    return complianceChecker.checkCompliance(editedBody, channel)
  }, [selectedItem, editedBody])

  const leadTagConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
    HOT: { icon: Flame, color: 'text-red-400 bg-red-500/10 border-red-500/20', label: 'HOT' },
    WARM: { icon: ThermometerSun, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', label: 'WARM' },
    COLD: { icon: Snowflake, color: 'text-sky-400 bg-sky-500/10 border-sky-500/20', label: 'COLD' },
  }

  const channelBadgeColor: Record<string, string> = {
    email: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    linkedin: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    x: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
    facebook: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
          <CheckSquare className="h-8 w-8 text-violet-400" /> Human Approval Queue
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Review, edit A/B variants, check compliance, and authorize AI-generated outbound messages
        </p>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="h-96 rounded-xl border border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-500 gap-3">
          <CheckCircle2Icon className="h-16 w-16 text-slate-700" />
          <h3 className="text-lg font-semibold text-slate-400">All caught up!</h3>
          <p className="text-sm max-w-xs text-center text-slate-500">
            No pending approvals. Launch a campaign to generate new outreach for review.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Approval List */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-sm font-semibold text-slate-300">Pending Review ({items.length})</h3>
            <div className="space-y-3 max-h-[650px] overflow-y-auto pr-2">
              {items.map((item) => {
                const channel = item.context?.channel || 'email'
                const tag = item.context?.lead_tag
                const TagIcon = tag ? leadTagConfig[tag]?.icon : null
                const score = item.context?.lead_score
                return (
                  <button
                    key={item.id}
                    onClick={() => selectItem(item)}
                    className={`w-full text-left p-4 rounded-xl border transition-all duration-200 hover:bg-slate-900/20 active:scale-[0.99] flex flex-col gap-2 ${
                      selectedItem?.id === item.id
                        ? 'border-violet-500 bg-slate-900/40 shadow-lg shadow-violet-500/5'
                        : 'border-slate-800 bg-slate-950/40'
                    }`}
                  >
                    <div className="flex justify-between items-start w-full">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border capitalize ${channelBadgeColor[channel] || channelBadgeColor.email}`}>
                        {channel}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {tag && TagIcon && (
                          <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded border flex items-center gap-0.5 ${leadTagConfig[tag].color}`}>
                            <TagIcon className="h-2.5 w-2.5" />
                            {tag}
                          </span>
                        )}
                        {score !== undefined && (
                          <span className="text-[10px] text-slate-500 font-mono">{score}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-sm font-bold text-slate-200 truncate">
                      {item.context?.prospect_name || 'Prospect'}
                    </div>
                    <div className="text-xs text-slate-500 font-mono truncate">
                      {item.context?.company_name || 'Company'}
                    </div>
                    {item.context?.has_ab_variant && (
                      <div className="flex items-center gap-1 text-[10px] text-violet-400">
                        <FlipHorizontal className="h-3 w-3" />
                        A/B Variants Available
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Details & Editor Panel */}
          {selectedItem && (
            <div className="lg:col-span-2 space-y-4">
              <Card className="border-slate-800/80 bg-slate-950/40 backdrop-blur-md">
                <CardHeader className="border-b border-slate-800/40">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        Review Outreach to {selectedItem.context.prospect_name}
                      </CardTitle>
                      <CardDescription className="text-xs font-mono flex items-center gap-3 mt-1">
                        <span>{selectedItem.context.company_name}</span>
                        <span className="text-slate-600">·</span>
                        <span className={`capitalize px-2 py-0.5 rounded border text-[10px] font-bold ${channelBadgeColor[selectedItem.context?.channel || 'email'] || ''}`}>
                          {selectedItem.context?.channel || 'email'}
                        </span>
                        {selectedItem.context?.lead_tag && (() => {
                          const tag = selectedItem.context.lead_tag!
                          const cfg = leadTagConfig[tag]
                          const Icon = cfg.icon
                          return (
                            <span className={`px-2 py-0.5 rounded border text-[10px] font-bold flex items-center gap-1 ${cfg.color}`}>
                              <Icon className="h-3 w-3" />
                              {tag} · {selectedItem.context.lead_score}/100
                            </span>
                          )
                        })()}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-5">

                  {/* Personalization Hooks */}
                  {selectedItem.context?.hooks && selectedItem.context.hooks.length > 0 && (
                    <div className="p-3 rounded-lg bg-violet-500/5 border border-violet-500/20">
                      <div className="text-xs font-semibold text-violet-300 flex items-center gap-1.5 mb-2">
                        <Lightbulb className="h-3.5 w-3.5" /> AI Personalization Hooks Used
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedItem.context.hooks.map((hook, i) => (
                          <span key={i} className="text-[11px] px-2 py-1 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20">
                            {hook.text}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* A/B Variant Switcher */}
                  {selectedItem.context?.has_ab_variant && selectedItem.context?.body_b && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => switchVariant('A')}
                        className={`px-4 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                          activeVariant === 'A'
                            ? 'bg-violet-500 border-violet-500 text-white'
                            : 'border-slate-700 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        Variant A
                      </button>
                      <button
                        onClick={() => switchVariant('B')}
                        className={`px-4 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                          activeVariant === 'B'
                            ? 'bg-violet-500 border-violet-500 text-white'
                            : 'border-slate-700 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        Variant B
                      </button>
                      <span className="text-xs text-slate-500 flex items-center ml-2">
                        <FlipHorizontal className="h-3.5 w-3.5 mr-1" /> Select which variant to send
                      </span>
                    </div>
                  )}

                  {/* Context for replies */}
                  {selectedItem.action_type === 'send_email_reply' && (
                    <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
                      <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" /> Prospect Reply Received:
                      </div>
                      <blockquote className="text-sm italic text-slate-300 pl-3 border-l border-slate-700">
                        &quot;{selectedItem.context.original_reply}&quot;
                      </blockquote>
                      {selectedItem.context.escalated && (
                        <div className="text-xs text-red-400 font-medium flex items-center gap-1.5 mt-2 bg-red-950/20 p-2 rounded border border-red-900/40">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Escalated: {selectedItem.context.reason}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Subject line (email only) */}
                  {selectedItem.action_type !== 'send_social_message' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400">Email Subject</label>
                      <Input
                        value={editedSubject}
                        onChange={(e: any) => setEditedSubject(e.target.value)}
                        placeholder="Subject line"
                        disabled={actionLoading}
                      />
                    </div>
                  )}

                  {/* Body textarea */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-slate-400">
                        Message Body {activeVariant && selectedItem.context?.has_ab_variant ? `(Variant ${activeVariant})` : ''}
                      </label>
                      <Button variant="ghost" size="sm" onClick={handleCopyOnly} className="text-xs text-slate-400 hover:text-white h-7">
                        Copy
                      </Button>
                    </div>
                    <textarea
                      value={editedBody}
                      onChange={(e: any) => setEditedBody(e.target.value)}
                      className="flex min-h-[200px] w-full rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:border-transparent transition-all resize-none"
                      placeholder="Write your outreach message..."
                      disabled={actionLoading}
                    />
                    <div className="text-xs text-slate-600 text-right font-mono">
                      {editedBody.length} chars
                    </div>
                  </div>

                  {/* Compliance checker panel */}
                  {complianceResult && (
                    <div className={`p-3 rounded-lg border space-y-2 ${
                      complianceResult.is_compliant
                        ? 'border-emerald-500/20 bg-emerald-500/5'
                        : 'border-amber-500/20 bg-amber-500/5'
                    }`}>
                      <div className={`text-xs font-semibold flex items-center gap-1.5 ${
                        complianceResult.is_compliant ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        {complianceResult.is_compliant
                          ? <><ShieldCheck className="h-3.5 w-3.5" /> Compliant with {selectedItem.context?.channel?.toUpperCase() || 'EMAIL'} platform rules</>
                          : <><ShieldAlert className="h-3.5 w-3.5" /> Compliance Issues Detected</>
                        }
                      </div>
                      {complianceResult.compliance_flags.length > 0 && (
                        <div className="space-y-1.5">
                          {complianceResult.compliance_flags.map((flag, i) => (
                            <div key={i} className={`text-[11px] flex items-start gap-1.5 ${
                              flag.severity === 'error' ? 'text-red-300' : 'text-amber-300'
                            }`}>
                              <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              <span>{flag.message}</span>
                            </div>
                          ))}
                          {complianceResult.suggestions.map((s, i) => (
                            <div key={`s${i}`} className="text-[11px] text-slate-400 flex items-start gap-1.5 mt-1 pl-4">
                              <span className="text-violet-400">→</span>
                              <span>{s.fix}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-500 font-mono">
                        Platform limit: {complianceResult.platform_rules.max_length} chars · {complianceResult.platform_rules.max_daily_messages} DMs/day
                      </div>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="flex justify-between p-6 border-t border-slate-800/40">
                  <Button
                    variant="ghost"
                    className="text-red-400 hover:bg-red-950/20 hover:text-red-300"
                    onClick={handleReject}
                    disabled={actionLoading}
                  >
                    <X className="h-4 w-4 mr-2" /> Reject
                  </Button>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => loadApprovals()} disabled={actionLoading}>
                      Cancel
                    </Button>
                    <Button
                      variant="premium"
                      onClick={handleApprove}
                      disabled={actionLoading || (complianceResult !== null && !complianceResult.is_compliant && complianceResult.violations.length > 0)}
                    >
                      {actionLoading ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</>
                      ) : selectedItem.action_type === 'send_social_message' ? (
                        <><Check className="h-4 w-4 mr-2" /> Copy &amp; Open Profile</>
                      ) : (
                        <><Check className="h-4 w-4 mr-2" /> Approve &amp; Send</>
                      )}
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CheckCircle2Icon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}
