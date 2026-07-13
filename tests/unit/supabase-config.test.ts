import { describe, expect, it } from 'vitest';
import { resolveSupabaseConfig } from '../../src/lib/supabaseConfig';

describe('resolveSupabaseConfig', () => {
  it('uses the configured staging endpoint and key', () => {
    const result = resolveSupabaseConfig(
      'https://staging-project.supabase.co',
      'staging-publishable-key',
    );

    expect(result).toEqual({
      url: 'https://staging-project.supabase.co',
      anonKey: 'staging-publishable-key',
      error: null,
    });
  });

  it('fails closed when both required variables are missing', () => {
    const result = resolveSupabaseConfig(undefined, undefined);

    expect(result.error).toContain('VITE_SUPABASE_URL');
    expect(result.error).toContain('VITE_SUPABASE_ANON_KEY');
    expect(result.url).toBe('http://127.0.0.1:1');
    expect(result.url).not.toContain('supabase.co');
  });

  it('fails closed when the configured URL is invalid', () => {
    const result = resolveSupabaseConfig('not-a-url', 'publishable-key');

    expect(result.error).toBe('VITE_SUPABASE_URL is not a valid HTTP(S) URL');
    expect(result.url).toBe('http://127.0.0.1:1');
  });
});
