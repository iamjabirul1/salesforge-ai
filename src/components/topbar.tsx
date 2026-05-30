'use client'

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, Search, User } from 'lucide-react'

export function Topbar() {
  const [profile, setProfile] = React.useState<{ full_name: string; email: string } | null>(null)
  const supabase = createClient() as any

  React.useEffect(() => {
    async function getProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', user.id)
          .single()
        if (data) {
          setProfile({
            full_name: data.full_name ?? 'New Member',
            email: data.email,
          })
        } else {
          setProfile({
            full_name: user.user_metadata?.full_name ?? 'New Member',
            email: user.email ?? '',
          })
        }
      }
    }
    getProfile()
  }, [supabase])

  return (
    <header className="h-16 border-b border-slate-800/60 bg-slate-950/40 backdrop-blur-md flex items-center justify-between px-8 z-10">
      {/* Search Input Placeholder */}
      <div className="relative w-64 max-w-xs hidden sm:block">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
          <Search className="h-4 w-4" />
        </span>
        <input
          type="text"
          placeholder="Search..."
          className="w-full h-9 rounded-lg border border-slate-800 bg-slate-900/40 pl-9 pr-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all duration-200"
        />
      </div>

      <div className="flex items-center gap-6 ml-auto">
        {/* Notifications Bell */}
        <button className="relative p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-900/50 transition-all duration-200 active:scale-95">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-violet-500 rounded-full" />
        </button>

        {/* Profile Info */}
        <div className="flex items-center gap-3 pl-4 border-l border-slate-800/80">
          <div className="flex flex-col text-right hidden md:flex">
            <span className="text-sm font-semibold text-slate-200">
              {profile?.full_name ?? 'Loading...'}
            </span>
            <span className="text-xxs text-slate-500 font-mono tracking-tight -mt-0.5">
              {profile?.email ?? '...'}
            </span>
          </div>

          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center text-white text-xs font-bold border border-violet-500/20 shadow-md shadow-violet-500/5 select-none">
            {profile ? (
              profile.full_name.charAt(0).toUpperCase()
            ) : (
              <User className="h-4 w-4 text-slate-300" />
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
