import { Langfuse } from 'langfuse'

const publicKey = process.env.LANGFUSE_PUBLIC_KEY
const secretKey = process.env.LANGFUSE_SECRET_KEY
const host = process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com'

export const langfuse =
  publicKey && secretKey
    ? new Langfuse({
        publicKey,
        secretKey,
        baseUrl: host,
      })
    : null

export interface TraceParams {
  name: string
  userId?: string
  sessionId?: string
  metadata?: Record<string, any>
}

export function createAgentTrace({ name, userId, sessionId, metadata }: TraceParams) {
  if (!langfuse) {
    console.info(`[MOCK MONITOR TRACE] Creating trace "${name}" for session: ${sessionId || 'none'}`)
    return {
      update: (params: any) => {
        console.info(`[MOCK MONITOR TRACE UPDATE] Trace "${name}" update:`, params)
      },
      span: (spanName: string) => {
        return {
          end: (spanParams: any) => {
            console.info(`[MOCK MONITOR SPAN END] Span "${spanName}" under trace "${name}":`, spanParams)
          },
        }
      },
    }
  }

  const trace = langfuse.trace({
    name,
    userId,
    sessionId,
    metadata,
  })

  return {
    update: (params: { output?: any; tags?: string[]; metadata?: any }) => {
      trace.update({
        output: params.output,
        tags: params.tags,
        metadata: params.metadata,
      })
    },
    span: (spanName: string) => {
      const span = trace.span({ name: spanName })
      return {
        end: (spanParams: { output?: any; input?: any; level?: 'DEBUG' | 'DEFAULT' | 'WARNING' | 'ERROR'; statusMessage?: string }) => {
          span.end({
            output: spanParams.output,
            input: spanParams.input,
            level: spanParams.level,
            statusMessage: spanParams.statusMessage,
          })
        },
      }
    },
  }
}
