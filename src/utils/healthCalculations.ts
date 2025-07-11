export type RiskLevel = 'low' | 'moderate' | 'high' | 'severe';

export interface HealthRisk {
  level: RiskLevel;
  description: string;
  recommendations: string[];
}

export const calculateRiskLevel = (weeklyDrinks: number, gender: 'male' | 'female' = 'male'): HealthRisk => {
  const thresholds = {
    female: { low: 7, moderate: 14, high: 21 },
    male: { low: 14, moderate: 21, high: 28 }
  };

  const limits = thresholds[gender];

  if (weeklyDrinks < limits.low) {
    return {
      level: 'low',
      description: 'Your alcohol consumption is within low-risk guidelines.',
      recommendations: [
        'Continue maintaining moderate consumption',
        'Stay hydrated and eat before drinking',
        'Consider alcohol-free days each week'
      ]
    };
  } else if (weeklyDrinks < limits.moderate) {
    return {
      level: 'moderate',
      description: 'Your alcohol consumption is at moderate risk levels.',
      recommendations: [
        'Consider reducing weekly consumption',
        'Track your drinking patterns',
        'Implement alcohol-free days',
        'Consider speaking with a healthcare provider'
      ]
    };
  } else if (weeklyDrinks < limits.high) {
    return {
      level: 'high',
      description: 'Your alcohol consumption is at high risk for health complications.',
      recommendations: [
        'Strongly consider reducing consumption',
        'Consult with a healthcare provider',
        'Consider naltrexone or other treatments',
        'Join support groups or counseling'
      ]
    };
  } else {
    return {
      level: 'severe',
      description: 'Your alcohol consumption poses severe health risks including cirrhosis.',
      recommendations: [
        'Seek immediate medical consultation',
        'Consider addiction treatment programs',
        'Discuss Vivitrol or naltrexone with doctor',
        'Emergency contact: National Suicide Prevention Lifeline 988'
      ]
    };
  }
};

export const calculateCirrhosisRisk = (weeklyDrinks: number, years: number): number => {
  // Simplified risk calculation - in reality this would be more complex
  const baseRisk = 0.01; // 1% baseline
  const drinkFactor = Math.max(0, weeklyDrinks - 14) * 0.002; // Risk increases after 14 drinks/week
  const timeFactor = years * 0.001; // Risk increases with time
  
  return Math.min(0.5, baseRisk + drinkFactor + timeFactor); // Cap at 50%
};

export const getTreatmentInfo = () => ({
  naltrexone: {
    name: 'Naltrexone (Oral)',
    description: 'Daily medication that reduces alcohol cravings and blocks euphoric effects',
    effectiveness: '50-70% reduction in heavy drinking days',
    sideEffects: 'Nausea, headache, dizziness, fatigue',
    contraindications: 'Current opioid use, severe liver disease'
  },
  vivitrol: {
    name: 'Vivitrol (Injectable)',
    description: 'Monthly injection of extended-release naltrexone',
    effectiveness: '25% reduction in heavy drinking days vs placebo',
    sideEffects: 'Injection site reactions, nausea, headache',
    contraindications: 'Current opioid use, severe liver disease'
  }
});