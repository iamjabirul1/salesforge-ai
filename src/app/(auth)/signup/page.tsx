'use client'

import * as React from 'react'
import Link from 'next/link'
import { signupAction } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'

export default function SignupPage() {
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const result = await signupAction(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#0a0a0f] overflow-hidden px-4">
      {/* Decorative background glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-md border-slate-800/80 bg-slate-950/40 backdrop-blur-xl relative z-10 shadow-2xl my-8">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <span className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              SalesForge AI
            </span>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white">Create account</CardTitle>
          <CardDescription className="text-slate-400 text-sm">
            Launch your autonomous sales team in seconds
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-xs bg-red-950/50 border border-red-800/50 rounded-lg text-red-400 text-center">
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300" htmlFor="fullName">
                Full Name
              </label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="John Smith"
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300" htmlFor="companyName">
                Company Name
              </label>
              <Input
                id="companyName"
                name="companyName"
                type="text"
                placeholder="Acme Consulting"
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300" htmlFor="email">
                Email Address
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@company.com"
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300" htmlFor="password">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button className="w-full" type="submit" variant="premium" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
            <div className="text-center text-xs text-slate-400">
              Already have an account?{' '}
              <Link href="/login" className="text-violet-400 hover:text-violet-300 font-semibold hover:underline">
                Sign in
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
