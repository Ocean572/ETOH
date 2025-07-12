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

    // Use environment variables that Supabase provides
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? 'http://kong:8000'
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

    // Create Supabase client with service role key (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // Create regular client to verify the user token
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

    // Get friendships using admin client (bypasses RLS)
    const { data: friendships, error } = await supabaseAdmin
      .from('friendships')
      .select('id, user_id, friend_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching friendships:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch friends' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!friendships || friendships.length === 0) {
      return new Response(
        JSON.stringify([]),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get friend profiles using admin client
    const friendIds = friendships.map(f => f.friend_id)
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, profile_picture_url')
      .in('id', friendIds)

    if (profileError) {
      console.error('Error fetching friend profiles:', profileError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch friend profiles' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Combine the data
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])
    
    const friendsWithProfiles = friendships.map(friendship => ({
      ...friendship,
      friend_profile: profileMap.get(friendship.friend_id)
    })).filter(friend => friend.friend_profile) // Only include friends with valid profiles

    return new Response(
      JSON.stringify(friendsWithProfiles),
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