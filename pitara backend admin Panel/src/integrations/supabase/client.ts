import { createClient } from '@supabase/supabase-js';

// Prefer environment variables so the key can be rotated without touching source.
// When running `vite`, variables must be prefixed with VITE_ to be exposed to the browser.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://jdfnkvbfpvzddjtgiovj.supabase.co';
const SUPABASE_SERVICE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkZm5rdmJmcHZ6ZGRqdGdpb3ZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc4MTk5NywiZXhwIjoyMDY1MzU3OTk3fQ.1F3rEb-pKOQRlY-dZGb5-8IUvtlGhGDbvJDHhm8YrKI';

if (!import.meta.env.VITE_SUPABASE_SERVICE_KEY) {
  // eslint-disable-next-line no-console
  console.warn('[Supabase] Using fallback hard-coded service key. Consider setting VITE_SUPABASE_SERVICE_KEY in .env.local to avoid committing secrets to the repo.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  // Ensure the privileged key is sent for every request even without an auth session
  global: {
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
    },
  },
}); 