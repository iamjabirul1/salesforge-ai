import { NextRequest, NextResponse } from 'next/server'
import { processSequenceQueue, scheduleFollowUps } from '@/lib/campaigns/sequence-engine'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/cron/process-queue
 * Processes the outreach queue — sends approved emails and schedules follow-ups.
 * Can be called by Vercel Cron Jobs or any external scheduler.
 * Protected by CRON_SECRET env var.
 */
export async function POST(request: NextRequest) {
  // Verify cron secret if set
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const supabase = (await createClient()) as any

    // 1. Process the outreach queue (send emails that are approved and due)
    const result = await processSequenceQueue()

    // 2. Find all active campaigns and schedule follow-ups
    const { data: activeCampaigns } = await supabase
      .from('campaigns')
      .select('id')
      .eq('status', 'active')

    let followupsScheduled = 0
    if (activeCampaigns && activeCampaigns.length > 0) {
      for (const campaign of activeCampaigns) {
        try {
          await scheduleFollowUps(campaign.id)
          followupsScheduled++
        } catch (err) {
          console.error(`Failed to schedule follow-ups for campaign ${campaign.id}:`, err)
        }
      }
    }

    return NextResponse.json({
      success: true,
      processed: result.processed,
      errors: result.errors,
      followupsScheduled,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Cron job error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// GET for quick health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Cron process-queue endpoint active. Use POST to trigger.',
    timestamp: new Date().toISOString(),
  })
}
