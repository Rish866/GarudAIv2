import React, { useState, useMemo } from 'react';
import { isDemoTenant } from '../../../lib/tenant';
import { useStore } from '../../../store/useStore';
import { formatDate, classNames } from '../../../lib/utils';
import { Calendar, Clock, UserCheck, UserX, Plus, X, Download, Filter } from 'lucide-react';

type AttendanceStatus = 'present' | 'absent' | 'half_day' | 'on_leave' | 'on_trip';
type LeaveType = 'casual' | 'sick' | 'earned' | 'unpaid';
type LeaveStatus = 'pending' | 'approved' | 'rejected';

interface AttendanceRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  date: string;
  status: AttendanceStatus;
  check_in?: string;
  check_out?: string;
  remarks?: string;
}

interface LeaveRequest {
  id: string;
  employee_id: string;
  employee_name: string;
  leave_type: LeaveType;
  from_date: string;
  to_date: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  applied_on: string;
}


const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

const today = new Date().toISOString().split('T')[0];

const seedAttendance: AttendanceRecord[] = [
  { id: 'att_001', employee_id: 'drv_001', employee_name: 'Suresh Kumar', date: today, status: 'on_trip', check_in: '06:00', remarks: 'On trip TRP-2025-0142' },
  { id: 'att_002', employee_id: 'drv_002', employee_name: 'Ramesh Yadav', date: today, status: 'on_trip', check_in: '05:30', remarks: 'On trip TRP-2025-0141' },
  { id: 'att_003', employee_id: 'drv_003', employee_name: 'Vikram Singh', date: today, status: 'present', check_in: '08:00', check_out: '' },
  { id: 'att_004', employee_id: 'drv_004', employee_name: 'Ajay Chauhan', date: today, status: 'on_trip', check_in: '04:00', remarks: 'On trip TRP-2025-0140' },
  { id: 'att_005', employee_id: 'drv_005', employee_name: 'Manoj Reddy', date: today, status: 'present', check_in: '07:30' },
  { id: 'att_006', employee_id: 'drv_006', employee_name: 'Dinesh Verma', date: today, status: 'absent', remarks: 'No show' },
  { id: 'att_007', employee_id: 'user_002', employee_name: 'Priya Mehta', date: today, status: 'present', check_in: '09:00' },
  { id: 'att_008', employee_id: 'user_003', employee_name: 'Amit Sharma', date: today, status: 'on_leave', remarks: 'Casual Leave' },
];

const seedLeaves: LeaveRequest[] = [
  { id: 'lv_001', employee_id: 'user_003', employee_name: 'Amit Sharma', leave_type: 'casual', from_date: '2025-07-09', to_date: '2025-07-10', days: 2, reason: 'Family function', status: 'approved', applied_on: '2025-07-07' },
  { id: 'lv_002', employee_id: 'drv_006', employee_name: 'Dinesh Verma', leave_type: 'sick', from_date: '2025-07-11', to_date: '2025-07-12', days: 2, reason: 'Fever', status: 'pending', applied_on: '2025-07-09' },
  { id: 'lv_003', employee_id: 'drv_003', employee_name: 'Vikram Singh', leave_type: 'earned', from_date: '2025-07-20', to_date: '2025-07-25', days: 6, reason: 'Annual vacation', status: 'pending', applied_on: '2025-07-08' },
  { id: 'lv_004', employee_id: 'drv_001', employee_name: 'Suresh Kumar', leave_type: 'casual', from_date: '2025-06-25', to_date: '2025-06-25', days: 1, reason: 'Personal work', status: 'approved', applied_on: '2025-06-23' },
];


type TabView = 'attendance' | 'leaves' | 'summary';

export default function AttendanceModule() {
  const { drivers } = useStore();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(isDemoTenant() ? seedAttendance : []);
  const [leaves, setLeaves] = useState<LeaveRequest[]>(isDemoTenant() ? seedLeaves : []);
  const [tab, setTab] = useState<TabView>('attendance');
  const [selectedDate, setSelectedDate] = useState(today);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    employee_id: '', leave_type: 'casual' as LeaveType, from_date: '', to_date: '', reason: '',
  });

  const todayAttendance = attendance.filter(a => a.date === selectedDate);
  const presentCount = todayAttendance.filter(a => a.status === 'present' || a.status === 'on_trip').length;
  const absentCount = todayAttendance.filter(a => a.status === 'absent').length;
  const onLeaveCount = todayAttendance.filter(a => a.status === 'on_leave').length;
  const onTripCount = todayAttendance.filter(a => a.status === 'on_trip').length;
  const pendingLeaves = leaves.filter(l => l.status === 'pending').length;

  const statusColors: Record<AttendanceStatus, string> = {
    present: 'bg-green-100 text-green-800',
    absent: 'bg-red-100 text-red-800',
    half_day: 'bg-yellow-100 text-yellow-800',
    on_leave: 'bg-purple-100 text-purple-800',
    on_trip: 'bg-blue-100 text-blue-800',
  };

  const leaveTypeColors: Record<LeaveType, string> = {
    casual: 'bg-blue-100 text-blue-800',
    sick: 'bg-red-100 text-red-800',
    earned: 'bg-green-100 text-green-800',
    unpaid: 'bg-gray-100 text-gray-800',
  };

  const markAttendance = (employeeId: string, name: string, status: AttendanceStatus) => {
    const existing = attendance.find(a => a.employee_id === employeeId && a.date === selectedDate);
    if (existing) {
      setAttendance(attendance.map(a => a.id === existing.id ? { ...a, status } : a));
    } else {
      setAttendance([...attendance, { id: 'att_' + generateId(), employee_id: employeeId, employee_name: name, date: selectedDate, status, check_in: new Date().toTimeString().slice(0, 5) }]);
    }
  };

  const handleLeaveSubmit = () => {
    if (!leaveForm.employee_id || !leaveForm.from_date || !leaveForm.to_date) return;
    const emp = drivers.find(d => d.id === leaveForm.employee_id);
    const from = new Date(leaveForm.from_date);
    const to = new Date(leaveForm.to_date);
    const days = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const newLeave: LeaveRequest = {
      id: 'lv_' + generateId(),
      employee_id: leaveForm.employee_id,
      employee_name: emp?.name || '',
      leave_type: leaveForm.leave_type,
      from_date: leaveForm.from_date,
      to_date: leaveForm.to_date,
      days,
      reason: leaveForm.reason,
      status: 'pending',
      applied_on: today,
    };
    setLeaves([newLeave, ...leaves]);
    setShowLeaveModal(false);
    setLeaveForm({ employee_id: '', leave_type: 'casual', from_date: '', to_date: '', reason: '' });
  };

  const approveLeave = (id: string) => setLeaves(leaves.map(l => l.id === id ? { ...l, status: 'approved' } : l));
  const rejectLeave = (id: string) => setLeaves(leaves.map(l => l.id === id ? { ...l, status: 'rejected' } : l));


  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Attendance & Leave</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Daily attendance, leave management & workforce availability</p>
        </div>
        <button onClick={() => setShowLeaveModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Apply Leave
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2"><UserCheck className="w-4 h-4 text-green-500" /><p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Present</p></div>
          <p className="text-xl font-bold mt-1 text-green-600">{presentCount}</p>
        </div>
        <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2"><UserX className="w-4 h-4 text-red-500" /><p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Absent</p></div>
          <p className="text-xl font-bold mt-1 text-red-600">{absentCount}</p>
        </div>
        <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>On Leave</p>
          <p className="text-xl font-bold mt-1 text-purple-600">{onLeaveCount}</p>
        </div>
        <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>On Trip</p>
          <p className="text-xl font-bold mt-1 text-blue-600">{onTripCount}</p>
        </div>
        <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Pending Leaves</p>
          <p className="text-xl font-bold mt-1 text-yellow-600">{pendingLeaves}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2" style={{ borderColor: 'var(--border-color)' }}>
        {(['attendance', 'leaves', 'summary'] as TabView[]).map(t => (
          <button key={t} onClick={() => setTab(t)} className={classNames('px-4 py-2 text-sm rounded-lg font-medium', tab === t ? 'bg-blue-600 text-white' : '')} style={tab !== t ? { color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)' } : undefined}>
            {t === 'attendance' ? 'Daily Attendance' : t === 'leaves' ? 'Leave Requests' : 'Monthly Summary'}
          </button>
        ))}
        {tab === 'attendance' && (
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="ml-auto px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
        )}
      </div>


      {/* Attendance Tab */}
      {tab === 'attendance' && (
        <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <table className="w-full">
            <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Employee</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Check In</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Check Out</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Remarks</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {todayAttendance.map(rec => (
                <tr key={rec.id} className="border-t" style={{ borderColor: 'var(--border-color)' }}>
                  <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{rec.employee_name}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{rec.check_in || '—'}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{rec.check_out || '—'}</td>
                  <td className="px-4 py-3"><span className={classNames('px-2 py-1 rounded-full text-xs font-medium', statusColors[rec.status])}>{rec.status.replace('_', ' ')}</span></td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>{rec.remarks || '—'}</td>
                  <td className="px-4 py-3">
                    <select value={rec.status} onChange={(e) => markAttendance(rec.employee_id, rec.employee_name, e.target.value as AttendanceStatus)} className="px-2 py-1 border rounded text-xs" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                      <option value="half_day">Half Day</option>
                      <option value="on_leave">On Leave</option>
                      <option value="on_trip">On Trip</option>
                    </select>
                  </td>
                </tr>
              ))}
              {todayAttendance.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>No attendance records for this date</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Leaves Tab */}
      {tab === 'leaves' && (
        <div className="space-y-3">
          {leaves.map(leave => (
            <div key={leave.id} className="rounded-2xl border p-4 flex items-center justify-between" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{leave.employee_name}</p>
                  <span className={classNames('px-2 py-0.5 rounded-full text-xs font-medium', leaveTypeColors[leave.leave_type])}>{leave.leave_type}</span>
                  <span className={classNames('px-2 py-0.5 rounded-full text-xs font-medium', leave.status === 'approved' ? 'bg-green-100 text-green-800' : leave.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800')}>{leave.status}</span>
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{formatDate(leave.from_date)} → {formatDate(leave.to_date)} ({leave.days} days) • {leave.reason}</p>
              </div>
              {leave.status === 'pending' && (
                <div className="flex gap-2">
                  <button onClick={() => approveLeave(leave.id)} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium">Approve</button>
                  <button onClick={() => rejectLeave(leave.id)} className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-medium">Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Summary Tab */}
      {tab === 'summary' && (
        <div className="rounded-2xl border p-6" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Leave Balance (This Year)</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Employee</th>
                  <th className="text-center px-4 py-2 text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Casual (12)</th>
                  <th className="text-center px-4 py-2 text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Sick (7)</th>
                  <th className="text-center px-4 py-2 text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Earned (15)</th>
                  <th className="text-center px-4 py-2 text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Used</th>
                  <th className="text-center px-4 py-2 text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {drivers.slice(0, 6).map(drv => {
                  const used = leaves.filter(l => l.employee_id === drv.id && l.status === 'approved').reduce((s, l) => s + l.days, 0);
                  return (
                    <tr key={drv.id} className="border-t" style={{ borderColor: 'var(--border-color)' }}>
                      <td className="px-4 py-2 text-sm" style={{ color: 'var(--text-primary)' }}>{drv.name}</td>
                      <td className="px-4 py-2 text-sm text-center" style={{ color: 'var(--text-secondary)' }}>12</td>
                      <td className="px-4 py-2 text-sm text-center" style={{ color: 'var(--text-secondary)' }}>7</td>
                      <td className="px-4 py-2 text-sm text-center" style={{ color: 'var(--text-secondary)' }}>15</td>
                      <td className="px-4 py-2 text-sm text-center font-medium text-orange-600">{used}</td>
                      <td className="px-4 py-2 text-sm text-center font-medium text-green-600">{34 - used}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Apply Leave Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowLeaveModal(false)} />
          <div className="relative rounded-2xl shadow-xl w-full max-w-md p-6 m-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Apply Leave</h2>
              <button onClick={() => setShowLeaveModal(false)} className="p-1 rounded-lg hover:opacity-70"><X className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Employee</label>
                <select value={leaveForm.employee_id} onChange={(e) => setLeaveForm({...leaveForm, employee_id: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                  <option value="">Select Employee</option>
                  {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Leave Type</label>
                <select value={leaveForm.leave_type} onChange={(e) => setLeaveForm({...leaveForm, leave_type: e.target.value as LeaveType})} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                  <option value="casual">Casual Leave</option>
                  <option value="sick">Sick Leave</option>
                  <option value="earned">Earned Leave</option>
                  <option value="unpaid">Unpaid Leave</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>From</label>
                  <input type="date" value={leaveForm.from_date} onChange={(e) => setLeaveForm({...leaveForm, from_date: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>To</label>
                  <input type="date" value={leaveForm.to_date} onChange={(e) => setLeaveForm({...leaveForm, to_date: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Reason</label>
                <input type="text" value={leaveForm.reason} onChange={(e) => setLeaveForm({...leaveForm, reason: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} placeholder="Reason for leave" />
              </div>
              <button onClick={handleLeaveSubmit} className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Submit Leave Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
