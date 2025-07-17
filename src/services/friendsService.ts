import { supabase } from './supabase';

// API base URL for Node.js backend  
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3001/api'
  : '/api';

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

    const response = await fetch(`${API_BASE_URL}/send-friend-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ email: email.trim() }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to send friend request');
    }

    const data = await response.json();
    return { success: true, message: data.message };
  },

  async getFriendRequests(): Promise<FriendRequest[]> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('User not authenticated');

    const response = await fetch(`${API_BASE_URL}/get-friend-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get friend requests');
    }

    const data = await response.json();
    return data || [];
  },

  async respondToFriendRequest(requestId: string, accept: boolean): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('User not authenticated');

    const response = await fetch(`${API_BASE_URL}/accept-friend-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ requestId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to respond to friend request');
    }
  },

  async getFriends(): Promise<Friend[]> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('User not authenticated');

    const response = await fetch(`${API_BASE_URL}/get-friends`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get friends');
    }

    const data = await response.json();
    return data || [];
  },

  async removeFriend(friendId: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('User not authenticated');

    const response = await fetch(`${API_BASE_URL}/remove-friend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ friendId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to remove friend');
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
      const response = await fetch(`${API_BASE_URL}/get-friend-profile-picture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ friendId }),
      });

      if (!response.ok) {
        console.error('Error calling get-friend-profile-picture API');
        return null;
      }

      const data = await response.json();
      return data?.profile_picture_url || null;
    } catch (error) {
      console.error('Error getting friend profile picture URL:', error);
      return null;
    }
  }
};