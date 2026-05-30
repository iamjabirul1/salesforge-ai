'use client'

import * as React from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { createClient } from '@/lib/supabase/client'
import { Building2, Search, Loader2, MapPin, Globe } from 'lucide-react'

interface Company {
  id: string
  name: string
  domain: string | null
  industry: string | null
  size_range: string | null
  location: string | null
  created_at: string
}

export default function CompaniesPage() {
  const { toast } = useToast()
  const [companies, setCompanies] = React.useState<Company[]>([])
  const [search, setSearch] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const supabase = createClient()

  const loadCompanies = React.useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('companies')
      .select('id, name, domain, industry, size_range, location, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      toast({ type: 'error', description: 'Failed to load companies.' })
    } else if (data) {
      setCompanies(data as Company[])
    }
    setLoading(false)
  }, [supabase, toast])

  React.useEffect(() => {
    loadCompanies()
  }, [loadCompanies])

  const filteredCompanies = companies.filter((c) => {
    const query = search.toLowerCase()
    return (
      c.name.toLowerCase().includes(query) ||
      (c.domain || '').toLowerCase().includes(query) ||
      (c.industry || '').toLowerCase().includes(query) ||
      (c.location || '').toLowerCase().includes(query)
    )
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <Building2 className="h-8 w-8 text-violet-400" /> Companies Directory
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Browse corporate entities discovered during prospecting and lead research runs
          </p>
        </div>
      </div>

      {/* Main content table card */}
      <Card className="border-slate-800/80 bg-slate-950/40 backdrop-blur-md">
        <CardHeader className="pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-md">Discovered Companies</CardTitle>
            <CardDescription>Consolidated list of accounts identified by AI agents</CardDescription>
          </div>
          {/* Search bar */}
          <div className="relative w-full max-w-xs">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
              <Search className="h-4 w-4" />
            </span>
            <Input
              type="text"
              placeholder="Search companies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-20 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="text-center py-20 text-slate-500 text-sm">No companies found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 text-xs">
                    <th className="pb-3 font-semibold">Company Name</th>
                    <th className="pb-3 font-semibold">Website</th>
                    <th className="pb-3 font-semibold">Industry</th>
                    <th className="pb-3 font-semibold">Size Range</th>
                    <th className="pb-3 font-semibold">Location</th>
                    <th className="pb-3 font-semibold text-right">Discovered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-slate-300">
                  {filteredCompanies.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-900/10">
                      <td className="py-4 font-semibold text-slate-200">{c.name}</td>
                      <td className="py-4 font-mono text-xs">
                        {c.domain ? (
                          <a
                            href={`https://${c.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-violet-400 hover:underline flex items-center gap-1"
                          >
                            <Globe className="h-3 w-3" /> {c.domain}
                          </a>
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td className="py-4">{c.industry || 'Unknown'}</td>
                      <td className="py-4">
                        <Badge variant="secondary">
                          {c.size_range ? `${c.size_range} Employees` : 'N/A'}
                        </Badge>
                      </td>
                      <td className="py-4">
                        <span className="flex items-center gap-1 text-slate-400">
                          <MapPin className="h-3.5 w-3.5 text-slate-500" />
                          {c.location || 'N/A'}
                        </span>
                      </td>
                      <td className="py-4 text-right text-slate-500 font-mono text-xs">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
