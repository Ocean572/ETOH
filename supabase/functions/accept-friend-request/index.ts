import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { requestId, accept } = await req.json()
    if (!requestId || typeof accept !== 'boolean') {
      return new Response(
        JSON.stringify({ error: 'requestId and accept (boolean) are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use environment variables that Supabase provides
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? 'http://kong:8000'
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

    // Create Supabase clients
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
    const supabaseClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Extract user ID from JWT token
    let user;
    try {
      const token = authHeader.replace('Bearer ', '');
      // For local development, extract from JWT payload (base64 decode middle section)
      const payload = JSON.parse(atob(token.split('.')[1]));
      user = { id: payload.sub };
      console.log('Extracted user ID:', user.id);
    } catch (error) {
      console.error('Token parsing error:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the friend request to verify user can respond to it
    const { data: request, error: fetchError } = await supabaseAdmin
      .from('friend_requests')
      .select('id, sender_id, receiver_id, status')
      .eq('id', requestId)
      .eq('receiver_id', user.id) // Only receiver can respond
      .eq('status', 'pending')
      .single()

    if (fetchError) {
      console.error('Error fetching friend request:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Friend request not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!request) {
      return new Response(
        JSON.stringify({ error: 'Friend request not found or already processed' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (accept) {
      // If accepted, create bidirectional friendship records first
      const { error: friendshipError } = await supabaseAdmin
        .from('friendships')
        .insert([
          {
            user_id: request.sender_id,
            friend_id: request.receiver_id
          },
          {
            user_id: request.receiver_id,
            friend_id: request.sender_id
          }
        ])

      if (friendshipError) {
        console.error('Error creating friendship:', friendshipError)
        return new Response(
          JSON.stringify({ error: 'Failed to create friendship' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Delete the friend request (whether accepted or rejected)
    // This ensures it disappears for both sender and receiver
    const { error: deleteError } = await supabaseAdmin
      .from('friend_requests')
      .delete()
      .eq('id', requestId)

    if (deleteError) {
      console.error('Error deleting friend request:', deleteError)
      return new Response(
        JSON.stringify({ error: 'Failed to process friend request' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: accept ? 'Friend request accepted!' : 'Friend request rejected',
        accepted: accept
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})