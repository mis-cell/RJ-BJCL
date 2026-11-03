import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, X, Search, Plus, CheckSquare, Square } from 'lucide-react';

export interface MultiSelectOption {
  label: string;
  value: string;
}

export interface SearchableMultiSelectProps {
  id?: string;
  name?: string;
  label?: string;
  selectedValues: string[];
  onChange: (values: string[]) => void;
  options: (string | MultiSelectOption | any)[];
  placeholder?: string;
  allowCustomInput?: boolean;
  disabled?: boolean;
  isRequired?: boolean;
  compact?: boolean;
  badgeTheme?: 'emerald' | 'amber' | 'blue' | 'indigo' | 'purple';
  isAutoPopulated?: boolean;
}

export const SearchableMultiSelect: React.FC<SearchableMultiSelectProps> = ({
  id,
  name,
  label,
  selectedValues = [],
  onChange,
  options = [],
  placeholder = "Select or search...",
  allowCustomInput = false,
  disabled = false,
  isRequired = false,
  compact = false,
  badgeTheme = 'emerald',
  isAutoPopulated = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [openUpward, setOpenUpward] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Normalize options to { label, value }
  const normalizedOptions: MultiSelectOption[] = useMemo(() => {
    const list: MultiSelectOption[] = [];
    const seen = new Set<string>();

    options.forEach(opt => {
      if (!opt) return;
      let labelStr = '';
      let valStr = '';

      if (typeof opt === 'string') {
        labelStr = opt.trim();
        valStr = opt.trim();
      } else if (typeof opt === 'object') {
        const primaryName = (
          opt.label ||
          opt.agency_name ||
          opt.AGENCY_NAME ||
          opt.name ||
          opt.marka_name ||
          opt.grade_name ||
          opt.value ||
          opt.code ||
          ''
        ).toString().trim();
        labelStr = primaryName;
        valStr = primaryName;
      }

      if (valStr && !seen.has(valStr.toUpperCase())) {
        seen.add(valStr.toUpperCase());
        list.push({ label: labelStr || valStr, value: valStr });
      }
    });

    return list.sort((a, b) => a.label.localeCompare(b.label));
  }, [options]);

  // Selected values as upper-case set for fast check
  const selectedSet = useMemo(() => {
    return new Set(selectedValues.map(v => String(v || '').trim().toUpperCase()));
  }, [selectedValues]);

  // Filter options by search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return normalizedOptions;
    const term = searchTerm.trim().toLowerCase();
    return normalizedOptions.filter(opt =>
      opt.label.toLowerCase().includes(term) || opt.value.toLowerCase().includes(term)
    );
  }, [normalizedOptions, searchTerm]);

  // Check if current search is custom input not already present
  const isSearchNotInList = useMemo(() => {
    if (!searchTerm.trim()) return false;
    const termUpper = searchTerm.trim().toUpperCase();
    return !normalizedOptions.some(opt => opt.value.toUpperCase() === termUpper || opt.label.toUpperCase() === termUpper);
  }, [normalizedOptions, searchTerm]);

  // Direction calculation
  const updateDirection = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setOpenUpward(spaceBelow < 260 && spaceAbove > spaceBelow);
    }
  };

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      updateDirection();
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const toggleOption = (val: string) => {
    const valUpper = val.trim().toUpperCase();
    let updated: string[];
    if (selectedSet.has(valUpper)) {
      updated = selectedValues.filter(v => String(v).trim().toUpperCase() !== valUpper);
    } else {
      updated = [...selectedValues, val.trim()];
    }
    onChange(updated);
  };

  const removeValue = (e: React.MouseEvent, val: string) => {
    e.stopPropagation();
    const valUpper = val.trim().toUpperCase();
    onChange(selectedValues.filter(v => String(v).trim().toUpperCase() !== valUpper));
  };

  const handleAddCustom = () => {
    if (!searchTerm.trim()) return;
    const newVal = searchTerm.trim().toUpperCase();
    if (!selectedSet.has(newVal)) {
      onChange([...selectedValues, newVal]);
    }
    setSearchTerm('');
  };

  const handleSelectAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    const allFilteredVals = filteredOptions.map(o => o.value);
    const newCombined = Array.from(new Set([...selectedValues, ...allFilteredVals]));
    onChange(newCombined);
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  // Color mappings
  const themeClasses = {
    emerald: {
      badge: 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200',
      activeRow: 'bg-emerald-50 text-emerald-950 font-bold',
      checkIcon: 'text-emerald-700',
      focusRing: 'focus:border-emerald-600 focus:ring-emerald-500/20'
    },
    amber: {
      badge: 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200',
      activeRow: 'bg-amber-50 text-amber-950 font-bold',
      checkIcon: 'text-amber-700',
      focusRing: 'focus:border-amber-600 focus:ring-amber-500/20'
    },
    blue: {
      badge: 'bg-blue-100 text-blue-900 border-blue-300 hover:bg-blue-200',
      activeRow: 'bg-blue-50 text-blue-950 font-bold',
      checkIcon: 'text-blue-700',
      focusRing: 'focus:border-blue-600 focus:ring-blue-500/20'
    },
    indigo: {
      badge: 'bg-indigo-100 text-indigo-900 border-indigo-300 hover:bg-indigo-200',
      activeRow: 'bg-indigo-50 text-indigo-950 font-bold',
      checkIcon: 'text-indigo-700',
      focusRing: 'focus:border-indigo-600 focus:ring-indigo-500/20'
    },
    purple: {
      badge: 'bg-purple-100 text-purple-900 border-purple-300 hover:bg-purple-200',
      activeRow: 'bg-purple-50 text-purple-950 font-bold',
      checkIcon: 'text-purple-700',
      focusRing: 'focus:border-purple-600 focus:ring-purple-500/20'
    }
  }[badgeTheme];

  return (
    <div ref={containerRef} className="relative w-full text-left font-sans select-none">
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-slate-700 mb-1">
          {label}
          {isRequired && <span className="text-rose-600 font-black ml-1">*</span>}
        </label>
      )}

      {/* Main trigger container */}
      <div
        id={id}
        onClick={() => {
          if (!disabled) {
            updateDirection();
            setIsOpen(prev => !prev);
          }
        }}
        className={`w-full min-h-[38px] rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-1.5 p-1.5 ${
          disabled
            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
            : isOpen
            ? `bg-white border-[#F7AFA8] ring-2 ring-[#F7AFA8]/20 shadow-sm`
            : isAutoPopulated || selectedValues.length > 0
            ? 'bg-emerald-50/50 border-emerald-300 hover:border-emerald-500'
            : isRequired
            ? 'bg-[#FDE7E6] border-2 border-rose-300 hover:border-rose-400'
            : 'bg-white border-[#FBCFCB] hover:border-[#F7AFA8]'
        }`}
      >
        {/* Selected chips / placeholder */}
        <div className="flex flex-wrap items-center gap-1 flex-1 min-w-0 pr-1">
          {selectedValues.length === 0 ? (
            <span className="text-xs text-slate-400 italic px-2 py-0.5">
              {placeholder}
            </span>
          ) : (
            selectedValues.map(val => (
              <span
                key={val}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border transition-colors shadow-2xs ${themeClasses.badge}`}
              >
                <span>{val}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => removeValue(e, val)}
                    className="hover:text-rose-600 transition-colors cursor-pointer rounded-full p-0.5"
                    title={`Remove ${val}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))
          )}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1 shrink-0 pr-1">
          {selectedValues.length > 0 && !disabled && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors"
              title="Clear all selections"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-[#D94B5A]' : ''
            }`}
          />
        </div>
      </div>

      {/* Dropdown Checklist Menu */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 z-50 bg-white border-2 border-[#F7AFA8] rounded-xl shadow-2xl overflow-hidden flex flex-col ${
            openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } max-h-[300px] min-w-[260px] animate-in fade-in zoom-in-95 duration-100`}
        >
          {/* Search Bar + Controls Header */}
          <div className="p-2 border-b border-slate-100 bg-slate-50 flex flex-col gap-1.5">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (isSearchNotInList && allowCustomInput) {
                      handleAddCustom();
                    } else if (filteredOptions.length === 1) {
                      toggleOption(filteredOptions[0].value);
                    }
                  } else if (e.key === 'Escape') {
                    setIsOpen(false);
                  }
                }}
                placeholder="Search or type custom..."
                className="w-full pl-8 pr-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:border-[#F7AFA8] focus:ring-1 focus:ring-[#F7AFA8]/20 font-medium"
              />
            </div>

            {/* Quick Bulk Actions */}
            <div className="flex items-center justify-between text-[10px] text-slate-500 px-1 font-bold">
              <span>{selectedValues.length} selected</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-emerald-700 hover:text-emerald-900 cursor-pointer hover:underline"
                >
                  Select All
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-rose-600 hover:text-rose-800 cursor-pointer hover:underline"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>

          {/* Options Checklist List */}
          <div className="overflow-y-auto max-h-[200px] p-1 divide-y divide-slate-50">
            {/* Custom Add Row if user typed a new string */}
            {allowCustomInput && isSearchNotInList && (
              <div
                onClick={handleAddCustom}
                className="p-2 flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg cursor-pointer transition-colors mb-1"
              >
                <Plus className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Add Custom &quot;{searchTerm.trim().toUpperCase()}&quot;</span>
              </div>
            )}

            {filteredOptions.length === 0 && !isSearchNotInList ? (
              <div className="p-4 text-center text-xs text-slate-400 font-medium">
                No matching options found
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selectedSet.has(opt.value.toUpperCase());
                return (
                  <div
                    key={opt.value}
                    onClick={() => toggleOption(opt.value)}
                    className={`px-2.5 py-1.5 flex items-center justify-between rounded-lg text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? themeClasses.activeRow
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <div className="shrink-0">
                        {isSelected ? (
                          <CheckSquare className={`w-4 h-4 ${themeClasses.checkIcon}`} />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300" />
                        )}
                      </div>
                      <span className="truncate">{opt.label}</span>
                    </div>
                    {isSelected && (
                      <span className="text-[10px] uppercase font-bold text-emerald-700 shrink-0">
                        Selected
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Done Button */}
          <div className="p-1.5 bg-slate-50 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 bg-[#F7AFA8] hover:bg-[#113A21] text-white text-[11px] font-bold rounded-lg cursor-pointer shadow-2xs"
            >
              Done ({selectedValues.length})
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableMultiSelect;
