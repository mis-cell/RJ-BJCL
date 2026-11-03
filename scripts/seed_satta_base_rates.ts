import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://lxuapkccxaadwixjpirs.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4dWFwa2NjeGFhZHdpeGpwaXJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4MzQ4NDksImV4cCI6MjA5NDQxMDg0OX0.rzjJFNOb1gx0Z4cMSfkW9yDe4rI8oO6TLTzcVXswPek';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Satta Base Rates Data specification for 2026
// Months: APR(04), MAY(05), JUN(06), JUL(07), AUG(08), SEP(09)
const baseRateTable: Record<string, (number | null)[]> = {
  // Day 1 to 31 (index 0 to 30)
  '04': [
    16500, 16700, 17000, 17200, 17200, 17200, 17300, 17300, 17000, 16500,
    16500, 16500, 16500, 16500, 16501, 16500, 16500, 16500, 16500, 16500,
    16500, 16700, 16700, 17000, 17300, 17300, 17500, 17500, 17500, 17100,
    null // 31
  ],
  '05': [
    17100, 17100, 17100, 17100, 17100, 17100, 17100, 17100, 17100, 17100,
    17100, 17100, 17100, 17100, 17100, 17100, 17100, 17100, 17100, 17100,
    17100, 17100, 17100, 17100, 17100, 17100, 17100, 17100, 17100, 17100,
    17100 // 31
  ],
  '06': [
    17100, 17100, 17100, 17100, 17100, 17100, 17100, 17100, 17100, 17100,
    17100, 17100, 17100, 17100, 17100, 17100, 17100, 17100, 17100, 17100,
    17100, 17100, 17100, 17100, 17100, 17100, 14000, 12500, 10000, 9000,
    null // 31
  ],
  '07': [
    17100, 17100, 17100, 17100, 17100, 17100, 19000, 19000, 19000, 19500,
    19500, 19500, 19500, 19500, 19000, 19000, 18000, 17500, 16500, 16000,
    15000, 14500, 14500, 14500, 14500, 14500, 13300, 13300, 13300, 13300,
    8600 // 31
  ],
  '08': [
    9100, 9100, 11500, 11500, 12500, 13000, 14000, 14000, 12800, 12000,
    11500, 12500, 12500, 13500, 13500, 13000, 13000, 13000, 13500, 13500,
    13500, 13500, 13000, 13000, 13000, 13000, null, null, null, null,
    13100 // 31
  ],
  '09': [
    12800, 12800, 12800, 12800, 12800, 12800, 13100, 12900, 12900, 12900,
    12700, 12500, 12500, 12500, 12300, 12300, 12300, 12300, 12300, 12300,
    12300, 12900, 12900, null, null, null, null, null, null, null,
    null // 31
  ]
};

async function seed() {
  console.log("Connecting to Supabase...");
  
  // 1. Remove previous Base Rate records from satta_base_rates
  console.log("Cleaning previous Base Rate records from Supabase satta_base_rates...");
  const { error: delErr } = await supabase
    .from('satta_base_rates')
    .delete()
    .neq('base_rate', -99999); // matches all rows

  if (delErr) {
    console.error("Error deleting old base rates:", delErr);
  } else {
    console.log("Successfully cleared previous records from satta_base_rates.");
  }

  // Also clean old audit logs / calculated rates if needed
  await supabase
    .from('satta_base_rate_audit_logs')
    .delete()
    .neq('new_rate', -99999);

  // 2. Build rows to insert
  const insertRows: any[] = [];
  const year = 2026;

  Object.entries(baseRateTable).forEach(([monthStr, rates]) => {
    rates.forEach((rateVal, dayIdx) => {
      if (rateVal !== null && rateVal !== undefined && rateVal > 0) {
        const dayStr = String(dayIdx + 1).padStart(2, '0');
        const dateStr = `${year}-${monthStr}-${dayStr}`;
        insertRows.push({
          base_rate: rateVal,
          start_date: dateStr,
          remarks: `Satta Base Rate for ${dateStr}`,
          created_at: new Date(`${dateStr}T11:00:00.000Z`).toISOString()
        });
      }
    });
  });

  console.log(`Inserting ${insertRows.length} daily Base Rate records for 2026...`);
  
  // Batch insert in chunks of 50
  for (let i = 0; i < insertRows.length; i += 50) {
    const chunk = insertRows.slice(i, i + 50);
    const { error: insErr } = await supabase
      .from('satta_base_rates')
      .insert(chunk);

    if (insErr) {
      console.error(`Error inserting chunk ${i}:`, insErr);
    } else {
      console.log(`Inserted chunk ${i} to ${i + chunk.length}`);
    }
  }

  // Fetch all to verify
  const { data: allRates, error: fetchErr } = await supabase
    .from('satta_base_rates')
    .select('start_date, base_rate')
    .order('start_date', { ascending: true });

  if (fetchErr) {
    console.error("Fetch error:", fetchErr);
  } else {
    console.log(`Total satta_base_rates records in Supabase: ${allRates?.length}`);
    console.log("Sample records:", allRates?.slice(0, 5));
    console.log("Latest records:", allRates?.slice(-5));
  }
}

seed().catch(console.error);
