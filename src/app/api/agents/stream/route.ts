import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const runId = searchParams.get('runId')

  if (!runId) {
    return new Response('Missing runId parameter', { status: 400 })
  }

  const supabase = (await createClient()) as any

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let isActive = true
      let pollCount = 0
      const MAX_POLLS = 150 // 5 minutes max

      const sendEvent = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          isActive = false
        }
      }

      const poll = async () => {
        if (!isActive || pollCount >= MAX_POLLS) {
          sendEvent({ status: 'timeout', message: 'Stream timeout reached' })
          controller.close()
          return
        }

        pollCount++

        const { data: run, error } = await supabase
          .from('agent_runs')
          .select('id, status, state, result, error, tokens_used, cost_usd')
          .eq('id', runId)
          .single()

        if (error || !run) {
          sendEvent({ status: 'error', message: 'Run not found' })
          controller.close()
          return
        }

        sendEvent({
          status: run.status,
          state: run.state,
          result: run.result,
          error: run.error,
          tokens_used: run.tokens_used,
          cost_usd: run.cost_usd,
        })

        if (run.status === 'completed' || run.status === 'failed') {
          controller.close()
          return
        }

        if (isActive) {
          await new Promise((resolve) => setTimeout(resolve, 2000))
          await poll()
        }
      }

      await poll()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
