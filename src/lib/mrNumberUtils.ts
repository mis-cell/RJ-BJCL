/**
 * Canonical Final M.R. Number Utilities
 *
 * Lifecycle Rule:
 * 1. Temporary Arrival (`temporary_material_received`) generates `temporary_arrival_no` (e.g. `AR01288`).
 * 2. Final Arrival (`final_arrival`) converts `temporary_arrival_no` (`AR...`) into the authoritative
 *    Final M.R. Number stored in `final_arrival.final_arrival_no` (always starting with `MR`, e.g. `MR01288`).
 * 3. Mill Inspection (`material_inspection`) stores this exact Final M.R. Number in `material_inspection.mr_no`.
 * 4. Every downstream module (Mill Inspection, Payment Operation, Short/Excess Deduction,
 *    Sauda Check Point Histogram, Settlement, Club PO/MR, Reports, Dashboard) MUST use ONLY
 *    this Final M.R. Number (`MR...`) — never `AR...` / `temporary_arrival_no`.
 */

const INVALID_MR_TOKENS = new Set([
  '',
  'MR',
  'MR0',
  'AR',
  'AR0',
  'DIRECT REGISTER',
  'DIRECT',
  'NA',
  'N/A',
  'NONE',
  'NIL',
  '-',
  '--',
  'NULL',
  'UNDEFINED',
]);

/**
 * Strips whitespace and leading `#` markers from an identifier.
 */
export function cleanMrToken(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).trim().replace(/^#+/, '').trim();
}

/**
 * Returns true ONLY when the value is a genuine Final M.R. Number (starts with `MR`
 * followed by at least one non-zero digit, excluding `AR...`, `MRRC-...`, `INSP-...`,
 * `CERT-...`, `TEST-...`, `SETTLEMENT-...`, or blank/placeholder tokens).
 */
export function isValidFinalMrNo(val: unknown): boolean {
  const cleaned = cleanMrToken(val);
  if (!cleaned) return false;

  const upper = cleaned.toUpperCase();
  if (INVALID_MR_TOKENS.has(upper)) return false;
  if (
    upper.startsWith('AR') ||
    upper.startsWith('MRRC') ||
    upper.startsWith('INSP') ||
    upper.startsWith('CERT') ||
    upper.startsWith('TEST') ||
    upper.startsWith('SETTLEMENT')
  ) {
    return false;
  }

  // Must start with MR followed by optional separator and digits (with at least one non-zero digit)
  if (!/^MR[-_\s/]*\d[\w/-]*$/i.test(upper)) {
    return false;
  }
  return /[1-9]/.test(upper);
}

/**
 * Returns normalized uppercase Final M.R. Number if valid, otherwise `''`.
 */
export function normalizeFinalMrNo(val: unknown): string {
  if (!isValidFinalMrNo(val)) return '';
  return cleanMrToken(val).toUpperCase();
}

/**
 * Authoritative M.R. Number extractor for `final_arrival` table rows.
 * Reads `final_arrival_no` FIRST, then `arrival_no`, then `mr_no` — strictly requiring valid `MR...`.
 * Guarantees corrupted legacy rows (where `final_arrival.mr_no` holds `AR...` or `NULL`)
 * always resolve cleanly to `final_arrival.final_arrival_no`.
 */
export function extractFinalArrivalMrNo(row: any): string {
  if (!row || typeof row !== 'object') return '';
  const candidates = [row.final_arrival_no, row.arrival_no, row.mr_no];
  for (const c of candidates) {
    if (isValidFinalMrNo(c)) {
      return cleanMrToken(c).toUpperCase();
    }
  }
  return '';
}

/**
 * Authoritative M.R. Number extractor for `material_inspection` / `mill_inspection_master` rows.
 * Reads `mr_no` FIRST, then `final_arrival_no`, then `arrival_no` — strictly requiring valid `MR...`.
 */
export function extractInspectionMrNo(row: any): string {
  if (!row || typeof row !== 'object') return '';
  const candidates = [row.mr_no, row.final_arrival_no, row.arrival_no];
  for (const c of candidates) {
    if (isValidFinalMrNo(c)) {
      return cleanMrToken(c).toUpperCase();
    }
  }
  return '';
}

/**
 * Authoritative M.R. Number extractor for mixed/combined rows (arrivals, inspections,
 * payments, settlements, reports).
 * Checks `final_arrival_no` first (immune to legacy `final_arrival.mr_no = 'AR...'`),
 * then `mr_no`, then `arrival_no` — strictly returning valid `MR...` or `''`.
 */
export function extractRecordMrNo(row: any): string {
  if (!row) return '';
  if (typeof row === 'string' || typeof row === 'number') {
    return normalizeFinalMrNo(row);
  }
  const candidates = [row.final_arrival_no, row.mr_no, row.arrival_no];
  for (const c of candidates) {
    if (isValidFinalMrNo(c)) {
      return cleanMrToken(c).toUpperCase();
    }
  }
  return '';
}

/**
 * Returns a canonical numeric-core comparison key for valid Final M.R. Numbers
 * (e.g., `MR01288` and `MR001288` both normalize to `MR1288`).
 * Returns `''` for invalid or `AR...` inputs so temporary numbers never match MRs.
 */
export function getCanonicalMrCompareKey(val: unknown): string {
  const norm = normalizeFinalMrNo(val);
  if (!norm) return '';
  const match = norm.match(/^MR[-_\s/]*0*([1-9]\d*)([A-Z]*)$/);
  if (match) {
    return `MR${match[1]}${match[2] || ''}`;
  }
  return norm.replace(/[-_\s/]+/g, '');
}

/**
 * Compares two M.R. numbers strictly (only valid `MR...` values can match).
 * Handles zero-padding differences such as `MR01288` vs `MR001288`.
 */
export function areMrNumbersEqual(a: unknown, b: unknown): boolean {
  const keyA = getCanonicalMrCompareKey(a);
  const keyB = getCanonicalMrCompareKey(b);
  if (!keyA || !keyB) return false;
  return keyA === keyB;
}

/**
 * Converts a Temporary Arrival No (`AR01288`) into its Final Arrival M.R. No (`MR01288`).
 * If already a valid `MR...` number, returns it normalized.
 */
export function convertTempArrivalToFinalMrNo(tempArrivalNo: unknown): string {
  const cleaned = cleanMrToken(tempArrivalNo).toUpperCase();
  if (!cleaned) return '';
  if (isValidFinalMrNo(cleaned)) return cleaned;
  if (/^AR[-_\s/]*\d+/i.test(cleaned)) {
    const converted = cleaned.replace(/^AR/i, 'MR');
    return isValidFinalMrNo(converted) ? converted : '';
  }
  return '';
}
