import React from "react";

export interface InspectionProps {
  onNavigate?: (page: string) => void;
  onClose?: () => void;
  onLogEvent?: (event: string, details: string) => void;
}

export interface DeductionRow {
  id: string;
  deduction_type: string;
  deduction_rate: number;
  deduction_qty: number;
  deduction_amount: number;
  remarks?: string;
  [key: string]: any;
}

export interface MatchedAutoDeduction {
  type?: string;
  rate: number;
  rateType?: "per_unit" | "per_qntl";
  qty: number;
  amount: number;
  category?: string;
  ruleName?: string;
  badge?: string;
  [key: string]: any;
}

export interface MoistureLogicRule {
  season: string;
  operating_area: string;
  threshold_limit: string;
  [key: string]: any;
}

export interface InspectionMasterRecord {
  id?: string;
  mr_no: string;
  mr_date: string;
  arrival_no: string;
  arrival_date: string;
  po_no: string;
  po_date: string;
  broker_name: string;
  supplier_name: string;
  lorry_number?: string;
  actual_moisture: number;
  claim_moisture: number;
  actual_dust: number;
  claim_dust: number;
  actual_ncv: number;
  claim_ncv: number;
  actual_grade_down?: number;
  claim_grade_down?: number;
  detention_days: number;
  unloading_date: string;
  mill_po_no: string;
  mill_po_date: string;
  mr_spcl_print: string;
  remarks: string;
  delivery_claim?: number;
  deduction_type?: string;
  deduction_types?: string[];
  deduction_rate?: number;
  deduction_qty?: number;
  deduction_amount?: number;
  consignment_no?: string;
  consignment_date?: string;
  mr_print_date?: string;
  advance_amount?: number;
  on_account_advance_amount?: number;
  settlement_amount?: number;
  sent_settlement_date?: string;
  lorry_returned?: string;
  lorry_returned_other_mill?: string;
  arrival_remarks?: string;
  challan_gross_wt?: number;
  receipt_gross_wt?: number;
  total_challan_gross_wt?: number;
  total_receipt_gross_wt?: number;
  arival_apmc_fees?: number;
  insp_remarks?: string;
  status?: string;
  created_at?: string;
  deductions?: DeductionRow[];
  grid_details?: string;
  unit_name?: string;
  [key: string]: any;
}

export type InspectionMaster = InspectionMasterRecord;

export interface InspectionDetailRow {
  id?: string;
  srl_no?: number;
  arrival_grade?: string;
  stock_grade_code?: string;
  stock_grade_name?: string;
  area?: string;
  agency?: string;
  agency_code?: string;
  marka?: string;
  marks?: string;
  crop_year?: string;
  lot?: string;
  quantity?: number | string;
  unit?: string;
  challan_gross_wt?: number | string;
  receipt_gross_wt?: number | string;
  rate?: number | string;
  rate_qntl?: number | string;
  actual_grade_down?: number | string;
  claim_grade_down?: number | string;
  grade_down_act?: number | string;
  grade_down_claim?: number | string;
  settlement_grade_down?: number | string;
  actual_moisture?: number | string;
  claim_moisture?: number | string;
  moisture_act?: number | string;
  moisture_claim?: number | string;
  settlement_moisture?: number | string;
  actual_dust?: number | string;
  claim_dust?: number | string;
  dust_act?: number | string;
  dust_claim?: number | string;
  settlement_dust?: number | string;
  actual_ncv?: number | string;
  claim_ncv?: number | string;
  ncv_act?: number | string;
  ncv_claim?: number | string;
  settlement_ncv?: number | string;
  gross_weight_batch?: number;
  add_weight?: number;
  less_weight?: number;
  reduced_weight?: number;
  lorry_moisture_min?: number;
  lorry_moisture_max?: number;
  lorry_read_min?: number;
  lorry_read_max?: number;
  lorry_read_avg?: number;
  insp_read_min?: number;
  insp_read_max?: number;
  insp_read_avg?: number;
  final_receipt_wt?: number;
  ropes_weight?: number;
  ropes_tot_wt_grd?: number;
  ropes_grade?: string;
  chotta_weight?: number;
  chotta_tot_wt_grd?: number;
  chotta_grade?: string;
  tolerable?: string;
  premium?: string;
  is_premium?: boolean;
  row_remarks?: string;
  jqi_remarks?: string;
  jci_remarks?: string;
  expanded?: boolean;
  is_auto?: boolean;
  amount?: number | string;
  auto_fields?: string[];
  [key: string]: any;
}

export interface DetailFieldConfig {
  key?: string;
  name?: string;
  label: string;
  type: "text" | "number" | "select";
  step?: string;
  options?: string[];
  readOnly?: boolean;
  [key: string]: any;
}

export const detailFieldsConfig: DetailFieldConfig[] = [
  { name: "arrival_grade", key: "arrival_grade", label: "Arrival Grade", type: "text" },
  { name: "stock_grade_code", key: "stock_grade_code", label: "Stock Grade Code", type: "text" },
  { name: "stock_grade_name", key: "stock_grade_name", label: "Stock Grade Name", type: "text" },
  { name: "area", key: "area", label: "Area / Zone", type: "text" },
  { name: "agency", key: "agency", label: "Agency", type: "text" },
  { name: "agency_code", key: "agency_code", label: "Agency Code", type: "text" },
  { name: "marka", key: "marka", label: "Marka", type: "text" },
  { name: "crop_year", key: "crop_year", label: "Crop Year", type: "text" },
  { name: "lot", key: "lot", label: "Lot No.", type: "text" },
  { name: "quantity", key: "quantity", label: "Quantity (Bales/Units)", type: "number" },
  { name: "unit", key: "unit", label: "Unit", type: "select", options: ["BALES", "DRUMS", "LOOSE", "P.BALES", "H.BALES", "BAGS", "KGS", "M.T."] },
  { name: "challan_gross_wt", key: "challan_gross_wt", label: "Challan Gross Wt (MT)", type: "number", step: "0.001" },
  { name: "receipt_gross_wt", key: "receipt_gross_wt", label: "Receipt Gross Wt (MT)", type: "number", step: "0.001" },
  { name: "add_weight", key: "add_weight", label: "Add Weight (MT)", type: "number", step: "0.001" },
  { name: "less_weight", key: "less_weight", label: "Less Weight (MT)", type: "number", step: "0.001" },
  { name: "reduced_weight", key: "reduced_weight", label: "Reduced Weight (MT)", type: "number", step: "0.001" },
  { name: "rate", key: "rate", label: "Rate (₹/Qtl)", type: "number", step: "0.01" },
  { name: "actual_moisture", key: "actual_moisture", label: "Actual Moisture %", type: "number", step: "0.1" },
  { name: "claim_moisture", key: "claim_moisture", label: "Claim Moisture %", type: "number", step: "0.1" },
  { name: "actual_dust", key: "actual_dust", label: "Actual Dust %", type: "number", step: "0.1" },
  { name: "claim_dust", key: "claim_dust", label: "Claim Dust %", type: "number", step: "0.1" },
  { name: "actual_ncv", key: "actual_ncv", label: "Actual NCV %", type: "number", step: "0.1" },
  { name: "claim_ncv", key: "claim_ncv", label: "Claim NCV %", type: "number", step: "0.1" },
  { name: "actual_grade_down", key: "actual_grade_down", label: "Actual Grade Down %", type: "number", step: "0.1" },
  { name: "claim_grade_down", key: "claim_grade_down", label: "Claim Grade Down %", type: "number", step: "0.1" },
  { name: "final_receipt_wt", key: "final_receipt_wt", label: "Final Receipt Wt (MT)", type: "number", step: "0.001" },
  { name: "ropes_weight", key: "ropes_weight", label: "Ropes Weight (Kg)", type: "number", step: "0.01" },
  { name: "ropes_grade", key: "ropes_grade", label: "Ropes Grade", type: "text" },
  { name: "chotta_weight", key: "chotta_weight", label: "Chotta Weight (Kg)", type: "number", step: "0.01" },
  { name: "chotta_grade", key: "chotta_grade", label: "Chotta Grade", type: "text" },
  { name: "tolerable", key: "tolerable", label: "Tolerable", type: "select", options: ["Yes", "No"] },
  { name: "premium", key: "premium", label: "Premium (₹)", type: "text" },
  { name: "row_remarks", key: "row_remarks", label: "Row Remarks", type: "text" },
  { name: "jqi_remarks", key: "jqi_remarks", label: "JQI Remarks", type: "text" },
  { name: "jci_remarks", key: "jci_remarks", label: "JCI Remarks", type: "text" },
];

export interface QualityMatrixCell {
  dept?: number | string;
  claim?: number | string;
  sett?: number | string;
}

export interface QualityMatrixState {
  grade_down: Record<string, QualityMatrixCell>;
  moisture: Record<string, QualityMatrixCell>;
  dust: Record<string, QualityMatrixCell>;
  moc: Record<string, QualityMatrixCell>;
  po_rate: Record<string, QualityMatrixCell>;
}

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
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function safeRenderText(val: any, fallback = "-"): string {
  if (val === null || val === undefined || val === "") return fallback;
  if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
    return String(val);
  }
  if (typeof val === "object") {
    if (typeof val.name === "string") return val.name;
    if (typeof val.supp_name === "string") return val.supp_name;
    if (typeof val.brok_name === "string") return val.brok_name;
    if (typeof val.supplier_name === "string") return val.supplier_name;
    if (typeof val.broker_name === "string") return val.broker_name;
    if (typeof val.area_name === "string") return val.area_name;
    if (typeof val.agency_name === "string") return val.agency_name;
    if (typeof val.marka_name === "string") return val.marka_name;
    if (typeof val.grade_name === "string") return val.grade_name;
    if (val.supplier) return safeRenderText(val.supplier, fallback);
    if (val.broker) return safeRenderText(val.broker, fallback);
    if (val.mr_no) return String(val.mr_no);
    if (val.arrival_no) return String(val.arrival_no);
    if (val.temporary_arrival_no) return String(val.temporary_arrival_no);
    if (val.po_no) return String(val.po_no);
    return fallback;
  }
  return fallback;
}
