import React from 'react';

export interface ComparisonField {
  name: string;
  referenceValue: string | number;
  actualValue: string | number;
  variance?: string | number;
  status: 'match' | 'mismatch' | 'not_available' | 'not_applicable';
  notes?: string;
  isCritical?: boolean;
}

export interface SectionComparison {
  id: string;
  title: string;
  icon: React.ElementType;
  fields: ComparisonField[];
  mismatchCount: number;
  status: 'clean' | 'mismatch' | 'pending';
  existingRecords?: any[];
}

export interface MrComparisonData {
  mrNo: string;
  arrivalRecord?: any;
  inspectionRecord?: any;
  settlementRecord?: any;
  paymentRecord?: any;
  tempArrivalFields: ComparisonField[];
  millInspFields: ComparisonField[];
  mismatchCount: number;
}

export interface PoHistogramHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  po: any;
  allPayments?: any[];
  allSettlements?: any[];
  allArrivals?: any[];
  allInspections?: any[];
  onNavigateToMismatch?: (poNo: string) => void;
  onNavigateToPayment?: (poNo: string) => void;
  onNavigateToSettlement?: (poNo: string) => void;
}
