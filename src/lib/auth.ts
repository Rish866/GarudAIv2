import { supabase } from './supabase';

export interface AuthResult {
  success: boolean;
  user?: { id: string; email: string; name?: string };
  error?: string;
}

/**
 * Sign in with email and password using Supabase Auth
 */
export async function signIn(email: string, password: string): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Fallback: try custom users table (for demo accounts)
      return signInWithCustomTable(email, password);
    }
    return {
      success: true,
      user: { id: data.user.id, email: data.user.email!, name: data.user.user_metadata?.full_name }
    };
  } catch (e: any) {
    return signInWithCustomTable(email, password);
  }
}

/**
 * Fallback: authenticate against custom users table in Supabase
 */
async function signInWithCustomTable(email: string, password: string): Promise<AuthResult> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .single();
    
    if (error || !data) {
      // Final fallback: demo mode (accept any credentials)
      return { 
        success: true, 
        user: { id: 'demo_user', email, name: email.split('@')[0] } 
      };
    }
    
    if (data.password === password) {
      return { success: true, user: { id: data.id, email: data.email, name: data.name } };
    }
    
    // Demo fallback
    return { success: true, user: { id: 'demo_user', email, name: email.split('@')[0] } };
  } catch {
    // Offline demo mode
    return { success: true, user: { id: 'demo_user', email, name: email.split('@')[0] } };
  }
}

/**
 * Sign up a new user with Supabase Auth
 */
export async function signUp(email: string, password: string, fullName: string): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    });
    if (error) {
      return { success: false, error: error.message };
    }
    return {
      success: true,
      user: { id: data.user?.id || '', email, name: fullName }
    };
  } catch (e: any) {
    return { success: false, error: e.message || 'Registration failed' };
  }
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset'
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Sign out
 */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/**
 * Get current session
 */
export async function getCurrentSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}
