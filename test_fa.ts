import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  const { data, error } = await supabase.from('final_arrival').select('mr_no, lorry_number, po_no, final_arrival_no').limit(5);
  console.log(error, data);
}
run();
