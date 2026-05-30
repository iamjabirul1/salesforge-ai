import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = (await createClient()) as any
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { contactId } = await request.json()
  if (!contactId) return NextResponse.json({ error: 'contactId required' }, { status: 400 })

  const { data: contact } = await supabase.from('contacts').select('email, company_name').eq('id', contactId).single()
  if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })

  const apolloKey = process.env.APOLLO_API_KEY
  if (!apolloKey) {
    return NextResponse.json({ error: 'Apollo API key not configured', enriched: false })
  }

  try {
    const res = await fetch('https://api.apollo.io/v1/people/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
      body: JSON.stringify({ api_key: apolloKey, email: contact.email }),
    })
    const apolloData = await res.json()
    const person = apolloData.person
    if (person) {
      await supabase.from('contacts').update({
        first_name: person.first_name || undefined,
        last_name: person.last_name || undefined,
        job_title: person.title || undefined,
        linkedin_url: person.linkedin_url || undefined,
        phone: person.phone_numbers?.[0]?.sanitized_number || undefined,
        enrichment_data: person,
        lead_score: Math.min(100, 50 + (person.seniority_level === 'director' ? 20 : person.seniority_level === 'vp' ? 30 : 10)),
      }).eq('id', contactId)
      return NextResponse.json({ success: true, enriched: true })
    }
    return NextResponse.json({ success: true, enriched: false, message: 'No match found' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
