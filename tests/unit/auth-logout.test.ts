// Tests for P0 Fix: Logout, Auth Restoration, and Role Resolution
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase before importing auth module
vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: vi.fn().mockResolvedValue({ error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      signInWithPassword: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
  supabaseConfigurationError: null,
}));

describe('performLogout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('calls supabase.auth.signOut()', async () => {
    const { performLogout } = await import('../../src/lib/auth');
    const { supabase } = await import('../../src/lib/supabase');

    await performLogout();

    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
  });

  it('clears branch selection from localStorage', async () => {
    localStorage.setItem('garud_selected_branch', 'branch-123');
    const { performLogout } = await import('../../src/lib/auth');

    await performLogout();

    expect(localStorage.getItem('garud_selected_branch')).toBeNull();
  });

  it('returns success even if signOut API fails (graceful degradation)', async () => {
    const { supabase } = await import('../../src/lib/supabase');
    (supabase.auth.signOut as any).mockResolvedValueOnce({ error: { message: 'Network error' } });

    const { performLogout } = await import('../../src/lib/auth');
    const result = await performLogout();

    expect(result.success).toBe(true);
    // Local state is still cleared even on API failure
    expect(localStorage.getItem('garud_selected_branch')).toBeNull();
  });

  it('handles exception in signOut gracefully', async () => {
    const { supabase } = await import('../../src/lib/supabase');
    (supabase.auth.signOut as any).mockRejectedValueOnce(new Error('Network unreachable'));

    const { performLogout } = await import('../../src/lib/auth');
    const result = await performLogout();

    // Should still succeed (local state cleared)
    expect(result.success).toBe(true);
  });
});

describe('resolveUserRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when no session exists', async () => {
    const { resolveUserRole } = await import('../../src/lib/auth');
    const result = await resolveUserRole();

    expect(result.success).toBe(false);
    expect(result.error).toContain('No authenticated session');
  });

  it('returns error when user has no active membership', async () => {
    const { supabase } = await import('../../src/lib/supabase');
    (supabase.auth.getSession as any).mockResolvedValueOnce({
      data: { session: { user: { id: 'user-1' } } },
    });
    (supabase.from as any).mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    const { resolveUserRole } = await import('../../src/lib/auth');
    const result = await resolveUserRole();

    expect(result.success).toBe(false);
    expect(result.error).toContain('No active organization membership');
  });
});

describe('signIn', () => {
  it('returns user data on successful login', async () => {
    const { supabase } = await import('../../src/lib/supabase');
    (supabase.auth.signInWithPassword as any).mockResolvedValueOnce({
      data: {
        user: {
          id: 'user-123',
          email: 'test@test.com',
          user_metadata: { name: 'Test User' },
        },
      },
      error: null,
    });

    const { signIn } = await import('../../src/lib/auth');
    const result = await signIn('test@test.com', 'password');

    expect(result.success).toBe(true);
    expect(result.user?.email).toBe('test@test.com');
    expect(result.user?.name).toBe('Test User');
  });

  it('returns error on invalid credentials', async () => {
    const { supabase } = await import('../../src/lib/supabase');
    (supabase.auth.signInWithPassword as any).mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    });

    const { signIn } = await import('../../src/lib/auth');
    const result = await signIn('test@test.com', 'wrong');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid email or password');
  });
});
