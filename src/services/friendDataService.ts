import { authService } from './authService';
import { ChartData, TimeRange } from './analyticsService';
import { storage } from './storage';
import config from '../utils/config';

// API base URL configuration
const API_BASE_URL = `${config.apiUrl}/api`;

export interface FriendProfile {
  id: string;
  full_name: string;
  email: string;
  profile_picture_url?: string;
  motivation_text?: string;
  created_at?: string;
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
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const token = await storage.getItemAsync('authToken');
    const response = await fetch(`${API_BASE_URL}/friends/${friendId}/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to fetch friend profile');
    }

    return await response.json();
  },

  async getFriendGoals(friendId: string): Promise<FriendGoal[]> {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const token = await storage.getItemAsync('authToken');
    const response = await fetch(`${API_BASE_URL}/friends/${friendId}/goals`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) return [];
      throw new Error('Failed to fetch friend goals');
    }

    return await response.json();
  },

  async getFriendCurrentGoal(friendId: string): Promise<FriendGoal | null> {
    const goals = await this.getFriendGoals(friendId);
    return goals.find(goal => goal.is_active) || null;
  },

  async getFriendTodaysDrinks(friendId: string): Promise<number> {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const token = await storage.getItemAsync('authToken');
    const today = new Date().toISOString().split('T')[0];
    
    const response = await fetch(`${API_BASE_URL}/friends/${friendId}/drinks/today?date=${today}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) return 0;
      throw new Error('Failed to fetch friend drinks');
    }

    const data = await response.json();
    return data.totalDrinks || 0;
  },

  async getFriendChartData(friendId: string, timeRange: TimeRange): Promise<ChartData> {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const token = await storage.getItemAsync('authToken');
    const response = await fetch(`${API_BASE_URL}/friends/${friendId}/drinks/chart?timeRange=${timeRange}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) return { labels: [], data: [] };
      throw new Error('Failed to fetch friend chart data');
    }

    return await response.json();
  },

  async getFriendAnalytics(friendId: string): Promise<any> {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const token = await storage.getItemAsync('authToken');
    const response = await fetch(`${API_BASE_URL}/friends/${friendId}/analytics`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to fetch friend analytics');
    }

    return await response.json();
  },
};