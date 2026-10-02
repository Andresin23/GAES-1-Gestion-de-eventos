import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env.js';

/**
 * Cliente con la secret key del proyecto: bypassa RLS y delega la sesion.
 * Solo debe usarse en el backend. NUNCA exponersela al navegador.
 */
export const supabaseAdmin: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SECRET_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  }
);

/**
 * Cliente con la publishable key. Se usa para operaciones que participan en el
 * flujo de autenticacion del usuario (login, MFA, recuperacion), donde el
 * secreto de servicio no debe intervenir.
 */
export const supabasePublico: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  }
);

export type ClaimsSupabase = {
  sub: string;
  aal?: 'aal1' | 'aal2';
  email?: string;
  role?: string;
  session_id?: string;
  exp?: number;
};
