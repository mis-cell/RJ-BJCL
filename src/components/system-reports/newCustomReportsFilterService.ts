import { ReportFilterCriteria } from "./SimpleReportView";

export const parseDateObj = (dateVal: any): Date | null => {
  if (!dateVal) return null;
  const str = String(dateVal).trim();
  if (!str) return null;

  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(str)) {
    const parts = str.split('T')[0].split(/[-/]/);
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}/.test(str)) {
    const parts = str.split('T')[0].split(/[-/]/);
    return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
};

export const matchesFilters = (
  dateStr: string | undefined,
  supplier: string | undefined,
  broker: string | undefined,
  area: string | undefined,
  agency: string | undefined,
  poNo: string | undefined,
  mrNo: string | undefined,
  filters?: ReportFilterCriteria,
  localQuery?: string
): boolean => {
  // 1. Text Search
  const q = (localQuery || filters?.searchQuery || '').trim().toLowerCase();
  if (q) {
    const combined = [poNo, mrNo, supplier, broker, area, agency].filter(Boolean).join(' ').toLowerCase();
    if (!combined.includes(q)) return false;
  }

  if (!filters) return true;

  // 2. Filter dropdowns
  if (filters.supplier && supplier && !supplier.toLowerCase().includes(filters.supplier.toLowerCase())) return false;
  if (filters.broker && broker && !broker.toLowerCase().includes(filters.broker.toLowerCase())) return false;
  if (filters.area && area && !area.toLowerCase().includes(filters.area.toLowerCase())) return false;
  if (filters.agency && agency && !agency.toLowerCase().includes(filters.agency.toLowerCase())) return false;
  if (filters.po && poNo && !poNo.toLowerCase().includes(filters.po.toLowerCase())) return false;

  // 3. Date / Month / Financial Year
  if (!dateStr) return true;
  const recordDate = parseDateObj(dateStr);
  if (!recordDate) return true;

  // Month Filter (e.g. "2026-08" or "08" or "8")
  if (filters.month) {
    const fMonth = filters.month.trim();
    const yr = recordDate.getFullYear();
    const mo = String(recordDate.getMonth() + 1).padStart(2, '0');
    const yyyyMm = `${yr}-${mo}`;
    if (fMonth.includes('-')) {
      if (yyyyMm !== fMonth) return false;
    } else {
      if (mo !== fMonth.padStart(2, '0')) return false;
    }
  }

  // Financial Year Filter
  if (filters.financialYear) {
    const fyStr = filters.financialYear.trim();
    const month = recordDate.getMonth() + 1;
    const year = recordDate.getFullYear();
    const startFy = month >= 4 ? year : year - 1;
    if (!fyStr.includes(String(startFy))) return false;
  }

  // Date From Filter
  if (filters.dateFrom) {
    const fromDate = parseDateObj(filters.dateFrom);
    if (fromDate) {
      fromDate.setHours(0, 0, 0, 0);
      const d = new Date(recordDate);
      d.setHours(0, 0, 0, 0);
      if (d < fromDate) return false;
    }
  }

  // Date To Filter
  if (filters.dateTo) {
    const toDate = parseDateObj(filters.dateTo);
    if (toDate) {
      toDate.setHours(23, 59, 59, 999);
      if (recordDate > toDate) return false;
    }
  }

  return true;
};
