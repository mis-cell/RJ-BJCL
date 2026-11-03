import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

let supabaseUrl = process.env.VITE_SUPABASE_URL;
if (supabaseUrl.endsWith('/rest/v1/')) {
    supabaseUrl = supabaseUrl.slice(0, -9);
} else if (supabaseUrl.endsWith('/rest/v1')) {
    supabaseUrl = supabaseUrl.slice(0, -8);
}
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetch() {
  const { data, error } = await supabase.from('purchase_master').select('*').order('created_at', { ascending: false });
  console.log('purchase_master fetch error:', error);
  console.log('purchase_master data count:', data?.length);
  if (data) {
     const isCompleted = (po) => {
         const pendingStr = String(po.pending ?? '').trim().toLowerCase();
         const statusStr = String(po.status ?? '').trim().toLowerCase();
         const receivedWt = parseFloat(po.received_weight_mt) || 0;
         const contractWt = parseFloat(po.total_contract_mt) || 0;
         return po.pending === false || pendingStr === 'no' || pendingStr === 'false' || po.pending === 0 || statusStr === 'completed' || statusStr === 'settled' || (contractWt > 0 && receivedWt >= contractWt);
     };
     console.log('first po isCompleted:', isCompleted(data[0]));
     console.log('filtered:', data.filter(po => !isCompleted(po)).length);
  }
}
testFetch();
