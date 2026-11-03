import React, { useState, useEffect } from "react";
import {
  Bell,
  X,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Filter,
  Search,
  ExternalLink,
  Info,
  Clock,
  User,
  Trash2,
  CheckCheck,
  RotateCcw,
  Tag,
  ChevronRight,
  FileText
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../lib/supabase";

export interface NotificationItem {
  id: string;
  type: "override" | "mismatch" | "requisition" | "audit" | "system";
  title: string;
  description: string;
  timestamp: string;
  mr_no?: string;
  lorry_no?: string;
  field_name?: string;
  past_value?: string | number;
  new_value?: string | number;
  user?: string;
  severity: "high" | "medium" | "low";
  read: boolean;
  module?: string;
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (page: string, subId?: string) => void;
  unreadCount?: number;
  setUnreadCount?: React.Dispatch<React.SetStateAction<number>>;
}

function toSafeStr(val: any, fallback = ""): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "object") {
    return val.name || val.title || val.mr_no || val.field_name || val.message || val.action_details || JSON.stringify(val);
  }
  return String(val);
}

export default function NotificationCenter({
  isOpen,
  onClose,
  onNavigate,
  setUnreadCount
}: NotificationCenterProps) {
  const [activeTab, setActiveTab] = useState<"all" | "override" | "mismatch" | "audit">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Load manual overrides and system notifications
  const fetchNotifications = async () => {
    setLoading(true);
    const list: NotificationItem[] = [];

    // 1. Fetch Quality Audit / Material Inspection manual entry overrides
    if (supabase) {
      try {
        const { data: inspectionData } = await supabase
          .from("mill_inspection_master")
          .select("*")
          .order("date", { ascending: false })
          .limit(30);

        if (inspectionData) {
          inspectionData.forEach((item: any) => {
            // Check for manual overrides or flagged fields
            const moisture = Number(item.claim_moisture || 0);
            const dust = Number(item.claim_dust || 0);
            const ncv = Number(item.claim_ncv || 0);
            const mrNoStr = toSafeStr(item.mr_no, "N/A");
            const lorryStr = toSafeStr(item.lorry_number || item.lorry_no, "N/A");
            const suppStr = toSafeStr(item.supplier, "N/A");
            const userStr = toSafeStr(item.updated_by || item.created_by, "Operator");

            // Check if flagged or manually adjusted
            if (moisture > 0 || item.moisture_override) {
              list.push({
                id: `override-moisture-${mrNoStr}`,
                type: "override",
                title: `Manual Entry: Claim Moisture % Override`,
                description: `M.R. No: ${mrNoStr} | Vehicle: ${lorryStr} | Supplier: ${suppStr}`,
                timestamp: toSafeStr(item.date, new Date().toISOString()),
                mr_no: mrNoStr,
                lorry_no: lorryStr,
                field_name: "Claim Moisture %",
                past_value: toSafeStr(item.auto_claim_moisture, "Calculated Auto"),
                new_value: `${moisture}%`,
                user: userStr,
                severity: "high",
                read: false,
                module: "material_inspection"
              });
            }

            if (dust > 0) {
              list.push({
                id: `override-dust-${mrNoStr}`,
                type: "override",
                title: `Manual Entry: Claim Dust % Override`,
                description: `M.R. No: ${mrNoStr} | Vehicle: ${lorryStr}`,
                timestamp: toSafeStr(item.date, new Date().toISOString()),
                mr_no: mrNoStr,
                lorry_no: lorryStr,
                field_name: "Claim Dust %",
                past_value: toSafeStr(item.auto_claim_dust, "Calculated Auto"),
                new_value: `${dust}%`,
                user: userStr,
                severity: "high",
                read: false,
                module: "material_inspection"
              });
            }

            if (ncv > 0) {
              list.push({
                id: `override-ncv-${mrNoStr}`,
                type: "override",
                title: `Manual Entry: Claim NCV % Override`,
                description: `M.R. No: ${mrNoStr} | Vehicle: ${lorryStr}`,
                timestamp: toSafeStr(item.date, new Date().toISOString()),
                mr_no: mrNoStr,
                lorry_no: lorryStr,
                field_name: "Claim NCV %",
                past_value: toSafeStr(item.auto_claim_ncv, "Calculated Auto"),
                new_value: `${ncv}%`,
                user: userStr,
                severity: "high",
                read: false,
                module: "material_inspection"
              });
            }
          });
        }
      } catch (err) {
        console.warn("Failed fetching mill_inspection_master for notification center:", err);
      }

      // 2. Fetch Mismatch cases
      try {
        const { data: mismatchData } = await supabase
          .from("material_mismatch")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(15);

        if (mismatchData) {
          mismatchData.forEach((m: any) => {
            const mrStr = toSafeStr(m.mr_no, "N/A");
            const poStr = toSafeStr(m.po_no, "N/A");
            const remarkStr = toSafeStr(m.remarks || m.reason, "Discrepancy logged between PO and Arrival");

            list.push({
              id: `mismatch-${toSafeStr(m.id || m.mr_no)}`,
              type: "mismatch",
              title: `Weight / Quality Mismatch Discrepancy`,
              description: `MR: ${mrStr} | PO: ${poStr} - ${remarkStr}`,
              timestamp: toSafeStr(m.created_at, new Date().toISOString()),
              mr_no: mrStr,
              severity: "high",
              read: false,
              module: "mismatch"
            });
          });
        }
      } catch (e) {
        console.warn("Mismatch query skipped:", e);
      }

      // 3. Fetch User Activity / Audit logs
      try {
        const { data: auditData } = await supabase
          .from("user_activity_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(20);

        if (auditData) {
          auditData.forEach((log: any) => {
            if (log.activity_type?.includes("OVERRIDE") || log.activity_type?.includes("EDIT") || log.activity_type?.includes("DELETE") || log.activity_type?.includes("INSPECTION")) {
              const actDetailsStr = toSafeStr(log.action_details, "System activity recorded");
              const modNameStr = toSafeStr(log.module_name, "System");

              list.push({
                id: `audit-${toSafeStr(log.id)}`,
                type: "audit",
                title: `Audit Event: ${toSafeStr(log.activity_type)}`,
                description: `${actDetailsStr} [Module: ${modNameStr}]`,
                timestamp: toSafeStr(log.created_at, new Date().toISOString()),
                user: toSafeStr(log.username),
                severity: log.activity_type?.includes("DELETE") ? "high" : "medium",
                read: true,
                module: modNameStr
              });
            }
          });
        }
      } catch (e) {
        console.warn("Audit logs query skipped:", e);
      }
    }

    // 4. Merge with local overrides if available
    try {
      // Clean memory fetch only
    } catch (err) {
      console.warn("Error parsing overrides:", err);
    }



    setNotifications(list);
    const unread = list.filter((n) => !n.read).length;
    if (setUnreadCount) setUnreadCount(unread);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (setUnreadCount) setUnreadCount(0);
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      if (setUnreadCount) setUnreadCount(updated.filter((item) => !item.read).length);
      return updated;
    });
  };

  const clearNotification = (id: string) => {
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      if (setUnreadCount) setUnreadCount(updated.filter((item) => !item.read).length);
      return updated;
    });
  };

  const handleJumpToModule = (item: NotificationItem) => {
    if (onNavigate) {
      onNavigate(item.module || "material_inspection");
      onClose();
    }
  };

  const filtered = notifications.filter((item) => {
    if (activeTab === "override" && item.type !== "override") return false;
    if (activeTab === "mismatch" && item.type !== "mismatch") return false;
    if (activeTab === "audit" && item.type !== "audit") return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.mr_no && item.mr_no.toLowerCase().includes(q)) ||
        (item.field_name && item.field_name.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const unreadTotal = notifications.filter((n) => !n.read).length;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9990] flex justify-end bg-black/60 backdrop-blur-[2px]">
        <motion.div
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="w-full max-w-xl bg-slate-900 border-l border-amber-500/40 shadow-2xl flex flex-col h-full font-sans text-white"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 border-b border-amber-400/40 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 border border-amber-400/50 rounded-lg text-amber-300 relative">
                <Bell className="h-5 w-5" />
                {unreadTotal > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-600 text-white rounded-full text-[9px] font-black flex items-center justify-center animate-pulse">
                    {unreadTotal}
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-amber-200">
                  Notification & Highlight Center
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">
                  Real-time Flags, Manual Overrides & System Alerts
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={markAllAsRead}
                title="Mark All Read"
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-[10px] font-bold text-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <CheckCheck className="h-3 w-3 text-emerald-400" />
                <span>Mark All Read</span>
              </button>
              <button
                onClick={onClose}
                className="p-1 bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white rounded border border-slate-700 cursor-pointer transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Search and Tabs Bar */}
          <div className="bg-slate-950 p-3 border-b border-slate-800 space-y-3 shrink-0">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
 id="search_by_mr_no_lorry_no__325" name="search_by_mr_no_lorry_no_" aria-label="Search by MR No, Lorry No, or Field Name..."                type="text"
                placeholder="Search by MR No, Lorry No, or Field Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-md pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-amber-400 transition-colors"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1.5 overflow-x-auto text-[10px] font-bold uppercase">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1 rounded border transition-colors cursor-pointer shrink-0 ${
                  activeTab === "all"
                    ? "bg-amber-500 text-slate-950 border-amber-400 font-extrabold"
                    : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800"
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setActiveTab("override")}
                className={`px-3 py-1 rounded border transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
                  activeTab === "override"
                    ? "bg-red-600 text-white border-red-500 font-extrabold"
                    : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800"
                }`}
              >
                <span>📌 Flagged Overrides</span>
                <span className="bg-red-950/80 text-red-200 px-1 rounded text-[9px]">
                  {notifications.filter((n) => n.type === "override").length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("mismatch")}
                className={`px-3 py-1 rounded border transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
                  activeTab === "mismatch"
                    ? "bg-amber-600 text-white border-amber-500 font-extrabold"
                    : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800"
                }`}
              >
                <span>⚠️ Mismatches</span>
                <span className="bg-amber-950/80 text-amber-200 px-1 rounded text-[9px]">
                  {notifications.filter((n) => n.type === "mismatch").length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("audit")}
                className={`px-3 py-1 rounded border transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
                  activeTab === "audit"
                    ? "bg-indigo-600 text-white border-indigo-500 font-extrabold"
                    : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800"
                }`}
              >
                <span>🛡️ Security Audit</span>
              </button>
            </div>
          </div>

          {/* Notifications List Body */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-950/80">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-2">
                <Clock className="h-6 w-6 animate-spin text-amber-400" />
                <p className="text-xs font-bold uppercase">Loading notification stream...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-slate-500 space-y-2 border border-dashed border-slate-800 rounded-lg">
                <CheckCircle2 className="h-8 w-8 text-emerald-500/60" />
                <p className="text-xs font-bold uppercase">No notifications found</p>
                <p className="text-[10px] text-slate-600 text-center">
                  All systems operating normally. No manual entry flags matching filter.
                </p>
              </div>
            ) : (
              filtered.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-lg border p-3.5 transition-all relative ${
                    item.type === "override"
                      ? "bg-gradient-to-r from-amber-950/90 via-amber-900/40 to-slate-900 border-amber-500/60 shadow-lg"
                      : item.type === "mismatch"
                      ? "bg-gradient-to-r from-rose-950/80 via-slate-900 to-slate-900 border-rose-500/50"
                      : "bg-slate-900/90 border-slate-800 hover:border-slate-700"
                  } ${!item.read ? "ring-1 ring-amber-400/50" : "opacity-80"}`}
                >
                  {/* Top Bar inside card */}
                  <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-2 mb-2">
                    <div className="flex items-center gap-2">
                      {item.type === "override" && (
                        <span className="px-2 py-0.5 rounded text-[9.5px] font-black bg-red-600 text-white uppercase tracking-wider flex items-center gap-1 shadow">
                          <span>📌 Manual Entry Override</span>
                        </span>
                      )}
                      {item.type === "mismatch" && (
                        <span className="px-2 py-0.5 rounded text-[9.5px] font-black bg-amber-600 text-white uppercase tracking-wider flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Discrepancy</span>
                        </span>
                      )}
                      {item.type === "audit" && (
                        <span className="px-2 py-0.5 rounded text-[9.5px] font-black bg-indigo-600 text-white uppercase tracking-wider flex items-center gap-1">
                          <ShieldAlert className="h-3 w-3" />
                          <span>Audit</span>
                        </span>
                      )}

                      {!item.read && (
                        <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono text-slate-400">
                        {new Date(item.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                      <button
                        onClick={() => clearNotification(item.id)}
                        className="text-slate-500 hover:text-rose-400 cursor-pointer transition-colors"
                        title="Dismiss"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Highlight sticky note detail box for overrides */}
                  {item.type === "override" && item.field_name && (
                    <div className="my-2 bg-amber-100 text-amber-950 p-2.5 rounded border-2 border-amber-400 shadow-inner font-sans">
                      <div className="flex justify-between items-center text-[11px] font-black border-b border-amber-300 pb-1 mb-1.5">
                        <span className="text-red-800 flex items-center gap-1">
                          📌 Field Modified: <strong className="uppercase">{item.field_name}</strong>
                        </span>
                        <span className="bg-red-200 text-red-900 text-[9px] px-1.5 py-0.5 rounded uppercase font-extrabold">
                          Red Flagged
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10.5px] font-mono my-1">
                        <div className="bg-amber-200/80 p-1.5 rounded">
                          <span className="text-slate-700 block text-[9px] font-sans font-bold uppercase">
                            Past Auto Value
                          </span>
                          <span className="font-extrabold text-blue-900 text-xs">
                            {item.past_value || "Auto Calculated"}
                          </span>
                        </div>
                        <div className="bg-red-200/90 p-1.5 rounded border border-red-300">
                          <span className="text-red-900 block text-[9px] font-sans font-bold uppercase">
                            Current Manual Value
                          </span>
                          <span className="font-extrabold text-red-950 text-xs">
                            {item.new_value || "Manual Value"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Card Description */}
                  <p className="text-xs text-slate-200 font-medium leading-relaxed my-1">
                    {item.description}
                  </p>

                  {/* Footer Meta & Quick Action */}
                  <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-2 text-slate-400 font-mono">
                      {item.user && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3 text-amber-400" />
                          <span>{item.user}</span>
                        </span>
                      )}
                      {item.mr_no && (
                        <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                          MR: {item.mr_no}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleJumpToModule(item)}
                        className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer shadow"
                      >
                        <span>View In Module</span>
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-slate-900 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-400 shrink-0">
            <span>Notification Stream Syncing</span>
            <button
              onClick={fetchNotifications}
              className="hover:text-amber-300 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Refresh List</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
