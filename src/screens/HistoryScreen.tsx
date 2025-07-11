import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import DrinkChart from '../components/DrinkChart';
import { analyticsService, ChartData, TimeRange } from '../services/analyticsService';

export default function HistoryScreen() {
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [timeRange]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await analyticsService.getDataForRange(timeRange);
      setChartData(data);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load chart data: ' + error.message);
    } finally {
      setLoading(false);
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

  const getTimeRangeDescription = (range: TimeRange): string => {
    switch (range) {
      case 'week':
        return 'Daily consumption over the past week';
      case 'month':
        return 'Weekly totals over the past month';
      case 'year':
        return 'Monthly totals over the past year';
      default:
        return '';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{getTimeRangeTitle(timeRange)}</Text>
        <Text style={styles.subtitle}>{getTimeRangeDescription(timeRange)}</Text>
      </View>

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

      <DrinkChart
        data={chartData || { labels: [], data: [] }}
        timeRange={timeRange}
        loading={loading}
      />

      {chartData && !loading && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {chartData.data.reduce((sum, val) => sum + val, 0)}
            </Text>
            <Text style={styles.statLabel}>
              Total {timeRange === 'week' ? 'Drinks' : timeRange === 'month' ? 'Drinks' : 'Drinks'}
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {chartData.data.length > 0 
                ? Math.round((chartData.data.reduce((sum, val) => sum + val, 0) / chartData.data.length) * 10) / 10
                : 0
              }
            </Text>
            <Text style={styles.statLabel}>
              Average per {timeRange === 'week' ? 'Day' : timeRange === 'month' ? 'Week' : 'Month'}
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {Math.max(...(chartData.data.length > 0 ? chartData.data : [0]))}
            </Text>
            <Text style={styles.statLabel}>
              Peak {timeRange === 'week' ? 'Day' : timeRange === 'month' ? 'Week' : 'Month'}
            </Text>
          </View>
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
  timeRangeSelector: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3498db',
    backgroundColor: 'white',
    alignItems: 'center',
  },
  activeTimeRangeButton: {
    backgroundColor: '#3498db',
  },
  timeRangeButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#3498db',
  },
  activeTimeRangeButtonText: {
    color: 'white',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    textAlign: 'center',
  },
});