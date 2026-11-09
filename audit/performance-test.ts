/**
 * Verifies client query caching and draft persistence with a simulated API.
 * Runs without an application server or database.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { dbModule } from '../src/services/dbModule';
import { saveScreenDraft, getScreenDraft, hasScreenDraft, clearScreenDraft } from '../src/services/screenDraftService';

async function runPerformanceBenchmark() {
  const originalFetch = globalThis.fetch;
  const requests = new Map<string, number>();
  const draftKey = 'performance_audit_draft';

  globalThis.fetch = async (input, options) => {
    assert.equal(input, '/api/db/query');
    assert.equal(options?.method, 'POST');
    const { table } = JSON.parse(String(options.body));
    assert.ok(['financial_year_master', 'grade_master', 'area_master'].includes(table));
    requests.set(table, (requests.get(table) ?? 0) + 1);
    return Response.json({ data: [{ table }], error: null });
  };

  try {
    const options = { select: 'year_code, is_active', limit: 10 };
    const started = performance.now();
    const results = await Promise.all([
      dbModule.fetchQuery('financial_year_master', options),
      dbModule.fetchQuery('financial_year_master', options),
    ]);
    const concurrentQueryMs = performance.now() - started;
    assert.deepEqual(results[0], [{ table: 'financial_year_master' }]);
    assert.deepEqual(results[0], results[1]);
    assert.equal(requests.get('financial_year_master'), 1);

    const cacheStarted = performance.now();
    assert.deepEqual(await dbModule.fetchQuery('financial_year_master', options), results[0]);
    const cachedQueryMs = performance.now() - cacheStarted;
    assert.equal(requests.get('financial_year_master'), 1);

    await dbModule.fetchQuery('grade_master', { limit: 5 });
    await dbModule.fetchQuery('area_master', { limit: 5 });
    dbModule.invalidateCache('grade_master');
    await dbModule.fetchQuery('grade_master', { limit: 5 });
    await dbModule.fetchQuery('area_master', { limit: 5 });
    assert.equal(requests.get('grade_master'), 2);
    assert.equal(requests.get('area_master'), 1);

    const draft = { po_no: 'DRAFT-099', items: [{ grade: 'TD5', quantity: 150 }] };
    saveScreenDraft(draftKey, draft);
    assert.ok(hasScreenDraft(draftKey));
    assert.deepEqual(getScreenDraft(draftKey), draft);
    clearScreenDraft(draftKey);
    assert.equal(hasScreenDraft(draftKey), false);

    const report = {
      timestamp: new Date().toISOString(),
      status: 'PASS',
      mode: 'simulated-api',
      checks: ['request deduplication', 'cache hits', 'selective invalidation', 'draft persistence'],
      concurrentQueryMs,
      cachedQueryMs,
    };
    fs.writeFileSync(path.resolve('audit', 'performance-results.json'), JSON.stringify(report, null, 2));
    console.log('Performance checks passed using a simulated API. No database calls were made.');
  } finally {
    globalThis.fetch = originalFetch;
    clearScreenDraft(draftKey);
  }
}

runPerformanceBenchmark().catch(error => {
  console.error('Performance checks failed:', error);
  process.exitCode = 1;
});
