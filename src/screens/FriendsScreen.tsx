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
  RefreshControl,
} from 'react-native';
import { friendsService, FriendRequest, Friend } from '../services/friendsService';
import { supabase } from '../services/supabase';
import ConfirmationPopup from '../components/ConfirmationPopup';
import FriendDetailModal from '../components/FriendDetailModal';

export default function FriendsScreen() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newFriendEmail, setNewFriendEmail] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isPopupVisible, setPopupVisible] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [showFriendDetail, setShowFriendDetail] = useState(false);
  const [selectedFriendForDetail, setSelectedFriendForDetail] = useState<Friend | null>(null);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getCurrentUser();
    loadData();
    setupRealTimeSubscriptions();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [friendsData, requestsData] = await Promise.all([
        friendsService.getFriends(),
        friendsService.getFriendRequests(),
      ]);
      setFriends(friendsData);
      setFriendRequests(requestsData);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const setupRealTimeSubscriptions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Subscribe to friend requests
    const requestsSubscription = friendsService.subscribeFriendRequests(
      user.id,
      (payload) => {
        console.log('Friend request update:', payload);
        loadData(); // Reload data when changes occur
      }
    );

    // Subscribe to friendships
    const friendsSubscription = friendsService.subscribeFriendships(
      user.id,
      (payload) => {
        console.log('Friendship update:', payload);
        loadData(); // Reload data when changes occur
      }
    );

    // Cleanup subscriptions on unmount
    return () => {
      requestsSubscription.unsubscribe();
      friendsSubscription.unsubscribe();
    };
  };

  const sendFriendRequest = async () => {
    if (!newFriendEmail.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    try {
      setSendingRequest(true);
      const result = await friendsService.sendFriendRequest(newFriendEmail.trim());
      
      if (result.success) {
        Alert.alert('Success', result.message);
        setNewFriendEmail('');
        await loadData();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSendingRequest(false);
    }
  };

  const handleFriendRequest = async (requestId: string, accept: boolean) => {
    try {
      await friendsService.respondToFriendRequest(requestId, accept);
      Alert.alert('Success', accept ? 'Friend request accepted!' : 'Friend request rejected');
      await loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const removeFriend = (friend: Friend) => {
    setSelectedFriend(friend);
    setPopupVisible(true);
  };

  const handleConfirmRemove = async () => {
    if (!selectedFriend) return;

    try {
      await friendsService.removeFriend(selectedFriend.id);
      Alert.alert('Success', 'Friend removed');
      await loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setPopupVisible(false);
      setSelectedFriend(null);
    }
  };

  const renderFriendRequest = (request: FriendRequest) => {
    if (!currentUser) return null;
    
    const isReceived = request.receiver_id === currentUser.id;
    const profile = isReceived ? request.sender_profile : request.receiver_profile;
    
    return (
      <View key={request.id} style={styles.requestCard}>
        <View style={styles.profileSection}>
          {/* For sent requests (pending), only show email with placeholder avatar */}
          {!isReceived ? (
            <>
              <View style={styles.profilePlaceholder}>
                <Text style={styles.profileInitial}>
                  {profile?.email.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={[styles.profileEmail, styles.pendingText]}>
                  {profile?.email}
                </Text>
                <Text style={[styles.requestStatus, styles.pendingText]}>
                  Pending
                </Text>
              </View>
            </>
          ) : (
            /* For received requests, show full profile info */
            <>
              {profile?.profile_picture_url ? (
                <Image source={{ uri: profile.profile_picture_url }} style={styles.profileImage} />
              ) : (
                <View style={styles.profilePlaceholder}>
                  <Text style={styles.profileInitial}>
                    {profile?.full_name?.charAt(0) || profile?.email.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {profile?.full_name || profile?.email}
                </Text>
                <Text style={styles.profileEmail}>{profile?.email}</Text>
                <Text style={styles.requestStatus}>
                  Sent you a friend request
                </Text>
              </View>
            </>
          )}
        </View>
        
        {isReceived && (
          <View style={styles.requestActions}>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => handleFriendRequest(request.id, true)}
            >
              <Text style={styles.acceptButtonText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={() => handleFriendRequest(request.id, false)}
            >
              <Text style={styles.rejectButtonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const openFriendDetail = (friend: Friend) => {
    setSelectedFriendForDetail(friend);
    setShowFriendDetail(true);
  };

  const closeFriendDetail = () => {
    setShowFriendDetail(false);
    setSelectedFriendForDetail(null);
  };

  const renderFriend = (friend: Friend) => {
    return (
      <TouchableOpacity
        key={friend.id} 
        style={styles.friendCard}
        onPress={() => openFriendDetail(friend)}
      >
        <View style={styles.profileSection}>
          {friend.friend_profile.profile_picture_url ? (
            <Image
              source={{ uri: friend.friend_profile.profile_picture_url }}
              style={styles.profileImage}
            />
          ) : (
            <View style={styles.profilePlaceholder}>
              <Text style={styles.profileInitial}>
                {friend.friend_profile.full_name?.charAt(0) || friend.friend_profile.email.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {friend.friend_profile.full_name || friend.friend_profile.email}
            </Text>
            <Text style={styles.profileEmail}>{friend.friend_profile.email}</Text>
            <Text style={styles.friendSince}>
              Friends since {new Date(friend.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={styles.removeButton}
          onPress={(e) => {
            e.stopPropagation();
            removeFriend(friend);
          }}
        >
          <Text style={styles.removeButtonText}>Remove</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>Loading friends...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Friends</Text>
        <Text style={styles.subtitle}>Connect with others on your journey</Text>
      </View>

      {/* Add Friend Section */}
      <View style={styles.addFriendSection}>
        <Text style={styles.sectionTitle}>Add Friend</Text>
        <View style={styles.addFriendForm}>
          <TextInput
            style={styles.emailInput}
            value={newFriendEmail}
            onChangeText={setNewFriendEmail}
            placeholder="Enter friend's email address"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.sendButton, sendingRequest && styles.sendButtonDisabled]}
            onPress={sendFriendRequest}
            disabled={sendingRequest}
          >
            <Text style={styles.sendButtonText}>
              {sendingRequest ? 'Sending...' : 'Send Request'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Friend Requests Section */}
      {friendRequests.length > 0 && (
        <View style={styles.requestsSection}>
          <Text style={styles.sectionTitle}>Friend Requests</Text>
          {friendRequests.map(renderFriendRequest)}
        </View>
      )}

      {/* Friends List Section */}
      <View style={styles.friendsSection}>
        <Text style={styles.sectionTitle}>
          Your Friends ({friends.length})
        </Text>
        {friends.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No friends yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Add friends by email to share your journey together
            </Text>
          </View>
        ) : (
          friends.map(renderFriend)
        )}
      </View>

      <ConfirmationPopup
        visible={isPopupVisible}
        onConfirm={handleConfirmRemove}
        onCancel={() => setPopupVisible(false)}
        title="Remove Friend"
        message={`Are you sure you want to remove ${selectedFriend?.friend_profile.full_name || selectedFriend?.friend_profile.email}?`}
      />

      <FriendDetailModal
        visible={showFriendDetail}
        friend={selectedFriendForDetail}
        onClose={closeFriendDetail}
      />
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
  addFriendSection: {
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
  addFriendForm: {
    gap: 12,
  },
  emailInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  sendButton: {
    backgroundColor: '#3498db',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#95a5a6',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  requestsSection: {
    backgroundColor: 'white',
    padding: 20,
    marginTop: 10,
  },
  friendsSection: {
    backgroundColor: 'white',
    padding: 20,
    marginTop: 10,
    marginBottom: 20,
  },
  requestCard: {
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  friendCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  profilePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileInitial: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  profileEmail: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  requestStatus: {
    fontSize: 14,
    color: '#856404',
    marginTop: 4,
    fontStyle: 'italic',
  },
  pendingText: {
    fontStyle: 'italic',
    color: '#999',
  },
  friendSince: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  acceptButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  acceptButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  rejectButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  rejectButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  removeButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  removeButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
    lineHeight: 20,
  },
});