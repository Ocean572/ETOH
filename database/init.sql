-- ETOH Tracker Database Initialization Script
-- This script is idempotent - safe to run multiple times
-- PostgreSQL/Supabase complete database schema

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  full_name TEXT,
  profile_picture_url TEXT,
  motivation_text TEXT,
  reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drink entries
CREATE TABLE IF NOT EXISTS drink_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  drink_count INTEGER NOT NULL CHECK (drink_count > 0),
  drink_type TEXT,
  logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User goals
CREATE TABLE IF NOT EXISTS user_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL,
  target_drinks INTEGER NOT NULL CHECK (target_drinks >= 0),
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Social contacts for accountability
CREATE TABLE IF NOT EXISTS social_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  contact_email TEXT NOT NULL,
  contact_name TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User settings and limits
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  daily_limit INTEGER,
  weekly_limit INTEGER,
  monthly_limit INTEGER,
  notifications_enabled BOOLEAN DEFAULT TRUE,
  social_sharing_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Health risk assessments
CREATE TABLE IF NOT EXISTS health_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  assessment_date DATE NOT NULL,
  weekly_average DECIMAL(5,2),
  monthly_average DECIMAL(5,2),
  risk_level TEXT NOT NULL,
  recommendations TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Friend requests table
CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sender_id, receiver_id)
);

-- Friendships table (bidirectional relationships)
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drink_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running script)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

DROP POLICY IF EXISTS "Users can view own drink entries" ON drink_entries;
DROP POLICY IF EXISTS "Users can insert own drink entries" ON drink_entries;
DROP POLICY IF EXISTS "Users can update own drink entries" ON drink_entries;
DROP POLICY IF EXISTS "Users can delete own drink entries" ON drink_entries;

DROP POLICY IF EXISTS "Users can view own goals" ON user_goals;
DROP POLICY IF EXISTS "Users can insert own goals" ON user_goals;
DROP POLICY IF EXISTS "Users can update own goals" ON user_goals;
DROP POLICY IF EXISTS "Users can delete own goals" ON user_goals;

DROP POLICY IF EXISTS "Users can view own contacts" ON social_contacts;
DROP POLICY IF EXISTS "Users can insert own contacts" ON social_contacts;
DROP POLICY IF EXISTS "Users can update own contacts" ON social_contacts;
DROP POLICY IF EXISTS "Users can delete own contacts" ON social_contacts;

DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can delete own settings" ON user_settings;

DROP POLICY IF EXISTS "Users can view own assessments" ON health_assessments;
DROP POLICY IF EXISTS "Users can insert own assessments" ON health_assessments;
DROP POLICY IF EXISTS "Users can update own assessments" ON health_assessments;
DROP POLICY IF EXISTS "Users can delete own assessments" ON health_assessments;

DROP POLICY IF EXISTS "Users can view friend requests involving them" ON friend_requests;
DROP POLICY IF EXISTS "Users can send friend requests" ON friend_requests;
DROP POLICY IF EXISTS "Users can update received friend requests" ON friend_requests;
DROP POLICY IF EXISTS "Users can delete their sent friend requests" ON friend_requests;

DROP POLICY IF EXISTS "Users can view their friendships" ON friendships;
DROP POLICY IF EXISTS "Users can create friendships" ON friendships;
DROP POLICY IF EXISTS "Users can delete their friendships" ON friendships;

-- Create RLS Policies

-- Policies for profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Policies for drink_entries
CREATE POLICY "Users can view own drink entries" ON drink_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own drink entries" ON drink_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own drink entries" ON drink_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own drink entries" ON drink_entries FOR DELETE USING (auth.uid() = user_id);

-- Policies for user_goals
CREATE POLICY "Users can view own goals" ON user_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own goals" ON user_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own goals" ON user_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own goals" ON user_goals FOR DELETE USING (auth.uid() = user_id);

-- Policies for social_contacts
CREATE POLICY "Users can view own contacts" ON social_contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own contacts" ON social_contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contacts" ON social_contacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own contacts" ON social_contacts FOR DELETE USING (auth.uid() = user_id);

-- Policies for user_settings
CREATE POLICY "Users can view own settings" ON user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON user_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own settings" ON user_settings FOR DELETE USING (auth.uid() = user_id);

-- Policies for health_assessments
CREATE POLICY "Users can view own assessments" ON health_assessments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own assessments" ON health_assessments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own assessments" ON health_assessments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own assessments" ON health_assessments FOR DELETE USING (auth.uid() = user_id);

-- Policies for friend_requests
CREATE POLICY "Users can view friend requests involving them" ON friend_requests 
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
  
CREATE POLICY "Users can send friend requests" ON friend_requests 
  FOR INSERT WITH CHECK (auth.uid() = sender_id);
  
CREATE POLICY "Users can update received friend requests" ON friend_requests 
  FOR UPDATE USING (auth.uid() = receiver_id);
  
CREATE POLICY "Users can delete their sent friend requests" ON friend_requests 
  FOR DELETE USING (auth.uid() = sender_id);

-- Policies for friendships
CREATE POLICY "Users can view their friendships" ON friendships 
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can create friendships" ON friendships 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can delete their friendships" ON friendships 
  FOR DELETE USING (auth.uid() = user_id);

-- Functions and Triggers

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_friend_requests_updated_at ON friend_requests;
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;

-- Create triggers for updated_at columns
CREATE TRIGGER update_friend_requests_updated_at 
  BEFORE UPDATE ON friend_requests 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at 
  BEFORE UPDATE ON user_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Performance Indexes

-- Indexes for drink_entries (most queried table)
CREATE INDEX IF NOT EXISTS idx_drink_entries_user_id ON drink_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_drink_entries_logged_at ON drink_entries(logged_at);
CREATE INDEX IF NOT EXISTS idx_drink_entries_user_logged ON drink_entries(user_id, logged_at);

-- Indexes for user_goals
CREATE INDEX IF NOT EXISTS idx_user_goals_user_id ON user_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_user_goals_active ON user_goals(user_id, is_active);

-- Indexes for friend_requests
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(status);
CREATE INDEX IF NOT EXISTS idx_friend_requests_pending ON friend_requests(receiver_id, status) WHERE status = 'pending';

-- Indexes for friendships
CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id);

-- Indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Indexes for health_assessments
CREATE INDEX IF NOT EXISTS idx_health_assessments_user_date ON health_assessments(user_id, assessment_date);

-- Indexes for social_contacts
CREATE INDEX IF NOT EXISTS idx_social_contacts_user ON social_contacts(user_id, is_active);

-- Indexes for user_settings
CREATE INDEX IF NOT EXISTS idx_user_settings_user ON user_settings(user_id);

-- Real-time publication setup (for Supabase real-time features)
-- This enables real-time subscriptions for the tables

-- Enable real-time for tables that need live updates
ALTER PUBLICATION supabase_realtime ADD TABLE friend_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE friendships;
ALTER PUBLICATION supabase_realtime ADD TABLE drink_entries;

-- Database initialization complete
-- All tables, policies, indexes, and triggers are now set up
-- The database is ready for the ETOH Tracker application