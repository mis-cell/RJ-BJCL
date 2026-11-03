import React from 'react';
import { dbModule } from '../../services/dbModule';
import { supabase } from '../../lib/supabase';
import { useLiveAutoRefresh } from '../../hooks/useLiveAutoRefresh';
import {
  DashboardStats,
  GodownUtil,
  SettlementStats,
  ArrivalsMetrics,
  QuickReportState
} from './types';

const FALLBACK_GODOWNS_WITH_CAPACITY = [
  { gdn_code: "1", gdn_name: "1", gdn_capacity: 600, gdn_short_name: "1" },
  { gdn_code: "2", gdn_name: "3", gdn_capacity: 450, gdn_short_name: "3" },
  { gdn_code: "3", gdn_name: "3A", gdn_capacity: 450, gdn_short_name: "3A" },
  { gdn_code: "4", gdn_name: "4", gdn_capacity: 450, gdn_short_name: "4" },
  { gdn_code: "5", gdn_name: "4A", gdn_capacity: 450, gdn_short_name: "4A" },
  { gdn_code: "6", gdn_name: "4B", gdn_capacity: 600, gdn_short_name: "4B" },
  { gdn_code: "7", gdn_name: "4C", gdn_capacity: 600, gdn_short_name: "4C" },
  { gdn_code: "8", gdn_name: "5", gdn_capacity: 450, gdn_short_name: "5" },
  { gdn_code: "9", gdn_name: "6", gdn_capacity: 450, gdn_short_name: "6" },
  { gdn_code: "10", gdn_name: "6A", gdn_capacity: 450, gdn_short_name: "6A" },
  { gdn_code: "11", gdn_name: "7", gdn_capacity: 450, gdn_short_name: "7" },
  { gdn_code: "12", gdn_name: "7A", gdn_capacity: 450, gdn_short_name: "7A" },
  { gdn_code: "13", gdn_name: "8", gdn_capacity: 450, gdn_short_name: "8" },
  { gdn_code: "14", gdn_name: "8A", gdn_capacity: 450, gdn_short_name: "8A" },
  { gdn_code: "15", gdn_name: "9", gdn_capacity: 450, gdn_short_name: "9" },
  { gdn_code: "16", gdn_name: "9A", gdn_capacity: 450, gdn_short_name: "9A" },
  { gdn_code: "17", gdn_name: "10", gdn_capacity: 450, gdn_short_name: "10" },
  { gdn_code: "18", gdn_name: "2", gdn_capacity: 450, gdn_short_name: "2" },
  { gdn_code: "19", gdn_name: "1A", gdn_capacity: 450, gdn_short_name: "1A" },
  { gdn_code: "20", gdn_name: "OUTSIDE", gdn_capacity: 500, gdn_short_name: "OS" },
  { gdn_code: "21", gdn_name: "2A", gdn_capacity: 450, gdn_short_name: "2A" },
  { gdn_code: "22", gdn_name: "INSP. MILL", gdn_capacity: 450, gdn_short_name: "IM" },
  { gdn_code: "23", gdn_name: "KATARI", gdn_capacity: 450, gdn_short_name: "KATA" },
  { gdn_code: "24", gdn_name: "MILL", gdn_capacity: 450, gdn_short_name: "MILL" },
  { gdn_code: "26", gdn_name: "STB", gdn_capacity: 450, gdn_short_name: "STB" },
  { gdn_code: "27", gdn_name: "INSP. STB", gdn_capacity: 450, gdn_short_name: "ISTB" },
  { gdn_code: "29", gdn_name: "INSP. KATARI", gdn_capacity: 450, gdn_short_name: "IKAT" },
  { gdn_code: "30", gdn_name: "SELECTION SHED", gdn_capacity: 450, gdn_short_name: "SHED" },
  { gdn_code: "31", gdn_name: "8B", gdn_capacity: 450, gdn_short_name: "8B" }
];

export function useDashboardData(isActive: boolean = true) {
  const [stats, setStats] = React.useState<DashboardStats>({
    arrivals: '...',
    sauda: '...',
    traders: '...',
    po: '...',
    godownUtilization: '...',
    totalStockMt: 0
  });

  const [godowns, setGodowns] = React.useState<any[]>([]);
  const [godownUtils, setGodownUtils] = React.useState<GodownUtil[]>([]);
  const [emailHealthWarning, setEmailHealthWarning] = React.useState(false);

  const [rawSaudas, setRawSaudas] = React.useState<any[]>([]);
  const [payments, setPayments] = React.useState<any[]>([]);
  const [paymentDetails, setPaymentDetails] = React.useState<any[]>([]);
  const [recentAmad, setRecentAmad] = React.useState<any[]>([]);
  const [rawArrivals, setRawArrivals] = React.useState<any[]>([]);
  const [rawFinalArrivals, setRawFinalArrivals] = React.useState<any[]>([]);
  const [rawPos, setRawPos] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [arrivalsMetrics, setArrivalsMetrics] = React.useState<ArrivalsMetrics>({
    totalPackets: 0,
    totalWeightQtl: 0
  });

  const [settlementStats, setSettlementStats] = React.useState<SettlementStats>({
    total: 0,
    pending: 0,
    settled: 0,
    partiallyPaid: 0,
    totalWeightMT: 0,
    totalScaleNetMT: 0
  });

  const [quickReportData, setQuickReportData] = React.useState<QuickReportState>({
    totalArrivals: 0,
    pendingMrSettlements: 0,
    totalPackets: 0,
    totalWeightQtl: 0,
    loading: true,
    error: ""
  });

  const [inspectionMasters, setInspectionMasters] = React.useState<any[]>([]);
  const [materialInspections, setMaterialInspections] = React.useState<any[]>([]);
  const [millInspections, setMillInspections] = React.useState<any[]>([]);
  const [inspectionDetails, setInspectionDetails] = React.useState<any[]>([]);
  const [rawSettlements, setRawSettlements] = React.useState<any[]>([]);
  const [stockNodeStocks, setStockNodeStocks] = React.useState<any[]>([]);
  const [millIssueMasters, setMillIssueMasters] = React.useState<any[]>([]);
  const [millIssueDetails, setMillIssueDetails] = React.useState<any[]>([]);
  const [allOpeningStocks, setAllOpeningStocks] = React.useState<any[]>([]);
  const [rawScp, setRawScp] = React.useState<any[]>([]);
  const [rawScpDetails, setRawScpDetails] = React.useState<any[]>([]);

  // Email health monitoring
  React.useEffect(() => {
    const checkEmailHealth = async () => {
      try {
        if (!supabase) return;
        const { data } = await supabase.from('mail_logs')
          .select('status')
          .order('created_at', { ascending: false })
          .limit(3);
          
        if (data && data.length === 3) {
          const allFailed = data.every(log => log.status === 'Failed');
          setEmailHealthWarning(allFailed);
        }
      } catch (err) {
        console.error(err);
      }
    };
    checkEmailHealth();
    const interval = setInterval(checkEmailHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = React.useCallback(async () => {
    if (!isActive) return;
    // Keep previously loaded information visible during background refreshes to eliminate UI flicker
    setStats(prev => (prev.arrivals === '...' ? prev : prev));
    setLoading(prev => (prev ? true : false));
    try {
      const [
        arrivals, 
        saudas, 
        traders, 
        pos, 
        settlements, 
        mrSettlementMastersRes,
        godownsRes, 
        openingStocksRes, 
        finalArrivals, 
        paymentRecords,
        paymentDetailsRes,
        gwsRes,
        mimRes,
        midRes,
        scpRes,
        scpDetRes,
        inspRes,
        inspDetRes,
        millInspRes,
        millDetRes
      ] = await Promise.all([
        dbModule.fetchAll('temporary_material_received', 'created_at', false).catch(() => []),
        dbModule.fetchAll('sauda_master', 'created_at', false).catch(() => []),
        dbModule.fetchAll('user_master').catch(() => []),
        dbModule.fetchAll('purchase_master', 'created_at', false).catch(() => []),
        dbModule.fetchAll('m_r_settlement').catch(() => []),
        dbModule.fetchAll('mr_settlement_master', 'created_at', false).catch(() => []),
        (async () => {
          try {
            if (supabase) {
              const r = await supabase.from('godown_master').select('*');
              if (r.data) return r.data;
            }
            return await dbModule.fetchAll('godown_master');
          } catch (e) {
            return [];
          }
        })(),
        (async () => {
          try {
            if (supabase) {
              const r = await supabase.from('opening_stock').select('*');
              if (r.data) return r.data;
            }
            return await dbModule.fetchAll('opening_stock');
          } catch (e) {
            return [];
          }
        })(),
        dbModule.fetchAll('final_arrival', 'created_at', false).catch(() => []),
        (async () => {
          try {
            if (supabase) {
              const r = await supabase.from('payment_master').select('*');
              if (r.data) return r.data;
            }
            return await dbModule.fetchAll('payment_master').catch(() => []);
          } catch (e) {
            return [];
          }
        })(),
        (async () => {
          try {
            if (supabase) {
              const r = await supabase.from('payment_details').select('*');
              if (r.data) return r.data;
            }
            return await dbModule.fetchAll('payment_details').catch(() => []);
          } catch (e) {
            return [];
          }
        })(),
        (async () => {
          try {
            if (supabase) {
              const r = await supabase.from('godown_wise_stock').select('*');
              if (r.data) return r.data;
            }
            return await dbModule.fetchAll('godown_wise_stock').catch(() => []);
          } catch (e) {
            return [];
          }
        })(),
        (async () => {
          try {
            if (supabase) {
              const r = await supabase.from('mill_issue_master').select('*');
              if (r.data) return r.data;
            }
            return await dbModule.fetchAll('mill_issue_master').catch(() => []);
          } catch (e) {
            return [];
          }
        })(),
        (async () => {
          try {
            if (supabase) {
              const r = await supabase.from('mill_issue_detail').select('*');
              if (r.data) return r.data;
            }
            return await dbModule.fetchAll('mill_issue_detail').catch(() => []);
          } catch (e) {
            return [];
          }
        })(),
        (async () => {
          try {
            if (supabase) {
              const r = await supabase.from('sauda_check_point').select('*');
              if (r.data) return r.data;
            }
            return await dbModule.fetchAll('sauda_check_point').catch(() => []);
          } catch (e) {
            return [];
          }
        })(),
        (async () => {
          try {
            if (supabase) {
              const r = await supabase.from('sauda_check_point_details').select('*');
              if (r.data) return r.data;
            }
            return await dbModule.fetchAll('sauda_check_point_details').catch(() => []);
          } catch (e) {
            return [];
          }
        })(),
        (async () => {
          try {
            if (supabase) {
              const r = await supabase.from('material_inspection').select('*');
              if (r.data) return r.data;
            }
            return await dbModule.fetchAll('material_inspection').catch(() => []);
          } catch (e) {
            return [];
          }
        })(),
        (async () => {
          try {
            if (supabase) {
              const r = await supabase.from('material_inspection_details').select('*');
              if (r.data) return r.data;
            }
            return await dbModule.fetchAll('material_inspection_details').catch(() => []);
          } catch (e) {
            return [];
          }
        })(),
        (async () => {
          try {
            if (supabase) {
              const r = await supabase.from('mill_inspection_master').select('*');
              if (r.data) return r.data;
            }
            return await dbModule.fetchAll('mill_inspection_master').catch(() => []);
          } catch (e) {
            return [];
          }
        })(),
        (async () => {
          try {
            if (supabase) {
              const r = await supabase.from('mill_inspection_detail').select('*');
              if (r.data) return r.data;
            }
            return await dbModule.fetchAll('mill_inspection_detail').catch(() => []);
          } catch (e) {
            return [];
          }
        })()
      ]);

      const taggedMaterial = (inspRes || []).map((m: any) => ({ ...m, inspection_source: 'material' }));
      const taggedMill = (millInspRes || []).map((m: any) => ({ ...m, inspection_source: 'mill' }));
      const allMasters = [...taggedMaterial, ...taggedMill];
      const mastersMap = new Map<string, any>();
      allMasters.forEach((m: any, idx: number) => {
        const k = String(m.mr_no || m.id || `M-${idx}`).trim().toUpperCase();
        if (!mastersMap.has(k)) mastersMap.set(k, m);
      });
      const finalInspectionMasters = Array.from(mastersMap.values());

      setMaterialInspections(taggedMaterial);
      setMillInspections(taggedMill);
      setInspectionMasters(finalInspectionMasters.length > 0 ? finalInspectionMasters : taggedMaterial);
      setInspectionDetails([...(inspDetRes || []), ...(millDetRes || [])]);
      setPaymentDetails(paymentDetailsRes || []);

      // Synchronize exact opening stock loader with StockSummary.tsx
      const opData = (openingStocksRes || []).map((r: any) => ({
        ...r,
        stock_date: r.opening_date || r.stock_date || new Date().toISOString().split('T')[0],
        opening_date: r.opening_date || r.stock_date || new Date().toISOString().split('T')[0]
      }));
      
      const gdnData = (gwsRes || []).map((r: any) => ({
        ...r,
        opening_date: r.stock_date || r.opening_date || new Date().toISOString().split('T')[0],
        stock_date: r.stock_date || r.opening_date || new Date().toISOString().split('T')[0]
      }));

      const localStoredOp = (function() {
        try {
          const stored = localStorage.getItem('po_auto_opening_stock');
          if (stored && stored !== 'undefined' && stored !== 'null') {
            const parsed = JSON.parse(stored === "undefined" ? "null" : stored);
            return Array.isArray(parsed) ? parsed : [];
          }
        } catch (_) {}
        return [];
      })();

      const combined = [...gdnData, ...opData];
      const unique = combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
      const finalOpList = unique.length > 0 ? unique : localStoredOp;

      setAllOpeningStocks(finalOpList);
      setMillIssueMasters(mimRes || []);
      setMillIssueDetails(midRes || []);

      const mergedGdns = (godownsRes && godownsRes.length > 0) ? godownsRes : FALLBACK_GODOWNS_WITH_CAPACITY;
      setGodowns(mergedGdns);

      const stocks = finalOpList || [];
      
      let totalCapacity = 0;
      let totalStockMt = 0;

      const godownUtilData: GodownUtil[] = mergedGdns.map((g: any) => {
        const capacity = Number(g.gdn_capacity || g.capacity || 450);
        totalCapacity += capacity;

        const matchingStocks = stocks.filter((s: any) => {
          const sGodown = String(s.godown || "").trim().toUpperCase();
          const gName = String(g.gdn_name || "").trim().toUpperCase();
          const gCode = String(g.gdn_code || "").trim().toUpperCase();
          return sGodown === gName || sGodown === gCode;
        });

        const totalWtQtl = matchingStocks.reduce((sum: number, s: any) => sum + (Number(s.weight) || 0), 0);
        const totalBales = matchingStocks.reduce((sum: number, s: any) => sum + (Number(s.quantity) || 0), 0);
        const stockMt = totalWtQtl / 10;
        totalStockMt += stockMt;

        const utilization = capacity > 0 ? Number(((stockMt / capacity) * 100).toFixed(1)) : 0;

        return {
          code: g.gdn_code,
          name: g.gdn_name || `GDN-${g.gdn_code}`,
          capacity,
          stockMt,
          weightQtl: totalWtQtl,
          bales: totalBales,
          utilization,
          stocks: matchingStocks
        };
      });

      const avgUtilization = totalCapacity > 0 ? Number(((totalStockMt / totalCapacity) * 100).toFixed(1)) : 0;
      setGodownUtils(godownUtilData);

      const matchPoNo = (po1: string, po2: string) => {
        if (!po1 || !po2) return false;
        const p1 = po1.trim().toLowerCase();
        const p2 = po2.trim().toLowerCase();
        if (p1 === p2) return true;
        
        const clean1 = p1.replace(/[^a-z0-9]/g, '');
        const clean2 = p2.replace(/[^a-z0-9]/g, '');
        if (clean1 && clean1 === clean2) return true;

        if (clean1.length > 5 && clean2.length > 5 && (clean1.includes(clean2) || clean2.includes(clean1))) {
          return true;
        }

        const num1 = p1.replace(/[^0-9]/g, '');
        const num2 = p2.replace(/[^0-9]/g, '');
        if (num1.length >= 4 && num2.length >= 4 && (num1.includes(num2) || num2.includes(num1))) {
          return true;
        }
        return false;
      };

      const pendingPoCount = pos.filter((p: any) => {
        const contractWeight = parseFloat(p.total_contract_mt) || 0;
        const matchingFinal = (finalArrivals || []).filter((ar: any) => 
          matchPoNo(p.po_no, ar.po_no) || matchPoNo(p.contract_po_no, ar.po_no)
        );
        const matchingTemp = (arrivals || []).filter((ar: any) => 
          (matchPoNo(p.po_no, ar.po_no) || matchPoNo(p.contract_po_no, ar.po_no)) &&
          !matchingFinal.some((f: any) => f.temporary_arrival_no === ar.temporary_arrival_no || f.mr_no === ar.amad_no)
        );
        const getLowestNetWeight = (item: any): number => {
          if (!item) return 0;
          const nets = [
            Number(item.electronic_net_weight),
            Number(item.supplier_net_weight),
            Number(item.challan_material_weight),
            Number(item.weight_reduced),
            item.weight_qtl ? Number(item.weight_qtl) / 10 : 0,
            Number(item.weight),
            Number(item.quantity)
          ].filter(v => typeof v === 'number' && !isNaN(v) && v > 0);
          return nets.length > 0 ? Math.min(...nets) : 0;
        };

        const totalReceivedMt = [...matchingFinal, ...matchingTemp].reduce((sum: number, ar: any) => {
          return sum + getLowestNetWeight(ar);
        }, 0);

        const isDbCompleted = p.pending === false || p.pending === 'No' || String(p.pending).toLowerCase() === 'false' || p.pending === 0;
        const isWeightCompleted = contractWeight > 0 && totalReceivedMt >= (contractWeight - 0.01);
        
        if (isDbCompleted || isWeightCompleted) {
          return false;
        }

        const remainingVal = p.pending_received !== undefined && p.pending_received !== null 
          ? Number(p.pending_received) 
          : (p.pending === true || p.pending === 'Yes' ? Number(p.total_contract_mt || 0) : 0);
        return remainingVal > 0.001;
      }).length;

      setStats({
        arrivals: arrivals.length.toString(),
        sauda: `₹ ${(saudas.reduce((acc: number, curr: any) => {
          const val = Number(curr.total_value) || (Number(curr.b_rate) * Number(curr.total_wt_in_ton) * 10) || 0;
          return acc + val;
        }, 0) / 100000).toFixed(1)}L`,
        traders: traders.length.toString(),
        po: pendingPoCount.toString(),
        godownUtilization: avgUtilization.toString(),
        totalStockMt: totalStockMt
      });

      const packetsSum = arrivals.reduce((sum: number, r: any) => {
        const u = (r.unit_name || r.unit || r.unit_code || '').toString().trim().toUpperCase();
        if (u.includes('LOOSE') || u === 'LOOSE') return sum;
        return sum + (Number(r.packets || r.total_packets) || 0);
      }, 0);

      const getLowestNetWeightHelper = (item: any): number => {
        if (!item) return 0;
        const nets = [
          Number(item.electronic_net_weight),
          Number(item.supplier_net_weight),
          Number(item.challan_material_weight),
          Number(item.weight_reduced),
          item.weight_qtl ? Number(item.weight_qtl) / 10 : 0,
          Number(item.weight),
          Number(item.quantity)
        ].filter(v => typeof v === 'number' && !isNaN(v) && v > 0);
        return nets.length > 0 ? Math.min(...nets) : 0;
      };
      const weightSum = arrivals.reduce((sum: number, r: any) => sum + (getLowestNetWeightHelper(r) * 10), 0);

      setArrivalsMetrics({
        totalPackets: packetsSum,
        totalWeightQtl: weightSum
      });

      const pmList = paymentRecords || [];
      const hasPm = pmList.length > 0;
      
      const pendingCount = hasPm 
        ? pmList.filter((s: any) => {
            const st = (s.status || s.payment_status || 'pending').toLowerCase().trim();
            return st === 'pending' || st === 'draft';
          }).length
        : settlements.filter((s: any) => (s.payment_status || 'Pending').toLowerCase().trim() === 'pending').length;

      const settledCount = hasPm
        ? pmList.filter((s: any) => {
            const st = (s.status || s.payment_status || '').toLowerCase().trim();
            return st === 'completed' || st === 'paid' || st === 'settled';
          }).length
        : settlements.filter((s: any) => {
            const st = (s.payment_status || '').toLowerCase().trim();
            return st === 'settled' || st === 'paid';
          }).length;

      const partiallyPaidCount = hasPm
        ? pmList.filter((s: any) => {
            const st = (s.status || s.payment_status || '').toLowerCase().trim();
            return st === 'partial' || st === 'partially paid';
          }).length
        : settlements.filter((s: any) => (s.payment_status || '').toLowerCase().trim() === 'partially paid').length;
      
      const totalWeight = settlements.reduce((sum: number, s: any) => sum + (Number(s.quantity) || 0), 0);
      const totalScaleNet = settlements.reduce((sum: number, s: any) => sum + (Number(s.electronic_scale_net) || 0), 0);

      setSettlementStats({
        total: hasPm ? pmList.length : settlements.length,
        pending: pendingCount,
        settled: settledCount,
        partiallyPaid: partiallyPaidCount,
        totalWeightMT: totalWeight,
        totalScaleNetMT: totalScaleNet
      });

      setRecentAmad(arrivals.slice(0, 5));
      setRawArrivals(arrivals || []);
      setRawFinalArrivals(finalArrivals || []);
      setRawPos(pos || []);
      setRawSaudas(saudas || []);
      setRawScp(scpRes || []);
      setRawScpDetails(scpDetRes || []);
      setPayments(pmList || []);

      const amadRegisterData = arrivals || [];
      const materialInspectionData = finalInspectionMasters.length > 0 ? finalInspectionMasters : (inspRes || []);
      const settledMrNos = new Set<string>();

      const settledMasters = (mrSettlementMastersRes && mrSettlementMastersRes.length > 0)
        ? mrSettlementMastersRes
        : (settlements || []);
      
      settledMasters.forEach((s: any) => {
        if (s.mr_no) settledMrNos.add(String(s.mr_no).trim().toUpperCase());
      });
      setRawSettlements(settledMasters);
      setStockNodeStocks(finalOpList);

      const pendingInspections = materialInspectionData.filter((insp: any) => {
        const mr = insp.mr_no ? String(insp.mr_no).trim().toUpperCase() : '';
        return mr && !settledMrNos.has(mr);
      });

      setQuickReportData({
        totalArrivals: amadRegisterData.length,
        pendingMrSettlements: pendingInspections.length,
        totalPackets: amadRegisterData.reduce((sum: number, r: any) => sum + (Number(r.packets || r.total_packets) || 0), 0),
        totalWeightQtl: amadRegisterData.reduce((sum: number, r: any) => sum + (Number(r.weight || r.weight_qtl) || 0), 0),
        loading: false,
        error: ""
      });

    } catch (err) {
      console.error("Dashboard Stats Error:", err);
      setQuickReportData(prev => ({ ...prev, loading: false, error: "Sync Error" }));
    } finally {
      setLoading(false);
    }
  }, [isActive]);

  useLiveAutoRefresh(() => {
    if (isActive) loadStats();
  }, [isActive], { 
    tables: [
      'sauda_master', 
      'purchase_master', 
      'sauda_check_point', 
      'temporary_material_received', 
      'final_arrival', 
      'mill_inspection_master', 
      'payment_master', 
      'm_r_settlement', 
      'material_mismatch', 
      'satta_mismatch',
      'opening_stock',
      'godown_wise_stock',
      'mill_issue_master',
      'mill_issue_detail'
    ],
    enabled: isActive
  });

  const arrivalTrendsData = React.useMemo(() => {
    const groups: Record<string, { name: string; packets: number; count: number }> = {};
    
    rawArrivals.forEach(item => {
      const dStr = item.date || item.created_at;
      if (!dStr) return;
      const d = new Date(dStr);
      if (isNaN(d.getTime())) return;
      
      const key = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
      if (!groups[key]) {
        groups[key] = { name: key, packets: 0, count: 0 };
      }
      const u = (item.unit_name || item.unit || item.unit_code || '').toString().trim().toUpperCase();
      const isLoose = u.includes('LOOSE') || u === 'LOOSE';
      groups[key].packets += isLoose ? 0 : (Number(item.packets) || Number(item.total_packets) || 0);
      groups[key].count++;
    });
    
    return Object.keys(groups)
      .sort()
      .slice(-8)
      .map(k => groups[k]);
  }, [rawArrivals]);

  const poDistributionData = React.useMemo(() => {
    const groups: Record<string, { name: string; weight: number; count: number }> = {};
    
    const pendingPosOnly = rawPos.filter((p: any) => {
      const remainingVal = p.pending_received !== undefined && p.pending_received !== null 
        ? Number(p.pending_received) 
        : (p.pending === true || p.pending === 'Yes' ? Number(p.total_contract_mt || 0) : 0);
      return remainingVal > 0.001;
    });

    pendingPosOnly.forEach(p => {
      const areaName = (p.area || 'Direct').trim().toUpperCase();
      if (!groups[areaName]) {
        groups[areaName] = { name: areaName, weight: 0, count: 0 };
      }
      let wt = p.pending_received !== undefined && p.pending_received !== null 
        ? Number(p.pending_received) 
        : Number(p.total_contract_mt) || 0;
      if (wt === 0) {
        const unitsVal = Number(p.total_units) || (Number(p.total_lorries) * Number(p.units_per_lorry)) || 0;
        wt = (unitsVal * (Number(p.weight_unit_kgs) || 50)) / 1000;
      }
      groups[areaName].weight += wt;
      groups[areaName].count++;
    });
    
    return Object.values(groups)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 6);
  }, [rawPos]);

  const settlementPieData = React.useMemo(() => {
    return [
      { name: 'Settled', value: settlementStats.settled, color: '#10b981' },
      { name: 'Pending', value: settlementStats.pending, color: '#f43f5e' },
      { name: 'Partial', value: settlementStats.partiallyPaid, color: '#f59e0b' }
    ].filter(item => item.value > 0);
  }, [settlementStats]);

  const gradeStockLevelsData = React.useMemo(() => {
    const groups: Record<string, number> = {};
    stockNodeStocks.forEach(item => {
      const g = (item.grade || 'UNKNOWN').trim().toUpperCase();
      const q = Number(item.quantity) || 0;
      groups[g] = (groups[g] || 0) + q;
    });
    return Object.keys(groups).map(grade => ({
      grade,
      quantity: groups[grade]
    })).sort((a, b) => b.quantity - a.quantity).slice(0, 10);
  }, [stockNodeStocks]);

  const gradeArrivalTrendsData = React.useMemo(() => {
    const dateMap: Record<string, Record<string, number>> = {};
    const gradesSet = new Set<string>();

    const masterMap = new Map<string, any>();
    inspectionMasters.forEach(m => {
      if (m.mr_no) {
        masterMap.set(String(m.mr_no).trim().toUpperCase(), m);
      }
    });

    inspectionDetails.forEach(det => {
      const mrNo = det.mr_no ? String(det.mr_no).trim().toUpperCase() : '';
      const master = masterMap.get(mrNo);
      const rawDate = master ? (master.arrival_date || master.mr_date) : null;
      if (!rawDate) return;

      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return;
      
      const dateStr = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
      const grade = (det.stock_grade_code || det.arrival_grade || 'UNKNOWN').trim().toUpperCase();
      const qty = Number(det.quantity) || 0;

      if (!dateMap[dateStr]) {
        dateMap[dateStr] = {};
      }
      dateMap[dateStr][grade] = (dateMap[dateStr][grade] || 0) + qty;
      gradesSet.add(grade);
    });

    const sortedDates = Object.keys(dateMap).sort().slice(-8);

    const trends = sortedDates.map(date => {
      const row: any = { date };
      gradesSet.forEach(g => {
        row[g] = dateMap[date][g] || 0;
      });
      return row;
    });

    return {
      trends,
      grades: Array.from(gradesSet).slice(0, 8)
    };
  }, [inspectionMasters, inspectionDetails]);

  return {
    stats,
    godowns,
    godownUtils,
    emailHealthWarning,
    rawSaudas,
    rawPos,
    rawArrivals,
    rawFinalArrivals,
    rawScp,
    rawScpDetails,
    payments,
    paymentDetails,
    recentAmad,
    inspectionMasters,
    materialInspections,
    millInspections,
    inspectionDetails,
    rawSettlements,
    millIssueMasters,
    millIssueDetails,
    allOpeningStocks,
    stockNodeStocks,
    loading,
    arrivalsMetrics,
    settlementStats,
    quickReportData,
    loadStats,
    arrivalTrendsData,
    poDistributionData,
    settlementPieData,
    gradeStockLevelsData,
    gradeArrivalTrendsData
  };
}
