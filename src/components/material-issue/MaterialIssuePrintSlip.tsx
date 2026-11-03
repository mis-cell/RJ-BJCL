import React from 'react';

export interface MaterialIssuePrintSlipProps {
  master: any;
  details: any[];
}

export function MaterialIssuePrintSlip({ master, details }: MaterialIssuePrintSlipProps) {
  const paddedDetails = [...details];
  while (paddedDetails.length < 10) {
    paddedDetails.push({
      srl: paddedDetails.length + 1,
      crop: '',
      grade_name: '',
      marka: '',
      qty: '',
      weight_kgs: '',
      rate: ''
    });
  }

  const totalBales = details.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const totalWeight = details.reduce((sum, item) => sum + (Number(item.weight_kgs) || 0), 0);
  const totalAmount = details.reduce((sum, item) => sum + ((Number(item.qty) || 0) * (Number(item.rate) || 0)), 0);

  return (
    <div className="bg-[#525659] p-4 sm:p-8 min-h-[315mm] print:min-h-0 print:h-auto flex justify-center items-center print:block print:bg-white print:p-0 font-mono select-text w-full overflow-x-auto relative z-[9999]">
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-full-sheet {
            width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            padding: 12mm 15mm !important;
            margin: 0 auto !important;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
            box-sizing: border-box !important;
          }
          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
        .dotted-line-value {
          border-bottom: 1px dotted #000;
          padding-bottom: 2px;
        }
      `}</style>
      
      {/* Main continuous paper template wrapper */}
      <div className="print-full-sheet w-[210mm] min-h-[297mm] max-h-[297mm] bg-[#fbf9f4] shadow-2xl border border-gray-400 p-8 flex select-text text-black shrink-0 relative overflow-hidden print:shadow-none print:border-none print:bg-white box-sizing:border-box mt-16 print:mt-0">
        
        {/* Left Sprocket Feed Holes */}
        <div className="w-[32px] bg-transparent border-r border-dotted border-gray-400 flex flex-col justify-between py-6 shrink-0 pr-3 mr-3 print:hidden">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="w-3.5 h-3.5 bg-gray-300 rounded-full mx-auto shadow-inner border border-gray-400 opacity-60"></div>
          ))}
        </div>

        {/* Content Container */}
        <div className="flex-1 flex flex-col text-[11px] leading-relaxed">
          
          {/* Document Header */}
          <div>
            <div className="flex justify-between items-start">
              <div className="text-left w-2/3">
                <h1 className="font-sans font-black text-lg tracking-tight text-red-600 leading-none uppercase">
                  {master.party_name || "BALLY JUTE COMPANY LIMITED"}
                </h1>
                <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wide mt-1">AUTHORIZED MILL PREMISES</p>
              </div>
              <div className="text-right w-1/3">
                <span className="font-black text-[11px] text-red-700 uppercase border-2 border-red-600 px-2.5 py-0.5 tracking-widest font-mono">MATERIAL ISSUE</span>
                <p className="text-[9px] font-bold text-gray-500 mt-1 font-mono">Form No: JMCL-MAT-ISSUE</p>
              </div>
            </div>

            <div className="text-center my-2 border-y-2 border-double border-red-600 py-1">
              <h2 className="font-serif font-black text-sm tracking-widest text-[#0d47a1] uppercase">RAW MATERIAL ISSUE SLIP</h2>
            </div>

            {/* Document Meta (Reference keys row-by-row) */}
            <div className="grid grid-cols-2 gap-y-1 my-3 font-semibold text-slate-900 pr-4">
              {master.issue_type?.toUpperCase() === 'SELL' ? (
                <>
                  <div className="flex">
                    <span className="w-28 shrink-0 font-bold">Invoice / Sell No:</span>
                    <span className="flex-1 font-black text-[#D94B5A] uppercase">{master.issue_no}</span>
                  </div>
                  <div className="flex pl-4 border-l border-gray-300">
                    <span className="w-24 shrink-0 font-bold">Sale Date:</span>
                    <span className="flex-1 font-mono">{master.date}</span>
                  </div>

                  <div className="flex">
                    <span className="w-28 shrink-0 font-bold">Agreement No:</span>
                    <span className="flex-1 font-mono text-stone-850">{master.requisition_no || 'N/A'}</span>
                  </div>
                  <div className="flex pl-4 border-l border-gray-300">
                    <span className="w-24 shrink-0 font-bold">Challan / D.O:</span>
                    <span className="flex-1 font-mono uppercase text-stone-800">{master.batch_order || 'N/A'}</span>
                  </div>

                  <div className="flex">
                    <span className="w-28 shrink-0 font-bold">J.C.I Govt:</span>
                    <span className="flex-1 uppercase font-bold">{master.jci || 'No'}</span>
                  </div>
                  <div className="flex pl-4 border-l border-gray-300">
                    <span className="w-24 shrink-0 font-bold">Source Godown:</span>
                    <span className="flex-1 uppercase font-bold text-red-700">{master.godown || 'N/A'}</span>
                  </div>

                  <div className="flex col-span-2 mt-1 border-t border-dashed border-gray-300 pt-1">
                    <span className="w-28 shrink-0 font-bold text-slate-500 uppercase text-[9.5px]">Sender Company:</span>
                    <span className="flex-1 uppercase font-black text-indigo-900">BALLY JUTE COMPANY LIMITED</span>
                  </div>

                  <div className="flex col-span-2 mt-1 border-t border-dashed border-gray-300 pt-1">
                    <span className="w-28 shrink-0 font-bold text-slate-500 uppercase text-[9.5px]">Buyer Factory:</span>
                    <span className="flex-1 uppercase font-black text-[#D94B5A]">{master.department || 'N/A'}</span>
                  </div>

                  <div className="flex col-span-2 mt-0.5">
                    <span className="w-28 shrink-0 font-bold text-slate-500 uppercase text-[9.5px]">Delivery Dest:</span>
                    <span className="flex-1 uppercase font-bold text-stone-850">{master.destination_godown || 'N/A'}</span>
                  </div>

                  <div className="flex col-span-2 mt-0.5">
                    <span className="w-28 shrink-0 font-bold text-slate-500 uppercase text-[9.5px]">Buyer Contact:</span>
                    <span className="flex-1 uppercase font-medium text-stone-800">{master.received_by || 'N/A'}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex">
                    <span className="w-28 shrink-0 font-bold">Issue Voucher No:</span>
                    <span className="flex-1 font-black text-[#0d47a1] uppercase">{master.issue_no}</span>
                  </div>
                  <div className="flex pl-4 border-l border-gray-300">
                    <span className="w-24 shrink-0 font-bold">Date:</span>
                    <span className="flex-1 font-mono">{master.date}</span>
                  </div>
                  
                  <div className="flex">
                    <span className="w-28 shrink-0 font-bold">Financial Year:</span>
                    <span className="flex-1 font-mono">{master.financial_year || '2026-2027'}</span>
                  </div>
                  <div className="flex pl-4 border-l border-gray-300">
                    <span className="w-24 shrink-0 font-bold">Issue Type:</span>
                    <span className="flex-1 font-black uppercase text-stone-800">{master.issue_type}</span>
                  </div>

                  <div className="flex">
                    <span className="w-28 shrink-0 font-bold">Department:</span>
                    <span className="flex-1 uppercase font-bold">{master.department}</span>
                  </div>
                  <div className="flex pl-4 border-l border-gray-300">
                    <span className="w-24 shrink-0 font-bold">Godown:</span>
                    <span className="flex-1 uppercase font-bold">{master.godown}</span>
                  </div>

                  <div className="flex">
                    <span className="w-28 shrink-0 font-bold">Shift:</span>
                    <span className="flex-1 uppercase font-bold">{master.mill_shift}</span>
                  </div>
                  <div className="flex pl-4 border-l border-gray-300">
                    <span className="w-24 shrink-0 font-bold">Stock Group:</span>
                    <span className="flex-1 uppercase font-bold">{master.stock_group}</span>
                  </div>

                  {master.requisition_no && (
                    <div className="flex">
                      <span className="w-28 shrink-0 font-bold">{master.issue_type?.toLowerCase() === 'sale' ? 'Contract No:' : 'Requisition No:'}</span>
                      <span className="flex-1 uppercase font-bold text-red-700">{master.requisition_no}</span>
                    </div>
                  )}
                  {master.gate_pass_no && (
                    <div className="flex pl-4 border-l border-gray-300">
                      <span className="w-24 shrink-0 font-bold">Gate Pass:</span>
                      <span className="flex-1 uppercase font-bold">{master.gate_pass_no}</span>
                    </div>
                  )}
                  {master.challan_no && (
                    <div className="flex">
                      <span className="w-28 shrink-0 font-bold">Challan No:</span>
                      <span className="flex-1 uppercase font-bold">{master.challan_no}</span>
                    </div>
                  )}
                  {(master?.lorry_number || master?.lorry_no || master?.vehicle_no) && (
                    <div className="flex pl-4 border-l border-gray-300">
                      <span className="w-24 shrink-0 font-bold">Lorry Number:</span>
                      <span className="flex-1 uppercase font-bold">{master?.lorry_number || master?.lorry_no || master?.vehicle_no}</span>
                    </div>
                  )}
                  {master.party_name && (
                    <div className="flex col-span-2 mt-1 border-t border-dashed border-gray-300 pt-1">
                      <span className="w-28 shrink-0 font-bold text-indigo-900">Company / Party:</span>
                      <span className="flex-1 uppercase font-black text-indigo-900">{master.party_name}</span>
                    </div>
                  )}
                  {master.destination_godown && (
                    <div className="flex col-span-2 mt-1 border-t border-dashed border-gray-300 pt-1">
                      <span className="w-28 shrink-0 font-bold text-emerald-800">Destination Gdn:</span>
                      <span className="flex-1 uppercase font-black text-emerald-800">{master.destination_godown}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Detail Rows Grid Table */}
            <div className="border border-black mt-4 bg-white min-h-[300px]">
              {master.issue_type?.toUpperCase() === 'SELL' ? (
                <table className="w-full border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-emerald-50 border-b border-black text-center font-bold uppercase">
                      <th className="px-1 py-1 border-r border-black w-8">Srl</th>
                      <th className="px-1 py-1 border-r border-black w-16">Crop Year</th>
                      <th className="px-1 py-1 border-r border-black">Grade</th>
                      <th className="px-1 py-1 border-r border-black">Marka</th>
                      <th className="px-1 py-1 border-r border-black text-right w-16">Qty (Bales)</th>
                      <th className="px-1 py-1 border-r border-black text-right w-20">Weight (M.T)</th>
                      <th className="px-1 py-1 border-r border-black text-right w-20">Price (₹)</th>
                      <th className="px-1 py-1 text-right w-24">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-300 font-semibold text-slate-800">
                    {paddedDetails.map((row, idx) => (
                      <tr key={idx} className="h-6 font-mono">
                        <td className="px-1 text-center border-r border-gray-300 text-[9px]">{row.srl}</td>
                        <td className="px-1 border-r border-gray-300 text-center text-[9px]">{row.crop || ''}</td>
                        <td className="px-1 border-r border-gray-300 uppercase text-[9px]">{row.grade_name || ''}</td>
                        <td className="px-1 border-r border-gray-300 uppercase text-[9px]">{row.marka || ''}</td>
                        <td className="px-1 border-r border-gray-300 text-right font-bold text-stone-900">
                          {(row.qty !== "" && row.qty != null) ? Number(row.qty).toFixed(2) : ''}
                        </td>
                        <td className="px-1 border-r border-gray-300 text-right font-bold text-stone-900">
                          {(row.weight_kgs !== "" && row.weight_kgs != null) ? (Number(row.weight_kgs) / 1000).toFixed(3) : ''}
                        </td>
                        <td className="px-1 border-r border-gray-300 text-right font-bold text-emerald-800">
                          {(row.rate !== "" && row.rate != null) ? Number(row.rate).toFixed(2) : ''}
                        </td>
                        <td className="px-1 text-right font-bold text-emerald-950">
                          {(row.qty !== "" && row.qty != null && row.rate !== "" && row.rate != null) ? (Number(row.qty) * Number(row.rate)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                        </td>
                      </tr>
                    ))}
                    {/* Totals Summary Row */}
                    <tr className="bg-emerald-50 border-t border-black font-extrabold text-[#D94B5A]">
                      <td colSpan={4} className="px-2 text-right uppercase py-1">TOTAL OUTWARD SUMMARY :</td>
                      <td className="px-1 text-right font-black border-r border-gray-300">{totalBales !== undefined ? totalBales.toFixed(2) : '-'}</td>
                      <td className="px-1 text-right font-black border-r border-gray-300">{(totalWeight / 1000).toFixed(3)}</td>
                      <td className="px-1 text-right font-black border-r border-gray-300">&mdash;</td>
                      <td className="px-1 text-right font-black">₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <table className="w-full border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-gray-100 border-b border-black text-center font-bold uppercase">
                      <th className="px-2 py-1.5 border-r border-black w-10">Srl</th>
                      <th className="px-2 py-1.5 border-r border-black w-24">Crop Year</th>
                      <th className="px-2 py-1.5 border-r border-black">Grade</th>
                      <th className="px-2 py-1.5 border-r border-black">Marka / Logo</th>
                      <th className="px-2 py-1.5 border-r border-black w-28 text-right">Qty (Bales)</th>
                      <th className="px-2 py-1.5 text-right w-32">Weight (M.T)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-300 font-semibold text-slate-800">
                    {paddedDetails.map((row, idx) => (
                      <tr key={idx} className="h-6 font-mono">
                        <td className="px-2 text-center border-r border-gray-300 text-[9.5px]">{row.srl}</td>
                        <td className="px-2 border-r border-gray-300 text-center text-[9.5px]">{row.crop || ''}</td>
                        <td className="px-2 border-r border-gray-300 uppercase text-[9.5px]">{row.grade_name || ''}</td>
                        <td className="px-2 border-r border-gray-300 uppercase text-[9.5px]">{row.marka || ''}</td>
                        <td className="px-2 border-r border-gray-300 text-right font-bold text-stone-900">
                          {(row.qty !== "" && row.qty != null) ? Number(row.qty).toFixed(2) : ''}
                        </td>
                        <td className="px-2 text-right font-bold text-stone-900">
                          {(row.weight_kgs !== "" && row.weight_kgs != null) ? (Number(row.weight_kgs) / 1000).toFixed(3) : ''}
                        </td>
                      </tr>
                    ))}
                    {/* Totals Summary Row */}
                    <tr className="bg-gray-50 border-t border-black font-extrabold text-[#0d47a1]">
                      <td colSpan={4} className="px-3 text-right uppercase py-1.5">TOTAL ISSUED QUANTITY SUMMARY :</td>
                      <td className="px-2 text-right font-black border-r border-gray-300">{totalBales !== undefined ? totalBales.toFixed(2) : '-'}</td>
                      <td className="px-2 text-right font-black">{(totalWeight / 1000).toFixed(3)}</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>

            {/* Special Instructions & Remarks Row */}
            <div className="grid grid-cols-12 gap-2 mt-4 items-start">
              <div className="col-span-8 flex items-start gap-1 font-semibold text-slate-800">
                <span className="font-bold shrink-0">Remarks / Clause :</span>
                <p className="italic text-gray-700 leading-snug">{master.remarks || 'Standard Material Issue against Requisition/Contract.'}</p>
              </div>
              <div className="col-span-4 flex items-start gap-1 font-semibold text-slate-800 justify-end">
                <span className="font-bold shrink-0">Print Ref:</span>
                <span className="font-mono text-stone-600 truncate">STANDARD_ISSUE</span>
              </div>
            </div>
          </div>

          <div className="flex-1" />

          {/* Audit Signatures */}
          <div className="flex justify-between items-end mt-12 pb-4">
            <div className="text-left w-1/4">
              {master.issued_by ? (
                <div>
                  <p className="font-mono text-[9px] text-slate-500 lowercase italic normal-case font-medium mb-1">Digitally Issued By</p>
                  <p className="font-sans text-xs text-indigo-900 tracking-wider font-extrabold mb-1 truncate">{master.issued_by}</p>
                  <div className="border-t border-black pt-1 font-bold text-[10.5px]">STOREKEEPER SIGNATURE</div>
                </div>
              ) : (
                <div>
                  <div className="w-full border-t border-black mb-1"></div>
                  <p className="font-bold text-[10.5px]">PREPARED BY</p>
                </div>
              )}
            </div>
            
            <div className="text-center w-1/4">
              <div className="w-full border-t border-black mb-1"></div>
              <p className="font-bold text-[10.5px] uppercase">{master.issue_type?.toLowerCase() === 'sale' ? 'SALES MANAGER' : 'GODOWN IN-CHARGE'}</p>
            </div>

            <div className="text-right w-1/4">
              {master.received_by ? (
                <div>
                  <p className="font-mono text-[9px] text-slate-500 lowercase italic normal-case font-medium mb-1">Digitally Received By</p>
                  <p className="font-sans text-xs text-indigo-900 tracking-wider font-extrabold mb-1 truncate text-right">{master.received_by}</p>
                  <div className="border-t border-black pt-1 font-bold text-[10.5px] text-right">DEPARTMENT HEAD / SIRDAR</div>
                </div>
              ) : (
                <div>
                  <div className="w-full border-t border-black mb-1"></div>
                  <p className="font-bold text-[10.5px] text-right">DEPARTMENT HEAD</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
