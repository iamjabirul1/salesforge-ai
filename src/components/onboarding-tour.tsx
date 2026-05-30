'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
  HelpCircle,
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Play,
  Key,
  Users,
  Mail,
  Bot,
  CheckSquare,
  Trophy,
} from 'lucide-react'

interface TourStep {
  targetId: string
  title: string
  description: string
  icon: React.ComponentType<any>
  color: string
}

export function OnboardingTour() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [currentStep, setCurrentStep] = React.useState(0)
  const [highlightStyle, setHighlightStyle] = React.useState<React.CSSProperties>({})

  const steps: TourStep[] = [
    {
      targetId: '',
      title: 'Welcome to SalesForge AI 🚀',
      description: 'Your fully autonomous AI sales department is ready. Let\'s take a 60-second tour of your new workspace and set you up for success.',
      icon: Sparkles,
      color: 'from-violet-500 to-indigo-500',
    },
    {
      targetId: 'sidebar-overview',
      title: 'Overview Dashboard',
      description: 'Your central command center. Monitor total leads ingested, active campaigns, sent emails, booked meetings, and live agent activity logs.',
      icon: Play,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      targetId: 'sidebar-settings',
      title: 'Connect Your Engines',
      description: 'Before launching campaigns, configure your API keys here. Add OpenRouter for AI models, Apollo.io for lead enrichment, and Brevo to send emails without domain limits.',
      icon: Key,
      color: 'from-pink-500 to-rose-500',
    },
    {
      targetId: 'sidebar-contacts',
      title: 'Directory & Companies',
      description: 'Ingest leads via CSV upload, view profile details, see communication timelines, and trigger deep Apollo.io profile enrichment.',
      icon: Users,
      color: 'from-amber-500 to-orange-500',
    },
    {
      targetId: 'sidebar-campaigns',
      title: 'Multi-Step Sequences',
      description: 'Build email campaigns with customized target ICPs and multi-step email sequences with delay timings (e.g. Day 1: Intro, Day 4: Follow-up).',
      icon: Mail,
      color: 'from-teal-500 to-emerald-500',
    },
    {
      targetId: 'sidebar-ai-agents',
      title: 'Autonomous AI Agents',
      description: 'Your sales team. Deploy the Orchestrator, Research, and Copywriter agents to automatically scan leads, enrich companies, and write AIDA-framework emails.',
      icon: Bot,
      color: 'from-violet-500 to-purple-500',
    },
    {
      targetId: 'sidebar-approvals',
      title: 'Human-in-the-Loop Guardrail',
      description: 'You maintain full control. Every agent-drafted outreach email is queued here. Preview, edit, and click Approve to send.',
      icon: CheckSquare,
      color: 'from-emerald-500 to-teal-500',
    },
    {
      targetId: '',
      title: 'Ready for Takeoff! 🏆',
      description: 'You\'re all set to launch. Go ahead and connect your API keys, seed your initial contacts, and deploy your first AI campaign!',
      icon: Trophy,
      color: 'from-violet-500 to-cyan-500',
    },
  ]

  React.useEffect(() => {
    // Check if user has completed onboarding
    const completed = localStorage.getItem('salesforge-onboarding-completed')
    if (!completed) {
      // Delay slightly for smooth page load
      const timer = setTimeout(() => {
        setIsOpen(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  React.useEffect(() => {
    if (!isOpen) return

    const step = steps[currentStep]
    if (!step.targetId) {
      setHighlightStyle({})
      return
    }

    const element = document.getElementById(step.targetId)
    if (element) {
      const rect = element.getBoundingClientRect()
      setHighlightStyle({
        top: `${rect.top - 6}px`,
        left: `${rect.left - 6}px`,
        width: `${rect.width + 12}px`,
        height: `${rect.height + 12}px`,
        opacity: 1,
        pointerEvents: 'none',
      })
      // Smooth scroll target into view if needed
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    } else {
      setHighlightStyle({})
    }
  }, [currentStep, isOpen])

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      handleComplete()
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleComplete = () => {
    localStorage.setItem('salesforge-onboarding-completed', 'true')
    setIsOpen(false)
    setCurrentStep(0)
  }

  const handleRestart = () => {
    setIsOpen(true)
    setCurrentStep(0)
  }

  return (
    <>
      {/* Help widget button */}
      <button
        onClick={handleRestart}
        className="fixed bottom-6 right-6 p-3 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-full border border-slate-800/80 shadow-lg hover:shadow-violet-500/10 transition-all duration-300 z-40 active:scale-95 group"
        title="Restart Tour"
      >
        <HelpCircle className="h-5 w-5 group-hover:rotate-12 transition-transform duration-300" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
            {/* Backdrop with black tint */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#020204]"
              onClick={handleComplete}
            />

            {/* Spotlight highlight overlay */}
            {steps[currentStep].targetId && Object.keys(highlightStyle).length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute border-2 border-violet-500/80 bg-violet-500/5 rounded-lg shadow-[0_0_25px_rgba(139,92,246,0.3)] transition-all duration-300 z-50"
                style={highlightStyle}
              />
            )}

            {/* Content Tour Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md mx-4 bg-slate-950/90 border border-slate-800/80 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden z-50 p-6 space-y-6"
            >
              {/* Top gradient bar */}
              <div className={`absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r ${steps[currentStep].color}`} />

              <button
                onClick={handleComplete}
                className="absolute top-4 right-4 p-1 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-900/50 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Icon & Title */}
              <div className="flex gap-4 items-start">
                <div className={`p-3 rounded-xl bg-gradient-to-tr ${steps[currentStep].color} text-white shadow-lg`}>
                  {React.createElement(steps[currentStep].icon, { className: 'h-6 w-6' })}
                </div>
                <div className="space-y-1">
                  <span className="text-xxs font-mono uppercase tracking-widest text-violet-400 font-semibold">
                    Step {currentStep + 1} of {steps.length}
                  </span>
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    {steps[currentStep].title}
                  </h3>
                </div>
              </div>

              {/* Description */}
              <p className="text-slate-300 text-sm leading-relaxed">
                {steps[currentStep].description}
              </p>

              {/* Action Footer */}
              <div className="flex items-center justify-between pt-2">
                {/* Steps dots */}
                <div className="flex gap-1.5">
                  {steps.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === currentStep ? 'w-4 bg-violet-500' : 'w-1.5 bg-slate-800'
                      }`}
                    />
                  ))}
                </div>

                <div className="flex gap-2">
                  {currentStep > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBack}
                      className="text-slate-400 hover:text-white"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" /> Back
                    </Button>
                  )}
                  <Button
                    variant="premium"
                    size="sm"
                    onClick={handleNext}
                  >
                    {currentStep === steps.length - 1 ? (
                      'Finish'
                    ) : (
                      <>
                        Next <ChevronRight className="h-4 w-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
