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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('User not authenticated');

    const { data, error } = await supabase.functions.invoke('remove-friend', {
      body: { friendshipId },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      console.error('Error calling remove-friend function:', error);
      throw new Error('Failed to remove friend');
    }

    if (!data.success) {
      throw new Error(data.error || 'Failed to remove friend');
    }
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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `friend_id=eq.${userId}`
        },
        callback
      )
      .subscribe();
  },

  async getFriendProfilePictureUrl(friendId: string): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase.functions.invoke('get-friend-profile-picture', {
        body: { friend_id: friendId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error calling get-friend-profile-picture function:', error);
        return null;
      }

      return data?.signedUrl || null;
    } catch (error) {
      console.error('Error getting friend profile picture URL:', error);
      return null;
    }
  }
};