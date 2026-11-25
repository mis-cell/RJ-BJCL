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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LabelList
} from 'recharts';
import { ChevronRight, ArrowUpDown } from 'lucide-react';
import {
  SystemReportDataset,
  ReportTransactionLine,
  groupTransactionsByDimension
} from '../../services/systemReportEngine';
import { ScatterPlotChart } from '../reports/charts/ScatterPlotChart';
import { ParetoChart } from '../reports/charts/ParetoChart';
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

const RADAR_COLORS = ['#D94B5A', '#0f766e', '#2563eb'];

export const UnifiedBusinessAnalysisView: React.FC<UnifiedBusinessAnalysisViewProps> = ({
  dataset,
  mode,
  onDrillDown
}) => {
  const { filtered, metrics } = dataset;

  // Business Analysis state
  const [dimension, setDimension] = useState<DimensionType>('broker');
  const [scatterMode, setScatterMode] = useState<'mt' | 'rate'>('mt');
  const [stackedMode, setStackedMode] = useState<'delivery' | 'exception'>('delivery');
  const [sortBy, setSortBy] = useState<'value' | 'qty' | 'delivery' | 'premium' | 'deduction'>('value');

  // Ranking & Pareto state
  const [rankEntity, setRankEntity] = useState<'broker' | 'supplier'>('broker');
  const [rankMetric, setRankMetric] = useState<'value' | 'flagged'>('value');

  // Radar broker comparison selection
  const brokerGrouped = useMemo(() => groupTransactionsByDimension(filtered, 'broker'), [filtered]);
  const [selectedRadarBrokers, setSelectedRadarBrokers] = useState<string[]>([]);

  // Premium modal state
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

  // 1. Grouped Bar Data (Contracted vs Received MT)
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

  // 2. 100% Stacked Bar Data (Delivery or Exception % with total deals shown right beside each bar)
  const stackedHundredData = useMemo(() => {
    const base = brokerGrouped.slice(0, 10);
    return base.map(b => {
      const totalDeals = b.txnCount || 1;
      const deliveredPct = Number(b.deliveryPct.toFixed(1));
      const pendingPct = Number(Math.max(0, 100 - deliveredPct).toFixed(1));
      const flaggedPct = Number(b.flaggedRatePct.toFixed(1));
      const cleanPct = Number(Math.max(0, 100 - flaggedPct).toFixed(1));
      return {
        name: b.key.length > 20 ? `${b.key.slice(0, 18)}…` : b.key,
        fullName: b.key,
        dealsLabel: `${totalDeals} deals`,
        deliveredPct,
        pendingPct,
        cleanPct,
        flaggedPct,
        flaggedCount: b.flaggedCount,
        totalDeals
      };
    });
  }, [brokerGrouped]);

  // 3. Scatter Plot Data (Contract MT vs Received MT OR Purchase Rate vs Base Rate)
  const scatterPoints = useMemo(() => {
    return filtered
      .filter(t => (scatterMode === 'mt' ? t.quantityMT > 0 : t.purchaseRate > 0 && t.baseRate > 0))
      .slice(0, 180)
      .map(t => ({
        x: Number((scatterMode === 'mt' ? t.quantityMT : t.baseRate).toFixed(2)),
        y: Number((scatterMode === 'mt' ? t.arrivedWeightMT : t.purchaseRate).toFixed(2)),
        z: Math.max(10, Math.round(t.quantityMT)),
        name: `${t.poNo} · ${t.broker}`,
        category: t.isAbnormal ? 'Flagged' : 'Normal'
      }));
  }, [filtered, scatterMode]);

  // 4. Radar Chart Data (Side-by-side broker comparison across normalized 0-100 metrics)
  const activeRadarBrokers = useMemo(() => {
    if (selectedRadarBrokers.length > 0) {
      return selectedRadarBrokers.filter(name => brokerGrouped.some(b => b.key === name));
    }
    return brokerGrouped.slice(0, 3).map(b => b.key);
  }, [selectedRadarBrokers, brokerGrouped]);

  const radarData = useMemo(() => {
    const maxVal = Math.max(1, ...brokerGrouped.map(b => b.purchaseValue));
    const axes = [
      { key: 'Delivery %', get: (b: any) => Math.min(100, b.deliveryPct) },
      { key: 'On-Time %', get: (b: any) => Math.min(100, b.onTimePct) },
      { key: 'Clean Audit %', get: (b: any) => Math.max(0, 100 - b.flaggedRatePct) },
      { key: 'Settlement %', get: (b: any) => Math.min(100, b.settlementPct) },
      { key: 'Volume Index', get: (b: any) => Math.min(100, (b.purchaseValue / maxVal) * 100) }
    ];
    return axes.map(axis => {
      const row: Record<string, any> = { subject: axis.key };
      activeRadarBrokers.forEach(bName => {
        const found = brokerGrouped.find(b => b.key === bName);
        row[bName] = found ? Number(axis.get(found).toFixed(1)) : 0;
      });
      return row;
    });
  }, [brokerGrouped, activeRadarBrokers]);

  const toggleRadarBroker = (name: string) => {
    setSelectedRadarBrokers(prev => {
      const current = prev.length > 0 ? prev : brokerGrouped.slice(0, 3).map(b => b.key);
      if (current.includes(name)) {
        return current.length > 1 ? current.filter(x => x !== name) : current;
      }
      if (current.length >= 3) {
        return [...current.slice(1), name];
      }
      return [...current, name];
    });
  };

  // 5. Ranking & Pareto Data
  const rankingGrouped = useMemo(() => {
    return groupTransactionsByDimension(filtered, rankEntity);
  }, [filtered, rankEntity]);

  const horizontalRankingData = useMemo(() => {
    if (rankMetric === 'value') {
      return rankingGrouped.slice(0, 15).map(item => ({
        label: item.key,
        fullName: item.key,
        value: Math.round(item.purchaseValue),
        annotation: `₹${(item.purchaseValue / 100000).toFixed(1)}L (${item.txnCount} deals)`,
        secondaryText: `${item.quantityMT.toFixed(1)} MT contracted · ${item.deliveryPct.toFixed(0)}% received`,
        color: '#0f766e'
      }));
    }
    return [...rankingGrouped]
      .filter(item => item.txnCount > 0)
      .sort((a, b) => b.flaggedRatePct - a.flaggedRatePct || b.flaggedCount - a.flaggedCount)
      .slice(0, 15)
      .map(item => ({
        label: item.key,
        fullName: item.key,
        value: Number(item.flaggedRatePct.toFixed(1)),
        annotation: `${item.flaggedRatePct.toFixed(1)}% (${item.flaggedCount}/${item.txnCount} deals)`,
        secondaryText: `${item.flaggedCount} flagged out of ${item.txnCount} reviewed`,
        color: item.flaggedRatePct >= 40 ? '#be123c' : item.flaggedRatePct >= 15 ? '#d97706' : '#0f766e'
      }));
  }, [rankingGrouped, rankMetric]);

  const paretoData = useMemo(() => {
    return rankingGrouped.slice(0, 12).map(item => ({
      name: item.key,
      countOrVolume: Number((item.purchaseValue / 100000).toFixed(2))
    }));
  }, [rankingGrouped]);

  // 6. Premium & Cost Waterfall Data
  const monthlyPremiumTrend = useMemo(() => {
    const map = new Map<string, { premSum: number; qtlSum: number; count: number }>();
    filtered.forEach(t => {
      if (!t.month) return;
      const cur = map.get(t.month) || { premSum: 0, qtlSum: 0, count: 0 };
      if (t.premiumAmount > 0) {
        cur.premSum += t.premiumAmount;
        cur.qtlSum += Math.max(t.quantityMT * 10, 1);
        cur.count += 1;
      }
      map.set(t.month, cur);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({
        month,
        avgPremPerQtl: v.qtlSum > 0 ? Number((v.premSum / v.qtlSum).toFixed(1)) : 0,
        totalPremLakh: Number((v.premSum / 100000).toFixed(2)),
        dealsWithPrem: v.count
      }));
  }, [filtered]);

  const costWaterfallData = useMemo(() => {
    const gross = Math.round(metrics.totalPurchaseValue);
    const prem = Math.round(metrics.totalPremium);
    const ded = Math.round(metrics.totalDeduction);
    const effective = gross + prem - ded;
    return [
      { name: 'Gross Purchase', value: gross, isTotal: true, color: '#0f172a' },
      { name: '+ Premiums', value: prem, color: '#d97706' },
      { name: '− Deductions', value: -ded, color: '#0f766e' },
      { name: 'Effective Cost', value: effective, isTotal: true, color: '#D94B5A' }
    ];
  }, [metrics]);

  const premiumHistogramBins = useMemo(() => {
    const premTxns = filtered.filter(t => t.premiumRate > 0);
    const buckets = [
      { label: '₹1–50/Qtl', min: 0.01, max: 50, count: 0 },
      { label: '₹51–100/Qtl', min: 50.01, max: 100, count: 0 },
      { label: '₹101–200/Qtl', min: 100.01, max: 200, count: 0 },
      { label: '₹201–400/Qtl', min: 200.01, max: 400, count: 0 },
      { label: '₹400+/Qtl', min: 400.01, max: Infinity, count: 0 }
    ];
    premTxns.forEach(t => {
      const b = buckets.find(x => t.premiumRate >= x.min && t.premiumRate <= x.max);
      if (b) b.count += 1;
    });
    const total = Math.max(1, premTxns.length);
    return buckets.map(b => ({
      binRange: b.label,
      count: b.count,
      pct: Number(((b.count / total) * 100).toFixed(1)),
      isWarning: b.min >= 200
    }));
  }, [filtered]);

  const brokerPremiumRows = useMemo(() => {
    return brokerGrouped
      .filter(b => b.premiumAmount > 0)
      .sort((a, b) => b.premiumAmount - a.premiumAmount);
  }, [brokerGrouped]);

  // =========================================================================
  // RENDER MODE 1: BUSINESS & DIMENSIONAL ANALYSIS
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
              Unified dimensional ledger across Broker, Supplier, Agency, Area, Grade &amp; Month
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

        {/* ROW 1: Grouped Bar + 100% Stacked Bar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Grouped Bar: Contracted vs Received MT */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2">
            <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Contracted vs Received MT ({dimension.toUpperCase()})
                </h4>
                <p className="text-[11px] text-slate-500">Side-by-side contracted and physically received tonnage</p>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Grouped Bar</span>
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
                  <Bar dataKey="contractedMT" name="Contracted MT" fill="#D94B5A" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="receivedMT" name="Received MT" fill="#0f766e" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 100% Stacked Bar: Delivery or Exception % with total deals shown beside each bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2">
            <div className="pb-2 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Broker 100% Mix ({stackedMode === 'delivery' ? 'Delivery Share' : 'Clean vs Flagged Deals'})
                </h4>
                <p className="text-[11px] text-slate-500">Total deal volume displayed beside each bar for context</p>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setStackedMode('delivery')}
                  className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer ${
                    stackedMode === 'delivery' ? 'bg-slate-900 text-white' : 'text-slate-600'
                  }`}
                >
                  Delivery %
                </button>
                <button
                  type="button"
                  onClick={() => setStackedMode('exception')}
                  className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer ${
                    stackedMode === 'exception' ? 'bg-slate-900 text-white' : 'text-slate-600'
                  }`}
                >
                  Exception %
                </button>
              </div>
            </div>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stackedHundredData} layout="vertical" margin={{ top: 4, right: 64, left: 6, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10, fill: '#334155', fontWeight: 600 }} />
                  <Tooltip
                    formatter={(val: any, name: any) => [`${Number(val).toFixed(1)}%`, name]}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10.5px' }} />
                  {stackedMode === 'delivery' ? (
                    <>
                      <Bar dataKey="deliveredPct" stackId="a" name="Received %" fill="#0f766e" barSize={16} />
                      <Bar dataKey="pendingPct" stackId="a" name="Pending %" fill="#e2e8f0" barSize={16}>
                        <LabelList dataKey="dealsLabel" position="right" style={{ fontSize: 10, fill: '#475569', fontFamily: 'monospace', fontWeight: 700 }} />
                      </Bar>
                    </>
                  ) : (
                    <>
                      <Bar dataKey="cleanPct" stackId="b" name="Clean Deals %" fill="#0f766e" barSize={16} />
                      <Bar dataKey="flaggedPct" stackId="b" name="Flagged %" fill="#D94B5A" barSize={16}>
                        <LabelList dataKey="dealsLabel" position="right" style={{ fontSize: 10, fill: '#475569', fontFamily: 'monospace', fontWeight: 700 }} />
                      </Bar>
                    </>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ROW 2: Scatter Plot + Multi-Broker Radar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setScatterMode('mt')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer border ${
                  scatterMode === 'mt' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                Contract MT vs Received MT
              </button>
              <button
                type="button"
                onClick={() => setScatterMode('rate')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer border ${
                  scatterMode === 'rate' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                Base Rate vs Purchase Rate
              </button>
            </div>
            <ScatterPlotChart
              title={scatterMode === 'mt' ? 'Contract MT vs Received MT Outliers' : 'Satta Base Rate vs Purchase Rate Outliers'}
              subtitle={scatterMode === 'mt' ? 'Spots under-delivered or excess-received contracts immediately' : 'Spots contracts priced well above comparable Satta base rate'}
              data={scatterPoints}
              xLabel={scatterMode === 'mt' ? 'Contract MT' : 'Base Rate'}
              yLabel={scatterMode === 'mt' ? 'Received MT' : 'Purchase Rate'}
              xUnit={scatterMode === 'mt' ? ' MT' : ''}
              yUnit={scatterMode === 'mt' ? ' MT' : ''}
              height={260}
            />
          </div>

          {/* Side-by-Side Broker Radar Comparison */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col justify-between space-y-2">
            <div className="pb-2 border-b border-slate-100">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Side-by-Side Broker Radar Comparison
                  </h4>
                  <p className="text-[11px] text-slate-500">Select up to 3 brokers to compare across normalized 0–100 metrics</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {brokerGrouped.slice(0, 8).map(b => {
                  const isActive = activeRadarBrokers.includes(b.key);
                  return (
                    <button
                      type="button"
                      key={b.key}
                      onClick={() => toggleRadarBroker(b.key)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                        isActive
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {b.key.length > 18 ? `${b.key.slice(0, 16)}…` : b.key}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ width: '100%', height: 255 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="72%">
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#334155', fontWeight: 700 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                  {activeRadarBrokers.map((bName, i) => (
                    <Radar
                      key={bName}
                      name={bName}
                      dataKey={bName}
                      stroke={RADAR_COLORS[i % RADAR_COLORS.length]}
                      fill={RADAR_COLORS[i % RADAR_COLORS.length]}
                      fillOpacity={0.16}
                      strokeWidth={2}
                    />
                  ))}
                  <Legend wrapperStyle={{ fontSize: '10.5px' }} />
                  <Tooltip
                    formatter={(val: any) => [`${Number(val).toFixed(1)} / 100`]}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}
                  />
                </RadarChart>
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
              <span className="text-[11px] text-slate-500 ml-2">Click any row to drill down into contracts</span>
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
                  <th className="p-2.5 text-right">Deals</th>
                  <th className="p-2.5 text-right">Contract MT</th>
                  <th className="p-2.5 text-right">Received MT</th>
                  <th className="p-2.5 text-right">Delivery %</th>
                  <th className="p-2.5 text-right">Avg Rate</th>
                  <th className="p-2.5 text-right">Premium (₹)</th>
                  <th className="p-2.5 text-right">Deduction (₹)</th>
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
  // RENDER MODE 2: BROKER RANKING & PARETO (MERGED PERFORMANCE + CONTRIBUTION)
  // =========================================================================
  if (mode === 'ranking') {
    return (
      <div className="space-y-5 font-sans">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
              Performance Ranking &amp; Pareto Contribution
            </h3>
            <p className="text-[11px] text-slate-500">
              Compare volume leaders alongside exception rate (Flagged Deals ÷ Deals Reviewed with exact deal count)
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

        {/* 2-View Horizontal Bar + Pareto */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <HorizontalRankBarChart
            title={
              rankMetric === 'value'
                ? `Top ${rankEntity === 'broker' ? 'Brokers' : 'Suppliers'} by Purchase Value`
                : `${rankEntity === 'broker' ? 'Brokers' : 'Suppliers'} by Flagged Deals ÷ Deals Reviewed`
            }
            subtitle={
              rankMetric === 'value'
                ? 'Horizontal ranking with deal counts shown beside each bar'
                : 'Deal counts shown beside every rate so small-volume brokers are never overstated'
            }
            data={horizontalRankingData}
            valueFormatter={(v) => (rankMetric === 'value' ? `₹${v.toLocaleString('en-IN')}` : `${v.toFixed(1)}%`)}
            rightSlot={
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setRankMetric('value')}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${
                    rankMetric === 'value' ? 'bg-[#D94B5A] text-white' : 'text-slate-600'
                  }`}
                >
                  Purchase Value
                </button>
                <button
                  type="button"
                  onClick={() => setRankMetric('flagged')}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${
                    rankMetric === 'flagged' ? 'bg-[#D94B5A] text-white' : 'text-slate-600'
                  }`}
                >
                  Flagged Rate
                </button>
              </div>
            }
            onBarClick={(item) => {
              const name = item.fullName || item.label;
              const subTxns = filtered.filter(t => String(t[rankEntity] || 'UNASSIGNED') === name);
              onDrillDown(`${rankEntity.toUpperCase()}: ${name}`, subTxns);
            }}
          />

          <ParetoChart
            title={`Pareto 80/20 Concentration (${rankEntity === 'broker' ? 'Brokers' : 'Suppliers'})`}
            subtitle="Sorted by purchase value (₹ Lakhs) with cumulative contribution % curve"
            data={paretoData}
            volumeUnit="L"
            height={360}
          />
        </div>

        {/* Tiered Contribution Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-black uppercase text-slate-900">
              Ranked {rankEntity === 'broker' ? 'Broker' : 'Supplier'} Contribution Ledger ({rankingGrouped.length})
            </span>
            <span className="text-[11px] text-slate-500">Click row for contract drill-down</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-bold uppercase text-[10px]">
                  <th className="p-2.5 w-12 text-center">Rank</th>
                  <th className="p-2.5">{rankEntity === 'broker' ? 'Broker Name' : 'Supplier Name'}</th>
                  <th className="p-2.5 text-right">Deals</th>
                  <th className="p-2.5 text-right">Contract MT</th>
                  <th className="p-2.5 text-right">Purchase Value (₹)</th>
                  <th className="p-2.5 text-right">Share %</th>
                  <th className="p-2.5 text-right">Flagged Rate</th>
                  <th className="p-2.5 text-left">Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums text-[11px] text-slate-700">
                {rankingGrouped.map((item, idx) => {
                  const tier =
                    item.businessSharePct >= 20 ? 'Core (>20%)' :
                    item.businessSharePct >= 10 ? 'Major (10–20%)' :
                    item.businessSharePct >= 5 ? 'Mid (5–10%)' :
                    item.businessSharePct >= 1 ? 'Standard (1–5%)' : 'Long Tail (<1%)';
                  const subTxns = filtered.filter(t => String(t[rankEntity] || 'UNASSIGNED') === item.key);
                  return (
                    <tr
                      key={item.key}
                      onClick={() => onDrillDown(`${rankEntity.toUpperCase()}: ${item.key}`, subTxns)}
                      className="hover:bg-slate-50 transition cursor-pointer"
                    >
                      <td className="p-2.5 text-center text-slate-400">#{idx + 1}</td>
                      <td className="p-2.5 font-sans font-bold text-slate-900">{item.key}</td>
                      <td className="p-2.5 text-right">{item.txnCount}</td>
                      <td className="p-2.5 text-right font-bold">{item.quantityMT.toFixed(2)} MT</td>
                      <td className="p-2.5 text-right font-bold text-slate-900">₹{Math.round(item.purchaseValue).toLocaleString('en-IN')}</td>
                      <td className="p-2.5 text-right font-bold text-teal-700">{item.businessSharePct.toFixed(2)}%</td>
                      <td className="p-2.5 text-right">
                        <span className={item.flaggedRatePct >= 25 ? 'text-rose-700 font-bold' : 'text-slate-600'}>
                          {item.flaggedRatePct.toFixed(1)}% ({item.flaggedCount}/{item.txnCount})
                        </span>
                      </td>
                      <td className="p-2.5 font-sans text-slate-600">{tier}</td>
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
  // RENDER MODE 3: PREMIUM & COST WATERFALL ANALYSIS
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
            <p className="text-[11px] text-slate-500">Weighted monthly premium per quintal paid above base rate</p>
          </div>
          <div style={{ width: '100%', height: 270 }}>
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
          </div>
        </div>

        <WaterfallChart
          title="Effective Landed Cost Waterfall"
          subtitle="Gross Purchase Value + Premiums − Deductions = Effective Landed Cost"
          data={costWaterfallData}
          unit="₹"
          height={270}
        />
      </div>

      {/* Row 2: Premium Histogram + Broker Premium Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5">
          <HistogramChart
            title="Premium / Qtl Distribution Histogram"
            subtitle="Frequency of contracts across premium rate tiers"
            bins={premiumHistogramBins}
            metricLabel="Contracts"
            height={280}
          />
        </div>

        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-black uppercase text-slate-900">
              Broker-Wise Premium Ledger ({brokerPremiumRows.length} Brokers)
            </span>
            <span className="text-[11px] font-mono font-bold text-amber-800">
              Total: ₹{Math.round(metrics.totalPremium).toLocaleString('en-IN')}
            </span>
          </div>
          <div className="overflow-x-auto max-h-[340px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-900 text-white font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-2.5">Broker Name</th>
                  <th className="p-2.5 text-right">Deals</th>
                  <th className="p-2.5 text-right">Contract MT</th>
                  <th className="p-2.5 text-right">Total Premium (₹)</th>
                  <th className="p-2.5 text-center">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums text-[11px]">
                {brokerPremiumRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 font-sans">
                      No premium payments recorded in the selected filter range.
                    </td>
                  </tr>
                ) : (
                  brokerPremiumRows.map(b => {
                    const brokerTxns = filtered.filter(t => t.broker === b.key && t.premiumAmount > 0);
                    return (
                      <tr
                        key={b.key}
                        onClick={() => setSelectedPremiumBroker({ name: b.key, txns: brokerTxns })}
                        className="hover:bg-amber-50/40 cursor-pointer transition"
                      >
                        <td className="p-2.5 font-sans font-bold text-slate-900">{b.key}</td>
                        <td className="p-2.5 text-right">{b.txnCount}</td>
                        <td className="p-2.5 text-right">{b.quantityMT.toFixed(2)} MT</td>
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
