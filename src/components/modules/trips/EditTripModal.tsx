import React, { useState } from "react";
import { X, MapPin, Truck, Package, Calendar, Edit3 } from "lucide-react";
import { useOrganization } from "../../../contexts/OrganizationContext";
import { usePermissions } from "../../../hooks/usePermissions";
import { useModuleData } from "../../../hooks/useModuleData";
import { tripRepository } from "../../../data/trips/tripRepository";
import { showToast } from "../../ui/Toast";
import BranchField from "../../ui/BranchField";
import type { Trip, Vehicle, Driver, Customer } from "../../../types";

interface EditTripModalProps {
  trip: Trip;
  onClose: () => void;
}

export default function EditTripModal({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const { organizationId } = useOrganization();
  const { can } = usePermissions();
  const { data: customers } = useModuleData<Customer>('customers');
  const { data: vehicles } = useModuleData<Vehicle>('vehicles');
  const { data: drivers } = useModuleData<Driver>('drivers');

  // Filter: show available + currently assigned vehicle/driver; exclude inactive
  const availableVehicles = vehicles.filter((v: any) =>
    v.status === 'available' || v.status === 'on_trip' || v.id === trip.vehicle_id
  );
  const availableDrivers = drivers.filter((d: any) =>
    d.status === 'available' || d.status === 'on_trip' || d.id === trip.driver_id
  );

  const [form, setForm] = useState({
    customer_id: trip.customer_id || '',
    vehicle_id: trip.vehicle_id || '',
    driver_id: trip.driver_id || '',
    origin: trip.origin || '',
    destination: trip.destination || '',
    distance_km: String(trip.distance_km || 0),
    material: trip.material || '',
    weight_tons: String(trip.weight_tons || 0),
    eway_bill: trip.eway_bill || '',
    freight_amount: String(trip.freight_amount || 0),
    advance_amount: String(trip.advance_amount || 0),
    detention_charges: String(trip.detention_charges || 0),
    other_charges: String(trip.other_charges || 0),
    expected_delivery: trip.expected_delivery || '',
    remarks: trip.remarks || '',
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) {
      showToast('error', 'No organization found');
      return;
    }
    setSaving(true);

    const customer = customers.find((c: any) => c.id === form.customer_id);
    const vehicle = vehicles.find((v: any) => v.id === form.vehicle_id);
    const driver = drivers.find((d: any) => d.id === form.driver_id);

    // Build updates object for the RPC (only changed fields)
    const updates: Record<string, any> = {
      customer_id: form.customer_id || null,
      customer_name: customer?.name || trip.customer_name,
      vehicle_id: form.vehicle_id || null,
      vehicle_reg: vehicle?.reg_number || trip.vehicle_reg,
      driver_id: form.driver_id || null,
      driver_name: driver?.name || trip.driver_name,
      driver_phone: driver?.phone || trip.driver_phone,
      origin: form.origin,
      destination: form.destination,
      distance_km: Number(form.distance_km) || 0,
      material: form.material,
      weight_tons: Number(form.weight_tons) || 0,
      eway_bill: form.eway_bill || null,
      freight_amount: Number(form.freight_amount) || 0,
      advance_amount: Number(form.advance_amount) || 0,
      detention_charges: Number(form.detention_charges) || 0,
      other_charges: Number(form.other_charges) || 0,
      expected_delivery: form.expected_delivery || null,
      remarks: form.remarks || null,
    };

    if (!can('trips.update')) {
      showToast('error', 'Permission denied: you cannot edit trip details.');
      return;
    }
    const { error } = await tripRepository.editDetails(organizationId, trip.id, updates);
    setSaving(false);
    if (error) {
      showToast('error', `Update failed: ${error}`);
    } else {
      showToast('success', `Trip ${trip.trip_number} updated`);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Edit Trip</h2>
            <p className="text-sm text-slate-500">{trip.trip_number} — Status: {trip.status.replace(/_/g, ' ')}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg">
            <X size={18} className="text-slate-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Customer */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Customer</label>
            <select name="customer_id" value={form.customer_id} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">Select customer</option>
              {customers.map((c: any) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>

          {/* Vehicle & Driver */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle</label>
              <select name="vehicle_id" value={form.vehicle_id} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">Select vehicle</option>
                {availableVehicles.map((v: any) => (<option key={v.id} value={v.id}>{v.reg_number} ({v.vehicle_type}) {v.id === trip.vehicle_id ? '(current)' : v.status !== 'available' ? `— ${v.status}` : ''}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Driver</label>
              <select name="driver_id" value={form.driver_id} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">Select driver</option>
                {availableDrivers.map((d: any) => (<option key={d.id} value={d.id}>{d.name} {d.id === trip.driver_id ? '(current)' : d.status !== 'available' ? `— ${d.status}` : ''}</option>))}
              </select>
            </div>
          </div>

          {/* Route */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Origin</label>
              <input type="text" name="origin" value={form.origin} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Destination</label>
              <input type="text" name="destination" value={form.destination} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>

          {/* Distance, Material, Weight */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Distance (km)</label>
              <input type="number" name="distance_km" value={form.distance_km} onChange={handleChange} className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Material</label>
              <input type="text" name="material" value={form.material} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Weight (tons)</label>
              <input type="number" name="weight_tons" value={form.weight_tons} onChange={handleChange} className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>

          {/* E-Way Bill */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">E-Way Bill</label>
            <input type="text" name="eway_bill" value={form.eway_bill} onChange={handleChange} placeholder="EWB-XXXXXXXXX" className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>

          {/* Financial */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Freight Amount</label>
              <input type="number" name="freight_amount" value={form.freight_amount} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Advance Amount</label>
              <input type="number" name="advance_amount" value={form.advance_amount} onChange={handleChange} className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Detention Charges</label>
              <input type="number" name="detention_charges" value={form.detention_charges} onChange={handleChange} className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Other Charges</label>
              <input type="number" name="other_charges" value={form.other_charges} onChange={handleChange} className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>

          {/* Expected Delivery */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Expected Delivery</label>
            <input type="date" name="expected_delivery" value={form.expected_delivery} onChange={handleChange} className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
            <textarea name="remarks" value={form.remarks} onChange={handleChange} rows={2} placeholder="Any notes..." className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50">
              Discard
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/25 hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Saving...
                </>
              ) : (
                <>
                  <Edit3 size={14} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


/** Modal for reopening a cancelled trip — requires a reason */
