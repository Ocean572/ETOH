import { supabase } from './supabase';

export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  sender_profile?: {
    full_name?: string;
    email: string;
    profile_picture_url?: string;
  };
  receiver_profile?: {
    full_name?: string;
    email: string;
    profile_picture_url?: string;
  };
}

export interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  created_at: string;
  friend_profile: {
    id: string;
    full_name?: string;
    email: string;
    profile_picture_url?: string;
  };
}

export const friendsService = {
  async sendFriendRequest(email: string): Promise<{ success: boolean; message: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if the email belongs to an existing user
    const { data: targetUser, error: userError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', email.toLowerCase())
      .single();

    if (userError || !targetUser) {
      return { success: false, message: 'No user found with this email address' };
    }

    if (targetUser.id === user.id) {
      return { success: false, message: 'You cannot send a friend request to yourself' };
    }

    // Check if already friends
    const { data: existingFriendship } = await supabase
      .from('friendships')
      .select('id')
      .or(`and(user_id.eq.${user.id},friend_id.eq.${targetUser.id}),and(user_id.eq.${targetUser.id},friend_id.eq.${user.id})`)
      .single();

    if (existingFriendship) {
      return { success: false, message: 'You are already friends with this user' };
    }

    // Check if friend request already exists
    const { data: existingRequest } = await supabase
      .from('friend_requests')
      .select('id, status')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${targetUser.id}),and(sender_id.eq.${targetUser.id},receiver_id.eq.${user.id})`)
      .single();

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return { success: false, message: 'Friend request already pending' };
      } else if (existingRequest.status === 'rejected') {
        return { success: false, message: 'Friend request was previously rejected' };
      }
    }

    // Send friend request
    const { error: requestError } = await supabase
      .from('friend_requests')
      .insert({
        sender_id: user.id,
        receiver_id: targetUser.id,
        status: 'pending'
      });

    if (requestError) throw requestError;

    return { success: true, message: `Friend request sent to ${targetUser.full_name || email}` };
  },

  async getFriendRequests(): Promise<FriendRequest[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get friend requests
    const { data: requests, error } = await supabase
      .from('friend_requests')
      .select('id, sender_id, receiver_id, status, created_at')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!requests || requests.length === 0) return [];

    // Get profile information for all involved users
    const userIds = [...new Set([
      ...requests.map(r => r.sender_id),
      ...requests.map(r => r.receiver_id)
    ])];

    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email, profile_picture_url')
      .in('id', userIds);

    if (profileError) throw profileError;

    // Combine the data
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    
    return requests.map(request => ({
      ...request,
      sender_profile: profileMap.get(request.sender_id),
      receiver_profile: profileMap.get(request.receiver_id)
    }));
  },

  async respondToFriendRequest(requestId: string, accept: boolean): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Update the friend request status
    const { data: request, error: updateError } = await supabase
      .from('friend_requests')
      .update({ status: accept ? 'accepted' : 'rejected' })
      .eq('id', requestId)
      .eq('receiver_id', user.id) // Only receiver can respond
      .select('sender_id, receiver_id')
      .single();

    if (updateError) throw updateError;
    if (!request) throw new Error('Friend request not found');

    // If accepted, create friendship records
    if (accept) {
      const { error: friendshipError } = await supabase
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

      if (friendshipError) throw friendshipError;
    }
  },

  async getFriends(): Promise<Friend[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get friendships
    const { data: friendships, error } = await supabase
      .from('friendships')
      .select('id, user_id, friend_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!friendships || friendships.length === 0) return [];

    // Get friend profiles
    const friendIds = friendships.map(f => f.friend_id);
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email, profile_picture_url')
      .in('id', friendIds);

    if (profileError) throw profileError;

    // Combine the data
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    
    return friendships.map(friendship => ({
      ...friendship,
      friend_profile: profileMap.get(friendship.friend_id)!
    }));
  },

  async removeFriend(friendshipId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get the friendship details first
    const { data: friendship, error: fetchError } = await supabase
      .from('friendships')
      .select('user_id, friend_id')
      .eq('id', friendshipId)
      .eq('user_id', user.id)
      .single();

    if (fetchError) throw fetchError;
    if (!friendship) throw new Error('Friendship not found');

    // Remove both friendship records
    const { error: deleteError } = await supabase
      .from('friendships')
      .delete()
      .or(`and(user_id.eq.${friendship.user_id},friend_id.eq.${friendship.friend_id}),and(user_id.eq.${friendship.friend_id},friend_id.eq.${friendship.user_id})`);

    if (deleteError) throw deleteError;
  },

  // Real-time subscription for friend requests
  subscribeFriendRequests(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel('friend-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
          filter: `receiver_id=eq.${userId}`
        },
        callback
      )
      .subscribe();
  },

  // Real-time subscription for friendships
  subscribeFriendships(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel('friendships')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe();
  }
};