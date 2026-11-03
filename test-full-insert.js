import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lxuapkccxaadwixjpirs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4dWFwa2NjeGFhZHdpeGpwaXJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4MzQ4NDksImV4cCI6MjA5NDQxMDg0OX0.rzjJFNOb1gx0Z4cMSfkW9yDe4rI8oO6TLTzcVXswPek';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const activeRows = [
    {
      idx: 0,
      receipt_grade_code: 'TD1',
      receipt_grade_name: 'TD1',
      crop_year: '2026-27',
      challan_grade_code: 'TD1',
      challan_grade_name: 'TD1',
      agency_code: '',
      agency_name: '',
      challan_marka_code: '',
      challan_marka_name: '',
      netto_pnto: 1.5,
      quantity_chln: 30,
      quantity_rcpt: 30
    }
  ];

  const payload = {
    financial_year: '2026-2027',
    amad_no: '168',
    po_no: 'PO-12345/26',
    date: '2026-05-27',
    jci: 'No',
    challan_supplier: 'ARADHANA MULTI MAX LTD.',
    supplier: 'ARADHANA MULTI MAX LTD.',
    broker: 'ASHOK TRADING CO.',
    transporter_name: 'TEST TRANSPORT',
    challan_rr_no: '12345',
    lorry_no: 'WB-1234',
    pan_no: 'ABCDE1234F',
    lorry_date: '2026-05-27',
    consignment_note_no: 'CN-123',
    di_no: 'DI-123',
    di_date: '2026-05-27',
    invoice_no: 'INV-123',
    invoice_date: '2026-05-27',
    ftf: 'No',
    lorry_returned: 'No',
    lorry_returned_other_mill: 'No',
    arrival_area_code: '360',
    arrival_area_name: 'NORTHEN BALES',
    unit_code: '1',
    unit_name: 'BALES',
    way_bill_no: 'WB-999',
    way_bill_date: '2026-05-27',
    apmc_fees: 150.00,
    remarks: 'TEST SAVE',
    total_packets: 30,
    weight_qtl: 15,
    grid_details: activeRows,

    challan_material_weight: 15,
    actual_gross_weight: 25,
    actual_tare_weight: 10,
    supplier_net_weight: 15,
    supplier_challan_gross: 25,
    supplier_tare_weight: 10,
    electronic_net_weight: 15,
    electronic_gross_weight: 25,
    electronic_tare_weight: 10,
    weight_reduced: 0,

    packets: 30,
    weight: 15,
    commodity: 'RAW JUTE',
    variety: 'TD1',
    grading: 'TD1',
    marka: 'DIRECT',
    status: 'Active'
  };

  console.log('Inserting full payload to amad_master...');
  const { data, error } = await supabase.from('amad_master').insert(payload).select().single();
  if (error) {
    console.error('Insert full payload error:', error);
  } else {
    console.log('Insert full payload success!', data);
  }
}

run();
