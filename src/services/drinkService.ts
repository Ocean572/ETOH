import { authService } from './authService';
import { DrinkEntry } from '../types';

// API base URL configuration
const API_BASE_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
  ? 'http://localhost:3001/api'
  : '/api';

export const drinkService = {
  async addDrinkEntry(drinkCount: number, drinkType?: string, notes?: string): Promise<DrinkEntry | null> {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE_URL}/drinks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        drink_count: drinkCount,
        drink_type: drinkType,
        notes: notes,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to add drink entry');
    }

    return await response.json();
  },

  async getDrinkEntries(startDate?: string, endDate?: string): Promise<DrinkEntry[]> {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const token = localStorage.getItem('authToken');
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await fetch(`${API_BASE_URL}/drinks?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get drink entries');
    }

    return await response.json();
  },

  async getTodaysDrinks(): Promise<DrinkEntry[]> {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    return this.getDrinkEntries(today, tomorrow);
  },

  async getWeeklyTotal(): Promise<number> {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const entries = await this.getDrinkEntries(oneWeekAgo);
    
    return entries.reduce((total, entry) => total + entry.drink_count, 0);
  },

  async getMonthlyTotal(): Promise<number> {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    const entries = await this.getDrinkEntries(oneMonthAgo.toISOString());
    return entries.reduce((total, entry) => total + entry.drink_count, 0);
  },

  async deleteDrinkEntry(id: string): Promise<void> {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE_URL}/drinks/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete drink entry');
    }
  },

  async updateDrinkEntry(id: string, updates: { drink_count?: number; logged_at?: string }): Promise<DrinkEntry> {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE_URL}/drinks/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update drink entry');
    }

    return await response.json();
  },

  async getDrinksForDate(date: string): Promise<DrinkEntry[]> {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE_URL}/drinks/date/${date}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get drinks for date');
    }

    return await response.json();
  },

  async addDrinkEntryForDate(drinkCount: number, date: string, time: string = '12:00'): Promise<DrinkEntry | null> {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const dateTime = `${date}T${time}:00.000Z`;

    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE_URL}/drinks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        drink_count: drinkCount,
        logged_at: dateTime,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to add drink entry');
    }

    return await response.json();
  },

  async getAverageDrinksPerDay(): Promise<{ average: number; daysSinceJoined: number }> {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE_URL}/drinks/average`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get average drinks per day');
    }

    return await response.json();
  },
};