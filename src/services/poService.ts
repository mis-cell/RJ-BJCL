import { supabase } from '../lib/supabase';
import { dbModule } from './dbModule';
import { PoItemRow } from '../types/purchaseOrder';

export const poService = {
  /**
   * Fetch detail items directly from Supabase ordered strictly by srl_no
   */
  async fetchPoDetails(detailTable: string, poNo: string): Promise<PoItemRow[]> {
    const poNoClean = String(poNo || '').trim();
    if (!poNoClean) return [];

    let details: any[] = [];
    if (supabase) {
      const { data, error } = await supabase
        .from(detailTable)
        .select('*')
        .eq('po_no', poNoClean)
        .order('srl_no', { ascending: true });
      if (!error && data && data.length > 0) {
        details = data;
      }
    }

    return (details || []).map((d: any, idx: number) => ({
      srl: Number(d.srl_no || d.srl || idx + 1),
      crop: String(d.crop_year || d.crop || '2026-27'),
      grade_code: String(d.grade_code || d.quality || ''),
      grade_name: String(d.grade_name || d.quality || d.grade_code || ''),
      agency_code: String(d.agency_code || d.agency || ''),
      agency_name: String(d.agency_name || d.agency || d.agency_code || ''),
      marka_code: String(d.marka_code || d.marka || ''),
      marka_name: String(d.marka_name || d.marka || d.marka_code || ''),
      qty: Number(d.quantity || d.qty || 0),
      weight: Number(d.weight_mt ?? d.weight ?? 0),
      rate: Number(d.rate_qntl ?? d.rate ?? d.rs ?? 0),
      premium: Number(d.premium ?? 0)
    }));
  },

  /**
   * Atomically persist PO detail rows into Supabase and verify returned row count
   */
  async savePoDetails(
    detailTable: string, 
    poNo: string, 
    items: any[], 
    lookupLists?: { gradeList?: any[]; agencyList?: any[]; markaList?: any[] }
  ): Promise<any[]> {
    const finalPoNo = String(poNo || '').trim();
    if (!finalPoNo) {
      throw new Error('Cannot save PO details without a valid PO number.');
    }
    if (!supabase) {
      throw new Error('Database client is not initialized.');
    }

    const grades = lookupLists?.gradeList || [];
    const agencies = lookupLists?.agencyList || [];
    const markas = lookupLists?.markaList || [];

    const itemsToInsert: any[] = [];
    for (let i = 0; i < (items || []).length; i++) {
      const item = items[i];
      if (
        item &&
        (item.grade_code ||
          item.grade_name ||
          item.agency_code ||
          item.agency_name ||
          item.marka_code ||
          item.marka_name ||
          Number(item.qty) > 0 ||
          Number(item.weight) > 0 ||
          Number(item.rate) > 0 ||
          Number(item.premium) > 0)
      ) {
        const rawG = String(item.grade_code || item.grade_name || '').trim();
        const rawA = String(item.agency_code || item.agency_name || '').trim();
        const rawM = String(item.marka_code || item.marka_name || '').trim();

        const gMatch = grades.find((g: any) => g.grade_code === rawG || g.grade_name?.trim().toUpperCase() === rawG.toUpperCase());
        const aMatch = agencies.find((a: any) => a.agency_code === rawA || a.agency_name?.trim().toUpperCase() === rawA.toUpperCase());
        const mMatch = markas.find((m: any) => m.marka_code === rawM || m.marka_name?.trim().toUpperCase() === rawM.toUpperCase());

        const gCode = gMatch ? gMatch.grade_code : String(item.grade_code || rawG).trim();
        const gName = gMatch ? gMatch.grade_name : String(item.grade_name || rawG).trim();
        const aCode = aMatch ? aMatch.agency_code : String(item.agency_code || rawA).trim();
        const aName = aMatch ? aMatch.agency_name : String(item.agency_name || rawA).trim();
        const mCode = mMatch ? mMatch.marka_code : String(item.marka_code || rawM).trim();
        const mName = mMatch ? mMatch.marka_name : String(item.marka_name || rawM).trim();

        itemsToInsert.push({
          po_no: finalPoNo,
          srl_no: i + 1,
          crop_year: String(item.crop || item.crop_year || '2026-27').trim(),
          grade_code: gCode,
          grade_name: gName,
          agency_code: aCode,
          agency_name: aName,
          marka_code: mCode,
          marka_name: mName,
          quantity: Math.round(Number(item.qty || 0)) || 0,
          weight_mt: Number(Number(item.weight || 0).toFixed(3)) || 0,
          rate_qntl: Number(Number(item.rate || 0).toFixed(2)) || 0,
          premium: Number(Number(item.premium || 0).toFixed(2)) || 0
        });
      }
    }

    const esc = (v: any) => `'${String(v ?? '').replace(/'/g, "''")}'`;
    const statements: string[] = [
      `DELETE FROM ${detailTable} WHERE po_no = ${esc(finalPoNo)};`
    ];

    for (const row of itemsToInsert) {
      statements.push(
        `INSERT INTO ${detailTable} (po_no, srl_no, crop_year, grade_code, grade_name, agency_code, agency_name, marka_code, marka_name, quantity, weight_mt, rate_qntl, premium) VALUES (${esc(row.po_no)}, ${Number(row.srl_no)}, ${esc(row.crop_year)}, ${esc(row.grade_code)}, ${esc(row.grade_name)}, ${esc(row.agency_code)}, ${esc(row.agency_name)}, ${esc(row.marka_code)}, ${esc(row.marka_name)}, ${Number(row.quantity)}, ${Number(row.weight_mt)}, ${Number(row.rate_qntl)}, ${Number(row.premium)});`
      );
    }

    try {
      await dbModule.executeTransaction(statements);
    } catch (_txErr) {
      const { error: delErr } = await supabase.from(detailTable).delete().eq('po_no', finalPoNo);
      if (delErr) {
        throw new Error(`Failed to clear existing detail rows in ${detailTable}: ${delErr.message}`);
      }
      if (itemsToInsert.length > 0) {
        const { data: savedRows, error: insErr } = await supabase
          .from(detailTable)
          .insert(itemsToInsert)
          .select();
        if (insErr) {
          throw new Error(`Failed to save PO detail items in ${detailTable}: ${insErr.message}`);
        }
        if (!savedRows || savedRows.length !== itemsToInsert.length) {
          throw new Error(
            `Incomplete PO detail save in ${detailTable}: expected ${itemsToInsert.length} rows, saved ${savedRows?.length || 0}.`
          );
        }
        return savedRows;
      }
    }

    return itemsToInsert;
  }
};
