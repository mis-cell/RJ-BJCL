export interface SettlementDeductionItem {
  id?: string;
  deduction_type: string;
  deduction_rate: number;
  deduction_qty: number;
  deduction_amount: number;
}

export const APMC_EXEMPT_AREAS = new Set([
  'BANGLADESH',
  'BIHAR',
  'LOWER ASSAM',
  'ORISSA',
  'ODISHA',
  'UPPER ASSAM'
]);

export const isApmcExemptArea = (rawArea: any): boolean => {
  if (!rawArea) return false;
  const cleaned = String(rawArea)
    .trim()
    .toUpperCase()
    .replace(/\s*\(CODE\s*\d+\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return false;
  if (APMC_EXEMPT_AREAS.has(cleaned)) return true;
  for (const exempt of APMC_EXEMPT_AREAS) {
    if (cleaned === exempt || cleaned.includes(exempt)) return true;
  }
  return false;
};

export const isSettlementApmcExempt = (
  detailCols: SettlementDetailColumn[],
  selectedPoData?: any
): boolean => {
  const colAreas = (detailCols || [])
    .map(c => String(c?.area || '').trim())
    .filter(Boolean);
  if (colAreas.length > 0) {
    return colAreas.some(a => isApmcExemptArea(a));
  }
  const poArea = selectedPoData?.area || selectedPoData?.area_name || selectedPoData?.arrival_area_name || '';
  return isApmcExemptArea(poArea);
};

// Detailed master interface
export interface SettlementMaster {
  settlement_id?: string;
  mr_no: string;
  sett_date: string;
  po_type: string;
  broker: string;
  supplier: string;
  chn_supplier: string;
  po_no: string;
  po_date: string;
  lorry_number: string;
  auto_ho_settlement: boolean;
  detention_days: number;
  arrival_no: string;
  arrival_date: string;
  arival_apmc_fees: number;
  actual_apmc_fees: number;
  remarks: string;

  // Grade-wise summary panel
  summary_rate_qtel: number;
  summary_rate_aff_cd_cl: number;
  summary_delivery_claim: number;
  summary_rate_wt_claim: number;
  summary_instl_rate: number;
  summary_premium_wt?: number;
  summary_material_value: number;
  summary_misc_add?: number;
  summary_misc_less?: number;
  summary_premium_amount: number;
  summary_less_amount: number;
  summary_instl_amount?: number;

  // Deductions from Deduction Master
  summary_deduction_type: string;
  summary_deduction_rate: number;
  summary_deduction_qty: number;
  summary_deduction_amount: number;
  deductions?: SettlementDeductionItem[];

  // valuation
  val_material_value: number;
  val_add_amt: number;
  val_less_amt: number;
  val_premium_amt: number;
  val_less_amount: number;
  val_qty_claim: number;
  val_ex_short: number;

  // final MR
  final_less_adv: number;
  final_on_ac_adv: number;
  final_apmc_fees: number;
  final_cst_pct_amt: number;

  // payable
  payable_amt: number;
  payable_bill_no: string;
  payable_bill_date: string;

  // bottom bar
  wt_ded_wt_1: number;
  wt_ded_wt_2: number;
  wt_ded_wt_3: number;
  rate_qntl: number;
  value_amt: number;
  adjustment_amt: number;
  net_amt: number;
  challan_weight: number;
  supplier_net_wt: number;
  electronic_scale_net: number;
  payment_status: string;

  // Extended print/header metadata
  mr_date?: string;
  challan_no?: string;
  less_advance_amount?: number;
  on_account_Effect?: string;
  supplier_address?: string;
  consign_no?: string;
  consign_date?: string;
  challan_rr_no?: string;
  challan_railway_receipt_no?: string;
  way_bill?: string;
  pan_no?: string;
  unit_name?: string;
  printed_by?: string;
  print_count?: number;
  last_printed_at?: string;
  last_printed_by?: string;
  last_printed_by_name?: string;
  on_ac_total_advance?: number;
  on_ac_total_adv_adjusted?: number;
  cheque_adjustments?: Array<{ cheque_no: string; date: string; adjusted_value: number }>;
}

// 4-Column specifications entry (aligned with Payment Operations -> Details)
export interface SettlementDetailColumn {
  col_index: number;
  grade: string;
  area: string;
  agency: string;
  marka_crop: string;
  quantity: number;
  arr_qty_wt: number;
  min_qty_wt: number;
  wt_phota: number;

  wt_quantity: number;
  rate_value: number;
  premium?: number;

  // Grade Down Settlement & Rate Adjustments (consistent with PaymentDetailColumn)
  sett_pct?: number;
  deduction_rate?: number;
  sett_rate?: number;
  quantity_qtl?: number;
  amount?: number;

  // Claims
  gd_claim: number;
  gd_sett: number;
  gd_rev: number;
  gd_final: number;

  moist_claim: number;
  moist_sett: number;
  moist_rev: number;
  moist_final: number;

  dust_claim: number;
  dust_sett: number;
  dust_rev: number;
  dust_final: number;

  ncv_claim: number;
  ncv_sett: number;
  ncv_rev: number;
  ncv_final: number;

  po_grade_claim: number;
  po_grade_sett: number;
  po_grade_rev: number;
  po_grade_final: number;

  adjust_type: string;
  remark: string;
  claim_settlement: number;

  // Grade Down from Sauda Check Point / PO Items Table Matrix
  lower_grade?: string;
  target_lower_grade?: string;
  lower_grade_rate?: number;
  grade_diff?: number;
  po_items?: any[];
  all_cols?: SettlementDetailColumn[];
  unit?: string;
}

export const emptyDetailColumn = (index: number): SettlementDetailColumn => ({
  col_index: index,
  grade: '',
  area: '',
  agency: '',
  marka_crop: '',
  quantity: 0,
  arr_qty_wt: 0,
  min_qty_wt: 0,
  wt_phota: 0,
  wt_quantity: 0,
  rate_value: 0,
  premium: 0,
  sett_pct: 0,
  deduction_rate: 0,
  sett_rate: 0,
  quantity_qtl: 0,
  amount: 0,
  gd_claim: 0, gd_sett: 0, gd_rev: 0, gd_final: 0,
  moist_claim: 0, moist_sett: 0, moist_rev: 0, moist_final: 0,
  dust_claim: 0, dust_sett: 0, dust_rev: 0, dust_final: 0,
  ncv_claim: 0, ncv_sett: 0, ncv_rev: 0, ncv_final: 0,
  po_grade_claim: 0, po_grade_sett: 0, po_grade_rev: 0, po_grade_final: 0,
  adjust_type: 'No Adjustment',
  remark: '',
  claim_settlement: 0,
  unit: 'BALES'
});

export const getColWtMt = (col?: SettlementDetailColumn): number => {
  if (!col) return 0;
  const arrWt = Number(col.arr_qty_wt) || 0;
  if (arrWt > 0) return arrWt;
  const qty = Number(col.quantity) || 0;
  const wtPerQty = Number(col.wt_quantity) || Number(col.wt_phota) || 0;
  if (qty > 0 && wtPerQty > 0) {
    return Number(((qty * wtPerQty) / 1000).toFixed(3));
  }
  if (qty > 0) {
    return Number((qty / 10).toFixed(3));
  }
  return 0;
};

export const getEffectiveColSettRate = (col?: SettlementDetailColumn, fallbackRate: number = 0): number => {
  if (!col) return 0;
  const origRate = Number(col.rate_value) > 0 ? Number(col.rate_value) : (Number(fallbackRate) || 0);
  const prem = Number(col.premium) || 0;
  const ded = Number(col.deduction_rate) || 0;
  if (origRate > 0 && (prem > 0 || ded > 0)) {
    return Math.max(0, Number((origRate + prem - ded).toFixed(2)));
  }
  if (col.sett_rate !== undefined && col.sett_rate !== null && Number(col.sett_rate) > 0) {
    return Number(col.sett_rate);
  }
  return origRate;
};

export const getColAmount = (col?: SettlementDetailColumn, fallbackRate: number = 0): number => {
  if (!col) return 0;
  const wtMt = getColWtMt(col);
  const effectiveRate = getEffectiveColSettRate(col, fallbackRate);
  if (wtMt <= 0 || effectiveRate <= 0) return 0;
  const qtyQtl = Number((wtMt * 10).toFixed(3));
  return Number((qtyQtl * effectiveRate).toFixed(2));
};

export const calculateWeightedRatePerMT = (cols: SettlementDetailColumn[]): number => {
  let totalWeightMt = 0;
  let totalAmount = 0;

  cols.forEach(col => {
    const wtMt = getColWtMt(col);
    const colAmount = getColAmount(col);
    
    if (wtMt > 0 && colAmount > 0) {
      totalWeightMt += wtMt;
      totalAmount += colAmount;
    }
  });

  if (totalWeightMt <= 0) return 0;
  const weightedRateMt = totalAmount / totalWeightMt;
  return Number(weightedRateMt.toFixed(2));
};

export const initialMaster = (): SettlementMaster => ({
  mr_no: '',
  sett_date: new Date().toISOString().split('T')[0],
  po_type: '',
  broker: '',
  supplier: '',
  chn_supplier: '',
  po_no: '',
  po_date: '',
  lorry_number: '',
  auto_ho_settlement: false,
  detention_days: 0,
  arrival_no: '',
  arrival_date: '',
  arival_apmc_fees: 0,
  actual_apmc_fees: 0,
  remarks: '',
  summary_rate_qtel: 0,
  summary_rate_aff_cd_cl: 0,
  summary_delivery_claim: 0,
  summary_rate_wt_claim: 0,
  summary_instl_rate: 0,
  summary_premium_wt: 0,
  summary_material_value: 0,
  summary_misc_add: 0,
  summary_misc_less: 0,
  summary_premium_amount: 0,
  summary_less_amount: 0,
  summary_instl_amount: 0,
  summary_deduction_type: '',
  summary_deduction_rate: 0,
  summary_deduction_qty: 0,
  summary_deduction_amount: 0,
  deductions: [],
  val_material_value: 0,
  val_add_amt: 0,
  val_less_amt: 0,
  val_premium_amt: 0,
  val_less_amount: 0,
  val_qty_claim: 0,
  val_ex_short: 0,
  final_less_adv: 0,
  final_on_ac_adv: 0,
  final_apmc_fees: 0,
  final_cst_pct_amt: 0,
  payable_amt: 0,
  payable_bill_no: '',
  payable_bill_date: '',
  wt_ded_wt_1: 0,
  wt_ded_wt_2: 0,
  wt_ded_wt_3: 0,
  rate_qntl: 0,
  value_amt: 0,
  adjustment_amt: 0,
  net_amt: 0,
  challan_weight: 0,
  supplier_net_wt: 0,
  electronic_scale_net: 0,
  payment_status: 'Pending'
});

export function parseDateOnly(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  if (!s) return null;
  if (s.includes('T')) {
    const parts = s.split('T')[0].split('-');
    if (parts.length === 3) {
      const y = Number(parts[0]), m = Number(parts[1]) - 1, d = Number(parts[2]);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return new Date(y, m, d);
    }
  }
  if (s.includes('-')) {
    const parts = s.split('-');
    if (parts[0].length === 4) {
      const y = Number(parts[0]), m = Number(parts[1]) - 1, d = Number(parts[2]);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return new Date(y, m, d);
    } else if (parts[2].length === 4) {
      const y = Number(parts[2]), m = Number(parts[1]) - 1, d = Number(parts[0]);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return new Date(y, m, d);
    }
  }
  if (s.includes('/')) {
    const parts = s.split('/');
    if (parts[2].length === 4) {
      const y = Number(parts[2]), m = Number(parts[1]) - 1, d = Number(parts[0]);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return new Date(y, m, d);
    }
  }
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }
  return null;
}

export function formatToInputDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const d = parseDateOnly(dateStr);
  if (!d) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
