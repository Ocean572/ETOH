export interface DrinkEntry {
  id: string;
  user_id: string;
  drink_count: number;
  drink_type?: string;
  logged_at: string;
  notes?: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email?: string;
  full_name?: string;
  profile_picture_url?: string;
  motivation_text?: string;
  reset_date?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  created_at: string;
  updated_at: string;
}

export interface UserGoal {
  id: string;
  user_id: string;
  goal_type: 'weekly' | 'monthly';
  target_drinks: number;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  created_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  daily_limit?: number;
  weekly_limit?: number;
  monthly_limit?: number;
  notifications_enabled: boolean;
  social_sharing_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface HealthAssessment {
  id: string;
  user_id: string;
  assessment_date: string;
  weekly_average: number;
  monthly_average: number;
  risk_level: 'low' | 'moderate' | 'high' | 'severe';
  recommendations?: string;
  created_at: string;
}

export interface SocialContact {
  id: string;
  user_id: string;
  contact_email: string;
  contact_name?: string;
  is_active: boolean;
  created_at: string;
}