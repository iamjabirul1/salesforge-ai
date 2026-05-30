import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runFollowUpAgent } from '@/lib/ai/agents/follow-up-agent'

export async function POST(request: NextRequest) {
  const supabase = (await createClient()) as any

  try {
    const payload = await request.json()

    // 1. Handle Simulated Reply for demo/testing
    if (payload.type === 'reply_simulated') {
      const { outreach_id, reply_text } = payload

      if (!outreach_id || !reply_text) {
        return NextResponse.json({ error: 'Missing simulation parameters' }, { status: 400 })
      }

      // Fetch the outreach item to find the contact and org
      const { data: outreach } = await supabase
        .from('outreach_queue')
        .select('*')
        .eq('id', outreach_id)
        .single()

      if (!outreach) {
        return NextResponse.json({ error: 'Outreach item not found' }, { status: 404 })
      }

      // Update outreach queue item to show replied status
      await supabase
        .from('outreach_queue')
        .update({
          replied_at: new Date().toISOString(),
          status: 'sent', // ensure status is sent
        })
        .eq('id', outreach_id)

      // Run follow-up agent asynchronously
      const result = await runFollowUpAgent({
        contactId: outreach.contact_id,
        replyText: reply_text,
        orgId: outreach.org_id,
      })

      return NextResponse.json({
        success: true,
        message: 'Reply simulated and processed by follow-up agent successfully.',
        result,
      })
    }

    // 2. Handle Resend Webhook Events
    // Webhook types: 'email.sent', 'email.delivered', 'email.opened', 'email.clicked', 'email.bounced'
    const eventType = payload.type
    const emailId = payload.data?.email_id

    if (!emailId || !eventType) {
      return NextResponse.json({ error: 'Invalid webhook payload structure' }, { status: 400 })
    }

    // Find the queue item matching this Resend email ID
    // (Note: we need to save the Resend email ID when sending. Let's make sure our send approval action does it)
    const { data: outreach } = await supabase
      .from('outreach_queue')
      .select('*')
      .eq('id', emailId) // For simplicity, we can store Resend ID inside metadata or maps
      .maybeSingle()

    if (!outreach) {
      // If we don't find it, we can check matching by metadata or exit silently
      return NextResponse.json({ message: 'Email ID not found in outreach queue' })
    }

    const updates: any = {}

    if (eventType === 'email.opened') {
      updates.opened_at = new Date().toISOString()
      
      await supabase.from('activities').insert({
        org_id: outreach.org_id,
        contact_id: outreach.contact_id,
        type: 'email_opened',
        subject: 'Email Opened',
        description: `Prospect opened outreach email: "${outreach.subject}"`,
      })
    } else if (eventType === 'email.clicked') {
      updates.clicked_at = new Date().toISOString()
      
      await supabase.from('activities').insert({
        org_id: outreach.org_id,
        contact_id: outreach.contact_id,
        type: 'email_opened', // reuse opened or represent as clicked
        subject: 'Link Clicked',
        description: `Prospect clicked link in outreach email: "${outreach.subject}"`,
      })
    } else if (eventType === 'email.bounced') {
      updates.status = 'failed'
      
      await supabase
        .from('contacts')
        .update({ status: 'bounced' })
        .eq('id', outreach.contact_id)

      await supabase.from('activities').insert({
        org_id: outreach.org_id,
        contact_id: outreach.contact_id,
        type: 'note_added',
        subject: 'Email Bounced',
        description: `Email outreach failed to deliver (bounced).`,
      })
    }

    if (Object.keys(updates).length > 0) {
      await supabase
        .from('outreach_queue')
        .update(updates)
        .eq('id', outreach.id)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Webhook processing error:', err)
    return NextResponse.json({ error: err.message || 'Webhook error' }, { status: 500 })
  }
}
