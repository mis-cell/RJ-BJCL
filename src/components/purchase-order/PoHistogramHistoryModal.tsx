import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  AlertTriangle,
  BarChart3,
  Truck,
  Droplets,
  Coins,
  Scale,
  FileText,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { dbModule } from '../../services/dbModule';
import {
  areMrNumbersEqual,
  extractFinalArrivalMrNo,
  extractInspectionMrNo,
  extractRecordMrNo,
  isValidFinalMrNo,
  normalizeFinalMrNo,
} from '../../lib/mrNumberUtils';
import {
  arePoNumbersExactMatch,
  isMaterialMismatchApproved,
} from '../../lib/contractRelationshipEngine';
import { compareSaudaMillInspection } from '../../lib/poMatch';
import { resolveSattaRate } from '../../services/sattaRateService';
import { calculateWeightTolerance } from '../../lib/weightTolerance';

import {
  ComparisonField,
  SectionComparison,
  MrComparisonData,
  PoHistogramHistoryModalProps,
} from './poHistogramTypes';
import {
  getArrivalSummary,
  getArrivalWeightMt,
  getInspectionMetrics,
  getInspectionWeightMt,
  getPaymentMetrics,
  getPoHeaderMetrics,
  getSettlementMetrics,
  sortByMrAsc,
  uniqueJoined,
} from './poHistogramHelpers';
import { PoStoryTabView } from './PoStoryTabView';
import { PoHistogramTabView } from './PoHistogramTabView';
import { PoMismatchAuditTabView } from './PoMismatchAuditTabView';
import { PoComparisonTabView } from './PoComparisonTabView';

export type {
  ComparisonField,
  SectionComparison,
  MrComparisonData,
  PoHistogramHistoryModalProps,
};

export const PoHistogramHistoryModal: React.FC<PoHistogramHistoryModalProps> = ({
  isOpen,
  onClose,
  po,
  allPayments = [],
  allSettlements = [],
  allArrivals = [],
  allInspections = [],
  onNavigateToMismatch,
}) => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'compare' | 'story' | 'histogram' | 'mismatch_audit'>('compare');
  const [selectedMrTab, setSelectedMrTab] = useState<string>('all');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Fetched Live Linked Database Data
  const [dbPoDetails, setDbPoDetails] = useState<any[]>([]);
  const [dbArrivals, setDbArrivals] = useState<any[]>([]);
  const [dbInspections, setDbInspections] = useState<any[]>([]);
  const [dbPayments, setDbPayments] = useState<any[]>([]);
  const [dbSettlements, setDbSettlements] = useState<any[]>([]);
  const [dbMismatches, setDbMismatches] = useState<any[]>([]);
  const [dbSattaMismatches, setDbSattaMismatches] = useState<any[]>([]);
  const [dbSattaRate, setDbSattaRate] = useState<any | null>(null);

  // Reset selected MR filter whenever PO changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedMrTab('all');
    }
  }, [isOpen, po?.po_no]);

  // Load all linked records for this PO with strict exact-PO matching and MR-wise backfill
  useEffect(() => {
    if (!isOpen || !po) return;

    let isMounted = true;
    const fetchLinkedHistoryData = async () => {
      setLoading(true);
      const poTokens = [po.po_no, po.contract_po_no, po.sauda_no, po.ptf_no]
        .map((v) => String(v || '').trim())
        .filter(Boolean);

      const isExactPoMatch = (rec: any): boolean => {
        if (!rec) return false;
        const recTokens = [rec.po_no, rec.mill_po_no, rec.sauda_no, rec.ptf_no, rec.contract_po_no]
          .map((v) => String(v || '').trim())
          .filter(Boolean);
        if (recTokens.length === 0) return false;
        return recTokens.some((rt) => poTokens.some((pt) => arePoNumbersExactMatch(rt, pt)));
      };

      const hasDifferentExplicitPo = (rec: any): boolean => {
        if (!rec) return false;
        const recPo = String(rec.po_no || rec.mill_po_no || '').trim();
        if (!recPo) return false;
        return !isExactPoMatch(rec);
      };

      try {
        const [
          poDetailsRes,
          poDetailsModuleRes,
          tempArrDbRes,
          finalArrDbRes,
          tempArrModuleRes,
          finalArrModuleRes,
          matInspectionsDbRes,
          matInspectionsModuleRes,
          millInspDbRes,
          millInspModuleRes,
          paymentsMasterDbRes,
          paymentsModuleRes,
          settlementsDbRes,
          settlementsModuleRes,
          mismatchCasesRes,
          sattaMismatchRes,
          matMismatchRes,
          sattaBaseRatesRes,
          sattaDiffsRes,
        ] = await Promise.all([
          supabase
            ? Promise.resolve(supabase.from('sauda_check_point_details').select('*').eq('po_no', po.po_no)).catch(() => ({ data: [] }))
            : Promise.resolve({ data: [] }),
          dbModule.fetchAll('sauda_check_point_details').catch(() => []),
          supabase ? Promise.resolve(supabase.from('temporary_material_received').select('*')).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
          supabase ? Promise.resolve(supabase.from('final_arrival').select('*')).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
          dbModule.fetchAll('temporary_material_received').catch(() => []),
          dbModule.fetchAll('final_arrival').catch(() => []),
          supabase ? Promise.resolve(supabase.from('material_inspection').select('*, material_inspection_details(*)')).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
          dbModule.fetchAll('material_inspection').catch(() => []),
          supabase ? Promise.resolve(supabase.from('mill_inspection_master').select('*, mill_inspection_detail(*)')).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
          dbModule.fetchAll('mill_inspection_master').catch(() => []),
          supabase ? Promise.resolve(supabase.from('payment_master').select('*')).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
          dbModule.fetchAll('payment_master').catch(() => []),
          supabase ? Promise.resolve(supabase.from('mr_settlement_master').select('*, mr_settlement_detail(*)')).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
          dbModule.fetchAll('mr_settlement_master').catch(() => []),
          supabase ? Promise.resolve(supabase.from('mismatch_cases').select('*')).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
          dbModule.fetchAll('satta_mismatch').catch(() => []),
          dbModule.fetchAll('material_mismatch').catch(() => []),
          dbModule.fetchAll('satta_base_rates').catch(() => []),
          dbModule.fetchAll('satta_differentials').catch(() => []),
        ]);

        // 0. Sauda Check Point Details (exact PO match)
        const rawPoDetails = [
          ...((poDetailsRes as any)?.data || []),
          ...(Array.isArray(poDetailsModuleRes) ? poDetailsModuleRes : []).filter(isExactPoMatch),
        ];
        const poDetailsMap = new Map<string, any>();
        rawPoDetails.forEach((d: any, idx: number) => {
          if (!d) return;
          const k = String(d.item_id || d.id || `${d.srl_no || idx}_${d.grade_name || ''}_${d.agency_name || ''}`);
          if (!poDetailsMap.has(k)) poDetailsMap.set(k, d);
        });
        const matchedPoDetails = Array.from(poDetailsMap.values());

        // Pool all raw records
        const allFinalArrivalsPool = [
          ...((finalArrDbRes as any)?.data || []),
          ...(Array.isArray(finalArrModuleRes) ? finalArrModuleRes : []),
          ...(Array.isArray(allArrivals) ? allArrivals : []),
        ].filter(Boolean);

        const allTempArrivalsPool = [
          ...((tempArrDbRes as any)?.data || []),
          ...(Array.isArray(tempArrModuleRes) ? tempArrModuleRes : []),
        ].filter(Boolean);

        const allMatInspPool = [
          ...((matInspectionsDbRes as any)?.data || []),
          ...(Array.isArray(matInspectionsModuleRes) ? matInspectionsModuleRes : []),
          ...(Array.isArray(allInspections) ? allInspections : []),
        ].filter(Boolean);

        const allMillInspFallbackPool = [
          ...((millInspDbRes as any)?.data || []),
          ...(Array.isArray(millInspModuleRes) ? millInspModuleRes : []),
        ].filter(Boolean);

        const allPaymentsPool = [
          ...((paymentsMasterDbRes as any)?.data || []),
          ...(Array.isArray(paymentsModuleRes) ? paymentsModuleRes : []),
          ...(Array.isArray(allPayments) ? allPayments : []),
        ].filter(Boolean);

        const allSettlementsPool = [
          ...((settlementsDbRes as any)?.data || []),
          ...(Array.isArray(settlementsModuleRes) ? settlementsModuleRes : []),
          ...(Array.isArray(allSettlements) ? allSettlements : []),
        ].filter(Boolean);

        // STEP A: Collect authoritative PO-linked Final M.R. numbers across ALL exact-PO records
        const mrSet = new Set<string>();
        const addMr = (val: any) => {
          if (val && isValidFinalMrNo(val)) {
            mrSet.add(normalizeFinalMrNo(val));
          }
        };

        if (po.mr_no) addMr(po.mr_no);
        if (Array.isArray(po.linked_mrs)) {
          po.linked_mrs.forEach((m: any) => addMr(m));
        }

        allFinalArrivalsPool.forEach((a: any) => {
          if (isExactPoMatch(a)) addMr(extractFinalArrivalMrNo(a));
        });
        allMatInspPool.forEach((i: any) => {
          if (isExactPoMatch(i)) addMr(extractInspectionMrNo(i));
        });
        allPaymentsPool.forEach((p: any) => {
          if (isExactPoMatch(p)) addMr(extractRecordMrNo(p));
        });
        allSettlementsPool.forEach((s: any) => {
          if (isExactPoMatch(s)) addMr(extractRecordMrNo(s));
        });

        const isMrInSet = (rawMr: string | null | undefined): boolean => {
          if (!rawMr) return false;
          const norm = normalizeFinalMrNo(rawMr);
          if (!norm) return false;
          if (mrSet.has(norm)) return true;
          for (const existing of mrSet) {
            if (areMrNumbersEqual(existing, norm)) return true;
          }
          return false;
        };

        // STEP B: Build Final Arrivals strictly keyed by Final M.R. No. (with backfill for MRs whose final_arrival.po_no is stale/blank)
        const arrivalMap = new Map<string, any>();
        const tempByMrOrLorry = new Map<string, any>();
        allTempArrivalsPool.forEach((t: any) => {
          if (!t) return;
          const tMr = extractFinalArrivalMrNo(t);
          if (tMr && !tempByMrOrLorry.has(tMr)) tempByMrOrLorry.set(tMr, t);
          if (isExactPoMatch(t)) {
            const lorry = String(t.lorry_number || t.lorry_no || '').trim().toUpperCase();
            if (lorry && !tempByMrOrLorry.has(`LORRY:${lorry}`)) {
              tempByMrOrLorry.set(`LORRY:${lorry}`, t);
            }
          }
        });

        const putArrival = (a: any, mrKey: string) => {
          if (!mrKey) return;
          const existing = arrivalMap.get(mrKey);
          const lorry = String(a.lorry_number || a.lorry_no || '').trim().toUpperCase();
          const matchedTemp = tempByMrOrLorry.get(mrKey) || (lorry ? tempByMrOrLorry.get(`LORRY:${lorry}`) : null);
          const enriched = {
            ...(matchedTemp || {}),
            ...a,
            po_no: po.po_no,
            final_arrival_no: mrKey,
            mr_no: mrKey,
            weight_qtl: a.weight_qtl || matchedTemp?.weight_qtl || 0,
            grid_details: a.grid_details || matchedTemp?.grid_details || null,
          };
          if (!existing) {
            arrivalMap.set(mrKey, enriched);
          } else {
            const existingScore = (getArrivalWeightMt(existing) > 0 ? 2 : 0) + (existing.grid_details ? 1 : 0);
            const nextScore = (getArrivalWeightMt(enriched) > 0 ? 2 : 0) + (enriched.grid_details ? 1 : 0);
            if (nextScore > existingScore) {
              arrivalMap.set(mrKey, enriched);
            }
          }
        };

        // Pass 1: exact PO match in final_arrival
        allFinalArrivalsPool.forEach((a: any) => {
          if (isExactPoMatch(a)) {
            const mrKey = extractFinalArrivalMrNo(a);
            if (mrKey) putArrival(a, mrKey);
          }
        });
        // Pass 2: backfill any MR already proven to belong to this PO via material_inspection / payment / settlement
        allFinalArrivalsPool.forEach((a: any) => {
          const mrKey = extractFinalArrivalMrNo(a);
          if (mrKey && isMrInSet(mrKey) && !arrivalMap.has(mrKey)) {
            putArrival(a, mrKey);
          }
        });
        // Pass 3: if an MR in mrSet is still missing from final_arrival, backfill from exact-PO temp arrival
        allTempArrivalsPool.forEach((t: any) => {
          if (!isExactPoMatch(t)) return;
          const mrKey = extractFinalArrivalMrNo(t);
          if (mrKey && isMrInSet(mrKey) && !arrivalMap.has(mrKey)) {
            putArrival(t, mrKey);
          }
        });

        const matchedArrivals = sortByMrAsc(Array.from(arrivalMap.values()), (a) => extractFinalArrivalMrNo(a) || '');

        // STEP C: Build Mill Inspections strictly keyed by material_inspection.mr_no
        // Prioritize material_inspection with exact PO match first so stale mill_inspection_master stubs never override it
        const inspectionMap = new Map<string, any>();
        const putInspection = (i: any, mrKey: string, priority: number) => {
          if (!mrKey) return;
          const existing = inspectionMap.get(mrKey);
          const hasGrid = Boolean(i.grid_details || i.details || (Array.isArray(i.material_inspection_details) && i.material_inspection_details.length > 0));
          const candidate = { ...i, mr_no: mrKey, __priority: priority, __hasGrid: hasGrid };
          if (!existing) {
            inspectionMap.set(mrKey, candidate);
          } else if (
            priority > existing.__priority ||
            (priority === existing.__priority && !existing.__hasGrid && hasGrid)
          ) {
            inspectionMap.set(mrKey, candidate);
          }
        };

        allMatInspPool.forEach((i: any) => {
          const mrKey = extractInspectionMrNo(i);
          if (!mrKey) return;
          if (isExactPoMatch(i)) {
            putInspection(i, mrKey, 4);
            addMr(mrKey);
          } else if (!hasDifferentExplicitPo(i) && isMrInSet(mrKey)) {
            putInspection(i, mrKey, 3);
          }
        });
        allMillInspFallbackPool.forEach((i: any) => {
          const mrKey = extractInspectionMrNo(i);
          if (!mrKey) return;
          if (isExactPoMatch(i)) {
            putInspection(i, mrKey, 2);
            addMr(mrKey);
          } else if (!hasDifferentExplicitPo(i) && isMrInSet(mrKey)) {
            putInspection(i, mrKey, 1);
          }
        });

        const matchedInspections = sortByMrAsc(Array.from(inspectionMap.values()), (i) => extractInspectionMrNo(i) || '');

        // STEP D: Build Payments strictly from payment_master (deduplicated by voucher_no / payment_id)
        const paymentMap = new Map<string, any>();
        allPaymentsPool.forEach((p: any) => {
          const pMr = extractRecordMrNo(p);
          const matchesPo = isExactPoMatch(p);
          const matchesMrSafely = !hasDifferentExplicitPo(p) && isMrInSet(pMr);
          if (!matchesPo && !matchesMrSafely) return;

          const key = String(p.voucher_no || p.payment_id || `${pMr || 'PAY'}_${p.id || ''}`).trim().toUpperCase();
          if (!key) return;
          const existing = paymentMap.get(key);
          const pPaid = Number(p.paid_amount ?? p.amount_paid ?? 0);
          const ePaid = Number(existing?.paid_amount ?? existing?.amount_paid ?? 0);
          if (!existing || (ePaid <= 0 && pPaid > 0)) {
            paymentMap.set(key, p);
          }
        });
        const matchedPayments = sortByMrAsc(Array.from(paymentMap.values()), (p) => extractRecordMrNo(p) || String(p.voucher_no || ''));

        // STEP E: Build Settlements strictly from mr_settlement_master keyed by valid Final M.R. No. (MR... only)
        const settlementMap = new Map<string, any>();
        allSettlementsPool.forEach((s: any) => {
          const sMr = extractRecordMrNo(s);
          if (!sMr) return;
          const matchesPo = isExactPoMatch(s);
          const matchesMrSafely = !hasDifferentExplicitPo(s) && isMrInSet(sMr);
          if (!matchesPo && !matchesMrSafely) return;

          const key = sMr.toUpperCase();
          const existing = settlementMap.get(key);
          const sValueScore =
            (Number(s.value_amt || s.val_material_value || s.summary_material_value || 0) > 0 ? 2 : 0) +
            (Number(s.net_settled_amount || s.net_amt || s.payable_amt || s.final_amount || 0) > 0 ? 1 : 0);
          const eValueScore = existing
            ? (Number(existing.value_amt || existing.val_material_value || existing.summary_material_value || 0) > 0 ? 2 : 0) +
              (Number(existing.net_settled_amount || existing.net_amt || existing.payable_amt || existing.final_amount || 0) > 0 ? 1 : 0)
            : -1;
          if (!existing || sValueScore > eValueScore) {
            settlementMap.set(key, { ...s, mr_no: sMr });
          }
        });
        const matchedSettlements = sortByMrAsc(Array.from(settlementMap.values()), (s) => extractRecordMrNo(s) || '');

        // STEP F: Build Combined Mismatch Audit (Database records + Live MR-wise Name-only checks)
        const rawDbMismatches = [
          ...((mismatchCasesRes as any)?.data || []),
          ...(Array.isArray(matMismatchRes) ? matMismatchRes : []),
        ].filter((m: any) => {
          if (!m) return false;
          if (isExactPoMatch(m)) return true;
          const mMr = extractRecordMrNo(m);
          return !hasDifferentExplicitPo(m) && isMrInSet(mMr);
        });

        const normalizedDbMismatches: any[] = [];
        const dbMismatchSeen = new Set<string>();
        rawDbMismatches.forEach((m: any, idx: number) => {
          const fieldText = String(m.field_name || m.field || m.mismatched_fields || m.mismatch_type || 'General').trim();
          const mrText = extractRecordMrNo(m) || String(m.mr_no || m.arrival_no || '').trim();
          const dedupKey = String(m.id || `${mrText}_${fieldText}_${idx}`).trim().toUpperCase();
          if (dbMismatchSeen.has(dedupKey)) return;
          dbMismatchSeen.add(dedupKey);
          normalizedDbMismatches.push({
            ...m,
            mr_no: mrText,
            field_name: fieldText,
            variance: m.variance || m.difference || '',
            source: 'db',
          });
        });

        const approvedDbRows = normalizedDbMismatches.filter((m) => isMaterialMismatchApproved(m));
        const isPoLevelApprovedInDb = approvedDbRows.some((m) => !extractRecordMrNo(m));

        // Run live MR-wise Name-only comparison (identical to Material Mismatch Board)
        const liveMismatchRows: any[] = [];
        matchedInspections.forEach((insp: any) => {
          const inspMr = extractInspectionMrNo(insp);
          const matchRes = compareSaudaMillInspection(po, matchedPoDetails, insp, [], matchedInspections);
          if (!matchRes.hasInspection || matchRes.mismatches.length === 0) return;

          const matchingDbApproval =
            approvedDbRows.find((m) => {
              const dbMr = extractRecordMrNo(m);
              return dbMr && inspMr && areMrNumbersEqual(dbMr, inspMr);
            }) || (isPoLevelApprovedInDb ? approvedDbRows[0] : null);

          matchRes.mismatches.forEach((mm, mIdx) => {
            const alreadyInDb = normalizedDbMismatches.some((dbm) => {
              const dbMr = extractRecordMrNo(dbm);
              const sameMr = dbMr && inspMr ? areMrNumbersEqual(dbMr, inspMr) : !dbMr;
              const dbField = String(dbm.field_name || dbm.field || '').toLowerCase();
              return sameMr && dbField.includes(mm.field.toLowerCase());
            });
            if (alreadyInDb) return;

            liveMismatchRows.push({
              id: `live-${inspMr || 'PO'}-${mm.field}-${mIdx}`,
              po_no: po.po_no,
              mr_no: inspMr || '—',
              field_name: mm.field,
              expected_value: mm.poValue || '—',
              actual_value: mm.inspValue || '—',
              variance: mm.mismatchLabel,
              mismatchLabel: mm.mismatchLabel,
              status: matchingDbApproval ? 'approved' : 'pending',
              approved_by: matchingDbApproval?.approved_by || '',
              remarks: matchingDbApproval
                ? matchingDbApproval.remarks || 'Approved in Material Mismatch Board'
                : 'Detected via live MR-wise Mill Inspection vs Sauda Check Point comparison',
              source: 'live',
            });
          });
        });

        const combinedMaterialMismatches = [...normalizedDbMismatches, ...liveMismatchRows];

        const rawSattaMismatches = (Array.isArray(sattaMismatchRes) ? sattaMismatchRes : []).filter((m: any) => {
          if (!m) return false;
          if (isExactPoMatch(m)) return true;
          const mMr = extractRecordMrNo(m);
          return !hasDifferentExplicitPo(m) && isMrInSet(mMr);
        });

        // STEP G: Accurate Satta Rate Reference from satta_base_rates + satta_differentials
        const saudaDate = String(po.s_date || po.po_date || po.contract_date || po.created_at?.slice(0, 10) || '').slice(0, 10);
        const baseRatesList = Array.isArray(sattaBaseRatesRes) ? sattaBaseRatesRes : [];
        const diffsList = Array.isArray(sattaDiffsRes) ? sattaDiffsRes : [];

        let resolvedSatta: any = null;
        const firstDetail = matchedPoDetails[0] || {};
        const targetGrade = firstDetail.grade_name || po.grade || po.grade_name || 'TD5';
        const targetAgency = firstDetail.agency_name || po.agency_name || '';

        if (baseRatesList.length > 0 && po.area) {
          const res = resolveSattaRate({
            area: po.area,
            agency: targetAgency,
            grade: targetGrade,
            date: saudaDate,
            baseRates: baseRatesList,
            differentials: diffsList,
          });
          if (res.found && res.finalRate !== null) {
            resolvedSatta = {
              base_rate: res.baseRate,
              finalRate: res.finalRate,
              differential: res.differential,
              start_date: res.startDate,
              matchedArea: res.matchedArea,
              normGrade: res.normGrade,
            };
          }
        }
        if (!resolvedSatta && baseRatesList.length > 0 && saudaDate) {
          const validBases = baseRatesList
            .filter((b: any) => b && Number(b.base_rate) > 0 && String(b.start_date || '').slice(0, 10) <= saudaDate)
            .sort((a: any, b: any) => String(b.start_date || '').localeCompare(String(a.start_date || '')));
          if (validBases.length > 0) {
            resolvedSatta = {
              base_rate: Number(validBases[0].base_rate),
              finalRate: Number(validBases[0].base_rate),
              start_date: validBases[0].start_date,
            };
          }
        }

        if (isMounted) {
          setDbPoDetails(matchedPoDetails);
          setDbArrivals(matchedArrivals);
          setDbInspections(matchedInspections);
          setDbPayments(matchedPayments);
          setDbSettlements(matchedSettlements);
          setDbMismatches(combinedMaterialMismatches);
          setDbSattaMismatches(rawSattaMismatches);
          setDbSattaRate(resolvedSatta);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching PO Histogram comparison data:', err);
        if (isMounted) {
          setDbArrivals(allArrivals.filter(isExactPoMatch));
          setDbInspections(allInspections.filter(isExactPoMatch));
          setDbPayments(allPayments.filter(isExactPoMatch));
          setDbSettlements(allSettlements.filter(isExactPoMatch));
          setLoading(false);
        }
      }
    };

    fetchLinkedHistoryData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, po, allArrivals, allInspections, allPayments, allSettlements]);

  // Derived Multi-MR list strictly using Final M.R. Numbers (MR... only, sorted ascending)
  const linkedMrs = useMemo(() => {
    const mrSet = new Set<string>();
    dbArrivals.forEach((a: any) => {
      const mr = extractFinalArrivalMrNo(a);
      if (mr) mrSet.add(mr);
    });
    if (po?.mr_no && isValidFinalMrNo(po.mr_no)) {
      mrSet.add(normalizeFinalMrNo(po.mr_no));
    }
    if (Array.isArray(po?.linked_mrs)) {
      po.linked_mrs.forEach((m: any) => {
        if (m && isValidFinalMrNo(m)) mrSet.add(normalizeFinalMrNo(m));
      });
    }
    dbSettlements.forEach((s: any) => {
      const mr = extractRecordMrNo(s);
      if (mr) mrSet.add(mr);
    });
    dbInspections.forEach((i: any) => {
      const mr = extractInspectionMrNo(i);
      if (mr) mrSet.add(mr);
    });
    dbPayments.forEach((p: any) => {
      const mr = extractRecordMrNo(p);
      if (mr) mrSet.add(mr);
    });
    return sortByMrAsc(Array.from(mrSet), (m) => m);
  }, [dbArrivals, dbInspections, dbSettlements, dbPayments, po]);

  // Authoritative received weight for top summary bar (matches Sauda Check Point)
  const topReceivedWeightMt = useMemo(() => {
    const inspSum = dbInspections.reduce((s, i) => s + getInspectionWeightMt(i, dbArrivals), 0);
    if (inspSum > 0) return inspSum;
    return dbArrivals.reduce((s, a) => s + getArrivalWeightMt(a), 0);
  }, [dbArrivals, dbInspections]);

  // Comprehensive Comparison Engine (honors selectedMrTab when user clicks an individual MR pill)
  const comparisonResults = useMemo(() => {
    if (!po) {
      return {
        sections: [],
        summary: { totalSections: 0, mismatchSections: 0, totalMismatches: 0, totalPassedChecks: 0, mrComparisons: [] },
      };
    }

    const poHeader = getPoHeaderMetrics(po, dbPoDetails);
    const isSingleMr = selectedMrTab !== 'all';
    const matchesSelectedMr = (rec: any): boolean => {
      if (!isSingleMr) return true;
      const recMr = extractRecordMrNo(rec) || extractFinalArrivalMrNo(rec) || extractInspectionMrNo(rec);
      return Boolean(recMr && areMrNumbersEqual(recMr, selectedMrTab));
    };

    const activeArrivals = dbArrivals.filter(matchesSelectedMr);
    const activeInspections = dbInspections.filter(matchesSelectedMr);
    const activePayments = dbPayments.filter(matchesSelectedMr);
    const activeSettlements = dbSettlements.filter(matchesSelectedMr);
    const activeMrs = isSingleMr ? [selectedMrTab] : linkedMrs;

    // Aggregate Arrival metrics
    const totalArrivalWeight = activeArrivals.reduce((sum, a) => sum + getArrivalWeightMt(a), 0);
    const totalInspWeight = activeInspections.reduce((sum, i) => sum + getInspectionWeightMt(i, dbArrivals), 0);
    const effectiveReceivedWeight = totalInspWeight > 0 ? totalInspWeight : totalArrivalWeight;

    const arrivalSummaries = activeArrivals.map((a) => getArrivalSummary(a));
    const arrivalLorryNos = uniqueJoined(arrivalSummaries.map((a) => a.lorryNo), '');
    const arrivalWeightsText = arrivalSummaries
      .map((a) => (a.weightMt > 0 ? `${a.mrNo}: ${a.weightMt.toFixed(3)} MT` : null))
      .filter(Boolean)
      .join(', ');
    const arrivalChallanSuppliers = uniqueJoined(arrivalSummaries.map((a) => a.challanSupplier), '');
    const arrivalAreas = uniqueJoined(arrivalSummaries.map((a) => a.area), '');
    const arrivalGrades = uniqueJoined(arrivalSummaries.map((a) => a.grades), '');

    // Tolerance Calculation (against full contract in All-MR mode, or per-lorry target in single-MR mode)
    const targetWeightMt = isSingleMr ? poHeader.weightPerLorry : poHeader.contractMt;
    const weightTol = calculateWeightTolerance(targetWeightMt, effectiveReceivedWeight, poHeader.unit);

    // Satta Rate Reference
    const sattaLimitRate =
      dbSattaRate?.finalRate !== undefined && dbSattaRate?.finalRate !== null
        ? Number(dbSattaRate.finalRate)
        : dbSattaRate?.base_rate
          ? Number(dbSattaRate.base_rate)
          : null;

    // Aggregate Inspection metrics (reads header + grid_details)
    const inspMetricsList = activeInspections.map((i) => getInspectionMetrics(i, dbArrivals));
    const moistureSamples = inspMetricsList.map((m) => m.actualMoisture).filter((v) => v > 0);
    const dustSamples = inspMetricsList.map((m) => m.actualDust).filter((v) => v > 0);
    const ncvSamples = inspMetricsList.map((m) => m.actualNcv).filter((v) => v > 0);

    const avgMoisture =
      moistureSamples.length > 0
        ? moistureSamples.reduce((s, v) => s + v, 0) / moistureSamples.length
        : 0;
    const avgDust =
      dustSamples.length > 0
        ? dustSamples.reduce((s, v) => s + v, 0) / dustSamples.length
        : 0;
    const avgNcv =
      ncvSamples.length > 0
        ? ncvSamples.reduce((s, v) => s + v, 0) / ncvSamples.length
        : 0;
    const avgClaimMoisture =
      inspMetricsList.length > 0
        ? inspMetricsList.reduce((s, m) => s + m.claimMoisture, 0) / inspMetricsList.length
        : 0;
    const inspGrades = uniqueJoined(inspMetricsList.map((m) => m.grades), 'N/A');
    const inspAgencies = uniqueJoined(inspMetricsList.map((m) => m.agencies), 'N/A');
    const inspMarkas = uniqueJoined(inspMetricsList.map((m) => m.markas), 'N/A');
    const maxGradeDown = inspMetricsList.reduce((max, m) => Math.max(max, m.gradeDown), 0);

    const inspectionmrno = inspMetricsList.map((m) => m.mrNo).filter(Boolean).join(', ');
    const inspectionmrweight = inspMetricsList
      .map((m) => (m.weightMt > 0 ? `${m.mrNo}: ${m.weightMt.toFixed(3)} MT` : null))
      .filter(Boolean)
      .join(', ');

    // Aggregate Payment metrics
    const paymentMetricsList = activePayments.map((p) => getPaymentMetrics(p));
    const totalPaidAmount = paymentMetricsList.reduce((sum, p) => sum + p.paidAmount, 0);
    const totalPayableAmount = paymentMetricsList.reduce((sum, p) => sum + p.payableAmount, 0);
    const contractValueEst =
      poHeader.contractMt > 0 && poHeader.rate > 0
        ? poHeader.contractMt * 10 * poHeader.rate
        : totalPayableAmount;

    // Aggregate Settlement metrics
    const settMetricsList = activeSettlements.map((s) => getSettlementMetrics(s));
    const settledWeight = settMetricsList.reduce((sum, s) => sum + s.weightMt, 0);
    const settledGrossValue = settMetricsList.reduce((sum, s) => sum + s.grossValue, 0);
    const settledAdvanceAdjusted = settMetricsList.reduce((sum, s) => sum + s.advanceAdjusted, 0);
    const settledPenalty = settMetricsList.reduce((sum, s) => sum + s.weightPenalty, 0);
    const settledQualityDeductions = settMetricsList.reduce((sum, s) => sum + s.qualityDeductions, 0);
    const totalSettledPayable = settMetricsList.reduce((sum, s) => sum + s.netPayable, 0);

    // Filtered Material Mismatches
    const allMaterialMismatches = dbMismatches.filter(
      (m) =>
        m.mismatch_type !== 'price' &&
        (!isSingleMr || !extractRecordMrNo(m) || areMrNumbersEqual(extractRecordMrNo(m), selectedMrTab))
    );
    const pendingMaterialMismatches = allMaterialMismatches.filter((m) => !isMaterialMismatchApproved(m));
    const approvedMaterialMismatches = allMaterialMismatches.filter((m) => isMaterialMismatchApproved(m));

    const hasFieldPendingMismatch = (keywords: string[]) =>
      pendingMaterialMismatches.some((m) => {
        const text = String(m.field_name || m.field || '').toLowerCase();
        return keywords.some((k) => text.includes(k));
      });

    // -------------------------------------------------------------
    // SECTION 1: SAUDA CHECK POINT
    // -------------------------------------------------------------
    const saudaFields: ComparisonField[] = [
      {
        name: 'Sauda Contract P.O.',
        referenceValue: poHeader.poNo || 'N/A',
        actualValue: poHeader.poNo || 'N/A',
        status: 'match',
        notes: 'Authoritative P.O. Key',
      },
      {
        name: 'Contract Date',
        referenceValue: poHeader.poDate,
        actualValue: poHeader.poDate,
        status: 'match',
      },
      {
        name: 'Supplier / Vendor',
        referenceValue: poHeader.supplier,
        actualValue: poHeader.supplier,
        status: 'match',
      },
      {
        name: 'Broker',
        referenceValue: poHeader.broker,
        actualValue: poHeader.broker,
        status: 'match',
      },
      {
        name: 'Challan Supplier',
        referenceValue: poHeader.challanSupplier,
        actualValue: poHeader.challanSupplier,
        status: 'match',
      },
      {
        name: 'Station / Area',
        referenceValue: poHeader.area,
        actualValue: poHeader.area,
        status: 'match',
      },
      {
        name: 'Grade Name',
        referenceValue: poHeader.grades,
        actualValue: poHeader.grades,
        status: 'match',
      },
      {
        name: 'Agency Name',
        referenceValue: poHeader.agencies,
        actualValue: poHeader.agencies,
        status: 'match',
      },
      {
        name: 'Marka Name',
        referenceValue: poHeader.markas,
        actualValue: poHeader.markas,
        status: 'match',
      },
      {
        name: 'Units & Count',
        referenceValue: `${poHeader.totalUnits} ${poHeader.unit}`,
        actualValue: `${poHeader.totalUnits} ${poHeader.unit}`,
        status: 'match',
      },
      {
        name: 'Weight / Lorry (MT)',
        referenceValue: `${poHeader.weightPerLorry.toFixed(3)} MT`,
        actualValue: `${poHeader.weightPerLorry.toFixed(3)} MT`,
        status: 'match',
      },
      {
        name: 'Total Contract Weight (MT)',
        referenceValue: `${poHeader.contractMt.toFixed(3)} MT`,
        actualValue: `${poHeader.contractMt.toFixed(3)} MT`,
        status: 'match',
      },
      {
        name: 'Total No of Lorries',
        referenceValue: `${poHeader.lorries} Lorry`,
        actualValue: `${poHeader.lorries} Lorry`,
        status: 'match',
      },
      {
        name: 'Rate / Qtl & Detail Rates',
        referenceValue: poHeader.rate > 0 ? `₹${poHeader.rate.toLocaleString()}/Qtl` : poHeader.detailRateRange,
        actualValue: poHeader.detailRateRange,
        status: 'match',
        notes: poHeader.premium ? `Premium: ₹${poHeader.premium}/Qtl` : 'Base / Grade-wise Sauda Rate',
      },
    ];

    // -------------------------------------------------------------
    // SECTION 2: FINAL ARRIVAL
    // -------------------------------------------------------------
    const tempArrivalFields: ComparisonField[] = [
      {
        name: 'Linked Arrival MRs',
        referenceValue: isSingleMr ? selectedMrTab : `${poHeader.lorries} Expected`,
        actualValue:
          activeMrs.length > 0
            ? `${activeMrs.length} MR (${activeMrs.join(', ')})`
            : 'Not Arrived',
        status: activeMrs.length === 0 ? 'not_available' : 'match',
        isCritical: false,
      },
      {
        name: 'Challan Supplier',
        referenceValue: poHeader.challanSupplier,
        actualValue: arrivalChallanSuppliers || (activeArrivals.length > 0 ? 'Recorded' : 'Not Arrived'),
        status:
          activeArrivals.length === 0
            ? 'not_available'
            : hasFieldPendingMismatch(['challan', 'supplier'])
              ? 'mismatch'
              : 'match',
        isCritical: true,
      },
      {
        name: 'Arrival Station / Area',
        referenceValue: poHeader.area,
        actualValue: arrivalAreas || (activeArrivals.length > 0 ? 'Recorded' : 'Not Arrived'),
        status:
          activeArrivals.length === 0
            ? 'not_available'
            : hasFieldPendingMismatch(['area'])
              ? 'mismatch'
              : 'match',
      },
      {
        name: 'Arrival Grade',
        referenceValue: poHeader.grades,
        actualValue: arrivalGrades || (activeArrivals.length > 0 ? 'Recorded' : 'Not Arrived'),
        status:
          activeArrivals.length === 0
            ? 'not_available'
            : hasFieldPendingMismatch(['grade'])
              ? 'mismatch'
              : 'match',
        isCritical: true,
      },
      {
        name: 'Lorry Number(s)',
        referenceValue: isSingleMr ? '1 Lorry' : `${poHeader.lorries} Expected`,
        actualValue: arrivalLorryNos || (activeArrivals.length > 0 ? `${activeArrivals.length} Recorded` : 'Pending Arrival'),
        status: activeArrivals.length === 0 ? 'not_available' : 'match',
      },
      {
        name: 'MR-Wise Arrival Weight (MT)',
        referenceValue: isSingleMr ? `${poHeader.weightPerLorry.toFixed(3)} MT` : `${poHeader.contractMt.toFixed(3)} MT`,
        actualValue: arrivalWeightsText || (activeArrivals.length > 0 ? `${totalArrivalWeight.toFixed(3)} MT` : 'Pending Arrival'),
        status: activeArrivals.length === 0 ? 'not_available' : 'match',
      },
      {
        name: 'Received vs Contract Weight',
        referenceValue: `${targetWeightMt.toFixed(3)} MT`,
        actualValue: `${effectiveReceivedWeight.toFixed(3)} MT`,
        variance:
          weightTol.diffMt !== 0
            ? `${weightTol.diffMt >= 0 ? '+' : ''}${weightTol.diffMt.toFixed(3)} MT`
            : '0.000 MT',
        status:
          activeArrivals.length === 0 && activeInspections.length === 0
            ? 'not_available'
            : weightTol.isWithinTolerance || weightTol.isAcceptable
              ? 'match'
              : 'mismatch',
        notes:
          weightTol.isWithinTolerance || weightTol.isAcceptable
            ? `Within allowed tolerance (±${weightTol.toleranceMt.toFixed(3)} MT)`
            : `Beyond allowed tolerance of ±${weightTol.toleranceMt.toFixed(3)} MT`,
        isCritical: true,
      },
    ];

    // -------------------------------------------------------------
    // SECTION 3: MILL INSPECTION
    // -------------------------------------------------------------
    const millInspFields: ComparisonField[] = [
      {
        name: 'Moisture Content (%)',
        referenceValue: '≤ 15.0% Standard',
        actualValue:
          activeInspections.length > 0
            ? `${avgMoisture.toFixed(1)}% (Claim Avg: ${avgClaimMoisture.toFixed(1)}%)`
            : 'Pending Inspection',
        variance: avgMoisture > 15.0 ? `+${(avgMoisture - 15.0).toFixed(1)}% Excess` : 'Normal',
        status: activeInspections.length === 0 ? 'not_available' : avgMoisture <= 15.0 ? 'match' : 'mismatch',
        notes:
          avgMoisture > 15.0
            ? 'Moisture exceeds standard 15% limit. Quality deduction triggered.'
            : 'Moisture within standard acceptance range.',
        isCritical: true,
      },
      {
        name: 'Grade / Agency / Marka Verified',
        referenceValue: `${poHeader.grades} | ${poHeader.agencies} | ${poHeader.markas}`,
        actualValue:
          activeInspections.length > 0
            ? `${inspGrades} | ${inspAgencies} | ${inspMarkas}`
            : 'Pending Inspection',
        status:
          activeInspections.length === 0
            ? 'not_available'
            : hasFieldPendingMismatch(['grade', 'agency', 'marka'])
              ? 'mismatch'
              : 'match',
        notes:
          maxGradeDown > 0
            ? `Grade Down: ${maxGradeDown}%`
            : hasFieldPendingMismatch(['grade', 'agency', 'marka'])
              ? 'Discrepancy detected vs Sauda Check Point (see Mismatch Board)'
              : 'Grade, Agency & Marka verified',
        isCritical: true,
      },
      {
        name: 'Dust Contamination (%)',
        referenceValue: '≤ 1.0% Standard',
        actualValue: activeInspections.length > 0 ? `${avgDust.toFixed(1)}%` : 'Pending',
        variance: avgDust > 1.0 ? `+${(avgDust - 1.0).toFixed(1)}% Excess` : 'Normal',
        status: activeInspections.length === 0 ? 'not_available' : avgDust <= 1.0 ? 'match' : 'mismatch',
        notes: avgDust > 1.0 ? 'Dust exceeds standard tolerance.' : 'Dust within acceptance.',
      },
      {
        name: 'NCV Contamination (%)',
        referenceValue: '≤ 0.5% Standard',
        actualValue: activeInspections.length > 0 ? `${avgNcv.toFixed(1)}%` : 'Pending',
        variance: avgNcv > 0.5 ? `+${(avgNcv - 0.5).toFixed(1)}% Excess` : 'Normal',
        status: activeInspections.length === 0 ? 'not_available' : avgNcv <= 0.5 ? 'match' : 'mismatch',
        notes: avgNcv > 0.5 ? 'Non-Combustible Value exceeds limit.' : 'NCV within acceptance.',
      },
      {
        name: 'Inspected MRs',
        referenceValue: isSingleMr ? selectedMrTab : `${poHeader.lorries} Expected`,
        actualValue:
          inspectionmrno || (activeInspections.length > 0 ? `${activeInspections.length} Recorded` : 'Pending Inspection'),
        status: activeInspections.length === 0 ? 'not_available' : 'match',
      },
      {
        name: 'Inspected MR Weights (MT)',
        referenceValue: isSingleMr ? `${poHeader.weightPerLorry.toFixed(3)} MT` : `${poHeader.contractMt.toFixed(3)} MT`,
        actualValue:
          inspectionmrweight
            ? `${inspectionmrweight} (Total: ${totalInspWeight.toFixed(3)} MT)`
            : activeInspections.length > 0
              ? `${totalInspWeight.toFixed(3)} MT`
              : 'Pending Inspection',
        status: activeInspections.length === 0 ? 'not_available' : 'match',
      },
    ];

    // -------------------------------------------------------------
    // SECTION 4: SATTA PRICE MISMATCH
    // -------------------------------------------------------------
    const priceMismatches = [
      ...dbMismatches.filter(
        (m) =>
          m.mismatch_type === 'price' ||
          String(m.field_name || '').toLowerCase().includes('rate') ||
          String(m.field_name || '').toLowerCase().includes('price')
      ),
      ...dbSattaMismatches,
    ];
    const rateDiff = sattaLimitRate !== null && poHeader.rate > 0 ? poHeader.rate - sattaLimitRate : 0;
    const isRateBeyondLimit = sattaLimitRate !== null && poHeader.rate > sattaLimitRate;
    const isPriceApproved = priceMismatches.length > 0 && priceMismatches.every((m) => isMaterialMismatchApproved(m));

    const saudaPriceFields: ComparisonField[] = [
      {
        name: 'Sauda Rate vs Satta Rate',
        referenceValue:
          sattaLimitRate !== null ? `₹${sattaLimitRate.toLocaleString()} / Qtl (Satta)` : 'Satta Rate Not Configured for Date',
        actualValue:
          poHeader.rate > 0
            ? `₹${poHeader.rate.toLocaleString()} / Qtl (Sauda)`
            : `${poHeader.detailRateRange} (Sauda)`,
        variance:
          sattaLimitRate !== null && poHeader.rate > 0
            ? rateDiff !== 0
              ? `${rateDiff >= 0 ? '+' : ''}₹${rateDiff.toLocaleString()}/Qtl`
              : '₹0'
            : 'N/A',
        status:
          sattaLimitRate === null
            ? 'match'
            : isRateBeyondLimit && !isPriceApproved
              ? 'mismatch'
              : 'match',
        notes:
          sattaLimitRate === null
            ? `No Satta base rate published on/before ${poHeader.poDate}`
            : isRateBeyondLimit
              ? `Exceeds Satta Limit by ₹${rateDiff.toLocaleString()}/Qtl`
              : 'Within approved Satta ceiling rate',
        isCritical: true,
      },
      {
        name: 'Price Dispute Clearance',
        referenceValue: 'Management Approval Required',
        actualValue:
          priceMismatches.length > 0
            ? isPriceApproved
              ? `Approved by ${priceMismatches[0].approved_by || 'Admin'}`
              : 'Dispute Pending Approval'
            : isRateBeyondLimit
              ? 'Dispute Unresolved'
              : 'No Dispute',
        status: isRateBeyondLimit && !isPriceApproved ? 'mismatch' : 'match',
        notes: priceMismatches[0]?.remarks || priceMismatches[0]?.approval_remarks || 'Rate validated',
      },
    ];

    // -------------------------------------------------------------
    // SECTION 5: MATERIAL MISMATCH BOARD (BASE MODE)
    // -------------------------------------------------------------
    const receivedLorryCount = isSingleMr
      ? Math.max(activeArrivals.length, activeInspections.length)
      : Math.max(dbArrivals.length, dbInspections.length, linkedMrs.length);
    const expectedLorryCount = isSingleMr ? 1 : poHeader.lorries;
    const remainingLorries = Math.max(0, expectedLorryCount - receivedLorryCount);

    const materialMismatchFields: ComparisonField[] = [
      {
        name: 'Supplier & Broker Match',
        referenceValue: `${poHeader.supplier} | ${poHeader.broker}`,
        actualValue:
          inspMetricsList.length > 0
            ? `${uniqueJoined(inspMetricsList.map((m) => m.supplier), poHeader.supplier)} | ${uniqueJoined(inspMetricsList.map((m) => m.broker), poHeader.broker)}`
            : arrivalSummaries.length > 0
              ? `${uniqueJoined(arrivalSummaries.map((a) => a.supplier), poHeader.supplier)} | ${uniqueJoined(arrivalSummaries.map((a) => a.broker), poHeader.broker)}`
              : 'Pending Arrival',
        status: hasFieldPendingMismatch(['supplier', 'broker', 'challan']) ? 'mismatch' : 'match',
      },
      {
        name: 'Area, Grade, Agency & Marka Match',
        referenceValue: `${poHeader.area} | ${poHeader.grades} | ${poHeader.agencies} | ${poHeader.markas}`,
        actualValue:
          inspMetricsList.length > 0
            ? `${poHeader.area} | ${inspGrades} | ${inspAgencies} | ${inspMarkas}`
            : arrivalSummaries.length > 0
              ? `${arrivalAreas || poHeader.area} | ${arrivalGrades || poHeader.grades}`
              : 'Pending Arrival',
        status: hasFieldPendingMismatch(['area', 'grade', 'agency', 'marka']) ? 'mismatch' : 'match',
        notes: hasFieldPendingMismatch(['area', 'grade', 'agency', 'marka'])
          ? pendingMaterialMismatches
              .filter((m) => ['area', 'grade', 'agency', 'marka'].some((k) => String(m.field_name || '').toLowerCase().includes(k)))
              .map((m) => `${m.mr_no ? `${m.mr_no}: ` : ''}${m.variance || m.field_name}`)
              .slice(0, 3)
              .join(' • ')
          : 'All specifications match Sauda Check Point',
      },
      {
        name: 'Lorry Progress vs Contract',
        referenceValue: `${expectedLorryCount} Lorries Contracted`,
        actualValue: `${receivedLorryCount} Received | ${remainingLorries} Remaining`,
        status: remainingLorries === 0 ? 'match' : 'not_available',
        notes: remainingLorries === 0 ? 'All contracted lorries received' : `${remainingLorries} lorry arrival(s) pending`,
      },
      {
        name: 'Mismatch Audit Board Status',
        referenceValue: 'Zero Unapproved Mismatches',
        actualValue:
          allMaterialMismatches.length > 0
            ? `${allMaterialMismatches.length} Case(s) (${approvedMaterialMismatches.length} Approved, ${pendingMaterialMismatches.length} Pending)`
            : 'Clean (No Mismatches)',
        status: pendingMaterialMismatches.length > 0 ? 'mismatch' : 'match',
        notes:
          pendingMaterialMismatches.length > 0
            ? `${pendingMaterialMismatches.length} unapproved mismatch case(s) require approval in Material Mismatch Board`
            : approvedMaterialMismatches.length > 0
              ? approvedMaterialMismatches[0]?.remarks || 'All mismatches approved'
              : 'Material specifications verified',
        isCritical: true,
      },
    ];

    // -------------------------------------------------------------
    // SECTION 6: PAYMENT OPERATIONS
    // -------------------------------------------------------------
    const paymentFields: ComparisonField[] = [
      {
        name: 'Total Paid / Advance Amount',
        referenceValue:
          totalPayableAmount > 0
            ? `₹${Math.round(totalPayableAmount).toLocaleString()} (Voucher Payable)`
            : contractValueEst > 0
              ? `≤ ₹${Math.round(contractValueEst).toLocaleString()} (Contract Est)`
              : '₹0',
        actualValue: `₹${Math.round(totalPaidAmount).toLocaleString()}`,
        variance:
          totalPayableAmount > 0
            ? `Balance: ₹${Math.round(Math.max(0, totalPayableAmount - totalPaidAmount)).toLocaleString()}`
            : undefined,
        status: activePayments.length > 0 ? 'match' : 'not_available',
        notes: `${activePayments.length} Voucher(s) recorded (${paymentMetricsList.map((p) => `${p.mrNo}: ₹${Math.round(p.paidAmount).toLocaleString()}`).join(', ') || 'None'})`,
      },
      {
        name: 'Payment Vouchers Count',
        referenceValue: `${expectedLorryCount} MR(s) Expected`,
        actualValue: `${activePayments.length} Voucher(s)`,
        status: activePayments.length > 0 ? 'match' : 'not_available',
        notes: paymentMetricsList.map((p) => `${p.voucherNo} (${p.mrNo})`).join(', ') || 'Pending voucher creation',
      },
    ];

    // -------------------------------------------------------------
    // SECTION 7: SETTLEMENT & FINAL AUDIT
    // -------------------------------------------------------------
    const settlementFields: ComparisonField[] = [
      {
        name: 'Settlement Status',
        referenceValue: 'Full Account Reconciliation',
        actualValue:
          activeSettlements.length > 0
            ? `Generated (${activeSettlements.length} MR${activeSettlements.length === 1 ? '' : 's'} Settled)`
            : 'Pending Settlement',
        status: activeSettlements.length > 0 ? 'match' : 'not_available',
        notes: settMetricsList.map((s) => `${s.mrNo} (${s.settDate})`).join(', ') || 'Awaiting final MR audit',
      },
      {
        name: 'Settled Net Weight',
        referenceValue: `${targetWeightMt.toFixed(3)} MT Contract`,
        actualValue: `${(settledWeight > 0 ? settledWeight : effectiveReceivedWeight).toFixed(3)} MT`,
        status: activeSettlements.length > 0 ? 'match' : 'not_available',
      },
      {
        name: 'Gross Material Value & Advance Adjusted',
        referenceValue: totalPaidAmount > 0 ? `Paid: ₹${Math.round(totalPaidAmount).toLocaleString()}` : 'Reconciled Value',
        actualValue:
          activeSettlements.length > 0
            ? `Value: ₹${Math.round(settledGrossValue).toLocaleString()} | Adv Adj: ₹${Math.round(settledAdvanceAdjusted).toLocaleString()}`
            : 'Pending',
        status: activeSettlements.length > 0 ? 'match' : 'not_available',
        notes:
          activeSettlements.length > 0
            ? `Net Final Balance Payable: ₹${Math.round(totalSettledPayable).toLocaleString()}`
            : 'Pending settlement ledger',
      },
      {
        name: 'Quality Deductions & Weight Penalty',
        referenceValue: weightTol.isWithinTolerance || weightTol.isAcceptable ? '₹0 (Tolerable)' : 'Claim / Penalty Check',
        actualValue: `Deductions: ₹${Math.round(settledQualityDeductions).toLocaleString()} | Penalty: ₹${Math.round(settledPenalty).toLocaleString()}`,
        status: 'match',
        notes:
          settledQualityDeductions + settledPenalty > 0
            ? `Total ₹${Math.round(settledQualityDeductions + settledPenalty).toLocaleString()} adjusted in settlement`
            : 'Zero deductions/penalties applied in MR settlement ledger',
      },
    ];

    const sections: SectionComparison[] = [
      {
        id: 'sauda_check_point',
        title: 'Sauda Check Point',
        icon: FileText,
        fields: saudaFields,
        mismatchCount: saudaFields.filter((f) => f.status === 'mismatch').length,
        status: saudaFields.some((f) => f.status === 'mismatch') ? 'mismatch' : 'clean',
        existingRecords: [po, ...dbPoDetails],
      },
      {
        id: 'temporary_arrival',
        title: `Final Arrival (${activeArrivals.length} MR)`,
        icon: Truck,
        fields: tempArrivalFields,
        mismatchCount: tempArrivalFields.filter((f) => f.status === 'mismatch').length,
        status: tempArrivalFields.some((f) => f.status === 'mismatch')
          ? 'mismatch'
          : activeArrivals.length === 0
            ? 'pending'
            : 'clean',
        existingRecords: activeArrivals,
      },
      {
        id: 'mill_inspection',
        title: `Mill Inspection (${activeInspections.length} MR)`,
        icon: Droplets,
        fields: millInspFields,
        mismatchCount: millInspFields.filter((f) => f.status === 'mismatch').length,
        status: millInspFields.some((f) => f.status === 'mismatch')
          ? 'mismatch'
          : activeInspections.length === 0
            ? 'pending'
            : 'clean',
        existingRecords: activeInspections,
      },
      {
        id: 'satta_price_mismatch',
        title: 'Satta Price Mismatch',
        icon: Coins,
        fields: saudaPriceFields,
        mismatchCount: saudaPriceFields.filter((f) => f.status === 'mismatch').length,
        status: saudaPriceFields.some((f) => f.status === 'mismatch') ? 'mismatch' : 'clean',
        existingRecords: priceMismatches,
      },
      {
        id: 'material_mismatch',
        title: 'Material Mismatch Board (Base Mode)',
        icon: ShieldAlert,
        fields: materialMismatchFields,
        mismatchCount: materialMismatchFields.filter((f) => f.status === 'mismatch').length,
        status: materialMismatchFields.some((f) => f.status === 'mismatch') ? 'mismatch' : 'clean',
        existingRecords: allMaterialMismatches,
      },
      {
        id: 'payment',
        title: `Payment Operations (${activePayments.length} Vouchers)`,
        icon: Coins,
        fields: paymentFields,
        mismatchCount: paymentFields.filter((f) => f.status === 'mismatch').length,
        status: paymentFields.some((f) => f.status === 'mismatch')
          ? 'mismatch'
          : activePayments.length === 0
            ? 'pending'
            : 'clean',
        existingRecords: activePayments,
      },
      {
        id: 'settlement',
        title: `Settlement & Final Audit (${activeSettlements.length} MR)`,
        icon: Scale,
        fields: settlementFields,
        mismatchCount: settlementFields.filter((f) => f.status === 'mismatch').length,
        status: settlementFields.some((f) => f.status === 'mismatch')
          ? 'mismatch'
          : activeSettlements.length === 0
            ? 'pending'
            : 'clean',
        existingRecords: activeSettlements,
      },
    ];

    const mrComparisons: MrComparisonData[] = linkedMrs.map((mrNo) => {
      const isRecordMatchMr = (rec: any) => {
        if (!rec) return false;
        const recMr = extractRecordMrNo(rec) || extractFinalArrivalMrNo(rec) || extractInspectionMrNo(rec);
        return Boolean(recMr && areMrNumbersEqual(recMr, mrNo));
      };
      const arr = dbArrivals.find(isRecordMatchMr) || {};
      const insp = dbInspections.find(isRecordMatchMr) || {};
      const sett = dbSettlements.find(isRecordMatchMr) || {};
      const pay = dbPayments.find(isRecordMatchMr) || {};
      return {
        mrNo,
        arrivalRecord: arr,
        inspectionRecord: insp,
        settlementRecord: sett,
        paymentRecord: pay,
        tempArrivalFields: [],
        millInspFields: [],
        mismatchCount: dbMismatches.filter(
          (m) => !isMaterialMismatchApproved(m) && areMrNumbersEqual(extractRecordMrNo(m), mrNo)
        ).length,
      };
    });

    const totalMismatches = sections.reduce((sum, s) => sum + s.mismatchCount, 0);
    const mismatchSections = sections.filter((s) => s.mismatchCount > 0).length;
    const totalPassedChecks = sections.reduce(
      (sum, s) => sum + s.fields.filter((f) => f.status === 'match').length,
      0
    );

    return {
      sections,
      summary: {
        totalSections: sections.length,
        mismatchSections,
        totalMismatches,
        totalPassedChecks,
        mrComparisons,
      },
    };
  }, [
    po,
    dbPoDetails,
    dbArrivals,
    dbInspections,
    dbPayments,
    dbSettlements,
    dbMismatches,
    dbSattaMismatches,
    dbSattaRate,
    linkedMrs,
    selectedMrTab,
  ]);

  const toggleSection = (id: string) => {
    setCollapsedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const scrollToSection = (id: string) => {
    if (activeTab !== 'compare') setActiveTab('compare');
    setTimeout(() => {
      const el = document.getElementById(`section-${id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setCollapsedSections((prev) => ({ ...prev, [id]: false }));
      }
    }, 30);
  };

  if (!isOpen || !po) return null;

  const poHeaderTop = getPoHeaderMetrics(po, dbPoDetails);
  const totalMismatchAuditCount = dbMismatches.length + dbSattaMismatches.length;

  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div
        className="bg-[#FDE7E6] border-2 border-[#FBCFCB] w-full max-w-[1600px] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-800 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. MODAL HEADER BANNER */}
        <div className="bg-gradient-to-r from-[#F7AFA8] via-[#D94B5A] to-[#F7AFA8] px-3 py-2 text-white flex flex-wrap items-center justify-between gap-2 border-b border-[#FBCFCB] shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-white/10 text-emerald-300 border border-white/10 shadow-xs">
              <BarChart3 className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-sm sm:text-base font-serif font-black tracking-wide text-white">
                  Histogram & Lifecycle Audit
                </h2>

                <span className="px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/40 text-[11px] font-mono font-bold">
                  {po.po_no}
                </span>

                {po.ptf_no && (
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-400/40 text-[9px] font-mono font-bold">
                    PTF: {po.ptf_no}
                  </span>
                )}
              </div>

              <p className="text-[10px] text-emerald-100/80 font-sans mt-0">
                Full-spectrum cross-stage data comparison & instant mismatch highlight across all 7 lifecycle stages
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="flex items-center bg-black/20 p-0.5 rounded-lg border border-white/10 text-[11px]">
              <button
                onClick={() => setActiveTab('compare')}
                className={cn(
                  'px-2 py-1 rounded-md font-bold transition-all cursor-pointer',
                  activeTab === 'compare'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-100 hover:text-white'
                )}
              >
                Compare & Highlight
              </button>

              <button
                onClick={() => setActiveTab('story')}
                className={cn(
                  'px-2 py-1 rounded-md font-bold transition-all cursor-pointer',
                  activeTab === 'story'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-100 hover:text-white'
                )}
              >
                7-Stage Story
              </button>

              <button
                onClick={() => setActiveTab('histogram')}
                className={cn(
                  'px-2 py-1 rounded-md font-bold transition-all cursor-pointer',
                  activeTab === 'histogram'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-100 hover:text-white'
                )}
              >
                Turnaround Timeline
              </button>

              <button
                onClick={() => setActiveTab('mismatch_audit')}
                className={cn(
                  'px-2 py-1 rounded-md font-bold transition-all cursor-pointer',
                  activeTab === 'mismatch_audit'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-100 hover:text-white'
                )}
              >
                Mismatch Board ({totalMismatchAuditCount})
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title="Close Popup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. TOP P.O. SUMMARY CARD & VISUAL ISSUE CHECKLIST */}
        <div className="bg-white border-b border-[#FBCFCB] px-3 py-2 shadow-2xs shrink-0 space-y-2">
          {/* Main Key-Value Metadata Grid */}
          <div className="bg-[#FDE7E6] border border-[#FBCFCB] rounded-lg px-2.5 py-1.5 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-x-2 gap-y-1.5 text-xs">
            <div>
              <span className="text-[9px] font-bold uppercase text-slate-400 block">P.O. No.:</span>
              <strong className="text-slate-900 font-mono text-[11px]">{poHeaderTop.poNo}</strong>
            </div>

            <div>
              <span className="text-[9px] font-bold uppercase text-slate-400 block">P.O. Date:</span>
              <strong className="text-slate-800 text-[11px]">{poHeaderTop.poDate}</strong>
            </div>

            <div>
              <span className="text-[9px] font-bold uppercase text-slate-400 block">Supplier:</span>
              <strong className="text-slate-800 truncate block text-[11px]" title={poHeaderTop.supplier}>
                {poHeaderTop.supplier}
              </strong>
            </div>

            <div>
              <span className="text-[9px] font-bold uppercase text-slate-400 block">Broker:</span>
              <strong className="text-slate-800 truncate block text-[11px]" title={poHeaderTop.broker}>
                {poHeaderTop.broker}
              </strong>
            </div>

            <div>
              <span className="text-[9px] font-bold uppercase text-slate-400 block">Contract Wt:</span>
              <strong className="text-emerald-800 font-mono font-black text-[11px]">
                {poHeaderTop.contractMt.toFixed(3)} MT ({poHeaderTop.lorries} Lorry)
              </strong>
            </div>

            <div>
              <span className="text-[9px] font-bold uppercase text-slate-400 block">Received Wt:</span>
              <strong className="text-slate-900 font-mono font-black text-[11px]">
                {topReceivedWeightMt.toFixed(3)} MT
              </strong>
            </div>

            <div>
              <span className="text-[9px] font-bold uppercase text-slate-400 block">Total M.R.s:</span>
              <strong className="text-blue-900 font-mono font-black text-[11px]">
                {linkedMrs.length} / {poHeaderTop.lorries} ({linkedMrs.join(', ') || 'None'})
              </strong>
            </div>
          </div>

          {/* Overall Issue Summary Ribbon & Jump Pills */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-1.5">
            {/* Summary Badges */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-700">Overall Check:</span>

              {comparisonResults.summary.totalMismatches > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-rose-100 border border-rose-300 text-rose-900 text-[10px] font-black inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                  <span>🔴 {comparisonResults.summary.totalMismatches} Issue(s)</span>
                </span>
              )}

              {comparisonResults.sections.some((s) => s.status === 'pending') && (
                <span className="px-2 py-0.5 rounded-md bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-black inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>
                    🟡 {comparisonResults.sections.filter((s) => s.status === 'pending').length} Warning / Pending
                  </span>
                </span>
              )}

              <span className="px-2 py-0.5 rounded-md bg-emerald-100 border border-emerald-300 text-emerald-900 text-[10px] font-black inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                <span>🟢 {comparisonResults.summary.totalPassedChecks} Checks Passed</span>
              </span>
            </div>

            {/* Quick Section Jump Pills */}
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[9px] font-bold uppercase text-slate-500 mr-0.5">Jump To:</span>

              {comparisonResults.sections.map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => scrollToSection(sec.id)}
                  className={cn(
                    'px-1.5 py-0.5 rounded-md text-[9px] font-bold border transition-all cursor-pointer flex items-center gap-0.5',
                    sec.mismatchCount > 0
                      ? 'bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200 shadow-2xs'
                      : sec.status === 'pending'
                        ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 shadow-2xs'
                  )}
                  title={`Click to jump to ${sec.title}`}
                >
                  {sec.mismatchCount > 0 ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                  ) : sec.status === 'pending' ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  )}

                  <span>{sec.title}</span>

                  {sec.mismatchCount > 0 && (
                    <span className="bg-rose-600 text-white px-1 rounded-full text-[8px] font-mono font-extrabold">
                      {sec.mismatchCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Mismatch Areas Ribbon if issues exist */}
          {comparisonResults.summary.totalMismatches > 0 && (
            <div className="pt-1.5 border-t border-dashed border-slate-200 flex items-center gap-1.5 flex-wrap text-[10px]">
              <span className="text-[9px] font-bold uppercase text-rose-700 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-rose-600" />
                <span>Immediate Attention:</span>
              </span>

              {comparisonResults.sections
                .filter((s) => s.mismatchCount > 0)
                .map((s) => (
                  <span
                    key={`ribbon-${s.id}`}
                    onClick={() => scrollToSection(s.id)}
                    className="bg-rose-50 text-rose-800 border border-rose-200 px-1.5 py-0.5 rounded-md font-medium cursor-pointer hover:bg-rose-100 transition-colors"
                  >
                    <strong>{s.title}</strong> →{' '}
                    {s.fields
                      .filter((f) => f.status === 'mismatch')
                      .map((f) => f.name)
                      .join(', ')}
                  </span>
                ))}
            </div>
          )}
        </div>

        {/* 3. MODAL CONTENT AREA (Scrollable) */}
        <div className="flex-1 p-3 sm:p-5 overflow-y-auto space-y-4">
          {loading ? (
            <div className="py-16 text-center text-slate-500 space-y-2">
              <RefreshCw className="w-8 h-8 text-emerald-700 animate-spin mx-auto" />
              <p className="font-bold text-sm">Cross-comparing all 7 lifecycle stages across linked MRs...</p>
              <p className="text-xs text-slate-400">
                Loading Sauda Check Point, Final Arrival, Mill Inspection, Satta Price, Material Mismatch, Payment, and Settlement records
              </p>
            </div>
          ) : activeTab === 'story' ? (
            <PoStoryTabView
              po={po}
              dbPoDetails={dbPoDetails}
              dbArrivals={dbArrivals}
              linkedMrs={linkedMrs}
              dbInspections={dbInspections}
              dbSattaRate={dbSattaRate}
              dbMismatches={dbMismatches}
              dbPayments={dbPayments}
              dbSettlements={dbSettlements}
            />
          ) : activeTab === 'histogram' ? (
            <PoHistogramTabView
              po={po}
              dbArrivals={dbArrivals}
              dbInspections={dbInspections}
              dbPayments={dbPayments}
              dbSettlements={dbSettlements}
            />
          ) : activeTab === 'mismatch_audit' ? (
            <PoMismatchAuditTabView
              dbMismatches={dbMismatches}
              dbSattaMismatches={dbSattaMismatches}
            />
          ) : (
            <PoComparisonTabView
              linkedMrs={linkedMrs}
              selectedMrTab={selectedMrTab}
              setSelectedMrTab={setSelectedMrTab}
              sections={comparisonResults.sections}
              collapsedSections={collapsedSections}
              toggleSection={toggleSection}
            />
          )}
        </div>

        {/* 4. MODAL FOOTER ACTION BAR */}
        <div className="bg-white border-t border-[#FBCFCB] px-2.5 py-1.5 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center text-[10px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
          </div>

          <div className="flex items-center gap-1.5">
            {onNavigateToMismatch && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateToMismatch(po.po_no);
                }}
                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs"
              >
                <AlertTriangle className="w-3 h-3 text-amber-700" />
                <span>Open Mismatch Board</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-3 py-1 bg-[#F7AFA8] hover:bg-[#152413] text-white rounded-lg text-[10px] font-bold transition-all shadow-xs cursor-pointer"
            >
              Done / Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
