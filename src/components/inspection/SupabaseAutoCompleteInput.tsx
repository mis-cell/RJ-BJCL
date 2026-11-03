import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Loader2, AlertTriangle } from "lucide-react";
import { useLiveAutoRefresh } from "../../hooks/useLiveAutoRefresh";
import { supabase } from "../../lib/supabase";
import { dbModule } from "../../services/dbModule";
import { safeRenderText } from "../../types/inspection.types";

export interface SupabaseAutoCompleteInputProps {
  label: string;
  name: "arrival_no" | "po_no";
  fieldColumn: "temporary_arrival_no" | "po_no";
  value: string;
  disabled?: boolean;
  placeholder: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectOption?: (val: string, record?: any) => void;
  savedInspections?: any[];
}

// Module-level cached autocomplete records to prevent repeated network spam across fields
let cachedCombinedRecords: any[] | null = null;
let lastFetchTime = 0;

export const SupabaseAutoCompleteInput: React.FC<SupabaseAutoCompleteInputProps> = ({
  label,
  name,
  fieldColumn,
  value,
  disabled = false,
  placeholder,
  onChange,
  onSelectOption,
  savedInspections = [],
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dbRecords, setDbRecords] = useState<any[]>(() => cachedCombinedRecords || []);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch data directly from Supabase & LocalStorage (cached for 10 seconds across inputs)
  async function fetchLiveData(force = false) {
    const now = Date.now();
    if (!force && cachedCombinedRecords && now - lastFetchTime < 10000) {
      setDbRecords(cachedCombinedRecords);
      return;
    }

    if (dbRecords.length === 0) setLoading(true);
    setFetchError(null);
    try {
      let data: any[] = [];
      if (supabase) {
        const [matInspRes, finalArrRes] = await Promise.all([
          supabase.from("material_inspection").select("id, mr_no, po_no, mill_po_no, temporary_arrival_no, arrival_no, supplier, broker, created_at").order("created_at", { ascending: false }).limit(200).then(r => r, () => ({ data: [] })),
          supabase.from("final_arrival").select("final_arrival_id, final_arrival_no, temporary_arrival_no, arrival_no, mr_no, po_no, supplier, broker, date").order("date", { ascending: false }).limit(200).then(r => r, () => ({ data: [] })),
        ]);

        const combined = [
          ...((matInspRes as any)?.data || []),
          ...((finalArrRes as any)?.data || []),
        ];
        const uniqueMap = new Map();
        combined.forEach((item: any) => {
          const key = item.mr_no || item.id || item.mill_po_no || item.po_no || item.temporary_arrival_no || item.arrival_no;
          if (key && !uniqueMap.has(key)) {
            uniqueMap.set(key, item);
          }
        });
        data = Array.from(uniqueMap.values());
      } else {
        const matInspRes = await dbModule.fetchAll("material_inspection", undefined, false, 200).catch(() => []);
        const finalArrRes = await dbModule.fetchAll("final_arrival", undefined, false, 200).catch(() => []);
        const combined = [...(matInspRes || []), ...(finalArrRes || [])];
        const uniqueMap = new Map();
        combined.forEach((item: any) => {
          const key = item.mr_no || item.id || item.mill_po_no || item.po_no;
          if (key && !uniqueMap.has(key)) {
            uniqueMap.set(key, item);
          }
        });
        data = Array.from(uniqueMap.values());
      }

      cachedCombinedRecords = data;
      lastFetchTime = Date.now();
      setDbRecords(data);
    } catch (err: any) {
      console.error(`Error fetching inspection records for ${name}:`, err);
      setFetchError("Unable to connect to database");
    } finally {
      setLoading(false);
    }
  }

  const handleFocusOrClick = () => {
    if (disabled) return;
    setIsOpen(true);
    fetchLiveData();
  };

  // Extract, deduplicate, filter and sort options in ascending order
  const getOptions = () => {
    const map = new Map<string, { val: string; record: any; labelType?: string }>();

    dbRecords.forEach((record) => {
      if (fieldColumn === "temporary_arrival_no") {
        const arrVals = [record.arrival_no, record.temporary_arrival_no, record.ref_arrival_no, record.mr_no].filter(Boolean);
        arrVals.forEach((val) => {
          const rawVal = String(val).trim();
          if (!rawVal) return;
          const upperKey = rawVal.toUpperCase();

          const isAlreadyInspected = savedInspections.some(
            (insp) =>
              (insp.arrival_no || insp.temporary_arrival_no || insp.mr_no || "").trim().toUpperCase() === upperKey
          );

          if (isAlreadyInspected && (value || "").trim().toUpperCase() !== upperKey) {
            return;
          }

          if (!map.has(upperKey)) {
            map.set(upperKey, { val: rawVal, record, labelType: "Arrival No." });
          }
        });
      } else if (fieldColumn === "po_no") {
        const poCandidates = [
          { val: record.mill_po_no, label: "Mill P.O. No." },
          { val: record.po_no, label: "P.O. No." },
          { val: record.mr_no, label: "MR / Insp No." }
        ];

        poCandidates.forEach(({ val, label }) => {
          if (!val) return;
          const rawVal = String(val).trim();
          if (!rawVal) return;
          const upperKey = rawVal.toUpperCase();

          if (!map.has(upperKey)) {
            map.set(upperKey, { val: rawVal, record, labelType: label });
          }
        });
      }
    });

    const uniqueOptions = Array.from(map.values()).sort((a, b) => {
      return a.val.localeCompare(b.val, undefined, { numeric: true, sensitivity: "base" });
    });

    if (!value || !value.trim()) {
      return uniqueOptions;
    }

    const searchLower = value.trim().toLowerCase();
    return uniqueOptions.filter((opt) => {
      const valMatches = opt.val.toLowerCase().includes(searchLower);
      const poMatches = opt.record?.po_no?.toString().toLowerCase().includes(searchLower);
      const millPoMatches = opt.record?.mill_po_no?.toString().toLowerCase().includes(searchLower);
      const suppMatches = (opt.record?.supplier_name || opt.record?.supplier || "").toString().toLowerCase().includes(searchLower);
      const mrMatches = (opt.record?.mr_no || "").toString().toLowerCase().includes(searchLower);
      const brokerMatches = (opt.record?.broker_name || opt.record?.broker || "").toString().toLowerCase().includes(searchLower);
      return valMatches || poMatches || millPoMatches || suppMatches || mrMatches || brokerMatches;
    });
  };

  const options = getOptions();

  const handleSelect = (opt: { val: string; record: any }) => {
    const fakeEvent = {
      target: {
        name,
        value: opt.val,
      },
    } as React.ChangeEvent<HTMLInputElement>;

    onChange(fakeEvent);

    if (onSelectOption) {
      onSelectOption(opt.val, opt.record);
    }

    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative flex-1">
      <div className="relative flex items-center">
        <input
          id={`autocomplete_${name}`}
          aria-label={label}
          type="text"
          name={name}
          value={value}
          disabled={disabled}
          onChange={(e) => {
            onChange(e);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={handleFocusOrClick}
          onClick={handleFocusOrClick}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full bg-white border border-gray-400 rounded px-2 py-0.5 pr-6 text-xs font-semibold focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 disabled:bg-slate-100"
        />
        <ChevronDown
          className={`w-3.5 h-3.5 text-gray-500 absolute right-1.5 pointer-events-none transition-transform duration-200 ${
            isOpen ? "rotate-180 text-blue-600" : ""
          }`}
        />
      </div>

      {isOpen && !disabled && (
        <div className="absolute left-0 top-full mt-1 w-full min-w-[280px] max-w-md bg-white border border-blue-400 rounded-md shadow-2xl z-[100] max-h-60 overflow-y-auto divide-y divide-gray-100 animate-in fade-in duration-100">
          {loading ? (
            <div className="p-3 text-xs text-slate-500 flex items-center justify-center gap-2 font-medium bg-slate-50">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span>Fetching live records...</span>
            </div>
          ) : fetchError ? (
            <div className="p-2.5 text-xs text-red-600 font-semibold bg-red-50 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{fetchError}</span>
            </div>
          ) : options.length === 0 ? (
            <div className="p-3 text-xs text-slate-500 text-center font-medium italic bg-slate-50">
              No records found
            </div>
          ) : (
            <div className="py-1">
              <div className="px-2 py-1 bg-slate-100 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider flex justify-between">
                <span>{label}</span>
                <span>INSPECTION REGISTER RECORDS</span>
              </div>
              {options.map((opt, idx) => (
                <div
                  key={idx}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(opt);
                  }}
                  className="px-2.5 py-1.5 text-xs hover:bg-blue-50 cursor-pointer transition-colors flex items-center justify-between gap-2 border-b border-slate-100 last:border-b-0"
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-blue-900 shrink-0">
                      {safeRenderText(opt.val)}
                    </span>
                    {opt.labelType && (
                      <span className="text-[9px] font-semibold text-emerald-700">
                        {opt.labelType}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 truncate text-right">
                    {fieldColumn === "temporary_arrival_no"
                      ? `${opt.record?.po_no || opt.record?.mill_po_no ? `P.O. #${safeRenderText(opt.record.mill_po_no || opt.record.po_no, "")}` : ""}${
                          (opt.record?.supplier_name || opt.record?.supplier) ? ` | ${safeRenderText(opt.record.supplier_name || opt.record.supplier, "")}` : ""
                        }`
                      : `${
                          opt.record?.mr_no
                            ? `Insp MR #${safeRenderText(opt.record.mr_no, "")}`
                            : (opt.record?.arrival_no || opt.record?.temporary_arrival_no)
                            ? `Arrival: ${safeRenderText(opt.record.arrival_no || opt.record.temporary_arrival_no, "")}`
                            : ""
                        }${
                          (opt.record?.supplier_name || opt.record?.supplier || opt.record?.broker_name || opt.record?.broker)
                            ? ` | ${safeRenderText(opt.record.supplier_name || opt.record.supplier || opt.record.broker_name || opt.record.broker, "")}`
                            : ""
                        }`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
