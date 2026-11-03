import { supabase } from '../lib/supabase';
import { dbModule } from './dbModule';

export interface GradeItemPremium {
  detailId?: string;
  grade: string;
  quantityMt: number;
  quantityQtl: number;
  premiumRatePerQtl: number;
  premiumAmount: number;
  amount?: number;
  rateValue?: number;
  settRate?: number;
}

export interface MrPremiumSummary {
  mrNo: string;
  cleanMr: string;
  voucherNo: string;
  poNo: string;
  paymentId?: string;
  paymentDate: string;
  year: number;
  month: number; // 0-11
  grades: GradeItemPremium[];
  totalPremiumAmount: number;
  totalQuantityQtl: number;
  avgPremiumRatePerQtl: number;
  supplier?: string;
  broker?: string;
  partyName?: string;
}

export interface UnifiedPremiumAggregation {
  totalPremiumSum: number;
  totalMrCount: number;
  totalGradeLotsCount: number;
  totalWeightQtl: number;
  avgPremiumRate: number;
  mrsWithPremium: MrPremiumSummary[];
  byMrMap: Map<string, MrPremiumSummary>;
  byPoMap: Map<string, MrPremiumSummary[]>;
  byVoucherMap: Map<string, MrPremiumSummary>;
}

/**
 * Standardize reference key (strip spaces, symbols, uppercase)
 */
export function normalizeKey(val: any): string {
  if (!val) return '';
  return String(val).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Normalizes weight into Quintals (1 MT = 10 Quintals, 1 Quintal = 100 kg)
 * Supports explicit quantity_qtl, arr_qty_wt in MT, and kg conversions.
 */
export function extractWeightInQuintals(row: any): number {
  if (!row) return 0;

  // 1. Explicit Quintals field
  const explicitQtl = Number(row.quantity_qtl ?? row.wt_qtl ?? row.weight_qtl ?? 0);
  if (explicitQtl > 0) {
    return explicitQtl;
  }

  // 2. MT weight (arr_qty_wt, wt_quantity, weight_mt)
  const rawWt = Number(row.arr_qty_wt ?? row.wt_quantity ?? row.weight_mt ?? row.quantity ?? 0);
  if (rawWt > 0) {
    // If rawWt > 1000, it might be in kg: e.g. 8563 kg -> 856.3 qtl (/10 in user mill terms) or 85.63 qtl
    if (rawWt > 1000) {
      return Number((rawWt / 10).toFixed(2));
    }
    // If rawWt is a standard MT decimal (< 100), 1 MT = 10 Quintals
    return Number((rawWt * 10).toFixed(2));
  }

  return 0;
}

/**
 * Parses premium rate per quintal from various column aliases
 */
export function extractPremiumRatePerQtl(row: any): number {
  if (!row) return 0;
  const val = row.premium ?? row.premium_rate ?? row.rate_premium ?? row.summary_premium_rate;
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const s = String(val).trim();
  if (!s || s === '-' || /^(no|false)$/i.test(s)) return 0;
  const num = parseFloat(s.replace(/[^0-9.]/g, ''));
  return isNaN(num) ? 0 : num;
}

/**
 * Core robust premium calculation:
 * Iterates through payment_details, joins with payment_master header metadata,
 * calculates: (Grade Weight in Quintals * Premium Per Qtl) = Grade Premium Amount,
 * and sums across all grades of each MR.
 */
export function aggregatePremiumsFromTables(
  paymentMasters: any[] = [],
  paymentDetails: any[] = []
): UnifiedPremiumAggregation {
  // 1. Build fast lookup indexes for payment_master
  const masterByVoucher = new Map<string, any>();
  const masterByMr = new Map<string, any>();
  const masterById = new Map<string, any>();

  paymentMasters.forEach(pm => {
    if (pm.voucher_no) masterByVoucher.set(normalizeKey(pm.voucher_no), pm);
    if (pm.mr_no) masterByMr.set(normalizeKey(pm.mr_no), pm);
    if (pm.payment_id) masterById.set(normalizeKey(pm.payment_id), pm);
  });

  // 2. Index payment details by MR / Voucher
  const mrMap = new Map<string, MrPremiumSummary>();
  const poMap = new Map<string, MrPremiumSummary[]>();
  const voucherMap = new Map<string, MrPremiumSummary>();

  // Process details table
  (paymentDetails || []).forEach((det: any) => {
    const rawMr = String(det.mr_no || det.arrival_no || '').trim();
    const rawVoucher = String(det.voucher_no || '').trim();
    const cleanMr = normalizeKey(rawMr);
    const cleanVoucher = normalizeKey(rawVoucher);
    const cleanId = normalizeKey(det.payment_id);

    // Resolve parent master metadata
    const parentMaster = masterByVoucher.get(cleanVoucher) || 
                         masterByMr.get(cleanMr) || 
                         masterById.get(cleanId) || {};

    const resolvedMr = rawMr || parentMaster.mr_no || parentMaster.arrival_no || 'MR-UNKNOWN';
    const primaryKey = cleanMr || cleanVoucher || normalizeKey(resolvedMr);
    if (!primaryKey) return;

    const premRate = extractPremiumRatePerQtl(det);
    const explicitPremAmt = Number(det.premium_amount || det.val_premium_amt || 0);
    const qtl = extractWeightInQuintals(det);
    const rawMt = Number(det.arr_qty_wt ?? (qtl / 10));

    // Calculate premium amount:
    // If explicit line premium amount exists and doesn't match entire bill, use it.
    // Otherwise use standard formula: (Grade Weight in Quintals * Premium Per Qtl)
    let calculatedAmt = 0;
    if (explicitPremAmt > 0 && Math.abs(explicitPremAmt - Number(det.amount || 0)) > 1) {
      calculatedAmt = explicitPremAmt;
    } else if (premRate > 0 && qtl > 0) {
      calculatedAmt = Number((premRate * qtl).toFixed(2));
    }

    if (calculatedAmt > 0 || premRate > 0) {
      const dateStr = parentMaster.payment_date || parentMaster.sett_date || parentMaster.arrival_date || det.created_at || '';
      let year = 2026;
      let month = 7; // default August 0-indexed

      if (dateStr) {
        const parts = String(dateStr).split('T')[0].split('-');
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          if (!isNaN(y) && y >= 2000) year = y;
          if (!isNaN(m) && m >= 0 && m <= 11) month = m;
        }
      }

      const gradeItem: GradeItemPremium = {
        detailId: det.detail_id,
        grade: String(det.grade || det.item_grade || 'TD-6').trim().toUpperCase(),
        quantityMt: Number(rawMt.toFixed(3)),
        quantityQtl: Number(qtl.toFixed(2)),
        premiumRatePerQtl: premRate,
        premiumAmount: calculatedAmt,
        amount: Number(det.amount || 0),
        rateValue: Number(det.rate_value || 0),
        settRate: Number(det.sett_rate || 0)
      };

      const existing = mrMap.get(primaryKey) || (cleanVoucher ? voucherMap.get(cleanVoucher) : undefined);
      if (existing) {
        existing.grades.push(gradeItem);
        existing.totalPremiumAmount = Number((existing.totalPremiumAmount + calculatedAmt).toFixed(2));
        existing.totalQuantityQtl = Number((existing.totalQuantityQtl + qtl).toFixed(2));
        existing.avgPremiumRatePerQtl = existing.totalQuantityQtl > 0 
          ? Number((existing.totalPremiumAmount / existing.totalQuantityQtl).toFixed(2)) 
          : existing.avgPremiumRatePerQtl;
        if (!existing.voucherNo && (rawVoucher || parentMaster.voucher_no)) {
          existing.voucherNo = rawVoucher || parentMaster.voucher_no;
        }
        if (existing.voucherNo) {
          const vKey = normalizeKey(existing.voucherNo);
          voucherMap.set(vKey, existing);
          voucherMap.set(vKey.replace(/^PAY/, ''), existing);
        }
        if (cleanMr) {
          mrMap.set(cleanMr, existing);
          mrMap.set(cleanMr.replace(/^MR/, ''), existing);
        }
      } else {
        const summary: MrPremiumSummary = {
          mrNo: resolvedMr,
          cleanMr: primaryKey,
          voucherNo: rawVoucher || parentMaster.voucher_no || '',
          poNo: parentMaster.po_no || det.po_no || '',
          paymentId: det.payment_id || parentMaster.payment_id,
          paymentDate: dateStr,
          year,
          month,
          grades: [gradeItem],
          totalPremiumAmount: calculatedAmt,
          totalQuantityQtl: qtl,
          avgPremiumRatePerQtl: premRate,
          supplier: parentMaster.supplier || parentMaster.party_name || '',
          broker: parentMaster.broker || '',
          partyName: parentMaster.party_name || parentMaster.supplier || ''
        };
        mrMap.set(primaryKey, summary);
        if (cleanMr) {
          mrMap.set(cleanMr, summary);
          mrMap.set(cleanMr.replace(/^MR/, ''), summary);
        }
        if (summary.voucherNo) {
          const vKey = normalizeKey(summary.voucherNo);
          voucherMap.set(vKey, summary);
          voucherMap.set(vKey.replace(/^PAY/, ''), summary);
        }
        if (summary.poNo) {
          const cleanPo = normalizeKey(summary.poNo);
          const poList = poMap.get(cleanPo) || [];
          poList.push(summary);
          poMap.set(cleanPo, poList);
        }
      }
    }
  });

  // 3. Fallback: Check if payment_master itself has explicit header-level premium not yet caught
  paymentMasters.forEach(pm => {
    const rawMr = String(pm.mr_no || pm.arrival_no || '').trim();
    const cleanMr = normalizeKey(rawMr);
    const cleanVoucher = normalizeKey(pm.voucher_no);
    const primaryKey = cleanMr || cleanVoucher;
    if (!primaryKey) return;

    if (!mrMap.has(primaryKey)) {
      const explicitAmt = Number(pm.val_premium_amt || pm.summary_premium_amount || 0);
      const premRate = extractPremiumRatePerQtl(pm);
      const invoiceTotal = Number(pm.payable_amt || pm.total_amount || pm.paid_amount || 0);

      let calcAmt = 0;
      if (explicitAmt > 0 && (invoiceTotal === 0 || Math.abs(explicitAmt - invoiceTotal) > 1)) {
        calcAmt = explicitAmt;
      } else if (premRate > 0) {
        const qtl = extractWeightInQuintals(pm);
        if (qtl > 0) {
          calcAmt = Number((premRate * qtl).toFixed(2));
        }
      }

      if (calcAmt > 0 || premRate > 0) {
        const dateStr = pm.payment_date || pm.sett_date || pm.created_at || '';
        let year = 2026;
        let month = 7;
        if (dateStr) {
          const parts = String(dateStr).split('T')[0].split('-');
          if (parts.length === 3) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            if (!isNaN(y) && y >= 2000) year = y;
            if (!isNaN(m) && m >= 0 && m <= 11) month = m;
          }
        }

        const summary: MrPremiumSummary = {
          mrNo: rawMr || pm.voucher_no || 'MR-UNKNOWN',
          cleanMr: primaryKey,
          voucherNo: pm.voucher_no || '',
          poNo: pm.po_no || '',
          paymentId: pm.payment_id,
          paymentDate: dateStr,
          year,
          month,
          grades: [{
            grade: pm.grade || 'TD-5',
            quantityMt: Number(pm.total_weight || 0),
            quantityQtl: extractWeightInQuintals(pm),
            premiumRatePerQtl: premRate,
            premiumAmount: calcAmt
          }],
          totalPremiumAmount: calcAmt,
          totalQuantityQtl: extractWeightInQuintals(pm),
          avgPremiumRatePerQtl: premRate,
          supplier: pm.supplier || pm.party_name || '',
          broker: pm.broker || '',
          partyName: pm.party_name || pm.supplier || ''
        };
        mrMap.set(primaryKey, summary);
        if (cleanMr) {
          mrMap.set(cleanMr, summary);
          mrMap.set(cleanMr.replace(/^MR/, ''), summary);
        }
        if (summary.voucherNo) {
          const vKey = normalizeKey(summary.voucherNo);
          voucherMap.set(vKey, summary);
          voucherMap.set(vKey.replace(/^PAY/, ''), summary);
        }
        if (summary.poNo) {
          const cleanPo = normalizeKey(summary.poNo);
          const poList = poMap.get(cleanPo) || [];
          poList.push(summary);
          poMap.set(cleanPo, poList);
        }
      }
    }
  });

  const mrsWithPremium = Array.from(new Set(mrMap.values()));
  let totalPremiumSum = 0;
  let totalGradeLotsCount = 0;
  let totalWeightQtl = 0;

  mrsWithPremium.forEach(m => {
    totalPremiumSum += m.totalPremiumAmount;
    totalGradeLotsCount += m.grades.length;
    totalWeightQtl += m.totalQuantityQtl;
  });

  totalPremiumSum = Number(totalPremiumSum.toFixed(2));
  totalWeightQtl = Number(totalWeightQtl.toFixed(2));
  const avgPremiumRate = totalWeightQtl > 0 
    ? Number((totalPremiumSum / totalWeightQtl).toFixed(2)) 
    : 0;

  return {
    totalPremiumSum,
    totalMrCount: mrsWithPremium.length,
    totalGradeLotsCount,
    totalWeightQtl,
    avgPremiumRate,
    mrsWithPremium,
    byMrMap: mrMap,
    byPoMap: poMap,
    byVoucherMap: voucherMap
  };
}

/**
 * Filter the aggregated premium data by Year and Month
 */
export function filterAggregatedPremiums(
  aggregation: UnifiedPremiumAggregation,
  year?: number | null,
  month?: number | null // 0-11
): { sum: number; count: number; mrs: MrPremiumSummary[] } {
  const filtered = aggregation.mrsWithPremium.filter(m => {
    if (year !== undefined && year !== null && m.year !== year) return false;
    if (month !== undefined && month !== null && m.month !== month) return false;
    return true;
  });

  let sum = 0;
  filtered.forEach(m => sum += m.totalPremiumAmount);
  return {
    sum: Number(sum.toFixed(2)),
    count: filtered.length,
    mrs: filtered
  };
}

/**
 * Direct async fetcher to retrieve and calculate premiums straight from Supabase / DBModule
 */
export async function fetchAndComputeUnifiedPremiums(): Promise<UnifiedPremiumAggregation> {
  let masters: any[] = [];
  let details: any[] = [];

  try {
    masters = await dbModule.fetchAll('payment_master').catch(() => []);
    details = await dbModule.fetchAll('payment_details').catch(() => []);
  } catch (err) {
    console.warn("fetchAndComputeUnifiedPremiums error:", err);
  }

  return aggregatePremiumsFromTables(masters, details);
}
