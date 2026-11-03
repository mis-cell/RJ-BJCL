import React from 'react';
import { Sauda } from '../types';
import { cleanSaudaNo } from '../lib/utils';

interface Props {
  sauda: Sauda;
  onClose?: () => void;
  isPreview?: boolean;
}

export default function SaudaPrintSlip({ sauda, isPreview = false }: Props) {
  const rawQualityRows = sauda.quality_details || [];

  // Contract-level defaults if no rows exist at all
  const contractQuality = (sauda as any).quality || '';
  const contractRate = Number(sauda.b_rate) || 0;

  const defaultAgency = String(
    sauda.agency ||
    rawQualityRows.find((r: any) => r.agency)?.agency ||
    (Array.isArray(rawQualityRows.find((r: any) => Array.isArray(r.agencies) && r.agencies.length > 0)?.agencies)
      ? rawQualityRows.find((r: any) => Array.isArray(r.agencies) && r.agencies.length > 0)!.agencies!.join(', ')
      : '')
  ).trim();

  const defaultMarka = String(
    sauda.marks ||
    rawQualityRows.find((r: any) => r.marka)?.marka ||
    (Array.isArray(rawQualityRows.find((r: any) => Array.isArray(r.markas) && r.markas.length > 0)?.markas)
      ? rawQualityRows.find((r: any) => Array.isArray(r.markas) && r.markas.length > 0)!.markas!.join(', ')
      : '')
  ).trim();

  // Process rows cleanly without unnecessary cross-product duplication
  const expandedList: any[] = [];
  rawQualityRows.forEach(row => {
    // 1. If row has explicit applicableCombinations array with items
    if (Array.isArray(row.applicableCombinations) && row.applicableCombinations.length > 0) {
      const enabledCombs = row.applicableCombinations.filter((comb: any) => comb.enabled !== false && (comb.agency || comb.marka || comb.quality || comb.rs));
      if (enabledCombs.length > 0) {
        enabledCombs.forEach((comb: any) => {
          expandedList.push({
            agency: String(comb.agency || row.agency || defaultAgency || '').trim(),
            marka: String(comb.marka || row.marka || defaultMarka || '').trim(),
            quality: String(comb.quality || row.quality || '').trim(),
            rs: comb.rs ? Number(comb.rs) : (row.rs ? Number(row.rs) : 0),
            qty: Number(comb.qty) || Number(row.qty) || 0
          });
        });
        return;
      }
    }

    // 2. Otherwise render the row directly as specified in the form
    const rowAgency = String(row.agency || (Array.isArray(row.agencies) && row.agencies.length > 0 ? row.agencies.join(', ') : '') || defaultAgency).trim();
    const rowMarka = String(row.marka || (Array.isArray(row.markas) && row.markas.length > 0 ? row.markas.join(', ') : '') || defaultMarka).trim();
    const rowQuality = String(row.quality || '').trim();
    const rowRs = row.rs !== undefined && row.rs !== null && String(row.rs).trim() !== '' ? Number(row.rs) : 0;

    if (rowQuality || rowRs > 0 || rowAgency || rowMarka) {
      expandedList.push({
        agency: rowAgency,
        marka: rowMarka,
        quality: rowQuality,
        rs: rowRs,
        qty: Number(row.qty) || 0
      });
    }
  });

  const qualityRows = expandedList.length > 0 
    ? expandedList 
    : (rawQualityRows.length > 0
        ? rawQualityRows.map(r => ({
            ...r,
            agency: r.agency || defaultAgency || '',
            marka: r.marka || defaultMarka || '',
            quality: r.quality || '',
            rs: Number(r.rs) || 0
          }))
        : [{ agency: defaultAgency, marka: defaultMarka, quality: contractQuality, rs: contractRate, qty: 0 }]
      );
  
  // Pad local qualities to at least 7 rows to match physical slip layout
  const paddedQualities = [...qualityRows];
  while (paddedQualities.length < 7) {
    paddedQualities.push({ quality: '', percentage: 0, rate: 0, qty: 0, rs: 0, marka: '', agency: '' });
  }

  // Clean session string (e.g. 2026-2027)
  const rawSession = String(sauda.session || '2026-2027').trim();
  const sessionStr = rawSession.replace(/^BJCL\//i, '').replace(/\/.*$/, '').trim() || '2026-2027';

  // Format order number cleanly (e.g. BJCL/2026-2027/0585)
  const orderNoDisplay = cleanSaudaNo(sauda.sauda_no, sessionStr);

  // Format any rate values nicely
  const getBrateString = () => {
    if (sauda.b_rate) {
      return `${Number(sauda.b_rate).toLocaleString('en-IN')}/-`;
    }
    const firstWithRate = qualityRows.find(q => q.rs && Number(q.rs) > 0);
    if (firstWithRate) {
      return `${Number(firstWithRate.rs).toLocaleString('en-IN')}/-`;
    }
    return contractRate > 0 ? `${Number(contractRate).toLocaleString('en-IN')}/-` : '';
  };

  return (
    <div className={
      isPreview
        ? "bg-white w-full max-w-[680px] mx-auto p-4 sm:p-6 flex flex-col font-sans text-black box-border text-[11px] leading-relaxed relative overflow-x-auto border border-slate-300 rounded-xl shadow-sm"
        : "bg-white w-full max-w-[148mm] sm:w-[148mm] min-h-[210mm] mx-auto p-3 sm:p-6 flex flex-col font-sans text-black print:w-[148mm] print:h-[210mm] print:max-h-[210mm] print:p-6 print:m-0 box-border text-[10px] sm:text-[11px] leading-relaxed relative overflow-x-auto page-break-inside-avoid shadow-lg print:shadow-none"
    }>
       {/* Invoice/Contract Header */}
       <div className="flex justify-between items-center mb-2 flex-none border-b-2 border-black pb-2">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded border-2 border-black flex items-center justify-center font-serif font-black text-xs text-black shrink-0">
                BJ
             </div>
             <div className="flex flex-col">
                <div className="font-extrabold text-[15px] text-black leading-tight tracking-tight">BALLY JUTE COMPANY LIMITED</div>
                <div className="text-[10px] font-bold text-neutral-800 tracking-wider font-mono">SAUDA CONTRACT SLIP • {sessionStr}</div>
             </div>
          </div>
          <div className="flex flex-col items-end text-right">
             <div className="font-bold text-[15px] sm:text-[16px] text-black font-mono">{orderNoDisplay}</div>
             <div className="text-[11px] font-bold text-black">Date: {sauda.date ? new Date(sauda.date).toLocaleDateString('en-GB') : ''}</div>
             <div className="text-[10px] font-mono text-black">P.O. : {sauda.po_type || 'Normal/PTF'}</div>
          </div>
       </div>

       {/* Parties Block */}
       <div className="flex flex-col gap-3 font-semibold mb-4 flex-none">
          <div className="flex items-end">
             <span className="w-[140px] text-black font-bold shrink-0">Broker :</span>
             <span className="flex-1 border-b border-black border-dotted pb-0.5 uppercase text-black font-bold text-[11px] pl-1">
                {(sauda.broker || '').toUpperCase()}
             </span>
          </div>
          <div className="flex items-end">
             <span className="w-[140px] text-black font-bold shrink-0">Supplier :</span>
             <span className="flex-1 border-b border-black border-dotted pb-0.5 uppercase text-black font-bold text-[11px] pl-1">
                {(sauda.supplier || '').toUpperCase()}
             </span>
          </div>
          <div className="flex items-end">
             <span className="w-[140px] text-black font-bold shrink-0">Challan Supplier :</span>
             <span className="flex-1 border-b border-black border-dotted pb-0.5 uppercase text-black font-bold text-[11px] pl-1">
                {(sauda.challan_supplier || '').toUpperCase()}
             </span>
          </div>
          <div className="flex items-end">
             <span className="w-[140px] text-black font-bold shrink-0">Area :</span>
             <span className="flex-1 border-b border-black border-dotted pb-0.5 uppercase text-black font-bold text-[11px] pl-1">
                {(sauda.area || '').toUpperCase()}
             </span>
          </div>
       </div>

       {/* Quantities & Logistics Block */}
       <div className="flex flex-col gap-3 font-semibold mb-4 flex-none">
          <div className="flex justify-between gap-6">
             <div className="flex flex-1 items-end">
                <span className="whitespace-nowrap mr-2 text-black font-bold shrink-0">No. of Lorries</span>
                <span className="flex-1 border-b border-black border-dotted text-center pb-0.5 font-bold text-black text-[12px]">
                   {sauda.no_of_lorries || sauda.total_lorry || ''}
                </span>
             </div>
             <div className="flex flex-1 items-end">
                <span className="whitespace-nowrap mr-2 text-black font-bold shrink-0">Units/Lorry :</span>
                <span className="flex-1 border-b border-black border-dotted text-center pb-0.5 font-bold text-black uppercase">
                   {sauda.units_per_lorry !== undefined && sauda.units_per_lorry !== null && sauda.units_per_lorry !== '' ? sauda.units_per_lorry : ''}
                </span>
             </div>
          </div>
          <div className="flex justify-between gap-6">
             <div className="flex flex-1 items-end">
                <span className="whitespace-nowrap mr-2 text-black font-bold shrink-0">Total Unit :</span>
                <span className="flex-1 border-b border-black border-dotted text-center pb-0.5 font-bold text-black">
                   {sauda.total_unit || ''}
                </span>
             </div>
             <div className="flex flex-1 items-end">
                <span className="whitespace-nowrap mr-2 text-black font-bold shrink-0">Wt/Lorry :</span>
                <span className="flex-1 border-b border-black border-dotted text-center pb-0.5 font-bold text-black">
                   {sauda.wt_per_lorry || ''}
                </span>
             </div>
          </div>
          <div className="flex justify-between gap-6">
             <div className="flex flex-1 items-end">
                <span className="whitespace-nowrap mr-2 text-black font-bold shrink-0">Unit :</span>
                <span className="flex-1 border-b border-black border-dotted text-center pb-0.5 font-bold text-black uppercase">
                   {sauda.unit_type || (sauda as any).unit || (sauda as any).unit_name || (sauda as any).unitType || 'BALES'}
                </span>
             </div>
             <div className="flex flex-1 items-end">
                <span className="whitespace-nowrap mr-2 text-black font-bold shrink-0">Total Wt. :</span>
                <span className="flex-1 border-b border-black border-dotted text-center pb-0.5 font-bold text-black inline-flex justify-center items-center">
                   {sauda.total_wt_in_ton ? `${sauda.total_wt_in_ton} tons` : ''}
                </span>
             </div>
          </div>
       </div>

       {/* Qualities & Combinations Table (Agency | Marka | Quality * | Rs. *) */}
       <div className="mb-4 flex-none border-2 border-black rounded-xs overflow-hidden font-mono text-[11px]">
          <table className="w-full border-collapse">
             <thead>
                <tr className="bg-neutral-100 border-b-2 border-black font-extrabold text-[11px] text-black">
                   <th className="border-r border-black px-2 py-1 text-left w-[28%] uppercase">Agency</th>
                   <th className="border-r border-black px-2 py-1 text-left w-[24%] uppercase">Marka</th>
                   <th className="border-r border-black px-2 py-1 text-left w-[24%] uppercase">Quality *</th>
                   <th className="px-2 py-1 text-right w-[24%] uppercase">Rs. *</th>
                </tr>
             </thead>
             <tbody>
                {paddedQualities.map((item, idx) => (
                   <tr key={idx} className="border-b border-black/30 last:border-b-0 h-5">
                      <td className="border-r border-black/30 px-2 py-0.5 font-bold uppercase truncate">
                         {item.agency ? item.agency.trim().toUpperCase() : ''}
                      </td>
                      <td className="border-r border-black/30 px-2 py-0.5 font-bold uppercase truncate">
                         {item.marka ? item.marka.trim().toUpperCase() : ''}
                      </td>
                      <td className="border-r border-black/30 px-2 py-0.5 font-extrabold uppercase truncate text-black">
                         {item.quality ? item.quality.trim().toUpperCase() : ''}
                      </td>
                      <td className="px-2 py-0.5 text-right font-bold text-black">
                         {item.rs && Number(item.rs) > 0 ? Number(item.rs).toLocaleString('en-IN') : ''}
                      </td>
                   </tr>
                ))}
             </tbody>
          </table>
       </div>

       {/* Terms Block */}
       <div className="flex flex-col gap-2.5 font-semibold mb-4 flex-none">
          <div className="flex gap-4 items-end">
             <div className="flex flex-1 items-end">
                <span className="whitespace-nowrap mr-2 text-black font-bold shrink-0">Shipment :</span>
                <span className="flex-1 border-b border-black border-dotted text-center pb-0.5 font-bold text-black">
                   {sauda.shipment_date ? new Date(sauda.shipment_date).toLocaleDateString('en-GB') : ''}
                </span>
             </div>
             <div className="flex w-28 items-end shrink-0">
                <span className="whitespace-nowrap mr-2 text-black font-bold shrink-0">Days :</span>
                <span className="flex-1 border-b border-black border-dotted text-center pb-0.5 font-bold text-black">
                   {sauda.shipment_days || sauda.delivery_days || ''}
                </span>
             </div>
             <div className="flex flex-1 items-end">
                <span className="whitespace-nowrap mr-2 text-black font-bold shrink-0">Penalty :</span>
                <span className="flex-1 border-b border-black border-dotted text-center pb-0.5 font-bold text-black">
                   {sauda.shipment_penalty ? `${sauda.shipment_penalty}/Per day` : '0/Per day'}
                </span>
             </div>
          </div>
          <div className="flex gap-4 items-end">
             <div className="flex flex-1 items-end">
                <span className="whitespace-nowrap mr-2 text-black font-bold shrink-0">Marks Claim :</span>
                <span className="flex-1 border-b border-black border-dotted pb-0.5 font-bold text-black">
                   {sauda.marks_claim || ''}
                </span>
             </div>
             <div className="flex flex-1 items-end">
                <span className="whitespace-nowrap mr-2 text-black font-bold shrink-0">Quantity Claim :</span>
                <span className="flex-1 border-b border-black border-dotted pb-0.5 font-bold text-black font-mono">
                   {sauda.quantity_claim || ''}
                </span>
             </div>
          </div>
          <div className="flex items-start mt-1">
             <span className="whitespace-nowrap mr-2 text-black font-bold shrink-0">Remarks :</span>
             <span className="flex-1 italic text-black font-semibold leading-snug">
                {sauda.remarks || 'Area, Agency Grade, Grade differential can change as per market.'} B.Rate - {getBrateString()} S. Date - {sauda.date ? new Date(sauda.date).toLocaleDateString('en-GB') : ''}
             </span>
          </div>
       </div>

       {/* Signatures & Footer Branding Area */}
       <div className="flex flex-col gap-2 mt-auto pt-4 mb-1 font-semibold flex-none font-sans border-t border-black/30">
          <div className="flex justify-between items-end">
             <div className="text-left pl-1">
                <p className="text-black font-bold text-[11px]">Superior / Normal (Marks)</p>
             </div>
             <div className="text-center w-40">
                <div className="w-32 border-t border-black mb-1 mx-auto"></div>
                <p className="text-black font-bold text-[11px]">Signature</p>
             </div>
          </div>
          <div className="flex justify-between items-center text-[9px] font-mono text-neutral-600 pt-1">
             <div>BALLY JUTE COMPANY LIMITED • AUTHORIZED COMPUTER GENERATED SYSTEM CONTRACT</div>
             <div>Page 1 of 1</div>
          </div>
       </div>
    </div>
  );
}
