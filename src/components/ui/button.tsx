import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'premium'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
          {
            'bg-violet-600 text-white shadow hover:bg-violet-500 hover:shadow-violet-500/20 hover:shadow-lg': variant === 'default',
            'bg-red-600 text-white shadow-sm hover:bg-red-500': variant === 'destructive',
            'border border-slate-800 bg-slate-950/50 backdrop-blur-sm text-slate-200 hover:bg-slate-900 hover:text-white': variant === 'outline',
            'bg-slate-800 text-slate-100 hover:bg-slate-700': variant === 'secondary',
            'text-slate-400 hover:bg-slate-900 hover:text-slate-100': variant === 'ghost',
            'text-violet-400 underline-offset-4 hover:underline hover:text-violet-300': variant === 'link',
            'bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow hover:from-violet-500 hover:to-cyan-400 hover:shadow-violet-500/10 hover:shadow-lg': variant === 'premium',
          },
          {
            'h-9 px-4 py-2': size === 'default',
            'h-8 rounded-md px-3 text-xs': size === 'sm',
            'h-10 rounded-md px-8 text-base': size === 'lg',
            'h-9 w-9 p-0': size === 'icon',
          },
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button }
