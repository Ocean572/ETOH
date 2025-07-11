import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { drinkService } from '../services/drinkService';
import { DrinkEntry } from '../types';

export default function HomeScreen() {
  const [todaysDrinks, setTodaysDrinks] = useState<DrinkEntry[]>([]);
  const [weeklyTotal, setWeeklyTotal] = useState(0);
  const [loading, setLoading] = useState(true);

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
              <Text style={styles.entryCount}>{entry.drink_count} drink(s)</Text>
              <Text style={styles.entryTime}>
                {new Date(entry.logged_at).toLocaleTimeString()}
              </Text>
              {entry.drink_type && (
                <Text style={styles.entryType}>{entry.drink_type}</Text>
              )}
            </View>
          ))}
        </View>
      )}
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
});