import React, { useState, useMemo } from 'react';
import { X, Download, Search, FileSpreadsheet, Building2, UserCheck, MapPin, Tag, Package, FileText, ArrowLeft, ChevronRight } from 'lucide-react';
import { ReportTransactionLine } from '../../services/systemReportEngine';

export type DrillDownViewMode = 
  | 'transactions' 
  | 'sauda_quantity' 
  | 'pos' 
  | 'suppliers' 
  | 'brokers' 
  | 'agencies' 
  | 'areas' 
  | 'grades';

interface DrillDownModalProps {
  title: string;
  subtitle?: string;
  transactions: ReportTransactionLine[];
  viewMode?: DrillDownViewMode;
  onClose: () => void;
}

export const DrillDownModal: React.FC<DrillDownModalProps> = ({
  title,
  subtitle,
  transactions,
  viewMode = 'transactions',
  onClose
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubFilter, setSelectedSubFilter] = useState<{
    type: 'grade' | 'supplier' | 'broker' | 'agency' | 'area';
    value: string;
  } | null>(null);

  const isPremiumDrillDown = useMemo(() => {
    return (title || '').toLowerCase().includes('premium');
  }, [title]);

  // 1. Grouped Suppliers
  const supplierGroups = useMemo(() => {
    const map = new Map<string, {
      supplier: string;
      poSet: Set<string>;
      saudaSet: Set<string>;
      totalQuantityMT: number;
    }>();

    transactions.forEach(t => {
      const name = t.supplier && t.supplier !== 'Unassigned Supplier' && t.supplier !== '-' ? t.supplier : 'Unassigned';
      if (!map.has(name)) {
        map.set(name, {
          supplier: name,
          poSet: new Set<string>(),
          saudaSet: new Set<string>(),
          totalQuantityMT: 0
        });
      }
      const entry = map.get(name)!;
      if (t.poNo && t.poNo !== 'Pending P.O.' && t.poNo !== '-') entry.poSet.add(t.poNo);
      if (t.saudaNo && t.saudaNo !== '-') entry.saudaSet.add(t.saudaNo);
      entry.totalQuantityMT += t.quantityMT;
    });

    return Array.from(map.values()).sort((a, b) => b.totalQuantityMT - a.totalQuantityMT);
  }, [transactions]);

  // 2. Grouped Brokers
  const brokerGroups = useMemo(() => {
    const map = new Map<string, {
      broker: string;
      poSet: Set<string>;
      saudaSet: Set<string>;
      totalQuantityMT: number;
    }>();

    transactions.forEach(t => {
      const name = t.broker && t.broker !== 'Direct' && t.broker !== '-' ? t.broker : 'Direct / Unassigned';
      if (!map.has(name)) {
        map.set(name, {
          broker: name,
          poSet: new Set<string>(),
          saudaSet: new Set<string>(),
          totalQuantityMT: 0
        });
      }
      const entry = map.get(name)!;
      if (t.poNo && t.poNo !== 'Pending P.O.' && t.poNo !== '-') entry.poSet.add(t.poNo);
      if (t.saudaNo && t.saudaNo !== '-') entry.saudaSet.add(t.saudaNo);
      entry.totalQuantityMT += t.quantityMT;
    });

    return Array.from(map.values()).sort((a, b) => b.totalQuantityMT - a.totalQuantityMT);
  }, [transactions]);

  // 3. Grouped Agencies
  const agencyGroups = useMemo(() => {
    const map = new Map<string, {
      agency: string;
      poSet: Set<string>;
      saudaSet: Set<string>;
      totalQuantityMT: number;
    }>();

    transactions.forEach(t => {
      const name = t.agency && t.agency !== '-' ? t.agency : 'Unassigned Agency';
      if (!map.has(name)) {
        map.set(name, {
          agency: name,
          poSet: new Set<string>(),
          saudaSet: new Set<string>(),
          totalQuantityMT: 0
        });
      }
      const entry = map.get(name)!;
      if (t.poNo && t.poNo !== 'Pending P.O.' && t.poNo !== '-') entry.poSet.add(t.poNo);
      if (t.saudaNo && t.saudaNo !== '-') entry.saudaSet.add(t.saudaNo);
      entry.totalQuantityMT += t.quantityMT;
    });

    return Array.from(map.values()).sort((a, b) => b.totalQuantityMT - a.totalQuantityMT);
  }, [transactions]);

  // 4. Grouped Areas
  const areaGroups = useMemo(() => {
    const map = new Map<string, {
      area: string;
      poSet: Set<string>;
      saudaSet: Set<string>;
      totalQuantityMT: number;
    }>();

    transactions.forEach(t => {
      const name = t.area && t.area !== '-' ? t.area : 'Unassigned Area';
      if (!map.has(name)) {
        map.set(name, {
          area: name,
          poSet: new Set<string>(),
          saudaSet: new Set<string>(),
          totalQuantityMT: 0
        });
      }
      const entry = map.get(name)!;
      if (t.poNo && t.poNo !== 'Pending P.O.' && t.poNo !== '-') entry.poSet.add(t.poNo);
      if (t.saudaNo && t.saudaNo !== '-') entry.saudaSet.add(t.saudaNo);
      entry.totalQuantityMT += t.quantityMT;
    });

    return Array.from(map.values()).sort((a, b) => b.totalQuantityMT - a.totalQuantityMT);
  }, [transactions]);

  // 5. Grouped Grades
  const gradeGroups = useMemo(() => {
    const map = new Map<string, {
      grade: string;
      poSet: Set<string>;
      saudaSet: Set<string>;
      totalQuantityMT: number;
    }>();

    transactions.forEach(t => {
      const g = (t.grade || '').trim();
      if (!g || g === '-' || g.toUpperCase() === 'NORMAL' || g.toUpperCase() === 'STANDARD GRADE' || g.toUpperCase() === 'NORMAL GRADE' || g.toUpperCase() === 'UNASSIGNED') return;
      const name = g;
      if (!map.has(name)) {
        map.set(name, {
          grade: name,
          poSet: new Set<string>(),
          saudaSet: new Set<string>(),
          totalQuantityMT: 0
        });
      }
      const entry = map.get(name)!;
      if (t.poNo && t.poNo !== 'Pending P.O.' && t.poNo !== '-') entry.poSet.add(t.poNo);
      if (t.saudaNo && t.saudaNo !== '-') entry.saudaSet.add(t.saudaNo);
      entry.totalQuantityMT += t.quantityMT;
    });

    return Array.from(map.values()).sort((a, b) => b.totalQuantityMT - a.totalQuantityMT);
  }, [transactions]);

  // 6. Distinct Purchase Orders
  const distinctPOs = useMemo(() => {
    const map = new Map<string, {
      poNo: string;
      date: string;
      supplier: string;
      broker: string;
      agency: string;
      area: string;
      grades: Set<string>;
      saudaNos: Set<string>;
      totalQuantityMT: number;
    }>();

    transactions.forEach(t => {
      const pNo = t.poNo && t.poNo !== 'Pending P.O.' && t.poNo !== '-' ? t.poNo : '';
      if (!pNo) return;
      if (!map.has(pNo)) {
        map.set(pNo, {
          poNo: pNo,
          date: t.date,
          supplier: t.supplier,
          broker: t.broker,
          agency: t.agency,
          area: t.area,
          grades: new Set<string>(),
          saudaNos: new Set<string>(),
          totalQuantityMT: 0
        });
      }
      const entry = map.get(pNo)!;
      if (t.grade && t.grade !== '-') entry.grades.add(t.grade);
      if (t.saudaNo && t.saudaNo !== '-') entry.saudaNos.add(t.saudaNo);
      entry.totalQuantityMT += t.quantityMT;
    });

    return Array.from(map.values()).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [transactions]);

  // Filtered lists based on search
  const filteredTransactions = useMemo(() => {
    if (!searchTerm) return transactions;
    const term = searchTerm.toLowerCase();
    return transactions.filter(t => 
      (t.saudaNo && t.saudaNo.toLowerCase().includes(term)) ||
      (t.poNo && t.poNo.toLowerCase().includes(term)) ||
      (t.supplier && t.supplier.toLowerCase().includes(term)) ||
      (t.broker && t.broker.toLowerCase().includes(term)) ||
      (t.agency && t.agency.toLowerCase().includes(term)) ||
      (t.area && t.area.toLowerCase().includes(term)) ||
      (t.grade && t.grade.toLowerCase().includes(term)) ||
      (t.date && t.date.toLowerCase().includes(term))
    );
  }, [transactions, searchTerm]);

  const filteredPOs = useMemo(() => {
    if (!searchTerm) return distinctPOs;
    const term = searchTerm.toLowerCase();
    return distinctPOs.filter(p =>
      p.poNo.toLowerCase().includes(term) ||
      p.supplier.toLowerCase().includes(term) ||
      p.broker.toLowerCase().includes(term) ||
      p.agency.toLowerCase().includes(term) ||
      p.area.toLowerCase().includes(term) ||
      Array.from(p.grades).join(' ').toLowerCase().includes(term) ||
      Array.from(p.saudaNos).join(' ').toLowerCase().includes(term)
    );
  }, [distinctPOs, searchTerm]);

  const filteredSuppliers = useMemo(() => {
    if (!searchTerm) return supplierGroups;
    const term = searchTerm.toLowerCase();
    return supplierGroups.filter(s => s.supplier.toLowerCase().includes(term));
  }, [supplierGroups, searchTerm]);

  const filteredBrokers = useMemo(() => {
    if (!searchTerm) return brokerGroups;
    const term = searchTerm.toLowerCase();
    return brokerGroups.filter(b => b.broker.toLowerCase().includes(term));
  }, [brokerGroups, searchTerm]);

  const filteredAgencies = useMemo(() => {
    if (!searchTerm) return agencyGroups;
    const term = searchTerm.toLowerCase();
    return agencyGroups.filter(a => a.agency.toLowerCase().includes(term));
  }, [agencyGroups, searchTerm]);

  const filteredAreas = useMemo(() => {
    if (!searchTerm) return areaGroups;
    const term = searchTerm.toLowerCase();
    return areaGroups.filter(a => a.area.toLowerCase().includes(term));
  }, [areaGroups, searchTerm]);

  const filteredGrades = useMemo(() => {
    if (!searchTerm) return gradeGroups;
    const term = searchTerm.toLowerCase();
    return gradeGroups.filter(g => g.grade.toLowerCase().includes(term));
  }, [gradeGroups, searchTerm]);

  // Sub-filtered transactions when clicking on a Grade, Supplier, Broker, Agency, or Area
  const subFilteredTransactions = useMemo(() => {
    if (!selectedSubFilter) return [];
    const val = selectedSubFilter.value.toLowerCase().trim();
    return transactions.filter(t => {
      if (selectedSubFilter.type === 'grade') return (t.grade || '').toLowerCase().trim() === val;
      if (selectedSubFilter.type === 'supplier') return (t.supplier || '').toLowerCase().trim() === val;
      if (selectedSubFilter.type === 'broker') return (t.broker || '').toLowerCase().trim() === val;
      if (selectedSubFilter.type === 'agency') return (t.agency || '').toLowerCase().trim() === val;
      if (selectedSubFilter.type === 'area') return (t.area || '').toLowerCase().trim() === val;
      return true;
    });
  }, [transactions, selectedSubFilter]);

  const displaySubTransactions = useMemo(() => {
    if (!searchTerm) return subFilteredTransactions;
    const term = searchTerm.toLowerCase();
    return subFilteredTransactions.filter(t => 
      (t.saudaNo && t.saudaNo.toLowerCase().includes(term)) ||
      (t.poNo && t.poNo.toLowerCase().includes(term)) ||
      (t.supplier && t.supplier.toLowerCase().includes(term)) ||
      (t.broker && t.broker.toLowerCase().includes(term)) ||
      (t.agency && t.agency.toLowerCase().includes(term)) ||
      (t.area && t.area.toLowerCase().includes(term)) ||
      (t.grade && t.grade.toLowerCase().includes(term)) ||
      (t.date && t.date.toLowerCase().includes(term))
    );
  }, [subFilteredTransactions, searchTerm]);

  // CSV Exporter based on active view mode
  const exportCSV = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];

    if (selectedSubFilter) {
      headers = ['#', 'Sauda Number', 'Sauda Date', 'PO / PTF Number', 'Supplier', 'Broker', 'Agency', 'Area', 'Grade', 'Contract Quantity (MT)', 'Purchase Rate (Rs)', 'Base Rate (Rs)', 'Status'];
      rows = displaySubTransactions.map((t, idx) => [
        idx + 1,
        t.saudaNo,
        t.date,
        t.poNo,
        `"${t.supplier}"`,
        `"${t.broker}"`,
        `"${t.agency}"`,
        `"${t.area}"`,
        t.grade,
        t.quantityMT.toFixed(2),
        t.purchaseRate.toFixed(2),
        t.baseRate.toFixed(2),
        t.saudaStatus
      ]);
    } else if (viewMode === 'sauda_quantity') {
      headers = ['#', 'Sauda Number', 'Sauda Date', 'PO Number', 'Supplier', 'Broker', 'Agency', 'Area', 'Grade', 'Sauda Quantity (MT)'];
      rows = filteredTransactions.map((t, idx) => [
        idx + 1,
        t.saudaNo,
        t.date,
        t.poNo,
        `"${t.supplier}"`,
        `"${t.broker}"`,
        `"${t.agency}"`,
        `"${t.area}"`,
        t.grade,
        t.quantityMT.toFixed(2)
      ]);
    } else if (viewMode === 'pos') {
      headers = ['#', 'PO Number', 'PO Date', 'Supplier', 'Broker', 'Agency', 'Area', 'Grade', 'Sauda Number', 'Contract Quantity (MT)'];
      rows = filteredPOs.map((p, idx) => [
        idx + 1,
        p.poNo,
        p.date,
        `"${p.supplier}"`,
        `"${p.broker}"`,
        `"${p.agency}"`,
        `"${p.area}"`,
        `"${Array.from(p.grades).join(', ')}"`,
        `"${Array.from(p.saudaNos).join(', ')}"`,
        p.totalQuantityMT.toFixed(2)
      ]);
    } else if (viewMode === 'suppliers') {
      headers = ['#', 'Supplier Name', 'Total PO Count', 'Total Sauda Count', 'Total Contract Quantity (MT)'];
      rows = filteredSuppliers.map((s, idx) => [
        idx + 1,
        `"${s.supplier}"`,
        s.poSet.size,
        s.saudaSet.size,
        s.totalQuantityMT.toFixed(2)
      ]);
    } else if (viewMode === 'brokers') {
      headers = ['#', 'Broker Name', 'Total PO Count', 'Total Sauda Count', 'Total Contract Quantity (MT)'];
      rows = filteredBrokers.map((b, idx) => [
        idx + 1,
        `"${b.broker}"`,
        b.poSet.size,
        b.saudaSet.size,
        b.totalQuantityMT.toFixed(2)
      ]);
    } else if (viewMode === 'agencies') {
      headers = ['#', 'Agency Name', 'Total PO Count', 'Total Sauda Count', 'Total Contract Quantity (MT)'];
      rows = filteredAgencies.map((a, idx) => [
        idx + 1,
        `"${a.agency}"`,
        a.poSet.size,
        a.saudaSet.size,
        a.totalQuantityMT.toFixed(2)
      ]);
    } else if (viewMode === 'areas') {
      headers = ['#', 'Sourcing Area', 'Total PO Count', 'Total Sauda Count', 'Total Contract Quantity (MT)'];
      rows = filteredAreas.map((a, idx) => [
        idx + 1,
        `"${a.area}"`,
        a.poSet.size,
        a.saudaSet.size,
        a.totalQuantityMT.toFixed(2)
      ]);
    } else if (viewMode === 'grades') {
      headers = ['#', 'Quality Grade', 'Total PO Count', 'Total Sauda Count', 'Total Contract Quantity (MT)'];
      rows = filteredGrades.map((g, idx) => [
        idx + 1,
        `"${g.grade}"`,
        g.poSet.size,
        g.saudaSet.size,
        g.totalQuantityMT.toFixed(2)
      ]);
    } else if (isPremiumDrillDown) {
      headers = ['#', 'Date', 'Sauda / PO', 'Broker', 'Area & Grade', 'Qty (MT)', 'Premium (₹/Qtl)', 'Premium'];
      rows = filteredTransactions.map((t, idx) => {
        const rateStr = t.premiumRate > 0
          ? t.premiumRate.toFixed(0)
          : (t.quantityMT > 0 && t.premiumAmount > 0 ? (t.premiumAmount / (t.quantityMT * 10)).toFixed(0) : '0');
        const areaGrade = t.area && t.area !== '-' ? `${t.grade} (${t.area})` : t.grade;
        return [
          idx + 1,
          t.date,
          `"${t.poNo || t.saudaNo}"`,
          `"${t.broker || 'DIRECT'}"`,
          `"${areaGrade}"`,
          t.quantityMT.toFixed(2),
          rateStr,
          t.premiumAmount.toFixed(2)
        ];
      });
    } else {
      // Standard comprehensive transaction lines
      headers = [
        'Txn ID', 'Date', 'Sauda No', 'PO No', 'Supplier', 'Broker', 'Agency', 'Area', 'Grade',
        'Qty (MT)', 'Purchase Rate', 'Base Rate', 'Variance', 'Gross Value', 'Premium', 'Deductions', 'Effective Cost'
      ];
      rows = filteredTransactions.map(t => [
        t.txnId,
        t.date,
        t.saudaNo,
        t.poNo,
        `"${t.supplier}"`,
        `"${t.broker}"`,
        `"${t.agency}"`,
        `"${t.area}"`,
        t.grade,
        t.quantityMT.toFixed(2),
        t.purchaseRate.toFixed(2),
        t.baseRate.toFixed(2),
        t.rateVariance.toFixed(2),
        t.grossPurchaseValue.toFixed(2),
        t.premiumAmount.toFixed(2),
        t.deductionAmount.toFixed(2),
        t.effectiveCost.toFixed(2)
      ]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `sourcing_footprint_${viewMode}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Aggregated totals
  const totalQty = transactions.reduce((acc, t) => acc + t.quantityMT, 0);
  const totalPoCount = distinctPOs.length;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white border-2 border-emerald-900 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col overflow-hidden font-sans">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 to-green-950 text-white px-5 py-3.5 flex items-center justify-between border-b border-emerald-800">
          <div>
            {isPremiumDrillDown ? (
              <h3 className="text-base sm:text-lg font-black uppercase tracking-wide text-yellow-300">
                Premium
              </h3>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-yellow-400 text-emerald-950">
                    Sauda Check Point Drill-Down
                  </span>
                  <h3 className="text-base sm:text-lg font-black uppercase tracking-wide text-yellow-300">
                    {title}
                  </h3>
                </div>
                {subtitle && (
                  <p className="text-xs text-emerald-200/90 mt-0.5">
                    {subtitle}
                  </p>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold border border-emerald-600 transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-emerald-200 hover:text-white hover:bg-emerald-800/80 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Search & Summary Ribbon */}
        <div className="bg-slate-50 px-5 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter list records..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            {viewMode === 'sauda_quantity' && (
              <>
                <span className="text-slate-600">Total Records: <strong className="text-emerald-950 font-black">{filteredTransactions.length}</strong></span>
                <span className="text-slate-600">Total Quantity: <strong className="text-emerald-800 font-black">{filteredTransactions.reduce((a, b) => a + b.quantityMT, 0).toFixed(2)} MT</strong></span>
              </>
            )}
            {viewMode === 'pos' && (
              <>
                <span className="text-slate-600">Total Purchase Orders: <strong className="text-blue-950 font-black">{filteredPOs.length} POs</strong></span>
                <span className="text-slate-600">Total Contract Weight: <strong className="text-emerald-800 font-black">{filteredPOs.reduce((a, b) => a + b.totalQuantityMT, 0).toFixed(2)} MT</strong></span>
              </>
            )}
            {viewMode === 'suppliers' && (
              <>
                <span className="text-slate-600">Unique Suppliers: <strong className="text-indigo-950 font-black">{filteredSuppliers.length}</strong></span>
                <span className="text-slate-600">Total Sourced: <strong className="text-emerald-800 font-black">{filteredSuppliers.reduce((a, b) => a + b.totalQuantityMT, 0).toFixed(2)} MT</strong></span>
              </>
            )}
            {viewMode === 'brokers' && (
              <>
                <span className="text-slate-600">Unique Brokers: <strong className="text-purple-950 font-black">{filteredBrokers.length}</strong></span>
                <span className="text-slate-600">Total Mediated: <strong className="text-emerald-800 font-black">{filteredBrokers.reduce((a, b) => a + b.totalQuantityMT, 0).toFixed(2)} MT</strong></span>
              </>
            )}
            {viewMode === 'agencies' && (
              <>
                <span className="text-slate-600">Unique Agencies: <strong className="text-amber-950 font-black">{filteredAgencies.length}</strong></span>
                <span className="text-slate-600">Total Handled: <strong className="text-emerald-800 font-black">{filteredAgencies.reduce((a, b) => a + b.totalQuantityMT, 0).toFixed(2)} MT</strong></span>
              </>
            )}
            {viewMode === 'areas' && (
              <>
                <span className="text-slate-600">Unique Sourcing Belts: <strong className="text-teal-950 font-black">{filteredAreas.length}</strong></span>
                <span className="text-slate-600">Total Sourced: <strong className="text-emerald-800 font-black">{filteredAreas.reduce((a, b) => a + b.totalQuantityMT, 0).toFixed(2)} MT</strong></span>
              </>
            )}
            {viewMode === 'grades' && (
              <>
                <span className="text-slate-600">Unique Grades: <strong className="text-rose-950 font-black">{filteredGrades.length}</strong></span>
                <span className="text-slate-600">Total Volume: <strong className="text-emerald-800 font-black">{filteredGrades.reduce((a, b) => a + b.totalQuantityMT, 0).toFixed(2)} MT</strong></span>
              </>
            )}
            {viewMode === 'transactions' && isPremiumDrillDown && (
              <>
                <span className="text-slate-600">Lines: <strong className="text-emerald-950 font-black">{filteredTransactions.length}</strong></span>
                <span className="text-slate-600">Weight: <strong className="text-emerald-800 font-black">{filteredTransactions.reduce((a, b) => a + b.quantityMT, 0).toFixed(2)} MT</strong></span>
                <span className="text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded border border-amber-300">
                  Total Premium: <strong className="font-black text-amber-950">₹{filteredTransactions.reduce((a, b) => a + b.premiumAmount, 0).toLocaleString()}</strong>
                </span>
              </>
            )}
            {viewMode === 'transactions' && !isPremiumDrillDown && (
              <>
                <span className="text-slate-600">Lines: <strong className="text-emerald-950 font-black">{filteredTransactions.length}</strong></span>
                <span className="text-slate-600">Weight: <strong className="text-emerald-800 font-black">{filteredTransactions.reduce((a, b) => a + b.quantityMT, 0).toFixed(2)} MT</strong></span>
              </>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-auto flex-1 p-4">

          {/* ================= DEDICATED SUB-FILTER VIEW (e.g. CLICKED ON A GRADE / SUPPLIER / BROKER) ================= */}
          {selectedSubFilter ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl p-3 shadow-sm border border-slate-700">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedSubFilter(null)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition border border-white/20 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to All {selectedSubFilter.type === 'grade' ? 'Quality Grades' : selectedSubFilter.type === 'supplier' ? 'Suppliers' : selectedSubFilter.type === 'broker' ? 'Brokers' : selectedSubFilter.type === 'agency' ? 'Agencies' : 'Areas'}</span>
                  </button>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 block">
                      Filtered by {selectedSubFilter.type.toUpperCase()}
                    </span>
                    <h4 className="text-sm font-black text-yellow-300 flex items-center gap-2">
                      <span>{selectedSubFilter.value}</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-800 text-emerald-100 text-[10px] font-bold">
                        {displaySubTransactions.length} Contracts
                      </span>
                    </h4>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-300 uppercase font-bold block">Total Contract Quantity</span>
                  <span className="text-sm font-black text-emerald-300 font-mono">
                    {displaySubTransactions.reduce((acc, t) => acc + t.quantityMT, 0).toFixed(2)} MT
                  </span>
                </div>
              </div>

              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-black uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-200">
                    <th className="p-2.5 text-center">#</th>
                    <th className="p-2.5">Sauda Number</th>
                    <th className="p-2.5">Sauda Date</th>
                    <th className="p-2.5">PO / PTF Number</th>
                    <th className="p-2.5">Supplier</th>
                    <th className="p-2.5">Broker</th>
                    <th className="p-2.5">Agency</th>
                    <th className="p-2.5">Area</th>
                    <th className="p-2.5">Grade</th>
                    <th className="p-2.5 text-right font-black text-emerald-900">Contract Qty (MT)</th>
                    <th className="p-2.5 text-right">Purchase Rate</th>
                    <th className="p-2.5 text-right">Base Rate</th>
                    <th className="p-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {displaySubTransactions.map((t, idx) => (
                    <tr key={t.txnId || idx} className="hover:bg-yellow-50/50 transition font-mono text-[11px]">
                      <td className="p-2 text-center text-slate-400">{idx + 1}</td>
                      <td className="p-2 font-bold text-emerald-950">{t.saudaNo}</td>
                      <td className="p-2 text-slate-600 whitespace-nowrap">{t.date}</td>
                      <td className="p-2 text-blue-900 font-bold">{t.poNo || 'Pending'}</td>
                      <td className="p-2 font-sans font-semibold text-slate-900" title={t.supplier}>{t.supplier}</td>
                      <td className="p-2 font-sans text-slate-700" title={t.broker}>{t.broker}</td>
                      <td className="p-2 font-sans text-slate-600">{t.agency}</td>
                      <td className="p-2 font-sans text-slate-600">{t.area}</td>
                      <td className="p-2">
                        <span className="px-2 py-0.5 rounded bg-rose-100 font-black text-rose-900 text-[10px]">
                          {t.grade}
                        </span>
                      </td>
                      <td className="p-2 text-right font-black text-emerald-900 text-xs">
                        {t.quantityMT.toFixed(2)} MT
                      </td>
                      <td className="p-2 text-right text-slate-800 font-bold">
                        ₹{t.purchaseRate.toLocaleString()}
                      </td>
                      <td className="p-2 text-right text-slate-600">
                        ₹{t.baseRate.toLocaleString()}
                      </td>
                      <td className="p-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.saudaStatus === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {t.saudaStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-emerald-50 text-emerald-950 font-black text-xs border-t-2 border-emerald-300 font-mono">
                    <td colSpan={9} className="p-3 text-right uppercase tracking-wider">
                      Total Contract Quantity for {selectedSubFilter.value}:
                    </td>
                    <td className="p-3 text-right font-black text-emerald-950 text-sm">
                      {displaySubTransactions.reduce((acc, t) => acc + t.quantityMT, 0).toFixed(2)} MT
                    </td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <>
          {/* ================= 1. SAUDA QUANTITY VIEW ================= */}
          {viewMode === 'sauda_quantity' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-black uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-200">
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5">Sauda / PO No.</th>
                  <th className="p-2.5">Party / Supplier</th>
                  <th className="p-2.5">Broker</th>
                  <th className="p-2.5 text-right font-black text-emerald-900">Weight (MT)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {(() => {
                  const map = new Map<string, any>();
                  filteredTransactions.forEach((t, i) => {
                    const key = (t.saudaNo || t.poNo || t.txnId || `sauda-${i}`).trim();
                    if (map.has(key)) {
                      const existing = map.get(key);
                      existing.quantityMT = (Number(existing.quantityMT) || 0) + (Number(t.quantityMT) || 0);
                    } else {
                      map.set(key, { ...t, quantityMT: Number(t.quantityMT) || 0 });
                    }
                  });
                  const list = Array.from(map.values());

                  return list.map((t, idx) => {
                    const saudaPoDisplay = t.saudaNo && t.poNo && t.saudaNo !== t.poNo
                      ? `${t.saudaNo} / ${t.poNo}`
                      : (t.saudaNo || t.poNo || '-');

                    return (
                      <tr key={t.txnId || t.id || idx} className="hover:bg-emerald-50/40 transition font-mono text-[11px]">
                        <td className="p-2.5 text-slate-600 whitespace-nowrap">{t.date || '-'}</td>
                        <td className="p-2.5 font-bold text-emerald-950 whitespace-nowrap">{saudaPoDisplay}</td>
                        <td className="p-2.5 font-sans font-semibold text-slate-900 truncate max-w-[220px]" title={t.supplier || 'Unassigned'}>
                          {t.supplier || 'Unassigned'}
                        </td>
                        <td className="p-2.5 font-sans text-slate-700 truncate max-w-[180px]" title={t.broker || 'Direct'}>
                          {t.broker || 'Direct'}
                        </td>
                        <td className="p-2.5 text-right font-black text-emerald-900 text-xs whitespace-nowrap">
                          {Number(t.quantityMT || 0).toFixed(2)} MT
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
              <tfoot>
                <tr className="bg-emerald-50 text-emerald-950 font-black text-xs border-t-2 border-emerald-300 font-mono">
                  <td colSpan={4} className="p-3 text-right uppercase tracking-wider font-bold">
                    Total Weight:
                  </td>
                  <td className="p-3 text-right font-black text-emerald-950 text-sm whitespace-nowrap">
                    {filteredTransactions.reduce((acc, t) => acc + (Number(t.quantityMT) || 0), 0).toFixed(2)} MT
                  </td>
                </tr>
              </tfoot>
            </table>
          )}

          {/* ================= 2. PURCHASE ORDERS (POS) VIEW ================= */}
          {viewMode === 'pos' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-black uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-200">
                  <th className="p-2.5 text-center">#</th>
                  <th className="p-2.5">PO Number</th>
                  <th className="p-2.5">PO Date</th>
                  <th className="p-2.5">Supplier</th>
                  <th className="p-2.5">Broker</th>
                  <th className="p-2.5">Agency</th>
                  <th className="p-2.5">Area</th>
                  <th className="p-2.5">Grade</th>
                  <th className="p-2.5">Sauda Number</th>
                  <th className="p-2.5 text-right font-black text-blue-900">Contract Qty (MT)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredPOs.map((p, idx) => (
                  <tr key={p.poNo || idx} className="hover:bg-blue-50/40 transition font-mono text-[11px]">
                    <td className="p-2 text-center text-slate-400">{idx + 1}</td>
                    <td className="p-2 font-black text-blue-950">{p.poNo}</td>
                    <td className="p-2 text-slate-600 whitespace-nowrap">{p.date}</td>
                    <td className="p-2 font-sans font-semibold text-slate-900" title={p.supplier}>{p.supplier}</td>
                    <td className="p-2 font-sans text-slate-700" title={p.broker}>{p.broker}</td>
                    <td className="p-2 font-sans text-slate-600">{p.agency}</td>
                    <td className="p-2 font-sans text-slate-600">{p.area}</td>
                    <td className="p-2">
                      <span className="px-2 py-0.5 rounded bg-blue-100 font-bold text-blue-800 text-[10px]">
                        {Array.from(p.grades).join(', ') || 'Standard'}
                      </span>
                    </td>
                    <td className="p-2 text-slate-600 font-bold">
                      {Array.from(p.saudaNos).join(', ') || '-'}
                    </td>
                    <td className="p-2 text-right font-black text-blue-950 text-xs">
                      {p.totalQuantityMT.toFixed(2)} MT
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-blue-50 text-blue-950 font-black text-xs border-t-2 border-blue-300 font-mono">
                  <td colSpan={2} className="p-3 text-left">
                    Total POs: <strong>{filteredPOs.length}</strong>
                  </td>
                  <td colSpan={7} className="p-3 text-right uppercase tracking-wider">
                    Total Purchase Order Contract Weight:
                  </td>
                  <td className="p-3 text-right font-black text-blue-950 text-sm">
                    {filteredPOs.reduce((acc, p) => acc + p.totalQuantityMT, 0).toFixed(2)} MT
                  </td>
                </tr>
              </tfoot>
            </table>
          )}

          {/* ================= 3. SUPPLIERS VIEW ================= */}
          {viewMode === 'suppliers' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-black uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-200">
                  <th className="p-2.5 text-center">#</th>
                  <th className="p-2.5">Supplier Name</th>
                  <th className="p-2.5 text-center">Total PO Count</th>
                  <th className="p-2.5 text-center">Total Sauda Count</th>
                  <th className="p-2.5 text-right font-black text-indigo-950">Total Contract Quantity (MT)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredSuppliers.map((s, idx) => (
                  <tr 
                    key={s.supplier || idx} 
                    onClick={() => setSelectedSubFilter({ type: 'supplier', value: s.supplier })}
                    className="hover:bg-indigo-50 transition font-mono text-[11px] cursor-pointer group"
                    title={`Click to view all Sauda & PO records for ${s.supplier}`}
                  >
                    <td className="p-2.5 text-center text-slate-400">{idx + 1}</td>
                    <td className="p-2.5 font-sans font-bold text-slate-900 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span>{s.supplier}</span>
                        <span className="text-[10px] text-indigo-700 font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                          View Saudas & POs →
                        </span>
                      </div>
                    </td>
                    <td className="p-2.5 text-center font-bold text-blue-900">{s.poSet.size} POs</td>
                    <td className="p-2.5 text-center font-bold text-emerald-900">{s.saudaSet.size} Saudas</td>
                    <td className="p-2.5 text-right font-black text-indigo-950 text-xs">
                      {s.totalQuantityMT.toFixed(2)} MT
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-indigo-50 text-indigo-950 font-black text-xs border-t-2 border-indigo-300 font-mono">
                  <td className="p-3 text-center">Totals</td>
                  <td className="p-3">
                    {filteredSuppliers.length} Unique Suppliers
                  </td>
                  <td className="p-3 text-center">
                    {filteredSuppliers.reduce((acc, s) => acc + s.poSet.size, 0)} POs
                  </td>
                  <td className="p-3 text-center">
                    {filteredSuppliers.reduce((acc, s) => acc + s.saudaSet.size, 0)} Saudas
                  </td>
                  <td className="p-3 text-right font-black text-indigo-950 text-sm">
                    {filteredSuppliers.reduce((acc, s) => acc + s.totalQuantityMT, 0).toFixed(2)} MT
                  </td>
                </tr>
              </tfoot>
            </table>
          )}

          {/* ================= 4. BROKERS VIEW ================= */}
          {viewMode === 'brokers' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-black uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-200">
                  <th className="p-2.5 text-center">#</th>
                  <th className="p-2.5">Broker Name</th>
                  <th className="p-2.5 text-center">PO Count</th>
                  <th className="p-2.5 text-center">Sauda Count</th>
                  <th className="p-2.5 text-right font-black text-purple-950">Contract Quantity (MT)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredBrokers.map((b, idx) => (
                  <tr 
                    key={b.broker || idx} 
                    onClick={() => setSelectedSubFilter({ type: 'broker', value: b.broker })}
                    className="hover:bg-purple-50 transition font-mono text-[11px] cursor-pointer group"
                    title={`Click to view all Sauda & PO records for ${b.broker}`}
                  >
                    <td className="p-2.5 text-center text-slate-400">{idx + 1}</td>
                    <td className="p-2.5 font-sans font-bold text-slate-900 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span>{b.broker}</span>
                        <span className="text-[10px] text-purple-700 font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                          View Saudas & POs →
                        </span>
                      </div>
                    </td>
                    <td className="p-2.5 text-center font-bold text-blue-900">{b.poSet.size} POs</td>
                    <td className="p-2.5 text-center font-bold text-emerald-900">{b.saudaSet.size} Saudas</td>
                    <td className="p-2.5 text-right font-black text-purple-950 text-xs">
                      {b.totalQuantityMT.toFixed(2)} MT
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-purple-50 text-purple-950 font-black text-xs border-t-2 border-purple-300 font-mono">
                  <td className="p-3 text-center">Totals</td>
                  <td className="p-3">
                    {filteredBrokers.length} Unique Brokers
                  </td>
                  <td className="p-3 text-center">
                    {filteredBrokers.reduce((acc, b) => acc + b.poSet.size, 0)} POs
                  </td>
                  <td className="p-3 text-center">
                    {filteredBrokers.reduce((acc, b) => acc + b.saudaSet.size, 0)} Saudas
                  </td>
                  <td className="p-3 text-right font-black text-purple-950 text-sm">
                    {filteredBrokers.reduce((acc, b) => acc + b.totalQuantityMT, 0).toFixed(2)} MT
                  </td>
                </tr>
              </tfoot>
            </table>
          )}

          {/* ================= 5. AGENCIES VIEW ================= */}
          {viewMode === 'agencies' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-black uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-200">
                  <th className="p-2.5 text-center">#</th>
                  <th className="p-2.5">Agency Name</th>
                  <th className="p-2.5 text-center">PO Count</th>
                  <th className="p-2.5 text-center">Sauda Count</th>
                  <th className="p-2.5 text-right font-black text-amber-950">Contract Quantity (MT)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredAgencies.map((a, idx) => (
                  <tr 
                    key={a.agency || idx} 
                    onClick={() => setSelectedSubFilter({ type: 'agency', value: a.agency })}
                    className="hover:bg-amber-50 transition font-mono text-[11px] cursor-pointer group"
                    title={`Click to view all Sauda & PO records for ${a.agency}`}
                  >
                    <td className="p-2.5 text-center text-slate-400">{idx + 1}</td>
                    <td className="p-2.5 font-sans font-bold text-slate-900 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span>{a.agency}</span>
                        <span className="text-[10px] text-amber-700 font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                          View Saudas & POs →
                        </span>
                      </div>
                    </td>
                    <td className="p-2.5 text-center font-bold text-blue-900">{a.poSet.size} POs</td>
                    <td className="p-2.5 text-center font-bold text-emerald-900">{a.saudaSet.size} Saudas</td>
                    <td className="p-2.5 text-right font-black text-amber-950 text-xs">
                      {a.totalQuantityMT.toFixed(2)} MT
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-amber-50 text-amber-950 font-black text-xs border-t-2 border-amber-300 font-mono">
                  <td className="p-3 text-center">Totals</td>
                  <td className="p-3">
                    {filteredAgencies.length} Unique Agencies
                  </td>
                  <td className="p-3 text-center">
                    {filteredAgencies.reduce((acc, a) => acc + a.poSet.size, 0)} POs
                  </td>
                  <td className="p-3 text-center">
                    {filteredAgencies.reduce((acc, a) => acc + a.saudaSet.size, 0)} Saudas
                  </td>
                  <td className="p-3 text-right font-black text-amber-950 text-sm">
                    {filteredAgencies.reduce((acc, a) => acc + a.totalQuantityMT, 0).toFixed(2)} MT
                  </td>
                </tr>
              </tfoot>
            </table>
          )}

          {/* ================= 6. AREAS VIEW ================= */}
          {viewMode === 'areas' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-black uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-200">
                  <th className="p-2.5 text-center">#</th>
                  <th className="p-2.5">Sourcing Area / Belt</th>
                  <th className="p-2.5 text-center">PO Count</th>
                  <th className="p-2.5 text-center">Sauda Count</th>
                  <th className="p-2.5 text-right font-black text-teal-950">Contract Quantity (MT)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredAreas.map((ar, idx) => (
                  <tr 
                    key={ar.area || idx} 
                    onClick={() => setSelectedSubFilter({ type: 'area', value: ar.area })}
                    className="hover:bg-teal-50 transition font-mono text-[11px] cursor-pointer group"
                    title={`Click to view all Sauda & PO records for ${ar.area}`}
                  >
                    <td className="p-2.5 text-center text-slate-400">{idx + 1}</td>
                    <td className="p-2.5 font-sans font-bold text-slate-900 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span>{ar.area}</span>
                        <span className="text-[10px] text-teal-700 font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                          View Saudas & POs →
                        </span>
                      </div>
                    </td>
                    <td className="p-2.5 text-center font-bold text-blue-900">{ar.poSet.size} POs</td>
                    <td className="p-2.5 text-center font-bold text-emerald-900">{ar.saudaSet.size} Saudas</td>
                    <td className="p-2.5 text-right font-black text-teal-950 text-xs">
                      {ar.totalQuantityMT.toFixed(2)} MT
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-teal-50 text-teal-950 font-black text-xs border-t-2 border-teal-300 font-mono">
                  <td className="p-3 text-center">Totals</td>
                  <td className="p-3">
                    {filteredAreas.length} Unique Sourcing Belts
                  </td>
                  <td className="p-3 text-center">
                    {filteredAreas.reduce((acc, ar) => acc + ar.poSet.size, 0)} POs
                  </td>
                  <td className="p-3 text-center">
                    {filteredAreas.reduce((acc, ar) => acc + ar.saudaSet.size, 0)} Saudas
                  </td>
                  <td className="p-3 text-right font-black text-teal-950 text-sm">
                    {filteredAreas.reduce((acc, ar) => acc + ar.totalQuantityMT, 0).toFixed(2)} MT
                  </td>
                </tr>
              </tfoot>
            </table>
          )}

          {/* ================= 7. GRADES VIEW ================= */}
          {viewMode === 'grades' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-black uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-200">
                  <th className="p-2.5 text-center">#</th>
                  <th className="p-2.5">Quality Grade</th>
                  <th className="p-2.5 text-center">PO Count</th>
                  <th className="p-2.5 text-center">Sauda Count</th>
                  <th className="p-2.5 text-right font-black text-rose-950">Contract Quantity (MT)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredGrades.map((g, idx) => (
                  <tr 
                    key={g.grade || idx} 
                    onClick={() => setSelectedSubFilter({ type: 'grade', value: g.grade })}
                    className="hover:bg-rose-100/70 transition font-mono text-[11px] cursor-pointer group"
                    title={`Click to view all Sauda & PO records for grade ${g.grade}`}
                  >
                    <td className="p-2.5 text-center text-slate-400">{idx + 1}</td>
                    <td className="p-2.5 font-sans font-bold text-slate-900 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-900 font-black group-hover:bg-rose-200 transition">
                          {g.grade}
                        </span>
                        <span className="text-[10px] text-rose-700 font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                          View Saudas & POs →
                        </span>
                      </div>
                    </td>
                    <td className="p-2.5 text-center font-bold text-blue-900">{g.poSet.size} POs</td>
                    <td className="p-2.5 text-center font-bold text-emerald-900">{g.saudaSet.size} Saudas</td>
                    <td className="p-2.5 text-right font-black text-rose-950 text-xs">
                      {g.totalQuantityMT.toFixed(2)} MT
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-rose-50 text-rose-950 font-black text-xs border-t-2 border-rose-300 font-mono">
                  <td colSpan={4} className="p-3 text-right uppercase tracking-wider">
                    Total Volume Across Grades:
                  </td>
                  <td className="p-3 text-right font-black text-rose-950 text-sm">
                    {filteredGrades.reduce((acc, g) => acc + g.totalQuantityMT, 0).toFixed(2)} MT
                  </td>
                </tr>
              </tfoot>
            </table>
          )}

          {/* ================= 8. TRANSACTIONS WITH PREMIUM VIEW (SPECIFIC USER FIELDS) ================= */}
          {viewMode === 'transactions' && isPremiumDrillDown && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-black uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-200">
                  <th className="p-2.5 text-center">#</th>
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5">Sauda / PO</th>
                  <th className="p-2.5">Broker</th>
                  <th className="p-2.5">Area & Grade</th>
                  <th className="p-2.5 text-right">Qty (MT)</th>
                  <th className="p-2.5 text-right font-black text-amber-800">Premium (₹/Qtl)</th>
                  <th className="p-2.5 text-right font-black text-amber-950">Premium</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredTransactions.map((t, idx) => (
                  <tr key={t.txnId || idx} className="hover:bg-amber-50/50 transition font-mono text-[11px]">
                    <td className="p-2.5 text-center text-slate-400">{idx + 1}</td>
                    <td className="p-2.5 text-slate-600 whitespace-nowrap">{t.date}</td>
                    <td className="p-2.5 font-bold text-emerald-950">
                      <div>{t.poNo}</div>
                      {t.saudaNo && t.saudaNo !== t.poNo && (
                        <div className="text-[10px] text-slate-400 font-normal">{t.saudaNo}</div>
                      )}
                    </td>
                    <td className="p-2.5 max-w-[150px] truncate font-sans font-medium text-slate-800" title={t.broker}>
                      {t.broker || 'DIRECT'}
                    </td>
                    <td className="p-2.5 font-sans">
                      <span className="font-bold text-slate-800">{t.grade}</span>
                      {t.area && t.area !== '-' && (
                        <span className="text-[10px] text-slate-500 block">{t.area}</span>
                      )}
                    </td>
                    <td className="p-2.5 text-right font-bold text-emerald-900">{t.quantityMT.toFixed(2)}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-amber-800">
                      {t.premiumRate > 0
                        ? `+₹${t.premiumRate.toFixed(0)}/Qtl`
                        : (t.quantityMT > 0 && t.premiumAmount > 0
                            ? `+₹${(t.premiumAmount / (t.quantityMT * 10)).toFixed(0)}/Qtl`
                            : '—')}
                    </td>
                    <td className="p-2.5 text-right text-amber-800 font-black text-xs font-mono">
                      ₹{t.premiumAmount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-amber-50/80 text-amber-950 font-black text-xs border-t-2 border-amber-300 font-mono">
                  <td className="p-2.5 text-center">Totals</td>
                  <td className="p-2.5" colSpan={4}>
                    {filteredTransactions.length} Premium Transaction{filteredTransactions.length !== 1 ? 's' : ''}
                  </td>
                  <td className="p-2.5 text-right text-emerald-900 font-bold">
                    {filteredTransactions.reduce((acc, t) => acc + t.quantityMT, 0).toFixed(2)} MT
                  </td>
                  <td className="p-2.5 text-right text-amber-800">
                    Avg: ₹{
                      filteredTransactions.reduce((acc, t) => acc + t.quantityMT, 0) > 0
                        ? (
                            filteredTransactions.reduce((acc, t) => acc + t.premiumAmount, 0) /
                            (filteredTransactions.reduce((acc, t) => acc + t.quantityMT, 0) * 10)
                          ).toFixed(0)
                        : '0'
                    }/Qtl
                  </td>
                  <td className="p-2.5 text-right font-black text-amber-900 text-sm">
                    ₹{filteredTransactions.reduce((acc, t) => acc + t.premiumAmount, 0).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}

          {/* ================= 9. GENERAL COMPREHENSIVE TRANSACTIONS VIEW ================= */}
          {viewMode === 'transactions' && !isPremiumDrillDown && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-black uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-200">
                  <th className="p-2.5 text-center">#</th>
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5">Sauda / PO</th>
                  <th className="p-2.5">Supplier</th>
                  <th className="p-2.5">Broker</th>
                  <th className="p-2.5">Area & Grade</th>
                  <th className="p-2.5 text-right">Qty (MT)</th>
                  <th className="p-2.5 text-right">Purchase Rate</th>
                  <th className="p-2.5 text-right">Base Rate</th>
                  <th className="p-2.5 text-right">Variance</th>
                  <th className="p-2.5 text-right">Gross Value</th>
                  <th className="p-2.5 text-right">Premium</th>
                  <th className="p-2.5 text-right">Deductions</th>
                  <th className="p-2.5 text-right">Eff. Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredTransactions.map((t, idx) => (
                  <tr key={t.txnId || idx} className="hover:bg-emerald-50/40 transition font-mono text-[11px]">
                    <td className="p-2 text-center text-slate-400">{idx + 1}</td>
                    <td className="p-2 text-slate-600 whitespace-nowrap">{t.date}</td>
                    <td className="p-2 font-bold text-emerald-950">
                      <div>{t.poNo}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{t.saudaNo}</div>
                    </td>
                    <td className="p-2 max-w-[140px] truncate font-sans" title={t.supplier}>{t.supplier}</td>
                    <td className="p-2 max-w-[120px] truncate font-sans" title={t.broker}>{t.broker}</td>
                    <td className="p-2 font-sans">
                      <span className="font-bold text-slate-800">{t.grade}</span>
                      <span className="text-[10px] text-slate-500 block">{t.area}</span>
                    </td>
                    <td className="p-2 text-right font-bold text-emerald-900">{t.quantityMT.toFixed(2)}</td>
                    <td className="p-2 text-right">₹{t.purchaseRate.toLocaleString()}</td>
                    <td className="p-2 text-right text-slate-500">₹{t.baseRate.toLocaleString()}</td>
                    <td className="p-2 text-right">
                      <span className={t.rateVariance > 0 ? 'text-amber-700 font-bold' : (t.rateVariance < 0 ? 'text-emerald-700 font-bold' : 'text-slate-400')}>
                        {t.rateVariance > 0 ? `+₹${t.rateVariance.toFixed(0)}` : (t.rateVariance < 0 ? `-₹${Math.abs(t.rateVariance).toFixed(0)}` : '₹0')}
                      </span>
                    </td>
                    <td className="p-2 text-right">₹{t.grossPurchaseValue.toLocaleString()}</td>
                    <td className="p-2 text-right text-amber-700 font-bold">{t.premiumAmount > 0 ? `₹${t.premiumAmount.toLocaleString()}` : '—'}</td>
                    <td className="p-2 text-right text-rose-700 font-bold">{t.deductionAmount > 0 ? `₹${t.deductionAmount.toLocaleString()}` : '—'}</td>
                    <td className="p-2 text-right text-slate-900 font-bold">₹{t.effectiveCost.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          </>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono">
            Sauda Check Point Live Audit: {filteredTransactions.length} records evaluated
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition cursor-pointer"
          >
            Close Drill-Down
          </button>
        </div>

      </div>
    </div>
  );
};

