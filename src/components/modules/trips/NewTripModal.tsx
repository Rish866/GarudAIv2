import React, { useState } from "react";
import { X, MapPin, Truck, Package, Calendar, CreditCard } from "lucide-react";
import { useOrganization } from "../../../contexts/OrganizationContext";
import { useModuleData } from "../../../hooks/useModuleData";
import { validateVehicleForTrip, validateDriverForTrip, validateCustomerCredit } from "../../../lib/workflowRules";
import { estimateDistance } from "../../../lib/distance";
import { generateTripNumber } from "../../../lib/utils";
import { showToast } from "../../ui/Toast";
import BranchField from "../../ui/BranchField";
import type { Trip, Vehicle, Driver, Customer, Quotation, VehicleType } from "../../../types";

interface NewTripModalProps {
  onClose: () => void;
}

export default function NewTripModal({ onClose }: { onClose: () => void }) {
  const { organizationId } = useOrganization();
  const { data: customers } = useModuleData<Customer>('customers');
  const { data: vehicles } = useModuleData<Vehicle>('vehicles');
  const { data: drivers } = useModuleData<Driver>('drivers');
  const { data: quotations } = useModuleData<Quotation>('quotations');
  const { create: addTrip } = useModuleData<Trip>('trips', { fetchOnMount: false });
  const availableVehicles = vehicles;
  const availableDrivers = drivers.filter((d: any) => d.status !== 'inactive');

  // Simulated indents (from store would be better but indents are local to IndentModule currently)
  const pendingQuotations = quotations.filter(q => q.status === 'sent' || q.status === 'draft' || q.status === 'accepted');

  const [form, setForm] = useState({
    branch_id: '',
    source_type: '' as '' | 'quotation' | 'manual',
    quotation_id: '',
    customer_id: '',
    vehicle_id: '',
    driver_id: '',
    origin: '',
    destination: '',
    distance_km: '',
    material: '',
    weight_tons: '',
    eway_bill: '',
    freight_amount: '',
    advance_amount: '',
    booking_date: new Date().toISOString().split('T')[0],
    expected_delivery: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Auto-fill from quotation
  const handleQuotationFill = (quotId: string) => {
    const quot = quotations.find(q => q.id === quotId);
    if (quot) {
      const customer = customers.find(c => c.id === quot.customer_id);
      setForm({
        ...form,
        source_type: 'quotation',
        quotation_id: quotId,
        customer_id: quot.customer_id,
        origin: quot.origin,
        destination: quot.destination,
        material: quot.material,
        weight_tons: String(quot.weight_tons),
        freight_amount: String(quot.rate),
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const customer = customers.find((c) => c.id === form.customer_id);
    const vehicle = vehicles.find((v) => v.id === form.vehicle_id);
    const driver = drivers.find((d) => d.id === form.driver_id);

    if (!customer || !vehicle || !driver) return;

    // Credit block enforcement
    const freight = Number(form.freight_amount) || 0;
    const creditCheck = validateCustomerCredit(customer, freight);
    if (!creditCheck.allowed) {
      showToast('error', creditCheck.errors[0]);
      return;
    }
    if (creditCheck.warnings.length > 0) {
      creditCheck.warnings.forEach((w: string) => showToast('warning', w));
    }

    // Vehicle validation
    const vehCheck = validateVehicleForTrip(vehicle);
    if (!vehCheck.allowed) {
      showToast('error', vehCheck.errors[0]);
      return;
    }

    // Driver validation
    const drvCheck = validateDriverForTrip(driver);
    if (!drvCheck.allowed) {
      showToast('error', drvCheck.errors[0]);
      return;
    }

    const advance = Number(form.advance_amount) || 0;

    const trip: Partial<Trip> = {
      branch_id: form.branch_id || undefined,
      trip_number: generateTripNumber(),
      lr_number: '', // Set by database RPC after trip creation
      eway_bill: form.eway_bill || ('EWB-' + Date.now().toString().slice(-9)),
      customer_id: customer.id,
      customer_name: customer.name,
      vehicle_id: vehicle.id,
      vehicle_reg: vehicle.reg_number,
      driver_id: driver.id,
      driver_name: driver.name,
      driver_phone: driver.phone,
      origin: form.origin,
      destination: form.destination,
      distance_km: Number(form.distance_km) || 0,
      material: form.material,
      weight_tons: Number(form.weight_tons) || 0,
      booking_date: form.booking_date,
      expected_delivery: form.expected_delivery || undefined,
      freight_amount: freight,
      advance_amount: advance,
      balance_amount: freight - advance,
      detention_charges: 0,
      other_charges: 0,
      total_amount: freight,
      status: 'booked',
      created_at: new Date().toISOString(),
    };

    const result = await addTrip(trip);
    if (result.data?.id && organizationId) {
      // Generate persistent LR using database-safe numbering (RPC)
      const { generateLR } = await import('../../../lib/tripEntities');
      const lrResult = await generateLR(organizationId, result.data.id, {
        branch_id: trip.branch_id || undefined,
        consignor_name: customer?.name,
        consignee_name: trip.customer_name,
        material: trip.material,
        package_count: Number(form.num_packages) || 0,
        declared_weight: Number(form.weight_tons) || 0,
        eway_bill_number: trip.eway_bill,
      });
      // LR number is now set by the database, not frontend
      if (lrResult.success && lrResult.lr?.lr_number) {
        showToast('success', `LR ${lrResult.lr.lr_number} generated`);
      }
    }
    onClose();
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">New Trip</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg">
            <X size={18} className="text-slate-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <BranchField value={form.branch_id} onChange={(v) => setForm({...form, branch_id: v})} />
          {/* Source Selection — Link to Quotation */}
          <div className="p-3 rounded-xl border border-dashed" style={{ borderColor: 'var(--accent)', backgroundColor: 'var(--accent-light)' }}>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--accent)' }}>📋 Create from Quotation (auto-fills details)</label>
            <select value={form.quotation_id} onChange={(e) => handleQuotationFill(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm">
              <option value="">— Manual Entry (no quotation) —</option>
              {pendingQuotations.map(q => (
                <option key={q.id} value={q.id}>{q.quotation_number} — {q.customer_name} ({q.origin} → {q.destination}) ₹{q.rate.toLocaleString()}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Customer</label>
            <select name="customer_id" value={form.customer_id} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">Select customer</option>
              {customers.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle</label>
              <select name="vehicle_id" value={form.vehicle_id} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">Select vehicle</option>
                {availableVehicles.map((v) => (<option key={v.id} value={v.id}>{v.reg_number} ({v.vehicle_type}) {v.status !== 'available' ? `— ${v.status}` : ''}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Driver</label>
              <select name="driver_id" value={form.driver_id} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">Select driver</option>
                {availableDrivers.map((d) => (<option key={d.id} value={d.id}>{d.name} {d.status !== 'available' ? `— ${d.status}` : ''}</option>))}
              </select>
            </div>
          </div>


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
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Distance (km)</label>
              <input type="number" name="distance_km" value={form.distance_km} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              {form.origin && form.destination && estimateDistance(form.origin, form.destination) > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const km = estimateDistance(form.origin, form.destination);
                    if (km > 0) setForm({ ...form, distance_km: String(km) });
                  }}
                  className="text-xs text-blue-600 hover:underline mt-1"
                >
                  Auto-calculate: ~{estimateDistance(form.origin, form.destination)} km
                </button>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Material</label>
              <input type="text" name="material" value={form.material} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Weight (tons)</label>
              <input type="number" name="weight_tons" value={form.weight_tons} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">E-Way Bill Number (auto-generated if empty)</label>
            <input type="text" name="eway_bill" value={form.eway_bill} onChange={handleChange} placeholder="EWB-XXXXXXXXX" className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Booking Date</label>
              <input type="date" name="booking_date" value={form.booking_date} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Expected Delivery</label>
              <input type="date" name="expected_delivery" value={form.expected_delivery} onChange={handleChange} className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            {/* P0.5 Pre-dispatch margin alert */}
            {Number(form.freight_amount) > 0 && Number(form.distance_km) > 0 && (() => {
              const freight = Number(form.freight_amount);
              const estCost = Math.round(Number(form.distance_km) * 3.5 * 95 / 4.5) + Math.round(Number(form.distance_km) * 2.8) + Math.round(Number(form.distance_km) * 1.5) + 2000;
              const margin = Math.round((freight - estCost) / freight * 100);
              if (margin < 15) return (
                <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  <span className="text-red-500 font-bold">⚠️</span>
                  <span>Low margin alert: ~{margin}% (est. cost ₹{estCost.toLocaleString()} vs freight ₹{freight.toLocaleString()}). Min recommended: 15%</span>
                </div>
              );
              return null;
            })()}
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-lg shadow-blue-500/25 hover:bg-blue-700">
              Create Trip
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}



/** Modal for cancelling a trip — requires a reason */
