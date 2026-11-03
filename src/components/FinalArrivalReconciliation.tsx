import React, { useState, useEffect, useRef } from 'react';
import { getCurrentUserContext } from '../lib/permissions';
import { 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  RefreshCw, 
  FileSpreadsheet, 
  Plus, 
  Search, 
  ArrowLeft, 
  Layers,
  Check,
  HelpCircle,
  TrendingUp,
  Scale,
  Sparkles,
  PlayCircle,
  BarChart,
  Eye,
  EyeOff,
  Flame,
  Grid
} from 'lucide-react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LineChart as RechartsLineChart,
  Line
} from 'recharts';
import Papa from 'papaparse';
import { supabase } from '../lib/supabase';
import { cn, sanitizeCsvData } from '../lib/utils';

import { canViewCompletedData } from '../lib/permissions';

import { ReconciliationRecord } from "../types/reconciliation.types";
import { ReconciliationAnalyticsPanel } from "./final-arrival/ReconciliationAnalyticsPanel";

export type { ReconciliationRecord };

interface FinalArrivalReconciliationProps {
  onBack: () => void;
  onSelectInspectionForFA: (inspection: any) => void;
}

export default function FinalArrivalReconciliation({ onBack, onSelectInspectionForFA }: FinalArrivalReconciliationProps) {
  const [loading, setLoading] = useState(false);
  const [reconciledItems, setReconciledItems] = useState<ReconciliationRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'mismatch' | 'pending_inspection' | 'orphan_inspection' | 'fully_matched'>('all');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Safety threshold (%) configuration for arrival variance background audit checks
  const [varianceThreshold, setVarianceThreshold] = useState<number>(5);
  const inMemoryCustomMismatchesRef = useRef<any[]>([]);
  const inMemoryAlertedMismatchIdsRef = useRef<string[]>([]);

  // Background check that automatically registers a custom Mismatch Case and alerts the operator
  const performVarianceBackgroundCheck = (items: ReconciliationRecord[], thresholdPercent: number) => {
    if (items.length === 0) return;
    const THRESHOLD = thresholdPercent / 100;
    let customMismatches: any[] = inMemoryCustomMismatchesRef.current;
    let alertedMismatchIds: string[] = inMemoryAlertedMismatchIdsRef.current;
    let newlyAlertedCount = 0;
    let newlyCreatedCount = 0;

    items.forEach(item => {
      // Check applies to matched entries (status 'mismatch' or 'fully_matched')
      if (item.status === 'mismatch' || item.status === 'fully_matched') {
        const expectedQty = item.expected_qty || 0;
        const actualQty = item.actual_qty || 0;
        const expectedWt = item.expected_weight || 0;
        const actualWt = item.actual_weight || 0;

        if (expectedQty > 0 && expectedWt > 0) {
          const qtyDiffPercent = Math.abs(actualQty - expectedQty) / expectedQty;
          const wtDiffPercent = Math.abs(actualWt - expectedWt) / expectedWt;

          // If variance in either quantity or weight exceeds safety threshold
          if (qtyDiffPercent > THRESHOLD || wtDiffPercent > THRESHOLD) {
            const mismatchId = `MIS-FA-${item.final_arrival_no || item.id}`;

            // Check if mismatch case already exists in custom mismatches list
            const alreadyExists = customMismatches.some(cm => cm.id === mismatchId);
            if (!alreadyExists) {
              const qtyVarSign = actualQty >= expectedQty ? '+' : '';
              const wtVarSign = actualWt >= expectedWt ? '+' : '';
              const qtyVarText = `${qtyVarSign}${(actualQty - expectedQty).toFixed(1)} Bales (${(qtyDiffPercent * 100).toFixed(1)}%)`;
              const wtVarText = `${wtVarSign}${(actualWt - expectedWt).toFixed(2)} MT (${(wtDiffPercent * 100).toFixed(1)}%)`;

              const newMismatch = {
                id: mismatchId,
                sourceType: 'weighbridge_wt' as const,
                sourceRef: item.final_arrival_no || 'FA-RECON',
                supplierName: item.arrival_supplier || item.inspection_supplier || 'UNKNOWN SUPPLIER',
                poNo: item.arrival_po || item.inspection_po || 'NOT LINKED',
                saudaNo: 'N/A',
                lorryNo: item.lorry_number || 'N/A',
                detectedAt: new Date().toISOString().split('T')[0],
                issueDescription: `Final Arrival weighbridge/quantity variance exceeds safety compliance limit of ${thresholdPercent}%. Expected: ${expectedQty.toFixed(1)} Bales / ${expectedWt.toFixed(2)} MT, Actual Received: ${actualQty.toFixed(1)} Bales / ${actualWt.toFixed(2)} MT.`,
                expectedValue: `${expectedQty.toFixed(1)} Bales / ${expectedWt.toFixed(2)} MT`,
                actualValue: `${actualQty.toFixed(1)} Bales / ${actualWt.toFixed(2)} MT`,
                difference: `Qty Diff: ${qtyVarText}, Weight Diff: ${wtVarText}`,
                severity: (qtyDiffPercent > 0.15 || wtDiffPercent > 0.15) ? 'high' as const : 'medium' as const,
                status: 'pending' as const
              };

              customMismatches.push(newMismatch);
              newlyCreatedCount++;

              if (supabase) {
                supabase.from('material_mismatch').upsert({
                  mismatch_id: mismatchId,
                  po_no: item.arrival_po || item.inspection_po || null,
                  arrival_no: item.final_arrival_no || null,
                  supplier: item.arrival_supplier || item.inspection_supplier || null,
                  lorry_number: item.lorry_number || null,
                  issue_description: newMismatch.issueDescription,
                  expected_value: newMismatch.expectedValue,
                  actual_value: newMismatch.actualValue,
                  difference: newMismatch.difference,
                  severity: newMismatch.severity,
                  status: 'pending'
                }, { onConflict: 'mismatch_id' }).then(() => {});
              }
            }

            // Check if user has already been alerted for this exact mismatch
            const alreadyAlerted = alertedMismatchIds.includes(mismatchId);
            if (!alreadyAlerted) {
              alertedMismatchIds.push(mismatchId);
              newlyAlertedCount++;

              // Delay slightly to prevent blocking UI load thread
              setTimeout(() => {
                window.alert(
                  `⚠️ SECURITY COMPLIANCE ALERT: ARRIVAL VARIANCE EXCEEDS SAFETY LIMIT!\n\n` +
                  `Final Arrival Voucher: #${item.final_arrival_no || 'N/A'}\n` +
                  `Supplier: ${item.arrival_supplier || item.inspection_supplier || 'N/A'}\n` +
                  `Lorry Number: ${item.lorry_number || 'N/A'}\n\n` +
                  `Expected (Lab Inspection Detail): ${expectedQty.toFixed(1)} Bales | ${expectedWt.toFixed(2)} MT\n` +
                  `Actual Received (Physical Weighbridge): ${actualQty.toFixed(1)} Bales | ${actualWt.toFixed(2)} MT\n\n` +
                  `Variance exceeds safety threshold of ${thresholdPercent}%.\n` +
                  `A formal 'Mismatch Case' audit record (#${mismatchId}) has been dynamically generated for compliance desk review.`
                );
              }, 400);
            }
          }
        }
      }
    });

    if (newlyCreatedCount > 0) {
      inMemoryCustomMismatchesRef.current = customMismatches;
    }
    if (newlyAlertedCount > 0) {
      inMemoryAlertedMismatchIdsRef.current = alertedMismatchIds;
    }
  };

  const handleThresholdChange = (val: number) => {
    setVarianceThreshold(val);
  };

  // Stats Counters
  const [counters, setCounters] = useState({
    total: 0,
    fullyMatched: 0,
    mismatchCount: 0,
    pendingInspection: 0,
    orphanInspection: 0
  });

  const loadReconciliationData = async () => {
    setLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      // 1. Fetch actual recorded arrivals
      const { data: arrivals, error: arrivalsErr } = await supabase
        .from('final_arrival')
        .select('*');

      if (arrivalsErr) throw arrivalsErr;

      // 2. Fetch expected audit inspections
      const { data: inspections, error: inspectionsErr } = await supabase
        .from('mill_inspection_master')
        .select('*');

      if (inspectionsErr) throw inspectionsErr;

      // 2b. Fetch inspection detail lines to aggregate expected quantities/weights
      const { data: detailsData, error: detailsErr } = await supabase
        .from('mill_inspection_detail')
        .select('mr_no, quantity, challan_gross_wt');

      if (detailsErr) {
        console.warn("Could not fetch mill_inspection_detail:", detailsErr);
      }

      // 2c. Fetch mill issues to identify complete material issues
      const { data: millIssues, error: millIssuesErr } = await supabase
        .from('mill_issue_master')
        .select('issue_id, issue_no, requisition_no');

      if (millIssuesErr) {
        console.warn("Could not fetch mill_issue_master:", millIssuesErr);
      }

      const detailsList = detailsData || [];
      const arrivalsList = arrivals || [];
      const inspectionsList = inspections || [];
      const millIssuesList = millIssues || [];

      // 3. Keep track of which inspections are matched to arrivals
      const matchedInspectionIds = new Set<string>();

      const compiledRecords: ReconciliationRecord[] = [];

      // Process actual recorded arrivals
      arrivalsList.forEach((arrival) => {
        // Check for matching Material Issue Desk entry
        const matchingIssue = millIssuesList.find(issue => 
          issue.requisition_no && 
          arrival.final_arrival_no && 
          String(issue.requisition_no).trim().toUpperCase() === String(arrival.final_arrival_no).trim().toUpperCase()
        );

        // Attempt to find corresponding quality inspection
        const match = inspectionsList.find(ins => {
          // Rule A: Match by exact MR No (if provided)
          if (arrival.mr_no && ins.mr_no && String(arrival.mr_no).trim().toUpperCase() === String(ins.mr_no).trim().toUpperCase()) {
            return true;
          }
          // Rule B: Match by Arrival / Amad number
          const insArrivalNo = String(ins.arrival_no || '').trim().toUpperCase();
          const recTempArrivalNo = String(arrival.temporary_arrival_no || '').trim().toUpperCase();
          const recFinalArrivalNo = String(arrival.final_arrival_no || '').trim().toUpperCase();
          
          if (insArrivalNo && (insArrivalNo === recTempArrivalNo || insArrivalNo === recFinalArrivalNo)) {
            return true;
          }

          // Rule C: Match by Lorry Number + Supplier Name + Date range (if close)
          const insSupplier = String(ins.supplier_name || '').trim().toUpperCase();
          const recSupplier = String(arrival.supplier || '').trim().toUpperCase();
          if (arrival.lorry_number && ins.arrival_date && 
              String(ins.arrival_no || '').toUpperCase().includes(String(arrival.lorry_number).trim().toUpperCase()) &&
              (insSupplier === recSupplier || recSupplier.includes(insSupplier) || insSupplier.includes(recSupplier))) {
            return true;
          }

          return false;
        });

        // Compute actual values from recorded final arrival
        const arrUnit = (arrival.unit_name || arrival.unit || '').toString().trim().toUpperCase();
        const isArrLoose = arrUnit.includes('LOOSE') || arrUnit === 'LOOSE';
        const actQty = isArrLoose ? 0 : (Number(arrival.total_packets) || 0);
        const actWeight = Number(arrival.electronic_net_weight) || Number(arrival.supplier_net_weight) || Number(arrival.challan_material_weight) || 0;

        if (match) {
          matchedInspectionIds.add(match.mr_no);

          // Sum up expected detail lines for matched inspection
          const matchDetails = detailsList.filter(d => d.mr_no === match.mr_no);
          const expQty = matchDetails.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
          const expWeight = matchDetails.reduce((acc, curr) => acc + (Number(curr.challan_gross_wt) || 0), 0);

          // Compare fields for discrepancies
          const mismatchesList: ReconciliationRecord['mismatches'] = [];

          // Compare PO
          const arrPo = String(arrival.po_no || '').trim().toUpperCase();
          const insPo = String(match.po_no || '').trim().toUpperCase();
          if (arrPo && insPo && arrPo !== insPo) {
            mismatchesList.push({
              field: 'po_no',
              label: 'Purchase Order No',
              arrivalVal: arrival.po_no,
              inspectionVal: match.po_no
            });
          }

          // Compare Supplier
          const arrSup = String(arrival.supplier || '').trim().toUpperCase();
          const insSup = String(match.supplier_name || '').trim().toUpperCase();
          if (arrSup && insSup && arrSup !== insSup && !arrSup.includes(insSup) && !insSup.includes(arrSup)) {
            mismatchesList.push({
              field: 'supplier',
              label: 'Supplier Identity',
              arrivalVal: arrival.supplier,
              inspectionVal: match.supplier_name
            });
          }

          // Compare Moisture
          const arrMoist = Number(arrival.actual_moisture) || 0;
          const insMoist = Number(match.actual_moisture) || 0;
          if (arrMoist > 0 && insMoist > 0 && Math.abs(arrMoist - insMoist) > 0.1) {
            mismatchesList.push({
              field: 'actual_moisture',
              label: 'Moisture Content %',
              arrivalVal: `${arrMoist}%`,
              inspectionVal: `${insMoist}%`
            });
          }

          // Compare Dust
          const arrDust = Number(arrival.actual_dust) || 0;
          const insDust = Number(match.actual_dust) || 0;
          if (arrDust > 0 && insDust > 0 && Math.abs(arrDust - insDust) > 0.1) {
            mismatchesList.push({
              field: 'actual_dust',
              label: 'Dust Content %',
              arrivalVal: `${arrDust}%`,
              inspectionVal: `${insDust}%`
            });
          }

          // Compare NCV
          const arrNcv = Number(arrival.actual_ncv) || 0;
          const insNcv = Number(match.actual_ncv) || 0;
          if (arrNcv > 0 && insNcv > 0 && Math.abs(arrNcv - insNcv) > 0.1) {
            mismatchesList.push({
              field: 'actual_ncv',
              label: 'Net Calorific Value',
              arrivalVal: arrNcv,
              inspectionVal: insNcv
            });
          }

          compiledRecords.push({
            id: `matched-${arrival.final_arrival_id}`,
            status: mismatchesList.length > 0 ? 'mismatch' : 'fully_matched',
            typeLabel: mismatchesList.length > 0 ? 'Discrepancy (Mismatched parameters)' : 'Fully Reconciled & Approved',
            has_mill_issue: !!matchingIssue,
            mill_issue_no: matchingIssue ? matchingIssue.issue_no : undefined,
            
            final_arrival_id: arrival.final_arrival_id,
            final_arrival_no: arrival.final_arrival_no,
            arrival_date: arrival.date,
            lorry_number: arrival.lorry_number,
            arrival_supplier: arrival.supplier,
            arrival_po: arrival.po_no,
            arrival_moisture: arrMoist,
            arrival_dust: arrDust,
            arrival_ncv: arrNcv,
            
            mr_no: match.mr_no,
            inspection_date: match.mr_date,
            inspection_supplier: match.supplier_name,
            inspection_po: match.po_no,
            inspection_moisture: insMoist,
            inspection_dust: insDust,
            inspection_ncv: insNcv,

            // Quantities and weights comparative values
            expected_qty: expQty,
            actual_qty: actQty,
            expected_weight: expWeight,
            actual_weight: actWeight,

            mismatches: mismatchesList
          });
        } else {
          // No inspection match found -> Pending quality audit inspection
          compiledRecords.push({
            id: `pending-${arrival.final_arrival_id}`,
            status: 'pending_inspection',
            typeLabel: 'Pending Lab Quality Audit',
            has_mill_issue: !!matchingIssue,
            mill_issue_no: matchingIssue ? matchingIssue.issue_no : undefined,
            
            final_arrival_id: arrival.final_arrival_id,
            final_arrival_no: arrival.final_arrival_no,
            arrival_date: arrival.date,
            lorry_number: arrival.lorry_number,
            arrival_supplier: arrival.supplier,
            arrival_po: arrival.po_no,
            arrival_moisture: Number(arrival.actual_moisture) || 0,
            arrival_dust: Number(arrival.actual_dust) || 0,
            arrival_ncv: Number(arrival.actual_ncv) || 0,

            // Quantities and weights comparative values
            expected_qty: 0,
            actual_qty: actQty,
            expected_weight: 0,
            actual_weight: actWeight,
            
            mismatches: []
          });
        }
      });

      // Find Orphaned Inspections (Inspections recorded but no recorded Final Arrival)
      inspectionsList.forEach((ins) => {
        if (!matchedInspectionIds.has(ins.mr_no)) {
          // Sum up details for the orphan inspection
          const matchDetails = detailsList.filter(d => d.mr_no === ins.mr_no);
          const expQty = matchDetails.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
          const expWeight = matchDetails.reduce((acc, curr) => acc + (Number(curr.challan_gross_wt) || 0), 0);

          compiledRecords.push({
            id: `orphan-${ins.mr_no}`,
            status: 'orphan_inspection',
            typeLabel: 'Orphan Inspection (No Arrival Registered)',
            
            mr_no: ins.mr_no,
            inspection_date: ins.mr_date,
            inspection_supplier: ins.supplier_name,
            inspection_po: ins.po_no,
            inspection_moisture: Number(ins.actual_moisture) || 0,
            inspection_dust: Number(ins.actual_dust) || 0,
            inspection_ncv: Number(ins.actual_ncv) || 0,

            expected_qty: expQty,
            actual_qty: 0,
            expected_weight: expWeight,
            actual_weight: 0,

            // To assist on-the-fly prefilling
            lorry_number: ins.arrival_no?.match(/WB-\d{2}-[A-Z]-\d{4}/gi)?.[0] || ins.arrival_no || '',
            arrival_date: ins.arrival_date || ins.mr_date,

            mismatches: []
          });
        }
      });

      // Calculate statistics counters
      const total = compiledRecords.length;
      const fullyMatched = compiledRecords.filter(c => c.status === 'fully_matched').length;
      const mismatchCount = compiledRecords.filter(c => c.status === 'mismatch').length;
      const pendingInspection = compiledRecords.filter(c => c.status === 'pending_inspection').length;
      const orphanInspection = compiledRecords.filter(c => c.status === 'orphan_inspection').length;

      setCounters({ total, fullyMatched, mismatchCount, pendingInspection, orphanInspection });
      setReconciledItems(compiledRecords);
    } catch (e: any) {
      console.error("Reconciliation loading error:", e);
      setErrorMessage(e.message || "Failed to load complete reconciliation audit trail.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReconciliationData();
  }, []);

  // Run the variance background audit check whenever items are fetched or safety limit is updated
  useEffect(() => {
    if (reconciledItems.length > 0) {
      performVarianceBackgroundCheck(reconciledItems, varianceThreshold);
    }
  }, [reconciledItems, varianceThreshold]);

  // Filter and search items
  const filteredItems = reconciledItems.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      (item.final_arrival_no || '').toLowerCase().includes(q) ||
      (item.mr_no || '').toLowerCase().includes(q) ||
      (item.lorry_number || '').toLowerCase().includes(q) ||
      (item.arrival_supplier || '').toLowerCase().includes(q) ||
      (item.inspection_supplier || '').toLowerCase().includes(q) ||
      (item.arrival_po || '').toLowerCase().includes(q) ||
      (item.inspection_po || '').toLowerCase().includes(q)
    );

    if (!canViewCompletedData() && item.status === 'fully_matched') {
      return false;
    }

    const matchesFilter = filterType === 'all' || item.status === filterType;

    return matchesSearch && matchesFilter;
  });

  // Reconcile single record difference
  const handleSingleReconcile = async (item: ReconciliationRecord) => {
    if (!item.final_arrival_id || !item.mr_no) return;
    try {
      setLoading(true);
      // Fetch corresponding quality audit master record
      const { data: insData, error: insErr } = await supabase
        .from('mill_inspection_master')
        .select('*')
        .eq('mr_no', item.mr_no)
        .maybeSingle();
        
      if (insErr || !insData) throw new Error(insErr?.message || "Lab Quality inspection record missing.");
      
      // Update final arrivals table with certified metrics
      const { error: updateErr } = await supabase
        .from('final_arrival')
        .update({
          po_no: insData.po_no || null,
          supplier: insData.supplier_name || null,
          broker: insData.broker_name || null,
          actual_moisture: insData.actual_moisture ? Number(insData.actual_moisture) : null,
          actual_dust: insData.actual_dust ? Number(insData.actual_dust) : null,
          actual_ncv: insData.actual_ncv ? Number(insData.actual_ncv) : null,
        })
        .eq('final_arrival_id', item.final_arrival_id);
        
      if (updateErr) throw updateErr;

      // Insert log audit history
      const currentUser = getCurrentUserContext().username || "prosunmajhi@gmail.com";
      try {
        await supabase.from("system_logs").insert({
          user_id: currentUser,
          action: 'RECONCILIATION',
          details: `[RECONCILIATION REPORT] Resolved discrepancy for Final Arrival: ${item.final_arrival_no} linked to MR: ${item.mr_no}. Corrected to certified lab metrics.`
        }).then(() => {}, () => {});
      } catch (err) {
        console.warn("Auditing sync write failed:", err);
      }

      setSuccessMessage(`Discrepancy for Final Arrival Voucher #${item.final_arrival_no} resolved using lab-certified values.`);
      await loadReconciliationData();
    } catch (e: any) {
      setErrorMessage("Failed to resolve discrepancy: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Reconcile all mismatch discrepancies at once
  const handleBulkReconcile = async () => {
    const mismatchList = reconciledItems.filter(r => r.status === 'mismatch');
    if (mismatchList.length === 0) {
      alert("No active mismatch discrepancies to bulk-resolve.");
      return;
    }

    if (!confirm(`Are you sure you want to force bulk-update all ${mismatchList.length} mismatched Final Arrival records to align with official lab-certified quality audits?`)) {
      return;
    }

    try {
      setLoading(true);
      let successCount = 0;

      const promises = mismatchList.map(async (item) => {
        if (!item.final_arrival_id || !item.mr_no) return;
        const { data: insData } = await supabase
          .from('mill_inspection_master')
          .select('*')
          .eq('mr_no', item.mr_no)
          .maybeSingle();

        if (insData) {
          const { error } = await supabase
            .from('final_arrival')
            .update({
              po_no: insData.po_no || null,
              supplier: insData.supplier_name || null,
              broker: insData.broker_name || null,
              actual_moisture: insData.actual_moisture ? Number(insData.actual_moisture) : null,
              actual_dust: insData.actual_dust ? Number(insData.actual_dust) : null,
              actual_ncv: insData.actual_ncv ? Number(insData.actual_ncv) : null,
            })
            .eq('final_arrival_id', item.final_arrival_id);

          if (!error) {
            successCount++;
          }
        }
      });

      await Promise.all(promises);
      setSuccessMessage(`Successfully synchronized ${successCount} mismatched record(s) to lab-certified quality values.`);
      await loadReconciliationData();
    } catch (e: any) {
      setErrorMessage("Bulk reconciliation encountered errors: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Export comparative report to CSV/Excel
  const handleExportCSV = () => {
    if (reconciledItems.length === 0) {
      alert("No reconciliation data loaded to export.");
      return;
    }

    const exportRows = reconciledItems.map((item) => {
      let mismatchesSummary = "None (Matched)";
      if (item.status === 'mismatch') {
        mismatchesSummary = item.mismatches.map(m => `${m.label}: FA [${m.arrivalVal}] vs INSP [${m.inspectionVal}]`).join(" | ");
      } else if (item.status === 'pending_inspection') {
        mismatchesSummary = "Pending Inspection Report";
      } else if (item.status === 'orphan_inspection') {
        mismatchesSummary = "Orphaned Quality Audit (No FA recorded)";
      }

      return {
        "Status Code": item.status.toUpperCase(),
        "Status Category": item.typeLabel,
        "Final Arrival No": item.final_arrival_no || 'N/A',
        "FA Date": item.arrival_date ? new Date(item.arrival_date).toLocaleDateString('en-GB') : 'N/A',
        "Lorry / Lorry Plate": item.lorry_number || 'N/A',
        "FA Supplier": item.arrival_supplier || 'N/A',
        "FA Contract PO": item.arrival_po || 'N/A',
        "FA Moisture %": item.arrival_moisture ?? 'N/A',
        "FA Dust %": item.arrival_dust ?? 'N/A',
        "FA NCV": item.arrival_ncv ?? 'N/A',
        "M.R. No": item.mr_no || 'N/A',
        "Inspection Date": item.inspection_date ? new Date(item.inspection_date).toLocaleDateString('en-GB') : 'N/A',
        "Inspection Supplier": item.inspection_supplier || 'N/A',
        "Inspection PO": item.inspection_po || 'N/A',
        "Inspection Moisture %": item.inspection_moisture ?? 'N/A',
        "Inspection Dust %": item.inspection_dust ?? 'N/A',
        "Inspection NCV": item.inspection_ncv ?? 'N/A',
        "Detected Discrepancies Details": mismatchesSummary
      };
    });

    try {
      const sanitizedData = sanitizeCsvData(exportRows);
      const csv = Papa.unparse(sanitizedData);
      const csvContent = "\uFEFF" + csv;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Final_Arrival_Quality_Reconciliation_Audit_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e: any) {
      alert("Error exporting CSV: " + e.message);
    }
  };

  // Switch back to create entry form with this inspection prefilled
  const handleRegisterOrphan = async (item: ReconciliationRecord) => {
    // We construct mock/actual initialData structure compatible with FinalArrivalEntry
    const prefilledData = {
      po_no: item.inspection_po || '',
      mr_no: item.mr_no || '',
      supplier: item.inspection_supplier || '',
      temporary_arrival_no: item.final_arrival_no || item.mr_no || '',
      temporary_arrival_date: item.arrival_date || item.inspection_date || '',
      lorry_number: item.lorry_number || '',
      actual_moisture: item.inspection_moisture || 0,
      actual_dust: item.inspection_dust || 0,
      actual_ncv: item.inspection_ncv || 0,
      remarks: `Pre-populated from Orphan Lab Quality Audit M.R. #${item.mr_no}`
    };
    onSelectInspectionForFA(prefilledData);
  };

  return (
    <div className="space-y-4 font-sans text-slate-800 animate-fade-in">
      {/* Top Banner & Title bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-300 pb-3 gap-3">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-1.5 hover:bg-slate-200 border border-slate-300 rounded text-slate-700 bg-[#f4f2ee] shadow-[1px_1px_0_0_rgba(0,0,0,0.2)] hover:shadow-md cursor-pointer transition-all duration-100 flex items-center justify-center"
            title="Return to Final Arrival list View"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-base font-black uppercase tracking-tight text-slate-800 flex items-center gap-2">
              📊 Final Arrival Quality Reconciliation Control Panel
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              Enterprise comparative matrix tracking real-time material receipt balances vs official Laboratory Inspection metrics.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Safety Variance Threshold Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-300 rounded px-2.5 py-1 ">
            <span className="text-[9px] font-black uppercase text-slate-600 tracking-wider flex items-center gap-1">
              🛡️ Safety Limit:
            </span>
            <select
 id="variancethreshold_1060" name="variancethreshold" aria-label="variancethreshold"              value={varianceThreshold}
              onChange={(e) => handleThresholdChange(Number(e.target.value))}
              className="bg-white border border-slate-350 rounded text-[9.5px] font-extrabold uppercase py-0.5 px-1.5 outline-none focus:border-indigo-500 cursor-pointer text-slate-800 font-mono"
              title="Variance tolerance safety threshold before auto-generating audit mismatch cases"
            >
              <option value="2">2% Strict</option>
              <option value="5">5% Recommended</option>
              <option value="10">10% Standard</option>
              <option value="15">15% Relaxed</option>
            </select>
          </div>

          <button 
            onClick={handleExportCSV}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-mono text-[10px] uppercase font-black px-3 py-1.5 rounded shadow-[1px_1px_0_0_rgba(0,0,0,0.3)] hover:shadow border border-emerald-600 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
            title="Download full audit discrepancy spreadsheet"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" /> Export Comparative Sheet
          </button>
          <button 
            onClick={loadReconciliationData}
            disabled={loading}
            className="bg-indigo-700 hover:bg-indigo-850 text-white font-mono text-[10px] uppercase font-black px-3 py-1.5 rounded shadow-[1px_1px_0_0_rgba(0,0,0,0.3)] hover:shadow border border-indigo-600 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95 transition-all"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> Re-run Scan
          </button>
        </div>
      </div>

      {/* Success/Error notices */}
      {successMessage && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-3 text-emerald-950 font-semibold text-xs rounded shadow-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-3 text-rose-950 font-semibold text-xs rounded shadow-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Metric summary bento cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Total comparative audits */}
        <div className="bg-slate-100 border border-slate-300 p-2.5 rounded shadow-xs flex flex-col justify-between ">
          <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Overall Audited Loads</span>
          <span className="text-xl font-mono font-black text-slate-800 leading-none mt-1">{counters.total}</span>
          <span className="text-[8.5px] text-slate-400 mt-1">Cross-table registries</span>
        </div>

        {/* Fully Matched */}
        <div className="bg-emerald-50 border border-emerald-250 p-2.5 rounded shadow-xs flex flex-col justify-between ">
          <span className="text-[9px] uppercase font-bold text-emerald-600 tracking-wider flex items-center gap-1">
            🟢 Fully Matched
          </span>
          <span className="text-xl font-mono font-black text-emerald-700 leading-none mt-1">{counters.fullyMatched}</span>
          <span className="text-[8.5px] text-emerald-600 mt-1 font-semibold">100% parameter accuracy</span>
        </div>

        {/* Parameter Mismatch */}
        <div className="bg-amber-50 border border-amber-250 p-2.5 rounded shadow-xs flex flex-col justify-between ">
          <span className="text-[9px] uppercase font-bold text-amber-600 tracking-wider flex items-center gap-1 animate-pulse">
            ⚠️ Parameter Mismatch
          </span>
          <span className="text-xl font-mono font-black text-amber-700 leading-none mt-1">{counters.mismatchCount}</span>
          <span className="text-[8.5px] text-amber-700 mt-1 font-bold">Needs lab metrics sync</span>
        </div>

        {/* Pending Inspections */}
        <div className="bg-blue-50 border border-blue-250 p-2.5 rounded shadow-xs flex flex-col justify-between ">
          <span className="text-[9px] uppercase font-bold text-blue-600 tracking-wider">Pending Quality Audit</span>
          <span className="text-xl font-mono font-black text-blue-700 leading-none mt-1">{counters.pendingInspection}</span>
          <span className="text-[8.5px] text-blue-500 mt-1">Awaiting lab checklist</span>
        </div>

        {/* Orphaned Inspections */}
        <div className="bg-rose-50 border border-rose-250 p-2.5 rounded shadow-xs flex flex-col justify-between ">
          <span className="text-[9px] uppercase font-bold text-rose-600 tracking-wider">Orphan Inspections</span>
          <span className="text-xl font-mono font-black text-rose-700 leading-none mt-1">{counters.orphanInspection}</span>
          <span className="text-[8.5px] text-rose-500 mt-1 font-bold">No Final Arrival logged</span>
        </div>
      </div>

      {/* Dynamic Quantity & Weight Reconciliation Visualizer & Heatmap */}
      <ReconciliationAnalyticsPanel
        reconciledItems={reconciledItems}
        varianceThreshold={varianceThreshold}
      />

      {/* Filtering and search desk */}
      <div className="bg-slate-200 p-2 border border-slate-350 rounded flex flex-col md:flex-row gap-3 items-center justify-between shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button 
            onClick={() => setFilterType('all')}
            className={cn(
              "px-3 py-1 text-[10px] uppercase font-black rounded cursor-pointer transition-all duration-100",
              filterType === 'all' ? "bg-slate-800 text-white shadow-inner" : "bg-white hover:bg-slate-100 border border-slate-300 text-slate-700"
            )}
          >
            All ({counters.total})
          </button>
          <button 
            onClick={() => setFilterType('mismatch')}
            className={cn(
              "px-3 py-1 text-[10px] uppercase font-black rounded cursor-pointer transition-all duration-100",
              filterType === 'mismatch' ? "bg-amber-600 text-white shadow-inner" : "bg-amber-100/60 hover:bg-amber-200 border border-amber-300 text-amber-800"
            )}
          >
            Mismatches ({counters.mismatchCount})
          </button>
          <button 
            onClick={() => setFilterType('pending_inspection')}
            className={cn(
              "px-3 py-1 text-[10px] uppercase font-black rounded cursor-pointer transition-all duration-100",
              filterType === 'pending_inspection' ? "bg-blue-600 text-white shadow-inner" : "bg-blue-100/60 hover:bg-blue-200 border border-blue-300 text-blue-800"
            )}
          >
            Pending Labs ({counters.pendingInspection})
          </button>
          <button 
            onClick={() => setFilterType('orphan_inspection')}
            className={cn(
              "px-3 py-1 text-[10px] uppercase font-black rounded cursor-pointer transition-all duration-100",
              filterType === 'orphan_inspection' ? "bg-rose-600 text-white shadow-inner" : "bg-rose-100/60 hover:bg-rose-200 border border-rose-300 text-rose-800"
            )}
          >
            Orphans ({counters.orphanInspection})
          </button>
          <button 
            onClick={() => setFilterType('fully_matched')}
            className={cn(
              "px-3 py-1 text-[10px] uppercase font-black rounded cursor-pointer transition-all duration-100",
              filterType === 'fully_matched' ? "bg-emerald-600 text-white shadow-inner" : "bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 text-emerald-800"
            )}
          >
            Fully Matched ({counters.fullyMatched})
          </button>
        </div>

        {/* Search */}
        <div className="flex bg-white border border-slate-350 rounded overflow-hidden shadow-xs w-full md:w-80">
          <input  id="search_fa_mr_no_supplier__1843" name="search_fa_mr_no_supplier_" aria-label="Search FA, MR No, supplier, contract..."
            className="flex-1 text-xs px-2.5 py-1.5 outline-none font-medium placeholder:text-slate-400" 
            placeholder="Search FA, MR No, supplier, contract..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="bg-slate-100 px-3 flex items-center justify-center border-l border-slate-200">
            <Search className="h-3.5 w-3.5 text-slate-500" />
          </div>
        </div>
      </div>

      {/* Bulk action bar if there are mismatches */}
      {counters.mismatchCount > 0 && (filterType === 'all' || filterType === 'mismatch') && (
        <div className="bg-amber-100/70 border border-amber-300 p-3 rounded flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-amber-600 text-white">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-black text-amber-950 uppercase">Active Discrepancies Found ({counters.mismatchCount} items)</p>
              <p className="text-[10px] text-amber-800 font-semibold leading-tight">These Final Arrival logs differ from lab-certified quality audits. Choose action to restore consistency.</p>
            </div>
          </div>
          <button 
            onClick={handleBulkReconcile}
            className="bg-amber-600 hover:bg-amber-700 text-white font-mono text-[9px] uppercase font-black px-3.5 py-1.5 rounded shadow-sm border border-amber-500 flex items-center gap-1.5 cursor-pointer hover:-translate-y-px active:translate-y-0 transition-all"
          >
            ⚡ Bulk Reconcile with Quality Values
          </button>
        </div>
      )}

      {/* Main comparative workspace table */}
      <div className="bg-[#FBCFCB] p-1 border border-white shadow-[inset_1px_1px_0_0_rgba(0,0,0,0.2)] overflow-x-auto rounded">
        <table className="w-full text-left text-[11px] border-collapse bg-white">
          <thead>
            <tr className="bg-slate-800 text-white font-mono text-[10px] uppercase ">
              <th className="p-2 border border-slate-700 text-center w-10">Srl</th>
              <th className="p-2 border border-slate-700 w-40">Status Class</th>
              <th className="p-2 border border-slate-700 w-1/3">
                <div className="font-bold border-b border-slate-700 pb-0.5">🚚 Recorded Final Arrival Track</div>
                <div className="grid grid-cols-3 text-[8.5px] text-slate-300 pt-0.5">
                  <span>FA / Lorry / Date</span>
                  <span>Supplier / Contract PO</span>
                  <span>Lab: M / D / NCV</span>
                </div>
              </th>
              <th className="p-2 border border-slate-700 w-1/3">
                <div className="font-bold border-b border-slate-700 pb-0.5">🔬 Expected Lab Quality Audit</div>
                <div className="grid grid-cols-3 text-[8.5px] text-slate-300 pt-0.5">
                  <span>MR No / Date</span>
                  <span>Supplier / Contract PO</span>
                  <span>Lab: M / D / NCV</span>
                </div>
              </th>
              <th className="p-2 border border-slate-700 text-center w-36">Actions / Action Logs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500 font-mono italic">
                  <div className="flex flex-col items-center gap-2">
                    <RefreshCw className="h-6 w-6 animate-spin text-indigo-700" />
                    <span className="uppercase text-[10px] font-black tracking-widest text-indigo-900 animate-pulse">Scanning database nodes...</span>
                  </div>
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500 font-mono italic">
                  No matching reconciliation records found for selected filter criteria.
                </td>
              </tr>
            ) : (
              filteredItems.map((item, idx) => {
                return (
                  <tr 
                    key={item.id} 
                    className={cn(
                      "hover:bg-slate-50/80 transition-colors",
                      item.status === 'mismatch' ? "bg-amber-50/45" : "",
                      item.status === 'pending_inspection' ? "bg-blue-50/25" : "",
                      item.status === 'orphan_inspection' ? "bg-rose-50/20" : ""
                    )}
                  >
                    {/* Index */}
                    <td className="p-2 border border-slate-200 text-center font-mono font-bold text-slate-700">
                      {idx + 1}
                    </td>

                    {/* Status Class Badge */}
                    <td className="p-2 border border-slate-200">
                      <div className="space-y-1">
                        <span className={cn(
                          "px-2 py-0.5 text-[8.5px] font-black uppercase tracking-wider rounded font-mono block text-center",
                          item.status === 'fully_matched' ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "",
                          item.status === 'mismatch' ? "bg-amber-100 text-amber-800 border border-amber-300 animate-pulse" : "",
                          item.status === 'pending_inspection' ? "bg-blue-100 text-blue-800 border border-blue-300" : "",
                          item.status === 'orphan_inspection' ? "bg-rose-100 text-rose-800 border border-rose-300" : ""
                        )}>
                          {item.status === 'fully_matched' && "✅ Matched"}
                          {item.status === 'mismatch' && "⚠️ Mismatch"}
                          {item.status === 'pending_inspection' && "⏱️ Pending Lab"}
                          {item.status === 'orphan_inspection' && "🚨 Orphan"}
                        </span>
                        <div className="text-[8.5px] text-slate-500 font-mono text-center truncate">
                          {item.typeLabel}
                        </div>
                      </div>
                    </td>

                    {/* Final Arrival Column details */}
                    <td className="p-2 border border-slate-200">
                      {item.final_arrival_no ? (
                        <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                          {/* Col 1 */}
                          <div className="space-y-0.5">
                            <div className="font-mono font-bold text-slate-950 truncate flex items-center gap-1.5" title={`FA No: ${item.final_arrival_no}`}>
                              <span>{item.final_arrival_no}</span>
                              {item.has_mill_issue && (
                                <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[8px] px-1 rounded-sm font-black uppercase tracking-wider  animate-fade-in" title={`Material Issue Created: ${item.mill_issue_no || ''}`}>
                                  Complete
                                </span>
                              )}
                            </div>
                            <div className="text-[9.5px] text-slate-500 font-mono truncate">
                              Plt: {item.lorry_number || 'N/A'}
                            </div>
                            <div className="text-[9.5px] text-slate-500 font-mono">
                              {item.arrival_date ? new Date(item.arrival_date).toLocaleDateString('en-GB') : 'N/A'}
                            </div>
                          </div>

                          {/* Col 2 */}
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-800 truncate" title={item.arrival_supplier}>
                              {item.arrival_supplier || 'N/A'}
                            </div>
                            <div className="text-[9.5px] font-mono font-bold text-slate-500 truncate" title={`Contract PO: ${item.arrival_po}`}>
                              {item.arrival_po || 'DIRECT'}
                            </div>
                          </div>

                          {/* Col 3 */}
                          <div className="space-y-0.5 text-right font-mono">
                            <div className={cn(
                              "text-[10px] font-bold",
                              item.mismatches.some(m => m.field === 'actual_moisture') ? "text-rose-600 underline font-black" : "text-slate-700"
                            )}>
                              Moist: {item.arrival_moisture ?? '0'}%
                            </div>
                            <div className={cn(
                              "text-[10px] font-bold",
                              item.mismatches.some(m => m.field === 'actual_dust') ? "text-rose-600 underline font-black" : "text-slate-700"
                            )}>
                              Dust: {item.arrival_dust ?? '0'}%
                            </div>
                            <div className={cn(
                              "text-[10px] font-bold",
                              item.mismatches.some(m => m.field === 'actual_ncv') ? "text-rose-600 underline font-black" : "text-slate-700"
                            )}>
                              NCV: {item.arrival_ncv ?? '0'}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center text-slate-400 font-mono italic text-[10px] py-2">
                          -- No registered arrival record --
                        </div>
                      )}
                    </td>

                    {/* Inspection Column details */}
                    <td className="p-2 border border-slate-200">
                      {item.mr_no ? (
                        <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                          {/* Col 1 */}
                          <div className="space-y-0.5">
                            <div className="font-mono font-bold text-slate-950 truncate" title={`MR No: ${item.mr_no}`}>
                              MR No: {item.mr_no}
                            </div>
                            <div className="text-[9.5px] text-slate-500 font-mono">
                              {item.inspection_date ? new Date(item.inspection_date).toLocaleDateString('en-GB') : 'N/A'}
                            </div>
                          </div>

                          {/* Col 2 */}
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-800 truncate" title={item.inspection_supplier}>
                              {item.inspection_supplier || 'N/A'}
                            </div>
                            <div className="text-[9.5px] font-mono font-bold text-slate-500 truncate" title={`Inspection PO: ${item.inspection_po}`}>
                              PO: {item.inspection_po || 'N/A'}
                            </div>
                          </div>

                          {/* Col 3 */}
                          <div className="space-y-0.5 text-right font-mono">
                            <div className={cn(
                              "text-[10px] font-bold",
                              item.mismatches.some(m => m.field === 'actual_moisture') ? "text-emerald-700 font-black" : "text-slate-700"
                            )}>
                              M: {item.inspection_moisture ?? '0'}%
                            </div>
                            <div className={cn(
                              "text-[10px] font-bold",
                              item.mismatches.some(m => m.field === 'actual_dust') ? "text-emerald-700 font-black" : "text-slate-700"
                            )}>
                              D: {item.inspection_dust ?? '0'}%
                            </div>
                            <div className={cn(
                              "text-[10px] font-bold",
                              item.mismatches.some(m => m.field === 'actual_ncv') ? "text-emerald-700 font-black" : "text-slate-700"
                            )}>
                              N: {item.inspection_ncv ?? '0'}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center text-slate-400 font-mono italic text-[10px] py-2">
                          -- Pending quality inspection report --
                        </div>
                      )}
                    </td>

                    {/* Actions and status message */}
                    <td className="p-2 border border-slate-200 text-center">
                      {item.status === 'fully_matched' && (
                        <div className="flex items-center justify-center gap-1 text-emerald-700 font-mono text-[9px] uppercase font-black">
                          <CheckCircle2 className="h-3 w-3" /> Fully OK
                        </div>
                      )}

                      {item.status === 'mismatch' && (
                        <div className="space-y-1.5">
                          <div className="text-[8px] uppercase font-black tracking-tight text-amber-800 font-bold">
                            {item.mismatches.length} Fields Mismatch
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSingleReconcile(item)}
                            className="bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 px-2 py-0.5 rounded text-[8.5px] uppercase font-black tracking-wide cursor-pointer flex items-center gap-1 mx-auto"
                            title="Force sync arrival to match certified lab values"
                          >
                            <Check className="h-2.5 w-2.5" /> Reconcile Now
                          </button>
                        </div>
                      )}

                      {item.status === 'pending_inspection' && (
                        <span className="text-[9px] text-blue-600 font-mono uppercase font-semibold">
                          Awaiting Inspection
                        </span>
                      )}

                      {item.status === 'orphan_inspection' && (
                        <button
                          type="button"
                          onClick={() => handleRegisterOrphan(item)}
                          className="bg-rose-100 hover:bg-rose-250 text-rose-900 border border-rose-300 px-2 py-1 rounded text-[8.5px] uppercase font-black tracking-wider cursor-pointer flex items-center gap-1 mx-auto transition-colors"
                          title="Register new arrival with this pre-filled inspection data"
                        >
                          <Plus className="h-3 w-3" /> Register Arrival
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Help box */}
      <div className="bg-[#f2efe9] border border-slate-350 rounded p-3 text-[10px] space-y-1 ">
        <p className="font-bold uppercase tracking-wide text-slate-700 flex items-center gap-1 text-[10.5px]">
          <HelpCircle className="h-3.5 w-3.5 text-slate-500" /> Operational Reconciliation Guideline
        </p>
        <ul className="list-disc pl-4 space-y-0.5 text-slate-600 font-medium">
          <li><strong>Discrepancies (Mismatches):</strong> Represent linked records with differing quality levels (Moisture, Dust, NCV) or contract POs. Reconciling updates the Final Arrival table records with authenticated Lab certified values.</li>
          <li><strong>Pending Inspections:</strong> Registered Final Arrival loads that have not yet had their laboratory inspection checks finalized in the system.</li>
          <li><strong>Orphaned Quality Audits:</strong> Lab inspections registered by quality controllers for which no final arrival voucher has been logged yet in the gate office. You can click <strong>"Register Arrival"</strong> to instantly pre-fill and save their arrival.</li>
        </ul>
      </div>
    </div>
  );
}
