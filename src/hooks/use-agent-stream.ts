'use client'

import { useState, useCallback, useRef } from 'react'

interface AgentStreamState {
  status: string
  state: any
  result: any
  error: string | null
  tokens_used: number
  cost_usd: number
  isStreaming: boolean
}

const initialState: AgentStreamState = {
  status: 'idle',
  state: null,
  result: null,
  error: null,
  tokens_used: 0,
  cost_usd: 0,
  isStreaming: false,
}

export function useAgentStream() {
  const [streamState, setStreamState] = useState<AgentStreamState>(initialState)
  const eventSourceRef = useRef<EventSource | null>(null)

  const startStream = useCallback((runId: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    setStreamState((prev) => ({ ...prev, isStreaming: true, status: 'running' }))

    const es = new EventSource(`/api/agents/stream?runId=${runId}`)
    eventSourceRef.current = es

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        setStreamState((prev) => ({
          ...prev,
          status: data.status || prev.status,
          state: data.state || prev.state,
          result: data.result || prev.result,
          error: data.error || prev.error,
          tokens_used: data.tokens_used || prev.tokens_used,
          cost_usd: data.cost_usd || prev.cost_usd,
          isStreaming: !['completed', 'failed', 'timeout'].includes(data.status),
        }))

        if (['completed', 'failed', 'timeout'].includes(data.status)) {
          es.close()
        }
      } catch {
        // ignore parse errors
      }
    }

    es.onerror = () => {
      setStreamState((prev) => ({ ...prev, isStreaming: false, status: 'failed' }))
      es.close()
    }
  }, [])

  const stopStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setStreamState((prev) => ({ ...prev, isStreaming: false }))
  }, [])

  const reset = useCallback(() => {
    stopStream()
    setStreamState(initialState)
  }, [stopStream])

  return { streamState, startStream, stopStream, reset }
}
