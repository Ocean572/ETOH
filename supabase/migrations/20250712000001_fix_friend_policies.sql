-- Drop existing friend policies and recreate them with proper logic
DROP POLICY IF EXISTS "Friends can view each other's profiles" ON profiles;
DROP POLICY IF EXISTS "Friends can view each other's drink entries" ON drink_entries;
DROP POLICY IF EXISTS "Friends can view each other's goals" ON user_goals;
DROP POLICY IF EXISTS "Friends can view each other's health assessments" ON health_assessments;
DROP POLICY IF EXISTS "Friends can view each other's settings" ON user_settings;

-- Create improved policies that handle bidirectional friendships properly

-- Profiles: Friends can view each other's profiles
CREATE POLICY "Friends can view each other's profiles" ON profiles 
  FOR SELECT USING (
    auth.uid() = id OR -- Users can always see their own profile
    EXISTS (
      SELECT 1 FROM friendships 
      WHERE (user_id = auth.uid() AND friend_id = id)
         OR (user_id = id AND friend_id = auth.uid())
    )
  );

-- Drink entries: Friends can view each other's drink entries
CREATE POLICY "Friends can view each other's drink entries" ON drink_entries 
  FOR SELECT USING (
    auth.uid() = user_id OR -- Users can always see their own entries
    EXISTS (
      SELECT 1 FROM friendships 
      WHERE (user_id = auth.uid() AND friend_id = drink_entries.user_id)
         OR (user_id = drink_entries.user_id AND friend_id = auth.uid())
    )
  );

-- Goals: Friends can view each other's goals
CREATE POLICY "Friends can view each other's goals" ON user_goals 
  FOR SELECT USING (
    auth.uid() = user_id OR -- Users can always see their own goals
    EXISTS (
      SELECT 1 FROM friendships 
      WHERE (user_id = auth.uid() AND friend_id = user_goals.user_id)
         OR (user_id = user_goals.user_id AND friend_id = auth.uid())
    )
  );

-- Health assessments: Friends can view each other's health assessments
CREATE POLICY "Friends can view each other's health assessments" ON health_assessments 
  FOR SELECT USING (
    auth.uid() = user_id OR -- Users can always see their own assessments
    EXISTS (
      SELECT 1 FROM friendships 
      WHERE (user_id = auth.uid() AND friend_id = health_assessments.user_id)
         OR (user_id = health_assessments.user_id AND friend_id = auth.uid())
    )
  );

-- Settings: Friends can view each other's settings (limited access)
CREATE POLICY "Friends can view each other's settings" ON user_settings 
  FOR SELECT USING (
    auth.uid() = user_id OR -- Users can always see their own settings
    EXISTS (
      SELECT 1 FROM friendships 
      WHERE (user_id = auth.uid() AND friend_id = user_settings.user_id)
         OR (user_id = user_settings.user_id AND friend_id = auth.uid())
    )
  );