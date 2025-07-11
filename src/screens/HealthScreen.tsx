import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  Dimensions
} from 'react-native';
import { healthService, HealthAssessmentData } from '../services/healthService';
import { calculateRiskLevel } from '../utils/healthCalculations';

const { width } = Dimensions.get('window');

export default function HealthScreen() {
  const [healthData, setHealthData] = useState<HealthAssessmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  useEffect(() => {
    loadHealthData();
  }, []);

  const loadHealthData = async () => {
    try {
      setLoading(true);
      const data = await healthService.getPersonalizedHealthAssessment();
      setHealthData(data);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return '#27ae60';
      case 'moderate': return '#f39c12';
      case 'high': return '#e67e22';
      case 'severe': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'low': return '✅';
      case 'moderate': return '⚠️';
      case 'high': return '🚨';
      case 'severe': return '🆘';
      default: return '❓';
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>Loading health assessment...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Your Health Assessment</Text>
        <Text style={styles.subtitle}>Understanding alcohol's impact on your body</Text>
      </View>

      {/* Personal Risk Level */}
      {healthData && (
        <View style={styles.riskCard}>
          <View style={styles.riskHeader}>
            <Text style={styles.riskIcon}>{getRiskIcon(healthData.riskLevel)}</Text>
            <View style={styles.riskInfo}>
              <Text style={styles.riskTitle}>Your Current Risk Level</Text>
              <Text style={[styles.riskLevel, { color: getRiskColor(healthData.riskLevel) }]}>
                {healthData.riskLevel.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.riskDescription}>
            Based on your weekly average of {healthData.weeklyAverage.toFixed(1)} drinks
          </Text>
          
          {healthData.personalizedWarnings.length > 0 && (
            <View style={styles.warningsContainer}>
              <Text style={styles.warningsTitle}>⚠️ Personal Health Alerts</Text>
              {healthData.personalizedWarnings.map((warning, index) => (
                <Text key={index} style={styles.warningText}>• {warning}</Text>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Health Education Sections */}
      <View style={styles.educationContainer}>
        {/* Short-Term Effects */}
        <TouchableOpacity 
          style={styles.educationCard}
          onPress={() => toggleSection('shortTerm')}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>⚡ Short-Term Effects</Text>
            <Text style={styles.expandIcon}>
              {expandedSection === 'shortTerm' ? '▼' : '▶'}
            </Text>
          </View>
          {expandedSection === 'shortTerm' && (
            <View style={styles.cardContent}>
              <Text style={styles.contentDescription}>
                Even a single episode of drinking too much can lead to:
              </Text>
              <View style={styles.bulletPoints}>
                <Text style={styles.bulletPoint}>• Impaired judgment, coordination, and reflexes</Text>
                <Text style={styles.bulletPoint}>• Accidents and injuries from falls, car crashes, or drowning</Text>
                <Text style={styles.bulletPoint}>• Alcohol poisoning, which can cause confusion, vomiting, seizures, slow breathing, and can even be fatal</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* Liver Health */}
        <TouchableOpacity 
          style={styles.educationCard}
          onPress={() => toggleSection('liver')}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>🫀 Liver Health</Text>
            <Text style={styles.expandIcon}>
              {expandedSection === 'liver' ? '▼' : '▶'}
            </Text>
          </View>
          {expandedSection === 'liver' && (
            <View style={styles.cardContent}>
              <Text style={styles.contentDescription}>
                Your liver takes the biggest hit from alcohol. Heavy drinking can lead to:
              </Text>
              <View style={styles.stageContainer}>
                <View style={styles.stageItem}>
                  <Text style={styles.stageTitle}>1. Fatty Liver</Text>
                  <Text style={styles.stageDescription}>
                    Fat builds up in the liver. Good news: it's reversible if you stop drinking.
                  </Text>
                </View>
                <View style={styles.stageItem}>
                  <Text style={styles.stageTitle}>2. Alcoholic Hepatitis</Text>
                  <Text style={styles.stageDescription}>
                    Liver becomes inflamed - a more serious condition.
                  </Text>
                </View>
                <View style={styles.stageItem}>
                  <Text style={styles.stageTitle}>3. Cirrhosis</Text>
                  <Text style={styles.stageDescription}>
                    Severe scarring that can lead to liver failure.
                  </Text>
                </View>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* Cancer Risk */}
        <TouchableOpacity 
          style={styles.educationCard}
          onPress={() => toggleSection('cancer')}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>🎗️ Cancer Risk</Text>
            <Text style={styles.expandIcon}>
              {expandedSection === 'cancer' ? '▼' : '▶'}
            </Text>
          </View>
          {expandedSection === 'cancer' && (
            <View style={styles.cardContent}>
              <Text style={styles.contentDescription}>
                Alcohol is linked to higher risk of several cancers:
              </Text>
              <View style={styles.bulletPoints}>
                <Text style={styles.bulletPoint}>• Mouth, throat, and esophagus cancer</Text>
                <Text style={styles.bulletPoint}>• Breast cancer (even with light to moderate drinking)</Text>
                <Text style={styles.bulletPoint}>• Liver cancer</Text>
                <Text style={styles.bulletPoint}>• Colon and rectal cancer</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* Other Health Issues */}
        <TouchableOpacity 
          style={styles.educationCard}
          onPress={() => toggleSection('other')}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>💔 Other Health Issues</Text>
            <Text style={styles.expandIcon}>
              {expandedSection === 'other' ? '▼' : '▶'}
            </Text>
          </View>
          {expandedSection === 'other' && (
            <View style={styles.cardContent}>
              <View style={styles.bulletPoints}>
                <Text style={styles.bulletPoint}>• <Text style={styles.boldText}>Heart Problems:</Text> Heavy use linked to cardiovascular issues</Text>
                <Text style={styles.bulletPoint}>• <Text style={styles.boldText}>Pancreatitis:</Text> Painful inflammation that can become chronic</Text>
                <Text style={styles.bulletPoint}>• <Text style={styles.boldText}>Weakened Immune System:</Text> Harder to fight off illnesses</Text>
                <Text style={styles.bulletPoint}>• <Text style={styles.boldText}>Brain Damage:</Text> Memory problems, coordination issues, dementia risk</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* Risk Factors */}
        <TouchableOpacity 
          style={styles.educationCard}
          onPress={() => toggleSection('risk')}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>⚠️ Who Is Most at Risk?</Text>
            <Text style={styles.expandIcon}>
              {expandedSection === 'risk' ? '▼' : '▶'}
            </Text>
          </View>
          {expandedSection === 'risk' && (
            <View style={styles.cardContent}>
              <Text style={styles.contentDescription}>
                Several factors can make you more vulnerable:
              </Text>
              <View style={styles.bulletPoints}>
                <Text style={styles.bulletPoint}>• <Text style={styles.boldText}>Genetics:</Text> Family history of alcohol problems</Text>
                <Text style={styles.bulletPoint}>• <Text style={styles.boldText}>Gender:</Text> Women process alcohol differently, higher risk</Text>
                <Text style={styles.bulletPoint}>• <Text style={styles.boldText}>Body Weight:</Text> Smaller body size means higher concentration</Text>
                <Text style={styles.bulletPoint}>• <Text style={styles.boldText}>Overall Health:</Text> Existing conditions can be worsened</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* When to See a Doctor */}
        <TouchableOpacity 
          style={styles.educationCard}
          onPress={() => toggleSection('doctor')}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>🩺 When to Talk to a Doctor</Text>
            <Text style={styles.expandIcon}>
              {expandedSection === 'doctor' ? '▼' : '▶'}
            </Text>
          </View>
          {expandedSection === 'doctor' && (
            <View style={styles.cardContent}>
              <Text style={styles.contentDescription}>
                Seek medical advice if you:
              </Text>
              <View style={styles.bulletPoints}>
                <Text style={styles.bulletPoint}>• Worry about your drinking or feel you can't control it</Text>
                <Text style={styles.bulletPoint}>• Have tried to cut back but couldn't</Text>
                <Text style={styles.bulletPoint}>• Find drinking is causing problems in your life</Text>
                <Text style={styles.bulletPoint}>• Need to drink more to get the same effect</Text>
                <Text style={styles.bulletPoint}>• Experience withdrawal symptoms</Text>
              </View>
              
              <Text style={styles.physicalSymptomsTitle}>Physical symptoms to watch for:</Text>
              <View style={styles.bulletPoints}>
                <Text style={styles.bulletPoint}>• Stomach pain</Text>
                <Text style={styles.bulletPoint}>• Yellowing of skin or eyes (jaundice)</Text>
                <Text style={styles.bulletPoint}>• Constant fatigue</Text>
                <Text style={styles.bulletPoint}>• Numbness or tingling in hands or feet</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Personal Recommendations */}
      {healthData && healthData.recommendations.length > 0 && (
        <View style={styles.recommendationsCard}>
          <Text style={styles.recommendationsTitle}>💡 Your Personalized Recommendations</Text>
          {healthData.recommendations.map((rec, index) => (
            <Text key={index} style={styles.recommendationItem}>• {rec}</Text>
          ))}
        </View>
      )}

      {/* Emergency Info */}
      <View style={styles.emergencyCard}>
        <Text style={styles.emergencyTitle}>🚨 Emergency Resources</Text>
        <Text style={styles.emergencyText}>
          If you're experiencing severe withdrawal symptoms or alcohol poisoning, call 911 immediately.
        </Text>
        <Text style={styles.emergencyText}>
          National Suicide Prevention Lifeline: 988
        </Text>
        <Text style={styles.emergencyText}>
          SAMHSA National Helpline: 1-800-662-4357
        </Text>
      </View>

      {/* References */}
      <View style={styles.referencesCard}>
        <Text style={styles.referencesTitle}>📚 References</Text>
        <Text style={styles.referenceText}>
          • Friedman, S. L. (2025). Pathogenesis of alcohol-associated liver disease. UpToDate.
        </Text>
        <Text style={styles.referenceText}>
          • Mukamal, K. J. (2025). Overview of the risks and benefits of alcohol consumption. UpToDate.
        </Text>
        <Text style={styles.referenceText}>
          • Osna, N. A., et al. Alcoholic Liver Disease: Pathogenesis and Current Management. Alcohol Research: Current Reviews.
        </Text>
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
  riskCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  riskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  riskIcon: {
    fontSize: 32,
    marginRight: 15,
  },
  riskInfo: {
    flex: 1,
  },
  riskTitle: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '600',
  },
  riskLevel: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 2,
  },
  riskDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 15,
  },
  warningsContainer: {
    backgroundColor: '#fdf2e9',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#e67e22',
  },
  warningsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e67e22',
    marginBottom: 10,
  },
  warningText: {
    fontSize: 14,
    color: '#d35400',
    marginBottom: 5,
    lineHeight: 20,
  },
  educationContainer: {
    paddingHorizontal: 20,
  },
  educationCard: {
    backgroundColor: 'white',
    marginBottom: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  expandIcon: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  cardContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  contentDescription: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 15,
    lineHeight: 20,
  },
  bulletPoints: {
    marginLeft: 10,
  },
  bulletPoint: {
    fontSize: 14,
    color: '#34495e',
    marginBottom: 8,
    lineHeight: 20,
  },
  boldText: {
    fontWeight: 'bold',
  },
  stageContainer: {
    marginLeft: 10,
  },
  stageItem: {
    marginBottom: 15,
  },
  stageTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 5,
  },
  stageDescription: {
    fontSize: 14,
    color: '#34495e',
    lineHeight: 20,
  },
  physicalSymptomsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 15,
    marginBottom: 10,
  },
  recommendationsCard: {
    backgroundColor: '#e8f5e8',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#27ae60',
  },
  recommendationsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#27ae60',
    marginBottom: 15,
  },
  recommendationItem: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 8,
    lineHeight: 20,
  },
  emergencyCard: {
    backgroundColor: '#fadbd8',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
  },
  emergencyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 15,
  },
  emergencyText: {
    fontSize: 14,
    color: '#922b21',
    marginBottom: 8,
    lineHeight: 20,
  },
  referencesCard: {
    backgroundColor: '#f8f9fa',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#6c757d',
  },
  referencesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  referenceText: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 8,
    lineHeight: 18,
  },
});