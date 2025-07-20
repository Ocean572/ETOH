import { authService } from './authService';
import { UserProfile } from '../types';
import { storage } from './storage';
import config from '../utils/config';

// API base URL configuration
const API_BASE_URL = `${config.apiUrl}/api`;

export const settingsService = {
  async uploadProfilePicture(compressedImageUri: string): Promise<string> {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    try {
      // Create a unique filename
      const fileExt = compressedImageUri.split('.').pop() || 'jpg';
      const fileName = `profile-${Date.now()}.${fileExt}`;
      
      // For web (iOS Safari), we need to handle files differently than React Native
      const formData = new FormData();
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      // Check if we're dealing with a blob URL (web) or file URI (native)
      if (compressedImageUri.startsWith('blob:') || compressedImageUri.startsWith('data:')) {
        // Convert blob URL to blob for web upload with iOS-specific handling
        const response = await fetch(compressedImageUri);
        
        // Add timeout for iOS blob conversion to prevent hanging
        const blob = await Promise.race([
          response.blob(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Blob conversion timeout - iOS Safari may have memory constraints')), 15000)
          )
        ]);
        
        // For iOS, ensure we have a proper MIME type
        const finalBlob = blob.type ? blob : new Blob([blob], { type: 'image/jpeg' });
        
        formData.append('file', finalBlob, fileName);
      } else {
        // Native React Native file handling
        formData.append('file', {
          uri: compressedImageUri,
          type: `image/${fileExt}`,
          name: fileName
        } as any);
      }
      
      // Upload to Node.js backend
      const token = await storage.getItemAsync('authToken');
      
      // For iOS Safari, don't set Content-Type header - let the browser handle it
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`,
      };
      
      // Add longer timeout for iOS uploads
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, isIOS ? 30000 : 20000); // 30s for iOS, 20s for others
      
      try {
        const response = await fetch(`${API_BASE_URL}/upload/profile-picture`, {
          method: 'POST',
          headers,
          body: formData,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Upload failed: ${response.status} ${errorText}`);
        }
        
        const data = await response.json();
        return data.fileName;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      // Provide more specific error messages for iOS issues
      if (error.name === 'AbortError') {
        throw new Error(`Upload timeout - ${isIOS ? 'iOS Safari may have network constraints' : 'Network request took too long'}`);
      }
      
      if (error.message.includes('Blob conversion timeout')) {
        throw new Error('Image processing failed on iOS Safari - try a smaller image or use a different browser');
      }
      
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  },
  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const token = await storage.getItemAsync('authToken');
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

    const token = await storage.getItemAsync('authToken');
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

    const token = await storage.getItemAsync('authToken');
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

    const token = await storage.getItemAsync('authToken');
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