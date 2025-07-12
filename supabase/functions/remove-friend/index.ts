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
    const { friendshipId } = await req.json()
    if (!friendshipId) {
      return new Response(
        JSON.stringify({ error: 'friendshipId is required' }),
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

    // Get the friendship details first to verify the user owns it
    const { data: friendship, error: fetchError } = await supabaseAdmin
      .from('friendships')
      .select('user_id, friend_id')
      .eq('id', friendshipId)
      .eq('user_id', user.id) // Only the user who owns this friendship record can delete it
      .single()

    if (fetchError) {
      console.error('Error fetching friendship:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Friendship not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!friendship) {
      return new Response(
        JSON.stringify({ error: 'Friendship not found or you do not have permission to remove it' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Remove both bidirectional friendship records
    // This ensures both parties lose the friendship immediately
    const { error: deleteError } = await supabaseAdmin
      .from('friendships')
      .delete()
      .or(`and(user_id.eq.${friendship.user_id},friend_id.eq.${friendship.friend_id}),and(user_id.eq.${friendship.friend_id},friend_id.eq.${friendship.user_id})`)

    if (deleteError) {
      console.error('Error deleting friendship:', deleteError)
      return new Response(
        JSON.stringify({ error: 'Failed to remove friendship' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Successfully removed friendship between users:', friendship.user_id, 'and', friendship.friend_id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Friendship removed successfully'
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