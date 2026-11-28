import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  Search,
  Download,
  Printer,
  X,
  TrendingDown,
  Sparkles,
  Droplets,
  Layers
} from 'lucide-react';
import {
  SystemReportDataset,
  ReportTransactionLine,
  calculateMillInspectionRankings,
  MillInspectionRankingRow
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

interface ExceptionAuditViewProps {
  dataset: SystemReportDataset;
  onDrillDown: (title: string, txns: ReportTransactionLine[]) => void;
  initialBroker?: string;
}

interface PartyExceptionItem {
  id: string;
  part: 'Grade Down Wise' | 'Moisture Wise';
  polarity: 'Too Good' | 'Too Bad';
  entityType: 'Broker' | 'Supplier' | 'Broker / Supplier';
  entityName: string;
  mrCount: number;
  poCount: number;
  receivedMt: number;
  avgGradeDown: number;
  gradeDownLots: number;
  avgMoisture: number;
  avgMoistureLimit: number;
  avgExcessMoisture: number;
  excessMoistureLots: number;
  avgDust: number;
  avgNcv: number;
  habijabiChattaRopeKg: number;
  cleanLots: number;
  cleanRatePct: number;
  performanceScore: number;
  tier: MillInspectionRankingRow['tier'];
  severity: 'High' | 'Medium' | 'Low';
  latestDate: string;
  sampleMr: string;
  samplePo: string;
  detectionReason: string;
  recommendedAction: string;
}

type VerificationStatus = 'Pending Review' | 'Under Investigation' | 'Verified Legitimate' | 'Corrected';

export const ExceptionAuditView: React.FC<ExceptionAuditViewProps> = ({
  dataset,
  initialBroker
}) => {
  const filteredMillInspections = dataset.filteredMillInspections || [];

  const [selectedPartyDetail, setSelectedPartyDetail] = useState<PartyExceptionItem | null>(null);

  // Filters & 2-Part Selection
  const [registerPart, setRegisterPart] = useState<'BOTH' | 'GRADE_DOWN' | 'MOISTURE'>('BOTH');
  const [entityTypeFilter, setEntityTypeFilter] = useState<'ALL' | 'Broker' | 'Supplier'>('ALL');
  const [selectedEntity, setSelectedEntity] = useState<string>(initialBroker || 'ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Status overrides stored locally
  const [statusOverrides, setStatusOverrides] = useState<Record<string, VerificationStatus>>({});

  // =========================================================================
  // PARTY POOL FROM MILL INSPECTION (COMBINED BROKERS & SUPPLIERS, DEDUPLICATED)
  // =========================================================================
  const brokerRows = useMemo(
    () =>
      calculateMillInspectionRankings(filteredMillInspections, 'broker').map(r => ({
        ...r,
        entityType: 'Broker' as const
      })),
    [filteredMillInspections]
  );

  const supplierRows = useMemo(
    () =>
      calculateMillInspectionRankings(filteredMillInspections, 'supplier').map(r => ({
        ...r,
        entityType: 'Supplier' as const
      })),
    [filteredMillInspections]
  );

  const allPartyRows = useMemo(() => {
    if (entityTypeFilter === 'Broker') return brokerRows;
    if (entityTypeFilter === 'Supplier') return supplierRows;

    // Combine matching Broker & Supplier entries under one normalized party key
    // and deduplicate overlapping MRs so no party or MR is double-counted
    const combinedMap = new Map<
      string,
      {
        key: string;
        hasBroker: boolean;
        hasSupplier: boolean;
        recordsByMr: Map<string, (typeof filteredMillInspections)[number]>;
      }
    >();

    const addGroup = (
      rows: Array<MillInspectionRankingRow & { entityType: 'Broker' | 'Supplier' }>,
      role: 'broker' | 'supplier'
    ) => {
      rows.forEach(row => {
        const norm = row.key.trim().replace(/\s+/g, ' ').toUpperCase();
        if (!combinedMap.has(norm)) {
          combinedMap.set(norm, {
            key: norm,
            hasBroker: false,
            hasSupplier: false,
            recordsByMr: new Map()
          });
        }
        const entry = combinedMap.get(norm)!;
        if (role === 'broker') entry.hasBroker = true;
        else entry.hasSupplier = true;
        row.records.forEach((rec, idx) => {
          const mrKey = String(rec.mrNo || rec.id || `${norm}-${idx}`).trim().toUpperCase();
          if (!entry.recordsByMr.has(mrKey)) {
            entry.recordsByMr.set(mrKey, rec);
          }
        });
      });
    };

    addGroup(brokerRows, 'broker');
    addGroup(supplierRows, 'supplier');

    const totalAllValue = filteredMillInspections.reduce((s, r) => s + r.estimatedValue, 0);
    const totalAllMt = filteredMillInspections.reduce((s, r) => s + r.receivedMt, 0);

    return Array.from(combinedMap.values()).map(entry => {
      const records = Array.from(entry.recordsByMr.values());
      const poSet = new Set<string>();
      let totalMt = 0;
      let estimatedValue = 0;
      let weightSum = 0;
      let wGradeDown = 0;
      let wMoisture = 0;
      let wMoistureLimit = 0;
      let wExcessMoisture = 0;
      let wDust = 0;
      let wNcv = 0;
      let wCtPct = 0;
      let totalHabijabiChattaRopeKg = 0;
      let excessMoistureLots = 0;
      let gradeDownLots = 0;
      let dustLots = 0;
      let ncvLots = 0;
      let ctLots = 0;
      let cleanLots = 0;

      records.forEach(rec => {
        if (rec.poNo && rec.poNo !== '-') poSet.add(rec.poNo);
        const wt = rec.receivedMt > 0 ? rec.receivedMt : 1;
        totalMt += rec.receivedMt;
        estimatedValue += rec.estimatedValue;
        weightSum += wt;
        wGradeDown += rec.gradeDownPct * wt;
        wMoisture += rec.actualMoisture * wt;
        wMoistureLimit += rec.moistureLimit * wt;
        wExcessMoisture += rec.excessMoisture * wt;
        wDust += rec.dustPct * wt;
        wNcv += rec.ncvPct * wt;
        wCtPct += rec.ctPct * wt;
        totalHabijabiChattaRopeKg += rec.habijabiChattaRopeKg;

        const hasMoist = rec.excessMoisture > 0.01;
        const hasGd = rec.gradeDownPct > 0.01;
        const hasDust = rec.dustPct > 0.01;
        const hasNcv = rec.ncvPct > 0.01;
        const hasCt = rec.habijabiChattaRopeKg > 0.01 || rec.ctPct > 0.01;

        if (hasMoist) excessMoistureLots += 1;
        if (hasGd) gradeDownLots += 1;
        if (hasDust) dustLots += 1;
        if (hasNcv) ncvLots += 1;
        if (hasCt) ctLots += 1;
        if (!hasMoist && !hasGd && !hasDust && !hasNcv && !hasCt) cleanLots += 1;
      });

      const denom = weightSum > 0 ? weightSum : 1;
      const avgGradeDown = wGradeDown / denom;
      const avgMoisture = wMoisture / denom;
      const avgMoistureLimit = wMoistureLimit / denom;
      const avgExcessMoisture = wExcessMoisture / denom;
      const avgDust = wDust / denom;
      const avgNcv = wNcv / denom;
      const avgCtPct = wCtPct / denom;

      const penaltyGradeDown = Math.min(35, avgGradeDown * 2.5);
      const penaltyMoisture = Math.min(30, avgExcessMoisture * 4.0);
      const penaltyDust = Math.min(15, avgDust * 3.0);
      const penaltyNcv = Math.min(10, avgNcv * 3.0);
      const penaltyCt = Math.min(10, avgCtPct * 2.5);

      const performanceScore = Math.max(
        0,
        Math.min(100, Number((100 - penaltyGradeDown - penaltyMoisture - penaltyDust - penaltyNcv - penaltyCt).toFixed(1)))
      );
      const defectScore = Number((100 - performanceScore).toFixed(1));
      const cleanRatePct = records.length > 0 ? (cleanLots / records.length) * 100 : 100;

      let tier: MillInspectionRankingRow['tier'] = 'Excellent';
      if (performanceScore < 50) tier = 'Poor';
      else if (performanceScore < 70) tier = 'Watch';
      else if (performanceScore < 85) tier = 'Good';

      const entityType: 'Broker' | 'Supplier' | 'Broker / Supplier' =
        entry.hasBroker && entry.hasSupplier
          ? 'Broker / Supplier'
          : entry.hasBroker
            ? 'Broker'
            : 'Supplier';

      return {
        key: entry.key,
        entityType,
        mrCount: records.length,
        poCount: poSet.size,
        totalMt,
        estimatedValue,
        avgGradeDown,
        avgMoisture,
        avgMoistureLimit,
        avgExcessMoisture,
        avgDust,
        avgNcv,
        totalHabijabiChattaRopeKg,
        avgCtPct,
        excessMoistureLots,
        gradeDownLots,
        dustLots,
        ncvLots,
        ctLots,
        cleanLots,
        cleanRatePct,
        performanceScore,
        defectScore,
        tier,
        valueSharePct: totalAllValue > 0 ? (estimatedValue / totalAllValue) * 100 : 0,
        mtSharePct: totalAllMt > 0 ? (totalMt / totalAllMt) * 100 : 0,
        records
      };
    });
  }, [brokerRows, supplierRows, entityTypeFilter, filteredMillInspections]);

  const entityOptions = useMemo(() => {
    const set = new Set<string>();
    allPartyRows.forEach(p => {
      set.add(p.key);
    });
    return Array.from(set).sort();
  }, [allPartyRows]);

  const filteredPartyRows = useMemo(() => {
    return allPartyRows.filter(p => {
      if (selectedEntity !== 'ALL' && p.key.toUpperCase() !== selectedEntity.toUpperCase()) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        if (!p.key.toLowerCase().includes(q) && !p.entityType.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [allPartyRows, selectedEntity, searchQuery]);

  // Helper to convert MillInspectionRankingRow into a rich PartyExceptionItem
  const toPartyExceptionItem = (
    row: (typeof allPartyRows)[number],
    part: 'Grade Down Wise' | 'Moisture Wise',
    polarity: 'Too Good' | 'Too Bad'
  ): PartyExceptionItem => {
    const latestRec = row.records[0];
    const latestDate = latestRec?.date || '—';
    const sampleMr = latestRec?.mrNo || '—';
    const samplePo = latestRec?.poNo || '—';

    let severity: 'High' | 'Medium' | 'Low' = 'Low';
    let detectionReason = '';
    let recommendedAction = '';

    if (part === 'Grade Down Wise') {
      if (polarity === 'Too Bad') {
        severity = row.avgGradeDown >= 10 ? 'High' : row.avgGradeDown >= 5 ? 'Medium' : 'Low';
        detectionReason = `${row.entityType} "${row.key}" averaged ${row.avgGradeDown.toFixed(2)}% Grade Down across ${row.gradeDownLots} of ${row.mrCount} Mill Inspection MRs (${row.totalMt.toFixed(2)} MT).`;
        recommendedAction = `Verify contracted grade specifications vs delivered fiber grade and enforce full Grade Down deduction at settlement.`;
      } else {
        severity = 'Low';
        detectionReason = `${row.entityType} "${row.key}" maintained ${row.avgGradeDown.toFixed(2)}% avg Grade Down across ${row.mrCount} Mill Inspection MRs (${row.totalMt.toFixed(2)} MT) with ${row.cleanRatePct.toFixed(0)}% clean lots.`;
        recommendedAction = `Benchmark as top Grade-compliant ${row.entityType.toLowerCase()}; periodically blind-check sample lots to validate zero-defect consistency.`;
      }
    } else {
      if (polarity === 'Too Bad') {
        severity = row.avgExcessMoisture >= 2.5 ? 'High' : row.avgExcessMoisture >= 1.0 ? 'Medium' : 'Low';
        detectionReason = `${row.entityType} "${row.key}" recorded ${row.avgMoisture.toFixed(1)}% avg Moisture (+${row.avgExcessMoisture.toFixed(2)}% above ${row.avgMoistureLimit.toFixed(0)}% seasonal limit) across ${row.excessMoistureLots} of ${row.mrCount} MRs.`;
        recommendedAction = `Apply strict seasonal moisture claim deduction at MR Settlement and issue drying compliance notice.`;
      } else {
        severity = 'Low';
        detectionReason = `${row.entityType} "${row.key}" maintained ${row.avgMoisture.toFixed(1)}% avg Moisture (limit ${row.avgMoistureLimit.toFixed(0)}%, excess +${row.avgExcessMoisture.toFixed(2)}%) across ${row.mrCount} MRs (${row.totalMt.toFixed(2)} MT).`;
        recommendedAction = `Recognize as top moisture-compliant ${row.entityType.toLowerCase()} within seasonal DAISEE/Standard tolerance limits.`;
      }
    }

    return {
      id: `${part}-${polarity}-${row.entityType}-${row.key}`,
      part,
      polarity,
      entityType: row.entityType,
      entityName: row.key,
      mrCount: row.mrCount,
      poCount: row.poCount,
      receivedMt: row.totalMt,
      avgGradeDown: row.avgGradeDown,
      gradeDownLots: row.gradeDownLots,
      avgMoisture: row.avgMoisture,
      avgMoistureLimit: row.avgMoistureLimit,
      avgExcessMoisture: row.avgExcessMoisture,
      excessMoistureLots: row.excessMoistureLots,
      avgDust: row.avgDust,
      avgNcv: row.avgNcv,
      habijabiChattaRopeKg: row.totalHabijabiChattaRopeKg,
      cleanLots: row.cleanLots,
      cleanRatePct: row.cleanRatePct,
      performanceScore: row.performanceScore,
      tier: row.tier,
      severity,
      latestDate,
      sampleMr,
      samplePo,
      detectionReason,
      recommendedAction
    };
  };

  // =========================================================================
  // CHART 1: GRADE DOWN WISE (Stacked Bar by Party — High / Medium / Low GD Lots)
  // =========================================================================
  const gradeDownChartData = useMemo(() => {
    const withGd = filteredPartyRows
      .filter(p => p.gradeDownLots > 0 || p.avgGradeDown > 0)
      .map(p => {
        let high = 0;
        let medium = 0;
        let low = 0;
        p.records.forEach(r => {
          if (r.gradeDownPct >= 10) high += 1;
          else if (r.gradeDownPct >= 5) medium += 1;
          else if (r.gradeDownPct > 0.01) low += 1;
        });
        const shortName = p.key.length > 15 ? `${p.key.slice(0, 13)}…` : p.key;
        return {
          party: shortName,
          fullName: `${p.key} (${p.entityType})`,
          High: high,
          Medium: medium,
          Low: low,
          totalGdLots: high + medium + low,
          avgGradeDown: Number(p.avgGradeDown.toFixed(2))
        };
      })
      .sort((a, b) => b.totalGdLots - a.totalGdLots || b.avgGradeDown - a.avgGradeDown)
      .slice(0, 12);

    return withGd;
  }, [filteredPartyRows]);

  // =========================================================================
  // CHART 2: MOISTURE WISE (Avg Moisture % Split into Within Limit % + Excess Above Limit %)
  // =========================================================================
  const moistureChartData = useMemo(() => {
    return filteredPartyRows
      .filter(p => p.avgMoisture > 0 && (p.avgExcessMoisture > 0.01 || p.excessMoistureLots > 0))
      .map(p => {
        const shortName = p.key.length > 15 ? `${p.key.slice(0, 13)}…` : p.key;
        const withinLimit = Number(Math.min(p.avgMoisture, p.avgMoistureLimit).toFixed(2));
        const excessPct = Number(Math.max(0, p.avgMoisture - p.avgMoistureLimit).toFixed(2));
        return {
          party: shortName,
          fullName: `${p.key} (${p.entityType})`,
          withinLimit,
          excessPct,
          avgMoisture: Number(p.avgMoisture.toFixed(2)),
          avgMoistureLimit: Number(p.avgMoistureLimit.toFixed(1)),
          avgExcessMoisture: Number(p.avgExcessMoisture.toFixed(2)),
          mrCount: p.mrCount
        };
      })
      .sort((a, b) => b.avgExcessMoisture - a.avgExcessMoisture || b.avgMoisture - a.avgMoisture || b.mrCount - a.mrCount)
      .slice(0, 12);
  }, [filteredPartyRows]);

  // =========================================================================
  // PART 1: GRADE DOWN WISE — TOP 10 TOO GOOD & TOP 10 TOO BAD PARTIES
  // =========================================================================
  const gradeDownTop10TooBad = useMemo(() => {
    return [...filteredPartyRows]
      .filter(p => p.avgGradeDown > 0.01 || p.gradeDownLots > 0)
      .sort((a, b) => b.avgGradeDown - a.avgGradeDown || b.gradeDownLots - a.gradeDownLots || b.totalMt - a.totalMt)
      .slice(0, 10)
      .map(r => toPartyExceptionItem(r, 'Grade Down Wise', 'Too Bad'));
  }, [filteredPartyRows]);

  const gradeDownTop10TooGood = useMemo(() => {
    return [...filteredPartyRows]
      .sort((a, b) => a.avgGradeDown - b.avgGradeDown || b.mrCount - a.mrCount || b.totalMt - a.totalMt)
      .slice(0, 10)
      .map(r => toPartyExceptionItem(r, 'Grade Down Wise', 'Too Good'));
  }, [filteredPartyRows]);

  // =========================================================================
  // PART 2: MOISTURE WISE — TOP 10 TOO GOOD & TOP 10 TOO BAD PARTIES
  // =========================================================================
  const moistureTop10TooBad = useMemo(() => {
    return [...filteredPartyRows]
      .filter(p => p.avgExcessMoisture > 0.01 || p.excessMoistureLots > 0)
      .sort((a, b) => b.avgExcessMoisture - a.avgExcessMoisture || b.excessMoistureLots - a.excessMoistureLots || b.avgMoisture - a.avgMoisture)
      .slice(0, 10)
      .map(r => toPartyExceptionItem(r, 'Moisture Wise', 'Too Bad'));
  }, [filteredPartyRows]);

  const moistureTop10TooGood = useMemo(() => {
    return [...filteredPartyRows]
      .sort((a, b) => a.avgExcessMoisture - b.avgExcessMoisture || a.avgMoisture - b.avgMoisture || b.mrCount - a.mrCount || b.totalMt - a.totalMt)
      .slice(0, 10)
      .map(r => toPartyExceptionItem(r, 'Moisture Wise', 'Too Good'));
  }, [filteredPartyRows]);

  // KPI Ribbon stats
  const totalPartiesEvaluated = filteredPartyRows.length;
  const gdFlaggedParties = filteredPartyRows.filter(p => p.avgGradeDown > 0.01 || p.gradeDownLots > 0).length;
  const moistFlaggedParties = filteredPartyRows.filter(p => p.avgExcessMoisture > 0.01 || p.excessMoistureLots > 0).length;
  const zeroDefectParties = filteredPartyRows.filter(p => p.avgGradeDown <= 0.01 && p.avgExcessMoisture <= 0.01).length;

  const handleExportCSV = () => {
    const allRows: PartyExceptionItem[] = [
      ...(registerPart !== 'MOISTURE' ? [...gradeDownTop10TooGood, ...gradeDownTop10TooBad] : []),
      ...(registerPart !== 'GRADE_DOWN' ? [...moistureTop10TooGood, ...moistureTop10TooBad] : [])
    ];
    if (!allRows.length) return;

    const headers = [
      'Section',
      'Category',
      'Rank',
      'Party Type',
      'Party Name',
      'Insp MRs',
      'Received MT',
      'Avg Grade Down %',
      'Avg Moisture %',
      'Moisture Limit %',
      'Avg Excess Moisture %',
      'Quality Score',
      'Status'
    ];

    const buildChunk = (items: PartyExceptionItem[]) =>
      items.map((a, idx) => [
        `"${a.part}"`,
        `"${a.polarity}"`,
        idx + 1,
        a.entityType,
        `"${a.entityName}"`,
        a.mrCount,
        a.receivedMt.toFixed(2),
        a.avgGradeDown.toFixed(2),
        a.avgMoisture.toFixed(1),
        a.avgMoistureLimit.toFixed(0),
        a.avgExcessMoisture.toFixed(2),
        a.performanceScore.toFixed(1),
        `"${statusOverrides[a.id] || 'Pending Review'}"`
      ]);

    const csvRows = [
      ...(registerPart !== 'MOISTURE' ? [...buildChunk(gradeDownTop10TooGood), ...buildChunk(gradeDownTop10TooBad)] : []),
      ...(registerPart !== 'GRADE_DOWN' ? [...buildChunk(moistureTop10TooGood), ...buildChunk(moistureTop10TooBad)] : [])
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...csvRows.map(r => r.join(','))].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `exception_grade_down_moisture_top10_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderTop10Table = (
    items: PartyExceptionItem[],
    part: 'Grade Down Wise' | 'Moisture Wise',
    polarity: 'Too Good' | 'Too Bad'
  ) => {
    const isGood = polarity === 'Too Good';
    const isGd = part === 'Grade Down Wise';

    return (
      <div className={cn(
        'bg-white rounded-xl border shadow-2xs overflow-hidden flex flex-col',
        isGood ? 'border-emerald-200' : 'border-rose-200'
      )}>
        <div className={cn(
          'px-3.5 py-2.5 border-b flex items-center justify-between gap-2',
          isGood ? 'bg-emerald-50/80 border-emerald-200' : 'bg-rose-50/80 border-rose-200'
        )}>
          <div className="flex items-center gap-2">
            {isGood ? (
              <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-700 shrink-0" />
            )}
            <div>
              <h5 className={cn(
                'text-xs font-black uppercase tracking-wider',
                isGood ? 'text-emerald-900' : 'text-rose-900'
              )}>
                Top 10 {polarity} Parties — {part}
              </h5>
              <p className={cn('text-[10.5px]', isGood ? 'text-emerald-700' : 'text-rose-700')}>
                {isGd
                  ? isGood
                    ? 'Lowest Avg Grade Down % with highest inspected lot volume'
                    : 'Highest Avg Grade Down % & Grade Down lot concentration'
                  : isGood
                    ? 'Lowest Excess Moisture % within active seasonal tolerance limit'
                    : 'Highest Excess Moisture % above active seasonal DAISEE / Standard limit'}
              </p>
            </div>
          </div>
          <span className={cn(
            'text-[10px] font-black font-mono px-2 py-0.5 rounded-full border shrink-0',
            isGood
              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
              : 'bg-rose-100 text-rose-800 border-rose-300'
          )}>
            {items.length} / 10
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-wider border-b border-slate-200">
                <th className="p-2 w-10 text-center">#</th>
                <th className="p-2">Type</th>
                <th className="p-2">Party Name</th>
                <th className="p-2 text-right">MRs</th>
                <th className="p-2 text-right">MT</th>
                {isGd ? (
                  <th className="p-2 text-right">Avg GD %</th>
                ) : (
                  <>
                    <th className="p-2 text-right">Avg Moist</th>
                    <th className="p-2 text-right">Excess %</th>
                  </>
                )}
                <th className="p-2 text-right">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-700">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={isGd ? 7 : 8} className="p-8 text-center text-slate-400 font-sans">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                    No parties match this criteria under active filters.
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedPartyDetail(item)}
                    className={cn(
                      'transition cursor-pointer select-none',
                      isGood ? 'hover:bg-emerald-50/50' : 'hover:bg-rose-50/50'
                    )}
                  >
                    <td className="p-2 text-center font-bold text-slate-400">#{idx + 1}</td>
                    <td className="p-2 font-sans">
                      <span className={cn(
                        'px-1.5 py-0.5 rounded text-[9.5px] font-bold border',
                        item.entityType === 'Broker'
                          ? 'bg-slate-100 text-slate-700 border-slate-200'
                          : item.entityType === 'Broker / Supplier'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-sky-50 text-sky-700 border-sky-200'
                      )}>
                        {item.entityType}
                      </span>
                    </td>
                    <td className="p-2 font-sans font-bold text-slate-900 max-w-[170px] truncate" title={item.entityName}>
                      {item.entityName}
                    </td>
                    <td className="p-2 text-right">{item.mrCount}</td>
                    <td className="p-2 text-right font-semibold">{item.receivedMt.toFixed(1)}</td>
                    {isGd ? (
                      <td className={cn(
                        'p-2 text-right font-black',
                        item.avgGradeDown >= 5 ? 'text-rose-700' : item.avgGradeDown > 0 ? 'text-amber-700' : 'text-emerald-700'
                      )}>
                        {item.avgGradeDown.toFixed(2)}%
                      </td>
                    ) : (
                      <>
                        <td className="p-2 text-right font-semibold text-slate-800">
                          {item.avgMoisture.toFixed(1)}%
                        </td>
                        <td className={cn(
                          'p-2 text-right font-black',
                          item.avgExcessMoisture >= 1.5 ? 'text-rose-700' : item.avgExcessMoisture > 0.05 ? 'text-amber-700' : 'text-emerald-700'
                        )}>
                          {item.avgExcessMoisture > 0.01 ? `+${item.avgExcessMoisture.toFixed(2)}%` : '0.00%'}
                        </td>
                      </>
                    )}
                    <td className="p-2 text-right font-black text-slate-900">
                      {item.performanceScore.toFixed(0)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
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
              Exception &amp; Abnormal Data Audit (Grade Down Wise &amp; Moisture Wise)
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Mill Inspection Grade Down &amp; Seasonal Moisture performance audit showing Top 10 Too Good &amp; Top 10 Too Bad Parties
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
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Parties Evaluated</span>
          <span className="text-xl font-black text-slate-900 font-mono tabular-nums mt-0.5 block">{totalPartiesEvaluated}</span>
          <span className="text-[10px] text-slate-500">Brokers &amp; Suppliers in Mill Insp</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-rose-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">Grade Down Parties</span>
          <span className="text-xl font-black text-rose-700 font-mono tabular-nums mt-0.5 block">{gdFlaggedParties}</span>
          <span className="text-[10px] text-rose-600">Parties with Grade Down &gt; 0%</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">Moisture Excess Parties</span>
          <span className="text-xl font-black text-amber-800 font-mono tabular-nums mt-0.5 block">{moistFlaggedParties}</span>
          <span className="text-[10px] text-amber-700">Exceeding seasonal DAISEE / Std limit</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Clean (Too Good) Parties</span>
          <span className="text-xl font-black text-emerald-800 font-mono tabular-nums mt-0.5 block">{zeroDefectParties}</span>
          <span className="text-[10px] text-emerald-700">0% Grade Down &amp; within moisture limit</span>
        </div>
      </div>

      {/* ================= CHARTS ROW: GRADE DOWN WISE + MOISTURE WISE ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1: Grade Down Wise */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2">
          <div className="pb-2 border-b border-slate-100 flex items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Grade Down Wise
              </h4>
              <p className="text-[11px] text-slate-500">
                Top parties ranked by Mill Inspection Grade Down lot severity (High ≥10%, Medium 5–10%, Low &gt;0–5%)
              </p>
            </div>
            <span className="text-[10px] font-mono text-slate-400 shrink-0">Mill Inspection</span>
          </div>
          <div style={{ width: '100%', height: 300 }}>
            {gradeDownChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No Grade Down lots recorded in current filter range.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gradeDownChartData} margin={{ top: 10, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="party"
                    tick={{ fontSize: 9.5, fill: '#334155', fontWeight: 600 }}
                    angle={-25}
                    textAnchor="end"
                    interval={0}
                    height={68}
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'monospace' }} allowDecimals={false} />
                  <Tooltip
                    formatter={(val: any, name: any) => [`${val} MRs`, name]}
                    labelFormatter={(label: any, payload: any) => {
                      const row = payload?.[0]?.payload;
                      return row ? `${row.fullName} · Avg GD: ${row.avgGradeDown}%` : label;
                    }}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                  <Bar dataKey="High" stackId="gd" name="High GD (≥10%)" fill="#be123c" />
                  <Bar dataKey="Medium" stackId="gd" name="Medium GD (5–10%)" fill="#d97706" />
                  <Bar dataKey="Low" stackId="gd" name="Low GD (>0–5%)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Moisture Wise */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2">
          <div className="pb-2 border-b border-slate-100 flex items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Moisture Wise
              </h4>
              <p className="text-[11px] text-slate-500">
                Top parties ranked by Avg Excess Moisture % above active seasonal limit (Jul–Dec: 20%/18% · Jan–Jun: 18%/16%)
              </p>
            </div>
            <span className="text-[10px] font-mono text-slate-400 shrink-0">Mill Inspection</span>
          </div>
          <div style={{ width: '100%', height: 300 }}>
            {moistureChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No excess moisture records found in current filter range.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={moistureChartData} margin={{ top: 10, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="party"
                    tick={{ fontSize: 9.5, fill: '#334155', fontWeight: 600 }}
                    angle={-25}
                    textAnchor="end"
                    interval={0}
                    height={68}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'monospace' }}
                    tickFormatter={(v) => `${v}%`}
                    width={44}
                  />
                  <Tooltip
                    formatter={(val: any, name: any) => [`${Number(val).toFixed(2)}%`, name]}
                    labelFormatter={(label: any, payload: any) => {
                      const row = payload?.[0]?.payload;
                      return row
                        ? `${row.fullName} · Avg: ${row.avgMoisture}% (Limit ${row.avgMoistureLimit}%, Excess +${row.avgExcessMoisture}% · ${row.mrCount} MRs)`
                        : label;
                    }}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                  <Bar dataKey="withinLimit" stackId="moist" name="Within Limit (%)" fill="#0284c7" />
                  <Bar dataKey="excessPct" stackId="moist" name="Excess Above Limit (%)" fill="#e11d48" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ================= FILTER & 2-PART SELECTION TOOLBAR ================= */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* 2-Part Selector: Grade Down Wise / Moisture Wise */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setRegisterPart('BOTH')}
              className={cn(
                'px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition',
                registerPart === 'BOTH' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Both Parts
            </button>
            <button
              type="button"
              onClick={() => setRegisterPart('GRADE_DOWN')}
              className={cn(
                'px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition flex items-center gap-1',
                registerPart === 'GRADE_DOWN' ? 'bg-[#D94B5A] text-white' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Layers className="w-3 h-3" />
              <span>Grade Down Wise</span>
            </button>
            <button
              type="button"
              onClick={() => setRegisterPart('MOISTURE')}
              className={cn(
                'px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition flex items-center gap-1',
                registerPart === 'MOISTURE' ? 'bg-[#D94B5A] text-white' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Droplets className="w-3 h-3" />
              <span>Moisture Wise</span>
            </button>
          </div>

          {/* Party Type Selector */}
          <select
            value={entityTypeFilter}
            onChange={(e) => {
              setEntityTypeFilter(e.target.value as 'ALL' | 'Broker' | 'Supplier');
              setSelectedEntity('ALL');
            }}
            className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
          >
            <option value="ALL">Brokers &amp; Suppliers</option>
            <option value="Broker">Brokers Only</option>
            <option value="Supplier">Suppliers Only</option>
          </select>

          {/* Specific Party Dropdown */}
          <select
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
            className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 max-w-[190px]"
          >
            <option value="ALL">All Parties ({entityOptions.length})</option>
            {entityOptions.map((b, idx) => (
              <option key={idx} value={b}>{b}</option>
            ))}
          </select>

          {/* Search Party */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search Broker or Supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-slate-800 w-48 sm:w-56"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(entityTypeFilter !== 'ALL' || selectedEntity !== 'ALL' || searchQuery || registerPart !== 'BOTH') && (
            <button
              type="button"
              onClick={() => {
                setRegisterPart('BOTH');
                setEntityTypeFilter('ALL');
                setSelectedEntity('ALL');
                setSearchQuery('');
              }}
              className="text-xs text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
            >
              Reset
            </button>
          )}
          <span className="text-[11px] font-bold text-slate-500">
            Click any party row for full audit details
          </span>
        </div>
      </div>

      {/* ================= PERFORMANCE EXCEPTION REGISTER (2 PARTS: GRADE DOWN & MOISTURE) ================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-5">

        {/* PART 1: GRADE DOWN WISE */}
        {(registerPart === 'BOTH' || registerPart === 'GRADE_DOWN') && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider">
                Part 1
              </span>
              <h5 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Grade Down Wise — Top 10 Too Good &amp; Top 10 Too Bad Parties
              </h5>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {renderTop10Table(gradeDownTop10TooGood, 'Grade Down Wise', 'Too Good')}
              {renderTop10Table(gradeDownTop10TooBad, 'Grade Down Wise', 'Too Bad')}
            </div>
          </div>
        )}

        {/* PART 2: MOISTURE WISE */}
        {(registerPart === 'BOTH' || registerPart === 'MOISTURE') && (
          <div className={cn('space-y-3', registerPart === 'BOTH' && 'pt-4 border-t border-slate-200')}>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-[#D94B5A] text-white text-[10px] font-black uppercase tracking-wider">
                Part 2
              </span>
              <h5 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Moisture Wise — Top 10 Too Good &amp; Top 10 Too Bad Parties
              </h5>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {renderTop10Table(moistureTop10TooGood, 'Moisture Wise', 'Too Good')}
              {renderTop10Table(moistureTop10TooBad, 'Moisture Wise', 'Too Bad')}
            </div>
          </div>
        )}
      </div>

      {/* ================= FULL PERFORMANCE RATIONALE MODAL ================= */}
      {selectedPartyDetail && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'p-2 rounded-xl border',
                  selectedPartyDetail.polarity === 'Too Good'
                    ? 'bg-emerald-600/30 border-emerald-400 text-emerald-300'
                    : 'bg-rose-600/30 border-rose-400 text-rose-300'
                )}>
                  {selectedPartyDetail.polarity === 'Too Good' ? (
                    <Sparkles className="w-5 h-5" />
                  ) : (
                    <ShieldAlert className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-wider">
                    {selectedPartyDetail.part} · {selectedPartyDetail.polarity}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedPartyDetail.entityType}: {selectedPartyDetail.entityName} ({selectedPartyDetail.mrCount} MRs · {selectedPartyDetail.receivedMt.toFixed(2)} MT)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPartyDetail(null)}
                className="h-8 w-8 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center justify-center transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs font-sans">
              <div className={cn(
                'p-4 rounded-xl border space-y-1.5',
                selectedPartyDetail.polarity === 'Too Good'
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-rose-50 border-rose-200'
              )}>
                <div className="flex items-center justify-between">
                  <span className={cn(
                    'text-[10px] font-black uppercase tracking-wider',
                    selectedPartyDetail.polarity === 'Too Good' ? 'text-emerald-800' : 'text-rose-800'
                  )}>
                    Mill Inspection Performance Summary
                  </span>
                  <span className={cn(
                    'px-2 py-0.5 rounded-full text-[9px] font-black uppercase',
                    selectedPartyDetail.polarity === 'Too Good' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                  )}>
                    Score {selectedPartyDetail.performanceScore.toFixed(1)} / 100 ({selectedPartyDetail.tier})
                  </span>
                </div>
                <p className="text-slate-800 font-medium leading-relaxed">
                  {selectedPartyDetail.detectionReason}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-sans font-bold uppercase text-slate-500 block">Avg Grade Down</span>
                  <span className="text-base font-black text-slate-900 mt-0.5 block">{selectedPartyDetail.avgGradeDown.toFixed(2)}%</span>
                  <span className="text-[10px] text-slate-500">{selectedPartyDetail.gradeDownLots}/{selectedPartyDetail.mrCount} MRs</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-sans font-bold uppercase text-slate-500 block">Avg Moisture</span>
                  <span className="text-base font-black text-slate-900 mt-0.5 block">{selectedPartyDetail.avgMoisture.toFixed(1)}%</span>
                  <span className="text-[10px] text-slate-500">Limit {selectedPartyDetail.avgMoistureLimit.toFixed(0)}% (+{selectedPartyDetail.avgExcessMoisture.toFixed(2)}%)</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-sans font-bold uppercase text-slate-500 block">Dust / NCV</span>
                  <span className="text-base font-black text-slate-900 mt-0.5 block">{selectedPartyDetail.avgDust.toFixed(1)}% / {selectedPartyDetail.avgNcv.toFixed(1)}%</span>
                  <span className="text-[10px] text-slate-500">CT: {Math.round(selectedPartyDetail.habijabiChattaRopeKg)} kg</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-sans font-bold uppercase text-slate-500 block">Inspected Volume</span>
                  <span className="text-base font-black text-slate-900 mt-0.5 block">{selectedPartyDetail.receivedMt.toFixed(2)} MT</span>
                  <span className="text-[10px] text-slate-500">Latest: {selectedPartyDetail.latestDate}</span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  Recommended Audit Action
                </span>
                <p className="text-slate-700 font-medium">{selectedPartyDetail.recommendedAction}</p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-500">
                  Audit Status: <strong className="text-slate-900">{statusOverrides[selectedPartyDetail.id] || 'Pending Review'}</strong>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(['Pending Review', 'Under Investigation', 'Verified Legitimate', 'Corrected'] as VerificationStatus[]).map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusOverrides(prev => ({ ...prev, [selectedPartyDetail.id]: st }))}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer transition',
                        (statusOverrides[selectedPartyDetail.id] || 'Pending Review') === st
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      )}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
