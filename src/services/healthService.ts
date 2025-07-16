import { drinkService } from './drinkService';
import { calculateRiskLevel, RiskLevel } from '../utils/healthCalculations';
import { settingsService } from './settingsService';

export interface HealthAssessmentData {
  weeklyTotal: number; // Total drinks in the past 7 days
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
    // Use the actual weekly total (last 7 days) instead of average × 7
    const weeklyTotal = await drinkService.getWeeklyTotal();
    const avgData = await drinkService.getAverageDrinksPerDay();
    
    // Get user's gender for gender-aware risk assessment
    const profile = await settingsService.getProfile();
    const gender = profile?.gender === 'female' ? 'female' : 'male'; // Default to male if not specified
    
    // Use actual weekly consumption for risk assessment with gender
    const riskAssessment = calculateRiskLevel(weeklyTotal, gender);
    const personalizedWarnings = this.getPersonalizedWarnings(weeklyTotal, avgData.average, gender);
    const recommendations = this.getPersonalizedRecommendations(riskAssessment.level, weeklyTotal);
    
    return {
      weeklyTotal: weeklyTotal,
      riskLevel: riskAssessment.level,
      personalizedWarnings,
      recommendations,
    };
  },

  getPersonalizedWarnings(weeklyAverage: number, dailyAverage: number, gender: 'male' | 'female' = 'male'): string[] {
    const warnings: string[] = [];
    
    // Gender-specific thresholds for warnings
    const highRiskThreshold = gender === 'female' ? 14 : 21;
    const moderateRiskThreshold = gender === 'female' ? 7 : 14;
    
    if (weeklyAverage > highRiskThreshold) {
      warnings.push('Your current consumption significantly increases your risk of liver damage and cirrhosis');
    } else if (weeklyAverage > moderateRiskThreshold) {
      warnings.push('Your drinking pattern puts you at increased risk for liver problems');
    }
    
    if (dailyAverage > 3) {
      const cancerWarning = gender === 'female' 
        ? 'Daily heavy drinking increases your cancer risk, especially for liver and breast cancer'
        : 'Daily heavy drinking increases your cancer risk, especially for liver cancer';
      warnings.push(cancerWarning);
    }
    
    if (weeklyAverage > moderateRiskThreshold) {
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