/**
 * Inventory-Driven UUID Sanitization for Migration 004
 *
 * ONLY the 22 approved nullable UUID reference columns are sanitized.
 * Unrelated TEXT fields (names, descriptions, status, etc.) remain unchanged.
 *
 * After Migration 004 converts these columns from TEXT to UUID, PostgreSQL
 * rejects empty strings as invalid UUID. This sanitizer converts '' and
 * whitespace-only strings to null ONLY for the listed fields.
 *
 * Validation (requirement 4): Every present affected value is validated.
 * Invalid strings, numbers, booleans, arrays, and objects are rejected
 * with a structured error rather than an unexpected promise rejection.
 */

/**
 * Structured error returned by sanitization failures.
 * Method contracts: sanitizer failures return/set these rather than throwing.
 */
export interface SanitizationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface SanitizationResult<T> {
  data: T | null;
  errors: SanitizationError[];
}


/**
 * Canonical inventory of nullable UUID reference columns per table.
 * These are the 22 TEXT→UUID conversions approved in Migration 004.
 * Each key is a table name; value is the set of column names being converted.
 */
export const UUID_REFERENCE_COLUMNS: Record<string, Set<string>> = {
  drivers: new Set(['assigned_vehicle_id']),
  enquiries: new Set(['customer_id']),
  eway_bills: new Set(['transporter_id', 'trip_id']),
  expenses: new Set(['trip_id', 'vehicle_id']),
  fuel_entries: new Set(['vehicle_id', 'driver_id', 'trip_id']),
  invoices: new Set(['customer_id']),
  maintenance_records: new Set(['vehicle_id']),
  payments: new Set(['customer_id', 'invoice_id']),
  quotations: new Set(['enquiry_id', 'customer_id']),
  trips: new Set(['customer_id', 'vehicle_id', 'driver_id', 'quotation_id', 'enquiry_id']),
  tyres: new Set(['vehicle_id']),
  vehicles: new Set(['driver_id']),
};

/**
 * All 22 column names that are UUID references (for table-agnostic sanitization).
 * Used when the table name is not known at the call site.
 */
export const ALL_UUID_COLUMNS: Set<string> = new Set(
  Object.values(UUID_REFERENCE_COLUMNS).flatMap(s => [...s])
);

/**
 * UUID validation regex (case-insensitive, accepts PostgreSQL-valid format).
 */
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;


/**
 * Validate that a value is null, undefined, empty (will be sanitized), or a valid UUID.
 * Returns an error message if invalid, or null if valid.
 *
 * Rejects: non-string types (numbers, booleans, arrays, objects), invalid UUID strings.
 */
export function validateUuidField(fieldName: string, value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return `${fieldName}: expected string or null, got number (${value})`;
  if (typeof value === 'boolean') return `${fieldName}: expected string or null, got boolean (${value})`;
  if (Array.isArray(value)) return `${fieldName}: expected string or null, got array`;
  if (typeof value === 'object') return `${fieldName}: expected string or null, got object`;
  if (typeof value !== 'string') return `${fieldName}: expected string or null, got ${typeof value}`;
  if (value.trim() === '') return null; // Will be sanitized to null
  if (!UUID_REGEX.test(value)) return `${fieldName}: invalid UUID format '${value}'`;
  return null;
}


/**
 * Sanitize a record for a SPECIFIC table — structured error variant.
 * Returns { data, errors } instead of throwing, preserving method contracts.
 *
 * Validates every present affected value. Rejects invalid strings, numbers,
 * booleans, arrays, and objects before calling Supabase.
 */
export function sanitizeForTableSafe<T extends Record<string, unknown>>(
  tableName: string,
  record: T
): SanitizationResult<T> {
  const uuidCols = UUID_REFERENCE_COLUMNS[tableName];
  if (!uuidCols || uuidCols.size === 0) return { data: record, errors: [] };

  const errors: SanitizationError[] = [];
  const sanitized = { ...record };

  for (const col of uuidCols) {
    if (!(col in sanitized)) continue;
    const value = sanitized[col];

    const err = validateUuidField(col, value);
    if (err) {
      errors.push({ field: col, message: err, value });
      continue;
    }

    // Sanitize empty/whitespace strings to null
    if (typeof value === 'string' && value.trim() === '') {
      (sanitized as Record<string, unknown>)[col] = null;
    }
  }

  if (errors.length > 0) return { data: null, errors };
  return { data: sanitized, errors: [] };
}


/**
 * Sanitize a record for a SPECIFIC table (throwing variant, backward-compatible).
 * Only converts empty/whitespace strings to null for the 22 approved UUID columns.
 * All other fields pass through unchanged.
 *
 * Also validates UUID format AND type for affected columns — throws if invalid.
 * Rejects: non-string types (numbers, booleans, arrays, objects), invalid UUID strings.
 *
 * @param tableName - The target table (must be in UUID_REFERENCE_COLUMNS)
 * @param record - The insert/update payload
 * @returns Sanitized record (shallow copy)
 * @throws Error if a UUID column contains an invalid value
 */
export function sanitizeForTable<T extends Record<string, unknown>>(
  tableName: string,
  record: T
): T {
  const uuidCols = UUID_REFERENCE_COLUMNS[tableName];
  if (!uuidCols || uuidCols.size === 0) return record; // No UUID columns to sanitize

  const sanitized = { ...record };
  for (const col of uuidCols) {
    if (!(col in sanitized)) continue;
    const value = sanitized[col];

    // Validate type and format for every present affected value
    const err = validateUuidField(col, value);
    if (err) throw new Error(`sanitizeForTable(${tableName}): ${err}`);

    // Sanitize empty/whitespace strings to null
    if (typeof value === 'string' && value.trim() === '') {
      (sanitized as Record<string, unknown>)[col] = null;
    }
  }
  return sanitized;
}


/**
 * Table-agnostic sanitization — for use when table name is passed separately.
 * Applies the same logic using the ALL_UUID_COLUMNS set.
 *
 * Use sanitizeForTable() when the table name is known (preferred).
 */
export function sanitizeUuidFields<T extends Record<string, unknown>>(record: T): T {
  const sanitized = { ...record };
  for (const col of ALL_UUID_COLUMNS) {
    if (!(col in sanitized)) continue;
    const value = sanitized[col];

    const err = validateUuidField(col, value);
    if (err) throw new Error(`sanitizeUuidFields: ${err}`);

    if (typeof value === 'string' && value.trim() === '') {
      (sanitized as Record<string, unknown>)[col] = null;
    }
  }
  return sanitized;
}
