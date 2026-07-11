import { createRepository } from '../baseRepository';
import type { Customer } from '../../types';

const base = createRepository<Customer>('customers');

export const customerRepository = {
  ...base,

  async block(organizationId: string, customerId: string) {
    return base.update(organizationId, customerId, { status: 'blocked' } as any);
  },

  async unblock(organizationId: string, customerId: string) {
    return base.update(organizationId, customerId, { status: 'active' } as any);
  },

  async updateCreditLimit(organizationId: string, customerId: string, creditLimit: number) {
    return base.update(organizationId, customerId, { credit_limit: creditLimit } as any);
  },

  async assignBranch(organizationId: string, customerId: string, branchId: string) {
    return base.update(organizationId, customerId, { branch_id: branchId } as any);
  },
};
