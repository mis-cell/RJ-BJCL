import { ArrivalDetailRow } from '../../types';

export type { ArrivalDetailRow };

export interface FinalArrivalRecord {
  final_arrival_id: string;
  financial_year: string;
  final_arrival_no: string;
  mr_no: string | null;
  po_no: string | null;
  po_date: string | null;
  date: string | null;
  jci: string | null;
  challan_supplier: string | null;
  supplier: string | null;
  broker: string | null;
  transporter_name: string | null;
  challan_rr_no: string | null;
  challan_railway_receipt_no?: string | null;
  challan_rr_date: string | null;
  lorry_number: string | null;
  pan_no: string | null;
  consignment_note?: string | null;
  consignment_note_no: string | null;
  consignment_note_date?: string | null;
  di_no: string | null;
  di_date: string | null;
  invoice_no: string | null;
  invoice_date: string | null;
  ptf: string | null;
  arrival_area_code: string | null;
  arrival_area_name: string | null;
  unit_code?: string | null;
  unit_name: string | null;
  total_packets: number | null;
  weight_qtl: number | null;
  remarks: string | null;
  grid_details: any;
  created_at?: string;
  
  // Weighments
  challan_material_weight?: number;
  actual_gross_weight?: number;
  actual_tare_weight?: number;
  supplier_net_weight?: number;
  supplier_challan_gross?: number;
  supplier_tare_weight?: number;
  electronic_net_weight?: number;
  electronic_gross_weight?: number;
  electronic_tare_weight?: number;
  status?: string | null;
  packets?: number | null;
  weight_reduced?: number;
  
  // Quality & Deductions
  actual_moisture?: number;
  claim_moisture?: number;
  actual_dust?: number;
  claim_dust?: number;
  actual_ncv?: number;
  claim_ncv?: number;
  detention_days?: number;
  unloading_date?: string;
}

export interface FinalArrivalEntryFormData {
  financial_year: string;
  arrival_no: string;
  mr_no: string;
  po_no: string;
  po_date: string;
  date: string;
  jci: string;
  jci_no: string;
  challan_supplier: string;
  supplier: string;
  broker: string;
  transporter_name: string;
  challan_rr_no: string;
  challan_railway_receipt_no: string;
  challan_rr_date: string;
  lorry_number: string;
  pan_no: string;
  part_no: string;
  part_date: string;
  consignment_note: string;
  consignment_note_no: string;
  consignment_note_date: string;
  di_no: string;
  di_date: string;
  invoice_no: string;
  invoice_date: string;
  ptf: string;
  rfs: string;
  lorry_returned: string;
  lorry_returned_other_mill: string;
  arrival_area_code: string;
  arrival_area_name: string;
  area: string;
  unit_code: string;
  unit_name: string;
  way_bill_no: string;
  way_bill_date: string;
  rr_gr_no: string;
  apmc_fees: number;
  remarks: string;
  temporary_arrival_no: string;
  temporary_arrival_date: string;

  // Weighments
  challan_material_weight: number;
  actual_gross_weight: number;
  actual_tare_weight: number;
  supplier_net_weight: number;
  supplier_challan_gross: number;
  supplier_tare_weight: number;
  electronic_net_weight: number;
  electronic_gross_weight: number;
  electronic_tare_weight: number;
  weight_reduced: number;
}

export interface FinalArrivalStats {
  totalCount: number;
  totalWeightMt: number;
  totalPackets: number;
  totalVehicles: number;
}

export interface ConflictItemField {
  field: string;
  label: string;
  arrivalVal: any;
  qualityVal: any;
}

export interface DetectedConflict {
  arrivalId: string;
  arrivalNo: string;
  lorryNo: string;
  supplier: string;
  mrNo: string;
  conflicts: ConflictItemField[];
}

export const calculateNetWeightVal = (
  gross: number,
  moisture: number,
  dust: number,
  ncv: number,
  arrivalAreaName: string,
  poDateStr: string,
  generalDateStr?: string
): string => {
  if (!gross) return "";
  
  let month = 0;
  const dateToParse = poDateStr || generalDateStr;
  if (dateToParse) {
    const d = new Date(dateToParse);
    if (!isNaN(d.getTime())) {
      month = d.getMonth();
    }
  }

  const areaNameClean = String(arrivalAreaName || '').toLowerCase();
  const isDaisee = areaNameClean.includes("daisee");
  
  let moistureLimit = 16;
  const isJanToJune = month >= 0 && month <= 5;
  
  if (isJanToJune) {
    if (isDaisee) {
      moistureLimit = 18;
    } else {
      moistureLimit = 16;
    }
  } else {
    if (isDaisee) {
      moistureLimit = 20;
    } else {
      moistureLimit = 18;
    }
  }

  const moistureExcessPct = moisture > moistureLimit ? (moisture - moistureLimit) : 0;
  const totalDeductionPct = moistureExcessPct + dust + ncv;
  const netWeight = gross * (1 - totalDeductionPct / 100);
  return netWeight.toFixed(3);
};

export const getRcptQty = (item: any): number => {
  if (!item) return 0;
  const itemUnit = (item.unit_name || item.unit || item.unit_code || '').toString().trim().toUpperCase();
  if (itemUnit.includes('LOOSE') || itemUnit === 'LOOSE') return 0;

  if (item.grid_details) {
    let grid: any[] = [];
    if (typeof item.grid_details === 'string') {
      try {
        const parsed = item.grid_details === 'undefined' || item.grid_details === 'null' ? [] : JSON.parse(item.grid_details === "undefined" ? "null" : item.grid_details);
        if (Array.isArray(parsed)) grid = parsed;
      } catch (e) {}
    } else if (Array.isArray(item.grid_details)) {
      grid = item.grid_details;
    }
    if (grid.length > 0) {
      let hasRcpt = false;
      let sumRcpt = 0;
      grid.forEach((row: any) => {
        const rowUnit = (row.unit || itemUnit).toString().trim().toUpperCase();
        if (rowUnit.includes('LOOSE') || rowUnit === 'LOOSE') return;
        const val = row.quantity_rcpt !== undefined && row.quantity_rcpt !== null && row.quantity_rcpt !== ''
          ? Number(row.quantity_rcpt)
          : (row.rcpt !== undefined && row.rcpt !== null && row.rcpt !== '' ? Number(row.rcpt) : NaN);
        if (!isNaN(val)) {
          hasRcpt = true;
          sumRcpt += val;
        }
      });
      if (hasRcpt) return sumRcpt;

      const fallback = grid.reduce((acc: number, row: any) => {
        const rowUnit = (row.unit || itemUnit).toString().trim().toUpperCase();
        if (rowUnit.includes('LOOSE') || rowUnit === 'LOOSE') return acc;
        return acc + (Number(row.quantity_rcpt) || Number(row.rcpt) || Number(row.quantity) || Number(row.qty) || 0);
      }, 0);
      if (fallback > 0) return fallback;
    }
  }
  return Number(item.total_packets || item.packets || 0);
};

export const getLowestNetWeight = (item: any): number => {
  if (!item) return 0;
  const nets = [
    Number(item.electronic_net_weight),
    Number(item.supplier_net_weight),
    Number(item.challan_material_weight),
    Number(item.weight_reduced),
    item.weight_qtl ? Number(item.weight_qtl) / 10 : 0,
    Number(item.weight),
    Number(item.quantity)
  ].filter(v => typeof v === 'number' && !isNaN(v) && v > 0);
  return nets.length > 0 ? Math.min(...nets) : 0;
};

export const getQualityParams = (r: any) => {
  let moisture = 16;
  let dust = 0;
  let ncv = 0;
  if (r.grid_details) {
    try {
      const parsed = typeof r.grid_details === 'string' ? (r.grid_details === 'undefined' || r.grid_details === 'null' ? [] : JSON.parse(r.grid_details === "undefined" ? "null" : r.grid_details)) : r.grid_details;
      if (Array.isArray(parsed) && parsed.length > 0) {
        moisture = Number(parsed[0].moisture_pct || parsed[0].moisture || parsed[0].actual_moisture || 16);
        dust = Number(parsed[0].dust_pct || parsed[0].dust || parsed[0].actual_dust || 0);
        ncv = Number(parsed[0].ncv_pct || parsed[0].ncv || parsed[0].actual_ncv || 0);
      }
    } catch (e) {}
  } else {
    moisture = Number(r.moisture_pct || r.actual_moisture || 16);
    dust = Number(r.dust_pct || r.actual_dust || 0);
    ncv = Number(r.ncv_pct || r.actual_ncv || 0);
  }
  return { moisture, dust, ncv };
};
