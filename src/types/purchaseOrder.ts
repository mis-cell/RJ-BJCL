export interface PoItemRow {
  srl: number;
  crop: string;
  grade_code: string;
  grade_name: string;
  agency_code: string;
  agency_name: string;
  marka_code: string;
  marka_name: string;
  qty: number;
  weight: number;
  rate: number;
  premium: number;
}

export interface PoFormData {
  is_ptf: boolean;
  purchase_order: string;
  po_type: string;
  ptf_no: string;
  pending: string;
  no: string;
  date: string;
  broker_code: string;
  broker: string;
  supplier_code: string;
  supplier: string;
  challan_supplier_code: string;
  challan_supplier: string;
  area_code: string;
  area: string;
  trans_paid_by: string;
  weight_unit_kgs: string;
  against_cancellation: string;
  purchase_unit_code: string;
  purchase_unit_name: string;
  total_no_of_lorries: string;
  units_per_lorry: string;
  total_units: string;
  weight_per_lorry: string;
  total_contract_mt: string;
  marka_type: string;
  marka_penalty: string;
  qty_penalty: string;
  delivery_from: string;
  delivery_to: string;
  grace_days: string;
  delivery_penalty: string;
  contract_po_no: string;
  contract_date: string;
  rate_detail: string;
  delivery_schedule: string;
  terms_condition: string;
  remarks: string;
  po_identification: string;
  b_rate: string;
  s_date: string;
  items: PoItemRow[];
}

export interface PoCalcData {
  total_lorries: string;
  units_per_lorry: string;
  total_units: string;
  weight_per_lorry: string;
}

export interface MasterOption {
  code: string;
  name: string;
  [key: string]: any;
}
