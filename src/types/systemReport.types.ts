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
  settledAmount?: number;
  inTransitWeightMT?: number;
  hasMismatch?: boolean;
  mismatchCount?: number;
  deliveryDelayDays?: number;
  mrCount?: number;
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

export interface PaymentOperationsVoucher {
  id: string;
  voucherNo: string;
  mrNo: string;
  poNo: string;
  date: string;
  month: string;
  financialYear: string;
  broker: string;
  supplier: string;
  agency: string;
  area: string;
  grade: string;
  payableAmount: number;
  paidAmount: number;
  deductionAmount: number;
  premiumAmount: number;
  premiumRatePerQtl: number;
  quantityQtl: number;
  status: string;
}

export interface MillInspectionQualityRecord {
  id: string;
  mrNo: string;
  poNo: string;
  saudaNo: string;
  date: string;
  month: string;
  financialYear: string;
  broker: string;
  supplier: string;
  agency: string;
  area: string;
  grade: string;
  isDaisee: boolean;
  seasonLabel: string;
  receivedMt: number;
  grossMt: number;
  estimatedValue: number;
  actualMoisture: number;
  moistureLimit: number;
  excessMoisture: number;
  gradeDownPct: number;
  dustPct: number;
  ncvPct: number;
  habijabiKg: number;
  chottaKg: number;
  ropesKg: number;
  habijabiChattaRopeKg: number;
  ctPct: number;
  hasSettlement: boolean;
  hasMismatch: boolean;
}

export interface FinalArrivalMrRef {
  mrNo: string;
  poNo: string;
  date: string;
  month: string;
  financialYear: string;
  broker: string;
  supplier: string;
  agency: string;
  area: string;
  grade: string;
  hasMillInspection: boolean;
}

export interface ShortExcessSummaryItem {
  poNo: string;
  date: string;
  month: string;
  financialYear: string;
  broker: string;
  supplier: string;
  agency: string;
  area: string;
  variationType: 'excess' | 'short' | 'within_tolerance';
  contractMt: number;
  totalReceivedMt: number;
  deductionQtyMt: number;
  deductionAmount: number;
  policyLabel: string;
}

export interface DashboardPipelineSummary {
  saudaCheckPointContracts: number;
  temporaryArrivalsCount: number;
  finalArrivalsCount: number;
  millInspectionCount: number;
  paymentVouchersCount: number;
  settlementCount: number;
  pendingFmrCount: number;
  pendingInspectionCount: number;
  pendingPaymentCount: number;
  pendingSettlementCount: number;
}

export interface ExecutiveOverviewMetrics {
  // Card 1: Contracted Volume (Sauda Check Point ONLY)
  contractedVolumeMT: number;
  scpPoCount: number;
  // Card 2: Purchase Value (Payment Operations Payable Amt)
  paymentPayableAmt: number;
  paymentVoucherCount: number;
  // Card 3: Disbursed Payment (Payment Operations Paid Amount)
  paymentPaidAmt: number;
  // Card 4: Total Premium (Payment Operations Premium)
  paymentPremiumAmt: number;
  paymentPremiumMrCount: number;
  // Card 5: Total Short & Excess Deductions (Sauda Check Point Extra & Short Weight & Rate Settlement)
  shortExcessDeductionAmt: number;
  shortExcessPoCount: number;
  // Card 6: Flagged Deals (Unique SCP Saudas present in Mill Inspection / Total SCP Saudas)
  scpInMillInspectionUniqueCount: number;
  scpTotalSaudaCount: number;
  // Sourcing Footprint (Sauda Check Point ONLY)
  scpUniqueSuppliers: number;
  scpUniqueBrokers: number;
  scpUniqueAgencies: number;
  scpUniqueAreas: number;
  scpUniqueGrades: number;
  // Backlog cards
  pendingArrivalCount: number;       // SCP POs NOT present in Mill Inspection
  inspectionPendingCount: number;    // Final Arrival MRs NOT present in Mill Inspection
  settlementPendingCount: number;    // Mill Inspection POs NOT present in Settlement
}

export interface SystemReportDataset {
  transactions: ReportTransactionLine[];
  filtered: ReportTransactionLine[];
  allPoSummary: AllPoSummary;
  paymentOperations?: PaymentOperationsVoucher[];
  filteredPaymentOperations?: PaymentOperationsVoucher[];
  millInspections?: MillInspectionQualityRecord[];
  filteredMillInspections?: MillInspectionQualityRecord[];
  finalArrivalMrs?: FinalArrivalMrRef[];
  filteredFinalArrivalMrs?: FinalArrivalMrRef[];
  shortExcessItems?: ShortExcessSummaryItem[];
  filteredShortExcessItems?: ShortExcessSummaryItem[];
  dashboardPipeline?: DashboardPipelineSummary;
  executiveOverview?: ExecutiveOverviewMetrics;
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
