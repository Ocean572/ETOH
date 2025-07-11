import { supabase } from './supabase';

export const setupFriendsDatabase = async (): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('Setting up friends database tables...');
    
    // Check if tables already exist by trying to query them
    const { error: checkError } = await supabase
      .from('friend_requests')
      .select('id')
      .limit(1);
    
    if (!checkError) {
      console.log('Friends tables already exist');
      return { success: true, message: 'Friends tables already exist' };
    }
    
    // If we get here, tables don't exist, so create them using SQL
    console.log('Creating friends tables...');
    
    // Create friend_requests table
    const { error: createFriendRequestsError } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    });

    // Create friendships table
    const { error: createFriendshipsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS friendships (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          friend_id UUID NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id, friend_id),
          CONSTRAINT fk_friendships_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
          CONSTRAINT fk_friendships_friend FOREIGN KEY (friend_id) REFERENCES profiles(id) ON DELETE CASCADE
        );
      `
    });

    // Enable RLS and create policies
    const { error: setupSecurityError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Enable RLS
        ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
        ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

        -- Policies for friend_requests
        CREATE POLICY IF NOT EXISTS "Users can view friend requests involving them" ON friend_requests 
          FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
          
        CREATE POLICY IF NOT EXISTS "Users can send friend requests" ON friend_requests 
          FOR INSERT WITH CHECK (auth.uid() = sender_id);
          
        CREATE POLICY IF NOT EXISTS "Users can update received friend requests" ON friend_requests 
          FOR UPDATE USING (auth.uid() = receiver_id);
          
        CREATE POLICY IF NOT EXISTS "Users can delete their sent friend requests" ON friend_requests 
          FOR DELETE USING (auth.uid() = sender_id);

        -- Policies for friendships
        CREATE POLICY IF NOT EXISTS "Users can view their friendships" ON friendships 
          FOR SELECT USING (auth.uid() = user_id);
          
        CREATE POLICY IF NOT EXISTS "Users can create friendships" ON friendships 
          FOR INSERT WITH CHECK (auth.uid() = user_id);
          
        CREATE POLICY IF NOT EXISTS "Users can delete their friendships" ON friendships 
          FOR DELETE USING (auth.uid() = user_id);
      `
    });

    // Create function and trigger
    const { error: setupFunctionError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Function to automatically update updated_at timestamp
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ language 'plpgsql';

        -- Trigger for friend_requests
        DROP TRIGGER IF EXISTS update_friend_requests_updated_at ON friend_requests;
        CREATE TRIGGER update_friend_requests_updated_at 
          BEFORE UPDATE ON friend_requests 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `
    });

    // Create indexes
    const { error: createIndexesError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Indexes for better performance
        CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON friend_requests(sender_id);
        CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id);
        CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(status);
        CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id);
        CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id);
      `
    });

    // Check for any errors
    if (createFriendRequestsError || createFriendshipsError || setupSecurityError || setupFunctionError || createIndexesError) {
      const error = createFriendRequestsError || createFriendshipsError || setupSecurityError || setupFunctionError || createIndexesError;
      console.error('Error creating friends tables:', error);
      
      // Fallback: try to use the simple approach without RPC
      return await setupFriendsTablesFallback();
    }

    console.log('Friends tables created successfully');
    return { success: true, message: 'Friends tables created successfully' };
    
  } catch (error) {
    console.error('Error setting up friends database:', error);
    
    // Try fallback method
    return await setupFriendsTablesFallback();
  }
};

// Fallback method that creates tables directly without RPC
const setupFriendsTablesFallback = async (): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('Attempting fallback table creation...');
    
    // Use Supabase's built-in SQL execution if available
    const sqlCommands = [
      // Create friend_requests table
      `CREATE TABLE IF NOT EXISTS friend_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(sender_id, receiver_id)
      )`,
      
      // Create friendships table
      `CREATE TABLE IF NOT EXISTS friendships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, friend_id)
      )`,
      
      // Enable RLS
      `ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE friendships ENABLE ROW LEVEL SECURITY`
    ];

    // Try each command individually
    for (const sql of sqlCommands) {
      try {
        await supabase.rpc('exec_sql', { sql });
      } catch (err) {
        console.log('SQL command failed, continuing...', err);
      }
    }

    // Test if tables were created
    const { error: testError } = await supabase
      .from('friend_requests')
      .select('id')
      .limit(1);

    if (!testError) {
      console.log('Friends tables created successfully via fallback');
      return { success: true, message: 'Friends tables created successfully' };
    }

    return { 
      success: false, 
      message: 'Could not create friends tables automatically. Please run the SQL manually in Supabase dashboard.' 
    };

  } catch (error) {
    console.error('Fallback table creation failed:', error);
    return { 
      success: false, 
      message: 'Could not create friends tables automatically. Please run the SQL manually in Supabase dashboard.' 
    };
  }
};