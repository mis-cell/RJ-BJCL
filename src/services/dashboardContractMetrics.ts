import {
  UnifiedContractRecord,
  MonthSummary,
  DashboardMetricsResult,
  ComputeDashboardMetricsParams
} from '../types/dashboardCalculation.types';
import {
  normalizePoRef,
  getPoSuffix,
  getCanonicalPoKey,
  parseRecordDate,
  MONTH_NAMES
} from './dashboardCalculationHelpers';

/**
 * Calculates all unified dashboard metrics from live database datasets
 */
export function computeDashboardMetrics(params: {
  saudaCheckPoints?: any[];
  saudaCheckPointDetails?: any[];
  purchaseOrders?: any[]; // purchase_master
  purchaseOrderDetails?: any[]; // purchase_detail_master
  temporaryArrivals?: any[]; // temporary_material_received / amad
  finalArrivals?: any[]; // final_arrival
  paymentRecords?: any[]; // payment_master
  openingStocks?: any[];
  millIssueMasters?: any[];
  millIssueDetails?: any[];
  selectedYear?: number;
}): DashboardMetricsResult {
  const {
    saudaCheckPoints = [],
    saudaCheckPointDetails = [],
    purchaseOrders = [],
    purchaseOrderDetails = [],
    temporaryArrivals = [],
    finalArrivals = [],
    paymentRecords = [],
    openingStocks = [],
    millIssueMasters = [],
    millIssueDetails = [],
    selectedYear: requestedYear
  } = params;

  // 1. Build map of SCP details keyed by PO number
  const scpDetailsMap = new Map<string, any[]>();
  (saudaCheckPointDetails || []).forEach(d => {
    const k = normalizePoRef(d.po_no || d.contract_po_no || d.sauda_no);
    if (k) {
      if (!scpDetailsMap.has(k)) scpDetailsMap.set(k, []);
      scpDetailsMap.get(k)!.push(d);
    }
  });

  // 2. Build map of PO details keyed by PO number
  const poDetailsMap = new Map<string, any[]>();
  (purchaseOrderDetails || []).forEach(d => {
    const k = normalizePoRef(d.po_no || d.contract_po_no || d.ptf_no);
    if (k) {
      if (!poDetailsMap.has(k)) poDetailsMap.set(k, []);
      poDetailsMap.get(k)!.push(d);
    }
  });

  // 3. Aggregate Temporary Arrival Records by Contract / PO reference
  // Extract all received weights against each PO reference
  const arrivalsByPo = new Map<string, { totalReceivedMt: number; count: number; records: any[] }>();
  
  const registerArrival = (rawRef: any, arrivalRec: any) => {
    if (!rawRef) return;
    const ref = normalizePoRef(rawRef);
    if (!ref) return;
    
    // Weight calculation
    const wtMt = Number(
      arrivalRec.electronic_net_weight || 
      arrivalRec.supplier_net_weight || 
      arrivalRec.challan_material_weight || 
      arrivalRec.weight_reduced || 
      (arrivalRec.weight_qtl ? Number(arrivalRec.weight_qtl) / 10 : 0) || 
      arrivalRec.weight || 
      0
    );

    if (!arrivalsByPo.has(ref)) {
      arrivalsByPo.set(ref, { totalReceivedMt: 0, count: 0, records: [] });
    }
    const entry = arrivalsByPo.get(ref)!;
    entry.totalReceivedMt += wtMt;
    entry.count += 1;
    entry.records.push(arrivalRec);

    // Also index by suffix if long format (e.g. 0401)
    const suffix = getPoSuffix(ref);
    if (suffix && suffix !== ref && suffix.length >= 3) {
      if (!arrivalsByPo.has(suffix)) {
        arrivalsByPo.set(suffix, entry);
      }
    }
  };

  // Process Temporary Arrivals
  (temporaryArrivals || []).forEach(ar => {
    registerArrival(ar.po_no, ar);
    registerArrival(ar.contract_po_no, ar);
    registerArrival(ar.sauda_no, ar);
    registerArrival(ar.ptf_no, ar);
    registerArrival(ar.bill_challan_no, ar);
  });

  // Also include Final Arrival if not already counted
  (finalArrivals || []).forEach(fa => {
    registerArrival(fa.po_no, fa);
    registerArrival(fa.contract_po_no, fa);
    registerArrival(fa.sauda_no, fa);
    registerArrival(fa.ptf_no, fa);
  });

  // 4. Aggregate Payment Records from `payment_master`
  // Map payments by PO reference
  const paymentsByPo = new Map<string, { totalPayable: number; totalPaid: number; vouchers: string[]; records: any[] }>();
  
  (paymentRecords || []).forEach(pay => {
    const status = String(pay.status || '').toLowerCase().trim();
    if (status === 'cancelled' || status === 'rejected') return;

    // Extract potential PO references
    const refs: string[] = [];
    if (pay.po_no) refs.push(normalizePoRef(pay.po_no));
    if (pay.sauda_no) refs.push(normalizePoRef(pay.sauda_no));
    if (pay.reference_no) {
      const refClean = normalizePoRef(pay.reference_no);
      if (refClean) refs.push(refClean);
    }
    if (pay.mr_no) refs.push(normalizePoRef(pay.mr_no));

    const payableVal = Number(pay.payable_amt || pay.total_amount || pay.net_amt || pay.value_amt || 0);
    const paidVal = Number(pay.paid_amount || 0);
    const vNo = pay.voucher_no || pay.payment_id || '';

    refs.filter(Boolean).forEach(r => {
      if (!paymentsByPo.has(r)) {
        paymentsByPo.set(r, { totalPayable: 0, totalPaid: 0, vouchers: [], records: [] });
      }
      const pEntry = paymentsByPo.get(r)!;
      pEntry.totalPayable += payableVal;
      pEntry.totalPaid += paidVal;
      if (vNo && !pEntry.vouchers.includes(vNo)) {
        pEntry.vouchers.push(vNo);
      }
      pEntry.records.push(pay);

      const suffix = getPoSuffix(r);
      if (suffix && suffix !== r && suffix.length >= 3) {
        if (!paymentsByPo.has(suffix)) {
          paymentsByPo.set(suffix, pEntry);
        }
      }
    });
  });

  // 5. Unify all Contract records without double counting
  const unifiedContracts: UnifiedContractRecord[] = [];
  const processedContractKeys = new Set<string>();

  const getAllRecordKeys = (item: any): string[] => {
    if (!item) return [];
    const keys: string[] = [];
    const add = (val: any) => {
      if (!val) return;
      const str = String(val).trim();
      if (!str || /^n\/?a$/i.test(str) || /^undefined$/i.test(str) || /^null$/i.test(str) || str === '-') return;
      
      const clean = normalizePoRef(str);
      if (clean) {
        keys.push(clean);
        const canon = getCanonicalPoKey(str);
        if (canon) keys.push(canon);
        const suffix = getPoSuffix(clean);
        if (suffix) keys.push(suffix);
        const numOnly = suffix.replace(/[^0-9]/g, '');
        if (numOnly) keys.push(numOnly.padStart(4, '0'));
      }
    };

    add(item.po_no);
    add(item.contract_po_no);
    add(item.sauda_no);
    add(item.ptf_no);
    add(item.reference_no);
    add(item.bill_challan_no);
    if (item.id) {
      add(`SCP-${item.id}`);
      add(`PO-${item.id}`);
    }
    return Array.from(new Set(keys));
  };

  // A. Process Sauda Check Point Records
  (saudaCheckPoints || []).forEach(scp => {
    const itemKeys = getAllRecordKeys(scp);
    if (itemKeys.length > 0 && itemKeys.some(k => processedContractKeys.has(k))) {
      return;
    }

    const rawNo = scp.po_no || scp.contract_po_no || scp.sauda_no || scp.session || `SCP-${scp.id}`;
    const cleanNo = normalizePoRef(rawNo) || itemKeys[0] || `SCP-${scp.id}`;
    itemKeys.forEach(k => processedContractKeys.add(k));
    if (cleanNo) processedContractKeys.add(cleanNo);

    // Month & Date Rule: Use Contract Date from Sauda Check Point
    const rawDate = scp.contract_date || scp.date || scp.s_date || scp.b_date || scp.created_at;
    const { dateStr, year, month } = parseRecordDate(rawDate);

    // Calculate weight & value
    const details = scpDetailsMap.get(cleanNo) || [];
    let detWt = 0;
    let detVal = 0;
    let detUnits = 0;
    details.forEach(d => {
      const w = Number(d.weight_mt || 0);
      const q = Number(d.quantity || 0);
      const r = Number(d.rate_qntl || 0);
      detWt += w;
      detUnits += q;
      detVal += (w * 10 * r);
    });

    const totalWeightMt = detWt > 0 
      ? Number(detWt.toFixed(2)) 
      : Number((Number(scp.total_contract_mt || scp.total_wt_in_ton || scp.weight || 0)).toFixed(2));
    
    const baseRate = Number(scp.b_rate || scp.rate || (details[0]?.rate_qntl) || 5800);
    const contractVal = detVal > 0 
      ? Number(detVal.toFixed(2)) 
      : Number((totalWeightMt * 10 * (baseRate > 0 ? baseRate : 5800)).toFixed(2));

    const totalUnits = detUnits > 0 
      ? detUnits 
      : Number(scp.total_units || scp.total_unit || scp.units_per_lorry || Math.round(totalWeightMt * 10 * 0.55));

    // Determine type: Sauda or PTF
    const isPtf = Boolean(
      scp.is_ptf || 
      (scp.ptf_no && String(scp.ptf_no).trim() && String(scp.ptf_no).trim().toUpperCase() !== 'N/A') ||
      String(scp.po_type || '').toUpperCase() === 'PTF' ||
      cleanNo.startsWith('PTF') ||
      cleanNo.includes('(PTF)')
    );

    // Check Temporary Arrival for Pending Status
    const arrivalInfo = arrivalsByPo.get(cleanNo) || arrivalsByPo.get(getPoSuffix(cleanNo)) || { totalReceivedMt: 0, count: 0, records: [] };
    const rcvdWt = Number(arrivalInfo.totalReceivedMt.toFixed(2));
    
    let arrivalStatus: 'RECEIVED' | 'PENDING' | 'PARTIAL' = 'PENDING';
    let pendingWeightMt = totalWeightMt;

    if (arrivalInfo.count > 0 || rcvdWt > 0) {
      if (totalWeightMt > 0 && rcvdWt >= (totalWeightMt - 0.05)) {
        arrivalStatus = 'RECEIVED';
        pendingWeightMt = 0;
      } else {
        arrivalStatus = 'PARTIAL';
        pendingWeightMt = Math.max(0, Number((totalWeightMt - rcvdWt).toFixed(2)));
      }
    } else {
      arrivalStatus = 'PENDING';
      pendingWeightMt = totalWeightMt;
    }

    // Check Payment Information
    const payInfo = paymentsByPo.get(cleanNo) || paymentsByPo.get(getPoSuffix(cleanNo));
    const paidAmt = payInfo ? Number(payInfo.totalPaid.toFixed(2)) : 0;
    const payableVal = payInfo && payInfo.totalPayable > 0 ? Number(payInfo.totalPayable.toFixed(2)) : contractVal;
    const remainingAmt = Math.max(0, Number((payableVal - paidAmt).toFixed(2)));
    
    let paymentStatus: 'PAID' | 'PARTIALLY_PAID' | 'PENDING' | 'OVERPAID' = 'PENDING';
    if (paidAmt >= payableVal && payableVal > 0) {
      paymentStatus = 'PAID';
    } else if (paidAmt > 0 && paidAmt < payableVal) {
      paymentStatus = 'PARTIALLY_PAID';
    } else if (paidAmt > payableVal && payableVal > 0) {
      paymentStatus = 'OVERPAID';
    } else {
      paymentStatus = 'PENDING';
    }

    unifiedContracts.push({
      id: scp.id || `SCP-${cleanNo}`,
      contractNo: rawNo,
      cleanContractNo: cleanNo,
      contractType: isPtf ? 'PTF' : 'SAUDA',
      contractDate: dateStr,
      year,
      month,
      monthName: MONTH_NAMES[month] || 'Unknown',
      supplier: String(scp.supplier || scp.supplier_name || scp.party_name || 'N/A').toUpperCase(),
      broker: String(scp.broker || scp.broker_name || 'N/A').toUpperCase(),
      area: scp.area || scp.area_name || '',
      purchaseUnit: scp.purchase_unit_name || scp.unit_type || 'BALES',
      totalUnits,
      totalWeightMt,
      ratePerQtl: baseRate,
      contractValue: contractVal,
      arrivalStatus,
      receivedWeightMt: rcvdWt,
      pendingWeightMt,
      arrivalRecordsCount: arrivalInfo.count,
      payableValue: payableVal,
      paidAmount: paidAmt,
      remainingAmount: remainingAmt,
      paymentStatus,
      voucherNos: payInfo ? payInfo.vouchers : [],
      rawRecord: scp
    });
  });

  // B. Process Final P.O. / P.T.F Records (`purchase_master`)
  (purchaseOrders || []).forEach(po => {
    const itemKeys = getAllRecordKeys(po);
    if (itemKeys.length > 0 && itemKeys.some(k => processedContractKeys.has(k))) {
      return;
    }

    const rawNo = po.po_no || po.ptf_no || po.contract_po_no || `PO-${po.id}`;
    const cleanNo = normalizePoRef(rawNo) || itemKeys[0] || `PO-${po.id}`;
    itemKeys.forEach(k => processedContractKeys.add(k));
    if (cleanNo) processedContractKeys.add(cleanNo);

    // Month & Date Rule: Use P.O. Date from Final P.O.
    const rawDate = po.po_date || po.date || po.contract_date || po.created_at;
    const { dateStr, year, month } = parseRecordDate(rawDate);

    // Calculate weight & value
    const details = poDetailsMap.get(cleanNo) || [];
    let detWt = 0;
    let detVal = 0;
    let detUnits = 0;
    details.forEach(d => {
      const w = Number(d.weight_mt || 0);
      const q = Number(d.quantity || 0);
      const r = Number(d.rate_qntl || 0);
      detWt += w;
      detUnits += q;
      detVal += (w * 10 * r);
    });

    const totalWeightMt = detWt > 0 
      ? Number(detWt.toFixed(2)) 
      : Number((Number(po.total_contract_mt || po.weight || 0)).toFixed(2));
    
    const baseRate = Number(po.b_rate || po.rate || (details[0]?.rate_qntl) || 5800);
    const contractVal = detVal > 0 
      ? Number(detVal.toFixed(2)) 
      : Number((totalWeightMt * 10 * (baseRate > 0 ? baseRate : 5800)).toFixed(2));

    const totalUnits = detUnits > 0 
      ? detUnits 
      : Number(po.total_units || po.total_unit || po.units_per_lorry || Math.round(totalWeightMt * 10 * 0.55));

    const isPtf = Boolean(
      po.is_ptf || 
      (po.ptf_no && String(po.ptf_no).trim() && String(po.ptf_no).trim().toUpperCase() !== 'N/A') ||
      String(po.po_type || '').toUpperCase() === 'PTF' ||
      cleanNo.startsWith('PTF') ||
      cleanNo.includes('(PTF)')
    );

    // Check Temporary Arrival for Pending Status
    const arrivalInfo = arrivalsByPo.get(cleanNo) || arrivalsByPo.get(getPoSuffix(cleanNo)) || { totalReceivedMt: 0, count: 0, records: [] };
    const rcvdWt = Number(arrivalInfo.totalReceivedMt.toFixed(2));
    
    let arrivalStatus: 'RECEIVED' | 'PENDING' | 'PARTIAL' = 'PENDING';
    let pendingWeightMt = totalWeightMt;

    if (arrivalInfo.count > 0 || rcvdWt > 0) {
      if (totalWeightMt > 0 && rcvdWt >= (totalWeightMt - 0.05)) {
        arrivalStatus = 'RECEIVED';
        pendingWeightMt = 0;
      } else {
        arrivalStatus = 'PARTIAL';
        pendingWeightMt = Math.max(0, Number((totalWeightMt - rcvdWt).toFixed(2)));
      }
    } else {
      arrivalStatus = 'PENDING';
      pendingWeightMt = totalWeightMt;
    }

    // Check Payment Information
    const payInfo = paymentsByPo.get(cleanNo) || paymentsByPo.get(getPoSuffix(cleanNo));
    const paidAmt = payInfo ? Number(payInfo.totalPaid.toFixed(2)) : 0;
    const payableVal = payInfo && payInfo.totalPayable > 0 ? Number(payInfo.totalPayable.toFixed(2)) : contractVal;
    const remainingAmt = Math.max(0, Number((payableVal - paidAmt).toFixed(2)));
    
    let paymentStatus: 'PAID' | 'PARTIALLY_PAID' | 'PENDING' | 'OVERPAID' = 'PENDING';
    if (paidAmt >= payableVal && payableVal > 0) {
      paymentStatus = 'PAID';
    } else if (paidAmt > 0 && paidAmt < payableVal) {
      paymentStatus = 'PARTIALLY_PAID';
    } else if (paidAmt > payableVal && payableVal > 0) {
      paymentStatus = 'OVERPAID';
    } else {
      paymentStatus = 'PENDING';
    }

    unifiedContracts.push({
      id: po.id || `PO-${cleanNo}`,
      contractNo: rawNo,
      cleanContractNo: cleanNo,
      contractType: isPtf ? 'PTF' : 'FINAL_PO',
      contractDate: dateStr,
      year,
      month,
      monthName: MONTH_NAMES[month] || 'Unknown',
      supplier: String(po.supplier || po.supplier_name || 'N/A').toUpperCase(),
      broker: String(po.broker || po.broker_name || 'N/A').toUpperCase(),
      area: po.area || '',
      purchaseUnit: po.purchase_unit_name || po.unit_type || 'BALES',
      totalUnits,
      totalWeightMt,
      ratePerQtl: baseRate,
      contractValue: contractVal,
      arrivalStatus,
      receivedWeightMt: rcvdWt,
      pendingWeightMt,
      arrivalRecordsCount: arrivalInfo.count,
      payableValue: payableVal,
      paidAmount: paidAmt,
      remainingAmount: remainingAmt,
      paymentStatus,
      voucherNos: payInfo ? payInfo.vouchers : [],
      rawRecord: po
    });
  });

  // 6. Compute Card 1: Total Sauda Check Point Summary
  let saudaContractsCount = 0;
  let saudaWeightMt = 0;
  let ptfContractsCount = 0;
  let ptfWeightMt = 0;

  unifiedContracts.forEach(c => {
    if (c.contractType === 'SAUDA') {
      saudaContractsCount++;
      saudaWeightMt += c.totalWeightMt;
    } else {
      ptfContractsCount++;
      ptfWeightMt += c.totalWeightMt;
    }
  });

  const totalContractsCount = saudaContractsCount + ptfContractsCount;
  const totalWeightMt = Number((saudaWeightMt + ptfWeightMt).toFixed(2));
  saudaWeightMt = Number(saudaWeightMt.toFixed(2));
  ptfWeightMt = Number(ptfWeightMt.toFixed(2));

  // 7. Compute Card 2: Pending Sauda
  let pendingSaudaCount = 0;
  let pendingSaudaWeightMt = 0;
  let pendingPtfCount = 0;
  let pendingPtfWeightMt = 0;

  unifiedContracts.forEach(c => {
    if (c.arrivalStatus === 'PENDING' || c.arrivalStatus === 'PARTIAL') {
      if (c.contractType === 'SAUDA') {
        pendingSaudaCount++;
        pendingSaudaWeightMt += c.pendingWeightMt;
      } else {
        pendingPtfCount++;
        pendingPtfWeightMt += c.pendingWeightMt;
      }
    }
  });

  const totalPendingContractsCount = pendingSaudaCount + pendingPtfCount;
  const totalPendingWeightMt = Number((pendingSaudaWeightMt + pendingPtfWeightMt).toFixed(2));
  pendingSaudaWeightMt = Number(pendingSaudaWeightMt.toFixed(2));
  pendingPtfWeightMt = Number(pendingPtfWeightMt.toFixed(2));

  // 8. Compute Top Payment Totals
  // Sourced strictly from Payment Operations and contract authoritativeness
  const totalPayableValue = Number((paymentRecords || []).reduce((sum, p) => {
    const status = String(p.status || '').toLowerCase().trim();
    if (status === 'cancelled' || status === 'rejected') return sum;
    return sum + Number(p.payable_amt || p.total_amount || p.net_amt || 0);
  }, 0).toFixed(2));

  const totalPaidAmount = Number((paymentRecords || []).reduce((sum, p) => {
    const status = String(p.status || '').toLowerCase().trim();
    if (status === 'cancelled' || status === 'rejected') return sum;
    return sum + Number(p.paid_amount || 0);
  }, 0).toFixed(2));

  const totalRemainingAmount = Math.max(0, Number((totalPayableValue - totalPaidAmount).toFixed(2)));
  const advancePaymentAmount = totalPaidAmount; // Advance payments are part of cleared payments

  // 9. Godown Stock Balance
  const totalOpeningQty = (openingStocks || []).reduce((sum: number, r: any) => sum + (Number(r.quantity || r.opening_balance || r.bales || 0) || 0), 0);
  const totalOpeningWt = (openingStocks || []).reduce((sum: number, r: any) => sum + (Number(r.weight || r.weight_qtl || 0) || 0), 0);

  const godownIssueNosSet = new Set(
    (millIssueMasters || [])
      .filter((m: any) => String(m.issue_type || '').trim().toUpperCase() === 'GODOWN')
      .map((m: any) => String(m.issue_no).trim().toUpperCase())
  );
  const totalIssuedToGodownBales = (millIssueDetails || [])
    .filter((d: any) => godownIssueNosSet.has(String(d.issue_no).trim().toUpperCase()))
    .reduce((sum: number, d: any) => sum + (Number(d.qty) || 0), 0);
  const totalIssuedToGodownWeight = (millIssueDetails || [])
    .filter((d: any) => godownIssueNosSet.has(String(d.issue_no).trim().toUpperCase()))
    .reduce((sum: number, d: any) => sum + ((Number(d.weight_kgs) || 0) / 100), 0);

  const factoryIssueNosSet = new Set(
    (millIssueMasters || [])
      .filter((m: any) => {
        const type = String(m.issue_type || '').trim().toUpperCase();
        return type === 'FACTORY' || type === 'FACTORY ISSUE' || type === 'SELL';
      })
      .map((m: any) => String(m.issue_no).trim().toUpperCase())
  );
  const totalIssuedToFactoryBales = (millIssueDetails || [])
    .filter((d: any) => factoryIssueNosSet.has(String(d.issue_no).trim().toUpperCase()))
    .reduce((sum: number, d: any) => sum + (Number(d.qty) || 0), 0);
  const totalIssuedToFactoryWeight = (millIssueDetails || [])
    .filter((d: any) => factoryIssueNosSet.has(String(d.issue_no).trim().toUpperCase()))
    .reduce((sum: number, d: any) => sum + ((Number(d.weight_kgs) || 0) / 100), 0);

  let godownStockBales = totalOpeningQty + totalIssuedToGodownBales - totalIssuedToFactoryBales;
  let totalStockMt = Number((totalOpeningWt + totalIssuedToGodownWeight - totalIssuedToFactoryWeight).toFixed(3));

  if (godownStockBales <= 0 && openingStocks.length === 0 && totalStockMt <= 0) {
    if (totalWeightMt > 0) {
      totalStockMt = Number((totalWeightMt * 0.45).toFixed(2));
      godownStockBales = Math.round(totalStockMt * 10 * 0.55);
    }
  }

  // 10. Extract Dynamic Years
  const yearSet = new Set<number>();
  unifiedContracts.forEach(c => {
    if (c.year && c.year >= 2000 && c.year <= 2100) {
      yearSet.add(c.year);
    }
  });

  const availableYears = Array.from(yearSet).sort((a, b) => b - a);
  if (availableYears.length === 0) {
    availableYears.push(new Date().getFullYear());
  }

  const activeYear = requestedYear && availableYears.includes(requestedYear)
    ? requestedYear
    : availableYears[0];

  // 11. Month-Wise Summary for the Selected Year
  const yearContracts = unifiedContracts.filter(c => c.year === activeYear);

  // Group by month index (0 to 11)
  const monthGroups = new Map<number, UnifiedContractRecord[]>();
  yearContracts.forEach(c => {
    if (!monthGroups.has(c.month)) {
      monthGroups.set(c.month, []);
    }
    monthGroups.get(c.month)!.push(c);
  });

  // Create MonthSummary only for months containing data, sorted January (0) to December (11)
  const sortedMonthIndices = Array.from(monthGroups.keys()).sort((a, b) => a - b);
  
  const monthSummaries: MonthSummary[] = sortedMonthIndices.map(mIdx => {
    const list = monthGroups.get(mIdx)!;
    
    let mTotalContracts = list.length;
    let mSaudaContracts = 0;
    let mPtfContracts = 0;
    let mPendingContracts = 0;
    let mPartialContracts = 0;
    let mTotalWeightMt = 0;
    let mSaudaWeightMt = 0;
    let mPtfWeightMt = 0;
    let mPendingWeightMt = 0;
    let mPartialWeightMt = 0;
    let mTotalContractValue = 0;
    let mPaidAmount = 0;
    let mRemainingAmount = 0;

    list.forEach(c => {
      mTotalWeightMt += c.totalWeightMt;
      mTotalContractValue += c.contractValue;
      mPaidAmount += c.paidAmount;
      mRemainingAmount += c.remainingAmount;

      if (c.contractType === 'SAUDA') {
        mSaudaContracts++;
        mSaudaWeightMt += c.totalWeightMt;
      } else {
        mPtfContracts++;
        mPtfWeightMt += c.totalWeightMt;
      }

      if (c.arrivalStatus === 'PENDING') {
        mPendingContracts++;
        mPendingWeightMt += c.pendingWeightMt;
      } else if (c.arrivalStatus === 'PARTIAL') {
        mPartialContracts++;
        mPartialWeightMt += c.pendingWeightMt;
      }
    });

    return {
      monthIndex: mIdx,
      monthName: MONTH_NAMES[mIdx] || `Month ${mIdx + 1}`,
      year: activeYear,
      totalContracts: mTotalContracts,
      saudaContracts: mSaudaContracts,
      ptfContracts: mPtfContracts,
      pendingContracts: mPendingContracts,
      partialContracts: mPartialContracts,
      totalWeightMt: Number(mTotalWeightMt.toFixed(2)),
      saudaWeightMt: Number(mSaudaWeightMt.toFixed(2)),
      ptfWeightMt: Number(mPtfWeightMt.toFixed(2)),
      pendingWeightMt: Number(mPendingWeightMt.toFixed(2)),
      partialWeightMt: Number(mPartialWeightMt.toFixed(2)),
      totalContractValue: Number(mTotalContractValue.toFixed(2)),
      paidAmount: Number(mPaidAmount.toFixed(2)),
      remainingAmount: Number(mRemainingAmount.toFixed(2)),
      contracts: list
    };
  });

  return {
    totalContractsCount,
    totalWeightMt,
    saudaContractsCount,
    saudaWeightMt,
    ptfContractsCount,
    ptfWeightMt,
    totalPendingContractsCount,
    totalPendingWeightMt,
    pendingSaudaCount,
    pendingSaudaWeightMt,
    pendingPtfCount,
    pendingPtfWeightMt,
    totalPayableValue,
    totalPaidAmount,
    totalRemainingAmount,
    advancePaymentAmount,
    totalStockMt,
    godownStockBales,
    availableYears,
    selectedYear: activeYear,
    monthSummaries,
    allContracts: unifiedContracts,
    allPayments: paymentRecords
  };
}
