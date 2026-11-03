import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { useLiveAutoRefresh } from '../../hooks/useLiveAutoRefresh';
import { supabase } from '../../lib/supabase';
import { dbModule } from '../../services/dbModule';
import { enforceEditOrDeletePermission, canViewCompletedData, getCurrentUserContext } from '../../lib/permissions';
import { sanitizeCsvData } from '../../lib/utils';
import { 
  FinalArrivalRecord, 
  FinalArrivalStats, 
  DetectedConflict, 
  getRcptQty, 
  getLowestNetWeight,
  calculateNetWeightVal 
} from './finalArrivalTypes';
import { parseMonthKey } from '../common/MonthWiseCardsRibbon';

interface UseFinalArrivalRegisterLogicProps {
  isArchiveView?: boolean;
}

export function useFinalArrivalRegisterLogic({ isArchiveView = false }: UseFinalArrivalRegisterLogicProps) {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<FinalArrivalRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<FinalArrivalRecord | null>(null);

  // Pagination (100 rows per page)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, startDateFilter, endDateFilter, selectedMonthFilter]);

  const [unitList, setUnitList] = useState<string[]>(['BALES', 'DRUMS', 'LOOSE', 'P.BALES', 'H.BALES']);

  useEffect(() => {
    async function fetchUnits() {
      try {
        if (supabase) {
          const { data } = await supabase.from('unit_master').select('unit_name').order('unit_name');
          if (data && data.length > 0) {
            const fetched = data.map((u: any) => u.unit_name).filter(Boolean);
            setUnitList(prev => Array.from(new Set([...fetched, ...prev])));
          }
        }
      } catch (err) {
        console.warn("Failed to load unit_master in FinalArrival", err);
      }
    }
    fetchUnits();
  }, []);

  const [auditPopoverId, setAuditPopoverId] = useState<string | null>(null);

  // Statistics
  const [stats, setStats] = useState<FinalArrivalStats>({
    totalCount: 0,
    totalWeightMt: 0,
    totalPackets: 0,
    totalVehicles: 0
  });

  // Background Auto-Sync States
  const [backgroundSyncing, setBackgroundSyncing] = useState(false);
  const [syncStatusMessage, setSyncStatusMessage] = useState("");
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [detectedConflicts, setDetectedConflicts] = useState<DetectedConflict[]>([]);
  const [showConflictsAlert, setShowConflictsAlert] = useState(false);

  // Print system
  const [printData, setPrintData] = useState<any | null>(null);
  const [isPrintingModalOpen, setIsPrintingModalOpen] = useState(false);
  const [printColumns, setPrintColumns] = useState({
    crop_year: true,
    marka: true,
    quality: true,
    quantity_rcpt: true,
    unit: true,
    claim: false,
    gross_wt: true,
    moisture_pct: true,
    dust_pct: true,
    ncv_pct: false,
    net_wt: true,
    settlement: false,
    rate: false
  });

  const fetchRecords = async () => {
    if (records.length === 0) setLoading(true);
    try {
      const targetTable = isArchiveView ? 'm.r_archive' : 'final_arrival';
      let { data, error } = await supabase
        .from(targetTable)
        .select('*')
        .order('created_at', { ascending: false });

      if (isArchiveView && (error || !data || data.length === 0)) {
        const altRes = await supabase.from('mr_archive').select('*').order('created_at', { ascending: false });
        if (altRes.data && altRes.data.length > 0) {
          data = altRes.data;
          error = null;
        } else {
          const rawRes = await supabase.from('final_arrival').select('*').eq('status', 'settled').order('created_at', { ascending: false });
          data = rawRes.data || [];
          error = null;
        }
      }

      if (error) throw error;

      let loadedRecords = (data || []) as FinalArrivalRecord[];
      if (!isArchiveView) {
        loadedRecords = loadedRecords.filter(r => !(r as any).archived_at);
      }
      setRecords(loadedRecords);

      let weightSumQtl = 0;
      let packetsSum = 0;
      const uniqueVehicles = new Set();

      loadedRecords.forEach(r => {
        weightSumQtl += Number(r.weight_qtl) || 0;
        packetsSum += getRcptQty(r);
        if (r.lorry_number || (r as any).lorry_no || (r as any).vehicle_no) {
          uniqueVehicles.add(String(r.lorry_number || (r as any).lorry_no || (r as any).vehicle_no).trim().toUpperCase());
        }
      });

      setStats({
        totalCount: loadedRecords.length,
        totalWeightMt: Number((weightSumQtl / 10).toFixed(3)),
        totalPackets: packetsSum,
        totalVehicles: uniqueVehicles.size
      });
    } catch (e) {
      console.error('Failed to load final arrival registries:', e);
    } finally {
      setLoading(false);
    }
  };

  useLiveAutoRefresh(fetchRecords, [isArchiveView], { tables: ['final_arrival', 'm.r_archive'] });

  const runBackgroundStatusSync = async (silent = true) => {
    try {
      const { data: arrivals, error: arrivalsErr } = await supabase
        .from('final_arrival')
        .select('*');

      if (arrivalsErr) throw arrivalsErr;
      if (!arrivals || arrivals.length === 0) return;

      const { data: inspections, error: inspectionsErr } = await supabase
        .from('mill_inspection_master')
        .select('*');

      if (inspectionsErr) throw inspectionsErr;
      if (!inspections || inspections.length === 0) {
        if (!silent) {
          setSyncStatusMessage("No finalized quality audit records found in the system.");
          setTimeout(() => setSyncStatusMessage(""), 4000);
        }
        return;
      }

      const conflictsList: DetectedConflict[] = [];
      arrivals.forEach((record) => {
        const match = inspections.find(ins => {
          if (record?.mr_no && ins?.mr_no && String(record.mr_no).trim().toUpperCase() === String(ins.mr_no).trim().toUpperCase()) {
            return true;
          }
          const insArrivalNo = String(ins?.arrival_no || '').trim().toUpperCase();
          const recTempArrivalNo = String(record?.temporary_arrival_no || '').trim().toUpperCase();
          const recFinalArrivalNo = String(record?.final_arrival_no || '').trim().toUpperCase();
          
          const amadMatch = insArrivalNo && (insArrivalNo === recTempArrivalNo || insArrivalNo === recFinalArrivalNo);
          
          const insSupplier = String(ins?.supplier_name || '').trim().toUpperCase();
          const recSupplier = String(record?.supplier || '').trim().toUpperCase();
          
          const lorryMatch = (record?.lorry_number || (record as any)?.lorry_no || (record as any)?.vehicle_no) && ins?.arrival_date && 
            String(ins?.arrival_no || '').toUpperCase().includes(String((record?.lorry_number || (record as any)?.lorry_no || (record as any)?.vehicle_no)).trim().toUpperCase()) &&
            insSupplier === recSupplier;

          return amadMatch || lorryMatch;
        });

        if (match) {
          const itemConflicts: { field: string; label: string; arrivalVal: any; qualityVal: any }[] = [];
          
          const recPo = String(record.po_no || '').trim().toUpperCase();
          const insPo = String(match.po_no || '').trim().toUpperCase();
          if (recPo && insPo && recPo !== insPo) {
            itemConflicts.push({
              field: 'po_no',
              label: 'Contract PO Number',
              arrivalVal: record.po_no,
              qualityVal: match.po_no
            });
          }

          const recSup = String(record.supplier || '').trim().toUpperCase();
          const insSup = String(match.supplier_name || '').trim().toUpperCase();
          if (recSup && insSup && recSup !== insSup && !recSup.includes(insSup) && !insSup.includes(recSup)) {
            itemConflicts.push({
              field: 'supplier',
              label: 'Supplier Identity',
              arrivalVal: record.supplier,
              qualityVal: match.supplier_name
            });
          }

          const recMoisture = Number(record.actual_moisture) || 0;
          const insMoisture = Number(match.actual_moisture) || 0;
          if (recMoisture > 0 && insMoisture > 0 && Math.abs(recMoisture - insMoisture) > 0.1) {
            itemConflicts.push({
              field: 'actual_moisture',
              label: 'Actual Moisture %',
              arrivalVal: recMoisture + '%',
              qualityVal: insMoisture + '%'
            });
          }

          const recDust = Number(record.actual_dust) || 0;
          const insDust = Number(match.actual_dust) || 0;
          if (recDust > 0 && insDust > 0 && Math.abs(recDust - insDust) > 0.1) {
            itemConflicts.push({
              field: 'actual_dust',
              label: 'Actual Dust %',
              arrivalVal: recDust + '%',
              qualityVal: insDust + '%'
            });
          }

          const recNcv = Number(record.actual_ncv) || 0;
          const insNcv = Number(match.actual_ncv) || 0;
          if (recNcv > 0 && insNcv > 0 && Math.abs(recNcv - insNcv) > 0.1) {
            itemConflicts.push({
              field: 'actual_ncv',
              label: 'Net Calorific Value',
              arrivalVal: recNcv,
              qualityVal: insNcv
            });
          }

          if (itemConflicts.length > 0) {
            conflictsList.push({
              arrivalId: record.final_arrival_id,
              arrivalNo: record.final_arrival_no || 'N/A',
              lorryNo: (record?.lorry_number || (record as any)?.lorry_no || (record as any)?.vehicle_no) || 'N/A',
              supplier: record.supplier || 'N/A',
              mrNo: match.mr_no || 'N/A',
              conflicts: itemConflicts
            });
          }
        }
      });

      setDetectedConflicts(conflictsList);
      if (conflictsList.length > 0 && !silent) {
        setShowConflictsAlert(true);
      } else {
        setShowConflictsAlert(false);
      }

      const pendingRecords = arrivals.filter(r => {
        const isPending = !r.mr_no || r.mr_no.trim() === '' || r.mr_no.trim().toUpperCase() === 'DIRECT REGISTER';
        return isPending;
      });

      if (pendingRecords.length === 0) {
        if (!silent) {
          if (conflictsList.length > 0) {
            setSyncStatusMessage(`Manual Audit Scan: All arrival registers processed, but ${conflictsList.length} data conflict warnings were detected! See alert panel below.`);
          } else {
            setSyncStatusMessage("All system arrivals are fully synchronized. No pending records or conflicts found.");
          }
          setTimeout(() => setSyncStatusMessage(""), 6000);
        }
        return;
      }

      if (!silent) setBackgroundSyncing(true);

      let updatedCount = 0;
      const updatesPromise = pendingRecords.map(async (record) => {
        const match = inspections.find(ins => {
          const insArrivalNo = String(ins.arrival_no || '').trim().toUpperCase();
          const recTempArrivalNo = String(record?.temporary_arrival_no || '').trim().toUpperCase();
          const recFinalArrivalNo = String(record?.final_arrival_no || '').trim().toUpperCase();
          
          const amadMatch = insArrivalNo && (insArrivalNo === recTempArrivalNo || insArrivalNo === recFinalArrivalNo);
          
          const insSupplier = String(ins.supplier_name || '').trim().toUpperCase();
          const recSupplier = String(record?.supplier || '').trim().toUpperCase();
          
          const lorryMatch = (record?.lorry_number || (record as any)?.lorry_no || (record as any)?.vehicle_no) && ins?.arrival_date && 
            String(ins?.arrival_no || '').toUpperCase().includes(String((record?.lorry_number || (record as any)?.lorry_no || (record as any)?.vehicle_no)).trim().toUpperCase()) &&
            insSupplier === recSupplier;

          return amadMatch || lorryMatch;
        });

        if (match) {
          const { error: updateErr } = await supabase
            .from('final_arrival')
            .update({
              mr_no: match.mr_no,
              mr_date: match.mr_date || null,
              po_no: match.po_no || record.po_no,
              po_date: match.po_date || record.po_date,
              broker_name: match.broker_name || record.broker,
              supplier_name: match.supplier_name || record.supplier,
              actual_moisture: match.actual_moisture ? Number(match.actual_moisture) : record.actual_moisture,
              claim_moisture: match.claim_moisture ? Number(match.claim_moisture) : record.claim_moisture,
              actual_dust: match.actual_dust ? Number(match.actual_dust) : record.actual_dust,
              actual_ncv: match.actual_ncv ? Number(match.actual_ncv) : record.actual_ncv,
            })
            .eq('final_arrival_id', record.final_arrival_id);

          if (!updateErr) {
            updatedCount++;
            const currentUser = getCurrentUserContext().username || "prosunmajhi@gmail.com";
            try {
              await supabase.from("system_logs").insert({
                user_id: currentUser,
                action: 'AUTO_SYNC',
                details: `[AUTO-SYNC ENGINE] MATCH: ${record.final_arrival_no} | MR: ${match.mr_no}`
              }).then(() => {}, () => {});
            } catch (le) {
              console.warn("Log write error:", le);
            }
          }
        }
      });

      await Promise.all(updatesPromise);

      if (updatedCount > 0) {
        await fetchRecords();
        setSyncStatusMessage(`Auto-Sync Completed: ${updatedCount} pending arrival(s) have been successfully linked to finalized quality inspections.`);
        setTimeout(() => setSyncStatusMessage(""), 7000);
      } else if (!silent) {
        setSyncStatusMessage("Cross-reference completed. No new finalized matching quality inspections were found.");
        setTimeout(() => setSyncStatusMessage(""), 4000);
      }
    } catch (e: any) {
      console.error("Auto status sync error:", e);
      if (!silent) {
        setSyncStatusMessage(`Sync Failed: ${e.message}`);
        setTimeout(() => setSyncStatusMessage(""), 5000);
      }
    } finally {
      const nowStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' (' + new Date().toLocaleDateString('en-GB') + ')';
      setLastSyncTime(nowStr);
      if (!silent) setBackgroundSyncing(false);
    }
  };

  const runReconcileFix = async () => {
    try {
      setLoading(true);
      let resolvedCount = 0;
      
      const fixPromises = detectedConflicts.map(async (conf) => {
        const { data: insData, error: insErr } = await supabase
          .from('mill_inspection_master')
          .select('*')
          .eq('mr_no', conf.mrNo)
          .maybeSingle();
          
        if (insErr || !insData) return;
        
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
          .eq('final_arrival_id', conf.arrivalId);
          
        if (!updateErr) {
          resolvedCount++;
        }
      });
      
      await Promise.all(fixPromises);
      await fetchRecords();
      setDetectedConflicts([]);
      setShowConflictsAlert(false);
      alert(`Successfully reconciled and updated ${resolvedCount} arrival records to match Lab Quality certification master.`);
    } catch (e: any) {
      alert("Bulk Reconcile failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!autoSyncEnabled) return;
    const initialTimer = setTimeout(() => {
      runBackgroundStatusSync(true);
    }, 1500);
    return () => clearTimeout(initialTimer);
  }, [autoSyncEnabled]);

  const handleExportCSV = () => {
    if (records.length === 0) {
      alert("No data available to export.");
      return;
    }

    const dataToExport = records.map(r => ({
      "Final Arrival Number": r.final_arrival_no,
      "Inspection MR Number": r.mr_no || '',
      "Arrival Date": r.date ? new Date(r.date).toLocaleDateString('en-GB') : '',
      "Purchase Order No": r.po_no || '',
      "Ledger Supplier": r.supplier || '',
      "Broker Name": r.broker || '',
      "Lorry Number": r.lorry_number || (r as any).lorry_no || (r as any).vehicle_no || '',
      "Consignment Note": r.consignment_note || r.consignment_note_no || (r as any).consignment_notice_no || '',
      "Challan / Railway Receipt No.": r.challan_railway_receipt_no || r.challan_rr_no || '',
      "Challan RR Date": r.challan_rr_date ? new Date(r.challan_rr_date).toLocaleDateString('en-GB') : '',
      "Total Packets (Bags)": getRcptQty(r),
      "Weight (QTL)": r.weight_qtl ?? 0,
      "Weight (MT)": r.weight_qtl ? (r.weight_qtl / 10).toFixed(3) : '0.000',
      "Transit Area": r.arrival_area_name || '',
      "Weigh Bridge Electronic Net": r.electronic_net_weight ?? 0,
      "Supplier Reported Net": r.supplier_net_weight ?? 0,
      "System Registry Notes": r.remarks || ''
    }));

    try {
      const sanitizedData = sanitizeCsvData(dataToExport);
      const csv = Papa.unparse(sanitizedData);
      const csvContent = "\uFEFF" + csv;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Final_Arrivals_Enterprise_Report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch(e: any) {
      alert("Error generating CSV Export: " + e.message);
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!enforceEditOrDeletePermission("Delete")) {
      return;
    }

    if (confirm(`Are you sure you want to completely delete Final Arrival Voucher #${code}? This will remove it from the database.`)) {
      try {
        if (code && supabase) {
          await Promise.all([
            supabase.from('material_inspection_details').delete().or(`mr_no.eq.${code},arrival_no.eq.${code}`).then(() => {}, () => {}),
            supabase.from('material_inspection_deductions').delete().or(`mr_no.eq.${code}`).then(() => {}, () => {}),
            supabase.from('mill_inspection_deduction').delete().or(`mr_no.eq.${code}`).then(() => {}, () => {}),
          ]);
          await supabase.from('material_inspection').delete().or(`mr_no.eq.${code},arrival_no.eq.${code},final_arrival_no.eq.${code}`).then(() => {}, () => {});
        }
        await dbModule.delete('final_arrival', 'final_arrival_id', id);
        alert(`Final Arrival Voucher #${code} deleted permanently.`);
        fetchRecords();
        if (selectedRecord && selectedRecord.final_arrival_id === id) setSelectedRecord(null);
      } catch (e: any) {
        alert("Failed to delete voucher: " + e.message);
      }
    }
  };

  const handlePreparePrint = async (record: FinalArrivalRecord) => {
    setLoading(true);
    try {
      let inspectionMaster: any = null;
      let inspectionDetails: any[] = [];
      let mrSettlementMaster: any = null;
      let mrSettlementDetails: any[] = [];

      if (supabase && record.mr_no) {
        const { data: mMaster, error: mMasterErr } = await supabase
          .from('mill_inspection_master')
          .select('*')
          .eq('mr_no', record.mr_no)
          .maybeSingle();

        if (!mMasterErr && mMaster) {
          inspectionMaster = mMaster;
          const { data: mDetails } = await supabase
            .from('mill_inspection_detail')
            .select('*')
            .eq('mr_no', mMaster.mr_no)
            .order('srl_no', { ascending: true });
          if (mDetails) inspectionDetails = mDetails;

          const { data: sMaster } = await supabase
            .from('mr_settlement_master')
            .select('*')
            .eq('mr_no', mMaster.mr_no)
            .maybeSingle();
          if (sMaster) {
            mrSettlementMaster = sMaster;
            const { data: sDetails } = await supabase
              .from('mr_settlement_detail')
              .select('*')
              .eq('mr_no', mMaster.mr_no)
              .order('srl_no', { ascending: true });
            if (sDetails) mrSettlementDetails = sDetails;
          }
        }
      }

      let parsedGrid: any[] = [];
      if (record.grid_details) {
        if (typeof record.grid_details === 'string') {
          try {
            const parsed = record.grid_details === 'undefined' || record.grid_details === 'null' ? [] : JSON.parse(record.grid_details === "undefined" ? "null" : record.grid_details);
            if (Array.isArray(parsed)) {
              parsedGrid = parsed;
            }
          } catch(e) {}
        } else if (Array.isArray(record.grid_details)) {
          parsedGrid = record.grid_details;
        }
      }

      const parsedAgencyNames = parsedGrid
        .map((row: any) => (row.agency_name || '').trim())
        .filter(Boolean);
      const uniqueAgencies = Array.from(new Set(parsedAgencyNames));
      let finalArrivalAreaName = record.arrival_area_name || '';
      const agencyNameStr = uniqueAgencies.join(", ");
      if (agencyNameStr && !finalArrivalAreaName.includes(agencyNameStr)) {
        finalArrivalAreaName = `${finalArrivalAreaName} / ${agencyNameStr}`;
      }

      const mappedRows: any[] = (inspectionDetails.length > 0) ? inspectionDetails.map((det) => {
        const settRow = mrSettlementDetails.find(s => s.srl_no === det.srl_no);
        const gross = Number(det.challan_gross_wt) || 0;
        const moisture = Number(inspectionMaster?.actual_moisture) || 0;
        const dust = Number(inspectionMaster?.actual_dust) || 0;
        const ncv = Number(inspectionMaster?.actual_ncv) || 0;
        const netStr = calculateNetWeightVal(
          gross,
          moisture,
          dust,
          ncv,
          finalArrivalAreaName,
          record.po_date || '',
          record.date || ''
        );

        return {
          crop_year: det.crop_year || '2026-27',
          marka: det.marka || '',
          quality: det.stock_grade_name || '',
          quantity_rcpt: Number(det.quantity) || 0,
          unit: det.unit || 'BALES',
          gross_wt: gross || '',
          moisture_pct: moisture || '',
          dust_pct: dust || '',
          ncv_pct: ncv || '',
          net_wt: netStr || '',
          settlement_grade: settRow?.sett_grade || det.stock_grade_name || '',
          settlement_moisture: settRow?.sett_moisture_deduction || '',
          settlement_dust: settRow?.sett_dust_deduction || '',
          settlement_prem_less: settRow?.sett_all_diff || '',
          rate: mrSettlementMaster?.summary_rate_qtel || ''
        };
      }) : parsedGrid.filter(row => row.receipt_grade_name || row.challan_marka_name).map((p) => {
        return {
          crop_year: p.crop_year || '2026-27',
          marka: p.challan_marka_name || '',
          quality: p.receipt_grade_name || '',
          quantity_rcpt: p.quantity_rcpt || p.quantity_chln || p.quantity || 0,
          unit: p.unit || 'BALES',
          gross_wt: p.netto_pnto || p.weight || '',
          moisture_pct: '',
          dust_pct: '',
          ncv_pct: '',
          net_wt: p.netto_pnto || p.weight || '',
          settlement_grade: p.receipt_grade_name || '',
          settlement_moisture: '',
          settlement_dust: '',
          settlement_prem_less: '',
          rate: ''
        };
      });

      while (mappedRows.length < 8) {
        mappedRows.push({
          crop_year: '', marka: '', quality: '', quantity_rcpt: '', unit: '',
          gross_wt: '', moisture_pct: '', dust_pct: '', ncv_pct: '', net_wt: '',
          settlement_grade: '', settlement_moisture: '', settlement_dust: '', settlement_prem_less: '', rate: ''
        });
      }

      setPrintData({
        amad_no: record.final_arrival_no,
        date: record.date,
        po_no: record.po_no || '',
        po_date: record.po_date || record.date,
        mr_no: record.mr_no || '',
        mr_date: inspectionMaster?.mr_date || record.date,
        transporter_name: record.transporter_name || '',
        challan_rr_no: record.challan_rr_no || '',
        lorry_number: (record.lorry_number || (record as any).lorry_no || (record as any).vehicle_no) || '',
        arrival_area_name: finalArrivalAreaName,
        supplier: record.supplier || '',
        remarks: record.remarks || inspectionMaster?.remarks || '',
        rows: mappedRows
      });

      setIsPrintingModalOpen(true);
    } catch(e) {
      console.error("Error setting up print view:", e);
      alert("Failed to load full final arrival details, loading basic data.");
    } finally {
      setLoading(false);
    }
  };

  const updatePrintRow = (idx: number, field: string, val: any) => {
    if (!printData) return;
    const updatedRows = [...printData.rows];
    updatedRows[idx][field] = val;

    if (field === 'gross_wt' || field === 'moisture_pct' || field === 'dust_pct' || field === 'ncv_pct') {
      const gross = Number(updatedRows[idx].gross_wt) || 0;
      const m = Number(updatedRows[idx].moisture_pct) || 0;
      const d = Number(updatedRows[idx].dust_pct) || 0;
      const n = Number(updatedRows[idx].ncv_pct) || 0;
      updatedRows[idx].net_wt = calculateNetWeightVal(
        gross,
        m,
        d,
        n,
        printData.arrival_area_name || '',
        printData.po_date || '',
        printData.date || ''
      );
    }

    setPrintData({ ...printData, rows: updatedRows });
  };

  const filteredRecords = records.filter(r => {
    const q = searchQuery.toLowerCase().trim();
    const isVoid = r.status === 'cancelled';
    const matchSearch = !q || (
      (r.final_arrival_no || '').toLowerCase().includes(q) ||
      /* (r.mr_no || '').toLowerCase().includes(q) || */
      (r.po_no || '').toLowerCase().includes(q) ||
      (r.supplier || '').toLowerCase().includes(q) ||
      (r.broker || '').toLowerCase().includes(q) ||
      (r.lorry_number || (r as any).lorry_no || (r as any).vehicle_no || '').toLowerCase().includes(q) ||
      (isVoid && q === 'void')
    );

    let matchDateRange = true;
    if (startDateFilter && r.date) {
      matchDateRange = matchDateRange && (r.date >= startDateFilter);
    }
    if (endDateFilter && r.date) {
      matchDateRange = matchDateRange && (r.date <= endDateFilter);
    }

    if (selectedMonthFilter) {
      const rowDate = r.date || (r as any).arrival_date || (r as any).created_at;
      const parsed = parseMonthKey(rowDate);
      if (!parsed || parsed.key !== selectedMonthFilter) return false;
    }

    if (!canViewCompletedData()) {
      const isCompleted = Boolean(r.mr_no && r.mr_no.trim() !== '' && r.mr_no.trim().toUpperCase() !== 'DIRECT REGISTER');
      if (isCompleted) return false;
    }

    return matchSearch && matchDateRange;
  }).sort((a, b) => {
    const dateDiff = new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
    if (dateDiff !== 0) return dateDiff;

    const suppA = (a.supplier || '').toUpperCase();
    const suppB = (b.supplier || '').toUpperCase();
    const suppDiff = suppA.localeCompare(suppB);
    if (suppDiff !== 0) return suppDiff;

    const unitA = (a.unit_name || (a as any).unit || a.unit_code || '').toUpperCase();
    const unitB = (b.unit_name || (b as any).unit || b.unit_code || '').toUpperCase();
    const unitDiff = unitA.localeCompare(unitB);
    if (unitDiff !== 0) return unitDiff;

    const isCompletedA = (a.mr_no && a.mr_no.trim() !== '' && a.mr_no.trim().toUpperCase() !== 'DIRECT REGISTER') ? 'COMPLETED' : 'PENDING';
    const isCompletedB = (b.mr_no && b.mr_no.trim() !== '' && b.mr_no.trim().toUpperCase() !== 'DIRECT REGISTER') ? 'COMPLETED' : 'PENDING';
    return isCompletedA.localeCompare(isCompletedB);
  });

  const totalBales = filteredRecords.reduce((acc, r) => acc + getRcptQty(r), 0);
  const totalWeightMt = filteredRecords.reduce((acc, r) => acc + getLowestNetWeight(r), 0);

  return {
    loading,
    records,
    filteredRecords,
    searchQuery,
    setSearchQuery,
    startDateFilter,
    setStartDateFilter,
    endDateFilter,
    setEndDateFilter,
    selectedMonthFilter,
    setSelectedMonthFilter,
    selectedRecordId,
    setSelectedRecordId,
    selectedRecord,
    setSelectedRecord,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    stats,
    totalBales,
    totalWeightMt,
    unitList,
    auditPopoverId,
    setAuditPopoverId,
    fetchRecords,
    handleExportCSV,
    handleDelete,
    handlePreparePrint,
    printData,
    setPrintData,
    isPrintingModalOpen,
    setIsPrintingModalOpen,
    printColumns,
    setPrintColumns,
    updatePrintRow,
    backgroundSyncing,
    syncStatusMessage,
    autoSyncEnabled,
    setAutoSyncEnabled,
    lastSyncTime,
    detectedConflicts,
    showConflictsAlert,
    setShowConflictsAlert,
    runBackgroundStatusSync,
    runReconcileFix
  };
}
