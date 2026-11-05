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

/**
 * Robust date parser returning standard date object and parts
 */
export function parseRecordDate(rawDate: any): { dateObj: Date; dateStr: string; year: number; month: number; isValid: boolean } {
  const fallback = new Date();
  if (!rawDate) {
    return {
      dateObj: fallback,
      dateStr: '',
      year: 0,
      month: -1,
      isValid: false
    };
  }

  const str = String(rawDate).trim();
  if (!str) {
    return {
      dateObj: fallback,
      dateStr: '',
      year: 0,
      month: -1,
      isValid: false
    };
  }
  
  // Handle YYYY-MM-DD or YYYY/MM/DD or ISO prefix (must start with 4-digit year)
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(str)) {
    const cleanDatePart = str.split('T')[0];
    const parts = cleanDatePart.split(/[-/]/);
    let year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed
    const day = parseInt(parts[2], 10);

    // Sanitize corrupted/truncated years (e.g. 0009 -> 2009 or 2026 if year < 100)
    if (year < 100 && year >= 0) {
      year = year < 50 ? 2000 + year : 1900 + year;
    }

    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) {
      return {
        dateObj: d,
        dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        year,
        month,
        isValid: true
      };
    }
  }

  // Handle DD-MM-YYYY or DD/MM/YYYY (ends with 4-digit year)
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}/.test(str)) {
    const parts = str.split(/[-/]/);
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed
    let year = parseInt(parts[2], 10);

    if (year < 100 && year >= 0) {
      year = year < 50 ? 2000 + year : 1900 + year;
    }

    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) {
      return {
        dateObj: d,
        dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        year,
        month,
        isValid: true
      };
    }
  }

  // Standard ISO or YYYY-MM-DD
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    let year = parsed.getFullYear();
    if (year < 100 && year >= 0) {
      year = year < 50 ? 2000 + year : 1900 + year;
    }
    return {
      dateObj: parsed,
      dateStr: parsed.toISOString().slice(0, 10),
      year,
      month: parsed.getMonth(),
      isValid: true
    };
  }

  return {
    dateObj: fallback,
    dateStr: '',
    year: 0,
    month: -1,
    isValid: false
  };
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
