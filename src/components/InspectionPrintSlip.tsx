import React from 'react';
import { supabase } from '../lib/supabase';

function safeStr(val: any, fallback = ''): string {
  if (val === null || val === undefined || val === '') return fallback;
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
    return String(val);
  }
  if (typeof val === 'object') {
    if (typeof val.name === 'string') return val.name;
    if (typeof val.supp_name === 'string') return val.supp_name;
    if (typeof val.brok_name === 'string') return val.brok_name;
    if (typeof val.supplier_name === 'string') return val.supplier_name;
    if (typeof val.broker_name === 'string') return val.broker_name;
    if (typeof val.area_name === 'string') return val.area_name;
    if (val.supplier) return safeStr(val.supplier, fallback);
    if (val.broker) return safeStr(val.broker, fallback);
    if (val.mr_no) return String(val.mr_no);
    if (val.arrival_no) return String(val.arrival_no);
    if (val.po_no) return String(val.po_no);
    return fallback;
  }
  return fallback;
}

export interface InspectionDetailPrintRow {
  crop_year?: string;
  marka?: string;
  marks?: string;
  arrival_grade?: string;
  stock_grade_code?: string;
  stock_grade_name?: string;
  quantity?: number | string;
  unit?: string;
  claim?: string | number;
  challan_gross_wt?: number | string;
  gross_weight_batch?: number | string;
  receipt_gross_wt?: number | string;
  weight_mt?: number | string;
  moisture_claim?: number | string;
  claim_moisture?: number | string;
  moisture_act?: number | string;
  actual_moisture?: number | string;
  moisture_deduction_kg?: number | string;
  dust_claim?: number | string;
  claim_dust?: number | string;
  dust_act?: number | string;
  actual_dust?: number | string;
  dust_deduction_kg?: number | string;
  ncv_claim?: number | string;
  claim_ncv?: number | string;
  ncv_act?: number | string;
  actual_ncv?: number | string;
  ncv_deduction_kg?: number | string;
  final_receipt_wt?: number | string;
  net_wt?: number | string;
  settlement_grade_down?: number | string;
  settlement_moisture?: number | string;
  settlement_dust?: number | string;
  settlement_ncv?: number | string;
  premium?: string | number;
  tolerable?: string;
  rate?: number | string;
  rate_qntl?: number | string;
  area?: string;
  agency?: string;
  lot?: string;
}

export interface InspectionMasterPrintData {
  mr_no: string;
  mr_date?: string;
  arrival_no?: string;
  arrival_date?: string;
  po_no?: string;
  po_date?: string;
  mill_po_no?: string;
  mill_po_date?: string;
  supplier_name?: string;
  broker_name?: string;
  lorry_number?: string;
  vehicle_no?: string;
  challan_no?: string;
  challan_date?: string;
  station?: string;
  area?: string;
  remarks?: string;
  actual_moisture?: number;
  claim_moisture?: number;
  actual_dust?: number;
  claim_dust?: number;
  actual_ncv?: number;
  claim_ncv?: number;
  detention_days?: number;
  unloading_date?: string;
  mr_spcl_print?: string;
  status?: string;
}

interface Props {
  master: InspectionMasterPrintData;
  details?: InspectionDetailPrintRow[];
  copyType?: string | null;
}

export default function InspectionPrintSlip({ master, details = [], copyType = '1' }: Props) {
  //console.log(copyType)
  // Format date helper: DD/MM/YYYY
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-GB');
    } catch {
      return dateStr;
    }
  };

  // If details are empty, create default rows
  const rawDetails: InspectionDetailPrintRow[] = details.length > 0 ? details : [
    {
      crop_year: '2026-27',
      marka: master.area || 'NO MARK',
      stock_grade_name: 'TD6',
      quantity: 122,
      challan_gross_wt: 4.92,
      moisture_claim: master.claim_moisture || master.actual_moisture || 5,
      actual_moisture: master.actual_moisture || 5,
      actual_dust: master.actual_dust || 0,
      actual_ncv: master.actual_ncv || 0,
      moisture_deduction_kg: 246.0,
      final_receipt_wt: 4.67,
      settlement_moisture: '',
      rate: ''
    },
    {
      crop_year: '2026-27',
      marka: master.area || 'NO MARK',
      stock_grade_name: 'TD7',
      quantity: 123,
      challan_gross_wt: 4.96,
      moisture_claim: master.claim_moisture || master.actual_moisture || 5,
      actual_moisture: master.actual_moisture || 5,
      actual_dust: master.actual_dust || 0,
      actual_ncv: master.actual_ncv || 0,
      moisture_deduction_kg: 248.0,
      final_receipt_wt: 4.71,
      settlement_moisture: '',
      rate: ''
    }
  ];

  const [dbChallan, setDbChallan] = React.useState<{ no: string; date: string; found: boolean } | null>(null);

  React.useEffect(() => {
    async function loadChallan() {
      const poNo = master.po_no || master.mill_po_no;
      if (!poNo) {
        setDbChallan({ no: '', date: '', found: false });
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from("final_arrival")
          .select("challan_railway_receipt_no, challan_rr_no, challan_rr_date")
          .ilike("po_no", poNo.trim())
          .order("created_at", { ascending: false })
          .limit(1);

        if (data && data.length > 0) {
          const row = data[0];
          setDbChallan({
            no: row.challan_railway_receipt_no || row.challan_rr_no || '',
            date: row.challan_rr_date || '',
            found: true
          });
        } else {
          setDbChallan({ no: '', date: '', found: false });
        }
      } catch (err) {
        console.warn("Error fetching challan details for print preview:", err);
        setDbChallan({ no: '', date: '', found: false });
      }
    }
    loadChallan();
  }, [master.po_no, master.mill_po_no]);

  // Exclude rows where quantity is 0 or empty (User requirement: if quantity is 0, do not show row in print preview)
  const effectiveDetails: InspectionDetailPrintRow[] = rawDetails.filter((r) => {
    if (!r) return false;
    const qty = Number(r.quantity);
    return !isNaN(qty) && qty > 0;
  });

  // Helper calculation for detail row deductions & weights
  const getRowCalculations = (r: InspectionDetailPrintRow | null) => {
    if (!r) {
      return {
        grossWt: 0,
        moistNum: 0,
        moistPctRaw: '',
        moistureKg: 0,
        dustNum: 0,
        dustPctRaw: '',
        dustKg: 0,
        ncvNum: 0,
        ncvPctRaw: '',
        ncvKg: 0,
        netWt: 0
      };
    }

    const grossWt = Number(r.challan_gross_wt ?? r.gross_weight_batch ?? r.receipt_gross_wt ?? r.weight_mt ?? 0);
    
    // Moisture % priority: moisture_claim -> claim_moisture -> settlement_moisture -> moisture_act -> actual_moisture -> master
    const moistPctRaw = r.moisture_claim ?? r.claim_moisture ?? r.settlement_moisture ?? r.moisture_act ?? r.actual_moisture ?? master.claim_moisture ?? master.actual_moisture ?? '';
    const moistNum = typeof moistPctRaw === 'number' ? moistPctRaw : parseFloat(String(moistPctRaw || '').replace(/[^0-9.]/g, '')) || 0;

    const dustPctRaw = r.dust_claim ?? r.claim_dust ?? r.settlement_dust ?? r.dust_act ?? r.actual_dust ?? master.claim_dust ?? master.actual_dust ?? '';
    const dustNum = typeof dustPctRaw === 'number' ? dustPctRaw : parseFloat(String(dustPctRaw || '').replace(/[^0-9.]/g, '')) || 0;

    const ncvPctRaw = r.ncv_claim ?? r.claim_ncv ?? r.settlement_ncv ?? r.ncv_act ?? r.actual_ncv ?? master.claim_ncv ?? master.actual_ncv ?? '';
    const ncvNum = typeof ncvPctRaw === 'number' ? ncvPctRaw : parseFloat(String(ncvPctRaw || '').replace(/[^0-9.]/g, '')) || 0;

    // Moisture Kg calculation: Gross Wt (in MT) * 1000 * (Moisture % / 100) = Gross Wt * 10 * Moisture %
    const moistureKg = r.moisture_deduction_kg !== undefined && r.moisture_deduction_kg !== '' && Number(r.moisture_deduction_kg) > 0
      ? Number(r.moisture_deduction_kg)
      : (grossWt > 0 && moistNum > 0 ? (grossWt * 1000 * (moistNum / 100)) : 0);

    const dustKg = r.dust_deduction_kg !== undefined && r.dust_deduction_kg !== '' && Number(r.dust_deduction_kg) > 0
      ? Number(r.dust_deduction_kg)
      : (grossWt > 0 && dustNum > 0 ? (grossWt * 1000 * (dustNum / 100)) : 0);

    const ncvKg = r.ncv_deduction_kg !== undefined && r.ncv_deduction_kg !== '' && Number(r.ncv_deduction_kg) > 0
      ? Number(r.ncv_deduction_kg)
      : (grossWt > 0 && ncvNum > 0 ? (grossWt * 1000 * (ncvNum / 100)) : 0);

    const calculatedNetWt = grossWt > 0 ? Math.max(0, grossWt - ((moistureKg + dustKg + ncvKg) / 1000)) : 0;
    const netWt = r.final_receipt_wt !== undefined && r.final_receipt_wt !== '' && Number(r.final_receipt_wt) > 0
      ? Number(r.final_receipt_wt)
      : (r.net_wt !== undefined && r.net_wt !== '' && Number(r.net_wt) > 0
          ? Number(r.net_wt)
          : calculatedNetWt);

    return {
      grossWt,
      moistNum,
      moistPctRaw,
      moistureKg,
      dustNum,
      dustPctRaw,
      dustKg,
      ncvNum,
      ncvPctRaw,
      ncvKg,
      netWt
    };
  };

  // In landscape mode, 8-9 rows fits the pre-printed dot-matrix height cleanly
  const targetRowCount = Math.max(8, effectiveDetails.length);
  const paddedRows: (InspectionDetailPrintRow | null)[] = [...effectiveDetails];
  while (paddedRows.length < targetRowCount) {
    paddedRows.push(null);
  }

  // Calculate totals
  const totalQuantity = effectiveDetails.reduce((sum, r) => sum + (Number(r?.quantity) || 0), 0);
  const totalGrossWt = effectiveDetails.reduce((sum, r) => {
    const calcs = getRowCalculations(r);
    return sum + calcs.grossWt;
  }, 0);

  const totalMoistureKg = effectiveDetails.reduce((sum, r) => {
    const calcs = getRowCalculations(r);
    return sum + calcs.moistureKg;
  }, 0);

  const totalDustKg = effectiveDetails.reduce((sum, r) => {
    const calcs = getRowCalculations(r);
    return sum + calcs.dustKg;
  }, 0);

  const totalNcvKg = effectiveDetails.reduce((sum, r) => {
    const calcs = getRowCalculations(r);
    return sum + calcs.ncvKg;
  }, 0);

  const totalNetWt = effectiveDetails.reduce((sum, r) => {
    const calcs = getRowCalculations(r);
    return sum + calcs.netWt;
  }, 0);

  // Extract unique Area and Agency values from Inspection Details rows (or fallback to master)
  const allRowsForStations = effectiveDetails.length > 0 ? effectiveDetails : rawDetails;
  const uniqueAreas = Array.from(
    new Set(
      allRowsForStations
        .map((r: any) => (r?.area || r?.area_name || r?.arrival_area_name || r?.purch_area_name || master.area || '').toString().trim())
        .filter(val => val && val !== '-' && val !== 'N/A' && val.toLowerCase() !== 'null' && val.toLowerCase() !== 'undefined')
    )
  );

  const uniqueAgencies = Array.from(
    new Set(
      allRowsForStations
        .map((r: any) => (r?.agency || r?.agency_name || r?.arrival_agency_name || r?.purch_agency_name || (master as any)?.agency || '').toString().trim())
        .filter(val => val && val !== '-' && val !== 'N/A' && val.toLowerCase() !== 'null' && val.toLowerCase() !== 'undefined')
    )
  );

  const stationParts: string[] = [];
  if (uniqueAreas.length > 0) {
    stationParts.push(uniqueAreas.join(', '));
  }
  if (uniqueAgencies.length > 0) {
    const distinctAgencies = uniqueAgencies.filter(ag => !uniqueAreas.includes(ag));
    if (distinctAgencies.length > 0) {
      stationParts.push(distinctAgencies.join(', '));
    }
  }

  const stationsDisplay = stationParts.length > 0 
    ? stationParts.join(' / ') 
    : safeStr(master.station || master.area || (master as any)?.agency, 'BALLY MILL');

  const orderNo = safeStr(master.po_no || master.mill_po_no, '');
  const orderDate = master.po_date || master.mill_po_date || master.mr_date || master.arrival_date;
  const mrDate = master.mr_date || master.arrival_date;
  const mrNo = safeStr(master.mr_no || master.arrival_no, '');
  const resolvedChallanNo = dbChallan && dbChallan.found 
    ? dbChallan.no 
    : (master.challan_no || master.arrival_no || '');
  const resolvedChallanDate = dbChallan && dbChallan.found 
    ? dbChallan.date 
    : (master.challan_date || master.arrival_date || '');

  //const challanDisplay = resolvedChallanNo ? `${safeStr(resolvedChallanNo)} ${resolvedChallanDate ? `& ${formatDate(resolvedChallanDate)}` : ''}`: '';
  const challanDisplay = resolvedChallanNo ? `${safeStr(resolvedChallanNo)}`: '';

  return (
    <div className="bg-[#525659] p-3 sm:p-5 flex justify-center items-center print:block print:bg-white print:p-0 font-sans select-text w-full overflow-x-auto">
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 0;
          }
          body {
            background: white !important;
            color: #D94B5A !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-stationery-landscape {
            width: 297mm !important;
            height: 210mm !important;
            min-height: 210mm !important;
            max-height: 210mm !important;
            padding: 8mm 12mm !important;
            margin: 0 auto !important;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
            box-sizing: border-box !important;
          }
        }
      `}</style>

      {/* CONTINUOUS STATIONERY FORM WRAPPER (LANDSCAPE 297mm x 210mm) */}
      <div className="print-stationery-landscape w-[297mm] min-h-[210mm] max-w-[297mm] bg-[#ffffff] shadow-2xl border border-red-200 p-5 sm:p-6 flex select-text shrink-0 relative overflow-hidden print:shadow-none print:border-none print:bg-white box-sizing:border-box text-[#D94B5A]">
        
        {/* Left Sprocket Feed Holes */}
        <div className="w-[24px] bg-transparent flex flex-col justify-between py-2 shrink-0 pr-1.5 mr-2 select-none print:hidden">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="w-3.5 h-3.5 bg-slate-100 rounded-full mx-auto shadow-inner border border-red-300/60 opacity-70"></div>
          ))}
        </div>

        {/* Form Body Canvas */}
        <div className="flex-1 flex flex-col justify-between text-[11px] leading-tight font-sans">
          <div>
            {/* Top Row: Title, Mill Copy, Company Header */}
            <div className="relative mb-2">
              {/* Mill Copy top right */}
              <div className="absolute right-0 top-0 text-right">
                {copyType==='1'&&(
                  <span className="font-black text-base sm:text-lg text-[#D94B5A] tracking-wider uppercase">
                    MILL COPY
                  </span>
                )}
                {copyType==='2'&&(
                  <span className="font-black text-base sm:text-lg text-[#D94B5A] tracking-wider uppercase">
                    Original Copy
                  </span>
                )}
                {copyType==='3'&&(
                  <span className="font-black text-base sm:text-lg text-[#D94B5A] tracking-wider uppercase">
                    Not for Bill
                  </span>
                )}
                
              </div>

              {/* Center Main Heading */}
              <div className="text-center pt-0 pb-0.5">
                <h1 className="font-black text-2xl sm:text-3xl text-[#D94B5A] tracking-wide uppercase">
                  MARKS & QUALITY RECEIVED
                </h1>
              </div>

              {/* Company Info Left */}
              <div className="mt-0.5">
                <h2 className="font-black text-lg sm:text-xl text-[#D94B5A] tracking-tight uppercase leading-none">
                  BALLY JUTE COMPANY LIMITED
                </h2>
                <p className="text-[12px] font-bold text-[#D94B5A] mt-0.5">
                  5, Sree Charan Sarani, Bally, West Bengal.
                </p>
              </div>
            </div>

            {/* Header Metadata Fields with Full Width Underlines */}
            <div className="space-y-2 mt-2 mb-2.5 text-[11.5px] font-bold text-[#D94B5A]">
              {/* Line 1: From */}
              <div className="flex items-end">
                <span className="shrink-0 font-black mr-2 text-[12px]">From :</span>
                <span className="flex-1 border-b border-[#D94B5A] pb-0.5 px-2 font-black text-[12.5px] uppercase text-[#D94B5A] whitespace-normal">
                  {safeStr(master.supplier_name || (master as any).supplier, '')}
                </span>
              </div>

              {/* Line 2: M.R.No., Date, Order No., Date (Spacious landscape layout without truncation) */}
              <div className="grid grid-cols-12 gap-x-4 items-end">
                <div className="col-span-3 flex items-end">
                  <span className="shrink-0 font-black mr-1.5">M.R.No. :</span>
                  <span className="flex-1 border-b border-[#D94B5A] pb-0.5 px-1.5 font-black uppercase font-mono text-[12px]">
                    {mrNo}
                  </span>
                </div>

                <div className="col-span-3 flex items-end">
                  <span className="shrink-0 font-black mr-1.5">Date :</span>
                  <span className="flex-1 border-b border-[#D94B5A] pb-0.5 px-1.5 font-bold font-mono text-[12px]">
                    {formatDate(mrDate)}
                  </span>
                </div>

                <div className="col-span-3 flex items-end">
                  <span className="shrink-0 font-black mr-1.5">Order No. :</span>
                  <span className="flex-1 border-b border-[#D94B5A] pb-0.5 px-1.5 font-black uppercase font-mono text-[12px] whitespace-nowrap overflow-visible">
                    {orderNo}
                  </span>
                </div>

                <div className="col-span-3 flex items-end">
                  <span className="shrink-0 font-black mr-1.5">Date :</span>
                  <span className="flex-1 border-b border-[#D94B5A] pb-0.5 px-1.5 font-bold font-mono text-[12px]">
                    {formatDate(orderDate)}
                  </span>
                </div>
              </div>
            </div>

            {/* MARKS & QUALITY RECEIVED GRID TABLE */}
            <div className="border-2 border-[#D94B5A] bg-white mt-2 overflow-hidden">
              <table className="w-full border-collapse text-[10.5px] text-center">
                <thead>
                  {/* Top Header Row */}
                  <tr className="bg-[#D94B5A] text-white font-extrabold uppercase text-[10px]">
                    <th rowSpan={2} className="border-r border-b border-white px-2 py-1 w-16">Crop</th>
                    <th rowSpan={2} className="border-r border-b border-white px-2 py-1 w-20">Mark</th>
                    <th rowSpan={2} className="border-r border-b border-white px-2 py-1 w-18">Quality</th>
                    <th rowSpan={2} className="border-r border-b border-white px-2 py-1 w-16">Quantity</th>
                    <th rowSpan={2} className="border-r border-b border-white px-1.5 py-1 w-14">Claim</th>
                    <th rowSpan={2} className="border-r border-b border-white px-2 py-1 w-20">Gross Wt.</th>
                    <th colSpan={2} className="border-r border-b border-white px-1 py-0.5">Moisture</th>
                    <th colSpan={2} className="border-r border-b border-white px-1 py-0.5">Dust</th>
                    <th colSpan={2} className="border-r border-b border-white px-1 py-0.5">NCV</th>
                    <th rowSpan={2} className="border-r border-b border-white px-2 py-1 w-20">Net Wt.</th>
                    <th colSpan={4} className="border-r border-b border-white px-1 py-0.5">Settlement</th>
                    <th rowSpan={2} className="border-b border-white px-2 py-1 w-16">Rate</th>
                  </tr>
                  {/* Sub-header Row */}
                  <tr className="bg-[#D94B5A] text-white font-extrabold uppercase text-[9px]">
                    <th className="border-r border-b border-white px-1 py-0.5 w-10">%</th>
                    <th className="border-r border-b border-white px-1 py-0.5 w-10">Kg.</th>
                    <th className="border-r border-b border-white px-1 py-0.5 w-10">%</th>
                    <th className="border-r border-b border-white px-1 py-0.5 w-10">Kg.</th>
                    <th className="border-r border-b border-white px-1 py-0.5 w-10">%</th>
                    <th className="border-r border-b border-white px-1 py-0.5 w-10">Kg.</th>
                    <th className="border-r border-b border-white px-1 py-0.5 w-14">Grade</th>
                    <th className="border-r border-b border-white px-1 py-0.5 w-14">Moisture</th>
                    <th className="border-r border-b border-white px-1 py-0.5 w-12">Dust</th>
                    <th className="border-r border-b border-white px-1 py-0.5 w-16">Prem./Less</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#D94B5A] font-bold text-[#D94B5A]">
                  {paddedRows.map((row, idx) => {
                    if (!row) {
                      return (
                        <tr key={idx} className="h-6.5">
                          <td className="border-r border-[#D94B5A]"></td>
                          <td className="border-r border-[#D94B5A]"></td>
                          <td className="border-r border-[#D94B5A]"></td>
                          <td className="border-r border-[#D94B5A]"></td>
                          <td className="border-r border-[#D94B5A]"></td>
                          <td className="border-r border-[#D94B5A]"></td>
                          <td className="border-r border-[#D94B5A]"></td>
                          <td className="border-r border-[#D94B5A]"></td>
                          <td className="border-r border-[#D94B5A]"></td>
                          <td className="border-r border-[#D94B5A]"></td>
                          <td className="border-r border-[#D94B5A]"></td>
                          <td className="border-r border-[#D94B5A]"></td>
                          <td className="border-r border-[#D94B5A]"></td>
                          <td className="border-r border-[#D94B5A]"></td>
                          <td className="border-r border-[#D94B5A]"></td>
                          <td className="border-r border-[#D94B5A]"></td>
                          <td className="border-r border-[#D94B5A]"></td>
                          <td></td>
                        </tr>
                      );
                    }

                    const calcs = getRowCalculations(row);
                    const { grossWt, moistNum, moistPctRaw, moistureKg, dustNum, dustPctRaw, dustKg, ncvNum, ncvPctRaw, ncvKg, netWt } = calcs;

                    return (
                      <tr key={idx} className="h-6.5 text-[10px]">
                        {/* Crop */}
                        <td className="border-r border-[#D94B5A] px-1 font-mono">
                          {row.crop_year || '2026-27'}
                        </td>
                        {/* Mark */}
                        <td className="border-r border-[#D94B5A] px-1 font-mono uppercase">
                          {row.marka || row.marks || master.area || 'NO MARK'}
                        </td>
                        {/* Quality */}
                        <td className="border-r border-[#D94B5A] px-1 font-bold uppercase">
                          {row.stock_grade_name || row.arrival_grade || row.stock_grade_code || 'TD6'}
                        </td>
                        {/* Quantity */}
                        <td className="border-r border-[#D94B5A] px-1 font-mono text-[10.5px]">
                          {row.quantity !== undefined && row.quantity !== '' ? row.quantity : ''}
                        </td>
                        {/* Claim */}
                        <td className="border-r border-[#D94B5A] px-1 font-mono">
                          {row.claim || '-'}
                        </td>
                        {/* Gross Wt. */}
                        <td className="border-r border-[#D94B5A] px-1 font-mono text-[10.5px]">
                          {grossWt > 0 ? (grossWt * 1000).toFixed(0) : ''}
                        </td>
                        {/* Moisture % */}
                        <td className="border-r border-[#D94B5A] px-0.5 font-mono">
                          {moistNum > 0 ? `${moistNum}%` : (moistPctRaw ? `${moistPctRaw}${typeof moistPctRaw === 'number' ? '%' : ''}` : '')}
                        </td>
                        {/* Moisture Kg. */}
                        <td className="border-r border-[#D94B5A] px-0.5 font-mono">
                          {moistureKg > 0 ? Math.round(moistureKg) : ''}
                        </td>
                        {/* Dust % */}
                        <td className="border-r border-[#D94B5A] px-0.5 font-mono">
                          {dustNum > 0 ? `${dustNum}%` : (dustPctRaw ? `${dustPctRaw}${typeof dustPctRaw === 'number' ? '%' : ''}` : '')}
                        </td>
                        {/* Dust Kg. */}
                        <td className="border-r border-[#D94B5A] px-0.5 font-mono">
                          {dustKg > 0 ? dustKg.toFixed(1) : ''}
                        </td>
                        {/* NCV % */}
                        <td className="border-r border-[#D94B5A] px-0.5 font-mono">
                          {ncvNum > 0 ? `${ncvNum}%` : (ncvPctRaw ? `${ncvPctRaw}${typeof ncvPctRaw === 'number' ? '%' : ''}` : '')}
                        </td>
                        {/* NCV Kg. */}
                        <td className="border-r border-[#D94B5A] px-0.5 font-mono">
                          {ncvKg > 0 ? ncvKg.toFixed(1) : ''}
                        </td>
                        {/* Net Wt. */}
                        <td className="border-r border-[#D94B5A] px-1 font-mono text-[10.5px]">
                          {netWt > 0 ? (netWt * 1000).toFixed(0) : (grossWt > 0 ? (grossWt * 1000).toFixed(0) : '')}
                        </td>
                        {/* Settlement Grade - Blank in Mill Inspection Slip */}
                        <td className="border-r border-[#D94B5A] px-0.5 font-mono"></td>
                        {/* Settlement Moisture - Blank in Mill Inspection Slip */}
                        <td className="border-r border-[#D94B5A] px-0.5 font-mono"></td>
                        {/* Settlement Dust - Blank in Mill Inspection Slip */}
                        <td className="border-r border-[#D94B5A] px-0.5 font-mono"></td>
                        {/* Settlement Prem./Less - Blank in Mill Inspection Slip */}
                        <td className="border-r border-[#D94B5A] px-0.5 font-mono"></td>
                        {/* Rate */}
                        <td className="px-1 font-mono">
                          {row.rate || row.rate_qntl || ''}
                        </td>
                      </tr>
                    );
                  })}

                  {/* TOTAL ROW */}
                  <tr className="bg-[#ffe8e8] font-black text-[#D94B5A] h-6.5 border-t-2 border-[#D94B5A] text-[10px]">
                    <td colSpan={3} className="border-r border-[#D94B5A] px-3 text-left uppercase tracking-wider text-[11px]">
                      TOTAL
                    </td>
                    <td className="border-r border-[#D94B5A] px-1 font-mono text-[11px]">
                      {totalQuantity > 0 ? totalQuantity : ''}
                    </td>
                    <td className="border-r border-[#D94B5A] px-1 font-mono">-</td>
                    <td className="border-r border-[#D94B5A] px-1 font-mono text-[11px]">
                      {totalGrossWt > 0 ? (totalGrossWt * 1000).toFixed(0) : ''}
                    </td>
                    <td className="border-r border-[#D94B5A] px-0.5 font-mono">-</td>
                    <td className="border-r border-[#D94B5A] px-0.5 font-mono">
                      {totalMoistureKg > 0 ? Math.round(totalMoistureKg) : ''}
                    </td>
                    <td className="border-r border-[#D94B5A] px-0.5 font-mono">-</td>
                    <td className="border-r border-[#D94B5A] px-0.5 font-mono">
                      {totalDustKg > 0 ? totalDustKg.toFixed(1) : ''}
                    </td>
                    <td className="border-r border-[#D94B5A] px-0.5 font-mono">-</td>
                    <td className="border-r border-[#D94B5A] px-0.5 font-mono">
                      {totalNcvKg > 0 ? totalNcvKg.toFixed(1) : ''}
                    </td>
                    <td className="border-r border-[#D94B5A] px-1 font-mono text-[11px]">
                      {totalNetWt > 0 ? (totalNetWt * 1000).toFixed(0) : (totalGrossWt > 0 ? (totalGrossWt * 1000).toFixed(0) : '')}
                    </td>
                    <td className="border-r border-[#D94B5A] px-0.5 font-mono"></td>
                    <td className="border-r border-[#D94B5A] px-0.5 font-mono"></td>
                    <td className="border-r border-[#D94B5A] px-0.5 font-mono"></td>
                    <td className="border-r border-[#D94B5A] px-0.5 font-mono"></td>
                    <td className="px-1 font-mono"></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Remarks Row */}
            <div className="mt-2 flex items-start text-[11.5px] font-bold text-[#D94B5A]">
              <span className="shrink-0 font-black mr-2 text-[12px]">Remarks:</span>
              <p className="flex-1 font-semibold text-xs text-[#D94B5A] min-h-[16px] leading-snug">
                {safeStr(master.remarks, '')}
              </p>
            </div>

            {/* Boxed Information Section (Challan No & Date, Vehicle, Stations) with full text width */}
            <div className="mt-2 border-2 border-[#D94B5A] p-2 bg-white text-[11.5px] font-bold text-[#D94B5A]">
              <div className="grid grid-cols-12 gap-3 items-center">
                <div className="col-span-4 flex items-center">
                  <span className="shrink-0 font-black mr-1.5">Challan No & Date :</span>
                  <span className="flex-1 border-b border-[#D94B5A] pb-0.5 px-1.5 font-mono whitespace-nowrap overflow-visible">
                    {challanDisplay}
                  </span>
                </div>

                <div className="col-span-4 flex items-center">
                  <span className="shrink-0 font-black mr-1.5">Vehicle :</span>
                  <span className="flex-1 border-b border-[#D94B5A] pb-0.5 px-1.5 font-mono uppercase whitespace-nowrap overflow-visible">
                    {safeStr(master.lorry_number || master.vehicle_no, '')}
                  </span>
                </div>

                <div className="col-span-4 flex items-center">
                  <span className="shrink-0 font-black mr-1.5">Stations :</span>
                  <span className="flex-1 border-b border-[#D94B5A] pb-0.5 px-1.5 uppercase whitespace-nowrap overflow-visible font-semibold">
                    {stationsDisplay}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Footer Section with Notes & Authorized Signatory */}
            <div className="mt-2 border-t border-[#D94B5A] pt-1.5 grid grid-cols-12 gap-4 text-[#D94B5A]">
              {/* Left Side: Legal Notes */}
              <div className="col-span-8 pr-3 border-r border-[#D94B5A] text-[9.5px] leading-tight space-y-1">
                <p className="font-black text-[10px]">Note:</p>
                <p className="font-semibold text-justify">
                  1. Initiate your offer of settlement at an early date failing which we shall refer the matter to B.C.C.I for arbitrator.
                </p>
                <p className="font-semibold text-justify">
                  2. Seller must remove the bales within three days from the date of serving the Mill Receipt if the rates given on the Mill Receipt by the Buyers are not acceptable to them, failing which Buyer will treat the consignment as having been accepted and will not be responsible for its being used up.
                </p>
                <p className="font-black text-[10.5px] tracking-wide pt-0.5 uppercase">
                  ORIGINAL MUST BE ATTACHED WITH BILL/COPY
                </p>
              </div>

              {/* Right Side: Company Signatory Box */}
              <div className="col-span-4 flex flex-col justify-between items-center text-center pl-2">
                <p className="font-black text-[11.5px] uppercase tracking-wide">
                  FOR, BALLY JUTE COMPANY LIMITED
                </p>
                
                <div className="w-full pt-8">
                  <div className="w-48 mx-auto border-t border-[#D94B5A] mb-1"></div>
                  <p className="font-black text-[10.5px] tracking-wider uppercase">
                    AUTHORISED SIGNATORY
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Right Sprocket Feed Holes */}
        <div className="w-[24px] bg-transparent flex flex-col justify-between py-2 shrink-0 pl-1.5 ml-2 select-none print:hidden">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="w-3.5 h-3.5 bg-slate-100 rounded-full mx-auto shadow-inner border border-red-300/60 opacity-70"></div>
          ))}
        </div>

      </div>
    </div>
  );
}
