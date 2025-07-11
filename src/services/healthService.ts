import { drinkService } from './drinkService';
import { calculateRiskLevel, RiskLevel } from '../utils/healthCalculations';

export interface HealthAssessmentData {
  weeklyAverage: number;
  riskLevel: RiskLevel;
  personalizedWarnings: string[];
  recommendations: string[];
}

export interface RiskFactors {
  hasHighConsumption: boolean;
  hasRegularConsumption: boolean;
  exceedsGuidelines: boolean;
}

export const healthService = {
  async getPersonalizedHealthAssessment(): Promise<HealthAssessmentData> {
    const weeklyTotal = await drinkService.getWeeklyTotal();
    const avgData = await drinkService.getAverageDrinksPerDay();
    const weeklyAverage = avgData.average * 7;
    
    const riskAssessment = calculateRiskLevel(weeklyAverage);
    const personalizedWarnings = this.getPersonalizedWarnings(weeklyAverage, avgData.average);
    const recommendations = this.getPersonalizedRecommendations(riskAssessment.level, weeklyAverage);
    
    return {
      weeklyAverage,
      riskLevel: riskAssessment.level,
      personalizedWarnings,
      recommendations,
    };
  },

  getPersonalizedWarnings(weeklyAverage: number, dailyAverage: number): string[] {
    const warnings: string[] = [];
    
    if (weeklyAverage > 21) {
      warnings.push('Your current consumption significantly increases your risk of liver damage and cirrhosis');
    } else if (weeklyAverage > 14) {
      warnings.push('Your drinking pattern puts you at increased risk for liver problems');
    }
    
    if (dailyAverage > 3) {
      warnings.push('Daily heavy drinking increases your cancer risk, especially for liver and breast cancer');
    }
    
    if (weeklyAverage > 7) {
      warnings.push('Your consumption level may weaken your immune system');
    }
    
    return warnings;
  },

  getPersonalizedRecommendations(riskLevel: RiskLevel, weeklyAverage: number): string[] {
    const recommendations: string[] = [];
    
    switch (riskLevel) {
      case 'low':
        recommendations.push('Continue your current moderate approach');
        recommendations.push('Consider having 2-3 alcohol-free days per week');
        break;
      case 'moderate':
        recommendations.push('Gradually reduce your weekly consumption');
        recommendations.push('Track your drinking patterns to identify triggers');
        recommendations.push('Consider speaking with a healthcare provider');
        break;
      case 'high':
        recommendations.push('Strongly consider reducing your alcohol consumption');
        recommendations.push('Speak with a doctor about naltrexone or other treatments');
        recommendations.push('Consider joining a support group');
        break;
      case 'severe':
        recommendations.push('Seek immediate medical consultation');
        recommendations.push('Discuss Vivitrol or naltrexone with your doctor');
        recommendations.push('Consider professional addiction treatment');
        break;
    }
    
    return recommendations;
  },

  getRiskFactors(weeklyAverage: number): RiskFactors {
    return {
      hasHighConsumption: weeklyAverage > 14,
      hasRegularConsumption: weeklyAverage > 7,
      exceedsGuidelines: weeklyAverage > 21,
    };
  },
};