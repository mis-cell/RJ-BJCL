import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X, AlertCircle } from 'lucide-react';

export interface OptionItem {
  label: string;
  value: string;
}

interface SearchableSelectProps {
  label?: string;
  name?: string;
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: (string | OptionItem | any)[];
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  isAutoPopulated?: boolean;
  isRequired?: boolean;
  compact?: boolean;
  errorMessage?: string;
  allowCustomInput?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  name,
  id,
  value = '',
  onChange,
  options = [],
  placeholder = "SELECT OR TYPE TO SEARCH...",
  className = "",
  inputClassName = "",
  disabled = false,
  isAutoPopulated = false,
  isRequired = false,
  compact = false,
  errorMessage,
  allowCustomInput = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [queryText, setQueryText] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [hasBlurredInvalid, setHasBlurredInvalid] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const updateDropdownDirection = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      if (spaceBelow < 230 && spaceAbove > spaceBelow) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    }
  };

  const generatedId = useRef(`searchable_${label ? label.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'select'}_${Math.random().toString(36).substring(2, 7)}`).current;
  const inputId = id || generatedId;
  const inputName = name || (label ? label.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'searchable_select');

  // Normalize options to { label: string, value: string }
  const normalizedOptions: OptionItem[] = React.useMemo(() => {
    const list: OptionItem[] = [];
    const seen = new Set<string>();

    options.forEach(opt => {
      if (!opt) return;
      let labelStr = '';
      let valStr = '';

      if (typeof opt === 'string') {
        labelStr = opt.trim();
        valStr = opt.trim();
      } else if (typeof opt === 'object') {
        labelStr = (
          opt.label ||
          opt.name ||
          opt.grade_name ||
          opt.agency_name ||
          opt.marka_name ||
          opt.brok_name ||
          opt.supp_name ||
          opt.area_name ||
          opt.unit_name ||
          opt.value ||
          opt.code ||
          ''
        ).toString().trim();
        valStr = (
          opt.value ||
          opt.grade_name ||
          opt.agency_name ||
          opt.marka_name ||
          opt.brok_name ||
          opt.supp_name ||
          opt.area_name ||
          opt.unit_name ||
          opt.name ||
          opt.code ||
          ''
        ).toString().trim();
      }

      const key = valStr.toUpperCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        list.push({ label: labelStr || valStr, value: valStr });
      }
    });

    return list;
  }, [options]);

  // Find the selected option object from normalizedOptions based on `value`
  const selectedOption = React.useMemo(() => {
    if (!value) return null;
    const valUpper = value.toString().trim().toUpperCase();
    return normalizedOptions.find(opt => opt.value.toUpperCase() === valUpper || opt.label.toUpperCase() === valUpper) || null;
  }, [value, normalizedOptions]);

  // When value prop updates, sync queryText to the selected label/value
  useEffect(() => {
    if (selectedOption) {
      setQueryText(selectedOption.label || selectedOption.value);
      setHasBlurredInvalid(false);
    } else if (!value) {
      setQueryText('');
    } else {
      // If value is provided (e.g. before master list finishes loading or manual custom input), keep it in queryText
      setQueryText(value);
    }
  }, [value, selectedOption]);

  // Handle clicking outside: MUST NOT convert unselected typed text into selected value if custom input is allowed
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        handleCloseAndReset();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedOption, value, normalizedOptions, queryText, allowCustomInput]);

  // Reset/restore valid state on blur, Tab, Escape, or clicking outside
  const handleCloseAndReset = () => {
    setIsOpen(false);
    setHighlightedIndex(-1);

    const trimmed = queryText.trim().toUpperCase();

    // If input is empty, user cleared it
    if (!trimmed) {
      if (value) {
        onChange('');
      }
      setQueryText('');
      setHasBlurredInvalid(isRequired);
      return;
    }

    if (selectedOption) {
      const selectedLabel = selectedOption.label || selectedOption.value;
      setQueryText(selectedLabel);
      if (value !== selectedOption.value) {
        onChange(selectedOption.value);
      }
      setHasBlurredInvalid(false);
    } else if (allowCustomInput) {
      // Allow custom typed text
      setQueryText(trimmed);
      if (value !== trimmed) {
        onChange(trimmed);
      }
      setHasBlurredInvalid(false);
    } else {
      // Revert if custom input is disabled
      setQueryText('');
      setHasBlurredInvalid(isRequired);
    }
  };

  // Filter options based on typed search query
  const filteredOptions = React.useMemo(() => {
    const q = queryText.trim().toLowerCase();
    if (!q) return normalizedOptions;
    return normalizedOptions.filter(opt =>
      (opt.label || '').toLowerCase().includes(q) ||
      (opt.value || '').toLowerCase().includes(q)
    );
  }, [normalizedOptions, queryText]);

  // Check if queryText matches an existing option exactly
  const hasExactMatch = React.useMemo(() => {
    const q = queryText.trim().toUpperCase();
    if (!q) return true;
    return normalizedOptions.some(opt => opt.value.toUpperCase() === q || opt.label.toUpperCase() === q);
  }, [normalizedOptions, queryText]);

  // When user types in input - updates local text and updates onChange if custom input allowed
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value.toUpperCase();
    setQueryText(text);
    if (allowCustomInput) {
      onChange(text);
    }
    updateDropdownDirection();
    setIsOpen(true);
    setHighlightedIndex(0);
    setHasBlurredInvalid(false);
  };

  // When an option is explicitly selected
  const handleSelectOption = (opt: OptionItem) => {
    setQueryText(opt.label || opt.value);
    onChange(opt.value);
    setIsOpen(false);
    setHighlightedIndex(-1);
    setHasBlurredInvalid(false);
  };

  // Clear selection
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQueryText('');
    onChange('');
    setIsOpen(false);
    setHighlightedIndex(-1);
    setHasBlurredInvalid(isRequired);
    inputRef.current?.focus();
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        updateDropdownDirection();
        setIsOpen(true);
        setHighlightedIndex(0);
      } else {
        setHighlightedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        updateDropdownDirection();
        setIsOpen(true);
        setHighlightedIndex(filteredOptions.length - 1);
      } else {
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
      }
    } else if (e.key === 'Enter') {
      // Enter selects highlighted option if dropdown is open, else applies close/reset
      e.preventDefault();
      if (isOpen && highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        handleSelectOption(filteredOptions[highlightedIndex]);
      } else {
        handleCloseAndReset();
      }
    } else if (e.key === 'Tab') {
      handleCloseAndReset();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCloseAndReset();
    }
  };

  // Scroll active option strictly inside dropdown list without scrolling window or parent table
  useEffect(() => {
    if (isOpen && listRef.current && highlightedIndex >= 0) {
      const list = listRef.current;
      const activeEl = list.children[highlightedIndex] as HTMLElement;
      if (activeEl) {
        const listTop = list.scrollTop;
        const listBottom = listTop + list.clientHeight;
        const elTop = activeEl.offsetTop;
        const elBottom = elTop + activeEl.offsetHeight;

        if (elTop < listTop) {
          list.scrollTop = elTop;
        } else if (elBottom > listBottom) {
          list.scrollTop = elBottom - list.clientHeight;
        }
      }
    }
  }, [highlightedIndex, isOpen]);

  // Determine if error should be shown
  const isInvalid = (isRequired && !value && hasBlurredInvalid && !allowCustomInput) || Boolean(errorMessage);

  return (
    <div className={`flex flex-col ${compact ? 'gap-0' : 'gap-1.5'} relative ${className}`} ref={containerRef}>
      {label && !compact && (
        <label htmlFor={inputId} className="text-xs font-semibold text-slate-700 tracking-wide flex items-center gap-1">
          <span>{label}</span>
          {isRequired && <span className="text-rose-600 font-black text-sm">*</span>}
          {isAutoPopulated && (
            <span className="ml-auto text-[9px] bg-sky-100 text-sky-800 px-1.5 py-0.2 rounded border border-sky-300 font-bold uppercase tracking-wider">
              Auto
            </span>
          )}
        </label>
      )}

      <div className="relative w-full">
        <input
          ref={inputRef}
          id={inputId}
          name={inputName}
          aria-label={label || placeholder || "Select option"}
          type="text"
          value={queryText}
          onChange={handleInputChange}
          onFocus={() => {
            updateDropdownDirection();
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onBlur={() => {
            setTimeout(() => {
              if (containerRef.current && !containerRef.current.contains(document.activeElement)) {
                handleCloseAndReset();
              }
            }, 150);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className={`w-full uppercase placeholder:normal-case outline-none transition-all pr-12 shadow-2xs ${
            isInvalid
              ? "border-2 border-rose-500 ring-2 ring-rose-200 bg-[#FDE7E6] text-slate-900"
              : isRequired
              ? compact
                ? "rounded-lg px-2.5 py-1.5 text-xs font-bold bg-[#FDE7E6] border-2 border-rose-300 text-slate-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 placeholder:text-rose-400/70"
                : "rounded-xl px-3.5 py-2 text-xs font-semibold bg-[#FDE7E6] border-2 border-rose-300 text-slate-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 placeholder:text-rose-400/70"
              : isAutoPopulated
              ? compact
                ? "rounded-lg px-2.5 py-1.5 text-xs font-bold bg-[#FDE7E6] border border-sky-300 text-sky-950 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 placeholder:text-sky-400"
                : "rounded-xl px-3.5 py-2 text-xs font-bold bg-[#FDE7E6] border border-sky-300 text-sky-950 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 placeholder:text-sky-400"
              : compact
              ? "rounded-lg px-2.5 py-1.5 text-xs font-bold bg-white border border-[#FBCFCB] text-slate-800 focus:border-[#F7AFA8] focus:ring-1 focus:ring-[#F7AFA8]/20"
              : "rounded-xl px-3.5 py-2 text-xs font-semibold bg-white border border-[#FBCFCB] text-slate-800 focus:border-[#F7AFA8] focus:ring-2 focus:ring-[#F7AFA8]/20 placeholder:text-slate-400"
          } ${inputClassName}`}
        />

        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {value && !disabled && (
            <button
              type="button"
              tabIndex={-1}
              onClick={handleClear}
              className="text-slate-400 hover:text-rose-600 p-1 rounded cursor-pointer transition-colors"
              title="Clear selection"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              if (!disabled) {
                if (!isOpen) updateDropdownDirection();
                setIsOpen(!isOpen);
                setHighlightedIndex(-1);
              }
            }}
            className="text-slate-400 hover:text-[#D94B5A] p-1 rounded cursor-pointer transition-colors"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#D94B5A]' : ''}`} />
          </button>
        </div>

        {isOpen && (
          <div
            ref={listRef}
            onWheel={(e) => e.stopPropagation()}
            className={`absolute z-50 left-0 right-0 ${
              openUpward ? 'bottom-full mb-1' : 'top-full mt-1'
            } max-h-56 overflow-y-auto overscroll-contain bg-white border border-[#D8D3C5] rounded-xl shadow-2xl py-1 text-xs min-w-[200px]`}
            style={{ filter: 'drop-shadow(0 10px 15px rgba(0, 0, 0, 0.15))' }}
          >
            {allowCustomInput && queryText.trim() && !hasExactMatch && (
              <div
                onMouseDown={(e) => {
                  e.preventDefault();
                  const customVal = queryText.trim().toUpperCase();
                  handleSelectOption({ label: customVal, value: customVal });
                }}
                className="px-3.5 py-2 cursor-pointer flex items-center justify-between font-bold text-[#D94B5A] bg-emerald-50 hover:bg-emerald-100 border-b border-emerald-200 transition-colors"
              >
                <span className="uppercase text-xs flex items-center gap-1.5">
                  <span className="bg-[#D94B5A] text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-2xs">+ MANUAL INPUT</span>
                  <span>Use &quot;{queryText.trim().toUpperCase()}&quot;</span>
                </span>
              </div>
            )}

            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value.toUpperCase() === (value || '').toUpperCase();
                const isHighlighted = idx === highlightedIndex;
                return (
                  <div
                    key={idx}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectOption(opt);
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`px-3.5 py-2 cursor-pointer flex items-center justify-between font-medium transition-colors ${
                      isSelected
                        ? 'bg-[#F7AFA8]/10 text-[#D94B5A] font-bold'
                        : isHighlighted
                        ? 'bg-[#F2F7F4] text-[#D94B5A] font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="uppercase">{typeof opt.label === 'object' ? String((opt.label as any)?.name || (opt.label as any)?.title || JSON.stringify(opt.label)) : String(opt.label || '')}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-[#D94B5A] shrink-0 ml-2" />}
                  </div>
                );
              })
            ) : !allowCustomInput ? (
              <div className="px-3.5 py-3 text-rose-500 font-bold italic text-center flex items-center justify-center gap-1.5 text-xs">
                <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
                <span>No record found</span>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {isInvalid && (
        <p className="text-[10px] font-bold text-rose-600 flex items-center gap-1 mt-0.5 animate-fadeIn">
          <AlertCircle className="h-3 w-3 shrink-0" />
          <span>{errorMessage || "Please select a valid option."}</span>
        </p>
      )}
    </div>
  );
};

export default SearchableSelect;

