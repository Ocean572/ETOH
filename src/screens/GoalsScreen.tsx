import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Alert,
  Keyboard
} from 'react-native';
import { goalService } from '../services/goalService';
import { drinkService } from '../services/drinkService';
import { UserGoal, DrinkEntry } from '../types';

export default function GoalsScreen() {
  const [currentGoal, setCurrentGoal] = useState<UserGoal | null>(null);
  const [todaysDrinks, setTodaysDrinks] = useState<DrinkEntry[]>([]);
  const [averageDrinksPerDay, setAverageDrinksPerDay] = useState(0);
  const [daysSinceJoined, setDaysSinceJoined] = useState(0);
  const [goalInput, setGoalInput] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [goal, drinks, avgData] = await Promise.all([
        goalService.getCurrentGoal(),
        drinkService.getTodaysDrinks(),
        drinkService.getAverageDrinksPerDay(),
      ]);
      
      setCurrentGoal(goal);
      setTodaysDrinks(drinks);
      setAverageDrinksPerDay(avgData.average);
      setDaysSinceJoined(avgData.daysSinceJoined);
      setGoalInput(goal?.target_drinks?.toString() || '');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGoal = async () => {
    const target = parseInt(goalInput);
    
    if (isNaN(target) || target < 0) {
      Alert.alert('Invalid Goal', 'Please enter a valid number of drinks (0 or more)');
      return;
    }

    try {
      await goalService.updateDailyGoal(target);
      await loadData();
      setIsEditing(false);
      Keyboard.dismiss();
      Alert.alert('Success', 'Daily goal updated!');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleCancelEdit = () => {
    setGoalInput(currentGoal?.target_drinks?.toString() || '');
    setIsEditing(false);
    Keyboard.dismiss();
  };

  const todaysTotal = todaysDrinks.reduce((sum, entry) => sum + entry.drink_count, 0);
  const goalTarget = currentGoal?.target_drinks || 0;
  const isMeetingGoal = todaysTotal <= goalTarget;

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
        <Text style={styles.title}>Daily Goals</Text>
        <Text style={styles.subtitle}>Track your progress toward healthier habits</Text>
      </View>

      <View style={styles.goalsContainer}>
        {/* Today's Drinks Box */}
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{todaysTotal}</Text>
          <Text style={styles.statLabel}>Today's Drinks</Text>
        </View>

        {/* Goal Input Box */}
        <View style={styles.goalBox}>
          {isEditing ? (
            <View style={styles.editingContainer}>
              <TextInput
                style={styles.goalInput}
                value={goalInput}
                onChangeText={setGoalInput}
                placeholder="Enter goal"
                keyboardType="number-pad"
                autoFocus
              />
              <Text style={styles.goalInputLabel}>drinks/day goal</Text>
              
              <View style={styles.editButtons}>
                <TouchableOpacity 
                  style={[styles.editButton, styles.cancelButton]}
                  onPress={handleCancelEdit}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.editButton, styles.saveButton]}
                  onPress={handleSaveGoal}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.goalDisplayContainer}
              onPress={() => setIsEditing(true)}
            >
              {currentGoal ? (
                <>
                  <Text style={styles.goalNumber}>
                    {currentGoal.target_drinks}
                  </Text>
                  <Text style={styles.goalLabel}>
                    drinks/day goal
                  </Text>
                </>
              ) : (
                <Text style={styles.setGoalText}>
                  Set Goal
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Average Drinks Per Day */}
      <View style={styles.averageContainer}>
        <View style={styles.averageBox}>
          <Text style={styles.averageNumber}>{averageDrinksPerDay}</Text>
          <Text style={styles.averageLabel}>
            {daysSinceJoined === 1 ? 'Since Yesterday' : 
             daysSinceJoined <= 7 ? `${daysSinceJoined}-Day Average` :
             daysSinceJoined <= 30 ? `${daysSinceJoined}-Day Average` :
             'Overall Average'}
          </Text>
          <Text style={styles.averageSubtext}>
            drinks per day since joining
          </Text>
        </View>
      </View>

      {/* Goal Status */}
      <View style={styles.statusContainer}>
        {currentGoal ? (
          <View style={[
            styles.statusCard,
            isMeetingGoal ? styles.successCard : styles.warningCard
          ]}>
            <Text style={[
              styles.statusText,
              isMeetingGoal ? styles.successText : styles.warningText
            ]}>
              {isMeetingGoal 
                ? `✅ You are meeting your goal! (${todaysTotal}/${goalTarget})` 
                : `⚠️ You are not meeting your goal (${todaysTotal}/${goalTarget})`
              }
            </Text>
            
            {!isMeetingGoal && (
              <Text style={styles.statusSubtext}>
                You've exceeded your daily goal by {todaysTotal - goalTarget} drink(s)
              </Text>
            )}
            
            {isMeetingGoal && goalTarget > 0 && (
              <Text style={styles.statusSubtext}>
                You have {Math.max(0, goalTarget - todaysTotal)} drink(s) remaining for today
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.noGoalCard}>
            <Text style={styles.noGoalText}>
              Set a daily goal to start tracking your progress!
            </Text>
          </View>
        )}
      </View>

      {/* Goal Tips */}
      <View style={styles.tipsContainer}>
        <Text style={styles.tipsTitle}>Goal Setting Tips</Text>
        <View style={styles.tipItem}>
          <Text style={styles.tipText}>• Start with realistic, achievable goals</Text>
        </View>
        <View style={styles.tipItem}>
          <Text style={styles.tipText}>• Gradually reduce your target over time</Text>
        </View>
        <View style={styles.tipItem}>
          <Text style={styles.tipText}>• Celebrate when you meet your goals</Text>
        </View>
        <View style={styles.tipItem}>
          <Text style={styles.tipText}>• Consider alcohol-free days each week</Text>
        </View>
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
  goalsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
  },
  averageContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  averageBox: {
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
  averageNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#9b59b6',
  },
  averageLabel: {
    fontSize: 16,
    color: '#2c3e50',
    marginTop: 5,
    fontWeight: '600',
  },
  averageSubtext: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  statBox: {
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
  goalBox: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
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
    textAlign: 'center',
  },
  goalDisplayContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  goalNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  goalLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 5,
    textAlign: 'center',
  },
  setGoalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#27ae60',
    textAlign: 'center',
  },
  editingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  goalInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#27ae60',
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#27ae60',
    minWidth: 60,
    maxWidth: 80,
    paddingVertical: 5,
  },
  goalInputLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 5,
  },
  editButtons: {
    flexDirection: 'row',
    marginTop: 15,
    gap: 8,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 60,
  },
  cancelButton: {
    backgroundColor: '#95a5a6',
  },
  saveButton: {
    backgroundColor: '#27ae60',
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
  statusContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  statusCard: {
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  successCard: {
    backgroundColor: '#d5f4e6',
    borderLeftWidth: 4,
    borderLeftColor: '#27ae60',
  },
  warningCard: {
    backgroundColor: '#fdf2e9',
    borderLeftWidth: 4,
    borderLeftColor: '#e67e22',
  },
  noGoalCard: {
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
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  successText: {
    color: '#27ae60',
  },
  warningText: {
    color: '#e67e22',
  },
  statusSubtext: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 8,
  },
  noGoalText: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  tipsContainer: {
    margin: 20,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  tipItem: {
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#7f8c8d',
    lineHeight: 20,
  },
});