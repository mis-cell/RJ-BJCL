export interface Farmer {
  id: string;
  name: string;
  father_name?: string;
  village: string;
  mobile: string;
  account_no?: string;
  address?: string;
  created_at: string;
}

export interface Trader {
  id: string;
  name: string;
  village: string;
  mobile: string;
  created_at: string;
}

export interface ArrivalDetailRow {
  srl_no: number;
  receipt_grade_code: string;
  receipt_grade_name: string;
  crop_year: string;
  challan_grade_name: string;
  agency_code: string;
  agency_name: string;
  challan_marka_code: string;
  challan_marka_name: string;
  netto_pnto: number;
  quantity_chln: number;
  quantity_rcpt: number;
  unit?: string;
  remarks: string;
  marks_phota?: string;
}

export interface Amad {
  amad_id?: string;
  id?: string;
  financial_year: string;
  amad_no: string;
  temporary_arrival_no?: string;
  po_no?: string;
  date: string;
  jci?: string;
  challan_supplier?: string;
  supplier?: string;
  agency_name?: string;
  broker?: string;
  transporter_name?: string;
  challan_rr_no?: string;
  challan_railway_receipt_no?: string;
  lorry_number?: string;
  pan_no?: string;
  lorry_date?: string;
  consignment_note?: string;
  consignment_note_no?: string;
  consignment_note_date?: string;
  di_no?: string;
  di_date?: string;
  invoice_no?: string;
  invoice_date?: string;
  ptf?: string;
  lorry_returned?: string;
  lorry_returned_other_mill?: string;
  arrival_area_code?: string;
  arrival_area_name?: string;
  unit_code?: string;
  unit_name?: string;
  way_bill_no?: string;
  way_bill_date?: string;
  apmc_fees?: number;
  remarks?: string;
  total_packets?: number;
  weight_qtl?: number;
  grid_details?: ArrivalDetailRow[] | string;
  challan_material_weight?: number;
  actual_gross_weight?: number;
  actual_tare_weight?: number;
  supplier_net_weight?: number;
  supplier_challan_gross?: number;
  supplier_tare_weight?: number;
  electronic_net_weight?: number;
  electronic_gross_weight?: number;
  electronic_tare_weight?: number;
  weight_reduced?: number;
  created_at?: string;
  status?: string;

  // Backward compatibility properties:
  packets?: number;
  weight?: number;
  commodity?: string;
  variety?: string;
  grading?: string;
  marka?: string;
  bardana_type?: string;
  farmer_id?: string;
  room_chamber?: string;
  floor?: string;
  loading_type?: string;
  condition?: string;
  remark?: string;
}

export interface SaudaQualityDetail {
  detail_id?: string;
  sauda_id?: string;
  quality: string;
  qty: number;
  marka?: string;
  agency?: string;
  rs: number;
  percentage?: number;
  rate?: number;
  agencies?: string[];
  markas?: string[];
  applicableCombinations?: any[];
}

export interface Sauda {
  sauda_id?: string;
  financial_year: string;
  sauda_no: string;
  session?: string;
  po_type?: string;
  date: string;
  broker?: string;
  supplier?: string;
  challan_supplier?: string;
  area?: string;
  agency?: string;
  marks?: string;
  no_of_lorries?: number;
  total_lorry?: number;
  units_per_lorry?: number | string;
  units_per_lorry_type?: string;
  total_unit?: number | string;
  wt_per_lorry?: number | string;
  unit_type?: string;
  total_wt_in_ton?: number | string;
  shipment_date?: string;
  shipment_days?: number;
  delivery_days?: number;
  shipment_penalty?: number;
  marks_claim?: number;
  quantity_claim?: number;
  remarks?: string;
  b_rate?: number;
  b_date?: string;
  superior_normal_marks?: string;
  signature_url?: string;
  status?: string;
  approval_status?: string;
  approved_by?: string;
  approved_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  rejection_remarks?: string;
  resubmission_count?: number;
  submitted_by?: string;
  submitted_at?: string;
  last_updated_at?: string;
  version?: number;
  created_by?: string;
  is_checked?: boolean;
  checked_by?: string;
  checked_at?: string;
  user_id?: string;
  delivery_from?: string;
  delivery_to?: string;
  freight_type?: string;
  delivery_type?: string;
  sauda_qualities?: any[];
  created_at?: string;
  quality_details?: SaudaQualityDetail[];
}

export interface SattaQualityDetail {
  detail_id?: string;
  satta_id?: string;
  quality: string;
  qty: number;
  marka?: string;
  agency?: string;
  rs: number;
  percentage?: number;
  rate?: number;
}

export interface Satta {
  satta_id?: string;
  financial_year: string;
  satta_no: string;
  session?: string;
  po_type?: string;
  date: string;
  broker?: string;
  supplier?: string;
  challan_supplier?: string;
  area?: string;
  agency?: string;
  marks?: string;
  no_of_lorries?: number;
  total_lorry?: number;
  units_per_lorry?: number | string;
  units_per_lorry_type?: string;
  total_unit?: number | string;
  wt_per_lorry?: number | string;
  unit_type?: string;
  total_wt_in_ton?: number | string;
  shipment_date?: string;
  shipment_days?: number;
  delivery_days?: number;
  shipment_penalty?: number;
  marks_claim?: number;
  quantity_claim?: number;
  remarks?: string;
  b_rate?: number;
  b_date?: string;
  superior_normal_marks?: string;
  signature_url?: string;
  status: 'pending' | 'completed' | 'cancelled';
  created_at?: string;
  quality_details?: SattaQualityDetail[];
}

export interface BardanaVoucher {
  id: string;
  type: 'issue' | 'purchase' | 'return' | 'transfer';
  date: string;
  account_name: string; // can be farmer or trader or supplier
  quantity: number;
  rate?: number;
  amount?: number;
  remark?: string;
  created_at: string;
}

export interface PurchaseDetailItem {
  item_id?: string;
  po_no: string;
  srl_no?: number;
  crop_year?: string;
  grade_code?: string;
  agency_code?: string;
  marka_code?: string;
  quantity?: number;
  weight_mt?: number;
  rate_qntl?: number;
  premium?: number;
}

export interface PurchaseMaster {
  po_id?: string;
  financial_year: string;
  purchase_order?: string;
  po_type?: string;
  ptf_no?: string;
  pending?: boolean;
  po_no: string;
  po_date: string;
  broker?: string;
  supplier?: string;
  challan_supplier?: string;
  area?: string;
  trans_paid_by?: string;
  weight_unit_kgs?: number;
  against_cancellation?: string;
  purchase_unit_code?: string;
  purchase_unit_name?: string;
  total_lorries?: number;
  units_per_lorry?: number;
  total_units?: number;
  weight_per_lorry?: number;
  total_contract_mt?: number;
  marka_type?: string;
  marka_penalty?: number;
  qty_penalty?: number;
  delivery_from?: string;
  delivery_to?: string;
  grace_days?: number;
  delivery_penalty?: number;
  contract_po_no?: string;
  contract_date?: string;
  rate_detail?: string;
  delivery_schedule?: string;
  terms_condition?: string;
  remarks?: string;
  po_identification?: string;
  b_rate?: number;
  premium?: number;
  s_date?: string;
  status?: string;
  created_at?: string;
  items?: PurchaseDetailItem[];
}

export interface PaymentMaster {
  payment_id?: string;
  voucher_no: string;
  voucher_date?: string;
  financial_year?: string;
  payment_date?: string;
  mr_no?: string;
  mr_date?: string;
  arrival_no?: string;
  arrival_date?: string;
  po_no?: string;
  po_date?: string;
  supplier?: string;
  party_name?: string;
  broker?: string;
  arrival_area?: string;
  total_packets?: number;
  total_weight?: number;
  b_rate?: number;
  premium?: number;
  gross_amount?: number;
  sett_amount?: number;
  deduction_amount?: number;
  total_amount?: number;
  payable_amt?: number;
  paid_amount?: number;
  net_amt?: number;
  tds_amt?: number;
  claim_amount?: number;
  status?: string;
  remarks?: string;
  created_at?: string;
}

export interface PaymentDetailItem {
  id?: number;
  payment_id?: string;
  voucher_no: string;
  mr_no?: string;
  col_index?: number;
  grade?: string;
  area?: string;
  agency?: string;
  marka_crop?: string;
  quantity?: number;
  arr_qty_wt?: number;
  min_qty_wt?: number;
  wt_phota?: number;
  wt_quantity?: number;
  rate_value?: number;
  premium?: number;
  sett_pct?: number;
  deduction_rate?: number;
  sett_rate?: number;
  quantity_qtl?: number;
  amount?: number;
  gd_claim?: number;
  gd_sett?: number;
  gd_rev?: number;
  gd_final?: number;
  moist_claim?: number;
  moist_sett?: number;
  moist_rev?: number;
  moist_final?: number;
  dust_claim?: number;
  dust_sett?: number;
  dust_rev?: number;
  dust_final?: number;
  ncv_claim?: number;
  ncv_sett?: number;
  ncv_rev?: number;
  ncv_final?: number;
  po_grade_claim?: number;
  po_grade_sett?: number;
  po_grade_rev?: number;
  po_grade_final?: number;
  adjust_type?: string;
  remark?: string;
  claim_settlement?: number;
  created_at?: string;
}

