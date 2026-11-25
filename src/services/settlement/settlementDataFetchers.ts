import { supabase } from '../../lib/supabase';
import { dbModule } from '../dbModule';
import { resolveGradeName, resolveAgencyName } from './settlementResolvers';
import { syncExcessShortDeductionForSinglePo } from '../excessShortAutoSyncService';
import {
  arePoNumbersExactMatch,
  buildExactPoQueryVariants,
  normalizePoCanonical,
} from '../../lib/contractRelationshipEngine';

const parseGridOrItems = (raw: any): any[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

export const fetchPoAndItemDetails = async (
  poNo: string, 
  gradeMasterList: any[] = [], 
  agencyMasterList: any[] = []
): Promise<{ poData: any; poDetails: any[]; gList: any[]; agList: any[] }> => {
  if (!poNo) return { poData: null, poDetails: [], gList: gradeMasterList, agList: agencyMasterList };
  const cleanPo = String(poNo).trim().replace(/^#/, '');
  const withHash = `#${cleanPo}`;

  let poData: any = null;
  let poDetails: any[] = [];
  let scpItemsForMerge: any[] = [];

  try {
    const resolveContractLorries = (...records: any[]): number => {
      let maxLorries = 0;
      let maxContractMt = 0;
      let maxWtPerLorry = 0;

      for (const r of records) {
        if (!r) continue;
        const cands = [
          r.total_lorries,
          r.total_no_of_lorries,
          r.no_of_lorries,
          r.no_of_lorry,
          r.lorries,
          r.contract_lorries
        ];
        for (const c of cands) {
          const n = parseInt(String(c ?? ''), 10);
          if (!isNaN(n) && n > maxLorries) {
            maxLorries = n;
          }
        }
        if (r.lorry_status) {
          const m = String(r.lorry_status).match(/(\d+)\s*\/\s*(\d+)/);
          if (m && m[2]) {
            const parsedTotal = parseInt(m[2], 10);
            if (!isNaN(parsedTotal) && parsedTotal > maxLorries) {
              maxLorries = parsedTotal;
            }
          }
        }
        const mtCands = [
          r.total_contract_mt,
          r.contract_weight_mt,
          r.sauda_contract_mt,
          r.total_wt_in_ton,
          r.weight_mt
        ];
        for (const mc of mtCands) {
          const val = parseFloat(String(mc ?? ''));
          if (!isNaN(val) && val > maxContractMt) {
            maxContractMt = val;
          }
        }
        if (maxContractMt === 0 && r.quantity) {
          const qVal = parseFloat(String(r.quantity));
          const uStr = String(r.unit || r.unit_type || r.purchase_unit_name || '').toUpperCase();
          if (!isNaN(qVal) && qVal > 0 && (uStr.includes('TON') || uStr === 'MT' || qVal <= 60)) {
            maxContractMt = qVal;
          }
        }
        const wpl = parseFloat(String(r.weight_per_lorry || r.wt_per_lorry || 0));
        if (!isNaN(wpl) && wpl > maxWtPerLorry) {
          maxWtPerLorry = wpl;
        }
      }

      let inferredByWt = 1;
      if (maxContractMt > 0 && maxWtPerLorry > 0 && maxContractMt > maxWtPerLorry * 1.3) {
        inferredByWt = Math.max(1, Math.round(maxContractMt / maxWtPerLorry));
      } else if (maxContractMt >= 15) {
        inferredByWt = Math.max(1, Math.round(maxContractMt / 10));
      }

      return Math.max(1, maxLorries, inferredByWt);
    };

    if (supabase) {
      const noPtfPo = cleanPo.replace(/\(PTF\)/gi, '').trim();
      const ptfPo = `${noPtfPo}(PTF)`;

      // Extract numeric PO suffix so shorthand codes like "PO-291" or "291" match "BJCL/2026-2027/0291" and contract_po_no "0291"
      const lastSeg = noPtfPo.split(/[\/\-]/).pop()?.replace(/[^0-9]/g, '') || '';
      const numVal = lastSeg ? parseInt(lastSeg, 10) : NaN;
      const shortNum = !isNaN(numVal) && numVal > 0 ? String(numVal) : '';
      const paddedNum = shortNum ? shortNum.padStart(4, '0') : '';

      const exactVariants = buildExactPoQueryVariants(cleanPo);
      const pmOrParts: string[] = [];
      const scpOrParts: string[] = [];
      for (const v of exactVariants) {
        const esc = v.replace(/"/g, '\\"');
        pmOrParts.push(`po_no.eq."${esc}"`, `contract_po_no.eq."${esc}"`);
        scpOrParts.push(
          `po_no.eq."${esc}"`,
          `ptf_no.eq."${esc}"`,
          `sauda_no.eq."${esc}"`,
          `contract_po_no.eq."${esc}"`
        );
      }

      // Only allow bare numeric contract lookup if caller explicitly passed a short bare number (no slash / financial year).
      // NEVER use trailing wildcard % (e.g. %/0701%) or strip financial year from a full PO number!
      const isBareNumericInput = /^\d+$/.test(cleanPo);
      if (isBareNumericInput && shortNum && paddedNum) {
        pmOrParts.push(`contract_po_no.eq."${paddedNum}"`, `contract_po_no.eq."${shortNum}"`);
        scpOrParts.push(`contract_po_no.eq."${paddedNum}"`, `contract_po_no.eq."${shortNum}"`);
      }

      const [pmRes, scpRes, smRes, rlRes] = await Promise.all([
        supabase.from('purchase_master').select('*').or(pmOrParts.join(',')).limit(1).maybeSingle(),
        supabase.from('sauda_check_point').select('*').or(scpOrParts.join(',')).limit(1).maybeSingle(),
        supabase.from('sauda_master').select('*').or(`sauda_no.eq."${cleanPo}",sauda_no.eq."${noPtfPo}",session.eq."${cleanPo}",session.eq."${noPtfPo}"`).limit(1).maybeSingle().then(r => r, () => ({ data: null })),
        supabase.from('return_lorry').select('*').or(`po_no.eq."${cleanPo}",new_po_no.eq."${cleanPo}",po_no.eq."${withHash}",new_po_no.eq."${withHash}"`).limit(1).maybeSingle().then(r => r, () => ({ data: null }))
      ]);

      const pm = pmRes?.data || null;
      const scp = scpRes?.data || null;
      const sm = (smRes as any)?.data || null;
      const rl = (rlRes as any)?.data || null;

      if (rl) {
        const totalLorries = resolveContractLorries(rl);
        poData = {
          ...(rl.sauda_snapshot || {}),
          ...rl,
          po_no: rl.new_po_no || rl.po_no,
          reference_po_no: rl.reference_po_no,
          po_date: rl.po_date || rl.s_date,
          supplier: rl.supplier || rl.supplier_name,
          broker: rl.broker || rl.broker_name,
          total_contract_mt: rl.total_contract_mt || rl.received_weight_mt || 0,
          total_lorries: totalLorries,
          total_no_of_lorries: totalLorries,
          no_of_lorries: totalLorries,
          contract_lorries: totalLorries,
          premium: Number(rl.premium || 0),
          items: rl.items || rl.grid_details,
          grid_details: rl.grid_details || rl.items,
          is_return_lorry: true
        };
        const parsedFromRl = parseGridOrItems(rl.items || rl.grid_details);
        if (parsedFromRl.length > 0) {
          scpItemsForMerge = parsedFromRl;
          poDetails = parsedFromRl;
        } else {
          const { data: rldData } = await supabase
            .from('return_lorry_details')
            .select('*')
            .or(`po_no.eq."${cleanPo}",new_po_no.eq."${cleanPo}"`)
            .order('srl_no', { ascending: true })
            .then(r => r, () => ({ data: [] }));
          if (rldData && rldData.length > 0) {
            scpItemsForMerge = rldData;
            poDetails = rldData;
          }
        }
      } else if (pm && scp) {
        const totalLorries = resolveContractLorries(scp, pm, sm);
        const maxContractMt = Math.max(
          Number(pm.total_contract_mt || 0),
          Number(scp.total_contract_mt || 0),
          Number(scp.contract_weight_mt || 0),
          Number(scp.quantity || 0),
          Number(sm?.total_wt_in_ton || sm?.quantity || 0)
        );
        poData = {
          ...pm,
          ...scp,
          po_no: pm.po_no || scp.po_no,
          po_date: pm.po_date || scp.po_date || scp.s_date,
          supplier: pm.supplier || scp.supplier_name || scp.supplier,
          broker: pm.broker || scp.broker_name || scp.broker,
          delivery_to: scp.delivery_to || pm.delivery_to || scp.shipment_date || pm.shipment_date,
          delivery_from: scp.delivery_from || pm.delivery_from,
          delivery_penalty: Number(scp.delivery_penalty ?? pm.delivery_penalty ?? scp.shipment_penalty ?? pm.shipment_penalty ?? 0),
          grace_days: Number(scp.grace_days ?? pm.grace_days ?? 0),
          total_contract_mt: maxContractMt || pm.total_contract_mt || scp.total_contract_mt || scp.quantity || 0,
          total_lorries: totalLorries,
          total_no_of_lorries: totalLorries,
          no_of_lorries: totalLorries,
          contract_lorries: totalLorries,
          premium: Number(scp.premium || pm.premium || 0),
          items: scp.items || pm.items,
          grid_details: scp.grid_details || pm.grid_details
        };
      } else if (pm) {
        const totalLorries = resolveContractLorries(pm, sm);
        const maxContractMt = Math.max(
          Number(pm.total_contract_mt || 0),
          Number(pm.contract_weight_mt || 0),
          Number(sm?.total_wt_in_ton || sm?.quantity || 0)
        );
        poData = {
          ...pm,
          total_contract_mt: maxContractMt || pm.total_contract_mt || 0,
          total_lorries: totalLorries,
          total_no_of_lorries: totalLorries,
          no_of_lorries: totalLorries,
          contract_lorries: totalLorries
        };
      } else if (scp) {
        const totalLorries = resolveContractLorries(scp, sm);
        const maxContractMt = Math.max(
          Number(scp.total_contract_mt || 0),
          Number(scp.contract_weight_mt || 0),
          Number(scp.quantity || 0),
          Number(sm?.total_wt_in_ton || sm?.quantity || 0)
        );
        poData = {
          ...scp,
          po_date: scp.po_date || scp.s_date,
          supplier: scp.supplier_name || scp.supplier,
          broker: scp.broker_name || scp.broker,
          total_contract_mt: maxContractMt || scp.total_contract_mt || scp.quantity || 0,
          total_lorries: totalLorries,
          total_no_of_lorries: totalLorries,
          no_of_lorries: totalLorries,
          contract_lorries: totalLorries,
          pending: scp.pending ?? true,
          status: scp.status || 'temp'
        };
      } else {
        const { data: archPo } = await supabase.from('po_archive').select('*').or(`po_no.eq."${cleanPo}",po_no.eq."${withHash}",po_no.eq."${poNo}"`).maybeSingle();
        if (archPo) {
          const totalLorries = resolveContractLorries(archPo, sm);
          poData = {
            ...archPo,
            total_lorries: totalLorries,
            contract_lorries: totalLorries
          };
        }
      }

      if (!poData) {
        const [pmIlike, scpIlike] = await Promise.all([
          supabase.from('purchase_master').select('*').ilike('po_no', cleanPo).limit(1),
          supabase.from('sauda_check_point').select('*').ilike('po_no', cleanPo).limit(1)
        ]);
        const pmRow = pmIlike?.data?.[0] || null;
        const scpRow = scpIlike?.data?.[0] || null;
        if (pmRow && scpRow) {
          const totalLorries = resolveContractLorries(scpRow, pmRow, sm);
          poData = {
            ...pmRow,
            ...scpRow,
            po_date: pmRow.po_date || scpRow.po_date || scpRow.s_date,
            supplier: pmRow.supplier || scpRow.supplier_name || scpRow.supplier,
            broker: pmRow.broker || scpRow.broker_name || scpRow.broker,
            total_contract_mt: pmRow.total_contract_mt || scpRow.total_contract_mt || scpRow.quantity || 0,
            total_lorries: totalLorries,
            total_no_of_lorries: totalLorries,
            no_of_lorries: totalLorries,
            contract_lorries: totalLorries,
            premium: Number(scpRow.premium || pmRow.premium || 0),
            items: scpRow.items || pmRow.items,
            grid_details: scpRow.grid_details || pmRow.grid_details
          };
        } else if (pmRow) {
          const totalLorries = resolveContractLorries(pmRow, sm);
          poData = {
            ...pmRow,
            total_lorries: totalLorries,
            contract_lorries: totalLorries
          };
        } else if (scpRow) {
          const totalLorries = resolveContractLorries(scpRow, sm);
          poData = {
            ...scpRow,
            po_date: scpRow.po_date || scpRow.s_date,
            supplier: scpRow.supplier_name || scpRow.supplier,
            broker: scpRow.broker_name || scpRow.broker,
            total_contract_mt: scpRow.total_contract_mt || scpRow.quantity || 0,
            total_lorries: totalLorries,
            contract_lorries: totalLorries,
            pending: scpRow.pending ?? true,
            status: scpRow.status || 'temp'
          };
        }
      }

      // Parse embedded JSON items from both scp and pm
      const parsedFromScp = parseGridOrItems(scp?.items || scp?.grid_details);
      const parsedFromPm = parseGridOrItems(pm?.items || pm?.grid_details || poData?.items || poData?.grid_details);
      if (parsedFromScp.length > 0) scpItemsForMerge = parsedFromScp;

      if (parsedFromPm.length > 0 && parsedFromPm.some((it: any) => it.grade || it.grade_name || it.grade_code || it.rate_qntl || it.rate)) {
        poDetails = parsedFromPm;
      } else if (parsedFromScp.length > 0 && parsedFromScp.some((it: any) => it.grade || it.grade_name || it.grade_code || it.rate_qntl || it.rate)) {
        poDetails = parsedFromScp;
      }

      // Also fetch purchase_detail_master and sauda_check_point_details (including canonical poData.po_no if poNo was shorthand like PO-291)
      const canonicalPo = String(poData?.po_no || cleanPo).trim();
      const detailOrParts = [
        `po_no.eq."${cleanPo}"`,
        `po_no.eq."${withHash}"`,
        `po_no.eq."${poNo}"`
      ];
      if (canonicalPo && canonicalPo !== cleanPo) {
        detailOrParts.push(`po_no.eq."${canonicalPo}"`, `po_no.eq."#${canonicalPo}"`);
      }

      const [pdmRes, scpdRes] = await Promise.all([
        supabase.from('purchase_detail_master').select('*').or(detailOrParts.join(',')).order('srl_no', { ascending: true }),
        supabase.from('sauda_check_point_details').select('*').or(detailOrParts.join(',')).order('srl_no', { ascending: true })
      ]);

      if (scpdRes?.data && scpdRes.data.length > 0) {
        scpItemsForMerge = [...scpItemsForMerge, ...scpdRes.data];
      }

      if (poDetails.length === 0) {
        if (pdmRes?.data && pdmRes.data.length > 0) {
          poDetails = pdmRes.data;
        } else if (scpdRes?.data && scpdRes.data.length > 0) {
          poDetails = scpdRes.data;
        } else {
          const [pdmIlike, scpdIlike] = await Promise.all([
            supabase.from('purchase_detail_master').select('*').ilike('po_no', canonicalPo || cleanPo),
            supabase.from('sauda_check_point_details').select('*').ilike('po_no', canonicalPo || cleanPo)
          ]);
          if (scpdIlike?.data && scpdIlike.data.length > 0) {
            scpItemsForMerge = [...scpItemsForMerge, ...scpdIlike.data];
          }
          if (pdmIlike?.data && pdmIlike.data.length > 0) poDetails = pdmIlike.data;
          else if (scpdIlike?.data && scpdIlike.data.length > 0) poDetails = scpdIlike.data;
        }
      }
    }

    // STRICT exact canonical PO matching ONLY — never match by numeric tail digits alone
    const matchesPoCandidate = (recPo: any, recContractPo?: any): boolean => {
      if (arePoNumbersExactMatch(recPo, cleanPo)) return true;
      if (recContractPo && arePoNumbersExactMatch(recContractPo, cleanPo)) return true;
      return false;
    };

    if (!poData) {
      const [localPm, localScp, localSm] = await Promise.all([
        dbModule.fetchAll('purchase_master').catch(() => []),
        dbModule.fetchAll('sauda_check_point').catch(() => []),
        dbModule.fetchAll('sauda_master').catch(() => [])
      ]);
      const matchPm = (localPm || []).find((p: any) => matchesPoCandidate(p.po_no, p.contract_po_no));
      const matchScp = (localScp || []).find((p: any) => matchesPoCandidate(p.po_no, p.contract_po_no || p.ptf_no));
      const matchSm = (localSm || []).find((s: any) => matchesPoCandidate(s.sauda_no || s.po_no || s.contract_no));
      const totalLorries = resolveContractLorries(matchScp, matchPm, matchSm);
      if (matchPm && matchScp) poData = { ...matchPm, ...matchScp, total_lorries: totalLorries, contract_lorries: totalLorries };
      else if (matchPm) poData = { ...matchPm, total_lorries: totalLorries, contract_lorries: totalLorries };
      else if (matchScp) poData = { ...matchScp, total_lorries: totalLorries, contract_lorries: totalLorries };
    }

    if (poDetails.length === 0) {
      const [localPdm, localScpD] = await Promise.all([
        dbModule.fetchAll('purchase_detail_master').catch(() => []),
        dbModule.fetchAll('sauda_check_point_details').catch(() => [])
      ]);
      const canonicalPo = String(poData?.po_no || cleanPo).trim();
      const matchPdm = (localPdm || []).filter((d: any) =>
        matchesPoCandidate(d.po_no) || String(d.po_no || '').trim().toUpperCase() === canonicalPo.toUpperCase()
      );
      const matchScpd = (localScpD || []).filter((d: any) =>
        matchesPoCandidate(d.po_no) || String(d.po_no || '').trim().toUpperCase() === canonicalPo.toUpperCase()
      );
      if (matchScpd.length > 0) scpItemsForMerge = [...scpItemsForMerge, ...matchScpd];
      if (matchPdm.length > 0) poDetails = matchPdm;
      else if (matchScpd.length > 0) poDetails = matchScpd;
    }
  } catch (err) {
    console.warn("Error in fetchPoAndItemDetails:", err);
  }

  let gList = gradeMasterList;
  let agList = agencyMasterList;
  if ((!gList || gList.length === 0 || !agList || agList.length === 0) && supabase) {
    try {
      const [gData, agData] = await Promise.all([
        supabase.from('grade_master').select('*').then(r => r.data || [], () => []),
        supabase.from('agency_master').select('*').then(r => r.data || [], () => [])
      ]);
      if (gData?.length > 0) { gList = gData; }
      if (agData?.length > 0) { agList = agData; }
    } catch (e) {}
  }

  const enrichedItems = poDetails.map((item: any, idx: number) => {
    let gradeName = item.grade_name || item.grade || item.quality || '';
    if (!gradeName && item.grade_code && gList && gList.length > 0) {
      const match = gList.find((g: any) => String(g.grade_code || g.code || g.id || '').trim().toUpperCase() === String(item.grade_code).trim().toUpperCase());
      if (match) gradeName = match.grade_name || match.name || '';
    }

    let agencyName = item.agency_name || item.agency || '';
    if (!agencyName && item.agency_code && agList && agList.length > 0) {
      const match = agList.find((a: any) => String(a.agency_code || a.code || a.id || '').trim().toUpperCase() === String(item.agency_code).trim().toUpperCase());
      if (match) agencyName = match.agency_name || match.name || '';
    }

    const resolvedG = (gradeName || item.grade_code || '').trim().toUpperCase();
    const matchedScpItem = scpItemsForMerge.find((s: any) => {
      const sG = (resolveGradeName(s.grade_name || s.grade || s.quality || s.grade_code, gList) || String(s.grade_name || s.grade || s.grade_code || '')).trim().toUpperCase();
      return Boolean(sG && resolvedG && sG === resolvedG);
    }) || scpItemsForMerge[idx];

    const rateVal = Number(
      item.rate_qntl || item.rate_per_mt || item.rate_mt || item.rate ||
      matchedScpItem?.rate_qntl || matchedScpItem?.rate_per_mt || matchedScpItem?.rate ||
      poData?.b_rate || poData?.rate_qntl || 0
    );
    const premVal = Number(
      item.premium || item.premium_amount || item.prem ||
      matchedScpItem?.premium || matchedScpItem?.premium_amount || matchedScpItem?.prem ||
      poData?.premium || 0
    );

    return {
      ...item,
      grade_name: gradeName || item.grade_code || '',
      agency_name: agencyName || item.agency_code || '',
      rate_qntl: rateVal,
      rate_per_mt: rateVal,
      rate: rateVal,
      premium: premVal
    };
  });

  if (poData && !poData.rate_qntl) {
    poData.rate_qntl = Number(poData.rate_mt || poData.b_rate || 0);
  }

  return { poData, poDetails: enrichedItems, gList, agList };
};

export const fetchSaudaCheckpointDeduction = async (cleanPoNo: string) => {
  if (!cleanPoNo) return null;
  try {
    const rawPoNo = cleanPoNo.trim().replace(/^#/, '');
    const cleanAlphaPo = rawPoNo.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    const findMatchingDeduction = (list: any[]) =>
      (list || []).find((item: any) => {
        const itemPo = String(item.po_no || '').trim().replace(/^#/, '').toUpperCase();
        const itemSauda = String(item.sauda_no || item.po_contract || '').trim().replace(/^#/, '').toUpperCase();
        const itemPoClean = itemPo.replace(/[^a-zA-Z0-9]/g, '');
        const itemSaudaClean = itemSauda.replace(/[^a-zA-Z0-9]/g, '');
        return (
          itemPo === rawPoNo.toUpperCase() ||
          itemSauda === rawPoNo.toUpperCase() ||
          (cleanAlphaPo && itemPoClean === cleanAlphaPo) ||
          (cleanAlphaPo && itemSaudaClean === cleanAlphaPo)
        );
      }) || null;

    if (supabase) {
      // 1. Always reconcile strictly from Mill Inspection (material_inspection / mill_inspection_master)
      //    and live Satta Base Rates via the exact same engine used by Sauda Check Point -> Extra & Short Weight & Rate.
      //    This prevents double-counting lorries whose Temporary Arrival No (e.g. AR01371) differs from their MR No (e.g. MR01370)
      //    and automatically repairs any previously stale/corrupted row in sauda_check_point_deductions.
      const synced = await syncExcessShortDeductionForSinglePo(rawPoNo);
      if (synced) {
        return synced;
      }

      // 2. Fallback: read existing sauda_check_point_deductions row strictly via exact PO variants (NO %substring% wildcard!)
      const exactVariants = buildExactPoQueryVariants(rawPoNo);
      const orClause = exactVariants
        .map(v => `po_no.eq."${v.replace(/"/g, '\\"')}"`)
        .join(',');
      const { data: directList } = orClause
        ? await supabase
            .from('sauda_check_point_deductions')
            .select('*')
            .or(orClause)
            .limit(10)
        : { data: [] };

      const found = (directList || []).find((item: any) =>
        arePoNumbersExactMatch(item.po_no, rawPoNo) ||
        arePoNumbersExactMatch(item.sauda_no || item.po_contract, rawPoNo)
      ) || null;
      if (found) return found;
    } else {
      const localRecords = await dbModule.fetchAll('sauda_check_point_deductions').catch(() => []);
      if (Array.isArray(localRecords) && localRecords.length > 0) {
        return (localRecords || []).find((item: any) =>
          arePoNumbersExactMatch(item.po_no, rawPoNo) ||
          arePoNumbersExactMatch(item.sauda_no || item.po_contract, rawPoNo)
        ) || findMatchingDeduction(localRecords);
      }
    }
  } catch (err) {
    console.warn("Could not fetch sauda checkpoint deduction:", err);
  }
  return null;
};
