import React, { useEffect, useMemo, useState } from 'react';
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
import {
  Search,
  Download,
  RefreshCcw,
  TrendingDown,
  Filter
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { exportToCSV } from '../../utils/exportHelpers';
import { ReportFilterCriteria } from '../../services/systemReportEngine';
import { extractInspectionMrNo } from '../../lib/mrNumberUtils';
import { HorizontalRankBarChart } from '../reports/charts/HorizontalRankBarChart';
import { HistogramChart } from '../reports/charts/HistogramChart';
import { matchesFilters } from './newCustomReportsFilterService';

interface GradeDownReportViewProps {
  filters?: ReportFilterCriteria;
}

interface GradeDownMrRow {
  id: string;
  mrNo: string;
  mrDate: string;
  poNo: string;
  broker: string;
  supplier: string;
  area: string;
  agency: string;
  arrivalGrade: string;
  stockGrade: string;
  marka: string;
  lorryNo: string;
  weightMt: number;
  actualGdPct: number;
  claimGdPct: number;
  settledGdPct: number;
  effectiveGdPct: number;
  gdDeductionAmt: number;
  hasGradeDown: boolean;
}

type GroupDimension = 'grade' | 'broker' | 'supplier' | 'area' | 'mr';

const normPoKey = (v: any): string =>
  String(v || '')
    .trim()
    .replace(/^#+/, '')
    .replace(/\(PTF\)/gi, '')
    .trim()
    .toUpperCase();

const canonicalMrKey = (v: any): string => {
  const s = String(v || '').trim().toUpperCase();
  if (!s || s === '-' || s === 'N/A' || s.startsWith('AR')) return '';
  const seq = s.match(/(\d+)$/);
  return seq ? `MR_${parseInt(seq[1], 10)}` : s;
};

const toMtSafe = (raw: any): number => {
  const n = Number(raw || 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n >= 500) return n / 1000;
  if (n > 50 && n < 500) return n / 10;
  return n;
};

export const GradeDownReportView: React.FC<GradeDownReportViewProps> = ({ filters }) => {
  const [rows, setRows] = useState<GradeDownMrRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState<GroupDimension>('grade');
  const [onlyAffected, setOnlyAffected] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEntityKey, setSelectedEntityKey] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    try {
      if (!supabase) {
        setRows([]);
        return;
      }

      const [inspRes, inspDetRes, settRes, settDetRes, scpRes, poRes] = await Promise.all([
        supabase.from('material_inspection').select('*').order('created_at', { ascending: false }),
        supabase.from('material_inspection_details').select('*').then(r => r, () => ({ data: [] })),
        supabase.from('mr_settlement_master').select('*').then(r => r, () => ({ data: [] })),
        supabase.from('mr_settlement_detail').select('*').then(r => r, () => ({ data: [] })),
        supabase.from('sauda_check_point').select('*').then(r => r, () => ({ data: [] })),
        supabase.from('purchase_master').select('*').then(r => r, () => ({ data: [] }))
      ]);

      const inspections = inspRes.data || [];
      const inspDetails = (inspDetRes as any)?.data || [];
      const settlements = (settRes as any)?.data || [];
      const settDetails = (settDetRes as any)?.data || [];
      const scps = (scpRes as any)?.data || [];
      const pos = (poRes as any)?.data || [];

      // Exact PO metadata lookup
      const poMetaMap = new Map<string, any>();
      [...pos, ...scps].forEach((p: any) => {
        const k = normPoKey(p.po_no || p.contract_po_no || p.sauda_no);
        if (k) {
          const prev = poMetaMap.get(k) || {};
          poMetaMap.set(k, {
            broker: p.broker || prev.broker || 'DIRECT',
            supplier: p.supplier || p.challan_supplier || prev.supplier || 'UNKNOWN',
            area: p.area || prev.area || 'UNASSIGNED',
            agency: p.agency || prev.agency || '-',
            grade: p.grade || p.quality || prev.grade || '-'
          });
        }
      });

      // Settlement grade-down lookup by canonical MR key
      const settGdByMr = new Map<string, { gdClaim: number; gdSett: number; valueAmt: number; lessAmt: number }>();
      settlements.forEach((s: any) => {
        const mk = canonicalMrKey(s.mr_no);
        if (!mk) return;
        const prev = settGdByMr.get(mk) || { gdClaim: 0, gdSett: 0, valueAmt: 0, lessAmt: 0 };
        settGdByMr.set(mk, {
          gdClaim: Math.max(prev.gdClaim, Number(s.gd_claim || s.claim_grade_down || 0)),
          gdSett: Math.max(prev.gdSett, Number(s.gd_sett || s.settlement_grade_down || 0)),
          valueAmt: Math.max(prev.valueAmt, Number(s.value_amt || s.val_material_value || 0)),
          lessAmt: Math.max(prev.lessAmt, Number(s.val_less_amt || s.val_less_amount || s.summary_less_amount || 0))
        });
      });

      settDetails.forEach((d: any) => {
        const mk = canonicalMrKey(d.mr_no);
        if (!mk) return;
        const prev = settGdByMr.get(mk) || { gdClaim: 0, gdSett: 0, valueAmt: 0, lessAmt: 0 };
        settGdByMr.set(mk, {
          gdClaim: Math.max(prev.gdClaim, Number(d.gd_claim || 0)),
          gdSett: Math.max(prev.gdSett, Number(d.gd_sett || 0)),
          valueAmt: prev.valueAmt,
          lessAmt: prev.lessAmt
        });
      });

      // Group material_inspection_details by canonical MR key
      const detailRowsByMr = new Map<string, any[]>();
      inspDetails.forEach((d: any) => {
        const mk = canonicalMrKey(d.mr_no || d.arrival_no);
        if (!mk) return;
        const arr = detailRowsByMr.get(mk) || [];
        arr.push(d);
        detailRowsByMr.set(mk, arr);
      });

      // Deduplicate inspections strictly by Final M.R. No. (MR...)
      const seenMrs = new Set<string>();
      const builtRows: GradeDownMrRow[] = [];

      inspections.forEach((insp: any, inspIdx: number) => {
        const finalMrNo = extractInspectionMrNo(insp);
        if (!finalMrNo || !/^MR/i.test(finalMrNo)) return;
        const mk = canonicalMrKey(finalMrNo);
        if (!mk || seenMrs.has(mk)) return;
        seenMrs.add(mk);

        const poNo = String(insp.po_no || insp.mill_po_no || insp.contract_po_no || '').trim().toUpperCase();
        const poKey = normPoKey(poNo);
        const poMeta = poKey ? poMetaMap.get(poKey) : undefined;
        const settInfo = settGdByMr.get(mk);

        const mrDate = String(insp.mr_date || insp.date || insp.arrival_date || insp.created_at || '').split('T')[0];
        const broker = String(insp.broker_name || insp.broker || poMeta?.broker || 'DIRECT').trim().toUpperCase();
        const supplier = String(insp.supplier_name || insp.supplier || poMeta?.supplier || 'UNKNOWN SUPPLIER').trim().toUpperCase();
        const area = String(insp.area || poMeta?.area || 'UNASSIGNED AREA').trim().toUpperCase();
        const agency = String(insp.agency || poMeta?.agency || '-').trim().toUpperCase();
        const lorryNo = String(insp.lorry_number || insp.lorry_no || '-').trim().toUpperCase();

        // Parse grid_details or material_inspection_details
        let subRows: any[] = [];
        const rawGrid = insp.grid_details || insp.details;
        if (rawGrid) {
          try {
            const parsed = typeof rawGrid === 'string' ? JSON.parse(rawGrid) : rawGrid;
            if (Array.isArray(parsed) && parsed.length > 0) subRows = parsed;
          } catch {
            // ignore
          }
        }
        if (subRows.length === 0) {
          subRows = detailRowsByMr.get(mk) || [];
        }

        if (subRows.length > 0) {
          subRows.forEach((r: any, rIdx: number) => {
            const wt = toMtSafe(
              r.final_receipt_wt ||
              r.reduced_weight ||
              r.netto_pnto ||
              r.receipt_gross_wt ||
              r.challan_gross_wt ||
              r.gross_weight ||
              0
            );
            const actualGd = Number(r.grade_down_act ?? r.actual_grade_down ?? (rIdx === 0 ? insp.actual_grade_down : 0) ?? 0);
            const claimGd = Number(r.grade_down_claim ?? r.claim_grade_down ?? (rIdx === 0 ? insp.claim_grade_down : 0) ?? 0);
            const rowSettGd = Number(r.settlement_grade_down ?? (rIdx === 0 ? insp.settlement_grade_down : 0) ?? 0);
            const settledGd = rowSettGd > 0 ? rowSettGd : (rIdx === 0 ? (settInfo?.gdSett || 0) : 0);
            const finalClaimGd = claimGd > 0 ? claimGd : (rIdx === 0 ? (settInfo?.gdClaim || 0) : 0);
            const effectiveGd = settledGd > 0 ? settledGd : (finalClaimGd > 0 ? finalClaimGd : actualGd);

            const arrGrade = String(r.arrival_grade || r.grade || poMeta?.grade || 'UNSPECIFIED').trim().toUpperCase();
            const stockGrade = String(r.stock_grade_name || r.stock_grade_code || arrGrade).trim().toUpperCase();
            const rowArea = String(r.area || area).trim().toUpperCase();
            const rowAgency = String(r.agency || agency).trim().toUpperCase();
            const marka = String(r.marka || r.marks || '-').trim().toUpperCase();

            // Estimate grade-down monetary impact if settlement/inspection deduction exists
            const rawLess = rIdx === 0 ? Math.max(Number(insp.deduction_amount || 0), settInfo?.lessAmt || 0) : 0;
            const gdDeductionAmt = effectiveGd > 0 ? rawLess : 0;

            builtRows.push({
              id: `${finalMrNo}_${rIdx}_${inspIdx}`,
              mrNo: finalMrNo.toUpperCase(),
              mrDate,
              poNo: poNo || '-',
              broker,
              supplier,
              area: rowArea,
              agency: rowAgency,
              arrivalGrade: arrGrade,
              stockGrade,
              marka,
              lorryNo,
              weightMt: Number(wt.toFixed(3)),
              actualGdPct: Number(actualGd.toFixed(2)),
              claimGdPct: Number(finalClaimGd.toFixed(2)),
              settledGdPct: Number(settledGd.toFixed(2)),
              effectiveGdPct: Number(effectiveGd.toFixed(2)),
              gdDeductionAmt: Math.round(gdDeductionAmt),
              hasGradeDown: actualGd > 0 || finalClaimGd > 0 || settledGd > 0
            });
          });
        } else {
          const wt = toMtSafe(
            insp.final_receipt_wt ||
            insp.total_final_receipt_wt ||
            insp.reduced_weight ||
            insp.challan_gross_wt ||
            insp.gross_weight ||
            0
          );
          const actualGd = Number(insp.actual_grade_down || insp.grade_down_act || 0);
          const claimGd = Math.max(Number(insp.claim_grade_down || insp.grade_down_claim || 0), settInfo?.gdClaim || 0);
          const settledGd = Math.max(Number(insp.settlement_grade_down || 0), settInfo?.gdSett || 0);
          const effectiveGd = settledGd > 0 ? settledGd : (claimGd > 0 ? claimGd : actualGd);
          const arrGrade = String(insp.arrival_grade || insp.grade || poMeta?.grade || 'UNSPECIFIED').trim().toUpperCase();
          const rawLess = Math.max(Number(insp.deduction_amount || 0), settInfo?.lessAmt || 0);

          builtRows.push({
            id: `${finalMrNo}_0_${inspIdx}`,
            mrNo: finalMrNo.toUpperCase(),
            mrDate,
            poNo: poNo || '-',
            broker,
            supplier,
            area,
            agency,
            arrivalGrade: arrGrade,
            stockGrade: arrGrade,
            marka: String(insp.marka || '-').trim().toUpperCase(),
            lorryNo,
            weightMt: Number(wt.toFixed(3)),
            actualGdPct: Number(actualGd.toFixed(2)),
            claimGdPct: Number(claimGd.toFixed(2)),
            settledGdPct: Number(settledGd.toFixed(2)),
            effectiveGdPct: Number(effectiveGd.toFixed(2)),
            gdDeductionAmt: effectiveGd > 0 ? Math.round(rawLess) : 0,
            hasGradeDown: actualGd > 0 || claimGd > 0 || settledGd > 0
          });
        }
      });

      builtRows.sort((a, b) => (b.mrDate || '').localeCompare(a.mrDate || '') || b.effectiveGdPct - a.effectiveGdPct);
      setRows(builtRows);
    } catch (err) {
      console.error('Error loading Grade Down Wise report:', err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Apply shared ReportFilterBar criteria + local search
  const baseFilteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows.filter(r => {
      if (
        !matchesFilters(
          r.mrDate,
          r.supplier,
          r.broker,
          r.area,
          r.agency,
          r.poNo,
          r.mrNo,
          filters
        )
      ) {
        return false;
      }
      if (filters?.grade && !r.arrivalGrade.toLowerCase().includes(filters.grade.toLowerCase()) && !r.stockGrade.toLowerCase().includes(filters.grade.toLowerCase())) {
        return false;
      }
      if (q) {
        const hay = `${r.mrNo} ${r.poNo} ${r.broker} ${r.supplier} ${r.area} ${r.arrivalGrade} ${r.stockGrade} ${r.marka} ${r.lorryNo}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, filters, searchQuery]);

  const displayedRows = useMemo(() => {
    let list = onlyAffected ? baseFilteredRows.filter(r => r.hasGradeDown) : baseFilteredRows;
    if (selectedEntityKey && groupBy !== 'mr') {
      list = list.filter(r => {
        const k =
          groupBy === 'grade'
            ? r.arrivalGrade
            : groupBy === 'broker'
            ? r.broker
            : groupBy === 'supplier'
            ? r.supplier
            : r.area;
        return k === selectedEntityKey;
      });
    }
    return list;
  }, [baseFilteredRows, onlyAffected, selectedEntityKey, groupBy]);

  // KPIs (strict positive average SUM / COUNT(>0))
  const kpis = useMemo(() => {
    const totalInspectedMrs = new Set(baseFilteredRows.map(r => r.mrNo)).size;
    const affectedRows = baseFilteredRows.filter(r => r.hasGradeDown);
    const affectedMrs = new Set(affectedRows.map(r => r.mrNo)).size;
    const affectedMt = affectedRows.reduce((s, r) => s + r.weightMt, 0);

    const actPos = affectedRows.filter(r => r.actualGdPct > 0);
    const claimPos = affectedRows.filter(r => r.claimGdPct > 0);
    const settPos = affectedRows.filter(r => r.settledGdPct > 0);

    const avgActual = actPos.length > 0 ? actPos.reduce((s, r) => s + r.actualGdPct, 0) / actPos.length : 0;
    const avgClaim = claimPos.length > 0 ? claimPos.reduce((s, r) => s + r.claimGdPct, 0) / claimPos.length : 0;
    const avgSettled = settPos.length > 0 ? settPos.reduce((s, r) => s + r.settledGdPct, 0) / settPos.length : 0;
    const totalImpact = affectedRows.reduce((s, r) => s + r.gdDeductionAmt, 0);
    const incidencePct = totalInspectedMrs > 0 ? (affectedMrs / totalInspectedMrs) * 100 : 0;

    return {
      totalInspectedMrs,
      affectedMrs,
      affectedLotCount: affectedRows.length,
      incidencePct,
      affectedMt,
      avgActual,
      avgClaim,
      avgSettled,
      totalImpact
    };
  }, [baseFilteredRows]);

  // Grouped Summary Table by Grade / Broker / Supplier / Area
  const groupedSummary = useMemo(() => {
    const dim: Exclude<GroupDimension, 'mr'> = groupBy === 'mr' ? 'grade' : groupBy;
    const map = new Map<
      string,
      {
        key: string;
        allMrSet: Set<string>;
        gdMrSet: Set<string>;
        affectedMt: number;
        actSum: number;
        actCnt: number;
        claimSum: number;
        claimCnt: number;
        settSum: number;
        settCnt: number;
        maxGd: number;
        impactAmt: number;
      }
    >();

    baseFilteredRows.forEach(r => {
      const k =
        dim === 'grade'
          ? r.arrivalGrade
          : dim === 'broker'
          ? r.broker
          : dim === 'supplier'
          ? r.supplier
          : r.area;
      const key = k || 'UNSPECIFIED';
      if (!map.has(key)) {
        map.set(key, {
          key,
          allMrSet: new Set(),
          gdMrSet: new Set(),
          affectedMt: 0,
          actSum: 0,
          actCnt: 0,
          claimSum: 0,
          claimCnt: 0,
          settSum: 0,
          settCnt: 0,
          maxGd: 0,
          impactAmt: 0
        });
      }
      const g = map.get(key)!;
      g.allMrSet.add(r.mrNo);
      if (r.hasGradeDown) {
        g.gdMrSet.add(r.mrNo);
        g.affectedMt += r.weightMt;
        if (r.actualGdPct > 0) {
          g.actSum += r.actualGdPct;
          g.actCnt += 1;
        }
        if (r.claimGdPct > 0) {
          g.claimSum += r.claimGdPct;
          g.claimCnt += 1;
        }
        if (r.settledGdPct > 0) {
          g.settSum += r.settledGdPct;
          g.settCnt += 1;
        }
        g.maxGd = Math.max(g.maxGd, r.effectiveGdPct);
        g.impactAmt += r.gdDeductionAmt;
      }
    });

    return Array.from(map.values())
      .map(g => {
        const totalMrs = g.allMrSet.size;
        const gdMrs = g.gdMrSet.size;
        const avgAct = g.actCnt > 0 ? g.actSum / g.actCnt : 0;
        const avgClaim = g.claimCnt > 0 ? g.claimSum / g.claimCnt : 0;
        const avgSett = g.settCnt > 0 ? g.settSum / g.settCnt : 0;
        const effectiveAvg = avgSett > 0 ? avgSett : avgClaim > 0 ? avgClaim : avgAct;
        return {
          key: g.key,
          totalMrs,
          gdMrs,
          incidencePct: totalMrs > 0 ? (gdMrs / totalMrs) * 100 : 0,
          affectedMt: Number(g.affectedMt.toFixed(3)),
          avgAct: Number(avgAct.toFixed(2)),
          avgClaim: Number(avgClaim.toFixed(2)),
          avgSett: Number(avgSett.toFixed(2)),
          effectiveAvg: Number(effectiveAvg.toFixed(2)),
          maxGd: Number(g.maxGd.toFixed(2)),
          impactAmt: Math.round(g.impactAmt)
        };
      })
      .filter(g => (!onlyAffected ? true : g.gdMrs > 0))
      .sort((a, b) => b.gdMrs - a.gdMrs || b.effectiveAvg - a.effectiveAvg);
  }, [baseFilteredRows, groupBy, onlyAffected]);

  // Chart 1: Horizontal Rank Bar (Avg Effective Grade Down % with MR count annotated)
  const horizontalRankData = useMemo(() => {
    return groupedSummary.slice(0, 12).map(g => ({
      label: g.key,
      fullName: g.key,
      value: g.effectiveAvg,
      annotation: `${g.gdMrs}/${g.totalMrs} MRs (${g.incidencePct.toFixed(0)}%)`,
      color: g.effectiveAvg >= 20 ? '#be123c' : g.effectiveAvg >= 10 ? '#d97706' : '#0f766e'
    }));
  }, [groupedSummary]);

  // Chart 2: Grouped Bar (Actual vs Claim vs Settled Grade Down %)
  const comparisonChartData = useMemo(() => {
    return groupedSummary.slice(0, 8).map(g => ({
      name: g.key.length > 16 ? `${g.key.slice(0, 15)}…` : g.key,
      fullName: g.key,
      'Actual GD %': g.avgAct,
      'Claim GD %': g.avgClaim,
      'Settled GD %': g.avgSett
    }));
  }, [groupedSummary]);

  // Chart 3: Distribution Histogram of Grade Down % across affected lots
  const gdHistogramBins = useMemo(() => {
    const affected = baseFilteredRows.filter(r => r.effectiveGdPct > 0);
    const buckets = [
      { bin: '1–5%', min: 0.01, max: 5, count: 0 },
      { bin: '5–10%', min: 5.01, max: 10, count: 0 },
      { bin: '10–20%', min: 10.01, max: 20, count: 0 },
      { bin: '20–35%', min: 20.01, max: 35, count: 0 },
      { bin: '35–50%', min: 35.01, max: 50, count: 0 },
      { bin: '50%+', min: 50.01, max: 1000, count: 0 }
    ];
    affected.forEach(r => {
      const b = buckets.find(bk => r.effectiveGdPct >= bk.min && r.effectiveGdPct <= bk.max);
      if (b) b.count += 1;
    });
    const totalAffected = affected.length;
    return buckets.map(b => ({
      binRange: b.bin,
      count: b.count,
      pct: totalAffected > 0 ? Number(((b.count / totalAffected) * 100).toFixed(1)) : 0,
      isWarning: b.min >= 20
    }));
  }, [baseFilteredRows]);

  const handleExportCSV = () => {
    if (groupBy !== 'mr' && !selectedEntityKey) {
      const headers = [
        groupBy.toUpperCase(),
        'Total Inspected MRs',
        'Grade Down MRs',
        'Incidence %',
        'Affected Wt (MT)',
        'Avg Actual GD %',
        'Avg Claim GD %',
        'Avg Settled GD %',
        'Max GD %',
        'Deduction Impact (Rs)'
      ];
      const csvRows = groupedSummary.map(g => [
        g.key,
        g.totalMrs,
        g.gdMrs,
        g.incidencePct.toFixed(1),
        g.affectedMt.toFixed(3),
        g.avgAct.toFixed(2),
        g.avgClaim.toFixed(2),
        g.avgSett.toFixed(2),
        g.maxGd.toFixed(2),
        g.impactAmt
      ]);
      exportToCSV(`Grade_Down_${groupBy}_Wise_${new Date().toISOString().slice(0, 10)}.csv`, headers, csvRows);
    } else {
      const headers = [
        'MR No',
        'MR Date',
        'PO No',
        'Broker',
        'Supplier',
        'Area',
        'Arrival Grade',
        'Stock Grade',
        'Marka',
        'Lorry No',
        'Weight (MT)',
        'Actual GD %',
        'Claim GD %',
        'Settled GD %',
        'Deduction Impact (Rs)'
      ];
      const csvRows = displayedRows.map(r => [
        r.mrNo,
        r.mrDate,
        r.poNo,
        r.broker,
        r.supplier,
        r.area,
        r.arrivalGrade,
        r.stockGrade,
        r.marka,
        r.lorryNo,
        r.weightMt.toFixed(3),
        r.actualGdPct.toFixed(2),
        r.claimGdPct.toFixed(2),
        r.settledGdPct.toFixed(2),
        r.gdDeductionAmt
      ]);
      exportToCSV(`Grade_Down_MR_Ledger_${new Date().toISOString().slice(0, 10)}.csv`, headers, csvRows);
    }
  };

  return (
    <div className="space-y-5 font-sans text-slate-800">
      {/* Header & Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-[#D94B5A]" />
            <span>Grade Down Wise Quality &amp; Claim Report</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Mill Inspection &amp; Settlement Grade Down analysis (Actual vs Claim vs Mill Settled %) by Grade, Broker, Supplier, Area &amp; Final M.R.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-bold">
            {(
              [
                { id: 'grade', label: 'Grade Wise' },
                { id: 'broker', label: 'Broker Wise' },
                { id: 'supplier', label: 'Supplier Wise' },
                { id: 'area', label: 'Area Wise' },
                { id: 'mr', label: 'MR Ledger' }
              ] as Array<{ id: GroupDimension; label: string }>
            ).map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setGroupBy(tab.id);
                  setSelectedEntityKey('');
                }}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  groupBy === tab.id ? 'bg-[#D94B5A] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setOnlyAffected(prev => !prev)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
              onlyAffected
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : 'bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{onlyAffected ? 'Grade Down > 0 Only' : 'All Inspected MRs'}</span>
          </button>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search MR, PO, grade, broker..."
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-slate-800 w-48"
            />
          </div>

          <button
            type="button"
            onClick={loadData}
            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-slate-500 block">Grade Down MRs</span>
          <span className="text-lg font-black font-mono tabular-nums text-rose-700 mt-1 block">
            {kpis.affectedMrs} <span className="text-xs font-semibold text-slate-400">/ {kpis.totalInspectedMrs}</span>
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5">
            {kpis.incidencePct.toFixed(1)}% incidence ({kpis.affectedLotCount} lots)
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-slate-500 block">Affected Volume</span>
          <span className="text-lg font-black font-mono tabular-nums text-slate-900 mt-1 block">
            {kpis.affectedMt.toLocaleString('en-IN', { maximumFractionDigits: 2 })} MT
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5">Inspected weight with GD &gt; 0</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-slate-500 block">Avg Dept Actual GD %</span>
          <span className="text-lg font-black font-mono tabular-nums text-slate-900 mt-1 block">
            {kpis.avgActual.toFixed(2)}%
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5">Mean of actual GD &gt; 0</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-amber-700 block">Avg Claim GD %</span>
          <span className="text-lg font-black font-mono tabular-nums text-amber-800 mt-1 block">
            {kpis.avgClaim.toFixed(2)}%
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5">Mean of claim GD &gt; 0</span>
        </div>

        <div className="bg-slate-900 text-white border border-slate-800 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Avg Mill Settled GD %</span>
          <span className="text-lg font-black font-mono tabular-nums text-emerald-300 mt-1 block">
            {kpis.avgSettled.toFixed(2)}%
          </span>
          <span className="text-[11px] text-slate-300 font-mono block mt-0.5">
            Impact: ₹{kpis.totalImpact.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-xs text-slate-500">
          Loading Grade Down inspection &amp; settlement records...
        </div>
      ) : (
        <>
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-5">
              <HorizontalRankBarChart
                title={`Top ${groupBy === 'mr' ? 'Grades' : `${groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}s`} by Avg Grade Down %`}
                subtitle="Annotated with affected MRs out of total inspected MRs"
                data={horizontalRankData}
                valueFormatter={(v) => `${v.toFixed(1)}%`}
                height={290}
              />
            </div>

            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2">
              <div className="pb-2 border-b border-slate-100">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Actual vs Claim vs Settled GD %
                </h4>
                <p className="text-[11px] text-slate-500">Compare inspection actual, claim &amp; mill settlement side by side</p>
              </div>
              <div style={{ width: '100%', height: 265 }}>
                {comparisonChartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No Grade Down records in current filter.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonChartData} margin={{ top: 8, right: 8, left: -12, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#475569' }} angle={-20} textAnchor="end" interval={0} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'monospace' }} tickFormatter={(v) => `${v}%`} />
                      <Tooltip
                        formatter={(val: any, name: any) => [`${Number(val).toFixed(2)}%`, name]}
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '6px' }} />
                      <Bar dataKey="Actual GD %" fill="#64748b" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Claim GD %" fill="#d97706" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Settled GD %" fill="#D94B5A" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="lg:col-span-3">
              <HistogramChart
                title="Grade Down % Distribution"
                subtitle="Lot count across severity bands"
                bins={gdHistogramBins}
                metricLabel="Grade Down Lots"
                height={265}
              />
            </div>
          </div>

          {/* Grouped Summary Table (when not in pure MR Ledger mode) */}
          {groupBy !== 'mr' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-black uppercase text-slate-900">
                  {groupBy.toUpperCase()} Wise Grade Down Summary ({groupedSummary.length})
                </span>
                {selectedEntityKey ? (
                  <button
                    type="button"
                    onClick={() => setSelectedEntityKey('')}
                    className="text-[11px] font-bold text-[#D94B5A] hover:underline cursor-pointer"
                  >
                    Showing MR details for “{selectedEntityKey}” — Clear selection
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-500">Click any row to filter the MR-wise ledger below</span>
                )}
              </div>
              <div className="overflow-x-auto max-h-[360px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-900 text-white font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">{groupBy.toUpperCase()}</th>
                      <th className="p-2.5 text-right">Inspected MRs</th>
                      <th className="p-2.5 text-right">GD Affected MRs</th>
                      <th className="p-2.5 text-right">Incidence %</th>
                      <th className="p-2.5 text-right">Affected Wt (MT)</th>
                      <th className="p-2.5 text-right">Avg Actual %</th>
                      <th className="p-2.5 text-right">Avg Claim %</th>
                      <th className="p-2.5 text-right">Avg Settled %</th>
                      <th className="p-2.5 text-right">Max GD %</th>
                      <th className="p-2.5 text-right">Deduction Impact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px] font-mono tabular-nums">
                    {groupedSummary.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-8 text-center font-sans text-slate-400">
                          No Grade Down records found for the active filter.
                        </td>
                      </tr>
                    ) : (
                      groupedSummary.map(g => {
                        const isSelected = selectedEntityKey === g.key;
                        return (
                          <tr
                            key={g.key}
                            onClick={() => setSelectedEntityKey(prev => (prev === g.key ? '' : g.key))}
                            className={`cursor-pointer transition ${
                              isSelected ? 'bg-[#FDE7E6]/70' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="p-2.5 font-sans font-bold text-slate-900">{g.key}</td>
                            <td className="p-2.5 text-right text-slate-600">{g.totalMrs}</td>
                            <td className="p-2.5 text-right font-bold text-rose-700">{g.gdMrs}</td>
                            <td className="p-2.5 text-right text-slate-700">{g.incidencePct.toFixed(1)}%</td>
                            <td className="p-2.5 text-right font-bold text-slate-900">{g.affectedMt.toFixed(3)}</td>
                            <td className="p-2.5 text-right text-slate-700">{g.avgAct > 0 ? `${g.avgAct.toFixed(2)}%` : '—'}</td>
                            <td className="p-2.5 text-right text-amber-800 font-bold">{g.avgClaim > 0 ? `${g.avgClaim.toFixed(2)}%` : '—'}</td>
                            <td className="p-2.5 text-right text-rose-700 font-bold">{g.avgSett > 0 ? `${g.avgSett.toFixed(2)}%` : '—'}</td>
                            <td className="p-2.5 text-right text-slate-800">{g.maxGd > 0 ? `${g.maxGd.toFixed(1)}%` : '—'}</td>
                            <td className="p-2.5 text-right font-bold text-slate-900">
                              {g.impactAmt > 0 ? `₹${g.impactAmt.toLocaleString('en-IN')}` : '—'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Detailed MR-Wise Grade Down Ledger */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-900">
                MR-Wise Grade Down Ledger ({displayedRows.length} lots)
              </span>
              <span className="text-[11px] text-slate-500">Strict Final M.R. No. (MR...) · Exact PO Matching</span>
            </div>
            <div className="overflow-x-auto max-h-[480px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-900 text-white font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">MR No</th>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">PO No</th>
                    <th className="p-2.5">Broker</th>
                    <th className="p-2.5">Supplier</th>
                    <th className="p-2.5">Area</th>
                    <th className="p-2.5">Arrival → Stock Grade</th>
                    <th className="p-2.5 text-right">Weight (MT)</th>
                    <th className="p-2.5 text-right">Actual GD %</th>
                    <th className="p-2.5 text-right">Claim GD %</th>
                    <th className="p-2.5 text-right">Settled GD %</th>
                    <th className="p-2.5 text-right">Deduction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px] text-slate-700">
                  {displayedRows.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="p-10 text-center text-slate-400">
                        No Grade Down MR records match the active filters.
                      </td>
                    </tr>
                  ) : (
                    displayedRows.slice(0, 300).map(r => (
                      <tr key={r.id} className="hover:bg-slate-50 transition">
                        <td className="p-2.5 font-mono font-bold text-[#D94B5A] whitespace-nowrap">{r.mrNo}</td>
                        <td className="p-2.5 font-mono text-slate-500 whitespace-nowrap">{r.mrDate || '—'}</td>
                        <td className="p-2.5 font-mono font-semibold text-slate-800 whitespace-nowrap">{r.poNo}</td>
                        <td className="p-2.5 font-semibold text-slate-800 max-w-[160px] truncate" title={r.broker}>{r.broker}</td>
                        <td className="p-2.5 text-slate-600 max-w-[160px] truncate" title={r.supplier}>{r.supplier}</td>
                        <td className="p-2.5 text-slate-600 whitespace-nowrap">{r.area}</td>
                        <td className="p-2.5 font-semibold text-slate-800 whitespace-nowrap">
                          {r.arrivalGrade}
                          {r.stockGrade && r.stockGrade !== r.arrivalGrade ? ` → ${r.stockGrade}` : ''}
                        </td>
                        <td className="p-2.5 text-right font-mono tabular-nums font-bold text-slate-900">{r.weightMt.toFixed(3)}</td>
                        <td className="p-2.5 text-right font-mono tabular-nums text-slate-700">
                          {r.actualGdPct > 0 ? `${r.actualGdPct.toFixed(2)}%` : '—'}
                        </td>
                        <td className="p-2.5 text-right font-mono tabular-nums font-bold text-amber-800">
                          {r.claimGdPct > 0 ? `${r.claimGdPct.toFixed(2)}%` : '—'}
                        </td>
                        <td className="p-2.5 text-right font-mono tabular-nums font-bold text-rose-700">
                          {r.settledGdPct > 0 ? `${r.settledGdPct.toFixed(2)}%` : '—'}
                        </td>
                        <td className="p-2.5 text-right font-mono tabular-nums font-bold text-slate-900">
                          {r.gdDeductionAmt > 0 ? `₹${r.gdDeductionAmt.toLocaleString('en-IN')}` : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
