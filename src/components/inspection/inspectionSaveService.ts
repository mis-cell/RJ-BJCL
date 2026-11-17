import { supabase } from "../../lib/supabase";
import { dbModule, notifyDataChanged } from "../../services/dbModule";
import { getCurrentUserContext } from "../../lib/permissions";
import { logChange } from "../../services/auditLogService";
import {
  DeductionRow,
  InspectionMasterRecord,
  InspectionDetailRow,
} from "../../types/inspection.types";
import { sanitizeDate } from "../../utils/inspectionCalculations";
import { checkAndProcessReturnLorryOnInspection } from "../../services/returnLorryService";
import { syncExcessShortDeductionForSinglePo } from "../../services/excessShortAutoSyncService";

export interface SaveInspectionResult {
  success: boolean;
  message?: string;
  returnCheck?: any;
}

export async function saveInspectionRecordToDb(
  headerForm: InspectionMasterRecord,
  detailRows: InspectionDetailRow[],
  deductionRows: DeductionRow[]
): Promise<SaveInspectionResult> {
  const cleanMrNo = headerForm.mr_no.trim();
  const validDetails = detailRows.filter(
    (r) =>
      r.arrival_grade ||
      r.stock_grade_name ||
      Number(r.challan_gross_wt) > 0 ||
      Number(r.quantity) > 0
  );

  if (validDetails.length === 0) {
    throw new Error(
      "Cannot save inspection: Please fill in at least one inspection detail row with Grade/Quality, Quantity, and Moisture before saving."
    );
  }

  const totalReceiptGrossMt = Math.round(
    validDetails.reduce(
      (sum, r) => sum + (Number(r.challan_gross_wt) || Number(r.receipt_gross_wt) || 0),
      0
    ) * 1000
  ) / 1000;
  const totalFinalReceiptNetMt = Math.round(
    validDetails.reduce(
      (sum, r) => sum + (Number(r.final_receipt_wt) || Number(r.reduced_weight) || Number(r.challan_gross_wt) || Number(r.receipt_gross_wt) || 0),
      0
    ) * 1000
  ) / 1000;
  const totalBalesCount = validDetails.reduce(
    (sum, r) => sum + (Number(r.quantity) || 0),
    0
  );

  const resolvedArrivalDate = sanitizeDate(headerForm.mr_date || headerForm.arrival_date);
  const resolvedMrDate = sanitizeDate(headerForm.mr_date || headerForm.arrival_date);
  const resolvedPoDate = sanitizeDate(headerForm.po_date);

  const hasHeaderActualMoisture =
    headerForm.actual_moisture !== undefined &&
    headerForm.actual_moisture !== null &&
    String(headerForm.actual_moisture).trim() !== "" &&
    !isNaN(Number(headerForm.actual_moisture));
  const savedHeaderActualMoisture = hasHeaderActualMoisture
    ? Number(headerForm.actual_moisture)
    : null;

  const hasHeaderClaimMoisture =
    headerForm.claim_moisture !== undefined &&
    headerForm.claim_moisture !== null &&
    String(headerForm.claim_moisture).trim() !== "" &&
    !isNaN(Number(headerForm.claim_moisture));
  const savedHeaderClaimMoisture = hasHeaderClaimMoisture
    ? Number(headerForm.claim_moisture)
    : null;

  const masterPayload = {
    mr_no: cleanMrNo,
    mr_date: resolvedMrDate,
    date: resolvedArrivalDate,
    arrival_no: headerForm.arrival_no || null,
    arrival_date: resolvedArrivalDate,
    po_no: headerForm.po_no || null,
    po_date: resolvedPoDate,
    broker_name: headerForm.broker_name || "",
    supplier_name: headerForm.supplier_name || "",
    lorry_number: headerForm.lorry_number || "",
    challan_gross_wt: totalReceiptGrossMt,
    receipt_gross_wt: totalReceiptGrossMt,
    gross_weight: totalReceiptGrossMt,
    final_receipt_wt: totalFinalReceiptNetMt,
    total_final_receipt_wt: totalFinalReceiptNetMt,
    reduced_weight: totalFinalReceiptNetMt,
    total_packets: totalBalesCount,
    actual_moisture: savedHeaderActualMoisture,
    claim_moisture: savedHeaderClaimMoisture,
    actual_dust: Number(headerForm.actual_dust) || 0,
    claim_dust: Number(headerForm.claim_dust) || 0,
    actual_ncv: Number(headerForm.actual_ncv) || 0,
    claim_ncv: Number(headerForm.claim_ncv) || 0,
    detention_days: Number(headerForm.detention_days) || 0,
    unloading_date: sanitizeDate(headerForm.unloading_date),
    mill_po_no: headerForm.mill_po_no || headerForm.po_no || "",
    mill_po_date: sanitizeDate(headerForm.mill_po_date || headerForm.po_date),
    mr_spcl_print: headerForm.mr_spcl_print || "",
    remarks: headerForm.remarks || "",
    deduction_type: headerForm.deduction_type || "",
    deduction_rate: Number(headerForm.deduction_rate) || 0,
    deduction_qty: Number(headerForm.deduction_qty) || 0,
    deduction_amount: Number(headerForm.deduction_amount) || 0,
    arival_apmc_fees: Number(
      headerForm.arival_apmc_fees ?? (headerForm as any).apmc_fees ?? 0
    ),
    status: "Completed",
    grid_details: JSON.stringify(validDetails),
  };

  const detailInserts = validDetails.map((d, i) => {
    const netto = Number(d.receipt_gross_wt || d.challan_gross_wt || 0);
    const hasUserMoistureAct =
      d.moisture_act !== undefined &&
      d.moisture_act !== null &&
      String(d.moisture_act).trim() !== "" &&
      !isNaN(Number(d.moisture_act));
    const savedMoistureAct = hasUserMoistureAct ? Number(d.moisture_act) : null;
    const hasUserMoistureClaim =
      d.moisture_claim !== undefined &&
      d.moisture_claim !== null &&
      String(d.moisture_claim).trim() !== "" &&
      !isNaN(Number(d.moisture_claim));
    const savedMoistureClaim = hasUserMoistureClaim ? Number(d.moisture_claim) : null;

    return {
      mr_no: cleanMrNo,
      po_no: headerForm.po_no || null,
      srl_no: i + 1,
      arrival_grade: d.arrival_grade || d.stock_grade_name || "",
      stock_grade_code: d.stock_grade_code || "",
      stock_grade_name: d.stock_grade_name || d.arrival_grade || "",
      area: d.area || "",
      agency: d.agency || "",
      agency_code: d.agency_code || "",
      marks: d.marks || "",
      crop_year: d.crop_year || "2026-27",
      lot: d.lot || "",
      quantity: Number(d.quantity) || 0,
      unit: d.unit || "BALES",
      rate: Number(d.rate) || 0,
      rate_qntl: Number(d.rate_qntl || d.rate || 0),
      challan_gross_wt: Number(d.challan_gross_wt || netto),
      receipt_gross_wt: netto,
      gross_weight_batch: Number(d.gross_weight_batch || netto),
      add_weight: Number(d.add_weight || 0),
      less_weight: Number(d.less_weight || 0),
      reduced_weight: Number(d.reduced_weight || netto),
      lorry_read_min:
        d.lorry_read_min !== undefined &&
        d.lorry_read_min !== null &&
        String(d.lorry_read_min).trim() !== ""
          ? Number(d.lorry_read_min)
          : null,
      lorry_read_max:
        d.lorry_read_max !== undefined &&
        d.lorry_read_max !== null &&
        String(d.lorry_read_max).trim() !== ""
          ? Number(d.lorry_read_max)
          : null,
      lorry_read_avg:
        d.lorry_read_avg !== undefined &&
        d.lorry_read_avg !== null &&
        String(d.lorry_read_avg).trim() !== ""
          ? Number(d.lorry_read_avg)
          : null,
      lorry_moisture_min:
        d.lorry_read_min !== undefined &&
        d.lorry_read_min !== null &&
        String(d.lorry_read_min).trim() !== ""
          ? Number(d.lorry_read_min)
          : null,
      lorry_moisture_max:
        d.lorry_read_max !== undefined &&
        d.lorry_read_max !== null &&
        String(d.lorry_read_max).trim() !== ""
          ? Number(d.lorry_read_max)
          : null,
      lorry_moisture_avg:
        d.lorry_read_avg !== undefined &&
        d.lorry_read_avg !== null &&
        String(d.lorry_read_avg).trim() !== ""
          ? Number(d.lorry_read_avg)
          : null,
      insp_read_min:
        d.insp_read_min !== undefined &&
        d.insp_read_min !== null &&
        String(d.insp_read_min).trim() !== ""
          ? Number(d.insp_read_min)
          : null,
      insp_read_max:
        d.insp_read_max !== undefined &&
        d.insp_read_max !== null &&
        String(d.insp_read_max).trim() !== ""
          ? Number(d.insp_read_max)
          : null,
      insp_read_avg:
        d.insp_read_avg !== undefined &&
        d.insp_read_avg !== null &&
        String(d.insp_read_avg).trim() !== ""
          ? Number(d.insp_read_avg)
          : null,
      insp_moisture_min:
        d.insp_read_min !== undefined &&
        d.insp_read_min !== null &&
        String(d.insp_read_min).trim() !== ""
          ? Number(d.insp_read_min)
          : null,
      insp_moisture_max:
        d.insp_read_max !== undefined &&
        d.insp_read_max !== null &&
        String(d.insp_read_max).trim() !== ""
          ? Number(d.insp_read_max)
          : null,
      insp_moisture_avg:
        d.insp_read_avg !== undefined &&
        d.insp_read_avg !== null &&
        String(d.insp_read_avg).trim() !== ""
          ? Number(d.insp_read_avg)
          : null,
      moisture_act: savedMoistureAct,
      actual_moisture: savedMoistureAct,
      moisture_claim: savedMoistureClaim,
      claim_moisture: savedMoistureClaim,
      dust_act: Number(
        d.dust_act !== undefined
          ? d.dust_act
          : d.actual_dust !== undefined
          ? d.actual_dust
          : Number(headerForm.actual_dust) || 0
      ),
      actual_dust: Number(
        d.actual_dust !== undefined
          ? d.actual_dust
          : d.dust_act !== undefined
          ? d.dust_act
          : Number(headerForm.actual_dust) || 0
      ),
      dust_claim: Number(
        d.dust_claim !== undefined
          ? d.dust_claim
          : d.claim_dust !== undefined
          ? d.claim_dust
          : Number(headerForm.claim_dust) || 0
      ),
      claim_dust: Number(
        d.claim_dust !== undefined
          ? d.claim_dust
          : d.dust_claim !== undefined
          ? d.dust_claim
          : Number(headerForm.claim_dust) || 0
      ),
      ncv_act: Number(
        d.ncv_act !== undefined
          ? d.ncv_act
          : d.actual_ncv !== undefined
          ? d.actual_ncv
          : Number(headerForm.actual_ncv) || 0
      ),
      actual_ncv: Number(
        d.actual_ncv !== undefined
          ? d.actual_ncv
          : d.ncv_act !== undefined
          ? d.ncv_act
          : Number(headerForm.actual_ncv) || 0
      ),
      ncv_claim: Number(
        d.ncv_claim !== undefined
          ? d.ncv_claim
          : d.claim_ncv !== undefined
          ? d.claim_ncv
          : Number(headerForm.claim_ncv) || 0
      ),
      claim_ncv: Number(
        d.claim_ncv !== undefined
          ? d.claim_ncv
          : d.ncv_claim !== undefined
          ? d.ncv_claim
          : Number(headerForm.claim_ncv) || 0
      ),
      grade_down_act: Number(d.grade_down_act || d.actual_grade_down || 0),
      actual_grade_down: Number(d.actual_grade_down || d.grade_down_act || 0),
      grade_down_claim: Number(d.grade_down_claim || d.claim_grade_down || 0),
      claim_grade_down: Number(d.claim_grade_down || d.grade_down_claim || 0),
      final_receipt_wt: Number(d.final_receipt_wt || netto),
      settlement_moisture: savedMoistureAct,
      settlement_grade_down: Number(
        d.settlement_grade_down !== undefined
          ? d.settlement_grade_down
          : d.grade_down_act || 0
      ),
      settlement_dust: Number(
        d.settlement_dust !== undefined
          ? d.settlement_dust
          : d.dust_act || Number(headerForm.actual_dust) || 0
      ),
      settlement_ncv: Number(
        d.settlement_ncv !== undefined
          ? d.settlement_ncv
          : d.ncv_act || Number(headerForm.actual_ncv) || 0
      ),
      ropes_weight: Number(d.ropes_weight || 0),
      ropes_tot_wt_grd: Number(d.ropes_tot_wt_grd || 0),
      ropes_grade: d.ropes_grade || "",
      chotta_weight: Number(d.chotta_weight || 0),
      chotta_tot_wt_grd: Number(d.chotta_tot_wt_grd || 0),
      chotta_grade: d.chotta_grade || "",
      tolerable: d.tolerable || "Yes",
      premium: d.premium || "",
      is_premium: Boolean(d.is_premium),
      amount: Number(d.amount || 0),
      qty_in_mt: Number(d.qty_in_mt || 0),
      row_remarks: d.row_remarks || "",
      jci_remarks: d.jci_remarks || d.jqi_remarks || "",
      created_at: new Date().toISOString(),
    };
  });

  const activeDeductions = deductionRows.filter(
    (r) => r.deduction_type && r.deduction_type.trim() !== ""
  );
  const dedInserts = activeDeductions.map((r) => ({
    mr_no: cleanMrNo,
    deduction_type: r.deduction_type,
    deduction_rate: Number(r.deduction_rate) || 0,
    deduction_qty: Number(r.deduction_qty) || 0,
    deduction_amount: Number(r.deduction_amount) || 0,
    remarks: r.remarks || "",
    created_at: new Date().toISOString(),
  }));

  const sqlVal = (v: any) => {
    if (v === null || v === undefined) return "NULL";
    if (typeof v === "number") return isFinite(v) ? String(v) : "0";
    if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
    return `'${String(v).replace(/'/g, "''")}'`;
  };

  try {
    await dbModule.upsert("material_inspection", masterPayload, "mr_no");
    await dbModule.upsert(
      "mill_inspection_master",
      {
        ...masterPayload,
        inspection_no: cleanMrNo,
        supplier: masterPayload.supplier_name,
        broker: masterPayload.broker_name,
        lorry_no: masterPayload.lorry_number,
      },
      "mr_no"
    ).catch(() => {});

    if (supabase) {
      await Promise.all([
        Promise.resolve(
          supabase.from("material_inspection_details").delete().eq("mr_no", cleanMrNo)
        ),
        Promise.resolve(
          supabase.from("mill_inspection_detail").delete().eq("mr_no", cleanMrNo)
        ).catch(() => ({})),
        Promise.resolve(
          supabase.from("material_inspection_deductions").delete().eq("mr_no", cleanMrNo)
        ),
        Promise.resolve(
          supabase.from("mill_inspection_deduction").delete().eq("mr_no", cleanMrNo)
        ).catch(() => ({})),
      ]);

      if (detailInserts.length > 0) {
        await Promise.all([
          Promise.resolve(
            supabase.from("material_inspection_details").insert(detailInserts)
          ),
          Promise.resolve(
            supabase.from("mill_inspection_detail").insert(detailInserts)
          ).catch(() => ({})),
        ]);
      }

      if (dedInserts.length > 0) {
        await Promise.all([
          Promise.resolve(
            supabase.from("material_inspection_deductions").insert(dedInserts)
          ),
          Promise.resolve(
            supabase.from("mill_inspection_deduction").insert(dedInserts)
          ).catch(() => ({})),
        ]);
      }
    }
  } catch (_txErr) {
    if (supabase) {
      await Promise.all([
        Promise.resolve(
          supabase
            .from("material_inspection")
            .upsert(masterPayload, { onConflict: "mr_no" })
        ),
        Promise.resolve(
          supabase.from("mill_inspection_master").upsert(
            {
              ...masterPayload,
              inspection_no: cleanMrNo,
              supplier: masterPayload.supplier_name,
              broker: masterPayload.broker_name,
              lorry_no: masterPayload.lorry_number,
            },
            { onConflict: "mr_no" }
          )
        ).catch(() => ({})),
      ]);

      await Promise.all([
        Promise.resolve(
          supabase.from("material_inspection_details").delete().eq("mr_no", cleanMrNo)
        ),
        Promise.resolve(
          supabase.from("mill_inspection_detail").delete().eq("mr_no", cleanMrNo)
        ).catch(() => ({})),
      ]);

      if (detailInserts.length > 0) {
        await Promise.all([
          Promise.resolve(
            supabase.from("material_inspection_details").insert(detailInserts)
          ),
          Promise.resolve(
            supabase.from("mill_inspection_detail").insert(detailInserts)
          ).catch(() => ({})),
        ]);
      }

      await Promise.all([
        Promise.resolve(
          supabase
            .from("material_inspection_deductions")
            .delete()
            .eq("mr_no", cleanMrNo)
        ),
        Promise.resolve(
          supabase.from("mill_inspection_deduction").delete().eq("mr_no", cleanMrNo)
        ).catch(() => ({})),
      ]);

      if (dedInserts.length > 0) {
        await Promise.all([
          Promise.resolve(
            supabase.from("material_inspection_deductions").insert(dedInserts)
          ),
          Promise.resolve(
            supabase.from("mill_inspection_deduction").insert(dedInserts)
          ).catch(() => ({})),
        ]);
      }
    }
  }

  // Record in Universal Change Log
  const currentUser = getCurrentUserContext();
  const userName =
    currentUser.username || currentUser.userName || currentUser.userId || "Operator";
  await logChange({
    module: "Mill Inspection",
    entity_name: "Inspection Record",
    record_id: cleanMrNo,
    action: "UPDATE",
    field_name: "deduction_amount",
    field_label: `Inspection Deductions (${cleanMrNo})`,
    old_value: "Draft",
    new_value: `₹${Number(headerForm.deduction_amount || 0).toLocaleString("en-IN")}`,
    user_name: userName,
    remarks: `Mill Inspection for PO ${headerForm.po_no || "N/A"}, Supplier: ${headerForm.supplier_name || "N/A"}, Total Bales: ${totalBalesCount}, Gross: ${totalReceiptGrossMt.toFixed(3)} MT`,
  });

  // Check if this Mill Inspection record is a Return Lorry (< 5 MT)
  const returnCheck = await checkAndProcessReturnLorryOnInspection({
    mrNo: cleanMrNo,
    poNo: headerForm.po_no || "",
    arrivalNo: headerForm.arrival_no || cleanMrNo,
    lorryNo: headerForm.lorry_number || "",
    inspectionDate: resolvedMrDate || resolvedArrivalDate || undefined,
    headerForm: { ...headerForm, total_actual_weight: totalReceiptGrossMt },
    detailRows: validDetails,
  });

  // Real-time auto-save Excess & Short deduction calculation to sauda_check_point_deductions
  if (headerForm.po_no && String(headerForm.po_no).trim()) {
    await syncExcessShortDeductionForSinglePo(String(headerForm.po_no).trim()).catch(() => {});
  }

  return {
    success: true,
    returnCheck,
  };
}

export async function deleteInspectionRecordFromDb(
  mr_no: string,
  record?: Partial<InspectionMasterRecord>
): Promise<boolean> {
  const cleanMr = String(mr_no || record?.mr_no || record?.arrival_no || "").trim();
  const cleanId = record?.id !== undefined && record?.id !== null ? String(record.id).trim() : "";
  if (!cleanMr && !cleanId) return false;

  const rawKeys = Array.from(
    new Set(
      [cleanMr, record?.mr_no, record?.arrival_no]
        .map((v) => String(v || "").trim())
        .filter(Boolean)
    )
  );
  const keys = Array.from(
    new Set(rawKeys.map((v) => v.toUpperCase()))
  );
  const fallbackKeys = Array.from(new Set([...rawKeys, ...keys]));

  const currentUser = getCurrentUserContext();
  const userName =
    currentUser.username || currentUser.userName || currentUser.userId || "Operator";

  const esc = (v: string) => `'${v.replace(/'/g, "''")}'`;
  const pgKeyArray = `ARRAY[${keys.map(esc).join(", ")}]::text[]`;

  const doSql = `
    DO $$
    DECLARE
      v_keys TEXT[] := ${keys.length > 0 ? pgKeyArray : "ARRAY[]::text[]"};
      v_id TEXT := ${cleanId ? esc(cleanId) : "NULL"};
      t TEXT;
      child_tbls TEXT[] := ARRAY[
        'material_inspection_details',
        'mill_inspection_detail',
        'material_inspection_deductions',
        'mill_inspection_deduction',
        'inspection_details',
        'inspection_checklist_details'
      ];
      master_tbls TEXT[] := ARRAY[
        'material_inspection',
        'mill_inspection_master',
        'inspection_master',
        'inspection_checklist'
      ];
      has_mr BOOLEAN;
      has_arr BOOLEAN;
      has_insp BOOLEAN;
      has_id BOOLEAN;
    BEGIN
      IF array_length(v_keys, 1) IS NOT NULL THEN
        FOREACH t IN ARRAY child_tbls LOOP
          IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
            SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='mr_no') INTO has_mr;
            SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='arrival_no') INTO has_arr;
            SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='inspection_no') INTO has_insp;
            IF has_mr THEN
              EXECUTE format('DELETE FROM public.%I WHERE TRIM(UPPER(COALESCE(mr_no::text, ''''))) = ANY($1)', t) USING v_keys;
            END IF;
            IF has_arr THEN
              EXECUTE format('DELETE FROM public.%I WHERE TRIM(UPPER(COALESCE(arrival_no::text, ''''))) = ANY($1)', t) USING v_keys;
            END IF;
            IF has_insp THEN
              EXECUTE format('DELETE FROM public.%I WHERE TRIM(UPPER(COALESCE(inspection_no::text, ''''))) = ANY($1)', t) USING v_keys;
            END IF;
          END IF;
        END LOOP;
      END IF;

      FOREACH t IN ARRAY master_tbls LOOP
        IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
          SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='mr_no') INTO has_mr;
          SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='arrival_no') INTO has_arr;
          SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='inspection_no') INTO has_insp;
          SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='id') INTO has_id;
          IF array_length(v_keys, 1) IS NOT NULL THEN
            IF has_mr THEN
              EXECUTE format('DELETE FROM public.%I WHERE TRIM(UPPER(COALESCE(mr_no::text, ''''))) = ANY($1)', t) USING v_keys;
            END IF;
            IF has_arr THEN
              EXECUTE format('DELETE FROM public.%I WHERE TRIM(UPPER(COALESCE(arrival_no::text, ''''))) = ANY($1)', t) USING v_keys;
            END IF;
            IF has_insp THEN
              EXECUTE format('DELETE FROM public.%I WHERE TRIM(UPPER(COALESCE(inspection_no::text, ''''))) = ANY($1)', t) USING v_keys;
            END IF;
          END IF;
          IF v_id IS NOT NULL AND has_id AND t IN ('material_inspection', 'mill_inspection_master') THEN
            EXECUTE format('DELETE FROM public.%I WHERE id::text = $1', t) USING v_id;
          END IF;
        END IF;
      END LOOP;
    END $$;
  `;

  try {
    await dbModule.executeTransaction(doSql);
  } catch (txErr) {
    if (supabase) {
      const targetTables = [
        "material_inspection_details",
        "mill_inspection_detail",
        "material_inspection_deductions",
        "mill_inspection_deduction",
        "material_inspection",
        "mill_inspection_master",
      ];
      for (const tbl of targetTables) {
        for (const k of fallbackKeys) {
          await Promise.resolve(supabase.from(tbl).delete().eq("mr_no", k)).catch(() => {});
          await Promise.resolve(supabase.from(tbl).delete().eq("arrival_no", k)).catch(() => {});
        }
        if (cleanId && (tbl === "material_inspection" || tbl === "mill_inspection_master")) {
          await Promise.resolve(supabase.from(tbl).delete().eq("id", cleanId)).catch(() => {});
        }
      }
    } else {
      throw txErr;
    }
  }

  notifyDataChanged("material_inspection");
  notifyDataChanged("mill_inspection_master");
  notifyDataChanged("material_inspection_details");
  notifyDataChanged("material_inspection_deductions");

  const logKey = cleanMr || cleanId;
  await logChange({
    module: "Mill Inspection",
    entity_name: "Inspection Record",
    record_id: logKey,
    action: "DELETE",
    field_name: "inspection_record",
    field_label: `Deleted Inspection (${logKey})`,
    old_value: `Record ${logKey}`,
    new_value: "DELETED",
    user_name: userName,
    remarks: `Deleted Inspection record ${logKey}`,
  });

  return true;
}
