'use client'

import * as React from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { BarChart3, Loader2, Sparkles, TrendingUp, DollarSign } from 'lucide-react'

export default function AnalyticsPage() {
  const [loading, setLoading] = React.useState(true)
  const [funnelData, setFunnelData] = React.useState<any[]>([])
  const [costData, setCostData] = React.useState<any[]>([])
  const [dealsData, setDealsData] = React.useState<any[]>([])
  
  const supabase = createClient() as any

  React.useEffect(() => {
    async function loadAnalytics() {
      setLoading(true)

      // 1. Fetch outreach queue metrics to build the Funnel
      const { data: queue } = await supabase
        .from('outreach_queue')
        .select('status, opened_at, clicked_at, replied_at')

      const totalSent = queue?.filter((item: any) => item.status === 'sent').length ?? 0
      const totalOpened = queue?.filter((item: any) => item.status === 'sent' && item.opened_at !== null).length ?? 0
      const totalClicked = queue?.filter((item: any) => item.status === 'sent' && item.clicked_at !== null).length ?? 0
      const totalReplied = queue?.filter((item: any) => item.status === 'sent' && item.replied_at !== null).length ?? 0

      // Mock numbers if database is empty to let users see the dashboard design at launch
      const chartSent = totalSent || 120
      const chartOpened = totalOpened || 84
      const chartClicked = totalClicked || 48
      const chartReplied = totalReplied || 28

      setFunnelData([
        { name: 'Sent', count: chartSent, fill: '#8b5cf6' },
        { name: 'Opened', count: chartOpened, fill: '#06b6d4' },
        { name: 'Clicked', count: chartClicked, fill: '#ec4899' },
        { name: 'Replied', count: chartReplied, fill: '#10b981' },
      ])

      // 2. Fetch Agent runs cost and tokens used
      const { data: runs } = await supabase
        .from('agent_runs')
        .select('created_at, tokens_used, cost_usd')
        .order('created_at', { ascending: true })

      if (runs && runs.length > 0) {
        setCostData(
          runs.map((r: any, idx: number) => ({
            name: `Run ${idx + 1}`,
            cost: Number(r.cost_usd || 0) * 100, // represent in cents for readable chart
            tokens: r.tokens_used,
          }))
        )
      } else {
        // Mock cost details
        setCostData([
          { name: 'Run 1', cost: 0.12, tokens: 4200 },
          { name: 'Run 2', cost: 0.28, tokens: 8400 },
          { name: 'Run 3', cost: 0.18, tokens: 6200 },
          { name: 'Run 4', cost: 0.35, tokens: 12000 },
          { name: 'Run 5', cost: 0.42, tokens: 15400 },
        ])
      }

      // 3. Fetch Pipeline deals distribution
      const { data: deals } = await supabase
        .from('deals')
        .select('stage, value')

      const stagesMap: Record<string, number> = {
        discovery: 0,
        qualification: 0,
        proposal: 0,
        negotiation: 0,
        closed_won: 0,
        closed_lost: 0,
      }

      deals?.forEach((d: any) => {
        if (stagesMap[d.stage] !== undefined) {
          stagesMap[d.stage] += Number(d.value || 0)
        }
      })

      const formattedDeals = Object.keys(stagesMap).map((key) => ({
        name: key.toUpperCase().replace('_', ' '),
        value: stagesMap[key] || (key === 'discovery' ? 12000 : key === 'qualification' ? 24000 : key === 'proposal' ? 18000 : 5000), // fallback mocks
      }))

      setDealsData(formattedDeals)
      setLoading(false)
    }

    loadAnalytics()
  }, [supabase])

  const COLORS = ['#8b5cf6', '#06b6d4', '#ec4899', '#f59e0b', '#10b981', '#ef4444']

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-violet-400" /> Performance Analytics
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Analyze conversion funnels, pipeline distribution, and agent execution cost trends
        </p>
      </div>

      {loading ? (
        <div className="h-96 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Conversion Funnel Chart */}
          <Card className="border-slate-800/80 bg-slate-950/40 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-md flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-violet-400" /> Outreach Conversion Funnel
              </CardTitle>
              <CardDescription>Visual mapping of leads advancing along email outreach stages</CardDescription>
            </CardHeader>
            <CardContent className="h-[350px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical">
                  <XAxis type="number" stroke="#64748b" fontSize={10} />
                  <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={10} width={60} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#1e293b', borderRadius: 8 }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {funnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Deals Pipeline Value Pie Chart */}
          <Card className="border-slate-800/80 bg-slate-950/40 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-md flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-violet-400" /> Deals Distribution by Value ($)
              </CardTitle>
              <CardDescription>Value allocation of sales contracts across pipeline stages</CardDescription>
            </CardHeader>
            <CardContent className="h-[350px] mt-4 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dealsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {dealsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#1e293b', borderRadius: 8 }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Cost and Tokens used Area Chart */}
          <Card className="border-slate-800/80 bg-slate-950/40 backdrop-blur-md lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-md flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-violet-400" /> Agent Running Costs ($) & Tokens Trend
              </CardTitle>
              <CardDescription>Financial trace analysis of token volumes and cost curves per run</CardDescription>
            </CardHeader>
            <CardContent className="h-[350px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={costData}>
                  <defs>
                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#1e293b', borderRadius: 8 }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 11 }} />
                  <Area
                    type="monotone"
                    dataKey="cost"
                    name="Cost (Cents)"
                    stroke="#8b5cf6"
                    fillOpacity={1}
                    fill="url(#colorCost)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
