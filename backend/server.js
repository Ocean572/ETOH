const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['authorization', 'x-client-info', 'apikey', 'content-type']
}));

app.use(express.json());

// Initialize Supabase admin client
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Auth middleware to extract user from JWT
const authenticateUser = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    // Extract user ID from JWT payload (base64 decode middle section)
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    req.user = { id: payload.sub };
    console.log('Authenticated user ID:', req.user.id);
    next();
  } catch (error) {
    console.error('Token parsing error:', error);
    return res.status(401).json({ error: 'Invalid authentication token' });
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'ETOH Tracker API is running' });
});

// ===== FRIENDS API ENDPOINTS =====

// Get Friends
app.post('/api/get-friends', authenticateUser, async (req, res) => {
  try {
    console.log('Getting friends for user:', req.user.id);

    // Get friendships using admin client (bypasses RLS)
    const { data: friendships, error } = await supabaseAdmin
      .from('friendships')
      .select('id, user_id, friend_id, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching friendships:', error);
      return res.status(500).json({ error: 'Failed to fetch friends' });
    }

    if (!friendships || friendships.length === 0) {
      return res.json([]);
    }

    // Get friend profiles using admin client
    const friendIds = friendships.map(f => f.friend_id);
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, profile_picture_url')
      .in('id', friendIds);

    if (profileError) {
      console.error('Error fetching friend profiles:', profileError);
      return res.status(500).json({ error: 'Failed to fetch friend profiles' });
    }

    // Combine the data
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    
    const friendsWithProfiles = friendships.map(friendship => ({
      ...friendship,
      friend_profile: profileMap.get(friendship.friend_id)
    })).filter(friend => friend.friend_profile); // Only include friends with valid profiles

    res.json(friendsWithProfiles);
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Friend Requests
app.post('/api/get-friend-requests', authenticateUser, async (req, res) => {
  try {
    console.log('Getting friend requests for user:', req.user.id);

    // Get pending friend requests where the current user is the receiver
    const { data: requests, error } = await supabaseAdmin
      .from('friend_requests')
      .select('id, sender_id, receiver_id, status, created_at')
      .eq('receiver_id', req.user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching friend requests:', error);
      return res.status(500).json({ error: 'Failed to fetch friend requests' });
    }

    if (!requests || requests.length === 0) {
      return res.json([]);
    }

    // Get sender profiles
    const senderIds = requests.map(r => r.sender_id);
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, profile_picture_url')
      .in('id', senderIds);

    if (profileError) {
      console.error('Error fetching sender profiles:', profileError);
      return res.status(500).json({ error: 'Failed to fetch sender profiles' });
    }

    // Combine the data
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    
    const requestsWithProfiles = requests.map(request => ({
      ...request,
      sender_profile: profileMap.get(request.sender_id)
    })).filter(request => request.sender_profile);

    res.json(requestsWithProfiles);
  } catch (error) {
    console.error('Get friend requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send Friend Request
app.post('/api/send-friend-request', authenticateUser, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    console.log('Sending friend request from', req.user.id, 'to', email);

    // Find the user by email
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (userError || !targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if they're trying to add themselves
    if (targetUser.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself' });
    }

    // Check if they're already friends
    const { data: existingFriendship } = await supabaseAdmin
      .from('friendships')
      .select('id')
      .or(`and(user_id.eq.${req.user.id},friend_id.eq.${targetUser.id}),and(user_id.eq.${targetUser.id},friend_id.eq.${req.user.id})`)
      .single();

    if (existingFriendship) {
      return res.status(400).json({ error: 'Already friends with this user' });
    }

    // Check if friend request already exists
    const { data: existingRequest } = await supabaseAdmin
      .from('friend_requests')
      .select('id')
      .or(`and(sender_id.eq.${req.user.id},receiver_id.eq.${targetUser.id}),and(sender_id.eq.${targetUser.id},receiver_id.eq.${req.user.id})`)
      .eq('status', 'pending')
      .single();

    if (existingRequest) {
      return res.status(400).json({ error: 'Friend request already exists' });
    }

    // Create friend request
    const { data, error } = await supabaseAdmin
      .from('friend_requests')
      .insert({
        sender_id: req.user.id,
        receiver_id: targetUser.id,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating friend request:', error);
      return res.status(500).json({ error: 'Failed to send friend request' });
    }

    res.json({ message: 'Friend request sent successfully', data });
  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Accept Friend Request
app.post('/api/accept-friend-request', authenticateUser, async (req, res) => {
  try {
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({ error: 'Request ID is required' });
    }

    console.log('Accepting friend request:', requestId, 'by user:', req.user.id);

    // Get the friend request
    const { data: request, error: requestError } = await supabaseAdmin
      .from('friend_requests')
      .select('*')
      .eq('id', requestId)
      .eq('receiver_id', req.user.id)
      .eq('status', 'pending')
      .single();

    if (requestError || !request) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    // Start transaction by updating request status
    const { error: updateError } = await supabaseAdmin
      .from('friend_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    if (updateError) {
      console.error('Error updating friend request:', updateError);
      return res.status(500).json({ error: 'Failed to update friend request' });
    }

    // Create friendship (both directions)
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
      ]);

    if (friendshipError) {
      console.error('Error creating friendship:', friendshipError);
      return res.status(500).json({ error: 'Failed to create friendship' });
    }

    res.json({ message: 'Friend request accepted successfully' });
  } catch (error) {
    console.error('Accept friend request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove Friend
app.post('/api/remove-friend', authenticateUser, async (req, res) => {
  try {
    const { friendId } = req.body;

    if (!friendId) {
      return res.status(400).json({ error: 'Friend ID is required' });
    }

    console.log('Removing friendship between', req.user.id, 'and', friendId);

    // Remove friendship (both directions)
    const { error } = await supabaseAdmin
      .from('friendships')
      .delete()
      .or(`and(user_id.eq.${req.user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${req.user.id})`);

    if (error) {
      console.error('Error removing friendship:', error);
      return res.status(500).json({ error: 'Failed to remove friend' });
    }

    res.json({ message: 'Friend removed successfully' });
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Friend Profile Picture
app.post('/api/get-friend-profile-picture', authenticateUser, async (req, res) => {
  try {
    const { friendId } = req.body;

    if (!friendId) {
      return res.status(400).json({ error: 'Friend ID is required' });
    }

    console.log('Getting profile picture for friend:', friendId);

    // Verify friendship exists
    const { data: friendship } = await supabaseAdmin
      .from('friendships')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('friend_id', friendId)
      .single();

    if (!friendship) {
      return res.status(403).json({ error: 'Not friends with this user' });
    }

    // Get profile picture URL
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('profile_picture_url')
      .eq('id', friendId)
      .single();

    if (error) {
      console.error('Error fetching profile picture:', error);
      return res.status(500).json({ error: 'Failed to fetch profile picture' });
    }

    res.json({ profile_picture_url: profile?.profile_picture_url || null });
  } catch (error) {
    console.error('Get friend profile picture error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 ETOH Tracker API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});