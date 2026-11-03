import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function cleanSaudaNo(rawSaudaNo: any, session?: any): string {
  if (!rawSaudaNo) return '';
  const cleanSession = String(session || '2026-2027')
    .replace(/^BJCL\//i, '')
    .replace(/\/.*$/, '')
    .trim() || '2026-2027';

  let str = String(rawSaudaNo).trim();
  
  // Recursively remove any duplicate 'BJCL/' or 'BJCL/YYYY-YYYY/' prefix
  while (/^BJCL\/(20\d{2}-20\d{2}\/)?/i.test(str) || /^BJCL\//i.test(str)) {
    str = str.replace(/^BJCL\/(20\d{2}-20\d{2}\/)?/i, '').replace(/^BJCL\//i, '');
  }

  // Also remove trailing or leading slashes from number part
  str = str.replace(/^\/+|\/+$/g, '').trim();

  if (!str) return `BJCL/${cleanSession}/Auto`;

  // Pad numbers if only digits (e.g. 656 -> 0656)
  if (/^\d+$/.test(str)) {
    str = str.padStart(4, '0');
  }

  return `BJCL/${cleanSession}/${str}`;
}

export function getApiUrl(apiPath: string): string {
  const cleanPath = apiPath.startsWith('/') ? apiPath.substring(1) : apiPath;
  const configuredBase = (
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL) ||
    ''
  ).trim().replace(/\/+$/, '');

  if (configuredBase) {
    return `${configuredBase}/${cleanPath}`;
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const isCloudRun = hostname.endsWith('run.app');
    const isStaticHost =
      hostname.endsWith('.github.io') ||
      hostname.endsWith('.netlify.app') ||
      hostname.endsWith('.vercel.app') ||
      hostname.endsWith('.pages.dev') ||
      hostname.endsWith('.surge.sh');

    const SUPABASE_FUNCTIONS_BASE = (import.meta as any).env?.VITE_SUPABASE_FUNCTIONS_URL || 'https://lxuapkccxaadwixjpirs.supabase.co/functions/v1';
    if (!isLocalhost && cleanPath.endsWith('api/send-email') && !configuredBase) {
      return `${SUPABASE_FUNCTIONS_BASE}/send-email`;
    }

    if (isStaticHost) {
      throw new Error(
        `Backend API unavailable on static host (${hostname}) for "/${cleanPath}". Set VITE_API_BASE_URL to your backend server URL.`
      );
    }

    if (!isLocalhost && !isCloudRun) {
      const pathname = window.location.pathname;
      if (pathname.includes('Jute-Purchase-Automation')) {
        return `/Jute-Purchase-Automation/${cleanPath}`;
      }
      return `/${cleanPath}`;
    }

    const pathname = window.location.pathname;
    if (pathname.includes('Jute-Purchase-Automation')) {
      return `/Jute-Purchase-Automation/${cleanPath}`;
    }
  }

  return `/${cleanPath}`;
}

export function formatDate(date?: string | Date | null): string {
  if (!date || String(date).trim() === '' || String(date).trim() === 'null' || String(date).trim() === 'undefined' || String(date).trim() === '-') {
    return 'DD-MM-YYYY';
  }
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) {
      const parts = String(date).trim().split(/[-/]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          // YYYY-MM-DD -> DD-MM-YYYY
          return `${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[0]}`;
        }
        return `${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[2]}`;
      }
      return 'DD-MM-YYYY';
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return 'DD-MM-YYYY';
  }
}

/**
 * Sanitizes data for CSV export to prevent Formula Injection Attacks (CSV Injection)
 * Escapes fields that start with '=', '+', '-', or '@'.
 */
export function sanitizeCsvData(data: any[]): any[] {
  if (!Array.isArray(data)) return data;
  
  return data.map(row => {
    if (typeof row !== 'object' || row === null) return row;
    
    const sanitizedRow: any = {};
    for (const key in row) {
      if (Object.prototype.hasOwnProperty.call(row, key)) {
        let value = row[key];
        
        if (typeof value === 'string' && /^[=+\-@]/.test(value)) {
          // Prepend with a single quote to force Excel/Calc to treat as text
          value = "'" + value;
        }
        
        sanitizedRow[key] = value;
      }
    }
    return sanitizedRow;
  });
}

import { getCurrentUserContext, isUserAdmin } from './permissions';

/**
 * Formats a number to Indian Accounting Number Format (Lakh / Crore system: 1,00,000 / 1,00,00,000).
 * Indian digit grouping: last 3 digits, then groups of 2 digits (e.g. ₹7,76,000, ₹12,50,000, ₹1,25,00,000).
 */
export function formatIndianNumber(
  val: number | string | null | undefined,
  decimals?: number
): string {
  if (val === null || val === undefined || val === '') return '0';
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));
  if (isNaN(num)) return '0';

  const isNeg = num < 0;
  const absNum = Math.abs(num);

  const decCount = decimals !== undefined ? decimals : (Number.isInteger(absNum) ? 0 : 2);
  const fixedStr = absNum.toFixed(decCount);
  const [intPart, decPart] = fixedStr.split('.');

  // Indian format: last 3 digits, then groups of 2 digits
  let result = '';
  if (intPart.length > 3) {
    const lastThree = intPart.substring(intPart.length - 3);
    const otherNumbers = intPart.substring(0, intPart.length - 3);
    const groupedOthers = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    result = `${groupedOthers},${lastThree}`;
  } else {
    result = intPart;
  }

  if (decPart && decPart.length > 0 && decCount > 0) {
    result = `${result}.${decPart}`;
  }

  return isNeg ? `-${result}` : result;
}

/**
 * Formats a currency amount with the Indian Rupee symbol (₹) and Indian number grouping.
 * E.g., 776000 -> ₹7,76,000, 834489 -> ₹8,34,489, 1250000 -> ₹12,50,000, 12500000 -> ₹1,25,00,000
 */
export function formatIndianCurrency(
  val: number | string | null | undefined,
  includeSymbol: boolean = true,
  decimals?: number
): string {
  const formatted = formatIndianNumber(val, decimals);
  return includeSymbol ? `₹${formatted}` : formatted;
}

/**
 * Formats a currency amount into Indian abbreviated format (K for Thousand, L for Lakh, C for Crore).
 * Examples:
 * - 1,000 -> ₹1K
 * - 25,000 -> ₹25K
 * - 1,00,000 -> ₹1L
 * - 1,50,000 -> ₹1.5L
 * - 3,85,172.61 -> ₹3.85L
 * - 1,00,00,000 -> ₹1C
 * - 35,75,22,000 -> ₹35.75C
 * - 38,46,50,515.01 -> ₹38.47C
 * - 2,71,28,515.01 -> ₹2.71C
 * - 500 -> ₹500
 * - 0 -> ₹0
 */
export function formatIndianCompactCurrency(
  val: number | string | null | undefined,
  includeSymbol: boolean = true,
  maxDecimals: number = 2
): string {
  if (val === null || val === undefined || val === '') return includeSymbol ? '₹0' : '0';
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));
  if (isNaN(num) || num === 0) return includeSymbol ? '₹0' : '0';

  const isNeg = num < 0;
  const absNum = Math.abs(num);

  let formattedNum = '';
  let suffix = '';

  if (absNum >= 10000000) {
    // 1 Crore = 10,000,000
    const valInCrores = absNum / 10000000;
    formattedNum = parseFloat(valInCrores.toFixed(maxDecimals)).toString();
    suffix = 'C';
  } else if (absNum >= 100000) {
    // 1 Lakh = 100,000
    const valInLakhs = absNum / 100000;
    formattedNum = parseFloat(valInLakhs.toFixed(maxDecimals)).toString();
    suffix = 'L';
  } else if (absNum >= 1000) {
    // 1 Thousand = 1,000
    const valInThousands = absNum / 1000;
    formattedNum = parseFloat(valInThousands.toFixed(maxDecimals)).toString();
    suffix = 'K';
  } else {
    // Below 1,000
    formattedNum = parseFloat(absNum.toFixed(maxDecimals)).toString();
    suffix = '';
  }

  const prefix = includeSymbol ? (isNeg ? '-₹' : '₹') : (isNeg ? '-' : '');
  return `${prefix}${formattedNum}${suffix}`;
}

/**
 * Calculates Paid Amount using FLOOR(amount / 1000) * 1000 to always round DOWN to the nearest ₹1,000.
 * Examples:
 * ₹7,76,074.77 -> ₹7,76,000
 * ₹7,76,499.99 -> ₹7,76,000
 * ₹7,76,999.99 -> ₹7,76,000
 * ₹7,76,001.00 -> ₹7,76,000
 * ₹7,76,000.00 -> ₹7,76,000
 */
export function calculateFloor1000(val: number | string | null | undefined): number {
  if (val === null || val === undefined || val === '') return 0;
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));
  if (isNaN(num) || num <= 0) return 0;
  return Math.floor(num / 1000) * 1000;
}

/**
 * Calculates default 93% Paid Amount rounded to the nearest integer.
 * Formula: Math.round(Payable Net Amount * 0.93)
 */
export function calculate93PctPaidAmount(payableAmt: number | string | null | undefined): number {
  if (payableAmt === null || payableAmt === undefined || payableAmt === '') return 0;
  const num = typeof payableAmt === 'number' ? payableAmt : parseFloat(String(payableAmt).replace(/,/g, ''));
  if (isNaN(num) || num <= 0) return 0;
  const raw93 = num * 0.93;
  return Math.round(raw93);
}

export function canDeleteData(): boolean {
  const ctx = getCurrentUserContext();
  if (isUserAdmin(ctx)) return true;
  const role = (ctx?.userRole || (ctx as any)?.role || '').toUpperCase();
  const level = (ctx?.userLevel || (ctx as any)?.level || '').toUpperCase();
  return role === 'ADMIN' || role === 'ADMINISTRATOR' || level === 'ADMIN' || level === 'MAX' || Boolean((ctx as any)?.isAdmin);
}

export function canApproveMismatch(): boolean {
  const ctx = getCurrentUserContext();
  if (isUserAdmin(ctx)) return true;
  const role = (ctx?.userRole || (ctx as any)?.role || '').toUpperCase();
  const level = (ctx?.userLevel || (ctx as any)?.level || '').toUpperCase();
  const username = (ctx?.username || ctx?.userName || '').toUpperCase();
  return (
    role === 'ADMIN' ||
    role === 'ADMINISTRATOR' ||
    username === 'ADMIN' ||
    level === 'L3' ||
    level === 'L4' ||
    level === 'L5' ||
    level === 'MAX' ||
    level === 'ADMIN' ||
    level === 'ADMINISTRATOR' ||
    Boolean((ctx as any)?.isAdmin)
  );
}

/**
 * Safely parses any number, returning a fallback finite number.
 * Never returns NaN or Infinity.
 */
export function safeNum(val: any, fallback: number = 0): number {
  if (val === null || val === undefined || val === '') return fallback;
  if (typeof val === 'number') {
    return isFinite(val) ? val : fallback;
  }
  const cleanStr = String(val).replace(/,/g, '').trim();
  const parsed = parseFloat(cleanStr);
  return isFinite(parsed) ? parsed : fallback;
}

/**
 * Safely converts any value to fixed decimals string, never returning 'NaN'.
 */
export function safeFixed(val: any, decimals: number = 2, fallback: string = '0.00'): string {
  const num = safeNum(val, NaN);
  if (isNaN(num)) return fallback;
  return num.toFixed(decimals);
}

/**
 * Safely parses JSON with fallback, immune to SyntaxError or corrupted storage.
 */
export function safeJsonParse<T>(jsonStr: any, fallback: T): T {
  if (!jsonStr) return fallback;
  if (typeof jsonStr !== 'string') {
    return typeof jsonStr === 'object' ? (jsonStr as T) : fallback;
  }
  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    return fallback;
  }
}

/**
 * Robust Date Sanitizer for PostgreSQL DATE columns.
 * Prevents 400 (Bad Request) errors caused by empty strings, formatted placeholder dates, or invalid date values.
 * Returns ISO YYYY-MM-DD or null.
 */
export function sanitizeDate(val: any): string | null {
  if (val === null || val === undefined) return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val.toISOString().split('T')[0];
  }
  const str = String(val).trim();
  if (!str || str === '' || str === '-' || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined' || str.toLowerCase() === 'dd-mm-yyyy' || str.toLowerCase() === 'nan-nan-nan') {
    return null;
  }
  // Check DD-MM-YYYY or DD/MM/YYYY
  const ddmmyyyy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (ddmmyyyy) {
    const d = ddmmyyyy[1].padStart(2, '0');
    const m = ddmmyyyy[2].padStart(2, '0');
    const y = ddmmyyyy[3];
    return `${y}-${m}-${d}`;
  }
  // Check YYYY-MM-DD or YYYY/MM/DD
  const yyyymmdd = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (yyyymmdd) {
    const y = yyyymmdd[1];
    const m = yyyymmdd[2].padStart(2, '0');
    const d = yyyymmdd[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString().split('T')[0];
}

