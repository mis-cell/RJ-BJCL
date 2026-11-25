/**
 * Centralized 6-Layer Contractual Relationship, Material Validation & Financial Eligibility Engine
 *
 * Enforces strict separation between:
 *   Layer 1 — Contractual Relationship (Exact PO <-> MR identity; NEVER mutated by eligibility filters)
 *   Layer 2 — MR-Level Material Validation (Per-MR Sauda Check Point vs Mill Inspection mismatch check)
 *   Layer 3 — Payment Eligibility (Independent MR eligibility without altering contractual PO)
 *   Layer 4 — Settlement Eligibility & Closure Validation (Per-MR settlement + multi-MR closure guard)
 *   Layer 5 — Financial Consistency Helpers (Voucher deduplication & exact PO/MR scoping)
 *   Layer 6 — Deep-Link Navigation Context (Payment / Settlement <-> Material Mismatch direct routing)
 *
 * Hard Guarantees:
 *   - NEVER performs substring, prefix, suffix-only, or fuzzy PO matching (.includes / endsWith / %suffix%).
 *   - `BJCL/2026-2027/0701` NEVER matches `BJCL/2026-2027/07013` or `BJCL/2025-2026/0701`.
 *   - NEVER substitutes another PO when an MR's original PO is missing from a filtered dropdown list.
 *   - NEVER silently mutates historical records; flags historical MR-to-PO conflicts explicitly.
 */

import {
  areMrNumbersEqual,
  extractFinalArrivalMrNo,
  extractInspectionMrNo,
  extractRecordMrNo,
  getCanonicalMrCompareKey,
  normalizeFinalMrNo,
} from './mrNumberUtils';
import { compareSaudaMillInspection, PoMatchKnownCodes } from './poMatch';

/**
 * Authoritative check for whether a `material_mismatch` DB row is approved/resolved
 * (supporting Admin / L3 / L4 / L5 / MAX / SUPER approval metadata).
 */
export function isMaterialMismatchApproved(mm: any): boolean {
  if (!mm) return false;
  const st = String(mm.status || mm.resolution_status || '').toLowerCase().trim();
  if (st === 'rejected' || st === 'cancelled') return false;

  const remarksUpper = String(mm.remarks || '').toUpperCase();
  const approvedByUpper = String(mm.approved_by || '').trim().toUpperCase();
  const approvalLevelUpper = String(mm.approval_level || '').trim().toUpperCase();

  const hasApprovedStatus = st === 'resolved' || st === 'approved' || st === 'cleared';
  const hasApprovedBy = Boolean(approvedByUpper);
  const hasApprovedTag = remarksUpper.includes('[APPROVED BY');
  const hasApprovedRemark =
    hasApprovedTag ||
    (remarksUpper.includes('APPROVED') &&
      !remarksUpper.includes('NOT APPROVED') &&
      !remarksUpper.includes('UNAPPROVED') &&
      !remarksUpper.includes('PENDING APPROVAL'));

  if (st === 'pending' || st === 'open') {
    if (!hasApprovedBy && !hasApprovedTag) return false;
  } else if (!hasApprovedStatus && !hasApprovedBy && !hasApprovedRemark) {
    return false;
  }

  const remarkMatch = remarksUpper.match(/\[APPROVED BY\s+([^\]]+?)\s*\(([^)]+)\)/);
  const remarkApprover = remarkMatch ? remarkMatch[1].trim() : '';
  const remarkLevel = remarkMatch ? remarkMatch[2].trim() : '';
  const detectedLevel = approvalLevelUpper || remarkLevel;
  const detectedApprover = approvedByUpper || remarkApprover;

  if (detectedLevel) {
    const isAuthorizedLevel =
      detectedLevel.includes('ADMIN') ||
      detectedLevel.includes('L3') ||
      detectedLevel.includes('L4') ||
      detectedLevel.includes('L5') ||
      detectedLevel.includes('MAX') ||
      detectedLevel.includes('SUPER') ||
      detectedApprover.includes('ADMIN');
    if (!isAuthorizedLevel) return false;
  }

  return true;
}

export const MATERIAL_MISMATCH_BLOCK_MESSAGE =
  'Material Mismatch Detected: This MR contains an unresolved mismatch against its original Sauda/PO. Please resolve the mismatch before proceeding with the applicable financial transaction.';

export const NAV_TO_MATERIAL_MISMATCH_EVENT = 'bjcl:navigate-to-material-mismatch';
export const RETURN_FROM_MATERIAL_MISMATCH_EVENT = 'bjcl:return-from-material-mismatch';
const MISMATCH_NAV_STORAGE_KEY = 'bjcl_material_mismatch_nav_target';

export interface MaterialMismatchNavigationTarget {
  poNo: string;
  mrNo: string;
  returnPage: 'payment' | 'mr_settlement';
  returnLabel: string;
  mismatchId?: string;
  timestamp: number;
}

const INVALID_PO_TOKENS = new Set([
  '',
  'N/A',
  'NA',
  'NONE',
  'NIL',
  'NULL',
  'UNDEFINED',
  'NOT LINKED',
  '-',
  '--',
]);

/**
 * Normalizes a PO string strictly (trim, uppercase, strip leading `#` only).
 * Preserves financial year, prefix, and `(PTF)` suffix.
 */
export function normalizePoExact(val: unknown): string {
  if (val === null || val === undefined) return '';
  const cleaned = String(val).trim().replace(/^#+/, '').trim().toUpperCase();
  if (INVALID_PO_TOKENS.has(cleaned)) return '';
  return cleaned;
}

/**
 * Canonical PO key for exact contractual equality:
 * - Uppercase, trimmed, strips leading `#`, collapses internal whitespace
 * - Strips optional trailing `(PTF)` tag ONLY (because `BJCL/2026-2027/0760` and `BJCL/2026-2027/0760(PTF)`
 *   refer to the same contract across Sauda Check Point and Mill Inspection)
 * - NEVER strips financial year (`2026-2027`), prefix (`BJCL/`), or numeric digits.
 * - NEVER truncates or compares substrings.
 */
export function normalizePoCanonical(val: unknown): string {
  const exact = normalizePoExact(val);
  if (!exact) return '';
  const noPtf = exact
    .replace(/\s*\(\s*PTF\s*\)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (INVALID_PO_TOKENS.has(noPtf)) return '';
  return noPtf;
}

/**
 * Returns exact DB query variants for a PO number (e.g., raw, `#raw`, `canonical`, `canonical(PTF)`).
 * Safe for exact equality queries — NEVER produces wildcard `%suffix%` patterns.
 */
export function buildExactPoQueryVariants(poNo: unknown): string[] {
  const exact = normalizePoExact(poNo);
  const canonical = normalizePoCanonical(poNo);
  if (!exact && !canonical) return [];
  const variants = new Set<string>();
  const rawTrimmed = String(poNo || '').trim();
  if (rawTrimmed) variants.add(rawTrimmed);
  if (exact) {
    variants.add(exact);
    variants.add(`#${exact}`);
  }
  if (canonical) {
    variants.add(canonical);
    variants.add(`#${canonical}`);
    variants.add(`${canonical}(PTF)`);
    variants.add(`#${canonical}(PTF)`);
  }
  return Array.from(variants);
}

/**
 * Strictly compares two PO numbers for exact contractual identity.
 * - `BJCL/2026-2027/0701` vs `BJCL/2026-2027/07013` => FALSE
 * - `BJCL/2026-2027/0701` vs `BJCL/2025-2026/0701`  => FALSE
 * - `BJCL/2026-2027/0701` vs `0701`                => FALSE
 * - `BJCL/2026-2027/0701` vs `#BJCL/2026-2027/0701` => TRUE
 * - `BJCL/2026-2027/0760` vs `BJCL/2026-2027/0760(PTF)` => TRUE
 */
export function arePoNumbersExactMatch(a: unknown, b: unknown): boolean {
  const ca = normalizePoCanonical(a);
  const cb = normalizePoCanonical(b);
  if (!ca || !cb) return false;
  return ca === cb;
}

/**
 * Extracts all explicit PO identifier fields from a PO / Sauda / Arrival / Inspection record.
 */
export function getRecordPoIdentifiers(record: any): string[] {
  if (!record || typeof record !== 'object') return [];
  const rawFields = [
    record.po_no,
    record.mill_po_no,
    record.contract_po_no,
    record.ptf_no,
    record.sauda_no,
    record.po_contract,
    record.new_po_no,
    record.return_po_no,
  ];
  const result: string[] = [];
  for (const val of rawFields) {
    const canon = normalizePoCanonical(val);
    if (canon && !result.includes(canon)) {
      result.push(canon);
    }
  }
  return result;
}

/**
 * Authoritative exact PO lookup in a PO list.
 * Replaces all legacy `.includes()` / suffix-matching `findMatchingPo` helpers.
 * Matches ONLY on exact canonical PO equality — NEVER falls back to substring, prefix, suffix, or first/last item.
 */
export function findExactMatchingPo<T extends Record<string, any>>(
  targetPoNo: unknown,
  poArray: T[] = []
): T | undefined {
  const targetExact = normalizePoExact(targetPoNo);
  const targetCanon = normalizePoCanonical(targetPoNo);
  if (!targetCanon || !Array.isArray(poArray) || poArray.length === 0) return undefined;

  // Pass 1: exact normalized string match on primary po_no (preserves PTF distinction if both exist)
  const exactPrimary = poArray.find((p) => {
    if (!p) return false;
    return normalizePoExact(p.po_no) === targetExact;
  });
  if (exactPrimary) return exactPrimary;

  // Pass 2: exact canonical match on primary po_no
  const canonPrimary = poArray.find((p) => {
    if (!p) return false;
    return normalizePoCanonical(p.po_no) === targetCanon;
  });
  if (canonPrimary) return canonPrimary;

  // Pass 3: exact canonical match on secondary explicit contract identifiers
  return poArray.find((p) => {
    if (!p) return false;
    const secondary = [p.new_po_no, p.ptf_no, p.contract_po_no, p.sauda_no, p.po_contract];
    return secondary.some((field) => normalizePoCanonical(field) === targetCanon);
  });
}

// ============================================================================
// LAYER 1 — AUTHORITATIVE CONTRACTUAL RELATIONSHIP
// ============================================================================

export interface MrContractualRelationship {
  mrNo: string;
  canonicalMrKey: string;
  authoritativePoNo: string;
  authoritativePoCanonical: string;
  poSource: 'material_inspection' | 'final_arrival' | 'return_lorry' | 'fallback' | 'none';
  finalArrivalPoNo: string;
  millInspectionPoNo: string;
  hasDataIntegrityConflict: boolean;
  conflictReason: string | null;
  matchedPoRecord: any | null;
  matchedSaudaRecord: any | null;
  finalArrivalRecord: any | null;
  millInspectionRecord: any | null;
}

/**
 * Resolves the authoritative PO for an MR strictly from persisted relational links.
 * Detects and flags cross-module MR-to-PO conflicts (e.g., `final_arrival.po_no` !== `material_inspection.po_no`)
 * without ever substituting an unrelated PO or silently mutating historical records.
 */
export function resolveMrContractualRelationship(params: {
  mrNo: string;
  finalArrivals?: any[];
  millInspections?: any[];
  purchaseOrders?: any[];
  saudaCheckPoints?: any[];
  returnLorries?: any[];
  explicitRecord?: any;
}): MrContractualRelationship {
  const mrNo = normalizeFinalMrNo(params.mrNo);
  const canonicalMrKey = getCanonicalMrCompareKey(mrNo);

  const empty: MrContractualRelationship = {
    mrNo,
    canonicalMrKey,
    authoritativePoNo: '',
    authoritativePoCanonical: '',
    poSource: 'none',
    finalArrivalPoNo: '',
    millInspectionPoNo: '',
    hasDataIntegrityConflict: false,
    conflictReason: null,
    matchedPoRecord: null,
    matchedSaudaRecord: null,
    finalArrivalRecord: null,
    millInspectionRecord: null,
  };

  if (!mrNo) return empty;

  const finalArrivalRecord =
    (params.finalArrivals || []).find((fa) => areMrNumbersEqual(extractFinalArrivalMrNo(fa), mrNo)) ||
    null;

  const millInspectionRecord =
    (params.millInspections || []).find((mi) => areMrNumbersEqual(extractInspectionMrNo(mi), mrNo)) ||
    null;

  const returnLorryRecord =
    (params.returnLorries || []).find((rl) => areMrNumbersEqual(extractRecordMrNo(rl), mrNo)) ||
    null;

  const finalArrivalPoNo = normalizePoExact(
    finalArrivalRecord?.po_no || finalArrivalRecord?.mill_po_no || finalArrivalRecord?.contract_po_no
  );
  const millInspectionPoNo = normalizePoExact(
    millInspectionRecord?.po_no || millInspectionRecord?.mill_po_no || millInspectionRecord?.contract_po_no
  );
  const returnLorryPoNo = normalizePoExact(
    returnLorryRecord?.return_po_no || returnLorryRecord?.po_no
  );
  const explicitPoNo = normalizePoExact(
    params.explicitRecord?.po_no || params.explicitRecord?.mill_po_no
  );

  let hasDataIntegrityConflict = false;
  let conflictReason: string | null = null;

  if (finalArrivalPoNo && millInspectionPoNo && !arePoNumbersExactMatch(finalArrivalPoNo, millInspectionPoNo)) {
    hasDataIntegrityConflict = true;
    conflictReason = `Data Integrity Conflict: MR ${mrNo} is linked to P.O ${finalArrivalPoNo} in Final Arrival but P.O ${millInspectionPoNo} in Mill Inspection. Please audit before transacting.`;
  }

  // Authoritative precedence:
  // 1. Mill Inspection (verified quality & MR linkage)
  // 2. Final Arrival (authoritative Final MR conversion)
  // 3. Return Lorry
  // 4. Explicit passed record
  let authoritativePoNo = '';
  let poSource: MrContractualRelationship['poSource'] = 'none';

  if (millInspectionPoNo) {
    authoritativePoNo = millInspectionPoNo;
    poSource = 'material_inspection';
  } else if (finalArrivalPoNo) {
    authoritativePoNo = finalArrivalPoNo;
    poSource = 'final_arrival';
  } else if (returnLorryPoNo) {
    authoritativePoNo = returnLorryPoNo;
    poSource = 'return_lorry';
  } else if (explicitPoNo) {
    authoritativePoNo = explicitPoNo;
    poSource = 'fallback';
  }

  const authoritativePoCanonical = normalizePoCanonical(authoritativePoNo);
  const matchedPoRecord = authoritativePoNo
    ? findExactMatchingPo(authoritativePoNo, params.purchaseOrders || []) || null
    : null;
  const matchedSaudaRecord = authoritativePoNo
    ? findExactMatchingPo(authoritativePoNo, params.saudaCheckPoints || []) || null
    : null;

  return {
    mrNo,
    canonicalMrKey,
    authoritativePoNo,
    authoritativePoCanonical,
    poSource,
    finalArrivalPoNo,
    millInspectionPoNo,
    hasDataIntegrityConflict,
    conflictReason,
    matchedPoRecord,
    matchedSaudaRecord,
    finalArrivalRecord,
    millInspectionRecord,
  };
}

// ============================================================================
// LAYER 2 — MR-LEVEL MATERIAL VALIDATION
// ============================================================================

export interface MrMaterialMismatchEvaluation {
  poNo: string;
  mrNo: string;
  hasMismatch: boolean;
  isResolved: boolean;
  isUnresolved: boolean;
  status: 'none' | 'pending' | 'resolved';
  mismatchId: string;
  mismatchReasons: string[];
  resolvedBy?: string;
  resolvedAt?: string;
}

/**
 * Extracts MR number bound to a `material_mismatch` DB row (if MR-specific).
 */
export function extractMismatchRowMrNo(row: any): string {
  if (!row || typeof row !== 'object') return '';
  const directCandidates = [row.mr_no, row.arrival_no, row.inspection_no];
  for (const c of directCandidates) {
    const norm = normalizeFinalMrNo(c);
    if (norm) return norm;
  }
  const compositeFields = [row.mismatch_id, row.inspection_no, row.arrival_no];
  for (const f of compositeFields) {
    const m = String(f || '').match(/\b(MR[-_\s/]*0*[1-9]\d*[A-Z]*)\b/i);
    if (m) {
      const norm = normalizeFinalMrNo(m[1]);
      if (norm) return norm;
    }
  }
  return '';
}

/**
 * Evaluates Material Mismatch status STRICTLY at individual MR level (poNo + mrNo).
 * - Other valid MRs on the same PO remain completely unaffected.
 * - Checks persisted `material_mismatch` DB rows (exact PO + exact MR first, then legacy PO-level row if not bound to another MR).
 * - Also evaluates live `compareSaudaMillInspection` (Name-only rule) when Sauda Check Point + Mill Inspection data are provided.
 */
export function evaluateMrMaterialMismatchStatus(params: {
  poNo: string;
  mrNo: string;
  materialMismatches?: any[];
  saudaCheckPoint?: any | null;
  saudaDetails?: any[];
  millInspection?: any | null;
  millInspectionDetails?: any[];
  allPoMillInspections?: any[];
  knownCodes?: PoMatchKnownCodes;
}): MrMaterialMismatchEvaluation {
  const poNo = normalizePoExact(params.poNo);
  const mrNo = normalizeFinalMrNo(params.mrNo);
  const mismatchId = poNo && mrNo ? `MIS-${poNo}-${mrNo}` : '';

  if (!poNo || !mrNo) {
    return {
      poNo,
      mrNo,
      hasMismatch: false,
      isResolved: false,
      isUnresolved: false,
      status: 'none',
      mismatchId,
      mismatchReasons: [],
    };
  }

  const dbRows = Array.isArray(params.materialMismatches) ? params.materialMismatches : [];

  // 1. Exact MR-specific DB row for this (poNo, mrNo)
  const mrSpecificDbRows = dbRows.filter((row) => {
    if (!row) return false;
    const rowPo = row.po_no;
    if (!arePoNumbersExactMatch(rowPo, poNo)) return false;
    const rowMr = extractMismatchRowMrNo(row);
    return Boolean(rowMr && areMrNumbersEqual(rowMr, mrNo));
  });

  // 2. Legacy PO-level DB rows (ONLY rows that are NOT bound to a different MR)
  const legacyPoDbRows = dbRows.filter((row) => {
    if (!row) return false;
    if (!arePoNumbersExactMatch(row.po_no, poNo)) return false;
    const rowMr = extractMismatchRowMrNo(row);
    return !rowMr;
  });

  const mrApprovedRow = mrSpecificDbRows.find((r) => isMaterialMismatchApproved(r));
  const mrPendingRow = mrSpecificDbRows.find((r) => !isMaterialMismatchApproved(r));
  const legacyApprovedRow = legacyPoDbRows.find((r) => isMaterialMismatchApproved(r));
  const legacyPendingRow = legacyPoDbRows.find((r) => !isMaterialMismatchApproved(r));

  // 3. Live Name-only comparison (Mill Inspection MR vs Sauda Check Point)
  let liveMismatchReasons: string[] = [];
  if (params.saudaCheckPoint && params.millInspection) {
    try {
      const cmp = compareSaudaMillInspection(
        params.saudaCheckPoint,
        params.saudaDetails || [],
        params.millInspection,
        params.millInspectionDetails || [],
        params.allPoMillInspections || [params.millInspection],
        params.knownCodes
      );
      if (cmp.hasInspection && cmp.status === 'mismatch' && cmp.mismatches.length > 0) {
        liveMismatchReasons = cmp.mismatches.map((m) => m.mismatchLabel || `${m.field} mismatch`);
      }
    } catch {
      liveMismatchReasons = [];
    }
  }

  const dbReasons = (mrPendingRow || mrApprovedRow || legacyPendingRow || legacyApprovedRow)
    ? String(
        (mrPendingRow || mrApprovedRow || legacyPendingRow || legacyApprovedRow)?.mismatched_fields ||
          (mrPendingRow || mrApprovedRow || legacyPendingRow || legacyApprovedRow)?.field ||
          ''
      )
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const combinedReasons = liveMismatchReasons.length > 0 ? liveMismatchReasons : dbReasons;

  // Resolution precedence:
  // 1. Explicit MR-specific approval always resolves THIS MR
  if (mrApprovedRow) {
    return {
      poNo,
      mrNo,
      hasMismatch: true,
      isResolved: true,
      isUnresolved: false,
      status: 'resolved',
      mismatchId: String(mrApprovedRow.mismatch_id || mismatchId),
      mismatchReasons: combinedReasons,
      resolvedBy: mrApprovedRow.approved_by || undefined,
      resolvedAt: mrApprovedRow.approved_at ? String(mrApprovedRow.approved_at).split('T')[0] : undefined,
    };
  }

  // 2. Explicit MR-specific pending row always blocks THIS MR (even if PO has mismatch_cleared from another MR)
  if (mrPendingRow) {
    return {
      poNo,
      mrNo,
      hasMismatch: true,
      isResolved: false,
      isUnresolved: true,
      status: 'pending',
      mismatchId: String(mrPendingRow.mismatch_id || mismatchId),
      mismatchReasons: combinedReasons.length > 0 ? combinedReasons : ['Unresolved Material Mismatch'],
    };
  }

  // 3. Live detected mismatch on this specific MR
  if (liveMismatchReasons.length > 0) {
    // Check if cleared by legacy PO-level approval or explicit PO-level mismatch_cleared flag
    // (Only if no other MR-specific pending row exists on this PO)
    const poLevelCleared = Boolean(
      legacyApprovedRow || params.saudaCheckPoint?.mismatch_cleared === true
    );
    if (poLevelCleared) {
      return {
        poNo,
        mrNo,
        hasMismatch: true,
        isResolved: true,
        isUnresolved: false,
        status: 'resolved',
        mismatchId: String(legacyApprovedRow?.mismatch_id || mismatchId),
        mismatchReasons: liveMismatchReasons,
        resolvedBy: legacyApprovedRow?.approved_by || params.saudaCheckPoint?.approved_by || undefined,
        resolvedAt:
          (legacyApprovedRow?.approved_at && String(legacyApprovedRow.approved_at).split('T')[0]) ||
          (params.saudaCheckPoint?.approved_at && String(params.saudaCheckPoint.approved_at).split('T')[0]) ||
          undefined,
      };
    }

    return {
      poNo,
      mrNo,
      hasMismatch: true,
      isResolved: false,
      isUnresolved: true,
      status: 'pending',
      mismatchId,
      mismatchReasons: liveMismatchReasons,
    };
  }

  // 4. Legacy PO-level pending row with no live clean confirmation
  if (legacyPendingRow && !legacyApprovedRow && !params.millInspection) {
    return {
      poNo,
      mrNo,
      hasMismatch: true,
      isResolved: false,
      isUnresolved: true,
      status: 'pending',
      mismatchId: String(legacyPendingRow.mismatch_id || mismatchId),
      mismatchReasons: dbReasons.length > 0 ? dbReasons : ['Unresolved Material Mismatch'],
    };
  }

  return {
    poNo,
    mrNo,
    hasMismatch: false,
    isResolved: false,
    isUnresolved: false,
    status: 'none',
    mismatchId,
    mismatchReasons: [],
  };
}

// ============================================================================
// LAYER 3 — PAYMENT ELIGIBILITY
// ============================================================================

export type FinancialStatusBadge =
  | 'Verified MR'
  | 'Original PO Linked'
  | 'Material Mismatch'
  | 'Payment Eligible'
  | 'Payment Blocked'
  | 'Settlement Eligible'
  | 'Settlement Blocked'
  | 'Data Integrity Conflict'
  | 'Already Paid'
  | 'Already Settled';

export interface MrPaymentEligibilityResult {
  eligible: boolean;
  poNo: string;
  mrNo: string;
  isMismatchBlocked: boolean;
  isConflictBlocked: boolean;
  isDuplicatePaid: boolean;
  isOriginalPoMissingFromEligible: boolean;
  blockReason: string | null;
  badges: FinancialStatusBadge[];
  mismatchEvaluation: MrMaterialMismatchEvaluation;
}

export function evaluateMrPaymentEligibility(params: {
  poNo: string;
  mrNo: string;
  relationship?: MrContractualRelationship | null;
  mismatchEvaluation: MrMaterialMismatchEvaluation;
  isAlreadyPaid: boolean;
  paidVoucherNo?: string;
  isOriginalPoInEligibleList: boolean;
}): MrPaymentEligibilityResult {
  const poNo = normalizePoExact(params.poNo);
  const mrNo = normalizeFinalMrNo(params.mrNo);
  const badges: FinancialStatusBadge[] = [];

  if (mrNo) badges.push('Verified MR');
  if (poNo) badges.push('Original PO Linked');

  if (params.relationship?.hasDataIntegrityConflict) {
    badges.push('Data Integrity Conflict', 'Payment Blocked');
    return {
      eligible: false,
      poNo,
      mrNo,
      isMismatchBlocked: false,
      isConflictBlocked: true,
      isDuplicatePaid: params.isAlreadyPaid,
      isOriginalPoMissingFromEligible: !params.isOriginalPoInEligibleList,
      blockReason: params.relationship.conflictReason || 'MR-to-PO Data Integrity Conflict detected.',
      badges,
      mismatchEvaluation: params.mismatchEvaluation,
    };
  }

  if (params.mismatchEvaluation.isUnresolved) {
    badges.push('Material Mismatch', 'Payment Blocked');
    return {
      eligible: false,
      poNo,
      mrNo,
      isMismatchBlocked: true,
      isConflictBlocked: false,
      isDuplicatePaid: params.isAlreadyPaid,
      isOriginalPoMissingFromEligible: !params.isOriginalPoInEligibleList,
      blockReason: MATERIAL_MISMATCH_BLOCK_MESSAGE,
      badges,
      mismatchEvaluation: params.mismatchEvaluation,
    };
  }

  if (params.isAlreadyPaid) {
    badges.push('Already Paid', 'Payment Blocked');
    return {
      eligible: false,
      poNo,
      mrNo,
      isMismatchBlocked: false,
      isConflictBlocked: false,
      isDuplicatePaid: true,
      isOriginalPoMissingFromEligible: !params.isOriginalPoInEligibleList,
      blockReason: `Duplicate Payment Blocked: Payment has already been processed for MR ${mrNo}${params.paidVoucherNo ? ` (Voucher: ${params.paidVoucherNo})` : ''}.`,
      badges,
      mismatchEvaluation: params.mismatchEvaluation,
    };
  }

  badges.push('Payment Eligible');
  return {
    eligible: true,
    poNo,
    mrNo,
    isMismatchBlocked: false,
    isConflictBlocked: false,
    isDuplicatePaid: false,
    isOriginalPoMissingFromEligible: !params.isOriginalPoInEligibleList,
    blockReason: null,
    badges,
    mismatchEvaluation: params.mismatchEvaluation,
  };
}

// ============================================================================
// LAYER 4 — SETTLEMENT ELIGIBILITY & CONTRACT CLOSURE VALIDATION
// ============================================================================

export interface PoSettlementClosureEligibility {
  poNo: string;
  canClosePo: boolean;
  totalContractLorries: number;
  linkedMrCount: number;
  settledMrCount: number;
  unsettledMrs: string[];
  unresolvedMismatchMrs: MrMaterialMismatchEvaluation[];
  closureBlockedReason: string | null;
}

/**
 * Determines whether a PO contract may transition to final `'settled'` / `pending: false` status.
 * Prevents premature contract closure when:
 *   1. Other linked MRs on this PO are not yet settled, OR
 *   2. Contracted lorry count exceeds total settled MRs, OR
 *   3. Any MR on this PO still has an unresolved Material Mismatch.
 */
export function evaluatePoSettlementClosureEligibility(params: {
  poNo: string;
  poRecord?: any | null;
  linkedMrNos: string[];
  alreadySettledMrNos: string[];
  currentlySettlingMrNo?: string;
  mrMismatchEvaluations?: MrMaterialMismatchEvaluation[];
}): PoSettlementClosureEligibility {
  const poNo = normalizePoExact(params.poNo);
  const settledKeys = new Set<string>();

  for (const mr of params.alreadySettledMrNos || []) {
    const k = getCanonicalMrCompareKey(mr);
    if (k) settledKeys.add(k);
  }
  if (params.currentlySettlingMrNo) {
    const k = getCanonicalMrCompareKey(params.currentlySettlingMrNo);
    if (k) settledKeys.add(k);
  }

  const uniqueLinkedMrs: string[] = [];
  const linkedKeys = new Set<string>();
  for (const mr of params.linkedMrNos || []) {
    const norm = normalizeFinalMrNo(mr);
    const k = getCanonicalMrCompareKey(norm);
    if (norm && k && !linkedKeys.has(k)) {
      linkedKeys.add(k);
      uniqueLinkedMrs.push(norm);
    }
  }
  if (params.currentlySettlingMrNo) {
    const norm = normalizeFinalMrNo(params.currentlySettlingMrNo);
    const k = getCanonicalMrCompareKey(norm);
    if (norm && k && !linkedKeys.has(k)) {
      linkedKeys.add(k);
      uniqueLinkedMrs.push(norm);
    }
  }

  const unsettledMrs = uniqueLinkedMrs.filter((mr) => !settledKeys.has(getCanonicalMrCompareKey(mr)));
  const unresolvedMismatchMrs = (params.mrMismatchEvaluations || []).filter((e) => e.isUnresolved);

  const rawContractLorries = Number(
    params.poRecord?.total_lorries ??
      params.poRecord?.no_of_lorries ??
      params.poRecord?.lorry_count ??
      0
  );
  const totalContractLorries =
    Number.isFinite(rawContractLorries) && rawContractLorries > 0
      ? Math.max(rawContractLorries, uniqueLinkedMrs.length)
      : uniqueLinkedMrs.length;

  const settledMrCount = settledKeys.size;
  const reasons: string[] = [];

  if (unresolvedMismatchMrs.length > 0) {
    reasons.push(
      `${unresolvedMismatchMrs.length} MR(s) have unresolved Material Mismatch (${unresolvedMismatchMrs
        .map((m) => m.mrNo)
        .join(', ')})`
    );
  }
  if (unsettledMrs.length > 0) {
    reasons.push(`${unsettledMrs.length} linked MR(s) remain unsettled (${unsettledMrs.join(', ')})`);
  }
  if (totalContractLorries > 0 && settledMrCount < totalContractLorries) {
    reasons.push(
      `Only ${settledMrCount} of ${totalContractLorries} contracted lorry/MR deliveries are settled`
    );
  }

  return {
    poNo,
    canClosePo: reasons.length === 0 && settledMrCount > 0,
    totalContractLorries,
    linkedMrCount: uniqueLinkedMrs.length,
    settledMrCount,
    unsettledMrs,
    unresolvedMismatchMrs,
    closureBlockedReason: reasons.length > 0 ? reasons.join('; ') : null,
  };
}

// ============================================================================
// LAYER 5 — FINANCIAL CONSISTENCY HELPERS (DEDUPED PAYMENTS PER MR & PO)
// ============================================================================

/**
 * Deduplicates payment vouchers for a given MR and strictly scopes them to the authoritative PO.
 * Excludes cancelled/rejected/reversed payments and detects payments recorded under a conflicting PO.
 */
export function filterAndDeduplicatePaymentsForMr(params: {
  payments: any[];
  mrNo: string;
  authoritativePoNo?: string;
}): {
  validPayments: any[];
  conflictingPoPayments: any[];
  totalPaidAmount: number;
} {
  const targetMr = normalizeFinalMrNo(params.mrNo);
  const targetPo = normalizePoCanonical(params.authoritativePoNo);
  if (!targetMr || !Array.isArray(params.payments)) {
    return { validPayments: [], conflictingPoPayments: [], totalPaidAmount: 0 };
  }

  const seenVoucherKeys = new Set<string>();
  const validPayments: any[] = [];
  const conflictingPoPayments: any[] = [];

  for (const p of params.payments) {
    if (!p) continue;
    const status = String(p.status || '').toLowerCase().trim();
    if (status === 'cancelled' || status === 'rejected' || status === 'reversed' || status === 'deleted') {
      continue;
    }

    const pMr = extractRecordMrNo(p);
    if (!pMr || !areMrNumbersEqual(pMr, targetMr)) continue;

    // Deduplicate by payment_id or voucher_no so an advance/payment is never counted twice
    const dedupKey = String(
      p.payment_id ||
        p.voucher_no ||
        `${pMr}|${normalizePoCanonical(p.po_no)}|${p.payment_date || ''}|${Number(p.paid_amount ?? p.pay_amount ?? 0)}`
    )
      .trim()
      .toUpperCase();

    if (seenVoucherKeys.has(dedupKey)) continue;
    seenVoucherKeys.add(dedupKey);

    const pPo = normalizePoCanonical(p.po_no);
    if (targetPo && pPo && !arePoNumbersExactMatch(pPo, targetPo)) {
      conflictingPoPayments.push(p);
      continue;
    }

    validPayments.push(p);
  }

  const totalPaidAmount = Number(
    validPayments
      .reduce((sum, p) => {
        const amt = Number(p.paid_amount ?? p.pay_amount ?? p.net_payable ?? 0);
        return sum + (Number.isFinite(amt) && amt > 0 ? amt : 0);
      }, 0)
      .toFixed(2)
  );

  return { validPayments, conflictingPoPayments, totalPaidAmount };
}

// ============================================================================
// LAYER 6 — DEEP-LINK NAVIGATION (PAYMENT / SETTLEMENT <-> MATERIAL MISMATCH)
// ============================================================================

export function navigateToMaterialMismatchRecord(params: {
  poNo: string;
  mrNo: string;
  returnPage: 'payment' | 'mr_settlement';
  mismatchId?: string;
}): void {
  const payload: MaterialMismatchNavigationTarget = {
    poNo: normalizePoExact(params.poNo),
    mrNo: normalizeFinalMrNo(params.mrNo),
    returnPage: params.returnPage,
    returnLabel: params.returnPage === 'payment' ? 'Return to Payment Operation' : 'Return to MR Settlement',
    mismatchId: params.mismatchId,
    timestamp: Date.now(),
  };

  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(MISMATCH_NAV_STORAGE_KEY, JSON.stringify(payload));
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(NAV_TO_MATERIAL_MISMATCH_EVENT, { detail: payload }));
    }
  } catch {
    // Ignore storage quota / SSR errors
  }
}

export function peekMaterialMismatchNavigationTarget(): MaterialMismatchNavigationTarget | null {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return null;
    const raw = window.sessionStorage.getItem(MISMATCH_NAV_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    // Expire stale navigation targets older than 30 minutes
    if (parsed.timestamp && Date.now() - Number(parsed.timestamp) > 30 * 60 * 1000) {
      window.sessionStorage.removeItem(MISMATCH_NAV_STORAGE_KEY);
      return null;
    }
    return parsed as MaterialMismatchNavigationTarget;
  } catch {
    return null;
  }
}

export function clearMaterialMismatchNavigationTarget(): void {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(MISMATCH_NAV_STORAGE_KEY);
    }
  } catch {
    // Ignore
  }
}

export function returnFromMaterialMismatch(target: MaterialMismatchNavigationTarget | null): void {
  if (!target) return;
  clearMaterialMismatchNavigationTarget();
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(RETURN_FROM_MATERIAL_MISMATCH_EVENT, { detail: target }));
    }
  } catch {
    // Ignore
  }
}
