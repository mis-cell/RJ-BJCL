// Payment Master & Detail Column Types

export interface PaymentMaster {
  payment_id?: string;
  voucher_no: string;
  payment_date: string;
  mr_no: string;
  po_no: string;
  po_date: string;
  sett_date: string;
  po_type: string;
  broker: string;
  supplier: string;
  party_id: string;
  party_name: string;
  chn_supplier: string;
  lorry_number: string;
  auto_ho_settlement: boolean;
  detention_days: number;
  arrival_no: string;
  arrival_date: string;
  arival_apmc_fees: number;
  remarks: string;

  // Grade-wise summary panel
  summary_rate_qtel: number;
  summary_rate_aff_cd_cl: number;
  summary_delivery_claim: number;
  summary_rate_wt_claim: number;
  summary_instl_rate: number;
  summary_material_value: number;
  summary_misc_add?: number;
  summary_misc_less?: number;
  summary_premium_amount: number;
  summary_less_amount: number;
  summary_instl_amount?: number;

  // Deductions
  summary_deduction_type: string;
  summary_deduction_rate: number;
  summary_deduction_qty: number;
  summary_deduction_amount: number;

  // Valuation
  val_material_value: number;
  val_add_amt: number;
  val_less_amt: number;
  val_premium_amt: number;
  val_less_amount: number;
  val_qty_claim: number;
  val_ex_short: number;

  // Final MR & Payment details
  final_less_adv: number;
  final_on_ac_adv: number;
  final_apmc_fees: number;
  final_cst_pct_amt: number;

  payable_amt: number;
  payable_bill_no: string;
  payable_bill_date: string;

  total_amount: number;
  paid_amount: number;
  payment_mode: string;
  bank_name: string;
  reference_no: string;

  // Bottom bar
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

  status: string;
  payment_status: string;
  advance_payment_done?: string;
  advance_payment_from?: string;
  advance_payment_financier?: string;
  payment_settlementdate?: string;
  tenor?: string;
  repayment_date?: string;
}

// 4-Column specifications entry for Payment
export interface PaymentDetailColumn {
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

  // Grade Down Settlement & Rate Adjustments
  sett_pct: number; // Sett (%) - Populated from Inspection Details Grade Down % Claim
  deduction_rate: number; // Deduction (₹/Qtl) = Settlement Basis (Original Rate) * Sett (%) / 100
  sett_rate: number; // Sett Rate (₹/Qtl) = Original Rate - Deduction (₹/Qtl)
  quantity_qtl: number; // Quantity (Qtl) = Weight (MT) * 10
  amount: number; // Amount (₹) = Quantity (Qtl) * Sett Rate (₹/Qtl)

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
  all_cols?: PaymentDetailColumn[];
}

export const emptyDetailColumn = (index: number): PaymentDetailColumn => ({
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
  claim_settlement: 0
});

export const initialMaster = (): PaymentMaster => ({
  voucher_no: `PAY-${Date.now().toString().slice(-6)}`,
  payment_date: new Date().toISOString().split('T')[0],
  mr_no: '',
  po_no: '',
  po_date: '',
  sett_date: new Date().toISOString().split('T')[0],
  po_type: '',
  broker: '',
  supplier: '',
  party_id: '',
  party_name: '',
  chn_supplier: '',
  lorry_number: '',
  auto_ho_settlement: false,
  detention_days: 0,
  arrival_no: '',
  arrival_date: '',
  arival_apmc_fees: 0,
  remarks: '',
  summary_rate_qtel: 0,
  summary_rate_aff_cd_cl: 0,
  summary_delivery_claim: 0,
  summary_rate_wt_claim: 0,
  summary_instl_rate: 0,
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
  total_amount: 0,
  paid_amount: 0,
  payment_mode: 'Bank Transfer (NEFT/RTGS)',
  bank_name: '',
  reference_no: '',
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
  status: 'completed',
  payment_status: 'Paid',
  advance_payment_done: 'Yes',
  advance_payment_from: '1',
  advance_payment_financier:'',
  payment_settlementdate: '',
  tenor: '',
  repayment_date: ''
});
