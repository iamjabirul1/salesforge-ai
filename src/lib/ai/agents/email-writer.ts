import { openrouter, MODELS } from '../openrouter'
import { generateText } from 'ai'
import { createClient } from '@/lib/supabase/server'

interface EmailWriterConfig {
  campaignId: string
  contactId: string
  runId: string
  orgId: string
}

export async function runEmailWriterAgent({ campaignId, contactId, runId, orgId }: EmailWriterConfig) {
  const supabase = (await createClient()) as any

  // 1. Log running step
  await supabase
    .from('agent_runs')
    .update({
      state: { current_step: `Generating personalized email for contact ${contactId}` },
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

  // 3. Construct personalized prompt
  const companyName = contact.company_name || 'your company'
  const jobTitle = contact.job_title || 'Decision Maker'
  const prospectName = contact.first_name || 'there'
  const senderName = settings?.email_sending_domain ? `Sales Team` : 'SalesForge Agent'
  const senderCompany = org?.name || 'SalesForge AI'
  
  // Custom templates or default framework
  const prompt = `You are a world-class B2B Sales Development Representative (SDR). Write a short, highly personalized cold outreach email to a prospect.
  
  Prospect Info:
  - Name: ${prospectName} ${contact.last_name || ''}
  - Company: ${companyName}
  - Job Title: ${jobTitle}
  - Industry: ${contact.industry || 'B2B'}
  - Enrichment Info: ${JSON.stringify(contact.enrichment_data)}
  
  Sender Info:
  - Name: ${senderName}
  - Company: ${senderCompany}
  - Our Services: Service businesses (custom software development, consulting, growth marketing)
  
  Campaign Goal/Context:
  - Campaign Name: ${campaign.name}
  - Context: ${JSON.stringify(campaign.target_icp)}

  Guidelines for writing:
  1. KEEP IT SHORT: Under 120 words. Long emails get deleted instantly.
  2. PERSONALIZED: Reference their company and job title naturally.
  3. VALUE-DRIVEN: State a clear problem we solve for service businesses (e.g., finding clients, custom dev capacity, saving hours of manual sales workflows).
  4. LOW-FRICTION CTA: End with a simple yes/no question or a request for a quick response, NOT a booking link (e.g. "Do you have 5 minutes next Thursday?").
  5. DO NOT sound like a generic templates marketing email. Write like a human writing from their phone.

  Format your response as a valid JSON object. Do not wrap it in markdown blocks.
  Fields:
  - subject: A highly clickable, non-spammy subject line (under 6 words). E.g., "quick question for ${prospectName}", "ideas for ${companyName}".
  - body: The body of the email in plain text. Use double newlines for paragraphs.`

  // 4. Generate email via OpenRouter (using writing model DeepSeek V3)
  const { text } = await generateText({
    model: openrouter(MODELS.writing),
    prompt,
  })

  // Clean and parse
  const cleanText = text.trim().replace(/^```json/, '').replace(/```$/, '').trim()
  const parsedEmail = JSON.parse(cleanText)

  if (!parsedEmail.subject || !parsedEmail.body) {
    throw new Error('LLM generated invalid email object.')
  }

  // 5. Insert email into 'outreach_queue'
  const { data: outreachItem, error: queueError } = await supabase
    .from('outreach_queue')
    .insert({
      org_id: orgId,
      campaign_id: campaignId,
      contact_id: contactId,
      channel: 'email',
      status: 'pending',
      subject: parsedEmail.subject,
      body: parsedEmail.body,
      requires_approval: true,
      scheduled_at: new Date(Date.now() + 60 * 1000).toISOString(), // Schedule 1 minute from now (but held for approval)
    })
    .select('id')
    .single()

  if (queueError || !outreachItem) {
    throw new Error(`Queue insert failed: ${queueError?.message}`)
  }

  // 6. Insert into 'approval_queue' for human review
  await supabase
    .from('approval_queue')
    .insert({
      org_id: orgId,
      agent_run_id: runId,
      action_type: 'send_email',
      status: 'pending',
      context: {
        outreach_id: outreachItem.id,
        contact_id: contactId,
        prospect_name: `${prospectName} ${contact.last_name || ''}`,
        company_name: companyName,
        subject: parsedEmail.subject,
        body: parsedEmail.body,
      },
    })

  // 7. Log activity in CRM timeline
  await supabase.from('activities').insert({
    org_id: orgId,
    contact_id: contactId,
    type: 'note_added',
    subject: 'Email Draft Created',
    description: `AI Agent drafted email: "${parsedEmail.subject}". Waiting for human approval in queue.`,
  })

  return outreachItem
}
