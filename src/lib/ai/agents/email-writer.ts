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

/**
 * Email Writer Agent — with A/B Variant Generation & Personalization Hooks
 * Upgraded with logic ported from AI DM Software:
 * - A/B variant message generation (aiService.js → generateMessage + parseABVariants)
 * - Personalization hook injection (extractHooks pattern)
 * - Per-platform voice profiles (MessageComposer.getDefaultVoiceProfile)
 */
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

  // Cal.com link
  const calLink = settings?.email_sending_domain
    ? `https://cal.com/${settings.email_sending_domain}`
    : 'https://cal.com/salesforge-team'

  // 3. Build prospect context
  const companyName = contact.company_name || 'your company'
  const jobTitle = contact.job_title || 'Decision Maker'
  const prospectName = contact.first_name || 'there'
  const senderName = settings?.email_sending_domain ? `Sales Team` : 'SalesForge Agent'
  const senderCompany = org?.name || 'SalesForge AI'

  // 4. Extract personalization hooks from enrichment data (set by research agent)
  const hooks: Array<{ type: string; text: string; confidence: number }> =
    contact.enrichment_data?.personalization_hooks || []
  const leadTag: string = contact.enrichment_data?.lead_tag || 'WARM'
  const leadScore: number = contact.lead_score || 50

  const hooksText = hooks.length > 0
    ? hooks
        .slice(0, 3)
        .map((h, i) => `${i + 1}. ${h.text} (type: ${h.type}, confidence: ${Math.round(h.confidence * 100)}%)`)
        .join('\n')
    : 'No specific hooks available — use their job title and company name for personalization.'

  // 5. Per-platform voice profile (ported from AI DM Software MessageComposer)
  interface VoiceProfile {
    tone: string
    maxLength: number
    style: string
    taboo: string[]
  }

  const voiceProfiles: Record<string, VoiceProfile> = {
    email: {
      tone: 'professional yet conversational',
      maxLength: 110,
      style: 'AIDA framework: Attention, Interest, Desire, Action. Low-friction CTA.',
      taboo: ['buy now', 'limited time offer', 'click here', 'guaranteed'],
    },
    linkedin: {
      tone: 'professional, value-first',
      maxLength: 200,
      style: 'Connection request or DM. No "Hey". Reference their role or company specifically.',
      taboo: ['hey', 'yo', 'wanna', 'generic sales pitch'],
    },
    x: {
      tone: 'casual and direct',
      maxLength: 240,
      style: 'Twitter/X DM. Ultra-concise. Like a text message. Max 240 characters TOTAL.',
      taboo: ['follow4follow', 'formal openers', 'long paragraphs'],
    },
    facebook: {
      tone: 'warm and friendly',
      maxLength: 80,
      style: 'Facebook Messenger. Community-focused. Friendly and approachable. Short.',
      taboo: ['mlm', 'pyramid', 'guaranteed income'],
    },
  }

  const voice = voiceProfiles[channel] || voiceProfiles.email

  // 6. Build A/B variant prompt (ported from AI DM Software aiService.buildMessagePrompt)
  const prompt = `You are a world-class B2B Sales Development Representative generating TWO personalized ${channel === 'email' ? 'cold email' : `${channel} DM`} variants (A/B test).

PROSPECT PROFILE:
- Name: ${prospectName} ${contact.last_name || ''}
- Company: ${companyName}  
- Job Title: ${jobTitle}
- Industry: ${contact.industry || 'B2B'}
- Lead Score: ${leadScore}/100 (${leadTag} lead)

PERSONALIZATION HOOKS (use 1 naturally, pick the most relevant):
${hooksText}

SENDER:
- Name: ${senderName}
- Company: ${senderCompany}
- Services: Custom AI/software consulting, capacity scaling, growth engineering
- Scheduling Link: ${calLink}

VOICE PROFILE for ${channel.toUpperCase()}:
- Tone: ${voice.tone}
- Max Length: ${voice.maxLength} words
- Style: ${voice.style}
- AVOID: ${voice.taboo.join(', ')}

VARIANT A: Use the FIRST personalization hook. Focus on their company growth angle.
VARIANT B: Use the SECOND personalization hook (or a different angle). Focus on their job title challenges.

RULES:
1. Each variant must feel human, not templated.
2. Include the Cal.com link (${calLink}) ONLY in email channel, only if it feels natural.
3. For LinkedIn/X/Facebook: NO links, keep ultra short per platform limits.
4. Different hook, different angle, different opening — both variants must be meaningfully distinct.

FORMAT EXACTLY (no extra text outside these markers):
---VARIANT_A_SUBJECT---
[subject line for email, or "LinkedIn DM" / "X DM" / "Facebook Message" for social]
---VARIANT_A_BODY---
[message body]
---VARIANT_B_SUBJECT---
[subject line for email, or same platform label]
---VARIANT_B_BODY---
[message body]
---END---`

  // 7. Generate message via OpenRouter
  const { text } = await generateText({
    model: openrouter(MODELS.writing),
    prompt,
  })

  // 8. Parse A/B variants
  let subjectA = ''
  let bodyA = ''
  let subjectB = ''
  let bodyB = ''

  try {
    subjectA = text.match(/---VARIANT_A_SUBJECT---\s*([\s\S]*?)\s*---VARIANT_A_BODY---/)?.[1]?.trim() || ''
    bodyA = text.match(/---VARIANT_A_BODY---\s*([\s\S]*?)\s*---VARIANT_B_SUBJECT---/)?.[1]?.trim() || ''
    subjectB = text.match(/---VARIANT_B_SUBJECT---\s*([\s\S]*?)\s*---VARIANT_B_BODY---/)?.[1]?.trim() || ''
    bodyB = text.match(/---VARIANT_B_BODY---\s*([\s\S]*?)\s*---END---/)?.[1]?.trim() || ''

    if (!bodyA) throw new Error('Failed to parse variant A')
    if (!bodyB) bodyB = bodyA // Fallback — use A as B if parsing fails
    if (!subjectA) subjectA = channel === 'email' ? `Quick question for ${prospectName}` : `${channel} outreach`
    if (!subjectB) subjectB = subjectA
  } catch {
    // Fallback: treat entire response as variant A body
    bodyA = text.trim().replace(/---[A-Z_]+---/g, '').trim()
    bodyB = bodyA
    subjectA = channel === 'email' ? `Opportunity for ${companyName}` : `${channel} outreach`
    subjectB = subjectA
  }

  // 9. Insert outreach item into 'outreach_queue' with A/B variant data
  const { data: outreachItem, error: queueError } = await supabase
    .from('outreach_queue')
    .insert({
      org_id: orgId,
      campaign_id: campaignId,
      contact_id: contactId,
      channel: channel as any,
      status: 'pending',
      subject: subjectA,
      body: bodyA,
      requires_approval: true,
      scheduled_at: new Date(Date.now() + 60 * 1000).toISOString(),
      // Store B variant + metadata in content JSONB
      content: {
        subject_a: subjectA,
        body_a: bodyA,
        subject_b: subjectB,
        body_b: bodyB,
        step: stepNumber,
        hooks_used: hooks.slice(0, 2).map((h) => h.text),
        lead_score: leadScore,
        lead_tag: leadTag,
        ab_variant_selected: 'A', // Default to A; user can switch in Approvals UI
      },
    })
    .select('id')
    .single()

  if (queueError || !outreachItem) {
    throw new Error(`Queue insert failed: ${queueError?.message}`)
  }

  // 10. Insert into 'approval_queue' for human review
  const actionType = channel === 'email' ? 'send_email' : 'send_social_message'
  const socialUrl =
    channel === 'linkedin'
      ? contact.linkedin_url
      : channel === 'x'
      ? `https://x.com/${contact.first_name || ''}${contact.last_name || ''}`
      : channel === 'facebook'
      ? `https://facebook.com/search/top?q=${encodeURIComponent(contact.company_name || '')}`
      : null

  await supabase.from('approval_queue').insert({
    org_id: orgId,
    agent_run_id: runId,
    action_type: actionType,
    status: 'pending',
    context: {
      outreach_id: outreachItem.id,
      contact_id: contactId,
      prospect_name: `${prospectName} ${contact.last_name || ''}`,
      company_name: companyName,
      subject: subjectA,
      body: bodyA,
      subject_b: subjectB,
      body_b: bodyB,
      channel,
      social_url: socialUrl,
      lead_score: leadScore,
      lead_tag: leadTag,
      hooks: hooks.slice(0, 3),
      has_ab_variant: true,
    },
  })

  // 11. Log activity in CRM timeline
  const channelLabel = channel.toUpperCase()
  await supabase.from('activities').insert({
    org_id: orgId,
    contact_id: contactId,
    type: 'note_added',
    subject: `${channelLabel} A/B Draft Created`,
    description: `AI Agent drafted 2 ${channelLabel} variants for "${subjectA}". Lead Score: ${leadScore}/100 (${leadTag}). Awaiting human approval.`,
  })

  return outreachItem
}
