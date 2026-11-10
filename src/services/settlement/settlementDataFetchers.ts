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

      // Extract numeric PO suffix so shorthand codes like "PO-291" or "291" match "BJCL/2026-2027/0291" and contract_po_no "0291"
      const lastSeg = noPtfPo.split(/[\/\-]/).pop()?.replace(/[^0-9]/g, '') || '';
      const numVal = lastSeg ? parseInt(lastSeg, 10) : NaN;
      const shortNum = !isNaN(numVal) && numVal > 0 ? String(numVal) : '';
      const paddedNum = shortNum ? shortNum.padStart(4, '0') : '';

      const pmOrParts = [
        `po_no.eq."${cleanPo}"`,
        `po_no.eq."${withHash}"`,
        `po_no.eq."${poNo}"`,
        `po_no.eq."${noPtfPo}"`,
        `po_no.eq."${ptfPo}"`,
        `contract_po_no.eq."${cleanPo}"`,
        `contract_po_no.eq."${noPtfPo}"`
      ];
      const scpOrParts = [
        `po_no.eq."${cleanPo}"`,
        `po_no.eq."${withHash}"`,
        `po_no.eq."${poNo}"`,
        `po_no.eq."${noPtfPo}"`,
        `po_no.eq."${ptfPo}"`,
        `ptf_no.eq."${cleanPo}"`,
        `ptf_no.eq."${noPtfPo}"`,
        `sauda_no.eq."${cleanPo}"`,
        `sauda_no.eq."${noPtfPo}"`,
        `contract_po_no.eq."${cleanPo}"`,
        `contract_po_no.eq."${noPtfPo}"`
      ];

      if (shortNum && paddedNum) {
        pmOrParts.push(
          `contract_po_no.eq."${paddedNum}"`,
          `contract_po_no.eq."${shortNum}"`,
          `po_no.ilike."%/${paddedNum}"`,
          `po_no.ilike."%/${shortNum}"`,
          `po_no.ilike."%/${paddedNum}(PTF)"`
        );
        scpOrParts.push(
          `contract_po_no.eq."${paddedNum}"`,
          `contract_po_no.eq."${shortNum}"`,
          `po_no.ilike."%/${paddedNum}"`,
          `po_no.ilike."%/${shortNum}"`,
          `po_no.ilike."%/${paddedNum}(PTF)"`,
          `ptf_no.ilike."%/${paddedNum}%"`
        );
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

    const extractTailDigits = (val: any): string => {
      const s = String(val || '').trim().replace(/^#+/, '').replace(/\(PTF\)/gi, '').trim();
      const seg = s.split(/[\/\-]/).pop()?.replace(/[^0-9]/g, '') || '';
      const n = seg ? parseInt(seg, 10) : NaN;
      return !isNaN(n) && n > 0 ? String(n).padStart(4, '0') : '';
    };
    const targetTailDigits = extractTailDigits(cleanPo);

    const matchesPoCandidate = (recPo: any, recContractPo?: any): boolean => {
      const uClean = cleanPo.toUpperCase();
      const p1 = String(recPo || '').trim().toUpperCase().replace(/^#/, '');
      const p2 = String(recContractPo || '').trim().toUpperCase().replace(/^#/, '');
      if (p1 === uClean || (p2 && p2 === uClean)) return true;
      if (targetTailDigits) {
        if (extractTailDigits(p1) === targetTailDigits) return true;
        if (p2 && extractTailDigits(p2) === targetTailDigits) return true;
      }
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
    const poWithHash = '#' + rawPoNo;
    const cleanAlphaPo = rawPoNo.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    const reconcileAndNormalizeRecord = async (record: any) => {
      if (!record) return null;
      const updated = { ...record };

      if (updated.rate_basis === 'custom') {
        return updated;
      }

      let changed = false;

      // Always reconcile against live material_inspection + material_inspection_details so Excess/Short weights match the Sauda Check Point Settlement modal
      if (supabase && Number(updated.contract_weight_mt) > 0) {
        try {
          const [miRes, tmrRes, faRes] = await Promise.all([
            supabase.from('material_inspection').select('mr_no, arrival_no, final_arrival_no, date, mr_date, inspection_date, created_at, receipt_gross_wt, challan_gross_wt, gross_weight, total_final_receipt_wt, final_receipt_wt, weight_reduced, reduced_weight, electronic_net_weight, final_weight_mt, weight_qtl, weight, grid_details, details').ilike('po_no', `%${rawPoNo}%`).then(r => r.data || [], () => []),
            supabase.from('temporary_material_received').select('temporary_arrival_no, amad_no, mr_no, arrival_no, date, arrival_date, created_at, receipt_gross_wt, gross_weight, total_final_receipt_wt, final_receipt_wt, weight_reduced, reduced_weight, electronic_net_weight, final_weight_mt, weight_qtl, weight').ilike('po_no', `%${rawPoNo}%`).then(r => r.data || [], () => []),
            supabase.from('final_arrival').select('final_arrival_no, mr_no, arrival_no, date, arrival_date, created_at, weight_qtl, electronic_net_weight, challan_material_weight, weight').ilike('po_no', `%${rawPoNo}%`).then(r => r.data || [], () => [])
          ]);

          const extractMrSeq = (mr: string): number => {
            const m = String(mr || '').trim().match(/(\d+)$/);
            return m ? parseInt(m[1], 10) : 0;
          };
          const canonicalMrKey = (mr: string): string => {
            const seq = extractMrSeq(mr);
            return seq > 0 ? `MR_${seq}` : String(mr || '').trim().toUpperCase();
          };
          const toMtFromRawWt = (val: any): number => {
            const n = Number(val || 0);
            if (!Number.isFinite(n) || n <= 0) return 0;
            if (n >= 500) return n / 1000;
            if (n > 50 && n < 500) return n / 10;
            return n;
          };

          const uniqueMrMap = new Map<string, any>();
          (miRes || []).forEach((insp: any) => {
            const num = String(insp.mr_no || insp.arrival_no || insp.final_arrival_no || '').trim();
            if (num) {
              const key = canonicalMrKey(num);
              const existing = uniqueMrMap.get(key);
              if (!existing || (!existing.source?.grid_details && insp.grid_details)) {
                uniqueMrMap.set(key, { mrNo: num, source: insp, date: insp.arrival_date || insp.mr_date || insp.inspection_date || insp.date || insp.created_at || '' });
              }
            }
          });
          (tmrRes || []).forEach((ar: any) => {
            const num = String(ar.temporary_arrival_no || ar.amad_no || ar.mr_no || ar.arrival_no || '').trim();
            if (num && !uniqueMrMap.has(canonicalMrKey(num))) {
              uniqueMrMap.set(canonicalMrKey(num), { mrNo: num, source: ar, date: ar.arrival_date || ar.date || ar.created_at || '' });
            }
          });
          (faRes || []).forEach((ar: any) => {
            const num = String(ar.final_arrival_no || ar.mr_no || ar.arrival_no || '').trim();
            if (num && !uniqueMrMap.has(canonicalMrKey(num))) {
              uniqueMrMap.set(canonicalMrKey(num), { mrNo: num, source: ar, date: ar.arrival_date || ar.date || ar.created_at || '' });
            }
          });

          const mrEntries = Array.from(uniqueMrMap.values());
          mrEntries.sort((a, b) => {
            const seqA = extractMrSeq(a.mrNo);
            const seqB = extractMrSeq(b.mrNo);
            if (seqA > 0 && seqB > 0 && seqA !== seqB) return seqA - seqB;
            return String(a.date || '').localeCompare(String(b.date || ''));
          });

          if (mrEntries.length > 0) {
            // Fetch material_inspection_details for all matched MRs of this PO
            let liveInspectionDetails: any[] = [];
            const mrCandidateList = Array.from(
              new Set(
                mrEntries.flatMap(e => {
                  const raw = String(e.mrNo || '').trim();
                  const seq = extractMrSeq(raw);
                  return [
                    raw,
                    seq > 0 ? `MR${seq}` : '',
                    seq > 0 ? `MR0${seq}` : '',
                    seq > 0 ? `MR00${seq}` : ''
                  ].filter(Boolean);
                })
              )
            );
            if (mrCandidateList.length > 0) {
              const detRes = await supabase
                .from('material_inspection_details')
                .select('*')
                .in('mr_no', mrCandidateList)
                .then(r => r.data || [], () => []);
              if (Array.isArray(detRes) && detRes.length > 0) {
                liveInspectionDetails = detRes;
              }
            }

            const faTotalMt = (faRes || []).reduce((sum: number, f: any) => {
              const w = Number(f.weight_qtl) > 0 ? Number(f.weight_qtl) / 10 : Number(f.electronic_net_weight || f.challan_material_weight || 0);
              return sum + w;
            }, 0);

            const isMultiLorry = mrEntries.length > 1;
            let sumShortClaimMt = 0;
            let sumExcessClaimMt = 0;

            mrEntries.forEach((entry, idx) => {
              const src = entry.source;
              const mrKey = canonicalMrKey(entry.mrNo);
              const isLast = idx === mrEntries.length - 1;
              let mrGrossMt = 0;
              let mrNetMt = 0;

              if (src) {
                const topGross = toMtFromRawWt(src.challan_gross_wt ?? src.receipt_gross_wt ?? src.gross_weight);
                const topNet = toMtFromRawWt(src.final_receipt_wt ?? src.total_final_receipt_wt ?? src.reduced_weight ?? src.weight_reduced ?? src.electronic_net_weight ?? src.final_weight_mt);
                if (topGross > 0) mrGrossMt = topGross;
                if (topNet > 0) mrNetMt = topNet;
              }

              // Parse embedded grid_details or details if available
              let embeddedGrid: any[] = [];
              if (src?.grid_details) {
                try {
                  embeddedGrid = typeof src.grid_details === 'string' ? JSON.parse(src.grid_details) : src.grid_details;
                } catch (_e) {}
              }
              if ((!embeddedGrid || !embeddedGrid.length) && src?.details) {
                try {
                  embeddedGrid = typeof src.details === 'string' ? JSON.parse(src.details) : src.details;
                } catch (_e) {}
              }

              const matchingDetails = (liveInspectionDetails || []).filter((d: any) => {
                const dMr = String(d.mr_no || '').trim();
                return dMr && canonicalMrKey(dMr) === mrKey;
              });

              const rawDetailItems = (Array.isArray(embeddedGrid) && embeddedGrid.length > 0) ? embeddedGrid : matchingDetails;

              if (Array.isArray(rawDetailItems) && rawDetailItems.length > 0) {
                let sumDetailGrossMt = 0;
                let sumDetailNetMt = 0;
                const seenSrl = new Set<string>();
                rawDetailItems.forEach((it: any, itIdx: number) => {
                  if (!it || typeof it !== 'object') return;
                  const itMr = String(it.mr_no || '').trim();
                  if (itMr && canonicalMrKey(itMr) !== mrKey) return;
                  const gRaw = Number(it.challan_gross_wt ?? it.receipt_gross_wt ?? it.gross_weight_batch ?? it.gross_weight ?? 0);
                  const nRaw = Number(it.final_receipt_wt ?? it.reduced_weight ?? it.netto_pnto ?? 0);
                  if (gRaw <= 0 && nRaw <= 0) return;
                  const srl = it.srl_no !== undefined && it.srl_no !== null && String(it.srl_no).trim() !== ''
                    ? `SRL_${String(it.srl_no).trim()}`
                    : `ROW_${String(it.arrival_grade || it.receipt_grade_name || it.challan_grade_name || itIdx).trim()}_${gRaw}_${nRaw}`;
                  if (seenSrl.has(srl)) return;
                  seenSrl.add(srl);

                  const gWt = toMtFromRawWt(gRaw);
                  let nWt = toMtFromRawWt(nRaw);
                  if (nWt <= 0 && it.quantity_rcpt) nWt = toMtFromRawWt(it.quantity_rcpt);
                  if (nWt <= 0 && gWt > 0) nWt = gWt;

                  sumDetailGrossMt += gWt;
                  sumDetailNetMt += nWt;
                });

                const roundedDetailGross = Math.round(sumDetailGrossMt * 1000) / 1000;
                const roundedDetailNet = Math.round(sumDetailNetMt * 1000) / 1000;

                if (roundedDetailGross > 0 && (mrGrossMt <= 0 || Math.abs(mrGrossMt - roundedDetailGross) > 0.05)) {
                  mrGrossMt = roundedDetailGross;
                }
                if (
                  roundedDetailNet > 0 &&
                  (mrNetMt <= 0 ||
                    (mrGrossMt > 0 && mrNetMt > mrGrossMt + 0.001) ||
                    Math.abs(mrNetMt - roundedDetailNet) > 0.05)
                ) {
                  mrNetMt = roundedDetailNet;
                }
              }

              if (mrGrossMt > 0 && mrNetMt > mrGrossMt + 0.001) {
                mrNetMt = mrGrossMt;
              }
              if (mrNetMt <= 0 && src) {
                if (src.weight_qtl) mrNetMt = Number(src.weight_qtl) / 10;
                else if (src.weight) mrNetMt = toMtFromRawWt(src.weight);
              }
              if (mrNetMt <= 0 && mrGrossMt <= 0) {
                const baseTotal = faTotalMt > 0 ? faTotalMt : Number(updated.contract_weight_mt);
                mrNetMt = baseTotal / mrEntries.length;
              }
              if (mrGrossMt <= 0) mrGrossMt = mrNetMt;
              if (mrNetMt <= 0) mrNetMt = mrGrossMt;

              mrGrossMt = Math.round(mrGrossMt * 1000) / 1000;
              mrNetMt = Math.round(mrNetMt * 1000) / 1000;

              // Short Basis:
              // - Single Lorry: MR Net Weight (mrNetMt)
              // - Multiple Lorry: Earlier lorries Net Weight (mrNetMt) + Last Lorry Gross Weight (mrGrossMt)
              const shortClaimMt = (isMultiLorry && isLast) ? mrGrossMt : mrNetMt;

              // Excess Basis:
              // - Single Lorry: MR Net Weight (mrNetMt)
              // - Multiple Lorry: First/Earlier lorries Gross Weight (mrGrossMt) + Last Lorry Net Weight (mrNetMt)
              const excessClaimMt = isMultiLorry ? (isLast ? mrNetMt : mrGrossMt) : mrNetMt;

              sumShortClaimMt += shortClaimMt;
              sumExcessClaimMt += excessClaimMt;
            });

            const roundedShortClaimMt = Math.round(sumShortClaimMt * 1000) / 1000;
            const roundedExcessClaimMt = Math.round(sumExcessClaimMt * 1000) / 1000;
            const contractMt = Number(updated.contract_weight_mt);
            const tolMt = Math.round(contractMt * 0.03 * 1000) / 1000;

            const isClaimExcess =
              (contractMt - roundedExcessClaimMt) < -0.0001 &&
              (roundedShortClaimMt >= contractMt - 0.0001 || (roundedExcessClaimMt - contractMt) >= (contractMt - roundedShortClaimMt));

            const roundedLiveMt = isClaimExcess ? roundedExcessClaimMt : roundedShortClaimMt;

            if (roundedLiveMt > 0 && contractMt > 0) {
              if (Math.abs(Number(updated.total_received_mt || 0) - roundedLiveMt) > 0.0005) {
                changed = true;
              }
              updated.total_received_mt = roundedLiveMt;
              updated.variation_mt = Number((contractMt - roundedLiveMt).toFixed(3));
              updated.arrival_numbers = mrEntries.map(e => e.mrNo).join(', ');
              updated.last_mr_no = mrEntries[mrEntries.length - 1]?.mrNo || updated.last_mr_no;

              const shortageMt = Math.round((contractMt - roundedLiveMt) * 1000) / 1000;

              if (shortageMt > 0.0001) {
                // Shortage rules
                if (shortageMt >= 1.5) {
                  updated.variation_type = 'short';
                  updated.tolerance_pct = 0;
                  updated.tolerance_mt = 0;
                  updated.deduction_qty_mt = shortageMt;
                  updated.deduction_qty_qtl = Math.round(shortageMt * 10 * 100) / 100;
                } else if (shortageMt <= tolMt) {
                  updated.variation_type = 'within_tolerance';
                  updated.deduction_qty_mt = 0;
                  updated.deduction_qty_qtl = 0;
                  updated.deduction_amount = 0;
                  updated.rate_difference = 0;
                  updated.applicable_rate = 0;
                  updated.remarks = 'Within 3% Exemption – No Deduction';
                } else {
                  updated.variation_type = 'short';
                  const deductMt = Math.round((shortageMt - tolMt) * 1000) / 1000;
                  updated.deduction_qty_mt = deductMt;
                  updated.deduction_qty_qtl = Math.round(deductMt * 10 * 100) / 100;
                }
              } else if (roundedLiveMt > contractMt + 0.0001) {
                // EXCESS RULE: 3% tolerance NOT applicable for excess! Full excess is chargeable.
                updated.variation_type = 'excess';
                updated.tolerance_pct = 0;
                updated.tolerance_mt = 0;
                const exMt = Math.max(0, Math.round((roundedLiveMt - contractMt) * 1000) / 1000);
                const exQtl = Math.round(exMt * 10 * 100) / 100;
                updated.deduction_qty_mt = exMt;
                updated.deduction_qty_qtl = exQtl;
              } else {
                updated.variation_type = 'within_tolerance';
                updated.deduction_qty_mt = 0;
                updated.deduction_qty_qtl = 0;
                updated.deduction_amount = 0;
                updated.remarks = 'Exact Weight – No Deduction';
              }
            }
          }
        } catch (_e) {}
      }

      // Enforce Short Satta Rate Rule:
      if (updated.variation_type === 'short' && updated.rate_basis !== 'custom') {
        const sRate = Number(updated.sauda_rate || 0);
        const mRate = Number(updated.satta_rate || 0);
        if (mRate <= sRate) {
          if (Number(updated.deduction_amount) !== 0 || Number(updated.rate_difference) !== 0) {
            updated.rate_difference = 0;
            updated.applicable_rate = 0;
            updated.deduction_amount = 0;
            updated.remarks = `Final MR Rate ≤ Sauda Rate – No Deduction (Final: ₹${mRate}, Sauda: ₹${sRate})`;
            changed = true;
          }
        } else {
          const diff = mRate - sRate;
          const expectedAmt = Math.round(Number(updated.deduction_qty_qtl || 0) * diff * 100) / 100;
          if (Number(updated.deduction_amount) !== expectedAmt || Number(updated.rate_difference) !== diff) {
            updated.rate_difference = diff;
            updated.applicable_rate = diff;
            updated.deduction_amount = expectedAmt;
            updated.remarks = `Short Weight Deduction: Deductible ${Number(updated.deduction_qty_qtl || 0).toFixed(2)} Qtl at ₹${diff}/Qtl = ₹${expectedAmt}.`;
            changed = true;
          }
        }
      }

      // Enforce Excess Satta Rate Rule:
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
          const excessQtl = Number(updated.deduction_qty_qtl || Math.round(Number(updated.deduction_qty_mt || 0) * 10 * 100) / 100);
          const expectedAmt = Math.round(excessQtl * exDiff * 100) / 100;
          if (Number(updated.deduction_amount) !== expectedAmt || Number(updated.rate_difference) !== exDiff) {
            updated.rate_difference = exDiff;
            updated.applicable_rate = exDiff;
            updated.deduction_amount = expectedAmt;
            updated.remarks = `Excess Weight Deduction: Deductible ${excessQtl.toFixed(2)} Qtl at ₹${exDiff}/Qtl = ₹${expectedAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}.`;
            changed = true;
          }
        }
      }

      if (changed) {
        try {
          localStorage.setItem(`sauda_settlement_${cleanAlphaPo}`, JSON.stringify(updated));
          localStorage.setItem(`sauda_settlement_${rawPoNo}`, JSON.stringify(updated));
          if (supabase && updated.id) {
            supabase
              .from('sauda_check_point_deductions')
              .update({
                total_received_mt: updated.total_received_mt,
                variation_mt: updated.variation_mt,
                variation_type: updated.variation_type,
                deduction_qty_mt: updated.deduction_qty_mt,
                deduction_qty_qtl: updated.deduction_qty_qtl,
                rate_difference: updated.rate_difference,
                applicable_rate: updated.applicable_rate,
                deduction_amount: updated.deduction_amount,
                remarks: updated.remarks
              })
              .eq('id', updated.id)
              .then(() => {}, () => {});
          }
        } catch (_e) {}
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
