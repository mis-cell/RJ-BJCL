const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://lxuapkccxaadwixjpirs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4dWFwa2NjeGFhZHdpeGpwaXJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4MzQ4NDksImV4cCI6MjA5NDQxMDg0OX0.rzjJFNOb1gx0Z4cMSfkW9yDe4rI8oO6TLTzcVXswPek';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data: mData } = await supabase.from('mill_inspection_master').select('*').limit(3);
  console.log("Mill Inspection:", mData);

  const { data: tData } = await supabase.from('temporary_material_received').select('*').limit(3);
  console.log("Temporary Material Received:", tData);
}
check();
