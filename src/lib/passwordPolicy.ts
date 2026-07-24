// ============================================================
// PASSWORD POLICY — Enforced at signup and password change
//
// Requirements:
// - Minimum 8 characters
// - At least one uppercase letter
// - At least one lowercase letter
// - At least one number
// - At least one special character
// - No common passwords
// - Cannot be the same as email prefix
// ============================================================

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  strength: 'weak' | 'fair' | 'good' | 'strong';
}

const COMMON_PASSWORDS = new Set([
  'password', 'password1', '12345678', '123456789', '1234567890',
  'qwerty123', 'admin123', 'welcome1', 'letmein1', 'transport',
  'logistics', 'fleet123', 'garudai1', 'company1', 'test1234',
  'password123', 'abcd1234', 'qwerty12', 'iloveyou', 'sunshine',
]);

/**
 * Validate a password against the security policy.
 * Returns structured result with specific errors and strength rating.
 */
export function validatePassword(password: string, email?: string): PasswordValidationResult {
  const errors: string[] = [];

  // Length check
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (password.length > 72) {
    errors.push('Password cannot exceed 72 characters');
  }

  // Complexity checks
  if (!/[A-Z]/.test(password)) {
    errors.push('Must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Must contain at least one number');
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"|,.<>/?~`]/.test(password)) {
    errors.push('Must contain at least one special character (!@#$%^&*...)');
  }

  // Common password check
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push('This password is too common. Please choose a stronger one');
  }

  // Email similarity check
  if (email) {
    const emailPrefix = email.split('@')[0].toLowerCase();
    if (emailPrefix.length >= 4 && password.toLowerCase().includes(emailPrefix)) {
      errors.push('Password cannot contain your email address');
    }
  }

  // Repeated characters check
  if (/(.)\1{3,}/.test(password)) {
    errors.push('Cannot contain 4 or more repeated characters');
  }

  // Calculate strength
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=[\]{};':"|,.<>/?~`]/.test(password)) score++;
  if (password.length >= 16) score++;

  let strength: PasswordValidationResult['strength'];
  if (score <= 2) strength = 'weak';
  else if (score <= 3) strength = 'fair';
  else if (score <= 4) strength = 'good';
  else strength = 'strong';

  return {
    valid: errors.length === 0,
    errors,
    strength,
  };
}

/**
 * Get a user-friendly strength label with color
 */
export function getStrengthDisplay(strength: PasswordValidationResult['strength']): {
  label: string;
  color: string;
  percent: number;
} {
  switch (strength) {
    case 'weak': return { label: 'Weak', color: '#ef4444', percent: 25 };
    case 'fair': return { label: 'Fair', color: '#f59e0b', percent: 50 };
    case 'good': return { label: 'Good', color: '#22c55e', percent: 75 };
    case 'strong': return { label: 'Strong', color: '#06b6d4', percent: 100 };
  }
}
