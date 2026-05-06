import { createAPIFileRoute } from '@tanstack/react-start/api'

export const APIRoute = createAPIFileRoute('/api/health')({
  GET: async () => {
    return Response.json({
      supabase_url: !!process.env.SUPABASE_URL,
      supabase_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      openai: !!process.env.OPENAI_API_KEY,
      resend: !!process.env.RESEND_API_KEY,
      google_secret: !!process.env.GOOGLE_CLIENT_SECRET,
      node_env: process.env.NODE_ENV,
    })
  },
})
