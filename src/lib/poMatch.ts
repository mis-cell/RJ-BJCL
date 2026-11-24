import { calculateWeightTolerance } from './weightTolerance';

// Material Mismatch Comparison Engine:
// Sauda Check Point  ↔  Temporary Arrival (temporary_material_received)
//
// The 7 Comparison Fields & Matching Rules:
//   1. Broker           ↔ Broker           (Exact Match)
//   2. Supplier         ↔ Supplier         (Exact Match)
//   3. Challan Supplier ↔ Challan Supplier (Exact Match)
//   4. Area             ↔ Arrival Area     (Exact Match)
//   5. Grade            ↔ Challan Grade    (Multiple-Value Match - Sauda is approved set)
//   6. Agency           ↔ Agency           (Multiple-Value Match - Sauda is approved set)
//   7. Marka            ↔ Challan Marka    (Multiple-Value Match - Sauda is approved set)

export interface FieldMismatch {
  field: string;           // "Broker" | "Supplier" | "Challan Supplier" | "Area" | "Grade" | "Agency" | "Marka" | "Total Contract (M.Ton)" | "Rate / M.T"
  mismatchLabel: string;   // e.g. "Grade Mismatch: TD7 not approved"
  poValue: string;         // Approved / Sauda Check Point value(s)
  inspValue: string;       // Arrival value(s)
  unapprovedValues?: string[]; // Specific unapproved values for multi-value fields
}

export type PoMismatchDetail = FieldMismatch;

export type MatchSeverity = 'match' | 'mismatch';

export interface LorryProgress {
  totalLorries: number;
  receivedLorries: number;
  remainingLorries: number;
}

export interface PoMatchResult {
  poNo: string;
  hasInspection: boolean;   // false = no matching Temporary Arrival / Inspection found yet
  status: MatchSeverity;    // 'match' (Pass / No Material Mismatch) or 'mismatch' (Material Mismatch)
  mismatches: FieldMismatch[];
  lorryProgress?: LorryProgress;
  totalContractMt?: number;
  totalReceivedMt?: number;
}

export interface PoMatchMasterMaps {
  gradeCodeToName?: Record<string, string>;
  agencyCodeToName?: Record<string, string>;
  markaCodeToName?: Record<string, string>;
  areaCodeToName?: Record<string, string>;
  brokerCodeToName?: Record<string, string>;
  supplierCodeToName?: Record<string, string>;
}

// One-way Code -> Name fallback dictionaries (NEVER Name -> Code)
const GRADE_CODE_TO_NAME: Record<string, string> = {
  '831': 'TD5',
  '832': 'TD6',
  '833': 'TD7',
  '834': 'TD8',
  '835': 'W5',
  '836': 'W6',
  '837': 'W7',
  '838': 'W8',
  '839': 'M5',
  '840': 'M6',
  '841': 'M7',
  '842': 'M8',
  '843': 'B.TOW',
};

const AGENCY_CODE_TO_NAME: Record<string, string> = {
  '1': 'KOLKATA',
  '2': 'CALLY',
  '3': 'TALLY',
  '4': 'ASSAM',
  '5': 'DHUBRI',
  '6': 'GAUHATI',
  '7': 'KISHANGANJ',
  '8': 'SILIGURI',
  '22': 'PURNIA',
  '30': 'DAISEE',
  '64': 'KARIMPUR',
  '78': 'NABADWIP',
};

const AREA_CODE_TO_NAME: Record<string, string> = {
  '10': 'BIHAR',
  '15': 'ASSAM',
  '12': 'WEST BENGAL',
  '22': 'PURNIA',
  '30': 'DAISEE',
  '64': 'KARIMPUR',
  '78': 'NABADWIP',
  '6': 'GAUHATI',
  '7': 'KISHANGANJ',
  '8': 'SILIGURI',
};

function isPureNumericCode(v: string): boolean {
  return /^\d+$/.test(v.trim());
}

function lookupCodeToName(
  val: any,
  primaryMap?: Record<string, string>,
  fallbackMap?: Record<string, string>
): string {
  if (val === null || val === undefined) return '';
  const raw = String(val).trim();
  if (!raw) return '';
  const upper = raw.toUpperCase();
  const clean = cleanStr(raw);
  const noZero = isPureNumericCode(clean) ? clean.replace(/^0+/, '') : '';

  const checkMap = (m?: Record<string, string>): string | undefined => {
    if (!m) return undefined;
    if (m[upper]) return m[upper];
    if (m[clean]) return m[clean];
    if (noZero && m[noZero]) return m[noZero];
    return undefined;
  };

  const resolved = checkMap(primaryMap) || checkMap(fallbackMap);
  if (resolved && !isPureNumericCode(resolved)) {
    return resolved.trim().toUpperCase();
  }
  return upper;
}

function registerCodeToName(
  map: Record<string, string>,
  codeVal: any,
  nameVal: any
): void {
  if (codeVal === null || codeVal === undefined || nameVal === null || nameVal === undefined) return;
  const cStr = String(codeVal).trim().toUpperCase();
  const nStr = String(nameVal).trim().toUpperCase();
  if (!cStr || !nStr || cStr === nStr || isPureNumericCode(nStr)) return;
  map[cStr] = nStr;
  const cClean = cleanStr(cStr);
  if (cClean) {
    map[cClean] = nStr;
    if (isPureNumericCode(cClean)) {
      const stripped = cClean.replace(/^0+/, '');
      if (stripped) map[stripped] = nStr;
    }
  }
}

function resolveNameList(
  nameInputs: any[],
  codeInputs: any[],
  primaryMap?: Record<string, string>,
  fallbackMap?: Record<string, string>
): string[] {
  const resolvedFromNames: string[] = [];
  const rawNameTokens = splitTokens(nameInputs);
  for (const tok of rawNameTokens) {
    const mapped = lookupCodeToName(tok, primaryMap, fallbackMap);
    if (!mapped || isPureNumericCode(mapped)) continue;
    if (!resolvedFromNames.includes(mapped)) {
      resolvedFromNames.push(mapped);
    }
  }
  if (resolvedFromNames.length > 0) {
    return resolvedFromNames;
  }

  // Fallback: only if no name field was present, resolve code -> name via master map (never keep raw numeric code)
  const resolvedFromCodes: string[] = [];
  const rawCodeTokens = splitTokens(codeInputs);
  for (const tok of rawCodeTokens) {
    const mapped = lookupCodeToName(tok, primaryMap, fallbackMap);
    if (!mapped || isPureNumericCode(mapped)) continue;
    if (!resolvedFromCodes.includes(mapped)) {
      resolvedFromCodes.push(mapped);
    }
  }
  return resolvedFromCodes;
}

/**
 * Normalize string for exact matching (trim leading/trailing spaces, collapse multiple spaces, case-insensitive)
 */
export function normalizeExact(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v)
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

/**
 * Normalize Company / Party Name (e.g. HARIHAR TRADES PVT.LTD. -> HARIHAR TRADES PVT LTD)
 */
export function normalizeCompanyName(v: unknown): string {
  if (v === null || v === undefined) return '';
  let str = String(v).toUpperCase().trim();
  str = str.replace(/PRIVATE\s+LIMITED/g, 'PVT LTD');
  str = str.replace(/PVT\.?\s*LTD\.?/g, 'PVT LTD');
  str = str.replace(/LIMITED/g, 'LTD');
  str = str.replace(/LTD\.?/g, 'LTD');
  str = str.replace(/[^A-Z0-9\s]/g, '');
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Clean alphanumeric string
 */
export function cleanStr(v: unknown): string {
  return String(v ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Split comma, slash, semicolon, pipe, or newline separated strings into clean tokens
 */
export function splitTokens(input: any): string[] {
  if (input === null || input === undefined) return [];
  const rawValues = Array.isArray(input) ? input : [input];
  const list: string[] = [];
  for (const item of rawValues) {
    if (!item) continue;
    if (typeof item === 'object') {
      // If object, extract string values
      Object.values(item).forEach(val => {
        if (typeof val === 'string') {
          const parts = val.split(/[,/\\;|\n\r]+/);
          for (const p of parts) {
            const tr = p.trim();
            if (tr && !list.includes(tr)) list.push(tr);
          }
        }
      });
      continue;
    }
    const str = String(item).trim();
    if (!str) continue;
    const parts = str.split(/[,/\\;|\n\r]+/);
    for (const p of parts) {
      const tr = p.trim();
      if (tr && !list.includes(tr)) {
        list.push(tr);
      }
    }
  }
  return list;
}

/**
 * Resolve Grade Code to Grade Name (e.g. 832 -> TD6, 833 -> TD7, 834 -> TD8)
 */
export function resolveGradeName(val: any, customMap?: Record<string, string>): string {
  return lookupCodeToName(val, customMap, GRADE_CODE_TO_NAME);
}

/**
 * Resolve Agency Code to Agency Name (e.g. 64 -> KARIMPUR, 22 -> PURNIA, 78 -> NABADWIP)
 */
export function resolveAgencyName(val: any, customMap?: Record<string, string>): string {
  return lookupCodeToName(val, customMap, AGENCY_CODE_TO_NAME);
}
export function expandGradeTokens(input: any, customMap?: Record<string, string>): Set<string> {
  const tokens = new Set<string>();
  if (!input) return tokens;

  const rawList = splitTokens(input);
  for (const str of rawList) {
    if (!str) continue;
    const resolved = lookupCodeToName(str, customMap, GRADE_CODE_TO_NAME);
    if (!resolved || isPureNumericCode(resolved)) continue;
    const c = cleanStr(resolved);
    if (c) tokens.add(c);
  }
  return tokens;
}

/**
 * Expand and normalize agency tokens (Name-only)
 */
export function expandAgencyTokens(input: any, customMap?: Record<string, string>): Set<string> {
  const tokens = new Set<string>();
  if (!input) return tokens;

  const rawList = splitTokens(input);
  for (const str of rawList) {
    if (!str) continue;
    const resolved = lookupCodeToName(str, customMap, AGENCY_CODE_TO_NAME);
    if (!resolved || isPureNumericCode(resolved)) continue;
    const norm = normalizeExact(resolved);
    if (norm) tokens.add(norm);
    const c = cleanStr(resolved);
    if (c) tokens.add(c);
  }
  return tokens;
}

/**
 * Expand and normalize marka tokens
 */
export function expandMarkaTokens(input: any): Set<string> {
  const tokens = new Set<string>();
  if (!input) return tokens;

  const rawList = splitTokens(input);
  for (const str of rawList) {
    const c = normalizeExact(str);
    if (c) tokens.add(c);
    const alpha = cleanStr(str);
    if (alpha) tokens.add(alpha);
  }
  return tokens;
}

function toNum(v: unknown): number {
  if (v === null || v === undefined || v === '') return NaN;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? NaN : n;
}

/**
 * Compare Sauda Check Point vs Temporary Arrival (temporary_material_received)
 * 
 * Compares the 7 fields:
 * 1. Broker            (Exact Match)
 * 2. Supplier          (Exact Match)
 * 3. Challan Supplier  (Exact Match)
 * 4. Area              (Exact Match)
 * 5. Grade             (Multiple-Value Match - Sauda is approved set)
 * 6. Agency            (Multiple-Value Match - Sauda is approved set)
 * 7. Marka             (Multiple-Value Match - Sauda is approved set)
 */
export function compareSaudaTempArrival(
  sauda: any,
  saudaDetails: any[] = [],
  arrival: any | null = null,
  arrivalLorryReceipts: any[] = [],
  masterMaps?: PoMatchMasterMaps
): PoMatchResult {
  const poNo = String(sauda?.po_no || sauda?.contract_po_no || sauda?.sauda_no || sauda?.ptf_no || '').trim();

  if (!arrival) {
    return {
      poNo,
      hasInspection: false,
      status: 'match',
      mismatches: [],
    };
  }

  const mismatches: FieldMismatch[] = [];

  // Parse grid_details from arrival into a fresh array (NEVER mutate arrival.grid_details in-place!)
  let arrivalGridRows: any[] = [];
  if (arrival.grid_details) {
    try {
      const parsed = typeof arrival.grid_details === 'string' ? JSON.parse(arrival.grid_details) : arrival.grid_details;
      arrivalGridRows = Array.isArray(parsed) ? [...parsed] : [];
    } catch (_e) {
      arrivalGridRows = [];
    }
  }

  if (Array.isArray(arrivalLorryReceipts)) {
    arrivalLorryReceipts.forEach(item => {
      if (item && item !== arrival && item.grid_details) {
        try {
          const g = typeof item.grid_details === 'string' ? JSON.parse(item.grid_details) : item.grid_details;
          if (Array.isArray(g)) arrivalGridRows.push(...g);
        } catch (_e) {}
      }
    });
  }

  // ==========================================
  // 1. BROKER (Match By Name Only - Not Code)
  // ==========================================
  const brokerCodeToName = masterMaps?.brokerCodeToName;
  const rawSaudaBroker = sauda.broker_name || sauda.broker;
  const rawArrivalBroker = arrival.broker_name || arrival.broker;
  const saudaBroker = rawSaudaBroker ? lookupCodeToName(rawSaudaBroker, brokerCodeToName) : '';
  const arrivalBroker = rawArrivalBroker ? lookupCodeToName(rawArrivalBroker, brokerCodeToName) : '';
  if (saudaBroker && arrivalBroker) {
    const normSauda = normalizeCompanyName(saudaBroker);
    const normArrival = normalizeCompanyName(arrivalBroker);
    if (normSauda && normArrival && normSauda !== normArrival) {
      mismatches.push({
        field: 'Broker',
        mismatchLabel: `Broker Mismatch: ${arrivalBroker} (Approved: ${saudaBroker})`,
        poValue: String(saudaBroker),
        inspValue: String(arrivalBroker),
      });
    }
  }

  // ==========================================
  // 2. SUPPLIER (Match By Name Only - Not Code)
  // ==========================================
  const supplierCodeToName = masterMaps?.supplierCodeToName;
  const rawSaudaSupplier = sauda.supplier_name || sauda.supplier || sauda.party_name;
  const rawArrivalSupplier = arrival.supplier_name || arrival.supplier || arrival.party_name;
  const saudaSupplier = rawSaudaSupplier ? lookupCodeToName(rawSaudaSupplier, supplierCodeToName) : '';
  const arrivalSupplier = rawArrivalSupplier ? lookupCodeToName(rawArrivalSupplier, supplierCodeToName) : '';
  if (saudaSupplier && arrivalSupplier) {
    const normSauda = normalizeCompanyName(saudaSupplier);
    const normArrival = normalizeCompanyName(arrivalSupplier);
    if (normSauda && normArrival && normSauda !== normArrival) {
      mismatches.push({
        field: 'Supplier',
        mismatchLabel: `Supplier Mismatch: ${arrivalSupplier} (Approved: ${saudaSupplier})`,
        poValue: String(saudaSupplier),
        inspValue: String(arrivalSupplier),
      });
    }
  }

  // ==========================================
  // 3. CHALLAN SUPPLIER (Match By Name Only - Not Code)
  // ==========================================
  const rawSaudaChallan = sauda.challan_supplier_name || sauda.challan_supplier || sauda.challan_party || saudaSupplier;
  const rawArrivalChallan = arrival.challan_supplier_name || arrival.challan_supplier || arrival.challan_party || arrivalSupplier;
  const saudaChallan = rawSaudaChallan ? lookupCodeToName(rawSaudaChallan, supplierCodeToName) : '';
  const arrivalChallan = rawArrivalChallan ? lookupCodeToName(rawArrivalChallan, supplierCodeToName) : '';
  if (saudaChallan && arrivalChallan) {
    const normSauda = normalizeCompanyName(saudaChallan);
    const normArrival = normalizeCompanyName(arrivalChallan);
    if (normSauda && normArrival && normSauda !== normArrival) {
      mismatches.push({
        field: 'Challan Supplier',
        mismatchLabel: `Challan Supplier Mismatch: ${arrivalChallan} (Approved: ${saudaChallan})`,
        poValue: String(saudaChallan),
        inspValue: String(arrivalChallan),
      });
    }
  }

  // ==========================================
  // 4. AREA (Match By Name Only - Not Code)
  // ==========================================
  const areaCodeToName: Record<string, string> = { ...(masterMaps?.areaCodeToName || {}) };
  registerCodeToName(areaCodeToName, sauda.area_code, sauda.area_name || sauda.arrival_area_name || sauda.area);
  registerCodeToName(areaCodeToName, arrival.arrival_area_code || arrival.area_code, arrival.arrival_area_name || arrival.area_name || arrival.area);

  const saudaAreaNameInputs: any[] = [sauda.area_name, sauda.arrival_area_name, sauda.area, sauda.sourcing_area];
  const saudaAreaCodeInputs: any[] = [sauda.area_code];
  if (Array.isArray(saudaDetails)) {
    saudaDetails.forEach(d => {
      registerCodeToName(areaCodeToName, d?.area_code, d?.area_name || d?.arrival_area_name || d?.area);
      saudaAreaNameInputs.push(d?.area_name, d?.arrival_area_name, d?.area);
      saudaAreaCodeInputs.push(d?.area_code);
    });
  }
  const validSaudaAreas = resolveNameList(saudaAreaNameInputs, saudaAreaCodeInputs, areaCodeToName, AREA_CODE_TO_NAME)
    .map(normalizeExact)
    .filter(Boolean);

  const arrivalAreaNameInputs: any[] = [arrival.arrival_area_name, arrival.area_name, arrival.area, arrival.sourcing_area];
  const arrivalAreaCodeInputs: any[] = [arrival.arrival_area_code, arrival.area_code];
  arrivalGridRows.forEach(g => {
    registerCodeToName(areaCodeToName, g?.arrival_area_code || g?.area_code, g?.arrival_area_name || g?.area_name || g?.area);
    arrivalAreaNameInputs.push(g?.arrival_area_name, g?.area_name, g?.area);
    arrivalAreaCodeInputs.push(g?.arrival_area_code, g?.area_code);
  });
  const validArrivalAreas = resolveNameList(arrivalAreaNameInputs, arrivalAreaCodeInputs, areaCodeToName, AREA_CODE_TO_NAME)
    .map(normalizeExact)
    .filter(Boolean);

  if (validSaudaAreas.length > 0 && validArrivalAreas.length > 0) {
    const areaMatch = validArrivalAreas.some(aa => validSaudaAreas.some(sa => sa === aa || cleanStr(sa) === cleanStr(aa)));
    if (!areaMatch) {
      const saudaDisplay = Array.from(new Set(validSaudaAreas)).join(', ');
      const arrivalDisplay = Array.from(new Set(validArrivalAreas)).join(', ');
      mismatches.push({
        field: 'Area',
        mismatchLabel: `Area Mismatch: ${arrivalDisplay} (Approved: ${saudaDisplay})`,
        poValue: saudaDisplay,
        inspValue: arrivalDisplay,
      });
    }
  }

  // ==========================================
  // 5. GRADE (Match By Name Only - Not Code)
  // ==========================================
  const gradeCodeToName: Record<string, string> = { ...(masterMaps?.gradeCodeToName || {}) };
  registerCodeToName(gradeCodeToName, sauda.grade_code, sauda.grade_name || sauda.grade || sauda.quality);
  if (Array.isArray(saudaDetails)) {
    saudaDetails.forEach(d => registerCodeToName(gradeCodeToName, d?.grade_code, d?.grade_name || d?.stock_grade_name || d?.grade || d?.quality));
  }
  arrivalGridRows.forEach(g => {
    registerCodeToName(gradeCodeToName, g?.challan_grade_code, g?.challan_grade_name || g?.grade_name || g?.grade);
    registerCodeToName(gradeCodeToName, g?.receipt_grade_code, g?.receipt_grade_name || g?.grade_name || g?.grade);
  });

  const saudaGradeNames: string[] = [];
  const pushUniqueNames = (target: string[], names: string[]) => {
    names.forEach(n => {
      if (n && !target.includes(n)) target.push(n);
    });
  };
  if (Array.isArray(saudaDetails) && saudaDetails.length > 0) {
    saudaDetails.forEach(d => {
      pushUniqueNames(
        saudaGradeNames,
        resolveNameList(
          [d?.grade_name, d?.stock_grade_name, d?.grade, d?.quality],
          [d?.grade_code],
          gradeCodeToName,
          GRADE_CODE_TO_NAME
        )
      );
    });
  }
  pushUniqueNames(
    saudaGradeNames,
    resolveNameList(
      [sauda.grade_name, sauda.grade, sauda.quality],
      [sauda.grade_code],
      gradeCodeToName,
      GRADE_CODE_TO_NAME
    )
  );
  const saudaGradeTokenSet = new Set(saudaGradeNames.map(cleanStr).filter(Boolean));

  const arrivalGradeRowNames: string[][] = [];
  arrivalGridRows.forEach(g => {
    const rowNames = resolveNameList(
      [g?.challan_grade_name, g?.receipt_grade_name, g?.grade_name, g?.grade, g?.quality],
      [g?.challan_grade_code, g?.receipt_grade_code],
      gradeCodeToName,
      GRADE_CODE_TO_NAME
    );
    if (rowNames.length > 0) arrivalGradeRowNames.push(rowNames);
  });
  if (arrivalGradeRowNames.length === 0) {
    const headerGrades = resolveNameList(
      [arrival.challan_grade_name, arrival.receipt_grade_name, arrival.grade_name, arrival.challan_grade, arrival.grade, arrival.quality, arrival.variety, arrival.grading],
      [arrival.challan_grade_code, arrival.receipt_grade_code, arrival.grade_code],
      gradeCodeToName,
      GRADE_CODE_TO_NAME
    );
    if (headerGrades.length > 0) arrivalGradeRowNames.push(headerGrades);
  }

  const allArrivalGradeNames: string[] = [];
  arrivalGradeRowNames.forEach(r => pushUniqueNames(allArrivalGradeNames, r));

  if (saudaGradeTokenSet.size > 0 && allArrivalGradeNames.length > 0) {
    const unapprovedGrades: string[] = [];
    arrivalGradeRowNames.forEach(rowNames => {
      const matched = rowNames.some(n => saudaGradeTokenSet.has(cleanStr(n)));
      if (!matched) {
        rowNames.forEach(n => {
          if (!unapprovedGrades.includes(n)) unapprovedGrades.push(n);
        });
      }
    });

    if (unapprovedGrades.length > 0) {
      const approvedDisplay = saudaGradeNames.join(', ');
      const arrivalDisplay = allArrivalGradeNames.join(', ');
      mismatches.push({
        field: 'Grade',
        mismatchLabel: `Grade Mismatch: ${unapprovedGrades.join(', ')} not approved (Approved: ${approvedDisplay})`,
        poValue: approvedDisplay,
        inspValue: arrivalDisplay,
        unapprovedValues: unapprovedGrades,
      });
    }
  }

  // ==========================================
  // 6. AGENCY (Match By Name Only - Not Code)
  // ==========================================
  const agencyCodeToName: Record<string, string> = { ...(masterMaps?.agencyCodeToName || {}) };
  registerCodeToName(agencyCodeToName, sauda.agency_code, sauda.agency_name || sauda.agency);
  if (Array.isArray(saudaDetails)) {
    saudaDetails.forEach(d => registerCodeToName(agencyCodeToName, d?.agency_code, d?.agency_name || d?.agency));
  }
  registerCodeToName(agencyCodeToName, arrival.agency_code, arrival.agency_name || arrival.agency);
  arrivalGridRows.forEach(g => registerCodeToName(agencyCodeToName, g?.agency_code, g?.agency_name || g?.agency));

  const saudaAgencyNames: string[] = [];
  if (Array.isArray(saudaDetails) && saudaDetails.length > 0) {
    saudaDetails.forEach(d => {
      pushUniqueNames(
        saudaAgencyNames,
        resolveNameList([d?.agency_name, d?.agency], [d?.agency_code], agencyCodeToName, AGENCY_CODE_TO_NAME)
      );
    });
  }
  pushUniqueNames(
    saudaAgencyNames,
    resolveNameList([sauda.agency_name, sauda.agency], [sauda.agency_code], agencyCodeToName, AGENCY_CODE_TO_NAME)
  );
  const saudaAgencyTokenSet = new Set<string>();
  saudaAgencyNames.forEach(n => {
    saudaAgencyTokenSet.add(normalizeExact(n));
    saudaAgencyTokenSet.add(cleanStr(n));
  });

  const arrivalAgencyRowNames: string[][] = [];
  arrivalGridRows.forEach(g => {
    const rowNames = resolveNameList([g?.agency_name, g?.agency], [g?.agency_code], agencyCodeToName, AGENCY_CODE_TO_NAME);
    if (rowNames.length > 0) arrivalAgencyRowNames.push(rowNames);
  });
  if (arrivalAgencyRowNames.length === 0) {
    const headerAgencies = resolveNameList([arrival.agency_name, arrival.agency], [arrival.agency_code], agencyCodeToName, AGENCY_CODE_TO_NAME);
    if (headerAgencies.length > 0) arrivalAgencyRowNames.push(headerAgencies);
  }

  const allArrivalAgencyNames: string[] = [];
  arrivalAgencyRowNames.forEach(r => pushUniqueNames(allArrivalAgencyNames, r));

  if (saudaAgencyTokenSet.size > 0 && allArrivalAgencyNames.length > 0) {
    const unapprovedAgencies: string[] = [];
    arrivalAgencyRowNames.forEach(rowNames => {
      const matched = rowNames.some(n => saudaAgencyTokenSet.has(normalizeExact(n)) || saudaAgencyTokenSet.has(cleanStr(n)));
      if (!matched) {
        rowNames.forEach(n => {
          if (!unapprovedAgencies.includes(n)) unapprovedAgencies.push(n);
        });
      }
    });

    if (unapprovedAgencies.length > 0) {
      const approvedDisplay = saudaAgencyNames.join(', ');
      const arrivalDisplay = allArrivalAgencyNames.join(', ');
      mismatches.push({
        field: 'Agency',
        mismatchLabel: `Agency Mismatch: ${unapprovedAgencies.join(', ')} not matching (Approved: ${approvedDisplay})`,
        poValue: approvedDisplay,
        inspValue: arrivalDisplay,
        unapprovedValues: unapprovedAgencies,
      });
    }
  }

  // ==========================================
  // 7. MARKA (Match By Name Only - Not Code)
  // ==========================================
  const markaCodeToName: Record<string, string> = { ...(masterMaps?.markaCodeToName || {}) };
  registerCodeToName(markaCodeToName, sauda.marka_code || sauda.challan_marka_code, sauda.marka_name || sauda.challan_marka_name || sauda.marka);
  if (Array.isArray(saudaDetails)) {
    saudaDetails.forEach(d => registerCodeToName(markaCodeToName, d?.marka_code || d?.challan_marka_code, d?.marka_name || d?.challan_marka_name || d?.marka));
  }
  registerCodeToName(markaCodeToName, arrival.challan_marka_code || arrival.marka_code, arrival.challan_marka_name || arrival.marka_name || arrival.challan_marka || arrival.marka);
  arrivalGridRows.forEach(g => {
    registerCodeToName(markaCodeToName, g?.challan_marka_code || g?.marka_code, g?.challan_marka_name || g?.marka_name || g?.marka);
  });

  const saudaMarkaNames: string[] = [];
  if (Array.isArray(saudaDetails) && saudaDetails.length > 0) {
    saudaDetails.forEach(d => {
      pushUniqueNames(
        saudaMarkaNames,
        resolveNameList([d?.marka_name, d?.challan_marka_name, d?.marka], [d?.marka_code, d?.challan_marka_code], markaCodeToName)
      );
    });
  }
  pushUniqueNames(
    saudaMarkaNames,
    resolveNameList(
      [sauda.marka_name, sauda.challan_marka_name, sauda.marka, sauda.challan_marka],
      [sauda.marka_code, sauda.challan_marka_code],
      markaCodeToName
    )
  );
  const saudaMarkaTokenSet = new Set<string>();
  saudaMarkaNames.forEach(n => {
    saudaMarkaTokenSet.add(normalizeExact(n));
    saudaMarkaTokenSet.add(cleanStr(n));
  });

  const arrivalMarkaRowNames: string[][] = [];
  arrivalGridRows.forEach(g => {
    const rowNames = resolveNameList(
      [g?.challan_marka_name, g?.marka_name, g?.marka],
      [g?.challan_marka_code, g?.marka_code],
      markaCodeToName
    );
    if (rowNames.length > 0) arrivalMarkaRowNames.push(rowNames);
  });
  if (arrivalMarkaRowNames.length === 0) {
    const headerMarkas = resolveNameList(
      [arrival.challan_marka_name, arrival.marka_name, arrival.challan_marka, arrival.marka],
      [arrival.challan_marka_code, arrival.marka_code],
      markaCodeToName
    );
    if (headerMarkas.length > 0) arrivalMarkaRowNames.push(headerMarkas);
  }

  const allArrivalMarkaNames: string[] = [];
  arrivalMarkaRowNames.forEach(r => pushUniqueNames(allArrivalMarkaNames, r));

  if (saudaMarkaTokenSet.size > 0 && allArrivalMarkaNames.length > 0) {
    const unapprovedMarkas: string[] = [];
    arrivalMarkaRowNames.forEach(rowNames => {
      const matched = rowNames.some(n => saudaMarkaTokenSet.has(normalizeExact(n)) || saudaMarkaTokenSet.has(cleanStr(n)));
      if (!matched) {
        rowNames.forEach(n => {
          if (!unapprovedMarkas.includes(n)) unapprovedMarkas.push(n);
        });
      }
    });

    if (unapprovedMarkas.length > 0) {
      const approvedDisplay = saudaMarkaNames.join(', ');
      const arrivalDisplay = allArrivalMarkaNames.join(', ');
      mismatches.push({
        field: 'Marka',
        mismatchLabel: `Marka Mismatch: ${unapprovedMarkas.join(', ')} not approved (Approved: ${approvedDisplay})`,
        poValue: approvedDisplay,
        inspValue: arrivalDisplay,
        unapprovedValues: unapprovedMarkas,
      });
    }
  }

  // --- LORRY PROGRESS & WEIGHT TOLERANCE ---
  const contractMt = toNum(sauda.total_contract_mt ?? sauda.total_wt_in_ton ?? sauda.total_wt) || 0;
  let totalLorries = toNum(sauda.total_lorries ?? sauda.no_of_lorries ?? sauda.lorry_count);
  if (isNaN(totalLorries) || totalLorries <= 0) {
    totalLorries = Math.max(1, Math.round(contractMt / 12));
  }

  let receivedLorriesCount = 0;
  let totalReceivedWeightSum = 0;

  if (Array.isArray(arrivalLorryReceipts) && arrivalLorryReceipts.length > 0) {
    const uniqueLorries = new Set<string>();
    arrivalLorryReceipts.forEach((receipt: any) => {
      const lorryNo = String(receipt.lorry_number || receipt.lorry_no || '').trim().toUpperCase();
      if (lorryNo) uniqueLorries.add(lorryNo);

      let wt = toNum(receipt.total_wt_in_ton ?? receipt.total_wt);
      if (isNaN(wt) && receipt.weight_qtl != null) wt = toNum(receipt.weight_qtl) / 10;
      if (isNaN(wt) && receipt.total_actual_weight != null) wt = toNum(receipt.total_actual_weight) / 1000;
      if (!isNaN(wt)) totalReceivedWeightSum += wt;
    });
    receivedLorriesCount = uniqueLorries.size;
  } else if (arrival) {
    receivedLorriesCount = 1;
    let wt = toNum(arrival.total_wt_in_ton ?? arrival.total_wt);
    if (isNaN(wt) && arrival.weight_qtl != null) wt = toNum(arrival.weight_qtl) / 10;
    if (isNaN(wt) && arrival.total_actual_weight != null) wt = toNum(arrival.total_actual_weight) / 1000;
    if (!isNaN(wt)) totalReceivedWeightSum = wt;
  }

  const remainingLorries = Math.max(0, totalLorries - receivedLorriesCount);

  return {
    poNo,
    hasInspection: true,
    status: mismatches.length === 0 ? 'match' : 'mismatch',
    mismatches,
    lorryProgress: {
      totalLorries,
      receivedLorries: receivedLorriesCount,
      remainingLorries,
    },
    totalContractMt: contractMt,
    totalReceivedMt: totalReceivedWeightSum,
  };
}

/**
 * Compare a Sauda Check Point / Temporary P.O against Temporary Arrival / Material Inspection.
 * Delegates to compareSaudaTempArrival.
 */
export function comparePoInspection(
  po: any,
  poItems: any[] = [],
  insp: any | null = null,
  inspItems: any[] = [],
  masterMaps?: PoMatchMasterMaps
): PoMatchResult {
  return compareSaudaTempArrival(po, poItems, insp, inspItems, masterMaps);
}
