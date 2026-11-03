import React from 'react';
import PrintModal from '../PrintModal';

interface FinalArrivalPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  printData: any;
  setPrintData: (d: any) => void;
  printColumns: any;
  updatePrintRow: (idx: number, field: string, val: any) => void;
  unitList: string[];
}

export function FinalArrivalPrintModal({
  isOpen,
  onClose,
  printData,
  setPrintData,
  printColumns,
  updatePrintRow,
  unitList
}: FinalArrivalPrintModalProps) {
  if (!printData) return null;

  const printTotalQty = printData?.rows?.reduce((acc: number, r: any) => acc + (Number(r.quantity_rcpt) || 0), 0) || 0;
  const printTotalGrossWt = printData?.rows?.reduce((acc: number, r: any) => acc + (Number(r.gross_wt) || 0), 0) || 0;
  const printTotalNetWt = printData?.rows?.reduce((acc: number, r: any) => acc + (Number(r.net_wt) || 0), 0) || 0;

  return (
    <PrintModal
      isOpen={isOpen}
      onClose={onClose}
      title="MARKS & QUALITY RECEIVED [MILL COPY - CONTINUOUS PRINT FORM]"
      showTip={false}
    >
      <div className="p-4 bg-[#a0a0a0] flex justify-center overflow-x-auto print:bg-white print:p-0">
        <div className="print-continuous-paper-container flex bg-white shadow-2xl border border-gray-400 select-text pr-px print:shadow-none print:border-none">
          {/* Left Tractor Feed band with holes */}
          <div id="tractor-feed-holes-left" className="w-[32px] bg-[#fdfaf2] border-r border-red-200 flex flex-col justify-between py-6 shrink-0 ">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="w-3.5 h-3.5 bg-[#403c34]/50 rounded-full mx-auto shadow-[inset_1.5px_1.5px_2.5px_rgba(0,0,0,0.7)] opacity-85 border border-amber-900/10"></div>
            ))}
          </div>

          {/* Main Print Slip Sheet */}
          <div id="print-sheet-wrapper" className="w-[840px] bg-white p-6 md:p-8 flex flex-col justify-between select-text text-black print:p-0 print:w-full">
            {/* Slip Header */}
            <div>
              <div className="flex justify-between items-start">
                <div className="text-left max-w-[320px]">
                  <h1 className="font-sans font-black text-xl tracking-tight text-red-600 leading-none">BALLY JUTE COMPANY LIMITED</h1>
                  <p className="text-[10px] font-bold text-red-700/95 tracking-wide mt-1 uppercase font-mono">AUTHORIZED MILL PREMISES</p>
                </div>
                
                <div className="text-center shrink-0 border-b-2 border-red-600 pb-1.5 px-4">
                  <h2 className="font-serif font-black text-[20px] text-red-600 uppercase tracking-widest leading-none">FINAL ARRIVAL REGISTER</h2>
                  <p className="text-[10px] font-black tracking-widest text-red-700 uppercase mt-1">MARKS & QUALITY RECEIVED</p>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-extrabold text-[11px] text-red-700 uppercase border-2 border-red-600 px-2 py-0.5 tracking-widest font-mono">MILL COPY</span>
                </div>
              </div>

              {/* Master Metadata Box-Wise Grid */}
              <div className="border border-red-600 mt-5 text-[11px] font-bold text-red-700 bg-white">
                {/* Row 1 */}
                <div className="grid grid-cols-12 border-b border-red-600">
                  <div className="col-span-8 flex items-center px-2 py-1.5 border-r border-red-600">
                    <span className="shrink-0 font-black uppercase text-[10px] tracking-wider text-red-800 mr-2">FROM :</span>
                    <input
                      id="printdata_supplier_modal"
                      name="printdata_supplier"
                      aria-label="printdata supplier"
                      value={printData.supplier || ''} 
                      onChange={(e) => setPrintData({...printData, supplier: e.target.value})}
                      className="flex-1 bg-transparent border-0 p-0 focus:ring-0 focus:outline-none uppercase text-black font-black text-[11.5px]"
                    />
                  </div>
                  <div className="col-span-4 flex items-center px-2 py-1.5">
                    <span className="shrink-0 font-black uppercase text-[10px] tracking-wider text-red-800 mr-2">M.R. NO. :</span>
                    <input
                      id="printdata_mr_no_modal"
                      name="printdata_mr_no"
                      aria-label="printdata mr no"
                      value={printData.mr_no || ''} 
                      onChange={(e) => setPrintData({...printData, mr_no: e.target.value})}
                      className="flex-1 bg-transparent border-0 p-0 focus:ring-0 focus:outline-none uppercase text-black font-mono font-black text-[11.5px]"
                    />
                  </div>
                </div>
                {/* Row 2 */}
                <div className="grid grid-cols-12">
                  <div className="col-span-4 flex items-center px-2 py-1.5 border-r border-red-600">
                    <span className="shrink-0 font-black uppercase text-[10px] tracking-wider text-red-800 mr-2">DATE :</span>
                    <input
                      id="printdata_mr_date_modal"
                      name="printdata_mr_date"
                      aria-label="printdata mr date"
                      type="date"
                      value={printData.mr_date || ''} 
                      onChange={(e) => setPrintData({...printData, mr_date: e.target.value})}
                      className="flex-1 bg-transparent border-0 p-0 focus:ring-0 focus:outline-none text-black font-black text-xs"
                    />
                  </div>
                  <div className="col-span-4 flex items-center px-2 py-1.5 border-r border-red-600">
                    <span className="shrink-0 font-black uppercase text-[10px] tracking-wider text-red-800 mr-2">ORDER NO. :</span>
                    <input
                      id="printdata_po_no_modal"
                      name="printdata_po_no"
                      aria-label="printdata po no"
                      value={printData.po_no || ''} 
                      onChange={(e) => setPrintData({...printData, po_no: e.target.value})}
                      className="flex-1 bg-transparent border-0 p-0 focus:ring-0 focus:outline-none uppercase text-black font-mono font-black text-[11.5px]"
                    />
                  </div>
                  <div className="col-span-4 flex items-center px-2 py-1.5">
                    <span className="shrink-0 font-black uppercase text-[10px] tracking-wider text-red-800 mr-2">DATE :</span>
                    <input
                      id="printdata_po_date_modal"
                      name="printdata_po_date"
                      aria-label="printdata po date"
                      type="date"
                      value={printData.po_date || ''} 
                      onChange={(e) => setPrintData({...printData, po_date: e.target.value})}
                      className="flex-1 bg-transparent border-0 p-0 focus:ring-0 focus:outline-none text-black font-black text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Table Container */}
              <div className="mt-4 border border-red-600 bg-white">
                <table className="w-full border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-red-600 text-white font-extrabold border-b border-red-600 shrink-0 h-9">
                      {printColumns.crop_year && <th className="border-r border-red-600 text-center uppercase p-0.5 w-[50px] text-[9.5px]" rowSpan={2}>Crop</th>}
                      {printColumns.marka && <th className="border-r border-red-600 text-center uppercase p-0.5 w-[65px] text-[9.5px]" rowSpan={2}>Mark</th>}
                      {printColumns.quality && <th className="border-r border-red-600 text-left uppercase pl-2 p-0.5 w-[140px] text-[9.5px]" rowSpan={2}>Quality</th>}
                      {printColumns.quantity_rcpt && <th className="border-r border-red-600 text-right uppercase pr-2 p-0.5 w-[65px] text-[9.5px]" rowSpan={2}>Quantity</th>}
                      {printColumns.unit && <th className="border-r border-red-600 text-center uppercase p-0.5 w-[50px] text-[9.5px]" rowSpan={2}>Unit</th>}
                      {printColumns.claim && <th className="border-r border-red-600 text-center uppercase p-0.5 w-[60px] text-[9.5px]" rowSpan={2}>Claim</th>}
                      {printColumns.gross_wt && <th className="border-r border-red-600 text-right uppercase pr-2 p-0.5 w-[75px] text-[9.5px]" rowSpan={2}>Gross Wt.</th>}
                      {printColumns.moisture_pct && <th className="border-r border-red-600 text-center uppercase p-0.5 w-[50px] text-[8.5px] no-print" rowSpan={2}>Moisture<br/>% Kg.</th>}
                      {printColumns.dust_pct && <th className="border-r border-red-600 text-center uppercase p-0.5 w-[50px] text-[8.5px] no-print" rowSpan={2}>Dust<br/>% Kg.</th>}
                      {printColumns.ncv_pct && <th className="border-r border-red-600 text-center uppercase p-0.5 w-[50px] text-[8.5px] no-print" rowSpan={2}>NCV<br/>% Kg.</th>}
                      {printColumns.net_wt && <th className="border-r border-red-600 text-right uppercase pr-2 p-0.5 w-[75px] text-[9.5px]" rowSpan={2}>Net Wt.</th>}
                      {printColumns.settlement && <th className="border-r border-red-600 text-center uppercase p-0.5" colSpan={4}>Settlement</th>}
                      {printColumns.rate && <th className="text-right uppercase pr-2 p-0.5 w-[60px] text-[9.5px]" rowSpan={2}>Rate</th>}
                    </tr>
                    {printColumns.settlement && (
                      <tr className="bg-red-600 text-white font-bold border-b border-red-600 h-6">
                        <th className="border-r border-red-500 text-center p-0.5 text-[8.2px] uppercase w-[55px]">Grade</th>
                        <th className="border-r border-red-500 text-center p-0.5 text-[8.2px] uppercase w-[50px] no-print">Moisture</th>
                        <th className="border-r border-red-500 text-center p-0.5 text-[8.2px] uppercase w-[45px] no-print">Dust</th>
                        <th className="border-r border-red-600 text-center p-0.5 text-[8.2px] uppercase w-[55px]">Prem./Less</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-red-200">
                    {printData.rows.map((row: any, rIdx: number) => {
                      const isRowEmpty = !row.crop_year && !row.marka && !row.quality;
                      return (
                        <tr key={rIdx} className="h-7.5 hover:bg-red-50/50">
                          {printColumns.crop_year && (
                            <td className="border-r border-red-200 text-center p-0">
                              <input
                                value={row.crop_year || ''} 
                                onChange={(e) => updatePrintRow(rIdx, 'crop_year', e.target.value)}
                                className="w-full bg-transparent text-center border-none p-0 focus:ring-0 focus:outline-none text-[10px] font-bold font-mono text-black"
                                placeholder="--"
                              />
                            </td>
                          )}
                          {printColumns.marka && (
                            <td className="border-r border-red-200 text-center p-0">
                              <input
                                value={row.marka || ''} 
                                onChange={(e) => updatePrintRow(rIdx, 'marka', e.target.value)}
                                className="w-full bg-transparent text-center border-none p-0 focus:ring-0 focus:outline-none text-[10px] font-bold uppercase text-black"
                                placeholder="--"
                              />
                            </td>
                          )}
                          {printColumns.quality && (
                            <td className="border-r border-red-200 px-1 p-0">
                              <input
                                value={row.quality || ''} 
                                onChange={(e) => updatePrintRow(rIdx, 'quality', e.target.value)}
                                className="w-full bg-transparent border-none p-0 focus:ring-0 focus:outline-none text-[10px] uppercase font-bold text-black pl-1.5"
                                placeholder="--"
                              />
                            </td>
                          )}
                          {printColumns.quantity_rcpt && (
                            <td className="border-r border-red-200 text-right p-0">
                              <input
                                type={isRowEmpty ? "text" : "number"}
                                value={row.quantity_rcpt || ''} 
                                onChange={(e) => updatePrintRow(rIdx, 'quantity_rcpt', e.target.value)}
                                className="w-full bg-transparent text-right border-none p-0 focus:ring-0 focus:outline-none text-[10px] font-bold font-mono text-blue-800 pr-1.5"
                                placeholder="--"
                              />
                            </td>
                          )}
                          {printColumns.unit && (
                            <td className="border-r border-red-200 text-center p-0">
                              <select
                                value={row.unit || 'BALES'} 
                                onChange={(e) => updatePrintRow(rIdx, 'unit', e.target.value)}
                                className="w-full bg-transparent text-center border-none p-0 focus:ring-0 focus:outline-none text-[10px] uppercase font-bold text-black cursor-pointer"
                              >
                                {Array.from(new Set([...unitList, row.unit].filter(Boolean))).map((u: string) => (
                                  <option key={u} value={u}>{u}</option>
                                ))}
                              </select>
                            </td>
                          )}
                          {printColumns.claim && (
                            <td className="border-r border-red-200 text-center p-0">
                              <input
                                value={row.claim_val || ''} 
                                onChange={(e) => updatePrintRow(rIdx, 'claim_val', e.target.value)}
                                className="w-full bg-transparent text-center border-none p-0 focus:ring-0 focus:outline-none text-[9.5px] text-black"
                                placeholder="--"
                              />
                            </td>
                          )}
                          {printColumns.gross_wt && (
                            <td className="border-r border-red-200 text-right p-0">
                              <input
                                value={row.gross_wt || ''} 
                                onChange={(e) => updatePrintRow(rIdx, 'gross_wt', e.target.value)}
                                className="w-full bg-transparent text-right border-none p-0 focus:ring-0 focus:outline-none text-[10px] font-bold font-mono text-black pr-1.5"
                                placeholder="--"
                              />
                            </td>
                          )}
                          {printColumns.moisture_pct && (
                            <td className="border-r border-red-200 text-center p-0 no-print">
                              <input
                                value={row.moisture_pct || ''} 
                                onChange={(e) => updatePrintRow(rIdx, 'moisture_pct', e.target.value)}
                                className="w-full bg-transparent text-center border-none p-0 focus:ring-0 focus:outline-none text-[10px] font-bold font-mono text-black"
                                placeholder="--"
                              />
                            </td>
                          )}
                          {printColumns.dust_pct && (
                            <td className="border-r border-red-200 text-center p-0 no-print">
                              <input
                                value={row.dust_pct || ''} 
                                onChange={(e) => updatePrintRow(rIdx, 'dust_pct', e.target.value)}
                                className="w-full bg-transparent text-center border-none p-0 focus:ring-0 focus:outline-none text-[10px] font-bold font-mono text-black"
                                placeholder="--"
                              />
                            </td>
                          )}
                          {printColumns.ncv_pct && (
                            <td className="border-r border-red-200 text-center p-0 no-print">
                              <input
                                value={row.ncv_pct || ''} 
                                onChange={(e) => updatePrintRow(rIdx, 'ncv_pct', e.target.value)}
                                className="w-full bg-transparent text-center border-none p-0 focus:ring-0 focus:outline-none text-[10px] font-bold font-mono text-black"
                                placeholder="--"
                              />
                            </td>
                          )}
                          {printColumns.net_wt && (
                            <td className="border-r border-red-200 text-right p-0">
                              <input
                                value={row.net_wt || ''} 
                                onChange={(e) => updatePrintRow(rIdx, 'net_wt', e.target.value)}
                                className="w-full bg-transparent text-right border-none p-0 focus:ring-0 focus:outline-none text-[10px] font-black font-mono text-red-700 pr-1.5"
                                placeholder="--"
                              />
                            </td>
                          )}
                          {printColumns.settlement && (
                            <>
                              <td className="border-r border-red-200 p-0 text-center">
                                <input
                                  value={row.settlement_grade || ''} 
                                  onChange={(e) => updatePrintRow(rIdx, 'settlement_grade', e.target.value)}
                                  className="w-full bg-transparent text-center border-none p-0 focus:ring-0 focus:outline-none text-[9.5px] uppercase"
                                  placeholder="--"
                                />
                              </td>
                              <td className="border-r border-red-200 p-0 text-center">
                                <input
                                  value={row.settlement_moisture || ''} 
                                  onChange={(e) => updatePrintRow(rIdx, 'settlement_moisture', e.target.value)}
                                  className="w-full bg-transparent text-center border-none p-0 focus:ring-0 focus:outline-none text-[9.5px]"
                                  placeholder="--"
                                />
                              </td>
                              <td className="border-r border-red-200 p-0 text-center">
                                <input
                                  value={row.settlement_dust || ''} 
                                  onChange={(e) => updatePrintRow(rIdx, 'settlement_dust', e.target.value)}
                                  className="w-full bg-transparent text-center border-none p-0 focus:ring-0 focus:outline-none text-[9.5px]"
                                  placeholder="--"
                                />
                              </td>
                              <td className="border-r border-red-200 p-0 text-center">
                                <input
                                  value={row.settlement_prem_less || ''} 
                                  onChange={(e) => updatePrintRow(rIdx, 'settlement_prem_less', e.target.value)}
                                  className="w-full bg-transparent text-center border-none p-0 focus:ring-0 focus:outline-none text-[9.5px]"
                                  placeholder="--"
                                />
                              </td>
                            </>
                          )}
                          {printColumns.rate && (
                            <td className="text-right p-0">
                              <input
                                value={row.rate || ''} 
                                onChange={(e) => updatePrintRow(rIdx, 'rate', e.target.value)}
                                className="w-full bg-transparent text-right border-none p-0 focus:ring-0 focus:outline-none text-[10px] font-bold font-mono text-black pr-1.5"
                                placeholder="--"
                              />
                            </td>
                          )}
                        </tr>
                      );
                    })}

                    {/* TOTAL ROW */}
                    <tr className="h-8.5 border-t-2 border-red-600 bg-red-50/30 text-red-700 font-extrabold ">
                      {((printColumns.crop_year ? 1 : 0) + (printColumns.marka ? 1 : 0) + (printColumns.quality ? 1 : 0)) > 0 && (
                        <td className="border-r border-red-600 text-center border-b border-red-600" colSpan={(printColumns.crop_year ? 1 : 0) + (printColumns.marka ? 1 : 0) + (printColumns.quality ? 1 : 0)}>
                          <span className="text-[10px] tracking-widest font-black uppercase">TOTALS:</span>
                        </td>
                      )}
                      {printColumns.quantity_rcpt && (
                        <td className="border-r border-red-600 text-right pr-1.5 font-mono text-black font-black text-[11px]">
                          {printTotalQty > 0 ? printTotalQty.toLocaleString() : '--'}
                        </td>
                      )}
                      {printColumns.unit && <td className="border-r border-red-600 border-b border-red-600"></td>}
                      {printColumns.claim && <td className="border-r border-red-600 border-b border-red-600"></td>}
                      {printColumns.gross_wt && (
                        <td className="border-r border-red-600 text-right pr-1.5 font-mono text-black font-black text-[11px]">
                          {printTotalGrossWt > 0 ? printTotalGrossWt.toFixed(3) : '--'}
                        </td>
                      )}
                      {printColumns.moisture_pct && <td className="border-r border-red-200 border-b border-red-600 no-print"></td>}
                      {printColumns.dust_pct && <td className="border-r border-red-200 border-b border-red-600 no-print"></td>}
                      {printColumns.ncv_pct && <td className="border-r border-red-600 border-b border-red-600 no-print"></td>}
                      {printColumns.net_wt && (
                        <td className="border-r border-red-600 text-right pr-1.5 font-mono text-red-700 font-black text-[11.5px]">
                          {printTotalNetWt > 0 ? printTotalNetWt.toFixed(3) : '--'}
                        </td>
                      )}
                      {printColumns.settlement && <td className="border-r border-red-600 border-b border-red-600" colSpan={4}></td>}
                      {printColumns.rate && <td className="text-right border-b border-red-600"></td>}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Remarks Section */}
              <div className="mt-3 text-[11px] font-bold text-red-700">
                <div className="flex items-start gap-1.5">
                  <span className="shrink-0 mt-0.5 uppercase tracking-wide">Remarks:</span>
                  <textarea
                    rows={2}
                    value={printData.remarks || ''} 
                    onChange={(e) => setPrintData({...printData, remarks: e.target.value})}
                    className="flex-1 bg-transparent border-b border-dashed border-red-300 p-0 focus:ring-0 focus:outline-none text-black text-[11px] font-black h-11 w-full resize-none leading-tight"
                    placeholder="No remarks registered. Click to write any custom remarks or specifications on-form..."
                  />
                </div>
              </div>

              {/* Sub Footer Box */}
              <div className="grid grid-cols-12 border border-red-600 mt-4 text-[10px] font-bold text-red-700 divide-x divide-red-600">
                <div className="col-span-5 p-2 flex flex-col justify-center">
                  <div className="flex items-center gap-1.5">
                    <span className="shrink-0 uppercase">Challan No & Date :</span>
                    <input
                      value={printData.challan_rr_no || ''} 
                      onChange={(e) => setPrintData({...printData, challan_rr_no: e.target.value})}
                      className="flex-1 bg-transparent border-none p-0 focus:ring-0 focus:outline-none text-black font-extrabold uppercase text-[10.5px]"
                    />
                  </div>
                </div>
                <div className="col-span-4 p-2 flex flex-col justify-center">
                  <div className="flex items-center gap-1.5">
                    <span className="shrink-0 uppercase">Lorry Number :</span>
                    <input
                      value={printData.lorry_number || ''} 
                      onChange={(e) => setPrintData({...printData, lorry_number: e.target.value})}
                      className="flex-1 bg-transparent border-none p-0 focus:ring-0 focus:outline-none text-black font-extrabold font-mono uppercase text-[10.5px]"
                    />
                  </div>
                </div>
                <div className="col-span-3 p-2 flex flex-col justify-center">
                  <div className="flex items-center gap-1.5">
                    <span className="shrink-0 uppercase">Stations :</span>
                    <input
                      value={printData.arrival_area_name || ''} 
                      onChange={(e) => setPrintData({...printData, arrival_area_name: e.target.value})}
                      className="flex-1 bg-transparent border-none p-0 focus:ring-0 focus:outline-none text-black font-extrabold uppercase text-[10.5px]"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Notes Terms & Conditions & Signatures Section */}
            <div className="grid grid-cols-12 mt-4 text-[8.2px] leading-tight text-red-700/90 pt-2.5">
              <div className="col-span-7 flex flex-col gap-1 border-r border-red-300 pr-4">
                <p className="font-black uppercase tracking-wider text-[8.5px] text-red-800">Note:</p>
                <p>1. Initiate your offer of settlement at an early date failing which we shall refer the matter to B.C.C.I for arbitrator.</p>
                <p>2. Seller must remove the bales within three days from the date of serving the Mill Receipt if the rates given on the Mill Receipt by the Buyers are not acceptable to them, failing which Buyer will treat the consignment as having been accepted and will not be responsible for its being used up.</p>
                <p>3. Net weight is reduced from gross weight to account for seasonal moisture excess exceeding DAISEE or standard limits, along with dust allowances. Deductions are determined strictly from authorized material inspections.</p>
                <p className="font-extrabold text-[9px] text-red-700 uppercase tracking-wide mt-1">ORIGINAL MUST BE ATTACHED WITH BILL/COPY</p>
              </div>
              <div className="col-span-5 flex flex-col justify-between pl-4 text-center">
                <p className="font-black text-[12px] tracking-wide uppercase font-sans text-red-800/90">For, BALLY JUTE COMPANY LIMITED</p>
                <div className="mt-7 flex flex-col items-center">
                  <div className="w-56 border-t border-dashed border-red-400"></div>
                  <p className="font-bold text-[9px] mt-1 text-red-700/80 uppercase">Authorised Signatory</p>
                </div>
              </div>
            </div>

          </div>

          {/* Right Tractor Feed band with holes */}
          <div id="tractor-feed-holes-right" className="w-[32px] bg-[#fdfaf2] border-l border-[#dcd8cc] flex flex-col justify-between py-6 shrink-0 ">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="w-3.5 h-3.5 bg-[#403c34]/50 rounded-full mx-auto shadow-[inset_1.5px_1.5px_2.5px_rgba(0,0,0,0.7)] opacity-85 border border-amber-900/10"></div>
            ))}
          </div>
        </div>
      </div>
    </PrintModal>
  );
}
