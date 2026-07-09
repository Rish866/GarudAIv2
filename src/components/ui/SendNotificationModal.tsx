import { useState } from 'react';
import { X, MessageCircle, Phone, Send, CheckCircle } from 'lucide-react';
import type { Trip } from '../../types';

interface SendNotificationModalProps {
  trip: Trip;
  statusChange: string;
  onClose: () => void;
}

export default function SendNotificationModal({ trip, statusChange, onClose }: SendNotificationModalProps) {
  const [sent, setSent] = useState(false);
  const [channel, setChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
  
  const message = `Garud Transport Update:\n\nTrip: ${trip.trip_number}\nStatus: ${statusChange}\nFrom: ${trip.origin}\nTo: ${trip.destination}\nVehicle: ${trip.vehicle_reg}\nDriver: ${trip.driver_name}\nContact: ${trip.driver_phone}`;

  const [customMessage, setCustomMessage] = useState(message);

  const handleSend = () => {
    // Simulate sending - in production this would call Twilio/Gupshup API
    setSent(true);
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  if (sent) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Notification Sent!</h3>
          <p className="text-sm text-slate-500 mt-2">
            {channel === 'whatsapp' ? 'WhatsApp' : 'SMS'} notification sent to {trip.customer_name}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Send Status Update</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg">
            <X size={18} className="text-slate-500" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {/* Channel Selection */}
          <div className="flex gap-2">
            <button
              onClick={() => setChannel('whatsapp')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                channel === 'whatsapp' ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 text-slate-600'
              }`}
            >
              <MessageCircle size={18} />
              <span className="font-medium text-sm">WhatsApp</span>
            </button>
            <button
              onClick={() => setChannel('sms')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                channel === 'sms' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'
              }`}
            >
              <Phone size={18} />
              <span className="font-medium text-sm">SMS</span>
            </button>
          </div>

          {/* Recipient */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Recipient</label>
            <div className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700">
              {trip.customer_name} (Customer)
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={6}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none font-mono"
            />
          </div>

          {/* Info */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800">
              <strong>Demo Mode:</strong> In production, this connects to WhatsApp Business API (Gupshup/Twilio) for real message delivery.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={handleSend}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg shadow ${
              channel === 'whatsapp' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <Send size={14} />
            Send {channel === 'whatsapp' ? 'WhatsApp' : 'SMS'}
          </button>
        </div>
      </div>
    </div>
  );
}
