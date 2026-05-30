import * as React from 'react'
import { Sidebar } from '@/components/sidebar'
import { Topbar } from '@/components/topbar'
import { OnboardingTour } from '@/components/onboarding-tour'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0a0a0f]">
      {/* Sidebar navigation */}
      <Sidebar />

      {/* Main workspace area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top header navigation */}
        <Topbar />

        {/* Content canvas */}
        <main className="flex-1 overflow-y-auto p-8 bg-[#07070a]/90 relative">
          {/* Subtle background gradient overlay */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-600/5 rounded-full blur-[100px] pointer-events-none z-0" />
          
          <div className="relative z-10 max-w-7xl mx-auto space-y-8 animate-fade-in">
            {children}
          </div>
        </main>
      </div>

      {/* Interactive onboarding sequence */}
      <OnboardingTour />
    </div>
  )
}
