import { useState } from 'react';
import { useModuleData } from '../../../hooks/useModuleData';
import { usePaginatedData } from '../../../hooks/usePaginatedData';
import type { PaginationFilter } from '../../../hooks/usePaginatedData';
import Pagination from '../../ui/Pagination';
import { useStore } from '../../../store/useStore';
import { formatCurrency, formatDate, classNames } from '../../../lib/utils';
import { Wrench, Clock, CheckCircle2, IndianRupee, Plus, X, Filter } from 'lucide-react';

type JobType = 'preventive' | 'repair' | 'breakdown' | 'inspection' | 'body_work';
type Priority = 'low' | 'medium' | 'high' | 'urgent';
type WOStatus = 'open' | 'in_progress' | 'parts_waiting' | 'completed' | 'cancelled';

interface WorkOrder {
  id: string;
  work_order_number: string;
  vehicle_reg: string;
  job_type: JobType;
  description: string;
  assigned_mechanic: string;
  priority: Priority;
  estimated_cost: number;
  actual_cost: number | null;
  start_date: string;
  expected_completion: string;
  actual_completion: string | null;
  status: WOStatus;
  parts_used: string;
}

const JOB_TYPE_LABELS: Record<JobType, string> = {
  preventive: 'Preventive',
  repair: 'Repair',
  breakdown: 'Breakdown',
  inspection: 'Inspection',
  body_work: 'Body Work',
};

const JOB_TYPE_COLORS: Record<JobType, string> = {
  preventive: 'bg-blue-100 text-blue-800',
  repair: 'bg-orange-100 text-orange-800',
  breakdown: 'bg-red-100 text-red-800',
  inspection: 'bg-teal-100 text-teal-800',
  body_work: 'bg-purple-100 text-purple-800',
};

const PRIORITY_STYLES: Record<Priority, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
  urgent: 'bg-red-100 text-red-800 animate-pulse',
};

const STATUS_LABELS: Record<WOStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  parts_waiting: 'Parts Waiting',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<WOStatus, string> = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  parts_waiting: 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-slate-100 text-slate-600',
};


export default function WorkOrderModule() {
  const { data: vehicles } = useModuleData<any>('vehicles');
  const {
    data: workOrders,
    totalCount,
    totalPages,
    page,
    pageSize,
    setPage,
    setPageSize,
    setFilters,
    loading: workOrdersLoading,
    refresh: refreshWorkOrders,
    hasNextPage,
    hasPrevPage,
  } = usePaginatedData<WorkOrder>('work_orders', { defaultSort: 'created_at', defaultSortDirection: 'desc' });
  const { create: createWorkOrder, remove: removeWorkOrder } = useModuleData<WorkOrder>('work_orders', { fetchOnMount: false });
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | WOStatus>('all');

  const handleStatusFilter = (status: 'all' | WOStatus) => {
    setStatusFilter(status);
    const filters: PaginationFilter = {};
    if (status !== 'all') filters.eq = { status };
    setFilters(filters);
  };

  const [form, setForm] = useState({
    vehicle_reg: '',
    job_type: 'preventive' as JobType,
    description: '',
    assigned_mechanic: '',
    priority: 'medium' as Priority,
    estimated_cost: 0,
    start_date: new Date().toISOString().split('T')[0],
    expected_completion: '',
  });

  // Filtered work orders — server-side via usePaginatedData
  const filteredOrders = workOrders;

  // Summary calculations
  const openOrders = workOrders.filter((wo) => wo.status === 'open').length;
  const inProgressOrders = workOrders.filter((wo) => wo.status === 'in_progress').length;
  const completedThisMonth = workOrders.filter((wo) => {
    if (wo.status !== 'completed' || !wo.actual_completion) return false;
    const completionDate = new Date(wo.actual_completion);
    const now = new Date();
    return completionDate.getMonth() === now.getMonth() && completionDate.getFullYear() === now.getFullYear();
  }).length;
  const totalCost = workOrders.reduce((sum, wo) => sum + (wo.actual_cost ?? wo.estimated_cost), 0);

  const handleSubmit = () => {
    if (!form.vehicle_reg || !form.description || !form.assigned_mechanic) return;
    const orderNum = `WO-2025-${String(workOrders.length + 1).padStart(3, '0')}`;
    const newOrder: WorkOrder = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 9),
      work_order_number: orderNum,
      vehicle_reg: form.vehicle_reg,
      job_type: form.job_type,
      description: form.description,
      assigned_mechanic: form.assigned_mechanic,
      priority: form.priority,
      estimated_cost: form.estimated_cost,
      actual_cost: null,
      start_date: form.start_date,
      expected_completion: form.expected_completion,
      actual_completion: null,
      status: 'open',
      parts_used: '',
    };
    createWorkOrder(newOrder);
    setShowModal(false);
    setForm({
      vehicle_reg: '',
      job_type: 'preventive',
      description: '',
      assigned_mechanic: '',
      priority: 'medium',
      estimated_cost: 0,
      start_date: new Date().toISOString().split('T')[0],
      expected_completion: '',
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Work Orders</h2>
          <p className="text-sm text-slate-500 mt-1">Assign, track and complete maintenance jobs</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg shadow hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Create Work Order
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Wrench size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Open Work Orders</p>
              <p className="text-2xl font-bold text-blue-600 mt-0.5">{openOrders}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-50 rounded-lg">
              <Clock size={20} className="text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">In Progress</p>
              <p className="text-2xl font-bold text-yellow-600 mt-0.5">{inProgressOrders}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle2 size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Completed (This Month)</p>
              <p className="text-2xl font-bold text-green-600 mt-0.5">{completedThisMonth}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg">
              <IndianRupee size={20} className="text-slate-700" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Cost</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{formatCurrency(totalCost)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={16} className="text-slate-400" />
        {(['all', 'open', 'in_progress', 'parts_waiting', 'completed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => handleStatusFilter(f)}
            className={classNames(
              'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
              statusFilter === f ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            {f === 'all' ? 'All' : STATUS_LABELS[f]}
          </button>
        ))}
      </div>

      {/* Work Order Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredOrders.map((wo) => (
          <div key={wo.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
            {/* Card Header */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-mono text-sm font-semibold text-slate-900">{wo.work_order_number}</p>
                <p className="text-sm font-bold text-slate-800 mt-1">{wo.vehicle_reg}</p>
              </div>
              <span className={classNames('px-2.5 py-1 rounded-full text-xs font-medium', PRIORITY_STYLES[wo.priority])}>
                {wo.priority.charAt(0).toUpperCase() + wo.priority.slice(1)}
              </span>
            </div>

            {/* Job Type & Status */}
            <div className="flex items-center gap-2 mb-3">
              <span className={classNames('px-2 py-0.5 rounded text-xs font-medium', JOB_TYPE_COLORS[wo.job_type])}>
                {JOB_TYPE_LABELS[wo.job_type]}
              </span>
              <span className={classNames('px-2 py-0.5 rounded text-xs font-medium', STATUS_COLORS[wo.status])}>
                {STATUS_LABELS[wo.status]}
              </span>
            </div>

            {/* Description */}
            <p className="text-sm text-slate-600 mb-3 line-clamp-2">{wo.description}</p>

            {/* Mechanic */}
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
              <Wrench size={14} />
              <span>{wo.assigned_mechanic}</span>
            </div>

            {/* Dates */}
            <div className="text-xs text-slate-500 space-y-1 mb-3">
              <div className="flex justify-between">
                <span>Start: {formatDate(wo.start_date)}</span>
                <span>Due: {formatDate(wo.expected_completion)}</span>
              </div>
              {wo.actual_completion && (
                <div className="text-green-600 font-medium">Completed: {formatDate(wo.actual_completion)}</div>
              )}
            </div>

            {/* Cost */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div className="text-sm">
                <span className="text-slate-500">Est: </span>
                <span className="font-semibold text-slate-800">{formatCurrency(wo.estimated_cost)}</span>
              </div>
              {wo.actual_cost !== null && (
                <div className="text-sm">
                  <span className="text-slate-500">Actual: </span>
                  <span className="font-semibold text-green-700">{formatCurrency(wo.actual_cost)}</span>
                </div>
              )}
            </div>

            {/* Parts */}
            {wo.parts_used && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-500 font-medium mb-1">Parts Used:</p>
                <p className="text-xs text-slate-600">{wo.parts_used}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredOrders.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <Wrench size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm">No work orders found for this filter</p>
        </div>
      )}

      {/* Create Work Order Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-slate-900">Create Work Order</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle</label>
                  <select
                    value={form.vehicle_reg}
                    onChange={(e) => setForm({ ...form, vehicle_reg: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select vehicle</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.reg_number}>
                        {v.reg_number}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Job Type</label>
                  <select
                    value={form.job_type}
                    onChange={(e) => setForm({ ...form, job_type: e.target.value as JobType })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {Object.entries(JOB_TYPE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="Describe the maintenance job..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Assigned Mechanic</label>
                  <input
                    type="text"
                    value={form.assigned_mechanic}
                    onChange={(e) => setForm({ ...form, assigned_mechanic: e.target.value })}
                    placeholder="Mechanic name"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Estimated Cost</label>
                <input
                  type="number"
                  value={form.estimated_cost || ''}
                  onChange={(e) => setForm({ ...form, estimated_cost: Number(e.target.value) })}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Expected Completion</label>
                  <input
                    type="date"
                    value={form.expected_completion}
                    onChange={(e) => setForm({ ...form, expected_completion: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Work Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
