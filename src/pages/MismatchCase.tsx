import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLiveAutoRefresh } from '../hooks/useLiveAutoRefresh';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Scale, 
  TrendingUp, 
  Check, 
  RefreshCw,
  Info,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Eye,
  FileSpreadsheet,
  ArrowLeft,
  X
} from 'lucide-react';
import { cn, canApproveMismatch } from '../lib/utils';
import { dbModule } from '../services/dbModule';
import { supabase } from '../lib/supabase';
import { compareSaudaMillInspection, PoMatchKnownCodes } from '../lib/poMatch';
import {
  arePoNumbersExactMatch,
  buildExactPoQueryVariants,
  clearMaterialMismatchNavigationTarget,
  extractMismatchRowMrNo,
  isMaterialMismatchApproved,
  MaterialMismatchNavigationTarget,
  NAV_TO_MATERIAL_MISMATCH_EVENT,
  peekMaterialMismatchNavigationTarget,
  returnFromMaterialMismatch,
} from '../lib/contractRelationshipEngine';
import LegacyLayout from '../components/LegacyLayout';
import { getCurrentUserContext } from '../lib/permissions';
import { resolveSattaRate } from '../services/sattaRateService';
import {
  safeStr,
  GRADE_SATTA_VARIANCE_LIMITS,
  MaterialMismatchItem,
  SattaMismatchItem,
  SattaGroupedItem
} from '../components/mismatch/mismatchTypes';
import { MaterialMismatchView } from '../components/mismatch/MaterialMismatchView';
import { SattaMismatchView } from '../components/mismatch/SattaMismatchView';

export type { MaterialMismatchItem, SattaMismatchItem, SattaGroupedItem };

const inMemorySattaResolutions: Record<string, any> = {};

export default function MismatchCase({ onClose, variant = 'satta' }: { onClose?: () => void; variant?: 'satta' | 'material' }) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'ruka_to_satta' | 'material_inspection'>(variant === 'material' ? 'material_inspection' : 'ruka_to_satta');
  
  // Material Mismatch States
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'resolved'>('pending');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('ALL');
  const [selectedBroker, setSelectedBroker] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [mismatchList, setMismatchList] = useState<MaterialMismatchItem[]>([]);
  const [remarksMap, setRemarksMap] = useState<Record<string, string>>({});
  const [isBulkApproving, setIsBulkApproving] = useState(false);
  const hasAutoApprovedCutoffRef = useRef(false);
  const ONE_TIME_APPROVAL_CUTOFF_DATE = '2026-10-31';
  const [navTarget, setNavTarget] = useState<MaterialMismatchNavigationTarget | null>(() =>
    variant === 'material' ? peekMaterialMismatchNavigationTarget() : null
  );

  // Focus specific (PO, MR) when navigated from Payment Operation or MR Settlement
  useEffect(() => {
    if (variant !== 'material') return;
    const applyTarget = (target: MaterialMismatchNavigationTarget | null) => {
      if (!target) return;
      setNavTarget(target);
      setActiveTab('material_inspection');
      setFilterStatus('all');
      setSelectedSupplier('ALL');
      setSelectedBroker('ALL');
      setSearchQuery(target.mrNo || target.poNo || '');
    };

    const initial = peekMaterialMismatchNavigationTarget();
    if (initial) applyTarget(initial);

    const handleDeepLink = (e: Event) => {
      const detail = (e as CustomEvent<MaterialMismatchNavigationTarget>).detail;
      applyTarget(detail || peekMaterialMismatchNavigationTarget());
    };
    window.addEventListener(NAV_TO_MATERIAL_MISMATCH_EVENT, handleDeepLink);
    return () => window.removeEventListener(NAV_TO_MATERIAL_MISMATCH_EVENT, handleDeepLink);
  }, [variant]);
  
  // Satta Mismatch States
  const [sattaMismatchList, setSattaMismatchList] = useState<SattaMismatchItem[]>([]);
  const [sattaFilterStatus, setSattaFilterStatus] = useState<'all' | 'dispute' | 'ok' | 'resolved'>('dispute');
  const [sattaSourceFilter, setSattaSourceFilter] = useState<'ALL' | 'sauda_master' | 'sauda_check_point' | 'purchase_master'>('ALL');
  const [savingSattaId, setSavingSattaId] = useState<string | null>(null);
  const [expandedSaudaKeys, setExpandedSaudaKeys] = useState<Record<string, boolean>>({});

  const toggleExpandSauda = (key: string) => {
    setExpandedSaudaKeys(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const expandAllSaudas = (keys: string[]) => {
    const next: Record<string, boolean> = {};
    keys.forEach(k => { next[k] = true; });
    setExpandedSaudaKeys(next);
  };

  const collapseAllSaudas = () => {
    setExpandedSaudaKeys({});
  };

  // 100-rows per page pagination (searches full dataset, displays paginated)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [sattaCurrentPage, setSattaCurrentPage] = useState(1);
  const [sattaPageSize, setSattaPageSize] = useState(100);

  useEffect(() => {
    setCurrentPage(1);
    setSattaCurrentPage(1);
  }, [searchQuery, filterStatus, selectedSupplier, selectedBroker, sattaFilterStatus, sattaSourceFilter]);

  const [successToast, setSuccessToast] = useState<string | null>(null);

  const parseDateToComparable = (dateStr: string) => {
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) return dateStr;
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return dateStr;
  };

  const getSattaRate = (date: string, poArea: string, poGrade: string, baseRates: any[], differentials: any[]) => {
    const res = resolveSattaRate({
      area: poArea,
      grade: poGrade,
      date,
      baseRates,
      differentials
    });

    if (res.found && res.finalRate !== null) {
      return {
        baseRate: res.baseRate || 0,
        differential: res.differential || 0,
        finalRate: res.finalRate,
        found: true
      };
    }

    return {
      baseRate: res.baseRate || 0,
      differential: 0,
      finalRate: res.baseRate || 0,
      found: false,
      error: res.error || 'Rate not found in database'
    };
  };

  const loadMismatches = async () => {
    setLoading(true);
    try {
      // Direct fresh queries from database (no browser cache dependency)
      const [
        scpRows,
        scpDetailRows,
        matInspRows,
        matInspDetailRows,
        millInspRows,
        millInspDetailRows,
        dbMismatches,
        purchaseMasterRows,
        purchaseDetailRows,
        sattaBaseRows,
        sattaDiffRows,
        gradeRows,
        agencyRows,
        markaRows,
        areaRows,
        brokerRows,
        supplyRows,
        dbSattaMismatches,
        saudaMasterRows,
        saudaQualityRows,
        sattaMasterRows,
        sattaQualityRows,
        smsSaudaDbRows
      ] = await Promise.all([
        supabase ? supabase.from('sauda_check_point').select('*').then(res => res.data || [], () => []) : dbModule.fetchAll('sauda_check_point').catch(() => []),
        supabase ? supabase.from('sauda_check_point_details').select('*').then(res => res.data || [], () => []) : dbModule.fetchAll('sauda_check_point_details').catch(() => []),
        supabase ? supabase.from('material_inspection').select('*').order('created_at', { ascending: false }).then(res => res.data || [], () => []) : dbModule.fetchAll('material_inspection').catch(() => []),
        supabase ? supabase.from('material_inspection_details').select('*').order('srl_no', { ascending: true }).then(res => res.data || [], () => []) : dbModule.fetchAll('material_inspection_details').catch(() => []),
        supabase ? supabase.from('mill_inspection_master').select('*').order('created_at', { ascending: false }).then(res => res.data || [], () => []) : dbModule.fetchAll('mill_inspection_master').catch(() => []),
        supabase ? supabase.from('mill_inspection_detail').select('*').order('srl_no', { ascending: true }).then(res => res.data || [], () => []) : dbModule.fetchAll('mill_inspection_detail').catch(() => []),
        supabase ? supabase.from('material_mismatch').select('*').then(res => res.data || [], () => []) : dbModule.fetchAll('material_mismatch').catch(() => []),
        supabase ? supabase.from('purchase_master').select('*').then(res => res.data || [], () => []) : dbModule.fetchAll('purchase_master').catch(() => []),
        supabase ? supabase.from('purchase_detail_master').select('*').then(res => res.data || [], () => []) : Promise.resolve([]),
        supabase ? supabase.from('satta_base_rates').select('*').then(res => res.data || [], () => []) : Promise.resolve([]),
        supabase ? supabase.from('satta_differentials').select('*').then(res => res.data || [], () => []) : Promise.resolve([]),
        dbModule.fetchAll('grade_master').catch(() => []),
        dbModule.fetchAll('agency_master').catch(() => []),
        dbModule.fetchAll('marka_master').catch(() => []),
        dbModule.fetchAll('area_master').catch(() => []),
        dbModule.fetchAll('broker_master').catch(() => []),
        dbModule.fetchAll('supply_master').catch(() => []),
        supabase ? supabase.from('satta_mismatch').select('*').then(res => res.data || [], () => []) : dbModule.fetchAll('satta_mismatch').catch(() => []),
        supabase ? supabase.from('sauda_master').select('*').then(res => res.data || [], () => []) : dbModule.fetchAll('sauda_master').catch(() => []),
        supabase ? supabase.from('sauda_quality_details').select('*').then(res => res.data || [], () => []) : dbModule.fetchAll('sauda_quality_details').catch(() => []),
        supabase ? supabase.from('satta_master').select('*').then(res => res.data || [], () => []) : dbModule.fetchAll('satta_master').catch(() => []),
        supabase ? supabase.from('satta_quality_details').select('*').then(res => res.data || [], () => []) : dbModule.fetchAll('satta_quality_details').catch(() => []),
        supabase ? supabase.from('sms_sauda').select('*').then(res => res.data || [], () => []) : Promise.resolve([]),
      ]);

      // Build sets of known non-name master codes so codes/numbers are NEVER compared as names
      const buildKnownCodeSet = (rows: any[], codeGetter: (r: any) => any, nameGetter: (r: any) => any): Set<string> => {
        const names = new Set<string>();
        const codes = new Set<string>();
        (rows || []).forEach((r: any) => {
          const n = String(nameGetter(r) ?? '').trim().toUpperCase();
          if (n) names.add(n);
        });
        (rows || []).forEach((r: any) => {
          const c = String(codeGetter(r) ?? '').trim().toUpperCase();
          if (c && !names.has(c)) codes.add(c);
        });
        return codes;
      };

      const knownCodes: PoMatchKnownCodes = {
        gradeCodes: buildKnownCodeSet(gradeRows, g => g.grade_code ?? g.code, g => g.grade_name ?? g.name),
        agencyCodes: buildKnownCodeSet(agencyRows, a => a.agency_code ?? a.AGENCY_CODE ?? a.code, a => a.agency_name ?? a.AGENCY_NAME ?? a.name),
        markaCodes: buildKnownCodeSet(markaRows, m => m.marka_code ?? m.code, m => m.marka_name ?? m.mark_name ?? m.name),
        areaCodes: buildKnownCodeSet(areaRows, ar => ar.area_code ?? ar.code, ar => ar.area_name ?? ar.name),
        brokerCodes: buildKnownCodeSet(brokerRows, b => b.brok_code ?? b.broker_code ?? b.code, b => b.brok_name ?? b.broker_name ?? b.name),
        supplierCodes: buildKnownCodeSet(supplyRows, s => s.supp_code ?? s.sup_code ?? s.supplier_code ?? s.code, s => s.supp_name ?? s.sup_name ?? s.supplier_name ?? s.name),
      };

      const combinedSmsSaudas = [...smsSaudaDbRows];

      const items: MaterialMismatchItem[] = [];

      // 1. Index Sauda Check Point ONLY (sauda_check_point + sauda_check_point_details)
      const normalizePoKey = (v: any) => String(v || '').trim().toUpperCase().replace(/^#+/, '').trim();
      const scpMap = new Map<string, any>();
      (scpRows || []).forEach((p: any) => {
        const primaryPo = normalizePoKey(p.po_no);
        if (primaryPo && !scpMap.has(primaryPo)) scpMap.set(primaryPo, p);
        const contractPo = normalizePoKey(p.contract_po_no);
        if (contractPo && !scpMap.has(contractPo)) scpMap.set(contractPo, p);
        const ptfPo = normalizePoKey(p.ptf_no);
        if (ptfPo && !scpMap.has(ptfPo)) scpMap.set(ptfPo, p);
      });

      const scpDetailsByPo = new Map<string, any[]>();
      (scpDetailRows || []).forEach((d: any) => {
        const dPo = normalizePoKey(d.po_no);
        if (!dPo) return;
        const list = scpDetailsByPo.get(dPo) || [];
        list.push(d);
        scpDetailsByPo.set(dPo, list);
      });

      // 2. Deduplicate Mill Inspection records MR-wise (material_inspection + mill_inspection_master)
      const mrMap = new Map<string, any>();
      (millInspRows || []).forEach((row: any) => {
        const st = String(row?.status || '').toLowerCase().trim();
        if (st === 'cancelled' || st === 'rejected') return;
        const mrKey = String(row?.mr_no || '').trim().toUpperCase();
        if (!mrKey || mrKey.startsWith('AR')) return;
        mrMap.set(mrKey, { ...row, mr_no: mrKey });
      });
      (matInspRows || []).forEach((row: any) => {
        const st = String(row?.status || '').toLowerCase().trim();
        if (st === 'cancelled' || st === 'rejected') return;
        const mrKey = String(row?.mr_no || '').trim().toUpperCase();
        if (!mrKey || mrKey.startsWith('AR')) return;
        const existing = mrMap.get(mrKey) || {};
        mrMap.set(mrKey, { ...existing, ...row, mr_no: mrKey });
      });

      // Index Mill Inspection detail rows by MR No.
      const matDetailsByMr = new Map<string, any[]>();
      (matInspDetailRows || []).forEach((d: any) => {
        const mrKey = String(d?.mr_no || '').trim().toUpperCase();
        if (!mrKey) return;
        const list = matDetailsByMr.get(mrKey) || [];
        list.push(d);
        matDetailsByMr.set(mrKey, list);
      });
      const millDetailsByMr = new Map<string, any[]>();
      (millInspDetailRows || []).forEach((d: any) => {
        const mrKey = String(d?.mr_no || '').trim().toUpperCase();
        if (!mrKey) return;
        const list = millDetailsByMr.get(mrKey) || [];
        list.push(d);
        millDetailsByMr.set(mrKey, list);
      });

      // Group all Mill Inspection MRs by PO for lorry progress count
      const millInspectionsByPo = new Map<string, any[]>();
      mrMap.forEach((insp) => {
        const inspPoKey = normalizePoKey(insp.po_no || insp.mill_po_no);
        if (!inspPoKey) return;
        const list = millInspectionsByPo.get(inspPoKey) || [];
        list.push(insp);
        millInspectionsByPo.set(inspPoKey, list);
      });

      const parseMrDetails = (insp: any, mrKey: string): any[] => {
        const rawGrid = insp.grid_details || insp.details;
        if (rawGrid) {
          try {
            const parsed = typeof rawGrid === 'string' ? JSON.parse(rawGrid) : rawGrid;
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
          } catch (_e) {}
        }
        const matRows = matDetailsByMr.get(mrKey);
        if (matRows && matRows.length > 0) return matRows;
        const millRows = millDetailsByMr.get(mrKey);
        if (millRows && millRows.length > 0) return millRows;
        return [];
      };

      const findDbMismatchForMr = (scpPoNo: string, mrKey: string) => {
        const poUpper = normalizePoKey(scpPoNo);
        const mrUpper = mrKey.trim().toUpperCase();
        const exactItemId = `MIS-${poUpper}-${mrUpper}`;

        const poRows = (dbMismatches || []).filter((m: any) => arePoNumbersExactMatch(m.po_no, scpPoNo));

        // 1. Prefer exact MR-specific record
        const mrSpecific = poRows.find((m: any) => {
          const mInsp = String(m.inspection_no || '').trim().toUpperCase();
          const mId = String(m.mismatch_id || m.id || '').trim().toUpperCase();
          const boundMr = extractMismatchRowMrNo(m);
          return mId === exactItemId || mInsp === exactItemId || (boundMr !== '' && boundMr === mrUpper);
        });
        if (mrSpecific) return { row: mrSpecific, isMrSpecific: true, hasOtherMrRowsOnPo: false };

        const hasOtherMrRowsOnPo = poRows.some((m: any) => {
          const boundMr = extractMismatchRowMrNo(m);
          return boundMr !== '' && boundMr !== mrUpper;
        });

        // 2. Fallback to legacy PO-level approval record (only if NOT tied to a different MR)
        const legacyPoRow = poRows.find((m: any) => {
          const boundMr = extractMismatchRowMrNo(m);
          if (boundMr) return false;
          const mInsp = String(m.inspection_no || '').trim().toUpperCase();
          const mId = String(m.mismatch_id || m.id || '').trim().toUpperCase();
          return arePoNumbersExactMatch(m.po_no, scpPoNo) || mInsp === `MIS-${poUpper}` || mId === `MIS-${poUpper}`;
        });
        return { row: legacyPoRow || null, isMrSpecific: false, hasOtherMrRowsOnPo };
      };

      // 3. Match Mill Inspection MR-wise strictly against Sauda Check Point ONLY (Name-only)
      mrMap.forEach((insp, mrNo) => {
        const rawInspPo = normalizePoKey(insp.po_no || insp.mill_po_no);
        if (!rawInspPo) return;

        const po = scpMap.get(rawInspPo);
        if (!po) return; // Strictly Sauda Check Point ONLY

        const scpPoNo = normalizePoKey(po.po_no || rawInspPo);
        const poDetails =
          scpDetailsByPo.get(scpPoNo) ||
          scpDetailsByPo.get(rawInspPo) ||
          [];
        const mrDetailRows = parseMrDetails(insp, mrNo);
        const allPoMillInspections =
          millInspectionsByPo.get(scpPoNo) ||
          millInspectionsByPo.get(rawInspPo) ||
          [insp];

        const matchRes = compareSaudaMillInspection(
          po,
          poDetails,
          insp,
          mrDetailRows,
          allPoMillInspections,
          knownCodes
        );

        if (matchRes.hasInspection && matchRes.status === 'mismatch' && matchRes.mismatches.length > 0) {
          const { row: dbMm, isMrSpecific, hasOtherMrRowsOnPo } = findDbMismatchForMr(scpPoNo, mrNo);
          const isCleared = isMrSpecific
            ? Boolean(dbMm && isMaterialMismatchApproved(dbMm))
            : Boolean(
                (dbMm && isMaterialMismatchApproved(dbMm)) ||
                (po.mismatch_cleared === true && !hasOtherMrRowsOnPo)
              );

          const mismatchedLabels = matchRes.mismatches.map(m => m.mismatchLabel || `${m.field} mismatch`);
          const detailGrades = Array.from(
            new Set(poDetails.map((d: any) => String(d.grade_name || '').trim()).filter(g => g && !/^\d+$/.test(g)))
          );
          const detailAgencies = Array.from(
            new Set(poDetails.map((d: any) => String(d.agency_name || '').trim()).filter(a => a && !/^\d+$/.test(a)))
          );

          items.push({
            id: `MIS-${scpPoNo}-${mrNo}`,
            poNo: scpPoNo,
            mrNo: mrNo,
            mrDate: String(insp.mr_date || insp.date || insp.created_at || '').split('T')[0] || undefined,
            saudaNo: po.po_contract || po.contract_po_no || po.sauda_no || 'N/A',
            supplierName: safeStr(po.supplier || po.supplier_name, 'N/A'),
            brokerName: safeStr(po.broker || po.broker_name, 'N/A'),
            area: safeStr(po.area, 'N/A'),
            grade: safeStr(po.grade || po.quality, '') || detailGrades.join(', ') || 'N/A',
            agency: safeStr(po.agency || po.agency_name, '') || detailAgencies.join(', ') || 'N/A',
            ptfMode: po.ptf_mode || po.po_type || 'N/A',
            poContract: po.po_contract || po.contract_po_no || 'N/A',
            challanSupplier: safeStr(po.challan_supplier, 'N/A'),
            ratePerMt: po.b_rate ? `₹ ${po.b_rate}` : (poDetails[0]?.rate_qntl ? `₹ ${poDetails[0].rate_qntl * 10}` : 'N/A'),
            lorryNumber: insp.lorry_number || insp.lorry_no || 'N/A',
            lorryProgress: matchRes.lorryProgress || { totalLorries: 1, receivedLorries: 1, remainingLorries: 0 },
            mismatchedFields: mismatchedLabels,
            mismatchDetailsList: matchRes.mismatches,
            detectedAt: String(insp.mr_date || insp.date || insp.created_at || po.created_at || new Date().toISOString()).split('T')[0],
            issueDescription: `MR ${mrNo} mismatched fields: ${mismatchedLabels.join(', ')}.`,
            severity: 'medium',
            status: isCleared ? 'resolved' : 'pending',
            isClosed: Boolean(po.is_closed),
            resolutionNotes: (dbMm && dbMm.remarks) || po.mismatch_remarks || undefined,
            resolvedBy: (dbMm && dbMm.approved_by) || po.approved_by || (isCleared ? 'L3/L5 User' : undefined),
            resolvedAt: (dbMm && dbMm.approved_at) ? String(dbMm.approved_at).split('T')[0] : (po.approved_at ? String(po.approved_at).split('T')[0] : (isCleared ? new Date().toISOString().split('T')[0] : undefined)),
            approvalLevel: (dbMm && dbMm.approval_level) || po.approval_level || 'L3/L5',
          });
        }
      });

      // Preserve already-resolved Sauda Check Point records from material_mismatch DB if not already listed
      (dbMismatches || []).forEach((r: any) => {
        if (!isMaterialMismatchApproved(r)) return;
        const poNo = normalizePoKey(r.po_no);
        if (!poNo || !scpMap.has(poNo)) return;
        const rMrNo = String(r.mr_no || (String(r.inspection_no || '').match(/MR\d+/i)?.[0] || '') || (String(r.arrival_no || '').match(/MR\d+/i)?.[0] || '')).trim().toUpperCase();
        const alreadyListed = items.some(i => i.poNo === poNo && (!rMrNo || i.mrNo === rMrNo));
        if (!alreadyListed) {
          const scpPo = scpMap.get(poNo);
          const labels = r.mismatched_fields ? r.mismatched_fields.split(', ') : (r.field ? [r.field] : ['Material mismatch']);
          items.push({
            id: r.mismatch_id || (rMrNo ? `MIS-${poNo}-${rMrNo}` : `MIS-${poNo}`),
            poNo: poNo,
            mrNo: rMrNo || undefined,
            saudaNo: scpPo?.contract_po_no || 'N/A',
            supplierName: safeStr(r.supplier || scpPo?.supplier, 'N/A'),
            brokerName: safeStr(r.broker || scpPo?.broker, 'N/A'),
            area: safeStr(r.area || scpPo?.area, 'N/A'),
            grade: safeStr(r.grade, 'N/A'),
            agency: safeStr(r.agency, 'N/A'),
            ptfMode: r.ptf_mode || scpPo?.po_type || 'N/A',
            poContract: scpPo?.contract_po_no || 'N/A',
            challanSupplier: safeStr(r.challan_supplier || scpPo?.challan_supplier, 'N/A'),
            ratePerMt: r.rate_per_mt || 'N/A',
            lorryNumber: r.lorry_number || 'N/A',
            lorryProgress: { totalLorries: Number(scpPo?.total_lorries || 1), receivedLorries: 1, remainingLorries: 0 },
            mismatchedFields: labels,
            mismatchDetailsList: [],
            detectedAt: r.created_at ? String(r.created_at).split('T')[0] : new Date().toISOString().split('T')[0],
            issueDescription: r.issue_description || `Mismatched fields: ${labels.join(', ')}.`,
            severity: (r.severity as any) || 'medium',
            status: 'resolved',
            isClosed: Boolean(scpPo?.is_closed || r.is_closed),
            resolutionNotes: r.remarks,
            resolvedBy: r.approved_by || 'L3/L5 User',
            resolvedAt: r.approved_at ? String(r.approved_at).split('T')[0] : (r.created_at ? String(r.created_at).split('T')[0] : undefined),
            approvalLevel: r.approval_level || 'L3/L5',
          });
        }
      });

      setMismatchList(items);

      // --- Satta Mismatch Processing ---
      const sattaItems: SattaMismatchItem[] = [];
      const saudaPoRowsToProcess: { 
        header: any; 
        detail: any; 
        poNoFormatted: string; 
        sourceType: 'sauda_master' | 'sms_sauda' | 'sauda_check_point' | 'purchase_master'; 
        sourceLabel: string;
      }[] = [];

      // Function to generate formatted Order No (e.g. BJC0158/26-27 or BJC4007/26-27)
      const getFormattedOrderNo = (header: any) => {
        if (!header) return 'N/A';
        if (header.session && header.session.trim()) {
          const s = header.session.trim();
          if (s.includes('/')) {
            const parts = s.split('/').filter(Boolean);
            if (parts.length >= 3) return s;
            if (parts.length === 2 && parts[0] === 'BJCL') return `BJC${parts[1]}`;
          }
        }
        const val = String(header.sauda_no || header.po_no || header.contract_po_no || header.satta_no || header.order_no || '').trim();
        if (!val) return 'N/A';
        if (val.startsWith('BJC') || val.startsWith('BJCL')) return val;
        let yearPart = '26-27';
        if (header.financial_year) {
          const startYr = header.financial_year.split('-')[0].trim();
          if (startYr.length >= 4) yearPart = `${startYr.slice(-2)}-${(parseInt(startYr.slice(-2)) + 1).toString().padStart(2, '0')}`;
        }
        return `BJC${val.replace(/^#/, '')}/${yearPart}`;
      };

      // 1. Process sauda_master & sauda_quality_details (Sauda Desk Entries)
      if (saudaMasterRows.length > 0) {
        saudaMasterRows.forEach((sm: any) => {
          const formattedNo = getFormattedOrderNo(sm);
          const matchingDetails = saudaQualityRows.filter((sq: any) => 
            (sq.sauda_id && sq.sauda_id === sm.sauda_id) ||
            (sq.sauda_no && sm.sauda_no && String(sq.sauda_no).trim().toUpperCase() === String(sm.sauda_no).trim().toUpperCase())
          );

          if (matchingDetails.length > 0) {
            matchingDetails.forEach((qd: any) => {
              saudaPoRowsToProcess.push({ header: sm, detail: qd, poNoFormatted: formattedNo, sourceType: 'sauda_master', sourceLabel: 'Sauda Desk Module' });
            });
          } else {
            saudaPoRowsToProcess.push({ header: sm, detail: sm, poNoFormatted: formattedNo, sourceType: 'sauda_master', sourceLabel: 'Sauda Desk Module' });
          }
        });
      }

      // 1b. Process sms_sauda entries (SMS Sauda Desk)
      if (combinedSmsSaudas.length > 0) {
        combinedSmsSaudas.forEach((ss: any) => {
          const formattedNo = getFormattedOrderNo(ss);
          if (!saudaPoRowsToProcess.some(r => r.poNoFormatted === formattedNo)) {
            saudaPoRowsToProcess.push({
              header: ss,
              detail: ss,
              poNoFormatted: formattedNo,
              sourceType: 'sms_sauda',
              sourceLabel: 'Sauda Desk Module'
            });
          }
        });
      }

      // Fallback: Any sauda_quality_details not yet included
      saudaQualityRows.forEach((sq: any) => {
        const found = saudaPoRowsToProcess.some(r => r.detail === sq || (r.detail.sauda_id && r.detail.sauda_id === sq.sauda_id && r.detail.quality === sq.quality));
        if (!found) {
          const matchedHeader = saudaMasterRows.find((sm: any) => sm.sauda_id === sq.sauda_id || sm.sauda_no === sq.sauda_no) || sq;
          const formattedNo = getFormattedOrderNo(matchedHeader);
          saudaPoRowsToProcess.push({ header: matchedHeader, detail: sq, poNoFormatted: formattedNo, sourceType: 'sauda_master', sourceLabel: 'Sauda Desk Module' });
        }
      });

      saudaPoRowsToProcess.forEach(({ header, detail, poNoFormatted, sourceType, sourceLabel }) => {
        const poNo = poNoFormatted || String(detail.po_no || header.po_no || header.contract_po_no || header.sauda_no || '').trim().toUpperCase();
        if (!poNo || poNo === 'N/A') return;

        const matchedGrade = (gradeRows || []).find((g: any) => String(g.grade_code || '').trim() === String(detail.grade_code || detail.quality || header.grade_code || '').trim());
        const poGrade = (matchedGrade ? matchedGrade.grade_name || '' : (detail.quality || detail.grade_code || header.grade || header.quality || '')).trim().replace(/\./g, '').toUpperCase() || 'TD6';
        
        // Extract rate and normalize to Rate per Quintal (e.g. 13400)
        const rawRate = Number(detail.rs || detail.rate_qntl || detail.rate_per_qtl || detail.b_rate || detail.rate_mt || detail.rate || header.b_rate || header.rate_qntl || header.rate || 0);
        if (rawRate <= 0) return;

        // Ensure rate is full Quintal rate (e.g. 13400)
        let poRateQtl = rawRate;
        if (poRateQtl > 0 && poRateQtl < 5000) {
          poRateQtl = poRateQtl * 10;
        } else if (poRateQtl > 50000) {
          poRateQtl = poRateQtl / 10;
        }
        const poRateMt = poRateQtl * 10;

        const poDate = header.date || header.po_date || header.b_date || '2026-04-02';
        const poArea = header.area || detail.area || 'NORTHERN';

        const { baseRate, differential, finalRate } = getSattaRate(
          parseDateToComparable(poDate),
          poArea,
          poGrade,
          sattaBaseRows,
          sattaDiffRows
        );

        // Normalize Satta Base, Differential, and Final Rate to full Quintal values (e.g. Base 13500, Diff -200, Final 13300)
        let sattaBaseRateQtl = baseRate;
        if (sattaBaseRateQtl > 0 && sattaBaseRateQtl < 5000) {
          sattaBaseRateQtl = sattaBaseRateQtl * 10;
        }

        let differentialQtl = differential;
        if (differentialQtl !== 0 && Math.abs(differentialQtl) < 100) {
          differentialQtl = differentialQtl * 10;
        }

        const sattaFinalRateQtl = sattaBaseRateQtl + differentialQtl;
        const sattaFinalRateMt = sattaFinalRateQtl * 10;

        const diffInRateQtl = poRateQtl - sattaFinalRateQtl;
        const diffInRateMt = diffInRateQtl * 10;

        const allowedVarianceQtl = GRADE_SATTA_VARIANCE_LIMITS[poGrade] !== undefined 
          ? GRADE_SATTA_VARIANCE_LIMITS[poGrade] 
          : (GRADE_SATTA_VARIANCE_LIMITS.DEFAULT || 0);

        const isDispute = diffInRateQtl > allowedVarianceQtl;

        const itemId = `SAT-${detail.id || detail.item_id || `${poNo}-${poGrade}-${rawRate}`}`;
        const cleanPoNo = String(poNo || '').trim().toUpperCase();
        const cleanSaudaNo = String(header.po_contract || header.sauda_no || header.contract_no || '').trim().toUpperCase();
        const cleanRefNo = String(header.order_no || header.ref_no || header.sauda_id || '').trim().toUpperCase();

        const dbSattaMm = (dbSattaMismatches || []).find((sm: any) => {
          const smPo = String(sm.po_no || '').trim().toUpperCase();
          const smSauda = String(sm.sauda_no || '').trim().toUpperCase();
          const smId = String(sm.mismatch_id || sm.id || '').toUpperCase();
          return (
            smId === itemId.toUpperCase() ||
            (smPo && arePoNumbersExactMatch(smPo, cleanPoNo)) ||
            (smSauda && cleanSaudaNo && arePoNumbersExactMatch(smSauda, cleanSaudaNo)) ||
            (cleanRefNo && smSauda && smSauda === cleanRefNo) ||
            (cleanRefNo && smPo && smPo === cleanRefNo) ||
            (smPo && cleanSaudaNo && arePoNumbersExactMatch(smPo, cleanSaudaNo)) ||
            (smSauda && cleanPoNo && arePoNumbersExactMatch(smSauda, cleanPoNo))
          );
        });

        const isResolved = Boolean(
          header.satta_dispute_approved === true || 
          header.mismatch_cleared === true || 
          (dbSattaMm && (
            dbSattaMm.status === 'resolved' || 
            dbSattaMm.status === 'approved' ||
            dbSattaMm.status === 'cleared' ||
            Boolean(dbSattaMm.approved_by) ||
            String(dbSattaMm.remarks || '').toLowerCase().includes('approved') ||
            String(dbSattaMm.remarks || '').toLowerCase().includes('resolved')
          ))
        );

        sattaItems.push({
          id: itemId,
          poNo,
          saudaNo: header.po_contract || header.sauda_no || header.contract_no || poNo,
          poDate,
          supplierName: safeStr(header.supplier || header.supplier_name, 'UNKNOWN SUPPLIER'),
          brokerName: safeStr(header.broker || header.broker_name, 'UNKNOWN BROKER'),
          area: poArea,
          grade: poGrade,
          poRateMt,
          poRateQtl,
          sattaBaseRateQtl,
          differentialQtl,
          sattaFinalRateMt,
          sattaFinalRateQtl,
          status: isResolved ? 'resolved' : (isDispute ? 'dispute' : 'ok'),
          issueDescription: isDispute 
            ? `Sauda Contract Rate exceeds active Satta Chart parameters. Contract specifies ₹${poRateQtl.toLocaleString()}/Qtl, which exceeds active Satta limit of ₹${sattaFinalRateQtl.toLocaleString()}/Qtl by ₹${diffInRateQtl.toLocaleString()}/Qtl.`
            : "Sauda rate aligns with active Satta Chart parameters.",
          differenceMt: diffInRateMt,
          differenceQtl: diffInRateQtl,
          weightMt: Number(detail.weight_mt || detail.total_wt_in_ton || header.total_wt_in_ton || 0),
          resolutionNotes: (dbSattaMm && dbSattaMm.remarks) || header.satta_remarks,
          resolvedAt: (dbSattaMm && dbSattaMm.approved_at) ? String(dbSattaMm.approved_at).split('T')[0] : (header.approved_at ? String(header.approved_at).split('T')[0] : (isResolved ? new Date().toISOString().split('T')[0] : undefined)),
          resolvedBy: (dbSattaMm && dbSattaMm.approved_by) || header.approved_by || (isResolved ? 'L3/L5 User' : undefined),
          approvalLevel: (dbSattaMm && dbSattaMm.approval_level) || header.approval_level || 'L3/L5',
          sourceType,
          sourceLabel
        });
      });

      // --- Same-Date B. Rate Mismatch Detection (Sauda Desk & PTF Entry) ---
      // 1. Sauda Desk (sauda_master): Group by b_date (or date), verify b_rate is identical across same b_date
      const saudaByDate = new Map<string, any[]>();
      saudaMasterRows.forEach((sm: any) => {
        const bDate = String(sm.b_date || sm.date || '').trim();
        if (!bDate) return;
        if (!saudaByDate.has(bDate)) saudaByDate.set(bDate, []);
        saudaByDate.get(bDate)!.push(sm);
      });

      saudaByDate.forEach((entries, bDate) => {
        if (entries.length < 2) return;
        const refRate = Number(entries[0].b_rate || entries[0].rate || 0);
        for (let i = 1; i < entries.length; i++) {
          const entry = entries[i];
          const entryRate = Number(entry.b_rate || entry.rate || 0);
          if (refRate > 0 && Math.abs(entryRate - refRate) > 0.01) {
            const formattedNo = getFormattedOrderNo(entry);
            const itemId = `SD-RATEDIFF-${entry.sauda_id || formattedNo}`;
            if (!sattaItems.some(item => item.id === itemId)) {
              const cleanPoNo = String(formattedNo || '').trim().toUpperCase();
              const cleanSaudaNo = String(entry.sauda_no || formattedNo || '').trim().toUpperCase();
              const dbSattaMm = (dbSattaMismatches || []).find((sm: any) => {
                const smPo = String(sm.po_no || '').trim().toUpperCase();
                const smSauda = String(sm.sauda_no || '').trim().toUpperCase();
                const smId = String(sm.mismatch_id || sm.id || '').toUpperCase();
                return (
                  (smId && smId === itemId.toUpperCase()) ||
                  (smPo && arePoNumbersExactMatch(smPo, cleanPoNo)) ||
                  (smSauda && cleanSaudaNo && arePoNumbersExactMatch(smSauda, cleanSaudaNo))
                );
              });

              const isResolved = Boolean(
                entry.satta_dispute_approved === true ||
                entry.mismatch_cleared === true ||
                (dbSattaMm && (
                  dbSattaMm.status === 'resolved' ||
                  dbSattaMm.status === 'approved' ||
                  dbSattaMm.status === 'cleared' ||
                  Boolean(dbSattaMm.approved_by) ||
                  String(dbSattaMm.remarks || '').toLowerCase().includes('approved') ||
                  String(dbSattaMm.remarks || '').toLowerCase().includes('resolved')
                ))
              );

              sattaItems.push({
                id: itemId,
                poNo: formattedNo,
                saudaNo: entry.sauda_no || formattedNo,
                poDate: bDate,
                supplierName: safeStr(entry.supplier, 'UNKNOWN SUPPLIER'),
                brokerName: safeStr(entry.broker, 'UNKNOWN BROKER'),
                area: safeStr(entry.area, 'NORTHERN'),
                grade: safeStr(entry.grade, 'TD6'),
                poRateMt: entryRate * 10,
                poRateQtl: entryRate,
                sattaBaseRateQtl: refRate,
                differentialQtl: entryRate - refRate,
                sattaFinalRateMt: refRate * 10,
                sattaFinalRateQtl: refRate,
                status: isResolved ? 'resolved' : 'dispute',
                issueDescription: `Same-Date B. Rate Mismatch on date ${bDate}: Reference rate for date ${bDate} is ₹${refRate.toLocaleString()}/Qtl, but contract specifies ₹${entryRate.toLocaleString()}/Qtl.`,
                differenceMt: (entryRate - refRate) * 10,
                differenceQtl: entryRate - refRate,
                weightMt: Number(entry.total_wt_in_ton || 0),
                resolutionNotes: (dbSattaMm && dbSattaMm.remarks) || entry.satta_remarks,
                resolvedAt: (dbSattaMm && dbSattaMm.approved_at) ? String(dbSattaMm.approved_at).split('T')[0] : (entry.approved_at ? String(entry.approved_at).split('T')[0] : (isResolved ? new Date().toISOString().split('T')[0] : undefined)),
                resolvedBy: (dbSattaMm && dbSattaMm.approved_by) || entry.approved_by || (isResolved ? 'Administrator' : undefined),
                approvalLevel: (dbSattaMm && dbSattaMm.approval_level) || entry.approval_level || 'L3/L5',
                sourceType: 'sauda_master',
                sourceLabel: 'Sauda Desk Module (Same-Date Rate Mismatch)'
              });
            }
          }
        }
      });

      // 2. PTF Entries in Sauda Check Point / Purchase Master (where is_ptf or po_identification === 'PTF' or po_type === 'PTF')
      const ptfRows = [...scpRows, ...purchaseMasterRows].filter((p: any) => 
        p.is_ptf || p.po_identification === 'PTF' || p.po_type === 'PTF' || p.ptf_no
      );
      const ptfByDate = new Map<string, any[]>();
      ptfRows.forEach((p: any) => {
        const sDate = String(p.s_date || p.po_date || p.date || '').trim();
        if (!sDate) return;
        if (!ptfByDate.has(sDate)) ptfByDate.set(sDate, []);
        ptfByDate.get(sDate)!.push(p);
      });

      ptfByDate.forEach((entries, sDate) => {
        if (entries.length < 2) return;
        const refRate = Number(entries[0].b_rate || entries[0].rate_qntl || 0);
        for (let i = 1; i < entries.length; i++) {
          const entry = entries[i];
          const entryRate = Number(entry.b_rate || entry.rate_qntl || 0);
          if (refRate > 0 && Math.abs(entryRate - refRate) > 0.01) {
            const poNo = String(entry.po_no || entry.purchase_order || '').trim();
            const itemId = `PTF-RATEDIFF-${poNo || i}`;
            if (!sattaItems.some(item => item.id === itemId)) {
              const cleanPoNo = String(poNo || '').trim().toUpperCase();
              const cleanSaudaNo = String(entry.contract_po_no || poNo || '').trim().toUpperCase();
              const dbSattaMm = (dbSattaMismatches || []).find((sm: any) => {
                const smPo = String(sm.po_no || '').trim().toUpperCase();
                const smSauda = String(sm.sauda_no || '').trim().toUpperCase();
                const smId = String(sm.mismatch_id || sm.id || '').toUpperCase();
                return (
                  (smId && smId === itemId.toUpperCase()) ||
                  (smPo && arePoNumbersExactMatch(smPo, cleanPoNo)) ||
                  (smSauda && cleanSaudaNo && arePoNumbersExactMatch(smSauda, cleanSaudaNo))
                );
              });

              const isResolved = Boolean(
                entry.satta_dispute_approved === true ||
                entry.mismatch_cleared === true ||
                (dbSattaMm && (
                  dbSattaMm.status === 'resolved' ||
                  dbSattaMm.status === 'approved' ||
                  dbSattaMm.status === 'cleared' ||
                  Boolean(dbSattaMm.approved_by) ||
                  String(dbSattaMm.remarks || '').toLowerCase().includes('approved') ||
                  String(dbSattaMm.remarks || '').toLowerCase().includes('resolved')
                ))
              );

              sattaItems.push({
                id: itemId,
                poNo: poNo || 'N/A',
                saudaNo: entry.contract_po_no || poNo || 'N/A',
                poDate: sDate,
                supplierName: safeStr(entry.supplier, 'UNKNOWN SUPPLIER'),
                brokerName: safeStr(entry.broker, 'UNKNOWN BROKER'),
                area: safeStr(entry.area, 'NORTHERN'),
                grade: safeStr(entry.grade, 'TD6'),
                poRateMt: entryRate * 10,
                poRateQtl: entryRate,
                sattaBaseRateQtl: refRate,
                differentialQtl: entryRate - refRate,
                sattaFinalRateMt: refRate * 10,
                sattaFinalRateQtl: refRate,
                status: isResolved ? 'resolved' : 'dispute',
                issueDescription: `Same-Date PTF B. Rate Mismatch on S Date ${sDate}: Reference rate for date ${sDate} is ₹${refRate.toLocaleString()}/Qtl, but PTF entry specifies ₹${entryRate.toLocaleString()}/Qtl.`,
                differenceMt: (entryRate - refRate) * 10,
                differenceQtl: entryRate - refRate,
                weightMt: Number(entry.total_contract_mt || entry.total_wt_in_ton || 0),
                resolutionNotes: (dbSattaMm && dbSattaMm.remarks) || entry.satta_remarks,
                resolvedAt: (dbSattaMm && dbSattaMm.approved_at) ? String(dbSattaMm.approved_at).split('T')[0] : (entry.approved_at ? String(entry.approved_at).split('T')[0] : (isResolved ? new Date().toISOString().split('T')[0] : undefined)),
                resolvedBy: (dbSattaMm && dbSattaMm.approved_by) || entry.approved_by || (isResolved ? 'Administrator' : undefined),
                approvalLevel: (dbSattaMm && dbSattaMm.approval_level) || entry.approval_level || 'L3/L5',
                sourceType: 'sauda_check_point',
                sourceLabel: 'Sauda Check Point PTF Module (Same-Date Rate Mismatch)'
              });
            }
          }
        }
      });

      // 3. Include any standalone records from satta_mismatch table in DB
      dbSattaMismatches.forEach((sm: any) => {
        const poNo = String(sm.po_no || '').trim().toUpperCase();
        const saudaNo = String(sm.sauda_no || '').trim().toUpperCase();
        const smId = sm.mismatch_id || sm.id || `SAT-DB-${poNo}`;
        if (!sattaItems.some(item => item.id === smId || (poNo && item.poNo === poNo))) {
          const isResolved = sm.status === 'resolved' || sm.status === 'approved' || Boolean(sm.approved_by);
          sattaItems.push({
            id: smId,
            poNo: poNo || 'N/A',
            saudaNo: saudaNo || poNo || 'N/A',
            poDate: sm.created_at ? String(sm.created_at).split('T')[0] : new Date().toISOString().split('T')[0],
            supplierName: sm.supplier || 'N/A',
            brokerName: sm.broker || 'N/A',
            area: sm.area || 'DAISEE',
            grade: sm.grade || 'TD6',
            poRateMt: Number(sm.actual_rate || 0) * 10,
            poRateQtl: Number(sm.actual_rate || 0),
            sattaBaseRateQtl: Number(sm.expected_rate || 0),
            differentialQtl: 0,
            sattaFinalRateMt: Number(sm.expected_rate || 0) * 10,
            sattaFinalRateQtl: Number(sm.expected_rate || 0),
            status: isResolved ? 'resolved' : 'dispute',
            issueDescription: sm.remarks || 'Satta Rate Mismatch',
            differenceMt: (Number(sm.actual_rate || 0) - Number(sm.expected_rate || 0)) * 10,
            differenceQtl: Number(sm.actual_rate || 0) - Number(sm.expected_rate || 0),
            weightMt: 0,
            resolutionNotes: sm.remarks,
            resolvedAt: sm.approved_at ? String(sm.approved_at).split('T')[0] : (isResolved ? new Date().toISOString().split('T')[0] : undefined),
            resolvedBy: sm.approved_by || (isResolved ? 'Administrator' : undefined),
            approvalLevel: sm.approval_level || 'L3/L5',
            sourceType: 'sauda_master',
            sourceLabel: 'Satta Mismatch Database'
          });
        }
      });

      setSattaMismatchList(sattaItems);
    } catch (err) {
      console.error('Error loading mismatches from DB:', err);
    } finally {
      setLoading(false);
    }
  };

  useLiveAutoRefresh(loadMismatches, [], {
    tables: [
      'material_mismatch',
      'satta_mismatch',
      'sauda_check_point',
      'sauda_check_point_details',
      'material_inspection',
      'material_inspection_details',
      'mill_inspection_master',
      'mill_inspection_detail',
      'purchase_master',
      'sauda_master',
      'satta_master'
    ]
  });

  const handleResolve = async (itemId: string, itemPoNo: string, itemMrNo?: string) => {
    const rawRemarks = remarksMap[itemId] || '';
    const remarks = rawRemarks.trim() || 'Approved and cleared by Administrator';

    const ctx = getCurrentUserContext();
    const username = ctx.username || ctx.userName || 'Administrator';
    const approvalLevel = (ctx.userLevel || ctx.userRole || 'ADMIN').toUpperCase();
    const nowIso = new Date().toISOString();

    const targetItem = mismatchList.find(i => i.id === itemId || (itemMrNo ? (i.poNo === itemPoNo && i.mrNo === itemMrNo) : i.poNo === itemPoNo));
    const resolvedMrNo = (itemMrNo || targetItem?.mrNo || '').trim().toUpperCase();

    const exactPoVariants = buildExactPoQueryVariants(itemPoNo);
    const exactSaudaVariants = targetItem?.saudaNo && targetItem.saudaNo !== 'N/A'
      ? buildExactPoQueryVariants(targetItem.saudaNo)
      : exactPoVariants;

    // Check if any OTHER MR on the exact same PO still has a pending mismatch
    const hasOtherPendingMrsOnSamePo = mismatchList.some(
      (m) =>
        m.status === 'pending' &&
        arePoNumbersExactMatch(m.poNo, itemPoNo) &&
        m.id !== itemId &&
        (!resolvedMrNo || (m.mrNo || '').trim().toUpperCase() !== resolvedMrNo)
    );

    // 1. Base record (compatible with standard PostgreSQL table schema)
    const baseMaterialRecord: Record<string, any> = {
      po_no: itemPoNo,
      arrival_no: resolvedMrNo || (targetItem?.lorryNumber && targetItem.lorryNumber !== 'N/A' ? targetItem.lorryNumber : 'N/A'),
      inspection_no: resolvedMrNo || itemId,
      area: targetItem?.area || 'DAISEE',
      grade: targetItem?.grade || 'N/A',
      field: Array.isArray(targetItem?.mismatchedFields) ? targetItem.mismatchedFields.join(', ') : (targetItem?.mismatchedFields || 'Material Mismatch'),
      expected_value: targetItem?.issueDescription || 'PO Specifications',
      actual_value: targetItem?.issueDescription || 'Material Inspection Variance',
      status: 'resolved',
      remarks: `[APPROVED by ${username} (${approvalLevel}) on ${nowIso.split('T')[0]}]: ${remarks.trim()}`,
    };

    // 2. Extended record (if database has extra columns)
    const extendedMaterialRecord: Record<string, any> = {
      ...baseMaterialRecord,
      mismatch_id: itemId,
      approved_by: username,
      approved_at: nowIso,
      approval_level: approvalLevel,
      supplier: targetItem?.supplierName || null,
      broker: targetItem?.brokerName || null,
      agency: targetItem?.agency || null,
      ptf_mode: targetItem?.ptfMode || null,
      challan_supplier: targetItem?.challanSupplier || null,
      rate_per_mt: targetItem?.ratePerMt || null,
      lorry_number: targetItem?.lorryNumber || null,
      issue_description: targetItem?.issueDescription || null,
      mismatched_fields: Array.isArray(targetItem?.mismatchedFields) ? targetItem.mismatchedFields.join(', ') : (targetItem?.mismatchedFields || null),
      severity: targetItem?.severity || 'medium',
    };

    let savedMaterialToDb = false;
    if (supabase) {
      try {
        // Look up exact MR-specific row first using exact PO variants so approving one MR never overwrites another MR or another PO
        const { data: existingRows } = await supabase
          .from('material_mismatch')
          .select('*')
          .in('po_no', exactPoVariants.length > 0 ? exactPoVariants : [itemPoNo]);

        const matchedExisting = (existingRows || []).find((r: any) => {
          const rInsp = String(r.inspection_no || '').trim().toUpperCase();
          const rArr = String(r.arrival_no || '').trim().toUpperCase();
          const rId = String(r.mismatch_id || '').trim().toUpperCase();
          if (resolvedMrNo) {
            return rInsp === resolvedMrNo || rArr === resolvedMrNo || rId === itemId.toUpperCase() || rInsp === itemId.toUpperCase();
          }
          return rId === itemId.toUpperCase() || rInsp === itemId.toUpperCase();
        });

        if (matchedExisting) {
          const rowId = matchedExisting.id;
          const { error: updErr } = await supabase.from('material_mismatch').update(extendedMaterialRecord).eq('id', rowId);
          if (updErr) {
            const { error: baseUpdErr } = await supabase.from('material_mismatch').update(baseMaterialRecord).eq('id', rowId);
            if (!baseUpdErr) savedMaterialToDb = true;
          } else {
            savedMaterialToDb = true;
          }
        } else {
          const { error: insErr } = await supabase.from('material_mismatch').insert(extendedMaterialRecord);
          if (insErr) {
            const { error: baseInsErr } = await supabase.from('material_mismatch').insert(baseMaterialRecord);
            if (!baseInsErr) savedMaterialToDb = true;
          } else {
            savedMaterialToDb = true;
          }
        }
      } catch (e) {
        console.warn("material_mismatch write warning:", e);
      }

      // Update parent tables STRICTLY by exact PO match AND ONLY when zero other pending MRs remain on this PO.
      // Never use wildcard %token% updates (which previously caused PO 0701 to clear 07010-07015).
      if (!hasOtherPendingMrsOnSamePo && exactPoVariants.length > 0) {
        try {
          await supabase.from('sauda_check_point').update({
            mismatch_cleared: true,
            pass_status: 'pass',
            mismatch_remarks: remarks.trim(),
            approved_by: username,
            approved_at: nowIso,
            approval_level: approvalLevel,
          }).in('po_no', exactPoVariants);
        } catch (e) {}

        try {
          await supabase.from('purchase_master').update({
            mismatch_cleared: true,
            pass_status: 'pass',
            mismatch_remarks: remarks.trim(),
            approved_by: username,
            approved_at: nowIso,
            approval_level: approvalLevel,
          }).in('po_no', exactPoVariants);
        } catch (e) {}

        if (exactSaudaVariants.length > 0) {
          try {
            await supabase.from('sauda_master').update({
              mismatch_cleared: true,
              mismatch_remarks: remarks.trim(),
              approved_by: username,
              approved_at: nowIso,
              approval_level: approvalLevel,
            }).in('sauda_no', exactSaudaVariants);
          } catch (e) {}
        }
      }

      // Sync ONLY Broker, Supplier, and Challan Supplier from Sauda Check Point ->
      // Temporary Arrival, Final Arrival, and Mill Inspection (strict exact PO match)
      try {
        const cleanPo = String(itemPoNo || '').trim();
        const noPtfPo = cleanPo.replace(/^#+/, '').replace(/\(PTF\)/gi, '').trim();
        const exactPoCandidates = Array.from(new Set([
          cleanPo,
          noPtfPo,
          noPtfPo ? `#${noPtfPo}` : '',
          noPtfPo ? `${noPtfPo}(PTF)` : ''
        ].filter(Boolean)));

        let scpRecord: any = null;
        for (const cand of exactPoCandidates) {
          const { data: scpFound } = await supabase
            .from('sauda_check_point')
            .select('*')
            .ilike('po_no', cand)
            .limit(1);
          if (Array.isArray(scpFound) && scpFound.length > 0) {
            scpRecord = scpFound[0];
            break;
          }
          const { data: scpContractFound } = await supabase
            .from('sauda_check_point')
            .select('*')
            .ilike('contract_po_no', cand)
            .limit(1);
          if (Array.isArray(scpContractFound) && scpContractFound.length > 0) {
            scpRecord = scpContractFound[0];
            break;
          }
        }

        const cleanPartyVal = (val: any) => {
          const s = safeStr(val, '').trim();
          return s && s.toUpperCase() !== 'N/A' ? s : '';
        };

        const scpBroker = cleanPartyVal(scpRecord?.broker_name || scpRecord?.broker || targetItem?.brokerName);
        const scpSupplier = cleanPartyVal(scpRecord?.supplier_name || scpRecord?.supplier || scpRecord?.party_name || targetItem?.supplierName);
        const scpChallanSupplier = cleanPartyVal(
          scpRecord
            ? (scpRecord.challan_supplier_name || scpRecord.challan_supplier || scpRecord.challan_party || scpSupplier)
            : (targetItem?.challanSupplier || scpSupplier)
        );

        const arrivalPartyPatch: Record<string, any> = {};
        if (scpBroker) arrivalPartyPatch.broker = scpBroker;
        if (scpSupplier) arrivalPartyPatch.supplier = scpSupplier;
        if (scpChallanSupplier) arrivalPartyPatch.challan_supplier = scpChallanSupplier;

        const millInspPartyPatch: Record<string, any> = {};
        if (scpBroker) {
          millInspPartyPatch.broker = scpBroker;
          millInspPartyPatch.broker_name = scpBroker;
        }
        if (scpSupplier) {
          millInspPartyPatch.supplier = scpSupplier;
          millInspPartyPatch.supplier_name = scpSupplier;
        }
        if (scpChallanSupplier) {
          millInspPartyPatch.challan_supplier = scpChallanSupplier;
        }

        if (Object.keys(arrivalPartyPatch).length > 0) {
          for (const cand of exactPoCandidates) {
            // 1. Temporary Arrival Section (temporary_material_received)
            await supabase
              .from('temporary_material_received')
              .update(arrivalPartyPatch)
              .eq('po_no', cand)
              .then(() => {}, () => {});

            // 2. Final Arrival Section (final_arrival)
            await supabase
              .from('final_arrival')
              .update(arrivalPartyPatch)
              .eq('po_no', cand)
              .then(() => {}, () => {});
          }
        }

        if (Object.keys(millInspPartyPatch).length > 0) {
          for (const cand of exactPoCandidates) {
            // 3. Mill Inspection Section (material_inspection & mill_inspection_master)
            await supabase
              .from('material_inspection')
              .update(millInspPartyPatch)
              .eq('po_no', cand)
              .then(() => {}, () => {});
            await supabase
              .from('material_inspection')
              .update(millInspPartyPatch)
              .eq('mill_po_no', cand)
              .then(() => {}, () => {});
            await supabase
              .from('mill_inspection_master')
              .update(millInspPartyPatch)
              .eq('po_no', cand)
              .then(() => {}, () => {});
            await supabase
              .from('mill_inspection_master')
              .update(millInspPartyPatch)
              .eq('mill_po_no', cand)
              .then(() => {}, () => {});
          }
        }
      } catch (syncErr) {
        console.warn("Sauda Check Point party sync warning on mismatch approval:", syncErr);
      }
    }

    if (!savedMaterialToDb) {
      await dbModule.upsert('material_mismatch', { ...extendedMaterialRecord, mismatch_id: itemId }, 'mismatch_id').catch(() => {});
    }

    // Optimistically update local state immediately so user sees it resolved on screen
    setMismatchList(prev => prev.map(m => {
      if (m.id === itemId || (resolvedMrNo ? (m.poNo === itemPoNo && m.mrNo === resolvedMrNo) : m.poNo === itemPoNo)) {
        return {
          ...m,
          status: 'resolved',
          resolutionNotes: remarks.trim(),
          resolvedBy: username,
          resolvedAt: nowIso.split('T')[0],
          approvalLevel: approvalLevel,
        };
      }
      return m;
    }));

    // Dispatch global live update events
    window.dispatchEvent(new CustomEvent('mismatch_resolved', { detail: { poNo: itemPoNo, mrNo: resolvedMrNo || undefined } }));
    window.dispatchEvent(new CustomEvent('app-data-updated', { detail: { table: 'material_mismatch', tables: ['material_mismatch', 'sauda_check_point', 'purchase_master'] } }));

    // Refetch fresh data from database
    await loadMismatches();

    setSuccessToast(`Purchase Order [${itemPoNo}]${resolvedMrNo ? ` (MR: ${resolvedMrNo})` : ''} Material Mismatch approved and cleared by ${approvalLevel} level user.`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const normalizeItemDateYmd = (rawDate?: string): string => {
    const s = String(rawDate || '').trim().split('T')[0].trim();
    if (!s) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    return '';
  };

  const pendingTillCutoffItems = useMemo(() => {
    return mismatchList.filter((m) => {
      if (m.status !== 'pending') return false;
      const d = normalizeItemDateYmd(m.mrDate || m.detectedAt);
      return Boolean(d && d <= ONE_TIME_APPROVAL_CUTOFF_DATE);
    });
  }, [mismatchList]);

  const handleBulkApproveTillCutoff = async (explicitItems?: MaterialMismatchItem[]) => {
    const sourceList = explicitItems || mismatchList;
    const eligible = sourceList.filter((m) => {
      if (m.status !== 'pending') return false;
      const d = normalizeItemDateYmd(m.mrDate || m.detectedAt);
      return Boolean(d && d <= ONE_TIME_APPROVAL_CUTOFF_DATE);
    });
    if (eligible.length === 0 || isBulkApproving) return;

    setIsBulkApproving(true);
    try {
      const ctx = getCurrentUserContext();
      const username = ctx.username || ctx.userName || 'Administrator';
      const approvalLevel = (ctx.userLevel || ctx.userRole || 'ADMIN').toUpperCase();
      const nowIso = new Date().toISOString();
      const todayYmd = nowIso.split('T')[0];
      const bulkRemarks = `One-time approved (MR Date <= ${ONE_TIME_APPROVAL_CUTOFF_DATE})`;

      const eligibleIdSet = new Set(eligible.map((e) => e.id));
      const remainingPendingPos = Array.from(
        new Set(
          sourceList
            .filter((m) => m.status === 'pending' && !eligibleIdSet.has(m.id))
            .map((m) => m.poNo)
            .filter(Boolean)
        )
      );

      let approvedCount = 0;
      let serverSucceeded = false;

      // 1. Try fast single-call server endpoint first
      try {
        const resp = await fetch('/api/material-mismatch/bulk-approve-till-date', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cutoffDate: ONE_TIME_APPROVAL_CUTOFF_DATE,
            approvedBy: username,
            approvalLevel,
            remarks: bulkRemarks,
            remainingPendingPos,
            items: eligible.map((item) => ({
              id: item.id,
              poNo: item.poNo,
              mrNo: item.mrNo,
              mrDate: item.mrDate,
              detectedAt: item.detectedAt,
              saudaNo: item.saudaNo,
              supplierName: item.supplierName,
              brokerName: item.brokerName,
              area: item.area,
              grade: item.grade,
              agency: item.agency,
              ptfMode: item.ptfMode,
              challanSupplier: item.challanSupplier,
              ratePerMt: item.ratePerMt,
              lorryNumber: item.lorryNumber,
              mismatchedFields: item.mismatchedFields,
              issueDescription: item.issueDescription,
              severity: item.severity,
            })),
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data?.success) {
            approvedCount = Number(data.approvedCount || eligible.length);
            serverSucceeded = true;
          }
        }
      } catch (_apiErr) {}

      // 2. Fallback to direct batched DB writes if server hasn't been restarted yet
      if (!serverSucceeded && supabase) {
        const { data: existingAll } = await supabase.from('material_mismatch').select('*');
        const existingRows: any[] = Array.isArray(existingAll) ? existingAll : [];
        const existingById = new Map<string, any>();
        existingRows.forEach((r: any) => {
          const rId = String(r.mismatch_id || '').trim().toUpperCase();
          if (rId) existingById.set(rId, r);
        });

        const BATCH_SIZE = 15;
        for (let i = 0; i < eligible.length; i += BATCH_SIZE) {
          const chunk = eligible.slice(i, i + BATCH_SIZE);
          await Promise.all(
            chunk.map(async (item) => {
              const resolvedMrNo = (item.mrNo || '').trim().toUpperCase();
              const baseRecord: Record<string, any> = {
                po_no: item.poNo,
                arrival_no: resolvedMrNo || (item.lorryNumber && item.lorryNumber !== 'N/A' ? item.lorryNumber : 'N/A'),
                inspection_no: resolvedMrNo || item.id,
                area: item.area || 'DAISEE',
                grade: item.grade || 'N/A',
                field: Array.isArray(item.mismatchedFields) ? item.mismatchedFields.join(', ') : 'Material Mismatch',
                expected_value: item.issueDescription || 'PO Specifications',
                actual_value: item.issueDescription || 'Material Inspection Variance',
                status: 'resolved',
                remarks: `[APPROVED by ${username} (${approvalLevel}) on ${todayYmd}]: ${bulkRemarks}`,
              };
              const extendedRecord: Record<string, any> = {
                ...baseRecord,
                mismatch_id: item.id,
                approved_by: username,
                approved_at: nowIso,
                approval_level: approvalLevel,
                supplier: item.supplierName || null,
                broker: item.brokerName || null,
                agency: item.agency || null,
                ptf_mode: item.ptfMode || null,
                challan_supplier: item.challanSupplier || null,
                rate_per_mt: item.ratePerMt || null,
                lorry_number: item.lorryNumber || null,
                issue_description: item.issueDescription || null,
                mismatched_fields: Array.isArray(item.mismatchedFields) ? item.mismatchedFields.join(', ') : null,
                severity: item.severity || 'medium',
              };
              const existing = existingById.get(item.id.toUpperCase());
              if (existing?.id) {
                const { error } = await supabase.from('material_mismatch').update(extendedRecord).eq('id', existing.id);
                if (error) await supabase.from('material_mismatch').update(baseRecord).eq('id', existing.id);
              } else {
                const { error } = await supabase.from('material_mismatch').insert(extendedRecord);
                if (error) await supabase.from('material_mismatch').insert(baseRecord);
              }
              approvedCount++;
            })
          );
        }

        const remainingPoSet = new Set(remainingPendingPos.map((p) => p.trim().toUpperCase()));
        const clearedPos = Array.from(new Set(eligible.map((e) => e.poNo))).filter(
          (po) => !remainingPoSet.has(po.trim().toUpperCase())
        );
        const parentVariants = Array.from(new Set(clearedPos.flatMap((po) => buildExactPoQueryVariants(po))));
        if (parentVariants.length > 0) {
          const patch = {
            mismatch_cleared: true,
            pass_status: 'pass',
            mismatch_remarks: bulkRemarks,
            approved_by: username,
            approved_at: nowIso,
            approval_level: approvalLevel,
          };
          await supabase.from('sauda_check_point').update(patch).in('po_no', parentVariants).then(() => {}, () => {});
          await supabase.from('purchase_master').update(patch).in('po_no', parentVariants).then(() => {}, () => {});
        }
      }

      // Immediately reflect all approved MRs in UI state
      setMismatchList((prev) =>
        prev.map((m) =>
          eligibleIdSet.has(m.id)
            ? {
                ...m,
                status: 'resolved',
                resolutionNotes: bulkRemarks,
                resolvedBy: username,
                resolvedAt: todayYmd,
                approvalLevel,
              }
            : m
        )
      );

      window.dispatchEvent(new CustomEvent('mismatch_resolved', { detail: { bulkCutoffDate: ONE_TIME_APPROVAL_CUTOFF_DATE } }));
      window.dispatchEvent(
        new CustomEvent('app-data-updated', {
          detail: { table: 'material_mismatch', tables: ['material_mismatch', 'sauda_check_point', 'purchase_master'] },
        })
      );

      await loadMismatches();

      setSuccessToast(
        `Approved ${approvedCount || eligible.length} Material Mismatch MR(s) dated <= ${ONE_TIME_APPROVAL_CUTOFF_DATE}.`
      );
      setTimeout(() => setSuccessToast(null), 5000);
    } catch (err) {
      console.error('Error bulk approving material mismatches:', err);
    } finally {
      setIsBulkApproving(false);
    }
  };

  // One-time automatic approval for all pending Material Mismatch MRs dated <= 2026-10-31
  useEffect(() => {
    if (variant !== 'material') return;
    if (loading || isBulkApproving || hasAutoApprovedCutoffRef.current) return;
    if (pendingTillCutoffItems.length > 0) {
      hasAutoApprovedCutoffRef.current = true;
      handleBulkApproveTillCutoff(mismatchList);
    }
  }, [variant, loading, isBulkApproving, pendingTillCutoffItems.length]);

  const handleResolveSatta = async (itemId: string, itemPoNo: string) => {
    setSavingSattaId(itemId);
    try {
      const rawRemarks = remarksMap[itemId] || '';
      const remarks = rawRemarks.trim() || 'Approved and cleared by Administrator';

      const ctx = getCurrentUserContext();
      const username = ctx.username || ctx.userName || 'Administrator';
      const approvalLevel = (ctx.userLevel || ctx.userRole || 'ADMIN').toUpperCase();
      const nowIso = new Date().toISOString();

      const targetItem = sattaMismatchList.find(i => i.id === itemId || i.poNo === itemPoNo || i.saudaNo === itemPoNo);

      const exactPoVariants = buildExactPoQueryVariants(itemPoNo);
      const exactSaudaVariants = Array.from(new Set([
        ...exactPoVariants,
        ...(targetItem?.saudaNo && targetItem.saudaNo !== 'N/A' ? buildExactPoQueryVariants(targetItem.saudaNo) : []),
      ]));

      // Generate a stable UUID for new records
      const recordUuid = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'sat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);

      // 1. Base record (compatible with standard PostgreSQL table schema)
      const baseSattaRecord: Record<string, any> = {
        id: recordUuid,
        sauda_no: String(targetItem?.saudaNo || itemPoNo || '').trim(),
        po_no: String(itemPoNo || '').trim(),
        area: String(targetItem?.area || 'DAISEE'),
        grade: String(targetItem?.grade || 'TD6'),
        field: 'Price Dispute',
        expected_value: String(targetItem?.sattaFinalRateQtl || ''),
        actual_value: String(targetItem?.poRateQtl || ''),
        expected_rate: Number(targetItem?.sattaFinalRateQtl || 0),
        actual_rate: Number(targetItem?.poRateQtl || 0),
        status: 'resolved',
        remarks: `[APPROVED by ${username} (${approvalLevel}) on ${nowIso.split('T')[0]}]: ${remarks.trim()}`,
      };

      // 2. Extended record (if database has extra columns)
      const extendedSattaRecord: Record<string, any> = {
        ...baseSattaRecord,
        mismatch_id: itemId,
        approved_by: username,
        approved_at: nowIso,
        approval_level: approvalLevel,
      };

      let savedSattaToDb = false;
      if (supabase) {
        try {
          // Query existing rows using exact mismatch_id / exact PO variants (never %suffix% wildcard)
          const { data: existingById } = await supabase
            .from('satta_mismatch')
            .select('*')
            .eq('mismatch_id', itemId);
          let existingRows = existingById || [];
          if (existingRows.length === 0 && exactPoVariants.length > 0) {
            const { data: existingByPo } = await supabase
              .from('satta_mismatch')
              .select('*')
              .in('po_no', exactPoVariants);
            existingRows = existingByPo || [];
          }

          if (existingRows && existingRows.length > 0) {
            const rowId = existingRows[0].id;
            const updatePayload = { ...extendedSattaRecord };
            delete updatePayload.id;
            const { error: updErr } = await supabase.from('satta_mismatch').update(updatePayload).eq('id', rowId);
            if (updErr) {
              const basePayload = { ...baseSattaRecord };
              delete basePayload.id;
              const { error: baseUpdErr } = await supabase.from('satta_mismatch').update(basePayload).eq('id', rowId);
              if (!baseUpdErr) savedSattaToDb = true;
            } else {
              savedSattaToDb = true;
            }
          } else {
            const { error: insErr } = await supabase.from('satta_mismatch').insert(extendedSattaRecord);
            if (insErr) {
              const { error: baseInsErr } = await supabase.from('satta_mismatch').insert(baseSattaRecord);
              if (!baseInsErr) savedSattaToDb = true;
            } else {
              savedSattaToDb = true;
            }
          }
        } catch (e) {
          console.warn("satta_mismatch write warning:", e);
        }

        // Update parent tables STRICTLY by exact PO / Sauda variants (never %token% wildcards)
        const sattaApprovalPatch = {
          satta_dispute_approved: true,
          mismatch_cleared: true,
          satta_remarks: remarks.trim(),
          approved_by: username,
          approved_at: nowIso,
          approval_level: approvalLevel,
        };

        if (exactSaudaVariants.length > 0) {
          try { await supabase.from('sauda_master').update(sattaApprovalPatch).in('sauda_no', exactSaudaVariants); } catch (e) {}
          try { await supabase.from('sms_sauda').update(sattaApprovalPatch).in('sauda_no', exactSaudaVariants); } catch (e) {}
          try { await supabase.from('sauda_check_point').update(sattaApprovalPatch).in('contract_po_no', exactSaudaVariants); } catch (e) {}
          try { await supabase.from('purchase_master').update(sattaApprovalPatch).in('contract_po_no', exactSaudaVariants); } catch (e) {}
        }
        if (exactPoVariants.length > 0) {
          try { await supabase.from('sauda_check_point').update(sattaApprovalPatch).in('po_no', exactPoVariants); } catch (e) {}
          try { await supabase.from('purchase_master').update(sattaApprovalPatch).in('po_no', exactPoVariants); } catch (e) {}
        }
      }

      if (!savedSattaToDb) {
        await dbModule.upsert('satta_mismatch', { ...extendedSattaRecord, mismatch_id: itemId }, 'mismatch_id').catch(() => {});
      }

      // Optimistically update local state immediately so user sees it resolved on screen
      setSattaMismatchList(prev => prev.map(s => {
        if (s.id === itemId || s.poNo === itemPoNo || (s.saudaNo && s.saudaNo === itemPoNo)) {
          return {
            ...s,
            status: 'resolved',
            resolutionNotes: remarks.trim(),
            resolvedBy: username,
            resolvedAt: nowIso.split('T')[0],
            approvalLevel: approvalLevel,
          };
        }
        return s;
      }));

      // Clear input remarks for this item
      setRemarksMap(prev => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });

      window.dispatchEvent(new CustomEvent('satta_resolved', { detail: { poNo: itemPoNo, itemId } }));
      window.dispatchEvent(new CustomEvent('app-data-updated'));
      await loadMismatches();

      setSuccessToast(`Satta Price Dispute for [${itemPoNo}] approved, saved, and cleared by ${approvalLevel} level user.`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err) {
      console.error('Failed to resolve Satta dispute:', err);
    } finally {
      setSavingSattaId(null);
    }
  };

  const handleResolveSattaGroup = async (group: SattaGroupedItem) => {
    const groupKey = group.key;
    setSavingSattaId(groupKey);
    try {
      const rawRemarks = remarksMap[groupKey] || remarksMap[group.poNo] || remarksMap[group.saudaNo] || '';
      const remarks = rawRemarks.trim() || 'Approved and cleared by Administrator';

      const ctx = getCurrentUserContext();
      const username = ctx.username || ctx.userName || 'Administrator';
      const approvalLevel = (ctx.userLevel || ctx.userRole || 'ADMIN').toUpperCase();
      const nowIso = new Date().toISOString();

      const itemPoNo = group.poNo;
      const cleanPoNo = String(itemPoNo || '').trim().toUpperCase();
      const cleanSaudaNo = String(group.saudaNo || '').trim().toUpperCase();

      // Collect strict exact PO and Sauda query variants (never %suffix% wildcards)
      const exactPoVariants = buildExactPoQueryVariants(cleanPoNo);
      const exactSaudaVariants = Array.from(new Set([
        ...exactPoVariants,
        ...(cleanSaudaNo && cleanSaudaNo !== 'N/A' ? buildExactPoQueryVariants(cleanSaudaNo) : []),
      ]));

      // Save each item resolution
      for (const item of group.items) {

        const recordUuid = typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : 'sat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);

        const baseSattaRecord: Record<string, any> = {
          id: recordUuid,
          sauda_no: String(item.saudaNo || group.saudaNo || itemPoNo || '').trim(),
          po_no: String(item.poNo || itemPoNo || '').trim(),
          area: String(item.area || 'DAISEE'),
          grade: String(item.grade || 'TD6'),
          field: 'Price Dispute',
          expected_value: String(item.sattaFinalRateQtl || ''),
          actual_value: String(item.poRateQtl || ''),
          expected_rate: Number(item.sattaFinalRateQtl || 0),
          actual_rate: Number(item.poRateQtl || 0),
          status: 'resolved',
          remarks: `[APPROVED by ${username} (${approvalLevel}) on ${nowIso.split('T')[0]}]: ${remarks.trim()}`,
        };

        const extendedSattaRecord: Record<string, any> = {
          ...baseSattaRecord,
          mismatch_id: item.id,
          approved_by: username,
          approved_at: nowIso,
          approval_level: approvalLevel,
        };

        let savedGroupItemToDb = false;
        if (supabase) {
          try {
            const { data: existingById } = await supabase
              .from('satta_mismatch')
              .select('*')
              .eq('mismatch_id', item.id);
            let existingRows = existingById || [];
            if (existingRows.length === 0) {
              const itemPoVariants = buildExactPoQueryVariants(item.poNo || itemPoNo);
              if (itemPoVariants.length > 0) {
                const { data: existingByPo } = await supabase
                  .from('satta_mismatch')
                  .select('*')
                  .in('po_no', itemPoVariants);
                existingRows = existingByPo || [];
              }
            }

            if (existingRows && existingRows.length > 0) {
              const rowId = existingRows[0].id;
              const updatePayload = { ...extendedSattaRecord };
              delete updatePayload.id;
              const { error: updErr } = await supabase.from('satta_mismatch').update(updatePayload).eq('id', rowId);
              if (updErr) {
                const basePayload = { ...baseSattaRecord };
                delete basePayload.id;
                const { error: baseUpdErr } = await supabase.from('satta_mismatch').update(basePayload).eq('id', rowId);
                if (!baseUpdErr) savedGroupItemToDb = true;
              } else {
                savedGroupItemToDb = true;
              }
            } else {
              const { error: insErr } = await supabase.from('satta_mismatch').insert(extendedSattaRecord);
              if (insErr) {
                const { error: baseInsErr } = await supabase.from('satta_mismatch').insert(baseSattaRecord);
                if (!baseInsErr) savedGroupItemToDb = true;
              } else {
                savedGroupItemToDb = true;
              }
            }
          } catch (e) {
            console.warn("satta_mismatch write warning:", e);
          }
        }

        if (!savedGroupItemToDb) {
          await dbModule.upsert('satta_mismatch', { ...extendedSattaRecord, mismatch_id: item.id }, 'mismatch_id').catch(() => {});
        }
      }

      if (supabase) {
        const sattaApprovalPatch = {
          satta_dispute_approved: true,
          mismatch_cleared: true,
          satta_remarks: remarks.trim(),
          approved_by: username,
          approved_at: nowIso,
          approval_level: approvalLevel,
        };
        if (exactSaudaVariants.length > 0) {
          try { await supabase.from('sauda_master').update(sattaApprovalPatch).in('sauda_no', exactSaudaVariants); } catch (e) {}
          try { await supabase.from('sms_sauda').update(sattaApprovalPatch).in('sauda_no', exactSaudaVariants); } catch (e) {}
          try { await supabase.from('sauda_check_point').update(sattaApprovalPatch).in('contract_po_no', exactSaudaVariants); } catch (e) {}
          try { await supabase.from('purchase_master').update(sattaApprovalPatch).in('contract_po_no', exactSaudaVariants); } catch (e) {}
        }
        if (exactPoVariants.length > 0) {
          try { await supabase.from('sauda_check_point').update(sattaApprovalPatch).in('po_no', exactPoVariants); } catch (e) {}
          try { await supabase.from('purchase_master').update(sattaApprovalPatch).in('po_no', exactPoVariants); } catch (e) {}
        }
      }

      // Optimistically update local state immediately
      setSattaMismatchList(prev => prev.map(s => {
        const sKey = (s.poNo || s.saudaNo || s.id).trim().toUpperCase();
        if (sKey === groupKey || s.poNo === itemPoNo || (s.saudaNo && s.saudaNo === group.saudaNo) || group.items.some(gi => gi.id === s.id)) {
          return {
            ...s,
            status: 'resolved',
            resolutionNotes: remarks.trim(),
            resolvedBy: username,
            resolvedAt: nowIso.split('T')[0],
            approvalLevel: approvalLevel,
          };
        }
        return s;
      }));

      // Clear input remarks
      setRemarksMap(prev => {
        const next = { ...prev };
        delete next[groupKey];
        delete next[group.poNo];
        delete next[group.saudaNo];
        group.items.forEach(gi => delete next[gi.id]);
        return next;
      });

      window.dispatchEvent(new CustomEvent('satta_resolved', { detail: { poNo: itemPoNo, saudaNo: group.saudaNo } }));
      window.dispatchEvent(new CustomEvent('app-data-updated'));
      await loadMismatches();

      setSuccessToast(`Satta Price Dispute for Sauda [${itemPoNo}] (${group.items.length} quality items) approved, saved, and cleared by ${approvalLevel} level user.`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err) {
      console.error('Failed to resolve Satta dispute group:', err);
    } finally {
      setSavingSattaId(null);
    }
  };

  const supplierOptions = Array.from(
    new Set(mismatchList.map(i => i.supplierName).filter(s => s && s !== 'N/A'))
  ).sort();

  const brokerOptions = Array.from(
    new Set(mismatchList.map(i => i.brokerName).filter(b => b && b !== 'N/A'))
  ).sort();

  const filteredMismatchList = mismatchList.filter(item => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      item.supplierName.toLowerCase().includes(q) ||
      item.poNo.toLowerCase().includes(q) ||
      (item.mrNo ? item.mrNo.toLowerCase().includes(q) : false) ||
      item.brokerName.toLowerCase().includes(q) ||
      item.area.toLowerCase().includes(q) ||
      item.grade.toLowerCase().includes(q) ||
      item.issueDescription.toLowerCase().includes(q);

    const matchesStatus = 
      filterStatus === 'all' ? true : item.status === filterStatus;

    const matchesSupplier = 
      selectedSupplier === 'ALL' ? true : item.supplierName.toLowerCase() === selectedSupplier.toLowerCase();

    const matchesBroker = 
      selectedBroker === 'ALL' ? true : item.brokerName.toLowerCase() === selectedBroker.toLowerCase();

    return matchesSearch && matchesStatus && matchesSupplier && matchesBroker;
  });

  const filteredSattaList = sattaMismatchList.filter(item => {
    const matchesSearch = 
      item.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.poNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.saudaNo && item.saudaNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.brokerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.grade.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = 
      sattaFilterStatus === 'all' ? true : item.status === sattaFilterStatus;

    const matchesSource = 
      sattaSourceFilter === 'ALL' 
        ? true 
        : sattaSourceFilter === 'sauda_master' 
          ? (item.sourceType === 'sauda_master' || item.sourceType === 'sms_sauda')
          : item.sourceType === sattaSourceFilter;

    const matchesSupplier = 
      selectedSupplier === 'ALL' ? true : item.supplierName.toLowerCase() === selectedSupplier.toLowerCase();

    const matchesBroker = 
      selectedBroker === 'ALL' ? true : item.brokerName.toLowerCase() === selectedBroker.toLowerCase();

    return matchesSearch && matchesStatus && matchesSource && matchesSupplier && matchesBroker;
  });

  const sattaGroups: SattaGroupedItem[] = useMemo(() => {
    const map = new Map<string, SattaMismatchItem[]>();
    sattaMismatchList.forEach(item => {
      const key = (item.poNo || item.saudaNo || item.id).trim().toUpperCase();
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(item);
    });

    const groups: SattaGroupedItem[] = [];
    map.forEach((items, key) => {
      const first = items[0];
      const hasDispute = items.some(i => i.status === 'dispute');
      const isAllResolved = items.every(i => i.status === 'resolved');
      const isAllOk = items.every(i => i.status === 'ok');
      const disputeCount = items.filter(i => i.status === 'dispute').length;
      const resolvedCount = items.filter(i => i.status === 'resolved').length;
      const okCount = items.filter(i => i.status === 'ok').length;

      const areaList = Array.from(new Set(items.map(i => i.area).filter(Boolean)));
      const gradeList = Array.from(new Set(items.map(i => i.grade).filter(Boolean)));

      const saudaRates = items.map(i => i.poRateQtl);
      const sattaLimits = items.map(i => i.sattaFinalRateQtl);
      const diffs = items.map(i => i.differenceQtl);

      const minSaudaRateQtl = Math.min(...saudaRates);
      const maxSaudaRateQtl = Math.max(...saudaRates);
      const minSattaLimitQtl = Math.min(...sattaLimits);
      const maxSattaLimitQtl = Math.max(...sattaLimits);
      const maxDifferenceQtl = Math.max(...diffs);
      const minDifferenceQtl = Math.min(...diffs);

      const resolvedItem = items.find(i => i.status === 'resolved' && (i.resolutionNotes || i.resolvedBy));

      const overallStatus: 'dispute' | 'resolved' | 'ok' = hasDispute 
        ? 'dispute' 
        : (isAllResolved || resolvedCount > 0 ? 'resolved' : 'ok');

      groups.push({
        key,
        poNo: first.poNo,
        saudaNo: first.saudaNo || first.poNo,
        poDate: first.poDate,
        supplierName: first.supplierName,
        brokerName: first.brokerName,
        items,
        hasDispute,
        isAllResolved,
        isAllOk,
        disputeCount,
        resolvedCount,
        okCount,
        totalCount: items.length,
        areaList,
        gradeList,
        minSaudaRateQtl,
        maxSaudaRateQtl,
        minSattaLimitQtl,
        maxSattaLimitQtl,
        maxDifferenceQtl,
        minDifferenceQtl,
        status: overallStatus,
        latestResolvedBy: resolvedItem?.resolvedBy || first.resolvedBy,
        latestResolvedAt: resolvedItem?.resolvedAt || first.resolvedAt,
        latestApprovalLevel: resolvedItem?.approvalLevel || first.approvalLevel,
        latestResolutionNotes: resolvedItem?.resolutionNotes || first.resolutionNotes,
      });
    });

    return groups;
  }, [sattaMismatchList]);

  const filteredSattaGroups = useMemo(() => {
    return sattaGroups.filter(group => {
      const matchesSearch = 
        group.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.poNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (group.saudaNo && group.saudaNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
        group.brokerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.areaList.some(a => a.toLowerCase().includes(searchQuery.toLowerCase())) ||
        group.gradeList.some(g => g.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = 
        sattaFilterStatus === 'all' 
          ? true 
          : sattaFilterStatus === 'dispute' 
            ? group.hasDispute 
            : sattaFilterStatus === 'resolved' 
              ? (group.isAllResolved || (group.resolvedCount > 0 && !group.hasDispute)) 
              : group.isAllOk;

      const matchesSupplier = 
        selectedSupplier === 'ALL' ? true : group.supplierName.toLowerCase() === selectedSupplier.toLowerCase();

      const matchesBroker = 
        selectedBroker === 'ALL' ? true : group.brokerName.toLowerCase() === selectedBroker.toLowerCase();

      return matchesSearch && matchesStatus && matchesSupplier && matchesBroker;
    });
  }, [sattaGroups, searchQuery, sattaFilterStatus, selectedSupplier, selectedBroker]);

  const downloadCSV = () => {
    let csvContent = "";
    if (activeTab === 'ruka_to_satta') {
      csvContent = "data:text/csv;charset=utf-8," 
        + ["Mismatch ID,P.O. / Sauda No,Date,Supplier,Area,Grade,Sauda Rate (₹/Qtl),Satta Limit Rate (₹/Qtl),Variance (₹/Qtl),Status,Approved By,Remarks"]
          .concat(sattaMismatchList.map(item => 
            `"${item.id}","${item.poNo}","${item.poDate}","${item.supplierName}","${item.area}","${item.grade}","${item.poRateQtl}","${item.sattaFinalRateQtl}","${item.differenceQtl}","${item.status}","${item.resolvedBy || 'N/A'}","${item.resolutionNotes || 'N/A'}"`
          )).join("\n");
    } else {
      csvContent = "data:text/csv;charset=utf-8," 
        + ["P.O. Number,M.R. Number,Supplier,Broker,Area,Grade,Mismatched Fields,Status,Approved By,Remarks"]
          .concat(mismatchList.map(item => 
            `"${item.poNo}","${item.mrNo || 'N/A'}","${item.supplierName}","${item.brokerName}","${item.area}","${item.grade}","${item.mismatchedFields.join('; ')}","${item.status}","${item.resolvedBy || 'N/A'}","${item.resolutionNotes || 'N/A'}"`
          )).join("\n");
    }
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `BJCL-Mismatch-${activeTab === 'ruka_to_satta' ? 'Satta' : 'Material'}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const pendingCount = mismatchList.filter(i => i.status === 'pending').length;
  const resolvedCount = mismatchList.filter(i => i.status === 'resolved').length;

  return (
    <LegacyLayout title={variant === 'material' ? "Material Mismatch Board" : "Satta Mismatch"} subtitle="">
      <div className="space-y-5 max-w-full px-1 sm:px-2">
        {/* Header Stats & Quick Action Bar */}
        <div className="bg-white border border-slate-300 rounded-lg p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <Scale className="h-5 w-5 text-indigo-700" />
              <span>{variant === 'material' ? "Material Mismatch Board (Base Mode)" : "Satta Price Mismatch"}</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {variant === 'material' 
                ? "MR-wise comparison between Mill Inspection and Sauda Check Point only (Name-only matching, no numbers or codes). Always fetched fresh from database."
                : "Validating contract rates registered in sauda_master (Sauda Desk) against active Satta Chart limits."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={loadMismatches}
              disabled={loading}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-xs font-bold text-slate-800 transition flex items-center gap-1.5"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 text-slate-600", loading && "animate-spin")} />
              <span>Fetch Fresh Data</span>
            </button>
            <button
              onClick={downloadCSV}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 rounded text-xs font-bold transition flex items-center gap-1.5"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-indigo-600" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Deep-Link Focused Resolution Banner (from Payment / MR Settlement) */}
        {variant === 'material' && navTarget && (
          <div className="p-3 bg-indigo-50 border border-indigo-300 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
            <div className="flex items-center gap-2 text-indigo-900 font-bold">
              <AlertTriangle className="h-4 w-4 text-indigo-600 shrink-0" />
              <span>
                Focused from {navTarget.returnPage === 'payment' ? 'Payment Operation' : 'MR Settlement'}:
                {' '}P.O. <span className="font-mono">{navTarget.poNo}</span>
                {navTarget.mrNo ? <> | M.R. <span className="font-mono">{navTarget.mrNo}</span></> : null}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const t = navTarget;
                  setNavTarget(null);
                  returnFromMaterialMismatch(t);
                }}
                className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded text-xs font-bold transition flex items-center gap-1.5"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>{navTarget.returnLabel}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  clearMaterialMismatchNavigationTarget();
                  setNavTarget(null);
                }}
                title="Dismiss focus banner"
                className="p-1 text-indigo-500 hover:text-indigo-800 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Notifications */}
        {successToast && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg flex items-center gap-2 text-xs font-bold text-emerald-800 shadow-xs">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Main Content Area */}
        {variant === 'material' ? (
          <MaterialMismatchView
            loading={loading}
            mismatchList={mismatchList}
            filteredMismatchList={filteredMismatchList}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            selectedSupplier={selectedSupplier}
            setSelectedSupplier={setSelectedSupplier}
            selectedBroker={selectedBroker}
            setSelectedBroker={setSelectedBroker}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            supplierOptions={supplierOptions}
            brokerOptions={brokerOptions}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            pageSize={pageSize}
            setPageSize={setPageSize}
            remarksMap={remarksMap}
            setRemarksMap={setRemarksMap}
            handleResolve={handleResolve}
            pendingTillCutoffCount={pendingTillCutoffItems.length}
            cutoffDate={ONE_TIME_APPROVAL_CUTOFF_DATE}
            isBulkApproving={isBulkApproving}
            onBulkApproveTillCutoff={() => handleBulkApproveTillCutoff()}
          />
        ) : (
          <SattaMismatchView
            sattaFilterStatus={sattaFilterStatus}
            setSattaFilterStatus={setSattaFilterStatus}
            sattaMismatchList={sattaMismatchList}
            expandAllSaudas={expandAllSaudas}
            collapseAllSaudas={collapseAllSaudas}
            filteredSattaGroups={filteredSattaGroups}
            filteredSattaList={filteredSattaList}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            loading={loading}
            sattaCurrentPage={sattaCurrentPage}
            setSattaCurrentPage={setSattaCurrentPage}
            sattaPageSize={sattaPageSize}
            setSattaPageSize={setSattaPageSize}
            expandedSaudaKeys={expandedSaudaKeys}
            toggleExpandSauda={toggleExpandSauda}
            canApproveMismatch={canApproveMismatch}
            remarksMap={remarksMap}
            setRemarksMap={setRemarksMap}
            handleResolveSattaGroup={handleResolveSattaGroup}
            savingSattaId={savingSattaId}
          />
        )}

      </div>
    </LegacyLayout>
  );
}
