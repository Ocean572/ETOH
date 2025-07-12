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
    const { email } = await req.json()
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use environment variables that Supabase provides
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? 'http://kong:8000'
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
    
    console.log('Supabase URL:', supabaseUrl)

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

    // Use admin client to look up target user (bypasses RLS)
    console.log('Looking up user with email:', email.toLowerCase())
    const { data: targetUser, error: targetError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', email.toLowerCase())
      .maybeSingle()

    console.log('Query result:', { targetUser, targetError })

    if (targetError) {
      console.error('Database error:', targetError)
      return new Response(
        JSON.stringify({ error: 'Database error', details: targetError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!targetUser) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No user found with this email address',
          debug: { searchEmail: email.toLowerCase() }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (targetUser.id === user.id) {
      return new Response(
        JSON.stringify({ success: false, message: 'You cannot send a friend request to yourself' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if already friends
    const { data: existingFriendship } = await supabaseAdmin
      .from('friendships')
      .select('id')
      .or(`and(user_id.eq.${user.id},friend_id.eq.${targetUser.id}),and(user_id.eq.${targetUser.id},friend_id.eq.${user.id})`)
      .maybeSingle()

    if (existingFriendship) {
      return new Response(
        JSON.stringify({ success: false, message: 'You are already friends with this user' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if friend request already exists
    const { data: existingRequest, error: requestError } = await supabaseAdmin
      .from('friend_requests')
      .select('id, status')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${targetUser.id}),and(sender_id.eq.${targetUser.id},receiver_id.eq.${user.id})`)
      .maybeSingle()

    if (requestError) {
      console.error('Error checking existing requests:', requestError)
      return new Response(
        JSON.stringify({ error: 'Failed to check existing requests' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return new Response(
          JSON.stringify({ success: false, message: 'Friend request already pending' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      // Note: Rejected requests are now deleted, so this case shouldn't occur
      // but we'll handle it gracefully if it does exist
    }

    // Send friend request
    const { error: insertError } = await supabaseAdmin
      .from('friend_requests')
      .insert({
        sender_id: user.id,
        receiver_id: targetUser.id,
        status: 'pending'
      })

    if (insertError) {
      console.error('Error inserting friend request:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to send friend request' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Friend request sent to ${targetUser.full_name || email}` 
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