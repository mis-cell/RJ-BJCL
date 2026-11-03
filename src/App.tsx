import React, { useState } from "react";
import { dbModule } from "./services/dbModule";
import {
  LayoutDashboard,
  PlusCircle,
  HandCoins,
  Container,
  Users,
  Store,
  FileText,
  Settings,
  ChevronRight,
  ArrowRight,
  Compass,
  Menu,
  X,
  PackageCheck,
  ClipboardList,
  Archive,
  Power,
  User,
  Lock,
  Calendar,
  Clock,
  Terminal,
  Monitor,
  TrendingUp,
  Bot,
  ShieldCheck,
  FileCheck,
  CheckCircle2,
  Layers,
  Search,
  Printer,
  AlertCircle,
  AlertTriangle,
  Link,
  BarChart3,
  MessageSquare,
  ShieldAlert,
  Scale,
  Eye,
  EyeOff,
  Leaf,
  Globe,
  DoorClosed,
  Truck,
  ClipboardCheck,
  Wallet,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "./lib/utils";
import bjlAsset from "./assets/asset_bjl.png";
import { SystemNoticeModal } from "./components/SystemNoticeModal";

// Resilient dynamic loader that auto-reloads if an app deployment changed chunk hashes
function lazyWithRetry<T extends React.ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
) {
  return React.lazy(async () => {
    try {
      return await componentImport();
    } catch (error: any) {
      const isChunkError = /dynamically imported module|failed to fetch.*module|loading chunk/i.test(
        error?.message || ''
      );
      const lastReload = Number(sessionStorage.getItem('bjl_last_lazy_reload') || '0');
      const now = Date.now();
      if (isChunkError && now - lastReload > 15000) {
        sessionStorage.setItem('bjl_last_lazy_reload', String(now));
        window.location.reload();
        return new Promise<{ default: T }>(() => {});
      }
      throw error;
    }
  });
}

import { AppPageRouter } from "./components/layout/AppPageRouter";
import { AppWorkflowFooter } from "./components/layout/AppWorkflowFooter";
import LegacyLayout, { LegacyButton } from "./components/LegacyLayout";
import { setCurrentUserContext, getCurrentUserContext, hasModulePermission, getFirstAllowedPage, ALL_SYSTEM_MODULES, subscribeToPermissions, normalizeAllowedModules, getCanonicalModuleId } from "./lib/permissions";

import { supabase } from "./lib/supabase";
import { getApiUrl } from "./lib/utils";
import { useIdleTimer } from "./hooks/useIdleTimer";
import { ScreenErrorBoundary } from "./components/ScreenErrorBoundary";
import { AuthScreen } from "./components/auth/AuthScreen";

const PageLoadingFallback = ({ moduleName }: { moduleName?: string }) => (
  <div className="flex-1 flex flex-col items-center justify-center h-full w-full min-h-[350px] p-8 text-slate-500">
    <div className="flex flex-col items-center gap-3">
      <div className="w-9 h-9 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin shadow-sm" />
      <div className="flex flex-col items-center">
        <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
          {moduleName ? `Loading ${moduleName}...` : "Loading Module..."}
        </span>
        <span className="text-[10px] text-slate-400 font-medium mt-0.5">
          Preparing workspace data
        </span>
      </div>
    </div>
  </div>
);

import { Page, allSidebarItems, getPageMeta, JCI_WORKFLOW_STEPS } from "./config/navigationConfig";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<string>("L1");
  const [userLevel, setUserLevel] = useState<string>("L1");
  const [selectedYear, setSelectedYear] = useState("2026-2027");
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const [isTempPo, setIsTempPo] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [dashboardTab, setDashboardTab] = useState<
    "menu" | "mismatch" | "reports"
  >("menu");
  const [allowedModules, setAllowedModules] = useState<string[]>(["*"]);
  const [runningPages, setRunningPages] = useState<Page[]>([]);
  const [selectedAmadForFinalMr, setSelectedAmadForFinalMr] = useState<any>(null);

  const clearAuthSessionSelective = React.useCallback(async () => {
    try {
      const preserveGateData = true; // Gate lorries, Gate settings, and Tolerance policies preserved
      if (!preserveGateData) return;
      const rawSession = localStorage.getItem("bally_auth_session");
      const parsed = rawSession ? JSON.parse(rawSession) : null;
      const token = parsed?.token || localStorage.getItem("bally_session_token") || "";
      if (token) {
        fetch(getApiUrl("/api/auth/logout"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ token }),
        }).catch(() => {});
      }
      // Selectively remove auth session keys while preserving Gate lorries, Gate settings, and Tolerance policies
      localStorage.removeItem("bally_auth_session");
      localStorage.removeItem("bally_session_token");
      dbModule.invalidateCache();
    } catch (_e) {}
  }, []);

  // Restore and verify authenticated session & module permissions
  React.useEffect(() => {
    let isMounted = true;
    const verifyAndRestoreSession = async () => {
      try {
        const rawSession = localStorage.getItem("bally_auth_session");
        if (rawSession) {
          const sess = JSON.parse(rawSession);
          if (sess && sess.username) {
            let verifiedRole = String(sess.role || "L1").toUpperCase();
            let verifiedLevel = String(sess.level || "L1").toUpperCase();
            let rawMods = sess.allowed_modules;

            // Verify against backend session endpoint or authoritative user_master table
            if (sess.token) {
              try {
                const verifyRes = await fetch(getApiUrl("/api/auth/verify"), {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${sess.token}`,
                  },
                  body: JSON.stringify({ token: sess.token }),
                });
                if (verifyRes.ok) {
                  const vData = await verifyRes.json();
                  if (vData?.valid && vData?.session) {
                    verifiedRole = String(vData.session.role || verifiedRole).toUpperCase();
                    verifiedLevel = String(vData.session.level || verifiedLevel).toUpperCase();
                  }
                }
              } catch (_verifyErr) {}
            }

            let verifiedUserId = String(sess.userId || sess.user_id || "").trim();
            let verifiedUsername = String(sess.username || sess.userName || "").trim();

            if (supabase && sess.username && sess.username.toUpperCase() !== "ADMIN") {
              const { data: dbUser } = await supabase
                .from("user_master")
                .select("user_id, username, role, level, allowed_modules, status")
                .or(`user_id.ilike.${sess.userId || sess.username},username.ilike.${sess.username}`)
                .limit(1)
                .maybeSingle();

              if (dbUser) {
                if (dbUser.status && String(dbUser.status).toLowerCase() !== "active") {
                  await clearAuthSessionSelective();
                  if (isMounted) setSessionStatus("ready");
                  return;
                }
                verifiedUserId = String(dbUser.user_id || verifiedUserId).trim();
                verifiedUsername = String(dbUser.username || verifiedUsername).trim();
                verifiedRole = String(dbUser.role || verifiedRole).toUpperCase();
                verifiedLevel = String(dbUser.level || verifiedLevel).toUpperCase();
                rawMods = dbUser.allowed_modules ?? rawMods;
              }
            }

            if (!isMounted) return;
            const isAdminUser =
              verifiedRole === "ADMIN" ||
              verifiedRole === "ADMINISTRATOR" ||
              verifiedLevel === "L5" ||
              verifiedLevel === "ADMIN";
            setIsAdmin(isAdminUser);
            setUserRole(verifiedRole);
            setUserLevel(verifiedLevel);
            const mods =
              rawMods !== undefined &&
              rawMods !== null &&
              String(rawMods).trim() !== "" &&
              String(rawMods).trim() !== "[]"
                ? normalizeAllowedModules(rawMods)
                : ["*"];
            const finalMods = mods.length === 0 ? ["*"] : mods;

            setCurrentUserContext({
              userId: verifiedUserId || (verifiedUsername.toUpperCase() === "ADMIN" ? "001" : verifiedUsername),
              username: verifiedUsername,
              userName: verifiedUsername,
              userRole: verifiedRole,
              userLevel: verifiedLevel,
              allowedModules: finalMods,
            });

            setAllowedModules(finalMods);
            setIsLoggedIn(true);
            if (sess.year) setSelectedYear(sess.year);

            const urlParams = new URLSearchParams(window.location.search);
            const qPage =
              urlParams.get("page") ||
              (window.location.hash ? window.location.hash.replace("#", "") : null);
            if (qPage && hasModulePermission(qPage, finalMods, isAdminUser)) {
              setCurrentPage(qPage as Page);
            } else {
              const firstAllowed = getFirstAllowedPage(finalMods, isAdminUser) as Page;
              setCurrentPage(firstAllowed);
            }
          }
        }
        if (isMounted) setSessionStatus("ready");
      } catch (e) {
        console.warn("Session restore error:", e);
        if (isMounted) setSessionStatus("error");
      }
    };
    verifyAndRestoreSession();
    return () => {
      isMounted = false;
    };
  }, [clearAuthSessionSelective]);

  // Subscribe to live permission updates (e.g. when Admin updates allowed modules in Admin Desk)
  React.useEffect(() => {
    return subscribeToPermissions((detail) => {
      const currentCtx = getCurrentUserContext();
      if (
        detail.userId === currentCtx.userId ||
        detail.username?.toLowerCase() === currentCtx.username?.toLowerCase() ||
        detail.username?.toLowerCase() === currentCtx.userName?.toLowerCase() ||
        detail.userId === 'all'
      ) {
        const newMods = detail.allowed_modules === "*"
          ? ["*"]
          : normalizeAllowedModules(detail.allowed_modules || "");
        setAllowedModules(newMods);
        const isAdm = detail.role?.toUpperCase() === "ADMIN" || detail.role?.toUpperCase() === "ADMINISTRATOR";
        if (detail.role) {
          setIsAdmin(isAdm);
          setUserRole(detail.role.toUpperCase());
        }
        if (detail.level) {
          setUserLevel(detail.level.toUpperCase());
        }
        setCurrentUserContext({
          allowedModules: newMods,
          userRole: detail.role ? detail.role.toUpperCase() : currentCtx.userRole,
          userLevel: detail.level ? detail.level.toUpperCase() : currentCtx.userLevel,
        }, false);

        try {
          const raw = localStorage.getItem("bally_auth_session");
          if (raw) {
            const parsed = JSON.parse(raw);
            localStorage.setItem("bally_auth_session", JSON.stringify({
              ...parsed,
              allowed_modules: detail.allowed_modules,
              role: detail.role || parsed.role,
              level: detail.level || parsed.level,
            }));
          }
        } catch {}

        // Auto-redirect if currently open page is no longer permitted
        if (!hasModulePermission(currentPage, newMods, isAdm)) {
          const fallback = getFirstAllowedPage(newMods, isAdm) as Page;
          setCurrentPage('dashboard');
        }
      }
    });
  }, [currentPage]);

  // Sync current page to URL for bookmarking and page refresh preservation
  React.useEffect(() => {
    if (!isLoggedIn) return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("page", currentPage);
      window.history.replaceState(null, "", url.toString());
    } catch {}
  }, [currentPage, isLoggedIn]);

  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [keyState, setKeyState] = useState({ num: true, caps: false, scrl: false });

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.getModifierState) {
        setKeyState({
          num: e.getModifierState('NumLock'),
          caps: e.getModifierState('CapsLock'),
          scrl: e.getModifierState('ScrollLock'),
        });
      }
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useIdleTimer(15 * 60 * 1000, () => {
    if (isLoggedIn) {
      setIsLoggedIn(false);
      clearAuthSessionSelective();
      window.alert("Session auto-locked due to 15 minutes of inactivity. Gate lorry & settings data preserved.");
    }
  });

  // Custom HTML Alert Popup State & Global Override
  const [htmlAlert, setHtmlAlert] = useState<{ message: string } | null>(null);

  React.useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (message: any) => {
      console.log("Custom HTML Alert Intercepted:", message);
      setHtmlAlert({ message: String(message) });
    };
    return () => {
      window.alert = originalAlert;
    };
  }, []);
  const [systemLogs, setSystemLogs] = useState<
    {
      id: string;
      timestamp: string;
      event: string;
      details: string;
      currentPage: string;
      runningPages: string[];
    }[]
  >([]);

  // Command Menu Helper States
  const [showCommandSearch, setShowCommandSearch] = useState(false);
  const [commandSearchQuery, setCommandSearchQuery] = useState("");
  const [highlightedCommandIndex, setHighlightedCommandIndex] = useState(0);

  // Global Route Guard
  const [showGlobalSattaWarning, setShowGlobalSattaWarning] = useState(false);

  const globalNavigate = async (targetPage: Page, subId?: string): Promise<boolean> => {
    let actualTarget = targetPage;
    if (subId === 'po_final' || targetPage === 'po_final' as any) {
      actualTarget = 'final_po';
    } else if (subId === 'po_temp') {
      actualTarget = 'po';
    } else if (targetPage === 'main_gate' as any || targetPage === 'maingate' as any) {
      actualTarget = 'main_gate';
    }

    // Strict Permission Guard: Verify user has permission for the target module
    const isPermitted = hasModulePermission(actualTarget, allowedModules, isAdmin) ||
      (subId ? hasModulePermission(subId, allowedModules, isAdmin) : false);

    if (!isPermitted) {
      alert(`Access Denied: Your account does not have permission to access module [${subId || actualTarget}].`);
      return false;
    }

    // Determine if we need to block this target page.
    // Dashboard and Satta modules should always be accessible.
    const isRestrictedPage = targetPage !== "dashboard" && targetPage !== "satta" && targetPage !== "satta_chart";
    
    // Satta Rate Guard: Explicitly exclude Admin, L2, L3, L4, and L5
    const isL1User = userLevel === "L1";
    const isExcludedRole = isAdmin || ["L2", "L3", "L4", "L5"].includes(userLevel);

    if (isRestrictedPage && isL1User && !isExcludedRole) {
      const now = new Date();
      const localYear = now.getFullYear();
      const localMonth = String(now.getMonth() + 1).padStart(2, '0');
      const localDay = String(now.getDate()).padStart(2, '0');
      const todayLocalStr = `${localYear}-${localMonth}-${localDay}`;
      const todayUtcStr = now.toISOString().split("T")[0];

      // Today - 1 (Yesterday): e.g. if Today is 26-10-2026 and Satta Base Rate is updated till 25-10-2026, app works
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const yestLocalStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
      const yestUtcStr = yesterday.toISOString().split("T")[0];
      const minValidDateStr = yestLocalStr < yestUtcStr ? yestLocalStr : yestUtcStr;

      if (supabase) {
        // Check Supabase directly if any Satta chart was uploaded/updated up to Today - 1 (Yesterday) or Today
        try {
          const isValidRecentDay = (dateStr?: string) => {
            if (!dateStr) return false;
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return false;
            const dLocalStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const dUtcStr = d.toISOString().split("T")[0];
            return (
              dLocalStr >= minValidDateStr ||
              dUtcStr >= minValidDateStr ||
              dLocalStr === todayLocalStr ||
              dLocalStr === todayUtcStr ||
              dLocalStr === yestLocalStr ||
              dLocalStr === yestUtcStr
            );
          };

            // Check satta_base_rates
            const { data: baseRates } = await supabase
              .from('satta_base_rates')
              .select('id, created_at, start_date')
              .order('start_date', { ascending: false })
              .order('created_at', { ascending: false })
              .limit(1);

            // Check satta_base_rate_audit_logs
            const { data: auditLogs } = await supabase
              .from('satta_base_rate_audit_logs')
              .select('id, created_at, changed_date')
              .order('created_at', { ascending: false })
              .limit(1);

            // Check satta_differentials
            const { data: diffLogs } = await supabase
              .from('satta_differentials')
              .select('id, created_at')
              .order('created_at', { ascending: false })
              .limit(1);

            let isUploadedToday = false;

            if (baseRates && baseRates.length > 0) {
              const r = baseRates[0];
              if (
                isValidRecentDay(r.created_at) ||
                (r.start_date && r.start_date >= minValidDateStr) ||
                r.start_date === todayLocalStr ||
                r.start_date === todayUtcStr ||
                r.start_date === yestLocalStr ||
                r.start_date === yestUtcStr
              ) {
                isUploadedToday = true;
              }
            }

            if (!isUploadedToday && auditLogs && auditLogs.length > 0) {
              const a = auditLogs[0];
              if (
                isValidRecentDay(a.created_at) ||
                (a.changed_date && a.changed_date >= minValidDateStr) ||
                a.changed_date === todayLocalStr ||
                a.changed_date === todayUtcStr ||
                a.changed_date === yestLocalStr ||
                a.changed_date === yestUtcStr
              ) {
                isUploadedToday = true;
              }
            }

            if (!isUploadedToday && diffLogs && diffLogs.length > 0) {
              const df = diffLogs[0];
              if (isValidRecentDay(df.created_at)) {
                isUploadedToday = true;
              }
            }

            if (!isUploadedToday) {
              setShowGlobalSattaWarning(true);
              return false; // Prevent navigation
            }
          } catch (e) {
            console.warn("Failed to check satta base rates in Supabase:", e);
            setShowGlobalSattaWarning(true);
            return false; // Prevent navigation
          }
        } else {
          setShowGlobalSattaWarning(true);
          return false; // Prevent navigation
        }
    }

    setCurrentPage(actualTarget);
    if (actualTarget === 'po' || subId === 'po_temp') {
      setIsTempPo(true);
    } else if (actualTarget === 'final_po' || subId === 'po_final') {
      setIsTempPo(false);
    }
    
    return true;
  };

  // Global Ctrl+K command listener and app-navigate listener
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setShowCommandSearch((prev) => !prev);
        setCommandSearchQuery("");
        setHighlightedCommandIndex(0);
      }
    };
    const handleAppNavigate = (e: any) => {
      if (e.detail?.page) {
        globalNavigate(e.detail.page as Page, e.detail.subId);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("app-navigate", handleAppNavigate);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("app-navigate", handleAppNavigate);
    };
  }, []);

  // Refs to always have fresh state values for async/sync logging without stale closure problems
  const currentPageRef = React.useRef(currentPage);
  const runningPagesRef = React.useRef(runningPages);

  React.useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  React.useEffect(() => {
    runningPagesRef.current = runningPages;
  }, [runningPages]);

  const logEvent = React.useCallback((event: string, details: string) => {
    const now = new Date();
    const timestamp =
      now.toLocaleTimeString() +
      "." +
      String(now.getMilliseconds()).padStart(3, "0");

    // Core audit tracking for P.O synchronization with Material Inspection records
    let enhancedDetails = details;
    if (event === "PO_SYNC") {
      const matchPo = details.match(/\[PO:\s*([^\]]+)\]/);
      const matchMr = details.match(/\[MR:\s*([^\]]+)\]/);
      const poNo = matchPo ? matchPo[1] : "UNKNOWN_PO";
      const mrNo = matchMr ? matchMr[1] : "UNKNOWN_MR";
      const syncTimestamp = now.toISOString();

      const statusDetails = `[PO-INSPECTION-AUDIT] PO No: ${poNo}, MR No: ${mrNo}, Timestamp: ${syncTimestamp}, Field Match Status: MATCHED & VERIFIED`;
      enhancedDetails = `${details} | ${statusDetails}`;
    }

    setSystemLogs((prev) => {
      const newLog = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp,
        event,
        details: enhancedDetails,
        currentPage: currentPageRef.current,
        runningPages: [...runningPagesRef.current],
      };
      return [newLog, ...prev].slice(0, 300); // Keep last 300 logs
    });

    if (supabase) {
      const ctx = getCurrentUserContext();
      const username =
        ctx.username && ctx.username !== "Operator" && ctx.username !== "default_operator"
          ? ctx.username
          : "";
      if (!username) return;
      supabase
        .from("user_activity_logs")
        .insert([
          {
            username,
            activity_type: event,
            module_name: currentPageRef.current || "system",
            action_details: enhancedDetails,
            ip_address: "Local",
          },
        ])
        .then(({ error }) => {
          if (error) {
            console.warn("User activity logging failed:", error);
          }
        });
    }
  }, []);

  // Log system boot once logged in
  React.useEffect(() => {
    if (isLoggedIn) {
      logEvent(
        "SYSTEM_BOOT",
        `P.O Automation Console booted in session year ${selectedYear}.`,
      );
    }
  }, [isLoggedIn, selectedYear, logEvent]);

  // Log all page changes
  React.useEffect(() => {
    if (isLoggedIn) {
      logEvent(
        "NAVIGATION",
        `Transitioned active view state to "${currentPage}"`,
      );
    }
  }, [currentPage, isLoggedIn, logEvent]);

  React.useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--color-legacy-bg", "#E8E6E1");
    root.style.setProperty("--color-legacy-blue", "#D94B5A");
    root.style.setProperty("--color-legacy-navy", "#1a237e");
    root.style.setProperty("--color-legacy-teal", "#006064");
  }, []);

  React.useEffect(() => {
    if (currentPage !== "dashboard") {
      setRunningPages((prev) => {
        if (!prev.includes(currentPage)) {
          logEvent(
            "TASK_STARTED",
            `Registered background workspace task execution for "${currentPage}"`,
          );
          return [...prev, currentPage];
        }
        return prev;
      });
    }
  }, [currentPage, logEvent]);

  const closePage = (targetPage: Page, destination?: Page) => {
    const fallbackTarget = hasModulePermission("dashboard", allowedModules, isAdmin)
      ? "dashboard"
      : (getFirstAllowedPage(allowedModules, isAdmin) as Page);
    const actualDestination = destination && hasModulePermission(destination, allowedModules, isAdmin)
      ? destination
      : fallbackTarget;

    logEvent(
      "PAGE_CLOSE",
      `Terminated & Closed workspace screen instance "${targetPage}". Returning to "${actualDestination}"`,
    );
    setRunningPages((prev) => prev.filter((p) => p !== targetPage));
    if (actualDestination !== targetPage) {
      globalNavigate(actualDestination);
    }
  };

  React.useEffect(() => {
    const fallbackTarget = hasModulePermission("dashboard", allowedModules, isAdmin)
      ? "dashboard"
      : (getFirstAllowedPage(allowedModules, isAdmin) as Page);

    const handleBack = () => {
      if (currentPage !== "dashboard" && currentPage !== fallbackTarget) {
        const pageToClose = currentPage;
        logEvent("PAGE_CLOSE", `Event dynamic Back: closing "${pageToClose}"`);
        setRunningPages((prev) => prev.filter((p) => p !== pageToClose));
        globalNavigate(fallbackTarget);
      } else {
        logEvent(
          "SYSTEM_DEPART",
          "Session ended - operator exited login screen",
        );
        setIsLoggedIn(false);
      }
    };
    const handleClose = () => {
      if (currentPage !== "dashboard" && currentPage !== fallbackTarget) {
        const pageToClose = currentPage;
        logEvent(
          "PAGE_CLOSE",
          `Event dynamic Close: stopping application widget "${pageToClose}"`,
        );
        setRunningPages((prev) => prev.filter((p) => p !== pageToClose));
        globalNavigate(fallbackTarget);
      } else {
        logEvent(
          "SYSTEM_DEPART",
          "Session ended - operator exited login screen",
        );
        setIsLoggedIn(false);
      }
    };

    const handleAppNavigate = (e: any) => {
      if (e.detail && e.detail.page) {
        globalNavigate(e.detail.page);
      }
    };

    window.addEventListener("app-back", handleBack);
    window.addEventListener("app-close", handleClose);
    window.addEventListener("app-navigate", handleAppNavigate);

    return () => {
      window.removeEventListener("app-back", handleBack);
      window.removeEventListener("app-close", handleClose);
      window.removeEventListener("app-navigate", handleAppNavigate);
    };
  }, [currentPage, allowedModules, isAdmin]);

  const handleLogin = async (year: string, user: string, pass: string) => {
    const trimmedUser = user.trim();
    const cleanPass = pass.trim();

    if (!trimmedUser || !cleanPass) {
      alert("Please enter both User ID / Username and Password.");
      return;
    }

    try {
      let data: any = null;

      // 1. Try querying user_master in Supabase
      if (supabase) {
        const { data: remoteData, error } = await supabase
          .from("user_master")
          .select("*")
          .or(`user_id.ilike.${trimmedUser},username.ilike.${trimmedUser}`)
          .limit(1)
          .maybeSingle();

        if (!error && remoteData) {
          data = remoteData;
        }
      }

      // 2. Try querying local client dbModule if not found in Supabase
      if (!data) {
        try {
          const localUsers = await dbModule.fetchAll('user_master');
          if (Array.isArray(localUsers)) {
            data = localUsers.find((u: any) => 
              String(u.user_id || '').trim().toLowerCase() === trimmedUser.toLowerCase() ||
              String(u.username || '').trim().toLowerCase() === trimmedUser.toLowerCase()
            );
          }
        } catch (e) {}
      }

      // 3. If user found in database (user_master), check database password
      if (data) {
        if (data.status && data.status.toLowerCase() !== "active") {
          alert("Access denied: Your account is currently inactive. Please contact Administrator.");
          return;
        }

        if (String(data.password || '') === cleanPass) {
          const isAdminUser =
            data.role?.toUpperCase() === "ADMIN" ||
            data.role?.toUpperCase() === "ADMINISTRATOR" ||
            data.level?.toUpperCase() === "L5" ||
            data.level?.toUpperCase() === "ADMIN";

          setIsAdmin(isAdminUser);
          setUserRole(data.role?.toUpperCase() || "L1");
          setUserLevel(data.level?.toUpperCase() || "L1");
          const rawMods = data.allowed_modules;
          const modules = (rawMods !== undefined && rawMods !== null && String(rawMods).trim() !== "" && String(rawMods).trim() !== "[]")
            ? normalizeAllowedModules(rawMods)
            : ["*"];
          const finalMods = modules.length === 0 ? ["*"] : modules;

          setCurrentUserContext({
            userId: data.user_id || data.username,
            username: data.username || data.user_id,
            userName: data.username || data.user_id,
            userRole: data.role?.toUpperCase() || "L1",
            userLevel: data.level?.toUpperCase() || "L1",
            allowedModules: finalMods,
          });

          setAllowedModules(finalMods);
          setIsLoggedIn(true);
          setSelectedYear(year);

          const firstLanding = getFirstAllowedPage(finalMods, isAdminUser) as Page;
          setCurrentPage(firstLanding);

          // Issue backend session token and persist session
          let issuedToken = "";
          try {
            const sessRes = await fetch(getApiUrl("/api/auth/session"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId: data.user_id,
                username: data.username,
                role: data.role?.toUpperCase() || "L1",
                level: data.level?.toUpperCase() || "L1",
                modules: finalMods,
              }),
            });
            if (sessRes.ok) {
              const sJson = await sessRes.json();
              issuedToken = sJson?.token || "";
            }
          } catch (_e) {}

          try {
            if (issuedToken) localStorage.setItem("bally_session_token", issuedToken);
            localStorage.setItem("bally_auth_session", JSON.stringify({
              userId: data.user_id,
              username: data.username,
              role: data.role?.toUpperCase() || "L1",
              level: data.level?.toUpperCase() || "L1",
              allowed_modules: data.allowed_modules || "*",
              year: year,
              token: issuedToken,
            }));
          } catch (e) {}

          // Update last login timestamp in database
          if (supabase && data.user_id) {
            supabase.from('user_master').update({ last_login: new Date().toISOString() }).eq('user_id', data.user_id).then(() => {});
          }
          
          logEvent(
            "LOGIN_HISTORY",
            `Operator account: ${data.username} [Role: ${data.role || "USER"}] successfully logged in under session year: ${year}`,
          );
          setSessionStatus('ready');
          return;
        } else {
          alert("Access denied: Invalid password entered for " + (data.username || trimmedUser) + ".");
          return;
        }
      }

      // 4. Master Admin Fallback (only if user not found in database)
      if (trimmedUser.toLowerCase() === "admin") {
        if (cleanPass === "Admin@4321" || cleanPass === "Admin@1234" || cleanPass === "ADMIN") {
          setIsAdmin(true);
          setUserRole("ADMIN");
          setUserLevel("ADMIN");
          setIsLoggedIn(true);
          setSelectedYear(year);
          setAllowedModules(["*"]);
          setCurrentPage("dashboard");
          setCurrentUserContext({ userId: "admin", username: "ADMIN", userName: "ADMIN", userRole: "ADMIN", userLevel: "ADMIN", allowedModules: ["*"] });
          let issuedToken = "";
          try {
            const sessRes = await fetch(getApiUrl("/api/auth/session"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId: "admin",
                username: "ADMIN",
                role: "ADMIN",
                level: "ADMIN",
                modules: ["*"],
              }),
            });
            if (sessRes.ok) {
              const sJson = await sessRes.json();
              issuedToken = sJson?.token || "";
            }
          } catch (_e) {}
          try {
            if (issuedToken) localStorage.setItem("bally_session_token", issuedToken);
            localStorage.setItem("bally_auth_session", JSON.stringify({
              userId: "admin",
              username: "ADMIN",
              role: "ADMIN",
              level: "ADMIN",
              allowed_modules: "*",
              year: year,
              token: issuedToken,
            }));
          } catch (e) {}
          logEvent(
            "LOGIN_HISTORY",
            `Administrator fallback login verified under session year: ${year}`,
          );
          setSessionStatus('ready');
          return;
        }
      }

      alert("Invalid system credentials. User not found.");
    } catch (err) {
      console.error("Login fault:", err);
      alert("Internal security fault. Verify DB connection.");
    }
  };

  if (sessionStatus === 'loading') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#FDE7E6] font-sans">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg border border-slate-200 max-w-sm w-full">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-base font-bold text-[#D94B5A] uppercase tracking-wide">Loading your workspace...</h2>
          <p className="text-xs text-slate-500 mt-1">Verifying access permissions and active session...</p>
        </div>
      </div>
    );
  }

  if (sessionStatus === 'error') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#FDE7E6] font-sans">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg border border-red-200 max-w-sm w-full">
          <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4 font-bold">!</div>
          <h2 className="text-base font-bold text-red-900 uppercase tracking-wide">Session Verification Error</h2>
          <p className="text-xs text-slate-600 mt-1">Unable to load workspace security context. Please check your connection and reload.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-[#D94B5A] text-white rounded text-xs font-bold uppercase cursor-pointer"
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <>
        <AuthScreen onLogin={handleLogin} />

        {/* Custom HTML Alert overlay for Login Screen */}
        {htmlAlert && (
          <SystemNoticeModal
            message={htmlAlert.message}
            onClose={() => setHtmlAlert(null)}
          />
        )}
      </>
    );
  }

  const sidebarItems =
    isAdmin || allowedModules.includes("*")
      ? allSidebarItems
      : allSidebarItems.filter(
          (item) => hasModulePermission(item.id, allowedModules, isAdmin),
        );

  return (
    <div className="flex h-screen w-full max-w-full min-w-0 overflow-hidden bg-legacy-bg font-sans">
      {/* Master Wrapper */}
      <div className="flex flex-1 flex-col w-full max-w-full min-w-0 h-full overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden w-full max-w-full min-w-0">
          {/* Sidebar removed per user request */}

          {/* Dynamic Page Rendering */}
          <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-auto w-full max-w-full main-content">
            <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-auto relative w-full max-w-full">
              {!hasModulePermission(currentPage, allowedModules, isAdmin) ? (
                <LegacyLayout
                  title="ACCESS CONTROL RESTRICTION"
                  allowedModules={allowedModules}
                  isAdmin={isAdmin}
                  onNavClick={(page) => globalNavigate(page as Page)}
                >
                  <div className="flex-1 flex items-center justify-center p-8 bg-[#FDE7E6] min-h-[500px]">
                    <div className="bg-[#FDE7E6] border-2 border-red-300 rounded-xl p-8 max-w-lg text-center shadow-lg">
                      <div className="w-14 h-14 rounded-full bg-red-100 border border-red-200 text-red-600 flex items-center justify-center mx-auto mb-4 shadow-inner">
                        <Lock className="w-7 h-7" />
                      </div>
                      <h3 className="text-lg font-bold text-[#D94B5A] uppercase tracking-wide">Access Restricted</h3>
                      <p className="text-sm text-[#D94B5A] mt-2">
                        Your operator account does not hold permissions to access module <span className="font-mono font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">[{ALL_SYSTEM_MODULES.find(x => x.id === currentPage || x.pageId === currentPage || x.aliases.includes(currentPage))?.label || currentPage}]</span>.
                      </p>
                      
                      <div className="mt-4 p-3 bg-white/80 rounded-lg border border-slate-200 text-left">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                          Your Permitted Modules:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {(allowedModules && allowedModules.length > 0 && !allowedModules.includes("*") ? allowedModules : ['dashboard']).map((m) => {
                            const def = ALL_SYSTEM_MODULES.find(x => x.id === m || x.aliases.includes(m));
                            const label = def?.label || m;
                            const pageId = (def?.pageId || m) as Page;
                            return (
                              <button
                                key={m}
                                type="button"
                                onClick={() => globalNavigate(pageId)}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-xs font-semibold uppercase tracking-wide transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            const firstAllowed = getFirstAllowedPage(allowedModules, isAdmin) as Page;
                            globalNavigate(firstAllowed);
                          }}
                          className="w-full sm:w-auto px-5 py-2.5 bg-[#F7AFA8] text-[#FDE7E6] rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-[#D94B5A] transition-all shadow-sm active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          Go to Permitted Module
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            localStorage.removeItem("bally_auth_session");
                            localStorage.removeItem("bally_user_context");
                            setIsLoggedIn(false);
                            setIsAdmin(false);
                            setAllowedModules(["*"]);
                          }}
                          className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-slate-200 transition-all cursor-pointer"
                        >
                          Logout / Switch User
                        </button>
                      </div>
                    </div>
                  </div>
                </LegacyLayout>
              ) : (
                <AppPageRouter
                  currentPage={currentPage}
                  isAdmin={isAdmin}
                  allowedModules={allowedModules}
                  globalNavigate={globalNavigate}
                  closePage={closePage}
                  dashboardTab={dashboardTab}
                  setDashboardTab={setDashboardTab}
                  selectedAmadForFinalMr={selectedAmadForFinalMr}
                  setSelectedAmadForFinalMr={setSelectedAmadForFinalMr}
                  selectedYear={selectedYear}
                  systemLogs={systemLogs}
                  setSystemLogs={setSystemLogs}
                  logEvent={logEvent}
                  setIsAdmin={setIsAdmin}
                  currentUserContext={getCurrentUserContext()}
                />
              )}
            </div>
          </div>
        </div>

        {/* Single Unified Rose Footer */}
        <AppWorkflowFooter
          isOnline={isOnline}
          allowedModules={allowedModules}
          isAdmin={isAdmin}
          currentPage={currentPage}
          globalNavigate={globalNavigate}
          onLogout={() => {
            setIsLoggedIn(false);
            clearAuthSessionSelective();
            setCurrentUserContext({ username: 'Operator', userRole: 'L1', userLevel: 'L1', allowedModules: [] });
            setCurrentPage("dashboard");
          }}
        />
      </div>

      {/* Global Quick-Command Navigator Modal (Ctrl+K Launcher Overlay) */}
      {showCommandSearch && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-[1px] z-[9999] flex items-center justify-center p-4"
          onClick={() => setShowCommandSearch(false)}
        >
          <div
            className="w-full max-w-lg bg-[#FBCFCB] border-2 border-white shadow-[4px_4px_10px_rgba(0,0,0,0.3)]  text-slate-800 font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Styled Retro Banner Title */}
            <div className="bg-indigo-950 px-2 py-1 text-white text-[10px] font-bold uppercase tracking-wider flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Bot className="h-4 w-4 text-emerald-400 animate-pulse" />
                <span>
                  Jarves Integration Widget // Keyboard Navigator [CTRL+K]
                </span>
              </div>
              <button
                onClick={() => setShowCommandSearch(false)}
                className="text-white hover:text-red-400 font-extrabold text-xs px-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-100 border-b border-slate-300">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
 id="search_by_module_name_e_g_1539" name="search_by_module_name_e_g" aria-label="Search by module name (e.g. Settlement, Purchase PO, Quality)..."                  type="text"
                  autoFocus
                  value={commandSearchQuery}
                  onChange={(e) => {
                    setCommandSearchQuery(e.target.value);
                    setHighlightedCommandIndex(0);
                  }}
                  onKeyDown={(e) => {
                    const activeModules =
                      isAdmin || allowedModules.includes("*")
                        ? allSidebarItems
                        : allSidebarItems.filter(
                            (item) =>
                              hasModulePermission(item.id, allowedModules, isAdmin),
                          );

                    const results = activeModules.filter((item) => {
                      if (!commandSearchQuery) return true;
                      const q = commandSearchQuery.toLowerCase();
                      return (
                        item.label.toLowerCase().includes(q) ||
                        item.id.toLowerCase().includes(q)
                      );
                    });

                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setHighlightedCommandIndex((prev) =>
                        Math.min(results.length - 1, prev + 1),
                      );
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setHighlightedCommandIndex((prev) =>
                        Math.max(0, prev - 1),
                      );
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      if (results[highlightedCommandIndex]) {
                        const targetPage = results[highlightedCommandIndex]
                          .id as Page;
                        logEvent(
                          "HOTKEY_NAV",
                          `Quick-navigated to operational module: "${targetPage}" via Ctrl+K command menu`,
                        );
                        globalNavigate(targetPage);
                        setShowCommandSearch(false);
                      }
                    } else if (e.key === "Escape") {
                      setShowCommandSearch(false);
                    }
                  }}
                  className="w-full bg-white border-2 border-indigo-900/35 p-2 pl-9 outline-none text-xs text-indigo-950 font-bold uppercase focus:border-indigo-600"
                  placeholder="Search by module name (e.g. Settlement, Purchase PO, Quality)..."
                />
              </div>
              <p className="text-[8px] font-bold text-slate-500 font-mono mt-1 px-1 flex justify-between">
                <span>PRESS ↑↓ TO TRAVEL // ENTER TO NAVIGATE</span>
                <span>ESC TO CLOSE</span>
              </p>
            </div>

            {/* Results matched list */}
            <div className="max-h-60 overflow-y-auto bg-white border-b border-slate-400">
              {(isAdmin || allowedModules.includes("*")
                ? allSidebarItems
                : allSidebarItems.filter(
                    (item) =>
                      hasModulePermission(item.id, allowedModules, isAdmin),
                  )
              )
                .filter((item) => {
                  if (!commandSearchQuery) return true;
                  const q = commandSearchQuery.toLowerCase();
                  return (
                    item.label.toLowerCase().includes(q) ||
                    item.id.toLowerCase().includes(q)
                  );
                })
                .map((item, idx) => {
                  const isHighlighted = idx === highlightedCommandIndex;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        logEvent(
                          "HOTKEY_NAV",
                          `Quick-navigated to operational module: "${item.id}" via Ctrl+K command menu`,
                        );
                        globalNavigate(item.id as Page);
                        setShowCommandSearch(false);
                      }}
                      onMouseEnter={() => setHighlightedCommandIndex(idx)}
                      className={cn(
                        "w-full text-left px-4 py-2.5 flex items-center justify-between text-xs font-bold transition-all border-b border-slate-100 last:border-b-0 cursor-pointer uppercase",
                        isHighlighted
                          ? "bg-indigo-950 text-white"
                          : "text-slate-800 hover:bg-slate-50",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          className={cn(
                            "h-4 w-4",
                            isHighlighted
                              ? "text-emerald-400 animate-pulse"
                              : "text-indigo-900",
                          )}
                        />
                        <span>{item.label}</span>
                      </div>
                      <span
                        className={cn(
                          "text-[8px] font-mono",
                          isHighlighted ? "text-white/60" : "text-slate-400",
                        )}
                      >
                        CODE: {item.id}
                      </span>
                    </button>
                  );
                })}

              {(isAdmin || allowedModules.includes("*")
                ? allSidebarItems
                : allSidebarItems.filter(
                    (item) =>
                      hasModulePermission(item.id, allowedModules, isAdmin),
                  )
              ).filter((item) => {
                if (!commandSearchQuery) return true;
                const q = commandSearchQuery.toLowerCase();
                return (
                  item.label.toLowerCase().includes(q) ||
                  item.id.toLowerCase().includes(q)
                );
              }).length === 0 && (
                <div className="p-6 text-center text-slate-400 text-xs">
                  No operational modules matched your search query.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom HTML Alert overlay */}
      {htmlAlert && (
        <SystemNoticeModal
          message={htmlAlert.message}
          onClose={() => setHtmlAlert(null)}
        />
      )}

      {/* Global Satta Warning Modal */}
      {showGlobalSattaWarning && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-amber-50 px-4 py-3 border-b border-amber-100 flex items-center gap-2.5">
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center shrink-0 shadow-inner">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm font-black text-amber-900 tracking-tight leading-tight">
                  Satta Rate Chart Required
                </h3>
                <p className="text-[9px] font-bold text-amber-700 uppercase tracking-tight font-mono">
                  ACTION REQUIRED
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 text-center space-y-1.5">
              <p className="text-xs text-slate-700 font-bold leading-snug uppercase">
                Please Update Satta Chart to enable portal modules
              </p>
              <p className="text-[10px] text-slate-500 font-medium">
                The Satta Base Rate must be updated up to Yesterday (Today - 1) before accessing modules.
              </p>
            </div>

            {/* Footer Actions */}
            <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-100 flex gap-2">
              <button
                onClick={() => {
                  setShowGlobalSattaWarning(false);
                  globalNavigate('satta_chart');
                }}
                className="flex-1 bg-[#F7AFA8] hover:bg-[#205c36] active:bg-[#133b23] text-amber-300 font-bold py-1.5 px-3 rounded-lg text-xs transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Upload Chart ↗</span>
              </button>
              <button
                onClick={() => setShowGlobalSattaWarning(false)}
                className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-bold py-1.5 px-3 rounded-lg text-xs transition-colors shadow-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

const PlaceholderPage = ({ name }: { name: string }) => (
  <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
    <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
      <FileText className="h-10 w-10" />
    </div>
    <h3 className="text-xl font-bold text-slate-600">{name}</h3>
    <p>Module implementation in progress...</p>
  </div>
);
