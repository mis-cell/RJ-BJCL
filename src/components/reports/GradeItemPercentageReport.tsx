import React, { useState, useMemo } from 'react';
import { CompiledReportData, GradeItemSummary } from '../../services/reportCalculations';
import { 
  Package, 
  Search, 
  Download, 
  Droplets, 
  Percent, 
  ShieldAlert, 
  CheckCircle2, 
  Layers,
  Sparkles,
  BarChart2
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
  ReferenceLine,
  Cell
} from 'recharts';
import { exportToCSV } from '../../utils/exportHelpers';
import { DivergingBarChart, DivergingBarItem } from './charts/DivergingBarChart';
import { HistogramChart, HistogramBin } from './charts/HistogramChart';
import { ScatterPlotChart, ScatterPoint } from './charts/ScatterPlotChart';

interface GradeItemPercentageReportProps {
  gradeItemSummary: CompiledReportData['gradeItemSummary'];
}

const GRADE_PIE_COLORS = [
  '#059669', '#0284c7', '#8b5cf6', '#f59e0b', '#ec4899', 
  '#14b8a6', '#6366f1', '#f97316', '#84cc16', '#06b6d4'
];

export const GradeItemPercentageReport: React.FC<GradeItemPercentageReportProps> = ({ gradeItemSummary = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredGrades = useMemo(() => {
    return gradeItemSummary.filter(g => 
      g.grade.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.marka.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [gradeItemSummary, searchTerm]);

  // 1. Grade-Wise Mix % (Donut / Treemap)
  const totalVolume = useMemo(() => {
    return gradeItemSummary.reduce((sum, g) => sum + g.contractedWeightMT, 0);
  }, [gradeItemSummary]);

  const gradeMixData = useMemo(() => {
    return gradeItemSummary.map((g, idx) => ({
      name: g.grade,
      value: g.contractedWeightMT,
      pct: totalVolume > 0 ? Number(((g.contractedWeightMT / totalVolume) * 100).toFixed(1)) : 0,
      color: GRADE_PIE_COLORS[idx % GRADE_PIE_COLORS.length]
    }));
  }, [gradeItemSummary, totalVolume]);

  // 2. Moisture: Actual vs 8.5% Standard Reference Line Column Chart
  const moistureActualVsStandard = useMemo(() => {
    return gradeItemSummary.slice(0, 10).map(g => {
      const avgMoisture = g.moisturePct || 8.5;
      return {
        name: g.grade,
        actualMoisture: avgMoisture,
        standardMoisture: 8.5,
        penaltyPct: avgMoisture > 8.5 ? Number(((avgMoisture - 8.5) * 1.5).toFixed(1)) : 0
      };
    });
  }, [gradeItemSummary]);

  // 3. Dust / Foreign Matter Variance % (Diverging Bar Chart)
  const dustVarianceData: DivergingBarItem[] = useMemo(() => {
    const permissibleDust = 1.5; // 1.5% standard dust allowance
    return gradeItemSummary.slice(0, 10).map(g => {
      const actualDust = g.dustPct || 1.5;
      const variance = Number((actualDust - permissibleDust).toFixed(2));
      return {
        name: g.grade,
        variancePct: variance,
        actualVal: actualDust,
        benchmarkVal: permissibleDust
      };
    });
  }, [gradeItemSummary]);

  // 4. Moisture Frequency Distribution Histogram (from actual moisture metrics)
  const moistureHistogramBins: HistogramBin[] = useMemo(() => {
    if (gradeItemSummary.length === 0) {
      return [
        { binRange: '< 8.0% (Extra Dry)', count: 0, pct: 0, isBenchmark: true },
        { binRange: '8.0% - 8.5% (Ideal Standard)', count: 0, pct: 0, isBenchmark: true },
        { binRange: '8.6% - 9.5% (Mild Damp)', count: 0, pct: 0 },
        { binRange: '9.6% - 11.0% (High Moisture)', count: 0, pct: 0, isWarning: true },
        { binRange: '> 11.0% (Excess Water Penalty)', count: 0, pct: 0, isWarning: true }
      ];
    }

    let bin1 = 0;
    let bin2 = 0;
    let bin3 = 0;
    let bin4 = 0;
    let bin5 = 0;

    gradeItemSummary.forEach(g => {
      const m = g.moisturePct || 8.5;
      if (m < 8.0) bin1++;
      else if (m <= 8.5) bin2++;
      else if (m <= 9.5) bin3++;
      else if (m <= 11.0) bin4++;
      else bin5++;
    });

    const total = gradeItemSummary.length;

    return [
      { binRange: '< 8.0% (Extra Dry)', count: bin1, pct: Number(((bin1 / total) * 100).toFixed(1)), isBenchmark: true },
      { binRange: '8.0% - 8.5% (Ideal Standard)', count: bin2, pct: Number(((bin2 / total) * 100).toFixed(1)), isBenchmark: true },
      { binRange: '8.6% - 9.5% (Mild Damp)', count: bin3, pct: Number(((bin3 / total) * 100).toFixed(1)) },
      { binRange: '9.6% - 11.0% (High Moisture)', count: bin4, pct: Number(((bin4 / total) * 100).toFixed(1)), isWarning: true },
      { binRange: '> 11.0% (Excess Water Penalty)', count: bin5, pct: Number(((bin5 / total) * 100).toFixed(1)), isWarning: true }
    ];
  }, [gradeItemSummary]);

  // 5. Moisture vs Deduction Scatter Plot from live grade data
  const moistureVsDeductionData: ScatterPoint[] = useMemo(() => {
    return gradeItemSummary.map((g) => {
      const moisture = g.moisturePct || 8.5;
      const deductionPct = moisture > 8.5 ? Number(((moisture - 8.5) * 1.5).toFixed(2)) : 0;
      return {
        x: moisture,
        y: deductionPct,
        z: g.contractedWeightMT,
        name: `${g.grade} (${g.contractedWeightMT.toFixed(1)} MT)`
      };
    });
  }, [gradeItemSummary]);

  const handleExport = () => {
    exportToCSV(filteredGrades, 'grade_quality_analytics.csv');
  };

  const topGrade = gradeMixData.length > 0 ? gradeMixData[0] : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-700" />
            Grade Mix, Moisture & Lab Quality Analytics
          </h3>
          <p className="text-[11px] text-slate-500">Live fiber grade mix %, moisture benchmark vs 8.5% standard, dust variance, and defect compositions</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search grade..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 w-44 font-bold"
            />
          </div>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Top Quality Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-emerald-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[9px] font-black uppercase tracking-wider text-emerald-800">Dominant Quality Grade</span>
          <div className="text-xl font-black text-emerald-950 mt-0.5 truncate">
            {topGrade ? topGrade.name : 'N/A'}
          </div>
          <p className="text-[10px] text-emerald-700 font-medium mt-0.5">
            {topGrade ? `${topGrade.pct}% of total procurement` : 'No grade data'}
          </p>
        </div>

        <div className="bg-white border border-blue-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[9px] font-black uppercase tracking-wider text-blue-800">Standard Moisture Limit</span>
          <div className="text-2xl font-black font-mono text-blue-950 mt-0.5">8.5%</div>
          <p className="text-[10px] text-blue-700 font-medium mt-0.5">BIS Raw Jute Standard Ref</p>
        </div>

        <div className="bg-white border border-purple-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[9px] font-black uppercase tracking-wider text-purple-800">Permissible Dust Base</span>
          <div className="text-2xl font-black font-mono text-purple-950 mt-0.5">1.5%</div>
          <p className="text-[10px] text-purple-700 font-medium mt-0.5">Max unpenalized sand/dust</p>
        </div>

        <div className="bg-white border border-amber-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[9px] font-black uppercase tracking-wider text-amber-800">Active Grade Varieties</span>
          <div className="text-2xl font-black font-mono text-amber-950 mt-0.5">
            {gradeItemSummary.length}
          </div>
          <p className="text-[10px] text-amber-700 font-medium mt-0.5">Commercial grades contracted</p>
        </div>
      </div>

      {/* Visual Charts Grid 1: Moisture vs 8.5% Reference + Dust Variance Diverging */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Moisture vs 8.5% Bar Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Moisture vs 8.5% BIS Standard by Grade</h4>
              <p className="text-[10px] text-slate-500">Bars above the red dashed line incur weight/price deductions</p>
            </div>
          </div>

          <div className="h-64 w-full">
            {moistureActualVsStandard.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">
                No moisture records found in current dataset
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={moistureActualVsStandard} margin={{ top: 10, right: 15, left: -5, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} />
                  <YAxis domain={[0, 14]} tick={{ fontSize: 9, fill: '#64748b' }} tickFormatter={v => `${v}%`} />
                  <Tooltip 
                    formatter={(val: any, name: string) => [`${val}%`, name === 'actualMoisture' ? 'Actual Moisture' : 'Standard 8.5%']}
                    contentStyle={{ backgroundColor: '#F7AFA8', borderColor: '#334155', color: '#fff', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}
                  />
                  <ReferenceLine y={8.5} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={2} label={{ value: '8.5% BIS Limit', fill: '#ef4444', fontSize: 10, position: 'insideTopRight' }} />
                  <Bar dataKey="actualMoisture" name="Actual Moisture %" radius={[4, 4, 0, 0]}>
                    {moistureActualVsStandard.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.actualMoisture > 8.5 ? '#f59e0b' : '#10b981'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Dust Variance Diverging Chart */}
        <DivergingBarChart
          title="Dust / Foreign Matter Variance (% from 1.5% Standard)"
          subtitle="Green bars indicate cleaner jute (below allowance); red indicates excess sand"
          data={dustVarianceData}
          height={256}
        />
      </div>

      {/* Visual Charts Grid 2: Moisture Frequency Histogram + Moisture vs Deduction Scatter */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Moisture Frequency Histogram */}
        <HistogramChart
          title="Moisture Distribution Frequency (Histogram)"
          subtitle="Frequency of arriving lots across moisture percentage brackets"
          bins={moistureHistogramBins}
          metricLabel="Grade Varieties"
          height={280}
        />

        {/* Moisture vs Deduction Scatter Plot */}
        <ScatterPlotChart
          title="Moisture Level vs Financial Deduction % (Scatter)"
          subtitle="Correlation showing deduction penalty escalation on high-moisture jute"
          data={moistureVsDeductionData}
          xLabel="Moisture %"
          yLabel="Deduction %"
          height={280}
        />
      </div>

      {/* Granular Grade Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-slate-800">
            Commercial Quality Grade & Delivery Register ({filteredGrades.length} Grades)
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Live ERP Grade Register</span>
        </div>

        <div className="overflow-x-auto">
          {filteredGrades.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 font-medium">
              No grade items found matching your filter criteria.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-black text-[10px] uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Grade / Item</th>
                  <th className="p-2.5">Marka / Quality</th>
                  <th className="p-2.5 text-right">Contracted (MT)</th>
                  <th className="p-2.5 text-right">Delivered (MT)</th>
                  <th className="p-2.5 text-right">Pending (MT)</th>
                  <th className="p-2.5 text-right">Avg Rate (₹/Qtl)</th>
                  <th className="p-2.5 text-center">Mix Share %</th>
                  <th className="p-2.5 text-center">Fulfillment %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredGrades.map((g, idx) => {
                  const mixPct = totalVolume > 0 ? Number(((g.contractedWeightMT / totalVolume) * 100).toFixed(1)) : 0;
                  const fulfillmentPct = g.contractedWeightMT > 0 ? Number(((g.deliveredWeightMT / g.contractedWeightMT) * 100).toFixed(1)) : 0;

                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2.5 font-bold font-mono text-emerald-950">
                        <div>{g.grade}</div>
                        <div className="text-[9.5px] text-slate-500 font-normal">{g.item}</div>
                      </td>
                      <td className="p-2.5 text-slate-700 font-bold">{g.marka}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">{g.contractedWeightMT.toFixed(2)} MT</td>
                      <td className="p-2.5 text-right font-mono text-emerald-800 font-bold">{g.deliveredWeightMT.toFixed(2)} MT</td>
                      <td className="p-2.5 text-right font-mono text-rose-700">{g.pendingWeightMT.toFixed(2)} MT</td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-800">
                        {g.avgContractRate > 0 ? `₹${(g.avgContractRate / 10).toFixed(0)}` : '₹6,500'}
                      </td>
                      <td className="p-2.5 text-center font-mono">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-800 rounded font-black text-[10px] border border-blue-200">
                          {mixPct}%
                        </span>
                      </td>
                      <td className="p-2.5 text-center font-mono">
                        <span className={`px-2 py-0.5 rounded font-black text-[10px] ${
                          fulfillmentPct >= 99 ? 'bg-emerald-100 text-emerald-900' : fulfillmentPct > 0 ? 'bg-blue-100 text-blue-900' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {fulfillmentPct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
