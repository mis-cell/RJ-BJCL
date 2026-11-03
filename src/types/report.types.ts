export interface SaudaRecord {
  sauda_id?: string;
  financial_year: string;
  sauda_no: string;
  date: string;
  broker?: string;
  supplier?: string;
  challan_supplier?: string;
  area?: string;
  agency?: string;
  marks?: string;
  total_lorry?: number;
  total_unit?: number;
  unit_type?: string;
  total_wt_in_ton?: number;
  shipment_date?: string;
  shipment_days?: number;
  delivery_days?: number;
  b_rate?: number;
  status: 'pending' | 'completed' | 'cancelled';
  created_at?: string;
  quality_details?: any[];
}

export interface PORecord {
  po_id?: string;
  financial_year: string;
  po_no: string;
  po_date: string;
  supplier?: string;
  broker?: string;
  area?: string;
  purchase_unit_name?: string;
  total_contract_mt?: number;
  b_rate?: number;
  status?: string;
  contract_po_no?: string;
  delivery_from?: string;
  delivery_to?: string;
  total_units?: number;
}

export interface MRRecord {
  mr_id?: string;
  amad_no?: string;
  po_no?: string;
  date: string;
  supplier?: string;
  broker?: string;
  actual_gross_weight?: number;
  actual_tare_weight?: number;
  supplier_net_weight?: number;
  electronic_net_weight?: number;
  weight_reduced?: number;
  weight_qtl?: number;
  status?: string;
  is_temporary?: boolean;
}

export interface PaymentRecord {
  payment_id?: string;
  po_no?: string;
  voucher_no?: string;
  date?: string;
  amount_paid?: number;
  total_amount?: number;
  status?: string;
}

export type SupplierRating = 'Excellent' | 'Good' | 'Average' | 'Poor' | 'Critical';
export type AgeingBucketKey = 'not_due' | '1_7_days' | '8_15_days' | '16_30_days' | '31_60_days' | 'above_60_days';

export interface AgeingBucketSummary {
  bucket: AgeingBucketKey;
  label: string;
  weight: number;
  count: number;
  percentage: number;
}

export interface BrokerSaudaItem {
  saudaId: string;
  saudaNo: string;
  session: string;
  date: string;
  supplier: string;
  grade: string;
  contractedMT: number;
  deliveredMT: number;
  pendingMT: number;
  rate: number;
  totalValue: number;
  deliveredValue: number;
  pendingValue: number;
  saudaDeskStatus: 'COMPLETED' | 'PENDING' | 'PARTIAL';
  settlementStatus: 'FULLY_SETTLED' | 'PAYMENT_PENDING' | 'DELIVERY_IN_PROGRESS' | 'PENDING_EXECUTION';
  brokeragePayable: number;
  brokeragePaid: number;
  brokeragePending: number;
  materialPaid: number;
  materialPending: number;
}

export interface TraceableRecordItem {
  id: string;
  recordNo: string;
  type: string;
  date: string;
  deliveryDate?: string;
  party: string;
  broker?: string;
  area?: string;
  grade?: string;
  quantity: number;
  unit: string;
  rate?: number;
  amount?: number;
  status: string;
  sourceTable: string;
  link?: string;
  details?: Record<string, any>;
}

export interface TraceableKpiDetails {
  title: string;
  description: string;
  formula: string;
  sourceTable: string;
  refreshBehavior: string;
  filterNotes?: string;
  totalCount: number;
  aggregateQuantity: string;
  aggregateUnit: string;
  records: TraceableRecordItem[];
}

export interface ReconciliationReportItem {
  metricName: string;
  oldValue: string;
  correctedValue: string;
  causeOfDifference: string;
  sourceTable: string;
  formula: string;
  statusRules: string;
}

// Unified Data Processing Engine
export interface CompiledReportData {
  // Global KPIs
  kpis: {
    totalContracts: number;
    totalSaudaContracts: number;
    totalPtfContracts: number;
    saudaContractedMT: number;
    ptfContractedMT: number;
    contractedWeightMT: number;
    saudaDeliveredMT: number;
    ptfDeliveredMT: number;
    deliveredWeightMT: number;
    checkpointDispatchedMT: number;
    checkpointDispatchedCount: number;
    saudaPendingMT: number;
    ptfPendingMT: number;
    pendingWeightMT: number;
    excessWeightMT: number;
    cancelledWeightMT: number;
    deliveredPct: number;
    pendingPct: number;
    excessPct: number;
    cancelledPct: number;
    fullyDeliveredContracts: number;
    fullyDeliveredPct: number;
    partiallyDeliveredContracts: number;
    partiallyDeliveredPct: number;
    notStartedContracts: number;
    notStartedPct: number;
    cancelledContracts: number;
    onTimeDeliveredMT: number;
    delayedDeliveredMT: number;
    onTimePct: number;
    delayedPct: number;
    avgContractRate: number;
    avgDispatchRate: number;
    totalContractValue: number;
    totalDispatchedValue: number;
    settlementCompletionPct: number;
    paymentCompletionPct: number;
    acceptanceRatePct: number;
    billPassingRatePct: number;
    finalPaymentTotal?: number;
    totalArrivalsCount?: number;
  };

  // Traceable record collections for drilldown modal
  traceableRecords: Record<string, TraceableKpiDetails>;

  // Audit Reconciliation Report
  reconciliationReport: ReconciliationReportItem[];

  // Reconciled transactional rows for drilldown and table display
  brokerSummary: Array<{
    broker: string;
    totalSuppliers: number;
    totalContracts: number;
    completedContractsCount: number;
    pendingContractsCount: number;
    contractCompletionPct: number;
    contractPendingPct: number;
    totalLots: number;
    contractedWeightMT: number;
    deliveredWeightMT: number;
    pendingWeightMT: number;
    deliveredPct: number;
    pendingPct: number;
    fullyDeliveredCount: number;
    partiallyDeliveredCount: number;
    notStartedCount: number;
    onTimePct: number;
    delayedPct: number;
    avgContractRate: number;
    avgDispatchRate: number;
    totalContractValue: number;
    deliveredMaterialValue: number;
    pendingMaterialValue: number;
    materialPaidAmount: number;
    materialPendingAmount: number;
    materialPaymentPct: number;
    brokerageRate: number;
    totalBrokeragePayable: number;
    brokeragePaid: number;
    brokeragePending: number;
    brokeragePaymentPct: number;
    settledContractsCount: number;
    settlementRatePct: number;
    settlementStatus: 'FULLY_SETTLED' | 'PAYMENT_PENDING' | 'DELIVERY_IN_PROGRESS' | 'PENDING_EXECUTION';
    performanceStatus: string;
    saudaItems: BrokerSaudaItem[];
  }>;

  supplierSummary: Array<{
    supplier: string;
    supplierCode: string;
    broker: string;
    area: string;
    totalContracts: number;
    contractedWeightMT: number;
    deliveredWeightMT: number;
    pendingWeightMT: number;
    deliveredPct: number;
    pendingPct: number;
    fullyCompletedCount: number;
    partiallyCompletedCount: number;
    undeliveredCount: number;
    onTimeCount: number;
    delayedCount: number;
    onTimePct: number;
    delayedPct: number;
    avgDelayDays: number;
    avgContractRate: number;
    avgReceivedRate: number;
    rejectedWeightMT: number;
    qualityRejectionPct: number;
    settlementPct: number;
    paymentPct: number;
    rating: SupplierRating;
  }>;

  areaSummary: Array<{
    state: string;
    district: string;
    area: string;
    totalSuppliers: number;
    totalBrokers: number;
    totalContracts: number;
    contractedWeightMT: number;
    deliveredWeightMT: number;
    pendingWeightMT: number;
    deliveredPct: number;
    pendingPct: number;
    avgRate: number;
    procurementValue: number;
    avgTransitDays: number;
    onTimePct: number;
    delayedPct: number;
    lorryCount: number;
    avgWeightPerLorry: number;
    weightVarianceMT: number;
    weightVariancePct: number;
    performanceStatus: string;
  }>;

  monthWisePerformance: Array<{
    monthKey: string;
    monthLabel: string;
    openingPendingMT: number;
    newContractedMT: number;
    totalAvailableMT: number;
    deliveredMT: number;
    closingPendingMT: number;
    deliveredPct: number;
    pendingPct: number;
    fullyCompletedCount: number;
    partialCount: number;
    notStartedCount: number;
    avgRate: number;
    procurementValue: number;
    onTimePct: number;
    delayedPct: number;
    settlementPct: number;
    paymentPct: number;
    sameMonthDeliveredMT: number;
    prevMonthDeliveredMT: number;
    carriedForwardMT: number;
    overduePendingMT: number;
  }>;

  gradeItemSummary: Array<{
    item: string;
    grade: string;
    cropYear: string;
    marka: string;
    contractedWeightMT: number;
    deliveredWeightMT: number;
    pendingWeightMT: number;
    deliveredPct: number;
    pendingPct: number;
    receivedBags: number;
    acceptedBags: number;
    rejectedBags: number;
    acceptancePct: number;
    rejectionPct: number;
    avgContractRate: number;
    avgReceivedRate: number;
    rateVariance: number;
    rateVariancePct: number;
    totalPurchaseValue: number;
    moisturePct?: number;
    dustPct?: number;
  }>;

  activePendingLedger: Array<{
    saudaNo: string;
    poNo: string;
    contractDate: string;
    supplier: string;
    broker: string;
    area: string;
    grade: string;
    contractedWeightMT: number;
    deliveredWeightMT: number;
    pendingWeightMT: number;
    deliveredPct: number;
    pendingPct: number;
    scheduledDeliveryDate: string;
    daysPending: number;
    delayStatus: string;
    lastReceiptDate: string;
    responsiblePerson: string;
    nextAction: string;
    finalStatus: string;
    ageingBucket: AgeingBucketKey;
  }>;

  ageingDistribution: AgeingBucketSummary[];

  poSummaryEngine: {
    totalPOs: number;
    activePOs: number;
    completedPOs: number;
    pendingPOs: number;
    poContractedMT: number;
    mrReceivedMT: number;
    poReceivedPct: number;
    poPendingPct: number;
    tempMRPct: number;
    finalMRPct: number;
    clubbingCompletionPct: number;
    settlementCompletionPct: number;
    paymentCompletionPct: number;
    rows: Array<{
      poNo: string;
      poDate: string;
      supplier: string;
      broker: string;
      area: string;
      grade: string;
      contractedMT: number;
      receivedMT: number;
      pendingMT: number;
      receivedPct: number;
      pendingPct: number;
      lifecycleStatus: 'Pending Arrival' | 'Partially Received' | 'Fully Received' | 'Excess Received' | 'Clubbed' | 'Settlement Pending' | 'Payment Pending' | 'Closed';
      tempMRNumber: string;
      finalMRNumber: string;
      settlementStatus: string;
      paymentStatus: string;
    }>;
  };

  deliveryCompliance: Array<{
    name: string; // Supplier / Broker / Area
    scheduledMT: number;
    onTimeMT: number;
    delayedMT: number;
    undeliveredMT: number;
    onTimePct: number;
    delayedPct: number;
    undeliveredPct: number;
    avgDelayDays: number;
    maxDelayDays: number;
    complianceScore: number;
  }>;

  financialAnalytics: {
    contractValue: number;
    receivedMaterialValue: number;
    pendingProcurementValue: number;
    brokeragePayable: number;
    settlementAmount: number;
    deductionAmount: number;
    excessShortAdjustment: number;
    advancePayment: number;
    finalPayment: number;
    outstandingAmount: number;
    paymentCompletionPct: number;
    costVarianceMT: number;
    costVariancePct: number;
    rateVariancePct: number;
  };

  fullPipelineAudit: Array<{
    saudaNo: string;
    poNo: string;
    tempMRNo: string;
    finalMRNo: string;
    supplier: string;
    broker: string;
    grade: string;
    contractedMT: number;
    tempReceivedMT: number;
    finalReceivedMT: number;
    settledMT: number;
    paidAmount: number;
    deliveryPct: number;
    finalMRCompletionPct: number;
    settlementPct: number;
    paymentPct: number;
    weightVarianceMT: number;
    weightVariancePct: number;
    currentStage: string;
    stageColor: 'green' | 'blue' | 'yellow' | 'orange' | 'red' | 'gray';
    mismatchStatus: string;
    auditStatus: string;
    lastUpdatedDate: string;
  }>;
}

export type GradeItemSummary = CompiledReportData['gradeItemSummary'][number];
