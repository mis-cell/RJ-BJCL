export interface UnifiedContractRecord {
  id: string;
  contractNo: string;
  cleanContractNo: string;
  contractType: 'SAUDA' | 'FINAL_PO' | 'PTF';
  contractDate: string; // ISO date or YYYY-MM-DD
  year: number;
  month: number; // 0-11
  monthName: string;
  supplier: string;
  broker: string;
  area?: string;
  purchaseUnit: string;
  totalUnits: number;
  totalWeightMt: number;
  ratePerQtl: number;
  contractValue: number;
  
  // Arrival Status (calculated from Temporary Arrival)
  arrivalStatus: 'RECEIVED' | 'PENDING' | 'PARTIAL';
  receivedWeightMt: number;
  pendingWeightMt: number;
  arrivalRecordsCount: number;
  
  // Payment Status (calculated from Payment Operations)
  payableValue: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: 'PAID' | 'PARTIALLY_PAID' | 'PENDING' | 'OVERPAID';
  voucherNos: string[];
  rawRecord: any;
}

export interface MonthSummary {
  monthIndex: number; // 0-11 (0 = January, 11 = December)
  monthName: string;
  year: number;
  totalContracts: number;
  saudaContracts: number;
  ptfContracts: number;
  pendingContracts: number;
  partialContracts: number;
  totalWeightMt: number;
  saudaWeightMt: number;
  ptfWeightMt: number;
  pendingWeightMt: number;
  partialWeightMt: number;
  totalContractValue: number;
  paidAmount: number;
  remainingAmount: number;
  contracts: UnifiedContractRecord[];
}

export interface DashboardMetricsResult {
  // 1. Sauda Check Point Card Totals
  totalContractsCount: number;
  totalWeightMt: number;
  saudaContractsCount: number;
  saudaWeightMt: number;
  ptfContractsCount: number;
  ptfWeightMt: number;
  
  // 2. Pending Sauda Card Totals
  totalPendingContractsCount: number;
  totalPendingWeightMt: number;
  pendingSaudaCount: number;
  pendingSaudaWeightMt: number;
  pendingPtfCount: number;
  pendingPtfWeightMt: number;
  
  // 3. Payment Totals
  totalPayableValue: number;
  totalPaidAmount: number;
  totalRemainingAmount: number;
  advancePaymentAmount: number;
  
  // 4. Godown Stock Totals
  totalStockMt: number;
  godownStockBales: number;
  
  // 5. Month-Wise Summaries (grouped by year)
  availableYears: number[];
  selectedYear: number;
  monthSummaries: MonthSummary[];
  
  // 6. Traceable Master List
  allContracts: UnifiedContractRecord[];
  allPayments: any[];
}

export interface InspectionRecord {
  id: string;
  mrNo: string;
  cleanMrNo: string;
  poNo: string;
  cleanPoNo: string;
  date: string;
  year: number;
  month: number; // 0-11
  monthName: string;
  supplier: string;
  broker: string;
  vehicleNo: string;
  juteGrade: string;
  weightQtl: number;
  weightMt: number;
  
  // 1. Moisture % & Claim
  actualMoisture: number;
  claimMoisture: number;
  moistureDeductionAmount: number;
  
  // 2. Dust % & Claim
  actualDust: number;
  claimDust: number;
  dustDeductionAmount: number;
  
  // 3. Grade Down % & Claim
  actualGradeDown: number;
  claimGradeDown: number;
  gradeDownDeductionAmount: number;
  
  // 4. Chotta & Habi Jabi
  chottaWeightKg: number;
  habijabiWeightKg: number;
  totalChottaHabijabiKg: number;
  chottaHabijabiDeductionAmount: number;
  chottaGrade: string;
  habijabiGrade: string;
  
  // 5. Premium (ONLY FROM SAUDA CHECK POINT)
  premium: string;
  isPremium: boolean;
  premiumRate: number;
  premiumAmount: number;
  premiumSource: string;
  
  // Additional claims
  qualityDeductionAmount: number;
  deliveryClaimAmount: number;
  baleWeightDeductionAmount: number;
  otherDeductionAmount: number;
  totalClaimAmount: number;
  
  status: string;
  remarks: string;
  rawRecord: any;
}

export interface PendingStageRecord {
  id: string;
  stage: 'MR_TO_FMR' | 'FMR_TO_INSP' | 'INSP_TO_PAYM' | 'PAYM_TO_SETT';
  stageLabel: string;
  stageCode: 'MR ➔ FMR' | 'FMR ➔ INSP' | 'INSP ➔ Paym' | 'Paym ➔ Sett';
  poNo: string;
  cleanPoNo: string;
  mrNo: string;
  arrivalNo?: string;
  date: string;
  supplier: string;
  broker: string;
  vehicleNo: string;
  bales: number;
  weightMt: number;
  weightQtl: number;
  amount: number;
  status: string;
  pendingAction: string;
  rawRecord?: any;
}

export interface MonthInspectionSummary {
  monthIndex: number;
  monthName: string;
  year: number;
  totalInspections: number; // Represents total MR count from Temporary Arrival
  totalWeightMt: number;
  
  // 1. Temporary Arrival (MR) Specifics
  temporaryArrivalsCount: number;
  temporaryArrivalsBales: number;
  temporaryArrivalsWeightMt: number;
  
  // 2. Final Arrival (FMR) Specifics
  finalArrivalsCount: number;
  finalArrivalsBales: number;
  finalArrivalsWeightMt: number;
  pendingFmrCount: number; // Below FMR / Pending Final Arrival
  
  // 3. Mill Inspection Specifics
  inspectionCount: number;
  pendingInspectionCount: number;
  materialInspectionCount: number;
  millInspectionCount: number;
  
  // 4. Payment Specifics
  paymentCount: number;
  paymentPaidAmount: number;
  paymentPayableAmount: number;
  
  // 5. Settlement Specifics
  settlementCount: number;
  settlementAmount: number;
  
  // 6. Pipeline Pending Lists & P.O. Number Tracking
  pendingFmrList: PendingStageRecord[];
  pendingInspectionList: PendingStageRecord[];
  pendingPaymentList: PendingStageRecord[];
  pendingSettlementList: PendingStageRecord[];
  allPendingPipelineList: PendingStageRecord[];
  pendingFmrPoCount: number;
  pendingInspectionPoCount: number;
  pendingPaymentPoCount: number;
  pendingSettlementPoCount: number;
  totalPendingPoCount: number;
  
  // Averages & Totals (Quality & Claims)
  avgMoisture: number;
  avgClaimMoisture: number;
  avgDust: number;
  avgClaimDust: number;
  avgGradeDown: number;
  avgClaimGradeDown: number;
  
  totalChottaHabijabiKg: number;
  totalChottaHabijabiClaim: number;
  
  // Premium lots from Sauda Check Point
  premiumLotsCount: number;
  premiumTotalSum: number;
  avgPremiumRate: number;
  
  totalClaimAmount: number;
  lotsWithMoistureClaim: number;
  lotsWithQualityClaim: number;
  inspections: InspectionRecord[];
  payments: any[];
  settlements: any[];
  temporaryArrivals: any[];
  finalArrivals: any[];
}

export interface ComputeInspectionMetricsParams {
  inspections?: any[];
  inspectionDetails?: any[];
  materialInspections?: any[];
  millInspections?: any[];
  arrivals?: any[]; // temporary_material_received (TMR)
  finalArrivals?: any[]; // final_arrival (FMR)
  saudaCheckPoints?: any[];
  saudaCheckPointDetails?: any[];
  paymentRecords?: any[];
  paymentDetails?: any[];
  pos?: any[];
  settlements?: any[];
  selectedYear?: number;
}

export interface InspectionMetricsResult {
  monthInspectionSummaries: MonthInspectionSummary[];
  allInspections: InspectionRecord[];
  totalInspectionsCount: number;
  totalInspectedWeightMt: number;
  totalYearTemporaryArrivalsCount: number;
  totalYearBales: number;
  totalYearArrivalWeightMt: number;
  totalYearFinalArrivalsCount: number;
  totalYearFinalArrivalsBales: number;
  totalYearFinalArrivalsWeightMt: number;
  totalYearPendingFmrCount: number;
  totalYearInspectionsCount: number;
  totalMaterialInspectionsCount: number;
  totalMillInspectionsCount: number;
  totalPendingInspectionsCount: number;
  totalYearPaymentsCount: number;
  totalYearPaidAmount: number;
  totalYearSettlementsCount: number;
  totalYearSettledAmount: number;
  allYearPendingFmrList: PendingStageRecord[];
  allYearPendingInspectionList: PendingStageRecord[];
  allYearPendingPaymentList: PendingStageRecord[];
  allYearPendingSettlementList: PendingStageRecord[];
  allYearPendingPipelineList: PendingStageRecord[];
  yearPendingFmrPoCount: number;
  yearPendingInspectionPoCount: number;
  yearPendingPaymentPoCount: number;
  yearPendingSettlementPoCount: number;
  yearTotalPendingPoCount: number;
  overallAvgMoisture: number;
  overallAvgClaimMoisture: number;
  overallAvgDust: number;
  overallAvgClaimDust: number;
  overallAvgGradeDown: number;
  overallAvgClaimGradeDown: number;
  totalChottaHabijabiKg: number;
  totalPremiumLots: number;
  totalPremiumSum: number;
  avgPremiumRate: number;
  totalClaimAmount: number;
  availableYears: number[];
  selectedYear: number;
}

export interface ComputeDashboardMetricsParams {
  saudaCheckPoints?: any[];
  saudaCheckPointDetails?: any[];
  purchaseOrders?: any[]; // purchase_master
  purchaseOrderDetails?: any[]; // purchase_detail_master
  temporaryArrivals?: any[]; // temporary_material_received / amad
  finalArrivals?: any[]; // final_arrival
  paymentRecords?: any[]; // payment_master
  openingStocks?: any[];
  millIssueMasters?: any[];
  millIssueDetails?: any[];
  selectedYear?: number;
}
