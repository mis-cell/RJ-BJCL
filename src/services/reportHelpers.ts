import { cleanSaudaNo } from '../lib/utils';
import { AgeingBucketKey, SupplierRating } from '../types/report.types';

// Helper function to parse date string without timezone offset shifts
export function parseDateOnly(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  if (!s) return null;
  if (s.includes('T')) {
    const parts = s.split('T')[0].split('-');
    if (parts.length === 3) {
      const y = Number(parts[0]), m = Number(parts[1]) - 1, d = Number(parts[2]);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return new Date(y, m, d);
    }
  }
  if (s.includes('-')) {
    const parts = s.split('-');
    if (parts[0].length === 4) {
      const y = Number(parts[0]), m = Number(parts[1]) - 1, d = Number(parts[2]);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return new Date(y, m, d);
    } else if (parts[2].length === 4) {
      const y = Number(parts[2]), m = Number(parts[1]) - 1, d = Number(parts[0]);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return new Date(y, m, d);
    }
  }
  if (s.includes('/')) {
    const parts = s.split('/');
    if (parts[2].length === 4) {
      const y = Number(parts[2]), m = Number(parts[1]) - 1, d = Number(parts[0]);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return new Date(y, m, d);
    }
  }
  const parsed = new Date(s);
  return isNaN(parsed.getTime()) ? null : parsed;
}

// Standard Calculations
export const calcHelpers = {
  safeRound(val: number, decimals: number = 2): number {
    if (isNaN(val) || !isFinite(val)) return 0;
    return parseFloat(val.toFixed(decimals));
  },

  calcDeliveredPct(deliveredWt: number, contractedWt: number): number {
    if (!contractedWt || contractedWt <= 0) return 0;
    return this.safeRound((deliveredWt / contractedWt) * 100);
  },

  calcPendingPct(pendingWt: number, contractedWt: number): number {
    if (!contractedWt || contractedWt <= 0) return 0;
    return this.safeRound((pendingWt / contractedWt) * 100);
  },

  calcCompletedContractPct(fullyDeliveredCount: number, totalCount: number): number {
    if (!totalCount || totalCount <= 0) return 0;
    return this.safeRound((fullyDeliveredCount / totalCount) * 100);
  },

  calcPendingContractPct(pendingOrPartialCount: number, totalCount: number): number {
    if (!totalCount || totalCount <= 0) return 0;
    return this.safeRound((pendingOrPartialCount / totalCount) * 100);
  },

  calcOnTimePct(onTimeDeliveredWt: number, totalDeliveredWt: number): number {
    if (!totalDeliveredWt || totalDeliveredWt <= 0) return 0;
    return this.safeRound((onTimeDeliveredWt / totalDeliveredWt) * 100);
  },

  calcDelayedPct(delayedDeliveredWt: number, totalDeliveredWt: number): number {
    if (!totalDeliveredWt || totalDeliveredWt <= 0) return 0;
    return this.safeRound((delayedDeliveredWt / totalDeliveredWt) * 100);
  },

  calcWeightVariance(finalReceivedWt: number, contractedWt: number): number {
    return this.safeRound(finalReceivedWt - contractedWt, 3);
  },

  calcWeightVariancePct(weightVariance: number, contractedWt: number): number {
    if (!contractedWt || contractedWt <= 0) return 0;
    return this.safeRound((weightVariance / contractedWt) * 100);
  },

  calcSettlementPct(settledVal: number, eligibleVal: number): number {
    if (!eligibleVal || eligibleVal <= 0) return 0;
    return this.safeRound((settledVal / eligibleVal) * 100);
  },

  calcPaymentPct(paidAmt: number, payableAmt: number): number {
    if (!payableAmt || payableAmt <= 0) return 0;
    return this.safeRound((paidAmt / payableAmt) * 100);
  },

  getSupplierRating(deliveredPct: number, onTimePct: number, pendingWt: number, isRepeatedDelay: boolean = false): SupplierRating {
    if (isRepeatedDelay || (pendingWt > 50 && deliveredPct < 50)) return 'Critical';
    if (deliveredPct >= 95 && onTimePct >= 90) return 'Excellent';
    if (deliveredPct >= 80) return 'Good';
    if (deliveredPct >= 60) return 'Average';
    return 'Poor';
  },

  calcComplianceScore(deliveredPct: number, onTimePct: number, qualityAcceptancePct: number, weights = { delivered: 0.4, onTime: 0.4, quality: 0.2 }): number {
    const score = (deliveredPct * weights.delivered) + (onTimePct * weights.onTime) + (qualityAcceptancePct * weights.quality);
    return this.safeRound(score, 1);
  },

  getAgeingBucket(daysPending: number): AgeingBucketKey {
    if (daysPending <= 0) return 'not_due';
    if (daysPending <= 7) return '1_7_days';
    if (daysPending <= 15) return '8_15_days';
    if (daysPending <= 30) return '16_30_days';
    if (daysPending <= 60) return '31_60_days';
    return 'above_60_days';
  },

  getAgeingBucketLabel(bucket: AgeingBucketKey): string {
    switch (bucket) {
      case 'not_due': return 'Not Due';
      case '1_7_days': return '1-7 Days Overdue';
      case '8_15_days': return '8-15 Days Overdue';
      case '16_30_days': return '16-30 Days Overdue';
      case '31_60_days': return '31-60 Days Overdue';
      case 'above_60_days': return 'Above 60 Days Overdue';
    }
  }
};

// Helper functions strictly mirroring Sauda Desk (src/pages/SaudaRegister.tsx)
export const formatPoNumber = (sauda: any): string => {
  if (!sauda) return '';
  const rawNo = String(sauda.sauda_no || sauda.no || sauda.contract_no || '').trim();
  const sessionVal = String(sauda.session || sauda.financial_year || '2026-2027');
  if (!rawNo) return `BJCL/${sessionVal}/Auto`;
  return cleanSaudaNo(rawNo, sessionVal);
};

export const getCleanDigits = (str: string): string => {
  if (!str) return '';
  const clean = String(str).trim().toUpperCase();
  const withoutPrefix = clean
    .replace(/^BJCL\//i, '')
    .replace(/^BJC\//i, '')
    .replace(/^BJC/i, '')
    .replace(/^PO[-/]/i, '')
    .replace(/^PTF[-/]/i, '');
  const withoutYear = withoutPrefix
    .replace(/20\d{2}-20\d{2}/g, '')
    .replace(/20\d{2}\/20\d{2}/g, '')
    .replace(/20\d{2}20\d{2}/g, '')
    .replace(/\/\d{2}-\d{2}$/g, '')
    .replace(/^\d{2}-\d{2}\//g, '')
    .replace(/[^0-9]/g, '');
  return withoutYear.replace(/^0+/, '');
};

// Check if a Sauda contract is entered into Sauda Check Point or Purchase Order (Sauda Desk logic)
export const isSaudaInCheckPointOrPo = (s: any, scpList: any[] = [], poList: any[] = []): boolean => {
  if (!s) return false;
  const statusVal = String(s.status || '').toLowerCase();
  if (statusVal === 'completed' || statusVal === 'in_check_point' || statusVal === 'in_po' || statusVal === 'final') {
    return true;
  }

  const sId = String(s.sauda_id || s.id || '').trim().toUpperCase();
  const sNo = String(s.sauda_no || '').trim().toUpperCase();
  const sSession = String(s.session || '').trim().toUpperCase();
  const sDisplay = (formatPoNumber(s) || '').trim().toUpperCase();

  const sNoDigits = getCleanDigits(sNo);
  const sDisplayDigits = getCleanDigits(sDisplay);
  const sSessionDigits = getCleanDigits(sSession);

  const allPoSources = [...(scpList || []), ...(poList || [])];

  return allPoSources.some(p => {
    if (!p) return false;
    const pSaudaId = String(p.sauda_id || p.sauda_id_ref || '').trim().toUpperCase();
    if (sId && pSaudaId && sId === pSaudaId) return true;

    const pPo = String(p.po_no || '').trim().toUpperCase();
    const pContract = String(p.contract_po_no || '').trim().toUpperCase();
    const pSaudaNo = String(p.sauda_no || p.po_contract || p.contract_no || '').trim().toUpperCase();
    const pPtf = String(p.ptf_no || '').trim().toUpperCase();

    const pTokens = [pPo, pContract, pSaudaNo, pPtf].filter(Boolean);
    if (pTokens.some(tok => tok === sNo || tok === sDisplay || tok === sSession)) {
      return true;
    }

    for (const tok of pTokens) {
      const tokDigits = getCleanDigits(tok);
      if (sNoDigits && tokDigits && sNoDigits === tokDigits) return true;
      if (sDisplayDigits && tokDigits && sDisplayDigits === tokDigits) return true;
      if (sSessionDigits && tokDigits && sSessionDigits === tokDigits) return true;
    }

    return false;
  });
};

export const extractContractNumber = (str: any): string => {
  if (!str) return '';
  const s = String(str).trim();
  const parts = s.split('/');
  const lastPart = parts[parts.length - 1];
  const digits = lastPart.replace(/[^0-9]/g, '');
  return digits.replace(/^0+/, '') || lastPart.replace(/[^a-zA-Z0-9]/g, '');
};

// Check if a record is a PTF (Purchase To Factory) contract
export const isPtfRecord = (r: any): boolean => {
  if (!r) return false;
  return Boolean(
    r.is_ptf ||
    (r.ptf_no && String(r.ptf_no).trim() && String(r.ptf_no).trim().toUpperCase() !== 'N/A') ||
    String(r.po_type || '').toUpperCase() === 'PTF' ||
    String(r.po_identification || '').toUpperCase() === 'PTF' ||
    String(r.po_no || '').trim().toUpperCase().startsWith('PTF') ||
    String(r.po_no || '').trim().toUpperCase().includes('(PTF)') ||
    String(r.ptf_no || '').trim().toUpperCase().includes('(PTF)')
  );
};
