import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lxuapkccxaadwixjpirs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4dWFwa2NjeGFhZHdpeGpwaXJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4MzQ4NDksImV4cCI6MjA5NDQxMDg0OX0.rzjJFNOb1gx0Z4cMSfkW9yDe4rI8oO6TLTzcVXswPek';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log('Testing insert into issue_master...');
  const testPayload = {
    financial_year: '2026-2027',
    amad_no: '99991',
    date: '2026-05-27',
    jci: 'No',
    challan_supplier: 'TEST SUPPLIER ISSUE',
    supplier: 'TEST SUPPLIER ISSUE',
    broker: 'DIRECT',
    total_packets: 10,
    weight_qtl: 100
  };
  const { data, error } = await supabase.from('issue_master').insert(testPayload).select();
  if (error) {
    console.error('Insert error for issue_master:', error);
  } else {
    console.log('Insert success on issue_master!', data);
  }
}

run();
