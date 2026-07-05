import React, { useState, useRef } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Download, 
  Upload, 
  FileSpreadsheet, 
  FileText, 
  Edit, 
  Trash2, 
  X, 
  CheckCircle,
  FileDown
} from 'lucide-react';

interface ColumnDef<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
}

interface DataGridWrapperProps<T> {
  title: string;
  items: T[];
  columns: ColumnDef<T>[];
  searchPlaceholder?: string;
  searchKeys: (keyof T)[];
  filterKey?: keyof T;
  filterOptions?: { value: string; label: string }[];
  onAdd?: () => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  templateHeaders: string[];
  templateSampleRow: string[];
  onImport?: (parsedItems: any[]) => void;
  importFieldMapping?: (csvRow: string[]) => Partial<T>;
}

export default function DataGridWrapper<T extends { id: string | number }>({
  title,
  items,
  columns,
  searchPlaceholder = 'Search...',
  searchKeys,
  filterKey,
  filterOptions = [],
  onAdd,
  onEdit,
  onDelete,
  templateHeaders,
  templateSampleRow,
  onImport,
  importFieldMapping
}: DataGridWrapperProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterValue, setFilterValue] = useState('ALL');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search and filter logic
  const filteredItems = items.filter(item => {
    // 1. Filter
    if (filterKey && filterValue !== 'ALL') {
      const val = String(item[filterKey] || '').toUpperCase();
      if (val !== filterValue.toUpperCase()) return false;
    }

    // 2. Search
    if (!searchTerm) return true;
    return searchKeys.some(key => {
      const itemVal = item[key];
      if (itemVal === undefined || itemVal === null) return false;
      return String(itemVal).toLowerCase().includes(searchTerm.toLowerCase());
    });
  });

  // Export CSV
  const handleExportCSV = () => {
    if (items.length === 0) {
      alert('No records available to export.');
      return;
    }
    const headers = columns.map(c => c.label).join(',');
    const rows = items.map(item => {
      return columns.map(col => {
        const val = item[col.key as keyof T];
        // Handle nested or complex objects, escape double quotes
        const strVal = val !== undefined && val !== null ? String(val) : '';
        return `"${strVal.replace(/"/g, '""')}"`;
      }).join(',');
    });
    
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${title.replace(/\s+/g, '_')}_Export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export PDF (Simulated detailed clean print report layout)
  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Popup blocker prevented PDF generation. Please allow popups.');
      return;
    }
    
    const htmlContent = `
      <html>
        <head>
          <title>${title} Report</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; padding: 40px; }
            h1 { font-size: 24px; font-weight: 800; margin-bottom: 5px; color: #0f172a; }
            .subtitle { font-size: 12px; color: #64748b; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #f1f5f9; color: #475569; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 12px; border-bottom: 2px solid #cbd5e1; text-align: left; }
            td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #334155; }
            .footer { margin-top: 50px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          </style>
        </head>
        <body>
          <h1>GARUD AI COMMAND CENTER</h1>
          <div class="subtitle">${title.toUpperCase()} ENTERPRISE REPORT • Generated on ${new Date().toLocaleDateString()}</div>
          <table>
            <thead>
              <tr>
                ${columns.map(col => `<th>${col.label}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${filteredItems.map(item => `
                <tr>
                  ${columns.map(col => {
                    const val = item[col.key as keyof T];
                    return `<td>${val !== undefined && val !== null ? String(val) : '-'}</td>`;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            CONFIDENTIAL • GARUD AI SaaS ERP • India's AI Command Center for Fleet Safety & Transport Operations
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Download Bulk Template
  const handleDownloadTemplate = () => {
    const csvContent = 'data:text/csv;charset=utf-8,' + [
      templateHeaders.join(','),
      templateSampleRow.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
    ].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${title.replace(/\s+/g, '_')}_Bulk_Template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Drag and drop handlers for CSV upload
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const parseCSV = (text: string) => {
    try {
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      if (lines.length < 2) {
        throw new Error('CSV must contain a header row and at least one data row.');
      }
      
      const parsedData: any[] = [];
      const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());

      for (let i = 1; i < lines.length; i++) {
        // Regex to parse CSV cell fields safely (handles double quoted cells)
        const rowMatches = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
        const rowCells = rowMatches.map(cell => cell.replace(/^"|"$/g, '').trim());
        
        if (importFieldMapping) {
          const mappedItem = importFieldMapping(rowCells);
          parsedData.push({
            id: 'imported-' + Math.floor(Math.random() * 900000 + 100000) + '-' + i,
            ...mappedItem
          });
        } else {
          // Fallback direct key mapping based on column headers
          const item: any = { id: 'imported-' + Math.floor(Math.random() * 900000 + 100000) + '-' + i };
          headers.forEach((h, idx) => {
            if (rowCells[idx] !== undefined) {
              item[h.toLowerCase().replace(/\s+/g, '_')] = rowCells[idx];
            }
          });
          parsedData.push(item);
        }
      }
      return parsedData;
    } catch (err: any) {
      console.error(err);
      throw new Error('Format parsing error. Make sure columns match the template.');
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      alert('Please upload a standard CSV file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseCSV(text);
        if (onImport && parsed.length > 0) {
          onImport(parsed);
          setImportFeedback(`Successfully parsed & imported ${parsed.length} records!`);
          setTimeout(() => {
            setIsImportModalOpen(false);
            setImportFeedback(null);
          }, 2000);
        } else {
          alert('Failed to parse any records from CSV.');
        }
      } catch (err: any) {
        alert(err.message || 'Error processing CSV file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      {/* Top action grid bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-900 text-left">
        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
            />
          </div>

          {filterKey && filterOptions.length > 0 && (
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <Filter className="w-3.5 h-3.5" />
              </span>
              <select
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-8 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 font-bold"
              >
                <option value="ALL">All Categories</option>
                {filterOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Export / Import & Add actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Add Item */}
          {onAdd && (
            <button
              onClick={onAdd}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add New
            </button>
          )}

          {/* Import CSV */}
          {onImport && (
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 text-xs px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
              title="Import from Excel or CSV file"
            >
              <Upload className="w-3.5 h-3.5" /> Import
            </button>
          )}

          {/* Bulk upload template download */}
          <button
            onClick={handleDownloadTemplate}
            className="bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white border border-slate-800 text-xs px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
            title="Download blank Excel / CSV template for bulk upload"
          >
            <FileDown className="w-3.5 h-3.5" /> Template
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 text-xs px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
            title="Export list to CSV file"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> CSV
          </button>

          {/* Export PDF */}
          <button
            onClick={handleExportPDF}
            className="bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 text-xs px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
            title="Generate detailed PDF / Print invoice layout"
          >
            <FileText className="w-3.5 h-3.5" /> PDF
          </button>
        </div>
      </div>

      {/* Main Grid Table */}
      <div className="bg-slate-950 border border-slate-900 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#030712] text-slate-400 font-extrabold uppercase text-[9px] border-b border-slate-900">
              <tr>
                {columns.map(col => (
                  <th key={col.key} className="p-3.5 pl-5">{col.label}</th>
                ))}
                {(onEdit || onDelete) && (
                  <th className="p-3.5 text-center w-24">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + ((onEdit || onDelete) ? 1 : 0)} className="p-10 text-center text-slate-500 italic text-xs">
                    No records found matching current search or filters.
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-slate-900/40 transition-colors">
                    {columns.map(col => (
                      <td key={col.key} className="p-3.5 pl-5 text-slate-300">
                        {col.render ? col.render(item) : String(item[col.key as keyof T] || '-')}
                      </td>
                    ))}
                    {(onEdit || onDelete) && (
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          {onEdit && (
                            <button
                              onClick={() => onEdit(item)}
                              className="p-1.5 rounded-md hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                              title="Edit record"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {onDelete && (
                            <button
                              onClick={() => onDelete(item)}
                              className="p-1.5 rounded-md hover:bg-slate-800 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                              title="Delete record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk CSV Upload Importer Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm text-left">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 relative">
            <button 
              onClick={() => { setIsImportModalOpen(false); setImportFeedback(null); }} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-base font-black text-white mb-2 flex items-center gap-2">
              <Upload className="w-4 h-4 text-cyan-400" />
              Bulk Import CSV - {title}
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Upload a standard comma-separated value (.csv) file to load multiple records at once.
              You must download the template first to ensure the column alignment matches correctly.
            </p>

            {/* Drag & drop upload target */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                dragActive 
                  ? 'border-cyan-500 bg-cyan-950/10' 
                  : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <Upload className="w-8 h-8 text-slate-500 mx-auto mb-3" />
              <p className="text-xs font-bold text-slate-300 mb-1">Drag and drop your Excel/CSV file here</p>
              <p className="text-[10px] text-slate-500">or click to browse local folders</p>
            </div>

            {importFeedback && (
              <div className="mt-4 p-3 bg-emerald-950/40 border border-emerald-500/20 rounded-xl flex items-center space-x-2 text-xs text-emerald-400 font-bold">
                <CheckCircle className="w-4 h-4" />
                <span>{importFeedback}</span>
              </div>
            )}

            <div className="mt-6 flex justify-between items-center text-[10px] text-slate-500 bg-slate-950 p-3 rounded-lg leading-relaxed">
              <span>Required columns: <strong className="text-slate-400 font-mono">{templateHeaders.join(', ')}</strong></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
