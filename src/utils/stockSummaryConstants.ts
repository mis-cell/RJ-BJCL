export interface GodownMasterItem {
  gdn_code: string;
  gdn_name: string;
  gdn_capacity?: number;
  gdn_short_name?: string;
}

export interface GradeMasterItem {
  code: string;
  name: string;
}

export interface AreaMasterItem {
  name: string;
}

export interface UnitMasterItem {
  unit_name: string;
}

export interface StockOpeningRecord {
  id?: string;
  item_code?: string;
  grade?: string;
  area?: string;
  godown?: string;
  unit?: string;
  quantity: number | string;
  weight: number | string;
  avg_weight?: number | string;
  opening_date?: string;
  jci?: string;
  remarks?: string;
  created_at?: string;
}

export interface StockClosingRecord {
  id?: string;
  item_code?: string;
  grade?: string;
  area?: string;
  godown?: string;
  unit?: string;
  quantity?: number | string;
  weight_qtl?: number | string;
  rate_per_qtl?: number | string;
  amount?: number | string;
  closing_date?: string;
  remarks?: string;
  created_at?: string;
}

export const FALLBACK_GODOWNS: GodownMasterItem[] = [
  { gdn_code: 'GDN-01', gdn_name: 'MAIN GODOWN' },
  { gdn_code: 'GDN-02', gdn_name: 'GODOWN-B' },
  { gdn_code: 'GDN-03', gdn_name: 'GDW-A (RAW MAIN)' },
];

export const FALLBACK_GRADES: GradeMasterItem[] = [
  { code: 'TD-5', name: 'RAW JUTE - TOSSA TD-5' },
  { code: 'W-5', name: 'RAW JUTE - WHITE W-5' },
  { code: 'M-1', name: 'MESTA M-1' },
  { code: 'SUPER', name: 'BIMLI SUPER' },
  { code: 'TD-4', name: 'TOSSA TD-4 (OLD)' },
];

export const FALLBACK_AREAS: AreaMasterItem[] = [
  { name: 'KISHANGANJ' },
  { name: 'FORBESGANJ' },
  { name: 'ISLAMPUR' },
  { name: 'VIZIANAGARAM' },
];

export const FALLBACK_UNITS: UnitMasterItem[] = [
  { unit_name: 'BALES' },
  { unit_name: 'DRUMS' },
  { unit_name: 'LOOSE' },
  { unit_name: 'P.BALES' },
  { unit_name: 'H.BALES' },
];

export const DEFAULT_GODOWNS: GodownMasterItem[] = [
  { gdn_code: "1", gdn_name: "1", gdn_capacity: 600, gdn_short_name: "1" },
  { gdn_code: "2", gdn_name: "3", gdn_capacity: 450, gdn_short_name: "3" },
  { gdn_code: "3", gdn_name: "3A", gdn_capacity: 450, gdn_short_name: "3A" },
  { gdn_code: "4", gdn_name: "4", gdn_capacity: 450, gdn_short_name: "4" },
  { gdn_code: "5", gdn_name: "4A", gdn_capacity: 450, gdn_short_name: "4A" },
  { gdn_code: "6", gdn_name: "4B", gdn_capacity: 600, gdn_short_name: "4B" },
  { gdn_code: "7", gdn_name: "4C", gdn_capacity: 600, gdn_short_name: "4C" },
  { gdn_code: "8", gdn_name: "5", gdn_capacity: 450, gdn_short_name: "5" },
  { gdn_code: "9", gdn_name: "6", gdn_capacity: 450, gdn_short_name: "6" },
  { gdn_code: "10", gdn_name: "6A", gdn_capacity: 450, gdn_short_name: "6A" },
  { gdn_code: "11", gdn_name: "7", gdn_capacity: 450, gdn_short_name: "7" },
  { gdn_code: "12", gdn_name: "7A", gdn_capacity: 450, gdn_short_name: "7A" },
  { gdn_code: "13", gdn_name: "8", gdn_capacity: 450, gdn_short_name: "8" },
  { gdn_code: "14", gdn_name: "8A", gdn_capacity: 450, gdn_short_name: "8A" },
  { gdn_code: "15", gdn_name: "9", gdn_capacity: 450, gdn_short_name: "9" },
  { gdn_code: "16", gdn_name: "9A", gdn_capacity: 450, gdn_short_name: "9A" },
  { gdn_code: "17", gdn_name: "10", gdn_capacity: 450, gdn_short_name: "10" },
  { gdn_code: "18", gdn_name: "2", gdn_capacity: 450, gdn_short_name: "2" },
  { gdn_code: "19", gdn_name: "1A", gdn_capacity: 450, gdn_short_name: "1A" },
  { gdn_code: "20", gdn_name: "OUTSIDE", gdn_capacity: 500, gdn_short_name: "OS" },
  { gdn_code: "21", gdn_name: "2A", gdn_capacity: 450, gdn_short_name: "2A" },
  { gdn_code: "22", gdn_name: "INSP. MILL", gdn_capacity: 450, gdn_short_name: "IM" },
  { gdn_code: "23", gdn_name: "KATARI", gdn_capacity: 450, gdn_short_name: "KATA" },
  { gdn_code: "24", gdn_name: "MILL", gdn_capacity: 450, gdn_short_name: "MILL" },
  { gdn_code: "26", gdn_name: "STB", gdn_capacity: 450, gdn_short_name: "STB" },
  { gdn_code: "27", gdn_name: "INSP. STB", gdn_capacity: 450, gdn_short_name: "ISTB" },
  { gdn_code: "29", gdn_name: "INSP. KATARI", gdn_capacity: 450, gdn_short_name: "IKAT" },
  { gdn_code: "30", gdn_name: "SELECTION SHED", gdn_capacity: 450, gdn_short_name: "SHED" },
  { gdn_code: "31", gdn_name: "8B", gdn_capacity: 450, gdn_short_name: "8B" }
];
