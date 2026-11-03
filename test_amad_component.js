import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

let supabaseUrl = process.env.VITE_SUPABASE_URL;
if (supabaseUrl.endsWith('/rest/v1/')) supabaseUrl = supabaseUrl.slice(0, -9);
else if (supabaseUrl.endsWith('/rest/v1')) supabaseUrl = supabaseUrl.slice(0, -8);
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetch() {
  const { data: poData, error } = await supabase.from('purchase_master').select('*').order('created_at', { ascending: false });
  const { data: tempPoData } = await supabase.from('temporary_po').select('*').order('created_at', { ascending: false }).catch(() => ({data:[]}));
  
  const normalizedTempPoData = (tempPoData || []).map(po => ({ ...po, status: po.status || 'temp' }));
  const mergedPos = [...(poData || []), ...normalizedTempPoData];
  const uniquePos = Array.from(new Map(mergedPos.map(po => [po.po_no, po])).values());
  
  const purchaseOrders = uniquePos
    .filter((po) => {
      if (!po.po_no || po.status === 'cancelled') return false;
      const pendingStr = String(po.pending ?? '').trim().toLowerCase();
      const statusStr = String(po.status ?? '').trim().toLowerCase();
      const receivedWt = parseFloat(po.received_weight_mt) || 0;
      const contractWt = parseFloat(po.total_contract_mt) || 0;
      const isCompleted = po.pending === false || pendingStr === 'no' || pendingStr === 'false' || po.pending === 0 || statusStr === 'completed' || statusStr === 'settled' || (contractWt > 0 && receivedWt >= contractWt);
      return !isCompleted;
    });
    
  console.log("Filtered purchaseOrders:", purchaseOrders.length);
  if (purchaseOrders.length > 0) {
      console.log(purchaseOrders.map(p => p.po_no));
  }
}
testFetch();
