import { openrouter, MODELS } from '../openrouter'
import { generateText } from 'ai'
import { createClient } from '@/lib/supabase/server'

interface FollowUpConfig {
  contactId: string
  replyText: string
  orgId: string
}

export async function runFollowUpAgent({ contactId, replyText, orgId }: FollowUpConfig) {
  const supabase = (await createClient()) as any

  // 1. Fetch contact details
  const { data: contact } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .single()

  if (!contact) {
    throw new Error(`Contact not found: ${contactId}`)
  }

  // 2. Fetch objection responses from Knowledge Base
  const { data: kbEntries } = await supabase
    .from('knowledge_base')
    .select('question, answer, category')
    .eq('org_id', orgId)

  const kbContext = kbEntries
    ? kbEntries.map((e: any) => `Objection: ${e.question}\nResponse: ${e.answer}`).join('\n\n')
    : ''

  // 3. Prompt LLM to analyze the reply and classify it
  const classificationPrompt = `You are a B2B sales operations assistant. Analyze the following email response from a prospect and classify it.
  
  Prospect Details:
  - Name: ${contact.first_name} ${contact.last_name || ''}
  - Company: ${contact.company_name}
  
  Email Response:
  """
  ${replyText}
  """

  Our Objection Knowledge Base:
  ${kbContext}

  Categorize this email into one of these types:
  1. "positive": They show interest, want to book a call, want more info, or asked a warm question.
  2. "opt_out": They want to be removed, are not interested, said "stop", or asked not to be contacted.
  3. "out_of_office": Automated out-of-office autoreply.
  4. "objection": They raised a specific blocker (e.g. price, timing, competitor, authority) but did not explicitly opt out.

  For "objection" and "positive", draft an appropriate, natural follow-up response.
  For "objection", check if we have a match in the objection knowledge base. If yes, leverage that response. If no, draft a helpful response and raise an escalation.
  
  Format your response as a valid JSON object. Do not wrap in markdown code blocks.
  Fields:
  - category: "positive" | "opt_out" | "out_of_office" | "objection"
  - reason: Brief reasoning for this classification.
  - drafted_reply: Plain text email body response (if positive or objection). Otherwise null.
  - escalate: boolean (true if objection and not in knowledge base, or if they are complaining)
  `

  const { text } = await generateText({
    model: openrouter(MODELS.reasoning),
    prompt: classificationPrompt,
  })

  const cleanText = text.trim().replace(/^```json/, '').replace(/```$/, '').trim()
  const parsedResult = JSON.parse(cleanText)

  // 4. Act based on category
  if (parsedResult.category === 'opt_out') {
    // A. Update contact to do_not_contact
    await supabase
      .from('contacts')
      .update({ status: 'do_not_contact', notes: 'Opted out via email reply.' })
      .eq('id', contactId)

    // B. Log activity
    await supabase.from('activities').insert({
      org_id: orgId,
      contact_id: contactId,
      type: 'note_added',
      subject: 'Opt-Out Logged',
      description: 'Prospect requested to opt-out. Updated status to Do Not Contact.',
    })
  } else if (parsedResult.category === 'out_of_office') {
    // Log OOO but keep active
    await supabase.from('activities').insert({
      org_id: orgId,
      contact_id: contactId,
      type: 'note_added',
      subject: 'Out of Office Received',
      description: 'Received automated out-of-office reply. Sequence remains active.',
    })
  } else if (parsedResult.category === 'positive') {
    // A. Update contact status to replied
    await supabase
      .from('contacts')
      .update({ status: 'replied' })
      .eq('id', contactId)

    // B. Create a Deal in the 'qualification' or 'discovery' stage if not already exists
    const { data: existingDeal } = await supabase
      .from('deals')
      .select('id')
      .eq('contact_id', contactId)
      .maybeSingle()

    if (!existingDeal) {
      await supabase.from('deals').insert({
        org_id: orgId,
        contact_id: contactId,
        title: `Deal with ${contact.company_name}`,
        value: 5000.0, // Default estimate
        stage: 'discovery',
        probability: 25,
      })
    }

    // C. Queue reply in approval queue
    if (parsedResult.drafted_reply) {
      const { data: outreachItem } = await supabase
        .from('outreach_queue')
        .insert({
          org_id: orgId,
          contact_id: contactId,
          channel: 'email',
          status: 'pending',
          subject: `Re: cold outreach`,
          body: parsedResult.drafted_reply,
          requires_approval: true,
        })
        .select('id')
        .single()

      if (outreachItem) {
        await supabase.from('approval_queue').insert({
          org_id: orgId,
          action_type: 'send_email_reply',
          status: 'pending',
          context: {
            outreach_id: outreachItem.id,
            contact_id: contactId,
            prospect_name: `${contact.first_name} ${contact.last_name || ''}`,
            original_reply: replyText,
            reply_draft: parsedResult.drafted_reply,
            category: 'positive',
          },
        })
      }
    }

    // D. Log activity
    await supabase.from('activities').insert({
      org_id: orgId,
      contact_id: contactId,
      type: 'email_received',
      subject: 'Positive Reply Received',
      description: `Prospect replied positively: "${replyText}". Drafted booking response.`,
      metadata: { original_reply: replyText },
    })
  } else if (parsedResult.category === 'objection') {
    // A. Update contact status to replied
    await supabase
      .from('contacts')
      .update({ status: 'replied' })
      .eq('id', contactId)

    // B. Queue response draft in approval queue
    if (parsedResult.drafted_reply) {
      const { data: outreachItem } = await supabase
        .from('outreach_queue')
        .insert({
          org_id: orgId,
          contact_id: contactId,
          channel: 'email',
          status: 'pending',
          subject: `Re: cold outreach`,
          body: parsedResult.drafted_reply,
          requires_approval: true,
        })
        .select('id')
        .single()

      if (outreachItem) {
        await supabase.from('approval_queue').insert({
          org_id: orgId,
          action_type: 'send_email_reply',
          status: 'pending',
          context: {
            outreach_id: outreachItem.id,
            contact_id: contactId,
            prospect_name: `${contact.first_name} ${contact.last_name || ''}`,
            original_reply: replyText,
            reply_draft: parsedResult.drafted_reply,
            category: 'objection',
            escalated: parsedResult.escalate,
            reason: parsedResult.reason,
          },
        })
      }
    }

    // C. Log activity
    await supabase.from('activities').insert({
      org_id: orgId,
      contact_id: contactId,
      type: 'email_received',
      subject: 'Objection Raised',
      description: `Objection detected: "${parsedResult.reason}". Drafted rebuttal for review.`,
      metadata: { original_reply: replyText, classification: parsedResult },
    })
  }

  return parsedResult
}
