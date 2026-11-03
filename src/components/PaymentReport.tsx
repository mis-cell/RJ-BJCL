import React, { useState, useEffect, useMemo } from 'react';
import { useLiveAutoRefresh } from '../hooks/useLiveAutoRefresh';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  X 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { dbModule } from '../services/dbModule';
import { calculate93PctPaidAmount } from '../lib/utils';
import { setCachedSattaDiffs } from '../services/sattaCalculation';
import { 
  PaymentMaster, 
  PaymentDetailColumn, 
  emptyDetailColumn, 
  initialMaster 
} from '../types/payment.types';
import { 
  getColAmount, 
  parseGridOrItems, 
  mapItemsToDetailCols, 
  isMrAlreadyProcessed, 
  isPoEligibleForPayment,
  getLinkedMrsForPo,
  calculateNetPaidAmountAfterDeductions,
  resolvePaymentDeductionsForPoAndMr
} from '../utils/paymentCalculations';
import { 
  exportPaymentReportCsv, 
  exportPaymentReportPdf 
} from '../utils/paymentReportExports';
import { PaymentReportDashboard } from './payment-report/PaymentReportDashboard';
import { PaymentReportPartyLedger } from './payment-report/PaymentReportPartyLedger';
import { PaymentReportFormEntry } from './payment-report/PaymentReportFormEntry';
import { findMatchedPoItem } from '../pages/PaymentModule';

// Re-export domain types and calculation functions for backwards compatibility
export type { PaymentMaster, PaymentDetailColumn };
export { emptyDetailColumn, initialMaster } from '../types/payment.types';
export { 
  getColWtMt, 
  getColQtyQtl, 
  getColSettPct, 
  getColDeduction, 
  getColDeductionExplanation, 
  getColSettRate, 
  getColAmount, 
  parseGridOrItems, 
  mapItemsToDetailCols, 
  getLinkedMrsForPo, 
  isMrAlreadyProcessed, 
  isPoEligibleForPayment 
} from '../utils/paymentCalculations';

export default function PaymentReport({ onClose }: { onClose?: () => void }) {
  const [viewMode, setViewMode] = useState<'dashboard' | 'entry' | 'ledger'>('dashboard');
  const [selectedLedgerParty, setSelectedLedgerParty] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Payment Records list from payment_master
  const [paymentList, setPaymentList] = useState<PaymentMaster[]>([]);
  const [verifiedArrivals, setVerifiedArrivals] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [saudaCheckPoints, setSaudaCheckPoints] = useState<any[]>([]);
  const [showAllPos, setShowAllPos] = useState<boolean>(false);
  
  const [selectedPoNo, setSelectedPoNo] = useState<string>('');
  const [selectedPoData, setSelectedPoData] = useState<any>(null);
  const [selectedMrNo, setSelectedMrNo] = useState<string>('');

  const [showSuccessAnim, setShowSuccessAnim] = useState<boolean>(false);
  const [isEdit, setIsEdit] = useState(false);

  const [masterData, setMasterData] = useState<PaymentMaster>(initialMaster());
  const [detailCols, setDetailCols] = useState<PaymentDetailColumn[]>([
    emptyDetailColumn(1), emptyDetailColumn(2), emptyDetailColumn(3), emptyDetailColumn(4)
  ]);

  const [gradeMasterList, setGradeMasterList] = useState<any[]>([]);
  const [agencyMasterList, setAgencyMasterList] = useState<any[]>([]);
  const [markaMasterList, setMarkaMasterList] = useState<any[]>([]);
  const [areaMasterList, setAreaMasterList] = useState<any[]>([]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [ledgerCurrentPage, setLedgerCurrentPage] = useState(1);
  const [ledgerPageSize, setLedgerPageSize] = useState(100);

  const isPoEligibleForPaymentLocal = (po: any): boolean => {
    return isPoEligibleForPayment(
      po,
      verifiedArrivals,
      paymentList,
      isEdit ? masterData.voucher_no : undefined
    );
  };

  const findMatchingPo = (targetPoNo: string, poArray: any[]) => {
    if (!targetPoNo || !poArray || poArray.length === 0) return null;
    const cleanTarget = String(targetPoNo).trim().toUpperCase();
    const targetSuffix = cleanTarget.split('/').pop() || '';

    return poArray.find((p: any) => {
      const pNo = String(p.po_no || p.contract_po_no || '').trim().toUpperCase();
      const pSuffix = pNo.split('/').pop() || '';
      const sNo = String(p.sauda_no || p.po_contract || p.contract_no || '').trim().toUpperCase();
      const sSuffix = sNo.split('/').pop() || '';

      if (pNo === cleanTarget) return true;
      if (sNo && sNo === cleanTarget) return true;
      if (pNo && (pNo.includes(cleanTarget) || cleanTarget.includes(pNo))) return true;
      if (targetSuffix && targetSuffix.length >= 3) {
        if (pSuffix === targetSuffix || (pNo && pNo.includes(targetSuffix))) return true;
        if (sSuffix === targetSuffix || (sNo && sNo.includes(targetSuffix))) return true;
      }
      return false;
    });
  };

  // Filter verified arrivals to strictly exclude already processed/paid M.R. records
  const availableArrivals = useMemo(() => {
    return verifiedArrivals.filter(arr => {
      const { isPaid } = isMrAlreadyProcessed(
        arr,
        paymentList,
        isEdit ? masterData.voucher_no : undefined,
        selectedPoNo
      );
      return !isPaid;
    });
  }, [verifiedArrivals, paymentList, isEdit, masterData.voucher_no, selectedPoNo]);

  // Filter purchase orders where at least one eligible unpaid M.R remains
  const eligiblePos = useMemo(() => {
    return purchaseOrders.filter(po => isPoEligibleForPaymentLocal(po));
  }, [purchaseOrders, verifiedArrivals, paymentList, isEdit, masterData.voucher_no]);

  const ensurePaymentTablesExist = async () => {
    if (!supabase) return;
    try {
      await supabase.rpc('exec_sql', {
        query: `
          CREATE TABLE IF NOT EXISTS payment_master (
            payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            voucher_no TEXT UNIQUE NOT NULL,
            payment_date DATE,
            mr_no TEXT,
            po_no TEXT,
            po_date DATE,
            sett_date DATE,
            po_type TEXT,
            broker TEXT,
            supplier TEXT,
            party_id TEXT,
            party_name TEXT,
            chn_supplier TEXT,
            lorry_number TEXT,
            arrival_no TEXT,
            arrival_date DATE,
            arival_apmc_fees NUMERIC DEFAULT 0,
            payable_amt NUMERIC DEFAULT 0,
            payable_bill_no TEXT,
            payable_bill_date DATE,
            total_amount NUMERIC DEFAULT 0,
            paid_amount NUMERIC DEFAULT 0,
            payment_mode TEXT,
            bank_name TEXT,
            reference_no TEXT,
            remarks TEXT,
            status TEXT DEFAULT 'completed',
            payment_status TEXT DEFAULT 'Paid',
            advance_payment_done TEXT DEFAULT 'No',
            advance_payment_from TEXT Default '1',
            payment_settlementdate DATE,
            tenor TEXT DEFAULT 0,
            repayment_date DATE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          ALTER TABLE IF EXISTS payment_master DISABLE ROW LEVEL SECURITY;
          ALTER TABLE IF EXISTS payment_master ADD COLUMN IF NOT EXISTS advance_payment_done TEXT DEFAULT 'No';
          ALTER TABLE IF EXISTS payment_master ADD COLUMN IF NOT EXISTS advance_payment_from TEXT DEFAULT '1';
          ALTER TABLE IF EXISTS payment_master ADD COLUMN IF NOT EXISTS payment_settlementdate DATE DEFAULT '';
          ALTER TABLE IF EXISTS payment_master ADD COLUMN IF NOT EXISTS tenor TEXT DEFAULT '';
          ALTER TABLE IF EXISTS payment_master ADD COLUMN IF NOT EXISTS repayment_date DATE DEFAULT '';

          CREATE TABLE IF NOT EXISTS payment_details (
            detail_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            payment_id UUID,
            voucher_no TEXT,
            mr_no TEXT,
            col_index INT,
            grade TEXT,
            area TEXT,
            agency TEXT,
            marka_crop TEXT,
            quantity NUMERIC DEFAULT 0,
            arr_qty_wt NUMERIC DEFAULT 0,
            min_qty_wt NUMERIC DEFAULT 0,
            wt_phota NUMERIC DEFAULT 0,
            wt_quantity NUMERIC DEFAULT 0,
            rate_value NUMERIC DEFAULT 0,
            gd_claim NUMERIC DEFAULT 0,
            gd_sett NUMERIC DEFAULT 0,
            gd_rev NUMERIC DEFAULT 0,
            gd_final NUMERIC DEFAULT 0,
            moist_claim NUMERIC DEFAULT 0,
            moist_sett NUMERIC DEFAULT 0,
            moist_rev NUMERIC DEFAULT 0,
            moist_final NUMERIC DEFAULT 0,
            dust_claim NUMERIC DEFAULT 0,
            dust_sett NUMERIC DEFAULT 0,
            dust_rev NUMERIC DEFAULT 0,
            dust_final NUMERIC DEFAULT 0,
            ncv_claim NUMERIC DEFAULT 0,
            ncv_sett NUMERIC DEFAULT 0,
            ncv_rev NUMERIC DEFAULT 0,
            ncv_final NUMERIC DEFAULT 0,
            po_grade_claim NUMERIC DEFAULT 0,
            po_grade_sett NUMERIC DEFAULT 0,
            po_grade_rev NUMERIC DEFAULT 0,
            po_grade_final NUMERIC DEFAULT 0,
            adjust_type TEXT,
            remark TEXT,
            claim_settlement NUMERIC DEFAULT 0,
            bill_no TEXT,
            bill_date DATE,
            bill_amount NUMERIC(15,2),
            paid_amount NUMERIC(15,2),
            balance_amount NUMERIC(15,2),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          ALTER TABLE IF EXISTS payment_details DISABLE ROW LEVEL SECURITY;
        `
      });
    } catch (err) {
      console.warn("Auto-creation of payment tables notice:", err);
    }
  };

  // Load dashboards & verified entries from purchase_master and final_arrival
  const initPage = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      await ensurePaymentTablesExist();

      let gData: any[] = [];
      let agData: any[] = [];
      let mDataList: any[] = [];
      let aData: any[] = [];
      let payData: any[] = [];
      let poList: any[] = [];
      let scpList: any[] = [];
      let arrList: any[] = [];

      if (supabase) {
        const [gRes, agRes, mRes, aRes, sattaRes] = await Promise.all([
          supabase.from('grade_master').select('*').then(r => r.data || [], () => []),
          supabase.from('agency_master').select('*').then(r => r.data || [], () => []),
          supabase.from('marka_master').select('*').then(r => r.data || [], () => []),
          supabase.from('area_master').select('*').then(r => r.data || [], () => []),
          supabase.from('satta_differentials').select('*').then(r => r.data || [], () => [])
        ]);
        gData = gRes;
        agData = agRes;
        mDataList = mRes;
        aData = aRes;
        if (sattaRes && sattaRes.length > 0) {
          setCachedSattaDiffs(sattaRes);
        }

        try {
          const { data: pData, error: pErr } = await supabase
            .from('payment_master')
            .select('*')
            .order('created_at', { ascending: false });
          if (!pErr && pData) {
            payData = pData;
          } else {
            const { data: pDataPlain } = await supabase.from('payment_master').select('*');
            if (pDataPlain) payData = pDataPlain;
          }
        } catch (err) {
          console.warn("Supabase payment_master fetch error:", err);
        }

        try {
          const { data: pList, error: pErr } = await supabase
            .from('purchase_master')
            .select('*')
            .order('created_at', { ascending: false });
          if (!pErr && pList) {
            poList = pList;
          } else {
            const { data: pListPlain } = await supabase.from('purchase_master').select('*');
            if (pListPlain) poList = pListPlain;
          }
        } catch (err) {
          console.warn("Supabase purchase_master fetch error:", err);
        }

        try {
          const { data: sList } = await supabase.from('sauda_check_point').select('*');
          if (sList) scpList = sList;
        } catch (err) {
          console.warn("Supabase sauda_check_point fetch error:", err);
        }

        try {
          const [aRes, miRes] = await Promise.all([
            supabase.from('final_arrival').select('*').order('created_at', { ascending: false }).then(r => r.data || [], () => []),
            supabase.from('material_inspection').select('*').order('created_at', { ascending: false }).then(r => r.data || [], () => []),
          ]);

          const combinedMap = new Map<string, any>();

          (aRes || []).forEach((item: any) => {
            const key = item.mr_no || item.final_arrival_no || item.arrival_no;
            if (key) combinedMap.set(key, { ...item, source_module: 'final_arrival' });
          });

          (miRes || []).forEach((item: any) => {
            const key = item.mr_no || item.arrival_no || item.final_arrival_no;
            if (key) {
              const existing = combinedMap.get(key) || {};
              combinedMap.set(key, {
                ...existing,
                ...item,
                mr_no: key,
                supplier: item.supplier_name || item.supplier || existing.supplier,
                broker: item.broker_name || item.broker || existing.broker,
                po_no: item.po_no || item.mill_po_no || existing.po_no,
                source_module: 'material_inspection'
              });
            }
          });

          arrList = Array.from(combinedMap.values());
        } catch (err) {
          console.warn("Supabase final_arrival/inspection fetch error:", err);
        }
      }

      // Merge with dbModule local database fallback
      try {
        const localPay = await dbModule.fetchAll('payment_master').catch(() => []);
        if (localPay && localPay.length > 0) {
          const map = new Map<string, any>();
          payData.forEach((p: any) => { if (p.voucher_no) map.set(p.voucher_no, p); });
          localPay.forEach((p: any) => { if (p.voucher_no && !map.has(p.voucher_no)) map.set(p.voucher_no, p); });
          payData = Array.from(map.values());
        }

        if (poList.length === 0) {
          poList = await dbModule.fetchAll('purchase_master').catch(() => []);
        }

        const [localArr, localInsp, localMillInsp, localTempArr] = await Promise.all([
          dbModule.fetchAll('final_arrival').catch(() => []),
          dbModule.fetchAll('material_inspection').catch(() => []),
          dbModule.fetchAll('mill_inspection_master').catch(() => []),
          dbModule.fetchAll('temporary_material_received').catch(() => [])
        ]);

        const mergedMap = new Map<string, any>();
        
        // 1. Temporary Material Received
        (localTempArr || []).forEach((t: any) => {
          const k = t.temporary_arrival_no || t.amad_no || t.arrival_no;
          if (k) mergedMap.set(k, { ...t, mr_no: k, arrival_no: k, source_module: 'temporary_material_received' });
        });

        // 2. Final Arrival
        (localArr || []).forEach((a: any) => {
          const k = a.mr_no || a.final_arrival_no || a.arrival_no;
          if (k) {
            const existing = mergedMap.get(k) || {};
            mergedMap.set(k, { ...existing, ...a, mr_no: k, source_module: 'final_arrival' });
          }
        });

        // 3. Mill Inspection Master
        (localMillInsp || []).forEach((a: any) => {
          const k = a.mr_no || a.arrival_no;
          if (k) {
            const existing = mergedMap.get(k) || {};
            mergedMap.set(k, {
              ...existing,
              ...a,
              mr_no: k,
              supplier: a.supplier_name || a.supplier || existing.supplier,
              broker: a.broker_name || a.broker || existing.broker,
              po_no: a.po_no || a.mill_po_no || existing.po_no
            });
          }
        });

        // 4. Material Inspection
        (localInsp || []).forEach((a: any) => {
          const k = a.mr_no || a.arrival_no;
          if (k) {
            const existing = mergedMap.get(k) || {};
            mergedMap.set(k, {
              ...existing,
              ...a,
              mr_no: k,
              supplier: a.supplier_name || a.supplier || existing.supplier,
              broker: a.broker_name || a.broker || existing.broker,
              po_no: a.po_no || a.mill_po_no || existing.po_no,
              source_module: 'material_inspection'
            });
          }
        });

        // 5. Supabase Real-Time Overrides
        (arrList || []).forEach((a: any) => {
          const k = a.mr_no || a.final_arrival_no || a.arrival_no;
          if (k) {
            const existing = mergedMap.get(k) || {};
            mergedMap.set(k, {
              ...existing,
              ...a,
              mr_no: k,
              supplier: a.supplier_name || a.supplier || existing.supplier,
              broker: a.broker_name || a.broker || existing.broker,
              po_no: a.po_no || a.mill_po_no || existing.po_no
            });
          }
        });

        arrList = Array.from(mergedMap.values());
      } catch (err) {
        console.warn("dbModule fallback fetch error:", err);
      }

      const combinedPoMap = new Map<string, any>();
      (poList || []).forEach((p: any) => {
        const k = String(p.po_no || p.contract_po_no || p.ptf_no || '').trim().toUpperCase();
        if (k) combinedPoMap.set(k, { ...p, source_table: 'purchase_master' });
      });
      (scpList || []).forEach((s: any) => {
        const k = String(s.po_no || s.contract_po_no || s.ptf_no || s.sauda_no || '').trim().toUpperCase();
        if (k) {
          const existing = combinedPoMap.get(k) || {};
          combinedPoMap.set(k, { ...existing, ...s, source_table: 'sauda_check_point' });
        }
      });
      const combinedPos = Array.from(combinedPoMap.values());

      setPaymentList(payData);
      setPurchaseOrders(combinedPos);
      setSaudaCheckPoints(scpList);

      const verified = (arrList || []).filter(item => {
        const status = String(item.status || '').toLowerCase();
        return status !== 'cancelled' && status !== 'rejected';
      });
      setVerifiedArrivals(verified);

      if (gData.length === 0) gData = await dbModule.fetchAll('grade_master').catch(() => []);
      if (agData.length === 0) agData = await dbModule.fetchAll('agency_master').catch(() => []);
      if (mDataList.length === 0) mDataList = await dbModule.fetchAll('marka_master').catch(() => []);
      if (aData.length === 0) aData = await dbModule.fetchAll('area_master').catch(() => []);

      setGradeMasterList(gData);
      setAgencyMasterList(agData);
      setMarkaMasterList(mDataList);
      setAreaMasterList(aData);
    } catch (e) {
      console.error("PaymentReport init error:", e);
    } finally {
      setLoading(false);
    }
  };

  useLiveAutoRefresh(initPage, [], { tables: ['payment_master', 'payment_details', 'm_r_settlement', 'final_arrival', 'inspection_master', 'mill_inspection_master', 'inspection_checklist', 'material_inspection_details', 'satta_differentials'] });

  useEffect(() => {
    initPage();
  }, []);

  const getPoItemDetails = async (po: any): Promise<any[]> => {
    if (!po) return [];
    let parsed = parseGridOrItems(po.items || po.grid_details);
    let itemsToEnrich: any[] = [];

    if (parsed.length > 0) {
      const hasAnyContent = parsed.some(it => it.grade || it.grade_name || it.grade_code || it.agency || it.agency_name || it.agency_code);
      if (hasAnyContent) {
        itemsToEnrich = parsed;
      }
    }

    if (itemsToEnrich.length === 0 && po.po_no) {
      const cleanPo = String(po.po_no || '').trim().replace(/^#/, '');
      const withHash = `#${cleanPo}`;
      try {
        if (supabase) {
          const { data: pdm } = await supabase
            .from('purchase_detail_master')
            .select('*')
            .or(`po_no.eq."${cleanPo}",po_no.eq."${withHash}",po_no.eq."${po.po_no}"`);
          if (pdm && pdm.length > 0) {
            itemsToEnrich = pdm;
          }
        }
        if (itemsToEnrich.length === 0) {
          const allPdm = await dbModule.fetchAll('purchase_detail_master').catch(() => []);
          const filteredPdm = allPdm.filter((d: any) => {
            const pNo = String(d.po_no || '').trim().toUpperCase().replace(/^#/, '');
            return pNo === cleanPo.toUpperCase();
          });
          if (filteredPdm.length > 0) itemsToEnrich = filteredPdm;
        }
      } catch (e) {
        console.warn("Failed to fetch PO details:", e);
      }
    }

    if (itemsToEnrich.length === 0) {
      itemsToEnrich = parsed;
    }

    let gList = gradeMasterList;
    let agList = agencyMasterList;

    return itemsToEnrich.map(item => {
      let gradeName = item.grade_name || item.grade || '';
      if (!gradeName && item.grade_code && gList.length > 0) {
        const match = gList.find(g => String(g.grade_code || g.code || g.id || '').trim().toUpperCase() === String(item.grade_code).trim().toUpperCase());
        if (match) gradeName = match.grade_name || match.name || '';
      }

      let agencyName = item.agency_name || item.agency || '';
      if (!agencyName && item.agency_code && agList.length > 0) {
        const match = agList.find(a => String(a.agency_code || a.code || a.id || '').trim().toUpperCase() === String(item.agency_code).trim().toUpperCase());
        if (match) agencyName = match.agency_name || match.name || '';
      }

      const rateVal = Number(item.rate_qntl || item.rate_per_mt || item.rate_mt || item.rate || item.b_rate || 0);

      return {
        ...item,
        grade_name: gradeName || item.grade_code,
        agency_name: agencyName || item.agency_code,
        rate_qntl: rateVal,
        rate_per_mt: rateVal,
        rate: rateVal
      };
    });
  };

  const handlePoSelection = async (poNo: string) => {
    setSelectedPoNo(poNo);
    if (!poNo) {
      setSelectedPoData(null);
      return;
    }

    const po = purchaseOrders.find(p => p.po_no === poNo);
    if (po) {
      setSelectedPoData(po);

      const poItems = await getPoItemDetails(po);
      const cols = mapItemsToDetailCols(poItems, Number(po.b_rate || po.rate_qntl || 0), po, {
        gradeMasters: gradeMasterList,
        agencyMasters: agencyMasterList,
        areaMasters: areaMasterList,
        markaMasters: markaMasterList
      });

      const totalColAmt = cols.reduce((sum, c) => sum + getColAmount(c), 0);
      const grossVal = Math.round(Number(po.total_amount || po.total_amt || po.contract_value || totalColAmt || 0));

      const deductions = await resolvePaymentDeductionsForPoAndMr({
        po,
        poNo: po.po_no || poNo,
        cols,
        saudaCheckPoints,
        purchaseOrders,
        verifiedArrivals
      });
      const defaultPaid = grossVal > 0
        ? calculateNetPaidAmountAfterDeductions(
            grossVal,
            deductions.deliveryClaim,
            deductions.totalDeductionsAndPenalties,
            deductions.extraAndShort
          )
        : 0;

      setMasterData(prev => ({
        ...prev,
        po_no: po.po_no,
        po_date: po.po_date || po.s_date || po.created_at || prev.po_date,
        po_type: po.po_type || 'Standard',
        supplier: po.supplier || po.party_name || prev.supplier,
        party_name: po.party_name || po.supplier || prev.party_name,
        broker: po.broker || po.broker_name || prev.broker,
        rate_qntl: Number(po.b_rate || po.rate_qntl || 0),
        total_amount: grossVal > 0 ? grossVal : Math.round(prev.total_amount || 0),
        payable_amt: grossVal > 0 ? grossVal : Math.round(prev.payable_amt || 0),
        summary_delivery_claim: deductions.deliveryClaim,
        summary_deduction_amount: deductions.totalDeductionsAndPenalties,
        summary_deduction_type: deductions.deductionSummaryText,
        val_ex_short: deductions.extraAndShort,
        paid_amount: grossVal > 0 ? defaultPaid : Math.round(prev.paid_amount || 0),
      } as any));

      setDetailCols(cols);

      const linkedMrs = getLinkedMrsForPo(poNo, verifiedArrivals);
      const matchingArrival = linkedMrs.find(a => {
        const { isPaid } = isMrAlreadyProcessed(a, paymentList, isEdit ? masterData.voucher_no : undefined, poNo);
        return !isPaid;
      }) || linkedMrs[0];

      if (matchingArrival && !selectedMrNo) {
        handleMrSelection(matchingArrival.mr_no || matchingArrival.final_arrival_no || matchingArrival.arrival_no, po);
      } else if (matchingArrival) {
        handleMrSelection(matchingArrival.mr_no || matchingArrival.final_arrival_no || matchingArrival.arrival_no, po);
      }
    }
  };

  const handleMrSelection = async (mrNo: string, overridePo?: any) => {
    setSelectedMrNo(mrNo);
    if (!mrNo) return;

    const arrival = verifiedArrivals.find(a => (a.mr_no === mrNo || a.final_arrival_no === mrNo));
    if (arrival) {
      const rawPoNo = arrival.po_no || arrival.mill_po_no || masterData.po_no;
      const matchedPo = overridePo || findMatchingPo(rawPoNo, purchaseOrders);
      if (matchedPo) {
        setSelectedPoNo(matchedPo.po_no);
        setSelectedPoData(matchedPo);
      } else {
        setSelectedPoNo('');
        setSelectedPoData(null);
      }
      const po = matchedPo;
      const poNo = matchedPo ? matchedPo.po_no : rawPoNo;

      let rawArrItems: any[] = [];
      if (supabase) {
        try {
          const targetMr = arrival.mr_no || arrival.final_arrival_no || arrival.arrival_no || mrNo;
          const cleanMr = targetMr.replace(/^MR[-_ ]?/i, '');
          const candidateKeys = Array.from(new Set([
            targetMr, mrNo, arrival.mr_no, arrival.final_arrival_no, arrival.arrival_no,
            cleanMr, `MR${cleanMr}`, `MR-${cleanMr}`, `MR0${cleanMr}`
          ].filter(Boolean)));

          for (const key of candidateKeys) {
            const midRes = await supabase
              .from('material_inspection_details')
              .select('*')
              .eq('mr_no', key)
              .order('srl_no', { ascending: true });
            if (midRes.data && midRes.data.length > 0) {
              rawArrItems = midRes.data;
              break;
            }
          }
        } catch (e) {
          console.warn("Failed to fetch inspection details:", e);
        }
      }

      if (rawArrItems.length === 0) {
        rawArrItems = parseGridOrItems(arrival.grid_details || arrival.items || arrival.details);
      }

      const poItems = po ? await getPoItemDetails(po) : [];
      if (rawArrItems.length === 0 && poItems.length > 0) {
        rawArrItems = poItems;
      }

      let cols = mapItemsToDetailCols(rawArrItems, Number(po?.b_rate || po?.rate_qntl || 0), po || arrival, {
        gradeMasters: gradeMasterList,
        agencyMasters: agencyMasterList,
        areaMasters: areaMasterList,
        markaMasters: markaMasterList
      });

      if (poItems.length > 0) {
        cols = cols.map((col) => {
          if (!col.grade && !col.arr_qty_wt && !col.quantity) return col;
          let lineRate = col.rate_value;
          const matchedPoItem = findMatchedPoItem(col, poItems, { gradeMasters: gradeMasterList, agencyMasters: agencyMasterList });
          if (matchedPoItem) {
            const r = Number(matchedPoItem.rate_per_mt || matchedPoItem.rate_mt || matchedPoItem.rate_qntl || matchedPoItem.rate || 0);
            if (r > 0) lineRate = r;
          }
          if (!lineRate || lineRate === 0) {
            const fallbackRate = Number(po?.b_rate || po?.rate_qntl || 0);
            if (fallbackRate > 0) lineRate = fallbackRate;
          }
          return { ...col, rate_value: lineRate };
        });
      }

      const totalColAmt = cols.reduce((sum, c) => sum + getColAmount(c), 0);
      const grossVal = Math.round(
        totalColAmt > 0
          ? totalColAmt
          : Number(arrival.payable_amt || arrival.net_amt || arrival.value_amt || arrival.total_amount || po?.total_amount || 0)
      );
      const mrWeight = Number(arrival.electronic_net_weight || arrival.weight_qtl || 0);

      const deductions = await resolvePaymentDeductionsForPoAndMr({
        po,
        poNo,
        arrival,
        mrNo: arrival.mr_no || arrival.final_arrival_no || mrNo,
        cols,
        saudaCheckPoints,
        purchaseOrders,
        verifiedArrivals
      });
      const defaultPaid = grossVal > 0
        ? calculateNetPaidAmountAfterDeductions(
            grossVal,
            deductions.deliveryClaim,
            deductions.totalDeductionsAndPenalties,
            deductions.extraAndShort
          )
        : 0;

      setMasterData(prev => ({
        ...prev,
        mr_no: arrival.mr_no || arrival.final_arrival_no || mrNo,
        po_no: poNo || prev.po_no,
        po_date: po?.po_date || po?.s_date || arrival.po_date || arrival.date || prev.po_date,
        supplier: arrival.supplier || po?.supplier || prev.supplier,
        party_name: arrival.supplier || po?.supplier || prev.party_name,
        broker: arrival.broker || po?.broker || prev.broker,
        po_type: po?.po_type || 'Standard',
        lorry_number: arrival.lorry_number || arrival.vehicle_no || prev.lorry_number,
        arrival_no: arrival.final_arrival_no || arrival.mr_no || prev.arrival_no,
        arrival_date: arrival.date || deductions.arrivalDate || prev.arrival_date,
        total_amount: grossVal > 0 ? grossVal : Math.round(prev.total_amount || 0),
        payable_amt: grossVal > 0 ? grossVal : Math.round(prev.payable_amt || 0),
        summary_delivery_claim: deductions.deliveryClaim,
        summary_deduction_amount: deductions.totalDeductionsAndPenalties,
        summary_deduction_type: deductions.deductionSummaryText,
        val_ex_short: deductions.extraAndShort,
        paid_amount: grossVal > 0 ? defaultPaid : Math.round(prev.paid_amount || 0),
        net_amt: grossVal > 0 ? grossVal : Math.round(prev.net_amt || 0),
        electronic_scale_net: mrWeight,
        challan_weight: Number(arrival.challan_material_weight || (prev as any).challan_weight)
      } as any));

      setDetailCols(cols);
    }
  };

  const handelTnordate = (e: any, masterDataObj: PaymentMaster) => {
    const tenor = Number(e.target.value);
    if (masterDataObj.payment_settlementdate) {
      const paysettledate = new Date(masterDataObj.payment_settlementdate);
      paysettledate.setDate(paysettledate.getDate() + tenor);
      const year = paysettledate.getFullYear();
      const month = String(paysettledate.getMonth() + 1).padStart(2, "0");
      const day = String(paysettledate.getDate()).padStart(2, "0");
      const repaymentDate = `${year}-${month}-${day}`;

      setMasterData({
        ...masterDataObj,
        tenor: e.target.value,
        repayment_date: repaymentDate
      });
    }
  };

  const handleSavePayment = async () => {
    if (!masterData.voucher_no || masterData.voucher_no.trim() === '') {
      setErrorMessage("Voucher Number is required.");
      return;
    }

    const hasPo = Boolean((masterData.po_no && masterData.po_no.trim()) || (selectedPoNo && selectedPoNo.trim()));
    const hasMr = Boolean((masterData.mr_no && masterData.mr_no.trim()) || (selectedMrNo && selectedMrNo.trim()) || (masterData.arrival_no && masterData.arrival_no.trim()));

    if (!hasPo && !hasMr) {
      setErrorMessage("Validation Error: Both 'Final P.O' and 'Inspection' have no data. Please select at least one Final P.O or Inspection record before saving.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (!supabase) throw new Error("Supabase client not connected.");

      await ensurePaymentTablesExist();

      const initialPayload: Record<string, any> = {
        voucher_no: masterData.voucher_no,
        payment_date: masterData.payment_date || new Date().toISOString().split('T')[0],
        mr_no: masterData.mr_no || null,
        po_no: masterData.po_no || null,
        po_date: masterData.po_date || null,
        sett_date: masterData.sett_date || null,
        po_type: masterData.po_type || null,
        broker: masterData.broker || null,
        supplier: masterData.supplier || null,
        party_id: masterData.party_id || masterData.supplier || 'N/A',
        party_name: masterData.party_name || masterData.supplier || 'N/A',
        chn_supplier: masterData.chn_supplier || null,
        lorry_number: masterData.lorry_number || null,
        arrival_no: masterData.arrival_no || null,
        arrival_date: masterData.arrival_date || null,
        arival_apmc_fees: Number(masterData.arival_apmc_fees) || 0,
        payable_amt: Number(masterData.payable_amt) || 0,
        payable_bill_no: masterData.payable_bill_no || null,
        payable_bill_date: (masterData as any).payable_bill_date || null,
        total_amount: Number(masterData.total_amount) || Number(masterData.payable_amt) || 0,
        paid_amount: Number((masterData as any).paid_amount) || Number(masterData.payable_amt) || 0,
        payment_mode: (masterData as any).payment_mode || 'Bank Transfer (NEFT/RTGS)',
        bank_name: masterData.bank_name || '',
        reference_no: (masterData as any).reference_no || '',
        remarks: masterData.remarks || '',
        status: 'completed',
        payment_status: 'Paid',
        advance_payment_done: masterData.advance_payment_done || 'Yes',
        advance_payment_from: masterData.advance_payment_from || '1',
        payment_settlementdate: masterData.payment_settlementdate || '',
        tenor: masterData.tenor || '',
        repayment_date: masterData.repayment_date || ''
      };

      let savedMaster: any = null;
      let mErr: any = null;
      const currentPayload = { ...initialPayload };

      for (let attempt = 0; attempt < 8; attempt++) {
        let res = await supabase
          .from('payment_master')
          .upsert(currentPayload, { onConflict: 'voucher_no' })
          .select()
          .single();

        if (res.error) {
          const match = res.error.message?.match(/Could not find the '([^']+)' column/i);
          if (match && match[1] && match[1] in currentPayload) {
            delete currentPayload[match[1]];
            continue;
          }
          mErr = res.error;
          break;
        } else {
          savedMaster = res.data;
          mErr = null;
          break;
        }
      }

      const recordToSave = savedMaster || currentPayload;
      if (recordToSave && recordToSave.voucher_no) {
        await dbModule.upsert('payment_master', recordToSave).catch(() => {});
      }

      if (mErr && !savedMaster) {
        throw new Error(mErr.message || "Failed to save to Supabase payment_master.");
      }

      // Save detail rows into payment_details
      const masterRecord = savedMaster || recordToSave;
      if (masterRecord && detailCols.length > 0) {
        await supabase.from('payment_details').delete().eq('voucher_no', masterData.voucher_no);
        const rowsToWrite = detailCols
          .filter(c => c.grade && c.grade.trim() !== '')
          .map(c => ({
            payment_id: masterRecord.payment_id || null,
            voucher_no: masterData.voucher_no,
            mr_no: masterData.mr_no,
            col_index: c.col_index,
            grade: c.grade,
            area: c.area,
            agency: c.agency,
            marka_crop: c.marka_crop,
            quantity: Number(c.quantity) || 0,
            arr_qty_wt: Number(c.arr_qty_wt) || 0,
            min_qty_wt: Number(c.min_qty_wt) || 0,
            wt_phota: Number(c.wt_phota) || 0,
            wt_quantity: Number(c.wt_quantity) || 0,
            rate_value: Number(c.rate_value) || 0,
            sett_pct: c.sett_pct,
            deduction_rate: c.deduction_rate,
            sett_rate: c.sett_rate,
            quantity_qtl: c.quantity_qtl,
            amount: c.amount,
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
          await supabase.from('payment_details').insert(rowsToWrite);
        }
      }

      if (masterData.mr_no) {
        await supabase.from('final_arrival').update({ payment_status: 'Paid' }).eq('mr_no', masterData.mr_no);
      }
      if (masterData.po_no) {
        await supabase.from('purchase_master').update({ payment_status: 'Paid' }).eq('po_no', masterData.po_no);
      }

      setShowSuccessAnim(true);
      setTimeout(() => {
        setShowSuccessAnim(false);
        initPage();
        setViewMode('dashboard');
      }, 1500);

    } catch (err: any) {
      console.error("Save error:", err);
      setErrorMessage(err.message || "Failed to save payment record.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchFilter]);

  useEffect(() => {
    setLedgerCurrentPage(1);
  }, [selectedLedgerParty]);

  const filteredPayments = paymentList.filter(p => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase().trim();
    return (
      (p.party_name && p.party_name.toLowerCase().includes(term)) ||
      (p.supplier && p.supplier.toLowerCase().includes(term)) ||
      (p.mr_no && p.mr_no.toLowerCase().includes(term)) ||
      (p.advance_payment_from && p.advance_payment_from.includes(term))
    );
  });

  const totalPaidSum = paymentList.reduce((sum, p) => sum + (Number((p as any).paid_amount || p.total_amount || 0)), 0);
  const totalPayableSum = paymentList.reduce((sum, p) => sum + (Number(p.payable_amt || p.total_amount || 0)), 0);
  const totalPendingSum = paymentList.reduce((sum, p) => {
    const payable = Number(p.payable_amt || p.total_amount || 0);
    const paid = Number((p as any).paid_amount || 0);
    const pending = payable - paid;
    return sum + (pending > 0 ? pending : 0);
  }, 0);

  const completedCount = paymentList.filter(p => (p.status || p.payment_status || '').toLowerCase() === 'completed' || (p.status || p.payment_status || '').toLowerCase() === 'paid').length;
  const pendingCount = paymentList.filter(p => {
    const payable = Number(p.payable_amt || p.total_amount || 0);
    const paid = Number((p as any).paid_amount || 0);
    return (payable - paid) > 0 || (p.status || p.payment_status || '').toLowerCase() === 'pending';
  }).length;

  const partyList = Array.from(
    new Set(
      paymentList
        .map(p => p.party_name || p.supplier)
        .concat(verifiedArrivals.map(a => a.supplier || a.party_name))
        .filter(Boolean)
    )
  ).sort();

  const partyLedgerRecords = paymentList.filter(p => {
    if (!selectedLedgerParty) return true;
    const pName = (p.party_name || p.supplier || '').toLowerCase().trim();
    return pName === selectedLedgerParty.toLowerCase().trim();
  });

  const partyTotalPayable = partyLedgerRecords.reduce((sum, p) => sum + Number(p.payable_amt || p.total_amount || 0), 0);
  const partyTotalPaid = partyLedgerRecords.reduce((sum, p) => sum + Number((p as any).paid_amount || 0), 0);
  const partyTotalPending = partyTotalPayable - partyTotalPaid;

  return (
    <>
      {/* Messages */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between text-red-800 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="p-1 hover:bg-red-100 rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between text-green-800 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="p-1 hover:bg-green-100 rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* DASHBOARD VIEW */}
      {viewMode === 'dashboard' && (
        <PaymentReportDashboard
          paymentList={paymentList}
          filteredPayments={filteredPayments}
          verifiedArrivals={verifiedArrivals}
          purchaseOrders={purchaseOrders}
          saudaCheckPoints={saudaCheckPoints}
          totalPaidSum={totalPaidSum}
          totalPayableSum={totalPayableSum}
          totalPendingSum={totalPendingSum}
          completedCount={completedCount}
          pendingCount={pendingCount}
          searchFilter={searchFilter}
          setSearchFilter={setSearchFilter}
          loading={loading}
          onRefresh={initPage}
          onExportCsv={() => exportPaymentReportCsv(filteredPayments)}
          onExportPdf={() => exportPaymentReportPdf(filteredPayments)}
          currentPage={currentPage}
          pageSize={pageSize}
          setCurrentPage={setCurrentPage}
          setPageSize={setPageSize}
          onEdit={(p) => {
            setMasterData(p);
            setIsEdit(true);
            setViewMode('entry');
          }}
          onViewLedger={(partyName) => {
            setSelectedLedgerParty(partyName);
            setViewMode('ledger');
          }}
          onDelete={async (voucherNo) => {
            if (!window.confirm(`Are you sure you want to delete Payment Voucher ${voucherNo}?`)) return;
            setLoading(true);
            try {
              const targetVoucher = String(voucherNo || '').trim();
              const targetPayment = paymentList.find(
                (p) => String(p.voucher_no || '').trim().toUpperCase() === targetVoucher.toUpperCase()
              );
              const paymentId = targetPayment?.payment_id;
              const linkedMrNo = String(targetPayment?.mr_no || targetPayment?.arrival_no || '').trim();

              dbModule.invalidateCache('payment_master');
              dbModule.invalidateCache('payment_details');

              if (supabase) {
                if (paymentId) {
                  await supabase.from('payment_details').delete().eq('payment_id', paymentId);
                  await supabase.from('payment_master').delete().eq('payment_id', paymentId);
                }
                await supabase
                  .from('payment_details')
                  .delete()
                  .or(`voucher_no.eq.${targetVoucher},voucher_no.ilike.${targetVoucher}`);

                await supabase
                  .from('payment_master')
                  .delete()
                  .or(`voucher_no.eq.${targetVoucher},voucher_no.ilike.${targetVoucher}`);

                if (linkedMrNo) {
                  await supabase.from('final_arrival').update({ payment_status: 'Pending' }).eq('mr_no', linkedMrNo);
                }
              }

              try {
                const esc = (v: string) => `'${v.replace(/'/g, "''")}'`;
                const sqls: string[] = [];
                if (paymentId) {
                  sqls.push(`DELETE FROM payment_details WHERE payment_id = ${esc(paymentId)};`);
                  sqls.push(`DELETE FROM payment_master WHERE payment_id = ${esc(paymentId)};`);
                }
                sqls.push(`DELETE FROM payment_details WHERE LOWER(TRIM(voucher_no)) = LOWER(TRIM(${esc(targetVoucher)}));`);
                sqls.push(`DELETE FROM payment_master WHERE LOWER(TRIM(voucher_no)) = LOWER(TRIM(${esc(targetVoucher)}));`);

                await dbModule.executeTransaction(sqls);
              } catch (e) {
                console.warn("SQL transaction fallback deletion notice:", e);
              }

              dbModule.invalidateCache('payment_master');
              dbModule.invalidateCache('payment_details');
              dbModule.invalidateCache();

              setPaymentList((prev) =>
                prev.filter((p) => {
                  const vStr = String(p.voucher_no || '').trim().toUpperCase();
                  if (paymentId && p.payment_id && p.payment_id === paymentId) return false;
                  return vStr !== targetVoucher.toUpperCase();
                })
              );

              setSuccessMessage(`Payment Voucher ${voucherNo} deleted from Database.`);
              await initPage();
            } catch (e: any) {
              console.error('Delete error:', e);
              setErrorMessage(e?.message || 'Failed to delete record from Database.');
            } finally {
              setLoading(false);
            }
          }}
        />
      )}

      {/* PARTY LEDGER ACCOUNTS VIEW */}
      {viewMode === 'ledger' && (
        <PaymentReportPartyLedger
          partyList={partyList}
          selectedLedgerParty={selectedLedgerParty}
          setSelectedLedgerParty={setSelectedLedgerParty}
          partyLedgerRecords={partyLedgerRecords}
          partyTotalPayable={partyTotalPayable}
          partyTotalPaid={partyTotalPaid}
          partyTotalPending={partyTotalPending}
          ledgerCurrentPage={ledgerCurrentPage}
          ledgerPageSize={ledgerPageSize}
          setLedgerCurrentPage={setLedgerCurrentPage}
          setLedgerPageSize={setLedgerPageSize}
          onBackToDashboard={() => setViewMode('dashboard')}
        />
      )}

      {/* PAYMENT ENTRY FORM VIEW */}
      {viewMode === 'entry' && (
        <PaymentReportFormEntry
          isEdit={isEdit}
          masterData={masterData}
          setMasterData={setMasterData}
          selectedPoNo={selectedPoNo}
          setSelectedPoNo={setSelectedPoNo}
          selectedMrNo={selectedMrNo}
          setSelectedMrNo={setSelectedMrNo}
          eligiblePos={eligiblePos}
          purchaseOrders={purchaseOrders}
          saudaCheckPoints={saudaCheckPoints}
          availableArrivals={availableArrivals}
          verifiedArrivals={verifiedArrivals}
          paymentList={paymentList}
          showAllPos={showAllPos}
          setShowAllPos={setShowAllPos}
          selectedPoData={selectedPoData}
          detailCols={detailCols}
          setDetailCols={setDetailCols}
          gradeMasterList={gradeMasterList}
          areaMasterList={areaMasterList}
          agencyMasterList={agencyMasterList}
          loading={loading}
          errorMessage={errorMessage}
          setErrorMessage={setErrorMessage}
          handlePoSelection={handlePoSelection}
          handleMrSelection={handleMrSelection}
          handleSavePayment={handleSavePayment}
          onCancel={() => { setViewMode('dashboard'); setMasterData(initialMaster()); }}
          isPoEligibleForPaymentLocal={isPoEligibleForPaymentLocal}
          findMatchingPo={findMatchingPo}
          handelTnordate={handelTnordate}
        />
      )}

      {/* Success Animation */}
      <AnimatePresence>
        {showSuccessAnim && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full text-center space-y-3">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-black text-slate-900">Payment Saved Successfully</h3>
              <p className="text-xs text-slate-500">
                Payment Record synced directly to `payment_master` table.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
