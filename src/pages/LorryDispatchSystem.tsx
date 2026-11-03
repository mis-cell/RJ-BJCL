import React, { useState, useEffect, useMemo, useRef } from "react";
import { useLiveAutoRefresh } from "../hooks/useLiveAutoRefresh";
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
  FileText,
  Bell,
  Settings,
  Users,
  Lock,
  LogOut,
  Sliders,
  Database,
  Printer,
  ChevronRight,
  Navigation,
  ShieldCheck,
  Shield,
  Activity,
  Download,
  Check,
  Trash2,
  AlertTriangle,
  RotateCcw,
  Zap,
  PackageCheck,
  Smartphone,
  EyeOff,
  Radio,
  FileDown
} from "lucide-react";
import LegacyLayout, {
  LegacyFieldset,
  LegacyButton
} from "../components/LegacyLayout";
import { supabase } from "../lib/supabase";
import { cn } from "../lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import MainGateSection from "../components/MainGateSection";
import MillWeighmentSection from "../components/MillWeighmentSection";
import ElectricWeighbridgeSection from "../components/ElectricWeighbridgeSection";
import DepartmentDashboardSection from "../components/DepartmentDashboardSection";
import { MASTER_BROKERS, MASTER_QUALITIES, MASTER_MOKAMS, MASTER_MARKAS } from "../data/masterData";

// ==========================================
// TYPES & INTERFACES (MODULARIZED)
// ==========================================
import {
  UserRole,
  DepartmentType,
  LorryStatus,
  LorryRecord,
  AppAlert,
  SystemSettings,
  MasterOptions,
  SystemUser,
  AuditLog
} from "../types/lorryDispatch.types";
import { WeighmentOperatorCard } from "../components/lorry-dispatch/WeighmentOperatorCard";
import { MasterListEditor } from "../components/lorry-dispatch/MasterListEditor";
import { LorryReceiptModal } from "../components/lorry-dispatch/LorryReceiptModal";

export type {
  UserRole,
  DepartmentType,
  LorryStatus,
  LorryRecord,
  AppAlert,
  SystemSettings,
  MasterOptions,
  SystemUser,
  AuditLog
};

// ==========================================
// DEFAULT MASTER & INITIAL DATA
// ==========================================

const DEFAULT_SETTINGS: SystemSettings = {
  millZeroOffsetKg: 0,
  electricZeroOffsetKg: 0,
  inactivityTimeoutMinutes: 5,
  geofenceRadiusMeters: 500,
  millLat: 22.6500, // Bally Jute Mill
  millLng: 88.3400,
  enforceGeofence: true,
  allowScreenCapture: true,
};

const DEFAULT_MASTERS: MasterOptions = {
  brokers: MASTER_BROKERS,
  qualities: MASTER_QUALITIES,
  mokams: MASTER_MOKAMS,
  markas: MASTER_MARKAS,
};

const DEFAULT_USERS: SystemUser[] = [
  { id: "usr_1", username: "admin", name: "Super Admin (System)", role: "SUPER_ADMIN", active: true, lastActive: "Just now" },
  { id: "usr_2", username: "gate1", name: "Ramesh Sharma (Main Gate)", role: "MAIN_GATE", active: true, lastActive: "2 mins ago" },
  { id: "usr_3", username: "mill_wb", name: "Suresh Patel (Mill Weighment)", role: "MILL_WEIGHTMENT", active: true, lastActive: "5 mins ago" },
  { id: "usr_4", username: "elec_wb", name: "Amit Mukherji (Electric WB)", role: "ELECTRIC_WEIGHTMENT", active: true, lastActive: "1 min ago" },
  { id: "usr_5", username: "store_mgr", name: "Pradeep Ghosh (Store/Yard)", role: "STORE_DEPT", active: true, lastActive: "10 mins ago" },
];

const INITIAL_LORRIES: LorryRecord[] = [];

// Calculate Haversine distance in meters
function getHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function LorryDispatchSystem({
  onNavigate,
}: {
  onNavigate?: (page: string) => void;
}) {
  // 1. STATE MANAGEMENT (OFFLINE-FIRST + LOCALSTORAGE RESILIENCE)
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>("MAIN_GATE");
  const [activeTab, setActiveTab] = useState<"operations" | "settings" | "masters" | "users" | "audit">("operations");
  
  // System Data
  const [lorries, setLorries] = useState<LorryRecord[]>(() => {
    const saved = localStorage.getItem("bjl_lorries");
    if (saved) {
      try {
        const parsed: LorryRecord[] = JSON.parse(saved);
        const filtered = parsed.filter(
          (l) =>
            l.id !== "lorry_101" &&
            l.id !== "lorry_102" &&
            l.id !== "lorry_103" &&
            l.lorryNo !== "WB-04-E-8821" &&
            l.lorryNo !== "WB-25-C-4410" &&
            l.lorryNo !== "WB-19-B-1192"
        );
        if (filtered.length > 0) return filtered;
      } catch (e) {
        console.warn("Error parsing saved lorries:", e);
      }
    }
    return INITIAL_LORRIES;
  });

  // Load live data from Supabase table lorry_weighments
  async function loadLorryWeighments() {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from("lorry_weighments")
        .select("*")
        .then(res => res, () => ({ data: null, error: new Error('Table unavailable') }));

      if (!error && data) {
        const loaded: LorryRecord[] = data.map((row: any) => {
          const millGross = Number(row.mill_gross_weight ?? row.stage1_gross_weight ?? 0);
          const millTare = Number(row.mill_tare_weight ?? row.stage1_tare_weight ?? 0);
          const elecGross = Number(row.electric_gross_weight ?? row.stage2_gross_weight ?? 0);
          const elecTare = Number(row.electric_tare_weight ?? row.stage2_tare_weight ?? 0);

          const millNet = millGross > 0 && millTare > 0 ? millGross - millTare : Number(row.gate_net_weight ?? 0);
          const elecNet = elecGross > 0 && elecTare > 0 ? elecGross - elecTare : 0;

          let finalNet = Number(row.gate_net_weight ?? 0);
          if (millNet > 0 && elecNet > 0) {
            finalNet = Math.round((millNet + elecNet) / 2);
          } else if (millNet > 0 || elecNet > 0) {
            finalNet = elecNet || millNet;
          }

          let dept: DepartmentType = "Jute";
          if (row.department) {
            const dStr = String(row.department).toLowerCase();
            if (dStr.includes("store")) dept = "Store";
            else if (dStr.includes("finish")) dept = "Finish Good";
            else if (dStr.includes("other")) dept = "Other";
          }

          let statusVal: LorryStatus = (row.status as LorryStatus) || "GATE_ENTRY";
          if (row.status === "GATE_ENTRY" && dept === "Jute") {
            statusVal = "WAITING_FOR_MILL_GROSS";
          }

          return {
            id: String(row.id),
            gatePassNo: row.gate_pass || row.ticket_number || `GP-${String(row.id).slice(0, 8)}`,
            lorryNo: row.lorry_no || row.lorry_number || "UNKNOWN",
            driverPhone: row.driver_number || row.driver_name || row.driver_phone || "+91 98300 00000",
            department: dept,
            broker: row.party_name || row.broker || "N/A",
            quality: row.description || row.grade || row.quality || "WN4",
            mokam: row.mokam || "AMBAGAN",
            marka: row.marka || "MJ",
            status: statusVal,
            inTime: row.in_time || row.created_at || new Date().toISOString(),
            outTime: row.out_time || row.out_date || "",
            entryDate: row.entry_date || row.created_at?.split('T')[0] || "",
            outDate: row.out_date || "",
            chalanNo: row.chalan_no || "",
            partyName: row.party_name || row.broker || "",
            description: row.description || "",
            quantity: Number(row.quantity || 0),
            unit: row.unit || "BALES",
            gateGrossWeight: Number(row.gate_gross_weight || 0),
            gateTareWeight: Number(row.gate_tare_weight || 0),
            gateNetWeight: Number(row.gate_net_weight || 0),
            outRemarks: row.out_remarks || "",
            grade: row.grade || "",
            currentStage: row.current_stage || "",
            millGrossWeight: millGross || undefined,
            millTareWeight: millTare || undefined,
            electricGrossWeight: elecGross || undefined,
            electricTareWeight: elecTare || undefined,
            millNetWeight: millNet || undefined,
            electricNetWeight: elecNet || undefined,
            finalNetWeight: finalNet || undefined,
            remarks: row.mill_remarks || row.out_remarks || row.remarks || "",
          };
        });

        setLorries(loaded);
      }
    } catch (err) {
      console.warn("Failed to load lorry_weighments:", err);
    }
  }

  useEffect(() => {
    loadLorryWeighments();
  }, []);

  useLiveAutoRefresh(loadLorryWeighments, [], { tables: ['lorry_weighments'] });

  const [settings, setSettings] = useState<SystemSettings>(() => {
    const saved = localStorage.getItem("bjl_settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_SETTINGS, ...parsed, allowScreenCapture: true };
      } catch {
        // fallback
      }
    }
    return { ...DEFAULT_SETTINGS, allowScreenCapture: true };
  });

  const [masters, setMasters] = useState<MasterOptions>(() => {
    const saved = localStorage.getItem("bjl_masters");
    return saved ? JSON.parse(saved) : DEFAULT_MASTERS;
  });

  // Fetch reference tables from Supabase and merge with DEFAULT_MASTERS so dropdown options are never blank
  useEffect(() => {
    async function loadMasterDataFromSupabase() {
      if (!supabase) return;
      try {
        const fetchSafe = async (fn: () => PromiseLike<any>) => {
          try {
            const res = await fn();
            return (res as any)?.data || [];
          } catch {
            return [];
          }
        };

        const [bRes, gRes, aRes, mRes, pRes, sRes] = await Promise.all([
          fetchSafe(() => supabase.from("broker_master").select("*")),
          fetchSafe(() => supabase.from("grade_master").select("*")),
          fetchSafe(() => supabase.from("agency_master").select("*")),
          fetchSafe(() => supabase.from("marka_master").select("*")),
          fetchSafe(() => supabase.from("purchase_master").select("broker, supplier")),
          fetchSafe(() => supabase.from("sauda_master").select("broker, supplier")),
        ]);

        const brokersSet = new Set<string>(MASTER_BROKERS);
        const qualitiesSet = new Set<string>(MASTER_QUALITIES);
        const mokamsSet = new Set<string>(MASTER_MOKAMS);
        const markasSet = new Set<string>(MASTER_MARKAS);

        if (Array.isArray(bRes)) {
          bRes.forEach((r: any) => {
            const val = r.broker_name || r.broker || r.name;
            if (val && typeof val === "string") brokersSet.add(val.trim());
          });
        }

        if (Array.isArray(pRes)) {
          pRes.forEach((r: any) => {
            if (r.broker) brokersSet.add(String(r.broker).trim());
            if (r.supplier) brokersSet.add(String(r.supplier).trim());
          });
        }

        if (Array.isArray(sRes)) {
          sRes.forEach((r: any) => {
            if (r.broker) brokersSet.add(String(r.broker).trim());
            if (r.supplier) brokersSet.add(String(r.supplier).trim());
          });
        }

        if (Array.isArray(gRes)) {
          gRes.forEach((r: any) => {
            const val = r.grade_name || r.stock_grade_code || r.grade || r.code;
            if (val && typeof val === "string") qualitiesSet.add(val.trim());
          });
        }

        if (Array.isArray(aRes)) {
          aRes.forEach((r: any) => {
            const val = r.agency_name || r.agency || r.area_name || r.area;
            if (val && typeof val === "string") mokamsSet.add(val.trim());
          });
        }

        if (Array.isArray(mRes)) {
          mRes.forEach((r: any) => {
            const val = r.marka_name || r.marka || r.marks;
            if (val && typeof val === "string") markasSet.add(val.trim());
          });
        }

        const updatedMasters: MasterOptions = {
          brokers: Array.from(brokersSet).filter(Boolean).sort(),
          qualities: Array.from(qualitiesSet).filter(Boolean).sort(),
          mokams: Array.from(mokamsSet).filter(Boolean).sort(),
          markas: Array.from(markasSet).filter(Boolean).sort(),
        };

        setMasters(updatedMasters);
        localStorage.setItem("bjl_masters", JSON.stringify(updatedMasters));
      } catch (err) {
        console.warn("Error fetching reference master tables:", err);
      }
    }
    loadMasterDataFromSupabase();
  }, []);

  const [users, setUsers] = useState<SystemUser[]>(() => {
    const saved = localStorage.getItem("bjl_users");
    return saved ? JSON.parse(saved) : DEFAULT_USERS;
  });

  const [alerts, setAlerts] = useState<AppAlert[]>(() => {
    const saved = localStorage.getItem("bjl_alerts");
    return saved ? JSON.parse(saved) : [
      {
        id: "alt_1",
        timestamp: new Date().toISOString(),
        title: "System Initialization",
        message: "Lorry Weighment & Dispatch System Online (Bally Jute Mill)",
        targetRole: "ALL",
        read: false,
        type: "info"
      }
    ];
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem("bjl_audit_logs");
    return saved ? JSON.parse(saved) : [
      {
        id: "log_1",
        timestamp: new Date().toISOString(),
        username: "admin",
        role: "SUPER_ADMIN",
        action: "SYSTEM_BOOT",
        details: "Lorry dispatch station initialized with geofence protection"
      }
    ];
  });

  // UI Modals & State
  const [isAlertDrawerOpen, setIsAlertDrawerOpen] = useState(false);
  const [isGpsSimOpen, setIsGpsSimOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedLorryForReceipt, setSelectedLorryForReceipt] = useState<LorryRecord | null>(null);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isScreenBlurred, setIsScreenBlurred] = useState(false);

  // Simulated GPS Coordinates of active user session
  const [userGps, setUserGps] = useState<{ lat: number; lng: number; label: string }>({
    lat: 22.6500, // Bally Jute Mill inside
    lng: 88.3400,
    label: "Inside Jute Mill Yard (0m)",
  });

  // Search & Filter for Lorries List
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [deptFilter, setDeptFilter] = useState<string>("ALL");

  // Inactivity Auto-logout tracker
  const [inactivitySeconds, setInactivitySeconds] = useState(0);
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem("bjl_lorries", JSON.stringify(lorries));
  }, [lorries]);

  useEffect(() => {
    localStorage.setItem("bjl_settings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem("bjl_masters", JSON.stringify(masters));
  }, [masters]);

  useEffect(() => {
    localStorage.setItem("bjl_users", JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem("bjl_alerts", JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    localStorage.setItem("bjl_audit_logs", JSON.stringify(auditLogs));
  }, [auditLogs]);

  // Helper to add audit logs
  const logAuditAction = (action: string, details: string) => {
    const newLog: AuditLog = {
      id: "log_" + Date.now(),
      timestamp: new Date().toISOString(),
      username: currentUserRole.toLowerCase(),
      role: currentUserRole,
      action,
      details,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Helper to trigger active real-time notification
  const triggerNotification = (
    title: string,
    message: string,
    targetRole: UserRole | "ALL",
    type: "info" | "success" | "warning" | "alert" = "info",
    lorryNo?: string,
    gatePassNo?: string
  ) => {
    const newAlert: AppAlert = {
      id: "alt_" + Date.now(),
      timestamp: new Date().toISOString(),
      title,
      message,
      targetRole,
      read: false,
      type,
      lorryNo,
      gatePassNo,
    };
    setAlerts((prev) => [newAlert, ...prev]);
  };

  // Geofence Distance Calculation
  const currentDistanceMeters = useMemo(() => {
    return getHaversineDistance(
      userGps.lat,
      userGps.lng,
      settings.millLat,
      settings.millLng
    );
  }, [userGps, settings.millLat, settings.millLng]);

  const isInsideGeofence = currentDistanceMeters <= settings.geofenceRadiusMeters;

  // 2. INACTIVITY AUTO-LOGOUT MONITOR
  useEffect(() => {
    // Disable auto-logout for MAIN_GATE as login/logout is not required for gate operations
    if (currentUserRole === "MAIN_GATE") {
      setInactivitySeconds(0);
      setShowInactivityWarning(false);
      return;
    }

    const resetTimer = () => {
      setInactivitySeconds(0);
      setShowInactivityWarning(false);
    };

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((evt) => window.addEventListener(evt, resetTimer));

    const interval = setInterval(() => {
      setInactivitySeconds((prev) => {
        const next = prev + 1;
        const maxSecs = settings.inactivityTimeoutMinutes * 60;
        
        if (next >= maxSecs - 30 && next < maxSecs) {
          setShowInactivityWarning(true);
        } else if (next >= maxSecs) {
          // Auto logout
          logAuditAction("AUTO_LOGOUT", "Session terminated due to operator inactivity");
          setCurrentUserRole("MAIN_GATE");
          setInactivitySeconds(0);
          setShowInactivityWarning(false);
          alert("Your session was automatically logged out due to inactivity.");
        }
        return next;
      });
    }, 1000);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, resetTimer));
      clearInterval(interval);
    };
  }, [settings.inactivityTimeoutMinutes, currentUserRole]);

  // 3. SCREEN & SCREENSHOT CAPTURE PROTECTION (DISABLED - SCREENSHOTS ALWAYS ALLOWED)
  useEffect(() => {
    setIsScreenBlurred(false);
  }, []);

  // Unread Alerts Count
  const unreadAlertsCount = useMemo(() => {
    return alerts.filter(
      (a) =>
        !a.read &&
        (a.targetRole === "ALL" || a.targetRole === currentUserRole)
    ).length;
  }, [alerts, currentUserRole]);

  // Filtered Lorries List
  const filteredLorries = useMemo(() => {
    return lorries.filter((l) => {
      const matchSearch =
        l.lorryNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.gatePassNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.broker.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.driverPhone.includes(searchTerm);

      const matchStatus =
        statusFilter === "ALL" ? true : l.status === statusFilter;

      const matchDept =
        deptFilter === "ALL" ? true : l.department === deptFilter;

      return matchSearch && matchStatus && matchDept;
    });
  }, [lorries, searchTerm, statusFilter, deptFilter]);

  // ==========================================
  // ACTION HANDLERS
  // ==========================================

  // A. MAIN GATE: ENTRY REGISTRATION
  const handleRegisterGateEntry = (formData: {
    lorryNo: string;
    driverPhone: string;
    department: DepartmentType;
    broker: string;
    quality: string;
    mokam: string;
    marka: string;
  }) => {
    if (settings.enforceGeofence && !isInsideGeofence) {
      alert(`GEOFENCE BREACH: You are ${currentDistanceMeters}m away from Bally Jute Mill. Geofence radius limit is ${settings.geofenceRadiusMeters}m.`);
      return;
    }

    const nextNumber = lorries.length + 1;
    const gatePassNo = `GP-2026-${String(new Date().getMonth() + 1).padStart(2, "0")}${String(new Date().getDate()).padStart(2, "0")}-${String(nextNumber).padStart(3, "0")}`;

    let initialStatus: LorryStatus = "WAITING_FOR_MILL_GROSS";
    if (formData.department === "Store") initialStatus = "STORE_PENDING";
    else if (formData.department === "Finish Good") initialStatus = "FINISH_GOOD_PENDING";
    else if (formData.department === "Other") initialStatus = "OTHER_PENDING";

    const newRecord: LorryRecord = {
      id: "lorry_" + Date.now(),
      gatePassNo,
      lorryNo: formData.lorryNo.toUpperCase(),
      driverPhone: formData.driverPhone,
      department: formData.department,
      broker: formData.broker,
      quality: formData.quality,
      mokam: formData.mokam,
      marka: formData.marka,
      status: initialStatus,
      inTime: new Date().toISOString(),
      entryGpsLocation: {
        lat: userGps.lat,
        lng: userGps.lng,
        distanceMeters: currentDistanceMeters,
      },
    };

    setLorries((prev) => [newRecord, ...prev]);

    // Persist to Supabase lorry_weighments table
    if (supabase) {
      supabase.from("lorry_weighments").insert({
        ticket_number: gatePassNo,
        gate_pass: gatePassNo,
        lorry_no: formData.lorryNo.toUpperCase(),
        driver_number: formData.driverPhone,
        driver_phone: formData.driverPhone,
        department: formData.department,
        party_name: formData.broker,
        broker: formData.broker,
        quality: formData.quality,
        grade: formData.quality,
        mokam: formData.mokam,
        marka: formData.marka,
        status: initialStatus,
        in_time: newRecord.inTime,
        created_at: newRecord.inTime,
      }).then((res) => {
        if (res.error) console.warn("Supabase insert lorry error:", res.error);
      });
    }

    logAuditAction("GATE_ENTRY_REGISTERED", `Gate pass ${gatePassNo} generated for Lorry ${newRecord.lorryNo} (${formData.department})`);

    // Real-Time Notification
    if (formData.department === "Jute") {
      triggerNotification(
        "New Jute Lorry Arrived",
        `Lorry ${newRecord.lorryNo} (${gatePassNo}) registered at Main Gate. Ready for Mill Gross Weighment.`,
        "MILL_WEIGHTMENT",
        "info",
        newRecord.lorryNo,
        gatePassNo
      );
    } else {
      triggerNotification(
        `New ${formData.department} Lorry Arrived`,
        `Lorry ${newRecord.lorryNo} (${gatePassNo}) registered at Main Gate for ${formData.department} verification.`,
        "STORE_DEPT",
        "info",
        newRecord.lorryNo,
        gatePassNo
      );
    }

    alert(`Gate Pass Created Successfully!\nGate Pass No: ${gatePassNo}\nLorry: ${newRecord.lorryNo}`);
  };

  // B. WEIGHMENT ACTION (MILL & ELECTRIC GROSS / TARE)
  const handleSaveWeighment = (
    lorryId: string,
    station: "MILL" | "ELECTRIC",
    type: "GROSS" | "TARE",
    weightKg: number
  ) => {
    if (settings.enforceGeofence && !isInsideGeofence) {
      alert(`GEOFENCE BREACH: Weighment recording blocked. Device is ${currentDistanceMeters}m from Bally Jute Mill.`);
      return;
    }

    setLorries((prev) =>
      prev.map((l) => {
        if (l.id !== lorryId) return l;

        const updated = { ...l };
        const nowIso = new Date().toISOString();

        if (station === "MILL" && type === "GROSS") {
          updated.millGrossWeight = weightKg;
          updated.millGrossTime = nowIso;
          updated.status = "ELECTRIC_GROSS_PENDING";

          triggerNotification(
            "Jute Lorry Ready for Electric Weighment",
            `Lorry ${l.lorryNo} recorded Mill Gross: ${weightKg.toLocaleString()} kg. Proceeding to Electric Weighbridge.`,
            "ELECTRIC_WEIGHTMENT",
            "info",
            l.lorryNo,
            l.gatePassNo
          );
        } else if (station === "ELECTRIC" && type === "GROSS") {
          updated.electricGrossWeight = weightKg;
          updated.electricGrossTime = nowIso;
          updated.status = "MILL_TARE_PENDING";

          triggerNotification(
            "Electric Gross Recorded",
            `Lorry ${l.lorryNo} recorded Electric Gross: ${weightKg.toLocaleString()} kg. Unloading & pending Mill Tare.`,
            "MILL_WEIGHTMENT",
            "info",
            l.lorryNo,
            l.gatePassNo
          );
        } else if (station === "MILL" && type === "TARE") {
          updated.millTareWeight = weightKg;
          updated.millTareTime = nowIso;
          updated.status = "ELECTRIC_TARE_PENDING";

          if (updated.millGrossWeight) {
            updated.millNetWeight = updated.millGrossWeight - weightKg;
          }

          triggerNotification(
            "Mill Tare Recorded",
            `Lorry ${l.lorryNo} recorded Mill Tare: ${weightKg.toLocaleString()} kg. Proceeding for Electric Tare.`,
            "ELECTRIC_WEIGHTMENT",
            "info",
            l.lorryNo,
            l.gatePassNo
          );
        } else if (station === "ELECTRIC" && type === "TARE") {
          updated.electricTareWeight = weightKg;
          updated.electricTareTime = nowIso;
          updated.status = "READY_FOR_GATE_EXIT";

          if (updated.electricGrossWeight) {
            updated.electricNetWeight = updated.electricGrossWeight - weightKg;
          }

          // Final net weight average or standard
          if (updated.millNetWeight && updated.electricNetWeight) {
            updated.finalNetWeight = Math.round((updated.millNetWeight + updated.electricNetWeight) / 2);
          } else {
            updated.finalNetWeight = updated.electricNetWeight || updated.millNetWeight;
          }

          triggerNotification(
            "Lorry Ready for Gate Exit",
            `Lorry ${l.lorryNo} (${l.gatePassNo}) weighment complete. Ready for final Main Gate Exit.`,
            "MAIN_GATE",
            "success",
            l.lorryNo,
            l.gatePassNo
          );
        }

        logAuditAction(`${station}_${type}_SAVED`, `Lorry ${l.lorryNo}: Recorded ${station} ${type} = ${weightKg} kg`);

        // Update database table
        if (supabase && l.id) {
          const updatePayload: any = { status: updated.status };
          if (station === "MILL" && type === "GROSS") {
            updatePayload.mill_gross_weight = weightKg;
            updatePayload.stage1_gross_weight = weightKg;
          } else if (station === "ELECTRIC" && type === "GROSS") {
            updatePayload.electric_gross_weight = weightKg;
            updatePayload.stage2_gross_weight = weightKg;
          } else if (station === "MILL" && type === "TARE") {
            updatePayload.mill_tare_weight = weightKg;
            updatePayload.stage1_tare_weight = weightKg;
            if (updated.millNetWeight) updatePayload.gate_net_weight = updated.millNetWeight;
          } else if (station === "ELECTRIC" && type === "TARE") {
            updatePayload.electric_tare_weight = weightKg;
            updatePayload.stage2_tare_weight = weightKg;
            if (updated.finalNetWeight) updatePayload.gate_net_weight = updated.finalNetWeight;
          }

          if (l.id.includes("-")) {
            supabase.from("lorry_weighments").update(updatePayload).eq("id", l.id).then();
          } else {
            supabase.from("lorry_weighments").update(updatePayload).eq("gate_pass", l.gatePassNo).then();
          }
        }

        return updated;
      })
    );
  };

  // C. DEPARTMENT UNLOAD / APPROVAL ACTION
  const handleDepartmentApprove = (lorryId: string) => {
    setLorries((prev) =>
      prev.map((l) => {
        if (l.id !== lorryId) return l;

        const updated: LorryRecord = {
          ...l,
          status: "READY_FOR_GATE_EXIT",
          deptApprovedBy: currentUserRole,
          deptApprovedTime: new Date().toISOString(),
        };

        logAuditAction("DEPT_UNLOAD_VERIFIED", `Department approved unloading for Lorry ${l.lorryNo}`);
        triggerNotification(
          "Department Verification Completed",
          `Lorry ${l.lorryNo} unloading verified by ${l.department} Department. Ready for Gate Exit.`,
          "MAIN_GATE",
          "success",
          l.lorryNo,
          l.gatePassNo
        );

        return updated;
      })
    );
  };

  // D. MAIN GATE OUT EXIT & RECEIPT
  const handleGateOutExit = (lorry: LorryRecord) => {
    const nowIso = new Date().toISOString();
    setLorries((prev) =>
      prev.map((l) => (l.id === lorry.id ? { ...l, status: "COMPLETED", outTime: nowIso } : l))
    );

    if (supabase && lorry.id) {
      if (lorry.id.includes("-")) {
        supabase.from("lorry_weighments").update({ status: "COMPLETED", out_time: nowIso }).eq("id", lorry.id).then();
      } else {
        supabase.from("lorry_weighments").update({ status: "COMPLETED", out_time: nowIso }).eq("gate_pass", lorry.gatePassNo).then();
      }
    }

    logAuditAction("GATE_OUT_COMPLETED", `Lorry ${lorry.lorryNo} gate-out completed`);
    setSelectedLorryForReceipt({ ...lorry, status: "COMPLETED", outTime: nowIso });
    setIsReceiptModalOpen(true);
  };

  // ==========================================
  // PDF & EXPORT GENERATORS
  // ==========================================

  // 1. Generate 3-Inch Weightment Receipt Slip PDF
  const generateReceiptSlipPdf = (lorry: LorryRecord) => {
    const doc = new jsPDF({
      unit: "mm",
      format: [76, 180], // 3-inch thermal slip size
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("BALLY JUTE COMPANY LIMITED", 38, 8, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("Bally, Howrah - 711201, West Bengal", 38, 12, { align: "center" });
    doc.text("LORRY WEIGHMENT & DISPATCH SLIP", 38, 15, { align: "center" });

    doc.setLineWidth(0.3);
    doc.line(4, 17, 72, 17);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(`GATE PASS: ${lorry.gatePassNo}`, 4, 21);
    doc.text(`LORRY NO: ${lorry.lorryNo}`, 4, 25);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(`Date/In-Time: ${lorry.entryDate ? lorry.entryDate + " " : ""}${lorry.inTime || "N/A"}`, 4, 29);
    doc.text(`Date/Out-Time: ${lorry.outDate ? lorry.outDate + " " : ""}${lorry.outTime || "Active"}`, 4, 33);
    doc.text(`Driver Phone: ${lorry.driverPhone || "N/A"}`, 4, 37);
    doc.text(`Department: ${lorry.department}`, 4, 41);
    doc.text(`Broker: ${lorry.broker || "N/A"}`, 4, 45);
    doc.text(`Quality: ${lorry.quality || lorry.description || "N/A"}`, 4, 49);
    doc.text(`Mokam: ${lorry.mokam || "N/A"} | Marka: ${lorry.marka || "N/A"}`, 4, 53);

    doc.line(4, 55, 72, 55);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("WEIGHMENT BREAKDOWN (KG)", 38, 59, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    let y = 63;

    if (lorry.millGrossWeight) {
      doc.text(`Mill Gross Weight:`, 4, y);
      doc.text(`${lorry.millGrossWeight.toLocaleString()} kg`, 72, y, { align: "right" });
      y += 4;
    }
    if (lorry.millTareWeight) {
      doc.text(`Mill Tare Weight:`, 4, y);
      doc.text(`${lorry.millTareWeight.toLocaleString()} kg`, 72, y, { align: "right" });
      y += 4;
    }
    if (lorry.millNetWeight) {
      doc.setFont("helvetica", "bold");
      doc.text(`Mill Net Weight:`, 4, y);
      doc.text(`${lorry.millNetWeight.toLocaleString()} kg`, 72, y, { align: "right" });
      doc.setFont("helvetica", "normal");
      y += 5;
    }

    if (lorry.electricGrossWeight) {
      doc.text(`Electric Gross Weight:`, 4, y);
      doc.text(`${lorry.electricGrossWeight.toLocaleString()} kg`, 72, y, { align: "right" });
      y += 4;
    }
    if (lorry.electricTareWeight) {
      doc.text(`Electric Tare Weight:`, 4, y);
      doc.text(`${lorry.electricTareWeight.toLocaleString()} kg`, 72, y, { align: "right" });
      y += 4;
    }
    if (lorry.electricNetWeight) {
      doc.setFont("helvetica", "bold");
      doc.text(`Electric Net Weight:`, 4, y);
      doc.text(`${lorry.electricNetWeight.toLocaleString()} kg`, 72, y, { align: "right" });
      doc.setFont("helvetica", "normal");
      y += 5;
    }

    doc.line(4, y, 72, y);
    y += 4;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(`FINAL NET DISPATCH:`, 4, y);
    doc.text(`${(lorry.finalNetWeight || 0).toLocaleString()} KG`, 72, y, { align: "right" });

    y += 8;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("------------------------------------------------", 38, y, { align: "center" });
    y += 5;
    doc.text("Weighbridge Operator Signature", 4, y);
    doc.text("Driver Signature", 72, y, { align: "right" });

    y += 10;
    doc.setFontSize(6);
    doc.text("System Generated Slip • Bally Jute Mill Dispatch", 38, y, { align: "center" });

    doc.save(`Receipt_Slip_${lorry.gatePassNo}.pdf`);
  };

  // 2. Generate Shift Ledger PDF Report
  const generateShiftLedgerPdf = () => {
    const doc = new jsPDF("landscape");

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("BALLY JUTE COMPANY LIMITED - DISPATCH & WEIGHMENT SHIFT LEDGER", 14, 15);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Report Date: ${new Date().toLocaleString("en-IN")}`, 14, 21);
    doc.text(`Total Lorries Count: ${lorries.length}`, 140, 21);

    const tableData = lorries.map((l, i) => [
      i + 1,
      l.gatePassNo,
      l.lorryNo,
      l.department,
      l.broker,
      l.quality,
      l.millGrossWeight ? `${l.millGrossWeight} kg` : "-",
      l.millTareWeight ? `${l.millTareWeight} kg` : "-",
      l.electricGrossWeight ? `${l.electricGrossWeight} kg` : "-",
      l.electricTareWeight ? `${l.electricTareWeight} kg` : "-",
      l.finalNetWeight ? `${l.finalNetWeight} kg` : "-",
      l.status,
    ]);

    autoTable(doc, {
      startY: 25,
      head: [
        [
          "#",
          "Gate Pass",
          "Lorry No",
          "Dept",
          "Broker",
          "Quality",
          "Mill Gross",
          "Mill Tare",
          "Elec Gross",
          "Elec Tare",
          "Net Wt",
          "Status",
        ],
      ],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 7 },
    });

    doc.save(`BJL_Shift_Ledger_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // 3. Export CSV Log
  const exportCsvLog = () => {
    const headers = [
      "Gate Pass No",
      "Lorry No",
      "Driver Phone",
      "Department",
      "Broker",
      "Quality",
      "Mokam",
      "Marka",
      "Status",
      "In Time",
      "Out Time",
      "Mill Gross (KG)",
      "Mill Tare (KG)",
      "Mill Net (KG)",
      "Electric Gross (KG)",
      "Electric Tare (KG)",
      "Electric Net (KG)",
      "Final Net (KG)",
    ];

    const rows = lorries.map((l) => [
      l.gatePassNo,
      l.lorryNo,
      l.driverPhone,
      l.department,
      l.broker,
      l.quality,
      l.mokam,
      l.marka,
      l.status,
      l.inTime,
      l.outTime || "",
      l.millGrossWeight || "",
      l.millTareWeight || "",
      l.millNetWeight || "",
      l.electricGrossWeight || "",
      l.electricTareWeight || "",
      l.electricNetWeight || "",
      l.finalNetWeight || "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Lorry_Dispatch_Log_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <LegacyLayout title="4.1 – Main Gate Lorry Entry & Exit" subtitle="Bally Jute Mill Gate Pass & Dispatch Management">
      <div className="relative w-full min-h-full bg-[#FDE7E6] text-[#D94B5A] font-sans flex flex-col select-none overflow-x-hidden p-2 sm:p-4 space-y-4">
      
      {/* SCREEN CAPTURE PROTECTION OVERLAY (TRIGGERS WHEN FOCUS LOST IF PROTECTION ENABLED) */}
      {isScreenBlurred && (
        <div className="fixed inset-0 z-[9999] bg-[#F7AFA8]/95 backdrop-blur-2xl flex flex-col items-center justify-center text-center p-6 space-y-4">
          <ShieldAlert className="w-16 h-16 text-rose-400 animate-pulse" />
          <h2 className="text-2xl font-black uppercase text-rose-200 tracking-wide">
            SENSITIVE INDUSTRIAL DATA PROTECTED
          </h2>
          <p className="text-[#FDE7E6] max-w-md text-sm leading-relaxed">
            Screen capture & background recording is restricted by Bally Jute Mill security policy. Return focus to active browser tab to resume operations.
          </p>
        </div>
      )}

      {/* INACTIVITY WARNING BANNER */}
      {showInactivityWarning && (
        <div className="bg-amber-100 border border-amber-300 text-amber-950 px-4 py-2 font-bold text-xs flex items-center justify-between shadow-md animate-bounce z-50 rounded-xl">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-800" />
            <span>
              INACTIVITY WARNING: Session will automatically lock in 30 seconds due to operator inactivity.
            </span>
          </div>
          <button
            onClick={() => setInactivitySeconds(0)}
            className="px-3 py-1 bg-[#F7AFA8] text-[#FDE7E6] rounded hover:bg-[#D94B5A] text-[11px] uppercase tracking-wider font-extrabold cursor-pointer transition-colors"
          >
            I'm Active
          </button>
        </div>
      )}

      {/* ==========================================
          1. TOP NAVIGATION BAR (BASE THEME)
         ========================================== */}
      <header className="bg-gradient-to-r from-[#D94B5A] via-[#E85A5A] to-[#D94B5A] border-b-2 border-[#D94B5A] px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between shrink-0 shadow-lg rounded-xl gap-3 text-white">
        {/* Left Brand Title & Role Info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-[#D94B5A] text-[#FDE7E6] border border-[#F06D6C] rounded-xl shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black tracking-tight uppercase truncate font-mono text-white">
                Bally Jute Mill Dispatch
              </h1>
              <span className="hidden sm:inline-block px-2 py-0.5 bg-[#D94B5A] border border-[#F06D6C] text-emerald-300 rounded text-[10px] font-mono font-bold uppercase">
                v4.8 Live
              </span>
            </div>
            <p className="text-[11px] text-emerald-200 truncate font-semibold">
              Active Station: <strong className="text-white uppercase font-black">{currentUserRole.replace("_", " ")}</strong>
            </p>
          </div>
        </div>

        {/* Center Role Switcher Quick Pill */}
        <div className="hidden lg:flex items-center gap-1.5 bg-[#D94B5A] p-1 border border-[#F06D6C] rounded-xl">
          {(["SUPER_ADMIN", "MAIN_GATE", "MILL_WEIGHTMENT", "ELECTRIC_WEIGHTMENT", "STORE_DEPT"] as UserRole[]).map((r) => (
            <button
              key={r}
              onClick={() => {
                setCurrentUserRole(r);
                logAuditAction("ROLE_SWITCH", `Switched active station view to ${r}`);
              }}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer whitespace-nowrap",
                currentUserRole === r
                  ? "bg-[#FDE7E6] text-[#D94B5A] font-black shadow-md"
                  : "text-white font-bold hover:text-white hover:bg-[#F7AFA8]"
              )}
            >
              {r === "SUPER_ADMIN" ? "Admin" : r.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* Right Action Controls: GPS Status, Bell Alerts, GPS Sim, Logout */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* GPS Geofence Status Pill */}
          <button
            onClick={() => setIsGpsSimOpen(true)}
            className={cn(
              "px-2.5 py-1 rounded-lg border text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer",
              isInsideGeofence
                ? "bg-emerald-100 border-emerald-400 text-emerald-900 hover:bg-emerald-200"
                : "bg-rose-100 border-rose-400 text-rose-900 hover:bg-rose-200"
            )}
            title="Click to open Geofence GPS Location Simulator"
          >
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline">{userGps.label}</span>
            <span className="md:hidden">{isInsideGeofence ? "IN RANGE" : "OUT OF RANGE"}</span>
          </button>

          {/* Real-time Notification Bell */}
          <button
            onClick={() => setIsAlertDrawerOpen(true)}
            className="relative p-2 bg-[#FDE7E6] hover:bg-[#FBCFCB] border border-[#FBCFCB] rounded-xl text-[#D94B5A] transition-colors cursor-pointer"
            title="Real-time Dispatch Alerts"
          >
            <Bell className="w-4 h-4" />
            {unreadAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-rose-600 text-white text-[9px] font-bold rounded-full animate-pulse">
                {unreadAlertsCount}
              </span>
            )}
          </button>

          {/* Role selector dropdown for small screens */}
          <div className="lg:hidden">
            <select
 id="currentuserrole_1257" name="currentuserrole" aria-label="currentuserrole"              value={currentUserRole}
              onChange={(e) => setCurrentUserRole(e.target.value as UserRole)}
              className="bg-[#FDE7E6] border border-[#FBCFCB] text-[#D94B5A] text-xs rounded-xl px-2 py-1.5 font-bold outline-none"
            >
              <option value="SUPER_ADMIN">Admin</option>
              <option value="MAIN_GATE">Main Gate</option>
              <option value="MILL_WEIGHTMENT">Mill WB</option>
              <option value="ELECTRIC_WEIGHTMENT">Electric WB</option>
              <option value="STORE_DEPT">Store Dept</option>
            </select>
          </div>

          {/* Logout Button (Not required for Main Gate station) */}
          {currentUserRole !== "MAIN_GATE" && (
            <button
              onClick={() => setIsLogoutConfirmOpen(true)}
              className="p-2 bg-rose-100 hover:bg-rose-200 border border-rose-300 text-rose-900 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              title="Exit Session"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          )}
        </div>
      </header>

      {/* ==========================================
          2. SECONDARY SUB-NAVIGATION BAR
         ========================================== */}
      <div className="bg-[#FBCFCB] border border-[#FBCFCB] px-4 sm:px-6 py-1.5 flex items-center justify-between shrink-0 text-xs overflow-x-auto scrollbar-none gap-4 rounded-xl">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 min-w-max">
          <button
            onClick={() => setActiveTab("operations")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg font-extrabold uppercase text-[11px] tracking-wider transition-all cursor-pointer flex items-center gap-1.5",
              activeTab === "operations"
                ? "bg-gradient-to-r from-[#D94B5A] to-[#E85A5A] text-white shadow-md border border-[#D94B5A]"
                : "text-[#D94B5A] hover:bg-[#FDE7E6] hover:text-[#D94B5A]"
            )}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Station Operations</span>
          </button>

          {currentUserRole === "SUPER_ADMIN" && (
            <>
              <button
                onClick={() => setActiveTab("settings")}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg font-extrabold uppercase text-[11px] tracking-wider transition-all cursor-pointer flex items-center gap-1.5",
                  activeTab === "settings"
                    ? "bg-gradient-to-r from-[#D94B5A] to-[#E85A5A] text-white shadow-md border border-[#D94B5A]"
                    : "text-[#D94B5A] hover:bg-[#FDE7E6] hover:text-[#D94B5A]"
                )}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>System Config</span>
              </button>

              <button
                onClick={() => setActiveTab("masters")}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg font-extrabold uppercase text-[11px] tracking-wider transition-all cursor-pointer flex items-center gap-1.5",
                  activeTab === "masters"
                    ? "bg-gradient-to-r from-[#D94B5A] to-[#E85A5A] text-white shadow-md border border-[#D94B5A]"
                    : "text-[#D94B5A] hover:bg-[#FDE7E6] hover:text-[#D94B5A]"
                )}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Master Data</span>
              </button>

              <button
                onClick={() => setActiveTab("users")}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg font-extrabold uppercase text-[11px] tracking-wider transition-all cursor-pointer flex items-center gap-1.5",
                  activeTab === "users"
                    ? "bg-gradient-to-r from-[#D94B5A] to-[#E85A5A] text-white shadow-md border border-[#D94B5A]"
                    : "text-[#D94B5A] hover:bg-[#FDE7E6] hover:text-[#D94B5A]"
                )}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Staff Users</span>
              </button>

              <button
                onClick={() => setActiveTab("audit")}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg font-extrabold uppercase text-[11px] tracking-wider transition-all cursor-pointer flex items-center gap-1.5",
                  activeTab === "audit"
                    ? "bg-gradient-to-r from-[#D94B5A] to-[#E85A5A] text-white shadow-md border border-[#D94B5A]"
                    : "text-[#D94B5A] hover:bg-[#FDE7E6] hover:text-[#D94B5A]"
                )}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Audit Logs</span>
              </button>
            </>
          )}
        </div>

        {/* Global Export & PDF Utilities */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={generateShiftLedgerPdf}
            className="px-2.5 py-1 bg-[#FDE7E6] hover:bg-[#FBCFCB] border border-[#FBCFCB] rounded-lg text-[#D94B5A] font-bold text-[11px] flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 text-[#D94B5A]" />
            <span className="hidden sm:inline">Shift PDF</span>
          </button>

          <button
            onClick={exportCsvLog}
            className="px-2.5 py-1 bg-[#FDE7E6] hover:bg-[#FBCFCB] border border-[#FBCFCB] rounded-lg text-[#D94B5A] font-bold text-[11px] flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* ==========================================
          3. MAIN VIEW CONTENT AREA
         ========================================== */}
      <main className="flex-1 p-3 sm:p-6 space-y-6 max-w-full overflow-x-hidden">

        {/* ==========================================
            TAB 1: OPERATIONAL STATIONS (ROLE-BASED)
           ========================================== */}
        {activeTab === "operations" && (
          <div className="space-y-6">

            {/* A. SUPER ADMIN DASHBOARD SUMMARY GRID */}
            {currentUserRole === "SUPER_ADMIN" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#FDE7E6] border border-[#FBCFCB] p-4 rounded-2xl shadow-sm text-[#D94B5A]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#D94B5A] uppercase tracking-wider">Total Dispatches</span>
                    <Truck className="w-5 h-5 text-[#D94B5A]" />
                  </div>
                  <div className="text-2xl font-black text-[#D94B5A] mt-2 font-mono">{lorries.length}</div>
                  <p className="text-[11px] text-[#D94B5A] mt-1">Active & completed lorry entries</p>
                </div>

                <div className="bg-[#FDE7E6] border border-[#FBCFCB] p-4 rounded-2xl shadow-sm text-[#D94B5A]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#D94B5A] uppercase tracking-wider">In-Yard Pending</span>
                    <Clock className="w-5 h-5 text-amber-700" />
                  </div>
                  <div className="text-2xl font-black text-amber-800 mt-2 font-mono">
                    {lorries.filter((l) => l.status !== "COMPLETED").length}
                  </div>
                  <p className="text-[11px] text-[#D94B5A] mt-1">Awaiting weighment / unloading</p>
                </div>

                <div className="bg-[#FDE7E6] border border-[#FBCFCB] p-4 rounded-2xl shadow-sm text-[#D94B5A]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#D94B5A] uppercase tracking-wider">Ready for Exit</span>
                    <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div className="text-2xl font-black text-emerald-800 mt-2 font-mono">
                    {lorries.filter((l) => l.status === "READY_FOR_GATE_EXIT").length}
                  </div>
                  <p className="text-[11px] text-[#D94B5A] mt-1">Cleared for Main Gate Exit</p>
                </div>

                <div className="bg-[#FDE7E6] border border-[#FBCFCB] p-4 rounded-2xl shadow-sm text-[#D94B5A]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#D94B5A] uppercase tracking-wider">Geofence Status</span>
                    <ShieldCheck className="w-5 h-5 text-[#D94B5A]" />
                  </div>
                  <div className="text-sm font-bold text-[#D94B5A] mt-2 font-mono flex items-center gap-2">
                    <span className={cn("w-2.5 h-2.5 rounded-full", settings.enforceGeofence ? "bg-emerald-600 animate-pulse" : "bg-slate-400")} />
                    {settings.enforceGeofence ? "ENFORCED (500m)" : "DISABLED"}
                  </div>
                  <p className="text-[11px] text-[#D94B5A] mt-1">Bally Jute Mill coordinates</p>
                </div>
              </div>
            )}

            {/* B. MAIN GATE INTERFACE */}
            {(currentUserRole === "MAIN_GATE" || currentUserRole === "SUPER_ADMIN") && (
              <MainGateSection
                lorries={lorries}
                masters={masters}
                onRegisterGateEntry={handleRegisterGateEntry}
                onGateOutExit={handleGateOutExit}
                onSelectLorry={(lorry) => {
                  setSelectedLorryForReceipt(lorry);
                  setIsReceiptModalOpen(true);
                }}
                triggerNotification={triggerNotification}
              />
            )}

            {/* C. MILL WEIGHMENT INTERFACE */}
            {(currentUserRole === "MILL_WEIGHTMENT" || currentUserRole === "SUPER_ADMIN") && (
              <MillWeighmentSection
                lorries={lorries}
                masters={masters}
                currentUserRole={currentUserRole}
                onSaveWeighment={handleSaveWeighment}
              />
            )}

            {/* D. ELECTRIC WEIGHBRIDGE STATION INTERFACE */}
            {(currentUserRole === "ELECTRIC_WEIGHTMENT" || currentUserRole === "SUPER_ADMIN") && (
              <ElectricWeighbridgeSection
                lorries={lorries}
                currentUserRole={currentUserRole}
                onSaveWeighment={handleSaveWeighment}
              />
            )}

            {/* E. STORE & DEPARTMENT DASHBOARD INTERFACE */}
            {(currentUserRole === "STORE_DEPT" || currentUserRole === "SUPER_ADMIN") && (
              <DepartmentDashboardSection
                lorries={lorries}
                currentUserRole={currentUserRole}
                onDepartmentApprove={handleDepartmentApprove}
              />
            )}

            {/* E. ALL DISPATCHES MASTER TABLE (WITH FILTERS & SEARCH) */}
            <div className="bg-[#FDE7E6] border border-[#FBCFCB] p-5 rounded-2xl shadow-sm space-y-4 text-[#D94B5A]">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#FBCFCB] pb-3">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-[#D94B5A]" />
                  <h2 className="text-sm font-black text-[#D94B5A] uppercase tracking-wider font-mono">
                    All Dispatch Ledger Register ({filteredLorries.length})
                  </h2>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#D94B5A] absolute left-2.5 top-2.5" />
                    <input
 id="search_lorry_gate_pass_br_1496" name="search_lorry_gate_pass_br" aria-label="Search lorry, gate pass, broker..."                      type="text"
                      placeholder="Search lorry, gate pass, broker..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-[#FDE7E6] border border-[#FBCFCB] text-xs text-[#D94B5A] pl-8 pr-3 py-1.5 rounded-xl outline-none focus:border-[#F7AFA8] w-48 sm:w-64 font-mono"
                    />
                  </div>

                  <select
 id="statusfilter_1505" name="statusfilter" aria-label="statusfilter"                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-[#FDE7E6] border border-[#FBCFCB] text-xs text-[#D94B5A] px-2.5 py-1.5 rounded-xl outline-none font-medium"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="WAITING_FOR_MILL_GROSS">Waiting Mill Gross</option>
                    <option value="ELECTRIC_GROSS_PENDING">Pending Elec Gross</option>
                    <option value="MILL_TARE_PENDING">Pending Mill Tare</option>
                    <option value="ELECTRIC_TARE_PENDING">Pending Elec Tare</option>
                    <option value="READY_FOR_GATE_EXIT">Ready Exit</option>
                    <option value="COMPLETED">Completed</option>
                  </select>

                  <select
 id="deptfilter_1519" name="deptfilter" aria-label="deptfilter"                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    className="bg-[#FDE7E6] border border-[#FBCFCB] text-xs text-[#D94B5A] px-2.5 py-1.5 rounded-xl outline-none font-medium"
                  >
                    <option value="ALL">All Departments</option>
                    <option value="Jute">Jute</option>
                    <option value="Store">Store</option>
                    <option value="Finish Good">Finish Good</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="w-full overflow-x-auto rounded-xl border border-[#FBCFCB] bg-[#FDE7E6]">
                <table className="w-full text-left text-xs text-[#D94B5A] min-w-[900px]">
                  <thead className="bg-[#FBCFCB] text-[#D94B5A] font-mono text-[10px] uppercase border-b border-[#FBCFCB]">
                    <tr>
                      <th className="p-3 font-bold">Gate Pass</th>
                      <th className="p-3 font-bold">Lorry No</th>
                      <th className="p-3 font-bold">Dept</th>
                      <th className="p-3 font-bold">Broker / Supplier</th>
                      <th className="p-3 font-bold">Quality</th>
                      <th className="p-3 text-right font-bold">Mill Net</th>
                      <th className="p-3 text-right font-bold">Elec Net</th>
                      <th className="p-3 text-right font-bold">Final Net</th>
                      <th className="p-3 font-bold">Status</th>
                      <th className="p-3 text-center font-bold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#FBCFCB] font-mono">
                    {filteredLorries.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-[#D94B5A]">
                          No matching dispatch entries found in ledger.
                        </td>
                      </tr>
                    ) : (
                      filteredLorries.map((l) => (
                        <tr key={l.id} className="hover:bg-[#FBCFCB]/50 transition-colors">
                          <td className="p-3 font-black text-[#D94B5A]">{l.gatePassNo}</td>
                          <td className="p-3 font-black text-[#D94B5A]">{l.lorryNo}</td>
                          <td className="p-3">{l.department}</td>
                          <td className="p-3 font-sans">{l.broker}</td>
                          <td className="p-3 font-sans">{l.quality}</td>
                          <td className="p-3 text-right font-bold text-[#D94B5A]">
                            {l.millNetWeight ? `${l.millNetWeight.toLocaleString()} kg` : "-"}
                          </td>
                          <td className="p-3 text-right font-bold text-[#D94B5A]">
                            {l.electricNetWeight ? `${l.electricNetWeight.toLocaleString()} kg` : "-"}
                          </td>
                          <td className="p-3 text-right font-bold text-emerald-800">
                            {l.finalNetWeight ? `${l.finalNetWeight.toLocaleString()} kg` : "-"}
                          </td>
                          <td className="p-3">
                            <span
                              className={cn(
                                "px-2 py-0.5 text-[10px] font-bold rounded-full uppercase border",
                                l.status === "COMPLETED"
                                  ? "bg-emerald-100 border-emerald-300 text-emerald-900"
                                  : l.status === "READY_FOR_GATE_EXIT"
                                  ? "bg-cyan-100 border-cyan-300 text-cyan-900"
                                  : "bg-amber-100 border-amber-300 text-amber-900"
                              )}
                            >
                              {l.status.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => {
                                setSelectedLorryForReceipt(l);
                                setIsReceiptModalOpen(true);
                              }}
                              className="px-2 py-1 bg-[#FDE7E6] hover:bg-[#FBCFCB] text-[#D94B5A] border border-[#FBCFCB] rounded text-[10px] font-bold cursor-pointer transition-colors shadow-xs"
                              title="View & Print Slip"
                            >
                              Slip
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ==========================================
            TAB 2: SUPER ADMIN CONFIGURATION SETTINGS
           ========================================== */}
        {activeTab === "settings" && currentUserRole === "SUPER_ADMIN" && (
          <div className="bg-[#FDE7E6] border border-[#FBCFCB] p-6 rounded-2xl shadow-sm space-y-6 max-w-3xl mx-auto text-[#D94B5A]">
            <div className="flex items-center gap-3 border-b border-[#FBCFCB] pb-4">
              <Sliders className="w-6 h-6 text-[#D94B5A]" />
              <div>
                <h2 className="text-base font-black text-[#D94B5A] uppercase tracking-wider font-mono">
                  System Configuration Panel
                </h2>
                <p className="text-xs text-[#D94B5A]">Adjust zero offsets, geofence parameters, and auto-logout rules</p>
              </div>
            </div>

            <div className="space-y-5 text-xs">
              {/* Zero Offsets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#FDE7E6] p-4 rounded-xl border border-[#FBCFCB]">
                <div>
                  <label className="font-bold text-[#D94B5A] uppercase block mb-1">
                    Mill Zero Offset Adjustment (KG): {settings.millZeroOffsetKg} kg
                  </label>
                  <input
 id="settings_millzerooffsetkg_1633" name="settings_millzerooffsetkg" aria-label="settings millzerooffsetkg"                    type="range"
                    min="-50"
                    max="50"
                    value={settings.millZeroOffsetKg}
                    onChange={(e) =>
                      setSettings({ ...settings, millZeroOffsetKg: Number(e.target.value) })
                    }
                    className="w-full accent-[#F7AFA8]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#D94B5A] uppercase block mb-1">
                    Electric Zero Offset Adjustment (KG): {settings.electricZeroOffsetKg} kg
                  </label>
                  <input
 id="settings_electriczerooffs_1649" name="settings_electriczerooffs" aria-label="settings electriczerooffs"                    type="range"
                    min="-50"
                    max="50"
                    value={settings.electricZeroOffsetKg}
                    onChange={(e) =>
                      setSettings({ ...settings, electricZeroOffsetKg: Number(e.target.value) })
                    }
                    className="w-full accent-[#F7AFA8]"
                  />
                </div>
              </div>

              {/* Geofence Settings */}
              <div className="bg-[#FDE7E6] p-4 rounded-xl border border-[#FBCFCB] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-[#D94B5A] uppercase">Enforce Geofencing Boundary</h3>
                    <p className="text-[11px] text-[#D94B5A]">Restrict weighment submission to Bally Jute Mill campus</p>
                  </div>
                  <input
 id="checkbox_1669" name="checkbox" aria-label="checkbox"                    type="checkbox"
                    checked={settings.enforceGeofence}
                    onChange={(e) =>
                      setSettings({ ...settings, enforceGeofence: e.target.checked })
                    }
                    className="w-5 h-5 accent-[#F7AFA8] cursor-pointer"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#D94B5A] uppercase block mb-1">
                    Allowed Geofence Radius (Meters): {settings.geofenceRadiusMeters} meters
                  </label>
                  <input
 id="settings_geofenceradiusme_1683" name="settings_geofenceradiusme" aria-label="settings geofenceradiusme"                    type="range"
                    min="100"
                    max="2000"
                    step="50"
                    value={settings.geofenceRadiusMeters}
                    onChange={(e) =>
                      setSettings({ ...settings, geofenceRadiusMeters: Number(e.target.value) })
                    }
                    className="w-full accent-[#F7AFA8]"
                  />
                </div>
              </div>

              {/* Inactivity & Security Controls */}
              <div className="bg-[#FDE7E6] p-4 rounded-xl border border-[#FBCFCB] space-y-3">
                <div>
                  <label htmlFor="inactivity_auto_logout_ti_1703" className="font-bold text-[#D94B5A] uppercase block mb-1">
                    Inactivity Auto-Logout Timeout (Minutes)
                  </label>
                  <input
                    id="inactivity_auto_logout_ti_1703"
                    name="inactivity_auto_logout_ti"
                    aria-label="Inactivity Auto-Logout Timeout (Minutes)"
                    type="number"
                    min="1"
                    max="60"
                    value={settings.inactivityTimeoutMinutes}
                    onChange={(e) =>
                      setSettings({ ...settings, inactivityTimeoutMinutes: Number(e.target.value) })
                    }
                    className="bg-[#FDE7E6] border border-[#FBCFCB] rounded-lg px-3 py-1.5 text-[#D94B5A] font-mono text-xs w-32 outline-none focus:border-[#F7AFA8]"
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  logAuditAction("SETTINGS_UPDATED", "Super Admin updated system parameters");
                  alert("System parameters updated successfully!");
                }}
                className="w-full py-2.5 bg-[#F7AFA8] hover:bg-[#D94B5A] text-[#FDE7E6] font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer"
              >
                Save Configuration Settings
              </button>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 3: MASTER DATA MANAGER
           ========================================== */}
        {activeTab === "masters" && currentUserRole === "SUPER_ADMIN" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Manage Brokers */}
            <MasterListEditor
              title="Brokers / Suppliers"
              items={masters.brokers}
              onAdd={(newItem) => setMasters({ ...masters, brokers: [...masters.brokers, newItem] })}
              onDelete={(item) => setMasters({ ...masters, brokers: masters.brokers.filter((b) => b !== item) })}
            />

            {/* Manage Qualities */}
            <MasterListEditor
              title="Raw Jute Qualities & Grades"
              items={masters.qualities}
              onAdd={(newItem) => setMasters({ ...masters, qualities: [...masters.qualities, newItem] })}
              onDelete={(item) => setMasters({ ...masters, qualities: masters.qualities.filter((q) => q !== item) })}
            />

            {/* Manage Mokams */}
            <MasterListEditor
              title="Mokams / Origin Depots"
              items={masters.mokams}
              onAdd={(newItem) => setMasters({ ...masters, mokams: [...masters.mokams, newItem] })}
              onDelete={(item) => setMasters({ ...masters, mokams: masters.mokams.filter((m) => m !== item) })}
            />

            {/* Manage Markas */}
            <MasterListEditor
              title="Jute Bale Markas"
              items={masters.markas}
              onAdd={(newItem) => setMasters({ ...masters, markas: [...masters.markas, newItem] })}
              onDelete={(item) => setMasters({ ...masters, markas: masters.markas.filter((mk) => mk !== item) })}
            />
          </div>
        )}

        {/* ==========================================
            TAB 4: STAFF USERS MANAGEMENT
           ========================================== */}
        {activeTab === "users" && currentUserRole === "SUPER_ADMIN" && (
          <div className="bg-[#FDE7E6] border border-[#FBCFCB] p-6 rounded-2xl shadow-sm space-y-4 text-[#D94B5A]">
            <div className="flex items-center justify-between border-b border-[#FBCFCB] pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#D94B5A]" />
                <h2 className="text-sm font-black text-[#D94B5A] uppercase tracking-wider font-mono">
                  Station Operator Login Accounts
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map((u) => (
                <div key={u.id} className="bg-[#FDE7E6] border border-[#FBCFCB] p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-[#D94B5A] font-mono">{u.username}</span>
                    <span className="px-2 py-0.5 bg-[#F7AFA8]/10 text-[#D94B5A] text-[10px] font-bold rounded uppercase">
                      {u.role.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-xs text-[#D94B5A]">{u.name}</p>
                  <p className="text-[10px] text-[#D94B5A] font-mono">Last active: {u.lastActive}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 5: AUDIT LOGS
           ========================================== */}
        {activeTab === "audit" && currentUserRole === "SUPER_ADMIN" && (
          <div className="bg-[#FDE7E6] border border-[#FBCFCB] p-6 rounded-2xl shadow-sm space-y-4 text-[#D94B5A]">
            <div className="flex items-center justify-between border-b border-[#FBCFCB] pb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-[#D94B5A]" />
                <h2 className="text-sm font-black text-[#D94B5A] uppercase tracking-wider font-mono">
                  System Audit Log Trail ({auditLogs.length})
                </h2>
              </div>
            </div>

            <div className="max-h-[500px] overflow-y-auto rounded-xl border border-[#FBCFCB] bg-[#FDE7E6]">
              <table className="w-full text-left text-xs text-[#D94B5A]">
                <thead className="bg-[#FBCFCB] text-[#D94B5A] font-mono text-[10px] uppercase border-b border-[#FBCFCB]">
                  <tr>
                    <th className="p-3 font-bold">Timestamp</th>
                    <th className="p-3 font-bold">Station / User</th>
                    <th className="p-3 font-bold">Action</th>
                    <th className="p-3 font-bold">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FBCFCB] font-mono text-[11px]">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#FBCFCB]/50">
                      <td className="p-3 text-[#D94B5A]">{new Date(log.timestamp).toLocaleString("en-IN")}</td>
                      <td className="p-3 font-bold text-[#D94B5A]">{String(log.role || '')} ({String(log.username || '')})</td>
                      <td className="p-3 font-bold text-emerald-800">{String(log.action || '')}</td>
                      <td className="p-3 text-[#D94B5A]">{typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details ?? '')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* ==========================================
          4. REAL-TIME ALERT DRAWER (SLIDE-OUT)
         ========================================== */}
      {isAlertDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-md bg-[#FDE7E6] border-l border-[#FBCFCB] h-full flex flex-col shadow-2xl p-4 space-y-4 text-[#D94B5A]">
            <div className="flex items-center justify-between border-b border-[#FBCFCB] pb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-800" />
                <h3 className="text-sm font-black text-[#D94B5A] uppercase tracking-wider font-mono">
                  Station Dispatch Alerts
                </h3>
              </div>
              <button
                onClick={() => setIsAlertDrawerOpen(false)}
                className="p-1 hover:bg-[#FBCFCB] rounded text-[#D94B5A]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {alerts.length === 0 ? (
                <div className="text-center py-10 text-[#D94B5A] text-xs">No active alerts.</div>
              ) : (
                alerts.map((a) => (
                  <div
                    key={a.id}
                    className={cn(
                      "p-3 rounded-xl border space-y-1 transition-all",
                      a.type === "success"
                        ? "bg-emerald-100 border-emerald-300 text-emerald-950"
                        : a.type === "alert"
                        ? "bg-rose-100 border-rose-300 text-rose-950"
                        : "bg-[#FDE7E6] border-[#FBCFCB] text-[#D94B5A]"
                    )}
                  >
                    <div className="flex items-center justify-between text-xs font-bold font-mono">
                      <span>{a.title}</span>
                      <span className="text-[10px] opacity-70">
                        {new Date(a.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-xs">{a.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          5. GEOFENCE GPS SIMULATOR MODAL
         ========================================== */}
      {isGpsSimOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FDE7E6] border border-[#FBCFCB] w-full max-w-lg p-5 rounded-2xl shadow-2xl space-y-4 text-[#D94B5A]">
            <div className="flex items-center justify-between border-b border-[#FBCFCB] pb-3">
              <div className="flex items-center gap-2">
                <Navigation className="w-5 h-5 text-[#D94B5A]" />
                <h3 className="text-sm font-black text-[#D94B5A] uppercase tracking-wider font-mono">
                  GPS Location Simulator (Development)
                </h3>
              </div>
              <button onClick={() => setIsGpsSimOpen(false)} className="text-[#D94B5A] hover:text-[#D94B5A]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#D94B5A]">
              Mock operator device location to test Bally Jute Mill geofence boundary enforcement ({settings.geofenceRadiusMeters}m radius).
            </p>

            <div className="space-y-2">
              {[
                { label: "Inside Jute Mill Yard (0m)", lat: 22.6500, lng: 88.3400 },
                { label: "Gate Entrance (120m)", lat: 22.6510, lng: 88.3408 },
                { label: "Weighbridge Bay (210m)", lat: 22.6488, lng: 88.3392 },
                { label: "Outside Mill Area (2500m)", lat: 22.6700, lng: 88.3600 },
              ].map((loc) => (
                <button
                  key={loc.label}
                  onClick={() => {
                    setUserGps({ lat: loc.lat, lng: loc.lng, label: loc.label });
                    setIsGpsSimOpen(false);
                    logAuditAction("GPS_SIMULATED", `GPS position set to ${loc.label}`);
                  }}
                  className="w-full text-left p-3 bg-[#FDE7E6] hover:bg-[#FBCFCB] border border-[#FBCFCB] rounded-xl text-xs font-bold text-[#D94B5A] flex items-center justify-between cursor-pointer transition-colors"
                >
                  <span>{loc.label}</span>
                  <span className="font-mono text-[10px] text-[#D94B5A]">
                    {loc.lat}, {loc.lng}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <LorryReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        lorry={selectedLorryForReceipt}
        onGeneratePdf={generateReceiptSlipPdf}
      />

      {/* LOGOUT CONFIRMATION MODAL */}
      {isLogoutConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FDE7E6] border border-[#FBCFCB] w-full max-w-xs p-5 rounded-2xl shadow-2xl space-y-4 text-center text-[#D94B5A]">
            <LogOut className="w-10 h-10 text-rose-800 mx-auto" />
            <h3 className="text-sm font-black text-[#D94B5A] uppercase tracking-wider font-mono">
              Confirm Station Exit?
            </h3>
            <p className="text-xs text-[#D94B5A]">Are you sure you want to end your current operator session?</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsLogoutConfirmOpen(false)}
                className="flex-1 py-2 bg-[#FBCFCB] text-[#D94B5A] text-xs font-bold rounded-xl cursor-pointer hover:bg-[#FBCFCB]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setIsLogoutConfirmOpen(false);
                  setCurrentUserRole("MAIN_GATE");
                  logAuditAction("MANUAL_LOGOUT", "Operator exited active session");
                }}
                className="flex-1 py-2 bg-rose-800 hover:bg-rose-900 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </LegacyLayout>
  );
}
