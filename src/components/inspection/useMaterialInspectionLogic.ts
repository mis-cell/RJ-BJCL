import React, { useState, useEffect, useRef } from "react";
import Papa from "papaparse";
import { supabase } from "../../lib/supabase";
import { useLiveAutoRefresh } from "../../hooks/useLiveAutoRefresh";
import { dbModule } from "../../services/dbModule";
import { enforceEditOrDeletePermission, canViewCompletedData, getCurrentUserContext } from "../../lib/permissions";
import { comparePoInspection } from "../../lib/poMatch";
import { sanitizeCsvData, calculate93PctPaidAmount } from "../../lib/utils";
import {
  InspectionMaster,
  InspectionDetailRow,
  parseDateOnly,
  safeRenderText
} from "../../types/inspection.types";
import {
  initialMasterState,
  createEmptyRow,
  initialQualityMatrix,
  calculateClaimMoisture
} from "../../services/inspectionService";
import { saveMaterialInspection } from "./materialInspectionSaveService";
import {
  checkAndProcessReturnLorryOnInspection,
  calculateInspectionWeightMt,
  fetchAllReturnLorries,
} from "../../services/returnLorryService";

export function useMaterialInspectionLogic(onLogEvent?: (event: string, details: string) => void) {
  // Autocomplete lists from database
  const [brokers, setBrokers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [agencies, setAgencies] = useState<any[]>([]);
  const [markas, setMarkas] = useState<any[]>([]);
  const [arrivalVouchers, setArrivalVouchers] = useState<any[]>([]);
  const [deductionMasterList, setDeductionMasterList] = useState<any[]>([]);
  const [selectedPoData, setSelectedPoData] = useState<any>(null);
  const [selectedDeductionTypes, setSelectedDeductionTypes] = useState<string[]>([]);

  // Page States
  const [viewMode, setViewMode] = useState<"dashboard" | "entry">("dashboard");
  const [isEditMode, setIsEditMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [currentTab, setCurrentTab] = useState<"inspections" | "pending_mr">("inspections");

  const [selectedMrNos, setSelectedMrNos] = useState<string[]>([]);
  const [printedInspections, setPrintedInspections] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem("printed_inspections") === "undefined" ? "{}" : (localStorage.getItem("printed_inspections") || "{}"));
    } catch {
      return {};
    }
  });
  const [printingBatch, setPrintingBatch] = useState<{ master: InspectionMaster; details: any[] }[] | null>(null);

  const [printingInspection, setPrintingInspection] = useState<InspectionMaster | null>(null);
  const [printingInspectionDetails, setPrintingInspectionDetails] = useState<InspectionDetailRow[]>([]);

  // Masters Search List Modal
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [savedInspections, setSavedInspections] = useState<any[]>([]);
  const [searchFilter, setSearchFilter] = useState("");
  const [finalArrivals, setFinalArrivals] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);

  // Date Filters
  const [arrivalStartDate, setArrivalStartDate] = useState("");
  const [arrivalEndDate, setArrivalEndDate] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [pendingCurrentPage, setPendingCurrentPage] = useState(1);
  const [pendingPageSize, setPendingPageSize] = useState(100);

  useEffect(() => {
    setCurrentPage(1);
    setPendingCurrentPage(1);
  }, [searchFilter, arrivalStartDate, arrivalEndDate]);

  const [expandedMrNo, setExpandedMrNo] = useState<string | null>(null);
  const [expandedDetails, setExpandedDetails] = useState<Record<string, InspectionDetailRow[]>>({});
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    select: true,
    mr_no: true,
    mr_date: true,
    supplier: true,
    broker: true,
    po_ref: true,
    moisture: true,
    weft_dust: true,
    ncv: true,
    detn_days: true,
    arrival_no: true,
    unloading: true,
    print_status: true,
    lorry_number: true,
    gate_entry_time: true,
    actions: true,
  });

  const [showWeightsBreakdown, setShowWeightsBreakdown] = useState<boolean>(true);
  const [unitList, setUnitList] = useState<string[]>(["BALES", "DRUMS", "LOOSE", "P.BALES", "H.BALES", "BAGS", "KGS", "M.T."]);
  const [moistureLogicRules, setMoistureLogicRules] = useState<any[]>([]);

  // User role & Admin detection
  const userCtx = getCurrentUserContext();
  const currentUser = userCtx.username || "prosunmajhi@gmail.com";

  // Auto-calculated past values and manual override tracking
  const [autoValues, setAutoValues] = useState({
    claim_moisture: 0,
    claim_dust: 0,
    claim_ncv: 0,
  });

  const [overriddenFields, setOverriddenFields] = useState({
    claim_moisture: false,
    claim_dust: false,
    claim_ncv: false,
  });

  const [masterData, setMasterData] = useState<InspectionMaster>(initialMasterState());
  const [detailsList, setDetailsList] = useState<InspectionDetailRow[]>(
    [1, 2, 3, 4, 5].map(createEmptyRow),
  );

  const [qualityMatrix, setQualityMatrix] = useState<any>(initialQualityMatrix());
  const [showAllFourSpecs, setShowAllFourSpecs] = useState(true);

  const hasDataInRow = (i: number) => {
    const row = detailsList[i];
    if (!row) return false;
    return Boolean(
      (row.arrival_grade && row.arrival_grade.trim()) ||
      (row.quantity && String(row.quantity).trim() !== '' && Number(row.quantity) > 0) ||
      (row.challan_gross_wt && String(row.challan_gross_wt).trim() !== '' && Number(row.challan_gross_wt) > 0) ||
      (row.agency && row.agency.trim()) ||
      (row.area && row.area.trim()) ||
      (row.marka && row.marka.trim())
    );
  };

  const show3rdAnd4th = showAllFourSpecs || hasDataInRow(2) || hasDataInRow(3);

  const updateMatrixVal = (rowKey: string, colKey: string, subKey: string, val: string) => {
    setQualityMatrix((prev: any) => ({
      ...prev,
      [rowKey]: {
        ...prev[rowKey],
        [colKey]: {
          ...(prev[rowKey]?.[colKey] || {}),
          [subKey]: val,
        },
      },
    }));
  };

  const markAsPrinted = (mrNos: string[]) => {
    setPrintedInspections((prev) => {
      const updated = { ...prev };
      mrNos.forEach((no) => {
        updated[no] = true;
      });
      try {
        localStorage.setItem("printed_inspections", JSON.stringify(updated));
      } catch (err) {
        console.error("Failed to save printed inspections:", err);
      }
      return updated;
    });
  };

  const logPrintEvent = async (mrNos: string[]) => {
    const cUser = getCurrentUserContext().username || "prosunmajhi@gmail.com";
    const timestamp = new Date().toISOString();
    const logEntry = {
      id: Math.random().toString(36).substring(2, 9),
      user_id: cUser,
      timestamp,
      row_ids: mrNos,
      details: `Printed inspection reports for M.R. No(s): ${mrNos.join(", ")}`,
    };

    try {
      const existingLogs = JSON.parse(localStorage.getItem("mill_inspection_print_logs") === "undefined" ? "[]" : (localStorage.getItem("mill_inspection_print_logs") || "[]"));
      localStorage.setItem("mill_inspection_print_logs", JSON.stringify([logEntry, ...existingLogs]));
    } catch (err) {
      console.error("Local print event log error:", err);
    }

    try {
      if (supabase) {
        await supabase.from("mill_inspection_print_logs").insert({
          user_id: cUser,
          row_ids: mrNos,
          timestamp,
          details: logEntry.details,
        });
      }
    } catch (err) {
      console.warn("Bypassed remote db print event insert:", err);
    }

    if (onLogEvent) {
      onLogEvent("PRINT_INSPECTION", `User ${cUser} triggered printing of inspection report(s) for MR No(s): ${mrNos.join(", ")}`);
    }
  };

  const handleBatchPrint = async () => {
    if (selectedMrNos.length === 0) {
      alert("Please select at least one inspection record to print.");
      return;
    }
    setLoading(true);
    try {
      const batchItems: { master: InspectionMaster; details: any[] }[] = [];
      for (const mrNo of selectedMrNos) {
        const master = savedInspections.find((item) => item.mr_no === mrNo);
        if (!master) continue;

        const poNo = master.po_no || master.mill_po_no;
        if (poNo && supabase) {
          try {
            const poClean = String(poNo).trim();
            const { data: scp } = await supabase
              .from('sauda_check_point')
              .select('*')
              .eq('po_no', poClean)
              .maybeSingle();

            if (scp) {
              const isClosed = scp.status === 'closed' || scp.is_closed === true || scp.status === 'final' || scp.status === 'moved_to_final' || scp.status === 'settled';
              
              const { data: matMismatches } = await supabase
                .from('material_mismatch')
                .select('*')
                .eq('po_no', poClean);
              const { data: satMismatches } = await supabase
                .from('satta_mismatch')
                .select('*')
                .eq('po_no', poClean);

              const hasActiveMatMismatch = (matMismatches || []).some(m => {
                const st = String(m.status || m.resolution_status || '').toLowerCase();
                return st !== 'resolved' && st !== 'cleared' && st !== 'approved';
              });
              const hasActiveSatMismatch = (satMismatches || []).some(m => {
                const st = String(m.status || m.resolution_status || '').toLowerCase();
                return st !== 'resolved' && st !== 'cleared' && st !== 'approved';
              });

              const isCleared = scp.mismatch_cleared === true || scp.mismatch_cleared === 'true' || scp.satta_dispute_approved === true || scp.satta_dispute_approved === 'true';
              const isMismatch = !isCleared && (hasActiveMatMismatch || hasActiveSatMismatch || scp.pass_status === 'mismatch');

              if (!isClosed || isMismatch) {
                alert(`M.R. No. ${mrNo} (P.O. ${poClean}) skipped: Sauda Check Point is not CLOSED or has an unresolved mismatch.`);
                continue;
              }
            }
          } catch (err) {
            console.warn("Error validating print permissions in batch:", err);
          }
        }

        let details: any[] = [];
        if (supabase) {
          const { data, error } = await supabase
            .from("mill_inspection_detail")
            .select("*")
            .eq("mr_no", mrNo)
            .order("srl_no", { ascending: true });
          if (!error && data) {
            details = data.map((row: any) => {
              if ((row.quantity === 0 || row.quantity === "" || row.quantity == null) && Number(row.challan_gross_wt) > 0) {
                return {
                  ...row,
                  quantity: Math.round(Number(row.challan_gross_wt))
                };
              }
              return row;
            });
          }
        }
        batchItems.push({ master, details });
      }

      if (batchItems.length === 0) {
        alert("Could not load details for selected inspections.");
        return;
      }

      await logPrintEvent(selectedMrNos);
      markAsPrinted(selectedMrNos);
      setPrintingBatch(batchItems);
    } catch (err: any) {
      console.error("Batch print preparation issues:", err);
      alert("Failed to compile batch report details: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePreparePrintInspection = async (
    insp: InspectionMaster,
    e?: React.MouseEvent,
  ) => {
    if (e) {
      e.stopPropagation();
    }

    const poNo = insp.po_no || insp.mill_po_no;
    if (poNo && supabase) {
      try {
        const poClean = String(poNo).trim();
        const { data: scp } = await supabase
          .from('sauda_check_point')
          .select('*')
          .eq('po_no', poClean)
          .maybeSingle();

        if (scp) {
          const isClosed = scp.status === 'closed' || scp.is_closed === true || scp.status === 'final' || scp.status === 'moved_to_final' || scp.status === 'settled';
          
          const { data: matMismatches } = await supabase
            .from('material_mismatch')
            .select('*')
            .eq('po_no', poClean);
          const { data: satMismatches } = await supabase
            .from('satta_mismatch')
            .select('*')
            .eq('po_no', poClean);

          const hasActiveMatMismatch = (matMismatches || []).some(m => {
            const st = String(m.status || m.resolution_status || '').toLowerCase();
            return st !== 'resolved' && st !== 'cleared' && st !== 'approved';
          });
          const hasActiveSatMismatch = (satMismatches || []).some(m => {
            const st = String(m.status || m.resolution_status || '').toLowerCase();
            return st !== 'resolved' && st !== 'cleared' && st !== 'approved';
          });

          const isCleared = scp.mismatch_cleared === true || scp.mismatch_cleared === 'true' || scp.satta_dispute_approved === true || scp.satta_dispute_approved === 'true';
          const isMismatch = !isCleared && (hasActiveMatMismatch || hasActiveSatMismatch || scp.pass_status === 'mismatch');

          if (!isClosed || isMismatch) {
            alert(`Mill Inspection Print Not Allowed!\n\nThis Purchase Order (${poClean}) does not satisfy the required conditions:\n- Sauda Check Point Status must be CLOSED (Current: ${isClosed ? 'CLOSED' : 'OPEN'})\n- Pass/Mismatch must be PASS (Current: ${isMismatch ? 'MISMATCH' : 'PASS'})\n\nPlease ensure Sauda Check Point is Closed and there are no unresolved mismatches before printing.`);
            return;
          }
        }
      } catch (err) {
        console.warn("Error validating print permissions:", err);
      }
    }

    setLoading(true);
    try {
      let details: any[] = [];
      if (viewMode === "entry" && detailsList && detailsList.length > 0) {
        details = detailsList.filter(
          (row) =>
            row.arrival_grade ||
            row.stock_grade_code ||
            row.area ||
            row.agency ||
            row.marka ||
            row.lot ||
            row.quantity ||
            row.challan_gross_wt
        );
      } else if (supabase) {
        const { data, error } = await supabase
          .from("mill_inspection_detail")
          .select("*")
          .eq("mr_no", insp.mr_no)
          .order("srl_no", { ascending: true });
        if (!error && data) {
          details = data.map((row: any) => {
            if ((row.quantity === 0 || row.quantity === "" || row.quantity == null) && Number(row.challan_gross_wt) > 0) {
              return {
                ...row,
                quantity: Math.round(Number(row.challan_gross_wt))
              };
            }
            return row;
          });
        }
      }

      setPrintingInspection(insp);
      setPrintingInspectionDetails(details);
      await logPrintEvent([insp.mr_no]);
      markAsPrinted([insp.mr_no]);
    } catch (err: any) {
      console.error("Failed to prepare printing details:", err);
      alert("Error loading print data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportToExcel = () => {
    try {
      if (filteredSavedInspections.length === 0) {
        alert("No filtered inspection records found to export.");
        return;
      }

      const dataToExport = filteredSavedInspections.map((row: any) => ({
        "M.R. No.": row.mr_no,
        "M.R. Date": row.mr_date || "",
        "Supplier/Merchant": row.supplier_name || "-",
        "Broker Name": row.broker_name || "-",
        "P.O. Reference": row.po_no ? `#${row.po_no}` : "-",
        "Moisture %": row.actual_moisture || "-",
        "Weft Dust %": row.actual_dust || "-",
        "NCV %": row.actual_ncv || "-",
        "Detn. Days": row.detention_days ?? 0,
        "Arrival No": row.arrival_no || "-",
        "Unloading Date": row.unloading_date || "-",
        "Print Status": printedInspections[row.mr_no] ? "Printed" : "Pending"
      }));

      const sanitizedData = sanitizeCsvData(dataToExport);
      const csv = Papa.unparse(sanitizedData);
      const csvContent = "\uFEFF" + csv;
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Mill_Inspections_Filtered_Export_${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error("Export to Excel failed:", err);
      alert("Failed to export: " + err.message);
    }
  };

  // Fetch Master Data references on load to feed datalists (autocompletion)
  const loadAllMasters = async () => {
    try {
      if (supabase) {
        const withTimeout = (promise: Promise<any>, ms: number = 3000) => {
          return Promise.race([
            promise,
            new Promise(resolve => setTimeout(() => resolve({ data: null, error: 'timeout' }), ms))
          ]);
        };

        const [
          { data: b },
          { data: s },
          { data: g },
          { data: ar },
          { data: ag },
          { data: m },
          { data: av },
          { data: uData },
          { data: mL },
          dData,
        ] = await Promise.all([
          withTimeout(Promise.resolve(supabase.from("broker_master").select("brok_name").order("brok_name").limit(150))),
          withTimeout(Promise.resolve(supabase.from("supply_master").select("supp_name").order("supp_name").limit(150))),
          withTimeout(Promise.resolve(supabase.from("grade_master").select("grade_code, grade_name").order("grade_code").limit(150))),
          withTimeout(Promise.resolve(supabase.from("area_master").select("area_name").order("area_name").limit(150))),
          withTimeout(Promise.resolve(supabase.from("agency_master").select("agency_name").order("agency_name").limit(150))),
          withTimeout(Promise.resolve(supabase.from("marka_master").select("marka_name").order("marka_name").limit(150))),
          withTimeout(Promise.resolve(supabase.from("material_inspection").select("*").order("created_at", { ascending: false }).limit(1000))),
          withTimeout(Promise.resolve(supabase.from("unit_master").select("unit_name").order("unit_name").limit(150))),
          withTimeout(Promise.resolve(supabase.from("moisture_logic").select("*"))),
          withTimeout(Promise.resolve(supabase.from("deduction_master").select("*"))).then((r: any) => r?.data || [], () => []),
        ]);

        if (b) setBrokers(b.map((x: any) => ({ name: x.brok_name })));
        if (s) setSuppliers(s.map((x: any) => ({ name: x.supp_name })));
        if (g) setGrades(g.map((x: any) => ({ code: x.grade_code, name: x.grade_name })));
        if (ar) setAreas(ar.map((x: any) => ({ name: x.area_name })));
        if (ag) setAgencies(ag.map((x: any) => ({ name: x.agency_name })));
        if (m) setMarkas(m.map((x: any) => ({ name: x.marka_name })));
        if (av) {
          const mapped = av.map((v: any) => ({
            ...v,
            temporary_arrival_no: v.arrival_no || v.temporary_arrival_no || v.ref_arrival_no || v.mr_no,
            supplier: v.supplier_name || v.supplier,
            broker: v.broker_name || v.broker,
          }));
          setArrivalVouchers(mapped);
        }
        if (uData && uData.length > 0) {
          const fetchedUnits = uData.map((x: any) => x.unit_name).filter(Boolean);
          setUnitList(prev => Array.from(new Set([...fetchedUnits, ...prev])));
        }
        if (mL && mL.length > 0) {
          setMoistureLogicRules(mL);
        }

        if (dData && Array.isArray(dData)) {
          setDeductionMasterList(dData);
        } else {
          setDeductionMasterList([]);
        }
      } else {
        const [b, s, g, ar, ag, m, av, dedList] = await Promise.all([
          dbModule.fetchAll('broker_master').catch(() => []),
          dbModule.fetchAll('supply_master').catch(() => []),
          dbModule.fetchAll('grade_master').catch(() => []),
          dbModule.fetchAll('area_master').catch(() => []),
          dbModule.fetchAll('agency_master').catch(() => []),
          dbModule.fetchAll('marka_master').catch(() => []),
          dbModule.fetchAll('mill_inspection_master', 'created_at', false).catch(() => []),
          dbModule.fetchAll('deduction_master').catch(() => []),
        ]);
        if (b) setBrokers(b.map((x: any) => ({ name: x.brok_name })));
        if (s) setSuppliers(s.map((x: any) => ({ name: x.supp_name })));
        if (g) setGrades(g.map((x: any) => ({ code: x.grade_code, name: x.grade_name })));
        if (ar) setAreas(ar.map((x: any) => ({ name: x.area_name })));
        if (ag) setAgencies(ag.map((x: any) => ({ name: x.agency_name })));
        if (m) setMarkas(m.map((x: any) => ({ name: x.marka_name })));
        if (dedList && Array.isArray(dedList)) setDeductionMasterList(dedList);
        if (av) {
          const mapped = av.map((v: any) => ({
            ...v,
            temporary_arrival_no: v.arrival_no || v.temporary_arrival_no || v.ref_arrival_no || v.mr_no,
            supplier: v.supplier_name || v.supplier,
            broker: v.broker_name || v.broker,
          }));
          setArrivalVouchers(mapped);
        }
      }
    } catch (err) {
      console.warn("Failed to load autocomplete lists:", err);
    }
  };

  const handleRefreshDatabase = async () => {
    setLoading(true);
    await loadAllMasters();
    await loadSavedInspectionsList();
    setLoading(false);
  };

  // Sync / Load inspection records for Modal View search and selection
  const loadSavedInspectionsList = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const matInspRes = await supabase.from("material_inspection").select("*").order("created_at", { ascending: false }).then(r => r, () => ({ data: [] }));

      const combined = [
        ...((matInspRes as any)?.data || []),
      ];

      const uniqueMap = new Map();
      combined.forEach((item: any) => {
        const key = item.mr_no || item.id;
        if (key && !uniqueMap.has(key)) {
          uniqueMap.set(key, item);
        }
      });

      try {
        const cached = localStorage.getItem("inspection_master_records");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            parsed.forEach((item: any) => {
              const key = item.mr_no || item.id;
              if (key && !uniqueMap.has(key)) {
                uniqueMap.set(key, item);
              }
            });
          }
        }
      } catch (e) {}

      const { data: arrivalsData, error: arrivalsErr } = await supabase
        .from("final_arrival")
        .select("*")
        .order("date", { ascending: false });
      if (!arrivalsErr && arrivalsData) {
        setFinalArrivals(arrivalsData);
      }

      const norm = (v: any) => String(v || "").trim().toUpperCase();
      const isBlankPo = (v: any) => {
        const s = norm(v);
        return !s || s === "NO" || s === "N/A" || s === "NONE";
      };

      const poByKey = new Map<string, string>();
      (arrivalsData || []).forEach((fa: any) => {
        if (!isBlankPo(fa.po_no)) {
          [fa.final_arrival_no, fa.mr_no, fa.arrival_no, fa.temporary_arrival_no, fa.amad_no].forEach(k => {
            if (norm(k)) poByKey.set(norm(k), String(fa.po_no).trim());
          });
        }
      });

      const returnLorries = await fetchAllReturnLorries().catch(() => []);
      const rlByMr = new Map<string, any>();
      returnLorries.forEach(rl => {
        const k = norm(rl.mr_no || rl.final_arrival_no);
        if (k) rlByMr.set(k, rl);
      });

      const allInspections = Array.from(uniqueMap.values()).map((insp: any) => {
        let updated = { ...insp };
        if (isBlankPo(updated.po_no)) {
          const boundPo =
            poByKey.get(norm(updated.mr_no)) ||
            poByKey.get(norm(updated.arrival_no)) ||
            poByKey.get(norm(updated.temporary_arrival_no));
          if (boundPo) {
            updated.po_no = boundPo;
          }
        }
        let parsedGrid: any[] = [];
        if (updated.grid_details) {
          if (Array.isArray(updated.grid_details)) parsedGrid = updated.grid_details;
          else if (typeof updated.grid_details === "string") {
            try {
              const p = JSON.parse(updated.grid_details);
              if (Array.isArray(p)) parsedGrid = p;
            } catch (e) {}
          }
        }
        const matchedFa = (arrivalsData || []).find((f: any) => norm(f.final_arrival_no || f.mr_no) === norm(updated.mr_no));
        const wtMt = calculateInspectionWeightMt(updated, parsedGrid, matchedFa);
        updated.received_weight_mt = wtMt;
        const matchedRl = rlByMr.get(norm(updated.mr_no));
        if (matchedRl) {
          updated.is_return_lorry = true;
          updated.return_po_no = matchedRl.new_po_no || matchedRl.po_no;
          updated.reference_po_no = matchedRl.reference_po_no || updated.po_no;
          if (!updated.received_weight_mt && Number(matchedRl.received_weight_mt) > 0) {
            updated.received_weight_mt = Number(matchedRl.received_weight_mt);
          }
        } else if (wtMt > 0 && wtMt < 5 && updated.po_no) {
          updated.is_return_lorry = true;
          updated.reference_po_no = updated.reference_po_no || updated.po_no;
        }
        return updated;
      });
      setSavedInspections(allInspections);

      const { data: poData, error: poErr } = await supabase
        .from("purchase_master")
        .select("*")
        .order("po_date", { ascending: false });
      if (!poErr && poData) {
        setPurchaseOrders(poData.filter((po: any) => po.po_no && po.status !== 'cancelled'));
      }
    } catch (err: any) {
      setErrorMessage("Load failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useLiveAutoRefresh(() => {
    loadAllMasters();
    loadSavedInspectionsList();
  }, [], { tables: ['material_inspection', 'mill_inspection_master', 'material_inspections', 'purchase_master', 'final_arrival', 'temporary_material_received', 'clubbed_pomr'] });

  // Automatically retrieve full P.O. data from purchase_master whenever po_no changes
  useEffect(() => {
    if (!supabase || !masterData.po_no) {
      setSelectedPoData(null);
      return;
    }
    const fetchActualPoData = async () => {
      try {
        const { data, error } = await supabase
          .from("purchase_master")
          .select("*")
          .eq("po_no", masterData.po_no.trim())
          .maybeSingle();
        if (error) throw error;
        if (data) {
          setSelectedPoData(data);
          if (data.po_date) {
            setMasterData((prev) => {
              if (prev.po_date !== data.po_date) {
                return { ...prev, po_date: data.po_date };
              }
              return prev;
            });
          }
        }

        const { data: tempArrival } = await supabase
          .from("temporary_material_received")
          .select("temporary_arrival_no")
          .eq("po_no", masterData.po_no.trim())
          .limit(1)
          .maybeSingle();

        if (tempArrival && tempArrival.temporary_arrival_no) {
          setMasterData((prev) => {
            if (prev.arrival_no !== tempArrival.temporary_arrival_no) {
              return { ...prev, arrival_no: tempArrival.temporary_arrival_no };
            }
            return prev;
          });
        } else {
          const { data: finalArrival } = await supabase
            .from("final_arrival")
            .select("temporary_arrival_no")
            .eq("po_no", masterData.po_no.trim())
            .limit(1)
            .maybeSingle();

          if (finalArrival && finalArrival.temporary_arrival_no) {
            setMasterData((prev) => {
              if (prev.arrival_no !== finalArrival.temporary_arrival_no) {
                return { ...prev, arrival_no: finalArrival.temporary_arrival_no };
              }
              return prev;
            });
          }
        }
      } catch (err) {
        console.warn("Failed to fetch exact PO and Temporary Arrival No:", err);
      }
    };
    fetchActualPoData();
  }, [masterData.po_no]);

  const totalChallanGrossWt = React.useMemo(() => {
    return detailsList.reduce((acc, r) => acc + (Number(r.challan_gross_wt) || 0), 0);
  }, [detailsList]);

  const totalReceiptGrossWt = React.useMemo(() => {
    return detailsList.reduce((acc, r) => acc + (Number(r.receipt_gross_wt ?? r.challan_gross_wt) || 0), 0);
  }, [detailsList]);

  const [paymentOpsInfo, setPaymentOpsInfo] = useState<{
    paidAmount: number;
    totalBill: number;
    pct: number;
    source: 'payment_master' | 'calculated_93' | null;
    voucherNo?: string | null;
    advanceDone?: string;
    loading: boolean;
  }>({
    paidAmount: 0,
    totalBill: 0,
    pct: 93.0,
    source: null,
    loading: false,
  });

  const syncAdvanceFromPaymentOperations = async (forceUpdate: boolean = false, overrideArrival?: any) => {
    try {
      const arrNo = (overrideArrival?.temporary_arrival_no || overrideArrival?.arrival_no || masterData.arrival_no || '').trim();
      const poNo = (overrideArrival?.po_no || overrideArrival?.mill_po_no || masterData.po_no || '').trim();
      const mrNo = (overrideArrival?.mr_no || masterData.mr_no || '').trim();

      if (!arrNo && !poNo && !mrNo) return;

      setPaymentOpsInfo(prev => ({ ...prev, loading: true }));

      let foundPayment: any = null;
      if (supabase) {
        if (mrNo) {
          const { data } = await supabase.from('payment_master').select('*').eq('mr_no', mrNo).maybeSingle();
          if (data) foundPayment = data;
        }
        if (!foundPayment && arrNo) {
          const { data } = await supabase.from('payment_master').select('*').or(`arrival_no.eq.${arrNo},mr_no.eq.${arrNo}`).maybeSingle();
          if (data) foundPayment = data;
        }
        if (!foundPayment && poNo) {
          const { data } = await supabase.from('payment_master').select('*').eq('po_no', poNo).maybeSingle();
          if (data) foundPayment = data;
        }
      }

      if (!foundPayment) {
        const localPay: any[] = await dbModule.fetchAll('payment_master').catch(() => []);
        foundPayment = localPay.find(p => 
          (mrNo && (p.mr_no === mrNo || p.arrival_no === mrNo)) ||
          (arrNo && (p.arrival_no === arrNo || p.mr_no === arrNo)) ||
          (poNo && p.po_no === poNo)
        );
      }

      if (foundPayment && Number(foundPayment.paid_amount || 0) > 0) {
        const paidAmt = Number(foundPayment.paid_amount || 0);
        const payableAmt = Number(foundPayment.payable_amt || foundPayment.total_amount || 0);
        const pct = payableAmt > 0 ? Math.round((paidAmt / payableAmt) * 1000) / 10 : 93.0;

        setPaymentOpsInfo({
          paidAmount: paidAmt,
          totalBill: payableAmt,
          pct,
          source: 'payment_master',
          voucherNo: foundPayment.voucher_no || null,
          advanceDone: foundPayment.advance_payment_done || 'No',
          loading: false,
        });

        if (forceUpdate || !(masterData as any).advance_amount || Number((masterData as any).advance_amount) === 0) {
          setMasterData(prev => ({
            ...prev,
            advance_amount: paidAmt,
          }));
        }
        return;
      }

      let poRecord = selectedPoData;
      if (!poRecord && poNo && supabase) {
        const { data } = await supabase.from('purchase_master').select('*').eq('po_no', poNo).maybeSingle();
        if (data) poRecord = data;
      }

      let rate = Number(poRecord?.b_rate || poRecord?.rate_qntl || poRecord?.rate || 0);
      if (rate === 0 && poNo && supabase) {
        const { data: details } = await supabase.from('purchase_detail_master').select('*').eq('po_no', poNo).limit(1);
        if (details && details.length > 0) {
          rate = Number(details[0].rate || details[0].rate_qntl || details[0].b_rate || 0);
        }
      }

      const grossWtMt = (overrideArrival && Number(overrideArrival.challan_gross_wt || overrideArrival.total_actual_weight || 0) > 0)
        ? (Number(overrideArrival.challan_gross_wt || overrideArrival.total_actual_weight) > 100 ? Number(overrideArrival.challan_gross_wt || overrideArrival.total_actual_weight) / 1000 : Number(overrideArrival.challan_gross_wt || overrideArrival.total_actual_weight))
        : (totalChallanGrossWt > 0 ? totalChallanGrossWt : Number(masterData.challan_gross_wt || 0));

      let totalBill = 0;
      if (rate > 0 && grossWtMt > 0) {
        totalBill = Math.round(grossWtMt * 10 * rate * 100) / 100;
      } else if (poRecord?.total_amount && Number(poRecord.total_amount) > 0) {
        totalBill = Number(poRecord.total_amount);
      } else if (poRecord?.contract_value && Number(poRecord.contract_value) > 0) {
        totalBill = Number(poRecord.contract_value);
      }

      const default93 = totalBill > 0 ? calculate93PctPaidAmount(totalBill) : 0;

      setPaymentOpsInfo({
        paidAmount: default93,
        totalBill,
        pct: 93.0,
        source: 'calculated_93',
        voucherNo: null,
        loading: false,
      });

      if (forceUpdate || !(masterData as any).advance_amount || Number((masterData as any).advance_amount) === 0) {
        if (default93 > 0) {
          setMasterData(prev => ({
            ...prev,
            advance_amount: default93,
          }));
        }
      }
    } catch (err) {
      console.warn("Error syncing advance amount from Payment Operations:", err);
      setPaymentOpsInfo(prev => ({ ...prev, loading: false }));
    }
  };

  React.useEffect(() => {
    syncAdvanceFromPaymentOperations(false);
  }, [masterData.arrival_no, masterData.po_no, totalChallanGrossWt]);

  const calculateDeliveryClaimVal = (): number => {
    if (!selectedPoData || !selectedPoData.delivery_to) return 0;
    const deliveryToObj = parseDateOnly(selectedPoData.delivery_to);
    const receiptDateObj = parseDateOnly(masterData.unloading_date || masterData.arrival_date || masterData.mr_date);

    if (deliveryToObj && receiptDateObj && receiptDateObj.getTime() > deliveryToObj.getTime()) {
      const diffMs = receiptDateObj.getTime() - deliveryToObj.getTime();
      const lateDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      const penaltyPerDay = Number(selectedPoData.delivery_penalty) || Number(selectedPoData.shipment_penalty) || Number(selectedPoData.qty_penalty) || 0;

      const totalGrossWtMt = detailsList.reduce((acc, r) => acc + (Number(r.challan_gross_wt) || 0), 0);
      const totalQtyBalesOrQtl = detailsList.reduce((acc, r) => acc + (Number(r.quantity) || 0), 0);
      const scaleQuintals = totalGrossWtMt > 0 ? (totalGrossWtMt * 10) : (totalQtyBalesOrQtl > 0 ? totalQtyBalesOrQtl : 100);

      return Number((lateDays * penaltyPerDay * scaleQuintals).toFixed(2));
    }
    return 0;
  };

  useEffect(() => {
    const autoClaim = calculateDeliveryClaimVal();
    if (autoClaim > 0 && !(masterData as any).delivery_claim) {
      setMasterData((prev) => ({
        ...prev,
        delivery_claim: autoClaim,
      }));
    }
  }, [selectedPoData, masterData.unloading_date, masterData.arrival_date, masterData.mr_date, detailsList]);

  const handleSyncSettlementAmount = async () => {
    if (!supabase) return;
    try {
      setLoading(true);
      let amt = 0;
      const { data: allSettles, error } = await supabase
        .from("m_r_settlement")
        .select("po_no, mr_no, lorry_number, payable_amt, quantity, amount");

      if (!error && allSettles) {
        const targetPo = (masterData.po_no || "").trim().toLowerCase();
        const targetMr = (masterData.mr_no || "").trim().toLowerCase();
        const targetLorry = (masterData.lorry_number || "").trim().toLowerCase();

        const match = allSettles.find((s: any) => {
          const sPo = (s.po_no || "").trim().toLowerCase();
          const sMr = (s.mr_no || "").trim().toLowerCase();
          const sLorry = (s.lorry_number || "").trim().toLowerCase();

          if (targetPo && sPo && sPo === targetPo) return true;
          if (targetMr && sMr && sMr === targetMr) return true;
          if (targetLorry && sLorry && sLorry === targetLorry) return true;
          return false;
        });

        if (match && Number(match.payable_amt || match.amount || 0) > 0) {
          amt = Number(match.payable_amt || match.amount);
        } else if (targetPo) {
          const poMatch = allSettles.find((s: any) => (s.po_no || "").trim().toLowerCase().includes(targetPo) || targetPo.includes((s.po_no || "").trim().toLowerCase()));
          if (poMatch && Number(poMatch.payable_amt || poMatch.amount || 0) > 0) {
            amt = Number(poMatch.payable_amt || poMatch.amount);
          }
        }
        if (amt === 0 && allSettles.length > 0) {
          const lastSettle = allSettles[allSettles.length - 1];
          if (Number(lastSettle.payable_amt || lastSettle.amount || 0) > 0) {
            amt = Number(lastSettle.payable_amt || lastSettle.amount);
          }
        }
      }

      if (amt > 0) {
        setMasterData(prev => ({ ...prev, settlement_amount: amt }));
        setSuccessMessage(`Successfully synced Settlement Amount (Settled Amt): ₹${amt.toFixed(2)}`);
      } else {
        setErrorMessage(`No settlement record found for P.O. #${masterData.po_no || 'N/A'} or M.R. #${masterData.mr_no || 'N/A'}`);
      }
    } catch (err: any) {
      setErrorMessage("Error syncing settlement amount: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getVoucherForInspection = (row: any) => {
    if (!row.arrival_no) return null;
    return arrivalVouchers.find(
      (v) => (v.temporary_arrival_no || v.amad_no || '').trim().toLowerCase() === (row.arrival_no || '').trim().toLowerCase()
    );
  };

  const loadInspectionIntoForm = async (insp: InspectionMaster) => {
    if (!supabase) return;
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const voucher = getVoucherForInspection(insp);
      let resolvedPayableAmt = Number((insp as any).settlement_amount) || 0;
      if (!resolvedPayableAmt && insp.mr_no) {
        try {
          const { data: settData } = await supabase
            .from("m_r_settlement")
            .select("payable_amt")
            .eq("mr_no", insp.mr_no)
            .maybeSingle();
          if (settData && Number(settData.payable_amt) > 0) {
            resolvedPayableAmt = Number(settData.payable_amt);
          }
        } catch (e) {}
      }
      const poNo = insp.po_no || (insp as any).mill_po_no || "";
      if (!resolvedPayableAmt && poNo) {
        try {
          const { data: settPoData } = await supabase
            .from("m_r_settlement")
            .select("payable_amt")
            .eq("po_no", poNo)
            .limit(1);
          if (settPoData && settPoData.length > 0 && Number(settPoData[0].payable_amt) > 0) {
            resolvedPayableAmt = Number(settPoData[0].payable_amt);
          }
        } catch (e) {}
      }

      const mappedInsp = {
        ...insp,
        settlement_amount: resolvedPayableAmt > 0 ? resolvedPayableAmt : (Number((insp as any).settlement_amount) || 0),
        unloading_date: safeRenderText(insp.unloading_date || (insp as any).date || (insp as any).mr_date || (voucher as any)?.unloading_date || (voucher as any)?.date || insp.arrival_date, ""),
        po_no: safeRenderText(poNo, ""),
        broker_name: safeRenderText(insp.broker_name || (insp as any).broker || "", "").toUpperCase(),
        supplier_name: safeRenderText(insp.supplier_name || (insp as any).supplier || "", "").toUpperCase(),
        lorry_number: safeRenderText(insp.lorry_number || (voucher as any)?.lorry_number || (voucher as any)?.lorry_no || (voucher as any)?.vehicle_no, ""),
      };
      setMasterData(mappedInsp);

      const dedStr = (insp as any).deduction_type || "";
      const dedArr = dedStr
        ? dedStr.split(",").map((s: string) => s.trim()).filter(Boolean)
        : Array.isArray((insp as any).deduction_types) ? (insp as any).deduction_types : [];
      setSelectedDeductionTypes(dedArr);

      let { data, error } = await supabase
        .from("material_inspection_details")
        .select("*")
        .eq("mr_no", insp.mr_no)
        .order("srl_no", { ascending: true });

      if (error || !data || data.length === 0) {
        const fallback0 = await supabase
          .from("mill_inspection_detail")
          .select("*")
          .eq("mr_no", insp.mr_no)
          .order("srl_no", { ascending: true });
        data = fallback0.data;
      }

      if (!data || data.length === 0) {
        const fallback1 = await supabase
          .from("inspection_checklist_details")
          .select("*")
          .eq("mr_no", insp.mr_no)
          .order("srl_no", { ascending: true });
        data = fallback1.data;
      }

      if (!data || data.length === 0) {
        const fallback2 = await supabase
          .from("inspection_details")
          .select("*")
          .eq("mr_no", insp.mr_no)
          .order("srl_no", { ascending: true });
        data = fallback2.data;
      }

      if ((!data || data.length === 0) && (insp as any).grid_details) {
        try {
          const parsed = typeof (insp as any).grid_details === 'string' ? JSON.parse((insp as any).grid_details) : (insp as any).grid_details;
          if (Array.isArray(parsed) && parsed.length > 0) {
            data = parsed;
          }
        } catch (e) {}
      }

      if (data && data.length > 0) {
        const enrichedData = data.map((row: any) => {
          if ((row.quantity === 0 || row.quantity === "" || row.quantity == null) && Number(row.challan_gross_wt) > 0) {
            return {
              ...row,
              quantity: Math.round(Number(row.challan_gross_wt))
            };
          }
          return row;
        });
        setDetailsList(enrichedData);

        let loadedMatrix = (insp as any).quality_matrix;
        if (typeof loadedMatrix === "string") {
          try {
            loadedMatrix = JSON.parse(loadedMatrix);
          } catch (e) {}
        }
        if (!loadedMatrix || typeof loadedMatrix !== "object" || !loadedMatrix.grade_down) {
          loadedMatrix = initialQualityMatrix();
          const colKeys = ['1st', '2nd', '3rd', '4th'];
          enrichedData.slice(0, 4).forEach((row: any, i: number) => {
            const col = colKeys[i];
            loadedMatrix.grade_down[col] = {
              dept: String(row.actual_grade_down ?? row.grade_down_act ?? (insp.actual_grade_down || '') ?? ''),
              claim: String(row.claim_grade_down ?? row.grade_down_claim ?? (insp.claim_grade_down || '') ?? ''),
              sett: String(row.settlement_grade_down ?? '')
            };
            loadedMatrix.moisture[col] = {
              dept: String(row.actual_moisture ?? row.moisture_act ?? (insp.actual_moisture || '') ?? ''),
              claim: String(row.claim_moisture ?? row.moisture_claim ?? (insp.claim_moisture || '') ?? ''),
              sett: String(row.settlement_moisture ?? '')
            };
            loadedMatrix.dust[col] = {
              dept: String(row.actual_dust ?? row.dust_act ?? (insp.actual_dust || '') ?? ''),
              claim: String(row.claim_dust ?? row.dust_claim ?? (insp.claim_dust || '') ?? ''),
              sett: String(row.settlement_dust ?? '')
            };
            loadedMatrix.moc[col] = {
              dept: String(row.actual_ncv ?? row.ncv_act ?? (insp.actual_ncv || '') ?? ''),
              claim: String(row.claim_ncv ?? row.ncv_claim ?? (insp.claim_ncv || '') ?? ''),
              sett: String(row.settlement_ncv ?? '')
            };
            loadedMatrix.po_rate[col] = {
              dept: String(row.rate ?? row.rate_qntl ?? ''),
              claim: String(row.rate_claim ?? ''),
              sett: String(row.rate_sett ?? '')
            };
          });
        }
        setQualityMatrix(loadedMatrix);
      } else {
        setDetailsList([1, 2, 3, 4, 5].map(createEmptyRow));
        setQualityMatrix(initialQualityMatrix());
      }

      setIsEditMode(true);
      setShowSearchModal(false);
      setViewMode("entry");
      setSuccessMessage(
        `Inspection Record loaded corresponding to MR No.: ${insp.mr_no}`,
      );
    } catch (err: any) {
      setErrorMessage("Error loading details: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoFillFromVoucher = (voucher: any) => {
    if (!voucher) return;

    let pDetails: any[] = [];
    if (voucher.grid_details) {
      if (typeof voucher.grid_details === "string") {
        try {
          const parsed = voucher.grid_details === 'undefined' || voucher.grid_details === 'null' ? [] : JSON.parse(voucher.grid_details === "undefined" ? "null" : voucher.grid_details);
          if (Array.isArray(parsed)) {
            pDetails = parsed;
          }
        } catch (e) {
          console.error("Error parsing grid_details JSON:", e);
        }
      } else if (Array.isArray(voucher.grid_details)) {
        pDetails = voucher.grid_details;
      }
    }

    const selectedPoNo = voucher.mill_po_no || voucher.po_no || "";

    setMasterData((prev) => {
      const voucherArrivalDate = voucher.date || voucher.arrival_date || prev.arrival_date || new Date().toISOString().split("T")[0];
      const voucherUnloadingDate = voucher.unloading_date || voucher.date || voucher.arrival_date || prev.unloading_date || voucherArrivalDate;

      return {
        ...prev,
        arrival_no: safeRenderText(voucher.temporary_arrival_no || voucher.arrival_no || voucher.amad_no || prev.arrival_no, ""),
        arrival_date: safeRenderText(voucherArrivalDate, ""),
        unloading_date: safeRenderText(voucherUnloadingDate, ""),
        consignment_date: safeRenderText(voucher.consignment_date || voucher.date || voucher.arrival_date || prev.consignment_date, ""),
        mr_print_date: safeRenderText(voucher.mr_print_date || voucher.date || prev.mr_print_date, ""),
        po_no: safeRenderText(selectedPoNo || prev.po_no, ""),
        po_date: safeRenderText(voucher.mill_po_date || voucher.po_date || voucher.lorry_date || voucher.date || prev.po_date, ""),
        broker_name: safeRenderText(
          voucher.broker_name || voucher.broker || prev.broker_name || "",
          ""
        ).toUpperCase(),
        supplier_name: safeRenderText(
          voucher.supplier_name || voucher.supplier || prev.supplier_name || "",
          ""
        ).toUpperCase(),
        lorry_number: safeRenderText(voucher.lorry_number || voucher.lorry_no || voucher.vehicle_no || prev.lorry_number, ""),
        remarks: safeRenderText(voucher.remarks || prev.remarks, ""),
        arival_apmc_fees: Number(voucher.apmc_fees || 0),
      };
    });

    if (voucher.po_no && supabase) {
      (async () => {
        try {
          const { data } = await supabase
            .from("purchase_master")
            .select("po_date, purchase_unit_name")
            .eq("po_no", voucher.po_no.trim())
            .maybeSingle();
          if (data) {
            if (data.po_date) {
              setMasterData((prev) => ({
                ...prev,
                po_date: data.po_date,
              }));
            }
            if (data.purchase_unit_name) {
              const pUnit = data.purchase_unit_name.toUpperCase();
              setDetailsList((prev) =>
                prev.map((r) => ({
                  ...r,
                  unit: (!r.unit || r.unit === "BALES") ? pUnit : r.unit,
                }))
              );
            }
          }
        } catch (err) {
          console.warn("Async po_date load error:", err);
        }
      })();
    }

    const voucherUnit = (
      voucher.unit_name ||
      voucher.unit ||
      voucher.purchase_unit_name ||
      ""
    ).toUpperCase();

    if ((!pDetails || pDetails.length === 0) && voucher.po_no && supabase) {
      (async () => {
        try {
          const { data: pdm } = await supabase
            .from("purchase_detail_master")
            .select("*")
            .or(`po_no.eq.${voucher.po_no.trim()},po_no.ilike.${voucher.po_no.trim()}`);
          if (pdm && pdm.length > 0) {
            handleAutoFillFromVoucher({ ...voucher, grid_details: pdm });
          }
        } catch (e) {
          console.warn("Async purchase details load error:", e);
        }
      })();
    }

    if (pDetails && pDetails.length > 0) {
      const mappedDetails = pDetails.map((row: any, i: number) => {
        const qtyRcpt = Number(row.quantity_rcpt) || 0;
        const qtyChln = Number(row.quantity_chln) || 0;
        const qtyOld = Number(row.quantity) || 0;
        const netto = Number(row.netto_pnto) || 0;
        const challanGrossWt = Number(row.challan_gross_wt) || 0;

        let derivedQuantity = "";
        if (qtyRcpt > 0) derivedQuantity = String(qtyRcpt);
        else if (qtyChln > 0) derivedQuantity = String(qtyChln);
        else if (qtyOld > 0) derivedQuantity = String(qtyOld);
        else if (netto > 0) derivedQuantity = String(Math.round(netto));
        else if (challanGrossWt > 0) derivedQuantity = String(Math.round(challanGrossWt));

        const rowUnit = (
          row.unit ||
          row.unit_name ||
          voucherUnit ||
          "BALES"
        ).toUpperCase();

        const rowArea = (
          row.area_name ||
          row.area ||
          row.arrival_area_name ||
          row.arrival_area ||
          voucher.arrival_area_name ||
          voucher.arrival_area ||
          voucher.area_name ||
          voucher.area ||
          ""
        ).toUpperCase();

        const rowRate = row.rate_qntl || row.rate || row.b_rate || row.base_rate || "";

        return {
          srl_no: i + 1,
          arrival_grade: (
            row.challan_grade_name ||
            row.receipt_grade_name ||
            row.arrival_grade ||
            ""
          ).toUpperCase(),
          stock_grade_code: (row.receipt_grade_code || row.stock_grade_code || "").toUpperCase(),
          stock_grade_name: (row.receipt_grade_name || row.stock_grade_name || "").toUpperCase(),
          area: rowArea,
          agency: (row.agency_name || row.agency || "").toUpperCase(),
          marka: (row.challan_marka_name || row.marka || "").toUpperCase(),
          marks: (row.challan_marka_name || row.marks || row.marka || "").toUpperCase(),
          crop_year: (() => {
            const rawCy = String(row.crop_year || voucher.financial_year || "").trim();
            if (!rawCy) return "2026-27";
            if (rawCy === "2025-25" || rawCy === "2025-2026") return "2025-26";
            if (rawCy === "2024-2025") return "2024-25";
            if (rawCy === "2026-2027") return "2026-27";
            if (rawCy === "2027-2028") return "2027-28";
            return rawCy;
          })(),
          lot: row.lot || "",
          quantity: derivedQuantity,
          unit: rowUnit,
          rate: rowRate,
          challan_gross_wt: row.netto_pnto || row.challan_gross_wt || "",
          actual_moisture: row.moisture_act || row.actual_moisture || voucher.actual_moisture || voucher.moisture_act || "",
          claim_moisture: row.moisture_claim || row.claim_moisture || voucher.claim_moisture || voucher.moisture_claim || "",
          actual_dust: row.dust_act || row.actual_dust || voucher.actual_dust || voucher.dust_act || "",
          claim_dust: row.dust_claim || row.claim_dust || voucher.claim_dust || voucher.dust_claim || "",
          actual_ncv: row.ncv_act || row.actual_ncv || voucher.actual_ncv || voucher.ncv_act || "",
          claim_ncv: row.ncv_claim || row.claim_ncv || voucher.claim_ncv || voucher.ncv_claim || "",
          actual_grade_down: row.grade_down_act || row.actual_grade_down || voucher.actual_grade_down || voucher.grade_down_act || "",
          claim_grade_down: row.grade_down_claim || row.claim_grade_down || voucher.claim_grade_down || voucher.grade_down_claim || "",
        };
      });

      const voucherAreaHeader = (
        voucher.arrival_area_name ||
        voucher.arrival_area ||
        voucher.area_name ||
        voucher.area ||
        ""
      ).toUpperCase();

      const defaultUnit = voucherUnit || "BALES";
      while (mappedDetails.length < 5) {
        mappedDetails.push({
          srl_no: mappedDetails.length + 1,
          arrival_grade: "",
          stock_grade_code: "",
          stock_grade_name: "",
          area: voucherAreaHeader,
          agency: "",
          marka: "",
          marks: "",
          crop_year: "2026-27",
          lot: "",
          quantity: "",
          rate: "",
          unit: defaultUnit,
          challan_gross_wt: "",
          actual_moisture: "",
          claim_moisture: "",
          actual_dust: "",
          claim_dust: "",
          actual_ncv: "",
          claim_ncv: "",
          actual_grade_down: "",
          claim_grade_down: "",
        });
      }

      setDetailsList(mappedDetails);

      const colKeys = ['1st', '2nd', '3rd', '4th'];
      const newMatrix = initialQualityMatrix();
      mappedDetails.slice(0, 4).forEach((row: any, i: number) => {
        const col = colKeys[i];
        newMatrix.grade_down[col] = {
          dept: String(row.actual_grade_down || (i === 0 ? masterData.actual_grade_down : '') || ''),
          claim: String(row.claim_grade_down || (i === 0 ? masterData.claim_grade_down : '') || ''),
          sett: ''
        };
        newMatrix.moisture[col] = {
          dept: String(row.actual_moisture || (i === 0 ? masterData.actual_moisture : '') || ''),
          claim: String(row.claim_moisture || (i === 0 ? masterData.claim_moisture : '') || ''),
          sett: ''
        };
        newMatrix.dust[col] = {
          dept: String(row.actual_dust || (i === 0 ? masterData.actual_dust : '') || ''),
          claim: String(row.claim_dust || (i === 0 ? masterData.claim_dust : '') || ''),
          sett: ''
        };
        newMatrix.moc[col] = {
          dept: String(row.actual_ncv || (i === 0 ? masterData.actual_ncv : '') || ''),
          claim: String(row.claim_ncv || (i === 0 ? masterData.claim_ncv : '') || ''),
          sett: ''
        };
        newMatrix.po_rate[col] = {
          dept: String(row.rate || ''),
          claim: '',
          sett: ''
        };
      });
      setQualityMatrix(newMatrix);

      setSuccessMessage(
        `Matched & Auto-filled parameter fields & ledger rows as per Jute Arrival / PO #${voucher.po_no || voucher.temporary_arrival_no || voucher.amad_no || ""}!`,
      );
    } else {
      const voucherAreaHeader = (
        voucher.arrival_area_name ||
        voucher.arrival_area ||
        voucher.area_name ||
        voucher.area ||
        ""
      ).toUpperCase();

      if (voucherAreaHeader) {
        setDetailsList((prev) =>
          prev.map((r) => ({
            ...r,
            area: r.area || voucherAreaHeader,
          }))
        );
      }
      setSuccessMessage(
        `Matched & Auto-filled parameters as per Jute Arrival / PO #${voucher.po_no || voucher.temporary_arrival_no || voucher.amad_no || ""}! Fill custom table parameters.`,
      );
    }
    syncAdvanceFromPaymentOperations(true, voucher);
  };

  useEffect(() => {
    const actualM = Number(masterData.actual_moisture) || 0;
    const actualD = Number(masterData.actual_dust) || 0;
    const actualN = Number(masterData.actual_ncv) || 0;
    const dateStr = masterData.unloading_date || masterData.arrival_date || masterData.mr_date || new Date().toISOString().split("T")[0];
    const areaStr = detailsList.find((d) => d.area)?.area || masterData.arrival_no || "";

    const computedMoisture = calculateClaimMoisture(actualM, dateStr, areaStr, moistureLogicRules);
    const computedDust = actualD;
    const computedNcv = actualN;

    setAutoValues({
      claim_moisture: computedMoisture,
      claim_dust: computedDust,
      claim_ncv: computedNcv,
    });

    setMasterData((prev) => {
      let updated = { ...prev };
      let changed = false;

      if (!overriddenFields.claim_moisture && prev.claim_moisture !== computedMoisture) {
        updated.claim_moisture = computedMoisture;
        changed = true;
      }
      if (!overriddenFields.claim_dust && prev.claim_dust !== computedDust) {
        updated.claim_dust = computedDust;
        changed = true;
      }
      if (!overriddenFields.claim_ncv && prev.claim_ncv !== computedNcv) {
        updated.claim_ncv = computedNcv;
        changed = true;
      }

      return changed ? updated : prev;
    });
  }, [
    masterData.actual_moisture,
    masterData.actual_dust,
    masterData.actual_ncv,
    masterData.unloading_date,
    masterData.arrival_date,
    masterData.mr_date,
    detailsList,
    moistureLogicRules,
  ]);

  const handleMasterChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    let finalValue = value;
    if (name === "broker_name" || name === "supplier_name") {
      finalValue = (value || "").toUpperCase();
    }
    const numericFields = [
      "actual_moisture",
      "claim_moisture",
      "actual_dust",
      "claim_dust",
      "actual_ncv",
      "claim_ncv",
      "detention_days",
    ];

    if (name === "claim_moisture") {
      const numVal = finalValue === "" ? 0 : Number(finalValue);
      setOverriddenFields((prev) => ({
        ...prev,
        claim_moisture: numVal !== autoValues.claim_moisture,
      }));
    } else if (name === "claim_dust") {
      const numVal = finalValue === "" ? 0 : Number(finalValue);
      setOverriddenFields((prev) => ({
        ...prev,
        claim_dust: numVal !== autoValues.claim_dust,
      }));
    } else if (name === "claim_ncv") {
      const numVal = finalValue === "" ? 0 : Number(finalValue);
      setOverriddenFields((prev) => ({
        ...prev,
        claim_ncv: numVal !== autoValues.claim_ncv,
      }));
    }

    setMasterData((prev) => {
      const updated = {
        ...prev,
        [name]: numericFields.includes(name)
          ? finalValue === ""
            ? 0
            : Number(finalValue)
          : finalValue,
      };

      if (name === "po_no" && finalValue) {
        const matched = arrivalVouchers.find(
          (v) =>
            (v.po_no || "").toLowerCase() === finalValue.trim().toLowerCase(),
        );
        if (matched) {
          setTimeout(() => handleAutoFillFromVoucher(matched), 20);
        }
      } else if (name === "arrival_no" && finalValue) {
        const matched = arrivalVouchers.find(
          (v) =>
            (v.temporary_arrival_no || v.amad_no || "").toLowerCase() === finalValue.trim().toLowerCase(),
        );
        if (matched) {
          setTimeout(() => handleAutoFillFromVoucher(matched), 20);
        }
      }

      return updated;
    });
  };

  const handleDetailChange = (
    index: number,
    field: keyof InspectionDetailRow,
    val: any,
  ) => {
    const updated = [...detailsList];

    let processedValue = val;
    if (field === "quantity" || field === "challan_gross_wt" || field === "receipt_gross_wt") {
      processedValue = val === "" ? "" : Number(val);
    }

    updated[index] = {
      ...updated[index],
      [field]: processedValue,
    };

    if (field === "challan_gross_wt") {
      const rounded = Math.round(Number(processedValue) || 0);
      if (!updated[index].quantity) updated[index].quantity = rounded;
    }

    if (field === "stock_grade_code") {
      const matchedGrade = grades.find((g) => g.code === val);
      if (matchedGrade) {
        updated[index].stock_grade_name = matchedGrade.name;
      }
    }

    setDetailsList(updated);
  };

  const handleEditAction = () => {
    if (!enforceEditOrDeletePermission("Edit")) {
      return;
    }
    if (!masterData.mr_no) {
      setErrorMessage(
        "No active record loaded to edit. Use 'Add' or 'View' first.",
      );
      return;
    }
    setIsEditMode(true);
    setSuccessMessage("Edit mode enabled for active record.");
  };

  const deleteInspectionPermanently = async (target: any) => {
    if (!target) return;
    const mrNo = String(target.mr_no || masterData.mr_no || "").trim();
    const arrNo = String(target.arrival_no || target.temporary_arrival_no || masterData.arrival_no || "").trim();
    const inspNo = String((target as any).inspection_no || (masterData as any).inspection_no || "").trim();
    const recordId = target.id;

    if (!mrNo && !recordId) {
      throw new Error("Cannot delete inspection without an explicit MR number or record ID.");
    }

    const esc = (v: any) => `'${String(v ?? "").replace(/'/g, "''")}'`;
    const txStatements: string[] = [];

    if (mrNo) {
      txStatements.push(
        `DELETE FROM inspection_checklist_details WHERE mr_no = ${esc(mrNo)};`,
        `DELETE FROM inspection_details WHERE mr_no = ${esc(mrNo)};`,
        `DELETE FROM mill_inspection_detail WHERE mr_no = ${esc(mrNo)};`,
        `DELETE FROM material_inspection_details WHERE mr_no = ${esc(mrNo)};`,
        `DELETE FROM inspection_checklist WHERE mr_no = ${esc(mrNo)};`,
        `DELETE FROM inspection_master WHERE mr_no = ${esc(mrNo)};`,
        `DELETE FROM mill_inspection_master WHERE mr_no = ${esc(mrNo)};`,
        `DELETE FROM material_inspection WHERE mr_no = ${esc(mrNo)};`,
        `DELETE FROM mill_inspection_print_logs WHERE mr_no = ${esc(mrNo)};`
      );
    } else if (recordId) {
      txStatements.push(
        `DELETE FROM inspection_checklist WHERE id = ${esc(recordId)};`,
        `DELETE FROM inspection_master WHERE id = ${esc(recordId)};`,
        `DELETE FROM mill_inspection_master WHERE id = ${esc(recordId)};`,
        `DELETE FROM material_inspection WHERE id = ${esc(recordId)};`
      );
    }

    await dbModule.executeTransaction(txStatements);

    try {
      const isTarget = (r: any) => {
        if (!r) return false;
        if (mrNo && (r.mr_no === mrNo || r.id === mrNo)) return true;
        if (recordId && r.id === recordId) return true;
        if (arrNo && !mrNo && (r.arrival_no === arrNo || r.temporary_arrival_no === arrNo)) return true;
        if (inspNo && !mrNo && r.inspection_no === inspNo) return true;
        return false;
      };

      const cachedInsp = localStorage.getItem("inspection_master_records");
      if (cachedInsp) {
        const parsed = JSON.parse(cachedInsp);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter(r => !isTarget(r));
          localStorage.setItem("inspection_master_records", JSON.stringify(filtered));
        }
      }
      const cachedMat = localStorage.getItem("material_inspection_records");
      if (cachedMat) {
        const parsed = JSON.parse(cachedMat);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter(r => !isTarget(r));
          localStorage.setItem("material_inspection_records", JSON.stringify(filtered));
        }
      }
      localStorage.removeItem("AUTOSAVE_MATERIAL_INSPECTION");
    } catch (e) {
      console.warn("Storage cleanup warning:", e);
    }

    setSavedInspections(prev => prev.filter(r => {
      if (mrNo && r.mr_no === mrNo) return false;
      if (recordId && r.id === recordId) return false;
      return true;
    }));

    window.dispatchEvent(new CustomEvent('app-data-updated', { detail: { table: 'inspection_master', mr_no: mrNo } }));
    window.dispatchEvent(new CustomEvent('app-data-updated', { detail: { table: 'mill_inspection_master', mr_no: mrNo } }));
    window.dispatchEvent(new CustomEvent('app-data-updated', { detail: { table: 'inspection_checklist', mr_no: mrNo } }));
  };

  const handleCancelAction = () => {
    try {
      localStorage.removeItem("AUTOSAVE_MATERIAL_INSPECTION");
    } catch (e) {
      console.warn(e);
    }
    setMasterData(initialMasterState());
    setDetailsList([1, 2, 3, 4, 5].map(createEmptyRow));
    setOverriddenFields({ claim_moisture: false, claim_dust: false, claim_ncv: false });
    setIsEditMode(false);
    setErrorMessage("");
    setSuccessMessage("");
    setViewMode("dashboard");
    loadSavedInspectionsList();
  };

  const handleSaveAction = async (e?: React.FormEvent | boolean) => {
    if (typeof e === 'object' && e && 'preventDefault' in e) {
      e.preventDefault();
    }
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await saveMaterialInspection({
        masterData,
        detailsList,
        qualityMatrix,
        selectedDeductionTypes,
        arrivalVouchers,
        onLogEvent
      });

      if (!res.success) {
        if (res.errorMessage) {
          setErrorMessage(res.errorMessage);
          alert(res.errorMessage);
        }
        return;
      }

      if (res.errorMessage) {
        setErrorMessage(res.errorMessage);
      }
      if (res.successMessage) {
        setSuccessMessage(res.successMessage);
      }

      try {
        localStorage.removeItem("AUTOSAVE_MATERIAL_INSPECTION");
      } catch (e) {
        console.warn(e);
      }
      setIsEditMode(false);
      setViewMode("dashboard");
      window.dispatchEvent(new CustomEvent('app-data-updated'));
      window.dispatchEvent(new CustomEvent('storage'));
      loadSavedInspectionsList();
    } catch (err: any) {
      setErrorMessage("System save failure: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleExpand = async (row: any) => {
    const isCurrentlyExpanded = expandedMrNo === row.mr_no;
    if (isCurrentlyExpanded) {
      setExpandedMrNo(null);
    } else {
      setExpandedMrNo(row.mr_no);
      if (!expandedDetails[row.mr_no] && supabase) {
        try {
          const { data, error } = await supabase
            .from("mill_inspection_detail")
            .select("*")
            .eq("mr_no", row.mr_no)
            .order("srl_no", { ascending: true });
          if (!error && data) {
            setExpandedDetails(prev => ({ ...prev, [row.mr_no]: data }));
          }
        } catch (err) {
          console.error("Error loading inspection detail on expand:", err);
        }
      }
    }
  };

  const filteredSavedInspections = savedInspections.filter((item) => {
    if (!canViewCompletedData()) return false;
    const term = searchFilter.toLowerCase();
    const matchesSearch = (
      item.mr_no.toLowerCase().includes(term) ||
      (item.po_no || "").toLowerCase().includes(term) ||
      (item.supplier_name || "").toLowerCase().includes(term) ||
      (item.broker_name || "").toLowerCase().includes(term)
    );

    let matchesDates = true;
    if (arrivalStartDate) {
      if (!item.arrival_date || item.arrival_date < arrivalStartDate) {
        matchesDates = false;
      }
    }
    if (arrivalEndDate) {
      if (!item.arrival_date || item.arrival_date > arrivalEndDate) {
        matchesDates = false;
      }
    }

    return matchesSearch && matchesDates;
  }).sort((a, b) => {
    const arrA = (a.arrival_no || a.mr_no || '').toUpperCase();
    const arrB = (b.arrival_no || b.mr_no || '').toUpperCase();
    const arrDiff = arrA.localeCompare(arrB, undefined, { numeric: true, sensitivity: 'base' });
    if (arrDiff !== 0) return arrDiff;

    const dateA = a.arrival_date || a.mr_date || '';
    const dateB = b.arrival_date || b.mr_date || '';
    const dateDiff = new Date(dateB || 0).getTime() - new Date(dateA || 0).getTime();
    if (dateDiff !== 0) return dateDiff;

    const statusA = (a.status || 'Completed').toUpperCase();
    const statusB = (b.status || 'Completed').toUpperCase();
    return statusA.localeCompare(statusB);
  });

  const filteredPendingMrList = arrivalVouchers.filter((v) => {
    const arrivalVal = (v.temporary_arrival_no || v.amad_no || "").trim().toUpperCase();
    if (!arrivalVal) return false;

    const isInspected = savedInspections.some(
      (insp) => (insp.arrival_no || "").trim().toUpperCase() === arrivalVal
    );
    if (isInspected) return false;

    const term = searchFilter.toLowerCase();
    const matchesSearch = (
      arrivalVal.toLowerCase().includes(term) ||
      (v.po_no || "").toLowerCase().includes(term) ||
      (v.supplier || "").toLowerCase().includes(term) ||
      (v.broker || "").toLowerCase().includes(term)
    );

    let matchesDates = true;
    if (arrivalStartDate) {
      if (!v.date || v.date < arrivalStartDate) {
        matchesDates = false;
      }
    }
    if (arrivalEndDate) {
      if (!v.date || v.date > arrivalEndDate) {
        matchesDates = false;
      }
    }

    return matchesSearch && matchesDates;
  }).sort((a, b) => {
    const arrA = (a.temporary_arrival_no || a.amad_no || '').toUpperCase();
    const arrB = (b.temporary_arrival_no || b.amad_no || '').toUpperCase();
    const arrDiff = arrA.localeCompare(arrB, undefined, { numeric: true, sensitivity: 'base' });
    if (arrDiff !== 0) return arrDiff;

    const dateA = a.date || '';
    const dateB = b.date || '';
    const dateDiff = new Date(dateB || 0).getTime() - new Date(dateA || 0).getTime();
    if (dateDiff !== 0) return dateDiff;

    return (a.status || 'Pending').localeCompare(b.status || 'Pending');
  });

  return {
    brokers,
    suppliers,
    grades,
    areas,
    agencies,
    markas,
    arrivalVouchers,
    deductionMasterList,
    selectedPoData,
    selectedDeductionTypes,
    viewMode,
    setViewMode,
    isEditMode,
    setIsEditMode,
    loading,
    setLoading,
    errorMessage,
    setErrorMessage,
    successMessage,
    setSuccessMessage,
    currentTab,
    setCurrentTab,
    selectedMrNos,
    setSelectedMrNos,
    printedInspections,
    printingBatch,
    setPrintingBatch,
    printingInspection,
    setPrintingInspection,
    printingInspectionDetails,
    showSearchModal,
    setShowSearchModal,
    savedInspections,
    searchFilter,
    setSearchFilter,
    finalArrivals,
    purchaseOrders,
    arrivalStartDate,
    setArrivalStartDate,
    arrivalEndDate,
    setArrivalEndDate,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    pendingCurrentPage,
    setPendingCurrentPage,
    pendingPageSize,
    setPendingPageSize,
    expandedMrNo,
    setExpandedMrNo,
    expandedDetails,
    visibleColumns,
    setVisibleColumns,
    showWeightsBreakdown,
    setShowWeightsBreakdown,
    unitList,
    currentUser,
    masterData,
    setMasterData,
    detailsList,
    setDetailsList,
    qualityMatrix,
    setQualityMatrix,
    showAllFourSpecs,
    setShowAllFourSpecs,
    show3rdAnd4th,
    updateMatrixVal,
    totalChallanGrossWt,
    totalReceiptGrossWt,
    paymentOpsInfo,
    syncAdvanceFromPaymentOperations,
    handleSyncSettlementAmount,
    loadInspectionIntoForm,
    handleAutoFillFromVoucher,
    handleMasterChange,
    handleDetailChange,
    handleEditAction,
    deleteInspectionPermanently,
    handleCancelAction,
    handleSaveAction,
    handleToggleExpand,
    filteredSavedInspections,
    filteredPendingMrList,
    handleBatchPrint,
    handlePreparePrintInspection,
    handleExportToExcel,
    handleRefreshDatabase,
    loadSavedInspectionsList
  };
}
