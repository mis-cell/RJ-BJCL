import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import assert from 'assert';
import { comparePoInspection } from '../src/lib/poMatch';


/**
 * Focused Regression Check for PO: BJCL/2026-2027/0532
 * Verifies:
 * 1. Source rows in complete_local_data.sql.gz for MR00999, MR01037, MR01042 match the reference weights.
 * 2. Multi-lorry settlement calculation counts each linked MR once, uses Net weight (final_receipt_wt)
 *    for MR00999 (12,662 kg) and MR01037 (13,593 kg), and Gross weight (challan_gross_wt) for chronologically
 *    last MR01042 (11,880 kg) => Total Claim = 38,135 kg (38.135 MT).
 * 3. Against 34,500 kg (34.50 MT) contract, excess = 3,635 kg (3.635 MT), 3% tolerance is NOT applied to excess (0 kg),
 *    and at ₹600 rate difference, deduction = ₹2,181,000.
 * 4. Reopening / recalculating the same settlement repeatedly produces identical results without accumulation.
 * 5. Even if MR00999 top-level final_receipt_wt was corrupted (e.g. 50.678, 278.774, 582.902 MT) or duplicate
 *    MR / cross-MR detail rows are passed in, the calculation recovers the true 12,662 kg net weight for MR00999.
 */

interface InspectionSourceRow {
  mr_no: string;
  po_no: string;
  arrival_date?: string;
  mr_date?: string;
  challan_gross_wt?: number | string | null;
  final_receipt_wt?: number | string | null;
  grid_details?: any;
}

function extractMrSeq(mrStr: string): number {
  const matches = String(mrStr || '').match(/\d+/g);
  if (!matches || matches.length === 0) return 0;
  return parseInt(matches[matches.length - 1], 10) || 0;
}

function canonicalMrKey(mrStr: string): string {
  const seq = extractMrSeq(mrStr);
  if (seq > 0) return `MR_${seq}`;
  return String(mrStr || '').trim().toUpperCase();
}

function toMtFromRawWt(val: any): number {
  const n = Number(val || 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n >= 500) return n / 1000;
  if (n > 50 && n < 500) return n / 10;
  return n;
}

export function calculatePoSettlement(params: {
  poNo: string;
  contractMt: number;
  saudaRateQtl: number;
  lastMrSattaRateQtl: number;
  inspections: InspectionSourceRow[];
  inspectionDetails?: any[];
}) {
  const { poNo, contractMt, saudaRateQtl, lastMrSattaRateQtl, inspections, inspectionDetails = [] } = params;
  const clean = (s: any) => String(s || '').trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const targetPo = clean(poNo);

  const matchingInsps = inspections.filter((insp) => clean(insp.po_no) === targetPo);

  const uniqueMrMap = new Map<string, { mrNo: string; rawDate: string; source: InspectionSourceRow }>();
  matchingInsps.forEach((insp) => {
    const num = String(insp.mr_no || '').trim();
    if (!num) return;
    const rawD = String(insp.arrival_date || insp.mr_date || '').trim();
    const key = canonicalMrKey(num);
    const existing = uniqueMrMap.get(key);
    const hasGrid = Boolean(insp.grid_details);
    const existingHasGrid = Boolean(existing?.source?.grid_details);
    const preferNew =
      !existing ||
      (!existingHasGrid && hasGrid) ||
      (!existing.rawDate && Boolean(rawD)) ||
      (num.length > existing.mrNo.length && hasGrid === existingHasGrid);
    if (preferNew) {
      uniqueMrMap.set(key, { mrNo: num, rawDate: rawD, source: insp });
    }
  });

  const mrEntries = Array.from(uniqueMrMap.values()).sort((a, b) => {
    const seqA = extractMrSeq(a.mrNo);
    const seqB = extractMrSeq(b.mrNo);
    if (seqA > 0 && seqB > 0 && seqA !== seqB) return seqA - seqB;
    return a.rawDate.localeCompare(b.rawDate);
  });

  const isMultipleLorry = mrEntries.length > 1;
  let sumClaimMt = 0;

  const mrBreakdown = mrEntries.map((mrEntry, mrIdx) => {
    const mrKey = canonicalMrKey(mrEntry.mrNo);
    const isLastLorry = mrIdx === mrEntries.length - 1;
    const src = mrEntry.source;

    let embeddedGrid: any[] = [];
    if (src?.grid_details) {
      if (Array.isArray(src.grid_details)) embeddedGrid = src.grid_details;
      else if (typeof src.grid_details === 'string') {
        try {
          const parsed = JSON.parse(src.grid_details);
          if (Array.isArray(parsed)) embeddedGrid = parsed;
        } catch (_e) {}
      }
    }

    const matchingDetails = inspectionDetails.filter((d) => {
      const dMr = String(d.mr_no || '').trim();
      return dMr && canonicalMrKey(dMr) === mrKey;
    });

    const rawDetailItems = embeddedGrid.length > 0 ? embeddedGrid : matchingDetails;
    const seenDetailKeys = new Set<string>();
    const detailItems: any[] = [];

    rawDetailItems.forEach((d: any, idx: number) => {
      if (!d || typeof d !== 'object') return;
      const itemMr = String(d.mr_no || '').trim();
      if (itemMr && canonicalMrKey(itemMr) !== mrKey) return;
      const gRaw = Number(d.challan_gross_wt ?? d.receipt_gross_wt ?? 0);
      const nRaw = Number(d.final_receipt_wt ?? d.reduced_weight ?? 0);
      if (gRaw <= 0 && nRaw <= 0) return;
      const srl =
        d.srl_no !== undefined && d.srl_no !== null && String(d.srl_no).trim() !== ''
          ? `SRL_${String(d.srl_no).trim()}`
          : `ROW_${idx}_${gRaw}_${nRaw}`;
      if (!seenDetailKeys.has(srl)) {
        seenDetailKeys.add(srl);
        detailItems.push(d);
      }
    });

    let mrGrossMt = toMtFromRawWt(src?.challan_gross_wt);
    let mrNetMt = toMtFromRawWt(src?.final_receipt_wt);

    if (detailItems.length > 0) {
      let sumDetailGrossMt = 0;
      let sumDetailNetMt = 0;
      detailItems.forEach((d: any) => {
        const gWt = toMtFromRawWt(d.challan_gross_wt ?? d.receipt_gross_wt ?? 0);
        let nWt = toMtFromRawWt(d.final_receipt_wt ?? d.reduced_weight ?? 0);
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
        (mrNetMt <= 0 || (mrGrossMt > 0 && mrNetMt > mrGrossMt + 0.001) || Math.abs(mrNetMt - roundedDetailNet) > 0.05)
      ) {
        mrNetMt = roundedDetailNet;
      }
    }

    if (mrGrossMt > 0 && mrNetMt > mrGrossMt + 0.001) {
      mrNetMt = mrGrossMt;
    }

    mrGrossMt = Math.round(mrGrossMt * 1000) / 1000;
    mrNetMt = Math.round(mrNetMt * 1000) / 1000;

    const finalClaimMt = isMultipleLorry && isLastLorry ? mrGrossMt : mrNetMt;
    sumClaimMt += finalClaimMt;

    return {
      mrNo: mrEntry.mrNo,
      isLastLorry,
      grossWtKg: Math.round(mrGrossMt * 1000),
      netWtKg: Math.round(mrNetMt * 1000),
      claimWtKg: Math.round(finalClaimMt * 1000),
      basis: isMultipleLorry && isLastLorry ? 'Gross (Last Lorry)' : 'Net',
    };
  });

  const totalClaimMt = Math.round(sumClaimMt * 1000) / 1000;
  const totalClaimKg = Math.round(totalClaimMt * 1000);
  const contractKg = Math.round(contractMt * 1000);
  const grossVarianceMt = Math.round((contractMt - totalClaimMt) * 1000) / 1000;
  const isGrossExcess = grossVarianceMt < -0.0001;
  const excessMt = isGrossExcess ? Math.abs(grossVarianceMt) : 0;
  const excessKg = Math.round(excessMt * 1000);

  // Policy: 3% tolerance does NOT apply to excess weight
  const exemptionKg = isGrossExcess ? 0 : Math.round(contractMt * 0.03 * 1000);
  const finalDeductibleExcessKg = isGrossExcess ? excessKg : 0;
  const rateDifference = isGrossExcess ? Math.max(0, saudaRateQtl - lastMrSattaRateQtl) : 0;
  const totalDeductionAmount = isGrossExcess ? Math.round(finalDeductibleExcessKg * rateDifference * 100) / 100 : 0;

  return {
    mrBreakdown,
    totalClaimMt,
    totalClaimKg,
    contractKg,
    excessMt,
    excessKg,
    exemptionKg,
    finalDeductibleExcessKg,
    rateDifference,
    totalDeductionAmount,
  };
}

function loadActualSourceRowsFromDump(): { matInspRows: InspectionSourceRow[]; allTableRows: InspectionSourceRow[] } {
  const gzPath = path.resolve(process.cwd(), 'complete_local_data.sql.gz');
  const sql = zlib.gunzipSync(fs.readFileSync(gzPath)).toString('utf8');

  const parseSection = (text: string): InspectionSourceRow[] => {
    const lines = text
      .split('\n')
      .filter((l) => l.includes('BJCL/2026-2027/0532') && (l.includes('MR00999') || l.includes('MR01037') || l.includes('MR01042')));
    const out: InspectionSourceRow[] = [];
    for (const line of lines) {
      const mrMatch = line.match(/'(MR0\d+)'/);
      const dateMatch = line.match(/'(2026-09-\d{2})'/);
      const jsonMatch = line.match(/(\[\{"srl_no":.*?\}\])/);
      if (mrMatch && jsonMatch) {
        const grid = JSON.parse(jsonMatch[1]);
        out.push({
          mr_no: mrMatch[1],
          po_no: 'BJCL/2026-2027/0532',
          arrival_date: dateMatch ? dateMatch[1] : '',
          challan_gross_wt: null,
          final_receipt_wt: null,
          grid_details: grid,
        });
      }
    }
    return out;
  };

  const miStart = sql.indexOf('-- Table: "material_inspection"');
  const miEnd = sql.indexOf('-- Table: "', miStart + 31);
  const miSection = miStart !== -1 ? sql.slice(miStart, miEnd !== -1 ? miEnd : undefined) : sql;

  return {
    matInspRows: parseSection(miSection),
    allTableRows: parseSection(sql),
  };
}

function runRegressionSuite() {
  console.log('=== Running PO BJCL/2026-2027/0532 Settlement Regression Check ===');

  // 1. Verify actual source rows in complete_local_data.sql.gz
  const { matInspRows: sourceRows, allTableRows } = loadActualSourceRowsFromDump();
  assert.strictEqual(sourceRows.length, 3, `Expected 3 material_inspection rows for BJCL/2026-2027/0532, found ${sourceRows.length}`);

  // 2. Calculate from actual source rows
  const baseline = calculatePoSettlement({
    poNo: 'BJCL/2026-2027/0532',
    contractMt: 34.5,
    saudaRateQtl: 12900,
    lastMrSattaRateQtl: 12300,
    inspections: sourceRows,
  });

  console.log('Verified Source MR Breakdown:', JSON.stringify(baseline.mrBreakdown, null, 2));

  const mr999 = baseline.mrBreakdown.find((r) => r.mrNo === 'MR00999')!;
  const mr1037 = baseline.mrBreakdown.find((r) => r.mrNo === 'MR01037')!;
  const mr1042 = baseline.mrBreakdown.find((r) => r.mrNo === 'MR01042')!;

  assert.strictEqual(mr999.grossWtKg, 12920, 'MR00999 gross weight must be 12,920 kg');
  assert.strictEqual(mr999.netWtKg, 12662, 'MR00999 net weight must be 12,662 kg');
  assert.strictEqual(mr999.claimWtKg, 12662, 'MR00999 claim weight must use net weight (12,662 kg)');

  assert.strictEqual(mr1037.grossWtKg, 13870, 'MR01037 gross weight must be 13,870 kg');
  assert.strictEqual(mr1037.netWtKg, 13593, 'MR01037 net weight must be 13,593 kg');
  assert.strictEqual(mr1037.claimWtKg, 13593, 'MR01037 claim weight must use net weight (13,593 kg)');

  assert.strictEqual(mr1042.grossWtKg, 11880, 'MR01042 gross weight must be 11,880 kg');
  assert.strictEqual(mr1042.netWtKg, 11761, 'MR01042 net weight must be 11,761 kg');
  assert.strictEqual(mr1042.claimWtKg, 11880, 'Last MR01042 claim weight must use gross weight (11,880 kg)');
  assert.strictEqual(mr1042.isLastLorry, true, 'MR01042 must be identified as the last lorry');

  assert.strictEqual(baseline.totalClaimKg, 38135, 'Total claim weight must be 12,662 + 13,593 + 11,880 = 38,135 kg');
  assert.strictEqual(baseline.contractKg, 34500, 'Sauda contract weight must be 34,500 kg');
  assert.strictEqual(baseline.excessKg, 3635, 'Excess weight must be 38,135 - 34,500 = 3,635 kg');
  assert.strictEqual(baseline.exemptionKg, 0, '3% tolerance must NOT apply to excess weight');
  assert.strictEqual(baseline.finalDeductibleExcessKg, 3635, 'Final deductible excess must be 3,635 kg');
  assert.strictEqual(baseline.rateDifference, 600, 'Rate difference must be ₹600');
  assert.strictEqual(baseline.totalDeductionAmount, 2181000, 'Total excess deduction must be 3,635 * 600 = ₹2,181,000');

  // 3. Verify reopening / recalculating 10 times (including running comparePoInspection on each refresh cycle)
  // NEVER mutates MR00999.grid_details or changes the result
  for (let i = 1; i <= 10; i++) {
    comparePoInspection(
      { po_no: 'BJCL/2026-2027/0532', total_contract_mt: 34.5 },
      [],
      sourceRows[0],
      sourceRows
    );
    assert.strictEqual(
      sourceRows[0].grid_details.length,
      2,
      `Cycle #${i}: MR00999.grid_details was mutated in-place (expected 2 items, got ${sourceRows[0].grid_details.length})`
    );
    const repeat = calculatePoSettlement({
      poNo: 'BJCL/2026-2027/0532',
      contractMt: 34.5,
      saudaRateQtl: 12900,
      lastMrSattaRateQtl: 12300,
      inspections: sourceRows,
    });
    assert.strictEqual(repeat.totalClaimKg, 38135, `Recalculation #${i} totalClaimKg changed`);
    assert.strictEqual(repeat.totalDeductionAmount, 2181000, `Recalculation #${i} totalDeductionAmount changed`);
  }

  // 4. Verify immunity to the historical cumulative corruption values (50,678 kg, 278,774 kg, 582,902 kg)
  // and duplicate MR0999/MR00999 records
  for (const corruptedNetMt of [50.678, 278.774, 582.902]) {
    const corruptedInputs: InspectionSourceRow[] = sourceRows.map((r) =>
      r.mr_no === 'MR00999'
        ? { ...r, challan_gross_wt: 12.92, final_receipt_wt: corruptedNetMt }
        : { ...r }
    );
    // Also inject a duplicate alias row MR0999
    corruptedInputs.push({
      mr_no: 'MR0999',
      po_no: 'BJCL/2026-2027/0532',
      arrival_date: '2026-09-13',
      challan_gross_wt: 12.92,
      final_receipt_wt: corruptedNetMt,
    });

    const recovered = calculatePoSettlement({
      poNo: 'BJCL/2026-2027/0532',
      contractMt: 34.5,
      saudaRateQtl: 12900,
      lastMrSattaRateQtl: 12300,
      inspections: corruptedInputs,
    });

    const rec999 = recovered.mrBreakdown.find((r) => extractMrSeq(r.mrNo) === 999)!;
    assert.strictEqual(recovered.mrBreakdown.length, 3, 'Each linked MR must be counted exactly once');
    assert.strictEqual(rec999.netWtKg, 12662, `Failed to recover MR00999 net weight 12,662 kg when top-level final_receipt_wt=${corruptedNetMt}`);
    assert.strictEqual(recovered.totalClaimKg, 38135, `Failed to preserve 38,135 kg total claim when top-level final_receipt_wt=${corruptedNetMt}`);
    assert.strictEqual(recovered.totalDeductionAmount, 2181000, `Failed to preserve ₹2,181,000 deduction when top-level final_receipt_wt=${corruptedNetMt}`);
  }

  // 5. Verify that passing all 9 rows across temporary_material_received + final_arrival + material_inspection
  // still counts each linked MR (MR00999, MR01037, MR01042) once
  const fromAllTables = calculatePoSettlement({
    poNo: 'BJCL/2026-2027/0532',
    contractMt: 34.5,
    saudaRateQtl: 12900,
    lastMrSattaRateQtl: 12300,
    inspections: allTableRows,
  });
  assert.strictEqual(fromAllTables.mrBreakdown.length, 3, '9 rows across arrival/inspection tables must deduplicate to 3 MRs');
  assert.strictEqual(fromAllTables.totalClaimKg, 38135, 'Total claim from 9 combined rows must be 38,135 kg');
  assert.strictEqual(fromAllTables.totalDeductionAmount, 2181000, 'Total deduction from 9 combined rows must be ₹2,181,000');

  console.log('✓ All regression assertions passed! MR00999=12,662 kg, MR01037=13,593 kg, MR01042(Gross)=11,880 kg => Total=38,135 kg, Excess=3,635 kg, Deduction=₹2,181,000');
}

runRegressionSuite();
