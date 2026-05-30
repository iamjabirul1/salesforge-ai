'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastMessage {
  id: string
  title?: string
  description: string
  type?: ToastType
  duration?: number
}

interface ToastContextType {
  toast: (message: Omit<ToastMessage, 'id'>) => void
  toasts: ToastMessage[]
  removeToast: (id: string) => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([])

  const toast = React.useCallback((message: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast = { ...message, id }
    setToasts((prev) => [...prev, newToast])

    const duration = message.duration ?? 3000
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
  }, [])

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast, toasts, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

function ToastContainer({
  toasts,
  removeToast,
}: {
  toasts: ToastMessage[]
  removeToast: (id: string) => void
}) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'flex flex-col gap-1 p-4 rounded-lg border shadow-lg backdrop-blur-md transition-all duration-300 animate-in slide-in-from-bottom-5',
            {
              'bg-emerald-950/90 border-emerald-800 text-emerald-100': t.type === 'success',
              'bg-red-950/90 border-red-800 text-red-100': t.type === 'error',
              'bg-cyan-950/90 border-cyan-800 text-cyan-100': t.type === 'info',
              'bg-amber-950/90 border-amber-800 text-amber-100': t.type === 'warning',
              'bg-slate-900/90 border-slate-800 text-slate-100': !t.type,
            }
          )}
        >
          <div className="flex justify-between items-start">
            {t.title && <h4 className="text-sm font-semibold">{t.title}</h4>}
            <button
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-slate-200 transition-colors ml-auto -mt-1 -mr-1"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-slate-300">{t.description}</p>
        </div>
      ))}
    </div>
  )
}
