'use client'

import * as React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Sparkles,
  ArrowRight,
  Bot,
  Users,
  CheckSquare,
  ShieldCheck,
  Zap,
  Mail,
  BarChart3,
  GitBranch,
  MessageSquare,
  TrendingUp,
  Play,
  Star,
} from 'lucide-react'

const features = [
  {
    icon: Bot,
    title: 'CEO Orchestrator Agent',
    description: 'A supervisor AI coordinates your entire sales pipeline — from research delegation to proposal generation — autonomously.',
    color: 'from-violet-600 to-violet-400',
    glow: 'shadow-violet-500/20',
    bg: 'bg-violet-500/5 border-violet-500/20',
  },
  {
    icon: Users,
    title: 'Lead Research & Enrichment',
    description: 'Apollo.io integration pulls verified contacts, emails, company size, and tech stack. AI scores leads 0–100 against your ICP.',
    color: 'from-cyan-600 to-cyan-400',
    glow: 'shadow-cyan-500/20',
    bg: 'bg-cyan-500/5 border-cyan-500/20',
  },
  {
    icon: Mail,
    title: 'Personalized Cold Outreach',
    description: 'Email Writer Agent crafts hyper-personalized messages using AIDA/PAS frameworks. 3–5× higher reply rates vs generic blasts.',
    color: 'from-emerald-600 to-emerald-400',
    glow: 'shadow-emerald-500/20',
    bg: 'bg-emerald-500/5 border-emerald-500/20',
  },
  {
    icon: MessageSquare,
    title: 'Objection Handling AI',
    description: 'Follow-Up Agent classifies replies, generates context-aware rebuttals from your knowledge base, and escalates complex deals.',
    color: 'from-amber-600 to-amber-400',
    glow: 'shadow-amber-500/20',
    bg: 'bg-amber-500/5 border-amber-500/20',
  },
  {
    icon: CheckSquare,
    title: 'Human-in-the-Loop Control',
    description: 'You approve every email before it sends. Edit inline, reject, or bulk-approve. Full control, zero risk of rogue messages.',
    color: 'from-rose-600 to-rose-400',
    glow: 'shadow-rose-500/20',
    bg: 'bg-rose-500/5 border-rose-500/20',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Analytics',
    description: 'Live pipeline funnel, open/click/reply rates, agent cost tracking, and deal progression all in one unified dashboard.',
    color: 'from-fuchsia-600 to-fuchsia-400',
    glow: 'shadow-fuchsia-500/20',
    bg: 'bg-fuchsia-500/5 border-fuchsia-500/20',
  },
]

const steps = [
  {
    number: '01',
    title: 'Define Your ICP',
    description: 'Tell the AI who your ideal customer is — industry, company size, job titles, tech stack. Takes 2 minutes.',
    color: 'text-violet-400',
    border: 'border-violet-500/30',
  },
  {
    number: '02',
    title: 'Agents Go to Work',
    description: 'Research Agent finds prospects, enriches contact data, scores leads. Email Writer crafts personalized messages for each.',
    color: 'text-cyan-400',
    border: 'border-cyan-500/30',
  },
  {
    number: '03',
    title: 'Review & Approve',
    description: 'Every email lands in your approval queue. Edit if you want, hit approve, and it sends via verified Brevo/Resend instantly.',
    color: 'text-emerald-400',
    border: 'border-emerald-500/30',
  },
  {
    number: '04',
    title: 'Pipeline Grows Autonomously',
    description: 'Replies get classified. Follow-ups auto-send. Positive replies move to pipeline as deals. You just close.',
    color: 'text-amber-400',
    border: 'border-amber-500/30',
  },
]

const stats = [
  { value: '70%', label: 'Sales tasks automated', icon: Zap },
  { value: '3×', label: 'Higher reply rates', icon: TrendingUp },
  { value: '< 5min', label: 'Time to first outreach', icon: Play },
  { value: '$0', label: 'Cost to start', icon: Star },
]

export default function MarketingPage() {
  return (
    <div className="min-h-screen">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden min-h-[92vh] flex flex-col items-center justify-center text-center px-6 py-20">
        {/* Background gradients */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-violet-600/8 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-cyan-500/8 rounded-full blur-[120px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-violet-900/5 rounded-full blur-[150px]" />
        </div>

        {/* Animated grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-violet-500/30 bg-violet-500/10 text-xs text-violet-300 font-semibold backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-violet-400" />
            Autonomous AI Sales Organization • Powered by OpenRouter
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1" />
          </div>

          {/* Main headline */}
          <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-white leading-[1.05]">
            Replace Your{' '}
            <span className="relative">
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
                Entire SDR Team
              </span>
              <span className="absolute -bottom-1 left-0 right-0 h-px bg-gradient-to-r from-violet-500/0 via-violet-500/50 to-violet-500/0" />
            </span>
            {' '}with AI
          </h1>

          {/* Subheadline */}
          <p className="text-slate-400 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
            SalesForge AI autonomously finds B2B prospects, enriches contacts, writes hyper-personalized emails, handles objections, and grows your pipeline — with a human always in control.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/signup">
              <Button
                size="lg"
                className="h-14 px-10 text-sm font-bold bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white border-0 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all duration-300 hover:scale-105 rounded-xl"
              >
                Deploy Your Agent Team Free
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link href="/login">
              <Button
                variant="outline"
                size="lg"
                className="h-14 px-8 text-sm font-semibold border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white bg-slate-900/50 hover:bg-slate-800/60 backdrop-blur-sm transition-all duration-200 rounded-xl"
              >
                <Play className="h-4 w-4 mr-2 text-violet-400" />
                Live Demo
              </Button>
            </Link>
          </div>

          {/* Social proof micro-text */}
          <p className="text-xs text-slate-500 flex items-center justify-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            No credit card required • Free forever on starter tier • Deploy in 5 minutes
          </p>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border border-slate-700/60 flex items-start justify-center pt-1.5">
            <div className="w-1 h-3 rounded-full bg-slate-600 animate-[slidedown_2s_ease-in-out_infinite]" />
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <section className="border-y border-slate-800/50 bg-slate-950/50 backdrop-blur-sm py-10 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((stat, i) => {
            const Icon = stat.icon
            return (
              <div key={i} className="space-y-2">
                <Icon className="h-5 w-5 text-violet-400 mx-auto" />
                <div className="text-3xl font-black text-white">{stat.value}</div>
                <div className="text-xs text-slate-500 font-medium">{stat.label}</div>
              </div>
            )
          })}
        </div>
      </section>

      {/* FEATURES GRID */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-800 bg-slate-900/60 text-xs text-slate-400 font-medium">
              <Sparkles className="h-3 w-3 text-violet-400" /> Six Core Capabilities
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Everything to automate B2B sales
            </h2>
            <p className="text-slate-400 text-base max-w-xl mx-auto">
              From prospect discovery to closed deals — a full autonomous agent loop that replaces 70% of traditional sales work.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => {
              const Icon = feature.icon
              return (
                <div
                  key={i}
                  className={`relative p-6 rounded-2xl border ${feature.bg} backdrop-blur-sm space-y-4 hover:scale-[1.02] transition-transform duration-300 group overflow-hidden`}
                >
                  {/* Gradient glow on hover */}
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${feature.color} opacity-[0.03] rounded-2xl`} />
                  
                  <div className={`relative w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-lg ${feature.glow}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="relative text-lg font-bold text-white">{feature.title}</h3>
                  <p className="relative text-slate-400 text-sm leading-relaxed">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-24 px-6 bg-slate-950/40">
        <div className="max-w-5xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-800 bg-slate-900/60 text-xs text-slate-400 font-medium">
              <Play className="h-3 w-3 text-cyan-400" /> Simple 4-Step Loop
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              From ICP to closed deal,{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                autonomously
              </span>
            </h2>
            <p className="text-slate-400 text-base max-w-xl mx-auto">
              Set your goals once. The agent team runs continuously, keeping your pipeline full while you focus on closing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {steps.map((step, i) => (
              <div
                key={i}
                className={`p-6 rounded-2xl border ${step.border} bg-slate-950/60 backdrop-blur-sm space-y-3 hover:bg-slate-900/40 transition-colors duration-200`}
              >
                <div className={`text-4xl font-black ${step.color} opacity-60 font-mono`}>{step.number}</div>
                <h3 className="text-xl font-bold text-white">{step.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PIPELINE VISUALIZATION */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-white">Watch your pipeline fill up</h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto">Live deal tracking across every stage with AI-predicted close probability</p>
          </div>

          {/* Mock pipeline board */}
          <div className="grid grid-cols-5 gap-3">
            {[
              { stage: 'Discovery', count: 24, color: 'border-t-violet-500', value: '$48K' },
              { stage: 'Qualified', count: 12, color: 'border-t-cyan-500', value: '$96K' },
              { stage: 'Proposal', count: 7, color: 'border-t-amber-500', value: '$140K' },
              { stage: 'Negotiation', count: 4, color: 'border-t-orange-500', value: '$88K' },
              { stage: 'Won', count: 9, color: 'border-t-emerald-500', value: '$234K' },
            ].map((col) => (
              <div key={col.stage} className={`rounded-xl border-t-2 ${col.color} border-slate-800 bg-slate-950/50 p-3 space-y-2`}>
                <div className="text-xxs font-bold text-slate-400 uppercase tracking-wider">{col.stage}</div>
                <div className="text-2xl font-black text-white">{col.count}</div>
                <div className="text-xs text-slate-500 font-mono">{col.value}</div>
                <div className="space-y-1.5 mt-2">
                  {[...Array(Math.min(col.count, 3))].map((_, j) => (
                    <div key={j} className="h-8 rounded-lg bg-slate-900 border border-slate-800/60 animate-pulse" style={{ animationDelay: `${j * 200}ms` }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 px-6 bg-slate-950/40">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-800 bg-slate-900/60 text-xs text-slate-400 font-medium">
              <Star className="h-3 w-3 text-amber-400" /> Pricing
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white">Start free, scale as you grow</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Free tier */}
            <div className="p-8 rounded-2xl border border-slate-800 bg-slate-950/60 space-y-6">
              <div>
                <div className="text-slate-400 text-sm font-medium mb-1">Starter</div>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-black text-white">$0</span>
                  <span className="text-slate-500 text-sm pb-1">/month</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">No credit card required</div>
              </div>
              <ul className="space-y-3 text-sm text-slate-300">
                {[
                  '500 contacts in CRM',
                  '3 active campaigns',
                  '500 AI-generated emails/mo',
                  'Apollo.io enrichment (10K credits)',
                  'Full agent system access',
                  'Human-in-the-loop approvals',
                  'Basic analytics dashboard',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="block">
                <Button variant="outline" className="w-full border-slate-700 hover:border-slate-500">
                  Get Started Free
                </Button>
              </Link>
            </div>

            {/* Pro tier */}
            <div className="relative p-8 rounded-2xl border border-violet-500/40 bg-gradient-to-br from-violet-950/40 to-slate-950/60 space-y-6 overflow-hidden">
              <div className="absolute top-0 right-0 px-3 py-1 bg-gradient-to-r from-violet-600 to-violet-500 text-white text-xs font-bold rounded-bl-xl rounded-tr-2xl">
                Coming Soon
              </div>
              <div>
                <div className="text-slate-400 text-sm font-medium mb-1">Pro</div>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-black text-white">$49</span>
                  <span className="text-slate-500 text-sm pb-1">/month</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">Everything in Starter, plus:</div>
              </div>
              <ul className="space-y-3 text-sm text-slate-300">
                {[
                  'Unlimited contacts',
                  'Unlimited campaigns',
                  '10,000 emails/mo',
                  'LinkedIn outreach automation',
                  'WhatsApp follow-ups',
                  'DocuSign proposal e-signing',
                  'Team collaboration (3 seats)',
                  'Priority model access (GPT-4o)',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-violet-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full bg-gradient-to-r from-violet-600 to-violet-500 text-white border-0 opacity-70 cursor-not-allowed"
                disabled
              >
                Join Waitlist
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <div className="relative p-12 rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-950/30 to-slate-950/50 backdrop-blur-sm overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 to-cyan-500/5 pointer-events-none" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
            
            <div className="relative space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-xs text-violet-300 font-medium">
                <Sparkles className="h-3 w-3" /> Ready to automate your sales?
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white">
                Deploy your AI sales team today
              </h2>
              <p className="text-slate-400 text-sm max-w-md mx-auto">
                Free to start. No SDR salaries, no quota pressure, no days off. Your agents work 24/7.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/signup">
                  <Button
                    size="lg"
                    className="h-14 px-10 font-bold bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white border-0 shadow-lg shadow-violet-500/30 hover:scale-105 transition-all duration-300 rounded-xl"
                  >
                    Start Free — No Card Needed
                    <Zap className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
