import { createClient } from '@/lib/supabase/server'

/**
 * Seeds demo data for a given org_id.
 * Call this after new user signup to give them sample data.
 */
export async function seedDemoData(orgId: string): Promise<void> {
  const supabase = (await createClient()) as any

  // ── Companies ──
  const companies = [
    { org_id: orgId, name: 'TechStart Solutions', domain: 'techstart.io', industry: 'AI SaaS', size_range: '11-50', location: 'Austin, TX' },
    { org_id: orgId, name: 'Scale Labs', domain: 'scalelabs.com', industry: 'Developer Tools', size_range: '51-200', location: 'San Francisco, CA' },
    { org_id: orgId, name: 'Growforce Inc', domain: 'growforce.com', industry: 'Sales Tech', size_range: '11-50', location: 'New York, NY' },
  ]

  const { data: createdCompanies } = await supabase.from('companies').insert(companies).select('id, name')

  const companyMap: Record<string, string> = {}
  if (createdCompanies) {
    for (const c of createdCompanies) companyMap[c.name] = c.id
  }

  // ── Contacts ──
  const contacts = [
    { org_id: orgId, first_name: 'Sarah', last_name: 'Connor', email: 'sarah@techstart.io', company_name: 'TechStart Solutions', company_id: companyMap['TechStart Solutions'], job_title: 'CEO', status: 'new', lead_score: 88, industry: 'AI SaaS' },
    { org_id: orgId, first_name: 'Marcus', last_name: 'Wright', email: 'marcus@scalelabs.com', company_name: 'Scale Labs', company_id: companyMap['Scale Labs'], job_title: 'Head of Engineering', status: 'contacted', lead_score: 72, industry: 'Developer Tools' },
    { org_id: orgId, first_name: 'John', last_name: 'Miller', email: 'john@growforce.com', company_name: 'Growforce Inc', company_id: companyMap['Growforce Inc'], job_title: 'VP of Sales', status: 'replied', lead_score: 95, industry: 'Sales Tech' },
    { org_id: orgId, first_name: 'Elena', last_name: 'Roja', email: 'elena@finflux.io', company_name: 'FinFlux', job_title: 'Founder', status: 'new', lead_score: 65, industry: 'FinTech' },
    { org_id: orgId, first_name: 'David', last_name: 'Kim', email: 'david@cloudnine.ai', company_name: 'CloudNine AI', job_title: 'CTO', status: 'new', lead_score: 82, industry: 'AI Infrastructure' },
  ]

  const { data: createdContacts } = await supabase.from('contacts').insert(contacts).select('id, first_name, last_name')
  const contactMap: Record<string, string> = {}
  if (createdContacts) {
    for (const c of createdContacts) contactMap[`${c.first_name} ${c.last_name}`] = c.id
  }

  // ── Deals ──
  const deals = [
    { org_id: orgId, contact_id: contactMap['John Miller'], title: 'AI Sales Consulting Package', value: 18000, stage: 'proposal', probability: 65 },
    { org_id: orgId, contact_id: contactMap['Sarah Connor'], title: 'Monthly Dev Capacity Retainer', value: 12000, stage: 'discovery', probability: 30 },
    { org_id: orgId, contact_id: contactMap['Marcus Wright'], title: 'Platform Integration Project', value: 35000, stage: 'negotiation', probability: 75 },
    { org_id: orgId, contact_id: contactMap['David Kim'], title: 'AI Infrastructure Audit', value: 8500, stage: 'qualification', probability: 45 },
  ]

  await supabase.from('deals').insert(deals)

  // ── Campaign ──
  const { data: campaign } = await supabase.from('campaigns').insert({
    org_id: orgId,
    name: 'Q2 AI Agency Outreach',
    status: 'active',
    target_icp: { industries: ['AI SaaS', 'Developer Tools'], company_sizes: ['11-50', '51-200'], locations: ['Austin, TX', 'San Francisco, CA'], job_titles: ['CEO', 'Founder', 'CTO'] },
    sequence_steps: [
      { step: 1, delay_days: 0, subject: 'Quick question about your AI implementation', body_template: 'Hi {{first_name}}, saw what you are building at {{company_name}} — impressive. We help similar companies ship AI features 3× faster. Worth 15 min?' },
      { step: 2, delay_days: 3, subject: 'Re: Quick question', body_template: 'Hey {{first_name}} — following up on my last note. Happy to share a case study of how we helped a similar {{industry}} company. No pitch, just value. Want it?' },
    ],
    stats: { sent: 24, opened: 18, clicked: 8, replied: 5, bounced: 1 },
  }).select('id').single()

  // ── Knowledge Base ──
  const kbEntries = [
    { org_id: orgId, category: 'Pricing', question: 'Too expensive', answer: 'We understand budget concerns. Most clients see ROI within 6 weeks from reduced SDR costs alone. Can I show you the math?' },
    { org_id: orgId, category: 'Timing', question: "Not the right time", answer: 'Totally fair. When would be a better time — Q3 budget cycle maybe? I will pencil you in and send a short deck you can review when ready.' },
    { org_id: orgId, category: 'Competitor', question: 'Already using another vendor', answer: 'Smart. What are you using? We often work alongside existing tools. The AI layer we add typically fills gaps most CRMs leave — takes 30 min to show you.' },
    { org_id: orgId, category: 'Authority', question: 'Not my decision', answer: 'Understood. Could you introduce me to whoever owns this budget? Happy to send a 1-page exec summary they can glance at.' },
    { org_id: orgId, category: 'Pricing', question: 'Can you do a discount', answer: 'For annual commitments we do offer 15–20% off. Would locking in 12 months work for your situation?' },
  ]

  await supabase.from('knowledge_base').insert(kbEntries)

  // ── Activities ──
  if (campaign?.id && contactMap['John Miller']) {
    await supabase.from('activities').insert([
      { org_id: orgId, contact_id: contactMap['John Miller'], type: 'email_sent', subject: 'Quick question about AI', description: 'Initial cold email sent via campaign' },
      { org_id: orgId, contact_id: contactMap['John Miller'], type: 'email_received', subject: 'Re: Quick question about AI', description: 'Prospect replied — interested in more info' },
      { org_id: orgId, contact_id: contactMap['Sarah Connor'], type: 'email_sent', subject: 'Quick question about your AI implementation', description: 'Initial cold email sent via campaign' },
      { org_id: orgId, contact_id: contactMap['Marcus Wright'], type: 'meeting_scheduled', subject: 'Intro call with Marcus Wright', description: '30-min discovery call scheduled for Thursday' },
    ])
  }

  console.log('Demo data seeded successfully for org:', orgId)
}
