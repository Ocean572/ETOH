import { storage } from './storage';
import config from '../utils/config';

// API base URL configuration
const API_BASE_URL = `${config.apiUrl}/api`;

export const authService = {
  async signUp(email: string, password: string, fullName?: string, gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say') {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        full_name: fullName,
        gender,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }
    
    // Store tokens in storage
    if (data.accessToken) {
      await storage.setItemAsync('authToken', data.accessToken);
    }
    if (data.refreshToken) {
      await storage.setItemAsync('refreshToken', data.refreshToken);
    }
    
    return data;
  },

  async signIn(email: string, password: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }
      
      // Store tokens in storage
      if (data.accessToken) {
        await storage.setItemAsync('authToken', data.accessToken);
      }
      if (data.refreshToken) {
        await storage.setItemAsync('refreshToken', data.refreshToken);
      }
      
      return data;
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw error;
    }
  },

  async getCurrentUser() {
    const token = await storage.getItemAsync('authToken');
    if (!token) {
      return null;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // Token is invalid, remove it
        await storage.removeItemAsync('authToken');
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting current user:', error);
      await storage.removeItemAsync('authToken');
      return null;
    }
  },

  async refreshToken() {
    const refreshToken = await storage.getItemAsync('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        // Refresh token is invalid, clear all tokens
        await this.signOut();
        throw new Error(data.error || 'Token refresh failed');
      }
      
      // Store new access token
      if (data.accessToken) {
        await storage.setItemAsync('authToken', data.accessToken);
      }
      
      return data.accessToken;
    } catch (error: any) {
      console.error('Token refresh error:', error);
      await this.signOut(); // Clear invalid tokens
      throw error;
    }
  },

  async signOut() {
    await storage.removeItemAsync('authToken');
    await storage.removeItemAsync('refreshToken');
  },
};