import React, { useState, useEffect, useRef } from 'react';

export function EditableComboBox({
  value,
  onChange,
  options,
  placeholder
}: {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt =>
    (opt || "").toLowerCase().includes((filter || "").toLowerCase())
  );

  return (
    <div ref={containerRef} className="relative flex-1">
      <div className="flex border border-slate-300 rounded overflow-hidden bg-white shadow-xs">
        <input
          id="value_combobox"
          name="value"
          aria-label="value"
          ref={inputRef}
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            setFilter(e.target.value);
            setIsOpen(true);
          }}
          onClick={() => {
            setFilter("");
            setIsOpen(true);
          }}
          className="w-full px-2 py-1 font-medium text-slate-800 outline-none text-[13px]"
        />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(prev => !prev);
          }}
          className="bg-slate-50 border-l border-slate-300 px-2 flex items-center justify-center hover:bg-slate-100 cursor-pointer shrink-0 animate-none"
        >
          <span className="text-[9px] text-slate-500">▼</span>
        </button>
      </div>

      {isOpen && (
        <ul className="absolute z-[9999] left-0 right-0 mt-1 max-h-[160px] overflow-y-auto bg-white border border-slate-300 shadow-lg rounded-md text-[12px] font-bold text-slate-700">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, idx) => (
              <li
                key={idx}
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevents input blur before selection registers
                }}
                onClick={() => {
                  onChange(opt);
                  setFilter("");
                  setIsOpen(false);
                }}
                className="px-3 py-1.5 hover:bg-indigo-50 hover:text-indigo-900 cursor-pointer border-b border-slate-100 last:border-b-0 text-left"
              >
                {opt}
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-slate-400 italic text-left">No matches. Use typed value.</li>
          )}
        </ul>
      )}
    </div>
  );
}
