import { aggregatePremiumsFromTables, filterAggregatedPremiums } from './paymentCalculationEngine';
import {
  ComputeInspectionMetricsParams,
  InspectionMetricsResult,
  InspectionRecord,
  PendingStageRecord,
  MonthInspectionSummary
} from '../types/dashboardCalculation.types';
import {
  extractPositiveVal,
  getRecordBales,
  getRecordNetWeightMt,
  normalizePoRef,
  parseRecordDate,
  MONTH_NAMES
} from './dashboardCalculationHelpers';

export function computeInspectionMetrics(params: ComputeInspectionMetricsParams): InspectionMetricsResult {
  const { 
    inspections = [], 
    inspectionDetails = [],
    materialInspections = [],
    millInspections = [],
    arrivals = [], 
    finalArrivals = [],
    saudaCheckPoints = [],
    saudaCheckPointDetails = [],
    paymentRecords = [],
    paymentDetails = [],
    pos = [], 
    settlements = [],
    selectedYear 
  } = params;

  // Pre-calculate available years from all sources to establish activeYear safely
  const yearsSet = new Set<number>();
  arrivals.forEach(a => {
    const rawDate = a.date || a.temporary_arrival_date || a.amad_date || a.created_at;
    if (rawDate) {
      const { year: aYear, isValid } = parseRecordDate(rawDate);
      if (isValid && aYear > 0) yearsSet.add(aYear);
    }
  });

  finalArrivals.forEach(fa => {
    const rawDate = fa.final_arrival_date || fa.date || fa.arrival_date || fa.created_at;
    if (rawDate) {
      const { year: fYear, isValid } = parseRecordDate(rawDate);
      if (isValid && fYear > 0) yearsSet.add(fYear);
    }
  });

  paymentRecords.forEach(p => {
    const rawDate = p.date || p.payment_date || p.created_at;
    if (rawDate) {
      const { year: pYear, isValid } = parseRecordDate(rawDate);
      if (isValid && pYear > 0) yearsSet.add(pYear);
    }
  });

  settlements.forEach(s => {
    const rawDate = s.audit_date || s.sett_date || s.date || s.bill_date || s.created_at;
    if (rawDate) {
      const { year: sYear, isValid } = parseRecordDate(rawDate);
      if (isValid && sYear > 0) yearsSet.add(sYear);
    }
  });

  const availableYears = Array.from(yearsSet).sort((a, b) => b - a);
  if (availableYears.length === 0) availableYears.push(2026);
  const activeYear = selectedYear && yearsSet.has(selectedYear) ? selectedYear : availableYears[0];

  // Unified payment & details premium calculation engine
  const unifiedPremiums = aggregatePremiumsFromTables(paymentRecords, paymentDetails);

  // Build Premium lookup map by normalized MR Number & PO Number & Voucher Number
  // Priority: 1. Payment Operations ("Material Grade Details Breakdown"), 2. Sauda Check Point, 3. PO
  const premiumMap = new Map<string, { premium: string; isPremium: boolean; rate: number; amount: number; source: string }>();

  const registerPremium = (refNo: string, raw: any, sourceName = "Payment Operations") => {
    if (!refNo) return;
    const clean = normalizePoRef(refNo);
    if (!clean) return;

    let premStr = "";
    let isPrem = false;
    let premRate = 0;
    let premAmount = 0;

    const rateCandidate = Number(raw.premium ?? raw.premium_rate ?? 0);
    const amtCandidate = Number(raw.summary_premium_amount ?? raw.val_premium_amt ?? raw.premium_amount ?? 0);
    const wtCandidateMt = Number(raw.arr_qty_wt ?? raw.wt_quantity ?? (Number(raw.quantity_qtl || 0) / 10) ?? raw.weight_mt ?? 0);
    const wtCandidateQtl = Number(raw.quantity_qtl ?? (wtCandidateMt * 10) ?? 0);

    if (rateCandidate > 0) {
      isPrem = true;
      premRate = rateCandidate;
      premStr = `₹${premRate}/Qtl`;
      premAmount = amtCandidate > 0 ? amtCandidate : (premRate * (wtCandidateQtl > 0 ? wtCandidateQtl : (wtCandidateMt * 10)));
    } else if (amtCandidate > 0) {
      isPrem = true;
      premAmount = amtCandidate;
      premStr = `₹${premAmount}`;
      premRate = wtCandidateQtl > 0 ? (premAmount / wtCandidateQtl) : (wtCandidateMt > 0 ? (premAmount / (wtCandidateMt * 10)) : 0);
    } else if (raw.premium !== undefined && raw.premium !== null && String(raw.premium).trim() !== "" && String(raw.premium).trim() !== "0" && String(raw.premium).trim().toLowerCase() !== "no") {
      premStr = String(raw.premium).trim();
      const num = parseFloat(premStr.replace(/[^0-9.]/g, ''));
      if (!isNaN(num) && num > 0) {
        premRate = num;
        premAmount = premRate * (wtCandidateQtl > 0 ? wtCandidateQtl : (wtCandidateMt * 10));
      }
      isPrem = /yes|true|premium/i.test(premStr) || premRate > 0;
    } else if (raw.is_premium === true || raw.is_premium === "Yes" || raw.is_premium === "YES") {
      isPrem = true;
      premStr = "Yes";
    }

    if (isPrem || premRate > 0 || premAmount > 0) {
      const existing = premiumMap.get(clean);
      if (existing) {
        existing.amount = Number((existing.amount + premAmount).toFixed(2));
        if (premRate > 0) {
          existing.rate = Math.max(existing.rate, premRate);
          existing.premium = `₹${existing.rate}/Qtl`;
        }
        existing.isPremium = true;
      } else {
        premiumMap.set(clean, {
          premium: premStr || (premRate > 0 ? `₹${premRate}/Qtl` : "Yes"),
          isPremium: true,
          rate: premRate,
          amount: Number(premAmount.toFixed(2)),
          source: sourceName
        });
      }
    }
  };

  // Dedicated Payment Section MR Premium index
  // Each MR can have multiple detail rows (e.g. 2 grades, each with premium rate * quintals)
  const paymentMrPremiumMap = new Map<string, {
    mrNo: string;
    cleanMr: string;
    voucherNo: string;
    date: string;
    year: number;
    month: number;
    rate: number;
    weightQtl: number;
    amount: number;
    supplier?: string;
    broker?: string;
    juteGrade?: string;
  }>();

  // Index payment records by voucher and MR for fast metadata lookup
  const paymentMetaMap = new Map<string, any>();
  paymentRecords.forEach(pm => {
    if (pm.voucher_no) paymentMetaMap.set(normalizePoRef(pm.voucher_no), pm);
    if (pm.mr_no) paymentMetaMap.set(normalizePoRef(pm.mr_no), pm);
    if (pm.arrival_no) paymentMetaMap.set(normalizePoRef(pm.arrival_no), pm);
  });

  // 1. Process paymentDetails (Material Grade Details breakdown with Premium)
  paymentDetails.forEach(det => {
    const rawMr = String(det.mr_no || det.arrival_no || '').trim();
    const cleanMr = normalizePoRef(rawMr);
    const premRate = Number(det.premium || det.rate_premium || 0);
    const premAmtExplicit = Number(det.summary_premium_amount || det.val_premium_amt || 0);
    const qtl = Number(det.quantity_qtl || 0) || (Number(det.arr_qty_wt || det.wt_quantity || 0) * 10);
    const calcAmt = premAmtExplicit > 0 ? premAmtExplicit : (premRate > 0 && qtl > 0 ? Number((premRate * qtl).toFixed(2)) : 0);

    if (cleanMr && (premRate > 0 || calcAmt > 0)) {
      const pmMeta = paymentMetaMap.get(normalizePoRef(det.voucher_no)) || paymentMetaMap.get(cleanMr) || {};
      const dateStr = pmMeta.payment_date || pmMeta.date || det.created_at || pmMeta.created_at || '';
      const { year: detYear, month: detMonth, isValid } = parseRecordDate(dateStr);

      const existing = paymentMrPremiumMap.get(cleanMr);
      if (existing) {
        existing.amount = Number((existing.amount + calcAmt).toFixed(2));
        existing.weightQtl = Number((existing.weightQtl + qtl).toFixed(2));
        if (premRate > 0) existing.rate = Math.max(existing.rate, premRate);
        if (!existing.date && dateStr) {
          existing.date = dateStr;
          existing.year = detYear;
          existing.month = detMonth;
        }
      } else {
        paymentMrPremiumMap.set(cleanMr, {
          mrNo: rawMr,
          cleanMr,
          voucherNo: det.voucher_no || pmMeta.voucher_no || '',
          date: dateStr,
          year: isValid ? detYear : (activeYear || 2026),
          month: isValid ? detMonth : 7,
          rate: premRate,
          weightQtl: qtl,
          amount: calcAmt,
          supplier: pmMeta.supplier || pmMeta.party_name || pmMeta.supplier_name || 'DIRECT SUPPLIER',
          broker: pmMeta.broker || pmMeta.broker_name || 'DIRECT',
          juteGrade: det.grade || det.jute_grade || 'TD-5'
        });
      }
    }
  });

  // 2. Process paymentRecords (Payment Master header records)
  paymentRecords.forEach(pm => {
    const rawMr = String(pm.mr_no || pm.arrival_no || '').trim();
    const cleanMr = normalizePoRef(rawMr);
    const premAmt = Number(pm.val_premium_amt || pm.summary_premium_amount || 0);
    const premRate = Number(pm.premium || pm.premium_rate || 0);
    if (cleanMr && (premAmt > 0 || premRate > 0)) {
      const dateStr = pm.payment_date || pm.date || pm.created_at || '';
      const { year: pmYear, month: pmMonth, isValid } = parseRecordDate(dateStr);
      const existing = paymentMrPremiumMap.get(cleanMr);
      if (existing) {
        if (existing.amount === 0 && premAmt > 0) existing.amount = premAmt;
        if (existing.rate === 0 && premRate > 0) existing.rate = premRate;
      } else {
        paymentMrPremiumMap.set(cleanMr, {
          mrNo: rawMr,
          cleanMr,
          voucherNo: pm.voucher_no || '',
          date: dateStr,
          year: isValid ? pmYear : (activeYear || 2026),
          month: isValid ? pmMonth : 7,
          rate: premRate,
          weightQtl: Number(pm.quantity_qtl || 0),
          amount: premAmt,
          supplier: pm.supplier || pm.party_name || pm.supplier_name || 'DIRECT SUPPLIER',
          broker: pm.broker || pm.broker_name || 'DIRECT',
          juteGrade: pm.jute_grade || pm.grade || 'TD-5'
        });
      }
    }
  });

  // 1. Payment Details (Material Grade Details breakdown with Premium ₹/Qtl * Weight MT)
  paymentDetails.forEach(det => {
    registerPremium(det.mr_no, det, "Payment Operations");
    registerPremium(det.voucher_no, det, "Payment Operations");
    registerPremium(det.arrival_no, det, "Payment Operations");
    registerPremium(det.po_no, det, "Payment Operations");
  });

  // 2. Payment Master records
  paymentRecords.forEach(pm => {
    registerPremium(pm.mr_no, pm, "Payment Operations");
    registerPremium(pm.voucher_no, pm, "Payment Operations");
    registerPremium(pm.arrival_no, pm, "Payment Operations");
    registerPremium(pm.po_no, pm, "Payment Operations");
  });

  // 3. Sauda Check Point and Details
  saudaCheckPoints.forEach(scp => {
    registerPremium(scp.mr_no, scp, "Sauda Check Point");
    registerPremium(scp.po_no, scp, "Sauda Check Point");
    registerPremium(scp.sauda_no, scp, "Sauda Check Point");
    registerPremium(scp.contract_no, scp, "Sauda Check Point");
  });

  saudaCheckPointDetails.forEach(det => {
    registerPremium(det.mr_no, det, "Sauda Check Point");
    registerPremium(det.po_no, det, "Sauda Check Point");
    registerPremium(det.sauda_no, det, "Sauda Check Point");
  });

  // 4. Purchase Orders
  pos.forEach(p => {
    registerPremium(p.po_no, p, "Purchase Order");
    registerPremium(p.contract_po_no, p, "Purchase Order");
  });

  // 5. Settlement Audits & Valuations
  settlements.forEach(st => {
    registerPremium(st.mr_no, st, "Settlement Audit");
    registerPremium(st.po_no, st, "Settlement Audit");
    registerPremium(st.sauda_no, st, "Settlement Audit");
    registerPremium(st.contract_po_no, st, "Settlement Audit");
    registerPremium(st.voucher_no, st, "Settlement Audit");
  });

  // Build detail rows mapping by MR No / Inspection ID
  const detailRowsByMr = new Map<string, any[]>();
  inspectionDetails.forEach(det => {
    const mr = normalizePoRef(det.mr_no || det.inspection_id || det.arrival_no || '');
    if (mr) {
      const existing = detailRowsByMr.get(mr) || [];
      existing.push(det);
      detailRowsByMr.set(mr, existing);
    }
  });

  // Build arrivals lookup map to enrich inspection metadata if needed
  const arrivalsByMr = new Map<string, any>();
  arrivals.forEach((item, idx) => {
    const mr = normalizePoRef(item.mr_no || item.temporary_arrival_no || item.arrival_no || item.amad_no || item.challan_no || `ARR-${idx}`);
    if (mr) {
      arrivalsByMr.set(mr, item);
    }
  });

  // Build a consolidated map of inspection records by MR No ONLY
  const mapByMr = new Map<string, any>();

  // 1. Process material_inspection records
  materialInspections.forEach((item, idx) => {
    const rawMr = item.mr_no || item.arrival_no || item.temporary_arrival_no || item.amad_no || item.id || `MI-${idx}`;
    const mr = normalizePoRef(rawMr);
    if (!mr) return;
    const arr = arrivalsByMr.get(mr) || arrivalsByMr.get(normalizePoRef(item.arrival_no || '')) || {};
    mapByMr.set(mr, { ...arr, ...item, inspection_source: 'material', is_inspected: true, status: item.status || 'Completed' });
  });

  // 2. Process mill_inspection_master records
  millInspections.forEach((item, idx) => {
    const rawMr = item.mr_no || item.arrival_no || item.temporary_arrival_no || item.amad_no || item.id || `MIM-${idx}`;
    const mr = normalizePoRef(rawMr);
    if (!mr) return;
    const arr = arrivalsByMr.get(mr) || arrivalsByMr.get(normalizePoRef(item.arrival_no || '')) || {};
    const existing = mapByMr.get(mr);
    mapByMr.set(mr, { ...arr, ...(existing || {}), ...item, inspection_source: 'mill', is_mill: true, is_inspected: true, status: item.status || 'Completed' });
  });

  // 3. Process generic inspection records if passed
  inspections.forEach((item, idx) => {
    const rawMr = item.mr_no || item.arrival_no || item.temporary_arrival_no || item.amad_no || item.id || `MR-${idx}`;
    const mr = normalizePoRef(rawMr);
    if (!mr) return;
    
    // Enrich with arrival data if available
    const arr = arrivalsByMr.get(mr) || arrivalsByMr.get(normalizePoRef(item.arrival_no || '')) || {};
    const isMill = item.inspection_source === 'mill' || item.is_mill || Boolean(item.mill_code) || Boolean(item.mill_name);
    const existing = mapByMr.get(mr);
    const isInspected = item.is_inspected === true || item.status === 'Completed' || item.status === 'Audited';
    mapByMr.set(mr, {
      ...arr,
      ...(existing || {}),
      ...item,
      inspection_source: existing?.inspection_source || (isMill ? 'mill' : 'material'),
      is_inspected: isInspected,
      status: isInspected ? (item.status || 'Completed') : 'Pending'
    });
  });

  // 4. Process all arrivals from temporary_material_received (MRs)
  arrivals.forEach((item, idx) => {
    const rawMr = item.mr_no || item.temporary_arrival_no || item.arrival_no || item.amad_no || item.amad_id || `ARR-${idx}`;
    const mr = normalizePoRef(rawMr);
    if (!mr) return;
    if (!mapByMr.has(mr)) {
      mapByMr.set(mr, {
        ...item,
        is_inspected: false,
        status: (item.inspection_status === 'inspected' || item.status === 'inspected') ? 'Completed' : 'Pending',
        inspection_source: 'arrival'
      });
    }
  });

  // 5. Process Payment records and Payment Details so Payment Section MRs are included
  paymentRecords.forEach((item, idx) => {
    const rawMr = item.mr_no || item.arrival_no || `PAY-${idx}`;
    const mr = normalizePoRef(rawMr);
    if (!mr) return;
    if (!mapByMr.has(mr)) {
      mapByMr.set(mr, {
        ...item,
        mr_no: rawMr,
        arrival_date: item.payment_date || item.date || item.created_at,
        is_inspected: true,
        status: item.status || 'Paid',
        inspection_source: 'payment'
      });
    } else {
      const existing = mapByMr.get(mr);
      mapByMr.set(mr, {
        ...existing,
        is_inspected: true,
        payment_date: item.payment_date || item.date || existing.payment_date,
        paid_amount: item.paid_amount || item.payable_amt || existing.paid_amount
      });
    }
  });

  paymentDetails.forEach((item, idx) => {
    const rawMr = item.mr_no || item.arrival_no || `PD-${idx}`;
    const mr = normalizePoRef(rawMr);
    if (!mr) return;
    if (!mapByMr.has(mr)) {
      mapByMr.set(mr, {
        ...item,
        mr_no: rawMr,
        arrival_date: item.created_at || item.bill_date || item.date,
        is_inspected: true,
        status: 'Paid',
        inspection_source: 'payment'
      });
    }
  });

  // 6. Ensure all MRs with Premium from Payment Section exist in mapByMr
  paymentMrPremiumMap.forEach((entry, cleanMr) => {
    if (!mapByMr.has(cleanMr)) {
      mapByMr.set(cleanMr, {
        id: `pay-prem-${cleanMr}`,
        mr_no: entry.mrNo,
        arrival_date: entry.date,
        supplier_name: entry.supplier,
        broker_name: entry.broker,
        jute_grade: entry.juteGrade,
        quantity_qtl: entry.weightQtl,
        weight_mt: Number((entry.weightQtl / 10).toFixed(3)),
        premium: entry.rate > 0 ? `₹${entry.rate}/Qtl` : 'Yes',
        is_premium: true,
        premium_rate: entry.rate,
        summary_premium_amount: entry.amount,
        is_inspected: true,
        status: 'Paid',
        inspection_source: 'payment'
      });
    }
  });

  const parsedInspections: InspectionRecord[] = [];

  mapByMr.forEach((raw, cleanMr) => {
    // Column Name from Screenshot 3: "Arrival Date"
    const dateStr = raw.arrival_date || raw.date || raw.inspection_date || raw.mr_date || raw.unloading_date || raw.created_at || '';
    const { year, month: monthIndex, isValid } = parseRecordDate(dateStr);
    if (isValid && year > 0) {
      yearsSet.add(year);
    }

    const poRaw = raw.po_no || raw.mill_po_no || raw.contract_no || raw.sauda_no || '';
    const cleanPo = normalizePoRef(poRaw);

    // Detail rows for this MR if any
    const relatedDetailsRaw = detailRowsByMr.get(cleanMr) || raw.grid_details || raw.details || [];
    const relatedDetails = Array.isArray(relatedDetailsRaw) ? relatedDetailsRaw : [];
    
    // Robust Weight Calculation in MT & Qtl
    let wtMt = 0;
    if (relatedDetails.length > 0) {
      const sumGross = relatedDetails.reduce((acc, d) => acc + (Number(d.receipt_gross_wt ?? d.challan_gross_wt ?? d.weight ?? d.quantity ?? 0)), 0);
      if (sumGross > 0) {
        wtMt = sumGross > 100 ? sumGross / 1000 : (sumGross > 50 ? sumGross / 10 : sumGross);
      }
    }
    if (wtMt === 0) {
      const rawGross = Number(raw.challan_gross_wt || raw.receipt_gross_wt || raw.total_actual_weight || raw.weight_mt || 0);
      if (rawGross > 0) {
        wtMt = rawGross > 100 ? rawGross / 1000 : (rawGross > 50 ? rawGross / 10 : rawGross);
      }
    }
    if (wtMt === 0) {
      const rawNet = Number(raw.electronic_net_weight || raw.supplier_net_weight || raw.challan_material_weight || raw.weight_qtl || raw.weight || 0);
      if (rawNet > 0) {
        wtMt = rawNet > 50 ? (rawNet / 10) : rawNet;
      }
    }
    if (wtMt === 0) {
      wtMt = 10.28; // Default lorry weight fallback
    }

    let wtQtl = Number(raw.quantity_qtl || (wtMt * 10) || 0);
    if (wtQtl <= 0) wtQtl = wtMt * 10;

    // 1. Moisture %
    let actualM = extractPositiveVal(raw, [
      'actual_moisture', 'arrival_moisture', 'moisture_pct', 'moisture_act', 'inspection_moisture',
      'moisture', 'lab_moisture', 'moist_pct', 'mst_pct', 'actual_moist', 'gate_moisture'
    ]);
    if (actualM === 0 && raw.quality_matrix?.moisture) {
      const qm = raw.quality_matrix.moisture;
      for (const k of ['1st', '2nd', '3rd', '4th', 'col1', 'col2', 'col3', 'col4']) {
        const val = extractPositiveVal(qm[k], ['actual', 'val', 'value']);
        if (val > 0) {
          actualM = val;
          break;
        }
      }
    }
    if (actualM === 0 && relatedDetails.length > 0) {
      for (const d of relatedDetails) {
        const val = extractPositiveVal(d, [
          'actual_moisture', 'arrival_moisture', 'moisture_pct', 'moisture_act', 'inspection_moisture',
          'moisture', 'lab_moisture', 'moist_pct', 'mst_pct', 'actual_moist', 'gate_moisture'
        ]);
        if (val > 0) {
          actualM = val;
          break;
        }
      }
    }
    if (isNaN(actualM)) actualM = 0;

    let claimM = extractPositiveVal(raw, ['claim_moisture', 'moisture_claim', 'claim_mst']);
    if (claimM === 0 && raw.quality_matrix?.moisture) {
      const qm = raw.quality_matrix.moisture;
      for (const k of ['1st', '2nd', '3rd', '4th', 'col1', 'col2', 'col3', 'col4']) {
        const val = extractPositiveVal(qm[k], ['claim', 'val', 'value']);
        if (val > 0) {
          claimM = val;
          break;
        }
      }
    }
    if (claimM === 0 && relatedDetails.length > 0) {
      for (const d of relatedDetails) {
        const val = extractPositiveVal(d, ['claim_moisture', 'moisture_claim', 'claim_mst']);
        if (val > 0) {
          claimM = val;
          break;
        }
      }
    }
    if (isNaN(claimM)) claimM = 0;
    if (claimM <= 0 && actualM > 0) {
      claimM = actualM;
    }
    const moistDedAmt = Number(raw.moisture_claim_amt || raw.moisture_deduction_amount || (claimM > 0 ? (claimM * 50) : 0));

    // 2. Dust %
    let actualDust = extractPositiveVal(raw, ['actual_dust', 'dust_act', 'dust_pct', 'arrival_dust', 'dust']);
    if (actualDust === 0 && raw.quality_matrix?.dust) {
      const qm = raw.quality_matrix.dust;
      for (const k of ['1st', '2nd', '3rd', '4th', 'col1', 'col2', 'col3', 'col4']) {
        const val = extractPositiveVal(qm[k], ['actual', 'val', 'value']);
        if (val > 0) {
          actualDust = val;
          break;
        }
      }
    }
    if (actualDust === 0 && relatedDetails.length > 0) {
      for (const d of relatedDetails) {
        const val = extractPositiveVal(d, ['actual_dust', 'dust_act', 'dust_pct', 'arrival_dust', 'dust']);
        if (val > 0) {
          actualDust = val;
          break;
        }
      }
    }
    if (isNaN(actualDust)) actualDust = 0;

    let claimDust = extractPositiveVal(raw, ['claim_dust', 'dust_claim']);
    if (claimDust === 0 && raw.quality_matrix?.dust) {
      const qm = raw.quality_matrix.dust;
      for (const k of ['1st', '2nd', '3rd', '4th', 'col1', 'col2', 'col3', 'col4']) {
        const val = extractPositiveVal(qm[k], ['claim', 'val', 'value']);
        if (val > 0) {
          claimDust = val;
          break;
        }
      }
    }
    if (claimDust === 0 && relatedDetails.length > 0) {
      for (const d of relatedDetails) {
        const val = extractPositiveVal(d, ['claim_dust', 'dust_claim']);
        if (val > 0) {
          claimDust = val;
          break;
        }
      }
    }
    if (isNaN(claimDust)) claimDust = 0;
    if (claimDust <= 0 && actualDust > 0) {
      claimDust = actualDust;
    }
    const dustDedAmt = Number(raw.dust_claim_amt || raw.dust_deduction_amount || (claimDust > 0 ? (claimDust * 40) : 0));

    // 3. Grade Down %
    let actualGradeDown = extractPositiveVal(raw, ['actual_grade_down', 'grade_down_act', 'grade_down_pct', 'arrival_grade_down', 'grade_down', 'grd_down']);
    if (actualGradeDown === 0 && raw.quality_matrix?.grade_down) {
      const qm = raw.quality_matrix.grade_down;
      for (const k of ['1st', '2nd', '3rd', '4th', 'col1', 'col2', 'col3', 'col4']) {
        const val = extractPositiveVal(qm[k], ['actual', 'val', 'value']);
        if (val > 0) {
          actualGradeDown = val;
          break;
        }
      }
    }
    if (actualGradeDown === 0 && relatedDetails.length > 0) {
      for (const d of relatedDetails) {
        const val = extractPositiveVal(d, [
          'actual_grade_down', 'grade_down_act', 'grade_down_pct', 'arrival_grade_down', 'grade_down', 'grd_down'
        ]);
        if (val > 0) {
          actualGradeDown = val;
          break;
        }
      }
    }
    if (isNaN(actualGradeDown)) actualGradeDown = 0;

    let claimGradeDown = extractPositiveVal(raw, ['claim_grade_down', 'grade_down_claim']);
    if (claimGradeDown === 0 && raw.quality_matrix?.grade_down) {
      const qm = raw.quality_matrix.grade_down;
      for (const k of ['1st', '2nd', '3rd', '4th', 'col1', 'col2', 'col3', 'col4']) {
        const val = extractPositiveVal(qm[k], ['claim', 'val', 'value']);
        if (val > 0) {
          claimGradeDown = val;
          break;
        }
      }
    }

    if (claimGradeDown === 0 && relatedDetails.length > 0) {
      for (const d of relatedDetails) {
        const val = extractPositiveVal(d, ['claim_grade_down', 'grade_down_claim']);
        if (val > 0) {
          claimGradeDown = val;
          break;
        }
      }
    }
    if (isNaN(claimGradeDown)) claimGradeDown = 0;
    if (claimGradeDown <= 0 && actualGradeDown > 0) {
      claimGradeDown = actualGradeDown;
    }
    const gradeDownDedAmt = Number(raw.grade_down_claim_amt || raw.grade_deduction_amount || raw.quality_deduction_amount || (claimGradeDown > 0 ? (claimGradeDown * 60) : 0));

    // 4. Chotta & Habi Jabi
    let chottaKg = Number(raw.chotta_weight || raw.chotta_wt || 0);
    let habijabiKg = Number(raw.ropes_weight || raw.habijabi_weight || raw.hb_weight || 0);
    let chottaGrade = String(raw.chotta_grade || 'CHOTTA').trim();
    let habijabiGrade = String(raw.ropes_grade || raw.habijabi_grade || 'HABIJABI').trim();
    
    if (relatedDetails.length > 0) {
      relatedDetails.forEach((d: any) => {
        chottaKg += Number(d.chotta_weight || 0);
        habijabiKg += Number(d.ropes_weight || d.habijabi_weight || 0);
        if (d.chotta_grade) chottaGrade = d.chotta_grade;
        if (d.ropes_grade || d.habijabi_grade) habijabiGrade = d.ropes_grade || d.habijabi_grade;
      });
    }
    const totChottaHabijabiKg = chottaKg + habijabiKg;
    const chottaHabijabiDedAmt = Number(raw.chotta_deduction_amount || raw.ropes_deduction_amount || (totChottaHabijabiKg > 0 ? Number(((totChottaHabijabiKg / 100) * 1500).toFixed(2)) : 0));

    // 5. Premium: Highest priority from Payment Operations (Premium ₹/Qtl * Weight MT) / Sauda Check Point
    let premiumData = premiumMap.get(cleanMr) || premiumMap.get(cleanPo) || { premium: "No", isPremium: false, rate: 0, amount: 0, source: "Payment Operations / SCP" };
    
    // Explicit priority from Payment Section MR Premium index
    const payPrem = paymentMrPremiumMap.get(cleanMr);
    if (payPrem && (payPrem.amount > 0 || payPrem.rate > 0)) {
      premiumData = {
        premium: payPrem.rate > 0 ? `₹${payPrem.rate}/Qtl` : (payPrem.amount > 0 ? `₹${payPrem.amount}` : "Yes"),
        isPremium: true,
        rate: payPrem.rate,
        amount: payPrem.amount,
        source: "Payment Section"
      };
      if (payPrem.weightQtl > 0 && wtQtl === 0) {
        wtQtl = payPrem.weightQtl;
        wtMt = Number((payPrem.weightQtl / 10).toFixed(3));
      }
    }
    
    // Check if raw inspection itself or related details have premium
    if (!premiumData.isPremium) {
      if (raw.premium && String(raw.premium).trim() !== "" && String(raw.premium).trim() !== "0" && String(raw.premium).trim().toLowerCase() !== "no") {
        const num = parseFloat(String(raw.premium).replace(/[^0-9.]/g, ''));
        const premRate = !isNaN(num) && num > 0 ? num : 0;
        premiumData = {
          premium: String(raw.premium),
          isPremium: true,
          rate: premRate,
          amount: premRate > 0 ? Number((premRate * (wtQtl > 0 ? wtQtl : (wtMt * 10))).toFixed(2)) : 0,
          source: "Inspection / Payment"
        };
      } else if (relatedDetails.some((d: any) => Number(d.premium || 0) > 0 || d.is_premium === true)) {
        const dPrem = relatedDetails.find((d: any) => Number(d.premium || 0) > 0 || d.is_premium === true);
        const premRate = Number(dPrem?.premium || 0);
        premiumData = {
          premium: premRate > 0 ? `₹${premRate}/Qtl` : "Yes",
          isPremium: true,
          rate: premRate,
          amount: premRate > 0 ? Number((premRate * (wtQtl > 0 ? wtQtl : (wtMt * 10))).toFixed(2)) : 0,
          source: "Inspection Details"
        };
      }
    }

    // Deduction amounts
    const delivDedAmt = Number(raw.delivery_claim_amount || raw.delivery_claim || 0);
    const baleDedAmt = Number(raw.bale_weight_deduction_amount || 0);
    const otherDedAmt = Number(raw.other_deduction_amount || 0);
    
    let totalClaim = Number(raw.summary_deduction_amount || raw.total_deduction_amt || raw.claim_amount || raw.deduction_amount || 0);
    if (totalClaim <= 0) {
      totalClaim = moistDedAmt + dustDedAmt + gradeDownDedAmt + chottaHabijabiDedAmt + delivDedAmt + baleDedAmt + otherDedAmt;
    }

    const supplier = String(raw.supplier_name || raw.supplier || raw.vyapari_name || 'DIRECT SUPPLIER').trim();
    const broker = String(raw.broker_name || raw.broker || 'DIRECT').trim();
    const vehicle = String(raw.lorry_number || raw.vehicle_no || raw.truck_no || 'WB-00-1234').trim();
    const grade = String(raw.jute_grade || raw.grade || raw.stock_grade_name || (relatedDetails[0]?.stock_grade_code) || 'TD-4').trim().toUpperCase();
    const remarks = String(raw.remarks || raw.mr_spcl_print || '').trim();

    parsedInspections.push({
      id: raw.id || `insp-rec-${cleanMr}`,
      mrNo: raw.mr_no || raw.amad_no || raw.challan_no || cleanMr,
      cleanMrNo: cleanMr,
      poNo: poRaw || '---',
      cleanPoNo: cleanPo,
      date: dateStr ? new Date(dateStr).toLocaleDateString('en-IN') : '2026-09-24',
      year,
      month: monthIndex,
      monthName: MONTH_NAMES[monthIndex] || `Month ${monthIndex + 1}`,
      supplier,
      broker,
      vehicleNo: vehicle,
      juteGrade: grade,
      weightQtl: Number(wtQtl.toFixed(2)),
      weightMt: Number(wtMt.toFixed(3)),
      
      // 1. Moisture
      actualMoisture: Number(actualM.toFixed(1)),
      claimMoisture: Number(claimM.toFixed(1)),
      moistureDeductionAmount: moistDedAmt,
      
      // 2. Dust
      actualDust: Number(actualDust.toFixed(1)),
      claimDust: Number(claimDust.toFixed(1)),
      dustDeductionAmount: dustDedAmt,
      
      // 3. Grade Down
      actualGradeDown: Number(actualGradeDown.toFixed(1)),
      claimGradeDown: Number(claimGradeDown.toFixed(1)),
      gradeDownDeductionAmount: gradeDownDedAmt,
      
      // 4. Chotta & Habi Jabi
      chottaWeightKg: Number(chottaKg.toFixed(1)),
      habijabiWeightKg: Number(habijabiKg.toFixed(1)),
      totalChottaHabijabiKg: Number(totChottaHabijabiKg.toFixed(1)),
      chottaHabijabiDeductionAmount: chottaHabijabiDedAmt,
      chottaGrade,
      habijabiGrade,
      
      // 5. Premium from Payment Operations / Sauda Check Point
      premium: premiumData.premium,
      isPremium: premiumData.isPremium && (premiumData.rate > 0 || premiumData.amount > 0 || /yes|true/i.test(premiumData.premium)),
      premiumRate: premiumData.rate,
      premiumAmount: premiumData.amount > 0 ? premiumData.amount : (premiumData.rate > 0 ? Number((premiumData.rate * (wtQtl > 0 ? wtQtl : (wtMt * 10))).toFixed(2)) : 0),
      premiumSource: premiumData.source,
      
      qualityDeductionAmount: gradeDownDedAmt + dustDedAmt,
      deliveryClaimAmount: delivDedAmt,
      baleWeightDeductionAmount: baleDedAmt,
      otherDeductionAmount: otherDedAmt,
      totalClaimAmount: Number(totalClaim.toFixed(2)),
      status: raw.status || 'Audited',
      remarks,
      rawRecord: raw
    });
  });

  // 1. Index Temporary Arrivals for activeYear by month
  const arrivalsByMonth = new Map<number, any[]>();
  // 2. Index Final Arrivals for activeYear by month & build final lookup set
  const finalArrivalsByMonth = new Map<number, any[]>();
  const finalArrivalsSet = new Set<string>();
  // 3. Index payments for activeYear by month
  const paymentsByMonth = new Map<number, any[]>();
  // 4. Index settlements for activeYear by month
  const settlementsByMonth = new Map<number, any[]>();

  for (let m = 0; m < 12; m++) {
    arrivalsByMonth.set(m, []);
    finalArrivalsByMonth.set(m, []);
    paymentsByMonth.set(m, []);
    settlementsByMonth.set(m, []);
  }

  // Populate Temporary Arrivals
  let yearTotalArrivalsBales = 0;
  let yearTotalArrivalsWeightMt = 0;
  const yearArrivals: any[] = [];
  arrivals.forEach(a => {
    const rawDate = a.date || a.temporary_arrival_date || a.amad_date || a.created_at;
    const { year: aYear, month: aMonth, isValid } = parseRecordDate(rawDate);
    if (isValid && aYear === activeYear && aMonth >= 0 && aMonth < 12) {
      arrivalsByMonth.get(aMonth)?.push(a);
      yearArrivals.push(a);
      yearTotalArrivalsBales += getRecordBales(a);
      yearTotalArrivalsWeightMt += getRecordNetWeightMt(a);
    }
  });

  // Populate Final Arrivals and global Final Arrival set
  let yearTotalFinalArrivalsCount = 0;
  let yearTotalFinalBales = 0;
  let yearTotalFinalWeightMt = 0;
  finalArrivals.forEach((fa, idx) => {
    const rawNo = fa.final_arrival_no || fa.arrival_no || fa.temporary_arrival_no || fa.mr_no || fa.amad_no || `FA-${idx}`;
    const cleanNo = normalizePoRef(rawNo);
    if (cleanNo) {
      finalArrivalsSet.add(cleanNo);
      finalArrivalsSet.add(cleanNo.replace(/[\s\-_]/g, ''));
    }
    if (fa.temporary_arrival_no) {
      finalArrivalsSet.add(normalizePoRef(fa.temporary_arrival_no));
      finalArrivalsSet.add(String(fa.temporary_arrival_no).toUpperCase().replace(/[\s\-_]/g, ''));
    }
    if (fa.mr_no) {
      finalArrivalsSet.add(normalizePoRef(fa.mr_no));
      finalArrivalsSet.add(String(fa.mr_no).toUpperCase().replace(/[\s\-_]/g, ''));
    }
    if (fa.arrival_no) {
      finalArrivalsSet.add(normalizePoRef(fa.arrival_no));
      finalArrivalsSet.add(String(fa.arrival_no).toUpperCase().replace(/[\s\-_]/g, ''));
    }
    if (fa.final_arrival_no) {
      finalArrivalsSet.add(normalizePoRef(fa.final_arrival_no));
      finalArrivalsSet.add(String(fa.final_arrival_no).toUpperCase().replace(/[\s\-_]/g, ''));
    }

    const rawDate = fa.final_arrival_date || fa.date || fa.arrival_date || fa.created_at;
    const { year: fYear, month: fMonth, isValid } = parseRecordDate(rawDate);
    if (isValid && fYear === activeYear && fMonth >= 0 && fMonth < 12) {
      finalArrivalsByMonth.get(fMonth)?.push(fa);
      yearTotalFinalArrivalsCount++;
      yearTotalFinalBales += getRecordBales(fa);
      yearTotalFinalWeightMt += getRecordNetWeightMt(fa);
    }
  });

  // Assign payments by payment Date
  let totalYearPayments = 0;
  let totalYearPaidAmount = 0;
  paymentRecords.forEach(p => {
    const rawDate = p.date || p.payment_date || p.created_at;
    const { year: pYear, month: pMonth, isValid } = parseRecordDate(rawDate);
    
    if (isValid && pYear === activeYear && pMonth >= 0 && pMonth < 12) {
      totalYearPayments++;
      totalYearPaidAmount += Number(p.paid_amount || 0);
      paymentsByMonth.get(pMonth)?.push(p);
    }
  });

  // Assign settlements by Audit Date
  let totalYearSettlements = 0;
  let totalYearSettledAmount = 0;
  settlements.forEach(s => {
    const rawDate = s.audit_date || s.sett_date || s.date || s.bill_date || s.created_at;
    const { year: sYear, month: sMonth, isValid } = parseRecordDate(rawDate);

    if (isValid && sYear === activeYear && sMonth >= 0 && sMonth < 12) {
      totalYearSettlements++;
      totalYearSettledAmount += Number(s.net_payable_amount || s.amount || s.total_value || 0);
      settlementsByMonth.get(sMonth)?.push(s);
    }
  });

  const yearInspections = parsedInspections.filter(r => r.year === activeYear);

  // Group by Month (0 to 11)
  const monthInspectionSummaries: MonthInspectionSummary[] = Array.from({ length: 12 }, (_, mIdx) => {
    const list = yearInspections.filter(r => r.month === mIdx);
    const monthArrivals = arrivalsByMonth.get(mIdx) || [];
    const monthFinalArrivals = finalArrivalsByMonth.get(mIdx) || [];
    const monthPayments = paymentsByMonth.get(mIdx) || [];
    const monthSettlements = settlementsByMonth.get(mIdx) || [];

    const temporaryArrivalsCount = monthArrivals.length > 0 ? monthArrivals.length : list.length;
    const temporaryArrivalsBales = monthArrivals.reduce((sum, a) => sum + getRecordBales(a), 0);
    const temporaryArrivalsWeightMt = monthArrivals.reduce((sum, a) => sum + getRecordNetWeightMt(a), 0);

    const finalArrivalsCount = monthFinalArrivals.length;
    const finalArrivalsBales = monthFinalArrivals.reduce((sum, f) => sum + getRecordBales(f), 0);
    const finalArrivalsWeightMt = monthFinalArrivals.reduce((sum, f) => sum + getRecordNetWeightMt(f), 0);
    const pendingFmrCount = monthArrivals.filter(a => {
      const k = normalizePoRef(a.temporary_arrival_no || a.amad_no || a.mr_no || a.arrival_no || a.amad_id);
      return !k || !finalArrivalsSet.has(k);
    }).length;

    const completedInspections = list.filter(r => r.status !== 'Pending' && r.rawRecord?.is_inspected);
    const inspectionCount = completedInspections.length;
    const pendingInspectionCount = Math.max(0, temporaryArrivalsCount - inspectionCount);

    if (temporaryArrivalsCount === 0 && finalArrivalsCount === 0 && inspectionCount === 0 && monthPayments.length === 0 && monthSettlements.length === 0) {
      return null;
    }

    let totWt = 0;
    let moistSum = 0;
    let claimMoistSum = 0;
    let dustSum = 0;
    let claimDustSum = 0;
    let gradeDownSum = 0;
    let claimGradeDownSum = 0;
    let totChottaHbKg = 0;
    let totChottaHbClaim = 0;
    let totClaim = 0;
    let moistClaimLots = 0;
    let qualClaimLots = 0;

    const qualitySourceList = list.length > 0 ? list : completedInspections;

    // Direct aggregation of MRs with Premium from unified engine
    const monthPrem = filterAggregatedPremiums(unifiedPremiums, activeYear, mIdx);
    const premLots = monthPrem.count;
    const premSum = monthPrem.sum;
    const premRateTotal = monthPrem.mrs.reduce((acc, m) => acc + m.avgPremiumRatePerQtl, 0);
    const premQtlTotal = monthPrem.mrs.reduce((acc, m) => acc + m.totalQuantityQtl, 0);

    qualitySourceList.forEach(r => {
      totWt += r.weightMt;
      moistSum += r.actualMoisture;
      claimMoistSum += r.claimMoisture;
      dustSum += r.actualDust;
      claimDustSum += r.claimDust;
      gradeDownSum += r.actualGradeDown;
      claimGradeDownSum += r.claimGradeDown;
      totChottaHbKg += r.totalChottaHabijabiKg;
      totChottaHbClaim += r.chottaHabijabiDeductionAmount;
      totClaim += r.totalClaimAmount;
      if (r.claimMoisture > 0 || r.moistureDeductionAmount > 0) moistClaimLots++;
      if (r.qualityDeductionAmount > 0 || r.claimGradeDown > 0 || r.claimDust > 0) qualClaimLots++;
    });

    let moistCount = qualitySourceList.filter(r => r.actualMoisture > 0).length;
    let claimMoistCount = qualitySourceList.filter(r => r.claimMoisture > 0).length;
    let dustCount = qualitySourceList.filter(r => r.actualDust > 0).length;
    let claimDustCount = qualitySourceList.filter(r => r.claimDust > 0).length;
    let gradeDownCount = qualitySourceList.filter(r => r.actualGradeDown > 0).length;
    let claimGradeDownCount = qualitySourceList.filter(r => r.claimGradeDown > 0).length;

    // Supplementary scan over raw monthArrivals & monthFinalArrivals if qualitySourceList has 0 moisture/grade records
    if (moistCount === 0 || gradeDownCount === 0) {
      const rawArrivalPool = [...monthArrivals, ...monthFinalArrivals];
      rawArrivalPool.forEach(arrRec => {
        if (moistCount === 0) {
          const arrM = extractPositiveVal(arrRec, [
            'actual_moisture', 'arrival_moisture', 'moisture_pct', 'moisture_act', 'inspection_moisture',
            'moisture', 'lab_moisture', 'moist_pct', 'mst_pct', 'actual_moist', 'gate_moisture'
          ]);
          if (arrM > 0) {
            moistSum += arrM;
            moistCount++;
          }
        }
        if (gradeDownCount === 0) {
          const arrG = extractPositiveVal(arrRec, [
            'actual_grade_down', 'grade_down_act', 'grade_down_pct', 'arrival_grade_down', 'grade_down', 'grd_down'
          ]);
          if (arrG > 0) {
            gradeDownSum += arrG;
            gradeDownCount++;
          }
        }
      });
    }

    const avgMoisture = moistCount > 0 ? Number((moistSum / moistCount).toFixed(1)) : 0;
    const avgClaimMoisture = claimMoistCount > 0 ? Number((claimMoistSum / claimMoistCount).toFixed(1)) : 0;
    const avgDust = dustCount > 0 ? Number((dustSum / dustCount).toFixed(1)) : 0;
    const avgClaimDust = claimDustCount > 0 ? Number((claimDustSum / claimDustCount).toFixed(1)) : 0;
    const avgGradeDown = gradeDownCount > 0 ? Number((gradeDownSum / gradeDownCount).toFixed(1)) : 0;
    const avgClaimGradeDown = claimGradeDownCount > 0 ? Number((claimGradeDownSum / claimGradeDownCount).toFixed(1)) : 0;

    const matCount = completedInspections.filter(r => r.rawRecord?.inspection_source === 'material').length;
    const millCount = completedInspections.filter(r => r.rawRecord?.inspection_source === 'mill' || r.rawRecord?.is_mill || Boolean(r.rawRecord?.mill_code) || r.rawRecord?.source === 'mill').length;

    const paymentPaidAmount = monthPayments.reduce((sum, p) => sum + Number(p.paid_amount || 0), 0);
    const paymentPayableAmount = monthPayments.reduce((sum, p) => sum + Number(p.payable_amt || p.total_amount || 0), 0);
    const settlementAmount = monthSettlements.reduce((sum, s) => sum + Number(s.net_payable_amount || s.amount || s.total_value || 0), 0);

    // 1. Pipeline: MR -> Final MR (Pending FMR)
    const pendingFmrList: PendingStageRecord[] = monthArrivals.filter(a => {
      const rawMr = a.temporary_arrival_no || a.amad_no || a.mr_no || a.arrival_no || a.amad_id;
      const k1 = normalizePoRef(rawMr);
      const k2 = String(rawMr || '').toUpperCase().replace(/[\s\-_]/g, '');
      const isCompleted = (k1 && finalArrivalsSet.has(k1)) || (k2 && finalArrivalsSet.has(k2)) || (a.final_arrival_no && String(a.final_arrival_no).trim() !== '') || Boolean(a.is_final_arrival_done);
      return !isCompleted;
    }).map((a, idx) => {
      const rawMr = a.temporary_arrival_no || a.amad_no || a.mr_no || a.arrival_no || a.amad_id || `ARR-${idx}`;
      const rawPo = a.po_no || a.mill_po_no || a.contract_no || a.sauda_no || '';
      const wtMt = getRecordNetWeightMt(a);
      const bales = getRecordBales(a);
      return {
        id: a.id || `pending-fmr-${mIdx}-${idx}-${rawMr}`,
        stage: 'MR_TO_FMR',
        stageLabel: 'MR ➔ Final MR (Below FMR)',
        stageCode: 'MR ➔ FMR',
        poNo: rawPo || 'N/A',
        cleanPoNo: normalizePoRef(rawPo),
        mrNo: rawMr,
        arrivalNo: a.arrival_no || a.temporary_arrival_no || rawMr,
        date: a.date || a.temporary_arrival_date || a.amad_date || a.created_at || '',
        supplier: a.supplier_name || a.supplier || a.challan_supplier || a.party_name || 'N/A',
        broker: a.broker_name || a.broker || 'DIRECT',
        vehicleNo: a.lorry_number || a.vehicle_no || a.truck_no || 'N/A',
        bales,
        weightMt: Number(wtMt.toFixed(3)),
        weightQtl: Number((wtMt * 10).toFixed(2)),
        amount: Number(a.challan_value || a.amount || 0),
        status: 'Pending Final MR Entry',
        pendingAction: 'Complete Gate Inward Final M.R. (FMR)',
        rawRecord: a
      };
    });

    // 2. Pipeline: Final MR -> Mill Inspection (Pending Inspection)
    const inspectedMrSet = new Set(completedInspections.map(r => r.cleanMrNo).filter(Boolean));
    const pendingInspectionList: PendingStageRecord[] = monthFinalArrivals.filter(fa => {
      const rawNo = fa.final_arrival_no || fa.arrival_no || fa.temporary_arrival_no || fa.mr_no;
      const cleanNo = normalizePoRef(rawNo);
      return !cleanNo || !inspectedMrSet.has(cleanNo);
    }).map((fa, idx) => {
      const rawMr = fa.final_arrival_no || fa.arrival_no || fa.temporary_arrival_no || fa.mr_no || `FA-${idx}`;
      const rawPo = fa.po_no || fa.mill_po_no || fa.contract_no || '';
      const wtMt = getRecordNetWeightMt(fa);
      const bales = getRecordBales(fa);
      return {
        id: fa.id || `pending-insp-${mIdx}-${idx}-${rawMr}`,
        stage: 'FMR_TO_INSP',
        stageLabel: 'Final MR ➔ Mill Inspection',
        stageCode: 'FMR ➔ INSP',
        poNo: rawPo || 'N/A',
        cleanPoNo: normalizePoRef(rawPo),
        mrNo: rawMr,
        arrivalNo: fa.final_arrival_no || fa.arrival_no || rawMr,
        date: fa.final_arrival_date || fa.date || fa.arrival_date || fa.created_at || '',
        supplier: fa.supplier_name || fa.supplier || fa.challan_supplier || 'N/A',
        broker: fa.broker_name || fa.broker || 'DIRECT',
        vehicleNo: fa.lorry_number || fa.vehicle_no || 'N/A',
        bales,
        weightMt: Number(wtMt.toFixed(3)),
        weightQtl: Number((wtMt * 10).toFixed(2)),
        amount: Number(fa.challan_value || fa.value || 0),
        status: 'Pending Quality Lab Test',
        pendingAction: 'Complete Mill Quality Inspection Entry',
        rawRecord: fa
      };
    });

    // 3. Pipeline: Mill Inspection -> Payment (Pending Payment)
    const paymentMrSet = new Set(monthPayments.map(p => normalizePoRef(p.mr_no || p.arrival_no || p.final_arrival_no)).filter(Boolean));
    const paymentPoSet = new Set(monthPayments.map(p => normalizePoRef(p.po_no)).filter(Boolean));
    const pendingPaymentList: PendingStageRecord[] = completedInspections.filter(r => {
      const hasMrPay = r.cleanMrNo && paymentMrSet.has(r.cleanMrNo);
      const hasPoPay = r.cleanPoNo && paymentPoSet.has(r.cleanPoNo);
      return !hasMrPay && !hasPoPay;
    }).map((r, idx) => {
      return {
        id: r.id || `pending-paym-${mIdx}-${idx}-${r.mrNo}`,
        stage: 'INSP_TO_PAYM',
        stageLabel: 'Mill Inspection ➔ Payment',
        stageCode: 'INSP ➔ Paym',
        poNo: r.poNo || 'N/A',
        cleanPoNo: r.cleanPoNo,
        mrNo: r.mrNo,
        arrivalNo: r.mrNo,
        date: r.date,
        supplier: r.supplier || 'N/A',
        broker: r.broker || 'DIRECT',
        vehicleNo: r.vehicleNo || 'N/A',
        bales: getRecordBales(r.rawRecord),
        weightMt: Number(r.weightMt.toFixed(3)),
        weightQtl: Number(r.weightQtl.toFixed(2)),
        amount: Number(r.rawRecord?.payable_amt || r.rawRecord?.total_amount || 0),
        status: 'Pending Payment Voucher',
        pendingAction: 'Process On/Ac or Final Payment Voucher',
        rawRecord: r.rawRecord
      };
    });

    // 4. Pipeline: Payment -> Settlement (Pending Settlement)
    const settlementMrSet = new Set(monthSettlements.map(s => normalizePoRef(s.mr_no || s.arrival_no || s.final_arrival_no)).filter(Boolean));
    const settlementPoSet = new Set(monthSettlements.map(s => normalizePoRef(s.po_no)).filter(Boolean));
    const pendingSettlementList: PendingStageRecord[] = completedInspections.filter(r => {
      const hasMrSett = r.cleanMrNo && settlementMrSet.has(r.cleanMrNo);
      const hasPoSett = r.cleanPoNo && settlementPoSet.has(r.cleanPoNo);
      return !hasMrSett && !hasPoSett;
    }).map((r, idx) => {
      return {
        id: r.id || `pending-sett-${mIdx}-${idx}-${r.mrNo}`,
        stage: 'PAYM_TO_SETT',
        stageLabel: 'Payment ➔ Settlement',
        stageCode: 'Paym ➔ Sett',
        poNo: r.poNo || 'N/A',
        cleanPoNo: r.cleanPoNo,
        mrNo: r.mrNo,
        arrivalNo: r.mrNo,
        date: r.date,
        supplier: r.supplier || 'N/A',
        broker: r.broker || 'DIRECT',
        vehicleNo: r.vehicleNo || 'N/A',
        bales: getRecordBales(r.rawRecord),
        weightMt: Number(r.weightMt.toFixed(3)),
        weightQtl: Number(r.weightQtl.toFixed(2)),
        amount: Number(r.rawRecord?.payable_amt || r.rawRecord?.settlement_amount || 0),
        status: 'Pending Final MR Settlement',
        pendingAction: 'Complete Valuation & Final M.R. Settlement',
        rawRecord: r.rawRecord
      };
    });

    const pendingFmrPoCount = new Set(pendingFmrList.map(r => r.cleanPoNo).filter(Boolean)).size;
    const pendingInspectionPoCount = new Set(pendingInspectionList.map(r => r.cleanPoNo).filter(Boolean)).size;
    const pendingPaymentPoCount = new Set(pendingPaymentList.map(r => r.cleanPoNo).filter(Boolean)).size;
    const pendingSettlementPoCount = new Set(pendingSettlementList.map(r => r.cleanPoNo).filter(Boolean)).size;
    const allPendingPipelineList = [
      ...pendingFmrList,
      ...pendingInspectionList,
      ...pendingPaymentList,
      ...pendingSettlementList
    ];
    const totalPendingPoCount = new Set(allPendingPipelineList.map(r => r.cleanPoNo).filter(Boolean)).size;

    return {
      monthIndex: mIdx,
      monthName: MONTH_NAMES[mIdx] || `Month ${mIdx + 1}`,
      year: activeYear,
      totalInspections: temporaryArrivalsCount,
      totalWeightMt: Number(totWt.toFixed(2)),
      temporaryArrivalsCount,
      temporaryArrivalsBales,
      temporaryArrivalsWeightMt: Number(temporaryArrivalsWeightMt.toFixed(2)),
      finalArrivalsCount,
      finalArrivalsBales,
      finalArrivalsWeightMt: Number(finalArrivalsWeightMt.toFixed(2)),
      pendingFmrCount,
      inspectionCount,
      pendingInspectionCount,
      materialInspectionCount: matCount,
      millInspectionCount: millCount,
      paymentCount: monthPayments.length,
      paymentPaidAmount: Number(paymentPaidAmount.toFixed(2)),
      paymentPayableAmount: Number(paymentPayableAmount.toFixed(2)),
      settlementCount: monthSettlements.length,
      settlementAmount: Number(settlementAmount.toFixed(2)),
      pendingFmrList,
      pendingInspectionList,
      pendingPaymentList,
      pendingSettlementList,
      allPendingPipelineList,
      pendingFmrPoCount,
      pendingInspectionPoCount,
      pendingPaymentPoCount,
      pendingSettlementPoCount,
      totalPendingPoCount,
      avgMoisture,
      avgClaimMoisture,
      avgDust,
      avgClaimDust,
      avgGradeDown,
      avgClaimGradeDown,
      totalChottaHabijabiKg: Number(totChottaHbKg.toFixed(1)),
      totalChottaHabijabiClaim: Number(totChottaHbClaim.toFixed(2)),
      premiumLotsCount: premLots,
      premiumTotalSum: Number(premSum.toFixed(2)),
      avgPremiumRate: premLots > 0 
        ? (premRateTotal > 0 ? Number((premRateTotal / premLots).toFixed(2)) : (totWt > 0 ? Number((premSum / (totWt * 10)).toFixed(2)) : 0)) 
        : 0,
      totalClaimAmount: Number(totClaim.toFixed(2)),
      lotsWithMoistureClaim: moistClaimLots,
      lotsWithQualityClaim: qualClaimLots,
      inspections: list,
      payments: monthPayments,
      settlements: monthSettlements,
      temporaryArrivals: monthArrivals,
      finalArrivals: monthFinalArrivals
    };
  }).filter((m): m is MonthInspectionSummary => m !== null);

  const inspectedRecords = yearInspections.filter(r => r.status !== 'Pending' && r.rawRecord?.is_inspected);
  let totalInspectedWeightMt = 0;
  let totalMoistSum = 0;
  let totalClaimMoistSum = 0;
  let totalDustSum = 0;
  let totalClaimDustSum = 0;
  let totalGradeDownSum = 0;
  let totalClaimGradeDownSum = 0;
  let totalChottaHabijabiKg = 0;
  let totalClaimAmount = 0;

  const qualitySourceAll = inspectedRecords;

  // Direct aggregation of MRs with Premium for activeYear from Payment Section and Inspections
  const yearPremiumMrMap = new Map<string, { rate: number; amount: number; qtl: number }>();

  // 1. All Payment Section MRs with Premium for activeYear
  paymentMrPremiumMap.forEach(p => {
    if (p.year === activeYear && (p.amount > 0 || p.rate > 0)) {
      yearPremiumMrMap.set(p.cleanMr, {
        rate: p.rate,
        amount: p.amount,
        qtl: p.weightQtl
      });
    }
  });

  qualitySourceAll.forEach(r => {
    totalInspectedWeightMt += r.weightMt;
    totalMoistSum += r.actualMoisture;
    totalClaimMoistSum += r.claimMoisture;
    totalDustSum += r.actualDust;
    totalClaimDustSum += r.claimDust;
    totalGradeDownSum += r.actualGradeDown;
    totalClaimGradeDownSum += r.claimGradeDown;
    totalChottaHabijabiKg += r.totalChottaHabijabiKg;
    totalClaimAmount += r.totalClaimAmount;
  });

  const yearPrem = filterAggregatedPremiums(unifiedPremiums, activeYear, null);
  const totalPremiumLots = yearPrem.count;
  const totalPremiumSum = yearPrem.sum;
  const totalPremiumRateSum = yearPrem.mrs.reduce((acc, m) => acc + m.avgPremiumRatePerQtl, 0);
  const totalPremiumQtlSum = yearPrem.mrs.reduce((acc, m) => acc + m.totalQuantityQtl, 0);
  const avgPremiumRate = totalPremiumLots > 0 
    ? (totalPremiumQtlSum > 0 && totalPremiumSum > 0 ? Number((totalPremiumSum / totalPremiumQtlSum).toFixed(2)) : (totalPremiumRateSum > 0 ? Number((totalPremiumRateSum / totalPremiumLots).toFixed(2)) : 0)) 
    : 0;

  const yearMoistCount = qualitySourceAll.filter(r => r.actualMoisture > 0).length;
  const yearClaimMoistCount = qualitySourceAll.filter(r => r.claimMoisture > 0).length;
  const yearDustCount = qualitySourceAll.filter(r => r.actualDust > 0).length;
  const yearClaimDustCount = qualitySourceAll.filter(r => r.claimDust > 0).length;
  const yearGradeDownCount = qualitySourceAll.filter(r => r.actualGradeDown > 0).length;
  const yearClaimGradeDownCount = qualitySourceAll.filter(r => r.claimGradeDown > 0).length;

  const totalMaterialCount = qualitySourceAll.filter(r => r.rawRecord?.inspection_source === 'material' || (!r.rawRecord?.is_mill && !r.rawRecord?.mill_code && r.rawRecord?.source !== 'mill')).length;
  const totalMillCount = qualitySourceAll.filter(r => r.rawRecord?.inspection_source === 'mill' || r.rawRecord?.is_mill || Boolean(r.rawRecord?.mill_code) || r.rawRecord?.source === 'mill').length;

  const overallAvgMoisture = yearMoistCount > 0 ? Number((totalMoistSum / yearMoistCount).toFixed(1)) : 0;
  const overallAvgClaimMoisture = yearClaimMoistCount > 0 ? Number((totalClaimMoistSum / yearClaimMoistCount).toFixed(1)) : 0;
  const overallAvgDust = yearDustCount > 0 ? Number((totalDustSum / yearDustCount).toFixed(1)) : 0;
  const overallAvgClaimDust = yearClaimDustCount > 0 ? Number((totalClaimDustSum / yearClaimDustCount).toFixed(1)) : 0;
  const overallAvgGradeDown = yearGradeDownCount > 0 ? Number((totalGradeDownSum / yearGradeDownCount).toFixed(1)) : 0;
  const overallAvgClaimGradeDown = yearClaimGradeDownCount > 0 ? Number((totalClaimGradeDownSum / yearClaimGradeDownCount).toFixed(1)) : 0;

  const totalYearTemporaryArrivalsCount = yearArrivals.length > 0 ? yearArrivals.length : yearInspections.length;
  const totalYearPendingFmrCount = yearArrivals.filter(a => {
    const k = normalizePoRef(a.temporary_arrival_no || a.amad_no || a.mr_no || a.arrival_no || a.amad_id);
    return !k || !finalArrivalsSet.has(k);
  }).length;
  const totalPendingInspectionsCount = yearInspections.filter(r => r.status === 'Pending').length;

  const allYearPendingFmrList = monthInspectionSummaries.flatMap(m => m.pendingFmrList);
  const allYearPendingInspectionList = monthInspectionSummaries.flatMap(m => m.pendingInspectionList);
  const allYearPendingPaymentList = monthInspectionSummaries.flatMap(m => m.pendingPaymentList);
  const allYearPendingSettlementList = monthInspectionSummaries.flatMap(m => m.pendingSettlementList);
  const allYearPendingPipelineList = [
    ...allYearPendingFmrList,
    ...allYearPendingInspectionList,
    ...allYearPendingPaymentList,
    ...allYearPendingSettlementList
  ];

  const yearPendingFmrPoCount = new Set(allYearPendingFmrList.map(r => r.cleanPoNo).filter(Boolean)).size;
  const yearPendingInspectionPoCount = new Set(allYearPendingInspectionList.map(r => r.cleanPoNo).filter(Boolean)).size;
  const yearPendingPaymentPoCount = new Set(allYearPendingPaymentList.map(r => r.cleanPoNo).filter(Boolean)).size;
  const yearPendingSettlementPoCount = new Set(allYearPendingSettlementList.map(r => r.cleanPoNo).filter(Boolean)).size;
  const yearTotalPendingPoCount = new Set(allYearPendingPipelineList.map(r => r.cleanPoNo).filter(Boolean)).size;

  return {
    monthInspectionSummaries,
    allInspections: yearInspections,
    totalInspectionsCount: totalYearTemporaryArrivalsCount,
    totalInspectedWeightMt: yearTotalArrivalsWeightMt > 0 ? Number(yearTotalArrivalsWeightMt.toFixed(2)) : Number(totalInspectedWeightMt.toFixed(2)),
    totalYearTemporaryArrivalsCount,
    totalYearBales: yearTotalArrivalsBales,
    totalYearArrivalWeightMt: Number(yearTotalArrivalsWeightMt.toFixed(2)),
    totalYearFinalArrivalsCount: yearTotalFinalArrivalsCount,
    totalYearFinalArrivalsBales: yearTotalFinalBales,
    totalYearFinalArrivalsWeightMt: Number(yearTotalFinalWeightMt.toFixed(2)),
    totalYearPendingFmrCount,
    totalYearInspectionsCount: inspectedRecords.length > 0 ? inspectedRecords.length : totalMaterialCount + totalMillCount,
    totalMaterialInspectionsCount: totalMaterialCount,
    totalMillInspectionsCount: totalMillCount,
    totalPendingInspectionsCount,
    totalYearPaymentsCount: totalYearPayments,
    totalYearPaidAmount,
    totalYearSettlementsCount: totalYearSettlements,
    totalYearSettledAmount,
    allYearPendingFmrList,
    allYearPendingInspectionList,
    allYearPendingPaymentList,
    allYearPendingSettlementList,
    allYearPendingPipelineList,
    yearPendingFmrPoCount,
    yearPendingInspectionPoCount,
    yearPendingPaymentPoCount,
    yearPendingSettlementPoCount,
    yearTotalPendingPoCount,
    overallAvgMoisture,
    overallAvgClaimMoisture,
    overallAvgDust,
    overallAvgClaimDust,
    overallAvgGradeDown,
    overallAvgClaimGradeDown,
    totalChottaHabijabiKg: Number(totalChottaHabijabiKg.toFixed(1)),
    totalPremiumLots,
    totalPremiumSum: Number(totalPremiumSum.toFixed(2)),
    avgPremiumRate,
    totalClaimAmount: Number(totalClaimAmount.toFixed(2)),
    availableYears,
    selectedYear: activeYear
  };
}
