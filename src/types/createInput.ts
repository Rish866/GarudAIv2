// ============================================================
// CreateInput<T> — Type utility for Supabase insert payloads
//
// When creating a record, the client should NOT provide:
// - id (Postgres generates UUID via gen_random_uuid())
// - created_at (database default NOW())
// - updated_at (database default NOW())
// - organization_id (injected by useModuleData from OrganizationContext)
//
// Usage:
//   type CreateVehicleInput = CreateInput<Vehicle>;
//   const payload: CreateVehicleInput = { reg_number: 'MH12AB1234', ... };
//   await create(payload);  // useModuleData handles org_id and lets Postgres set id
// ============================================================

/**
 * Omits database-generated fields from a record type for insert payloads.
 * The resulting type represents what the client should provide.
 */
export type CreateInput<T> = Omit<T, 'id' | 'created_at' | 'updated_at' | 'organization_id'>;

/**
 * Similar to CreateInput but also omits branch_id when the branch
 * is automatically resolved from the user's context.
 */
export type CreateInputWithoutBranch<T> = Omit<T, 'id' | 'created_at' | 'updated_at' | 'organization_id' | 'branch_id'>;

/**
 * For update operations — only the mutable fields, all optional.
 * Prevents accidental mutation of id, organization_id, or created_at.
 */
export type UpdateInput<T> = Partial<Omit<T, 'id' | 'created_at' | 'organization_id'>>;
