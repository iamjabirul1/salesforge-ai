'use client'

import * as React from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { approveAction, rejectAction } from '@/app/actions/approvals'
import { createClient } from '@/lib/supabase/client'
import { CheckSquare, Check, X, Edit, Loader2, Sparkles, Clock, AlertTriangle } from 'lucide-react'

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
    original_reply?: string
    category?: string
    escalated?: boolean
    reason?: string
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
        setSelectedItem(data[0] as ApprovalItem)
        setEditedSubject(data[0].context?.subject || '')
        setEditedBody(data[0].context?.body || '')
      } else {
        setSelectedItem(null)
      }
    }
    setLoading(false)
  }, [supabase, toast])

  React.useEffect(() => {
    loadApprovals()
  }, [loadApprovals])

  const selectItem = (item: ApprovalItem) => {
    setSelectedItem(item)
    setEditedSubject(item.context?.subject || '')
    setEditedBody(item.context?.body || '')
  }

  const handleApprove = async () => {
    if (!selectedItem) return
    setActionLoading(true)

    const result = await approveAction(selectedItem.id, editedSubject, editedBody)

    if (result.error) {
      toast({ type: 'error', description: result.error })
    } else {
      toast({ type: 'success', description: 'Outreach email approved and sent successfully!' })
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
      toast({ type: 'success', description: 'Outreach draft rejected.' })
      loadApprovals()
    }
    setActionLoading(false)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
          <CheckSquare className="h-8 w-8 text-violet-400" /> Human Approval Queue
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Review, edit, and authorize AI-generated outbound messages before delivery
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
            No pending outreach campaigns or emails require manual review at the moment.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Approval List */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-sm font-semibold text-slate-300">Pending Review ({items.length})</h3>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {items.map((item) => (
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
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {item.action_type === 'send_email_reply' ? 'Reply Draft' : 'Cold Outreach'}
                    </span>
                    <Badge variant={item.context?.escalated ? 'destructive' : 'warning'}>
                      {item.context?.escalated ? 'Escalated' : 'Pending'}
                    </Badge>
                  </div>
                  <div className="text-sm font-bold text-slate-200 truncate">
                    {item.context?.prospect_name || 'Prospect'}
                  </div>
                  <div className="text-xs text-slate-500 font-mono truncate">
                    {item.context?.company_name || 'Company'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Details & Editor Panel */}
          {selectedItem && (
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-slate-800/80 bg-slate-950/40 backdrop-blur-md">
                <CardHeader className="border-b border-slate-800/40">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <CardTitle className="text-lg">
                        {selectedItem.action_type === 'send_email_reply'
                          ? `Review Reply to ${selectedItem.context.prospect_name}`
                          : `Review Cold Outreach to ${selectedItem.context.prospect_name}`}
                      </CardTitle>
                      <CardDescription className="text-xs font-mono">
                        Company: {selectedItem.context.company_name} | Channel: Email
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                  {/* Context for replies */}
                  {selectedItem.action_type === 'send_email_reply' && (
                    <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
                      <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" /> Prospect Reply Received:
                      </div>
                      <blockquote className="text-sm italic text-slate-300 pl-3 border-l border-slate-700 font-serif">
                        &quot;{selectedItem.context.original_reply}&quot;
                      </blockquote>
                      {selectedItem.context.escalated && (
                        <div className="text-xs text-red-400 font-medium flex items-center gap-1.5 mt-2 bg-red-950/20 p-2 rounded border border-red-900/40">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Escalated Reason: {selectedItem.context.reason}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Subject line input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Email Subject</label>
                    <Input
                      value={editedSubject}
                      onChange={(e: any) => setEditedSubject(e.target.value)}
                      placeholder="Email Subject Line"
                      disabled={actionLoading}
                    />
                  </div>

                  {/* Body textarea */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Email Body</label>
                    <textarea
                      value={editedBody}
                      onChange={(e: any) => setEditedBody(e.target.value)}
                      className="flex min-h-[250px] w-full rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:border-transparent transition-all"
                      placeholder="Write your email body..."
                      disabled={actionLoading}
                    />
                  </div>
                </CardContent>

                <CardFooter className="flex justify-between p-6 border-t border-slate-800/40">
                  <Button variant="ghost" className="text-red-400 hover:bg-red-950/20 hover:text-red-300" onClick={handleReject} disabled={actionLoading}>
                    <X className="h-4 w-4 mr-2" /> Reject Draft
                  </Button>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => loadApprovals()} disabled={actionLoading}>
                      Cancel
                    </Button>
                    <Button variant="premium" onClick={handleApprove} disabled={actionLoading}>
                      {actionLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" /> Approve & Send
                        </>
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
