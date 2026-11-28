import {
  ExecutiveOverviewMetrics,
  FinalArrivalMrRef,
  MillInspectionQualityRecord,
  PaymentOperationsVoucher,
  ReportFilterCriteria,
  ReportTransactionLine,
  ShortExcessSummaryItem,
  SystemReportDataset
} from '../../types/systemReport.types';
import { isInvalidAgency } from './systemReportSanitizers';

export interface MillInspectionRankingRow {
  key: string;
  mrCount: number;
  poCount: number;
  totalMt: number;
  estimatedValue: number;
  avgGradeDown: number;
  avgMoisture: number;
  avgMoistureLimit: number;
  avgExcessMoisture: number;
  avgDust: number;
  avgNcv: number;
  totalHabijabiChattaRopeKg: number;
  avgCtPct: number;
  excessMoistureLots: number;
  gradeDownLots: number;
  dustLots: number;
  ncvLots: number;
  ctLots: number;
  cleanLots: number;
  cleanRatePct: number;
  performanceScore: number;
  defectScore: number;
  tier: 'Excellent' | 'Good' | 'Watch' | 'Poor';
  valueSharePct: number;
  mtSharePct: number;
  records: MillInspectionQualityRecord[];
}

export function filterByReportCriteria<
  T extends {
    date?: string;
    month?: string;
    financialYear?: string;
    broker?: string;
    supplier?: string;
    agency?: string;
    area?: string;
    grade?: string;
    poNo?: string;
    saudaNo?: string;
    mrNo?: string;
    voucherNo?: string;
  }
>(items: T[], filters: ReportFilterCriteria): T[] {
  if (!items || items.length === 0) return [];
  return items.filter(item => {
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      const match =
        (item.saudaNo || '').toLowerCase().includes(q) ||
        (item.poNo || '').toLowerCase().includes(q) ||
        (item.mrNo || '').toLowerCase().includes(q) ||
        (item.voucherNo || '').toLowerCase().includes(q) ||
        (item.supplier || '').toLowerCase().includes(q) ||
        (item.broker || '').toLowerCase().includes(q) ||
        (item.area || '').toLowerCase().includes(q) ||
        (item.grade || '').toLowerCase().includes(q);
      if (!match) return false;
    }

    if (filters.financialYear && item.financialYear && item.financialYear !== filters.financialYear) return false;
    if (filters.month && item.month && item.month !== filters.month) return false;
    if (filters.broker && (item.broker || '') !== filters.broker) return false;
    if (filters.supplier && (item.supplier || '') !== filters.supplier) return false;
    if (filters.agency) {
      const aStr = item.agency || '';
      const parts = aStr.split(',').map(p => p.trim());
      if (aStr !== filters.agency && !parts.includes(filters.agency)) return false;
    }
    if (filters.area && (item.area || '') !== filters.area) return false;
    if (filters.grade) {
      const gStr = item.grade || '';
      const parts = gStr.split(',').map(p => p.trim());
      if (gStr !== filters.grade && !parts.includes(filters.grade)) return false;
    }

    if (filters.dateFrom && item.date) {
      if (new Date(item.date) < new Date(filters.dateFrom)) return false;
    }
    if (filters.dateTo && item.date) {
      if (new Date(item.date) > new Date(filters.dateTo + 'T23:59:59')) return false;
    }

    return true;
  });
}

const isPlaceholderText = (val?: string, extraBad: string[] = []): boolean => {
  const s = (val || '').trim();
  if (!s || s === '-' || s === '—' || s === 'N/A' || s === 'NA') return true;
  const u = s.toUpperCase();
  if (u === 'UNASSIGNED' || u === 'UNKNOWN' || u === 'NULL' || u === 'NONE') return true;
  return extraBad.some(b => u === b.toUpperCase());
};

export function calculateExecutiveOverviewMetrics(params: {
  transactions: ReportTransactionLine[];
  paymentOperations: PaymentOperationsVoucher[];
  millInspections: MillInspectionQualityRecord[];
  finalArrivalMrs: FinalArrivalMrRef[];
  shortExcessItems: ShortExcessSummaryItem[];
}): ExecutiveOverviewMetrics {
  const {
    transactions,
    paymentOperations,
    millInspections,
    finalArrivalMrs,
    shortExcessItems
  } = params;

  // 1. Contracted Volume (ONLY Sauda Check Point -> Total Contract M.Ton)
  let contractedVolumeMT = 0;
  const scpPoSet = new Set<string>();
  const scpSaudaAllSet = new Set<string>();
  const scpSaudaInMillInspSet = new Set<string>();
  const pendingArrivalPoSet = new Set<string>();

  const supplierSet = new Set<string>();
  const brokerSet = new Set<string>();
  const agencySet = new Set<string>();
  const areaSet = new Set<string>();
  const gradeSet = new Set<string>();

  transactions.forEach((t, idx) => {
    contractedVolumeMT += Number(t.quantityMT || 0);

    const poKey = !isPlaceholderText(t.poNo, ['Pending P.O.'])
      ? t.poNo.trim().toUpperCase()
      : '';
    if (poKey) scpPoSet.add(poKey);

    const saudaKey = !isPlaceholderText(t.saudaNo)
      ? t.saudaNo.trim().toUpperCase()
      : poKey || t.txnId || `SCP-${idx}`;
    scpSaudaAllSet.add(saudaKey);

    if (t.hasInspection) {
      scpSaudaInMillInspSet.add(saudaKey);
    } else if (poKey) {
      pendingArrivalPoSet.add(poKey);
    }

    if (!isPlaceholderText(t.supplier, ['Unassigned Supplier'])) {
      supplierSet.add(t.supplier.trim().toUpperCase());
    }
    if (!isPlaceholderText(t.broker, ['Direct', 'Direct Purchase'])) {
      brokerSet.add(t.broker.trim().toUpperCase());
    }
    // Unique AGENCY Name from Purchase Order Details (Items Table Matrix)
    if (Array.isArray(t.detailAgencies) && t.detailAgencies.length > 0) {
      t.detailAgencies.forEach(ag => {
        const clean = (ag || '').trim();
        if (!isPlaceholderText(clean, ['Direct Purchase / Head Office']) && !isInvalidAgency(clean)) {
          agencySet.add(clean.toUpperCase());
        }
      });
    } else if (!isPlaceholderText(t.agency, ['Direct Purchase / Head Office']) && !isInvalidAgency(t.agency)) {
      t.agency.split(',').forEach(part => {
        const clean = part.trim();
        if (!isPlaceholderText(clean, ['Direct Purchase / Head Office']) && !isInvalidAgency(clean)) {
          agencySet.add(clean.toUpperCase());
        }
      });
    }
    if (!isPlaceholderText(t.area, ['Unassigned Area'])) {
      areaSet.add(t.area.trim().toUpperCase());
    }
    if (!isPlaceholderText(t.grade, ['NORMAL', 'STANDARD GRADE', 'NORMAL GRADE'])) {
      t.grade.split(',').forEach(part => {
        const g = part.trim();
        if (!isPlaceholderText(g, ['NORMAL', 'STANDARD GRADE', 'NORMAL GRADE'])) {
          gradeSet.add(g.toUpperCase());
        }
      });
    }
  });

  // 2, 3, 4. Payment Operations -> Payable Amt, Paid Amount, Premium
  let paymentPayableAmt = 0;
  let paymentPaidAmt = 0;
  let paymentPremiumAmt = 0;
  const premiumMrSet = new Set<string>();

  paymentOperations.forEach((p, idx) => {
    paymentPayableAmt += Number(p.payableAmount || 0);
    paymentPaidAmt += Number(p.paidAmount || 0);
    paymentPremiumAmt += Number(p.premiumAmount || 0);
    if (Number(p.premiumAmount || 0) > 0) {
      const mrKey = !isPlaceholderText(p.mrNo)
        ? p.mrNo.trim().toUpperCase()
        : p.voucherNo || p.id || `PAY-${idx}`;
      premiumMrSet.add(mrKey);
    }
  });

  // 5. Total Short & Excess Deductions (Sauda Check Point -> Extra & Short Weight & Rate Settlement)
  let shortExcessDeductionAmt = 0;
  const shortExcessPoSet = new Set<string>();
  shortExcessItems.forEach((s, idx) => {
    const amt = Number(s.deductionAmount || 0);
    shortExcessDeductionAmt += amt;
    if (amt > 0) {
      shortExcessPoSet.add((s.poNo || `SE-${idx}`).trim().toUpperCase());
    }
  });

  // 13. Inspection Pending: Final Arrival - Mill Inspection
  const finalArrivalUniqueSet = new Set<string>();
  finalArrivalMrs.forEach(m => {
    if (!isPlaceholderText(m.mrNo)) {
      finalArrivalUniqueSet.add(m.mrNo.trim().toUpperCase().replace(/[\s\-_]/g, ''));
    }
  });
  const millInspectionUniqueSet = new Set<string>();
  millInspections.forEach(m => {
    if (!isPlaceholderText(m.mrNo)) {
      millInspectionUniqueSet.add(m.mrNo.trim().toUpperCase().replace(/[\s\-_]/g, ''));
    }
  });
  const finalArrivalCount = finalArrivalUniqueSet.size;
  const millInspectionCount = millInspectionUniqueSet.size;
  const inspectionPendingCount = Math.max(0, finalArrivalCount - millInspectionCount);

  // 14. Settlement Pending: Unique P.O No. in Mill Inspection NOT present in Settlement
  const settlementPendingPoSet = new Set<string>();
  millInspections.forEach(m => {
    if (!m.hasSettlement && !isPlaceholderText(m.poNo, ['Pending P.O.'])) {
      settlementPendingPoSet.add(m.poNo.trim().toUpperCase());
    }
  });

  return {
    contractedVolumeMT,
    scpPoCount: scpPoSet.size || transactions.length,
    paymentPayableAmt,
    paymentVoucherCount: paymentOperations.length,
    paymentPaidAmt,
    paymentPremiumAmt,
    paymentPremiumMrCount: premiumMrSet.size,
    shortExcessDeductionAmt,
    shortExcessPoCount: shortExcessPoSet.size,
    scpInMillInspectionUniqueCount: scpSaudaInMillInspSet.size,
    scpTotalSaudaCount: scpSaudaAllSet.size,
    scpUniqueSuppliers: supplierSet.size,
    scpUniqueBrokers: brokerSet.size,
    scpUniqueAgencies: agencySet.size,
    scpUniqueAreas: areaSet.size,
    scpUniqueGrades: gradeSet.size,
    pendingArrivalCount: pendingArrivalPoSet.size,
    inspectionPendingCount,
    finalArrivalCount,
    millInspectionCount,
    settlementPendingCount: settlementPendingPoSet.size
  };
}

export function calculateMillInspectionRankings(
  millInspections: MillInspectionQualityRecord[],
  entity: 'broker' | 'supplier'
): MillInspectionRankingRow[] {
  const map = new Map<string, {
    key: string;
    mrSet: Set<string>;
    poSet: Set<string>;
    lotCount: number;
    totalMt: number;
    estimatedValue: number;
    weightSum: number;
    wGradeDown: number;
    wMoisture: number;
    wMoistureLimit: number;
    wExcessMoisture: number;
    wDust: number;
    wNcv: number;
    wCtPct: number;
    totalHabijabiChattaRopeKg: number;
    excessMoistureLots: number;
    gradeDownLots: number;
    dustLots: number;
    ncvLots: number;
    ctLots: number;
    cleanLots: number;
    records: MillInspectionQualityRecord[];
  }>();

  millInspections.forEach((rec, idx) => {
    const rawName = entity === 'broker' ? rec.broker : rec.supplier;
    const key = rawName && rawName.trim() && rawName.trim() !== '-'
      ? rawName.trim()
      : (entity === 'broker' ? 'Direct / Unassigned' : 'Unassigned Supplier');

    if (!map.has(key)) {
      map.set(key, {
        key,
        mrSet: new Set<string>(),
        poSet: new Set<string>(),
        lotCount: 0,
        totalMt: 0,
        estimatedValue: 0,
        weightSum: 0,
        wGradeDown: 0,
        wMoisture: 0,
        wMoistureLimit: 0,
        wExcessMoisture: 0,
        wDust: 0,
        wNcv: 0,
        wCtPct: 0,
        totalHabijabiChattaRopeKg: 0,
        excessMoistureLots: 0,
        gradeDownLots: 0,
        dustLots: 0,
        ncvLots: 0,
        ctLots: 0,
        cleanLots: 0,
        records: []
      });
    }

    const g = map.get(key)!;
    g.lotCount += 1;
    g.mrSet.add(rec.mrNo || `MR-${idx}`);
    if (rec.poNo && rec.poNo !== '-') g.poSet.add(rec.poNo);

    const wt = rec.receivedMt > 0 ? rec.receivedMt : 1;
    g.totalMt += rec.receivedMt;
    g.estimatedValue += rec.estimatedValue;
    g.weightSum += wt;
    g.wGradeDown += rec.gradeDownPct * wt;
    g.wMoisture += rec.actualMoisture * wt;
    g.wMoistureLimit += rec.moistureLimit * wt;
    g.wExcessMoisture += rec.excessMoisture * wt;
    g.wDust += rec.dustPct * wt;
    g.wNcv += rec.ncvPct * wt;
    g.wCtPct += rec.ctPct * wt;
    g.totalHabijabiChattaRopeKg += rec.habijabiChattaRopeKg;

    const hasMoist = rec.excessMoisture > 0.01;
    const hasGd = rec.gradeDownPct > 0.01;
    const hasDust = rec.dustPct > 0.01;
    const hasNcv = rec.ncvPct > 0.01;
    const hasCt = rec.habijabiChattaRopeKg > 0.01 || rec.ctPct > 0.01;

    if (hasMoist) g.excessMoistureLots += 1;
    if (hasGd) g.gradeDownLots += 1;
    if (hasDust) g.dustLots += 1;
    if (hasNcv) g.ncvLots += 1;
    if (hasCt) g.ctLots += 1;
    if (!hasMoist && !hasGd && !hasDust && !hasNcv && !hasCt) g.cleanLots += 1;

    g.records.push(rec);
  });

  const totalAllValue = millInspections.reduce((s, r) => s + r.estimatedValue, 0);
  const totalAllMt = millInspections.reduce((s, r) => s + r.receivedMt, 0);

  return Array.from(map.values())
    .map(g => {
      const denom = g.weightSum > 0 ? g.weightSum : 1;
      const avgGradeDown = g.wGradeDown / denom;
      const avgMoisture = g.wMoisture / denom;
      const avgMoistureLimit = g.wMoistureLimit / denom;
      const avgExcessMoisture = g.wExcessMoisture / denom;
      const avgDust = g.wDust / denom;
      const avgNcv = g.wNcv / denom;
      const avgCtPct = g.wCtPct / denom;

      // Higher Grade Down, Excess Moisture (above active seasonal limit), Dust, NCV, or CT/Habijabi/Chatta/Rope reduces performance score
      const penaltyGradeDown = Math.min(35, avgGradeDown * 2.5);
      const penaltyMoisture = Math.min(30, avgExcessMoisture * 4.0);
      const penaltyDust = Math.min(15, avgDust * 3.0);
      const penaltyNcv = Math.min(10, avgNcv * 3.0);
      const penaltyCt = Math.min(10, avgCtPct * 2.5);

      const performanceScore = Math.max(
        0,
        Math.min(100, Number((100 - penaltyGradeDown - penaltyMoisture - penaltyDust - penaltyNcv - penaltyCt).toFixed(1)))
      );
      const defectScore = Number((100 - performanceScore).toFixed(1));
      const cleanRatePct = g.lotCount > 0 ? (g.cleanLots / g.lotCount) * 100 : 100;

      let tier: MillInspectionRankingRow['tier'] = 'Excellent';
      if (performanceScore < 50) tier = 'Poor';
      else if (performanceScore < 70) tier = 'Watch';
      else if (performanceScore < 85) tier = 'Good';

      return {
        key: g.key,
        mrCount: g.mrSet.size || g.lotCount,
        poCount: g.poSet.size,
        totalMt: g.totalMt,
        estimatedValue: g.estimatedValue,
        avgGradeDown,
        avgMoisture,
        avgMoistureLimit,
        avgExcessMoisture,
        avgDust,
        avgNcv,
        totalHabijabiChattaRopeKg: g.totalHabijabiChattaRopeKg,
        avgCtPct,
        excessMoistureLots: g.excessMoistureLots,
        gradeDownLots: g.gradeDownLots,
        dustLots: g.dustLots,
        ncvLots: g.ncvLots,
        ctLots: g.ctLots,
        cleanLots: g.cleanLots,
        cleanRatePct,
        performanceScore,
        defectScore,
        tier,
        valueSharePct: totalAllValue > 0 ? (g.estimatedValue / totalAllValue) * 100 : 0,
        mtSharePct: totalAllMt > 0 ? (g.totalMt / totalAllMt) * 100 : 0,
        records: g.records
      };
    })
    .sort((a, b) => b.performanceScore - a.performanceScore || b.totalMt - a.totalMt);
}

// Compute all aggregated metrics from filtered transaction records
export function calculateReportMetrics(txns: ReportTransactionLine[]): SystemReportDataset['metrics'] {
  let totalBusinessValue = 0;
  let totalQuantityMT = 0;
  let totalPurchaseValue = 0;
  let totalPremium = 0;
  let totalDeduction = 0;
  let totalClaim = 0;
  let totalSettlement = 0;
  let totalPayment = 0;
  let grossProfit = 0;
  let totalLoss = 0;
  let nonProfitableBusiness = 0;
  let effectiveCostSum = 0;
  let sumQtyRate = 0;
  let sumQtyBase = 0;

  let arrivedMT = 0;
  let pendingDeliveryMT = 0;

  let saudaPendingCount = 0;
  let temporaryArrivalPendingCount = 0;
  let finalArrivalPendingCount = 0;
  let millInspectionPendingCount = 0;
  let paymentPendingCount = 0;
  let settlementPendingCount = 0;

  let abnormalCount = 0;
  let highDeductionCount = 0;
  let highPremiumCount = 0;
  let highMoistureCount = 0;
  let gradeDownCount = 0;
  let highClaimCount = 0;
  let lossMakingCount = 0;
  let delayedCount = 0;
  let profitableCount = 0;
  let breakEvenCount = 0;

  const poSet = new Set<string>();
  const saudaSet = new Set<string>();
  const supplierSet = new Set<string>();
  const brokerSet = new Set<string>();
  const agencySet = new Set<string>();
  const areaSet = new Set<string>();
  const gradeSet = new Set<string>();
  const premiumMRSet = new Set<string>();

  txns.forEach((t, idx) => {
    totalQuantityMT += t.quantityMT;
    totalPurchaseValue += t.grossPurchaseValue;
    totalBusinessValue += t.grossPurchaseValue;
    effectiveCostSum += t.effectiveCost;
    totalPremium += t.premiumAmount;
    if (t.premiumAmount > 0) {
      if (t.mrNo) {
        t.mrNo.split(',').forEach(m => {
          const trimmed = m.trim();
          if (trimmed) premiumMRSet.add(trimmed);
        });
      } else {
        const mrKey = t.poNo || t.saudaNo || t.txnId || `TXN-${idx}`;
        premiumMRSet.add(mrKey);
      }
    }
    totalDeduction += t.deductionAmount;
    totalClaim += t.claimAmount;
    totalSettlement += (t.settledAmount !== undefined ? t.settledAmount : t.claimSettled);
    totalPayment += t.paidAmount;
    grossProfit += t.grossProfit;
    
    arrivedMT += t.arrivedWeightMT;
    pendingDeliveryMT += t.pendingWeightMT;

    sumQtyRate += t.quantityMT * t.purchaseRate;
    sumQtyBase += t.quantityMT * t.baseRate;

    if (t.poNo && t.poNo !== 'Pending P.O.' && t.poNo !== '-') poSet.add(t.poNo);
    if (t.saudaNo && t.saudaNo !== '-') saudaSet.add(t.saudaNo);
    if (t.supplier && t.supplier !== 'Unassigned Supplier' && t.supplier !== '-') supplierSet.add(t.supplier);
    if (t.broker && t.broker !== 'Direct' && t.broker !== '-') brokerSet.add(t.broker);
    if (t.agency && t.agency !== '-') agencySet.add(t.agency);
    if (t.area && t.area !== '-') areaSet.add(t.area);
    if (t.grade && t.grade !== '-' && t.grade.toUpperCase() !== 'NORMAL' && t.grade.toUpperCase() !== 'STANDARD GRADE' && t.grade.toUpperCase() !== 'NORMAL GRADE') gradeSet.add(t.grade);

    if (t.grossProfit < 0) {
      totalLoss += Math.abs(t.grossProfit);
      lossMakingCount++;
    } else if (t.grossProfit === 0 || t.profitStatus === 'BREAK-EVEN') {
      breakEvenCount++;
    } else {
      profitableCount++;
    }

    if (t.profitStatus === 'NON-PROFITABLE' || t.profitStatus === 'LOSS') {
      nonProfitableBusiness += t.grossPurchaseValue;
    }

    if (t.pendingWeightMT > 0.01) saudaPendingCount++;
    if (t.arrivalStatus === 'PENDING') temporaryArrivalPendingCount++;
    if (t.arrivalStatus === 'IN_TRANSIT') finalArrivalPendingCount++;
    if (t.inspectionStatus === 'PENDING') millInspectionPendingCount++;
    if (t.paymentStatus !== 'PAID') paymentPendingCount++;
    if (t.settlementStatus !== 'SETTLED') settlementPendingCount++;

    if (t.isAbnormal || t.hasMismatch) abnormalCount++;
    if (t.deductionPct > 2) highDeductionCount++;
    if (t.premiumRate > 50 || t.premiumAmount > 5000) highPremiumCount++;
    if (t.moisturePct > 18) highMoistureCount++;
    if (t.gradeDownQty > 0) gradeDownCount++;
    if (t.claimAmount > 5000) highClaimCount++;
    if (t.isDelayed) delayedCount++;
  });

  const profitMarginPct = effectiveCostSum > 0 ? (grossProfit / effectiveCostSum) * 100 : 0;
  const weightedPurchaseRate = totalQuantityMT > 0 ? sumQtyRate / totalQuantityMT : 0;
  const weightedBaseRate = totalQuantityMT > 0 ? sumQtyBase / totalQuantityMT : 0;

  return {
    totalBusinessValue,
    totalQuantityMT,
    totalPOCount: poSet.size,
    totalSaudaCount: saudaSet.size,
    totalSupplierCount: supplierSet.size,
    totalBrokerCount: brokerSet.size,
    totalAgencyCount: agencySet.size,
    totalAreaCount: areaSet.size,
    totalGradeCount: gradeSet.size,

    totalPurchaseValue,
    totalPremium,
    premiumMRCount: premiumMRSet.size,
    totalDeduction,
    totalClaim,
    totalSettlement,
    totalPayment,
    grossProfit,
    netProfit: grossProfit - (totalDeduction * 0.1),
    totalLoss,
    nonProfitableBusiness,
    profitMarginPct,
    weightedPurchaseRate,
    weightedBaseRate,

    saudaPendingCount,
    temporaryArrivalPendingCount,
    finalArrivalPendingCount,
    millInspectionPendingCount,
    paymentPendingCount,
    settlementPendingCount,
    pendingDeliveryMT,
    arrivedMT,

    abnormalCount,
    highDeductionCount,
    highPremiumCount,
    highMoistureCount,
    gradeDownCount,
    highClaimCount,
    lossMakingCount,
    delayedCount,
    profitableCount,
    breakEvenCount
  };
}

// Group transactions by any dimension for Business Analysis & Rankings
export function groupTransactionsByDimension(
  txns: ReportTransactionLine[],
  dimension: 'broker' | 'agency' | 'area' | 'grade' | 'supplier' | 'month' | 'saudaNo' | 'poNo'
) {
  if (dimension === 'agency') {
    txns = txns.map(t => {
      if (isInvalidAgency(t.agency)) {
        return { ...t, agency: 'Direct Purchase / Head Office' };
      }
      return t;
    });
  }

  if (dimension === 'area') {
    txns = txns.map(t => {
      if (!t.area || t.area === '-' || t.area === 'UNASSIGNED') {
        return { ...t, area: 'Unassigned Area' };
      }
      return t;
    });
  }

  const map = new Map<string, {
    key: string;
    quantityMT: number;
    arrivedMT: number;
    pendingMT: number;
    purchaseValue: number;
    baseRateValue: number;
    premiumAmount: number;
    deductionAmount: number;
    effectiveCost: number;
    realizationValue: number;
    grossProfit: number;
    paidAmount: number;
    settledAmount: number;
    txnCount: number;
    flaggedCount: number;
    delayedCount: number;
    settledCount: number;
    completedArrivalCount: number;
    sumQtyRate: number;
    sumQtyBase: number;
    sumQtyMoist: number;
  }>();

  txns.forEach(t => {
    const rawVal = t[dimension] || 'UNASSIGNED';
    const key = String(rawVal);
    if (!map.has(key)) {
      map.set(key, {
        key,
        quantityMT: 0,
        arrivedMT: 0,
        pendingMT: 0,
        purchaseValue: 0,
        baseRateValue: 0,
        premiumAmount: 0,
        deductionAmount: 0,
        effectiveCost: 0,
        realizationValue: 0,
        grossProfit: 0,
        paidAmount: 0,
        settledAmount: 0,
        txnCount: 0,
        flaggedCount: 0,
        delayedCount: 0,
        settledCount: 0,
        completedArrivalCount: 0,
        sumQtyRate: 0,
        sumQtyBase: 0,
        sumQtyMoist: 0
      });
    }

    const cur = map.get(key)!;
    cur.quantityMT += t.quantityMT;
    cur.arrivedMT += t.arrivedWeightMT;
    cur.pendingMT += t.pendingWeightMT;
    cur.purchaseValue += t.grossPurchaseValue;
    cur.baseRateValue += t.baseRateValue;
    cur.premiumAmount += t.premiumAmount;
    cur.deductionAmount += t.deductionAmount;
    cur.effectiveCost += t.effectiveCost;
    cur.realizationValue += t.realizationValue;
    cur.grossProfit += t.grossProfit;
    cur.paidAmount += t.paidAmount;
    cur.settledAmount += (t.settledAmount || 0);
    cur.txnCount += 1;
    if (t.isAbnormal || t.hasMismatch) cur.flaggedCount += 1;
    if (t.isDelayed) cur.delayedCount += 1;
    if (t.settlementStatus === 'SETTLED') cur.settledCount += 1;
    if (t.arrivalStatus === 'COMPLETED') cur.completedArrivalCount += 1;
    cur.sumQtyRate += t.quantityMT * t.purchaseRate;
    cur.sumQtyBase += t.quantityMT * t.baseRate;
    cur.sumQtyMoist += t.quantityMT * t.moisturePct;
  });

  const totalAllValue = txns.reduce((acc, t) => acc + t.grossPurchaseValue, 0);

  return Array.from(map.values()).map(g => {
    const avgPurchaseRate = g.quantityMT > 0 ? g.sumQtyRate / g.quantityMT : 0;
    const avgBaseRate = g.quantityMT > 0 ? g.sumQtyBase / g.quantityMT : 0;
    const avgMoisture = g.quantityMT > 0 ? g.sumQtyMoist / g.quantityMT : 0;
    const profitPct = g.effectiveCost > 0 ? (g.grossProfit / g.effectiveCost) * 100 : 0;
    const premiumPct = g.baseRateValue > 0 ? (g.premiumAmount / g.baseRateValue) * 100 : 0;
    const deductionPct = g.purchaseValue > 0 ? (g.deductionAmount / g.purchaseValue) * 100 : 0;
    const businessSharePct = totalAllValue > 0 ? (g.purchaseValue / totalAllValue) * 100 : 0;
    const deliveryPct = g.quantityMT > 0 ? Math.min(100, (g.arrivedMT / g.quantityMT) * 100) : 0;
    const flaggedRatePct = g.txnCount > 0 ? (g.flaggedCount / g.txnCount) * 100 : 0;
    const onTimePct = g.txnCount > 0 ? ((g.txnCount - g.delayedCount) / g.txnCount) * 100 : 100;
    const settlementPct = g.txnCount > 0 ? (g.settledCount / g.txnCount) * 100 : 0;

    let status: 'PROFITABLE' | 'BREAK-EVEN' | 'NON-PROFITABLE' | 'LOSS' = 'PROFITABLE';
    if (g.grossProfit < -1000) status = 'LOSS';
    else if (Math.abs(g.grossProfit) <= 1000) status = 'BREAK-EVEN';
    else if (profitPct < 1.0) status = 'NON-PROFITABLE';

    return {
      ...g,
      avgPurchaseRate,
      avgBaseRate,
      avgMoisture,
      profitPct,
      premiumPct,
      deductionPct,
      businessSharePct,
      deliveryPct,
      flaggedRatePct,
      onTimePct,
      settlementPct,
      status
    };
  }).sort((a, b) => {
    if (dimension === 'month') {
      return a.key.localeCompare(b.key);
    }
    return b.purchaseValue - a.purchaseValue;
  });
}
