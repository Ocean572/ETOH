import { drinkService } from './drinkService';
import { DrinkEntry } from '../types';

export type TimeRange = 'week' | 'month' | 'year';

export interface ChartData {
  labels: string[];
  data: number[];
}

// Helper function to get Monday of the current week
const getMonday = (date: Date): Date => {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(date.setDate(diff));
};

// Helper function to get start date based on time range
const getStartDate = (range: TimeRange): string => {
  const now = new Date();
  
  switch (range) {
    case 'week':
      // Start from Monday of current week, go back to Monday of last week
      const monday = getMonday(new Date(now));
      monday.setDate(monday.getDate() - 6); // Go back 6 days to get 7 days total (Mon-Sun)
      return monday.toISOString().split('T')[0];
    case 'month':
      // Start from first day of current month
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return monthStart.toISOString().split('T')[0];
    case 'year':
      // Start from January 1st of current year
      const yearStart = new Date(now.getFullYear(), 0, 1);
      return yearStart.toISOString().split('T')[0];
  }
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
    // Group by day from Monday to Sunday of current week
    const monday = getMonday(new Date(now));
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayTotal = entries
        .filter(entry => entry.logged_at.startsWith(dateStr))
        .reduce((sum, entry) => sum + entry.drink_count, 0);
      
      labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
      data.push(dayTotal);
    }
  } else if (range === 'month') {
    // Group by week within the current month (Week 1, Week 2, Week 3, Week 4)
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    
    // Find the first Monday of the month (or before if month doesn't start on Monday)
    const firstMonday = getMonday(new Date(firstDayOfMonth));
    if (firstMonday > firstDayOfMonth) {
      firstMonday.setDate(firstMonday.getDate() - 7);
    }
    
    // Create 4 weeks of data
    for (let week = 1; week <= 4; week++) {
      const weekStart = new Date(firstMonday);
      weekStart.setDate(firstMonday.getDate() + (week - 1) * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      const weekTotal = entries
        .filter(entry => {
          const entryDate = new Date(entry.logged_at);
          return entryDate >= weekStart && entryDate <= weekEnd;
        })
        .reduce((sum, entry) => sum + entry.drink_count, 0);
      
      labels.push(`Week ${week}`);
      data.push(weekTotal);
    }
  } else if (range === 'year') {
    // Group by month for the current year (January to December)
    const currentYear = now.getFullYear();
    
    for (let month = 0; month < 12; month++) {
      const monthStart = new Date(currentYear, month, 1);
      const monthEnd = new Date(currentYear, month + 1, 0);
      
      const monthTotal = entries
        .filter(entry => {
          const entryDate = new Date(entry.logged_at);
          return entryDate >= monthStart && entryDate <= monthEnd;
        })
        .reduce((sum, entry) => sum + entry.drink_count, 0);
      
      labels.push(monthStart.toLocaleDateString('en-US', { month: 'short' }));
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