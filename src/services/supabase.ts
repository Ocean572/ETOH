import { createClient } from '@supabase/supabase-js';

// For development, use these values. In production, use environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 
  (typeof window !== 'undefined' && window.location.hostname === 'localhost' 
    ? 'http://localhost:54321' 
    : 'https://etoh.doctorfranz.com/supabase');
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.54r4pUk2bJjai00rlsBmyrS2A4yB5BI0kTpTj29_3gA';

export const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;