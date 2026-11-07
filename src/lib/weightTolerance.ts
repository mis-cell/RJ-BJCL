/**
 * Sauda Weight Acceptance Policy & Tolerance Calculation
 * 
 * Business Rules:
 * 1. BALE-SPECIFIC TOLERANCE (Unit / Lorry = 'BALES' - case-insensitive):
 *    - 5% of Sauda Quantity (in MT) OR 1500 KG (1.500 MT), whichever tolerance is LOWER.
 *      Allowed Tolerance = MIN(5% of Sauda Quantity, 1.500 MT)
 *    - Minimum Acceptable Weight = Sauda Quantity - Allowed Tolerance
 *    - Maximum Acceptable Weight = Sauda Quantity + Allowed Tolerance
 *    - Within range [Minimum Acceptable, Maximum Acceptable] => Status = 'completed' (COMPLETED)
 *    - Outside range => Status = 'mismatch' (WEIGHT MISMATCH / NOT ACCEPTABLE) or 'partial' (PARTIAL)
 * 
 * 2. NON-BALE UNITS (Unit / Lorry ≠ 'BALES', e.g. KG, MT, TON, LORRY, DRUMS):
 *    - Do NOT apply the 5% / 1500 KG rule.
 *    - Follow existing standard validation logic (completed when received weight meets contract weight).
 */

export interface WeightToleranceResult {
  contractMt: number;
  receivedMt: number;
  contractQtl: number;
  receivedQtl: number;
  diffMt: number;
  diffQtl: number;
  differenceMt: number;
  differenceQtl: number;
  absDiffMt: number;
  absDiffQtl: number;
  unit: string;
  isBales: boolean;
  pct5Mt: number;
  pct5Qtl: number;
  pct3Mt?: number;
  pct3Qtl?: number;
  fixedToleranceMt: number;
  fixedToleranceQtl: number;
  toleranceMt: number;
  toleranceQtl: number;
  tolerableLimitMt: number;
  tolerableLimitQtl: number;
  tolerancePct: number;
  toleranceBasis: string;
  minAcceptableMt: number;
  maxAcceptableMt: number;
  minAcceptableQtl: number;
  maxAcceptableQtl: number;
  excessOverToleranceMt: number;
  excessOverToleranceQtl: number;
  excessMt: number;
  excessQtl: number;
  excessOverContractMt: number;
  excessOverContractQtl: number;
  shortUnderToleranceMt: number;
  shortUnderToleranceQtl: number;
  shortMt: number;
  shortQtl: number;
  deductibleQtyMt: number;
  deductibleQtyQtl: number;
  policyStatus: 'Within Tolerance – No Deduction' | 'Excess Deduction' | 'Short Deduction' | 'Pending Arrival';
  isWithinTolerance: boolean;
  isAcceptable: boolean;
  isCompleted: boolean;
  isUnderDelivery: boolean;
  isOverDelivery: boolean;
  status: 'completed' | 'partial' | 'pending' | 'mismatch';
  statusLabel: 'COMPLETED' | 'PARTIAL' | 'PENDING' | 'WEIGHT MISMATCH';
  formattedTolerance: string; // e.g. "±1.500 MT (15.00 Qtl)"
  formattedRange: string;     // e.g. "63.502 – 66.502 MT (635.02 – 665.02 Qtl)"
  excessShortLabel: string;   // e.g. "Tolerable (±1.500 MT)" or "+1.200 MT Excess" or "-0.800 MT Short"
}

export function isBaleUnit(unit: string | null | undefined): boolean {
  if (!unit) return false;
  const u = String(unit).trim().toUpperCase();
  return u === 'BALES' || u === 'BALE';
}

export function calculateWeightTolerance(
  contractWeight: number | string | null | undefined,
  receivedWeight: number | string | null | undefined,
  unit?: string | null | undefined,
  customPolicy?: {
    tolerance_pct?: number;
    max_weight_limit_mt?: number;
    max_weight_limit_kg?: number;
    is_active?: boolean;
  }
): WeightToleranceResult {
  const contractMt = Math.max(0, parseFloat(String(contractWeight ?? 0)) || 0);
  const receivedMt = Math.max(0, parseFloat(String(receivedWeight ?? 0)) || 0);
  const unitStr = String(unit || 'BALES').trim().toUpperCase();
  const isBales = isBaleUnit(unitStr);

  const contractQtl = contractMt * 10;
  const receivedQtl = receivedMt * 10;
  const diffMt = receivedMt - contractMt;
  const diffQtl = receivedQtl - contractQtl;
  const absDiffMt = Math.abs(diffMt);
  const absDiffQtl = Math.abs(diffQtl);

  // Dynamic policy parameters (default: 3% of Sauda Total Contract Quantity)
  const isPolicyActive = customPolicy?.is_active !== undefined ? customPolicy.is_active : true;
  const activePct = isPolicyActive 
    ? (customPolicy?.tolerance_pct !== undefined ? Number(customPolicy.tolerance_pct) : 3.0) 
    : 0;
  const hasFixedMax = customPolicy?.max_weight_limit_mt !== undefined && customPolicy?.max_weight_limit_mt !== null;
  const activeMaxMt = hasFixedMax
    ? Number(customPolicy?.max_weight_limit_mt)
    : (customPolicy?.max_weight_limit_kg !== undefined && customPolicy?.max_weight_limit_kg !== null
        ? Number(customPolicy?.max_weight_limit_kg) / 1000
        : Infinity);

  // 3% Execution Exemption calculation on Sauda contract quantity in MT & Qtl
  const pctRatio = activePct / 100;
  const pct3Mt = contractMt * pctRatio;
  const pct3Qtl = contractQtl * pctRatio;
  const fixedToleranceMt = activeMaxMt !== Infinity ? activeMaxMt : pct3Mt;
  const fixedToleranceQtl = fixedToleranceMt * 10;

  // Allowed Tolerance / Exemption:
  // - Applies ONLY to shortages, and ONLY when the shortage is under 1.5 MT (1,500 kg).
  // - For excess calculations, the 3% tolerance policy must NOT be applied.
  const shortageMtRaw = contractMt > receivedMt ? (contractMt - receivedMt) : 0;
  const isShortageUnder1_5Mt = shortageMtRaw > 0.0001 && shortageMtRaw < 1.5;
  const isExcess = receivedMt > (contractMt + 0.0001);

  const rawShortToleranceMt = isPolicyActive && contractMt > 0
    ? (activeMaxMt !== Infinity ? Math.min(pct3Mt, activeMaxMt) : pct3Mt)
    : 0;

  const toleranceMt = isExcess
    ? 0
    : (shortageMtRaw >= 1.5 ? 0 : rawShortToleranceMt);
  const toleranceQtl = toleranceMt * 10;
  const tolerancePct = contractMt > 0 ? (toleranceMt / contractMt) * 100 : 0;
  const toleranceBasis = isExcess
    ? 'No Tolerance on Excess'
    : (shortageMtRaw >= 1.5 ? 'Shortage ≥ 1.5 MT (Full Chargeable)' : (isPolicyActive && contractMt > 0 ? `${activePct}% Sauda Exemption` : 'Standard'));

  const minAcceptableMt = Math.max(0, contractMt - (shortageMtRaw >= 1.5 ? 0 : rawShortToleranceMt));
  const maxAcceptableMt = contractMt;
  const minAcceptableQtl = minAcceptableMt * 10;
  const maxAcceptableQtl = maxAcceptableMt * 10;

  const isWithinTolerance = contractMt > 0 && receivedMt > 0 && !isExcess && (
    Math.abs(receivedMt - contractMt) <= 0.0001 ||
    (isShortageUnder1_5Mt && shortageMtRaw <= (rawShortToleranceMt + 0.0001))
  );
  const isOverDelivery = contractMt > 0 && isExcess;
  const isUnderDelivery = contractMt > 0 && receivedMt > 0 && !isWithinTolerance && receivedMt < (contractMt - 0.0001);

  const excessOverContractMt = isOverDelivery ? Math.max(0, Math.round((receivedMt - contractMt) * 1000) / 1000) : 0;
  const excessOverContractQtl = Math.round(excessOverContractMt * 10 * 100) / 100;
  // Since 3% tolerance is not applied to excess, excessOverTolerance equals excessOverContract
  const excessOverToleranceMt = excessOverContractMt;
  const excessOverToleranceQtl = excessOverContractQtl;

  const shortUnderToleranceMt = isUnderDelivery
    ? (shortageMtRaw >= 1.5
        ? Math.max(0, Math.round(shortageMtRaw * 1000) / 1000)
        : Math.max(0, Math.round((shortageMtRaw - rawShortToleranceMt) * 1000) / 1000))
    : 0;
  const shortUnderToleranceQtl = Math.round(shortUnderToleranceMt * 10 * 100) / 100;

  // Deductible Quantity:
  // - Excess: full excess over contract (no 3% tolerance)
  // - Shortage < 1.5 MT: shortage exceeding 3% tolerance
  // - Shortage >= 1.5 MT: full shortage
  const deductibleQtyMt = isWithinTolerance
    ? 0
    : (isOverDelivery ? excessOverContractMt : shortUnderToleranceMt);
  const deductibleQtyQtl = Math.round(deductibleQtyMt * 10 * 100) / 100;

  let policyStatus: 'Within Tolerance – No Deduction' | 'Excess Deduction' | 'Short Deduction' | 'Pending Arrival' = 'Pending Arrival';
  if (contractMt === 0 || receivedMt === 0) {
    policyStatus = 'Pending Arrival';
  } else if (isWithinTolerance) {
    policyStatus = 'Within Tolerance – No Deduction';
  } else if (isOverDelivery) {
    policyStatus = 'Excess Deduction';
  } else if (isUnderDelivery) {
    policyStatus = 'Short Deduction';
  }

  let status: 'completed' | 'partial' | 'pending' | 'mismatch' = 'pending';
  let statusLabel: 'COMPLETED' | 'PARTIAL' | 'PENDING' | 'WEIGHT MISMATCH' = 'PENDING';

  if (contractMt > 0) {
    if (isWithinTolerance) {
      status = 'completed';
      statusLabel = 'COMPLETED';
    } else if (isOverDelivery) {
      status = 'mismatch';
      statusLabel = 'WEIGHT MISMATCH';
    } else if (receivedMt > 0) {
      status = 'partial';
      statusLabel = 'PARTIAL';
    } else {
      status = 'pending';
      statusLabel = 'PENDING';
    }
  }

  let excessShortLabel = 'Exact (0.00 MT)';
  if (receivedMt <= 0) {
    excessShortLabel = '-';
  } else if (isWithinTolerance) {
    excessShortLabel = shortageMtRaw > 0.0001
      ? `Tolerable (-${shortageMtRaw.toFixed(3)} MT ≤ 3%)`
      : 'Exact (0.00 MT)';
  } else if (isOverDelivery) {
    excessShortLabel = `+${excessOverContractMt.toFixed(3)} MT Excess`;
  } else if (isUnderDelivery) {
    excessShortLabel = `-${shortUnderToleranceMt.toFixed(3)} MT Short`;
  }

  return {
    contractMt,
    receivedMt,
    contractQtl,
    receivedQtl,
    diffMt,
    diffQtl,
    differenceMt: diffMt,
    differenceQtl: diffQtl,
    absDiffMt,
    absDiffQtl,
    unit: unitStr,
    isBales,
    pct5Mt: pct3Mt,
    pct5Qtl: pct3Qtl,
    pct3Mt,
    pct3Qtl,
    fixedToleranceMt,
    fixedToleranceQtl,
    toleranceMt,
    toleranceQtl,
    tolerableLimitMt: toleranceMt,
    tolerableLimitQtl: toleranceQtl,
    tolerancePct,
    toleranceBasis,
    minAcceptableMt,
    maxAcceptableMt,
    minAcceptableQtl,
    maxAcceptableQtl,
    excessOverToleranceMt,
    excessOverToleranceQtl,
    excessMt: excessOverContractMt,
    excessQtl: excessOverContractQtl,
    excessOverContractMt,
    excessOverContractQtl,
    shortUnderToleranceMt,
    shortUnderToleranceQtl,
    shortMt: shortUnderToleranceMt,
    shortQtl: shortUnderToleranceQtl,
    deductibleQtyMt,
    deductibleQtyQtl,
    policyStatus,
    isWithinTolerance,
    isAcceptable: isWithinTolerance,
    isCompleted: isWithinTolerance,
    isUnderDelivery,
    isOverDelivery,
    status,
    statusLabel,
    formattedTolerance: isOverDelivery
      ? '0.00 Qtl (No Excess Tolerance)'
      : `-${(rawShortToleranceQtl(rawShortToleranceMt)).toFixed(2)} Qtl (${rawShortToleranceMt.toFixed(3)} MT, < 1.5 MT Short Only)`,
    formattedRange: `${minAcceptableQtl.toFixed(2)} – ${maxAcceptableQtl.toFixed(2)} Qtl (${minAcceptableMt.toFixed(3)} – ${maxAcceptableMt.toFixed(3)} MT)`,
    excessShortLabel
  };
}

function rawShortToleranceQtl(mt: number): number {
  return mt * 10;
}

/**
 * Penalty calculation on Excess Quantity:
 * Based on Sauda Date (P.O Date) TD5 base rate and Last MR / Arrival Date TD5 base rate:
 * - If Arrival/Last MR Date Rate >= Sauda Date Rate: Do NOT deduct (₹0, Applicable for Sauda).
 * - If Sauda Date Rate > Arrival/Last MR Date Rate: Deduct (Sauda Date Rate − Arrival Date Rate) * Excess Quantity (in kg).
 */
export function calculateExcessPenalty(
  excessQtl: number,
  saudaTd5BaseRate: number,
  arrivalTd5BaseRate: number
): {
  saudaTd5BaseRate: number;
  arrivalTd5BaseRate: number;
  rateDifference: number;
  excessQtl: number;
  penaltyAmount: number;
  formula: string;
} {
  const sRate = Math.max(0, Number(saudaTd5BaseRate) || 0);
  const aRate = Math.max(0, Number(arrivalTd5BaseRate) || 0);
  const rateDifference = sRate > aRate ? (sRate - aRate) : 0;
  const eq = Math.max(0, Number(excessQtl) || 0);
  const excessKg = Math.round(eq * 100);
  const penaltyAmount = Math.round(rateDifference * excessKg * 100) / 100;
  return {
    saudaTd5BaseRate: sRate,
    arrivalTd5BaseRate: aRate,
    rateDifference,
    excessQtl: eq,
    penaltyAmount,
    formula: aRate >= sRate
      ? `Last MR Rate (₹${aRate.toLocaleString()}) ≥ Sauda Rate (₹${sRate.toLocaleString()}) → Applicable for Sauda (₹0 Deduction)`
      : `(Sauda Rate ₹${sRate.toLocaleString()} − Last MR Rate ₹${aRate.toLocaleString()}) = ₹${rateDifference.toLocaleString()} × ${excessKg.toLocaleString()} kg = ₹${penaltyAmount.toLocaleString()}`
  };
}
