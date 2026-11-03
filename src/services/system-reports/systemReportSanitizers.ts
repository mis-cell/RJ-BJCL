// Sanitization and validation constants and functions for System Reports

export const INVALID_AGENCY_SET = new Set([
  '-', 'DRUMS', 'LOOSE', 'BALES', 'DRUM', 'LOOSE JUTE', 'UNASSIGNED', 'N/A', 'NONE', 'DIRECT', 'BALES/LOOSE', 'LOOSE/DRUMS', 'NO AGENCY', ''
]);

export function isInvalidAgency(agencyStr?: string | null): boolean {
  if (!agencyStr) return true;
  const clean = String(agencyStr).trim().toUpperCase();
  if (!clean || clean === '-') return true;
  if (INVALID_AGENCY_SET.has(clean)) return true;
  if (clean.includes('DRUM') || clean.includes('LOOSE') || clean.includes('BALE')) return true;
  return false;
}

export const INVALID_AREA_SET = new Set([
  '-', '—', '--', 'UNASSIGNED', 'UNASSIGNED AREA', 'N/A', 'NONE', 'NO AREA', 'NULL', 'UNDEFINED', ''
]);

export function isInvalidArea(areaStr?: string | null): boolean {
  if (!areaStr) return true;
  const clean = String(areaStr).trim().toUpperCase();
  if (!clean || clean === '-' || clean === '—' || clean === '--') return true;
  if (INVALID_AREA_SET.has(clean)) return true;
  return false;
}

// Helper to normalize any date string format to standard YYYY-MM-DD
export function normalizeToISODate(dateStr?: string | null): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  const clean = String(dateStr).trim();
  if (!clean) return new Date().toISOString().split('T')[0];

  if (clean.includes('T')) {
    const part = clean.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(part)) return part;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  const dmyMatch = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  const ymdSlash = clean.match(/^(\d{4})[\/](\d{1,2})[\/](\d{1,2})$/);
  if (ymdSlash) {
    const year = ymdSlash[1];
    const month = ymdSlash[2].padStart(2, '0');
    const day = ymdSlash[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return new Date().toISOString().split('T')[0];
}

export function getTodayISODate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseJsonItems(itemsField: any): any[] {
  if (!itemsField) return [];
  if (Array.isArray(itemsField)) return itemsField;
  if (typeof itemsField === 'string') {
    try {
      const parsed = JSON.parse(itemsField);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  return [];
}

// Helper to determine financial year
export function getFinancialYear(dateStr: string): string {
  const iso = normalizeToISODate(dateStr);
  const parts = iso.split('-');
  const year = parseInt(parts[0], 10) || 2026;
  const month = parseInt(parts[1], 10) || 9;
  if (month >= 4) {
    return `${year}-${year + 1}`;
  } else {
    return `${year - 1}-${year}`;
  }
}

export function getYearMonth(dateStr: string): string {
  const iso = normalizeToISODate(dateStr);
  return iso.substring(0, 7) || '2026-09';
}
