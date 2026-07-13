const DISABLED_SUPABASE_URL = 'http://127.0.0.1:1';
const DISABLED_SUPABASE_KEY = 'configuration-missing';

export interface SupabaseRuntimeConfig {
  url: string;
  anonKey: string;
  error: string | null;
}

export function resolveSupabaseConfig(
  urlValue: string | undefined,
  anonKeyValue: string | undefined,
): SupabaseRuntimeConfig {
  const url = urlValue?.trim() ?? '';
  const anonKey = anonKeyValue?.trim() ?? '';
  const missing: string[] = [];

  if (!url) missing.push('VITE_SUPABASE_URL');
  if (!anonKey) missing.push('VITE_SUPABASE_ANON_KEY');

  if (missing.length > 0) {
    return {
      url: DISABLED_SUPABASE_URL,
      anonKey: DISABLED_SUPABASE_KEY,
      error: `Missing required environment variables: ${missing.join(', ')}`,
    };
  }

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      throw new Error('unsupported protocol');
    }
  } catch {
    return {
      url: DISABLED_SUPABASE_URL,
      anonKey: DISABLED_SUPABASE_KEY,
      error: 'VITE_SUPABASE_URL is not a valid HTTP(S) URL',
    };
  }

  return { url, anonKey, error: null };
}
