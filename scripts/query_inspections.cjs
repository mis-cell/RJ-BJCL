const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lxuapkccxaadwixjpirs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4dWFwa2NjeGFhZHdpeGpwaXJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4MzQ4NDksImV4cCI6MjA5NDQxMDg0OX0.rzjJFNOb1gx0Z4cMSfkW9yDe4rI8oO6TLTzcVXswPek';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase.from('material_inspection').select('*').limit(10);
  if (error) {
    console.error("Error querying material_inspection:", error);
    return;
  }
  
  console.log(`Fetched ${data.length} rows.`);
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    console.log(`\n--- Row ${i + 1} (mr_no: ${row.mr_no}) ---`);
    for (const [k, v] of Object.entries(row)) {
      if (v !== null && typeof v === 'object') {
        console.log(`  [OBJECT] Key: ${k}, Type: ${typeof v}, Keys: ${Object.keys(v).join(', ')}`);
        console.log(`  Value:`, JSON.stringify(v));
      } else {
        console.log(`  Key: ${k}, Value: ${v} (${typeof v})`);
      }
    }
  }
}

run();
