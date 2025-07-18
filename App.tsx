import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, Alert, StyleSheet, Platform } from 'react-native';

import { authService } from './src/services/authService';
import { authStateManager } from './src/services/authStateManager';
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import HistoryScreenComponent from './src/screens/HistoryScreen';
import GoalsScreenComponent from './src/screens/GoalsScreen';
import HealthScreenComponent from './src/screens/HealthScreen';
import ProfileScreenComponent from './src/screens/ProfileScreen';
import FriendsScreenComponent from './src/screens/FriendsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function HistoryScreen() {
  return <HistoryScreenComponent />;
}

function GoalsScreen() {
  return <GoalsScreenComponent />;
}

function HealthScreen() {
  return <HealthScreenComponent />;
}

function FriendsScreen() {
  return <FriendsScreenComponent />;
}

function ProfileScreen() {
  return <ProfileScreenComponent />;
}

// Profile Button Component
function ProfileButton({ navigation }: { navigation: any }) {
  const [showDropdown, setShowDropdown] = useState(false);

  const handleProfilePress = () => {
    if (Platform.OS === 'web') {
      setShowDropdown(!showDropdown);
    } else {
      // Use Alert on mobile
      Alert.alert(
        'Profile Menu',
        'Choose an option',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Profile', onPress: () => navigation.navigate('Profile') },
          { 
            text: 'Logout', 
            style: 'destructive',
            onPress: handleLogout
          },
        ],
        { cancelable: true }
      );
    }
  };

  const handleLogout = async () => {
    try {
      await authService.signOut();
      setShowDropdown(false);
      // Notify all listeners that auth state changed
      authStateManager.notifyAuthChanged();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleProfileNavigation = () => {
    navigation.navigate('Profile');
    setShowDropdown(false);
  };

  return (
    <View style={profileButtonStyles.container}>
      <TouchableOpacity onPress={handleProfilePress} style={profileButtonStyles.button}>
        <Text style={profileButtonStyles.icon}>👤</Text>
      </TouchableOpacity>
      
      {Platform.OS === 'web' && showDropdown && (
        <View style={profileButtonStyles.dropdown}>
          <TouchableOpacity 
            style={profileButtonStyles.dropdownItem}
            onPress={handleProfileNavigation}
          >
            <Text style={profileButtonStyles.dropdownText}>Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[profileButtonStyles.dropdownItem, profileButtonStyles.logoutItem]}
            onPress={handleLogout}
          >
            <Text style={[profileButtonStyles.dropdownText, profileButtonStyles.logoutText]}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {Platform.OS === 'web' && showDropdown && (
        <TouchableOpacity 
          style={profileButtonStyles.overlay}
          onPress={() => setShowDropdown(false)}
        />
      )}
    </View>
  );
}

const profileButtonStyles = StyleSheet.create({
  container: {
    position: 'relative',
    marginLeft: 15,
  },
  button: {
    padding: 5,
  },
  icon: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dropdown: {
    position: 'absolute',
    top: 35,
    left: 0,
    backgroundColor: 'white',
    borderRadius: 8,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.25)',
    elevation: 5,
    minWidth: 120,
    zIndex: 1000,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  dropdownText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  logoutText: {
    color: '#e74c3c',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  } as any, // TypeScript doesn't recognize 'fixed' but it works on web
});

function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ navigation }) => ({
        tabBarActiveTintColor: '#3498db',
        tabBarInactiveTintColor: '#7f8c8d',
        headerStyle: {
          backgroundColor: '#3498db',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerLeft: () => <ProfileButton navigation={navigation} />,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{
          title: 'Today',
          headerTitle: 'ETOH Tracker',
        }}
      />
      <Tab.Screen 
        name="History" 
        component={HistoryScreen}
        options={{
          title: 'History',
        }}
      />
      <Tab.Screen 
        name="Goals" 
        component={GoalsScreen}
        options={{
          title: 'Goals',
        }}
      />
      <Tab.Screen 
        name="Health" 
        component={HealthScreen}
        options={{
          title: 'Health',
        }}
      />
      <Tab.Screen 
        name="Friends" 
        component={FriendsScreen}
        options={{
          title: 'Friends',
        }}
      />
    </Tab.Navigator>
  );
}

function MainStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#3498db',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="Main" 
        component={MainTabNavigator} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          title: 'Profile',
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [navigationState, setNavigationState] = useState();
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  useEffect(() => {
    checkAuthStatus();
    
    // Listen for auth changes from logout buttons
    const handleAuthChange = () => {
      checkAuthStatus();
    };
    
    authStateManager.addListener(handleAuthChange);
    return () => authStateManager.removeListener(handleAuthChange);
  }, []);

  useEffect(() => {
    const restoreNavigationState = async () => {
      try {
        if (typeof window !== 'undefined') {
          const savedStateString = localStorage.getItem('NAVIGATION_STATE');
          const state = savedStateString ? JSON.parse(savedStateString) : undefined;
          if (state !== undefined) {
            setNavigationState(state);
          }
        }
      } catch (e) {
        // Error occurred while restoring navigation state
        console.log('Could not restore navigation state:', e);
      } finally {
        setIsNavigationReady(true);
      }
    };

    restoreNavigationState();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const user = await authService.getCurrentUser();
      const wasAuthenticated = isAuthenticated;
      const isNowAuthenticated = !!user;
      
      setIsAuthenticated(isNowAuthenticated);
      
      // Clear navigation state when logging out
      if (wasAuthenticated && !isNowAuthenticated && typeof window !== 'undefined') {
        localStorage.removeItem('NAVIGATION_STATE');
        setNavigationState(undefined);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
      // Clear navigation state on auth error
      if (typeof window !== 'undefined') {
        localStorage.removeItem('NAVIGATION_STATE');
        setNavigationState(undefined);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !isNavigationReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer
        initialState={isAuthenticated ? navigationState : undefined}
        onStateChange={(state) => {
          // Only save navigation state when authenticated
          if (isAuthenticated && typeof window !== 'undefined') {
            localStorage.setItem('NAVIGATION_STATE', JSON.stringify(state));
          }
        }}
        onReady={() => setIsNavigationReady(true)}
      >
        {isAuthenticated ? (
          <MainStackNavigator />
        ) : (
          <AuthScreen onAuthSuccess={() => setIsAuthenticated(true)} />
        )}
        <StatusBar style="auto" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
