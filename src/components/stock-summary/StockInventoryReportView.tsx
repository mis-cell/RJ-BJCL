import React, { useMemo, useState } from 'react';
import Papa from 'papaparse';
import {
  FileSpreadsheet,
  Printer,
  Search,
  RefreshCw,
  RotateCcw,
  Calendar,
  MapPin,
  Building2,
  Warehouse,
  Layers,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { cn, sanitizeCsvData } from '../../lib/utils';
import { PaginationControls } from '../PaginationControls';
import PrintModal from '../PrintModal';
import { StockReportDimension } from './types';

export type PackingBucket = 'BALES' | 'LOOSE' | 'P.BALES' | 'H.BALES' | 'DRUMS' | 'OTHER';
export type StockFlowFilter = 'ALL' | 'OPENING' | 'INWARD' | 'OUTWARD';

export interface StockInventoryReportViewProps {
  openingStocks: any[];
  millIssueMasters: any[];
  millIssueDetails: any[];
  godowns: any[];
  areas: any[];
  agencies: any[];
  loading: boolean;
  onReload: () => void;
}

interface NormalizedStockEntry {
  id: string;
  source: 'OPENING' | 'INWARD' | 'OUTWARD';
  sign: 1 | -1;
  date: string;
  monthKey: string;
  monthLabel: string;
  refNo: string;
  godown: string;
  area: string;
  agency: string;
  grade: string;
  marka: string;
  rawUnit: string;
  packing: PackingBucket;
  qty: number;
  weightKg: number;
}

interface AggregatedReportRow {
  key: string;
  label: string;
  subLabel?: string;
  entriesCount: number;
  bales: number;
  loose: number;
  pBales: number;
  hBales: number;
  drums: number;
  other: number;
  openingQty: number;
  inwardQty: number;
  outwardQty: number;
  netQty: number;
  weightKg: number;
  entries: NormalizedStockEntry[];
}

const PACKING_META: Record<PackingBucket, { label: string; shortLabel: string; badgeClass: string }> = {
  BALES: {
    label: 'Bales',
    shortLabel: 'Bales',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200'
  },
  LOOSE: {
    label: 'Lose (Loose)',
    shortLabel: 'Lose',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200'
  },
  'P.BALES': {
    label: 'P Bell (P.Bales)',
    shortLabel: 'P Bell',
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200'
  },
  'H.BALES': {
    label: 'H Bell (H.Bales)',
    shortLabel: 'H Bell',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200'
  },
  DRUMS: {
    label: 'Drum Wise (Drums)',
    shortLabel: 'Drum',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200'
  },
  OTHER: {
    label: 'Other Packing',
    shortLabel: 'Other',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200'
  }
};

function classifyPackingUnit(rawUnit: any): PackingBucket {
  const norm = String(rawUnit || '')
    .toUpperCase()
    .trim()
    .replace(/[\s._-]+/g, '');
  if (!norm) return 'BALES';
  if (
    norm === 'PBALES' ||
    norm === 'PBALE' ||
    norm === 'PBELL' ||
    norm === 'PB' ||
    norm === 'PUCCA' ||
    norm === 'PUCCABALES'
  ) {
    return 'P.BALES';
  }
  if (
    norm === 'HBALES' ||
    norm === 'HBALE' ||
    norm === 'HBELL' ||
    norm === 'HB' ||
    norm === 'HALF' ||
    norm === 'HALFBALES'
  ) {
    return 'H.BALES';
  }
  if (norm.includes('DRUM') || norm === 'DRM') {
    return 'DRUMS';
  }
  if (norm.includes('LOOSE') || norm.includes('LOSE') || norm === 'LSE') {
    return 'LOOSE';
  }
  if (norm.includes('BALE') || norm === 'BLS') {
    return 'BALES';
  }
  return 'OTHER';
}

function normalizeDateIso(rawDate: any): string {
  const s = String(rawDate || '').trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function formatMonthLabel(monthKey: string): string {
  if (!monthKey || monthKey === 'NO-DATE') return 'NO DATE / UNDATED';
  const [y, m] = monthKey.split('-').map(Number);
  if (!y || !m) return monthKey;
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }).toUpperCase();
}

function formatDateDisplay(isoDate: string): string {
  if (!isoDate || isoDate === 'NO-DATE') return 'No Date';
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3) return isoDate;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  if (isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatQty(val: number): string {
  if (!val) return '0';
  return Number.isInteger(val) ? val.toLocaleString('en-IN') : val.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function formatKg(val: number): string {
  return val.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatMt(kg: number): string {
  return (kg / 1000).toFixed(3);
}

export const StockInventoryReportView: React.FC<StockInventoryReportViewProps> = ({
  openingStocks,
  millIssueMasters,
  millIssueDetails,
  godowns,
  areas,
  agencies,
  loading,
  onReload
}) => {
  const [dimension, setDimension] = useState<StockReportDimension>('month');
  const [packingFilter, setPackingFilter] = useState<'ALL' | PackingBucket>('ALL');
  const [flowFilter, setFlowFilter] = useState<StockFlowFilter>('ALL');
  const [monthFilter, setMonthFilter] = useState<string>('ALL');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [areaFilter, setAreaFilter] = useState<string>('ALL');
  const [agencyFilter, setAgencyFilter] = useState<string>('ALL');
  const [godownFilter, setGodownFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});
  const [ledgerPage, setLedgerPage] = useState<number>(1);
  const [ledgerPageSize, setLedgerPageSize] = useState<number>(100);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // Build unified normalized stock movements from Opening Stock + Issue to Godown (+) + Godown to Factory (-)
  const allEntries = useMemo<NormalizedStockEntry[]>(() => {
    const entries: NormalizedStockEntry[] = [];

    // 1. Opening Stocks (opening_stock + godown_wise_stock)
    openingStocks.forEach((r, idx) => {
      const date = normalizeDateIso(r.opening_date || r.stock_date);
      const monthKey = date ? date.slice(0, 7) : 'NO-DATE';
      const rawUnit = String(r.unit || 'BALES').trim().toUpperCase();
      const jciYes = String(r.jci || '').trim().toUpperCase() === 'YES';
      const agencyVal = String(r.agency || r.agency_name || r.party_name || '')
        .trim()
        .toUpperCase();

      entries.push({
        id: `op-${r.id || idx}`,
        source: 'OPENING',
        sign: 1,
        date: date || 'NO-DATE',
        monthKey,
        monthLabel: formatMonthLabel(monthKey),
        refNo: r.id ? `OP-${String(r.id).slice(0, 6).toUpperCase()}` : 'OPENING',
        godown: String(r.godown || 'UNASSIGNED').trim().toUpperCase() || 'UNASSIGNED',
        area: String(r.area || 'UNASSIGNED').trim().toUpperCase() || 'UNASSIGNED',
        agency: agencyVal || (jciYes ? 'JCI (GOVT)' : 'OPENING / DIRECT'),
        grade: String(r.grade || 'UNASSIGNED').trim().toUpperCase() || 'UNASSIGNED',
        marka: String(r.marka || '-').trim().toUpperCase() || '-',
        rawUnit: rawUnit || 'BALES',
        packing: classifyPackingUnit(rawUnit),
        qty: Number(r.quantity) || 0,
        weightKg: (Number(r.weight) || 0) * 100 // opening_stock.weight stored in Quintals
      });
    });

    // 2. Mill Issue Masters lookup
    const masterMap = new Map<string, any>();
    millIssueMasters.forEach((m) => {
      const key = String(m.issue_no || '').trim().toUpperCase();
      if (key) masterMap.set(key, m);
    });

    // 3. Mill Issue Details (INWARD = Issue to Godown, OUTWARD = Godown to Factory)
    millIssueDetails.forEach((d, idx) => {
      const issueKey = String(d.issue_no || '').trim().toUpperCase();
      const m = masterMap.get(issueKey);
      if (!m) return;

      const issueType = String(m.issue_type || '').trim().toUpperCase();
      let source: 'INWARD' | 'OUTWARD' | null = null;
      let sign: 1 | -1 = 1;

      if (issueType === 'GODOWN') {
        source = 'INWARD';
        sign = 1;
      } else if (issueType === 'FACTORY' || issueType === 'FACTORY ISSUE' || issueType === 'SELL') {
        source = 'OUTWARD';
        sign = -1;
      }
      if (!source) return;

      const date = normalizeDateIso(m.date || d.date);
      const monthKey = date ? date.slice(0, 7) : 'NO-DATE';
      const rawUnit = String(d.unit || 'BALES').trim().toUpperCase();
      const agencyVal = String(d.agency || m.party_name || '').trim().toUpperCase();

      entries.push({
        id: `mi-${d.id || idx}-${issueKey}`,
        source,
        sign,
        date: date || 'NO-DATE',
        monthKey,
        monthLabel: formatMonthLabel(monthKey),
        refNo: String(d.issue_no || m.issue_no || '-').trim().toUpperCase(),
        godown: String(m.godown || d.godown || 'UNASSIGNED').trim().toUpperCase() || 'UNASSIGNED',
        area: String(d.area || m.area || 'UNASSIGNED').trim().toUpperCase() || 'UNASSIGNED',
        agency: agencyVal || 'UNASSIGNED AGENCY',
        grade: String(d.grade_name || d.grade || 'UNASSIGNED').trim().toUpperCase() || 'UNASSIGNED',
        marka: String(d.marka || '-').trim().toUpperCase() || '-',
        rawUnit: rawUnit || 'BALES',
        packing: classifyPackingUnit(rawUnit),
        qty: Number(d.qty) || 0,
        weightKg: Number(d.weight_kgs) || 0
      });
    });

    // Sort newest date first
    entries.sort((a, b) => b.date.localeCompare(a.date));
    return entries;
  }, [openingStocks, millIssueMasters, millIssueDetails]);

  // Dynamic dropdown option lists (combining Masters + live data so nothing is missed)
  const filterOptions = useMemo(() => {
    const monthSet = new Set<string>();
    const areaSet = new Set<string>();
    const agencySet = new Set<string>();
    const godownSet = new Set<string>();

    areas.forEach((a) => {
      const val = String(a.area_name || a.name || '').trim().toUpperCase();
      if (val) areaSet.add(val);
    });
    agencies.forEach((ag) => {
      const val = String(ag.agency_name || ag.name || '').trim().toUpperCase();
      if (val) agencySet.add(val);
    });
    godowns.forEach((g) => {
      const val = String(g.gdn_name || g.name || g.gdn_code || '').trim().toUpperCase();
      if (val) godownSet.add(val);
    });

    allEntries.forEach((e) => {
      if (e.monthKey && e.monthKey !== 'NO-DATE') monthSet.add(e.monthKey);
      if (e.area) areaSet.add(e.area);
      if (e.agency) agencySet.add(e.agency);
      if (e.godown) godownSet.add(e.godown);
    });

    return {
      months: Array.from(monthSet).sort((a, b) => b.localeCompare(a)),
      areas: Array.from(areaSet).sort(),
      agencies: Array.from(agencySet).sort(),
      godowns: Array.from(godownSet).sort()
    };
  }, [allEntries, areas, agencies, godowns]);

  // Filter entries BEFORE packing bucket filter (so top packing KPI cards reflect active Date/Month/Area/Agency/Godown/Flow/Search)
  const contextFilteredEntries = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return allEntries.filter((e) => {
      if (flowFilter !== 'ALL' && e.source !== flowFilter) return false;
      if (monthFilter !== 'ALL' && e.monthKey !== monthFilter) return false;
      if (fromDate && (e.date === 'NO-DATE' || e.date < fromDate)) return false;
      if (toDate && (e.date === 'NO-DATE' || e.date > toDate)) return false;
      if (areaFilter !== 'ALL' && e.area !== areaFilter) return false;
      if (agencyFilter !== 'ALL' && e.agency !== agencyFilter) return false;
      if (godownFilter !== 'ALL' && e.godown !== godownFilter) return false;

      if (q) {
        const matches =
          e.date.toLowerCase().includes(q) ||
          e.monthLabel.toLowerCase().includes(q) ||
          e.refNo.toLowerCase().includes(q) ||
          e.godown.toLowerCase().includes(q) ||
          e.area.toLowerCase().includes(q) ||
          e.agency.toLowerCase().includes(q) ||
          e.grade.toLowerCase().includes(q) ||
          e.marka.toLowerCase().includes(q) ||
          e.rawUnit.toLowerCase().includes(q) ||
          PACKING_META[e.packing].label.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [allEntries, flowFilter, monthFilter, fromDate, toDate, areaFilter, agencyFilter, godownFilter, searchQuery]);

  // Final filtered entries (also applying selected packing card/dropdown)
  const filteredEntries = useMemo(() => {
    if (packingFilter === 'ALL') return contextFilteredEntries;
    return contextFilteredEntries.filter((e) => e.packing === packingFilter);
  }, [contextFilteredEntries, packingFilter]);

  // Top KPI Packing Summary Totals (uses contextFilteredEntries so clicking any card filters without zeroing sibling cards!)
  const packingSummaryCards = useMemo(() => {
    const init = () => ({ qty: 0, kg: 0, opening: 0, inward: 0, outward: 0, count: 0 });
    const buckets: Record<'ALL' | PackingBucket, ReturnType<typeof init>> = {
      ALL: init(),
      BALES: init(),
      LOOSE: init(),
      'P.BALES': init(),
      'H.BALES': init(),
      DRUMS: init(),
      OTHER: init()
    };

    const getMultiplier = (e: NormalizedStockEntry) => (flowFilter === 'OUTWARD' ? 1 : e.sign);

    contextFilteredEntries.forEach((e) => {
      const m = getMultiplier(e);
      const targetBuckets: ('ALL' | PackingBucket)[] = ['ALL', e.packing];
      targetBuckets.forEach((b) => {
        buckets[b].count += 1;
        buckets[b].qty += e.qty * m;
        buckets[b].kg += e.weightKg * m;
        if (e.source === 'OPENING') buckets[b].opening += e.qty;
        if (e.source === 'INWARD') buckets[b].inward += e.qty;
        if (e.source === 'OUTWARD') buckets[b].outward += e.qty;
      });
    });

    return buckets;
  }, [contextFilteredEntries, flowFilter]);

  // Aggregate filtered entries by selected report dimension
  const aggregatedRows = useMemo<AggregatedReportRow[]>(() => {
    if (dimension === 'ledger') return [];

    const map = new Map<string, AggregatedReportRow>();
    const useSignedEffect = flowFilter === 'ALL';

    const ensureUnitRows = () => {
      if (dimension === 'unit') {
        (['BALES', 'LOOSE', 'P.BALES', 'H.BALES', 'DRUMS'] as PackingBucket[]).forEach((bucket) => {
          if (packingFilter !== 'ALL' && packingFilter !== bucket) return;
          map.set(bucket, {
            key: bucket,
            label: PACKING_META[bucket].label,
            subLabel: bucket,
            entriesCount: 0,
            bales: 0,
            loose: 0,
            pBales: 0,
            hBales: 0,
            drums: 0,
            other: 0,
            openingQty: 0,
            inwardQty: 0,
            outwardQty: 0,
            netQty: 0,
            weightKg: 0,
            entries: []
          });
        });
      }
    };
    ensureUnitRows();

    filteredEntries.forEach((e) => {
      let key = '';
      let label = '';
      let subLabel: string | undefined;

      switch (dimension) {
        case 'month':
          key = e.monthKey;
          label = e.monthLabel;
          subLabel = e.monthKey !== 'NO-DATE' ? e.monthKey : undefined;
          break;
        case 'date':
          key = e.date;
          label = formatDateDisplay(e.date);
          subLabel = e.date !== 'NO-DATE' ? e.date : undefined;
          break;
        case 'area':
          key = e.area;
          label = e.area;
          break;
        case 'agency':
          key = e.agency;
          label = e.agency;
          break;
        case 'godown':
          key = e.godown;
          label = e.godown;
          break;
        case 'unit':
          key = e.packing;
          label = PACKING_META[e.packing].label;
          subLabel = e.packing;
          break;
      }

      if (!map.has(key)) {
        map.set(key, {
          key,
          label,
          subLabel,
          entriesCount: 0,
          bales: 0,
          loose: 0,
          pBales: 0,
          hBales: 0,
          drums: 0,
          other: 0,
          openingQty: 0,
          inwardQty: 0,
          outwardQty: 0,
          netQty: 0,
          weightKg: 0,
          entries: []
        });
      }

      const row = map.get(key)!;
      const mult = useSignedEffect ? e.sign : 1;
      const effectiveQty = e.qty * mult;
      const effectiveKg = e.weightKg * mult;

      row.entriesCount += 1;
      row.entries.push(e);
      if (e.packing === 'BALES') row.bales += effectiveQty;
      else if (e.packing === 'LOOSE') row.loose += effectiveQty;
      else if (e.packing === 'P.BALES') row.pBales += effectiveQty;
      else if (e.packing === 'H.BALES') row.hBales += effectiveQty;
      else if (e.packing === 'DRUMS') row.drums += effectiveQty;
      else row.other += effectiveQty;

      if (e.source === 'OPENING') row.openingQty += e.qty;
      else if (e.source === 'INWARD') row.inwardQty += e.qty;
      else if (e.source === 'OUTWARD') row.outwardQty += e.qty;

      row.netQty += effectiveQty;
      row.weightKg += effectiveKg;
    });

    const list = Array.from(map.values());
    if (dimension === 'month' || dimension === 'date') {
      list.sort((a, b) => b.key.localeCompare(a.key));
    } else if (dimension === 'unit') {
      const order: Record<string, number> = { BALES: 1, LOOSE: 2, 'P.BALES': 3, 'H.BALES': 4, DRUMS: 5, OTHER: 6 };
      list.sort((a, b) => (order[a.key] || 99) - (order[b.key] || 99));
    } else {
      list.sort((a, b) => Math.abs(b.weightKg) - Math.abs(a.weightKg) || a.label.localeCompare(b.label));
    }
    return list;
  }, [filteredEntries, dimension, flowFilter, packingFilter]);

  // Grand Totals for filtered entries
  const grandTotals = useMemo(() => {
    const useSignedEffect = flowFilter === 'ALL';
    return filteredEntries.reduce(
      (acc, e) => {
        const mult = useSignedEffect ? e.sign : 1;
        const eq = e.qty * mult;
        const ek = e.weightKg * mult;
        acc.entriesCount += 1;
        if (e.packing === 'BALES') acc.bales += eq;
        else if (e.packing === 'LOOSE') acc.loose += eq;
        else if (e.packing === 'P.BALES') acc.pBales += eq;
        else if (e.packing === 'H.BALES') acc.hBales += eq;
        else if (e.packing === 'DRUMS') acc.drums += eq;
        else acc.other += eq;

        if (e.source === 'OPENING') acc.openingQty += e.qty;
        else if (e.source === 'INWARD') acc.inwardQty += e.qty;
        else if (e.source === 'OUTWARD') acc.outwardQty += e.qty;

        acc.netQty += eq;
        acc.weightKg += ek;
        return acc;
      },
      {
        entriesCount: 0,
        bales: 0,
        loose: 0,
        pBales: 0,
        hBales: 0,
        drums: 0,
        other: 0,
        openingQty: 0,
        inwardQty: 0,
        outwardQty: 0,
        netQty: 0,
        weightKg: 0
      }
    );
  }, [filteredEntries, flowFilter]);

  const handleResetFilters = () => {
    setPackingFilter('ALL');
    setFlowFilter('ALL');
    setMonthFilter('ALL');
    setFromDate('');
    setToDate('');
    setAreaFilter('ALL');
    setAgencyFilter('ALL');
    setGodownFilter('ALL');
    setSearchQuery('');
    setLedgerPage(1);
  };

  const hasActiveFilters =
    packingFilter !== 'ALL' ||
    flowFilter !== 'ALL' ||
    monthFilter !== 'ALL' ||
    fromDate !== '' ||
    toDate !== '' ||
    areaFilter !== 'ALL' ||
    agencyFilter !== 'ALL' ||
    godownFilter !== 'ALL' ||
    searchQuery.trim() !== '';

  const dimensionTitleMap: Record<StockReportDimension, string> = {
    month: 'Month Wise Full Stock Report',
    date: 'Date Wise Stock Report',
    area: 'Area Wise Stock Report',
    agency: 'Agency Wise Stock Report',
    godown: 'Godown Wise Stock Report',
    unit: 'Unit & Drum Wise Stock Report (Bales / Lose / P Bell / H Bell / Drum)',
    ledger: 'Complete Stock Transaction Ledger'
  };

  const handleExportCSV = () => {
    if (filteredEntries.length === 0) {
      alert('No stock report rows available for the current filters.');
      return;
    }

    let rowsToExport: any[] = [];
    if (dimension === 'ledger') {
      rowsToExport = filteredEntries.map((e) => ({
        Date: e.date,
        Month: e.monthLabel,
        Movement: e.source,
        'Ref / Issue No': e.refNo,
        Godown: e.godown,
        Area: e.area,
        Agency: e.agency,
        Grade: e.grade,
        'Packing Unit': PACKING_META[e.packing].shortLabel,
        'Raw Unit': e.rawUnit,
        Bales: e.packing === 'BALES' ? e.qty * (flowFilter === 'ALL' ? e.sign : 1) : 0,
        Lose: e.packing === 'LOOSE' ? e.qty * (flowFilter === 'ALL' ? e.sign : 1) : 0,
        'P Bell': e.packing === 'P.BALES' ? e.qty * (flowFilter === 'ALL' ? e.sign : 1) : 0,
        'H Bell': e.packing === 'H.BALES' ? e.qty * (flowFilter === 'ALL' ? e.sign : 1) : 0,
        Drum: e.packing === 'DRUMS' ? e.qty * (flowFilter === 'ALL' ? e.sign : 1) : 0,
        'Net Qty': e.qty * (flowFilter === 'ALL' ? e.sign : 1),
        'Weight (KG)': Number((e.weightKg * (flowFilter === 'ALL' ? e.sign : 1)).toFixed(2)),
        'Weight (MT)': Number(((e.weightKg * (flowFilter === 'ALL' ? e.sign : 1)) / 1000).toFixed(3))
      }));
    } else {
      rowsToExport = aggregatedRows.map((row) => ({
        [dimension.toUpperCase()]: row.label,
        Entries: row.entriesCount,
        Bales: row.bales,
        Lose: row.loose,
        'P Bell (P.Bales)': row.pBales,
        'H Bell (H.Bales)': row.hBales,
        Drum: row.drums,
        'Opening Qty': row.openingQty,
        'Inward (+) Qty': row.inwardQty,
        'Outward (-) Qty': row.outwardQty,
        'Net Qty': row.netQty,
        'Weight (KG)': Number(row.weightKg.toFixed(2)),
        'Weight (MT)': Number((row.weightKg / 1000).toFixed(3))
      }));
      rowsToExport.push({
        [dimension.toUpperCase()]: 'GRAND TOTAL',
        Entries: grandTotals.entriesCount,
        Bales: grandTotals.bales,
        Lose: grandTotals.loose,
        'P Bell (P.Bales)': grandTotals.pBales,
        'H Bell (H.Bales)': grandTotals.hBales,
        Drum: grandTotals.drums,
        'Opening Qty': grandTotals.openingQty,
        'Inward (+) Qty': grandTotals.inwardQty,
        'Outward (-) Qty': grandTotals.outwardQty,
        'Net Qty': grandTotals.netQty,
        'Weight (KG)': Number(grandTotals.weightKg.toFixed(2)),
        'Weight (MT)': Number((grandTotals.weightKg / 1000).toFixed(3))
      });
    }

    try {
      const sanitized = sanitizeCsvData(rowsToExport);
      const csv = '\uFEFF' + Papa.unparse(sanitized);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Stock_Report_${dimension}_wise_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to export report CSV:', err);
      alert('Failed to export stock report CSV.');
    }
  };

  const packingCardsConfig: {
    id: 'ALL' | PackingBucket;
    title: string;
    subtitle: string;
    accent: string;
    activeRing: string;
  }[] = [
    {
      id: 'ALL',
      title: 'All Stock Units',
      subtitle: 'Combined Stock',
      accent: 'border-l-4 border-l-slate-800',
      activeRing: 'ring-2 ring-slate-800 bg-slate-50'
    },
    {
      id: 'BALES',
      title: 'Bales',
      subtitle: 'Standard Bales',
      accent: 'border-l-4 border-l-blue-600',
      activeRing: 'ring-2 ring-blue-600 bg-blue-50/60'
    },
    {
      id: 'LOOSE',
      title: 'Lose (Loose)',
      subtitle: 'Loose Jute',
      accent: 'border-l-4 border-l-amber-500',
      activeRing: 'ring-2 ring-amber-500 bg-amber-50/60'
    },
    {
      id: 'P.BALES',
      title: 'P Bell',
      subtitle: 'P.Bales / Pucca',
      accent: 'border-l-4 border-l-indigo-600',
      activeRing: 'ring-2 ring-indigo-600 bg-indigo-50/60'
    },
    {
      id: 'H.BALES',
      title: 'H Bell',
      subtitle: 'H.Bales / Half',
      accent: 'border-l-4 border-l-purple-600',
      activeRing: 'ring-2 ring-purple-600 bg-purple-50/60'
    },
    {
      id: 'DRUMS',
      title: 'Drum Wise',
      subtitle: 'Drums Packing',
      accent: 'border-l-4 border-l-teal-600',
      activeRing: 'ring-2 ring-teal-600 bg-teal-50/60'
    }
  ];

  const dimensionTabs: { id: StockReportDimension; icon: string; label: string }[] = [
    { id: 'month', icon: '📅', label: 'Month Wise' },
    { id: 'date', icon: '📆', label: 'Date Wise' },
    { id: 'area', icon: '📍', label: 'Area Wise' },
    { id: 'agency', icon: '🏢', label: 'Agency Wise' },
    { id: 'godown', icon: '🏛️', label: 'Godown Wise' },
    { id: 'unit', icon: '🛢️', label: 'Drum & Unit Wise' },
    { id: 'ledger', icon: '📑', label: 'Full Ledger' }
  ];

  return (
    <div className="space-y-3 animate-in fade-in duration-150">
      {/* 1. Packing Summary KPI Cards (Click to filter Bales / Lose / P Bell / H Bell / Drum) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {packingCardsConfig.map((card) => {
          const stats = packingSummaryCards[card.id];
          const isSelected = packingFilter === card.id;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => {
                setPackingFilter(isSelected && card.id !== 'ALL' ? 'ALL' : card.id);
                setLedgerPage(1);
              }}
              className={cn(
                'text-left bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm hover:shadow-md transition-all cursor-pointer',
                card.accent,
                isSelected && card.activeRing
              )}
              title={`Click to filter by ${card.title}`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-black uppercase tracking-wide text-slate-700 truncate">
                  {card.title}
                </span>
                <span className="text-[8px] font-extrabold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                  {stats.count}
                </span>
              </div>
              <div className="mt-1 flex items-baseline justify-between gap-1">
                <span className="text-lg font-black font-mono text-slate-900 tabular-nums">
                  {formatQty(stats.qty)}
                </span>
                <span className="text-[10px] font-black font-mono text-emerald-700">
                  {formatMt(stats.kg)} MT
                </span>
              </div>
              <div className="mt-1 pt-1 border-t border-slate-100 flex items-center justify-between text-[8px] font-bold text-slate-500">
                <span>{card.subtitle}</span>
                <span>{formatKg(stats.kg)} KG</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* 2. Action Toolbar + Report Dimension Tabs */}
      <div className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-sm space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Dimension Tabs */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            {dimensionTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setDimension(tab.id);
                  setExpandedKeys({});
                  setLedgerPage(1);
                }}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wide transition-all cursor-pointer',
                  dimension === tab.id
                    ? 'bg-[#1c4587] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                )}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Right Toolbar Actions */}
          <div className="flex flex-wrap items-center gap-1.5">
            {dimension !== 'ledger' && aggregatedRows.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const next: Record<string, boolean> = {};
                    aggregatedRows.forEach((r) => {
                      next[r.key] = true;
                    });
                    setExpandedKeys(next);
                  }}
                  className="h-8 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[9px] font-black uppercase cursor-pointer transition-colors"
                >
                  Expand All
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedKeys({})}
                  className="h-8 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[9px] font-black uppercase cursor-pointer transition-colors"
                >
                  Collapse All
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleExportCSV}
              className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Export CSV
            </button>

            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className="h-8 px-3 bg-[#D94B5A] hover:bg-rose-700 text-white rounded-md text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              Print Report
            </button>

            <button
              type="button"
              onClick={onReload}
              disabled={loading}
              className="h-8 px-3 bg-slate-700 hover:bg-slate-800 text-white rounded-md text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
              Reload
            </button>
          </div>
        </div>

        {/* 3. Multi-Dimensional Filters Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-2 pt-2 border-t border-slate-100">
          {/* Month Filter */}
          <div className="flex flex-col gap-0.5">
            <label className="text-[8px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Calendar className="h-2.5 w-2.5 text-[#1c4587]" /> Month
            </label>
            <select
              value={monthFilter}
              onChange={(e) => {
                setMonthFilter(e.target.value);
                setLedgerPage(1);
              }}
              className="h-8 px-2 rounded-md border border-slate-300 bg-slate-50 text-[10px] font-bold text-slate-800 outline-none focus:border-[#1c4587] cursor-pointer"
            >
              <option value="ALL">All Months</option>
              {filterOptions.months.map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)} ({m})
                </option>
              ))}
            </select>
          </div>

          {/* From Date */}
          <div className="flex flex-col gap-0.5">
            <label className="text-[8px] font-black uppercase tracking-wider text-slate-500">
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setLedgerPage(1);
              }}
              className="h-8 px-2 rounded-md border border-slate-300 bg-slate-50 text-[10px] font-bold text-slate-800 outline-none focus:border-[#1c4587]"
            />
          </div>

          {/* To Date */}
          <div className="flex flex-col gap-0.5">
            <label className="text-[8px] font-black uppercase tracking-wider text-slate-500">
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setLedgerPage(1);
              }}
              className="h-8 px-2 rounded-md border border-slate-300 bg-slate-50 text-[10px] font-bold text-slate-800 outline-none focus:border-[#1c4587]"
            />
          </div>

          {/* Area Filter */}
          <div className="flex flex-col gap-0.5">
            <label className="text-[8px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <MapPin className="h-2.5 w-2.5 text-rose-600" /> Area
            </label>
            <select
              value={areaFilter}
              onChange={(e) => {
                setAreaFilter(e.target.value);
                setLedgerPage(1);
              }}
              className="h-8 px-2 rounded-md border border-slate-300 bg-slate-50 text-[10px] font-bold text-slate-800 outline-none focus:border-[#1c4587] cursor-pointer"
            >
              <option value="ALL">All Areas</option>
              {filterOptions.areas.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          {/* Agency Filter */}
          <div className="flex flex-col gap-0.5">
            <label className="text-[8px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Building2 className="h-2.5 w-2.5 text-indigo-600" /> Agency
            </label>
            <select
              value={agencyFilter}
              onChange={(e) => {
                setAgencyFilter(e.target.value);
                setLedgerPage(1);
              }}
              className="h-8 px-2 rounded-md border border-slate-300 bg-slate-50 text-[10px] font-bold text-slate-800 outline-none focus:border-[#1c4587] cursor-pointer"
            >
              <option value="ALL">All Agencies</option>
              {filterOptions.agencies.map((ag) => (
                <option key={ag} value={ag}>
                  {ag}
                </option>
              ))}
            </select>
          </div>

          {/* Godown Filter */}
          <div className="flex flex-col gap-0.5">
            <label className="text-[8px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Warehouse className="h-2.5 w-2.5 text-emerald-600" /> Godown
            </label>
            <select
              value={godownFilter}
              onChange={(e) => {
                setGodownFilter(e.target.value);
                setLedgerPage(1);
              }}
              className="h-8 px-2 rounded-md border border-slate-300 bg-slate-50 text-[10px] font-bold text-slate-800 outline-none focus:border-[#1c4587] cursor-pointer"
            >
              <option value="ALL">All Godowns</option>
              {filterOptions.godowns.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Packing Unit + Flow Mode */}
          <div className="flex flex-col gap-0.5">
            <label className="text-[8px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Layers className="h-2.5 w-2.5 text-teal-600" /> Packing / Flow
            </label>
            <div className="flex gap-1">
              <select
                value={packingFilter}
                onChange={(e) => {
                  setPackingFilter(e.target.value as any);
                  setLedgerPage(1);
                }}
                className="h-8 w-1/2 px-1.5 rounded-md border border-slate-300 bg-slate-50 text-[9px] font-bold text-slate-800 outline-none focus:border-[#1c4587] cursor-pointer"
              >
                <option value="ALL">All Units</option>
                <option value="BALES">Bales</option>
                <option value="LOOSE">Lose</option>
                <option value="P.BALES">P Bell</option>
                <option value="H.BALES">H Bell</option>
                <option value="DRUMS">Drums</option>
              </select>
              <select
                value={flowFilter}
                onChange={(e) => {
                  setFlowFilter(e.target.value as StockFlowFilter);
                  setLedgerPage(1);
                }}
                className="h-8 w-1/2 px-1.5 rounded-md border border-slate-300 bg-slate-50 text-[9px] font-bold text-slate-800 outline-none focus:border-[#1c4587] cursor-pointer"
              >
                <option value="ALL">Net Bal</option>
                <option value="OPENING">Opening</option>
                <option value="INWARD">Inward (+)</option>
                <option value="OUTWARD">Outward (-)</option>
              </select>
            </div>
          </div>

          {/* Search & Reset */}
          <div className="flex flex-col gap-0.5">
            <label className="text-[8px] font-black uppercase tracking-wider text-slate-500">
              Quick Search
            </label>
            <div className="flex items-center gap-1">
              <div className="flex items-center flex-1 h-8 bg-slate-50 border border-slate-300 rounded-md overflow-hidden focus-within:border-[#1c4587]">
                <Search className="h-3 w-3 text-slate-400 ml-2 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setLedgerPage(1);
                  }}
                  placeholder="Grade, Ref, Agency..."
                  className="w-full h-full bg-transparent px-1.5 text-[10px] font-semibold text-slate-700 outline-none"
                />
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  title="Reset all report filters"
                  className="h-8 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md text-[9px] font-black uppercase cursor-pointer shrink-0 flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Report Table Container */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        {/* Table Title Header */}
        <div className="bg-gradient-to-r from-[#1c4587] to-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-white">
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded bg-white/15 flex items-center justify-center text-xs">
              📊
            </span>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider">
                {dimensionTitleMap[dimension]}
              </h3>
              <p className="text-[9px] text-blue-100 font-semibold">
                {flowFilter === 'ALL'
                  ? 'Showing Net Stock Balance (Opening + Issue to Godown − Godown to Factory) across Bales, Lose, P Bell, H Bell & Drums'
                  : `Showing ${flowFilter} records across all packing types`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[9px] font-black uppercase">
            <span className="bg-white/15 border border-white/20 px-2 py-1 rounded">
              {dimension === 'ledger' ? `${filteredEntries.length} Entries` : `${aggregatedRows.length} Groups • ${grandTotals.entriesCount} Entries`}
            </span>
            <span className="bg-emerald-500/25 border border-emerald-300/40 px-2 py-1 rounded font-mono">
              Net Wt: {formatMt(grandTotals.weightKg)} M.T.
            </span>
          </div>
        </div>

        {/* Aggregated Matrix Views OR Full Ledger */}
        {dimension !== 'ledger' ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase text-[9px] font-black h-9">
                  <th className="px-3 text-left border-r border-slate-200 min-w-[200px]">
                    {dimension === 'month' && 'Month'}
                    {dimension === 'date' && 'Stock Date'}
                    {dimension === 'area' && 'Area Station'}
                    {dimension === 'agency' && 'Agency / Party'}
                    {dimension === 'godown' && 'Godown / Warehouse'}
                    {dimension === 'unit' && 'Packing / Unit Type'}
                  </th>
                  <th className="px-2.5 text-right border-r border-slate-200 bg-blue-50/60 text-blue-900">Bales</th>
                  <th className="px-2.5 text-right border-r border-slate-200 bg-amber-50/60 text-amber-900">Lose</th>
                  <th className="px-2.5 text-right border-r border-slate-200 bg-indigo-50/60 text-indigo-900">P Bell</th>
                  <th className="px-2.5 text-right border-r border-slate-200 bg-purple-50/60 text-purple-900">H Bell</th>
                  <th className="px-2.5 text-right border-r border-slate-200 bg-teal-50/60 text-teal-900">Drum</th>
                  <th className="px-2.5 text-right border-r border-slate-200 text-slate-600">Opening</th>
                  <th className="px-2.5 text-right border-r border-slate-200 text-emerald-700">Inward (+)</th>
                  <th className="px-2.5 text-right border-r border-slate-200 text-rose-700">Outward (-)</th>
                  <th className="px-2.5 text-right border-r border-slate-200 bg-slate-200/50 text-slate-900">Net Qty</th>
                  <th className="px-3 text-right border-r border-slate-200 text-slate-800">Weight (KG)</th>
                  <th className="px-3 text-right bg-emerald-50/60 text-emerald-900">Weight (M.T.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold text-slate-800">
                {aggregatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-16 text-center text-slate-400 uppercase font-bold text-xs">
                      No stock report records match the selected filters.
                    </td>
                  </tr>
                ) : (
                  aggregatedRows.map((row) => {
                    const isExpanded = !!expandedKeys[row.key];
                    return (
                      <React.Fragment key={row.key}>
                        <tr
                          onClick={() => setExpandedKeys((prev) => ({ ...prev, [row.key]: !prev[row.key] }))}
                          className={cn(
                            'h-9 cursor-pointer transition-colors',
                            isExpanded ? 'bg-blue-50/70' : 'hover:bg-slate-50 bg-white'
                          )}
                          title="Click to expand/collapse detailed rows"
                        >
                          <td className="px-3 border-r border-slate-100">
                            <div className="flex items-center gap-2">
                              <span className="w-4 h-4 rounded bg-[#1c4587] text-white flex items-center justify-center shrink-0">
                                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                              </span>
                              <span className="font-black uppercase text-slate-900 truncate max-w-[220px]">
                                {row.label}
                              </span>
                              <span className="text-[8px] font-extrabold bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded-full shrink-0">
                                {row.entriesCount}
                              </span>
                            </div>
                          </td>
                          <td className="px-2.5 text-right font-mono border-r border-slate-100 text-blue-900 bg-blue-50/20">
                            {formatQty(row.bales)}
                          </td>
                          <td className="px-2.5 text-right font-mono border-r border-slate-100 text-amber-800 bg-amber-50/20">
                            {formatQty(row.loose)}
                          </td>
                          <td className="px-2.5 text-right font-mono border-r border-slate-100 text-indigo-900 bg-indigo-50/20">
                            {formatQty(row.pBales)}
                          </td>
                          <td className="px-2.5 text-right font-mono border-r border-slate-100 text-purple-900 bg-purple-50/20">
                            {formatQty(row.hBales)}
                          </td>
                          <td className="px-2.5 text-right font-mono border-r border-slate-100 text-teal-800 bg-teal-50/20">
                            {formatQty(row.drums)}
                          </td>
                          <td className="px-2.5 text-right font-mono border-r border-slate-100 text-slate-600">
                            {formatQty(row.openingQty)}
                          </td>
                          <td className="px-2.5 text-right font-mono border-r border-slate-100 text-emerald-700">
                            {formatQty(row.inwardQty)}
                          </td>
                          <td className="px-2.5 text-right font-mono border-r border-slate-100 text-rose-700">
                            {formatQty(row.outwardQty)}
                          </td>
                          <td className="px-2.5 text-right font-mono font-black border-r border-slate-100 text-slate-900 bg-slate-50">
                            {formatQty(row.netQty)}
                          </td>
                          <td className="px-3 text-right font-mono border-r border-slate-100 text-slate-800">
                            {formatKg(row.weightKg)}
                          </td>
                          <td className="px-3 text-right font-mono font-black text-emerald-800 bg-emerald-50/25">
                            {formatMt(row.weightKg)}
                          </td>
                        </tr>

                        {/* Drilldown Details */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={12} className="p-2.5 bg-slate-50 border-b border-slate-200">
                              <div className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-inner">
                                <div className="px-3 py-1.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-[9px] font-black uppercase text-slate-700">
                                  <span>
                                    Breakdown Details for [{row.label}] — {row.entries.length} Records
                                  </span>
                                  <span className="font-mono text-emerald-800">
                                    Total Weight: {formatKg(row.weightKg)} KG ({formatMt(row.weightKg)} M.T.)
                                  </span>
                                </div>
                                <div className="max-h-[260px] overflow-y-auto">
                                  <table className="w-full border-collapse text-[9px]">
                                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-500 uppercase">
                                      <tr className="h-7">
                                        <th className="px-2 text-left">Date</th>
                                        <th className="px-2 text-left">Type</th>
                                        <th className="px-2 text-left">Ref / Issue #</th>
                                        <th className="px-2 text-left">Godown</th>
                                        <th className="px-2 text-left">Area</th>
                                        <th className="px-2 text-left">Agency</th>
                                        <th className="px-2 text-left">Grade</th>
                                        <th className="px-2 text-center">Packing</th>
                                        <th className="px-2 text-right">Qty</th>
                                        <th className="px-2 text-right">Wt (KG)</th>
                                        <th className="px-2 text-right">Wt (M.T.)</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {row.entries.map((item) => {
                                        const mult = flowFilter === 'ALL' ? item.sign : 1;
                                        return (
                                          <tr key={item.id} className="h-7 hover:bg-blue-50/40">
                                            <td className="px-2 font-mono text-slate-600">{item.date}</td>
                                            <td className="px-2">
                                              <span
                                                className={cn(
                                                  'px-1.5 py-0.5 rounded text-[8px] font-black uppercase',
                                                  item.source === 'OPENING'
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : item.source === 'INWARD'
                                                      ? 'bg-emerald-100 text-emerald-800'
                                                      : 'bg-rose-100 text-rose-800'
                                                )}
                                              >
                                                {item.source === 'OPENING'
                                                  ? 'Opening'
                                                  : item.source === 'INWARD'
                                                    ? 'Inward (+)'
                                                    : 'Outward (-)'}
                                              </span>
                                            </td>
                                            <td className="px-2 font-mono font-bold text-slate-800">{item.refNo}</td>
                                            <td className="px-2 uppercase truncate max-w-[140px]">{item.godown}</td>
                                            <td className="px-2 uppercase truncate max-w-[120px]">{item.area}</td>
                                            <td className="px-2 uppercase truncate max-w-[140px]">{item.agency}</td>
                                            <td className="px-2 font-black text-indigo-950">{item.grade}</td>
                                            <td className="px-2 text-center">
                                              <span
                                                className={cn(
                                                  'px-1.5 py-0.5 rounded border text-[8px] font-black uppercase',
                                                  PACKING_META[item.packing].badgeClass
                                                )}
                                              >
                                                {PACKING_META[item.packing].shortLabel}
                                              </span>
                                            </td>
                                            <td className="px-2 text-right font-mono font-black">
                                              {formatQty(item.qty * mult)}
                                            </td>
                                            <td className="px-2 text-right font-mono">
                                              {formatKg(item.weightKg * mult)}
                                            </td>
                                            <td className="px-2 text-right font-mono font-black text-emerald-800">
                                              {formatMt(item.weightKg * mult)}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
              {aggregatedRows.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-900 text-white h-10 font-mono text-[10px] font-black">
                    <td className="px-3 uppercase font-sans tracking-wider border-r border-slate-700">
                      Grand Total ({aggregatedRows.length} Groups)
                    </td>
                    <td className="px-2.5 text-right border-r border-slate-700 text-blue-300">{formatQty(grandTotals.bales)}</td>
                    <td className="px-2.5 text-right border-r border-slate-700 text-amber-300">{formatQty(grandTotals.loose)}</td>
                    <td className="px-2.5 text-right border-r border-slate-700 text-indigo-300">{formatQty(grandTotals.pBales)}</td>
                    <td className="px-2.5 text-right border-r border-slate-700 text-purple-300">{formatQty(grandTotals.hBales)}</td>
                    <td className="px-2.5 text-right border-r border-slate-700 text-teal-300">{formatQty(grandTotals.drums)}</td>
                    <td className="px-2.5 text-right border-r border-slate-700 text-slate-300">{formatQty(grandTotals.openingQty)}</td>
                    <td className="px-2.5 text-right border-r border-slate-700 text-emerald-300">{formatQty(grandTotals.inwardQty)}</td>
                    <td className="px-2.5 text-right border-r border-slate-700 text-rose-300">{formatQty(grandTotals.outwardQty)}</td>
                    <td className="px-2.5 text-right border-r border-slate-700 text-white">{formatQty(grandTotals.netQty)}</td>
                    <td className="px-3 text-right border-r border-slate-700 text-cyan-300">{formatKg(grandTotals.weightKg)}</td>
                    <td className="px-3 text-right text-emerald-300">{formatMt(grandTotals.weightKg)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        ) : (
          /* Full Transaction Ledger Table */
          <div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[10px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase text-[9px] font-black h-9">
                    <th className="px-2.5 text-left border-r border-slate-200">Date</th>
                    <th className="px-2.5 text-left border-r border-slate-200">Month</th>
                    <th className="px-2.5 text-left border-r border-slate-200">Movement</th>
                    <th className="px-2.5 text-left border-r border-slate-200">Ref / Issue #</th>
                    <th className="px-2.5 text-left border-r border-slate-200">Godown</th>
                    <th className="px-2.5 text-left border-r border-slate-200">Area</th>
                    <th className="px-2.5 text-left border-r border-slate-200">Agency</th>
                    <th className="px-2.5 text-left border-r border-slate-200">Grade</th>
                    <th className="px-2.5 text-center border-r border-slate-200">Packing</th>
                    <th className="px-2 text-right border-r border-slate-200">Bales</th>
                    <th className="px-2 text-right border-r border-slate-200">Lose</th>
                    <th className="px-2 text-right border-r border-slate-200">P Bell</th>
                    <th className="px-2 text-right border-r border-slate-200">H Bell</th>
                    <th className="px-2 text-right border-r border-slate-200">Drum</th>
                    <th className="px-2.5 text-right border-r border-slate-200">Wt (KG)</th>
                    <th className="px-2.5 text-right">Wt (M.T.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold text-slate-800">
                  {filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={16} className="py-16 text-center text-slate-400 uppercase font-bold text-xs">
                        No transactions match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredEntries
                      .slice((ledgerPage - 1) * ledgerPageSize, ledgerPage * ledgerPageSize)
                      .map((item) => {
                        const mult = flowFilter === 'ALL' ? item.sign : 1;
                        const eq = item.qty * mult;
                        const ek = item.weightKg * mult;
                        return (
                          <tr key={item.id} className="h-8 hover:bg-slate-50">
                            <td className="px-2.5 font-mono text-slate-600 border-r border-slate-100 whitespace-nowrap">
                              {item.date}
                            </td>
                            <td className="px-2.5 font-mono text-slate-500 border-r border-slate-100 whitespace-nowrap">
                              {item.monthLabel}
                            </td>
                            <td className="px-2.5 border-r border-slate-100">
                              <span
                                className={cn(
                                  'px-1.5 py-0.5 rounded text-[8px] font-black uppercase whitespace-nowrap',
                                  item.source === 'OPENING'
                                    ? 'bg-blue-100 text-blue-800'
                                    : item.source === 'INWARD'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-rose-100 text-rose-800'
                                )}
                              >
                                {item.source === 'OPENING'
                                  ? 'Opening'
                                  : item.source === 'INWARD'
                                    ? 'Inward (+)'
                                    : 'Outward (-)'}
                              </span>
                            </td>
                            <td className="px-2.5 font-mono border-r border-slate-100">{item.refNo}</td>
                            <td className="px-2.5 uppercase truncate max-w-[130px] border-r border-slate-100">
                              {item.godown}
                            </td>
                            <td className="px-2.5 uppercase truncate max-w-[110px] border-r border-slate-100">
                              {item.area}
                            </td>
                            <td className="px-2.5 uppercase truncate max-w-[130px] border-r border-slate-100">
                              {item.agency}
                            </td>
                            <td className="px-2.5 font-black text-indigo-950 border-r border-slate-100">
                              {item.grade}
                            </td>
                            <td className="px-2.5 text-center border-r border-slate-100">
                              <span
                                className={cn(
                                  'px-1.5 py-0.5 rounded border text-[8px] font-black uppercase',
                                  PACKING_META[item.packing].badgeClass
                                )}
                              >
                                {PACKING_META[item.packing].shortLabel}
                              </span>
                            </td>
                            <td className="px-2 text-right font-mono border-r border-slate-100 text-blue-900">
                              {item.packing === 'BALES' ? formatQty(eq) : '-'}
                            </td>
                            <td className="px-2 text-right font-mono border-r border-slate-100 text-amber-800">
                              {item.packing === 'LOOSE' ? formatQty(eq) : '-'}
                            </td>
                            <td className="px-2 text-right font-mono border-r border-slate-100 text-indigo-900">
                              {item.packing === 'P.BALES' ? formatQty(eq) : '-'}
                            </td>
                            <td className="px-2 text-right font-mono border-r border-slate-100 text-purple-900">
                              {item.packing === 'H.BALES' ? formatQty(eq) : '-'}
                            </td>
                            <td className="px-2 text-right font-mono border-r border-slate-100 text-teal-800">
                              {item.packing === 'DRUMS' ? formatQty(eq) : '-'}
                            </td>
                            <td className="px-2.5 text-right font-mono border-r border-slate-100">
                              {formatKg(ek)}
                            </td>
                            <td className="px-2.5 text-right font-mono font-black text-emerald-800">
                              {formatMt(ek)}
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
                {filteredEntries.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-900 text-white h-9 font-mono text-[10px] font-black">
                      <td colSpan={9} className="px-3 uppercase font-sans tracking-wider border-r border-slate-700">
                        Grand Total ({filteredEntries.length} Filtered Entries)
                      </td>
                      <td className="px-2 text-right border-r border-slate-700 text-blue-300">{formatQty(grandTotals.bales)}</td>
                      <td className="px-2 text-right border-r border-slate-700 text-amber-300">{formatQty(grandTotals.loose)}</td>
                      <td className="px-2 text-right border-r border-slate-700 text-indigo-300">{formatQty(grandTotals.pBales)}</td>
                      <td className="px-2 text-right border-r border-slate-700 text-purple-300">{formatQty(grandTotals.hBales)}</td>
                      <td className="px-2 text-right border-r border-slate-700 text-teal-300">{formatQty(grandTotals.drums)}</td>
                      <td className="px-2.5 text-right border-r border-slate-700 text-cyan-300">{formatKg(grandTotals.weightKg)}</td>
                      <td className="px-2.5 text-right text-emerald-300">{formatMt(grandTotals.weightKg)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            <div className="p-2 border-t border-slate-200 bg-slate-50">
              <PaginationControls
                currentPage={ledgerPage}
                totalItems={filteredEntries.length}
                pageSize={ledgerPageSize}
                onPageChange={setLedgerPage}
                onPageSizeChange={setLedgerPageSize}
              />
            </div>
          </div>
        )}
      </div>

      {/* Print Modal Preview for Active Report */}
      <PrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title={`STOCK INVENTORY - ${dimensionTitleMap[dimension].toUpperCase()}`}
        showTip={false}
      >
        <div className="p-5 bg-white text-black font-sans print:p-0">
          <style
            dangerouslySetInnerHTML={{
              __html: `
                @media print {
                  @page { size: A4 landscape; margin: 10mm; }
                }
              `
            }}
          />
          <div className="border-b-2 border-slate-800 pb-3 mb-3 flex items-start justify-between">
            <div>
              <h1 className="text-lg font-black uppercase tracking-tight text-slate-900">
                BALLY JUTE COMPANY LIMITED
              </h1>
              <p className="text-xs font-bold uppercase text-slate-700 mt-0.5">
                {dimensionTitleMap[dimension]}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Month: {monthFilter === 'ALL' ? 'All Months' : formatMonthLabel(monthFilter)} | Packing:{' '}
                {packingFilter === 'ALL' ? 'All Units' : PACKING_META[packingFilter].label} | Area: {areaFilter} | Agency:{' '}
                {agencyFilter} | Godown: {godownFilter}
              </p>
            </div>
            <div className="text-right text-[10px] font-mono text-slate-600">
              <p>Printed: {new Date().toLocaleDateString('en-GB')}</p>
              <p>Flow: {flowFilter === 'ALL' ? 'Net Stock Balance' : flowFilter}</p>
              <p className="font-bold text-slate-900">Total Weight: {formatMt(grandTotals.weightKg)} M.T.</p>
            </div>
          </div>

          <table className="w-full border-collapse border border-slate-400 text-[9px]">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-400 uppercase font-black">
                <th className="border border-slate-300 px-2 py-1.5 text-left">
                  {dimension === 'ledger' ? 'Date / Ref / Details' : dimension.toUpperCase()}
                </th>
                {dimension === 'ledger' && (
                  <>
                    <th className="border border-slate-300 px-2 py-1.5 text-left">Godown</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-left">Area</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-left">Agency</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-left">Grade</th>
                  </>
                )}
                <th className="border border-slate-300 px-2 py-1.5 text-right">Bales</th>
                <th className="border border-slate-300 px-2 py-1.5 text-right">Lose</th>
                <th className="border border-slate-300 px-2 py-1.5 text-right">P Bell</th>
                <th className="border border-slate-300 px-2 py-1.5 text-right">H Bell</th>
                <th className="border border-slate-300 px-2 py-1.5 text-right">Drum</th>
                {dimension !== 'ledger' && (
                  <>
                    <th className="border border-slate-300 px-2 py-1.5 text-right">Opening</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-right">Inward (+)</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-right">Outward (-)</th>
                  </>
                )}
                <th className="border border-slate-300 px-2 py-1.5 text-right">Net Qty</th>
                <th className="border border-slate-300 px-2 py-1.5 text-right">Wt (KG)</th>
                <th className="border border-slate-300 px-2 py-1.5 text-right">Wt (M.T.)</th>
              </tr>
            </thead>
            <tbody>
              {dimension === 'ledger'
                ? filteredEntries.slice(0, 500).map((item) => {
                    const mult = flowFilter === 'ALL' ? item.sign : 1;
                    const eq = item.qty * mult;
                    const ek = item.weightKg * mult;
                    return (
                      <tr key={item.id}>
                        <td className="border border-slate-300 px-2 py-1 font-mono">
                          {item.date} ({item.refNo}) [{item.source}]
                        </td>
                        <td className="border border-slate-300 px-2 py-1">{item.godown}</td>
                        <td className="border border-slate-300 px-2 py-1">{item.area}</td>
                        <td className="border border-slate-300 px-2 py-1">{item.agency}</td>
                        <td className="border border-slate-300 px-2 py-1 font-bold">{item.grade}</td>
                        <td className="border border-slate-300 px-2 py-1 text-right font-mono">
                          {item.packing === 'BALES' ? formatQty(eq) : 0}
                        </td>
                        <td className="border border-slate-300 px-2 py-1 text-right font-mono">
                          {item.packing === 'LOOSE' ? formatQty(eq) : 0}
                        </td>
                        <td className="border border-slate-300 px-2 py-1 text-right font-mono">
                          {item.packing === 'P.BALES' ? formatQty(eq) : 0}
                        </td>
                        <td className="border border-slate-300 px-2 py-1 text-right font-mono">
                          {item.packing === 'H.BALES' ? formatQty(eq) : 0}
                        </td>
                        <td className="border border-slate-300 px-2 py-1 text-right font-mono">
                          {item.packing === 'DRUMS' ? formatQty(eq) : 0}
                        </td>
                        <td className="border border-slate-300 px-2 py-1 text-right font-mono font-bold">
                          {formatQty(eq)}
                        </td>
                        <td className="border border-slate-300 px-2 py-1 text-right font-mono">{formatKg(ek)}</td>
                        <td className="border border-slate-300 px-2 py-1 text-right font-mono font-bold">
                          {formatMt(ek)}
                        </td>
                      </tr>
                    );
                  })
                : aggregatedRows.map((row) => (
                    <tr key={row.key}>
                      <td className="border border-slate-300 px-2 py-1 font-bold">
                        {row.label} ({row.entriesCount})
                      </td>
                      <td className="border border-slate-300 px-2 py-1 text-right font-mono">{formatQty(row.bales)}</td>
                      <td className="border border-slate-300 px-2 py-1 text-right font-mono">{formatQty(row.loose)}</td>
                      <td className="border border-slate-300 px-2 py-1 text-right font-mono">{formatQty(row.pBales)}</td>
                      <td className="border border-slate-300 px-2 py-1 text-right font-mono">{formatQty(row.hBales)}</td>
                      <td className="border border-slate-300 px-2 py-1 text-right font-mono">{formatQty(row.drums)}</td>
                      <td className="border border-slate-300 px-2 py-1 text-right font-mono">
                        {formatQty(row.openingQty)}
                      </td>
                      <td className="border border-slate-300 px-2 py-1 text-right font-mono">
                        {formatQty(row.inwardQty)}
                      </td>
                      <td className="border border-slate-300 px-2 py-1 text-right font-mono">
                        {formatQty(row.outwardQty)}
                      </td>
                      <td className="border border-slate-300 px-2 py-1 text-right font-mono font-bold">
                        {formatQty(row.netQty)}
                      </td>
                      <td className="border border-slate-300 px-2 py-1 text-right font-mono">
                        {formatKg(row.weightKg)}
                      </td>
                      <td className="border border-slate-300 px-2 py-1 text-right font-mono font-bold">
                        {formatMt(row.weightKg)}
                      </td>
                    </tr>
                  ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-200 font-black font-mono">
                <td colSpan={dimension === 'ledger' ? 5 : 1} className="border border-slate-400 px-2 py-1.5 uppercase font-sans">
                  GRAND TOTAL
                </td>
                <td className="border border-slate-400 px-2 py-1.5 text-right">{formatQty(grandTotals.bales)}</td>
                <td className="border border-slate-400 px-2 py-1.5 text-right">{formatQty(grandTotals.loose)}</td>
                <td className="border border-slate-400 px-2 py-1.5 text-right">{formatQty(grandTotals.pBales)}</td>
                <td className="border border-slate-400 px-2 py-1.5 text-right">{formatQty(grandTotals.hBales)}</td>
                <td className="border border-slate-400 px-2 py-1.5 text-right">{formatQty(grandTotals.drums)}</td>
                {dimension !== 'ledger' && (
                  <>
                    <td className="border border-slate-400 px-2 py-1.5 text-right">{formatQty(grandTotals.openingQty)}</td>
                    <td className="border border-slate-400 px-2 py-1.5 text-right">{formatQty(grandTotals.inwardQty)}</td>
                    <td className="border border-slate-400 px-2 py-1.5 text-right">{formatQty(grandTotals.outwardQty)}</td>
                  </>
                )}
                <td className="border border-slate-400 px-2 py-1.5 text-right">{formatQty(grandTotals.netQty)}</td>
                <td className="border border-slate-400 px-2 py-1.5 text-right">{formatKg(grandTotals.weightKg)}</td>
                <td className="border border-slate-400 px-2 py-1.5 text-right">{formatMt(grandTotals.weightKg)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </PrintModal>
    </div>
  );
};
