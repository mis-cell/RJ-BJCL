import React from 'react';

export type IssueRouteType = 'godown' | 'mill' | 'factory' | null;

export interface MaterialIssueRowItem {
  srl: number;
  crop: string;
  grade_name: string;
  marka: string;
  qty: number;
  weight_kgs: number;
  area: string;
  agency: string;
  code: string;
  batch_name: string;
  unit: string;
  place: string;
  itg_no: string;
  rate: number;
  location_dest: string;
}

export interface SplitTotals {
  balesQ: number;
  balesW: number;
  looseQ: number;
  looseW: number;
  drumsQ: number;
  drumsW: number;
  grandQ: number;
  grandW: number;
  grandAmount: number;
}

export interface ReconciliationStatus {
  arrBales: number;
  arrWt: number;
  balBales: number;
  balWt: number;
  matchBales: boolean;
  matchWt: boolean;
}

export interface MaterialIssueEntryProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  items: MaterialIssueRowItem[];
  setItems: React.Dispatch<React.SetStateAction<MaterialIssueRowItem[]>>;
  issueRoute: IssueRouteType;
  setIssueRoute: (route: IssueRouteType) => void;
  finalArrivals: any[];
  godownRecords?: any[];
  isEditMode: boolean;
  validationErrors: Record<string, string>;
  setValidationErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleSave: () => Promise<void>;
  handleFormCancel: () => void;
  showToast: (msg: string) => void;
  successToast: string | null;
  setSuccessToast: (msg: string | null) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  setCurrentPage?: (p: any) => void;
  closePage?: (p: any, d?: any) => void;
  embedded?: boolean;
}
