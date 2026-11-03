export interface ReconciliationRecord {
  id: string; // unique comparative id
  status: 'fully_matched' | 'mismatch' | 'pending_inspection' | 'orphan_inspection';
  typeLabel: string;
  has_mill_issue?: boolean;
  mill_issue_no?: string;
  
  // Arrival Record values (if exists)
  final_arrival_id?: string;
  final_arrival_no?: string;
  arrival_date?: string;
  lorry_number?: string;
  arrival_supplier?: string;
  arrival_po?: string;
  arrival_moisture?: number;
  arrival_dust?: number;
  arrival_ncv?: number;
  
  // Inspection Record values (if exists)
  mr_no?: string;
  inspection_date?: string;
  inspection_supplier?: string;
  inspection_po?: string;
  inspection_moisture?: number;
  inspection_dust?: number;
  inspection_ncv?: number;

  // Comparative Quantity/Weight Metrics
  expected_qty?: number;
  actual_qty?: number;
  expected_weight?: number;
  actual_weight?: number;

  // Specific discrepancies
  mismatches: {
    field: string;
    label: string;
    arrivalVal: any;
    inspectionVal: any;
  }[];
}
