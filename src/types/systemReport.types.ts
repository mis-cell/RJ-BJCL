export interface ReportTransactionLine {
  txnId: string;
  saudaNo: string;
  poNo: string;
  date: string;
  month: string;
  financialYear: string;
  supplier: string;
  broker: string;
  agency: string;
  area: string;
  grade: string;
  quantityMT: number;
  purchaseRate: number;
  baseRate: number;
  rateVariance: number;
  rateVariancePct: number;
  grossPurchaseValue: number;
  baseRateValue: number;
  premiumRate: number;
  premiumAmount: number;
  premiumPct: number;
  deductionAmount: number;
  deductionPct: number;
  moisturePct: number;
  gradeDownQty: number;
  effectiveCost: number;
  realizationRate: number;
  realizationValue: number;
  grossProfit: number;
  profitPct: number;
  profitStatus: 'PROFITABLE' | 'BREAK-EVEN' | 'NON-PROFITABLE' | 'LOSS';
  
  // Pipeline & Operational status
  saudaStatus: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' | 'DELAYED';
  arrivalStatus: 'COMPLETED' | 'PENDING' | 'IN_TRANSIT';
  inspectionStatus: 'COMPLETED' | 'PENDING' | 'REJECTED';
  paymentStatus: 'PAID' | 'PARTIAL' | 'PENDING';
  settlementStatus: 'SETTLED' | 'PENDING';
  
  arrivedWeightMT: number;
  pendingWeightMT: number;
  paidAmount: number;
  pendingPayable: number;
  claimAmount: number;
  claimSettled: number;
  isDelayed: boolean;
  isAbnormal: boolean;
  abnormalReasons: string[];
  mrNo?: string;
  voucherNo?: string;
  hasAmadArrival?: boolean;
  hasFinalArrival?: boolean;
  hasInspection?: boolean;
}

export interface ReportFilterCriteria {
  dateFrom?: string;
  dateTo?: string;
  month?: string;
  financialYear?: string;
  broker?: string;
  agency?: string;
  area?: string;
  supplier?: string;
  grade?: string;
  sauda?: string;
  po?: string;
  saudaStatus?: string;
  arrivalStatus?: string;
  inspectionStatus?: string;
  paymentStatus?: string;
  settlementStatus?: string;
  searchQuery?: string;
}

export interface AllPoRecord {
  id: string;
  sourceSection: 'Sauda Desk' | 'Sauda Check Point' | 'Final PO';
  poNo: string;
  saudaNo: string;
  date: string;
  month: string;
  financialYear: string;
  supplier: string;
  broker: string;
  agency?: string;
  area?: string;
  grade?: string;
  quantityMT: number;
  rate: number;
  grossValue: number;
  status: string;
  raw?: any;
}

export interface AllPoSummary {
  records: AllPoRecord[];
  totalCount: number;
  totalQuantityMT: number;
  totalGrossValue: number;
  saudaDeskCount: number;
  saudaDeskMT: number;
  checkPointCount: number;
  checkPointMT: number;
  finalPoCount: number;
  finalPoMT: number;
}

export interface SystemReportDataset {
  transactions: ReportTransactionLine[];
  filtered: ReportTransactionLine[];
  allPoSummary: AllPoSummary;
  brokerSettlementMap: Record<string, {
    moistureClaim: number;
    moistureSett: number;
    dustClaim: number;
    dustSett: number;
    gradedownClaim: number;
    gradedownSett: number;
    shortExcess: number;
    otherDeductionAmount?: number;
    deductionTypes?: string[];
    allDeductionValue: number;
    moistCount?: number;
    dustCount?: number;
    gdCount?: number;
    inspMoistSum?: number;
    inspMoistCount?: number;
    inspDustSum?: number;
    inspDustCount?: number;
    inspGdSum?: number;
    inspGdCount?: number;
    moistureSettAvg?: number;
    dustSettAvg?: number;
    gradedownSettAvg?: number;
    details: any[];
  }>;
  masterLists: {
    brokers: string[];
    suppliers: string[];
    agencies: string[];
    areas: string[];
    grades: string[];
    months: string[];
    financialYears: string[];
    saudas: string[];
    pos: string[];
  };
  metrics: {
    // Business Summary (A)
    totalBusinessValue: number;
    totalQuantityMT: number;
    totalPOCount: number;
    totalSaudaCount: number;
    totalSupplierCount: number;
    totalBrokerCount: number;
    totalAgencyCount: number;
    totalAreaCount: number;
    totalGradeCount: number;

    // Financial Summary (B)
    totalPurchaseValue: number;
    totalPremium: number;
    premiumMRCount: number;
    totalDeduction: number;
    totalClaim: number;
    totalSettlement: number;
    totalPayment: number;
    grossProfit: number;
    netProfit: number;
    totalLoss: number;
    nonProfitableBusiness: number;
    profitMarginPct: number;
    weightedPurchaseRate: number;
    weightedBaseRate: number;

    // Operational Summary (C)
    saudaPendingCount: number;
    temporaryArrivalPendingCount: number;
    finalArrivalPendingCount: number;
    millInspectionPendingCount: number;
    paymentPendingCount: number;
    settlementPendingCount: number;
    pendingDeliveryMT: number;
    arrivedMT: number;

    // Exception Summary (D)
    abnormalCount: number;
    highDeductionCount: number;
    highPremiumCount: number;
    highMoistureCount: number;
    gradeDownCount: number;
    highClaimCount: number;
    lossMakingCount: number;
    delayedCount: number;
    profitableCount: number;
    breakEvenCount: number;
  };
}
