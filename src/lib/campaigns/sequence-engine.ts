import { createClient } from '@/lib/supabase/server'
import { sendEmailViaBravo } from '@/lib/email/resend-client'

interface SequenceStep {
  step: number
  delay_days: number
  subject: string
  body_template: string
}

/**
 * Process due outreach queue items — send emails where scheduled_at has passed
 * Called periodically (e.g. from a cron API route or Supabase Edge Function)
 */
export async function processSequenceQueue(): Promise<{ processed: number; errors: number }> {
  const supabase = (await createClient()) as any
  let processed = 0
  let errors = 0

  // Get all pending outreach that is due
  const { data: dueItems, error } = await supabase
    .from('outreach_queue')
    .select(`
      id, campaign_id, contact_id, channel, content,
      contacts(first_name, last_name, email, company_name)
    `)
    .eq('status', 'approved')
    .lte('scheduled_at', new Date().toISOString())
    .limit(50)

  if (error || !dueItems) return { processed, errors }

  for (const item of dueItems) {
    try {
      const contact = (item as any).contacts
      if (!contact?.email) continue

      const content = item.content as any
      const recipientName = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'there'

      await sendEmailViaBravo({
        to: contact.email,
        toName: recipientName,
        subject: content.subject,
        html: content.body.replace(/\n/g, '<br>'),
      })

      // Mark as sent
      await supabase
        .from('outreach_queue')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', item.id)

      // Log activity
      await supabase.from('activities').insert({
        contact_id: item.contact_id,
        type: 'email_sent',
        subject: content.subject,
        description: `Cold email sent to ${contact.email}`,
      })

      processed++
    } catch (err) {
      console.error('Failed to send email for outreach item', item.id, err)
      await supabase
        .from('outreach_queue')
        .update({ status: 'failed' })
        .eq('id', item.id)
      errors++
    }
  }

  return { processed, errors }
}

/**
 * Schedule follow-up emails for contacts who haven't replied to step N
 * Called after each campaign step delay passes
 */
export async function scheduleFollowUps(campaignId: string): Promise<void> {
  const supabase = (await createClient()) as any

  // Fetch campaign with sequence steps
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('sequence_steps, target_icp')
    .eq('id', campaignId)
    .single()

  if (!campaign?.sequence_steps) return

  const steps = campaign.sequence_steps as SequenceStep[]
  if (steps.length <= 1) return

  // Find contacts who received step 1 (sent) but haven't replied
  const { data: step1Sent } = await supabase
    .from('outreach_queue')
    .select('contact_id, sent_at')
    .eq('campaign_id', campaignId)
    .eq('status', 'sent')
    .is('replied_at', null)

  if (!step1Sent || step1Sent.length === 0) return

  const followUpStep = steps[1]
  const delayMs = (followUpStep.delay_days || 3) * 24 * 60 * 60 * 1000
  const now = Date.now()

  for (const sent of step1Sent) {
    const sentAt = new Date(sent.sent_at).getTime()
    if (now - sentAt < delayMs) continue // not yet due

    // Check if follow-up already scheduled
    const { data: existing } = await supabase
      .from('outreach_queue')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('contact_id', sent.contact_id)
      .eq('status', 'pending')
      .limit(1)

    if (existing && existing.length > 0) continue

    // Schedule follow-up
    await supabase.from('outreach_queue').insert({
      campaign_id: campaignId,
      contact_id: sent.contact_id,
      channel: 'email',
      status: 'pending',
      content: {
        subject: followUpStep.subject,
        body: followUpStep.body_template,
        step: 2,
      },
      scheduled_at: new Date().toISOString(),
      requires_approval: true,
    })
  }
}
