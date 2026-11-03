import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  const { data, error } = await supabase.from('mill_inspection_master').select('mr_no, lorry_number, arrival_no, po_no').limit(1);
  console.log(error, data);
}
run();
