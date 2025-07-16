import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Function called with method:', req.method)
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header
    const authorization = req.headers.get('Authorization')
    console.log('Authorization header present:', !!authorization)
    
    if (!authorization) {
      console.log('Missing authorization header')
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the JWT token
    const token = authorization.replace('Bearer ', '')
    console.log('Token extracted, length:', token.length)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    console.log('Auth result:', { user: !!user, authError })

    if (authError || !user) {
      console.log('Authentication failed:', authError)
      return new Response(
        JSON.stringify({ error: 'Invalid token', debug: authError }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { friend_id } = await req.json()

    if (!friend_id) {
      return new Response(
        JSON.stringify({ error: 'friend_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify that the requesting user is actually friends with the target user
    const { data: friendships, error: friendshipError } = await supabase
      .from('friendships')
      .select('id')
      .or(`and(user_id.eq.${user.id},friend_id.eq.${friend_id}),and(user_id.eq.${friend_id},friend_id.eq.${user.id})`)

    console.log('Friendship check:', { user_id: user.id, friend_id, friendships, friendshipError })

    if (friendshipError || !friendships || friendships.length === 0) {
      console.log('Friendship verification failed:', friendshipError)
      return new Response(
        JSON.stringify({ error: 'Not authorized to access this profile picture', debug: { user_id: user.id, friend_id, friendshipError } }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the friend's profile to check if they have a profile picture stored in storage
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('profile_picture_url')
      .eq('id', friend_id)
      .single()

    console.log('Profile lookup:', { friend_id, profile, profileError })

    if (profileError || !profile?.profile_picture_url) {
      console.log('No profile picture found for friend')
      return new Response(
        JSON.stringify({ signedUrl: null }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Profile picture URL:', profile.profile_picture_url)

    // If the profile picture URL is already a full HTTP URL, return it as-is
    if (profile.profile_picture_url.startsWith('http')) {
      console.log('Returning HTTP URL as-is')
      return new Response(
        JSON.stringify({ signedUrl: profile.profile_picture_url }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If it's a storage path, generate a signed URL
    console.log('Creating signed URL for storage path:', profile.profile_picture_url)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('profile-pictures')
      .createSignedUrl(profile.profile_picture_url, 3600) // 1 hour expiry

    console.log('Signed URL result:', { signedUrlData, signedUrlError })

    if (signedUrlError) {
      console.error('Error creating signed URL:', signedUrlError)
      return new Response(
        JSON.stringify({ signedUrl: null, error: signedUrlError }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fix the signed URL to use localhost instead of kong for external access
    let finalUrl = signedUrlData.signedUrl
    if (finalUrl.includes('kong:8000')) {
      finalUrl = finalUrl.replace('kong:8000', 'localhost:54321')
    }
    
    console.log('Returning fixed signed URL:', finalUrl)
    return new Response(
      JSON.stringify({ signedUrl: finalUrl }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in get-friend-profile-picture function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})