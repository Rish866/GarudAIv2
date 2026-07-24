// ============================================================
// FormField — Consistent form field with label, error, and required indicator
//
// Usage:
//   <FormField label="Vehicle Number" required error={errors.reg_number}>
//     <input value={form.reg_number} onChange={...} />
//   </FormField>
// ============================================================

import React from 'react';

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

export default function FormField({
  label,
  required,
  error,
  hint,
  children,
  className = '',
}: FormFieldProps) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium mb-1" style={{ color: error ? '#dc2626' : 'var(--text-secondary)' }}>
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs text-red-600 mt-1 animate-slide-in">{error}</p>
      )}
      {hint && !error && (
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{hint}</p>
      )}
    </div>
  );
}
