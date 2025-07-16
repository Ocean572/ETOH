import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Line, Text as SvgText, G } from 'react-native-svg';
import { ChartData, TimeRange } from '../services/analyticsService';

interface DrinkChartProps {
  data: ChartData;
  timeRange: TimeRange;
  loading?: boolean;
}

const screenWidth = Dimensions.get('window').width;

export default function DrinkChart({ data, timeRange, loading }: DrinkChartProps) {
  // Calculate available width: screen width - container margins - container padding (made wider)
  const chartWidth = screenWidth - 40 - 24; // 40 for margins, 24 for padding (reduced from 48)
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

  // Chart dimensions and layout
  const chartHeight = 280;
  const yAxisWidth = 50;
  const xAxisHeight = 40;
  const plotWidth = chartWidth - yAxisWidth;
  const plotHeight = chartHeight - xAxisHeight;
  
  // Data calculations
  const maxValue = Math.max(...data.data, 1);
  const yAxisMax = Math.ceil(maxValue * 1.2);
  const yAxisSteps = 6;
  const stepValue = yAxisMax / yAxisSteps;
  
  // Bar calculations - make bars narrower for week view
  const isWeekView = timeRange === 'week';
  const barWidthRatio = isWeekView ? 0.3 : 0.6; // Much narrower for week view
  const barWidth = (plotWidth - 40) / data.data.length * barWidthRatio;
  const barSpacing = (plotWidth - 40) / data.data.length * (1 - barWidthRatio);
  
  const renderChart = () => {
    const bars = [];
    const xLabels = [];
    
    data.data.forEach((value, index) => {
      const barHeight = (value / yAxisMax) * plotHeight;
      const x = yAxisWidth + 20 + index * (barWidth + barSpacing) + barSpacing / 2;
      const y = plotHeight - barHeight;
      
      // Bar
      bars.push(
        <Rect
          key={`bar-${index}`}
          x={x}
          y={y}
          width={barWidth}
          height={barHeight}
          fill="#2980b9"
          rx={3}
        />
      );
      
      // Value on top of bar
      if (value > 0) {
        bars.push(
          <SvgText
            key={`value-${index}`}
            x={x + barWidth / 2}
            y={y - 5}
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            fill="#2c3e50"
          >
            {value}
          </SvgText>
        );
      }
      
      // X-axis label (vertical for year view, horizontal otherwise)
      const isYearView = timeRange === 'year';
      xLabels.push(
        <SvgText
          key={`xlabel-${index}`}
          x={x + barWidth / 2}
          y={plotHeight + (isYearView ? 35 : (isWeekView ? 15 : 20))}
          textAnchor="middle"
          fontSize="10"
          fontWeight="500"
          fill="#2c3e50"
          transform={isYearView ? `rotate(-90, ${x + barWidth / 2}, ${plotHeight + 35})` : undefined}
        >
          {data.labels[index]}
        </SvgText>
      );
      
      // Add date below day name for week view
      if (isWeekView && data.dates && data.dates[index]) {
        xLabels.push(
          <SvgText
            key={`date-${index}`}
            x={x + barWidth / 2}
            y={plotHeight + 30}
            textAnchor="middle"
            fontSize="9"
            fontWeight="400"
            fill="#7f8c8d"
          >
            {data.dates[index]}
          </SvgText>
        );
      }
    });
    
    // Y-axis labels and grid lines
    const yAxisElements = [];
    for (let i = 0; i <= yAxisSteps; i++) {
      const value = i * stepValue;
      const y = plotHeight - (i / yAxisSteps) * plotHeight;
      
      // Y-axis label (outside to the left)
      yAxisElements.push(
        <SvgText
          key={`ylabel-${i}`}
          x={yAxisWidth - 8}
          y={y + 4}
          textAnchor="end"
          fontSize="11"
          fontWeight="600"
          fill="#2c3e50"
        >
          {Math.round(value)}
        </SvgText>
      );
      
      // Horizontal grid line (only within the plot area)
      if (i > 0) {
        yAxisElements.push(
          <Line
            key={`gridline-${i}`}
            x1={yAxisWidth}
            y1={y}
            x2={yAxisWidth + plotWidth - 20}
            y2={y}
            stroke="#bdc3c7"
            strokeWidth={1}
          />
        );
      }
    }
    
    const isYearView = timeRange === 'year';
    const svgHeight = chartHeight + (isYearView ? 40 : (isWeekView ? 35 : 20));
    
    return (
      <Svg width={chartWidth} height={svgHeight}>
        {/* Y-axis labels and grid lines */}
        {yAxisElements}
        
        {/* Y-axis line (bold vertical) */}
        <Line
          x1={yAxisWidth}
          y1={0}
          x2={yAxisWidth}
          y2={plotHeight}
          stroke="#34495e"
          strokeWidth={3}
        />
        
        {/* X-axis line (bold horizontal) */}
        <Line
          x1={yAxisWidth}
          y1={plotHeight}
          x2={yAxisWidth + plotWidth - 20}
          y2={plotHeight}
          stroke="#34495e"
          strokeWidth={3}
        />
        
        {/* Bars and values */}
        {bars}
        
        {/* X-axis labels */}
        {xLabels}
      </Svg>
    );
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
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>Consumption Analysis</Text>
        <Text style={styles.yAxisLabel}>
          {getYAxisSuffix(timeRange)}
        </Text>
      </View>
      <View style={styles.chartContainer}>
        {renderChart()}
      </View>
      <View style={styles.axisContainer}>
        <Text style={styles.xAxisLabel}>Time Period</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 20,
    marginVertical: 12,
    boxShadow: '0px 3px 6px rgba(0, 0, 0, 0.12)',
    elevation: 4,
    borderWidth: 1,
    borderColor: '#ecf0f1',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 300,
  },
  chartContainer: {
    marginVertical: 16,
    alignItems: 'center',
    overflow: 'hidden',
  },
  chart: {
    marginVertical: 16,
    borderRadius: 8,
  },
  chartHeader: {
    marginBottom: 20,
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'center',
  },
  yAxisLabel: {
    fontSize: 13,
    color: '#7f8c8d',
    fontWeight: '500',
    textAlign: 'center',
  },
  axisContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  xAxisLabel: {
    fontSize: 13,
    color: '#7f8c8d',
    fontWeight: '500',
    textAlign: 'center',
  },
});