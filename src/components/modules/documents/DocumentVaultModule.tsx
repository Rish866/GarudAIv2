import React, { useState, useMemo } from 'react';
import { useModuleData } from '../../../hooks/useModuleData';
import { useStore, generateId } from '../../../store/useStore';
import { formatDate, getDaysUntil, classNames } from '../../../lib/utils';
import { FileText, Upload, AlertTriangle, Filter, Shield, Clock, CheckCircle } from 'lucide-react';

interface VaultDocument {
  id: string;
  vehicle_id: string;
  vehicle_reg: string;
  document_type: 'RC' | 'Insurance' | 'Fitness Certificate' | 'National Permit' | 'PUC' | 'Driver License';
  document_number: string;
  issue_date: string;
  expiry_date: string;
  status: 'valid' | 'expiring' | 'expired';
  uploaded_file: string;
}

type FilterType = 'all' | 'expiring' | 'expired' | 'by_vehicle';

export default function DocumentVaultModule() {
  const { data: vehicles } = useModuleData<any>('vehicles');

  const generateDocuments = (): VaultDocument[] => {
    const docs: VaultDocument[] = [];

    vehicles.forEach((v) => {
      // RC
      docs.push({
        id: 'doc_rc_' + v.id,
        vehicle_id: v.id,
        vehicle_reg: v.reg_number,
        document_type: 'RC',
        document_number: `RC-${v.reg_number.replace(/-/g, '')}`,
        issue_date: '2020-01-15',
        expiry_date: '2035-01-15',
        status: 'valid',
        uploaded_file: 'rc_scan.pdf',
      });

      // Insurance
      const insExpiry = v.insurance_expiry;
      const insDays = getDaysUntil(insExpiry);
      docs.push({
        id: 'doc_ins_' + v.id,
        vehicle_id: v.id,
        vehicle_reg: v.reg_number,
        document_type: 'Insurance',
        document_number: `INS-${Math.floor(1000000 + Math.random() * 9000000)}`,
        issue_date: '2024-' + insExpiry.slice(5),
        expiry_date: insExpiry,
        status: insDays < 0 ? 'expired' : insDays <= 60 ? 'expiring' : 'valid',
        uploaded_file: 'insurance_policy.pdf',
      });

      // Fitness Certificate
      const fitExpiry = v.fitness_expiry;
      const fitDays = getDaysUntil(fitExpiry);
      docs.push({
        id: 'doc_fit_' + v.id,
        vehicle_id: v.id,
        vehicle_reg: v.reg_number,
        document_type: 'Fitness Certificate',
        document_number: `FIT-${v.reg_number.replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
        issue_date: '2024-01-15',
        expiry_date: fitExpiry,
        status: fitDays < 0 ? 'expired' : fitDays <= 60 ? 'expiring' : 'valid',
        uploaded_file: 'fitness_cert.pdf',
      });

      // National Permit
      const permitExpiry = v.permit_expiry;
      const permitDays = getDaysUntil(permitExpiry);
      docs.push({
        id: 'doc_permit_' + v.id,
        vehicle_id: v.id,
        vehicle_reg: v.reg_number,
        document_type: 'National Permit',
        document_number: `NP-${Math.floor(10000 + Math.random() * 90000)}`,
        issue_date: '2024-04-01',
        expiry_date: permitExpiry,
        status: permitDays < 0 ? 'expired' : permitDays <= 60 ? 'expiring' : 'valid',
        uploaded_file: 'national_permit.pdf',
      });

      // PUC
      const pucExpiry = v.puc_expiry;
      const pucDays = getDaysUntil(pucExpiry);
      docs.push({
        id: 'doc_puc_' + v.id,
        vehicle_id: v.id,
        vehicle_reg: v.reg_number,
        document_type: 'PUC',
        document_number: `PUC-${Math.floor(100000 + Math.random() * 900000)}`,
        issue_date: '2025-01-10',
        expiry_date: pucExpiry,
        status: pucDays < 0 ? 'expired' : pucDays <= 60 ? 'expiring' : 'valid',
        uploaded_file: 'puc_certificate.pdf',
      });
    });

    return docs;
  };

  const [documents] = useState<VaultDocument[]>(generateDocuments);
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedVehicle, setSelectedVehicle] = useState('');

  const filteredDocs = useMemo(() => {
    switch (filter) {
      case 'expiring':
        return documents.filter((d) => d.status === 'expiring');
      case 'expired':
        return documents.filter((d) => d.status === 'expired');
      case 'by_vehicle':
        return selectedVehicle ? documents.filter((d) => d.vehicle_id === selectedVehicle) : documents;
      default:
        return documents;
    }
  }, [documents, filter, selectedVehicle]);

  const expiringCount = documents.filter((d) => d.status === 'expiring').length;
  const expiredCount = documents.filter((d) => d.status === 'expired').length;
  const validCount = documents.filter((d) => d.status === 'valid').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'expiring':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'expired':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getExpiryColorClass = (expiryDate: string) => {
    const days = getDaysUntil(expiryDate);
    if (days < 0) return 'border-l-4 border-l-red-500';
    if (days <= 30) return 'border-l-4 border-l-red-400';
    if (days <= 60) return 'border-l-4 border-l-yellow-400';
    return 'border-l-4 border-l-green-400';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Document Vault</h1>
          <p className="text-slate-500 mt-1">Track and manage vehicle documents and expiries</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Upload className="w-4 h-4" />
          Upload Document
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Documents</p>
              <p className="text-2xl font-bold text-slate-900">{documents.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Valid</p>
              <p className="text-2xl font-bold text-green-700">{validCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-50 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Expiring Soon</p>
              <p className="text-2xl font-bold text-yellow-700">{expiringCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Expired</p>
              <p className="text-2xl font-bold text-red-700">{expiredCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="w-4 h-4 text-slate-500" />
        <button
          onClick={() => setFilter('all')}
          className={classNames('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors', filter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}
        >
          All
        </button>
        <button
          onClick={() => setFilter('expiring')}
          className={classNames('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors', filter === 'expiring' ? 'bg-yellow-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}
        >
          Expiring Soon ({expiringCount})
        </button>
        <button
          onClick={() => setFilter('expired')}
          className={classNames('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors', filter === 'expired' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}
        >
          Expired ({expiredCount})
        </button>
        <button
          onClick={() => setFilter('by_vehicle')}
          className={classNames('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors', filter === 'by_vehicle' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}
        >
          By Vehicle
        </button>
        {filter === 'by_vehicle' && (
          <select
            value={selectedVehicle}
            onChange={(e) => setSelectedVehicle(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Vehicles</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.reg_number}</option>
            ))}
          </select>
        )}
      </div>

      {/* Document Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocs.map((doc) => (
          <div
            key={doc.id}
            className={classNames(
              'bg-white rounded-2xl border border-slate-200 p-4',
              getExpiryColorClass(doc.expiry_date)
            )}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{doc.vehicle_reg}</p>
                <p className="text-xs text-slate-500">{doc.document_type}</p>
              </div>
              <span className={classNames('px-2 py-0.5 rounded-full text-xs font-medium border', getStatusColor(doc.status))}>
                {doc.status}
              </span>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Doc No:</span>
                <span className="text-slate-700 font-medium">{doc.document_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Issue:</span>
                <span className="text-slate-700">{formatDate(doc.issue_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Expiry:</span>
                <span className={classNames('font-medium', doc.status === 'expired' ? 'text-red-600' : doc.status === 'expiring' ? 'text-yellow-600' : 'text-slate-700')}>
                  {formatDate(doc.expiry_date)}
                </span>
              </div>
              {doc.status !== 'expired' && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Days Left:</span>
                  <span className={classNames('font-medium', getDaysUntil(doc.expiry_date) <= 30 ? 'text-red-600' : getDaysUntil(doc.expiry_date) <= 60 ? 'text-yellow-600' : 'text-green-600')}>
                    {getDaysUntil(doc.expiry_date)} days
                  </span>
                </div>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-500">{doc.uploaded_file}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
