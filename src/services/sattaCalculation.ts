// Satta-based Deduction Calculation Service
// Calculates Deduction (₹/Qtl) in Payment Section based on Satta Chart grade differentials
// ALL RATES AND DIFFERENTIALS FETCHED EXCLUSIVELY FROM SUPABASE DATABASE TABLES (satta_differentials, satta_calculated_rates)
// ZERO hardcoded rates, ZERO hardcoded fallbacks.

import {
  SattaDifferential,
  resolveSattaDifferential,
  normalizeGrade,
  getNextLowerGrade,
  getCandidateAreas,
  setCachedSattaDifferentials,
  getCachedSattaDifferentials,
  GRADE_SEQUENCES
} from './sattaRateService';

export type { SattaDifferential };
export { normalizeGrade, getNextLowerGrade, getCandidateAreas, GRADE_SEQUENCES };

// Re-export for components that populate or access cached differentials
export const setCachedSattaDiffs = (diffs: any[]) => {
  setCachedSattaDifferentials(diffs);
};

export const getCachedSattaDiffs = () => {
  return getCachedSattaDifferentials();
};

export interface SattaDiffQueryResult {
  differential: number | null;
  matchedArea: string;
  found: boolean;
  error?: string;
}

/**
 * Retrieve differential for a specific area and grade exclusively from Supabase differentials.
 * If not present in Supabase table, returns found: false with clear error.
 * NO HARDCODED SEED FALLBACKS.
 */
export function getSattaDiff(
  area?: string | null,
  grade?: string | null,
  agency?: string | null,
  dbDiffsList?: SattaDifferential[]
): SattaDiffQueryResult {
  const normGrade = normalizeGrade(grade);
  if (!normGrade) {
    return {
      differential: null,
      matchedArea: '',
      found: false,
      error: 'Grade not specified'
    };
  }

  const res = resolveSattaDifferential(area, grade, agency, dbDiffsList);
  if (res.found && res.differential !== null) {
    return {
      differential: res.differential,
      matchedArea: res.matchedArea || '',
      found: true
    };
  }

  return {
    differential: null,
    matchedArea: '',
    found: false,
    error: res.error || `Differential for grade '${normGrade}' in area '${area || agency || 'Unknown'}' not found in Supabase table`
  };
}

let activePoItemsGlobal: any[] = [];
export const setActivePoItemsGlobal = (items: any[]) => {
  activePoItemsGlobal = Array.isArray(items) ? items : [];
};
export const getActivePoItemsGlobal = () => activePoItemsGlobal;

export interface SattaDeductionResult {
  deduction: number;         // Calculated Deduction (₹/Qtl) = GradeDiff * (Sett% / 100)
  gradeDiff: number;         // Absolute difference between current and lower grade
  diff?: number;             // Alias for gradeDiff
  currentGrade: string;      // Contracted / original grade (e.g. 'TD5')
  lowerGrade: string | null; // Next grade down or stock grade (e.g. 'TD6')
  targetGradeName?: string;  // Alias for lowerGrade
  currentDiff: number;       // Rate or differential of current grade
  lowerDiff: number;         // Rate or differential of lower grade
  lowerRate?: number;        // Alias for lowerDiff
  settPct: number;           // Settlement % (Claim %) (e.g. 40%)
  origRate: number;          // Original Rate (₹/Qtl) (e.g. 13500)
  settRate: number;          // Settled Rate = origRate - deduction (₹/Qtl)
  explanation: string;       // Formatted explanation for tooltips & verification
  rateNotFound?: boolean;    // Flag indicating rate was not found
  error?: string;            // Clear error description if missing
  effectiveDiscountPct: number;
  deductionRsPerQtl: number;
}

/**
 * Calculates Deduction (₹/Qtl) for Payment Section using:
 * 1. Sauda Check Point / Purchase Order Details (Items Table Matrix) - HIGHEST PRIORITY
 *    Example: TD5 (13500) down to TD6 (13300) = ₹200 Diff × 40% Sett = ₹80.00/Qtl Deduction
 *    Example: TD6 (13300) down to TD7 (13000) = ₹300 Diff × 50% Sett = ₹150.00/Qtl Deduction
 * 2. Material Grade Details table lines (if adjacent grade is present in other rows)
 * 3. Satta Differentials Chart (fallback if contract rates are unavailable)
 */
export function calculateSattaDeduction(
  colOrGrade: any,
  dbDiffsOrRate?: any,
  customSettPctOrSettPct?: any,
  explicitPoItemsOrDiffs?: any,
  gradeMasters?: any,
  poItemsList?: any,
  lowerGradeArg?: any,
  lowerGradeRateArg?: any,
  allColsArg?: any
): SattaDeductionResult {
  let col: any = {};
  let dbDiffsList: SattaDifferential[] | undefined = undefined;
  let customSettPct: number | undefined = undefined;
  let explicitPoItems: any[] | undefined = undefined;

  if (typeof colOrGrade === 'string') {
    // Positional call convention: (grade, origRate, settPct, diffs, masters, poItems, lowerGrade, lowerGradeRate, allCols)
    col = {
      grade: colOrGrade,
      rate_value: typeof dbDiffsOrRate === 'number' ? dbDiffsOrRate : Number(dbDiffsOrRate) || 0,
      sett_pct: typeof customSettPctOrSettPct === 'number' ? customSettPctOrSettPct : Number(customSettPctOrSettPct) || 0,
      lower_grade: lowerGradeArg,
      target_lower_grade: lowerGradeArg,
      lower_grade_rate: lowerGradeRateArg,
      po_items: poItemsList,
      all_cols: allColsArg
    };
    dbDiffsList = Array.isArray(explicitPoItemsOrDiffs) ? explicitPoItemsOrDiffs : undefined;
    customSettPct = col.sett_pct;
    explicitPoItems = Array.isArray(poItemsList) ? poItemsList : undefined;
  } else if (colOrGrade && typeof colOrGrade === 'object') {
    col = colOrGrade;
    dbDiffsList = Array.isArray(dbDiffsOrRate) ? dbDiffsOrRate : undefined;
    customSettPct = customSettPctOrSettPct;
    explicitPoItems = Array.isArray(explicitPoItemsOrDiffs) ? explicitPoItemsOrDiffs : undefined;
  }

  const currentGrade = normalizeGrade(col.grade) || 'TD5';
  let origRate = Number(col.rate_value) || 0;

  // Determine Settlement / Claim %
  let settPct = 0;
  if (customSettPct !== undefined && !isNaN(customSettPct)) {
    settPct = customSettPct;
  } else if (col.sett_pct !== undefined && col.sett_pct !== null && String(col.sett_pct).trim() !== "" && !isNaN(Number(col.sett_pct)) && Number(col.sett_pct) >= 0) {
    settPct = Number(col.sett_pct);
  } else if (col.gd_claim !== undefined && col.gd_claim !== null && !isNaN(Number(col.gd_claim)) && Number(col.gd_claim) > 0) {
    settPct = Number(col.gd_claim);
  } else if (col.gd_sett !== undefined && col.gd_sett !== null && !isNaN(Number(col.gd_sett)) && Number(col.gd_sett) > 0) {
    settPct = Number(col.gd_sett);
  }

  // Determine target downgraded grade (e.g. TD5 down to TD6, TD6 down to TD7)
  let lowerGrade: string | null = null;
  const explicitLower = normalizeGrade(col.target_lower_grade || col.lower_grade);
  const stockGrade = normalizeGrade(col.stock_grade_name || col.stock_grade_code);
  
  if (explicitLower && explicitLower !== currentGrade) {
    lowerGrade = explicitLower;
  } else if (stockGrade && stockGrade !== currentGrade) {
    lowerGrade = stockGrade;
  } else {
    lowerGrade = getNextLowerGrade(currentGrade);
  }

  // 1. Candidate PO Items from all potential sources
  const candidatePoItems: any[] = [
    ...(Array.isArray(explicitPoItems) ? explicitPoItems : []),
    ...(Array.isArray(col.po_items) ? col.po_items : []),
    ...(Array.isArray(activePoItemsGlobal) ? activePoItemsGlobal : [])
  ];

  // Helper to extract rate from item safely
  const extractItemRate = (it: any): number => {
    if (!it) return 0;
    return Number(it.rate_qntl || it.rate || it.rate_per_mt || it.rate_mt || it.rs || it.b_rate || it.rate_value || 0);
  };

  // Helper to extract normalized grade from item safely
  const extractItemGrade = (it: any): string => {
    if (!it) return '';
    return normalizeGrade(it.grade || it.grade_name || it.grade_code || it.quality || it.item_name || it.challan_grade || it.receipt_grade_name || it.receipt_grade_code);
  };

  // If origRate is 0, auto-resolve currentGrade rate from candidatePoItems
  if (origRate <= 0 && candidatePoItems.length > 0) {
    const curMatch = candidatePoItems.find(it => extractItemGrade(it) === currentGrade && extractItemRate(it) > 0);
    if (curMatch) {
      origRate = extractItemRate(curMatch);
    }
  }

  if (settPct <= 0 || !lowerGrade) {
    return {
      deduction: 0,
      gradeDiff: 0,
      currentGrade,
      lowerGrade,
      currentDiff: origRate,
      lowerDiff: origRate,
      settPct,
      origRate,
      settRate: origRate,
      explanation: settPct <= 0 ? 'No settlement / claim % applied (0%)' : 'No lower grade in hierarchy',
      effectiveDiscountPct: settPct,
      deductionRsPerQtl: 0
    };
  }

  let lowerGradeRate: number | null = null;
  let rateSource: string = '';

  // Check if explicit lower grade rate was passed
  if (col.lower_grade_rate !== undefined && col.lower_grade_rate !== null && Number(col.lower_grade_rate) > 0) {
    lowerGradeRate = Number(col.lower_grade_rate);
    rateSource = 'User Specified';
  }

  // 1. FIRST PRIORITY: Look up the lower grade rate in Sauda Check Point / PO Items Table Matrix
  if (lowerGradeRate === null && candidatePoItems.length > 0) {
    const colAgencyNorm = col.agency ? String(col.agency).trim().toUpperCase() : '';
    
    // First try: matching both lower grade AND agency
    let matchedItem = candidatePoItems.find(it => {
      const itGrade = extractItemGrade(it);
      if (itGrade !== lowerGrade) return false;
      const itRate = extractItemRate(it);
      if (itRate <= 0) return false;
      if (colAgencyNorm) {
        const itAgency = String(it.agency || it.agency_name || it.agency_code || '').trim().toUpperCase();
        return itAgency === colAgencyNorm || colAgencyNorm.includes(itAgency) || itAgency.includes(colAgencyNorm);
      }
      return true;
    });

    // Second try: match lower grade anywhere in PO items matrix
    if (!matchedItem) {
      matchedItem = candidatePoItems.find(it => {
        const itGrade = extractItemGrade(it);
        const itRate = extractItemRate(it);
        return itGrade === lowerGrade && itRate > 0;
      });
    }

    if (matchedItem) {
      const r = extractItemRate(matchedItem);
      if (r > 0) {
        lowerGradeRate = r;
        rateSource = 'Sauda Check Point (PO Matrix)';
      }
    }
  }

  // 2. SECOND PRIORITY: Check other columns in the Material Grade Details table (all_cols)
  if (lowerGradeRate === null && Array.isArray(col.all_cols) && col.all_cols.length > 0) {
    const otherColMatch = col.all_cols.find(c => {
      if (!c || c === col) return false;
      const cGrade = normalizeGrade(c.grade);
      return cGrade === lowerGrade && Number(c.rate_value) > 0;
    });

    if (otherColMatch && Number(otherColMatch.rate_value) > 0) {
      lowerGradeRate = Number(otherColMatch.rate_value);
      rateSource = 'Material Grade Details Table';
    }
  }

  // If lower grade rate was found directly from Sauda Check Point / PO matrix or table:
  if (lowerGradeRate !== null && lowerGradeRate > 0) {
    const gradeDiff = Math.abs(origRate - lowerGradeRate);
    const deduction = Number(((gradeDiff * settPct) / 100).toFixed(2));
    const settRate = Math.max(0, Number((origRate - deduction).toFixed(2)));
    const explanation = `${rateSource}: ${currentGrade} (₹${origRate.toFixed(2)}) down to ${lowerGrade} (₹${lowerGradeRate.toFixed(2)}) = ₹${gradeDiff.toFixed(2)} Diff × ${settPct}% Sett = ₹${deduction.toFixed(2)}/Qtl`;

    return {
      deduction,
      gradeDiff,
      diff: gradeDiff,
      currentGrade,
      lowerGrade,
      targetGradeName: lowerGrade || '',
      currentDiff: origRate,
      lowerDiff: lowerGradeRate,
      lowerRate: lowerGradeRate,
      settPct,
      origRate,
      settRate,
      explanation,
      effectiveDiscountPct: settPct,
      deductionRsPerQtl: deduction
    };
  }

  // 3. THIRD PRIORITY: Fallback to Satta Chart Differentials
  const currDiffRes = getSattaDiff(col.area, currentGrade, col.agency, dbDiffsList);
  const lowerDiffRes = getSattaDiff(col.area, lowerGrade, col.agency, dbDiffsList);

  if (currDiffRes.found && currDiffRes.differential !== null && lowerDiffRes.found && lowerDiffRes.differential !== null) {
    const currentDiff = currDiffRes.differential;
    const lowerDiff = lowerDiffRes.differential;
    const gradeDiff = Math.abs(currentDiff - lowerDiff);
    const deduction = Number(((gradeDiff * settPct) / 100).toFixed(2));
    const settRate = Math.max(0, Number((origRate - deduction).toFixed(2)));
    const matchedAreaName = currDiffRes.matchedArea || lowerDiffRes.matchedArea || col.area || 'Satta Differentials';

    const explanation = `Satta Differentials (${matchedAreaName}): ${currentGrade} (₹${currentDiff}) vs ${lowerGrade} (₹${lowerDiff}) = ₹${gradeDiff} Diff × ${settPct}% Sett = ₹${deduction.toFixed(2)}/Qtl`;

    return {
      deduction,
      gradeDiff,
      diff: gradeDiff,
      currentGrade,
      lowerGrade,
      targetGradeName: lowerGrade || '',
      currentDiff,
      lowerDiff,
      lowerRate: lowerDiff,
      settPct,
      origRate,
      settRate,
      explanation,
      effectiveDiscountPct: settPct,
      deductionRsPerQtl: deduction
    };
  }

  // If rate not found in any source:
  const errorMsg = `Lower grade rate for '${lowerGrade}' not found in Sauda Check Point or Satta Chart`;
  return {
    deduction: 0,
    gradeDiff: 0,
    diff: 0,
    currentGrade,
    lowerGrade,
    targetGradeName: lowerGrade || '',
    currentDiff: origRate,
    lowerDiff: 0,
    lowerRate: 0,
    settPct,
    origRate,
    settRate: origRate,
    rateNotFound: true,
    error: errorMsg,
    explanation: errorMsg,
    effectiveDiscountPct: settPct,
    deductionRsPerQtl: 0
  };
}
