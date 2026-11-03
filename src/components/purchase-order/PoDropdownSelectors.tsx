import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, X, Check, AlertCircle } from "lucide-react";

export const SingleComboBox = ({
  value,
  onChange,
  options,
  textField,
  valueField
}: {
  value: string,
  onChange: (val: string) => void,
  options: any[];
  textField: string;
  valueField: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => setFilter(value), [value]);

  const filtered = options.filter(o => {
    if (!filter || filter === value) return true;
    return String(o[textField]||'').toLowerCase().includes(filter.toLowerCase());
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div ref={containerRef} className="flex-1 flex border border-slate-400 bg-white relative text-black">
      <input  id="filter_192" name="filter" aria-label="filter"
        className="flex-1 p-0.5 outline-none font-bold text-black bg-white" 
        value={filter} 
        onChange={e => {
          setFilter(e.target.value);
          onChange(e.target.value);
        }}
        onFocus={() => setIsOpen(true)}
      />
      <button 
        type="button" 
        onClick={() => setIsOpen(!isOpen)} 
        className="bg-slate-100 border-l border-slate-400 px-1 hover:bg-slate-200"
        tabIndex={-1}
      >
        <ChevronDown className="h-4 w-4 text-black" />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border border-slate-400 shadow-xl z-[100] max-h-48 overflow-y-auto mt-0.5 text-black">
          {filtered.length > 0 ? filtered.map((opt, i) => (
             <div 
               key={i} 
               className="p-1 px-2 hover:bg-blue-600 hover:text-white cursor-pointer text-[10px] font-normal"
               onMouseDown={(e) => {
                 e.preventDefault(); // prevent input blur
                 onChange(opt[valueField]);
                 setIsOpen(false);
               }}
             >
               {opt[textField]}
             </div>
          )) : <div className="p-1 px-2 text-slate-500 italic text-[10px]">No results found</div>}
        </div>
      )}
    </div>
  );
}

export const SearchablePoContractDropdown = ({
  value,
  onChange,
  options,
  disabled = false,
  hasSaudaHighlight = false,
  placeholder = "SEARCH P.O CONTRACT...",
  id = "p_o_contract_searchable"
}: {
  value: string;
  onChange: (val: string) => void;
  options: any[];
  disabled?: boolean;
  hasSaudaHighlight?: boolean;
  placeholder?: string;
  id?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightIndex, setHighlightIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep display synchronized when dropdown is closed
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm(value || '');
      setHighlightIndex(-1);
    }
  }, [value, isOpen]);

  const filteredOptions = React.useMemo(() => {
    if (!isOpen) return options;
    const term = (searchTerm || '').trim().toLowerCase();
    if (!term) return options;

    return options.filter((opt: any) => {
      const poDisplay = String(opt.po_display_no || '').toLowerCase();
      const saudaNo = String(opt.sauda_no || '').toLowerCase();
      const session = String(opt.session || '').toLowerCase();
      const supplier = String(opt.supplier || '').toLowerCase();
      const broker = String(opt.broker || '').toLowerCase();
      const area = String(opt.area || '').toLowerCase();
      const date = String(opt.date || '').toLowerCase();
      return (
        poDisplay.includes(term) ||
        saudaNo.includes(term) ||
        session.includes(term) ||
        supplier.includes(term) ||
        broker.includes(term) ||
        area.includes(term) ||
        date.includes(term)
      );
    });
  }, [options, searchTerm, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm(value || '');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [value]);

  const handleSelect = (item: any) => {
    const selectedVal = item.po_display_no || item.sauda_no || item.session || '';
    onChange(selectedVal);
    setSearchTerm(selectedVal);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightIndex(0);
      } else {
        setHighlightIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (isOpen) {
        setHighlightIndex(prev => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && highlightIndex >= 0 && filteredOptions[highlightIndex]) {
        handleSelect(filteredOptions[highlightIndex]);
      } else if (isOpen && filteredOptions.length > 0) {
        handleSelect(filteredOptions[0]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm(value || '');
    }
  };

  return (
    <div ref={containerRef} className="flex-1 relative text-black min-w-[130px]">
      <div className={`flex items-center border transition-colors duration-150 ${
        disabled
          ? 'bg-slate-100 border-slate-300'
          : hasSaudaHighlight
            ? 'border-sky-400 bg-sky-50 text-sky-950 font-bold'
            : isOpen
              ? 'border-blue-600 bg-white ring-1 ring-blue-400/30'
              : 'border-slate-400 bg-white'
      }`}>
        <input
          id={id}
          ref={inputRef}
          name="p_o_contract_search"
          aria-label="P.O Contract Searchable Dropdown"
          type="text"
          disabled={disabled}
          className={`flex-1 p-0.5 px-1 outline-none font-bold text-[11px] bg-transparent ${
            disabled ? 'text-slate-400' : hasSaudaHighlight ? 'text-sky-950 font-extrabold' : 'text-black'
          }`}
          value={isOpen ? searchTerm : value}
          onChange={(e) => {
            const val = e.target.value;
            setSearchTerm(val);
            setHighlightIndex(0);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (!disabled) {
              setIsOpen(true);
              setSearchTerm('');
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={value || placeholder}
        />

        {value && !disabled && (
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
              setSearchTerm('');
              inputRef.current?.focus();
            }}
            className="p-0.5 text-slate-400 hover:text-red-600 cursor-pointer"
            title="Clear Selection"
          >
            <X className="w-3 h-3" />
          </button>
        )}

        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => {
            if (!disabled) {
              if (isOpen) {
                setIsOpen(false);
                setSearchTerm(value || '');
              } else {
                setIsOpen(true);
                setSearchTerm('');
                inputRef.current?.focus();
              }
            }
          }}
          className={`px-1 py-1 border-l text-slate-600 hover:text-black cursor-pointer transition-colors ${
            hasSaudaHighlight
              ? 'bg-sky-100/80 border-sky-300 text-sky-800 hover:bg-sky-200'
              : 'bg-slate-100 border-slate-400 hover:bg-slate-200'
          }`}
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
        </button>
      </div>

      {isOpen && !disabled && (
        <div className="absolute top-full left-0 sm:right-auto right-0 min-w-[280px] sm:min-w-[360px] max-w-[460px] bg-white border border-slate-400 shadow-2xl z-[9999] mt-0.5 overflow-hidden text-black text-left rounded-none">
          <div className="bg-slate-100 border-b border-slate-300 px-2 py-1 flex items-center justify-between text-[10px] text-slate-700">
            <span className="font-bold flex items-center gap-1">
              <Search className="w-3 h-3 text-slate-500" />
              {searchTerm ? `Filtering: "${searchTerm}"` : 'Select Contract / Sauda'}
            </span>
            <span className="bg-slate-200 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold text-slate-800">
              {filteredOptions.length} Found
            </span>
          </div>

          <div className="overflow-y-auto max-h-56 divide-y divide-slate-200">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt: any, idx: number) => {
                const poNo = opt.po_display_no || opt.sauda_no || opt.session;
                const isSelected = value && (value === poNo || value === opt.sauda_no || value === opt.session);
                const isHighlighted = highlightIndex === idx;

                return (
                  <div
                    key={idx}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(opt);
                    }}
                    onMouseEnter={() => setHighlightIndex(idx)}
                    className={`p-1.5 px-2 cursor-pointer transition-colors text-[10px] ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-950 border-l-4 border-emerald-600 font-semibold'
                        : isHighlighted
                          ? 'bg-blue-600 text-white font-medium'
                          : 'hover:bg-blue-50 hover:text-blue-900 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono font-bold text-[11px]">
                        {poNo}
                      </span>
                      {opt.date && (
                        <span className={`text-[9px] font-mono ${isHighlighted && !isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                          {opt.date}
                        </span>
                      )}
                    </div>

                    {(opt.supplier || opt.broker || opt.area) && (
                      <div className={`flex flex-wrap items-center gap-1.5 mt-0.5 text-[9px] ${
                        isHighlighted && !isSelected ? 'text-blue-100' : 'text-slate-600'
                      }`}>
                        {opt.supplier && (
                          <span className={`font-semibold ${isHighlighted && !isSelected ? 'text-white' : 'text-slate-900'}`}>
                            Supp: {opt.supplier}
                          </span>
                        )}
                        {opt.broker && (
                          <span className={`${isHighlighted && !isSelected ? 'bg-blue-700/60 text-white' : 'bg-slate-100 text-slate-600'} px-1 py-0.2 rounded`}>
                            Brk: {opt.broker}
                          </span>
                        )}
                        {opt.area && (
                          <span className={`${isHighlighted && !isSelected ? 'bg-blue-800/80 text-amber-200' : 'bg-amber-50 text-amber-900'} px-1 py-0.2 rounded font-semibold`}>
                            {opt.area}
                          </span>
                        )}
                        {opt.total_wt_in_ton && (
                          <span className={`ml-auto font-mono font-bold ${isHighlighted && !isSelected ? 'text-white' : 'text-blue-900'}`}>
                            {opt.total_wt_in_ton} MT
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-3 text-center text-slate-500 text-[10px]">
                <p className="font-bold">No matching P.O contracts</p>
                <p className="text-[9px] text-slate-400 mt-0.5">
                  Check the sauda number or supplier name.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const TableComboBox = ({
  value,
  onChange,
  options,
  textField,
  valueField,
  placeholder = ""
}: {
  value: string;
  onChange: (val: string) => void;
  options: any[];
  textField: string;
  valueField: string;
  placeholder?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState(value || '');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFilter(value || '');
  }, [value]);

  const filtered = options.filter(opt => {
    if (!filter) return true;
    return String(opt[textField] || '').toLowerCase().includes(filter.toLowerCase()) ||
           String(opt[valueField] || '').toLowerCase().includes(filter.toLowerCase());
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center text-black">
      <input
 id="filter_273" name="filter" aria-label="filter"        type="text"
        className="w-full bg-transparent border-none p-1 outline-none font-bold text-slate-800 uppercase pr-5"
        value={filter}
        placeholder={placeholder}
        onChange={(e) => {
          const upperVal = e.target.value.toUpperCase();
          setFilter(upperVal);
          onChange(upperVal);
        }}
        onFocus={() => setIsOpen(true)}
      />
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="absolute right-1 text-slate-500 hover:text-slate-800"
        tabIndex={-1}
      >
        <ChevronDown className="h-3 w-3" />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border border-slate-400 shadow-xl z-[150] max-h-40 overflow-y-auto mt-0.5 text-left font-normal">
          {filtered.length > 0 ? filtered.map((opt, i) => (
            <div
              key={i}
              className="p-1 px-2 hover:bg-blue-600 hover:text-white cursor-pointer text-[10px] uppercase font-semibold"
              onMouseDown={(e) => {
                e.preventDefault();
                const clickedVal = String(opt[textField] || '').toUpperCase();
                onChange(clickedVal);
                setIsOpen(false);
              }}
            >
              {String(opt[textField]).toUpperCase()}
            </div>
          )) : (
            <div className="p-1 px-2 text-slate-500 italic text-[10px]">No results found</div>
          )}
        </div>
      )}
    </div>
  );
};

export const DualComboBox = ({
  code,
  name,
  onCodeChange,
  onNameChange,
  options,
  codeField,
  nameField,
  showCode = true,
  hasSaudaHighlight = false,
  isRequired = false,
  placeholder = "-- TYPE TO SEARCH --",
  label = "",
  disabled = false
}: {
  code: string;
  name: string;
  onCodeChange: (val: string) => void;
  onNameChange: (val: string) => void;
  options: any[];
  codeField: string;
  nameField: string;
  showCode?: boolean;
  hasSaudaHighlight?: boolean;
  isRequired?: boolean;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [showInvalidError, setShowInvalidError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Find currently selected option based on name or code
  const selectedOption = React.useMemo(() => {
    if (!name && !code) return null;
    const n = (name || '').trim().toUpperCase();
    const c = (code || '').trim().toUpperCase();
    return options.find(opt => {
      const optName = String(opt[nameField] || '').trim().toUpperCase();
      const optCode = String(opt[codeField] || '').trim().toUpperCase();
      return (n && optName === n) || (c && optCode === c);
    }) || null;
  }, [name, code, options, nameField, codeField]);

  // Sync display text when value changes or when not actively typing
  useEffect(() => {
    if (!isTyping) {
      if (selectedOption) {
        setSearchQuery(String(selectedOption[nameField] || '').toUpperCase());
      } else if (name) {
        setSearchQuery(name.toUpperCase());
      } else {
        setSearchQuery('');
      }
      setShowInvalidError(false);
    }
  }, [name, selectedOption, isTyping, nameField]);

  // Filter options based on typed search query (search only!)
  const filtered = React.useMemo(() => {
    if (!isTyping || !searchQuery.trim()) {
      return options;
    }
    const q = searchQuery.trim().toLowerCase();
    return options.filter(opt => {
      const n = String(opt[nameField] || '').toLowerCase();
      const c = String(opt[codeField] || '').toLowerCase();
      return n.includes(q) || c.includes(q);
    });
  }, [options, isTyping, searchQuery, nameField, codeField]);

  // When dropdown is closed / blurred / tab / escape / outside click:
  // Strictly enforce: unselected typed text MUST NEVER be treated as a valid value!
  const handleCloseAndRevert = () => {
    setIsOpen(false);
    setIsTyping(false);
    setHighlightedIndex(-1);

    const trimmed = searchQuery.trim().toUpperCase();

    // If completely cleared
    if (!trimmed) {
      if (name || code) {
        onNameChange('');
        onCodeChange('');
      }
      setSearchQuery('');
      if (isRequired) {
        setShowInvalidError(true);
      }
      return;
    }

    // Check if what the user typed matches an option exactly
    const exactMatch = options.find(opt => 
      String(opt[nameField] || '').trim().toUpperCase() === trimmed ||
      String(opt[codeField] || '').trim().toUpperCase() === trimmed
    );

    if (exactMatch) {
      const validName = String(exactMatch[nameField] || '').toUpperCase();
      const validCode = String(exactMatch[codeField] || '');
      if (validName !== (name || '').trim().toUpperCase() || validCode !== (code || '').trim().toUpperCase()) {
        onNameChange(validName);
        onCodeChange(validCode);
      }
      setSearchQuery(validName);
      setShowInvalidError(false);
    } else if (selectedOption) {
      // Revert back to the previously selected valid option without changing saved state
      setSearchQuery(String(selectedOption[nameField] || '').toUpperCase());
      setShowInvalidError(false);
    } else {
      // No previously selected option and typed text is invalid
      if (name || code) {
        onNameChange('');
        onCodeChange('');
      }
      setSearchQuery('');
      setShowInvalidError(true);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (isOpen || isTyping) {
          handleCloseAndRevert();
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, isTyping, selectedOption, searchQuery, options, nameField, codeField, isRequired]);

  // When user explicitly selects an option
  const handleSelectOption = (opt: any) => {
    const validName = String(opt[nameField] || '').toUpperCase();
    const validCode = String(opt[codeField] || '');
    onNameChange(validName);
    onCodeChange(validCode);
    setSearchQuery(validName);
    setIsTyping(false);
    setIsOpen(false);
    setHighlightedIndex(-1);
    setShowInvalidError(false);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(0);
      } else {
        setHighlightedIndex(prev => (prev < filtered.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(filtered.length - 1);
      } else {
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filtered.length - 1));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && highlightedIndex >= 0 && highlightedIndex < filtered.length) {
        handleSelectOption(filtered[highlightedIndex]);
      } else {
        handleCloseAndRevert();
      }
    } else if (e.key === 'Tab' || e.key === 'Escape') {
      handleCloseAndRevert();
    }
  };

  // Scroll active item into view
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

  const hasSelectedValue = Boolean(selectedOption || (name && options.some(o => String(o[nameField]).toUpperCase() === name.toUpperCase())));
  const isInvalid = (isRequired && !hasSelectedValue && showInvalidError);

  // Background and border styling consistent with standard field color rules
  const getContainerBg = () => {
    if (disabled) return "bg-slate-100 border-slate-300 text-slate-400";
    if (isInvalid) return "bg-[#FDE7E6] border-rose-500 ring-1 ring-rose-300";
    if (isRequired) return "bg-[#FDE7E6] border-rose-300";
    if (hasSaudaHighlight) return "bg-[#FDE7E6] border-sky-300";
    return "bg-white border-slate-400";
  };

  const getTextColor = () => {
    if (disabled) return "text-slate-400";
    if (isInvalid || isRequired) return "text-slate-900";
    if (hasSaudaHighlight) return "text-sky-950 font-bold";
    return "text-slate-800";
  };

  return (
    <div ref={containerRef} className="flex-1 flex flex-col relative text-black">
      <div className="flex gap-1 w-full relative">
        {showCode && (
          <input
            id={`code_${(nameField || 'field')}_${Math.random().toString(36).substring(2, 6)}`}
            aria-label={`${label || 'Field'} Code`}
            type="text"
            readOnly
            disabled={disabled}
            placeholder="CODE"
            className={`w-16 p-0.5 outline-none border text-center font-bold font-mono text-xs transition-colors duration-150 cursor-pointer ${
              disabled
                ? "bg-slate-100 border-slate-300 text-slate-400"
                : hasSaudaHighlight
                ? "bg-[#FDE7E6] border-sky-300 text-sky-950"
                : isRequired
                ? "bg-[#FDE7E6] border-rose-300 text-slate-900"
                : "bg-slate-100 border-slate-400 text-slate-800"
            }`}
            value={code || (selectedOption ? selectedOption[codeField] : '')}
            onClick={() => {
              if (!disabled) {
                setIsOpen(true);
                inputRef.current?.focus();
              }
            }}
            title="Auto-filled Code from selection"
          />
        )}
        <div className={`flex-1 flex items-center border transition-colors duration-200 rounded-xs ${getContainerBg()}`}>
          <input
            ref={inputRef}
            id={`search_${(nameField || 'field')}_${Math.random().toString(36).substring(2, 6)}`}
            aria-label={label || placeholder}
            type="text"
            disabled={disabled}
            className={`flex-1 p-0.5 outline-none text-left bg-transparent uppercase font-semibold text-xs pr-1 ${getTextColor()}`}
            value={searchQuery}
            placeholder={placeholder}
            autoComplete="off"
            onChange={(e) => {
              if (disabled) return;
              const upperVal = e.target.value.toUpperCase();
              setSearchQuery(upperVal);
              setIsTyping(true);
              setIsOpen(true);
              setHighlightedIndex(0);
              setShowInvalidError(false);
            }}
            onFocus={() => {
              if (!disabled) {
                setIsOpen(true);
                setHighlightedIndex(-1);
              }
            }}
            onKeyDown={handleKeyDown}
          />

          {/* Action buttons inside input */}
          <div className="flex items-center gap-0.5 pr-1">
            {name && !disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNameChange('');
                  onCodeChange('');
                  setSearchQuery('');
                  setIsTyping(false);
                  setIsOpen(false);
                  if (isRequired) setShowInvalidError(true);
                  inputRef.current?.focus();
                }}
                className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer transition-colors"
                title="Clear selection"
                tabIndex={-1}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}

            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                if (!disabled) {
                  setIsOpen(!isOpen);
                  if (!isOpen) {
                    setHighlightedIndex(-1);
                    inputRef.current?.focus();
                  }
                }
              }}
              className={`p-0.5 rounded cursor-pointer transition-colors ${
                disabled
                  ? "text-slate-300"
                  : hasSaudaHighlight
                  ? "text-sky-800 hover:text-sky-950"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              tabIndex={-1}
              title="Toggle dropdown"
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-150 ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
            </button>
          </div>
        </div>

        {isOpen && !disabled && (
          <div
            ref={listRef}
            className={`absolute top-full ${showCode ? 'left-17' : 'left-0'} right-0 bg-white border border-slate-400 shadow-2xl z-[150] max-h-52 overflow-y-auto mt-0.5 rounded-sm`}
          >
            {filtered.length > 0 ? (
              filtered.map((opt, i) => {
                const optName = String(opt[nameField] || '').toUpperCase();
                const optCode = String(opt[codeField] || '').toUpperCase();
                const isSelected = selectedOption
                  ? String(selectedOption[nameField] || '').toUpperCase() === optName
                  : (name && name.toUpperCase() === optName);
                const isHighlighted = i === highlightedIndex;

                return (
                  <div
                    key={i}
                    className={`p-1.5 px-2.5 cursor-pointer text-[11px] uppercase font-semibold flex items-center justify-between transition-colors ${
                      isSelected
                        ? "bg-emerald-50 text-emerald-800 font-bold border-l-2 border-emerald-600"
                        : isHighlighted
                        ? "bg-blue-600 text-white"
                        : "hover:bg-blue-50 hover:text-blue-900 text-slate-800"
                    }`}
                    onMouseDown={(e) => {
                      e.preventDefault(); // prevent input blur before selection
                      handleSelectOption(opt);
                    }}
                    onMouseEnter={() => setHighlightedIndex(i)}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      {optCode && (
                        <span className={`text-[9.5px] px-1 py-0.2 rounded font-mono font-bold ${
                          isHighlighted ? "bg-blue-700 text-blue-100" : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}>
                          {optCode}
                        </span>
                      )}
                      <span className="truncate">{optName}</span>
                    </div>
                    {isSelected && (
                      <Check className={`h-3.5 w-3.5 shrink-0 ${isHighlighted ? 'text-white' : 'text-emerald-600'}`} />
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-2.5 text-center text-rose-600 font-bold text-xs flex items-center justify-center gap-1.5 bg-rose-50/70 italic">
                <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>No record found</span>
              </div>
            )}
          </div>
        )}
      </div>

      {isInvalid && (
        <p className="text-[9.5px] font-bold text-rose-600 flex items-center gap-1 mt-0.5 animate-fadeIn">
          <AlertCircle className="h-3 w-3 shrink-0 text-rose-500" />
          <span>Please select a valid option.</span>
        </p>
      )}
    </div>
  );
};
