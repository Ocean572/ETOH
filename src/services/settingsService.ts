import { authService } from './authService';
import { UserProfile } from '../types';

// API base URL configuration
const API_BASE_URL = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || 
   window.location.hostname.startsWith('10.') ||
   window.location.hostname.startsWith('192.168.') ||
   window.location.hostname.startsWith('172.'))
  ? `http://${window.location.hostname}:3001/api`
  : '/api';

export const settingsService = {
  async uploadProfilePicture(compressedImageUri: string): Promise<string> {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    try {
      console.log('DEBUG: Starting upload process');
      console.log('DEBUG: Image URI:', compressedImageUri);
      console.log('DEBUG: API_BASE_URL:', API_BASE_URL);
      
      // Create a unique filename
      const fileExt = compressedImageUri.split('.').pop() || 'jpg';
      const fileName = `profile-${Date.now()}.${fileExt}`;
      console.log('DEBUG: Generated filename:', fileName);
      
      // For web (iOS Safari), we need to handle files differently than React Native
      const formData = new FormData();
      
      // Check if we're dealing with a blob URL (web) or file URI (native)
      if (compressedImageUri.startsWith('blob:') || compressedImageUri.startsWith('data:')) {
        console.log('DEBUG: Handling web blob/data URL');
        // Convert blob URL to blob for web upload
        const response = await fetch(compressedImageUri);
        const blob = await response.blob();
        console.log('DEBUG: Blob created, size:', blob.size, 'type:', blob.type);
        formData.append('file', blob, fileName);
      } else {
        console.log('DEBUG: Handling native file URI');
        // Native React Native file handling
        formData.append('file', {
          uri: compressedImageUri,
          type: `image/${fileExt}`,
          name: fileName
        } as any);
      }
      
      // Upload to Node.js backend
      const token = localStorage.getItem('authToken');
      console.log('DEBUG: Making upload request to:', `${API_BASE_URL}/upload/profile-picture`);
      
      const response = await fetch(`${API_BASE_URL}/upload/profile-picture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });
      
      console.log('DEBUG: Upload response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('DEBUG: Upload failed:', response.status, errorText);
        throw new Error(`Upload failed: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      console.log('DEBUG: Upload successful, response:', data);
      return data.fileName;
    } catch (error) {
      console.error('DEBUG: Upload error:', error);
      throw new Error(`Failed to upload image: ${error.message}`);
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