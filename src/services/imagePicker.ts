import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

export interface ImagePickerResult {
  uri: string;
  cancelled: boolean;
}

export interface ImagePickerOptions {
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
}

class ImagePickerService {
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') {
      // Web doesn't need permissions for file input
      return true;
    }
    
    // Request permissions for native platforms
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  }

  async requestCameraPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') {
      // Web camera access is handled by the browser
      return true;
    }
    
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === 'granted';
  }

  async pickImage(options: ImagePickerOptions = {}): Promise<ImagePickerResult> {
    if (Platform.OS === 'web') {
      return this.pickImageWeb(options);
    } else {
      return this.pickImageNative(options);
    }
  }

  async takePhoto(options: ImagePickerOptions = {}): Promise<ImagePickerResult> {
    if (Platform.OS === 'web') {
      // For web, we'll use the same file input (camera option handled by browser)
      return this.pickImageWeb(options);
    } else {
      return this.takePhotoNative(options);
    }
  }

  private async pickImageNative(options: ImagePickerOptions): Promise<ImagePickerResult> {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'Images' as any,
      allowsEditing: options.allowsEditing !== false,
      aspect: options.aspect || [1, 1],
      quality: options.quality || 0.8,
    });

    if (result.canceled || !result.assets[0]) {
      return { uri: '', cancelled: true };
    }

    return {
      uri: result.assets[0].uri,
      cancelled: false,
    };
  }

  private async takePhotoNative(options: ImagePickerOptions): Promise<ImagePickerResult> {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'Images' as any,
      allowsEditing: options.allowsEditing !== false,
      aspect: options.aspect || [1, 1],
      quality: options.quality || 0.8,
    });

    if (result.canceled || !result.assets[0]) {
      return { uri: '', cancelled: true };
    }

    return {
      uri: result.assets[0].uri,
      cancelled: false,
    };
  }

  private async pickImageWeb(options: ImagePickerOptions): Promise<ImagePickerResult> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      // Add capture attribute for camera access on mobile web
      input.capture = 'environment';
      
      input.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) {
          resolve({ uri: '', cancelled: true });
          return;
        }

        // Create a blob URL for the selected file
        const uri = URL.createObjectURL(file);
        resolve({ uri, cancelled: false });
      };

      input.oncancel = () => {
        resolve({ uri: '', cancelled: true });
      };

      // Trigger file selection
      input.click();
    });
  }

  async compressImage(uri: string): Promise<string> {
    if (Platform.OS === 'web') {
      // For web, we'll return the URI as-is since we're dealing with blob URLs
      // The compression will be handled during upload if needed
      return uri;
    }

    try {
      // Native compression using ImageManipulator
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 400, height: 400 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      return result.uri;
    } catch (error) {
      console.error('Error compressing image:', error);
      return uri;
    }
  }

  showImagePickerAlert(
    onTakePhoto: () => void,
    onPickImage: () => void,
    onCancel?: () => void
  ) {
    if (Platform.OS === 'web') {
      // For web, directly open file picker (includes camera option via capture attribute)
      onPickImage();
    } else {
      // For native, use the standard React Native Alert
      const { Alert } = require('react-native');
      Alert.alert(
        'Select Profile Picture',
        'Choose how you want to update your profile picture',
        [
          { text: 'Cancel', style: 'cancel', onPress: onCancel },
          { text: 'Take Photo', onPress: onTakePhoto },
          { text: 'Choose from Library', onPress: onPickImage },
        ],
        { cancelable: true }
      );
    }
  }
}

export const imagePicker = new ImagePickerService();