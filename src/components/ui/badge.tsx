import * as React from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info'
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2',
        {
          'border-transparent bg-slate-100 text-slate-900': variant === 'default',
          'border-transparent bg-slate-800 text-slate-100': variant === 'secondary',
          'border-transparent bg-red-900/40 text-red-400 border-red-800/40': variant === 'destructive',
          'border-slate-800 bg-transparent text-slate-300': variant === 'outline',
          'border-transparent bg-emerald-950/40 text-emerald-400 border-emerald-800/40': variant === 'success',
          'border-transparent bg-amber-950/40 text-amber-400 border-amber-800/40': variant === 'warning',
          'border-transparent bg-cyan-950/40 text-cyan-400 border-cyan-800/40': variant === 'info',
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge }
