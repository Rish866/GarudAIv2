# Portal Security Requirements

## Current State (PR #14)

### What IS enforced:
1. **Module visibility**: Customer/Vendor/Driver roles only see permitted sidebar modules
2. **Action-level denial**: `useModuleData.create/update/remove` refuses operations without the correct permission
3. **Organization isolation**: All queries include `organization_id` filter; RLS migration enforces this at DB level
4. **Branch isolation**: Branch-scoped tables filtered by assigned branches; RLS migration enforces this

### What is NOT yet enforced (requires schema migration):

#### Customer Portal — Row-level restriction
- **Current**: A customer user can read ALL trips/invoices in their organization
- **Required**: Customers should ONLY see records where `customer_id` matches their linked customer profile
- **Blocker**: No `customer_user_id` foreign key exists on trips/invoices linking a Supabase auth user to a customer record
- **Solution**: Add `customer_user_id UUID REFERENCES auth.users(id)` to the `customers` table, then add RLS policy:
  ```sql
  CREATE POLICY "customer_row_restriction" ON trips FOR SELECT
  USING (
    CASE get_user_role()
      WHEN 'customer' THEN customer_id IN (
        SELECT id FROM customers WHERE customer_user_id = auth.uid()
      )
      ELSE organization_id = get_user_organization_id()
    END
  );
  ```

#### Vendor Portal — Row-level restriction
- **Current**: A vendor user can read ALL market hires in their organization
- **Required**: Vendors should ONLY see their own placements, invoices, and payments
- **Blocker**: No `vendor_user_id` FK exists on the `vendors` table
- **Solution**: Similar to customer — add `vendor_user_id` FK and conditional RLS

#### Driver Portal — Row-level restriction
- **Current**: A driver user can read ALL trips in their organization
- **Required**: Drivers should ONLY see trips where `driver_id` matches their linked driver profile
- **Blocker**: No `driver_user_id` FK exists on the `drivers` table
- **Solution**: Add `driver_user_id UUID REFERENCES auth.users(id)` to drivers table, then conditional RLS

### Vendor revenue/margin isolation
- Vendors must NEVER see: customer freight amount, internal markup, trip profitability
- Currently enforced by: vendor role has no `finance.read` or `invoices.read` permission
- The vendor portal module (`VendorPortalModule.tsx`) only shows vendor-facing data

## Priority
- Organization + Branch isolation: **DONE** (P0)
- Customer/Vendor/Driver row restrictions: **P1** (requires DB schema change)
- The portal roles are SAFE to use now because they have minimal read-only permissions
- Write operations are blocked by handler-level permission enforcement
