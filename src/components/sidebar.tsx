'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signoutAction } from '@/app/actions/auth'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Building2,
  GitBranch,
  Mail,
  Bot,
  CheckSquare,
  BarChart3,
  Settings,
  LogOut,
  CreditCard,
} from 'lucide-react'

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()

  const navItems = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Contacts', href: '/dashboard/contacts', icon: Users },
    { name: 'Companies', href: '/dashboard/companies', icon: Building2 },
    { name: 'Pipeline', href: '/dashboard/pipeline', icon: GitBranch },
    { name: 'Campaigns', href: '/dashboard/campaigns', icon: Mail },
    { name: 'AI Agents', href: '/dashboard/agents', icon: Bot },
    { name: 'Approvals', href: '/dashboard/approvals', icon: CheckSquare },
    { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
    { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ]

  const handleLogout = async () => {
    await signoutAction()
  }

  return (
    <div
      className={cn(
        'w-64 border-r border-slate-800/80 bg-slate-950/60 backdrop-blur-md flex flex-col h-screen text-slate-400 select-none z-20',
        className
      )}
    >
      {/* Brand logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800/60">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent tracking-tight">
            SalesForge AI
          </span>
        </Link>
      </div>

      {/* Navigation list */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          const Icon = item.icon
          const elementId = `sidebar-${item.name.toLowerCase().replace(/\s+/g, '-')}`

          return (
            <Link
              key={item.name}
              id={elementId}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group active:scale-[0.98]',
                isActive
                  ? 'bg-slate-900 text-white border border-slate-800 shadow shadow-violet-500/5'
                  : 'hover:bg-slate-900/50 hover:text-slate-100'
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4 transition-transform duration-200 group-hover:scale-110',
                  isActive ? 'text-violet-400' : 'text-slate-500 group-hover:text-slate-300'
                )}
              />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Footer / logout */}
      <div className="p-4 border-t border-slate-800/60">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-red-950/20 hover:text-red-400 border border-transparent hover:border-red-900/30 transition-all duration-200 group active:scale-[0.98]"
        >
          <LogOut className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          Logout
        </button>
      </div>
    </div>
  )
}
