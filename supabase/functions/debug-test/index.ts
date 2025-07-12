import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Debug function working',
        receivedEmail: body.email,
        hasAuth: !!req.headers.get('authorization'),
        envVars: {
          hasUrl: !!Deno.env.get('SUPABASE_URL'),
          hasServiceKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
          hasAnonKey: !!Deno.env.get('SUPABASE_ANON_KEY'),
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('Debug function error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Debug function error', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})