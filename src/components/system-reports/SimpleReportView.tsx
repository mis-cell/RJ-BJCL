import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Package,
  Truck,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Printer,
  FileText,
  ChevronRight,
  ArrowUpDown,
  Building2,
  Calendar,
  XCircle,
  TrendingUp,
  BarChart3,
  Award,
  Scissors,
  Users,
  PieChart,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { SystemReportDataset, ReportTransactionLine, normalizeToISODate, getTodayISODate, isInvalidAgency, isInvalidArea } from '../../services/systemReportEngine';
import { SimpleDealSlipModal } from './SimpleDealSlipModal';
import { EntityWiseSaudaDetailsModal } from './EntityWiseSaudaDetailsModal';
import { BrokerPremiumDetailsModal } from './BrokerPremiumDetailsModal';
import { formatIndianCurrency } from '../../lib/utils';

interface SimpleReportViewProps {
  dataset: SystemReportDataset;
  onOpenManagementView?: () => void;
}

type TabDimension = 
  | 'OVERVIEW'
  | 'BROKER'
  | 'AGENCY'
  | 'AREA'
  | 'GRADE'
  | 'SUPPLIER'
  | 'MONTH'
  | 'DEDUCTION'
  | 'CHECKPOINTS'
  | 'ALLSAUDA'
  | 'ALL_DEALS';

const formatSettVal = (sett: number | undefined | null, claim: number | undefined | null): string => {
  const s = Number(sett || 0);
  const c = Number(claim || 0);
  const val = s > 0 ? s : (c > 0 ? c : 0);
  if (val <= 0) return '—';
  return `${val.toFixed(2)}%`;
};

export const SimpleReportView: React.FC<SimpleReportViewProps> = ({
  dataset,
  onOpenManagementView
}) => {
  const { transactions, metrics, allPoSummary } = dataset;

  // Active Tab Dimension
  const [activeTab, setActiveTab] = useState<TabDimension>('ALLSAUDA');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  
  const [selectedTxn, setSelectedTxn] = useState<ReportTransactionLine | null>(null);
  const [selectedBrokerModalBroker, setSelectedBrokerModalBroker] = useState<string | null>(null);
  const [selectedPremiumModalBroker, setSelectedPremiumModalBroker] = useState<string | null>(null);
  const [selectedEntityModalInfo, setSelectedEntityModalInfo] = useState<{
    entityName: string;
    dimensionType: TabDimension;
  } | null>(null);

  // Sauda records from sauda_master, sauda_check_point, purchase_master (Sauda / PO level, exactly 1 row per Sauda, NOT split by grade)
  const allSaudaRecords = useMemo(() => {
    return allPoSummary?.records || [];
  }, [allPoSummary]);

  // Available Months for Month Wise Filter
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    allSaudaRecords.forEach(r => {
      if (r.month) set.add(r.month);
      else if (r.date && r.date.length >= 7) set.add(r.date.substring(0, 7));
    });
    transactions.forEach(t => {
      if (t.month) set.add(t.month);
      else if (t.date && t.date.length >= 7) set.add(t.date.substring(0, 7));
    });
    return Array.from(set).sort().reverse();
  }, [allSaudaRecords, transactions]);

  const formatMonthLabel = (m: string) => {
    if (!m) return '';
    try {
      const [year, month] = m.split('-');
      if (year && month) {
        const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
        return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      }
    } catch {
      // fallback
    }
    return m;
  };

  // Sorting for All Sauda Table
  const [sortField, setSortField] = useState<'date' | 'saudaNo' | 'supplier' | 'broker' | 'quantityMT'>('date');
  const [sortAsc, setSortAsc] = useState<boolean>(false); // Default false = Latest Date First

  // Pagination for All Sauda Table
  const [allSaudaPage, setAllSaudaPage] = useState<number>(1);
  const [allSaudaPageSize, setAllSaudaPageSize] = useState<number>(50);

  const handleSort = (field: 'date' | 'saudaNo' | 'supplier' | 'broker' | 'quantityMT') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'date' ? false : true);
    }
    setAllSaudaPage(1);
  };

  // Sorting for Broker Wise Deduction Table
  type DeductionSortField = 'broker' | 'dealCount' | 'quantityMT' | 'moistureSett' | 'dustSett' | 'gradedownSett' | 'shortExcess' | 'deductionAmount';
  const [deductionSortField, setDeductionSortField] = useState<DeductionSortField>('quantityMT');
  const [deductionSortAsc, setDeductionSortAsc] = useState<boolean>(false);

  const handleDeductionSort = (field: DeductionSortField) => {
    if (deductionSortField === field) {
      setDeductionSortAsc(prev => !prev);
    } else {
      setDeductionSortField(field);
      // For broker name, default to ascending (A-Z). For numerical values, default to descending (highest first)
      setDeductionSortAsc(field === 'broker' ? true : false);
    }
  };

  // Sorting for Premium Given Table
  type PremiumSortField = 'broker' | 'dealCount' | 'quantityMT' | 'premiumAmount';
  const [premiumSortField, setPremiumSortField] = useState<PremiumSortField>('premiumAmount');
  const [premiumSortAsc, setPremiumSortAsc] = useState<boolean>(false);

  const handlePremiumSort = (field: PremiumSortField) => {
    if (premiumSortField === field) {
      setPremiumSortAsc(prev => !prev);
    } else {
      setPremiumSortField(field);
      // For broker name, default to ascending (A-Z). For numbers/premium, default to descending (highest first)
      setPremiumSortAsc(field === 'broker' ? true : false);
    }
  };

  // Filtered & Sorted All Sauda List (Each Sauda / PO is 1 row, full total weight, from sauda_master, scp, pm)
  const filteredSaudaList = useMemo(() => {
    let list = [...allSaudaRecords];

    // Month Wise Filter
    if (selectedMonth && selectedMonth !== 'ALL') {
      list = list.filter(r =>
        r.month === selectedMonth ||
        (r.date && (r.date === selectedMonth || r.date.startsWith(selectedMonth) || normalizeToISODate(r.date).startsWith(selectedMonth)))
      );
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(r =>
        (r.saudaNo || '').toLowerCase().includes(q) ||
        (r.poNo || '').toLowerCase().includes(q) ||
        (r.supplier || '').toLowerCase().includes(q) ||
        (r.broker || '').toLowerCase().includes(q) ||
        (r.area || '').toLowerCase().includes(q) ||
        (r.date || '').toLowerCase().includes(q)
      );
    }

    // Sort with Date as default (latest first) and Sauda / PO No. as secondary sort
    list.sort((a, b) => {
      if (sortField === 'date') {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        const diff = sortAsc ? dateA - dateB : dateB - dateA;
        if (diff !== 0) return diff;

        // Secondary sort: Sauda / PO No. (natural numeric sort)
        const strA = a.saudaNo || a.poNo || '';
        const strB = b.saudaNo || b.poNo || '';
        return strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
      }

      if (sortField === 'saudaNo') {
        const strA = a.saudaNo || a.poNo || '';
        const strB = b.saudaNo || b.poNo || '';
        const comp = strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
        if (comp !== 0) return sortAsc ? comp : -comp;

        // Secondary sort: Date (latest date first)
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      }

      if (sortField === 'supplier') {
        const supA = a.supplier || '';
        const supB = b.supplier || '';
        const comp = supA.localeCompare(supB, undefined, { sensitivity: 'base' });
        if (comp !== 0) return sortAsc ? comp : -comp;
        return (b.date ? new Date(b.date).getTime() : 0) - (a.date ? new Date(a.date).getTime() : 0);
      }

      if (sortField === 'broker') {
        const brkA = a.broker || '';
        const brkB = b.broker || '';
        const comp = brkA.localeCompare(brkB, undefined, { sensitivity: 'base' });
        if (comp !== 0) return sortAsc ? comp : -comp;
        return (b.date ? new Date(b.date).getTime() : 0) - (a.date ? new Date(a.date).getTime() : 0);
      }

      if (sortField === 'quantityMT') {
        const wtA = Number(a.quantityMT || 0);
        const wtB = Number(b.quantityMT || 0);
        const diff = sortAsc ? wtA - wtB : wtB - wtA;
        if (diff !== 0) return diff;
        return (b.date ? new Date(b.date).getTime() : 0) - (a.date ? new Date(a.date).getTime() : 0);
      }

      return 0;
    });

    return list;
  }, [allSaudaRecords, selectedMonth, searchQuery, sortField, sortAsc]);

  // Filtered & Sorted Transactions (Used for Dimensional Breakdown Tabs like Broker, Agency, Grade, etc.)
  const filteredList = useMemo(() => {
    let list = [...transactions];

    // Month Wise Filter
    if (selectedMonth && selectedMonth !== 'ALL') {
      list = list.filter(t =>
        t.month === selectedMonth ||
        (t.date && (t.date === selectedMonth || t.date.startsWith(selectedMonth) || normalizeToISODate(t.date).startsWith(selectedMonth)))
      );
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(t =>
        (t.saudaNo || '').toLowerCase().includes(q) ||
        (t.poNo || '').toLowerCase().includes(q) ||
        (t.supplier || '').toLowerCase().includes(q) ||
        (t.broker || '').toLowerCase().includes(q) ||
        (t.area || '').toLowerCase().includes(q) ||
        (t.grade || '').toLowerCase().includes(q)
      );
    }

    // Sort with Date as default (latest first) and Sauda / PO No. as secondary sort
    list.sort((a, b) => {
      if (sortField === 'date') {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        const diff = sortAsc ? dateA - dateB : dateB - dateA;
        if (diff !== 0) return diff;

        // Secondary sort: Sauda / PO No. (natural numeric sort)
        const strA = a.saudaNo || a.poNo || '';
        const strB = b.saudaNo || b.poNo || '';
        return strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
      }

      if (sortField === 'saudaNo') {
        const strA = a.saudaNo || a.poNo || '';
        const strB = b.saudaNo || b.poNo || '';
        const comp = strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
        if (comp !== 0) return sortAsc ? comp : -comp;

        // Secondary sort: Date (latest date first)
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      }

      if (sortField === 'supplier') {
        const supA = a.supplier || '';
        const supB = b.supplier || '';
        const comp = supA.localeCompare(supB, undefined, { sensitivity: 'base' });
        if (comp !== 0) return sortAsc ? comp : -comp;
        return (b.date ? new Date(b.date).getTime() : 0) - (a.date ? new Date(a.date).getTime() : 0);
      }

      if (sortField === 'broker') {
        const brkA = a.broker || '';
        const brkB = b.broker || '';
        const comp = brkA.localeCompare(brkB, undefined, { sensitivity: 'base' });
        if (comp !== 0) return sortAsc ? comp : -comp;
        return (b.date ? new Date(b.date).getTime() : 0) - (a.date ? new Date(a.date).getTime() : 0);
      }

      if (sortField === 'quantityMT') {
        const wtA = Number(a.quantityMT || 0);
        const wtB = Number(b.quantityMT || 0);
        const diff = sortAsc ? wtA - wtB : wtB - wtA;
        if (diff !== 0) return diff;
        return (b.date ? new Date(b.date).getTime() : 0) - (a.date ? new Date(a.date).getTime() : 0);
      }

      return 0;
    });

    return list;
  }, [transactions, selectedMonth, searchQuery, sortField, sortAsc]);

  // Active Sub-Analysis View for Dimensional Tabs
  const [subAnalysisMode, setSubAnalysisMode] = useState<'VOLUME' | 'DEDUCTION' | 'CHECKPOINTS' | 'PREMIUM'>('VOLUME');

  // Combine transactions and allSaudaRecords to ensure every broker/entity with a Sauda or P.O. in the session is included
  const allDimensionRecords = useMemo(() => {
    const txnList = [...transactions];
    const existingPoSaudas = new Set(txnList.map(t => `${t.poNo}_${t.saudaNo}`));
    
    allSaudaRecords.forEach(r => {
      const key = `${r.poNo}_${r.saudaNo}`;
      if (!existingPoSaudas.has(key)) {
        txnList.push({
          txnId: r.id || r.poNo || r.saudaNo,
          saudaNo: r.saudaNo || '-',
          poNo: r.poNo || '-',
          date: r.date || '',
          month: r.month || '',
          financialYear: r.financialYear || '',
          supplier: r.supplier || 'Unassigned',
          broker: r.broker || 'Direct',
          agency: r.agency || '-',
          area: (r.area && !isInvalidArea(r.area)) ? r.area : '',
          grade: r.grade || '-',
          quantityMT: Number(r.quantityMT || 0),
          purchaseRate: Number(r.rate || 0),
          baseRate: Number(r.rate || 0),
          rateVariance: 0,
          rateVariancePct: 0,
          grossPurchaseValue: Number(r.grossValue || (r.quantityMT * r.rate * 10) || 0),
          baseRateValue: Number(r.grossValue || 0),
          premiumRate: 0,
          premiumAmount: 0,
          premiumPct: 0,
          deductionAmount: 0,
          deductionPct: 0,
          moisturePct: 0,
          gradeDownQty: 0,
          effectiveCost: Number(r.rate || 0),
          realizationRate: Number(r.rate || 0),
          realizationValue: Number(r.grossValue || 0),
          grossProfit: 0,
          profitPct: 0,
          profitStatus: 'BREAK-EVEN',
          saudaStatus: 'IN_PROGRESS',
          arrivalStatus: 'PENDING',
          inspectionStatus: 'PENDING',
          paymentStatus: 'PENDING',
          settlementStatus: 'PENDING',
          arrivedWeightMT: 0,
          pendingWeightMT: Number(r.quantityMT || 0),
          paidAmount: 0,
          pendingPayable: Number(r.grossValue || 0),
          claimAmount: 0,
          claimSettled: 0,
          isDelayed: false,
          isAbnormal: false,
          abnormalReasons: []
        });
      }
    });

    return txnList;
  }, [transactions, allSaudaRecords]);

  // Aggregation Helper Function for multi-dimensional analysis across all session records
  const aggregateByDimension = (keyGetter: (t: ReportTransactionLine) => string, customSource?: ReportTransactionLine[]) => {
    const map = new Map<string, {
      key: string;
      dealCount: number;
      quantityMT: number;
      arrivedMT: number;
      pendingMT: number;
      grossValue: number;
      deductionAmount: number;
      premiumAmount: number;
      paidAmount: number;
      pendingPayable: number;
      avgRate: number;
      abnormalDeals: number;
      moistureSum: number;
      moistureCount: number;
      saudaCheckpointCount: number;
      tempArrivalCount: number;
      finalArrivalCount: number;
      millInspectionCount: number;
      paymentOperationCount: number;
      settlementCount: number;
      poCount: number;
      poQuantityMT: number;
      poGrossValue: number;
    }>();

    const source = customSource || allDimensionRecords;

    source.forEach(t => {
      const rawKey = keyGetter(t) || 'Unassigned';
      const key = rawKey.trim() || 'Unassigned';
      const existing = map.get(key) || {
        key,
        dealCount: 0,
        quantityMT: 0,
        arrivedMT: 0,
        pendingMT: 0,
        grossValue: 0,
        deductionAmount: 0,
        premiumAmount: 0,
        paidAmount: 0,
        pendingPayable: 0,
        avgRate: 0,
        abnormalDeals: 0,
        moistureSum: 0,
        moistureCount: 0,
        saudaCheckpointCount: 0,
        tempArrivalCount: 0,
        finalArrivalCount: 0,
        millInspectionCount: 0,
        paymentOperationCount: 0,
        settlementCount: 0,
        poCount: 0,
        poQuantityMT: 0,
        poGrossValue: 0
      };

      existing.dealCount += 1;
      existing.quantityMT += t.quantityMT;
      existing.arrivedMT += t.arrivedWeightMT;
      existing.pendingMT += t.pendingWeightMT;
      existing.grossValue += t.grossPurchaseValue;
      existing.deductionAmount += t.deductionAmount;
      existing.premiumAmount += t.premiumAmount;
      existing.paidAmount += t.paidAmount;
      existing.pendingPayable += t.pendingPayable;

      const hasValidPO = Boolean(t.poNo && t.poNo !== 'Pending P.O.' && t.poNo !== '-');
      if (hasValidPO) {
        existing.poCount += 1;
        existing.poQuantityMT += t.quantityMT;
        existing.poGrossValue += t.grossPurchaseValue;
      }

      if (t.isAbnormal || t.moisturePct > 14 || t.deductionAmount > 0) {
        existing.abnormalDeals += 1;
      }

      if (t.moisturePct > 0) {
        existing.moistureSum += t.moisturePct * t.quantityMT;
        existing.moistureCount += t.quantityMT;
      }

      existing.saudaCheckpointCount += 1;
      
      const hasAmad = Boolean(t.hasAmadArrival || t.arrivedWeightMT > 0 || t.arrivalStatus !== 'PENDING');
      const hasFinal = Boolean(t.hasFinalArrival || (t.pendingWeightMT <= 0.01 && hasAmad));
      const hasInsp = Boolean(t.hasInspection || t.inspectionStatus === 'COMPLETED' || t.moisturePct > 0 || t.deductionAmount > 0);
      const hasPay = Boolean(t.paidAmount > 0);
      const hasSett = Boolean(t.paymentStatus === 'PAID' || t.settlementStatus === 'SETTLED');

      // Sequential progression: downstream activity implies upstream completion
      if (hasAmad || hasFinal || hasInsp || hasPay || hasSett) existing.tempArrivalCount += 1;
      if (hasFinal || hasInsp || hasPay || hasSett) existing.finalArrivalCount += 1;
      if (hasInsp || (hasFinal && (hasPay || hasSett))) existing.millInspectionCount += 1;
      if (hasPay) existing.paymentOperationCount += 1;
      if (hasSett) existing.settlementCount += 1;

      map.set(key, existing);
    });

    const list = Array.from(map.values()).map(item => {
      const avgRate = item.quantityMT > 0 ? (item.grossValue / (item.quantityMT * 10)) : 0;
      const avgMoisture = item.moistureCount > 0 ? (item.moistureSum / item.moistureCount) : 0;
      
      // Strict sequential workflow pipeline enforcement:
      // Stage 1: Sauda Deals
      // Stage 2: Temporary Arrival <= Stage 1
      // Stage 3: Final Arrival <= Stage 2
      // Stage 4: Mill Inspection <= Stage 3
      // Stage 5: Payment Operation <= Stage 4
      // Stage 6: Settlement <= Stage 5
      const s1 = item.saudaCheckpointCount;
      const s2 = Math.min(s1, item.tempArrivalCount);
      const s3 = Math.min(s2, item.finalArrivalCount);
      const s4 = Math.min(s3, item.millInspectionCount);
      const s5 = Math.min(s4, item.paymentOperationCount);
      const s6 = Math.min(s5, item.settlementCount);

      let tier: 'BEST' | 'MEDIUM' | 'LOWER' = 'MEDIUM';
      if (item.abnormalDeals === 0 && item.deductionAmount === 0 && item.quantityMT >= 10) {
        tier = 'BEST';
      } else if (item.abnormalDeals > 1 || item.deductionAmount > 5000 || item.quantityMT < 5) {
        tier = 'LOWER';
      }

      return {
        ...item,
        saudaCheckpointCount: s1,
        tempArrivalCount: s2,
        finalArrivalCount: s3,
        millInspectionCount: s4,
        paymentOperationCount: s5,
        settlementCount: s6,
        avgRate,
        avgMoisture,
        tier
      };
    });

    return list.sort((a, b) => b.grossValue - a.grossValue);
  };

  const brokerData = useMemo(() => {
    const list = aggregateByDimension(t => t.broker);
    const existingKeys = new Set(list.map(item => item.key.toLowerCase()));
    (dataset.masterLists.brokers || []).forEach(b => {
      const bName = String(b).trim();
      if (bName && !existingKeys.has(bName.toLowerCase())) {
        list.push({
          key: bName,
          dealCount: 0,
          quantityMT: 0,
          arrivedMT: 0,
          pendingMT: 0,
          grossValue: 0,
          deductionAmount: 0,
          premiumAmount: 0,
          paidAmount: 0,
          pendingPayable: 0,
          avgRate: 0,
          abnormalDeals: 0,
          moistureSum: 0,
          moistureCount: 0,
          saudaCheckpointCount: 0,
          tempArrivalCount: 0,
          finalArrivalCount: 0,
          millInspectionCount: 0,
          paymentOperationCount: 0,
          settlementCount: 0,
          poCount: 0,
          poQuantityMT: 0,
          poGrossValue: 0,
          avgMoisture: 0,
          tier: 'MEDIUM'
        });
      }
    });
    return list.sort((a, b) => b.grossValue - a.grossValue);
  }, [allDimensionRecords, dataset.masterLists.brokers]);

  const agencyData = useMemo(() => {
    const list = aggregateByDimension(t => t.agency);
    return list.filter(item => !isInvalidAgency(item.key));
  }, [allDimensionRecords]);
  const areaData = useMemo(() => {
    const list = aggregateByDimension(t => t.area);
    return list.filter(item => !isInvalidArea(item.key));
  }, [allDimensionRecords]);
  const gradeData = useMemo(() => aggregateByDimension(t => t.grade), [allDimensionRecords]);

  const supplierData = useMemo(() => {
    const list = aggregateByDimension(t => t.supplier);
    const existingKeys = new Set(list.map(item => item.key.toLowerCase()));
    (dataset.masterLists.suppliers || []).forEach(s => {
      const sName = String(s).trim();
      if (sName && !existingKeys.has(sName.toLowerCase())) {
        list.push({
          key: sName,
          dealCount: 0,
          quantityMT: 0,
          arrivedMT: 0,
          pendingMT: 0,
          grossValue: 0,
          deductionAmount: 0,
          premiumAmount: 0,
          paidAmount: 0,
          pendingPayable: 0,
          avgRate: 0,
          abnormalDeals: 0,
          moistureSum: 0,
          moistureCount: 0,
          saudaCheckpointCount: 0,
          tempArrivalCount: 0,
          finalArrivalCount: 0,
          millInspectionCount: 0,
          paymentOperationCount: 0,
          settlementCount: 0,
          poCount: 0,
          poQuantityMT: 0,
          poGrossValue: 0,
          avgMoisture: 0,
          tier: 'MEDIUM'
        });
      }
    });
    return list.sort((a, b) => b.grossValue - a.grossValue);
  }, [allDimensionRecords, dataset.masterLists.suppliers]);

  const monthData = useMemo(() => aggregateByDimension(t => t.month || (t.date ? t.date.substring(0, 7) : 'Unknown')), [allDimensionRecords]);

  // CSV Export
  const handleExportCSV = () => {
    const exportList = activeTab === 'ALLSAUDA' ? filteredSaudaList : filteredList;
    if (!exportList.length) return;
    const headers = [
      'Date', 'Sauda / PO No', 'Party / Supplier', 'Broker', 'Weight (MT)'
    ];
    const rows = exportList.map(t => {
      const saudaPo = t.saudaNo && t.poNo && t.saudaNo !== t.poNo
        ? `${t.saudaNo} / ${t.poNo}`
        : (t.saudaNo || t.poNo || '-');
      return [
        t.date || '-',
        `"${saudaPo}"`,
        `"${t.supplier || 'Unassigned'}"`,
        `"${t.broker || 'Direct'}"`,
        (t.quantityMT || 0).toFixed(2)
      ];
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `all_sauda_report_${selectedMonth !== 'ALL' ? selectedMonth : 'all'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 font-sans text-slate-800">

      {/* ================= MULTI-DIMENSIONAL ANALYSIS NAVIGATION TABS ================= */}
      {/* ================= MULTI-DIMENSIONAL ANALYSIS NAVIGATION TABS ================= */}
      <div className="bg-[#D94B5A] p-2 rounded-2xl border border-[#F06D6C] flex items-center gap-1.5 flex-wrap text-xs shadow-md">
        {[
          { id: 'BROKER' as const, label: 'Broker Wise', icon: Users, count: brokerData.filter(b => b.dealCount > 0).length },
          { id: 'AGENCY' as const, label: 'Agency Wise', icon: Building2, count: agencyData.filter(a => a.dealCount > 0).length },
          { id: 'AREA' as const, label: 'Area Wise', icon: Package, count: areaData.filter(a => a.dealCount > 0).length },
          { id: 'GRADE' as const, label: 'Grade Wise', icon: Award, count: gradeData.filter(g => g.dealCount > 0).length },
          { id: 'SUPPLIER' as const, label: 'Supplier Wise', icon: Users, count: supplierData.filter(s => s.dealCount > 0).length },
          { id: 'MONTH' as const, label: 'Month Wise', icon: Calendar, count: monthData.length },
          { id: 'DEDUCTION' as const, label: 'Deductions & Quality', icon: Scissors },
          { id: 'CHECKPOINTS' as const, label: 'Checkpoints Pipeline', icon: Truck },
          { id: 'ALLSAUDA' as const, label: 'All Sauda', icon: Building2, count: filteredSaudaList.length }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              type="button"
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-b from-white to-[#FDE7E6] text-[#D94B5A] font-black shadow-md border border-white'
                  : 'text-white hover:bg-[#F06D6C]/50 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  isActive ? 'bg-[#D94B5A] text-white' : 'bg-[#FBCFCB] text-[#D94B5A]'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ================= TAB 1: DIMENSIONAL BREAKDOWN CONTENT ================= */}
      {activeTab !== 'ALLSAUDA' && activeTab !== 'OVERVIEW' && activeTab !== 'DEDUCTION' && activeTab !== 'CHECKPOINTS' && activeTab !== 'ALL_DEALS' && (
        <div className="space-y-4">

          {/* Sub-Analysis Filter Bar */}
<div className="flex w-full flex-wrap items-stretch gap-2 rounded-2xl border border-[#FBCFCB] bg-gradient-to-br from-white via-[#FDE7E6] to-[#FDE7E6] p-3 shadow-sm">

  {[
    { id: 'VOLUME' as const, label: 'Business Provided', sub: 'Volume & Rate', icon: '📦' },
    { id: 'DEDUCTION' as const, label: 'Deduction', sub: 'Moisture & Grade Down', icon: '✂️' },
    { id: 'CHECKPOINTS' as const, label: 'Checkpoints Pipeline', sub: 'Sauda to Settlement', icon: '🚚' },
    { id: 'PREMIUM' as const, label: 'Premium Given', sub: 'Premium Analysis', icon: '💰' },
  ].map((item) => {
    const isActive = subAnalysisMode === item.id;

    return (
      <button
        type="button"
        key={item.id}
        onClick={() => setSubAnalysisMode(item.id)}
        className={` group relative flex flex-1 min-w-[220px] items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-[#F06D6C]/50 ${ isActive ? 'border-[#E85A5A] bg-gradient-to-br from-[#E85A5A] to-[#D94B5A] text-white shadow-md' : 'border-[#FBCFCB] bg-white text-slate-800 hover:border-[#F7AFA8] hover:bg-[#FDE7E6]/50 hover:shadow-xs' } `}
      >
        <span
          className={`
            flex h-9 w-9 shrink-0 items-center justify-center
            rounded-lg text-base transition-colors
            ${
              isActive
                ? 'bg-white/20 shadow-inner text-white'
                : 'bg-[#FDE7E6] group-hover:bg-[#FBCFCB]'
            }
          `}
        >
          {item.icon}
        </span>

        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="whitespace-nowrap text-xs font-extrabold tracking-wide">
            {item.label}
          </span>
          <span
            className={`whitespace-nowrap text-[10px] font-medium ${
              isActive ? 'text-[#FDE7E6]' : 'text-slate-500'
            }`}
          >
            {item.sub}
          </span>
        </span>

        {isActive && (
          <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-[#FDE7E6]" />
        )}
      </button>
    );
  })}
</div>


          {/* Render Active Sub-View Data */}
          {(() => {
            const rawCurrentData = (
              activeTab === 'BROKER' ? brokerData :
              activeTab === 'AGENCY' ? agencyData :
              activeTab === 'AREA' ? areaData :
              activeTab === 'GRADE' ? gradeData :
              activeTab === 'SUPPLIER' ? supplierData : monthData
            );
            const totalcurrentData = rawCurrentData.filter(item => item.dealCount > 0);
            const currentData = activeTab === 'MONTH' ? [...totalcurrentData].sort((a, b) => { const [yearA, monthA] = String(a.key).split('-').map(Number); const [yearB, monthB] = String(b.key).split('-').map(Number); return ( new Date(yearB, monthB - 1).getTime() - new Date(yearA, monthA - 1).getTime() ); }) : totalcurrentData;

            if (subAnalysisMode === 'VOLUME') {
              if (activeTab === 'MONTH') {
                return (
                  <div className="space-y-4">
                    {/* Month Summary Cards for Sauda Check Point + Final P.O */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3.5 bg-gradient-to-br from-emerald-50 to-green-100 border border-emerald-300 rounded-xl shadow-xs">
                        <span className="text-xs font-black uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                          <span>🟢</span> 1. Sauda Check Point Section (Month Wise Total)
                        </span>
                        <div className="mt-2.5 grid grid-cols-3 gap-2 font-mono text-xs">
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase block font-sans font-bold">Total Deals</span>
                            <strong className="text-slate-900 font-bold text-sm">{monthData.reduce((acc, m) => acc + m.dealCount, 0)} Deals</strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase block font-sans font-bold">Contract Weight</span>
                            <strong className="text-emerald-900 font-bold text-sm">{monthData.reduce((acc, m) => acc + m.quantityMT, 0).toFixed(2)} MT</strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase block font-sans font-bold">Sauda Value</span>
                            <strong className="text-slate-900 font-bold text-sm">{formatIndianCurrency(monthData.reduce((acc, m) => acc + m.grossValue, 0))}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="p-3.5 bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-300 rounded-xl shadow-xs">
                        <span className="text-xs font-black uppercase tracking-wider text-blue-950 flex items-center gap-1.5">
                          <span>📄</span> 2. Final P.O Section (Month Wise Total)
                        </span>
                        <div className="mt-2.5 grid grid-cols-3 gap-2 font-mono text-xs">
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase block font-sans font-bold">Total Final POs</span>
                            <strong className="text-slate-900 font-bold text-sm">{monthData.reduce((acc, m) => acc + m.poCount, 0)} POs</strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase block font-sans font-bold">PO Weight</span>
                            <strong className="text-blue-900 font-bold text-sm">{monthData.reduce((acc, m) => acc + m.poQuantityMT, 0).toFixed(2)} MT</strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase block font-sans font-bold">PO Value</span>
                            <strong className="text-slate-900 font-bold text-sm">{formatIndianCurrency(monthData.reduce((acc, m) => acc + m.poGrossValue, 0))}</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Integrated Both Section Month Wise Table */}
                    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-900 text-white font-black uppercase text-[10px] tracking-wider">
                            <th className="p-3 border-r border-slate-800" rowSpan={2}>Month</th>
                            <th className="p-2 text-center bg-emerald-950 text-emerald-200 border-r border-emerald-900" colSpan={4}>
                              🟢 SAUDA CHECK POINT SECTION
                            </th>
                            <th className="p-2 text-center bg-blue-950 text-blue-200" colSpan={5}>
                              📄 FINAL P.O SECTION
                            </th>
                          </tr>
                          <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b">
                            <th className="p-2.5 text-center bg-emerald-50">Contract Sauda</th>
                            <th className="p-2.5 text-right bg-emerald-50">Contract Wt (MT)</th>
                            <th className="p-2.5 text-right bg-emerald-50">Avg Rate (₹)</th>
                            <th className="p-2.5 text-right bg-emerald-50 border-r border-slate-200">Sauda Value</th>
                            
                            <th className="p-2.5 text-center bg-blue-50">Final POs</th>
                            <th className="p-2.5 text-right bg-blue-50">PO Weight (MT)</th>
                            <th className="p-2.5 text-right bg-blue-50">Arrived Wt (MT)</th>
                            <th className="p-2.5 text-right bg-blue-50">Paid Amount</th>
                            <th className="p-2.5 text-right bg-blue-50 text-rose-800">Pending Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium font-mono text-[11px]">
                          {currentData.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition">
                              <td className="p-2.5 font-bold text-slate-900 font-sans border-r border-slate-200 flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] flex items-center justify-center font-bold">
                                  {idx + 1}
                                </span>
                                <span>{row.key}</span>
                              </td>
                              {/* Sauda Check Point */}
                              <td className="p-2.5 text-center font-bold text-emerald-900 bg-emerald-50/30">{row.dealCount}</td>
                              <td className="p-2.5 text-right font-bold text-emerald-950 bg-emerald-50/30">{row.quantityMT.toFixed(2)} MT</td>
                              <td className="p-2.5 text-right text-slate-800 bg-emerald-50/30">₹{Math.round(row.avgRate).toLocaleString()}</td>
                              <td className="p-2.5 text-right font-bold text-slate-900 bg-emerald-50/30 border-r border-slate-200">{formatIndianCurrency(row.grossValue)}</td>

                              {/* Final PO */}
                              <td className="p-2.5 text-center font-bold text-blue-900 bg-blue-50/30">{row.poCount}</td>
                              <td className="p-2.5 text-right font-bold text-blue-950 bg-blue-50/30">{row.poQuantityMT.toFixed(2)} MT</td>
                              <td className="p-2.5 text-right text-slate-700 bg-blue-50/30">{row.arrivedMT.toFixed(2)} MT</td>
                              <td className="p-2.5 text-right font-bold text-emerald-800 bg-blue-50/30">{formatIndianCurrency(row.paidAmount)}</td>
                              <td className="p-2.5 text-right font-bold text-rose-800 bg-blue-50/30">{formatIndianCurrency(row.pendingPayable)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b">
                        <th className="p-3">
                          {activeTab === 'BROKER' ? 'Broker Name' : 
                           activeTab === 'SUPPLIER' ? 'Supplier Name' : 
                           activeTab === 'AGENCY' ? 'Agency Name' : 
                           activeTab === 'AREA' ? 'Area Name' : 
                           activeTab === 'GRADE' ? 'Grade Name' : 
                           'Broker Name'}
                        </th>
                        <th className="p-3 text-center">Contract Sauda</th>
                        <th className="p-3 text-right">Contract MT</th>
                        <th className="p-3 text-right">Arrived Weight (MT)</th>
                        <th className="p-3 text-right">Avg Rate (₹/Qtl)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                    {[...currentData]
                        .sort((a, b) => {
                          const [yearA, monthA] = String(a.key).split("-").map(Number);
                          const [yearB, monthB] = String(b.key).split("-").map(Number);

                          return (
                            new Date(yearB, monthB - 1).getTime() -
                            new Date(yearA, monthA - 1).getTime()
                          );
                        })
                        .map((row, idx) => (
                          <tr
                            key={idx}
                            onClick={() => {
                              setSelectedEntityModalInfo({ entityName: row.key, dimensionType: activeTab });
                              if (activeTab === 'BROKER') setSelectedBrokerModalBroker(row.key);
                            }}
                            className="transition hover:bg-emerald-50/60 cursor-pointer"
                          >
                            <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-mono flex items-center justify-center font-bold">
                                {idx + 1}
                              </span>
                              <span>{row.key}</span>
                            </td>
                            <td className="p-3 text-center font-mono font-bold text-slate-600">{row.dealCount}</td>
                            <td className="p-3 text-right font-mono font-bold text-emerald-950">{row.quantityMT.toFixed(2)} MT</td>
                            <td className="p-3 text-right font-mono text-slate-700">{row.arrivedMT.toFixed(2)} MT</td>
                            <td className="p-3 text-right font-mono font-bold text-slate-800">₹{Math.round(row.avgRate).toLocaleString()}</td>
                          </tr>
                        ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                        <td className="p-3">Total / Summary ({currentData.length} Entities)</td>
                        <td className="p-3 text-center font-mono">{currentData.reduce((acc, r) => acc + r.dealCount, 0)}</td>
                        <td className="p-3 text-right font-mono text-emerald-950">{currentData.reduce((acc, r) => acc + r.quantityMT, 0).toFixed(2)} MT</td>
                        <td className="p-3 text-right font-mono text-slate-700">{currentData.reduce((acc, r) => acc + r.arrivedMT, 0).toFixed(2)} MT</td>
                        <td className="p-3 text-right font-mono text-slate-800">
                          ₹{currentData.length > 0 ? Math.round(currentData.reduce((acc, r) => acc + (r.avgRate * r.quantityMT), 0) / (currentData.reduce((acc, r) => acc + r.quantityMT, 0) || 1)).toLocaleString() : 0}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              );
            }

            if (subAnalysisMode === 'DEDUCTION') {
              // 1. Filter: "If Here This Fields Have No Data Dont Shw The Brokere Here Moisture Sett (%), Dust Sett (%), Gradedown Sett (%), Short / Excess (₹)"
              const baseList = (activeTab === 'BROKER' ? rawCurrentData : currentData);
              const filteredDeductionRows = baseList.filter(row => {
                const sett = dataset.brokerSettlementMap?.[row.key.toUpperCase()];
                const moistAvg = sett && sett.inspMoistCount && sett.inspMoistCount > 0
                  ? (sett.inspMoistSum! / sett.inspMoistCount!)
                  : (sett?.moistureSettAvg || 0);
                const dustAvg = sett && sett.inspDustCount && sett.inspDustCount > 0
                  ? (sett.inspDustSum! / sett.inspDustCount!)
                  : (sett?.dustSettAvg || 0);
                const gdAvg = sett && sett.inspGdCount && sett.inspGdCount > 0
                  ? (sett.inspGdSum! / sett.inspGdCount!)
                  : (sett?.gradedownSettAvg || 0);
                const shortExcess = sett ? (sett.shortExcess || 0) : 0;

                // Must have non-zero data in at least one of these 4 fields
                const hasDeductionData = moistAvg > 0 || dustAvg > 0 || gdAvg > 0 || shortExcess !== 0;
                if (!hasDeductionData) return false;

                if (searchQuery.trim()) {
                  return row.key.toLowerCase().includes(searchQuery.toLowerCase().trim());
                }
                return true;
              });

              // 2. Sort by selected column
              const deductionRows = [...filteredDeductionRows].sort((a, b) => {
                const settA = dataset.brokerSettlementMap?.[a.key.toUpperCase()];
                const settB = dataset.brokerSettlementMap?.[b.key.toUpperCase()];

                let valA = 0;
                let valB = 0;

                switch (deductionSortField) {
                  case 'quantityMT':
                    valA = a.quantityMT || 0;
                    valB = b.quantityMT || 0;
                    break;
                  case 'moistureSett':
                    valA = settA && settA.inspMoistCount && settA.inspMoistCount > 0
                      ? (settA.inspMoistSum! / settA.inspMoistCount!)
                      : (settA?.moistureSettAvg || 0);
                    valB = settB && settB.inspMoistCount && settB.inspMoistCount > 0
                      ? (settB.inspMoistSum! / settB.inspMoistCount!)
                      : (settB?.moistureSettAvg || 0);
                    break;
                  case 'dustSett':
                    valA = settA && settA.inspDustCount && settA.inspDustCount > 0
                      ? (settA.inspDustSum! / settA.inspDustCount!)
                      : (settA?.dustSettAvg || 0);
                    valB = settB && settB.inspDustCount && settB.inspDustCount > 0
                      ? (settB.inspDustSum! / settB.inspDustCount!)
                      : (settB?.dustSettAvg || 0);
                    break;
                  case 'gradedownSett':
                    valA = settA && settA.inspGdCount && settA.inspGdCount > 0
                      ? (settA.inspGdSum! / settA.inspGdCount!)
                      : (settA?.gradedownSettAvg || 0);
                    valB = settB && settB.inspGdCount && settB.inspGdCount > 0
                      ? (settB.inspGdSum! / settB.inspGdCount!)
                      : (settB?.gradedownSettAvg || 0);
                    break;
                  case 'dealCount':
                    valA = a.dealCount || 0;
                    valB = b.dealCount || 0;
                    break;
                  case 'shortExcess':
                    valA = settA?.shortExcess || 0;
                    valB = settB?.shortExcess || 0;
                    break;
                  case 'deductionAmount':
                    valA = settA?.otherDeductionAmount || a.deductionAmount || 0;
                    valB = settB?.otherDeductionAmount || b.deductionAmount || 0;
                    break;
                  case 'broker':
                    return deductionSortAsc ? a.key.localeCompare(b.key) : b.key.localeCompare(a.key);
                  default:
                    valA = a.quantityMT || 0;
                    valB = b.quantityMT || 0;
                }

                if (valA === valB) {
                  return b.quantityMT - a.quantityMT;
                }
                return deductionSortAsc ? valA - valB : valB - valA;
              });

              return (
                <div className="space-y-3">
                  <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs bg-white">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b select-none">
                          <th 
                            onClick={() => handleDeductionSort('broker')}
                            className="p-3 cursor-pointer hover:bg-slate-200/90 transition group"
                            title="Sort by Name"
                          >
                            <div className="inline-flex items-center gap-1.5">
                              <span>
                                {activeTab === 'BROKER' ? 'Broker Name' : 
                                 activeTab === 'SUPPLIER' ? 'Supplier Name' : 
                                 activeTab === 'AGENCY' ? 'Agency Name' : 
                                 activeTab === 'AREA' ? 'Area Name' : 
                                 activeTab === 'GRADE' ? 'Grade Name' : 
                                 'Broker Name'}
                              </span>
                              <span className={`inline-flex items-center justify-center p-0.5 rounded transition ${
                                deductionSortField === 'broker'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'text-slate-400 group-hover:text-slate-700 group-hover:bg-slate-200'
                              }`}>
                                {deductionSortField === 'broker' ? (
                                  deductionSortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpDown className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                                )}
                              </span>
                            </div>
                          </th>
                          <th 
                            onClick={() => handleDeductionSort('dealCount')}
                            className="p-3 text-center cursor-pointer hover:bg-slate-200/90 transition group"
                            title="Sort by Contract Sauda Deals"
                          >
                            <div className="inline-flex items-center justify-center gap-1.5">
                              <span>Contract Sauda</span>
                              <span className={`inline-flex items-center justify-center p-0.5 rounded transition ${
                                deductionSortField === 'dealCount'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'text-slate-400 group-hover:text-slate-700 group-hover:bg-slate-200'
                              }`}>
                                {deductionSortField === 'dealCount' ? (
                                  deductionSortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpDown className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                                )}
                              </span>
                            </div>
                          </th>
                          <th 
                            onClick={() => handleDeductionSort('quantityMT')}
                            className="p-3 text-right cursor-pointer hover:bg-slate-200/90 transition group"
                            title="Sort by Contract MT"
                          >
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              <span>Contract MT</span>
                              <span className={`inline-flex items-center justify-center p-0.5 rounded transition ${
                                deductionSortField === 'quantityMT'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'text-slate-400 group-hover:text-slate-700 group-hover:bg-slate-200'
                              }`}>
                                {deductionSortField === 'quantityMT' ? (
                                  deductionSortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpDown className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                                )}
                              </span>
                            </div>
                          </th>
                          <th 
                            onClick={() => handleDeductionSort('moistureSett')}
                            className="p-3 text-right cursor-pointer hover:bg-slate-200/90 transition group"
                            title="Sort by Moisture Sett (%) - Average of claim_moisture (>0) from material_inspection: SUM / COUNT(>0)"
                          >
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              <span>Moisture Sett (%)</span>
                              <span className={`inline-flex items-center justify-center p-0.5 rounded transition ${
                                deductionSortField === 'moistureSett'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'text-slate-400 group-hover:text-slate-700 group-hover:bg-slate-200'
                              }`}>
                                {deductionSortField === 'moistureSett' ? (
                                  deductionSortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5" />
                                )}
                              </span>
                            </div>
                          </th>
                          <th 
                            onClick={() => handleDeductionSort('dustSett')}
                            className="p-3 text-right cursor-pointer hover:bg-slate-200/90 transition group"
                            title="Sort by Dust Sett (%) - Average of claim_dust (>0) from material_inspection: SUM / COUNT(>0)"
                          >
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              <span>Dust Sett (%)</span>
                              <span className={`inline-flex items-center justify-center p-0.5 rounded transition ${
                                deductionSortField === 'dustSett'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'text-slate-400 group-hover:text-slate-700 group-hover:bg-slate-200'
                              }`}>
                                {deductionSortField === 'dustSett' ? (
                                  deductionSortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5" />
                                )}
                              </span>
                            </div>
                          </th>
                          <th 
                            onClick={() => handleDeductionSort('gradedownSett')}
                            className="p-3 text-right cursor-pointer hover:bg-slate-200/90 transition group"
                            title="Sort by Gradedown Sett (%) - Average of claim_grade_down (>0) from material_inspection: SUM / COUNT(>0)"
                          >
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              <span>Gradedown Sett (%)</span>
                              <span className={`inline-flex items-center justify-center p-0.5 rounded transition ${
                                deductionSortField === 'gradedownSett'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'text-slate-400 group-hover:text-slate-700 group-hover:bg-slate-200'
                              }`}>
                                {deductionSortField === 'gradedownSett' ? (
                                  deductionSortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5" />
                                )}
                              </span>
                            </div>
                          </th>
                          <th 
                            onClick={() => handleDeductionSort('shortExcess')}
                            className="p-3 text-right cursor-pointer hover:bg-slate-200/90 transition group"
                            title="Sort by Shortage/Excess Deduction calculated in Amount (₹)"
                          >
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              <span>Short / Excess (₹)</span>
                              <span className={`inline-flex items-center justify-center p-0.5 rounded transition ${
                                deductionSortField === 'shortExcess'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'text-slate-400 group-hover:text-slate-700 group-hover:bg-slate-200'
                              }`}>
                                {deductionSortField === 'shortExcess' ? (
                                  deductionSortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5" />
                                )}
                              </span>
                            </div>
                          </th>
                          <th className="p-3 text-left" title="Specific Deduction Types applied (e.g. Katta, Bardan, Quality, etc.)">Deduction Type</th>
                          <th 
                            onClick={() => handleDeductionSort('deductionAmount')}
                            className="p-3 text-right cursor-pointer hover:bg-slate-200/90 transition group"
                            title="Sort by Explicit Deduction Amount in Rupees"
                          >
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              <span>Deduction Amount (₹)</span>
                              <span className={`inline-flex items-center justify-center p-0.5 rounded transition ${
                                deductionSortField === 'deductionAmount'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'text-slate-400 group-hover:text-slate-700 group-hover:bg-slate-200'
                              }`}>
                                {deductionSortField === 'deductionAmount' ? (
                                  deductionSortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5" />
                                )}
                              </span>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium font-mono">
                        {deductionRows.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="p-8 text-center text-slate-400 font-sans font-medium">
                              No {activeTab === 'AGENCY' ? 'agencies' : activeTab === 'SUPPLIER' ? 'suppliers' : activeTab === 'AREA' ? 'areas' : activeTab === 'GRADE' ? 'grades' : 'brokers'} found with active Moisture, Dust, Gradedown, or Short/Excess deduction data.
                            </td>
                          </tr>
                        ) : (
                          deductionRows.map((row, idx) => {
                            const settInfo = dataset.brokerSettlementMap?.[row.key.toUpperCase()] || {
                              moistureClaim: 0,
                              moistureSett: 0,
                              dustClaim: 0,
                              dustSett: 0,
                              gradedownClaim: 0,
                              gradedownSett: 0,
                              moistCount: 0,
                              dustCount: 0,
                              gdCount: 0,
                              shortExcess: 0,
                              otherDeductionAmount: 0,
                              deductionTypes: [],
                              allDeductionValue: row.deductionAmount,
                              inspMoistSum: 0,
                              inspMoistCount: 0,
                              inspDustSum: 0,
                              inspDustCount: 0,
                              inspGdSum: 0,
                              inspGdCount: 0,
                              moistureSettAvg: 0,
                              dustSettAvg: 0,
                              gradedownSettAvg: 0,
                              details: []
                            };

                            // Average of non-zero values: SUM(field_value) / COUNT(rows where field_value > 0)
                            // Strictly ignore and exclude rows where value is 0
                            const moistAvg = (settInfo.inspMoistCount && settInfo.inspMoistCount > 0)
                              ? (settInfo.inspMoistSum! / settInfo.inspMoistCount!)
                              : (settInfo.moistureSettAvg || 0);

                            const dustAvg = (settInfo.inspDustCount && settInfo.inspDustCount > 0)
                              ? (settInfo.inspDustSum! / settInfo.inspDustCount!)
                              : (settInfo.dustSettAvg || 0);

                            const gdAvg = (settInfo.inspGdCount && settInfo.inspGdCount > 0)
                              ? (settInfo.inspGdSum! / settInfo.inspGdCount!)
                              : (settInfo.gradedownSettAvg || 0);

                            const moistVal = moistAvg > 0 ? `${moistAvg.toFixed(2)}%` : '—';
                            const dustVal = dustAvg > 0 ? `${dustAvg.toFixed(2)}%` : '—';
                            const gdVal = gdAvg > 0 ? `${gdAvg.toFixed(2)}%` : '—';

                            const shortExcessVal = settInfo.shortExcess !== 0
                              ? `₹${Math.round(settInfo.shortExcess).toLocaleString()}`
                              : '—';

                            const dedAmountVal = (settInfo.otherDeductionAmount || 0) > 0
                              ? `₹${Math.round(settInfo.otherDeductionAmount || 0).toLocaleString()}`
                              : '—';

                            const cleanDeductionTypes = (settInfo.deductionTypes || []).filter((dt: any) => {
                              const str = typeof dt === 'object' ? (dt.deduction_type || dt.adjust_type || '') : String(dt || '');
                              return str && str.trim() !== '' && str.trim() !== '[object Object]';
                            });

                            return (
                              <tr
                                key={idx}
                                onClick={() => {
                                  setSelectedEntityModalInfo({ entityName: row.key, dimensionType: activeTab });
                                  if (activeTab === 'BROKER') setSelectedBrokerModalBroker(row.key);
                                }}
                                className="transition hover:bg-emerald-50/70 cursor-pointer"
                              >
                                <td className="p-3 font-bold text-slate-900 font-sans flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-mono flex items-center justify-center font-bold">
                                    {idx + 1}
                                  </span>
                                  <span>{row.key}</span>
                                </td>
                                <td className="p-3 text-center font-bold text-slate-700">{row.dealCount}</td>
                                <td className="p-3 text-right font-bold text-emerald-950">{row.quantityMT.toFixed(2)} MT</td>
                                <td className="p-3 text-right text-slate-700 font-mono font-semibold">{moistVal}</td>
                                <td className="p-3 text-right text-slate-700 font-mono font-semibold">{dustVal}</td>
                                <td className="p-3 text-right text-slate-700 font-mono font-semibold">{gdVal}</td>
                                <td className="p-3 text-right text-slate-700 font-mono">{shortExcessVal}</td>
                                <td className="p-3 text-left font-sans text-slate-700">
                                  {cleanDeductionTypes.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {cleanDeductionTypes.map((dt: any, dIdx: number) => {
                                        const label = typeof dt === 'object' ? (dt.deduction_type || dt.adjust_type || '') : String(dt);
                                        return (
                                          <span key={dIdx} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200">
                                            {label}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </td>
                                <td className="p-3 text-right font-mono font-semibold text-slate-800">{dedAmountVal}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                          <td className="p-3 font-sans">Total / Summary ({deductionRows.length} Entities)</td>
                          <td className="p-3 text-center font-mono">{deductionRows.reduce((acc, r) => acc + r.dealCount, 0)}</td>
                          <td className="p-3 text-right font-mono text-emerald-950">{deductionRows.reduce((acc, r) => acc + r.quantityMT, 0).toFixed(2)} MT</td>
                          <td className="p-3 text-right font-mono text-slate-800">
                            {(() => {
                              let totalSum = 0;
                              let totalCount = 0;
                              deductionRows.forEach(r => {
                                const s = dataset.brokerSettlementMap?.[r.key.toUpperCase()];
                                if (s && s.inspMoistCount && s.inspMoistCount > 0) {
                                  totalSum += s.inspMoistSum || 0;
                                  totalCount += s.inspMoistCount;
                                }
                              });
                              if (totalCount === 0) return '—';
                              return `${(totalSum / totalCount).toFixed(2)}%`;
                            })()}
                          </td>
                          <td className="p-3 text-right font-mono text-slate-800">
                            {(() => {
                              let totalSum = 0;
                              let totalCount = 0;
                              deductionRows.forEach(r => {
                                const s = dataset.brokerSettlementMap?.[r.key.toUpperCase()];
                                if (s && s.inspDustCount && s.inspDustCount > 0) {
                                  totalSum += s.inspDustSum || 0;
                                  totalCount += s.inspDustCount;
                                }
                              });
                              if (totalCount === 0) return '—';
                              return `${(totalSum / totalCount).toFixed(2)}%`;
                            })()}
                          </td>
                          <td className="p-3 text-right font-mono text-slate-800">
                            {(() => {
                              let totalSum = 0;
                              let totalCount = 0;
                              deductionRows.forEach(r => {
                                const s = dataset.brokerSettlementMap?.[r.key.toUpperCase()];
                                if (s && s.inspGdCount && s.inspGdCount > 0) {
                                  totalSum += s.inspGdSum || 0;
                                  totalCount += s.inspGdCount;
                                }
                              });
                              if (totalCount === 0) return '—';
                              return `${(totalSum / totalCount).toFixed(2)}%`;
                            })()}
                          </td>
                          <td className="p-3 text-right font-mono text-slate-800">
                            ₹{Math.round(deductionRows.reduce((acc, r) => {
                              const sett = dataset.brokerSettlementMap?.[r.key.toUpperCase()];
                              return acc + (sett?.shortExcess || 0);
                            }, 0)).toLocaleString()}
                          </td>
                          <td className="p-3 text-left font-mono text-slate-500">—</td>
                          <td className="p-3 text-right font-mono text-slate-800">
                            ₹{Math.round(deductionRows.reduce((acc, r) => {
                              const sett = dataset.brokerSettlementMap?.[r.key.toUpperCase()];
                              return acc + (sett?.otherDeductionAmount || 0);
                            }, 0)).toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              );
            }

            if (subAnalysisMode === 'CHECKPOINTS') {
              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b">
                        <th className="p-3">Entity Name</th>
                        <th className="p-3 text-center bg-emerald-50">1. Sauda Check Point</th>
                        <th className="p-3 text-center bg-blue-50">2. Temporary Arrival</th>
                        <th className="p-3 text-center bg-indigo-50">3. Final Arrival</th>
                        <th className="p-3 text-center bg-purple-50">4. Mill Inspection</th>
                        <th className="p-3 text-center bg-yellow-50">5. Payment Operation</th>
                        <th className="p-3 text-center bg-emerald-100">6. Settlement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {currentData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition">
                          <td className="p-3 font-bold text-slate-900">{row.key}</td>
                          <td className="p-3 text-center font-mono font-bold text-emerald-900 bg-emerald-50/50">{row.saudaCheckpointCount} Deals</td>
                          <td className="p-3 text-center font-mono font-bold text-blue-900 bg-blue-50/50">{row.tempArrivalCount} Arrivals</td>
                          <td className="p-3 text-center font-mono font-bold text-indigo-900 bg-indigo-50/50">{row.finalArrivalCount} Completed</td>
                          <td className="p-3 text-center font-mono font-bold text-purple-900 bg-purple-50/50">{row.millInspectionCount} Inspected</td>
                          <td className="p-3 text-center font-mono font-bold text-yellow-900 bg-yellow-50/50">{row.paymentOperationCount} Paid</td>
                          <td className="p-3 text-center font-mono font-bold text-emerald-950 bg-emerald-100/50">{row.settlementCount} Settled</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }

            if (subAnalysisMode === 'PREMIUM') {
              // 1. Filter: Show only rows where Total Premium Given (₹) > 0
              const filteredPremiumRows = currentData.filter(row => {
                if (!row.premiumAmount || row.premiumAmount <= 0) return false;
                if (searchQuery.trim()) {
                  return row.key.toLowerCase().includes(searchQuery.toLowerCase().trim());
                }
                return true;
              });

              // 2. Sort by selected column (default: highest premium first)
              const sortedPremiumRows = [...filteredPremiumRows].sort((a, b) => {
                let valA = 0;
                let valB = 0;

                switch (premiumSortField) {
                  case 'broker':
                    return premiumSortAsc ? a.key.localeCompare(b.key) : b.key.localeCompare(a.key);
                  case 'dealCount':
                    valA = a.dealCount || 0;
                    valB = b.dealCount || 0;
                    break;
                  case 'quantityMT':
                    valA = a.quantityMT || 0;
                    valB = b.quantityMT || 0;
                    break;
                  case 'premiumAmount':
                  default:
                    valA = a.premiumAmount || 0;
                    valB = b.premiumAmount || 0;
                    break;
                }

                if (valA === valB) {
                  return b.quantityMT - a.quantityMT;
                }
                return premiumSortAsc ? valA - valB : valB - valA;
              });

              const totalDeals = sortedPremiumRows.reduce((acc, r) => acc + (r.dealCount || 0), 0);
              const totalMT = sortedPremiumRows.reduce((acc, r) => acc + (r.quantityMT || 0), 0);
              const totalPremium = sortedPremiumRows.reduce((acc, r) => acc + (r.premiumAmount || 0), 0);

              const entityHeaderName = (
                activeTab === 'BROKER' ? 'Broker Name' :
                activeTab === 'SUPPLIER' ? 'Supplier Name' :
                activeTab === 'AGENCY' ? 'Agency Name' :
                activeTab === 'AREA' ? 'Area Name' :
                activeTab === 'GRADE' ? 'Grade Name' :
                'Broker Name'
              );

              return (
                <div className="space-y-3">
                  <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs bg-white">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b select-none">
                          <th
                            onClick={() => handlePremiumSort('broker')}
                            className="p-3 cursor-pointer hover:bg-slate-200/90 transition group"
                            title="Sort by Name"
                          >
                            <div className="inline-flex items-center gap-1.5">
                              <span>{entityHeaderName}</span>
                              <span className={`inline-flex items-center justify-center p-0.5 rounded transition ${
                                premiumSortField === 'broker'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'text-slate-400 group-hover:text-slate-700 group-hover:bg-slate-200'
                              }`}>
                                {premiumSortField === 'broker' ? (
                                  premiumSortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpDown className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                                )}
                              </span>
                            </div>
                          </th>
                          <th
                            onClick={() => handlePremiumSort('dealCount')}
                            className="p-3 text-center cursor-pointer hover:bg-slate-200/90 transition group"
                            title="Sort by Deals"
                          >
                            <div className="inline-flex items-center justify-center gap-1.5">
                              <span>Deals</span>
                              <span className={`inline-flex items-center justify-center p-0.5 rounded transition ${
                                premiumSortField === 'dealCount'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'text-slate-400 group-hover:text-slate-700 group-hover:bg-slate-200'
                              }`}>
                                {premiumSortField === 'dealCount' ? (
                                  premiumSortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpDown className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                                )}
                              </span>
                            </div>
                          </th>
                          <th
                            onClick={() => handlePremiumSort('quantityMT')}
                            className="p-3 text-right cursor-pointer hover:bg-slate-200/90 transition group"
                            title="Sort by Contract MT"
                          >
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <span>Contract MT</span>
                              <span className={`inline-flex items-center justify-center p-0.5 rounded transition ${
                                premiumSortField === 'quantityMT'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'text-slate-400 group-hover:text-slate-700 group-hover:bg-slate-200'
                              }`}>
                                {premiumSortField === 'quantityMT' ? (
                                  premiumSortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpDown className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                                )}
                              </span>
                            </div>
                          </th>
                          <th
                            onClick={() => handlePremiumSort('premiumAmount')}
                            className="p-3 text-right cursor-pointer hover:bg-emerald-100/90 transition group bg-emerald-50/70"
                            title="Sort by Total Premium Given"
                          >
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <span className="text-emerald-800 font-black">Total Premium Given (₹)</span>
                              <span className={`inline-flex items-center justify-center p-0.5 rounded transition ${
                                premiumSortField === 'premiumAmount'
                                  ? 'bg-emerald-700 text-white shadow-xs'
                                  : 'text-emerald-700 group-hover:text-emerald-950 group-hover:bg-emerald-200'
                              }`}>
                                {premiumSortField === 'premiumAmount' ? (
                                  premiumSortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpDown className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                                )}
                              </span>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {sortedPremiumRows.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-slate-400 font-bold">
                              No records found with positive premium given.
                            </td>
                          </tr>
                        ) : (
                          sortedPremiumRows.map((row, idx) => (
                            <tr
                              key={idx}
                              onClick={() => {
                                if (activeTab === 'BROKER') {
                                  setSelectedPremiumModalBroker(row.key);
                                }
                              }}
                              className={`transition ${activeTab === 'BROKER' ? 'hover:bg-emerald-50/70 cursor-pointer' : 'hover:bg-slate-50'}`}
                            >
                              <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                                <span>{row.key}</span>
                                {activeTab === 'BROKER' && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedPremiumModalBroker(row.key);
                                    }}
                                    className="text-[9px] bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded font-mono font-bold transition shadow-2xs cursor-pointer inline-flex items-center gap-1 border border-emerald-300"
                                    title="Click Details to view broker premium transactions"
                                  >
                                    Click Details ↗
                                  </button>
                                )}
                              </td>
                              <td className="p-3 text-center font-mono font-bold text-slate-700">{row.dealCount}</td>
                              <td className="p-3 text-right font-mono font-bold text-slate-800">{row.quantityMT.toFixed(2)} MT</td>
                              <td className="p-3 text-right font-mono font-black text-emerald-800 bg-emerald-50/30">
                                +₹{Math.round(row.premiumAmount).toLocaleString()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      {sortedPremiumRows.length > 0 && (
                        <tfoot>
                          <tr className="bg-slate-100/90 font-bold border-t-2 border-slate-300 text-slate-900">
                            <td className="p-3 uppercase text-[11px] font-black text-slate-900">
                              TOTAL ({sortedPremiumRows.length} {activeTab === 'BROKER' ? 'Brokers' : 'Entities'})
                            </td>
                            <td className="p-3 text-center font-mono font-black text-slate-900 text-xs">
                              {totalDeals} Deals
                            </td>
                            <td className="p-3 text-right font-mono font-black text-slate-900 text-xs">
                              {totalMT.toFixed(2)} MT
                            </td>
                            <td className="p-3 text-right font-mono font-black text-emerald-800 text-xs bg-emerald-100/50">
                              +₹{Math.round(totalPremium).toLocaleString()}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              );
            }

            return null;



            return null;
          })()}
        </div>
      )}

      {/* ================= TAB 2: DEDUCTIONS & QUALITY SUMMARY ================= */}
      {activeTab === 'DEDUCTION' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-base font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Scissors className="w-5 h-5 text-rose-600" />
                Deduction & Quality Inspection Analysis
              </h3>
              {/* <p className="text-xs text-slate-500 mt-0.5">
                Moisture claims, Grade Down demotions, quality penalties, and claim settlements across suppliers and brokers.
              </p> */}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl">
              <span className="text-xs font-bold text-rose-900 uppercase block">Total Quality Deductions</span>
              <strong className="text-2xl font-black text-rose-950 font-mono block mt-1">
                {formatIndianCurrency(metrics.totalDeduction)}
              </strong>
              {/* <span className="text-[10px] text-rose-700 mt-1 block">Moisture + Grade Down + Short Weight</span> */}
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
              <span className="text-xs font-bold text-emerald-900 uppercase block">Total Premium Paid</span>
              <strong className="text-2xl font-black text-emerald-950 font-mono block mt-1">
                {formatIndianCurrency(metrics.totalPremium)}
              </strong>
              {/* <span className="text-[10px] text-emerald-700 mt-1 block">Premium allowed for superior quality / agency</span> */}
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
              <span className="text-xs font-bold text-amber-900 uppercase block">Abnormal / Flagged Transactions</span>
              <strong className="text-2xl font-black text-amber-950 font-mono block mt-1">
                {metrics.abnormalCount} Deals
              </strong>
              {/* <span className="text-[10px] text-amber-700 mt-1 block">High Moisture, High Deduction, or Quality Exception</span> */}
            </div>
          </div>

          {/* Supplier Deductions Ranking Table */}
          <div className="pt-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-2">
              Supplier Wise Deduction Ranking
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b">
                    <th className="p-2.5">Supplier / Party</th>
                    <th className="p-2.5 text-center">Deals</th>
                    <th className="p-2.5 text-right">Contract MT</th>
                    <th className="p-2.5 text-right">Total Value</th>
                    <th className="p-2.5 text-right text-rose-700">Deduction Amount (₹)</th>
                    <th className="p-2.5 text-right">Deduction % of Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {supplierData
                    .filter(s => s.deductionAmount > 0)
                    .sort((a, b) => b.deductionAmount - a.deductionAmount)
                    .map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-slate-900">{s.key}</td>
                        <td className="p-2.5 text-center font-mono">{s.dealCount}</td>
                        <td className="p-2.5 text-right font-mono">{s.quantityMT.toFixed(2)} MT</td>
                        <td className="p-2.5 text-right font-mono">{formatIndianCurrency(s.grossValue)}</td>
                        <td className="p-2.5 text-right font-mono font-black text-rose-700">-₹{Math.round(s.deductionAmount).toLocaleString()}</td>
                        <td className="p-2.5 text-right font-mono text-slate-700">
                          {s.grossValue > 0 ? `${((s.deductionAmount / s.grossValue) * 100).toFixed(2)}%` : '0%'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: CHECKPOINTS PIPELINE ================= */}
      {activeTab === 'CHECKPOINTS' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-base font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Truck className="w-5 h-5 text-indigo-600" />
                Procurement Checkpoints Pipeline & Stage Status
              </h3>
              {/* <p className="text-xs text-slate-500 mt-0.5">
                Sauda Check Point $\to$ Temporary Arrival $\to$ Final Arrival $\to$ Mill Inspection $\to$ Payment $\to$ Settlement
              </p> */}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {(() => {
              const saudaCount = transactions.length;
              let rawTemp = 0;
              let rawFinal = 0;
              let rawInsp = 0;
              let rawPaid = 0;
              let rawSettled = 0;

              transactions.forEach(t => {
                const hasAmad = Boolean(t.hasAmadArrival || t.arrivedWeightMT > 0 || t.arrivalStatus !== 'PENDING');
                const hasFinal = Boolean(t.hasFinalArrival || (t.pendingWeightMT <= 0.01 && hasAmad));
                const hasInsp = Boolean(t.hasInspection || t.inspectionStatus === 'COMPLETED' || t.moisturePct > 0 || t.deductionAmount > 0);
                const hasPay = Boolean(t.paidAmount > 0);
                const hasSett = Boolean(t.paymentStatus === 'PAID' || t.settlementStatus === 'SETTLED');

                if (hasAmad || hasFinal || hasInsp || hasPay || hasSett) rawTemp += 1;
                if (hasFinal || hasInsp || hasPay || hasSett) rawFinal += 1;
                if (hasInsp || (hasFinal && (hasPay || hasSett))) rawInsp += 1;
                if (hasPay) rawPaid += 1;
                if (hasSett) rawSettled += 1;
              });

              const s1 = saudaCount;
              const s2 = Math.min(s1, rawTemp);
              const s3 = Math.min(s2, rawFinal);
              const s4 = Math.min(s3, rawInsp);
              const s5 = Math.min(s4, rawPaid);
              const s6 = Math.min(s5, rawSettled);

              return [
                { label: 'Sauda Check Point', count: s1, status: 'Completed', color: 'bg-emerald-50 border-emerald-200 text-emerald-900' },
                { label: 'Temporary Arrival', count: s2, status: 'Active', color: 'bg-blue-50 border-blue-200 text-blue-900' },
                { label: 'Final Arrival', count: s3, status: 'In Progress', color: 'bg-indigo-50 border-indigo-200 text-indigo-900' },
                { label: 'Mill Inspection', count: s4, status: 'Inspected', color: 'bg-purple-50 border-purple-200 text-purple-900' },
                { label: 'Payment Operation', count: s5, status: 'Processing', color: 'bg-yellow-50 border-yellow-200 text-yellow-900' },
                { label: 'Settlement', count: s6, status: 'Closed', color: 'bg-emerald-100 border-emerald-300 text-emerald-950' },
              ].map((st, i) => (
                <div key={i} className={`p-3 rounded-2xl border ${st.color}`}>
                  <span className="text-[10px] font-bold uppercase block text-slate-500">{st.label}</span>
                  <strong className="text-xl font-black font-mono block mt-1">{st.count}</strong>
                  <span className="text-[9px] font-bold uppercase tracking-wider block mt-1 text-slate-600">{st.status}</span>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* ================= MAIN TRANSACTIONS LEDGER VIEW ================= */}
      {activeTab === 'ALLSAUDA' && (
       <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-3">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-700" />
              All Sauda ({filteredSaudaList.length})
            </h3>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search Sauda No, Party, Broker..."
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl w-60 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            {/* Month Wise Filter */}
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold">
              <Calendar className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-slate-600 text-[11px] whitespace-nowrap">Month:</span>
              <select
                value={selectedMonth}
                onChange={e => { setSelectedMonth(e.target.value); setAllSaudaPage(1); }}
                className="bg-transparent font-bold text-slate-900 text-xs focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Months</option>
                {availableMonths.map(m => (
                  <option key={m} value={m}>
                    {formatMonthLabel(m)}
                  </option>
                ))}
              </select>
            </div>

            {(searchQuery || selectedMonth !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedMonth('ALL');
                }}
                className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
              >
                Clear Filters
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-[#F48F8B] hover:bg-[#F06D6C] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition cursor-pointer border border-[#E85A5A]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
        <div className="overflow-x-auto border border-[#FBCFCB] rounded-2xl shadow-xs">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-[#D94B5A] via-[#E85A5A] to-[#D94B5A] text-white font-black uppercase text-[10px] tracking-wider border-b-2 border-[#D94B5A] select-none shadow-xs">
                <th className="p-3 cursor-pointer hover:bg-[#F06D6C]/50 transition" onClick={() => handleSort('date')}>
                  <div className="flex items-center gap-1.5">
                    <span>Date</span>
                    <ArrowUpDown className="w-3 h-3 text-[#FBCFCB]" />
                  </div>
                </th>
                <th className="p-3 cursor-pointer hover:bg-[#F06D6C]/50 transition" onClick={() => handleSort('saudaNo')}>
                  <div className="flex items-center gap-1.5">
                    <span>Sauda / PO No.</span>
                    <ArrowUpDown className="w-3 h-3 text-[#FBCFCB]" />
                  </div>
                </th>
                <th className="p-3 cursor-pointer hover:bg-[#F06D6C]/50 transition" onClick={() => handleSort('supplier')}>
                  <div className="flex items-center gap-1.5">
                    <span>Party / Supplier</span>
                    <ArrowUpDown className="w-3 h-3 text-[#FBCFCB]" />
                  </div>
                </th>
                <th className="p-3 cursor-pointer hover:bg-[#F06D6C]/50 transition" onClick={() => handleSort('broker')}>
                  <div className="flex items-center gap-1.5">
                    <span>Broker</span>
                    <ArrowUpDown className="w-3 h-3 text-[#FBCFCB]" />
                  </div>
                </th>
                <th className="p-3 text-right cursor-pointer hover:bg-[#F06D6C]/50 transition" onClick={() => handleSort('quantityMT')}>
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Weight (MT)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredSaudaList.length > 0 ? (
                filteredSaudaList
                  .slice((allSaudaPage - 1) * allSaudaPageSize, allSaudaPage * allSaudaPageSize)
                  .map((t, idx) => {
                    const saudaPoDisplay = t.saudaNo && t.poNo && t.saudaNo !== t.poNo
                      ? `${t.saudaNo} / ${t.poNo}`
                      : (t.saudaNo || t.poNo || '-');

                    return (
                      <tr
                        key={t.id || t.poNo || t.saudaNo || idx}
                        className="hover:bg-slate-50 transition"
                      >
                        <td className="p-3 text-slate-700 font-mono text-[11px] whitespace-nowrap">
                          {t.date || '-'}
                        </td>

                        <td className="p-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {saudaPoDisplay}
                        </td>

                        <td className="p-3 font-bold text-slate-900 max-w-[220px] truncate" title={t.supplier || 'Unassigned'}>
                          {t.supplier || 'Unassigned'}
                        </td>

                        <td className="p-3 text-slate-700 font-semibold max-w-[180px] truncate" title={t.broker || 'Direct'}>
                          {t.broker || 'Direct'}
                        </td>

                        <td className="p-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {Number(t.quantityMT || 0).toFixed(2)} MT
                        </td>
                      </tr>
                    );
                  })
              ) : (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400 space-y-2">
                    <XCircle className="w-8 h-8 text-slate-300 mx-auto" />
                    <div className="font-bold text-slate-700 text-sm">No Sauda Records Found</div>
                    <p className="text-xs text-slate-500">
                      Try clearing search filters or selecting a different month.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION FOOTER */}
        {filteredSaudaList.length > 0 && (
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs font-sans rounded-b-2xl">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Rows per page:</span>
              <select
                value={allSaudaPageSize}
                onChange={e => { setAllSaudaPageSize(Number(e.target.value)); setAllSaudaPage(1); }}
                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
              </select>
              <span className="text-slate-500 ml-2 font-medium">
                Showing {(allSaudaPage - 1) * allSaudaPageSize + 1} to {Math.min(allSaudaPage * allSaudaPageSize, filteredSaudaList.length)} of {filteredSaudaList.length} records
              </span>
            </div>

            <div className="flex items-center gap-1 font-bold">
              <button
                disabled={allSaudaPage === 1}
                onClick={() => setAllSaudaPage(prev => Math.max(1, prev - 1))}
                className="px-3 py-1 bg-white border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100 transition cursor-pointer"
              >
                Prev
              </button>
              <span className="px-2 font-mono">Page {allSaudaPage} of {Math.ceil(filteredSaudaList.length / allSaudaPageSize) || 1}</span>
              <button
                disabled={allSaudaPage >= Math.ceil(filteredSaudaList.length / allSaudaPageSize)}
                onClick={() => setAllSaudaPage(prev => Math.min(Math.ceil(filteredSaudaList.length / allSaudaPageSize), prev + 1))}
                className="px-3 py-1 bg-white border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100 transition cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      )}
      <SimpleDealSlipModal
        transaction={selectedTxn}
        onClose={() => setSelectedTxn(null)}
      />

      <EntityWiseSaudaDetailsModal
        selectedEntityModalInfo={selectedEntityModalInfo}
        selectedBrokerModalBroker={selectedBrokerModalBroker}
        onClose={() => {
          setSelectedEntityModalInfo(null);
          setSelectedBrokerModalBroker(null);
        }}
        dataset={dataset}
        transactions={transactions}
      />

      <BrokerPremiumDetailsModal
        broker={selectedPremiumModalBroker}
        onClose={() => setSelectedPremiumModalBroker(null)}
        transactions={transactions}
      />
    </div>
  );
};
