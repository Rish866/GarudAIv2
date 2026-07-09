import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, X, Check, AlertCircle } from 'lucide-react';

interface BulkUploadProps {
  title: string;
  description: string;
  sampleFields: string[];
  onUpload: (data: Record<string, string>[]) => void;
  onClose: () => void;
}

export default function BulkUpload({ title, description, sampleFields, onUpload, onClose }: BulkUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<Record<string, string>[]>([]);
  const [error, setError] = useState('');
  const [uploaded, setUploaded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setError('');
    
    // Parse CSV
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
          setError('File must have at least a header row and one data row');
          return;
        }
        
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const rows: Record<string, string>[] = [];
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          const row: Record<string, string> = {};
          headers.forEach((header, idx) => {
            row[header] = values[idx] || '';
          });
          rows.push(row);
        }
        
        setParsedData(rows);
      } catch (err) {
        setError('Failed to parse file. Please ensure it is a valid CSV.');
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleUpload = () => {
    if (parsedData.length === 0) return;
    onUpload(parsedData);
    setUploaded(true);
    setTimeout(() => onClose(), 1500);
  };

  const downloadSample = () => {
    const csv = sampleFields.join(',') + '\n' + sampleFields.map(() => 'sample_value').join(',');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, '_')}_sample.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (uploaded) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Upload Successful!</h3>
          <p className="text-sm text-slate-500 mt-2">{parsedData.length} records imported</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{description}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg">
            <X size={18} className="text-slate-500" />
          </button>
        </div>
        
        <div className="p-5 space-y-4">
          {/* Sample Download */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Download Sample CSV</p>
                  <p className="text-xs text-blue-600">Use this template for your data</p>
                </div>
              </div>
              <button
                onClick={downloadSample}
                className="px-3 py-1.5 text-xs font-medium text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-100 transition-colors"
              >
                Download
              </button>
            </div>
          </div>

          {/* Expected Fields */}
          <div>
            <p className="text-xs font-medium text-slate-600 mb-2">Expected columns:</p>
            <div className="flex flex-wrap gap-1">
              {sampleFields.map(field => (
                <span key={field} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded font-mono">
                  {field}
                </span>
              ))}
            </div>
          </div>

          {/* File Upload */}
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all"
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            {file ? (
              <p className="text-sm font-medium text-slate-900">{file.name}</p>
            ) : (
              <p className="text-sm text-slate-500">Click to upload CSV file</p>
            )}
            <p className="text-xs text-slate-400 mt-1">CSV files supported (max 1000 rows)</p>
          </div>

          {/* Preview */}
          {parsedData.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <p className="text-sm font-medium text-green-800">
                ✓ {parsedData.length} records parsed successfully
              </p>
              <p className="text-xs text-green-600 mt-0.5">
                Columns found: {Object.keys(parsedData[0]).join(', ')}
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={parsedData.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Import {parsedData.length > 0 ? `${parsedData.length} Records` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
