import { createClient } from '@supabase/supabase-js';
import { env } from './env';

// Client com service_role — usa APENAS no backend, NUNCA no frontend
export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
