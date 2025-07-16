-- Realtime setup
CREATE SCHEMA IF NOT EXISTS _realtime;

-- Grant permissions
GRANT ALL ON SCHEMA _realtime TO supabase_realtime_admin;
GRANT USAGE ON SCHEMA _realtime TO anon;
GRANT USAGE ON SCHEMA _realtime TO authenticated;