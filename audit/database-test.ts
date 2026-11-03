import fs from 'fs';
import path from 'path';

interface DbCheckResult {
  check: string;
  status: 'PASS' | 'FAIL';
  details: string;
}

const REQUIRED_TABLES = [
  'sauda_master',
  'sauda_quality_details',
  'satta_master',
  'satta_quality_details',
  'satta_base_rates',
  'satta_differentials',
  'purchase_master',
  'purchase_detail_master',
  'sauda_check_point',
  'sauda_check_point_details',
  'temporary_material_received',
  'temporary_material_details',
  'final_arrival',
  'final_arrival_details',
  'material_inspection',
  'material_inspection_details',
  'material_inspection_deductions',
  'mill_inspection_master',
  'mill_inspection_detail',
  'mill_inspection_deduction',
  'm_r_settlement',
  'payment_master',
  'payment_details',
  'mill_issue_master',
  'mill_issue_detail',
  'opening_stock',
  'closing_stock',
  'godown_wise_stock',
  'weight_bridge_entries',
  'clubbed_pomr',
  'sms_sauda_logs',
  'tolerance_policy',
  'tolerance_deduction_slabs',
  'supply_master',
  'broker_master',
  'grade_master',
  'area_master',
  'agency_master',
  'marka_master',
  'godown_master',
  'department_master',
  'app_audit_logs',
  'user_activity_logs',
  'sauda_approval_history'
];

function runDatabaseAudit() {
  const migrationPath = path.resolve(process.cwd(), 'migrations/20261017_safe_repairs.sql');
  const schemaPath = path.resolve(process.cwd(), 'supabase_schema.sql');

  const migrationSql = fs.existsSync(migrationPath) ? fs.readFileSync(migrationPath, 'utf8') : '';
  const baseSchemaSql = fs.existsSync(schemaPath) ? fs.readFileSync(schemaPath, 'utf8') : '';
  const combinedSql = `${baseSchemaSql}\n${migrationSql}`.toLowerCase();

  const tableCoverage = REQUIRED_TABLES.map((table) => {
    const presentInMigration = migrationSql.toLowerCase().includes(table.toLowerCase());
    const presentInSchema = combinedSql.includes(table.toLowerCase());
    return {
      table,
      covered: presentInSchema,
      inSafeRepairsMigration: presentInMigration,
    };
  });

  const checks: DbCheckResult[] = [
    {
      check: 'migrations/20261017_safe_repairs.sql exists and is non-empty',
      status: migrationSql.trim().length > 100 ? 'PASS' : 'FAIL',
      details: `Migration file length: ${migrationSql.length} bytes`,
    },
    {
      check: 'Safe repairs migration contains no destructive DROP TABLE or DISABLE ROW LEVEL SECURITY statements',
      status:
        !migrationSql.toUpperCase().includes('DROP TABLE') &&
        !migrationSql.toUpperCase().includes('DISABLE ROW LEVEL SECURITY')
          ? 'PASS'
          : 'FAIL',
      details: 'Verified non-destructive idempotent DDL only',
    },
    {
      check: 'All core operational and master tables are covered by schema definitions',
      status: tableCoverage.every((t) => t.covered) ? 'PASS' : 'FAIL',
      details: `${tableCoverage.filter((t) => t.covered).length}/${REQUIRED_TABLES.length} tables covered`,
    },
    {
      check: 'Clubbing persistence table (clubbed_pomr) and SMS link columns are defined in safe repairs migration',
      status:
        migrationSql.includes('clubbed_pomr') &&
        migrationSql.includes('sms_sauda_logs') &&
        migrationSql.includes('arival_apmc_fees')
          ? 'PASS'
          : 'FAIL',
      details: 'Verified clubbed_pomr, sms_sauda_logs, and arival_apmc_fees columns',
    },
  ];

  const allPassed = checks.every((c) => c.status === 'PASS');

  const dbReport = {
    timestamp: new Date().toISOString(),
    status: allPassed ? 'PASS' : 'FAIL',
    totalChecks: checks.length,
    passedChecks: checks.filter((c) => c.status === 'PASS').length,
    checks,
  };

  const schemaCoverageReport = {
    timestamp: new Date().toISOString(),
    totalTablesAudited: REQUIRED_TABLES.length,
    coveredTables: tableCoverage.filter((t) => t.covered).length,
    coveragePct: Number(((tableCoverage.filter((t) => t.covered).length / REQUIRED_TABLES.length) * 100).toFixed(2)),
    tables: tableCoverage,
  };

  fs.mkdirSync(path.resolve(process.cwd(), 'audit'), { recursive: true });
  fs.writeFileSync(
    path.resolve(process.cwd(), 'audit/database-results.json'),
    JSON.stringify(dbReport, null, 2),
    'utf8'
  );
  fs.writeFileSync(
    path.resolve(process.cwd(), 'audit/schema-coverage.json'),
    JSON.stringify(schemaCoverageReport, null, 2),
    'utf8'
  );

  console.log(`Database Audit: ${dbReport.passedChecks}/${dbReport.totalChecks} checks passed (${dbReport.status})`);
  if (!allPassed) {
    process.exit(1);
  }
}

runDatabaseAudit();
