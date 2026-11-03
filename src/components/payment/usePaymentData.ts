import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { dbModule } from '../../services/dbModule';
import { useLiveAutoRefresh } from '../../hooks/useLiveAutoRefresh';
import { enforceEditOrDeletePermission } from '../../lib/permissions';
import { formatIndianCurrency, calculate93PctPaidAmount } from '../../lib/utils';
import { setCachedSattaDiffs, setActivePoItemsGlobal } from '../../services/sattaCalculation';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  PaymentMaster, 
  PaymentDetailColumn, 
  emptyDetailColumn, 
  initialMaster 
} from '../../types/payment.types';
import { 
  getColAmount,
  getColDeduction,
  getColSettPct,
  getColSettRate,
  getColQtyQtl,
  parseGridOrItems, 
  findMatchedPoItem, 
  mapItemsToDetailCols, 
  isMrAlreadyProcessed, 
  isPoEligibleForPayment,
  getLinkedMrsForPo,
  calculateNetPaidAmountAfterDeductions,
  resolvePaymentDeductionsForPoAndMr
} from '../../utils/paymentCalculations';

export function usePaymentData(onSaveSuccess?: () => void) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccessAnim, setShowSuccessAnim] = useState(false);

  const [paymentList, setPaymentList] = useState<PaymentMaster[]>([]);
  const [verifiedArrivals, setVerifiedArrivals] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [saudaCheckPoints, setSaudaCheckPoints] = useState<any[]>([]);
  
  const [selectedPoNo, setSelectedPoNo] = useState<string>('');
  const [selectedPoData, setSelectedPoData] = useState<any>(null);
  const [activePoItems, setActivePoItems] = useState<any[]>([]);
  const [selectedMrNo, setSelectedMrNo] = useState<string>('');
  const [isEdit, setIsEdit] = useState(false);

  const [masterData, setMasterData] = useState<PaymentMaster>(initialMaster());
  const [detailCols, setDetailCols] = useState<PaymentDetailColumn[]>([
    emptyDetailColumn(1), emptyDetailColumn(2), emptyDetailColumn(3), emptyDetailColumn(4)
  ]);

  const [gradeMasterList, setGradeMasterList] = useState<any[]>([]);
  const [agencyMasterList, setAgencyMasterList] = useState<any[]>([]);
  const [markaMasterList, setMarkaMasterList] = useState<any[]>([]);
  const [areaMasterList, setAreaMasterList] = useState<any[]>([]);
  const [sattaDiffsList, setSattaDiffsList] = useState<any[]>([]);

  const isPoEligibleForPaymentLocal = useCallback((po: any): boolean => {
    return isPoEligibleForPayment(
      po,
      verifiedArrivals,
      paymentList,
      isEdit ? masterData.voucher_no : undefined
    );
  }, [verifiedArrivals, paymentList, isEdit, masterData.voucher_no]);

  const findMatchingPo = useCallback((targetPoNo: string, poArray: any[]) => {
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
  }, []);

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

  const eligiblePos = useMemo(() => {
    return purchaseOrders.filter(po => isPoEligibleForPaymentLocal(po));
  }, [purchaseOrders, isPoEligibleForPaymentLocal]);

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
            advance_payment_financier TEXT Default '',
            payment_settlementdate DATE,
            tenor TEXT DEFAULT 0,
            repayment_date DATE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          ALTER TABLE IF EXISTS payment_master DISABLE ROW LEVEL SECURITY;
          ALTER TABLE IF EXISTS payment_master ADD COLUMN IF NOT EXISTS advance_payment_done TEXT DEFAULT 'No';
          ALTER TABLE IF EXISTS payment_master ADD COLUMN IF NOT EXISTS advance_payment_from TEXT DEFAULT '1';
          ALTER TABLE IF EXISTS payment_master ADD COLUMN IF NOT EXISTS advance_payment_financier TEXT DEFAULT '1';
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
            premium NUMERIC DEFAULT 0,
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
            sett_pct NUMERIC DEFAULT 0,
            deduction_rate NUMERIC DEFAULT 0,
            sett_rate NUMERIC DEFAULT 0,
            quantity_qtl NUMERIC DEFAULT 0,
            amount NUMERIC DEFAULT 0,
            bill_no TEXT,
            bill_date DATE,
            bill_amount NUMERIC(15,2),
            paid_amount NUMERIC(15,2),
            balance_amount NUMERIC(15,2),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          ALTER TABLE IF EXISTS payment_details DISABLE ROW LEVEL SECURITY;
          ALTER TABLE IF EXISTS payment_details ADD COLUMN IF NOT EXISTS premium NUMERIC DEFAULT 0;
          ALTER TABLE IF EXISTS payment_details ADD COLUMN IF NOT EXISTS sett_pct NUMERIC DEFAULT 0;
          ALTER TABLE IF EXISTS payment_details ADD COLUMN IF NOT EXISTS deduction_rate NUMERIC DEFAULT 0;
          ALTER TABLE IF EXISTS payment_details ADD COLUMN IF NOT EXISTS sett_rate NUMERIC DEFAULT 0;
          ALTER TABLE IF EXISTS payment_details ADD COLUMN IF NOT EXISTS quantity_qtl NUMERIC DEFAULT 0;
          ALTER TABLE IF EXISTS payment_details ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0;
          NOTIFY pgrst, 'reload schema';
        `
      });
    } catch (err) {
      console.warn("Auto-creation of payment tables notice:", err);
    }
  };

  const initPage = useCallback(async () => {
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
          setSattaDiffsList(sattaRes);
          setCachedSattaDiffs(sattaRes);
        }

        let payDetailsData: any[] = [];
        try {
          // Fetch complete payment_master and payment_details records without PostgREST 1000-row limit
          const [pAll, pdAll] = await Promise.all([
            dbModule.fetchAll('payment_master', { maxRows: 50000, pageSize: 1000 }).catch(async () => {
              const { data } = await supabase.from('payment_master').select('*').order('created_at', { ascending: false });
              return data || [];
            }),
            dbModule.fetchAll('payment_details', { maxRows: 50000, pageSize: 1000 }).catch(async () => {
              const { data } = await supabase.from('payment_details').select('*');
              return data || [];
            })
          ]);
          if (pAll && pAll.length > 0) {
            payData = pAll;
          } else {
            const { data: pDataPlain } = await supabase.from('payment_master').select('*');
            if (pDataPlain) payData = pDataPlain;
          }
          if (pdAll && pdAll.length > 0) {
            payDetailsData = pdAll;
          }
        } catch (err) {
          console.warn("Supabase payment_master fetch error:", err);
        }

        if (payDetailsData.length > 0) {
          const detailsMap = new Map<string, any[]>();
          payDetailsData.forEach((d: any) => {
            const keys = [
              d.voucher_no,
              d.payment_id,
              d.master_id,
              d.mr_no,
              d.arrival_no
            ]
              .map(k => String(k || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, ''))
              .filter(Boolean);

            keys.forEach(key => {
              const list = detailsMap.get(key) || [];
              if (!list.includes(d)) list.push(d);
              detailsMap.set(key, list);
            });
          });

          payData = payData.map((p: any) => {
            const vKey = String(p.voucher_no || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
            const idKey = String(p.payment_id || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
            const mrKey = String(p.mr_no || p.arrival_no || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

            let details: any[] = p.details || [];
            if (details.length === 0) {
              if (vKey && detailsMap.has(vKey)) {
                details = detailsMap.get(vKey)!;
              } else if (idKey && detailsMap.has(idKey)) {
                details = detailsMap.get(idKey)!;
              } else if (mrKey && detailsMap.has(mrKey)) {
                details = detailsMap.get(mrKey)!;
              }
            }
            return details.length > 0 ? { ...p, details } : p;
          });
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
          const [aRes, miRes, mimRes, tmrRes] = await Promise.all([
            supabase.from('final_arrival').select('*').order('created_at', { ascending: false }).then(r => r.data || [], () => []),
            supabase.from('material_inspection').select('*').order('created_at', { ascending: false }).then(r => r.data || [], () => []),
            supabase.from('mill_inspection_master').select('*').order('created_at', { ascending: false }).then(r => r.data || [], () => []),
            supabase.from('temporary_material_received').select('*').order('created_at', { ascending: false }).then(r => r.data || [], () => [])
          ]);

          const combinedMap = new Map<string, any>();

          (tmrRes || []).forEach((t: any) => {
            const key = t.temporary_arrival_no || t.amad_no || t.arrival_no || t.mr_no;
            if (key) {
              combinedMap.set(key, {
                ...t,
                mr_no: key,
                arrival_no: key,
                supplier: t.supplier || t.supplier_name || t.party_name,
                broker: t.broker || t.broker_name,
                po_no: t.po_no || t.mill_po_no,
                source_module: 'temporary_material_received'
              });
            }
          });

          (aRes || []).forEach((item: any) => {
            const key = item.mr_no || item.final_arrival_no || item.arrival_no || item.temporary_arrival_no;
            if (key) {
              const existing = combinedMap.get(key) || {};
              combinedMap.set(key, {
                ...existing,
                ...item,
                mr_no: key,
                arrival_no: key,
                supplier: item.supplier || item.supplier_name || item.party_name || existing.supplier,
                broker: item.broker || item.broker_name || existing.broker,
                po_no: item.po_no || item.mill_po_no || existing.po_no,
                source_module: 'final_arrival'
              });
            }
          });

          (mimRes || []).forEach((item: any) => {
            const key = item.mr_no || item.arrival_no;
            if (key) {
              const existing = combinedMap.get(key) || {};
              combinedMap.set(key, {
                ...existing,
                ...item,
                mr_no: key,
                arrival_no: key,
                supplier: item.supplier_name || item.supplier || existing.supplier,
                broker: item.broker_name || item.broker || existing.broker,
                po_no: item.po_no || item.mill_po_no || existing.po_no,
                source_module: 'mill_inspection_master'
              });
            }
          });

          (miRes || []).forEach((item: any) => {
            const key = item.mr_no || item.arrival_no || item.final_arrival_no;
            if (key) {
              const existing = combinedMap.get(key) || {};
              combinedMap.set(key, {
                ...existing,
                ...item,
                mr_no: key,
                arrival_no: key,
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

      try {
        const localPay = await dbModule.fetchAll('payment_master', { maxRows: 50000, pageSize: 1000 }).catch(() => []);
        if (localPay && localPay.length > 0) {
          const map = new Map<string, any>();
          payData.forEach((p: any) => { if (p.voucher_no) map.set(p.voucher_no, p); });
          localPay.forEach((p: any) => { 
            if (p.voucher_no && !map.has(p.voucher_no)) {
              map.set(p.voucher_no, p);
            } 
          });
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
        
        // 1. Temporary Material Received (Base baseline)
        (localTempArr || []).forEach((t: any) => {
          const k = t.temporary_arrival_no || t.amad_no || t.arrival_no;
          if (k) {
            mergedMap.set(k, {
              ...t,
              mr_no: k,
              arrival_no: k,
              source_module: 'temporary_material_received'
            });
          }
        });

        // 2. Final Arrival (Higher priority)
        (localArr || []).forEach((a: any) => {
          const k = a.mr_no || a.final_arrival_no || a.arrival_no;
          if (k) {
            const existing = mergedMap.get(k) || {};
            mergedMap.set(k, {
              ...existing,
              ...a,
              mr_no: k,
              source_module: 'final_arrival'
            });
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

        // 4. Material Inspection (Highest priority for live inspection records)
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

        // 5. Supabase Real-Time Overrides (Highest priority)
        (arrList || []).forEach((a: any) => {
          const k = a.mr_no || a.final_arrival_no || a.arrival_no || a.temporary_arrival_no;
          if (k) {
            const existing = mergedMap.get(k) || {};
            mergedMap.set(k, {
              ...existing,
              ...a,
              mr_no: k,
              arrival_no: k,
              supplier: a.supplier || a.supplier_name || a.party_name || existing.supplier,
              broker: a.broker || a.broker_name || existing.broker,
              po_no: a.po_no || a.mill_po_no || existing.po_no
            });
          }
        });

        arrList = Array.from(mergedMap.values());
      } catch (err) {
        console.warn("dbModule fallback fetch error:", err);
      }

      let returnLorries: any[] = [];
      try {
        if (supabase) {
          const { data: rlData } = await supabase.from('return_lorry').select('*');
          if (rlData) returnLorries = rlData;
        }
        if (returnLorries.length === 0) {
          returnLorries = await dbModule.fetchAll('return_lorry').catch(() => []);
        }
      } catch (e) {}

      const rlByMrMap = new Map<string, any>();
      (returnLorries || []).forEach((rl: any) => {
        const mrKey = String(rl.mr_no || rl.final_arrival_no || '').trim().toUpperCase();
        if (mrKey) rlByMrMap.set(mrKey, rl);
      });

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
      (returnLorries || []).forEach((rl: any) => {
        const newPoKey = String(rl.new_po_no || rl.po_no || '').trim().toUpperCase();
        if (newPoKey) {
          combinedPoMap.set(newPoKey, {
            ...rl,
            po_no: rl.new_po_no || rl.po_no,
            contract_po_no: rl.reference_po_no || rl.po_no,
            is_return_lorry: true,
            source_table: 'return_lorry'
          });
        }
      });
      const combinedPos = Array.from(combinedPoMap.values());

      setPaymentList(payData);
      setPurchaseOrders(combinedPos);
      setSaudaCheckPoints([...scpList, ...(returnLorries || [])]);

      const verified = (arrList || [])
        .filter(item => {
          const status = String(item.status || '').toLowerCase();
          return status !== 'cancelled' && status !== 'rejected';
        })
        .map(item => {
          const mrKey = String(item.mr_no || item.final_arrival_no || item.arrival_no || '').trim().toUpperCase();
          const matchedRl = mrKey ? rlByMrMap.get(mrKey) : null;
          if (matchedRl) {
            return {
              ...item,
              is_return_lorry: true,
              return_po_no: matchedRl.new_po_no || matchedRl.po_no,
              reference_po_no: matchedRl.reference_po_no || item.po_no,
              po_no: matchedRl.new_po_no || matchedRl.po_no
            };
          }
          if (item.return_po_no) {
            return {
              ...item,
              is_return_lorry: true,
              reference_po_no: item.reference_po_no || item.po_no,
              po_no: item.return_po_no
            };
          }
          return item;
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
      console.error("PaymentModule init error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useLiveAutoRefresh(initPage, [], {
    tables: [
      'payment_master',
      'payment_details',
      'm_r_settlement',
      'final_arrival',
      'material_inspection',
      'material_inspection_details',
      'mill_inspection_master',
      'mill_inspection_detail',
      'mill_inspection_deduction',
      'temporary_material_received',
      'sauda_check_point',
      'sauda_check_point_deductions',
      'purchase_master',
      'purchase_detail_master',
      'return_lorry',
      'return_lorry_details',
      'satta_differentials'
    ]
  });

  useEffect(() => {
    initPage();
  }, [initPage]);

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

    if (itemsToEnrich.length === 0 && (po.po_no || po.contract_po_no || po.reference_po_no || po.sauda_no)) {
      const cleanPo = String(po.po_no || '').trim().replace(/^#/, '');
      const cleanContract = String(po.contract_po_no || po.reference_po_no || '').trim().replace(/^#/, '');
      const cleanSauda = String(po.sauda_no || '').trim().replace(/^#/, '');
      const candidateKeys = Array.from(new Set([cleanPo, `#${cleanPo}`, po.po_no, cleanContract, `#${cleanContract}`, cleanSauda].filter(Boolean)));

      try {
        if (supabase) {
          // 0. Check return_lorry_details first if 4000-series Return Lorry
          for (const key of candidateKeys) {
            const { data: rld } = await supabase
              .from('return_lorry_details')
              .select('*')
              .or(`po_no.eq."${key}",new_po_no.eq."${key}",reference_po_no.eq."${key}"`)
              .order('srl_no', { ascending: true });
            if (rld && rld.length > 0) {
              itemsToEnrich = rld;
              break;
            }
          }

          // 1. Check purchase_detail_master
          if (itemsToEnrich.length === 0) {
            for (const key of candidateKeys) {
              const { data: pdm } = await supabase
                .from('purchase_detail_master')
                .select('*')
                .eq('po_no', key)
                .order('srl_no', { ascending: true });
              if (pdm && pdm.length > 0) {
                itemsToEnrich = pdm;
                break;
              }
            }
          }

          // 2. Check sauda_check_point_details
          if (itemsToEnrich.length === 0) {
            for (const key of candidateKeys) {
              const { data: scp } = await supabase
                .from('sauda_check_point_details')
                .select('*')
                .eq('po_no', key)
                .order('srl_no', { ascending: true });
              if (scp && scp.length > 0) {
                itemsToEnrich = scp;
                break;
              }
            }
          }

          // 3. Check sauda_quality_details via sauda_master
          if (itemsToEnrich.length === 0 && (cleanSauda || cleanPo || cleanContract)) {
            const saudaSearchKeys = [cleanSauda, cleanContract, cleanPo].filter(Boolean);
            for (const sKey of saudaSearchKeys) {
              const { data: sMaster } = await supabase
                .from('sauda_master')
                .select('sauda_id')
                .or(`sauda_no.eq."${sKey}",session.eq."${sKey}"`)
                .limit(1)
                .maybeSingle();
              if (sMaster?.sauda_id) {
                const { data: sqd } = await supabase
                  .from('sauda_quality_details')
                  .select('*')
                  .eq('sauda_id', sMaster.sauda_id);
                if (sqd && sqd.length > 0) {
                  itemsToEnrich = sqd.map((it: any, idx: number) => ({
                    ...it,
                    srl_no: it.srl_no || idx + 1,
                    grade_code: it.quality || it.grade_code,
                    grade_name: it.quality || it.grade_name,
                    rate_qntl: Number(it.rs || it.rate || 0),
                    rate: Number(it.rs || it.rate || 0)
                  }));
                  break;
                }
              }
            }
          }
        }
        
        if (itemsToEnrich.length === 0) {
          const allPdm = await dbModule.fetchAll('purchase_detail_master').catch(() => []);
          const filteredPdm = allPdm.filter((d: any) => {
            const pNo = String(d.po_no || '').trim().toUpperCase().replace(/^#/, '');
            return candidateKeys.some(k => k.toUpperCase() === pNo);
          });
          if (filteredPdm.length > 0) itemsToEnrich = filteredPdm;
        }

        if (itemsToEnrich.length === 0) {
          const allScp = await dbModule.fetchAll('sauda_check_point_details').catch(() => []);
          const filteredScp = allScp.filter((d: any) => {
            const pNo = String(d.po_no || '').trim().toUpperCase().replace(/^#/, '');
            return candidateKeys.some(k => k.toUpperCase() === pNo);
          });
          if (filteredScp.length > 0) itemsToEnrich = filteredScp;
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
    if ((gList.length === 0 || agList.length === 0) && supabase) {
      try {
        const [gData, agData] = await Promise.all([
          supabase.from('grade_master').select('*').then(r => r.data || [], () => []),
          supabase.from('agency_master').select('*').then(r => r.data || [], () => [])
        ]);
        if (gData.length > 0) { gList = gData; setGradeMasterList(gData); }
        if (agData.length > 0) { agList = agData; setAgencyMasterList(agData); }
      } catch (err) {
        console.warn("Failed to load masters in getPoItemDetails:", err);
      }
    }

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

    const po = purchaseOrders.find(p => p.po_no === poNo || p.ptf_no === poNo || p.sauda_no === poNo || p.contract_po_no === poNo) || findMatchingPo(poNo, purchaseOrders);
    if (po) {
      setSelectedPoData(po);

      let gList = gradeMasterList;
      let agList = agencyMasterList;
      let aList = areaMasterList;
      let mList = markaMasterList;

      if (gList.length === 0 || agList.length === 0) {
        if (supabase) {
          const [gData, agData, mData, aData] = await Promise.all([
            supabase.from('grade_master').select('*').then(r => r.data || [], () => []),
            supabase.from('agency_master').select('*').then(r => r.data || [], () => []),
            supabase.from('marka_master').select('*').then(r => r.data || [], () => []),
            supabase.from('area_master').select('*').then(r => r.data || [], () => [])
          ]);
          if (gData.length > 0) { gList = gData; setGradeMasterList(gData); }
          if (agData.length > 0) { agList = agData; setAgencyMasterList(agData); }
          if (aData.length > 0) { aList = aData; setAreaMasterList(aData); }
          if (mData.length > 0) { mList = mData; setMarkaMasterList(mData); }
        }
      }

      const poItems = await getPoItemDetails(po);
      setActivePoItems(poItems);
      setActivePoItemsGlobal(poItems);

      let cols = mapItemsToDetailCols(poItems, Number(po.b_rate || po.rate_qntl || 0), po, {
        gradeMasters: gList,
        agencyMasters: agList,
        areaMasters: aList,
        markaMasters: mList
      });

      cols = cols.map(c => ({
        ...c,
        po_items: poItems,
        all_cols: cols
      }));

      const totalColAmt = cols.reduce((sum, c) => sum + getColAmount(c, sattaDiffsList, poItems), 0);
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
        po_no: po.po_no || poNo,
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
      }));

      setDetailCols(cols);

      // Automatically find matching M.R from linked arrivals
      const linkedMrs = getLinkedMrsForPo(poNo, verifiedArrivals);
      const matchingArrival = linkedMrs.find(a => {
        const { isPaid } = isMrAlreadyProcessed(a, paymentList, isEdit ? masterData.voucher_no : undefined, poNo);
        return !isPaid;
      }) || linkedMrs[0];

      if (matchingArrival && !selectedMrNo) {
        handleMrSelection(matchingArrival.mr_no || matchingArrival.final_arrival_no || matchingArrival.arrival_no || matchingArrival.temporary_arrival_no, po);
      } else if (selectedMrNo) {
        const isCurrentPaid = isMrAlreadyProcessed(selectedMrNo, paymentList, isEdit ? masterData.voucher_no : undefined, poNo).isPaid;
        const isCurrentLinked = linkedMrs.some(a => {
          const arrMr = String(a.mr_no || a.final_arrival_no || a.arrival_no || a.temporary_arrival_no || '').trim().toUpperCase();
          const target = String(selectedMrNo).trim().toUpperCase();
          return arrMr === target || arrMr.replace(/^MR0*/, '') === target.replace(/^MR0*/, '');
        });
        if (isCurrentPaid || !isCurrentLinked) {
          if (matchingArrival) {
            handleMrSelection(matchingArrival.mr_no || matchingArrival.final_arrival_no || matchingArrival.arrival_no || matchingArrival.temporary_arrival_no, po);
          } else {
            setSelectedMrNo('');
            setMasterData(prev => ({ ...prev, mr_no: '', arrival_no: '' }));
          }
        }
      } else if (matchingArrival) {
        handleMrSelection(matchingArrival.mr_no || matchingArrival.final_arrival_no || matchingArrival.arrival_no || matchingArrival.temporary_arrival_no, po);
      }
    }
  };

  const handleMrSelection = async (mrNo: string, overridePo?: any) => {
    setSelectedMrNo(mrNo);
    if (!mrNo) return;

    const checkPaid = isMrAlreadyProcessed(mrNo, paymentList, isEdit ? masterData.voucher_no : undefined, selectedPoNo);
    if (checkPaid.isPaid && checkPaid.paidPayment) {
      const p = checkPaid.paidPayment;
      setErrorMessage(`Payment has already been processed for M.R. ${mrNo} against P.O. ${p.po_no || selectedPoNo || 'N/A'} (Voucher No: ${p.voucher_no}). This M.R. cannot be selected again.`);
      setSelectedMrNo('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    let arrival = verifiedArrivals.find(a => {
      const arrMr = String(a.mr_no || a.final_arrival_no || a.arrival_no || a.temporary_arrival_no || a.amad_no || '').trim().toUpperCase();
      const target = String(mrNo).trim().toUpperCase();
      return arrMr === target || arrMr.replace(/^MR0*/, '') === target.replace(/^MR0*/, '');
    });

    // Fallback if not found in verifiedArrivals
    if (!arrival && supabase) {
      try {
        const cleanMr = mrNo.trim().toUpperCase();
        const candidateKeys = Array.from(new Set([
          cleanMr,
          cleanMr.replace(/^MR[-_ ]?/i, ''),
          `MR${cleanMr.replace(/^MR[-_ ]?/i, '')}`,
          `MR0${cleanMr.replace(/^MR[-_ ]?/i, '')}`,
          `MR00${cleanMr.replace(/^MR[-_ ]?/i, '')}`
        ]));
        for (const k of candidateKeys) {
          const { data: miLive } = await supabase
            .from('material_inspection')
            .select('*')
            .or(`mr_no.eq.${k},arrival_no.eq.${k}`)
            .limit(1)
            .maybeSingle();
          if (miLive) {
            arrival = {
              ...miLive,
              mr_no: miLive.mr_no || miLive.arrival_no || k,
              arrival_no: miLive.arrival_no || miLive.mr_no || k,
              supplier: miLive.supplier_name || miLive.supplier,
              broker: miLive.broker_name || miLive.broker,
              po_no: miLive.po_no || miLive.mill_po_no,
              source_module: 'material_inspection'
            };
            break;
          }
        }
      } catch (err) {
        console.warn("Live inspection lookup fallback error:", err);
      }
    }

    if (arrival) {
      const rawPoNo = arrival.po_no || arrival.mill_po_no || masterData.po_no;
      const matchedPo = overridePo || findMatchingPo(rawPoNo, purchaseOrders);
      if (matchedPo) {
        setSelectedPoNo(matchedPo.po_no || matchedPo.ptf_no || rawPoNo);
        setSelectedPoData(matchedPo);
      } else {
        if (rawPoNo) {
          setSelectedPoNo(rawPoNo);
        }
      }
      const po = matchedPo;
      const poNo = matchedPo ? (matchedPo.po_no || matchedPo.ptf_no) : rawPoNo;

      let gList = gradeMasterList;
      let agList = agencyMasterList;
      let aList = areaMasterList;
      let mList = markaMasterList;

      if (gList.length === 0 || agList.length === 0) {
        if (supabase) {
          const [gData, agData, mData, aData] = await Promise.all([
            supabase.from('grade_master').select('*').then(r => r.data || [], () => []),
            supabase.from('agency_master').select('*').then(r => r.data || [], () => []),
            supabase.from('marka_master').select('*').then(r => r.data || [], () => []),
            supabase.from('area_master').select('*').then(r => r.data || [], () => [])
          ]);
          if (gData.length > 0) { gList = gData; setGradeMasterList(gData); }
          if (agData.length > 0) { agList = agData; setAgencyMasterList(agData); }
          if (aData.length > 0) { aList = aData; setAreaMasterList(aData); }
          if (mData.length > 0) { mList = mData; setMarkaMasterList(mData); }
        }
      }

      let rawArrItems: any[] = [];
      
      if (supabase) {
        try {
          const targetMr = arrival.mr_no || arrival.final_arrival_no || arrival.arrival_no || mrNo;
          const cleanMr = targetMr.replace(/^MR[-_ ]?/i, '');
          const candidateKeys = Array.from(new Set([
            targetMr,
            mrNo,
            arrival.mr_no,
            arrival.final_arrival_no,
            arrival.arrival_no,
            cleanMr,
            `MR${cleanMr}`,
            `MR-${cleanMr}`,
            `MR0${cleanMr}`,
            `MR00${cleanMr}`
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

          if (rawArrItems.length === 0) {
            for (const key of candidateKeys) {
              const miRes = await supabase
                .from('material_inspection')
                .select('*')
                .or(`mr_no.eq.${key},arrival_no.eq.${key}`)
                .limit(1)
                .maybeSingle();
              if (miRes.data) {
                const grid = miRes.data.grid_details || miRes.data.details;
                const parsed = parseGridOrItems(grid);
                if (parsed && parsed.length > 0) {
                  rawArrItems = parsed;
                  break;
                }
              }
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
      setActivePoItems(poItems);
      setActivePoItemsGlobal(poItems);

      if (rawArrItems.length === 0 && poItems.length > 0) {
        rawArrItems = poItems;
      }

      let cols = mapItemsToDetailCols(rawArrItems, Number(po?.b_rate || po?.rate_qntl || 0), po || arrival, {
        gradeMasters: gList,
        agencyMasters: agList,
        areaMasters: aList,
        markaMasters: mList
      });

      if (poItems.length > 0) {
        const colsWithBaseRates = cols.map((col) => {
          if (!col.grade && !col.arr_qty_wt && !col.quantity) return col;
          
          let lineRate = col.rate_value;
          let linePremium = col.premium || 0;
          const matchedPoItem = findMatchedPoItem(col, poItems, { gradeMasters: gList, agencyMasters: agList });

          if (matchedPoItem) {
            const r = Number(
              matchedPoItem.rate_per_mt || matchedPoItem.rate_mt || matchedPoItem.rate_qntl || matchedPoItem.rate || 0
            );
            if (r > 0) {
              lineRate = r;
            }
            const p = Number(matchedPoItem.premium || matchedPoItem.premium_amount || matchedPoItem.prem || 0);
            if (p > 0) {
              linePremium = p;
            }
          }
          if (!lineRate || lineRate === 0) {
            const fallbackRate = Number(po?.b_rate || po?.rate_qntl || 0);
            if (fallbackRate > 0) {
              lineRate = fallbackRate;
            }
          }
          if (!linePremium || linePremium === 0) {
            const fallbackPrem = Number(po?.premium || 0);
            if (fallbackPrem > 0) {
              linePremium = fallbackPrem;
            }
          }

          const settPct = getColSettPct(col);
          return {
            ...col,
            rate_value: lineRate,
            premium: linePremium,
            sett_pct: settPct,
            po_items: poItems
          };
        });

        cols = colsWithBaseRates.map((col) => {
          if (!col.grade && !col.arr_qty_wt && !col.quantity) return { ...col, all_cols: colsWithBaseRates };
          const colWithRate = { ...col, all_cols: colsWithBaseRates };
          const ded = getColDeduction(colWithRate, sattaDiffsList, poItems);
          const sRate = Math.max(0, Number(((Number(col.rate_value) || 0) + (Number(col.premium) || 0) - ded).toFixed(2)));
          const qQtl = getColQtyQtl(col);
          const amt = Number((qQtl * sRate).toFixed(2));

          return {
            ...col,
            deduction_rate: ded,
            sett_rate: sRate,
            quantity_qtl: qQtl,
            amount: amt,
            all_cols: colsWithBaseRates
          };
        });
      } else {
        cols = cols.map(c => ({ ...c, po_items: poItems, all_cols: cols }));
      }

      const totalColAmt = cols.reduce((sum, c) => sum + getColAmount(c, sattaDiffsList, poItems), 0);
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
        challan_weight: Number(arrival.challan_material_weight || prev.challan_weight)
      }));

      setDetailCols(cols);
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

    const checkMr = String(masterData.mr_no || selectedMrNo || masterData.arrival_no || '').trim().toUpperCase();
    const checkPo = String(masterData.po_no || selectedPoNo || '').trim().toUpperCase();

    if (checkMr && checkMr !== 'N/A') {
      const localConflict = isMrAlreadyProcessed(checkMr, paymentList, isEdit ? masterData.voucher_no : undefined, checkPo);
      if (localConflict.isPaid && localConflict.paidPayment) {
        const p = localConflict.paidPayment;
        setErrorMessage(`Payment has already been processed for M.R. ${checkMr} against P.O. ${p.po_no || checkPo || 'N/A'} (Voucher No: ${p.voucher_no}). This M.R. cannot be selected again.`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (!supabase) throw new Error("Supabase client not connected.");

      await ensurePaymentTablesExist();

      if (checkMr && checkMr !== 'N/A') {
        try {
          const { data: liveConflicts } = await supabase
            .from('payment_master')
            .select('voucher_no, mr_no, arrival_no, po_no, supplier, party_name, status')
            .or(`mr_no.ilike.%${checkMr}%,arrival_no.ilike.%${checkMr}%`);

          if (liveConflicts && liveConflicts.length > 0) {
            const conflict = liveConflicts.find((p: any) => {
              if (isEdit && String(p.voucher_no).trim().toUpperCase() === String(masterData.voucher_no).trim().toUpperCase()) {
                return false;
              }
              const pStatus = String(p.status || '').toLowerCase().trim();
              if (pStatus === 'cancelled' || pStatus === 'rejected') return false;

              const pMr = String(p.mr_no || p.arrival_no || '').trim().toUpperCase();
              return pMr === checkMr;
            });

            if (conflict) {
              setErrorMessage(`Payment has already been processed for M.R. ${checkMr} against P.O. ${conflict.po_no || checkPo || 'N/A'} (Voucher No: ${conflict.voucher_no}). This M.R. cannot be selected again.`);
              setLoading(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
              return;
            }
          }
        } catch (dbErr) {
          console.warn("Live duplicate check notice:", dbErr);
        }

        try {
          const apiRes = await fetch('/api/payments/check-duplicate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mr_no: checkMr,
              po_no: checkPo,
              current_voucher_no: isEdit ? masterData.voucher_no : undefined
            })
          });
          if (apiRes.ok) {
            const apiData = await apiRes.json();
            if (apiData.isDuplicate) {
              setErrorMessage(apiData.message || `Payment has already been processed for M.R. ${checkMr} against P.O. ${checkPo}. This M.R. cannot be selected again.`);
              setLoading(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
              return;
            }
          }
        } catch (apiErr) {
          console.warn("Backend API duplicate check notice:", apiErr);
        }
      }

      const payableVal = Number(masterData.payable_amt) || 0;
      const parsedPaid = (masterData.paid_amount !== undefined && masterData.paid_amount !== null && String(masterData.paid_amount).trim() !== '' && !isNaN(Number(masterData.paid_amount)))
        ? Number(masterData.paid_amount)
        : 0;

      const calcStatus = (payableVal > 0 && parsedPaid >= payableVal - 0.01)
        ? 'completed'
        : (parsedPaid > 0 ? 'partially_paid' : 'pending');

      const calcPaymentStatus = (payableVal > 0 && parsedPaid >= payableVal - 0.01)
        ? 'Paid'
        : (parsedPaid > 0 ? 'Partially Paid' : 'Pending');

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
        payable_amt: payableVal,
        payable_bill_no: masterData.payable_bill_no || null,
        payable_bill_date: masterData.payable_bill_date || null,
        total_amount: (masterData.total_amount !== undefined && masterData.total_amount !== null && !isNaN(Number(masterData.total_amount))) ? Number(masterData.total_amount) : payableVal,
        paid_amount: parsedPaid,
        payment_mode: masterData.payment_mode || 'Bank Transfer (NEFT/RTGS)',
        bank_name: masterData.bank_name || '',
        reference_no: masterData.reference_no || '',
        remarks: masterData.remarks || '',
        status: calcStatus,
        payment_status: calcPaymentStatus,
        advance_payment_done: masterData.advance_payment_done || 'Yes',
        advance_payment_from: masterData.advance_payment_from || '1',
        advance_payment_financier : masterData.advance_payment_financier || '',
        payment_settlementdate: masterData.payment_settlementdate || '',
        tenor: masterData.tenor || '',
        repayment_date: masterData.repayment_date || ''
      };

      const targetArrivalPaymentStatus = (payableVal > 0 && parsedPaid >= payableVal - 0.01)
        ? 'Paid'
        : (parsedPaid > 0 ? 'Partially Paid' : 'Pending');

      const rowsToWrite = detailCols
        .filter(c => c.grade && c.grade.trim() !== '')
        .map(c => {
          const colWithCtx = {
            ...c,
            po_items: (c.po_items && c.po_items.length > 0) ? c.po_items : activePoItems,
            all_cols: detailCols
          };
          return {
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
            premium: Number(c.premium) || 0,
            sett_pct: getColSettPct(colWithCtx),
            deduction_rate: getColDeduction(colWithCtx, sattaDiffsList, activePoItems),
            sett_rate: getColSettRate(colWithCtx, sattaDiffsList, activePoItems),
            quantity_qtl: getColQtyQtl(colWithCtx),
            amount: getColAmount(colWithCtx, sattaDiffsList, activePoItems),
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
          };
        });

      const sqlVal = (v: any) => {
        if (v === null || v === undefined) return 'NULL';
        if (typeof v === 'number') return isFinite(v) ? String(v) : '0';
        if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
        return `'${String(v).replace(/'/g, "''")}'`;
      };

      try {
        const masterCols = Object.keys(initialPayload);
        const masterVals = masterCols.map(k => sqlVal(initialPayload[k]));
        const updateSet = masterCols.filter(k => k !== 'voucher_no').map(k => `${k} = EXCLUDED.${k}`).join(', ');
        const txQueries: string[] = [
          `INSERT INTO payment_master (${masterCols.join(', ')}) VALUES (${masterVals.join(', ')}) ON CONFLICT (voucher_no) DO UPDATE SET ${updateSet};`,
          `DELETE FROM payment_details WHERE voucher_no = ${sqlVal(masterData.voucher_no)};`
        ];
        for (const row of rowsToWrite) {
          const dCols = Object.keys(row);
          const dVals = dCols.map(k => sqlVal((row as any)[k]));
          txQueries.push(`INSERT INTO payment_details (${dCols.join(', ')}) VALUES (${dVals.join(', ')});`);
        }
        if (masterData.mr_no) {
          txQueries.push(`UPDATE final_arrival SET payment_status = ${sqlVal(targetArrivalPaymentStatus)} WHERE mr_no = ${sqlVal(masterData.mr_no)};`);
        }
        if (masterData.po_no) {
          txQueries.push(`UPDATE purchase_master SET payment_status = ${sqlVal(targetArrivalPaymentStatus)} WHERE po_no = ${sqlVal(masterData.po_no)};`);
        }
        await dbModule.executeTransaction(txQueries);
      } catch (_txErr) {
        const savedMaster = await dbModule.upsert('payment_master', initialPayload, 'voucher_no');
        const { error: delErr } = await supabase.from('payment_details').delete().eq('voucher_no', masterData.voucher_no);
        if (delErr) throw delErr;
        if (rowsToWrite.length > 0) {
          const rowsWithId = rowsToWrite.map(r => ({ ...r, payment_id: savedMaster?.payment_id || null }));
          const { error: insErr } = await supabase.from('payment_details').insert(rowsWithId);
          if (insErr) {
            for (const r of rowsWithId) {
              await dbModule.insert('payment_details', r);
            }
          }
        }
        if (masterData.mr_no) {
          await supabase.from('final_arrival').update({ payment_status: targetArrivalPaymentStatus }).eq('mr_no', masterData.mr_no);
        }
        if (masterData.po_no) {
          await supabase.from('purchase_master').update({ payment_status: targetArrivalPaymentStatus }).eq('po_no', masterData.po_no);
        }
      }

      setShowSuccessAnim(true);
      setTimeout(() => {
        setShowSuccessAnim(false);
        initPage();
        if (onSaveSuccess) onSaveSuccess();
      }, 1500);

    } catch (err: any) {
      console.error("Save error:", err);
      setErrorMessage(err.message || "Failed to save payment record.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayment = async (voucherNo: string) => {
    if (!enforceEditOrDeletePermission('Delete')) return;
    if (!window.confirm(`Are you sure you want to delete Payment Voucher ${voucherNo}?`)) return;

    setLoading(true);
    try {
      const targetVoucher = String(voucherNo || '').trim();
      const targetPayment = paymentList.find(
        (p) => String(p.voucher_no || '').trim().toUpperCase() === targetVoucher.toUpperCase()
      );
      const paymentId = targetPayment?.payment_id;
      const linkedMrNo = String(targetPayment?.mr_no || targetPayment?.arrival_no || '').trim();
      const linkedPoNo = String(targetPayment?.po_no || '').trim();

      // 1. Invalidate caches upfront so queries don't return stale data
      dbModule.invalidateCache('payment_master');
      dbModule.invalidateCache('payment_details');

      // 2. Direct Supabase Deletion for payment_details & payment_master by payment_id & voucher_no
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
      }

      // 3. Fallback SQL Transaction via exec_sql RPC
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

      // 4. Invalidate caches again and clear dataCache
      dbModule.invalidateCache('payment_master');
      dbModule.invalidateCache('payment_details');
      dbModule.invalidateCache();

      // 5. Optimistically update local React state
      setPaymentList((prev) =>
        prev.filter((p) => {
          const vStr = String(p.voucher_no || '').trim().toUpperCase();
          const pId = p.payment_id;
          if (paymentId && pId && pId === paymentId) return false;
          return vStr !== targetVoucher.toUpperCase();
        })
      );

      // 6. Recompute linked MR & PO payment status from remaining active payments
      if (supabase && (linkedMrNo || linkedPoNo)) {
        const { data: remainingPayments } = await supabase
          .from('payment_master')
          .select('voucher_no, mr_no, arrival_no, po_no, paid_amount, payable_amt, total_amount, status');

        const activeRemaining = (remainingPayments || []).filter((p: any) => {
          const st = String(p.status || '').trim().toLowerCase();
          return (
            st !== 'cancelled' &&
            st !== 'rejected' &&
            String(p.voucher_no || '').trim().toUpperCase() !== targetVoucher.toUpperCase() &&
            (!paymentId || p.payment_id !== paymentId)
          );
        });

        if (linkedMrNo) {
          const mrPayments = activeRemaining.filter(
            (p: any) =>
              String(p.mr_no || '').trim().toUpperCase() === linkedMrNo.toUpperCase() ||
              String(p.arrival_no || '').trim().toUpperCase() === linkedMrNo.toUpperCase()
          );
          const mrPaidSum = mrPayments.reduce((s: number, p: any) => s + (Number(p.paid_amount) || 0), 0);
          const mrPayable = mrPayments.reduce((s: number, p: any) => Math.max(s, Number(p.payable_amt || p.total_amount) || 0), 0);
          const newMrStatus =
            mrPayments.length === 0 || mrPaidSum <= 0
              ? 'Pending'
              : mrPayable > 0 && mrPaidSum >= mrPayable
              ? 'Paid'
              : 'Partially Paid';
          await supabase.from('final_arrival').update({ payment_status: newMrStatus }).eq('mr_no', linkedMrNo);
        }

        if (linkedPoNo) {
          const poPayments = activeRemaining.filter(
            (p: any) => String(p.po_no || '').trim().toUpperCase() === linkedPoNo.toUpperCase()
          );
          const poPaidSum = poPayments.reduce((s: number, p: any) => s + (Number(p.paid_amount) || 0), 0);
          const poPayable = poPayments.reduce((s: number, p: any) => Math.max(s, Number(p.payable_amt || p.total_amount) || 0), 0);
          const newPoStatus =
            poPayments.length === 0 || poPaidSum <= 0
              ? 'Pending'
              : poPayable > 0 && poPaidSum >= poPayable
              ? 'Paid'
              : 'Partially Paid';
          await supabase.from('purchase_master').update({ payment_status: newPoStatus }).eq('po_no', linkedPoNo);
        }
      }

      setSuccessMessage(`Payment Voucher ${voucherNo} deleted from Database.`);
      await initPage();
    } catch (e: any) {
      setErrorMessage(e.message || "Failed to delete payment.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditPayment = async (item: PaymentMaster) => {
    setMasterData(item);
    setIsEdit(true);

    let loadedCols = [emptyDetailColumn(1), emptyDetailColumn(2), emptyDetailColumn(3), emptyDetailColumn(4)];
    if (supabase && item.voucher_no) {
      const { data: details } = await supabase
        .from('payment_details')
        .select('*')
        .eq('voucher_no', item.voucher_no);

      if (details && details.length > 0) {
        details.forEach((d: any, idx: number) => {
          if (idx < 4) {
            const settPct =
              d.sett_pct !== undefined && d.sett_pct !== null && String(d.sett_pct).trim() !== '' && !isNaN(Number(d.sett_pct)) && Number(d.sett_pct) >= 0
                ? Number(d.sett_pct)
                : (Number(d.gd_claim) > 0 ? Number(d.gd_claim) : Number(d.gd_sett || 0));
            const origRate = Number(d.rate_value) || 0;
            const premium = Number(d.premium || 0);
            const sattaDed = getColDeduction({ ...d, rate_value: origRate, premium: premium, sett_pct: settPct });
            const dedRate = (settPct > 0 || sattaDed > 0)
              ? sattaDed
              : (d.deduction_rate !== undefined && d.deduction_rate !== null && !isNaN(Number(d.deduction_rate))
                ? Number(d.deduction_rate)
                : 0);
            const sRate = Math.max(0, Number((origRate + premium - dedRate).toFixed(2)));
            const qQtl = d.quantity_qtl !== undefined && d.quantity_qtl !== null && !isNaN(Number(d.quantity_qtl))
              ? Number(d.quantity_qtl)
              : Number((Number(d.arr_qty_wt || d.wt_quantity || 0) * 10).toFixed(3));
            const amt = d.amount !== undefined && d.amount !== null && !isNaN(Number(d.amount))
              ? Number(d.amount)
              : Number((qQtl * sRate).toFixed(2));

            loadedCols[idx] = {
              ...emptyDetailColumn(idx + 1),
              ...d,
              rate_value: origRate,
              premium: premium,
              sett_pct: settPct,
              deduction_rate: dedRate,
              sett_rate: sRate,
              quantity_qtl: qQtl,
              amount: amt
            };
          }
        });
        setDetailCols(loadedCols);
      }
    }

    const deductions = await resolvePaymentDeductionsForPoAndMr({
      poNo: item.po_no,
      mrNo: item.mr_no || item.arrival_no,
      cols: loadedCols,
      saudaCheckPoints,
      purchaseOrders,
      verifiedArrivals
    });

    setMasterData(prev => ({
      ...prev,
      summary_delivery_claim: deductions.deliveryClaim,
      summary_deduction_amount: deductions.totalDeductionsAndPenalties,
      summary_deduction_type: deductions.deductionSummaryText,
      val_ex_short: deductions.extraAndShort
    }));
  };

  const handleExportPdf = (filteredPayments: PaymentMaster[]) => {
    if (filteredPayments.length === 0) {
      alert("No payment records to export.");
      return;
    }
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("PAYMENT MASTER RECORDS", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

    const tableData = filteredPayments.map(p => [
      p.voucher_no,
      p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-IN') : '',
      p.party_name || p.supplier || '',
      p.mr_no || '',
      p.po_no || '',
      formatIndianCurrency(Number(p.paid_amount || 0)),
      p.payment_mode || 'Bank Transfer',
      p.status || 'completed'
    ]);

    autoTable(doc, {
      startY: 28,
      head: [['Voucher No', 'Date', 'Party Name', 'M.R No', 'P.O No', 'Paid Amount', 'Mode', 'Status']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save('Payment_Records.pdf');
  };

  const handleExportPartyLedgerPdf = (selectedParty: string, records: PaymentMaster[]) => {
    if (records.length === 0) {
      alert("No records to export for Party Ledger.");
      return;
    }
    const doc = new jsPDF();
    const partyTitle = selectedParty ? `PARTY LEDGER STATEMENT - ${selectedParty.toUpperCase()}` : "ALL PARTIES LEDGER STATEMENT";
    const totalPayable = records.reduce((sum, p) => sum + Number(p.payable_amt || p.total_amount || 0), 0);
    const totalPaid = records.reduce((sum, p) => sum + Number(p.paid_amount || 0), 0);
    const totalPending = totalPayable - totalPaid;

    doc.setFontSize(14);
    doc.text(partyTitle, 14, 15);
    doc.setFontSize(10);
    doc.text(`Statement Date: ${new Date().toLocaleDateString('en-IN')}`, 14, 22);
    doc.text(`Total Payable Value: ${formatIndianCurrency(totalPayable)}  |  Total Paid: ${formatIndianCurrency(totalPaid)}  |  Net Pending Balance: ${formatIndianCurrency(totalPending)}`, 14, 28);

    const tableData = records.map(p => {
      const payable = Number(p.payable_amt || p.total_amount || 0);
      const paid = Number(p.paid_amount || 0);
      const pending = payable - paid;
      return [
        p.voucher_no,
        p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-IN') : '',
        p.party_name || p.supplier || '',
        p.po_no || p.mr_no || '',
        formatIndianCurrency(payable),
        formatIndianCurrency(paid),
        formatIndianCurrency(pending),
        p.payment_mode || 'Bank Transfer'
      ];
    });

    autoTable(doc, {
      startY: 34,
      head: [['Voucher No', 'Date', 'Party Name', 'P.O / M.R No', 'Payable Amt', 'Paid Amt', 'Pending Bal', 'Payment Mode']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [109, 40, 217] }
    });

    doc.save(`Party_Ledger_${(selectedParty || 'All_Parties').replace(/\s+/g, '_')}.pdf`);
  };

  return {
    loading,
    errorMessage,
    setErrorMessage,
    successMessage,
    setSuccessMessage,
    showSuccessAnim,
    paymentList,
    verifiedArrivals,
    purchaseOrders,
    saudaCheckPoints,
    selectedPoNo,
    setSelectedPoNo,
    selectedPoData,
    setSelectedPoData,
    selectedMrNo,
    setSelectedMrNo,
    isEdit,
    setIsEdit,
    masterData,
    setMasterData,
    detailCols,
    setDetailCols,
    activePoItems,
    setActivePoItems,
    gradeMasterList,
    agencyMasterList,
    markaMasterList,
    areaMasterList,
    sattaDiffsList,
    availableArrivals,
    eligiblePos,
    isPoEligibleForPaymentLocal,
    findMatchingPo,
    initPage,
    handlePoSelection,
    handleMrSelection,
    handleSavePayment,
    handleDeletePayment,
    handleEditPayment,
    handleExportPdf,
    handleExportPartyLedgerPdf
  };
}
