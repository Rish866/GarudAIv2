import React, { useState } from 'react';
import { X, RotateCcw } from 'lucide-react';
import type { Trip } from '../../../types';

interface ReopenTripModalProps {
  trip: Trip;
  onConfirm: (tripId: string, reason: string) => void;
  onClose: () => void;
}

export default function ReopenTripModal({ trip, onConfirm, onClose }: ReopenTripModalProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setSubmitting(true);
    await onConfirm(trip.id, reason.trim());
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="rounded-2xl shadow-xl w-full max-w-md mx-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2">
            <RotateCcw size={20} className="text-blue-500" />
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Reopen Trip</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            <X size={18} style={{ color: 'var(--text-tertiary)' }} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Reopen cancelled trip <strong>{trip.trip_number}</strong>?
            This will restore it to its previous status.
          </p>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Reason for Reopening (required)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              placeholder="Why is this trip being reopened?"
              rows={3}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium border rounded-lg" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
              Cancel
            </button>
            <button type="submit" disabled={submitting || !reason.trim()} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {submitting ? 'Reopening...' : 'Reopen Trip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
