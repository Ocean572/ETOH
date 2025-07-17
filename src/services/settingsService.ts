import { authService } from './authService';
import { UserProfile } from '../types';

// API base URL configuration
const API_BASE_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
  ? 'http://localhost:3001/api'
  : '/api';

export const settingsService = {
  async uploadProfilePicture(compressedImageUri: string): Promise<string> {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    try {
      // Create a unique filename
      const fileExt = compressedImageUri.split('.').pop() || 'jpg';
      const fileName = `${user.id}/profile-${Date.now()}.${fileExt}`;
      
      // For React Native, we need to handle the file differently
      const formData = new FormData();
      formData.append('file', {
        uri: compressedImageUri,
        type: `image/${fileExt}`,
        name: fileName.split('/').pop()
      } as any);
      
      // Upload to Node.js backend
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/upload/profile-picture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload failed:', response.status, errorText);
        throw new Error(`Upload failed: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Image uploaded:', data.fileName);
      return data.fileName;
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      throw error;
    }
  },
  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE_URL}/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Update failed');
    }

    return await response.json();
  },

  async getProfile(): Promise<UserProfile | null> {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE_URL}/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get profile');
    }

    return await response.json();
  },

  async updateMotivation(motivation: string): Promise<void> {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE_URL}/profile/motivation`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ motivation_text: motivation }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update motivation');
    }
  },

  async resetApplication(): Promise<void> {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE_URL}/profile/reset`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to reset application');
    }
  },

  async signOut(): Promise<void> {
    await authService.signOut();
  },
};