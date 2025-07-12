-- Add RLS policies to allow friends to view each other's data

-- Allow friends to view each other's profiles (limited fields)
CREATE POLICY "Friends can view each other's profiles" ON profiles 
  FOR SELECT USING (
    id IN (
      SELECT friend_id FROM friendships WHERE user_id = auth.uid()
      UNION
      SELECT user_id FROM friendships WHERE friend_id = auth.uid()
    )
  );

-- Allow friends to view each other's drink entries
CREATE POLICY "Friends can view each other's drink entries" ON drink_entries 
  FOR SELECT USING (
    user_id IN (
      SELECT friend_id FROM friendships WHERE user_id = auth.uid()
      UNION
      SELECT user_id FROM friendships WHERE friend_id = auth.uid()
    )
  );

-- Allow friends to view each other's goals
CREATE POLICY "Friends can view each other's goals" ON user_goals 
  FOR SELECT USING (
    user_id IN (
      SELECT friend_id FROM friendships WHERE user_id = auth.uid()
      UNION
      SELECT user_id FROM friendships WHERE friend_id = auth.uid()
    )
  );

-- Allow friends to view each other's health assessments (if needed)
CREATE POLICY "Friends can view each other's health assessments" ON health_assessments 
  FOR SELECT USING (
    user_id IN (
      SELECT friend_id FROM friendships WHERE user_id = auth.uid()
      UNION
      SELECT user_id FROM friendships WHERE friend_id = auth.uid()
    )
  );

-- Allow friends to view each other's settings (limited access, mainly for goals/limits)
CREATE POLICY "Friends can view each other's settings" ON user_settings 
  FOR SELECT USING (
    user_id IN (
      SELECT friend_id FROM friendships WHERE user_id = auth.uid()
      UNION
      SELECT user_id FROM friendships WHERE friend_id = auth.uid()
    )
  );

-- Create indexes for better performance on friendship queries
CREATE INDEX IF NOT EXISTS idx_friendships_user_friend ON friendships(user_id, friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_user ON friendships(friend_id, user_id);

-- Add a function to check if two users are friends (for easier policy writing)
CREATE OR REPLACE FUNCTION are_friends(user1_id UUID, user2_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM friendships 
    WHERE (user_id = user1_id AND friend_id = user2_id)
       OR (user_id = user2_id AND friend_id = user1_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;