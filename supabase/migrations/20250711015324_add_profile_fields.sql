-- Add profile picture and motivation fields to profiles table
ALTER TABLE profiles 
ADD COLUMN profile_picture_url TEXT,
ADD COLUMN motivation_text TEXT,
ADD COLUMN reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();