import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Download,
  DollarSign,
  Briefcase,
  UserCheck,
  Clock,
  Scale,
  Lock,
  Eye,
  ChevronDown,
  ChevronUp,
  RefreshCcw,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { exportToCSV } from '../../utils/exportHelpers';
import { ReportFilterCriteria } from '../../services/systemReportEngine';
import { calculateWeightTolerance } from '../../lib/weightTolerance';
import { ExcessShortSettlementModal } from '../ExcessShortSettlementModal';

export type NewReportTab =
  | 'outstanding_po'
  | 'mr_advance_eligible'
  | 'mr_apmc_details'
  | 'mr_delivery_claim'
  | 'short_excess_deduction';

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

  // Report 5 (Tab 14): Short and Excess Deduction State (From Sauda Check Point -> Extra & Short Weight & Rate Settlement)
  const [shortExcessList, setShortExcessList] = useState<any[]>([]);
  const [shortExcessFilter, setShortExcessFilter] = useState<'all_deductions' | 'excess' | 'short' | 'all_records'>('all_deductions');
  const [expandedShortExcessPo, setExpandedShortExcessPo] = useState<string | null>(null);
  const [selectedSettlementPo, setSelectedSettlementPo] = useState<any | null>(null);

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
          matInspDetailRes,
          millInspRes,
          millInspDetailRes,
          matMismatchRes,
          sattaMismatchRes,
          scpDedRes,
          sattaBaseRatesRes
        ] = await Promise.all([
          supabase.from('purchase_master').select('*').order('created_at', { ascending: false }),
          supabase.from('final_arrival').select('*').order('date', { ascending: false }),
          supabase.from('mr_settlement_master').select('*').order('created_at', { ascending: false }),
          supabase.from('payment_master').select('*').order('created_at', { ascending: false }),
          supabase.from('sauda_check_point').select('*').order('created_at', { ascending: false }),
          supabase.from('temporary_material_received').select('*').order('date', { ascending: false }),
          supabase.from('material_inspection').select('*').order('created_at', { ascending: false }),
          supabase.from('material_inspection_details').select('*').then(r => r, () => ({ data: [] })),
          supabase.from('mill_inspection_master').select('*').order('created_at', { ascending: false }).then(r => r, () => ({ data: [] })),
          supabase.from('mill_inspection_detail').select('*').then(r => r, () => ({ data: [] })),
          supabase.from('material_mismatch').select('*').then(r => r, () => ({ data: [] })),
          supabase.from('satta_mismatch').select('*').then(r => r, () => ({ data: [] })),
          supabase.from('sauda_check_point_deductions').select('*').order('updated_at', { ascending: false }).then(r => r, () => ({ data: [] })),
          supabase.from('satta_base_rates').select('*').order('start_date', { ascending: false }).then(r => r, () => ({ data: [] }))
        ]);

        const rawPos = poRes.data || [];
        const rawFa = faRes.data || [];
        const rawSettlements = mrSettRes.data || [];
        const rawPayments = payMasterRes.data || [];
        const rawCheckpoints = saudaCpRes.data || [];
        const rawTempArrivals = tempArrRes.data || [];
        const rawMatInsp = [...(matInspRes.data || []), ...((millInspRes as any)?.data || [])];
        const rawMillInspDetails = [...((matInspDetailRes as any)?.data || []), ...((millInspDetailRes as any)?.data || [])];
        const rawMatMismatches = (matMismatchRes as any)?.data || [];
        const rawSattaMismatches = (sattaMismatchRes as any)?.data || [];
        const rawScpDeductions = (scpDedRes as any)?.data || [];
        const rawSattaBaseRates = (sattaBaseRatesRes as any)?.data || [];

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

        const extractPoSuffixKeys = (val: any): string[] => {
          const s = String(val || '').trim();
          const m = s.match(/(?:^|[\/\-_\s])0*(\d{1,5})$/);
          if (!m || !m[1]) return [];
          const shortNum = m[1];
          const paddedNum = shortNum.padStart(4, '0');
          return [
            `SUFFIX_${paddedNum}`,
            `SUFFIX_${shortNum}`,
            cleanPoKey(`PO-${shortNum}`),
            cleanPoKey(`PO-${paddedNum}`),
            cleanPoKey(shortNum),
            cleanPoKey(paddedNum)
          ].filter(Boolean);
        };

        rawPos.forEach((po: any) => {
          const key = cleanPoKey(po.po_no || po.po_number);
          if (!key) return;
          const entry = {
            poNo: String(po.po_no || po.po_number || key).trim(),
            poDate: String(po.po_date || po.date || po.s_date || '').split('T')[0],
            deliveryFrom: String(po.delivery_from || po.delivery_gt_from || '').split('T')[0],
            deliveryTo: String(po.delivery_to || po.delivery_gt_to || po.shipment_date || po.delivery_to_date || '').split('T')[0],
            graceDays: Number(po.grace_days || 0),
            deliveryPenaltyRate: Number(po.delivery_penalty || po.shipment_penalty || 0),
            supplier: String(po.supplier || po.supplier_name || '').toUpperCase().trim(),
            broker: String(po.broker || po.broker_name || '').toUpperCase().trim()
          };
          poDeliveryMap.set(key, entry);
          extractPoSuffixKeys(po.po_no || po.po_number || po.contract_po_no).forEach(sk => {
            if (!poDeliveryMap.has(sk)) poDeliveryMap.set(sk, entry);
          });
        });

        rawCheckpoints.forEach((cp: any) => {
          const keys = [
            cp.po_no,
            cp.ptf_no,
            cp.sauda_no,
            cp.contract_po_no,
            ...extractPoSuffixKeys(cp.po_no || cp.contract_po_no)
          ].map(cleanPoKey).filter(Boolean);
          if (keys.length === 0) return;
          const primaryKey = keys[0];
          const existing = keys.map(k => poDeliveryMap.get(k)).find(Boolean);

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
          extractPoSuffixKeys(cp.po_no || cp.contract_po_no).forEach(sk => poDeliveryMap.set(sk, entry));
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

        const toQtlFromRawWt = (val: any): number => {
          const w = Number(val || 0);
          if (!Number.isFinite(w) || w <= 0) return 0;
          if (w > 500) return Number((w / 100).toFixed(2)); // kg -> Qtl
          if (w <= 50) return Number((w * 10).toFixed(2));  // MT -> Qtl
          return Number(w.toFixed(2));                      // already Qtl
        };

        const getMaterialInspectionFinalReceiptQtl = (
          miRecord: any,
          mrNoStr?: string,
          ...fallbackRecords: any[]
        ): number => {
          const coreDig = extractCoreDigits(mrNoStr || miRecord?.mr_no || miRecord?.arrival_no);
          const insp =
            miRecord ||
            rawMatInsp.find((m: any) => {
              if (mrNoStr && String(m.mr_no || '').trim().toUpperCase() === mrNoStr.toUpperCase()) return true;
              if (coreDig && extractCoreDigits(m.mr_no || m.arrival_no) === coreDig) return true;
              return false;
            });

          if (insp) {
            // 1. Check top-level final_receipt_wt from material_inspection
            const topFinalQtl = toQtlFromRawWt(insp.final_receipt_wt ?? insp.total_final_receipt_wt);

            // 2. Also sum final_receipt_wt from embedded grid_details / material_inspection_details for this MR
            let gridItems: any[] = [];
            if (insp.grid_details) {
              try {
                const parsed = typeof insp.grid_details === 'string' ? JSON.parse(insp.grid_details) : insp.grid_details;
                if (Array.isArray(parsed)) gridItems = parsed;
              } catch (_) {}
            }
            if (gridItems.length === 0 && insp.details) {
              try {
                const parsed = typeof insp.details === 'string' ? JSON.parse(insp.details) : insp.details;
                if (Array.isArray(parsed)) gridItems = parsed;
              } catch (_) {}
            }
            if (gridItems.length === 0 && coreDig) {
              gridItems = rawMillInspDetails.filter(
                (d: any) => extractCoreDigits(d.mr_no) === coreDig
              );
            }

            let sumGridFinalQtl = 0;
            if (gridItems.length > 0) {
              const seenSrl = new Set<string>();
              gridItems.forEach((it: any, idx: number) => {
                if (!it || typeof it !== 'object') return;
                if (coreDig && it.mr_no && extractCoreDigits(it.mr_no) !== coreDig) return;
                const itemFinalQtl = toQtlFromRawWt(it.final_receipt_wt ?? it.reduced_weight ?? it.netto_pnto ?? 0);
                if (itemFinalQtl <= 0) return;
                const srl =
                  it.srl_no !== undefined && it.srl_no !== null && String(it.srl_no).trim() !== ''
                    ? `SRL_${String(it.srl_no).trim()}`
                    : `ROW_${idx}_${itemFinalQtl}`;
                if (seenSrl.has(srl)) return;
                seenSrl.add(srl);
                sumGridFinalQtl += itemFinalQtl;
              });
              sumGridFinalQtl = Number(sumGridFinalQtl.toFixed(2));
            }

            if (topFinalQtl > 0 && (sumGridFinalQtl <= 0 || Math.abs(topFinalQtl - sumGridFinalQtl) <= 0.5)) {
              return topFinalQtl;
            }
            if (sumGridFinalQtl > 0) {
              return sumGridFinalQtl;
            }
            if (topFinalQtl > 0) {
              return topFinalQtl;
            }
          }

          // Fallback only if material_inspection record has no final_receipt_wt yet
          for (const rec of [insp, ...fallbackRecords]) {
            if (!rec) continue;
            const fQtl = toQtlFromRawWt(rec.final_receipt_wt ?? rec.reduced_weight ?? rec.weight_qtl);
            if (fQtl > 0) return fQtl;
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
            const fallbackQtl = toQtlFromRawWt(rawWt);
            if (fallbackQtl > 0) return fallbackQtl;
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
          let resolvedMi = mi;
          if (coreDigits) {
            const matchedInsp = rawMatInsp.find((m: any) => isMrSeries(m.mr_no) && extractCoreDigits(m.mr_no) === coreDigits);
            const matchedSett = rawSettlements.find((s: any) => isMrSeries(s.mr_no) && extractCoreDigits(s.mr_no) === coreDigits);
            if (!resolvedMi && matchedInsp) resolvedMi = matchedInsp;
            if (!isMrSeries(resolvedMrNo)) {
              if (matchedInsp?.mr_no) resolvedMrNo = matchedInsp.mr_no;
              else if (matchedSett?.mr_no) resolvedMrNo = matchedSett.mr_no;
            }
          }

          // Convert any remaining AR prefix to Mill Inspection Number (MR prefix)
          resolvedMrNo = toMillInspectionMrNo(resolvedMrNo);

          const dedupKey = coreDigits ? `CORE_${coreDigits}` : resolvedMrNo.toUpperCase();
          if (seenDeliveryKeys.has(dedupKey)) return;

          const rawPoNo = String(
            tmr?.po_no ||
            fa?.po_no ||
            resolvedMi?.po_no ||
            sett?.po_no ||
            ''
          ).trim();
          const poKey = cleanPoKey(rawPoNo);
          const suffixCandidates = extractPoSuffixKeys(rawPoNo);
          const poInfo = (poKey ? poDeliveryMap.get(poKey) : undefined) ||
            suffixCandidates.map(sk => poDeliveryMap.get(sk)).find(Boolean);

          const tempArrivalDate = String(
            tmr?.date ||
            tmr?.arrival_date ||
            fa?.date ||
            fa?.arrival_date ||
            resolvedMi?.arrival_date ||
            sett?.arrival_date ||
            sett?.mr_date ||
            ''
          ).split('T')[0];

          const deliveryToDate = String(
            poInfo?.deliveryTo ||
            fa?.delivery_to ||
            resolvedMi?.delivery_to ||
            ''
          ).split('T')[0];

          const poDate = String(
            poInfo?.poDate ||
            fa?.po_date ||
            resolvedMi?.po_date ||
            sett?.po_date ||
            ''
          ).split('T')[0];

          const penaltyRate = Number(poInfo?.deliveryPenaltyRate || 0);
          // Weight (in Quintal) taken from table "material_inspection" and field "final_receipt_wt"
          const weightQtl = getMaterialInspectionFinalReceiptQtl(resolvedMi, resolvedMrNo, fa, tmr, sett);

          let detentionDays = calcDelayDays(deliveryToDate, tempArrivalDate);
          if (detentionDays === 0 && !deliveryToDate) {
            detentionDays = Number(sett?.detention_days || fa?.detention_days || resolvedMi?.detention_days || 0);
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

        // =========================================================================
        // 5. Process 14. Short and Excess Deduction (From Sauda Check Point -> Extra & Short Weight & Rate Settlement)
        // =========================================================================
        const normalizeDateYmd = (dStr: any): string => {
          if (!dStr) return '';
          let clean = String(dStr).trim();
          if (clean.includes('T')) clean = clean.split('T')[0];
          if (clean.includes('/')) {
            const parts = clean.split('/');
            if (parts.length === 3) {
              if (parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
              if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
            }
          }
          if (clean.includes('-')) {
            const parts = clean.split('-');
            if (parts.length === 3) {
              if (parts[0].length === 2 && parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
              if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
            }
          }
          return clean;
        };

        const normalizedSattaBaseRates = rawSattaBaseRates
          .map((b: any) => ({
            ymd: normalizeDateYmd(b.start_date || b.effective_date || b.satta_date || b.date || b.base_date || b.start || ''),
            rate: Number(b.base_rate || b.td5_base_rate || b.rate || b.b_rate || b.baseRate || 0)
          }))
          .filter((item: { ymd: string; rate: number }) => item.rate > 0)
          .sort((a: { ymd: string; rate: number }, b: { ymd: string; rate: number }) => b.ymd.localeCompare(a.ymd));

        const getTd5RateForDate = (dateStr?: string): number => {
          if (normalizedSattaBaseRates.length === 0) return 0;
          const targetYmd = normalizeDateYmd(dateStr);
          if (targetYmd) {
            const exact = normalizedSattaBaseRates.find((b: any) => b.ymd === targetYmd);
            if (exact) return exact.rate;
            const onOrBefore = normalizedSattaBaseRates.find((b: any) => b.ymd && b.ymd <= targetYmd);
            if (onOrBefore) return onOrBefore.rate;
          }
          return normalizedSattaBaseRates[0]?.rate || 0;
        };

        const extractMrSeq = (mr: any): number => {
          const m = String(mr || '').trim().match(/(\d+)$/);
          return m ? parseInt(m[1], 10) : 0;
        };

        const canonicalMrKey = (mr: any): string => {
          const seq = extractMrSeq(mr);
          return seq > 0 ? `MR_${seq}` : String(mr || '').trim().toUpperCase();
        };

        // Index sauda_check_point and purchase_master by PO key
        const scpByPoKey = new Map<string, any>();
        [...rawPos, ...rawCheckpoints].forEach((cp: any) => {
          const k = cleanPoKey(cp.po_no || cp.contract_po_no || cp.po_number);
          if (!k) return;
          const existing = scpByPoKey.get(k) || {};
          scpByPoKey.set(k, { ...existing, ...cp });
        });

        // Index saved sauda_check_point_deductions by PO key
        const savedDedByPoKey = new Map<string, any>();
        rawScpDeductions.forEach((d: any) => {
          const k = cleanPoKey(d.po_no || d.sauda_no);
          if (!k) return;
          if (!savedDedByPoKey.has(k)) {
            savedDedByPoKey.set(k, d);
          }
        });

        // Collect all candidate PO keys from saved deductions and checkpoints
        const allShortExcessPoKeys = new Set<string>([
          ...Array.from(savedDedByPoKey.keys()),
          ...Array.from(scpByPoKey.keys())
        ]);

        const shortExcessRecords: any[] = [];

        allShortExcessPoKeys.forEach((poKey) => {
          const cp = scpByPoKey.get(poKey);
          const savedDed = savedDedByPoKey.get(poKey);
          if (!cp && !savedDed) return;

          const poNo = String(savedDed?.po_no || cp?.po_no || cp?.contract_po_no || poKey).trim();
          const poSuffix = poKey.split('/').pop()?.trim() || '';

          const saudaDate = normalizeDateYmd(
            cp?.sauda_date || cp?.s_date || cp?.po_date || cp?.contract_date || cp?.voucher_date || cp?.date || savedDed?.created_at || ''
          );

          const supplier = String(
            savedDed?.supplier || cp?.supplier || cp?.supplier_name || cp?.supp_name || 'UNKNOWN SUPPLIER'
          ).toUpperCase().trim();

          const broker = String(
            savedDed?.broker || cp?.broker || cp?.broker_name || 'DIRECT'
          ).toUpperCase().trim();

          const area = String(cp?.area || cp?.location || '').toUpperCase().trim();
          const agency = String(cp?.agency || '').toUpperCase().trim();
          const unit = String(cp?.purchase_unit_name || cp?.unit_type || cp?.unit || 'BALES').toUpperCase().trim();

          const contractMt = Number(
            cp?.total_contract_mt ||
            cp?.contract_weight_mt ||
            savedDed?.contract_weight_mt ||
            cp?.total_wt_in_ton ||
            cp?.weight_mt ||
            cp?.contract_mt ||
            (Number(cp?.weight_qtl) > 0 ? Number(cp.weight_qtl) / 10 : 0) ||
            0
          );

          if (contractMt <= 0) return;

          // Match Mill Inspections for this PO
          const matchedInsps = rawMatInsp.filter((insp: any) => {
            const iPo = cleanPoKey(insp.po_no || insp.mill_po_no || insp.contract_po_no || insp.sauda_no);
            if (!iPo) return false;
            if (iPo === poKey) return true;
            if (poSuffix.length >= 3 && (iPo === poSuffix || iPo === `PO-${poSuffix}` || iPo === `PO-${poSuffix.replace(/^0+/, '')}`)) return true;
            return false;
          });

          const uniqueByMr = new Map<string, any>();
          matchedInsps.forEach((insp: any) => {
            const rawMr = String(insp.mr_no || insp.arrival_no || '').trim();
            if (!rawMr || rawMr.toUpperCase() === 'NO' || rawMr.toUpperCase() === 'N/A' || rawMr === '-') return;
            const mKey = canonicalMrKey(rawMr);
            const existing = uniqueByMr.get(mKey);
            const hasGrid = Boolean(insp.grid_details || insp.details);
            const existingHasGrid = Boolean(existing?.grid_details || existing?.details);
            if (!existing || (!existingHasGrid && hasGrid)) {
              uniqueByMr.set(mKey, insp);
            }
          });

          const sortedInsps = Array.from(uniqueByMr.values()).sort((a: any, b: any) => {
            const seqA = extractMrSeq(a.mr_no || a.arrival_no || '');
            const seqB = extractMrSeq(b.mr_no || b.arrival_no || '');
            if (seqA > 0 && seqB > 0 && seqA !== seqB) return seqA - seqB;
            return String(a.arrival_date || a.mr_date || a.date || '').localeCompare(
              String(b.arrival_date || b.mr_date || b.date || '')
            );
          });

          const saudaRate =
            Number(cp?.b_rate || cp?.base_rate || cp?.b_rate_qtl || cp?.s_b_rate || cp?.sauda_b_rate || 0) ||
            getTd5RateForDate(saudaDate) ||
            Number(cp?.rate || cp?.purchase_rate || cp?.rate_per_qtl || cp?.sauda_rate || cp?.contract_rate || savedDed?.sauda_rate || 0) ||
            12900;

          const toMtFromRawWt = (val: any): number => {
            const n = Number(val || 0);
            if (!Number.isFinite(n) || n <= 0) return 0;
            if (n >= 500) return n / 1000;
            if (n > 50 && n < 500) return n / 10;
            return n;
          };

          const mrBreakdown: any[] = [];
          let sumShortClaimMt = 0;
          let sumExcessClaimMt = 0;
          let lastMrNo = String(savedDed?.last_mr_no || '').trim();
          let lastMrDate = normalizeDateYmd(savedDed?.last_arrival_date || '');

          if (sortedInsps.length > 0) {
            const isMulti = sortedInsps.length > 1;
            sortedInsps.forEach((insp: any, idx: number) => {
              const isLast = idx === sortedInsps.length - 1;
              const mrNoStr = toMillInspectionMrNo(insp.mr_no || insp.arrival_no || '');
              const mKey = canonicalMrKey(mrNoStr);
              const mrDateStr = normalizeDateYmd(insp.arrival_date || insp.mr_date || insp.inspection_date || insp.date || insp.created_at || '');

              let mrGrossMt = toMtFromRawWt(insp.challan_gross_wt ?? insp.receipt_gross_wt ?? insp.gross_weight);
              let mrNetMt = toMtFromRawWt(insp.final_receipt_wt ?? insp.total_final_receipt_wt ?? insp.reduced_weight ?? insp.weight_reduced);
              let bags = Number(insp.total_packets || insp.quantity || insp.total_quantity || insp.packets || insp.bags || 0) || 0;
              let gradeStr = String(insp.receipt_grade_name || insp.challan_grade_name || insp.grading || insp.grade || insp.selected_grade || cp?.grade || 'TD6').trim();
              let markaStr = String(insp.challan_marka_name || insp.marka || 'NO MARK').trim();
              let cropYearStr = String(insp.crop_year || insp.financial_year || '2026-27').trim();

              let embeddedGrid: any[] = [];
              if (insp.grid_details) {
                try {
                  const parsed = typeof insp.grid_details === 'string' ? JSON.parse(insp.grid_details) : insp.grid_details;
                  if (Array.isArray(parsed)) embeddedGrid = parsed;
                } catch (_) {}
              }
              if (embeddedGrid.length === 0 && insp.details) {
                try {
                  const parsed = typeof insp.details === 'string' ? JSON.parse(insp.details) : insp.details;
                  if (Array.isArray(parsed)) embeddedGrid = parsed;
                } catch (_) {}
              }

              const matchingDetails = embeddedGrid.length > 0
                ? embeddedGrid
                : rawMillInspDetails.filter((d: any) => {
                    const dMr = String(d.mr_no || '').trim();
                    return dMr && canonicalMrKey(dMr) === mKey;
                  });

              if (Array.isArray(matchingDetails) && matchingDetails.length > 0) {
                const seenSrl = new Set<string>();
                let sumDetailGrossMt = 0;
                let sumDetailNetMt = 0;
                let sumDetailBags = 0;
                const gradesSet: string[] = [];
                const markasSet: string[] = [];

                matchingDetails.forEach((d: any, itIdx: number) => {
                  if (!d || typeof d !== 'object') return;
                  const itMr = String(d.mr_no || '').trim();
                  if (itMr && canonicalMrKey(itMr) !== mKey) return;
                  const gRaw = Number(d.challan_gross_wt ?? d.receipt_gross_wt ?? d.gross_weight_batch ?? d.gross_weight ?? 0);
                  const nRaw = Number(d.final_receipt_wt ?? d.reduced_weight ?? d.netto_pnto ?? 0);
                  if (gRaw <= 0 && nRaw <= 0) return;

                  const srl =
                    d.srl_no !== undefined && d.srl_no !== null && String(d.srl_no).trim() !== ''
                      ? `SRL_${String(d.srl_no).trim()}`
                      : `ROW_${String(d.arrival_grade || d.receipt_grade_name || d.challan_grade_name || itIdx).trim()}_${gRaw}_${nRaw}`;
                  if (seenSrl.has(srl)) return;
                  seenSrl.add(srl);

                  const gWt = toMtFromRawWt(gRaw);
                  let nWt = toMtFromRawWt(nRaw);
                  if (nWt <= 0 && d.quantity_rcpt) nWt = toMtFromRawWt(d.quantity_rcpt);
                  if (nWt <= 0 && gWt > 0) nWt = gWt;

                  sumDetailGrossMt += gWt;
                  sumDetailNetMt += nWt;
                  sumDetailBags += Number(d.quantity || d.packets || d.bales || d.bags || 0) || 0;

                  const gName = String(d.arrival_grade || d.receipt_grade_name || d.challan_grade_name || d.stock_grade_name || d.grade || '').trim();
                  if (gName && !gradesSet.includes(gName)) gradesSet.push(gName);
                  const mName = String(d.marka || d.marks || '').trim();
                  if (mName && !markasSet.includes(mName)) markasSet.push(mName);
                  if (d.crop_year) cropYearStr = String(d.crop_year).trim();
                });

                const roundedDetailGross = Math.round(sumDetailGrossMt * 1000) / 1000;
                const roundedDetailNet = Math.round(sumDetailNetMt * 1000) / 1000;

                if (roundedDetailGross > 0 && (mrGrossMt <= 0 || Math.abs(mrGrossMt - roundedDetailGross) > 0.05)) {
                  mrGrossMt = roundedDetailGross;
                }
                if (
                  roundedDetailNet > 0 &&
                  (mrNetMt <= 0 ||
                    (mrGrossMt > 0 && mrNetMt > mrGrossMt + 0.001) ||
                    Math.abs(mrNetMt - roundedDetailNet) > 0.05)
                ) {
                  mrNetMt = roundedDetailNet;
                }
                if (bags <= 0 && sumDetailBags > 0) bags = sumDetailBags;
                if (gradesSet.length > 0) gradeStr = gradesSet[0];
                if (markasSet.length > 0) markaStr = markasSet[0];
              }

              if (mrGrossMt > 0 && mrNetMt > mrGrossMt + 0.001) {
                mrNetMt = mrGrossMt;
              }
              if (mrNetMt <= 0) {
                if (insp.weight_qtl) mrNetMt = Number(insp.weight_qtl) / 10;
                else if (insp.weight) mrNetMt = toMtFromRawWt(insp.weight);
              }
              if (mrGrossMt <= 0) mrGrossMt = mrNetMt;
              if (mrNetMt <= 0) mrNetMt = mrGrossMt;

              mrGrossMt = Math.round(mrGrossMt * 1000) / 1000;
              mrNetMt = Math.round(mrNetMt * 1000) / 1000;

              const lorryCount = sortedInsps.length;
              const shortClaimMt = isMulti && isLast ? mrGrossMt : mrNetMt;
              const excessUsesGross =
                lorryCount === 2 ? (idx === 0) : lorryCount >= 3 ? isLast : false;
              const excessClaimMt = excessUsesGross ? mrGrossMt : mrNetMt;
              sumShortClaimMt += shortClaimMt;
              sumExcessClaimMt += excessClaimMt;

              if (isLast) {
                lastMrNo = mrNoStr;
                lastMrDate = mrDateStr;
              }

              const mrRate = getTd5RateForDate(mrDateStr) || Number(savedDed?.satta_rate) || saudaRate;
              const mrRateDiff = Math.abs(saudaRate - mrRate);

              mrBreakdown.push({
                mrNo: mrNoStr,
                mrDate: mrDateStr,
                grade: gradeStr,
                marka: markaStr,
                cropYear: cropYearStr,
                bags,
                isLast,
                isMulti,
                grossMt: Number(mrGrossMt.toFixed(3)),
                grossKg: Math.round(mrGrossMt * 1000),
                netMt: Number(mrNetMt.toFixed(3)),
                netKg: Math.round(mrNetMt * 1000),
                finalClaimMt: Number(shortClaimMt.toFixed(3)),
                finalClaimKg: Math.round(shortClaimMt * 1000),
                finalClaimQtl: Number((shortClaimMt * 10).toFixed(2)),
                claimBasis: isMulti && isLast ? 'Gross (Last Lorry)' : 'Net',
                saudaSattaRate: saudaRate,
                mrSattaRate: mrRate,
                rateDiff: mrRateDiff
              });
            });
          }

          const roundedShortClaimMt = Math.round(sumShortClaimMt * 1000) / 1000;
          const roundedExcessClaimMt = Math.round(sumExcessClaimMt * 1000) / 1000;
          const isExcessBasis =
            (contractMt - roundedExcessClaimMt) < -0.0001 &&
            (roundedShortClaimMt >= contractMt - 0.0001 || (roundedExcessClaimMt - contractMt) >= (contractMt - roundedShortClaimMt));

          if (isExcessBasis && mrBreakdown.length > 0) {
            const breakdownLen = mrBreakdown.length;
            mrBreakdown.forEach((item, bIdx) => {
              const useGross =
                breakdownLen === 2 ? (bIdx === 0) : breakdownLen >= 3 ? item.isLast : false;
              const cMt = useGross ? item.grossMt : item.netMt;
              item.finalClaimMt = Number(cMt.toFixed(3));
              item.finalClaimKg = Math.round(cMt * 1000);
              item.finalClaimQtl = Number((cMt * 10).toFixed(2));
              item.claimBasis =
                breakdownLen === 2
                  ? (bIdx === 0 ? 'Gross (First Lorry)' : 'Net (Last Lorry)')
                  : breakdownLen >= 3
                  ? (item.isLast ? 'Gross (Last Lorry)' : 'Net')
                  : 'Net';
            });
          }

          const computedTotalClaimMt = isExcessBasis ? roundedExcessClaimMt : roundedShortClaimMt;

          const totalReceivedMt =
            computedTotalClaimMt > 0
              ? Math.round(computedTotalClaimMt * 1000) / 1000
              : Math.round(Number(savedDed?.total_received_mt || cp?.received_weight_mt || 0) * 1000) / 1000;

          if (totalReceivedMt <= 0) return;

          // =========================================================================
          // Exact Extra & Short Weight & Rate Settlement Logic (from Sauda Check Point):
          // 1. Compare Sauda Contract Qty vs Total Final Receipt Claim:
          //    - Excess (Received > Contract): NO 3% tolerance on Excess!
          //      Deductible Wt = Total Final Receipt Claim - Sauda Contract Qty
          //      (e.g., 38,135 kg - 34,500 kg = 3,635 kg = 3.635 MT = 36.35 Qtl)
          //    - Short (Received < Contract):
          //      * If shortage >= 1.5 MT (1,500 kg): No 3% tolerance, full shortage chargeable.
          //      * If shortage < 1.5 MT and <= 3% of Contract: Within 3% Exemption -> 0 deductible.
          //      * If shortage < 1.5 MT and > 3% of Contract: Deduct (Shortage - 3% of Contract).
          // 2. Satta Rate Difference & Deduction:
          //    - Excess: If Sauda Rate > Last MR Rate, Diff = Sauda Rate - Last MR Rate; else ₹0.
          //    - Short: If Last MR Rate > Sauda Rate, Diff = Last MR Rate - Sauda Rate; else ₹0.
          //    - Total Deduction (₹) = Deductible Quintal (Qtl) × Rate Diff / Qtl
          //      (e.g., 36.35 Qtl × ₹600/Qtl = ₹21,810.00)
          // =========================================================================
          const grossVarianceMt = Math.round((contractMt - totalReceivedMt) * 1000) / 1000;
          const isGrossShort = grossVarianceMt > 0.0001;
          const isGrossExcess = grossVarianceMt < -0.0001;
          const shortageMt = isGrossShort ? grossVarianceMt : 0;
          const excessMt = isGrossExcess ? Math.abs(grossVarianceMt) : 0;
          const tolerance3PctMt = Math.round((contractMt * 0.03) * 1000) / 1000;

          let deductionQtyMt = 0;
          let isWithinTolerance = false;
          let variationType: 'excess' | 'short' | 'within_tolerance' = 'within_tolerance';
          let policyLabel = 'Within 3% Tolerance';

          if (isGrossExcess) {
            variationType = 'excess';
            deductionQtyMt = Math.max(0, Math.round(excessMt * 1000) / 1000);
            isWithinTolerance = false;
            policyLabel = 'No 3% Tolerance on Excess';
          } else if (isGrossShort) {
            if (shortageMt >= 1.5) {
              variationType = 'short';
              deductionQtyMt = Math.max(0, Math.round(shortageMt * 1000) / 1000);
              isWithinTolerance = false;
              policyLabel = 'Short ≥ 1.5 MT (Full Shortage)';
            } else if (shortageMt <= tolerance3PctMt) {
              variationType = 'within_tolerance';
              deductionQtyMt = 0;
              isWithinTolerance = true;
              policyLabel = 'Within 3% Exemption';
            } else {
              variationType = 'short';
              deductionQtyMt = Math.max(0, Math.round((shortageMt - tolerance3PctMt) * 1000) / 1000);
              isWithinTolerance = false;
              policyLabel = '3% Short Weight Exemption';
            }
          } else {
            variationType = 'within_tolerance';
            deductionQtyMt = 0;
            isWithinTolerance = true;
            policyLabel = 'Exact Weight';
          }

          const deductionQtyKg = Math.round(deductionQtyMt * 1000);
          const deductionQtyQtl = Math.round(deductionQtyMt * 10 * 100) / 100;

          const lastMrRate =
            (lastMrDate ? getTd5RateForDate(lastMrDate) : 0) ||
            (mrBreakdown.length > 0 ? mrBreakdown[mrBreakdown.length - 1].mrSattaRate : 0) ||
            Number(savedDed?.satta_rate) ||
            saudaRate;

          const isShortRateLowerOrEqual = isGrossShort && lastMrRate <= saudaRate;
          const isExcessApplicableForSauda = isGrossExcess && lastMrRate >= saudaRate;

          const rateDifference = isGrossShort
            ? (lastMrRate > saudaRate ? lastMrRate - saudaRate : 0)
            : isGrossExcess
            ? Math.max(0, saudaRate - lastMrRate)
            : 0;

          const rateMode = String(savedDed?.rate_basis || 'rate_difference');
          let rateDiff = rateDifference;
          if (rateMode === 'custom' && Number(savedDed?.applicable_rate) > 0) {
            rateDiff = Number(savedDed.applicable_rate);
          } else if (rateMode === 'last_mr_satta') {
            rateDiff = lastMrRate;
          } else if (rateMode === 'sauda_satta') {
            rateDiff = saudaRate;
          }

          let rawDedAmt = 0;
          if (!isWithinTolerance && deductionQtyQtl > 0) {
            if (isGrossShort && rateMode === 'rate_difference' && isShortRateLowerOrEqual) {
              rawDedAmt = 0;
            } else if (isGrossExcess && rateMode === 'rate_difference' && isExcessApplicableForSauda) {
              rawDedAmt = 0;
            } else {
              rawDedAmt = Math.round(deductionQtyQtl * rateDiff * 100) / 100;
            }
          }

          const linkedMrsStr =
            mrBreakdown.length > 0
              ? mrBreakdown.map(m => m.mrNo).join(', ')
              : String(savedDed?.arrival_numbers || lastMrNo || '-');

          const saudaMaterialValue = Math.round(contractMt * 10 * saudaRate);
          const totalFinalPayable = Math.max(0, saudaMaterialValue - rawDedAmt);

          const isLocked = Boolean(
            savedDed &&
              (String(savedDed.status || '').toLowerCase() === 'approved' ||
                String(savedDed.status || '').toLowerCase() === 'settled' ||
                String(savedDed.status || '').toLowerCase() === 'locked')
          ) || Boolean(cp?.is_settled || String(cp?.excess_short_status || '').toLowerCase() === 'settled');

          // Include if it has a saved deduction record OR has excess/short variation
          if (savedDed || variationType === 'excess' || variationType === 'short' || rawDedAmt > 0) {
            shortExcessRecords.push({
              poNo,
              saudaDate,
              supplier,
              broker,
              area,
              agency,
              unit,
              linkedMrs: linkedMrsStr,
              mrCount: mrBreakdown.length || linkedMrsStr.split(',').filter(Boolean).length,
              lastMrNo: lastMrNo || (mrBreakdown.length > 0 ? mrBreakdown[mrBreakdown.length - 1].mrNo : '-'),
              lastMrDate: lastMrDate || (mrBreakdown.length > 0 ? mrBreakdown[mrBreakdown.length - 1].mrDate : '-'),
              contractMt: Number(contractMt.toFixed(3)),
              contractQtl: Number((contractMt * 10).toFixed(2)),
              contractKg: Math.round(contractMt * 1000),
              totalReceivedMt: Number(totalReceivedMt.toFixed(3)),
              totalReceivedQtl: Number((totalReceivedMt * 10).toFixed(2)),
              totalReceivedKg: Math.round(totalReceivedMt * 1000),
              variationType,
              policyLabel,
              deductionQtyMt,
              deductionQtyQtl,
              deductionQtyKg,
              saudaRate,
              lastMrRate,
              rateDiff,
              rateBasis: rateMode,
              deductionAmount: rawDedAmt,
              saudaMaterialValue,
              totalFinalPayable,
              formulaText: `${deductionQtyQtl.toFixed(2)} Qtl × ₹${rateDiff.toLocaleString('en-IN')}/Qtl = ₹${rawDedAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              status: isLocked ? 'SAVED & LOCKED' : 'CALCULATED',
              isLocked,
              approvedBy: String(savedDed?.approved_by || 'Operator (ADMIN)'),
              mrBreakdown,
              rawPoObject: {
                ...(cp || {}),
                po_no: poNo,
                supplier,
                broker,
                total_contract_mt: contractMt,
                contract_weight_mt: contractMt,
                received_weight_mt: totalReceivedMt,
                excess_short_deduction: rawDedAmt,
                excess_short_status: isLocked ? 'settled' : 'pending',
                is_settled: isLocked
              }
            });
          }
        });

        // Sort with highest deduction / settled first
        shortExcessRecords.sort((a, b) => {
          if (b.deductionAmount !== a.deductionAmount) return b.deductionAmount - a.deductionAmount;
          return String(b.saudaDate || '').localeCompare(String(a.saudaDate || ''));
        });

        setShortExcessList(shortExcessRecords);
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

  // Filter 14. Short and Excess Deduction List
  const filteredShortExcessList = useMemo(() => {
    return shortExcessList.filter(item => {
      if (shortExcessFilter === 'all_deductions' && !(item.deductionAmount > 0 || item.isLocked)) return false;
      if (shortExcessFilter === 'excess' && item.variationType !== 'excess') return false;
      if (shortExcessFilter === 'short' && item.variationType !== 'short') return false;
      return matchesFilters(
        item.lastMrDate || item.saudaDate,
        item.supplier,
        item.broker,
        item.area,
        item.agency,
        item.poNo,
        item.linkedMrs,
        filters,
        searchQuery
      );
    });
  }, [shortExcessList, shortExcessFilter, searchQuery, filters]);

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
    } else if (activeSubReport === 'short_excess_deduction') {
      const headers = [
        'PO No',
        'Sauda Date',
        'Supplier',
        'Broker',
        'Linked MRs',
        'Last MR No',
        'Last MR Date',
        'Contract Qty (kg)',
        'Contract Qty (MT)',
        'Contract Qty (Qtl)',
        'Final Receipt Claim (kg)',
        'Final Receipt Claim (MT)',
        'Final Receipt Claim (Qtl)',
        'Variation Type',
        'Policy',
        'Deductible Weight (kg)',
        'Deductible Weight (MT)',
        'Deductible Weight (Qtl)',
        'Sauda Date Satta Rate (Rs/Qtl)',
        'Last MR Satta Rate (Rs/Qtl)',
        'Rate Difference (Rs/Qtl)',
        'Calculation Formula',
        'Total Deduction Amount (Rs)',
        'Sauda Material Value (Rs)',
        'Total Final Payable (Rs)',
        'Status'
      ];
      const rows = filteredShortExcessList.map(r => [
        r.poNo,
        r.saudaDate || '-',
        r.supplier,
        r.broker,
        r.linkedMrs,
        r.lastMrNo,
        r.lastMrDate || '-',
        r.contractKg,
        r.contractMt.toFixed(3),
        r.contractQtl.toFixed(2),
        r.totalReceivedKg,
        r.totalReceivedMt.toFixed(3),
        r.totalReceivedQtl.toFixed(2),
        r.variationType.toUpperCase(),
        r.policyLabel,
        r.deductionQtyKg,
        r.deductionQtyMt.toFixed(3),
        r.deductionQtyQtl.toFixed(2),
        r.saudaRate,
        r.lastMrRate,
        r.rateDiff,
        r.formulaText,
        r.deductionAmount.toFixed(2),
        r.saudaMaterialValue.toFixed(2),
        r.totalFinalPayable.toFixed(2),
        r.status
      ]);
      exportToCSV('Short_And_Excess_Deduction_Report.csv', headers, rows);
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
          {activeSubReport === 'short_excess_deduction' && (
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <span className="text-slate-500 pl-1 text-[11px]">Filter:</span>
              <button
                type="button"
                onClick={() => setShortExcessFilter('all_deductions')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-xs ${
                  shortExcessFilter === 'all_deductions' ? 'bg-[#D94B5A] text-white shadow' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Settled / Deducted
              </button>
              <button
                type="button"
                onClick={() => setShortExcessFilter('excess')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-xs ${
                  shortExcessFilter === 'excess' ? 'bg-purple-700 text-white shadow' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Excess Weight Only
              </button>
              <button
                type="button"
                onClick={() => setShortExcessFilter('short')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-xs ${
                  shortExcessFilter === 'short' ? 'bg-amber-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Short Weight Only
              </button>
              <button
                type="button"
                onClick={() => setShortExcessFilter('all_records')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-xs ${
                  shortExcessFilter === 'all_records' ? 'bg-slate-800 text-white shadow' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All P.Os
              </button>
            </div>
          )}

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

          {/* 5. (TAB 14) SHORT AND EXCESS DEDUCTION REPORT (SAUDA CHECK POINT -> EXTRA & SHORT WEIGHT & RATE SETTLEMENT) */}
          {activeSubReport === 'short_excess_deduction' && (
            <div className="space-y-4">
              {/* Summary KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-3.5 rounded-2xl border border-slate-700 shadow-md space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Settled / Deducted P.Os</span>
                  <div className="text-xl font-black text-white">{filteredShortExcessList.length} P.Os</div>
                  <span className="text-[10px] text-slate-300">
                    Excess: {filteredShortExcessList.filter(r => r.variationType === 'excess').length} • Short: {filteredShortExcessList.filter(r => r.variationType === 'short').length}
                  </span>
                </div>

                <div className="bg-slate-900 text-white p-3.5 rounded-2xl border border-slate-700 shadow-md space-y-1">
                  <span className="text-[10px] uppercase font-bold text-amber-300">Total Deductible Weight</span>
                  <div className="text-xl font-black text-white">
                    {filteredShortExcessList.reduce((a, c) => a + c.deductionQtyQtl, 0).toFixed(2)} Qtl
                  </div>
                  <span className="text-[10px] text-slate-300">
                    {filteredShortExcessList.reduce((a, c) => a + c.deductionQtyKg, 0).toLocaleString('en-IN')} kg ({filteredShortExcessList.reduce((a, c) => a + c.deductionQtyMt, 0).toFixed(3)} MT)
                  </span>
                </div>

                <div className="bg-gradient-to-br from-amber-600 to-amber-700 text-white p-3.5 rounded-2xl shadow-md space-y-1">
                  <span className="text-[10px] uppercase font-bold text-amber-100">Total Final Receipt Claim</span>
                  <div className="text-xl font-black text-white">
                    {filteredShortExcessList.reduce((a, c) => a + c.totalReceivedQtl, 0).toFixed(2)} Qtl
                  </div>
                  <span className="text-[10px] text-amber-100">
                    Against {filteredShortExcessList.reduce((a, c) => a + c.contractQtl, 0).toFixed(2)} Qtl Sauda Contract
                  </span>
                </div>

                <div className="bg-gradient-to-br from-rose-700 to-rose-800 text-white p-3.5 rounded-2xl shadow-md space-y-1">
                  <span className="text-[10px] uppercase font-bold text-rose-200">Total Short &amp; Excess Deduction</span>
                  <div className="text-xl font-black text-white">
                    ₹{filteredShortExcessList.reduce((a, c) => a + c.deductionAmount, 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-rose-200">
                    Formula: Deductible Quintal (Qtl) × Rate Diff / Qtl
                  </span>
                </div>
              </div>

              {/* Main Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-3 bg-slate-900 text-white border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                    <Scale className="w-4 h-4 text-amber-400" />
                    <span>14. SHORT AND EXCESS DEDUCTION REPORT (SAUDA CHECK POINT — EXTRA &amp; SHORT WEIGHT &amp; RATE SETTLEMENT)</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-md uppercase">
                      sauda_check_point_deductions
                    </span>
                    <span className="text-[10px] bg-rose-600 text-white font-bold px-2 py-0.5 rounded-md">
                      Policy: No 3% Tolerance on Excess • Quintal × Rate/Qtl
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-800 text-white font-bold uppercase text-[10px]">
                        <th className="p-2.5">P.O No &amp; Sauda Date</th>
                        <th className="p-2.5">Supplier &amp; Broker</th>
                        <th className="p-2.5">Linked MRs &amp; Last MR</th>
                        <th className="p-2.5 text-right">Sauda Contract Qty</th>
                        <th className="p-2.5 text-right">Total Final Receipt Claim</th>
                        <th className="p-2.5 text-center">Variation &amp; Policy</th>
                        <th className="p-2.5 text-right">Final Deductible Wt</th>
                        <th className="p-2.5 text-right">Satta Rates (Sauda vs Last MR)</th>
                        <th className="p-2.5 text-right text-amber-300">Total Deduction (₹)</th>
                        <th className="p-2.5 text-center">Status &amp; Trail</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredShortExcessList.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="p-8 text-center text-slate-500 font-bold">
                            No Short or Excess Weight Deduction records found matching the selected filters.
                          </td>
                        </tr>
                      ) : (
                        filteredShortExcessList.map((row, idx) => {
                          const isExpanded = expandedShortExcessPo === row.poNo;
                          return (
                            <React.Fragment key={row.poNo || idx}>
                              <tr className="hover:bg-slate-50 transition">
                                <td className="p-2.5 font-mono">
                                  <div className="font-black text-[#D94B5A]">{row.poNo}</div>
                                  <div className="text-[10px] text-slate-500">Sauda: {row.saudaDate || '-'}</div>
                                </td>
                                <td className="p-2.5">
                                  <div className="font-bold text-slate-900">{row.supplier}</div>
                                  <div className="text-[10px] text-slate-500">Broker: {row.broker}</div>
                                </td>
                                <td className="p-2.5 font-mono">
                                  <div className="font-bold text-slate-800 text-[10.5px]">{row.linkedMrs}</div>
                                  <div className="text-[9.5px] text-indigo-700 font-bold">
                                    Last MR: {row.lastMrNo} ({row.lastMrDate || '-'})
                                  </div>
                                </td>
                                <td className="p-2.5 text-right font-mono">
                                  <div className="font-bold text-slate-900">{row.contractKg.toLocaleString('en-IN')} kg</div>
                                  <div className="text-[9.5px] text-slate-500">
                                    ({row.contractMt.toFixed(2)} MT / {row.contractQtl.toFixed(2)} Qtl)
                                  </div>
                                </td>
                                <td className="p-2.5 text-right font-mono">
                                  <div className="font-bold text-slate-900">{row.totalReceivedKg.toLocaleString('en-IN')} kg</div>
                                  <div className="text-[9.5px] text-slate-500">
                                    ({row.totalReceivedMt.toFixed(3)} MT / {row.totalReceivedQtl.toFixed(2)} Qtl)
                                  </div>
                                </td>
                                <td className="p-2.5 text-center">
                                  {row.variationType === 'excess' ? (
                                    <span className="inline-block px-2 py-0.5 text-[9.5px] font-black rounded-full bg-purple-100 text-purple-800 uppercase">
                                      EXCESS WEIGHT
                                    </span>
                                  ) : row.variationType === 'short' ? (
                                    <span className="inline-block px-2 py-0.5 text-[9.5px] font-black rounded-full bg-amber-100 text-amber-800 uppercase">
                                      SHORT WEIGHT
                                    </span>
                                  ) : (
                                    <span className="inline-block px-2 py-0.5 text-[9.5px] font-black rounded-full bg-emerald-100 text-emerald-800 uppercase">
                                      WITHIN TOLERANCE
                                    </span>
                                  )}
                                  <div className="text-[9px] text-slate-500 mt-0.5">{row.policyLabel}</div>
                                </td>
                                <td className="p-2.5 text-right font-mono">
                                  <div className="font-black text-purple-800">{row.deductionQtyKg.toLocaleString('en-IN')} kg</div>
                                  <div className="text-[9.5px] font-bold text-purple-600">
                                    ({row.deductionQtyMt.toFixed(3)} MT / {row.deductionQtyQtl.toFixed(2)} Qtl)
                                  </div>
                                </td>
                                <td className="p-2.5 text-right font-mono text-[10px]">
                                  <div>Sauda: <span className="font-bold">₹{row.saudaRate.toLocaleString('en-IN')}/Qtl</span></div>
                                  <div>Last MR: <span className="font-bold">₹{row.lastMrRate.toLocaleString('en-IN')}/Qtl</span></div>
                                  <div className="text-amber-700 font-black">Diff: ₹{row.rateDiff.toLocaleString('en-IN')}/Qtl</div>
                                </td>
                                <td className="p-2.5 text-right font-mono">
                                  <div className="text-xs font-black text-rose-600">
                                    ₹{row.deductionAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </div>
                                  <div className="text-[9.5px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded inline-block mt-0.5">
                                    {row.deductionQtyQtl.toFixed(2)} Qtl × ₹{row.rateDiff}/Qtl
                                  </div>
                                </td>
                                <td className="p-2.5 text-center space-y-1">
                                  <div>
                                    {row.isLocked ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-black rounded-full bg-emerald-100 text-emerald-800">
                                        <Lock className="w-2.5 h-2.5" />
                                        SAVED &amp; LOCKED
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold rounded-full bg-slate-100 text-slate-700">
                                        CALCULATED
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center justify-center gap-1">
                                    {row.mrBreakdown && row.mrBreakdown.length > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => setExpandedShortExcessPo(isExpanded ? null : row.poNo)}
                                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[9.5px] font-bold inline-flex items-center gap-1 cursor-pointer transition"
                                        title="Toggle Multi-MR Breakdown"
                                      >
                                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                        <span>MRs ({row.mrBreakdown.length})</span>
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => setSelectedSettlementPo(row.rawPoObject)}
                                      className="px-2 py-1 bg-[#D94B5A] hover:bg-[#c03948] text-white rounded-lg text-[9.5px] font-bold inline-flex items-center gap-1 cursor-pointer shadow-xs transition"
                                      title="Open Extra & Short Weight & Rate Settlement Trail"
                                    >
                                      <Eye className="w-3 h-3" />
                                      <span>Settlement</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>

                              {/* Expandable Grade-Wise Multi-MR Breakdown (Matching Screenshot 2 & 3) */}
                              {isExpanded && row.mrBreakdown && row.mrBreakdown.length > 0 && (
                                <tr className="bg-slate-50/90">
                                  <td colSpan={10} className="p-3 border-t border-b border-slate-200">
                                    <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-2">
                                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                        <div className="text-[11px] font-black uppercase text-slate-800">
                                          MILL INSPECTION FINAL RECEIPT CLAIM (GRADE-WISE MULTI-MR BREAKDOWN) — PO: {row.poNo}
                                        </div>
                                        <div className="text-[10.5px] font-mono font-bold text-slate-700">
                                          Sauda Material Value: ₹{row.saudaMaterialValue.toLocaleString('en-IN')} • Deduction: ₹{row.deductionAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} • Final Payable: <span className="text-emerald-700 font-black">₹{row.totalFinalPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                      </div>

                                      <table className="w-full text-[10.5px] text-left border-collapse">
                                        <thead>
                                          <tr className="bg-rose-50 text-slate-700 font-black uppercase text-[9.5px] border-b border-rose-100">
                                            <th className="p-2">MR NO</th>
                                            <th className="p-2">MR DATE</th>
                                            <th className="p-2">GRADE</th>
                                            <th className="p-2">MARKA</th>
                                            <th className="p-2">CROP YEAR</th>
                                            <th className="p-2 text-right">BAGS</th>
                                            <th className="p-2 text-right">GROSS WEIGHT</th>
                                            <th className="p-2 text-right">NET WEIGHT</th>
                                            <th className="p-2 text-right bg-amber-50/60">FINAL CLAIM</th>
                                            <th className="p-2 text-right">FINAL CLAIM (QTL)</th>
                                            <th className="p-2 text-right">SAUDA SATTA RATE</th>
                                            <th className="p-2 text-right">MR SATTA RATE</th>
                                            <th className="p-2 text-right">RATE DIFF</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-mono">
                                          {row.mrBreakdown.map((m: any, mIdx: number) => (
                                            <tr key={mIdx} className="hover:bg-slate-50">
                                              <td className="p-2 font-black text-slate-900">{m.mrNo}</td>
                                              <td className="p-2 text-slate-700">{m.mrDate || '-'}</td>
                                              <td className="p-2 font-bold">{m.grade}</td>
                                              <td className="p-2 text-slate-600">{m.marka}</td>
                                              <td className="p-2 text-slate-600">{m.cropYear}</td>
                                              <td className="p-2 text-right font-bold">{m.bags}</td>
                                              <td className="p-2 text-right">
                                                <div className="font-bold">{m.grossKg.toLocaleString('en-IN')} kg</div>
                                                <div className="text-[9px] text-slate-400">({m.grossMt.toFixed(3)} MT)</div>
                                              </td>
                                              <td className="p-2 text-right">
                                                <div className="font-bold">{m.netKg.toLocaleString('en-IN')} kg</div>
                                                <div className="text-[9px] text-slate-400">({m.netMt.toFixed(3)} MT)</div>
                                              </td>
                                              <td className="p-2 text-right bg-amber-50/40">
                                                <div className="font-black text-slate-900">{m.finalClaimKg.toLocaleString('en-IN')} kg</div>
                                                <div className="text-[9px] text-slate-500">({m.finalClaimMt.toFixed(3)} MT)</div>
                                                <span className={`inline-block px-1.5 py-0.2 text-[8.5px] font-bold rounded mt-0.5 ${
                                                  m.claimBasis.includes('Gross')
                                                    ? 'bg-amber-200 text-amber-900'
                                                    : 'bg-blue-100 text-blue-800'
                                                }`}>
                                                  {m.claimBasis}
                                                </span>
                                              </td>
                                              <td className="p-2 text-right font-black text-slate-900">{m.finalClaimQtl.toFixed(2)} Qtl</td>
                                              <td className="p-2 text-right">₹{m.saudaSattaRate.toLocaleString('en-IN')} / Qtl</td>
                                              <td className="p-2 text-right">₹{m.mrSattaRate.toLocaleString('en-IN')} / Qtl</td>
                                              <td className="p-2 text-right font-bold">₹{m.rateDiff.toLocaleString('en-IN')}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                        <tfoot className="bg-slate-100 font-mono font-black text-[10.5px] border-t border-slate-300">
                                          <tr>
                                            <td colSpan={5} className="p-2 text-right uppercase">TOTAL SUMMED FINAL RECEIPT CLAIM:</td>
                                            <td className="p-2 text-right">
                                              {row.mrBreakdown.reduce((acc: number, cur: any) => acc + (cur.bags || 0), 0)}
                                            </td>
                                            <td className="p-2 text-right">
                                              {row.mrBreakdown.reduce((acc: number, cur: any) => acc + (cur.grossKg || 0), 0).toLocaleString('en-IN')} kg
                                            </td>
                                            <td className="p-2 text-right">
                                              {row.mrBreakdown.reduce((acc: number, cur: any) => acc + (cur.netKg || 0), 0).toLocaleString('en-IN')} kg
                                            </td>
                                            <td className="p-2 text-right bg-amber-100/70 text-indigo-900">
                                              {row.totalReceivedKg.toLocaleString('en-IN')} kg ({row.totalReceivedMt.toFixed(3)} MT)
                                            </td>
                                            <td className="p-2 text-right">{row.totalReceivedQtl.toFixed(2)} Qtl</td>
                                            <td colSpan={3} className="p-2 text-right italic text-slate-600">
                                              {row.formulaText}
                                            </td>
                                          </tr>
                                        </tfoot>
                                      </table>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })
                      )}
                    </tbody>
                    {filteredShortExcessList.length > 0 && (
                      <tfoot className="bg-slate-900 text-white font-bold text-[11px] font-mono">
                        <tr>
                          <td colSpan={3} className="p-2.5 uppercase font-sans">
                            GRAND TOTAL ({filteredShortExcessList.length} P.Os)
                          </td>
                          <td className="p-2.5 text-right">
                            {filteredShortExcessList.reduce((a, c) => a + c.contractKg, 0).toLocaleString('en-IN')} kg
                            <div className="text-[9.5px] text-slate-400">
                              ({filteredShortExcessList.reduce((a, c) => a + c.contractQtl, 0).toFixed(2)} Qtl)
                            </div>
                          </td>
                          <td className="p-2.5 text-right">
                            {filteredShortExcessList.reduce((a, c) => a + c.totalReceivedKg, 0).toLocaleString('en-IN')} kg
                            <div className="text-[9.5px] text-slate-400">
                              ({filteredShortExcessList.reduce((a, c) => a + c.totalReceivedQtl, 0).toFixed(2)} Qtl)
                            </div>
                          </td>
                          <td className="p-2.5 text-center text-slate-300 text-[10px] font-sans">
                            Excess &amp; Short
                          </td>
                          <td className="p-2.5 text-right text-purple-300">
                            {filteredShortExcessList.reduce((a, c) => a + c.deductionQtyKg, 0).toLocaleString('en-IN')} kg
                            <div className="text-[9.5px]">
                              ({filteredShortExcessList.reduce((a, c) => a + c.deductionQtyQtl, 0).toFixed(2)} Qtl)
                            </div>
                          </td>
                          <td className="p-2.5 text-right text-slate-400 text-[10px] font-sans">
                            Quintal × Rate/Qtl
                          </td>
                          <td className="p-2.5 text-right text-amber-300 text-xs font-black">
                            ₹{filteredShortExcessList.reduce((a, c) => a + c.deductionAmount, 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-2.5 text-center text-emerald-300 text-[10px] font-sans">
                            Verified
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Interactive Extra & Short Weight & Rate Settlement Modal */}
      {selectedSettlementPo && (
        <ExcessShortSettlementModal
          po={selectedSettlementPo}
          onClose={() => {
            setSelectedSettlementPo(null);
            loadReportsData();
          }}
          onSaveSuccess={() => {
            setSelectedSettlementPo(null);
            loadReportsData();
          }}
        />
      )}
    </div>
  );
};
