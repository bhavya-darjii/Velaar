// Supabase ADMIN client — server-side only.
// Uses the SERVICE_ROLE key which bypasses all Row Level Security.
// NEVER expose this key to the frontend.
//
// SETUP REQUIRED:
//   1. Supabase Dashboard → Project Settings → API → service_role (secret) key
//   2. Add to server/.env:
//        SUPABASE_URL=https://your-project-ref.supabase.co
//        SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn(
    '[supabaseAdmin] ⚠️  SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.\n' +
    '  → Add them to server/.env\n' +
    '  → AI logging and Admin stats will fail until configured.',
  );
}

export const adminSupabase: SupabaseClient | null =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;
