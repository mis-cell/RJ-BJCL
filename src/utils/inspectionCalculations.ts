import {
  InspectionDetailRow,
  InspectionMasterRecord,
  DeductionRow,
  MatchedAutoDeduction
} from "../types/inspection.types";

// Empty fallback - deduction types are loaded strictly from the database table (deduction_master)
export const DEFAULT_DEDUCTION_TYPES: any[] = [];

// Calculate Reduced Weight and Final Receipt Wt. (Claim)
export const computeDetailRowWeights = (
  row: Partial<InspectionDetailRow>
): { reduced_weight: number; final_receipt_wt: number } => {
  const gross = Number(row.receipt_gross_wt) > 0 
    ? Number(row.receipt_gross_wt) 
    : (Number(row.challan_gross_wt) || 0);
  const addW = Number(row.add_weight) || 0;
  const lessW = Number(row.less_weight) || 0;
  
  let redWt = row.reduced_weight !== undefined && row.reduced_weight !== null && Number(row.reduced_weight) > 0
    ? Number(row.reduced_weight)
    : (gross > 0 ? Math.round((gross + addW - lessW) * 1000) / 1000 : 0);

  if (gross > 0 && (redWt === 0 || (addW > 0 || lessW > 0))) {
    redWt = Math.round((gross + addW - lessW) * 1000) / 1000;
  }
  
  const mClaim = Number(row.moisture_claim) || 0;
  const dClaim = Number(row.dust_claim) || 0;
  
  const baseWt = redWt > 0 ? redWt : gross;
  const moistDeduct = (baseWt * mClaim) / 100;
  const dustDeduct = (baseWt * dClaim) / 100;
  
  const finalWt = Math.max(0, baseWt - moistDeduct - dustDeduct);
  return {
    reduced_weight: Math.round(redWt * 1000) / 1000,
    final_receipt_wt: Math.round(finalWt * 1000) / 1000
  };
};

// Calculate Quantity in Metric Tons (MT)
export const calculateQtyInMt = (row: InspectionDetailRow): number => {
  if (row.final_receipt_wt && Number(row.final_receipt_wt) > 0) {
    return Math.round(Number(row.final_receipt_wt) * 1000) / 1000;
  }
  if (row.reduced_weight && Number(row.reduced_weight) > 0) {
    return Math.round(Number(row.reduced_weight) * 1000) / 1000;
  }
  if (row.receipt_gross_wt && Number(row.receipt_gross_wt) > 0) {
    return Math.round(Number(row.receipt_gross_wt) * 1000) / 1000;
  }
  if (row.challan_gross_wt && Number(row.challan_gross_wt) > 0) {
    return Math.round(Number(row.challan_gross_wt) * 1000) / 1000;
  }
  const qty = Number(row.quantity) || 0;
  const unit = (row.unit || "BALES").toUpperCase();
  if (unit.includes("BALE") || unit.includes("BALES")) {
    return Math.round((qty * 0.18) * 1000) / 1000; // 1 Standard Jute Bale = ~180 kg = 0.180 MT
  }
  if (unit.includes("KG")) {
    return Math.round((qty * 0.001) * 1000) / 1000;
  }
  if (unit.includes("QTL") || unit.includes("QUINTAL")) {
    return Math.round((qty * 0.10) * 1000) / 1000;
  }
  if (unit.includes("DRUM")) {
    return Math.round((qty * 0.20) * 1000) / 1000;
  }
  if (unit.includes("BAG")) {
    return Math.round((qty * 0.05) * 1000) / 1000;
  }
  return Math.round(qty * 1000) / 1000;
};

// Calculate Row Amount in ₹
export const calculateRowAmount = (row: InspectionDetailRow): number => {
  if (row.amount !== undefined && row.amount !== null && Number(row.amount) > 0) {
    return Number(Number(row.amount).toFixed(2));
  }
  const rate = Number(row.rate) || Number(row.rate_qntl) || 0;
  const wtMt = calculateQtyInMt(row);
  if (rate > 0 && wtMt > 0) {
    const ratePerMt = rate < 1000 ? rate * 1000 : rate * 10;
    return Number((wtMt * ratePerMt).toFixed(2));
  }
  return 0;
};

// Calculate Premium Quantity in Metric Tons (MT)
export const getPremiumMt = (row: InspectionDetailRow): number => {
  const available = calculateQtyInMt(row);
  if (!row.premium && !row.is_premium) return 0;
  const pStr = String(row.premium || "").trim();
  if (pStr.toLowerCase() === "yes" || pStr === "true") {
    return available;
  }
  const num = parseFloat(pStr);
  if (!isNaN(num) && num > 0) {
    return Math.min(num, available);
  }
  if (row.is_premium) {
    return available;
  }
  return 0;
};

// Extract Month (1 to 12) from date string or Date object
export const extractMonthFromDate = (dateStr?: string | null): number => {
  if (!dateStr) return new Date().getMonth() + 1;
  const trimmed = String(dateStr).trim();
  if (!trimmed) return new Date().getMonth() + 1;

  const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    return parseInt(isoMatch[2], 10) || 1;
  }

  const ddmmyyyyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (ddmmyyyyMatch) {
    return parseInt(ddmmyyyyMatch[2], 10) || 1;
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.getMonth() + 1;
  }

  return 8; // fallback to dry season default
};

// Robust Date Sanitizer for PostgreSQL DATE columns
export const sanitizeDate = (val: any): string | null => {
  if (!val) return null;
  if (typeof val !== 'string') {
    if (val instanceof Date && !isNaN(val.getTime())) {
      return val.toISOString().split('T')[0];
    }
    return null;
  }
  const trimmed = val.trim();
  if (!trimmed || trimmed === '' || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined' || trimmed === 'nan-nan-nan') return null;
  const ddmmyyyy = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (ddmmyyyy) {
    const d = ddmmyyyy[1].padStart(2, '0');
    const m = ddmmyyyy[2].padStart(2, '0');
    const y = ddmmyyyy[3];
    return `${y}-${m}-${d}`;
  }
  const yyyymmdd = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (yyyymmdd) {
    const y = yyyymmdd[1];
    const m = yyyymmdd[2].padStart(2, '0');
    const d = yyyymmdd[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString().split('T')[0];
};

// Calculate Claim Moisture % based on moisture_logic rules from database
export const calculateClaimMoisture = (
  actualM: number,
  dateStr?: string | null,
  areaStr?: string | null,
  rules: any[] = []
): number => {
  const actual = Number(actualM) || 0;
  if (actual <= 0) return 0;

  const month = extractMonthFromDate(dateStr);
  const isWetSeason = month >= 1 && month <= 6; // Jan to Jun
  const seasonKeyword = isWetSeason ? "JANUARY TO JUNE" : "JULY TO DECEMBER";

  const cleanArea = String(areaStr || "").trim().toUpperCase();
  const isDaisee = cleanArea.includes("DAISEE");

  let threshold = isDaisee ? (isWetSeason ? 18 : 20) : (isWetSeason ? 16 : 18);

  if (rules && rules.length > 0) {
    const exactMatch = rules.find((r: any) => {
      const rSeason = String(r.season || "").toUpperCase();
      const rArea = String(r.operating_area || "").toUpperCase();
      const seasonMatch =
        !rSeason ||
        rSeason.includes(seasonKeyword) ||
        (isWetSeason && rSeason.includes("WET")) ||
        (!isWetSeason && rSeason.includes("DRY"));
      const areaMatch = cleanArea && (rArea === cleanArea || rArea.includes(cleanArea) || cleanArea.includes(rArea));
      return seasonMatch && areaMatch;
    });

    const categoryMatch = rules.find((r: any) => {
      const rSeason = String(r.season || "").toUpperCase();
      const rArea = String(r.operating_area || "").toUpperCase();
      const seasonMatch =
        !rSeason ||
        rSeason.includes(seasonKeyword) ||
        (isWetSeason && rSeason.includes("WET")) ||
        (!isWetSeason && rSeason.includes("DRY"));
      const areaMatch = isDaisee
        ? rArea.includes("DAISEE") && !rArea.includes("NON-DAISEE")
        : (rArea.includes("NON-DAISEE") || rArea.includes("STANDARD") || (!rArea.includes("DAISEE") && cleanArea && (rArea.includes(cleanArea) || cleanArea.includes(rArea))));
      return seasonMatch && areaMatch;
    });

    const matchedRule = exactMatch || categoryMatch;
    if (matchedRule && matchedRule.threshold_limit) {
      const matchVal = String(matchedRule.threshold_limit).match(/(\d+(\.\d+)?)/);
      if (matchVal) {
        threshold = parseFloat(matchVal[1]);
      }
    }
  }

  const excess = actual - threshold;
  if (excess <= 0) return 0;
  return Math.ceil(excess);
};

export const isAutoBlocked = (row: InspectionDetailRow, field: keyof InspectionDetailRow): boolean => {
  if (row.is_auto === false) return false;
  if (field === "lorry_read_avg" || field === "insp_read_avg") return true;
  if (row.auto_fields && Array.isArray(row.auto_fields) && row.auto_fields.includes(field as string)) {
    return true;
  }
  if (row.is_auto) {
    const val = row[field];
    if (val === undefined || val === null || val === "" || (typeof val === "string" && val.trim() === "")) {
      return false;
    }
    const defaultAutoFields: (keyof InspectionDetailRow)[] = [
      "arrival_grade",
      "stock_grade_code",
      "stock_grade_name",
      "area",
      "agency",
      "agency_code",
      "marks",
      "crop_year",
      "quantity",
      "unit",
      "challan_gross_wt",
      "receipt_gross_wt",
      "rate",
      "rate_qntl"
    ];
    if (defaultAutoFields.includes(field)) {
      return true;
    }
  }
  return false;
};

export const getFieldInputStyle = (isBlocked: boolean, customClasses = ""): string => {
  if (isBlocked) {
    return `w-full border border-blue-300/90 bg-blue-50/90 text-blue-950 font-bold rounded px-2 py-1 text-xs cursor-not-allowed select-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] transition-all ${customClasses}`;
  }
  return `w-full border border-slate-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 bg-white text-slate-900 transition-all ${customClasses}`;
};

export function calculateBaleWeightDeduction(
  detailRows: InspectionDetailRow[],
  deductionMasterList: any[]
): {
  totalBales: number;
  totalReceiptGrossWtMt: number;
  totalWeightKg: number;
  avgKgPerBale: number;
  matchedRule: any | null;
  ruleName: string;
  rate: number;
} {
  const baleRows = (detailRows || []).filter(r => {
    const u = (r.unit || "").trim().toUpperCase();
    return !u || u.includes("BALE") || u === "BALES" || u === "B";
  });

  const totalBales = baleRows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
  const totalReceiptGrossWtMt = baleRows.reduce((sum, r) => {
    const wt = Number(r.receipt_gross_wt) > 0 
      ? Number(r.receipt_gross_wt) 
      : (Number(r.gross_weight_batch) > 0 ? Number(r.gross_weight_batch) : Number(r.challan_gross_wt) || 0);
    return sum + wt;
  }, 0);

  const totalWeightKg = totalReceiptGrossWtMt * 1000;
  const avgKgPerBale = totalBales > 0 ? (totalWeightKg / totalBales) : 0;

  if (totalBales <= 0 || totalReceiptGrossWtMt <= 0 || avgKgPerBale <= 0) {
    return { totalBales, totalReceiptGrossWtMt, totalWeightKg, avgKgPerBale, matchedRule: null, ruleName: "", rate: 0 };
  }

  const masterList = Array.isArray(deductionMasterList) ? deductionMasterList : [];
  const candidates: { rule: any; threshold: number; rate: number }[] = [];

  for (const d of masterList) {
    const name = String(d.deduction || "").trim();
    if (!name) continue;

    const isBaleRelated = /BALE/i.test(name) || !/DRUM|HALF|LOOSE/i.test(name);
    const match = name.match(/LESS\s+THAN\s+(\d+(?:\.\d+)?)/i) || name.match(/<\s*(\d+(?:\.\d+)?)/i);
    if (isBaleRelated && match) {
      const threshold = parseFloat(match[1]);
      const rate = d.rate_per_unit != null ? Number(d.rate_per_unit) : (d.rate_per_qntl != null ? Number(d.rate_per_qntl) : 0);
      if (!isNaN(threshold) && threshold > 0 && rate > 0) {
        if (avgKgPerBale < threshold) {
          candidates.push({ rule: d, threshold, rate });
        }
      }
    }
  }

  candidates.sort((a, b) => a.threshold - b.threshold);

  if (candidates.length > 0) {
    const best = candidates[0];
    return {
      totalBales,
      totalReceiptGrossWtMt,
      totalWeightKg,
      avgKgPerBale,
      matchedRule: best.rule,
      ruleName: best.rule.deduction,
      rate: best.rate
    };
  }

  return { totalBales, totalReceiptGrossWtMt, totalWeightKg, avgKgPerBale, matchedRule: null, ruleName: "", rate: 0 };
}

export function calculateAllMatchingDeductions(
  detailRows: InspectionDetailRow[],
  headerForm: Partial<InspectionMasterRecord>,
  deductionMasterList: any[]
): {
  matchedDeductions: MatchedAutoDeduction[];
  baleAudit: {
    totalBales: number;
    totalReceiptGrossWtMt: number;
    totalWeightKg: number;
    avgKgPerBale: number;
  };
} {
  const masterList = Array.isArray(deductionMasterList) ? deductionMasterList : [];
  const matchedDeductions: MatchedAutoDeduction[] = [];

  // 1. Bale Weight Evaluation
  const baleAudit = calculateBaleWeightDeduction(detailRows, deductionMasterList);
  if (baleAudit.matchedRule && baleAudit.rate > 0) {
    const totalQntl = Number((baleAudit.totalReceiptGrossWtMt * 10).toFixed(2));
    const qty = totalQntl > 0 ? totalQntl : (baleAudit.totalBales > 0 ? baleAudit.totalBales : 1);
    const amount = Number((baleAudit.rate * qty).toFixed(2));
    matchedDeductions.push({
      category: "bale_weight",
      ruleName: baleAudit.ruleName,
      matchedRule: baleAudit.matchedRule,
      rate: baleAudit.rate,
      qty,
      amount,
      reason: `Avg Weight ${baleAudit.avgKgPerBale.toFixed(2)} KG/Bale under standard threshold`,
      badge: `⚖️ Bale Weight Policy: ${baleAudit.totalBales} Bales (${baleAudit.avgKgPerBale.toFixed(2)} KG/Bale) | ₹${baleAudit.rate.toFixed(2)} × ${qty.toFixed(2)} Qtl = -₹${amount.toFixed(2)}`
    });
  }

  // 2. CT FOR HABIJABI / CHATTA / ROPE Evaluation
  const totalRopesKg = (detailRows || []).reduce((sum, r) => sum + (Number(r.ropes_weight) || 0) + (Number(r.chotta_weight) || 0), 0);
  const hbRows = (detailRows || []).filter(r => {
    const grade = `${r.arrival_grade || ""} ${r.stock_grade_name || ""} ${r.stock_grade_code || ""}`.toUpperCase();
    return grade.includes("HABIJABI") || grade.includes("HBJB") || grade.includes("CHATTA") || grade.includes("ROPES");
  });
  const hbRowsKg = hbRows.reduce((sum, r) => sum + ((Number(r.receipt_gross_wt) || Number(r.challan_gross_wt) || 0) * 1000), 0);
  const aggregateRopesKg = totalRopesKg > 0 ? totalRopesKg : (hbRowsKg > 0 ? hbRowsKg : 0);

  if (aggregateRopesKg > 0) {
    const ropesRule = masterList.find(d => {
      const n = String(d.deduction || "").toUpperCase();
      return n.includes("HABIJABI") || n.includes("CHATTA") || n.includes("ROPE") || n.includes("HBJB");
    });
    if (ropesRule) {
      const rate = ropesRule.rate_per_qntl != null ? Number(ropesRule.rate_per_qntl) : (Number(ropesRule.rate_per_unit) || 1500);
      const qtyQntl = Number((aggregateRopesKg / 100).toFixed(2));
      const amount = Number((rate * qtyQntl).toFixed(2));
      matchedDeductions.push({
        category: "ropes_chatta",
        ruleName: ropesRule.deduction || "CT FOR HABIJABI / CHATTA / ROPE",
        matchedRule: ropesRule,
        rate,
        qty: qtyQntl,
        amount,
        reason: `${aggregateRopesKg.toFixed(2)} KG Habijabi/Chatta/Rope material detected (${qtyQntl} Qntl)`,
        badge: `🧶 Habijabi/Chatta/Rope Claim: ${aggregateRopesKg.toFixed(2)} KG`
      });
    }
  }

  // 3. Delivery Claim
  const delivClaimDays = Number(headerForm.delivery_claim || 0);
  if (delivClaimDays > 0) {
    const delivRule = masterList.find(d => String(d.deduction || "").toUpperCase().includes("DELIVERY CLAIM"));
    const ratePerDay = delivRule ? (Number(delivRule.rate_per_unit) || Number(delivRule.rate_per_qntl) || 5) : 5;
    const totalReceiptGrossMt = (detailRows || []).reduce((sum, r) => sum + (Number(r.receipt_gross_wt) || Number(r.challan_gross_wt) || 0), 0);
    const totalQntl = Number((totalReceiptGrossMt * 10).toFixed(2));
    const effectiveQty = totalQntl > 0 ? totalQntl : delivClaimDays;
    const amount = Number((ratePerDay * effectiveQty * delivClaimDays).toFixed(2));
    matchedDeductions.push({
      category: "delivery_claim",
      ruleName: delivRule?.deduction || "DELIVERY CLAIM PER QUINTAL (RS. PER DAY)",
      matchedRule: delivRule || null,
      rate: ratePerDay,
      qty: effectiveQty,
      amount,
      reason: `${delivClaimDays} Day(s) Delivery Claim for ${effectiveQty} Qntl`,
      badge: `🚚 Delivery Claim: ${delivClaimDays} Days`
    });
  }

  return {
    matchedDeductions,
    baleAudit
  };
}
