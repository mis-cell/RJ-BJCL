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

    const reconcileAndNormalizeRecord = async (record: any) => {
      if (!record) return null;
      const updated = { ...record };
      let changed = false;

      // Reconcile against live arrivals/inspections if record appears stale (e.g. saved when fewer lorries had arrived)
      if (supabase && Number(updated.contract_weight_mt) > 0) {
        try {
          const [miRes, tmrRes, faRes] = await Promise.all([
            supabase.from('material_inspection').select('mr_no, arrival_no, final_arrival_no, date, inspection_date, created_at, total_final_receipt_wt, final_receipt_wt, weight_reduced, reduced_weight, electronic_net_weight, final_weight_mt, weight_qtl, weight').ilike('po_no', `%${rawPoNo}%`).then(r => r.data || [], () => []),
            supabase.from('temporary_material_received').select('temporary_arrival_no, amad_no, mr_no, arrival_no, date, arrival_date, created_at, total_final_receipt_wt, final_receipt_wt, weight_reduced, reduced_weight, electronic_net_weight, final_weight_mt, weight_qtl, weight').ilike('po_no', `%${rawPoNo}%`).then(r => r.data || [], () => []),
            supabase.from('final_arrival').select('final_arrival_no, mr_no, arrival_no, date, arrival_date, created_at, weight_qtl, electronic_net_weight, challan_material_weight, weight').ilike('po_no', `%${rawPoNo}%`).then(r => r.data || [], () => [])
          ]);

          const uniqueMrMap = new Map<string, any>();
          (miRes || []).forEach((insp: any) => {
            const num = String(insp.mr_no || insp.arrival_no || insp.final_arrival_no || '').trim();
            if (num) uniqueMrMap.set(num.toUpperCase(), { mrNo: num, source: insp });
          });
          (tmrRes || []).forEach((ar: any) => {
            const num = String(ar.temporary_arrival_no || ar.amad_no || ar.mr_no || ar.arrival_no || '').trim();
            if (num && !uniqueMrMap.has(num.toUpperCase())) uniqueMrMap.set(num.toUpperCase(), { mrNo: num, source: ar });
          });
          (faRes || []).forEach((ar: any) => {
            const num = String(ar.final_arrival_no || ar.mr_no || ar.arrival_no || '').trim();
            if (num && !uniqueMrMap.has(num.toUpperCase())) uniqueMrMap.set(num.toUpperCase(), { mrNo: num, source: ar });
          });

          const mrEntries = Array.from(uniqueMrMap.values());
          if (mrEntries.length > 0) {
            // Compute total Final Arrival weight for fallback split (same as ExcessShortSettlementModal)
            const faTotalMt = (faRes || []).reduce((sum: number, f: any) => {
              const w = Number(f.weight_qtl) > 0 ? Number(f.weight_qtl) / 10 : Number(f.electronic_net_weight || f.challan_material_weight || 0);
              return sum + w;
            }, 0);

            let liveClaimSumMt = 0;
            mrEntries.forEach((entry) => {
              const src = entry.source;
              let claimMt = 0;
              if (src) {
                claimMt = Number(src.total_final_receipt_wt || src.final_receipt_wt || src.weight_reduced || src.reduced_weight || src.electronic_net_weight || src.final_weight_mt || 0);
                if (claimMt <= 0 && src.weight_qtl) claimMt = Number(src.weight_qtl) / 10;
                if (claimMt <= 0 && src.weight) {
                  const w = Number(src.weight);
                  claimMt = w > 500 ? w / 100 : (w > 50 ? w / 10 : w);
                }
              }
              if (claimMt <= 0) {
                const baseTotal = faTotalMt > 0 ? faTotalMt : Number(updated.contract_weight_mt);
                claimMt = baseTotal / mrEntries.length;
              }
              liveClaimSumMt += claimMt;
            });

            const roundedLiveMt = Math.round(liveClaimSumMt * 1000) / 1000;
            const contractMt = Number(updated.contract_weight_mt);
            const tolMt = Math.round(contractMt * 0.03 * 1000) / 1000;
            const minAccMt = Math.max(0, Math.round((contractMt - tolMt) * 1000) / 1000);
            const maxAccMt = Math.round((contractMt + tolMt) * 1000) / 1000;

            if (roundedLiveMt > 0 && Math.abs(roundedLiveMt - Number(updated.total_received_mt || 0)) > 0.05) {
              updated.total_received_mt = roundedLiveMt;
              updated.variation_mt = Number((contractMt - roundedLiveMt).toFixed(3));
              updated.arrival_numbers = mrEntries.map(e => e.mrNo).join(', ');

              if (roundedLiveMt >= minAccMt - 0.0001 && roundedLiveMt <= maxAccMt + 0.0001) {
                updated.variation_type = 'within_tolerance';
                updated.deduction_qty_mt = 0;
                updated.deduction_qty_qtl = 0;
                updated.deduction_amount = 0;
                updated.remarks = 'Within 3% Exemption – No Deduction';
              } else if (roundedLiveMt > maxAccMt + 0.0001) {
                updated.variation_type = 'excess';
                const exMt = Math.max(0, Math.round((roundedLiveMt - maxAccMt) * 1000) / 1000);
                const exQtl = Math.round(exMt * 10 * 100) / 100;
                updated.deduction_qty_mt = exMt;
                updated.deduction_qty_qtl = exQtl;
              } else {
                updated.variation_type = 'short';
                const shMt = Math.max(0, Math.round((minAccMt - roundedLiveMt) * 1000) / 1000);
                const shQtl = Math.round(shMt * 10 * 100) / 100;
                updated.deduction_qty_mt = shMt;
                updated.deduction_qty_qtl = shQtl;
                const sRate = Number(updated.sauda_rate || 0);
                const mRate = Number(updated.satta_rate || 0);
                const diff = Math.abs(sRate - mRate);
                updated.rate_difference = diff;
                if (updated.rate_basis !== 'custom') updated.applicable_rate = diff;
                updated.deduction_amount = Math.round(shQtl * Number(updated.applicable_rate || 0) * 100) / 100;
              }
              changed = true;
            }
          }
        } catch (_e) {}
      }

      // Enforce Excess Satta Rate Rule:
      // For Excess: If Last MR Date Satta Rate >= Sauda Date Satta Rate (e.g. Sauda 13000 & Last MR 13500),
      // DO NOT DEDUCT — It is Applicable for Sauda (Deduction = ₹0).
      if (updated.variation_type === 'excess' && updated.rate_basis !== 'custom') {
        const sRate = Number(updated.sauda_rate || 0);
        const mRate = Number(updated.satta_rate || 0);
        if (mRate >= sRate) {
          if (Number(updated.deduction_amount) !== 0 || Number(updated.rate_difference) !== 0) {
            updated.rate_difference = 0;
            updated.applicable_rate = 0;
            updated.deduction_amount = 0;
            updated.remarks = `Applicable for Sauda – No Deduction: Last MR Rate (₹${mRate}) >= Sauda Rate (₹${sRate})`;
            changed = true;
          }
        } else {
          const exDiff = sRate - mRate;
          const expectedAmt = Math.round(Number(updated.deduction_qty_qtl || 0) * exDiff * 100) / 100;
          if (Number(updated.deduction_amount) !== expectedAmt || Number(updated.rate_difference) !== exDiff) {
            updated.rate_difference = exDiff;
            updated.applicable_rate = exDiff;
            updated.deduction_amount = expectedAmt;
            updated.remarks = `Excess Weight Deduction: Deductible ${Number(updated.deduction_qty_qtl || 0).toFixed(2)} Qtl at ₹${exDiff}/Qtl = ₹${expectedAmt}.`;
            changed = true;
          }
        }
      }

      if (changed) {
        try {
          localStorage.setItem(`sauda_settlement_${cleanAlphaPo}`, JSON.stringify(updated));
          localStorage.setItem(`sauda_settlement_${rawPoNo}`, JSON.stringify(updated));
        } catch (_e) {}
        if (supabase && updated.id) {
          dbModule.update('sauda_check_point_deductions', 'id', updated.id, {
            total_received_mt: updated.total_received_mt,
            variation_type: updated.variation_type,
            variation_mt: updated.variation_mt,
            rate_difference: updated.rate_difference,
            applicable_rate: updated.applicable_rate,
            deduction_qty_mt: updated.deduction_qty_mt,
            deduction_qty_qtl: updated.deduction_qty_qtl,
            deduction_amount: updated.deduction_amount,
            arrival_numbers: updated.arrival_numbers,
            remarks: updated.remarks,
            updated_at: new Date().toISOString()
          }).catch(() => {});
        }
      }

      return updated;
    };

    // 1. Check Supabase sauda_check_point_deductions table first for authoritative record
    if (supabase) {
      const { data: directList } = await supabase
        .from('sauda_check_point_deductions')
        .select('*');

      if (directList && directList.length > 0) {
        const found = directList.find((item: any) => {
          const itemPo = String(item.po_no || '').trim().replace(/^#/, '').toUpperCase();
          const itemSauda = String(item.sauda_no || item.po_contract || '').trim().replace(/^#/, '').toUpperCase();
          const itemPoClean = itemPo.replace(/[^a-zA-Z0-9]/g, '');
          const itemSaudaClean = itemSauda.replace(/[^a-zA-Z0-9]/g, '');
          return itemPo === rawPoNo.toUpperCase() ||
                 itemSauda === rawPoNo.toUpperCase() ||
                 (cleanAlphaPo && itemPoClean === cleanAlphaPo) ||
                 (cleanAlphaPo && itemSaudaClean === cleanAlphaPo) ||
                 itemPo.includes(rawPoNo.toUpperCase()) ||
                 rawPoNo.toUpperCase().includes(itemPo);
        });

        if (found) return await reconcileAndNormalizeRecord(found);
      }
    }

    // 2. Check local storage cache
    const localSavedStr = localStorage.getItem(`sauda_settlement_${cleanAlphaPo}`) || 
                          localStorage.getItem(`sauda_settlement_${rawPoNo}`);
    if (localSavedStr) {
      try {
        const parsed = JSON.parse(localSavedStr);
        if (parsed && Number(parsed.deduction_amount) >= 0) {
          return await reconcileAndNormalizeRecord(parsed);
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
      if (found) return await reconcileAndNormalizeRecord(found);
    }
  } catch (err) {
    console.warn("Could not fetch sauda checkpoint deduction:", err);
  }
  return null;
};
