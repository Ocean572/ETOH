import { drinkService } from './drinkService';
import { DrinkEntry } from '../types';

export type TimeRange = 'week' | 'month' | 'year';

export interface ChartData {
  labels: string[];
  data: number[];
}

export const analyticsService = {
  async getWeeklyData(): Promise<ChartData> {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - 6); // Last 7 days including today
    
    const entries = await drinkService.getDrinkEntries(
      startOfWeek.toISOString().split('T')[0],
      today.toISOString().split('T')[0] + 'T23:59:59'
    );

    const labels = [];
    const data = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
      
      const dayTotal = entries
        .filter(entry => entry.logged_at.startsWith(dateStr))
        .reduce((sum, entry) => sum + entry.drink_count, 0);
      
      data.push(dayTotal);
    }
    
    return { labels, data };
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
    const labels = [];
    const data = [];
    
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
      
      if (i === 0) {
        monthEnd.setDate(today.getDate());
      }
      
      const entries = await drinkService.getDrinkEntries(
        monthStart.toISOString().split('T')[0],
        monthEnd.toISOString().split('T')[0] + 'T23:59:59'
      );
      
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