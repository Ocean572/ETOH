-- Create necessary roles for Supabase

-- Auth admin role
CREATE ROLE supabase_auth_admin WITH LOGIN CREATEDB CREATEROLE PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE postgres TO supabase_auth_admin;

-- Rest admin role  
CREATE ROLE supabase_rest_admin WITH LOGIN CREATEDB CREATEROLE PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE postgres TO supabase_rest_admin;

-- Storage admin role
CREATE ROLE supabase_storage_admin WITH LOGIN CREATEDB CREATEROLE PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE postgres TO supabase_storage_admin;

-- Meta admin role
CREATE ROLE supabase_meta_admin WITH LOGIN CREATEDB CREATEROLE PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE postgres TO supabase_meta_admin;

-- Realtime admin role
CREATE ROLE supabase_realtime_admin WITH LOGIN CREATEDB CREATEROLE PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE postgres TO supabase_realtime_admin;

-- Logflare admin role
CREATE ROLE supabase_logflare_admin WITH LOGIN CREATEDB CREATEROLE PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE postgres TO supabase_logflare_admin;

-- Anonymous role
CREATE ROLE anon;
GRANT USAGE ON SCHEMA public TO anon;

-- Authenticated role
CREATE ROLE authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Service role
CREATE ROLE service_role;
GRANT ALL PRIVILEGES ON DATABASE postgres TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;