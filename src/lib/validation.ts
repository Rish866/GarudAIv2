export interface ValidationError {
  field: string;
  message: string;
}

export function validateRequired(value: string | number | undefined | null, fieldName: string): ValidationError | null {
  if (value === undefined || value === null || value === '' || (typeof value === 'number' && isNaN(value))) {
    return { field: fieldName, message: `${fieldName} is required` };
  }
  return null;
}

export function validateEmail(email: string): ValidationError | null {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(email)) {
    return { field: 'email', message: 'Invalid email address' };
  }
  return null;
}

export function validatePhone(phone: string): ValidationError | null {
  const cleaned = phone.replace(/[\s\-\+]/g, '');
  if (cleaned.length < 10) {
    return { field: 'phone', message: 'Phone number must be at least 10 digits' };
  }
  return null;
}

export function validateGSTIN(gstin: string): ValidationError | null {
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (gstin && !regex.test(gstin)) {
    return { field: 'gstin', message: 'Invalid GSTIN format' };
  }
  return null;
}

export function validatePositiveNumber(value: number, fieldName: string): ValidationError | null {
  if (value <= 0) {
    return { field: fieldName, message: `${fieldName} must be greater than 0` };
  }
  return null;
}

export function validateDate(dateStr: string, fieldName: string): ValidationError | null {
  if (!dateStr) {
    return { field: fieldName, message: `${fieldName} is required` };
  }
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return { field: fieldName, message: `Invalid ${fieldName}` };
  }
  return null;
}

export function validateFutureDate(dateStr: string, fieldName: string): ValidationError | null {
  const date = new Date(dateStr);
  if (date <= new Date()) {
    return { field: fieldName, message: `${fieldName} must be in the future` };
  }
  return null;
}

/**
 * Run multiple validations and return all errors
 */
export function validate(validations: (ValidationError | null)[]): ValidationError[] {
  return validations.filter((v): v is ValidationError => v !== null);
}
