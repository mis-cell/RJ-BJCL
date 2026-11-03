import React, { useState, useEffect } from 'react';
import { dbModule } from '../../services/dbModule';
import { calculateWeightTolerance, calculateExcessPenalty } from '../../lib/weightTolerance';
import { PurchaseMaster, GroupedSupplier, ReportOutput, MONTH_LABELS, PO_REPORTS } from './types';

export function usePurchaseOrderSummaryData(refreshTrigger?: number) {
  const [loading, setLoading] = useState(false);
  const [originalData, setOriginalData] = useState<PurchaseMaster[]>([]);
  const [poDetails, setPoDetails] = useState<any[]>([]);
  const [agencyList, setAgencyList] = useState<any[]>([]);
  const [gradeList, setGradeList] = useState<any[]>([]);
  const [sattaBaseRates, setSattaBaseRates] = useState<any[]>([]);
  const [tempArrivals, setTempArrivals] = useState<any[]>([]);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  // Layout View Mode
  const [viewMode, setViewMode] = useState<'dashboard' | 'advanced_reports'>('dashboard');

  // Standard Dashboard Filter States
  const [financialYearFilter, setFinancialYearFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);

  // Advanced Report Engine Filter States
  const [activePoReportKey, setActivePoReportKey] = useState<string>('r1');
  const [poReportMonth, setPoReportMonth] = useState<string>('ALL');
  const [poReportYear, setPoReportYear] = useState<string>('ALL');
  const [poReportSearch, setPoReportSearch] = useState<string>('');

  // Refined filters
  const [poReportStartDate, setPoReportStartDate] = useState<string>('');
  const [poReportEndDate, setPoReportEndDate] = useState<string>('');
  const [poReportSupplier, setPoReportSupplier] = useState<string>('ALL');

  // Print selected
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [selectedMonthsForPrint, setSelectedMonthsForPrint] = useState<string[]>([]);
  const [r1ChartMetric, setR1ChartMetric] = useState<'combo' | 'weight' | 'capital' | 'count'>('combo');

  const fetchPurchaseOrders = async () => {
    setLoading(true);
    try {
      const [data, detailsData, agData, gData, sbData, taData] = await Promise.all([
        dbModule.fetchAll('purchase_master', 'po_date', false),
        dbModule.fetchAll('purchase_detail_master'),
        dbModule.fetchAll('agency_master'),
        dbModule.fetchAll('grade_master'),
        dbModule.fetchAll('satta_base_rates'),
        dbModule.fetchAll('temporary_material_received', 'date', false)
      ]);
      setOriginalData(data as PurchaseMaster[]);
      setPoDetails(detailsData || []);
      setAgencyList(agData || []);
      setGradeList(gData || []);
      setSattaBaseRates(sbData || []);
      setTempArrivals(taData || []);
    } catch (err) {
      console.error("Failed to load PO summary info:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchaseOrders();
  }, [refreshTrigger]);

  // Standard Filters
  const filteredData = React.useMemo(() => {
    return originalData.filter(po => {
      if (financialYearFilter !== 'ALL' && po.financial_year !== financialYearFilter) {
        return false;
      }
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchSupplier = po.supplier?.toLowerCase().includes(query) || false;
        const matchBroker = po.broker?.toLowerCase().includes(query) || false;
        const matchPoNo = po.po_no?.toLowerCase().includes(query) || false;
        if (!matchSupplier && !matchBroker && !matchPoNo) return false;
      }
      return true;
    });
  }, [originalData, financialYearFilter, searchQuery]);

  // Calculate Grouped data for the Bar Chart
  const groupedChartData: GroupedSupplier[] = React.useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    
    filteredData.forEach(po => {
      const name = po.supplier ? po.supplier.trim() : 'DIRECT';
      const weight = Number(po.total_contract_mt) || 0;
      if (!map[name]) {
        map[name] = { total: 0, count: 0 };
      }
      map[name].total += weight;
      map[name].count += 1;
    });

    return Object.entries(map).map(([supplier, info]) => ({
      supplier,
      total_contract_mt: parseFloat(info.total.toFixed(3)),
      orderCount: info.count
    })).sort((a, b) => b.total_contract_mt - a.total_contract_mt);
  }, [filteredData]);

  // General Dashboard KPI stats
  const stats = React.useMemo(() => {
    let totalWeight = 0;
    let pendingCount = 0;
    let maxWeight = 0;
    let maxSupplier = 'N/A';
    
    filteredData.forEach(po => {
      const w = Number(po.total_contract_mt) || 0;
      totalWeight += w;
      if (po.pending !== false) {
        pendingCount += 1;
      }
      if (w > maxWeight) {
        maxWeight = w;
        maxSupplier = po.supplier || 'DIRECT';
      }
    });

    return {
      totalWeight: parseFloat(totalWeight.toFixed(3)),
      totalCount: filteredData.length,
      pendingCount,
      averageWeight: filteredData.length > 0 ? parseFloat((totalWeight / filteredData.length).toFixed(3)) : 0,
      maxWeight,
      maxSupplier
    };
  }, [filteredData]);

  // List of all years found in DB for filters
  const financialYears = React.useMemo(() => {
    const years = new Set<string>();
    originalData.forEach(po => {
      if (po.financial_year) years.add(po.financial_year);
      if (po.po_date) {
        const calYr = new Date(po.po_date).getFullYear().toString();
        years.add(calYr);
      }
    });
    return Array.from(years).sort();
  }, [originalData]);

  const handleBarClick = (barData: GroupedSupplier) => {
    if (selectedSupplier === barData.supplier) {
      setSelectedSupplier(null);
    } else {
      setSelectedSupplier(barData.supplier);
    }
  };

  const displayedDetails = React.useMemo(() => {
    if (!selectedSupplier) return filteredData;
    return filteredData.filter(po => (po.supplier ? po.supplier.trim() : 'DIRECT') === selectedSupplier);
  }, [filteredData, selectedSupplier]);

  // Filter core PO master lists for Advanced Reports
  const poFilteredByPeriod = React.useMemo(() => {
    return originalData.filter(po => {
      if (!po.po_date) return false;
      const d = new Date(po.po_date);
      const m = d.getMonth() + 1;
      const yr = d.getFullYear();
      
      if (poReportMonth !== 'ALL' && m.toString() !== poReportMonth) {
        return false;
      }
      
      if (poReportYear !== 'ALL') {
        if (po.financial_year !== poReportYear && yr.toString() !== poReportYear) {
          return false;
        }
      }

      if (poReportStartDate) {
        const poDateStr = po.po_date.substring(0, 10);
        if (poDateStr < poReportStartDate) return false;
      }
      if (poReportEndDate) {
        const poDateStr = po.po_date.substring(0, 10);
        if (poDateStr > poReportEndDate) return false;
      }
      
      if (poReportSupplier !== 'ALL') {
        if ((po.supplier || 'DIRECT').trim().toUpperCase() !== poReportSupplier.toUpperCase()) {
          return false;
        }
      }
      
      if (poReportSearch.trim()) {
        const trm = poReportSearch.toLowerCase();
        const matches = 
          (po.po_no || '').toLowerCase().includes(trm) ||
          (po.supplier || '').toLowerCase().includes(trm) ||
          (po.broker || '').toLowerCase().includes(trm) ||
          (po.po_type || '').toLowerCase().includes(trm) ||
          (po.area || '').toLowerCase().includes(trm);
        if (!matches) return false;
      }
      
      return true;
    });
  }, [originalData, poReportMonth, poReportYear, poReportSearch, poReportStartDate, poReportEndDate, poReportSupplier]);

  const filteredPoDetails = React.useMemo(() => {
    const poNos = new Set(poFilteredByPeriod.map(p => p.po_no));
    return poDetails.filter(d => poNos.has(d.po_no));
  }, [poDetails, poFilteredByPeriod]);

  // Build specialized dataset logic for all 11 reports
  const reportOutput = React.useMemo((): ReportOutput => {
    const result: ReportOutput = {
      headers: [],
      rows: [],
      chartData: [],
      chartType: 'bar',
      totalMT: 0,
      totalCount: 0
    };

    if (activePoReportKey === 'r1') {
      const monthMap: Record<string, { monthYear: string; count: number; weight: number; sumRate: number; rateCount: number }> = {};
      poFilteredByPeriod.forEach(po => {
        if (!po.po_date) return;
        const d = new Date(po.po_date);
        const mLabel = d.toLocaleString('default', { month: 'short' });
        const yr = d.getFullYear();
        const key = `${mLabel} ${yr}`;
        if (!monthMap[key]) {
          monthMap[key] = { monthYear: key, count: 0, weight: 0, sumRate: 0, rateCount: 0 };
        }
        monthMap[key].count++;
        monthMap[key].weight += Number(po.total_contract_mt) || 0;
        if (po.b_rate) {
          monthMap[key].sumRate += Number(po.b_rate);
          monthMap[key].rateCount++;
        }
      });

      const sortedMonths = Object.values(monthMap).sort((a, b) => {
        const monthsOrder = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
        const [m1, y1] = a.monthYear.toLowerCase().split(/\s+/);
        const [m2, y2] = b.monthYear.toLowerCase().split(/\s+/);
        const year1 = parseInt(y1) || 0;
        const year2 = parseInt(y2) || 0;
        const index1 = monthsOrder.indexOf(m1);
        const index2 = monthsOrder.indexOf(m2);
        
        if (year1 !== year2) return year1 - year2;
        return index1 - index2;
      });

      result.headers = ['MONTH / YEAR', 'PO COUNT', 'TOTAL WEIGHT (MT)', 'AVG REFERENCE PRICE (INR)', 'ESTIMATED CAPITAL (INR)'];
      
      result.chartData = sortedMonths.map(m => {
        const avg = m.rateCount > 0 ? Math.round(m.sumRate / m.rateCount) : 17100;
        const estValue = m.weight * avg;
        return {
          name: m.monthYear,
          weight: parseFloat(m.weight.toFixed(3)),
          value: parseFloat(m.weight.toFixed(3)),
          averageRate: avg,
          estimatedValue: parseFloat(estValue.toFixed(2)),
          count: m.count
        };
      });

      result.rows = sortedMonths.map(m => {
        const avg = m.rateCount > 0 ? Math.round(m.sumRate / m.rateCount) : 17100;
        const val = m.weight * avg;
        return [
          m.monthYear,
          m.count.toString(),
          m.weight.toFixed(3),
          `Rs. ${avg.toLocaleString('en-IN')}`,
          `Rs. ${Math.round(val).toLocaleString('en-IN')}`
        ];
      });
      result.chartType = 'area';
    } 
    else if (activePoReportKey === 'r2') {
      const supMap: Record<string, { supplier: string; count: number; weight: number; sumRate: number; rateCount: number; broker: string }> = {};
      poFilteredByPeriod.forEach(po => {
        const name = po.supplier ? po.supplier.trim().toUpperCase() : 'DIRECT';
        if (!supMap[name]) {
          supMap[name] = { supplier: name, count: 0, weight: 0, sumRate: 0, rateCount: 0, broker: po.broker || 'DIRECT' };
        }
        supMap[name].count++;
        supMap[name].weight += Number(po.total_contract_mt) || 0;
        if (po.b_rate) {
          supMap[name].sumRate += Number(po.b_rate);
          supMap[name].rateCount++;
        }
      });

      const totalWeightSum = Object.values(supMap).reduce((acc, curr) => acc + curr.weight, 0);

      result.headers = ['SELLING SUPPLIER', 'TOTAL PO CONTRACTS', 'TOTAL WEIGHT (MT)', 'AVG PRICE/QL (INR)', 'WEIGHT DOMINANCE %', 'PRIME BROKER'];
      result.chartData = Object.values(supMap).map(s => ({
        name: s.supplier,
        weight: parseFloat(s.weight.toFixed(3)),
        value: parseFloat(s.weight.toFixed(3))
      })).sort((a, b) => b.value - a.value);

      result.rows = Object.values(supMap).map(s => {
        const avg = s.rateCount > 0 ? Math.round(s.sumRate / s.rateCount) : 17100;
        const share = totalWeightSum > 0 ? ((s.weight / totalWeightSum) * 100).toFixed(1) : '0';
        return [
          s.supplier,
          s.count.toString(),
          s.weight.toFixed(3),
          `Rs. ${avg.toLocaleString('en-IN')}`,
          `${share}%`,
          s.broker
        ];
      });
      result.chartType = 'bar';
    }
    else if (activePoReportKey === 'r3') {
      const brokerMap: Record<string, { broker: string; count: number; weight: number; sumRate: number; rateCount: number }> = {};
      poFilteredByPeriod.forEach(po => {
        const name = po.broker ? po.broker.trim().toUpperCase() : 'DIRECT PARTY';
        if (!brokerMap[name]) {
          brokerMap[name] = { broker: name, count: 0, weight: 0, sumRate: 0, rateCount: 0 };
        }
        brokerMap[name].count++;
        brokerMap[name].weight += Number(po.total_contract_mt) || 0;
        if (po.b_rate) {
          brokerMap[name].sumRate += Number(po.b_rate);
          brokerMap[name].rateCount++;
        }
      });

      const totalWeightSum = Object.values(brokerMap).reduce((acc, curr) => acc + curr.weight, 0);

      result.headers = ['BROKER / SOURCING AGENT', 'BOOKED CONTRACTS', 'COMMITTED WEIGHT (MT)', 'AVG B-RATE/QL (INR)', 'MARKET ALLOCATION %'];
      result.chartData = Object.values(brokerMap).map(b => ({
        name: b.broker,
        weight: parseFloat(b.weight.toFixed(3)),
        value: parseFloat(b.weight.toFixed(3))
      })).sort((a, b) => b.value - a.value);

      result.rows = Object.values(brokerMap).map(b => {
        const avg = b.rateCount > 0 ? Math.round(b.sumRate / b.rateCount) : 17100;
        const share = totalWeightSum > 0 ? ((b.weight / totalWeightSum) * 100).toFixed(1) : '0';
        return [
          b.broker,
          b.count.toString(),
          b.weight.toFixed(3),
          `Rs. ${avg.toLocaleString('en-IN')}`,
          `${share}%`
        ];
      });
      result.chartType = 'half_circle';
    }
    else if (activePoReportKey === 'r4') {
      const areaMap: Record<string, { area: string; count: number; weight: number; sumRate: number; rateCount: number; leadSupplier: string }> = {};
      poFilteredByPeriod.forEach(po => {
        const name = po.area ? po.area.trim().toUpperCase() : 'DIRECT ZONE';
        if (!areaMap[name]) {
          areaMap[name] = { area: name, count: 0, weight: 0, sumRate: 0, rateCount: 0, leadSupplier: po.supplier || 'DIRECT' };
        }
        areaMap[name].count++;
        areaMap[name].weight += Number(po.total_contract_mt) || 0;
        if (po.b_rate) {
          areaMap[name].sumRate += Number(po.b_rate);
          areaMap[name].rateCount++;
        }
      });

      result.headers = ['SOURCING AREA REGION', 'CONTRACTS SOURCED', 'TOTAL TONNES (MT)', 'AVG B-RATE/QUINTAL (INR)', 'DOMINANT SUPPLIER'];
      result.chartData = Object.values(areaMap).map(a => ({
        name: a.area,
        weight: parseFloat(a.weight.toFixed(3)),
        value: parseFloat(a.weight.toFixed(3))
      })).sort((a, b) => b.value - a.value);

      result.rows = Object.values(areaMap).map(a => {
        const avg = a.rateCount > 0 ? Math.round(a.sumRate / a.rateCount) : 17100;
        return [
          a.area,
          a.count.toString(),
          a.weight.toFixed(3),
          `Rs. ${avg.toLocaleString('en-IN')}`,
          a.leadSupplier
        ];
      });
      result.chartType = 'hbar';
    }
    else if (activePoReportKey === 'r5') {
      const gradeMap: Record<string, { code: string; name: string; quantity: number; weight: number; sumRate: number; count: number }> = {};
      filteredPoDetails.forEach(d => {
        const code = d.grade_code ? d.grade_code.toString().toUpperCase().trim() : 'RAW';
        const itemWeight = Number(d.weight_mt) || Number(d.weight) || 0;
        const itemQty = Number(d.quantity) || 0;
        if (!gradeMap[code]) {
          const gObj = gradeList.find(g => g.grade_code === code);
          gradeMap[code] = { code, name: gObj ? gObj.grade_name : 'STANDARD', quantity: 0, weight: 0, sumRate: 0, count: 0 };
        }
        gradeMap[code].quantity += itemQty;
        gradeMap[code].weight += itemWeight;
        if (d.rate_qntl) {
          gradeMap[code].sumRate += Number(d.rate_qntl);
          gradeMap[code].count++;
        }
      });

      const totalWeightSum = Object.values(gradeMap).reduce((acc, curr) => acc + curr.weight, 0);

      result.headers = ['GRADE KEY', 'FINE/RAW GRADE NAME', 'CHALLAN PIECES SOURCED', 'WEIGHT VOLUME (MT)', 'WEIGHED AVG RATE/QL (INR)', 'DISTRIBUTION %'];
      result.chartData = Object.values(gradeMap).map(g => ({
        name: g.code,
        weight: parseFloat(g.weight.toFixed(3)),
        value: parseFloat(g.weight.toFixed(3)),
        percentage: totalWeightSum > 0 ? parseFloat(((g.weight / totalWeightSum) * 100).toFixed(1)) : 0
      })).sort((a, b) => b.value - a.value);

      result.rows = Object.values(gradeMap).map(g => {
        const avg = g.count > 0 ? Math.round(g.sumRate / g.count) : 17100;
        const share = totalWeightSum > 0 ? ((g.weight / totalWeightSum) * 100).toFixed(1) : '0';
        return [
          g.code,
          g.name,
          g.quantity.toLocaleString(),
          g.weight.toFixed(3),
          `Rs. ${avg.toLocaleString('en-IN')}`,
          `${share}%`
        ];
      });
      result.chartType = 'pie';
    }
    else if (activePoReportKey === 'r6') {
      result.headers = ['PO ID', 'SUPPLIER / PARTY SOURCED', 'DELIVERY COMMENCE', 'DELIVERY DEADLINE', 'OPERATIONAL WINDOW', 'GRACE DAYS', 'DELAY PENALTY (INR)', 'COMPLIANCE STATUS'];
      result.rows = poFilteredByPeriod.map((po: any) => {
        const delFrom = po.delivery_from ? new Date(po.delivery_from) : null;
        const delTo = po.delivery_to ? new Date(po.delivery_to) : null;
        let dayRange = 0;
        if (delFrom && delTo) {
          dayRange = Math.round((delTo.getTime() - delFrom.getTime()) / (1000 * 3600 * 24)) || 0;
        }
        return [
          po.po_no,
          po.supplier || 'DIRECT',
          po.delivery_from ? new Date(po.delivery_from).toLocaleDateString('en-GB') : 'N/A',
          po.delivery_to ? new Date(po.delivery_to).toLocaleDateString('en-GB') : 'N/A',
          dayRange > 0 ? `${dayRange} Days` : 'Spot Delivery',
          `${po.grace_days || 0} Days`,
          `Rs. ${po.delivery_penalty || 5}/Day`,
          po.pending !== false ? 'Active Pending' : 'Fully Cleared'
        ];
      });

      result.chartData = poFilteredByPeriod.map((po: any) => {
        const delFrom = po.delivery_from ? new Date(po.delivery_from) : null;
        const delTo = po.delivery_to ? new Date(po.delivery_to) : null;
        let dayRange = 0;
        if (delFrom && delTo) {
          dayRange = Math.round((delTo.getTime() - delFrom.getTime()) / (1000 * 3600 * 24)) || 0;
        }
        return {
          name: po.po_no,
          value: dayRange,
          grace: po.grace_days || 0,
          weight: Number(po.total_contract_mt) || 0
        };
      }).slice(0, 10);
      result.chartType = 'bar';
    }
    else if (activePoReportKey === 'r7') {
      result.headers = ['PO ID', 'SUPPLIER NAME', 'TOTAL LORRIES BOOKED', 'UNITS / LORRY', 'PACKAGING SPEC', 'FREIGHT PAYLOAD WIT/LORRY', 'EST MASS TOTAL (MT)'];
      result.rows = poFilteredByPeriod.map((po: any) => {
        const estMass = (Number(po.total_lorries) || 0) * (Number(po.weight_per_lorry) || 0);
        return [
          po.po_no,
          po.supplier || 'DIRECT',
          (po.total_lorries || 0).toString(),
          (po.units_per_lorry || 0).toString(),
          po.purchase_unit_name || 'BALES',
          (po.weight_per_lorry || 0).toString() + ' MT',
          estMass.toFixed(3) + ' MT'
        ];
      });

      result.chartData = poFilteredByPeriod.map((po: any) => ({
        name: po.po_no,
        value: Number(po.total_lorries) || 0,
        lorries: Number(po.total_lorries) || 0,
        payload: Number(po.weight_per_lorry) || 0
      })).slice(0, 10);
      result.chartType = 'composed';
    }
    else if (activePoReportKey === 'r8') {
      const agMap: Record<string, { code: string; name: string; linesCount: number; sourcedMt: number; sourcedQty: number; sumRate: number; count: number }> = {};
      filteredPoDetails.forEach(d => {
        const code = d.agency_code ? d.agency_code.toString().trim() : 'MAIN';
        const itemQty = Number(d.quantity) || 0;
        const itemWt = Number(d.weight_mt) || d.weight || 0;
        if (!agMap[code]) {
          const matchedAg = agencyList.find(a => String(a.agency_code).toUpperCase() === code.toUpperCase());
          agMap[code] = { code, name: matchedAg ? matchedAg.agency_name : 'MAIN AGENCY STATION', linesCount: 0, sourcedMt: 0, sourcedQty: 0, sumRate: 0, count: 0 };
        }
        agMap[code].linesCount++;
        agMap[code].sourcedQty += itemQty;
        agMap[code].sourcedMt += itemWt;
        if (d.rate_qntl) {
          agMap[code].sumRate += Number(d.rate_qntl);
          agMap[code].count++;
        }
      });

      result.headers = ['AGENCY CODE', 'AGENCY SOURCING STATION', 'ACTIVE TRANSACTION LINES', 'SOURCED PCS/BALES', 'SOURCED TONNES (MT)', 'STIPULATED CONTRACT RATE'];
      result.chartData = Object.values(agMap).map(a => ({
        name: a.name,
        weight: parseFloat(a.sourcedMt.toFixed(3)),
        value: parseFloat(a.sourcedMt.toFixed(3))
      })).sort((a, b) => b.value - a.value);

      result.rows = Object.values(agMap).map(a => {
        const avg = a.count > 0 ? Math.round(a.sumRate / a.count) : 17100;
        return [
          a.code,
          a.name,
          a.linesCount.toString(),
          a.sourcedQty.toLocaleString(),
          a.sourcedMt.toFixed(3),
          `Rs. ${avg.toLocaleString('en-IN')}`
        ];
      });
      result.chartType = 'bar';
    }
    else if (activePoReportKey === 'r9') {
      let pendingWt = 0;
      let completedWt = 0;
      let pendingCount = 0;
      let completedCount = 0;
      poFilteredByPeriod.forEach(po => {
        const isPending = po.pending !== false;
        const wt = Number(po.total_contract_mt) || 0;
        if (isPending) {
          pendingWt += wt;
          pendingCount++;
        } else {
          completedWt += wt;
          completedCount++;
        }
      });

      result.headers = ['PO COVENANT RUNNING STATUS', 'PO DEALS COUNT', 'COMMITTED WEIGHT (MT)', 'EST VALUE PRICE BASE (INR)'];
      result.chartData = [
        { name: 'Pending Contracts', value: pendingCount, weight: parseFloat(pendingWt.toFixed(3)) },
        { name: 'Completed Full', value: completedCount, weight: parseFloat(completedWt.toFixed(3)) }
      ];

      result.rows = [
        ['Pending Purchase Orders', pendingCount.toString(), pendingWt.toFixed(3) + ' MT', `Rs. ${Math.round(pendingWt * 17100).toLocaleString('en-IN')}`],
        ['Completed & Dispatched Orders', completedCount.toString(), completedWt.toFixed(3) + ' MT', `Rs. ${Math.round(completedWt * 17100).toLocaleString('en-IN')}`]
      ];
      result.chartType = 'half_circle';
    }
    else if (activePoReportKey === 'r10') {
      result.headers = ['PO REGISTRY ID', 'SUPPLIER NAME', 'B-RATE (BASE STANDARD)', 'ACTUAL RATE INVOICE', 'GAP DIFFERENCE (INR)', 'GAP RATIO %', 'VARIANCE AUDIT RUN'];
      
      const rateCompareList: any[] = [];
      poFilteredByPeriod.forEach(po => {
        const bRateVal = Number(po.b_rate) || 17100;
        const linkedDetails = filteredPoDetails.filter(d => d.po_no === po.po_no);
        const actualRateVal = linkedDetails.length > 0 && linkedDetails[0].rate_qntl ? Number(linkedDetails[0].rate_qntl) : bRateVal;
        
        const gapVal = actualRateVal - bRateVal;
        const gapRatio = bRateVal > 0 ? (gapVal / bRateVal) * 100 : 0;
        
        rateCompareList.push({
          po_no: po.po_no,
          supplier: po.supplier || 'DIRECT',
          bRate: bRateVal,
          actRate: actualRateVal,
          gap: gapVal,
          ratio: gapRatio
        });
      });

      result.rows = rateCompareList.map(item => {
        let verdict = 'Neutral Variance';
        if (item.ratio > 5) verdict = 'Premium Surcharged 🔴';
        else if (item.ratio < -5) verdict = 'Sub-market Saving 🟢';
        return [
          item.po_no,
          item.supplier,
          `Rs. ${item.bRate.toLocaleString('en-IN')}`,
          `Rs. ${item.actRate.toLocaleString('en-IN')}`,
          `Rs. ${item.gap.toLocaleString('en-IN')}`,
          `${item.ratio.toFixed(1)}%`,
          verdict
        ];
      });

      result.chartData = rateCompareList.slice(0, 10).map(item => ({
        name: item.po_no,
        baseRate: item.bRate,
        actualRate: item.actRate
      }));
      result.chartType = 'line';
    }
    else if (activePoReportKey === 'r11') {
      result.headers = [
        'PO / SAUDA NO',
        'SUPPLIER / PARTY',
        'CONTRACT MT (QTL)',
        'RECEIVED MT (QTL)',
        'TOLERANCE (5% / 1500KG)',
        'TOLERABLE RANGE',
        'AUDIT STATUS',
        'NET EXCESS / SHORT',
        'SAUDA TD5 (₹)',
        'ARRIVAL TD5 (₹)',
        'TD5 DIFF (₹)',
        'EXCESS PENALTY (INR)'
      ];

      result.rows = poFilteredByPeriod.map((po: any) => {
        const contractMt = parseFloat(po.total_contract_mt || 0) || 0;
        const rcvdMt = Number(po.received_weight_mt || 0);
        const tol = calculateWeightTolerance(contractMt, rcvdMt, po.purchase_unit_name);

        const cleanPo = (s: any) => String(s || '').trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        const targetPo = cleanPo(po.po_no);
        const targetSauda = cleanPo(po.contract_po_no);
        const matchedArr = tempArrivals.find((ar: any) => {
          const arPo = cleanPo(ar.po_no || ar.sauda_no || ar.contract_po_no || ar.temporary_arrival_no);
          return arPo && (arPo === targetPo || arPo === targetSauda);
        });

        const sDate = (po.s_date || po.po_date || po.contract_date || po.date || '').slice(0, 10);
        const aDate = (matchedArr?.date || matchedArr?.arrival_date || po.last_arrival_date || sDate).slice(0, 10);

        const getBaseRate = (dStr: string) => {
          if (sattaBaseRates.length > 0) {
            const matches = sattaBaseRates.filter((b: any) => {
              const bDate = (b.start_date || b.date || '').slice(0, 10);
              return bDate && bDate <= dStr;
            }).sort((a: any, b: any) => (b.start_date || '').localeCompare(a.start_date || ''));
            if (matches.length > 0) return Number(matches[0].base_rate || matches[0].rate || 0);
          }
          return 13500;
        };

        const saudaTd5 = parseFloat(po.b_rate || 0) > 0 ? parseFloat(po.b_rate) : getBaseRate(sDate);
        const arrivalTd5 = getBaseRate(aDate);
        const penaltyInfo = calculateExcessPenalty(tol.excessOverToleranceQtl, saudaTd5, arrivalTd5);

        let auditBadge = 'Tolerable (OK)';
        if (rcvdMt <= 0) auditBadge = 'Pending Arrival';
        else if (tol.isOverDelivery) auditBadge = 'Excess Surcharged 🔴';
        else if (tol.isUnderDelivery) auditBadge = 'Short Delivery 🟡';

        let netVarText = '0.00 MT (Within Tol)';
        if (tol.isOverDelivery) {
          netVarText = `+${tol.excessOverToleranceMt.toFixed(3)} MT (+${tol.excessOverToleranceQtl.toFixed(2)} Qtl)`;
        } else if (tol.isUnderDelivery) {
          netVarText = `-${tol.shortUnderToleranceMt.toFixed(3)} MT (-${tol.shortUnderToleranceQtl.toFixed(2)} Qtl)`;
        }

        return [
          po.po_no,
          po.supplier || 'DIRECT',
          `${contractMt.toFixed(3)} MT (${tol.contractQtl.toFixed(1)} Qtl)`,
          `${rcvdMt.toFixed(3)} MT (${tol.receivedQtl.toFixed(1)} Qtl)`,
          `±${tol.toleranceMt.toFixed(3)} MT (${tol.toleranceQtl.toFixed(1)} Qtl)`,
          tol.formattedRange,
          auditBadge,
          netVarText,
          `₹${saudaTd5.toLocaleString('en-IN')}`,
          `₹${arrivalTd5.toLocaleString('en-IN')}`,
          `₹${penaltyInfo.rateDifference.toLocaleString('en-IN')}`,
          tol.isOverDelivery ? `₹${penaltyInfo.penaltyAmount.toLocaleString('en-IN')}` : '₹0.00'
        ];
      });

      result.chartData = poFilteredByPeriod.slice(0, 10).map((po: any) => {
        const contractMt = parseFloat(po.total_contract_mt || 0) || 0;
        const rcvdMt = Number(po.received_weight_mt || 0);
        const tol = calculateWeightTolerance(contractMt, rcvdMt, po.purchase_unit_name);
        return {
          name: po.po_no,
          contract: contractMt,
          received: rcvdMt,
          allowedTol: tol.toleranceMt,
          excessMt: tol.excessOverToleranceMt,
          shortMt: tol.shortUnderToleranceMt
        };
      });
      result.chartType = 'bar';
    }

    result.totalCount = poFilteredByPeriod.length;
    result.totalMT = parseFloat(poFilteredByPeriod.reduce((sum, po) => sum + (Number(po.total_contract_mt) || 0), 0).toFixed(3));

    return result;
  }, [poFilteredByPeriod, filteredPoDetails, activePoReportKey, gradeList, agencyList, sattaBaseRates, tempArrivals]);

  // Helper to trigger download of detailed purchase orders with all fields and columns
  const triggerContractsCSVDownload = (pos: PurchaseMaster[], filename: string) => {
    const csvHeaders = [
      'PO ID',
      'PO NO',
      'PO DATE',
      'FINANCIAL YEAR',
      'PO TYPE',
      'PURCHASE ORDER OR PTF',
      'PTF NO',
      'GENERAL STATUS',
      'SUPPLIER',
      'CHALLAN SUPPLIER',
      'BROKER',
      'SOURCING AREA',
      'ARRIVAL AREA NAME',
      'TRANSPORT PAID BY',
      'WEIGHT UNIT (KGS)',
      'AGAINST CANCELLATION',
      'PURCHASE UNIT CODE',
      'PURCHASE UNIT NAME',
      'TOTAL LORRIES',
      'UNITS PER LORRY',
      'TOTAL UNITS',
      'WEIGHT PER LORRY',
      'TOTAL CONTRACT WEIGHT (MT)',
      'BASE RATE (B-RATE)',
      'MARKA TYPE',
      'MARKA PENALTY',
      'QUANTITY PENALTY',
      'DELIVERY FROM',
      'DELIVERY TO',
      'GRACE DAYS',
      'DELIVERY PENALTY',
      'CONTRACT PO NO',
      'CONTRACT DATE',
      'RATE DETAIL',
      'DELIVERY SCHEDULE',
      'TERMS & CONDITION',
      'SPECIAL REMARKS',
      'PO IDENTIFICATION',
      'START DATE',
      'ITEM DETAIL SRL NO',
      'CROP YEAR',
      'GRADE CODE',
      'AGENCY CODE',
      'MARKA CODE',
      'ITEM QUANTITY',
      'ITEM WEIGHT (MT)',
      'ITEM RATE (INR/m.T)',
      'ITEM EST REQUIRED CAPITAL (INR)'
    ];
    
    let totalWeightMT = 0;
    let totalEstimatedCapital = 0;
    let totalQuantity = 0;
    
    const csvRows: string[][] = [];
    
    pos.forEach(po => {
      const parentWeight = Number(po.total_contract_mt) || 0;
      const bRateVal = Number(po.b_rate) || 0;
      const statusStr = po.pending !== false ? 'Pending' : 'Completed';
      
      const poDateStr = po.po_date ? new Date(po.po_date).toLocaleDateString('en-GB') : '';
      const deliveryFromStr = po.delivery_from ? new Date(po.delivery_from).toLocaleDateString('en-GB') : '';
      const deliveryToStr = po.delivery_to ? new Date(po.delivery_to).toLocaleDateString('en-GB') : '';
      const contractDateStr = po.contract_date ? new Date(po.contract_date).toLocaleDateString('en-GB') : '';
      const startDateStr = po.s_date ? new Date(po.s_date).toLocaleDateString('en-GB') : '';
      
      const parentFields = [
        po.po_id || '',
        po.po_no || '',
        poDateStr,
        po.financial_year || '',
        po.po_type || 'Standard',
        po.purchase_order || '',
        po.ptf_no || '',
        statusStr,
        po.supplier || 'DIRECT',
        po.challan_supplier || '',
        po.broker || 'DIRECT',
        po.area || po.arrival_area_name || 'MAIN ZONE',
        po.arrival_area_name || '',
        po.trans_paid_by || '',
        String(po.weight_unit_kgs ?? ''),
        po.against_cancellation ? 'Yes' : 'No',
        po.purchase_unit_code || '',
        po.purchase_unit_name || '',
        String(po.total_lorries ?? '0'),
        String(po.units_per_lorry ?? '0'),
        String(po.total_units ?? '0'),
        String(po.weight_per_lorry ?? '0'),
        parentWeight.toFixed(3),
        bRateVal.toString(),
        po.marka_type || '',
        String(po.marka_penalty ?? '0'),
        String(po.qty_penalty ?? '0'),
        deliveryFromStr,
        deliveryToStr,
        String(po.grace_days ?? '0'),
        String(po.delivery_penalty ?? '0'),
        po.contract_po_no || '',
        contractDateStr,
        po.rate_detail || '',
        po.delivery_schedule || '',
        po.terms_condition || '',
        po.remarks || '',
        po.po_identification || '',
        startDateStr
      ];

      const matchingDetails = poDetails.filter((d: any) => d.po_no === po.po_no);
      if (matchingDetails.length > 0) {
        matchingDetails.forEach((item: any) => {
          const qtyVal = Number(item.quantity) || 0;
          const weightMTVal = Number(item.weight_mt) || 0;
          const itemRateVal = Number(item.rate_qntl) || 0;
          const itemEstCapital = weightMTVal * itemRateVal;
          
          totalWeightMT += weightMTVal;
          totalEstimatedCapital += itemEstCapital;
          totalQuantity += qtyVal;

          csvRows.push([
            ...parentFields,
            String(item.srl_no || ''),
            item.crop_year || '',
            item.grade_code || '',
            item.agency_code || '',
            item.marka_code || '',
            String(qtyVal),
            weightMTVal.toFixed(3),
            itemRateVal.toString(),
            Math.round(itemEstCapital).toString()
          ]);
        });
      } else {
        totalWeightMT += parentWeight;
        const estCap = parentWeight * bRateVal;
        totalEstimatedCapital += estCap;

        csvRows.push([
          ...parentFields,
          '1',
          '2025-26',
          'TD5',
          'MAIN',
          'STANDARD',
          '0',
          parentWeight.toFixed(3),
          bRateVal.toString(),
          Math.round(estCap).toString()
        ]);
      }
    });

    csvRows.push([
      'TOTAL AGGREGATE SUMMARY',
      `${pos.length} Contracts Sourced`,
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      `${totalQuantity} Units`,
      '',
      totalWeightMT.toFixed(3) + ' MT',
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      '', '', '', '', '',
      `${totalQuantity} Pcs`,
      totalWeightMT.toFixed(3) + ' MT',
      '',
      `Rs. ${Math.round(totalEstimatedCapital).toLocaleString('en-IN')}`
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [csvHeaders.join(','), ...csvRows.map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCSV = () => {
    if (activePoReportKey === 'r1') {
      const filename = `PO_Report1_Monthly_Procurement_${new Date().toISOString().split('T')[0]}.csv`;
      triggerContractsCSVDownload(poFilteredByPeriod, filename);
      return;
    }
    
    const reportTitle = PO_REPORTS.find(r => r.key === activePoReportKey)?.name || 'PO_Report';
    const csvContent = "data:text/csv;charset=utf-8," 
      + [reportOutput.headers.join(','), ...reportOutput.rows.map(e => e.map(cell => `"${cell}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${reportTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const reportSuppliersList = React.useMemo(() => {
    const s = new Set<string>();
    originalData.forEach(p => {
      if (p.supplier) s.add(p.supplier.trim().toUpperCase());
    });
    return Array.from(s).sort();
  }, [originalData]);

  const reportBrokersList = React.useMemo(() => {
    const s = new Set<string>();
    originalData.forEach(p => {
      if (p.broker) s.add(p.broker.trim().toUpperCase());
    });
    return Array.from(s).sort();
  }, [originalData]);

  return {
    loading,
    originalData,
    poDetails,
    agencyList,
    gradeList,
    sattaBaseRates,
    tempArrivals,
    hoveredBar,
    setHoveredBar,
    viewMode,
    setViewMode,
    financialYearFilter,
    setFinancialYearFilter,
    searchQuery,
    setSearchQuery,
    selectedSupplier,
    setSelectedSupplier,
    activePoReportKey,
    setActivePoReportKey,
    poReportMonth,
    setPoReportMonth,
    poReportYear,
    setPoReportYear,
    poReportSearch,
    setPoReportSearch,
    poReportStartDate,
    setPoReportStartDate,
    poReportEndDate,
    setPoReportEndDate,
    poReportSupplier,
    setPoReportSupplier,
    showPrintModal,
    setShowPrintModal,
    selectedMonthsForPrint,
    setSelectedMonthsForPrint,
    r1ChartMetric,
    setR1ChartMetric,
    fetchPurchaseOrders,
    filteredData,
    groupedChartData,
    stats,
    financialYears,
    handleBarClick,
    displayedDetails,
    poFilteredByPeriod,
    filteredPoDetails,
    reportOutput,
    triggerContractsCSVDownload,
    handleExportCSV,
    reportSuppliersList,
    reportBrokersList
  };
}
