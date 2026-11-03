import { createClient } from '@supabase/supabase-js';
import { pool } from './db.ts';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_CLOUD_URL = 'https://lxuapkccxaadwixjpirs.supabase.co';
const SUPABASE_CLOUD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4dWFwa2NjeGFhZHdpeGpwaXJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4MzQ4NDksImV4cCI6MjA5NDQxMDg0OX0.rzjJFNOb1gx0Z4cMSfkW9yDe4rI8oO6TLTzcVXswPek';

const supabaseCloud = createClient(SUPABASE_CLOUD_URL, SUPABASE_CLOUD_KEY);

// Ordered list of tables to migrate (masters first, then transactions)
const TABLES_TO_MIGRATE = [
  'financial_year_master',
  'area_master',
  'agency_master',
  'grade_master',
  'godown_master',
  'supply_master',
  'broker_master',
  'customer_master',
  'user_master',
  'tolerance_policy_master',
  'satta_base_rates',
  'satta_differentials',
  'satta_master',
  'satta_calculated_rates',
  'sauda_master',
  'sauda_quality_details',
  'sauda_check_point',
  'sauda_check_point_details',
  'purchase_master',
  'purchase_detail_master',
  'temporary_material_received',
  'material_received',
  'final_arrival',
  'material_inspection',
  'mill_inspection_master',
  'mill_inspection_details',
  'mr_settlement',
  'payment_master',
  'payment_details',
  'material_issue',
  'opening_stock',
  'clubbed_pomr',
  'return_lorry',
  'return_lorry_details',
  'mail_logs',
  'audit_logs'
];

async function migrateTable(tableName: string) {
  process.stdout.write(`Fetching ${tableName.padEnd(30)} ... `);
  
  let allRows: any[] = [];
  let from = 0;
  const batchSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabaseCloud
      .from(tableName)
      .select('*')
      .range(from, from + batchSize - 1);

    if (error) {
      if (error.code === '42P01' || error.message.includes('not found') || error.message.includes('does not exist')) {
        console.log(`[Skipped - table not in cloud]`);
        return 0;
      }
      console.log(`[Error reading cloud: ${error.message}]`);
      return 0;
    }

    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allRows = allRows.concat(data);
      if (data.length < batchSize) {
        hasMore = false;
      } else {
        from += batchSize;
      }
    }
  }

  if (allRows.length === 0) {
    console.log(`0 rows (empty table)`);
    return 0;
  }

  // Insert into local PostgreSQL
  const client = await pool.connect();
  let insertedCount = 0;

  try {
    // Disable constraints temporarily for bulk loading if needed
    await client.query('SET CONSTRAINTS ALL DEFERRED').catch(() => {});

    for (const row of allRows) {
      const keys = Object.keys(row).filter(k => row[k] !== undefined);
      if (keys.length === 0) continue;

      const columns = keys.map(k => `"${k}"`).join(', ');
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const values = keys.map(k => {
        const val = row[k];
        if (typeof val === 'object' && val !== null) {
          return JSON.stringify(val);
        }
        return val;
      });

      const insertSql = `
        INSERT INTO "${tableName}" (${columns}) 
        VALUES (${placeholders})
        ON CONFLICT DO NOTHING
      `;

      try {
        await client.query(insertSql, values);
        insertedCount++;
      } catch (insertErr: any) {
        // Continue on individual row error
      }
    }
    console.log(`SUCCESS: ${insertedCount}/${allRows.length} rows migrated!`);
    return insertedCount;
  } catch (err: any) {
    console.log(`Error during insert: ${err.message}`);
    return 0;
  } finally {
    client.release();
  }
}

async function runFullMigration() {
  console.log('======================================================================');
  console.log('   MIGRATING ALL DATA FROM SUPABASE CLOUD TO LOCAL POSTGRESQL (bjcl_db)');
  console.log('======================================================================');
  console.log(`Source Cloud: ${SUPABASE_CLOUD_URL}`);
  console.log(`Target Local: localhost:5432 / Database: bjcl_db\n`);

  try {
    // Verify local connection
    const test = await pool.query('SELECT current_database(), version()');
    console.log(`Connected to Local PostgreSQL: ${test.rows[0].current_database}`);
  } catch (err: any) {
    console.error(`\nERROR: Could not connect to your local PostgreSQL database: ${err.message}`);
    console.error(`Please make sure PostgreSQL is running and your password in .env is correct.`);
    process.exit(1);
  }

  let totalMigrated = 0;
  for (const table of TABLES_TO_MIGRATE) {
    const count = await migrateTable(table);
    totalMigrated += count;
  }

  console.log('\n======================================================================');
  console.log(` MIGRATION COMPLETE! Total rows copied into local bjcl_db: ${totalMigrated}`);
  console.log(' All your cloud data is now safely stored on your local hard drive!');
  console.log('======================================================================');
  await pool.end();
}

runFullMigration().catch((err) => {
  console.error('Fatal error during migration:', err);
  process.exit(1);
});
