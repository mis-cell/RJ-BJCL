import { supabase } from "../../lib/supabase";
import { dbModule } from "../../services/dbModule";
import { comparePoInspection } from "../../lib/poMatch";
import { InspectionMaster, InspectionDetailRow } from "../../types/inspection.types";
import { checkAndProcessReturnLorryOnInspection } from "../../services/returnLorryService";

export interface SaveInspectionParams {
  masterData: InspectionMaster;
  detailsList: InspectionDetailRow[];
  qualityMatrix: any;
  selectedDeductionTypes: string[];
  arrivalVouchers: any[];
  onLogEvent?: (event: string, details: string) => void;
}

export interface SaveInspectionResult {
  success: boolean;
  errorMessage?: string;
  successMessage?: string;
}

export async function saveMaterialInspection({
  masterData,
  detailsList,
  qualityMatrix,
  selectedDeductionTypes,
  arrivalVouchers,
  onLogEvent
}: SaveInspectionParams): Promise<SaveInspectionResult> {
  if (!supabase) {
    return {
      success: false,
      errorMessage: "Local mock persistence failed. Direct database offline."
    };
  }

  const missingFields: string[] = [];
  if (!masterData.mr_no.trim()) missingFields.push("MR No");

  const activeInspectionRows = detailsList.filter(
    (row) => row.arrival_grade || row.stock_grade_code || row.area || row.agency || (Number(row.quantity) || 0) > 0 || (Number(row.challan_gross_wt) || 0) > 0
  );

  if (activeInspectionRows.length === 0) {
    missingFields.push("At least one valid inspection row in details grid");
  }

  if (missingFields.length > 0) {
    const errTxt = "Please complete the required fields for Material Inspection:\n• " + missingFields.join("\n• ");
    return {
      success: false,
      errorMessage: errTxt
    };
  }

  const masterPayload: any = {
    mr_no: masterData.mr_no,
    mr_date: masterData.mr_date || null,
    date: masterData.mr_date || masterData.arrival_date || null,
    arrival_no: masterData.arrival_no,
    arrival_date: masterData.arrival_date || null,
    po_no: masterData.po_no,
    po_date: masterData.po_date || null,
    broker_name: masterData.broker_name,
    broker: masterData.broker_name,
    supplier_name: masterData.supplier_name,
    supplier: masterData.supplier_name,
    actual_moisture: masterData.actual_moisture,
    claim_moisture: masterData.claim_moisture,
    actual_dust: masterData.actual_dust,
    claim_dust: masterData.claim_dust,
    actual_ncv: masterData.actual_ncv,
    claim_ncv: masterData.claim_ncv,
    detention_days: masterData.detention_days,
    unloading_date: masterData.unloading_date || null,
    mill_po_no: masterData.mill_po_no,
    mill_po_date: masterData.mill_po_date || null,
    mr_spcl_print: masterData.mr_spcl_print,
    remarks: masterData.remarks,
    lorry_number: masterData.lorry_number,
    delivery_claim: (masterData as any).delivery_claim || 0,
    deduction_type: (masterData as any).deduction_type || selectedDeductionTypes.join(', '),
    deduction_rate: (masterData as any).deduction_rate || 0,
    deduction_qty: (masterData as any).deduction_qty || 0,
    deduction_amount: (masterData as any).deduction_amount || 0,
    advance_amount: Number((masterData as any).advance_amount) || 0,
    on_account_advance_amount: Number((masterData as any).on_account_advance_amount) || 0,
    settlement_amount: Number((masterData as any).settlement_amount) || 0,
    sent_settlement_date: (masterData as any).sent_settlement_date || null,
    lorry_returned: (masterData as any).lorry_returned || 'No',
    lorry_returned_other_mill: (masterData as any).lorry_returned_other_mill || 'No',
    mr_print_date: (masterData as any).mr_print_date || null,
    consignment_no: (masterData as any).consignment_no || null,
    consignment_date: (masterData as any).consignment_date || null,
    arrival_remarks: (masterData as any).arrival_remarks || null,
    arival_apmc_fees: Number((masterData as any).arival_apmc_fees) || 0,
    quality_matrix: qualityMatrix,
    grid_details: detailsList,
    details: detailsList,
    status: 'Completed'
  };

  if (masterPayload.po_no) {
    try {
      const { data: scpData } = await supabase
        .from('purchase_master')
        .select('po_date')
        .eq('po_no', masterPayload.po_no.trim())
        .maybeSingle();
      if (scpData && scpData.po_date) {
        masterPayload.po_date = scpData.po_date;
        masterPayload.mill_po_date = scpData.po_date;
      } else {
        const { data: scpViewData } = await supabase
          .from('sauda_check_point')
          .select('po_date, s_date')
          .eq('po_no', masterPayload.po_no.trim())
          .maybeSingle();
        if (scpViewData) {
          const matchedPoDate = scpViewData.po_date || scpViewData.s_date;
          if (matchedPoDate) {
            masterPayload.po_date = matchedPoDate;
            masterPayload.mill_po_date = matchedPoDate;
          }
        }
      }
    } catch (poErr) {
      console.warn("Error resolving PO Date source of truth:", poErr);
    }
  }

  const colKeys = ['1st', '2nd', '3rd', '4th'];
  const validRowsToWrite = detailsList
    .filter(
      (row) =>
        row.arrival_grade || row.stock_grade_code || row.area || row.agency,
    )
    .map((row, idx) => {
      const colKey = colKeys[idx];

      const qmGradeDownDept = qualityMatrix.grade_down?.[colKey]?.dept;
      const qmGradeDownClaim = qualityMatrix.grade_down?.[colKey]?.claim;
      const qmGradeDownSett = qualityMatrix.grade_down?.[colKey]?.sett;

      const qmMoistureDept = qualityMatrix.moisture?.[colKey]?.dept;
      const qmMoistureClaim = qualityMatrix.moisture?.[colKey]?.claim;
      const qmMoistureSett = qualityMatrix.moisture?.[colKey]?.sett;

      const qmDustDept = qualityMatrix.dust?.[colKey]?.dept;
      const qmDustClaim = qualityMatrix.dust?.[colKey]?.claim;
      const qmDustSett = qualityMatrix.dust?.[colKey]?.sett;

      const qmNcvDept = qualityMatrix.moc?.[colKey]?.dept;
      const qmNcvClaim = qualityMatrix.moc?.[colKey]?.claim;
      const qmNcvSett = qualityMatrix.moc?.[colKey]?.sett;

      const qmPoRateDept = qualityMatrix.po_rate?.[colKey]?.dept;

      const rowGradeDownAct = Number(qmGradeDownDept ?? row.actual_grade_down ?? row.grade_down_act ?? (idx === 0 ? masterData.actual_grade_down : 0)) || 0;
      const rowGradeDownClaim = Number(qmGradeDownClaim ?? row.claim_grade_down ?? row.grade_down_claim ?? (idx === 0 ? masterData.claim_grade_down : 0)) || 0;
      const rowGradeDownSett = Number(qmGradeDownSett ?? row.settlement_grade_down ?? 0) || 0;

      const rawMoistActVal = qmMoistureDept ?? row.actual_moisture ?? row.moisture_act;
      const rowMoistureAct = rawMoistActVal !== undefined && rawMoistActVal !== null && String(rawMoistActVal).trim() !== "" && !isNaN(Number(rawMoistActVal)) ? Number(rawMoistActVal) : null;

      const rawMoistClaimVal = qmMoistureClaim ?? row.claim_moisture ?? row.moisture_claim;
      const rowMoistureClaim = rawMoistClaimVal !== undefined && rawMoistClaimVal !== null && String(rawMoistClaimVal).trim() !== "" && !isNaN(Number(rawMoistClaimVal)) ? Number(rawMoistClaimVal) : null;

      const rawMoistSettVal = qmMoistureSett ?? row.settlement_moisture;
      const rowMoistureSett = rawMoistSettVal !== undefined && rawMoistSettVal !== null && String(rawMoistSettVal).trim() !== "" && !isNaN(Number(rawMoistSettVal)) ? Number(rawMoistSettVal) : null;

      const rowDustAct = Number(qmDustDept ?? row.actual_dust ?? row.dust_act ?? (idx === 0 ? masterData.actual_dust : 0)) || 0;
      const rowDustClaim = Number(qmDustClaim ?? row.claim_dust ?? row.dust_claim ?? (idx === 0 ? masterData.claim_dust : 0)) || 0;
      const rowDustSett = Number(qmDustSett ?? row.settlement_dust ?? 0) || 0;

      const rowNcvAct = Number(qmNcvDept ?? row.actual_ncv ?? row.ncv_act ?? (idx === 0 ? masterData.actual_ncv : 0)) || 0;
      const rowNcvClaim = Number(qmNcvClaim ?? row.claim_ncv ?? row.ncv_claim ?? (idx === 0 ? masterData.claim_ncv : 0)) || 0;
      const rowNcvSett = Number(qmNcvSett ?? row.settlement_ncv ?? 0) || 0;

      const rowRate = Number(qmPoRateDept ?? row.rate ?? row.rate_qntl ?? 0) || 0;

      const rowGrossWtVal = row.challan_gross_wt === "" ? 0 : Number(row.challan_gross_wt);
      const rowMoistPctVal = rowMoistureClaim || rowMoistureAct || rowMoistureSett || 0;
      const rowDustPctVal = rowDustClaim || rowDustAct || rowDustSett || 0;
      const rowNcvPctVal = rowNcvClaim || rowNcvAct || rowNcvSett || 0;

      const rowMoistureDeductionKg = rowGrossWtVal > 0 && rowMoistPctVal > 0 ? Math.round(rowGrossWtVal * 1000 * (rowMoistPctVal / 100)) : 0;
      const rowDustDeductionKg = rowGrossWtVal > 0 && rowDustPctVal > 0 ? Math.round(rowGrossWtVal * 1000 * (rowDustPctVal / 100)) : 0;
      const rowNcvDeductionKg = rowGrossWtVal > 0 && rowNcvPctVal > 0 ? Math.round(rowGrossWtVal * 1000 * (rowNcvPctVal / 100)) : 0;

      return {
        mr_no: masterData.mr_no,
        srl_no: row.srl_no || idx + 1,
        arrival_grade: row.arrival_grade || "",
        stock_grade_code: row.stock_grade_code || "",
        stock_grade_name: row.stock_grade_name || "",
        area: row.area || "",
        agency: row.agency || "",
        agency_code: (row as any).agency_code || "",
        marka: row.marka || "",
        marks: row.marka || "",
        crop_year: row.crop_year || "2026-27",
        lot: row.lot || "",
        quantity: row.quantity === "" ? 0 : Number(row.quantity),
        unit: row.unit || "BALES",
        rate: rowRate,
        rate_qntl: rowRate,
        challan_gross_wt: row.challan_gross_wt === "" ? 0 : Number(row.challan_gross_wt),
        receipt_gross_wt: Number((row as any).receipt_gross_wt) || 0,
        gross_weight_batch: Number((row as any).gross_weight_batch) || 0,
        add_weight: Number((row as any).add_weight) || 0,
        less_weight: Number((row as any).less_weight) || 0,
        reduced_weight: Number((row as any).reduced_weight) || 0,
        lorry_moisture_min: Number((row as any).lorry_moisture_min) || 0,
        lorry_moisture_max: Number((row as any).lorry_moisture_max) || 0,
        lorry_read_min: Number((row as any).lorry_read_min) || 0,
        lorry_read_max: Number((row as any).lorry_read_max) || 0,
        lorry_read_avg: Number((row as any).lorry_read_avg) || 0,
        insp_read_min: Number((row as any).insp_read_min) || 0,
        insp_read_max: Number((row as any).insp_read_max) || 0,
        insp_read_avg: Number((row as any).insp_read_avg) || 0,
        moisture_act: rowMoistureAct,
        moisture_claim: rowMoistureClaim,
        dust_act: rowDustAct,
        dust_claim: rowDustClaim,
        ncv_act: rowNcvAct,
        ncv_claim: rowNcvClaim,
        grade_down_act: rowGradeDownAct,
        grade_down_claim: rowGradeDownClaim,
        actual_moisture: rowMoistureAct,
        claim_moisture: rowMoistureClaim,
        actual_dust: rowDustAct,
        claim_dust: rowDustClaim,
        actual_ncv: rowNcvAct,
        claim_ncv: rowNcvClaim,
        actual_grade_down: rowGradeDownAct,
        claim_grade_down: rowGradeDownClaim,
        moisture_deduction_kg: rowMoistureDeductionKg,
        dust_deduction_kg: rowDustDeductionKg,
        ncv_deduction_kg: rowNcvDeductionKg,
        final_receipt_wt: Number((row as any).final_receipt_wt) || 0,
        settlement_moisture: rowMoistureSett,
        settlement_grade_down: rowGradeDownSett,
        settlement_dust: rowDustSett,
        settlement_ncv: rowNcvSett,
        ropes_weight: Number((row as any).ropes_weight) || 0,
        ropes_tot_wt_grd: Number((row as any).ropes_tot_wt_grd) || 0,
        ropes_grade: (row as any).ropes_grade || "",
        chotta_weight: Number((row as any).chotta_weight) || 0,
        chotta_tot_wt_grd: Number((row as any).chotta_tot_wt_grd) || 0,
        chotta_grade: (row as any).chotta_grade || "",
        tolerable: (row as any).tolerable || "Yes",
        premium: (row as any).premium !== undefined && (row as any).premium !== null ? String((row as any).premium) : "No",
        is_premium: Boolean((row as any).is_premium),
        row_remarks: (row as any).row_remarks || "",
        jqi_remarks: (row as any).jqi_remarks || "",
        jci_remarks: (row as any).jci_remarks || (row as any).jqi_remarks || "",
      };
    });

  const sqlVal = (v: any) => {
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'number') return isFinite(v) ? String(v) : '0';
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
    return `'${String(v).replace(/'/g, "''")}'`;
  };

  try {
    const mCols = Object.keys(masterPayload);
    const mVals = mCols.map(k => sqlVal(masterPayload[k]));
    const mUpdate = mCols.filter(k => k !== 'mr_no').map(k => `${k} = EXCLUDED.${k}`).join(', ');
    const txQueries: string[] = [
      `INSERT INTO material_inspection (${mCols.join(', ')}) VALUES (${mVals.join(', ')}) ON CONFLICT (mr_no) DO UPDATE SET ${mUpdate};`,
      `DELETE FROM inspection_details WHERE mr_no = ${sqlVal(masterData.mr_no)};`,
      `DELETE FROM inspection_checklist_details WHERE mr_no = ${sqlVal(masterData.mr_no)};`,
      `DELETE FROM mill_inspection_detail WHERE mr_no = ${sqlVal(masterData.mr_no)};`,
      `DELETE FROM material_inspection_details WHERE mr_no = ${sqlVal(masterData.mr_no)};`
    ];
    for (const r of validRowsToWrite) {
      const dCols = Object.keys(r);
      const dVals = dCols.map(k => sqlVal((r as any)[k]));
      txQueries.push(`INSERT INTO material_inspection_details (${dCols.join(', ')}) VALUES (${dVals.join(', ')});`);
      txQueries.push(`INSERT INTO mill_inspection_detail (${dCols.join(', ')}) VALUES (${dVals.join(', ')});`);
    }
    await dbModule.executeTransaction(txQueries);
  } catch (_txErr) {
    const { error: mErr } = await supabase.from("material_inspection").upsert(masterPayload);
    if (mErr) throw mErr;
    await supabase.from("inspection_details").delete().eq("mr_no", masterData.mr_no).then(() => {}, () => {});
    await supabase.from("inspection_checklist_details").delete().eq("mr_no", masterData.mr_no).then(() => {}, () => {});
    await supabase.from("mill_inspection_detail").delete().eq("mr_no", masterData.mr_no).then(() => {}, () => {});
    await supabase.from("material_inspection_details").delete().eq("mr_no", masterData.mr_no).then(() => {}, () => {});
    if (validRowsToWrite.length > 0) {
      await supabase.from("inspection_details").insert(validRowsToWrite).then(() => {}, () => {});
      await supabase.from("inspection_checklist_details").insert(validRowsToWrite).then(() => {}, () => {});
      await supabase.from("mill_inspection_detail").insert(validRowsToWrite).then(() => {}, () => {});
      await supabase.from("material_inspection_details").insert(validRowsToWrite).then(() => {}, () => {});
    }
  }

  try {
    const totalPackets = validRowsToWrite.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
    const totalWeightKgs = validRowsToWrite.reduce((sum, row) => sum + (Number(row.challan_gross_wt) || 0), 0);

    const matchingVoucher = arrivalVouchers.find(
      (v) => (v.temporary_arrival_no || v.amad_no || '').trim().toLowerCase() === (masterData.arrival_no || '').trim().toLowerCase()
    );
    const lorryNo = masterData.lorry_number || matchingVoucher?.lorry_number || matchingVoucher?.lorry_no || matchingVoucher?.vehicle_no || masterData.arrival_no || null;

    await supabase
      .from("final_arrival")
      .upsert({
        mr_no: masterData.mr_no,
        mr_date: masterData.mr_date || null,
        temporary_arrival_no: masterData.arrival_no,
        arrival_date: masterData.arrival_date || null,
        date: masterData.arrival_date || masterData.mr_date || null,
        po_no: masterData.po_no,
        po_date: masterPayload.po_date || null,
        broker: masterData.broker_name,
        broker_name: masterData.broker_name,
        supplier: masterData.supplier_name,
        supplier_name: masterData.supplier_name,
        actual_moisture: masterData.actual_moisture ? Number(masterData.actual_moisture) : null,
        claim_moisture: masterData.claim_moisture ? Number(masterData.claim_moisture) : null,
        actual_dust: masterData.actual_dust ? Number(masterData.actual_dust) : null,
        claim_dust: masterData.claim_dust ? Number(masterData.claim_dust) : null,
        actual_ncv: masterData.actual_ncv ? Number(masterData.actual_ncv) : null,
        claim_ncv: masterData.claim_ncv ? Number(masterData.claim_ncv) : null,
        detention_days: masterData.detention_days ? Number(masterData.detention_days) : null,
        unloading_date: masterData.unloading_date || null,
        remarks: masterData.remarks,
        lorry_number: masterData.lorry_number || lorryNo,
        final_arrival_no: masterData.mr_no,
        total_packets: totalPackets,
        total_actual_weight: totalWeightKgs,
        grid_details: JSON.stringify(validRowsToWrite.map(r => ({
          crop: r.crop_year || '2025-26',
          grade_name: r.arrival_grade || 'TD5',
          marka: r.marka || 'NO MARK',
          qty: Number(r.quantity) || 0,
          weight_kgs: Number(r.challan_gross_wt) || 0,
          area: r.area || '',
          agency: r.agency || ''
        })))
      }, { onConflict: 'mr_no' });
  } catch (e) {
    console.warn("Failed to sync to final_arrival table:", e);
  }

  let successMsgExtra = '';
  let errorMsgExtra = '';

  try {
    if (masterData.po_no && masterData.po_no !== 'N/A' && masterData.po_no.trim() !== '') {
      const { data: tempPo } = await supabase.from('purchase_master').select('*').eq('po_no', masterData.po_no).neq('status', 'final').maybeSingle();
      if (tempPo) {
        const { data: tempPoDetails } = await supabase.from('purchase_detail_master').select('*').eq('po_no', masterData.po_no);
        
        const { data: amad } = await supabase.from('temporary_material_received').select('*').eq('po_no', masterData.po_no).maybeSingle();
        const enrichedInsp: any = { ...masterData, ...(amad || {}) };
        
        enrichedInsp.total_wt_in_ton = validRowsToWrite.reduce((sum, r) => sum + (Number(r.challan_gross_wt) || 0), 0) / 1000;
        enrichedInsp.grid_details = validRowsToWrite.map(r => ({ grade_name: r.arrival_grade, marka: r.marka, area: r.area }));

        const matchRes = comparePoInspection(tempPo, tempPoDetails || [], enrichedInsp, []);
        const isMatch = matchRes.status === 'match';
        const mismatchReason = matchRes.mismatches.map(m => m.field).join(', ') + ' mismatch';

        let savedResolutions: any = {};
        try {
           const raw = localStorage.getItem('bjcl_mismatch_resolutions');
           if (raw && raw !== 'undefined' && raw !== 'null') savedResolutions = JSON.parse(raw);
        } catch(e) {}
        
        const existingMismatch = savedResolutions[`MIS-RUKA-${masterData.po_no}`];
        const isResolved = (existingMismatch && existingMismatch.status === 'resolved' && existingMismatch.decision !== 'REJECT') || tempPo.mismatch_cleared === true;

        if (isMatch || isResolved) {
           const poToInsert = { ...tempPo };
           delete poToInsert.po_id;
           delete poToInsert.created_at;
           
           const { error: insPoErr } = await supabase.from('purchase_master').insert(poToInsert);
           if (!insPoErr) {
              if (tempPoDetails && tempPoDetails.length > 0) {
                 const detailsToInsert = tempPoDetails.map((d: any) => {
                     const copy = { ...d };
                     delete copy.item_id;
                     return copy;
                 });
                 await supabase.from('purchase_detail_master').insert(detailsToInsert);
              }
              await supabase.from('sauda_check_point_details').delete().eq('po_no', masterData.po_no);
              await supabase.from('sauda_check_point').delete().eq('po_no', masterData.po_no);
              
              if (existingMismatch) {
                 delete savedResolutions[`MIS-RUKA-${masterData.po_no}`];
                 localStorage.setItem('bjcl_mismatch_resolutions', JSON.stringify(savedResolutions));
              }
              successMsgExtra = ' | Sauda Check Point moved to Final P.O successfully.';
           }
        } else {
           savedResolutions[`MIS-RUKA-${masterData.po_no}`] = {
              poNo: masterData.po_no,
              supplier: masterData.supplier_name,
              reason: mismatchReason || "Detail fields did not match between Sauda Check Point and Material Inspection",
              status: 'pending',
              timestamp: new Date().toISOString()
           };
           localStorage.setItem('bjcl_mismatch_resolutions', JSON.stringify(savedResolutions));
           errorMsgExtra = `Sauda Check Point could not be moved to Final P.O due to mismatch: ${mismatchReason}. Please resolve in Mismatch section.`;
        }
      }
    }
  } catch (e) {
    console.warn("Failed to process Ruka to Final PO movement:", e);
  }

  // Auto-check Return Lorry (< 5 MT) and copy Sauda Check Point P.O. to Return Lorry (4000 series)
  const returnCheck = await checkAndProcessReturnLorryOnInspection({
    mrNo: masterData.mr_no,
    poNo: masterData.po_no || "",
    arrivalNo: masterData.arrival_no || masterData.mr_no,
    lorryNo: masterData.lorry_number || "",
    inspectionDate: masterData.mr_date || masterData.arrival_date || undefined,
    headerForm: masterData,
    detailRows: validRowsToWrite,
  });

  let baseSuccess = `System Database Updated: Inspection report ${masterData.mr_no} registered successfully!`;
  if (returnCheck.isReturnLorry && returnCheck.newPoNo) {
    baseSuccess = `System Database Updated: Inspection ${masterData.mr_no} saved! [RETURN LORRY < 5 MT: ${returnCheck.weightMt.toFixed(3)} MT -> Generated 4000-Series P.O. #${returnCheck.newPoNo} (Ref: #${returnCheck.referencePoNo})]`;
  }

  if (onLogEvent) {
    onLogEvent(
      "PO_SYNC",
      `Matched & Sync'd Material Inspection [MR: ${masterData.mr_no}] against Purchase P.O [PO: ${masterData.po_no || "N/A"}] with Audit Quantity: ${detailsList.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0)} MT`,
    );
  }

  return {
    success: true,
    successMessage: baseSuccess + successMsgExtra,
    errorMessage: errorMsgExtra || undefined
  };
}
