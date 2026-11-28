import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  Search,
  Download,
  Printer,
  X,
  TrendingDown,
  Sparkles
} from 'lucide-react';
import {
  SystemReportDataset,
  ReportTransactionLine,
  calculateMillInspectionRankings
} from '../../services/systemReportEngine';
import { cn } from '../../lib/utils';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { ParetoChart } from '../reports/charts/ParetoChart';
import { HeatmapChart } from '../reports/charts/HeatmapChart';

interface ExceptionAuditViewProps {
  dataset: SystemReportDataset;
  onDrillDown: (title: string, txns: ReportTransactionLine[]) => void;
  initialBroker?: string;
}

interface PerformanceAnomalyRecord {
  id: string;
  entityType: 'Broker' | 'Supplier';
  entityName: string;
  polarity: 'Too Bad' | 'Too Good';
  workflowSection: string;
  anomalyType: string;
  severity: 'High' | 'Medium' | 'Low';
  mrNo: string;
  poNo: string;
  transactionDate: string;
  performanceScore: number;
  lotsCount: number;
  receivedMt: number;
  gradeDownPct: number;
  moisturePct: number;
  moistureLimit: number;
  excessMoisture: number;
  dustPct: number;
  ncvPct: number;
  habijabiChattaRopeKg: number;
  expectedValue: string;
  actualValue: string;
  difference: string;
  detectionReason: string;
  recommendedAction: string;
  verificationStatus: 'Pending Review' | 'Under Investigation' | 'Verified Legitimate' | 'Corrected';
}

export const ExceptionAuditView: React.FC<ExceptionAuditViewProps> = ({
  dataset,
  initialBroker
}) => {
  const filteredMillInspections = dataset.filteredMillInspections || [];
  const filteredScp = dataset.filtered || [];

  const [selectedAnomaly, setSelectedAnomaly] = useState<PerformanceAnomalyRecord | null>(null);

  // Filters
  const [selectedEntity, setSelectedEntity] = useState<string>(initialBroker || 'ALL');
  const [entityTypeFilter, setEntityTypeFilter] = useState<'ALL' | 'Broker' | 'Supplier'>('ALL');
  const [polarityFilter, setPolarityFilter] = useState<'ALL' | 'Too Bad' | 'Too Good'>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [anomalyTypeFilter, setAnomalyTypeFilter] = useState<string>('ALL');
  const [workflowSectionFilter, setWorkflowSectionFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Status overrides stored locally
  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, PerformanceAnomalyRecord['verificationStatus']>
  >({});

  // =========================================================================
  // BROKER & SUPPLIER PERFORMANCE ANOMALY ENGINE ("TOO GOOD OR TOO BAD")
  // =========================================================================
  const allAnomalies = useMemo(() => {
    const list: PerformanceAnomalyRecord[] = [];
    const brokerRankings = calculateMillInspectionRankings(filteredMillInspections, 'broker');
    const supplierRankings = calculateMillInspectionRankings(filteredMillInspections, 'supplier');

    // 1. Entity-Level Broker & Supplier Performance Extremes (Too Bad & Too Good)
    const evaluateEntityList = (
      rows: ReturnType<typeof calculateMillInspectionRankings>,
      entityType: 'Broker' | 'Supplier'
    ) => {
      rows.forEach((row, idx) => {
        const latestRec = row.records[0];
        const latestDate = latestRec?.date || '—';
        const samplePo = latestRec?.poNo || '—';
        const sampleMr = latestRec?.mrNo || '—';
        const sectionName = entityType === 'Broker' ? 'Broker Performance' : 'Supplier Performance';

        // TOO BAD: Low overall Mill Inspection Quality Performance Score
        if (row.performanceScore < 55) {
          const isSevere = row.performanceScore < 45;
          list.push({
            id: `${entityType}-BAD-SCORE-${idx}-${row.key}`,
            entityType,
            entityName: row.key,
            polarity: 'Too Bad',
            workflowSection: sectionName,
            anomalyType: 'Poor Quality Performance Score',
            severity: isSevere ? 'High' : 'Medium',
            mrNo: `${row.mrCount} MRs`,
            poNo: `${row.poCount || 1} POs`,
            transactionDate: latestDate,
            performanceScore: row.performanceScore,
            lotsCount: row.mrCount,
            receivedMt: row.totalMt,
            gradeDownPct: row.avgGradeDown,
            moisturePct: row.avgMoisture,
            moistureLimit: row.avgMoistureLimit,
            excessMoisture: row.avgExcessMoisture,
            dustPct: row.avgDust,
            ncvPct: row.avgNcv,
            habijabiChattaRopeKg: row.totalHabijabiChattaRopeKg,
            expectedValue: 'Score ≥ 70 / 100',
            actualValue: `${row.performanceScore.toFixed(1)} / 100 (${row.tier})`,
            difference: `-${(70 - row.performanceScore).toFixed(1)} pts`,
            detectionReason: `${entityType} "${row.key}" scored ${row.performanceScore.toFixed(1)}/100 across ${row.mrCount} Mill Inspection lots (${row.totalMt.toFixed(2)} MT): Avg Grade Down ${row.avgGradeDown.toFixed(1)}%, Excess Moisture +${row.avgExcessMoisture.toFixed(1)}%, Dust ${row.avgDust.toFixed(1)}%, NCV ${row.avgNcv.toFixed(1)}%, CT ${Math.round(row.totalHabijabiChattaRopeKg)} kg.`,
            recommendedAction: `Review ${entityType.toLowerCase()} quality deductions and tighten pre-dispatch sampling before fresh Sauda booking.`,
            verificationStatus: 'Pending Review'
          });
        }

        // TOO GOOD: Suspiciously Perfect / Zero-Defect High-Volume Outlier
        if (
          row.mrCount >= 3 &&
          row.performanceScore >= 97 &&
          row.avgGradeDown <= 0.05 &&
          row.avgExcessMoisture <= 0.05 &&
          row.avgDust <= 0.05 &&
          row.avgNcv <= 0.05 &&
          row.totalHabijabiChattaRopeKg <= 0
        ) {
          list.push({
            id: `${entityType}-GOOD-ZERO-${idx}-${row.key}`,
            entityType,
            entityName: row.key,
            polarity: 'Too Good',
            workflowSection: sectionName,
            anomalyType: 'Zero-Defect Performance Outlier (Too Good)',
            severity: 'Medium',
            mrNo: `${row.mrCount} MRs`,
            poNo: `${row.poCount || 1} POs`,
            transactionDate: latestDate,
            performanceScore: row.performanceScore,
            lotsCount: row.mrCount,
            receivedMt: row.totalMt,
            gradeDownPct: row.avgGradeDown,
            moisturePct: row.avgMoisture,
            moistureLimit: row.avgMoistureLimit,
            excessMoisture: row.avgExcessMoisture,
            dustPct: row.avgDust,
            ncvPct: row.avgNcv,
            habijabiChattaRopeKg: row.totalHabijabiChattaRopeKg,
            expectedValue: 'Normal variance across ≥ 3 lots',
            actualValue: `${row.performanceScore.toFixed(1)}/100 · 0% defects (${row.mrCount} lots)`,
            difference: `+${(row.performanceScore - 85).toFixed(1)} pts above avg`,
            detectionReason: `${entityType} "${row.key}" recorded zero Grade Down, zero Excess Moisture, zero Dust/NCV, and zero Habijabi/Chatta/Rope across all ${row.mrCount} inspected lots (${row.totalMt.toFixed(2)} MT). Audit recommended to verify inspection objectivity or benchmark best-in-class sourcing.`,
            recommendedAction: `Perform random blind re-inspection sample on next arrival from "${row.key}" to confirm grading accuracy.`,
            verificationStatus: 'Pending Review'
          });
        }

        // TOO BAD: Persistent Excess Seasonal Moisture across lots
        if (row.avgExcessMoisture >= 1.0 && row.excessMoistureLots >= 2) {
          list.push({
            id: `${entityType}-BAD-MOIST-${idx}-${row.key}`,
            entityType,
            entityName: row.key,
            polarity: 'Too Bad',
            workflowSection: 'Mill Inspection (Moisture)',
            anomalyType: 'Chronic Excess Seasonal Moisture',
            severity: row.avgExcessMoisture >= 2.5 ? 'High' : 'Medium',
            mrNo: sampleMr,
            poNo: samplePo,
            transactionDate: latestDate,
            performanceScore: row.performanceScore,
            lotsCount: row.excessMoistureLots,
            receivedMt: row.totalMt,
            gradeDownPct: row.avgGradeDown,
            moisturePct: row.avgMoisture,
            moistureLimit: row.avgMoistureLimit,
            excessMoisture: row.avgExcessMoisture,
            dustPct: row.avgDust,
            ncvPct: row.avgNcv,
            habijabiChattaRopeKg: row.totalHabijabiChattaRopeKg,
            expectedValue: `≤ ${row.avgMoistureLimit.toFixed(0)}% seasonal limit`,
            actualValue: `${row.avgMoisture.toFixed(1)}% avg (${row.excessMoistureLots}/${row.mrCount} lots)`,
            difference: `+${row.avgExcessMoisture.toFixed(2)}% excess`,
            detectionReason: `${entityType} "${row.key}" exceeded active seasonal moisture tolerance (${row.avgMoistureLimit.toFixed(0)}%) on ${row.excessMoistureLots} of ${row.mrCount} lots with average moisture ${row.avgMoisture.toFixed(1)}%.`,
            recommendedAction: `Enforce strict moisture claim recovery at settlement and issue moisture compliance warning.`,
            verificationStatus: 'Pending Review'
          });
        }

        // TOO BAD: High Grade Down Concentration
        if (row.avgGradeDown >= 5.0) {
          list.push({
            id: `${entityType}-BAD-GD-${idx}-${row.key}`,
            entityType,
            entityName: row.key,
            polarity: 'Too Bad',
            workflowSection: 'Mill Inspection (Grade Down)',
            anomalyType: 'High Grade Down Concentration',
            severity: row.avgGradeDown >= 10.0 ? 'High' : 'Medium',
            mrNo: sampleMr,
            poNo: samplePo,
            transactionDate: latestDate,
            performanceScore: row.performanceScore,
            lotsCount: row.gradeDownLots,
            receivedMt: row.totalMt,
            gradeDownPct: row.avgGradeDown,
            moisturePct: row.avgMoisture,
            moistureLimit: row.avgMoistureLimit,
            excessMoisture: row.avgExcessMoisture,
            dustPct: row.avgDust,
            ncvPct: row.avgNcv,
            habijabiChattaRopeKg: row.totalHabijabiChattaRopeKg,
            expectedValue: '< 5.0% Grade Down',
            actualValue: `${row.avgGradeDown.toFixed(2)}% avg (${row.gradeDownLots}/${row.mrCount} lots)`,
            difference: `+${(row.avgGradeDown - 5).toFixed(2)}% over threshold`,
            detectionReason: `${entityType} "${row.key}" averaged ${row.avgGradeDown.toFixed(2)}% Grade Down across ${row.mrCount} Mill Inspection lots, degrading effective fiber grade.`,
            recommendedAction: `Cross-verify contracted grade specifications against delivered lots and enforce grade-down rate adjustment.`,
            verificationStatus: 'Pending Review'
          });
        }

        // TOO BAD: High Dust / NCV Contamination
        if (row.avgDust >= 1.5 || row.avgNcv >= 1.5) {
          const isHigh = row.avgDust >= 3.0 || row.avgNcv >= 3.0;
          list.push({
            id: `${entityType}-BAD-DUST-${idx}-${row.key}`,
            entityType,
            entityName: row.key,
            polarity: 'Too Bad',
            workflowSection: 'Mill Inspection (Dust & NCV)',
            anomalyType: 'High Dust / NCV Contamination',
            severity: isHigh ? 'High' : 'Medium',
            mrNo: sampleMr,
            poNo: samplePo,
            transactionDate: latestDate,
            performanceScore: row.performanceScore,
            lotsCount: Math.max(row.dustLots, row.ncvLots),
            receivedMt: row.totalMt,
            gradeDownPct: row.avgGradeDown,
            moisturePct: row.avgMoisture,
            moistureLimit: row.avgMoistureLimit,
            excessMoisture: row.avgExcessMoisture,
            dustPct: row.avgDust,
            ncvPct: row.avgNcv,
            habijabiChattaRopeKg: row.totalHabijabiChattaRopeKg,
            expectedValue: 'Dust & NCV < 1.5%',
            actualValue: `Dust ${row.avgDust.toFixed(2)}% · NCV ${row.avgNcv.toFixed(2)}%`,
            difference: `+${Math.max(row.avgDust, row.avgNcv).toFixed(2)}%`,
            detectionReason: `${entityType} "${row.key}" recorded elevated Dust (${row.avgDust.toFixed(2)}%) / NCV (${row.avgNcv.toFixed(2)}%) across Mill Inspection lots.`,
            recommendedAction: `Verify dust & NCV claim deductions in MR Settlement and flag supplier lot handling.`,
            verificationStatus: 'Pending Review'
          });
        }

        // TOO BAD: High Habijabi / Chatta / Rope (CT)
        if (row.totalHabijabiChattaRopeKg >= 50 || row.avgCtPct >= 1.5) {
          const isHigh = row.totalHabijabiChattaRopeKg >= 150 || row.avgCtPct >= 3.0;
          list.push({
            id: `${entityType}-BAD-CT-${idx}-${row.key}`,
            entityType,
            entityName: row.key,
            polarity: 'Too Bad',
            workflowSection: 'Mill Inspection (CT / Foreign Matter)',
            anomalyType: 'High Habijabi / Chatta / Rope (CT)',
            severity: isHigh ? 'High' : 'Medium',
            mrNo: sampleMr,
            poNo: samplePo,
            transactionDate: latestDate,
            performanceScore: row.performanceScore,
            lotsCount: row.ctLots,
            receivedMt: row.totalMt,
            gradeDownPct: row.avgGradeDown,
            moisturePct: row.avgMoisture,
            moistureLimit: row.avgMoistureLimit,
            excessMoisture: row.avgExcessMoisture,
            dustPct: row.avgDust,
            ncvPct: row.avgNcv,
            habijabiChattaRopeKg: row.totalHabijabiChattaRopeKg,
            expectedValue: 'CT < 50 kg / < 1.5%',
            actualValue: `${Math.round(row.totalHabijabiChattaRopeKg)} kg (${row.avgCtPct.toFixed(2)}%)`,
            difference: `${Math.round(row.totalHabijabiChattaRopeKg)} kg excess`,
            detectionReason: `${entityType} "${row.key}" delivered ${Math.round(row.totalHabijabiChattaRopeKg)} kg of Habijabi / Chatta / Rope (${row.avgCtPct.toFixed(2)}% CT) across ${row.ctLots} inspected lots.`,
            recommendedAction: `Confirm full weight deduction for Habijabi/Chatta/Rope in Mill Inspection & Settlement.`,
            verificationStatus: 'Pending Review'
          });
        }
      });
    };

    evaluateEntityList(brokerRankings, 'Broker');
    evaluateEntityList(supplierRankings, 'Supplier');

    // 2. Sauda Check Point -> Mill Inspection Delivery Extremes (Severe Shortfall = Too Bad; Over-Delivery >115% = Too Good/Over)
    filteredScp.forEach((t, idx) => {
      if (t.quantityMT <= 0 || !t.hasInspection) return;
      const ratio = (t.arrivedWeightMT / t.quantityMT) * 100;

      if (ratio > 115) {
        list.push({
          id: `SCP-EXCESS-${idx}-${t.poNo}`,
          entityType: 'Broker',
          entityName: t.broker || 'Direct',
          polarity: 'Too Good',
          workflowSection: 'Sauda Check Point vs Mill Insp',
          anomalyType: 'Excess Delivery Outlier (>115% of SCP)',
          severity: ratio > 130 ? 'High' : 'Medium',
          mrNo: t.mrNo || '—',
          poNo: t.poNo || '—',
          transactionDate: t.date || '—',
          performanceScore: 100,
          lotsCount: t.mrCount || 1,
          receivedMt: t.arrivedWeightMT,
          gradeDownPct: 0,
          moisturePct: t.moisturePct || 0,
          moistureLimit: 18,
          excessMoisture: Math.max(0, (t.moisturePct || 0) - 18),
          dustPct: 0,
          ncvPct: 0,
          habijabiChattaRopeKg: 0,
          expectedValue: `${t.quantityMT.toFixed(2)} MT (SCP Contract)`,
          actualValue: `${t.arrivedWeightMT.toFixed(2)} MT (${ratio.toFixed(1)}%)`,
          difference: `+${(t.arrivedWeightMT - t.quantityMT).toFixed(2)} MT`,
          detectionReason: `PO ${t.poNo} (${t.broker} / ${t.supplier}) delivered ${t.arrivedWeightMT.toFixed(2)} MT against ${t.quantityMT.toFixed(2)} MT Sauda Check Point contract (${ratio.toFixed(1)}%).`,
          recommendedAction: `Verify Extra Weight & Rate Settlement deduction is applied in Sauda Check Point.`,
          verificationStatus: 'Pending Review'
        });
      } else if (ratio > 0 && ratio < 60 && t.isDelayed) {
        list.push({
          id: `SCP-SHORT-${idx}-${t.poNo}`,
          entityType: 'Supplier',
          entityName: t.supplier || 'Unassigned Supplier',
          polarity: 'Too Bad',
          workflowSection: 'Sauda Check Point vs Mill Insp',
          anomalyType: 'Severe Delivery Shortfall (<60% Overdue)',
          severity: ratio < 40 ? 'High' : 'Medium',
          mrNo: t.mrNo || '—',
          poNo: t.poNo || '—',
          transactionDate: t.date || '—',
          performanceScore: Number(ratio.toFixed(1)),
          lotsCount: t.mrCount || 1,
          receivedMt: t.arrivedWeightMT,
          gradeDownPct: 0,
          moisturePct: t.moisturePct || 0,
          moistureLimit: 18,
          excessMoisture: Math.max(0, (t.moisturePct || 0) - 18),
          dustPct: 0,
          ncvPct: 0,
          habijabiChattaRopeKg: 0,
          expectedValue: `${t.quantityMT.toFixed(2)} MT (SCP Contract)`,
          actualValue: `${t.arrivedWeightMT.toFixed(2)} MT (${ratio.toFixed(1)}%)`,
          difference: `-${(t.quantityMT - t.arrivedWeightMT).toFixed(2)} MT`,
          detectionReason: `Overdue PO ${t.poNo} (${t.supplier} via ${t.broker}) fulfilled only ${ratio.toFixed(1)}% (${t.arrivedWeightMT.toFixed(2)} of ${t.quantityMT.toFixed(2)} MT) in Mill Inspection.`,
          recommendedAction: `Follow up on pending balance or apply Short Weight Settlement deduction in Sauda Check Point.`,
          verificationStatus: 'Pending Review'
        });
      }
    });

    const sevWeight = { High: 3, Medium: 2, Low: 1 };
    return list.sort((a, b) => sevWeight[b.severity] - sevWeight[a.severity] || b.receivedMt - a.receivedMt);
  }, [filteredMillInspections, filteredScp]);

  // Dropdown options
  const entityOptions = useMemo(() => {
    const set = new Set<string>();
    allAnomalies.forEach(a => set.add(a.entityName));
    return Array.from(set).sort();
  }, [allAnomalies]);

  const anomalyTypeOptions = useMemo(() => {
    const set = new Set<string>();
    allAnomalies.forEach(a => set.add(a.anomalyType));
    return Array.from(set).sort();
  }, [allAnomalies]);

  const sectionOptions = useMemo(() => {
    const set = new Set<string>();
    allAnomalies.forEach(a => set.add(a.workflowSection));
    return Array.from(set).sort();
  }, [allAnomalies]);

  // Filtered anomalies
  const filteredAnomalies = useMemo(() => {
    return allAnomalies.filter(item => {
      if (entityTypeFilter !== 'ALL' && item.entityType !== entityTypeFilter) return false;
      if (polarityFilter !== 'ALL' && item.polarity !== polarityFilter) return false;
      if (selectedEntity !== 'ALL' && item.entityName.toUpperCase() !== selectedEntity.toUpperCase()) return false;
      if (severityFilter !== 'ALL' && item.severity !== severityFilter) return false;
      if (anomalyTypeFilter !== 'ALL' && item.anomalyType !== anomalyTypeFilter) return false;
      if (workflowSectionFilter !== 'ALL' && item.workflowSection !== workflowSectionFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          item.entityName.toLowerCase().includes(q) ||
          item.poNo.toLowerCase().includes(q) ||
          item.mrNo.toLowerCase().includes(q) ||
          item.anomalyType.toLowerCase().includes(q) ||
          item.detectionReason.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [
    allAnomalies,
    entityTypeFilter,
    polarityFilter,
    selectedEntity,
    severityFilter,
    anomalyTypeFilter,
    workflowSectionFilter,
    searchQuery
  ]);

  // KPI Calculations
  const highSeverityCount = filteredAnomalies.filter(a => a.severity === 'High').length;
  const tooBadCount = filteredAnomalies.filter(a => a.polarity === 'Too Bad').length;
  const tooGoodCount = filteredAnomalies.filter(a => a.polarity === 'Too Good').length;

  // Chart 1: Stacked Bar (Flag Severity by Workflow Section)
  const sectionSeverityData = useMemo(() => {
    const map = new Map<string, { section: string; High: number; Medium: number; Low: number }>();
    filteredAnomalies.forEach(a => {
      const sec = a.workflowSection || 'General';
      const cur = map.get(sec) || { section: sec, High: 0, Medium: 0, Low: 0 };
      if (a.severity === 'High') cur.High += 1;
      else if (a.severity === 'Medium') cur.Medium += 1;
      else cur.Low += 1;
      map.set(sec, cur);
    });
    return Array.from(map.values()).sort((a, b) => (b.High + b.Medium + b.Low) - (a.High + a.Medium + a.Low));
  }, [filteredAnomalies]);

  // Chart 2: Pareto (Exception Causes by frequency)
  const causeParetoData = useMemo(() => {
    const map = new Map<string, number>();
    filteredAnomalies.forEach(a => {
      map.set(a.anomalyType, (map.get(a.anomalyType) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, countOrVolume]) => ({ name, countOrVolume }));
  }, [filteredAnomalies]);

  // Chart 3: Heatmap (Section x Issue Type)
  const heatmapData = useMemo(() => {
    const rowSet = new Set<string>();
    const colSet = new Set<string>();
    const cells: Array<{ row: string; col: string; value: number }> = [];
    filteredAnomalies.forEach(a => {
      rowSet.add(a.workflowSection);
      colSet.add(a.anomalyType);
      cells.push({ row: a.workflowSection, col: a.anomalyType, value: 1 });
    });
    return {
      rows: Array.from(rowSet).sort(),
      cols: Array.from(colSet).sort(),
      cells
    };
  }, [filteredAnomalies]);

  const handleExportCSV = () => {
    if (!filteredAnomalies.length) return;
    const headers = [
      'Sl No',
      'Entity Type',
      'Broker / Supplier Name',
      'Polarity',
      'Workflow Section',
      'Issue / Anomaly Type',
      'Severity',
      'Score',
      'Lots / MRs',
      'Received MT',
      'Grade Down %',
      'Moisture %',
      'Excess Moisture %',
      'Dust %',
      'NCV %',
      'CT Habijabi/Chatta/Rope (Kg)',
      'Expected',
      'Actual',
      'Difference',
      'Reason',
      'Status'
    ];
    const rows = filteredAnomalies.map((a, idx) => [
      idx + 1,
      a.entityType,
      `"${a.entityName}"`,
      a.polarity,
      `"${a.workflowSection}"`,
      `"${a.anomalyType}"`,
      a.severity,
      a.performanceScore.toFixed(1),
      a.lotsCount,
      a.receivedMt.toFixed(2),
      a.gradeDownPct.toFixed(2),
      a.moisturePct.toFixed(1),
      a.excessMoisture.toFixed(2),
      a.dustPct.toFixed(2),
      a.ncvPct.toFixed(2),
      Math.round(a.habijabiChattaRopeKg),
      `"${a.expectedValue}"`,
      `"${a.actualValue}"`,
      `"${a.difference}"`,
      `"${a.detectionReason.replace(/"/g, '""')}"`,
      statusOverrides[a.id] || a.verificationStatus
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `performance_exception_audit_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 font-sans text-slate-800">
      {/* ================= HEADER BAR ================= */}
      <div className="p-4 bg-slate-900 text-white rounded-xl border border-slate-800 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-300 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-white">
              Exception &amp; Abnormal Data Audit (Broker &amp; Supplier Performance Extremes)
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Flags Brokers &amp; Suppliers whose Mill Inspection quality or SCP delivery performance is Too Bad or suspiciously Too Good
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg border border-white/15 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* ================= KPI CARDS RIBBON ================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Total Performance Flags</span>
          <span className="text-xl font-black text-slate-900 font-mono tabular-nums mt-0.5 block">{filteredAnomalies.length}</span>
          <span className="text-[10px] text-slate-500">across {entityOptions.length} Brokers &amp; Suppliers</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-rose-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">Too Bad (Underperforming)</span>
          <span className="text-xl font-black text-rose-700 font-mono tabular-nums mt-0.5 block">{tooBadCount}</span>
          <span className="text-[10px] text-rose-600">High Grade Down, Moisture, Dust, NCV, CT</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Too Good (Outliers)</span>
          <span className="text-xl font-black text-emerald-800 font-mono tabular-nums mt-0.5 block">{tooGoodCount}</span>
          <span className="text-[10px] text-emerald-700">Zero-defect streaks &amp; &gt;115% excess delivery</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">High Severity Alerts</span>
          <span className="text-xl font-black text-amber-800 font-mono tabular-nums mt-0.5 block">{highSeverityCount}</span>
          <span className="text-[10px] text-slate-500">Immediate audit review required</span>
        </div>
      </div>

      {/* ================= EXCEPTION CHARTS: STACKED BAR + PARETO + HEATMAP ================= */}
      {filteredAnomalies.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Stacked Bar: Flag Severity by Workflow Section */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2">
              <div className="pb-2 border-b border-slate-100">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Flag Severity by Workflow Section
                </h4>
                <p className="text-[11px] text-slate-500">Too Good &amp; Too Bad Broker/Supplier alert counts per workflow area</p>
              </div>
              <div style={{ width: '100%', height: 270 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sectionSeverityData} margin={{ top: 10, right: 16, left: 0, bottom: 32 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="section" tick={{ fontSize: 9.5, fill: '#334155', fontWeight: 600 }} angle={-16} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'monospace' }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                    <Bar dataKey="High" stackId="sev" name="High Severity" fill="#be123c" />
                    <Bar dataKey="Medium" stackId="sev" name="Medium Severity" fill="#d97706" />
                    <Bar dataKey="Low" stackId="sev" name="Low Severity" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pareto: Exception Causes by Frequency */}
            <ParetoChart
              title="Exception Causes Pareto"
              subtitle="Broker & Supplier Too Good / Too Bad triggers ranked by frequency"
              data={causeParetoData}
              volumeUnit="flags"
              height={270}
            />
          </div>

          {/* Heatmap: Section x Issue Type */}
          <HeatmapChart
            title="Section × Issue Type Heatmap"
            subtitle="Pinpoints which performance domains generate Too Good or Too Bad flags most frequently"
            rows={heatmapData.rows}
            cols={heatmapData.cols}
            cells={heatmapData.cells}
            colorScheme="rose"
          />
        </div>
      )}

      {/* ================= FILTER TOOLBAR ================= */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search Broker, Supplier, PO, Reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-slate-800 w-52 sm:w-60"
            />
          </div>

          <select
            value={polarityFilter}
            onChange={(e) => setPolarityFilter(e.target.value as any)}
            className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
          >
            <option value="ALL">All (Too Bad &amp; Too Good)</option>
            <option value="Too Bad">Too Bad (Underperforming)</option>
            <option value="Too Good">Too Good (Outliers)</option>
          </select>

          <select
            value={entityTypeFilter}
            onChange={(e) => setEntityTypeFilter(e.target.value as any)}
            className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
          >
            <option value="ALL">Brokers &amp; Suppliers</option>
            <option value="Broker">Brokers Only</option>
            <option value="Supplier">Suppliers Only</option>
          </select>

          <select
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
            className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 max-w-[180px]"
          >
            <option value="ALL">All Parties ({entityOptions.length})</option>
            {entityOptions.map((b, idx) => (
              <option key={idx} value={b}>{b}</option>
            ))}
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
          >
            <option value="ALL">All Severities</option>
            <option value="High">High Severity</option>
            <option value="Medium">Medium Severity</option>
            <option value="Low">Low Severity</option>
          </select>

          <select
            value={anomalyTypeFilter}
            onChange={(e) => setAnomalyTypeFilter(e.target.value)}
            className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 max-w-[200px]"
          >
            <option value="ALL">All Issue Types</option>
            {anomalyTypeOptions.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <select
            value={workflowSectionFilter}
            onChange={(e) => setWorkflowSectionFilter(e.target.value)}
            className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 max-w-[190px]"
          >
            <option value="ALL">All Sections</option>
            {sectionOptions.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          {(selectedEntity !== 'ALL' || entityTypeFilter !== 'ALL' || polarityFilter !== 'ALL' || severityFilter !== 'ALL' || anomalyTypeFilter !== 'ALL' || workflowSectionFilter !== 'ALL' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSelectedEntity('ALL');
                setEntityTypeFilter('ALL');
                setPolarityFilter('ALL');
                setSeverityFilter('ALL');
                setAnomalyTypeFilter('ALL');
                setWorkflowSectionFilter('ALL');
                setSearchQuery('');
              }}
              className="text-xs text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
            >
              Reset Filters
            </button>
          )}
          <span className="text-[11px] font-bold text-slate-500">
            Showing <strong>{filteredAnomalies.length}</strong> of <strong>{allAnomalies.length}</strong>
          </span>
        </div>
      </div>

      {/* ================= PERFORMANCE EXCEPTION REGISTER TABLE ================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
          <span className="uppercase tracking-wider">
            Broker &amp; Supplier Performance Exception Register (Too Good / Too Bad)
          </span>
          <span className="text-[11px] text-slate-500 font-normal">
            Click any row to open full performance rationale &amp; update audit status
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-slate-100 text-slate-800 text-[10px] font-black uppercase tracking-wider border-b border-slate-200 sticky top-0 z-10 shadow-2xs">
                <th className="p-2.5">Type</th>
                <th className="p-2.5">Broker / Supplier</th>
                <th className="p-2.5 text-center">Polarity</th>
                <th className="p-2.5">Workflow Section</th>
                <th className="p-2.5">Issue / Trigger</th>
                <th className="p-2.5 text-right">Score</th>
                <th className="p-2.5 text-right">Received MT</th>
                <th className="p-2.5 text-right">GD %</th>
                <th className="p-2.5 text-right">Moist (Exc)</th>
                <th className="p-2.5 text-right">Dust / NCV</th>
                <th className="p-2.5 text-right">CT (Kg)</th>
                <th className="p-2.5">Actual vs Expected</th>
                <th className="p-2.5 text-center">Severity</th>
                <th className="p-2.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-700">
              {filteredAnomalies.length > 0 ? (
                filteredAnomalies.map((item) => {
                  const vStatus = statusOverrides[item.id] || item.verificationStatus;
                  const sevBadge =
                    item.severity === 'High'
                      ? 'bg-rose-600 text-white'
                      : item.severity === 'Medium'
                      ? 'bg-amber-600 text-white'
                      : 'bg-blue-600 text-white';

                  const statusBadge =
                    vStatus === 'Verified Legitimate'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : vStatus === 'Corrected'
                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                      : 'bg-amber-100 text-amber-800 border-amber-300';

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedAnomaly(item)}
                      className="hover:bg-rose-50/50 transition cursor-pointer select-none"
                    >
                      <td className="p-2.5 font-sans font-bold text-slate-600">{item.entityType}</td>
                      <td className="p-2.5 font-sans font-bold text-slate-900 max-w-[180px] truncate" title={item.entityName}>
                        {item.entityName}
                      </td>
                      <td className="p-2.5 text-center font-sans">
                        {item.polarity === 'Too Bad' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-bold">
                            <TrendingDown className="w-3 h-3" /> Too Bad
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                            <Sparkles className="w-3 h-3" /> Too Good
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 font-sans text-slate-700">{item.workflowSection}</td>
                      <td className="p-2.5 font-sans font-bold text-slate-800">
                        <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[10px]">
                          {item.anomalyType}
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-black text-slate-900">{item.performanceScore.toFixed(1)}</td>
                      <td className="p-2.5 text-right font-bold">{item.receivedMt.toFixed(2)}</td>
                      <td className="p-2.5 text-right">{item.gradeDownPct.toFixed(1)}%</td>
                      <td className="p-2.5 text-right">
                        {item.moisturePct.toFixed(1)}%
                        {item.excessMoisture > 0.05 && (
                          <span className="text-rose-600 font-bold ml-1">(+{item.excessMoisture.toFixed(1)}%)</span>
                        )}
                      </td>
                      <td className="p-2.5 text-right">{item.dustPct.toFixed(1)}% / {item.ncvPct.toFixed(1)}%</td>
                      <td className="p-2.5 text-right">{Math.round(item.habijabiChattaRopeKg)}</td>
                      <td className="p-2.5 font-sans max-w-[200px] truncate" title={`${item.actualValue} vs ${item.expectedValue}`}>
                        <span className="font-bold text-slate-900">{item.actualValue}</span>
                      </td>
                      <td className="p-2.5 text-center">
                        <span className={cn('px-2 py-0.5 rounded-full text-[9px] font-black uppercase', sevBadge)}>
                          {item.severity}
                        </span>
                      </td>
                      <td className="p-2.5 text-center">
                        <span className={cn('px-2 py-0.5 rounded-full text-[9px] font-bold border', statusBadge)}>
                          {vStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={14} className="p-12 text-center text-slate-400 font-sans">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                    <span className="text-xs font-bold uppercase tracking-wider block text-slate-700">
                      No Broker or Supplier performance anomalies match the active filters.
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= FULL PERFORMANCE RATIONALE MODAL ================= */}
      {selectedAnomaly && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-600/30 border border-rose-400 rounded-xl text-rose-300">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-wider">
                    {selectedAnomaly.anomalyType}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedAnomaly.entityType}: {selectedAnomaly.entityName} · {selectedAnomaly.polarity} ({selectedAnomaly.workflowSection})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAnomaly(null)}
                className="h-8 w-8 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center justify-center transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs font-sans">
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-800">
                    Detection Condition &amp; Performance Rationale
                  </span>
                  <span className={cn(
                    'px-2 py-0.5 rounded-full text-[9px] font-black uppercase',
                    selectedAnomaly.severity === 'High' ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'
                  )}>
                    {selectedAnomaly.severity} Severity
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-900 leading-relaxed">
                  {selectedAnomaly.detectionReason}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px]">
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-500 block font-sans">Performance Score</span>
                  <span className="font-black text-slate-900">{selectedAnomaly.performanceScore.toFixed(1)} / 100</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-500 block font-sans">Received MT</span>
                  <span className="font-bold text-slate-900">{selectedAnomaly.receivedMt.toFixed(2)} MT</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-500 block font-sans">Grade Down %</span>
                  <span className="font-bold text-rose-700">{selectedAnomaly.gradeDownPct.toFixed(2)}%</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-500 block font-sans">Moisture (Limit)</span>
                  <span className="font-bold">{selectedAnomaly.moisturePct.toFixed(1)}% (≤{selectedAnomaly.moistureLimit.toFixed(0)}%)</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-500 block font-sans">Dust %</span>
                  <span className="font-bold">{selectedAnomaly.dustPct.toFixed(2)}%</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-500 block font-sans">NCV %</span>
                  <span className="font-bold">{selectedAnomaly.ncvPct.toFixed(2)}%</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-500 block font-sans">CT (Habi/Chatta/Rope)</span>
                  <span className="font-bold">{Math.round(selectedAnomaly.habijabiChattaRopeKg)} kg</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-500 block font-sans">Ref PO / MR</span>
                  <span className="font-bold">{selectedAnomaly.poNo} / {selectedAnomaly.mrNo}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-100 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Expected Benchmark</span>
                  <span className="font-bold text-emerald-950 font-mono mt-0.5 block">{selectedAnomaly.expectedValue}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Actual Observed</span>
                  <span className="font-bold text-rose-800 font-mono mt-0.5 block">{selectedAnomaly.actualValue}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Variance</span>
                  <span className="font-black text-amber-800 font-mono mt-0.5 block">{selectedAnomaly.difference}</span>
                </div>
              </div>

              <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Recommended Audit Action:</span>
                  <p className="text-xs text-slate-700 font-medium mt-0.5">
                    {selectedAnomaly.recommendedAction}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-bold text-slate-800">Update Audit Status:</span>
                  <div className="flex items-center gap-1.5">
                    {(['Pending Review', 'Under Investigation', 'Verified Legitimate', 'Corrected'] as const).map(st => {
                      const currentStatus = statusOverrides[selectedAnomaly.id] || selectedAnomaly.verificationStatus;
                      const isSelected = currentStatus === st;
                      return (
                        <button
                          type="button"
                          key={st}
                          onClick={() => setStatusOverrides(prev => ({ ...prev, [selectedAnomaly.id]: st }))}
                          className={cn(
                            'px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border',
                            isSelected
                              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-white'
                          )}
                        >
                          {st}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedAnomaly(null)}
                className="px-4 py-1.5 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
