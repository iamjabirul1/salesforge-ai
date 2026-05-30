import { createOpenAI } from '@ai-sdk/openai'

if (!process.env.OPENROUTER_API_KEY) {
  console.warn('Warning: OPENROUTER_API_KEY is not defined in environment variables.')
}

export const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || 'mock_key',
  headers: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'X-Title': 'SalesForge AI',
  },
})

// Models available on OpenRouter (including free tier options)
export const MODELS = {
  // Primary fast workhorse model
  fast: 'google/gemini-2.5-flash',
  
  // Advanced general reasoning / text writing model
  writing: 'deepseek/deepseek-chat', // DeepSeek V3
  
  // High reasoning / objection handling / complex decisions model
  reasoning: 'meta-llama/llama-3.3-70b-instruct',
  
  // Fallbacks if user changes defaults
  gpt4oMini: 'openai/gpt-4o-mini',
  gpt4o: 'openai/gpt-4o',
}

export type ModelType = keyof typeof MODELS
export const DEFAULT_MODEL = MODELS.fast
export const DEFAULT_WRITING_MODEL = MODELS.writing
export const DEFAULT_REASONING_MODEL = MODELS.reasoning
export const DEFAULT_MODEL_NAME = 'google/gemini-2.5-flash'
