import React, { useState, useMemo } from 'react';
import { Search, FileSpreadsheet } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  PieChart,
  Pie,
  ComposedChart,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  Cell
} from 'recharts';
import { cn } from '../../lib/utils';
import { SAUDA_REPORTS, MONTH_LABELS } from './types';

interface SaudaAdvancedReportsViewProps {
  saudaData: any[];
  saudaDetails: any[];
}

export const SaudaAdvancedReportsView: React.FC<SaudaAdvancedReportsViewProps> = ({
  saudaData,
  saudaDetails
}) => {
  const [activeSaudaReportKey, setActiveSaudaReportKey] = useState<string>('r1');
  const [saudaReportMonth, setSaudaReportMonth] = useState<string>('ALL');
  const [saudaReportYear, setSaudaReportYear] = useState<string>('ALL');
  const [saudaReportSearch, setSaudaReportSearch] = useState<string>('');

  const saudaYears = useMemo(() => {
    const yrs = new Set<string>();
    saudaData.forEach(item => {
      if (item.financial_year) yrs.add(item.financial_year);
      if (item.date) {
        const cal = new Date(item.date).getFullYear().toString();
        yrs.add(cal);
      }
    });
    return Array.from(yrs).sort();
  }, [saudaData]);

  // Filter core Sauda master lists for Advanced Reports
  const saudaFilteredByPeriod = useMemo(() => {
    return saudaData.filter(item => {
      if (!item.date) return false;
      const d = new Date(item.date);
      const m = d.getMonth() + 1;
      const yr = d.getFullYear();
      
      // Month selector check
      if (saudaReportMonth !== 'ALL' && m.toString() !== saudaReportMonth) {
        return false;
      }
      
      // Year / Financial Year check
      if (saudaReportYear !== 'ALL') {
        if (item.financial_year !== saudaReportYear && yr.toString() !== saudaReportYear) {
          return false;
        }
      }
      
      // Keyword filter check
      if (saudaReportSearch.trim()) {
        const trm = saudaReportSearch.toLowerCase();
        const matches = 
          (item.sauda_no || '').toLowerCase().includes(trm) ||
          (item.supplier || '').toLowerCase().includes(trm) ||
          (item.broker || '').toLowerCase().includes(trm) ||
          (item.area || '').toLowerCase().includes(trm) ||
          (item.agency || '').toLowerCase().includes(trm);
        if (!matches) return false;
      }
      
      return true;
    });
  }, [saudaData, saudaReportMonth, saudaReportYear, saudaReportSearch]);

  // Join Sauda Details for the filtered matches
  const filteredSaudaDetails = useMemo(() => {
    const saudaIds = new Set(saudaFilteredByPeriod.map(s => s.sauda_id));
    return saudaDetails.filter(d => d.sauda_id && saudaIds.has(d.sauda_id));
  }, [saudaDetails, saudaFilteredByPeriod]);

  // Calculate specialized reports dataset for Sauda (r1 - r10)
  const saudaReportOutput = useMemo(() => {
    const result: {
      headers: string[];
      rows: string[][];
      chartData: any[];
      chartType: 'area' | 'bar' | 'hbar' | 'pie' | 'half_circle' | 'line' | 'composed';
      totalMT: number;
      totalCount: number;
    } = {
      headers: [],
      rows: [],
      chartData: [],
      chartType: 'bar',
      totalMT: 0,
      totalCount: 0
    };

    if (activeSaudaReportKey === 'r1') {
      // 1. Monthly Dispatch Summary
      const monthMap: Record<string, { monthYear: string; count: number; weight: number; sumRate: number; rateCount: number; sumUnits: number }> = {};
      saudaFilteredByPeriod.forEach(s => {
        if (!s.date) return;
        const d = new Date(s.date);
        const mLabel = d.toLocaleString('default', { month: 'short' });
        const yr = d.getFullYear();
        const key = `${mLabel} ${yr}`;
        if (!monthMap[key]) {
          monthMap[key] = { monthYear: key, count: 0, weight: 0, sumRate: 0, rateCount: 0, sumUnits: 0 };
        }
        monthMap[key].count++;
        monthMap[key].weight += Number(s.total_wt_in_ton) || 0;
        monthMap[key].sumUnits += Number(s.total_unit) || 0;
        if (s.b_rate) {
          monthMap[key].sumRate += Number(s.b_rate);
          monthMap[key].rateCount++;
        }
      });

      result.headers = ['MONTH / YEAR', 'DEALS COUNT', 'DISPATCHED PACKETS', 'TOTAL WEIGHED MASS (MT)', 'AVG PRICE RATE / QL', 'EST SALES VAL (INR)'];
      result.chartData = Object.values(monthMap).map(m => {
        const avg = m.rateCount > 0 ? Math.round(m.sumRate / m.rateCount) : 18500;
        const estValue = m.weight * avg;
        return {
          name: m.monthYear,
          weight: parseFloat(m.weight.toFixed(3)),
          value: parseFloat(m.weight.toFixed(3)),
          averageRate: avg,
          estimatedValue: parseFloat(estValue.toFixed(2))
        };
      });
      result.rows = Object.values(monthMap).map(m => {
        const avg = m.rateCount > 0 ? Math.round(m.sumRate / m.rateCount) : 18500;
        const val = m.weight * avg;
        return [
          m.monthYear,
          m.count.toString(),
          m.sumUnits.toLocaleString(),
          m.weight.toFixed(3),
          `Rs. ${avg.toLocaleString('en-IN')}`,
          `Rs. ${Math.round(val).toLocaleString('en-IN')}`
        ];
      });
      result.chartType = 'area';
    } 
    else if (activeSaudaReportKey === 'r2') {
      // 2. Broker Sales Commission Ledger
      const brokerMap: Record<string, { broker: string; count: number; weight: number; sumRate: number; rateCount: number; sumUnits: number }> = {};
      saudaFilteredByPeriod.forEach(s => {
        const name = s.broker ? s.broker.trim().toUpperCase() : 'DIRECT';
        if (!brokerMap[name]) {
          brokerMap[name] = { broker: name, count: 0, weight: 0, sumRate: 0, rateCount: 0, sumUnits: 0 };
        }
        brokerMap[name].count++;
        brokerMap[name].weight += Number(s.total_wt_in_ton) || 0;
        brokerMap[name].sumUnits += Number(s.total_unit) || 0;
        if (s.b_rate) {
          brokerMap[name].sumRate += Number(s.b_rate);
          brokerMap[name].rateCount++;
        }
      });

      result.headers = ['BROKER NAME', 'SALES CLOSED', 'TOTAL TONNES (MT)', 'TOTAL PACKETS', 'AVG VALUE PRICE', 'EST COMMISSIONS (INR)'];
      result.chartData = Object.values(brokerMap).map(b => ({
        name: b.broker,
        weight: parseFloat(b.weight.toFixed(3)),
        value: parseFloat(b.weight.toFixed(3))
      })).sort((a,b) => b.value - a.value).slice(0, 8);

      result.rows = Object.values(brokerMap).map(b => {
        const avg = b.rateCount > 0 ? Math.round(b.sumRate / b.rateCount) : 18500;
        const commissionsEst = b.weight * 120;
        return [
          b.broker,
          b.count.toString(),
          b.weight.toFixed(3),
          b.sumUnits.toLocaleString(),
          `Rs. ${avg.toLocaleString('en-IN')}`,
          `Rs. ${Math.round(commissionsEst).toLocaleString('en-IN')}`
        ];
      });
      result.chartType = 'bar';
    }
    else if (activeSaudaReportKey === 'r3') {
      // 3. Supplier Sales Allocation Ledger
      const supMap: Record<string, { supplier: string; count: number; weight: number; sumUnits: number; sumRate: number; rateCount: number }> = {};
      saudaFilteredByPeriod.forEach(s => {
        const name = s.supplier ? s.supplier.trim().toUpperCase() : 'DIRECT';
        if (!supMap[name]) {
          supMap[name] = { supplier: name, count: 0, weight: 0, sumUnits: 0, sumRate: 0, rateCount: 0 };
        }
        supMap[name].count++;
        supMap[name].weight += Number(s.total_wt_in_ton) || 0;
        supMap[name].sumUnits += Number(s.total_unit) || 0;
        if (s.b_rate) {
          supMap[name].sumRate += Number(s.b_rate);
          supMap[name].rateCount++;
        }
      });

      result.headers = ['BUYER / PARTY NAME', 'SAUDAS COMPLETED', 'TOTAL DISPATCH WT (MT)', 'TOTAL PACKETS', 'AVG SELLING PRICE', 'EST COVENANT REVENUE (INR)'];
      result.chartData = Object.values(supMap).map(su => ({
        name: su.supplier,
        weight: parseFloat(su.weight.toFixed(3)),
        value: parseFloat(su.weight.toFixed(3))
      })).sort((a,b) => b.value - a.value).slice(0, 8);

      result.rows = Object.values(supMap).map(su => {
        const avg = su.rateCount > 0 ? Math.round(su.sumRate / su.rateCount) : 18500;
        const rev = su.weight * avg;
        return [
          su.supplier,
          su.count.toString(),
          su.weight.toFixed(3),
          su.sumUnits.toLocaleString(),
          `Rs. ${avg.toLocaleString('en-IN')}`,
          `Rs. ${Math.round(rev).toLocaleString('en-IN')}`
        ];
      });
      result.chartType = 'bar';
    }
    else if (activeSaudaReportKey === 'r4') {
      // 4. Packaging Unit Distribution Audit
      const unitMap: Record<string, { type: string; count: number; units: number; weight: number }> = {};
      saudaFilteredByPeriod.forEach(s => {
        const type = s.units_per_lorry_type ? s.units_per_lorry_type.trim().toUpperCase() : (s.unit_type ? s.unit_type.trim().toUpperCase() : 'BALES');
        if (!unitMap[type]) {
          unitMap[type] = { type, count: 0, units: 0, weight: 0 };
        }
        unitMap[type].count++;
        unitMap[type].units += Number(s.total_unit) || 0;
        unitMap[type].weight += Number(s.total_wt_in_ton) || 0;
      });

      const totalWtSum = Object.values(unitMap).reduce((acc, curr) => acc + curr.weight, 0);

      result.headers = ['PACKAGING SPEC', 'SAUDA CONTRACTS', 'TOTAL UNITS DISPATCHED', 'TOTAL WEIGHT (MT)', 'EXPORT EXPOSURE ratio (%)'];
      result.chartData = Object.values(unitMap).map(u => ({
        name: u.type,
        weight: parseFloat(u.weight.toFixed(3)),
        value: parseFloat(u.weight.toFixed(2)),
        percentage: totalWtSum > 0 ? parseFloat(((u.weight / totalWtSum) * 100).toFixed(1)) : 0
      })).sort((a,b) => b.value - a.value);

      result.rows = Object.values(unitMap).map(u => {
        const ratio = totalWtSum > 0 ? ((u.weight / totalWtSum) * 100).toFixed(1) : '0';
        return [
          u.type,
          u.count.toString(),
          u.units.toLocaleString(),
          u.weight.toFixed(3) + ' MT',
          `${ratio}%`
        ];
      });
      result.chartType = 'half_circle';
    }
    else if (activeSaudaReportKey === 'r5') {
      // 5. Brand Quality Specific Sales Pricing
      const qualMap: Record<string, { name: string; marka: string; lines: number; qqty: number; sumRs: number; rCount: number; sumWt: number }> = {};
      filteredSaudaDetails.forEach(d => {
        const name = d.quality ? d.quality.toString().toUpperCase().trim() : 'STANDARD';
        if (!qualMap[name]) {
          qualMap[name] = { name, marka: d.marka || 'STANDARD', lines: 0, qqty: 0, sumRs: 0, rCount: 0, sumWt: 0 };
        }
        qualMap[name].lines++;
        qualMap[name].qqty += Number(d.qty) || 0;
        qualMap[name].sumWt += Number(d.weight_mt) || (Number(d.qty) * 0.180);
        if (d.rs) {
          qualMap[name].sumRs += Number(d.rs);
          qualMap[name].rCount++;
        }
      });

      const totalWtSum = Object.values(qualMap).reduce((acc, curr) => acc + curr.sumWt, 0);

      result.headers = ['JUTE OUTGOING QUALITY', 'MARKA BRAND STAMP', 'TRANSACTION RECORDS', 'PCS COMMITTED', 'TOTAL WEIGHT (MT)', 'AVG SELLING PRICE (INR)'];
      result.chartData = Object.values(qualMap).map(q => ({
        name: q.name,
        weight: parseFloat(q.sumWt.toFixed(3)),
        value: parseFloat(q.sumWt.toFixed(3)),
        percentage: totalWtSum > 0 ? parseFloat(((q.sumWt / totalWtSum) * 100).toFixed(1)) : 0
      })).sort((a,b) => b.value - a.value);

      result.rows = Object.values(qualMap).map(q => {
        const avg = q.rCount > 0 ? Math.round(q.sumRs / q.rCount) : 18500;
        return [
          q.name,
          q.marka,
          q.lines.toString(),
          q.qqty.toLocaleString(),
          q.sumWt.toFixed(3),
          `Rs. ${avg.toLocaleString('en-IN')}`
        ];
      });
      result.chartType = 'pie';
    }
    else if (activeSaudaReportKey === 'r6') {
      // 6. Shipment & Delivery Timelines Audit
      result.headers = ['SAUDA #', 'BROKER NAME', 'BUYING ENTITY', 'TARGET DISPATCH DATE', 'OPERATIONAL WINDOW DAYS', 'DAILY PENALTY / DELAY', 'TIMELINE RISK RATING'];
      result.rows = saudaFilteredByPeriod.map((s: any) => {
        const penalty = s.shipment_penalty || 50;
        const days = s.shipment_days || 15;
        let riskText = 'Standard SLA';
        if (days < 10) riskText = 'Risk Schedule 🔵';
        if (Number(s.quantity_claim) > 0) riskText = 'Settlement Claim Risk 🔴';
        return [
          s.sauda_no,
          s.broker || 'DIRECT',
          s.supplier || 'DIRECT',
          s.shipment_date ? new Date(s.shipment_date).toLocaleDateString('en-GB') : 'N/A',
          `${days} Days`,
          `Rs. ${penalty}/Day`,
          riskText
        ];
      });

      result.chartData = saudaFilteredByPeriod.map((s: any) => ({
        name: s.sauda_no,
        value: Number(s.shipment_days) || 15,
        weight: Number(s.total_wt_in_ton) || 0
      })).slice(0, 10);
      result.chartType = 'bar';
    }
    else if (activeSaudaReportKey === 'r7') {
      // 7. Growing Area Performance Summary
      const areaMap: Record<string, { area: string; count: number; weight: number; sumRate: number; rCount: number; leadAlly: string }> = {};
      saudaFilteredByPeriod.forEach(s => {
        const area = s.area ? s.area.trim().toUpperCase() : 'MAIN ZONE';
        if (!areaMap[area]) {
          areaMap[area] = { area, count: 0, weight: 0, sumRate: 0, rCount: 0, leadAlly: s.broker || 'DIRECT' };
        }
        areaMap[area].count++;
        areaMap[area].weight += Number(s.total_wt_in_ton) || 0;
        if (s.b_rate) {
          areaMap[area].sumRate += Number(s.b_rate);
          areaMap[area].rCount++;
        }
      });

      result.headers = ['JUTE OUTWARD AREA', 'SAUDAS MAPPED', 'SOUCED OUTPUT MAS (MT)', 'WEIGHED AVERAGE B_RATE', 'LEADING PERFORMANCE PARTNER'];
      result.chartData = Object.values(areaMap).map(a => ({
        name: a.area,
        weight: parseFloat(a.weight.toFixed(3)),
        value: parseFloat(a.weight.toFixed(3))
      })).sort((a,b) => b.value - a.value);

      result.rows = Object.values(areaMap).map(a => {
        const avg = a.rCount > 0 ? Math.round(a.sumRate / a.rCount) : 18500;
        return [
          a.area,
          a.count.toString(),
          a.weight.toFixed(3),
          `Rs. ${avg.toLocaleString('en-IN')}`,
          a.leadAlly
        ];
      });
      result.chartType = 'hbar';
    }
    else if (activeSaudaReportKey === 'r8') {
      // 8. Claims & Penalties Audit Log
      result.headers = ['SAUDA #', 'BUYING PARTY', 'MARKS DISCREPANCY CLAIMS', 'QTY DEFICIT CLAIMS', 'MAX COMITTED SHIPMENT DAYS', 'EST DELAY PENALTY (INR)', 'NET DEBIT ADJUSTMENT (INR)'];
      result.rows = saudaFilteredByPeriod.map((s: any) => {
        const mClaim = Number(s.marks_claim) || 0;
        const qClaim = Number(s.quantity_claim) || 0;
        const penalty = (Number(s.shipment_penalty) || 50) * 2.5;
        const grandDebit = mClaim + qClaim + penalty;
        return [
          s.sauda_no,
          s.supplier || 'DIRECT',
          `Rs. ${mClaim.toLocaleString('en-IN')}`,
          `Rs. ${qClaim.toLocaleString('en-IN')}`,
          `${s.shipment_days || 0} Days`,
          `Rs. ${penalty.toLocaleString('en-IN')}`,
          `Rs. ${Math.round(grandDebit).toLocaleString('en-IN')}`
        ];
      });

      result.chartData = saudaFilteredByPeriod.map((s: any) => ({
        name: s.sauda_no,
        mClaim: Number(s.marks_claim) || 0,
        qClaim: Number(s.quantity_claim) || 0
      })).slice(0, 10);
      result.chartType = 'line';
    }
    else if (activeSaudaReportKey === 'r9') {
      // 9. Agency-wide Sales Allocation
      const agMap: Record<string, { name: string; count: number; weight: number; sumRate: number; rCount: number }> = {};
      saudaFilteredByPeriod.forEach(s => {
        const ag = s.agency ? s.agency.trim().toUpperCase() : 'HEAD STATIONS';
        if (!agMap[ag]) {
          agMap[ag] = { name: ag, count: 0, weight: 0, sumRate: 0, rCount: 0 };
        }
        agMap[ag].count++;
        agMap[ag].weight += Number(s.total_wt_in_ton) || 0;
        if (s.b_rate) {
          agMap[ag].sumRate += Number(s.b_rate);
          agMap[ag].rCount++;
        }
      });

      const totalWtSum = Object.values(agMap).reduce((acc, curr) => acc + curr.weight, 0);

      result.headers = ['AGENCY DISPATCH STATION', 'CONTRACT DEALS', 'TOTAL WEIGHED MASS (MT)', 'AVG PRICE RATE', 'VOLUME SHARE ratio (%)'];
      result.chartData = Object.values(agMap).map(a => ({
        name: a.name,
        weight: parseFloat(a.weight.toFixed(3)),
        value: parseFloat(a.weight.toFixed(3)),
        percentage: totalWtSum > 0 ? parseFloat(((a.weight / totalWtSum) * 100).toFixed(1)) : 0
      })).sort((a,b) => b.value - a.value);

      result.rows = Object.values(agMap).map(a => {
        const avg = a.rCount > 0 ? Math.round(a.sumRate / a.rCount) : 18500;
        const share = totalWtSum > 0 ? ((a.weight / totalWtSum) * 100).toFixed(1) : '0';
        return [
          a.name,
          a.count.toString(),
          a.weight.toFixed(3),
          `Rs. ${avg.toLocaleString('en-IN')}`,
          `${share}%`
        ];
      });
      result.chartType = 'pie';
    }
    else if (activeSaudaReportKey === 'r10') {
      // 10. Lorries Dispatch & Payload Logs
      result.headers = ['SAUDA #', 'BROKER CODE', 'LORRIES DISPATCHED', 'PACKETS / VEHICLE', 'NET CARRIER SPEC WT', 'TOTAL payload LOAD (MT)'];
      result.rows = saudaFilteredByPeriod.map((s: any) => {
        const load = (Number(s.no_of_lorries) || 0) * (Number(s.wt_per_lorry) || 0);
        return [
          s.sauda_no,
          s.broker || 'DIRECT DISPATCH',
          (s.no_of_lorries || 0).toString(),
          (s.total_unit || 0).toString(),
          (s.wt_per_lorry || 0).toString() + ' MT',
          load.toFixed(3) + ' MT'
        ];
      });

      result.chartData = saudaFilteredByPeriod.map((s: any) => ({
        name: s.sauda_no,
        lorries: Number(s.no_of_lorries) || 0,
        payload: Number(s.wt_per_lorry) || 0,
        value: Number(s.no_of_lorries) || 0
      })).slice(0, 10);
      result.chartType = 'composed';
    }

    result.totalCount = saudaFilteredByPeriod.length;
    result.totalMT = parseFloat(saudaFilteredByPeriod.reduce((sum, s) => sum + (Number(s.total_wt_in_ton) || 0), 0).toFixed(3));

    return result;
  }, [saudaFilteredByPeriod, filteredSaudaDetails, activeSaudaReportKey]);

  // Export Sauda CSV Handler
  const handleExportSaudaCSV = () => {
    const reportNameObj = SAUDA_REPORTS.find(r => r.key === activeSaudaReportKey);
    const reportName = reportNameObj ? reportNameObj.name.substring(3).trim().replace(/\s+/g, '_') : 'Sauda_Dispatches_Audit';
    const month = saudaReportMonth === 'ALL' ? 'AllMonths' : MONTH_LABELS.find(m => m.value === saudaReportMonth)?.label;
    const year = saudaReportYear === 'ALL' ? 'AllYears' : saudaReportYear;
    
    const filename = `Sauda_Report_${reportName}_${month}_${year}.csv`;
    
    // Generate CSV content
    const headersStr = saudaReportOutput.headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',');
    const rowsStr = saudaReportOutput.rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','));
    const csvContent = [headersStr, ...rowsStr].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const chartColors = [
    '#D94B5A',
    '#0f766e',
    '#15803d',
    '#059669',
    '#16a34a',
    '#0d9488',
    '#065f46',
    '#166534'
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        {/* LEFT FILTER PANEL */}
        <div className="xl:col-span-1 bg-white border border-emerald-100 rounded-xl p-4 shadow-sm">
          <div className="space-y-3">
            <div>
              <h4 className="text-[10px] font-black uppercase text-emerald-950 tracking-wider">
                Reports Preset Deck
              </h4>
              <p className="text-[8px] text-slate-400 italic">
                Select from available report formats
              </p>
            </div>

            {/* SEARCH */}
            <div className="space-y-1">
              <label
                htmlFor="keyword_search_filter_2017"
                className="text-[8px] font-black text-slate-700 uppercase tracking-tight"
              >
                Keyword Search Filter
              </label>

              <div className="relative">
                <input
                  id="keyword_search_filter_2017"
                  name="keyword_search_filter"
                  aria-label="Keyword Search Filter"
                  type="text"
                  value={saudaReportSearch}
                  onChange={(e) => setSaudaReportSearch(e.target.value)}
                  placeholder="Search Broker, Supplier, Area..."
                  className="w-full text-[10px] pl-7 pr-2 py-2 bg-slate-50 border border-emerald-100 rounded-lg focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none text-slate-900"
                />
                <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-emerald-600" />
              </div>
            </div>

            {/* MONTH YEAR */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label
                  htmlFor="target_month_2032"
                  className="text-[8px] font-black text-slate-700 uppercase"
                >
                  Target Month
                </label>

                <select
                  id="target_month_2032"
                  name="target_month"
                  aria-label="Target Month"
                  value={saudaReportMonth}
                  onChange={(e) => setSaudaReportMonth(e.target.value)}
                  className="w-full text-[10px] py-2 px-2 bg-slate-50 border border-emerald-100 rounded-lg focus:border-emerald-500 focus:outline-none text-slate-900 font-bold"
                >
                  {MONTH_LABELS.map(m => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="financial_year_2044"
                  className="text-[8px] font-black text-slate-700 uppercase"
                >
                  Financial Year
                </label>

                <select
                  id="financial_year_2044"
                  name="financial_year"
                  aria-label="Financial Year"
                  value={saudaReportYear}
                  onChange={(e) => setSaudaReportYear(e.target.value)}
                  className="w-full text-[10px] py-2 px-2 bg-slate-50 border border-emerald-100 rounded-lg focus:border-emerald-500 focus:outline-none text-slate-900 font-bold"
                >
                  <option value="ALL">-- ALL YEARS --</option>
                  {saudaYears.map(yr => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* REPORT LIST */}
            <div className="border border-emerald-100 rounded-xl overflow-hidden max-h-[320px] overflow-y-auto">
              {SAUDA_REPORTS.map((r) => {
                const isActive = activeSaudaReportKey === r.key;
                return (
                  <button
                    key={r.key}
                    onClick={() => setActiveSaudaReportKey(r.key)}
                    className={cn(
                      "w-full text-left p-3 transition-all border-b last:border-b-0",
                      isActive
                        ? "bg-emerald-700 text-white border-emerald-800"
                        : "bg-white hover:bg-emerald-50 border-emerald-50"
                    )}
                  >
                    <span
                      className={cn(
                        "text-[9.5px] font-black uppercase block leading-tight",
                        isActive ? "text-white" : "text-slate-800"
                      )}
                    >
                      {r.name}
                    </span>
                    <span
                      className={cn(
                        "text-[7.5px] block truncate leading-tight mt-1",
                        isActive ? "text-emerald-100" : "text-slate-400"
                      )}
                      title={r.description}
                    >
                      {r.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[8px] text-slate-500 leading-normal font-mono mt-3">
            * Calculated indexes are generated dynamically from live MIS data.
          </div>
        </div>

        {/* RIGHT AREA */}
        <div className="xl:col-span-3 space-y-4">
          {/* REPORT HEADER */}
          <div className="bg-white border border-emerald-100 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="space-y-1">
              <h3 className="text-xs font-black text-emerald-950 uppercase tracking-widest flex items-center gap-2">
                <span>
                  {SAUDA_REPORTS.find(r => r.key === activeSaudaReportKey)?.name}
                </span>
                <span className="bg-emerald-100 text-emerald-800 text-[7px] font-black px-2 py-1 rounded-full uppercase">
                  Dynamic Query
                </span>
              </h3>
              <p className="text-[9px] text-slate-500 max-w-xl leading-normal">
                {SAUDA_REPORTS.find(r => r.key === activeSaudaReportKey)?.description}
              </p>
            </div>

            <button
              onClick={handleExportSaudaCSV}
              className="bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-800 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md transition-all"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </div>

          {/* KPI BELT */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-emerald-100 rounded-xl p-3 text-center shadow-sm">
              <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block">
                ACTIVE DEALS
              </span>
              <span className="text-sm font-black text-emerald-900 block mt-1">
                {saudaReportOutput.totalCount} completed
              </span>
            </div>

            <div className="bg-white border border-blue-100 rounded-xl p-3 text-center shadow-sm">
              <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block">
                MASS DISPATCHED
              </span>
              <span className="text-sm font-black text-blue-900 block mt-1">
                {saudaReportOutput.totalMT.toLocaleString()} MT
              </span>
            </div>

            <div className="bg-white border border-amber-100 rounded-xl p-3 text-center shadow-sm">
              <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block">
                REPORT MONTH
              </span>
              <span className="text-sm font-black text-amber-900 block mt-1 uppercase font-mono">
                {saudaReportMonth === 'ALL'
                  ? 'ALL MONTHS'
                  : MONTH_LABELS.find(m => m.value === saudaReportMonth)?.label.substring(0, 3)}
              </span>
            </div>

            <div className="bg-white border border-teal-100 rounded-xl p-3 text-center shadow-sm">
              <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block">
                REPORT YEAR
              </span>
              <span className="text-sm font-black text-teal-900 block mt-1 uppercase font-mono">
                {saudaReportYear === 'ALL' ? 'ALL YEARS' : saudaReportYear}
              </span>
            </div>
          </div>

          {/* GRAPH */}
          <div className="bg-white border border-emerald-100 rounded-xl p-4 shadow-sm">
            <div className="mb-2">
              <h4 className="text-[9px] font-black uppercase text-emerald-950 tracking-wider">
                Dynamic Graphical Distribution
              </h4>
              <p className="text-[7.5px] text-slate-400 italic">
                Visual correlation based on structured database segments
              </p>
            </div>

            <div className="h-52 font-mono text-[8px]">
              {saudaReportOutput.chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                  No analytical dimensions to map with current filters
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
                  {saudaReportOutput.chartType === 'area' ? (
                    <AreaChart
                      data={saudaReportOutput.chartData}
                      margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                    >
                      <defs>
                        <linearGradient id="saudaPrGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#D94B5A" stopOpacity={0.75} />
                          <stop offset="95%" stopColor="#D94B5A" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#d1fae5" />
                      <XAxis dataKey="name" tick={{ fontSize: 7.5 }} />
                      <YAxis tick={{ fontSize: 7.5 }} />
                      <RechartsTooltip />
                      <Area
                        type="monotone"
                        dataKey="weight"
                        stroke="#D94B5A"
                        fillOpacity={1}
                        fill="url(#saudaPrGrad)"
                        name="Dispatched Mass (MT)"
                      />
                    </AreaChart>
                  ) : saudaReportOutput.chartType === 'line' ? (
                    <LineChart
                      data={saudaReportOutput.chartData}
                      margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#d1fae5" />
                      <XAxis dataKey="name" tick={{ fontSize: 7.5 }} />
                      <YAxis tick={{ fontSize: 7.5 }} />
                      <RechartsTooltip />
                      <Legend wrapperStyle={{ fontSize: 7.5 }} />
                      <Line
                        type="monotone"
                        dataKey="mClaim"
                        stroke="#ea580c"
                        strokeWidth={2}
                        name="Quality Marks Claims (INR)"
                      />
                      <Line
                        type="monotone"
                        dataKey="qClaim"
                        stroke="#2563eb"
                        strokeWidth={2}
                        name="Packaging Deficit Claims (INR)"
                      />
                    </LineChart>
                  ) : saudaReportOutput.chartType === 'pie' || saudaReportOutput.chartType === 'half_circle' ? (
                    <PieChart>
                      <Pie
                        data={saudaReportOutput.chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={saudaReportOutput.chartType === 'half_circle' ? 35 : 0}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }: any) =>
                          `${name} (${((percent || 0) * 100).toFixed(0)}%)`
                        }
                      >
                        {saudaReportOutput.chartData.map((_entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={chartColors[index % chartColors.length]}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  ) : saudaReportOutput.chartType === 'composed' ? (
                    <ComposedChart
                      data={saudaReportOutput.chartData}
                      margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                    >
                      <CartesianGrid stroke="#d1fae5" />
                      <XAxis dataKey="name" tick={{ fontSize: 7.5 }} />
                      <YAxis tick={{ fontSize: 7.5 }} />
                      <RechartsTooltip />
                      <Legend wrapperStyle={{ fontSize: 7.5 }} />
                      <Bar
                        dataKey="lorries"
                        name="Lorry Dispatches (Trips)"
                        fill="#D94B5A"
                        barSize={20}
                      />
                      <Line
                        type="monotone"
                        dataKey="payload"
                        name="Payload Capacity Specs (MT)"
                        stroke="#0f766e"
                        strokeWidth={2.5}
                      />
                    </ComposedChart>
                  ) : saudaReportOutput.chartType === 'hbar' ? (
                    <BarChart
                      data={saudaReportOutput.chartData}
                      layout="vertical"
                      margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#d1fae5" />
                      <XAxis type="number" tick={{ fontSize: 7.5 }} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        tick={{ fontSize: 7.5 }}
                        width={80}
                      />
                      <RechartsTooltip />
                      <Bar
                        dataKey="weight"
                        name="Weighed Tons (MT)"
                        fill="#0f766e"
                        radius={[0, 5, 5, 0]}
                      />
                    </BarChart>
                  ) : (
                    <BarChart
                      data={saudaReportOutput.chartData}
                      margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#d1fae5" />
                      <XAxis dataKey="name" tick={{ fontSize: 7.5 }} />
                      <YAxis tick={{ fontSize: 7.5 }} />
                      <RechartsTooltip />
                      <Bar
                        dataKey="weight"
                        name="Outward Volume (MT)"
                        fill="#D94B5A"
                        radius={[5, 5, 0, 0]}
                      >
                        {saudaReportOutput.chartData.map((_entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={chartColors[index % chartColors.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  )}
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* LEDGER TABLE */}
          <div className="bg-white border border-emerald-100 rounded-xl p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <div>
                <h4 className="text-[9px] font-black uppercase text-emerald-950 tracking-wider">
                  Consolidated Outbound Ledger
                </h4>
                <p className="text-[7.5px] text-slate-400 italic">
                  Audit values and generated records satisfying filter parameters
                </p>
              </div>

              <span className="text-[8px] text-emerald-700 font-mono font-bold bg-emerald-50 px-2 py-1 rounded-lg">
                Mapped: {saudaReportOutput.rows.length} records
              </span>
            </div>

            <div className="border border-emerald-100 rounded-xl overflow-x-auto overflow-y-auto max-h-[420px]">
              <table
                className="w-full min-w-max text-left font-mono text-[9px] border-collapse"
                id="sauda-advanced-ledger"
              >
                <thead className="sticky top-0 z-10">
                  <tr className="bg-emerald-800 text-white border-b border-emerald-900">
                    {saudaReportOutput.headers.map((h, i) => (
                      <th
                        key={i}
                        className="p-2.5 font-black uppercase text-[8px] border-r border-emerald-700 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {saudaReportOutput.rows.map((row, rindex) => (
                    <tr
                      key={rindex}
                      className="hover:bg-emerald-50 odd:bg-slate-50/40 transition-colors"
                    >
                      {row.map((cell, cindex) => (
                        <td
                          key={cindex}
                          className={cn(
                            "p-2 border-r border-slate-100 font-mono tracking-tight text-slate-800 whitespace-nowrap",
                            cindex === 0 ? "font-bold text-emerald-900 text-[9.5px]" : ""
                          )}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}

                  {saudaReportOutput.rows.length === 0 && (
                    <tr className="h-24">
                      <td
                        colSpan={saudaReportOutput.headers.length || 6}
                        className="text-center font-bold text-slate-400 italic"
                      >
                        No active transactional database logs satisfying filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
