import { openrouter, MODELS } from '../openrouter'
import { generateText } from 'ai'
import { createClient } from '@/lib/supabase/server'

interface EmailWriterConfig {
  campaignId: string
  contactId: string
  runId: string
  orgId: string
  stepNumber?: number
}

export async function runEmailWriterAgent({ campaignId, contactId, runId, orgId, stepNumber = 1 }: EmailWriterConfig) {
  const supabase = (await createClient()) as any

  // 1. Log running step
  await supabase
    .from('agent_runs')
    .update({
      state: { current_step: `Generating personalized outreach (Step ${stepNumber}) for contact ${contactId}` },
    })
    .eq('id', runId)

  // 2. Fetch Contact, Company, Campaign, and Settings info
  const { data: contact } = await supabase
    .from('contacts')
    .select('*, company_id(*)')
    .eq('id', contactId)
    .single()

  if (!contact) {
    throw new Error(`Contact not found: ${contactId}`)
  }

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single()

  if (!campaign) {
    throw new Error(`Campaign not found: ${campaignId}`)
  }

  const { data: settings } = await supabase
    .from('user_settings')
    .select('*')
    .eq('org_id', orgId)
    .maybeSingle()

  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', orgId)
    .single()

  // Find the sequence step
  const sequenceSteps = (campaign.sequence_steps || []) as any[]
  const currentStepConfig = sequenceSteps.find((s) => s.step === stepNumber) || {
    channel: 'email',
    subject: 'Default cold outreach',
  }
  const channel = currentStepConfig.channel || 'email'

  // Fetch Cal.com link (fallback to standard link)
  const calLink = settings?.email_sending_domain // We will store cal.com url in email_sending_domain or setting
    ? `https://cal.com/${settings.email_sending_domain}`
    : 'https://cal.com/salesforge-team'

  // 3. Construct personalized prompt
  const companyName = contact.company_name || 'your company'
  const jobTitle = contact.job_title || 'Decision Maker'
  const prospectName = contact.first_name || 'there'
  const senderName = settings?.email_sending_domain ? `Sales Team` : 'SalesForge Agent'
  const senderCompany = org?.name || 'SalesForge AI'
  
  let channelInstructions = ''
  if (channel === 'linkedin') {
    channelInstructions = `
    You are writing a LinkedIn connection request or direct message.
    - Keep it under 65 words (extremely short and conversational).
    - Do not use formal email structures (no "Dear X", no formal sign-offs).
    - Focus on a quick commonality or simple value proposition.
    - Set the 'subject' field in the output JSON to "LinkedIn Connection".
    `
  } else if (channel === 'x') {
    channelInstructions = `
    You are writing a Twitter/X direct message.
    - Keep it under 240 characters (extremely concise and casual).
    - Write as if typing a quick text message. No formatting or formal layout.
    - Set the 'subject' field in the output JSON to "X DM Outreach".
    `
  } else if (channel === 'facebook') {
    channelInstructions = `
    You are writing a Meta/Facebook Messenger outreach message.
    - Keep it under 80 words. Friendly and professional.
    - Focused on initiating a quick conversation.
    - Set the 'subject' field in the output JSON to "Facebook Message".
    `
  } else {
    channelInstructions = `
    You are writing a short cold email.
    - Keep it under 110 words.
    - Value-driven: Solve a key problem for service businesses.
    - Low friction call to action (e.g. asking for a yes/no response).
    `
  }

  const prompt = `You are a world-class B2B Sales Development Representative (SDR). Write a short, highly personalized cold outreach message to a prospect.
  
  Prospect Info:
  - Name: ${prospectName} ${contact.last_name || ''}
  - Company: ${companyName}
  - Job Title: ${jobTitle}
  - Industry: ${contact.industry || 'B2B'}
  - Enrichment Info: ${JSON.stringify(contact.enrichment_data)}
  
  Sender Info:
  - Name: ${senderName}
  - Company: ${senderCompany}
  - Cal.com Link: ${calLink}
  - Our Services: Service businesses (custom software development, consulting, growth marketing)
  
  Campaign Goal/Context:
  - Campaign Name: ${campaign.name}
  - Context: ${JSON.stringify(campaign.target_icp)}
  - Channel: ${channel.toUpperCase()}

  Channel-Specific Guidelines:
  ${channelInstructions}

  General Guidelines:
  1. PERSONALIZED: Reference their company and job title naturally.
  2. DYNAMIC INSERT: You may include the sender's Cal.com link using the text "${calLink}" if the context feels appropriate for booking.
  3. DO NOT sound like a generic templates marketing email. Write like a human writing.

  Format your response as a valid JSON object. Do not wrap it in markdown blocks.
  Fields:
  - subject: The subject line (for email) or channel placeholder subject (for social).
  - body: The body of the outreach message in plain text. Use double newlines for paragraphs.`

  // 4. Generate message via OpenRouter (using writing model)
  const { text } = await generateText({
    model: openrouter(MODELS.writing),
    prompt,
  })

  // Clean and parse
  const cleanText = text.trim().replace(/^```json/, '').replace(/```$/, '').trim()
  const parsedEmail = JSON.parse(cleanText)

  if (!parsedEmail.subject || !parsedEmail.body) {
    throw new Error('LLM generated invalid message object.')
  }

  // 5. Insert outreach item into 'outreach_queue'
  const { data: outreachItem, error: queueError } = await supabase
    .from('outreach_queue')
    .insert({
      org_id: orgId,
      campaign_id: campaignId,
      contact_id: contactId,
      channel: channel as any,
      status: 'pending',
      subject: parsedEmail.subject,
      body: parsedEmail.body,
      requires_approval: true,
      scheduled_at: new Date(Date.now() + 60 * 1000).toISOString(),
    })
    .select('id')
    .single()

  if (queueError || !outreachItem) {
    throw new Error(`Queue insert failed: ${queueError?.message}`)
  }

  // 6. Insert into 'approval_queue' for human review
  const actionType = channel === 'email' ? 'send_email' : 'send_social_message'
  const socialUrl = channel === 'linkedin' 
    ? contact.linkedin_url 
    : channel === 'x' 
    ? `https://x.com/${contact.first_name || ''}${contact.last_name || ''}` 
    : channel === 'facebook'
    ? `https://facebook.com/search/top?q=${encodeURIComponent(contact.company_name || '')}`
    : null

  await supabase
    .from('approval_queue')
    .insert({
      org_id: orgId,
      agent_run_id: runId,
      action_type: actionType,
      status: 'pending',
      context: {
        outreach_id: outreachItem.id,
        contact_id: contactId,
        prospect_name: `${prospectName} ${contact.last_name || ''}`,
        company_name: companyName,
        subject: parsedEmail.subject,
        body: parsedEmail.body,
        channel,
        social_url: socialUrl,
      },
    })

  // 7. Log activity in CRM timeline
  const channelLabel = channel.toUpperCase()
  await supabase.from('activities').insert({
    org_id: orgId,
    contact_id: contactId,
    type: 'note_added',
    subject: `${channelLabel} Draft Created`,
    description: `AI Agent drafted ${channelLabel} message: "${parsedEmail.subject}". Waiting for human approval in queue.`,
  })

  return outreachItem
}
