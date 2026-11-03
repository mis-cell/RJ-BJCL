import { WeighmentRecordModal } from "../components/weightbridge/WeighmentRecordModal";
import React, { useState, useEffect, useMemo } from "react";
import {
  Scale,
  Truck,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  RefreshCw,
  Eye,
  Calendar,
  Building,
  MapPin,
  Layers,
  ArrowRight,
  ShieldAlert,
  UserCheck,
  X,
  FileText
} from "lucide-react";
import LegacyLayout, {
  LegacyFieldset,
  LegacyButton
} from "../components/LegacyLayout";
import { supabase } from "../lib/supabase";
import { dbModule } from "../services/dbModule";
import { cn } from "../lib/utils";
import { getCurrentUserContext, isUserAdmin } from "../lib/permissions";

interface WeightBridgeProps {
  currentUser?: any;
  allowedModules?: string[];
  onNavigate?: (page: string) => void;
}

interface LorryWeighment {
  id: string;
  ticket_number: string;
  date: string;
  lorry_number: string;
  party_name: string;
  stage1_gross_weight: number | null;
  stage1_tare_weight: number | null;
  stage1_net_weight: number | null;
  grade: string | null;
  grade_details: Array<{ grade_name: string; quantity: number }> | null;
  unit: string | null;
  mokam: string | null;
  marka: string | null;
  stage1_completed: boolean;
  stage1_date: string | null;

  stage2_gross_weight: number | null;
  stage2_tare_weight: number | null;
  stage2_net_weight: number | null;
  stage2_completed: boolean;
  stage2_date: string | null;

  stage3_gross_weight: number | null;
  stage3_tare_weight: number | null;
  stage3_net_weight: number | null;
  stage3_completed: boolean;
  stage3_date: string | null;

  final_weight: number | null;
  final_weight_date: string | null;
  status: string; // 'IN' | 'OUT'
  created_at: string;
}

export default function WeightBridge({ allowedModules = [], onNavigate }: WeightBridgeProps) {
  const userCtx = getCurrentUserContext();
  const isAdmin = isUserAdmin();

  // Permission helpers
  const userModules = useMemo(() => {
    if (isAdmin || allowedModules.includes("*")) return ["*"];
    return allowedModules;
  }, [isAdmin, allowedModules]);

  const hasModuleAccess = isAdmin || userModules.includes("*") || userModules.includes("weight_bridge");
  const canViewDashboard = hasModuleAccess || userModules.includes("wb_view_dashboard");
  const canCreateStage1 = hasModuleAccess || userModules.includes("wb_stage1_create");
  const canCompleteStage2 = hasModuleAccess || userModules.includes("wb_stage2_create");
  const canCompleteStage3 = hasModuleAccess || userModules.includes("wb_stage3_create");
  const canViewFinal = hasModuleAccess || userModules.includes("wb_view_final");

  // View state: 'stage1' | 'stage2' | 'stage3' | 'dashboards'
  const [activeTab, setActiveTab] = useState<"stage1" | "stage2" | "stage3" | "dashboards">("stage1");
  const [dashboardSubTab, setDashboardSubTab] = useState<"stage1" | "stage2" | "stage3" | "final">("stage1");

  // Master Data
  const [records, setRecords] = useState<LorryWeighment[]>([]);
  const [loading, setLoading] = useState(true);
  const [brokerList, setBrokerList] = useState<string[]>([]);
  const [gradeList, setGradeList] = useState<string[]>([]);
  const [unitList, setUnitList] = useState<string[]>([]);
  const [agencyList, setAgencyList] = useState<string[]>([]);
  const [markaList, setMarkaList] = useState<string[]>([]);

  // Search & Filters for Dashboards
  const [searchTerm, setSearchTerm] = useState("");
  const [filterParty, setFilterParty] = useState("");
  const [filterMokam, setFilterMokam] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // Modal Detail View
  const [selectedModalRecord, setSelectedModalRecord] = useState<LorryWeighment | null>(null);

  // ---------------------------------------------------------------------------
  // Stage 1 State Form
  // ---------------------------------------------------------------------------
  const [s1Date, setS1Date] = useState<string>(new Date().toISOString().split("T")[0]);
  const [s1TicketNo, setS1TicketNo] = useState<string>("");
  const [s1LorryNo, setS1LorryNo] = useState<string>("");
  const [s1PartyName, setS1PartyName] = useState<string>("");
  const [s1GrossWeight, setS1GrossWeight] = useState<string>("");
  const [s1TareWeight, setS1TareWeight] = useState<string>("");
  const [s1Unit, setS1Unit] = useState<string>("");
  const [s1Mokam, setS1Mokam] = useState<string>("");
  const [s1Marka, setS1Marka] = useState<string>("");
  const [s1Grades, setS1Grades] = useState<Array<{ grade_name: string; quantity: number }>>([]);
  const [selectedGradeInput, setSelectedGradeInput] = useState<string>("");
  const [selectedGradeQty, setSelectedGradeQty] = useState<string>("");
  const [s1Error, setS1Error] = useState<string>("");
  const [s1Success, setS1Success] = useState<string>("");
  const [s1Saving, setS1Saving] = useState(false);

  // ---------------------------------------------------------------------------
  // Stage 2 State Form
  // ---------------------------------------------------------------------------
  const [s2SelectedId, setS2SelectedId] = useState<string>("");
  const [s2GrossWeight, setS2GrossWeight] = useState<string>("");
  const [s2TareWeight, setS2TareWeight] = useState<string>("");
  const [s2Error, setS2Error] = useState<string>("");
  const [s2Success, setS2Success] = useState<string>("");
  const [s2Saving, setS2Saving] = useState(false);

  // ---------------------------------------------------------------------------
  // Stage 3 State Form
  // ---------------------------------------------------------------------------
  const [s3SelectedId, setS3SelectedId] = useState<string>("");
  const [s3GrossWeight, setS3GrossWeight] = useState<string>("");
  const [s3TareWeight, setS3TareWeight] = useState<string>("");
  const [s3Error, setS3Error] = useState<string>("");
  const [s3Success, setS3Success] = useState<string>("");
  const [s3Saving, setS3Saving] = useState(false);

  // Load Initial Data (DDL managed via migrations/20261017_safe_repairs.sql)
  const loadData = async () => {
    setLoading(true);
    try {

      // Fetch Master Data
      let uData: any[] = [];
      let bData: any[] = [];
      let gData: any[] = [];
      let aData: any[] = [];
      let mData: any[] = [];
      let wData: any[] = [];

      try {
        if (supabase) {
          const uRes = await supabase.from("unit_master").select("unit_name").order("unit_name");
          uData = uRes.data || [];
          const bRes = await supabase.from("broker_master").select("*");
          bData = bRes.data || [];
          const gRes = await supabase.from("grade_master").select("*");
          gData = gRes.data || [];
          const aRes = await supabase.from("agency_master").select("*");
          aData = aRes.data || [];
          const mRes = await supabase.from("marka_master").select("*");
          mData = mRes.data || [];
          const wRes = await supabase.from("lorry_weighments").select("*").order("created_at", { ascending: false });
          wData = wRes.data || [];
        }
      } catch {
        const res = await Promise.all([
          dbModule.fetchAll("broker_master").catch(() => []),
          dbModule.fetchAll("grade_master").catch(() => []),
          dbModule.fetchAll("unit_master").catch(() => []),
          dbModule.fetchAll("agency_master").catch(() => []),
          dbModule.fetchAll("marka_master").catch(() => []),
          dbModule.fetchAll("lorry_weighments", "created_at", false).catch(() => [])
        ]);
        bData = res[0];
        gData = res[1];
        uData = res[2];
        aData = res[3];
        mData = res[4];
        wData = res[5];
      }

      const brokers = (bData || []).map((x: any) => x.brok_name || x.broker_name || x.name).filter(Boolean);
      const grades = (gData || []).map((x: any) => x.grade_name || x.grade_code || x.name).filter(Boolean);
      const units = (uData || []).map((x: any) => x.unit_name || x.name).filter(Boolean);
      const agencies = (aData || []).map((x: any) => x.agency_name || x.name).filter(Boolean);
      const markas = (mData || []).map((x: any) => x.marka_name || x.marka_code || x.name).filter(Boolean);

      setBrokerList(Array.from(new Set([...brokers, "Broker A", "Broker B"])));
      setGradeList(Array.from(new Set([...grades, "B, B-1", "C, C-1", "TELESCOPE", "HABIJABI"])));
      setUnitList(Array.from(new Set([...units, "BALES", "DRUMS", "LOOSE", "P.BALES", "H.BALES"])));
      setAgencyList(Array.from(new Set([...agencies, "Mokam 1", "Mokam 2"])));
      setMarkaList(Array.from(new Set([...markas, "Marka 1", "Marka 2"])));

      const mappedRecords: LorryWeighment[] = (wData || []).map((r: any) => ({
        id: r.id || String(Math.random()),
        ticket_number: r.ticketnumber || r.ticketNumber || r.ticket_number || r.ticket_no || "",
        date: r.date || new Date().toISOString().split("T")[0],
        lorry_number: r.lorrynumber || r.lorryNumber || r.lorry_number || r.lorry_no || "",
        party_name: r.partyname || r.partyName || r.party_name || "",
        stage1_gross_weight: r.stage1grossweight !== undefined ? r.stage1grossweight : (r.stage1GrossWeight !== undefined ? r.stage1GrossWeight : (r.stage1_gross_weight !== undefined ? r.stage1_gross_weight : null)),
        stage1_tare_weight: r.stage1tareweight !== undefined ? r.stage1tareweight : (r.stage1TareWeight !== undefined ? r.stage1TareWeight : (r.stage1_tare_weight !== undefined ? r.stage1_tare_weight : null)),
        stage1_net_weight: r.stage1netweight !== undefined ? r.stage1netweight : (r.stage1NetWeight !== undefined ? r.stage1NetWeight : (r.stage1_net_weight !== undefined ? r.stage1_net_weight : null)),
        grade: r.grade || "",
        grade_details: r.gradeDetails || r.grade_details || null,
        unit: r.unit || null,
        mokam: r.mokam || null,
        marka: r.marka || null,
        stage1_completed: r.stage1completed !== undefined ? Boolean(r.stage1completed) : (r.stage1Completed !== undefined ? Boolean(r.stage1Completed) : (r.stage1_completed !== undefined ? Boolean(r.stage1_completed) : true)),
        stage1_date: r.stage1_date || (r.stage1timestamp ? new Date(r.stage1timestamp).toISOString() : (r.stage1Timestamp ? new Date(r.stage1Timestamp).toISOString() : null)),

        stage2_gross_weight: r.stage2grossweight !== undefined ? r.stage2grossweight : (r.stage2GrossWeight !== undefined ? r.stage2GrossWeight : (r.stage2_gross_weight !== undefined ? r.stage2_gross_weight : null)),
        stage2_tare_weight: r.stage2tareweight !== undefined ? r.stage2tareweight : (r.stage2TareWeight !== undefined ? r.stage2TareWeight : (r.stage2_tare_weight !== undefined ? r.stage2_tare_weight : null)),
        stage2_net_weight: r.stage2netweight !== undefined ? r.stage2netweight : (r.stage2NetWeight !== undefined ? r.stage2NetWeight : (r.stage2_net_weight !== undefined ? r.stage2_net_weight : null)),
        stage2_completed: r.stage2completed !== undefined ? Boolean(r.stage2completed) : (r.stage2Completed !== undefined ? Boolean(r.stage2Completed) : (r.stage2_completed !== undefined ? Boolean(r.stage2_completed) : false)),
        stage2_date: r.stage2_date || (r.stage2timestamp ? new Date(r.stage2timestamp).toISOString() : (r.stage2Timestamp ? new Date(r.stage2Timestamp).toISOString() : null)),

        stage3_gross_weight: r.stage3grossweight !== undefined ? r.stage3grossweight : (r.stage3GrossWeight !== undefined ? r.stage3GrossWeight : (r.stage3_gross_weight !== undefined ? r.stage3_gross_weight : null)),
        stage3_tare_weight: r.stage3tareweight !== undefined ? r.stage3tareweight : (r.stage3TareWeight !== undefined ? r.stage3TareWeight : (r.stage3_tare_weight !== undefined ? r.stage3_tare_weight : null)),
        stage3_net_weight: r.stage3netweight !== undefined ? r.stage3netweight : (r.stage3NetWeight !== undefined ? r.stage3NetWeight : (r.stage3_net_weight !== undefined ? r.stage3_net_weight : null)),
        stage3_completed: r.stage3completed !== undefined ? Boolean(r.stage3completed) : (r.stage3Completed !== undefined ? Boolean(r.stage3Completed) : (r.stage3_completed !== undefined ? Boolean(r.stage3_completed) : false)),
        stage3_date: r.stage3_date || (r.stage3timestamp ? new Date(r.stage3timestamp).toISOString() : (r.stage3Timestamp ? new Date(r.stage3Timestamp).toISOString() : null)),

        final_weight: r.finalweight !== undefined ? r.finalweight : (r.finalWeight !== undefined ? r.finalWeight : (r.final_weight !== undefined ? r.final_weight : null)),
        final_weight_date: r.finalweightdate || r.finalWeightDate || r.final_weight_date || null,
        status: r.status || (r.isout || r.isOut ? "OUT" : "IN"),
        created_at: r.createdat ? (typeof r.createdat === 'number' ? new Date(r.createdat).toISOString() : String(r.createdat)) : (r.created_at || (r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString()))
      }));

      setRecords(mappedRecords);

      // Generate Ticket Number for Stage 1 if empty
      if (!s1TicketNo) {
        generateTicketNumber(mappedRecords);
      }
    } catch (err) {
      console.error("Error loading Weight Bridge data:", err);
    } finally {
      setLoading(false);
    }
  };

  const generateTicketNumber = (existingRecords: LorryWeighment[]) => {
    const year = new Date().getFullYear();
    const count = (existingRecords || []).length + 1;
    const ticket = `WB-${year}-${String(count).padStart(5, "0")}`;
    setS1TicketNo(ticket);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Net Weight Calculations
  const s1NetWeight = useMemo(() => {
    const gross = parseFloat(s1GrossWeight);
    const tare = parseFloat(s1TareWeight);
    if (!isNaN(gross) && !isNaN(tare)) {
      return Math.max(0, gross - tare);
    }
    return 0;
  }, [s1GrossWeight, s1TareWeight]);

  const s2NetWeight = useMemo(() => {
    const gross = parseFloat(s2GrossWeight);
    const tare = parseFloat(s2TareWeight);
    if (!isNaN(gross) && !isNaN(tare)) {
      return Math.max(0, gross - tare);
    }
    return 0;
  }, [s2GrossWeight, s2TareWeight]);

  const s3NetWeight = useMemo(() => {
    const gross = parseFloat(s3GrossWeight);
    const tare = parseFloat(s3TareWeight);
    if (!isNaN(gross) && !isNaN(tare)) {
      return Math.max(0, gross - tare);
    }
    return 0;
  }, [s3GrossWeight, s3TareWeight]);

  // Record for Stage 2 Dropdown (Stage 1 completed, Stage 2 pending)
  const pendingStage2Lorries = useMemo(() => {
    return records.filter((r) => r.stage1_completed && !r.stage2_completed && r.status !== "OUT");
  }, [records]);

  // Selected Stage 2 Lorry Object
  const selectedS2Record = useMemo(() => {
    return records.find((r) => r.id === s2SelectedId) || null;
  }, [records, s2SelectedId]);

  // Record for Stage 3 Dropdown (Stage 2 completed, Stage 3 pending)
  const pendingStage3Lorries = useMemo(() => {
    return records.filter((r) => r.stage2_completed && !r.stage3_completed && r.status !== "OUT");
  }, [records]);

  // Selected Stage 3 Lorry Object
  const selectedS3Record = useMemo(() => {
    return records.find((r) => r.id === s3SelectedId) || null;
  }, [records, s3SelectedId]);

  // Add Grade to Stage 1 Form
  const handleAddGrade = () => {
    if (!selectedGradeInput) return;
    const qty = parseFloat(selectedGradeQty) || 0;
    if (s1Grades.some((g) => g.grade_name === selectedGradeInput)) {
      alert("Grade already added to list.");
      return;
    }
    setS1Grades((prev) => [...prev, { grade_name: selectedGradeInput, quantity: qty }]);
    setSelectedGradeInput("");
    setSelectedGradeQty("");
  };

  const handleRemoveGrade = (gradeName: string) => {
    setS1Grades((prev) => prev.filter((g) => g.grade_name !== gradeName));
  };

  // Submit Stage 1 Form
  const handleSaveStage1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setS1Error("");
    setS1Success("");

    if (!canCreateStage1) {
      setS1Error("Permission Denied: You do not have authorization to create Stage 1 entries.");
      return;
    }

    const trimmedLorry = s1LorryNo.trim().toUpperCase();
    if (!trimmedLorry) {
      setS1Error("Lorry Number is required.");
      return;
    }

    // Check duplicate active lorry
    const activeDuplicate = records.find(
      (r) => r.lorry_number.toUpperCase() === trimmedLorry && r.status !== "OUT"
    );
    if (activeDuplicate) {
      setS1Error(
        `Duplicate Entry Error: Lorry [${trimmedLorry}] is currently active in the system under Ticket #${activeDuplicate.ticket_number}. Complete its weighment cycle before starting a new one.`
      );
      return;
    }

    const gross = parseFloat(s1GrossWeight);
    const tare = parseFloat(s1TareWeight);

    if (isNaN(gross) || gross <= 0) {
      setS1Error("Please enter a valid Gross Weight.");
      return;
    }
    if (isNaN(tare) || tare < 0) {
      setS1Error("Please enter a valid Tare Weight.");
      return;
    }
    if (gross <= tare) {
      setS1Error("Gross Weight must be greater than Tare Weight.");
      return;
    }

    setS1Saving(true);
    try {
      const gradeSummaryString = s1Grades.map((g) => `${g.grade_name} (${g.quantity} KG)`).join(", ");

      const nowIso = new Date().toISOString();
      const newRecord = {
        ticket_number: s1TicketNo,
        date: s1Date,
        lorry_number: trimmedLorry,
        party_name: s1PartyName || null,
        stage1_gross_weight: gross,
        stage1_tare_weight: tare,
        stage1_net_weight: gross - tare,
        stage1_completed: true,
        stage1_date: nowIso,
        grade: gradeSummaryString || null,
        grade_details: s1Grades.length > 0 ? s1Grades : null,
        unit: s1Unit || null,
        mokam: s1Mokam || null,
        marka: s1Marka || null,
        stage2_completed: false,
        stage3_completed: false,
        status: "IN",
      };

      await dbModule.insert("lorry_weighments", newRecord);

      setS1Success(`Stage 1 (Party Weighment) successfully saved! Ticket: ${s1TicketNo}`);
      
      // Reset form
      setS1LorryNo("");
      setS1PartyName("");
      setS1GrossWeight("");
      setS1TareWeight("");
      setS1Unit("");
      setS1Mokam("");
      setS1Marka("");
      setS1Grades([]);
      
      // Reload fresh data
      await loadData();
    } catch (err: any) {
      console.error("Stage 1 Save Error:", err);
      setS1Error(err.message || "Failed to save Stage 1 entry.");
    } finally {
      setS1Saving(false);
    }
  };

  // Submit Stage 2 Form
  const handleSaveStage2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setS2Error("");
    setS2Success("");

    if (!canCompleteStage2) {
      setS2Error("Permission Denied: You do not have authorization to complete Stage 2 entries.");
      return;
    }

    if (!selectedS2Record) {
      setS2Error("Please select a pending lorry for Stage 2.");
      return;
    }

    const gross = parseFloat(s2GrossWeight);
    const tare = parseFloat(s2TareWeight);

    if (isNaN(gross) || gross <= 0) {
      setS2Error("Please enter a valid Gross Weight.");
      return;
    }
    if (isNaN(tare) || tare < 0) {
      setS2Error("Please enter a valid Tare Weight.");
      return;
    }
    if (gross <= tare) {
      setS2Error("Gross Weight must be greater than Tare Weight.");
      return;
    }

    setS2Saving(true);
    try {
      const updatePayload = {
        stage2_gross_weight: gross,
        stage2_tare_weight: tare,
        stage2_net_weight: gross - tare,
        stage2_completed: true,
        stage2_date: new Date().toISOString(),
      };

      await dbModule.update("lorry_weighments", "id", selectedS2Record.id, updatePayload);

      setS2Success(`Stage 2 (Mill Scale Weighment) successfully recorded for Lorry [${selectedS2Record.lorry_number}]!`);
      setS2SelectedId("");
      setS2GrossWeight("");
      setS2TareWeight("");
      
      await loadData();
    } catch (err: any) {
      console.error("Stage 2 Save Error:", err);
      setS2Error(err.message || "Failed to save Stage 2 entry.");
    } finally {
      setS2Saving(false);
    }
  };

  // Submit Stage 3 Form
  const handleSaveStage3 = async (e: React.FormEvent) => {
    e.preventDefault();
    setS3Error("");
    setS3Success("");

    if (!canCompleteStage3) {
      setS3Error("Permission Denied: You do not have authorization to complete Stage 3 entries.");
      return;
    }

    if (!selectedS3Record) {
      setS3Error("Please select a pending lorry for Stage 3.");
      return;
    }

    const gross = parseFloat(s3GrossWeight);
    const tare = parseFloat(s3TareWeight);

    if (isNaN(gross) || gross <= 0) {
      setS3Error("Please enter a valid Gross Weight.");
      return;
    }
    if (isNaN(tare) || tare < 0) {
      setS3Error("Please enter a valid Tare Weight.");
      return;
    }
    if (gross <= tare) {
      setS3Error("Gross Weight must be greater than Tare Weight.");
      return;
    }

    const s3Net = gross - tare;
    const s1Net = selectedS3Record.stage1_net_weight || s3Net;
    const s2Net = selectedS3Record.stage2_net_weight || s3Net;

    // Lowest Net Weight calculation
    const finalLowestWeight = Math.min(s1Net, s2Net, s3Net);

    setS3Saving(true);
    try {
      const nowIso = new Date().toISOString();
      const updatePayload = {
        stage3_gross_weight: gross,
        stage3_tare_weight: tare,
        stage3_net_weight: s3Net,
        stage3_completed: true,
        stage3_date: nowIso,
        final_weight: finalLowestWeight,
        final_weight_date: nowIso,
        status: "OUT",
      };

      await dbModule.update("lorry_weighments", "id", selectedS3Record.id, updatePayload);

      setS3Success(
        `Stage 3 Electronic Scale Completed! Lorry [${selectedS3Record.lorry_number}] marked OUT. Final Weight: ${finalLowestWeight.toFixed(2)} KG.`
      );
      setS3SelectedId("");
      setS3GrossWeight("");
      setS3TareWeight("");

      await loadData();
    } catch (err: any) {
      console.error("Stage 3 Save Error:", err);
      setS3Error(err.message || "Failed to save Stage 3 entry.");
    } finally {
      setS3Saving(false);
    }
  };

  // Dashboard filtered list
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Subtab filter
      if (dashboardSubTab === "stage1" && !r.stage1_completed) return false;
      if (dashboardSubTab === "stage2" && !r.stage2_completed) return false;
      if (dashboardSubTab === "stage3" && !r.stage3_completed) return false;
      if (dashboardSubTab === "final" && r.status !== "OUT") return false;

      // Text search
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchLorry = r.lorry_number.toLowerCase().includes(term);
        const matchTicket = r.ticket_number.toLowerCase().includes(term);
        const matchParty = (r.party_name || "").toLowerCase().includes(term);
        const matchMokam = (r.mokam || "").toLowerCase().includes(term);
        if (!matchLorry && !matchTicket && !matchParty && !matchMokam) return false;
      }

      // Dropdown filters
      if (filterParty && (r.party_name || "") !== filterParty) return false;
      if (filterMokam && (r.mokam || "") !== filterMokam) return false;

      // Date range filter
      if (filterDateFrom && r.date < filterDateFrom) return false;
      if (filterDateTo && r.date > filterDateTo) return false;

      return true;
    });
  }, [records, dashboardSubTab, searchTerm, filterParty, filterMokam, filterDateFrom, filterDateTo]);

  if (!hasModuleAccess) {
    return (
      <LegacyLayout title="4.4 – Weight Bridge Management" subtitle="Access Control Enforcement">
        <div className="max-w-4xl mx-auto my-12 bg-rose-50 border-2 border-rose-300 rounded-xl p-8 text-center shadow-lg font-mono">
          <ShieldAlert className="h-16 w-16 text-rose-600 mx-auto mb-4" />
          <h2 className="text-xl font-extrabold text-rose-900 uppercase tracking-wide">
            Access Denied: Module Restricted
          </h2>
          <p className="text-sm text-rose-700 mt-2 max-w-lg mx-auto">
            Your current operator profile standard permissions do not hold authorization for{" "}
            <strong>4.4 – Weight Bridge Management</strong>. Please contact a System Administrator in Admin Desk to request privilege grants.
          </p>
          <div className="mt-6">
            <button
              onClick={() => onNavigate && onNavigate("dashboard")}
              className="px-6 py-2 bg-rose-800 text-white font-bold rounded-lg hover:bg-rose-900 transition-all cursor-pointer text-xs uppercase"
            >
              Return to Main Dashboard
            </button>
          </div>
        </div>
      </LegacyLayout>
    );
  }

  return (
    <LegacyLayout title="4.4 – Weight Bridge Management" subtitle="Jute Procurement 3-Stage Weighment Module">
      <div className="space-y-6 max-w-full px-2 sm:px-4">
        
        {/* Top Operational Navigation Tabs */}
        <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 p-2 sm:p-3 rounded-xl border border-sky-800 shadow-md text-white font-mono flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Scale className="h-6 w-6 text-sky-400 shrink-0" />
            <div>
              <h1 className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-sky-100">
                Weight Bridge Desk
              </h1>
              <p className="text-[10px] text-sky-300/80">3-Stage Party, Mill & Electronic Weighment Workflow</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setActiveTab("stage1")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all cursor-pointer flex items-center gap-1.5 border",
                activeTab === "stage1"
                  ? "bg-sky-500 border-sky-300 text-slate-950 shadow-md"
                  : "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800"
              )}
            >
              <Truck className="h-3.5 w-3.5" />
              <span>1. Party Scale (IN)</span>
            </button>

            <button
              onClick={() => setActiveTab("stage2")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all cursor-pointer flex items-center gap-1.5 border",
                activeTab === "stage2"
                  ? "bg-amber-500 border-amber-300 text-slate-950 shadow-md"
                  : "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800"
              )}
            >
              <Building className="h-3.5 w-3.5" />
              <span>2. Mill Scale</span>
              {pendingStage2Lorries.length > 0 && (
                <span className="bg-amber-950 text-amber-200 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {pendingStage2Lorries.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("stage3")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all cursor-pointer flex items-center gap-1.5 border",
                activeTab === "stage3"
                  ? "bg-emerald-500 border-emerald-300 text-slate-950 shadow-md"
                  : "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800"
              )}
            >
              <Scale className="h-3.5 w-3.5" />
              <span>3. Electronic Scale (OUT)</span>
              {pendingStage3Lorries.length > 0 && (
                <span className="bg-emerald-950 text-emerald-200 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {pendingStage3Lorries.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("dashboards")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all cursor-pointer flex items-center gap-1.5 border",
                activeTab === "dashboards"
                  ? "bg-indigo-500 border-indigo-300 text-white shadow-md"
                  : "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800"
              )}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Dashboards & Logs</span>
            </button>

            <button
              onClick={loadData}
              title="Refresh Data"
              className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-slate-300 transition-all cursor-pointer ml-1"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* TAB 1: STAGE 1 - PARTY WEIGHMENT */}
        {activeTab === "stage1" && (
          <div className="space-y-4">
            <LegacyFieldset legend="Stage 1: Party Weighment Entry (Lorry Arrival)" className="bg-white border-sky-300">
              <form onSubmit={handleSaveStage1} className="space-y-4 font-mono text-xs">
                
                {s1Error && (
                  <div className="p-3 bg-rose-50 border-l-4 border-rose-600 text-rose-800 rounded flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                    <span>{s1Error}</span>
                  </div>
                )}

                {s1Success && (
                  <div className="p-3 bg-emerald-50 border-l-4 border-emerald-600 text-emerald-800 rounded flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    <span>{s1Success}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-sky-50/50 p-4 rounded-xl border border-sky-200">
                  
                  {/* Ticket Number */}
                  <div>
                    <label className="block text-slate-700 font-extrabold uppercase mb-1 text-[11px]">
                      Ticket Number <span className="text-slate-400 font-normal">(Auto)</span>
                    </label>
                    <input
 id="s1ticketno_795" name="s1ticketno" aria-label="s1ticketno"                      type="text"
                      readOnly
                      value={s1TicketNo}
                      className="w-full bg-slate-100 border border-slate-300 px-3 py-2 rounded font-bold text-sky-900 outline-none"
                    />
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-slate-700 font-extrabold uppercase mb-1 text-[11px]">
                      Weighment Date <span className="text-rose-600">*</span>
                    </label>
                    <input
 id="s1date_808" name="s1date" aria-label="s1date"                      type="date"
                      required
                      value={s1Date}
                      onChange={(e) => setS1Date(e.target.value)}
                      className="w-full bg-white border border-slate-300 px-3 py-2 rounded font-bold outline-none focus:border-sky-600"
                    />
                  </div>

                  {/* Lorry Number */}
                  <div>
                    <label className="block text-slate-700 font-extrabold uppercase mb-1 text-[11px]">
                      Lorry Number <span className="text-rose-600">*</span>
                    </label>
                    <input
 id="e_g_wb25b1234_822" name="e_g_wb25b1234" aria-label="e.g. WB25B1234"                      type="text"
                      required
                      placeholder="e.g. WB25B1234"
                      value={s1LorryNo}
                      onChange={(e) => setS1LorryNo(e.target.value.toUpperCase())}
                      className="w-full bg-white border border-slate-300 px-3 py-2 rounded font-black tracking-wider text-slate-900 uppercase outline-none focus:border-sky-600"
                    />
                  </div>

                  {/* Party Name */}
                  <div>
                    <label htmlFor="party_name_supplier_837" className="block text-slate-700 font-extrabold uppercase mb-1 text-[11px]">
                      Party Name / Supplier
                    </label>
                    <input
 id="party_name_supplier_837" name="party_name_supplier" aria-label="Party Name / Supplier"                      type="text"
                      list="broker-options"
                      placeholder="Select or type party..."
                      value={s1PartyName}
                      onChange={(e) => setS1PartyName(e.target.value)}
                      className="w-full bg-white border border-slate-300 px-3 py-2 rounded font-bold outline-none focus:border-sky-600"
                    />
                    <datalist id="broker-options">
                      {brokerList.map((b, i) => (
                        <option key={i} value={b} />
                      ))}
                    </datalist>
                  </div>

                </div>

                {/* Weights Section */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-900 text-white p-4 rounded-xl border border-slate-800">
                  
                  <div>
                    <label className="block text-sky-300 font-extrabold uppercase mb-1 text-[11px]">
                      Gross Weight (KG) <span className="text-rose-400">*</span>
                    </label>
                    <input
 id="0_00_861" name="0_00" aria-label="0.00"                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={s1GrossWeight}
                      onChange={(e) => setS1GrossWeight(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded text-base font-extrabold outline-none focus:border-sky-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sky-300 font-extrabold uppercase mb-1 text-[11px]">
                      Tare Weight (KG) <span className="text-rose-400">*</span>
                    </label>
                    <input
 id="0_00_876" name="0_00" aria-label="0.00"                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={s1TareWeight}
                      onChange={(e) => setS1TareWeight(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded text-base font-extrabold outline-none focus:border-sky-400"
                    />
                  </div>

                  <div>
                    <label className="block text-emerald-400 font-extrabold uppercase mb-1 text-[11px]">
                      Net Weight (Auto Calc)
                    </label>
                    <div className="w-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 px-3 py-2 rounded text-base font-extrabold flex items-center justify-between">
                      <span>{s1NetWeight.toFixed(2)}</span>
                      <span className="text-xs text-emerald-400 font-normal">KG</span>
                    </div>
                  </div>

                </div>

                {/* Master Attributes & Multiple Grade Allocation */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  
                  {/* Unit */}
                  <div>
                    <label htmlFor="unit_mill_unit_907" className="block text-slate-700 font-extrabold uppercase mb-1 text-[11px]">
                      Unit / Mill Unit
                    </label>
                    <input
 id="unit_mill_unit_907" name="unit_mill_unit" aria-label="Unit / Mill Unit"                      type="text"
                      list="unit-options"
                      placeholder="Select or type unit..."
                      value={s1Unit}
                      onChange={(e) => setS1Unit(e.target.value)}
                      className="w-full bg-white border border-slate-300 px-3 py-2 rounded font-bold outline-none focus:border-sky-600"
                    />
                    <datalist id="unit-options">
                      {unitList.map((u, i) => (
                        <option key={i} value={u} />
                      ))}
                    </datalist>
                  </div>

                  {/* Mokam / Agency */}
                  <div>
                    <label htmlFor="mokam_station_agency_927" className="block text-slate-700 font-extrabold uppercase mb-1 text-[11px]">
                      Mokam / Station / Agency
                    </label>
                    <input
 id="mokam_station_agency_927" name="mokam_station_agency" aria-label="Mokam / Station / Agency"                      type="text"
                      list="agency-options"
                      placeholder="Select or type mokam..."
                      value={s1Mokam}
                      onChange={(e) => setS1Mokam(e.target.value)}
                      className="w-full bg-white border border-slate-300 px-3 py-2 rounded font-bold outline-none focus:border-sky-600"
                    />
                    <datalist id="agency-options">
                      {agencyList.map((a, i) => (
                        <option key={i} value={a} />
                      ))}
                    </datalist>
                  </div>

                  {/* Marka */}
                  <div>
                    <label htmlFor="marka_947" className="block text-slate-700 font-extrabold uppercase mb-1 text-[11px]">
                      Marka
                    </label>
                    <input
 id="marka_947" name="marka" aria-label="Marka"                      type="text"
                      list="marka-options"
                      placeholder="Select or type marka..."
                      value={s1Marka}
                      onChange={(e) => setS1Marka(e.target.value)}
                      className="w-full bg-white border border-slate-300 px-3 py-2 rounded font-bold outline-none focus:border-sky-600"
                    />
                    <datalist id="marka-options">
                      {markaList.map((m, i) => (
                        <option key={i} value={m} />
                      ))}
                    </datalist>
                  </div>

                </div>

                {/* Multiple Grade Selection */}
                <div className="bg-sky-50/60 p-4 rounded-xl border border-sky-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-800 font-extrabold uppercase text-[11px] flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-sky-700" />
                      <span>Multiple Grade Breakdown & Quantity Allocation</span>
                    </label>
                    <span className="text-[10px] text-slate-500 font-normal">Optional breakdown per grade</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
 id="select_grade_975" name="select_grade" aria-label="Select Grade..."                      type="text"
                      list="grade-options"
                      placeholder="Select Grade..."
                      value={selectedGradeInput}
                      onChange={(e) => setSelectedGradeInput(e.target.value)}
                      className="bg-white border border-slate-300 px-3 py-1.5 rounded text-xs font-bold outline-none w-48 focus:border-sky-600"
                    />
                    <datalist id="grade-options">
                      {gradeList.map((g, i) => (
                        <option key={i} value={g} />
                      ))}
                    </datalist>

                    <input
 id="qty_kg_989" name="qty_kg" aria-label="Qty (KG)..."                      type="number"
                      step="0.01"
                      placeholder="Qty (KG)..."
                      value={selectedGradeQty}
                      onChange={(e) => setSelectedGradeQty(e.target.value)}
                      className="bg-white border border-slate-300 px-3 py-1.5 rounded text-xs font-bold outline-none w-32 focus:border-sky-600"
                    />

                    <button
                      type="button"
                      onClick={handleAddGrade}
                      className="px-3 py-1.5 bg-sky-700 hover:bg-sky-800 text-white font-bold rounded text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Grade</span>
                    </button>
                  </div>

                  {s1Grades.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-sky-200">
                      {s1Grades.map((g, idx) => (
                        <span
                          key={idx}
                          className="bg-white border border-sky-300 px-2.5 py-1 rounded-full text-xs font-bold text-sky-900 flex items-center gap-2 shadow-xs"
                        >
                          <span>{g.grade_name}</span>
                          <span className="bg-sky-100 text-sky-800 text-[10px] px-1.5 py-0.2 rounded font-extrabold">
                            {g.quantity} KG
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveGrade(g.grade_name)}
                            className="text-rose-500 hover:text-rose-700 cursor-pointer font-black ml-1"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Submit Action */}
                <div className="pt-2 flex items-center justify-end gap-3">
                  <LegacyButton
                    type="submit"
                    disabled={s1Saving || !canCreateStage1}
                    className="bg-sky-800 hover:bg-sky-900 text-white font-extrabold px-6 py-2.5 rounded-lg shadow-md cursor-pointer"
                  >
                    {s1Saving ? "Saving Stage 1..." : "Save Stage 1 Party Weighment (Lorry IN)"}
                  </LegacyButton>
                </div>

              </form>
            </LegacyFieldset>
          </div>
        )}

        {/* TAB 2: STAGE 2 - MILL SCALE WEIGHMENT */}
        {activeTab === "stage2" && (
          <div className="space-y-4 font-mono text-xs">
            <LegacyFieldset legend="Stage 2: Mill Scale Weighment Record" className="bg-white border-amber-300">
              <form onSubmit={handleSaveStage2} className="space-y-4">
                
                {s2Error && (
                  <div className="p-3 bg-rose-50 border-l-4 border-rose-600 text-rose-800 rounded flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                    <span>{s2Error}</span>
                  </div>
                )}

                {s2Success && (
                  <div className="p-3 bg-emerald-50 border-l-4 border-emerald-600 text-emerald-800 rounded flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    <span>{s2Success}</span>
                  </div>
                )}

                {/* Select Pending Lorry Dropdown */}
                <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200">
                  <label className="block text-slate-800 font-extrabold uppercase mb-1 text-[11px] flex items-center gap-1.5">
                    <Truck className="h-4 w-4 text-amber-700" />
                    <span>Select Pending Lorry for Stage 2 Weighment <span className="text-rose-600">*</span></span>
                  </label>
                  <select
 id="s2selectedid_1074" name="s2selectedid" aria-label="s2selectedid"                    required
                    value={s2SelectedId}
                    onChange={(e) => {
                      setS2SelectedId(e.target.value);
                      setS2GrossWeight("");
                      setS2TareWeight("");
                    }}
                    className="w-full bg-white border-2 border-amber-400 px-3 py-2.5 rounded-lg font-bold text-slate-900 outline-none text-sm focus:border-amber-600 cursor-pointer"
                  >
                    <option value="">-- Choose Lorry (Stage 1 Completed Only) --</option>
                    {pendingStage2Lorries.map((r) => (
                      <option key={r.id} value={r.id}>
                        Lorry: {r.lorry_number} | Ticket: {r.ticket_number} | Party: {r.party_name || "N/A"} | Date: {r.date} (S1 Net: {r.stage1_net_weight} KG)
                      </option>
                    ))}
                  </select>

                  {pendingStage2Lorries.length === 0 && (
                    <p className="text-[11px] text-amber-800 mt-2 font-bold italic">
                      No lorries currently pending for Stage 2. Complete Stage 1 first.
                    </p>
                  )}
                </div>

                {/* Populate Read-Only Stage 1 Information */}
                {selectedS2Record && (
                  <div className="space-y-4">
                    <div className="bg-slate-100 p-4 rounded-xl border border-slate-300 space-y-2">
                      <h3 className="font-extrabold uppercase text-slate-800 text-xs flex items-center gap-2 border-b border-slate-300 pb-2">
                        <FileText className="h-4 w-4 text-sky-700" />
                        <span>Stage 1 Reference Attributes (Read-Only)</span>
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Ticket Number</span>
                          <strong className="text-sky-900 font-black">{selectedS2Record.ticket_number}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Lorry Number</span>
                          <strong className="text-slate-900 font-black">{selectedS2Record.lorry_number}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Party Name</span>
                          <strong className="text-slate-900">{selectedS2Record.party_name || "N/A"}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Mokam / Station</span>
                          <strong className="text-slate-900">{selectedS2Record.mokam || "N/A"}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Stage 1 Gross Weight</span>
                          <strong>{selectedS2Record.stage1_gross_weight} KG</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Stage 1 Tare Weight</span>
                          <strong>{selectedS2Record.stage1_tare_weight} KG</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Stage 1 Net Weight</span>
                          <strong className="text-emerald-700">{selectedS2Record.stage1_net_weight} KG</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Grades Breakdown</span>
                          <strong>{selectedS2Record.grade || "N/A"}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Stage 2 Entry Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-900 text-white p-4 rounded-xl border border-slate-800">
                      <div>
                        <label className="block text-amber-300 font-extrabold uppercase mb-1 text-[11px]">
                          Mill Scale Gross Weight (KG) <span className="text-rose-400">*</span>
                        </label>
                        <input
 id="0_00_1149" name="0_00" aria-label="0.00"                          type="number"
                          step="0.01"
                          required
                          placeholder="0.00"
                          value={s2GrossWeight}
                          onChange={(e) => setS2GrossWeight(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded text-base font-extrabold outline-none focus:border-amber-400"
                        />
                      </div>

                      <div>
                        <label className="block text-amber-300 font-extrabold uppercase mb-1 text-[11px]">
                          Mill Scale Tare Weight (KG) <span className="text-rose-400">*</span>
                        </label>
                        <input
 id="0_00_1164" name="0_00" aria-label="0.00"                          type="number"
                          step="0.01"
                          required
                          placeholder="0.00"
                          value={s2TareWeight}
                          onChange={(e) => setS2TareWeight(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded text-base font-extrabold outline-none focus:border-amber-400"
                        />
                      </div>

                      <div>
                        <label className="block text-amber-400 font-extrabold uppercase mb-1 text-[11px]">
                          Mill Scale Net Weight (Auto Calc)
                        </label>
                        <div className="w-full bg-amber-950/80 border border-amber-500/50 text-amber-300 px-3 py-2 rounded text-base font-extrabold flex items-center justify-between">
                          <span>{s2NetWeight.toFixed(2)}</span>
                          <span className="text-xs text-amber-400 font-normal">KG</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-end">
                      <LegacyButton
                        type="submit"
                        disabled={s2Saving || !canCompleteStage2}
                        className="bg-amber-600 hover:bg-amber-700 text-slate-950 font-black px-6 py-2.5 rounded-lg shadow-md cursor-pointer uppercase"
                      >
                        {s2Saving ? "Saving Stage 2..." : "Save Stage 2 Mill Scale Weighment"}
                      </LegacyButton>
                    </div>
                  </div>
                )}

              </form>
            </LegacyFieldset>
          </div>
        )}

        {/* TAB 3: STAGE 3 - ELECTRONIC SCALE WEIGHMENT */}
        {activeTab === "stage3" && (
          <div className="space-y-4 font-mono text-xs">
            <LegacyFieldset legend="Stage 3: Electronic Scale Final Weighment Record" className="bg-white border-emerald-300">
              <form onSubmit={handleSaveStage3} className="space-y-4">
                
                {s3Error && (
                  <div className="p-3 bg-rose-50 border-l-4 border-rose-600 text-rose-800 rounded flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                    <span>{s3Error}</span>
                  </div>
                )}

                {s3Success && (
                  <div className="p-3 bg-emerald-50 border-l-4 border-emerald-600 text-emerald-800 rounded flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    <span>{s3Success}</span>
                  </div>
                )}

                {/* Select Pending Lorry Dropdown */}
                <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200">
                  <label className="block text-slate-800 font-extrabold uppercase mb-1 text-[11px] flex items-center gap-1.5">
                    <Scale className="h-4 w-4 text-emerald-700" />
                    <span>Select Pending Lorry for Stage 3 Weighment <span className="text-rose-600">*</span></span>
                  </label>
                  <select
 id="s3selectedid_1229" name="s3selectedid" aria-label="s3selectedid"                    required
                    value={s3SelectedId}
                    onChange={(e) => {
                      setS3SelectedId(e.target.value);
                      setS3GrossWeight("");
                      setS3TareWeight("");
                    }}
                    className="w-full bg-white border-2 border-emerald-400 px-3 py-2.5 rounded-lg font-bold text-slate-900 outline-none text-sm focus:border-emerald-600 cursor-pointer"
                  >
                    <option value="">-- Choose Lorry (Stage 2 Completed Only) --</option>
                    {pendingStage3Lorries.map((r) => (
                      <option key={r.id} value={r.id}>
                        Lorry: {r.lorry_number} | Ticket: {r.ticket_number} | Party: {r.party_name || "N/A"} | S1 Net: {r.stage1_net_weight} KG | S2 Net: {r.stage2_net_weight} KG
                      </option>
                    ))}
                  </select>

                  {pendingStage3Lorries.length === 0 && (
                    <p className="text-[11px] text-emerald-800 mt-2 font-bold italic">
                      No lorries currently pending for Stage 3. Complete Stage 2 first.
                    </p>
                  )}
                </div>

                {/* Populate Read-Only Stage 1 & Stage 2 Information */}
                {selectedS3Record && (
                  <div className="space-y-4">
                    <div className="bg-slate-100 p-4 rounded-xl border border-slate-300 space-y-2">
                      <h3 className="font-extrabold uppercase text-slate-800 text-xs flex items-center gap-2 border-b border-slate-300 pb-2">
                        <FileText className="h-4 w-4 text-emerald-700" />
                        <span>Previous Stage 1 & Stage 2 Weighment Summary (Read-Only)</span>
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Ticket Number</span>
                          <strong className="text-emerald-900 font-black">{selectedS3Record.ticket_number}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Lorry Number</span>
                          <strong className="text-slate-900 font-black">{selectedS3Record.lorry_number}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Party Name</span>
                          <strong className="text-slate-900">{selectedS3Record.party_name || "N/A"}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Mokam / Station</span>
                          <strong className="text-slate-900">{selectedS3Record.mokam || "N/A"}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Stage 1 Net Weight</span>
                          <strong className="text-sky-800">{selectedS3Record.stage1_net_weight} KG</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Stage 2 Net Weight</span>
                          <strong className="text-amber-800">{selectedS3Record.stage2_net_weight} KG</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Unit / Marka</span>
                          <strong>{selectedS3Record.unit || "N/A"} / {selectedS3Record.marka || "N/A"}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Grades Breakdown</span>
                          <strong>{selectedS3Record.grade || "N/A"}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Stage 3 Entry Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-900 text-white p-4 rounded-xl border border-slate-800">
                      <div>
                        <label className="block text-emerald-300 font-extrabold uppercase mb-1 text-[11px]">
                          Electronic Gross Weight (KG) <span className="text-rose-400">*</span>
                        </label>
                        <input
 id="0_00_1304" name="0_00" aria-label="0.00"                          type="number"
                          step="0.01"
                          required
                          placeholder="0.00"
                          value={s3GrossWeight}
                          onChange={(e) => setS3GrossWeight(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded text-base font-extrabold outline-none focus:border-emerald-400"
                        />
                      </div>

                      <div>
                        <label className="block text-emerald-300 font-extrabold uppercase mb-1 text-[11px]">
                          Electronic Tare Weight (KG) <span className="text-rose-400">*</span>
                        </label>
                        <input
 id="0_00_1319" name="0_00" aria-label="0.00"                          type="number"
                          step="0.01"
                          required
                          placeholder="0.00"
                          value={s3TareWeight}
                          onChange={(e) => setS3TareWeight(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded text-base font-extrabold outline-none focus:border-emerald-400"
                        />
                      </div>

                      <div>
                        <label className="block text-emerald-400 font-extrabold uppercase mb-1 text-[11px]">
                          Electronic Net Weight (Auto Calc)
                        </label>
                        <div className="w-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 px-3 py-2 rounded text-base font-extrabold flex items-center justify-between">
                          <span>{s3NetWeight.toFixed(2)}</span>
                          <span className="text-xs text-emerald-400 font-normal">KG</span>
                        </div>
                      </div>
                    </div>

                    {/* Final Weight Preview */}
                    {s3NetWeight > 0 && (
                      <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-xl flex items-center justify-between">
                        <div>
                          <span className="text-slate-600 text-xs font-extrabold uppercase block">
                            Calculated Final Weight (Lowest Net Weight of 3 Stages)
                          </span>
                          <p className="text-[11px] text-slate-500">
                            Min({selectedS3Record.stage1_net_weight} KG, {selectedS3Record.stage2_net_weight} KG, {s3NetWeight.toFixed(2)} KG)
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xl font-black text-emerald-900">
                            {Math.min(
                              selectedS3Record.stage1_net_weight || s3NetWeight,
                              selectedS3Record.stage2_net_weight || s3NetWeight,
                              s3NetWeight
                            ).toFixed(2)}{" "}
                            KG
                          </span>
                          <span className="block text-[10px] text-emerald-700 font-bold uppercase">Final Accepted Weight</span>
                        </div>
                      </div>
                    )}

                    <div className="pt-2 flex items-center justify-end">
                      <LegacyButton
                        type="submit"
                        disabled={s3Saving || !canCompleteStage3}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 py-2.5 rounded-lg shadow-md cursor-pointer uppercase"
                      >
                        {s3Saving ? "Saving Stage 3..." : "Save Stage 3 & Mark Lorry OUT"}
                      </LegacyButton>
                    </div>
                  </div>
                )}

              </form>
            </LegacyFieldset>
          </div>
        )}

        {/* TAB 4: DASHBOARDS & LOGS */}
        {activeTab === "dashboards" && (
          <div className="space-y-4 font-mono text-xs">
            
            {/* Sub-navigation tabs for dashboards */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setDashboardSubTab("stage1")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg font-extrabold text-xs cursor-pointer border uppercase transition-all",
                    dashboardSubTab === "stage1"
                      ? "bg-sky-100 border-sky-600 text-sky-950 shadow-xs"
                      : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  Party Scale Log (Stage 1)
                </button>

                <button
                  onClick={() => setDashboardSubTab("stage2")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg font-extrabold text-xs cursor-pointer border uppercase transition-all",
                    dashboardSubTab === "stage2"
                      ? "bg-amber-100 border-amber-600 text-amber-950 shadow-xs"
                      : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  Mill Scale Log (Stage 2)
                </button>

                <button
                  onClick={() => setDashboardSubTab("stage3")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg font-extrabold text-xs cursor-pointer border uppercase transition-all",
                    dashboardSubTab === "stage3"
                      ? "bg-emerald-100 border-emerald-600 text-emerald-950 shadow-xs"
                      : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  Electronic Scale Log (Stage 3)
                </button>

                {canViewFinal && (
                  <button
                    onClick={() => setDashboardSubTab("final")}
                    className={cn(
                      "px-3 py-1.5 rounded-lg font-extrabold text-xs cursor-pointer border uppercase transition-all",
                      dashboardSubTab === "final"
                        ? "bg-indigo-100 border-indigo-600 text-indigo-950 shadow-xs"
                        : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    Final Weight Dashboard (Lowest Net)
                  </button>
                )}
              </div>

              <div className="text-slate-500 font-bold text-[11px]">
                Records Shown: <span className="text-slate-900 font-black">{filteredRecords.length}</span>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-slate-100 p-3 rounded-xl border border-slate-300 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2">
              <div>
                <label htmlFor="search_lorry_ticket_1452" className="block text-[10px] font-extrabold text-slate-600 uppercase mb-0.5">Search Lorry / Ticket</label>
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-2.5 top-2 text-slate-400" />
                  <input
 id="search_lorry_ticket_1452" name="search_lorry_ticket" aria-label="Search Lorry / Ticket"                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white border border-slate-300 pl-8 pr-2 py-1 rounded text-xs outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="filter_party_1464" className="block text-[10px] font-extrabold text-slate-600 uppercase mb-0.5">Filter Party</label>
                <select
 id="filter_party_1464" name="filter_party" aria-label="Filter Party"                  value={filterParty}
                  onChange={(e) => setFilterParty(e.target.value)}
                  className="w-full bg-white border border-slate-300 px-2 py-1 rounded text-xs outline-none focus:border-indigo-600"
                >
                  <option value="">All Parties</option>
                  {brokerList.map((b, i) => (
                    <option key={i} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="filter_mokam_1478" className="block text-[10px] font-extrabold text-slate-600 uppercase mb-0.5">Filter Mokam</label>
                <select
 id="filter_mokam_1478" name="filter_mokam" aria-label="Filter Mokam"                  value={filterMokam}
                  onChange={(e) => setFilterMokam(e.target.value)}
                  className="w-full bg-white border border-slate-300 px-2 py-1 rounded text-xs outline-none focus:border-indigo-600"
                >
                  <option value="">All Mokams</option>
                  {agencyList.map((a, i) => (
                    <option key={i} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="date_from_1492" className="block text-[10px] font-extrabold text-slate-600 uppercase mb-0.5">Date From</label>
                <input
 id="date_from_1492" name="date_from" aria-label="Date From"                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="w-full bg-white border border-slate-300 px-2 py-1 rounded text-xs outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label htmlFor="date_to_1502" className="block text-[10px] font-extrabold text-slate-600 uppercase mb-0.5">Date To</label>
                <input
 id="date_to_1502" name="date_to" aria-label="Date To"                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="w-full bg-white border border-slate-300 px-2 py-1 rounded text-xs outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            {/* Records Data Table */}
            <div className="bg-white border border-slate-300 rounded-xl overflow-x-auto shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-extrabold uppercase text-[10.5px]">
                    <th className="p-2.5 border-b border-slate-700">Ticket #</th>
                    <th className="p-2.5 border-b border-slate-700">Date</th>
                    <th className="p-2.5 border-b border-slate-700">Lorry #</th>
                    <th className="p-2.5 border-b border-slate-700">Party Name</th>
                    <th className="p-2.5 border-b border-slate-700">Mokam</th>

                    {dashboardSubTab === "stage1" && (
                      <>
                        <th className="p-2.5 border-b border-slate-700 text-right">S1 Gross (KG)</th>
                        <th className="p-2.5 border-b border-slate-700 text-right">S1 Tare (KG)</th>
                        <th className="p-2.5 border-b border-slate-700 text-right text-sky-300">S1 Net (KG)</th>
                      </>
                    )}

                    {dashboardSubTab === "stage2" && (
                      <>
                        <th className="p-2.5 border-b border-slate-700 text-right">S2 Gross (KG)</th>
                        <th className="p-2.5 border-b border-slate-700 text-right">S2 Tare (KG)</th>
                        <th className="p-2.5 border-b border-slate-700 text-right text-amber-300">S2 Net (KG)</th>
                      </>
                    )}

                    {dashboardSubTab === "stage3" && (
                      <>
                        <th className="p-2.5 border-b border-slate-700 text-right">S3 Gross (KG)</th>
                        <th className="p-2.5 border-b border-slate-700 text-right">S3 Tare (KG)</th>
                        <th className="p-2.5 border-b border-slate-700 text-right text-emerald-300">S3 Net (KG)</th>
                      </>
                    )}

                    {dashboardSubTab === "final" && (
                      <>
                        <th className="p-2.5 border-b border-slate-700 text-right">S1 Net (KG)</th>
                        <th className="p-2.5 border-b border-slate-700 text-right">S2 Net (KG)</th>
                        <th className="p-2.5 border-b border-slate-700 text-right">S3 Net (KG)</th>
                        <th className="p-2.5 border-b border-slate-700 text-right bg-emerald-950 text-emerald-300 font-black">
                          Final Net (Lowest KG)
                        </th>
                      </>
                    )}

                    <th className="p-2.5 border-b border-slate-700 text-center">Status</th>
                    <th className="p-2.5 border-b border-slate-700 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-500 font-bold italic">
                        No weighment records found matching the active tab or search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((r) => (
                      <tr key={r.id} className="hover:bg-sky-50/50 transition-colors">
                        <td className="p-2.5 font-extrabold text-sky-900">{r.ticket_number}</td>
                        <td className="p-2.5 text-slate-600">{r.date}</td>
                        <td className="p-2.5 font-black text-slate-900">{r.lorry_number}</td>
                        <td className="p-2.5 font-bold text-slate-800">{r.party_name || "-"}</td>
                        <td className="p-2.5 text-slate-600">{r.mokam || "-"}</td>

                        {dashboardSubTab === "stage1" && (
                          <>
                            <td className="p-2.5 text-right font-medium">{r.stage1_gross_weight !== null ? Number(r.stage1_gross_weight).toFixed(2) : "-"}</td>
                            <td className="p-2.5 text-right font-medium">{r.stage1_tare_weight !== null ? Number(r.stage1_tare_weight).toFixed(2) : "-"}</td>
                            <td className="p-2.5 text-right font-black text-sky-800">{r.stage1_net_weight !== null ? Number(r.stage1_net_weight).toFixed(2) : "-"}</td>
                          </>
                        )}

                        {dashboardSubTab === "stage2" && (
                          <>
                            <td className="p-2.5 text-right font-medium">{r.stage2_gross_weight !== null ? Number(r.stage2_gross_weight).toFixed(2) : "-"}</td>
                            <td className="p-2.5 text-right font-medium">{r.stage2_tare_weight !== null ? Number(r.stage2_tare_weight).toFixed(2) : "-"}</td>
                            <td className="p-2.5 text-right font-black text-amber-800">{r.stage2_net_weight !== null ? Number(r.stage2_net_weight).toFixed(2) : "-"}</td>
                          </>
                        )}

                        {dashboardSubTab === "stage3" && (
                          <>
                            <td className="p-2.5 text-right font-medium">{r.stage3_gross_weight !== null ? Number(r.stage3_gross_weight).toFixed(2) : "-"}</td>
                            <td className="p-2.5 text-right font-medium">{r.stage3_tare_weight !== null ? Number(r.stage3_tare_weight).toFixed(2) : "-"}</td>
                            <td className="p-2.5 text-right font-black text-emerald-800">{r.stage3_net_weight !== null ? Number(r.stage3_net_weight).toFixed(2) : "-"}</td>
                          </>
                        )}

                        {dashboardSubTab === "final" && (
                          <>
                            <td className="p-2.5 text-right font-medium text-slate-600">{r.stage1_net_weight !== null ? Number(r.stage1_net_weight).toFixed(2) : "-"}</td>
                            <td className="p-2.5 text-right font-medium text-slate-600">{r.stage2_net_weight !== null ? Number(r.stage2_net_weight).toFixed(2) : "-"}</td>
                            <td className="p-2.5 text-right font-medium text-slate-600">{r.stage3_net_weight !== null ? Number(r.stage3_net_weight).toFixed(2) : "-"}</td>
                            <td className="p-2.5 text-right font-black text-emerald-900 bg-emerald-50 border-l border-emerald-200">
                              {r.final_weight !== null ? Number(r.final_weight).toFixed(2) : "-"} KG
                            </td>
                          </>
                        )}

                        <td className="p-2.5 text-center">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider",
                              r.status === "OUT"
                                ? "bg-emerald-100 text-emerald-950 border border-emerald-300"
                                : r.stage2_completed
                                ? "bg-amber-100 text-amber-950 border border-amber-300"
                                : "bg-sky-100 text-sky-950 border border-sky-300"
                            )}
                          >
                            {r.status === "OUT" ? "OUT (Completed)" : r.stage2_completed ? "In Stage 3" : "IN (Stage 1)"}
                          </span>
                        </td>

                        <td className="p-2.5 text-center">
                          <button
                            onClick={() => setSelectedModalRecord(r)}
                            className="p-1 text-slate-600 hover:text-sky-800 hover:bg-slate-100 rounded cursor-pointer transition-all"
                            title="View Full Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* Modal View for Detailed Record Breakdown */}
        <WeighmentRecordModal
          record={selectedModalRecord}
          onClose={() => setSelectedModalRecord(null)}
        />
      </div>
    </LegacyLayout>
  );
}
