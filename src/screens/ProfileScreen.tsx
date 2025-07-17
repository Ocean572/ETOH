import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Alert, 
  Image,
  Keyboard
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { settingsService } from '../services/settingsService';
import { goalService } from '../services/goalService';
import { authStateManager } from '../services/authStateManager';
import { UserProfile, UserGoal } from '../types';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [currentGoal, setCurrentGoal] = useState<UserGoal | null>(null);
  const [fullName, setFullName] = useState('');
  const [motivation, setMotivation] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | 'prefer_not_to_say' | ''>('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingMotivation, setIsEditingMotivation] = useState(false);
  const [isEditingGender, setIsEditingGender] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Refresh data when screen comes into focus (e.g., navigating back from Goals)
  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const [profileData, goalData] = await Promise.all([
        settingsService.getProfile(),
        goalService.getCurrentGoal(),
      ]);
      
      setProfile(profileData);
      setCurrentGoal(goalData);
      setFullName(profileData?.full_name || '');
      setMotivation(profileData?.motivation_text || '');
      setGender(profileData?.gender || '');
      console.log('Profile loaded, profile_picture_url:', profileData?.profile_picture_url);
      
      // Set profile picture URL directly from backend
      if (profileData?.profile_picture_url) {
        setProfilePictureUrl(profileData.profile_picture_url);
      } else {
        setProfilePictureUrl(null);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const compressImage = async (uri: string): Promise<string> => {
    try {
      // Start with high quality and gradually reduce if needed
      let quality = 0.8;
      let compressedImage = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 400, height: 400 } }], // Resize to 400x400 max
        { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
      );

      // In React Native, we can't easily check file size via headers
      // So we'll just do a reasonable compression and trust the 1MB storage limit
      console.log(`Image compressed and resized to 400x400 with ${quality} quality`);
      return compressedImage.uri;
    } catch (error) {
      console.error('Error compressing image:', error);
      return uri; // Return original if compression fails
    }
  };

  const showImagePickerOptions = () => {
    Alert.alert(
      'Select Profile Picture',
      'Choose how you want to update your profile picture',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Library', onPress: pickImage },
      ],
      { cancelable: true }
    );
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera permissions to take a photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'Images' as any,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        console.log('Original camera image URI:', imageUri);
        const compressedUri = await compressImage(imageUri);
        console.log('Compressed camera image URI:', compressedUri);
        
        // Upload to Supabase storage and get the storage path
        const storagePath = await settingsService.uploadProfilePicture(compressedUri);
        console.log('Image uploaded to storage path:', storagePath);
        
        // Update profile with storage path
        await settingsService.updateProfile({ profile_picture_url: storagePath });
        await loadData();
        Alert.alert('Success', 'Profile picture updated!');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to update your profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'Images' as any,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        console.log('Original library image URI:', imageUri);
        const compressedUri = await compressImage(imageUri);
        console.log('Compressed library image URI:', compressedUri);
        
        // Upload to Supabase storage and get the storage path
        const storagePath = await settingsService.uploadProfilePicture(compressedUri);
        console.log('Image uploaded to storage path:', storagePath);
        
        // Update profile with storage path
        await settingsService.updateProfile({ profile_picture_url: storagePath });
        await loadData();
        Alert.alert('Success', 'Profile picture updated!');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const saveFullName = async () => {
    try {
      await settingsService.updateProfile({ full_name: fullName });
      setIsEditingName(false);
      await loadData();
      Keyboard.dismiss();
      Alert.alert('Success', 'Name updated!');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const saveMotivation = async () => {
    try {
      await settingsService.updateMotivation(motivation);
      setIsEditingMotivation(false);
      await loadData();
      Keyboard.dismiss();
      Alert.alert('Success', 'Motivation updated!');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const saveGender = async () => {
    try {
      await settingsService.updateProfile({ gender: gender as 'male' | 'female' | 'other' | 'prefer_not_to_say' });
      setIsEditingGender(false);
      await loadData();
      Alert.alert('Success', 'Gender updated!');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Application',
      'This will permanently delete all your drink entries, goals, and statistics. Your average calculations will restart from today. This action cannot be undone.\n\nAre you sure you want to continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await settingsService.resetApplication();
              Alert.alert('Success', 'Application has been reset. Your journey starts fresh today!');
              await loadData();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await settingsService.signOut();
              // Notify all listeners that auth state changed
              authStateManager.notifyAuthChanged();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>Loading settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>Manage your profile and preferences</Text>
      </View>

      {/* Profile Picture */}
      <View style={styles.profileSection}>
        <TouchableOpacity style={styles.profilePictureContainer} onPress={showImagePickerOptions}>
          {profilePictureUrl ? (
            <Image 
              source={{ uri: profilePictureUrl }} 
              style={styles.profilePicture}
              onError={(error) => {
                console.log('Profile image failed to load:', profilePictureUrl, error);
              }}
              onLoad={() => {
                console.log('Profile image loaded successfully:', profilePictureUrl);
              }}
            />
          ) : (
            <View style={styles.profilePicturePlaceholder}>
              <Text style={styles.profilePictureText}>📷</Text>
              <Text style={styles.profilePictureSubtext}>Add Photo</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.changePictureButton} onPress={showImagePickerOptions}>
          <Text style={styles.changePictureText}>📷 Change Profile Picture</Text>
        </TouchableOpacity>
      </View>

      {/* Profile Information */}
      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Profile Information</Text>
        
        {/* Full Name */}
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Full Name</Text>
          {isEditingName ? (
            <View style={styles.editContainer}>
              <TextInput
                style={styles.editInput}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                autoFocus
              />
              <View style={styles.editButtons}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => {
                    setFullName(profile?.full_name || '');
                    setIsEditingName(false);
                    Keyboard.dismiss();
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.saveButton}
                  onPress={saveFullName}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.infoValue}
              onPress={() => setIsEditingName(true)}
            >
              <Text style={styles.infoText}>
                {profile?.full_name || 'Tap to add your name'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Email */}
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Email</Text>
          <View style={styles.infoValue}>
            <Text style={styles.infoText}>{profile?.email || 'Not available'}</Text>
          </View>
        </View>

        {/* Gender */}
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Gender</Text>
          {isEditingGender ? (
            <View style={styles.editContainer}>
              <View style={styles.genderOptions}>
                {[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                  { value: 'other', label: 'Other' },
                  { value: 'prefer_not_to_say', label: 'Prefer not to say' }
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.genderOption,
                      gender === option.value && styles.genderOptionSelected
                    ]}
                    onPress={() => setGender(option.value as any)}
                  >
                    <Text style={[
                      styles.genderOptionText,
                      gender === option.value && styles.genderOptionTextSelected
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.editButtons}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => {
                    setGender(profile?.gender || '');
                    setIsEditingGender(false);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.saveButton}
                  onPress={saveGender}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.infoValue}
              onPress={() => setIsEditingGender(true)}
            >
              <Text style={styles.infoText}>
                {profile?.gender ? 
                  profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1).replace('_', ' ') :
                  'Tap to set gender'
                }
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Current Goals */}
      <View style={styles.goalsSection}>
        <Text style={styles.sectionTitle}>Current Goals</Text>
        {currentGoal ? (
          <View style={styles.goalCard}>
            <Text style={styles.goalText}>
              Daily Goal: {currentGoal.target_drinks} drinks per day
            </Text>
            <Text style={styles.goalSubtext}>
              Active since {new Date(currentGoal.start_date).toLocaleDateString()}
            </Text>
          </View>
        ) : (
          <View style={styles.noGoalCard}>
            <Text style={styles.noGoalText}>No active goals set</Text>
            <Text style={styles.noGoalSubtext}>Visit the Goals tab to set your daily target</Text>
          </View>
        )}
      </View>

      {/* Motivation */}
      <View style={styles.motivationSection}>
        <Text style={styles.sectionTitle}>Why I'm Reducing Alcohol</Text>
        <Text style={styles.motivationDescription}>
          Write down your reasons for reducing alcohol. This can help keep you motivated.
        </Text>
        
        {isEditingMotivation ? (
          <View style={styles.editContainer}>
            <TextInput
              style={styles.motivationInput}
              value={motivation}
              onChangeText={setMotivation}
              placeholder="Enter your reasons for reducing alcohol intake..."
              multiline
              textAlignVertical="top"
              autoFocus
            />
            <View style={styles.editButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  setMotivation(profile?.motivation_text || '');
                  setIsEditingMotivation(false);
                  Keyboard.dismiss();
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={saveMotivation}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.motivationCard}
            onPress={() => setIsEditingMotivation(true)}
          >
            <Text style={styles.motivationText}>
              {profile?.motivation_text || 'Tap to add your reasons for reducing alcohol...'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Reset Application */}
      <View style={styles.resetSection}>
        <Text style={styles.sectionTitle}>Reset Application</Text>
        <Text style={styles.resetDescription}>
          This will permanently delete all your data and start fresh. Your averages will begin calculating from the reset date.
        </Text>
        <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
          <Text style={styles.resetButtonText}>🗑️ Reset All Data</Text>
        </TouchableOpacity>
      </View>

      {/* Sign Out */}
      <View style={styles.signOutSection}>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 5,
  },
  profileSection: {
    backgroundColor: 'white',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  profilePictureContainer: {
    marginBottom: 15,
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profilePicturePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ecf0f1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#bdc3c7',
    borderStyle: 'dashed',
  },
  profilePictureText: {
    fontSize: 32,
  },
  profilePictureSubtext: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 5,
  },
  changePictureButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#3498db',
    borderRadius: 6,
  },
  changePictureText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  infoSection: {
    backgroundColor: 'white',
    padding: 20,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  infoItem: {
    marginBottom: 20,
  },
  infoLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 5,
    fontWeight: '600',
  },
  infoValue: {
    minHeight: 44,
    justifyContent: 'center',
  },
  infoText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  editContainer: {
    gap: 10,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  editButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#95a5a6',
    borderRadius: 6,
    alignItems: 'center',
  },
  saveButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#27ae60',
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  genderOptions: {
    gap: 8,
  },
  genderOption: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    backgroundColor: '#f9f9f9',
  },
  genderOptionSelected: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  genderOptionText: {
    fontSize: 16,
    color: '#2c3e50',
    textAlign: 'center',
  },
  genderOptionTextSelected: {
    color: 'white',
    fontWeight: 'bold',
  },
  goalsSection: {
    backgroundColor: 'white',
    padding: 20,
    marginTop: 10,
  },
  goalCard: {
    backgroundColor: '#e8f5e8',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#27ae60',
  },
  goalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  goalSubtext: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 5,
  },
  noGoalCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  noGoalText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  noGoalSubtext: {
    fontSize: 14,
    color: '#95a5a6',
    marginTop: 5,
  },
  motivationSection: {
    backgroundColor: 'white',
    padding: 20,
    marginTop: 10,
  },
  motivationDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 15,
    lineHeight: 20,
  },
  motivationInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    minHeight: 100,
  },
  motivationCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    minHeight: 100,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  motivationText: {
    fontSize: 16,
    color: '#2c3e50',
    lineHeight: 22,
  },
  resetSection: {
    backgroundColor: 'white',
    padding: 20,
    marginTop: 10,
  },
  resetDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 15,
    lineHeight: 20,
  },
  resetButton: {
    backgroundColor: '#e74c3c',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  resetButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  signOutSection: {
    backgroundColor: 'white',
    padding: 20,
    marginTop: 10,
    marginBottom: 30,
  },
  signOutButton: {
    backgroundColor: '#34495e',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  signOutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});