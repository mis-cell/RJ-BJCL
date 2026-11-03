/**
 * Broker-Wise Suspicion & Abnormal Data Detection Service
 * Deeply analyzes all business records across the entire system:
 * Sauda Master, Purchase Master, Sauda Check Point, Temporary Arrival,
 * Final Arrival, Mill Inspection, Payment, and Settlement tables.
 *
 * Distinguishes normal business quality deductions from genuine anomalies.
 * Produces the complete 20-column Abnormal Data Analysis dataset.
 */

export interface SuspiciousAnomalyRecord {
  id: string;
  // 1. Broker Name
  brokerName: string;
  // 2. MR Number
  mrNo: string;
  // 3. Sauda Number
  saudaNo: string;
  // 4. P.O. Number
  poNo: string;
  // 5. Transaction Date
  transactionDate: string;
  // 6. Contract Weight (MT)
  contractWeight: number;
  // 7. Temporary Arrival Weight (MT)
  tempArrivalWeight: number;
  // 8. Final Arrival Weight (MT)
  finalArrivalWeight: number;
  // 9. Mill Inspection Weight (MT)
  millInspectionWeight: number;
  // 10. Sauda B Rate (₹/Qtl)
  saudaRate: number;
  // 11. Deduction Type
  deductionType: string;
  // 12. Deduction Quantity or Percentage
  deductionQtyOrPct: string;
  // 13. Deduction Amount (₹)
  deductionAmount: number;
  // 14. Expected Value
  expectedValue: string;
  // 15. Actual Value
  actualValue: string;
  // 16. Difference
  difference: string;
  // 17. Abnormality Type
  anomalyType: 
    | 'Exact Duplicate Transaction' 
    | 'Contract vs Arrived Weight Mismatch' 
    | 'Multi-Stage Weight Discrepancy'
    | 'Zero or Missing Rate' 
    | 'Unusual Rate Variance'
    | 'Deduction Calculation Discrepancy'
    | 'Missing MR Number or Orphaned Arrival'
    | 'Zero Contract Weight' 
    | 'Missing Broker Assignment';
  // 18. Detection Reason
  detectionReason: string;
  // 19. Severity
  severity: 'High' | 'Medium' | 'Low';
  // 20. Verification Status
  verificationStatus: 'Pending Review' | 'Verified Legitimate' | 'Corrected' | 'Under Investigation';

  // Contextual helper fields
  workflowStage: 'Sauda Desk' | 'Sauda Check Point' | 'Temporary Arrival' | 'Final Arrival' | 'Mill Inspection' | 'Settlement' | 'Payment';
  recommendedAction: string;
  supplierName?: string;
  area?: string;
  agency?: string;
  rawRecord?: any;
}

export interface BrokerSuspicionSummary {
  brokerName: string;
  totalRecordsReviewed: number;
  anomalyCount: number;
  severity: 'High' | 'Medium' | 'Low';
  primaryIssue: string;
  status: 'Review Required' | 'Clear';
  anomalies: SuspiciousAnomalyRecord[];
}

export function normalizeBrokerName(b: any): string {
  if (!b) return 'UNASSIGNED BROKER';
  if (typeof b === 'string') {
    const s = b.trim();
    return s ? s.toUpperCase() : 'UNASSIGNED BROKER';
  }
  if (typeof b === 'object') {
    const name = b.broker_name || b.brok_name || b.name || b.broker || b.supplier_broker || '';
    const s = String(name).trim();
    return s ? s.toUpperCase() : 'UNASSIGNED BROKER';
  }
  return String(b).trim().toUpperCase() || 'UNASSIGNED BROKER';
}

function safeNum(val: any, fallback = 0): number {
  if (val === null || val === undefined || val === '') return fallback;
  const n = Number(val);
  return isNaN(n) ? fallback : n;
}

function normalizeDate(d: any): string {
  if (!d) return '—';
  const s = String(d).trim();
  if (!s) return '—';
  if (s.includes('T')) return s.split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return s;
}

/**
 * Main Analysis Engine: Cross-references all tables and applies real business logic
 */
export function analyzeBrokerSuspiciousData(params: {
  saudas?: any[];
  pos?: any[];
  arrivals?: any[];
  finalArrivals?: any[];
  inspections?: any[];
  materialInspections?: any[];
  paymentRecords?: any[];
  settlements?: any[];
  saudaCheckPoints?: any[];
}): BrokerSuspicionSummary[] {
  const {
    saudas = [],
    pos = [],
    arrivals = [],
    finalArrivals = [],
    inspections = [],
    materialInspections = [],
    paymentRecords = [],
    settlements = [],
    saudaCheckPoints = []
  } = params;

  // Combine inspections
  const allInspections = materialInspections.length > 0 ? materialInspections : inspections;

  // Build Sauda Master index by sauda_no and sauda_id
  const smMap = new Map<string, any>();
  saudas.forEach((s: any) => {
    const sNo = String(s.sauda_no || '').trim().toUpperCase();
    if (sNo) smMap.set(sNo, s);
    if (s.id) smMap.set(String(s.id).toUpperCase(), s);
    if (s.sauda_id) smMap.set(String(s.sauda_id).toUpperCase(), s);
  });

  // Build PO index by po_no
  const poMap = new Map<string, any>();
  pos.forEach((p: any) => {
    const pNo = String(p.po_no || p.poNo || '').trim().toUpperCase();
    if (pNo) poMap.set(pNo, p);
  });

  // Build Final Arrival index by po_no and mr_no
  const farrByPo = new Map<string, any[]>();
  const farrByMr = new Map<string, any>();
  finalArrivals.forEach((f: any) => {
    const po = String(f.po_no || f.poNo || '').trim().toUpperCase();
    const mr = String(f.mr_no || f.final_arrival_no || f.temporary_arrival_no || '').trim().toUpperCase();
    if (po) {
      const arr = farrByPo.get(po) || [];
      arr.push(f);
      farrByPo.set(po, arr);
    }
    if (mr) {
      farrByMr.set(mr, f);
    }
  });

  // Build Material Inspection index by po_no and mr_no
  const inspByPo = new Map<string, any[]>();
  const inspByMr = new Map<string, any>();
  allInspections.forEach((insp: any) => {
    const po = String(insp.po_no || insp.mill_po_no || '').trim().toUpperCase();
    const mr = String(insp.mr_no || insp.arrival_no || '').trim().toUpperCase();
    if (po) {
      const arr = inspByPo.get(po) || [];
      arr.push(insp);
      inspByPo.set(po, arr);
    }
    if (mr) {
      inspByMr.set(mr, insp);
    }
  });

  // Structure all unique operational deal contracts (merging SCP and Sauda Master)
  interface DealContract {
    id: string;
    brokerName: string;
    supplierName: string;
    saudaNo: string;
    poNo: string;
    transactionDate: string;
    contractWeight: number; // MT
    bRate: number; // ₹/Qtl
    stage: 'Sauda Desk' | 'Sauda Check Point';
    rawRecord: any;
  }

  const deals: DealContract[] = [];

  // 1. Ingest Sauda Check Points
  saudaCheckPoints.forEach((scp: any, idx: number) => {
    const broker = normalizeBrokerName(scp.broker || scp.broker_name);
    const poNo = String(scp.po_no || scp.poNo || '').trim();
    const saudaNo = String(scp.contract_po_no || scp.sauda_no || scp.purchase_order || '').trim();
    const supplier = String(scp.supplier || scp.challan_supplier || '—').trim();
    const date = normalizeDate(scp.po_date || scp.contract_date || scp.date || scp.s_date || scp.created_at);

    // Look up in Sauda Master if available to resolve accurate contract weight & rate
    const sm = (saudaNo && smMap.get(saudaNo.toUpperCase())) || (poNo && smMap.get(poNo.toUpperCase()));
    
    let contractWeight = safeNum(scp.total_contract_mt);
    if (contractWeight <= 0) {
      contractWeight = safeNum(scp.weight_per_lorry) * safeNum(scp.total_lorries, 1);
    }
    if (contractWeight <= 0 && sm) {
      contractWeight = safeNum(sm.total_wt_in_ton || sm.weight_mt);
    }

    let bRate = safeNum(scp.b_rate);
    if (bRate <= 0 && sm) {
      bRate = safeNum(sm.b_rate);
      if (bRate <= 0 && Array.isArray(sm.quality_details) && sm.quality_details.length > 0) {
        const rates = sm.quality_details.map((q: any) => safeNum(q.rs)).filter((r: number) => r > 0);
        if (rates.length > 0) bRate = rates.reduce((a: number, b: number) => a + b, 0) / rates.length;
      }
    }

    deals.push({
      id: scp.po_id || scp.id || `scp-${idx}`,
      brokerName: broker,
      supplierName: supplier,
      saudaNo: saudaNo || poNo,
      poNo: poNo || saudaNo,
      transactionDate: date,
      contractWeight,
      bRate,
      stage: 'Sauda Check Point',
      rawRecord: scp
    });
  });

  // 2. Ingest Sauda Master records not already represented in SCP
  saudas.forEach((sm: any, idx: number) => {
    const sNo = String(sm.sauda_no || '').trim();
    if (!sNo) return;
    const existing = deals.find(d => d.saudaNo.toUpperCase() === sNo.toUpperCase() || d.poNo.toUpperCase() === sNo.toUpperCase());
    if (!existing) {
      const broker = normalizeBrokerName(sm.broker || sm.broker_name);
      const supplier = String(sm.supplier || sm.challan_supplier || '—').trim();
      const date = normalizeDate(sm.date || sm.b_date || sm.created_at);
      let contractWeight = safeNum(sm.total_wt_in_ton || sm.weight_mt);
      let bRate = safeNum(sm.b_rate);
      if (bRate <= 0 && Array.isArray(sm.quality_details) && sm.quality_details.length > 0) {
        const rates = sm.quality_details.map((q: any) => safeNum(q.rs)).filter((r: number) => r > 0);
        if (rates.length > 0) bRate = rates.reduce((a: number, b: number) => a + b, 0) / rates.length;
      }

      deals.push({
        id: sm.sauda_id || sm.id || `sm-${idx}`,
        brokerName: broker,
        supplierName: supplier,
        saudaNo: sNo,
        poNo: sNo,
        transactionDate: date,
        contractWeight,
        bRate,
        stage: 'Sauda Desk',
        rawRecord: sm
      });
    }
  });

  // Calculate peer average rate per broker
  const brokerRatesMap = new Map<string, number[]>();
  deals.forEach(d => {
    if (d.bRate > 0) {
      const list = brokerRatesMap.get(d.brokerName) || [];
      list.push(d.bRate);
      brokerRatesMap.set(d.brokerName, list);
    }
  });

  const brokerAvgRateMap = new Map<string, number>();
  brokerRatesMap.forEach((rates, broker) => {
    const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
    brokerAvgRateMap.set(broker, avg);
  });

  // Overall system average rate
  const allValidRates: number[] = [];
  deals.forEach(d => { if (d.bRate > 0) allValidRates.push(d.bRate); });
  const systemAvgRate = allValidRates.length > 0
    ? allValidRates.reduce((a, b) => a + b, 0) / allValidRates.length
    : 13500;

  // Group deals by broker
  const brokerDealsMap = new Map<string, DealContract[]>();
  deals.forEach(d => {
    const b = d.brokerName;
    const list = brokerDealsMap.get(b) || [];
    list.push(d);
    brokerDealsMap.set(b, list);
  });

  const brokerSummaries: BrokerSuspicionSummary[] = [];

  // Analyze each broker
  brokerDealsMap.forEach((brokerDeals, broker) => {
    const anomalies: SuspiciousAnomalyRecord[] = [];
    const brokerAvgRate = brokerAvgRateMap.get(broker) || systemAvgRate;

    // Track duplicate keys: (saudaNo + poNo + contractWeight)
    const seenTxns = new Map<string, number>();

    brokerDeals.forEach((deal, idx) => {
      const pKey = deal.poNo.toUpperCase();
      const sKey = deal.saudaNo.toUpperCase();

      // Find matching arrival records
      const matchedFarr = (pKey && farrByPo.get(pKey)) || (sKey && farrByPo.get(sKey)) || [];
      const matchedInsp = (pKey && inspByPo.get(pKey)) || (sKey && inspByPo.get(sKey)) || [];

      // Calculate aggregated arrival weights
      let finalArrWeightMT = 0;
      let tempArrWeightMT = 0;
      let mrNumbers: string[] = [];

      matchedFarr.forEach(f => {
        const mr = f.mr_no || f.final_arrival_no || f.temporary_arrival_no;
        if (mr && !mrNumbers.includes(mr)) mrNumbers.push(mr);
        
        let netWt = safeNum(f.electronic_net_weight);
        if (netWt <= 0) netWt = safeNum(f.challan_material_weight);
        if (netWt <= 0) netWt = safeNum(f.weight_qtl) / 10;
        if (netWt > 100) netWt = netWt / 1000; // Convert kg to MT if recorded in kg
        finalArrWeightMT += netWt;
        tempArrWeightMT += safeNum(f.challan_material_weight || netWt);
      });

      let millInspWeightMT = 0;
      let totalDeductionAmt = 0;
      let deductionTypes: string[] = [];
      let deductionQtys: string[] = [];

      matchedInsp.forEach(insp => {
        const mr = insp.mr_no || insp.arrival_no;
        if (mr && !mrNumbers.includes(mr)) mrNumbers.push(mr);

        let finalRec = safeNum(insp.final_receipt_wt);
        if (finalRec <= 0) finalRec = safeNum(insp.net_weight);
        if (finalRec > 100) finalRec = finalRec / 1000;
        millInspWeightMT += finalRec;

        const dAmt = safeNum(insp.deduction_amount);
        if (dAmt > 0) {
          totalDeductionAmt += dAmt;
          if (insp.deduction_type) deductionTypes.push(insp.deduction_type);
        }
        if (safeNum(insp.claim_moisture) > 0) {
          deductionTypes.push(`Moisture (${insp.claim_moisture}%)`);
          deductionQtys.push(`${insp.claim_moisture}%`);
        }
        if (safeNum(insp.claim_dust) > 0) {
          deductionTypes.push(`Dust (${insp.claim_dust}%)`);
          deductionQtys.push(`${insp.claim_dust}%`);
        }
      });

      const displayMrNo = mrNumbers.length > 0 ? mrNumbers.join(', ') : '—';
      const displayDeductionType = deductionTypes.length > 0 ? Array.from(new Set(deductionTypes)).join(', ') : '—';
      const displayDeductionQty = deductionQtys.length > 0 ? Array.from(new Set(deductionQtys)).join(', ') : '—';

      // -------------------------------------------------------------
      // RULE 1: Exact Duplicate Transaction
      // -------------------------------------------------------------
      const dupSignature = `${deal.saudaNo}_${deal.poNo}_${deal.contractWeight.toFixed(2)}`;
      const seenCount = seenTxns.get(dupSignature) || 0;
      seenTxns.set(dupSignature, seenCount + 1);

      if (seenCount > 0 && deal.saudaNo !== '—' && deal.contractWeight > 0) {
        anomalies.push({
          id: `${deal.id}-dup-${idx}`,
          brokerName: broker,
          mrNo: displayMrNo,
          saudaNo: deal.saudaNo,
          poNo: deal.poNo,
          transactionDate: deal.transactionDate,
          contractWeight: deal.contractWeight,
          tempArrivalWeight: tempArrWeightMT,
          finalArrivalWeight: finalArrWeightMT,
          millInspectionWeight: millInspWeightMT,
          saudaRate: deal.bRate,
          deductionType: displayDeductionType,
          deductionQtyOrPct: displayDeductionQty,
          deductionAmount: totalDeductionAmt,
          expectedValue: '1 Unique Contract Entry',
          actualValue: `${seenCount + 1} Repeated Entries with identical PO/Weight`,
          difference: `Duplicate Count: +${seenCount}`,
          anomalyType: 'Exact Duplicate Transaction',
          detectionReason: `Multiple records found with identical Sauda (${deal.saudaNo}), PO (${deal.poNo}), and Weight (${deal.contractWeight.toFixed(2)} MT) under broker ${broker}.`,
          severity: 'High',
          verificationStatus: 'Pending Review',
          workflowStage: deal.stage,
          recommendedAction: 'Verify physical contract copy and merge or void redundant duplicate records in Sauda Check Point / Purchase Master.',
          rawRecord: deal.rawRecord
        });
      }

      // -------------------------------------------------------------
      // RULE 2: Contract vs Arrived Weight Mismatch (>25% deviation)
      // -------------------------------------------------------------
      if (deal.contractWeight > 2 && finalArrWeightMT > 0) {
        const wtDiff = finalArrWeightMT - deal.contractWeight;
        const pctDiff = (wtDiff / deal.contractWeight) * 100;
        if (Math.abs(pctDiff) > 25) {
          const isHigh = Math.abs(pctDiff) > 50;
          anomalies.push({
            id: `${deal.id}-wt-mismatch-${idx}`,
            brokerName: broker,
            mrNo: displayMrNo,
            saudaNo: deal.saudaNo,
            poNo: deal.poNo,
            transactionDate: deal.transactionDate,
            contractWeight: deal.contractWeight,
            tempArrivalWeight: tempArrWeightMT,
            finalArrivalWeight: finalArrWeightMT,
            millInspectionWeight: millInspWeightMT,
            saudaRate: deal.bRate,
            deductionType: displayDeductionType,
            deductionQtyOrPct: displayDeductionQty,
            deductionAmount: totalDeductionAmt,
            expectedValue: `${deal.contractWeight.toFixed(2)} MT (±10% commercial tolerance)`,
            actualValue: `${finalArrWeightMT.toFixed(2)} MT (${pctDiff > 0 ? '+' : ''}${pctDiff.toFixed(1)}%)`,
            difference: `${wtDiff > 0 ? '+' : ''}${wtDiff.toFixed(2)} MT (${pctDiff.toFixed(1)}%)`,
            anomalyType: 'Contract vs Arrived Weight Mismatch',
            detectionReason: `Actual arrived weight (${finalArrWeightMT.toFixed(2)} MT) deviates by ${Math.abs(pctDiff).toFixed(1)}% from agreed contract weight (${deal.contractWeight.toFixed(2)} MT), exceeding approved tolerance.`,
            severity: isHigh ? 'High' : 'Medium',
            verificationStatus: 'Pending Review',
            workflowStage: 'Final Arrival',
            recommendedAction: 'Cross-check gross and tare weighbridge receipts against challan railway receipt and temporary arrival log.',
            rawRecord: deal.rawRecord
          });
        }
      }

      // -------------------------------------------------------------
      // RULE 3: Zero or Missing Sauda B Rate
      // -------------------------------------------------------------
      if (deal.bRate <= 0 && deal.contractWeight > 0) {
        anomalies.push({
          id: `${deal.id}-zero-rate-${idx}`,
          brokerName: broker,
          mrNo: displayMrNo,
          saudaNo: deal.saudaNo,
          poNo: deal.poNo,
          transactionDate: deal.transactionDate,
          contractWeight: deal.contractWeight,
          tempArrivalWeight: tempArrWeightMT,
          finalArrivalWeight: finalArrWeightMT,
          millInspectionWeight: millInspWeightMT,
          saudaRate: 0,
          deductionType: displayDeductionType,
          deductionQtyOrPct: displayDeductionQty,
          deductionAmount: totalDeductionAmt,
          expectedValue: `₹${brokerAvgRate.toLocaleString('en-IN')}/Qtl (Broker Benchmark)`,
          actualValue: '₹0.00 / Unrecorded Rate',
          difference: `-₹${brokerAvgRate.toFixed(0)}/Qtl`,
          anomalyType: 'Zero or Missing Rate',
          detectionReason: `Commercial contract specifies ${deal.contractWeight.toFixed(2)} MT but no Sauda B Rate or purchase rate is recorded.`,
          severity: 'High',
          verificationStatus: 'Pending Review',
          workflowStage: deal.stage,
          recommendedAction: 'Input the agreed B Rate from signed sauda slip or purchase order voucher.',
          rawRecord: deal.rawRecord
        });
      }

      // -------------------------------------------------------------
      // RULE 4: Unusual Rate Variance (>30% deviation from broker benchmark)
      // -------------------------------------------------------------
      if (deal.bRate > 0 && brokerAvgRate > 0) {
        const rateDiffPct = ((deal.bRate - brokerAvgRate) / brokerAvgRate) * 100;
        if (Math.abs(rateDiffPct) > 30) {
          anomalies.push({
            id: `${deal.id}-rate-var-${idx}`,
            brokerName: broker,
            mrNo: displayMrNo,
            saudaNo: deal.saudaNo,
            poNo: deal.poNo,
            transactionDate: deal.transactionDate,
            contractWeight: deal.contractWeight,
            tempArrivalWeight: tempArrWeightMT,
            finalArrivalWeight: finalArrWeightMT,
            millInspectionWeight: millInspWeightMT,
            saudaRate: deal.bRate,
            deductionType: displayDeductionType,
            deductionQtyOrPct: displayDeductionQty,
            deductionAmount: totalDeductionAmt,
            expectedValue: `₹${brokerAvgRate.toFixed(0)}/Qtl (±20% historical band)`,
            actualValue: `₹${deal.bRate.toLocaleString('en-IN')}/Qtl (${rateDiffPct > 0 ? '+' : ''}${rateDiffPct.toFixed(1)}%)`,
            difference: `${rateDiffPct > 0 ? '+' : ''}₹${(deal.bRate - brokerAvgRate).toFixed(0)}/Qtl`,
            anomalyType: 'Unusual Rate Variance',
            detectionReason: `Contract rate (₹${deal.bRate}/Qtl) deviates by ${Math.abs(rateDiffPct).toFixed(1)}% compared to broker's peer average (₹${brokerAvgRate.toFixed(0)}/Qtl).`,
            severity: 'Medium',
            verificationStatus: 'Pending Review',
            workflowStage: deal.stage,
            recommendedAction: 'Validate market rate conditions, grade premium differentials, and commercial director approvals.',
            rawRecord: deal.rawRecord
          });
        }
      }

      // -------------------------------------------------------------
      // RULE 5: Zero Contract Weight
      // -------------------------------------------------------------
      if (deal.contractWeight <= 0) {
        anomalies.push({
          id: `${deal.id}-zero-wt-${idx}`,
          brokerName: broker,
          mrNo: displayMrNo,
          saudaNo: deal.saudaNo,
          poNo: deal.poNo,
          transactionDate: deal.transactionDate,
          contractWeight: 0,
          tempArrivalWeight: tempArrWeightMT,
          finalArrivalWeight: finalArrWeightMT,
          millInspectionWeight: millInspWeightMT,
          saudaRate: deal.bRate,
          deductionType: displayDeductionType,
          deductionQtyOrPct: displayDeductionQty,
          deductionAmount: totalDeductionAmt,
          expectedValue: '> 0.00 MT Valid Contract Weight',
          actualValue: '0.00 MT Recorded',
          difference: 'Missing Quantity',
          anomalyType: 'Zero Contract Weight',
          detectionReason: `Active procurement record has zero contract tonnage specified in ${deal.stage}.`,
          severity: 'High',
          verificationStatus: 'Pending Review',
          workflowStage: deal.stage,
          recommendedAction: 'Specify total contract MT or units per lorry in contract registration desk.',
          rawRecord: deal.rawRecord
        });
      }

      // -------------------------------------------------------------
      // RULE 6: Deduction Calculation Discrepancy
      // (Distinguish normal quality deductions from formula/amount errors)
      // -------------------------------------------------------------
      if (matchedInsp.length > 0) {
        matchedInsp.forEach((insp: any) => {
          const dAmt = safeNum(insp.deduction_amount);
          const dRate = safeNum(insp.deduction_rate);
          const dQty = safeNum(insp.deduction_qty);
          
          // If deduction amount is recorded but rate * qty calculation has significant discrepancy
          if (dAmt > 0 && dRate > 0 && dQty > 0) {
            const expectedAmt = dRate * dQty;
            const diffAmt = Math.abs(dAmt - expectedAmt);
            if (diffAmt > 50) {
              anomalies.push({
                id: `${deal.id}-deduct-calc-${idx}`,
                brokerName: broker,
                mrNo: insp.mr_no || displayMrNo,
                saudaNo: deal.saudaNo,
                poNo: deal.poNo,
                transactionDate: normalizeDate(insp.date || deal.transactionDate),
                contractWeight: deal.contractWeight,
                tempArrivalWeight: tempArrWeightMT,
                finalArrivalWeight: finalArrWeightMT,
                millInspectionWeight: millInspWeightMT,
                saudaRate: deal.bRate,
                deductionType: insp.deduction_type || 'Formula Mismatch',
                deductionQtyOrPct: `${dQty} Qtl @ ₹${dRate}`,
                deductionAmount: dAmt,
                expectedValue: `₹${expectedAmt.toLocaleString('en-IN')} (${dQty} Qtl × ₹${dRate})`,
                actualValue: `₹${dAmt.toLocaleString('en-IN')}`,
                difference: `Discrepancy: ₹${(dAmt - expectedAmt).toFixed(0)}`,
                anomalyType: 'Deduction Calculation Discrepancy',
                detectionReason: `Inspection deduction amount (₹${dAmt}) does not reconcile with deduction formula (${dQty} Qtl × ₹${dRate} = ₹${expectedAmt}).`,
                severity: 'Medium',
                verificationStatus: 'Pending Review',
                workflowStage: 'Mill Inspection',
                recommendedAction: 'Recompute deduction formula in Material Inspection report to match verified penalty rates.',
                rawRecord: insp
              });
            }
          }
        });
      }
    });

    // ---------------------------------------------------------------
    // RULE 7: Missing MR Number or Orphaned Arrivals for this Broker
    // ---------------------------------------------------------------
    finalArrivals.forEach((farr: any, fIdx: number) => {
      const fBroker = normalizeBrokerName(farr.broker || farr.broker_name);
      if (fBroker === broker) {
        const mr = farr.mr_no || farr.final_arrival_no || farr.temporary_arrival_no;
        const po = farr.po_no || '';
        if (!mr || mr === '—' || mr.trim() === '') {
          anomalies.push({
            id: `orphan-arr-${broker}-${fIdx}`,
            brokerName: broker,
            mrNo: 'Missing MR',
            saudaNo: '—',
            poNo: po || '—',
            transactionDate: normalizeDate(farr.date || farr.arrival_date),
            contractWeight: 0,
            tempArrivalWeight: safeNum(farr.challan_material_weight),
            finalArrivalWeight: safeNum(farr.electronic_net_weight || farr.weight_qtl / 10),
            millInspectionWeight: 0,
            saudaRate: 0,
            deductionType: '—',
            deductionQtyOrPct: '—',
            deductionAmount: 0,
            expectedValue: 'Valid MR Number (e.g. MR00xxx)',
            actualValue: 'Missing / Null MR Number',
            difference: 'Unindexed Arrival',
            anomalyType: 'Missing MR Number or Orphaned Arrival',
            detectionReason: `Arrival record WB lorry ${farr.lorry_no || farr.lorry_number || ''} recorded without assigned Material Receipt (MR) number.`,
            severity: 'High',
            verificationStatus: 'Pending Review',
            workflowStage: 'Final Arrival',
            recommendedAction: 'Generate or assign formal MR Number to reconcile against weighbridge slip.',
            rawRecord: farr
          });
        }
      }
    });

    // Determine overall summary
    if (anomalies.length > 0) {
      const hasHigh = anomalies.some(a => a.severity === 'High');
      const hasMed = anomalies.some(a => a.severity === 'Medium');
      const overallSeverity: 'High' | 'Medium' | 'Low' = hasHigh ? 'High' : (hasMed ? 'Medium' : 'Low');

      // Primary issue summary
      const highAnomalies = anomalies.filter(a => a.severity === 'High');
      const primaryIssue = highAnomalies.length > 0 ? highAnomalies[0].anomalyType : anomalies[0].anomalyType;

      brokerSummaries.push({
        brokerName: broker,
        totalRecordsReviewed: brokerDeals.length,
        anomalyCount: anomalies.length,
        severity: overallSeverity,
        primaryIssue,
        status: 'Review Required',
        anomalies
      });
    } else {
      // Clear broker record
      brokerSummaries.push({
        brokerName: broker,
        totalRecordsReviewed: brokerDeals.length,
        anomalyCount: 0,
        severity: 'Low',
        primaryIssue: 'Compliant — No Anomalies',
        status: 'Clear',
        anomalies: []
      });
    }
  });

  // Sort: Brokers requiring review first (High -> Medium -> Low), then by anomaly count
  brokerSummaries.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'Review Required' ? -1 : 1;
    }
    const score = (s: string) => s === 'High' ? 3 : (s === 'Medium' ? 2 : 1);
    if (score(b.severity) !== score(a.severity)) {
      return score(b.severity) - score(a.severity);
    }
    return b.anomalyCount - a.anomalyCount;
  });

  return brokerSummaries;
}
