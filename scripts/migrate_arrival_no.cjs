const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lxuapkccxaadwixjpirs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4dWFwa2NjeGFhZHdpeGpwaXJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4MzQ4NDksImV4cCI6MjA5NDQxMDg0OX0.rzjJFNOb1gx0Z4cMSfkW9yDe4rI8oO6TLTzcVXswPek';

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  console.log("=== STARTING DATABASE MIGRATION ===");

  // 1. Fetch temporary arrival map from temporary_material_received
  console.log("Fetching temporary arrivals map...");
  const { data: tmList, error: tmError } = await supabase.from('temporary_material_received').select('temporary_arrival_no, po_no');
  if (tmError) {
    console.error("Failed to fetch temporary_material_received records:", tmError);
    return;
  }

  // Create a map from normalized po_no to temporary_arrival_no
  const poToTempArrivalMap = new Map();
  tmList.forEach(r => {
    const po = String(r.po_no || '').trim().toUpperCase();
    const tempNo = String(r.temporary_arrival_no || '').trim();
    if (po && tempNo) {
      poToTempArrivalMap.set(po, tempNo);
    }
  });
  console.log(`Created PO to Temp Arrival map with ${poToTempArrivalMap.size} unique keys.`);

  // 2. Fetch final arrivals
  console.log("Fetching final arrivals...");
  const { data: faList, error: faError } = await supabase.from('final_arrival').select('*');
  if (faError) {
    console.error("Failed to fetch final_arrival records:", faError);
    return;
  }

  console.log(`Updating final_arrival records...`);
  for (const fa of faList) {
    const po = String(fa.po_no || '').trim().toUpperCase();
    const currentArrivalNo = String(fa.arrival_no || fa.final_arrival_no || '').trim();
    const expectedTempNo = fa.temporary_arrival_no || poToTempArrivalMap.get(po);

    if (expectedTempNo && expectedTempNo !== currentArrivalNo) {
      console.log(`Updating final_arrival ID ${fa.final_arrival_id}: current: '${currentArrivalNo}', expected: '${expectedTempNo}'`);
      const { error: updateError } = await supabase
        .from('final_arrival')
        .update({
          arrival_no: expectedTempNo,
          final_arrival_no: expectedTempNo,
          temporary_arrival_no: expectedTempNo
        })
        .eq('final_arrival_id', fa.final_arrival_id);

      if (updateError) {
        console.error(`Error updating final_arrival ID ${fa.final_arrival_id}:`, updateError);
      } else {
        console.log(`Successfully updated final_arrival ID ${fa.final_arrival_id} to ${expectedTempNo}`);
      }
    }
  }

  // 3. Fetch material inspections
  console.log("Fetching material inspections...");
  const { data: miList, error: miError } = await supabase.from('material_inspection').select('*');
  if (miError) {
    console.error("Failed to fetch material_inspection records:", miError);
    return;
  }

  console.log(`Updating material_inspection records...`);
  for (const mi of miList) {
    const po = String(mi.po_no || '').trim().toUpperCase();
    const currentArrivalNo = String(mi.arrival_no || '').trim();
    const expectedTempNo = poToTempArrivalMap.get(po);

    if (expectedTempNo && expectedTempNo !== currentArrivalNo) {
      console.log(`Updating material_inspection MR ${mi.mr_no}: current: '${currentArrivalNo}', expected: '${expectedTempNo}'`);
      const { error: updateError } = await supabase
        .from('material_inspection')
        .update({
          arrival_no: expectedTempNo
        })
        .eq('mr_no', mi.mr_no);

      if (updateError) {
        console.error(`Error updating material_inspection MR ${mi.mr_no}:`, updateError);
      } else {
        console.log(`Successfully updated material_inspection MR ${mi.mr_no} to ${expectedTempNo}`);
      }
    }
  }

  console.log("=== MIGRATION COMPLETED ===");
}

migrate();
