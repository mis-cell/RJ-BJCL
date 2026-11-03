import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ManualEntryComboBoxProps {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
}

export function ManualEntryComboBox({ 
  value, 
  onChange, 
  options, 
  placeholder, 
  className 
}: ManualEntryComboBoxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(value.toLowerCase())
  );

  return (
    <div ref={wrapperRef} className="relative flex-1">
      <div className="relative flex items-center">
        <input
          id="value_132"
          name="value"
          aria-label="value"
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onClick={() => setIsOpen(true)}
          placeholder={placeholder}
          className={cn(
            "w-full bg-white border border-gray-400 p-1 pr-6 text-xs font-bold outline-none uppercase text-slate-800 focus:border-blue-600",
            className
          )}
        />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(prev => !prev);
          }}
          className="absolute right-0 top-0 bottom-0 px-1.5 text-slate-500 hover:bg-slate-200 border-l border-slate-300"
        >
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>
      {isOpen && (
        <ul className="absolute z-50 left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white border border-gray-400 shadow-md text-[11px] divide-y divide-slate-100">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, idx) => (
              <li
                key={idx}
                onMouseDown={(e) => {
                  e.preventDefault();
                }}
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
                className="p-1.5 hover:bg-slate-900 hover:text-white cursor-pointer uppercase text-left font-bold text-slate-700"
              >
                {opt}
              </li>
            ))
          ) : (
            <li className="p-1.5 text-slate-400 italic text-left">
              Press enter to use &quot;{value}&quot;
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

export interface CustomDropdownSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  id?: string;
}

export function CustomDropdownSelect({
  value,
  onChange,
  options,
  placeholder = "Select Option",
  className,
  id
}: CustomDropdownSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative flex-1" id={id}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full bg-white border border-gray-400 p-1 px-2 text-xs font-black text-slate-800 flex justify-between items-center outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500 uppercase text-left rounded-sm min-h-[25px]",
          className
        )}
      >
        <span>{value || placeholder}</span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-500 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-gray-400 shadow-lg text-[11px] rounded-sm divide-y divide-slate-100">
          {options.map((opt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                onChange(opt);
                setIsOpen(false);
              }}
              className="w-full p-2 text-left hover:bg-indigo-600 hover:text-white font-black text-slate-750 uppercase transition-all duration-100 cursor-pointer block"
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export interface CustomEditableSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  id?: string;
}

export function CustomEditableSelect({
  value,
  onChange,
  options,
  placeholder = "Select or Type...",
  className,
  id
}: CustomEditableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter(opt => 
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div ref={wrapperRef} className="relative flex-1" id={id}>
      <div className="relative flex items-center">
        <input
          id="searchterm_295"
          name="searchterm"
          aria-label="searchterm"
          type="text"
          value={searchTerm}
          onChange={(e) => {
            const val = e.target.value;
            setSearchTerm(val);
            onChange(val);
            setIsOpen(true);
          }}
          onClick={() => setIsOpen(true)}
          placeholder={placeholder}
          className={cn(
            "w-full bg-white border border-gray-400 p-1 px-2 text-xs font-black text-slate-850 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500 uppercase rounded-sm min-h-[25px]",
            className
          )}
        />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(prev => !prev);
          }}
          className="absolute right-0 top-0 bottom-0 px-2 text-slate-500 hover:bg-slate-150 border-l border-slate-300"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-gray-400 shadow-lg text-[11px] rounded-sm divide-y divide-slate-100">
          {filtered.length > 0 ? (
            filtered.map((opt, idx) => (
              <button
                key={idx}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                }}
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
                className="w-full p-2 text-left hover:bg-indigo-600 hover:text-white font-black text-slate-750 uppercase transition-all duration-100 cursor-pointer block"
              >
                {opt}
              </button>
            ))
          ) : (
            <div className="p-2 text-slate-400 italic text-left text-[10px]">
              Press enter or keep typing to override manually
            </div>
          )}
        </div>
      )}
    </div>
  );
}
