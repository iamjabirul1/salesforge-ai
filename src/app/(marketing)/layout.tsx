import * as React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0f] text-slate-100 relative overflow-hidden">
      {/* Visual background glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-violet-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Global Header */}
      <header className="h-16 border-b border-slate-800/40 bg-slate-950/60 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between px-8 max-w-7xl w-full mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent tracking-tight">
            SalesForge AI
          </span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
          <a href="#features" className="hover:text-slate-200 transition-colors">Features</a>
          <a href="#workflow" className="hover:text-slate-200 transition-colors">How it works</a>
        </nav>

        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-xs">
              Sign In
            </Button>
          </Link>
          <Link href="/signup">
            <Button variant="premium" size="sm" className="text-xs">
              Get Started Free
            </Button>
          </Link>
        </div>
      </header>

      {/* Main page content */}
      <main className="flex-1 relative z-10">{children}</main>

      {/* Footer */}
      <footer className="border-t border-slate-800/40 bg-slate-950/40 py-8 px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <div>© {new Date().getFullYear()} SalesForge AI. All rights reserved.</div>
          <div className="flex gap-6">
            <a href="#" className="hover:underline">Privacy Policy</a>
            <a href="#" className="hover:underline">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
