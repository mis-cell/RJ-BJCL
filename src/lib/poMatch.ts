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

// Standard Jute Grade Code <-> Grade Name mapping dictionary
const GRADE_CODE_NAME_MAP: Record<string, string> = {
  '831': 'TD5', 'TD5': '831', 'TD-5': '831', 'TD.5': '831',
  '832': 'TD6', 'TD6': '832', 'TD-6': '832', 'TD.6': '832',
  '833': 'TD7', 'TD7': '833', 'TD-7': '833', 'TD.7': '833',
  '834': 'TD8', 'TD8': '834', 'TD-8': '834', 'TD.8': '834',
  '835': 'W5',  'W5': '835',  'W-5': '835',  'W.5': '835',
  '836': 'W6',  'W6': '836',  'W-6': '836',  'W.6': '836',
  '837': 'W7',  'W7': '837',  'W-7': '837',  'W.7': '837',
  '838': 'W8',  'W8': '838',  'W-8': '838',  'W.8': '838',
  '839': 'M5',  'M5': '839',  'M-5': '839',  'M.5': '839',
  '840': 'M6',  'M6': '840',  'M-6': '840',  'M.6': '840',
  '841': 'M7',  'M7': '841',  'M-7': '841',  'M.7': '841',
  '842': 'M8',  'M8': '842',  'M-8': '842',  'M.8': '842',
  '843': 'B.TOW', 'BTOW': '843', 'B-TOW': '843',
};

// Agency Code <-> Agency Name mapping dictionary
const AGENCY_CODE_NAME_MAP: Record<string, string> = {
  '1': 'KOLKATA', 'KOLKATA': '1',
  '2': 'CALLY', 'CALLY': '2',
  '3': 'TALLY', 'TALLY': '3',
  '4': 'ASSAM', 'ASSAM': '4',
  '5': 'DHUBRI', 'DHUBRI': '5',
  '6': 'GAUHATI', 'GAUHATI': '6',
  '7': 'KISHANGANJ', 'KISHANGANJ': '7',
  '8': 'SILIGURI', 'SILIGURI': '8',
  '22': 'PURNIA', 'PURNIA': '22', 'PURNEA': '22',
  '30': 'DAISEE', 'DAISEE': '30',
  '64': 'KARIMPUR', 'KARIMPUR': '64',
  '78': 'NABADWIP', 'NABADWIP': '78',
};

// Area Code <-> Area Name mapping dictionary
const AREA_CODE_NAME_MAP: Record<string, string> = {
  '10': 'BIHAR', 'BIHAR': '10',
  '15': 'ASSAM', 'ASSAM': '15',
  '12': 'WEST BENGAL', 'WEST BENGAL': '12',
  '22': 'PURNIA', 'PURNIA': '22', 'PURNEA': '22',
  '30': 'DAISEE', 'DAISEE': '30',
  '64': 'KARIMPUR', 'KARIMPUR': '64',
  '78': 'NABADWIP', 'NABADWIP': '78',
  '6': 'GAUHATI', 'GAUHATI': '6',
  '7': 'KISHANGANJ', 'KISHANGANJ': '7',
  '8': 'SILIGURI', 'SILIGURI': '8',
};

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
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (!str) return '';
  const clean = cleanStr(str);
  if (GRADE_CODE_NAME_MAP[clean]) return GRADE_CODE_NAME_MAP[clean];
  if (GRADE_CODE_NAME_MAP[str]) return GRADE_CODE_NAME_MAP[str];
  if (customMap && customMap[clean]) return customMap[clean];
  if (customMap && customMap[str]) return customMap[str];
  return str;
}

/**
 * Resolve Agency Code to Agency Name (e.g. 64 -> KARIMPUR, 22 -> PURNIA, 78 -> NABADWIP)
 */
export function resolveAgencyName(val: any, customMap?: Record<string, string>): string {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (!str) return '';
  const clean = cleanStr(str);
  if (AGENCY_CODE_NAME_MAP[clean]) return AGENCY_CODE_NAME_MAP[clean];
  if (AGENCY_CODE_NAME_MAP[str]) return AGENCY_CODE_NAME_MAP[str];
  if (customMap && customMap[clean]) return customMap[clean];
  if (customMap && customMap[str]) return customMap[str];
  return str;
}
export function expandGradeTokens(input: any, customMap?: Record<string, string>): Set<string> {
  const tokens = new Set<string>();
  if (!input) return tokens;

  const rawList = splitTokens(input);
  for (const str of rawList) {
    if (!str) continue;
    const c = cleanStr(str);
    if (c) {
      tokens.add(c);
      if (GRADE_CODE_NAME_MAP[c]) {
        tokens.add(cleanStr(GRADE_CODE_NAME_MAP[c]));
      }
      if (customMap && customMap[c]) {
        tokens.add(cleanStr(customMap[c]));
      }
      const u = str.toUpperCase().replace(/\s+/g, '');
      if (GRADE_CODE_NAME_MAP[u]) {
        tokens.add(cleanStr(GRADE_CODE_NAME_MAP[u]));
      }
      if (customMap && customMap[u]) {
        tokens.add(cleanStr(customMap[u]));
      }
    }
  }
  return tokens;
}

/**
 * Expand and normalize agency tokens
 */
export function expandAgencyTokens(input: any, customMap?: Record<string, string>): Set<string> {
  const tokens = new Set<string>();
  if (!input) return tokens;

  const rawList = splitTokens(input);
  for (const str of rawList) {
    if (!str) continue;
    const c = cleanStr(str);
    if (c) {
      tokens.add(c);
      if (AGENCY_CODE_NAME_MAP[c]) {
        tokens.add(cleanStr(AGENCY_CODE_NAME_MAP[c]));
      }
      if (customMap && customMap[c]) {
        tokens.add(cleanStr(customMap[c]));
      }
      const u = str.toUpperCase().replace(/\s+/g, '');
      if (AGENCY_CODE_NAME_MAP[u]) {
        tokens.add(cleanStr(AGENCY_CODE_NAME_MAP[u]));
      }
      if (customMap && customMap[u]) {
        tokens.add(cleanStr(customMap[u]));
      }
    }
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
  arrivalLorryReceipts: any[] = []
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

  // Parse grid_details from arrival if present
  let arrivalGridRows: any[] = [];
  if (arrival.grid_details) {
    try {
      arrivalGridRows = typeof arrival.grid_details === 'string' ? JSON.parse(arrival.grid_details) : arrival.grid_details;
      if (!Array.isArray(arrivalGridRows)) arrivalGridRows = [];
    } catch (_e) {
      arrivalGridRows = [];
    }
  }

  if (Array.isArray(arrivalLorryReceipts)) {
    arrivalLorryReceipts.forEach(item => {
      if (item && item.grid_details) {
        try {
          const g = typeof item.grid_details === 'string' ? JSON.parse(item.grid_details) : item.grid_details;
          if (Array.isArray(g)) arrivalGridRows.push(...g);
        } catch (_e) {}
      }
    });
  }

  // ==========================================
  // 1. BROKER (Match By Name)
  // ==========================================
  const saudaBroker = sauda.broker ?? sauda.broker_name;
  const arrivalBroker = arrival.broker ?? arrival.broker_name;
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
  // 2. SUPPLIER (Match By Name)
  // ==========================================
  const saudaSupplier = sauda.supplier ?? sauda.supplier_name ?? sauda.party_name;
  const arrivalSupplier = arrival.supplier ?? arrival.supplier_name ?? arrival.party_name;
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
  // 3. CHALLAN SUPPLIER (Match By Name)
  // ==========================================
  const saudaChallan = sauda.challan_supplier ?? sauda.challan_party ?? sauda.supplier;
  const arrivalChallan = arrival.challan_supplier ?? arrival.challan_party ?? arrival.supplier;
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
  // 4. AREA (Match By Name: Code converted to Name)
  // ==========================================
  const saudaRawAreas = [sauda.area, sauda.arrival_area_name, sauda.area_name, sauda.sourcing_area];
  if (Array.isArray(saudaDetails)) {
    saudaDetails.forEach(d => saudaRawAreas.push(d?.area, d?.area_name, d?.arrival_area_name));
  }
  const normSaudaAreas: string[] = [];
  saudaRawAreas.forEach(a => {
    if (!a) return;
    const str = String(a).trim();
    if (AREA_CODE_NAME_MAP[str]) normSaudaAreas.push(normalizeExact(AREA_CODE_NAME_MAP[str]));
    const cleanA = cleanStr(str);
    if (AREA_CODE_NAME_MAP[cleanA]) normSaudaAreas.push(normalizeExact(AREA_CODE_NAME_MAP[cleanA]));
    normSaudaAreas.push(normalizeExact(str));
  });

  const arrivalRawAreas = [arrival.arrival_area_name, arrival.area, arrival.arrival_area_code, arrival.sourcing_area];
  arrivalGridRows.forEach(g => arrivalRawAreas.push(g?.arrival_area_name, g?.area, g?.area_name));
  const normArrivalAreas: string[] = [];
  arrivalRawAreas.forEach(a => {
    if (!a) return;
    const str = String(a).trim();
    if (AREA_CODE_NAME_MAP[str]) normArrivalAreas.push(normalizeExact(AREA_CODE_NAME_MAP[str]));
    const cleanA = cleanStr(str);
    if (AREA_CODE_NAME_MAP[cleanA]) normArrivalAreas.push(normalizeExact(AREA_CODE_NAME_MAP[cleanA]));
    normArrivalAreas.push(normalizeExact(str));
  });

  const validSaudaAreas = normSaudaAreas.filter(Boolean);
  const validArrivalAreas = normArrivalAreas.filter(Boolean);

  if (validSaudaAreas.length > 0 && validArrivalAreas.length > 0) {
    const areaMatch = validArrivalAreas.some(aa => validSaudaAreas.some(sa => sa === aa));
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
  // 5. GRADE (Multiple-Value Match: Sauda is approved set)
  // ==========================================
  const dynamicGradeMap: Record<string, string> = {};
  const registerGradePair = (codeVal: any, nameVal: any) => {
    if (!codeVal || !nameVal) return;
    const cStr = String(codeVal).trim().toUpperCase();
    const nStr = String(nameVal).trim().toUpperCase();
    if (cStr && nStr && cStr !== nStr) {
      dynamicGradeMap[cleanStr(cStr)] = cleanStr(nStr);
      dynamicGradeMap[cleanStr(nStr)] = cleanStr(cStr);
    }
  };

  if (Array.isArray(saudaDetails)) {
    saudaDetails.forEach(d => registerGradePair(d?.grade_code, d?.grade_name || d?.grade));
  }
  arrivalGridRows.forEach(g => registerGradePair(g?.receipt_grade_code || g?.challan_grade_code, g?.receipt_grade_name || g?.challan_grade_name || g?.grade));

  const rawSaudaGrades: any[] = [sauda.grade, sauda.quality, sauda.grade_name, sauda.grade_code];
  if (Array.isArray(saudaDetails)) {
    saudaDetails.forEach(d => {
      rawSaudaGrades.push(d?.grade_name, d?.quality, d?.grade, d?.grade_code, d?.stock_grade_name);
    });
  }
  const saudaGradeTokens = expandGradeTokens(rawSaudaGrades, dynamicGradeMap);

  const rawArrivalGrades: any[] = [
    arrival.challan_grade,
    arrival.challan_grade_name,
    arrival.receipt_grade_name,
    arrival.grade,
    arrival.quality,
    arrival.variety,
    arrival.grading
  ];
  arrivalGridRows.forEach(g => {
    rawArrivalGrades.push(g?.challan_grade_name, g?.receipt_grade_name, g?.grade, g?.quality, g?.grade_name, g?.receipt_grade_code);
  });
  const arrivalGradeList = splitTokens(rawArrivalGrades);

  if (saudaGradeTokens.size > 0 && arrivalGradeList.length > 0) {
    const unapprovedGrades: string[] = [];
    
    // Group by row entry
    const arrivalGradeEntries: any[] = [];
    arrivalGridRows.forEach(g => {
      arrivalGradeEntries.push([g?.challan_grade_name, g?.receipt_grade_name, g?.grade, g?.quality, g?.grade_name, g?.receipt_grade_code].filter(Boolean));
    });
    if (arrivalGradeEntries.length === 0) {
      arrivalGradeEntries.push(rawArrivalGrades.filter(Boolean));
    }

    arrivalGradeEntries.forEach(entry => {
      if (!entry || entry.length === 0) return;
      const entryTokens = expandGradeTokens(entry, dynamicGradeMap);
      let isMatch = false;
      entryTokens.forEach(t => {
        if (saudaGradeTokens.has(t)) isMatch = true;
      });
      if (!isMatch) {
        const displayLabel = entry.join(', ');
        if (displayLabel && !unapprovedGrades.includes(displayLabel)) {
          unapprovedGrades.push(displayLabel);
        }
      }
    });

    const trueUnapprovedGrades = unapprovedGrades.filter(unApprovedStr => {
      const tokens = expandGradeTokens(unApprovedStr, dynamicGradeMap);
      let matched = false;
      tokens.forEach(t => {
        if (saudaGradeTokens.has(t)) matched = true;
      });
      return !matched;
    });

    if (trueUnapprovedGrades.length > 0) {
      const approvedNames = splitTokens(rawSaudaGrades).map(g => resolveGradeName(g, dynamicGradeMap)).filter(Boolean);
      const approvedDisplay = Array.from(new Set(approvedNames)).join(', ') || Array.from(saudaGradeTokens).join(', ');

      const arrivalNames = arrivalGradeList.map(g => resolveGradeName(g, dynamicGradeMap)).filter(Boolean);
      const arrivalDisplay = Array.from(new Set(arrivalNames)).join(', ');

      const unapprovedDisplayNames = trueUnapprovedGrades.map(g => resolveGradeName(g, dynamicGradeMap)).filter(Boolean);
      const cleanUnapprovedList = Array.from(new Set(unapprovedDisplayNames));

      mismatches.push({
        field: 'Grade',
        mismatchLabel: `Grade Mismatch: ${cleanUnapprovedList.join(', ')} not approved (Approved: ${approvedDisplay})`,
        poValue: approvedDisplay,
        inspValue: arrivalDisplay,
        unapprovedValues: cleanUnapprovedList,
      });
    }
  }

  // ==========================================
  // 6. AGENCY (Multiple-Value Match: Sauda is approved set)
  // ==========================================
  const dynamicAgencyMap: Record<string, string> = {};
  
  const registerAgencyPair = (codeVal: any, nameVal: any) => {
    if (!codeVal || !nameVal) return;
    const cStr = String(codeVal).trim().toUpperCase();
    const nStr = String(nameVal).trim().toUpperCase();
    if (cStr && nStr && cStr !== nStr) {
      dynamicAgencyMap[cleanStr(cStr)] = cleanStr(nStr);
      dynamicAgencyMap[cleanStr(nStr)] = cleanStr(cStr);
    }
  };

  // Register pairs from sauda and details
  registerAgencyPair(sauda.agency_code || sauda.agency, sauda.agency_name);
  if (Array.isArray(saudaDetails)) {
    saudaDetails.forEach(d => {
      registerAgencyPair(d?.agency_code || d?.agency, d?.agency_name);
    });
  }
  // Register pairs from arrival and grid
  registerAgencyPair(arrival.agency_code || arrival.agency, arrival.agency_name);
  arrivalGridRows.forEach(g => {
    registerAgencyPair(g?.agency_code || g?.agency, g?.agency_name);
  });

  const rawSaudaAgencies: any[] = [sauda.agency, sauda.agency_name, sauda.agency_code];
  if (Array.isArray(saudaDetails)) {
    saudaDetails.forEach(d => rawSaudaAgencies.push(d?.agency_name, d?.agency_code, d?.agency));
  }
  const saudaAgencyTokens = expandAgencyTokens(rawSaudaAgencies, dynamicAgencyMap);

  const rawArrivalAgencies: any[] = [arrival.agency, arrival.agency_name, arrival.agency_code];
  arrivalGridRows.forEach(g => rawArrivalAgencies.push(g?.agency_name, g?.agency_code, g?.agency));
  const arrivalAgencyList = splitTokens(rawArrivalAgencies);

  if (saudaAgencyTokens.size > 0 && arrivalAgencyList.length > 0) {
    const unapprovedAgencies: string[] = [];
    
    // Group arrival agencies by row entry
    const arrivalAgencyEntries: any[] = [];
    arrivalGridRows.forEach(g => {
      arrivalAgencyEntries.push([g?.agency, g?.agency_name, g?.agency_code].filter(Boolean));
    });
    if (arrivalAgencyEntries.length === 0) {
      arrivalAgencyEntries.push([arrival.agency, arrival.agency_name, arrival.agency_code].filter(Boolean));
    }

    arrivalAgencyEntries.forEach(entry => {
      if (!entry || entry.length === 0) return;
      const entryTokens = expandAgencyTokens(entry, dynamicAgencyMap);
      let isMatch = false;
      entryTokens.forEach(t => {
        if (saudaAgencyTokens.has(t)) isMatch = true;
      });
      if (!isMatch) {
        const displayLabel = entry.join(', ');
        if (displayLabel && !unapprovedAgencies.includes(displayLabel)) {
          unapprovedAgencies.push(displayLabel);
        }
      }
    });

    // Double check that any reported unapproved agency doesn't intersect with saudaAgencyTokens
    const trueUnapprovedAgencies = unapprovedAgencies.filter(unApprovedStr => {
      const tokens = expandAgencyTokens(unApprovedStr, dynamicAgencyMap);
      let matched = false;
      tokens.forEach(t => {
        if (saudaAgencyTokens.has(t)) matched = true;
      });
      return !matched;
    });

    if (trueUnapprovedAgencies.length > 0) {
      const approvedNames = splitTokens(rawSaudaAgencies).map(a => resolveAgencyName(a, dynamicAgencyMap)).filter(Boolean);
      const approvedDisplay = Array.from(new Set(approvedNames)).join(', ') || Array.from(saudaAgencyTokens).join(', ');

      const arrivalNames = arrivalAgencyList.map(a => resolveAgencyName(a, dynamicAgencyMap)).filter(Boolean);
      const arrivalDisplay = Array.from(new Set(arrivalNames)).join(', ');

      const unapprovedDisplayNames = trueUnapprovedAgencies.map(a => resolveAgencyName(a, dynamicAgencyMap)).filter(Boolean);
      const cleanUnapprovedList = Array.from(new Set(unapprovedDisplayNames));

      mismatches.push({
        field: 'Agency',
        mismatchLabel: `Agency Mismatch: ${cleanUnapprovedList.join(', ')} not matching (Approved: ${approvedDisplay})`,
        poValue: approvedDisplay,
        inspValue: arrivalDisplay,
        unapprovedValues: cleanUnapprovedList,
      });
    }
  }

  // ==========================================
  // 7. MARKA (Multiple-Value Match: Sauda is approved set)
  // ==========================================
  const rawSaudaMarkas: any[] = [sauda.marka, sauda.marka_name, sauda.challan_marka, sauda.challan_marka_name];
  if (Array.isArray(saudaDetails)) {
    saudaDetails.forEach(d => rawSaudaMarkas.push(d?.marka, d?.marka_name, d?.challan_marka_name));
  }
  const saudaMarkaTokens = expandMarkaTokens(rawSaudaMarkas);

  const rawArrivalMarkas: any[] = [arrival.challan_marka, arrival.challan_marka_name, arrival.marka];
  arrivalGridRows.forEach(g => rawArrivalMarkas.push(g?.challan_marka_name, g?.challan_marka_code, g?.marka));
  const arrivalMarkaList = splitTokens(rawArrivalMarkas);

  if (saudaMarkaTokens.size > 0 && arrivalMarkaList.length > 0) {
    const unapprovedMarkas: string[] = [];
    arrivalMarkaList.forEach(arrMarka => {
      const mTokens = expandMarkaTokens(arrMarka);
      let isMatch = false;
      mTokens.forEach(t => {
        if (saudaMarkaTokens.has(t)) isMatch = true;
      });
      if (!isMatch && arrMarka.trim()) {
        unapprovedMarkas.push(arrMarka.trim());
      }
    });

    if (unapprovedMarkas.length > 0) {
      const approvedDisplay = splitTokens(rawSaudaMarkas).join(', ') || Array.from(saudaMarkaTokens).join(', ');
      const arrivalDisplay = arrivalMarkaList.join(', ');
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
  inspItems: any[] = []
): PoMatchResult {
  return compareSaudaTempArrival(po, poItems, insp, inspItems);
}
