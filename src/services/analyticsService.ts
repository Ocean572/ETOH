import { drinkService } from './drinkService';
import { DrinkEntry } from '../types';

export type TimeRange = 'week' | 'month' | 'year';

export interface ChartData {
  labels: string[];
  data: number[];
  dates?: string[]; // Optional dates for week view
}

export const analyticsService = {
  async getWeeklyData(): Promise<ChartData> {
    const today = new Date();
    
    // Get Monday of current week
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay; // If Sunday, go back 6 days, otherwise go to Monday
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    
    // Get Sunday of current week  
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    const entries = await drinkService.getDrinkEntries(
      monday.toISOString().split('T')[0],
      sunday.toISOString().split('T')[0] + 'T23:59:59'
    );

    const labels = [];
    const data = [];
    const dates = [];
    
    // Generate Mon-Sun in order
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
      dates.push(date.getDate().toString()); // Just the day number
      
      const dayTotal = entries
        .filter(entry => entry.logged_at.startsWith(dateStr))
        .reduce((sum, entry) => sum + entry.drink_count, 0);
      
      data.push(dayTotal);
    }
    
    return { labels, data, dates };
  },

  async getMonthlyData(): Promise<ChartData> {
    const today = new Date();
    const labels = [];
    const data = [];
    
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - (i * 7) - 6);
      const weekEnd = new Date(today);
      weekEnd.setDate(today.getDate() - (i * 7));
      
      if (i === 0) {
        weekEnd.setDate(today.getDate());
      }
      
      const entries = await drinkService.getDrinkEntries(
        weekStart.toISOString().split('T')[0],
        weekEnd.toISOString().split('T')[0] + 'T23:59:59'
      );
      
      const weekTotal = entries.reduce((sum, entry) => sum + entry.drink_count, 0);
      
      labels.push(`Week ${4 - i}`);
      data.push(weekTotal);
    }
    
    return { labels, data };
  },

  async getYearlyData(): Promise<ChartData> {
    const today = new Date();
    const currentYear = today.getFullYear();
    const labels = [];
    const data = [];
    
    // Generate Jan-Dec in order for current year
    for (let month = 0; month < 12; month++) {
      const monthStart = new Date(currentYear, month, 1);
      const monthEnd = new Date(currentYear, month + 1, 0); // Last day of month
      
      // If it's a future month, skip it
      if (monthStart > today) {
        labels.push(monthStart.toLocaleDateString('en-US', { month: 'short' }));
        data.push(0);
        continue;
      }
      
      // If it's the current month, include the full current day
      if (month === today.getMonth()) {
        monthEnd.setDate(today.getDate());
        monthEnd.setHours(23, 59, 59, 999); // Include the entire current day
      }
      
      const startDate = monthStart.toISOString().split('T')[0];
      const endDate = monthEnd.toISOString().split('T')[0] + 'T23:59:59';
      
      const entries = await drinkService.getDrinkEntries(startDate, endDate);
      
      const monthTotal = entries.reduce((sum, entry) => sum + entry.drink_count, 0);
      
      labels.push(monthStart.toLocaleDateString('en-US', { month: 'short' }));
      data.push(monthTotal);
    }
    
    return { labels, data };
  },

  async getDataForRange(range: TimeRange): Promise<ChartData> {
    switch (range) {
      case 'week':
        return this.getWeeklyData();
      case 'month':
        return this.getMonthlyData();
      case 'year':
        return this.getYearlyData();
      default:
        return this.getWeeklyData();
    }
  },

  getYAxisLabel(range: TimeRange): string {
    switch (range) {
      case 'week':
        return 'Drinks per Day';
      case 'month':
        return 'Drinks per Week';
      case 'year':
        return 'Drinks per Month';
      default:
        return 'Drinks';
    }
  },
};