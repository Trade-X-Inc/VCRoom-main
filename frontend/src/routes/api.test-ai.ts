import { createAPIFileRoute } from '@tanstack/react-start/api'

export const APIRoute = createAPIFileRoute('/api/test-ai')({
  GET: async () => {
    const fromProcessEnv = process.env.OPENAI_API_KEY || ''
    const fromGlobalThis = (globalThis as any).OPENAI_API_KEY || ''
    const key = fromProcessEnv || fromGlobalThis

    return Response.json({
      hasKey: !!key,
      keyPrefix: key ? key.slice(0, 7) : 'missing',
      source: fromProcessEnv ? 'process.env' : fromGlobalThis ? 'globalThis' : 'none',
      supabaseUrl: !!(process.env.SUPABASE_URL || (globalThis as any).SUPABASE_URL),
      supabaseKey: !!(process.env.SUPABASE_SERVICE_ROLE_KEY || (globalThis as any).SUPABASE_SERVICE_ROLE_KEY),
      nodeEnv: process.env.NODE_ENV,
    })
  },
})
