import { generateId } from '../store/useStore';

export interface AuditEntry {
  id: string;
  timestamp: string;
  user_name: string;
  action: 'create' | 'update' | 'delete' | 'status_change' | 'login' | 'export';
  entity_type: string;
  entity_id: string;
  description: string;
  old_value?: string;
  new_value?: string;
}

// In-memory audit log (persisted via localStorage)
const STORAGE_KEY = 'garud_audit_log';

function getAuditLog(): AuditEntry[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveAuditLog(entries: AuditEntry[]) {
  // Keep last 500 entries
  const trimmed = entries.slice(0, 500);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function logAudit(
  user_name: string,
  action: AuditEntry['action'],
  entity_type: string,
  entity_id: string,
  description: string,
  old_value?: string,
  new_value?: string
) {
  const entry: AuditEntry = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    user_name,
    action,
    entity_type,
    entity_id,
    description,
    old_value,
    new_value,
  };

  const log = getAuditLog();
  log.unshift(entry);
  saveAuditLog(log);
  
  return entry;
}

export function getRecentAuditEntries(limit: number = 50): AuditEntry[] {
  return getAuditLog().slice(0, limit);
}

export function getAuditEntriesForEntity(entityType: string, entityId: string): AuditEntry[] {
  return getAuditLog().filter(e => e.entity_type === entityType && e.entity_id === entityId);
}

export function clearAuditLog() {
  localStorage.removeItem(STORAGE_KEY);
}
