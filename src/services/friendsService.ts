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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('User not authenticated');

    const { data, error } = await supabase.functions.invoke('send-friend-request', {
      body: { email: email.trim() },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      console.error('Error calling send-friend-request function:', error);
      throw new Error('Failed to send friend request');
    }

    return data;
  },

  async getFriendRequests(): Promise<FriendRequest[]> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('User not authenticated');

    const { data, error } = await supabase.functions.invoke('get-friend-requests', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      console.error('Error calling get-friend-requests function:', error);
      throw new Error('Failed to get friend requests');
    }

    return data || [];
  },

  async respondToFriendRequest(requestId: string, accept: boolean): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('User not authenticated');

    const { data, error } = await supabase.functions.invoke('accept-friend-request', {
      body: { requestId, accept },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      console.error('Error calling accept-friend-request function:', error);
      throw new Error('Failed to respond to friend request');
    }

    if (!data.success) {
      throw new Error(data.error || 'Failed to respond to friend request');
    }
  },

  async getFriends(): Promise<Friend[]> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('User not authenticated');

    const { data, error } = await supabase.functions.invoke('get-friends', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      console.error('Error calling get-friends function:', error);
      throw new Error('Failed to get friends');
    }

    return data || [];
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