import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Friend, friendsService } from '../services/friendsService';
import { friendDataService, FriendProfile, FriendGoal } from '../services/friendDataService';
import { TimeRange, ChartData } from '../services/analyticsService';
import DrinkChart from './DrinkChart';

interface FriendDetailModalProps {
  visible: boolean;
  friend: Friend | null;
  onClose: () => void;
}

export default function FriendDetailModal({ visible, friend, onClose }: FriendDetailModalProps) {
  const [loading, setLoading] = useState(true);
  const [friendProfile, setFriendProfile] = useState<FriendProfile | null>(null);
  const [todaysDrinks, setTodaysDrinks] = useState<number>(0);
  const [currentGoal, setCurrentGoal] = useState<FriendGoal | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [friendProfilePictureUrl, setFriendProfilePictureUrl] = useState<string | null>(null);

  useEffect(() => {
    if (visible && friend) {
      loadFriendData();
      loadChartData();
    }
  }, [visible, friend]);

  useEffect(() => {
    if (visible && friend && timeRange) {
      loadChartData();
    }
  }, [timeRange]);

  const loadFriendData = async () => {
    if (!friend) return;

    try {
      setLoading(true);
      console.log('Loading friend data for:', friend.friend_id);
      
      // Use the profile data we already have from the friend object
      const profileFromFriend: FriendProfile = {
        id: friend.friend_id,
        full_name: friend.friend_profile.full_name,
        email: friend.friend_profile.email,
        profile_picture_url: friend.friend_profile.profile_picture_url,
        motivation_text: undefined, // We'll try to get this separately
        created_at: friend.created_at
      };

      // Try to get additional profile data, but don't fail if we can't
      let enhancedProfile = profileFromFriend;
      try {
        const additionalProfile = await friendDataService.getFriendProfile(friend.friend_id);
        if (additionalProfile) {
          enhancedProfile = additionalProfile;
        }
      } catch (profileError) {
        console.warn('Could not fetch additional profile data, using basic info:', profileError);
      }

      // Load drinks and goals
      const [drinks, goal] = await Promise.all([
        friendDataService.getFriendTodaysDrinks(friend.friend_id),
        friendDataService.getFriendCurrentGoal(friend.friend_id),
      ]);

      console.log('Friend data loaded:', { profile: enhancedProfile, drinks, goal });
      setFriendProfile(enhancedProfile);
      setTodaysDrinks(drinks);
      setCurrentGoal(goal);
      
      // Load friend's profile picture with signed URL
      try {
        const signedUrl = await friendsService.getFriendProfilePictureUrl(friend.friend_id);
        console.log(`Friend detail profile picture for ${friend.friend_id}:`, signedUrl);
        setFriendProfilePictureUrl(signedUrl);
      } catch (error) {
        console.log(`Error getting friend detail profile picture for ${friend.friend_id}:`, error);
        setFriendProfilePictureUrl(null);
      }
    } catch (error: any) {
      console.error('Failed to load friend data:', error);
      Alert.alert('Error', `Failed to load friend data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadChartData = async () => {
    if (!friend) return;

    try {
      setChartLoading(true);
      console.log('Loading chart data for:', friend.friend_id, 'timeRange:', timeRange);
      const data = await friendDataService.getFriendChartData(friend.friend_id, timeRange);
      console.log('Chart data loaded:', data);
      setChartData(data);
    } catch (error: any) {
      console.error('Failed to load chart data:', error);
      Alert.alert('Error', `Failed to load chart data: ${error.message}`);
    } finally {
      setChartLoading(false);
    }
  };

  const getTimeRangeTitle = (range: TimeRange): string => {
    switch (range) {
      case 'week':
        return 'Last 7 Days';
      case 'month':
        return 'Last 4 Weeks';
      case 'year':
        return 'Last 12 Months';
      default:
        return 'History';
    }
  };

  const renderGoalProgress = () => {
    if (!currentGoal) {
      return <Text style={styles.noGoalText}>No daily goal set</Text>;
    }

    const progress = Math.min((todaysDrinks / currentGoal.target_drinks) * 100, 100);
    const isOverGoal = todaysDrinks > currentGoal.target_drinks;

    return (
      <View style={styles.goalContainer}>
        <Text style={styles.goalText}>
          {todaysDrinks}/{currentGoal.target_drinks} drinks today
        </Text>
        <View style={styles.progressBarContainer}>
          <View 
            style={[
              styles.progressBar, 
              { 
                width: `${progress}%`,
                backgroundColor: isOverGoal ? '#e74c3c' : '#27ae60'
              }
            ]} 
          />
        </View>
        <Text style={[styles.goalStatus, { color: isOverGoal ? '#e74c3c' : '#27ae60' }]}>
          {isOverGoal 
            ? `${todaysDrinks - currentGoal.target_drinks} over goal`
            : `${currentGoal.target_drinks - todaysDrinks} remaining`
          }
        </Text>
      </View>
    );
  };

  if (!friend) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Friend Details</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <Text>Loading friend data...</Text>
              </View>
            ) : (
              <>
                {/* Profile Section */}
                <View style={styles.profileSection}>
                  {friendProfilePictureUrl ? (
                    <Image
                      source={{ uri: friendProfilePictureUrl }}
                      style={styles.profileImage}
                      onError={() => {
                        console.log('Failed to load profile image, falling back to placeholder');
                        setFriendProfilePictureUrl(null);
                      }}
                    />
                  ) : (
                    <View style={styles.profilePlaceholder}>
                      <Text style={styles.profileInitial}>
                        {friendProfile?.full_name?.charAt(0) || friendProfile?.email.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  
                  <View style={styles.profileInfo}>
                    <Text style={styles.profileName}>
                      {friendProfile?.full_name || friendProfile?.email}
                    </Text>
                    <Text style={styles.profileEmail}>{friendProfile?.email}</Text>
                    <Text style={styles.friendSince}>
                      Friends since {new Date(friend.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                {/* Motivation Section */}
                {friendProfile?.motivation_text && (
                  <View style={styles.motivationSection}>
                    <Text style={styles.sectionTitle}>Why they're reducing intake</Text>
                    <Text style={styles.motivationText}>{friendProfile.motivation_text}</Text>
                  </View>
                )}

                {/* Today's Status */}
                <View style={styles.statusSection}>
                  <Text style={styles.sectionTitle}>Today's Progress</Text>
                  <View style={styles.todaysStats}>
                    <View style={styles.statCard}>
                      <Text style={styles.statNumber}>{todaysDrinks}</Text>
                      <Text style={styles.statLabel}>Drinks Today</Text>
                    </View>
                    {currentGoal && (
                      <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{currentGoal.target_drinks}</Text>
                        <Text style={styles.statLabel}>Daily Goal</Text>
                      </View>
                    )}
                  </View>
                  {renderGoalProgress()}
                </View>

                {/* History Section */}
                <View style={styles.historySection}>
                  <Text style={styles.sectionTitle}>Drinking History</Text>
                  <Text style={styles.historySubtitle}>{getTimeRangeTitle(timeRange)}</Text>
                  
                  {/* Time Range Selector */}
                  <View style={styles.timeRangeSelector}>
                    <TouchableOpacity
                      style={[
                        styles.timeRangeButton,
                        timeRange === 'week' && styles.activeTimeRangeButton,
                      ]}
                      onPress={() => setTimeRange('week')}
                    >
                      <Text
                        style={[
                          styles.timeRangeButtonText,
                          timeRange === 'week' && styles.activeTimeRangeButtonText,
                        ]}
                      >
                        Week
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.timeRangeButton,
                        timeRange === 'month' && styles.activeTimeRangeButton,
                      ]}
                      onPress={() => setTimeRange('month')}
                    >
                      <Text
                        style={[
                          styles.timeRangeButtonText,
                          timeRange === 'month' && styles.activeTimeRangeButtonText,
                        ]}
                      >
                        Month
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.timeRangeButton,
                        timeRange === 'year' && styles.activeTimeRangeButton,
                      ]}
                      onPress={() => setTimeRange('year')}
                    >
                      <Text
                        style={[
                          styles.timeRangeButtonText,
                          timeRange === 'year' && styles.activeTimeRangeButtonText,
                        ]}
                      >
                        Year
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Chart */}
                  <DrinkChart
                    data={chartData || { labels: [], data: [] }}
                    timeRange={timeRange}
                    loading={chartLoading}
                  />

                  {/* Chart Stats */}
                  {chartData && !chartLoading && (
                    <View style={styles.chartStats}>
                      <View style={styles.chartStatCard}>
                        <Text style={styles.chartStatNumber}>
                          {chartData.data.reduce((sum, val) => sum + val, 0)}
                        </Text>
                        <Text style={styles.chartStatLabel}>Total Drinks</Text>
                      </View>

                      <View style={styles.chartStatCard}>
                        <Text style={styles.chartStatNumber}>
                          {chartData.data.length > 0
                            ? Math.round((chartData.data.reduce((sum, val) => sum + val, 0) / chartData.data.length) * 10) / 10
                            : 0
                          }
                        </Text>
                        <Text style={styles.chartStatLabel}>
                          Avg per {timeRange === 'week' ? 'Day' : timeRange === 'month' ? 'Week' : 'Month'}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#7f8c8d',
    fontWeight: 'bold',
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileSection: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    marginBottom: 10,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  profilePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  profileInitial: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  profileEmail: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  friendSince: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 4,
  },
  motivationSection: {
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  motivationText: {
    fontSize: 14,
    color: '#34495e',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  statusSection: {
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 10,
  },
  todaysStats: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3498db',
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 5,
  },
  goalContainer: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
  },
  goalText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 10,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    marginBottom: 5,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  goalStatus: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  noGoalText: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 15,
  },
  historySection: {
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 20,
  },
  historySubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 15,
  },
  timeRangeSelector: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3498db',
    backgroundColor: 'white',
    alignItems: 'center',
  },
  activeTimeRangeButton: {
    backgroundColor: '#3498db',
  },
  timeRangeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3498db',
  },
  activeTimeRangeButtonText: {
    color: 'white',
  },
  chartStats: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 15,
  },
  chartStatCard: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  chartStatNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3498db',
  },
  chartStatLabel: {
    fontSize: 10,
    color: '#7f8c8d',
    marginTop: 5,
    textAlign: 'center',
  },
});