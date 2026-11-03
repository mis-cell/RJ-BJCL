import React, { useState, useMemo } from "react";
import {
  Truck,
  Scale,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  MapPin,
  List,
  Kanban,
  LayoutGrid,
  Plus,
  QrCode,
  Users,
  ShieldAlert,
  RefreshCw,
  X,
  Bell,
  ArrowRight,
  Eye,
  FileText
} from "lucide-react";
import { LorryRecord, DepartmentType, LorryStatus, UserRole } from "../pages/LorryDispatchSystem";
import { cn } from "../lib/utils";

function safeStr(val: any, fallback = "N/A"): string {
  if (val === null || val === undefined || val === "") return fallback;
  if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
    return String(val);
  }
  if (typeof val === "object") {
    if (typeof val.name === "string") return val.name;
    if (typeof val.supp_name === "string") return val.supp_name;
    if (typeof val.brok_name === "string") return val.brok_name;
    if (typeof val.supplier_name === "string") return val.supplier_name;
    if (typeof val.broker_name === "string") return val.broker_name;
    if (val.supplier) return safeStr(val.supplier, fallback);
    if (val.broker) return safeStr(val.broker, fallback);
    return fallback;
  }
  return fallback;
}

interface MainGateSectionProps {
  lorries: LorryRecord[];
  masters: {
    brokers: string[];
    qualities: string[];
    mokams: string[];
    markas: string[];
  };
  onRegisterGateEntry: (formData: {
    lorryNo: string;
    driverPhone: string;
    department: DepartmentType;
    broker: string;
    quality: string;
    mokam: string;
    marka: string;
  }) => void;
  onGateOutExit: (lorry: LorryRecord) => void;
  onSelectLorry: (lorry: LorryRecord) => void;
  triggerNotification: (
    title: string,
    message: string,
    targetRole: UserRole | "ALL",
    type?: "info" | "success" | "warning" | "alert",
    lorryNo?: string,
    gatePassNo?: string
  ) => void;
}

export default function MainGateSection({
  lorries,
  masters,
  onRegisterGateEntry,
  onGateOutExit,
  onSelectLorry,
  triggerNotification
}: MainGateSectionProps) {
  // Local state
  const [activeSubTab, setActiveSubTab] = useState<"map" | "live_board" | "kanban">("map");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNodeFilter, setSelectedNodeFilter] = useState<string | null>(null);
  const [dashboardViewMode, setDashboardViewMode] = useState<"queue" | "master_table">("queue");
  const [inspectLorryModal, setInspectLorryModal] = useState<LorryRecord | null>(null);

  // FAB Speed Dial State
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<"entry" | "qr" | "handover" | "incident" | null>(null);

  // Handover & Incident Form States
  const [handoverNotes, setHandoverNotes] = useState("");
  const [incidentData, setIncidentData] = useState({ category: "Unscheduled Entry", severity: "Medium", details: "" });
  const [qrCodeInput, setQrCodeInput] = useState("");

  // Notification Banner State
  const [notificationBanner, setNotificationBanner] = useState<{
    show: boolean;
    title: string;
    message: string;
  }>({
    show: true,
    title: "System Online ⚖️",
    message: "Main Gate Dispatch Station synchronized with Mill & Electric Weighbridges."
  });

  // KPI Computations
  const todayEntryCount = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return lorries.filter((l) => l.inTime.startsWith(today)).length;
  }, [lorries]);

  const pendingQueueCount = useMemo(() => {
    return lorries.filter((l) => l.status !== "COMPLETED").length;
  }, [lorries]);

  const completedExitsCount = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return lorries.filter((l) => l.status === "COMPLETED" && (l.outTime || "").startsWith(today)).length;
  }, [lorries]);

  const overdueCount = useMemo(() => {
    const now = Date.now();
    return lorries.filter((l) => {
      if (l.status === "COMPLETED") return false;
      const inMs = new Date(l.inTime).getTime();
      return now - inMs > 86400000; // > 24 Hours
    }).length;
  }, [lorries]);

  // Realtime Filtered Lorries
  const filteredLorries = useMemo(() => {
    return lorries.filter((l) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        l.lorryNo.toLowerCase().includes(q) ||
        l.gatePassNo.toLowerCase().includes(q) ||
        l.broker.toLowerCase().includes(q) ||
        l.department.toLowerCase().includes(q) ||
        l.quality.toLowerCase().includes(q) ||
        l.status.toLowerCase().includes(q);

      let matchNode = true;
      if (selectedNodeFilter) {
        if (selectedNodeFilter === "MAIN_GATE") matchNode = l.status === "GATE_ENTRY" || l.status === "WAITING_FOR_MILL_GROSS";
        else if (selectedNodeFilter === "MILL_SCALE") matchNode = l.status === "WAITING_FOR_MILL_GROSS" || l.status === "MILL_TARE_PENDING";
        else if (selectedNodeFilter === "YARDS") matchNode = ["STORE_PENDING", "FINISH_GOOD_PENDING", "OTHER_PENDING", "ELECTRIC_GROSS_PENDING"].includes(l.status);
        else if (selectedNodeFilter === "ELECTRIC_SCALE") matchNode = l.status === "ELECTRIC_GROSS_PENDING" || l.status === "ELECTRIC_TARE_PENDING";
        else if (selectedNodeFilter === "EXIT_GATE") matchNode = l.status === "READY_FOR_GATE_EXIT";
      }

      return matchQuery && matchNode;
    });
  }, [lorries, searchQuery, selectedNodeFilter]);

  // Elapsed time helper
  const getElapsedTimeText = (inTimeStr: string) => {
    const diffMs = Date.now() - new Date(inTimeStr).getTime();
    const hours = Math.floor(diffMs / 3600000);
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `${days} Day${days > 1 ? "s" : ""} Inside`;
    }
    return `${hours} Hrs Inside`;
  };

  const isOverdue = (inTimeStr: string) => {
    return Date.now() - new Date(inTimeStr).getTime() > 86400000;
  };

  return (
    <div className="space-y-6 text-[#D94B5A]">
      
      {/* REALTIME PUSH NOTIFICATIONS BANNER */}
      {notificationBanner.show && (
        <div className="bg-[#EFF6FF] border-2 border-blue-600 rounded-2xl p-3.5 shadow-md flex items-center justify-between gap-3 text-blue-950 animate-fade-in">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-blue-600 text-white rounded-xl text-xs font-bold shrink-0">
              <Bell className="w-4 h-4 animate-bounce" />
            </span>
            <div>
              <h4 className="text-xs font-extrabold uppercase font-mono tracking-wider text-blue-900">
                {notificationBanner.title}
              </h4>
              <p className="text-xs font-medium text-blue-800">{notificationBanner.message}</p>
            </div>
          </div>
          <button
            onClick={() => setNotificationBanner({ ...notificationBanner, show: false })}
            className="p-1 hover:bg-blue-200 rounded-lg text-blue-900 cursor-pointer font-bold text-xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* A. COMMAND HEADER & SHIFT TIMING CARD */}
      <div className="bg-[#FDE7E6] border border-[#FBCFCB] p-4 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#F7AFA8] text-[#FDE7E6] rounded-2xl shrink-0 shadow-xs">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black uppercase font-mono text-[#D94B5A]">
                Main Gate Operator Station
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-100 border border-emerald-400 text-emerald-950 rounded-full text-[10px] font-extrabold uppercase font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                Realtime Online
              </span>
            </div>
            <p className="text-xs text-[#D94B5A] font-medium mt-0.5">
              Active Operator Session • <strong>Shift A (06:00 - 14:00 IST)</strong> • Bally Jute Mill
            </p>
          </div>
        </div>

        <button
          onClick={() => setActiveModal("entry")}
          className="px-4 py-2.5 bg-[#F7AFA8] hover:bg-[#D94B5A] text-[#FDE7E6] font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Register Gate Entry</span>
        </button>
      </div>

      {/* KPI METRICS GRID (4 ADAPTIVE CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Today's Entry */}
        <div className="bg-[#F7AFA8] text-[#FDE7E6] p-4 rounded-2xl shadow-sm space-y-1 border border-[#D94B5A]">
          <div className="flex items-center justify-between text-[#FBCFCB]">
            <span className="text-[11px] font-extrabold uppercase tracking-wider font-mono">Today's Entries</span>
            <Truck className="w-4 h-4 text-[#FDE7E6]" />
          </div>
          <div className="text-2xl font-black font-mono tracking-tight">{todayEntryCount}</div>
          <p className="text-[10px] text-[#FBCFCB]">Cumulative registered today</p>
        </div>

        {/* 2. Pending Queue */}
        <div className="bg-amber-500 text-amber-950 p-4 rounded-2xl shadow-sm space-y-1 border border-amber-600">
          <div className="flex items-center justify-between text-amber-900">
            <span className="text-[11px] font-extrabold uppercase tracking-wider font-mono">Pending Queue</span>
            <Clock className="w-4 h-4 text-amber-950" />
          </div>
          <div className="text-2xl font-black font-mono tracking-tight">{pendingQueueCount}</div>
          <p className="text-[10px] text-amber-900 font-semibold">Active inside mill facility</p>
        </div>

        {/* 3. Completed Exits */}
        <div className="bg-emerald-700 text-white p-4 rounded-2xl shadow-sm space-y-1 border border-emerald-800">
          <div className="flex items-center justify-between text-emerald-200">
            <span className="text-[11px] font-extrabold uppercase tracking-wider font-mono">Completed Exits</span>
            <CheckCircle2 className="w-4 h-4 text-white" />
          </div>
          <div className="text-2xl font-black font-mono tracking-tight">{completedExitsCount}</div>
          <p className="text-[10px] text-emerald-100">Checked out & cleared today</p>
        </div>

        {/* 4. Overdue / Bottleneck Alert (>24h) */}
        <div className="bg-rose-700 text-white p-4 rounded-2xl shadow-sm space-y-1 border border-rose-800">
          <div className="flex items-center justify-between text-rose-200">
            <span className="text-[11px] font-extrabold uppercase tracking-wider font-mono">Overdue Alert (&gt;24h)</span>
            <AlertTriangle className="w-4 h-4 text-white animate-pulse" />
          </div>
          <div className="text-2xl font-black font-mono tracking-tight">{overdueCount}</div>
          <p className="text-[10px] text-rose-100 font-semibold">Delayed lorries inside facility</p>
        </div>
      </div>

      {/* B. INTELLIGENT COMMAND & SEARCH BAR */}
      <div className="bg-[#FDE7E6] border border-[#FBCFCB] p-3 rounded-2xl shadow-xs">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-[#D94B5A] absolute left-3.5 top-3" />
          <input
 id="search_by_lorry_no_broker_258" name="search_by_lorry_no_broker" aria-label="Search by Lorry No, Broker, Gate Pass, or run AI commands (e.g., 'Show Jute')..."            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Lorry No, Broker, Gate Pass, or run AI commands (e.g., 'Show Jute')..."
            className="w-full bg-[#FDE7E6] border border-[#FBCFCB] text-xs text-[#D94B5A] font-mono pl-10 pr-10 py-2.5 rounded-xl outline-none focus:border-[#F7AFA8] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 text-[#D94B5A] hover:text-[#D94B5A] text-xs font-bold"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* C. TAB SYSTEM (3 INTERACTIVE VIEWS) */}
      <div className="bg-[#FDE7E6] border border-[#FBCFCB] rounded-2xl p-4 shadow-sm space-y-4">
        
        {/* Sub-tab Headers */}
        <div className="flex items-center justify-between border-b border-[#FBCFCB] pb-3 overflow-x-auto gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveSubTab("map")}
              className={cn(
                "px-3.5 py-1.5 rounded-xl font-extrabold uppercase text-[11px] tracking-wider transition-all cursor-pointer flex items-center gap-1.5",
                activeSubTab === "map"
                  ? "bg-[#F7AFA8] text-[#FDE7E6] shadow-sm"
                  : "bg-[#FDE7E6] text-[#D94B5A] hover:text-[#D94B5A] border border-[#FBCFCB]"
              )}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>📊 Overview Map (Digital Twin)</span>
            </button>

            <button
              onClick={() => setActiveSubTab("live_board")}
              className={cn(
                "px-3.5 py-1.5 rounded-xl font-extrabold uppercase text-[11px] tracking-wider transition-all cursor-pointer flex items-center gap-1.5",
                activeSubTab === "live_board"
                  ? "bg-[#F7AFA8] text-[#FDE7E6] shadow-sm"
                  : "bg-[#FDE7E6] text-[#D94B5A] hover:text-[#D94B5A] border border-[#FBCFCB]"
              )}
            >
              <List className="w-3.5 h-3.5" />
              <span>🛫 Airport-Style Live Board</span>
            </button>

            <button
              onClick={() => setActiveSubTab("kanban")}
              className={cn(
                "px-3.5 py-1.5 rounded-xl font-extrabold uppercase text-[11px] tracking-wider transition-all cursor-pointer flex items-center gap-1.5",
                activeSubTab === "kanban"
                  ? "bg-[#F7AFA8] text-[#FDE7E6] shadow-sm"
                  : "bg-[#FDE7E6] text-[#D94B5A] hover:text-[#D94B5A] border border-[#FBCFCB]"
              )}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>📋 Kanban Queue Board</span>
            </button>
          </div>

          {selectedNodeFilter && (
            <button
              onClick={() => setSelectedNodeFilter(null)}
              className="px-2.5 py-1 bg-amber-100 border border-amber-300 text-amber-900 rounded-lg text-[10px] font-bold uppercase font-mono flex items-center gap-1 shrink-0"
            >
              <span>Filter: {selectedNodeFilter}</span>
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* 1. OVERVIEW MAP TAB (DIGITAL TWIN NODE FLOW) */}
        {activeSubTab === "map" && (
          <div className="space-y-4">
            <p className="text-xs text-[#D94B5A] font-medium">
              Click any physical factory node to instantly filter lorries operating at that stage:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {[
                { id: "MAIN_GATE", title: "1. Main Gate", desc: "Entry Verification", icon: Truck },
                { id: "MILL_SCALE", title: "2. Mill Scale", desc: "Gross / Tare Weighment", icon: Scale },
                { id: "YARDS", title: "3. Unloading Yards", desc: "Jute / Store / Finish", icon: LayoutGrid },
                { id: "ELECTRIC_SCALE", title: "4. Electric Scale", desc: "Gross / Tare Check", icon: Scale },
                { id: "EXIT_GATE", title: "5. Exit Gate", desc: "Final Pass & Out", icon: CheckCircle2 },
              ].map((node, idx) => {
                const IconComp = node.icon;
                const isSelected = selectedNodeFilter === node.id;
                return (
                  <button
                    key={node.id}
                    onClick={() => setSelectedNodeFilter(isSelected ? null : node.id)}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 relative shadow-xs",
                      isSelected
                        ? "bg-[#F7AFA8] text-[#FDE7E6] border-[#F7AFA8] shadow-md ring-2 ring-[#F7AFA8]"
                        : "bg-[#FDE7E6] text-[#D94B5A] border-[#FBCFCB] hover:border-[#F7AFA8]"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <IconComp className={cn("w-5 h-5", isSelected ? "text-amber-400" : "text-[#D94B5A]")} />
                      <span className={cn("text-[9px] font-mono font-bold px-1.5 py-0.5 rounded", isSelected ? "bg-white/20 text-white" : "bg-[#F7AFA8]/10 text-[#D94B5A]")}>
                        Node #{idx + 1}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase font-mono">{node.title}</h4>
                      <p className={cn("text-[10px]", isSelected ? "text-[#FBCFCB]" : "text-[#D94B5A]")}>{node.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. AIRPORT-STYLE LIVE BOARD TAB */}
        {activeSubTab === "live_board" && (
          <div className="bg-[#1E1E1E] border-2 border-[#F7AFA8] rounded-xl p-4 space-y-3 font-mono text-[#FDE7E6] shadow-inner">
            <div className="flex items-center justify-between border-b border-zinc-700 pb-2">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                ✈️ AIRPORT-STYLE DISPATCH TIMETABLE BOARD
              </span>
              <span className="text-[10px] text-emerald-400 font-bold">LIVE SYNC ACTIVE</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="text-amber-400 border-b border-zinc-700 text-[10px] uppercase">
                  <tr>
                    <th className="py-2 px-3">Gate Pass</th>
                    <th className="py-2 px-3">Lorry No</th>
                    <th className="py-2 px-3">Department</th>
                    <th className="py-2 px-3">In-Time</th>
                    <th className="py-2 px-3">Current State</th>
                    <th className="py-2 px-3 text-right">Elapsed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {filteredLorries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-zinc-500">
                        No active dispatch records on timetable board.
                      </td>
                    </tr>
                  ) : (
                    filteredLorries.map((l) => (
                      <tr key={l.id} className="hover:bg-zinc-800/60 transition-colors">
                        <td className="py-2.5 px-3 text-amber-300 font-bold">{l.gatePassNo}</td>
                        <td className="py-2.5 px-3 text-emerald-400 font-black text-sm">{l.lorryNo}</td>
                        <td className="py-2.5 px-3 text-zinc-300">{l.department}</td>
                        <td className="py-2.5 px-3 text-zinc-400 text-[11px]">{new Date(l.inTime).toLocaleTimeString("en-IN")}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 bg-emerald-950 border border-emerald-500 text-emerald-300 text-[10px] font-bold rounded uppercase">
                            {l.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-amber-400 text-[11px]">
                          {getElapsedTimeText(l.inTime)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. KANBAN QUEUE BOARD TAB */}
        {activeSubTab === "kanban" && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {[
              {
                title: "1. Gate Processing",
                statuses: ["GATE_ENTRY", "WAITING_FOR_MILL_GROSS"],
                bgColor: "bg-[#FBCFCB]"
              },
              {
                title: "2. Active Weighment",
                statuses: ["ELECTRIC_GROSS_PENDING", "MILL_TARE_PENDING", "ELECTRIC_TARE_PENDING"],
                bgColor: "bg-amber-100"
              },
              {
                title: "3. In-Dept Processing",
                statuses: ["STORE_PENDING", "FINISH_GOOD_PENDING", "OTHER_PENDING"],
                bgColor: "bg-cyan-100"
              },
              {
                title: "4. Outbound Exit Ready",
                statuses: ["READY_FOR_GATE_EXIT"],
                bgColor: "bg-emerald-100"
              }
            ].map((col) => {
              const colLorries = filteredLorries.filter((l) => col.statuses.includes(l.status));
              return (
                <div key={col.title} className="bg-[#FDE7E6] border border-[#FBCFCB] rounded-xl p-3 space-y-3">
                  <div className="flex items-center justify-between border-b border-[#FBCFCB] pb-2">
                    <h4 className="text-xs font-black uppercase font-mono text-[#D94B5A]">{col.title}</h4>
                    <span className="px-2 py-0.5 bg-[#F7AFA8] text-[#FDE7E6] text-[10px] font-mono font-bold rounded-full">
                      {colLorries.length}
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                    {colLorries.length === 0 ? (
                      <div className="text-center py-6 text-[11px] text-[#D94B5A] font-mono">Empty Stage</div>
                    ) : (
                      colLorries.map((l) => (
                        <div
                          key={l.id}
                          onClick={() => onSelectLorry(l)}
                          className="bg-[#FDE7E6] border border-[#FBCFCB] rounded-xl p-3 space-y-2 hover:border-[#F7AFA8] transition-all cursor-pointer shadow-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black font-mono text-[#D94B5A]">{l.lorryNo}</span>
                            <span className="text-[10px] font-mono text-[#D94B5A]">{l.gatePassNo}</span>
                          </div>
                          <p className="text-[10px] text-[#D94B5A] font-medium truncate">Broker: {l.broker}</p>
                          <div className="flex items-center justify-between text-[10px] font-mono font-bold pt-1 border-t border-[#FBCFCB]/60">
                            <span className="text-[#D94B5A]">{l.department}</span>
                            <span className={cn(isOverdue(l.inTime) ? "text-rose-700" : "text-amber-800")}>
                              {getElapsedTimeText(l.inTime)}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. MAIN GATE DASHBOARD (ACTIVE QUEUE & MASTER RECORDS TABLE) */}
      <div className="bg-[#FDE7E6] border border-[#FBCFCB] p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#FBCFCB] pb-3">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-[#D94B5A]" />
            <h3 className="text-sm font-black text-[#D94B5A] uppercase tracking-wider font-mono">
              {dashboardViewMode === "queue" ? `Real-Time Lorries Queue (${filteredLorries.filter((l) => l.status !== "COMPLETED").length})` : `All Gate Records Master Table (${filteredLorries.length})`}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDashboardViewMode("queue")}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all font-mono",
                dashboardViewMode === "queue"
                  ? "bg-[#F7AFA8] text-[#FDE7E6] shadow-sm"
                  : "bg-[#FDE7E6] text-[#D94B5A] border border-[#FBCFCB] hover:bg-[#FBCFCB]"
              )}
            >
              📋 Active Queue
            </button>
            <button
              onClick={() => setDashboardViewMode("master_table")}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all font-mono",
                dashboardViewMode === "master_table"
                  ? "bg-[#F7AFA8] text-[#FDE7E6] shadow-sm"
                  : "bg-[#FDE7E6] text-[#D94B5A] border border-[#FBCFCB] hover:bg-[#FBCFCB]"
              )}
            >
              📊 Master Records Table
            </button>
          </div>
        </div>

        {dashboardViewMode === "queue" ? (
          <div className="space-y-3">
            {filteredLorries.filter((l) => l.status !== "COMPLETED").length === 0 ? (
              <div className="bg-[#FDE7E6] border-2 border-dashed border-[#FBCFCB] rounded-2xl p-8 text-center space-y-2 text-[#D94B5A]">
                <div className="p-3 bg-[#FBCFCB] rounded-full w-12 h-12 flex items-center justify-center mx-auto text-[#D94B5A]">
                  <Truck className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-black uppercase text-[#D94B5A] font-mono">
                  🎉 No Queue Bottleneck - All lorries are progressing smoothly.
                </h4>
                <p className="text-xs">New registered lorries will instantly appear in this queue list.</p>
              </div>
            ) : (
              filteredLorries
                .filter((l) => l.status !== "COMPLETED")
                .map((l) => {
                  const overdue = isOverdue(l.inTime);
                  return (
                    <div
                      key={l.id}
                      onClick={() => setInspectLorryModal(l)}
                      className="bg-[#FDE7E6] border border-[#FBCFCB] hover:border-[#F7AFA8] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all shadow-xs cursor-pointer"
                    >
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-black text-[#D94B5A] font-mono">{l.lorryNo}</span>
                          <span className="px-2 py-0.5 bg-[#F7AFA8]/10 text-[#D94B5A] text-xs font-mono font-bold rounded">
                            {l.gatePassNo}
                          </span>
                          
                          <span
                            className={cn(
                              "px-2.5 py-0.5 text-xs font-bold uppercase rounded-full text-white",
                              l.department === "Jute"
                                ? "bg-[#F7AFA8]"
                                : l.department === "Store"
                                ? "bg-amber-600"
                                : l.department === "Finish Good"
                                ? "bg-purple-700"
                                : "bg-blue-600"
                            )}
                          >
                            {l.department}
                          </span>

                          <span
                            className={cn(
                              "px-2 py-0.5 text-[10px] font-mono font-bold rounded-full uppercase border",
                              overdue
                                ? "bg-rose-100 border-rose-400 text-rose-900"
                                : "bg-amber-100 border-amber-300 text-amber-900"
                            )}
                          >
                            {getElapsedTimeText(l.inTime)}
                          </span>
                        </div>

                        <p className="text-xs text-[#D94B5A]">
                          Broker/Party: <strong className="text-[#D94B5A]">{l.broker}</strong> | Quality: <strong className="text-[#D94B5A]">{l.quality}</strong> | Stage: <span className="font-bold uppercase text-[#D94B5A]">{l.status.replace(/_/g, " ")}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); setInspectLorryModal(l); }}
                          className="px-3 py-2 bg-[#FBCFCB] hover:bg-[#D4CBB5] text-[#D94B5A] font-bold text-xs uppercase rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>View Details</span>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onSelectLorry(l); }}
                          className="px-4 py-2 bg-[#F7AFA8] hover:bg-[#D94B5A] text-[#FDE7E6] font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Manage</span>
                        </button>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        ) : (
          /* Master Table View */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="bg-[#FBCFCB] text-[#D94B5A] border-b border-[#FBCFCB] uppercase text-[10px]">
                  <th className="p-3 font-black">Gate Pass</th>
                  <th className="p-3 font-black">Lorry No</th>
                  <th className="p-3 font-black">Dept</th>
                  <th className="p-3 font-black">Party / Broker</th>
                  <th className="p-3 font-black">Entry Date & Time</th>
                  <th className="p-3 font-black">Out Date & Time</th>
                  <th className="p-3 font-black">Status</th>
                  <th className="p-3 font-black text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FBCFCB]/40 bg-[#FDE7E6]">
                {filteredLorries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-[#D94B5A]">No matching lorry records found.</td>
                  </tr>
                ) : (
                  filteredLorries.map((l) => (
                    <tr key={l.id} onClick={() => setInspectLorryModal(l)} className="hover:bg-[#FBCFCB]/50 cursor-pointer transition-colors">
                      <td className="p-3 font-bold text-[#D94B5A]">{l.gatePassNo}</td>
                      <td className="p-3 font-bold text-[#D94B5A]">{l.lorryNo}</td>
                      <td className="p-3">
                        <span className={cn("px-2 py-0.5 text-[10px] font-bold rounded uppercase text-white", l.department === "Jute" ? "bg-[#F7AFA8]" : l.department === "Store" ? "bg-amber-600" : "bg-purple-700")}>
                          {l.department}
                        </span>
                      </td>
                      <td className="p-3 text-[#D94B5A]">{l.broker || "N/A"}</td>
                      <td className="p-3 text-[#D94B5A]">
                        {l.entryDate ? `${l.entryDate} ` : ""}
                        <span className="font-semibold">{l.inTime || "N/A"}</span>
                      </td>
                      <td className="p-3 text-[#D94B5A]">
                        {l.outDate ? `${l.outDate} ` : ""}
                        <span className="font-semibold">{l.outTime || "Active"}</span>
                      </td>
                      <td className="p-3">
                        <span className={cn("px-2 py-0.5 text-[10px] font-bold rounded uppercase", l.status === "COMPLETED" ? "bg-emerald-100 text-emerald-900 border border-emerald-300" : "bg-amber-100 text-amber-900 border border-amber-300")}>
                          {l.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); setInspectLorryModal(l); }}
                          className="px-2.5 py-1 bg-[#F7AFA8] text-[#FDE7E6] font-bold text-[10px] rounded-lg hover:bg-[#D94B5A]"
                        >
                          View All Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* COMPREHENSIVE LORRY DETAILS POPUP MODAL */}
      {inspectLorryModal && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FDE7E6] border border-[#FBCFCB] w-full max-w-2xl p-6 rounded-2xl shadow-2xl space-y-5 text-[#D94B5A] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#FBCFCB] pb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#D94B5A]" />
                <div>
                  <h3 className="text-sm font-black uppercase font-mono">
                    Lorry Complete Gate & Weighment Dossier
                  </h3>
                  <p className="text-[10px] text-[#D94B5A] font-mono">Gate Pass: {inspectLorryModal.gatePassNo}</p>
                </div>
              </div>
              <button onClick={() => setInspectLorryModal(null)} className="p-1.5 hover:bg-[#FBCFCB] rounded-xl text-[#D94B5A] hover:text-[#D94B5A]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {inspectLorryModal.department === "Jute" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                <div className="bg-[#FDE7E6] p-3.5 rounded-xl border border-[#FBCFCB] space-y-2">
                  <h4 className="font-black text-[#D94B5A] uppercase text-[11px] border-b border-[#FBCFCB] pb-1">Identification & Party</h4>
                  <p><strong>Lorry No:</strong> {inspectLorryModal.lorryNo}</p>
                  <p><strong>Gate Pass:</strong> {inspectLorryModal.gatePassNo}</p>
                  <p><strong>Department:</strong> {inspectLorryModal.department}</p>
                  <p><strong>Party / Broker:</strong> {safeStr(inspectLorryModal.broker || inspectLorryModal.partyName, "N/A")}</p>
                  <p><strong>Chalan No:</strong> {inspectLorryModal.chalanNo || "N/A"}</p>
                  <p><strong>Driver Phone:</strong> {inspectLorryModal.driverPhone || "N/A"}</p>
                </div>

                <div className="bg-[#FDE7E6] p-3.5 rounded-xl border border-[#FBCFCB] space-y-2">
                  <h4 className="font-black text-[#D94B5A] uppercase text-[11px] border-b border-[#FBCFCB] pb-1">Timestamps & Status</h4>
                  <p><strong>Entry Date:</strong> {inspectLorryModal.entryDate || "N/A"}</p>
                  <p><strong>In Time:</strong> {inspectLorryModal.inTime || "N/A"}</p>
                  <p><strong>Out Date:</strong> {inspectLorryModal.outDate || "N/A"}</p>
                  <p><strong>Out Time:</strong> {inspectLorryModal.outTime || "Active / Inside Mill"}</p>
                  <p><strong>Current Status:</strong> <span className="font-bold uppercase text-emerald-800">{inspectLorryModal.status.replace(/_/g, " ")}</span></p>
                  <p><strong>Current Stage:</strong> {inspectLorryModal.currentStage || inspectLorryModal.department}</p>
                </div>

                <div className="bg-[#FDE7E6] p-3.5 rounded-xl border border-[#FBCFCB] space-y-2">
                  <h4 className="font-black text-[#D94B5A] uppercase text-[11px] border-b border-[#FBCFCB] pb-1">Material & Quality Specs</h4>
                  <p><strong>Description / Quality:</strong> {inspectLorryModal.quality || inspectLorryModal.description || "N/A"}</p>
                  <p><strong>Quantity & Unit:</strong> {inspectLorryModal.quantity ? `${inspectLorryModal.quantity} ${inspectLorryModal.unit || 'BALES'}` : "N/A"}</p>
                  <p><strong>Mokam / Origin:</strong> {inspectLorryModal.mokam || "N/A"}</p>
                  <p><strong>Marka:</strong> {safeStr(inspectLorryModal.marka, "N/A")}</p>
                  <p><strong>Grade:</strong> {safeStr(inspectLorryModal.grade, "N/A")}</p>
                </div>

                <div className="bg-[#FDE7E6] p-3.5 rounded-xl border border-[#FBCFCB] space-y-2">
                  <h4 className="font-black text-[#D94B5A] uppercase text-[11px] border-b border-[#FBCFCB] pb-1">Weighments Summary</h4>
                  <p><strong>Gate Net Weight:</strong> {inspectLorryModal.gateNetWeight ? `${inspectLorryModal.gateNetWeight.toLocaleString()} KG` : "0 KG"}</p>
                  <p><strong>Mill Gross:</strong> {inspectLorryModal.millGrossWeight ? `${inspectLorryModal.millGrossWeight.toLocaleString()} KG` : "N/A"}</p>
                  <p><strong>Mill Tare:</strong> {inspectLorryModal.millTareWeight ? `${inspectLorryModal.millTareWeight.toLocaleString()} KG` : "N/A"}</p>
                  <p><strong>Electric Gross:</strong> {inspectLorryModal.electricGrossWeight ? `${inspectLorryModal.electricGrossWeight.toLocaleString()} KG` : "N/A"}</p>
                  <p><strong>Electric Tare:</strong> {inspectLorryModal.electricTareWeight ? `${inspectLorryModal.electricTareWeight.toLocaleString()} KG` : "N/A"}</p>
                  <p className="font-bold text-[#D94B5A] pt-1 border-t border-[#FBCFCB]">
                    Final Net Weight: {(inspectLorryModal.finalNetWeight || inspectLorryModal.gateNetWeight || 0).toLocaleString()} KG
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-[#FDE7E6] p-5 rounded-2xl border border-[#FBCFCB] space-y-3 text-xs font-mono">
                <p><strong>GATE PASS:</strong> {inspectLorryModal.gatePassNo}</p>
                <p><strong>LORRY NO:</strong> {inspectLorryModal.lorryNo}</p>
                <p><strong>Date/In-Time:</strong> {inspectLorryModal.entryDate || ""} {inspectLorryModal.inTime || "N/A"}</p>
                <p><strong>Date/Out-Time:</strong> {inspectLorryModal.outDate || ""} {inspectLorryModal.outTime || "Active"}</p>
                <p><strong>Driver Phone:</strong> {inspectLorryModal.driverPhone || "N/A"}</p>
                <p><strong>Department:</strong> {inspectLorryModal.department}</p>
                <p><strong>Broker:</strong> {safeStr(inspectLorryModal.broker, "N/A")}</p>
                <p><strong>Quality:</strong> {inspectLorryModal.quality || inspectLorryModal.description || "N/A"}</p>
                <p><strong>Mokam:</strong> {inspectLorryModal.mokam || "N/A"} | <strong>Marka:</strong> {safeStr(inspectLorryModal.marka, "N/A")}</p>
                <div className="border-t border-[#FBCFCB] pt-2 space-y-1">
                  <p className="font-bold uppercase">WEIGHMENT BREAKDOWN (KG)</p>
                  <p className="font-extrabold text-sm text-[#D94B5A]">
                    FINAL NET DISPATCH: {(inspectLorryModal.finalNetWeight || inspectLorryModal.gateNetWeight || 0).toLocaleString()} KG
                  </p>
                </div>
              </div>
            )}

            {inspectLorryModal.remarks && (
              <div className="bg-[#FDE7E6] p-3.5 rounded-xl border border-[#FBCFCB] text-xs font-mono">
                <strong>Remarks / Notes:</strong> {inspectLorryModal.remarks}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => {
                  onSelectLorry(inspectLorryModal);
                  setInspectLorryModal(null);
                }}
                className="flex-1 py-2.5 bg-[#F7AFA8] hover:bg-[#D94B5A] text-[#FDE7E6] font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" />
                <span>Open in Workflow Manager</span>
              </button>
              <button
                onClick={() => setInspectLorryModal(null)}
                className="px-5 py-2.5 bg-[#FBCFCB] hover:bg-[#D4CBB5] text-[#D94B5A] font-extrabold text-xs uppercase rounded-xl transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. FLOATING ACTION PANEL & MODALS (FAB SPEED DIAL) */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {isFabOpen && (
          <div className="flex flex-col items-end gap-2 animate-fade-in">
            <button
              onClick={() => { setActiveModal("entry"); setIsFabOpen(false); }}
              className="px-3.5 py-2 bg-[#F7AFA8] text-[#FDE7E6] text-xs font-bold rounded-xl shadow-xl hover:bg-[#D94B5A] flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>➕ New Gate Entry</span>
            </button>

            <button
              onClick={() => { setActiveModal("qr"); setIsFabOpen(false); }}
              className="px-3.5 py-2 bg-[#F7AFA8] text-[#FDE7E6] text-xs font-bold rounded-xl shadow-xl hover:bg-[#D94B5A] flex items-center gap-2 cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              <span>🔍 Simulate QR Scan</span>
            </button>

            <button
              onClick={() => { setActiveModal("handover"); setIsFabOpen(false); }}
              className="px-3.5 py-2 bg-[#F7AFA8] text-[#FDE7E6] text-xs font-bold rounded-xl shadow-xl hover:bg-[#D94B5A] flex items-center gap-2 cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>🤝 Shift Handover Notes</span>
            </button>

            <button
              onClick={() => { setActiveModal("incident"); setIsFabOpen(false); }}
              className="px-3.5 py-2 bg-rose-800 text-white text-xs font-bold rounded-xl shadow-xl hover:bg-rose-900 flex items-center gap-2 cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>⚠️ Security Incident</span>
            </button>

            <button
              onClick={() => {
                alert("Offline Cache Synchronized with Supabase Cloud!");
                triggerNotification("Sync Complete", "Offline cache reconciled.", "ALL", "success");
                setIsFabOpen(false);
              }}
              className="px-3.5 py-2 bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xl hover:bg-emerald-900 flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>🔄 Sync Offline Cache</span>
            </button>
          </div>
        )}

        <button
          onClick={() => setIsFabOpen(!isFabOpen)}
          className="p-4 bg-[#F7AFA8] text-[#FDE7E6] hover:bg-[#D94B5A] rounded-2xl shadow-2xl transition-all cursor-pointer border-2 border-[#FDE7E6]"
          title="Quick Action Speed Dial"
        >
          {isFabOpen ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
        </button>
      </div>

      {/* MODALS */}
      {/* 1. NEW ENTRY MODAL */}
      {activeModal === "entry" && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FDE7E6] border border-[#FBCFCB] w-full max-w-lg p-6 rounded-2xl shadow-2xl space-y-4 text-[#D94B5A]">
            <div className="flex items-center justify-between border-b border-[#FBCFCB] pb-3">
              <h3 className="text-sm font-black uppercase font-mono">Register New Gate Entry Pass</h3>
              <button onClick={() => setActiveModal(null)} className="p-1 hover:bg-[#FBCFCB] rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                onRegisterGateEntry({
                  lorryNo: (form.elements.namedItem("lorryNo") as HTMLInputElement).value,
                  driverPhone: (form.elements.namedItem("driverPhone") as HTMLInputElement).value,
                  department: (form.elements.namedItem("department") as HTMLSelectElement).value as DepartmentType,
                  broker: (form.elements.namedItem("broker") as HTMLInputElement).value,
                  quality: (form.elements.namedItem("quality") as HTMLInputElement).value,
                  mokam: (form.elements.namedItem("mokam") as HTMLInputElement).value,
                  marka: (form.elements.namedItem("marka") as HTMLInputElement).value,
                });
                setActiveModal(null);
              }}
              className="space-y-3"
            >
              <div>
                <label htmlFor="lorryno_675" className="text-[10px] font-bold text-[#D94B5A] uppercase block mb-1">Lorry No *</label>
                <input  id="lorryno_675" aria-label="Lorry No *"required name="lorryNo" placeholder="WB-26-AY-4444" className="w-full bg-[#FDE7E6] border border-[#FBCFCB] rounded-xl p-2 text-xs font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="driverphone_680" className="text-[10px] font-bold text-[#D94B5A] uppercase block mb-1">Driver Phone *</label>
                  <input  id="driverphone_680" aria-label="Driver Phone *"required name="driverPhone" placeholder="+91 98300 00000" className="w-full bg-[#FDE7E6] border border-[#FBCFCB] rounded-xl p-2 text-xs font-mono" />
                </div>
                <div>
                  <label htmlFor="department_684" className="text-[10px] font-bold text-[#D94B5A] uppercase block mb-1">Department *</label>
                  <select  id="department_684" aria-label="Department *"name="department" className="w-full bg-[#FDE7E6] border border-[#FBCFCB] rounded-xl p-2 text-xs font-bold">
                    <option value="Jute">Jute</option>
                    <option value="Store">Store</option>
                    <option value="Finish Good">Finish Good</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="broker_695" className="text-[10px] font-bold text-[#D94B5A] uppercase block mb-1">Broker / Supplier</label>
                  <input
 id="broker_695" aria-label="Broker / Supplier"                    name="broker"
                    list="broker-options"
                    autoComplete="off"
                    placeholder="Type or select Broker..."
                    className="w-full bg-[#FDE7E6] border border-[#FBCFCB] rounded-xl p-2 text-xs outline-none focus:border-[#F7AFA8]"
                    defaultValue=""
                  />
                  <datalist id="broker-options">
                    {masters.brokers.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </datalist>
                </div>
                <div>
                  <label htmlFor="quality_711" className="text-[10px] font-bold text-[#D94B5A] uppercase block mb-1">Quality / Grade</label>
                  <input
 id="quality_711" aria-label="Quality / Grade"                    name="quality"
                    list="quality-options"
                    autoComplete="off"
                    placeholder="Type or select Quality..."
                    className="w-full bg-[#FDE7E6] border border-[#FBCFCB] rounded-xl p-2 text-xs outline-none focus:border-[#F7AFA8]"
                    defaultValue=""
                  />
                  <datalist id="quality-options">
                    {masters.qualities.map((q) => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </datalist>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="mokam_729" className="text-[10px] font-bold text-[#D94B5A] uppercase block mb-1">Mokam / Origin</label>
                  <input
 id="mokam_729" aria-label="Mokam / Origin"                    name="mokam"
                    list="mokam-options"
                    autoComplete="off"
                    placeholder="Type or select Mokam..."
                    className="w-full bg-[#FDE7E6] border border-[#FBCFCB] rounded-xl p-2 text-xs outline-none focus:border-[#F7AFA8]"
                    defaultValue=""
                  />
                  <datalist id="mokam-options">
                    {masters.mokams.map((m, idx) => {
                      const val = safeStr(m);
                      return <option key={val + idx} value={val}>{val}</option>;
                    })}
                  </datalist>
                </div>
                <div>
                  <label htmlFor="marka_745" className="text-[10px] font-bold text-[#D94B5A] uppercase block mb-1">Marka</label>
                  <input
 id="marka_745" aria-label="Marka"                    name="marka"
                    list="marka-options"
                    autoComplete="off"
                    placeholder="Type or select Marka..."
                    className="w-full bg-[#FDE7E6] border border-[#FBCFCB] rounded-xl p-2 text-xs outline-none focus:border-[#F7AFA8]"
                    defaultValue=""
                  />
                  <datalist id="marka-options">
                    {masters.markas.map((mk, idx) => {
                      const val = safeStr(mk);
                      return <option key={val + idx} value={val}>{val}</option>;
                    })}
                  </datalist>
                </div>
              </div>

              <button type="submit" className="w-full py-2.5 bg-[#F7AFA8] text-[#FDE7E6] font-extrabold text-xs uppercase rounded-xl">
                Submit & Issue Gate Pass
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. QR SCANNER SIMULATOR MODAL */}
      {activeModal === "qr" && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FDE7E6] border border-[#FBCFCB] w-full max-w-sm p-6 rounded-2xl shadow-2xl space-y-4 text-center text-[#D94B5A]">
            <QrCode className="w-12 h-12 text-[#D94B5A] mx-auto animate-pulse" />
            <h3 className="text-sm font-black uppercase font-mono">Simulate Gate Pass QR Scanner</h3>
            <p className="text-xs text-[#D94B5A]">Input or scan a Gate Pass ticket number to auto-select lorry:</p>
            <input
 id="e_g_jute_20260810_8541_776" name="e_g_jute_20260810_8541" aria-label="e.g. JUTE-20260810-8541"              type="text"
              value={qrCodeInput}
              onChange={(e) => setQrCodeInput(e.target.value)}
              placeholder="e.g. JUTE-20260810-8541"
              className="w-full bg-[#FDE7E6] border border-[#FBCFCB] rounded-xl p-2.5 text-xs text-center font-mono font-bold"
            />
            <div className="flex gap-2">
              <button onClick={() => setActiveModal(null)} className="flex-1 py-2 bg-[#FBCFCB] text-xs font-bold rounded-xl">Cancel</button>
              <button
                onClick={() => {
                  const found = lorries.find((l) => l.gatePassNo.toLowerCase().includes(qrCodeInput.toLowerCase().trim()));
                  if (found) {
                    onSelectLorry(found);
                    setActiveModal(null);
                  } else {
                    alert("Gate Pass not found in system record!");
                  }
                }}
                className="flex-1 py-2 bg-[#F7AFA8] text-[#FDE7E6] text-xs font-bold rounded-xl"
              >
                Find Pass
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. SHIFT HANDOVER MODAL */}
      {activeModal === "handover" && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FDE7E6] border border-[#FBCFCB] w-full max-w-md p-6 rounded-2xl shadow-2xl space-y-4 text-[#D94B5A]">
            <h3 className="text-sm font-black uppercase font-mono border-b border-[#FBCFCB] pb-2">Shift Handover Logbook Notes</h3>
            <p className="text-xs text-[#D94B5A]">Write operational handover notes for the incoming Main Gate operator:</p>
            <textarea
 id="e_g_wb_126_2312_pending_t_810" name="e_g_wb_126_2312_pending_t" aria-label="e.g., WB-126/2312 pending tare clearance at Electric scale. 2 Jute lorries parked in Bay 3."              rows={4}
              value={handoverNotes}
              onChange={(e) => setHandoverNotes(e.target.value)}
              placeholder="e.g., WB-126/2312 pending tare clearance at Electric scale. 2 Jute lorries parked in Bay 3."
              className="w-full bg-[#FDE7E6] border border-[#FBCFCB] rounded-xl p-3 text-xs"
            />
            <div className="flex gap-2">
              <button onClick={() => setActiveModal(null)} className="flex-1 py-2 bg-[#FBCFCB] text-xs font-bold rounded-xl">Cancel</button>
              <button
                onClick={() => {
                  alert("Shift Handover Notes Saved!");
                  triggerNotification("Shift Handover Logged", handoverNotes, "ALL", "info");
                  setActiveModal(null);
                }}
                className="flex-1 py-2 bg-[#F7AFA8] text-[#FDE7E6] text-xs font-bold rounded-xl"
              >
                Save Handover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. SECURITY INCIDENT REPORT MODAL */}
      {activeModal === "incident" && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FDE7E6] border border-rose-400 w-full max-w-md p-6 rounded-2xl shadow-2xl space-y-4 text-[#D94B5A]">
            <div className="flex items-center gap-2 border-b border-rose-300 pb-2 text-rose-900">
              <ShieldAlert className="w-5 h-5 text-rose-700" />
              <h3 className="text-sm font-black uppercase font-mono">Report Security Incident</h3>
            </div>
            
            <div className="space-y-3 text-xs">
              <div>
                <label htmlFor="category_846" className="font-bold text-[#D94B5A] block mb-1">Category</label>
                <select
 id="category_846" name="category" aria-label="Category"                  value={incidentData.category}
                  onChange={(e) => setIncidentData({ ...incidentData, category: e.target.value })}
                  className="w-full bg-[#FDE7E6] border border-[#FBCFCB] rounded-xl p-2 font-bold"
                >
                  <option value="Unscheduled Entry">Unscheduled Entry</option>
                  <option value="Seal Tampering">Seal Tampering</option>
                  <option value="Driver Discrepancy">Driver Discrepancy</option>
                  <option value="Weight Discrepancy">Weight Discrepancy &gt; 500kg</option>
                </select>
              </div>

              <div>
                <label htmlFor="severity_860" className="font-bold text-[#D94B5A] block mb-1">Severity</label>
                <select
 id="severity_860" name="severity" aria-label="Severity"                  value={incidentData.severity}
                  onChange={(e) => setIncidentData({ ...incidentData, severity: e.target.value })}
                  className="w-full bg-[#FDE7E6] border border-[#FBCFCB] rounded-xl p-2 font-bold"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High (Alert Admin)">High (Alert Admin)</option>
                </select>
              </div>

              <div>
                <label htmlFor="details_description_873" className="font-bold text-[#D94B5A] block mb-1">Details Description</label>
                <textarea
 id="details_description_873" name="details_description" aria-label="Details Description"                  rows={3}
                  value={incidentData.details}
                  onChange={(e) => setIncidentData({ ...incidentData, details: e.target.value })}
                  placeholder="Describe incident details..."
                  className="w-full bg-[#FDE7E6] border border-[#FBCFCB] rounded-xl p-2.5"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setActiveModal(null)} className="flex-1 py-2 bg-[#FBCFCB] text-xs font-bold rounded-xl">Cancel</button>
              <button
                onClick={() => {
                  alert("Security Incident Report Submitted to Super Admin!");
                  triggerNotification("SECURITY INCIDENT ALERT ⚠️", `${incidentData.category} (${incidentData.severity}): ${incidentData.details}`, "SUPER_ADMIN", "alert");
                  setActiveModal(null);
                }}
                className="flex-1 py-2 bg-rose-800 text-white text-xs font-bold rounded-xl"
              >
                Submit Incident
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
