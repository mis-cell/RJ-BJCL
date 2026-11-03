import { PaymentDetailColumn, emptyDetailColumn } from '../types/payment.types';
import { calculateSattaDeduction } from '../services/sattaCalculation';
export { calculateSattaDeduction };
import { supabase } from '../lib/supabase';
import { dbModule } from '../services/dbModule';
import {
  fetchSaudaCheckpointDeduction,
  isLastMrForPo,
  fetchPoAndItemDetails,
  getPoContractLorryCount,
  getUniquePoLorryGroups
} from '../services/settlementService';

export const hasDetailColData = (col?: PaymentDetailColumn): boolean => {
  if (!col) return false;
  const hasQty = Number(col.quantity) > 0;
  const hasWt = Number(col.arr_qty_wt) > 0 || Number(col.wt_quantity) > 0;
  return hasQty || hasWt;
};

export const calculateDeliveryDelayDays = (
  poDeliveryTo?: string | null,
  arrivalDate?: string | null
): number => {
  if (!poDeliveryTo || !arrivalDate) return 0;

  const parseToMidnight = (dStr: string): Date | null => {
    const clean = String(dStr).trim();
    if (!clean) return null;
    if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
      const [y, m, d] = clean.split('T')[0].split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    const dmy = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (dmy) {
      return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
    }
    const d = new Date(clean);
    if (isNaN(d.getTime())) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  };

  const due = parseToMidnight(poDeliveryTo);
  const arr = parseToMidnight(arrivalDate);
  if (!due || !arr) return 0;

  const diffMs = arr.getTime() - due.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
};

export const calculateDeliveryClaimPenalty = (
  weightQtl: number,
  delayDays: number,
  penaltyRatePerQtlDay: number
): number => {
  if (delayDays > 0 && penaltyRatePerQtlDay > 0 && weightQtl > 0) {
    return Math.round(weightQtl * penaltyRatePerQtlDay * delayDays);
  }
  return 0;
};

/**
 * Calculates Paid Amount (₹) based on user formula:
 * Step 1: Net Payment Amount = Payable Net Amount (₹) - (Delivery Claim (-) + Total Deductions & Penalties + Extra & Short)
 * Step 2: Paid Amount (₹) = Math.round(Net Payment Amount * 93%)
 */
export const calculateNetPaidAmountAfterDeductions = (
  payableNetAmount: number,
  deliveryClaim: number = 0,
  totalDeductionsAndPenalties: number = 0,
  extraAndShort: number = 0
): number => {
  const gross = Math.round(Number(payableNetAmount) || 0);
  if (gross <= 0) return 0;
  const dClaim = Math.max(0, Number(deliveryClaim) || 0);
  const totDed = Math.max(0, Number(totalDeductionsAndPenalties) || 0);
  const exShort = Math.max(0, Number(extraAndShort) || 0);
  const netPaymentAmount = Math.max(0, gross - dClaim - totDed - exShort);
  const paidAmount93Pct = netPaymentAmount * 0.93;
  return Math.round(paidAmount93Pct);
};

export interface PaymentDeductionsBreakdown {
  deliveryClaim: number;
  deliveryDelayDays: number;
  deliveryPenaltyRate: number;
  weightQtl: number;
  poDeliveryToDate: string;
  arrivalDate: string;
  totalDeductionsAndPenalties: number;
  deductionSummaryText: string;
  extraAndShort: number;
}

export async function resolvePaymentDeductionsForPoAndMr(params: {
  po?: any;
  poNo?: string;
  arrival?: any;
  mrNo?: string;
  cols?: PaymentDetailColumn[];
  saudaCheckPoints?: any[];
  purchaseOrders?: any[];
  verifiedArrivals?: any[];
}): Promise<PaymentDeductionsBreakdown> {
  const {
    po,
    poNo,
    arrival,
    mrNo,
    cols = [],
    saudaCheckPoints = [],
    purchaseOrders = [],
    verifiedArrivals = []
  } = params;

  const rawPoNo = String(
    poNo ||
    po?.po_no ||
    po?.ptf_no ||
    po?.sauda_no ||
    po?.contract_po_no ||
    arrival?.po_no ||
    arrival?.mill_po_no ||
    ''
  ).trim();
  const cleanPoNo = rawPoNo.replace(/^#/, '').trim();

  const rawMrNo = String(
    mrNo ||
    arrival?.mr_no ||
    arrival?.final_arrival_no ||
    arrival?.arrival_no ||
    arrival?.temporary_arrival_no ||
    ''
  ).trim();

  // Rule: "Extra & Short" deduction MUST ONLY be deducted from the P.O. against the Last M.R. of that P.O.
  // All other per-MR deductions (Delivery Claim and Mill Inspection Deductions & Penalties) are resolved and displayed for every M.R.
  if (!cleanPoNo && !rawMrNo) {
    return {
      deliveryClaim: 0,
      deliveryDelayDays: 0,
      deliveryPenaltyRate: 0,
      weightQtl: 0,
      poDeliveryToDate: '',
      arrivalDate: String(arrival?.date || arrival?.arrival_date || '').trim(),
      totalDeductionsAndPenalties: 0,
      deductionSummaryText: '',
      extraAndShort: 0
    };
  }

  const normPoKey = (v: any) =>
    String(v || '')
      .trim()
      .replace(/^#+/, '')
      .replace(/\(PTF\)/gi, '')
      .trim()
      .toUpperCase();
  const targetPoNorm = normPoKey(cleanPoNo);

  const matchInList = (list: any[]) =>
    (list || []).find(item => {
      if (!item) return false;
      const cands = [item.po_no, item.ptf_no, item.sauda_no, item.contract_po_no, item.new_po_no].map(normPoKey);
      return cands.includes(targetPoNorm);
    });

  const scpMatch = cleanPoNo ? matchInList(saudaCheckPoints) : null;
  const poMatch = cleanPoNo ? matchInList(purchaseOrders) : null;

  // 1. Fetch Sauda Check Point deduction record & check if rawMrNo is the Last M.R. of the P.O.
  let saudaDed: any = null;
  let candidateExtraAndShort = 0;
  if (cleanPoNo && rawMrNo) {
    try {
      saudaDed = await fetchSaudaCheckpointDeduction(cleanPoNo);
      if (saudaDed && Number(saudaDed.deduction_amount) > 0) {
        candidateExtraAndShort = Number(saudaDed.deduction_amount);
      }
    } catch (e) {
      console.warn('Error fetching sauda_check_point_deductions in payment:', e);
    }
    if (candidateExtraAndShort === 0 && po) {
      const fallbackEx = Number(po.excess_short_deduction || po.val_ex_short || 0);
      if (fallbackEx > 0) candidateExtraAndShort = fallbackEx;
    }
  }

  let extraAndShort = 0;
  if (candidateExtraAndShort > 0 && cleanPoNo && rawMrNo) {
    // Build authoritative PO data (merging purchase_master, sauda_check_point, sauda_master, and live DB)
    let livePoData: any = null;
    try {
      const fetched = await fetchPoAndItemDetails(cleanPoNo);
      if (fetched?.poData) {
        livePoData = fetched.poData;
      }
    } catch (e) {
      console.warn('Error fetching live PO details for Last M.R. check in payment:', e);
    }

    const prelimPo = {
      ...(poMatch || {}),
      ...(scpMatch || {}),
      ...(po || {}),
      contract_weight_mt: Math.max(
        Number(po?.total_contract_mt || po?.contract_weight_mt || 0),
        Number(scpMatch?.total_contract_mt || scpMatch?.contract_weight_mt || 0),
        Number(poMatch?.total_contract_mt || poMatch?.contract_weight_mt || 0),
        Number(saudaDed?.contract_weight_mt || 0)
      )
    };

    const maxContractMt = Math.max(
      Number(prelimPo.contract_weight_mt || 0),
      Number(livePoData?.total_contract_mt || livePoData?.contract_weight_mt || 0),
      Number(saudaDed?.contract_weight_mt || 0)
    );
    const maxLorries = Math.max(
      getPoContractLorryCount(poMatch),
      getPoContractLorryCount(scpMatch),
      getPoContractLorryCount(po),
      getPoContractLorryCount(livePoData),
      getPoContractLorryCount({ ...prelimPo, ...(livePoData || {}), total_contract_mt: maxContractMt })
    );

    const effectivePoData = {
      ...(poMatch || {}),
      ...(livePoData || {}),
      ...(scpMatch || {}),
      ...(po || {}),
      total_contract_mt: maxContractMt || prelimPo.total_contract_mt || 0,
      contract_weight_mt: maxContractMt || prelimPo.contract_weight_mt || 0,
      total_lorries: maxLorries,
      total_no_of_lorries: maxLorries,
      no_of_lorries: maxLorries,
      contract_lorries: maxLorries
    };

    // Gather arrivals pool for this P.O. to check if rawMrNo is the Last M.R.
    let arrivalsPool: any[] = Array.isArray(verifiedArrivals) ? [...verifiedArrivals] : [];
    if (arrival) {
      arrivalsPool.push(arrival);
    }
    if (supabase) {
      try {
        const noPtfPo = cleanPoNo.replace(/\(PTF\)/gi, '').trim();
        const ptfPo = `${noPtfPo}(PTF)`;
        const poOrFilter = `po_no.eq."${cleanPoNo}",po_no.eq."#${cleanPoNo}",po_no.eq."${noPtfPo}",po_no.eq."${ptfPo}"`;
        const [miRows, faRows, tmrRows] = await Promise.all([
          supabase.from('material_inspection').select('*').or(poOrFilter).then(r => r.data || [], () => []),
          supabase.from('final_arrival').select('*').or(poOrFilter).then(r => r.data || [], () => []),
          supabase.from('temporary_material_received').select('*').or(poOrFilter).then(r => r.data || [], () => [])
        ]);
        arrivalsPool = [...arrivalsPool, ...miRows, ...faRows, ...tmrRows];
      } catch (_e) {}
    }

    const isLastMr = isLastMrForPo(rawMrNo, cleanPoNo, arrivalsPool, effectivePoData);
    extraAndShort = isLastMr ? candidateExtraAndShort : 0;
  }

  // 2. Resolve Total Deductions & Penalties from Mill Inspection (mill_inspection_deduction / material_inspection / mill_inspection_master)
  let totalDeductionsAndPenalties = 0;
  let deductionSummaryText = '';

  const cleanMr = rawMrNo.replace(/^MR[-_ ]?/i, '').trim();
  const mrCandidateKeys = Array.from(
    new Set(
      [
        rawMrNo,
        arrival?.mr_no,
        arrival?.final_arrival_no,
        arrival?.arrival_no,
        arrival?.temporary_arrival_no,
        cleanMr ? cleanMr : '',
        cleanMr ? `MR${cleanMr}` : '',
        cleanMr ? `MR-${cleanMr}` : '',
        cleanMr ? `MR0${cleanMr}` : '',
        cleanMr ? `MR00${cleanMr}` : ''
      ]
        .map(v => String(v || '').trim())
        .filter(Boolean)
    )
  );

  // If no MR was explicitly passed and PO has only a single linked arrival, use that arrival
  if (mrCandidateKeys.length === 0 && cleanPoNo && verifiedArrivals.length > 0) {
    const linked = getLinkedMrsForPo(cleanPoNo, verifiedArrivals);
    if (linked.length === 1) {
      [linked[0].mr_no, linked[0].final_arrival_no, linked[0].arrival_no, linked[0].temporary_arrival_no]
        .map(v => String(v || '').trim())
        .filter(Boolean)
        .forEach(k => {
          if (!mrCandidateKeys.includes(k)) mrCandidateKeys.push(k);
        });
    }
  }

  let parsedDedItems: { deduction_type: string; deduction_amount: number }[] = [];

  if (mrCandidateKeys.length > 0 && supabase) {
    try {
      const orClauses = mrCandidateKeys
        .flatMap(k => [`mr_no.eq.${k}`, `arrival_no.eq.${k}`])
        .join(',');
      const { data: dedRows } = await supabase
        .from('mill_inspection_deduction')
        .select('*')
        .or(orClauses);

      if (dedRows && dedRows.length > 0) {
        parsedDedItems = dedRows.map((d: any) => {
          const rate = Number(d.deduction_rate || d.rate) || 0;
          const qty = Number(d.deduction_qty || d.qty) || 1;
          const amt =
            Number(d.deduction_amount || d.amount) ||
            Number((rate * qty).toFixed(2));
          return {
            deduction_type: String(d.deduction_type || d.type || 'Deduction').trim(),
            deduction_amount: amt
          };
        });
      }
    } catch (e) {
      console.warn('Error querying mill_inspection_deduction in payment:', e);
    }
  }

  if (parsedDedItems.length === 0 && mrCandidateKeys.length > 0) {
    try {
      const localDedRows = await dbModule.fetchAll('mill_inspection_deduction').catch(() => []);
      const upperKeys = new Set(mrCandidateKeys.map(k => k.toUpperCase()));
      const matchedLocal = (localDedRows || []).filter((d: any) => {
        const dMr = String(d.mr_no || '').trim().toUpperCase();
        const dArr = String(d.arrival_no || '').trim().toUpperCase();
        return (dMr && upperKeys.has(dMr)) || (dArr && upperKeys.has(dArr));
      });
      if (matchedLocal.length > 0) {
        parsedDedItems = matchedLocal.map((d: any) => {
          const rate = Number(d.deduction_rate || d.rate) || 0;
          const qty = Number(d.deduction_qty || d.qty) || 1;
          const amt =
            Number(d.deduction_amount || d.amount) ||
            Number((rate * qty).toFixed(2));
          return {
            deduction_type: String(d.deduction_type || d.type || 'Deduction').trim(),
            deduction_amount: amt
          };
        });
      }
    } catch (e) {
      console.warn('Fallback mill_inspection_deduction error:', e);
    }
  }

  // Fallback to arrival.deduction_types or arrival.deductions or live material_inspection / mill_inspection_master
  let liveInspMaster: any = arrival || null;
  if (parsedDedItems.length === 0 && mrCandidateKeys.length > 0 && supabase) {
    try {
      const orClauses = mrCandidateKeys
        .flatMap(k => [`mr_no.eq.${k}`, `arrival_no.eq.${k}`])
        .join(',');
      const { data: miData } = await supabase
        .from('material_inspection')
        .select('*')
        .or(orClauses)
        .limit(1);
      if (miData && miData[0]) {
        liveInspMaster = { ...liveInspMaster, ...miData[0] };
      } else {
        const { data: mimData } = await supabase
          .from('mill_inspection_master')
          .select('*')
          .or(orClauses)
          .limit(1);
        if (mimData && mimData[0]) {
          liveInspMaster = { ...liveInspMaster, ...mimData[0] };
        }
      }
    } catch (e) {
      console.warn('Fallback inspection master lookup error:', e);
    }
  }

  if (parsedDedItems.length === 0 && liveInspMaster) {
    const rawArr = liveInspMaster.deduction_types || liveInspMaster.deductions;
    let arr: any[] = [];
    if (Array.isArray(rawArr)) arr = rawArr;
    else if (typeof rawArr === 'string' && rawArr.trim()) {
      try {
        const parsed = JSON.parse(rawArr);
        if (Array.isArray(parsed)) arr = parsed;
      } catch (_e) {}
    }
    if (arr.length > 0) {
      parsedDedItems = arr.map((d: any) => {
        const rate = Number(d.deduction_rate || d.rate) || 0;
        const qty = Number(d.deduction_qty || d.qty) || 1;
        const amt =
          Number(d.deduction_amount || d.amount) ||
          Number((rate * qty).toFixed(2));
        return {
          deduction_type: String(d.deduction_type || d.type || 'Deduction').trim(),
          deduction_amount: amt
        };
      });
    }
  }

  if (parsedDedItems.length > 0) {
    totalDeductionsAndPenalties = Number(
      parsedDedItems.reduce((sum, item) => sum + (Number(item.deduction_amount) || 0), 0).toFixed(2)
    );
    deductionSummaryText = parsedDedItems.map(item => item.deduction_type).filter(Boolean).join(', ');
  } else if (liveInspMaster) {
    const fallbackAmt = Number(
      liveInspMaster.deduction_amount ||
      liveInspMaster.summary_deduction_amount ||
      ((Number(liveInspMaster.deduction_rate) || 0) * (Number(liveInspMaster.deduction_qty) || 1)) ||
      0
    );
    if (fallbackAmt > 0) {
      totalDeductionsAndPenalties = Number(fallbackAmt.toFixed(2));
      deductionSummaryText = String(liveInspMaster.deduction_type || liveInspMaster.summary_deduction_type || 'Deduction');
    }
  }

  // 3. Resolve Delivery Claim (-): Penalty = Weight (Quintals) × Delay Days × Rate (₹/Qtl/Day)
  let poDeliveryToDate = String(
    po?.delivery_to || po?.delivery_gt_to || po?.shipment_date || po?.delivery_to_date || ''
  ).trim();
  let deliveryPenaltyRate = Number(po?.delivery_penalty || po?.shipment_penalty || 0);

  // Enrich from saudaCheckPoints or purchaseOrders if missing
  if ((!poDeliveryToDate || deliveryPenaltyRate <= 0) && cleanPoNo) {
    const upperPo = cleanPoNo.toUpperCase();
    const matchInList = (list: any[]) =>
      list.find(item => {
        const k1 = String(item.po_no || '').trim().replace(/^#/, '').toUpperCase();
        const k2 = String(item.ptf_no || '').trim().replace(/^#/, '').toUpperCase();
        const k3 = String(item.sauda_no || '').trim().replace(/^#/, '').toUpperCase();
        const k4 = String(item.contract_po_no || '').trim().replace(/^#/, '').toUpperCase();
        return k1 === upperPo || k2 === upperPo || k3 === upperPo || k4 === upperPo;
      });

    const scpMatch = matchInList(saudaCheckPoints);
    const poMatch = matchInList(purchaseOrders);

    if (!poDeliveryToDate) {
      poDeliveryToDate = String(
        scpMatch?.delivery_to ||
        scpMatch?.delivery_gt_to ||
        scpMatch?.shipment_date ||
        scpMatch?.delivery_to_date ||
        poMatch?.delivery_to ||
        poMatch?.delivery_gt_to ||
        poMatch?.shipment_date ||
        poMatch?.delivery_to_date ||
        ''
      ).trim();
    }
    if (deliveryPenaltyRate <= 0) {
      deliveryPenaltyRate = Number(
        scpMatch?.delivery_penalty ||
        scpMatch?.shipment_penalty ||
        poMatch?.delivery_penalty ||
        poMatch?.shipment_penalty ||
        0
      );
    }

    if ((!poDeliveryToDate || deliveryPenaltyRate <= 0) && supabase) {
      try {
        const { data: scpDb } = await supabase
          .from('sauda_check_point')
          .select('delivery_to, shipment_date, delivery_penalty, shipment_penalty')
          .or(`po_no.eq."${cleanPoNo}",po_no.eq."#${cleanPoNo}",ptf_no.eq."${cleanPoNo}",sauda_no.eq."${cleanPoNo}"`)
          .limit(1)
          .maybeSingle();
        if (scpDb) {
          if (!poDeliveryToDate) {
            poDeliveryToDate = String(scpDb.delivery_to || scpDb.shipment_date || '').trim();
          }
          if (deliveryPenaltyRate <= 0) {
            deliveryPenaltyRate = Number(scpDb.delivery_penalty || scpDb.shipment_penalty || 0);
          }
        }
        if (!poDeliveryToDate || deliveryPenaltyRate <= 0) {
          const { data: pmDb } = await supabase
            .from('purchase_master')
            .select('delivery_to, delivery_gt_to, shipment_date, delivery_penalty, shipment_penalty')
            .or(`po_no.eq."${cleanPoNo}",po_no.eq."#${cleanPoNo}",contract_po_no.eq."${cleanPoNo}"`)
            .limit(1)
            .maybeSingle();
          if (pmDb) {
            if (!poDeliveryToDate) {
              poDeliveryToDate = String(pmDb.delivery_to || pmDb.delivery_gt_to || pmDb.shipment_date || '').trim();
            }
            if (deliveryPenaltyRate <= 0) {
              deliveryPenaltyRate = Number(pmDb.delivery_penalty || pmDb.shipment_penalty || 0);
            }
          }
        }
      } catch (e) {
        console.warn('Error fetching PO delivery dates/penalty from Supabase:', e);
      }
    }
  }

  // Resolve arrivalDate from arrival / temporary_material_received / final_arrival
  let arrivalDate = String(
    arrival?.date ||
    arrival?.arrival_date ||
    arrival?.voucher_date ||
    liveInspMaster?.arrival_date ||
    liveInspMaster?.date ||
    ''
  ).trim();

  if (!arrivalDate && mrCandidateKeys.length > 0 && supabase) {
    try {
      const orClauses = mrCandidateKeys
        .flatMap(k => [
          `mr_no.eq.${k}`,
          `final_arrival_no.eq.${k}`,
          `arrival_no.eq.${k}`,
          `temporary_arrival_no.eq.${k}`
        ])
        .join(',');
      const { data: faData } = await supabase
        .from('final_arrival')
        .select('date, arrival_date, temporary_arrival_no')
        .or(orClauses)
        .limit(1)
        .maybeSingle();
      if (faData && (faData.date || faData.arrival_date)) {
        arrivalDate = String(faData.date || faData.arrival_date).trim();
      }
      if (!arrivalDate) {
        const tempOrClauses = mrCandidateKeys
          .flatMap(k => [`temporary_arrival_no.eq.${k}`, `amad_no.eq.${k}`, `arrival_no.eq.${k}`])
          .join(',');
        const { data: tmrData } = await supabase
          .from('temporary_material_received')
          .select('date, arrival_date')
          .or(tempOrClauses)
          .limit(1)
          .maybeSingle();
        if (tmrData && (tmrData.date || tmrData.arrival_date)) {
          arrivalDate = String(tmrData.date || tmrData.arrival_date).trim();
        }
      }
    } catch (e) {
      console.warn('Error fetching arrival date from final_arrival/temporary_material_received:', e);
    }
  }

  // Resolve weight in Quintals
  const colsWtMt = cols.reduce((sum, c) => sum + getColWtMt(c), 0);
  let weightQtl = 0;
  if (colsWtMt > 0) {
    weightQtl = Math.round(colsWtMt * 10 * 100) / 100;
  } else if (arrival || liveInspMaster) {
    const src = arrival || liveInspMaster;
    const rawQtl = Number(src.weight_qtl || 0);
    if (rawQtl > 0) {
      weightQtl = Math.round(rawQtl * 100) / 100;
    } else {
      const rawWt = Number(
        src.electronic_net_weight ||
        src.challan_material_weight ||
        src.supplier_net_weight ||
        src.net_weight ||
        src.weight_mt ||
        0
      );
      if (rawWt > 0) {
        let mt = rawWt;
        if (rawWt > 500) mt = rawWt / 1000;
        else if (rawWt > 50) mt = rawWt / 10;
        weightQtl = Math.round(mt * 10 * 100) / 100;
      }
    }
  }

  const deliveryDelayDays = calculateDeliveryDelayDays(poDeliveryToDate, arrivalDate);
  let deliveryClaim = calculateDeliveryClaimPenalty(weightQtl, deliveryDelayDays, deliveryPenaltyRate);

  if (
    deliveryClaim === 0 &&
    arrival?.summary_delivery_claim &&
    Number(arrival.summary_delivery_claim) > 0 &&
    Number(arrival.summary_delivery_claim) !== 5550
  ) {
    deliveryClaim = Number(arrival.summary_delivery_claim);
  }

  return {
    deliveryClaim,
    deliveryDelayDays,
    deliveryPenaltyRate,
    weightQtl,
    poDeliveryToDate,
    arrivalDate,
    totalDeductionsAndPenalties,
    deductionSummaryText,
    extraAndShort
  };
}

export const getColWtMt = (col?: PaymentDetailColumn): number => {
  if (!col) return 0;
  const arrWt = Number(col.arr_qty_wt) || 0;
  if (arrWt > 0) return arrWt;
  const wtQty = Number(col.wt_quantity) || 0;
  if (wtQty > 0) return wtQty;
  const qty = Number(col.quantity) || 0;
  const phota = Number(col.wt_phota) || 0;
  if (qty > 0 && phota > 0) return qty * phota;
  return 0;
};

// Quantity (Qtl) = Weight (MT) * 10
export const getColQtyQtl = (col?: PaymentDetailColumn): number => {
  const wtMt = getColWtMt(col);
  return Number((wtMt * 10).toFixed(3));
};

// Sett (%) - Populated from Inspection Details Grade Down % Claim (gd_claim), Mill Sett -> Gr. Down percentage (gd_sett), or user edited sett_pct
export const getColSettPct = (col?: PaymentDetailColumn): number => {
  if (!col) return 0;
  if (col.sett_pct !== undefined && col.sett_pct !== null && String(col.sett_pct).trim() !== '' && !isNaN(Number(col.sett_pct)) && Number(col.sett_pct) >= 0) {
    return Number(col.sett_pct);
  }
  if (col.gd_claim !== undefined && col.gd_claim !== null && !isNaN(Number(col.gd_claim)) && Number(col.gd_claim) > 0) {
    return Number(col.gd_claim);
  }
  if (col.gd_sett !== undefined && col.gd_sett !== null && !isNaN(Number(col.gd_sett)) && Number(col.gd_sett) > 0) {
    return Number(col.gd_sett);
  }
  return 0;
};

// Deduction (₹/Qtl) - Calculated from Sauda Check Point / PO Items Table Matrix (Grade Down calculation):
// Formula: Deduction (₹/Qtl) = (Rate of Contracted Grade − Rate of Lower Grade) * (Sett % / 100)
// Example: TD5 (13500) down to TD6 (13300) = (13500 - 13300) * 40% = ₹80.00/Qtl
// Example: TD6 (13300) down to TD7 (13000) = (13300 - 13000) * 50% = ₹150.00/Qtl
export const getColDeductionResult = (col?: PaymentDetailColumn, dbDiffs?: any[], poItemsList?: any[]) => {
  if (!col) {
    return {
      deduction: 0,
      gradeDiff: 0,
      currentGrade: '',
      lowerGrade: null,
      currentDiff: 0,
      lowerDiff: 0,
      settPct: 0,
      origRate: 0,
      settRate: 0,
      explanation: ''
    };
  }
  return calculateSattaDeduction(col, dbDiffs, undefined, poItemsList || col.po_items);
};

export const getColDeduction = (col?: PaymentDetailColumn, dbDiffs?: any[], poItemsList?: any[]): number => {
  if (!col) return 0;
  const settPct = getColSettPct(col);
  if (settPct <= 0 && (!col.deduction_rate || col.deduction_rate <= 0)) return 0;
  if (settPct <= 0 && col.deduction_rate && col.deduction_rate > 0) return Number(col.deduction_rate);
  const res = calculateSattaDeduction(col, dbDiffs, undefined, poItemsList || col.po_items);
  if (res.deduction <= 0 && col.deduction_rate && Number(col.deduction_rate) > 0) {
    return Number(col.deduction_rate);
  }
  return res.deduction;
};

// Formatted explanation for Grade Down deduction tooltips
export const getColDeductionExplanation = (col?: PaymentDetailColumn, dbDiffs?: any[], poItemsList?: any[]): string => {
  if (!col) return '';
  const res = calculateSattaDeduction(col, dbDiffs, undefined, poItemsList || col.po_items);
  return res.explanation;
};

// Sett Rate (₹/Qtl) = Original Rate (₹/Qtl) + Premium (₹/Qtl) − Deduction (₹/Qtl)
export const getColSettRate = (col?: PaymentDetailColumn, dbDiffs?: any[], poItemsList?: any[]): number => {
  if (!col) return 0;
  const origRate = Number(col.rate_value) || 0;
  const premium = Number(col.premium) || 0;
  const deduction = getColDeduction(col, dbDiffs, poItemsList);
  return Math.max(0, Number((origRate + premium - deduction).toFixed(2)));
};

// Amount (₹) = Quantity (Qtl) * Sett Rate (₹/Qtl)
export const getColAmount = (col?: PaymentDetailColumn, dbDiffs?: any[], poItemsList?: any[]): number => {
  if (!col) return 0;
  const qtyQtl = getColQtyQtl(col);
  const settRate = getColSettRate(col, dbDiffs, poItemsList);
  if (qtyQtl <= 0 || settRate <= 0) return 0;
  return Number((qtyQtl * settRate).toFixed(2));
};

// Robust helper to parse grid_details / items from string or array or object
export const parseGridOrItems = (raw: any): any[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    if (raw === 'undefined' || raw === 'null' || !raw.trim()) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === 'object') return [parsed];
    } catch (e) {
      return [];
    }
  }
  if (typeof raw === 'object') return [raw];
  return [];
};

// Finds the PO item that strictly corresponds to the given column by Grade code, Grade name, and Agency
export const findMatchedPoItem = (
  col: { grade?: string; agency?: string; area?: string; stock_grade_code?: string },
  poItems: any[],
  masters?: { gradeMasters?: any[]; agencyMasters?: any[] }
): any | null => {
  if (!poItems || poItems.length === 0) return null;

  const colGradeRaw = String(col.grade || '').trim();
  if (!colGradeRaw && !col.stock_grade_code) return null;

  const colAgencyRaw = String(col.agency || '').trim().toUpperCase();
  const colGradeUpper = colGradeRaw.toUpperCase();
  const colGradeNorm = colGradeUpper.replace(/[\s\-_]/g, '');

  const gradeMasters = masters?.gradeMasters || [];

  // Find all candidate names and codes for the column's grade from grade masters
  const colMatchedMasters = gradeMasters.filter(g => {
    const gCode = String(g.grade_code || g.code || g.id || '').trim().toUpperCase();
    const gName = String(g.grade_name || g.name || '').trim().toUpperCase();
    const gNameNorm = gName.replace(/[\s\-_]/g, '');
    return (
      (gCode && (gCode === colGradeUpper || gCode === colGradeNorm)) ||
      (gName && (gName === colGradeUpper || gNameNorm === colGradeNorm)) ||
      (colGradeRaw && String(g.id || '') === colGradeRaw)
    );
  });

  const colNames = new Set<string>();
  const colCodes = new Set<string>();

  if (colGradeUpper) colNames.add(colGradeUpper);
  if (colGradeNorm) colNames.add(colGradeNorm);
  if (col.stock_grade_code) colCodes.add(String(col.stock_grade_code).trim().toUpperCase());

  colMatchedMasters.forEach(g => {
    const gCode = String(g.grade_code || g.code || g.id || '').trim().toUpperCase();
    const gName = String(g.grade_name || g.name || '').trim().toUpperCase();
    const gNameNorm = gName.replace(/[\s\-_]/g, '');
    if (gCode) colCodes.add(gCode);
    if (gName) colNames.add(gName);
    if (gNameNorm) colNames.add(gNameNorm);
  });

  let bestMatch: any = null;
  let bestScore = 0;

  for (const p of poItems) {
    const pCode = String(p.grade_code || p.stock_grade_code || p.receipt_grade_code || p.code || '').trim().toUpperCase();
    const pName = String(p.grade_name || p.grade || p.arrival_grade || p.stock_grade_name || '').trim().toUpperCase();
    const pNameNorm = pName.replace(/[\s\-_]/g, '');

    // Check against masters for PO item
    const pMatchedMasters = gradeMasters.filter(g => {
      const gCode = String(g.grade_code || g.code || g.id || '').trim().toUpperCase();
      const gName = String(g.grade_name || g.name || '').trim().toUpperCase();
      const gNameNorm = gName.replace(/[\s\-_]/g, '');
      return (
        (pCode && (gCode === pCode || String(g.id || '') === pCode)) ||
        (pName && (gName === pName || gNameNorm === pNameNorm))
      );
    });

    const pNames = new Set<string>();
    const pCodes = new Set<string>();

    if (pName) pNames.add(pName);
    if (pNameNorm) pNames.add(pNameNorm);
    if (pCode) pCodes.add(pCode);

    pMatchedMasters.forEach(g => {
      const gCode = String(g.grade_code || g.code || g.id || '').trim().toUpperCase();
      const gName = String(g.grade_name || g.name || '').trim().toUpperCase();
      const gNameNorm = gName.replace(/[\s\-_]/g, '');
      if (gCode) pCodes.add(gCode);
      if (gName) pNames.add(gName);
      if (gNameNorm) pNames.add(gNameNorm);
    });

    // Check for direct Grade match
    let isGradeMatch = false;

    // 1. Code match
    for (const c of colCodes) {
      if (c && pCodes.has(c)) {
        isGradeMatch = true;
        break;
      }
    }

    // 2. Name match
    if (!isGradeMatch) {
      for (const n of colNames) {
        if (n && pNames.has(n)) {
          isGradeMatch = true;
          break;
        }
      }
    }

    // 3. Fallback direct text comparison
    if (!isGradeMatch && colGradeNorm && pNameNorm && colGradeNorm === pNameNorm) {
      isGradeMatch = true;
    }
    if (!isGradeMatch && colGradeUpper && pCode && colGradeUpper === pCode) {
      isGradeMatch = true;
    }

    if (isGradeMatch) {
      let score = 10; // Base score for correct grade match

      // Agency matching bonus
      const pAgency = String(p.agency_name || p.agency || p.agency_code || '').trim().toUpperCase();
      if (colAgencyRaw && pAgency) {
        if (colAgencyRaw === pAgency || pAgency.includes(colAgencyRaw) || colAgencyRaw.includes(pAgency)) {
          score += 5;
        }
      }

      // Quantity/weight presence bonus if multiple identical grades exist
      if (Number(p.quantity || p.weight_mt || p.arr_qty_wt || 0) > 0) {
        score += 1;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = p;
      }
    }
  }

  return bestMatch;
};

// Maps raw items or grid details into 4-column breakdown matrix with master lookup resolution
export const mapItemsToDetailCols = (
  rawItems: any,
  defaultRate: number = 0,
  poHeader?: any,
  masters?: {
    gradeMasters?: any[];
    agencyMasters?: any[];
    areaMasters?: any[];
    markaMasters?: any[];
  }
): PaymentDetailColumn[] => {
  const newCols = [emptyDetailColumn(1), emptyDetailColumn(2), emptyDetailColumn(3), emptyDetailColumn(4)];
  const parsedItems = parseGridOrItems(rawItems);

  const gradeList = masters?.gradeMasters || [];
  const agencyList = masters?.agencyMasters || [];
  const areaList = masters?.areaMasters || [];
  const markaList = masters?.markaMasters || [];

  const resolveGrade = (item: any) => {
    const rawCode = item.stock_grade_name || item.grade_name || item.grade || item.arrival_grade || item.quality || item.grade_code || item.stock_grade_code || item.receipt_grade_code || poHeader?.grade_code || poHeader?.grade;
    if (rawCode !== undefined && rawCode !== null && String(rawCode).trim() !== '') {
      const codeStr = String(rawCode).trim();
      const codeUpper = codeStr.toUpperCase();

      const match = gradeList.find(g => {
        const gCode = String(g.grade_code || g.code || g.id || '').trim().toUpperCase();
        const gName = String(g.grade_name || g.name || '').trim().toUpperCase();
        return gCode === codeUpper || gName === codeUpper || String(g.id || '') === codeStr;
      });

      if (match) return match.grade_name || match.name || codeStr;
      return codeStr;
    }
    return '';
  };

  const resolveAgency = (item: any) => {
    const rawCode = item.agency_name || item.agency || item.agency_code || poHeader?.agency_name || poHeader?.agency || poHeader?.agency_code || poHeader?.purchase_unit_name;
    if (rawCode !== undefined && rawCode !== null && String(rawCode).trim() !== '') {
      const codeStr = String(rawCode).trim();
      const codeUpper = codeStr.toUpperCase();

      const match = agencyList.find(a => {
        const aCode = String(a.agency_code || a.code || a.id || '').trim().toUpperCase();
        const aName = String(a.agency_name || a.name || '').trim().toUpperCase();
        return aCode === codeUpper || aName === codeUpper || String(a.id || '') === codeStr;
      });

      if (match) return match.agency_name || match.name || codeStr;
      return codeStr;
    }
    return poHeader?.agency_name || poHeader?.purchase_unit_name || '';
  };

  const resolveArea = (item: any) => {
    const rawCode = item.area_name || item.area || item.area_code || poHeader?.area_code || poHeader?.area || poHeader?.area_name;
    if (rawCode !== undefined && rawCode !== null && String(rawCode).trim() !== '') {
      const codeStr = String(rawCode).trim();
      const codeUpper = codeStr.toUpperCase();

      const match = areaList.find(a => {
        const aCode = String(a.area_code || a.code || a.id || '').trim().toUpperCase();
        const aName = String(a.area_name || a.name || '').trim().toUpperCase();
        return aCode === codeUpper || aName === codeUpper || String(a.id || '') === codeStr;
      });

      if (match) return match.area_name || match.name || codeStr;
      return codeStr;
    }
    return poHeader?.area_name || poHeader?.area || '';
  };

  const resolveMarka = (item: any) => {
    const rawCode = item.marka_code || item.marka_name || item.marka_crop || item.challan_marka_code || item.marka || poHeader?.marka_code || poHeader?.marka;
    if (rawCode !== undefined && rawCode !== null && String(rawCode).trim() !== '') {
      const codeStr = String(rawCode).trim();
      const codeUpper = codeStr.toUpperCase();

      const match = markaList.find(m => {
        const mCode = String(m.marka_code || m.code || m.id || '').trim().toUpperCase();
        const mName = String(m.marka_name || m.name || '').trim().toUpperCase();
        return mCode === codeUpper || mName === codeUpper || String(m.id || '') === codeStr;
      });

      if (match) return match.marka_name || match.name || codeStr;
      return codeStr;
    }
    return item.crop_year || poHeader?.crop_year || '';
  };

  if (parsedItems.length === 0 && poHeader) {
    const grade = resolveGrade(poHeader);
    const agency = resolveAgency(poHeader);
    const area = resolveArea(poHeader);
    const marka = resolveMarka(poHeader);
    const qty = Number(poHeader.total_units || poHeader.units_per_lorry || poHeader.quantity || 0);
    const wt = Number(poHeader.total_contract_mt || poHeader.weight_mt || poHeader.weight_per_lorry || 0);
    const rate = Number(poHeader.b_rate || poHeader.rate_qntl || defaultRate || 0);

    if (grade || area || agency || qty > 0 || wt > 0) {
      const settPct = Number(poHeader.sett_pct ?? 0);
      const origRate = rate;
      const premium = Number(poHeader.premium || 0);
      const deductionRate = Number(((origRate * settPct) / 100).toFixed(2));
      const settRate = Math.max(0, Number((origRate + premium - deductionRate).toFixed(2)));
      const qtyQtl = Number((wt * 10).toFixed(3));
      const amount = Number((qtyQtl * settRate).toFixed(2));

      newCols[0] = {
        ...emptyDetailColumn(1),
        grade,
        area,
        agency,
        marka_crop: marka,
        quantity: qty,
        arr_qty_wt: wt,
        rate_value: rate,
        premium: premium,
        sett_pct: settPct,
        deduction_rate: deductionRate,
        sett_rate: settRate,
        quantity_qtl: qtyQtl,
        amount: amount
      };
      return newCols;
    }
  }

  parsedItems.forEach((item: any, idx: number) => {
    if (idx < 4) {
      const grade = resolveGrade(item);
      const agency = resolveAgency(item);
      const area = resolveArea(item);
      const marka = resolveMarka(item);
      const qty = Number(
        item.quantity !== undefined && item.quantity !== null && item.quantity !== ""
          ? item.quantity
          : (item.quantity_rcpt !== undefined && item.quantity_rcpt !== null && item.quantity_rcpt !== ''
              ? item.quantity_rcpt
              : (item.rcpt !== undefined && item.rcpt !== null && item.rcpt !== ''
                  ? item.rcpt
                  : (item.quantity_chln || item.qty || item.packets || item.units || item.total_units || 0)))
      );
      const wt = Number(
        item.final_receipt_wt !== undefined && item.final_receipt_wt !== null && item.final_receipt_wt !== ''
          ? item.final_receipt_wt
          : (item.netto_pnto !== undefined && item.netto_pnto !== null && item.netto_pnto !== ''
              ? item.netto_pnto
              : (item.netto !== undefined && item.netto !== null && item.netto !== ''
                  ? item.netto
                  : (item.netto_mt !== undefined && item.netto_mt !== null && item.netto_mt !== ''
                      ? item.netto_mt
                      : (item.arr_qty_wt || item.weight_mt || item.weight || item.receipt_gross_wt || item.challan_gross_wt || item.total_wt_in_ton || (item.weight_qtl ? Number(item.weight_qtl) / 10 : 0)))))
      );
      const rate = Number(item.rate_per_mt || item.rate_mt || item.rate_qntl || item.rate || item.rate_value || poHeader?.b_rate || defaultRate || 0);
      const premium = Number(item.premium ?? item.prem ?? item.premium_amount ?? poHeader?.premium ?? 0);

      const gdClaim = Number(item.gd_claim ?? item.grade_down_claim ?? item.claim_grade_down ?? item.claim_gr_down ?? item.grade_down_act ?? item.actual_grade_down ?? 0);
      const gdSett = Number(item.gd_sett ?? item.settlement_grade_down ?? item.grade_down_sett ?? item.mill_sett_gr_down ?? 0);
      
      let settPct = 0;
      if (item.sett_pct !== undefined && item.sett_pct !== null && item.sett_pct !== "" && !isNaN(Number(item.sett_pct)) && Number(item.sett_pct) > 0) {
        settPct = Number(item.sett_pct);
      } else if (gdClaim > 0) {
        settPct = gdClaim;
      } else if (gdSett > 0) {
        settPct = gdSett;
      } else if (item.sett_pct !== undefined && item.sett_pct !== null && item.sett_pct !== "" && !isNaN(Number(item.sett_pct))) {
        settPct = Number(item.sett_pct);
      }

      const origRate = rate;
      const colCandidate: PaymentDetailColumn = {
        ...emptyDetailColumn(idx + 1),
        grade,
        area,
        agency,
        marka_crop: marka,
        rate_value: origRate,
        premium: premium,
        sett_pct: settPct,
        gd_claim: gdClaim,
        gd_sett: gdSett,
        arr_qty_wt: wt,
        quantity: qty
      };
      const calculatedDed = getColDeduction(colCandidate);
      const deductionRate = (settPct > 0 || calculatedDed > 0)
        ? calculatedDed
        : Number(item.deduction_rate !== undefined && item.deduction_rate !== null && item.deduction_rate !== "" ? item.deduction_rate : 0);
      const settRate = Math.max(0, Number((origRate + premium - deductionRate).toFixed(2)));
      const qtyQtl = Number((wt * 10).toFixed(3));
      const amount = Number((qtyQtl * settRate).toFixed(2));

      newCols[idx] = {
        ...emptyDetailColumn(idx + 1),
        grade,
        area,
        agency,
        marka_crop: marka,
        quantity: qty,
        arr_qty_wt: wt,
        rate_value: rate,
        premium: premium,
        sett_pct: settPct,
        deduction_rate: deductionRate,
        sett_rate: settRate,
        quantity_qtl: qtyQtl,
        amount: amount,
        gd_claim: gdClaim,
        gd_sett: gdSett,
        moist_claim: Number(item.moist ?? item.moist_claim ?? item.moisture_claim ?? item.claim_moisture ?? 0),
        moist_sett: Number(item.moist_sett ?? item.settlement_moisture ?? item.moisture_sett ?? 0),
        dust_claim: Number(item.dust_claim ?? item.dust_claim ?? item.claim_dust ?? item.dust_act ?? 0),
        dust_sett: Number(item.dust_sett ?? item.settlement_dust ?? item.dust_sett ?? 0),
        ncv_claim: Number(item.ncv_claim ?? item.ncv_claim ?? item.claim_ncv ?? item.ncv_act ?? 0),
        ncv_sett: Number(item.ncv_sett ?? item.settlement_ncv ?? item.ncv_sett ?? 0),
        po_grade_claim: Number(item.po_grade_claim ?? item.delivery_claim ?? 0),
        po_grade_sett: Number(item.po_grade_sett ?? 0),
      };
    }
  });

  // Attach po_items and all_cols to all columns and accurately compute Grade Down deductions
  const activePoMatrix = poHeader?.items || poHeader?.po_items || (Array.isArray(rawItems) ? rawItems : []);
  newCols.forEach((col) => {
    col.all_cols = newCols;
    col.po_items = activePoMatrix;
    if (col.grade || col.arr_qty_wt > 0 || col.quantity > 0) {
      const ded = getColDeduction(col, undefined, activePoMatrix);
      col.deduction_rate = ded;
      const origRate = Number(col.rate_value) || 0;
      const prem = Number(col.premium) || 0;
      col.sett_rate = Math.max(0, Number((origRate + prem - ded).toFixed(2)));
      const qQtl = Number(((col.arr_qty_wt || 0) * 10).toFixed(3));
      col.quantity_qtl = qQtl;
      col.amount = Number((qQtl * col.sett_rate).toFixed(2));
    }
  });

  return newCols;
};

/* Helper to retrieve all verified arrivals / M.Rs linked to a specific P.O */
export function getLinkedMrsForPo(poOrPoNo: any, arrivalsList: any[] = []): any[] {
  if (!poOrPoNo || !arrivalsList || arrivalsList.length === 0) return [];

  const targetPoNo = typeof poOrPoNo === 'string'
    ? poOrPoNo
    : (poOrPoNo.po_no || poOrPoNo.new_po_no || poOrPoNo.ptf_no || poOrPoNo.sauda_no || poOrPoNo.contract_po_no || '');
  const boundMrNo = typeof poOrPoNo === 'object' ? String(poOrPoNo.mr_no || '').trim().toUpperCase() : '';

  const cleanTarget = String(targetPoNo).trim().toUpperCase().replace(/^#+/, '').trim();
  if (!cleanTarget || cleanTarget === 'N/A') return [];

  const cleanTargetNoPtf = cleanTarget.replace(/\(PTF\)/gi, '').trim();
  const targetSuffix = cleanTarget.split('/').pop()?.replace(/^#+/, '').replace(/\(PTF\)/gi, '').trim() || '';
  const targetDigits = cleanTarget.replace(/[^0-9]/g, '');

  return arrivalsList.filter(arr => {
    const arrMr = String(arr.mr_no || arr.final_arrival_no || arr.arrival_no || '').trim().toUpperCase();
    if (boundMrNo && arrMr && arrMr === boundMrNo) return true;

    const arrPo1 = String(arr.po_no || '').trim().toUpperCase().replace(/^#+/, '').trim();
    const arrPo2 = String(arr.mill_po_no || '').trim().toUpperCase().replace(/^#+/, '').trim();
    const arrPo3 = String(arr.contract_po_no || arr.sauda_no || arr.po_contract || '').trim().toUpperCase().replace(/^#+/, '').trim();
    const arrPo4 = String(arr.return_po_no || '').trim().toUpperCase().replace(/^#+/, '').trim();
    
    const candidates = [arrPo1, arrPo2, arrPo3, arrPo4].filter(Boolean);
    for (const cand of candidates) {
      const candNoPtf = cand.replace(/\(PTF\)/gi, '').trim();
      if (cand === cleanTarget || candNoPtf === cleanTargetNoPtf) return true;
      if (cand.includes(cleanTarget) || cleanTarget.includes(cand)) return true;
      if (candNoPtf.includes(cleanTargetNoPtf) || cleanTargetNoPtf.includes(candNoPtf)) return true;

      const candSuffix = cand.split('/').pop()?.replace(/^#+/, '').replace(/\(PTF\)/gi, '').trim() || '';
      if (targetSuffix.length >= 3 && (candSuffix === targetSuffix || candSuffix.includes(targetSuffix) || targetSuffix.includes(candSuffix))) {
        return true;
      }
      if (targetDigits.length >= 3) {
        const candDigits = cand.replace(/[^0-9]/g, '');
        if (candDigits === targetDigits || (candDigits.length >= 3 && (candDigits.endsWith(targetDigits) || targetDigits.endsWith(candDigits)))) {
          return true;
        }
      }
    }
    return false;
  });
}

/* Helper to verify if an M.R has already been processed in payment_master */
export function isMrAlreadyProcessed(
  mrNoOrArrival: string | any,
  paymentList: any[],
  currentVoucherNo?: string,
  poNo?: string
): { isPaid: boolean; paidPayment?: any } {
  if (!mrNoOrArrival || !paymentList || paymentList.length === 0) {
    return { isPaid: false };
  }

  const mrStr = typeof mrNoOrArrival === 'string'
    ? mrNoOrArrival
    : (mrNoOrArrival.mr_no || mrNoOrArrival.final_arrival_no || mrNoOrArrival.arrival_no || mrNoOrArrival.temporary_arrival_no || '');
  
  const cleanMr = String(mrStr).trim().toUpperCase();
  if (!cleanMr || cleanMr === 'N/A') {
    return { isPaid: false };
  }

  const cleanPo = poNo
    ? String(poNo).trim().toUpperCase()
    : (typeof mrNoOrArrival === 'object' ? String(mrNoOrArrival.po_no || mrNoOrArrival.mill_po_no || '').trim().toUpperCase() : '');

  const matchedPayment = paymentList.find(p => {
    // If editing, ignore current voucher
    if (currentVoucherNo && String(p.voucher_no || '').trim().toUpperCase() === String(currentVoucherNo).trim().toUpperCase()) {
      return false;
    }

    // Exclude cancelled or rejected payments
    const pStatus = String(p.status || '').toLowerCase().trim();
    if (pStatus === 'cancelled' || pStatus === 'rejected') {
      return false;
    }

    const pMr = String(p.mr_no || p.arrival_no || '').trim().toUpperCase();
    if (!pMr) return false;

    // Direct MR match
    const isMrMatch = pMr === cleanMr;

    if (isMrMatch) {
      if (cleanPo) {
        const pPo = String(p.po_no || '').trim().toUpperCase();
        if (pPo) {
          const pPoSuffix = pPo.split('/').pop()?.replace(/\(PTF\)/gi, '').trim() || '';
          const cleanPoSuffix = cleanPo.split('/').pop()?.replace(/\(PTF\)/gi, '').trim() || '';
          if (pPo === cleanPo || pPo.includes(cleanPo) || cleanPo.includes(pPo) || (cleanPoSuffix.length >= 3 && pPoSuffix === cleanPoSuffix)) {
            return true;
          }
        }
      }
      return true;
    }

    return false;
  });

  return {
    isPaid: Boolean(matchedPayment),
    paidPayment: matchedPayment
  };
}

/* Helper to evaluate if a P.O is eligible for payment based on both P.O status AND remaining unpaid M.R records */
export function isPoEligibleForPayment(
  po: any,
  arrivalsList: any[] = [],
  paymentsList: any[] = [],
  currentVoucherNo?: string
): boolean {
  if (!po) return false;

  const isReturnLorryPo = Boolean(po.is_return_lorry || po.source_table === 'return_lorry' || String(po.status || '').toUpperCase() === 'RETURN_LORRY');
  const statusStr = String(po.status || '').toLowerCase().trim();
  const passMismatchStr = String(po.pass_mismatch || po.pass_status || po.mismatch_status || po.quality_status || '').toUpperCase().trim();
  
  const isCompleted = isReturnLorryPo || (statusStr === 'completed' || statusStr === 'closed' || statusStr === 'final' || statusStr === 'moved_to_final' || statusStr === 'settled' || statusStr === 'active' || (po.ptf_no && String(po.ptf_no).trim() && String(po.ptf_no).trim() !== 'N/A'));
  
  let isPass = isReturnLorryPo;
  if (passMismatchStr === 'PASS') isPass = true;
  else if (po.mismatch_cleared === true || String(po.mismatch_cleared) === 'true') isPass = true;
  else if (po.satta_dispute_approved === true || String(po.satta_dispute_approved) === 'true') isPass = true;
  else if (statusStr === 'final' || statusStr === 'moved_to_final' || statusStr === 'completed' || statusStr === 'settled') isPass = true;
  else if (po.ptf_no && String(po.ptf_no).trim() && String(po.ptf_no).trim() !== 'N/A') isPass = true;
  else if (statusStr !== 'mismatch' && statusStr !== 'dispute' && po.mismatch_cleared !== false) isPass = true;

  if (!isCompleted || !isPass) {
    return false;
  }

  const poNo = String(po.po_no || po.ptf_no || po.sauda_no || po.contract_po_no || '').trim().toUpperCase();

  // Step 1: Find all verified M.R records linked with this P.O
  const linkedMrs = getLinkedMrsForPo(po, arrivalsList);

  if (linkedMrs.length > 0) {
    // Step 2 & 3: Check each M.R against payment_master and exclude paid ones
    const unpaidMrs = linkedMrs.filter(mr => {
      const check = isMrAlreadyProcessed(mr, paymentsList, currentVoucherNo, poNo);
      return !check.isPaid;
    });

    // Step 4: If remaining eligible M.R. count > 0 -> Show P.O (Eligible: true)
    return unpaidMrs.length > 0;
  }

  // If no arrivals linked in the list yet, check if a completed payment exists for this P.O
  if (paymentsList && paymentsList.length > 0 && poNo) {
    const directPayment = paymentsList.find(p => {
      if (currentVoucherNo && String(p.voucher_no || '').trim().toUpperCase() === String(currentVoucherNo).trim().toUpperCase()) {
        return false;
      }
      const pStatus = String(p.status || '').toLowerCase().trim();
      if (pStatus === 'cancelled' || pStatus === 'rejected') return false;

      const pPo = String(p.po_no || '').trim().toUpperCase();
      if (pPo === poNo) return true;
      const pPoSuffix = pPo.split('/').pop() || '';
      const poSuffix = poNo.split('/').pop() || '';
      return (poSuffix.length >= 3 && pPoSuffix === poSuffix);
    });

    if (directPayment) {
      return false;
    }
  }

  return true;
}
