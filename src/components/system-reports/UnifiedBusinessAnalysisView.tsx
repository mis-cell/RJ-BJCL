import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList
} from 'recharts';
import { ChevronRight, ArrowUpDown, Droplets } from 'lucide-react';
import {
  SystemReportDataset,
  ReportTransactionLine,
  PaymentOperationsVoucher,
  groupTransactionsByDimension,
  calculateMillInspectionRankings
} from '../../services/systemReportEngine';
import { WaterfallChart } from '../reports/charts/WaterfallChart';
import { HistogramChart } from '../reports/charts/HistogramChart';
import { HorizontalRankBarChart } from '../reports/charts/HorizontalRankBarChart';
import { BrokerPremiumDetailsModal } from './BrokerPremiumDetailsModal';

export type UnifiedAnalysisMode = 'business' | 'ranking' | 'premium';
type DimensionType = 'broker' | 'supplier' | 'agency' | 'area' | 'grade' | 'month';

interface UnifiedBusinessAnalysisViewProps {
  dataset: SystemReportDataset;
  mode: UnifiedAnalysisMode;
  onDrillDown: (title: string, txns: ReportTransactionLine[]) => void;
}

function formatIndianCurrencyShort(value: number): string {
  const num = Number(value || 0);
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  if (abs >= 10000000) {
    return `${sign}₹${(abs / 10000000).toFixed(2)} Cr`;
  }
  if (abs >= 100000) {
    return `${sign}₹${(abs / 100000).toFixed(2)} L`;
  }
  if (abs >= 1000) {
    return `${sign}₹${(abs / 1000).toFixed(1)} K`;
  }
  return `${sign}₹${Math.round(abs).toLocaleString('en-IN')}`;
}

function paymentVoucherToTxnLine(v: PaymentOperationsVoucher): ReportTransactionLine {
  const qtyMt = v.quantityQtl / 10;
  return {
    txnId: v.id,
    saudaNo: v.poNo,
    poNo: v.poNo,
    mrNo: v.mrNo,
    voucherNo: v.voucherNo,
    date: v.date,
    month: v.month,
    financialYear: v.financialYear,
    supplier: v.supplier,
    broker: v.broker,
    agency: v.agency,
    area: v.area,
    grade: v.grade,
    quantityMT: qtyMt,
    purchaseRate: 0,
    baseRate: 0,
    rateVariance: 0,
    rateVariancePct: 0,
    grossPurchaseValue: v.payableAmount,
    baseRateValue: v.payableAmount,
    premiumRate: v.premiumRatePerQtl,
    premiumAmount: v.premiumAmount,
    premiumPct: v.payableAmount > 0 ? (v.premiumAmount / v.payableAmount) * 100 : 0,
    deductionAmount: v.deductionAmount,
    deductionPct: v.payableAmount > 0 ? (v.deductionAmount / v.payableAmount) * 100 : 0,
    moisturePct: 0,
    gradeDownQty: 0,
    effectiveCost: v.payableAmount + v.premiumAmount - v.deductionAmount,
    realizationRate: 0,
    realizationValue: 0,
    grossProfit: 0,
    profitPct: 0,
    profitStatus: 'BREAK-EVEN',
    saudaStatus: 'COMPLETED',
    arrivalStatus: 'COMPLETED',
    inspectionStatus: 'COMPLETED',
    paymentStatus: v.paidAmount > 0 ? 'PAID' : 'PENDING',
    settlementStatus: 'SETTLED',
    arrivedWeightMT: qtyMt,
    pendingWeightMT: 0,
    paidAmount: v.paidAmount,
    pendingPayable: Math.max(0, v.payableAmount - v.paidAmount),
    claimAmount: 0,
    claimSettled: 0,
    isDelayed: false,
    isAbnormal: false,
    abnormalReasons: []
  };
}

export const UnifiedBusinessAnalysisView: React.FC<UnifiedBusinessAnalysisViewProps> = ({
  dataset,
  mode,
  onDrillDown
}) => {
  const { filtered } = dataset;
  const filteredMillInspections = dataset.filteredMillInspections || [];
  const filteredPaymentOperations = dataset.filteredPaymentOperations || [];

  // Business Analysis state (Report 2)
  const [dimension, setDimension] = useState<DimensionType>('broker');
  const [stackedMode, setStackedMode] = useState<'delivery' | 'quality'>('delivery');
  const [sortBy, setSortBy] = useState<'value' | 'qty' | 'delivery' | 'premium' | 'deduction'>('value');

  // Broker Ranking state (Report 3)
  const [rankEntity, setRankEntity] = useState<'broker' | 'supplier'>('broker');
  const [rankMetric, setRankMetric] = useState<'score' | 'value'>('score');

  const brokerMillRankings = useMemo(
    () => calculateMillInspectionRankings(filteredMillInspections, 'broker'),
    [filteredMillInspections]
  );

  // Premium modal state (Report 4)
  const [selectedPremiumBroker, setSelectedPremiumBroker] = useState<{ name: string; txns: ReportTransactionLine[] } | null>(null);

  const groupedData = useMemo(() => {
    const raw = groupTransactionsByDimension(filtered, dimension);
    return [...raw].sort((a, b) => {
      if (dimension === 'month') return a.key.localeCompare(b.key);
      if (sortBy === 'qty') return b.quantityMT - a.quantityMT;
      if (sortBy === 'delivery') return b.deliveryPct - a.deliveryPct;
      if (sortBy === 'premium') return b.premiumAmount - a.premiumAmount;
      if (sortBy === 'deduction') return b.deductionAmount - a.deductionAmount;
      return b.purchaseValue - a.purchaseValue;
    });
  }, [filtered, dimension, sortBy]);

  // =========================================================================
  // REPORT 2 DATA: SAUDA CHECK POINT TO MILL INSPECTION
  // =========================================================================
  // 1. Grouped Bar Data (Sauda Check Point Contracted MT vs Mill Inspection Received MT)
  const groupedBarData = useMemo(() => {
    const slice = dimension === 'month' ? groupedData : groupedData.slice(0, 10);
    return slice.map(g => ({
      name: g.key.length > 16 ? `${g.key.slice(0, 14)}…` : g.key,
      fullName: g.key,
      contractedMT: Number(g.quantityMT.toFixed(2)),
      receivedMT: Number(g.arrivedMT.toFixed(2)),
      deals: g.txnCount
    }));
  }, [groupedData, dimension]);

  // 2. Broker 100% Mix (Strictly from Mill Inspection)
  const stackedHundredData = useMemo(() => {
    const sortedByMt = [...brokerMillRankings]
      .sort((a, b) => b.totalMt - a.totalMt)
      .slice(0, 10);

    return sortedByMt.map(b => {
      const sharePct = Number(b.mtSharePct.toFixed(1));
      const restPct = Number(Math.max(0, 100 - sharePct).toFixed(1));
      const cleanPct = Number(b.cleanRatePct.toFixed(1));
      const defectPct = Number(Math.max(0, 100 - cleanPct).toFixed(1));
      return {
        name: b.key.length > 20 ? `${b.key.slice(0, 18)}…` : b.key,
        fullName: b.key,
        dealsLabel: `${b.totalMt.toFixed(1)} MT (${b.mrCount} MRs)`,
        deliverySharePct: sharePct,
        otherBrokersPct: restPct,
        cleanPct,
        defectPct,
        mrCount: b.mrCount,
        totalMt: b.totalMt
      };
    });
  }, [brokerMillRankings]);

  // =========================================================================
  // REPORT 3 DATA: MILL INSPECTION QUALITY RANKING (BROKERS & SUPPLIERS)
  // =========================================================================
  const millRankings = useMemo(
    () => calculateMillInspectionRankings(filteredMillInspections, rankEntity),
    [filteredMillInspections, rankEntity]
  );

  const millRankingsByValue = useMemo(
    () => [...millRankings].sort((a, b) => b.estimatedValue - a.estimatedValue || b.totalMt - a.totalMt),
    [millRankings]
  );

  const horizontalRankingData = useMemo(() => {
    if (rankMetric === 'score') {
      return millRankings.slice(0, 15).map(item => ({
        label: item.key,
        fullName: item.key,
        value: item.performanceScore,
        annotation: `${formatIndianCurrencyShort(item.estimatedValue)} · Score ${item.performanceScore.toFixed(0)}/100 (${item.mrCount} MRs)`,
        secondaryText: `Grade Down ${item.avgGradeDown.toFixed(1)}% · Moisture ${item.avgMoisture.toFixed(1)}% (+${item.avgExcessMoisture.toFixed(1)}% excess) · ${item.totalMt.toFixed(1)} MT · Dust ${item.avgDust.toFixed(1)}% · NCV ${item.avgNcv.toFixed(1)}% · CT ${Math.round(item.totalHabijabiChattaRopeKg)} kg`,
        color: item.performanceScore >= 85 ? '#0f766e' : item.performanceScore >= 70 ? '#0284c7' : item.performanceScore >= 50 ? '#d97706' : '#be123c'
      }));
    }
    return millRankingsByValue.slice(0, 15).map(item => ({
      label: item.key,
      fullName: item.key,
      value: Math.round(item.estimatedValue),
      annotation: `${formatIndianCurrencyShort(item.estimatedValue)} · Score ${item.performanceScore.toFixed(0)}/100 (${item.mrCount} MRs)`,
      secondaryText: `Grade Down ${item.avgGradeDown.toFixed(1)}% · Moisture ${item.avgMoisture.toFixed(1)}% (+${item.avgExcessMoisture.toFixed(1)}% excess) · ${item.totalMt.toFixed(1)} MT inspected`,
      color: item.performanceScore >= 70 ? '#0f766e' : '#d97706'
    }));
  }, [millRankings, millRankingsByValue, rankMetric]);

  // =========================================================================
  // REPORT 4 DATA: STRICTLY FROM PAYMENT OPERATIONS (payment_master + payment_details)
  // =========================================================================
  const paymentSummaryTotals = useMemo(() => {
    let payable = 0;
    let paid = 0;
    let premium = 0;
    let deduction = 0;
    filteredPaymentOperations.forEach(p => {
      payable += Number(p.payableAmount || 0);
      paid += Number(p.paidAmount || 0);
      premium += Number(p.premiumAmount || 0);
      deduction += Number(p.deductionAmount || 0);
    });
    return { payable, paid, premium, deduction };
  }, [filteredPaymentOperations]);

  const monthlyPremiumTrend = useMemo(() => {
    const map = new Map<string, { premSum: number; qtlSum: number; count: number }>();
    filteredPaymentOperations.forEach(p => {
      if (!p.month || p.premiumAmount <= 0) return;
      const cur = map.get(p.month) || { premSum: 0, qtlSum: 0, count: 0 };
      cur.premSum += p.premiumAmount;
      cur.qtlSum += p.quantityQtl > 0 ? p.quantityQtl : (p.premiumRatePerQtl > 0 ? p.premiumAmount / p.premiumRatePerQtl : 1);
      cur.count += 1;
      map.set(p.month, cur);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({
        month,
        avgPremPerQtl: v.qtlSum > 0 ? Number((v.premSum / v.qtlSum).toFixed(1)) : 0,
        totalPremLakh: Number((v.premSum / 100000).toFixed(2)),
        vouchersWithPrem: v.count
      }));
  }, [filteredPaymentOperations]);

  const costWaterfallData = useMemo(() => {
    const payable = Math.round(paymentSummaryTotals.payable);
    const prem = Math.round(paymentSummaryTotals.premium);
    const ded = Math.round(paymentSummaryTotals.deduction);
    const netLanded = Math.max(0, payable + prem - ded);
    return [
      { name: 'Payable Amt', value: payable, isTotal: true, color: '#0f172a' },
      { name: '+ Premiums', value: prem, color: '#d97706' },
      { name: '− Deductions', value: -ded, color: '#0f766e' },
      { name: 'Effective Cost', value: netLanded, isTotal: true, color: '#D94B5A' }
    ];
  }, [paymentSummaryTotals]);

  const premiumHistogramBins = useMemo(() => {
    const premVouchers = filteredPaymentOperations.filter(p => p.premiumAmount > 0);
    const buckets = [
      { label: '₹1–50/Qtl', min: 0.01, max: 50, count: 0 },
      { label: '₹51–100/Qtl', min: 50.01, max: 100, count: 0 },
      { label: '₹101–200/Qtl', min: 100.01, max: 200, count: 0 },
      { label: '₹201–400/Qtl', min: 200.01, max: 400, count: 0 },
      { label: '₹400+/Qtl', min: 400.01, max: Infinity, count: 0 }
    ];
    premVouchers.forEach(p => {
      const rate = p.premiumRatePerQtl > 0
        ? p.premiumRatePerQtl
        : (p.quantityQtl > 0 ? p.premiumAmount / p.quantityQtl : 0);
      if (rate <= 0) return;
      const b = buckets.find(x => rate >= x.min && rate <= x.max);
      if (b) b.count += 1;
    });
    const total = Math.max(1, premVouchers.length);
    return buckets.map(b => ({
      binRange: b.label,
      count: b.count,
      pct: Number(((b.count / total) * 100).toFixed(1)),
      isWarning: b.min >= 200
    }));
  }, [filteredPaymentOperations]);

  const brokerPremiumRows = useMemo(() => {
    const map = new Map<string, {
      key: string;
      voucherCount: number;
      mrSet: Set<string>;
      quantityQtl: number;
      premiumAmount: number;
      payableAmount: number;
      vouchers: PaymentOperationsVoucher[];
    }>();

    filteredPaymentOperations.forEach((p, idx) => {
      if (Number(p.premiumAmount || 0) <= 0) return;
      const bKey = (p.broker && p.broker.trim() && p.broker.trim() !== '-')
        ? p.broker.trim()
        : 'Direct / Unassigned';
      if (!map.has(bKey)) {
        map.set(bKey, {
          key: bKey,
          voucherCount: 0,
          mrSet: new Set<string>(),
          quantityQtl: 0,
          premiumAmount: 0,
          payableAmount: 0,
          vouchers: []
        });
      }
      const g = map.get(bKey)!;
      g.voucherCount += 1;
      g.mrSet.add(p.mrNo || p.voucherNo || `PAY-${idx}`);
      g.quantityQtl += Number(p.quantityQtl || 0);
      g.premiumAmount += Number(p.premiumAmount || 0);
      g.payableAmount += Number(p.payableAmount || 0);
      g.vouchers.push(p);
    });

    return Array.from(map.values())
      .map(g => ({
        ...g,
        mrCount: g.mrSet.size || g.voucherCount,
        quantityMT: g.quantityQtl / 10,
        avgPremPerQtl: g.quantityQtl > 0 ? g.premiumAmount / g.quantityQtl : 0
      }))
      .sort((a, b) => b.premiumAmount - a.premiumAmount);
  }, [filteredPaymentOperations]);

  // =========================================================================
  // RENDER MODE 1: BUSINESS & DIMENSIONAL ANALYSIS (REPORT 2)
  // =========================================================================
  if (mode === 'business') {
    return (
      <div className="space-y-5 font-sans">
        {/* Dimension Selector Header */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
              Business &amp; Dimensional Analysis
            </h3>
            <p className="text-[11px] text-slate-500">
              Sauda Check Point contracted volume reconciled directly against Mill Inspection receipts
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {([
              { id: 'broker', label: 'Broker' },
              { id: 'supplier', label: 'Supplier' },
              { id: 'agency', label: 'Agency' },
              { id: 'area', label: 'Area' },
              { id: 'grade', label: 'Grade' },
              { id: 'month', label: 'Month' }
            ] as Array<{ id: DimensionType; label: string }>).map(d => (
              <button
                type="button"
                key={d.id}
                onClick={() => setDimension(d.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  dimension === d.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* ROW 1: Grouped Bar (SCP vs Mill Insp) + Broker 100% Mix (Mill Inspection) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Grouped Bar: Contracted (SCP) vs Received MT (Mill Inspection) */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2">
            <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Contracted vs Received MT ({dimension.toUpperCase()})
                </h4>
                <p className="text-[11px] text-slate-500">Sauda Check Point (Contracted MT) vs Mill Inspection (Received MT)</p>
              </div>
              <span className="text-[10px] font-mono text-slate-400">SCP → Mill Insp</span>
            </div>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={groupedBarData} margin={{ top: 10, right: 16, left: 0, bottom: 28 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9.5, fill: '#475569' }} angle={-18} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'monospace' }} tickFormatter={(v) => `${v} MT`} width={58} />
                  <Tooltip
                    formatter={(val: any, name: any) => [`${Number(val).toFixed(2)} MT`, name]}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="contractedMT" name="Contracted MT (SCP)" fill="#D94B5A" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="receivedMT" name="Received MT (Mill Insp)" fill="#0f766e" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 100% Stacked Bar: Mill Inspection Delivery Share & Quality Mix */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2">
            <div className="pb-2 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Mill Inspection
                </h4>
                <p className="text-[11px] text-slate-500">
                  {stackedMode === 'delivery'
                    ? 'Broker delivery share strictly from Mill Inspection receipts (MT & MR count)'
                    : 'Clean vs defect-flagged MRs strictly from Mill Inspection receipts'}
                </p>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setStackedMode('delivery')}
                  className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer ${
                    stackedMode === 'delivery' ? 'bg-slate-900 text-white' : 'text-slate-600'
                  }`}
                >
                  Delivery Share
                </button>
                <button
                  type="button"
                  onClick={() => setStackedMode('quality')}
                  className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer ${
                    stackedMode === 'quality' ? 'bg-slate-900 text-white' : 'text-slate-600'
                  }`}
                >
                  Quality Mix
                </button>
              </div>
            </div>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stackedHundredData} layout="vertical" margin={{ top: 4, right: 110, left: 6, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="name" width={135} tick={{ fontSize: 10, fill: '#334155', fontWeight: 600 }} />
                  <Tooltip
                    formatter={(val: any, name: any) => [`${Number(val).toFixed(1)}%`, name]}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10.5px' }} />
                  {stackedMode === 'delivery' ? (
                    <>
                      <Bar dataKey="deliverySharePct" stackId="a" name="Broker Delivery Share %" fill="#0f766e" barSize={16} />
                      <Bar dataKey="otherBrokersPct" stackId="a" name="Rest of Mill Insp %" fill="#e2e8f0" barSize={16}>
                        <LabelList dataKey="dealsLabel" position="right" style={{ fontSize: 9.5, fill: '#475569', fontFamily: 'monospace', fontWeight: 700 }} />
                      </Bar>
                    </>
                  ) : (
                    <>
                      <Bar dataKey="cleanPct" stackId="b" name="Clean MRs %" fill="#0f766e" barSize={16} />
                      <Bar dataKey="defectPct" stackId="b" name="Defect Flagged MRs %" fill="#D94B5A" barSize={16}>
                        <LabelList dataKey="dealsLabel" position="right" style={{ fontSize: 9.5, fill: '#475569', fontFamily: 'monospace', fontWeight: 700 }} />
                      </Bar>
                    </>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* UNIFIED DIMENSIONAL LEDGER TABLE */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-xs font-black uppercase text-slate-900">
                {dimension.toUpperCase()} WISE BUSINESS LEDGER ({groupedData.length})
              </span>
              <span className="text-[11px] text-slate-500 ml-2">Sauda Check Point contracted vs Mill Inspection received · Click row to drill down</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-500 font-semibold">Sort:</span>
              {(['value', 'qty', 'delivery', 'premium', 'deduction'] as const).map(k => (
                <button
                  type="button"
                  key={k}
                  onClick={() => setSortBy(k)}
                  className={`px-2 py-0.5 rounded font-bold capitalize cursor-pointer ${
                    sortBy === k ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-bold uppercase text-[10px] tracking-wider">
                  <th className="p-2.5 w-10 text-center">#</th>
                  <th className="p-2.5">{dimension.toUpperCase()}</th>
                  <th className="p-2.5 text-right">SCP POs</th>
                  <th className="p-2.5 text-right">Contract MT</th>
                  <th className="p-2.5 text-right">Mill Insp MT</th>
                  <th className="p-2.5 text-right">Delivery %</th>
                  <th className="p-2.5 text-right">Avg Rate</th>
                  <th className="p-2.5 text-right">Premium (₹)</th>
                  <th className="p-2.5 text-right">Short/Exc Ded (₹)</th>
                  <th className="p-2.5 text-right">Gross Value (₹)</th>
                  <th className="p-2.5 text-center">Flagged</th>
                  <th className="p-2.5 text-center w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums text-[11px] text-slate-700">
                {groupedData.map((row, idx) => {
                  const rowTxns = filtered.filter(t => String(t[dimension] || 'UNASSIGNED') === row.key);
                  return (
                    <tr
                      key={row.key}
                      onClick={() => onDrillDown(`${dimension.toUpperCase()}: ${row.key}`, rowTxns)}
                      className="hover:bg-slate-50 transition cursor-pointer"
                    >
                      <td className="p-2.5 text-center text-slate-400">{idx + 1}</td>
                      <td className="p-2.5 font-sans font-bold text-slate-900 max-w-[220px] truncate" title={row.key}>
                        {row.key}
                      </td>
                      <td className="p-2.5 text-right">{row.txnCount}</td>
                      <td className="p-2.5 text-right font-bold text-slate-900">{row.quantityMT.toFixed(2)}</td>
                      <td className="p-2.5 text-right text-teal-700 font-bold">{row.arrivedMT.toFixed(2)}</td>
                      <td className="p-2.5 text-right">{row.deliveryPct.toFixed(1)}%</td>
                      <td className="p-2.5 text-right">₹{Math.round(row.avgPurchaseRate).toLocaleString('en-IN')}</td>
                      <td className="p-2.5 text-right text-amber-700">
                        {row.premiumAmount > 0 ? `₹${Math.round(row.premiumAmount).toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="p-2.5 text-right text-rose-700">
                        {row.deductionAmount > 0 ? `₹${Math.round(row.deductionAmount).toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="p-2.5 text-right font-bold text-slate-900">
                        ₹{Math.round(row.purchaseValue).toLocaleString('en-IN')}
                      </td>
                      <td className="p-2.5 text-center">
                        <span className={row.flaggedCount > 0 ? 'font-bold text-rose-700' : 'text-slate-400'}>
                          {row.flaggedCount}/{row.txnCount}
                        </span>
                      </td>
                      <td className="p-2.5 text-center text-slate-400">
                        <ChevronRight className="w-4 h-4 mx-auto" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER MODE 2: BROKER & SUPPLIER QUALITY RANKING (REPORT 3)
  // Strictly calculated from Mill Inspection (Grade Down, Seasonal Moisture, NCV, Dust, CT Habijabi/Chatta/Rope)
  // =========================================================================
  if (mode === 'ranking') {
    const entityLabel = rankEntity === 'broker' ? 'Broker' : 'Supplier';
    const entityPlural = rankEntity === 'broker' ? 'Brokers' : 'Suppliers';

    return (
      <div className="space-y-5 font-sans">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
              {entityLabel} Ranking (Mill Inspection)
            </h3>
            <p className="text-[11px] text-slate-500">
              Grade Down &amp; Seasonal Moisture based Mill Inspection quality ranking with Indian currency Purchase Value (Cr / L / K)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setRankEntity('broker')}
                className={`px-3 py-1 rounded text-xs font-bold cursor-pointer ${
                  rankEntity === 'broker' ? 'bg-slate-900 text-white' : 'text-slate-600'
                }`}
              >
                Brokers
              </button>
              <button
                type="button"
                onClick={() => setRankEntity('supplier')}
                className={`px-3 py-1 rounded text-xs font-bold cursor-pointer ${
                  rankEntity === 'supplier' ? 'bg-slate-900 text-white' : 'text-slate-600'
                }`}
              >
                Suppliers
              </button>
            </div>
          </div>
        </div>

        {/* Active Seasonal Moisture Tolerance Strip */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-2 font-bold text-slate-700">
            <Droplets className="w-3.5 h-3.5 text-[#D94B5A]" />
            <span>Active Moisture Tolerance Rules:</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 font-mono text-[10.5px] text-slate-700">
            <span className="px-2 py-0.5 bg-white border border-slate-200 rounded font-bold">
              Jul–Dec (Dry): DAISEE ≤ 20% · Standard ≤ 18%
            </span>
            <span className="px-2 py-0.5 bg-white border border-slate-200 rounded font-bold">
              Jan–Jun (Wet): DAISEE ≤ 18% · Standard ≤ 16%
            </span>
            <span className="text-slate-500 font-sans">
              ({filteredMillInspections.length} Mill Inspection lots evaluated)
            </span>
          </div>
        </div>

        {/* Full-Width Horizontal Ranking Bar Chart (Grade Down & Moisture Based + Purchase Value in Cr / L / K) */}
        <HorizontalRankBarChart
          title={
            rankMetric === 'score'
              ? `Top ${entityPlural} by Mill Inspection Quality Performance`
              : `Top ${entityPlural} by Purchase Value (Mill Inspection)`
          }
          subtitle={
            rankMetric === 'score'
              ? 'Grade Down & Seasonal Moisture based score (0–100) with Purchase Value (Cr / L / K) & inspected MR count'
              : 'Mill Inspection Purchase Value (Cr / L / K) with Grade Down, Moisture & Quality Performance Score'
          }
          data={horizontalRankingData}
          valueFormatter={(v) => (rankMetric === 'score' ? `${v.toFixed(1)} / 100` : formatIndianCurrencyShort(v))}
          rightSlot={
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setRankMetric('score')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${
                  rankMetric === 'score' ? 'bg-[#D94B5A] text-white' : 'text-slate-600'
                }`}
              >
                Quality Score
              </button>
              <button
                type="button"
                onClick={() => setRankMetric('value')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${
                  rankMetric === 'value' ? 'bg-[#D94B5A] text-white' : 'text-slate-600'
                }`}
              >
                Purchase Value
              </button>
            </div>
          }
          onBarClick={(item) => {
            const name = item.fullName || item.label;
            const subTxns = filtered.filter(t => String(t[rankEntity] || 'UNASSIGNED').toUpperCase() === name.toUpperCase());
            onDrillDown(`${entityLabel.toUpperCase()}: ${name}`, subTxns);
          }}
        />

        {/* Mill Inspection Quality Performance Ledger Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-black uppercase text-slate-900">
              Ranked {entityLabel} Mill Inspection Performance Ledger ({millRankings.length})
            </span>
            <span className="text-[11px] text-slate-500">Ranked highest-to-lowest Quality Score · Click row for PO drill-down</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-bold uppercase text-[10px]">
                  <th className="p-2.5 w-12 text-center">Rank</th>
                  <th className="p-2.5">{entityLabel} Name</th>
                  <th className="p-2.5 text-right">Insp MRs</th>
                  <th className="p-2.5 text-right">Received MT</th>
                  <th className="p-2.5 text-right">Purchase Value</th>
                  <th className="p-2.5 text-right">Grade Down %</th>
                  <th className="p-2.5 text-right">Moisture (Excess)</th>
                  <th className="p-2.5 text-right">Dust %</th>
                  <th className="p-2.5 text-right">NCV %</th>
                  <th className="p-2.5 text-right">CT (Habi/Chatta/Rope)</th>
                  <th className="p-2.5 text-right">Score</th>
                  <th className="p-2.5 text-center">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums text-[11px] text-slate-700">
                {millRankings.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-10 text-center text-slate-400 font-sans">
                      No Mill Inspection records match the active filters.
                    </td>
                  </tr>
                ) : (
                  millRankings.map((item, idx) => {
                    const subTxns = filtered.filter(t => String(t[rankEntity] || 'UNASSIGNED').toUpperCase() === item.key.toUpperCase());
                    const tierCls =
                      item.tier === 'Excellent'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : item.tier === 'Good'
                        ? 'bg-sky-100 text-sky-800 border-sky-200'
                        : item.tier === 'Watch'
                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                        : 'bg-rose-100 text-rose-800 border-rose-200';
                    return (
                      <tr
                        key={item.key}
                        onClick={() => onDrillDown(`${entityLabel.toUpperCase()}: ${item.key}`, subTxns)}
                        className="hover:bg-slate-50 transition cursor-pointer"
                      >
                        <td className="p-2.5 text-center text-slate-400 font-bold">#{idx + 1}</td>
                        <td className="p-2.5 font-sans font-bold text-slate-900 max-w-[200px] truncate" title={item.key}>
                          {item.key}
                        </td>
                        <td className="p-2.5 text-right">{item.mrCount}</td>
                        <td className="p-2.5 text-right font-bold">{item.totalMt.toFixed(2)} MT</td>
                        <td className="p-2.5 text-right font-bold text-slate-900">
                          {formatIndianCurrencyShort(item.estimatedValue)}
                        </td>
                        <td className={`p-2.5 text-right font-bold ${item.avgGradeDown >= 5 ? 'text-rose-700' : item.avgGradeDown > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                          {item.avgGradeDown.toFixed(2)}%
                        </td>
                        <td className="p-2.5 text-right">
                          <span className={item.avgExcessMoisture > 0.2 ? 'text-rose-700 font-bold' : 'text-slate-700'}>
                            {item.avgMoisture.toFixed(1)}%
                          </span>
                          {item.avgExcessMoisture > 0.05 && (
                            <span className="text-[10px] text-rose-600 ml-1">(+{item.avgExcessMoisture.toFixed(1)}%)</span>
                          )}
                        </td>
                        <td className={`p-2.5 text-right ${item.avgDust >= 1.5 ? 'text-rose-700 font-bold' : ''}`}>
                          {item.avgDust.toFixed(2)}%
                        </td>
                        <td className={`p-2.5 text-right ${item.avgNcv >= 1.5 ? 'text-rose-700 font-bold' : ''}`}>
                          {item.avgNcv.toFixed(2)}%
                        </td>
                        <td className={`p-2.5 text-right ${item.totalHabijabiChattaRopeKg > 0 ? 'text-amber-800 font-bold' : 'text-slate-400'}`}>
                          {item.totalHabijabiChattaRopeKg > 0
                            ? `${Math.round(item.totalHabijabiChattaRopeKg)} kg (${item.avgCtPct.toFixed(1)}%)`
                            : '0 kg'}
                        </td>
                        <td className="p-2.5 text-right font-black text-slate-900">
                          {item.performanceScore.toFixed(1)}
                        </td>
                        <td className="p-2.5 text-center font-sans">
                          <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${tierCls}`}>
                            {item.tier}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER MODE 3: PREMIUM & COST WATERFALL ANALYSIS (REPORT 4)
  // Strictly powered by Payment Operations (payment_master + payment_details)
  // =========================================================================
  return (
    <div className="space-y-5 font-sans">
      {/* Row 1: Monthly Premium Line + Effective Cost Waterfall */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2">
          <div className="pb-2 border-b border-slate-100">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Monthly Average Premium Trend (₹/Qtl)
            </h4>
            <p className="text-[11px] text-slate-500">Weighted monthly premium per quintal strictly from Payment Operations</p>
          </div>
          <div style={{ width: '100%', height: 270 }}>
            {monthlyPremiumTrend.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No monthly premium records found in Payment Operations for current filters.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyPremiumTrend} margin={{ top: 10, right: 16, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'monospace' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'monospace' }} tickFormatter={(v) => `₹${v}`} width={52} />
                  <Tooltip
                    formatter={(val: any, name: any) => [
                      name === 'Avg Premium (₹/Qtl)' ? `₹${Number(val).toFixed(1)}/Qtl` : `₹${Number(val).toFixed(2)} L`,
                      name
                    ]}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line
                    type="monotone"
                    dataKey="avgPremPerQtl"
                    name="Avg Premium (₹/Qtl)"
                    stroke="#d97706"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#d97706' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <WaterfallChart
          title="Effective Landed Cost Waterfall"
          subtitle="Payment Operations: Payable Amt + Premiums − Deductions = Effective Landed Cost"
          data={costWaterfallData}
          unit="₹"
          height={270}
        />
      </div>

      {/* Row 2: Premium Histogram + Broker Premium Ledger (Payment Operations) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5">
          <HistogramChart
            title="Premium / Qtl Distribution Histogram"
            subtitle="Frequency of Payment Operations vouchers across premium rate tiers"
            bins={premiumHistogramBins}
            metricLabel="Vouchers"
            height={280}
          />
        </div>

        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-black uppercase text-slate-900">
              Broker-Wise Premium Ledger ({brokerPremiumRows.length} Brokers)
            </span>
            <span className="text-[11px] font-mono font-bold text-amber-800">
              Total: ₹{Math.round(paymentSummaryTotals.premium).toLocaleString('en-IN')}
            </span>
          </div>
          <div className="overflow-x-auto max-h-[340px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-900 text-white font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-2.5">Broker Name</th>
                  <th className="p-2.5 text-right">MRs / Vouchers</th>
                  <th className="p-2.5 text-right">Qty (MT)</th>
                  <th className="p-2.5 text-right">Avg ₹/Qtl</th>
                  <th className="p-2.5 text-right">Total Premium (₹)</th>
                  <th className="p-2.5 text-center">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums text-[11px]">
                {brokerPremiumRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 font-sans">
                      No premium payments recorded in Payment Operations for the selected filter range.
                    </td>
                  </tr>
                ) : (
                  brokerPremiumRows.map(b => {
                    return (
                      <tr
                        key={b.key}
                        onClick={() =>
                          setSelectedPremiumBroker({
                            name: b.key,
                            txns: b.vouchers.map(paymentVoucherToTxnLine)
                          })
                        }
                        className="hover:bg-amber-50/40 cursor-pointer transition"
                      >
                        <td className="p-2.5 font-sans font-bold text-slate-900">{b.key}</td>
                        <td className="p-2.5 text-right">{b.mrCount}</td>
                        <td className="p-2.5 text-right">{b.quantityMT.toFixed(2)} MT</td>
                        <td className="p-2.5 text-right text-slate-600">
                          {b.avgPremPerQtl > 0 ? `₹${b.avgPremPerQtl.toFixed(1)}` : '—'}
                        </td>
                        <td className="p-2.5 text-right font-bold text-amber-800">
                          +₹{Math.round(b.premiumAmount).toLocaleString('en-IN')}
                        </td>
                        <td className="p-2.5 text-center font-sans text-[#D94B5A] font-bold">Inspect</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedPremiumBroker && (
        <BrokerPremiumDetailsModal
          broker={selectedPremiumBroker.name}
          transactions={selectedPremiumBroker.txns}
          onClose={() => setSelectedPremiumBroker(null)}
        />
      )}
    </div>
  );
};
