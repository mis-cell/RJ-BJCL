import { PendingStageRecord } from '../types/dashboardCalculation.types';

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Extracts first positive (>0) numerical value across array of property keys
 */
export function extractPositiveVal(obj: any, keys: string[]): number {
  if (!obj || typeof obj !== 'object') return 0;
  for (const k of keys) {
    const val = obj[k];
    if (val !== undefined && val !== null && val !== '') {
      const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.]/g, ''));
      if (!isNaN(num) && num > 0) {
        return num;
      }
    }
  }
  return 0;
}

/**
 * Extracts Bales / Drum Quantity from Receipt details (grid_details) or fallback fields
 */
export function getRecordBales(item: any): number {
  if (!item) return 0;
  if (item.grid_details) {
    let grid: any[] = [];
    if (typeof item.grid_details === 'string') {
      try {
        const parsed = item.grid_details === 'undefined' || item.grid_details === 'null' ? [] : JSON.parse(item.grid_details === "undefined" ? "null" : item.grid_details);
        if (Array.isArray(parsed)) grid = parsed;
      } catch (e) {}
    } else if (Array.isArray(item.grid_details)) {
      grid = item.grid_details;
    }

    if (grid.length > 0) {
      let hasChln = false;
      let sumChln = 0;
      grid.forEach((row: any) => {
        const val = row.quantity_chln !== undefined && row.quantity_chln !== null && row.quantity_chln !== ''
          ? Number(row.quantity_chln)
          : (row.chln !== undefined && row.chln !== null && row.chln !== '' ? Number(row.chln) : NaN);
        if (!isNaN(val)) {
          hasChln = true;
          sumChln += val;
        }
      });
      if (hasChln && sumChln > 0) return sumChln;

      const fallback = grid.reduce((acc: number, row: any) => acc + (Number(row.quantity_chln) || Number(row.chln) || Number(row.quantity) || Number(row.qty) || Number(row.bales) || 0), 0);
      if (fallback > 0) return fallback;
    }
  }
  return Number(item.total_packets || item.packets || item.actual_bales || item.challan_bales || item.bales || item.quantity || 0);
}

/**
 * Extracts lowest net weight in Metric Tons
 */
export function getRecordNetWeightMt(item: any): number {
  if (!item) return 0;
  const nets = [
    Number(item.electronic_net_weight),
    Number(item.supplier_net_weight),
    Number(item.challan_material_weight),
    Number(item.weight_reduced),
    item.weight_qtl ? Number(item.weight_qtl) / 10 : 0,
    Number(item.weight),
    Number(item.quantity)
  ].filter(v => typeof v === 'number' && !isNaN(v) && v > 0);
  if (nets.length > 0) {
    const minVal = Math.min(...nets);
    return minVal > 50 ? minVal / 10 : minVal;
  }
  const gross = Number(item.total_actual_weight || item.weight_mt || item.challan_gross_wt || item.receipt_gross_wt || 0);
  return gross > 100 ? gross / 1000 : (gross > 50 ? gross / 10 : gross);
}

/**
 * Normalizes PO / Contract / MR reference strings
 * Strips out prefixes like 'P.O:', 'PO:', 'M.R:', '#', whitespace and converts to uppercase
 */
export function normalizePoRef(raw: any): string {
  if (!raw) return '';
  const str = String(raw).trim();
  return str
    .replace(/^p\.?o\.?\s*[:\-]?\s*/i, '')
    .replace(/^m\.?r\.?\s*[:\-]?\s*/i, '')
    .replace(/^#/, '')
    .trim()
    .toUpperCase();
}

/**
 * Extract clean PO suffix (e.g. "0401" from "BJCL/2026-2027/0401" or "0153")
 */
export function getPoSuffix(poStr: string): string {
  if (!poStr) return '';
  const parts = poStr.split('/');
  return parts[parts.length - 1].trim();
}

/**
 * Gets canonical PO key for reliable deduplication across formats (e.g. BJCL/2026-2027/0401 and 0401)
 */
export function getCanonicalPoKey(raw: any): string {
  if (!raw) return '';
  const clean = normalizePoRef(raw);
  if (!clean) return '';
  const suffix = getPoSuffix(clean);
  const numOnly = suffix.replace(/[^0-9]/g, '');
  if (numOnly && numOnly.length >= 1) {
    return numOnly.padStart(4, '0');
  }
  return clean;
}

export interface ParsedIndianDate {
  dateObj: Date;
  dateStr: string;     // YYYY-MM-DD (Indian calendar)
  displayDate: string; // DD/MM/YYYY
  year: number;
  month: number;       // 0-11
  day: number;         // 1-31
  isValid: boolean;
}

const MONTH_ABBR_MAP: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

const IST_OFFSET_MS = 330 * 60 * 1000; // Asia/Kolkata UTC+05:30

function buildValidParsedDate(year: number, month: number, day: number): ParsedIndianDate | null {
  if (year < 2000 || year > 2100 || month < 0 || month > 11 || day < 1 || day > 31) {
    return null;
  }
  const d = new Date(year, month, day);
  if (
    isNaN(d.getTime()) ||
    d.getFullYear() !== year ||
    d.getMonth() !== month ||
    d.getDate() !== day
  ) {
    return null;
  }
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const displayDate = `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`;
  return { dateObj: d, dateStr, displayDate, year, month, day, isValid: true };
}

/**
 * Checks whether a reference number (Temp Arrival, Final Arrival, MR No, PO No) is a genuine non-empty value.
 */
export function isRealBusinessRef(raw: any): string {
  const clean = normalizePoRef(raw);
  if (
    !clean ||
    clean === '-' ||
    clean === '--' ||
    clean === '---' ||
    clean === 'N/A' ||
    clean === 'NA' ||
    clean === 'NONE' ||
    clean === 'NULL' ||
    clean === 'UNDEFINED'
  ) {
    return '';
  }
  return clean;
}

/**
 * Robust Indian-calendar date parser returning standard date object and parts.
 * - Parses DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, DD-MM-YY, DD-MMM-YYYY strictly in Day-Month-Year order.
 * - Preserves YYYY-MM-DD plain DB dates without local timezone shift.
 * - Converts UTC/offset ISO timestamps to IST (Asia/Kolkata, +05:30) calendar day/month/year boundaries.
 */
export function parseRecordDate(rawDate: any): ParsedIndianDate {
  const fallback = new Date();
  const invalid: ParsedIndianDate = {
    dateObj: fallback,
    dateStr: '',
    displayDate: '',
    year: 0,
    month: -1,
    day: 0,
    isValid: false,
  };

  if (rawDate === null || rawDate === undefined || rawDate === '') {
    return invalid;
  }

  if (rawDate instanceof Date) {
    if (isNaN(rawDate.getTime())) return invalid;
    const ist = new Date(rawDate.getTime() + IST_OFFSET_MS);
    return buildValidParsedDate(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) || invalid;
  }

  const str = String(rawDate).trim();
  if (!str || str === '-' || str === '--' || /^(null|undefined|n\/a|invalid date)$/i.test(str)) {
    return invalid;
  }

  // Reject corrupt zero-padded years such as 0000-00-00 or 0009-09-12
  if (/^0{2,4}[-/.]/.test(str)) {
    return invalid;
  }

  // 1. Timestamps with explicit timezone offset (e.g. ...Z, +00:00, +05:30, -08:00): convert instant -> IST (+05:30)
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}[T\s]\d{1,2}:\d{2}.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(str)) {
    const normalizedIso = str.includes(' ') && !str.includes('T') ? str.replace(' ', 'T') : str;
    const inst = new Date(normalizedIso);
    if (!isNaN(inst.getTime())) {
      const ist = new Date(inst.getTime() + IST_OFFSET_MS);
      const res = buildValidParsedDate(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate());
      if (res) return res;
    }
  }

  // 2. ISO / PostgreSQL YYYY-MM-DD (or YYYY/MM/DD or YYYY-MM-DD HH:MM:SS without offset)
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s]|$)/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    const res = buildValidParsedDate(year, month, day);
    if (res) return res;
    return invalid;
  }

  // 3. Indian DD-MM-YYYY / DD/MM/YYYY / DD.MM.YYYY (strictly Day then Month)
  const dmy4Match = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?:[T\s,].*)?$/);
  if (dmy4Match) {
    const day = parseInt(dmy4Match[1], 10);
    const month = parseInt(dmy4Match[2], 10) - 1;
    const year = parseInt(dmy4Match[3], 10);
    const res = buildValidParsedDate(year, month, day);
    if (res) return res;
    return invalid;
  }

  // 4. Indian short year DD-MM-YY / DD/MM/YY / DD.MM.YY
  const dmy2Match = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2})(?:[T\s,].*)?$/);
  if (dmy2Match) {
    const day = parseInt(dmy2Match[1], 10);
    const month = parseInt(dmy2Match[2], 10) - 1;
    const yy = parseInt(dmy2Match[3], 10);
    const year = yy < 80 ? 2000 + yy : 1900 + yy;
    const res = buildValidParsedDate(year, month, day);
    if (res) return res;
    return invalid;
  }

  // 5. Indian named month e.g. 07-Nov-2026 or 7 Nov 26
  const dMonYMatch = str.match(/^(\d{1,2})[-/\s]+([A-Za-z]{3,9})[-/,\s]+(\d{2,4})(?:\s.*)?$/);
  if (dMonYMatch) {
    const day = parseInt(dMonYMatch[1], 10);
    const mIdx = MONTH_ABBR_MAP[dMonYMatch[2].toLowerCase()];
    let year = parseInt(dMonYMatch[3], 10);
    if (year < 100) year = year < 80 ? 2000 + year : 1900 + year;
    if (mIdx !== undefined) {
      const res = buildValidParsedDate(year, mIdx, day);
      if (res) return res;
    }
    return invalid;
  }

  // 6. Fallback JS Date parse converted to IST
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const ist = new Date(parsed.getTime() + IST_OFFSET_MS);
    const res = buildValidParsedDate(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate());
    if (res) return res;
  }

  return invalid;
}

/**
 * Picks the first valid Indian calendar date from a prioritized list of candidate fields.
 */
export function pickFirstValidRecordDate(candidates: any[]): ParsedIndianDate {
  for (const c of candidates) {
    if (c === null || c === undefined || c === '') continue;
    const parsed = parseRecordDate(c);
    if (parsed.isValid) return parsed;
  }
  return parseRecordDate(null);
}

/**
 * Generates and downloads a CSV of Pending P.O. Numbers across stages
 */
export function exportPendingPoListCsv(records: PendingStageRecord[], fileName?: string) {
  if (!records || records.length === 0) {
    alert("No pending records to export for this stage.");
    return;
  }

  const headers = [
    "Stage & Pipeline Gap",
    "P.O. Number",
    "M.R. No / Arrival No",
    "Date",
    "Supplier Name",
    "Broker Name",
    "Vehicle / Lorry No",
    "Bales Count",
    "Weight (MT)",
    "Weight (Qtl)",
    "Value / Amount (INR)",
    "Current Pipeline Status",
    "Action Required"
  ];

  const rows = records.map(r => [
    `"${(r.stageLabel || r.stageCode || r.stage).replace(/"/g, '""')}"`,
    `"${(r.poNo || 'N/A').replace(/"/g, '""')}"`,
    `"${(r.mrNo || r.arrivalNo || '').replace(/"/g, '""')}"`,
    `"${r.date || ''}"`,
    `"${(r.supplier || 'N/A').replace(/"/g, '""')}"`,
    `"${(r.broker || 'DIRECT').replace(/"/g, '""')}"`,
    `"${(r.vehicleNo || 'N/A').replace(/"/g, '""')}"`,
    r.bales || 0,
    r.weightMt ? r.weightMt.toFixed(3) : "0.000",
    r.weightQtl ? r.weightQtl.toFixed(2) : "0.00",
    r.amount ? r.amount.toFixed(2) : "0.00",
    `"${(r.status || '').replace(/"/g, '""')}"`,
    `"${(r.pendingAction || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", fileName || `Pending_PO_Pipeline_Report_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
