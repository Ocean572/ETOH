import { drinkService } from './drinkService';
import { DrinkEntry } from '../types';

export type TimeRange = 'week' | 'month' | 'year';

export interface ChartData {
  labels: string[];
  data: number[];
}

// Helper function to get start date based on time range
const getStartDate = (range: TimeRange): string => {
  const now = new Date();
  const start = new Date();
  
  switch (range) {
    case 'week':
      start.setDate(now.getDate() - 6); // Last 7 days
      break;
    case 'month':
      start.setDate(now.getDate() - 27); // Last 4 weeks (28 days)
      break;
    case 'year':
      start.setMonth(now.getMonth() - 11); // Last 12 months
      break;
  }
  
  return start.toISOString().split('T')[0];
};

// Helper function to format labels based on time range
const formatLabel = (date: Date, range: TimeRange): string => {
  switch (range) {
    case 'week':
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
    case 'month':
      const weekNum = Math.ceil((date.getDate() + new Date(date.getFullYear(), date.getMonth(), 1).getDay()) / 7);
      return `Week ${weekNum}`;
    case 'year':
      return date.toLocaleDateString('en-US', { month: 'short' });
    default:
      return date.toLocaleDateString();
  }
};

// Helper function to group drink entries by time period
const groupEntriesByPeriod = (entries: DrinkEntry[], range: TimeRange): ChartData => {
  const now = new Date();
  const labels: string[] = [];
  const data: number[] = [];
  
  if (range === 'week') {
    // Group by day for the last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(now.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayTotal = entries
        .filter(entry => entry.logged_at.startsWith(dateStr))
        .reduce((sum, entry) => sum + entry.drink_count, 0);
      
      labels.push(formatLabel(date, range));
      data.push(dayTotal);
    }
  } else if (range === 'month') {
    // Group by week for the last 4 weeks
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(now.getDate() - (i * 7) - 6);
      const weekEnd = new Date();
      weekEnd.setDate(now.getDate() - (i * 7));
      
      const weekTotal = entries
        .filter(entry => {
          const entryDate = new Date(entry.logged_at);
          return entryDate >= weekStart && entryDate <= weekEnd;
        })
        .reduce((sum, entry) => sum + entry.drink_count, 0);
      
      labels.push(`Week ${4 - i}`);
      data.push(weekTotal);
    }
  } else if (range === 'year') {
    // Group by month for the last 12 months
    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date();
      monthDate.setMonth(now.getMonth() - i);
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
      
      const monthTotal = entries
        .filter(entry => {
          const entryDate = new Date(entry.logged_at);
          return entryDate >= monthStart && entryDate <= monthEnd;
        })
        .reduce((sum, entry) => sum + entry.drink_count, 0);
      
      labels.push(formatLabel(monthDate, range));
      data.push(monthTotal);
    }
  }
  
  return { labels, data };
};

export const analyticsService = {
  async getDataForRange(range: TimeRange): Promise<ChartData> {
    try {
      const startDate = getStartDate(range);
      const endDate = new Date().toISOString().split('T')[0];
      
      // Get all drink entries for the time range
      const entries = await drinkService.getDrinkEntries(startDate, endDate);
      
      // Group and format the data based on the time range
      return groupEntriesByPeriod(entries, range);
    } catch (error) {
      console.error('Error getting analytics data:', error);
      return { labels: [], data: [] };
    }
  },

  // Keep these for backward compatibility
  async getDrinkingAnalytics(): Promise<ChartData> {
    return this.getDataForRange('week');
  },

  async getWeeklyAnalytics(): Promise<ChartData> {
    return this.getDataForRange('month');
  },

  async getMonthlyAnalytics(): Promise<ChartData> {
    return this.getDataForRange('year');
  },
};