import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Database, X } from "lucide-react";
import { safeRenderText } from "../../types/inspection.types";

interface InspectionHistoricSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchFilter: string;
  setSearchFilter: (term: string) => void;
  filteredSavedInspections: any[];
  loadInspectionIntoForm: (record: any) => void;
  setIsEditMode: (isEdit: boolean) => void;
  setViewMode: (mode: "dashboard" | "entry") => void;
}

export const InspectionHistoricSearchModal: React.FC<InspectionHistoricSearchModalProps> = ({
  isOpen,
  onClose,
  searchFilter,
  setSearchFilter,
  filteredSavedInspections,
  loadInspectionIntoForm,
  setIsEditMode,
  setViewMode,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white border-2 border-slate-400 shadow-2xl rounded-sm w-full max-w-4xl max-h-[85vh] flex flex-col"
          >
            {/* Modal Title bar */}
            <div className="bg-[#0d47a1] text-white px-4 py-2 flex items-center justify-between border-b border-yellow-405">
              <span className="text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
                <Database className="h-4 w-4" />
                Historic Jute Mill Inspection Reports directory
              </span>
              <button
                onClick={onClose}
                className="text-white hover:bg-white/20 p-1 rounded-full transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Sub search input */}
            <div className="p-3 bg-slate-100 border-b border-slate-300 text-[11px] flex items-center gap-2">
              <span className="font-extrabold uppercase shrink-0">
                Search Records:
              </span>
              <input
                id="search_modal_records"
                name="search_modal_records"
                aria-label="Search by M.R. Number, order reference, merchant, broker name..."
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search by M.R. Number, order reference, merchant, broker name..."
                className="flex-1 bg-white border border-slate-400 rounded px-2.5 py-1 text-xs font-semibold focus:outline-none focus:border-blue-600"
              />
              <span>({filteredSavedInspections.length} total found)</span>
            </div>

            {/* Table search container */}
            <div className="flex-1 overflow-auto p-4">
              <table className="w-full border-collapse border border-slate-300 text-[10.5px]">
                <thead className="bg-slate-200 font-black text-slate-800 text-left sticky top-0 uppercase">
                  <tr className="border-b border-slate-300 divide-x divide-white">
                    <th className="px-3 py-2">M.R. No.</th>
                    <th className="px-2 py-2">M.R. Date</th>
                    <th className="px-3 py-2">Supplier / Merchant</th>
                    <th className="px-3 py-2">Broker</th>
                    <th className="px-2 py-2 text-center">
                      Moisture Register
                    </th>
                    <th className="px-2 py-2 text-center text-rose-800">
                      Unloading Date
                    </th>
                    <th className="px-3 py-2 text-center w-24">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-250 font-bold bg-white text-slate-700">
                  {filteredSavedInspections.length > 0 ? (
                    filteredSavedInspections.map((row, idx) => (
                      <tr
                        key={row.id || row.mr_no || `modal-${idx}`}
                        onDoubleClick={() => {
                          loadInspectionIntoForm(row);
                          setIsEditMode(true);
                          setViewMode("entry");
                          onClose();
                        }}
                        className="hover:bg-indigo-50/50 transition-colors h-9 cursor-pointer select-none"
                        title="Double-click to edit record"
                      >
                        <td className="px-3 text-indigo-900 font-extrabold text-xs">
                          {row.mr_no}
                        </td>
                        <td className="px-2 font-mono">{row.mr_date}</td>
                        <td className="px-3 uppercase truncate max-w-[150px]">
                          {safeRenderText(row.supplier_name || row.supplier)}
                        </td>
                        <td className="px-3 uppercase truncate max-w-[130px]">
                          {safeRenderText(row.broker_name || row.broker)}
                        </td>
                        <td className="px-2 text-center font-bold font-mono text-emerald-800">
                          {row.actual_moisture} %
                        </td>
                        <td className="px-2 text-center font-mono">
                          {row.unloading_date}
                        </td>
                        <td className="px-3 text-center py-1">
                          <button
                            onClick={() => {
                              loadInspectionIntoForm(row);
                              onClose();
                            }}
                            className="bg-[#0d47a1] text-white px-2.5 py-1 rounded-sm text-[9.5px] uppercase font-black whitespace-nowrap active:scale-95 transition-all shadow-sm border border-blue-800 hover:bg-slate-800 cursor-pointer"
                          >
                            [ Load Record ]
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-center py-12 text-slate-400 italic font-medium uppercase font-sans"
                      >
                        No stored inspections found matching terms
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Status bottom info */}
            <div className="bg-slate-100 border-t border-slate-300 px-4 py-2 text-stone-500 font-mono text-[9px] uppercase italic text-center">
              * Select any record to pull full parameter detail blocks instantly back to active console table
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
