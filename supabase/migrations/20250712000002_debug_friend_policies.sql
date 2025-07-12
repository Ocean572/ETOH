-- Drop all friend policies and recreate with better debugging
DROP POLICY IF EXISTS "Friends can view each other's profiles" ON profiles;

-- Create a more permissive policy for debugging
CREATE POLICY "Friends can view each other's profiles" ON profiles 
  FOR SELECT USING (
    auth.uid() = id OR -- Users can see their own profile
    id IN (
      -- Direct friendship check
      SELECT friend_id FROM friendships WHERE user_id = auth.uid()
      UNION
      SELECT user_id FROM friendships WHERE friend_id = auth.uid()
    )
  );