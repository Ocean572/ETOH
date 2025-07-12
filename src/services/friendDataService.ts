import { supabase } from './supabase';
import { TimeRange, ChartData } from './analyticsService';

export interface FriendProfile {
  id: string;
  full_name?: string;
  email: string;
  profile_picture_url?: string;
  motivation_text?: string;
  created_at: string;
}

export interface FriendGoal {
  id: string;
  goal_type: 'daily' | 'weekly' | 'monthly';
  target_drinks: number;
  start_date: string;
  is_active: boolean;
}

export const friendDataService = {
  async getFriendProfile(friendId: string): Promise<FriendProfile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    try {
      // Get friend's profile - RLS policies will handle authorization
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, profile_picture_url, motivation_text, created_at')
        .eq('id', friendId)
        .single();

      if (error) {
        console.error('Profile fetch error:', error);
        throw new Error(`Unable to access friend's profile: ${error.message}`);
      }
      return data;
    } catch (error) {
      console.error('Friend profile error:', error);
      throw error;
    }
  },

  async getFriendTodaysDrinks(friendId: string): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    try {
      // Get today's drinks - RLS policies will handle authorization
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      console.log('Fetching today drinks for:', friendId, 'date range:', today, 'to', tomorrow);
      
      const { data, error } = await supabase
        .from('drink_entries')
        .select('drink_count, logged_at')
        .eq('user_id', friendId)
        .gte('logged_at', today)
        .lt('logged_at', tomorrow);

      if (error) {
        console.error('Today drinks fetch error:', error);
        throw new Error(`Unable to access friend's drink data: ${error.message}`);
      }
      
      console.log('Friend today drinks data:', data);
      const total = data?.reduce((total, entry) => total + entry.drink_count, 0) || 0;
      console.log('Friend today drinks total:', total);
      return total;
    } catch (error) {
      console.error('Friend today drinks error:', error);
      throw error;
    }
  },

  async getFriendCurrentGoal(friendId: string): Promise<FriendGoal | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    try {
      // Get current active goal - RLS policies will handle authorization
      console.log('Fetching goal for friend:', friendId);
      
      const { data, error } = await supabase
        .from('user_goals')
        .select('id, goal_type, target_drinks, start_date, is_active')
        .eq('user_id', friendId)
        .eq('is_active', true)
        .eq('goal_type', 'daily')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(); // Use maybeSingle instead of single to handle no results

      if (error) {
        console.error('Goal fetch error:', error);
        throw new Error(`Unable to access friend's goals: ${error.message}`);
      }

      console.log('Friend goal data:', data);
      return data || null;
    } catch (error) {
      console.error('Friend goal error:', error);
      throw error;
    }
  },

  async getFriendChartData(friendId: string, timeRange: TimeRange): Promise<ChartData> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const now = new Date();
    let startDate: Date;
    let labels: string[] = [];
    
    switch (timeRange) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
        }
        break;
        
      case 'month':
        startDate = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
        for (let i = 3; i >= 0; i--) {
          const weekStart = new Date(now.getTime() - (i * 7 + 6) * 24 * 60 * 60 * 1000);
          labels.push(`Week ${4 - i}`);
        }
        break;
        
      case 'year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        for (let i = 11; i >= 0; i--) {
          const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
          labels.push(month.toLocaleDateString('en-US', { month: 'short' }));
        }
        break;
        
      default:
        throw new Error('Invalid time range');
    }

    try {
      // Get friend's drink entries for the time range - RLS policies will handle authorization
      const { data: entries, error } = await supabase
        .from('drink_entries')
        .select('drink_count, logged_at')
        .eq('user_id', friendId)
        .gte('logged_at', startDate.toISOString())
        .lte('logged_at', now.toISOString())
        .order('logged_at', { ascending: true });

      if (error) {
        console.error('Chart data fetch error:', error);
        throw new Error(`Unable to access friend's drink history: ${error.message}`);
      }

      // Process data based on time range
      let chartData: number[] = [];

    switch (timeRange) {
      case 'week':
        // Group by day
        chartData = new Array(7).fill(0);
        entries?.forEach(entry => {
          const entryDate = new Date(entry.logged_at);
          const daysDiff = Math.floor((now.getTime() - entryDate.getTime()) / (24 * 60 * 60 * 1000));
          if (daysDiff >= 0 && daysDiff < 7) {
            chartData[6 - daysDiff] += entry.drink_count;
          }
        });
        break;
        
      case 'month':
        // Group by week
        chartData = new Array(4).fill(0);
        entries?.forEach(entry => {
          const entryDate = new Date(entry.logged_at);
          const daysDiff = Math.floor((now.getTime() - entryDate.getTime()) / (24 * 60 * 60 * 1000));
          const weekIndex = Math.floor(daysDiff / 7);
          if (weekIndex >= 0 && weekIndex < 4) {
            chartData[3 - weekIndex] += entry.drink_count;
          }
        });
        break;
        
      case 'year':
        // Group by month
        chartData = new Array(12).fill(0);
        entries?.forEach(entry => {
          const entryDate = new Date(entry.logged_at);
          const monthsDiff = (now.getFullYear() - entryDate.getFullYear()) * 12 + (now.getMonth() - entryDate.getMonth());
          if (monthsDiff >= 0 && monthsDiff < 12) {
            chartData[11 - monthsDiff] += entry.drink_count;
          }
        });
        break;
    }

      return {
        labels,
        data: chartData,
      };
    } catch (error) {
      console.error('Friend chart data error:', error);
      throw error;
    }
  },

  async getFriendWeeklyTotal(friendId: string): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    try {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('drink_entries')
        .select('drink_count')
        .eq('user_id', friendId)
        .gte('logged_at', oneWeekAgo);

      if (error) throw error;
      
      return data?.reduce((total, entry) => total + entry.drink_count, 0) || 0;
    } catch (error) {
      console.error('Friend weekly total error:', error);
      throw error;
    }
  },

  async getFriendMonthlyTotal(friendId: string): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    try {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      
      const { data, error } = await supabase
        .from('drink_entries')
        .select('drink_count')
        .eq('user_id', friendId)
        .gte('logged_at', oneMonthAgo.toISOString());

      if (error) throw error;
      
      return data?.reduce((total, entry) => total + entry.drink_count, 0) || 0;
    } catch (error) {
      console.error('Friend monthly total error:', error);
      throw error;
    }
  }
};