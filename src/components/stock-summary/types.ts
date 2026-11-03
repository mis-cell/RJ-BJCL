export type StockTab = 'opening' | 'live';
export type StockSubTab = 'opening' | 'closing';
export type TreeHierarchyMode = 'area_grade' | 'grade_area';
export type MetricCalculationMode = 'cumulative' | 'period';

export interface LiveStockItem {
  grade: string;
  openingQty: number;
  openingWt: number;
  incomingQty: number;
  incomingWt: number;
  outgoingQty: number;
  outgoingWt: number;
  balanceQty: number;
  balanceWt: number;
}

export interface StockCounts {
  amad: number;
  sauda: number;
  total_bales: number;
}

export interface OpeningFormState {
  id: string;
  opening_date: string;
  godown: string;
  area: string;
  grade: string;
  jci: string;
  unit: string;
  quantity: string;
  weight: string;
  avg_weight: string;
}

export interface ClosingFormState {
  id: string;
  stock_date: string;
  godown: string;
  commodity: string;
  variety: string;
  grade: string;
  no_of_bales: string;
  weight_qtl: string;
  rate_per_qtl: string;
  total_value: string;
  remarks: string;
  recorded_by: string;
}

export interface DateWiseStockStat {
  date: string;
  count: number;
  quantity: number;
  weight: number;
  value?: number;
}
