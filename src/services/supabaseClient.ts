import { createClient } from '@supabase/supabase-js';

// Replace these two values with your free Supabase credentials:
// 1. Go to https://supabase.com -> Project Settings -> API
// 2. Copy "Project URL" and "anon public key"
export const SUPABASE_URL = 'https://qoaxujrwqcvshxitbyni.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_9wRjh1hl29rChCc1yFCU7w_ri9UD-kK';

// Checks if real Supabase credentials have been provided
export const isSupabaseConfigured = () => {
  return (
    SUPABASE_URL.startsWith('https://') &&
    !SUPABASE_URL.includes('YOUR_PROJECT_ID') &&
    !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE_ANON_PUBLIC_KEY')
  );
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

