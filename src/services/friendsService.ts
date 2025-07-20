import { authService } from './authService';
import { storage } from './storage';
import config from '../utils/config';

// API base URL configuration
const API_BASE_URL = `${config.apiUrl}/api`;

// Helper function to get backend base URL (same logic as API but without /api)
const getBackendBaseUrl = () => {
  return config.apiUrl;
};

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
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const token = await storage.getItemAsync('authToken');
    const response = await fetch(`${API_BASE_URL}/send-friend-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
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
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const token = await storage.getItemAsync('authToken');
    const response = await fetch(`${API_BASE_URL}/get-friend-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
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
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const token = await storage.getItemAsync('authToken');
    const response = await fetch(`${API_BASE_URL}/accept-friend-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ requestId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to respond to friend request');
    }
  },

  async getFriends(): Promise<Friend[]> {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const token = await storage.getItemAsync('authToken');
    const response = await fetch(`${API_BASE_URL}/get-friends`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
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
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const token = await storage.getItemAsync('authToken');
    const response = await fetch(`${API_BASE_URL}/remove-friend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ friendId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to remove friend');
    }
  },

  // Real-time subscription for friend requests (websockets removed for now)
  subscribeFriendRequests(userId: string, callback: (payload: any) => void) {
    console.log('Real-time subscriptions not implemented for Node.js backend');
    return { unsubscribe: () => {} };
  },

  // Real-time subscription for friendships (websockets removed for now)
  subscribeFriendships(userId: string, callback: (payload: any) => void) {
    console.log('Real-time subscriptions not implemented for Node.js backend');
    return { unsubscribe: () => {} };
  },

  async getFriendProfilePictureUrl(friendId: string): Promise<string | null> {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    try {
      const token = await storage.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/get-friend-profile-picture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ friendId }),
      });

      if (!response.ok) {
        console.error('Error calling get-friend-profile-picture API');
        return null;
      }

      const data = await response.json();
      const relativePath = data?.profile_picture_url;
      if (relativePath) {
        // Convert relative path to absolute URL using dynamic backend URL
        return `${getBackendBaseUrl()}${relativePath}`;
      }
      return null;
    } catch (error) {
      console.error('Error getting friend profile picture URL:', error);
      return null;
    }
  }
};