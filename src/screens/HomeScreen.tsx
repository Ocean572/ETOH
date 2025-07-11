import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { drinkService } from '../services/drinkService';
import { DrinkEntry } from '../types';

export default function HomeScreen() {
  const [todaysDrinks, setTodaysDrinks] = useState<DrinkEntry[]>([]);
  const [weeklyTotal, setWeeklyTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editingEntry, setEditingEntry] = useState<DrinkEntry | null>(null);
  const [editTime, setEditTime] = useState(new Date());
  const [editCount, setEditCount] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [drinks, weekly] = await Promise.all([
        drinkService.getTodaysDrinks(),
        drinkService.getWeeklyTotal(),
      ]);
      setTodaysDrinks(drinks);
      setWeeklyTotal(weekly);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const addDrink = async (count: number = 1) => {
    try {
      await drinkService.addDrinkEntry(count);
      loadData(); // Refresh data
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const deleteEntry = (entry: DrinkEntry) => {
    Alert.alert(
      'Delete Entry',
      `Delete ${entry.drink_count} drink(s) logged at ${new Date(entry.logged_at).toLocaleTimeString()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await drinkService.deleteDrinkEntry(entry.id);
              loadData();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  const startEdit = (entry: DrinkEntry) => {
    setEditingEntry(entry);
    setEditTime(new Date(entry.logged_at));
    setEditCount(entry.drink_count.toString());
  };

  const saveEdit = async () => {
    if (!editingEntry) return;
    
    const count = parseInt(editCount);
    if (isNaN(count) || count < 1) {
      Alert.alert('Error', 'Please enter a valid number of drinks (1 or more)');
      return;
    }

    try {
      await drinkService.updateDrinkEntry(editingEntry.id, {
        drink_count: count,
        logged_at: editTime.toISOString(),
      });
      setEditingEntry(null);
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const cancelEdit = () => {
    setEditingEntry(null);
    setEditTime(new Date());
    setEditCount('');
  };

  const todaysTotal = todaysDrinks.reduce((sum, entry) => sum + entry.drink_count, 0);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Today's Summary</Text>
        <Text style={styles.date}>{new Date().toLocaleDateString()}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{todaysTotal}</Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{weeklyTotal}</Text>
          <Text style={styles.statLabel}>This Week</Text>
        </View>
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Add</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={styles.quickButton}
            onPress={() => addDrink(1)}
          >
            <Text style={styles.quickButtonText}>+1 Drink</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickButton}
            onPress={() => addDrink(2)}
          >
            <Text style={styles.quickButtonText}>+2 Drinks</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickButton}
            onPress={() => addDrink(3)}
          >
            <Text style={styles.quickButtonText}>+3 Drinks</Text>
          </TouchableOpacity>
        </View>
      </View>

      {todaysDrinks.length > 0 && (
        <View style={styles.recentEntries}>
          <Text style={styles.sectionTitle}>Today's Entries</Text>
          {todaysDrinks.map((entry) => (
            <View key={entry.id} style={styles.entryCard}>
              <View style={styles.entryInfo}>
                <Text style={styles.entryCount}>{entry.drink_count} drink(s)</Text>
                <Text style={styles.entryTime}>
                  {new Date(entry.logged_at).toLocaleTimeString()}
                </Text>
                {entry.drink_type && (
                  <Text style={styles.entryType}>{entry.drink_type}</Text>
                )}
              </View>
              <View style={styles.entryActions}>
                <TouchableOpacity 
                  style={styles.editButton}
                  onPress={() => startEdit(entry)}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.deleteButton}
                  onPress={() => deleteEntry(entry)}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Edit Modal */}
      <Modal
        visible={editingEntry !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={cancelEdit}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Entry</Text>
            
            <View style={styles.editField}>
              <Text style={styles.fieldLabel}>Number of Drinks</Text>
              <TextInput
                style={styles.editInput}
                value={editCount}
                onChangeText={setEditCount}
                keyboardType="number-pad"
                placeholder="Enter number of drinks"
              />
            </View>

            <View style={styles.editField}>
              <Text style={styles.fieldLabel}>Time</Text>
              <TouchableOpacity 
                style={styles.timeButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={styles.timeButtonText}>
                  {editTime.toLocaleTimeString()}
                </Text>
              </TouchableOpacity>
            </View>

            {showTimePicker && (
              <DateTimePicker
                value={editTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedTime) => {
                  setShowTimePicker(Platform.OS === 'ios');
                  if (selectedTime) {
                    setEditTime(selectedTime);
                  }
                }}
              />
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={cancelEdit}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={saveEdit}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  date: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3498db',
  },
  statLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 5,
  },
  quickActions: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickButton: {
    flex: 1,
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  recentEntries: {
    padding: 20,
  },
  entryCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryInfo: {
    flex: 1,
  },
  entryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  entryCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  entryTime: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 5,
  },
  entryType: {
    fontSize: 14,
    color: '#27ae60',
    marginTop: 5,
  },
  editButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  editButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
  },
  editField: {
    marginBottom: 15,
  },
  fieldLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 5,
    fontWeight: '600',
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  timeButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    backgroundColor: '#f9f9f9',
  },
  timeButtonText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
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
});