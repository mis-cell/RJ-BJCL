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

