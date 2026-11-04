// ==============================================================================
// Generates 'local_complete_data_seed.sql' directly on your Ubuntu machine
// Zero dependencies required! Uses native Node.js fetch and fs.
// ==============================================================================

const fs = require('fs');

const SUPABASE_URL = 'https://lxuapkccxaadwixjpirs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4dWFwa2NjeGFhZHdpeGpwaXJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4MzQ4NDksImV4cCI6MjA5NDQxMDg0OX0.rzjJFNOb1gx0Z4cMSfkW9yDe4rI8oO6TLTzcVXswPek';

const TABLES = [
  'financial_year_master', 'area_master', 'agency_master', 'grade_master',
  'godown_master', 'supply_master', 'broker_master', 'customer_master',
  'user_master', 'user_activity_logs', 'department_master', 'deduction_master',
  'quality_items', 'unit_master', 'tolerance_policy', 'tolerance_policy_master',
  'marka_master', 'batch_master', 'moisture_logic', 'area_logic',
  'satta_base_rates', 'satta_base_rate_audit_logs', 'satta_differentials',
  'satta_differential_audit_logs', 'satta_master', 'satta_quality_details',
  'satta_mismatch', 'satta_calculated_rates', 'sauda_master', 'sauda_quality_details',
  'sauda_approval_history', 'sauda_check_point', 'sauda_check_point_deductions',
  'sauda_check_point_details', 'sms_sauda', 'purchase_master', 'purchase_detail_master',
  'p_o_archive', 'po_archive', 'temporary_material_received', 'final_arrival',
  'amad_change_history', 'amad_register', 'lorry_weighments', 'clubbed_pomr',
  'return_lorry', 'return_lorry_details', 'inspection_master', 'inspection_details',
  'inspection_checklist_details', 'material_inspection', 'material_inspection_deductions',
  'material_inspection_details', 'material_mismatch', 'mill_inspection_master',
  'mill_inspection_detail', 'mill_inspection_deduction', 'mill_inspection_print_logs',
  'issue_master', 'mill_issue_master', 'mill_issue_detail', 'material_issue',
  'm_r_settlement', 'mr_settlement_master', 'mr_settlement_detail', 'settlement_print_history',
  'm_r_archive', 'mr_archive', 'payment_master', 'payment_details', 'party_ledger',
  'opening_stock', 'closing_stock', 'godown_audit', 'godown_entry', 'godown_wise_stock',
  'godown_to_factory_master', 'godown_to_factory_detail', 'production_records',
  'report_master', 'requisitions', 'mail_logs', 'app_audit_logs', 'imap_emails'
];

function escapeSql(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object') return "'" + JSON.stringify(val).replace(/'/g, "''") + "'::jsonb";
  return "'" + String(val).replace(/'/g, "''") + "'";
}

async function exportAll() {
  console.log('======================================================================');
  console.log(' DOWNLOADING ALL DATA FROM SUPABASE CLOUD TO local_complete_data_seed.sql');
  console.log('======================================================================\n');

  const stream = fs.createWriteStream('local_complete_data_seed.sql');
  stream.write('-- Bally Jute Complete Data Seed from Supabase Cloud\n\n');

  let totalTables = 0;
  let totalRows = 0;

  for (const t of TABLES) {
    let from = 0;
    const batchSize = 1000;
    let allRows = [];
    while (true) {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${t}?select=*`, {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Range': `${from}-${from + batchSize - 1}`,
            'Range-Unit': 'items'
          }
        });
        if (!res.ok) break;
        const data = await res.json();
        if (!data || !Array.isArray(data) || data.length === 0) break;
        allRows = allRows.concat(data);
        if (data.length < batchSize) break;
        from += batchSize;
      } catch (e) {
        break;
      }
    }

    if (allRows.length > 0) {
      console.log(`• ${t.padEnd(35)}: ${allRows.length} rows`);
      for (const row of allRows) {
        const keys = Object.keys(row).filter(k => row[k] !== undefined);
        const cols = keys.map(k => '"' + k + '"').join(', ');
        const vals = keys.map(k => escapeSql(row[k])).join(', ');
        stream.write(`INSERT INTO "${t}" (${cols}) VALUES (${vals}) ON CONFLICT DO NOTHING;\n`);
      }
      stream.write('\n');
      totalTables++;
      totalRows += allRows.length;
    }
  }

  stream.end();
  console.log('\n======================================================================');
  console.log(` SUCCESS: Downloaded ${totalRows} rows across ${totalTables} tables!`);
  console.log(` File created: local_complete_data_seed.sql`);
  console.log('======================================================================\n');
}

exportAll().catch(e => console.error(e));
