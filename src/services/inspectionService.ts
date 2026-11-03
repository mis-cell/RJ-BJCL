import { supabase } from '../lib/supabase';
import { dbModule } from './dbModule';
import { 
  InspectionMaster, 
  InspectionDetailRow, 
  QualityMatrixState,
  parseDateOnly 
} from '../types/inspection.types';
import Papa from 'papaparse';
import { sanitizeCsvData, formatIndianCurrency, calculateFloor1000 } from '../lib/utils';

export const initialMasterState = (): InspectionMaster => ({
  mr_no: `MR/INSP/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`,
  mr_date: new Date().toISOString().split("T")[0],
  arrival_no: "",
  arrival_date: new Date().toISOString().split("T")[0],
  po_no: "",
  po_date: new Date().toISOString().split("T")[0],
  broker_name: "",
  supplier_name: "",
  lorry_number: "",
  actual_moisture: 0,
  claim_moisture: 0,
  actual_dust: 0,
  claim_dust: 0,
  actual_ncv: 0,
  claim_ncv: 0,
  detention_days: 0,
  unloading_date: new Date().toISOString().split("T")[0],
  mill_po_no: "",
  mill_po_date: new Date().toISOString().split("T")[0],
  mr_spcl_print: "",
  remarks: "",
  delivery_claim: 0,
  deduction_type: "",
  deduction_types: [],
  deduction_rate: 0,
  deduction_qty: 0,
  deduction_amount: 0,
  advance_amount: 0,
  on_account_advance_amount: 0,
  settlement_amount: 0,
  sent_settlement_date: "",
  lorry_returned: "No",
  lorry_returned_other_mill: "No",
  mr_print_date: new Date().toISOString().split("T")[0],
  consignment_no: "",
  consignment_date: new Date().toISOString().split("T")[0],
  arrival_remarks: "",
  arival_apmc_fees: 0,
});

export const createEmptyRow = (srl: number): InspectionDetailRow => ({
  srl_no: srl,
  arrival_grade: "",
  stock_grade_code: "",
  stock_grade_name: "",
  area: "",
  agency: "",
  marka: "",
  crop_year: "2026-2027",
  lot: "",
  quantity: "",
  unit: "BALES",
  challan_gross_wt: "",
  receipt_gross_wt: "",
});

export const initialQualityMatrix = (): QualityMatrixState => ({
  grade_down: {
    '1st': { dept: '', claim: '', sett: '' },
    '2nd': { dept: '', claim: '', sett: '' },
    '3rd': { dept: '', claim: '', sett: '' },
    '4th': { dept: '', claim: '', sett: '' },
  },
  moisture: {
    '1st': { dept: '', claim: '', sett: '' },
    '2nd': { dept: '', claim: '', sett: '' },
    '3rd': { dept: '', claim: '', sett: '' },
    '4th': { dept: '', claim: '', sett: '' },
  },
  dust: {
    '1st': { dept: '', claim: '', sett: '' },
    '2nd': { dept: '', claim: '', sett: '' },
    '3rd': { dept: '', claim: '', sett: '' },
    '4th': { dept: '', claim: '', sett: '' },
  },
  moc: {
    '1st': { dept: '', claim: '', sett: '' },
    '2nd': { dept: '', claim: '', sett: '' },
    '3rd': { dept: '', claim: '', sett: '' },
    '4th': { dept: '', claim: '', sett: '' },
  },
  po_rate: {
    '1st': { dept: '', claim: '', sett: '' },
    '2nd': { dept: '', claim: '', sett: '' },
    '3rd': { dept: '', claim: '', sett: '' },
    '4th': { dept: '', claim: '', sett: '' },
  },
});

export const calculateClaimMoisture = (
  actualM: number,
  dateStr: string,
  areaStr: string,
  rules: any[] = []
): number => {
  if (!actualM || actualM <= 0) return 0;

  let month = 7;
  if (dateStr) {
    const trimmed = String(dateStr).trim();
    const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (isoMatch) {
      month = parseInt(isoMatch[2], 10) || 7;
    } else {
      const ddmmyyyyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
      if (ddmmyyyyMatch) {
        month = parseInt(ddmmyyyyMatch[2], 10) || 7;
      } else {
        const parts = trimmed.split("-");
        if (parts.length === 3) {
          if (parts[0].length === 4) month = parseInt(parts[1], 10) || 7;
          else if (parts[2].length === 4) month = parseInt(parts[1], 10) || 7;
        }
      }
    }
  }

  const isWetSeason = month >= 1 && month <= 6;
  const seasonKeyword = isWetSeason ? "JANUARY TO JUNE" : "JULY TO DECEMBER";
  const cleanArea = String(areaStr || "").trim().toUpperCase();
  const isDaisee = cleanArea.includes("DAISEE");

  let threshold = isDaisee ? (isWetSeason ? 18 : 20) : (isWetSeason ? 16 : 18);

  const allRules = rules && rules.length > 0 ? rules : [
    { season: "JULY TO DECEMBER (DRY SEASON)", operating_area: "DAISEE Operating Areas", threshold_limit: "Moisture threshold limit is 20%" },
    { season: "JANUARY TO JUNE (WET SEASON)", operating_area: "DAISEE Operating Areas", threshold_limit: "Moisture threshold limit is 18%" },
    { season: "JULY TO DECEMBER (DRY SEASON)", operating_area: "Standard / Non-DAISEE", threshold_limit: "Moisture threshold limit is 18%" },
    { season: "JANUARY TO JUNE (WET SEASON)", operating_area: "Standard / Non-DAISEE", threshold_limit: "Moisture threshold limit is 16%" },
  ];

  const exactMatch = allRules.find((r) => {
    const rSeason = (r.season || "").toUpperCase();
    const rArea = (r.operating_area || "").toUpperCase();
    const seasonMatch = rSeason.includes(seasonKeyword);
    return seasonMatch && cleanArea && rArea === cleanArea;
  });

  const categoryMatch = allRules.find((r) => {
    const rSeason = (r.season || "").toUpperCase();
    const rArea = (r.operating_area || "").toUpperCase();
    const seasonMatch = rSeason.includes(seasonKeyword);
    const areaMatch = isDaisee ? (rArea.includes("DAISEE") && !rArea.includes("NON-DAISEE")) : (rArea.includes("NON-DAISEE") || rArea.includes("STANDARD") || (!rArea.includes("DAISEE") && cleanArea && (rArea.includes(cleanArea) || cleanArea.includes(rArea))));
    return seasonMatch && areaMatch;
  });

  const matched = exactMatch || categoryMatch;
  if (matched && matched.threshold_limit) {
    const matchVal = String(matched.threshold_limit).match(/(\d+(\.\d+)?)/);
    if (matchVal) {
      threshold = parseFloat(matchVal[1]);
    }
  }

  const excess = actualM - threshold;
  if (excess <= 0) return 0;
  return Math.ceil(excess);
};

export const exportInspectionsToExcel = (
  savedInspections: any[],
  columns: any[],
  visibleColumns: { [key: string]: boolean }
) => {
  if (!savedInspections || savedInspections.length === 0) return;

  const activeCols = columns.filter((c) => visibleColumns[c.key] !== false);
  const rows = savedInspections.map((insp) => {
    const rowObj: any = {};
    activeCols.forEach((col) => {
      let val = insp[col.key];
      if (typeof val === 'number') {
        val = val.toLocaleString('en-IN');
      }
      rowObj[col.label] = val !== undefined && val !== null ? val : '-';
    });
    return rowObj;
  });

  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `Material_Inspection_Register_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
};
