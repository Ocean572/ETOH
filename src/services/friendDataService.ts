// Temporary stub for friendDataService - to be removed
// This file exists only to prevent build errors during transition

export interface FriendProfile {
  id: string;
  full_name: string;
  email: string;
  profile_picture_url?: string;
}

export interface FriendGoal {
  id: string;
  goal_type: string;
  target_drinks: number;
  start_date: string;
  end_date?: string;
  is_active: boolean;
}

export const friendDataService = {
  async getFriendProfile(friendId: string): Promise<FriendProfile | null> {
    return null;
  },

  async getFriendGoals(friendId: string): Promise<FriendGoal[]> {
    return [];
  },

  async getFriendAnalytics(friendId: string): Promise<any> {
    return null;
  },
};