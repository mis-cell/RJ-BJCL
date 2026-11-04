const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lxuapkccxaadwixjpirs.supabase.co';
const supabaseAnonKey = 'process.env.VITE_SUPABASE_ANON_KEY || ""';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectSchema() {
  console.log("Inspecting Supabase database schema...");
  try {
    // List tables we care about
    const tables = [
      'user_master',
      'sauda_master',
      'purchase_master',
      'final_arrival',
      'temporary_material_received',
      'material_inspection',
      'material_inspection_details',
      'payment_master',
      'payment_details',
      'material_mismatch',
      'satta_mismatch',
      'satta_master',
      'sms_sauda'
    ];

    for (const t of tables) {
      const { data, error } = await supabase.from(t).select('*').limit(1);
      if (error) {
        console.error(`Error querying table "${t}":`, error.message);
      } else {
        console.log(`Table "${t}": OK (columns found: ${data.length > 0 ? Object.keys(data[0]).join(', ') : 'No data, columns unknown'})`);
      }
    }
  } catch (err) {
    console.error("Exception in inspectSchema:", err);
  }
}

inspectSchema();
