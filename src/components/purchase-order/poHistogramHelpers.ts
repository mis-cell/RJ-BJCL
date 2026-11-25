import {
  areMrNumbersEqual,
  extractFinalArrivalMrNo,
  extractInspectionMrNo,
  extractRecordMrNo,
} from '../../lib/mrNumberUtils';

export const parseGridRows = (raw: any): any[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((r) => r && typeof r === 'object');
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed.startsWith('[')) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed.filter((r) => r && typeof r === 'object') : [];
    } catch (_e) {
      return [];
    }
  }
  return [];
};

export const toMt = (raw: any): number => {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n >= 500) return n / 1000; // Kg -> MT
  if (n > 50) return n / 10; // Qtl -> MT
  return n; // Already MT
};

export const extractMrSequence = (mr: string | null | undefined): number => {
  const m = String(mr || '').trim().match(/(\d+)$/);
  return m ? parseInt(m[1], 10) : 0;
};

export const sortByMrAsc = <T,>(items: T[], getMr: (item: T) => string): T[] => {
  return [...items].sort((a, b) => {
    const mrA = getMr(a);
    const mrB = getMr(b);
    const seqA = extractMrSequence(mrA);
    const seqB = extractMrSequence(mrB);
    if (seqA > 0 && seqB > 0 && seqA !== seqB) return seqA - seqB;
    return mrA.localeCompare(mrB);
  });
};

export const uniqueJoined = (values: Array<string | null | undefined>, fallback = 'N/A'): string => {
  const seen = new Set<string>();
  const out: string[] = [];
  values.forEach((v) => {
    const clean = String(v || '').trim();
    if (!clean || clean === '-' || clean.toUpperCase() === 'N/A' || clean.toUpperCase() === 'NONE') return;
    const key = clean.toUpperCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(clean);
    }
  });
  return out.length > 0 ? out.join(', ') : fallback;
};

export const getPoHeaderMetrics = (po: any, poDetails: any[] = []) => {
  const details = Array.isArray(poDetails) ? poDetails : [];
  const contractMt = parseFloat(po?.total_contract_mt || po?.weight_mt || 0) || 0;
  const lorries = Math.max(
    1,
    parseInt(po?.total_lorries || po?.total_no_of_lorries || po?.no_of_lorries || po?.contract_lorries || 1, 10) || 1
  );
  const totalUnits = parseInt(po?.total_units || po?.total_unit || 0, 10) || 0;
  const unitsPerLorry =
    parseFloat(po?.units_per_lorry || po?.units_lorry || 0) ||
    (totalUnits > 0 && lorries > 0 ? Math.round((totalUnits / lorries) * 100) / 100 : 0);
  const weightPerLorry =
    parseFloat(po?.weight_per_lorry || 0) || (lorries > 0 ? contractMt / lorries : contractMt);

  const detailRates = details
    .map((d) => Number(d?.rate_qntl || d?.rate || 0))
    .filter((r) => Number.isFinite(r) && r > 0);
  const avgDetailRate =
    detailRates.length > 0
      ? Math.round(detailRates.reduce((s, r) => s + r, 0) / detailRates.length)
      : 0;
  const rate =
    Number(po?.b_rate || 0) ||
    Number(po?.rate || 0) ||
    Number(po?.price || 0) ||
    avgDetailRate;

  const detailPremiums = details
    .map((d) => Number(d?.premium || 0))
    .filter((p) => Number.isFinite(p) && p !== 0);
  const premium =
    Number(po?.premium || 0) ||
    (detailPremiums.length > 0 ? detailPremiums[0] : 0);

  const grades = uniqueJoined(
    [
      po?.grade,
      po?.grade_name,
      po?.item_grade,
      ...details.map((d) => d?.grade_name || d?.grade),
    ],
    'N/A'
  );
  const agencies = uniqueJoined(
    [
      po?.agency_name,
      po?.agency,
      ...details.map((d) => d?.agency_name || d?.agency),
    ],
    'N/A'
  );
  const markas = uniqueJoined(
    [
      po?.marka_name,
      po?.marka,
      ...details.map((d) => d?.marka_name || d?.marka),
    ],
    'N/A'
  );

  return {
    poNo: String(po?.po_no || po?.contract_po_no || '').trim(),
    poDate: String(po?.s_date || po?.po_date || po?.contract_date || po?.created_at?.slice(0, 10) || '—').trim(),
    supplier: String(po?.supplier || po?.supplier_name || po?.vendor_name || 'DIRECT').trim(),
    broker: String(po?.broker || po?.broker_name || 'DIRECT').trim(),
    challanSupplier: String(po?.challan_supplier || po?.supplier || po?.supplier_name || 'DIRECT').trim(),
    area: String(po?.area || po?.station || 'N/A').trim(),
    unit: String(po?.purchase_unit_name || po?.unit_type || po?.unit || 'BALES').trim().toUpperCase(),
    contractMt,
    lorries,
    totalUnits,
    unitsPerLorry,
    weightPerLorry,
    rate,
    detailRateRange:
      detailRates.length > 1
        ? `₹${Math.min(...detailRates).toLocaleString()}–₹${Math.max(...detailRates).toLocaleString()}/Qtl`
        : detailRates.length === 1
          ? `₹${detailRates[0].toLocaleString()}/Qtl`
          : rate > 0
            ? `₹${rate.toLocaleString()}/Qtl`
            : 'N/A',
    premium,
    grades,
    agencies,
    markas,
    deliveryFrom: po?.delivery_from || po?.s_date || po?.po_date || '—',
    deliveryTo: po?.delivery_to || '—',
    graceDays: Number(po?.grace_days || 0),
    deliveryPenalty: po?.delivery_penalty || 0,
  };
};

export const getArrivalWeightMt = (a: any): number => {
  if (!a) return 0;
  if (a.final_weight_mt && Number(a.final_weight_mt) > 0) return toMt(a.final_weight_mt);
  if (a.received_weight_mt && Number(a.received_weight_mt) > 0) return toMt(a.received_weight_mt);
  if (a.weight_qtl && Number(a.weight_qtl) > 0) return Math.round((Number(a.weight_qtl) / 10) * 1000) / 1000;
  if (a.electronic_net_weight && Number(a.electronic_net_weight) > 0) return toMt(a.electronic_net_weight);
  if (a.supplier_net_weight && Number(a.supplier_net_weight) > 0) return toMt(a.supplier_net_weight);
  if (a.challan_material_weight && Number(a.challan_material_weight) > 0) return toMt(a.challan_material_weight);
  if (a.weight_reduced && Number(a.weight_reduced) > 0) return toMt(a.weight_reduced);
  if (a.net_weight && Number(a.net_weight) > 0) return toMt(a.net_weight);
  if (a.weight && Number(a.weight) > 0) return toMt(a.weight);

  const grid = parseGridRows(a.grid_details || a.details);
  if (grid.length > 0) {
    const sum = grid.reduce((s, r) => {
      const w = toMt(r.netto_pnto || r.final_receipt_wt || r.reduced_weight || r.challan_gross_wt || r.weight_mt || 0);
      return s + w;
    }, 0);
    if (sum > 0) return Math.round(sum * 1000) / 1000;
  }
  return 0;
};

export const getArrivalSummary = (a: any) => {
  const grid = parseGridRows(a?.grid_details || a?.details);
  const weightMt = getArrivalWeightMt(a);
  const grades = uniqueJoined(
    [
      a?.receipt_grade_name,
      a?.grade,
      a?.grading,
      a?.variety,
      a?.item_grade,
      ...grid.map((r) => r.receipt_grade_name || r.challan_grade_name || r.grade_name || r.grade),
    ],
    '—'
  );
  const agencies = uniqueJoined(
    [a?.agency_name, a?.agency, ...grid.map((r) => r.agency_name || r.agency)],
    '—'
  );
  const markas = uniqueJoined(
    [
      a?.challan_marka_name,
      a?.marka_name,
      a?.marka,
      ...grid.map((r) => r.receipt_marka_name || r.challan_marka_name || r.marka_name || r.marka || r.marks),
    ],
    '—'
  );
  const quantityChln =
    Number(a?.quantity_chln || a?.received_units || a?.total_packets || a?.packets || 0) ||
    grid.reduce((s, r) => s + (Number(r.quantity_chln || r.quantity_rcpt || r.quantity || 0) || 0), 0);
  const nettoMt =
    toMt(a?.netto_mt || 0) ||
    Math.round(grid.reduce((s, r) => s + toMt(r.netto_pnto || 0), 0) * 1000) / 1000 ||
    weightMt;

  return {
    mrNo: extractFinalArrivalMrNo(a) || String(a?.final_arrival_no || a?.mr_no || a?.temporary_arrival_no || '—').trim(),
    date: String(a?.date || a?.arrival_date || a?.final_arrival_date || a?.lorry_date || '—').trim(),
    supplier: String(a?.supplier || a?.supplier_name || '—').trim(),
    challanSupplier: String(a?.challan_supplier || a?.supplier || a?.supplier_name || '—').trim(),
    broker: String(a?.broker || a?.broker_name || '—').trim(),
    lorryNo: String(a?.lorry_number || a?.lorry_no || a?.truck_no || a?.vehicle_no || '—').trim(),
    area: String(a?.arrival_area_name || a?.area || a?.station || '—').trim(),
    unit: String(a?.unit_name || a?.unit || grid[0]?.unit || 'BALES').trim(),
    apmcFees: Number(a?.apmc_fees || 0),
    grades,
    agencies,
    markas,
    quantityChln,
    nettoMt,
    weightMt,
  };
};

export const getInspectionWeightMt = (insp: any, fallbackArrivals: any[] = []): number => {
  if (!insp) return 0;
  const directCandidates = [
    insp.final_receipt_wt,
    insp.total_final_receipt_wt,
    insp.received_weight_mt,
    insp.reduced_weight,
    insp.receipt_gross_wt,
    insp.challan_gross_wt,
    insp.total_receipt_gross_wt,
    insp.total_challan_gross_wt,
    insp.net_weight,
    insp.gross_weight,
    insp.weight_mt,
  ];
  for (const c of directCandidates) {
    const val = toMt(c);
    if (val > 0) return Math.round(val * 1000) / 1000;
  }

  const detailRows = parseGridRows(
    insp.grid_details ||
      insp.material_inspection_details ||
      insp.mill_inspection_detail ||
      insp.inspection_details ||
      insp.details ||
      insp.items
  );
  if (detailRows.length > 0) {
    const sumWt = detailRows.reduce((sum, r) => {
      const rowWt = toMt(
        r.final_receipt_wt ||
          r.reduced_weight ||
          r.qty_in_mt ||
          r.receipt_gross_wt ||
          r.challan_gross_wt ||
          r.gross_weight_batch ||
          r.netto_pnto ||
          r.weight_mt ||
          r.weight ||
          0
      );
      return sum + rowWt;
    }, 0);
    if (sumWt > 0) return Math.round(sumWt * 1000) / 1000;
  }

  const inspMr = extractInspectionMrNo(insp);
  if (inspMr && fallbackArrivals.length > 0) {
    const matchedArr = fallbackArrivals.find((a) => areMrNumbersEqual(extractFinalArrivalMrNo(a), inspMr));
    if (matchedArr) {
      const arrWt = getArrivalWeightMt(matchedArr);
      if (arrWt > 0) return arrWt;
    }
  }
  return 0;
};

const avgPositive = (nums: number[]): number => {
  const valid = nums.filter((n) => Number.isFinite(n) && n > 0);
  if (valid.length === 0) return 0;
  return valid.reduce((s, n) => s + n, 0) / valid.length;
};

export const getInspectionMetrics = (insp: any, fallbackArrivals: any[] = []) => {
  const rows = parseGridRows(
    insp?.grid_details ||
      insp?.material_inspection_details ||
      insp?.mill_inspection_detail ||
      insp?.inspection_details ||
      insp?.details
  );

  const actualMoisture =
    Number(insp?.actual_moisture || insp?.insp_read_avg || insp?.moisture_percent || insp?.moisture || 0) ||
    avgPositive(
      rows.map((r) =>
        Number(
          r.insp_read_avg ||
            r.insp_moisture_avg ||
            r.actual_moisture ||
            r.moisture_act ||
            r.lorry_moisture_avg ||
            r.lorry_read_avg ||
            0
        )
      )
    );

  const claimMoisture =
    Number(insp?.claim_moisture || 0) ||
    avgPositive(rows.map((r) => Number(r.moisture_claim || r.claim_moisture || r.claim_moist || 0)));

  const actualDust =
    Number(insp?.actual_dust || insp?.dust_percent || insp?.dust || 0) ||
    avgPositive(rows.map((r) => Number(r.actual_dust || r.dust_act || r.mill_sett_dust || 0)));

  const claimDust =
    Number(insp?.claim_dust || 0) ||
    avgPositive(rows.map((r) => Number(r.dust_claim || r.claim_dust || 0)));

  const actualNcv =
    Number(insp?.actual_ncv || insp?.ncv_percent || insp?.ncv || 0) ||
    avgPositive(rows.map((r) => Number(r.actual_ncv || r.ncv_act || r.mill_sett_ncv || 0)));

  const claimNcv =
    Number(insp?.claim_ncv || 0) ||
    avgPositive(rows.map((r) => Number(r.ncv_claim || r.claim_ncv || 0)));

  const gradeDown =
    Number(insp?.actual_grade_down || insp?.claim_grade_down || insp?.grade_down_percent || 0) ||
    avgPositive(rows.map((r) => Number(r.grade_down || r.grade_down_claim || r.mill_sett_grade_down || 0)));

  const grades = uniqueJoined(
    [
      insp?.stock_grade_name,
      insp?.arrival_grade,
      insp?.actual_grade,
      insp?.grade,
      insp?.item_grade,
      ...rows.map((r) => r.stock_grade_name || r.arrival_grade || r.grade_name || r.grade),
    ],
    '—'
  );

  const agencies = uniqueJoined(
    [insp?.agency, insp?.agency_name, ...rows.map((r) => r.agency || r.agency_name)],
    '—'
  );

  const markas = uniqueJoined(
    [insp?.marks, insp?.marka, insp?.marka_name, ...rows.map((r) => r.marks || r.marka || r.marka_name)],
    '—'
  );

  const mrNo = extractInspectionMrNo(insp) || String(insp?.mr_no || '').trim();
  const matchedArr = mrNo
    ? fallbackArrivals.find((a) => areMrNumbersEqual(extractFinalArrivalMrNo(a), mrNo))
    : null;

  return {
    mrNo,
    date: String(insp?.mr_date || insp?.arrival_date || insp?.date || matchedArr?.date || '—').trim(),
    arrivalDate: String(insp?.arrival_date || insp?.date || matchedArr?.date || '—').trim(),
    supplier: String(insp?.supplier_name || insp?.supplier || matchedArr?.supplier || '—').trim(),
    broker: String(insp?.broker_name || insp?.broker || matchedArr?.broker || '—').trim(),
    lorryNo: String(insp?.lorry_number || insp?.lorry_no || matchedArr?.lorry_number || matchedArr?.lorry_no || '—').trim(),
    millPoNo: String(insp?.mill_po_no || insp?.po_no || '—').trim(),
    weightMt: getInspectionWeightMt(insp, fallbackArrivals),
    actualMoisture,
    claimMoisture,
    actualDust,
    claimDust,
    actualNcv,
    claimNcv,
    gradeDown,
    grades,
    agencies,
    markas,
    detentionDays: Number(insp?.detention_days || 0),
    unloadingDate: String(insp?.unloading_date || '—').trim(),
    deductionAmount: Number(insp?.deduction_amount || 0),
    status: String(insp?.status || 'Completed').trim(),
  };
};

export const getPaymentMetrics = (pay: any) => {
  const paidAmount =
    Number(pay?.paid_amount ?? pay?.amount_paid ?? 0) ||
    Number(pay?.payable_net_amount ?? pay?.amount ?? 0) ||
    0;
  const payableAmount =
    Number(pay?.payable_amt ?? pay?.total_amount ?? pay?.payable_net_amount ?? 0) ||
    paidAmount;
  return {
    mrNo: extractRecordMrNo(pay) || String(pay?.mr_no || pay?.arrival_no || '—').trim(),
    voucherNo: String(pay?.voucher_no || pay?.payment_id || '—').trim(),
    paymentDate: String(pay?.payment_date || pay?.sett_date || pay?.date || pay?.created_at?.slice(0, 10) || '—').trim(),
    partyName: String(pay?.party_name || pay?.supplier || pay?.supplier_name || '—').trim(),
    brokerName: String(pay?.broker || pay?.broker_name || 'DIRECT').trim(),
    paymentMode: String(pay?.payment_mode || '—').trim(),
    paymentStatus: String(pay?.payment_status || pay?.status || 'Recorded').trim(),
    paidAmount,
    payableAmount,
    balanceAmount: Math.max(0, payableAmount - paidAmount),
  };
};

export const getSettlementMetrics = (sett: any) => {
  const weightMt =
    toMt(sett?.settled_weight_mt || 0) ||
    toMt(sett?.settled_weight || 0) ||
    toMt(sett?.challan_weight || 0) ||
    toMt(sett?.wt_ded_wt_1 || 0) ||
    toMt(sett?.supplier_net_wt || 0) ||
    toMt(sett?.electronic_scale_net || 0);

  const grossValue =
    Number(sett?.value_amt || 0) ||
    Number(sett?.val_material_value || 0) ||
    Number(sett?.summary_material_value || 0);

  const advanceAdjusted =
    Number(sett?.final_on_ac_adv || 0) + Number(sett?.final_less_adv || 0);

  const qualityDeductions =
    Number(sett?.total_deduction_amount || 0) ||
    Number(sett?.summary_deduction_amount || 0) ||
    Number(sett?.quality_claim_amount || 0) ||
    Number(sett?.val_qty_claim || 0) ||
    Number(sett?.summary_less_amount || 0) ||
    Number(sett?.val_less_amt || 0) ||
    Number(sett?.val_less_amount || 0);

  const weightPenalty =
    Number(sett?.penalty_amount || 0) ||
    Number(sett?.excess_short_penalty || 0) ||
    Number(sett?.val_ex_short || 0) ||
    Number(sett?.summary_delivery_claim || 0);

  const netPayable =
    Number(sett?.net_settled_amount ?? 0) ||
    Number(sett?.net_amt ?? 0) ||
    Number(sett?.payable_amt ?? 0) ||
    Number(sett?.final_amount ?? 0);

  return {
    mrNo: extractRecordMrNo(sett) || String(sett?.mr_no || sett?.mr_number || sett?.arrival_no || '—').trim(),
    settDate: String(sett?.sett_date || sett?.settlement_date || sett?.created_at?.slice(0, 10) || '—').trim(),
    weightMt: Math.round(weightMt * 1000) / 1000,
    grossValue,
    advanceAdjusted,
    qualityDeductions,
    weightPenalty,
    netPayable,
    apmcFees: Number(sett?.actual_apmc_fees || sett?.arival_apmc_fees || 0),
    status: String(sett?.payment_status || sett?.status || 'Settled').trim(),
  };
};
