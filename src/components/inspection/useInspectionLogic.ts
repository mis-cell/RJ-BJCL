import React, { useState, useEffect, useMemo, useRef } from "react";
import { useLiveAutoRefresh } from "../../hooks/useLiveAutoRefresh";
import { supabase } from "../../lib/supabase";
import { dbModule } from "../../services/dbModule";
import { getCurrentUserContext } from "../../lib/permissions";
import { logChange } from "../../services/auditLogService";
import {
  DeductionRow,
  InspectionMasterRecord,
  InspectionDetailRow,
} from "../../types/inspection.types";
import {
  calculateBaleWeightDeduction,
  calculateAllMatchingDeductions,
  computeDetailRowWeights,
  calculateQtyInMt,
  calculateRowAmount,
  extractMonthFromDate,
  sanitizeDate,
  calculateClaimMoisture,
} from "../../utils/inspectionCalculations";
import { parseMonthKey } from "../common/MonthWiseCardsRibbon";
import {
  checkAndProcessReturnLorryOnInspection,
  calculateInspectionWeightMt,
  fetchAllReturnLorries,
} from "../../services/returnLorryService";
import {
  saveInspectionRecordToDb,
  deleteInspectionRecordFromDb,
} from "./inspectionSaveService";

export function useInspectionLogic() {
  const [records, setRecords] = useState<InspectionMasterRecord[]>([]);
  const [finalArrivalList, setFinalArrivalList] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const isFetchingRecordsRef = useRef<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [datePreset, setDatePreset] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"dashboard" | "form">("dashboard");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Sorting state for arrival date, arrival no, status
  const [sortField, setSortField] = useState<"arrival_date" | "arrival_no" | "status">("arrival_date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Print modal state
  const [copyType, setCopyType] = useState<string | null>('1');
  const [printingRecord, setPrintingRecord] = useState<InspectionMasterRecord | null>(null);
  const [printingDetails, setPrintingDetails] = useState<any[]>([]);

  // Pagination (100 rows per page)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, selectedMonthFilter, startDate, endDate, datePreset]);

  const getLocalISODate = (d: Date = new Date()) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const handleDatePresetChange = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
      setSelectedMonthFilter(null);
    } else if (preset === 'today') {
      const todayStr = getLocalISODate(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
      setSelectedMonthFilter(null);
    } else if (preset === 'yesterday') {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      const yestStr = getLocalISODate(yest);
      setStartDate(yestStr);
      setEndDate(yestStr);
      setSelectedMonthFilter(null);
    } else if (preset === 'this_week') {
      const day = now.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      setStartDate(getLocalISODate(monday));
      setEndDate(getLocalISODate(sunday));
      setSelectedMonthFilter(null);
    } else if (preset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(getLocalISODate(firstDay));
      setEndDate(getLocalISODate(lastDay));
      setSelectedMonthFilter(null);
    } else if (preset === 'last_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(getLocalISODate(firstDay));
      setEndDate(getLocalISODate(lastDay));
      setSelectedMonthFilter(null);
    }
  };

  const clearDateFilter = () => {
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
    setSelectedMonthFilter(null);
  };

  // Form State
  const [headerForm, setHeaderForm] = useState<InspectionMasterRecord>({
    mr_no: "",
    mr_date: new Date().toISOString().split("T")[0],
    arrival_no: "",
    arrival_date: new Date().toISOString().split("T")[0],
    po_no: "",
    po_date: new Date().toISOString().split("T")[0],
    broker_name: "",
    supplier_name: "",
    actual_moisture: 0,
    claim_moisture: 0,
    actual_dust: 0,
    claim_dust: 0,
    actual_ncv: 0,
    claim_ncv: 0,
    detention_days: 0,
    unloading_date: "",
    mill_po_no: "",
    mill_po_date: "",
    mr_spcl_print: "",
    remarks: "",
    lorry_number: "",
    status: "Completed"
  });

  const [detailRows, setDetailRows] = useState<InspectionDetailRow[]>([
    {
      unit: "BALES",
      quantity: 0,
      challan_gross_wt: 0,
      tolerable: "No",
      expanded: false
    }
  ]);

  // Deduction state for multiple deduction rows
  const [deductionRows, setDeductionRows] = useState<DeductionRow[]>([
    { id: "1", deduction_type: "", deduction_rate: 0, deduction_qty: 0, deduction_amount: 0 }
  ]);
  const [deductionMasterList, setDeductionMasterList] = useState<any[]>([]);
  const [moistureLogicRules, setMoistureLogicRules] = useState<any[]>([]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const syncHeaderDeductions = (rows: DeductionRow[]) => {
    const activeRows = rows.filter(r => (r.deduction_type && r.deduction_type.trim() !== "") || r.deduction_amount > 0 || r.deduction_rate > 0);
    const totalAmt = rows.reduce((acc, r) => acc + (Number(r.deduction_amount) || 0), 0);
    const primaryRow = activeRows[0] || rows[0] || { deduction_type: "", deduction_rate: 0, deduction_qty: 0, deduction_amount: 0 };

    setHeaderForm(prev => ({
      ...prev,
      deduction_type: activeRows.map(r => r.deduction_type).filter(Boolean).join(", ") || primaryRow.deduction_type || "",
      deduction_rate: primaryRow.deduction_rate || 0,
      deduction_qty: primaryRow.deduction_qty || 0,
      deduction_amount: totalAmt,
      deductions: rows
    }));
  };

  const isBaleWeightDeductionRule = (name: string) => {
    const n = String(name || "").trim().toUpperCase();
    return (n.includes("BALE") || n.includes("BALES")) && (n.includes("LESS THAN") || n.includes("WEIGHT") || n.includes("<"));
  };

  const applyAllAutoDeductions = (
    details: InspectionDetailRow[],
    hForm: Partial<InspectionMasterRecord>,
    dMaster: any[]
  ) => {
    const { matchedDeductions } = calculateAllMatchingDeductions(details, hForm, dMaster);

    setDeductionRows(prevRows => {
      let nextRows = [...prevRows];

      matchedDeductions.forEach(matched => {
        const existingIdx = nextRows.findIndex(
          r => r.deduction_type === matched.ruleName || (matched.category === "bale_weight" && isBaleWeightDeductionRule(r.deduction_type || ""))
        );

        if (existingIdx >= 0) {
          const cur = nextRows[existingIdx];
          nextRows[existingIdx] = {
            ...cur,
            deduction_type: matched.ruleName,
            deduction_rate: matched.rate,
            deduction_qty: matched.qty,
            deduction_amount: matched.amount
          };
        } else {
          const isFirstRowEmpty =
            nextRows.length === 1 &&
            (!nextRows[0].deduction_type ||
              nextRows[0].deduction_type.trim() === "" ||
              nextRows[0].deduction_type.includes("-- SELECT"));

          if (isFirstRowEmpty) {
            nextRows = [
              {
                id: nextRows[0].id || "1",
                deduction_type: matched.ruleName,
                deduction_rate: matched.rate,
                deduction_qty: matched.qty,
                deduction_amount: matched.amount
              }
            ];
          } else {
            nextRows.push({
              id: String(Date.now() + Math.random()),
              deduction_type: matched.ruleName,
              deduction_rate: matched.rate,
              deduction_qty: matched.qty,
              deduction_amount: matched.amount
            });
          }
        }
      });

      if (nextRows.length === 0) {
        nextRows = [{ id: "1", deduction_type: "", deduction_rate: 0, deduction_qty: 0, deduction_amount: 0 }];
      }

      const isSame =
        prevRows.length === nextRows.length &&
        prevRows.every(
          (r, i) =>
            r.deduction_type === nextRows[i].deduction_type &&
            Number(r.deduction_rate) === Number(nextRows[i].deduction_rate) &&
            Number(r.deduction_qty) === Number(nextRows[i].deduction_qty) &&
            Number(r.deduction_amount) === Number(nextRows[i].deduction_amount)
        );

      if (isSame) {
        return prevRows;
      }

      syncHeaderDeductions(nextRows);
      return nextRows;
    });
  };

  useEffect(() => {
    if (detailRows && detailRows.length > 0) {
      applyAllAutoDeductions(detailRows, headerForm, deductionMasterList);
    }
  }, [
    detailRows,
    headerForm.detention_days,
    headerForm.delivery_claim,
    headerForm.remarks,
    headerForm.mr_spcl_print,
    deductionMasterList
  ]);

  const handleDeductionTypeChange = (idx: number, selectedName: string) => {
    const found = deductionMasterList.find(d => d.deduction === selectedName);
    let rate = found ? (found.rate_per_unit != null ? Number(found.rate_per_unit) : (found.rate_per_qntl != null ? Number(found.rate_per_qntl) : 0)) : 0;

    const autoCalc = calculateBaleWeightDeduction(detailRows, deductionMasterList);
    const isBaleRule = isBaleWeightDeductionRule(selectedName);

    const totalGrossMt = (detailRows || []).reduce((sum, r) => {
      const wt = Number(r.receipt_gross_wt) > 0 
        ? Number(r.receipt_gross_wt) 
        : (Number(r.gross_weight_batch) > 0 ? Number(r.gross_weight_batch) : Number(r.challan_gross_wt) || 0);
      return sum + wt;
    }, 0);
    const totalItemQty = (detailRows || []).reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);

    let defaultQty = 0;
    if (isBaleRule) {
      const qtlFromGross = totalGrossMt > 0 ? Number((totalGrossMt * 10).toFixed(2)) : 0;
      const qtlFromAudit = autoCalc.totalReceiptGrossWtMt > 0 ? Number((autoCalc.totalReceiptGrossWtMt * 10).toFixed(2)) : 0;
      const rawHeaderWt = Number(headerForm?.gross_weight || headerForm?.challan_weight || 0);
      const qtlFromHeader = rawHeaderWt > 50 ? rawHeaderWt : Number((rawHeaderWt * 10).toFixed(2));
      defaultQty = qtlFromGross > 0 ? qtlFromGross : (qtlFromAudit > 0 ? qtlFromAudit : (qtlFromHeader > 0 ? qtlFromHeader : (autoCalc.totalBales > 0 ? autoCalc.totalBales : 1)));
    } else if (found && found.rate_per_qntl != null && totalGrossMt > 0) {
      defaultQty = Number((totalGrossMt * 10).toFixed(2));
    } else if (selectedName.includes("DELIVERY CLAIM")) {
      const days = Number(headerForm?.detention_days) > 0 ? Number(headerForm?.detention_days) : 1;
      rate = Number((rate * days).toFixed(2));
      defaultQty = totalGrossMt > 0 ? Number((totalGrossMt * 10).toFixed(2)) : 1;
    } else if (totalItemQty > 0) {
      defaultQty = totalItemQty;
    }
    
    setDeductionRows(prev => {
      const updated = [...prev];
      const current = { ...(updated[idx] || { id: String(Date.now()), deduction_type: "", deduction_rate: 0, deduction_qty: 0, deduction_amount: 0 }) };
      current.deduction_type = selectedName;
      current.deduction_rate = rate;
      current.deduction_qty = defaultQty;
      current.deduction_amount = Number((rate * defaultQty).toFixed(2));
      updated[idx] = current;
      syncHeaderDeductions(updated);
      return updated;
    });
  };

  const handleDeductionChange = (idx: number, field: "deduction_rate" | "deduction_qty" | "deduction_amount", value: number) => {
    setDeductionRows(prev => {
      const updated = [...prev];
      const current = { ...(updated[idx] || { id: String(Date.now()), deduction_type: "", deduction_rate: 0, deduction_qty: 0, deduction_amount: 0 }) };
      if (field === "deduction_rate") current.deduction_rate = value;
      if (field === "deduction_qty") current.deduction_qty = value;
      if (field === "deduction_amount") {
        current.deduction_amount = value;
      } else {
        current.deduction_amount = Number(((current.deduction_rate || 0) * (current.deduction_qty || 0)).toFixed(2));
      }
      updated[idx] = current;
      syncHeaderDeductions(updated);
      return updated;
    });
  };

  const handleAddDeductionRow = () => {
    setDeductionRows(prev => {
      const updated = [
        ...prev,
        { id: String(Date.now() + Math.random()), deduction_type: "", deduction_rate: 0, deduction_qty: 0, deduction_amount: 0 }
      ];
      syncHeaderDeductions(updated);
      return updated;
    });
    showToast("Added new deduction entry row.");
  };

  const handleRemoveDeductionRow = (idx: number) => {
    setDeductionRows(prev => {
      if (prev.length <= 1) {
        const reset = [{ id: "1", deduction_type: "", deduction_rate: 0, deduction_qty: 0, deduction_amount: 0 }];
        syncHeaderDeductions(reset);
        return reset;
      }
      const updated = prev.filter((_, i) => i !== idx);
      syncHeaderDeductions(updated);
      return updated;
    });
    showToast("Deduction entry removed.");
  };

  async function fetchInspectionRecords(isManual: boolean = false) {
    if (isFetchingRecordsRef.current) return;
    isFetchingRecordsRef.current = true;
    setLoading(true);
    try {
      let inspectionList: InspectionMasterRecord[] = [];
      let faList: any[] = [];
      const dbDeductionsMap = new Map<string, DeductionRow[]>();

      if (supabase) {
        try {
          const withTimeout = (promise: Promise<any>, ms: number = 20000) => {
            return Promise.race([
              promise,
              new Promise(resolve => setTimeout(() => resolve({ data: null, error: 'timeout' }), ms))
            ]);
          };

          const miCols = "*";
          const faCols = "*";

          const queries: Promise<any>[] = [
            withTimeout(Promise.resolve(supabase.from("material_inspection").select(miCols).order("created_at", { ascending: false })), 20000),
            withTimeout(Promise.resolve(supabase.from("mill_inspection_master").select("*").order("created_at", { ascending: false })), 20000).catch(() => ({ data: null })),
            withTimeout(Promise.resolve(supabase.from("final_arrival").select(faCols).order("created_at", { ascending: false })), 20000),
            withTimeout(Promise.resolve(supabase.from("temporary_material_received").select("*").order("created_at", { ascending: false })), 20000).catch(() => ({ data: null })),
            withTimeout(Promise.resolve(supabase.from("material_inspection_deductions").select("*").order("created_at", { ascending: true })), 20000).catch(() => ({ data: null })),
            withTimeout(Promise.resolve(supabase.from("mill_inspection_deduction").select("*").order("created_at", { ascending: true })), 20000).catch(() => ({ data: null }))
          ];

            queries.push(withTimeout(Promise.resolve(supabase.from("deduction_master").select("*").order("deduction", { ascending: true })), 20000).catch(() => ({ data: null })));
            queries.push(withTimeout(Promise.resolve(supabase.from("moisture_logic").select("*")), 20000).catch(() => ({ data: null })));

          const [miRes, mimRes, faRes, tmrRes, dedPrimaryRes, dedFallbackRes, dMasterRes, moistRes] = await Promise.all(queries);

          if (miRes.data && Array.isArray(miRes.data) && miRes.data.length > 0) {
            inspectionList = [...miRes.data];
          } else if (supabase) {
            const directMi = await supabase.from("material_inspection").select("*").order("created_at", { ascending: false });
            if (directMi.data && Array.isArray(directMi.data)) {
              inspectionList = [...directMi.data];
            }
          }
          if (mimRes?.data && Array.isArray(mimRes.data)) {
            const existingKeys = new Set(inspectionList.map(r => (r.mr_no || r.arrival_no || "").trim().toUpperCase()).filter(Boolean));
            mimRes.data.forEach((r: any) => {
              const k = (r.mr_no || r.arrival_no || "").trim().toUpperCase();
              if (k && !existingKeys.has(k)) {
                inspectionList.push(r);
                existingKeys.add(k);
              }
            });
          }
          if (faRes.data && Array.isArray(faRes.data)) {
            faList = [...faRes.data];
          }
          if (tmrRes?.data && Array.isArray(tmrRes.data)) {
            const existingFaNos = new Set(faList.map(f => (f.final_arrival_no || f.temporary_arrival_no || f.arrival_no || '').trim().toUpperCase()).filter(Boolean));
            tmrRes.data.forEach((t: any) => {
              const tNo = (t.temporary_arrival_no || t.arrival_no || '').trim().toUpperCase();
              if (tNo && !existingFaNos.has(tNo)) {
                faList.push({
                  ...t,
                  final_arrival_no: t.temporary_arrival_no || t.arrival_no,
                  arrival_no: t.temporary_arrival_no || t.arrival_no,
                  arrival_date: t.date || t.temporary_arrival_date
                });
                existingFaNos.add(tNo);
              }
            });
          }
          if (dMasterRes && dMasterRes.data && Array.isArray(dMasterRes.data)) {
            setDeductionMasterList(dMasterRes.data);
          } else {
            const fallbackDeds = await dbModule.fetchAll('deduction_master').catch(() => []);
            if (Array.isArray(fallbackDeds)) {
              setDeductionMasterList(fallbackDeds);
            }
          }
          if (moistRes && moistRes.data && Array.isArray(moistRes.data) && moistRes.data.length > 0) {
            setMoistureLogicRules(moistRes.data);
          }

          const dedData = (dedPrimaryRes && dedPrimaryRes.data && dedPrimaryRes.data.length > 0)
            ? dedPrimaryRes.data
            : (dedFallbackRes?.data || []);

          if (dedData && Array.isArray(dedData)) {
            dedData.forEach((d: any) => {
              const k1 = (d.mr_no || "").trim().toUpperCase();
              const k2 = (d.arrival_no || "").trim().toUpperCase();
              const row: DeductionRow = {
                id: d.id ? String(d.id) : String(Math.random()),
                deduction_type: d.deduction_type || "",
                deduction_rate: Number(d.deduction_rate) || 0,
                deduction_qty: Number(d.deduction_qty) || 0,
                deduction_amount: Number(d.deduction_amount) || 0,
                remarks: d.remarks || ""
              };
              if (k1) {
                const list = dbDeductionsMap.get(k1) || [];
                list.push(row);
                dbDeductionsMap.set(k1, list);
              }
              if (k2 && k2 !== k1) {
                const list = dbDeductionsMap.get(k2) || [];
                list.push(row);
                dbDeductionsMap.set(k2, list);
              }
            });
          }
        } catch (e) {
          console.warn("Parallel fetch error in inspection records:", e);
        }
      }

      if (inspectionList.length === 0) {
        try {
          const cached = localStorage.getItem("material_inspection_records") || localStorage.getItem("inspection_master_records");
          if (cached) inspectionList = JSON.parse(cached);
        } catch (e) {}
      }

      setFinalArrivalList(faList);

      const map = new Map<string, InspectionMasterRecord>();
      const secondaryMap = new Map<string, InspectionMasterRecord>();
      inspectionList.forEach(rec => {
        const k = (rec.mr_no || rec.arrival_no || "").trim().toUpperCase();
        if (k) map.set(k, rec);
        const mrK = (rec.mr_no || "").trim().toUpperCase();
        const arrK = (rec.arrival_no || "").trim().toUpperCase();
        if (mrK) secondaryMap.set(mrK, rec);
        if (arrK) secondaryMap.set(arrK, rec);
      });

      const isBlankPo = (val: any) => {
        const s = String(val || "").trim().toUpperCase();
        return !s || s === "NO" || s === "N/A" || s === "NONE";
      };

      faList.forEach(fa => {
        const mrKey = (fa.mr_no || "").trim().toUpperCase();
        const arrKey = (fa.final_arrival_no || fa.arrival_no || "").trim().toUpperCase();
        const tempKey = (fa.temporary_arrival_no || fa.amad_no || "").trim().toUpperCase();
        const existing =
          (mrKey && (map.get(mrKey) || secondaryMap.get(mrKey))) ||
          (arrKey && (map.get(arrKey) || secondaryMap.get(arrKey))) ||
          (tempKey && (map.get(tempKey) || secondaryMap.get(tempKey)));

        if (existing) {
          if (isBlankPo(existing.po_no) && !isBlankPo(fa.po_no)) existing.po_no = fa.po_no;
          if (!existing.po_date && (fa.po_date || fa.date)) existing.po_date = fa.po_date || fa.date;
          if (!existing.supplier_name && (fa.supplier || fa.challan_supplier)) existing.supplier_name = fa.supplier || fa.challan_supplier;
          if (!existing.broker_name && fa.broker) existing.broker_name = fa.broker;
          if (!existing.lorry_number && fa.lorry_number) existing.lorry_number = fa.lorry_number;
          if (!existing.arrival_no && fa.final_arrival_no) existing.arrival_no = fa.final_arrival_no;
          const faArrDate = sanitizeDate(fa.date || fa.arrival_date || fa.final_arrival_date);
          if (faArrDate) {
            if (!existing.arrival_date || sanitizeDate(existing.arrival_date) === sanitizeDate(fa.temporary_arrival_date)) {
              existing.arrival_date = faArrDate;
            }
            if (!existing.mr_date || sanitizeDate(existing.mr_date) === sanitizeDate(fa.temporary_arrival_date)) {
              existing.mr_date = faArrDate;
            }
          }
          if (!existing.grid_details) existing.grid_details = fa.grid_details || fa.items || fa.details;
          if (!Number(existing.arival_apmc_fees) && (Number(fa.apmc_fees) > 0 || Number(fa.arival_apmc_fees) > 0)) {
            existing.arival_apmc_fees = Number(fa.apmc_fees || fa.arival_apmc_fees || 0);
          }
        }
      });

      const displayList = Array.from(map.values()).map(rec => {
        const mrK = (rec.mr_no || "").trim().toUpperCase();
        const arrK = (rec.arrival_no || "").trim().toUpperCase();
        let attachedDeductions: DeductionRow[] = [];

        if (mrK && dbDeductionsMap.has(mrK)) {
          attachedDeductions = dbDeductionsMap.get(mrK)!;
        } else if (arrK && dbDeductionsMap.has(arrK)) {
          attachedDeductions = dbDeductionsMap.get(arrK)!;
        } else if (rec.deductions) {
          if (Array.isArray(rec.deductions) && rec.deductions.length > 0) {
            attachedDeductions = rec.deductions;
          } else if (typeof rec.deductions === 'string') {
            try {
              const p = JSON.parse(rec.deductions);
              if (Array.isArray(p) && p.length > 0) attachedDeductions = p;
            } catch (e) {}
          }
        }

        if (attachedDeductions.length === 0 && (rec.deduction_type || Number(rec.deduction_amount) > 0)) {
          attachedDeductions = [
            {
              id: "1",
              deduction_type: rec.deduction_type || "General Deduction",
              deduction_rate: Number(rec.deduction_rate) || 0,
              deduction_qty: Number(rec.deduction_qty) || 0,
              deduction_amount: Number(rec.deduction_amount) || 0
            }
          ];
        }

        if (attachedDeductions.length > 0) {
          rec.deductions = attachedDeductions;
          (rec as any).deduction_rows = attachedDeductions;
          if (!rec.deduction_amount || Number(rec.deduction_amount) === 0) {
            rec.deduction_amount = attachedDeductions.reduce((sum, d) => sum + (Number(d.deduction_amount) || 0), 0);
          }
        }

        // Compute weight and Return Lorry (< 5 MT) status
        let parsedGrid: any[] = [];
        if (rec.grid_details) {
          if (Array.isArray(rec.grid_details)) parsedGrid = rec.grid_details;
          else if (typeof rec.grid_details === "string") {
            try {
              const p = JSON.parse(rec.grid_details);
              if (Array.isArray(p)) parsedGrid = p;
            } catch (e) {}
          }
        }
        const matchedFa = faList.find(f => {
          const fk = String(f.final_arrival_no || f.mr_no || f.arrival_no || "").trim().toUpperCase();
          return fk && (fk === mrK || fk === arrK);
        });
        const wtMt = calculateInspectionWeightMt(rec, parsedGrid, matchedFa);
        (rec as any).received_weight_mt = wtMt;
        if (wtMt > 0 && wtMt < 5 && rec.po_no) {
          (rec as any).is_return_lorry = true;
          if (!(rec as any).reference_po_no) {
            (rec as any).reference_po_no = rec.po_no;
          }
        }

        return rec;
      });

      // Enrich with saved Return Lorry (4000 series) records & auto-sync any new < 5 MT lorries
      try {
        const returnLorries = await fetchAllReturnLorries();
        const rlByMr = new Map<string, any>();
        returnLorries.forEach(rl => {
          const k = String(rl.mr_no || rl.final_arrival_no || "").trim().toUpperCase();
          if (k) rlByMr.set(k, rl);
        });

        for (const rec of displayList) {
          const k = String(rec.mr_no || rec.arrival_no || "").trim().toUpperCase();
          const matchedRl = k ? rlByMr.get(k) : null;
          if (matchedRl) {
            (rec as any).is_return_lorry = true;
            (rec as any).return_po_no = matchedRl.new_po_no || matchedRl.po_no;
            (rec as any).reference_po_no = matchedRl.reference_po_no || rec.po_no;
            if (!Number((rec as any).received_weight_mt) && Number(matchedRl.received_weight_mt) > 0) {
              (rec as any).received_weight_mt = Number(matchedRl.received_weight_mt);
            }
          } else if ((rec as any).is_return_lorry && rec.po_no && k) {
            // Auto-process in background so 4000-series P.O. is created in return_lorry
            checkAndProcessReturnLorryOnInspection({
              mrNo: k,
              poNo: rec.po_no,
              arrivalNo: rec.arrival_no || k,
              lorryNo: rec.lorry_number,
              inspectionDate: rec.mr_date || rec.arrival_date,
              headerForm: rec,
            }).then(res => {
              if (res.isReturnLorry && res.newPoNo) {
                setRecords(prev =>
                  prev.map(r =>
                    String(r.mr_no || "").trim().toUpperCase() === k
                      ? ({
                          ...r,
                          is_return_lorry: true,
                          return_po_no: res.newPoNo,
                          reference_po_no: res.referencePoNo || r.po_no,
                        } as any)
                      : r
                  )
                );
              }
            }).catch(() => {});
          }
        }
      } catch (e) {}

      setRecords(displayList);
      if (isManual) {
        showToast("Inspection register data refreshed successfully.");
      }
    } catch (err) {
      console.error("Error fetching material_inspection records:", err);
      if (isManual) {
        showToast("Failed to refresh records from database.");
      }
    } finally {
      setLoading(false);
      isFetchingRecordsRef.current = false;
    }
  }

  useEffect(() => {
    fetchInspectionRecords();
  }, []);

  useLiveAutoRefresh(fetchInspectionRecords, [], { tables: ['material_inspection', 'material_inspection_details', 'final_arrival', 'purchase_master', 'purchase_detail_master', 'temporary_material_received', 'moisture_logic', 'deduction_master'] });

  const loadDetailsForPo = async (poNo: string, overrideArrivalData?: any) => {
    if (!poNo) return;
    try {
      const poClean = poNo.trim();
      const poUpper = poClean.toUpperCase();
      let matchedItems: any[] = [];
      let gradeMap: Record<string, string> = {};
      let agencyMap: Record<string, string> = {};
      let markaMap: Record<string, string> = {};
      let pmData: any = null;

      if (supabase) {
        const [pdmRes, scpRes, midRes, pmRes, gradesRes, agenciesRes, markasRes, scpHeaderRes] = await Promise.all([
          supabase.from('purchase_detail_master').select('*').or(`po_no.eq.${poClean},po_no.ilike.${poUpper}`),
          supabase.from('sauda_check_point_details').select('*').or(`po_no.eq.${poClean},po_no.ilike.${poUpper}`),
          supabase.from('material_inspection_details').select('*').or(`mr_no.eq.${poClean},mr_no.ilike.${poUpper},po_no.eq.${poClean}`),
          supabase.from('purchase_master').select('*').or(`po_no.eq.${poClean},po_no.ilike.${poUpper}`),
          supabase.from('grade_master').select('*'),
          supabase.from('agency_master').select('*'),
          supabase.from('marka_master').select('*'),
          supabase.from('sauda_check_point').select('*').or(`po_no.eq.${poClean},po_no.ilike.${poUpper}`)
        ]);

        if (gradesRes.data) {
          gradesRes.data.forEach((g: any) => {
            if (g.grade_code && g.grade_name) gradeMap[String(g.grade_code).trim()] = g.grade_name;
          });
        }
        if (agenciesRes.data) {
          agenciesRes.data.forEach((a: any) => {
            if (a.agency_code && a.agency_name) agencyMap[String(a.agency_code).trim()] = a.agency_name;
          });
        }
        if (markasRes.data) {
          markasRes.data.forEach((m: any) => {
            if (m.marka_code && m.marka_name) markaMap[String(m.marka_code).trim()] = m.marka_name;
          });
        }

        if (pmRes.data && pmRes.data.length > 0) {
          pmData = pmRes.data[0];
          const pm = pmData;
          setHeaderForm(prev => ({
            ...prev,
            po_no: pm.po_no || prev.po_no,
            po_date: sanitizeDate(pm.po_date || pm.date) || prev.po_date,
            supplier_name: pm.supplier || pm.challan_supplier || pm.supplier_name || prev.supplier_name,
            broker_name: pm.broker || pm.broker_name || prev.broker_name,
            lorry_number: pm.lorry_no || pm.lorry_number || prev.lorry_number
          }));
        } else if (scpHeaderRes.data && scpHeaderRes.data.length > 0) {
          const scp = scpHeaderRes.data[0];
          pmData = scp;
          setHeaderForm(prev => ({
            ...prev,
            po_no: scp.po_no || prev.po_no,
            po_date: sanitizeDate(scp.po_date || scp.s_date) || prev.po_date,
            supplier_name: scp.supplier_name || scp.supplier || prev.supplier_name,
            broker_name: scp.broker_name || scp.broker || prev.broker_name,
            lorry_number: scp.lorry_number || prev.lorry_number
          }));
        }

        matchedItems = (pdmRes.data && pdmRes.data.length > 0)
          ? pdmRes.data
          : ((scpRes.data && scpRes.data.length > 0)
              ? scpRes.data
              : (midRes.data || []));
      }

      if (!matchedItems || matchedItems.length === 0) {
        const [allPdm, allScp] = await Promise.all([
          dbModule.fetchAll('purchase_detail_master').catch(() => []),
          dbModule.fetchAll('sauda_check_point_details').catch(() => [])
        ]);
        const pdm = (allPdm || []).filter((d: any) => String(d.po_no).trim().toUpperCase() === poUpper);
        const scp = (allScp || []).filter((d: any) => String(d.po_no).trim().toUpperCase() === poUpper);
        matchedItems = pdm.length > 0 ? pdm : scp;
      }

      if (matchedItems && matchedItems.length > 0) {
        let resolvedUnitName = (pmData?.unit_name || pmData?.unit || overrideArrivalData?.unit_name || overrideArrivalData?.unit || "").toString().trim().toUpperCase();
        if (!resolvedUnitName && matchedItems.length > 0) {
          for (const itm of matchedItems) {
            const u = (itm.unit || itm.unit_name || "").toString().trim().toUpperCase();
            if (u && u !== "BALES") {
              resolvedUnitName = u;
              break;
            }
          }
        }

        const details: InspectionDetailRow[] = matchedItems.map((item: any, i: number) => {
          const gradeCode = String(item.grade_code || item.receipt_grade_code || item.stock_grade_code || item.item_code || "").trim();
          const resolvedGradeName = item.receipt_grade_name || item.challan_grade_name || item.grade_name || item.variety || item.item_name || item.grade || gradeMap[gradeCode] || gradeCode || "";
          const agencyCode = String(item.agency_code || "").trim();
          const resolvedAgencyName = item.agency_name || item.agency || agencyMap[agencyCode] || agencyCode || "";
          const markaCode = String(item.marka_code || item.challan_marka_code || "").trim();
          const resolvedMarkaName = item.marka_name || item.challan_marka_name || item.marka || item.marks || markaMap[markaCode] || markaCode || "";
          const areaName = (item.area_name || item.area || item.arrival_area_name || item.arrival_area || overrideArrivalData?.arrival_area_name || overrideArrivalData?.area || "").toUpperCase();
          const nettoVal = Number(item.netto_pnto !== undefined && item.netto_pnto !== null && item.netto_pnto !== "" ? item.netto_pnto : (item.weight_mt || item.quantity_mt || item.challan_gross_wt || item.receipt_gross_wt || item.gross_weight || item.weight || item.net_wt || 0));
          let qtyVal = 0;
          if (item.quantity_rcpt !== undefined && item.quantity_rcpt !== null && item.quantity_rcpt !== "" && Number(item.quantity_rcpt) > 0) {
            qtyVal = Number(item.quantity_rcpt);
          } else if (item.quantity_chln !== undefined && item.quantity_chln !== null && item.quantity_chln !== "" && Number(item.quantity_chln) > 0) {
            qtyVal = Number(item.quantity_chln);
          } else if (item.quantity !== undefined && item.quantity !== null && item.quantity !== "" && Number(item.quantity) > 0) {
            qtyVal = Number(item.quantity);
          } else if (item.bales !== undefined && item.bales !== null && item.bales !== "" && Number(item.bales) > 0) {
            qtyVal = Number(item.bales);
          }
          const itemUnit = (item.unit || item.unit_name || "").toString().trim().toUpperCase();
          const unitVal = (itemUnit && itemUnit !== "BALES") ? itemUnit : (resolvedUnitName || itemUnit || "BALES");
          const rateVal = Number(item.rate_qntl || item.rate || item.po_rate || 0);

          const rowMoistureAct = Number(item.moisture_act ?? item.actual_moisture ?? item.moisture_actual ?? item.act_moisture ?? item.moisture_percent ?? item.moisture ?? (headerForm.actual_moisture || 0));
          const rowMoistureClaim = Number(item.moisture_claim ?? item.claim_moisture ?? item.claim_moist ?? (headerForm.claim_moisture || 0));
          const rowDustAct = Number(item.dust_act ?? item.actual_dust ?? item.dust_actual ?? item.act_dust ?? item.dust_percent ?? item.dust ?? (headerForm.actual_dust || 0));
          const rowDustClaim = Number(item.dust_claim ?? item.claim_dust ?? item.claim_weft_dust ?? (headerForm.claim_dust || 0));
          const rowNcvAct = Number(item.ncv_act ?? item.actual_ncv ?? item.ncv_actual ?? item.act_ncv ?? item.ncv_percent ?? item.ncv ?? (headerForm.actual_ncv || 0));
          const rowNcvClaim = Number(item.ncv_claim ?? item.claim_ncv ?? (headerForm.claim_ncv || 0));

          const row: InspectionDetailRow = {
            srl_no: item.srl_no || (i + 1),
            arrival_grade: resolvedGradeName,
            stock_grade_code: gradeCode,
            stock_grade_name: resolvedGradeName,
            area: areaName,
            agency: resolvedAgencyName,
            agency_code: agencyCode,
            marks: resolvedMarkaName,
            crop_year: item.crop_year || "2026-27",
            lot: item.lot || item.lot_no || item.lot_number || "",
            quantity: qtyVal,
            unit: unitVal,
            rate: rateVal,
            rate_qntl: rateVal,
            challan_gross_wt: nettoVal,
            receipt_gross_wt: nettoVal,
            gross_weight_batch: nettoVal,
            add_weight: Number(item.add_weight || 0),
            less_weight: Number(item.less_weight || 0),
            reduced_weight: Number(item.reduced_weight || nettoVal),
            lorry_read_min: Number(item.lorry_read_min ?? item.lorry_moisture_min ?? 0),
            lorry_read_max: Number(item.lorry_read_max ?? item.lorry_moisture_max ?? 0),
            lorry_read_avg: Number(item.lorry_read_avg ?? item.lorry_moisture_avg ?? 0),
            insp_read_min: Number(item.insp_read_min ?? item.insp_moisture_min ?? 0),
            insp_read_max: Number(item.insp_read_max ?? item.insp_moisture_max ?? 0),
            insp_read_avg: Number(item.insp_read_avg ?? item.insp_moisture_avg ?? rowMoistureAct ?? 0),
            moisture_act: rowMoistureAct,
            moisture_claim: rowMoistureClaim,
            dust_act: rowDustAct,
            dust_claim: rowDustClaim,
            ncv_act: rowNcvAct,
            ncv_claim: rowNcvClaim,
            grade_down_act: Number(item.grade_down_act || item.actual_grade_down || 0),
            grade_down_claim: Number(item.grade_down_claim || item.claim_grade_down || 0),
            final_receipt_wt: Number(item.final_receipt_wt || nettoVal),
            settlement_moisture: Number(item.settlement_moisture !== undefined ? item.settlement_moisture : rowMoistureAct),
            settlement_dust: Number(item.settlement_dust !== undefined ? item.settlement_dust : rowDustAct),
            settlement_ncv: Number(item.settlement_ncv !== undefined ? item.settlement_ncv : rowNcvAct),
            tolerable: "No",
            expanded: false,
            is_auto: true
          };

          const computedWeights = computeDetailRowWeights(row);
          Object.assign(row, computedWeights);
          row.qty_in_mt = calculateQtyInMt(row);
          row.amount = calculateRowAmount(row);

          return row;
        });

        if (details.length > 0) {
          setDetailRows(details);
          showToast(`Loaded ${details.length} PO detail rows.`);
        }
      }
    } catch (e) {
      console.warn("Could not load PO details:", e);
    }
  };

  const populateFromFinalArrival = async (fa: any) => {
    try {
      const arrNo = fa.final_arrival_no || fa.arrival_no || fa.temporary_arrival_no || fa.mr_no || "";
      const isLoose = (fa.unit_name || fa.unit_code || fa.unit || "").toString().trim().toUpperCase().includes("LOOSE");
      const resolvedUnit = isLoose ? "LOOSE" : (fa.unit_name || fa.unit || "BALES");
      const resolvedArea = fa.arrival_area_name || fa.area || fa.arrival_area || "";
      const actMoist = Number(fa.actual_moisture) || 0;
      let clmMoist = Number(fa.claim_moisture) || 0;
      const actDust = Number(fa.actual_dust) || 0;
      const clmDust = Number(fa.claim_dust) || 0;
      const actNcv = Number(fa.actual_ncv) || 0;
      const clmNcv = Number(fa.claim_ncv) || 0;
      const detDays = Number(fa.detention_days) || 0;
      const arrDate = sanitizeDate(fa.date || fa.arrival_date || fa.final_arrival_date || fa.temporary_arrival_date) || new Date().toISOString().split("T")[0];

      if (actMoist > 0 && clmMoist === 0) {
        clmMoist = calculateClaimMoisture(actMoist, arrDate, resolvedArea, moistureLogicRules);
      }

      // 1. Update Header Form with full details from the selected arrival
      setHeaderForm(prev => {
        const next: InspectionMasterRecord = {
          ...prev,
          mr_no: arrNo || prev.mr_no,
          arrival_no: arrNo,
          arrival_date: arrDate,
          po_no: fa.po_no || prev.po_no,
          mr_date: arrDate,
          po_date: sanitizeDate(fa.po_date || fa.date) || prev.po_date,
          supplier_name: fa.supplier || fa.challan_supplier || fa.supplier_name || prev.supplier_name,
          broker_name: fa.broker || fa.broker_name || prev.broker_name,
          lorry_number: fa.lorry_number || fa.lorry_no || prev.lorry_number,
          arrival_area: resolvedArea || prev.arrival_area,
          arrival_area_name: resolvedArea || prev.arrival_area_name,
          unit_name: resolvedUnit,
          unloading_date: sanitizeDate(fa.unloading_date || fa.arrival_date || fa.date) || prev.unloading_date,
          actual_moisture: actMoist,
          claim_moisture: clmMoist,
          actual_dust: actDust,
          claim_dust: clmDust,
          actual_ncv: actNcv,
          claim_ncv: clmNcv,
          detention_days: detDays,
          mr_spcl_print: fa.mr_spcl_print || prev.mr_spcl_print || "",
          remarks: fa.remarks || prev.remarks || "",
          arival_apmc_fees: Number(fa.apmc_fees ?? fa.arival_apmc_fees ?? prev.arival_apmc_fees ?? 0)
        };
        return next;
      });

      // 2. Extract detail items from fa.grid_details
      let rawGridItems: any[] = [];
      if (fa.grid_details) {
        if (Array.isArray(fa.grid_details)) {
          rawGridItems = fa.grid_details;
        } else if (typeof fa.grid_details === 'string') {
          try {
            const parsed = JSON.parse(fa.grid_details);
            if (Array.isArray(parsed)) rawGridItems = parsed;
          } catch (e) {}
        }
      }

      // If grid_details was not embedded, query Supabase for arrival record details
      if (rawGridItems.length === 0 && supabase) {
        try {
          const arrClean = arrNo.trim();
          const [faDbRes, tmrDbRes, fadRes, tmdRes, midRes, millDetailRes] = await Promise.all([
            arrClean ? supabase.from('final_arrival').select('*').or(`final_arrival_no.eq.${arrClean},arrival_no.eq.${arrClean},temporary_arrival_no.eq.${arrClean}`).maybeSingle() : Promise.resolve({ data: null }),
            arrClean ? supabase.from('temporary_material_received').select('*').eq('temporary_arrival_no', arrClean).maybeSingle() : Promise.resolve({ data: null }),
            arrClean ? supabase.from('final_arrival_details').select('*').eq('final_arrival_no', arrClean) : Promise.resolve({ data: null }),
            arrClean ? supabase.from('temporary_material_details').select('*').eq('temporary_arrival_no', arrClean) : Promise.resolve({ data: null }),
            arrClean ? supabase.from('material_inspection_details').select('*').eq('mr_no', arrClean) : Promise.resolve({ data: null }),
            arrClean ? supabase.from('mill_inspection_detail').select('*').eq('mr_no', arrClean) : Promise.resolve({ data: null })
          ]);

          const foundFa = faDbRes.data;
          const foundTmr = tmrDbRes.data;
          const dbApmc = Number(foundTmr?.apmc_fees ?? foundTmr?.arival_apmc_fees ?? foundFa?.apmc_fees ?? foundFa?.arival_apmc_fees ?? 0);
          const dbFaArrDate = sanitizeDate(foundFa?.date || foundFa?.arrival_date || foundFa?.final_arrival_date);
          if (dbApmc > 0 || dbFaArrDate) {
            setHeaderForm(prev => ({
              ...prev,
              ...(dbApmc > 0 ? { arival_apmc_fees: dbApmc } : {}),
              ...(dbFaArrDate ? { mr_date: dbFaArrDate, arrival_date: dbFaArrDate } : {})
            }));
          }

          if (midRes.data && Array.isArray(midRes.data) && midRes.data.length > 0) {
            rawGridItems = midRes.data;
          } else if (millDetailRes.data && Array.isArray(millDetailRes.data) && millDetailRes.data.length > 0) {
            rawGridItems = millDetailRes.data;
          } else if (foundFa?.grid_details) {
            const parsed = typeof foundFa.grid_details === 'string' ? JSON.parse(foundFa.grid_details) : foundFa.grid_details;
            if (Array.isArray(parsed) && parsed.length > 0) rawGridItems = parsed;
          } else if (foundTmr?.grid_details) {
            const parsed = typeof foundTmr.grid_details === 'string' ? JSON.parse(foundTmr.grid_details) : foundTmr.grid_details;
            if (Array.isArray(parsed) && parsed.length > 0) rawGridItems = parsed;
          } else if (fadRes.data && Array.isArray(fadRes.data) && fadRes.data.length > 0) {
            rawGridItems = fadRes.data;
          } else if (tmdRes.data && Array.isArray(tmdRes.data) && tmdRes.data.length > 0) {
            rawGridItems = tmdRes.data;
          }
        } catch (e) {
          console.warn("DB lookup error for arrival details:", e);
        }
      }

      // If we have arrival grid items, map them to InspectionDetailRow
      if (rawGridItems.length > 0) {
        let gradeMap: Record<string, string> = {};
        let agencyMap: Record<string, string> = {};
        let markaMap: Record<string, string> = {};

        if (supabase) {
          const [gradesRes, agenciesRes, markasRes] = await Promise.all([
            supabase.from('grade_master').select('*'),
            supabase.from('agency_master').select('*'),
            supabase.from('marka_master').select('*')
          ]);
          if (gradesRes.data) {
            gradesRes.data.forEach((g: any) => {
              if (g.grade_code && g.grade_name) gradeMap[String(g.grade_code).trim()] = g.grade_name;
            });
          }
          if (agenciesRes.data) {
            agenciesRes.data.forEach((a: any) => {
              if (a.agency_code && a.agency_name) agencyMap[String(a.agency_code).trim()] = a.agency_name;
            });
          }
          if (markasRes.data) {
            markasRes.data.forEach((m: any) => {
              if (m.marka_code && m.marka_name) markaMap[String(m.marka_code).trim()] = m.marka_name;
            });
          }
        }

        const details: InspectionDetailRow[] = rawGridItems.map((item: any, i: number) => {
          const gradeCode = String(item.receipt_grade_code || item.grade_code || item.stock_grade_code || item.item_code || "").trim();
          const resolvedGradeName = item.receipt_grade_name || item.challan_grade_name || item.grade_name || item.variety || item.grade || item.item_name || gradeMap[gradeCode] || gradeCode || "";

          const agencyCode = String(item.agency_code || "").trim();
          const resolvedAgencyName = item.agency_name || item.agency || agencyMap[agencyCode] || agencyCode || "";

          const markaCode = String(item.challan_marka_code || item.marka_code || "").trim();
          const resolvedMarkaName = item.challan_marka_name || item.marka_name || item.marks || item.marka || markaMap[markaCode] || markaCode || "";

          const areaName = (item.area_name || item.area || item.arrival_area_name || item.arrival_area || fa.arrival_area_name || fa.area || resolvedArea || "").toUpperCase();

          const qtyChln = Number(item.quantity_chln || 0);
          const qtyRcpt = Number(item.quantity_rcpt || 0);
          const qtyVal = qtyRcpt > 0 ? qtyRcpt : (qtyChln > 0 ? qtyChln : Number(item.quantity || item.bales || item.total_packets || item.qty || 0));

          const nettoVal = Number(
            item.netto_pnto !== undefined && item.netto_pnto !== null && item.netto_pnto !== ""
              ? item.netto_pnto
              : (item.weight_mt || item.quantity_mt || item.challan_gross_wt || item.receipt_gross_wt || item.gross_weight || item.weight || (item.weight_kgs ? Number(item.weight_kgs) / 1000 : 0))
          );

          const itemUnit = (item.unit || item.unit_name || fa.unit_name || fa.unit || resolvedUnit || "BALES").toString().trim().toUpperCase();
          const rateVal = Number(item.rate_qntl || item.rate || item.po_rate || 0);

          const rowMoistureAct = Number(item.moisture_act !== undefined ? item.moisture_act : (item.actual_moisture !== undefined ? item.actual_moisture : actMoist));
          const rowMoistureClaim = Number(item.moisture_claim !== undefined ? item.moisture_claim : (item.claim_moisture !== undefined ? item.claim_moisture : clmMoist));
          const rowDustAct = Number(item.dust_act !== undefined ? item.dust_act : (item.actual_dust !== undefined ? item.actual_dust : actDust));
          const rowDustClaim = Number(item.dust_claim !== undefined ? item.dust_claim : (item.claim_dust !== undefined ? item.claim_dust : clmDust));
          const rowNcvAct = Number(item.ncv_act !== undefined ? item.ncv_act : (item.actual_ncv !== undefined ? item.actual_ncv : actNcv));
          const rowNcvClaim = Number(item.ncv_claim !== undefined ? item.ncv_claim : (item.claim_ncv !== undefined ? item.claim_ncv : clmNcv));
          const rowGradeDownAct = Number(item.grade_down_act || item.actual_grade_down || 0);
          const rowGradeDownClaim = Number(item.grade_down_claim || item.claim_grade_down || 0);

          const row: InspectionDetailRow = {
            srl_no: item.srl_no || (i + 1),
            arrival_grade: resolvedGradeName,
            stock_grade_code: gradeCode,
            stock_grade_name: resolvedGradeName,
            area: areaName,
            agency: resolvedAgencyName,
            agency_code: agencyCode,
            marks: resolvedMarkaName,
            crop_year: item.crop_year || "2026-27",
            lot: item.lot || item.lot_no || item.lot_number || "",
            quantity: qtyVal,
            unit: itemUnit,
            rate: rateVal,
            rate_qntl: rateVal,
            challan_gross_wt: nettoVal,
            receipt_gross_wt: nettoVal,
            gross_weight_batch: Number(item.gross_weight_batch || nettoVal),
            add_weight: Number(item.add_weight || 0),
            less_weight: Number(item.less_weight || 0),
            reduced_weight: Number(item.reduced_weight || nettoVal),
            lorry_read_min: Number(item.lorry_read_min || item.lorry_moisture_min || 0),
            lorry_read_max: Number(item.lorry_read_max || item.lorry_moisture_max || 0),
            lorry_read_avg: Number(item.lorry_read_avg || item.lorry_moisture_avg || 0),
            insp_read_min: Number(item.insp_read_min || item.insp_moisture_min || 0),
            insp_read_max: Number(item.insp_read_max || item.insp_moisture_max || 0),
            insp_read_avg: Number(item.insp_read_avg || item.insp_moisture_avg || rowMoistureAct || 0),
            moisture_act: rowMoistureAct,
            moisture_claim: rowMoistureClaim,
            dust_act: rowDustAct,
            dust_claim: rowDustClaim,
            ncv_act: rowNcvAct,
            ncv_claim: rowNcvClaim,
            grade_down_act: rowGradeDownAct,
            grade_down_claim: rowGradeDownClaim,
            final_receipt_wt: Number(item.final_receipt_wt || nettoVal),
            settlement_moisture: Number(item.settlement_moisture !== undefined ? item.settlement_moisture : rowMoistureAct),
            settlement_grade_down: Number(item.settlement_grade_down !== undefined ? item.settlement_grade_down : rowGradeDownAct),
            settlement_dust: Number(item.settlement_dust !== undefined ? item.settlement_dust : rowDustAct),
            settlement_ncv: Number(item.settlement_ncv !== undefined ? item.settlement_ncv : rowNcvAct),
            ropes_weight: Number(item.ropes_weight || 0),
            ropes_tot_wt_grd: Number(item.ropes_tot_wt_grd || 0),
            ropes_grade: item.ropes_grade || "",
            chotta_weight: Number(item.chotta_weight || 0),
            chotta_tot_wt_grd: Number(item.chotta_tot_wt_grd || 0),
            chotta_grade: item.chotta_grade || "",
            tolerable: item.tolerable || "No",
            premium: item.premium || "",
            is_premium: Boolean(item.is_premium),
            row_remarks: item.row_remarks || "",
            jci_remarks: item.jci_remarks || item.jqi_remarks || "",
            expanded: false,
            is_auto: true
          };

          const computedWeights = computeDetailRowWeights(row);
          Object.assign(row, computedWeights);
          row.qty_in_mt = calculateQtyInMt(row);
          row.amount = calculateRowAmount(row);

          return row;
        });

        const validDetails = details.filter(r => Boolean(r.arrival_grade || r.stock_grade_name || (Number(r.quantity) > 0) || (Number(r.challan_gross_wt) > 0)));
        if (validDetails.length > 0) {
          setDetailRows(validDetails);
          showToast(`Loaded ${validDetails.length} arrival inspection detail rows.`);
          return;
        }
      }

      // Fallback: If no arrival grid items found, load from PO
      if (fa.po_no) {
        await loadDetailsForPo(fa.po_no, fa);
      }
      showToast(`Selected Final Arrival #${arrNo}`);
    } catch (e) {
      console.error("Error populating from final arrival:", e);
    }
  };

  const handleHeaderChange = (field: keyof InspectionMasterRecord, value: any) => {
    setHeaderForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'mr_date') {
        next.arrival_date = value;
      } else if (field === 'arrival_date') {
        next.mr_date = value;
      }
      if (field === 'actual_moisture' || field === 'arrival_date' || field === 'mr_date' || field === 'arrival_area') {
        const autoClaim = calculateClaimMoisture(
          Number(next.actual_moisture) || 0,
          next.mr_date || next.arrival_date,
          next.arrival_area || next.arrival_area_name || "",
          moistureLogicRules
        );
        next.claim_moisture = autoClaim;
      }
      return next;
    });

    // Dynamically sync moisture/dust/ncv to detail rows if they are empty/default
    if (['actual_moisture', 'claim_moisture', 'actual_dust', 'claim_dust', 'actual_ncv', 'claim_ncv'].includes(field as string)) {
      setDetailRows(prev => prev.map(row => {
        const updated = { ...row };
        const dateForRules = String(headerForm.mr_date || headerForm.arrival_date || new Date().toISOString().split('T')[0]);
        if (field === 'actual_moisture') {
          const num = Number(value) || 0;
          updated.moisture_act = num;
          updated.actual_moisture = num;
          updated.insp_read_avg = num;
          updated.settlement_moisture = num;
          updated.moisture_claim = calculateClaimMoisture(
            num,
            dateForRules,
            updated.area || headerForm.arrival_area || headerForm.arrival_area_name || "",
            moistureLogicRules
          );
          updated.claim_moisture = updated.moisture_claim;
        } else if (field === 'claim_moisture') {
          const num = Number(value) || 0;
          updated.moisture_claim = num;
          updated.claim_moisture = num;
        } else if (field === 'actual_dust') {
          const num = Number(value) || 0;
          updated.dust_act = num;
          updated.actual_dust = num;
          updated.settlement_dust = num;
        } else if (field === 'claim_dust') {
          const num = Number(value) || 0;
          updated.dust_claim = num;
          updated.claim_dust = num;
        } else if (field === 'actual_ncv') {
          const num = Number(value) || 0;
          updated.ncv_act = num;
          updated.actual_ncv = num;
          updated.settlement_ncv = num;
        } else if (field === 'claim_ncv') {
          const num = Number(value) || 0;
          updated.ncv_claim = num;
          updated.claim_ncv = num;
        }
        const computedWeights = computeDetailRowWeights(updated);
        Object.assign(updated, computedWeights);
        updated.qty_in_mt = calculateQtyInMt(updated);
        updated.amount = calculateRowAmount(updated);
        return updated;
      }));
    }

    if (field === 'po_no' && value) {
      loadDetailsForPo(String(value));
    }
  };

  const handleDetailChange = (index: number, field: keyof InspectionDetailRow, value: any) => {
    setDetailRows(prev => {
      const updated = [...prev];
      const row = { ...updated[index], [field]: value };
      
      // 1. Auto-calculate Lorry Read Avg if Min or Max present or modified
      const lorryMin = Number(row.lorry_read_min) || 0;
      const lorryMax = Number(row.lorry_read_max) || 0;
      if (['lorry_read_min', 'lorry_read_max'].includes(field as string)) {
        if (lorryMin > 0 && lorryMax > 0) {
          //row.lorry_read_avg = Number(((lorryMin + lorryMax) / 2).toFixed(2));
        } else if (lorryMin > 0 || lorryMax > 0) {
          //row.lorry_read_avg = lorryMin || lorryMax;
        } else {
          row.lorry_read_avg = 0;
        }
        row.lorry_moisture_min = lorryMin;
        row.lorry_moisture_max = lorryMax;
        row.lorry_moisture_avg = row.lorry_read_avg;
        
      }

      // 2. Auto-calculate Inspection Read Avg if Min or Max present or modified
      /* const inspMin = Number(row.insp_read_min) || 0;
      const inspMax = Number(row.insp_read_max) || 0;
      if (['insp_read_min', 'insp_read_max'].includes(field as string)) {
        if (inspMin > 0 && inspMax > 0) {
          row.insp_read_avg = Number(((inspMin + inspMax) / 2).toFixed(2));
        } else if (inspMin > 0 || inspMax > 0) {
          row.insp_read_avg = inspMin || inspMax;
        } else {
          row.insp_read_avg = 0;
        }
        row.insp_moisture_min = inspMin;
        row.insp_moisture_max = inspMax;
        row.insp_moisture_avg = row.insp_read_avg;
      } */

      // 3. Auto-calculate Moisture Actual % from Lorry and Inspection Readings
      const lAvg = Number(row.lorry_read_avg) || 0;
      const iAvg = Number(row.insp_read_avg) || 0;
      if (['lorry_read_min', 'lorry_read_max', 'lorry_read_avg' ].includes(field as string)) {
        if (lAvg > 0 && iAvg > 0) {
          //row.moisture_act = Number(((lAvg + iAvg) / 2).toFixed(2));
        } else if (lAvg > 0 || iAvg > 0) {
          //row.moisture_act = lAvg || iAvg;
        } else if (Number(headerForm.actual_moisture) > 0) {
          //row.moisture_act = Number(headerForm.actual_moisture);
        }
        row.moisture_act = row.lorry_read_avg;
        row.actual_moisture = row.lorry_read_avg;
        row.settlement_moisture = row.lorry_read_avg;
        setHeaderForm(prev => ({
          ...prev,
          actual_moisture: row.lorry_read_avg || 0
        }));
      } else if (field === 'moisture_act' || field === 'actual_moisture') {
        const valNum = Number(value) || 0;
        row.moisture_act = valNum;
        row.actual_moisture = valNum;
        row.settlement_moisture = valNum;
      }

      // 4. Auto-calculate Moisture Claim % based on Moisture Logic Rules
      const dateForRules = String(headerForm.mr_date || headerForm.arrival_date || new Date().toISOString().split('T')[0]);
      if (field !== 'moisture_claim' && field !== 'claim_moisture') {
        const autoClaim = calculateClaimMoisture(
          Number(row.moisture_act ?? row.actual_moisture ?? 0),
          dateForRules,
          row.area || headerForm.arrival_area || headerForm.arrival_area_name || "",
          moistureLogicRules
        );
        row.moisture_claim = autoClaim;
        row.claim_moisture = autoClaim;
        setHeaderForm(prev => ({
          ...prev,
          claim_moisture: autoClaim || 0
        }));
      } else {
        const valNum = Number(value) || 0;
        row.moisture_claim = valNum;
        row.claim_moisture = valNum;
      }

      

      // 5. Compute Reduced Weight & Final Receipt Weight (Claim)
      const computedWeights = computeDetailRowWeights(row);
      Object.assign(row, computedWeights);

      // 6. Compute Quantity in MT & Row Amount
      row.qty_in_mt = calculateQtyInMt(row);
      row.amount = calculateRowAmount(row);

      updated[index] = row;
      return updated;
    });
  };

  const handleToggleExpand = (index: number) => {
    setDetailRows(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], expanded: !updated[index].expanded };
      return updated;
    });
  };

  const handleDuplicateRow = (index: number) => {
    setDetailRows(prev => {
      const target = prev[index];
      const clone = { ...target, srl_no: prev.length + 1, id: undefined };
      return [...prev, clone];
    });
    showToast("Duplicated row.");
  };

  const handleDeleteRow = (index: number) => {
    if (detailRows.length <= 1) {
      showToast("Cannot delete last detail row.");
      return;
    }
    setDetailRows(prev => prev.filter((_, i) => i !== index));
    showToast("Row deleted.");
  };

  const handleAddRow = () => {
    setDetailRows(prev => [
      ...prev,
      {
        srl_no: prev.length + 1,
        unit: headerForm.unit_name || "BALES",
        quantity: 0,
        challan_gross_wt: 0,
        tolerable: "No",
        expanded: false
      }
    ]);
    showToast("Added new inspection detail row.");
  };

  const handleOpenNewForm = () => {
    setHeaderForm({
      mr_no: "",
      mr_date: new Date().toISOString().split("T")[0],
      arrival_no: "",
      arrival_date: new Date().toISOString().split("T")[0],
      po_no: "",
      po_date: new Date().toISOString().split("T")[0],
      broker_name: "",
      supplier_name: "",
      actual_moisture: 0,
      claim_moisture: 0,
      actual_dust: 0,
      claim_dust: 0,
      actual_ncv: 0,
      claim_ncv: 0,
      detention_days: 0,
      unloading_date: "",
      mill_po_no: "",
      mill_po_date: "",
      mr_spcl_print: "",
      remarks: "",
      lorry_number: "",
      status: "Completed"
    });
    setDetailRows([
      {
        unit: "BALES",
        quantity: 0,
        challan_gross_wt: 0,
        tolerable: "No",
        expanded: false
      }
    ]);
    setDeductionRows([
      { id: "1", deduction_type: "", deduction_rate: 0, deduction_qty: 0, deduction_amount: 0 }
    ]);
    setViewMode("form");
  };

  const handleCreateNewInspection = handleOpenNewForm;

  const handleEditRecord = async (record: InspectionMasterRecord) => {
    const actMoist = Number(record.actual_moisture) || 0;
    const clmMoist = Number(record.claim_moisture) || 0;
    const actDust = Number(record.actual_dust) || 0;
    const clmDust = Number(record.claim_dust) || 0;
    const actNcv = Number(record.actual_ncv) || 0;
    const clmNcv = Number(record.claim_ncv) || 0;

    const recKey = String(record.mr_no || record.arrival_no || "").trim().toUpperCase();
    const matchedFaForEdit = finalArrivalList.find(f => {
      const fk = String(f.final_arrival_no || f.mr_no || f.arrival_no || "").trim().toUpperCase();
      return fk && recKey && fk === recKey;
    });
    const faArrDate = sanitizeDate(matchedFaForEdit?.date || matchedFaForEdit?.arrival_date || matchedFaForEdit?.final_arrival_date);
    const recArrDate = sanitizeDate(record.mr_date || record.arrival_date || record.date || record.temporary_arrival_date);
    const resolvedEditArrDate = (faArrDate && (!recArrDate || recArrDate === sanitizeDate(matchedFaForEdit?.temporary_arrival_date)))
      ? faArrDate
      : (recArrDate || faArrDate);

    setHeaderForm({
      ...record,
      mr_date: resolvedEditArrDate,
      arrival_date: resolvedEditArrDate,
      po_date: sanitizeDate(record.po_date),
      actual_moisture: actMoist,
      claim_moisture: clmMoist,
      actual_dust: actDust,
      claim_dust: clmDust,
      actual_ncv: actNcv,
      claim_ncv: clmNcv
    });

    try {
      if (supabase && record.mr_no) {
        const [midRes, millDetailRes, inspDetailRes] = await Promise.all([
          supabase.from("material_inspection_details").select("*").eq("mr_no", record.mr_no).order("srl_no", { ascending: true }),
          supabase.from("mill_inspection_detail").select("*").eq("mr_no", record.mr_no).order("srl_no", { ascending: true }),
          supabase.from("inspection_details").select("*").eq("mr_no", record.mr_no).order("srl_no", { ascending: true })
        ]);

        let rawDetails = (midRes.data && midRes.data.length > 0)
          ? midRes.data
          : ((millDetailRes.data && millDetailRes.data.length > 0)
              ? millDetailRes.data
              : (inspDetailRes.data || []));

        if (rawDetails.length === 0 && record.grid_details) {
          try {
            const parsed = typeof record.grid_details === 'string' ? JSON.parse(record.grid_details) : record.grid_details;
            if (Array.isArray(parsed) && parsed.length > 0) {
              rawDetails = parsed;
            }
          } catch (e) {}
        }

        if (rawDetails.length > 0) {
          const mappedRows: InspectionDetailRow[] = rawDetails.map((d: any, idx: number) => {
            const rowMoistureAct = Number(d.moisture_act ?? d.actual_moisture ?? d.moisture_actual ?? d.act_moisture ?? d.moisture_percent ?? d.moisture ?? (actMoist > 0 ? actMoist : 0));
            const rowMoistureClaim = Number(d.moisture_claim ?? d.claim_moisture ?? d.claim_moist ?? (clmMoist > 0 ? clmMoist : 0));
            const rowDustAct = Number(d.dust_act ?? d.actual_dust ?? d.dust_actual ?? d.act_dust ?? d.dust_percent ?? d.dust ?? (actDust > 0 ? actDust : 0));
            const rowDustClaim = Number(d.dust_claim ?? d.claim_dust ?? d.claim_weft_dust ?? (clmDust > 0 ? clmDust : 0));
            const rowNcvAct = Number(d.ncv_act ?? d.actual_ncv ?? d.ncv_actual ?? d.act_ncv ?? d.ncv_percent ?? d.ncv ?? (actNcv > 0 ? actNcv : 0));
            const rowNcvClaim = Number(d.ncv_claim ?? d.claim_ncv ?? (clmNcv > 0 ? clmNcv : 0));
            const rowGradeDownAct = Number(d.grade_down_act || d.actual_grade_down || 0);
            const rowGradeDownClaim = Number(d.grade_down_claim || d.claim_grade_down || 0);

            const netto = Number(d.receipt_gross_wt || d.challan_gross_wt || d.weight_mt || d.weight || 0);
            const row: InspectionDetailRow = {
              srl_no: d.srl_no || (idx + 1),
              arrival_grade: d.arrival_grade || d.grade_name || d.stock_grade_name || "",
              stock_grade_code: d.stock_grade_code || d.grade_code || "",
              stock_grade_name: d.stock_grade_name || d.arrival_grade || d.grade_name || "",
              area: d.area || record.arrival_area || "",
              agency: d.agency || "",
              agency_code: d.agency_code || "",
              marks: d.marks || d.marka || "",
              crop_year: d.crop_year || "2026-27",
              lot: d.lot || d.lot_no || "",
              quantity: Number(d.quantity || d.bales || d.packets || 0),
              unit: d.unit || record.unit_name || "BALES",
              rate: Number(d.rate || d.rate_qntl || 0),
              rate_qntl: Number(d.rate_qntl || d.rate || 0),
              challan_gross_wt: Number(d.challan_gross_wt || netto),
              receipt_gross_wt: netto,
              gross_weight_batch: Number(d.gross_weight_batch || netto),
              add_weight: Number(d.add_weight || 0),
              less_weight: Number(d.less_weight || 0),
              reduced_weight: Number(d.reduced_weight || netto),
              lorry_read_min: Number(d.lorry_read_min ?? d.lorry_moisture_min ?? d.lorry_min ?? d.lorry_read_1 ?? 0),
              lorry_read_max: Number(d.lorry_read_max ?? d.lorry_moisture_max ?? d.lorry_max ?? d.lorry_read_2 ?? 0),
              lorry_read_avg: Number(d.lorry_read_avg ?? d.lorry_moisture_avg ?? d.lorry_avg ?? 0),
              lorry_moisture_min: Number(d.lorry_moisture_min ?? d.lorry_read_min ?? 0),
              lorry_moisture_max: Number(d.lorry_moisture_max ?? d.lorry_read_max ?? 0),
              lorry_moisture_avg: Number(d.lorry_moisture_avg ?? d.lorry_read_avg ?? 0),
              insp_read_min: Number(d.insp_read_min ?? d.insp_moisture_min ?? d.insp_min ?? d.insp_read_1 ?? 0),
              insp_read_max: Number(d.insp_read_max ?? d.insp_moisture_max ?? d.insp_max ?? d.insp_read_2 ?? 0),
              insp_read_avg: Number(d.insp_read_avg ?? d.insp_moisture_avg ?? d.insp_avg ?? rowMoistureAct ?? 0),
              insp_moisture_min: Number(d.insp_moisture_min ?? d.insp_read_min ?? 0),
              insp_moisture_max: Number(d.insp_moisture_max ?? d.insp_read_max ?? 0),
              insp_moisture_avg: Number(d.insp_moisture_avg ?? d.insp_read_avg ?? rowMoistureAct ?? 0),
              moisture_act: rowMoistureAct,
              actual_moisture: rowMoistureAct,
              moisture_claim: rowMoistureClaim,
              claim_moisture: rowMoistureClaim,
              dust_act: rowDustAct,
              actual_dust: rowDustAct,
              dust_claim: rowDustClaim,
              claim_dust: rowDustClaim,
              ncv_act: rowNcvAct,
              actual_ncv: rowNcvAct,
              ncv_claim: rowNcvClaim,
              claim_ncv: rowNcvClaim,
              grade_down_act: rowGradeDownAct,
              actual_grade_down: rowGradeDownAct,
              grade_down_claim: rowGradeDownClaim,
              claim_grade_down: rowGradeDownClaim,
              final_receipt_wt: Number(d.final_receipt_wt || netto),
              settlement_moisture: Number(d.settlement_moisture !== undefined ? d.settlement_moisture : rowMoistureAct),
              settlement_grade_down: Number(d.settlement_grade_down !== undefined ? d.settlement_grade_down : rowGradeDownAct),
              settlement_dust: Number(d.settlement_dust !== undefined ? d.settlement_dust : rowDustAct),
              settlement_ncv: Number(d.settlement_ncv !== undefined ? d.settlement_ncv : rowNcvAct),
              ropes_weight: Number(d.ropes_weight || 0),
              ropes_tot_wt_grd: Number(d.ropes_tot_wt_grd || 0),
              ropes_grade: d.ropes_grade || "",
              chotta_weight: Number(d.chotta_weight || 0),
              chotta_tot_wt_grd: Number(d.chotta_tot_wt_grd || 0),
              chotta_grade: d.chotta_grade || "",
              tolerable: d.tolerable || "No",
              premium: d.premium || "",
              is_premium: Boolean(d.is_premium),
              row_remarks: d.row_remarks || "",
              jci_remarks: d.jci_remarks || d.jqi_remarks || "",
              expanded: false
            };
            const computedWeights = computeDetailRowWeights(row);
            Object.assign(row, computedWeights);
            row.qty_in_mt = calculateQtyInMt(row);
            row.amount = calculateRowAmount(row);
            return row;
          });
          setDetailRows(mappedRows);
        }

        const [dedPrimaryRes, dedFallbackRes] = await Promise.all([
          supabase.from("material_inspection_deductions").select("*").eq("mr_no", record.mr_no),
          supabase.from("mill_inspection_deduction").select("*").eq("mr_no", record.mr_no)
        ]);

        const foundDed = (dedPrimaryRes.data && dedPrimaryRes.data.length > 0)
          ? dedPrimaryRes.data
          : (dedFallbackRes.data || []);

        if (foundDed && foundDed.length > 0) {
          setDeductionRows(foundDed.map((d: any, idx: number) => ({
            id: String(d.id || idx),
            deduction_type: d.deduction_type || "",
            deduction_rate: Number(d.deduction_rate) || 0,
            deduction_qty: Number(d.deduction_qty) || 0,
            deduction_amount: Number(d.deduction_amount) || 0,
            remarks: d.remarks || ""
          })));
        } else if (record.deductions && record.deductions.length > 0) {
          setDeductionRows(record.deductions);
        }
      }
    } catch (e) {
      console.warn("Failed to load details for edit:", e);
    }

    setViewMode("form");
  };

  const handlePrintRecord = async (record: InspectionMasterRecord) => {
    setPrintingRecord(record);
    try {
      if (supabase && record.mr_no) {
        const [midRes, millDetailRes] = await Promise.all([
          supabase.from("material_inspection_details").select("*").eq("mr_no", record.mr_no).order("srl_no", { ascending: true }),
          supabase.from("mill_inspection_detail").select("*").eq("mr_no", record.mr_no).order("srl_no", { ascending: true })
        ]);
        const data = (midRes.data && midRes.data.length > 0) ? midRes.data : (millDetailRes.data || []);
        setPrintingDetails(data && data.length > 0 ? data : detailRows);
      } else {
        setPrintingDetails(detailRows);
      }
    } catch (e) {
      setPrintingDetails(detailRows);
    }
  };

  const handleSaveForm = async () => {
    if (!headerForm.mr_no) {
      alert("Inspection MR No is required.");
      return;
    }
    if (headerForm.mr_date === '' || headerForm.mr_date === null) {
      alert("Arrival date is required.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await saveInspectionRecordToDb(headerForm, detailRows, deductionRows);
      if (res.returnCheck?.isReturnLorry && res.returnCheck?.newPoNo) {
        alert(
          `Data Saved Successfully.\n\n[RETURN LORRY DETECTED: ${res.returnCheck.weightMt.toFixed(3)} MT (< 5 MT)]\nReference P.O.: ${res.returnCheck.referencePoNo}\nNew Return Lorry P.O. (4000 Series): ${res.returnCheck.newPoNo}`
        );
        showToast(`Return Lorry P.O. ${res.returnCheck.newPoNo} auto-generated (Wt: ${res.returnCheck.weightMt.toFixed(3)} MT < 5 MT)`);
      } else {
        alert("Data Saved Successfully.");
        showToast("Data Saved Successfully.");
      }
      handleCreateNewInspection();
      setViewMode("dashboard");
      fetchInspectionRecords(true);
    } catch (err: any) {
      alert("Save failed: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRecord = async (mr_no: string) => {
    const cleanMr = String(mr_no || "").trim();
    if (!cleanMr) return;
    if (!confirm(`Are you sure you want to delete inspection record ${cleanMr}?`)) return;
    try {
      const ok = await deleteInspectionRecordFromDb(cleanMr);
      if (ok) {
        setRecords(prev => prev.filter(r => r.mr_no !== cleanMr));
        showToast(`Record ${cleanMr} deleted.`);
      }
    } catch (err: any) {
      alert("Delete failed: " + err.message);
    }
  };

  const handleExportCsv = () => {
    if (records.length === 0) return alert("No records to export");
    const headers = ["MR No", "MR Date", "PO No", "Supplier", "Broker", "Lorry No", "Moisture %", "Dust %", "Deductions", "Status"];
    const rows = filteredRecords.map(r => [
      r.mr_no,
      r.mr_date || "",
      r.po_no || "",
      `"${r.supplier_name || ""}"`,
      `"${r.broker_name || ""}"`,
      r.lorry_number || "",
      r.actual_moisture || 0,
      r.actual_dust || 0,
      r.deduction_amount || 0,
      r.status || "Completed"
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Mill_Inspection_Register_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredRecords = records.filter(r => {
    const query = searchQuery.toLowerCase();
    const matchesQuery =
      (r.mr_no || "").toLowerCase().includes(query) ||
      (r.arrival_no || "").toLowerCase().includes(query) ||
      (r.po_no || "").toLowerCase().includes(query) ||
      (r.supplier_name || "").toLowerCase().includes(query) ||
      (r.broker_name || "").toLowerCase().includes(query) ||
      (r.lorry_number || "").toLowerCase().includes(query);

    const matchesStatus =
      statusFilter === "all" ||
      (r.status || "Completed").toLowerCase() === statusFilter.toLowerCase();

    // Date Range Filter (Arrival Date / MR Date / Inspection Date)
    if (startDate || endDate) {
      const rowDateRaw = r.arrival_date || r.mr_date || (r as any).inspection_date || (r as any).created_at;
      const sanitized = sanitizeDate(rowDateRaw);
      if (!sanitized) return false;
      if (startDate && sanitized < startDate) return false;
      if (endDate && sanitized > endDate) return false;
    }

    if (selectedMonthFilter) {
      const rowDate = r.arrival_date || r.mr_date || (r as any).inspection_date || (r as any).created_at;
      const parsed = parseMonthKey(rowDate);
      if (!parsed || parsed.key !== selectedMonthFilter) return false;
    }

    return matchesQuery && matchesStatus;
  }).sort((a, b) => {
    if (sortField === "arrival_date") {
      const dateA = new Date(a.arrival_date || a.mr_date || 0).getTime();
      const dateB = new Date(b.arrival_date || b.mr_date || 0).getTime();
      if (dateA !== dateB) {
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
      }
    } else if (sortField === "arrival_no") {
      const arrNoA = (a.arrival_no || a.mr_no || '').toUpperCase();
      const arrNoB = (b.arrival_no || b.mr_no || '').toUpperCase();
      const diff = arrNoA.localeCompare(arrNoB, undefined, { numeric: true, sensitivity: 'base' });
      if (diff !== 0) {
        return sortOrder === "asc" ? diff : -diff;
      }
    } else if (sortField === "status") {
      const statusA = (a.status || 'Completed').toUpperCase();
      const statusB = (b.status || 'Completed').toUpperCase();
      const diff = statusA.localeCompare(statusB);
      if (diff !== 0) {
        return sortOrder === "asc" ? diff : -diff;
      }
    }

    const defaultTimeA = new Date(a.arrival_date || a.mr_date || 0).getTime();
    const defaultTimeB = new Date(b.arrival_date || b.mr_date || 0).getTime();
    return defaultTimeB - defaultTimeA;
  });

  const isDateOrQueryActive = Boolean(startDate || endDate || selectedMonthFilter || searchQuery.trim() !== "" || statusFilter !== "all");
  const activeDataset = isDateOrQueryActive ? filteredRecords : records;
  const totalInspections = isDateOrQueryActive ? filteredRecords.length : records.length;
  const avgMoisture = activeDataset.length > 0 ? (activeDataset.reduce((acc, r) => acc + (Number(r.actual_moisture) || 0), 0) / activeDataset.length).toFixed(1) : "0.0";
  const totalDeductions = activeDataset.reduce((acc, r) => acc + (Number(r.deduction_amount) || 0), 0);

  const pendingArrivalList = useMemo(() => {
    return finalArrivalList.filter(fa => {
      const normalize = (s: any) => String(s || "").trim().toLowerCase().replace(/^#/, '');

      const faNo = normalize(fa.final_arrival_no || fa.arrival_no);
      const faMrNo = normalize(fa.mr_no);
      const faId = normalize(fa.final_arrival_id);
      const faTempNo = normalize(fa.temporary_arrival_no);
      const faLorry = String(fa.lorry_number || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");

      const isAlreadyInspected = records.some(r => {
        const rMr = normalize(r.mr_no);
        const rArr = normalize(r.arrival_no);
        const rTemp = normalize((r as any).temporary_arrival_no);
        const rLorry = String(r.lorry_number || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");

        if (faNo && (rMr === faNo || rArr === faNo)) return true;
        if (faMrNo && (rMr === faMrNo || rArr === faMrNo)) return true;
        if (faId && (rMr === faId || rArr === faId || rMr === `fa-${faId}` || rArr === `fa-${faId}`)) return true;
        if (faTempNo && (rTemp === faTempNo || rMr === faTempNo || rArr === faTempNo)) return true;

        if (faLorry && rLorry && faLorry === rLorry) {
          if (faNo && (rMr.includes(faNo) || rArr.includes(faNo))) return true;
          if (faMrNo && (rMr.includes(faMrNo) || rArr.includes(faMrNo))) return true;
        }

        return false;
      });

      return !isAlreadyInspected;
    });
  }, [finalArrivalList, records]);

  return {
    records,
    filteredRecords,
    loading,
    searchQuery,
    setSearchQuery,
    selectedMonthFilter,
    setSelectedMonthFilter,
    statusFilter,
    setStatusFilter,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    datePreset,
    setDatePreset,
    handleDatePresetChange,
    clearDateFilter,
    viewMode,
    setViewMode,
    toastMessage,
    isSaving,
    sortField,
    sortOrder,
    setSortField,
    setSortOrder,
    copyType,
    setCopyType,
    printingRecord,
    setPrintingRecord,
    printingDetails,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    headerForm,
    detailRows,
    deductionRows,
    deductionMasterList,
    totalInspections,
    avgMoisture,
    totalDeductions,
    pendingArrivalList,
    fetchInspectionRecords,
    handleHeaderChange,
    handleDetailChange,
    handleToggleExpand,
    handleDuplicateRow,
    handleDeleteRow,
    handleAddRow,
    handleOpenNewForm,
    handleEditRecord,
    handlePrintRecord,
    handleSaveForm,
    handleDeleteRecord,
    handleExportCsv,
    populateFromFinalArrival,
    handleAddDeductionRow,
    handleRemoveDeductionRow,
    handleDeductionChange,
    handleDeductionTypeChange,
    handleCreateNewInspection
  };
}
