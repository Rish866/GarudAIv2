// Compatibility adapter between legacy module field names and the canonical
// PostgreSQL schema. Keep translations centralized so every useModuleData
// consumer reads and writes the same shape.

type Row = Record<string, unknown>;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TABLE_ALIASES: Record<string, string> = {
  maintenance: 'maintenance_records',
};

const ARCHIVE_STATUS: Record<string, string> = {
  vehicles: 'inactive',
  vendors: 'inactive',
  contracts: 'terminated',
};

const IMMUTABLE_DELETE_TABLES = new Set([
  'activity_log',
  'attendance',
  'bank_entries',
  'cash_entries',
  'challans',
  'fuel_entries',
  'ledger_accounts',
  'notifications',
  'payments',
  'purchases',
  'sales',
]);

export function resolveTableName(tableName: string): string {
  return TABLE_ALIASES[tableName] || tableName;
}

export function archiveStatusForTable(tableName: string): string | null {
  return ARCHIVE_STATUS[resolveTableName(tableName)] || null;
}

export function shouldHideArchivedRecord(tableName: string, row: Row): boolean {
  const archiveStatus = archiveStatusForTable(tableName);
  return archiveStatus !== null && row.status === archiveStatus;
}

export function immutableDeleteMessage(tableName: string): string | null {
  return IMMUTABLE_DELETE_TABLES.has(resolveTableName(tableName))
    ? 'This record is protected for audit/history. Use reversal, cancellation, or status change instead of permanent deletion.'
    : null;
}

function rename(row: Row, from: string, to: string): void {
  if (!(from in row)) return;
  if (!(to in row)) row[to] = row[from];
  delete row[from];
}

function omit(row: Row, ...columns: string[]): void {
  columns.forEach(column => delete row[column]);
}

export function toDatabaseRecord(tableName: string, input: Row): Row {
  const row = { ...input };

  switch (resolveTableName(tableName)) {
    case 'challans':
      rename(row, 'violation_type', 'offence');
      rename(row, 'fine_amount', 'amount');
      if (row.payment_status === 'pending') row.payment_status = 'unpaid';
      break;

    case 'eway_bills':
      rename(row, 'ewb_number', 'eway_number');
      rename(row, 'origin', 'from_place');
      rename(row, 'destination', 'to_place');
      // These legacy display/calculation fields do not exist in the canonical
      // e-way bill table. Core identifiers and validity data remain persisted.
      omit(row, 'lr_number', 'customer_name', 'hsn_code', 'goods_description',
        'goods_value', 'cgst', 'sgst', 'igst', 'total_value', 'part_b_updated');
      if (typeof row.transporter_id !== 'string' || !UUID_PATTERN.test(row.transporter_id)) {
        row.transporter_id = null;
      }
      break;

    case 'geofences':
      rename(row, 'radius', 'radius_meters');
      omit(row, 'alerts_count');
      break;

    case 'purchases':
    case 'sales':
      omit(row, 'status');
      break;

    case 'trips':
      rename(row, 'pod_details', 'pod_remarks');
      break;

    case 'tyres':
      rename(row, 'make', 'brand');
      rename(row, 'km_run', 'current_odometer');
      if (row.status === 'active') row.status = 'fitted';
      if (row.status === 'retreaded') row.status = 'retreading';
      // Purchase accounting fields are not part of the canonical tyre table.
      omit(row, 'purchase_date', 'cost');
      break;

    case 'work_orders':
      rename(row, 'job_type', 'type');
      rename(row, 'assigned_mechanic', 'assigned_to');
      rename(row, 'actual_completion', 'completed_at');
      omit(row, 'start_date', 'expected_completion', 'parts_used');
      break;
  }

  return row;
}

export function fromDatabaseRecord(tableName: string, input: Row): Row {
  const row = { ...input };

  switch (resolveTableName(tableName)) {
    case 'challans':
      row.violation_type = row.offence;
      row.fine_amount = row.amount;
      if (row.payment_status === 'unpaid') row.payment_status = 'pending';
      break;

    case 'eway_bills':
      row.ewb_number = row.eway_number;
      row.origin = row.from_place;
      row.destination = row.to_place;
      row.lr_number ??= '';
      row.customer_name ??= '';
      row.hsn_code ??= '';
      row.goods_description ??= '';
      row.goods_value ??= 0;
      row.cgst ??= 0;
      row.sgst ??= 0;
      row.igst ??= 0;
      row.total_value ??= 0;
      row.part_b_updated ??= false;
      break;

    case 'geofences':
      row.radius = row.radius_meters;
      row.alerts_count ??= 0;
      break;

    case 'purchases':
      row.status ??= row.type === 'credit' ? 'pending' : 'paid';
      break;

    case 'sales':
      row.status ??= row.type === 'credit' ? 'pending' : 'received';
      break;

    case 'trips':
      row.pod_details = row.pod_remarks;
      break;

    case 'tyres':
      row.make = row.brand;
      row.km_run = row.current_odometer;
      if (row.status === 'fitted') row.status = 'active';
      if (row.status === 'retreading') row.status = 'retreaded';
      row.purchase_date ??= row.created_at;
      row.cost ??= 0;
      break;

    case 'work_orders':
      row.job_type = row.type;
      row.assigned_mechanic = row.assigned_to;
      row.actual_completion = row.completed_at;
      row.start_date ??= row.created_at;
      row.expected_completion ??= '';
      row.parts_used ??= '';
      break;
  }

  return row;
}
