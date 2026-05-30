'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Contact {
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

export function useContacts(search = '') {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient() as any

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    setError(null)

    let query = supabase
      .from('contacts')
      .select('id, first_name, last_name, email, company_name, job_title, status, lead_score, created_at')
      .order('created_at', { ascending: false })
      .limit(100)

    if (search.trim()) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,company_name.ilike.%${search}%`
      )
    }

    const { data, error: fetchError } = await query
    if (fetchError) {
      setError(fetchError.message)
    } else {
      setContacts(data || [])
    }
    setLoading(false)
  }, [search, supabase])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  return { contacts, loading, error, refetch: fetchContacts }
}
