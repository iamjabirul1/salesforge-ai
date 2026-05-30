import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { launchCampaignOrchestrator } from '@/lib/ai/orchestrator'

export async function POST(request: NextRequest) {
  const supabase = (await createClient()) as any

  // 1. Get user session
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Fetch user org_id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.org_id) {
    return NextResponse.json({ error: 'User does not belong to any organization' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { campaignId, criteria } = body

    if (!campaignId) {
      return NextResponse.json({ error: 'Missing campaignId' }, { status: 400 })
    }

    // Set default empty criteria if not provided
    const formattedCriteria = criteria || {
      industries: [],
      company_sizes: [],
      locations: [],
      job_titles: [],
      custom_prompt: '',
    }

    const { runId } = await launchCampaignOrchestrator({
      campaignId,
      orgId: profile.org_id,
      criteria: formattedCriteria,
    })

    return NextResponse.json({
      success: true,
      runId,
      message: 'Agent orchestrator run initialized successfully.',
    })
  } catch (err: any) {
    console.error('Trigger agent run failed:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to start agent orchestration' },
      { status: 500 }
    )
  }
}
