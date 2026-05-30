import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Database environment credentials missing.' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    const body = await request.json()
    console.info('[CAL.COM WEBHOOK] Received booking event:', JSON.stringify(body))

    // Cal.com webhook payload format extracts
    const payload = body.payload || {}
    const attendees = payload.attendees || []
    
    // Find the prospect's email (first attendee who is not the organizer/host)
    let prospectEmail = ''
    if (attendees.length > 0) {
      prospectEmail = attendees[0].email
    }

    if (!prospectEmail && payload.email) {
      prospectEmail = payload.email
    }

    if (!prospectEmail) {
      return NextResponse.json({ error: 'No prospect email found in payload' }, { status: 400 })
    }

    console.info('[CAL.COM WEBHOOK] Locating contact for email:', prospectEmail)

    // Locate contact in database
    const { data: contact, error: contactErr } = await supabase
      .from('contacts')
      .select('id, org_id, first_name, last_name')
      .eq('email', prospectEmail)
      .maybeSingle()

    if (contactErr || !contact) {
      return NextResponse.json({
        message: 'Webhook received but no matching CRM contact was found.',
        email: prospectEmail,
      })
    }

    // 1. Advance contact stage in CRM pipeline
    // Let's check if they have a deal. If so, move deal to 'proposal' stage.
    const { data: deals } = await supabase
      .from('deals')
      .select('id')
      .eq('contact_id', contact.id)

    if (deals && deals.length > 0) {
      for (const deal of deals) {
        await supabase
          .from('deals')
          .update({ stage: 'proposal', probability: 60 })
          .eq('id', deal.id)
      }
    }

    // Update contact status
    await supabase
      .from('contacts')
      .update({ status: 'replied' })
      .eq('id', contact.id)

    // 2. Log activity timeline event
    const title = payload.title || 'Discovery Call'
    const startTime = payload.startTime || new Date().toISOString()
    const description = `Meeting booked via Cal.com: "${title}" starting at ${new Date(startTime).toLocaleString()}`

    await supabase.from('activities').insert({
      org_id: contact.org_id,
      contact_id: contact.id,
      type: 'meeting_scheduled',
      subject: 'Cal.com Booking Created',
      description,
      metadata: { cal_payload: payload },
    })

    return NextResponse.json({
      success: true,
      contactId: contact.id,
      message: 'CRM contact pipeline progressed successfully.',
    })
  } catch (err: any) {
    console.error('[CAL.COM WEBHOOK] Error processing event:', err)
    return NextResponse.json({ error: err.message || 'Webhook parsing failed' }, { status: 500 })
  }
}
