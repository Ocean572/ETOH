-- Add gender field to profiles table
ALTER TABLE profiles 
ADD COLUMN gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));