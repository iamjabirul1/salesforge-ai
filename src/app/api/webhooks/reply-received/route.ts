import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openrouter, MODELS } from '@/lib/ai/openrouter'
import { generateText } from 'ai'

export const dynamic = 'force-dynamic'

type ReplyIntent =
  | 'interested'
  | 'ask_more'
  | 'not_interested'
  | 'do_not_contact'
  | 'out_of_office'
  | 'wrong_person'

interface IntentResult {
  intent: ReplyIntent
  confidence: number
  reasoning: string
}

/**
 * Classify reply intent using AI
 * Ported from AI DM Software — aiService.classifyIntent()
 */
async function classifyReplyIntent(replyText: string): Promise<IntentResult> {
  try {
    const prompt = `Classify the intent of this reply to a cold B2B outreach message.

REPLY TEXT:
"${replyText}"

INTENT OPTIONS:
- interested: Shows interest, asks questions, wants to learn more, agrees to call
- ask_more: Neutral, needs more information before deciding
- not_interested: Politely declines, not a fit right now
- do_not_contact: Asks to be removed, stop messaging, unsubscribe
- out_of_office: Auto-reply indicating absence / vacation
- wrong_person: Reached the wrong contact at this company

Return ONLY valid JSON, no markdown:
{
  "intent": "interested",
  "confidence": 0.9,
  "reasoning": "User asked for pricing and availability next week"
}`

    const { text } = await generateText({
      model: openrouter(MODELS.reasoning),
      prompt,
    })

    const clean = text.trim().replace(/^```json/, '').replace(/```$/, '').trim()
    const jsonMatch = clean.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        intent: parsed.intent || 'ask_more',
        confidence: parsed.confidence || 0.5,
        reasoning: parsed.reasoning || '',
      }
    }
  } catch (err) {
    console.warn('Intent classification failed, using fallback:', err)
  }

  return { intent: 'ask_more', confidence: 0.5, reasoning: 'Fallback classification' }
}

/**
 * POST /api/webhooks/reply-received
 * 
 * Called when a prospect replies to an outreach email.
 * Can be triggered by:
 * - Brevo inbound email webhook
 * - Manual reply logging from the dashboard
 * 
 * Body: { contactEmail, replyText, outreachId? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { contactEmail, replyText, outreachId } = body

    if (!contactEmail || !replyText) {
      return NextResponse.json(
        { error: 'contactEmail and replyText are required' },
        { status: 400 }
      )
    }

    const supabase = (await createClient()) as any

    // 1. Find the contact
    const { data: contact } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, company_name, org_id')
      .eq('email', contactEmail)
      .single()

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found for this email' }, { status: 404 })
    }

    // 2. Classify reply intent using AI
    const intentResult = await classifyReplyIntent(replyText)
    const { intent, confidence, reasoning } = intentResult

    // 3. Determine new contact status based on intent
    const intentToStatus: Record<ReplyIntent, string> = {
      interested: 'replied',
      ask_more: 'replied',
      not_interested: 'unsubscribed',
      do_not_contact: 'unsubscribed',
      out_of_office: 'contacted', // Keep as contacted, retry later
      wrong_person: 'invalid',
    }
    const newStatus = intentToStatus[intent] || 'replied'

    // 4. Update contact status
    await supabase
      .from('contacts')
      .update({
        status: newStatus,
        enrichment_data: supabase.rpc ? undefined : undefined, // Use direct update
      })
      .eq('id', contact.id)

    // 5. Mark outreach as replied
    const replyAt = new Date().toISOString()

    if (outreachId) {
      await supabase
        .from('outreach_queue')
        .update({ replied_at: replyAt, status: 'replied' })
        .eq('id', outreachId)
    } else {
      // Find the most recent sent outreach for this contact
      await supabase
        .from('outreach_queue')
        .update({ replied_at: replyAt })
        .eq('contact_id', contact.id)
        .eq('status', 'sent')
        .order('sent_at', { ascending: false })
        .limit(1)
    }

    // 6. Log activity in CRM timeline
    const intentEmoji: Record<ReplyIntent, string> = {
      interested: '🔥',
      ask_more: '💬',
      not_interested: '👋',
      do_not_contact: '🚫',
      out_of_office: '🏖️',
      wrong_person: '❌',
    }

    await supabase.from('activities').insert({
      org_id: contact.org_id,
      contact_id: contact.id,
      type: 'email_replied',
      subject: `${intentEmoji[intent]} Reply Received: ${intent.replace(/_/g, ' ').toUpperCase()}`,
      description: `Prospect replied. AI classified intent: "${intent}" (${Math.round(confidence * 100)}% confidence). Reasoning: ${reasoning}. Reply: "${replyText.substring(0, 200)}..."`,
      metadata: { intent, confidence, reasoning, replyText },
    })

    // 7. Auto-pipeline progression for INTERESTED replies
    if (intent === 'interested') {
      // Find existing deal and advance stage
      const { data: existingDeal } = await supabase
        .from('deals')
        .select('id, stage')
        .eq('contact_id', contact.id)
        .not('stage', 'in', '("closed_won","closed_lost")')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (existingDeal) {
        // Advance to qualification stage
        const stageProgression: Record<string, string> = {
          discovery: 'qualification',
          qualification: 'proposal',
          proposal: 'negotiation',
        }
        const nextStage = stageProgression[existingDeal.stage] || existingDeal.stage

        if (nextStage !== existingDeal.stage) {
          await supabase
            .from('deals')
            .update({ stage: nextStage })
            .eq('id', existingDeal.id)

          await supabase.from('activities').insert({
            org_id: contact.org_id,
            contact_id: contact.id,
            type: 'stage_changed',
            subject: `Deal Advanced: ${existingDeal.stage} → ${nextStage}`,
            description: `Auto-advanced pipeline deal due to positive reply intent (${intent}).`,
          })
        }
      } else {
        // Create a new deal in Discovery stage for interested contacts
        await supabase.from('deals').insert({
          org_id: contact.org_id,
          contact_id: contact.id,
          title: `${contact.first_name || 'Lead'} ${contact.last_name || ''} — Inbound Interest`,
          stage: 'discovery',
          value: 5000, // Default deal value
          expected_close_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          notes: `Auto-created from positive reply: "${replyText.substring(0, 200)}"`,
        })
      }
    }

    // 8. Auto-unsubscribe for do_not_contact
    if (intent === 'do_not_contact') {
      await supabase.from('contacts').update({ status: 'unsubscribed' }).eq('id', contact.id)

      // Cancel any pending outreach for this contact
      await supabase
        .from('outreach_queue')
        .update({ status: 'cancelled' })
        .eq('contact_id', contact.id)
        .in('status', ['pending', 'approved'])
    }

    return NextResponse.json({
      success: true,
      intent,
      confidence,
      reasoning,
      contactStatus: newStatus,
      contactId: contact.id,
    })
  } catch (error: any) {
    console.error('Reply webhook error:', error)
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}
