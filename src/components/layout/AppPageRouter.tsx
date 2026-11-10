import React from "react";
import { ScreenErrorBoundary } from "../ScreenErrorBoundary";
import { Page, getPageMeta } from "../../config/navigationConfig";

// Static page component imports to prevent dynamic chunk/module fetch errors on remote networks
import TemporaryArrival from "../../pages/TemporaryArrival";
import AmadRegister from "../../pages/AmadRegister";
import SaudaEntry from "../../pages/SaudaEntry";
import BardanaVouchers from "../../pages/BardanaVouchers";
import DirectoryView from "../../pages/DirectoryView";
import Reports from "../../pages/Reports";
import Dashboard from "../../pages/Dashboard";
import StockSummary from "../../pages/StockSummary";
import ConfigGuide from "../../pages/ConfigGuide";
import SaudaRegister from "../../pages/SaudaRegister";
import SmsSaudaDesk from "../../pages/SmsSaudaDesk";
import SattaRegister from "../../pages/SattaRegister";
import SattaEntry from "../../pages/SattaEntry";
import SattaChart from "../../pages/SattaChart";
import PurchaseOrder from "../../pages/PurchaseOrder";
import MaterialIssue from "../../pages/MaterialIssue";
import AdminDesk from "../../pages/AdminDesk";
import AIPortal from "../../pages/AIPortal";
import MaterialInspection from "../../pages/MaterialInspection";
import ReturnLorry from "../../pages/ReturnLorry";
import Inspection from "../../pages/Inspection";
import WeightBridge from "../../pages/WeightBridge";
import MrSettlement from "../../pages/MrSettlement";
import ClosingStockEntry from "../../pages/ClosingStockEntry";
import MismatchCase from "../../pages/MismatchCase";
import ClubPOMR from "../../pages/ClubPOMR";
import FinalArrival from "../../pages/FinalArrival";
import RequisitionDesk from "../../pages/RequisitionDesk";
import PaymentModule from "../../pages/PaymentModule";
import TredeReport from "../../pages/TredeReport";
import LorryDispatchSystem from "../../pages/LorryDispatchSystem";
import SystemChangeLogPage from "../../pages/SystemChangeLogPage";

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

export interface AppPageRouterProps {
  currentPage: Page;
  isAdmin: boolean;
  allowedModules: string[];
  globalNavigate: (page: Page) => void;
  closePage: (targetPage: Page, destination?: Page) => void;
  dashboardTab: "menu" | "mismatch" | "reports";
  setDashboardTab: (tab: "menu" | "mismatch" | "reports") => void;
  selectedAmadForFinalMr: any;
  setSelectedAmadForFinalMr: (amad: any) => void;
  selectedYear: string;
  systemLogs: any[];
  setSystemLogs: React.Dispatch<React.SetStateAction<any[]>>;
  logEvent: (type: string, description: string) => void;
  setIsAdmin: (isAdmin: boolean) => void;
  currentUserContext: any;
}

export const AppPageRouter: React.FC<AppPageRouterProps> = ({
  currentPage,
  isAdmin,
  allowedModules,
  globalNavigate,
  closePage,
  dashboardTab,
  setDashboardTab,
  selectedAmadForFinalMr,
  setSelectedAmadForFinalMr,
  selectedYear,
  systemLogs,
  setSystemLogs,
  logEvent,
  setIsAdmin,
  currentUserContext,
}) => {
  const meta = getPageMeta(currentPage);
  const title = meta?.title || currentPage;

  let content: React.ReactNode = null;

  switch (currentPage) {
    case "dashboard":
      content = (
        <Dashboard
          isActive={currentPage === "dashboard"}
          onNavigate={globalNavigate}
          isAdmin={isAdmin}
          allowedModules={allowedModules}
          currentTab={dashboardTab}
          setCurrentTab={setDashboardTab}
        />
      );
      break;
    case "main_gate":
      content = (
        <LorryDispatchSystem
          onNavigate={(page) => globalNavigate(page as Page)}
        />
      );
      break;
    case "amad":
      content = (
        <AmadRegister
          onClose={() => closePage("amad", "dashboard")}
          onNew={() => globalNavigate("amad_entry")}
          onNavigate={(page) => globalNavigate(page as Page)}
          onCreateFinalMr={(amad) => {
            setSelectedAmadForFinalMr(amad);
            globalNavigate("final_arrival");
          }}
        />
      );
      break;
    case "amad_entry":
      content = (
        <TemporaryArrival
          onCancel={() => closePage("amad_entry", "amad")}
          onSave={() => closePage("amad_entry", "amad")}
        />
      );
      break;
    case "sms_sauda":
      content = (
        <SmsSaudaDesk
          onClose={() => closePage("sms_sauda", "dashboard")}
          onNavigate={(page) => globalNavigate(page as Page)}
        />
      );
      break;
    case "sauda":
      content = (
        <SaudaRegister
          isActive={currentPage === "sauda"}
          onClose={() => closePage("sauda", "dashboard")}
          onNew={() => globalNavigate("sauda_entry")}
        />
      );
      break;
    case "sauda_entry":
      content = (
        <SaudaEntry
          onCancel={() => closePage("sauda_entry", "sauda")}
          onSave={() => closePage("sauda_entry", "sauda")}
          onNavigate={(page) => globalNavigate(page as Page)}
        />
      );
      break;
    case "satta":
      content = (
        <SattaChart onClose={() => closePage("satta", "dashboard")} />
      );
      break;
    case "satta_entry":
      content = (
        <SattaEntry
          onCancel={() => closePage("satta_entry", "satta")}
          onSave={() => closePage("satta_entry", "satta")}
        />
      );
      break;
    case "satta_chart":
      content = (
        <SattaChart
          onNavigate={(p) => globalNavigate(p as Page)}
          onClose={() => closePage("satta_chart", "dashboard")}
        />
      );
      break;
    case "po":
      content = (
        <PurchaseOrder
          onClose={() => closePage("po", "dashboard")}
          selectedYear={selectedYear}
          isTempPo={true}
        />
      );
      break;
    case "final_po":
      content = (
        <PurchaseOrder
          onClose={() => closePage("final_po", "dashboard")}
          selectedYear={selectedYear}
          isTempPo={false}
        />
      );
      break;
    case "issue":
      content = (
        <MaterialIssue
          onCancel={() => closePage("issue", "dashboard")}
          onSave={() => closePage("issue", "dashboard")}
          setCurrentPage={globalNavigate}
          closePage={closePage}
        />
      );
      break;
    case "bardana":
      content = (
        <BardanaVouchers
          onClose={() => closePage("bardana", "dashboard")}
        />
      );
      break;
    case "vyapari":
    case "trade" as any:
      content = (
        <DirectoryView
          title="Trade (Traders Directory)"
          type="vyapari"
          onClose={() => closePage("vyapari", "dashboard")}
        />
      );
      break;
    case "reports":
      content = (
        <Reports onClose={() => closePage("reports", "dashboard")} />
      );
      break;
    case "treds":
    case "trades" as any:
    case "trede" as any:
      content = (
        <TredeReport onClose={() => closePage(currentPage, "dashboard")} />
      );
      break;
    case "payment":
      content = (
        <PaymentModule onClose={() => closePage("payment", "dashboard")} />
      );
      break;
    case "stock":
      content = (
        <StockSummary
          onClose={() => closePage("stock", "dashboard")}
        />
      );
      break;
    case "settings":
      content = (
        <ConfigGuide
          onClose={() => closePage("settings", "dashboard")}
        />
      );
      break;
    case "system_change_logs":
    case "system_change_log" as any:
    case "change_log" as any:
      content = (
        <SystemChangeLogPage
          onClose={() => closePage(currentPage, "dashboard")}
          onNavigate={(p) => globalNavigate(p as Page)}
        />
      );
      break;
    case "admindesk":
      content = (
        <AdminDesk
          onClose={() => closePage("admindesk", "dashboard")}
          onLogin={() => setIsAdmin(true)}
          isAdmin={isAdmin}
          systemLogs={systemLogs}
          onClearLogs={() => setSystemLogs([])}
          onNavigate={(page) => globalNavigate(page)}
        />
      );
      break;
    case "ai_assistant":
      content = (
        <AIPortal
          onClose={() => closePage("ai_assistant", "dashboard")}
        />
      );
      break;
    case "material_inspection":
      content = (
        <MaterialInspection
          onClose={() => closePage("material_inspection", "dashboard")}
          onLogEvent={logEvent}
        />
      );
      break;
    case "return_lorry":
      content = (
        <ReturnLorry
          onClose={() => closePage("return_lorry", "dashboard")}
          onLogEvent={logEvent}
        />
      );
      break;
    case "inspection":
      content = (
        <Inspection
          onNavigate={(page) => globalNavigate(page as Page)}
        />
      );
      break;
    case "mr_settlement":
      content = (
        <MrSettlement
          onClose={() => closePage("mr_settlement", "dashboard")}
          onLogEvent={logEvent}
        />
      );
      break;
    case "closing_stock":
    case "closing_stock_entry":
      content = (
        <ClosingStockEntry
          onClose={() => closePage("closing_stock", "dashboard")}
        />
      );
      break;
    case "mismatch":
      content = (
        <MismatchCase
          variant="satta"
          onClose={() => closePage("mismatch", "dashboard")}
        />
      );
      break;
    case "material_mismatch":
      content = (
        <MismatchCase
          variant="material"
          onClose={() => closePage("material_mismatch", "dashboard")}
        />
      );
      break;
    case "club_po_mr":
      content = (
        <ClubPOMR
          onClose={() => closePage("club_po_mr", "dashboard")}
        />
      );
      break;
    case "final_arrival":
      content = (
        <FinalArrival
          initialData={selectedAmadForFinalMr}
          onClose={() => {
            setSelectedAmadForFinalMr(null);
            closePage("final_arrival", "dashboard");
          }}
        />
      );
      break;
    case "requisition_desk":
      content = (
        <RequisitionDesk
          onClose={() => closePage("requisition_desk", "dashboard")}
        />
      );
      break;
    case "weight_bridge":
      content = (
        <WeightBridge
          currentUser={currentUserContext}
          allowedModules={allowedModules}
          onNavigate={(page) => globalNavigate(page as Page)}
        />
      );
      break;
    default:
      content = (
        <div className="flex-1 flex items-center justify-center p-8 text-slate-500">
          <span className="text-xs uppercase font-bold tracking-wider">
            Module [{currentPage}] Not Found
          </span>
        </div>
      );
  }

  return (
    <ScreenErrorBoundary key={currentPage} moduleName={title}>
      <React.Suspense fallback={<PageLoadingFallback moduleName={title} />}>
        <div className="flex-1 flex flex-col h-full w-full min-h-0 overflow-auto">
          {content}
        </div>
      </React.Suspense>
    </ScreenErrorBoundary>
  );
};
