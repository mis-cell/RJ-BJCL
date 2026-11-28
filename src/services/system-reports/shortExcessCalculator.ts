import { arePoNumbersExactMatch } from '../../lib/contractRelationshipEngine';

export interface ActiveMoistureRule {
  season: string;
  operating_area: string;
  threshold_limit: string;
  status?: string;
}

export const DEFAULT_ACTIVE_MOISTURE_RULES: ActiveMoistureRule[] = [
  {
    season: 'JULY TO DECEMBER (DRY SEASON)',
    operating_area: 'DAISEE Operating Areas',
    threshold_limit: 'Moisture threshold limit is 20%',
    status: 'Active'
  },
  {
    season: 'JANUARY TO JUNE (WET SEASON)',
    operating_area: 'DAISEE Operating Areas',
    threshold_limit: 'Moisture threshold limit is 18%',
    status: 'Active'
  },
  {
    season: 'JULY TO DECEMBER (DRY SEASON)',
    operating_area: 'Standard / Non-DAISEE',
    threshold_limit: 'Moisture threshold limit is 18%',
    status: 'Active'
  },
  {
    season: 'JANUARY TO JUNE (WET SEASON)',
    operating_area: 'Standard / Non-DAISEE',
    threshold_limit: 'Moisture threshold limit is 16%',
    status: 'Active'
  }
];

function extractPctFromLimit(limitStr: string, fallback: number): number {
  const m = String(limitStr || '').match(/(\d+(?:\.\d+)?)\s*%/);
  if (m && m[1]) {
    const n = parseFloat(m[1]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const n = parseFloat(String(limitStr || ''));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Resolves the active seasonal moisture tolerance limit (%) by inspection month & operating area.
 * Active Rules:
 * - July to December (Dry Season): DAISEE = 20%, Standard / Non-DAISEE = 18%
 * - January to June (Wet Season):  DAISEE = 18%, Standard / Non-DAISEE = 16%
 * Inactive rules (e.g. Nov-Dec overrides marked Inactive) are strictly ignored.
 */
export function getSeasonalMoistureLimit(
  dateStr?: string,
  areaName?: string,
  dbRules?: ActiveMoistureRule[]
): { limitPct: number; isDaisee: boolean; seasonLabel: string } {
  const cleanArea = String(areaName || '').trim().toUpperCase();
  const isDaisee = cleanArea.includes('DAISEE') && !cleanArea.includes('NON-DAISEE');

  // Parse month 1..12 from dateStr (YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, etc.)
  let monthNum = 0;
  const raw = String(dateStr || '').trim().split('T')[0];
  if (raw) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      monthNum = parseInt(raw.slice(5, 7), 10);
    } else if (/^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/.test(raw)) {
      const parts = raw.split(/[\/\-]/);
      monthNum = parseInt(parts[1], 10);
    } else {
      const d = new Date(raw);
      if (!Number.isNaN(d.getTime())) monthNum = d.getMonth() + 1;
    }
  }
  if (!monthNum || monthNum < 1 || monthNum > 12) {
    monthNum = new Date().getMonth() + 1;
  }

  const isDrySeason = monthNum >= 7 && monthNum <= 12; // July to December
  const seasonLabel = isDrySeason
    ? 'JULY TO DECEMBER (DRY SEASON)'
    : 'JANUARY TO JUNE (WET SEASON)';

  const defaultLimit = isDaisee
    ? (isDrySeason ? 20 : 18)
    : (isDrySeason ? 18 : 16);

  // Check active DB rules if provided (strictly ignoring Inactive rules)
  const activeRules = (dbRules || []).filter(
    r => String(r.status || 'Active').trim().toUpperCase() === 'ACTIVE'
  );
  if (activeRules.length > 0) {
    const matched = activeRules.find(r => {
      const rSeason = String(r.season || '').toUpperCase();
      const rArea = String(r.operating_area || '').toUpperCase();
      const seasonMatch = isDrySeason
        ? rSeason.includes('JULY') && rSeason.includes('DECEMBER')
        : rSeason.includes('JANUARY') && rSeason.includes('JUNE');
      const areaMatch = isDaisee
        ? rArea.includes('DAISEE') && !rArea.includes('NON-DAISEE')
        : rArea.includes('NON-DAISEE') || rArea.includes('STANDARD');
      return seasonMatch && areaMatch;
    });
    if (matched) {
      return {
        limitPct: extractPctFromLimit(matched.threshold_limit, defaultLimit),
        isDaisee,
        seasonLabel
      };
    }
  }

  return { limitPct: defaultLimit, isDaisee, seasonLabel };
}

export interface ComputedShortExcessRecord {
  poNo: string;
  saudaDate: string;
  supplier: string;
  broker: string;
  area: string;
  agency: string;
  unit: string;
  contractMt: number;
  totalReceivedMt: number;
  variationType: 'excess' | 'short' | 'within_tolerance';
  policyLabel: string;
  deductionQtyMt: number;
  deductionQtyQtl: number;
  saudaRate: number;
  lastMrRate: number;
  rateDiff: number;
  deductionAmount: number;
  isLocked: boolean;
}

function normalizeDateYmd(dStr: any): string {
  if (!dStr) return '';
  let clean = String(dStr).trim();
  if (clean.includes('T')) clean = clean.split('T')[0];
  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length === 3) {
      if (parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
  }
  if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 2 && parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
  }
  return clean;
}

function cleanPoKey(s: any): string {
  return String(s || '')
    .trim()
    .replace(/^#+/, '')
    .replace(/\(PTF\)/gi, '')
    .trim()
    .toUpperCase();
}

function extractMrSeq(mr: any): number {
  const m = String(mr || '').trim().match(/(\d+)$/);
  return m ? parseInt(m[1], 10) : 0;
}

function canonicalMrKey(mr: any): string {
  const seq = extractMrSeq(mr);
  return seq > 0 ? `MR_${seq}` : String(mr || '').trim().toUpperCase();
}

function toMtFromRawWt(val: any): number {
  const n = Number(val || 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n >= 500) return n / 1000;
  if (n > 50 && n < 500) return n / 10;
  return n;
}

/**
 * Exact Extra & Short Weight & Rate Settlement calculation from Sauda Check Point.
 * Mirrors Report 11 ("Short and Excess Deduction") so Report 1 KPI card and Report 11 match 100%.
 */
export function computeShortExcessFromTables(params: {
  saudaCheckPoints: any[];
  purchaseOrders?: any[];
  millInspections: any[];
  millInspectionDetails: any[];
  savedScpDeductions: any[];
  sattaBaseRates: any[];
}): ComputedShortExcessRecord[] {
  const {
    saudaCheckPoints = [],
    purchaseOrders = [],
    millInspections = [],
    millInspectionDetails = [],
    savedScpDeductions = [],
    sattaBaseRates = []
  } = params;

  const normalizedSattaBaseRates = sattaBaseRates
    .map((b: any) => ({
      ymd: normalizeDateYmd(b.start_date || b.effective_date || b.satta_date || b.date || b.base_date || b.start || ''),
      rate: Number(b.base_rate || b.td5_base_rate || b.rate || b.b_rate || b.baseRate || 0),
      ts: String(b.updated_at || b.created_at || b.id || '')
    }))
    .filter(item => item.rate > 0)
    .sort((a, b) => {
      const dCmp = b.ymd.localeCompare(a.ymd);
      if (dCmp !== 0) return dCmp;
      return b.ts.localeCompare(a.ts);
    });

  const getTd5RateForDate = (dateStr?: string): number => {
    if (normalizedSattaBaseRates.length === 0) return 0;
    const targetYmd = normalizeDateYmd(dateStr);
    if (targetYmd) {
      const exact = normalizedSattaBaseRates.find(b => b.ymd === targetYmd);
      if (exact) return exact.rate;
      const onOrBefore = normalizedSattaBaseRates.find(b => b.ymd && b.ymd <= targetYmd);
      if (onOrBefore) return onOrBefore.rate;
    }
    return normalizedSattaBaseRates[0]?.rate || 0;
  };

  // Index details by canonical MR key for O(1) lookup
  const detailsByMrKey = new Map<string, any[]>();
  millInspectionDetails.forEach((d: any) => {
    const dMr = String(d.mr_no || '').trim();
    if (!dMr) return;
    const mk = canonicalMrKey(dMr);
    if (!detailsByMrKey.has(mk)) detailsByMrKey.set(mk, []);
    detailsByMrKey.get(mk)!.push(d);
  });

  // Index sauda_check_point (and optional purchase_master fallback) by PO key
  const scpByPoKey = new Map<string, any>();
  [...purchaseOrders, ...saudaCheckPoints].forEach((cp: any) => {
    const st = String(cp?.status || '').trim().toUpperCase();
    if (st === 'CANCELLED' || st === 'VOID' || st === 'REJECTED' || st === 'DELETED') return;
    const k = cleanPoKey(cp.po_no || cp.contract_po_no || cp.po_number);
    if (!k) return;
    const existing = scpByPoKey.get(k) || {};
    scpByPoKey.set(k, { ...existing, ...cp });
  });

  // Saved deductions map
  const savedDedByPoKey = new Map<string, any>();
  savedScpDeductions.forEach((d: any) => {
    const k = cleanPoKey(d.po_no || d.sauda_no);
    if (!k || savedDedByPoKey.has(k)) return;
    savedDedByPoKey.set(k, d);
  });

  // Pre-group inspections by normalized PO/Sauda key to avoid O(N*M) scans
  const inspByPoKey = new Map<string, any[]>();
  millInspections.forEach((insp: any) => {
    const rawInspPo = insp.po_no || insp.mill_po_no || insp.contract_po_no || insp.sauda_no;
    const k = cleanPoKey(rawInspPo);
    if (!k) return;
    if (!inspByPoKey.has(k)) inspByPoKey.set(k, []);
    inspByPoKey.get(k)!.push(insp);
  });

  const allPoKeys = new Set<string>([
    ...Array.from(savedDedByPoKey.keys()),
    ...Array.from(scpByPoKey.keys())
  ]);

  const results: ComputedShortExcessRecord[] = [];

  allPoKeys.forEach(poKey => {
    const cp = scpByPoKey.get(poKey);
    const savedDed = savedDedByPoKey.get(poKey);
    if (!cp && !savedDed) return;

    const poNo = String(savedDed?.po_no || cp?.po_no || cp?.contract_po_no || poKey).trim();
    const saudaDate = normalizeDateYmd(
      cp?.sauda_date || cp?.s_date || cp?.po_date || cp?.contract_date || cp?.voucher_date || cp?.date || savedDed?.created_at || ''
    );
    const supplier = String(savedDed?.supplier || cp?.supplier || cp?.supplier_name || cp?.supp_name || 'UNKNOWN SUPPLIER').toUpperCase().trim();
    const broker = String(savedDed?.broker || cp?.broker || cp?.broker_name || 'DIRECT').toUpperCase().trim();
    const area = String(cp?.area || cp?.location || '').toUpperCase().trim();
    const agency = String(cp?.agency || '').toUpperCase().trim();
    const unit = String(cp?.purchase_unit_name || cp?.unit_type || cp?.unit || 'BALES').toUpperCase().trim();

    const contractMt = Number(
      cp?.total_contract_mt ||
      cp?.contract_weight_mt ||
      savedDed?.contract_weight_mt ||
      cp?.total_wt_in_ton ||
      cp?.weight_mt ||
      cp?.contract_mt ||
      (Number(cp?.weight_qtl) > 0 ? Number(cp.weight_qtl) / 10 : 0) ||
      0
    );
    if (contractMt <= 0) return;

    let matchedInsps = inspByPoKey.get(poKey) || [];
    if (matchedInsps.length === 0) {
      matchedInsps = millInspections.filter((insp: any) => {
        const rawInspPo = insp.po_no || insp.mill_po_no || insp.contract_po_no || insp.sauda_no;
        return rawInspPo ? arePoNumbersExactMatch(rawInspPo, poNo) : false;
      });
    }

    const uniqueByMr = new Map<string, any>();
    matchedInsps.forEach((insp: any) => {
      const rawMr = String(insp.mr_no || insp.arrival_no || '').trim();
      if (!rawMr || rawMr.toUpperCase() === 'NO' || rawMr.toUpperCase() === 'N/A' || rawMr === '-') return;
      const mKey = canonicalMrKey(rawMr);
      const existing = uniqueByMr.get(mKey);
      const hasGrid = Boolean(insp.grid_details || insp.details);
      const existingHasGrid = Boolean(existing?.grid_details || existing?.details);
      if (!existing || (!existingHasGrid && hasGrid)) {
        uniqueByMr.set(mKey, insp);
      }
    });

    const sortedInsps = Array.from(uniqueByMr.values()).sort((a: any, b: any) => {
      const seqA = extractMrSeq(a.mr_no || a.arrival_no || '');
      const seqB = extractMrSeq(b.mr_no || b.arrival_no || '');
      if (seqA > 0 && seqB > 0 && seqA !== seqB) return seqA - seqB;
      return String(a.arrival_date || a.mr_date || a.date || '').localeCompare(
        String(b.arrival_date || b.mr_date || b.date || '')
      );
    });

    const saudaRate =
      getTd5RateForDate(saudaDate) ||
      Number(cp?.b_rate || cp?.base_rate || cp?.b_rate_qtl || cp?.s_b_rate || cp?.sauda_b_rate || 0) ||
      Number(cp?.rate || cp?.purchase_rate || cp?.rate_per_qtl || cp?.sauda_rate || cp?.contract_rate || savedDed?.sauda_rate || 0) ||
      12900;

    let sumShortClaimMt = 0;
    let sumExcessClaimMt = 0;
    let lastMrDate = normalizeDateYmd(savedDed?.last_arrival_date || '');
    let lastMrSattaRate = 0;
    const mrCount = sortedInsps.length;

    if (mrCount > 0) {
      const isMulti = mrCount > 1;
      sortedInsps.forEach((insp: any, idx: number) => {
        const isLast = idx === mrCount - 1;
        const mrNoStr = String(insp.mr_no || insp.arrival_no || '').trim();
        const mKey = canonicalMrKey(mrNoStr);
        const mrDateStr = normalizeDateYmd(insp.arrival_date || insp.mr_date || insp.inspection_date || insp.date || insp.created_at || '');

        let mrGrossMt = toMtFromRawWt(insp.challan_gross_wt ?? insp.receipt_gross_wt ?? insp.gross_weight);
        let mrNetMt = toMtFromRawWt(insp.final_receipt_wt ?? insp.total_final_receipt_wt ?? insp.reduced_weight ?? insp.weight_reduced);

        let embeddedGrid: any[] = [];
        const rawGrid = insp.grid_details || insp.details;
        if (rawGrid) {
          try {
            const parsed = typeof rawGrid === 'string' ? JSON.parse(rawGrid) : rawGrid;
            if (Array.isArray(parsed)) embeddedGrid = parsed;
          } catch (_) {}
        }
        const matchingDetails = embeddedGrid.length > 0 ? embeddedGrid : (detailsByMrKey.get(mKey) || []);
        if (matchingDetails.length > 0) {
          const seenSrl = new Set<string>();
          let sumDetailGrossMt = 0;
          let sumDetailNetMt = 0;
          matchingDetails.forEach((d: any, itIdx: number) => {
            if (!d || typeof d !== 'object') return;
            const itMr = String(d.mr_no || '').trim();
            if (itMr && canonicalMrKey(itMr) !== mKey) return;
            const gRaw = Number(d.challan_gross_wt ?? d.receipt_gross_wt ?? d.gross_weight_batch ?? d.gross_weight ?? 0);
            const nRaw = Number(d.final_receipt_wt ?? d.reduced_weight ?? d.netto_pnto ?? 0);
            if (gRaw <= 0 && nRaw <= 0) return;

            const srl =
              d.srl_no !== undefined && d.srl_no !== null && String(d.srl_no).trim() !== ''
                ? `SRL_${String(d.srl_no).trim()}`
                : `ROW_${String(d.arrival_grade || d.receipt_grade_name || d.challan_grade_name || itIdx).trim()}_${gRaw}_${nRaw}`;
            if (seenSrl.has(srl)) return;
            seenSrl.add(srl);

            const gWt = toMtFromRawWt(gRaw);
            let nWt = toMtFromRawWt(nRaw);
            if (nWt <= 0 && d.quantity_rcpt) nWt = toMtFromRawWt(d.quantity_rcpt);
            if (nWt <= 0 && gWt > 0) nWt = gWt;
            sumDetailGrossMt += gWt;
            sumDetailNetMt += nWt;
          });

          const roundedDetailGross = Math.round(sumDetailGrossMt * 1000) / 1000;
          const roundedDetailNet = Math.round(sumDetailNetMt * 1000) / 1000;
          if (roundedDetailGross > 0 && (mrGrossMt <= 0 || Math.abs(mrGrossMt - roundedDetailGross) > 0.05)) {
            mrGrossMt = roundedDetailGross;
          }
          if (
            roundedDetailNet > 0 &&
            (mrNetMt <= 0 ||
              (mrGrossMt > 0 && mrNetMt > mrGrossMt + 0.001) ||
              Math.abs(mrNetMt - roundedDetailNet) > 0.05)
          ) {
            mrNetMt = roundedDetailNet;
          }
        }

        if (mrGrossMt > 0 && mrNetMt > mrGrossMt + 0.001) mrNetMt = mrGrossMt;
        if (mrNetMt <= 0) {
          if (insp.weight_qtl) mrNetMt = Number(insp.weight_qtl) / 10;
          else if (insp.weight) mrNetMt = toMtFromRawWt(insp.weight);
        }
        if (mrGrossMt <= 0) mrGrossMt = mrNetMt;
        if (mrNetMt <= 0) mrNetMt = mrGrossMt;

        mrGrossMt = Math.round(mrGrossMt * 1000) / 1000;
        mrNetMt = Math.round(mrNetMt * 1000) / 1000;

        const shortClaimMt = isMulti ? (isLast ? mrGrossMt : mrNetMt) : mrGrossMt;
        const excessUsesGross =
          mrCount === 1 ? true : mrCount === 2 ? (idx === 0) : mrCount >= 3 ? isLast : false;
        const excessClaimMt = excessUsesGross ? mrGrossMt : mrNetMt;
        sumShortClaimMt += shortClaimMt;
        sumExcessClaimMt += excessClaimMt;

        if (isLast) {
          lastMrDate = mrDateStr;
          lastMrSattaRate = getTd5RateForDate(mrDateStr) || Number(savedDed?.satta_rate) || saudaRate;
        }
      });
    }

    const roundedShortClaimMt = Math.round(sumShortClaimMt * 1000) / 1000;
    const roundedExcessClaimMt = Math.round(sumExcessClaimMt * 1000) / 1000;
    const isExcessBasis =
      (contractMt - roundedExcessClaimMt) < -0.0001 &&
      (roundedShortClaimMt >= contractMt - 0.0001 || (roundedExcessClaimMt - contractMt) >= (contractMt - roundedShortClaimMt));

    const computedTotalClaimMt = isExcessBasis ? roundedExcessClaimMt : roundedShortClaimMt;
    const totalReceivedMt =
      computedTotalClaimMt > 0
        ? Math.round(computedTotalClaimMt * 1000) / 1000
        : Math.round(Number(savedDed?.total_received_mt || cp?.received_weight_mt || 0) * 1000) / 1000;

    if (totalReceivedMt <= 0) return;

    const grossVarianceMt = Math.round((contractMt - totalReceivedMt) * 1000) / 1000;
    const isGrossShort = grossVarianceMt > 0.0001;
    const isGrossExcess = grossVarianceMt < -0.0001;
    const shortageMt = isGrossShort ? grossVarianceMt : 0;
    const excessMt = isGrossExcess ? Math.abs(grossVarianceMt) : 0;
    const tolerance3PctMt = Math.round((contractMt * 0.03) * 1000) / 1000;

    let deductionQtyMt = 0;
    let isWithinTolerance = false;
    let variationType: 'excess' | 'short' | 'within_tolerance' = 'within_tolerance';
    let policyLabel = 'Within 3% Tolerance';

    const isSingleLorry =
      mrCount > 0
        ? mrCount === 1
        : String(savedDed?.arrival_numbers || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean).length <= 1;

    if (isGrossExcess) {
      if (isSingleLorry && excessMt < 1.5) {
        if (excessMt <= tolerance3PctMt) {
          variationType = 'within_tolerance';
          deductionQtyMt = 0;
          isWithinTolerance = true;
          policyLabel = 'Within 3% Exemption (Single Lorry Excess)';
        } else {
          variationType = 'excess';
          deductionQtyMt = Math.max(0, Math.round((excessMt - tolerance3PctMt) * 1000) / 1000);
          isWithinTolerance = false;
          policyLabel = '3% Excess Exemption (Single Lorry < 1.5 MT)';
        }
      } else {
        variationType = 'excess';
        deductionQtyMt = Math.max(0, Math.round(excessMt * 1000) / 1000);
        isWithinTolerance = false;
        policyLabel = isSingleLorry ? 'Excess ≥ 1.5 MT (Full Excess)' : 'No 3% Tolerance on Excess';
      }
    } else if (isGrossShort) {
      if (shortageMt >= 1.5) {
        variationType = 'short';
        deductionQtyMt = Math.max(0, Math.round(shortageMt * 1000) / 1000);
        isWithinTolerance = false;
        policyLabel = 'Short ≥ 1.5 MT (Full Shortage)';
      } else if (shortageMt <= tolerance3PctMt) {
        variationType = 'within_tolerance';
        deductionQtyMt = 0;
        isWithinTolerance = true;
        policyLabel = 'Within 3% Exemption';
      } else {
        variationType = 'short';
        deductionQtyMt = Math.max(0, Math.round((shortageMt - tolerance3PctMt) * 1000) / 1000);
        isWithinTolerance = false;
        policyLabel = '3% Short Weight Exemption';
      }
    } else {
      variationType = 'within_tolerance';
      deductionQtyMt = 0;
      isWithinTolerance = true;
      policyLabel = 'Exact Weight';
    }

    const deductionQtyQtl = Math.round(deductionQtyMt * 10 * 100) / 100;
    const lastMrRate =
      (lastMrDate ? getTd5RateForDate(lastMrDate) : 0) ||
      lastMrSattaRate ||
      Number(savedDed?.satta_rate) ||
      saudaRate;

    const isShortRateLowerOrEqual = isGrossShort && lastMrRate <= saudaRate;
    const isExcessApplicableForSauda = isGrossExcess && lastMrRate >= saudaRate;

    const rateDifference = isGrossShort
      ? (lastMrRate > saudaRate ? lastMrRate - saudaRate : 0)
      : isGrossExcess
      ? Math.max(0, saudaRate - lastMrRate)
      : 0;

    const rateMode = String(savedDed?.rate_basis || 'rate_difference');
    let rateDiff = rateDifference;
    if (rateMode === 'custom' && Number(savedDed?.applicable_rate) > 0) {
      rateDiff = Number(savedDed.applicable_rate);
    } else if (rateMode === 'last_mr_satta') {
      rateDiff = lastMrRate;
    } else if (rateMode === 'sauda_satta') {
      rateDiff = saudaRate;
    }

    let rawDedAmt = 0;
    if (!isWithinTolerance && deductionQtyQtl > 0) {
      if (isGrossShort && rateMode === 'rate_difference' && isShortRateLowerOrEqual) {
        rawDedAmt = 0;
      } else if (isGrossExcess && rateMode === 'rate_difference' && isExcessApplicableForSauda) {
        rawDedAmt = 0;
      } else {
        rawDedAmt = Math.round(deductionQtyQtl * rateDiff * 100) / 100;
      }
    }

    const isLocked =
      Boolean(
        savedDed &&
          ['approved', 'settled', 'locked'].includes(String(savedDed.status || '').toLowerCase())
      ) || Boolean(cp?.is_settled || String(cp?.excess_short_status || '').toLowerCase() === 'settled');

    if (savedDed || variationType === 'excess' || variationType === 'short' || rawDedAmt > 0) {
      results.push({
        poNo,
        saudaDate,
        supplier,
        broker,
        area,
        agency,
        unit,
        contractMt: Number(contractMt.toFixed(3)),
        totalReceivedMt: Number(totalReceivedMt.toFixed(3)),
        variationType,
        policyLabel,
        deductionQtyMt,
        deductionQtyQtl,
        saudaRate,
        lastMrRate,
        rateDiff,
        deductionAmount: rawDedAmt,
        isLocked
      });
    }
  });

  return results;
}
