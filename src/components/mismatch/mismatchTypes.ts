import { PoMismatchDetail } from '../../lib/poMatch';

export function safeStr(val: any, fallback = ''): string {
  if (val === null || val === undefined || val === '') return fallback;
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
    return String(val);
  }
  if (typeof val === 'object') {
    if (typeof val.name === 'string') return val.name;
    if (typeof val.supp_name === 'string') return val.supp_name;
    if (typeof val.brok_name === 'string') return val.brok_name;
    if (typeof val.supplier_name === 'string') return val.supplier_name;
    if (typeof val.broker_name === 'string') return val.broker_name;
    if (typeof val.area_name === 'string') return val.area_name;
    if (typeof val.agency_name === 'string') return val.agency_name;
    if (typeof val.grade_name === 'string') return val.grade_name;
    if (val.supplier) return safeStr(val.supplier, fallback);
    if (val.broker) return safeStr(val.broker, fallback);
    return fallback;
  }
  return fallback;
}

export const inMemorySattaResolutions: Record<string, any> = {};

export const GRADE_SATTA_VARIANCE_LIMITS: Record<string, number> = {
  'TD4': 0,
  'TD5': 0,
  'TD6': 0,
  'TD7': 0,
  'TD8': 0,
  'DEFAULT': 0
};

export interface MaterialMismatchItem {
  id: string;
  poNo: string;
  saudaNo: string;
  supplierName: string;
  brokerName: string;
  area: string;
  grade: string;
  agency: string;
  ptfMode: string;
  poContract: string;
  challanSupplier: string;
  ratePerMt: string;
  lorryNumber: string;
  lorryProgress: {
    totalLorries: number;
    receivedLorries: number;
    remainingLorries: number;
  };
  mismatchedFields: string[];
  mismatchDetailsList: PoMismatchDetail[];
  detectedAt: string;
  issueDescription: string;
  severity: 'low' | 'medium' | 'high';
  status: 'pending' | 'resolved';
  isClosed?: boolean;
  resolutionNotes?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  approvalLevel?: string;
}

export interface SattaMismatchItem {
  id: string;
  poNo: string;
  saudaNo?: string;
  poDate: string;
  supplierName: string;
  brokerName: string;
  area: string;
  grade: string;
  poRateMt: number;
  poRateQtl: number;
  sattaBaseRateQtl: number;
  differentialQtl: number;
  sattaFinalRateMt: number;
  sattaFinalRateQtl: number;
  status: 'dispute' | 'ok' | 'resolved';
  issueDescription: string;
  differenceMt: number;
  differenceQtl: number;
  weightMt: number;
  resolutionNotes?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  approvalLevel?: string;
  sourceType?: 'sauda_master' | 'sms_sauda' | 'sauda_check_point' | 'purchase_master';
  sourceLabel?: string;
}

export interface SattaGroupedItem {
  key: string;
  poNo: string;
  saudaNo: string;
  poDate: string;
  supplierName: string;
  brokerName: string;
  items: SattaMismatchItem[];
  hasDispute: boolean;
  isAllResolved: boolean;
  isAllOk: boolean;
  disputeCount: number;
  resolvedCount: number;
  okCount: number;
  totalCount: number;
  areaList: string[];
  gradeList: string[];
  minSaudaRateQtl: number;
  maxSaudaRateQtl: number;
  minSattaLimitQtl: number;
  maxSattaLimitQtl: number;
  maxDifferenceQtl: number;
  minDifferenceQtl: number;
  status: 'dispute' | 'resolved' | 'ok';
  latestResolvedBy?: string;
  latestResolvedAt?: string;
  latestApprovalLevel?: string;
  latestResolutionNotes?: string;
}
