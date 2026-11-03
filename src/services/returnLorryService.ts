import { supabase } from '../lib/supabase';
import { dbModule, notifyDataChanged } from './dbModule';

export interface ReturnLorryItemRow {
  id?: string;
  return_po_no: string;
  reference_po_no: string;
  mr_no?: string;
  srl_no: number;
  crop_year: string;
  grade_code: string;
  grade_name: string;
  arrival_grade?: string;
  stock_grade_code?: string;
  stock_grade_name?: string;
  area?: string;
  agency_code: string;
  agency_name: string;
  marka_code: string;
  marka_name: string;
  lot?: string;
  unit?: string;
  quantity: number;
  weight_mt: number;
  challan_gross_wt?: number;
  receipt_gross_wt?: number;
  final_receipt_wt?: number;
  rate_qntl: number;
  premium: number | string;
  actual_moisture?: number;
  claim_moisture?: number;
  settlement_moisture?: number;
  actual_dust?: number;
  claim_dust?: number;
  settlement_dust?: number;
  actual_ncv?: number;
  claim_ncv?: number;
  settlement_ncv?: number;
  actual_grade_down?: number;
  claim_grade_down?: number;
  settlement_grade_down?: number;
  ropes_weight?: number;
  ropes_grade?: string;
  chotta_weight?: number;
  chotta_grade?: string;
  tolerable?: string;
  row_remarks?: string;
  jqi_remarks?: string;
  jci_remarks?: string;
}

export interface ReturnLorryRecord {
  id?: string;
  // Core Return Lorry 4000-Series & Reference PO Identity
  new_po_no: string; // 4000 series PO e.g. BJCL/2026-2027/4000
  po_no: string; // Alias for new_po_no for seamless Payment & Settlement compatibility
  reference_po_no: string; // Original P.O. / M.R. reference from Mill Inspection

  // ============================================================================
  // ALL MILL INSPECTION ("material_inspection") FIELDS
  // ============================================================================
  mr_no: string;
  mr_date: string;
  final_arrival_no: string;
  temporary_arrival_no: string;
  arrival_no: string;
  arrival_date: string;
  unloading_date: string;
  mill_po_no: string;
  mill_po_date: string;
  mr_spcl_print: string; // Way Bill No.
  broker_name: string;
  supplier_name: string;
  lorry_number: string;
  lorry_sequence_no: number;
  received_weight_mt: number; // < 5 MT received weight
  challan_gross_wt: number;
  receipt_gross_wt: number;
  total_challan_gross_wt: number;
  total_receipt_gross_wt: number;
  actual_moisture: number;
  claim_moisture: number;
  actual_dust: number;
  claim_dust: number;
  actual_ncv: number;
  claim_ncv: number;
  actual_grade_down: number;
  claim_grade_down: number;
  detention_days: number;
  delivery_claim: number;
  deduction_type: string;
  deduction_rate: number;
  deduction_qty: number;
  deduction_amount: number;
  advance_amount: number;
  on_account_advance_amount: number;
  settlement_amount: number;
  sent_settlement_date: string;
  lorry_returned: string;
  lorry_returned_other_mill: string;
  mr_print_date: string;
  consignment_no: string;
  consignment_date: string;
  arival_apmc_fees: number;
  arrival_remarks: string;
  insp_remarks: string;
  unit_name: string;
  quality_matrix?: any;
  inspection_details?: any[];
  grid_details?: any[];

  // ============================================================================
  // SAUDA CHECK POINT FORM STRUCTURE FIELDS (PRE-FILLED FROM MILL INSPECTION)
  // ============================================================================
  financial_year: string;
  purchase_order: string;
  po_type: string;
  status: string;
  ptf_no?: string | null;
  pending: boolean;
  po_date: string;
  s_date?: string | null;
  broker_code?: string;
  broker: string;
  supplier_code?: string;
  supplier: string;
  challan_supplier_code?: string;
  challan_supplier: string;
  area_code?: string;
  area: string;
  trans_paid_by: string;
  weight_unit_kgs: number;
  against_cancellation: string;
  purchase_unit_code: string;
  purchase_unit_name: string;
  total_lorries: number;
  units_per_lorry: number;
  total_units: number;
  weight_per_lorry: number;
  total_contract_mt: number;
  marka_type: string;
  marka_penalty: number;
  qty_penalty: number;
  delivery_from?: string | null;
  delivery_to?: string | null;
  shipment_date?: string | null;
  grace_days: number;
  shipment_days: number;
  delivery_penalty: number;
  shipment_penalty: number;
  contract_po_no: string;
  sauda_no: string;
  contract_date?: string | null;
  rate_detail: string;
  delivery_schedule: string;
  terms_condition: string;
  remarks: string;
  po_remarks: string;
  po_identification: string;
  b_rate: number;
  is_return_lorry: boolean;
  saved_to_sauda_checkpoint?: boolean;
  created_at?: string;
  items?: ReturnLorryItemRow[];
  sauda_details?: any[];
  raw_inspection?: Record<string, any>;
  raw_sauda_check_point?: Record<string, any>;
}

const LOCAL_STORAGE_KEY = 'bjcl_return_lorry_records_v3';

function getLocalCachedReturnLorries(): ReturnLorryRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw || raw === 'undefined' || raw === 'null') return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setLocalCachedReturnLorries(records: ReturnLorryRecord[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // ignore storage quota errors
  }
}

let schemaInitStarted = false;

/**
 * Ensures the `return_lorry` and `return_lorry_details` tables exist in Supabase.
 * Runs non-blockingly with a short timeout so it never hangs page rendering.
 */
export async function ensureReturnLorryTablesExist(): Promise<void> {
  if (schemaInitStarted || !supabase) return;
  schemaInitStarted = true;

  const sql = `
    CREATE TABLE IF NOT EXISTS return_lorry (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      new_po_no TEXT UNIQUE NOT NULL,
      po_no TEXT NOT NULL,
      reference_po_no TEXT NOT NULL,
      mr_no TEXT NOT NULL,
      mr_date TEXT,
      final_arrival_no TEXT,
      temporary_arrival_no TEXT,
      arrival_no TEXT,
      arrival_date TEXT,
      unloading_date TEXT,
      mill_po_no TEXT,
      mill_po_date TEXT,
      mr_spcl_print TEXT,
      broker_name TEXT,
      supplier_name TEXT,
      lorry_number TEXT,
      lorry_sequence_no INTEGER DEFAULT 1,
      received_weight_mt NUMERIC(15,3) DEFAULT 0,
      challan_gross_wt NUMERIC(15,3) DEFAULT 0,
      receipt_gross_wt NUMERIC(15,3) DEFAULT 0,
      total_challan_gross_wt NUMERIC(15,3) DEFAULT 0,
      total_receipt_gross_wt NUMERIC(15,3) DEFAULT 0,
      actual_moisture NUMERIC(10,2) DEFAULT 0,
      claim_moisture NUMERIC(10,2) DEFAULT 0,
      actual_dust NUMERIC(10,2) DEFAULT 0,
      claim_dust NUMERIC(10,2) DEFAULT 0,
      actual_ncv NUMERIC(10,2) DEFAULT 0,
      claim_ncv NUMERIC(10,2) DEFAULT 0,
      actual_grade_down NUMERIC(10,2) DEFAULT 0,
      claim_grade_down NUMERIC(10,2) DEFAULT 0,
      detention_days INTEGER DEFAULT 0,
      delivery_claim NUMERIC(15,2) DEFAULT 0,
      deduction_type TEXT,
      deduction_rate NUMERIC(15,2) DEFAULT 0,
      deduction_qty NUMERIC(15,3) DEFAULT 0,
      deduction_amount NUMERIC(15,2) DEFAULT 0,
      advance_amount NUMERIC(15,2) DEFAULT 0,
      on_account_advance_amount NUMERIC(15,2) DEFAULT 0,
      settlement_amount NUMERIC(15,2) DEFAULT 0,
      sent_settlement_date TEXT,
      lorry_returned TEXT DEFAULT 'Yes',
      lorry_returned_other_mill TEXT DEFAULT 'No',
      mr_print_date TEXT,
      consignment_no TEXT,
      consignment_date TEXT,
      arival_apmc_fees NUMERIC(15,2) DEFAULT 0,
      arrival_remarks TEXT,
      insp_remarks TEXT,
      unit_name TEXT,
      quality_matrix JSONB DEFAULT '{}'::jsonb,
      inspection_details JSONB DEFAULT '[]'::jsonb,
      grid_details JSONB DEFAULT '[]'::jsonb,
      financial_year TEXT DEFAULT '2026-2027',
      purchase_order TEXT DEFAULT 'FINAL PO',
      po_type TEXT DEFAULT 'Return Lorry',
      status TEXT DEFAULT 'open',
      ptf_no TEXT,
      pending BOOLEAN DEFAULT TRUE,
      po_date TEXT,
      s_date TEXT,
      broker_code TEXT,
      broker TEXT,
      supplier_code TEXT,
      supplier TEXT,
      challan_supplier_code TEXT,
      challan_supplier TEXT,
      area_code TEXT,
      area TEXT,
      trans_paid_by TEXT DEFAULT 'PARTY',
      weight_unit_kgs NUMERIC(10,2) DEFAULT 147.5,
      against_cancellation TEXT DEFAULT 'No',
      purchase_unit_code TEXT DEFAULT '1',
      purchase_unit_name TEXT DEFAULT 'BALES',
      total_lorries NUMERIC(10,2) DEFAULT 1,
      units_per_lorry NUMERIC(10,2) DEFAULT 0,
      total_units NUMERIC(10,2) DEFAULT 0,
      weight_per_lorry NUMERIC(15,3) DEFAULT 0,
      total_contract_mt NUMERIC(15,3) DEFAULT 0,
      marka_type TEXT DEFAULT 'Normal',
      marka_penalty NUMERIC(10,2) DEFAULT 0,
      qty_penalty NUMERIC(10,2) DEFAULT 0,
      delivery_from TEXT,
      delivery_to TEXT,
      shipment_date TEXT,
      grace_days INTEGER DEFAULT 0,
      shipment_days INTEGER DEFAULT 0,
      delivery_penalty NUMERIC(10,2) DEFAULT 0,
      shipment_penalty NUMERIC(10,2) DEFAULT 0,
      contract_po_no TEXT,
      sauda_no TEXT,
      contract_date TEXT,
      rate_detail TEXT,
      delivery_schedule TEXT,
      terms_condition TEXT,
      remarks TEXT,
      po_remarks TEXT,
      po_identification TEXT DEFAULT 'Direct Advance Payment',
      b_rate NUMERIC(15,2) DEFAULT 0,
      sauda_details JSONB DEFAULT '[]'::jsonb,
      is_return_lorry BOOLEAN DEFAULT TRUE,
      saved_to_sauda_checkpoint BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE IF EXISTS return_lorry ADD COLUMN IF NOT EXISTS saved_to_sauda_checkpoint BOOLEAN DEFAULT FALSE;

    CREATE TABLE IF NOT EXISTS return_lorry_details (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      return_po_no TEXT NOT NULL,
      reference_po_no TEXT NOT NULL,
      mr_no TEXT,
      srl_no INTEGER DEFAULT 1,
      crop_year TEXT DEFAULT '2026-27',
      grade_code TEXT,
      grade_name TEXT,
      arrival_grade TEXT,
      stock_grade_code TEXT,
      stock_grade_name TEXT,
      area TEXT,
      agency_code TEXT,
      agency_name TEXT,
      marka_code TEXT,
      marka_name TEXT,
      lot TEXT,
      unit TEXT DEFAULT 'BALES',
      quantity NUMERIC(15,3) DEFAULT 0,
      weight_mt NUMERIC(15,3) DEFAULT 0,
      challan_gross_wt NUMERIC(15,3) DEFAULT 0,
      receipt_gross_wt NUMERIC(15,3) DEFAULT 0,
      final_receipt_wt NUMERIC(15,3) DEFAULT 0,
      rate_qntl NUMERIC(15,2) DEFAULT 0,
      premium NUMERIC(15,2) DEFAULT 0,
      actual_moisture NUMERIC(10,2) DEFAULT 0,
      claim_moisture NUMERIC(10,2) DEFAULT 0,
      actual_dust NUMERIC(10,2) DEFAULT 0,
      claim_dust NUMERIC(10,2) DEFAULT 0,
      actual_ncv NUMERIC(10,2) DEFAULT 0,
      claim_ncv NUMERIC(10,2) DEFAULT 0,
      actual_grade_down NUMERIC(10,2) DEFAULT 0,
      claim_grade_down NUMERIC(10,2) DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE IF EXISTS return_lorry DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS return_lorry_details DISABLE ROW LEVEL SECURITY;
    NOTIFY pgrst, 'reload schema';
  `;

  Promise.race([
    (async () => {
      try {
        await supabase.rpc('exec_sql', { query: sql }).then(() => {}, () => {});
        await supabase.rpc('exec_sql', { sql_query: sql }).then(() => {}, () => {});
      } catch (_e) {
        // ignore if exec_sql RPC is not enabled
      }
    })(),
    new Promise<void>((resolve) => setTimeout(resolve, 2500)),
  ]).catch(() => {});
}

export function normalizeStr(v: any): string {
  return String(v || '').trim().toUpperCase();
}

export function extractCanonicalPoSerial(raw: any): string {
  const str = normalizeStr(raw);
  if (!str || str === 'NO' || str === 'N/A' || str === 'NONE') return '';
  const withoutPrefix = str
    .replace(/^#/, '')
    .replace(/^BJCL\//i, '')
    .replace(/^BJC\//i, '')
    .replace(/^BJC/i, '')
    .replace(/^PO[-/]/i, '')
    .replace(/^PTF[-/]/i, '')
    .replace(/\(PTF\)/gi, '');
  const withoutYear = withoutPrefix
    .replace(/20\d{2}-20\d{2}/g, '')
    .replace(/20\d{2}\/20\d{2}/g, '')
    .replace(/20\d{2}20\d{2}/g, '')
    .replace(/\/\d{2}-\d{2}$/g, '')
    .replace(/^\d{2}-\d{2}\//g, '')
    .replace(/[^0-9A-Z]/g, '');
  if (!withoutYear) return '';
  return withoutYear.replace(/^0+/, '') || '0';
}

export function is4000SeriesPo(poNo: any): boolean {
  const s = normalizeStr(poNo);
  if (!s) return false;
  const parts = s.split('/');
  const last = parts[parts.length - 1]?.replace(/[^0-9]/g, '') || '';
  const num = parseInt(last, 10);
  return !isNaN(num) && num >= 4000 && num < 5000;
}

/**
 * Calculates the received weight in Metric Tons (MT) strictly from a Mill Inspection record
 * and its detail rows (`material_inspection_details` / `mill_inspection_detail`).
 */
export function calculateInspectionWeightMt(
  inspectionRecord: any,
  detailRows?: any[],
  _finalArrivalRecord?: any,
  _tempArrivalRecord?: any
): number {
  const toMt = (val: number, unitHint?: 'MT' | 'QTL' | 'KG'): number => {
    if (!isFinite(val) || val <= 0) return 0;
    if (unitHint === 'QTL') return Number((val / 10).toFixed(3));
    if (unitHint === 'KG') return Number((val / 1000).toFixed(3));
    if (val > 500) return Number((val / 1000).toFixed(3)); // Kgs -> MT
    if (val > 40) return Number((val / 10).toFixed(3)); // Quintals -> MT
    return Number(val.toFixed(3)); // Already MT
  };

  // 1. Check detail rows (from material_inspection_details / mill_inspection_detail / grid_details)
  const rows: any[] = Array.isArray(detailRows) && detailRows.length > 0
    ? detailRows
    : (() => {
        const gd = inspectionRecord?.grid_details ?? inspectionRecord?.details ?? inspectionRecord?.inspection_details;
        if (Array.isArray(gd)) return gd;
        if (typeof gd === 'string' && gd.trim().startsWith('[')) {
          try {
            const parsed = JSON.parse(gd);
            if (Array.isArray(parsed)) return parsed;
          } catch {}
        }
        return [];
      })();

  if (rows.length > 0) {
    let sum = 0;
    for (const r of rows) {
      const rw = Number(
        r.receipt_gross_wt ||
        r.final_receipt_wt ||
        r.challan_gross_wt ||
        r.netto_pnto ||
        r.netto_mt ||
        r.weight_mt ||
        r.reduced_weight ||
        r.gross_weight_batch ||
        r.weight ||
        r.weight_kgs ||
        0
      );
      if (rw > 0) {
        sum += toMt(rw);
      }
    }
    if (sum > 0) return Number(sum.toFixed(3));
  }

  // 2. Check master fields on inspectionRecord
  if (inspectionRecord) {
    if (Number(inspectionRecord.weight_qtl) > 0) {
      return toMt(Number(inspectionRecord.weight_qtl), 'QTL');
    }
    const masterCandidates = [
      inspectionRecord.received_weight_mt,
      inspectionRecord.total_receipt_gross_wt,
      inspectionRecord.receipt_gross_wt,
      inspectionRecord.total_challan_gross_wt,
      inspectionRecord.challan_gross_wt,
      inspectionRecord.actual_weight,
      inspectionRecord.net_weight,
      inspectionRecord.electronic_net_weight,
      inspectionRecord.total_actual_weight,
      inspectionRecord.final_receipt_wt,
      inspectionRecord.weight,
    ];
    for (const c of masterCandidates) {
      const n = Number(c);
      if (n > 0) return toMt(n);
    }
  }

  return 0;
}

/**
 * Generates the next 4000-series PO number based on the reference PO prefix/financial year.
 * Example: `BJCL/2026-2027/4000`, `BJCL/2026-2027/4001`, etc.
 */
export function generate4000SeriesPoNoFromSet(
  referencePoNo: string,
  financialYear: string = '2026-2027',
  usedNumbers: Set<number>
): string {
  let prefix = `BJCL/${financialYear || '2026-2027'}`;
  const cleanRef = String(referencePoNo || '').trim().toUpperCase();
  if (cleanRef.includes('/')) {
    const parts = cleanRef.split('/');
    if (parts.length >= 3 && parts[0].startsWith('BJC')) {
      prefix = `${parts[0]}/${parts[1]}`;
    } else if (parts.length === 2 && parts[0].startsWith('BJC')) {
      prefix = `${parts[0]}/${financialYear || '2026-2027'}`;
    }
  }

  let candidate = 4000;
  while (usedNumbers.has(candidate)) {
    candidate++;
  }
  usedNumbers.add(candidate);
  return `${prefix}/${candidate}`;
}

export async function generateNext4000SeriesPoNo(
  referencePoNo?: string,
  financialYear: string = '2026-2027'
): Promise<string> {
  const usedNumbers = new Set<number>();
  const addFromPo = (poStr: any) => {
    const s = normalizeStr(poStr);
    if (!s) return;
    const parts = s.split('/');
    const last = parts[parts.length - 1]?.replace(/[^0-9]/g, '') || '';
    const num = parseInt(last, 10);
    if (!isNaN(num) && num >= 4000 && num < 5000) {
      usedNumbers.add(num);
    }
  };

  getLocalCachedReturnLorries().forEach((r) => {
    addFromPo(r.new_po_no);
    addFromPo(r.po_no);
  });

  if (supabase) {
    try {
      const [rlRes, scpRes, pmRes] = await Promise.all([
        supabase.from('return_lorry').select('new_po_no, po_no').then((r) => r, () => ({ data: [] as any[] })),
        supabase.from('sauda_check_point').select('po_no').ilike('po_no', '%/4%').then((r) => r, () => ({ data: [] as any[] })),
        supabase.from('purchase_master').select('po_no').ilike('po_no', '%/4%').then((r) => r, () => ({ data: [] as any[] })),
      ]);
      ((rlRes as any)?.data || []).forEach((r: any) => {
        addFromPo(r.new_po_no);
        addFromPo(r.po_no);
      });
      ((scpRes as any)?.data || []).forEach((r: any) => addFromPo(r.po_no));
      ((pmRes as any)?.data || []).forEach((r: any) => addFromPo(r.po_no));
    } catch {}
  }

  return generate4000SeriesPoNoFromSet(referencePoNo || '', financialYear, usedNumbers);
}

/**
 * Helper to build a `ReturnLorryRecord` strictly from Mill Inspection
 * (`material_inspection` + `material_inspection_details` / `mill_inspection_detail`).
 * All fields are pre-filled from Mill Inspection, and Rate is left for manual user input
 * unless already saved by the user in `return_lorry`.
 */
export function buildCombinedReturnLorryRecord(params: {
  newPoNo: string;
  referencePoNo: string;
  insp: any;
  inspDetails: any[];
  sourcePo?: any;
  sourcePoDetails?: any[];
  matchedFa?: any;
  matchedTmr?: any;
  weightMt: number;
  lorrySeqNo: number;
  existingSavedRl?: any;
  existingSavedRlDetails?: any[];
  isSavedToScp?: boolean;
}): ReturnLorryRecord {
  const {
    newPoNo,
    referencePoNo,
    insp,
    inspDetails,
    weightMt,
    lorrySeqNo,
    existingSavedRl,
    existingSavedRlDetails = [],
    isSavedToScp = false,
  } = params;

  const todayStr = new Date().toISOString().split('T')[0];
  const mrNo = String(insp?.mr_no || '').trim();
  const tempArrNo = String(
    insp?.arrival_no ||
    insp?.temporary_arrival_no ||
    mrNo
  ).trim();
  const lorryNo = String(insp?.lorry_number || '').trim().toUpperCase();

  const fy = String(insp?.financial_year || '2026-2027').trim();

  const poDate = String(
    insp?.po_date ||
    insp?.mill_po_date ||
    insp?.mr_date ||
    insp?.arrival_date ||
    todayStr
  ).trim();

  const supplierVal = String(
    insp?.supplier_name ||
    insp?.supplier ||
    ''
  ).trim().toUpperCase();

  const brokerVal = String(
    insp?.broker_name ||
    insp?.broker ||
    ''
  ).trim().toUpperCase();

  const areaVal = String(
    inspDetails?.[0]?.area ||
    insp?.area ||
    ''
  ).trim().toUpperCase();

  const toMtVal = (val: number): number => {
    if (!isFinite(val) || val <= 0) return 0;
    if (val > 500) return Number((val / 1000).toFixed(3));
    if (val > 40) return Number((val / 10).toFixed(3));
    return Number(val.toFixed(3));
  };

  const challanGrossSum = inspDetails.reduce((s, r) => s + toMtVal(Number(r.challan_gross_wt) || 0), 0);
  const receiptGrossSum = inspDetails.reduce((s, r) => s + toMtVal(Number(r.receipt_gross_wt ?? r.challan_gross_wt) || 0), 0);

  let parsedQualityMatrix: any = insp?.quality_matrix || {};
  if (typeof parsedQualityMatrix === 'string') {
    try {
      parsedQualityMatrix = JSON.parse(parsedQualityMatrix);
    } catch {
      parsedQualityMatrix = {};
    }
  }

  // Build item rows strictly from Mill Inspection detail rows (`material_inspection_details` / `mill_inspection_detail`)
  const rowCount = Math.max(inspDetails.length, 1);
  const combinedItems: ReturnLorryItemRow[] = [];

  for (let i = 0; i < rowCount; i++) {
    const idet = inspDetails[i] || {};
    const savedDet = existingSavedRlDetails[i] || {};

    const gradeCode = String(
      idet.stock_grade_code ||
      idet.arrival_grade ||
      idet.grade_code ||
      savedDet.grade_code ||
      'TD5'
    ).trim().toUpperCase();
    const gradeName = String(
      idet.stock_grade_name ||
      idet.arrival_grade ||
      idet.grade_name ||
      savedDet.grade_name ||
      gradeCode
    ).trim().toUpperCase();
    const agencyCode = String(idet.agency_code || idet.agency || savedDet.agency_code || '').trim().toUpperCase();
    const agencyName = String(idet.agency || idet.agency_name || savedDet.agency_name || agencyCode).trim().toUpperCase();
    const markaCode = String(idet.marka_code || idet.marka || idet.marks || savedDet.marka_code || '').trim().toUpperCase();
    const markaName = String(idet.marka || idet.marka_name || idet.marks || savedDet.marka_name || markaCode).trim().toUpperCase();

    const rowWtRaw = Number(idet.receipt_gross_wt || idet.challan_gross_wt || idet.weight_mt || 0);
    const rowWtMt = rowWtRaw > 0 ? toMtVal(rowWtRaw) : (i === 0 ? weightMt : 0);
    const rowChallanMt = Number(idet.challan_gross_wt) > 0 ? toMtVal(Number(idet.challan_gross_wt)) : rowWtMt;

    // Rate is only populated if previously saved by user; otherwise 0 so user manually inputs it
    const savedRate = isSavedToScp
      ? Number(savedDet.rate_qntl || existingSavedRl?.b_rate || 0)
      : 0;

    combinedItems.push({
      return_po_no: newPoNo,
      reference_po_no: referencePoNo,
      mr_no: mrNo,
      srl_no: Number(idet.srl_no || i + 1),
      crop_year: String(idet.crop_year || '2026-27'),
      grade_code: gradeCode,
      grade_name: gradeName,
      arrival_grade: String(idet.arrival_grade || gradeName).toUpperCase(),
      stock_grade_code: String(idet.stock_grade_code || gradeCode).toUpperCase(),
      stock_grade_name: String(idet.stock_grade_name || gradeName).toUpperCase(),
      area: String(idet.area || areaVal).toUpperCase(),
      agency_code: agencyCode,
      agency_name: agencyName,
      marka_code: markaCode,
      marka_name: markaName,
      lot: String(idet.lot || ''),
      unit: String(idet.unit || insp?.unit_name || 'BALES').toUpperCase(),
      quantity: Number(idet.quantity || 0),
      weight_mt: rowWtMt,
      challan_gross_wt: rowChallanMt,
      receipt_gross_wt: rowWtMt,
      final_receipt_wt: rowWtMt,
      rate_qntl: savedRate,
      premium: Number(idet.premium ?? savedDet.premium ?? 0),
      actual_moisture: Number(idet.actual_moisture ?? idet.moisture_act ?? insp?.actual_moisture ?? 0),
      claim_moisture: Number(idet.claim_moisture ?? idet.moisture_claim ?? insp?.claim_moisture ?? 0),
      settlement_moisture: Number(idet.settlement_moisture ?? 0),
      actual_dust: Number(idet.actual_dust ?? idet.dust_act ?? insp?.actual_dust ?? 0),
      claim_dust: Number(idet.claim_dust ?? idet.dust_claim ?? insp?.claim_dust ?? 0),
      settlement_dust: Number(idet.settlement_dust ?? 0),
      actual_ncv: Number(idet.actual_ncv ?? idet.ncv_act ?? insp?.actual_ncv ?? 0),
      claim_ncv: Number(idet.claim_ncv ?? idet.ncv_claim ?? insp?.claim_ncv ?? 0),
      settlement_ncv: Number(idet.settlement_ncv ?? 0),
      actual_grade_down: Number(idet.actual_grade_down ?? idet.grade_down_act ?? insp?.actual_grade_down ?? 0),
      claim_grade_down: Number(idet.claim_grade_down ?? idet.grade_down_claim ?? insp?.claim_grade_down ?? 0),
      settlement_grade_down: Number(idet.settlement_grade_down ?? 0),
      ropes_weight: Number(idet.ropes_weight || 0),
      ropes_grade: String(idet.ropes_grade || ''),
      chotta_weight: Number(idet.chotta_weight || 0),
      chotta_grade: String(idet.chotta_grade || ''),
      tolerable: String(idet.tolerable || 'Yes'),
      row_remarks: String(idet.row_remarks || ''),
      jqi_remarks: String(idet.jqi_remarks || ''),
      jci_remarks: String(idet.jci_remarks || ''),
    });
  }

  const totalQty = combinedItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const unitName = String(inspDetails?.[0]?.unit || insp?.unit_name || 'BALES').toUpperCase();
  const savedBaseRate = isSavedToScp ? Number(existingSavedRl?.b_rate || combinedItems?.[0]?.rate_qntl || 0) : 0;

  return {
    new_po_no: newPoNo,
    po_no: newPoNo,
    reference_po_no: referencePoNo,

    // Mill Inspection ("material_inspection") complete fields
    mr_no: mrNo,
    mr_date: String(insp?.mr_date || todayStr),
    final_arrival_no: mrNo,
    temporary_arrival_no: tempArrNo,
    arrival_no: tempArrNo,
    arrival_date: String(insp?.arrival_date || insp?.mr_date || todayStr),
    unloading_date: String(insp?.unloading_date || insp?.arrival_date || insp?.mr_date || todayStr),
    mill_po_no: String(insp?.mill_po_no || insp?.po_no || referencePoNo),
    mill_po_date: String(insp?.mill_po_date || insp?.po_date || poDate),
    mr_spcl_print: String(insp?.mr_spcl_print || ''),
    broker_name: brokerVal,
    supplier_name: supplierVal,
    lorry_number: lorryNo,
    lorry_sequence_no: lorrySeqNo,
    received_weight_mt: Number(weightMt.toFixed(3)),
    challan_gross_wt: Number((challanGrossSum || weightMt).toFixed(3)),
    receipt_gross_wt: Number((receiptGrossSum || challanGrossSum || weightMt).toFixed(3)),
    total_challan_gross_wt: Number((challanGrossSum || weightMt).toFixed(3)),
    total_receipt_gross_wt: Number((receiptGrossSum || challanGrossSum || weightMt).toFixed(3)),
    actual_moisture: Number(insp?.actual_moisture ?? inspDetails?.[0]?.actual_moisture ?? 0),
    claim_moisture: Number(insp?.claim_moisture ?? inspDetails?.[0]?.claim_moisture ?? 0),
    actual_dust: Number(insp?.actual_dust ?? inspDetails?.[0]?.actual_dust ?? 0),
    claim_dust: Number(insp?.claim_dust ?? inspDetails?.[0]?.claim_dust ?? 0),
    actual_ncv: Number(insp?.actual_ncv ?? inspDetails?.[0]?.actual_ncv ?? 0),
    claim_ncv: Number(insp?.claim_ncv ?? inspDetails?.[0]?.claim_ncv ?? 0),
    actual_grade_down: Number(insp?.actual_grade_down ?? inspDetails?.[0]?.actual_grade_down ?? 0),
    claim_grade_down: Number(insp?.claim_grade_down ?? inspDetails?.[0]?.claim_grade_down ?? 0),
    detention_days: Number(insp?.detention_days || 0),
    delivery_claim: Number(insp?.delivery_claim || 0),
    deduction_type: String(insp?.deduction_type || ''),
    deduction_rate: Number(insp?.deduction_rate || 0),
    deduction_qty: Number(insp?.deduction_qty || 0),
    deduction_amount: Number(insp?.deduction_amount || 0),
    advance_amount: Number(insp?.advance_amount || 0),
    on_account_advance_amount: Number(insp?.on_account_advance_amount || 0),
    settlement_amount: Number(insp?.settlement_amount || 0),
    sent_settlement_date: String(insp?.sent_settlement_date || ''),
    lorry_returned: 'Yes',
    lorry_returned_other_mill: String(insp?.lorry_returned_other_mill || 'No'),
    mr_print_date: String(insp?.mr_print_date || insp?.mr_date || todayStr),
    consignment_no: String(insp?.consignment_no || ''),
    consignment_date: String(insp?.consignment_date || insp?.arrival_date || todayStr),
    arival_apmc_fees: Number(insp?.arival_apmc_fees || 0),
    arrival_remarks: String(insp?.arrival_remarks || ''),
    insp_remarks: String(insp?.insp_remarks || insp?.remarks || ''),
    unit_name: unitName,
    quality_matrix: parsedQualityMatrix,
    inspection_details: inspDetails,
    grid_details: inspDetails,

    // Sauda Check Point Form structure fields (pre-filled strictly from Mill Inspection)
    financial_year: fy,
    purchase_order: 'FINAL PO',
    po_type: 'Normal',
    status: 'open',
    ptf_no: null,
    pending: true,
    po_date: poDate,
    s_date: String(insp?.mr_date || poDate),
    broker_code: '',
    broker: brokerVal,
    supplier_code: '',
    supplier: supplierVal,
    challan_supplier_code: '',
    challan_supplier: supplierVal,
    area_code: '',
    area: areaVal,
    trans_paid_by: 'PARTY',
    weight_unit_kgs: 147.5,
    against_cancellation: 'No',
    purchase_unit_code: '1',
    purchase_unit_name: unitName,
    total_lorries: 1,
    units_per_lorry: totalQty,
    total_units: totalQty,
    weight_per_lorry: Number(weightMt.toFixed(3)),
    total_contract_mt: Number(weightMt.toFixed(3)),
    marka_type: 'Normal',
    marka_penalty: 0,
    qty_penalty: 0,
    delivery_from: String(insp?.arrival_date || insp?.mr_date || todayStr),
    delivery_to: String(insp?.unloading_date || insp?.arrival_date || insp?.mr_date || todayStr),
    shipment_date: String(insp?.unloading_date || insp?.arrival_date || insp?.mr_date || todayStr),
    grace_days: Number(insp?.detention_days || 0),
    shipment_days: Number(insp?.detention_days || 0),
    delivery_penalty: Number(insp?.delivery_claim || 0),
    shipment_penalty: Number(insp?.delivery_claim || 0),
    contract_po_no: referencePoNo,
    sauda_no: referencePoNo,
    contract_date: String(insp?.mill_po_date || insp?.po_date || insp?.mr_date || todayStr),
    rate_detail: '',
    delivery_schedule: '',
    terms_condition: '',
    remarks: String(
      insp?.remarks ||
      insp?.arrival_remarks ||
      `Return Lorry (< 5 MT: ${weightMt.toFixed(3)} MT) from Mill Inspection M.R. ${mrNo}`
    ),
    po_remarks: String(insp?.remarks || insp?.arrival_remarks || ''),
    po_identification: 'Direct Advance Payment',
    b_rate: savedBaseRate,
    is_return_lorry: true,
    saved_to_sauda_checkpoint: isSavedToScp,
    created_at: insp?.created_at || new Date().toISOString(),
    items: combinedItems,
    sauda_details: [],
    raw_inspection: insp || {},
    raw_sauda_check_point: {},
  };
}

/**
 * Saves a Return Lorry record after the user manually inputs the Rate in Return Lorry Desk,
 * auto-generates the 4000-series P.O. number (if not yet generated), and moves/inserts the
 * record into `sauda_check_point` & `sauda_check_point_details` (plus `purchase_master` & `purchase_detail_master`).
 */
export async function saveReturnLorryToSaudaCheckPoint(
  record: ReturnLorryRecord
): Promise<ReturnLorryRecord> {
  ensureReturnLorryTablesExist();

  let finalPoNo = record.new_po_no;
  if (!finalPoNo || !is4000SeriesPo(finalPoNo)) {
    finalPoNo = await generateNext4000SeriesPoNo(record.reference_po_no, record.financial_year || '2026-2027');
  }

  const effectiveBRate =
    Number(record.b_rate) > 0
      ? Number(record.b_rate)
      : Number(record.items?.[0]?.rate_qntl || 0);

  const updatedItems: ReturnLorryItemRow[] = (record.items || []).map((it, idx) => ({
    ...it,
    return_po_no: finalPoNo,
    srl_no: it.srl_no || idx + 1,
    rate_qntl: Number(it.rate_qntl) > 0 ? Number(it.rate_qntl) : effectiveBRate,
  }));

  const savedRecord: ReturnLorryRecord = {
    ...record,
    new_po_no: finalPoNo,
    po_no: finalPoNo,
    b_rate: effectiveBRate,
    saved_to_sauda_checkpoint: true,
    items: updatedItems,
  };

  // Update local cache
  const cached = getLocalCachedReturnLorries();
  const cleanMr = normalizeStr(savedRecord.mr_no);
  const nextCache = [
    savedRecord,
    ...cached.filter((r) => normalizeStr(r.mr_no) !== cleanMr),
  ];
  setLocalCachedReturnLorries(nextCache);

  if (supabase) {
    try {
      const dbRecordPayload: Record<string, any> = { ...savedRecord };
      delete dbRecordPayload.items;
      delete dbRecordPayload.raw_inspection;
      delete dbRecordPayload.raw_sauda_check_point;

      await dbModule.upsert('return_lorry', dbRecordPayload, 'new_po_no').catch(async () => {
        await supabase!.from('return_lorry').upsert(dbRecordPayload, { onConflict: 'new_po_no' }).then(() => {}, () => {});
      });

      if (updatedItems.length > 0) {
        await supabase.from('return_lorry_details').delete().eq('return_po_no', finalPoNo).then(() => {}, () => {});
        await supabase.from('return_lorry_details').insert(updatedItems).then(() => {}, () => {});
      }

      // Move / Save into Sauda Check Point (`sauda_check_point` & `sauda_check_point_details`)
      // and `purchase_master` & `purchase_detail_master`
      const saudaCheckPointPayload: Record<string, any> = {
        financial_year: savedRecord.financial_year || '2026-2027',
        purchase_order: savedRecord.purchase_order || 'FINAL PO',
        po_type: savedRecord.po_type || 'Normal',
        status: 'open',
        ptf_no: savedRecord.ptf_no || null,
        pending: true,
        po_no: finalPoNo,
        po_date: savedRecord.po_date,
        broker: savedRecord.broker || savedRecord.broker_name,
        supplier: savedRecord.supplier || savedRecord.supplier_name,
        challan_supplier: savedRecord.challan_supplier || savedRecord.supplier_name,
        area: savedRecord.area,
        trans_paid_by: savedRecord.trans_paid_by || 'PARTY',
        weight_unit_kgs: savedRecord.weight_unit_kgs || 147.5,
        against_cancellation: savedRecord.against_cancellation || 'No',
        purchase_unit_code: savedRecord.purchase_unit_code || '1',
        purchase_unit_name: savedRecord.purchase_unit_name || savedRecord.unit_name || 'BALES',
        total_lorries: 1,
        units_per_lorry: savedRecord.units_per_lorry || savedRecord.total_units || 0,
        total_units: savedRecord.total_units || 0,
        weight_per_lorry: savedRecord.received_weight_mt,
        total_contract_mt: savedRecord.received_weight_mt,
        marka_type: savedRecord.marka_type || 'Normal',
        marka_penalty: savedRecord.marka_penalty || 0,
        qty_penalty: savedRecord.qty_penalty || 0,
        delivery_from: savedRecord.delivery_from,
        delivery_to: savedRecord.delivery_to,
        shipment_date: savedRecord.shipment_date,
        grace_days: savedRecord.grace_days || 0,
        shipment_days: savedRecord.shipment_days || 0,
        delivery_penalty: savedRecord.delivery_penalty || 0,
        shipment_penalty: savedRecord.shipment_penalty || 0,
        contract_po_no: savedRecord.reference_po_no || savedRecord.mr_no,
        sauda_no: savedRecord.reference_po_no || savedRecord.mr_no,
        contract_date: savedRecord.contract_date || savedRecord.po_date,
        rate_detail: savedRecord.rate_detail || '',
        delivery_schedule: savedRecord.delivery_schedule || '',
        terms_condition: savedRecord.terms_condition || '',
        remarks: savedRecord.remarks || `Return Lorry M.R. ${savedRecord.mr_no} (${savedRecord.received_weight_mt.toFixed(3)} MT)`,
        po_identification: savedRecord.po_identification || 'Direct Advance Payment',
        b_rate: effectiveBRate,
        s_date: savedRecord.s_date || savedRecord.po_date,
      };

      await dbModule.upsert('sauda_check_point', saudaCheckPointPayload, 'po_no').catch(async () => {
        await supabase!.from('sauda_check_point').upsert(saudaCheckPointPayload, { onConflict: 'po_no' }).then(() => {}, () => {});
      });

      await dbModule.upsert('purchase_master', { ...saudaCheckPointPayload, status: 'final' }, 'po_no').catch(async () => {
        await supabase!.from('purchase_master').upsert({ ...saudaCheckPointPayload, status: 'final' }, { onConflict: 'po_no' }).then(() => {}, () => {});
      });

      if (updatedItems.length > 0) {
        const detailRowsForPo = updatedItems.map((it, idx) => ({
          po_no: finalPoNo,
          srl_no: it.srl_no || idx + 1,
          crop_year: it.crop_year || '2026-27',
          grade_code: it.grade_code || '',
          grade_name: it.grade_name || it.grade_code || '',
          agency_code: it.agency_code || '',
          agency_name: it.agency_name || it.agency_code || '',
          marka_code: it.marka_code || '',
          marka_name: it.marka_name || it.marka_code || '',
          quantity: Number(it.quantity || 0),
          weight_mt: Number(it.weight_mt || savedRecord.received_weight_mt || 0),
          rate_qntl: Number(it.rate_qntl || effectiveBRate || 0),
          premium: Number(it.premium || 0),
        }));

        await supabase.from('sauda_check_point_details').delete().eq('po_no', finalPoNo).then(() => {}, () => {});
        await supabase.from('sauda_check_point_details').insert(detailRowsForPo).then(() => {}, () => {});

        await supabase.from('purchase_detail_master').delete().eq('po_no', finalPoNo).then(() => {}, () => {});
        await supabase.from('purchase_detail_master').insert(detailRowsForPo).then(() => {}, () => {});
      }
    } catch (err) {
      console.warn('[returnLorryService] Error saving Return Lorry to Sauda Check Point:', err);
    }
  }

  notifyDataChanged('return_lorry');
  notifyDataChanged('sauda_check_point');
  notifyDataChanged('purchase_master');

  return savedRecord;
}

/**
 * Checks a single Mill Inspection (`material_inspection`) save/update event.
 * If its received weight is under 5 MT (`> 0 && < 5`), flags it as a Return Lorry
 * so it appears in Return Lorry Desk (waiting for user to open, input Rate, and Save to Sauda Check Point).
 */
export async function checkAndProcessReturnLorryOnInspection(params: {
  mrNo: string;
  poNo: string;
  arrivalNo?: string;
  lorryNo?: string;
  inspectionDate?: string;
  headerForm?: any;
  detailRows?: any[];
  finalArrivalRecord?: any;
}): Promise<{
  isReturnLorry: boolean;
  weightMt: number;
  newPoNo?: string;
  referencePoNo?: string;
  record?: ReturnLorryRecord;
}> {
  const { mrNo, poNo, arrivalNo, lorryNo, headerForm, detailRows } = params;
  const weightMt = calculateInspectionWeightMt(headerForm, detailRows);

  if (weightMt <= 0 || weightMt >= 5) {
    return { isReturnLorry: false, weightMt };
  }

  ensureReturnLorryTablesExist();

  const cleanMr = normalizeStr(mrNo);
  const cleanPo = normalizeStr(poNo);
  if (!cleanMr) {
    return { isReturnLorry: true, weightMt };
  }

  const cached = getLocalCachedReturnLorries();
  const existingCached = cached.find((r) => normalizeStr(r.mr_no) === cleanMr);

  const referencePoNo = existingCached?.reference_po_no || cleanPo || String(headerForm?.mill_po_no || '').trim() || cleanMr;
  const fy = String(headerForm?.financial_year || '2026-2027').trim();
  const newPoNo = existingCached?.new_po_no || (await generateNext4000SeriesPoNo(referencePoNo, fy));

  const record = buildCombinedReturnLorryRecord({
    newPoNo,
    referencePoNo,
    insp: {
      ...(headerForm || {}),
      mr_no: mrNo,
      arrival_no: arrivalNo || headerForm?.arrival_no || mrNo,
      lorry_number: lorryNo || headerForm?.lorry_number || '',
    },
    inspDetails: detailRows || [],
    weightMt,
    lorrySeqNo: 1,
    existingSavedRl: existingCached,
    existingSavedRlDetails: existingCached?.items || [],
    isSavedToScp: Boolean(existingCached?.saved_to_sauda_checkpoint),
  });

  const updatedCache = [record, ...cached.filter((r) => normalizeStr(r.mr_no) !== cleanMr)];
  setLocalCachedReturnLorries(updatedCache);

  notifyDataChanged('return_lorry');

  return {
    isReturnLorry: true,
    weightMt,
    newPoNo,
    referencePoNo,
    record,
  };
}

/**
 * Fetches all `< 5 MT` Mill Inspection records strictly from the Mill Inspection tables
 * (`material_inspection`, `material_inspection_details`, `mill_inspection_detail`)
 * and merges any user-saved Rate / 4000-series P.O. state from `return_lorry`.
 * Does NOT auto-push unsaved records to `sauda_check_point` until the user inputs Rate and clicks Save.
 */
export async function syncAllReturnLorriesFromInspections(): Promise<ReturnLorryRecord[]> {
  ensureReturnLorryTablesExist();

  if (!supabase) {
    return getLocalCachedReturnLorries();
  }

  try {
    const [
      inspRes,
      inspDetRes,
      millDetRes,
      rlRes,
      rlDetRes,
      scp4000Res,
    ] = await Promise.all([
      supabase.from('material_inspection').select('*').order('created_at', { ascending: false }).then((r) => r, () => ({ data: [] as any[] })),
      supabase.from('material_inspection_details').select('*').order('srl_no', { ascending: true }).then((r) => r, () => ({ data: [] as any[] })),
      supabase.from('mill_inspection_detail').select('*').order('srl_no', { ascending: true }).then((r) => r, () => ({ data: [] as any[] })),
      supabase.from('return_lorry').select('*').order('created_at', { ascending: false }).then((r) => r, () => ({ data: [] as any[] })),
      supabase.from('return_lorry_details').select('*').order('srl_no', { ascending: true }).then((r) => r, () => ({ data: [] as any[] })),
      supabase.from('sauda_check_point').select('po_no, b_rate').ilike('po_no', '%/4%').then((r) => r, () => ({ data: [] as any[] })),
    ]);

    const rawInspections: any[] = [...((inspRes as any)?.data || [])];
    try {
      const localInsp = localStorage.getItem('inspection_master_records');
      if (localInsp) {
        const parsed = JSON.parse(localInsp);
        if (Array.isArray(parsed)) {
          parsed.forEach((item: any) => {
            if (item?.mr_no && !rawInspections.some((x) => normalizeStr(x.mr_no) === normalizeStr(item.mr_no))) {
              rawInspections.push(item);
            }
          });
        }
      }
    } catch {}

    const allInspDetails: any[] = [
      ...((inspDetRes as any)?.data || []),
      ...((millDetRes as any)?.data || []),
    ];
    const existingDbReturnLorries: any[] = (rlRes as any)?.data || [];
    const existingDbRlDetails: any[] = (rlDetRes as any)?.data || [];
    const existingScp4000: any[] = (scp4000Res as any)?.data || [];

    // Group Mill Inspection details by MR No
    const detailsByMr = new Map<string, any[]>();
    for (const d of allInspDetails) {
      const k = normalizeStr(d.mr_no);
      if (!k) continue;
      if (!detailsByMr.has(k)) detailsByMr.set(k, []);
      const list = detailsByMr.get(k)!;
      const srl = Number(d.srl_no || list.length + 1);
      if (!list.some((existing) => Number(existing.srl_no || 0) === srl)) {
        list.push(d);
      }
    }

    // Track existing user-saved Return Lorry records and used 4000-series numbers
    const existingByMr = new Map<string, any>();
    const used4000Numbers = new Set<number>();

    const register4000No = (poStr: any) => {
      const s = normalizeStr(poStr);
      if (!s) return;
      const parts = s.split('/');
      const last = parts[parts.length - 1]?.replace(/[^0-9]/g, '') || '';
      const num = parseInt(last, 10);
      if (!isNaN(num) && num >= 4000 && num < 5000) {
        used4000Numbers.add(num);
      }
    };

    for (const rl of [... getLocalCachedReturnLorries(), ...existingDbReturnLorries]) {
      const mKey = normalizeStr(rl.mr_no || rl.final_arrival_no);
      if (mKey && !existingByMr.has(mKey)) {
        existingByMr.set(mKey, rl);
      }
      register4000No(rl.new_po_no);
      register4000No(rl.po_no);
    }
    for (const scp of existingScp4000) {
      register4000No(scp.po_no);
    }

    const resultRecords: ReturnLorryRecord[] = [];
    const processedMrSet = new Set<string>();

    for (const insp of rawInspections) {
      const mrKey = normalizeStr(insp.mr_no);
      if (!mrKey || processedMrSet.has(mrKey)) continue;

      let detailRows = detailsByMr.get(mrKey) || [];
      if (detailRows.length === 0 && insp.grid_details) {
        if (Array.isArray(insp.grid_details)) detailRows = insp.grid_details;
        else if (typeof insp.grid_details === 'string') {
          try {
            const p = JSON.parse(insp.grid_details);
            if (Array.isArray(p)) detailRows = p;
          } catch {}
        }
      }

      const wtMt = calculateInspectionWeightMt(insp, detailRows);

      // Strictly check Mill Inspection weight < 5 MT (> 0 and < 5 MT)
      if (wtMt <= 0 || wtMt >= 5) {
        continue;
      }

      processedMrSet.add(mrKey);
      const existingRl = existingByMr.get(mrKey);

      const isBlankPo = (v: any) => {
        const s = normalizeStr(v);
        return !s || s === 'NO' || s === 'N/A' || s === 'NONE' || s === '-';
      };

      const referencePoNo =
        (!isBlankPo(insp.po_no) ? String(insp.po_no).trim() : '') ||
        (!isBlankPo(insp.mill_po_no) ? String(insp.mill_po_no).trim() : '') ||
        (!isBlankPo(existingRl?.reference_po_no) ? String(existingRl.reference_po_no).trim() : '') ||
        String(insp.mr_no).trim();

      const fy = String(insp.financial_year || existingRl?.financial_year || '2026-2027').trim();

      const resolvedNewPoNo =
        (existingRl?.new_po_no && is4000SeriesPo(existingRl.new_po_no) ? String(existingRl.new_po_no).trim() : '') ||
        (existingRl?.po_no && is4000SeriesPo(existingRl.po_no) ? String(existingRl.po_no).trim() : '') ||
        generate4000SeriesPoNoFromSet(referencePoNo, fy, used4000Numbers);

      const savedDetails = existingRl?.items?.length
        ? existingRl.items
        : existingDbRlDetails.filter(
            (d) => normalizeStr(d.return_po_no) === normalizeStr(resolvedNewPoNo)
          );

      const isAlreadySavedToScp = Boolean(
        existingRl?.saved_to_sauda_checkpoint === true && Number(existingRl?.b_rate || 0) > 0
      );

      const recordFromInspection = buildCombinedReturnLorryRecord({
        newPoNo: resolvedNewPoNo,
        referencePoNo,
        insp,
        inspDetails: detailRows,
        weightMt: wtMt,
        lorrySeqNo: 1,
        existingSavedRl: existingRl,
        existingSavedRlDetails: savedDetails,
        isSavedToScp: isAlreadySavedToScp,
      });

      resultRecords.push(recordFromInspection);
    }

    setLocalCachedReturnLorries(resultRecords);
    return resultRecords;
  } catch (err) {
    console.warn('[returnLorryService] Error loading Mill Inspection (< 5 MT) records:', err);
    return getLocalCachedReturnLorries();
  }
}

export async function fetchAllReturnLorries(): Promise<ReturnLorryRecord[]> {
  return syncAllReturnLorriesFromInspections();
}
