const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lxuapkccxaadwixjpirs.supabase.co';
const supabaseKey = 'process.env.VITE_SUPABASE_ANON_KEY || ""';

const supabase = createClient(supabaseUrl, supabaseKey);

async function count() {
  const { count, error } = await supabase.from('purchase_master').select('*', { count: 'exact', head: true });
  console.log("purchase_master count:", count, "error:", error);
}

count();
