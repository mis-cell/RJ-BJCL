import React, { useState, useEffect, useMemo, useRef } from "react";
import { useLiveAutoRefresh } from "../hooks/useLiveAutoRefresh";
import { motion, AnimatePresence } from "motion/react";
import Papa from "papaparse";
import { 
  AlertTriangle,
  CheckCircle2,
  ArrowLeft
} from "lucide-react";
import LegacyLayout from "../components/LegacyLayout";
import { supabase } from "../lib/supabase";
import { dbModule } from "../services/dbModule";
import { cn, sanitizeCsvData } from "../lib/utils";
import { enforceEditOrDeletePermission, canEditOrDelete, canViewCompletedData, isL5OrAdmin } from "../lib/permissions";
import { findMatchedPoItem, parseGridOrItems, getColSettRate, calculateSattaDeduction } from "../utils/paymentCalculations";
import { setCachedSattaDiffs, getCachedSattaDiffs } from "../services/sattaCalculation";
import {
  resolveGradeName,
  resolveAgencyName,
  resolveMarkaName,
  resolveAreaName,
  buildSettlementCol,
  buildAlignedSettlementColumns,
  fetchPoAndItemDetails,
  fetchSaudaCheckpointDeduction,
  isLastMrForPo,
  getPoContractLorryCount,
  getUniquePoLorryGroups,
  deduplicateArrivalItems
} from "../services/settlementService";

import {
  SettlementDeductionItem,
  SettlementMaster,
  SettlementDetailColumn,
  emptyDetailColumn,
  getColWtMt,
  getColAmount,
  getEffectiveColSettRate,
  calculateWeightedRatePerMT,
  initialMaster,
  parseDateOnly,
  formatToInputDate,
  isApmcExemptArea,
  isSettlementApmcExempt
} from "../types/settlement.types";

export {
  getColWtMt,
  getColAmount,
  getEffectiveColSettRate,
  calculateWeightedRatePerMT,
  emptyDetailColumn,
  initialMaster,
  parseDateOnly,
  formatToInputDate,
  isApmcExemptArea,
  isSettlementApmcExempt
};
export type {
  SettlementDeductionItem,
  SettlementMaster,
  SettlementDetailColumn
};

import SettlementRegisterView from "../components/settlement/SettlementRegisterView";
import SettlementMasterHeaderCard from "../components/settlement/SettlementMasterHeaderCard";
import SettlementMetricsRibbon from "../components/settlement/SettlementMetricsRibbon";
import SettlementValuationCard from "../components/settlement/SettlementValuationCard";
import SettlementSpecificationsGrid from "../components/settlement/SettlementSpecificationsGrid";
import SettlementPrintModal from "../components/settlement/SettlementPrintModal";
import SettlementAuditOverwriteModal from "../components/settlement/SettlementAuditOverwriteModal";

export function parseDateToObj(dateVal: any): Date | null {
  if (!dateVal) return null;
  const str = String(dateVal).trim();
  if (!str) return null;

  // DD-MM-YYYY or DD/MM/YYYY
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}/.test(str)) {
    const parts = str.split(/[-/]/);
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

  // YYYY-MM-DD
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(str)) {
    const parts = str.split(/[-/]/);
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

export function calculateDeliveryDelayDays(deliveryToDateVal: any, arrivalDateVal: any): number {
  const toDate = parseDateToObj(deliveryToDateVal);
  const arrDate = parseDateToObj(arrivalDateVal);
  if (!toDate || !arrDate) return 0;

  toDate.setHours(0, 0, 0, 0);
  arrDate.setHours(0, 0, 0, 0);

  if (arrDate.getTime() <= toDate.getTime()) return 0;

  const diffMs = arrDate.getTime() - toDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export function useSettlementWorkflow({ onClose, onLogEvent }: { onClose?: () => void; onLogEvent?: (event: string, details: string) => void }) {
  // Page switching & Lists
  const [viewMode, setViewMode] = useState<'dashboard' | 'entry'>('dashboard');
  const [loading, setLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Auto-populated dropdown lists
  const [settledList, setSettledList] = useState<any[]>([]);
  const [inspections, setInspections] = useState<any[]>([]);
  
  // Real-time PO fields & statistics tracking
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [selectedPoNo, setSelectedPoNo] = useState<string>('');
  const [selectedPoData, setSelectedPoData] = useState<any>(null);
  const [poStats, setPoStats] = useState<{
    contractQty: number;
    receivedQty: number;
    settledQty: number;
    pendingQty: number;
    customReceivedQty: number;
    pendingReceivedQty: number;
    dbPendingReceived: number;
  } | null>(null);

  const [customSettlementRecords, setCustomSettlementRecords] = useState<any[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [showSuccessAnim, setShowSuccessAnim] = useState<boolean>(false);
  const [paymentList, setPaymentList] = useState<any[]>([]);
  const [paymentValidationInfo, setPaymentValidationInfo] = useState<{ mrNo: string; poNo: string; paidAmount: number; voucherNo: string; advanceDone?: string } | null>(null);
  
  // Overwrite Authorization / Audit modal state
  const [showAuditOverwriteModal, setShowAuditOverwriteModal] = useState<boolean>(false);
  const [auditOverwriteInfo, setAuditOverwriteInfo] = useState<{
    activeWeight: number;
    allowedWeight: number;
    selectedPoNo: string;
    targetMrNo: string;
  } | null>(null);

  const syncPaymentModuleData = async (mrNo: string, poNo: string): Promise<{ totalPaid: number; payDetails: any[]; hasMatchedPayment: boolean }> => {
    try {
      const cleanMr = (mrNo || '').replace(/#/g, '').trim();
      const cleanPo = (poNo || '').replace(/#/g, '').trim();

      // 1. Direct targeted queries for this specific MR number to ensure instant, complete matching even with pagination
      let targetedDetails: any[] = [];
      let targetedPayments: any[] = [];

      if (supabase && cleanMr) {
        try {
          const { data: dData } = await supabase
            .from('payment_details')
            .select('*')
            .or(`mr_no.eq.${cleanMr},mr_no.ilike.${cleanMr}`);
          if (dData && dData.length > 0) targetedDetails.push(...dData);
        } catch (e) {}

        try {
          const { data: pData } = await supabase
            .from('payment_master')
            .select('*')
            .or(`mr_no.eq.${cleanMr},mr_no.ilike.${cleanMr},arrival_no.eq.${cleanMr}`);
          if (pData && pData.length > 0) {
            targetedPayments.push(...pData);
            const vNos = Array.from(new Set(pData.map(p => p.voucher_no).filter(Boolean)));
            if (vNos.length > 0) {
              const { data: vDet } = await supabase
                .from('payment_details')
                .select('*')
                .in('voucher_no', vNos);
              if (vDet && vDet.length > 0) targetedDetails.push(...vDet);
            }
          }
        } catch (e) {}
      }

      // Also search by cleanPo if provided and no MR was specified
      if (supabase && cleanPo && !cleanMr && targetedPayments.length === 0) {
        try {
          const { data: poPayData } = await supabase
            .from('payment_master')
            .select('*')
            .or(`po_no.eq.${cleanPo},po_no.ilike.${cleanPo}`);
          if (poPayData && poPayData.length > 0) {
            targetedPayments.push(...poPayData);
            const vNos = Array.from(new Set(poPayData.map(p => p.voucher_no).filter(Boolean)));
            if (vNos.length > 0) {
              const { data: vDet } = await supabase
                .from('payment_details')
                .select('*')
                .in('voucher_no', vNos);
              if (vDet && vDet.length > 0) targetedDetails.push(...vDet);
            }
          }
        } catch (e) {}
      }

      // 2. Fetch full lists with multi-page support via dbModule.fetchAll (so >1000 rows are not truncated)
      const allPayments = await dbModule.fetchAll('payment_master').catch(() => []);
      const allDetails = await dbModule.fetchAll('payment_details').catch(() => []);

      // Merge targeted details into allDetails
      const detailsMap = new Map<string, any>();
      allDetails.forEach((d: any) => {
        const key = d.detail_id || `${d.voucher_no || ''}_${d.col_index || ''}_${d.mr_no || ''}`;
        detailsMap.set(key, d);
      });
      targetedDetails.forEach((d: any) => {
        const key = d.detail_id || `${d.voucher_no || ''}_${d.col_index || ''}_${d.mr_no || ''}`;
        detailsMap.set(key, d);
      });
      const details = Array.from(detailsMap.values());

      // Merge targeted payments into allPayments
      const paymentsMap = new Map<string, any>();
      allPayments.forEach((p: any) => {
        const key = p.payment_id || p.voucher_no || `${p.mr_no}_${p.po_no}`;
        paymentsMap.set(key, p);
      });
      targetedPayments.forEach((p: any) => {
        const key = p.payment_id || p.voucher_no || `${p.mr_no}_${p.po_no}`;
        paymentsMap.set(key, p);
      });
      const payments = Array.from(paymentsMap.values());

      setPaymentList(payments);

      const cleanStr = (s: string) => (s || '').replace(/#/g, '').replace(/[\s\-\/]/g, '').trim().toLowerCase();
      const extractCoreMrToken = (s: string) => {
        const raw = String(s || '').replace(/#/g, '').trim().toUpperCase();
        const withoutPrefix = raw.replace(/^(MR|AMAD|TEMP|FA|BJCL)[-\/\s]*/i, '').replace(/^20\d{2}-20\d{2}\//, '');
        const digits = withoutPrefix.replace(/[^0-9]/g, '').replace(/^0+/, '');
        return digits || cleanStr(s);
      };
      const exactMrMatch = (a: string, b: string) => {
        const ca = cleanStr(a);
        const cb = cleanStr(b);
        if (!ca || !cb) return false;
        if (ca === cb) return true;
        const da = extractCoreMrToken(a);
        const db = extractCoreMrToken(b);
        return Boolean(da && db && da === db);
      };

      const targetMrClean = cleanStr(mrNo);

      // If no MR is selected yet, do not aggregate payments across the whole PO into On/Ac Adv
      if (!targetMrClean) {
        setPaymentValidationInfo(null);
        setMasterData(prev => ({
          ...prev,
          final_on_ac_adv: 0
        }));
        return { totalPaid: 0, payDetails: [], hasMatchedPayment: false };
      }

      // Collect voucher numbers linked via payment_details table matching target MR strictly
      const vouchersFromDetails = new Set<string>();
      const matchedDetailsList: any[] = [];
      details.forEach((d: any) => {
        if (exactMrMatch(d.mr_no, mrNo)) {
          if (d.voucher_no) vouchersFromDetails.add(d.voucher_no);
          matchedDetailsList.push(d);
        }
      });

      // Priority 1A: Strictly match payment_master rows whose mr_no matches target mrNo
      let matchingPayments: any[] = payments.filter((p: any) => {
        const st = String(p.status || '').toLowerCase().trim();
        if (st === 'cancelled' || st === 'rejected') return false;
        return exactMrMatch(p.mr_no, mrNo);
      });

      // Priority 1B: Fallback to voucher match or arrival_no ONLY for payment rows that do NOT have a different mr_no
      if (matchingPayments.length === 0) {
        matchingPayments = payments.filter((p: any) => {
          const st = String(p.status || '').toLowerCase().trim();
          if (st === 'cancelled' || st === 'rejected') return false;
          const pMr = String(p.mr_no || '').trim();
          // Never match a payment record that explicitly belongs to a different MR number (e.g. MR01323 vs MR01324)
          if (pMr && !exactMrMatch(pMr, mrNo)) return false;
          const isVoucherMatch = Boolean(p.voucher_no && vouchersFromDetails.has(p.voucher_no));
          return (
            isVoucherMatch ||
            exactMrMatch(p.arrival_no, mrNo) ||
            exactMrMatch(p.payable_bill_no, mrNo)
          );
        });
      }

      // Filter matchedDetailsList to only belong to the matched payment vouchers (or target MR)
      const matchedVoucherSet = new Set(matchingPayments.map(p => p.voucher_no).filter(Boolean));
      const primaryVoucherNo = matchingPayments[0]?.voucher_no || '';
      if (matchedVoucherSet.size > 0) {
        const filteredDetails = details.filter((d: any) =>
          (d.voucher_no && matchedVoucherSet.has(d.voucher_no)) || exactMrMatch(d.mr_no, mrNo)
        );
        if (filteredDetails.length > 0) {
          matchedDetailsList.length = 0;
          matchedDetailsList.push(...filteredDetails);
        }
      }

      // Deduplicate matchedDetailsList by col_index (preferring primaryVoucherNo) so a single column is never duplicated
      if (matchedDetailsList.length > 1) {
        const byColIdx = new Map<number, any>();
        const unindexed: any[] = [];
        for (const d of matchedDetailsList) {
          const cIdx = Number(d.col_index || 0);
          if (cIdx > 0) {
            const existing = byColIdx.get(cIdx);
            if (!existing) {
              byColIdx.set(cIdx, d);
            } else if (primaryVoucherNo && d.voucher_no === primaryVoucherNo && existing.voucher_no !== primaryVoucherNo) {
              byColIdx.set(cIdx, d);
            }
          } else {
            unindexed.push(d);
          }
        }
        matchedDetailsList.length = 0;
        matchedDetailsList.push(...Array.from(byColIdx.values()).sort((a, b) => Number(a.col_index) - Number(b.col_index)), ...unindexed);
      }

      // Ensure satta differentials are cached for Sett Rate calculation
      if (supabase && getCachedSattaDiffs().length === 0) {
        try {
          const { data: sattaRes } = await supabase.from('satta_differentials').select('*');
          if (sattaRes && sattaRes.length > 0) setCachedSattaDiffs(sattaRes);
        } catch (e) {}
      }

      // Live-update detailCols with Payment Operations -> Details fields (preserving original PO rate in rate_value!)
      if (matchedDetailsList.length > 0) {
        setDetailCols(prevCols => {
          const hasAnyActivePrevCol = prevCols.some(c => Number(c.arr_qty_wt) > 0 || Number(c.quantity) > 0);
          const usedPayDetails = new Set<any>();

          return prevCols.map(col => {
            const isColActive = Number(col.arr_qty_wt) > 0 || Number(col.quantity) > 0;
            // If inspection/arrival columns are already populated on screen, never activate an empty column from payment_details
            if (hasAnyActivePrevCol && !isColActive) {
              return col;
            }

            let match = matchedDetailsList.find(pd => !usedPayDetails.has(pd) && Number(pd.col_index) === col.col_index);
            if (!match && isColActive) {
              match = matchedDetailsList.find(pd => {
                if (usedPayDetails.has(pd)) return false;
                const pdColIdx = Number(pd.col_index || 0);
                // Never steal a payment_details row that explicitly belongs to a different col_index
                if (pdColIdx > 0 && pdColIdx !== col.col_index) return false;
                const pdGrade = (resolveGradeName(pd.grade, gradeMasterList) || String(pd.grade || '')).trim().toUpperCase();
                const colGrade = (resolveGradeName(col.grade, gradeMasterList) || String(col.grade || '')).trim().toUpperCase();
                return Boolean(pdGrade && colGrade && pdGrade === colGrade);
              });
            }

            if (match) {
              usedPayDetails.add(match);
              const origRate = Number(match.rate_value) > 0 ? Number(match.rate_value) : Number(col.rate_value || 0);
              let prem = Number(match.premium) || 0;
              if (!prem && matchingPayments.length > 0) {
                const pMasterPremRate = Number(matchingPayments[0].summary_premium_amount || 0);
                if (pMasterPremRate > 0) prem = pMasterPremRate;
                else if (Number(matchingPayments[0].val_premium_amt || 0) > 0) {
                  const pWeight = Number(matchingPayments[0].electronic_scale_net || matchingPayments[0].challan_weight || 0);
                  const pQtl = pWeight > 0 ? (pWeight <= 50 ? pWeight * 10 : pWeight) : 0;
                  if (pQtl > 0) {
                    prem = Number((Number(matchingPayments[0].val_premium_amt) / pQtl).toFixed(2));
                  }
                }
              }
              if (!prem) prem = Number(col.premium || 0);

              const settPct = match.sett_pct !== undefined && match.sett_pct !== null && !isNaN(Number(match.sett_pct)) && Number(match.sett_pct) >= 0
                ? Number(match.sett_pct)
                : (Number(col.gd_sett) > 0 ? Number(col.gd_sett) : Number(col.gd_claim || 0));

              const sattaObj = calculateSattaDeduction(
                col.grade || match.grade,
                origRate,
                settPct,
                getCachedSattaDiffs(),
                gradeMasterList.map((g: any) => ({ code: g.grade_code || g.code || g.id, name: g.grade_name || g.name || g.grade })),
                col.po_items,
                match.lower_grade || col.lower_grade,
                match.lower_grade_rate ?? col.lower_grade_rate,
                prevCols
              );

              const pdDedRate = (match.deduction_rate !== undefined && match.deduction_rate !== null && !isNaN(Number(match.deduction_rate)))
                ? Number(match.deduction_rate)
                : sattaObj.deduction;

              const pdSettRate = (match.sett_rate !== undefined && match.sett_rate !== null && Number(match.sett_rate) > 0)
                ? Number(match.sett_rate)
                : (origRate > 0 ? Number((origRate + prem - pdDedRate).toFixed(2)) : 0);

              const qtyVal = Number(col.quantity) > 0 ? Number(col.quantity) : (Number(match.quantity) > 0 ? Number(match.quantity) : 0);
              const wtMt = getColWtMt(col) > 0 ? getColWtMt(col) : (Number(match.arr_qty_wt) > 0 ? Number(match.arr_qty_wt) : 0);
              const qtyQtl = wtMt > 0 ? Number((wtMt * 10).toFixed(2)) : (Number(match.quantity_qtl) > 0 ? Number(match.quantity_qtl) : 0);
              const colAmt = (match.amount !== undefined && match.amount !== null && Number(match.amount) > 0)
                ? Number(match.amount)
                : (qtyQtl > 0 && pdSettRate > 0 ? Number((qtyQtl * pdSettRate).toFixed(2)) : 0);

              return {
                ...col,
                grade: match.grade || col.grade,
                area: match.area || col.area,
                agency: match.agency || col.agency,
                marka_crop: match.marka_crop || col.marka_crop,
                quantity: qtyVal,
                arr_qty_wt: wtMt,
                min_qty_wt: Number(col.min_qty_wt) > 0 ? Number(col.min_qty_wt) : (wtMt > 0 ? Number((wtMt * 0.97).toFixed(3)) : 0),
                wt_quantity: Number(col.wt_quantity) > 0 ? Number(col.wt_quantity) : (qtyVal > 0 && wtMt > 0 ? Math.round((wtMt * 1000) / qtyVal) : 0),
                rate_value: origRate,
                premium: prem,
                sett_pct: settPct,
                gd_sett: settPct,
                deduction_rate: pdDedRate,
                sett_rate: pdSettRate,
                quantity_qtl: qtyQtl,
                amount: colAmt,
                lower_grade: match.lower_grade || sattaObj.targetGradeName || col.lower_grade,
                target_lower_grade: sattaObj.targetGradeName,
                lower_grade_rate: match.lower_grade_rate ?? sattaObj.lowerRate ?? col.lower_grade_rate,
                grade_diff: sattaObj.diff
              };
            }
            return col;
          });
        });
      }

      if (matchingPayments.length > 0) {
        // Respect "Advance Payment Done? *" (advance_payment_done): if "No", Advance Done is 0!
        const totalPaid = matchingPayments.reduce((sum, p) => {
          const advDoneRaw = String(p.advance_payment_done ?? 'Yes').trim().toLowerCase();
          const isAdvanceNo = advDoneRaw === 'no' || advDoneRaw === 'false' || p.advance_payment_done === false;
          if (isAdvanceNo) return sum;
          return sum + Number(p.paid_amount !== undefined && p.paid_amount !== null ? p.paid_amount : (p.total_amount || 0));
        }, 0);
        const firstMatch = matchingPayments[0];
        const advDoneLabel = matchingPayments.some(p => {
          const r = String(p.advance_payment_done ?? 'Yes').trim().toLowerCase();
          return r !== 'no' && r !== 'false' && p.advance_payment_done !== false;
        }) ? 'Yes' : 'No';

        setPaymentValidationInfo({
          mrNo: firstMatch.mr_no || mrNo,
          poNo: firstMatch.po_no || poNo,
          paidAmount: totalPaid,
          voucherNo: matchingPayments.map(p => p.voucher_no || 'N/A').join(', '),
          advanceDone: advDoneLabel
        });
        setMasterData(prev => ({
          ...prev,
          final_on_ac_adv: totalPaid
        }));
        return { totalPaid, payDetails: matchedDetailsList, hasMatchedPayment: true };
      } else {
        setPaymentValidationInfo(null);
        setMasterData(prev => ({
          ...prev,
          final_on_ac_adv: 0
        }));
        return { totalPaid: 0, payDetails: matchedDetailsList, hasMatchedPayment: false };
      }
    } catch (e) {
      console.warn("Payment module sync error:", e);
      return { totalPaid: 0, payDetails: [], hasMatchedPayment: false };
    }
  };

  // Function to calculate 'pending_received' quantity by comparing contract against received sums
  const calculatePendingReceived = (contractQty: number, totalDelivered: number): number => {
    return Math.max(0, Number((contractQty - totalDelivered).toFixed(3)));
  };

  // Form State
  const [isEdit, setIsEdit] = useState(false);
  const [masterData, setMasterData] = useState<SettlementMaster>(initialMaster());
  const [saudaDeductionRecord, setSaudaDeductionRecord] = useState<any>(null);
  const [detailCols, setDetailCols] = useState<SettlementDetailColumn[]>([
    emptyDetailColumn(1), emptyDetailColumn(2), emptyDetailColumn(3), emptyDetailColumn(4)
  ]);
  const [showAllSpecCols, setShowAllSpecCols] = useState(false);
  const [showAllDeductionCols, setShowAllDeductionCols] = useState(false);

  // Helper to calculate total claim percentage for a column
  const getColTotalClaim = (col: SettlementDetailColumn | undefined): number => {
    if (!col) return 0;
    const isColActive = (Number(col.quantity) || 0) > 0 || (Number(col.arr_qty_wt) || 0) > 0 || (Number(col.wt_quantity) || 0) > 0;
    if (!isColActive) return 0;
    const gdVal = Number(col.gd_sett) > 0 ? Number(col.gd_sett) : Number(col.gd_claim || 0);
    const mVal = Number(col.moist_sett) > 0 ? Number(col.moist_sett) : Number(col.moist_claim || 0);
    const dVal = Number(col.dust_sett) > 0 ? Number(col.dust_sett) : Number(col.dust_claim || 0);
    const nVal = Number(col.ncv_sett) > 0 ? Number(col.ncv_sett) : Number(col.ncv_claim || 0);
    return Number((gdVal + mVal + dVal + nVal).toFixed(2));
  };

  // Condition: Only show Settlement Columns if 'Arr. Qty/Wt' is not null / > 0
  const visibleSpecCols = useMemo(() => {
    if (showAllSpecCols) return [1, 2, 3, 4];
    const active = [1, 2, 3, 4].filter(idx => {
      const col = detailCols[idx - 1];
      return col && col.arr_qty_wt !== null && col.arr_qty_wt !== undefined && Number(col.arr_qty_wt) > 0;
    });
    return active.length > 0 ? active : [1, 2, 3, 4];
  }, [detailCols, showAllSpecCols]);

  // Condition: In Active Deductions / Claims Audit Sheet, if Total Claim is 0 then do NOT show in column
  const visibleDeductionCols = useMemo(() => {
    if (showAllDeductionCols) return [1, 2, 3, 4];
    return [1, 2, 3, 4].filter(idx => {
      const col = detailCols[idx - 1];
      const hasArrWt = col && col.arr_qty_wt !== null && col.arr_qty_wt !== undefined && Number(col.arr_qty_wt) > 0;
      const totalClaim = getColTotalClaim(col);
      const poVal = Number(col?.po_grade_sett) > 0 ? Number(col?.po_grade_sett) : Number(col?.po_grade_claim || 0);
      return hasArrWt && (totalClaim > 0 || poVal > 0);
    });
  }, [detailCols, showAllDeductionCols]);

  const [showViewModal, setShowViewModal] = useState(false);
  const [viewModalData, setViewModalData] = useState<{
    master: SettlementMaster;
    details: SettlementDetailColumn[];
  } | null>(null);
  const [deleteConfirmMr, setDeleteConfirmMr] = useState<string | null>(null);

  const handleOpenViewSettlement = async (targetMrNo: string) => {
    if (!targetMrNo) return;
    try {
      setLoading(true);
      const cleanTargetMr = String(targetMrNo).trim();
      let foundMaster: any = null;
      let foundDetails: any[] = [];

      if (supabase) {
        try {
          const { data: mData } = await supabase
            .from('mr_settlement_master')
            .select('*')
            .eq('mr_no', cleanTargetMr)
            .maybeSingle();
          if (mData) foundMaster = mData;

          const { data: dData } = await supabase
            .from('mr_settlement_detail')
            .select('*')
            .eq('mr_no', cleanTargetMr)
            .order('col_index', { ascending: true });
          if (dData && dData.length > 0) foundDetails = dData;
        } catch (e) {}
      }

      if (!foundMaster) {
        foundMaster = settledList.find(
          (m: any) => String(m?.mr_no || '').trim().toUpperCase() === cleanTargetMr.toUpperCase()
        ) || null;
      }

      if (!foundMaster) {
        const localMasters = await dbModule.fetchAll('mr_settlement_master').catch(() => []);
        if (Array.isArray(localMasters)) {
          foundMaster = localMasters.find(
            (m: any) => String(m?.mr_no || '').trim().toUpperCase() === cleanTargetMr.toUpperCase()
          );
        }
      }

      if (foundDetails.length === 0) {
        const localDetails = await dbModule.fetchAll('mr_settlement_detail').catch(() => []);
        if (Array.isArray(localDetails)) {
          foundDetails = localDetails.filter(
            (d: any) => String(d?.mr_no || '').trim().toUpperCase() === cleanTargetMr.toUpperCase()
          );
        }
      }

      const activeMaster = foundMaster || masterData;

      // Also fetch PO details, final_arrival, material_inspection, supplier_master, and payment_details for accurate print preview
      const targetPoForView = activeMaster.po_no || selectedPoNo || '';
      const [{ poData: viewPoData, poDetails: viewPoDetails }, { totalPaid: viewPaidAmt, payDetails: viewPayDetails, hasMatchedPayment: viewHasPay }] = await Promise.all([
        targetPoForView
          ? fetchPoAndItemDetails(targetPoForView, gradeMasterList, agencyMasterList).catch(() => ({ poData: null, poDetails: [], gList: gradeMasterList, agList: agencyMasterList }))
          : Promise.resolve({ poData: null, poDetails: [] }),
        syncPaymentModuleData(cleanTargetMr, targetPoForView).catch(() => ({ totalPaid: 0, payDetails: [], hasMatchedPayment: false }))
      ]);

      let faRecord: any = null;
      let inspRecord: any = null;
      let inspDetailsList: any[] = [];
      let supplierAddress = activeMaster.supplier_address || '';
      let supplierPan = activeMaster.pan_no || '';

      if (supabase) {
        try {
          const [matInspExact, matInspDetRes] = await Promise.all([
            supabase.from('material_inspection').select('*').eq('mr_no', cleanTargetMr).maybeSingle(),
            supabase.from('material_inspection_details').select('*').eq('mr_no', cleanTargetMr).order('srl_no', { ascending: true })
          ]);
          if (matInspExact.data) {
            inspRecord = matInspExact.data;
          } else {
            const { data: matInspFallback } = await supabase.from('material_inspection').select('*').eq('arrival_no', cleanTargetMr).limit(1);
            if (matInspFallback && matInspFallback.length > 0) inspRecord = matInspFallback[0];
          }
          if (matInspDetRes.data) inspDetailsList = matInspDetRes.data;

          const targetArrForFa = inspRecord?.arrival_no || cleanTargetMr;
          const { data: faCandidates } = await supabase
            .from('final_arrival')
            .select('*')
            .or(`final_arrival_no.eq.${cleanTargetMr},mr_no.eq.${cleanTargetMr},final_arrival_no.eq.${targetArrForFa},arrival_no.eq.${targetArrForFa}`);
          if (Array.isArray(faCandidates) && faCandidates.length > 0) {
            const normLorry = (v: any) => String(v || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
            const expectedLorry = normLorry(inspRecord?.lorry_number || activeMaster.lorry_number);
            const matchedFa =
              faCandidates.find((f: any) => String(f.final_arrival_no || '').trim().toUpperCase() === cleanTargetMr.toUpperCase()) ||
              faCandidates.find((f: any) => {
                const fLorry = normLorry(f.lorry_number || f.lorry_no || f.vehicle_no);
                if (expectedLorry && fLorry && expectedLorry !== fLorry) return false;
                const fArr = String(f.final_arrival_no || f.arrival_no || f.mr_no || '').trim().toUpperCase();
                return fArr === String(targetArrForFa).trim().toUpperCase() || fArr === cleanTargetMr.toUpperCase();
              });
            if (matchedFa) faRecord = matchedFa;
          }
        } catch (e) {}

        const supName = (inspRecord?.supplier_name || activeMaster.supplier || faRecord?.supplier || '').trim();
        if (supName && !supplierAddress) {
          try {
            const { data: supData } = await supabase
              .from('supplier_master')
              .select('*')
              .ilike('supplier_name', supName)
              .maybeSingle();
            if (supData) {
              supplierAddress = supData.address || supData.supplier_address || supData.city || '';
              if (!supplierPan) supplierPan = supData.pan_no || supData.pan || '';
            }
          } catch (e) {}
        }
      }

      // Parse deductions if needed
      let deductionsList: SettlementDeductionItem[] = [];
      if (Array.isArray(activeMaster.deductions) && activeMaster.deductions.length > 0) {
        deductionsList = activeMaster.deductions;
      } else if (typeof activeMaster.deductions === 'string' && activeMaster.deductions.trim() !== '') {
        try {
          const parsed = JSON.parse(activeMaster.deductions);
          if (Array.isArray(parsed) && parsed.length > 0) deductionsList = parsed;
        } catch (e) {}
      }

      // Check inspection table or mill_inspection_deduction table if deduction list is still empty or single generic
      if (deductionsList.length === 0 || (deductionsList.length === 1 && !deductionsList[0].deduction_type)) {
        try {
          if (supabase) {
            const { data: millDedList } = await supabase
              .from('mill_inspection_deduction')
              .select('*')
              .or(`mr_no.eq.${cleanTargetMr},arrival_no.eq.${cleanTargetMr}`)
              .order('created_at', { ascending: true });

            if (millDedList && millDedList.length > 0) {
              deductionsList = millDedList.map((d: any) => ({
                deduction_type: d.deduction_type || '',
                deduction_rate: Number(d.deduction_rate) || 0,
                deduction_qty: Number(d.deduction_qty) || 0,
                deduction_amount: Number(d.deduction_amount) || 0
              }));
            } else if (inspRecord) {
              if (Array.isArray(inspRecord.deductions) && inspRecord.deductions.length > 0) {
                deductionsList = inspRecord.deductions;
              } else if (Array.isArray(inspRecord.deduction_types) && inspRecord.deduction_types.length > 0) {
                deductionsList = inspRecord.deduction_types;
              }
            }
          }
        } catch (e) {
          console.warn("Could not load deductions from inspection:", e);
        }
      }

      if (deductionsList.length === 0) {
        const dType = activeMaster.summary_deduction_type || '';
        const dRate = Number(activeMaster.summary_deduction_rate) || 0;
        const dQty = Number(activeMaster.summary_deduction_qty) || (dRate > 0 ? 1 : 0);
        const dAmt = Number(activeMaster.summary_deduction_amount) || (dRate * dQty);

        if (dType.includes('\n') || dType.includes(',') || dType.includes(';')) {
          const parts = dType.split(/[\n,;]+/).map((s: string) => s.trim()).filter(Boolean);
          deductionsList = parts.map((part: string, idx: number) => {
            let rowRate = 0;
            let rowQty = 1;
            let rowAmt = 0;
            const amtMatch = part.match(/₹\s*([0-9.]+)/i);
            const rateMatch = part.match(/@\s*₹?\s*([0-9.]+)/i) || part.match(/₹\s*([0-9.]+)/i);
            const qtyMatch = part.match(/([0-9.]+)\s*@/i) || part.match(/([0-9.]+)\s*(?:bales|units|nos|qntl|kgs)/i);
            if (amtMatch) rowAmt = parseFloat(amtMatch[1]) || 0;
            if (rateMatch) rowRate = parseFloat(rateMatch[1]) || 0;
            if (qtyMatch) rowQty = parseFloat(qtyMatch[1]) || 1;
            if (rowAmt === 0 && rowRate > 0) rowAmt = rowRate * rowQty;
            const cleanType = part.replace(/\(.*\)/g, '').replace(/@.*/g, '').replace(/₹.*/g, '').trim() || part;
            return {
              deduction_type: cleanType,
              deduction_rate: rowRate || (idx === 0 ? dRate : 0),
              deduction_qty: rowQty || (idx === 0 ? dQty : 1),
              deduction_amount: rowAmt || (idx === 0 ? dAmt : 0)
            };
          });
        } else if (dType && !dType.includes('-- SELECT') && (dRate > 0 || dAmt > 0)) {
          deductionsList = [{
            deduction_type: dType,
            deduction_rate: dRate,
            deduction_qty: dQty || 1,
            deduction_amount: dAmt || (dRate * (dQty || 1))
          }];
        }
      }

      const faGridArr = deduplicateArrivalItems(
        parseGridOrItems(
          inspRecord?.specification_grid ||
          inspRecord?.items ||
          inspRecord?.grid_details ||
          faRecord?.specification_grid ||
          faRecord?.items ||
          faRecord?.grid_details
        ),
        gradeMasterList,
        Number(inspRecord?.electronic_net_weight || inspRecord?.challan_material_weight || faRecord?.electronic_net_weight || faRecord?.challan_material_weight || 0),
        Number(inspRecord?.total_bales || inspRecord?.bales || faRecord?.total_bales || faRecord?.bales || 0)
      );
      const cleanInspDetailsList = deduplicateArrivalItems(
        inspDetailsList,
        gradeMasterList,
        Number(inspRecord?.electronic_net_weight || inspRecord?.challan_material_weight || 0),
        Number(inspRecord?.total_bales || inspRecord?.bales || 0)
      );
      const alignedFallbackCols = buildAlignedSettlementColumns(
        viewPoDetails,
        cleanInspDetailsList,
        faGridArr,
        faRecord,
        inspRecord,
        viewPoData || selectedPoData,
        gradeMasterList,
        agencyMasterList,
        markaMasterList,
        areaMasterList,
        viewPayDetails
      );

      const fallbackActiveCount = alignedFallbackCols.filter(
        c => (Number(c.arr_qty_wt) || 0) > 0 || (Number(c.quantity) || 0) > 0
      ).length;
      const hasAuthoritativeInspectionCols = (cleanInspDetailsList.length > 0 || faGridArr.length > 0) && fallbackActiveCount > 0;

      const activeDetails: SettlementDetailColumn[] = [1, 2, 3, 4].map(idx => {
        const existing = Array.isArray(foundDetails) ? foundDetails.find((d: any) => Number(d.col_index) === idx) : null;
        const currentScreenCol = (cleanTargetMr === masterData.mr_no && detailCols[idx - 1]?.grade) ? detailCols[idx - 1] : null;
        const fb = currentScreenCol || alignedFallbackCols[idx - 1] || detailCols[idx - 1] || emptyDetailColumn(idx);
        const isFbActive = (Number(fb.arr_qty_wt) || 0) > 0 || (Number(fb.quantity) || 0) > 0;

        // If Mill Inspection has fewer grades than stale saved details, do not resurrect duplicate inactive columns
        if (existing && (!hasAuthoritativeInspectionCols || isFbActive || idx <= fallbackActiveCount)) {
          const merged: SettlementDetailColumn = {
            ...emptyDetailColumn(idx),
            ...fb,
            ...existing,
            grade: existing.grade || fb.grade,
            area: existing.area || fb.area,
            agency: existing.agency || fb.agency,
            marka_crop: existing.marka_crop || fb.marka_crop,
            rate_value: Number(fb.rate_value) > 0 ? Number(fb.rate_value) : Number(existing.rate_value || 0),
            premium: Number(existing.premium) > 0 ? Number(existing.premium) : Number(fb.premium || 0),
            sett_pct: existing.sett_pct !== undefined && Number(existing.sett_pct) > 0 ? Number(existing.sett_pct) : (Number(existing.gd_sett) > 0 ? Number(existing.gd_sett) : Number(fb.sett_pct || fb.gd_claim || 0)),
            deduction_rate: existing.deduction_rate !== undefined && Number(existing.deduction_rate) > 0 ? Number(existing.deduction_rate) : Number(fb.deduction_rate || 0),
            sett_rate: existing.sett_rate !== undefined && Number(existing.sett_rate) > 0 ? Number(existing.sett_rate) : Number(fb.sett_rate || 0),
            moist_claim: existing.moist_claim !== undefined && Number(existing.moist_claim) > 0 ? Number(existing.moist_claim) : Number(fb.moist_claim || 0),
            moist_sett: existing.moist_sett !== undefined && Number(existing.moist_sett) > 0 ? Number(existing.moist_sett) : Number(fb.moist_sett || 0),
          };
          merged.sett_rate = getEffectiveColSettRate(merged);
          merged.amount = getColAmount(merged);
          return merged;
        }
        return fb;
      });

      const viewApmcFees = await resolveTemporaryArrivalApmcFees({
        mrNo: cleanTargetMr || activeMaster.mr_no || activeMaster.arrival_no,
        faMaster: faRecord,
        inspMaster: inspRecord
      }).catch(() => Number(activeMaster.arival_apmc_fees || 0));

      setViewModalData({
        master: {
          ...activeMaster,
          mr_date: inspRecord?.mr_date || inspRecord?.date || activeMaster.mr_date || faRecord?.date || faRecord?.mr_date || inspRecord?.arrival_date || activeMaster.arrival_date || activeMaster.sett_date,
          po_date: activeMaster.po_date || viewPoData?.po_date || viewPoData?.s_date || inspRecord?.po_date || faRecord?.po_date || '',
          supplier_address: supplierAddress || faRecord?.supplier_address || '',
          consign_no: faRecord?.challan_rr_no || faRecord?.challan_railway_receipt_no || activeMaster.consign_no || faRecord?.challan_no || '',
          consign_date: activeMaster.consign_date || faRecord?.challan_date || faRecord?.po_date || viewPoData?.po_date || '',
          way_bill: activeMaster.way_bill || faRecord?.way_bill_no || faRecord?.way_bill || '',
          pan_no: supplierPan || faRecord?.pan_no || '',
          arival_apmc_fees: viewApmcFees,
          final_on_ac_adv: viewHasPay ? viewPaidAmt : (Number(activeMaster.final_on_ac_adv) || 0),
          deductions: deductionsList
        },
        details: activeDetails
      });
      setShowViewModal(true);
    } catch (err: any) {
      console.error("Failed to load view settlement:", err);
      setErrorMessage("Unable to open settlement view: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const po = masterData.po_no || selectedPoNo;
    const mr = masterData.mr_no;
    if (po || mr) {
      syncPaymentModuleData(mr, po);
    }
  }, [masterData.po_no, masterData.mr_no, selectedPoNo]);

  // Derived options for P.O. and M.R. (from payment_master.mr_no & payment_master.po_no) searchable dropdowns
  const poOptions = React.useMemo(() => {
    const cleanPo = (s: string) => (s || '').replace(/^#/, '').replace(/[\s\-\/]/g, '').trim().toUpperCase();
    const boundPoSet = new Set<string>();
    paymentList.forEach((pay: any) => {
      const st = String(pay.status || '').toLowerCase().trim();
      if (st === 'cancelled' || st === 'rejected') return;
      const mr = String(pay.mr_no || '').trim();
      const p = String(pay.po_no || '').trim().replace(/^#/, '').toUpperCase();
      if (mr && p && p !== 'NO' && p !== 'N/A' && p !== 'NONE' && p !== '-') {
        boundPoSet.add(p);
        boundPoSet.add(cleanPo(p));
      }
    });
    inspections.forEach((insp: any) => {
      const p = String(insp.po_no || insp.mill_po_no || insp.contract_no || '').trim().replace(/^#/, '').toUpperCase();
      if (p && p !== 'NO' && p !== 'N/A' && p !== 'NONE') {
        boundPoSet.add(p);
        boundPoSet.add(cleanPo(p));
      }
    });
    purchaseOrders.forEach((po: any) => {
      const mr = String(po.mr_no || po.final_arrival_no || po.temporary_arrival_no || '').trim().toUpperCase();
      if (mr && mr !== 'NO' && mr !== 'N/A' && mr !== 'NONE') {
        const p = String(po.po_no || '').trim().replace(/^#/, '').toUpperCase();
        if (p) {
          boundPoSet.add(p);
          boundPoSet.add(cleanPo(p));
        }
      }
    });

    const boundPos = purchaseOrders.filter((po: any) => {
      const p = String(po.po_no || '').trim().replace(/^#/, '').toUpperCase();
      if (!p) return false;
      if (selectedPoNo && cleanPo(p) === cleanPo(selectedPoNo)) return true;
      return boundPoSet.has(p) || boundPoSet.has(cleanPo(p));
    });

    const listToUse = boundPos.length > 0 ? boundPos : purchaseOrders;
    return listToUse.map((po: any) => {
      const isDone = po.isCompleted || po.status === 'completed' || po.status === 'settled';
      return {
        value: po.po_no,
        label: `${String(po.po_no || '').replace(/^#+/, '')} (${po.supplier || 'PO'})${isDone ? ' - [COMPLETED]' : ''}`
      };
    });
  }, [purchaseOrders, inspections, paymentList, selectedPoNo]);

  const faOptionsForSelectedPo = React.useMemo(() => {
    const cleanTargetPo = (selectedPoNo || '').trim().replace(/^#/, '').toUpperCase();
    const cleanPo = (s: string) => (s || '').replace(/^#/, '').replace(/[\s\-\/]/g, '').trim().toUpperCase();
    const targetPoNormalized = cleanPo(cleanTargetPo);

    // Primary Source: payment_master table (column: mr_no, and po_no)
    const matchedPayments = paymentList.filter((pay: any) => {
      const st = String(pay.status || '').toLowerCase().trim();
      if (st === 'cancelled' || st === 'rejected') return false;

      const mrVal = String(pay.mr_no || '').trim();
      if (!mrVal || mrVal.toUpperCase() === 'NO' || mrVal.toUpperCase() === 'N/A' || mrVal === '-') return false;

      if (targetPoNormalized) {
        const payPo = String(pay.po_no || '').trim().replace(/^#/, '').toUpperCase();
        const payPoNormalized = cleanPo(payPo);
        if (!payPoNormalized) return false;
        const isPoMatch = payPo === cleanTargetPo || payPoNormalized === targetPoNormalized;
        if (!isPoMatch) return false;
      }

      const isAlreadySettled = settledList.some(
        s => String(s.mr_no || '').trim().toUpperCase() === mrVal.toUpperCase()
      );
      const isCurrentMr =
        masterData.mr_no && String(masterData.mr_no).trim().toUpperCase() === mrVal.toUpperCase();

      return !isAlreadySettled || isCurrentMr || (isEdit && isCurrentMr);
    });

    const seen = new Set<string>();
    const optionsList: { label: string; value: string; details?: string }[] = [];

    matchedPayments.forEach((pay: any) => {
      const mrVal = String(pay.mr_no || '').trim();
      if (!mrVal) return;
      const key = mrVal.toUpperCase();
      if (seen.has(key)) return;
      seen.add(key);

      const matchedInsp = inspections.find(
        (insp: any) => String(insp.mr_no || insp.final_arrival_no || insp.arrival_no || '').trim().toUpperCase() === key
      );
      const lorryVal =
        pay.lorry_number ||
        pay.lorry_no ||
        matchedInsp?.lorry_number ||
        matchedInsp?.lorry_no ||
        matchedInsp?.vehicle_no ||
        '';
      const poVal = String(pay.po_no || '').trim();

      optionsList.push({
        value: mrVal,
        label: lorryVal
          ? `${mrVal} (Lorry: ${lorryVal})`
          : poVal
          ? `${mrVal} (PO: ${poVal})`
          : mrVal,
        details: poVal ? `PO: ${poVal}${pay.supplier ? ` | ${pay.supplier}` : ''}` : undefined
      });
    });

    // Secondary Fallback: also include inspected arrivals (material_inspection / final_arrival) matching selectedPoNo
    inspections.forEach((insp: any) => {
      const mrVal = String(insp.mr_no || insp.final_arrival_no || insp.arrival_no || '').trim();
      if (!mrVal || mrVal.toUpperCase() === 'NO' || mrVal.toUpperCase() === 'N/A' || mrVal === '-') return;
      const key = mrVal.toUpperCase();
      if (seen.has(key)) return;

      const inspPo = String(insp.po_no || insp.mill_po_no || insp.contract_no || '').trim().replace(/^#/, '').toUpperCase();
      const inspPoNormalized = cleanPo(inspPo);

      if (targetPoNormalized) {
        if (!inspPoNormalized) return;
        const isPoMatch = inspPo === cleanTargetPo || inspPoNormalized === targetPoNormalized;
        if (!isPoMatch) return;
      }

      const isAlreadySettled = settledList.some(
        s => String(s.mr_no || '').trim().toUpperCase() === key
      );
      const isCurrentMr =
        masterData.mr_no && String(masterData.mr_no).trim().toUpperCase() === key;

      if (isAlreadySettled && !isCurrentMr && !(isEdit && isCurrentMr)) return;

      seen.add(key);
      const lorryVal = insp.lorry_number || insp.lorry_no || insp.vehicle_no || '';
      const supVal = insp.supplier_name || insp.supplier || '';

      optionsList.push({
        value: mrVal,
        label: lorryVal
          ? `${mrVal} (Lorry: ${lorryVal})`
          : inspPo
          ? `${mrVal} (PO: ${inspPo})`
          : mrVal,
        details: inspPo ? `PO: ${inspPo}${supVal ? ` | ${supVal}` : ''}` : undefined
      });
    });

    optionsList.sort((a, b) => {
      const getSuffix = (val: string) => {
        const m = val.match(/\d+/g);
        return m ? Number(m[m.length - 1]) : 0;
      };
      const suffA = getSuffix(a.value);
      const suffB = getSuffix(b.value);
      if (suffA !== suffB) return suffB - suffA;
      return b.value.localeCompare(a.value);
    });

    if (masterData.mr_no && !seen.has(masterData.mr_no.toUpperCase())) {
      const lorryVal = masterData.lorry_number || masterData.mr_no;
      optionsList.unshift({
        value: masterData.mr_no,
        label: `${masterData.mr_no} (Lorry: ${lorryVal})`
      });
    }

    return optionsList;
  }, [selectedPoNo, paymentList, inspections, settledList, isEdit, masterData.mr_no, masterData.lorry_number]);

  const [gradeMasterList, setGradeMasterList] = useState<any[]>([]);
  const [agencyMasterList, setAgencyMasterList] = useState<any[]>([]);
  const [markaMasterList, setMarkaMasterList] = useState<any[]>([]);
  const [areaMasterList, setAreaMasterList] = useState<any[]>([]);
  const [deductionMasterList, setDeductionMasterList] = useState<any[]>([]);

  
  useLiveAutoRefresh(initPage, [], { 
    tables: [
      'mr_settlement_master', 
      'm_r_settlement', 
      'material_inspection',
      'material_inspection_details',
      'mill_inspection_master',
      'mill_inspection_detail',
      'mill_inspection_deduction',
      'final_arrival', 
      'purchase_master', 
      'payment_master', 
      'temporary_material_received', 
      'sauda_check_point', 
      'sauda_master',
      'clubbed_pomr',
      'return_lorry',
      'return_lorry_details'
    ] 
  });

  // In-memory master registers cache
  const mastersCacheRef = useRef<{ gData?: any[]; agData?: any[]; mDataList?: any[]; aData?: any[]; dData?: any[] }>({});

  // Load dashboards & dropdowns
  async function initPage() {
    if (settledList.length === 0) setLoading(true);
    try {
      if (supabase) {
        // Fetch master registers for lookup (cached in-memory)
        if (!mastersCacheRef.current.gData) {
          const [gData, agData, mDataList, aData, dData, sattaData] = await Promise.all([
            supabase.from('grade_master').select('*').then(r => r.data || [], () => []),
            supabase.from('agency_master').select('*').then(r => r.data || [], () => []),
            supabase.from('marka_master').select('*').then(r => r.data || [], () => []),
            supabase.from('area_master').select('*').then(r => r.data || [], () => []),
            supabase.from('deduction_master').select('*').then(r => r.data || [], () => []),
            supabase.from('satta_differentials').select('*').then(r => r.data || [], () => [])
          ]);
          mastersCacheRef.current = { gData, agData, mDataList, aData, dData };
          setGradeMasterList(gData);
          setAgencyMasterList(agData);
          setMarkaMasterList(mDataList);
          setAreaMasterList(aData);
          setDeductionMasterList(dData);
          if (sattaData && sattaData.length > 0) {
            setCachedSattaDiffs(sattaData);
          }
        }

        // 1. Fetch saved settlements & payments (combining supabase & dbModule.fetchAll for complete lists)
        const [mDataRes, dbSettledRes, payRes, dbPayRes] = await Promise.all([
          supabase.from('mr_settlement_master').select('*').order('created_at', { ascending: false }),
          dbModule.fetchAll('mr_settlement_master').catch(() => []),
          supabase.from('payment_master').select('*').order('created_at', { ascending: false }).then(res => res.data || [], () => []),
          dbModule.fetchAll('payment_master').catch(() => [])
        ]);
        const mergedSettledMap = new Map<string, any>();
        [...(Array.isArray(dbSettledRes) ? dbSettledRes : []), ...(mDataRes?.data || [])].forEach((s: any) => {
          const k = String(s?.mr_no || s?.settlement_id || '').trim();
          if (k) mergedSettledMap.set(k, s);
        });

        const mergedPayMap = new Map<string, any>();
        [...(Array.isArray(dbPayRes) ? dbPayRes : []), ...(payRes || [])].forEach((p: any) => {
          const k = String(p.payment_id || p.voucher_no || `${p.mr_no || ''}_${p.po_no || ''}`).trim();
          if (k) mergedPayMap.set(k, p);
        });
        const payList = Array.from(mergedPayMap.values());
        setPaymentList(payList);

        setSettledList(Array.from(mergedSettledMap.values()));

        // 2. Fetch completed inspections from Mill Inspection Section (material_inspection, final_arrival, clubbed_pomr, return_lorry)
        const [matInspRes, faRes, clubbedRes, returnLorryRes] = await Promise.all([
          supabase.from('material_inspection').select('*').order('created_at', { ascending: false }).then(r => r.data || [], () => []),
          supabase.from('final_arrival').select('*').order('date', { ascending: false }).then(r => r.data || [], () => []),
          dbModule.fetchAll('clubbed_pomr').catch(() => []),
          supabase.from('return_lorry').select('*').then(r => r.data || [], () => [])
        ]);

        // Map any bound PO numbers from final_arrival, clubbed_pomr, and return_lorry by MR/Arrival number
        const mrToBoundPoMap = new Map<string, string>();
        const registerBoundPo = (mrCandidate: any, poCandidate: any, overwrite: boolean = false) => {
          const mrStr = String(mrCandidate || '').trim().toUpperCase();
          const poStr = String(poCandidate || '').trim();
          const poUpper = poStr.toUpperCase();
          if (mrStr && poStr && poUpper !== 'NO' && poUpper !== 'N/A' && poUpper !== 'NONE') {
            if (overwrite || !mrToBoundPoMap.has(mrStr)) {
              mrToBoundPoMap.set(mrStr, poStr);
            }
          }
        };

        if (faRes) {
          for (const fa of faRes) {
            registerBoundPo(fa.mr_no, fa.return_po_no || fa.po_no || fa.contract_no);
            registerBoundPo(fa.final_arrival_no, fa.return_po_no || fa.po_no || fa.contract_no);
            registerBoundPo(fa.arrival_no, fa.return_po_no || fa.po_no || fa.contract_no);
            registerBoundPo(fa.temporary_arrival_no, fa.return_po_no || fa.po_no || fa.contract_no);
          }
        }
        if (clubbedRes && Array.isArray(clubbedRes)) {
          for (const c of clubbedRes) {
            registerBoundPo(c.mr_no, c.po_no);
          }
        }
        if (returnLorryRes && Array.isArray(returnLorryRes)) {
          for (const rl of returnLorryRes) {
            registerBoundPo(rl.mr_no, rl.new_po_no || rl.po_no, true);
            registerBoundPo(rl.final_arrival_no, rl.new_po_no || rl.po_no, true);
          }
        }

        const resolveBoundPoForItem = (item: any): string => {
          const mrCands = [item.mr_no, item.final_arrival_no, item.arrival_no];
          for (const c of mrCands) {
            const k = String(c || '').trim().toUpperCase();
            if (k && mrToBoundPoMap.has(k)) {
              const mapped = mrToBoundPoMap.get(k)!;
              if (mapped.includes('/4')) return mapped; // Prefer 4000-series Return Lorry P.O.
            }
          }
          if (item.return_po_no) return String(item.return_po_no).trim();
          const existingPo = String(item.po_no || item.mill_po_no || item.contract_no || '').trim();
          const existingUpper = existingPo.toUpperCase();
          if (existingPo && existingUpper !== 'NO' && existingUpper !== 'N/A' && existingUpper !== 'NONE') {
            return existingPo;
          }
          const candidates = [item.mr_no, item.final_arrival_no, item.arrival_no, item.temporary_arrival_no, item.ref_arrival_no];
          for (const cand of candidates) {
            const key = String(cand || '').trim().toUpperCase();
            if (key && mrToBoundPoMap.has(key)) {
              return mrToBoundPoMap.get(key)!;
            }
          }
          return '';
        };

        // Build alias sets linking final_arrival_no, mr_no, arrival_no, and temporary_arrival_no for the same lorry
        const arrivalAliasMap = new Map<string, Set<string>>();
        const linkAliases = (...ids: any[]) => {
          const cleanIds = ids
            .map(id => String(id || '').trim().toUpperCase())
            .filter(id => id && id !== 'NO' && id !== 'N/A' && id !== 'NONE');
          if (cleanIds.length === 0) return;
          const mergedSet = new Set<string>(cleanIds);
          for (const id of cleanIds) {
            const existing = arrivalAliasMap.get(id);
            if (existing) {
              existing.forEach(x => mergedSet.add(x));
            }
          }
          for (const id of mergedSet) {
            arrivalAliasMap.set(id, mergedSet);
          }
        };

        if (faRes) {
          for (const fa of faRes) {
            linkAliases(fa.final_arrival_no, fa.mr_no, fa.arrival_no, fa.temporary_arrival_no);
          }
        }
        if (matInspRes) {
          for (const mi of matInspRes) {
            linkAliases(mi.mr_no, mi.final_arrival_no, mi.arrival_no, mi.temporary_arrival_no);
          }
        }

        const combinedInspections: any[] = [];
        const seenMrNos = new Set<string>();

        const checkAndMarkSeen = (item: any): boolean => {
          const rawKeys = [item.final_arrival_no, item.mr_no, item.arrival_no, item.temporary_arrival_no]
            .map(v => String(v || '').trim().toUpperCase())
            .filter(v => v && v !== 'NO' && v !== 'N/A' && v !== 'NONE');
          if (rawKeys.length === 0) return true;
          for (const k of rawKeys) {
            if (seenMrNos.has(k)) return true;
            const aliases = arrivalAliasMap.get(k);
            if (aliases) {
              for (const a of aliases) {
                if (seenMrNos.has(a)) return true;
              }
            }
          }
          for (const k of rawKeys) {
            seenMrNos.add(k);
            const aliases = arrivalAliasMap.get(k);
            if (aliases) {
              aliases.forEach(a => seenMrNos.add(a));
            }
          }
          return false;
        };

        // Priority 1: material_inspection (Mill Inspection primary)
        if (matInspRes) {
          for (const item of matInspRes) {
            const mrKey = item.mr_no || item.final_arrival_no || item.arrival_no;
            if (mrKey && !checkAndMarkSeen(item)) {
              const boundPo = resolveBoundPoForItem(item);
              combinedInspections.push(boundPo ? { ...item, po_no: boundPo } : item);
            }
          }
        }

        // Priority 2: final_arrival
        if (faRes) {
          for (const item of faRes) {
            const mrKey = item.final_arrival_no || item.mr_no || item.arrival_no;
            if (mrKey && !checkAndMarkSeen(item)) {
              if (!item.mr_no) item.mr_no = mrKey;
              if (!item.final_arrival_no) item.final_arrival_no = mrKey;
              const boundPo = resolveBoundPoForItem(item);
              combinedInspections.push(boundPo ? { ...item, po_no: boundPo } : item);
            }
          }
        }

        // Check local storage cache as well
        try {
          const cachedMat = localStorage.getItem("material_inspection_records");
          if (cachedMat) {
            const parsed = JSON.parse(cachedMat);
            if (Array.isArray(parsed)) {
              parsed.forEach((item: any) => {
                const mrKey = item.mr_no || item.final_arrival_no || item.arrival_no;
                if (mrKey && !checkAndMarkSeen(item)) {
                  const boundPo = resolveBoundPoForItem(item);
                  combinedInspections.push(boundPo ? { ...item, po_no: boundPo } : item);
                }
              });
            }
          }
        } catch (e) {}

        setInspections(combinedInspections);

        // 3. Fetch purchase orders list for selection from Final P.O and Sauda Check Point
        const { data: poList } = await supabase
          .from('purchase_master')
          .select('po_no, po_date, broker, supplier, total_contract_mt, status, pending, pending_received')
          .order('po_no', { ascending: false });

        const { data: poArchList } = await supabase
          .from('po_archive')
          .select('po_no, po_date, broker, supplier, total_contract_mt, status, pending')
          .order('po_no', { ascending: false })
          .then(res => res, () => ({ data: [] }));

        const { data: scpPoList } = await supabase
          .from('sauda_check_point')
          .select('po_no, po_date, s_date, broker, broker_name, supplier, supplier_name, quantity, total_contract_mt, status, pending')
          .then(res => res, () => ({ data: [] }));

        const rawCombined = [
          ...((returnLorryRes || []).map((rl: any) => ({
            ...rl,
            po_no: rl.new_po_no || rl.po_no,
            po_date: rl.po_date || rl.s_date,
            broker: rl.broker || rl.broker_name,
            supplier: rl.supplier || rl.supplier_name,
            total_contract_mt: rl.total_contract_mt || rl.received_weight_mt || 0,
            status: 'completed',
            pending: false,
            is_return_lorry: true
          }))),
          ...(poList || []),
          ...(poArchList || []),
          ...((scpPoList || []).map((s: any) => ({
            ...s,
            po_date: s.po_date || s.s_date,
            broker: s.broker_name || s.broker,
            supplier: s.supplier_name || s.supplier,
            total_contract_mt: s.total_contract_mt || s.quantity || 0,
          })))
        ];

        if (rawCombined.length > 0) {
          const poReceivedMap = new Map<string, number>();
          if (combinedInspections && combinedInspections.length > 0) {
            combinedInspections.forEach((item: any) => {
              if (item.po_no) {
                let wtMt = 0;
                if (item.final_receipt_wt && Number(item.final_receipt_wt) > 0) wtMt = Number(item.final_receipt_wt);
                else if (item.weight_qtl && Number(item.weight_qtl) > 0) wtMt = Number(item.weight_qtl) / 10;
                else if (item.electronic_net_weight && Number(item.electronic_net_weight) > 0) {
                  const val = Number(item.electronic_net_weight);
                  wtMt = val > 50 ? val / 10 : val;
                } else if (item.challan_material_weight && Number(item.challan_material_weight) > 0) {
                  const val = Number(item.challan_material_weight);
                  wtMt = val > 50 ? val / 10 : val;
                } else if (item.chalan_wt && Number(item.chalan_wt) > 0) {
                  const val = Number(item.chalan_wt);
                  wtMt = val > 50 ? val / 10 : val;
                }
                poReceivedMap.set(item.po_no, (poReceivedMap.get(item.po_no) || 0) + wtMt);
              }
            });
          }

          const existingPoNos = new Set<string>();
          const processedList: any[] = [];

          rawCombined.forEach(p => {
            if (!p.po_no || existingPoNos.has(p.po_no)) return;
            if (p.status === 'cancelled' || p.status === 'temp' || p.status === 'draft') return;
            if (p.po_no.endsWith('T') || p.po_no.includes('TEMP')) return;

            existingPoNos.add(p.po_no);

            const statusStr = String(p.status || '').trim().toLowerCase();
            const pendingStr = String(p.pending ?? '').trim().toLowerCase();
            const contractWt = Number(p.total_contract_mt) || 0;
            const receivedWt = poReceivedMap.get(p.po_no) || 0;

            const isExplicitCompleted = statusStr === 'completed' || statusStr === 'settled';
            const isPendingFalse = p.pending === false || pendingStr === 'false' || pendingStr === 'no' || p.pending === 0;
            const isWeightCompleted = contractWt > 0 && receivedWt >= (contractWt - 0.05);

            processedList.push({
              ...p,
              isCompleted: isExplicitCompleted || isPendingFalse || isWeightCompleted
            });
          });

          if (combinedInspections && combinedInspections.length > 0) {
            combinedInspections.forEach((item: any) => {
              if (item.po_no && !existingPoNos.has(item.po_no) && !item.po_no.endsWith('T') && !item.po_no.includes('TEMP')) {
                existingPoNos.add(item.po_no);
                processedList.push({
                  po_no: item.po_no,
                  supplier: item.supplier_name || item.supplier || 'Inspection PO',
                  status: item.status || 'completed',
                  isCompleted: true
                });
              }
            });
          }

          if (payList && payList.length > 0) {
            payList.forEach((pay: any) => {
              const pNo = String(pay.po_no || '').trim();
              if (pNo && !existingPoNos.has(pNo) && !pNo.endsWith('T') && !pNo.includes('TEMP')) {
                existingPoNos.add(pNo);
                processedList.push({
                  po_no: pNo,
                  supplier: pay.supplier || pay.party_name || 'Payment PO',
                  broker: pay.broker || '',
                  status: 'completed',
                  isCompleted: false
                });
              }
            });
          }

          setPurchaseOrders(processedList);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      await initPage();
      const currentPo = masterData.po_no || selectedPoNo;
      if (currentPo) {
        await handlePoNoSelection(currentPo, Boolean(masterData.mr_no));
      }
      if (masterData.mr_no) {
        syncPaymentModuleData(masterData.mr_no, currentPo);
      }
      setSuccessMessage('Settlement database, P.O. dropdowns & arrival records refreshed successfully!');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      console.error("Refresh failed:", err);
      setErrorMessage("Refresh failed: " + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const resolveTemporaryArrivalApmcFees = async (params: {
    mrNo?: string | null;
    candidateNos?: (string | undefined | null)[];
    poNo?: string | null;
    lorryNo?: string | null;
    faMaster?: any;
    inspMaster?: any;
  }): Promise<number> => {
    try {
      const cleanCode = (v: any) => String(v || '').trim().replace(/^#/, '').toUpperCase();
      const targetMr = cleanCode(
        params.mrNo ||
        params.faMaster?.final_arrival_no ||
        params.inspMaster?.mr_no ||
        (params.candidateNos && params.candidateNos[0]) ||
        ''
      );

      if (!targetMr) return 0;

      // Step 1: Find record in 'final_arrival' table where 'final_arrival_no' matches the MR number (e.g. MR01326)
      // and extract 'temporary_arrival_no' (e.g. MR01327)
      let tempArrivalNo = '';

      if (
        params.faMaster &&
        cleanCode(params.faMaster.final_arrival_no) === targetMr &&
        params.faMaster.temporary_arrival_no
      ) {
        tempArrivalNo = cleanCode(params.faMaster.temporary_arrival_no);
      }

      if (!tempArrivalNo && supabase) {
        const { data: faRows } = await supabase
          .from('final_arrival')
          .select('final_arrival_no, temporary_arrival_no')
          .ilike('final_arrival_no', targetMr);

        if (faRows && faRows.length > 0) {
          const exactFa =
            faRows.find((r: any) => cleanCode(r.final_arrival_no) === targetMr) ||
            faRows[0];
          tempArrivalNo = cleanCode(exactFa?.temporary_arrival_no);
        }
      }

      if (!tempArrivalNo) {
        const dbFa = await dbModule.fetchAll('final_arrival').catch(() => []);
        const matchedFa = (dbFa || []).find(
          (r: any) => cleanCode(r.final_arrival_no) === targetMr
        );
        if (matchedFa?.temporary_arrival_no) {
          tempArrivalNo = cleanCode(matchedFa.temporary_arrival_no);
        }
      }

      if (!tempArrivalNo) return 0;

      // Step 2: Using 'temporary_arrival_no' (e.g. MR01327), look up in 'temporary_material_received' table
      // where 'temporary_arrival_no' matches, and return 'apmc_fees'
      if (supabase) {
        const { data: tempRows } = await supabase
          .from('temporary_material_received')
          .select('temporary_arrival_no, apmc_fees')
          .ilike('temporary_arrival_no', tempArrivalNo);

        if (tempRows && tempRows.length > 0) {
          const exactTemp =
            tempRows.find((t: any) => cleanCode(t.temporary_arrival_no) === tempArrivalNo) ||
            tempRows[0];
          if (exactTemp && exactTemp.apmc_fees !== undefined && exactTemp.apmc_fees !== null) {
            const feeVal = Number(exactTemp.apmc_fees);
            return isNaN(feeVal) ? 0 : feeVal;
          }
        }
      }

      const dbTemp = await dbModule.fetchAll('temporary_material_received').catch(() => []);
      const matchedTemp = (dbTemp || []).find(
        (t: any) => cleanCode(t.temporary_arrival_no) === tempArrivalNo
      );
      if (matchedTemp && matchedTemp.apmc_fees !== undefined && matchedTemp.apmc_fees !== null) {
        const feeVal = Number(matchedTemp.apmc_fees);
        return isNaN(feeVal) ? 0 : feeVal;
      }

      return 0;
    } catch (e) {
      console.warn("Could not resolve temporary arrival APMC fees:", e);
      return 0;
    }
  };

  const handlePoNoSelection = async (poNo: string, preserveMrNo: boolean = false, explicitMrNo?: string) => {
    setSelectedPoNo(poNo);
    if (!poNo) {
      setSelectedPoData(null);
      setPoStats(null);
      setCustomSettlementRecords([]);
      setSaudaDeductionRecord(null);
      if (!preserveMrNo) {
        setMasterData(prev => ({
          ...prev,
          po_no: '',
          po_date: '',
          broker: '',
          supplier: '',
          chn_supplier: '',
          mr_no: '',
          lorry_number: '',
          arrival_no: '',
          arrival_date: '',
          val_ex_short: 0
        }));
      }
      return;
    }
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      if (!supabase) return;
      
      const cleanPoNo = poNo.trim().replace(/^#/, '');

      // 1. Fetch matching PO master and item details FIRST (checking purchase_master, sauda_check_point, sauda_master, po_archive, and indexedDB)
      const { poData, poDetails: fetchedDetails } = await fetchPoAndItemDetails(cleanPoNo, gradeMasterList, agencyMasterList);

      if (!poData) {
        setSelectedPoData(null);
        setSaudaDeductionRecord(null);
        setErrorMessage(`Could not resolve details for P.O No. ${poNo}`);
        setLoading(false);
        return;
      }

      setSelectedPoData(poData);
      const effectiveMrNo = explicitMrNo !== undefined ? explicitMrNo : (preserveMrNo ? masterData.mr_no : '');
      if (preserveMrNo && effectiveMrNo) {
        await syncPaymentModuleData(effectiveMrNo, poNo);
      }

      // 2. Fetch all mill inspections & final arrivals for this P.O to sum total received quantity in Metric Tons (MT)
      const targetPoVal = poData.po_no || cleanPoNo;
      const [matInspForPoRes, finalArrivalsForPoRes] = await Promise.all([
        supabase.from('material_inspection').select('*').or(`po_no.eq."${targetPoVal}",po_no.eq."${cleanPoNo}",po_no.eq."#${cleanPoNo}"`).then(r => r.data || [], () => []),
        supabase.from('final_arrival').select('*').or(`po_no.eq."${targetPoVal}",po_no.eq."${cleanPoNo}",po_no.eq."#${cleanPoNo}"`).then(r => r.data || [], () => [])
      ]);

      const inspectionsForPo = matInspForPoRes || [];
      const finalArrivalsForPo = finalArrivalsForPoRes || [];

      // Merge newly fetched arrivals into state with alias deduplication so the same lorry is never duplicated
      const incomingList: any[] = [...(inspectionsForPo || []), ...(finalArrivalsForPo || [])];
      let mergedInspectionsSnapshot: any[] = inspections;
      if (incomingList.length > 0) {
        const aliasSet = new Set<string>();
        inspections.forEach(i => {
          [i.final_arrival_no, i.mr_no, i.arrival_no, i.temporary_arrival_no]
            .map(v => String(v || '').trim().toUpperCase())
            .filter(Boolean)
            .forEach(k => aliasSet.add(k));
        });
        const nextList = [...inspections];
        incomingList.forEach(item => {
          const itemKeys = [item.final_arrival_no, item.mr_no, item.arrival_no, item.temporary_arrival_no]
            .map(v => String(v || '').trim().toUpperCase())
            .filter(Boolean);
          if (itemKeys.length > 0 && !itemKeys.some(k => aliasSet.has(k))) {
            itemKeys.forEach(k => aliasSet.add(k));
            nextList.push(item);
          }
        });
        mergedInspectionsSnapshot = nextList;
        setInspections(nextList);
      }

      // Check if current MR is the Last Lorry of this P.O contract
      const isLastMr = effectiveMrNo
        ? isLastMrForPo(effectiveMrNo, cleanPoNo, [...mergedInspectionsSnapshot, ...incomingList], poData)
        : false;

      if (isLastMr) {
        const saudaDed = await fetchSaudaCheckpointDeduction(cleanPoNo);
        setSaudaDeductionRecord(saudaDed);
        const dedAmt = saudaDed ? Math.max(0, Number(saudaDed.deduction_amount) || 0) : 0;
        setMasterData(prev => ({
          ...prev,
          val_ex_short: dedAmt
        }));
      } else {
        setSaudaDeductionRecord(null);
        setMasterData(prev => (prev.val_ex_short !== 0 ? { ...prev, val_ex_short: 0 } : prev));
      }

      let totalInspectedMt = 0;
      const processedMrNos = new Set<string>();
      const registerProcessedItem = (item: any) => {
        [item.final_arrival_no, item.mr_no, item.arrival_no, item.temporary_arrival_no]
          .map(v => String(v || '').trim().toUpperCase())
          .filter(Boolean)
          .forEach(k => processedMrNos.add(k));
      };
      const isAlreadyProcessedItem = (item: any): boolean => {
        const keys = [item.final_arrival_no, item.mr_no, item.arrival_no, item.temporary_arrival_no]
          .map(v => String(v || '').trim().toUpperCase())
          .filter(Boolean);
        return keys.some(k => processedMrNos.has(k));
      };

      // A) Process final_arrival records for this PO
      if (finalArrivalsForPo && finalArrivalsForPo.length > 0) {
        for (const item of finalArrivalsForPo) {
          if (isAlreadyProcessedItem(item)) continue;
          registerProcessedItem(item);

          let wtMt = 0;
          if (item.weight_qtl && Number(item.weight_qtl) > 0) {
            wtMt = Number(item.weight_qtl) / 10;
          } else if (item.electronic_net_weight && Number(item.electronic_net_weight) > 0) {
            const val = Number(item.electronic_net_weight);
            wtMt = val > 50 ? val / 10 : val;
          } else if (item.challan_material_weight && Number(item.challan_material_weight) > 0) {
            const val = Number(item.challan_material_weight);
            wtMt = val > 50 ? val / 10 : val;
          }

          if (wtMt === 0 && item.grid_details) {
            try {
              const grids = typeof item.grid_details === 'string' ? JSON.parse(item.grid_details) : item.grid_details;
              if (Array.isArray(grids)) {
                const totalGrossQtl = grids.reduce((s: number, g: any) => s + (Number(g.weight || g.weight_qtl || g.arr_qty_wt) || 0), 0);
                if (totalGrossQtl > 0) {
                  wtMt = totalGrossQtl > 50 ? totalGrossQtl / 10 : totalGrossQtl;
                }
              }
            } catch (e) {}
          }

          totalInspectedMt += wtMt;
        }
      }

      // B) Process mill_inspection_master records for this PO
      if (inspectionsForPo && inspectionsForPo.length > 0) {
        for (const item of inspectionsForPo) {
          if (isAlreadyProcessedItem(item)) continue;
          registerProcessedItem(item);

          let wtMt = 0;
          if (item.weight_qtl && Number(item.weight_qtl) > 0) {
            wtMt = Number(item.weight_qtl) / 10;
          } else if (item.electronic_net_weight && Number(item.electronic_net_weight) > 0) {
            const val = Number(item.electronic_net_weight);
            wtMt = val > 50 ? val / 10 : val;
          } else if (item.challan_material_weight && Number(item.challan_material_weight) > 0) {
            const val = Number(item.challan_material_weight);
            wtMt = val > 50 ? val / 10 : val;
          }

          if (wtMt === 0 && item.mr_no) {
            const { data: details } = await supabase
              .from('mill_inspection_detail')
              .select('challan_gross_wt')
              .eq('mr_no', item.mr_no);
            if (details && details.length > 0) {
              const detailGrossQtl = details.reduce((sum, r) => sum + (Number(r.challan_gross_wt) || 0), 0);
              if (detailGrossQtl > 0) {
                wtMt = detailGrossQtl > 50 ? detailGrossQtl / 10 : detailGrossQtl;
              }
            }
          }

          totalInspectedMt += wtMt;
        }
      }

      // 3. Fetch already settled quantity against this P.O
      const { data: settlementsForPo } = await supabase
        .from('mr_settlement_master')
        .select('mr_no, electronic_scale_net')
        .eq('po_no', poData.po_no || cleanPoNo);
      
      let totalSettledMt = 0;
      if (settlementsForPo && settlementsForPo.length > 0) {
        // Prioritize electronic_scale_net from mr_settlement_master (which is always in MT)
        totalSettledMt = settlementsForPo.reduce((sum, s) => sum + (Number(s.electronic_scale_net) || 0), 0);

        if (totalSettledMt === 0) {
          const mrNos = settlementsForPo.map(s => s.mr_no);
          const { data: sDetails } = await supabase
            .from('mr_settlement_detail')
            .select('quantity, arr_qty_wt, wt_quantity')
            .in('mr_no', mrNos);
          if (sDetails && sDetails.length > 0) {
            totalSettledMt = sDetails.reduce((sum, r) => {
              const q = Number(r.arr_qty_wt || r.wt_quantity || r.quantity) || 0;
              // If q > 500, it's KG -> MT (/1000). If q > 50, it's Quintal or Bales count, not raw MT.
              const mt = q > 500 ? q / 1000 : (q > 50 ? q / 10 : q);
              return sum + mt;
            }, 0);
          }
        }
      }

      // 4. Fetch data from 'm_r_settlement' table based on selected P.O number
      const { data: customSettlements, error: customErr } = await supabase
        .from('m_r_settlement')
        .select('*')
        .eq('po_no', poData.po_no || cleanPoNo)
        .order('created_at', { ascending: false });

      let totalCustomReceivedMt = 0;
      if (!customErr && customSettlements) {
        setCustomSettlementRecords(customSettlements);
        totalCustomReceivedMt = customSettlements.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
      } else {
        setCustomSettlementRecords([]);
      }

      const contractQty = Number(poData.total_contract_mt) || 0;
      const totalDeliveredMt = Number((totalCustomReceivedMt + totalInspectedMt).toFixed(3));
      const pendingQty = calculatePendingReceived(contractQty, totalDeliveredMt);
      const pendingReceivedQty = pendingQty;

      setPoStats({
        contractQty,
        receivedQty: totalInspectedMt,
        settledQty: Number(totalSettledMt.toFixed(3)),
        pendingQty: pendingQty,
        customReceivedQty: totalCustomReceivedMt,
        pendingReceivedQty: pendingReceivedQty,
        dbPendingReceived: Number(poData.pending_received) || 0
      });

      setLastSyncTime(new Date().toLocaleTimeString());

      // If preserveMrNo is false, check if this PO has a linked payment MR in payment_master to load automatically
      if (!preserveMrNo) {
        const cleanP = cleanPoNo.replace(/[\s\-\/]/g, '').toLowerCase();
        const allPaymentMrsForPo = Array.from(
          new Set(
            (paymentList || [])
              .filter((p: any) => {
                const st = String(p.status || '').toLowerCase().trim();
                if (st === 'cancelled' || st === 'rejected') return false;
                const pPo = String(p.po_no || '').replace(/#/g, '').replace(/[\s\-\/]/g, '').trim().toLowerCase();
                const mr = String(p.mr_no || '').trim();
                return Boolean(mr && pPo && pPo === cleanP);
              })
              .map((p: any) => String(p.mr_no).trim())
              .filter(Boolean)
          )
        );
        const unsettledPaymentMrsForPo = allPaymentMrsForPo.filter(mr => {
          const isSettled = settledList.some(
            s => String(s.mr_no || '').trim().toUpperCase() === mr.toUpperCase()
          );
          return !isSettled;
        });

        let autoMr = unsettledPaymentMrsForPo.length === 1
          ? unsettledPaymentMrsForPo[0]
          : (allPaymentMrsForPo.length === 1 ? allPaymentMrsForPo[0] : '');

        if (autoMr) {
          await handleProceedWithMrNo(autoMr);
          return;
        }

        const poDetails = (fetchedDetails && fetchedDetails.length > 0) ? fetchedDetails : [];

        const newCols = [1, 2, 3, 4].map(idx => {
          const pDet = poDetails && poDetails[idx - 1] ? poDetails[idx - 1] : null;
          return buildSettlementCol(
            idx,
            null,
            pDet,
            null,
            null,
            poData,
            gradeMasterList,
            agencyMasterList,
            markaMasterList,
            areaMasterList
          );
        });

        setMasterData(prev => {
          if (prev.mr_no && String(prev.po_no || '').replace(/#/g, '').replace(/[\s\-\/]/g, '').trim().toLowerCase() === cleanP) {
            return prev;
          }
          return {
            ...initialMaster(),
            po_no: poData.po_no || cleanPoNo,
            po_date: poData.po_date || '',
            broker: poData.broker || '',
            supplier: poData.supplier || '',
            chn_supplier: poData.supplier || '',
            po_type: poData.po_type || 'MILL_PO',
            rate_qntl: Number(poData.rate_qntl || poData.rate_mt || poData.b_rate || 0),
            sett_date: prev.sett_date || new Date().toISOString().split('T')[0],
            arival_apmc_fees: 0,
            mr_no: '',
            lorry_number: '',
            arrival_no: '',
            arrival_date: ''
          };
        });
        setDetailCols(prevCols => {
          const hasActiveCol = prevCols.some(c => Number(c.arr_qty_wt) > 0 || Number(c.quantity) > 0);
          return (masterData.mr_no && hasActiveCol) ? prevCols : newCols;
        });
        await syncPaymentModuleData('', poData.po_no || cleanPoNo);
      }

      if (onLogEvent) {
        onLogEvent('PO_SYNC', `Resolved P.O #${poNo}: Contract=${contractQty} MT, Unloaded=${totalInspectedMt} MT, Settled=${totalSettledMt} MT, Pending=${pendingQty} MT`);
      }

    } catch (err: any) {
      setErrorMessage("Failed to resolve PO statistics: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initPage();
  }, []);

  // Fetch complete details from and populate form
  const handleProceedWithMrNo = async (targetMrNo: string, forceSync: boolean = false) => {
    if (!targetMrNo) return;
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      if (!supabase) return;
      const cleanTargetMr = String(targetMrNo || '').trim().toUpperCase();

      // 0. Resolve MR and PO from payment_master strictly by mr_no first
      let payMasterRec: any = paymentList.find(
        (p: any) => String(p.mr_no || '').trim().toUpperCase() === cleanTargetMr
      ) || null;
      if (!payMasterRec) {
        payMasterRec = paymentList.find((p: any) => {
          const pMr = String(p.mr_no || '').trim().toUpperCase();
          const pArr = String(p.arrival_no || '').trim().toUpperCase();
          return (!pMr || pMr === cleanTargetMr) && pArr === cleanTargetMr;
        }) || null;
      }
      if (!payMasterRec) {
        try {
          const { data: pmExact } = await supabase
            .from('payment_master')
            .select('*')
            .or(`mr_no.eq.${targetMrNo},mr_no.ilike.${targetMrNo}`);
          if (pmExact && pmExact.length > 0) {
            payMasterRec = pmExact.find((p: any) => String(p.mr_no || '').trim().toUpperCase() === cleanTargetMr) || pmExact[0];
          } else {
            const { data: pmArr } = await supabase
              .from('payment_master')
              .select('*')
              .eq('arrival_no', targetMrNo);
            if (pmArr && pmArr.length > 0) {
              payMasterRec = pmArr.find((p: any) => !p.mr_no || String(p.mr_no).trim().toUpperCase() === cleanTargetMr) || null;
            }
          }
        } catch (e) {}
      }

      // 1. Fetch material_inspection / mill_inspection_master by exact mr_no FIRST
      let inspMaster: any = null;
      try {
        const matExactRes = await supabase
          .from('material_inspection')
          .select('*')
          .eq('mr_no', targetMrNo);
        if (matExactRes?.data && matExactRes.data.length > 0) {
          inspMaster = matExactRes.data[0];
        } else {
          const matArrRes = await supabase
            .from('material_inspection')
            .select('*')
            .eq('arrival_no', targetMrNo);
          if (matArrRes?.data && matArrRes.data.length > 0) {
            inspMaster = matArrRes.data.find((r: any) => !r.mr_no || String(r.mr_no).trim().toUpperCase() === cleanTargetMr) || null;
          }
        }

        if (!inspMaster) {
          const millExactRes = await supabase
            .from('mill_inspection_master')
            .select('*')
            .eq('mr_no', targetMrNo);
          if (millExactRes?.data && millExactRes.data.length > 0) {
            inspMaster = millExactRes.data[0];
          } else {
            const millArrRes = await supabase
              .from('mill_inspection_master')
              .select('*')
              .eq('arrival_no', targetMrNo);
            if (millArrRes?.data && millArrRes.data.length > 0) {
              inspMaster = millArrRes.data.find((r: any) => !r.mr_no || String(r.mr_no).trim().toUpperCase() === cleanTargetMr) || null;
            }
          }
        }
        if (!inspMaster && inspections && inspections.length > 0) {
          inspMaster = inspections.find((r: any) => {
            const k1 = String(r.mr_no || '').trim().toUpperCase();
            const k2 = String(r.arrival_no || r.final_arrival_no || '').trim().toUpperCase();
            return k1 === cleanTargetMr || k2 === cleanTargetMr;
          }) || null;
        }
      } catch (e) {
        console.warn("Error fetching inspection master:", e);
      }

      // Prioritize material_inspection_details table first (matching Mill Inspection & Payment sections),
      // falling back to inspMaster.grid_details / details only if the detail table has no rows.
      let inspDetails: any[] = [];
      try {
        const matDetRes = await supabase
          .from('material_inspection_details')
          .select('*')
          .eq('mr_no', targetMrNo)
          .order('srl_no', { ascending: true });
        const fetchedDet = matDetRes?.data || [];
        if (fetchedDet.length > 0) {
          inspDetails = fetchedDet;
        } else {
          const millDetRes = await supabase
            .from('mill_inspection_detail')
            .select('*')
            .eq('mr_no', targetMrNo)
            .order('srl_no', { ascending: true });
          if (millDetRes?.data && millDetRes.data.length > 0) {
            inspDetails = millDetRes.data;
          }
        }
      } catch (e) {
        console.warn("Error fetching inspection details:", e);
      }

      if (inspDetails.length === 0 && inspMaster) {
        if (inspMaster.grid_details) {
          if (Array.isArray(inspMaster.grid_details)) inspDetails = inspMaster.grid_details;
          else if (typeof inspMaster.grid_details === 'string') {
            try { inspDetails = JSON.parse(inspMaster.grid_details); } catch (e) {}
          }
        } else if (inspMaster.details && Array.isArray(inspMaster.details)) {
          inspDetails = inspMaster.details;
        }
      }

      inspDetails = deduplicateArrivalItems(
        inspDetails,
        gradeMasterList,
        Number(inspMaster?.electronic_net_weight || inspMaster?.challan_material_weight || inspMaster?.supplier_net_weight || 0),
        Number(inspMaster?.total_bales || inspMaster?.bales || inspMaster?.quantity || 0)
      );

      // 2. Fetch final_arrival and validate against targetMrNo / inspMaster / payMasterRec
      const targetArrNo = String(inspMaster?.arrival_no || targetMrNo).trim();
      const { data: faMasterList } = await supabase
        .from('final_arrival')
        .select('*')
        .or(`final_arrival_no.eq.${targetMrNo},mr_no.eq.${targetMrNo},final_arrival_no.eq.${targetArrNo},arrival_no.eq.${targetArrNo}`);

      let faMaster: any = null;
      if (faMasterList && faMasterList.length > 0) {
        const normLorry = (v: any) => String(v || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        const expectedLorry = normLorry(inspMaster?.lorry_number || inspMaster?.lorry_no || payMasterRec?.lorry_number || '');
        const expectedSupplier = String(inspMaster?.supplier_name || inspMaster?.supplier || payMasterRec?.party_name || payMasterRec?.supplier_name || payMasterRec?.supplier || '').trim().toUpperCase();
        const cleanArr = targetArrNo.toUpperCase();

        const validFaCandidates = faMasterList.filter((r: any) => {
          const rMr = String(r.mr_no || '').trim().toUpperCase();
          const rFaNo = String(r.final_arrival_no || '').trim().toUpperCase();
          const rLorry = normLorry(r.lorry_number || r.lorry_no || '');
          // If final_arrival_no explicitly matches targetMrNo, always accept it
          if (rFaNo === cleanTargetMr) return true;
          // Reject if final_arrival explicitly belongs to a different MR number
          if (rMr && rMr !== cleanTargetMr && rMr !== cleanArr) return false;
          // Reject if final_arrival_no is an MR series that conflicts with targetMrNo / targetArrNo
          if (rFaNo && rFaNo.startsWith('MR') && rFaNo !== cleanTargetMr && rFaNo !== cleanArr) return false;
          // Reject if inspection/payment has a lorry number and final_arrival has a different lorry number
          if (expectedLorry && rLorry && rLorry !== expectedLorry) return false;
          return true;
        });

        faMaster =
          validFaCandidates.find((r: any) => String(r.final_arrival_no || '').trim().toUpperCase() === cleanTargetMr) ||
          validFaCandidates.find((r: any) => String(r.mr_no || '').trim().toUpperCase() === cleanTargetMr) ||
          validFaCandidates.find((r: any) => String(r.final_arrival_no || '').trim().toUpperCase() === cleanArr) ||
          validFaCandidates.find((r: any) => expectedLorry && normLorry(r.lorry_number || r.lorry_no || '') === expectedLorry) ||
          validFaCandidates.find((r: any) => expectedSupplier && String(r.supplier || r.supplier_name || '').trim().toUpperCase() === expectedSupplier) ||
          validFaCandidates[0] ||
          null;
      }

      let faGridArr: any[] = [];
      if (faMaster?.grid_details) {
        if (Array.isArray(faMaster.grid_details)) faGridArr = faMaster.grid_details;
        else if (typeof faMaster.grid_details === 'string') {
          try { faGridArr = JSON.parse(faMaster.grid_details); } catch (e) {}
        }
      }
      faGridArr = deduplicateArrivalItems(
        faGridArr,
        gradeMasterList,
        Number(faMaster?.electronic_net_weight || faMaster?.challan_material_weight || faMaster?.supplier_net_weight || 0),
        Number(faMaster?.total_bales || faMaster?.bales || faMaster?.quantity || 0)
      );

      const poNoForDet = inspMaster?.po_no || payMasterRec?.po_no || faMaster?.po_no || '';
      const cleanTargetPo = (poNoForDet || selectedPoNo || masterData.po_no || '').trim().replace(/^#/, '');

      let poDetails: any[] = [];
      let poData: any = null;
      const effectivePoNo = poNoForDet || cleanTargetPo;
      if (effectivePoNo) {
        const { poData: fetchedPo, poDetails: fetchedDetails } = await fetchPoAndItemDetails(effectivePoNo, gradeMasterList, agencyMasterList);
        poData = fetchedPo;
        poDetails = fetchedDetails;
        if (poData) setSelectedPoData(poData);
      }

      const poolForPoCheck = [
        ...inspections,
        ...(inspMaster ? [inspMaster] : []),
        ...(faMaster ? [faMaster] : [])
      ];
      const isLastMr = isLastMrForPo(targetMrNo, cleanTargetPo, poolForPoCheck, poData || selectedPoData);

      let saudaDedRecord: any = null;
      if (isLastMr && cleanTargetPo) {
        saudaDedRecord = await fetchSaudaCheckpointDeduction(cleanTargetPo);
        setSaudaDeductionRecord(saudaDedRecord);
      } else {
        setSaudaDeductionRecord(null);
      }

      let gList = gradeMasterList;
      if (!gList || gList.length === 0) {
        const { data: gData } = await supabase.from('grade_master').select('*');
        if (gData && gData.length > 0) {
          gList = gData;
          setGradeMasterList(gData);
        }
      }
      let agList = agencyMasterList;
      if (!agList || agList.length === 0) {
        const { data: agData } = await supabase.from('agency_master').select('*');
        if (agData && agData.length > 0) {
          agList = agData;
          setAgencyMasterList(agData);
        }
      }
      let mList = markaMasterList;
      if (!mList || mList.length === 0) {
        const { data: mData } = await supabase.from('marka_master').select('*');
        if (mData && mData.length > 0) {
          mList = mData;
          setMarkaMasterList(mData);
        }
      }
      let arList = areaMasterList;
      if (!arList || arList.length === 0) {
        const { data: aData } = await supabase.from('area_master').select('*');
        if (aData && aData.length > 0) {
          arList = aData;
          setAreaMasterList(aData);
        }
      }

      // Fetch Temporary Arrival record to retrieve A.P.M.C Fees (Rs.) via:
      // final_arrival (final_arrival_no = targetMrNo) -> temporary_arrival_no -> temporary_material_received (temporary_arrival_no) -> apmc_fees
      const resolvedArrivalApmcFees = await resolveTemporaryArrivalApmcFees({
        mrNo: targetMrNo,
        faMaster,
        inspMaster
      });

      if (getCachedSattaDiffs().length === 0) {
        try {
          const { data: sattaData } = await supabase.from('satta_differentials').select('*');
          if (sattaData && sattaData.length > 0) setCachedSattaDiffs(sattaData);
        } catch (e) {}
      }

      const { totalPaid: syncedPaidAmount, payDetails: matchedPayDetails, hasMatchedPayment } = await syncPaymentModuleData(targetMrNo, effectivePoNo);

      // Calculate fallback weights in MT from inspection details and payment details
      const toSingleMt = (val: any): number => {
        const p = Number(val) || 0;
        if (p <= 0) return 0;
        if (p > 500) return Number((p / 1000).toFixed(3));
        if (p > 50) return Number((p / 10).toFixed(3));
        return Number(p.toFixed(3));
      };

      let inspDetailsChallanMtSum = 0;
      let inspDetailsSupplierMtSum = 0;
      let inspDetailsScaleMtSum = 0;
      if (inspDetails && inspDetails.length > 0) {
        inspDetails.forEach((d: any) => {
          const cWt = toSingleMt(d.challan_gross_wt || d.challan_wt || d.receipt_gross_wt || d.final_receipt_wt || d.arr_qty_wt || d.weight);
          const sWt = toSingleMt(d.receipt_gross_wt || d.supplier_net_wt || d.challan_gross_wt || d.final_receipt_wt || d.arr_qty_wt || d.weight);
          const eWt = toSingleMt(d.final_receipt_wt || d.receipt_gross_wt || d.challan_gross_wt || d.arr_qty_wt || d.weight);
          inspDetailsChallanMtSum += cWt;
          inspDetailsSupplierMtSum += sWt;
          inspDetailsScaleMtSum += eWt;
        });
      }
      let payDetailsWtMtSum = 0;
      if (matchedPayDetails && matchedPayDetails.length > 0) {
        matchedPayDetails.forEach((pd: any) => {
          payDetailsWtMtSum += toSingleMt(pd.arr_qty_wt || pd.weight || (Number(pd.quantity_qtl) > 0 ? Number(pd.quantity_qtl) / 10 : 0));
        });
      }
      inspDetailsChallanMtSum = Number(inspDetailsChallanMtSum.toFixed(3));
      inspDetailsSupplierMtSum = Number(inspDetailsSupplierMtSum.toFixed(3));
      inspDetailsScaleMtSum = Number(inspDetailsScaleMtSum.toFixed(3));
      payDetailsWtMtSum = Number(payDetailsWtMtSum.toFixed(3));

      // Calculate total Premium Quantity (MT), Premium WT (Qtl), and Premium Amount (₹) from Inspection Details
      let totalPremMt = 0;
      let calculatedPremTotalAmt = 0;
      if (inspDetails && inspDetails.length > 0) {
        inspDetails.forEach((row: any) => {
          const rawPrem = row.premium !== undefined && row.premium !== null ? String(row.premium).trim() : "";
          const parsedNum = parseFloat(rawPrem);
          const isNumericPrem = !isNaN(parsedNum) && parsedNum > 0;
          const isExplicitPrem = row.is_premium === true || 
            rawPrem.toLowerCase() === "yes" || 
            (rawPrem !== "" && rawPrem.toLowerCase() !== "no");

          if (isNumericPrem || isExplicitPrem) {
            let rowPremMt = 0;
            if (isNumericPrem) {
              rowPremMt = parsedNum;
            } else if (row.premium_mt && Number(row.premium_mt) > 0) {
              rowPremMt = Number(row.premium_mt);
            } else if (row.premium_quantity && Number(row.premium_quantity) > 0) {
              rowPremMt = Number(row.premium_quantity);
            } else {
              if (row.challan_gross_wt && Number(row.challan_gross_wt) > 0) {
                rowPremMt = Number(row.challan_gross_wt);
              } else if (row.receipt_gross_wt && Number(row.receipt_gross_wt) > 0) {
                rowPremMt = Number(row.receipt_gross_wt);
              } else {
                const q = Number(row.quantity) || 0;
                const u = String(row.unit || "BALES").toUpperCase();
                if (u.includes("BALE")) rowPremMt = q * 0.18;
                else if (u.includes("KG")) rowPremMt = q * 0.001;
                else if (u.includes("QTL") || u.includes("QUINTAL")) rowPremMt = q * 0.10;
                else if (u.includes("DRUM")) rowPremMt = q * 0.20;
                else if (u.includes("BAG")) rowPremMt = q * 0.05;
                else rowPremMt = q;
              }
            }

            if (rowPremMt > 0) {
              totalPremMt += rowPremMt;
              const rowRate = Number(row.amount) || Number(row.rate) || Number(row.rate_qntl) || 0;
              const rowPremQtl = rowPremMt * 10;
              calculatedPremTotalAmt += (rowPremQtl * rowRate);
            }
          }
        });
      }
      let calculatedPremWtQtl = Number((totalPremMt * 10).toFixed(2));
      let calculatedPremRatePerQtl = calculatedPremWtQtl > 0 ? Number((calculatedPremTotalAmt / calculatedPremWtQtl).toFixed(2)) : 0;
      calculatedPremTotalAmt = Number(calculatedPremTotalAmt.toFixed(2));

      // Fallback: If inspection details had no premium, extract premium weight, rate and amount from matched payment_details
      if (calculatedPremTotalAmt === 0 && matchedPayDetails && matchedPayDetails.length > 0) {
        let payPremTotalAmt = 0;
        let payPremTotalQtl = 0;
        matchedPayDetails.forEach((pd: any) => {
          const pdPrem = Number(pd.premium) || 0;
          if (pdPrem > 0) {
            const wtMt = Number(pd.arr_qty_wt) > 0 ? Number(pd.arr_qty_wt) : 0;
            const qtl = Number(pd.quantity_qtl) > 0 ? Number(pd.quantity_qtl) : (wtMt > 0 ? wtMt * 10 : 0);
            if (qtl > 0) {
              payPremTotalQtl += qtl;
              payPremTotalAmt += (qtl * pdPrem);
            }
          }
        });
        if (payPremTotalAmt > 0) {
          calculatedPremTotalAmt = Number(payPremTotalAmt.toFixed(2));
          calculatedPremWtQtl = Number(payPremTotalQtl.toFixed(2));
          calculatedPremRatePerQtl = calculatedPremWtQtl > 0 ? Number((calculatedPremTotalAmt / calculatedPremWtQtl).toFixed(2)) : 0;
        }
      }

      // Extract comprehensive deduction details and summarized deduction types from mill_inspection_deduction table / Inspection Master
      let inspDeductionType = inspMaster?.deduction_type || '';
      let inspDeductionRate = Number(inspMaster?.deduction_rate) || 0;
      let inspDeductionQty = Number(inspMaster?.deduction_qty) || 0;
      let inspDeductionAmount = Number(inspMaster?.deduction_amount) || 0;

      let parsedDeductions: SettlementDeductionItem[] = [];

      // 1. Query mill_inspection_deduction table first for all detailed rows saved for this MR / arrival
      try {
        if (supabase) {
          const { data: millDedList } = await supabase
            .from('mill_inspection_deduction')
            .select('*')
            .or(`mr_no.eq.${targetMrNo},arrival_no.eq.${targetMrNo}`)
            .order('created_at', { ascending: true });

          if (millDedList && millDedList.length > 0) {
            parsedDeductions = millDedList
              .filter((d: any) => d && ((d.deduction_type && String(d.deduction_type).trim() !== '' && !String(d.deduction_type).includes('-- SELECT')) || Number(d.deduction_amount || d.amount) > 0 || Number(d.deduction_rate || d.rate) > 0))
              .map((d: any) => {
                const name = String(d.deduction_type || d.deduction || d.rule_name || '').trim();
                const rate = Number(d.deduction_rate || d.rate) || 0;
                const qty = Number(d.deduction_qty || d.qty) || 1;
                const amt = Number(d.deduction_amount || d.amount) || Number((rate * qty).toFixed(2));
                return { deduction_type: name, deduction_rate: rate, deduction_qty: qty, deduction_amount: amt };
              });
          }
        }
      } catch (e) {
        console.warn("Could not query mill_inspection_deduction:", e);
      }

      // 2. Fallback to raw JSONB deductions array on inspMaster
      if (parsedDeductions.length === 0) {
        const rawDeductionsArray = inspMaster?.deduction_types || inspMaster?.deductions;
        if (Array.isArray(rawDeductionsArray) && rawDeductionsArray.length > 0) {
          parsedDeductions = rawDeductionsArray
            .filter((d: any) => d && ((d.deduction_type && String(d.deduction_type).trim() !== '' && !String(d.deduction_type).includes('-- SELECT')) || (d.deduction && String(d.deduction).trim() !== '') || Number(d.deduction_amount || d.amount) > 0 || Number(d.deduction_rate || d.rate) > 0))
            .map((d: any) => {
              const name = String(d.deduction_type || d.deduction || d.name || '').trim();
              const rate = Number(d.deduction_rate || d.rate) || 0;
              const qty = Number(d.deduction_qty || d.qty) || 1;
              const amt = Number(d.deduction_amount || d.amount) || Number((rate * qty).toFixed(2));
              return { deduction_type: name, deduction_rate: rate, deduction_qty: qty, deduction_amount: amt };
            });
        }
      }

      let deductionSummaryText = inspDeductionType;
      if (parsedDeductions.length > 0) {
        const typeSummaries = parsedDeductions.map(d => {
          if (d.deduction_amount > 0) return `${d.deduction_type} (₹${d.deduction_amount})`;
          if (d.deduction_rate > 0 && d.deduction_qty > 0) return `${d.deduction_type} (${d.deduction_qty} @ ₹${d.deduction_rate})`;
          return d.deduction_type;
        });

        deductionSummaryText = typeSummaries.join(', ');
        inspDeductionAmount = parsedDeductions.reduce((s: number, d: any) => s + (Number(d.deduction_amount) || 0), 0);
        inspDeductionRate = parsedDeductions[0].deduction_rate;
        inspDeductionQty = parsedDeductions[0].deduction_qty;
      } else if (inspDeductionType && !inspDeductionType.includes('-- SELECT') && (inspDeductionRate > 0 || inspDeductionAmount > 0)) {
        parsedDeductions = [{
          deduction_type: inspDeductionType,
          deduction_rate: inspDeductionRate || inspDeductionAmount,
          deduction_qty: inspDeductionQty || 1,
          deduction_amount: inspDeductionAmount || Number(((inspDeductionRate || 0) * (inspDeductionQty || 1)).toFixed(2))
        }];
      } else {
        deductionSummaryText = '';
        inspDeductionRate = 0;
        inspDeductionQty = 0;
        inspDeductionAmount = 0;
      }

      const toMtWeight = (primaryVal: any, fallbackQtlVal?: any): number => {
        const p = Number(primaryVal) || 0;
        if (p > 0) {
          if (p > 500) return Number((p / 1000).toFixed(3));
          if (p > 50) return Number((p / 10).toFixed(3));
          return Number(p.toFixed(3));
        }
        const q = Number(fallbackQtlVal) || 0;
        if (q > 0) {
          return Number((q / 10).toFixed(3));
        }
        return 0;
      };

      const sourceChallanMt = toMtWeight(
        inspMaster?.challan_material_weight || faMaster?.challan_material_weight || payMasterRec?.challan_weight || inspDetailsChallanMtSum || payDetailsWtMtSum,
        inspMaster?.weight_qtl || faMaster?.weight_qtl
      );
      const sourceSupplierNetMt = toMtWeight(
        inspMaster?.supplier_net_weight || faMaster?.supplier_net_weight || payMasterRec?.supplier_net_wt || ((Number(faMaster?.supplier_challan_gross) || 0) - (Number(faMaster?.supplier_tare_weight) || 0)) || inspDetailsSupplierMtSum || payDetailsWtMtSum,
        inspMaster?.weight_qtl || faMaster?.weight_qtl
      );
      const sourceElectronicNetMt = toMtWeight(
        inspMaster?.electronic_net_weight || faMaster?.electronic_net_weight || payMasterRec?.electronic_scale_net || ((Number(faMaster?.electronic_gross_weight) || 0) - (Number(faMaster?.electronic_tare_weight) || 0)) || inspDetailsScaleMtSum || payDetailsWtMtSum,
        inspMaster?.weight_qtl || faMaster?.weight_qtl
      );

      // Resolve "Arrival Date *" from Mill Inspection Information Entry (inspMaster.arrival_date)
      const resolvedInspectionArrivalDate = formatToInputDate(
        inspMaster?.arrival_date ||
        inspMaster?.date ||
        inspMaster?.mr_date ||
        faMaster?.arrival_date ||
        faMaster?.final_arrival_date ||
        faMaster?.date ||
        payMasterRec?.arrival_date ||
        payMasterRec?.mr_date
      ) || '';

      // Check if settlement already exists for this MR. If yes, load for editing!
      if (!forceSync) {
        const { data: existingMaster } = await supabase
          .from('mr_settlement_master')
          .select('*')
          .eq('mr_no', targetMrNo)
          .maybeSingle();

        if (existingMaster) {
          setIsEdit(true);
          const hasMoreParsedDeductions = parsedDeductions.length > (existingMaster.deductions?.length || 0);
          const effectiveDeductions = hasMoreParsedDeductions
            ? parsedDeductions
            : ((existingMaster.deductions && Array.isArray(existingMaster.deductions) && existingMaster.deductions.length > 0)
                ? existingMaster.deductions
                : (parsedDeductions.length > 0 ? parsedDeductions : []));
          const effectiveDeductionAmount = hasMoreParsedDeductions
            ? inspDeductionAmount
            : ((Number(existingMaster.summary_deduction_amount) > 0) ? existingMaster.summary_deduction_amount : inspDeductionAmount);

          const isMrSeriesStr = (s: any) => Boolean(s && String(s).trim().toUpperCase().startsWith('MR'));
          let masterMrNoToUse = existingMaster.mr_no || targetMrNo;
          if (!isMrSeriesStr(masterMrNoToUse) && isMrSeriesStr(targetMrNo)) {
            masterMrNoToUse = targetMrNo;
          } else if (!isMrSeriesStr(masterMrNoToUse) && isMrSeriesStr(inspMaster?.mr_no)) {
            masterMrNoToUse = inspMaster.mr_no;
          }

          // Detect if existingMaster had stale/wrong arrival_no or lorry_number from a different MR
          const expectedArrNo = String(inspMaster?.arrival_no || payMasterRec?.arrival_no || faMaster?.final_arrival_no || targetMrNo).trim();
          const expectedLorry = String(inspMaster?.lorry_number || inspMaster?.lorry_no || payMasterRec?.lorry_number || payMasterRec?.lorry_no || faMaster?.lorry_number || faMaster?.lorry_no || '').trim();
          const existingArrClean = String(existingMaster.arrival_no || '').trim().toUpperCase();
          const isStaleExistingIdentity =
            (existingArrClean && existingArrClean.startsWith('MR') && existingArrClean !== cleanTargetMr && existingArrClean !== expectedArrNo.toUpperCase()) ||
            (expectedLorry && existingMaster.lorry_number && String(existingMaster.lorry_number).trim().toUpperCase() !== expectedLorry.toUpperCase());

          const effChallanWt = isStaleExistingIdentity
            ? (sourceChallanMt || toMtWeight(existingMaster.challan_weight))
            : toMtWeight(existingMaster.challan_weight || sourceChallanMt);
          const effSupplierWt = isStaleExistingIdentity
            ? (sourceSupplierNetMt || toMtWeight(existingMaster.supplier_net_wt))
            : toMtWeight(existingMaster.supplier_net_wt || sourceSupplierNetMt);
          const effScaleWt = isStaleExistingIdentity
            ? (sourceElectronicNetMt || toMtWeight(existingMaster.electronic_scale_net))
            : toMtWeight(existingMaster.electronic_scale_net || sourceElectronicNetMt);

          const effectiveArrivalDate = resolvedInspectionArrivalDate || formatToInputDate(existingMaster.arrival_date || existingMaster.sett_date) || '';

          const mergedMaster = {
            ...existingMaster,
            mr_no: masterMrNoToUse,
            sett_date: effectiveArrivalDate || existingMaster.sett_date || new Date().toISOString().split('T')[0],
            mr_date: effectiveArrivalDate || existingMaster.mr_date || '',
            arrival_date: effectiveArrivalDate,
            broker: isStaleExistingIdentity
              ? (inspMaster?.broker_name || inspMaster?.broker || payMasterRec?.broker_name || payMasterRec?.broker || existingMaster.broker || '')
              : (existingMaster.broker || inspMaster?.broker_name || inspMaster?.broker || payMasterRec?.broker_name || payMasterRec?.broker || ''),
            supplier: isStaleExistingIdentity
              ? (inspMaster?.supplier_name || inspMaster?.supplier || payMasterRec?.party_name || payMasterRec?.supplier_name || payMasterRec?.supplier || existingMaster.supplier || '')
              : (existingMaster.supplier || inspMaster?.supplier_name || inspMaster?.supplier || payMasterRec?.party_name || payMasterRec?.supplier_name || payMasterRec?.supplier || ''),
            chn_supplier: isStaleExistingIdentity
              ? (inspMaster?.supplier_name || inspMaster?.supplier || payMasterRec?.chn_supplier || payMasterRec?.party_name || payMasterRec?.supplier || existingMaster.chn_supplier || '')
              : (existingMaster.chn_supplier || inspMaster?.supplier_name || inspMaster?.supplier || payMasterRec?.chn_supplier || payMasterRec?.party_name || payMasterRec?.supplier || ''),
            lorry_number: isStaleExistingIdentity
              ? (expectedLorry || existingMaster.lorry_number || '')
              : (existingMaster.lorry_number || expectedLorry || ''),
            arrival_no: isStaleExistingIdentity
              ? (expectedArrNo || existingMaster.arrival_no || '')
              : (existingMaster.arrival_no || expectedArrNo || ''),
            challan_weight: effChallanWt,
            supplier_net_wt: effSupplierWt,
            electronic_scale_net: effScaleWt,
            wt_ded_wt_1: isStaleExistingIdentity ? effChallanWt : toMtWeight(existingMaster.wt_ded_wt_1 || effChallanWt),
            wt_ded_wt_2: isStaleExistingIdentity ? effSupplierWt : toMtWeight(existingMaster.wt_ded_wt_2 || effSupplierWt),
            wt_ded_wt_3: isStaleExistingIdentity ? effScaleWt : toMtWeight(existingMaster.wt_ded_wt_3 || effScaleWt),
            summary_deduction_type: existingMaster.summary_deduction_type || deductionSummaryText || '',
            summary_deduction_rate: (Number(existingMaster.summary_deduction_rate) > 0) ? existingMaster.summary_deduction_rate : inspDeductionRate,
            summary_deduction_qty: (Number(existingMaster.summary_deduction_qty) > 0) ? existingMaster.summary_deduction_qty : (inspDeductionQty || (deductionSummaryText ? 1 : 0)),
            summary_deduction_amount: effectiveDeductionAmount,
            deductions: effectiveDeductions,
            summary_instl_rate: (Number(existingMaster.summary_instl_rate) === Number(existingMaster.summary_premium_wt) || Number(existingMaster.summary_instl_rate) === calculatedPremWtQtl)
              ? 0
              : (Number(existingMaster.summary_instl_rate) || 0),
            summary_premium_wt: (existingMaster.summary_premium_wt !== undefined && existingMaster.summary_premium_wt !== null && Number(existingMaster.summary_premium_wt) > 0) 
              ? existingMaster.summary_premium_wt 
              : calculatedPremWtQtl,
            summary_premium_amount: (existingMaster.summary_premium_amount !== undefined && existingMaster.summary_premium_amount !== null && Number(existingMaster.summary_premium_amount) > 0)
              ? existingMaster.summary_premium_amount
              : calculatedPremRatePerQtl,
            val_premium_amt: (existingMaster.val_premium_amt !== undefined && existingMaster.val_premium_amt !== null && Number(existingMaster.val_premium_amt) > 0)
              ? existingMaster.val_premium_amt
              : calculatedPremTotalAmt,
            val_ex_short: isLastMr
              ? (saudaDedRecord ? Math.max(0, Number(saudaDedRecord.deduction_amount) || 0) : Number(existingMaster.val_ex_short || 0))
              : 0,
            val_less_amt: Number(existingMaster.val_less_amt || 0),
            summary_delivery_claim: (existingMaster.summary_delivery_claim === 5550) ? 0 : (Number(existingMaster.summary_delivery_claim) || 0),
            arival_apmc_fees: resolvedArrivalApmcFees,
            actual_apmc_fees: Math.round(Number(existingMaster.actual_apmc_fees) || 0),
            final_on_ac_adv: hasMatchedPayment ? syncedPaidAmount : (Number(existingMaster.final_on_ac_adv) || 0)
          };
          setMasterData(mergedMaster);

          const { data: existingDetails } = await supabase
            .from('mr_settlement_detail')
            .select('*')
            .eq('mr_no', targetMrNo)
            .order('col_index', { ascending: true });

          const fallbackCols = buildAlignedSettlementColumns(
            poDetails,
            inspDetails,
            faGridArr,
            faMaster,
            inspMaster,
            poData,
            gList,
            agList,
            mList,
            arList,
            matchedPayDetails
          );

          if (existingDetails && existingDetails.length > 0 && !isStaleExistingIdentity) {
            const fallbackActiveCount = fallbackCols.filter(
              c => (Number(c.arr_qty_wt) || 0) > 0 || (Number(c.quantity) || 0) > 0
            ).length;
            const hasAuthoritativeInspection = (inspDetails.length > 0 || faGridArr.length > 0) && fallbackActiveCount > 0;

            // Fill columns up to 4, backfilling missing fields if necessary
            const newCols = [1, 2, 3, 4].map(idx => {
              const dbMatch = existingDetails.find(d => d.col_index === idx);
              const fallbackCol = fallbackCols[idx - 1] || emptyDetailColumn(idx);
              const isFallbackColActive = (Number(fallbackCol.arr_qty_wt) || 0) > 0 || (Number(fallbackCol.quantity) || 0) > 0;

              // Do not resurrect a stale duplicate column beyond the actual Mill Inspection grade count
              if (dbMatch && (!hasAuthoritativeInspection || isFallbackColActive || idx <= fallbackActiveCount)) {
                const merged: SettlementDetailColumn = {
                  ...emptyDetailColumn(idx),
                  ...fallbackCol,
                  ...dbMatch
                };
                if (!merged.grade && fallbackCol.grade) merged.grade = fallbackCol.grade;
                if (!merged.area && fallbackCol.area) merged.area = fallbackCol.area;
                if (!merged.agency && fallbackCol.agency) merged.agency = fallbackCol.agency;
                if (!merged.marka_crop && fallbackCol.marka_crop) merged.marka_crop = fallbackCol.marka_crop;
                if (!merged.quantity && fallbackCol.quantity) merged.quantity = fallbackCol.quantity;
                if (!merged.arr_qty_wt && fallbackCol.arr_qty_wt) merged.arr_qty_wt = fallbackCol.arr_qty_wt;
                if (merged.arr_qty_wt > 0 && (!merged.min_qty_wt || Number(merged.min_qty_wt) === Number(merged.arr_qty_wt))) {
                  merged.min_qty_wt = Number((merged.arr_qty_wt * 0.97).toFixed(3));
                }
                if (merged.arr_qty_wt > 0 && merged.quantity > 0 && (!merged.wt_quantity || merged.wt_quantity === 0)) {
                  const arrWtKg = merged.arr_qty_wt <= 50 ? merged.arr_qty_wt * 1000 : merged.arr_qty_wt;
                  merged.wt_quantity = Math.round(arrWtKg / merged.quantity);
                  merged.wt_phota = merged.wt_quantity;
                }
                // Preserve original PO rate from fallbackCol when available
                if (fallbackCol.rate_value && Number(fallbackCol.rate_value) > 0) {
                  merged.rate_value = fallbackCol.rate_value;
                }
                // Robust Premium resolution: dbMatch -> fallbackCol -> matchedPayDetails -> existingMaster.summary_premium_amount -> calculatedPremRatePerQtl
                let resolvedPrem = Number(dbMatch.premium) || 0;
                if (!resolvedPrem) resolvedPrem = Number(fallbackCol.premium) || 0;
                if (!resolvedPrem && matchedPayDetails && matchedPayDetails.length > 0) {
                  const pdMatch = matchedPayDetails.find((pd: any) => Number(pd.col_index) === idx) ||
                    matchedPayDetails.find((pd: any) => {
                      const pdColIdx = Number(pd.col_index || 0);
                      if (pdColIdx > 0 && pdColIdx !== idx) return false;
                      const pdG = String(pd.grade || '').trim().toUpperCase();
                      const colG = String(merged.grade || fallbackCol.grade || '').trim().toUpperCase();
                      return Boolean(pdG && colG && pdG === colG);
                    });
                  if (pdMatch && Number(pdMatch.premium) > 0) {
                    resolvedPrem = Number(pdMatch.premium);
                  }
                }
                if (!resolvedPrem) {
                  const masterPremRate = Number(existingMaster.summary_premium_amount || 0);
                  if (masterPremRate > 0) {
                    resolvedPrem = masterPremRate;
                  } else if (calculatedPremRatePerQtl > 0) {
                    resolvedPrem = calculatedPremRatePerQtl;
                  } else if (Number(existingMaster.val_premium_amt || 0) > 0) {
                    const scaleWt = Number(existingMaster.electronic_scale_net || existingMaster.challan_weight || 0);
                    const qtl = scaleWt > 0 ? (scaleWt <= 50 ? scaleWt * 10 : scaleWt) : 0;
                    if (qtl > 0) resolvedPrem = Number((Number(existingMaster.val_premium_amt) / qtl).toFixed(2));
                  }
                }
                merged.premium = resolvedPrem;

                if (merged.gd_sett == null || merged.gd_sett === 0) merged.gd_sett = fallbackCol.gd_sett;
                if (merged.gd_claim == null || merged.gd_claim === 0) merged.gd_claim = fallbackCol.gd_claim;
                if (merged.moist_sett == null || merged.moist_sett === 0) merged.moist_sett = fallbackCol.moist_sett;
                if (merged.moist_claim == null || merged.moist_claim === 0) merged.moist_claim = fallbackCol.moist_claim;
                if (merged.dust_sett == null || merged.dust_sett === 0) merged.dust_sett = fallbackCol.dust_sett;
                if (merged.dust_claim == null || merged.dust_claim === 0) merged.dust_claim = fallbackCol.dust_claim;
                if (merged.ncv_sett == null || merged.ncv_sett === 0) merged.ncv_sett = fallbackCol.ncv_sett;
                if (merged.ncv_claim == null || merged.ncv_claim === 0) merged.ncv_claim = fallbackCol.ncv_claim;

                merged.sett_pct = (dbMatch.sett_pct !== undefined && Number(dbMatch.sett_pct) > 0)
                  ? Number(dbMatch.sett_pct)
                  : (Number(merged.gd_sett) > 0 ? Number(merged.gd_sett) : Number(fallbackCol.sett_pct || merged.gd_claim || 0));
                merged.deduction_rate = (dbMatch.deduction_rate !== undefined && Number(dbMatch.deduction_rate) > 0)
                  ? Number(dbMatch.deduction_rate)
                  : Number(fallbackCol.deduction_rate || 0);
                merged.sett_rate = getEffectiveColSettRate(merged);
                merged.quantity_qtl = Number((getColWtMt(merged) * 10).toFixed(2));
                merged.amount = getColAmount(merged);
                return merged;
              }
              return fallbackCol;
            });
            setDetailCols(newCols);
          } else {
            setDetailCols(fallbackCols);
          }
          if (existingMaster.po_no) {
            setSelectedPoNo(existingMaster.po_no);
            handlePoNoSelection(existingMaster.po_no, true, masterMrNoToUse);
          }
          setSuccessMessage(`Loaded existing Settlement Report for M.R. No. ${targetMrNo}`);
          return;
        }
      }

      // 2. Build new settlement prioritizing material_inspection (inspMaster) and payment_master (payMasterRec) over final_arrival (faMaster)
      if (inspMaster || payMasterRec || faMaster) {
        setIsEdit(false);
        const isMrSeriesStr = (s: any) => Boolean(s && String(s).trim().toUpperCase().startsWith('MR'));
        let resolvedMrNo = targetMrNo;
        if (isMrSeriesStr(targetMrNo)) {
          resolvedMrNo = targetMrNo;
        } else if (isMrSeriesStr(inspMaster?.mr_no)) {
          resolvedMrNo = inspMaster.mr_no;
        } else if (isMrSeriesStr(payMasterRec?.mr_no)) {
          resolvedMrNo = payMasterRec.mr_no;
        } else if (isMrSeriesStr(faMaster?.mr_no)) {
          resolvedMrNo = faMaster.mr_no;
        } else {
          resolvedMrNo = inspMaster?.mr_no || payMasterRec?.mr_no || targetMrNo || faMaster?.mr_no || faMaster?.final_arrival_no || faMaster?.arrival_no || '';
        }

        const resolvedPoVal = inspMaster?.po_no || payMasterRec?.po_no || faMaster?.po_no || effectivePoNo || '';
        const prefilledMaster: SettlementMaster = {
          ...initialMaster(),
          mr_no: resolvedMrNo,
          sett_date: resolvedInspectionArrivalDate || new Date().toISOString().split('T')[0],
          mr_date: resolvedInspectionArrivalDate,
          po_type: poData?.po_type || payMasterRec?.po_type || 'MILL_PO',
          broker: inspMaster?.broker_name || inspMaster?.broker || payMasterRec?.broker_name || payMasterRec?.broker || faMaster?.broker || poData?.broker || '',
          supplier: inspMaster?.supplier_name || inspMaster?.supplier || payMasterRec?.party_name || payMasterRec?.supplier_name || payMasterRec?.supplier || faMaster?.supplier || poData?.supplier || '',
          chn_supplier: inspMaster?.supplier_name || inspMaster?.supplier || payMasterRec?.chn_supplier || payMasterRec?.party_name || payMasterRec?.supplier_name || payMasterRec?.supplier || faMaster?.challan_supplier || faMaster?.supplier || poData?.supplier || '',
          po_no: resolvedPoVal,
          po_date: inspMaster?.po_date || payMasterRec?.po_date || faMaster?.po_date || poData?.po_date || '',
          rate_qntl: Number(poData?.rate_qntl || poData?.rate_mt || poData?.b_rate || payMasterRec?.rate_qntl || 0),
          lorry_number: inspMaster?.lorry_number || inspMaster?.lorry_no || payMasterRec?.lorry_number || payMasterRec?.lorry_no || faMaster?.lorry_number || faMaster?.lorry_no || inspMaster?.arrival_no || faMaster?.final_arrival_no || '',
          detention_days: Number(inspMaster?.detention_days || faMaster?.detention_days || payMasterRec?.detention_days || 0),
          arrival_no: inspMaster?.arrival_no || payMasterRec?.arrival_no || faMaster?.final_arrival_no || faMaster?.arrival_no || resolvedMrNo || '',
          arrival_date: resolvedInspectionArrivalDate,
          remarks: inspMaster?.remarks || payMasterRec?.remarks || faMaster?.remarks || '',
          consign_no: inspMaster?.challan_no || faMaster?.challan_rr_no || faMaster?.challan_railway_receipt_no || faMaster?.consignment_note_no || faMaster?.challan_no || '',
          challan_weight: sourceChallanMt,
          supplier_net_wt: sourceSupplierNetMt,
          electronic_scale_net: sourceElectronicNetMt,
          wt_ded_wt_1: sourceChallanMt,
          wt_ded_wt_2: sourceSupplierNetMt,
          wt_ded_wt_3: sourceElectronicNetMt,
          summary_deduction_type: deductionSummaryText || '',
          summary_deduction_rate: inspDeductionRate,
          summary_deduction_qty: inspDeductionQty > 0 ? inspDeductionQty : (deductionSummaryText ? 1 : 0),
          summary_deduction_amount: inspDeductionAmount,
          deductions: parsedDeductions,
          summary_premium_wt: calculatedPremWtQtl,
          summary_instl_rate: 0,
          summary_premium_amount: calculatedPremRatePerQtl,
          val_premium_amt: calculatedPremTotalAmt,
          val_ex_short: (isLastMr && saudaDedRecord && Number(saudaDedRecord.deduction_amount) > 0) ? Number(saudaDedRecord.deduction_amount) : 0,
          val_less_amt: 0,
          arival_apmc_fees: resolvedArrivalApmcFees,
          final_apmc_fees: 0,
          final_on_ac_adv: syncedPaidAmount
        };

        const populatedCols = buildAlignedSettlementColumns(
          poDetails,
          inspDetails,
          faGridArr,
          faMaster,
          inspMaster,
          poData,
          gList,
          agList,
          mList,
          arList,
          matchedPayDetails
        );

        const activeColsCount = populatedCols.filter(c => 
          (Number(c.quantity) || 0) > 0 || (Number(c.arr_qty_wt) || 0) > 0 || (Number(c.wt_quantity) || 0) > 0
        ).length || 1;

        populatedCols.forEach(c => {
          const isActive = (Number(c.quantity) || 0) > 0 || (Number(c.arr_qty_wt) || 0) > 0 || (Number(c.wt_quantity) || 0) > 0;
          if (!isActive) {
            c.gd_claim = 0;
            c.gd_sett = 0;
            c.moist_claim = 0;
            c.moist_sett = 0;
            c.dust_claim = 0;
            c.dust_sett = 0;
            c.ncv_claim = 0;
            c.ncv_sett = 0;
            c.po_grade_claim = 0;
            c.po_grade_sett = 0;
            c.claim_settlement = 0;
          } else if (inspMaster) {
            if (c.moist_claim === 0 && inspMaster.claim_moisture != null) c.moist_claim = Number((Number(inspMaster.claim_moisture) / activeColsCount).toFixed(2));
            if (c.dust_claim === 0 && inspMaster.claim_dust != null) c.dust_claim = Number((Number(inspMaster.claim_dust) / activeColsCount).toFixed(2));
            if (c.ncv_claim === 0 && inspMaster.claim_ncv != null) c.ncv_claim = Number((Number(inspMaster.claim_ncv) / activeColsCount).toFixed(2));
            if (c.gd_claim === 0 && inspMaster.claim_grade_down != null) c.gd_claim = Number((Number(inspMaster.claim_grade_down) / activeColsCount).toFixed(2));
          }
          const gdF = (Number(c.gd_claim || 0) - Number(c.gd_sett || 0));
          const mF = (Number(c.moist_claim || 0) - Number(c.moist_sett || 0));
          const dF = (Number(c.dust_claim || 0) - Number(c.dust_sett || 0));
          const nF = (Number(c.ncv_claim || 0) - Number(c.ncv_sett || 0));
          c.claim_settlement = Number((gdF + mF + dF + nF).toFixed(2));
        });

        setMasterData(prefilledMaster);
        setDetailCols(populatedCols);
        if (prefilledMaster.po_no) {
          setSelectedPoNo(prefilledMaster.po_no);
          handlePoNoSelection(prefilledMaster.po_no, true, resolvedMrNo);
        }
        setSuccessMessage(`Prepopulated settlement data successfully from M.R. [${resolvedMrNo}]`);
        return;
      }

      // 3. Fallback: load fields from mill_inspection_master
      if (!inspMaster) {
        setErrorMessage(`No Payment or Inspection details found for MR No "${targetMrNo}".`);
        setLoading(false);
        return;
      }

      setIsEdit(false);
      const fbChallanMt = sourceChallanMt;
      const fbSupplierMt = sourceSupplierNetMt;
      const fbElectronicMt = sourceElectronicNetMt;

      const prefilledMaster: SettlementMaster = {
        ...initialMaster(),
        mr_no: inspMaster.mr_no || '',
        sett_date: resolvedInspectionArrivalDate || new Date().toISOString().split('T')[0],
        mr_date: resolvedInspectionArrivalDate,
        po_type: 'MILL_PO',
        broker: inspMaster.broker_name || '',
        supplier: inspMaster.supplier_name || '',
        chn_supplier: inspMaster.supplier_name || '',
        po_no: inspMaster.po_no || '',
        po_date: inspMaster.po_date || '',
        rate_qntl: Number(poData?.rate_qntl || poData?.rate_mt || poData?.b_rate || 0),
        lorry_number: inspMaster.lorry_number || inspMaster.lorry_no || inspMaster.arrival_no || '',
        detention_days: inspMaster.detention_days || 0,
        arrival_no: inspMaster.arrival_no || '',
        arrival_date: resolvedInspectionArrivalDate,
        remarks: inspMaster.remarks || '',
        challan_weight: fbChallanMt,
        supplier_net_wt: fbSupplierMt,
        electronic_scale_net: fbElectronicMt,
        wt_ded_wt_1: fbChallanMt,
        wt_ded_wt_2: fbSupplierMt,
        wt_ded_wt_3: fbElectronicMt,
        summary_deduction_type: deductionSummaryText || '',
        summary_deduction_rate: inspDeductionRate,
        summary_deduction_qty: inspDeductionQty > 0 ? inspDeductionQty : (deductionSummaryText ? 1 : 0),
        summary_deduction_amount: inspDeductionAmount,
        deductions: parsedDeductions,
        summary_premium_wt: calculatedPremWtQtl,
        summary_instl_rate: 0,
        summary_premium_amount: calculatedPremRatePerQtl,
        val_premium_amt: calculatedPremTotalAmt,
        val_ex_short: (isLastMr && saudaDedRecord && Number(saudaDedRecord.deduction_amount) > 0) ? Number(saudaDedRecord.deduction_amount) : 0,
        val_less_amt: 0,
        arival_apmc_fees: resolvedArrivalApmcFees,
        final_apmc_fees: 0,
        final_on_ac_adv: syncedPaidAmount
      };

      const populatedCols = buildAlignedSettlementColumns(
        poDetails,
        inspDetails,
        [],
        null,
        inspMaster,
        poData,
        gList,
        agList,
        mList,
        arList,
        matchedPayDetails
      );

      const activeColsCountFallback = populatedCols.filter(c => 
        (Number(c.quantity) || 0) > 0 || (Number(c.arr_qty_wt) || 0) > 0 || (Number(c.wt_quantity) || 0) > 0
      ).length || 1;

      populatedCols.forEach(c => {
        const isActive = (Number(c.quantity) || 0) > 0 || (Number(c.arr_qty_wt) || 0) > 0 || (Number(c.wt_quantity) || 0) > 0;
        if (!isActive) {
          c.gd_claim = 0;
          c.gd_sett = 0;
          c.moist_claim = 0;
          c.moist_sett = 0;
          c.dust_claim = 0;
          c.dust_sett = 0;
          c.ncv_claim = 0;
          c.ncv_sett = 0;
          c.po_grade_claim = 0;
          c.po_grade_sett = 0;
          c.claim_settlement = 0;
        } else if (inspMaster) {
          if (c.moist_claim === 0 && inspMaster.claim_moisture != null) c.moist_claim = Number((Number(inspMaster.claim_moisture) / activeColsCountFallback).toFixed(2));
          if (c.dust_claim === 0 && inspMaster.claim_dust != null) c.dust_claim = Number((Number(inspMaster.claim_dust) / activeColsCountFallback).toFixed(2));
          if (c.ncv_claim === 0 && inspMaster.claim_ncv != null) c.ncv_claim = Number((Number(inspMaster.claim_ncv) / activeColsCountFallback).toFixed(2));
          if (c.gd_claim === 0 && inspMaster.claim_grade_down != null) c.gd_claim = Number((Number(inspMaster.claim_grade_down) / activeColsCountFallback).toFixed(2));
        }
        const gdF = (Number(c.gd_claim || 0) - Number(c.gd_sett || 0));
        const mF = (Number(c.moist_claim || 0) - Number(c.moist_sett || 0));
        const dF = (Number(c.dust_claim || 0) - Number(c.dust_sett || 0));
        const nF = (Number(c.ncv_claim || 0) - Number(c.ncv_sett || 0));
        c.claim_settlement = Number((gdF + mF + dF + nF).toFixed(2));
      });

      setMasterData(prefilledMaster);
      setDetailCols(populatedCols);
      if (inspMaster.po_no) setSelectedPoNo(inspMaster.po_no);
      setSuccessMessage(`Prepopulated settlement data successfully using MR No. ${targetMrNo}`);

    } catch (err: any) {
      setErrorMessage("Proceed fail: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Ensure selectedPoData is in sync whenever PO number changes
  useEffect(() => {
    const targetPo = masterData.po_no || selectedPoNo;
    if (!targetPo || !supabase) {
      return;
    }
    const cleanTarget = targetPo.trim().replace(/^#/, '');
    if (selectedPoData && String(selectedPoData.po_no || '').trim().replace(/^#/, '') === cleanTarget) return;

    fetchPoAndItemDetails(cleanTarget, gradeMasterList, agencyMasterList).then(({ poData }) => {
      if (poData) setSelectedPoData(poData);
    });
  }, [masterData.po_no, selectedPoNo]);

  // Live Auto Calculations based on inputs
  useEffect(() => {
    if (viewMode !== 'entry') return;

    // Calculators
    let totalQtyWeightClaims = 0;

    // Calculate Rate / m.T (Weighted Average Rate per Metric Ton across all 4 columns)
    const calculatedRatePerMt = calculateWeightedRatePerMT(detailCols);
    const nextRatePerMt = calculatedRatePerMt > 0 ? calculatedRatePerMt : (masterData.summary_rate_qtel || 0);

    // Calculate Moisture Claim % as the Average of "Final (%)" from Grade Spec Table (Moisture % row)
    const activeMoistCols = detailCols.filter(col => {
      const isColActive = (Number(col.quantity) || 0) > 0 || (Number(col.arr_qty_wt) || 0) > 0 || (Number(col.wt_quantity) || 0) > 0 || (col.grade && col.grade.trim() !== '');
      return isColActive;
    });

    let avgFinalMoisturePct = 0;
    if (activeMoistCols.length > 0) {
      const sumMoist = activeMoistCols.reduce((sum, col) => {
        const mVal = Number(col.moist_sett) > 0 ? Number(col.moist_sett) : Number(col.moist_claim || 0);
        return sum + mVal;
      }, 0);
      avgFinalMoisturePct = Number((sumMoist / activeMoistCols.length).toFixed(2));
    } else {
      const colsWithMoist = detailCols.filter(col => {
        const mVal = Number(col.moist_sett) > 0 ? Number(col.moist_sett) : Number(col.moist_claim || 0);
        return mVal > 0;
      });
      if (colsWithMoist.length > 0) {
        const sumMoist = colsWithMoist.reduce((sum, col) => {
          const mVal = Number(col.moist_sett) > 0 ? Number(col.moist_sett) : Number(col.moist_claim || 0);
          return sum + mVal;
        }, 0);
        avgFinalMoisturePct = Number((sumMoist / colsWithMoist.length).toFixed(2));
      }
    }

    const calculatedRateWtClaim = avgFinalMoisturePct;

    // Calculate auto Delivery Claim (-) penalty if delivery is received after PO delivery_to date
    const poDeliveryToDate = selectedPoData?.delivery_to || selectedPoData?.delivery_gt_to || selectedPoData?.shipment_date || selectedPoData?.delivery_to_date;
    const poDeliveryPenaltyRate = Number(selectedPoData?.delivery_penalty || selectedPoData?.shipment_penalty || 0);
    const arrivalVoucherDate = masterData.arrival_date || masterData.sett_date || (masterData as any).challan_date;
    const deliveryDelayDays = calculateDeliveryDelayDays(poDeliveryToDate, arrivalVoucherDate);

    const totalArrWeightMt = Math.round((detailCols.reduce((sum, col) => {
      const colWt = Number(col.arr_qty_wt) > 0 
        ? Number(col.arr_qty_wt) 
        : (Number(col.wt_quantity) > 0 ? Number(col.wt_quantity) : 0);
      return sum + colWt;
    }, 0) || Number(masterData.electronic_scale_net) || 0) * 1000) / 1000;
    const totalArrWeightQtl = Math.round(totalArrWeightMt * 10 * 100) / 100;

    const autoDeliveryClaimAmt = (deliveryDelayDays > 0 && poDeliveryPenaltyRate > 0 && totalArrWeightQtl > 0)
      ? Math.round(totalArrWeightQtl * poDeliveryPenaltyRate * deliveryDelayDays)
      : 0;

    // Delivery Claim in Grade-wise summary panel: auto-calculated penalty unless manually set; 0 if PO penalty rate is 0
    const deliveryClaimAmt = (poDeliveryPenaltyRate === 0)
      ? 0
      : ((masterData.summary_delivery_claim !== undefined && masterData.summary_delivery_claim !== null && masterData.summary_delivery_claim !== 0 && Number(masterData.summary_delivery_claim) !== 5550)
          ? Number(masterData.summary_delivery_claim)
          : autoDeliveryClaimAmt);

    // 1. Grand Total = Sum of Gross Column Values from active visible columns (matching Grand Total card)
    const grandTotal = visibleSpecCols.reduce((sum, idx) => sum + getColAmount(detailCols[idx - 1]), 0);

    detailCols.forEach(col => {
      // Total Claim calculation for column: Grade Down (%) + Moisture (%) + Dust (%) + NCV (%)
      const gdVal = Number(col.gd_sett) > 0 ? Number(col.gd_sett) : Number(col.gd_claim || 0);
      const mVal = Number(col.moist_sett) > 0 ? Number(col.moist_sett) : Number(col.moist_claim || 0);
      const dVal = Number(col.dust_sett) > 0 ? Number(col.dust_sett) : Number(col.dust_claim || 0);
      const nVal = Number(col.ncv_sett) > 0 ? Number(col.ncv_sett) : Number(col.ncv_claim || 0);
      col.claim_settlement = Number((gdVal + mVal + dVal + nVal).toFixed(2));

      // Grade Claim calculation logic: Claim - Sett
      const claimTotal = (Number(col.gd_claim) + Number(col.moist_claim) + Number(col.dust_claim) + Number(col.ncv_claim));
      const settTotal = (Number(col.gd_sett) + Number(col.moist_sett) + Number(col.dust_sett) + Number(col.ncv_sett));
      
      const colClaimValue = Math.max(0, claimTotal - settTotal) * Number(col.quantity);
      totalQtyWeightClaims += colClaimValue;
    });

    // Material valuation summaries
    const finalExShort = Number(masterData.val_ex_short) || 0;
    const finalLessAmount = 0;
    const calculatedDeductionAmount = Number(masterData.summary_deduction_amount) || 0;

    // 2. Material Value / Grand Total (Show only Grand Total value)
    const calculatedMaterialValue = Number(grandTotal.toFixed(2));

    // Calculate Premium Amount: Premium Rate (₹/Qtl) * Premium WT (in Qtl)
    // Note: If column premiums are already factored into each column's Sett Rate & Amount, do not double-add them to payable_amt
    const hasColumnPremiums = detailCols.some(c => Number(c.premium) > 0 && getColWtMt(c) > 0);
    const premiumRatePerQtl = Number(masterData.summary_premium_amount) || 0;
    const premiumWeightQtl = (masterData.summary_premium_wt !== undefined && masterData.summary_premium_wt !== null && Number(masterData.summary_premium_wt) > 0)
      ? Number(masterData.summary_premium_wt)
      : Number(masterData.summary_less_amount || 0);
    const calculatedPremiumAmount = hasColumnPremiums ? 0 : Number((premiumRatePerQtl * premiumWeightQtl).toFixed(2));
    const finalPremiumAmount = hasColumnPremiums
      ? 0
      : Number(masterData.val_premium_amt !== undefined && masterData.val_premium_amt !== null && masterData.val_premium_amt !== 0 ? masterData.val_premium_amt : calculatedPremiumAmount);

    // APMC Fees = Arrival APMC Fees - Actual APMC Fees
    // Actual APMC Fees (1%) = 1% × (Material Value − Delivery Claim − Deduction Amount − Deduction Claim Total − Excess/Short Amount)
    // Not applicable (0) when Area is BANGLADESH, BIHAR, LOWER ASSAM, ORISSA, or UPPER ASSAM
    const isExemptArea = isSettlementApmcExempt(
      detailCols.map(c => ({ ...c, area: resolveAreaName(c.area, areaMasterList) || c.area })),
      selectedPoData
    );
    const deductionClaimTotal = Number(masterData.val_qty_claim) || 0;
    const adjustedMaterialValue = Math.max(
      0,
      calculatedMaterialValue 
      - deliveryClaimAmt 
      - calculatedDeductionAmount 
      - deductionClaimTotal 
      - finalExShort
    );
    const calculatedApmcFees = isExemptArea ? 0 : Math.round(adjustedMaterialValue * 0.01);
    const arrivalApmcFees = Number(masterData.arival_apmc_fees) || 0;
    const actualApmcFees = calculatedApmcFees;
    const finalApmcFees = Math.min(0, Number((arrivalApmcFees - actualApmcFees).toFixed(2)));

    // Valuation calculation = Material Value + Add Amt + Premium Amt - Val Less Amt - Qty Claim
    const calculatedValuationVal = Number((
      calculatedMaterialValue 
      + Number(masterData.val_add_amt || 0) 
      + finalPremiumAmount 
      - finalLessAmount 
      - deductionClaimTotal 
      - Number(masterData.val_less_amt || 0)
    ).toFixed(2));

    const cstAmt = (calculatedMaterialValue * (Number(masterData.final_cst_pct_amt) || 0)) / 100;

    // TOTAL LESS / DEDUCTIONS =
    // On/Account Advance + Delivery Claim + Misc Less + Deduction Amount + Valuation Less Amount + Deduction Claim Total + Ex/Short
    const onAcAdvVal = Number(masterData.final_on_ac_adv || 0);
    const deliveryClaimVal = Number(deliveryClaimAmt || 0);
    const miscLessVal = Number(masterData.summary_misc_less || 0);
    const valLessAmtVal = Number(masterData.val_less_amt || 0) + Number(masterData.final_less_adv || 0);
    const totalLessDeductions = Number((
      onAcAdvVal +
      deliveryClaimVal +
      miscLessVal +
      calculatedDeductionAmount +
      valLessAmtVal +
      deductionClaimTotal +
      finalExShort
    ).toFixed(2));

    // TOTAL ADDITIONS =
    // APMC Fees + Premium Amount + Add Amount + Misc Add (+ CST)
    const addAmtVal = Number(masterData.val_add_amt || 0);
    const miscAddVal = Number(masterData.summary_misc_add || 0);
    const totalAdditions = Number((
      finalApmcFees +
      finalPremiumAmount +
      addAmtVal +
      miscAddVal +
      cstAmt
    ).toFixed(2));

    // RESOLVED PAYABLE ACCOUNT = GRAND TOTAL − TOTAL LESS/Deductions + TOTAL ADDITIONS
    const calculatedPayable = Number((
      calculatedMaterialValue - totalLessDeductions + totalAdditions
    ).toFixed(2));

    // Only update if changes to prevent cycling
    setMasterData(prev => {
      const nextActualApmcFees = calculatedApmcFees;
      const targetRateAffCdCl = prev.summary_rate_aff_cd_cl > 0 ? prev.summary_rate_aff_cd_cl : nextRatePerMt;

      const targetDeliveryClaim = (poDeliveryPenaltyRate === 0)
        ? 0
        : ((prev.summary_delivery_claim !== undefined && prev.summary_delivery_claim !== null && prev.summary_delivery_claim !== 0 && Number(prev.summary_delivery_claim) !== 5550)
            ? Number(prev.summary_delivery_claim)
            : autoDeliveryClaimAmt);

      if (
        prev.summary_material_value !== calculatedMaterialValue ||
        prev.val_material_value !== calculatedMaterialValue ||
        prev.payable_amt !== calculatedPayable ||
        prev.val_less_amount !== finalLessAmount ||
        prev.final_apmc_fees !== finalApmcFees ||
        prev.summary_rate_wt_claim !== calculatedRateWtClaim ||
        prev.summary_rate_aff_cd_cl !== targetRateAffCdCl ||
        prev.val_premium_amt !== calculatedPremiumAmount ||
        prev.summary_delivery_claim !== targetDeliveryClaim ||
        prev.actual_apmc_fees !== nextActualApmcFees ||
        (calculatedRatePerMt > 0 && (prev.summary_rate_qtel !== nextRatePerMt || prev.rate_qntl !== nextRatePerMt))
      ) {
        return {
          ...prev,
          summary_material_value: calculatedMaterialValue,
          val_material_value: calculatedMaterialValue,
          value_amt: calculatedMaterialValue,
          val_less_amount: finalLessAmount,
          payable_amt: calculatedPayable,
          net_amt: calculatedPayable,
          actual_apmc_fees: nextActualApmcFees,
          final_apmc_fees: finalApmcFees,
          summary_rate_qtel: nextRatePerMt,
          rate_qntl: nextRatePerMt,
          summary_rate_aff_cd_cl: targetRateAffCdCl,
          summary_rate_wt_claim: calculatedRateWtClaim,
          val_premium_amt: calculatedPremiumAmount,
          summary_delivery_claim: targetDeliveryClaim
        };
      }
      return prev;
    });

  }, [detailCols, visibleSpecCols, areaMasterList, masterData.electronic_scale_net, masterData.summary_rate_aff_cd_cl, masterData.summary_rate_qtel, masterData.summary_premium_amount, masterData.summary_premium_wt, masterData.summary_deduction_amount, masterData.summary_delivery_claim, masterData.val_add_amt, masterData.val_less_amt, masterData.val_qty_claim, masterData.val_ex_short, masterData.summary_less_amount, masterData.final_less_adv, masterData.final_on_ac_adv, masterData.final_cst_pct_amt, masterData.actual_apmc_fees, masterData.arival_apmc_fees, masterData.arrival_date, masterData.sett_date, selectedPoData]);

  // Handle master updates
  const handleMasterChange = (field: keyof SettlementMaster, value: any) => {
    setMasterData(prev => ({ ...prev, [field]: value }));
  };

  // Handle multi-row deductions updates
  const handleDeductionRowChange = (index: number, field: keyof SettlementDeductionItem, value: any) => {
    setMasterData(prev => {
      const currentDeductions: SettlementDeductionItem[] = (prev.deductions && prev.deductions.length > 0)
        ? [...prev.deductions]
        : [{
            deduction_type: prev.summary_deduction_type || '',
            deduction_rate: prev.summary_deduction_rate || 0,
            deduction_qty: prev.summary_deduction_qty || 1,
            deduction_amount: prev.summary_deduction_amount || 0
          }];
      
      const updatedRow = { ...currentDeductions[index], [field]: value };
      if (field === 'deduction_rate' || field === 'deduction_qty') {
        const rate = field === 'deduction_rate' ? (Number(value) || 0) : (Number(updatedRow.deduction_rate) || 0);
        const qty = field === 'deduction_qty' ? (Number(value) || 0) : (Number(updatedRow.deduction_qty) || 0);
        updatedRow.deduction_amount = Number((rate * qty).toFixed(2));
      }
      currentDeductions[index] = updatedRow;

      const totalDeductionAmt = Number(currentDeductions.reduce((s, r) => s + (Number(r.deduction_amount) || 0), 0).toFixed(2));
      const summaryTypes = currentDeductions
        .filter(r => r.deduction_type && r.deduction_type.trim() !== '')
        .map(r => {
          if (r.deduction_amount > 0) return `${r.deduction_type} (₹${r.deduction_amount})`;
          if (r.deduction_rate > 0 && r.deduction_qty > 0) return `${r.deduction_type} (${r.deduction_qty} @ ₹${r.deduction_rate})`;
          return r.deduction_type;
        })
        .join(', ');

      return {
        ...prev,
        deductions: currentDeductions,
        summary_deduction_amount: totalDeductionAmt,
        summary_deduction_type: summaryTypes || currentDeductions[0]?.deduction_type || '',
        summary_deduction_rate: currentDeductions[0]?.deduction_rate || 0,
        summary_deduction_qty: currentDeductions[0]?.deduction_qty || 1
      };
    });
  };

  const handleAddDeductionRow = () => {
    setMasterData(prev => {
      const currentDeductions: SettlementDeductionItem[] = (prev.deductions && prev.deductions.length > 0)
        ? [...prev.deductions]
        : [{
            deduction_type: prev.summary_deduction_type || '',
            deduction_rate: prev.summary_deduction_rate || 0,
            deduction_qty: prev.summary_deduction_qty || 1,
            deduction_amount: prev.summary_deduction_amount || 0
          }];
      currentDeductions.push({
        deduction_type: '',
        deduction_rate: 0,
        deduction_qty: 1,
        deduction_amount: 0
      });
      return {
        ...prev,
        deductions: currentDeductions
      };
    });
  };

  const handleRemoveDeductionRow = (index: number) => {
    setMasterData(prev => {
      const currentDeductions: SettlementDeductionItem[] = (prev.deductions && prev.deductions.length > 0)
        ? [...prev.deductions]
        : [];
      if (currentDeductions.length <= 1) {
        return {
          ...prev,
          deductions: [{ deduction_type: '', deduction_rate: 0, deduction_qty: 1, deduction_amount: 0 }],
          summary_deduction_type: '',
          summary_deduction_rate: 0,
          summary_deduction_qty: 0,
          summary_deduction_amount: 0
        };
      }
      currentDeductions.splice(index, 1);
      const totalDeductionAmt = Number(currentDeductions.reduce((s, r) => s + (Number(r.deduction_amount) || 0), 0).toFixed(2));
      const summaryTypes = currentDeductions
        .filter(r => r.deduction_type && r.deduction_type.trim() !== '')
        .map(r => r.deduction_type)
        .join(', ');

      return {
        ...prev,
        deductions: currentDeductions,
        summary_deduction_amount: totalDeductionAmt,
        summary_deduction_type: summaryTypes || currentDeductions[0]?.deduction_type || '',
        summary_deduction_rate: currentDeductions[0]?.deduction_rate || 0,
        summary_deduction_qty: currentDeductions[0]?.deduction_qty || 1
      };
    });
  };

  // Handle columns grid updates
  const handleColChange = (idx: number, field: keyof SettlementDetailColumn, value: any) => {
    setDetailCols(prev => {
      const isColActive = (col: SettlementDetailColumn) => {
        const qty = Number(col.quantity) || 0;
        const arrWt = Number(col.arr_qty_wt) || 0;
        const wtQty = Number(col.wt_quantity) || 0;
        return (qty > 0 || arrWt > 0 || wtQty > 0 || Boolean(col.grade));
      };

      const claimFields = ['gd_claim', 'moist_claim', 'dust_claim', 'ncv_claim', 'po_grade_claim'];
      if (claimFields.includes(field as string)) {
        return prev.map(c => {
          if (!isColActive(c)) {
            return { ...c, [field]: 0 };
          }
          if (c.col_index === idx) {
            const nextCol = { ...c, [field]: value };
            if (field === 'gd_claim' && (!nextCol.sett_pct || Number(nextCol.sett_pct) === 0)) {
              nextCol.sett_pct = Number(value) || 0;
              nextCol.gd_sett = Number(value) || 0;
            }
            return nextCol;
          }
          return c;
        });
      }

      return prev.map(c => {
        if (c.col_index !== idx) return c;
        const updated = { ...c, [field]: value };

        // Synchronize sett_pct <-> gd_sett
        if (field === 'sett_pct') {
          updated.gd_sett = Number(value) || 0;
        } else if (field === 'gd_sett') {
          updated.sett_pct = Number(value) || 0;
        }

        if (field === 'quantity' || field === 'arr_qty_wt' || field === 'wt_phota' || field === 'min_qty_wt') {
          const qty = Number(updated.quantity) || 0;
          const arrWt = Number(updated.arr_qty_wt) || 0;
          
          if (field === 'quantity' && qty === 0) {
            updated.wt_quantity = 0;
            updated.arr_qty_wt = 0;
            updated.min_qty_wt = 0;
            updated.wt_phota = 0;
            updated.gd_claim = 0;
            updated.gd_sett = 0;
            updated.sett_pct = 0;
            updated.deduction_rate = 0;
            updated.moist_claim = 0;
            updated.moist_sett = 0;
            updated.dust_claim = 0;
            updated.dust_sett = 0;
            updated.ncv_claim = 0;
            updated.ncv_sett = 0;
            updated.po_grade_claim = 0;
            updated.po_grade_sett = 0;
            updated.claim_settlement = 0;
          } else {
            // Auto update Min.Qty/Wt to 3% acceptable (97% of Arr. Qty/Wt) when Arr. Qty/Wt changes
            if (field === 'arr_qty_wt') {
              updated.min_qty_wt = arrWt > 0 ? Number((arrWt * 0.97).toFixed(3)) : 0;
            }
            // Auto update Wt/Quantity calculation: Round "Arr. Qty/Wt" convert in kg / Quantity (B)
            const arrWtKg = arrWt > 0 ? (arrWt <= 50 ? arrWt * 1000 : arrWt) : 0;
            if (qty > 0 && arrWtKg > 0) {
              updated.wt_quantity = Math.round(arrWtKg / qty);
              updated.wt_phota = updated.wt_quantity;
            } else if (qty > 0 && Number(updated.wt_phota) > 0) {
              updated.wt_quantity = Number(updated.wt_phota);
            }
          }
        }

        // Recalculate Satta Grade Down deduction, Sett Rate, Quantity (Qtl), and Amount
        const rateVal = Number(updated.rate_value) || 0;
        const premVal = Number(updated.premium) || 0;
        const settPctVal = updated.sett_pct !== undefined && updated.sett_pct !== null
          ? Number(updated.sett_pct)
          : (Number(updated.gd_sett) > 0 ? Number(updated.gd_sett) : Number(updated.gd_claim || 0));

        if (field !== 'deduction_rate') {
          const sattaObj = calculateSattaDeduction(
            updated.grade,
            rateVal,
            settPctVal,
            getCachedSattaDiffs(),
            gradeMasterList.map((g: any) => ({ code: g.grade_code || g.code || g.id, name: g.grade_name || g.name || g.grade })),
            updated.po_items,
            updated.lower_grade,
            updated.lower_grade_rate,
            prev
          );
          updated.deduction_rate = sattaObj.deduction;
          updated.target_lower_grade = sattaObj.targetGradeName;
          if (!updated.lower_grade) updated.lower_grade = sattaObj.targetGradeName;
          if (field !== 'lower_grade_rate') updated.lower_grade_rate = sattaObj.lowerRate;
          updated.grade_diff = sattaObj.diff;
        }

        const dedRateVal = Number(updated.deduction_rate) || 0;
        updated.sett_rate = rateVal > 0 ? Number((rateVal + premVal - dedRateVal).toFixed(2)) : 0;
        updated.quantity_qtl = Number((getColWtMt(updated) * 10).toFixed(2));
        updated.amount = Number((updated.quantity_qtl * updated.sett_rate).toFixed(2));

        return updated;
      });
    });
  };

  // Perform Db save/register
  const handleSaveSettlement = async (bypassAudit: boolean = false) => {
    if (isEdit && !enforceEditOrDeletePermission("Edit")) {
      return;
    }

    // Mandatory Validation for Bill No. and Bill Date
    const trimmedBillNo = (masterData.payable_bill_no || '').trim();
    const trimmedBillDate = (masterData.payable_bill_date || '').trim();

    if (!trimmedBillNo || !trimmedBillDate) {
      const missingFields = [];
      if (!trimmedBillNo) missingFields.push("Bill No.");
      if (!trimmedBillDate) missingFields.push("Bill Date");
      setErrorMessage(`Mandatory Field Error: Please enter ${missingFields.join(' and ')} before settling the account.`);
      return;
    }

    let targetMrNo = masterData.mr_no ? masterData.mr_no.trim() : '';
    if (!targetMrNo) {
      if (masterData.lorry_number) {
        const cleanLorry = masterData.lorry_number.trim().toUpperCase().replace(/\s+/g, '');
        targetMrNo = `MR-${cleanLorry}`;
      } else if (masterData.po_no) {
        targetMrNo = `MR-PO-${masterData.po_no.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString().slice(-4)}`;
      } else {
        targetMrNo = `MR-${Date.now().toString().slice(-6)}`;
      }
      setMasterData(prev => ({ ...prev, mr_no: targetMrNo }));
    }

    // Validate that settlement_weight (we check both totalSettleQty and electronic_scale_net / challan_weight)
    // does not exceed pendingReceivedQty
    const totalSettleQty = detailCols.reduce((sum, c) => sum + getColWtMt(c), 0);
    const activeWeight = Math.max(
      totalSettleQty, 
      Number(masterData.electronic_scale_net) || 0, 
      Number(masterData.challan_weight) || 0
    );

    let allowedWeight = poStats ? poStats.pendingReceivedQty : 0;
    if (isEdit && selectedPoNo) {
      // Find if there was an existing record for this mr_no in customSettlementRecords
      const existingRecord = customSettlementRecords.find(r => r.mr_no === targetMrNo || r.id === masterData.settlement_id);
      if (existingRecord) {
        allowedWeight += (Number(existingRecord.quantity) || 0);
      }
    }

    if (!bypassAudit && poStats && activeWeight > allowedWeight && allowedWeight > 0) {
      setAuditOverwriteInfo({
        activeWeight,
        allowedWeight,
        selectedPoNo: selectedPoNo || masterData.po_no || 'N/A',
        targetMrNo
      });
      setShowAuditOverwriteModal(true);
      setErrorMessage(`Validation Failure (Audit Block): The settlement weight of ${activeWeight.toFixed(3)} MT exceeds the currently calculated 'pending_received' limit of ${allowedWeight.toFixed(3)} MT for selected PO ${selectedPoNo}. Click 'Authorize & Overwrite' to confirm and save.`);
      return;
    }

    // Close overwrite modal if open
    setShowAuditOverwriteModal(false);

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      if (!supabase) throw new Error("Supabase client is not available.");

      const rawSettDate = String(masterData.sett_date || '').trim();
      const validSettDate = (rawSettDate && !/^000\d/.test(rawSettDate) && !/^00\d{2}/.test(rawSettDate))
        ? rawSettDate
        : (masterData.arrival_date || masterData.payable_bill_date || masterData.po_date || new Date().toISOString().split('T')[0]);

      // 1. Insert or Update Master via resilient dbModule.upsert
      const masterPayload = {
        mr_no: targetMrNo,
        sett_date: validSettDate,
        po_type: masterData.po_type,
        broker: masterData.broker,
        supplier: masterData.supplier,
        chn_supplier: masterData.chn_supplier,
        po_no: masterData.po_no,
        po_date: masterData.po_date || null,
        lorry_number: masterData.lorry_number,
        auto_ho_settlement: masterData.auto_ho_settlement,
        detention_days: Number(masterData.detention_days) || 0,
        arrival_no: masterData.arrival_no,
        arrival_date: masterData.arrival_date || null,
        arival_apmc_fees: Number(masterData.arival_apmc_fees) || 0,
        actual_apmc_fees: Math.round(Number(masterData.actual_apmc_fees) || 0),
        remarks: masterData.remarks,
        summary_rate_qtel: Number(masterData.summary_rate_qtel) || 0,
        summary_rate_aff_cd_cl: Number(masterData.summary_rate_aff_cd_cl) || 0,
        summary_delivery_claim: Number(masterData.summary_delivery_claim) || 0,
        summary_rate_wt_claim: Number(masterData.summary_rate_wt_claim) || 0,
        summary_instl_rate: Number(masterData.summary_instl_rate) || 0,
        summary_premium_wt: Number(masterData.summary_premium_wt ?? 0),
        summary_material_value: Number(masterData.summary_material_value) || 0,
        summary_misc_add: Number(masterData.summary_misc_add) || 0,
        summary_misc_less: Number(masterData.summary_misc_less) || 0,
        summary_premium_amount: Number(masterData.summary_premium_amount) || 0,
        summary_less_amount: Number(masterData.summary_less_amount) || 0,
        summary_instl_amount: Number(masterData.summary_instl_amount) || 0,
        summary_deduction_type: masterData.summary_deduction_type || '',
        summary_deduction_rate: Number(masterData.summary_deduction_rate) || 0,
        summary_deduction_qty: Number(masterData.summary_deduction_qty) || 0,
        summary_deduction_amount: Number(masterData.summary_deduction_amount) || 0,
        deductions: masterData.deductions || [],
        val_material_value: Number(masterData.val_material_value) || 0,
        val_add_amt: Number(masterData.val_add_amt) || 0,
        val_less_amt: Number(masterData.val_less_amt) || 0,
        val_premium_amt: Number(masterData.val_premium_amt) || 0,
        val_less_amount: Number(masterData.val_less_amount) || 0,
        val_qty_claim: Number(masterData.val_qty_claim) || 0,
        val_ex_short: Number(masterData.val_ex_short) || 0,
        final_less_adv: Number(masterData.final_less_adv) || 0,
        final_on_ac_adv: Number(masterData.final_on_ac_adv) || 0,
        final_apmc_fees: Number(masterData.final_apmc_fees) || 0,
        final_cst_pct_amt: Number(masterData.final_cst_pct_amt) || 0,
        payable_amt: Number(masterData.payable_amt) || 0,
        payable_bill_no: masterData.payable_bill_no,
        payable_bill_date: masterData.payable_bill_date || null,
        wt_ded_wt_1: Number(masterData.wt_ded_wt_1) || 0,
        wt_ded_wt_2: Number(masterData.wt_ded_wt_2) || 0,
        wt_ded_wt_3: Number(masterData.wt_ded_wt_3) || 0,
        rate_qntl: Number(masterData.rate_qntl) || 0,
        value_amt: Number(masterData.value_amt) || 0,
        adjustment_amt: Number(masterData.adjustment_amt) || 0,
        net_amt: Number(masterData.net_amt) || 0,
        challan_weight: Number(masterData.challan_weight) || 0,
        supplier_net_wt: Number(masterData.supplier_net_wt) || 0,
        electronic_scale_net: Number(masterData.electronic_scale_net) || 0,
        payment_status: masterData.payment_status || 'Pending'
      };

      await dbModule.upsert('mr_settlement_master', masterPayload, 'mr_no');

      try {
        await supabase.rpc('exec_sql', {
          query: `
            ALTER TABLE IF EXISTS mr_settlement_detail ADD COLUMN IF NOT EXISTS premium NUMERIC DEFAULT 0;
            ALTER TABLE IF EXISTS mr_settlement_detail ADD COLUMN IF NOT EXISTS sett_pct NUMERIC DEFAULT 0;
            ALTER TABLE IF EXISTS mr_settlement_detail ADD COLUMN IF NOT EXISTS deduction_rate NUMERIC DEFAULT 0;
            ALTER TABLE IF EXISTS mr_settlement_detail ADD COLUMN IF NOT EXISTS sett_rate NUMERIC DEFAULT 0;
            ALTER TABLE IF EXISTS mr_settlement_detail ADD COLUMN IF NOT EXISTS quantity_qtl NUMERIC DEFAULT 0;
            ALTER TABLE IF EXISTS mr_settlement_detail ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0;
            ALTER TABLE IF EXISTS mr_settlement_detail ADD COLUMN IF NOT EXISTS lower_grade TEXT DEFAULT '';
            ALTER TABLE IF EXISTS mr_settlement_detail ADD COLUMN IF NOT EXISTS target_lower_grade TEXT DEFAULT '';
            ALTER TABLE IF EXISTS mr_settlement_detail ADD COLUMN IF NOT EXISTS lower_grade_rate NUMERIC DEFAULT 0;
            ALTER TABLE IF EXISTS mr_settlement_detail ADD COLUMN IF NOT EXISTS grade_diff NUMERIC DEFAULT 0;
          `
        });
      } catch (_sqlErr) {}

      // 2. Prepare active columns (where grade or area is present, or fallback to first column)
      const activeDetailCols = detailCols.filter(c => c.grade.trim() !== '' || c.area.trim() !== '' || Number(c.quantity) > 0 || Number(c.arr_qty_wt) > 0);
      const colsToPersist = activeDetailCols.length > 0 ? activeDetailCols : (detailCols.length > 0 ? [detailCols[0]] : []);

      const rowsToWrite = colsToPersist.map((c, idx) => ({
        mr_no: targetMrNo,
        srl_no: c.col_index || idx + 1,
        col_index: c.col_index || idx + 1,
        grade: c.grade || (masterData as any).arrival_grade || 'TD6',
        area: c.area,
        agency: c.agency,
        marka_crop: c.marka_crop,
        quantity: Number(c.quantity) || 0,
        arr_qty_wt: Number(c.arr_qty_wt) || 0,
        min_qty_wt: Number(c.min_qty_wt) || 0,
        wt_phota: Number(c.wt_phota) || 0,
        wt_quantity: Number(c.wt_quantity) || 0,
        rate_value: Number(c.rate_value) || 0,
        premium: Number(c.premium) || 0,
        sett_pct: Number(c.sett_pct) || (Number(c.gd_sett) > 0 ? Number(c.gd_sett) : Number(c.gd_claim || 0)),
        deduction_rate: Number(c.deduction_rate) || 0,
        sett_rate: getEffectiveColSettRate(c),
        quantity_qtl: Number(c.quantity_qtl) > 0 ? Number(c.quantity_qtl) : Number((getColWtMt(c) * 10).toFixed(2)),
        amount: getColAmount(c),
        lower_grade: c.lower_grade || '',
        target_lower_grade: c.target_lower_grade || '',
        lower_grade_rate: Number(c.lower_grade_rate) || 0,
        grade_diff: Number(c.grade_diff) || 0,
        gd_claim: Number(c.gd_claim) || 0,
        gd_sett: Number(c.gd_sett) || 0,
        gd_rev: Number(c.gd_rev) || 0,
        gd_final: Number(c.gd_final) || 0,
        moist_claim: Number(c.moist_claim) || 0,
        moist_sett: Number(c.moist_sett) || 0,
        moist_rev: Number(c.moist_rev) || 0,
        moist_final: Number(c.moist_final) || 0,
        dust_claim: Number(c.dust_claim) || 0,
        dust_sett: Number(c.dust_sett) || 0,
        dust_rev: Number(c.dust_rev) || 0,
        dust_final: Number(c.dust_final) || 0,
        ncv_claim: Number(c.ncv_claim) || 0,
        ncv_sett: Number(c.ncv_sett) || 0,
        ncv_rev: Number(c.ncv_rev) || 0,
        ncv_final: Number(c.ncv_final) || 0,
        po_grade_claim: Number(c.po_grade_claim) || 0,
        po_grade_sett: Number(c.po_grade_sett) || 0,
        po_grade_rev: Number(c.po_grade_rev) || 0,
        po_grade_final: Number(c.po_grade_final) || 0,
        adjust_type: c.adjust_type,
        remark: c.remark,
        claim_settlement: Number(c.claim_settlement) || 0
      }));

      if (rowsToWrite.length > 0) {
        await supabase
          .from('mr_settlement_detail')
          .delete()
          .eq('mr_no', targetMrNo);

        for (const detailRow of rowsToWrite) {
          await dbModule.insert('mr_settlement_detail', detailRow).catch((err) => {
            console.warn("mr_settlement_detail insert warning:", err);
          });
        }
      }

      // Live sync to custom table 'm_r_settlement' with manual weight entries and status checks
      const qualitySummary = `Moisture Claim: ${detailCols.map(c => c.moist_claim).filter(Boolean).join('/') || '0'} | Dust Claim: ${detailCols.map(c => c.dust_claim).filter(Boolean).join('/') || '0'}`;
      const materialDetails = detailCols.map(c => `${c.grade || 'N/A'} (${c.area || 'N/A'} - ${c.agency || 'N/A'})`).filter(g => !g.startsWith('N/A')).join(', ');

      await dbModule.upsert('m_r_settlement', {
        mr_no: targetMrNo,
        po_no: masterData.po_no || targetMrNo || 'N/A',
        lorry_number: masterData.lorry_number,
        material_details: materialDetails || 'Material Goods Received',
        quality: qualitySummary,
        quantity: totalSettleQty,
        settlement_date: masterData.sett_date,
        payment_status: masterData.payment_status || 'Pending',
        challan_weight: Number(masterData.challan_weight) || 0,
        supplier_net_wt: Number(masterData.supplier_net_wt) || 0,
        electronic_scale_net: Number(masterData.electronic_scale_net) || 0,
        remarks: masterData.remarks
      }, 'mr_no').catch((customTableErr) => {
        console.warn("m_r_settlement Sync Notice:", customTableErr);
      });

      // Mark P.O and M.R status as 'settled' so they move to Settlement table
      if (masterData.po_no) {
        await dbModule.update('purchase_master', 'po_no', masterData.po_no, { status: 'settled', pending: false }).catch(() => {});
        await dbModule.update('sauda_master', 'sauda_no', masterData.po_no, { status: 'settled', pending: false }).catch(() => {});
        await dbModule.update('sauda_master', 'po_no', masterData.po_no, { status: 'settled', pending: false }).catch(() => {});
        await dbModule.update('sauda_check_point', 'po_no', masterData.po_no, { status: 'settled', pending: false }).catch(() => {});
      }

      if (targetMrNo || masterData.po_no) {
        if (targetMrNo) {
          await dbModule.update('mill_inspection_master', 'mr_no', targetMrNo, { status: 'settled' }).catch(() => {});
          await dbModule.update('mill_inspection_master', 'arrival_no', targetMrNo, { status: 'settled' }).catch(() => {});
          await dbModule.update('final_arrival', 'mr_no', targetMrNo, { status: 'settled' }).catch(() => {});
          await dbModule.update('final_arrival', 'arrival_no', targetMrNo, { status: 'settled' }).catch(() => {});
          await dbModule.update('temporary_material_received', 'mr_no', targetMrNo, { status: 'settled' }).catch(() => {});
          await dbModule.update('temporary_material_received', 'arrival_no', targetMrNo, { status: 'settled' }).catch(() => {});
        }
        if (masterData.po_no) {
          await dbModule.update('mill_inspection_master', 'po_no', masterData.po_no, { status: 'settled' }).catch(() => {});
          await dbModule.update('final_arrival', 'po_no', masterData.po_no, { status: 'settled' }).catch(() => {});
          await dbModule.update('temporary_material_received', 'po_no', masterData.po_no, { status: 'settled' }).catch(() => {});
        }
      }



      if (onLogEvent) {
        onLogEvent('MR_SETTLEMENT', `Archived settlement for MR [MR: ${masterData.mr_no}] against PO [PO: ${masterData.po_no}] with Payment Status: ${masterData.payment_status || 'Pending'}. Settle Quantity: ${totalSettleQty} MT`);
      }

      setSuccessMessage(`M.R. Settlement [MR No ${masterData.mr_no}] finalized and archived successfully !`);
      setLastSyncTime(new Date().toLocaleTimeString());
      setShowSuccessAnim(true);
      setTimeout(() => {
        setShowSuccessAnim(false);
        setViewMode('dashboard');
        initPage();
      }, 2500);

    } catch (err: any) {
      setErrorMessage("Save failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Revert Settlement Functionality (Restricted to Admin / L5 users)
  const handleRevertSettlement = async (targetMr: string, targetPoNo?: string) => {
    if (!isL5OrAdmin()) {
      alert("Permission Denied: Revert operation is restricted. Only Admin and L5 users can revert settlements.");
      return;
    }

    const poInfo = targetPoNo ? ` (P.O #${targetPoNo})` : '';
    if (!window.confirm(`REVERT SETTLEMENT CONFIRMATION:\nAre you sure you want to CANCEL & REVERT the settlement for M.R. #${targetMr}${poInfo}?\n\nThis action will cancel the settlement and MOVE the P.O data back to Final P.O and Final M.R data back to Final M.R registers.`)) {
      return;
    }

    setLoading(true);
    try {
      if (!supabase) throw new Error("Supabase client is not available.");

      const cleanMr = String(targetMr).trim();

      // 1. Delete settlement records from Supabase
      await supabase.from('mr_settlement_detail').delete().eq('mr_no', cleanMr);
      await supabase.from('mr_settlement_master').delete().eq('mr_no', cleanMr);
      await supabase.from('m_r_settlement').delete().eq('mr_no', cleanMr);

      // Direct SQL transaction fallback
      try {
        const esc = (v: string) => `'${v.replace(/'/g, "''")}'`;
        await dbModule.executeTransaction([
          `DELETE FROM mr_settlement_detail WHERE LOWER(TRIM(mr_no)) = LOWER(TRIM(${esc(cleanMr)}));`,
          `DELETE FROM mr_settlement_master WHERE LOWER(TRIM(mr_no)) = LOWER(TRIM(${esc(cleanMr)}));`,
          `DELETE FROM m_r_settlement WHERE LOWER(TRIM(mr_no)) = LOWER(TRIM(${esc(cleanMr)}));`
        ]);
      } catch (_e) {}

      // Clear local caches
      await dbModule.delete('mr_settlement_detail', cleanMr, 'mr_no').catch(() => {});
      await dbModule.delete('m_r_settlement', cleanMr, 'mr_no').catch(() => {});
      await dbModule.delete('mr_settlement_master', cleanMr, 'mr_no').catch(() => {});
      dbModule.invalidateCache();

      // 2. Restore P.O status in purchase_master and sauda_master back to Final P.O (pending/final)
      if (targetPoNo) {
        await supabase
          .from('purchase_master')
          .update({ status: 'final', pending: true, payment_status: 'Pending' })
          .eq('po_no', targetPoNo);

        await supabase
          .from('sauda_master')
          .update({ status: 'active', pending: true })
          .or(`sauda_no.eq.${targetPoNo},po_no.eq.${targetPoNo}`);
      }

      // 3. Restore Final M.R data status back to Final M.R (active / Pending)
      const filterStr = targetPoNo ? `mr_no.eq.${cleanMr},po_no.eq.${targetPoNo}` : `mr_no.eq.${cleanMr}`;
      await supabase
        .from('mill_inspection_master')
        .update({ status: 'active', payment_status: 'Pending' })
        .or(filterStr);

      await supabase
        .from('final_arrival')
        .update({ status: 'active', payment_status: 'Pending' })
        .or(filterStr);

      await supabase
        .from('temporary_material_received')
        .update({ status: 'active', payment_status: 'Pending' })
        .or(filterStr);

      if (onLogEvent) {
        onLogEvent('MR_SETTLEMENT_REVERT', `Reverted settlement for M.R #${cleanMr} / PO #${targetPoNo || 'N/A'}. P.O data restored to Final P.O and Final M.R.`);
      }

      alert(`SUCCESS: Settlement for M.R. #${cleanMr} has been cancelled and reverted!\n\nP.O data moved back to Final P.O and Final M.R data moved back to Final M.R.`);
      await initPage();
    } catch (err: any) {
      console.error("Revert error:", err);
      alert("Error reverting settlement: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Settle removal / purge
  const handleDeleteSettlement = (targetMr: string) => {
    if (!targetMr) return;
    if (!enforceEditOrDeletePermission("Delete")) {
      return;
    }
    setDeleteConfirmMr(targetMr);
  };

  const executeDeleteSettlement = async (targetMr: string) => {
    if (!targetMr) return;
    const cleanMr = String(targetMr).trim();
    setDeleteConfirmMr(null);
    setLoading(true);
    try {
      // 1. Invalidate settlement caches immediately
      dbModule.invalidateCache('mr_settlement_master');
      dbModule.invalidateCache('mr_settlement_detail');
      dbModule.invalidateCache('m_r_settlement');
      dbModule.invalidateCache('final_arrival');
      dbModule.invalidateCache('material_inspection');
      dbModule.invalidateCache('mill_inspection_master');
      dbModule.invalidateCache();

      // 2. Supabase deletions & status resets (ONLY Settlement tables!)
      if (supabase) {
        await supabase.from('mr_settlement_detail').delete().eq('mr_no', cleanMr);
        await supabase.from('m_r_settlement').delete().eq('mr_no', cleanMr);
        await supabase.from('mr_settlement_master').delete().eq('mr_no', cleanMr);

        // Reset arrival status back to Pending / active
        await supabase.from('final_arrival').update({ status: 'active', payment_status: 'Pending' }).or(`mr_no.eq.${cleanMr},final_arrival_no.eq.${cleanMr},arrival_no.eq.${cleanMr}`);
        await supabase.from('material_inspection').update({ status: 'Completed', payment_status: 'Pending' }).or(`mr_no.eq.${cleanMr},arrival_no.eq.${cleanMr}`);
        await supabase.from('mill_inspection_master').update({ status: 'active', payment_status: 'Pending' }).or(`mr_no.eq.${cleanMr},arrival_no.eq.${cleanMr}`);
        await supabase.from('temporary_material_received').update({ status: 'active', payment_status: 'Pending' }).or(`mr_no.eq.${cleanMr},arrival_no.eq.${cleanMr},temporary_arrival_no.eq.${cleanMr}`);
      }

      // 3. Fallback SQL Transaction Execution (Settlement tables only!)
      try {
        const esc = (v: string) => `'${v.replace(/'/g, "''")}'`;
        const sqls: string[] = [
          `DELETE FROM mr_settlement_detail WHERE LOWER(TRIM(mr_no)) = LOWER(TRIM(${esc(cleanMr)}));`,
          `DELETE FROM mr_settlement_master WHERE LOWER(TRIM(mr_no)) = LOWER(TRIM(${esc(cleanMr)}));`,
          `DELETE FROM m_r_settlement WHERE LOWER(TRIM(mr_no)) = LOWER(TRIM(${esc(cleanMr)}));`,
          `UPDATE final_arrival SET status = 'active', payment_status = 'Pending' WHERE LOWER(TRIM(mr_no)) = LOWER(TRIM(${esc(cleanMr)})) OR LOWER(TRIM(final_arrival_no)) = LOWER(TRIM(${esc(cleanMr)})) OR LOWER(TRIM(arrival_no)) = LOWER(TRIM(${esc(cleanMr)}));`,
          `UPDATE material_inspection SET status = 'Completed', payment_status = 'Pending' WHERE LOWER(TRIM(mr_no)) = LOWER(TRIM(${esc(cleanMr)})) OR LOWER(TRIM(arrival_no)) = LOWER(TRIM(${esc(cleanMr)}));`,
          `UPDATE mill_inspection_master SET status = 'active', payment_status = 'Pending' WHERE LOWER(TRIM(mr_no)) = LOWER(TRIM(${esc(cleanMr)})) OR LOWER(TRIM(arrival_no)) = LOWER(TRIM(${esc(cleanMr)}));`
        ];

        await dbModule.executeTransaction(sqls);
      } catch (sqlErr) {
        console.warn("SQL transaction fallback deletion notice:", sqlErr);
      }

      // 4. Also delete from dbModule local cache for settlement tables
      await dbModule.delete('mr_settlement_detail', cleanMr, 'mr_no').catch(() => {});
      await dbModule.delete('m_r_settlement', cleanMr, 'mr_no').catch(() => {});
      await dbModule.delete('mr_settlement_master', cleanMr, 'mr_no').catch(() => {});

      dbModule.invalidateCache();

      // 5. Update local React states immediately
      setSettledList((prev) =>
        prev.filter((r) => {
          const rMr = String(r?.mr_no || '').trim().toUpperCase();
          return rMr !== cleanMr.toUpperCase();
        })
      );

      if (onLogEvent) {
        onLogEvent('MR_SETTLEMENT_DELETE', `Deleted settlement record for M.R. ${cleanMr}`);
      }

      setSuccessMessage(`Settlement record for M.R. ${cleanMr} permanently deleted from settlement database.`);
      await initPage();
    } catch (err: any) {
      console.error("Error dropping settlement record:", err);
      setErrorMessage("Error deleting settlement record: " + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Export full records
  const handleExportCsv = () => {
    if (settledList.length === 0) {
      alert("No settlement logs available to export.");
      return;
    }
    const dataToExport = settledList.map(row => ({
      "MR No": row.mr_no,
      "Date": row.sett_date,
      "PO No": row.po_no,
      "Lorry Number": row.lorry_number,
      "Supplier": row.supplier,
      "Broker": row.broker,
      "Payable Value (INR)": row.payable_amt,
      "Bill No": row.payable_bill_no,
      "Bill Date": row.payable_bill_date
    }));
    const sanitizedData = sanitizeCsvData(dataToExport);
    const csv = Papa.unparse(sanitizedData);
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `MR_Settlement_Logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Excel/CSV for Selected P.O.
  const handleExportExcelForSelectedPo = () => {
    if (!selectedPoNo || !poStats) {
      alert("Please select a P.O number first to export its settlement data.");
      return;
    }

    // Header & Meta Configuration Section
    const fileHeader = [
      { "P.O Settlement Export Report": `P.O NUMBER: #${selectedPoNo}`, "Value / Metric": "" },
      { "P.O Settlement Export Report": "Expressed in Metric Tons (MT)", "Value / Metric": "" },
      { "P.O Settlement Export Report": `Generated At`, "Value / Metric": new Date().toLocaleString() },
      { "P.O Settlement Export Report": "", "Value / Metric": "" },
      { "P.O Settlement Export Report": "--- CONTRACT & INVENTORY STATUS SUMMARY ---", "Value / Metric": "" },
      { "P.O Settlement Export Report": "Total PO Contract Weight", "Value / Metric": `${poStats.contractQty.toFixed(3)} MT` },
      { "P.O Settlement Export Report": "Inspected Received Weight", "Value / Metric": `${poStats.receivedQty.toFixed(3)} MT` },
      { "P.O Settlement Export Report": "Classic Settled Weight Sum", "Value / Metric": `${poStats.settledQty.toFixed(3)} MT` },
      { "P.O Settlement Export Report": "M.R Custom Settlements Sum", "Value / Metric": `${poStats.customReceivedQty.toFixed(3)} MT` },
      { "P.O Settlement Export Report": "Current Calculated Pending Received Balance", "Value / Metric": `${poStats.pendingReceivedQty.toFixed(3)} MT` },
      { "P.O Settlement Export Report": "", "Value / Metric": "" },
      { "P.O Settlement Export Report": "--- DETAILED SETTLEMENT TRANSACTION ENTRIES ---", "Value / Metric": "" }
    ];

    // Map m_r_settlement logs to rows
    const detailRows = customSettlementRecords.map((r, idx) => ({
      "P.O Settlement Export Report": `Entry #${idx + 1} | ID: ${r.id || 'N/A'}`,
      "Value / Metric": `Settle Date: ${r.settlement_date ? r.settlement_date.split('T')[0] : 'N/A'} | Settle Qty: ${Number(r.quantity).toFixed(3)} MT | Lorry Scale Net: ${Number(r.electronic_scale_net || 0).toFixed(3)} MT | Status: ${r.payment_status || 'Pending'} | Quality Claims: ${r.quality || 'N/A'} | Details: ${r.material_details || 'N/A'}`
    }));

    const finalExportArray = [...fileHeader, ...detailRows];
    
    const sanitizedData = sanitizeCsvData(finalExportArray);
    const csv = Papa.unparse(sanitizedData);
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `PO_${selectedPoNo}_Settlement_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 100-rows per page pagination (searches full dataset, displays paginated)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchFilter]);

  // Filter dashboard 
  const filteredSettles = settledList.filter(item => {
    if (!canViewCompletedData()) {
      const pStatus = (item.payment_status || '').toLowerCase();
      const isCompleted = pStatus === 'settled' || pStatus === 'paid' || pStatus === 'cleared' || pStatus === 'approved';
      if (isCompleted) return false;
    }
    const term = searchFilter.toLowerCase();
    return (
      (item.mr_no || '').toLowerCase().includes(term) ||
      (item.po_no || '').toLowerCase().includes(term) ||
      (item.supplier || '').toLowerCase().includes(term) ||
      (item.broker || '').toLowerCase().includes(term)
    );
  });


    return {
      viewMode,
      setViewMode,
      loading,
      setLoading,
      searchFilter,
      setSearchFilter,
      errorMessage,
      setErrorMessage,
      successMessage,
      setSuccessMessage,
      settledList,
      setSettledList,
      inspections,
      setInspections,
      purchaseOrders,
      selectedPoNo,
      setSelectedPoNo,
      selectedPoData,
      setSelectedPoData,
      poStats,
      setPoStats,
      customSettlementRecords,
      lastSyncTime,
      showSuccessAnim,
      paymentList,
      paymentValidationInfo,
      showAuditOverwriteModal,
      setShowAuditOverwriteModal,
      auditOverwriteInfo,
      isEdit,
      setIsEdit,
      masterData,
      setMasterData,
      saudaDeductionRecord,
      detailCols,
      setDetailCols,
      showAllSpecCols,
      setShowAllSpecCols,
      showAllDeductionCols,
      setShowAllDeductionCols,
      visibleSpecCols,
      visibleDeductionCols,
      showViewModal,
      setShowViewModal,
      viewModalData,
      setViewModalData,
      deleteConfirmMr,
      setDeleteConfirmMr,
      gradeMasterList,
      agencyMasterList,
      markaMasterList,
      areaMasterList,
      deductionMasterList,
      currentPage,
      setCurrentPage,
      pageSize,
      setPageSize,
      filteredSettles,
      poOptions,
      faOptionsForSelectedPo,
      initPage,
      handleManualRefresh,
      handlePoNoSelection,
      handleProceedWithMrNo,
      handleOpenViewSettlement,
      handleMasterChange,
      handleDeductionRowChange,
      handleAddDeductionRow,
      handleRemoveDeductionRow,
      handleColChange,
      handleSaveSettlement,
      handleRevertSettlement,
      handleDeleteSettlement,
      executeDeleteSettlement,
      handleExportCsv,
      handleExportExcelForSelectedPo,
      calculateWeightedRatePerMT,
      emptyDetailColumn,
      initialMaster,
      resolveGradeName
    };
  }
