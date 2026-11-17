import React, { useState, useEffect, useRef } from "react";
import { Search, ChevronDown, ChevronUp, X, FileText } from "lucide-react";
import { InspectionMasterRecord } from "../../types/inspection.types";

interface SearchablePendingArrivalSelectProps {
  pendingArrivalList: any[];
  onSelect: (fa: any) => void;
}

const cleanArrivalToken = (s: any) => String(s || "").trim().replace(/^#+/, "").trim();

const resolvePendingMrNo = (fa: any): string => {
  if (fa?._resolvedMrNo) return cleanArrivalToken(fa._resolvedMrNo);
  const rawMr = cleanArrivalToken(fa?.mr_no);
  const candidates = [
    fa?.final_arrival_no,
    rawMr && rawMr.toUpperCase() !== "DIRECT REGISTER" ? rawMr : "",
    fa?.arrival_no,
  ]
    .map(cleanArrivalToken)
    .filter((c) => c && c.toUpperCase() !== "DIRECT REGISTER");
  return candidates.find((c) => /^mr/i.test(c)) || candidates.find((c) => !/^ar\d+/i.test(c)) || "";
};

const formatDisplayPo = (po: any): string => {
  const s = String(po || "").trim();
  return !s || /^(?:--|no|n\/a|none|null|undefined|-)$/i.test(s) ? "--" : s;
};

const SearchablePendingArrivalSelect: React.FC<SearchablePendingArrivalSelectProps> = ({
  pendingArrivalList,
  onSelect,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDisplay, setSelectedDisplay] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredList = pendingArrivalList.filter((fa) => {
    const mrNo = resolvePendingMrNo(fa);
    if (!mrNo) return false;

    if (!searchTerm.trim()) return true;

    const q = searchTerm.toLowerCase().trim().replace(/^#+/, "");
    const mrLower = mrNo.toLowerCase();
    const faNo = cleanArrivalToken(fa.final_arrival_no).toLowerCase();
    const tempNo = cleanArrivalToken(fa.temporary_arrival_no || fa.arrival_no).toLowerCase();
    const poNo = String(fa.po_no || "").toLowerCase();
    const supplier = String(fa.supplier || fa.challan_supplier || fa.supplier_name || "").toLowerCase();
    const lorry = String(fa.lorry_number || fa.lorry_no || "").toLowerCase();
    const broker = String(fa.broker || fa.broker_name || "").toLowerCase();

    return (
      mrLower.includes(q) ||
      faNo.includes(q) ||
      tempNo.includes(q) ||
      poNo.includes(q) ||
      supplier.includes(q) ||
      lorry.includes(q) ||
      broker.includes(q)
    );
  });

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white border border-emerald-300 hover:border-emerald-500 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 flex items-center justify-between cursor-pointer shadow-sm transition-all focus-within:ring-2 focus-within:ring-emerald-500"
      >
        <div className="flex items-center gap-2 truncate pr-2">
          <Search className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
          <span className={selectedDisplay ? "text-slate-900 font-black truncate" : "text-slate-500 font-semibold truncate"}>
            {selectedDisplay || "-- Select / Search Final Arrival M.R. No. to Auto-Fill --"}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {selectedDisplay && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedDisplay("");
                setSearchTerm("");
              }}
              className="p-0.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {isOpen ? <ChevronUp className="w-4 h-4 text-emerald-700" /> : <ChevronDown className="w-4 h-4 text-emerald-700" />}
        </div>
      </div>

      {isOpen && (
        <div className="absolute right-0 left-0 mt-1 bg-white border border-emerald-300 rounded-xl shadow-2xl z-50 overflow-hidden text-xs">
          <div className="p-2.5 border-b border-emerald-100 bg-emerald-50/70 flex items-center gap-2">
            <Search className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by M.R. No, Arrival, PO, Supplier, Lorry..."
              className="w-full bg-white border border-emerald-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400 placeholder:font-normal"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
            {pendingArrivalList.length === 0 ? (
              <div className="p-4 text-center text-slate-500 font-medium italic">
                -- No Final Arrival M.R. Records Found --
              </div>
            ) : filteredList.length === 0 ? (
              <div className="p-4 text-center text-slate-500 font-medium italic">
                No matching Final Arrival record found for "{searchTerm}"
              </div>
            ) : (
              filteredList.map((fa, idx) => {
                const mrNo = resolvePendingMrNo(fa) || cleanArrivalToken(fa.final_arrival_no || fa.mr_no) || "MR";
                const tempNo = cleanArrivalToken(fa.temporary_arrival_no || fa.arrival_no);
                const poNo = formatDisplayPo(fa.po_no);
                const suppName = fa.supplier || fa.challan_supplier || fa.supplier_name || "Supplier";
                const lorryNo = fa.lorry_number || fa.lorry_no || "-";
                const isInspected = Boolean(fa._isAlreadyInspected);
                const labelStr = `M.R. ${mrNo} | PO: ${poNo} | ${suppName} | Lorry: ${lorryNo}`;

                return (
                  <div
                    key={`p-arr-${fa.final_arrival_id || mrNo}-${idx}`}
                    onClick={() => {
                      setSelectedDisplay(labelStr);
                      setIsOpen(false);
                      onSelect(fa);
                    }}
                    className="p-2.5 hover:bg-emerald-50 cursor-pointer transition-colors flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 flex flex-wrap items-center gap-1.5">
                        <span className="text-emerald-700 font-mono">{mrNo}</span>
                        {tempNo && tempNo.toUpperCase() !== mrNo.toUpperCase() && (
                          <span className="text-[10px] font-mono text-slate-500">({tempNo})</span>
                        )}
                        <span className="text-slate-300">|</span>
                        <span className={poNo === "--" ? "text-amber-700 font-semibold" : "text-slate-800"}>
                          PO: {poNo}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {suppName} • Lorry: {lorryNo}
                      </div>
                    </div>
                    <span
                      className={
                        isInspected
                          ? "text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded shrink-0"
                          : "text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded shrink-0"
                      }
                    >
                      {isInspected ? "Inspected" : "Pick"}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface InspectionHeaderCardProps {
  headerForm: Partial<InspectionMasterRecord>;
  onHeaderChange: (field: keyof InspectionMasterRecord, value: any) => void;
  pendingArrivalList: any[];
  onSelectPendingArrival: (fa: any) => void;
}

export const InspectionHeaderCard: React.FC<InspectionHeaderCardProps> = ({
  headerForm,
  onHeaderChange,
  pendingArrivalList,
  onSelectPendingArrival,
}) => {
  return (
    <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Final Arrival M.R. Picker Bar */}
      <div className="bg-emerald-50/80 px-5 py-3 border-b border-emerald-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-700" />
          <span className="text-xs font-bold text-emerald-950">
            Import / Pick From Final Arrival:
          </span>
          {(() => {
            const mrItems = pendingArrivalList.filter((fa) => Boolean(resolvePendingMrNo(fa)));
            const pendingOnlyCount = mrItems.filter((fa) => !fa._isAlreadyInspected).length;
            return mrItems.length > 0 ? (
              <span className="bg-emerald-200 text-emerald-900 text-[10px] font-extrabold px-2 py-0.5 rounded">
                {mrItems.length} M.R. ({pendingOnlyCount} Pending)
              </span>
            ) : (
              <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded">
                No Final Arrival M.R. Found
              </span>
            );
          })()}
        </div>
        <SearchablePendingArrivalSelect
          pendingArrivalList={pendingArrivalList}
          onSelect={onSelectPendingArrival}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-5">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-extrabold text-slate-700">Arrival No. <span className="text-rose-600 font-black text-sm">*</span></label>
          <input
            type="text"
            value={headerForm.mr_no || ""}
            onChange={(e) => onHeaderChange("mr_no", e.target.value)}
            required
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold bg-white text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
          {headerForm.godown_receipt_no && (
            <span className="text-[10px] font-mono font-semibold text-indigo-700 leading-tight">
              Godown Receipt No.: {headerForm.godown_receipt_no}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-extrabold text-slate-700">Arrival Date <span className="text-rose-600 font-black text-sm">*</span></label>
          <input
            type="date"
            value={headerForm.mr_date || ""}
            onChange={(e) => onHeaderChange("mr_date", e.target.value)}
            required
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold bg-white text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-extrabold text-slate-700">P.O. No.</label>
          <input
            type="text"
            value={headerForm.po_no || ""}
            onChange={(e) => onHeaderChange("po_no", e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold bg-white text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-extrabold text-slate-700">P.O. Date</label>
          <input
            type="date"
            value={headerForm.po_date || ""}
            readOnly
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium bg-slate-100 text-slate-500 cursor-not-allowed focus:outline-none"
            title="P.O. Date is loaded automatically from Sauda Check Point"
          />
        </div>

        <div className="flex flex-col gap-1 sm:col-span-2 md:col-span-4">
          <label className="text-xs font-extrabold text-slate-700">Broker Name <span className="text-rose-600 font-black text-sm">*</span></label>
          <input
            type="text"
            value={headerForm.broker_name || ""}
            onChange={(e) => onHeaderChange("broker_name", e.target.value)}
            required
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold bg-white text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div className="flex flex-col gap-1 sm:col-span-2 md:col-span-4">
          <label className="text-xs font-extrabold text-slate-700">Supplier Name <span className="text-rose-600 font-black text-sm">*</span></label>
          <input
            type="text"
            value={headerForm.supplier_name || ""}
            onChange={(e) => onHeaderChange("supplier_name", e.target.value)}
            required
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold bg-white text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>

        {/* Moisture & Deductions Header Indicators */}
        <div className="flex flex-col gap-1 border-l-4 border-blue-400 pl-2">
          <label className="text-xs font-extrabold text-slate-700">Actual Moisture %</label>
          <input
            type="number"
            step="0.01"
            value={headerForm.actual_moisture || 0}
            onChange={(e) => onHeaderChange("actual_moisture", Number(e.target.value))}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-blue-700 bg-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex flex-col gap-1 border-l-4 border-blue-400 pl-2">
          <label className="text-xs font-extrabold text-slate-700">Actual Dust %</label>
          <input
            type="number"
            step="0.01"
            value={headerForm.actual_dust || 0}
            onChange={(e) => onHeaderChange("actual_dust", Number(e.target.value))}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-amber-700 bg-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex flex-col gap-1 border-l-4 border-blue-400 pl-2">
          <label className="text-xs font-extrabold text-slate-700">Actual NCV %</label>
          <input
            type="number"
            step="0.01"
            value={headerForm.actual_ncv || 0}
            onChange={(e) => onHeaderChange("actual_ncv", Number(e.target.value))}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex flex-col gap-1 border-l-4 border-blue-400 pl-2">
          <label className="text-xs font-extrabold text-slate-700">Detention Days</label>
          <input
            type="number"
            step="1"
            value={headerForm.detention_days || 0}
            onChange={(e) => onHeaderChange("detention_days", Number(e.target.value))}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex flex-col gap-1 border-l-4 border-purple-400 pl-2">
          <label className="text-xs font-extrabold text-slate-700">Claim Moisture %</label>
          <input
            type="number"
            step="0.01"
            value={headerForm.claim_moisture || 0}
            onChange={(e) => onHeaderChange("claim_moisture", Number(e.target.value))}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-purple-700 bg-white focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex flex-col gap-1 border-l-4 border-purple-400 pl-2">
          <label className="text-xs font-extrabold text-slate-700">Claim Dust %</label>
          <input
            type="number"
            step="0.01"
            value={headerForm.claim_dust || 0}
            onChange={(e) => onHeaderChange("claim_dust", Number(e.target.value))}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-purple-700 bg-white focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex flex-col gap-1 border-l-4 border-purple-400 pl-2">
          <label className="text-xs font-extrabold text-slate-700">Claim NCV %</label>
          <input
            type="number"
            step="0.01"
            value={headerForm.claim_ncv || 0}
            onChange={(e) => onHeaderChange("claim_ncv", Number(e.target.value))}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-purple-700 bg-white focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex flex-col gap-1 border-l-4 border-purple-400 pl-2">
          <label className="text-xs font-extrabold text-slate-700">Unloading Date</label>
          <input
            type="date"
            value={headerForm.unloading_date || ""}
            onChange={(e) => onHeaderChange("unloading_date", e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex flex-col gap-1 hidden" >
          <label className="text-xs font-extrabold text-slate-700">Mill P.O. No.</label>
          <input
            type="text"
            value={headerForm.mill_po_no || ""}
            onChange={(e) => onHeaderChange("mill_po_no", e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium bg-white text-slate-900 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1 hidden">
          <label className="text-xs font-extrabold text-slate-700">Mill P.O. Date</label>
          <input
            type="date"
            value={headerForm.mill_po_date || ""}
            onChange={(e) => onHeaderChange("mill_po_date", e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium bg-white text-slate-900 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1 hidden">
          <label className="text-xs font-extrabold text-slate-700">MR. Spcl Print</label>
          <input
            type="text"
            value={headerForm.mr_spcl_print || ""}
            onChange={(e) => onHeaderChange("mr_spcl_print", e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium bg-white text-slate-900 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-extrabold text-slate-700">Lorry Number <span className="text-rose-600 font-black text-sm">*</span></label>
          <input
            type="text"
            value={headerForm.lorry_number.toUpperCase() || ""}
            onChange={(e) => onHeaderChange("lorry_number", e.target.value.toUpperCase())}
            required
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold bg-white text-slate-900 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1 sm:col-span-2 md:col-span-4">
          <label className="text-xs font-extrabold text-slate-700">Remarks</label>
          <textarea
            rows={2}
            value={headerForm.remarks || ""}
            onChange={(e) => onHeaderChange("remarks", e.target.value)}
            placeholder="General mill inspection notes..."
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium bg-white text-slate-900 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>
    </section>
  );
};
