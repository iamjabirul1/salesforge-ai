'use server'

import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/resend-client'

export async function approveAction(approvalId: string, editedSubject?: string, editedBody?: string) {
  const supabase = (await createClient()) as any

  // 1. Get approval record
  const { data: approval, error: approvalError } = await supabase
    .from('approval_queue')
    .select('*')
    .eq('id', approvalId)
    .single()

  if (approvalError || !approval) {
    return { error: 'Approval record not found' }
  }

  const outreachId = approval.context?.outreach_id
  const contactId = approval.context?.contact_id

  if (!outreachId) {
    return { error: 'Outreach reference missing in approval context' }
  }

  // 2. Fetch outreach detail
  const { data: outreach } = await supabase
    .from('outreach_queue')
    .select('*')
    .eq('id', outreachId)
    .single()

  if (!outreach) {
    return { error: 'Outreach item not found' }
  }

  // Use edited values if provided, otherwise original draft
  const finalSubject = editedSubject || outreach.subject || ''
  const finalBody = editedBody || outreach.body || ''

  // Fetch target contact to get their email address
  const { data: contact } = await supabase
    .from('contacts')
    .select('email')
    .eq('id', contactId)
    .single()

  if (!contact) {
    return { error: 'Target contact not found' }
  }

  // Fetch sending domain settings
  const { data: settings } = await supabase
    .from('user_settings')
    .select('email_sending_domain')
    .eq('org_id', approval.org_id)
    .maybeSingle()

  // 3. Mark outreach as sending
  await supabase
    .from('outreach_queue')
    .update({
      status: 'sending',
      subject: finalSubject,
      body: finalBody,
    })
    .eq('id', outreachId)

  // 4. Send Email via Resend Client
  const sendResult = await sendEmail({
    to: contact.email,
    subject: finalSubject,
    body: finalBody,
    fromDomain: settings?.email_sending_domain || undefined,
  })

  if (!sendResult.success) {
    // Revert status to pending or failed
    await supabase
      .from('outreach_queue')
      .update({ status: 'failed' })
      .eq('id', outreachId)

    return { error: sendResult.error || 'Resend failed to deliver email.' }
  }

  const emailId = sendResult.id

  // 5. Update Outreach and Approval statuses
  const {
    data: { user },
  } = await supabase.auth.getUser()

  await supabase
    .from('outreach_queue')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      approved_by: user?.id,
      // store Resend ID inside metadata or queue if needed
    })
    .eq('id', outreachId)

  await supabase
    .from('approval_queue')
    .update({
      status: 'approved',
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', approvalId)

  // 6. Log activity in CRM timeline
  await supabase.from('activities').insert({
    org_id: approval.org_id,
    contact_id: contactId,
    type: 'email_sent',
    subject: finalSubject,
    description: `Email sent to prospect: "${finalSubject}" via Resend.`,
    metadata: { resend_email_id: emailId, body: finalBody },
  })

  // Update contact status to contacted
  await supabase
    .from('contacts')
    .update({ status: 'contacted' })
    .eq('id', contactId)

  return { success: true }
}

export async function rejectAction(approvalId: string) {
  const supabase = (await createClient()) as any

  // 1. Get approval record
  const { data: approval, error: approvalError } = await supabase
    .from('approval_queue')
    .select('*')
    .eq('id', approvalId)
    .single()

  if (approvalError || !approval) {
    return { error: 'Approval record not found' }
  }

  const outreachId = approval.context?.outreach_id

  // 2. Update statuses
  const {
    data: { user },
  } = await supabase.auth.getUser()

  await supabase
    .from('approval_queue')
    .update({
      status: 'rejected',
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', approvalId)

  if (outreachId) {
    await supabase
      .from('outreach_queue')
      .update({ status: 'rejected' })
      .eq('id', outreachId)
  }

  return { success: true }
}
