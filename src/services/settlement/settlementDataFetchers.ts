import { supabase } from '../../lib/supabase';
import { dbModule } from '../dbModule';
import { resolveGradeName, resolveAgencyName } from './settlementResolvers';

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
      const [pmRes, scpRes, smRes, rlRes] = await Promise.all([
        supabase.from('purchase_master').select('*').or(`po_no.eq."${cleanPo}",po_no.eq."${withHash}",po_no.eq."${poNo}",po_no.eq."${noPtfPo}",po_no.eq."${ptfPo}"`).limit(1).maybeSingle(),
        supabase.from('sauda_check_point').select('*').or(`po_no.eq."${cleanPo}",po_no.eq."${withHash}",po_no.eq."${poNo}",po_no.eq."${noPtfPo}",po_no.eq."${ptfPo}",ptf_no.eq."${cleanPo}",ptf_no.eq."${noPtfPo}",sauda_no.eq."${cleanPo}",sauda_no.eq."${noPtfPo}"`).limit(1).maybeSingle(),
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

      // Also fetch purchase_detail_master and sauda_check_point_details so we never miss rate or premium
      const [pdmRes, scpdRes] = await Promise.all([
        supabase.from('purchase_detail_master').select('*').or(`po_no.eq."${cleanPo}",po_no.eq."${withHash}",po_no.eq."${poNo}"`).order('srl_no', { ascending: true }),
        supabase.from('sauda_check_point_details').select('*').or(`po_no.eq."${cleanPo}",po_no.eq."${withHash}",po_no.eq."${poNo}"`).order('srl_no', { ascending: true })
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
            supabase.from('purchase_detail_master').select('*').ilike('po_no', cleanPo),
            supabase.from('sauda_check_point_details').select('*').ilike('po_no', cleanPo)
          ]);
          if (scpdIlike?.data && scpdIlike.data.length > 0) {
            scpItemsForMerge = [...scpItemsForMerge, ...scpdIlike.data];
          }
          if (pdmIlike?.data && pdmIlike.data.length > 0) poDetails = pdmIlike.data;
          else if (scpdIlike?.data && scpdIlike.data.length > 0) poDetails = scpdIlike.data;
        }
      }
    }

    if (!poData) {
      const [localPm, localScp, localSm] = await Promise.all([
        dbModule.fetchAll('purchase_master').catch(() => []),
        dbModule.fetchAll('sauda_check_point').catch(() => []),
        dbModule.fetchAll('sauda_master').catch(() => [])
      ]);
      const matchPm = (localPm || []).find((p: any) => String(p.po_no || '').trim().toUpperCase().replace(/^#/, '') === cleanPo.toUpperCase());
      const matchScp = (localScp || []).find((p: any) => String(p.po_no || '').trim().toUpperCase().replace(/^#/, '') === cleanPo.toUpperCase());
      const matchSm = (localSm || []).find((s: any) => String(s.sauda_no || s.po_no || s.contract_no || '').trim().toUpperCase().replace(/^#/, '') === cleanPo.toUpperCase());
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
      const matchPdm = (localPdm || []).filter((d: any) => String(d.po_no || '').trim().toUpperCase().replace(/^#/, '') === cleanPo.toUpperCase());
      const matchScpd = (localScpD || []).filter((d: any) => String(d.po_no || '').trim().toUpperCase().replace(/^#/, '') === cleanPo.toUpperCase());
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
    const poWithHash = '#' + rawPoNo;
    const cleanAlphaPo = rawPoNo.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (!cleanAlphaPo) return null;
    const matchesReference = (value: unknown) =>
      String(value ?? '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === cleanAlphaPo;

    // 1. Check Supabase sauda_check_point_deductions table first for authoritative record
    if (supabase) {
      const { data: directList } = await supabase
        .from('sauda_check_point_deductions')
        .select('*')
        .order('updated_at', { ascending: false })
        .order('id', { ascending: false });

      if (directList && directList.length > 0) {
        const found = directList.find((item: any) => matchesReference(item.po_no)) ??
          directList.find((item: any) => matchesReference(item.sauda_no || item.po_contract));

        if (found) return found;
      }
    }

    // 2. Check local storage cache
    const localSavedStr = localStorage.getItem(`sauda_settlement_${cleanAlphaPo}`) || 
                          localStorage.getItem(`sauda_settlement_${rawPoNo}`);
    if (localSavedStr) {
      try {
        const parsed = JSON.parse(localSavedStr);
        if (parsed && Number(parsed.deduction_amount) >= 0 && matchesReference(parsed.po_no)) {
          return parsed;
        }
      } catch (e) {}
    }

    // 3. Fallback check from purchase_master or sauda_check_point excess_short_deduction
    if (supabase) {
      const { data: poRecord } = await supabase
        .from('purchase_master')
        .select('po_no, excess_short_deduction, excess_short_status, total_contract_mt, contract_weight_mt, received_weight_mt, total_received_mt')
        .or(`po_no.eq.${rawPoNo},po_no.eq.${poWithHash}`)
        .maybeSingle();

      if (poRecord && Number(poRecord.excess_short_deduction) > 0) {
        return {
          po_no: poRecord.po_no || rawPoNo,
          deduction_amount: Number(poRecord.excess_short_deduction),
          variation_type: 'short',
          remarks: 'Auto-retrieved from Sauda Check Point Total Short Weight Deduction'
        };
      }

      const { data: scpRecord } = await supabase
        .from('sauda_check_point')
        .select('po_no, excess_short_deduction, excess_short_status')
        .or(`po_no.eq.${rawPoNo},po_no.eq.${poWithHash}`)
        .maybeSingle();

      if (scpRecord && Number(scpRecord.excess_short_deduction) > 0) {
        return {
          po_no: scpRecord.po_no || rawPoNo,
          deduction_amount: Number(scpRecord.excess_short_deduction),
          variation_type: 'short',
          remarks: 'Auto-retrieved from Sauda Check Point Total Short Weight Deduction'
        };
      }
    }

    const localRecords = await dbModule.fetchAll('sauda_check_point_deductions').catch(() => []);
    if (Array.isArray(localRecords) && localRecords.length > 0) {
      const found = localRecords.find((r: any) => {
        const rPo = String(r.po_no || '').trim().replace(/^#/, '').toUpperCase();
        const rPoClean = rPo.replace(/[^a-zA-Z0-9]/g, '');
        return rPo === rawPoNo.toUpperCase() || (cleanAlphaPo && rPoClean === cleanAlphaPo);
      });
      if (found) return found;
    }
  } catch (err) {
    console.warn("Could not fetch sauda checkpoint deduction:", err);
  }
  return null;
};
