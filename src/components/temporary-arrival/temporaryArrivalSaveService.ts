import { sanitizeDate } from '../../lib/utils';
import { dbModule } from '../../services/dbModule';
import { supabase } from '../../lib/supabase';
import { getCurrentUserContext } from '../../lib/permissions';
import { validateAreaAgencyCombination } from '../../services/areaLogicService';
import { ArrivalDetailRow } from '../../types';

export interface TemporaryArrivalSaveParams {
  formData: any;
  details: ArrivalDetailRow[];
  initialData?: any;
  purchaseOrders: any[];
  closedSaudaMap: Map<string, { po_no: string; sauda_no?: string; contractLorries: number; receivedLorries: number; isClosed: boolean }>;
  markas: any[];
}

export async function saveTemporaryArrivalRecord({
  formData,
  details,
  initialData,
  purchaseOrders,
  closedSaudaMap,
  markas
}: TemporaryArrivalSaveParams): Promise<{ success: boolean; payload?: any; error?: string }> {
  const activeRows = details.filter(row => 
    row.receipt_grade_code || 
    row.receipt_grade_name ||
    row.challan_grade_name || 
    row.challan_marka_name ||
    row.agency_name ||
    Number(row.netto_pnto) > 0 || 
    Number(row.quantity_rcpt) > 0 || 
    Number(row.quantity_chln) > 0
  );

  // Validate selected Area and Agency combination against area_logic
  if (formData.arrival_area_name) {
    for (const row of activeRows) {
      if (row.agency_name || row.agency_code) {
        const isValid = validateAreaAgencyCombination(
          formData.arrival_area_name,
          row.agency_code || row.agency_name
        );
        if (!isValid) {
          return {
            success: false,
            error: `Selected Agency "${row.agency_name || row.agency_code}" is not valid for Area "${formData.arrival_area_name}" according to area_logic.`
          };
        }
      }
    }
  }

  // Check if there are any new manual marks to insert into the database
  const uniqueNewMarkas: string[] = [];
  activeRows.forEach(row => {
    const markaName = (row.challan_marka_name || '').trim();
    if (markaName) {
      const exists = markas.some(m => (m.marka_name || '').trim().toUpperCase() === markaName.toUpperCase());
      if (!exists && !uniqueNewMarkas.some(n => n.toUpperCase() === markaName.toUpperCase())) {
        uniqueNewMarkas.push(markaName);
      }
    }
  });

  if (uniqueNewMarkas.length > 0) {
    let maxMarkaCode = markas.reduce((acc, m) => {
      const codeVal = parseInt(m.marka_code || '0', 10);
      return isNaN(codeVal) ? acc : Math.max(acc, codeVal);
    }, 170);

    for (const name of uniqueNewMarkas) {
      maxMarkaCode += 1;
      const codeStr = String(maxMarkaCode).padStart(2, '0');
      try {
        await dbModule.insert('marka_master', {
          marka_code: codeStr,
          marka_name: name.toUpperCase()
        });
        activeRows.forEach(r => {
          if ((r.challan_marka_name || '').trim().toUpperCase() === name.toUpperCase()) {
            r.challan_marka_code = codeStr;
            r.challan_marka_name = name.toUpperCase();
          }
        });
      } catch (e) {
        console.error("Failed to insert new marka name:", name, e);
      }
    }
  }

  const totalPacketsSum = Math.round(activeRows.reduce((acc, curr) => acc + (Number(curr.quantity_rcpt) || 0), 0));
  const totalWeightSum = activeRows.reduce((acc, curr) => acc + (Number(curr.netto_pnto) || 0), 0);
  const lorryCombined = `${formData.lorry_prefix}-${formData.lorry_suffix}`.trim();
  const primaryRow = activeRows.find(r => (Number(r.netto_pnto) > 0 || Number(r.quantity_chln) > 0 || Number(r.quantity_rcpt) > 0)) || activeRows[0];

  const payload = {
    financial_year: formData.financial_year,
    amad_no: formData.arrival_no,
    temporary_arrival_no: formData.arrival_no,
    po_no: formData.po_no,
    date: sanitizeDate(formData.date),
    jci: formData.jci,
    challan_supplier: formData.challan_supplier,
    supplier: formData.supplier,
    broker: formData.broker,
    transporter_name: formData.transporter_name,
    challan_rr_no: formData.challan_rr_no || (formData as any).challan_railway_receipt_no || '',
    challan_railway_receipt_no: (formData as any).challan_railway_receipt_no || formData.challan_rr_no || '',
    lorry_number: lorryCombined,
    pan_no: formData.pan_no,
    lorry_date: sanitizeDate(formData.lorry_date),
    consignment_note: (formData as any).consignment_note || formData.consignment_note_no || '',
    consignment_note_no: (formData as any).consignment_note || formData.consignment_note_no || '',
    di_no: formData.di_no,
    di_date: sanitizeDate(formData.di_date),
    invoice_no: formData.invoice_no,
    invoice_date: sanitizeDate(formData.invoice_date),
    ptf: formData.ptf,
    lorry_returned: formData.lorry_returned,
    lorry_returned_other_mill: formData.lorry_returned_other_mill,
    arrival_area_code: formData.arrival_area_code,
    arrival_area_name: formData.arrival_area_name,
    unit_code: formData.unit_code,
    unit_name: formData.unit_name,
    way_bill_no: formData.way_bill_no,
    way_bill_date: sanitizeDate(formData.way_bill_date),
    apmc_fees: Number(formData.apmc_fees) || 0,
    remarks: formData.remarks,
    total_packets: totalPacketsSum,
    weight_qtl: totalWeightSum * 10,
    grid_details: activeRows.map(row => ({
      srl_no: Number(row.srl_no) || 1,
      remarks: row.remarks || '',
      crop_year: row.crop_year || '2026-27',
      netto_pnto: Number(row.netto_pnto) || 0,
      agency_code: row.agency_code || '',
      agency_name: row.agency_name || '',
      quantity_chln: Math.round(Number(row.quantity_chln) || 0),
      quantity_rcpt: Math.round(Number(row.quantity_rcpt) || 0),
      challan_grade_name: row.challan_grade_name || row.receipt_grade_name || '',
      challan_marka_code: row.challan_marka_code || '',
      challan_marka_name: row.challan_marka_name || '',
      receipt_grade_code: row.receipt_grade_code || '',
      receipt_grade_name: row.receipt_grade_name || ''
    })),

    // Weighments
    challan_material_weight: formData.challan_material_weight || 0,
    actual_gross_weight: formData.actual_gross_weight || 0,
    actual_tare_weight: formData.actual_tare_weight || 0,
    supplier_net_weight: formData.supplier_net_weight || 0,
    supplier_challan_gross: formData.supplier_challan_gross || 0,
    supplier_tare_weight: formData.supplier_tare_weight || 0,
    electronic_net_weight: formData.electronic_net_weight || 0,
    electronic_gross_weight: formData.electronic_gross_weight || 0,
    electronic_tare_weight: formData.electronic_tare_weight || 0,
    weight_reduced: formData.weight_reduced || 0,

    // Backward compatibility properties & grade indexing
    packets: totalPacketsSum,
    weight: totalWeightSum * 10,
    commodity: 'RAW JUTE',
    variety: primaryRow?.receipt_grade_name || primaryRow?.challan_grade_name || 'TOSSA',
    grading: primaryRow?.receipt_grade_name || primaryRow?.challan_grade_name || 'TD6',
    marka: primaryRow?.challan_marka_name || 'DIRECT',
    status: 'Active'
  };

  let changesSummaryArr: string[] = [];
  if (initialData) {
    const keysToCompare = [
      { key: 'po_no', label: 'PO No' },
      { key: 'date', label: 'Date' },
      { key: 'supplier', label: 'Supplier' },
      { key: 'lorry_number', label: 'Lorry Number' },
      { key: 'total_packets', label: 'Total Packets' },
      { key: 'remarks', label: 'Remarks' },
      { key: 'actual_gross_weight', label: 'Gross Weight' },
      { key: 'actual_tare_weight', label: 'Tare Weight' }
    ];

    keysToCompare.forEach(({ key, label }) => {
      const oldVal = (initialData as any)[key];
      const newVal = (payload as any)[key];
      if (String(oldVal || '').trim() !== String(newVal || '').trim()) {
        changesSummaryArr.push(`${label}: "${oldVal ?? ''}" → "${newVal ?? ''}"`);
      }
    });
  }

  // Prepare standard database payload (strip non-table properties)
  const dbPayload = { ...payload };
  delete (dbPayload as any).amad_no;
  delete (dbPayload as any).grade;

  const tryDbOperation = async (operation: () => Promise<any>) => {
    try {
      return await operation();
    } catch (e: any) {
      const errMsg = e?.message || String(e || '');
      const match = errMsg.match(/Could not find the '([^']+)' column/i);
      if (match && match[1] && (dbPayload as any)[match[1]] !== undefined) {
        if (match[1] === 'apmc_fees' && supabase) {
          try {
            await supabase.rpc('exec_sql', {
              query: `ALTER TABLE IF EXISTS temporary_material_received ADD COLUMN IF NOT EXISTS apmc_fees NUMERIC(15,2) DEFAULT 0; NOTIFY pgrst, 'reload schema';`
            });
            return await operation();
          } catch (_) {}
        }
        console.warn(`Stripping unknown column '${match[1]}' from payload and retrying`);
        delete (dbPayload as any)[match[1]];
        return await operation();
      }
      if (errMsg.includes('amad_no')) {
        delete (dbPayload as any).amad_no;
        return await operation();
      }
      if (errMsg.includes('temporary_arrival_no')) {
        delete (dbPayload as any).temporary_arrival_no;
        return await operation();
      }
      throw e;
    }
  };

  if (initialData && initialData.amad_id) {
    await Promise.all([
      tryDbOperation(() => dbModule.update('temporary_material_received', 'amad_id', initialData.amad_id, dbPayload)).catch((e) => {
        console.error("Error updating temporary_material_received:", e);
        throw e;
      }),
      tryDbOperation(() => dbModule.update('issue_master', 'amad_id', initialData.amad_id, dbPayload)).catch((e) => {
        console.warn("Could not sync with issue_master or issue_master didn't exist for update, skipping:", e);
      })
    ]);

    // Insert audit trail for update
    const historyLog = {
      amad_no: formData.arrival_no || 'UNKNOWN',
      amad_id: initialData.amad_id,
      action_type: 'UPDATE',
      modified_by: getCurrentUserContext().username || 'ADMIN',
      old_values: JSON.stringify(initialData),
      new_values: JSON.stringify(payload),
      changes_summary: changesSummaryArr.join(', ') || 'Voucher record updated (re-saved)'
    };
    await dbModule.insert('amad_change_history', historyLog).catch((e) => {
      console.error("Failed to write update log:", e);
    });
  } else {
    let insertAmadError: any = null;
    await Promise.all([
      tryDbOperation(() => dbModule.insert('temporary_material_received', dbPayload)).catch((e) => { insertAmadError = e; return null; }),
      tryDbOperation(() => dbModule.insert('issue_master', dbPayload)).catch((e) => { return null; })
    ]);
    if (insertAmadError) {
      return {
        success: false,
        error: `Failed to save to Database: ${insertAmadError.message || insertAmadError}`
      };
    }

    // Insert audit trail for insert
    const historyLog = {
      amad_no: formData.arrival_no || 'UNKNOWN',
      amad_id: formData.arrival_no,
      action_type: 'INSERT',
      modified_by: getCurrentUserContext().username || 'ADMIN',
      old_values: null,
      new_values: JSON.stringify(payload),
      changes_summary: `New Arrival Voucher registered by ${getCurrentUserContext().username || 'ADMIN'} containing ${payload.total_packets} Packets`
    };
    await dbModule.insert('amad_change_history', historyLog).catch((e) => {
      console.error("Failed to write insert log:", e);
    });
  }

  // Propagate A.P.M.C Fees (Rs.) downstream to Final Arrival, Inspection, and Settlement if linked records exist
  const savedApmcFees = Number(formData.apmc_fees) || 0;
  const cleanArrNo = (formData.arrival_no || '').trim();
  if (supabase && cleanArrNo) {
    try {
      await Promise.all([
        supabase.from('final_arrival').update({ apmc_fees: savedApmcFees }).or(`temporary_arrival_no.eq.${cleanArrNo},arrival_no.eq.${cleanArrNo},final_arrival_no.eq.${cleanArrNo}`).then(() => {}, () => {}),
        supabase.from('material_inspection').update({ arival_apmc_fees: savedApmcFees }).or(`arrival_no.eq.${cleanArrNo},mr_no.eq.${cleanArrNo}`).then(() => {}, () => {}),
        supabase.from('mill_inspection_master').update({ arival_apmc_fees: savedApmcFees }).or(`arrival_no.eq.${cleanArrNo},mr_no.eq.${cleanArrNo}`).then(() => {}, () => {}),
        supabase.from('mr_settlement_master').update({ arival_apmc_fees: savedApmcFees }).or(`arrival_no.eq.${cleanArrNo},mr_no.eq.${cleanArrNo}`).then(() => {}, () => {})
      ]);
    } catch (_) {}
  }

  // Dynamically calculate and update status of PO & Sauda based on total received quantities/weights
  const currentPoNo = formData.po_no ? formData.po_no.trim().toUpperCase() : '';
  if (currentPoNo) {
    try {
      let matchedPo: any = null;
      if (supabase) {
        const { data } = await supabase.from('purchase_master').select('*').eq('po_no', currentPoNo).maybeSingle();
        matchedPo = data;
      }

      if (matchedPo) {
        let totalReceivedMt = 0;
        if (supabase) {
          const { data: relatedAmads } = await supabase
            .from('temporary_material_received')
            .select('amad_no, temporary_arrival_no, weight_qtl')
            .eq('po_no', currentPoNo);
          
          (relatedAmads || []).forEach((am: any) => {
            if (payload && (formData.arrival_no === am.amad_no || formData.arrival_no === am.temporary_arrival_no)) return;
            totalReceivedMt += (Number(am.weight_qtl) || 0) / 10;
          });
        }

        totalReceivedMt += totalWeightSum;

        const contractWeight = Number(matchedPo.total_contract_mt) || 0;
        const isComplete = contractWeight > 0 && totalReceivedMt >= (contractWeight - 0.01);
        const newStatus = isComplete ? 'completed' : 'in progress';

        if (matchedPo.po_id) {
          await dbModule.update('purchase_master', 'po_id', matchedPo.po_id, {
            pending: !isComplete,
            status: newStatus
          }).catch((err) => console.warn("Failed to update purchase_master status:", err));
        }

        if (supabase) {
          const exactSaudaRef = String(matchedPo.sauda_no || matchedPo.contract_po_no || currentPoNo).trim();
          if (exactSaudaRef) {
            Promise.resolve(supabase.from('sauda_master').update({ status: newStatus }).or(`sauda_no.eq.${exactSaudaRef},session.eq.${currentPoNo}`)).catch(() => {});
          }
        }
      }
    } catch (err) {
      console.warn("Error running PO/Sauda status trigger logic:", err);
    }
  }

  return { success: true, payload };
}
