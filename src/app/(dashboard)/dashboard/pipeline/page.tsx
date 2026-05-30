'use client'

import * as React from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { createClient } from '@/lib/supabase/client'
import { updateDealStageAction, addDealAction } from '@/app/actions/deals'
import { GitBranch, Plus, Loader2, DollarSign, Briefcase } from 'lucide-react'

// Define the stages
const STAGES = [
  { id: 'discovery', name: 'Discovery', color: 'border-t-violet-500 bg-violet-500/5' },
  { id: 'qualification', name: 'Qualification', color: 'border-t-cyan-500 bg-cyan-500/5' },
  { id: 'proposal', name: 'Proposal Sent', color: 'border-t-amber-500 bg-amber-500/5' },
  { id: 'negotiation', name: 'Negotiation', color: 'border-t-rose-500 bg-rose-500/5' },
  { id: 'closed_won', name: 'Closed Won', color: 'border-t-emerald-500 bg-emerald-500/5' },
  { id: 'closed_lost', name: 'Closed Lost', color: 'border-t-red-500 bg-red-500/5' },
] as const

type StageId = typeof STAGES[number]['id']

interface Deal {
  id: string
  title: string
  value: number
  stage: StageId
  contact: {
    first_name: string | null
    last_name: string | null
    company_name: string | null
  }
}

export default function PipelinePage() {
  const { toast } = useToast()
  const [deals, setDeals] = React.useState<Deal[]>([])
  const [loading, setLoading] = React.useState(true)
  const [addOpen, setAddOpen] = React.useState(false)
  const [contacts, setContacts] = React.useState<{ id: string; first_name: string | null; last_name: string | null; company_name: string | null }[]>([])
  const [selectedContactId, setSelectedContactId] = React.useState('')
  const [dealTitle, setDealTitle] = React.useState('')
  const [dealValue, setDealValue] = React.useState('5000')
  const [dealStage, setDealStage] = React.useState<StageId>('discovery')
  const [actionLoading, setActionLoading] = React.useState(false)

  const supabase = createClient() as any

  const loadPipeline = React.useCallback(async () => {
    setLoading(true)
    
    // 1. Fetch Deals
    const { data: dealsData } = await supabase
      .from('deals')
      .select('id, title, value, stage, contact:contacts(first_name, last_name, company_name)')
      .order('created_at', { ascending: false })

    if (dealsData) {
      setDeals(dealsData as any[])
    }

    // 2. Fetch Contacts for deal association
    const { data: contactsData } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, company_name')
      .order('created_at', { ascending: false })

    if (contactsData) {
      setContacts(contactsData)
      if (contactsData.length > 0) {
        setSelectedContactId(contactsData[0].id)
      }
    }

    setLoading(false)
  }, [supabase])

  React.useEffect(() => {
    loadPipeline()
  }, [loadPipeline])

  // Simple drag overlay or drop simulator for testing (helps when standard drag libraries fail on touch screens)
  // Let's create an elegant stage transfer selector on each card, which is extremely reliable, responsive, and easy to use on mobile!
  const moveDeal = async (dealId: string, newStage: StageId) => {
    // Optimistic Update
    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stage: newStage } : d))
    )

    const result = await updateDealStageAction(dealId, newStage)
    if (result.error) {
      toast({ type: 'error', description: result.error })
      // Revert
      loadPipeline()
    } else {
      toast({ type: 'success', description: 'Pipeline updated.' })
    }
  }

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedContactId || !dealTitle) {
      toast({ type: 'error', description: 'Contact and Deal Title are required.' })
      return
    }

    setActionLoading(true)
    const val = Number(dealValue) || 0

    const result = await addDealAction(selectedContactId, dealTitle, val, dealStage)
    if (result.error) {
      toast({ type: 'error', description: result.error })
    } else {
      toast({ type: 'success', description: 'New deal added to pipeline.' })
      setAddOpen(false)
      setDealTitle('')
      setDealValue('5000')
      loadPipeline()
    }
    setActionLoading(false)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <GitBranch className="h-8 w-8 text-violet-400" /> Deals Pipeline
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Track deal progress, update values, and advance prospects along your CRM funnel
          </p>
        </div>
        <div>
          <Button variant="premium" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Deal
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="h-96 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 overflow-x-auto pb-4">
          {STAGES.map((col) => {
            const stageDeals = deals.filter((d) => d.stage === col.id)
            const stageTotal = stageDeals.reduce((sum, d) => sum + Number(d.value || 0), 0)

            return (
              <div
                key={col.id}
                className={`rounded-xl border-t-2 ${col.color} border-slate-800 bg-slate-950/20 p-4 min-w-[200px] flex flex-col h-[600px] shadow-lg`}
              >
                {/* Column Header */}
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-slate-200">{col.name}</h3>
                  <Badge variant="secondary" className="font-mono text-xxs">
                    {stageDeals.length}
                  </Badge>
                </div>
                <div className="text-xxs text-slate-500 font-mono mb-4 border-b border-slate-800/40 pb-2">
                  Total: ${stageTotal.toLocaleString()}
                </div>

                {/* Column Body Cards */}
                <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                  {stageDeals.map((deal) => (
                    <div
                      key={deal.id}
                      className="p-3 rounded-lg bg-slate-900 border border-slate-800/80 shadow-md flex flex-col gap-2 hover:border-slate-700/80 transition-all group"
                    >
                      <div className="text-xs font-bold text-slate-200 truncate">{deal.title}</div>
                      <div className="text-xxs text-slate-500 font-medium">
                        {deal.contact?.first_name || ''} {deal.contact?.last_name || ''}
                      </div>

                      <div className="flex justify-between items-center mt-1 pt-1.5 border-t border-slate-800/60">
                        <span className="text-xs font-mono font-semibold text-violet-400 flex items-center">
                          <DollarSign className="h-3 w-3 -mr-0.5" />
                          {deal.value.toLocaleString()}
                        </span>
                        
                        {/* Custom visual stage switch drop-down */}
                        <select
                          value={deal.stage}
                          onChange={(e) => moveDeal(deal.id, e.target.value as StageId)}
                          className="bg-slate-950 text-slate-400 text-xxs rounded px-1.5 py-0.5 border border-slate-800 outline-none hover:text-slate-200 transition-colors"
                        >
                          {STAGES.map((s) => (
                            <option key={s.id} value={s.id} className="bg-slate-950 text-slate-200">
                              Move to: {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Deal Dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} title="Create New Sales Deal">
        <form onSubmit={handleCreateDeal} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Target Contact</label>
            <select
              value={selectedContactId}
              onChange={(e) => setSelectedContactId(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:border-transparent transition-all"
            >
              {contacts.length === 0 ? (
                <option value="">No contacts found. Please add contacts first.</option>
              ) : (
                contacts.map((c) => (
                  <option key={c.id} value={c.id} className="bg-slate-950">
                    {c.first_name || ''} {c.last_name || ''} ({c.company_name || 'Individual'})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Deal Title</label>
            <Input
              placeholder="E.g., Dev Capacity Contract"
              value={dealTitle}
              onChange={(e) => setDealTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Deal Value ($)</label>
            <Input
              type="number"
              placeholder="5000"
              value={dealValue}
              onChange={(e) => setDealValue(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Initial Pipeline Stage</label>
            <select
              value={dealStage}
              onChange={(e) => setDealStage(e.target.value as StageId)}
              className="flex h-10 w-full rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:border-transparent transition-all"
            >
              {STAGES.map((s) => (
                <option key={s.id} value={s.id} className="bg-slate-950">
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="premium" disabled={actionLoading}>
              {actionLoading ? 'Creating...' : 'Create Deal'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
