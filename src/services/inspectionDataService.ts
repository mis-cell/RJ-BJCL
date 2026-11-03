import { supabase } from '../lib/supabase';
import { dbModule } from './dbModule';
import { 
  InspectionMasterRecord, 
  InspectionDetailRow, 
  DeductionRow 
} from '../types/inspection.types';
import { 
  computeDetailRowWeights, 
  calculateRowAmount, 
  sanitizeDate 
} from '../utils/inspectionCalculations';

export const resilientSupabaseUpsert = async (
  client: any,
  table: string,
  record: any,
  matchColumn: string = "mr_no"
) => {
  let payload: Record<string, any> = { ...record };
  let attempts = 0;
  while (attempts < 20) {
    attempts++;
    const matchVal = payload[matchColumn];
    const { data: existing } = await client
      .from(table)
      .select(matchColumn)
      .eq(matchColumn, matchVal)
      .maybeSingle();

    let result;
    if (existing && existing[matchColumn]) {
      result = await client.from(table).update(payload).eq(matchColumn, matchVal).select();
    } else {
      result = await client.from(table).insert(payload).select();
    }

    if (!result.error) {
      return result.data && result.data.length > 0 ? result.data[0] : payload;
    }

    const missingColMatch = result.error.message?.match(/Could not find the '([^']+)' column of/i)
      || result.error.message?.match(/column "([^"]+)" of relation "[^"]+" does not exist/i)
      || result.error.message?.match(/column '([^']+)' does not exist/i);

    if (missingColMatch && missingColMatch[1]) {
      const col = missingColMatch[1];
      console.warn(`[Supabase Resilient Save] Column '${col}' not found in table '${table}', dropping column and retrying...`);
      delete payload[col];
      continue;
    }

    throw result.error;
  }
  return payload;
};

export const resilientSupabaseInsertRows = async (
  client: any,
  table: string,
  rows: any[]
) => {
  if (!rows || rows.length === 0) return [];
  let currentRows: Record<string, any>[] = rows.map(r => ({ ...r }));
  let attempts = 0;
  while (attempts < 20) {
    attempts++;
    const { data, error } = await client.from(table).insert(currentRows).select();
    if (!error) {
      return data || currentRows;
    }

    const missingColMatch = error.message?.match(/Could not find the '([^']+)' column of/i)
      || error.message?.match(/column "([^"]+)" of relation "[^"]+" does not exist/i)
      || error.message?.match(/column '([^']+)' does not exist/i);

    if (missingColMatch && missingColMatch[1]) {
      const col = missingColMatch[1];
      console.warn(`[Supabase Resilient Rows Insert] Column '${col}' not in table '${table}', dropping column and retrying...`);
      currentRows = currentRows.map(r => {
        const copy = { ...r };
        delete copy[col];
        return copy;
      });
      continue;
    }

    throw error;
  }
  return currentRows;
};

export interface PoLoadResult {
  headerPatch?: Partial<InspectionMasterRecord>;
  details: InspectionDetailRow[];
}

export const fetchDetailsForPo = async (poNo: string): Promise<PoLoadResult | null> => {
  if (!poNo) return null;
  const poClean = poNo.trim();
  const poUpper = poClean.toUpperCase();
  let matchedItems: any[] = [];
  let gradeMap: Record<string, string> = {};
  let agencyMap: Record<string, string> = {};
  let markaMap: Record<string, string> = {};
  let pmData: any = null;
  let headerPatch: Partial<InspectionMasterRecord> = {};

  if (supabase) {
    const [pdmRes, scpRes, midRes, pmRes, gradesRes, agenciesRes, markasRes, scpHeaderRes] = await Promise.all([
      supabase.from('purchase_detail_master').select('*').or(`po_no.eq.${poClean},po_no.ilike.${poUpper}`),
      supabase.from('sauda_check_point_details').select('*').or(`po_no.eq.${poClean},po_no.ilike.${poUpper}`),
      supabase.from('material_inspection_details').select('*').or(`mr_no.eq.${poClean},mr_no.ilike.${poUpper},po_no.eq.${poClean}`),
      supabase.from('purchase_master').select('*').or(`po_no.eq.${poClean},po_no.ilike.${poUpper}`),
      supabase.from('grade_master').select('*'),
      supabase.from('agency_master').select('*'),
      supabase.from('marka_master').select('*'),
      supabase.from('sauda_check_point').select('*').or(`po_no.eq.${poClean},po_no.ilike.${poUpper}`)
    ]);

    if (gradesRes.data) {
      gradesRes.data.forEach((g: any) => {
        if (g.grade_code && g.grade_name) gradeMap[g.grade_code] = g.grade_name;
      });
    }
    if (agenciesRes.data) {
      agenciesRes.data.forEach((a: any) => {
        if (a.agency_code && a.agency_name) agencyMap[a.agency_code] = a.agency_name;
      });
    }
    if (markasRes.data) {
      markasRes.data.forEach((m: any) => {
        if (m.marka_code && m.marka_name) markaMap[m.marka_code] = m.marka_name;
      });
    }

    if (pmRes.data && pmRes.data.length > 0) {
      pmData = pmRes.data[0];
      headerPatch = {
        po_no: pmData.po_no || poNo,
        po_date: pmData.po_date || pmData.date,
        supplier_name: pmData.supplier || pmData.challan_supplier,
        broker_name: pmData.broker,
        lorry_number: pmData.lorry_no || pmData.lorry_number
      };
    } else if (scpHeaderRes.data && scpHeaderRes.data.length > 0) {
      const scp = scpHeaderRes.data[0];
      pmData = scp;
      headerPatch = {
        po_no: scp.po_no || poNo,
        po_date: scp.po_date || scp.s_date,
        supplier_name: scp.supplier_name || scp.supplier,
        broker_name: scp.broker_name || scp.broker,
        lorry_number: scp.lorry_number
      };
    }

    matchedItems = (pdmRes.data && pdmRes.data.length > 0)
      ? pdmRes.data
      : ((scpRes.data && scpRes.data.length > 0)
          ? scpRes.data
          : (midRes.data || []));
  }

  if (!matchedItems || matchedItems.length === 0) {
    const [allPdm, allScp] = await Promise.all([
      dbModule.fetchAll('purchase_detail_master').catch(() => []),
      dbModule.fetchAll('sauda_check_point_details').catch(() => [])
    ]);
    const pdm = (allPdm || []).filter((d: any) => String(d.po_no).trim().toUpperCase() === poUpper);
    const scp = (allScp || []).filter((d: any) => String(d.po_no).trim().toUpperCase() === poUpper);
    matchedItems = pdm.length > 0 ? pdm : scp;
  }

  if (matchedItems && matchedItems.length > 0) {
    let resolvedUnitName = (pmData?.unit_name || pmData?.unit || "").toString().trim().toUpperCase();
    if (!resolvedUnitName && matchedItems.length > 0) {
      for (const itm of matchedItems) {
        const u = (itm.unit || itm.unit_name || "").toString().trim().toUpperCase();
        if (u && u !== "BALES") {
          resolvedUnitName = u;
          break;
        }
      }
    }

    const details: InspectionDetailRow[] = matchedItems.map((item: any, i: number) => {
      const gradeCode = item.grade_code || item.receipt_grade_code || item.stock_grade_code || item.item_code || "";
      const resolvedGradeName = gradeMap[gradeCode] || item.grade_name || item.receipt_grade_name || item.challan_grade_name || item.variety || item.item_name || item.grade || gradeCode;
      const agencyCode = item.agency_code || "";
      const resolvedAgencyName = agencyMap[agencyCode] || item.agency_name || item.agency || agencyCode;
      const markaCode = item.marka_code || item.challan_marka_code || "";
      const resolvedMarkaName = markaMap[markaCode] || item.marka_name || item.challan_marka_name || item.marka || item.marks || markaCode;
      const areaName = (item.area_name || item.area || item.arrival_area_name || item.arrival_area || "").toUpperCase();
      const nettoVal = Number(item.netto_pnto !== undefined && item.netto_pnto !== null && item.netto_pnto !== "" ? item.netto_pnto : (item.weight_mt || item.quantity_mt || item.challan_gross_wt || item.receipt_gross_wt || item.gross_weight || item.weight || item.net_wt || 0));
      let qtyVal = 0;
      if (item.quantity_rcpt !== undefined && item.quantity_rcpt !== null && item.quantity_rcpt !== "") {
        qtyVal = Number(item.quantity_rcpt);
      } else if (item.quantity_chln !== undefined && item.quantity_chln !== null && item.quantity_chln !== "") {
        qtyVal = Number(item.quantity_chln);
      } else if (item.quantity !== undefined && item.quantity !== null && item.quantity !== "") {
        qtyVal = Number(item.quantity);
      } else if (item.bales !== undefined && item.bales !== null && item.bales !== "") {
        qtyVal = Number(item.bales);
      }
      const itemUnit = (item.unit || item.unit_name || "").toString().trim().toUpperCase();
      const unitVal = (itemUnit && itemUnit !== "BALES") ? itemUnit : (resolvedUnitName || itemUnit || "BALES");
      const lMin = Number(item.lorry_read_min || item.lorry_moisture_min || 0);
      const lMax = Number(item.lorry_read_max || item.lorry_moisture_max || 0);
      const lAvg = Number(item.lorry_read_avg || (lMin > 0 && lMax > 0 ? (lMin + lMax) / 2 : (lMin || lMax)) || 0);
      const iMin = Number(item.insp_read_min || 0);
      const iMax = Number(item.insp_read_max || 0);
      const iAvg = Number(item.insp_read_avg || (iMin > 0 && iMax > 0 ? (iMin + iMax) / 2 : (iMin || iMax)) || 0);
      const moistAct = Number(item.moisture_act || item.actual_moisture || 0);
      const moistClaim = Number(item.moisture_claim || item.claim_moisture || 0);
      const dustAct = Number(item.dust_act || item.actual_dust || 0);
      const dustClaim = Number(item.dust_claim || item.claim_dust || 0);

      return {
        srl_no: item.srl_no || (i + 1),
        arrival_grade: resolvedGradeName,
        stock_grade_code: gradeCode,
        stock_grade_name: resolvedGradeName,
        area: areaName,
        agency: resolvedAgencyName,
        agency_code: agencyCode,
        marks: resolvedMarkaName,
        crop_year: item.crop_year || "2026-27",
        lot: item.lot || item.lot_no || "",
        quantity: qtyVal,
        unit: unitVal,
        rate: Number(item.rate_qntl || item.rate || 0),
        rate_qntl: Number(item.rate_qntl || item.rate || 0),
        challan_gross_wt: nettoVal,
        receipt_gross_wt: nettoVal,
        gross_weight_batch: Number(item.gross_weight_batch || item.batch_gross_weight || nettoVal || 0),
        add_weight: Number(item.add_weight || 0),
        less_weight: Number(item.less_weight || 0),
        ...computeDetailRowWeights({
          receipt_gross_wt: nettoVal,
          challan_gross_wt: nettoVal,
          reduced_weight: item.reduced_weight !== undefined ? Number(item.reduced_weight) : undefined,
          add_weight: Number(item.add_weight || 0),
          less_weight: Number(item.less_weight || 0),
          moisture_claim: moistClaim,
          dust_claim: dustClaim
        }),
        lorry_moisture_min: lMin,
        lorry_moisture_max: lMax,
        lorry_read_min: lMin,
        lorry_read_max: lMax,
        lorry_read_avg: lAvg,
        insp_read_min: iMin,
        insp_read_max: iMax,
        insp_read_avg: iAvg,
        moisture_act: moistAct,
        moisture_claim: moistClaim,
        dust_act: dustAct,
        dust_claim: dustClaim,
        ncv_act: Number(item.ncv_act || item.actual_ncv || 0),
        ncv_claim: Number(item.ncv_claim || item.claim_ncv || 0),
        grade_down_act: Number(item.grade_down_act || item.grade_down || item.actual_grade_down || 0),
        grade_down_claim: Number(item.grade_down_claim || item.claim_grade_down || 0),
        settlement_moisture: Number(item.settlement_moisture || moistAct),
        settlement_grade_down: Number(item.settlement_grade_down || 0),
        settlement_dust: Number(item.settlement_dust || dustAct),
        settlement_ncv: Number(item.settlement_ncv || 0),
        tolerable: item.tolerable || "Yes",
        premium: item.premium !== undefined && item.premium !== null ? String(item.premium) : "",
        is_premium: item.is_premium || item.premium === "Yes",
        row_remarks: item.remarks || item.row_remarks || "",
        is_auto: true,
        expanded: false
      };
    });

    return { headerPatch, details };
  }

  return null;
};
