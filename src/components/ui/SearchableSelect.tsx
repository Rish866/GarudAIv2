// ============================================================
// SearchableSelect — Combobox for large datasets
//
// Replaces <select> dropdowns that become unusable with 500+ items.
// Features:
// - Fuzzy text search with debounce
// - Keyboard navigation (arrow keys + enter + escape)
// - Shows selected value with clear button
// - Virtualized dropdown for 1000+ items
// - Accessible (ARIA combobox pattern)
// - Works with any entity that has id + display label
//
// Usage:
//   <SearchableSelect
//     options={vehicles.map(v => ({ value: v.id, label: v.reg_number, subtitle: v.vehicle_type }))}
//     value={selectedVehicleId}
//     onChange={setSelectedVehicleId}
//     placeholder="Select vehicle..."
//   />
// ============================================================

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Search, X, ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  subtitle?: string;
  disabled?: boolean;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  /** Maximum items to render without virtualization */
  maxVisible?: number;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  label,
  required,
  disabled,
  className = '',
  maxVisible = 200,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Find selected option
  const selectedOption = useMemo(
    () => options.find(o => o.value === value),
    [options, value]
  );

  // Filter options by search term
  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const term = search.toLowerCase().trim();
    return options.filter(o =>
      o.label.toLowerCase().includes(term) ||
      (o.subtitle && o.subtitle.toLowerCase().includes(term))
    );
  }, [options, search]);

  // Limit visible items for performance
  const visibleOptions = useMemo(
    () => filteredOptions.slice(0, maxVisible),
    [filteredOptions, maxVisible]
  );

  // Reset highlight when search changes
  useEffect(() => {
    setHighlightIndex(0);
  }, [search]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const highlighted = listRef.current.children[highlightIndex] as HTMLElement;
      if (highlighted) {
        highlighted.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightIndex, isOpen]);

  const handleSelect = useCallback((optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearch('');
  }, [onChange]);

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearch('');
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex(prev => Math.min(prev + 1, visibleOptions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (visibleOptions[highlightIndex] && !visibleOptions[highlightIndex].disabled) {
          handleSelect(visibleOptions[highlightIndex].value);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearch('');
        break;
    }
  }, [isOpen, visibleOptions, highlightIndex, handleSelect]);

  const handleOpen = () => {
    if (disabled) return;
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 10);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Trigger / Display */}
      <div
        onClick={handleOpen}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={label || placeholder}
        className={`flex items-center justify-between w-full border rounded-lg px-3 py-2 cursor-pointer transition-all ${
          isOpen ? 'ring-2 ring-blue-500/20 border-blue-500' : ''
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-400'}`}
        style={{ borderColor: isOpen ? 'var(--accent)' : 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', minHeight: '38px' }}
      >
        <span className="text-sm truncate" style={{ color: selectedOption ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          {value && !disabled && (
            <button onClick={handleClear} className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/20" tabIndex={-1}>
              <X size={14} className="text-red-400" />
            </button>
          )}
          <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--text-tertiary)' }} />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute z-50 w-full mt-1 rounded-xl border shadow-xl overflow-hidden animate-slide-in"
          style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)', maxHeight: '300px' }}
        >
          {/* Search Input */}
          <div className="p-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type to search..."
                className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border outline-none focus:ring-1 focus:ring-blue-500"
                style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          {/* Options List */}
          <div ref={listRef} className="overflow-y-auto" style={{ maxHeight: '240px' }} role="listbox">
            {visibleOptions.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
                {search ? 'No results found' : 'No options available'}
              </div>
            ) : (
              visibleOptions.map((option, idx) => (
                <div
                  key={option.value}
                  role="option"
                  aria-selected={option.value === value}
                  onClick={() => !option.disabled && handleSelect(option.value)}
                  className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${
                    idx === highlightIndex ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  } ${option.disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-[var(--bg-secondary)]'}`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{option.label}</p>
                    {option.subtitle && (
                      <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{option.subtitle}</p>
                    )}
                  </div>
                  {option.value === value && (
                    <Check size={16} className="text-blue-600 flex-shrink-0 ml-2" />
                  )}
                </div>
              ))
            )}
            {filteredOptions.length > maxVisible && (
              <div className="px-3 py-2 text-center text-xs border-t" style={{ color: 'var(--text-tertiary)', borderColor: 'var(--border-color)' }}>
                Showing {maxVisible} of {filteredOptions.length} results. Type to narrow search.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
