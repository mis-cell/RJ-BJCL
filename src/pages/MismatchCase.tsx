import React, { useState, useEffect, useMemo } from 'react';
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
  Eye
} from 'lucide-react';
import { cn, canApproveMismatch } from '../lib/utils';
import { dbModule } from '../services/dbModule';
import { supabase } from '../lib/supabase';
import { comparePoInspection, compareSaudaTempArrival, PoMismatchDetail } from '../lib/poMatch';
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
      const [scpRows, scpDetailRows, amadRows, matInspRows, millInspRows, dbMismatches, purchaseMasterRows, purchaseDetailRows, sattaBaseRows, sattaDiffRows, gradeRows, dbSattaMismatches, saudaMasterRows, saudaQualityRows, sattaMasterRows, sattaQualityRows, smsSaudaDbRows] = await Promise.all([
        supabase ? supabase.from('sauda_check_point').select('*').then(res => res.data || []) : dbModule.fetchAll('sauda_check_point').catch(() => []),
        supabase ? supabase.from('sauda_check_point_details').select('*').then(res => res.data || []) : dbModule.fetchAll('sauda_check_point_details').catch(() => []),
        dbModule.fetchAll('temporary_material_received').catch(() => []),
        dbModule.fetchAll('material_inspection').catch(() => []),
        dbModule.fetchAll('mill_inspection_master').catch(() => []),
        supabase ? supabase.from('material_mismatch').select('*').then(res => res.data || []) : dbModule.fetchAll('material_mismatch').catch(() => []),
        supabase ? supabase.from('purchase_master').select('*').then(res => res.data || []) : dbModule.fetchAll('purchase_master').catch(() => []),
        supabase ? supabase.from('purchase_detail_master').select('*').then(res => res.data || []) : Promise.resolve([]),
        supabase ? supabase.from('satta_base_rates').select('*').then(res => res.data || []) : Promise.resolve([]),
        supabase ? supabase.from('satta_differentials').select('*').then(res => res.data || []) : Promise.resolve([]),
        dbModule.fetchAll('grade_master').catch(() => []),
        supabase ? supabase.from('satta_mismatch').select('*').then(res => res.data || []) : dbModule.fetchAll('satta_mismatch').catch(() => []),
        supabase ? supabase.from('sauda_master').select('*').then(res => res.data || []) : dbModule.fetchAll('sauda_master').catch(() => []),
        supabase ? supabase.from('sauda_quality_details').select('*').then(res => res.data || []) : dbModule.fetchAll('sauda_quality_details').catch(() => []),
        supabase ? supabase.from('satta_master').select('*').then(res => res.data || []) : dbModule.fetchAll('satta_master').catch(() => []),
        supabase ? supabase.from('satta_quality_details').select('*').then(res => res.data || []) : dbModule.fetchAll('satta_quality_details').catch(() => []),
        supabase ? supabase.from('sms_sauda').select('*').then(res => res.data || []) : Promise.resolve([]),
      ]);

      const inspMasterRows = [...(matInspRows || []), ...(millInspRows || [])];

      let localSmsSaudas: any[] = [];
      try {
        localSmsSaudas = JSON.parse(localStorage.getItem('po_auto_sms_saudas') || '[]');
      } catch (e) {}

      const combinedSmsSaudas = [...smsSaudaDbRows, ...localSmsSaudas];

      const items: MaterialMismatchItem[] = [];

      // Combine PO sources: sauda_check_point + purchase_master + sauda_master + satta_master
      const allPoRecords = [...scpRows, ...purchaseMasterRows, ...saudaMasterRows, ...sattaMasterRows];
      const poMap = new Map<string, any>();
      allPoRecords.forEach(p => {
        const pNo = String(p.po_no || p.contract_po_no || p.sauda_no || p.satta_no || '').trim().toUpperCase();
        if (pNo && !poMap.has(pNo)) poMap.set(pNo, p);
      });

      const allDetailRecords = [...scpDetailRows, ...purchaseDetailRows, ...saudaQualityRows, ...sattaQualityRows];

      poMap.forEach((po, poNo) => {
        const matchingInspections = inspMasterRows.filter((i: any) => {
          const iPo = String(i.po_no || '').trim().toUpperCase();
          const mPo = String(i.mill_po_no || '').trim().toUpperCase();
          return (iPo && iPo === poNo) || (mPo && mPo === poNo);
        });
        const matchingAmads = amadRows.filter((a: any) => String(a.po_no || '').trim().toUpperCase() === poNo);
        const poDetails = allDetailRecords.filter((d: any) => {
          const dPo = String(d.po_no || d.sauda_no || '').trim().toUpperCase();
          if (dPo && dPo === poNo) return true;
          if (po.sauda_id && d.sauda_id && d.sauda_id === po.sauda_id) return true;
          if (po.sauda_no && d.sauda_no && String(d.sauda_no).trim().toUpperCase() === String(po.sauda_no).trim().toUpperCase()) return true;
          return false;
        });

        const latestInsp = matchingAmads[0] || matchingInspections[0] || null;
        if (!latestInsp) return;

        const enrichedInsp = {
          ...(matchingInspections[0] || {}),
          ...(matchingAmads[0] || {}),
        };

        const allLorryReceipts = [...matchingInspections];

        const matchRes = compareSaudaTempArrival(po, poDetails, enrichedInsp, allLorryReceipts);

        if (matchRes.hasInspection && matchRes.status === 'mismatch' && matchRes.mismatches.length > 0) {
          const dbMm = (dbMismatches || []).find((m: any) => {
            const mPo = String(m.po_no || '').trim().toUpperCase();
            const mId = String(m.mismatch_id || m.id || '').toUpperCase();
            const poUpper = poNo.toUpperCase();
            const poSuffix = poUpper.split('/').pop() || '';
            return (
              (mPo && (mPo === poUpper || poUpper.includes(mPo) || mPo.includes(poUpper) || (poSuffix && mPo.includes(poSuffix)))) ||
              mId === `MIS-${poUpper}` ||
              mId.includes(poUpper) ||
              (poSuffix && mId.includes(poSuffix))
            );
          });
          
          const isCleared = Boolean(
            po.mismatch_cleared === true || 
            (dbMm && (
              dbMm.status === 'resolved' || 
              dbMm.status === 'approved' ||
              dbMm.status === 'cleared' ||
              Boolean(dbMm.approved_by) ||
              String(dbMm.remarks || '').toLowerCase().includes('approved') ||
              String(dbMm.remarks || '').toLowerCase().includes('resolved')
            )) ||
            localStorage.getItem(`material_resolved_${poNo.toUpperCase()}`) ||
            (poNo.split('/').pop() && localStorage.getItem(`material_resolved_${poNo.split('/').pop()?.toUpperCase()}`)) ||
            localStorage.getItem(`material_resolved_MIS-${poNo.toUpperCase()}`)
          );

          const mismatchedLabels = matchRes.mismatches.map(m => m.mismatchLabel || `${m.field} mismatch`);

          items.push({
            id: `MIS-${poNo}`,
            poNo: poNo,
            saudaNo: po.po_contract || po.contract_no || po.sauda_no || 'N/A',
            supplierName: safeStr(po.supplier || po.supplier_name, 'N/A'),
            brokerName: safeStr(po.broker || po.broker_name, 'N/A'),
            area: safeStr(po.area, 'N/A'),
            grade: safeStr(po.grade || po.quality, 'N/A'),
            agency: safeStr(po.agency || po.agency_name, 'N/A'),
            ptfMode: po.ptf_mode || po.po_type || 'N/A',
            poContract: po.po_contract || po.contract_no || 'N/A',
            challanSupplier: safeStr(po.challan_supplier, 'N/A'),
            ratePerMt: po.b_rate ? `₹ ${po.b_rate}` : (poDetails[0]?.rate_qntl ? `₹ ${poDetails[0].rate_qntl * 10}` : 'N/A'),
            lorryNumber: enrichedInsp.lorry_number || enrichedInsp.lorry_no || 'N/A',
            lorryProgress: matchRes.lorryProgress || { totalLorries: 1, receivedLorries: 1, remainingLorries: 0 },
            mismatchedFields: mismatchedLabels,
            mismatchDetailsList: matchRes.mismatches,
            detectedAt: String(enrichedInsp.created_at || po.created_at || new Date().toISOString()).split('T')[0],
            issueDescription: `Mismatched fields detected: ${mismatchedLabels.join(', ')}.`,
            severity: matchRes.mismatches.some(m => m.field.includes('Weight') || m.field.includes('Rate')) ? 'high' : 'medium',
            status: isCleared ? 'resolved' : 'pending',
            isClosed: Boolean(po.is_closed),
            resolutionNotes: (dbMm && dbMm.remarks) || po.mismatch_remarks || undefined,
            resolvedBy: (dbMm && dbMm.approved_by) || po.approved_by || (isCleared ? 'L3/L5 User' : undefined),
            resolvedAt: (dbMm && dbMm.approved_at) ? String(dbMm.approved_at).split('T')[0] : (po.approved_at ? String(po.approved_at).split('T')[0] : (isCleared ? new Date().toISOString().split('T')[0] : undefined)),
            approvalLevel: (dbMm && dbMm.approval_level) || po.approval_level || 'L3/L5',
          });
        }
      });

      // Also include standalone records from material_mismatch table in DB
      dbMismatches.forEach((r: any) => {
        const poNo = String(r.po_no || '').trim().toUpperCase();
        if (poNo && !items.some(i => i.poNo === poNo)) {
          const labels = r.mismatched_fields ? r.mismatched_fields.split(', ') : ['Material mismatch'];
          items.push({
            id: r.mismatch_id || `MIS-${poNo}`,
            poNo: poNo,
            saudaNo: 'N/A',
            supplierName: safeStr(r.supplier, 'N/A'),
            brokerName: safeStr(r.broker, 'N/A'),
            area: safeStr(r.area, 'N/A'),
            grade: safeStr(r.grade, 'N/A'),
            agency: safeStr(r.agency, 'N/A'),
            ptfMode: r.ptf_mode || 'N/A',
            poContract: 'N/A',
            challanSupplier: safeStr(r.challan_supplier, 'N/A'),
            ratePerMt: r.rate_per_mt || 'N/A',
            lorryNumber: r.lorry_number || 'N/A',
            lorryProgress: { totalLorries: 1, receivedLorries: 1, remainingLorries: 0 },
            mismatchedFields: labels,
            mismatchDetailsList: [],
            detectedAt: r.created_at ? String(r.created_at).split('T')[0] : new Date().toISOString().split('T')[0],
            issueDescription: r.issue_description || `Mismatched fields: ${labels.join(', ')}.`,
            severity: (r.severity as any) || 'medium',
            status: r.status === 'resolved' ? 'resolved' : 'pending',
            isClosed: Boolean(poMap.get(poNo)?.is_closed || r.is_closed),
            resolutionNotes: r.remarks,
            resolvedBy: r.approved_by,
            resolvedAt: r.approved_at ? String(r.approved_at).split('T')[0] : undefined,
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

        const poSuffix = cleanPoNo.split('/').pop() || '';
        const saudaSuffix = cleanSaudaNo.split('/').pop() || '';

        const dbSattaMm = (dbSattaMismatches || []).find((sm: any) => {
          const smPo = String(sm.po_no || '').trim().toUpperCase();
          const smSauda = String(sm.sauda_no || '').trim().toUpperCase();
          const smId = String(sm.mismatch_id || sm.id || '').toUpperCase();
          return (
            (smPo && (smPo === cleanPoNo || cleanPoNo.includes(smPo) || smPo.includes(cleanPoNo) || (poSuffix && smPo.includes(poSuffix)))) ||
            (smSauda && (smSauda === cleanSaudaNo || cleanSaudaNo.includes(smSauda) || smSauda.includes(cleanSaudaNo) || (saudaSuffix && smSauda.includes(saudaSuffix)))) ||
            (cleanRefNo && smSauda && (smSauda === cleanRefNo || cleanRefNo.includes(smSauda) || smSauda.includes(cleanRefNo))) ||
            (cleanRefNo && smPo && (smPo === cleanRefNo || cleanRefNo.includes(smPo) || smPo.includes(cleanRefNo))) ||
            smId === itemId.toUpperCase() ||
            (smPo && cleanSaudaNo && (smPo.includes(cleanSaudaNo) || cleanSaudaNo.includes(smPo))) ||
            (smSauda && cleanPoNo && (smSauda.includes(cleanPoNo) || cleanPoNo.includes(smSauda))) ||
            (poSuffix && smId.includes(poSuffix)) ||
            (saudaSuffix && smId.includes(saudaSuffix))
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
          )) ||
          localStorage.getItem(`satta_resolved_${cleanPoNo}`) ||
          localStorage.getItem(`satta_resolved_${cleanSaudaNo}`) ||
          (poSuffix && localStorage.getItem(`satta_resolved_${poSuffix}`)) ||
          (saudaSuffix && localStorage.getItem(`satta_resolved_${saudaSuffix}`)) ||
          (cleanRefNo && localStorage.getItem(`satta_resolved_${cleanRefNo}`)) ||
          localStorage.getItem(`satta_resolved_${itemId.toUpperCase()}`)
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
              const poSuffix = cleanPoNo.split('/').pop() || '';
              const saudaSuffix = cleanSaudaNo.split('/').pop() || '';
              const entryId = String(entry.sauda_id || '').toUpperCase();

              const dbSattaMm = (dbSattaMismatches || []).find((sm: any) => {
                const smPo = String(sm.po_no || '').trim().toUpperCase();
                const smSauda = String(sm.sauda_no || '').trim().toUpperCase();
                const smId = String(sm.mismatch_id || sm.id || '').toUpperCase();
                return (
                  (smId && (smId === itemId.toUpperCase() || (entryId && smId.includes(entryId)))) ||
                  (smPo && (smPo === cleanPoNo || cleanPoNo.includes(smPo) || smPo.includes(cleanPoNo) || (poSuffix && smPo.includes(poSuffix)))) ||
                  (smSauda && (smSauda === cleanSaudaNo || cleanSaudaNo.includes(smSauda) || smSauda.includes(cleanSaudaNo) || (saudaSuffix && smSauda.includes(saudaSuffix))))
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
                )) ||
                (cleanPoNo && localStorage.getItem(`satta_resolved_${cleanPoNo}`)) ||
                (cleanSaudaNo && localStorage.getItem(`satta_resolved_${cleanSaudaNo}`)) ||
                (poSuffix && localStorage.getItem(`satta_resolved_${poSuffix}`)) ||
                (saudaSuffix && localStorage.getItem(`satta_resolved_${saudaSuffix}`)) ||
                (entryId && localStorage.getItem(`satta_resolved_${entryId}`)) ||
                localStorage.getItem(`satta_resolved_${itemId.toUpperCase()}`)
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
              const poSuffix = cleanPoNo.split('/').pop() || '';
              const saudaSuffix = cleanSaudaNo.split('/').pop() || '';

              const dbSattaMm = (dbSattaMismatches || []).find((sm: any) => {
                const smPo = String(sm.po_no || '').trim().toUpperCase();
                const smSauda = String(sm.sauda_no || '').trim().toUpperCase();
                const smId = String(sm.mismatch_id || sm.id || '').toUpperCase();
                return (
                  (smId && (smId === itemId.toUpperCase() || itemId.toUpperCase().includes(smId))) ||
                  (smPo && (smPo === cleanPoNo || cleanPoNo.includes(smPo) || smPo.includes(cleanPoNo) || (poSuffix && smPo.includes(poSuffix)))) ||
                  (smSauda && (smSauda === cleanSaudaNo || cleanSaudaNo.includes(smSauda) || smSauda.includes(cleanSaudaNo) || (saudaSuffix && smSauda.includes(saudaSuffix))))
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
                )) ||
                (cleanPoNo && localStorage.getItem(`satta_resolved_${cleanPoNo}`)) ||
                (cleanSaudaNo && localStorage.getItem(`satta_resolved_${cleanSaudaNo}`)) ||
                (poSuffix && localStorage.getItem(`satta_resolved_${poSuffix}`)) ||
                (saudaSuffix && localStorage.getItem(`satta_resolved_${saudaSuffix}`)) ||
                localStorage.getItem(`satta_resolved_${itemId.toUpperCase()}`)
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

  useLiveAutoRefresh(loadMismatches, [], { tables: ['material_mismatch', 'satta_mismatch', 'sauda_check_point', 'purchase_master', 'sauda_master', 'satta_master'] });

  const handleResolve = async (itemId: string, itemPoNo: string) => {
    const rawRemarks = remarksMap[itemId] || '';
    const remarks = rawRemarks.trim() || 'Approved and cleared by Administrator';

    const ctx = getCurrentUserContext();
    const username = ctx.username || ctx.userName || 'Administrator';
    const approvalLevel = (ctx.userLevel || ctx.userRole || 'ADMIN').toUpperCase();
    const nowIso = new Date().toISOString();

    const targetItem = mismatchList.find(i => i.id === itemId || i.poNo === itemPoNo);

    // Save resolution in localStorage immediately for resilient offline/local caching
    const poTokens = [
      itemPoNo,
      itemPoNo.split('/').pop() || '',
      itemPoNo.replace(/^BJCL\//i, ''),
      itemPoNo.replace(/^BJC\//i, ''),
      itemId,
      itemId.replace(/^MIS-/i, '')
    ].filter(Boolean);

    poTokens.forEach(token => {
      try {
        const tu = token.toUpperCase();
        const payload = JSON.stringify({
          resolvedBy: username,
          resolvedAt: nowIso,
          approvalLevel,
          remarks: remarks.trim(),
          status: 'resolved'
        });
        localStorage.setItem(`material_resolved_${tu}`, payload);
        localStorage.setItem(`mismatch_resolved_${tu}`, payload);
        localStorage.setItem(`mismatch_cleared_${tu}`, 'true');
        localStorage.setItem(`pass_status_${tu}`, 'pass');
      } catch (e) {}
    });

    // 1. Base record (compatible with standard PostgreSQL table schema)
    const baseMaterialRecord: Record<string, any> = {
      po_no: itemPoNo,
      arrival_no: targetItem?.lorryNumber && targetItem.lorryNumber !== 'N/A' ? targetItem.lorryNumber : 'N/A',
      inspection_no: itemId,
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

    if (supabase) {
      try {
        // First check existing rows using select('*') which never fails
        const searchSuffix = itemPoNo.split('/').pop() || itemPoNo;
        const { data: existingRows } = await supabase
          .from('material_mismatch')
          .select('*')
          .or(`po_no.ilike.%${searchSuffix}%,mismatch_id.ilike.%${searchSuffix}%`);

        if (existingRows && existingRows.length > 0) {
          const rowId = existingRows[0].id;
          const { error: updErr } = await supabase.from('material_mismatch').update(extendedMaterialRecord).eq('id', rowId);
          if (updErr) {
            await supabase.from('material_mismatch').update(baseMaterialRecord).eq('id', rowId);
          }
        } else {
          const { error: insErr } = await supabase.from('material_mismatch').insert(extendedMaterialRecord);
          if (insErr) {
            await supabase.from('material_mismatch').insert(baseMaterialRecord);
          }
        }
      } catch (e) {
        console.warn("material_mismatch write warning:", e);
      }

      // Update parent tables
      for (const token of poTokens) {
        try {
          await supabase.from('sauda_check_point').update({
            mismatch_cleared: true,
            pass_status: 'pass',
            mismatch_remarks: remarks.trim(),
            approved_by: username,
            approved_at: nowIso,
            approval_level: approvalLevel,
          }).ilike('po_no', `%${token}%`);
        } catch (e) {}

        try {
          await supabase.from('purchase_master').update({
            mismatch_cleared: true,
            pass_status: 'pass',
            mismatch_remarks: remarks.trim(),
            approved_by: username,
            approved_at: nowIso,
            approval_level: approvalLevel,
          }).ilike('po_no', `%${token}%`);
        } catch (e) {}

        try {
          await supabase.from('sauda_master').update({
            mismatch_cleared: true,
            mismatch_remarks: remarks.trim(),
            approved_by: username,
            approved_at: nowIso,
            approval_level: approvalLevel,
          }).ilike('sauda_no', `%${token}%`);
        } catch (e) {}
      }
    }

    // Direct persistence in dbModule as well
    await dbModule.insert('material_mismatch', { ...extendedMaterialRecord, id: itemId }).catch(() => {});

    // Optimistically update local state immediately so user sees it resolved on screen
    setMismatchList(prev => prev.map(m => {
      if (m.id === itemId || m.poNo === itemPoNo) {
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
    window.dispatchEvent(new CustomEvent('mismatch_resolved', { detail: { poNo: itemPoNo } }));
    window.dispatchEvent(new CustomEvent('app-data-updated'));

    // Refetch fresh data from database
    await loadMismatches();

    setSuccessToast(`Purchase Order [${itemPoNo}] Material Mismatch approved and cleared by ${approvalLevel} level user.`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

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

      // Save resolution in localStorage immediately for resilient caching
      const saudaTokens = [
        itemPoNo, 
        targetItem?.saudaNo, 
        itemPoNo.split('/').pop() || '', 
        (targetItem?.saudaNo || '').split('/').pop() || '',
        itemPoNo.replace(/^BJCL\//i, ''),
        (targetItem?.saudaNo || '').replace(/^BJCL\//i, ''),
        itemId
      ].filter(Boolean);

      saudaTokens.forEach(token => {
        try {
          const payload = JSON.stringify({
            resolvedBy: username,
            resolvedAt: nowIso,
            approvalLevel,
            remarks: remarks.trim(),
            status: 'resolved'
          });
          localStorage.setItem(`satta_resolved_${String(token).toUpperCase()}`, payload);
          localStorage.setItem(`mismatch_resolved_${String(token).toUpperCase()}`, payload);
          localStorage.setItem(`mismatch_cleared_${String(token).toUpperCase()}`, 'true');
        } catch (e) {}
      });

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

      if (supabase) {
        try {
          // Query existing rows using select('*')
          const searchToken = (targetItem?.saudaNo || itemPoNo).split('/').pop() || itemPoNo;
          const { data: existingRows } = await supabase
            .from('satta_mismatch')
            .select('*')
            .or(`mismatch_id.eq.${itemId},po_no.ilike.%${searchToken}%,sauda_no.ilike.%${searchToken}%`);

          if (existingRows && existingRows.length > 0) {
            const rowId = existingRows[0].id;
            const updatePayload = { ...extendedSattaRecord };
            delete updatePayload.id;
            const { error: updErr } = await supabase.from('satta_mismatch').update(updatePayload).eq('id', rowId);
            if (updErr) {
              const basePayload = { ...baseSattaRecord };
              delete basePayload.id;
              await supabase.from('satta_mismatch').update(basePayload).eq('id', rowId);
            }
          } else {
            const { error: insErr } = await supabase.from('satta_mismatch').insert(extendedSattaRecord);
            if (insErr) {
              await supabase.from('satta_mismatch').insert(baseSattaRecord);
            }
          }
        } catch (e) {
          console.warn("satta_mismatch write warning:", e);
        }

        // Update sauda_master, sms_sauda, sauda_check_point, and purchase_master with approval flags
        for (const token of saudaTokens) {
          try {
            await supabase.from('sauda_master').update({
              satta_dispute_approved: true,
              mismatch_cleared: true,
              satta_remarks: remarks.trim(),
              approved_by: username,
              approved_at: nowIso,
              approval_level: approvalLevel,
            }).ilike('sauda_no', `%${token}%`);
          } catch (e) {}

          try {
            await supabase.from('sms_sauda').update({
              satta_dispute_approved: true,
              mismatch_cleared: true,
              satta_remarks: remarks.trim(),
              approved_by: username,
              approved_at: nowIso,
              approval_level: approvalLevel,
            }).ilike('sauda_no', `%${token}%`);
          } catch (e) {}

          try {
            await supabase.from('sauda_check_point').update({
              satta_dispute_approved: true,
              mismatch_cleared: true,
              satta_remarks: remarks.trim(),
              approved_by: username,
              approved_at: nowIso,
              approval_level: approvalLevel,
            }).or(`po_no.ilike.%${token}%,contract_po_no.ilike.%${token}%`);
          } catch (e) {}

          try {
            await supabase.from('purchase_master').update({
              satta_dispute_approved: true,
              mismatch_cleared: true,
              satta_remarks: remarks.trim(),
              approved_by: username,
              approved_at: nowIso,
              approval_level: approvalLevel,
            }).or(`po_no.ilike.%${token}%,contract_po_no.ilike.%${token}%`);
          } catch (e) {}
        }
      }

      // Direct persistence in dbModule as well
      await dbModule.insert('satta_mismatch', { ...extendedSattaRecord, id: itemId }).catch(() => {});

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

      // Collect all tokens for this Sauda/PO
      const saudaTokens = [
        cleanPoNo,
        cleanSaudaNo,
        cleanPoNo.split('/').pop() || '',
        cleanSaudaNo.split('/').pop() || '',
        cleanPoNo.replace(/^BJCL\//i, ''),
        cleanSaudaNo.replace(/^BJCL\//i, ''),
        groupKey
      ].filter(Boolean);

      // Save tokens in localStorage for instant persistent caching
      saudaTokens.forEach(token => {
        try {
          const payload = JSON.stringify({
            resolvedBy: username,
            resolvedAt: nowIso,
            approvalLevel,
            remarks: remarks.trim(),
            status: 'resolved'
          });
          localStorage.setItem(`satta_resolved_${String(token).toUpperCase()}`, payload);
          localStorage.setItem(`mismatch_resolved_${String(token).toUpperCase()}`, payload);
          localStorage.setItem(`mismatch_cleared_${String(token).toUpperCase()}`, 'true');
        } catch (e) {}
      });

      // Save each item resolution
      for (const item of group.items) {
        try {
          const itemPayload = JSON.stringify({
            resolvedBy: username,
            resolvedAt: nowIso,
            approvalLevel,
            remarks: remarks.trim(),
            status: 'resolved'
          });
          localStorage.setItem(`satta_resolved_${item.id.toUpperCase()}`, itemPayload);
        } catch (e) {}

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

        if (supabase) {
          try {
            const searchToken = (item.saudaNo || item.poNo).split('/').pop() || item.poNo;
            const { data: existingRows } = await supabase
              .from('satta_mismatch')
              .select('*')
              .or(`mismatch_id.eq.${item.id},po_no.ilike.%${searchToken}%,sauda_no.ilike.%${searchToken}%`);

            if (existingRows && existingRows.length > 0) {
              const rowId = existingRows[0].id;
              const updatePayload = { ...extendedSattaRecord };
              delete updatePayload.id;
              const { error: updErr } = await supabase.from('satta_mismatch').update(updatePayload).eq('id', rowId);
              if (updErr) {
                const basePayload = { ...baseSattaRecord };
                delete basePayload.id;
                await supabase.from('satta_mismatch').update(basePayload).eq('id', rowId);
              }
            } else {
              const { error: insErr } = await supabase.from('satta_mismatch').insert(extendedSattaRecord);
              if (insErr) {
                await supabase.from('satta_mismatch').insert(baseSattaRecord);
              }
            }
          } catch (e) {
            console.warn("satta_mismatch write warning:", e);
          }
        }

        await dbModule.insert('satta_mismatch', { ...extendedSattaRecord, id: item.id }).catch(() => {});
      }

      if (supabase) {
        // Update sauda_master, sms_sauda, sauda_check_point, and purchase_master
        for (const token of saudaTokens) {
          try {
            await supabase.from('sauda_master').update({
              satta_dispute_approved: true,
              mismatch_cleared: true,
              satta_remarks: remarks.trim(),
              approved_by: username,
              approved_at: nowIso,
              approval_level: approvalLevel,
            }).ilike('sauda_no', `%${token}%`);
          } catch (e) {}

          try {
            await supabase.from('sms_sauda').update({
              satta_dispute_approved: true,
              mismatch_cleared: true,
              satta_remarks: remarks.trim(),
              approved_by: username,
              approved_at: nowIso,
              approval_level: approvalLevel,
            }).ilike('sauda_no', `%${token}%`);
          } catch (e) {}

          try {
            await supabase.from('sauda_check_point').update({
              satta_dispute_approved: true,
              mismatch_cleared: true,
              satta_remarks: remarks.trim(),
              approved_by: username,
              approved_at: nowIso,
              approval_level: approvalLevel,
            }).or(`po_no.ilike.%${token}%,contract_po_no.ilike.%${token}%`);
          } catch (e) {}

          try {
            await supabase.from('purchase_master').update({
              satta_dispute_approved: true,
              mismatch_cleared: true,
              satta_remarks: remarks.trim(),
              approved_by: username,
              approved_at: nowIso,
              approval_level: approvalLevel,
            }).or(`po_no.ilike.%${token}%,contract_po_no.ilike.%${token}%`);
          } catch (e) {}
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
    const matchesSearch = 
      item.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.poNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.brokerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.grade.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.issueDescription.toLowerCase().includes(searchQuery.toLowerCase());

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
        + ["P.O. Number,Supplier,Broker,Area,Grade,Mismatched Fields,Status,Approved By,Remarks"]
          .concat(mismatchList.map(item => 
            `"${item.poNo}","${item.supplierName}","${item.brokerName}","${item.area}","${item.grade}","${item.mismatchedFields.join('; ')}","${item.status}","${item.resolvedBy || 'N/A'}","${item.resolutionNotes || 'N/A'}"`
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
                ? "Comparison across Sauda Check Point, Temporary P.O., and Material Inspections. Always fetched fresh from database."
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
