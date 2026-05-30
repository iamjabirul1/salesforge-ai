import { createClient } from '@/lib/supabase/server'
import { runResearchAgent } from './agents/research-agent'
import { runEmailWriterAgent } from './agents/email-writer'

interface LaunchCampaignParams {
  campaignId: string
  orgId: string
  criteria: {
    industries?: string[]
    company_sizes?: string[]
    locations?: string[]
    job_titles?: string[]
    custom_prompt?: string
  }
}

export async function launchCampaignOrchestrator({ campaignId, orgId, criteria }: LaunchCampaignParams) {
  const supabase = (await createClient()) as any

  // 1. Create a parent agent_runs record for this orchestration
  const { data: parentRun, error: parentError } = await supabase
    .from('agent_runs')
    .insert({
      org_id: orgId,
      agent_type: 'ceo',
      goal: {
        campaign_id: campaignId,
        criteria,
        description: `Autonomous outreach campaign launch for campaign ID: ${campaignId}`,
      },
      status: 'running',
      state: { current_step: 'Starting sales organization campaign launch' },
    })
    .select('id')
    .single()

  if (parentError || !parentRun) {
    console.error('Failed to create parent agent run:', parentError)
    throw new Error(`Failed to initialize agent orchestrator: ${parentError?.message}`)
  }

  const runId = parentRun.id

  // Perform processing asynchronously to avoid blocking the HTTP request
  // (In Next.js server actions / api routes, this runs in background or as a promise)
  executeWorkflow(runId, campaignId, orgId, criteria)

  return { runId }
}

async function executeWorkflow(
  runId: string,
  campaignId: string,
  orgId: string,
  criteria: any
) {
  const supabase = (await createClient()) as any

  try {
    // --- STEP 1: LEAD RESEARCH ---
    // Create a sub-run for the Research Agent
    const { data: researchRun } = await supabase
      .from('agent_runs')
      .insert({
        org_id: orgId,
        agent_type: 'research',
        goal: criteria,
        status: 'running',
        parent_run_id: runId,
        state: { current_step: 'Starting prospect discovery' },
      })
      .select('id')
      .single()

    const researchRunId = researchRun?.id
    let contacts: any[] = []

    try {
      contacts = await runResearchAgent(researchRunId!, orgId, criteria)
      
      await supabase
        .from('agent_runs')
        .update({
          status: 'completed',
          result: { contacts_found: contacts.length },
          completed_at: new Date().toISOString(),
        })
        .eq('id', researchRunId!)
    } catch (researchErr: any) {
      console.error('Research agent run failed:', researchErr)
      await supabase
        .from('agent_runs')
        .update({
          status: 'failed',
          error: researchErr.message || 'Unknown research error',
          completed_at: new Date().toISOString(),
        })
        .eq('id', researchRunId!)
      throw researchErr
    }

    if (contacts.length === 0) {
      // Complete CEO run with no leads found
      await supabase
        .from('agent_runs')
        .update({
          status: 'completed',
          state: { current_step: 'Completed workflow. No leads found.' },
          result: { contacts_found: 0, emails_drafted: 0 },
          completed_at: new Date().toISOString(),
        })
        .eq('id', runId)

      await supabase
        .from('campaigns')
        .update({ status: 'completed' })
        .eq('id', campaignId)

      return
    }

    // --- STEP 2: EMAIL WRITING ---
    // Create a sub-run for the Email Writer Agent
    const { data: writerRun } = await supabase
      .from('agent_runs')
      .insert({
        org_id: orgId,
        agent_type: 'email_writer',
        goal: { contacts_count: contacts.length },
        status: 'running',
        parent_run_id: runId,
        state: { current_step: 'Starting email draft generation' },
      })
      .select('id')
      .single()

    const writerRunId = writerRun?.id
    let draftedCount = 0

    try {
      for (const contact of contacts) {
        await runEmailWriterAgent({
          campaignId,
          contactId: contact.id,
          runId: writerRunId!,
          orgId,
        })
        draftedCount++
      }

      await supabase
        .from('agent_runs')
        .update({
          status: 'completed',
          result: { emails_drafted: draftedCount },
          completed_at: new Date().toISOString(),
        })
        .eq('id', writerRunId!)
    } catch (writerErr: any) {
      console.error('Email writer agent run failed:', writerErr)
      await supabase
        .from('agent_runs')
        .update({
          status: 'failed',
          error: writerErr.message || 'Unknown email drafting error',
          completed_at: new Date().toISOString(),
        })
        .eq('id', writerRunId!)
      throw writerErr
    }

    // --- WORKFLOW COMPLETION ---
    // Update campaign to active
    await supabase
      .from('campaigns')
      .update({ status: 'active' })
      .eq('id', campaignId)

    // Complete the parent CEO run
    await supabase
      .from('agent_runs')
      .update({
        status: 'waiting_approval',
        state: { current_step: 'Campaign active. Emails queued for approval.' },
        result: {
          contacts_found: contacts.length,
          emails_drafted: draftedCount,
        },
        completed_at: new Date().toISOString(),
      })
      .eq('id', runId)

  } catch (err: any) {
    console.error('CEO orchestration workflow failed:', err)
    await supabase
      .from('agent_runs')
      .update({
        status: 'failed',
        error: err.message || 'Unknown orchestration error',
        completed_at: new Date().toISOString(),
      })
      .eq('id', runId)

    await supabase
      .from('campaigns')
      .update({ status: 'draft' })
      .eq('id', campaignId)
  }
}
