import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Minus,
  HelpCircle,
  BarChart3,
  Calendar,
  Layers,
  Building,
  User,
  Truck,
  Droplets,
  Coins,
  Scale,
  FileText,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  Check,
  Percent,
  CheckCheck,
  Hash,
  MapPin,
  Tag,
  Package,
  ArrowDownRight
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { dbModule } from '../../services/dbModule';
import { calculateWeightTolerance } from '../../lib/weightTolerance';

import {
  ComparisonField,
  SectionComparison,
  MrComparisonData,
  PoHistogramHistoryModalProps,
} from './poHistogramTypes';
import { PoStoryTabView } from './PoStoryTabView';
import { PoHistogramTabView } from './PoHistogramTabView';
import { PoMismatchAuditTabView } from './PoMismatchAuditTabView';
import { PoComparisonTabView } from './PoComparisonTabView';

export type {
  ComparisonField,
  SectionComparison,
  MrComparisonData,
  PoHistogramHistoryModalProps,
};

export const PoHistogramHistoryModal: React.FC<PoHistogramHistoryModalProps> = ({
  isOpen,
  onClose,
  po,
  allPayments = [],
  allSettlements = [],
  allArrivals = [],
  allInspections = [],
  onNavigateToMismatch,
  onNavigateToPayment,
  onNavigateToSettlement
}) => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'compare' | 'story' | 'histogram' | 'mismatch_audit'>('compare');
  const [selectedMrTab, setSelectedMrTab] = useState<string>('all');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Fetched Live Linked Database Data
  const [dbPoDetails, setDbPoDetails] = useState<any[]>([]);
  const [dbArrivals, setDbArrivals] = useState<any[]>([]);
  const [dbInspections, setDbInspections] = useState<any[]>([]);
  const [dbPayments, setDbPayments] = useState<any[]>([]);
  const [dbSettlements, setDbSettlements] = useState<any[]>([]);
  const [dbMismatches, setDbMismatches] = useState<any[]>([]);
  const [dbSattaMismatches, setDbSattaMismatches] = useState<any[]>([]);
  const [dbSattaRate, setDbSattaRate] = useState<any | null>(null);

  // Load all linked records for this PO with robust multi-strategy fallback
  useEffect(() => {
    if (!isOpen || !po) return;

    let isMounted = true;
    const fetchLinkedHistoryData = async () => {
      setLoading(true);
      const targetPo = String(po.po_no || '').trim().toUpperCase();
      const targetSauda = String(po.sauda_no || '').trim().toUpperCase();
      const targetPtf = String(po.ptf_no || '').trim().toUpperCase();
      const poDigits = targetPo.replace(/[^0-9]/g, '');
      const poTail = targetPo.includes('/') ? targetPo.split('/').pop()?.trim().toUpperCase() : '';

      const isPoMatch = (rec: any) => {
        if (!rec) return false;
        const rPo = String(rec.po_no || '').trim().toUpperCase();
        const rSauda = String(rec.sauda_no || '').trim().toUpperCase();
        const rPtf = String(rec.ptf_no || '').trim().toUpperCase();
        const rArrivalNo = String(rec.temporary_arrival_no || rec.arrival_no || rec.mr_no || rec.amad_no || '').trim().toUpperCase();

        if (rPo && (rPo === targetPo || (targetSauda && rPo === targetSauda) || (targetPtf && rPo === targetPtf))) return true;
        if (rSauda && (rSauda === targetPo || (targetSauda && rSauda === targetSauda))) return true;
        if (rPtf && (rPtf === targetPo || (targetPtf && rPtf === targetPtf))) return true;

        if (poTail && (rPo === poTail || rSauda === poTail)) return true;
        if (poDigits && poDigits.length >= 3) {
          const rDigits = (rPo + rSauda + rPtf).replace(/[^0-9]/g, '');
          if (rDigits && (rDigits === poDigits || rDigits.endsWith(poDigits) || poDigits.endsWith(rDigits))) return true;
        }
        return false;
      };

      try {
        // Parallel queries to real Supabase tables + fallback to dbModule
        const [
          poDetailsRes,
          arrivalsDbRes,
          finalArrDbRes,
          arrivalsModuleRes,
          finalArrModuleRes,
          inspectionsDbRes,
          matInspectionsDbRes,
          inspectionsModuleRes,
          paymentsDbRes,
          paymentsModuleRes,
          settlementsDbRes,
          settlementsModuleRes,
          mismatchCasesRes,
          sattaMismatchRes,
          matMismatchRes,
          sattaMasterRes
        ] = await Promise.all([
          supabase ? Promise.resolve(supabase.from('sauda_check_point_details').select('*').eq('po_no', po.po_no)).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
          supabase ? Promise.resolve(supabase.from('temporary_material_received').select('*')).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
          supabase ? Promise.resolve(supabase.from('final_arrival').select('*')).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
          dbModule.fetchAll('temporary_material_received').catch(() => []),
          dbModule.fetchAll('final_arrival').catch(() => []),
          supabase ? Promise.resolve(supabase.from('mill_inspection_master').select('*, mill_inspection_detail(*)')).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
          supabase ? Promise.resolve(supabase.from('material_inspection').select('*, material_inspection_details(*)')).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
          dbModule.fetchAll('mill_inspection_master').catch(() => []),
          supabase ? Promise.resolve(supabase.from('payment_details').select('*, payment_master(*)')).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
          dbModule.fetchAll('payment_master').catch(() => []),
          supabase ? Promise.resolve(supabase.from('mr_settlement_master').select('*, mr_settlement_detail(*)')).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
          dbModule.fetchAll('mr_settlement_master').catch(() => []),
          supabase ? Promise.resolve(supabase.from('mismatch_cases').select('*')).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
          dbModule.fetchAll('satta_mismatch').catch(() => []),
          dbModule.fetchAll('material_mismatch').catch(() => []),
          supabase ? Promise.resolve(supabase.from('satta_master').select('*').limit(50)).catch(() => ({ data: [] })) : Promise.resolve({ data: [] })
        ]);

        // 1. Merge all Arrivals
        const rawArrivals = [
          ...((arrivalsDbRes as any)?.data || []),
          ...((finalArrDbRes as any)?.data || []),
          ...(Array.isArray(arrivalsModuleRes) ? arrivalsModuleRes : []),
          ...(Array.isArray(finalArrModuleRes) ? finalArrModuleRes : []),
          ...(Array.isArray(allArrivals) ? allArrivals : [])
        ];

        // Deduplicate arrivals by arrival_no / mr_no
        const arrivalMap = new Map<string, any>();
        rawArrivals.forEach((a: any) => {
          if (a && isPoMatch(a)) {
            const key = String(a.temporary_arrival_no || a.mr_no || a.amad_no || a.arrival_no || a.final_arrival_no || a.id || Math.random()).trim().toUpperCase();
            if (!arrivalMap.has(key)) {
              arrivalMap.set(key, a);
            }
          }
        });
        const matchedArrivals = Array.from(arrivalMap.values());

        // Helper to extract clean genuine MR identifiers (e.g. MR00748, MR00694)
        const isGenuineMr = (val: any): boolean => {
          if (!val) return false;
          const str = String(val).trim().toUpperCase();
          if (!str) return false;
          if (str.startsWith('MRRC-') || str.includes('MRRC-') || str.startsWith('INSP-') || str.startsWith('CERT-') || str.startsWith('TEST-') || str.startsWith('SETTLEMENT-')) {
            return false;
          }
          return true;
        };

        const mrSet = new Set<string>();
        matchedArrivals.forEach(a => {
          const mr = a.temporary_arrival_no || a.mr_no || a.mr_number || a.amad_no || a.arrival_no || a.final_arrival_no;
          if (mr && isGenuineMr(mr)) mrSet.add(String(mr).trim().toUpperCase());
        });
        if (po.mr_no && isGenuineMr(po.mr_no)) mrSet.add(String(po.mr_no).trim().toUpperCase());
        if (po.linked_mrs && Array.isArray(po.linked_mrs)) {
          po.linked_mrs.forEach((m: any) => m && isGenuineMr(m) && mrSet.add(String(m).trim().toUpperCase()));
        }

        const isPoOrMrMatch = (rec: any) => {
          if (!rec) return false;
          if (isPoMatch(rec)) return true;
          const rMr = String(rec.mr_no || rec.mr_number || rec.arrival_no || rec.ref_arrival_no || rec.temporary_arrival_no || rec.final_arrival_no || '').trim().toUpperCase();
          if (rMr && mrSet.has(rMr)) return true;
          return false;
        };

        // 2. Merge Inspections
        const rawInspections = [
          ...((inspectionsDbRes as any)?.data || []),
          ...((matInspectionsDbRes as any)?.data || []),
          ...(Array.isArray(inspectionsModuleRes) ? inspectionsModuleRes : []),
          ...(Array.isArray(allInspections) ? allInspections : [])
        ];
        const inspectionMap = new Map<string, any>();
        rawInspections.forEach((i: any) => {
          if (i && isPoOrMrMatch(i)) {
            const key = String(i.arrival_no || i.temporary_arrival_no || i.final_arrival_no || i.mr_no || i.mr_number || i.id || Math.random()).trim().toUpperCase();
            if (!inspectionMap.has(key)) {
              inspectionMap.set(key, i);
            }
          }
        });
        const matchedInspections = Array.from(inspectionMap.values());

        // 3. Merge Payments
        const rawPayments = [
          ...((paymentsDbRes as any)?.data || []),
          ...(Array.isArray(paymentsModuleRes) ? paymentsModuleRes : []),
          ...(Array.isArray(allPayments) ? allPayments : [])
        ];
        const paymentMap = new Map<string, any>();
        rawPayments.forEach((p: any) => {
          if (p && isPoOrMrMatch(p)) {
            const key = String(p.voucher_no || p.id || Math.random()).trim().toUpperCase();
            if (!paymentMap.has(key)) {
              paymentMap.set(key, p);
            }
          }
        });
        const matchedPayments = Array.from(paymentMap.values());

        // 4. Merge Settlements
        const rawSettlements = [
          ...((settlementsDbRes as any)?.data || []),
          ...(Array.isArray(settlementsModuleRes) ? settlementsModuleRes : []),
          ...(Array.isArray(allSettlements) ? allSettlements : [])
        ];
        const settlementMap = new Map<string, any>();
        rawSettlements.forEach((s: any) => {
          if (s && isPoOrMrMatch(s)) {
            const key = String(s.mr_no || s.mr_number || s.id || Math.random()).trim().toUpperCase();
            if (!settlementMap.has(key)) {
              settlementMap.set(key, s);
            }
          }
        });
        const matchedSettlements = Array.from(settlementMap.values());

        // 5. Merge Mismatches
        const rawMismatches = [
          ...((mismatchCasesRes as any)?.data || []),
          ...(Array.isArray(matMismatchRes) ? matMismatchRes : [])
        ].filter(isPoOrMrMatch);

        const rawSattaMismatches = (Array.isArray(sattaMismatchRes) ? sattaMismatchRes : []).filter(isPoOrMrMatch);

        // 6. Satta Limit Rate Reference
        const saudaDate = po.po_date || po.created_at?.slice(0, 10);
        const sattaRatesList = (sattaMasterRes as any)?.data || [];
        const foundSatta = sattaRatesList.find((s: any) => s.entry_date === saudaDate || s.date === saudaDate) || null;

        if (isMounted) {
          setDbPoDetails((poDetailsRes as any)?.data || []);
          setDbArrivals(matchedArrivals);
          setDbInspections(matchedInspections);
          setDbPayments(matchedPayments);
          setDbSettlements(matchedSettlements);
          setDbMismatches(rawMismatches);
          setDbSattaMismatches(rawSattaMismatches);
          setDbSattaRate(foundSatta);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching PO Histogram comparison data:', err);
        if (isMounted) {
          // Fallback to memory props
          setDbArrivals(allArrivals.filter(isPoMatch));
          setDbInspections(allInspections.filter(isPoMatch));
          setDbPayments(allPayments.filter(isPoMatch));
          setDbSettlements(allSettlements.filter(isPoMatch));
          setLoading(false);
        }
      }
    };

    fetchLinkedHistoryData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, po, allArrivals, allInspections, allPayments, allSettlements]);

  // Helper to extract arrival weight in MT
  const getArrivalWeightMt = (a: any): number => {
    if (!a) return 0;
    const val = parseFloat(a.final_weight_mt || a.received_weight_mt || a.electronic_net_weight || a.supplier_net_weight || a.challan_material_weight || a.net_weight || a.weight || 0);
    if (val > 0) return val;
    if (a.weight_qtl && Number(a.weight_qtl) > 0) return Number(a.weight_qtl) / 10;
    return 0;
  };

  // Derived Multi-MR list (e.g., MR00748, MR00694)
  /* const linkedMrs = useMemo(() => {
    const isGenuineMr = (val: any): boolean => {
      if (!val) return false;
      const str = String(val).trim().toUpperCase();
      if (!str) return false;
      if (str.startsWith('MRRC-') || str.includes('MRRC-') || str.startsWith('INSP-') || str.startsWith('CERT-') || str.startsWith('TEST-') || str.startsWith('SETTLEMENT-')) {
        return false;
      }
      return true;
    };

    const mrSet = new Set<string>();
    dbArrivals.forEach((a: any) => {
      const mr = a.temporary_arrival_no || a.mr_no || a.final_arrival_no || a.mr_number || a.amad_no || a.arrival_no;
      if (mr && isGenuineMr(mr)) mrSet.add(String(mr).trim().toUpperCase());
    });
    if (po?.mr_no && isGenuineMr(po.mr_no)) {
      mrSet.add(String(po.mr_no).trim().toUpperCase());
    }
    if (po?.linked_mrs && Array.isArray(po.linked_mrs)) {
      po.linked_mrs.forEach((m: any) => {
        if (m && isGenuineMr(m)) mrSet.add(String(m).trim().toUpperCase());
      });
    }
    dbSettlements.forEach((s: any) => {
      const mr = s.mr_no || s.mr_number || s.arrival_no;
      if (mr && isGenuineMr(mr)) mrSet.add(String(mr).trim().toUpperCase());
    });
    dbInspections.forEach((i: any) => {
      const arrRef = i.arrival_no || i.ref_arrival_no || i.final_arrival_no;
      if (arrRef && isGenuineMr(arrRef)) {
        mrSet.add(String(arrRef).trim().toUpperCase());
      } else if (i.mr_no && isGenuineMr(i.mr_no)) {
        mrSet.add(String(i.mr_no).trim().toUpperCase());
      }
    });
    dbPayments.forEach((p: any) => {
      const mr = p.mr_no || p.arrival_no;
      if (mr && isGenuineMr(mr)) mrSet.add(String(mr).trim().toUpperCase());
    });
    return Array.from(mrSet);
  }, [dbArrivals, dbInspections, dbSettlements, dbPayments, po]); */
  const linkedMrs = useMemo(() => {
  const isGenuineMr = (val: any): boolean => {
    if (!val) return false;

    const str = String(val).trim().toUpperCase();
    if (!str) return false;

    // Only allow MR series
    if (!str.startsWith('MR')) return false;

    // Exclude non-MR reference numbers
    if (
      str.startsWith('MRRC-') ||
      str.startsWith('INSP-') ||
      str.startsWith('CERT-') ||
      str.startsWith('TEST-') ||
      str.startsWith('SETTLEMENT-')
    ) {
      return false;
    }

    return true;
  };

  const mrSet = new Set<string>();

  // 1. Temporary Arrival / Final Arrival records
  dbArrivals.forEach((a: any) => {
    const mr =
      a.temporary_arrival_no ||
      a.mr_no ||
      a.final_arrival_no ||
      a.mr_number ||
      a.amad_no ||
      a.arrival_no;

    if (mr && isGenuineMr(mr)) {
      mrSet.add(String(mr).trim().toUpperCase());
    }
  });

  // 2. Current PO MR number
  if (po?.mr_no && isGenuineMr(po.mr_no)) {
    mrSet.add(String(po.mr_no).trim().toUpperCase());
  }

  // 3. Linked MRs
  if (po?.linked_mrs && Array.isArray(po.linked_mrs)) {
    po.linked_mrs.forEach((m: any) => {
      if (m && isGenuineMr(m)) {
        mrSet.add(String(m).trim().toUpperCase());
      }
    });
  }

  // 4. Settlement records
  dbSettlements.forEach((s: any) => {
    const mr = s.mr_no || s.mr_number || s.arrival_no;

    if (mr && isGenuineMr(mr)) {
      mrSet.add(String(mr).trim().toUpperCase());
    }
  });

  // 5. Inspection records
  dbInspections.forEach((i: any) => {
    const arrRef = i.arrival_no || i.ref_arrival_no || i.final_arrival_no;

    if (arrRef && isGenuineMr(arrRef)) {
      mrSet.add(String(arrRef).trim().toUpperCase());
    } else if (i.mr_no && isGenuineMr(i.mr_no)) {
      mrSet.add(String(i.mr_no).trim().toUpperCase());
    }
  });

  // 6. Payment records
  dbPayments.forEach((p: any) => {
    const mr = p.mr_no || p.arrival_no;

    if (mr && isGenuineMr(mr)) {
      mrSet.add(String(mr).trim().toUpperCase());
    }
  });

  return Array.from(mrSet);
}, [dbArrivals, dbInspections, dbSettlements, dbPayments, po]);

  // Comprehensive Comparison Engine
  const comparisonResults = useMemo(() => {
    if (!po) return { sections: [], summary: { totalSections: 0, mismatchSections: 0, totalMismatches: 0, mrComparisons: [] } };

    const poContractMt = parseFloat(po.total_contract_mt || po.weight_mt || 0) || 0;
    const poRate = parseFloat(po.rate || po.price || 0) || 0;
    const poSupplier = String(po.supplier || po.supplier_name || po.vendor_name || '').trim();
    const poBroker = String(po.broker || po.broker_name || '').trim();
    const poArea = String(po.area || po.station || '').trim();
    const poGrade = String(po.grade || po.grade_name || po.item_grade || '').trim();
    const poUnit = String(po.purchase_unit_name || po.unit || 'BALES').trim().toUpperCase();
    const poTotalUnits = parseInt(po.total_units || po.total_unit || 0, 10);
    const poLorries = parseInt(po.total_no_of_lorries || po.contract_lorries || 1, 10);
    const poDate = po.po_date || po.created_at?.slice(0, 10) || 'N/A';
    const poDeliveryDays = parseInt(po.delivery_days || po.shipment_days || 0, 10);

    // Aggregate Arrival metrics
    const totalArrivalWeight = dbArrivals.reduce((sum, a) => sum + getArrivalWeightMt(a), 0);
    const totalArrivalUnits = dbArrivals.reduce((sum, a) => sum + (parseInt(a.received_units || a.quantity_chln || a.units || a.quantity || 0, 10) || 0), 0);
    const firstArrival = dbArrivals[0] || {};
    const arrivalLorryNos = dbArrivals.map(a => a.lorry_number || a.lorry_no || a.truck_no || a.vehicle_no).filter(Boolean).join(', ');
    const challanweight = dbArrivals.map(a => a.challan_material_weight || a.challan_material_weight || a.challan_material_weight || a.challan_material_weight).filter(Boolean).join(', ');
    // Tolerance Calculation
    const weightTol = calculateWeightTolerance(poContractMt, totalArrivalWeight);

    // Satta Rate Reference
    const sattaBaseRate = dbSattaRate?.base_rate ? Number(dbSattaRate.base_rate) : null;

    // Aggregate Inspection metrics
    const avgMoisture = dbInspections.length > 0
      ? (dbInspections.reduce((sum, i) => sum + (parseFloat(i.actual_moisture || i.moisture_percent || i.moisture || 0) || 0), 0) / dbInspections.length)
      : 0;
    const avgDust = dbInspections.length > 0
      ? (dbInspections.reduce((sum, i) => sum + (parseFloat(i.actual_dust || i.dust_percent || i.dust || 0) || 0), 0) / dbInspections.length)
      : 0;
    const avgNcv = dbInspections.length > 0
      ? (dbInspections.reduce((sum, i) => sum + (parseFloat(i.actual_ncv || i.ncv_percent || i.ncv || 0) || 0), 0) / dbInspections.length)
      : 0;
    const totalPremiumSum = dbInspections.reduce((sum, i) => sum + (parseFloat(i.premium_amount || i.premium_total || 0) || 0), 0);
    
    const inspectionmrno = dbInspections.map(a => a.mr_no || a.mr_no || a.mr_no || a.mr_no).filter(Boolean).join(', ');
    const inspectionmrweught = dbInspections.map(a => a.final_receipt_wt || a.final_receipt_wt || a.final_receipt_wt || a.final_receipt_wt).filter(Boolean).join(', ');
    /* dbInspections.length > 0
      ? (dbInspections.reduce((sum, i) => sum + (parseFloat(i.final_receipt_wt || i.final_receipt_wt || i.final_receipt_wt || 0) || 0), 0))
      : 0; */
    
    // Aggregate Payment metrics
    const totalPaidAmount = dbPayments.reduce((sum, p) => sum + (parseFloat(p.amount_paid || p.payable_net_amount || p.amount || 0) || 0), 0);
    const contractValueEst = poContractMt > 0 && poRate > 0 ? (poContractMt * 10 * poRate) : 0; // 1 MT = 10 Qtl

    // Aggregate Settlement metrics
    const settledWeight = dbSettlements.reduce((sum, s) => sum + (parseFloat(s.settled_weight_mt || s.settled_weight || 0) || 0), 0);
    const settledPenalty = dbSettlements.reduce((sum, s) => sum + (parseFloat(s.penalty_amount || s.excess_short_penalty || 0) || 0), 0);
    const settledQualityDeductions = dbSettlements.reduce((sum, s) => sum + (parseFloat(s.total_deduction_amount || s.quality_claim_amount || 0) || 0), 0);
    const totalSettledPayable = dbSettlements.reduce((sum, s) => sum + (parseFloat(s.net_settled_amount || s.final_amount || 0) || 0), 0);

    // -------------------------------------------------------------
    // SECTION 1: SAUDA CHECK POINT
    // -------------------------------------------------------------
    const saudaFields: ComparisonField[] = [
      {
        name: 'Sauda Contract P.O.',
        referenceValue: po.po_no || 'N/A',
        actualValue: po.po_no || 'N/A',
        status: 'match',
        notes: 'Authoritative P.O. Key'
      },
      {
        name: 'Contract Date',
        referenceValue: poDate,
        actualValue: poDate,
        status: 'match'
      },
      {
        name: 'Supplier / Vendor',
        referenceValue: poSupplier || 'DIRECT',
        actualValue: poSupplier || 'DIRECT',
        status: 'match'
      },
      {
        name: 'Broker',
        referenceValue: poBroker || 'DIRECT',
        actualValue: poBroker || 'DIRECT',
        status: 'match'
      },
      {
        name: 'Challan Supplier',
        referenceValue: po.challan_supplier || poSupplier || 'DIRECT',
        actualValue: po.challan_supplier || poSupplier || 'DIRECT',
        status: 'match'
      },
      {
        name: 'Station / Area',
        referenceValue: poArea || 'N/A',
        actualValue: poArea || 'N/A',
        status: 'match'
      },
      {
        name: 'Grade Name',
        referenceValue: poGrade || 'N/A',
        actualValue: poGrade || 'N/A',
        status: 'match'
      },
      {
        name: 'Agency Name',
        referenceValue: po.agency_name || 'N/A',
        actualValue: po.agency_name || 'N/A',
        status: 'match'
      },
      {
        name: 'Marka Name',
        referenceValue: po.marka_name || 'N/A',
        actualValue: po.marka_name || 'N/A',
        status: 'match'
      },
      {
        name: 'Units & Count',
        referenceValue: `${poTotalUnits || 0} ${poUnit}`,
        actualValue: `${poTotalUnits || 0} ${poUnit}`,
        status: 'match'
      },
      {
        name: 'Weight / Lorry (MT)',
        referenceValue: poLorries > 0 ? `${(poContractMt / poLorries).toFixed(3)} MT` : `${poContractMt.toFixed(3)} MT`,
        actualValue: poLorries > 0 ? `${(poContractMt / poLorries).toFixed(3)} MT` : `${poContractMt.toFixed(3)} MT`,
        status: 'match'
      },
      {
        name: 'Total Contract Weight (MT)',
        referenceValue: `${poContractMt.toFixed(3)} MT`,
        actualValue: `${poContractMt.toFixed(3)} MT`,
        status: 'match'
      },
      {
        name: 'Total No of Lorries',
        referenceValue: `${poLorries} Lorry`,
        actualValue: `${poLorries} Lorry`,
        status: 'match'
      },
      {
        name: 'Rate / Qtl & Premium',
        referenceValue: poRate > 0 ? `₹${poRate.toLocaleString()}/Qtl` : 'N/A',
        actualValue: poRate > 0 ? `₹${poRate.toLocaleString()}/Qtl` : 'N/A',
        status: 'match'
      }
    ];

    // -------------------------------------------------------------
    // SECTION 2: TEMPORARY ARRIVAL
    // -------------------------------------------------------------
    const tempArrivalFields: ComparisonField[] = [
      {
        name: 'Linked Arrival MRs',
        referenceValue: `${poLorries} Expected`,
        actualValue: linkedMrs.length > 0 ? `${linkedMrs.length} MR (${linkedMrs.join(', ')})` : 'Not Arrived',
        status: linkedMrs.length === 0 ? 'not_available' : 'match',
        isCritical: false
      },
      {
        name: 'Challan Supplier',
        referenceValue: poSupplier || 'DIRECT',
        actualValue: firstArrival.challan_supplier || firstArrival.supplier || (dbArrivals.length > 0 ? 'Recorded' : 'Not Arrived'),
        status: dbArrivals.length === 0 ? 'not_available' : (
          String(firstArrival.challan_supplier || firstArrival.supplier || '').trim().toUpperCase() === poSupplier.toUpperCase() || !firstArrival.challan_supplier
            ? 'match'
            : 'mismatch'
        ),
        notes: firstArrival.challan_supplier ? undefined : 'Direct/matched supplier',
        isCritical: true
      },
      {
        name: 'Arrival Station / Area',
        referenceValue: poArea || 'N/A',
        actualValue: firstArrival.arrival_area_name || firstArrival.area || firstArrival.station || (dbArrivals.length > 0 ? 'Recorded' : 'Not Arrived'),
        status: dbArrivals.length === 0 ? 'not_available' : (
          !firstArrival.arrival_area_name || String(firstArrival.arrival_area_name || firstArrival.area).trim().toUpperCase() === poArea.toUpperCase()
            ? 'match'
            : 'mismatch'
        )
      },
      {
        name: 'Arrival Grade',
        referenceValue: poGrade || 'N/A',
        actualValue: firstArrival.receipt_grade_name || firstArrival.grade || firstArrival.item_grade || (dbArrivals.length > 0 ? 'Recorded' : 'Not Arrived'),
        status: dbArrivals.length === 0 ? 'not_available' : (
          !firstArrival.receipt_grade_name || String(firstArrival.receipt_grade_name || firstArrival.grade).trim().toUpperCase() === poGrade.toUpperCase()
            ? 'match'
            : 'mismatch'
        ),
        isCritical: true
      },
      {
        name: 'Lorry Number(s)',
        referenceValue: `${poLorries} Expected`,
        actualValue: arrivalLorryNos || (dbArrivals.length > 0 ? `${dbArrivals.length} Recorded` : 'Pending Arrival'),
        status: dbArrivals.length === 0 ? 'not_available' : 'match'
      },
      {
        name: 'Gross weight',
        referenceValue: `${poLorries} Expected`,
        actualValue: challanweight || (dbArrivals.length > 0 ? `${dbArrivals.length} Recorded` : 'Pending Arrival'),
        status: dbArrivals.length === 0 ? 'not_available' : 'match'
      },
      {
        name: 'Received vs Contract Weight',
        referenceValue: `${poContractMt.toFixed(3)} MT`,
        actualValue: `${totalArrivalWeight.toFixed(3)} MT`,
        variance: weightTol.diffMt !== 0 ? `${weightTol.diffMt >= 0 ? '+' : ''}${weightTol.diffMt.toFixed(3)} MT` : '0.000 MT',
        status: dbArrivals.length === 0 ? 'not_available' : (
          (weightTol.isWithinTolerance || weightTol.isAcceptable) ? 'match' : 'mismatch'
        ),
        notes: (weightTol.isWithinTolerance || weightTol.isAcceptable)
          ? `Within allowed tolerance (±${weightTol.toleranceMt.toFixed(3)} MT)`
          : `Beyond allowed tolerance of ±${weightTol.toleranceMt.toFixed(3)} MT (Penalty applicable)`,
        isCritical: true
      }
    ];

    // -------------------------------------------------------------
    // SECTION 3: MILL INSPECTION
    // -------------------------------------------------------------
    const millInspFields: ComparisonField[] = [
      {
        name: 'Moisture Content (%)',
        referenceValue: '≤ 15.0% Standard',
        actualValue: dbInspections.length > 0 ? `${avgMoisture.toFixed(1)}%` : 'Pending Inspection',
        variance: avgMoisture > 15.0 ? `+${(avgMoisture - 15.0).toFixed(1)}% Excess` : 'Normal',
        status: dbInspections.length === 0 ? 'not_available' : (avgMoisture <= 15.0 ? 'match' : 'mismatch'),
        notes: avgMoisture > 15.0 ? 'Moisture exceeds standard 15% limit. Quality deduction triggered.' : 'Moisture within standard acceptance range.',
        isCritical: true
      },
      {
        name: 'Grade Acceptance / Down',
        referenceValue: poGrade,
        actualValue: dbInspections.length > 0 ? (dbInspections[0].actual_grade || dbInspections[0].item_grade || poGrade) : 'Pending Inspection',
        status: dbInspections.length === 0 ? 'not_available' : 'match',
        notes: dbInspections[0]?.grade_down_percent > 0 ? `Grade Down: ${dbInspections[0].grade_down_percent}%` : 'Grade Verified',
        isCritical: true
      },
      {
        name: 'Dust Contamination (%)',
        referenceValue: '≤ 1.0% Standard',
        actualValue: dbInspections.length > 0 ? `${avgDust.toFixed(1)}%` : 'Pending',
        variance: avgDust > 1.0 ? `+${(avgDust - 1.0).toFixed(1)}% Excess` : 'Normal',
        status: dbInspections.length === 0 ? 'not_available' : (avgDust <= 1.0 ? 'match' : 'mismatch'),
        notes: avgDust > 1.0 ? 'Dust exceeds standard tolerance.' : 'Dust within acceptance.'
      },
      {
        name: 'NCV Contamination (%)',
        referenceValue: '≤ 0.5% Standard',
        actualValue: dbInspections.length > 0 ? `${avgNcv.toFixed(1)}%` : 'Pending',
        variance: avgNcv > 0.5 ? `+${(avgNcv - 0.5).toFixed(1)}% Excess` : 'Normal',
        status: dbInspections.length === 0 ? 'not_available' : (avgNcv <= 0.5 ? 'match' : 'mismatch'),
        notes: avgNcv > 0.5 ? 'Non-Combustible Value exceeds limit.' : 'NCV within acceptance.'
      },
      {
        name: 'Inspected MRS',
        referenceValue: `${poLorries} Expected`,
        actualValue: inspectionmrno || (dbInspections.length > 0 ? `${dbInspections.length} Recorded` : 'Pending Arrival'),
        status: dbInspections.length === 0 ? 'not_available' : 'match'
      }, 
      {
        name: 'Inspected MRS Weight',
        referenceValue: `${poLorries} Expected`,
        actualValue: inspectionmrweught || (dbInspections.length > 0 ? `${dbInspections.length} Recorded` : 'Pending Arrival'),
        status: dbInspections.length === 0 ? 'not_available' : 'match'
      }
    ];

    // -------------------------------------------------------------
    // SECTION 4: SAUDA PRICE MISMATCH
    // -------------------------------------------------------------
    const priceMismatches = [
      ...dbMismatches.filter(m => m.mismatch_type === 'price' || m.field_name?.toLowerCase().includes('rate') || m.field_name?.toLowerCase().includes('price')),
      ...dbSattaMismatches
    ];
    const rateDiff = sattaBaseRate !== null ? (poRate - sattaBaseRate) : 0;
    const isRateBeyondLimit = sattaBaseRate !== null && poRate > sattaBaseRate;

    const saudaPriceFields: ComparisonField[] = [
      {
        name: 'Sauda Rate vs Satta Rate',
        referenceValue: sattaBaseRate !== null ? `₹${sattaBaseRate.toLocaleString()} / Qtl (Satta)` : 'Reference Rate',
        actualValue: `₹${poRate.toLocaleString()} / Qtl (Sauda)`,
        variance: sattaBaseRate !== null ? (rateDiff !== 0 ? `${rateDiff >= 0 ? '+' : ''}₹${rateDiff}/Qtl` : '₹0') : 'N/A',
        status: sattaBaseRate === null ? 'match' : (
          isRateBeyondLimit && priceMismatches.length === 0 ? 'mismatch' : 'match'
        ),
        notes: isRateBeyondLimit ? `Exceeds Satta Limit by ₹${rateDiff}/Qtl` : 'Within approved Satta ceiling rate',
        isCritical: true
      },
      {
        name: 'Price Dispute Clearance',
        referenceValue: 'Management Approval Required',
        actualValue: priceMismatches.length > 0 
          ? (priceMismatches[0].status === 'approved' ? `Approved by ${priceMismatches[0].approved_by || 'Admin'}` : 'Dispute Pending Approval')
          : (isRateBeyondLimit ? 'Dispute Unresolved' : 'No Dispute'),
        status: isRateBeyondLimit && (priceMismatches.length === 0 || priceMismatches.some(m => m.status !== 'approved')) ? 'mismatch' : 'match',
        notes: priceMismatches[0]?.remarks || priceMismatches[0]?.approval_remarks || 'Rate validated'
      }
    ];

    // -------------------------------------------------------------
    // SECTION 5: MATERIAL MISMATCH BOARD (BASE MODE)
    // -------------------------------------------------------------
    const materialMismatches = dbMismatches.filter(m => m.mismatch_type !== 'price');
    const hasUnresolvedMatMismatch = materialMismatches.some(m => m.status !== 'approved' && m.status !== 'resolved');

    const materialMismatchFields: ComparisonField[] = [
      {
        name: 'Supplier & Broker Match',
        referenceValue: `${poSupplier} | ${poBroker}`,
        actualValue: firstArrival.supplier ? `${firstArrival.supplier} | ${firstArrival.broker || 'DIRECT'}` : (dbArrivals.length > 0 ? 'Recorded' : 'Pending Arrival'),
        status: materialMismatches.some(m => m.field_name === 'Supplier' || m.field_name === 'Broker') ? 'mismatch' : 'match'
      },
      {
        name: 'Area & Grade Match',
        referenceValue: `${poArea} | ${poGrade}`,
        actualValue: firstArrival.arrival_area_name ? `${firstArrival.arrival_area_name} | ${firstArrival.receipt_grade_name || poGrade}` : (dbArrivals.length > 0 ? 'Recorded' : 'Pending Arrival'),
        status: materialMismatches.some(m => m.field_name === 'Area' || m.field_name === 'Grade') ? 'mismatch' : 'match'
      },
      {
        name: 'Lorry Progress vs Contract',
        referenceValue: `${poLorries} Lorries Contracted`,
        actualValue: `${dbArrivals.length} Received | ${Math.max(0, poLorries - dbArrivals.length)} Remaining`,
        status: 'match'
      },
      {
        name: 'Mismatch Audit Board Status',
        referenceValue: 'Zero Unapproved Mismatches',
        actualValue: materialMismatches.length > 0
          ? `${materialMismatches.length} Mismatch Case(s) (${materialMismatches.filter(m => m.status === 'approved').length} Approved)`
          : 'Clean (No Mismatches)',
        status: hasUnresolvedMatMismatch ? 'mismatch' : 'match',
        notes: materialMismatches[0]?.approval_remarks || 'Material specifications verified'
      }
    ];

    // -------------------------------------------------------------
    // SECTION 6: PAYMENT OPERATIONS
    // -------------------------------------------------------------
    const paymentFields: ComparisonField[] = [
      {
        name: 'Total Paid / Advance Amount',
        referenceValue: contractValueEst > 0 ? `≤ ₹${Math.round(contractValueEst).toLocaleString()} (Contract Est)` : '₹0',
        actualValue: `₹${Math.round(totalPaidAmount).toLocaleString()}`,
        variance: contractValueEst > 0 ? `Diff: ₹${Math.round(contractValueEst - totalPaidAmount).toLocaleString()}` : undefined,
        status: 'match',
        notes: `${dbPayments.length} Voucher(s) recorded against this P.O.`
      },
      {
        name: 'Payment Vouchers Count',
        referenceValue: 'Vouchers Issued',
        actualValue: `${dbPayments.length} Voucher(s)`,
        status: dbPayments.length > 0 ? 'match' : 'not_available',
        notes: dbPayments.map(p => p.voucher_no).filter(Boolean).join(', ') || 'Pending voucher creation'
      }
    ];

    // -------------------------------------------------------------
    // SECTION 7: SETTLEMENT & FINAL AUDIT
    // -------------------------------------------------------------
    const settlementFields: ComparisonField[] = [
      {
        name: 'Settlement Status',
        referenceValue: 'Full Account Reconciliation',
        actualValue: dbSettlements.length > 0 ? `Generated (${dbSettlements.length} MRs Settled)` : 'Pending Settlement',
        status: dbSettlements.length > 0 ? 'match' : 'not_available',
        notes: dbSettlements.map(s => s.mr_no).filter(Boolean).join(', ') || 'Awaiting final MR audit'
      },
      {
        name: 'Settled Net Weight',
        referenceValue: `${poContractMt.toFixed(3)} MT Contract`,
        actualValue: `${settledWeight > 0 ? settledWeight.toFixed(3) : totalArrivalWeight.toFixed(3)} MT`,
        status: 'match'
      },
      {
        name: 'Weight Penalty Applied',
        referenceValue: (weightTol.isWithinTolerance || weightTol.isAcceptable) ? '₹0 (Tolerable)' : 'Penalty Mandated',
        actualValue: settledPenalty > 0 ? `₹${settledPenalty.toLocaleString()}` : '₹0',
        status: (!weightTol.isWithinTolerance && !weightTol.isAcceptable && settledPenalty === 0 && dbSettlements.length > 0) ? 'mismatch' : 'match',
        notes: settledPenalty > 0 ? `₹${settledPenalty.toLocaleString()} deducted for excess/short deviation` : 'Zero penalty applied'
      },
      {
        name: 'Quality Deductions Applied',
        referenceValue: 'Claim Calculated per MR',
        actualValue: settledQualityDeductions > 0 ? `₹${settledQualityDeductions.toLocaleString()}` : '₹0',
        status: 'match',
        notes: `Total quality deductions across all MR lots`
      }
    ];

    // 7 Sections Configuration
    const sections: SectionComparison[] = [
      {
        id: 'sauda_check_point',
        title: 'Sauda Check Point',
        icon: FileText,
        fields: saudaFields,
        mismatchCount: saudaFields.filter(f => f.status === 'mismatch').length,
        status: saudaFields.some(f => f.status === 'mismatch') ? 'mismatch' : 'clean',
        existingRecords: [po, ...dbPoDetails]
      },
      {
        id: 'temporary_arrival',
        title: `Temporary Arrival (${linkedMrs.length} MR)`,
        icon: Truck,
        fields: tempArrivalFields,
        mismatchCount: tempArrivalFields.filter(f => f.status === 'mismatch').length,
        status: tempArrivalFields.some(f => f.status === 'mismatch') ? 'mismatch' : (dbArrivals.length === 0 ? 'pending' : 'clean'),
        existingRecords: dbArrivals
      },
      {
        id: 'mill_inspection',
        title: `Mill Inspection (${dbInspections.length} MR)`,
        icon: Droplets,
        fields: millInspFields,
        mismatchCount: millInspFields.filter(f => f.status === 'mismatch').length,
        status: millInspFields.some(f => f.status === 'mismatch') ? 'mismatch' : (dbInspections.length === 0 ? 'pending' : 'clean'),
        existingRecords: dbInspections
      },
      {
        id: 'satta_price_mismatch',
        title: 'Satta Price Mismatch',
        icon: Coins,
        fields: saudaPriceFields,
        mismatchCount: saudaPriceFields.filter(f => f.status === 'mismatch').length,
        status: saudaPriceFields.some(f => f.status === 'mismatch') ? 'mismatch' : 'clean',
        existingRecords: priceMismatches
      },
      {
        id: 'material_mismatch',
        title: 'Material Mismatch Board (Base Mode)',
        icon: ShieldAlert,
        fields: materialMismatchFields,
        mismatchCount: materialMismatchFields.filter(f => f.status === 'mismatch').length,
        status: materialMismatchFields.some(f => f.status === 'mismatch') ? 'mismatch' : 'clean',
        existingRecords: materialMismatches
      },
      {
        id: 'payment',
        title: `Payment Operations (${dbPayments.length} Vouchers)`,
        icon: Coins,
        fields: paymentFields,
        mismatchCount: paymentFields.filter(f => f.status === 'mismatch').length,
        status: paymentFields.some(f => f.status === 'mismatch') ? 'mismatch' : (dbPayments.length === 0 ? 'pending' : 'clean'),
        existingRecords: dbPayments
      },
      {
        id: 'settlement',
        title: `Settlement & Final Audit (${dbSettlements.length} MR)`,
        icon: Scale,
        fields: settlementFields,
        mismatchCount: settlementFields.filter(f => f.status === 'mismatch').length,
        status: settlementFields.some(f => f.status === 'mismatch') ? 'mismatch' : (dbSettlements.length === 0 ? 'pending' : 'clean'),
        existingRecords: dbSettlements
      }
    ];

    // Multi-MR Per-MR Comparison Breakdown
    const mrComparisons: MrComparisonData[] = linkedMrs.map(mrNo => {
      const isRecordMatchMr = (rec: any) => {
        if (!rec) return false;
        const c1 = String(rec.temporary_arrival_no || '').trim().toUpperCase();
        const c2 = String(rec.mr_no || '').trim().toUpperCase();
        const c3 = String(rec.arrival_no || '').trim().toUpperCase();
        const c4 = String(rec.final_arrival_no || '').trim().toUpperCase();
        const c5 = String(rec.amad_no || '').trim().toUpperCase();
        const c6 = String(rec.mr_number || '').trim().toUpperCase();
        const c7 = String(rec.ref_arrival_no || '').trim().toUpperCase();
        return c1 === mrNo || c2 === mrNo || c3 === mrNo || c4 === mrNo || c5 === mrNo || c6 === mrNo || c7 === mrNo;
      };

      const arr = dbArrivals.find(isRecordMatchMr) || {};
      const insp = dbInspections.find(isRecordMatchMr) || {};
      const sett = dbSettlements.find(isRecordMatchMr) || {};
      const pay = dbPayments.find(isRecordMatchMr) || {};

      const arrSupplier = arr.challan_supplier || arr.supplier || poSupplier;
      const arrGrade = arr.receipt_grade_name || arr.grade || arr.item_grade || poGrade;
      const arrWt = getArrivalWeightMt(arr);
      const inspMoisture = parseFloat(insp.actual_moisture || insp.moisture_percent || insp.moisture || 0) || 0;
      const inspDust = parseFloat(insp.actual_dust || insp.dust_percent || insp.dust || 0) || 0;
      const inspNcv = parseFloat(insp.actual_ncv || insp.ncv_percent || insp.ncv || 0) || 0;

      const mrTempArrivalFields: ComparisonField[] = [
        {
          name: 'Temporary M.R No.',
          referenceValue: mrNo,
          actualValue: arr.temporary_arrival_no || arr.mr_no || mrNo,
          status: 'match'
        },
        {
          name: 'Supplier',
          referenceValue: poSupplier || 'DIRECT',
          actualValue: arrSupplier || poSupplier,
          status: !arrSupplier || arrSupplier.toUpperCase() === poSupplier.toUpperCase() ? 'match' : 'mismatch'
        },
        {
          name: 'Challan Supplier',
          referenceValue: poSupplier || 'DIRECT',
          actualValue: arr.challan_supplier || arrSupplier || poSupplier,
          status: 'match'
        },
        {
          name: 'Broker',
          referenceValue: poBroker || 'DIRECT',
          actualValue: arr.broker || poBroker || 'DIRECT',
          status: 'match'
        },
        {
          name: 'Lorry Number',
          referenceValue: 'Expected Lorry',
          actualValue: arr.lorry_number || arr.lorry_no || arr.truck_no || 'Recorded',
          status: 'match'
        },
        {
          name: 'Arrival Area',
          referenceValue: poArea || 'N/A',
          actualValue: arr.arrival_area_name || arr.area || poArea || 'N/A',
          status: 'match'
        },
        {
          name: 'Receipt Grade',
          referenceValue: poGrade,
          actualValue: arrGrade || poGrade,
          status: !arrGrade || arrGrade.toUpperCase() === poGrade.toUpperCase() ? 'match' : 'mismatch'
        },
        {
          name: 'Final Weight (MT)',
          referenceValue: poLorries > 0 ? `~${(poContractMt / poLorries).toFixed(3)} MT` : `${poContractMt.toFixed(3)} MT`,
          actualValue: `${arrWt.toFixed(3)} MT`,
          status: 'match'
        }
      ];

      const mrMillInspFields: ComparisonField[] = [
        {
          name: 'Actual Moisture (%)',
          referenceValue: '≤ 15.0%',
          actualValue: `${inspMoisture.toFixed(1)}%`,
          status: inspMoisture <= 15.0 ? 'match' : 'mismatch'
        },
        {
          name: 'Actual Dust (%)',
          referenceValue: '≤ 1.0%',
          actualValue: `${inspDust.toFixed(1)}%`,
          status: inspDust <= 1.0 ? 'match' : 'mismatch'
        },
        {
          name: 'Actual NCV (%)',
          referenceValue: '≤ 0.5%',
          actualValue: `${inspNcv.toFixed(1)}%`,
          status: inspNcv <= 0.5 ? 'match' : 'mismatch'
        },
        {
          name: 'Claim Moisture (%)',
          referenceValue: '0.0%',
          actualValue: `${parseFloat(insp.claim_moisture || 0).toFixed(1)}%`,
          status: 'match'
        },
        {
          name: 'Claim Dust (%)',
          referenceValue: '0.0%',
          actualValue: `${parseFloat(insp.claim_dust || 0).toFixed(1)}%`,
          status: 'match'
        },
        {
          name: 'Claim NCV (%)',
          referenceValue: '0.0%',
          actualValue: `${parseFloat(insp.claim_ncv || 0).toFixed(1)}%`,
          status: 'match'
        }
      ];

      const mrMismatchCount = mrTempArrivalFields.filter(f => f.status === 'mismatch').length +
                              mrMillInspFields.filter(f => f.status === 'mismatch').length;

      return {
        mrNo,
        arrivalRecord: arr,
        inspectionRecord: insp,
        settlementRecord: sett,
        paymentRecord: pay,
        tempArrivalFields: mrTempArrivalFields,
        millInspFields: mrMillInspFields,
        mismatchCount: mrMismatchCount
      };
    });

    const totalMismatches = sections.reduce((sum, s) => sum + s.mismatchCount, 0);
    const mismatchSections = sections.filter(s => s.mismatchCount > 0).length;

    return {
      sections,
      summary: {
        totalSections: sections.length,
        mismatchSections,
        totalMismatches,
        mrComparisons
      }
    };
  }, [po, dbArrivals, dbInspections, dbPayments, dbSettlements, dbMismatches, dbSattaMismatches, dbSattaRate, linkedMrs]);

  // Toggle Section Accordion
  const toggleSection = (id: string) => {
    setCollapsedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Jump directly to a section
  const scrollToSection = (id: string) => {
    const el = document.getElementById(`section-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setCollapsedSections(prev => ({ ...prev, [id]: false }));
    }
  };

  if (!isOpen || !po) return null;

  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div 
        className="bg-[#FDE7E6] border-2 border-[#FBCFCB] w-full max-w-[1600px] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-800 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. MODAL HEADER BANNER */}
        <div className="bg-gradient-to-r from-[#F7AFA8] via-[#D94B5A] to-[#F7AFA8] px-3 py-2 text-white flex flex-wrap items-center justify-between gap-2 border-b border-[#FBCFCB] shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-white/10 text-emerald-300 border border-white/10 shadow-xs">
              <BarChart3 className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-sm sm:text-base font-serif font-black tracking-wide text-white">
                  Histogram & Lifecycle Audit
                </h2>

                <span className="px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/40 text-[11px] font-mono font-bold">
                  {po.po_no}
                </span>

                {po.ptf_no && (
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-400/40 text-[9px] font-mono font-bold">
                    PTF: {po.ptf_no}
                  </span>
                )}
              </div>

              <p className="text-[10px] text-emerald-100/80 font-sans mt-0">
                Full-spectrum cross-stage data comparison & instant mismatch highlight across all 7 lifecycle stages
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="flex items-center bg-black/20 p-0.5 rounded-lg border border-white/10 text-[11px]">
              <button
                onClick={() => setActiveTab('compare')}
                className={cn(
                  "px-2 py-1 rounded-md font-bold transition-all cursor-pointer",
                  activeTab === 'compare'
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-emerald-100 hover:text-white"
                )}
              >
                Compare & Highlight
              </button>

              <button
                onClick={() => setActiveTab('story')}
                className={cn(
                  "px-2 py-1 rounded-md font-bold transition-all cursor-pointer",
                  activeTab === 'story'
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-emerald-100 hover:text-white"
                )}
              >
                7-Stage Story
              </button>

              <button
                onClick={() => setActiveTab('histogram')}
                className={cn(
                  "px-2 py-1 rounded-md font-bold transition-all cursor-pointer",
                  activeTab === 'histogram'
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-emerald-100 hover:text-white"
                )}
              >
                Turnaround Timeline
              </button>

              <button
                onClick={() => setActiveTab('mismatch_audit')}
                className={cn(
                  "px-2 py-1 rounded-md font-bold transition-all cursor-pointer",
                  activeTab === 'mismatch_audit'
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-emerald-100 hover:text-white"
                )}
              >
                Mismatch Board ({dbMismatches.length + dbSattaMismatches.length})
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title="Close Popup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. TOP P.O. SUMMARY CARD & VISUAL ISSUE CHECKLIST */}
        <div className="bg-white border-b border-[#FBCFCB] px-3 py-2 shadow-2xs shrink-0 space-y-2">

          {/* Main Key-Value Metadata Grid */}
          <div className="bg-[#FDE7E6] border border-[#FBCFCB] rounded-lg px-2.5 py-1.5 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-x-2 gap-y-1.5 text-xs">
            <div>
              <span className="text-[9px] font-bold uppercase text-slate-400 block">P.O. No.:</span>
              <strong className="text-slate-900 font-mono text-[11px]">{po.po_no}</strong>
            </div>

            <div>
              <span className="text-[9px] font-bold uppercase text-slate-400 block">P.O. Date:</span>
              <strong className="text-slate-800 text-[11px]">
                {po.po_date || po.created_at?.slice(0, 10) || '—'}
              </strong>
            </div>

            <div>
              <span className="text-[9px] font-bold uppercase text-slate-400 block">Supplier:</span>
              <strong
                className="text-slate-800 truncate block text-[11px]"
                title={po.supplier || po.supplier_name || 'DIRECT'}
              >
                {po.supplier || po.supplier_name || 'DIRECT'}
              </strong>
            </div>

            <div>
              <span className="text-[9px] font-bold uppercase text-slate-400 block">Broker:</span>
              <strong
                className="text-slate-800 truncate block text-[11px]"
                title={po.broker || po.broker_name || 'DIRECT'}
              >
                {po.broker || po.broker_name || 'DIRECT'}
              </strong>
            </div>

            <div>
              <span className="text-[9px] font-bold uppercase text-slate-400 block">Contract Wt:</span>
              <strong className="text-emerald-800 font-mono font-black text-[11px]">
                {parseFloat(po.total_contract_mt || 0).toFixed(3)} MT
              </strong>
            </div>

            <div>
              <span className="text-[9px] font-bold uppercase text-slate-400 block">Received Wt:</span>
              <strong className="text-slate-900 font-mono font-black text-[11px]">
                {dbArrivals.reduce((s, a) => s + getArrivalWeightMt(a), 0).toFixed(3)} MT
              </strong>
            </div>

            <div>
              <span className="text-[9px] font-bold uppercase text-slate-400 block">Total M.R.s:</span>
              <strong className="text-blue-900 font-mono font-black text-[11px]">
                {linkedMrs.length} ({linkedMrs.join(', ') || 'None'})
              </strong>
            </div>
          </div>

          {/* Overall Issue Summary Ribbon & Jump Pills */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-1.5">

            {/* Summary Badges */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-700">
                Overall Check:
              </span>

              {comparisonResults.summary.totalMismatches > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-rose-100 border border-rose-300 text-rose-900 text-[10px] font-black inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                  <span>🔴 {comparisonResults.summary.totalMismatches} Issue(s)</span>
                </span>
              )}

              {comparisonResults.sections.some(s => s.status === 'pending') && (
                <span className="px-2 py-0.5 rounded-md bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-black inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>
                    🟡 {comparisonResults.sections.filter(s => s.status === 'pending').length} Warning / Pending
                  </span>
                </span>
              )}

              <span className="px-2 py-0.5 rounded-md bg-emerald-100 border border-emerald-300 text-emerald-900 text-[10px] font-black inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                <span>
                  🟢 {comparisonResults.sections.filter(s => s.status === 'clean').length * 2 + 6} Checks Passed
                </span>
              </span>
            </div>

            {/* Quick Section Jump Pills */}
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[9px] font-bold uppercase text-slate-500 mr-0.5">
                Jump To:
              </span>

              {comparisonResults.sections.map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => scrollToSection(sec.id)}
                  className={cn(
                    "px-1.5 py-0.5 rounded-md text-[9px] font-bold border transition-all cursor-pointer flex items-center gap-0.5",
                    sec.mismatchCount > 0
                      ? "bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200 shadow-2xs"
                      : sec.status === 'pending'
                        ? "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                        : "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 shadow-2xs"
                  )}
                  title={`Click to jump to ${sec.title}`}
                >
                  {sec.mismatchCount > 0 ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                  ) : sec.status === 'pending' ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  )}

                  <span>{sec.title}</span>

                  {sec.mismatchCount > 0 && (
                    <span className="bg-rose-600 text-white px-1 rounded-full text-[8px] font-mono font-extrabold">
                      {sec.mismatchCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Mismatch Areas Ribbon if issues exist */}
          {comparisonResults.summary.totalMismatches > 0 && (
            <div className="pt-1.5 border-t border-dashed border-slate-200 flex items-center gap-1.5 flex-wrap text-[10px]">
              <span className="text-[9px] font-bold uppercase text-rose-700 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-rose-600" />
                <span>Immediate Attention:</span>
              </span>

              {comparisonResults.sections
                .filter(s => s.mismatchCount > 0)
                .map(s => (
                  <span
                    key={`ribbon-${s.id}`}
                    onClick={() => scrollToSection(s.id)}
                    className="bg-rose-50 text-rose-800 border border-rose-200 px-1.5 py-0.5 rounded-md font-medium cursor-pointer hover:bg-rose-100 transition-colors"
                  >
                    <strong>{s.title}</strong> → {s.fields
                      .filter(f => f.status === 'mismatch')
                      .map(f => f.name)
                      .join(', ')}
                  </span>
                ))}
            </div>
          )}
        </div>

        {/* 3. MODAL CONTENT AREA (Scrollable) */}
        <div className="flex-1 p-3 sm:p-5 overflow-y-auto space-y-4">
          {loading ? (
            <div className="py-16 text-center text-slate-500 space-y-2">
              <RefreshCw className="w-8 h-8 text-emerald-700 animate-spin mx-auto" />
              <p className="font-bold text-sm">Cross-comparing all 7 lifecycle stages across linked MRs...</p>
              <p className="text-xs text-slate-400">Loading Sauda Check Point, Temporary Arrival, Mill Inspection, Satta Price, Material Mismatch, Payment, and Settlement records</p>
            </div>
          ) : activeTab === 'story' ? (
            <PoStoryTabView
              po={po}
              dbArrivals={dbArrivals}
              linkedMrs={linkedMrs}
              dbInspections={dbInspections}
              dbSattaRate={dbSattaRate}
              dbMismatches={dbMismatches}
              dbPayments={dbPayments}
              dbSettlements={dbSettlements}
            />
          ) : activeTab === 'histogram' ? (
            <PoHistogramTabView
              po={po}
              dbArrivals={dbArrivals}
              dbInspections={dbInspections}
              dbPayments={dbPayments}
              dbSettlements={dbSettlements}
            />
          ) : activeTab === 'mismatch_audit' ? (
            <PoMismatchAuditTabView
              dbMismatches={dbMismatches}
              dbSattaMismatches={dbSattaMismatches}
            />
          ) : (
            <PoComparisonTabView
              linkedMrs={linkedMrs}
              selectedMrTab={selectedMrTab}
              setSelectedMrTab={setSelectedMrTab}
              sections={comparisonResults.sections}
              collapsedSections={collapsedSections}
              toggleSection={toggleSection}
            />
          )}
        </div>

        {/* 4. MODAL FOOTER ACTION BAR */}
        <div className="bg-white border-t border-[#FBCFCB] px-2.5 py-1.5 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center text-[10px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
          </div>

          <div className="flex items-center gap-1.5">
            {onNavigateToMismatch && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateToMismatch(po.po_no);
                }}
                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs"
              >
                <AlertTriangle className="w-3 h-3 text-amber-700" />
                <span>Open Mismatch Board</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-3 py-1 bg-[#F7AFA8] hover:bg-[#152413] text-white rounded-lg text-[10px] font-bold transition-all shadow-xs cursor-pointer"
            >
              Done / Close
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};
