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

  const previewContainerRef = React.useRef<HTMLDivElement>(null);
  const slipRef = React.useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = React.useState<number>(1);
  // Standard A4 Landscape (297mm x 210mm = 1123px x 794px at 96dpi)
  const [naturalSize, setNaturalSize] = React.useState<{ width: number; height: number }>({ width: 1123, height: 794 });

  // Measure available preview width and height and scale A4 Landscape slip cleanly on screen so full page fits without clipping
  React.useEffect(() => {
    const updateScale = () => {
      const container = previewContainerRef.current;
      const slip = slipRef.current;
      if (!container || !slip) return;
      const availableW = Math.max(320, container.clientWidth - 32);
      const availableH = Math.max(360, window.innerHeight - 195);
      const slipW = slip.offsetWidth || 1123;
      const slipH = slip.offsetHeight || 794;
      setNaturalSize(prev => (prev.width === slipW && prev.height === slipH ? prev : { width: slipW, height: slipH }));
      const nextScale = Math.max(0.4, Math.min(1.2, availableW / slipW, availableH / slipH));
      setPreviewScale(prev => (Math.abs(prev - nextScale) < 0.005 ? prev : nextScale));
    };

    updateScale();
    const raf = requestAnimationFrame(updateScale);
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(updateScale);
      if (previewContainerRef.current) ro.observe(previewContainerRef.current);
      if (slipRef.current) ro.observe(slipRef.current);
    }
    window.addEventListener('resize', updateScale);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, [master?.mr_no, details]);

  // Real data only (zero dummy/hardcoded fallback rows)
  const rawDetails: InspectionDetailPrintRow[] = Array.isArray(details) ? details : [];

  const [dbSupplement, setDbSupplement] = React.useState<{
    challanNo: string;
    challanDate: string;
    poNo: string;
    poDate: string;
    remarks: string;
    area: string;
    agency: string;
    lorryNumber: string;
    supplierName: string;
    found: boolean;
  } | null>(null);

  React.useEffect(() => {
    let active = true;
    async function loadSupplement() {
      const poNo = safeStr(master.po_no || master.mill_po_no, '').trim().replace(/^#+/, '');
      const mrKey = safeStr(master.mr_no || master.arrival_no, '').trim();
      const arrKey = safeStr(master.arrival_no || master.mr_no, '').trim();
      if (!supabase || (!poNo && !mrKey && !arrKey)) {
        if (active) {
          setDbSupplement({
            challanNo: '',
            challanDate: '',
            poNo: '',
            poDate: '',
            remarks: '',
            area: '',
            agency: '',
            lorryNumber: '',
            supplierName: '',
            found: false,
          });
        }
        return;
      }

      try {
        let matchedRow: any = null;

        if (poNo) {
          const { data } = await supabase
            .from("final_arrival")
            .select("*")
            .ilike("po_no", poNo)
            .order("created_at", { ascending: false })
            .limit(1);
          if (data && data.length > 0) {
            matchedRow = data[0];
          }
        }

        const lookupKey = mrKey || arrKey;
        if (!matchedRow && lookupKey) {
          const orExpr =
            arrKey && arrKey.toUpperCase() !== mrKey.toUpperCase()
              ? `final_arrival_no.ilike.${mrKey},arrival_no.ilike.${mrKey},temporary_arrival_no.ilike.${mrKey},mr_no.ilike.${mrKey},final_arrival_no.ilike.${arrKey},arrival_no.ilike.${arrKey},temporary_arrival_no.ilike.${arrKey},mr_no.ilike.${arrKey}`
              : `final_arrival_no.ilike.${lookupKey},arrival_no.ilike.${lookupKey},temporary_arrival_no.ilike.${lookupKey},mr_no.ilike.${lookupKey}`;
          const { data: faByMr } = await supabase
            .from("final_arrival")
            .select("*")
            .or(orExpr)
            .order("created_at", { ascending: false })
            .limit(1);
          if (faByMr && faByMr.length > 0) {
            matchedRow = faByMr[0];
          } else {
            const tmrOrExpr =
              arrKey && arrKey.toUpperCase() !== mrKey.toUpperCase()
                ? `temporary_arrival_no.ilike.${mrKey},amad_no.ilike.${mrKey},arrival_no.ilike.${mrKey},mr_no.ilike.${mrKey},temporary_arrival_no.ilike.${arrKey},amad_no.ilike.${arrKey},arrival_no.ilike.${arrKey},mr_no.ilike.${arrKey}`
                : `temporary_arrival_no.ilike.${lookupKey},amad_no.ilike.${lookupKey},arrival_no.ilike.${lookupKey},mr_no.ilike.${lookupKey}`;
            const { data: tmrByMr } = await supabase
              .from("temporary_material_received")
              .select("*")
              .or(tmrOrExpr)
              .order("created_at", { ascending: false })
              .limit(1);
            if (tmrByMr && tmrByMr.length > 0) {
              matchedRow = tmrByMr[0];
            }
          }
        }

        if (!active) return;

        if (matchedRow) {
          const resolvedPo = safeStr(matchedRow.po_no || poNo, '').trim();
          let resolvedPoDt = safeStr(matchedRow.po_date, '').trim();
          if (resolvedPo && !resolvedPoDt && !safeStr(master.po_date || master.mill_po_date, '').trim()) {
            const { data: pmRows } = await supabase
              .from("purchase_master")
              .select("po_date, sauda_date, date")
              .ilike("po_no", resolvedPo.replace(/^#+/, ''))
              .limit(1);
            const pm = Array.isArray(pmRows) ? pmRows[0] : pmRows;
            if (pm) {
              resolvedPoDt = safeStr(pm.sauda_date || pm.po_date || pm.date, '').trim();
            }
          }

          setDbSupplement({
            challanNo: safeStr(matchedRow.challan_railway_receipt_no || matchedRow.challan_rr_no, '').trim(),
            challanDate: safeStr(matchedRow.challan_rr_date, '').trim(),
            poNo: resolvedPo,
            poDate: resolvedPoDt,
            remarks: safeStr(matchedRow.remarks, '').trim(),
            area: safeStr(matchedRow.arrival_area_name || matchedRow.arrival_area, '').trim(),
            agency: safeStr(matchedRow.agency_name || matchedRow.agency, '').trim(),
            lorryNumber: safeStr(matchedRow.lorry_number, '').trim(),
            supplierName: safeStr(matchedRow.supplier || matchedRow.challan_supplier, '').trim(),
            found: true,
          });
        } else {
          setDbSupplement({
            challanNo: '',
            challanDate: '',
            poNo: '',
            poDate: '',
            remarks: '',
            area: '',
            agency: '',
            lorryNumber: '',
            supplierName: '',
            found: false,
          });
        }
      } catch (err) {
        console.warn("Error fetching arrival/challan details for print preview:", err);
        if (active) {
          setDbSupplement({
            challanNo: '',
            challanDate: '',
            poNo: '',
            poDate: '',
            remarks: '',
            area: '',
            agency: '',
            lorryNumber: '',
            supplierName: '',
            found: false,
          });
        }
      }
    }
    loadSupplement();
    return () => {
      active = false;
    };
  }, [master.po_no, master.mill_po_no, master.mr_no, master.arrival_no]);

  const getRowQty = (r: any): number =>
    Number(r?.quantity ?? r?.quantity_rcpt ?? r?.quantity_chln ?? r?.rcpt ?? r?.chln ?? r?.bales ?? r?.packets ?? 0);

  // Exclude empty placeholder rows while preserving LOOSE / positive weight / quantity rows
  const effectiveDetails: InspectionDetailPrintRow[] = rawDetails.filter((r: any) => {
    if (!r) return false;
    const qty = getRowQty(r);
    const gross = Number(r.challan_gross_wt ?? r.gross_weight_batch ?? r.receipt_gross_wt ?? r.netto_pnto ?? r.weight_mt ?? 0);
    const unitUpper = String(r.unit || '').trim().toUpperCase();
    const hasGrade = Boolean(r.stock_grade_name || r.arrival_grade || r.receipt_grade_name || r.receipt_grade || r.grade_name || r.stock_grade_code);
    if (!isNaN(qty) && qty > 0) return true;
    if (unitUpper.includes('LOOSE') && gross > 0) return true;
    if (gross > 0 && hasGrade && (r.quantity === undefined || r.quantity === null || r.quantity === '')) return true;
    return false;
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

    const grossWt = Number(r.challan_gross_wt ?? r.gross_weight_batch ?? r.receipt_gross_wt ?? (r as any).netto_pnto ?? r.weight_mt ?? 0);
    
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

  // Fill full-page A4 landscape grid (minimum 7 data/blank rows + 1 yellow band row above TOTAL)
  const targetRowCount = Math.max(7, effectiveDetails.length);
  const paddedRows: (InspectionDetailPrintRow | null)[] = [...effectiveDetails];
  while (paddedRows.length < targetRowCount) {
    paddedRows.push(null);
  }
  const isDenseTable = paddedRows.length > 9;

  // Calculate totals
  const totalQuantity = effectiveDetails.reduce((sum, r) => sum + (getRowQty(r) || 0), 0);
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

  const resolvedMasterArea = safeStr(master.area || (master as any).arrival_area || dbSupplement?.area, '');
  const resolvedMasterAgency = safeStr((master as any)?.agency || dbSupplement?.agency, '');

  const allRowsForStations = effectiveDetails.length > 0 ? effectiveDetails : rawDetails;
  const uniqueAreas = Array.from(
    new Set(
      allRowsForStations
        .map((r: any) => (r?.area || r?.area_name || r?.arrival_area_name || r?.purch_area_name || resolvedMasterArea || '').toString().trim())
        .filter(val => val && val !== '-' && val !== 'N/A' && val.toLowerCase() !== 'null' && val.toLowerCase() !== 'undefined')
    )
  );

  const uniqueAgencies = Array.from(
    new Set(
      allRowsForStations
        .map((r: any) => (r?.agency || r?.agency_name || r?.arrival_agency_name || r?.purch_agency_name || resolvedMasterAgency || '').toString().trim())
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
    : safeStr(master.station || resolvedMasterArea || resolvedMasterAgency, 'BALLY MILL');

  const orderNo = safeStr(master.po_no || master.mill_po_no || dbSupplement?.poNo, '');
  const orderDate = master.po_date || master.mill_po_date || dbSupplement?.poDate || master.mr_date || master.arrival_date;
  const mrDate = master.mr_date || master.arrival_date;
  const mrNo = safeStr(master.mr_no || master.arrival_no, '');
  const resolvedChallanNo = (dbSupplement && dbSupplement.found && dbSupplement.challanNo)
    ? dbSupplement.challanNo
    : (master.challan_no || master.arrival_no || mrNo || '');
  const resolvedChallanDate = (dbSupplement && dbSupplement.found && dbSupplement.challanDate)
    ? dbSupplement.challanDate
    : (master.challan_date || master.arrival_date || '');

  //const challanDisplay = resolvedChallanNo ? `${safeStr(resolvedChallanNo)} ${resolvedChallanDate ? `& ${formatDate(resolvedChallanDate)}` : ''}`: '';
  const challanDisplay = resolvedChallanNo ? `${safeStr(resolvedChallanNo)}`: '';
  const remarksDisplay = safeStr(master.remarks || dbSupplement?.remarks, '');

  return (
    <div ref={previewContainerRef} className="inspection-print-page bg-[#525659] p-3 sm:p-4 flex justify-center items-center print:bg-white print:p-0 font-sans select-text w-full overflow-hidden">
      <style>{`
        @media screen {
          #print-modal-inner:has(.inspection-print-page) {
            width: 97vw !important;
            max-width: 97vw !important;
          }
        }
        @media print {
          @page {
            size: A4 landscape !important;
            margin: 0 !important;
          }
          html, body {
            background: white !important;
            color: #D94B5A !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          #print-modal-backdrop:has(.inspection-print-page),
          #print-modal-inner:has(.inspection-print-page),
          #print-modal-children-canvas:has(.inspection-print-page) {
            width: 297mm !important;
            height: 210mm !important;
            min-height: 210mm !important;
            max-width: none !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background: white !important;
            overflow: hidden !important;
          }
          .inspection-print-page {
            width: 297mm !important;
            height: 210mm !important;
            min-height: 210mm !important;
            max-height: 210mm !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            display: block !important;
            overflow: hidden !important;
          }
          .inspection-slip-scale-box {
            width: 297mm !important;
            height: 210mm !important;
            margin: 0 auto !important;
          }
          .print-stationery-landscape {
            width: 297mm !important;
            min-width: 297mm !important;
            max-width: 297mm !important;
            height: 210mm !important;
            min-height: 210mm !important;
            max-height: 210mm !important;
            padding: 9mm 11mm !important;
            margin: 0 !important;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
            box-sizing: border-box !important;
            transform: none !important;
            overflow: hidden !important;
          }
          table.clean-print-table th,
          table.clean-print-table td {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* SCALED VIEWPORT WRAPPER FOR FULL-PAGE ON-SCREEN PREVIEW (STANDARD A4 LANDSCAPE 297mm x 210mm) */}
      <div
        className="inspection-slip-scale-box relative mx-auto shrink-0 print:w-[297mm] print:h-[210mm]"
        style={
          previewScale < 0.999 || previewScale > 1.001
            ? {
                width: `${Math.round(naturalSize.width * previewScale)}px`,
                height: `${Math.round(naturalSize.height * previewScale)}px`,
              }
            : {
                width: '297mm',
                height: '210mm',
              }
        }
      >
      {/* CONTINUOUS STATIONERY FORM WRAPPER (STANDARD A4 LANDSCAPE 297mm x 210mm) */}
      <div
        ref={slipRef}
        style={
          previewScale < 0.999 || previewScale > 1.001
            ? {
                transform: `scale(${previewScale})`,
                transformOrigin: 'top left',
              }
            : undefined
        }
        className="print-stationery-landscape w-[297mm] min-w-[297mm] max-w-[297mm] h-[210mm] min-h-[210mm] max-h-[210mm] bg-[#ffffff] shadow-2xl border border-red-200 px-4 py-5 sm:px-5 sm:py-6 flex select-text shrink-0 relative overflow-hidden print:shadow-none print:border-none print:bg-white box-border text-[#D94B5A]"
      >
        {/* Dedicated Left Sprocket Feed Holes Strip (never overlaps text) */}
        <div className="w-[22px] bg-transparent flex flex-col justify-between py-1 shrink-0 mr-3 select-none print:hidden">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="w-3 h-3 bg-slate-100 rounded-full mx-auto shadow-inner border border-red-300/60 opacity-75"></div>
          ))}
        </div>

        {/* Form Body Canvas */}
        <div className="flex-1 min-w-0 w-full flex flex-col justify-between text-[11px] leading-tight font-sans overflow-hidden">
          <div className="min-w-0 w-full">
            {/* Top Row: Title, Mill Copy, Company Header */}
            <div className="relative mb-2">
              {/* Mill Copy top right */}
              <div className="absolute right-0 top-0 text-right max-w-[155px]">
                {copyType==='1'&&(
                  <span className="font-black text-[14px] text-[#D94B5A] tracking-wider uppercase whitespace-nowrap">
                    MILL COPY
                  </span>
                )}
                {copyType==='2'&&(
                  <span className="font-black text-[14px] text-[#D94B5A] tracking-wider uppercase whitespace-nowrap">
                    Original Copy
                  </span>
                )}
                {copyType==='3'&&(
                  <span className="font-black text-[14px] text-[#D94B5A] tracking-wider uppercase whitespace-nowrap">
                    Not for Bill
                  </span>
                )}
              </div>

              {/* Center Main Heading */}
              <div className="text-center pt-0 pb-0.5 px-36">
                <h1 className="font-black text-[25px] text-[#D94B5A] tracking-wide uppercase leading-none whitespace-nowrap">
                  MARKS & QUALITY RECEIVED
                </h1>
              </div>

              {/* Company Info Left */}
              <div className="mt-1">
                <h2 className="font-black text-[18px] text-[#D94B5A] tracking-tight uppercase leading-none">
                  BALLY JUTE COMPANY LIMITED
                </h2>
                <p className="text-[11.5px] font-bold text-[#D94B5A] mt-0.5 leading-tight">
                  5, Sree Charan Sarani, Bally, West Bengal.
                </p>
              </div>
            </div>

            {/* Header Metadata Fields with Full Width Underlines */}
            <div className="space-y-2 mt-2.5 mb-2.5 text-[11.5px] font-bold text-[#D94B5A]">
              {/* Line 1: From */}
              <div className="flex items-end min-w-0">
                <span className="shrink-0 font-black mr-2 text-[11.5px]">From :</span>
                <span className="flex-1 min-w-0 border-b border-[#D94B5A] pb-0.5 px-2 font-black text-[12px] uppercase text-[#D94B5A] truncate">
                  {safeStr(master.supplier_name || (master as any).supplier || dbSupplement?.supplierName, '')}
                </span>
              </div>

              {/* Line 2: M.R.No., Date, Order No., Date */}
              <div className="grid grid-cols-12 gap-x-4 items-end">
                <div className="col-span-3 flex items-end min-w-0">
                  <span className="shrink-0 font-black mr-1.5">M.R.No. :</span>
                  <span className="flex-1 min-w-0 border-b border-[#D94B5A] pb-0.5 px-1.5 font-black uppercase font-mono text-[11.5px] truncate">
                    {mrNo}
                  </span>
                </div>

                <div className="col-span-3 flex items-end min-w-0">
                  <span className="shrink-0 font-black mr-1.5">Date :</span>
                  <span className="flex-1 min-w-0 border-b border-[#D94B5A] pb-0.5 px-1.5 font-bold font-mono text-[11.5px] truncate">
                    {formatDate(mrDate)}
                  </span>
                </div>

                <div className="col-span-3 flex items-end min-w-0">
                  <span className="shrink-0 font-black mr-1.5">Order No. :</span>
                  <span className="flex-1 min-w-0 border-b border-[#D94B5A] pb-0.5 px-1.5 font-black uppercase font-mono text-[11.5px] truncate">
                    {orderNo}
                  </span>
                </div>

                <div className="col-span-3 flex items-end min-w-0">
                  <span className="shrink-0 font-black mr-1.5">Date :</span>
                  <span className="flex-1 min-w-0 border-b border-[#D94B5A] pb-0.5 px-1.5 font-bold font-mono text-[11.5px] truncate">
                    {formatDate(orderDate)}
                  </span>
                </div>
              </div>
            </div>

            {/* MARKS & QUALITY RECEIVED FULL-PAGE GRID TABLE (soft pink header + dark bold text matching screenshot 2) */}
            <div className="border-[1.5px] border-[#D94B5A] bg-white mt-2 w-full overflow-hidden">
              <table className="clean-print-table w-full table-fixed border-collapse text-[11px] text-center">
                <colgroup>
                  <col style={{ width: '5.5%' }} />{/* Crop */}
                  <col style={{ width: '7.2%' }} />{/* Mark */}
                  <col style={{ width: '5.8%' }} />{/* Quality */}
                  <col style={{ width: '6.2%' }} />{/* Quantity */}
                  <col style={{ width: '4.3%' }} />{/* Claim */}
                  <col style={{ width: '6.8%' }} />{/* Gross Wt. */}
                  <col style={{ width: '3.6%' }} />{/* Moisture % */}
                  <col style={{ width: '4.2%' }} />{/* Moisture Kg */}
                  <col style={{ width: '3.6%' }} />{/* Dust % */}
                  <col style={{ width: '4.2%' }} />{/* Dust Kg */}
                  <col style={{ width: '3.6%' }} />{/* NCV % */}
                  <col style={{ width: '4.2%' }} />{/* NCV Kg */}
                  <col style={{ width: '6.8%' }} />{/* Net Wt. */}
                  <col style={{ width: '6.0%' }} />{/* Settlement Grade */}
                  <col style={{ width: '7.4%' }} />{/* Settlement Moisture */}
                  <col style={{ width: '5.2%' }} />{/* Settlement Dust */}
                  <col style={{ width: '8.0%' }} />{/* Settlement Prem./Less */}
                  <col style={{ width: '7.4%' }} />{/* Rate */}
                </colgroup>
                <thead>
                  {/* Top Header Row */}
                  <tr className="bg-[#FDE7E6] text-[#171717] font-extrabold uppercase text-[10px] leading-tight">
                    <th rowSpan={2} className="border-r border-b border-[#D94B5A]/70 px-0.5 py-2">Crop</th>
                    <th rowSpan={2} className="border-r border-b border-[#D94B5A]/70 px-0.5 py-2">Mark</th>
                    <th rowSpan={2} className="border-r border-b border-[#D94B5A]/70 px-0.5 py-2">Quality</th>
                    <th rowSpan={2} className="border-r border-b border-[#D94B5A]/70 px-0.5 py-2">Quantity</th>
                    <th rowSpan={2} className="border-r border-b border-[#D94B5A]/70 px-0.5 py-2">Claim</th>
                    <th rowSpan={2} className="border-r border-b border-[#D94B5A]/70 px-0.5 py-2">Gross Wt.</th>
                    <th colSpan={2} className="border-r border-b border-[#D94B5A]/70 px-0.5 py-1.5">Moisture</th>
                    <th colSpan={2} className="border-r border-b border-[#D94B5A]/70 px-0.5 py-1.5">Dust</th>
                    <th colSpan={2} className="border-r border-b border-[#D94B5A]/70 px-0.5 py-1.5">NCV</th>
                    <th rowSpan={2} className="border-r border-b border-[#D94B5A]/70 px-0.5 py-2">Net Wt.</th>
                    <th colSpan={4} className="border-r border-b border-[#D94B5A]/70 px-0.5 py-1.5">Settlement</th>
                    <th rowSpan={2} className="border-b border-[#D94B5A]/70 px-0.5 py-2">Rate</th>
                  </tr>
                  {/* Sub-header Row */}
                  <tr className="bg-[#FDE7E6] text-[#171717] font-extrabold uppercase text-[9.5px] leading-tight">
                    <th className="border-r border-b border-[#D94B5A]/70 px-0.5 py-1.5">%</th>
                    <th className="border-r border-b border-[#D94B5A]/70 px-0.5 py-1.5">Kg.</th>
                    <th className="border-r border-b border-[#D94B5A]/70 px-0.5 py-1.5">%</th>
                    <th className="border-r border-b border-[#D94B5A]/70 px-0.5 py-1.5">Kg.</th>
                    <th className="border-r border-b border-[#D94B5A]/70 px-0.5 py-1.5">%</th>
                    <th className="border-r border-b border-[#D94B5A]/70 px-0.5 py-1.5">Kg.</th>
                    <th className="border-r border-b border-[#D94B5A]/70 px-0.5 py-1.5">Grade</th>
                    <th className="border-r border-b border-[#D94B5A]/70 px-0.5 py-1.5">Moisture</th>
                    <th className="border-r border-b border-[#D94B5A]/70 px-0.5 py-1.5">Dust</th>
                    <th className="border-r border-b border-[#D94B5A]/70 px-0.5 py-1.5">Prem./Less</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#D94B5A]/45 font-bold text-[#171717]">
                  {paddedRows.map((row, idx) => {
                    const rowHeightClass = isDenseTable ? 'h-[26px]' : 'h-[37px]';
                    if (!row) {
                      return (
                        <tr key={idx} className={`${rowHeightClass} text-[11px] bg-white`}>
                          <td className="border-r border-[#D94B5A]/70 px-0.5 py-1">&nbsp;</td>
                          <td className="border-r border-[#D94B5A]/70 px-0.5 py-1">&nbsp;</td>
                          <td className="border-r border-[#D94B5A]/70 px-0.5 py-1">&nbsp;</td>
                          <td className="border-r border-[#D94B5A]/70 px-0.5 py-1">&nbsp;</td>
                          <td className="border-r border-[#D94B5A]/70 px-0.5 py-1">&nbsp;</td>
                          <td className="border-r border-[#D94B5A]/70 px-0.5 py-1">&nbsp;</td>
                          <td className="border-r border-[#D94B5A]/70 px-0.5 py-1">&nbsp;</td>
                          <td className="border-r border-[#D94B5A]/70 px-0.5 py-1">&nbsp;</td>
                          <td className="border-r border-[#D94B5A]/70 px-0.5 py-1">&nbsp;</td>
                          <td className="border-r border-[#D94B5A]/70 px-0.5 py-1">&nbsp;</td>
                          <td className="border-r border-[#D94B5A]/70 px-0.5 py-1">&nbsp;</td>
                          <td className="border-r border-[#D94B5A]/70 px-0.5 py-1">&nbsp;</td>
                          <td className="border-r border-[#D94B5A]/70 px-0.5 py-1">&nbsp;</td>
                          <td className="border-r border-[#D94B5A]/70 px-0.5 py-1">&nbsp;</td>
                          <td className="border-r border-[#D94B5A]/70 px-0.5 py-1">&nbsp;</td>
                          <td className="border-r border-[#D94B5A]/70 px-0.5 py-1">&nbsp;</td>
                          <td className="border-r border-[#D94B5A]/70 px-0.5 py-1">&nbsp;</td>
                          <td className="px-0.5 py-1">&nbsp;</td>
                        </tr>
                      );
                    }

                    const calcs = getRowCalculations(row);
                    const { grossWt, moistNum, moistPctRaw, moistureKg, dustNum, dustPctRaw, dustKg, ncvNum, ncvPctRaw, ncvKg, netWt } = calcs;

                    return (
                      <tr key={idx} className={`${rowHeightClass} text-[11px] leading-none bg-white`}>
                        {/* Crop */}
                        <td className="border-r border-[#D94B5A]/70 px-0.5 py-1 font-mono whitespace-nowrap">
                          {row.crop_year || '2026-27'}
                        </td>
                        {/* Mark */}
                        <td className="border-r border-[#D94B5A]/70 px-0.5 py-1 font-mono uppercase truncate" title={String((row as any).marka || row.marks || (row as any).challan_marka_name || (row as any).marka_name || resolvedMasterArea || 'NO MARK')}>
                          {(row as any).marka || row.marks || (row as any).challan_marka_name || (row as any).marka_name || resolvedMasterArea || 'NO MARK'}
                        </td>
                        {/* Quality */}
                        <td className="border-r border-[#D94B5A]/70 px-0.5 py-1 font-bold uppercase truncate">
                          {row.stock_grade_name || row.arrival_grade || (row as any).receipt_grade_name || (row as any).receipt_grade || (row as any).grade_name || row.stock_grade_code || ''}
                        </td>
                        {/* Quantity */}
                        <td className="border-r border-[#D94B5A]/70 px-0.5 py-1 font-mono text-[11px] whitespace-nowrap">
                          {(() => {
                            const q = getRowQty(row);
                            if (q > 0) return q;
                            return String(row.unit || '').toUpperCase().includes('LOOSE') ? 'LOOSE' : '';
                          })()}
                        </td>
                        {/* Claim */}
                        <td className="border-r border-[#D94B5A]/70 px-0.5 py-1 font-mono">
                          {row.claim || '-'}
                        </td>
                        {/* Gross Wt. */}
                        <td className="border-r border-[#D94B5A]/70 px-0.5 py-1 font-mono text-[11px] whitespace-nowrap">
                          {grossWt > 0 ? (grossWt * 1000).toFixed(0) : ''}
                        </td>
                        {/* Moisture % */}
                        <td className="border-r border-[#D94B5A]/70 px-0.5 py-1 font-mono">
                          {moistNum > 0 ? `${moistNum}%` : (moistPctRaw ? `${moistPctRaw}${typeof moistPctRaw === 'number' ? '%' : ''}` : '')}
                        </td>
                        {/* Moisture Kg. */}
                        <td className="border-r border-[#D94B5A]/70 px-0.5 py-1 font-mono">
                          {moistureKg > 0 ? Math.round(moistureKg) : ''}
                        </td>
                        {/* Dust % */}
                        <td className="border-r border-[#D94B5A]/70 px-0.5 py-1 font-mono">
                          {dustNum > 0 ? `${dustNum}%` : (dustPctRaw ? `${dustPctRaw}${typeof dustPctRaw === 'number' ? '%' : ''}` : '')}
                        </td>
                        {/* Dust Kg. */}
                        <td className="border-r border-[#D94B5A]/70 px-0.5 py-1 font-mono">
                          {dustKg > 0 ? dustKg.toFixed(1) : ''}
                        </td>
                        {/* NCV % */}
                        <td className="border-r border-[#D94B5A]/70 px-0.5 py-1 font-mono">
                          {ncvNum > 0 ? `${ncvNum}%` : (ncvPctRaw ? `${ncvPctRaw}${typeof ncvPctRaw === 'number' ? '%' : ''}` : '')}
                        </td>
                        {/* NCV Kg. */}
                        <td className="border-r border-[#D94B5A]/70 px-0.5 py-1 font-mono">
                          {ncvKg > 0 ? ncvKg.toFixed(1) : ''}
                        </td>
                        {/* Net Wt. */}
                        <td className="border-r border-[#D94B5A]/70 px-0.5 py-1 font-mono text-[11px] whitespace-nowrap">
                          {netWt > 0 ? (netWt * 1000).toFixed(0) : (grossWt > 0 ? (grossWt * 1000).toFixed(0) : '')}
                        </td>
                        {/* Settlement Grade - Blank in Mill Inspection Slip */}
                        <td className="border-r border-[#D94B5A]/70 px-0.5 py-1 font-mono">&nbsp;</td>
                        {/* Settlement Moisture - Blank in Mill Inspection Slip */}
                        <td className="border-r border-[#D94B5A]/70 px-0.5 py-1 font-mono">&nbsp;</td>
                        {/* Settlement Dust - Blank in Mill Inspection Slip */}
                        <td className="border-r border-[#D94B5A]/70 px-0.5 py-1 font-mono">&nbsp;</td>
                        {/* Settlement Prem./Less - Blank in Mill Inspection Slip */}
                        <td className="border-r border-[#D94B5A]/70 px-0.5 py-1 font-mono">&nbsp;</td>
                        {/* Rate */}
                        <td className="px-0.5 py-1 font-mono whitespace-nowrap">
                          {row.rate || row.rate_qntl || ''}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Subtle warm highlight band row above TOTAL matching screenshot 2 */}
                  <tr className="bg-[#FFF2CC] h-[26px]">
                    <td className="border-r border-[#D94B5A]/70 px-0.5 py-0.5">&nbsp;</td>
                    <td className="border-r border-[#D94B5A]/70 px-0.5 py-0.5">&nbsp;</td>
                    <td className="border-r border-[#D94B5A]/70 px-0.5 py-0.5">&nbsp;</td>
                    <td className="border-r border-[#D94B5A]/70 px-0.5 py-0.5">&nbsp;</td>
                    <td className="border-r border-[#D94B5A]/70 px-0.5 py-0.5">&nbsp;</td>
                    <td className="border-r border-[#D94B5A]/70 px-0.5 py-0.5">&nbsp;</td>
                    <td className="border-r border-[#D94B5A]/70 px-0.5 py-0.5">&nbsp;</td>
                    <td className="border-r border-[#D94B5A]/70 px-0.5 py-0.5">&nbsp;</td>
                    <td className="border-r border-[#D94B5A]/70 px-0.5 py-0.5">&nbsp;</td>
                    <td className="border-r border-[#D94B5A]/70 px-0.5 py-0.5">&nbsp;</td>
                    <td className="border-r border-[#D94B5A]/70 px-0.5 py-0.5">&nbsp;</td>
                    <td className="border-r border-[#D94B5A]/70 px-0.5 py-0.5">&nbsp;</td>
                    <td className="border-r border-[#D94B5A]/70 px-0.5 py-0.5">&nbsp;</td>
                    <td className="border-r border-[#D94B5A]/70 px-0.5 py-0.5">&nbsp;</td>
                    <td className="border-r border-[#D94B5A]/70 px-0.5 py-0.5">&nbsp;</td>
                    <td className="border-r border-[#D94B5A]/70 px-0.5 py-0.5">&nbsp;</td>
                    <td className="border-r border-[#D94B5A]/70 px-0.5 py-0.5">&nbsp;</td>
                    <td className="px-0.5 py-0.5">&nbsp;</td>
                  </tr>

                  {/* TOTAL ROW */}
                  <tr className="bg-white font-black text-[#171717] h-[36px] border-t-[1.5px] border-[#D94B5A] text-[11px] leading-none">
                    <td colSpan={3} className="border-r border-[#D94B5A]/70 px-3 py-1 text-left uppercase tracking-wider text-[11.5px]">
                      TOTAL
                    </td>
                    <td className="border-r border-[#D94B5A]/70 px-0.5 py-1 font-mono text-[11.5px] whitespace-nowrap">
                      {totalQuantity > 0 ? totalQuantity : ''}
                    </td>
                    <td className="border-r border-[#D94B5A]/70 px-0.5 py-1 font-mono">-</td>
                    <td className="border-r border-[#D94B5A]/70 px-0.5 py-1 font-mono text-[11.5px] whitespace-nowrap">
                      {totalGrossWt > 0 ? (totalGrossWt * 1000).toFixed(0) : ''}
                    </td>
                    <td className="border-r border-[#D94B5A]/70 px-0.5 py-1 font-mono">-</td>
                    <td className="border-r border-[#D94B5A]/70 px-0.5 py-1 font-mono">
                      {totalMoistureKg > 0 ? Math.round(totalMoistureKg) : ''}
                    </td>
                    <td className="border-r border-[#D94B5A]/70 px-0.5 py-1 font-mono">-</td>
                    <td className="border-r border-[#D94B5A]/70 px-0.5 py-1 font-mono">
                      {totalDustKg > 0 ? totalDustKg.toFixed(1) : ''}
                    </td>
                    <td className="border-r border-[#D94B5A]/70 px-0.5 py-1 font-mono">-</td>
                    <td className="border-r border-[#D94B5A]/70 px-0.5 py-1 font-mono">
                      {totalNcvKg > 0 ? totalNcvKg.toFixed(1) : ''}
                    </td>
                    <td className="border-r border-[#D94B5A]/70 px-0.5 py-1 font-mono text-[11.5px] whitespace-nowrap">
                      {totalNetWt > 0 ? (totalNetWt * 1000).toFixed(0) : (totalGrossWt > 0 ? (totalGrossWt * 1000).toFixed(0) : '')}
                    </td>
                    <td className="border-r border-[#D94B5A]/70 px-0.5 py-1 font-mono"></td>
                    <td className="border-r border-[#D94B5A]/70 px-0.5 py-1 font-mono"></td>
                    <td className="border-r border-[#D94B5A]/70 px-0.5 py-1 font-mono"></td>
                    <td className="border-r border-[#D94B5A]/70 px-0.5 py-1 font-mono"></td>
                    <td className="px-0.5 py-1 font-mono"></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Remarks Row */}
            <div className="mt-2.5 flex items-start text-[11px] font-bold text-[#D94B5A]">
              <span className="shrink-0 font-black mr-2 text-[11.5px]">Remarks:</span>
              <p className="flex-1 min-w-0 font-semibold text-[11px] text-[#D94B5A] min-h-[16px] leading-snug break-words">
                {remarksDisplay}
              </p>
            </div>

            {/* Boxed Information Section (Challan No & Date, Vehicle, Stations) */}
            <div className="mt-2 border-[1.5px] border-[#D94B5A] px-3 py-2 bg-white text-[11px] font-bold text-[#D94B5A]">
              <div className="grid grid-cols-12 gap-3 items-center">
                <div className="col-span-4 flex items-center min-w-0">
                  <span className="shrink-0 font-black mr-1.5">Challan No & Date :</span>
                  <span className="flex-1 min-w-0 border-b border-[#D94B5A] pb-0.5 px-1.5 font-mono truncate">
                    {challanDisplay}
                  </span>
                </div>

                <div className="col-span-4 flex items-center min-w-0">
                  <span className="shrink-0 font-black mr-1.5">Vehicle :</span>
                  <span className="flex-1 min-w-0 border-b border-[#D94B5A] pb-0.5 px-1.5 font-mono uppercase truncate">
                    {safeStr(master.lorry_number || master.vehicle_no || dbSupplement?.lorryNumber, '')}
                  </span>
                </div>

                <div className="col-span-4 flex items-center min-w-0">
                  <span className="shrink-0 font-black mr-1.5">Stations :</span>
                  <span className="flex-1 min-w-0 border-b border-[#D94B5A] pb-0.5 px-1.5 uppercase truncate font-semibold">
                    {stationsDisplay}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Footer Section with Notes & Authorized Signatory */}
          <div className="mt-2.5 border-t border-[#D94B5A] pt-2.5 grid grid-cols-12 gap-4 text-[#D94B5A]">
            {/* Left Side: Legal Notes */}
            <div className="col-span-8 min-w-0 pr-3 border-r border-[#D94B5A] text-[9.5px] leading-snug space-y-1">
              <p className="font-black text-[10px]">Note:</p>
              <p className="font-semibold text-justify">
                1. Initiate your offer of settlement at an early date failing which we shall refer the matter to B.C.C.I for arbitrator.
              </p>
              <p className="font-semibold text-justify">
                2. Seller must remove the bales within three days from the date of serving the Mill Receipt if the rates given on the Mill Receipt by the Buyers are not acceptable to them, failing which Buyer will treat the consignment as having been accepted and will not be responsible for its being used up.
              </p>
              <p className="font-black text-[10px] tracking-wide pt-0.5 uppercase">
                ORIGINAL MUST BE ATTACHED WITH BILL/COPY
              </p>
            </div>

            {/* Right Side: Company Signatory Box */}
            <div className="col-span-4 min-w-0 flex flex-col justify-between items-center text-center pl-2">
              <p className="font-black text-[11px] uppercase tracking-wide leading-tight">
                FOR, BALLY JUTE COMPANY LIMITED
              </p>
              
              <div className="w-full pt-8">
                <div className="w-44 max-w-full mx-auto border-t border-[#D94B5A] mb-1"></div>
                <p className="font-black text-[10px] tracking-wider uppercase">
                  AUTHORISED SIGNATORY
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Dedicated Right Sprocket Feed Holes Strip (never overlaps text) */}
        <div className="w-[22px] bg-transparent flex flex-col justify-between py-1 shrink-0 ml-3 select-none print:hidden">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="w-3 h-3 bg-slate-100 rounded-full mx-auto shadow-inner border border-red-300/60 opacity-75"></div>
          ))}
        </div>

      </div>
      </div>
    </div>
  );
}
