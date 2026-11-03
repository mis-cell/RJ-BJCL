import { dbModule } from "../dbModule";
import { aggregatePremiumsFromTables } from "../paymentCalculationEngine";
import { ReportTransactionLine, AllPoSummary, AllPoRecord, SystemReportDataset } from "../../types/systemReport.types";
import {
  normalizeToISODate,
  getTodayISODate,
  parseJsonItems,
  getFinancialYear,
  getYearMonth,
  isInvalidAgency,
  isInvalidArea
} from "./systemReportSanitizers";
let cachedReportResult: {
  data: {
    allTransactions: ReportTransactionLine[];
    allPoSummary: AllPoSummary;
    brokerSettlementMap?: SystemReportDataset['brokerSettlementMap'];
    masterLists: SystemReportDataset['masterLists'];
  };
  timestamp: number;
} | null = null;

let inFlightReportPromise: Promise<{
  allTransactions: ReportTransactionLine[];
  allPoSummary: AllPoSummary;
  brokerSettlementMap?: SystemReportDataset['brokerSettlementMap'];
  masterLists: SystemReportDataset['masterLists'];
}> | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('app-data-updated', () => {
    cachedReportResult = null;
  });
}

function getYearMonth(dateStr: string): string {
  const iso = normalizeToISODate(dateStr);
  return iso.substring(0, 7) || '2026-09';
}

export async function loadAndProcessSystemReportData(forceRefresh = false): Promise<{
  allTransactions: ReportTransactionLine[];
  allPoSummary: AllPoSummary;
  brokerSettlementMap?: SystemReportDataset['brokerSettlementMap'];
  masterLists: SystemReportDataset['masterLists'];
}> {
  const now = Date.now();
  if (!forceRefresh && cachedReportResult && (now - cachedReportResult.timestamp) < 30000) {
    return cachedReportResult.data;
  }

  if (inFlightReportPromise) {
    return inFlightReportPromise;
  }

  inFlightReportPromise = (async () => {
    try {
      const [
        pos,
        poDetails,
        scps,
      scpDetails,
      amad,
      finals,
      inspections,
      payments,
      paymentDetails,
      sattaRates,
      brokers,
      suppliers,
      agencies,
      areas,
      grades,
      markas,
      saudas,
      saudaQualityList,
      settlements,
      mrSettMaster,
      mrSettDetail,
      mRSetts
    ] = await Promise.all([
      dbModule.fetchAll('purchase_master').catch(() => []),
      dbModule.fetchAll('purchase_detail_master').catch(() => []),
      dbModule.fetchAll('sauda_check_point').catch(() => []),
      dbModule.fetchAll('sauda_check_point_details').catch(() => []),
      dbModule.fetchAll('temporary_material_received').catch(() => []),
      dbModule.fetchAll('final_arrival').catch(() => []),
      dbModule.fetchAll('material_inspection').catch(() => []),
      dbModule.fetchAll('payment_master').catch(() => []),
      dbModule.fetchAll('payment_details').catch(() => []),
      dbModule.fetchAll('satta_base_rates').catch(() => []),
      dbModule.fetchAll('broker_master').catch(() => []),
      dbModule.fetchAll('supply_master').catch(() => []),
      dbModule.fetchAll('agency_master').catch(() => []),
      dbModule.fetchAll('area_master').catch(() => []),
      dbModule.fetchAll('grade_master').catch(() => []),
      dbModule.fetchAll('marka_master').catch(() => []),
      dbModule.fetchAll('sauda_master').catch(() => []),
      dbModule.fetchAll('sauda_quality_details').catch(() => []),
      dbModule.fetchAll('settlement_master').catch(() => []),
      dbModule.fetchAll('mr_settlement_master').catch(() => []),
      dbModule.fetchAll('mr_settlement_detail').catch(() => []),
      dbModule.fetchAll('m_r_settlement').catch(() => [])
    ]);

    // Build early broker and entity lookups to properly resolve settlement brokers
    const brokerMap = new Map<string, string>();
    (brokers || []).forEach((b: any) => {
      const bCode = String(b.brok_code || b.broker_code || b.code || '').trim().toUpperCase();
      const bName = String(b.brok_name || b.broker_name || b.name || '').trim();
      if (bCode && bName) {
        brokerMap.set(bCode, bName);
        brokerMap.set(bName.toUpperCase(), bName);
      } else if (bName) {
        brokerMap.set(bName.toUpperCase(), bName);
      }
    });

    const mrToMasterMap = new Map<string, any>();
    const poToBrokerMap = new Map<string, string>();
    const mrToBrokerMap = new Map<string, string>();
    const poToSaudaMap = new Map<string, string>();
    const saudaToBrokerMap = new Map<string, string>();

    (pos || []).forEach((p: any) => {
      const pNo = String(p.po_no || '').trim().toUpperCase();
      const brk = String(p.broker || '').trim();
      const sNo = String(p.sauda_no || '').trim();
      if (pNo) {
        if (brk) poToBrokerMap.set(pNo, brokerMap.get(brk.toUpperCase()) || brk);
        if (sNo) poToSaudaMap.set(pNo, sNo);
      }
    });

    (scps || []).forEach((s: any) => {
      const pNo = String(s.po_no || '').trim().toUpperCase();
      const sNo = String(s.sauda_no || '').trim();
      const brk = String(s.broker || '').trim();
      if (pNo) {
        if (brk) poToBrokerMap.set(pNo, brokerMap.get(brk.toUpperCase()) || brk);
        if (sNo) poToSaudaMap.set(pNo, sNo);
      }
    });

    (saudas || []).forEach((s: any) => {
      const sNo = String(s.sauda_no || '').trim().toUpperCase();
      const brk = String(s.broker || '').trim();
      if (sNo && brk) {
        saudaToBrokerMap.set(sNo, brokerMap.get(brk.toUpperCase()) || brk);
      }
    });

    (mrSettMaster || []).forEach((m: any) => {
      const mrNo = String(m.mr_no || '').trim().toUpperCase();
      if (mrNo) {
        mrToMasterMap.set(mrNo, m);
        const brk = String(m.broker || '').trim();
        if (brk) mrToBrokerMap.set(mrNo, brokerMap.get(brk.toUpperCase()) || brk);
      }
      const pNo = String(m.po_no || '').trim().toUpperCase();
      const brk = String(m.broker || '').trim();
      if (pNo && brk) {
        poToBrokerMap.set(pNo, brokerMap.get(brk.toUpperCase()) || brk);
      }
    });

    // Group details by mr_no for reliable joining
    const detailsByMr = new Map<string, any[]>();
    (mrSettDetail || []).forEach((d: any) => {
      const mr = String(d.mr_no || '').trim().toUpperCase();
      if (!detailsByMr.has(mr)) detailsByMr.set(mr, []);
      detailsByMr.get(mr)!.push(d);
    });

    const brokerSettlementMap: SystemReportDataset['brokerSettlementMap'] = {};

    const addDeductionTypeToEntry = (entry: any, rawType: any) => {
      if (!rawType) return;
      if (typeof rawType === 'object') {
        rawType = rawType.deduction_type || rawType.adjust_type || rawType.type || rawType.name || '';
      }
      const str = String(rawType || '').trim();
      if (!str || str === '-' || str === '—' || str.toLowerCase() === 'none' || str === '[object Object]') return;
      str.split(/[\n,;/]+/).forEach(t => {
        const clean = t.trim();
        if (clean && clean !== '[object Object]' && !entry.deductionTypes.includes(clean)) {
          entry.deductionTypes.push(clean);
        }
      });
    };

    const getBrokerEntry = (name: string) => {
      const cleanName = brokerMap.get(name.toUpperCase()) || name || 'Direct';
      const upper = cleanName.toUpperCase();
      if (!brokerSettlementMap[upper]) {
        brokerSettlementMap[upper] = {
          moistureClaim: 0,
          moistureSett: 0,
          dustClaim: 0,
          dustSett: 0,
          gradedownClaim: 0,
          gradedownSett: 0,
          moistCount: 0,
          dustCount: 0,
          gdCount: 0,
          shortExcess: 0,
          otherDeductionAmount: 0,
          deductionTypes: [],
          allDeductionValue: 0,
          inspMoistSum: 0,
          inspMoistCount: 0,
          inspDustSum: 0,
          inspDustCount: 0,
          inspGdSum: 0,
          inspGdCount: 0,
          moistureSettAvg: 0,
          dustSettAvg: 0,
          gradedownSettAvg: 0,
          details: []
        };
      }
      return { entry: brokerSettlementMap[upper], cleanName };
    };

    const processedMrKeySet = new Set<string>();

    const processSettlementRow = (s: any, src: string = 'settlement') => {
      const mrNo = String(s.mr_no || s.arrival_no || '').trim().toUpperCase();
      if (mrNo) processedMrKeySet.add(mrNo);
      let rawBrk = String(s.broker || '').trim();
      const poNo = String(s.po_no || '').trim().toUpperCase();
      const saudaNo = String(s.sauda_no || (poNo ? poToSaudaMap.get(poNo) : '') || '').trim().toUpperCase();

      if (!rawBrk && mrNo) rawBrk = mrToBrokerMap.get(mrNo) || '';
      if (!rawBrk && poNo) rawBrk = poToBrokerMap.get(poNo) || '';
      if (!rawBrk && saudaNo) rawBrk = saudaToBrokerMap.get(saudaNo) || '';

      const { entry, cleanName } = getBrokerEntry(rawBrk);

      const moistClaim = Number(s.moist_claim ?? s.claim_moisture ?? s.summary_delivery_claim ?? 0);
      const moistSett = Number(s.moist_sett ?? 0);
      const dustClaim = Number(s.dust_claim ?? s.claim_dust ?? s.summary_rate_wt_claim ?? 0);
      const dustSett = Number(s.dust_sett ?? 0);
      const gdClaim = Number(s.gd_claim ?? s.claim_grade_down ?? s.summary_misc_less ?? 0);
      const gdSett = Number(s.gd_sett ?? 0);
      const short = Number(s.val_ex_short || s.short_excess || 0);
      
      const rawDedType = s.summary_deduction_type || s.deduction_type || s.adjust_type || '';
      addDeductionTypeToEntry(entry, rawDedType);

      const specificOtherDed = Number(s.summary_deduction_amount || s.val_less_amt || s.val_less_amount || s.deduction_amount || 0);
      const totalDedAmt = Number(s.val_less_amt || s.val_less_amount || s.summary_deduction_amount || s.summary_less_amount || s.claim_settlement || s.deduction_amount || (short + specificOtherDed) || 0);

      if (moistClaim > 0 || moistSett > 0) {
        entry.moistureClaim += moistClaim;
        entry.moistureSett += moistSett;
        entry.moistCount = (entry.moistCount || 0) + 1;
      }
      if (dustClaim > 0 || dustSett > 0) {
        entry.dustClaim += dustClaim;
        entry.dustSett += dustSett;
        entry.dustCount = (entry.dustCount || 0) + 1;
      }
      if (gdClaim > 0 || gdSett > 0) {
        entry.gradedownClaim += gdClaim;
        entry.gradedownSett += gdSett;
        entry.gdCount = (entry.gdCount || 0) + 1;
      }
      entry.shortExcess += short;
      entry.otherDeductionAmount = (entry.otherDeductionAmount || 0) + specificOtherDed;
      entry.allDeductionValue += (totalDedAmt > 0 ? totalDedAmt : (short + specificOtherDed));

      entry.details.push({
        broker: cleanName,
        mr_no: mrNo || '-',
        po_no: poNo || '-',
        moist_claim: moistClaim,
        moist_sett: moistSett,
        dust_claim: dustClaim,
        dust_sett: dustSett,
        gd_claim: gdClaim,
        gd_sett: gdSett,
        summary_delivery_claim: moistClaim || moistSett,
        summary_rate_wt_claim: dustClaim || dustSett,
        summary_misc_less: gdClaim || gdSett,
        summary_less_amount: totalDedAmt,
        val_less_amt: Number(s.val_less_amt || 0),
        val_less_amount: Number(s.val_less_amount || 0),
        val_ex_short: short,
        summary_deduction_type: rawDedType || '-',
        summary_deduction_rate: Number(s.summary_deduction_rate || 0),
        summary_deduction_qty: Number(s.summary_deduction_qty || 0),
        summary_deduction_amount: specificOtherDed,
        deductions: totalDedAmt > 0 ? totalDedAmt : (short + specificOtherDed),
        lorry_number: s.lorry_number || s.lorry_no || '-'
      });
    };

    // 1. Process mr_settlement_master with its child details
    (mrSettMaster || []).forEach((m: any) => {
      const mrNo = String(m.mr_no || '').trim().toUpperCase();
      processedMrKeySet.add(mrNo);
      let rawBrk = String(m.broker || '').trim();
      const poNo = String(m.po_no || '').trim().toUpperCase();
      const saudaNo = String(m.sauda_no || poToSaudaMap.get(poNo) || '').trim().toUpperCase();

      if (!rawBrk && mrNo) rawBrk = mrToBrokerMap.get(mrNo) || '';
      if (!rawBrk && poNo) rawBrk = poToBrokerMap.get(poNo) || '';
      if (!rawBrk && saudaNo) rawBrk = saudaToBrokerMap.get(saudaNo) || '';

      const { entry, cleanName } = getBrokerEntry(rawBrk);

      const mrDetails = detailsByMr.get(mrNo) || [];
      let mrMoistClaim = 0;
      let mrMoistSett = 0;
      let mrDustClaim = 0;
      let mrDustSett = 0;
      let mrGdClaim = 0;
      let mrGdSett = 0;
      let mrClaimSett = 0;

      if (mrDetails.length > 0) {
        mrDetails.forEach(d => {
          mrMoistClaim += Number(d.moist_claim || 0);
          mrMoistSett += Number(d.moist_sett || 0);
          mrDustClaim += Number(d.dust_claim || 0);
          mrDustSett += Number(d.dust_sett || 0);
          mrGdClaim += Number(d.gd_claim || 0);
          mrGdSett += Number(d.gd_sett || 0);
          mrClaimSett += Number(d.claim_settlement || 0);
          addDeductionTypeToEntry(entry, d.adjust_type || d.deduction_type);
        });
      } else {
        mrMoistClaim = Number(m.moist_claim || m.summary_delivery_claim || 0);
        mrMoistSett = Number(m.moist_sett || 0);
        mrDustClaim = Number(m.dust_claim || m.summary_rate_wt_claim || 0);
        mrDustSett = Number(m.dust_sett || 0);
        mrGdClaim = Number(m.gd_claim || 0);
        mrGdSett = Number(m.gd_sett || 0);
      }

      const rawType = m.summary_deduction_type || '';
      addDeductionTypeToEntry(entry, rawType);
      if (Array.isArray(m.deductions)) {
        m.deductions.forEach((d: any) => addDeductionTypeToEntry(entry, d.deduction_type));
      }

      const short = Number(m.val_ex_short || 0);
      const specificOtherDed = Number(m.summary_deduction_amount || m.val_less_amt || m.val_less_amount || 0);
      const dedVal = Number(m.val_less_amt || m.val_less_amount || m.summary_deduction_amount || m.summary_less_amount || 0) || mrClaimSett;

      if (mrMoistClaim > 0 || mrMoistSett > 0) {
        entry.moistureClaim += mrMoistClaim;
        entry.moistureSett += mrMoistSett;
        entry.moistCount = (entry.moistCount || 0) + 1;
      }
      if (mrDustClaim > 0 || mrDustSett > 0) {
        entry.dustClaim += mrDustClaim;
        entry.dustSett += mrDustSett;
        entry.dustCount = (entry.dustCount || 0) + 1;
      }
      if (mrGdClaim > 0 || mrGdSett > 0) {
        entry.gradedownClaim += mrGdClaim;
        entry.gradedownSett += mrGdSett;
        entry.gdCount = (entry.gdCount || 0) + 1;
      }
      entry.shortExcess += short;
      entry.otherDeductionAmount = (entry.otherDeductionAmount || 0) + specificOtherDed;
      entry.allDeductionValue += (dedVal > 0 ? dedVal : (short + specificOtherDed));

      if (mrDetails.length > 0) {
        mrDetails.forEach(d => {
          entry.details.push({
            broker: cleanName,
            mr_no: m.mr_no || d.mr_no || '-',
            po_no: m.po_no || d.po_no || '-',
            moist_claim: Number(d.moist_claim || 0),
            moist_sett: Number(d.moist_sett || 0),
            dust_claim: Number(d.dust_claim || 0),
            dust_sett: Number(d.dust_sett || 0),
            gd_claim: Number(d.gd_claim || 0),
            gd_sett: Number(d.gd_sett || 0),
            summary_delivery_claim: Number(d.moist_claim || d.moist_sett || m.summary_delivery_claim || 0),
            summary_rate_wt_claim: Number(d.dust_claim || d.dust_sett || m.summary_rate_wt_claim || 0),
            summary_misc_less: Number(d.gd_claim || d.gd_sett || m.summary_misc_less || 0),
            summary_less_amount: Number(m.summary_less_amount || d.claim_settlement || 0),
            val_less_amt: Number(m.val_less_amt || 0),
            val_less_amount: Number(m.val_less_amount || 0),
            val_ex_short: short,
            summary_deduction_type: d.adjust_type || m.summary_deduction_type || '-',
            summary_deduction_rate: Number(m.summary_deduction_rate || d.rate_value || 0),
            summary_deduction_qty: Number(d.quantity || m.summary_deduction_qty || 0),
            summary_deduction_amount: Number(d.claim_settlement || m.summary_deduction_amount || 0),
            deductions: Number(d.claim_settlement || m.summary_deduction_amount || dedVal || 0),
            lorry_number: m.lorry_number || m.lorry_no || '-'
          });
        });
      } else {
        entry.details.push({
          broker: cleanName,
          mr_no: m.mr_no || '-',
          po_no: m.po_no || '-',
          moist_claim: mrMoistClaim,
          moist_sett: mrMoistSett,
          dust_claim: mrDustClaim,
          dust_sett: mrDustSett,
          gd_claim: mrGdClaim,
          gd_sett: mrGdSett,
          summary_delivery_claim: mrMoistClaim || mrMoistSett,
          summary_rate_wt_claim: mrDustClaim || mrDustSett,
          summary_misc_less: mrGdClaim || mrGdSett,
          summary_less_amount: Number(m.summary_less_amount || 0),
          val_less_amt: Number(m.val_less_amt || 0),
          val_less_amount: Number(m.val_less_amount || 0),
          val_ex_short: short,
          summary_deduction_type: m.summary_deduction_type || '-',
          summary_deduction_rate: Number(m.summary_deduction_rate || 0),
          summary_deduction_qty: Number(m.summary_deduction_qty || 0),
          summary_deduction_amount: Number(m.summary_deduction_amount || 0),
          deductions: dedVal > 0 ? dedVal : (short + specificOtherDed),
          lorry_number: m.lorry_number || m.lorry_no || '-'
        });
      }
    });

    // 2. Process any mr_settlement_detail with no master
    (mrSettDetail || []).forEach((d: any) => {
      const mrNo = String(d.mr_no || '').trim().toUpperCase();
      if (!processedMrKeySet.has(mrNo)) {
        processedMrKeySet.add(mrNo);
        let rawBrk = String(d.broker || '').trim();
        if (!rawBrk && mrNo) rawBrk = mrToBrokerMap.get(mrNo) || '';
        const { entry, cleanName } = getBrokerEntry(rawBrk);

        const moistClaim = Number(d.moist_claim || 0);
        const moistSett = Number(d.moist_sett || 0);
        const dustClaim = Number(d.dust_claim || 0);
        const dustSett = Number(d.dust_sett || 0);
        const gdClaim = Number(d.gd_claim || 0);
        const gdSett = Number(d.gd_sett || 0);
        const claimSett = Number(d.claim_settlement || 0);
        addDeductionTypeToEntry(entry, d.adjust_type || d.deduction_type);

        if (moistClaim > 0 || moistSett > 0) {
          entry.moistureClaim += moistClaim;
          entry.moistureSett += moistSett;
          entry.moistCount = (entry.moistCount || 0) + 1;
        }
        if (dustClaim > 0 || dustSett > 0) {
          entry.dustClaim += dustClaim;
          entry.dustSett += dustSett;
          entry.dustCount = (entry.dustCount || 0) + 1;
        }
        if (gdClaim > 0 || gdSett > 0) {
          entry.gradedownClaim += gdClaim;
          entry.gradedownSett += gdSett;
          entry.gdCount = (entry.gdCount || 0) + 1;
        }
        entry.otherDeductionAmount = (entry.otherDeductionAmount || 0) + claimSett;
        entry.allDeductionValue += claimSett;

        entry.details.push({
          broker: cleanName,
          mr_no: d.mr_no || '-',
          po_no: d.po_no || '-',
          moist_claim: moistClaim,
          moist_sett: moistSett,
          dust_claim: dustClaim,
          dust_sett: dustSett,
          gd_claim: gdClaim,
          gd_sett: gdSett,
          summary_delivery_claim: moistClaim || moistSett,
          summary_rate_wt_claim: dustClaim || dustSett,
          summary_misc_less: gdClaim || gdSett,
          summary_less_amount: claimSett,
          val_less_amt: 0,
          val_less_amount: 0,
          val_ex_short: 0,
          summary_deduction_type: d.adjust_type || '-',
          summary_deduction_rate: Number(d.rate_value || 0),
          summary_deduction_qty: Number(d.quantity || 0),
          summary_deduction_amount: claimSett,
          deductions: claimSett,
          lorry_number: '-'
        });
      }
    });

    // 3. Process m_r_settlement table
    (mRSetts || []).forEach(m => {
      const mrNo = String(m.mr_no || '').trim().toUpperCase();
      if (!processedMrKeySet.has(mrNo)) {
        let rawBrk = String(m.broker || '').trim();
        if (!rawBrk && mrNo) rawBrk = mrToBrokerMap.get(mrNo) || '';
        const { entry, cleanName } = getBrokerEntry(rawBrk);
        const moistClaim = Number(m.moist_claim || 0);
        const moistSett = Number(m.moist_sett || 0);
        const dustClaim = Number(m.dust_claim || 0);
        const dustSett = Number(m.dust_sett || 0);
        const gdClaim = Number(m.gd_claim || 0);
        const gdSett = Number(m.gd_sett || 0);
        const short = Number(m.val_ex_short || m.short_excess || 0);
        const ded = Number(m.claim_settlement || m.deductions || (short) || 0);

        if (moistClaim > 0 || moistSett > 0) {
          entry.moistureClaim += moistClaim;
          entry.moistureSett += moistSett;
          entry.moistCount = (entry.moistCount || 0) + 1;
        }
        if (dustClaim > 0 || dustSett > 0) {
          entry.dustClaim += dustClaim;
          entry.dustSett += dustSett;
          entry.dustCount = (entry.dustCount || 0) + 1;
        }
        if (gdClaim > 0 || gdSett > 0) {
          entry.gradedownClaim += gdClaim;
          entry.gradedownSett += gdSett;
          entry.gdCount = (entry.gdCount || 0) + 1;
        }
        entry.shortExcess += short;
        entry.allDeductionValue += ded;

        entry.details.push({
          broker: cleanName,
          mr_no: m.mr_no || '-',
          po_no: m.po_no || '-',
          moist_claim: moistClaim,
          moist_sett: moistSett,
          dust_claim: dustClaim,
          dust_sett: dustSett,
          gd_claim: gdClaim,
          gd_sett: gdSett,
          summary_delivery_claim: moistClaim || moistSett,
          summary_rate_wt_claim: dustClaim || dustSett,
          summary_misc_less: gdClaim || gdSett,
          summary_less_amount: ded,
          val_less_amt: 0,
          val_less_amount: 0,
          val_ex_short: short,
          summary_deduction_type: '-',
          summary_deduction_rate: 0,
          summary_deduction_qty: 0,
          summary_deduction_amount: ded,
          deductions: ded,
          lorry_number: m.lorry_number || '-'
        });
      }
    });

    // 4. Process settlements
    (settlements || []).forEach(s => processSettlementRow(s, 'settlement'));

    // 5. Dedicated calculation for Broker Wise Deductions from material_inspection:
    // Moisture Sett (%): claim_moisture
    // Dust Sett (%): claim_dust
    // Gradedown Sett (%): claim_grade_down
    // Formula: SUM(field_value) / COUNT(rows where field_value > 0)
    // Rows where value is 0 or non-positive are strictly ignored and excluded from the count.
    (inspections || []).forEach((insp: any) => {
      let rawBrk = String(insp.broker_name || insp.broker || '').trim();
      const mrNo = String(insp.mr_no || insp.arrival_no || '').trim().toUpperCase();
      const poNo = String(insp.po_no || '').trim().toUpperCase();
      const saudaNo = String(insp.sauda_no || (poNo ? poToSaudaMap.get(poNo) : '') || '').trim().toUpperCase();

      if (!rawBrk && mrNo) rawBrk = mrToBrokerMap.get(mrNo) || '';
      if (!rawBrk && poNo) rawBrk = poToBrokerMap.get(poNo) || '';
      if (!rawBrk && saudaNo) rawBrk = saudaToBrokerMap.get(saudaNo) || '';

      const { entry, cleanName } = getBrokerEntry(rawBrk);

      // Extract values strictly from the specified database mappings:
      // Moisture Sett (%): claim_moisture
      // Dust Sett (%): claim_dust
      // Gradedown Sett (%): claim_grade_down
      let claimMoist = Number(insp.claim_moisture ?? insp.moisture_claim ?? 0);
      let claimDust = Number(insp.claim_dust ?? insp.dust_claim ?? 0);
      let claimGd = Number(insp.claim_grade_down ?? insp.grade_down_claim ?? 0);
      let settMoist = Number(insp.settlement_moisture ?? 0);
      let settDust = Number(insp.settlement_dust ?? 0);
      let settGd = Number(insp.settlement_grade_down ?? 0);

      const rawGrid = insp.grid_details || insp.details;
      if (rawGrid) {
        try {
          const arr = typeof rawGrid === 'string' ? JSON.parse(rawGrid) : rawGrid;
          if (Array.isArray(arr) && arr.length > 0) {
            if (claimMoist === 0) {
              const f = arr.find((x: any) => Number(x.claim_moisture || x.moisture_claim || 0) > 0);
              if (f) claimMoist = Number(f.claim_moisture || f.moisture_claim || 0);
            }
            if (claimDust === 0) {
              const f = arr.find((x: any) => Number(x.claim_dust || x.dust_claim || 0) > 0);
              if (f) claimDust = Number(f.claim_dust || f.dust_claim || 0);
            }
            if (claimGd === 0) {
              const f = arr.find((x: any) => Number(x.claim_grade_down || x.grade_down_claim || 0) > 0);
              if (f) claimGd = Number(f.claim_grade_down || f.grade_down_claim || 0);
            }
            if (settMoist === 0) {
              const f = arr.find((x: any) => Number(x.settlement_moisture || 0) > 0);
              if (f) settMoist = Number(f.settlement_moisture || 0);
            }
            if (settDust === 0) {
              const f = arr.find((x: any) => Number(x.settlement_dust || 0) > 0);
              if (f) settDust = Number(f.settlement_dust || 0);
            }
            if (settGd === 0) {
              const f = arr.find((x: any) => Number(x.settlement_grade_down || 0) > 0);
              if (f) settGd = Number(f.settlement_grade_down || 0);
            }
          }
        } catch (e) {
          // ignore
        }
      }

      // SUM(field_value) / COUNT(rows where field_value > 0). Values <= 0 are strictly excluded.
      if (!isNaN(claimMoist) && claimMoist > 0) {
        entry.inspMoistSum = (entry.inspMoistSum || 0) + claimMoist;
        entry.inspMoistCount = (entry.inspMoistCount || 0) + 1;
      }

      if (!isNaN(claimDust) && claimDust > 0) {
        entry.inspDustSum = (entry.inspDustSum || 0) + claimDust;
        entry.inspDustCount = (entry.inspDustCount || 0) + 1;
      }

      if (!isNaN(claimGd) && claimGd > 0) {
        entry.inspGdSum = (entry.inspGdSum || 0) + claimGd;
        entry.inspGdCount = (entry.inspGdCount || 0) + 1;
      }

      const short = Number(insp.short_excess || insp.val_ex_short || 0);
      const dedAmt = Number(insp.deduction_amount || 0);
      const dedType = insp.deduction_type || insp.deduction_types || insp.summary_deduction_type || '';
      addDeductionTypeToEntry(entry, dedType);

      if (mrNo && !processedMrKeySet.has(mrNo)) {
        processedMrKeySet.add(mrNo);
        entry.shortExcess += short;
        entry.otherDeductionAmount = (entry.otherDeductionAmount || 0) + dedAmt;
        entry.allDeductionValue += (dedAmt > 0 ? dedAmt : short);
      }

      // Populate details array for modal drill-down
      const existingDetail = entry.details.find((d: any) => d.mr_no && mrNo && String(d.mr_no).trim().toUpperCase() === mrNo);
      if (existingDetail) {
        if ((!existingDetail.moist_claim || existingDetail.moist_claim === 0) && claimMoist > 0) existingDetail.moist_claim = claimMoist;
        if ((!existingDetail.moist_sett || existingDetail.moist_sett === 0) && settMoist > 0) existingDetail.moist_sett = settMoist;
        if ((!existingDetail.dust_claim || existingDetail.dust_claim === 0) && claimDust > 0) existingDetail.dust_claim = claimDust;
        if ((!existingDetail.dust_sett || existingDetail.dust_sett === 0) && settDust > 0) existingDetail.dust_sett = settDust;
        if ((!existingDetail.gd_claim || existingDetail.gd_claim === 0) && claimGd > 0) existingDetail.gd_claim = claimGd;
        if ((!existingDetail.gd_sett || existingDetail.gd_sett === 0) && settGd > 0) existingDetail.gd_sett = settGd;
        if (!existingDetail.lorry_number || existingDetail.lorry_number === '-') {
          existingDetail.lorry_number = insp.lorry_number || insp.lorry_no || '-';
        }
      } else {
        entry.details.push({
          broker: cleanName,
          mr_no: mrNo || '-',
          po_no: poNo || '-',
          moist_claim: claimMoist,
          moist_sett: settMoist,
          dust_claim: claimDust,
          dust_sett: settDust,
          gd_claim: claimGd,
          gd_sett: settGd,
          summary_delivery_claim: claimMoist,
          summary_rate_wt_claim: claimDust,
          summary_misc_less: claimGd,
          summary_less_amount: dedAmt,
          val_less_amt: 0,
          val_less_amount: 0,
          val_ex_short: short,
          summary_deduction_type: dedType || '-',
          summary_deduction_rate: Number(insp.deduction_rate || 0),
          summary_deduction_qty: Number(insp.deduction_qty || 0),
          summary_deduction_amount: dedAmt,
          deductions: dedAmt || short,
          lorry_number: insp.lorry_number || insp.lorry_no || '-'
        });
      }
    });

    // Finalize averages for all broker entries strictly using material_inspection formula:
    // SUM(field_value) / COUNT(rows where field_value > 0)
    // Any broker with count 0 gets 0 (displays as '—'), never falling back to unrelated fields.
    Object.values(brokerSettlementMap).forEach(entry => {
      // 1. Moisture Sett (%): SUM(claim_moisture) / COUNT(claim_moisture > 0)
      const moistCount = (entry.inspMoistCount || 0);
      const moistSum = (entry.inspMoistSum || 0);
      entry.moistureSettAvg = moistCount > 0 ? (moistSum / moistCount) : 0;
      entry.moistureClaim = moistSum;
      entry.moistCount = moistCount;

      // 2. Dust Sett (%): SUM(claim_dust) / COUNT(claim_dust > 0)
      const dustCount = (entry.inspDustCount || 0);
      const dustSum = (entry.inspDustSum || 0);
      entry.dustSettAvg = dustCount > 0 ? (dustSum / dustCount) : 0;
      entry.dustClaim = dustSum;
      entry.dustCount = dustCount;

      // 3. Gradedown Sett (%): SUM(claim_grade_down) / COUNT(claim_grade_down > 0)
      const gdCount = (entry.inspGdCount || 0);
      const gdSum = (entry.inspGdSum || 0);
      entry.gradedownSettAvg = gdCount > 0 ? (gdSum / gdCount) : 0;
      entry.gradedownClaim = gdSum;
      entry.gdCount = gdCount;
    });

    // Build Master Lookup Maps
    const gradeMap = new Map<string, string>();
    (grades || []).forEach((g: any) => {
      const gCode = String(g.grade_code || '').trim().toUpperCase();
      const gName = String(g.grade_name || g.name || '').trim().toUpperCase();
      if (gCode && gName) {
        gradeMap.set(gCode, gName);
        gradeMap.set(gName, gName);
      } else if (gName) {
        gradeMap.set(gName, gName);
      }
    });

    const markaSet = new Set<string>();
    (markas || []).forEach((m: any) => {
      if (m.marka_code) markaSet.add(String(m.marka_code).trim().toUpperCase());
      if (m.marka_name) markaSet.add(String(m.marka_name).trim().toUpperCase());
      if (m.name) markaSet.add(String(m.name).trim().toUpperCase());
    });
    // Common trade markas that might not be in db
    ['AJAY', 'BALAJI', 'TULSI/H', 'TULSI', 'AA', 'NO MARK', 'BTR', 'SUPERIOR', 'NORMAL'].forEach(m => markaSet.add(m));

    const INVALID_GRADE_SET = new Set([
      'NORMAL', 'NORMAL GRADE', 'STANDARD', 'STANDARD GRADE', 'PO_TYPE', 'UNASSIGNED', 'DIRECT', 'N/A', '-', '', 'BALES',
      ...Array.from(markaSet)
    ]);

    // Build Sauda Master & Sauda Quality Maps for reliable grade resolution
    const saudaMasterMap = new Map<string, any>();
    (saudas || []).forEach((s: any) => {
      const sNo = String(s.sauda_no || '').trim().toUpperCase();
      if (sNo) saudaMasterMap.set(sNo, s);
      if (s.id) saudaMasterMap.set(String(s.id), s);
      if (s.sauda_id) saudaMasterMap.set(String(s.sauda_id), s);
    });

    const saudaQualityMap = new Map<string, any[]>();
    (saudaQualityList || []).forEach((sq: any) => {
      const sId = String(sq.sauda_id || sq.sauda_no || '').trim().toUpperCase();
      if (sId) {
        const list = saudaQualityMap.get(sId) || [];
        list.push(sq);
        saudaQualityMap.set(sId, list);
      }
    });

    const resolveGradeName = (rawName?: string, rawCode?: string, saudaNo?: string, poNo?: string): string => {
      const cleanName = String(rawName || '').trim();
      const cleanCode = String(rawCode || '').trim();
      const sNoClean = String(saudaNo || '').trim().toUpperCase();
      const pNoClean = String(poNo || '').trim().toUpperCase();

      // Check grade_master match by name or code
      if (cleanName && gradeMap.has(cleanName.toUpperCase())) {
        return gradeMap.get(cleanName.toUpperCase())!;
      }
      if (cleanCode && gradeMap.has(cleanCode.toUpperCase())) {
        return gradeMap.get(cleanCode.toUpperCase())!;
      }

      if (cleanName && !INVALID_GRADE_SET.has(cleanName.toUpperCase()) && !markaSet.has(cleanName.toUpperCase())) {
        return cleanName;
      }
      if (cleanCode && !INVALID_GRADE_SET.has(cleanCode.toUpperCase()) && !markaSet.has(cleanCode.toUpperCase())) {
        return cleanCode;
      }

      // Check sauda quality details (quality/grade)
      const qList = (sNoClean ? saudaQualityMap.get(sNoClean) : undefined) || (pNoClean ? saudaQualityMap.get(pNoClean) : undefined);
      if (qList && qList.length > 0) {
        for (const q of qList) {
          const qVal = String(q.quality || q.grade_name || q.grade_code || q.grade || '').trim();
          if (qVal && gradeMap.has(qVal.toUpperCase())) {
            return gradeMap.get(qVal.toUpperCase())!;
          }
          if (qVal && !INVALID_GRADE_SET.has(qVal.toUpperCase()) && !markaSet.has(qVal.toUpperCase())) {
            return qVal;
          }
        }
      }

      // Check sauda master quality
      const saudaRow = (sNoClean ? saudaMasterMap.get(sNoClean) : undefined) || (pNoClean ? saudaMasterMap.get(pNoClean) : undefined);
      if (saudaRow) {
        const sVal = String(saudaRow.quality || saudaRow.grade || '').trim();
        if (sVal && gradeMap.has(sVal.toUpperCase())) {
          return gradeMap.get(sVal.toUpperCase())!;
        }
        if (sVal && !INVALID_GRADE_SET.has(sVal.toUpperCase()) && !markaSet.has(sVal.toUpperCase())) {
          return sVal;
        }
        if (Array.isArray(saudaRow.quality_details)) {
          for (const q of saudaRow.quality_details) {
            const qVal = String(q.quality || q.grade || '').trim();
            if (qVal && gradeMap.has(qVal.toUpperCase())) {
              return gradeMap.get(qVal.toUpperCase())!;
            }
            if (qVal && !INVALID_GRADE_SET.has(qVal.toUpperCase()) && !markaSet.has(qVal.toUpperCase())) {
              return qVal;
            }
          }
        }
      }

      return 'TD5';
    };

    const agencyMap = new Map<string, string>();
    (agencies || []).forEach((a: any) => {
      const aCode = String(a.agency_code || '').trim().toUpperCase();
      const aName = String(a.agency_name || a.name || '').trim().toUpperCase();
      if (aCode && aName) {
        agencyMap.set(aCode, aName);
        agencyMap.set(aName, aName);
      } else if (aName) {
        agencyMap.set(aName, aName);
      }
    });

    const areaMap = new Map<string, string>();
    (areas || []).forEach((ar: any) => {
      const arCode = String(ar.area_code || '').trim().toUpperCase();
      const arName = String(ar.area_name || ar.name || '').trim().toUpperCase();
      if (arCode && arName) {
        areaMap.set(arCode, arName);
        areaMap.set(arName, arName);
      } else if (arName) {
        areaMap.set(arName, arName);
      }
    });

    const supplyMap = new Map<string, string>();
    (suppliers || []).forEach((s: any) => {
      const sCode = String(s.supp_code || s.supply_code || s.supplier_code || s.code || '').trim().toUpperCase();
      const sName = String(s.supp_name || s.supply_name || s.supplier_name || s.name || '').trim();
      if (sCode && sName) {
        supplyMap.set(sCode, sName);
        supplyMap.set(sName.toUpperCase(), sName);
      } else if (sName) {
        supplyMap.set(sName.toUpperCase(), sName);
      }
    });

    // Satta Base Rates
    const baseRateMap = new Map<string, number>();
    (sattaRates || []).forEach((r: any) => {
      const d = r.start_date || r.date;
      if (d && r.base_rate) {
        baseRateMap.set(d, Number(r.base_rate));
      }
    });

    const defaultLatestBaseRate = sattaRates && sattaRates.length > 0 
      ? Number(sattaRates[0].base_rate || 0) 
      : 0;

    // Arrival by PO and Sauda (deduplicated per arrival row so identical po_no/contract_po_no/sauda_no never double-add weight)
    const arrivalByPo = new Map<string, number>();
    const finalArrivalSet = new Set<string>();
    (finals || []).forEach((f: any) => {
      const wt = Number(f.electronic_net_weight || f.weight_reduced || 0);
      const rowKeys = new Set<string>(
        [f.po_no, f.contract_po_no, f.sauda_no, f.arrival_no]
          .map(x => String(x || '').trim())
          .filter(Boolean)
      );
      rowKeys.forEach(k => {
        arrivalByPo.set(k, (arrivalByPo.get(k) || 0) + wt);
        finalArrivalSet.add(k.toUpperCase());
      });
      if (f.mr_no) finalArrivalSet.add(String(f.mr_no).trim().toUpperCase());
      if (f.final_arrival_no) finalArrivalSet.add(String(f.final_arrival_no).trim().toUpperCase());
    });

    const amadSet = new Set<string>();
    (amad || []).forEach((a: any) => {
      const key = a.po_no || a.temporary_arrival_no;
      if (key && !arrivalByPo.has(key)) {
        const wt = Number(a.weight_qtl ? a.weight_qtl / 10 : 0);
        if (wt > 0) arrivalByPo.set(key, wt);
      }
      if (a.po_no) amadSet.add(String(a.po_no).trim().toUpperCase());
      if (a.temporary_arrival_no) amadSet.add(String(a.temporary_arrival_no).trim().toUpperCase());
      if (a.sauda_no) amadSet.add(String(a.sauda_no).trim().toUpperCase());
    });

    // Inspection deductions & quality
    const inspectionDeductionByPo = new Map<string, { deduction: number; moisture: number; gradeDown: number; hasInspection: boolean }>();
    const inspectionSet = new Set<string>();
    (inspections || []).forEach((i: any) => {
      if (i.po_no) inspectionSet.add(String(i.po_no).trim().toUpperCase());
      if (i.mr_no) inspectionSet.add(String(i.mr_no).trim().toUpperCase());
      if (i.arrival_no) inspectionSet.add(String(i.arrival_no).trim().toUpperCase());
      if (i.sauda_no) inspectionSet.add(String(i.sauda_no).trim().toUpperCase());
      const poKey = i.po_no || i.mr_no || i.arrival_no;
      if (poKey) {
        const prev = inspectionDeductionByPo.get(poKey) || { deduction: 0, moisture: 0, gradeDown: 0, hasInspection: false };
        const ded = Number(i.deduction_amount || 0);
        const moist = Number(i.actual_moisture || i.claim_moisture || 0);
        const gd = Number(i.grade_down_qty || i.deduction_qty || 0);
        inspectionDeductionByPo.set(poKey, {
          deduction: prev.deduction + ded,
          moisture: Math.max(prev.moisture, moist),
          gradeDown: prev.gradeDown + gd,
          hasInspection: true
        });
      }
    });

    // Payments by PO & MR (deduplicating alias keys per payment row)
    const paymentByPo = new Map<string, number>();
    (payments || []).forEach((p: any) => {
      const amt = Number(p.paid_amount ?? p.payable_amt ?? 0);
      const pKeys = new Set<string>(
        [p.po_no, p.mr_no, p.voucher_no]
          .map(x => String(x || '').trim())
          .filter(Boolean)
      );
      pKeys.forEach(k => {
        paymentByPo.set(k, (paymentByPo.get(k) || 0) + amt);
      });
    });

    (paymentDetails || []).forEach((pd: any) => {
      const amt = Number(pd.amount || pd.net_amt || (pd.sett_rate && pd.quantity_qtl ? pd.sett_rate * pd.quantity_qtl : 0) || 0);
      if (amt > 0) {
        if (pd.po_no) paymentByPo.set(pd.po_no, Math.max(paymentByPo.get(pd.po_no) || 0, amt));
        if (pd.mr_no) paymentByPo.set(pd.mr_no, Math.max(paymentByPo.get(pd.mr_no) || 0, amt));
        if (pd.sauda_no) paymentByPo.set(pd.sauda_no, Math.max(paymentByPo.get(pd.sauda_no) || 0, amt));
      }
    });


    const pendingpaymentByPo = new Map<string, number>();
    (settlements || []).forEach((p: any) => {
      const pndngamt = Number(p.payable_amt || 0);
      if (p.po_no) pendingpaymentByPo.set(p.po_no, (pendingpaymentByPo.get(p.po_no) || 0) + pndngamt);
      if (p.mr_no) pendingpaymentByPo.set(p.mr_no, (pendingpaymentByPo.get(p.mr_no) || 0) + pndngamt);
      if (p.voucher_no) pendingpaymentByPo.set(p.voucher_no, (pendingpaymentByPo.get(p.voucher_no) || 0) + pndngamt);
    });
    //alert()

    // Helper to generate normalized keys for robust PO detail linking
    const getPoKeys = (raw: string | number | undefined | null): string[] => {
      if (!raw) return [];
      const s = String(raw).trim().toUpperCase();
      if (!s || s === '-') return [];
      const keys = new Set<string>([s]);
      const numOnly = s.replace(/[^0-9]/g, '');
      if (numOnly) {
        keys.add(numOnly);
        keys.add(numOnly.padStart(4, '0'));
        keys.add(String(parseInt(numOnly, 10)));
        keys.add(`PO-${numOnly}`);
        keys.add(`PO-${numOnly.padStart(4, '0')}`);
        keys.add(`PO-${String(parseInt(numOnly, 10))}`);
        keys.add(`PTF-${numOnly}`);
        keys.add(`PTF-${numOnly.padStart(4, '0')}`);
        keys.add(`PTF-${String(parseInt(numOnly, 10))}`);
      }
      return Array.from(keys);
    };

    // Group PO details by all alias variations
    const poDetailsMap = new Map<string, any[]>();
    [...(scpDetails || []), ...(poDetails || [])].forEach((item: any) => {
      const keys = [
        ...getPoKeys(item.po_no),
        ...getPoKeys(item.ptf_no),
        ...getPoKeys(item.sauda_no),
        ...getPoKeys(item.contract_po_no)
      ];
      keys.forEach(k => {
        const list = poDetailsMap.get(k) || [];
        const isDuplicate = list.some(existing => 
          existing.srl_no === item.srl_no && 
          (existing.grade_name === item.grade_name || existing.grade_code === item.grade_code) &&
          (existing.rate_qntl === item.rate_qntl || existing.rate === item.rate)
        );
        if (!isDuplicate) {
          list.push(item);
        }
        poDetailsMap.set(k, list);
      });
    });

    const findPoDetails = (poNo: string, saudaNo: string): any[] => {
      const candidateKeys = [
        ...getPoKeys(poNo),
        ...getPoKeys(saudaNo)
      ];
      for (const k of candidateKeys) {
        const found = poDetailsMap.get(k);
        if (found && found.length > 0) return found;
      }
      return [];
    };

    // Helper to extract numbers or valid explicit premium values
    const parseExplicitNum = (val: any): number => {
      if (val === undefined || val === null) return 0;
      if (typeof val === 'number') return isNaN(val) ? 0 : val;
      const s = String(val).trim();
      if (!s || s === '-' || /^(no|false)$/i.test(s)) return 0;
      const num = parseFloat(s.replace(/[^0-9.]/g, ''));
      return isNaN(num) ? 0 : num;
    };

    // Premium lookup map across all entity alias variations (Settlement, Payment, SCP, PO)
    const premiumLookupMap = new Map<string, { rate: number; amount: number; source: string }>();
    const recordPremiumEntry = (rawKey: any, rate: number, amount: number, src: string, refObj?: any) => {
      let validRate = rate > 0 && rate < 2000 ? rate : 0;
      let validAmt = amount > 0 ? amount : 0;

      // Guard against total invoice or payment amounts (e.g. 115,700) passed into val_premium_amt or summary_premium_amount
      if (refObj) {
        const totalInvoiceAmt = parseExplicitNum(refObj.total_amount || refObj.paid_amount || refObj.payable_amt || refObj.val_material_value);
        if (totalInvoiceAmt > 0 && Math.abs(validAmt - totalInvoiceAmt) < 1) {
          validAmt = 0;
        }
      }

      if (validRate === 0 && validAmt === 0) return;

      const keys = getPoKeys(rawKey);
      keys.forEach(k => {
        const existing = premiumLookupMap.get(k) || { rate: 0, amount: 0, source: '' };
        premiumLookupMap.set(k, {
          rate: Math.max(existing.rate, validRate),
          amount: Math.max(existing.amount, validAmt),
          source: existing.source || src
        });
      });
    };

    // 1. Process payment_master + payment_details using the authoritative unified calculation engine
    const unifiedPremiums = aggregatePremiumsFromTables(payments, paymentDetails);

    // Register all unified MR premiums under their PO, MR, and Voucher aliases
    unifiedPremiums.mrsWithPremium.forEach(pm => {
      const keys = [
        ...getPoKeys(pm.poNo),
        ...getPoKeys(pm.mrNo),
        ...getPoKeys(pm.voucherNo)
      ];
      keys.forEach(k => {
        const existing = premiumLookupMap.get(k) || { rate: 0, amount: 0, source: '' };
        premiumLookupMap.set(k, {
          rate: Math.max(existing.rate, pm.avgPremiumRatePerQtl),
          amount: existing.amount + pm.totalPremiumAmount,
          source: 'PaymentOperations'
        });
      });
    });

    (settlements || []).forEach((st: any) => {
      const premAmt = parseExplicitNum(st.val_premium_amt || st.summary_premium_amount);
      const premRate = parseExplicitNum(st.summary_premium_rate || st.premium_rate);
      if (premAmt > 0 || premRate > 0) {
        if (st.po_no) recordPremiumEntry(st.po_no, premRate, premAmt, 'Settlement', st);
        if (st.sauda_no) recordPremiumEntry(st.sauda_no, premRate, premAmt, 'Settlement', st);
        if (st.contract_po_no) recordPremiumEntry(st.contract_po_no, premRate, premAmt, 'Settlement', st);
      }
    });

    (scps || []).forEach((sc: any) => {
      const premAmt = parseExplicitNum(sc.val_premium_amt || sc.summary_premium_amount);
      const premRate = parseExplicitNum(sc.premium);
      if (premAmt > 0 || premRate > 0) {
        if (sc.po_no) recordPremiumEntry(sc.po_no, premRate, premAmt, 'SCP');
        if (sc.sauda_no) recordPremiumEntry(sc.sauda_no, premRate, premAmt, 'SCP');
      }
    });

    (pos || []).forEach((p: any) => {
      const premAmt = parseExplicitNum(p.summary_premium_amount || p.val_premium_amt);
      const premRate = parseExplicitNum(p.premium);
      if (premAmt > 0 || premRate > 0) {
        if (p.po_no) recordPremiumEntry(p.po_no, premRate, premAmt, 'PO');
        if (p.sauda_no) recordPremiumEntry(p.sauda_no, premRate, premAmt, 'PO');
      }
    });

    // Merge Sauda Check Point & Purchase Master records
    const allPosMap = new Map<string, any>();
    const seenCanonKeys = new Set<string>();

    const getAllRecordKeys = (item: any): string[] => {
      if (!item) return [];
      const keys: string[] = [];
      const add = (val: any) => {
        if (!val) return;
        const str = String(val).trim();
        if (!str || /^n\/?a$/i.test(str) || /^undefined$/i.test(str) || /^null$/i.test(str) || str === '-') return;
        
        const clean = str.replace(/^p\.?o\.?\s*[:\-]?\s*/i, '').trim().toUpperCase();
        if (clean) {
          keys.push(clean);
          const parts = clean.split('/');
          const suffix = parts[parts.length - 1].trim();
          const numOnly = suffix.replace(/[^0-9]/g, '');
          if (numOnly) {
            keys.push(numOnly);
            keys.push(numOnly.padStart(4, '0'));
          }
        }
      };

      add(item.po_no);
      add(item.contract_po_no);
      add(item.sauda_no);
      add(item.ptf_no);
      add(item.reference_no);
      add(item.bill_challan_no);
      if (item.id) {
        add(`SCP-${item.id}`);
        add(`PO-${item.id}`);
      }
      return Array.from(new Set(keys));
    };

    const saudaToAgencyLookup = new Map<string, string>();
    const getCleanNumberKey = (str?: string | null): string => {
      if (!str) return '';
      const clean = String(str).trim().toUpperCase();
      const numOnly = clean.replace(/[^0-9]/g, '');
      return numOnly ? String(parseInt(numOnly, 10)) : clean;
    };

    (saudas || []).forEach((s: any) => {
      let ag = String(s.agency || '').trim();
      if (isInvalidAgency(ag)) ag = '';
      if (!ag && Array.isArray(s.quality_details)) {
        for (const q of s.quality_details) {
          if (q.agency && !isInvalidAgency(q.agency)) {
            ag = String(q.agency).trim();
            break;
          }
        }
      }
      if (ag) {
        const resolved = agencyMap.get(ag.toUpperCase()) || ag;
        if (s.sauda_no) {
          saudaToAgencyLookup.set(String(s.sauda_no).trim().toUpperCase(), resolved);
          const numKey = getCleanNumberKey(s.sauda_no);
          if (numKey) saudaToAgencyLookup.set(numKey, resolved);
        }
        if (s.po_no) {
          saudaToAgencyLookup.set(String(s.po_no).trim().toUpperCase(), resolved);
          const numKey = getCleanNumberKey(s.po_no);
          if (numKey) saudaToAgencyLookup.set(numKey, resolved);
        }
      }
    });

    const resolvePoAgency = (item: any): string => {
      let rawAgency = String(item.agency || item.purchase_unit_name || '').trim();
      if (isInvalidAgency(rawAgency)) rawAgency = '';

      const sNoCandidate = item.sauda_no || item.po_no || item.contract_po_no;
      if (!rawAgency && sNoCandidate) {
        const k1 = String(sNoCandidate).trim().toUpperCase();
        const k2 = getCleanNumberKey(sNoCandidate);
        rawAgency = saudaToAgencyLookup.get(k1) || saudaToAgencyLookup.get(k2) || '';
      }

      if (rawAgency && !isInvalidAgency(rawAgency)) {
        return agencyMap.get(rawAgency.toUpperCase()) || rawAgency;
      }
      return 'Direct Purchase / Head Office';
    };

    const uniquePosMap = new Map<string, any>();

    const pushUniquePo = (item: any, prefix: string) => {
      if (!item) return;
      const rawNo = String(item.po_no || item.sauda_no || item.contract_po_no || item.session || item.id || '').trim().toUpperCase();
      if (!rawNo) return;
      const canonicalKey = getCleanNumberKey(rawNo) || rawNo;
      // Later stages (FINAL_PO > SCP > SAUDA_DESK) override earlier stage for the same contract
      if (!uniquePosMap.has(canonicalKey) || prefix === 'FINAL_PO' || prefix === 'SCP') {
        uniquePosMap.set(canonicalKey, item);
      }
    };

    (saudas || []).forEach((s: any) => {
      pushUniquePo({
        ...s,
        po_no: s.po_no || s.sauda_no,
        sauda_no: s.sauda_no || s.po_no,
        contract_date: normalizeToISODate(s.date || s.b_date || s.created_at),
        supplier: s.supplier || s.challan_supplier || s.party_name,
        broker: s.broker,
        agency: resolvePoAgency(s),
        area: s.area,
        grade: s.quality || s.grade,
        total_contract_mt: Number(s.total_wt_in_ton || s.wt_per_lorry || 0),
        b_rate: Number(s.b_rate) || 0,
        status: s.approval_status || s.status || 'Active',
        id: s.sauda_id || s.id
      }, 'SAUDA_DESK');
    });

    (scps || []).forEach((sc: any) => {
      pushUniquePo({
        ...sc,
        po_no: sc.po_no || sc.contract_po_no || sc.sauda_no,
        sauda_no: sc.sauda_no || sc.po_no || sc.contract_po_no,
        contract_date: normalizeToISODate(sc.po_date || sc.contract_date || sc.created_at),
        supplier: sc.supplier || sc.challan_supplier || sc.party_name,
        broker: sc.broker,
        agency: resolvePoAgency(sc),
        area: sc.area,
        grade: sc.grade || sc.quality,
        total_contract_mt: Number(sc.total_contract_mt || sc.quantity || 0),
        b_rate: Number(sc.b_rate) || 0,
        status: sc.status || 'Active',
        id: sc.po_id || sc.id
      }, 'SCP');
    });

    (pos || []).forEach((p: any) => {
      pushUniquePo({
        ...p,
        po_no: p.po_no || p.contract_po_no || p.sauda_no,
        sauda_no: p.sauda_no || p.po_no || p.contract_po_no,
        contract_date: normalizeToISODate(p.po_date || p.contract_date || p.created_at),
        supplier: p.supplier || p.challan_supplier || p.party_name,
        broker: p.broker,
        agency: resolvePoAgency(p),
        area: p.area,
        grade: p.grade || p.quality,
        total_contract_mt: Number(p.total_contract_mt || p.quantity || 0),
        b_rate: Number(p.b_rate) || 0,
        status: p.status || 'Active',
        id: p.po_id || p.id
      }, 'FINAL_PO');
    });

    const uniquePosList: any[] = Array.from(uniquePosMap.values());

    const transactionLines: ReportTransactionLine[] = [];
    let txnCounter = 1;

    uniquePosList.forEach((po: any) => {
      const poNo = String(po.po_no || po.contract_po_no || po.ptf_no || po.sauda_no || (po.id ? `PO-${po.id}` : '')).trim();
      if (!poNo) return;
      const saudaNo = String(po.sauda_no || po.contract_po_no || po.po_contract || poNo).trim();
      const date = po.contract_date || po.po_date || po.date || po.s_date || po.b_date || po.created_at?.split('T')[0] || '';

      const rawSup = String(po.supplier || po.party_name || po.challan_supplier || '').trim();
      const supplier = supplyMap.get(rawSup.toUpperCase()) || rawSup || 'Direct Supplier';

      const rawBrk = String(po.broker || '').trim();
      const broker = brokerMap.get(rawBrk.toUpperCase()) || rawBrk || 'Direct';

      const agency = resolvePoAgency(po);

      const rawArea = String(po.area || '').trim();
      const area = areaMap.get(rawArea.toUpperCase()) || (rawArea && rawArea !== '-' ? rawArea : 'Unassigned Area');

      const details = findPoDetails(poNo, saudaNo);

      // Aggregate details to create exactly 1 unsplit transaction record per Sauda/PO number
      let grade = po.grade || po.quality || '-';
      let purchaseRate = Number(po.b_rate || 0);
      let quantityMT = Number(po.total_contract_mt || po.quantity || 0);

      if (details.length > 0) {
        const gradeNames = details.map(d => resolveGradeName(String(d.grade_name || d.grade || '').trim(), String(d.grade_code || d.quality || '').trim(), saudaNo, poNo)).filter(Boolean);
        if (gradeNames.length > 0) {
          grade = Array.from(new Set(gradeNames)).join(', ');
        }

        const detailsTotalQty = details.reduce((acc: number, d: any) => acc + (Number(d.weight_mt || d.qty) || 0), 0);
        if (quantityMT === 0) quantityMT = detailsTotalQty;

        const weightedRateSum = details.reduce((acc: number, d: any) => {
          const q = Number(d.weight_mt || d.qty) || 1;
          const r = Number(d.rate_qntl || d.rate || po.b_rate || 0);
          return acc + (q * r);
        }, 0);
        const calcWeight = detailsTotalQty > 0 ? detailsTotalQty : details.length;
        if (weightedRateSum > 0) purchaseRate = Number((weightedRateSum / calcWeight).toFixed(2));
      } else {
        const rawGName = String(po.grade_name || po.grade || po.quality || '').trim();
        const rawGCode = String(po.grade_code || (po.quality_details && po.quality_details[0]?.quality) || '').trim();
        grade = resolveGradeName(rawGName, rawGCode, saudaNo, poNo);
      }

      if (quantityMT === 0) quantityMT = Number(po.total_wt_in_ton || po.wt_per_lorry || 0);

      const baseRate = baseRateMap.get(date) || Number(po.b_rate || defaultLatestBaseRate || purchaseRate);
      const rateVariance = purchaseRate - baseRate;
      const rateVariancePct = baseRate > 0 ? (rateVariance / baseRate) * 100 : 0;
      const grossPurchaseValue = quantityMT * purchaseRate * 10;
      const baseRateValue = quantityMT * baseRate * 10;

      // Real explicit premium resolution (matched strictly by PO number):
      const poKeys = getPoKeys(poNo);
      let headerPrem = { rate: 0, amount: 0, source: '' };
      for (const k of poKeys) {
        if (premiumLookupMap.has(k)) {
          headerPrem = premiumLookupMap.get(k)!;
          break;
        }
      }

      const cleanPoKey = poNo.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const matchedMrs = unifiedPremiums.byPoMap.get(cleanPoKey) || [];
      const poTotalPremium = matchedMrs.reduce((s, m) => s + m.totalPremiumAmount, 0);
      const poAvgRate = matchedMrs.length > 0 ? (matchedMrs[0].avgPremiumRatePerQtl || 0) : 0;

      let premiumRate = 0;
      let premiumAmount = 0;

      if (poTotalPremium > 0) {
        premiumAmount = poTotalPremium;
        premiumRate = poAvgRate;
      }
      if (premiumRate === 0 && premiumAmount > 0 && quantityMT > 0) {
        premiumRate = premiumAmount / (quantityMT * 10);
      }
      const premiumPct = grossPurchaseValue > 0 ? (premiumAmount / grossPurchaseValue) * 100 : 0;

      const inspInfo = inspectionDeductionByPo.get(poNo) || inspectionDeductionByPo.get(saudaNo) || { deduction: 0, moisture: 0, gradeDown: 0, hasInspection: false };
      const deductionAmount = inspInfo.deduction;
      const deductionPct = grossPurchaseValue > 0 ? (deductionAmount / grossPurchaseValue) * 100 : 0;
      const moisturePct = inspInfo.moisture;
      const gradeDownQty = inspInfo.gradeDown;

      const effectiveCost = grossPurchaseValue + premiumAmount - deductionAmount;
      const realizationRate = Number(po.realization_rate || baseRate || purchaseRate);
      const realizationValue = quantityMT * realizationRate * 10;
      const grossProfit = realizationValue - effectiveCost;
      const profitPct = effectiveCost > 0 ? (grossProfit / effectiveCost) * 100 : 0;

      let profitStatus: ReportTransactionLine['profitStatus'] = 'PROFITABLE';
      if (grossProfit < -100) profitStatus = 'LOSS';
      else if (Math.abs(grossProfit) <= 100) profitStatus = 'BREAK-EVEN';
      else if (profitPct < 1.0) profitStatus = 'NON-PROFITABLE';

      const arrivedWeightMT = arrivalByPo.get(poNo) || arrivalByPo.get(saudaNo) || 0;
      const pendingWeightMT = Math.max(0, quantityMT - arrivedWeightMT);
      const paidAmount = paymentByPo.get(poNo) || paymentByPo.get(saudaNo) || 0;
      const pendingPayable = Math.max(0, effectiveCost - paidAmount);

      const deliveryToDate = po.delivery_to;
      const isDelayed = deliveryToDate ? new Date() > new Date(deliveryToDate) && pendingWeightMT > 0 : false;

      const abnormalReasons: string[] = [];
      if (moisturePct > 18.0) abnormalReasons.push(`High Moisture (${moisturePct.toFixed(1)}%)`);
      if (premiumRate > 100) abnormalReasons.push(`High Premium (+₹${premiumRate.toFixed(0)}/Qtl)`);
      if (deductionPct > 3) abnormalReasons.push(`High Deduction (${deductionPct.toFixed(1)}%)`);
      if (isDelayed) abnormalReasons.push(`Overdue Delivery (${pendingWeightMT.toFixed(2)} MT pending)`);
      if (gradeDownQty > 0) abnormalReasons.push(`Grade Down (${gradeDownQty} MT)`);

      const matchedMrNo = matchedMrs.map(m => m.mrNo).filter(Boolean).join(', ') || undefined;
      const matchedVoucherNo = matchedMrs.map(m => m.voucherNo).filter(Boolean).join(', ') || undefined;

      transactionLines.push({
        txnId: `TXN-${String(txnCounter++).padStart(5, '0')}`,
        saudaNo,
        poNo,
        mrNo: matchedMrNo,
        voucherNo: matchedVoucherNo,
        date,
        month: getYearMonth(date),
        financialYear: getFinancialYear(date),
        supplier,
        broker,
        agency,
        area,
        grade,
        quantityMT,
        purchaseRate,
        baseRate,
        rateVariance,
        rateVariancePct,
        grossPurchaseValue,
        baseRateValue,
        premiumRate,
        premiumAmount,
        premiumPct,
        deductionAmount,
        deductionPct,
        moisturePct,
        gradeDownQty,
        effectiveCost,
        realizationRate,
        realizationValue,
        grossProfit,
        profitPct,
        profitStatus,
        saudaStatus: pendingWeightMT === 0 ? 'COMPLETED' : (isDelayed ? 'DELAYED' : 'IN_PROGRESS'),
        arrivalStatus: arrivedWeightMT >= quantityMT ? 'COMPLETED' : (arrivedWeightMT > 0 ? 'IN_TRANSIT' : 'PENDING'),
        inspectionStatus: inspInfo.hasInspection || inspInfo.deduction > 0 || inspInfo.moisture > 0 ? 'COMPLETED' : 'PENDING',
        paymentStatus: paidAmount >= effectiveCost && effectiveCost > 0 ? 'PAID' : (paidAmount > 0 ? 'PARTIAL' : 'PENDING'),
        settlementStatus: pendingPayable === 0 ? 'SETTLED' : 'PENDING',
        arrivedWeightMT,
        pendingWeightMT,
        paidAmount,
        pendingPayable,
        claimAmount: deductionAmount > 5000 ? deductionAmount : 0,
        claimSettled: deductionAmount > 5000 && pendingPayable === 0 ? deductionAmount : 0,
        isDelayed,
        isAbnormal: abnormalReasons.length > 0,
        abnormalReasons,
        hasAmadArrival: Boolean(arrivedWeightMT > 0 || (poNo && amadSet.has(poNo.toUpperCase())) || (saudaNo && amadSet.has(saudaNo.toUpperCase()))),
        hasFinalArrival: Boolean((poNo && finalArrivalSet.has(poNo.toUpperCase())) || (saudaNo && finalArrivalSet.has(saudaNo.toUpperCase())) || pendingWeightMT <= 0.01),
        hasInspection: Boolean((poNo && inspectionSet.has(poNo.toUpperCase())) || (saudaNo && inspectionSet.has(saudaNo.toUpperCase())) || inspInfo.hasInspection || inspInfo.deduction > 0 || inspInfo.moisture > 0)
      });
    });

    // Track attached MRs from unifiedPremiums
    const attachedMrKeys = new Set<string>();
    transactionLines.forEach(t => {
      if (t.mrNo) {
        t.mrNo.split(',').forEach(m => {
          const k = m.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
          if (k) attachedMrKeys.add(k);
        });
      }
    });

    // Ensure 100% parity with Dashboard: include all unattached MRs with Premium from the unified engine
    unifiedPremiums.mrsWithPremium.forEach(pm => {
      if (!attachedMrKeys.has(pm.cleanMr)) {
        attachedMrKeys.add(pm.cleanMr);
        const qtyMT = pm.totalQuantityQtl > 0 ? pm.totalQuantityQtl / 10 : 0;
        const rawBrk = String(pm.broker || '').trim();
        const broker = brokerMap.get(rawBrk.toUpperCase()) || rawBrk || 'Direct';
        const rawSupp = String(pm.supplier || pm.partyName || '').trim();
        const supplier = supplyMap.get(rawSupp.toUpperCase()) || rawSupp || 'Unassigned Supplier';
        const date = pm.paymentDate || '2026-09-30';

        transactionLines.push({
          txnId: `TXN-PREM-${String(txnCounter++).padStart(5, '0')}`,
          saudaNo: pm.poNo || pm.mrNo,
          poNo: pm.poNo || pm.mrNo,
          mrNo: pm.mrNo,
          voucherNo: pm.voucherNo,
          date,
          month: getYearMonth(date),
          financialYear: getFinancialYear(date),
          supplier,
          broker,
          agency: '-',
          area: '',
          grade: pm.grades?.map(g => g.grade).filter(Boolean).join(', ') || '-',
          quantityMT: qtyMT,
          purchaseRate: 0,
          baseRate: 0,
          rateVariance: 0,
          rateVariancePct: 0,
          grossPurchaseValue: 0,
          baseRateValue: 0,
          premiumRate: pm.avgPremiumRatePerQtl,
          premiumAmount: pm.totalPremiumAmount,
          premiumPct: 0,
          deductionAmount: 0,
          deductionPct: 0,
          moisturePct: 0,
          gradeDownQty: 0,
          effectiveCost: pm.totalPremiumAmount,
          realizationRate: 0,
          realizationValue: 0,
          grossProfit: 0,
          profitPct: 0,
          profitStatus: 'PROFITABLE',
          saudaStatus: 'COMPLETED',
          arrivalStatus: 'COMPLETED',
          inspectionStatus: 'COMPLETED',
          paymentStatus: 'PAID',
          settlementStatus: 'SETTLED',
          arrivedWeightMT: qtyMT,
          pendingWeightMT: 0,
          paidAmount: pm.totalPremiumAmount,
          pendingPayable: 0,
          claimAmount: 0,
          claimSettled: 0,
          isDelayed: false,
          isAbnormal: false,
          abnormalReasons: [],
          hasAmadArrival: true,
          hasFinalArrival: true,
          hasInspection: true
        });
      }
    });

    // Populate master lists for dropdowns and totals
    const brokerSet = new Set<string>();
    const supplierSet = new Set<string>();
    const agencySet = new Set<string>();
    const areaSet = new Set<string>();
    const gradeSet = new Set<string>();
    const monthSet = new Set<string>();
    const fySet = new Set<string>();
    const saudaSet = new Set<string>();
    const poSet = new Set<string>();

    (brokers || []).forEach((b: any) => {
      const name = String(b.brok_name || b.broker_name || b.name || '').trim();
      if (name && name.toUpperCase() !== 'DIRECT' && name !== '-') brokerSet.add(name);
    });
    (suppliers || []).forEach((s: any) => {
      const name = String(s.supp_name || s.supply_name || s.supplier_name || s.name || '').trim();
      if (name && name !== '-') supplierSet.add(name);
    });
    (agencies || []).forEach((a: any) => {
      const name = String(a.agency_name || a.name || '').trim();
      if (name && !isInvalidAgency(name)) agencySet.add(name);
    });
    (areas || []).forEach((ar: any) => {
      const name = String(ar.area_name || ar.name || '').trim();
      if (name && name !== '-') areaSet.add(name);
    });
    (grades || []).forEach((g: any) => {
      const name = String(g.grade_name || g.name || '').trim();
      if (name && name !== '-') gradeSet.add(name);
    });

    transactionLines.forEach(t => {
      if (t.broker && t.broker !== 'Direct') brokerSet.add(t.broker);
      if (t.supplier && t.supplier !== 'Unassigned Supplier' && t.supplier !== 'Direct Supplier') supplierSet.add(t.supplier);
      if (t.agency && !isInvalidAgency(t.agency)) agencySet.add(t.agency);
      if (t.area && t.area !== '-') areaSet.add(t.area);
      if (t.grade && t.grade !== '-') gradeSet.add(t.grade);
      if (t.month) monthSet.add(t.month);
      if (t.financialYear) fySet.add(t.financialYear);
      if (t.saudaNo) saudaSet.add(t.saudaNo);
      if (t.poNo && t.poNo !== 'Pending P.O.') poSet.add(t.poNo);
    });

    // Build Consolidated ALL PO Summary across Sauda Desk, Sauda Check Point, and Final PO
    const resolveSupplierName = (raw?: string) => {
      const c = String(raw || '').trim();
      if (!c) return 'Unassigned Supplier';
      return supplyMap.get(c.toUpperCase()) || c;
    };
    const resolveBrokerName = (raw?: string) => {
      const c = String(raw || '').trim();
      if (!c) return 'Direct';
      return brokerMap.get(c.toUpperCase()) || c;
    };
    const resolveAgencyName = (raw?: string) => {
      const c = String(raw || '').trim();
      if (!c) return '-';
      return agencyMap.get(c.toUpperCase()) || c;
    };
    const resolveAreaName = (raw?: string) => {
      const c = String(raw || '').trim();
      if (!c || isInvalidArea(c)) return '';
      return areaMap.get(c.toUpperCase()) || c;
    };

    const allPoRecords: AllPoRecord[] = [];
    const seenAllPoKeys = new Set<string>();

    let saudaDeskCount = 0;
    let saudaDeskMT = 0;
    let checkPointCount = 0;
    let checkPointMT = 0;
    let finalPoCount = 0;
    let finalPoMT = 0;

    // 1. Sauda Desk (saudas)
    (saudas || []).forEach((s: any) => {
      const sNo = String(s.sauda_no || '').trim();
      const idKey = `SAUDA_DESK_${s.sauda_id || s.id || sNo}`;
      const dedupeKey = sNo ? `SAUDA_${sNo.toUpperCase()}` : idKey;
      const mt = Number(s.total_wt_in_ton) || 0;
      const rate = Number(s.b_rate) || 0;

      saudaDeskCount++;
      saudaDeskMT += mt;

      if (!seenAllPoKeys.has(dedupeKey)) {
        seenAllPoKeys.add(dedupeKey);
        allPoRecords.push({
          id: idKey,
          sourceSection: 'Sauda Desk',
          poNo: s.po_no || sNo || 'DESK',
          saudaNo: sNo || 'DESK',
          date: normalizeToISODate(s.date || s.b_date || s.created_at),
          month: getYearMonth(s.date || s.b_date || s.created_at),
          financialYear: getFinancialYear(s.date || s.b_date || s.created_at),
          supplier: resolveSupplierName(s.supplier || s.challan_supplier),
          broker: resolveBrokerName(s.broker),
          agency: resolveAgencyName(s.agency),
          area: resolveAreaName(s.area),
          grade: resolveGradeName(s.quality || s.grade, '', sNo, s.po_no),
          quantityMT: mt,
          rate: rate,
          grossValue: (mt * 10) * rate,
          status: s.approval_status || s.status || 'Active',
          raw: s
        });
      }
    });

    // 2. Sauda Check Point (scps)
    (scps || []).forEach((scp: any) => {
      const pNo = String(scp.po_no || scp.contract_po_no || '').trim();
      const sNo = String(scp.sauda_no || '').trim();
      const idKey = `CHECKPOINT_${scp.po_id || scp.id || pNo || sNo}`;
      const dedupeKey = pNo ? `PO_${pNo.toUpperCase()}` : (sNo ? `SAUDA_${sNo.toUpperCase()}` : idKey);
      const mt = Number(scp.total_contract_mt) || 0;
      const rate = Number(scp.b_rate) || 0;

      checkPointCount++;
      checkPointMT += mt;

      if (!seenAllPoKeys.has(dedupeKey)) {
        seenAllPoKeys.add(dedupeKey);
        allPoRecords.push({
          id: idKey,
          sourceSection: 'Sauda Check Point',
          poNo: pNo || sNo || 'CHECKPOINT',
          saudaNo: sNo || pNo || 'CHECKPOINT',
          date: normalizeToISODate(scp.po_date || scp.contract_date || scp.created_at),
          month: getYearMonth(scp.po_date || scp.contract_date || scp.created_at),
          financialYear: getFinancialYear(scp.po_date || scp.contract_date || scp.created_at),
          supplier: resolveSupplierName(scp.supplier || scp.challan_supplier),
          broker: resolveBrokerName(scp.broker),
          agency: resolveAgencyName(scp.agency),
          area: resolveAreaName(scp.area),
          grade: resolveGradeName(scp.grade, '', sNo, pNo),
          quantityMT: mt,
          rate: rate,
          grossValue: (mt * 10) * rate,
          status: scp.status || 'Active',
          raw: scp
        });
      }
    });

    // 3. Final PO (pos)
    (pos || []).forEach((p: any) => {
      const pNo = String(p.po_no || p.contract_po_no || '').trim();
      const sNo = String(p.sauda_no || '').trim();
      const idKey = `FINAL_PO_${p.po_id || p.id || pNo}`;
      const dedupeKey = pNo ? `PO_${pNo.toUpperCase()}` : (sNo ? `SAUDA_${sNo.toUpperCase()}` : idKey);
      const mt = Number(p.total_contract_mt) || 0;
      const rate = Number(p.b_rate) || 0;

      finalPoCount++;
      finalPoMT += mt;

      if (!seenAllPoKeys.has(dedupeKey)) {
        seenAllPoKeys.add(dedupeKey);
        allPoRecords.push({
          id: idKey,
          sourceSection: 'Final PO',
          poNo: pNo || sNo || 'FINAL_PO',
          saudaNo: sNo || pNo || 'FINAL_PO',
          date: normalizeToISODate(p.po_date || p.contract_date || p.created_at),
          month: getYearMonth(p.po_date || p.contract_date || p.created_at),
          financialYear: getFinancialYear(p.po_date || p.contract_date || p.created_at),
          supplier: resolveSupplierName(p.supplier || p.challan_supplier),
          broker: resolveBrokerName(p.broker),
          agency: resolveAgencyName(p.agency),
          area: resolveAreaName(p.area),
          grade: resolveGradeName(p.grade, '', sNo, pNo),
          quantityMT: mt,
          rate: rate,
          grossValue: (mt * 10) * rate,
          status: p.status || 'Active',
          raw: p
        });
      }
    });
    const uniqueAllPoRecords = Array.from(
      allPoRecords.reduce((map, record) => {
        const poNo = String(record.poNo || '').trim().toUpperCase();
        const saudaNo = String(record.saudaNo || '').trim().toUpperCase();

        // Prefer PO number; otherwise use Sauda number; finally use ID.
        const key = poNo && poNo !== 'DESK' &&
                    poNo !== 'CHECKPOINT' &&
                    poNo !== 'FINAL_PO'
          ? `PO_${poNo}`
          : saudaNo && !['DESK', 'CHECKPOINT', 'FINAL_PO'].includes(saudaNo)
            ? `SAUDA_${saudaNo}`
            : `ID_${String(record.id || '').trim().toUpperCase()}`;

        // Keep only the first record for each key.
        if (!map.has(key)) {
          map.set(key, record);
        }

        return map;
      }, new Map<string, (typeof allPoRecords)[number]>()).values()
    );

    const allPoSummary: AllPoSummary = {
      records: uniqueAllPoRecords,
      totalCount: uniqueAllPoRecords.length,
      totalQuantityMT: uniqueAllPoRecords.reduce(
        (sum, r) => sum + (Number(r.quantityMT) || 0), 0
      ),
      totalGrossValue: uniqueAllPoRecords.reduce(
        (sum, r) => sum + (Number(r.grossValue) || 0), 0
      ),
      saudaDeskCount,
      saudaDeskMT,
      checkPointCount,
      checkPointMT,
      finalPoCount,
      finalPoMT
    };

    const result = {
      allTransactions: transactionLines,
      allPoSummary,
      brokerSettlementMap,
      masterLists: {
        brokers: Array.from(brokerSet).sort(),
        suppliers: Array.from(supplierSet).sort(),
        agencies: Array.from(agencySet).sort(),
        areas: Array.from(areaSet).sort(),
        grades: Array.from(gradeSet).sort(),
        months: Array.from(monthSet).sort().reverse(),
        financialYears: Array.from(fySet).sort().reverse(),
        saudas: Array.from(saudaSet).sort(),
        pos: Array.from(poSet).sort()
      }
    };
    cachedReportResult = { data: result, timestamp: Date.now() };
    return result;
  } catch (error) {
    console.error('Failed to load system report data:', error);
    return {
      allTransactions: [],
      allPoSummary: {
        records: [],
        totalCount: 0,
        totalQuantityMT: 0,
        totalGrossValue: 0,
        saudaDeskCount: 0,
        saudaDeskMT: 0,
        checkPointCount: 0,
        checkPointMT: 0,
        finalPoCount: 0,
        finalPoMT: 0
      },
      masterLists: {
        brokers: [],
        suppliers: [],
        agencies: [],
        areas: [],
        grades: [],
        months: [],
        financialYears: [],
        saudas: [],
        pos: []
      },
      brokerSettlementMap: {}
    };
  } finally {
    inFlightReportPromise = null;
  }
  })();
  return inFlightReportPromise;
}
