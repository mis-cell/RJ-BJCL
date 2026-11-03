// Fetch and print ONLY sauda_quality_details for Sauda '0085'
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lxuapkccxaadwixjpirs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4dWFwa2NjeGFhZHdpeGpwaXJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4MzQ4NDksImV4cCI6MjA5NDQxMDg0OX0.rzjJFNOb1gx0Z4cMSfkW9yDe4rI8oO6TLTzcVXswPek';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const { data: saudas } = await supabase.from('sauda_master').select('*').eq('sauda_no', '0085');
  console.log("Found saudas:", saudas.length);
  for (const s of saudas) {
    console.log("sauda_id:", s.sauda_id, "session:", s.session);
    const { data: details } = await supabase.from('sauda_quality_details').select('*').eq('sauda_id', s.sauda_id);
    console.log("details count:", details ? details.length : 0);
    console.log(JSON.stringify(details, null, 2));
  }
}
main();
