'use client'

import * as React from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { createClient } from '@/lib/supabase/client'
import { Users, UserPlus, Upload, Search, Trash2, ShieldAlert, Sparkles, Building, Loader2 } from 'lucide-react'

interface Contact {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  company_name: string | null
  job_title: string | null
  status: string
  lead_score: number
  created_at: string
}

export default function ContactsPage() {
  const { toast } = useToast()
  const [contacts, setContacts] = React.useState<Contact[]>([])
  const [search, setSearch] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [addOpen, setAddOpen] = React.useState(false)
  const [importOpen, setImportOpen] = React.useState(false)
  const [actionLoading, setActionLoading] = React.useState(false)

  // Form states for manual add
  const [firstName, setFirstName] = React.useState('')
  const [lastName, setLastName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [companyName, setCompanyName] = React.useState('')
  const [jobTitle, setJobTitle] = React.useState('')

  const supabase = createClient() as any

  const loadContacts = React.useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, email, company_name, job_title, status, lead_score, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      toast({ type: 'error', description: 'Failed to load contacts.' })
    } else if (data) {
      setContacts(data as Contact[])
    }
    setLoading(false)
  }, [supabase, toast])

  React.useEffect(() => {
    loadContacts()
  }, [loadContacts])

  // Filter contacts by search query
  const filteredContacts = contacts.filter((c) => {
    const query = search.toLowerCase()
    return (
      (c.first_name || '').toLowerCase().includes(query) ||
      (c.last_name || '').toLowerCase().includes(query) ||
      c.email.toLowerCase().includes(query) ||
      (c.company_name || '').toLowerCase().includes(query) ||
      (c.job_title || '').toLowerCase().includes(query)
    )
  })

  // Handle Manual Add
  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      toast({ type: 'error', description: 'Email address is required.' })
      return
    }

    setActionLoading(true)

    // Fetch user profile to get org_id
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (!profile?.org_id) return

    // 1. Create company if companyName provided
    let companyId: string | null = null
    if (companyName) {
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id')
        .eq('org_id', profile.org_id)
        .eq('name', companyName)
        .maybeSingle()

      if (existingCompany) {
        companyId = existingCompany.id
      } else {
        const { data: newCompany } = await supabase
          .from('companies')
          .insert({
            org_id: profile.org_id,
            name: companyName,
          })
          .select('id')
          .single()
        companyId = newCompany?.id || null
      }
    }

    // 2. Insert Contact
    const { error } = await supabase.from('contacts').insert({
      org_id: profile.org_id,
      first_name: firstName || null,
      last_name: lastName || null,
      email,
      company_name: companyName || null,
      company_id: companyId,
      job_title: jobTitle || null,
      status: 'new',
      lead_score: 50, // Default baseline score
    })

    if (error) {
      toast({ type: 'error', description: error.message })
    } else {
      toast({ type: 'success', description: 'Contact created successfully.' })
      setAddOpen(false)
      // reset
      setFirstName('')
      setLastName('')
      setEmail('')
      setCompanyName('')
      setJobTitle('')
      loadContacts()
    }

    setActionLoading(false)
  }

  // Handle CSV Import
  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setActionLoading(true)
    const reader = new FileReader()

    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string
        const rows = text.split('\n').map((row) => row.split(','))
        const headers = rows[0].map((h) => h.trim().toLowerCase())

        const emailIdx = headers.indexOf('email')
        const firstNameIdx = headers.indexOf('first name') !== -1 ? headers.indexOf('first name') : headers.indexOf('firstname')
        const lastNameIdx = headers.indexOf('last name') !== -1 ? headers.indexOf('last name') : headers.indexOf('lastname')
        const companyIdx = headers.indexOf('company') !== -1 ? headers.indexOf('company') : headers.indexOf('companyname')
        const titleIdx = headers.indexOf('title') !== -1 ? headers.indexOf('title') : headers.indexOf('jobtitle')

        if (emailIdx === -1) {
          toast({ type: 'error', description: 'CSV must contain an "email" column.' })
          setActionLoading(false)
          return
        }

        // Fetch user org_id
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase
          .from('profiles')
          .select('org_id')
          .eq('id', user.id)
          .single()

        if (!profile?.org_id) return

        const newContacts: any[] = []

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i]
          if (row.length <= emailIdx || !row[emailIdx]?.trim()) continue

          const emailVal = row[emailIdx].trim().replace(/^"(.*)"$/, '$1')
          const fNameVal = firstNameIdx !== -1 ? row[firstNameIdx]?.trim().replace(/^"(.*)"$/, '$1') : ''
          const lNameVal = lastNameIdx !== -1 ? row[lastNameIdx]?.trim().replace(/^"(.*)"$/, '$1') : ''
          const compVal = companyIdx !== -1 ? row[companyIdx]?.trim().replace(/^"(.*)"$/, '$1') : ''
          const titleVal = titleIdx !== -1 ? row[titleIdx]?.trim().replace(/^"(.*)"$/, '$1') : ''

          newContacts.push({
            org_id: profile.org_id,
            first_name: fNameVal || null,
            last_name: lNameVal || null,
            email: emailVal,
            company_name: compVal || null,
            job_title: titleVal || null,
            status: 'new',
            lead_score: 50,
          })
        }

        if (newContacts.length === 0) {
          toast({ type: 'error', description: 'No valid rows found in CSV.' })
        } else {
          const { error } = await supabase.from('contacts').insert(newContacts)
          if (error) {
            toast({ type: 'error', description: error.message })
          } else {
            toast({
              type: 'success',
              description: `Successfully imported ${newContacts.length} contacts!`,
            })
            setImportOpen(false)
            loadContacts()
          }
        }
      } catch (err: any) {
        toast({ type: 'error', description: 'Error parsing CSV file.' })
      } finally {
        setActionLoading(false)
      }
    }

    reader.readAsText(file)
  }

  // Delete contact
  const handleDeleteContact = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return

    const { error } = await supabase.from('contacts').delete().eq('id', id)
    if (error) {
      toast({ type: 'error', description: error.message })
    } else {
      toast({ type: 'success', description: 'Contact deleted.' })
      setContacts((prev) => prev.filter((c) => c.id !== id))
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <Users className="h-8 w-8 text-violet-400" /> Contacts Directory
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage your leads, import CSV lists, and trigger individual enrichments
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" /> Import CSV
          </Button>
          <Button variant="premium" onClick={() => setAddOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" /> Add Contact
          </Button>
        </div>
      </div>

      {/* Search & Stats Card */}
      <Card className="border-slate-800/80 bg-slate-950/40 backdrop-blur-md">
        <CardHeader className="pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-md">Prospect Records</CardTitle>
            <CardDescription>Filtered list of leads available for campaigns</CardDescription>
          </div>
          {/* Search Input */}
          <div className="relative w-full max-w-xs">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
              <Search className="h-4 w-4" />
            </span>
            <Input
              type="text"
              placeholder="Search contacts..."
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
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-20 text-slate-500 text-sm">
              No contacts found matching search filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 text-xs">
                    <th className="pb-3 font-semibold">Name</th>
                    <th className="pb-3 font-semibold">Email</th>
                    <th className="pb-3 font-semibold">Company & Job Title</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold">Lead Score</th>
                    <th className="pb-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {filteredContacts.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-900/10 group">
                      <td className="py-4 font-semibold text-slate-200">
                        <Link
                           href={`/dashboard/contacts/${c.id}`}
                          className="hover:text-violet-400 transition-colors"
                        >
                          {c.first_name || ''} {c.last_name || ''}
                          {!c.first_name && !c.last_name && 'Unnamed Lead'}
                        </Link>
                      </td>
                      <td className="py-4 text-slate-400 font-mono text-xs">{c.email}</td>
                      <td className="py-4">
                        <div className="text-slate-300 font-medium">{c.company_name || 'Individual'}</div>
                        <div className="text-slate-500 text-xxs mt-0.5">{c.job_title || 'N/A'}</div>
                      </td>
                      <td className="py-4">
                        <Badge
                          variant={
                            c.status === 'replied'
                              ? 'success'
                              : c.status === 'contacted'
                              ? 'info'
                              : c.status === 'do_not_contact'
                              ? 'destructive'
                              : 'default'
                          }
                        >
                          {c.status}
                        </Badge>
                      </td>
                      <td className="py-4 font-mono font-bold text-xs text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="h-3 w-3 text-amber-400" />
                          {c.lead_score}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <button
                          onClick={() => handleDeleteContact(c.id)}
                          className="text-slate-500 hover:text-red-400 p-1.5 rounded hover:bg-red-950/20 opacity-0 group-hover:opacity-100 transition-all duration-200"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DIALOGS */}
      {/* 1. Add manual contact dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} title="Add Contact Manually">
        <form onSubmit={handleAddContact} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">First Name</label>
              <Input
                placeholder="Sarah"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Last Name</label>
              <Input
                placeholder="Connor"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Email Address</label>
            <Input
              type="email"
              placeholder="s.connor@cyberdyne.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Company Name</label>
            <Input
              placeholder="Cyberdyne Systems"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Job Title</label>
            <Input
              placeholder="Lead Engineer"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="premium" disabled={actionLoading}>
              {actionLoading ? 'Creating...' : 'Create Contact'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* 2. Import CSV dialog */}
      <Dialog open={importOpen} onClose={() => setImportOpen(false)} title="Import Contacts via CSV">
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-2">
            <div className="font-semibold text-slate-300 flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5" /> CSV Formatting Rules:
            </div>
            <p>1. Must contain an header row.</p>
            <p>2. Column header names recognized: &quot;email&quot;, &quot;first name&quot;, &quot;last name&quot;, &quot;company&quot;, &quot;title&quot;.</p>
            <p>3. Email is mandatory for every prospect row.</p>
          </div>

          <div className="border-2 border-dashed border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center gap-3 bg-slate-950/20">
            <Upload className="h-8 w-8 text-slate-500" />
            <div className="text-sm font-medium text-slate-300">Upload your CSV list</div>
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVImport}
              className="hidden"
              id="csv-file-input"
              disabled={actionLoading}
            />
            <label htmlFor="csv-file-input">
              <Button type="button" variant="outline" disabled={actionLoading} className="cursor-pointer">
                <span>Select File</span>
              </Button>
            </label>
            {actionLoading && <Loader2 className="h-5 w-5 animate-spin text-violet-400 mt-2" />}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => setImportOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
