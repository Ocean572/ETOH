import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { ChartData, TimeRange } from '../services/analyticsService';

interface DrinkChartProps {
  data: ChartData;
  timeRange: TimeRange;
  loading?: boolean;
}

const screenWidth = Dimensions.get('window').width;

export default function DrinkChart({ data, timeRange, loading }: DrinkChartProps) {
  // Calculate available width: screen width - container margins - container padding
  const chartWidth = screenWidth - 40 - 40; // 40 for margins, 40 for padding
  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text>Loading chart data...</Text>
      </View>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text>No data available</Text>
      </View>
    );
  }

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(52, 152, 219, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForBackgroundLines: {
      strokeWidth: 1,
      stroke: '#e3e3e3',
      strokeDasharray: '0',
    },
    propsForLabels: {
      fontSize: 10,
    },
    barPercentage: 0.5,
  };

  const chartData = {
    labels: data.labels,
    datasets: [
      {
        data: data.data.length > 0 ? data.data : [0],
      },
    ],
  };

  const getYAxisSuffix = (timeRange: TimeRange): string => {
    switch (timeRange) {
      case 'week':
        return ' drinks/day';
      case 'month':
        return ' drinks/week';
      case 'year':
        return ' drinks/month';
      default:
        return ' drinks';
    }
  };

  return (
    <View style={styles.container}>
      <BarChart
        data={chartData}
        width={chartWidth}
        height={280}
        chartConfig={chartConfig}
        verticalLabelRotation={0}
        yAxisSuffix=""
        showValuesOnTopOfBars={true}
        fromZero={true}
        style={styles.chart}
      />
      <Text style={styles.yAxisLabel}>
        {getYAxisSuffix(timeRange)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 280,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  yAxisLabel: {
    textAlign: 'center',
    color: '#7f8c8d',
    fontSize: 12,
    marginTop: 10,
  },
});