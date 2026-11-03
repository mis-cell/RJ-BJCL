import React from 'react';
import { 
  RefreshCw, 
  FileText, 
  Calculator, 
  Trash2, 
  Printer, 
  Edit 
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { canEditOrDelete, enforceEditOrDeletePermission } from '../../lib/permissions';
import { PaginationControls } from '../PaginationControls';
import { 
  FinalArrivalRecord, 
  getRcptQty, 
  getLowestNetWeight, 
  getQualityParams 
} from './finalArrivalTypes';

interface FinalArrivalDataTableProps {
  loading: boolean;
  filteredRecords: FinalArrivalRecord[];
  selectedRecordId: string | null;
  setSelectedRecordId: (id: string | null) => void;
  auditPopoverId: string | null;
  setAuditPopoverId: (id: string | null) => void;
  currentPage: number;
  setCurrentPage: (p: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  onEditRecord: (record: FinalArrivalRecord) => void;
  onViewSlip: (record: FinalArrivalRecord) => void;
  onPrintSlip: (record: FinalArrivalRecord) => void;
  onDeleteRecord: (id: string, code: string) => void;
}

export function FinalArrivalDataTable({
  loading,
  filteredRecords,
  selectedRecordId,
  setSelectedRecordId,
  auditPopoverId,
  setAuditPopoverId,
  currentPage,
  setCurrentPage,
  pageSize,
  setPageSize,
  onEditRecord,
  onViewSlip,
  onPrintSlip,
  onDeleteRecord
}: FinalArrivalDataTableProps) {
  return (
    <div className="space-y-2">
      <div className="bg-white rounded-xl border border-[#FBCFCB] shadow-xs overflow-x-auto overflow-y-auto min-h-[350px] w-full max-w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 py-24">
            <RefreshCw className="h-8 w-8 text-[#D94B5A] animate-spin mb-3" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-700">Reindexing Final Arrival registries...</span>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 py-24 text-center font-sans">
            <FileText className="h-12 w-12 text-slate-300 mb-2.5" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">No Finalized Arrival Records Found</h3>
            <p className="text-[10px] text-slate-500 max-w-sm mt-1">
              No active final arrivals found matching this search criteria. Create a new record or adjust your filter presets.
            </p>
          </div>
        ) : (
          <table className="w-full border-collapse text-xs font-sans min-w-[1100px]">
            <thead className="bg-[#D94B5A] text-white font-serif sticky top-0 z-10">
              <tr className="border-b border-[#FBCFCB] h-10 text-white">
                <th className="px-3 border-r border-[#D94B5A] font-bold text-center w-24 whitespace-nowrap">Voucher Date</th>
                <th className="px-3 border-r border-[#D94B5A] font-bold text-center w-24 whitespace-nowrap">Arrival</th>
                <th className="px-3 border-r border-[#D94B5A] font-bold text-center w-28 whitespace-nowrap">PO</th>
                <th className="px-3 border-r border-[#D94B5A] font-bold text-left whitespace-nowrap">Supplier Name</th>
                <th className="px-3 border-r border-[#D94B5A] font-bold text-left whitespace-nowrap">Broker Reference</th>
                <th className="px-3 border-r border-[#D94B5A] font-bold text-center w-28 whitespace-nowrap">Lorry Number</th>
                <th className="px-3 border-r border-[#D94B5A] font-bold text-center w-20 whitespace-nowrap">Unit</th>
                <th className="px-3 border-r border-[#D94B5A] font-bold text-right w-20 whitespace-nowrap">Qty</th>
                <th className="px-3 border-r border-[#D94B5A] font-bold text-right w-24 text-amber-200 whitespace-nowrap">Weight</th>
                <th className="px-3 font-bold text-center w-24 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 font-mono text-xs">
              {filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((r, idx) => {
                const isSelected = selectedRecordId === r.final_arrival_id;
                const formattedDate = r.date ? new Date(r.date).toLocaleDateString('en-GB') : '--';
                const bales = getRcptQty(r);
                const weightMt = getLowestNetWeight(r);
                const isPending = !r.mr_no || r.mr_no.trim() === '' || r.mr_no.trim().toUpperCase() === 'DIRECT REGISTER';
                const isVoid = r.status === 'cancelled';
                
                return (
                  <tr 
                    key={r.final_arrival_id || idx} 
                    onClick={() => setSelectedRecordId(r.final_arrival_id || null)}
                    onDoubleClick={() => {
                      if (isVoid) return;
                      setSelectedRecordId(r.final_arrival_id || null);
                      onEditRecord(r);
                    }}
                    className={cn(
                      "h-9.5 cursor-pointer group hover:bg-[#ffffd0]/65 text-xs", 
                      isSelected 
                        ? "bg-indigo-50 text-indigo-950 font-bold border-y border-indigo-200 shadow-sm" 
                        : isVoid 
                            ? "bg-red-50/40 text-gray-400 line-through decoration-red-500/50"
                            : (isPending 
                                ? "bg-amber-100/40 hover:bg-amber-100/60 text-amber-950" 
                                : (idx % 2 === 0 ? "bg-white text-gray-900" : "bg-gray-50/40 text-gray-900")
                              )
                    )}
                  >
                    {/* Voucher Date */}
                    <td className={cn("text-center font-bold px-2.5 border-r border-gray-200 whitespace-nowrap", isSelected ? "text-indigo-900" : isVoid ? "text-red-400" : "text-gray-500")}>
                      {formattedDate}
                    </td>

                    {/* Final Arrival No */}
                    <td className="text-center font-black px-2 border-r border-gray-200 whitespace-nowrap">
                      <div className="flex flex-col items-center justify-center py-0.5">
                        <span className={cn(isSelected ? "text-indigo-950" : "text-gray-900")}>{String(r.final_arrival_no || '').replace(/^#+/, '')}</span>
                        {isPending && (
                          <span className="text-[8.5px] px-1 bg-amber-500 text-white font-extrabold uppercase rounded-sm mt-0.5 tracking-wide leading-none ">Pending</span>
                        )}
                      </div>
                    </td>

                    {/* PO No */}
                    <td className={cn("text-center font-bold font-mono text-xs px-1.5 border-r border-gray-200 whitespace-nowrap", isSelected ? "text-indigo-950 bg-indigo-100/40" : "text-amber-800 bg-amber-50/10")}>
                      {r.po_no || '--'}
                    </td>

                    {/* Supplier Name */}
                    <td className="px-3 truncate uppercase font-sans font-semibold text-left border-r border-gray-200 whitespace-nowrap max-w-[200px]">
                      {r.supplier || '--'}
                    </td>

                    {/* Broker Reference */}
                    <td className={cn("px-3 truncate uppercase font-sans text-left border-r border-gray-200 whitespace-nowrap max-w-[150px]", isSelected ? "text-indigo-900/90" : "text-gray-600")}>
                      {r.broker || 'DIRECT'}
                    </td>

                    {/* Lorry Number */}
                    <td className="text-center font-extrabold uppercase border-r border-gray-200 whitespace-nowrap">
                      {r.lorry_number || (r as any).lorry_no || (r as any).vehicle_no || '--'}
                    </td>

                    {/* Unit */}
                    <td className="text-center border-r border-gray-200 whitespace-nowrap">
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase border bg-blue-50 text-blue-800 border-blue-200">
                        {r.unit_name || r.unit_code || 'BALES'}
                      </span>
                    </td>

                    {/* Bales (Qty) */}
                    <td className={cn("text-right px-2 font-black tabular-nums font-mono border-r border-gray-200 whitespace-nowrap", isSelected ? "text-indigo-900" : "text-blue-700 group-hover:text-blue-900")}>
                      {bales}
                    </td>

                    {/* Weight (M.T) */}
                    <td 
                      onClick={(e) => {
                        e.stopPropagation();
                        setAuditPopoverId(auditPopoverId === r.final_arrival_id ? null : (r.final_arrival_id || ''));
                      }}
                      className={cn(
                        "text-right px-2 font-black tabular-nums font-mono border-r border-gray-200 relative cursor-pointer group/cell active:scale-[0.98] transition-transform whitespace-nowrap", 
                        isSelected ? "text-red-800 bg-red-100/50" : "text-red-700 bg-red-50/25 hover:bg-red-100"
                      )}
                      title="Click to view detailed quality math audit"
                    >
                      <div className="flex items-center justify-end gap-1 ">
                        <Calculator className="h-[10px] w-[10px] opacity-40 shrink-0 group-hover/cell:opacity-100 text-red-600" />
                        <span>{weightMt.toFixed(3)}</span>
                      </div>

                      {/* Quantitative Audit Trace Popover */}
                      {auditPopoverId === r.final_arrival_id && (
                        <div 
                          onClick={(e) => e.stopPropagation()} 
                          className="absolute right-0 top-10 bg-[#E8E6E1] border-2 border-white shadow-2xl p-3 z-50 rounded text-slate-800 text-[10px] w-64 text-left font-sans font-medium space-y-2"
                        >
                          <div className="bg-[#D94B5A] text-white p-1 text-[9.5px] font-black uppercase flex justify-between items-center">
                            <span>📊 QUANTITATIVE AUDIT TRACE</span>
                            <button 
                              onClick={(ev) => {
                                ev.stopPropagation();
                                setAuditPopoverId(null);
                              }}
                              className="cursor-pointer bg-red-600 px-1 hover:bg-red-700 font-extrabold text-[8px] rounded text-white"
                            >
                              CLOSE
                            </button>
                          </div>
                          
                          {(() => {
                            const { moisture, dust, ncv } = getQualityParams(r);
                            const areaClean = String(r.arrival_area_name || '').toLowerCase();
                            const isDaisee = areaClean.includes("daisee");
                            
                            let month = 0;
                            const dateToCheck = r.po_date || r.date;
                            if (dateToCheck) {
                              const d = new Date(dateToCheck);
                              if (!isNaN(d.getTime())) month = d.getMonth();
                            }
                            
                            const isJanToJune = month >= 0 && month <= 5;
                            let moistureLimit = 16;
                            if (isJanToJune) {
                              moistureLimit = isDaisee ? 18 : 16;
                            } else {
                              moistureLimit = isDaisee ? 20 : 18;
                            }
                            
                            const excessMoisture = moisture > moistureLimit ? (moisture - moistureLimit) : 0;
                            const totalDed = excessMoisture + dust + ncv;
                            const grossRawVal = r.weight_qtl ? (r.weight_qtl / 10) : 0;
                            const calculatedNetVal = grossRawVal * (1 - totalDed / 100);

                            return (
                              <div className="space-y-1.5 leading-tight text-slate-700 font-sans">
                                <div className="flex justify-between border-b border-gray-400 pb-1 font-semibold text-slate-900">
                                  <span>Lorry Number:</span>
                                  <span className="font-mono text-indigo-950 font-black uppercase">{r.lorry_number || (r as any).lorry_no || (r as any).vehicle_no || 'WB-XXXX'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Operating Area:</span>
                                  <span className="font-bold underline">{r.arrival_area_name || 'Standard Area'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>DAISEE status:</span>
                                  <span className="font-bold">{isDaisee ? "✅ YES (Bonus allowance)" : "❌ NO"}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Season context:</span>
                                  <span className="font-bold lowercase first-letter:uppercase">{(isJanToJune ? "Jan-Jun (Wet)" : "Jul-Dec (Dry)")}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Moisture threshold limit:</span>
                                  <span className="bg-amber-100 text-amber-950 px-1 font-mono font-bold rounded">{moistureLimit}%</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Recorded Moisture:</span>
                                  <span className="font-semibold">{moisture}%</span>
                                </div>
                                <div className="flex justify-between text-red-600 font-bold">
                                  <span>Excess Deduct pct:</span>
                                  <span>+{excessMoisture.toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                  <span>Dust & NCV limits:</span>
                                  <span>+{dust}% + {ncv}%</span>
                                </div>
                                <div className="flex justify-between border-t border-dashed border-gray-400 pt-1 text-red-700 font-black uppercase text-[9px]">
                                  <span>Total cumulative deductions:</span>
                                  <span>{totalDed.toFixed(1)}%</span>
                                </div>

                                <div className="bg-white p-1.5 font-mono text-[9px] text-[#D94B5A] border border-slate-300 rounded leading-none">
                                  <p className="font-bold uppercase text-[8px] text-slate-500">RECONCILIATION MATH:</p>
                                  <p className="mt-1">{grossRawVal.toFixed(3)} MT * (1 - {totalDed.toFixed(1)}%)</p>
                                  <p className="text-red-700 font-black mt-1.5">Net weight = {calculatedNetVal.toFixed(3)} MT</p>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="text-center px-1.5" onClick={(e) => e.stopPropagation()}>
                      {isVoid ? (
                        <div className="flex items-center justify-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-bold text-[10px] uppercase border border-red-200">VOID</span>
                          {canEditOrDelete() && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onDeleteRecord(r.final_arrival_id, r.final_arrival_no); }}
                              className="p-1 text-red-600 hover:text-red-800 hover:bg-black/10 rounded transition-colors cursor-pointer"
                              title="Delete Permanently"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex justify-center gap-1.5">
                          <button 
                            onClick={() => onViewSlip(r)} 
                            className={cn(
                              "p-1 hover:bg-black/15 rounded transition-colors cursor-pointer",
                              isSelected ? "text-red-200 hover:text-white" : "text-red-600 hover:text-red-800"
                            )}
                            title="Open Detail Voucher Slip"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => onPrintSlip(r)} 
                            className={cn(
                              "p-1 hover:bg-black/15 rounded transition-colors cursor-pointer",
                              isSelected ? "text-indigo-200 hover:text-white" : "text-indigo-600 hover:text-indigo-800"
                            )}
                            title="Print Arrival Slip"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {canEditOrDelete() && (
                            <>
                              <button 
                                onClick={() => {
                                  if (!enforceEditOrDeletePermission("Edit")) return;
                                  onEditRecord(r);
                                }} 
                                className={cn(
                                  "p-1 hover:bg-black/15 rounded transition-colors cursor-pointer",
                                  isSelected ? "text-blue-200 hover:text-white" : "text-blue-600 hover:text-blue-800"
                                )}
                                title="Edit Record"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => onDeleteRecord(r.final_arrival_id, r.final_arrival_no)} 
                                className={cn(
                                  "p-1 hover:bg-black/15 rounded transition-colors cursor-pointer",
                                  isSelected ? "text-gray-200 hover:text-white" : "text-red-600 hover:text-red-800"
                                )}
                                title="Cancel Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <PaginationControls
        currentPage={currentPage}
        totalItems={filteredRecords.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
