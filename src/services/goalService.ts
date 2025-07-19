import { authService } from './authService';
import { UserGoal } from '../types';
import { storage } from './storage';

// API base URL configuration - simplified for reliability
const API_BASE_URL = __DEV__ 
  ? 'http://10.20.30.174:3001/api'  // Development - use host machine IP
  : '/api';                         // Production

export const goalService = {
  async getCurrentGoal(): Promise<UserGoal | null> {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const token = await storage.getItemAsync('authToken');
    const response = await fetch(`${API_BASE_URL}/goals/current`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get current goal');
    }

    return await response.json();
  },

  async setDailyGoal(targetDrinks: number): Promise<UserGoal> {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const token = await storage.getItemAsync('authToken');
    const response = await fetch(`${API_BASE_URL}/goals/daily`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        target_drinks: targetDrinks,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to set daily goal');
    }

    return await response.json();
  },

  async updateDailyGoal(targetDrinks: number): Promise<UserGoal> {
    const currentGoal = await this.getCurrentGoal();
    
    if (currentGoal) {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const token = await storage.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/goals/${currentGoal.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          target_drinks: targetDrinks,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update daily goal');
      }

      return await response.json();
    } else {
      return this.setDailyGoal(targetDrinks);
    }
  },

  async deleteGoal(goalId: string): Promise<void> {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const token = await storage.getItemAsync('authToken');
    const response = await fetch(`${API_BASE_URL}/goals/${goalId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete goal');
    }
  },
};