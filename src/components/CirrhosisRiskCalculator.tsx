import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { calculateCirrhosisRisk } from '../utils/healthCalculations';
import { UserProfile } from '../types';

interface CirrhosisRiskCalculatorProps {
  profile: UserProfile | null;
}

export default function CirrhosisRiskCalculator({ profile }: CirrhosisRiskCalculatorProps) {
  const [weeklyDrinks, setWeeklyDrinks] = useState('');
  const [yearsOfDrinking, setYearsOfDrinking] = useState('');
  const [riskResult, setRiskResult] = useState<number | null>(null);

  const calculateRisk = () => {
    const drinks = parseFloat(weeklyDrinks);
    const years = parseFloat(yearsOfDrinking);

    if (isNaN(drinks) || isNaN(years) || drinks < 0 || years < 0) {
      return;
    }

    const gender = profile?.gender || 'male';
    const risk = calculateCirrhosisRisk(drinks, years, gender);
    setRiskResult(risk);
  };

  const getRiskColor = (risk: number): string => {
    if (risk < 0.05) return '#27ae60'; // Green - Low risk
    if (risk < 0.15) return '#f39c12'; // Orange - Moderate risk
    if (risk < 0.3) return '#e67e22'; // Red-orange - High risk
    return '#e74c3c'; // Red - Severe risk
  };

  const getRiskLevel = (risk: number): string => {
    if (risk < 0.05) return 'Low';
    if (risk < 0.15) return 'Moderate';
    if (risk < 0.3) return 'High';
    return 'Severe';
  };

  const getRiskDescription = (risk: number): string => {
    if (risk < 0.05) return 'Your risk is within normal range.';
    if (risk < 0.15) return 'Moderate risk - consider reducing consumption.';
    if (risk < 0.3) return 'High risk - strongly recommend consulting a doctor.';
    return 'Severe risk - seek immediate medical consultation.';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🫀 Cirrhosis Risk Calculator</Text>
      <Text style={styles.description}>
        Calculate your personal cirrhosis risk based on consumption patterns and gender.
      </Text>

      {profile?.gender && (
        <View style={styles.genderInfo}>
          <Text style={styles.genderText}>
            Gender: {profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1).replace('_', ' ')}
          </Text>
        </View>
      )}

      <View style={styles.inputSection}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Weekly Drinks</Text>
          <TextInput
            style={styles.input}
            value={weeklyDrinks}
            onChangeText={setWeeklyDrinks}
            placeholder="e.g., 14"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Years of Regular Drinking</Text>
          <TextInput
            style={styles.input}
            value={yearsOfDrinking}
            onChangeText={setYearsOfDrinking}
            placeholder="e.g., 10"
            keyboardType="numeric"
          />
        </View>

        <TouchableOpacity style={styles.calculateButton} onPress={calculateRisk}>
          <Text style={styles.calculateButtonText}>Calculate Risk</Text>
        </TouchableOpacity>
      </View>

      {riskResult !== null && (
        <View style={[styles.resultContainer, { borderLeftColor: getRiskColor(riskResult) }]}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultTitle}>Your Cirrhosis Risk</Text>
            <Text style={[styles.riskPercentage, { color: getRiskColor(riskResult) }]}>
              {(riskResult * 100).toFixed(1)}%
            </Text>
          </View>
          <Text style={[styles.riskLevel, { color: getRiskColor(riskResult) }]}>
            {getRiskLevel(riskResult)} Risk
          </Text>
          <Text style={styles.riskDescription}>
            {getRiskDescription(riskResult)}
          </Text>
          
          <View style={styles.disclaimerContainer}>
            <Text style={styles.disclaimer}>
              ⚠️ This is a simplified calculation for educational purposes only. 
              Individual risk varies based on genetics, overall health, and other factors. 
              Consult your doctor for personalized medical advice.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 20,
    lineHeight: 20,
  },
  genderInfo: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 6,
    marginBottom: 20,
  },
  genderText: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
  },
  inputSection: {
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  calculateButton: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
  },
  calculateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultContainer: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  riskPercentage: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  riskLevel: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  riskDescription: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 15,
    lineHeight: 20,
  },
  disclaimerContainer: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#ffc107',
  },
  disclaimer: {
    fontSize: 12,
    color: '#856404',
    lineHeight: 18,
  },
});