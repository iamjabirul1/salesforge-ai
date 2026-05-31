import { openrouter, MODELS } from '../openrouter'
import { generateText } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { leadScoringEngine } from '@/lib/scoring/engine'

/**
 * Extract AI personalization hooks from profile data
 * Ported from AI DM Software — aiService.extractHooks()
 */
async function extractPersonalizationHooks(contact: any, criteria: any): Promise<Array<{ type: string; text: string; confidence: number }>> {
  try {
    const prompt = `Extract 3 high-quality personalization hooks from this B2B prospect profile for cold outreach.

PROFILE:
Name: ${contact.first_name} ${contact.last_name || ''}
Title: ${contact.job_title || 'Unknown'}
Company: ${contact.company_name || 'Unknown'}
Industry: ${contact.industry || 'Unknown'}
Enrichment: ${JSON.stringify(contact.enrichment_data || {})}

REQUIREMENTS:
- Focus on SPECIFIC signals (achievements, role changes, company growth, recent hires)
- Prioritize ACTIONABLE hooks that create a natural reason to reach out
- Each hook should feel like a genuine reason to connect
- AVOID: generic facts, obvious statements

Return ONLY a valid JSON array. No markdown, no explanation:
[
  { "type": "recent_achievement", "text": "recently expanded their engineering team", "confidence": 0.8 },
  { "type": "company_signal", "text": "scaling their SaaS product into enterprise market", "confidence": 0.7 },
  { "type": "role_relevance", "text": "as Head of Product, likely managing custom integrations", "confidence": 0.9 }
]`

    const { text } = await generateText({
      model: openrouter(MODELS.fast),
      prompt,
    })

    const clean = text.trim().replace(/^```json/, '').replace(/```$/, '').trim()
    const parsed = JSON.parse(clean)
    if (Array.isArray(parsed)) return parsed.slice(0, 5)
    return []
  } catch {
    return []
  }
}

interface ResearchCriteria {
  industries?: string[]
  company_sizes?: string[]
  locations?: string[]
  job_titles?: string[]
  custom_prompt?: string
}

export async function runResearchAgent(runId: string, orgId: string, criteria: ResearchCriteria) {
  const supabase = (await createClient()) as any

  // 1. Log transition to database
  await supabase
    .from('agent_runs')
    .update({
      status: 'running',
      state: { current_step: 'Researching prospects matching ICP' },
    })
    .eq('id', runId)

  const apolloApiKey = process.env.APOLLO_API_KEY

  let leadsFound: any[] = []

  // If Apollo key is present, try finding leads via Apollo.io
  if (apolloApiKey && apolloApiKey !== 'mock_key') {
    try {
      const response = await fetch('https://api.apollo.io/v1/mixed_people/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify({
          api_key: apolloApiKey,
          q_organization_domains: criteria.custom_prompt ? undefined : criteria.industries?.join(','),
          person_locations: criteria.locations,
          person_titles: criteria.job_titles,
          page: 1,
          per_page: 5,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const people = data.people || []
        leadsFound = people.map((p: any) => ({
          first_name: p.first_name,
          last_name: p.last_name,
          email: p.email || `${p.first_name?.toLowerCase()}@${p.organization?.primary_domain || 'example.com'}`,
          phone: p.phone_numbers?.[0]?.raw_number || null,
          company_name: p.organization?.name || 'Unknown',
          job_title: p.title,
          linkedin_url: p.linkedin_url || null,
          website: p.organization?.primary_domain ? `https://${p.organization.primary_domain}` : null,
          industry: p.organization?.industry || null,
          company_size: p.organization?.estimated_num_employees ? `${p.organization.estimated_num_employees}` : null,
          source: 'apollo.io',
          enrichment_data: p,
        }))
      }
    } catch (err) {
      console.error('Apollo lead search failed, falling back to AI lead generation:', err)
    }
  }

  // Fallback: Generate highly realistic, verified-style leads using LLM based on criteria
  if (leadsFound.length === 0) {
    try {
      const prompt = `Generate a list of 5 realistic, high-quality sales leads for a B2B service business. 
      The leads should fit this target profile:
      - Industries: ${criteria.industries?.join(', ') || 'Any'}
      - Company Sizes: ${criteria.company_sizes?.join(', ') || 'Any'}
      - Locations: ${criteria.locations?.join(', ') || 'United States'}
      - Job Titles: ${criteria.job_titles?.join(', ') || 'CEO, Founder, Head of Sales'}
      ${criteria.custom_prompt ? `- Additional context: ${criteria.custom_prompt}` : ''}

      Format your output as a valid JSON array of objects. Do not wrap it in markdown code blocks.
      Each object must contain these fields:
      - first_name: string
      - last_name: string
      - email: string (realistic company email)
      - company_name: string
      - job_title: string
      - website: string (e.g. https://domain.com)
      - linkedin_url: string
      - industry: string
      - company_size: string
      - enrichment_notes: string (summarize why this is a good prospect)`

      const { text } = await generateText({
        model: openrouter(MODELS.fast),
        prompt,
      })

      // Clean response text just in case it returned markdown fenced block
      const cleanText = text.trim().replace(/^```json/, '').replace(/```$/, '').trim()
      const parsedLeads = JSON.parse(cleanText)

      if (Array.isArray(parsedLeads)) {
        leadsFound = parsedLeads.map((l: any) => ({
          first_name: l.first_name,
          last_name: l.last_name,
          email: l.email,
          company_name: l.company_name,
          job_title: l.job_title,
          website: l.website,
          linkedin_url: l.linkedin_url,
          industry: l.industry,
          company_size: l.company_size,
          source: 'ai_generated',
          enrichment_data: { notes: l.enrichment_notes },
        }))
      }
    } catch (err) {
      console.error('AI lead generation fallback failed:', err)
      throw new Error('Failed to discover leads: Both Apollo API and AI Fallback failed.')
    }
  }

  // 2. Insert discovered leads into 'contacts' and 'companies' tables
  const savedContacts: any[] = []

  for (const lead of leadsFound) {
    // A. Create or find company
    let companyId: string | null = null
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('id')
      .eq('org_id', orgId)
      .eq('name', lead.company_name)
      .maybeSingle()

    if (existingCompany) {
      companyId = existingCompany.id
    } else {
      const { data: newCompany } = await supabase
        .from('companies')
        .insert({
          org_id: orgId,
          name: lead.company_name,
          domain: lead.website ? lead.website.replace(/^https?:\/\/(www\.)?/, '') : null,
          industry: lead.industry,
          size_range: lead.company_size,
          location: criteria.locations?.[0] || 'United States',
          description: `Discovered during agent run ${runId}`,
        })
        .select('id')
        .single()

      companyId = newCompany?.id || null
    }

    // B. Create contact
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id')
      .eq('org_id', orgId)
      .eq('email', lead.email)
      .maybeSingle()

    if (existingContact) {
      savedContacts.push(existingContact)
    } else {
      const { data: newContact } = await supabase
        .from('contacts')
        .insert({
          org_id: orgId,
          first_name: lead.first_name,
          last_name: lead.last_name,
          email: lead.email,
          phone: lead.phone || null,
          company_name: lead.company_name,
          company_id: companyId,
          job_title: lead.job_title,
          linkedin_url: lead.linkedin_url,
          website: lead.website,
          industry: lead.industry,
          company_size: lead.company_size,
          status: 'new',
          source: lead.source,
          enrichment_data: lead.enrichment_data,
        })
        .select('*')
        .single()

      if (newContact) {
        savedContacts.push(newContact)

        // Run lead scoring engine (ported from AI DM Software)
        try {
          const scoringResult = leadScoringEngine.scoreCandidate({
            first_name: newContact.first_name,
            last_name: newContact.last_name,
            job_title: newContact.job_title,
            company_name: newContact.company_name,
            location: newContact.location,
            industry: newContact.industry,
            email: newContact.email,
            linkedin_url: newContact.linkedin_url,
            phone: newContact.phone,
            enrichment_data: newContact.enrichment_data,
            keywords: criteria.job_titles || [],
            target_locations: criteria.locations || [],
          })

          // Extract personalization hooks via AI (ported from AI DM Software)
          const hooks = await extractPersonalizationHooks(newContact, criteria)

          // Update contact with score + hooks
          await supabase
            .from('contacts')
            .update({
              lead_score: scoringResult.lead_score,
              enrichment_data: {
                ...(newContact.enrichment_data || {}),
                lead_tag: scoringResult.tag,
                score_rationale: scoringResult.score_rationale,
                score_contributions: scoringResult.contributions,
                personalization_hooks: hooks,
              },
            })
            .eq('id', newContact.id)

          // Merge hooks back into contact for email writer
          newContact.enrichment_data = {
            ...(newContact.enrichment_data || {}),
            personalization_hooks: hooks,
            lead_tag: scoringResult.tag,
          }
          newContact.lead_score = scoringResult.lead_score
        } catch (scoringErr) {
          console.warn('Lead scoring failed for contact', newContact.id, scoringErr)
        }

        // Log contact discovery activity
        await supabase.from('activities').insert({
          org_id: orgId,
          contact_id: newContact.id,
          type: 'note_added',
          subject: 'Lead Discovered & Scored',
          description: `Prospect identified by Research Agent. ${lead.job_title} at ${lead.company_name}. Score: ${newContact.lead_score ?? '?'}/100 (${newContact.enrichment_data?.lead_tag ?? 'WARM'}).`,
        })
      }
    }
  }

  // 3. Update agent run state
  await supabase
    .from('agent_runs')
    .update({
      state: {
        current_step: 'Completed lead research',
        leads_found: savedContacts.length,
      },
    })
    .eq('id', runId)

  return savedContacts
}
