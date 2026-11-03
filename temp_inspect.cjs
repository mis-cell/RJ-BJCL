// Test script to fetch Sauda details to see what's in the database.
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lxuapkccxaadwixjpirs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4dWFwa2NjeGFhZHdpeGpwaXJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4MzQ4NDksImV4cCI6MjA5NDQxMDg0OX0.rzjJFNOb1gx0Z4cMSfkW9yDe4rI8oO6TLTzcVXswPek';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const { data: saudas, error: sErr } = await supabase.from('sauda_master').select('*').eq('sauda_no', '0085');
  if (sErr) {
    console.error("Sauda Error:", sErr);
    return;
  }
  console.log("Matched Saudas found:", saudas.length);
  for (const s of saudas) {
    console.log("Sauda ID:", s.sauda_id, "Session:", s.session, "Broker:", s.broker, "Supplier:", s.supplier);
    const { data: details, error: dErr } = await supabase.from('sauda_quality_details').select('*').eq('sauda_id', s.sauda_id);
    if (dErr) {
      console.error("Details fetching error:", dErr);
    } else {
      console.log("Sauda Details for ID", s.sauda_id, ":");
      console.log(JSON.stringify(details, null, 2));
    }
  }

  const { data: grades, error: gErr } = await supabase.from('grade_master').select('*');
  console.log("Grade Master values in DB:", JSON.stringify(grades, null, 2));
}

main();
