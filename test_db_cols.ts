import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const res = await supabase.rpc('exec_sql', { query: "SELECT column_name FROM information_schema.columns WHERE table_name = 'mill_inspection_master'" });
  console.log("Cols:", res.data);
}
run();
