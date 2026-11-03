import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Download,
  DollarSign,
  Briefcase,
  UserCheck,
  Clock,
  RefreshCcw,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { exportToCSV } from '../../utils/exportHelpers';
import { ReportFilterCriteria } from '../../services/systemReportEngine';

export type NewReportTab = 'outstanding_po' | 'mr_advance_eligible' | 'mr_apmc_details' | 'mr_delivery_claim';

interface NewCustomReportsViewProps {
  initialTab?: NewReportTab;
  filters?: ReportFilterCriteria;
}

import { parseDateObj, matchesFilters } from './newCustomReportsFilterService';

export const NewCustomReportsView: React.FC<NewCustomReportsViewProps> = ({ initialTab = 'mr_delivery_claim', filters }) => {
  const [activeSubReport, setActiveSubReport] = useState<NewReportTab>(initialTab);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Report 1: Outstanding PO State (Default: P.O Number Wise for POs not received in Temporary Arrival)
  const [poList, setPoList] = useState<any[]>([]);
  const [poGroupBy, setPoGroupBy] = useState<'all' | 'broker' | 'supplier' | 'area'>('all');

  // Report 2: MR Advance Eligible State
  const [advanceMrList, setAdvanceMrList] = useState<any[]>([]);

  // Report 3: MR APMC Details State
  const [apmcList, setApmcList] = useState<any[]>([]);

  // Report 4: MR Delivery Claim State
  const [deliveryClaimList, setDeliveryClaimList] = useState<any[]>([]);

  useEffect(() => {
    if (initialTab) {
      setActiveSubReport(initialTab);
    }
  }, [initialTab]);

  // Load report data from database
  const loadReportsData = async () => {
    setLoading(true);
    try {
      if (supabase) {
        const [
          poRes,
          faRes,
          mrSettRes,
          payMasterRes,
          saudaCpRes,
          tempArrRes,
          matInspRes,
          millInspRes,
          millInspDetailRes,
          matMismatchRes,
          sattaMismatchRes
        ] = await Promise.all([
          supabase.from('purchase_master').select('*').order('created_at', { ascending: false }),
          supabase.from('final_arrival').select('*').order('date', { ascending: false }),
          supabase.from('mr_settlement_master').select('*').order('created_at', { ascending: false }),
          supabase.from('payment_master').select('*').order('created_at', { ascending: false }),
          supabase.from('sauda_check_point').select('*').order('created_at', { ascending: false }),
          supabase.from('temporary_material_received').select('*').order('date', { ascending: false }),
          supabase.from('material_inspection').select('*').order('created_at', { ascending: false }),
          supabase.from('mill_inspection_master').select('*').order('created_at', { ascending: false }).then(r => r, () => ({ data: [] })),
          supabase.from('mill_inspection_detail').select('*').then(r => r, () => ({ data: [] })),
          supabase.from('material_mismatch').select('*').then(r => r, () => ({ data: [] })),
          supabase.from('satta_mismatch').select('*').then(r => r, () => ({ data: [] }))
        ]);

        const rawPos = poRes.data || [];
        const rawFa = faRes.data || [];
        const rawSettlements = mrSettRes.data || [];
        const rawPayments = payMasterRes.data || [];
        const rawCheckpoints = saudaCpRes.data || [];
        const rawTempArrivals = tempArrRes.data || [];
        const rawMatInsp = [...(matInspRes.data || []), ...((millInspRes as any)?.data || [])];
        const rawMillInspDetails = (millInspDetailRes as any)?.data || [];
        const rawMatMismatches = (matMismatchRes as any)?.data || [];
        const rawSattaMismatches = (sattaMismatchRes as any)?.data || [];

        const cleanPoKey = (s: any) =>
          String(s || '')
            .trim()
            .replace(/^#+/, '')
            .replace(/\(PTF\)/gi, '')
            .trim()
            .toUpperCase();

        const cleanLorryKey = (s: any) =>
          String(s || '')
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '');

        const extractCoreDigits = (s: any) => {
          const raw = String(s || '').trim().toUpperCase();
          const withoutPrefix = raw
            .replace(/^(MR|AR|AMAD|TEMP|FA|BJCL)[-\/\s]*/i, '')
            .replace(/^20\d{2}-20\d{2}\//, '');
          return withoutPrefix.replace(/[^0-9]/g, '').replace(/^0+/, '');
        };

        const toMillInspectionMrNo = (rawVal: any): string => {
          const s = String(rawVal || '').trim();
          if (!s) return '';
          if (/^AR[-\/\s0-9]/i.test(s)) {
            return s.replace(/^AR/i, 'MR');
          }
          return s;
        };

        // =========================================================================
        // 1. Process Outstanding P.O List (P.Os NOT Received in Temporary Arrival)
        // =========================================================================
        const tempArrPoSet = new Set<string>();
        rawTempArrivals.forEach((tmr: any) => {
          const candidates = [tmr.po_no, tmr.mill_po_no, tmr.sauda_no, tmr.contract_po_no]
            .map(cleanPoKey)
            .filter(k => k && k !== 'N/A' && k !== 'NO' && k !== 'NONE');
          candidates.forEach(poKey => {
            tempArrPoSet.add(poKey);
            const suffix = poKey.split('/').pop()?.trim() || '';
            if (suffix.length >= 3) {
              tempArrPoSet.add(`SUFFIX_${suffix}`);
            }
          });
        });

        const isPoReceivedInTempArrival = (poNoStr: string): boolean => {
          const key = cleanPoKey(poNoStr);
          if (!key) return false;
          if (tempArrPoSet.has(key)) return true;
          const suffix = key.split('/').pop()?.trim() || '';
          if (suffix.length >= 3 && tempArrPoSet.has(`SUFFIX_${suffix}`)) return true;
          return false;
        };

        const combinedPoList: any[] = [];
        const seenPoKeys = new Set<string>();

        const registerUnreceivedPo = (rec: any, isCheckpoint = false) => {
          const statusLower = String(rec.status || '').toLowerCase().trim();
          if (statusLower === 'cancelled' || statusLower === 'rejected') return;

          const rawPoNo = String(rec.po_no || rec.po_number || (isCheckpoint ? rec.session : '') || '').trim();
          const poKey = cleanPoKey(rawPoNo);
          if (!poKey || poKey === 'N/A' || seenPoKeys.has(poKey)) return;

          // Exclude if already received in Temporary Arrival
          if (isPoReceivedInTempArrival(rawPoNo)) return;

          seenPoKeys.add(poKey);
          const totalQty =
            Number(rec.total_qty_mt) ||
            Number(rec.quantity_mt) ||
            Number(rec.qty_mt) ||
            Number(rec.total_wt_in_ton) ||
            Number(rec.quantity) ||
            0;
          const rate =
            Number(rec.rate_qntl) ||
            Number(rec.b_rate) ||
            Number(rec.rate_mt) ||
            Number(rec.rate) ||
            0;
          const pendingValue = totalQty * (rate > 2000 ? rate * 10 : rate);

          combinedPoList.push({
            poNo: rawPoNo.toUpperCase(),
            poDate: String(rec.po_date || rec.date || rec.s_date || rec.created_at || '').split('T')[0],
            supplier: String(rec.supplier || rec.supplier_name || 'UNKNOWN SUPPLIER').toUpperCase().trim(),
            broker: String(rec.broker || rec.broker_name || 'DIRECT').toUpperCase().trim(),
            area: String(rec.area || rec.agency || 'MAIN AREA').toUpperCase().trim(),
            agency: String(rec.agency || '-').toUpperCase().trim(),
            totalQty,
            rcvdQty: 0,
            pendingQty: totalQty,
            rate,
            pendingValue,
            status: 'NOT RECEIVED IN TEMP ARRIVAL'
          });
        };

        rawPos.forEach((po: any) => registerUnreceivedPo(po, false));
        rawCheckpoints.forEach((cp: any) => registerUnreceivedPo(cp, true));

        setPoList(combinedPoList);

        // =========================================================================
        // 2. Process MR Eligible for Advance (From Mill Inspection Section)
        //    - Source: Inspection Section (material_inspection / mill_inspection_master)
        //    - Mismatch Condition: Either NO Mismatch against that MR/PO, OR Mismatch Cleared by Level 4 User
        //    - Advance Condition: Advance NOT Paid yet
        // =========================================================================
        // Build lookup map of POs from purchase_master and sauda_check_point
        const allPoLookup = new Map<string, any>();
        [...rawPos, ...rawCheckpoints].forEach((p: any) => {
          const k = cleanPoKey(p.po_no || p.po_number || p.contract_po_no || p.sauda_no);
          if (k) {
            const existing = allPoLookup.get(k) || {};
            allPoLookup.set(k, { ...existing, ...p });
            const suffix = k.split('/').pop()?.trim() || '';
            if (suffix.length >= 3 && !allPoLookup.has(`SUFFIX_${suffix}`)) {
              allPoLookup.set(`SUFFIX_${suffix}`, { ...existing, ...p });
            }
          }
        });

        // Build detail weight sum per MR from mill_inspection_detail
        const inspDetailWtByMr = new Map<string, number>();
        rawMillInspDetails.forEach((d: any) => {
          const mrKey = String(d.mr_no || '').trim().toUpperCase();
          if (!mrKey) return;
          const wtRaw = Number(d.receipt_gross_wt || d.challan_gross_wt || d.weight_mt || 0);
          if (wtRaw > 0) {
            const wtMt = wtRaw > 500 ? wtRaw / 1000 : wtRaw > 50 ? wtRaw / 10 : wtRaw;
            inspDetailWtByMr.set(mrKey, (inspDetailWtByMr.get(mrKey) || 0) + wtMt);
          }
        });

        // Deduplicate Mill Inspections by MR No
        const uniqueInspMap = new Map<string, any>();
        rawMatInsp.forEach((insp: any) => {
          const rawMr = String(insp.mr_no || insp.arrival_no || '').trim();
          if (!rawMr) return;
          const mrFormatted = toMillInspectionMrNo(rawMr);
          const core = extractCoreDigits(mrFormatted);
          const mapKey = core ? `CORE_${core}` : mrFormatted.toUpperCase();
          const existing = uniqueInspMap.get(mapKey);
          if (!existing || String(insp.mr_no || '').toUpperCase().startsWith('MR')) {
            uniqueInspMap.set(mapKey, { ...existing, ...insp, resolvedMrNo: mrFormatted });
          }
        });

        const advanceMrRecords: any[] = [];

        uniqueInspMap.forEach((insp: any) => {
          const mrNo = String(insp.resolvedMrNo || insp.mr_no || '').trim();
          if (!mrNo) return;
          const mrDigits = extractCoreDigits(mrNo);

          // Match Final Arrival & Temporary Arrival for supplementary fields (PO No, Weight, Rate)
          const matchedFa = rawFa.find((f: any) => {
            if (String(f.mr_no || '').trim().toUpperCase() === mrNo.toUpperCase()) return true;
            if (insp.arrival_no && String(f.final_arrival_no || f.arrival_no || f.temporary_arrival_no || '').trim().toUpperCase() === String(insp.arrival_no).trim().toUpperCase()) return true;
            if (mrDigits && extractCoreDigits(f.mr_no || f.final_arrival_no || f.arrival_no) === mrDigits) return true;
            return false;
          });

          const matchedTmr = rawTempArrivals.find((t: any) => {
            const tNo = String(t.temporary_arrival_no || t.amad_no || t.arrival_no || '').trim();
            if (insp.arrival_no && tNo.toUpperCase() === String(insp.arrival_no).trim().toUpperCase()) return true;
            if (mrDigits && extractCoreDigits(tNo || t.mr_no) === mrDigits) return true;
            return false;
          });

          // Check mr_settlement_master early so we can also resolve PO number if linked there
          const matchedSett = rawSettlements.find((s: any) => {
            const sMr = String(s.mr_no || s.arrival_no || '').trim().toUpperCase();
            if (!sMr) return false;
            if (sMr === mrNo.toUpperCase()) return true;
            if (mrDigits && extractCoreDigits(sMr) === mrDigits) return true;
            return false;
          });

          const candidatePoValues = [
            insp.po_no,
            insp.mill_po_no,
            insp.contract_po_no,
            insp.sauda_no,
            matchedFa?.po_no,
            matchedFa?.sauda_no,
            matchedTmr?.po_no,
            matchedTmr?.sauda_no,
            matchedSett?.po_no
          ];

          const isInvalidPoValue = (val: any): boolean => {
            const s = String(val || '').trim().toUpperCase();
            return (
              !s ||
              s === '-' ||
              s === '--' ||
              s === 'N/A' ||
              s === 'NA' ||
              s === 'NO' ||
              s === 'NONE' ||
              s === 'NULL' ||
              s === 'UNDEFINED' ||
              s === 'WITHOUT PO' ||
              s === 'PENDING'
            );
          };

          const validRawPo = candidatePoValues.find((v) => !isInvalidPoValue(v));
          const rawPoNo = String(validRawPo || '').trim();
          const poKey = cleanPoKey(rawPoNo);
          const poSuffix = poKey.split('/').pop()?.trim() || '';
          const poRec =
            (poKey ? allPoLookup.get(poKey) : undefined) ||
            (poSuffix.length >= 3 ? allPoLookup.get(`SUFFIX_${poSuffix}`) : undefined);

          const resolvedPoNo = String(rawPoNo || poRec?.po_no || poRec?.po_number || '').trim();

          // Rule: If MR has NO PO Number, it is NOT eligible for Advance Payment
          if (isInvalidPoValue(resolvedPoNo) || !poKey) {
            return;
          }

          // 1. Check Mismatch Status against this MR or PO
          const matchedMatMm = rawMatMismatches.filter((m: any) => {
            const mPo = cleanPoKey(m.po_no);
            const mInsp = String(m.inspection_no || m.mr_no || m.arrival_no || '').trim().toUpperCase();
            if (poKey && mPo && (mPo === poKey || (poSuffix.length >= 3 && mPo.endsWith(poSuffix)))) return true;
            if (mInsp && (mInsp === mrNo.toUpperCase() || (mrDigits && extractCoreDigits(mInsp) === mrDigits))) return true;
            return false;
          });

          const matchedSattaMm = rawSattaMismatches.filter((sm: any) => {
            const smPo = cleanPoKey(sm.po_no || sm.sauda_no);
            if (poKey && smPo && (smPo === poKey || (poSuffix.length >= 3 && smPo.endsWith(poSuffix)))) return true;
            return false;
          });

          const isRowCleared = (m: any) => {
            const st = String(m.status || m.resolution_status || '').toLowerCase().trim();
            return (
              st === 'resolved' ||
              st === 'approved' ||
              st === 'cleared' ||
              Boolean(m.approved_by) ||
              String(m.remarks || '').toLowerCase().includes('approved') ||
              String(m.remarks || '').toLowerCase().includes('resolved')
            );
          };

          const poExplicitCleared = Boolean(
            poRec?.mismatch_cleared === true ||
            String(poRec?.mismatch_cleared) === 'true' ||
            poRec?.satta_dispute_approved === true ||
            String(poRec?.satta_dispute_approved) === 'true' ||
            (poKey && typeof window !== 'undefined' && (
              localStorage.getItem(`material_resolved_${poKey}`) ||
              localStorage.getItem(`mismatch_cleared_${poKey}`) ||
              localStorage.getItem(`satta_resolved_${poKey}`) ||
              (poSuffix && localStorage.getItem(`material_resolved_${poSuffix}`)) ||
              (poSuffix && localStorage.getItem(`mismatch_cleared_${poSuffix}`))
            ))
          );

          const hasAnyMismatchRecord =
            matchedMatMm.length > 0 ||
            matchedSattaMm.length > 0 ||
            String(poRec?.pass_status || poRec?.pass_mismatch || '').toLowerCase() === 'mismatch' ||
            String(poRec?.status || '').toLowerCase() === 'mismatch';

          const hasUnresolvedMatMm = matchedMatMm.some((m: any) => !isRowCleared(m) && !poExplicitCleared);
          const hasUnresolvedSattaMm = matchedSattaMm.some((sm: any) => !isRowCleared(sm) && !poExplicitCleared);
          const hasUnresolvedPoFlag =
            !poExplicitCleared &&
            matchedMatMm.length === 0 &&
            matchedSattaMm.length === 0 &&
            (String(poRec?.pass_status || poRec?.pass_mismatch || '').toLowerCase() === 'mismatch' ||
              String(poRec?.status || '').toLowerCase() === 'mismatch');

          // If there is an unresolved mismatch, this MR is NOT eligible for advance
          if (hasUnresolvedMatMm || hasUnresolvedSattaMm || hasUnresolvedPoFlag) {
            return;
          }

          const mismatchStatusLabel = hasAnyMismatchRecord
            ? 'Mismatch Cleared (Level 4)'
            : 'No Mismatch';

          // 2. Check Advance Not Paid Condition
          // Check payment_master
          const matchedPayment = rawPayments.find((p: any) => {
            const pStatus = String(p.status || '').toLowerCase().trim();
            if (pStatus === 'cancelled' || pStatus === 'rejected') return false;
            const pMr = String(p.mr_no || p.arrival_no || '').trim().toUpperCase();
            if (!pMr) return false;
            if (pMr === mrNo.toUpperCase()) return true;
            if (insp.arrival_no && pMr === String(insp.arrival_no).trim().toUpperCase()) return true;
            if (mrDigits && extractCoreDigits(pMr) === mrDigits) return true;
            return false;
          });

          const paidFromPayment = matchedPayment
            ? (Number(matchedPayment.paid_amount) || Number(matchedPayment.total_amount) || Number(matchedPayment.payable_amt) || 1)
            : 0;
          const paidFromSett = matchedSett
            ? (Number(matchedSett.final_on_ac_adv) || Number(matchedSett.less_advance_amount) || 0)
            : 0;
          const paidFromInsp = Number(insp.advance_amount) || Number(insp.on_account_advance_amount) || 0;

          const totalAlreadyPaid = paidFromPayment + paidFromSett + paidFromInsp;

          // Only include MRs where Advance is NOT Paid yet
          if (totalAlreadyPaid > 0) {
            return;
          }

          // 3. Calculate Inspected / Arrival Weight & Eligible Advance
          let arrWtMt =
            inspDetailWtByMr.get(mrNo.toUpperCase()) ||
            Number(matchedFa?.supplier_net_weight) ||
            Number(matchedFa?.electronic_net_weight) ||
            Number(matchedFa?.challan_material_weight) ||
            (Number(matchedFa?.weight_qtl) ? Number(matchedFa.weight_qtl) / 10 : 0) ||
            Number(matchedTmr?.supplier_net_weight) ||
            Number(matchedTmr?.electronic_net_weight) ||
            Number(matchedTmr?.challan_material_weight) ||
            (Number(matchedTmr?.weight_qtl) ? Number(matchedTmr.weight_qtl) / 10 : 0) ||
            0;

          if (arrWtMt > 500) arrWtMt = Number((arrWtMt / 1000).toFixed(2));
          else if (arrWtMt > 50) arrWtMt = Number((arrWtMt / 10).toFixed(2));

          const arrWtQtl = arrWtMt * 10;
          const rawRate =
            Number(poRec?.b_rate) ||
            Number(poRec?.rate_qntl) ||
            Number(poRec?.rate) ||
            Number(matchedFa?.rate_value) ||
            12000;
          const rateQtl = rawRate > 50000 ? rawRate / 10 : rawRate;
          const materialValue =
            Number(insp.settlement_amount) > 0
              ? Number(insp.settlement_amount)
              : Math.round(arrWtQtl * rateQtl);

          const eligibleAdvancePct = 90;
          const eligibleAdvanceAmt = Math.round((materialValue * eligibleAdvancePct) / 100);

          advanceMrRecords.push({
            mrNo,
            arrivalDate: String(
              insp.mr_date ||
              insp.arrival_date ||
              insp.unloading_date ||
              matchedFa?.date ||
              matchedTmr?.date ||
              insp.created_at ||
              ''
            ).split('T')[0],
            poNo: resolvedPoNo,
            supplier: String(
              insp.supplier_name ||
              insp.supplier ||
              matchedFa?.supplier ||
              matchedTmr?.supplier ||
              poRec?.supplier ||
              'UNKNOWN SUPPLIER'
            ).toUpperCase().trim(),
            broker: String(
              insp.broker_name ||
              insp.broker ||
              matchedFa?.broker ||
              matchedTmr?.broker ||
              poRec?.broker ||
              'DIRECT'
            ).toUpperCase().trim(),
            lorryNumber: String(
              insp.lorry_number ||
              insp.lorry_no ||
              matchedFa?.lorry_number ||
              matchedTmr?.lorry_number ||
              '-'
            ).toUpperCase().trim(),
            arrWtMt,
            arrWtQtl,
            materialValue,
            eligibleAdvancePct,
            eligibleAdvanceAmt,
            paidAdvanceAmt: 0,
            pendingAdvancePayable: eligibleAdvanceAmt,
            mismatchStatus: mismatchStatusLabel,
            advanceStatus: 'ELIGIBLE (ADVANCE UNPAID)'
          });
        });

        setAdvanceMrList(advanceMrRecords);

        // =========================================================================
        // 3. Process MR Wise APMC Details
        // =========================================================================
        const apmcRecords: any[] = [];
        rawSettlements.forEach((s: any) => {
          const mrNo = toMillInspectionMrNo(s.mr_no);
          if (!mrNo) return;
          const fa = rawFa.find((f: any) => f.mr_no === s.mr_no || f.final_arrival_no === s.mr_no) || {};

          const matVal = Number(s.val_material_value || s.summary_material_value) || 0;
          const challanApmc = Number(s.arival_apmc_fees) || Number(fa.arival_apmc_fees) || Number(fa.apmc_fees) || 0;
          const actualApmc = Number(s.actual_apmc_fees) > 0 ? Number(s.actual_apmc_fees) : Math.round(matVal * 0.01);
          const apmcDiff = Number(s.final_apmc_fees) > 0 ? Number(s.final_apmc_fees) : Math.max(0, actualApmc - challanApmc);

          apmcRecords.push({
            mrNo,
            settDate: String(s.sett_date || s.mr_date || s.created_at || '').split('T')[0],
            poNo: s.po_no || fa.po_no || '-',
            supplier: String(s.supplier || fa.supplier || 'UNKNOWN').toUpperCase().trim(),
            broker: String(s.broker || fa.broker || 'DIRECT').toUpperCase().trim(),
            materialValue: matVal,
            challanApmc,
            actualApmc,
            apmcDiff
          });
        });
        setApmcList(apmcRecords);

        // =========================================================================
        // 4. Process MR Wise Delivery Claim (Sauda Check Point -> Temporary Arrival)
        // =========================================================================
        const poDeliveryMap = new Map<string, {
          poNo: string;
          poDate: string;
          deliveryFrom: string;
          deliveryTo: string;
          graceDays: number;
          deliveryPenaltyRate: number;
          supplier: string;
          broker: string;
        }>();

        rawPos.forEach((po: any) => {
          const key = cleanPoKey(po.po_no || po.po_number);
          if (!key) return;
          poDeliveryMap.set(key, {
            poNo: String(po.po_no || po.po_number || key).trim(),
            poDate: String(po.po_date || po.date || po.s_date || '').split('T')[0],
            deliveryFrom: String(po.delivery_from || po.delivery_gt_from || '').split('T')[0],
            deliveryTo: String(po.delivery_to || po.delivery_gt_to || po.shipment_date || po.delivery_to_date || '').split('T')[0],
            graceDays: Number(po.grace_days || 0),
            deliveryPenaltyRate: Number(po.delivery_penalty || po.shipment_penalty || 0),
            supplier: String(po.supplier || po.supplier_name || '').toUpperCase().trim(),
            broker: String(po.broker || po.broker_name || '').toUpperCase().trim()
          });
        });

        rawCheckpoints.forEach((cp: any) => {
          const keys = [cp.po_no, cp.ptf_no, cp.sauda_no, cp.contract_po_no].map(cleanPoKey).filter(Boolean);
          if (keys.length === 0) return;
          const primaryKey = keys[0];
          const existing = poDeliveryMap.get(primaryKey);

          const entry = {
            poNo: String(cp.po_no || existing?.poNo || primaryKey).trim(),
            poDate: String(cp.po_date || cp.date || cp.s_date || existing?.poDate || '').split('T')[0],
            deliveryFrom: String(cp.delivery_from || cp.delivery_gt_from || existing?.deliveryFrom || '').split('T')[0],
            deliveryTo: String(cp.delivery_to || cp.delivery_gt_to || cp.shipment_date || cp.delivery_to_date || existing?.deliveryTo || '').split('T')[0],
            graceDays: Number(cp.grace_days ?? existing?.graceDays ?? 0),
            deliveryPenaltyRate: Number(cp.delivery_penalty || cp.shipment_penalty || existing?.deliveryPenaltyRate || 0),
            supplier: String(cp.supplier || cp.supplier_name || existing?.supplier || '').toUpperCase().trim(),
            broker: String(cp.broker || cp.broker_name || existing?.broker || '').toUpperCase().trim()
          };

          keys.forEach(k => poDeliveryMap.set(k, entry));
        });

        const calcDelayDays = (deliveryToStr?: string, arrivalDateStr?: string): number => {
          if (!deliveryToStr || !arrivalDateStr) return 0;
          const due = parseDateObj(deliveryToStr);
          const arr = parseDateObj(arrivalDateStr);
          if (!due || !arr) return 0;
          due.setHours(0, 0, 0, 0);
          arr.setHours(0, 0, 0, 0);
          const diffMs = arr.getTime() - due.getTime();
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          return diffDays > 0 ? diffDays : 0;
        };

        const getArrivalWeightQtl = (...records: any[]): number => {
          for (const rec of records) {
            if (!rec) continue;
            const qtl = Number(rec.weight_qtl || 0);
            if (qtl > 0) return Number(qtl.toFixed(2));
            const rawWt = Number(
              rec.electronic_net_weight ||
              rec.supplier_net_weight ||
              rec.challan_material_weight ||
              rec.electronic_scale_net ||
              rec.challan_weight ||
              rec.supplier_net_wt ||
              ((Number(rec.actual_gross_weight) || 0) - (Number(rec.actual_tare_weight) || 0)) ||
              0
            );
            if (rawWt > 0) {
              if (rawWt > 500) return Number((rawWt / 100).toFixed(2));
              if (rawWt <= 50) return Number((rawWt * 10).toFixed(2));
              return Number(rawWt.toFixed(2));
            }
          }
          return 0;
        };

        const deliveryClaimRecords: any[] = [];
        const seenDeliveryKeys = new Set<string>();

        const registerDeliveryClaimCandidate = (params: {
          tmr?: any;
          fa?: any;
          mi?: any;
          sett?: any;
        }) => {
          const { tmr, fa, mi, sett } = params;
          const isMrSeries = (v: any) => Boolean(v && String(v).trim().toUpperCase().startsWith('MR'));

          const rawMrCandidates = [mi?.mr_no, sett?.mr_no, fa?.mr_no, tmr?.mr_no];
          const mrSeriesMatch = rawMrCandidates.find(isMrSeries);
          const tempArrivalNo = String(
            tmr?.temporary_arrival_no ||
            tmr?.amad_no ||
            tmr?.arrival_no ||
            fa?.temporary_arrival_no ||
            fa?.arrival_no ||
            fa?.final_arrival_no ||
            mi?.arrival_no ||
            sett?.arrival_no ||
            ''
          ).trim();

          let resolvedMrNo = String(mrSeriesMatch || mi?.mr_no || sett?.mr_no || fa?.mr_no || tempArrivalNo || '').trim();
          if (!resolvedMrNo) return;

          // Match against Mill Inspection / Settlement by core digits if not already MR series
          const coreDigits = extractCoreDigits(resolvedMrNo);
          if (!isMrSeries(resolvedMrNo) && coreDigits) {
            const matchedInsp = rawMatInsp.find((m: any) => isMrSeries(m.mr_no) && extractCoreDigits(m.mr_no) === coreDigits);
            const matchedSett = rawSettlements.find((s: any) => isMrSeries(s.mr_no) && extractCoreDigits(s.mr_no) === coreDigits);
            if (matchedInsp?.mr_no) resolvedMrNo = matchedInsp.mr_no;
            else if (matchedSett?.mr_no) resolvedMrNo = matchedSett.mr_no;
          }

          // Convert any remaining AR prefix to Mill Inspection Number (MR prefix)
          resolvedMrNo = toMillInspectionMrNo(resolvedMrNo);

          const dedupKey = coreDigits ? `CORE_${coreDigits}` : resolvedMrNo.toUpperCase();
          if (seenDeliveryKeys.has(dedupKey)) return;

          const rawPoNo = String(
            tmr?.po_no ||
            fa?.po_no ||
            mi?.po_no ||
            sett?.po_no ||
            ''
          ).trim();
          const poKey = cleanPoKey(rawPoNo);
          const poInfo = poKey ? poDeliveryMap.get(poKey) : undefined;

          const tempArrivalDate = String(
            tmr?.date ||
            tmr?.arrival_date ||
            fa?.date ||
            fa?.arrival_date ||
            mi?.arrival_date ||
            sett?.arrival_date ||
            sett?.mr_date ||
            ''
          ).split('T')[0];

          const deliveryToDate = String(
            poInfo?.deliveryTo ||
            fa?.delivery_to ||
            mi?.delivery_to ||
            ''
          ).split('T')[0];

          const poDate = String(
            poInfo?.poDate ||
            fa?.po_date ||
            mi?.po_date ||
            sett?.po_date ||
            ''
          ).split('T')[0];

          const penaltyRate = Number(poInfo?.deliveryPenaltyRate || 0);
          const weightQtl = getArrivalWeightQtl(tmr, fa, mi, sett);

          let detentionDays = calcDelayDays(deliveryToDate, tempArrivalDate);
          if (detentionDays === 0 && !deliveryToDate) {
            detentionDays = Number(sett?.detention_days || fa?.detention_days || mi?.detention_days || 0);
          }

          const calculatedClaimAmt = (detentionDays > 0 && penaltyRate > 0 && weightQtl > 0)
            ? Math.round(weightQtl * penaltyRate * detentionDays)
            : 0;

          const explicitSavedClaim = (
            sett?.summary_delivery_claim &&
            Number(sett.summary_delivery_claim) > 0 &&
            Number(sett.summary_delivery_claim) !== 5550
          ) ? Number(sett.summary_delivery_claim) : 0;

          const claimAmt = calculatedClaimAmt > 0
            ? calculatedClaimAmt
            : (detentionDays > 0 ? explicitSavedClaim : 0);

          if (claimAmt > 0 && detentionDays > 0) {
            seenDeliveryKeys.add(dedupKey);
            const supplierName = String(
              poInfo?.supplier ||
              tmr?.supplier ||
              tmr?.challan_supplier ||
              fa?.supplier ||
              mi?.supplier_name ||
              sett?.supplier ||
              'UNKNOWN'
            ).toUpperCase().trim();

            const brokerName = String(
              poInfo?.broker ||
              tmr?.broker ||
              fa?.broker ||
              mi?.broker_name ||
              sett?.broker ||
              'DIRECT'
            ).toUpperCase().trim();

            const calcBreakdown = (weightQtl > 0 && penaltyRate > 0)
              ? `Due: ${deliveryToDate || '-'} → Temp Arr: ${tempArrivalDate || '-'} (${weightQtl} Qtl × ${detentionDays}d × ₹${penaltyRate})`
              : `Due: ${deliveryToDate || '-'} → Temp Arr: ${tempArrivalDate || '-'}`;

            deliveryClaimRecords.push({
              mrNo: resolvedMrNo,
              tempArrivalNo: tempArrivalNo || resolvedMrNo,
              mrDate: tempArrivalDate,
              poNo: poInfo?.poNo || rawPoNo || '-',
              poDate: poDate,
              deliveryToDate: deliveryToDate,
              arrivalDate: tempArrivalDate,
              supplier: supplierName,
              broker: brokerName,
              weightQtl,
              penaltyRate,
              detentionDays,
              claimAmt,
              remarks: calcBreakdown
            });
          }
        };

        rawTempArrivals.forEach((tmr: any) => {
          const tempNo = String(tmr.temporary_arrival_no || tmr.amad_no || tmr.arrival_no || '').trim();
          const tmrDigits = extractCoreDigits(tempNo || tmr.mr_no);
          const tmrPo = cleanPoKey(tmr.po_no);
          const tmrLorry = cleanLorryKey(tmr.lorry_number || tmr.lorry_no || tmr.vehicle_no);

          const matchedFa = rawFa.find((f: any) => {
            const fTemp = String(f.temporary_arrival_no || f.arrival_no || f.final_arrival_no || '').trim();
            if (tempNo && fTemp.toUpperCase() === tempNo.toUpperCase()) return true;
            if (tmrDigits && extractCoreDigits(f.mr_no || fTemp) === tmrDigits) return true;
            if (tmrPo && tmrLorry.length >= 4 && cleanPoKey(f.po_no) === tmrPo && cleanLorryKey(f.lorry_number || f.lorry_no) === tmrLorry) return true;
            return false;
          });

          const matchedMi = rawMatInsp.find((m: any) => {
            const mArr = String(m.arrival_no || m.ref_arrival_no || '').trim();
            if (tempNo && mArr.toUpperCase() === tempNo.toUpperCase()) return true;
            if (tmrDigits && extractCoreDigits(m.mr_no || mArr) === tmrDigits) return true;
            if (tmrPo && tmrLorry.length >= 4 && cleanPoKey(m.po_no) === tmrPo && cleanLorryKey(m.lorry_number || m.lorry_no) === tmrLorry) return true;
            return false;
          });

          const matchedSett = rawSettlements.find((s: any) => {
            const sArr = String(s.arrival_no || '').trim();
            if (tempNo && sArr.toUpperCase() === tempNo.toUpperCase()) return true;
            if (tmrDigits && extractCoreDigits(s.mr_no || sArr) === tmrDigits) return true;
            if (tmrPo && tmrLorry.length >= 4 && cleanPoKey(s.po_no) === tmrPo && cleanLorryKey(s.lorry_number) === tmrLorry) return true;
            return false;
          });

          registerDeliveryClaimCandidate({ tmr, fa: matchedFa, mi: matchedMi, sett: matchedSett });
        });

        rawFa.forEach((fa: any) => {
          const faDigits = extractCoreDigits(fa.mr_no || fa.final_arrival_no || fa.arrival_no);
          const matchedMi = rawMatInsp.find((m: any) => faDigits && extractCoreDigits(m.mr_no || m.arrival_no) === faDigits);
          const matchedSett = rawSettlements.find((s: any) => faDigits && extractCoreDigits(s.mr_no || s.arrival_no) === faDigits);
          registerDeliveryClaimCandidate({ fa, mi: matchedMi, sett: matchedSett });
        });

        rawSettlements.forEach((sett: any) => {
          registerDeliveryClaimCandidate({ sett });
        });

        setDeliveryClaimList(deliveryClaimRecords);
      }
    } catch (err) {
      console.error('Failed to load custom reports data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportsData();
  }, []);

  // Filter Outstanding PO Records (POs Not Received in Temporary Arrival)
  const filteredPoList = useMemo(() => {
    return poList.filter(po => {
      return matchesFilters(po.poDate, po.supplier, po.broker, po.area, po.agency, po.poNo, undefined, filters, searchQuery);
    });
  }, [poList, searchQuery, filters]);

  // Grouped Outstanding POs (Broker / Party / Area Wise)
  const groupedPoSummary = useMemo(() => {
    const map: Record<string, {
      key: string;
      totalPoCount: number;
      totalQty: number;
      pendingQty: number;
      pendingValue: number;
      poNumbers: string[];
    }> = {};

    filteredPoList.forEach(item => {
      const keyVal = poGroupBy === 'broker' ? item.broker : poGroupBy === 'supplier' ? item.supplier : poGroupBy === 'area' ? item.area : item.poNo;
      if (!map[keyVal]) {
        map[keyVal] = { key: keyVal, totalPoCount: 0, totalQty: 0, pendingQty: 0, pendingValue: 0, poNumbers: [] };
      }
      map[keyVal].totalPoCount += 1;
      map[keyVal].totalQty += item.totalQty;
      map[keyVal].pendingQty += item.pendingQty;
      map[keyVal].pendingValue += item.pendingValue;
      if (item.poNo && !map[keyVal].poNumbers.includes(item.poNo)) {
        map[keyVal].poNumbers.push(item.poNo);
      }
    });

    return Object.values(map).sort((a, b) => b.pendingQty - a.pendingQty);
  }, [filteredPoList, poGroupBy]);

  // Filter Advance Eligible MR List
  const filteredAdvanceMrList = useMemo(() => {
    return advanceMrList.filter(item => {
      return matchesFilters(item.arrivalDate, item.supplier, item.broker, undefined, undefined, item.poNo, item.mrNo, filters, searchQuery);
    });
  }, [advanceMrList, searchQuery, filters]);

  // Filter APMC Details List
  const filteredApmcList = useMemo(() => {
    return apmcList.filter(item => {
      return matchesFilters(item.settDate, item.supplier, item.broker, undefined, undefined, item.poNo, item.mrNo, filters, searchQuery);
    });
  }, [apmcList, searchQuery, filters]);

  // Filter Delivery Claim List (Only show records with claimAmt > 0 and detentionDays > 0)
  const filteredDeliveryClaimList = useMemo(() => {
    return deliveryClaimList.filter(item => {
      if (!(item.claimAmt > 0 && item.detentionDays > 0)) return false;
      return matchesFilters(item.arrivalDate || item.mrDate || item.poDate, item.supplier, item.broker, undefined, undefined, item.poNo, item.mrNo, filters, searchQuery);
    });
  }, [deliveryClaimList, searchQuery, filters]);

  // Average Detention / Delay Days for Delivery Claim Report
  const avgDetentionDays = useMemo(() => {
    if (filteredDeliveryClaimList.length === 0) return '0';
    const totalDays = filteredDeliveryClaimList.reduce((acc, cur) => acc + cur.detentionDays, 0);
    const avg = totalDays / filteredDeliveryClaimList.length;
    return Number.isInteger(avg) ? String(avg) : avg.toFixed(1);
  }, [filteredDeliveryClaimList]);

  // CSV Export for active report
  const handleExportCSV = () => {
    if (activeSubReport === 'outstanding_po') {
      if (poGroupBy === 'all') {
        const headers = ['PO No', 'PO Date', 'Supplier / Party', 'Broker', 'Area', 'Agency', 'Contract Qty (MT)', 'Rate (Rs)', 'Est. Pending Value (Rs)', 'Status'];
        const rows = filteredPoList.map(po => [po.poNo, po.poDate, po.supplier, po.broker, po.area, po.agency, po.totalQty.toFixed(2), po.rate, po.pendingValue.toFixed(2), po.status]);
        exportToCSV('Outstanding_PO_Not_Received_In_Temp_Arrival.csv', headers, rows);
      } else {
        const headers = ['Group Key', 'Total POs', 'PO Numbers (Not Received in Temp Arrival)', 'Total Qty (MT)', 'Pending Value (Rs)'];
        const rows = groupedPoSummary.map(g => [g.key, g.totalPoCount, g.poNumbers.join(' | '), g.totalQty.toFixed(2), g.pendingValue.toFixed(2)]);
        exportToCSV(`Outstanding_PO_List_${poGroupBy}_wise.csv`, headers, rows);
      }
    } else if (activeSubReport === 'mr_advance_eligible') {
      const headers = ['Mill Inspection No (MR)', 'Inspection Date', 'PO No', 'Supplier', 'Broker', 'Lorry No', 'Mismatch Status', 'Inspected Wt (MT)', 'Est. Material Value (Rs)', 'Eligible Adv (Rs)', 'Status'];
      const rows = filteredAdvanceMrList.map(r => [r.mrNo, r.arrivalDate, r.poNo, r.supplier, r.broker, r.lorryNumber, r.mismatchStatus, r.arrWtMt.toFixed(2), r.materialValue.toFixed(2), r.eligibleAdvanceAmt.toFixed(2), r.advanceStatus]);
      exportToCSV('MR_Eligible_For_Advance_Report.csv', headers, rows);
    } else if (activeSubReport === 'mr_apmc_details') {
      const headers = ['MR No', 'Settlement Date', 'PO No', 'Supplier', 'Broker', 'Material Value (Rs)', 'Challan APMC (Rs)', 'Actual APMC 1% (Rs)', 'APMC Deduction Diff (Rs)'];
      const rows = filteredApmcList.map(r => [r.mrNo, r.settDate, r.poNo, r.supplier, r.broker, r.materialValue.toFixed(2), r.challanApmc.toFixed(2), r.actualApmc.toFixed(2), r.apmcDiff.toFixed(2)]);
      exportToCSV('MR_Wise_APMC_Details_Report.csv', headers, rows);
    } else if (activeSubReport === 'mr_delivery_claim') {
      const headers = ['Mill Inspection No', 'PO No', 'PO Date', 'Delivery Due Date', 'Supplier', 'Broker', 'Weight (Qtl)', 'Penalty Rate (Rs/Qtl/Day)', 'Detention/Delay Days', 'Delivery Claim Amount (Rs)', 'Remarks'];
      const rows = filteredDeliveryClaimList.map(r => [r.mrNo, r.poNo, r.poDate, r.deliveryToDate || '-', r.supplier, r.broker, (r.weightQtl || 0).toFixed(2), r.penaltyRate || 0, r.detentionDays, r.claimAmt.toFixed(2), r.remarks]);
      exportToCSV('MR_Wise_Delivery_Claim_Report.csv', headers, rows);
    }
  };

  return (
    <div className="space-y-4 font-sans text-slate-800">
      {/* ================= SEARCH & CONTROLS BAR ================= */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Keyword, PO No, Mill Inspection No, Supplier, Broker, Area..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 outline-none focus:border-[#D94B5A] focus:bg-white transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {activeSubReport === 'outstanding_po' && (
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <span className="text-slate-500 pl-1 text-[11px]">View By:</span>
              <button
                type="button"
                onClick={() => setPoGroupBy('all')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-xs ${
                  poGroupBy === 'all' ? 'bg-[#D94B5A] text-white shadow' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                P.O Number Wise
              </button>
              <button
                type="button"
                onClick={() => setPoGroupBy('broker')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-xs ${
                  poGroupBy === 'broker' ? 'bg-[#D94B5A] text-white shadow' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Broker Wise
              </button>
              <button
                type="button"
                onClick={() => setPoGroupBy('supplier')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-xs ${
                  poGroupBy === 'supplier' ? 'bg-[#D94B5A] text-white shadow' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Party (Supplier) Wise
              </button>
              <button
                type="button"
                onClick={() => setPoGroupBy('area')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-xs ${
                  poGroupBy === 'area' ? 'bg-[#D94B5A] text-white shadow' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Area Wise
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ================= REPORT CONTENT VIEWS ================= */}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-2">
          <RefreshCcw className="w-8 h-8 animate-spin text-[#D94B5A] mx-auto" />
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Loading Report Records...</p>
        </div>
      ) : (
        <>
          {/* 1. OUTSTANDING P.O LIST REPORT (NOT RECEIVED IN TEMPORARY ARRIVAL) */}
          {activeSubReport === 'outstanding_po' && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-3.5 rounded-2xl border border-slate-700 shadow-md space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Unreceived POs</span>
                  <div className="text-xl font-black text-white">{filteredPoList.length} POs</div>
                  <span className="text-[10px] text-slate-300">Not Received in Temporary Arrival</span>
                </div>

                <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white p-3.5 rounded-2xl shadow-md space-y-1">
                  <span className="text-[10px] uppercase font-bold text-amber-100">Total Pending Contract Qty</span>
                  <div className="text-xl font-black text-white">
                    {filteredPoList.reduce((a, c) => a + c.totalQty, 0).toFixed(2)} MT
                  </div>
                  <span className="text-[10px] text-amber-100">Awaiting Temporary Arrival</span>
                </div>

                <div className="bg-gradient-to-br from-rose-600 to-rose-700 text-white p-3.5 rounded-2xl shadow-md space-y-1">
                  <span className="text-[10px] uppercase font-bold text-rose-100">Est. Outstanding Value</span>
                  <div className="text-xl font-black text-white">
                    ₹{filteredPoList.reduce((a, c) => a + c.pendingValue, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                  <span className="text-[10px] text-rose-100">Pending P.O Value</span>
                </div>
              </div>

              {/* Outstanding PO Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase text-slate-800 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-[#D94B5A]" />
                    <span>
                      OUTSTANDING P.O LIST (NOT RECEIVED IN TEMPORARY ARRIVAL) — {poGroupBy === 'all' ? `${filteredPoList.length} POs` : `${groupedPoSummary.length} GROUPS`}
                    </span>
                  </h3>
                  <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-md">
                    P.O Numbers Not Received in Temporary Arrival
                  </span>
                </div>

                {poGroupBy === 'all' ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-800 text-white font-bold uppercase text-[10px]">
                          <th className="p-2.5">P.O Number</th>
                          <th className="p-2.5">P.O Date</th>
                          <th className="p-2.5">Supplier / Party</th>
                          <th className="p-2.5">Broker</th>
                          <th className="p-2.5">Area / Agency</th>
                          <th className="p-2.5 text-right">Contract Qty (MT)</th>
                          <th className="p-2.5 text-right">Rate (₹)</th>
                          <th className="p-2.5 text-right">Est. Value (₹)</th>
                          <th className="p-2.5 text-center">Temporary Arrival Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredPoList.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="p-8 text-center text-slate-500 font-bold">
                              No Outstanding P.Os found matching the selected filters.
                            </td>
                          </tr>
                        ) : (
                          filteredPoList.map((po, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition">
                              <td className="p-2.5 font-bold font-mono text-[#D94B5A]">{po.poNo}</td>
                              <td className="p-2.5 font-mono text-slate-600">{po.poDate || '-'}</td>
                              <td className="p-2.5 font-bold">{po.supplier}</td>
                              <td className="p-2.5 text-slate-700">{po.broker}</td>
                              <td className="p-2.5 text-slate-600">{po.area} / {po.agency}</td>
                              <td className="p-2.5 text-right font-mono font-bold text-rose-600">{po.totalQty.toFixed(2)} MT</td>
                              <td className="p-2.5 text-right font-mono text-slate-700">
                                {po.rate > 0 ? `₹${po.rate.toLocaleString('en-IN')}` : '-'}
                              </td>
                              <td className="p-2.5 text-right font-mono font-bold">
                                ₹{po.pendingValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                              </td>
                              <td className="p-2.5 text-center">
                                <span className="px-2 py-0.5 text-[9px] font-black rounded-full uppercase bg-rose-100 text-rose-800">
                                  Not Received in Temp Arrival
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-800 text-white font-bold uppercase text-[10px]">
                          <th className="p-2.5">{poGroupBy.toUpperCase()} NAME</th>
                          <th className="p-2.5 text-center">PO COUNT</th>
                          <th className="p-2.5">P.O NUMBERS (NOT RECEIVED IN TEMP ARRIVAL)</th>
                          <th className="p-2.5 text-right text-amber-300">PENDING QTY (MT)</th>
                          <th className="p-2.5 text-right">EST. PENDING VALUE (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {groupedPoSummary.map((group, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition">
                            <td className="p-2.5 font-bold uppercase text-slate-900">{group.key}</td>
                            <td className="p-2.5 text-center font-mono font-bold">{group.totalPoCount}</td>
                            <td className="p-2.5 font-mono text-[10px] text-[#D94B5A] font-bold">
                              <div className="flex flex-wrap gap-1">
                                {group.poNumbers.map((pNo, i) => (
                                  <span key={i} className="px-1.5 py-0.5 bg-rose-50 border border-rose-200 rounded text-[#D94B5A]">
                                    {pNo}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-rose-600">{group.pendingQty.toFixed(2)}</td>
                            <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                              ₹{group.pendingValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-900 text-white font-bold text-[11px]">
                        <tr>
                          <td className="p-2.5 uppercase">GRAND TOTAL</td>
                          <td className="p-2.5 text-center font-mono">
                            {groupedPoSummary.reduce((a, c) => a + c.totalPoCount, 0)}
                          </td>
                          <td className="p-2.5 text-slate-400 text-[10px]">
                            All Unreceived P.Os
                          </td>
                          <td className="p-2.5 text-right font-mono text-amber-300">
                            {groupedPoSummary.reduce((a, c) => a + c.pendingQty, 0).toFixed(2)}
                          </td>
                          <td className="p-2.5 text-right font-mono text-amber-300">
                            ₹{groupedPoSummary.reduce((a, c) => a + c.pendingValue, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. MR ELIGIBLE FOR ADVANCE REPORT (FROM MILL INSPECTION SECTION) */}
          {activeSubReport === 'mr_advance_eligible' && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div className="bg-gradient-to-br from-indigo-900 to-indigo-800 text-white p-3.5 rounded-2xl border border-indigo-700 shadow-md space-y-1">
                  <span className="text-[10px] uppercase font-bold text-indigo-300">Eligible Mill Inspections (MR)</span>
                  <div className="text-xl font-black text-white">{filteredAdvanceMrList.length} MRs</div>
                  <span className="text-[10px] text-indigo-200">No Mismatch / L4 Cleared &amp; Advance Unpaid</span>
                </div>

                <div className="bg-gradient-to-br from-emerald-700 to-emerald-800 text-white p-3.5 rounded-2xl shadow-md space-y-1">
                  <span className="text-[10px] uppercase font-bold text-emerald-200">Total Est. Material Value</span>
                  <div className="text-xl font-black text-white">
                    ₹{filteredAdvanceMrList.reduce((a, c) => a + c.materialValue, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                  <span className="text-[10px] text-emerald-200">Inspected Material Value</span>
                </div>

                <div className="bg-gradient-to-br from-rose-600 to-rose-700 text-white p-3.5 rounded-2xl shadow-md space-y-1">
                  <span className="text-[10px] uppercase font-bold text-rose-100">Total Eligible Advance Payable</span>
                  <div className="text-xl font-black text-white">
                    ₹{filteredAdvanceMrList.reduce((a, c) => a + c.pendingAdvancePayable, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                  <span className="text-[10px] text-rose-100">Ready for Advance Payment</span>
                </div>
              </div>

              {/* Table View */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase text-slate-800 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[#D94B5A]" />
                    <span>LIST OF MRs ELIGIBLE FOR ADVANCE (MILL INSPECTION SECTION)</span>
                  </h3>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md">
                    No Mismatch or Cleared by Level 4 User • Advance Unpaid
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-800 text-white font-bold uppercase text-[10px]">
                        <th className="p-2.5">Mill Inspection No &amp; Date</th>
                        <th className="p-2.5">PO No</th>
                        <th className="p-2.5">Supplier / Party</th>
                        <th className="p-2.5">Broker</th>
                        <th className="p-2.5">Lorry No</th>
                        <th className="p-2.5 text-center">Mismatch / Clearance Status</th>
                        <th className="p-2.5 text-right">Inspected Wt (MT)</th>
                        <th className="p-2.5 text-right">Est. Mat. Value (₹)</th>
                        <th className="p-2.5 text-right text-amber-300">Eligible Adv Payable (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredAdvanceMrList.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-slate-500 font-bold">
                            No unpaid Mill Inspection MRs eligible for advance found for the selected criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredAdvanceMrList.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition">
                            <td className="p-2.5 font-bold font-mono text-[#D94B5A]">
                              <div>{row.mrNo}</div>
                              <div className="text-[9.5px] font-normal text-slate-500">{row.arrivalDate}</div>
                            </td>
                            <td className="p-2.5 font-mono font-bold text-slate-700">{row.poNo}</td>
                            <td className="p-2.5 font-bold">{row.supplier}</td>
                            <td className="p-2.5 text-slate-600">{row.broker}</td>
                            <td className="p-2.5 font-mono text-slate-700">{row.lorryNumber}</td>
                            <td className="p-2.5 text-center">
                              {row.mismatchStatus.includes('Cleared') ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9.5px] font-black rounded-full bg-indigo-100 text-indigo-800">
                                  <ShieldCheck className="w-3 h-3" />
                                  {row.mismatchStatus}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9.5px] font-black rounded-full bg-emerald-100 text-emerald-800">
                                  <CheckCircle2 className="w-3 h-3" />
                                  {row.mismatchStatus}
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 text-right font-mono">{row.arrWtMt.toFixed(2)} MT</td>
                            <td className="p-2.5 text-right font-mono font-bold">
                              ₹{row.materialValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-rose-600">
                              ₹{row.pendingAdvancePayable.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 3. MR WISE APMC DETAILS REPORT */}
          {activeSubReport === 'mr_apmc_details' && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-3.5 rounded-2xl border border-slate-700 shadow-md space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Challan APMC Fees</span>
                  <div className="text-xl font-black text-amber-300">
                    ₹{filteredApmcList.reduce((a, c) => a + c.challanApmc, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                  <span className="text-[10px] text-slate-300">Declared on Challan at Gate</span>
                </div>

                <div className="bg-gradient-to-br from-indigo-700 to-indigo-800 text-white p-3.5 rounded-2xl shadow-md space-y-1">
                  <span className="text-[10px] uppercase font-bold text-indigo-200">Total Actual APMC (1%)</span>
                  <div className="text-xl font-black text-white">
                    ₹{filteredApmcList.reduce((a, c) => a + c.actualApmc, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                  <span className="text-[10px] text-indigo-200">Calculated 1% of Material Value</span>
                </div>

                <div className="bg-gradient-to-br from-rose-700 to-rose-800 text-white p-3.5 rounded-2xl shadow-md space-y-1">
                  <span className="text-[10px] uppercase font-bold text-rose-200">Total APMC Settlement Deduction</span>
                  <div className="text-xl font-black text-white">
                    ₹{filteredApmcList.reduce((a, c) => a + c.apmcDiff, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                  <span className="text-[10px] text-rose-200">Net APMC Adjustment charged</span>
                </div>
              </div>

              {/* Table View */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase text-slate-800 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-[#D94B5A]" />
                    <span>MR WISE APMC DETAILS REPORT</span>
                  </h3>
                  <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-md">
                    APMC Cess Ledger per MR
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-800 text-white font-bold uppercase text-[10px]">
                        <th className="p-2.5">MR No &amp; Date</th>
                        <th className="p-2.5">PO No</th>
                        <th className="p-2.5">Supplier</th>
                        <th className="p-2.5">Broker</th>
                        <th className="p-2.5 text-right">Material Value (₹)</th>
                        <th className="p-2.5 text-right text-amber-300">Challan APMC (₹)</th>
                        <th className="p-2.5 text-right text-emerald-300">Actual APMC (1%) (₹)</th>
                        <th className="p-2.5 text-right text-rose-300">APMC Deduction Diff (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredApmcList.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition">
                          <td className="p-2.5 font-bold font-mono text-[#D94B5A]">
                            <div>{row.mrNo}</div>
                            <div className="text-[9.5px] font-normal text-slate-500">{row.settDate}</div>
                          </td>
                          <td className="p-2.5 font-mono font-bold text-slate-700">{row.poNo}</td>
                          <td className="p-2.5 font-bold">{row.supplier}</td>
                          <td className="p-2.5 text-slate-600">{row.broker}</td>
                          <td className="p-2.5 text-right font-mono font-bold">
                            ₹{row.materialValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-amber-700">
                            ₹{row.challanApmc.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-emerald-700">
                            ₹{row.actualApmc.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-rose-600">
                            ₹{row.apmcDiff.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 4. MR WISE DELIVERY CLAIM REPORT */}
          {activeSubReport === 'mr_delivery_claim' && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-3.5 rounded-2xl border border-slate-700 shadow-md space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total MRs Analyzed</span>
                  <div className="text-xl font-black text-white">{filteredDeliveryClaimList.length} MRs</div>
                  <span className="text-[10px] text-slate-300">Arrival Receipts</span>
                </div>

                <div className="bg-gradient-to-br from-amber-600 to-amber-700 text-white p-3.5 rounded-2xl shadow-md space-y-1">
                  <span className="text-[10px] uppercase font-bold text-amber-100">Total Detention / Delay Days (Average)</span>
                  <div className="text-xl font-black text-white">
                    {avgDetentionDays} Days
                  </div>
                  <span className="text-[10px] text-amber-100">Average Delayed Arrival Period</span>
                </div>

                <div className="bg-gradient-to-br from-rose-700 to-rose-800 text-white p-3.5 rounded-2xl shadow-md space-y-1">
                  <span className="text-[10px] uppercase font-bold text-rose-200">Total Delivery Claims</span>
                  <div className="text-xl font-black text-white">
                    ₹{filteredDeliveryClaimList.reduce((a, c) => a + c.claimAmt, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                  <span className="text-[10px] text-rose-200">Late Delivery Penalty Charged</span>
                </div>
              </div>

              {/* Table View */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase text-slate-800 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#D94B5A]" />
                    <span>MR WISE DELIVERY CLAIM REPORT (SAUDA CHECK POINT TO TEMPORARY ARRIVAL)</span>
                  </h3>
                  <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-md">
                    Late Delivery Penalties &amp; Claims
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-800 text-white font-bold uppercase text-[10px]">
                        <th className="p-2.5">Mill Inspection No</th>
                        <th className="p-2.5">PO No &amp; PO Date</th>
                        <th className="p-2.5">Delivery Due Date</th>
                        <th className="p-2.5">Supplier</th>
                        <th className="p-2.5">Broker</th>
                        <th className="p-2.5 text-center">Delay / Detention Days</th>
                        <th className="p-2.5 text-right text-rose-300">Delivery Claim (₹)</th>
                        <th className="p-2.5">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredDeliveryClaimList.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-500 font-bold">
                            No Delayed Delivery Claims (&gt; ₹0) found for the selected filter criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredDeliveryClaimList.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition">
                            <td className="p-2.5 font-bold font-mono text-[#D94B5A]">
                              <div>{row.mrNo}</div>
                            </td>
                            <td className="p-2.5 font-mono text-slate-700">
                              <div className="font-bold">{row.poNo}</div>
                              <div className="text-[9.5px] font-normal text-slate-500">{row.poDate || '-'}</div>
                            </td>
                            <td className="p-2.5 font-mono font-bold text-slate-700">
                              <div>{row.deliveryToDate || '-'}</div>
                              {row.penaltyRate ? (
                                <div className="text-[9.5px] font-normal text-slate-500">Penalty: ₹{row.penaltyRate}/Qtl/Day</div>
                              ) : null}
                            </td>
                            <td className="p-2.5 font-bold">{row.supplier}</td>
                            <td className="p-2.5 text-slate-600">{row.broker}</td>
                            <td className="p-2.5 text-center font-mono font-bold text-amber-700">
                              {row.detentionDays} Days
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-rose-600">
                              ₹{row.claimAmt.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </td>
                            <td className="p-2.5 text-slate-600 text-[10.5px]">{row.remarks}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
