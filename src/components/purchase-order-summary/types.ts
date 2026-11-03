export interface PurchaseMaster {
  po_id: string;
  financial_year: string;
  po_no: string;
  po_date: string;
  po_type?: string;
  supplier?: string;
  broker?: string;
  total_contract_mt?: number | string;
  pending?: boolean;
  b_rate?: number | string;
  pending_received?: number;
  area?: string;
  arrival_area_name?: string;
  purchase_order?: string;
  ptf_no?: string;
  challan_supplier?: string;
  trans_paid_by?: string;
  weight_unit_kgs?: number | string;
  against_cancellation?: boolean;
  purchase_unit_code?: string;
  purchase_unit_name?: string;
  total_lorries?: number | string;
  units_per_lorry?: number | string;
  total_units?: number | string;
  weight_per_lorry?: number | string;
  marka_type?: string;
  marka_penalty?: number | string;
  qty_penalty?: number | string;
  delivery_from?: string;
  delivery_to?: string;
  grace_days?: number | string;
  delivery_penalty?: number | string;
  contract_po_no?: string;
  contract_date?: string;
  rate_detail?: string;
  delivery_schedule?: string;
  terms_condition?: string;
  remarks?: string;
  po_identification?: string;
  s_date?: string;
}

export interface GroupedSupplier {
  supplier: string;
  total_contract_mt: number;
  orderCount: number;
}

export interface ReportOutput {
  headers: string[];
  rows: (string | number)[][];
  chartType: 'area' | 'bar' | 'hbar' | 'pie' | 'half_circle' | 'line' | 'composed';
  chartData: any[];
  totalMT: number;
  totalCount: number;
}

export const MONTH_LABELS = [
  { value: 'ALL', label: '-- ALL MONTHS --' },
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' }
];

export const PO_REPORTS = [
  { key: 'r1', name: '1. Monthly Procurement Summary', description: 'Month-on-month overview of contract volumes, averages, and net estimate procurement capital.' },
  { key: 'r2', name: '2. Supplier Procurement Ledger', description: 'Procurement ranking and detailed lot sizing ledger summarized by prime selling suppliers.' },
  { key: 'r3', name: '3. Broker Allocations & Market Share', description: 'Volume allocation across authorized agents and independent supply-chain brokers.' },
  { key: 'r4', name: '4. Sourcing Area-wise Audit', description: 'Geographic audit across vital Bihar, Northern, the East Jute variety farm growing regions.' },
  { key: 'r5', name: '5. Quality Grade Distribution Analysis', description: 'Statistical distribution of fine, medium Jute qualities sourced into mill warehouses.' },
  { key: 'r6', name: '6. Delivery Timeline & Compliance Ledger', description: 'Contract operational windows, allowed grace days, and daily late shipment penalty audits.' },
  { key: 'r7', name: '7. Logistics Freight & Lorry Payload Registry', description: 'Vehicle count registry, average units/lorries, and aggregate freight payloads.' },
  { key: 'r8', name: '8. Agency-wide Sourcing Audit', description: 'Sourcing performances and actual transaction lines registered at each localized Agency station.' },
  { key: 'r9', name: '9. Pending Execution Status Log', description: 'Active open order commitments vs warehouse-dispatched fully compiled purchase contracts.' },
  { key: 'r10', name: '10. Base Rate (B-Rate) price Variance GAP', description: 'Granular comparison between theoretical base reference rates and final settled invoice rates.' },
  { key: 'r11', name: '11. Weight Tolerance & Excess/Short Penalty Audit', description: 'Tolerance policy (5% or 1500 kg lower limit), net excess/short calculations, Sauda P.O date to Temp Arrival date TD5 rate difference, and excess penalties.' }
];

export const BAR_COLORS = [
  '#0f766e', '#1d4ed8', '#7e22ce', '#be185d', '#b45309',
  '#15803d', '#334155', '#c2410c', '#4338ca', '#D94B5A'
];
