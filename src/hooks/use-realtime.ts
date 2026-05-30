'use client'

import { useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*'

interface UseRealtimeOptions {
  table: string
  event?: RealtimeEvent
  filter?: string
  onData: (payload: any) => void
}

export function useRealtime({ table, event = '*', filter, onData }: UseRealtimeOptions) {
  const supabase = createClient()

  const subscribe = useCallback(() => {
    const channelName = `realtime:${table}:${Math.random()}`
    let channel = supabase.channel(channelName)

    const config: any = {
      event,
      schema: 'public',
      table,
    }
    if (filter) config.filter = filter

    channel = channel.on('postgres_changes', config, (payload: any) => {
      onData(payload)
    })

    channel.subscribe()
    return channel
  }, [table, event, filter, onData, supabase])

  useEffect(() => {
    const channel = subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [subscribe, supabase])
}
