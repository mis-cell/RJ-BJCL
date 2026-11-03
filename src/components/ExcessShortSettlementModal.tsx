import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Scale, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingDown, 
  TrendingUp, 
  Calculator, 
  Save, 
  Printer, 
  ShieldCheck,
  Lock,
  Unlock,
  Layers,
  FileSpreadsheet,
  Check,
  Calendar,
  DollarSign,
  ArrowRight,
  Info,
  RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { dbModule } from '../services/dbModule';
import { calculateWeightTolerance, WeightToleranceResult } from '../lib/weightTolerance';
import { 
  TolerancePolicyItem,
  DEFAULT_TOLERANCE_POLICIES,
  getTolerancePoliciesSync,
  fetchTolerancePolicies
} from '../services/tolerancePolicyService';

type TolerancePolicy = TolerancePolicyItem;
const DEFAULT_TOLERANCE_POLICY = DEFAULT_TOLERANCE_POLICIES[0];
import { cn } from '../lib/utils';
import { logChange } from '../services/auditLogService';

interface ExcessShortSettlementModalProps {
  po: any;
  onClose: () => void;
  onSaveSuccess?: () => void;
  allFinalArrivals?: any[];
  allTempArrivals?: any[];
  allScpDetails?: any[];
  allInspections?: any[];
  sattaCalculatedRates?: any[];
  sattaBaseRates?: any[];
}

import { normalizeToYMD, formatDisplayDate } from './excess-short/excessShortUtils';

const EMPTY_ARRAY: any[] = [];

export const ExcessShortSettlementModal: React.FC<ExcessShortSettlementModalProps> = ({
  po,
  onClose,
  onSaveSuccess,
  allFinalArrivals = EMPTY_ARRAY,
  allTempArrivals = EMPTY_ARRAY,
  allScpDetails = EMPTY_ARRAY,
  allInspections = EMPTY_ARRAY,
  sattaCalculatedRates = EMPTY_ARRAY,
  sattaBaseRates = EMPTY_ARRAY
}) => {
  if (!po) return null;

  const poNo = String(po.po_no || po.contract_po_no || '').trim();
  const saudaNo = String(po.sauda_no || po.sauda_ref || po.po_no || '').trim();
  const supplierName = String(po.supplier || po.supplier_name || po.supp_name || 'SOHANLALL CHANDANMULL AND CO.').trim();
  const brokerName = String(po.broker || po.broker_name || 'SOHANLALL CHANDANMULL & CO.').trim();
  const unit = String(po.purchase_unit_name || po.unit_type || po.unit || 'BALES').toUpperCase();
  
  // 1. Sauda / Deal Quantity from Sauda Check Point / Purchase Order: Total Contract (M.Ton)
  const contractMt = Math.max(0, parseFloat(po.total_contract_mt || po.contract_weight_mt || po.total_wt_in_ton || po.weight_mt || po.contract_mt || (po.weight_qtl ? po.weight_qtl / 10 : 0) || 0));
  const saudaQtyQtl = contractMt * 10;
  const contractRate = Math.max(0, parseFloat(po.rate || po.purchase_rate || po.rate_per_qtl || po.base_rate || 0));

  const cleanPoVal = (s: any) => String(s || '').trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const cleanKey = cleanPoVal(poNo);
  const cleanSaudaKey = cleanPoVal(saudaNo);

  // State variables for fetched data (only populated if parent props are empty)
  const [liveBaseRates, setLiveBaseRates] = useState<any[]>(EMPTY_ARRAY);
  const [liveInspections, setLiveInspections] = useState<any[]>(EMPTY_ARRAY);
  const [liveInspectionDetails, setLiveInspectionDetails] = useState<any[]>(EMPTY_ARRAY);
  const [liveTempArrivals, setLiveTempArrivals] = useState<any[]>(EMPTY_ARRAY);
  const [liveFinalArrivals, setLiveFinalArrivals] = useState<any[]>(EMPTY_ARRAY);
  
  // Sauda Date state (Defaults to PO date or today)
  const [saudaDate, setSaudaDate] = useState<string>(() => {
    return normalizeToYMD(po.sauda_date || po.po_date || po.contract_date || po.voucher_date || po.date || new Date().toISOString());
  });

  // Existing Sauda Total Amount
  const [existingSaudaAmount, setExistingSaudaAmount] = useState<number>(() => {
    if (po.total_amount || po.contract_amount || po.sauda_amount) {
      return parseFloat(po.total_amount || po.contract_amount || po.sauda_amount || 0);
    }
    return Math.round(contractMt * 10 * (contractRate > 0 ? contractRate : 12000) * 100) / 100;
  });

  // Existing record detection & state
  const [existingRecordId, setExistingRecordId] = useState<string | null>(null);
  const [isSettled, setIsSettled] = useState<boolean>(() => {
    const localSettled = localStorage.getItem(`sauda_settled_${cleanKey}`) || 
                         (cleanSaudaKey ? localStorage.getItem(`sauda_settled_${cleanSaudaKey}`) : null) ||
                         localStorage.getItem(`sauda_settlement_${cleanKey}`) ||
                         (cleanSaudaKey ? localStorage.getItem(`sauda_settlement_${cleanSaudaKey}`) : null);

    return Boolean(
      localSettled ||
      po.excess_short_status === 'settled' || 
      po.excess_short_status === 'within_bounds' ||
      po.status === 'settled' || 
      po.status === 'approved' || 
      po.status === 'final' || 
      po.is_settled === true ||
      po.has_settlement_done === true ||
      (po.excess_short_deduction != null && po.excess_short_deduction !== '')
    );
  });
  const [settledAt, setSettledAt] = useState<string | null>(null);
  const [settledBy, setSettledBy] = useState<string | null>('Operator');
  const [approvalLevel, setApprovalLevel] = useState<string>('ADMIN');

  // Applicable Rate Selection Mode
  type RateMode = 'rate_difference' | 'last_mr_satta' | 'sauda_satta' | 'custom';
  const [selectedRateMode, setSelectedRateMode] = useState<RateMode>('rate_difference');
  const [customRateInput, setCustomRateInput] = useState<number>(0);

  const [remarks, setRemarks] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [activePolicy, setActivePolicy] = useState<TolerancePolicy>(() => {
    try {
      const list = getTolerancePoliciesSync();
      return (list && list.find((p: any) => p.is_active)) || (list && list[0]) || DEFAULT_TOLERANCE_POLICY;
    } catch {
      return DEFAULT_TOLERANCE_POLICY;
    }
  });

  // Fetch live active policy from Tolerance Policy Master
  useEffect(() => {
    let cancelled = false;
    fetchTolerancePolicies().then(list => {
      if (!cancelled && Array.isArray(list) && list.length > 0) {
        const found = list.find((p: any) => p.is_active) || list[0];
        if (found) setActivePolicy(found);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Close modal safely on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Load lightweight targeted records for this PO/Sauda without full-table dumps
  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        const clean = (s: any) => String(s || '').trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        const targetPo = clean(poNo);
        const targetSauda = clean(saudaNo);

        const isAutoGeneratedRemark = (rem: any): boolean => {
          const s = String(rem || '').trim();
          if (!s) return true;
          return (
            s.includes('Beyond Tol.') ||
            s.includes('Penalty:') ||
            s.includes('TOLERABLE') ||
            s.includes('Within 3% Exemption') ||
            s.includes('Applicable for Sauda') ||
            s.startsWith('Short Weight Deduction:') ||
            s.startsWith('Excess Addition') ||
            s.startsWith('Excess Weight Deduction:')
          );
        };

        // 1. Check local storage cache first
        const localSavedStr = localStorage.getItem(`sauda_settlement_${targetPo}`) || 
                              (targetSauda ? localStorage.getItem(`sauda_settlement_${targetSauda}`) : null);
        if (localSavedStr) {
          try {
            const parsed = JSON.parse(localSavedStr);
            if (parsed && !cancelled) {
              if (parsed.id) setExistingRecordId(parsed.id);
              if (parsed.remarks && !isAutoGeneratedRemark(parsed.remarks)) setRemarks(parsed.remarks);
              if (parsed.rate_basis === 'custom' && parsed.applicable_rate != null) {
                setCustomRateInput(Number(parsed.applicable_rate));
              }
              if (parsed.rate_basis) setSelectedRateMode(parsed.rate_basis as RateMode);
              setIsSettled(true);
              setSettledAt(parsed.settled_at || parsed.created_at || new Date().toISOString());
              setSettledBy(parsed.approved_by || parsed.settled_by || 'Operator');
              if (parsed.approval_level) setApprovalLevel(parsed.approval_level);
            }
          } catch (e) {}
        }

        if (!supabase) return;

        // 2. Fetch Sauda Master & existing deduction record in parallel (targeted queries)
        const saudaQuery = saudaNo || poNo
          ? supabase
              .from('sauda_master')
              .select('sauda_no, sauda_date, date, total_amount')
              .or([saudaNo ? `sauda_no.ilike.%${saudaNo}%` : '', poNo ? `sauda_no.ilike.%${poNo}%` : ''].filter(Boolean).join(','))
              .limit(5)
          : Promise.resolve({ data: [] as any[] });

        const deductionQuery = poNo || saudaNo
          ? supabase
              .from('sauda_check_point_deductions')
              .select('*')
              .or([poNo ? `po_no.ilike.%${poNo}%` : '', saudaNo ? `sauda_no.ilike.%${saudaNo}%` : ''].filter(Boolean).join(','))
              .limit(10)
          : Promise.resolve({ data: [] as any[] });

        const [sMasterRes, deductionRes] = await Promise.all([
          saudaQuery.then(r => r.data || [], () => []),
          deductionQuery.then(r => r.data || [], () => [])
        ]);

        if (cancelled) return;

        const sMaster = Array.isArray(sMasterRes) ? sMasterRes[0] : sMasterRes;
        if (sMaster?.sauda_date || sMaster?.date) {
          setSaudaDate(normalizeToYMD(sMaster.sauda_date || sMaster.date));
          if (sMaster.total_amount) {
            setExistingSaudaAmount(parseFloat(sMaster.total_amount));
          }
        }

        if (Array.isArray(deductionRes) && deductionRes.length > 0) {
          const match = deductionRes.find((item: any) => {
            const itemPoClean = clean(item.po_no);
            const itemSaudaClean = clean(item.sauda_no || item.po_contract);
            return (itemPoClean && itemPoClean === targetPo) ||
                   (targetSauda && itemPoClean === targetSauda) ||
                   (targetSauda && itemSaudaClean === targetSauda) ||
                   (item.po_no && String(item.po_no).trim().toUpperCase() === String(poNo).trim().toUpperCase()) ||
                   (item.sauda_no && targetSauda && String(item.sauda_no).trim().toUpperCase() === String(saudaNo).trim().toUpperCase());
          });

          if (match) {
            setExistingRecordId(match.id);
            if (match.remarks && !isAutoGeneratedRemark(match.remarks)) {
              setRemarks(match.remarks);
            } else {
              setRemarks('');
            }
            if (match.rate_basis === 'custom' && match.applicable_rate != null) {
              setCustomRateInput(Number(match.applicable_rate));
            } else {
              setCustomRateInput(0);
            }
            if (match.rate_basis) {
              setSelectedRateMode(match.rate_basis as RateMode);
            }
            setIsSettled(true);
            setSettledAt(match.settled_at || match.updated_at || match.created_at);
            setSettledBy(match.approved_by || match.settled_by || 'Operator');
            if (match.approval_level) setApprovalLevel(match.approval_level);

            localStorage.setItem(`sauda_settled_${targetPo}`, 'true');
            if (targetSauda) {
              localStorage.setItem(`sauda_settled_${targetSauda}`, 'true');
            }
          }
        }

        // 3. Only fetch base rates / inspections / arrivals if parent didn't pass them
        const needBaseRates = !sattaBaseRates || sattaBaseRates.length === 0;
        const needInspections = !allInspections || allInspections.length === 0;
        const needTempArrivals = !allTempArrivals || allTempArrivals.length === 0;
        const needFinalArrivals = !allFinalArrivals || allFinalArrivals.length === 0;

        let activeInsps = allInspections;
        let activeTemp = allTempArrivals;
        let activeFinal = allFinalArrivals;

        if (needBaseRates || needInspections || needTempArrivals || needFinalArrivals) {
          const [sBases, matInspRes, inspMasterRes, tArrivals, fArrivals] = await Promise.all([
            needBaseRates
              ? supabase.from('satta_base_rates').select('*').order('start_date', { ascending: false }).then(r => r.data || [], () => [])
              : Promise.resolve(EMPTY_ARRAY),
            needInspections
              ? supabase.from('material_inspection').select('*').or([poNo ? `po_no.ilike.%${poNo}%` : '', saudaNo ? `sauda_no.ilike.%${saudaNo}%` : ''].filter(Boolean).join(',')).then(r => r.data || [], () => [])
              : Promise.resolve(EMPTY_ARRAY),
            needInspections
              ? supabase.from('mill_inspection_master').select('*').or([poNo ? `po_no.ilike.%${poNo}%` : '', saudaNo ? `sauda_no.ilike.%${saudaNo}%` : ''].filter(Boolean).join(',')).then(r => r.data || [], () => [])
              : Promise.resolve(EMPTY_ARRAY),
            needTempArrivals
              ? supabase.from('temporary_material_received').select('*').or([poNo ? `po_no.ilike.%${poNo}%` : '', saudaNo ? `sauda_no.ilike.%${saudaNo}%` : ''].filter(Boolean).join(',')).then(r => r.data || [], () => [])
              : Promise.resolve(EMPTY_ARRAY),
            needFinalArrivals
              ? supabase.from('final_arrival').select('*').or([poNo ? `po_no.ilike.%${poNo}%` : '', saudaNo ? `sauda_no.ilike.%${saudaNo}%` : ''].filter(Boolean).join(',')).then(r => r.data || [], () => [])
              : Promise.resolve(EMPTY_ARRAY),
          ]);

          if (cancelled) return;
          if (needBaseRates && sBases.length > 0) setLiveBaseRates(sBases);
          if (needInspections) {
            const combined = [...matInspRes, ...inspMasterRes];
            activeInsps = combined;
            if (combined.length > 0) setLiveInspections(combined);
          }
          if (needTempArrivals && tArrivals.length > 0) {
            activeTemp = tArrivals;
            setLiveTempArrivals(tArrivals);
          }
          if (needFinalArrivals && fArrivals.length > 0) {
            activeFinal = fArrivals;
            setLiveFinalArrivals(fArrivals);
          }
        }

        // 4. Identify matched MR numbers for this PO first, then fetch ONLY their inspection details
        const matchedMrSet = new Set<string>();
        const matchesTarget = (rPo: any, rSauda: any) => {
          const cPo = clean(rPo);
          const cSauda = clean(rSauda);
          return Boolean(
            (cPo && (cPo === targetPo || cPo === targetSauda)) ||
            (cSauda && (cSauda === targetPo || cSauda === targetSauda))
          );
        };

        (activeInsps || []).forEach((insp: any) => {
          if (matchesTarget(insp.po_no, insp.sauda_no || insp.contract_po_no || insp.po_contract)) {
            const num = String(insp.mr_no || '').trim();
            if (num && num.toUpperCase() !== 'NO' && num.toUpperCase() !== 'N/A' && num !== '-') {
              matchedMrSet.add(num);
            }
          }
        });

        const mrArray = Array.from(matchedMrSet).filter(Boolean);
        if (mrArray.length > 0) {
          const [matDetRes, inspDetRes] = await Promise.all([
            supabase.from('material_inspection_details').select('*').in('mr_no', mrArray).then(r => r.data || [], () => []),
            supabase.from('mill_inspection_detail').select('*').in('mr_no', mrArray).then(r => r.data || [], () => [])
          ]);
          if (!cancelled) {
            const combinedDetails = [...matDetRes, ...inspDetRes];
            if (combinedDetails.length > 0) setLiveInspectionDetails(combinedDetails);
          }
        }
      } catch (err) {
        console.error("Error fetching settlement data:", err);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [poNo, saudaNo]);

  // Pre-normalize and sort Satta Base Rates once so date lookups are fast O(N) scans
  const normalizedBaseRates = useMemo(() => {
    const baseList = liveBaseRates.length > 0 ? liveBaseRates : sattaBaseRates;
    if (!baseList || baseList.length === 0) return EMPTY_ARRAY;
    return baseList
      .map((b: any) => ({
        ymd: normalizeToYMD(b.start_date || b.effective_date || b.satta_date || b.date || b.base_date || b.start || ''),
        rate: Number(b.base_rate || b.rate || b.b_rate || b.baseRate || 0)
      }))
      .filter((item: { ymd: string; rate: number }) => item.rate > 0)
      .sort((a: { ymd: string; rate: number }, b: { ymd: string; rate: number }) => b.ymd.localeCompare(a.ymd));
  }, [liveBaseRates, sattaBaseRates]);

  // Satta Base Rates lookup by date
  const getSattaBaseRateOnDate = (dateStr: string): number => {
    if (normalizedBaseRates.length === 0) return 12000;
    const targetYmd = normalizeToYMD(dateStr);

    if (targetYmd) {
      // 1. Try exact date match first
      const exact = normalizedBaseRates.find((b) => b.ymd === targetYmd);
      if (exact) return exact.rate;

      // 2. Since normalizedBaseRates is sorted descending by ymd, first item <= targetYmd is the latest on-or-before rate
      const onOrBefore = normalizedBaseRates.find((b) => b.ymd && b.ymd <= targetYmd);
      if (onOrBefore) return onOrBefore.rate;
    }

    // 3. Fallback: First valid rate in list
    return normalizedBaseRates[0].rate || 12000;
  };

  // Sauda Date Satta Base Rate (Step 6)
  const saudaDateSattaRate = useMemo(() => {
    // Check direct B Rate (Base Rate) from Sauda Check Point / Purchase Order Header first
    const fromBrate = parseFloat(po.b_rate || po.base_rate || po.b_rate_qtl || po.s_b_rate || po.sauda_b_rate || 0);
    if (fromBrate > 0) return fromBrate;

    const fromSatta = getSattaBaseRateOnDate(saudaDate);
    if (fromSatta > 0) return fromSatta;

    const directContractRate = parseFloat(po.rate || po.purchase_rate || po.rate_per_qtl || po.sauda_rate || po.contract_rate || 0);
    if (directContractRate > 0) return directContractRate;

    return 12000;
  }, [saudaDate, normalizedBaseRates, po]);

  // 2. GET ACTUAL RECEIVED QUANTITY:
  // Sourced from Mill Inspection -> Inspection Details -> Final Receipt Wt. (Claim)
  // Summed across all MR numbers and grade-wise belonging to this Sauda/PO.
  const { 
    gradeWiseInspectionRows,
    totalFinalReceiptClaimMt,
    totalFinalReceiptClaimQtl,
    lastMrRecord,
    lastMrNo,
    lastMrDate,
    lastMrDateSattaRate,
    linkedMrNosList
  } = useMemo(() => {
    const clean = (s: any) => String(s || '').trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const targetPo = clean(poNo);
    const targetSauda = clean(saudaNo);

    // Find all matching inspections for this PO strictly from Mill Inspection Section
    const poolInspections = liveInspections.length > 0 ? liveInspections : allInspections;
    const matchingInsps = (poolInspections || []).filter((insp: any) => {
      const iPo = clean(insp.po_no);
      const iSauda = clean(insp.sauda_no || insp.contract_po_no || insp.po_contract);
      if (iPo && (iPo === targetPo || iPo === targetSauda)) return true;
      if (iSauda && (iSauda === targetPo || iSauda === targetSauda)) return true;
      return false;
    });

    // Extract all unique MR numbers strictly from Mill Inspection Section using field "mr_no"
    const uniqueMrMap = new Map<string, { mrNo: string; date: string; rawDate: string; source: any }>();

    matchingInsps.forEach((insp: any) => {
      const num = String(insp.mr_no || '').trim();
      if (num && num.toUpperCase() !== 'NO' && num.toUpperCase() !== 'N/A' && num !== '-') {
        const rawD = normalizeToYMD(insp.arrival_date || insp.mr_date || insp.inspection_date || insp.date || insp.created_at || '');
        const key = num.toUpperCase();
        const existing = uniqueMrMap.get(key);
        if (!existing || (!existing.rawDate && rawD)) {
          uniqueMrMap.set(key, { mrNo: num, date: formatDisplayDate(rawD), rawDate: rawD, source: insp });
        }
      }
    });

    const mrEntries = Array.from(uniqueMrMap.values());

    // Sort MR entries by date descending to identify the latest MR
    mrEntries.sort((a, b) => (b.rawDate || '').localeCompare(a.rawDate || ''));

    const latestMr = mrEntries.length > 0 ? mrEntries[0] : {
      mrNo: String(po.last_arrival_mr_no || po.mr_no || 'MR-001').trim(),
      date: formatDisplayDate(po.arrival_date || po.last_arrival_date || po.mr_date || po.date),
      rawDate: normalizeToYMD(po.arrival_date || po.last_arrival_date || po.mr_date || po.date),
      source: null
    };

    const latestMrNo = latestMr.mrNo;
    const latestMrDate = latestMr.rawDate || normalizeToYMD(saudaDate);
    const latestMrSattaRate = getSattaBaseRateOnDate(latestMrDate);

    // Build itemized grade-wise breakdown rows
    const rows: any[] = [];
    let sumClaimMt = 0;

    // Process details for each MR
    mrEntries.forEach((mrEntry) => {
      const mrKey = mrEntry.mrNo.toUpperCase();
      
      // Look for rows in liveInspectionDetails / material_inspection_details
      const matchingDetails = (liveInspectionDetails || []).filter((d: any) => {
        const dMr = String(d.mr_no || '').trim().toUpperCase();
        return dMr === mrKey;
      });

      if (matchingDetails.length > 0) {
        matchingDetails.forEach((d: any) => {
          const rowGrade = d.receipt_grade_name || d.arrival_grade || d.challan_grade_name || d.stock_grade_name || d.grade || 'TD6';
          const rowMarka = d.marka || d.marks || '39';
          const rowCrop = d.crop_year || '2026-2027';
          const rowBags = Number(d.quantity || d.packets || d.bales || d.bags || 0);

          // Sourced strictly from Mill Inspection -> Inspection Details -> Final Receipt Wt. (Claim)
          let finalClaimMt = Number(d.final_receipt_wt || 0);
          if (finalClaimMt <= 0) {
            finalClaimMt = Number(d.reduced_weight || d.netto_pnto || d.receipt_gross_wt || 0);
          }
          if (finalClaimMt <= 0 && d.quantity_rcpt) {
            const raw = Number(d.quantity_rcpt);
            finalClaimMt = raw > 500 ? raw / 100 : (raw > 50 ? raw / 10 : raw);
          }

          const finalClaimQtl = finalClaimMt * 10;
          sumClaimMt += finalClaimMt;

          const mrSattaRate = getSattaBaseRateOnDate(mrEntry.rawDate);
          const rateDiff = Math.abs(saudaDateSattaRate - mrSattaRate);

          rows.push({
            mrNo: mrEntry.mrNo,
            mrDate: mrEntry.date,
            rawDate: mrEntry.rawDate,
            grade: rowGrade,
            marka: rowMarka,
            cropYear: rowCrop,
            totalBags: rowBags,
            finalReceiptWtMt: finalClaimMt,
            finalReceiptWtQtl: finalClaimQtl,
            saudaRateQtl: saudaDateSattaRate,
            mrSattaRateQtl: mrSattaRate,
            rateDiffQtl: rateDiff,
            sourceType: 'Mill Inspection Detail'
          });
        });
      } else {
        // Inspection master level or arrival record fallback
        const src = mrEntry.source;
        let claimMt = 0;
        let bags = 0;
        let grade = 'TD6';
        let marka = '39';
        let crop = '2026-2027';

        if (src) {
          claimMt = Number(src.total_final_receipt_wt || src.final_receipt_wt || src.weight_reduced || src.reduced_weight || src.electronic_net_weight || src.final_weight_mt || 0);
          if (claimMt <= 0 && src.weight_qtl) {
            claimMt = Number(src.weight_qtl) / 10;
          }
          if (claimMt <= 0 && src.weight) {
            const w = Number(src.weight);
            claimMt = w > 500 ? w / 100 : (w > 50 ? w / 10 : w);
          }
          bags = Number(src.total_packets || src.quantity || src.packets || src.bags || 0);
          grade = src.receipt_grade_name || src.challan_grade_name || src.grading || src.grade || src.item_grade || 'TD6';
          marka = src.challan_marka_name || src.marka || '39';
          crop = src.crop_year || src.financial_year || '2026-2027';
        }

        if (claimMt <= 0) {
          // Fallback to proportional split of received_weight_mt
          claimMt = mrEntries.length === 1 ? (parseFloat(po.received_weight_mt) || contractMt) : (parseFloat(po.received_weight_mt || contractMt) / mrEntries.length);
        }

        const claimQtl = claimMt * 10;
        sumClaimMt += claimMt;

        const mrSattaRate = getSattaBaseRateOnDate(mrEntry.rawDate);
        const rateDiff = Math.abs(saudaDateSattaRate - mrSattaRate);

        rows.push({
          mrNo: mrEntry.mrNo,
          mrDate: mrEntry.date,
          rawDate: mrEntry.rawDate,
          grade: grade,
          marka: marka,
          cropYear: crop,
          totalBags: bags,
          finalReceiptWtMt: claimMt,
          finalReceiptWtQtl: claimQtl,
          saudaRateQtl: saudaDateSattaRate,
          mrSattaRateQtl: mrSattaRate,
          rateDiffQtl: rateDiff,
          sourceType: 'Mill Inspection Master'
        });
      }
    });

    // If no MR records at all, produce single row from PO
    if (rows.length === 0) {
      const rcvdMt = parseFloat(po.received_weight_mt || po.total_received_mt || 0) || contractMt;
      const rcvdQtl = rcvdMt * 10;
      sumClaimMt = rcvdMt;

      rows.push({
        mrNo: latestMrNo || 'MR-001',
        mrDate: formatDisplayDate(latestMrDate),
        rawDate: latestMrDate,
        grade: po.selected_grade || po.grade || 'TD6',
        marka: po.marka || '39',
        cropYear: po.crop_year || '2026-2027',
        totalBags: Math.round(rcvdQtl),
        finalReceiptWtMt: rcvdMt,
        finalReceiptWtQtl: rcvdQtl,
        saudaRateQtl: saudaDateSattaRate,
        mrSattaRateQtl: latestMrSattaRate,
        rateDiffQtl: Math.abs(saudaDateSattaRate - latestMrSattaRate),
        sourceType: 'Sauda Contract Baseline'
      });
    }

    const roundedSumClaimMt = Math.round(sumClaimMt * 1000) / 1000;
    const roundedSumClaimQtl = Math.round(roundedSumClaimMt * 10 * 100) / 100;
    const isClaimExcess = (contractMt - roundedSumClaimMt) < -0.0001;

    // For Excess: if MR Satta Rate >= Sauda Date Satta Rate, Rate Diff is 0 (Applicable for Sauda Rate)
    const adjustedRows = rows.map(r => ({
      ...r,
      rateDiffQtl: isClaimExcess
        ? Math.max(0, Number(r.saudaRateQtl || 0) - Number(r.mrSattaRateQtl || 0))
        : Math.abs(Number(r.saudaRateQtl || 0) - Number(r.mrSattaRateQtl || 0))
    }));

    return {
      gradeWiseInspectionRows: adjustedRows,
      totalFinalReceiptClaimMt: roundedSumClaimMt,
      totalFinalReceiptClaimQtl: roundedSumClaimQtl,
      lastMrRecord: latestMr,
      lastMrNo: latestMrNo,
      lastMrDate: latestMrDate,
      lastMrDateSattaRate: latestMrSattaRate,
      linkedMrNosList: mrEntries.map(e => e.mrNo)
    };
  }, [
    liveInspections, 
    allInspections, 
    liveInspectionDetails, 
    liveTempArrivals, 
    allTempArrivals, 
    liveFinalArrivals, 
    allFinalArrivals, 
    poNo, 
    saudaNo, 
    po, 
    saudaDate, 
    saudaDateSattaRate, 
    contractMt,
    normalizedBaseRates
  ]);

  // 3. CALCULATE GROSS SHORT / EXCESS
  // Compare: Sauda Contract Quantity - Total Final Receipt Wt. (Claim)
  const grossVarianceMt = Math.round((contractMt - totalFinalReceiptClaimMt) * 1000) / 1000;
  const isGrossShort = grossVarianceMt > 0.0001;
  const isGrossExcess = grossVarianceMt < -0.0001;
  const grossShortMt = isGrossShort ? grossVarianceMt : 0;
  const grossExcessMt = isGrossExcess ? Math.abs(grossVarianceMt) : 0;

  // 4. APPLY 3% EXECUTION EXEMPTION
  // Calculated strictly from Sauda Total Contract Quantity:
  // 3% Exemption = Sauda Total Contract Quantity × 3%
  const tolResult = useMemo(
    () => calculateWeightTolerance(contractMt, totalFinalReceiptClaimMt, unit),
    [contractMt, totalFinalReceiptClaimMt, unit]
  );
  const exemptionPct = 3.0;
  const exemptionMt = Math.round(tolResult.toleranceMt * 1000) / 1000;
  const exemptionQtl = Math.round(tolResult.toleranceQtl * 100) / 100;
  const exemptionKg = Math.round(tolResult.toleranceMt * 1000);

  // 5. FINAL DEDUCTIBLE QUANTITY (TOLERANCE / NO-DEDUCTION RULE)
  // Final Deductible Short = MAX(0, Gross Short - 3% Exemption)
  const finalDeductibleShortMt = isGrossShort ? Math.max(0, Math.round(tolResult.shortUnderToleranceMt * 1000) / 1000) : 0;
  const finalDeductibleShortQtl = isGrossShort ? Math.max(0, Math.round(tolResult.shortUnderToleranceQtl * 100) / 100) : 0;

  const finalDeductibleExcessMt = isGrossExcess ? Math.max(0, Math.round(tolResult.excessOverToleranceMt * 1000) / 1000) : 0;
  const finalDeductibleExcessQtl = isGrossExcess ? Math.max(0, Math.round(tolResult.excessOverToleranceQtl * 100) / 100) : 0;

  const finalDeductibleQtyMt = isGrossExcess ? finalDeductibleExcessMt : finalDeductibleShortMt;
  const finalDeductibleQtyQtl = isGrossExcess ? finalDeductibleExcessQtl : finalDeductibleShortQtl;

  const isWithin3PctExemption = tolResult.isWithinTolerance;

  // For Excess: If Last MR Date Satta Rate >= Sauda Date Satta Rate (e.g., Sauda 13000 & Last MR 13500),
  // DO NOT DEDUCT — It is Applicable for Sauda! Only deduct when Sauda Date Rate > Last MR Date Rate.
  const isExcessApplicableForSauda = isGrossExcess && lastMrDateSattaRate >= saudaDateSattaRate;

  // Policy Status Label
  const policyStatusText: string = isWithin3PctExemption
    ? 'Within 3% Exemption – No Deduction'
    : isGrossExcess
      ? (isExcessApplicableForSauda ? 'Applicable for Sauda – No Deduction' : 'Excess Weight Deduction')
      : 'Short Weight Deduction';

  // 6. DETERMINE THE APPLICABLE SATTA BASE RATE & RATE DIFFERENCE
  // For Excess: Rate Difference = MAX(0, Sauda Date Satta Rate − Last MR Date Satta Rate)
  // For Short: Rate Difference = |Sauda Date Satta Rate − Last MR Date Satta Rate|
  const rateDifference = isGrossExcess
    ? Math.max(0, saudaDateSattaRate - lastMrDateSattaRate)
    : Math.abs(saudaDateSattaRate - lastMrDateSattaRate);

  const applicableRate = useMemo(() => {
    let rate = 0;
    switch (selectedRateMode) {
      case 'last_mr_satta':
        rate = lastMrDateSattaRate;
        break;
      case 'sauda_satta':
        rate = saudaDateSattaRate;
        break;
      case 'custom':
        rate = customRateInput;
        break;
      case 'rate_difference':
      default:
        rate = rateDifference;
        break;
    }
    return isNaN(rate) || rate < 0 ? 0 : Math.round(rate * 100) / 100;
  }, [selectedRateMode, lastMrDateSattaRate, saudaDateSattaRate, rateDifference, customRateInput]);

  const applicableRateLabel = useMemo(() => {
    switch (selectedRateMode) {
      case 'last_mr_satta':
        return `Last MR Date Satta Rate (₹${applicableRate.toLocaleString()}/Qtl)`;
      case 'sauda_satta':
        return `Sauda Date Satta Rate (₹${applicableRate.toLocaleString()}/Qtl)`;
      case 'custom':
        return `Custom Rate Override (₹${applicableRate.toLocaleString()}/Qtl)`;
      case 'rate_difference':
      default:
        return isExcessApplicableForSauda
          ? `Applicable for Sauda Rate – No Deduction (₹0/Qtl)`
          : `Rate Difference |Sauda Date − Last MR Date| (₹${applicableRate.toLocaleString()}/Qtl)`;
    }
  }, [selectedRateMode, applicableRate, isExcessApplicableForSauda]);

  // 7. CALCULATE FINAL DEDUCTION AMOUNT
  // Final Deduction = Deductible Quantity (Quintal) × Applicable Rate
  const totalCalculatedAmount = useMemo(() => {
    if (isWithin3PctExemption || finalDeductibleQtyQtl <= 0) return 0;
    if (isExcessApplicableForSauda && selectedRateMode === 'rate_difference') return 0;
    const rate = isNaN(applicableRate) || applicableRate < 0 ? 0 : applicableRate;
    const calc = Math.round(finalDeductibleQtyQtl * rate * 100) / 100;
    return isNaN(calc) || calc < 0 ? 0 : calc;
  }, [isWithin3PctExemption, isExcessApplicableForSauda, selectedRateMode, finalDeductibleQtyQtl, applicableRate]);

  // Total Final Payable (Excess or Short deduction is subtracted from Sauda Material Value)
  const totalFinalPayable = useMemo(() => {
    const saudaAmt = isNaN(existingSaudaAmount) || existingSaudaAmount < 0 ? 0 : existingSaudaAmount;
    if (totalCalculatedAmount === 0) return saudaAmt;
    return Math.max(0, Math.round((saudaAmt - totalCalculatedAmount) * 100) / 100);
  }, [existingSaudaAmount, totalCalculatedAmount]);

  const arrivalNumbersString = useMemo(() => {
    return linkedMrNosList.length > 0 ? linkedMrNosList.join(', ') : (lastMrNo || 'MR-001');
  }, [linkedMrNosList, lastMrNo]);

  // Keep local cache & database record in sync with live MR arrivals and Excess/Short rate rule
  useEffect(() => {
    if (!isSettled || contractMt <= 0 || isSaving) return;

    const nowIso = new Date().toISOString();
    const defaultRemark = isExcessApplicableForSauda
      ? `Applicable for Sauda – No Deduction: Last MR Rate (₹${lastMrDateSattaRate}) >= Sauda Rate (₹${saudaDateSattaRate})`
      : `${policyStatusText}: Deductible ${finalDeductibleQtyQtl.toFixed(2)} Qtl at ₹${applicableRate}/Qtl = ₹${totalCalculatedAmount}.`;

    const payload: Record<string, any> = {
      po_no: poNo,
      sauda_no: saudaNo || poNo,
      supplier: supplierName,
      broker: brokerName,
      contract_weight_mt: Number(contractMt.toFixed(3)),
      tolerance_pct: exemptionPct,
      tolerance_mt: Number(exemptionMt.toFixed(3)),
      tolerance_type: '3% Sauda Total Contract Execution Exemption',
      min_acceptable_mt: Number(Math.max(0, contractMt - exemptionMt).toFixed(3)),
      max_acceptable_mt: Number((contractMt + exemptionMt).toFixed(3)),
      total_received_mt: Number(totalFinalReceiptClaimMt.toFixed(3)),
      variation_type: isWithin3PctExemption ? 'within_tolerance' : (isGrossExcess ? 'excess' : 'short'),
      variation_mt: Number(grossVarianceMt.toFixed(3)),
      selected_grade: po.selected_grade || po.grade || 'TD6',
      sauda_rate: Number(saudaDateSattaRate),
      satta_rate: Number(lastMrDateSattaRate),
      last_arrival_date: normalizeToYMD(lastMrDate),
      last_mr_no: lastMrNo,
      applicable_rate: Number(applicableRate),
      rate_basis: selectedRateMode,
      rate_difference: Number(rateDifference),
      deduction_qty_mt: Number(finalDeductibleQtyMt.toFixed(3)),
      deduction_qty_qtl: Number(finalDeductibleQtyQtl.toFixed(2)),
      deduction_amount: Number(totalCalculatedAmount),
      status: 'approved',
      remarks: remarks || defaultRemark,
      arrival_numbers: arrivalNumbersString,
      grade_breakdown: JSON.stringify(gradeWiseInspectionRows),
      approved_by: settledBy || 'System Auto-Calculated',
      approval_level: approvalLevel || 'ADMIN',
      updated_at: nowIso
    };

    try {
      const cacheObj = existingRecordId ? { ...payload, id: existingRecordId } : payload;
      localStorage.setItem(`sauda_settlement_${cleanKey}`, JSON.stringify(cacheObj));
      if (cleanSaudaKey) {
        localStorage.setItem(`sauda_settlement_${cleanSaudaKey}`, JSON.stringify(cacheObj));
      }
    } catch (_e) {}

    if (supabase && existingRecordId) {
      dbModule.update('sauda_check_point_deductions', 'id', existingRecordId, payload).catch(() => {});
      const masterSettleUpdate = {
        excess_short_deduction: totalCalculatedAmount,
        excess_short_status: isWithin3PctExemption ? 'within_bounds' : 'settled',
        final_payable_amount: totalFinalPayable,
        is_settled: true
      };
      dbModule.update('purchase_master', 'po_no', poNo, masterSettleUpdate).catch(() => {});
      dbModule.update('sauda_check_point', 'po_no', poNo, masterSettleUpdate).catch(() => {});
    }
  }, [
    contractMt,
    totalFinalReceiptClaimMt,
    totalCalculatedAmount,
    applicableRate,
    selectedRateMode,
    isWithin3PctExemption,
    isExcessApplicableForSauda,
    isGrossExcess,
    isGrossShort,
    poNo,
    saudaNo,
    cleanKey,
    cleanSaudaKey,
    totalFinalPayable,
    existingRecordId,
    isSettled
  ]);

  // Handle Save Settlement into sauda_check_point_deductions
  const handleSaveSettlement = async () => {
    if (isSettled) return;

    if (selectedRateMode === 'custom' && (customRateInput <= 0 || isNaN(customRateInput)) && finalDeductibleQtyQtl > 0) {
      setSaveMessage("⚠️ Custom Rate Mode: Please enter a valid rate greater than 0 before saving.");
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    const nowIso = new Date().toISOString();

    const payload = {
      po_no: poNo,
      sauda_no: saudaNo || poNo,
      supplier: supplierName,
      broker: brokerName,
      contract_weight_mt: Number(contractMt.toFixed(3)),
      tolerance_pct: exemptionPct,
      tolerance_mt: Number(exemptionMt.toFixed(3)),
      tolerance_type: '3% Sauda Total Contract Execution Exemption',
      min_acceptable_mt: Number(Math.max(0, contractMt - exemptionMt).toFixed(3)),
      max_acceptable_mt: Number((contractMt + exemptionMt).toFixed(3)),
      total_received_mt: Number(totalFinalReceiptClaimMt.toFixed(3)),
      variation_type: isWithin3PctExemption ? 'within_tolerance' : (isGrossExcess ? 'excess' : 'short'),
      variation_mt: Number(grossVarianceMt.toFixed(3)),
      selected_grade: po.selected_grade || po.grade || 'TD6',
      sauda_rate: Number(saudaDateSattaRate),
      satta_rate: Number(lastMrDateSattaRate),
      last_arrival_date: normalizeToYMD(lastMrDate),
      last_mr_no: lastMrNo,
      applicable_rate: Number(applicableRate),
      rate_basis: selectedRateMode,
      rate_difference: Number(rateDifference),
      deduction_qty_mt: Number(finalDeductibleQtyMt.toFixed(3)),
      deduction_qty_qtl: Number(finalDeductibleQtyQtl.toFixed(2)),
      deduction_amount: Number(totalCalculatedAmount),
      status: 'approved',
      remarks: remarks || `${policyStatusText}: Deductible ${finalDeductibleQtyQtl.toFixed(2)} Qtl at ₹${applicableRate}/Qtl = ₹${totalCalculatedAmount}.`,
      arrival_numbers: arrivalNumbersString,
      grade_breakdown: JSON.stringify(gradeWiseInspectionRows),
      approved_by: settledBy || 'Operator',
      approval_level: approvalLevel || 'ADMIN',
      created_at: nowIso,
      updated_at: nowIso
    };

    try {
      if (supabase) {
        if (existingRecordId) {
          await dbModule.update('sauda_check_point_deductions', 'id', existingRecordId, payload);
        } else {
          const data = await dbModule.insert('sauda_check_point_deductions', payload);
          if (data?.id) setExistingRecordId(data.id);
        }

        // Record in Universal Change Log
        await logChange({
          module: 'Sauda Check Point / Settlement',
          entity_name: 'Excess/Short Weight Settlement',
          record_id: poNo,
          action: 'UPDATE',
          field_name: 'deduction_amount',
          field_label: `${isGrossExcess ? 'Excess Addition' : 'Short Deduction'} (PO ${poNo})`,
          old_value: existingRecordId ? 'Previous Settlement' : 'None',
          new_value: `₹${Number(totalCalculatedAmount).toLocaleString('en-IN')}`,
          user_name: settledBy || 'Operator',
          remarks: `${payload.variation_type.toUpperCase()}: ${finalDeductibleQtyQtl.toFixed(2)} Qtl @ ₹${applicableRate}/Qtl for Supplier ${supplierName}`
        });

        const masterSettleUpdate = {
          excess_short_deduction: totalCalculatedAmount,
          excess_short_status: isWithin3PctExemption ? 'within_bounds' : 'settled',
          final_payable_amount: totalFinalPayable,
          is_settled: true
        };

        await dbModule.update('purchase_master', 'po_no', poNo, masterSettleUpdate).catch(() => {});
        await dbModule.update('sauda_check_point', 'po_no', poNo, masterSettleUpdate).catch(() => {});
        if (saudaNo) {
          await dbModule.update('sauda_master', 'sauda_no', saudaNo, masterSettleUpdate).catch(() => {});
        }
      } else {
        await dbModule.insert('sauda_check_point_deductions', payload);
      }

      // Save locally
      localStorage.setItem(`sauda_settled_${cleanKey}`, 'true');
      localStorage.setItem(`sauda_settlement_${cleanKey}`, JSON.stringify(payload));
      if (cleanSaudaKey) {
        localStorage.setItem(`sauda_settled_${cleanSaudaKey}`, 'true');
        localStorage.setItem(`sauda_settlement_${cleanSaudaKey}`, JSON.stringify(payload));
      }

      setIsSettled(true);
      setSettledAt(nowIso);
      setSettledBy(settledBy || 'Operator');
      setApprovalLevel(approvalLevel || 'ADMIN');
      setSaveMessage("✓ Settlement record saved and locked into sauda_check_point_deductions!");

      if (onSaveSuccess) onSaveSuccess();
    } catch (err: any) {
      console.error("Error saving settlement:", err);
      setSaveMessage("Error saving record: " + (err.message || 'Database error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[1000] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
    >
      
      {/* Printable Slip Container */}
      <div className="hidden print:block fixed inset-0 bg-white text-black p-8 font-sans">
        <div className="border-b-2 border-black pb-3 mb-4 text-center">
          <h1 className="text-xl font-black uppercase tracking-wider">BIRLA JUTE MILLS - RAW JUTE DIVISION</h1>
          <h2 className="text-sm font-bold uppercase mt-1">EXTRA &amp; SHORT WEIGHT &amp; RATE SETTLEMENT VOUCHER</h2>
          <p className="text-xs text-gray-600">Table: sauda_check_point_deductions | Policy: 3% Sauda Contract Execution Exemption</p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs border border-gray-300 p-3 rounded mb-4">
          <div>
            <p><strong>PO / Sauda No:</strong> {poNo}</p>
            <p><strong>Supplier:</strong> {supplierName}</p>
            <p><strong>Broker:</strong> {brokerName}</p>
            <p><strong>Sauda Date:</strong> {formatDisplayDate(saudaDate)}</p>
            <p><strong>Sauda Contract Quantity:</strong> {contractMt.toFixed(2)} MT ({saudaQtyQtl.toFixed(2)} Qtl)</p>
            <p><strong>Sauda Date Satta Rate:</strong> ₹{saudaDateSattaRate.toLocaleString()} / Quintal</p>
          </div>
          <div>
            <p><strong>Total Final Receipt Claim (Mill Inspection):</strong> {totalFinalReceiptClaimMt.toFixed(2)} MT ({totalFinalReceiptClaimQtl.toFixed(2)} Qtl)</p>
            <p><strong>Last MR No:</strong> {lastMrNo}</p>
            <p><strong>Last MR Date:</strong> {formatDisplayDate(lastMrDate)}</p>
            <p><strong>Last MR Date Satta Rate:</strong> ₹{lastMrDateSattaRate.toLocaleString()} / Quintal</p>
            <p><strong>Rate Difference:</strong> ₹{rateDifference.toLocaleString()} / Quintal</p>
            <p><strong>3% Execution Exemption:</strong> {exemptionMt.toFixed(2)} MT ({exemptionQtl.toFixed(2)} Qtl / {exemptionKg} KG)</p>
            <p><strong>Final Deductible Short / Excess:</strong> {finalDeductibleQtyMt.toFixed(2)} MT ({finalDeductibleQtyQtl.toFixed(2)} Qtl)</p>
          </div>
        </div>

        {/* Multi-MR Breakdown in Printable Slip */}
        <div className="mb-4">
          <h3 className="text-xs font-bold uppercase mb-1">Mill Inspection Final Receipt Claim Breakdown</h3>
          <table className="w-full text-xs border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100 font-bold">
                <th className="border p-1 text-left">MR No</th>
                <th className="border p-1 text-left">MR Date</th>
                <th className="border p-1 text-left">Grade</th>
                <th className="border p-1 text-left">Marka</th>
                <th className="border p-1 text-right">Bags</th>
                <th className="border p-1 text-right">Final Receipt Claim (MT)</th>
                <th className="border p-1 text-right">Final Receipt Claim (Qtl)</th>
              </tr>
            </thead>
            <tbody>
              {gradeWiseInspectionRows.map((r, idx) => (
                <tr key={idx}>
                  <td className="border p-1">{r.mrNo}</td>
                  <td className="border p-1">{r.mrDate}</td>
                  <td className="border p-1">{r.grade}</td>
                  <td className="border p-1">{r.marka}</td>
                  <td className="border p-1 text-right">{r.totalBags}</td>
                  <td className="border p-1 text-right">{Number(r.finalReceiptWtMt).toFixed(3)} MT</td>
                  <td className="border p-1 text-right">{Number(r.finalReceiptWtQtl).toFixed(2)} Qtl</td>
                </tr>
              ))}
              <tr className="font-bold bg-gray-50">
                <td colSpan={5} className="border p-1 text-right uppercase">Total Final Receipt Claim:</td>
                <td className="border p-1 text-right">{totalFinalReceiptClaimMt.toFixed(3)} MT</td>
                <td className="border p-1 text-right">{totalFinalReceiptClaimQtl.toFixed(2)} Qtl</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="border-2 border-black p-4 mb-4 bg-gray-50 text-center">
          <span className="text-xs font-bold uppercase text-gray-700 block">
            {policyStatusText.toUpperCase()} (CALCULATION FORMULA)
          </span>
          <span className="text-sm font-mono block my-1">
            {finalDeductibleQtyQtl.toFixed(2)} Quintal × ₹{applicableRate.toLocaleString()}/Quintal = 
          </span>
          <span className="text-2xl font-black block my-1">
            ₹{totalCalculatedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
          <p className="text-xs text-gray-700">
            Total Final Payable: <strong>₹{totalFinalPayable.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
          </p>
        </div>

        <div className="text-xs text-gray-700 mb-6">
          <p><strong>Remarks:</strong> {remarks || `${policyStatusText} calculated using 3% Sauda execution exemption.`}</p>
          <p><strong>Approved By:</strong> {settledBy || 'Operator'} | <strong>Approval Level:</strong> {approvalLevel}</p>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center text-xs pt-8 border-t border-gray-300">
          <div><div className="border-t border-dashed border-gray-400 pt-1 font-bold">Prepared By</div></div>
          <div><div className="border-t border-dashed border-gray-400 pt-1 font-bold">Checked By</div></div>
          <div><div className="border-t border-dashed border-gray-400 pt-1 font-bold">Authorized Signatory</div></div>
        </div>
      </div>

      {/* Main Dialog Modal */}
      <div className="print:hidden bg-white w-full max-w-5xl rounded-xl shadow-2xl border border-slate-300 flex flex-col max-h-[92vh] overflow-hidden my-auto text-slate-900 font-sans">
        
        {/* Top Header */}
        <div className="px-4 py-2.5 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800 select-none">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-amber-500/20 border border-amber-400/30 text-amber-300">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                  EXTRA &amp; SHORT WEIGHT &amp; RATE SETTLEMENT
                </h2>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-400 text-slate-950 uppercase tracking-tight">
                  sauda_check_point_deductions
                </span>
                {isSettled && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-500 text-white uppercase flex items-center gap-1">
                    <Check className="w-2.5 h-2.5" /> SAVED &amp; LOCKED
                  </span>
                )}
              </div>
              <p className="text-[10.5px] text-slate-300 flex flex-wrap items-center gap-x-2 mt-0.5 font-mono">
                <span>PO: <strong className="text-white">{poNo || saudaNo}</strong></span>
                <span className="text-slate-600">•</span>
                <span>Supplier: <strong className="text-slate-200">{supplierName}</strong></span>
                <span className="text-slate-600">•</span>
                <span>Broker: <strong className="text-slate-300">{brokerName}</strong></span>
                <span className="text-slate-600">•</span>
                <span className="text-emerald-300">Policy: <strong>3% Sauda Execution Exemption</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              title="Print Settlement Voucher"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title="Close popup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5 bg-slate-50/70 text-xs">
          
          {/* Status Notice Banner when already settled */}
          {isSettled && (
            <div className="px-3.5 py-2 bg-emerald-950 text-emerald-100 border border-emerald-500/70 rounded-lg flex items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="font-black uppercase text-[11px] text-emerald-300">
                    SETTLEMENT RECORD SAVED &amp; LOCKED
                  </span>
                  <span className="text-[10px] text-emerald-200/90 block">
                    Permanently stored in <code className="font-mono bg-emerald-900/60 px-1 py-0.2 rounded text-emerald-100">sauda_check_point_deductions</code>.
                  </span>
                </div>
              </div>
              <div className="text-right text-[10px] font-mono shrink-0 font-bold text-emerald-300">
                <span>Approved By: {settledBy || 'Operator'} ({approvalLevel})</span>
                {settledAt && <span className="block text-emerald-400/80">{formatDisplayDate(settledAt)}</span>}
              </div>
            </div>
          )}

          {/* Toast Notification */}
          {saveMessage && (
            <div className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 border shadow-xs ${
              saveMessage.startsWith('✓') 
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300' 
                : 'bg-rose-50 text-rose-900 border-rose-300'
            }`}>
              {saveMessage.startsWith('✓') ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
              <span>{saveMessage}</span>
            </div>
          )}

          {/* SECTION 1: RECOMMENDED UI CALCULATION TRAIL & AUDIT DISPLAY */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-700" />
                <span className="font-black uppercase tracking-wider text-xs text-slate-800">
                  1. Extra &amp; Short Settlement Calculation Trail
                </span>
              </div>
              <span className="text-[9px] font-mono font-bold text-emerald-900 bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                3% Sauda Execution Exemption Applied ({exemptionMt.toFixed(2)} MT / {exemptionKg} KG)
              </span>
            </div>

            {/* Structured Table for the Recommended UI calculation display */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-[11px]">
              
              {/* Left Column: Contract, Claim, Short, Exemption */}
              <div className="bg-slate-50/80 rounded-lg p-2.5 border border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center py-1 border-b border-slate-200/70">
                  <span className="text-slate-600 font-semibold">Sauda Contract Qty:</span>
                  <span className="font-black text-slate-900">{contractMt.toFixed(2)} MT <span className="text-[9px] text-slate-500 font-normal">({saudaQtyQtl.toFixed(2)} Qtl)</span></span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-200/70">
                  <span className="text-indigo-900 font-semibold flex items-center gap-1">
                    <span>Total Final Receipt Claim:</span>
                  </span>
                  <span className="font-black text-indigo-950">{totalFinalReceiptClaimMt.toFixed(2)} MT <span className="text-[9px] text-indigo-700 font-normal">({totalFinalReceiptClaimQtl.toFixed(2)} Qtl)</span></span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-200/70">
                  <span className={cn("font-semibold", isGrossShort ? "text-amber-800" : "text-purple-800")}>
                    {isGrossShort ? 'Gross Short:' : (isGrossExcess ? 'Gross Excess:' : 'Gross Variance:')}
                  </span>
                  <span className={cn("font-black", isGrossShort ? "text-amber-900" : "text-purple-900")}>
                    {grossVarianceMt.toFixed(2)} MT <span className="text-[9px] font-normal">({(grossVarianceMt * 10).toFixed(2)} Qtl)</span>
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-200/70 bg-emerald-50/60 px-1.5 rounded">
                  <span className="text-emerald-900 font-bold">3% Execution Exemption:</span>
                  <span className="font-black text-emerald-900">{exemptionMt.toFixed(2)} MT <span className="text-[9px] text-emerald-700 font-normal">({exemptionQtl.toFixed(2)} Qtl / {exemptionKg} KG)</span></span>
                </div>

                <div className={cn(
                  "flex justify-between items-center py-1.5 px-1.5 rounded font-black",
                  isWithin3PctExemption 
                    ? "bg-emerald-100 text-emerald-950 border border-emerald-300"
                    : isGrossExcess 
                      ? "bg-purple-100 text-purple-950 border border-purple-300" 
                      : "bg-amber-100 text-amber-950 border border-amber-300"
                )}>
                  <span>{isGrossExcess ? 'Final Deductible Excess:' : 'Final Deductible Short:'}</span>
                  <span className="text-xs">{finalDeductibleQtyMt.toFixed(2)} MT <span className="text-[9.5px] font-bold">({finalDeductibleQtyQtl.toFixed(2)} Qtl)</span></span>
                </div>
              </div>

              {/* Right Column: MRs, Satta Rates, Rate Difference, Final Deduction */}
              <div className="bg-slate-50/80 rounded-lg p-2.5 border border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center py-1 border-b border-slate-200/70">
                  <span className="text-slate-600 font-semibold">Last MR No.:</span>
                  <span className="font-black text-indigo-900 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">{lastMrNo || 'MR-001'}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-200/70">
                  <span className="text-slate-600 font-semibold">Last MR Date:</span>
                  <span className="font-black text-slate-900">{formatDisplayDate(lastMrDate)}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-200/70">
                  <span className="text-slate-600 font-semibold">Sauda Date Satta Rate ({formatDisplayDate(saudaDate)}):</span>
                  <span className="font-black text-slate-900">₹{saudaDateSattaRate.toLocaleString()} / Qtl</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-200/70">
                  <span className="text-slate-600 font-semibold">Last MR Date Satta Rate:</span>
                  <span className="font-black text-emerald-900">₹{lastMrDateSattaRate.toLocaleString()} / Qtl</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-200/70 bg-amber-50/60 px-1.5 rounded">
                  <span className="text-amber-900 font-bold">
                    {isExcessApplicableForSauda ? 'Rate Difference (Applicable for Sauda):' : 'Rate Difference (|Sauda − Last MR|):'}
                  </span>
                  <span className="font-black text-amber-900">₹{rateDifference.toLocaleString()} / Qtl</span>
                </div>

                <div className="flex justify-between items-center py-1.5 px-1.5 bg-slate-900 text-white rounded font-black">
                  <span className="text-amber-300">{isGrossExcess ? 'Total Excess Deduction:' : 'Total Short Deduction:'}</span>
                  <span className="text-xs text-white">₹ {totalCalculatedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>

            </div>

            {/* Formula Audit Box */}
            <div className="bg-gradient-to-r from-amber-50 via-indigo-50 to-emerald-50 p-2 rounded-lg border border-indigo-200/80 text-[10.5px] font-mono flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-bold text-indigo-950">
                <span>📐</span>
                <span>Formula: </span>
                <code className="bg-white px-2 py-0.5 rounded border border-indigo-300 font-mono text-[10px] text-slate-900">
                  {finalDeductibleQtyQtl.toFixed(2)} Qtl × ₹{applicableRate.toLocaleString()}/Qtl = ₹{totalCalculatedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </code>
              </div>
              <div className="text-[10px] font-bold text-slate-700">
                Status: <span className="font-black text-indigo-900 uppercase">{policyStatusText}</span>
              </div>
            </div>
          </div>

          {/* SECTION 2: MILL INSPECTION MULTI-MR & GRADE-WISE CLAIM BREAKDOWN TABLE */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                <span className="font-black uppercase tracking-wider text-xs text-slate-800">
                  2. Mill Inspection Final Receipt Claim (Grade-Wise Multi-MR Breakdown)
                </span>
              </div>
              <div className="flex items-center gap-1 font-mono text-[10px] text-slate-600">
                <span className="font-bold text-slate-700">MRs Linked:</span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-950 font-black border border-emerald-300">
                  {arrivalNumbersString}
                </span>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono text-[10.5px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-y border-slate-200 text-[9px] uppercase font-bold">
                    <th className="py-1.5 px-2">MR No</th>
                    <th className="py-1.5 px-2">MR Date</th>
                    <th className="py-1.5 px-2">Grade</th>
                    <th className="py-1.5 px-2">Marka</th>
                    <th className="py-1.5 px-2">Crop Year</th>
                    <th className="py-1.5 px-2 text-right">Bags</th>
                    <th className="py-1.5 px-2 text-right text-indigo-950">Final Receipt Claim (MT)</th>
                    <th className="py-1.5 px-2 text-right">Final Claim (Qtl)</th>
                    <th className="py-1.5 px-2 text-right">Sauda Satta Rate</th>
                    <th className="py-1.5 px-2 text-right">MR Satta Rate</th>
                    <th className="py-1.5 px-2 text-right text-amber-800">Rate Diff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gradeWiseInspectionRows.map((gRow, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80">
                      <td className="py-1.5 px-2 font-bold text-indigo-900">{gRow.mrNo}</td>
                      <td className="py-1.5 px-2 font-bold text-emerald-900">{gRow.mrDate}</td>
                      <td className="py-1.5 px-2 font-bold text-slate-900">{gRow.grade}</td>
                      <td className="py-1.5 px-2 text-slate-600">{gRow.marka}</td>
                      <td className="py-1.5 px-2 text-slate-600">{gRow.cropYear}</td>
                      <td className="py-1.5 px-2 text-right text-slate-800">{gRow.totalBags}</td>
                      <td className="py-1.5 px-2 text-right font-black text-indigo-950 bg-indigo-50/50">{Number(gRow.finalReceiptWtMt).toFixed(3)} MT</td>
                      <td className="py-1.5 px-2 text-right font-bold text-slate-900">{Number(gRow.finalReceiptWtQtl).toFixed(2)} Qtl</td>
                      <td className="py-1.5 px-2 text-right text-slate-700">₹{Number(gRow.saudaRateQtl).toLocaleString()} / Qtl</td>
                      <td className="py-1.5 px-2 text-right text-slate-700">₹{Number(gRow.mrSattaRateQtl).toLocaleString()} / Qtl</td>
                      <td className="py-1.5 px-2 text-right font-bold text-amber-700">₹{Number(gRow.rateDiffQtl).toLocaleString()} / Qtl</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100/90 font-black border-t-2 border-slate-300 text-[10.5px]">
                    <td colSpan={5} className="py-1.5 px-2 text-right uppercase text-slate-700">Total Summed Final Receipt Claim:</td>
                    <td className="py-1.5 px-2 text-right">{gradeWiseInspectionRows.reduce((acc, r) => acc + (Number(r.totalBags) || 0), 0)}</td>
                    <td className="py-1.5 px-2 text-right text-indigo-950 font-black bg-indigo-100/60">{totalFinalReceiptClaimMt.toFixed(3)} MT</td>
                    <td className="py-1.5 px-2 text-right text-slate-900 font-black">{totalFinalReceiptClaimQtl.toFixed(2)} Qtl</td>
                    <td colSpan={3} className="py-1.5 px-2 text-right text-[9.5px] text-slate-500 font-semibold italic">Sum of all MR Final Claims</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* SECTION 3: DEDUCTION RATE BASIS OPTIONS */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-indigo-700" />
                <h3 className="font-black uppercase tracking-wider text-xs text-slate-800">
                  3. Deduction Rate Basis Configuration
                </h3>
              </div>
              <div className="text-[10px] font-mono text-slate-500">
                Active Basis: <strong className="text-indigo-950 font-black uppercase">{applicableRateLabel}</strong>
              </div>
            </div>

            {/* Rate Basis Mode Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 font-mono">
              
              {/* 1. Rate Difference (Policy Default) */}
              <div
                onClick={() => !isSettled && setSelectedRateMode('rate_difference')}
                className={cn(
                  "p-2.5 rounded-lg border text-left transition-all relative",
                  isSettled ? "cursor-default" : "cursor-pointer hover:border-indigo-400 hover:shadow-xs",
                  selectedRateMode === 'rate_difference'
                    ? "bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-500/20"
                    : "bg-slate-50 border-slate-200"
                )}
              >
                <div className="flex items-start justify-between">
                  <span className="text-[8.5px] font-black uppercase text-indigo-900">
                    1. Rate Difference
                  </span>
                  <span className="text-[7.5px] font-bold bg-indigo-200/70 text-indigo-950 px-1 rounded">
                    POLICY DEFAULT
                  </span>
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-sm font-black text-indigo-950">₹{rateDifference.toLocaleString()}</span>
                  <span className="text-[8.5px] text-slate-500">/ Qtl</span>
                </div>
                <p className="text-[8px] text-slate-600 mt-1 leading-tight">
                  {isExcessApplicableForSauda
                    ? `Last MR (₹${lastMrDateSattaRate}) ≥ Sauda (₹${saudaDateSattaRate}) → Applicable for Sauda`
                    : `|Sauda Date (₹${saudaDateSattaRate}) − Last MR Date (₹${lastMrDateSattaRate})|`}
                </p>
              </div>

              {/* 2. Last MR Date Satta Rate */}
              <div
                onClick={() => !isSettled && setSelectedRateMode('last_mr_satta')}
                className={cn(
                  "p-2.5 rounded-lg border text-left transition-all relative",
                  isSettled ? "cursor-default" : "cursor-pointer hover:border-indigo-400 hover:shadow-xs",
                  selectedRateMode === 'last_mr_satta'
                    ? "bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-500/20"
                    : "bg-slate-50 border-slate-200"
                )}
              >
                <span className="text-[8.5px] font-black uppercase text-slate-700 block">
                  2. Last MR Date Satta Rate
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-sm font-black text-emerald-900">₹{lastMrDateSattaRate.toLocaleString()}</span>
                  <span className="text-[8.5px] text-slate-500">/ Qtl</span>
                </div>
                <p className="text-[8px] text-slate-600 mt-1 leading-tight">
                  On {formatDisplayDate(lastMrDate)} ({lastMrNo})
                </p>
              </div>

              {/* 3. Sauda Date Satta Base Rate */}
              <div
                onClick={() => !isSettled && setSelectedRateMode('sauda_satta')}
                className={cn(
                  "p-2.5 rounded-lg border text-left transition-all relative",
                  isSettled ? "cursor-default" : "cursor-pointer hover:border-indigo-400 hover:shadow-xs",
                  selectedRateMode === 'sauda_satta'
                    ? "bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-500/20"
                    : "bg-slate-50 border-slate-200"
                )}
              >
                <span className="text-[8.5px] font-black uppercase text-slate-700 block">
                  3. Sauda Date Satta Rate
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-sm font-black text-slate-900">₹{saudaDateSattaRate.toLocaleString()}</span>
                  <span className="text-[8.5px] text-slate-500">/ Qtl</span>
                </div>
                <p className="text-[8px] text-slate-600 mt-1 leading-tight">
                  On {formatDisplayDate(saudaDate)} (P.O Date)
                </p>
              </div>

              {/* 4. Custom Rate */}
              <div
                onClick={() => !isSettled && setSelectedRateMode('custom')}
                className={cn(
                  "p-2.5 rounded-lg border text-left transition-all relative",
                  isSettled ? "cursor-default" : "cursor-pointer hover:border-indigo-400 hover:shadow-xs",
                  selectedRateMode === 'custom'
                    ? "bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-500/20"
                    : "bg-slate-50 border-slate-200"
                )}
              >
                <span className="text-[8.5px] font-black uppercase text-slate-700 block">
                  4. Custom Rate Override
                </span>
                <div className="mt-1 flex items-center gap-1">
                  <span className="text-[11px] font-bold text-slate-600">₹</span>
                  <input
                    type="number"
                    step="1"
                    disabled={isSettled}
                    value={customRateInput || ''}
                    onChange={(e) => {
                      setSelectedRateMode('custom');
                      setCustomRateInput(parseFloat(e.target.value) || 0);
                    }}
                    placeholder="0"
                    className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs font-black text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <span className="text-[8.5px] text-slate-500">/Qtl</span>
                </div>
                <p className="text-[8px] text-slate-600 mt-1 leading-tight">
                  Manual rate override
                </p>
              </div>

            </div>

            {/* Remarks & Approval Level Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-xs pt-1">
              <div className="sm:col-span-2 flex flex-col">
                <label className="text-[9px] font-black uppercase text-slate-600 mb-0.5">
                  Settlement Remarks / Audit Notes
                </label>
                <input
                  type="text"
                  disabled={isSettled}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder={`${policyStatusText}: Deductible ${finalDeductibleQtyQtl.toFixed(2)} Qtl at ₹${applicableRate}/Qtl.`}
                  className="bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-[9px] font-black uppercase text-slate-600 mb-0.5">
                  Approval Level
                </label>
                <select
                  disabled={isSettled}
                  value={approvalLevel}
                  onChange={(e) => setApprovalLevel(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-2 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-500"
                >
                  <option value="ADMIN">ADMIN (System Administrator)</option>
                  <option value="L5_OFFICER">L5 OFFICER (Authorizer)</option>
                  <option value="MILL_MANAGER">MILL MANAGER</option>
                  <option value="GENERAL_MANAGER">GENERAL MANAGER</option>
                </select>
              </div>
            </div>

          </div>

          {/* TOTAL BANNER */}
          <div className="bg-slate-950 text-white p-3.5 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
            <div>
              <span className="text-[9.5px] font-bold uppercase text-amber-400 block tracking-wider">
                {isWithin3PctExemption 
                  ? 'Within 3% Exemption – No Deduction (₹0.00)' 
                  : isExcessApplicableForSauda && totalCalculatedAmount === 0
                    ? 'Applicable for Sauda – No Deduction (₹0.00)'
                    : (isGrossExcess ? 'Total Excess Weight Deduction Amount' : 'Total Short Weight Deduction Amount')}
              </span>
              
              <div className="flex items-center gap-2.5 mt-0.5">
                <span className="text-xl sm:text-2xl font-black font-mono text-white">
                  ₹ {totalCalculatedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className={cn(
                  "px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tight",
                  isWithin3PctExemption ? "bg-emerald-600 text-white" : (isGrossExcess ? "bg-purple-600 text-white" : "bg-amber-600 text-white")
                )}>
                  {policyStatusText}
                </span>
              </div>

              <div className="text-[10.5px] text-amber-200 font-mono mt-0.5">
                Calculation: <strong>{finalDeductibleQtyQtl.toFixed(2)} Quintal</strong> × <strong>₹{applicableRate.toLocaleString()} / Quintal</strong> = <strong>₹{totalCalculatedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-lg text-right font-mono min-w-[220px]">
              <span className="text-[8.5px] font-bold uppercase text-slate-400 block">
                Total Final Payable
              </span>
              <span className="text-lg font-black text-emerald-400 block">
                ₹ {totalFinalPayable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[9px] text-slate-400">
                Sauda Material Value: ₹{existingSaudaAmount.toLocaleString()}
              </span>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-4 py-2.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between select-none">
          <div className="text-[10.5px] text-slate-600 font-mono flex items-center gap-1.5">
            <span className={cn("w-2 h-2 rounded-full inline-block", isSettled ? "bg-emerald-600" : "bg-amber-500")}></span>
            <span>
              {isSettled 
                ? 'Record finalized and locked in sauda_check_point_deductions table' 
                : 'Pending settlement confirmation'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isSettled ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const confirmUnlock = window.confirm(
                      `⚠️ Unlock Settlement for Revision?\n\nThis will allow adjusting the deduction rate basis, custom rate, or audit remarks for PO #${poNo}.\n\nDo you want to unlock?`
                    );
                    if (confirmUnlock) {
                      setIsSettled(false);
                      setSaveMessage("⚠️ Record unlocked. Update your parameters and click 'Save & Lock Settlement' to commit.");
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Unlock to revise rate mode, remarks, or calculation"
                >
                  <Unlock className="w-3.5 h-3.5 text-amber-700" /> Revise / Unlock
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" /> Print Voucher
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  Close
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSettlement}
                  disabled={isSaving}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-white text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50",
                    isWithin3PctExemption ? "bg-emerald-600 hover:bg-emerald-700" : (isGrossExcess ? "bg-purple-700 hover:bg-purple-800" : "bg-amber-600 hover:bg-amber-700")
                  )}
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSaving ? 'Saving...' : 'Save & Lock Settlement'}
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ExcessShortSettlementModal;
