import { ReportTransactionLine, SystemReportDataset } from '../../types/systemReport.types';
import { isInvalidAgency } from './systemReportSanitizers';

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
    totalSettlement += t.claimSettled;
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

    if (t.pendingWeightMT > 0) saudaPendingCount++;
    if (t.arrivalStatus === 'PENDING') temporaryArrivalPendingCount++;
    if (t.arrivalStatus === 'IN_TRANSIT') finalArrivalPendingCount++;
    if (t.inspectionStatus === 'PENDING') millInspectionPendingCount++;
    if (t.paymentStatus !== 'PAID') paymentPendingCount++;
    if (t.settlementStatus !== 'SETTLED') settlementPendingCount++;

    if (t.isAbnormal) abnormalCount++;
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
    netProfit: grossProfit - (totalDeduction * 0.1), // Net after standard handling/overhead
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

// Group transactions by any dimension for Priority 2 Analysis
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
    purchaseValue: number;
    baseRateValue: number;
    premiumAmount: number;
    deductionAmount: number;
    effectiveCost: number;
    realizationValue: number;
    grossProfit: number;
    txnCount: number;
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
        purchaseValue: 0,
        baseRateValue: 0,
        premiumAmount: 0,
        deductionAmount: 0,
        effectiveCost: 0,
        realizationValue: 0,
        grossProfit: 0,
        txnCount: 0,
        sumQtyRate: 0,
        sumQtyBase: 0,
        sumQtyMoist: 0
      });
    }

    const cur = map.get(key)!;
    cur.quantityMT += t.quantityMT;
    cur.purchaseValue += t.grossPurchaseValue;
    cur.baseRateValue += t.baseRateValue;
    cur.premiumAmount += t.premiumAmount;
    cur.deductionAmount += t.deductionAmount;
    cur.effectiveCost += t.effectiveCost;
    cur.realizationValue += t.realizationValue;
    cur.grossProfit += t.grossProfit;
    cur.txnCount += 1;
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
      status
    };
  }).sort((a, b) => b.purchaseValue - a.purchaseValue);
}
