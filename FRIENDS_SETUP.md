# Friends Feature Database Setup

To use the friends feature, you need to create the required database tables in your Supabase project.

## Instructions:

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run the following SQL script:

```sql
-- Friend requests table
CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sender_id, receiver_id),
  CONSTRAINT fk_friend_requests_sender FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_friend_requests_receiver FOREIGN KEY (receiver_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Friendships table (bidirectional relationships)
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  friend_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id),
  CONSTRAINT fk_friendships_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_friendships_friend FOREIGN KEY (friend_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

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

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for friend_requests
CREATE TRIGGER update_friend_requests_updated_at 
  BEFORE UPDATE ON friend_requests 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(status);
CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id);
```

## After running the SQL:

The friends feature will be fully functional with:
- Friend requests by email
- Real-time friend request notifications
- Accept/reject functionality
- Friends list management
- Secure Row Level Security policies

## Features:

1. **Add Friends**: Send friend requests by email
2. **Real-time Updates**: Instant notifications for friend requests
3. **Manage Requests**: Accept or reject incoming requests
4. **Friends List**: View all your friends with their profiles
5. **Remove Friends**: Unfriend users when needed

## Navigation:

- **Profile Button**: Top-left corner (👤) → Profile and Logout
- **Friends Tab**: Bottom navigation (replaces Settings)
- **Profile Screen**: Now accessible via the profile button dropdown