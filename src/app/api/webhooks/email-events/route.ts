import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/webhooks/email-events
 * Handles inbound email tracking events from Brevo (Sendinblue)
 * Configure Brevo Webhook to POST to this URL for:
 * - delivered
 * - opened
 * - clicked
 * - soft_bounce / hard_bounce
 * - complaint
 * - unsubscribed
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    const supabase = (await createClient()) as any

    // Brevo sends events as an array
    const events = Array.isArray(payload) ? payload : [payload]

    for (const event of events) {
      const messageId = event['message-id'] || event.messageId
      const eventType = event.event // 'delivered', 'opened', 'clicked', etc.
      const emailTo = event.email

      if (!emailTo) continue

      // Find matching outreach queue item by email
      const { data: outreachItems } = await supabase
        .from('outreach_queue')
        .select('id, contact_id, campaign_id')
        .eq('status', 'sent')
        .order('sent_at', { ascending: false })
        .limit(5)

      // If no outreach found by messageId, try by email
      let outreachId: string | null = null
      let contactId: string | null = null

      if (outreachItems && outreachItems.length > 0) {
        // For simplicity, match latest outreach to this email
        const { data: contactMatch } = await supabase
          .from('contacts')
          .select('id')
          .eq('email', emailTo)
          .single()

        if (contactMatch) {
          const matchedOutreach = outreachItems.find(
            (item: any) => item.contact_id === contactMatch.id
          )
          if (matchedOutreach) {
            outreachId = matchedOutreach.id
            contactId = matchedOutreach.contact_id
          }
        }
      }

      // Update outreach status based on event type
      if (outreachId) {
        const updateData: any = {}

        if (eventType === 'opened') {
          updateData.opened_at = new Date().toISOString()
        } else if (eventType === 'clicked') {
          updateData.clicked_at = new Date().toISOString()
        } else if (eventType === 'hard_bounce' || eventType === 'soft_bounce') {
          updateData.status = 'bounced'
        }

        if (Object.keys(updateData).length > 0) {
          await supabase.from('outreach_queue').update(updateData).eq('id', outreachId)
        }

        // Log activity in CRM timeline for opens and clicks
        if (eventType === 'opened' || eventType === 'clicked') {
          await supabase.from('activities').insert({
            contact_id: contactId,
            type: eventType === 'opened' ? 'email_opened' : 'link_clicked',
            subject: `Email ${eventType === 'opened' ? 'Opened' : 'Link Clicked'}`,
            description: `Prospect ${eventType === 'opened' ? 'opened your email' : 'clicked a link in your email'}.`,
          })
        }
      }
    }

    return NextResponse.json({ success: true, eventsProcessed: events.length })
  } catch (error: any) {
    console.error('Email webhook error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
