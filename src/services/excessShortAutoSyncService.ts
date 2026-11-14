import { supabase } from '../lib/supabase';
import { invalidateTableCache } from './dbModule';
import { normalizeToYMD, formatDisplayDate } from '../components/excess-short/excessShortUtils';

export interface NormalizedBaseRate {
  ymd: string;
  rate: number;
}

export interface ExcessShortComputeParams {
  po: any;
  inspections: any[];
  inspectionDetails?: any[];
  normalizedBaseRates: NormalizedBaseRate[];
  existingDed?: any | null;
  contractMtOverride?: number | null;
  selectedRateMode?: 'rate_difference' | 'last_mr_satta' | 'sauda_satta' | 'custom';
  customRateInput?: number;
  remarks?: string;
  approvalLevel?: string;
  settledBy?: string | null;
  isLocked?: boolean;
}

export interface ExcessShortComputedResult {
  payload: Record<string, any>;
  gradeWiseInspectionRows: any[];
  contractMt: number;
  totalFinalReceiptClaimMt: number;
  totalCalculatedAmount: number;
  totalFinalPayable: number;
  lastMrNo: string;
  lastMrDate: string;
  linkedMrNos: string[];
  policyStatusText: string;
}

const cleanAlnumUpper = (s: any): string =>
  String(s || '')
    .trim()
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();

const extractMrSeq = (mrStr: string): number => {
  const matches = String(mrStr || '').match(/\d+/g);
  if (!matches || matches.length === 0) return 0;
  return parseInt(matches[matches.length - 1], 10) || 0;
};

const canonicalMrKey = (mrStr: string): string => {
  const seq = extractMrSeq(mrStr);
  if (seq > 0) return `MR_${seq}`;
  return String(mrStr || '').trim().toUpperCase();
};

const toMtFromRawWt = (val: any): number => {
  const n = Number(val || 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n >= 500) return n / 1000;
  if (n > 50 && n < 500) return n / 10;
  return n;
};

export const normalizeSattaBaseRates = (baseList: any[]): NormalizedBaseRate[] => {
  if (!Array.isArray(baseList) || baseList.length === 0) return [];
  return baseList
    .map((b: any) => ({
      ymd: normalizeToYMD(
        b.start_date || b.effective_date || b.satta_date || b.date || b.base_date || b.start || ''
      ),
      rate: Number(b.base_rate || b.rate || b.b_rate || b.baseRate || 0),
    }))
    .filter((item) => item.rate > 0)
    .sort((a, b) => b.ymd.localeCompare(a.ymd));
};

export const getSattaBaseRateOnDateFromList = (
  normalizedBaseRates: NormalizedBaseRate[],
  dateStr: string,
  fallbackRate = 0
): number => {
  if (!normalizedBaseRates || normalizedBaseRates.length === 0) return fallbackRate;
  const targetYmd = normalizeToYMD(dateStr);
  if (targetYmd) {
    const exact = normalizedBaseRates.find((b) => b.ymd === targetYmd);
    if (exact) return exact.rate;
    const onOrBefore = normalizedBaseRates.find((b) => b.ymd && b.ymd <= targetYmd);
    if (onOrBefore) return onOrBefore.rate;
  }
  return normalizedBaseRates[0].rate || fallbackRate;
};

export function computeExcessShortPayload(
  params: ExcessShortComputeParams
): ExcessShortComputedResult | null {
  const {
    po,
    inspections,
    inspectionDetails = [],
    normalizedBaseRates,
    existingDed = null,
    contractMtOverride = null,
    selectedRateMode: selectedRateModeParam,
    customRateInput: customRateInputParam,
    remarks: remarksParam,
    approvalLevel = 'ADMIN',
    settledBy,
    isLocked = false,
  } = params;

  if (!po) return null;

  const poNo = String(po.po_no || po.contract_po_no || existingDed?.po_no || '').trim();
  if (!poNo) return null;

  const saudaNo = String(po.sauda_no || po.sauda_ref || existingDed?.sauda_no || poNo).trim();
  const targetPo = cleanAlnumUpper(poNo);
  const targetSauda = cleanAlnumUpper(saudaNo);

  const basePoContractMt = Math.max(
    0,
    parseFloat(
      po.total_contract_mt ||
        po.total_wt_in_ton ||
        po.contract_weight_mt ||
        po.weight_mt ||
        po.contract_mt ||
        (po.weight_qtl ? po.weight_qtl / 10 : 0) ||
        0
    ) || 0
  );

  const contractMt =
    contractMtOverride !== null && contractMtOverride !== undefined
      ? Math.max(0, Number(contractMtOverride) || 0)
      : basePoContractMt;

  if (contractMt <= 0) return null;

  // Match all real inspection records belonging to this PO / Sauda
  const matchingInsps = (inspections || []).filter((insp: any) => {
    const iPo = cleanAlnumUpper(insp.po_no);
    const iSauda = cleanAlnumUpper(insp.sauda_no || insp.contract_po_no || insp.po_contract);
    if (iPo && (iPo === targetPo || (targetSauda && iPo === targetSauda))) return true;
    if (iSauda && (iSauda === targetPo || (targetSauda && iSauda === targetSauda))) return true;
    return false;
  });

  const uniqueMrMap = new Map<string, { mrNo: string; date: string; rawDate: string; source: any }>();
  matchingInsps.forEach((insp: any) => {
    const num = String(insp.mr_no || insp.arrival_no || '').trim();
    if (num && num.toUpperCase() !== 'NO' && num.toUpperCase() !== 'N/A' && num !== '-') {
      const rawD = normalizeToYMD(
        insp.arrival_date || insp.mr_date || insp.inspection_date || insp.date || insp.created_at || ''
      );
      const key = canonicalMrKey(num);
      const existing = uniqueMrMap.get(key);
      const hasGrid = Boolean(insp.grid_details || insp.details);
      const existingHasGrid = Boolean(existing?.source?.grid_details || existing?.source?.details);
      const preferNew =
        !existing ||
        (!existingHasGrid && hasGrid) ||
        (!existing.rawDate && Boolean(rawD)) ||
        (num.length > existing.mrNo.length && hasGrid === existingHasGrid);
      if (preferNew) {
        uniqueMrMap.set(key, { mrNo: num, date: formatDisplayDate(rawD), rawDate: rawD, source: insp });
      }
    }
  });

  const mrEntries = Array.from(uniqueMrMap.values());
  if (mrEntries.length === 0) return null;

  mrEntries.sort((a, b) => {
    const seqA = extractMrSeq(a.mrNo);
    const seqB = extractMrSeq(b.mrNo);
    if (seqA > 0 && seqB > 0 && seqA !== seqB) return seqA - seqB;
    if (a.rawDate !== b.rawDate) return a.rawDate.localeCompare(b.rawDate);
    return a.mrNo.localeCompare(b.mrNo, undefined, { numeric: true });
  });

  const saudaDate = normalizeToYMD(
    po.sauda_date || po.s_date || po.po_date || po.contract_date || po.voucher_date || po.date || ''
  );

  const directContractRate = Math.max(
    0,
    parseFloat(po.rate || po.purchase_rate || po.rate_per_qtl || po.sauda_rate || po.contract_rate || 0) || 0
  );
  const fromBrate = Math.max(
    0,
    parseFloat(po.b_rate || po.base_rate || po.b_rate_qtl || po.s_b_rate || po.sauda_b_rate || 0) || 0
  );
  const saudaDateSattaRate =
    fromBrate > 0
      ? fromBrate
      : getSattaBaseRateOnDateFromList(normalizedBaseRates, saudaDate, directContractRate);

  const latestMr = mrEntries[mrEntries.length - 1];
  const lastMrNo = latestMr.mrNo;
  const lastMrDate = latestMr.rawDate || saudaDate;
  const lastMrDateSattaRate = getSattaBaseRateOnDateFromList(
    normalizedBaseRates,
    lastMrDate,
    saudaDateSattaRate
  );

  const isMultipleLorry = mrEntries.length > 1;
  const rows: any[] = [];
  let sumShortClaimMt = 0;
  let sumExcessClaimMt = 0;

  mrEntries.forEach((mrEntry, mrIdx) => {
    const mrKey = canonicalMrKey(mrEntry.mrNo);
    const isLastLorry = mrIdx === mrEntries.length - 1;
    const isFirstLorry = mrIdx === 0;
    const src = mrEntry.source;

    let embeddedGrid: any[] = [];
    if (src?.grid_details) {
      if (Array.isArray(src.grid_details)) embeddedGrid = src.grid_details;
      else if (typeof src.grid_details === 'string') {
        try {
          const parsed = JSON.parse(src.grid_details);
          if (Array.isArray(parsed)) embeddedGrid = parsed;
        } catch (_e) {}
      }
    }
    if (embeddedGrid.length === 0 && src?.details) {
      if (Array.isArray(src.details)) embeddedGrid = src.details;
      else if (typeof src.details === 'string') {
        try {
          const parsed = JSON.parse(src.details);
          if (Array.isArray(parsed)) embeddedGrid = parsed;
        } catch (_e) {}
      }
    }

    const matchingDetails = (inspectionDetails || []).filter((d: any) => {
      const dMr = String(d.mr_no || '').trim();
      return dMr && canonicalMrKey(dMr) === mrKey;
    });

    const rawDetailItems = embeddedGrid.length > 0 ? embeddedGrid : matchingDetails;
    const seenDetailKeys = new Set<string>();
    const detailItems: any[] = [];

    rawDetailItems.forEach((d: any, idx: number) => {
      if (!d || typeof d !== 'object') return;
      const itemMr = String(d.mr_no || '').trim();
      if (itemMr && canonicalMrKey(itemMr) !== mrKey) return;
      const gRaw = Number(d.challan_gross_wt ?? d.receipt_gross_wt ?? d.gross_weight_batch ?? d.gross_weight ?? 0);
      const nRaw = Number(d.final_receipt_wt ?? d.reduced_weight ?? d.netto_pnto ?? 0);
      if (gRaw <= 0 && nRaw <= 0) return;
      const srl =
        d.srl_no !== undefined && d.srl_no !== null && String(d.srl_no).trim() !== ''
          ? `SRL_${String(d.srl_no).trim()}`
          : `ROW_${String(d.arrival_grade || d.receipt_grade_name || d.challan_grade_name || idx).trim()}_${gRaw}_${nRaw}`;
      if (!seenDetailKeys.has(srl)) {
        seenDetailKeys.add(srl);
        detailItems.push(d);
      }
    });

    let mrGrossMt = 0;
    let mrNetMt = 0;
    let mrBags = 0;
    let mrGrade = String(po.selected_grade || po.grade || 'TD6');
    let mrMarka = String(po.marka || 'NO MARK');
    let mrCrop = String(po.crop_year || '2026-27');

    if (src) {
      const topGross = toMtFromRawWt(src.challan_gross_wt ?? src.receipt_gross_wt ?? src.gross_weight);
      const topNet = toMtFromRawWt(
        src.final_receipt_wt ?? src.total_final_receipt_wt ?? src.reduced_weight ?? src.weight_reduced
      );
      if (topGross > 0) mrGrossMt = topGross;
      if (topNet > 0) mrNetMt = topNet;
      mrBags = Number(src.total_packets || src.quantity || src.total_quantity || src.packets || src.bags || 0);
      mrGrade =
        src.receipt_grade_name || src.challan_grade_name || src.grading || src.grade || src.item_grade || mrGrade;
      mrMarka = src.challan_marka_name || src.marka || mrMarka;
      mrCrop = src.crop_year || src.financial_year || mrCrop;
    }

    if (detailItems.length > 0) {
      let sumDetailGrossMt = 0;
      let sumDetailNetMt = 0;
      let sumDetailBags = 0;
      const gradesSet: string[] = [];
      const markasSet: string[] = [];

      detailItems.forEach((d: any) => {
        const gWt = toMtFromRawWt(d.challan_gross_wt ?? d.receipt_gross_wt ?? d.gross_weight_batch ?? d.gross_weight ?? 0);
        let nWt = toMtFromRawWt(d.final_receipt_wt ?? d.reduced_weight ?? d.netto_pnto ?? 0);
        if (nWt <= 0 && d.quantity_rcpt) nWt = toMtFromRawWt(d.quantity_rcpt);
        if (nWt <= 0 && gWt > 0) nWt = gWt;
        const bCount = Number(d.quantity || d.packets || d.bales || d.bags || 0);

        sumDetailGrossMt += gWt;
        sumDetailNetMt += nWt;
        sumDetailBags += bCount;

        const gName = String(
          d.arrival_grade || d.receipt_grade_name || d.challan_grade_name || d.stock_grade_name || d.grade || ''
        ).trim();
        if (gName && !gradesSet.includes(gName)) gradesSet.push(gName);
        const mName = String(d.marka || d.marks || '').trim();
        if (mName && !markasSet.includes(mName)) markasSet.push(mName);
        if (d.crop_year) mrCrop = String(d.crop_year);
      });

      const roundedDetailGross = Math.round(sumDetailGrossMt * 1000) / 1000;
      const roundedDetailNet = Math.round(sumDetailNetMt * 1000) / 1000;

      if (roundedDetailGross > 0 && (mrGrossMt <= 0 || Math.abs(mrGrossMt - roundedDetailGross) > 0.05)) {
        mrGrossMt = roundedDetailGross;
      }
      if (
        roundedDetailNet > 0 &&
        (mrNetMt <= 0 ||
          (mrGrossMt > 0 && mrNetMt > mrGrossMt + 0.001) ||
          Math.abs(mrNetMt - roundedDetailNet) > 0.05)
      ) {
        mrNetMt = roundedDetailNet;
      }
      if (mrBags <= 0 && sumDetailBags > 0) mrBags = sumDetailBags;
      if (gradesSet.length > 0) mrGrade = gradesSet[0];
      if (markasSet.length > 0) mrMarka = markasSet[0];
    }

    if (mrGrossMt > 0 && mrNetMt > mrGrossMt + 0.001) mrNetMt = mrGrossMt;
    if (mrNetMt <= 0 && src) {
      if (src.weight_qtl) mrNetMt = Number(src.weight_qtl) / 10;
      else if (src.weight) mrNetMt = toMtFromRawWt(src.weight);
    }
    if (mrGrossMt <= 0) mrGrossMt = mrNetMt;
    if (mrNetMt <= 0) mrNetMt = mrGrossMt;

    mrGrossMt = Math.round(mrGrossMt * 1000) / 1000;
    mrNetMt = Math.round(mrNetMt * 1000) / 1000;

    const shortClaimMt = isMultipleLorry && isLastLorry ? mrGrossMt : mrNetMt;
    const lorryCount = mrEntries.length;
    const excessUsesGross = lorryCount === 2 ? isFirstLorry : lorryCount >= 3 ? isLastLorry : false;
    const excessClaimMt = excessUsesGross ? mrGrossMt : mrNetMt;

    sumShortClaimMt += shortClaimMt;
    sumExcessClaimMt += excessClaimMt;

    const mrSattaRate = getSattaBaseRateOnDateFromList(normalizedBaseRates, mrEntry.rawDate, saudaDateSattaRate);

    rows.push({
      mrNo: mrEntry.mrNo,
      mrDate: mrEntry.date,
      rawDate: mrEntry.rawDate,
      grade: mrGrade,
      marka: mrMarka,
      cropYear: mrCrop,
      totalBags: mrBags,
      grossWtMt: mrGrossMt,
      grossWtKg: Math.round(mrGrossMt * 1000),
      netWtMt: mrNetMt,
      netWtKg: Math.round(mrNetMt * 1000),
      finalReceiptWtMt: shortClaimMt,
      finalReceiptWtKg: Math.round(shortClaimMt * 1000),
      finalReceiptWtQtl: Math.round(shortClaimMt * 10 * 100) / 100,
      weightBasis: isMultipleLorry && isLastLorry ? 'Gross (Last Lorry)' : isMultipleLorry ? 'Net' : 'Net (Single)',
      isFirstLorry,
      isLastLorry,
      saudaRateQtl: saudaDateSattaRate,
      mrSattaRateQtl: mrSattaRate,
      rateDiffQtl: 0,
      sourceType: 'Mill Inspection',
    });
  });

  const roundedShortClaimMt = Math.round(sumShortClaimMt * 1000) / 1000;
  const roundedExcessClaimMt = Math.round(sumExcessClaimMt * 1000) / 1000;
  const isClaimExcess =
    contractMt - roundedExcessClaimMt < -0.0001 &&
    (roundedShortClaimMt >= contractMt - 0.0001 ||
      roundedExcessClaimMt - contractMt >= contractMt - roundedShortClaimMt);

  const totalFinalReceiptClaimMt = isClaimExcess ? roundedExcessClaimMt : roundedShortClaimMt;
  if (totalFinalReceiptClaimMt <= 0) return null;

  const rowCount = rows.length;
  const adjustedRows = rows.map((r, rIdx) => {
    const excessUsesGross = rowCount === 2 ? rIdx === 0 : rowCount >= 3 ? r.isLastLorry : false;
    const rowClaimMt = isClaimExcess
      ? excessUsesGross
        ? r.grossWtMt
        : r.netWtMt
      : isMultipleLorry
      ? r.isLastLorry
        ? r.grossWtMt
        : r.netWtMt
      : r.netWtMt;
    const rowWeightBasis = isClaimExcess
      ? rowCount === 2
        ? rIdx === 0
          ? 'Gross (First Lorry)'
          : 'Net (Last Lorry)'
        : rowCount >= 3
        ? r.isLastLorry
          ? 'Gross (Last Lorry)'
          : 'Net'
        : 'Net (Single)'
      : isMultipleLorry
      ? r.isLastLorry
        ? 'Gross (Last Lorry)'
        : 'Net'
      : 'Net (Single)';

    return {
      ...r,
      finalReceiptWtMt: rowClaimMt,
      finalReceiptWtKg: Math.round(rowClaimMt * 1000),
      finalReceiptWtQtl: Math.round(rowClaimMt * 10 * 100) / 100,
      weightBasis: rowWeightBasis,
      rateDiffQtl: isClaimExcess
        ? Math.max(0, Number(r.saudaRateQtl || 0) - Number(r.mrSattaRateQtl || 0))
        : Number(r.mrSattaRateQtl || 0) > Number(r.saudaRateQtl || 0)
        ? Number(r.mrSattaRateQtl || 0) - Number(r.saudaRateQtl || 0)
        : 0,
    };
  });

  const grossVarianceMt = Math.round((contractMt - totalFinalReceiptClaimMt) * 1000) / 1000;
  const isGrossShort = grossVarianceMt > 0.0001;
  const isGrossExcess = grossVarianceMt < -0.0001;
  const shortageMt = isGrossShort ? grossVarianceMt : 0;
  const excessMt = isGrossExcess ? Math.abs(grossVarianceMt) : 0;

  const tolerance3PctMt = Math.round(contractMt * 0.03 * 1000) / 1000;
  const exemptionPct = isGrossExcess ? 0 : 3;
  const exemptionMt = isGrossExcess ? 0 : tolerance3PctMt;

  let finalDeductibleShortMt = 0;
  let isWithin3PctExemption = false;

  if (isGrossShort) {
    if (shortageMt >= 1.5) {
      finalDeductibleShortMt = shortageMt;
      isWithin3PctExemption = false;
    } else if (shortageMt <= tolerance3PctMt) {
      finalDeductibleShortMt = 0;
      isWithin3PctExemption = true;
    } else {
      finalDeductibleShortMt = Math.round((shortageMt - tolerance3PctMt) * 1000) / 1000;
      isWithin3PctExemption = false;
    }
  } else if (isGrossExcess) {
    isWithin3PctExemption = false;
  } else {
    isWithin3PctExemption = true;
  }

  const finalDeductibleQtyMt = isGrossExcess ? Math.max(0, Math.round(excessMt * 1000) / 1000) : finalDeductibleShortMt;
  const finalDeductibleQtyQtl = Math.round(finalDeductibleQtyMt * 10 * 100) / 100;

  const isShortRateLowerOrEqual = isGrossShort && lastMrDateSattaRate <= saudaDateSattaRate;
  const isExcessApplicableForSauda = isGrossExcess && lastMrDateSattaRate >= saudaDateSattaRate;

  const rateDifference = isGrossShort
    ? lastMrDateSattaRate > saudaDateSattaRate
      ? lastMrDateSattaRate - saudaDateSattaRate
      : 0
    : Math.max(0, saudaDateSattaRate - lastMrDateSattaRate);

  const selectedRateMode =
    selectedRateModeParam ||
    ((existingDed?.rate_basis as 'rate_difference' | 'last_mr_satta' | 'sauda_satta' | 'custom') || 'rate_difference');
  const customRateInput =
    customRateInputParam !== undefined
      ? customRateInputParam
      : existingDed?.rate_basis === 'custom'
      ? Number(existingDed?.applicable_rate || 0)
      : 0;

  let policyStatusText: string;
  if (isWithin3PctExemption) {
    policyStatusText = 'Within 3% Exemption – No Deduction';
  } else if (isGrossExcess) {
    policyStatusText = isExcessApplicableForSauda ? 'Applicable for Sauda – No Deduction' : 'Excess Weight Deduction';
  } else if (isGrossShort) {
    if (selectedRateMode === 'rate_difference' && isShortRateLowerOrEqual) {
      policyStatusText = 'Final MR Rate ≤ Sauda Rate – No Deduction';
    } else if (shortageMt >= 1.5) {
      policyStatusText = 'Short Weight Deduction (Full Shortage ≥ 1.5 MT Chargeable)';
    } else {
      policyStatusText = 'Short Weight Deduction (Exceeding 3% Tolerance)';
    }
  } else {
    policyStatusText = 'Exact Weight – No Deduction';
  }

  let applicableRate = rateDifference;
  if (selectedRateMode === 'last_mr_satta') applicableRate = lastMrDateSattaRate;
  else if (selectedRateMode === 'sauda_satta') applicableRate = saudaDateSattaRate;
  else if (selectedRateMode === 'custom') applicableRate = customRateInput;
  applicableRate = !Number.isFinite(applicableRate) || applicableRate < 0 ? 0 : Math.round(applicableRate * 100) / 100;

  let totalCalculatedAmount = 0;
  if (!isWithin3PctExemption && finalDeductibleQtyQtl > 0) {
    if (isGrossShort && selectedRateMode === 'rate_difference' && isShortRateLowerOrEqual) {
      totalCalculatedAmount = 0;
    } else if (isGrossExcess && selectedRateMode === 'rate_difference' && isExcessApplicableForSauda) {
      totalCalculatedAmount = 0;
    } else {
      const calc = Math.round(finalDeductibleQtyQtl * applicableRate * 100) / 100;
      totalCalculatedAmount = !Number.isFinite(calc) || calc < 0 ? 0 : calc;
    }
  }

  const existingSaudaAmount =
    parseFloat(po.total_amount || po.contract_amount || po.sauda_amount || 0) ||
    Math.round(contractMt * 10 * (directContractRate > 0 ? directContractRate : saudaDateSattaRate) * 100) / 100;

  const totalFinalPayable =
    totalCalculatedAmount === 0
      ? existingSaudaAmount
      : Math.max(0, Math.round((existingSaudaAmount - totalCalculatedAmount) * 100) / 100);

  const linkedMrNos = mrEntries.map((e) => e.mrNo);
  const arrivalNumbersString = linkedMrNos.join(', ');
  const nowIso = new Date().toISOString();

  const defaultRemark = isExcessApplicableForSauda && selectedRateMode === 'rate_difference'
    ? `Applicable for Sauda – No Deduction: Last MR Rate (₹${lastMrDateSattaRate}) >= Sauda Rate (₹${saudaDateSattaRate})`
    : isWithin3PctExemption
    ? `${policyStatusText} (Deductible: 0.00 Qtl)`
    : `${policyStatusText}: Deductible ${finalDeductibleQtyQtl.toFixed(2)} Qtl at ₹${applicableRate}/Qtl = ₹${totalCalculatedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}.`;

  const resolvedSupplier = String(po.supplier || po.supplier_name || po.supp_name || existingDed?.supplier || '').trim();
  const resolvedBroker = String(po.broker || po.broker_name || existingDed?.broker || '').trim();
  const actorName = settledBy || (isLocked ? 'Operator' : 'System Auto-Sync');

  const payload: Record<string, any> = {
    po_no: poNo,
    sauda_no: saudaNo || poNo,
    supplier: resolvedSupplier,
    broker: resolvedBroker,
    contract_weight_mt: Number(contractMt.toFixed(3)),
    tolerance_pct: exemptionPct,
    tolerance_mt: Number(exemptionMt.toFixed(3)),
    tolerance_type: isGrossExcess
      ? 'No Tolerance on Excess Weight'
      : '3% Sauda Total Contract Execution Exemption',
    min_acceptable_mt: Number(Math.max(0, contractMt - tolerance3PctMt).toFixed(3)),
    max_acceptable_mt: Number(contractMt.toFixed(3)),
    total_received_mt: Number(totalFinalReceiptClaimMt.toFixed(3)),
    variation_type: isWithin3PctExemption ? 'within_tolerance' : isGrossExcess ? 'excess' : 'short',
    variation_mt: Number(grossVarianceMt.toFixed(3)),
    selected_grade: po.selected_grade || po.grade || adjustedRows[0]?.grade || 'TD6',
    sauda_rate: Number(saudaDateSattaRate),
    satta_rate: Number(lastMrDateSattaRate),
    last_arrival_date: normalizeToYMD(lastMrDate) || null,
    last_mr_no: lastMrNo,
    applicable_rate: Number(applicableRate),
    rate_basis: selectedRateMode,
    rate_difference: Number(rateDifference),
    deduction_qty_mt: Number(finalDeductibleQtyMt.toFixed(3)),
    deduction_qty_qtl: Number(finalDeductibleQtyQtl.toFixed(2)),
    deduction_amount: Number(totalCalculatedAmount),
    status: isLocked ? 'approved' : 'auto_saved',
    is_locked: Boolean(isLocked),
    is_final: Boolean(isLocked),
    settled_at: existingDed?.settled_at || nowIso,
    settled_by: existingDed?.is_locked ? (existingDed?.settled_by || actorName) : actorName,
    remarks: remarksParam && remarksParam.trim() ? remarksParam.trim() : defaultRemark,
    arrival_numbers: arrivalNumbersString,
    grade_breakdown: JSON.stringify(adjustedRows),
    approved_by: actorName,
    approval_level: approvalLevel || existingDed?.approval_level || 'ADMIN',
    updated_at: nowIso,
  };

  if (!existingDed?.id) {
    payload.created_at = nowIso;
  }

  return {
    payload,
    gradeWiseInspectionRows: adjustedRows,
    contractMt,
    totalFinalReceiptClaimMt,
    totalCalculatedAmount,
    totalFinalPayable,
    lastMrNo,
    lastMrDate,
    linkedMrNos,
    policyStatusText,
  };
}

export function isManualLockedDeduction(ded: any): boolean {
  if (!ded) return false;
  if (ded.is_locked === true) return true;
  if (ded.is_locked === false) return false;
  const st = String(ded.status || '').trim().toLowerCase();
  const by = String(ded.settled_by || ded.approved_by || '').trim().toLowerCase();
  if (st === 'auto_saved' || by === 'system auto-sync') return false;
  return st === 'approved' || st === 'locked' || st === 'settled';
}

export function isDeductionRowOutOfSync(existingDed: any, targetPayload: Record<string, any>): boolean {
  if (!existingDed) return true;
  // Never overwrite a manually locked custom rate override
  if (isManualLockedDeduction(existingDed) && String(existingDed.rate_basis || '') === 'custom') {
    return false;
  }

  const numChanged = (a: any, b: any, eps = 0.01) =>
    Math.abs((Number(a) || 0) - (Number(b) || 0)) > eps;
  const strChanged = (a: any, b: any) =>
    String(a || '').trim().toUpperCase() !== String(b || '').trim().toUpperCase();

  return (
    numChanged(existingDed.contract_weight_mt, targetPayload.contract_weight_mt, 0.001) ||
    numChanged(existingDed.total_received_mt, targetPayload.total_received_mt, 0.001) ||
    strChanged(existingDed.variation_type, targetPayload.variation_type) ||
    numChanged(existingDed.deduction_qty_mt, targetPayload.deduction_qty_mt, 0.001) ||
    numChanged(existingDed.deduction_qty_qtl, targetPayload.deduction_qty_qtl, 0.01) ||
    numChanged(existingDed.sauda_rate, targetPayload.sauda_rate, 0.01) ||
    numChanged(existingDed.satta_rate, targetPayload.satta_rate, 0.01) ||
    numChanged(existingDed.rate_difference, targetPayload.rate_difference, 0.01) ||
    numChanged(existingDed.applicable_rate, targetPayload.applicable_rate, 0.01) ||
    numChanged(existingDed.deduction_amount, targetPayload.deduction_amount, 0.01) ||
    strChanged(existingDed.arrival_numbers, targetPayload.arrival_numbers) ||
    strChanged(existingDed.last_arrival_date, targetPayload.last_arrival_date)
  );
}

const inFlightPoSyncs = new Map<string, Promise<any | null>>();
const lastSyncedFingerprintByPo = new Map<string, string>();

const buildPayloadFingerprint = (p: Record<string, any>): string =>
  JSON.stringify([
    p.po_no,
    p.contract_weight_mt,
    p.total_received_mt,
    p.variation_type,
    p.deduction_qty_mt,
    p.deduction_qty_qtl,
    p.sauda_rate,
    p.satta_rate,
    p.rate_difference,
    p.applicable_rate,
    p.deduction_amount,
    p.arrival_numbers,
    p.last_arrival_date,
    p.rate_basis,
    p.is_locked,
  ]);

export async function saveDeductionRowRealtime(
  payload: Record<string, any>,
  existingRecordId?: string | null
): Promise<any | null> {
  if (!supabase || !payload?.po_no) return null;

  const { created_at: _created, ...updateBody } = payload;

  try {
    if (existingRecordId) {
      const { data, error } = await supabase
        .from('sauda_check_point_deductions')
        .update(updateBody)
        .eq('id', existingRecordId)
        .select();

      if (!error && Array.isArray(data) && data.length > 0) {
        invalidateTableCache('sauda_check_point_deductions');
        return data[0];
      }
    }

    const { data: upsertData, error: upsertErr } = await supabase
      .from('sauda_check_point_deductions')
      .upsert(payload, { onConflict: 'po_no' })
      .select();

    if (!upsertErr && Array.isArray(upsertData) && upsertData.length > 0) {
      invalidateTableCache('sauda_check_point_deductions');
      return upsertData[0];
    }

    if (upsertErr) {
      console.warn('[excessShortAutoSync] Upsert warning:', upsertErr.message);
    }
  } catch (err) {
    console.warn('[excessShortAutoSync] Failed saving sauda_check_point_deductions:', err);
  }
  return null;
}

/**
 * Fetches authoritative PostgreSQL records for a single PO and auto-saves/updates its
 * `sauda_check_point_deductions` record in real time (zero dumped data).
 */
export async function syncExcessShortDeductionForSinglePo(poNo: string): Promise<any | null> {
  const cleanTarget = String(poNo || '').trim();
  const targetNorm = cleanAlnumUpper(cleanTarget);
  if (!supabase || !cleanTarget || !targetNorm) return null;

  if (inFlightPoSyncs.has(targetNorm)) {
    return inFlightPoSyncs.get(targetNorm)!;
  }

  const task = (async () => {
    try {
      const [scpRes, pmRes, saudaRes, matInspRes, millInspRes, sBasesRes, dedRes] = await Promise.all([
        supabase.from('sauda_check_point').select('*').ilike('po_no', `%${cleanTarget}%`).limit(10).then((r) => r.data || [], () => []),
        supabase.from('purchase_master').select('*').ilike('po_no', `%${cleanTarget}%`).limit(10).then((r) => r.data || [], () => []),
        supabase.from('sauda_master').select('*').ilike('sauda_no', `%${cleanTarget}%`).limit(5).then((r) => r.data || [], () => []),
        supabase.from('material_inspection').select('*').ilike('po_no', `%${cleanTarget}%`).then((r) => r.data || [], () => []),
        supabase.from('mill_inspection_master').select('*').ilike('po_no', `%${cleanTarget}%`).then((r) => r.data || [], () => []),
        supabase.from('satta_base_rates').select('*').order('start_date', { ascending: false }).then((r) => r.data || [], () => []),
        supabase.from('sauda_check_point_deductions').select('*').ilike('po_no', `%${cleanTarget}%`).limit(10).then((r) => r.data || [], () => []),
      ]);

      const pickExact = (rows: any[]) =>
        rows.find((r) => cleanAlnumUpper(r?.po_no || r?.contract_po_no) === targetNorm) || rows[0];

      const scpRow = pickExact(scpRes as any[]);
      const pmRow = pickExact(pmRes as any[]);
      const sRow = (saudaRes as any[])[0];

      const mergedPo = scpRow || pmRow || sRow
        ? {
            ...(sRow || {}),
            ...(pmRow || {}),
            ...(scpRow || {}),
            po_no: scpRow?.po_no || pmRow?.po_no || cleanTarget,
            total_contract_mt:
              Number(scpRow?.total_contract_mt || 0) > 0
                ? Number(scpRow.total_contract_mt)
                : Number(pmRow?.total_contract_mt || 0) > 0
                ? Number(pmRow.total_contract_mt)
                : Number(sRow?.total_wt_in_ton || 0),
          }
        : null;

      if (!mergedPo || Number(mergedPo.total_contract_mt || 0) <= 0) return null;

      const combinedInsps = [...(matInspRes as any[]), ...(millInspRes as any[])];
      if (combinedInsps.length === 0) return null;

      const mrArray = Array.from(
        new Set(
          combinedInsps
            .map((i: any) => String(i.mr_no || '').trim())
            .filter((m) => m && m.toUpperCase() !== 'NO' && m.toUpperCase() !== 'N/A' && m !== '-')
        )
      );

      let details: any[] = [];
      if (mrArray.length > 0) {
        const [matDet, millDet] = await Promise.all([
          supabase.from('material_inspection_details').select('*').in('mr_no', mrArray).then((r) => r.data || [], () => []),
          supabase.from('mill_inspection_detail').select('*').in('mr_no', mrArray).then((r) => r.data || [], () => []),
        ]);
        details = [...(matDet as any[]), ...(millDet as any[])];
      }

      const existingDed =
        (dedRes as any[]).find(
          (d) => cleanAlnumUpper(d.po_no) === targetNorm || cleanAlnumUpper(d.sauda_no) === targetNorm
        ) || null;

      const normalizedRates = normalizeSattaBaseRates(sBasesRes as any[]);
      const computed = computeExcessShortPayload({
        po: mergedPo,
        inspections: combinedInsps,
        inspectionDetails: details,
        normalizedBaseRates: normalizedRates,
        existingDed,
        isLocked: existingDed ? isManualLockedDeduction(existingDed) : false,
      });

      if (!computed) return existingDed;

      if (existingDed && !isDeductionRowOutOfSync(existingDed, computed.payload)) {
        return existingDed;
      }

      const fp = buildPayloadFingerprint(computed.payload);
      if (existingDed && lastSyncedFingerprintByPo.get(targetNorm) === fp) {
        return existingDed;
      }

      const saved = await saveDeductionRowRealtime(computed.payload, existingDed?.id || null);
      if (saved) {
        lastSyncedFingerprintByPo.set(targetNorm, fp);
      }
      return saved || existingDed;
    } finally {
      inFlightPoSyncs.delete(targetNorm);
    }
  })();

  inFlightPoSyncs.set(targetNorm, task);
  return task;
}

let batchSyncInProgress = false;

/**
 * Background real-time sync using already-loaded live PostgreSQL PO, inspection, and base-rate rows.
 * Only writes rows into `sauda_check_point_deductions` that are missing or stale (and never overwrites manual custom locks).
 */
export async function syncExcessShortDeductionsBatch(params: {
  pos: any[];
  inspections: any[];
  baseRates: any[];
  existingDeductions: any[];
  onSynced?: (savedRows: any[]) => void;
}): Promise<any[]> {
  if (!supabase || batchSyncInProgress) return [];
  const { pos, inspections, baseRates, existingDeductions, onSynced } = params;
  if (!Array.isArray(pos) || pos.length === 0 || !Array.isArray(inspections) || inspections.length === 0) {
    return [];
  }

  batchSyncInProgress = true;
  try {
    const normalizedRates = normalizeSattaBaseRates(baseRates);

    const existingDedByPo = new Map<string, any>();
    (existingDeductions || []).forEach((d: any) => {
      const kPo = cleanAlnumUpper(d?.po_no);
      const kSauda = cleanAlnumUpper(d?.sauda_no);
      if (kPo && !existingDedByPo.has(kPo)) existingDedByPo.set(kPo, d);
      if (kSauda && !existingDedByPo.has(kSauda)) existingDedByPo.set(kSauda, d);
    });

    // Index inspections by clean PO/Sauda key
    const inspsByPoKey = new Map<string, any[]>();
    (inspections || []).forEach((insp: any) => {
      const keys = [
        cleanAlnumUpper(insp?.po_no),
        cleanAlnumUpper(insp?.sauda_no || insp?.contract_po_no || insp?.po_contract),
      ].filter(Boolean);
      keys.forEach((k) => {
        const list = inspsByPoKey.get(k);
        if (!list) inspsByPoKey.set(k, [insp]);
        else if (!list.includes(insp)) list.push(insp);
      });
    });

    // Identify candidate POs that have inspections and either missing or out-of-sync deductions
    const candidateMrs = new Set<string>();
    const candidateItems: Array<{ po: any; matchedInsps: any[]; existingDed: any | null }> = [];

    for (const po of pos) {
      const poNo = String(po?.po_no || po?.contract_po_no || '').trim();
      const contractMt = Number(po?.total_contract_mt || po?.total_wt_in_ton || po?.contract_weight_mt || 0);
      if (!poNo || contractMt <= 0) continue;

      const kPo = cleanAlnumUpper(poNo);
      const kSauda = cleanAlnumUpper(po?.sauda_no || po?.sauda_ref);
      const matchedInsps = [
        ...(inspsByPoKey.get(kPo) || []),
        ...(kSauda && kSauda !== kPo ? inspsByPoKey.get(kSauda) || [] : []),
      ];
      if (matchedInsps.length === 0) continue;

      const existingDed = existingDedByPo.get(kPo) || (kSauda ? existingDedByPo.get(kSauda) : null) || null;
      if (existingDed && isManualLockedDeduction(existingDed) && String(existingDed.rate_basis || '') === 'custom') {
        continue;
      }

      // Check if we already need details (when embedded grid_details is empty)
      matchedInsps.forEach((insp) => {
        const mr = String(insp?.mr_no || '').trim();
        if (mr && !insp?.grid_details && !insp?.details) {
          candidateMrs.add(mr);
        }
      });

      candidateItems.push({ po, matchedInsps, existingDed });
    }

    if (candidateItems.length === 0) return [];

    // Fetch missing inspection detail rows only for MRs lacking embedded grid_details
    let fetchedDetails: any[] = [];
    const mrList = Array.from(candidateMrs);
    if (mrList.length > 0) {
      const chunkSize = 80;
      for (let i = 0; i < mrList.length; i += chunkSize) {
        const chunk = mrList.slice(i, i + chunkSize);
        const [matDet, millDet] = await Promise.all([
          supabase.from('material_inspection_details').select('*').in('mr_no', chunk).then((r) => r.data || [], () => []),
          supabase.from('mill_inspection_detail').select('*').in('mr_no', chunk).then((r) => r.data || [], () => []),
        ]);
        fetchedDetails.push(...(matDet as any[]), ...(millDet as any[]));
      }
    }

    const savedRows: any[] = [];

    for (const item of candidateItems) {
      const kPo = cleanAlnumUpper(item.po.po_no || item.po.contract_po_no);
      const computed = computeExcessShortPayload({
        po: item.po,
        inspections: item.matchedInsps,
        inspectionDetails: fetchedDetails,
        normalizedBaseRates: normalizedRates,
        existingDed: item.existingDed,
        isLocked: item.existingDed ? isManualLockedDeduction(item.existingDed) : false,
      });
      if (!computed) continue;

      if (item.existingDed && !isDeductionRowOutOfSync(item.existingDed, computed.payload)) {
        continue;
      }

      const fp = buildPayloadFingerprint(computed.payload);
      if (item.existingDed && lastSyncedFingerprintByPo.get(kPo) === fp) {
        continue;
      }

      const saved = await saveDeductionRowRealtime(computed.payload, item.existingDed?.id || null);
      if (saved) {
        lastSyncedFingerprintByPo.set(kPo, fp);
        savedRows.push(saved);
      }
    }

    if (savedRows.length > 0 && onSynced) {
      onSynced(savedRows);
    }

    return savedRows;
  } catch (err) {
    console.warn('[excessShortAutoSync] Batch sync skipped due to error:', err);
    return [];
  } finally {
    batchSyncInProgress = false;
  }
}
