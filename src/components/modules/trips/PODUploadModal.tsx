import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useOrganization } from '../../../contexts/OrganizationContext';
import { useModuleData } from '../../../hooks/useModuleData';
import { showToast } from '../../ui/Toast';
import type { Trip } from '../../../types';

interface PODUploadModalProps {
  trip: Trip;
  onClose: () => void;
}

export default function PODUploadModal({ trip, onClose }: PODUploadModalProps) {
  const { organizationId } = useOrganization();
  const { update: updateTrip } = useModuleData<Trip>('trips');
  const [receivedBy, setReceivedBy] = useState('');
  const [condition, setCondition] = useState<'good' | 'damaged' | 'partial'>('good');
  const [remarks, setRemarks] = useState('');
  const [filename, setFilename] = useState('');
  const [saving, setSaving] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFilename(e.target.files[0].name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId || saving) return;
    setSaving(true);
    const today = new Date().toISOString().split('T')[0];

    const { uploadPOD } = await import('../../../lib/tripEntities');
    const result = await uploadPOD(organizationId, trip.id, {
      file_path: filename || 'pod_uploaded.jpg',
      file_name: filename || 'pod_uploaded.jpg',
      file_type: 'image',
      delivery_at: today,
      received_by: receivedBy,
      remarks: `Condition: ${condition}. ${remarks}`.trim(),
    });

    if (result.success) {
      await updateTrip(trip.id, { status: 'pod_pending' });
      showToast('success', 'POD uploaded successfully');
    } else {
      showToast('error', result.error || 'Failed to upload POD');
    }
    setSaving(false);
    onClose();
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Upload POD - {trip.trip_number}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            <X size={18} style={{ color: 'var(--text-tertiary)' }} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Received By</label>
            <input
              type="text"
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
              required
              placeholder="Name of person who received goods"
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Condition</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as 'good' | 'damaged' | 'partial')}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            >
              <option value="good">Good</option>
              <option value="damaged">Damaged</option>
              <option value="partial">Partial</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Remarks</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Any additional remarks..."
              rows={3}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>POD Image</label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              className="w-full border rounded-lg px-3 py-2 text-sm file:mr-3 file:px-3 file:py-1 file:border-0 file:rounded file:bg-blue-50 file:text-blue-600 file:font-medium file:text-sm"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
            />
            {filename && <p className="text-xs text-green-600 mt-1">Selected: {filename}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium border rounded-lg hover:opacity-80" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg shadow-lg shadow-amber-500/25 hover:bg-amber-700 disabled:opacity-50">
              {saving ? 'Uploading...' : 'Submit POD'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
