// Supabase Client for Garud AI Transport ERP (Multi-Tenant)
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://emcynvexbauhohpwcqaw.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_MQxqdtD5HRHHsIxhmIjHrQ_XS4jyXWh';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Login user via Supabase Auth
 */
export async function loginUser(email: string, password: string): Promise<{ success: boolean; user?: any; error?: string }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { success: false, error: error.message };
  return { success: true, user: data.user };
}

/**
 * Test Supabase connection health
 */
export async function testSupabaseConnection(): Promise<{ connected: boolean; message: string }> {
  try {
    const { data, error } = await supabase.from('organizations').select('id').limit(1);
    if (error) return { connected: false, message: error.message };
    return { connected: true, message: 'Connected to Supabase successfully' };
  } catch (e: any) {
    return { connected: false, message: e.message || 'Connection failed' };
  }
}
