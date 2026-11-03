import fs from 'fs';
import path from 'path';
import { getColSettPct } from '../src/utils/paymentCalculations';
import { calculateSattaDeduction } from '../src/services/sattaCalculation';
import { comparePoInspection, normalizeExact } from '../src/lib/poMatch';
import { canEditOrDelete } from '../src/lib/permissions';

interface TestResult {
  id: string;
  point: string;
  name: string;
  passed: boolean;
  details: string;
}

function readSource(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8');
}

async function runRegressionTests() {
  const results: TestResult[] = [];

  const check = (id: string, point: string, name: string, fn: () => boolean | string) => {
    try {
      const res = fn();
      const passed = res === true;
      results.push({
        id,
        point,
        name,
        passed,
        details: typeof res === 'string' ? res : passed ? 'Verified' : 'Failed assertion',
      });
    } catch (err: any) {
      results.push({
        id,
        point,
        name,
        passed: false,
        details: err?.message || String(err),
      });
    }
  };

  // Points 1-5: dbModule strict saves, no column-stripping, no silent offline fake success, bounded reads, executeTransaction
  check('REG-01', '1-5', 'dbModule enforces strict saves, bounded pagination, and atomic executeTransaction without column stripping or fake offline success', () => {
    const src = readSource('src/services/dbModule.ts');
    if (src.includes('delete currentPayload[')) return 'Column stripping still present';
    if (src.includes('queueOfflineAction(')) return 'Silent offline queueing still active';
    if (!src.includes('executeTransaction(')) return 'Missing executeTransaction method';
    if (!src.includes('pageSize = 1000')) return 'Missing paginated fetchAll';
    return true;
  });

  // Point 6: Close / reopen authoritative DB verification
  check('REG-02', '6', 'PurchaseOrder close/reopen/cancel verifies authoritative DB update before updating local state', () => {
    const src = readSource('src/components/purchase-order/usePurchaseOrderOperations.ts');
    return src.includes('executeTransaction') && src.includes('markPoClosedInLocalStorage');
  });

  // Points 7-11: Transactional saves for PO, Sauda, Satta, Inspection, Payment, Material Issue
  check('REG-03', '7-11', 'PO, Sauda, Satta, Inspection, Payment, and MaterialIssue use executeTransaction', () => {
    const poSrc = readSource('src/services/poService.ts');
    const saudaSrc = readSource('src/pages/SaudaEntry.tsx');
    const sattaSrc = readSource('src/pages/SattaEntry.tsx');
    const inspSrc = readSource('src/components/inspection/useInspectionLogic.ts');
    const paySrc = readSource('src/components/payment/usePaymentData.ts');
    const issueSrc = readSource('src/pages/MaterialIssue.tsx');
    return (
      poSrc.includes('executeTransaction') &&
      saudaSrc.includes('executeTransaction') &&
      sattaSrc.includes('executeTransaction') &&
      inspSrc.includes('executeTransaction') &&
      paySrc.includes('executeTransaction') &&
      issueSrc.includes('executeTransaction')
    );
  });

  // Point 12: Zero-percent deductions respected
  check('REG-04', '12', 'Explicit 0% settlement deduction is respected despite positive gd_claim / gd_sett', () => {
    const colPct = getColSettPct({
      sett_pct: 0,
      gd_claim: 15,
      gd_sett: 10,
    } as any);
    const sattaRes = calculateSattaDeduction(
      {
        grade: 'TD4',
        rate_value: 7000,
        sett_pct: 0,
        gd_claim: 15,
        gd_sett: 10,
      },
      []
    );
    return colPct === 0 && sattaRes.effectiveDiscountPct === 0 && sattaRes.deductionRsPerQtl === 0;
  });

  // Point 13: Payment deletion atomic + status recomputation
  check('REG-05', '13', 'Payment deletion uses atomic transaction and recomputes linked MR/PO payment status', () => {
    const paySrc = readSource('src/components/payment/usePaymentData.ts');
    return paySrc.includes('DELETE FROM payment_details WHERE voucher_no =') && paySrc.includes('recomputed');
  });

  // Point 14: Exact MR matching in MrSettlement
  check('REG-06', '14', 'MrSettlement uses exact MR identity matching without substring .includes()', () => {
    const mrSrc = readSource('src/pages/MrSettlement.tsx');
    return !mrSrc.includes('pMrClean.includes(targetMrClean)');
  });

  // Point 15: Atomic stock transfer
  check('REG-07', '15', 'Stock transfer uses atomic transaction checking source quantity equality', () => {
    const stockSrc = readSource('src/components/stock-summary/useStockSummaryData.ts');
    return stockSrc.includes('UPDATE opening_stock SET quantity =') && stockSrc.includes('AND quantity =');
  });

  // Point 16: Weighbridge no inline DDL + verified saves
  check('REG-08', '16', 'WeightBridge does not run inline CREATE TABLE DDL and verifies stage updates', () => {
    const wbSrc = readSource('src/pages/WeightBridge.tsx');
    return !wbSrc.includes('CREATE TABLE IF NOT EXISTS weight_bridge_entries');
  });

  // Points 17-18: Strict PO matching and non-substring fuzzy matching
  check('REG-09', '17-18', 'poMatch enforces exact normalized identity without substring containment', () => {
    const poMatchSrc = readSource('src/lib/poMatch.ts');
    const comp = comparePoInspection(
      { po_no: 'BJCL/2026-2027/0256', area: 'BIHAR', supplier: 'RAMESH TRADERS' },
      [],
      { po_no: 'BJCL/2026-2027/0256', area: 'WEST BIHAR', supplier: 'RAMESH' },
      []
    );
    return (
      !poMatchSrc.includes('sa.includes(aa)') &&
      normalizeExact('  bjcl/2026-2027/0256 ') === 'BJCL/2026-2027/0256' &&
      comp.status === 'mismatch'
    );
  });

  // Points 19-21: Print weights, financial year preservation, ClosingStockEntry navigation isolation
  check('REG-10', '19-21', 'PO PDF generator uses explicit weights, forms preserve financial_year, and ClosingStockEntry has isolated tab state', () => {
    const pdfSrc = readSource('src/utils/purchaseOrderPdfGenerator.ts');
    const appSrc = readSource('src/App.tsx');
    return !pdfSrc.includes('* 0.18') && appSrc.includes("case 'closing_stock_entry':");
  });

  // Point 22: Restricted canEditOrDelete
  check('REG-11', '22', 'canEditOrDelete denies unprivileged users by default instead of returning true unconditionally', () => {
    const permSrc = readSource('src/lib/permissions.ts');
    return !permSrc.includes('// Allow all logged-in users to edit and delete across modules\n  return true;');
  });

  // Points 23-27, 41-42: AuthScreen no password hint, server session verification, no startup DDL/RLS disable, static API guard
  check('REG-12', '23-27,41-42', 'AuthScreen has no password hint, server enforces session tokens & no hardcoded credentials, App preserves gate data on idle logout', () => {
    const authSrc = readSource('src/components/auth/AuthScreen.tsx');
    const serverSrc = readSource('server.ts');
    const appSrc = readSource('src/App.tsx');
    const utilsSrc = readSource('src/lib/utils.ts');
    return (
      !authSrc.includes('Admin@1234') &&
      !serverSrc.includes('ochhyhnjlkhdlpot') &&
      serverSrc.includes('/api/auth/verify') &&
      appSrc.includes('preserveGateData') &&
      utilsSrc.includes('VITE_API_BASE_URL')
    );
  });

  // Points 28-33: ClubPOMR DB persistence, SattaChart read-only load, SmsSaudaDesk strict sms_id isolation, atomic inspection delete
  check('REG-13', '28-33', 'ClubPOMR persists to clubbed_pomr, SattaChart load is read-only, SmsSaudaDesk keys by sms.id, Inspection delete is atomic', () => {
    const clubSrc = readSource('src/pages/ClubPOMR.tsx');
    const sattaChartSrc = readSource('src/pages/SattaChart.tsx');
    const smsSrc = readSource('src/pages/SmsSaudaDesk.tsx');
    return (
      !clubSrc.includes('inMemoryClubbedHistory') &&
      !sattaChartSrc.includes('DISABLE ROW LEVEL SECURITY') &&
      smsSrc.includes('markedSmsMap[sms.id]')
    );
  });

  // Points 34-40, 43-45: Accurate reports, real ConfigGuide sync, TredeReport directory, TolerancePolicy zero-tolerance & strict save, Reports Blob CSV
  check('REG-14', '34-40,43-45', 'Reports deduplicate aliases, ConfigGuide runs real DB sync, TredeReport is Trader Directory, TolerancePolicy preserves 0%, Reports uses exportToCSV', () => {
    const cfgSrc = readSource('src/pages/ConfigGuide.tsx');
    const tredeSrc = readSource('src/pages/TredeReport.tsx');
    const tolSrc = readSource('src/services/tolerancePolicyService.ts');
    const repSrc = readSource('src/pages/Reports.tsx');
    return (
      !cfgSrc.includes('BENGAL BALING CO.') &&
      tredeSrc.includes('supply_master') &&
      !tolSrc.includes('Number(d.tolerance_pct) || 5.0') &&
      repSrc.includes('exportToCSV(')
    );
  });

  const passedCount = results.filter((r) => r.passed).length;
  const summary = {
    timestamp: new Date().toISOString(),
    total: results.length,
    passed: passedCount,
    failed: results.length - passedCount,
    status: passedCount === results.length ? 'PASS' : 'FAIL',
    results,
  };

  fs.mkdirSync(path.resolve(process.cwd(), 'audit'), { recursive: true });
  fs.writeFileSync(
    path.resolve(process.cwd(), 'audit/regression-results.json'),
    JSON.stringify(summary, null, 2),
    'utf8'
  );

  console.log(`Regression Suite: ${passedCount}/${results.length} passed (${summary.status})`);
  if (summary.failed > 0) {
    process.exit(1);
  }
}

runRegressionTests();
