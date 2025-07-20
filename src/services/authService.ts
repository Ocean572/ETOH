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
    
    // Store token in storage
    if (data.token) {
      await storage.setItemAsync('authToken', data.token);
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
      
      // Store token in storage
      if (data.token) {
        await storage.setItemAsync('authToken', data.token);
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

  async signOut() {
    await storage.removeItemAsync('authToken');
  },
};