import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: runId } = await params
  const supabase = await createClient()

  // 1. Get user session
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 2. Fetch the parent run
    const { data: parentRun, error: runError } = await supabase
      .from('agent_runs')
      .select('*')
      .eq('id', runId)
      .single()

    if (runError || !parentRun) {
      return NextResponse.json({ error: 'Agent run not found' }, { status: 404 })
    }

    // 3. Fetch sub-runs (child agent executions)
    const { data: childRuns } = await supabase
      .from('agent_runs')
      .select('*')
      .eq('parent_run_id', runId)
      .order('created_at', { ascending: true })

    return NextResponse.json({
      success: true,
      run: parentRun,
      subRuns: childRuns || [],
    })
  } catch (err: any) {
    console.error('Fetch run status failed:', err)
    return NextResponse.json({ error: err.message || 'Failed to fetch status' }, { status: 500 })
  }
}
