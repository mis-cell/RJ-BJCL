import React, { useState, useMemo } from 'react';
import { CompiledReportData, BrokerSaudaItem } from '../../services/reportCalculations';
import { 
  Building2, 
  Download, 
  Search, 
  TrendingUp, 
  DollarSign, 
  ChevronRight,
  Filter,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  BarChart3,
  PieChart as PieIcon,
  ShieldCheck,
  UserCheck,
  AlertTriangle,
  FileText,
  X,
  Printer,
  Truck,
  Coins,
  Scale,
  Layers,
  Sparkles,
  Check,
  Briefcase
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { exportToCSV } from '../../utils/exportHelpers';

interface BrokerPercentageReportProps {
  brokerSummary: CompiledReportData['brokerSummary'];
  saudaList?: any[];
}

const PIE_COLORS = ['#059669', '#0284c7', '#d97706', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'];

export const BrokerPercentageReport: React.FC<BrokerPercentageReportProps> = ({ brokerSummary }) => {
  const [selectedBrokerModal, setSelectedBrokerModal] = useState<CompiledReportData['brokerSummary'][0] | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'PENDING' | 'SETTLED' | 'PAYMENT_DUE'>('ALL');
  const [sortField, setSortField] = useState<string>('contractedWeightMT');
  const [sortAsc, setSortAsc] = useState(false);

  // Overall Broker-Wise Totals
  const overallMetrics = useMemo(() => {
    let totalBrokers = brokerSummary.length;
    let totalContracts = 0;
    let completedContracts = 0;
    let pendingContracts = 0;
    let contractedMT = 0;
    let deliveredMT = 0;
    let pendingMT = 0;
    let contractValue = 0;
    let deliveredValue = 0;
    let pendingValue = 0;
    let materialPaid = 0;
    let materialPending = 0;
    let brokeragePayable = 0;
    let brokeragePaid = 0;
    let brokeragePending = 0;
    let fullySettledContracts = 0;

    brokerSummary.forEach(b => {
      totalContracts += b.totalContracts;
      completedContracts += b.completedContractsCount;
      pendingContracts += b.pendingContractsCount;
      contractedMT += b.contractedWeightMT;
      deliveredMT += b.deliveredWeightMT;
      pendingMT += b.pendingWeightMT;
      contractValue += b.totalContractValue;
      deliveredValue += b.deliveredMaterialValue;
      pendingValue += b.pendingMaterialValue;
      materialPaid += b.materialPaidAmount;
      materialPending += b.materialPendingAmount;
      brokeragePayable += b.totalBrokeragePayable;
      brokeragePaid += b.brokeragePaid;
      brokeragePending += b.brokeragePending;
      fullySettledContracts += b.settledContractsCount;
    });

    const deliveryFulfillmentPct = contractedMT > 0 ? Number(((deliveredMT / contractedMT) * 100).toFixed(1)) : 0;
    const materialPaymentPct = deliveredValue > 0 ? Number(((materialPaid / deliveredValue) * 100).toFixed(1)) : 0;
    const contractCompletionPct = totalContracts > 0 ? Number(((completedContracts / totalContracts) * 100).toFixed(1)) : 0;
    const settlementFulfillmentPct = totalContracts > 0 ? Number(((fullySettledContracts / totalContracts) * 100).toFixed(1)) : 0;

    return {
      totalBrokers,
      totalContracts,
      completedContracts,
      pendingContracts,
      contractedMT: Number(contractedMT.toFixed(3)),
      deliveredMT: Number(deliveredMT.toFixed(3)),
      pendingMT: Number(pendingMT.toFixed(3)),
      contractValue: Math.round(contractValue),
      deliveredValue: Math.round(deliveredValue),
      pendingValue: Math.round(pendingValue),
      materialPaid: Math.round(materialPaid),
      materialPending: Math.round(materialPending),
      brokeragePayable: Math.round(brokeragePayable),
      brokeragePaid: Math.round(brokeragePaid),
      brokeragePending: Math.round(brokeragePending),
      fullySettledContracts,
      deliveryFulfillmentPct,
      materialPaymentPct,
      contractCompletionPct,
      settlementFulfillmentPct
    };
  }, [brokerSummary]);

  // Filtered and Sorted Brokers
  const filteredBrokers = useMemo(() => {
    let list = brokerSummary.filter(b => {
      const matchSearch = b.broker.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;

      if (statusFilter === 'COMPLETED') {
        return b.completedContractsCount > 0 && b.pendingContractsCount === 0;
      }
      if (statusFilter === 'PENDING') {
        return b.pendingContractsCount > 0 || b.pendingWeightMT > 0;
      }
      if (statusFilter === 'SETTLED') {
        return b.settlementStatus === 'FULLY_SETTLED';
      }
      if (statusFilter === 'PAYMENT_DUE') {
        return b.materialPendingAmount > 0 || b.brokeragePending > 0;
      }
      return true;
    });

    list.sort((a: any, b: any) => {
      const valA = a[sortField] ?? 0;
      const valB = b[sortField] ?? 0;
      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? valA - valB : valB - valA;
    });

    return list;
  }, [brokerSummary, searchTerm, statusFilter, sortField, sortAsc]);

  // Top 8 Brokers for Charts
  const topBrokers = useMemo(() => {
    return [...brokerSummary].sort((a, b) => b.contractedWeightMT - a.contractedWeightMT).slice(0, 8);
  }, [brokerSummary]);

  // Chart 1: Delivered vs Pending MT Comparison
  const deliveryBarData = useMemo(() => {
    return topBrokers.map(b => ({
      name: b.broker.length > 13 ? `${b.broker.substring(0, 11)}...` : b.broker,
      deliveredMT: b.deliveredWeightMT,
      pendingMT: b.pendingWeightMT
    }));
  }, [topBrokers]);

  // Chart 2: Sauda Desk Contract Status (Completed vs Pending Saudas)
  const saudaStatusData = useMemo(() => {
    return topBrokers.map(b => ({
      name: b.broker.length > 13 ? `${b.broker.substring(0, 11)}...` : b.broker,
      completed: b.completedContractsCount,
      pending: b.pendingContractsCount
    }));
  }, [topBrokers]);

  // Chart 3: Financial Settlement Distribution
  const financialFunnelData = useMemo(() => {
    return [
      { name: 'Delivered Material ₹', value: overallMetrics.deliveredValue, color: '#059669' },
      { name: 'Material Paid ₹', value: overallMetrics.materialPaid, color: '#0284c7' },
      { name: 'Material Pending ₹', value: overallMetrics.materialPending, color: '#d97706' },
      { name: 'Brokerage Payable ₹', value: overallMetrics.brokeragePayable, color: '#8b5cf6' }
    ];
  }, [overallMetrics]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const handleExport = () => {
    const exportData = filteredBrokers.map(b => ({
      Broker: b.broker,
      'Total Suppliers': b.totalSuppliers,
      'Total Contracts': b.totalContracts,
      'Completed Contracts (Sauda Desk)': b.completedContractsCount,
      'Pending Contracts (Sauda Desk)': b.pendingContractsCount,
      'Contract Completion %': `${b.contractCompletionPct}%`,
      'Contracted Weight (MT)': b.contractedWeightMT,
      'Delivered Weight (MT)': b.deliveredWeightMT,
      'Pending Weight (MT)': b.pendingWeightMT,
      'Delivery Fulfillment %': `${b.deliveredPct}%`,
      'Delivery Pending %': `${b.pendingPct}%`,
      'Average Contract Rate (₹/Qtl)': b.avgContractRate,
      'Delivered Material Value (₹)': b.deliveredMaterialValue,
      'Pending Material Value (₹)': b.pendingMaterialValue,
      'Material Paid (₹)': b.materialPaidAmount,
      'Material Pending (₹)': b.materialPendingAmount,
      'Material Payment %': `${b.materialPaymentPct}%`,
      'Brokerage Rate (₹/MT)': b.brokerageRate,
      'Total Brokerage Payable (₹)': b.totalBrokeragePayable,
      'Brokerage Paid (₹)': b.brokeragePaid,
      'Brokerage Pending (₹)': b.brokeragePending,
      'Settlement Status': b.settlementStatus
    }));
    exportToCSV(exportData, 'broker_procurement_lifecycle_report.csv');
  };

  const handleExportSingleBroker = (brokerObj: CompiledReportData['brokerSummary'][0]) => {
    if (!brokerObj.saudaItems || brokerObj.saudaItems.length === 0) return;
    const exportData = brokerObj.saudaItems.map(s => ({
      'Sauda No': s.saudaNo,
      'PO / Session': s.session,
      Date: s.date,
      Supplier: s.supplier,
      Grade: s.grade,
      'Contracted MT': s.contractedMT,
      'Delivered MT': s.deliveredMT,
      'Pending MT': s.pendingMT,
      'Rate (₹/Qtl)': s.rate,
      'Total Value (₹)': s.totalValue,
      'Delivered Value (₹)': s.deliveredValue,
      'Pending Value (₹)': s.pendingValue,
      'Sauda Desk Status': s.saudaDeskStatus,
      'Settlement Status': s.settlementStatus,
      'Brokerage Payable (₹)': s.brokeragePayable,
      'Material Paid (₹)': s.materialPaid,
      'Material Pending (₹)': s.materialPending
    }));
    exportToCSV(exportData, `broker_${brokerObj.broker.toLowerCase()}_saudas.csv`);
  };

  return (
    <div className="space-y-4">
      {/* 1. Header & Summary Hero Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200">
              <UserCheck className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                Broker-Wise Procurement Lifecycle
                <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full border border-emerald-300">
                  Sauda Desk Live Sync
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Live contract status breakdown (Completed vs Active Pending), physical delivery, material payments, and brokerage settlement
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Lifecycle CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Top Executive KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Sauda Desk Contracts */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Sauda Desk Contracts</span>
            <FileText className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-black text-slate-900 font-mono">{overallMetrics.totalContracts}</span>
              <span className="text-[11px] text-slate-500 ml-1 font-medium">total saudas</span>
            </div>
            <span className="text-xs font-black font-mono px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded border border-emerald-200">
              {overallMetrics.contractCompletionPct}% Completed
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-emerald-50/60 p-1.5 rounded border border-emerald-100">
              <span className="text-[9px] font-bold text-emerald-700 uppercase block">Complete (PO/SCP)</span>
              <span className="font-bold text-emerald-900 font-mono text-xs">{overallMetrics.completedContracts}</span>
            </div>
            <div className="bg-amber-50/60 p-1.5 rounded border border-amber-100">
              <span className="text-[9px] font-bold text-amber-700 uppercase block">Pending Sauda</span>
              <span className="font-bold text-amber-900 font-mono text-xs">{overallMetrics.pendingContracts}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Physical Tonnage Delivered vs Pending */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Procurement Tonnage</span>
            <Truck className="w-4 h-4 text-blue-700" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-black text-slate-900 font-mono">{overallMetrics.contractedMT.toLocaleString()}</span>
              <span className="text-[11px] text-slate-500 ml-1 font-medium">MT booked</span>
            </div>
            <span className="text-xs font-black font-mono px-2 py-0.5 bg-blue-50 text-blue-800 rounded border border-blue-200">
              {overallMetrics.deliveryFulfillmentPct}% Delivered
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-blue-50/60 p-1.5 rounded border border-blue-100">
              <span className="text-[9px] font-bold text-blue-700 uppercase block">Delivered MT</span>
              <span className="font-bold text-blue-900 font-mono text-xs">{overallMetrics.deliveredMT.toLocaleString()}</span>
            </div>
            <div className="bg-rose-50/60 p-1.5 rounded border border-rose-100">
              <span className="text-[9px] font-bold text-rose-700 uppercase block">Pending MT</span>
              <span className="font-bold text-rose-900 font-mono text-xs">{overallMetrics.pendingMT.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Material Value & Payments */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Material Payments</span>
            <Coins className="w-4 h-4 text-amber-700" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-black text-slate-900 font-mono">₹{(overallMetrics.deliveredValue / 100000).toFixed(1)}L</span>
              <span className="text-[11px] text-slate-500 ml-1 font-medium">delivered</span>
            </div>
            <span className="text-xs font-black font-mono px-2 py-0.5 bg-amber-50 text-amber-900 rounded border border-amber-200">
              {overallMetrics.materialPaymentPct}% Paid
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-emerald-50/60 p-1.5 rounded border border-emerald-100">
              <span className="text-[9px] font-bold text-emerald-700 uppercase block">Paid Disbursed</span>
              <span className="font-bold text-emerald-900 font-mono text-xs">₹{(overallMetrics.materialPaid / 100000).toFixed(1)}L</span>
            </div>
            <div className="bg-amber-50/60 p-1.5 rounded border border-amber-100">
              <span className="text-[9px] font-bold text-amber-700 uppercase block">Payment Pending</span>
              <span className="font-bold text-amber-900 font-mono text-xs">₹{(overallMetrics.materialPending / 100000).toFixed(1)}L</span>
            </div>
          </div>
        </div>

        {/* Card 4: Brokerage Commission & Settlement */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Brokerage Ledger (₹25/MT)</span>
            <Scale className="w-4 h-4 text-purple-700" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-black text-slate-900 font-mono">₹{overallMetrics.brokeragePayable.toLocaleString()}</span>
              <span className="text-[11px] text-slate-500 ml-1 font-medium">payable</span>
            </div>
            <span className="text-xs font-black font-mono px-2 py-0.5 bg-purple-50 text-purple-900 rounded border border-purple-200">
              {overallMetrics.settlementFulfillmentPct}% Settled
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-purple-50/60 p-1.5 rounded border border-purple-100">
              <span className="text-[9px] font-bold text-purple-700 uppercase block">Brokerage Paid</span>
              <span className="font-bold text-purple-900 font-mono text-xs">₹{overallMetrics.brokeragePaid.toLocaleString()}</span>
            </div>
            <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
              <span className="text-[9px] font-bold text-slate-600 uppercase block">Brokerage Due</span>
              <span className="font-bold text-slate-900 font-mono text-xs">₹{overallMetrics.brokeragePending.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart 1: Delivered vs Pending MT Comparison */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-2 lg:col-span-1">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Delivered vs Pending (MT)</h4>
              <p className="text-[10px] text-slate-500">Top Brokers Tonnage Comparison</p>
            </div>
            <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
              Physical MT
            </span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={deliveryBarData} margin={{ top: 5, right: 15, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 9, fill: '#64748b' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#334155', fontWeight: 600 }} width={80} />
                <Tooltip 
                  formatter={(val: any, name: string) => [`${Number(val).toFixed(2)} MT`, name === 'deliveredMT' ? 'Delivered' : 'Pending']}
                  contentStyle={{ backgroundColor: '#F7AFA8', borderColor: '#334155', color: '#fff', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}
                />
                <Legend verticalAlign="top" height={24} formatter={v => <span className="text-[10px] font-bold text-slate-600">{v === 'deliveredMT' ? 'Delivered MT' : 'Pending MT'}</span>} />
                <Bar dataKey="deliveredMT" fill="#059669" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="pendingMT" fill="#f59e0b" stackId="a" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Sauda Desk Complete vs Pending Contracts */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-2 lg:col-span-1">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Sauda Desk Contract Status</h4>
              <p className="text-[10px] text-slate-500">Complete (PO/SCP) vs Active Pending</p>
            </div>
            <span className="text-[9px] font-mono font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
              Sauda Desk
            </span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={saudaStatusData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#334155', fontWeight: 600 }} />
                <YAxis tick={{ fontSize: 9, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip 
                  formatter={(val: any, name: string) => [`${val} Contracts`, name === 'completed' ? 'Complete (PO/SCP)' : 'Active Pending']}
                  contentStyle={{ backgroundColor: '#F7AFA8', borderColor: '#334155', color: '#fff', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}
                />
                <Legend verticalAlign="top" height={24} formatter={v => <span className="text-[10px] font-bold text-slate-600">{v === 'completed' ? 'Complete Saudas' : 'Pending Saudas'}</span>} />
                <Bar dataKey="completed" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Financial Settlement Distribution */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-2 lg:col-span-1">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Payment & Settlement Mix</h4>
              <p className="text-[10px] text-slate-500">Live Disbursed vs Pending Liability</p>
            </div>
            <span className="text-[9px] font-mono font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
              Financial
            </span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={financialFunnelData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {financialFunnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, 'Amount']}
                  contentStyle={{ backgroundColor: '#F7AFA8', borderColor: '#334155', color: '#fff', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}
                />
                <Legend verticalAlign="bottom" height={28} formatter={v => <span className="text-[9.5px] text-slate-700 font-bold">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4. Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Status Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-black uppercase text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-400" /> Filter:
          </span>
          {[
            { key: 'ALL', label: 'All Brokers', count: brokerSummary.length },
            { key: 'PENDING', label: 'Pending Delivery / Sauda', count: brokerSummary.filter(b => b.pendingContractsCount > 0 || b.pendingWeightMT > 0).length },
            { key: 'COMPLETED', label: '100% Completed', count: brokerSummary.filter(b => b.completedContractsCount > 0 && b.pendingContractsCount === 0).length },
            { key: 'SETTLED', label: 'Fully Settled', count: brokerSummary.filter(b => b.settlementStatus === 'FULLY_SETTLED').length },
            { key: 'PAYMENT_DUE', label: 'Payment Pending', count: brokerSummary.filter(b => b.materialPendingAmount > 0).length },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key as any)}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === tab.key
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[9.5px] font-mono px-1.5 py-0.2 rounded-full ${
                statusFilter === tab.key ? 'bg-slate-700 text-slate-100' : 'bg-slate-200 text-slate-700'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search broker name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 w-52 font-medium"
          />
        </div>
      </div>

      {/* 5. Master Broker Lifecycle Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-600" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-900">
              Broker Master Fulfillment & Settlement Matrix ({filteredBrokers.length} Records)
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium">Click on any broker row to inspect individual Saudas</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-black text-[10px] uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-2.5 cursor-pointer hover:bg-slate-200/60" onClick={() => handleSort('broker')}>
                  <div className="flex items-center gap-1">Broker Name <ArrowUpDown className="w-3 h-3 text-slate-400" /></div>
                </th>
                <th className="p-2.5 text-center cursor-pointer hover:bg-slate-200/60" onClick={() => handleSort('totalContracts')}>
                  <div className="flex items-center justify-center gap-1">Contracts <ArrowUpDown className="w-3 h-3 text-slate-400" /></div>
                </th>
                <th className="p-2.5 text-center">Sauda Desk Status</th>
                <th className="p-2.5 text-right cursor-pointer hover:bg-slate-200/60" onClick={() => handleSort('contractedWeightMT')}>
                  <div className="flex items-center justify-end gap-1">Contracted MT <ArrowUpDown className="w-3 h-3 text-slate-400" /></div>
                </th>
                <th className="p-2.5 text-right cursor-pointer hover:bg-slate-200/60" onClick={() => handleSort('deliveredWeightMT')}>
                  <div className="flex items-center justify-end gap-1">Delivered MT <ArrowUpDown className="w-3 h-3 text-slate-400" /></div>
                </th>
                <th className="p-2.5 text-right cursor-pointer hover:bg-slate-200/60" onClick={() => handleSort('pendingWeightMT')}>
                  <div className="flex items-center justify-end gap-1">Pending MT <ArrowUpDown className="w-3 h-3 text-slate-400" /></div>
                </th>
                <th className="p-2.5 text-center cursor-pointer hover:bg-slate-200/60" onClick={() => handleSort('deliveredPct')}>
                  <div className="flex items-center justify-center gap-1">Fulfillment % <ArrowUpDown className="w-3 h-3 text-slate-400" /></div>
                </th>
                <th className="p-2.5 text-right">Delivered Value</th>
                <th className="p-2.5 text-right">Material Paid</th>
                <th className="p-2.5 text-right">Material Due</th>
                <th className="p-2.5 text-right">Brokerage Due</th>
                <th className="p-2.5 text-center">Settlement Status</th>
                <th className="p-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredBrokers.length === 0 ? (
                <tr>
                  <td colSpan={13} className="p-8 text-center text-slate-400">
                    No brokers match the selected filters or search term.
                  </td>
                </tr>
              ) : (
                filteredBrokers.map((broker, idx) => (
                  <tr 
                    key={idx}
                    onClick={() => setSelectedBrokerModal(broker)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    {/* Broker Name */}
                    <td className="p-2.5 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-[11px] text-slate-700 font-mono group-hover:bg-emerald-100 group-hover:text-emerald-900 transition-colors">
                          {broker.broker.slice(0, 2)}
                        </div>
                        <div>
                          <span className="block">{broker.broker}</span>
                          <span className="text-[10px] text-slate-400 font-normal">{broker.totalSuppliers} Associated Supplier{broker.totalSuppliers > 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </td>

                    {/* Contracts Count */}
                    <td className="p-2.5 text-center font-mono font-bold text-slate-800">
                      {broker.totalContracts}
                    </td>

                    {/* Sauda Desk Status (Completed vs Pending) */}
                    <td className="p-2.5 text-center">
                      <div className="inline-flex items-center gap-1 text-[10px] font-mono">
                        <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 rounded font-bold border border-emerald-200">
                          {broker.completedContractsCount} C
                        </span>
                        <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 rounded font-bold border border-amber-200">
                          {broker.pendingContractsCount} P
                        </span>
                      </div>
                    </td>

                    {/* Contracted MT */}
                    <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                      {broker.contractedWeightMT.toLocaleString()}
                    </td>

                    {/* Delivered MT */}
                    <td className="p-2.5 text-right font-mono text-emerald-800 font-bold">
                      {broker.deliveredWeightMT.toLocaleString()}
                    </td>

                    {/* Pending MT */}
                    <td className="p-2.5 text-right font-mono text-amber-800 font-bold">
                      {broker.pendingWeightMT.toLocaleString()}
                    </td>

                    {/* Fulfillment % */}
                    <td className="p-2.5 text-center font-mono">
                      <div className="flex flex-col items-center">
                        <span className={`px-2 py-0.5 rounded font-black text-[10.5px] ${
                          broker.deliveredPct >= 95 ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' :
                          broker.deliveredPct >= 70 ? 'bg-blue-100 text-blue-900 border border-blue-200' :
                          'bg-amber-100 text-amber-900 border border-amber-200'
                        }`}>
                          {broker.deliveredPct}%
                        </span>
                        <div className="w-14 bg-slate-200 h-1 rounded-full mt-1 overflow-hidden">
                          <div 
                            className={`h-full ${broker.deliveredPct >= 95 ? 'bg-emerald-600' : broker.deliveredPct >= 70 ? 'bg-blue-600' : 'bg-amber-500'}`}
                            style={{ width: `${Math.min(100, broker.deliveredPct)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Delivered Value */}
                    <td className="p-2.5 text-right font-mono text-slate-700">
                      ₹{broker.deliveredMaterialValue.toLocaleString()}
                    </td>

                    {/* Material Paid */}
                    <td className="p-2.5 text-right font-mono text-emerald-800 font-bold">
                      ₹{broker.materialPaidAmount.toLocaleString()}
                    </td>

                    {/* Material Due */}
                    <td className="p-2.5 text-right font-mono text-amber-800">
                      ₹{broker.materialPendingAmount.toLocaleString()}
                    </td>

                    {/* Brokerage Due */}
                    <td className="p-2.5 text-right font-mono text-purple-800 font-bold">
                      ₹{broker.brokeragePending.toLocaleString()}
                    </td>

                    {/* Settlement Status */}
                    <td className="p-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold border ${
                        broker.settlementStatus === 'FULLY_SETTLED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                        broker.settlementStatus === 'PAYMENT_PENDING' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                        broker.settlementStatus === 'DELIVERY_IN_PROGRESS' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                        'bg-slate-50 text-slate-700 border-slate-200'
                      }`}>
                        {broker.settlementStatus.replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="p-2.5 text-center" onClick={(e) => { e.stopPropagation(); setSelectedBrokerModal(broker); }}>
                      <button className="px-2 py-1 text-[10px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition-colors flex items-center gap-1 mx-auto">
                        <span>Inspect</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Deep Drill-Down Modal for Individual Broker Saudas */}
      {selectedBrokerModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-800/80 rounded-lg text-emerald-300">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black uppercase tracking-wide">
                      Broker: {selectedBrokerModal.broker}
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700">
                      {selectedBrokerModal.saudaItems.length} Contracts
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Detailed contract status, delivery weight, payments, and brokerage settlement
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportSingleBroker(selectedBrokerModal)}
                  className="px-2.5 py-1.5 text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={() => setSelectedBrokerModal(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Stats Bar */}
            <div className="bg-slate-50 border-b border-slate-200 p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Sauda Desk Status</span>
                <span className="font-black text-emerald-800 font-mono text-sm">
                  {selectedBrokerModal.completedContractsCount} Complete • {selectedBrokerModal.pendingContractsCount} Pending
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Tonnage Fulfillment</span>
                <span className="font-black text-slate-900 font-mono text-sm">
                  {selectedBrokerModal.deliveredWeightMT} / {selectedBrokerModal.contractedWeightMT} MT ({selectedBrokerModal.deliveredPct}%)
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Material Payments</span>
                <span className="font-black text-slate-900 font-mono text-sm">
                  ₹{(selectedBrokerModal.materialPaidAmount / 100000).toFixed(2)}L Paid • ₹{(selectedBrokerModal.materialPendingAmount / 100000).toFixed(2)}L Due
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Brokerage Commission (₹25/MT)</span>
                <span className="font-black text-purple-800 font-mono text-sm">
                  ₹{selectedBrokerModal.totalBrokeragePayable.toLocaleString()} Payable
                </span>
              </div>
            </div>

            {/* Modal Body: Sauda List Table */}
            <div className="overflow-y-auto flex-1 p-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-black text-[10px] uppercase tracking-wider border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="p-2">Sauda #</th>
                    <th className="p-2">PO / Session</th>
                    <th className="p-2">Date</th>
                    <th className="p-2">Supplier</th>
                    <th className="p-2">Grade</th>
                    <th className="p-2 text-right">Contract MT</th>
                    <th className="p-2 text-right">Deliv MT</th>
                    <th className="p-2 text-right">Pend MT</th>
                    <th className="p-2 text-right">Rate</th>
                    <th className="p-2 text-center">Sauda Desk Status</th>
                    <th className="p-2 text-right">Material Paid</th>
                    <th className="p-2 text-right">Material Due</th>
                    <th className="p-2 text-center">Settlement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {selectedBrokerModal.saudaItems.map((item, sIdx) => (
                    <tr key={sIdx} className="hover:bg-slate-50">
                      <td className="p-2 font-mono font-bold text-slate-900">{item.saudaNo}</td>
                      <td className="p-2 font-mono text-slate-600">{item.session}</td>
                      <td className="p-2 text-slate-500">{item.date}</td>
                      <td className="p-2 font-bold text-slate-800">{item.supplier}</td>
                      <td className="p-2 font-mono">{item.grade}</td>
                      <td className="p-2 text-right font-mono font-bold text-slate-900">{item.contractedMT}</td>
                      <td className="p-2 text-right font-mono text-emerald-800 font-bold">{item.deliveredMT}</td>
                      <td className="p-2 text-right font-mono text-amber-800">{item.pendingMT}</td>
                      <td className="p-2 text-right font-mono text-slate-700">{item.rate > 0 ? `₹${item.rate}` : '-'}</td>
                      <td className="p-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                          item.saudaDeskStatus === 'COMPLETED' 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {item.saudaDeskStatus}
                        </span>
                      </td>
                      <td className="p-2 text-right font-mono text-emerald-800 font-bold">₹{item.materialPaid.toLocaleString()}</td>
                      <td className="p-2 text-right font-mono text-amber-800">₹{item.materialPending.toLocaleString()}</td>
                      <td className="p-2 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          item.settlementStatus === 'FULLY_SETTLED' ? 'bg-emerald-100 text-emerald-800' :
                          item.settlementStatus === 'PAYMENT_PENDING' ? 'bg-blue-100 text-blue-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {item.settlementStatus.replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>* Status determined strictly according to Sauda Desk Checkpoint & Purchase Order conversion rules.</span>
              <button
                onClick={() => setSelectedBrokerModal(null)}
                className="px-4 py-1.5 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

