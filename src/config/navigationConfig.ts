import React from "react";
import {
  LayoutDashboard,
  PlusCircle,
  HandCoins,
  FileText,
  Settings,
  X,
  PackageCheck,
  ClipboardList,
  Store,
  Lock,
  Archive,
  TrendingUp,
  Bot,
  ShieldCheck,
  FileCheck,
  CheckCircle2,
  Layers,
  AlertTriangle,
  Link,
  Users,
  Scale,
  DoorClosed,
  Truck,
  ClipboardCheck,
  Wallet,
  Sparkles,
  MessageSquare,
} from "lucide-react";

export type Page =
  | "dashboard"
  | "amad"
  | "amad_entry"
  | "sauda"
  | "sauda_entry"
  | "satta"
  | "satta_entry"
  | "bardana"
  | "vyapari"
  | "reports"
  | "payment"
  | "ledger"
  | "balances"
  | "settings"
  | "stock"
  | "po"
  | "final_po"
  | "issue"
  | "requisition_desk"
  | "admindesk"
  | "ai_assistant"
  | "material_inspection"
  | "inspection"
  | "mr_settlement"
  | "closing_stock"
  | "closing_stock_entry"
  | "mismatch"
  | "material_mismatch"
  | "club_po_mr"
  | "return_lorry"
  | "final_arrival"
  | "satta_chart"
  | "sms_sauda"
  | "weight_bridge"
  | "main_gate"
  | "trades"
  | "treds"
  | "trade"
  | "system_change_logs";

export const allSidebarItems = [
  { id: "dashboard", label: "Operational Hub", icon: LayoutDashboard },
  { id: "main_gate", label: "Main Gate (Temporary Arrival)", icon: Truck },
  { id: "sms_sauda", label: "SMS Sauda Desk", icon: MessageSquare },
  { id: "sauda", label: "Sauda Desk", icon: HandCoins },
  { id: "po", label: "Sauda Check Point", icon: FileText },
  { id: "final_po", label: "Final P.O", icon: FileText },
  { id: "amad", label: "Temporary Arrival", icon: Archive },
  { id: "final_arrival", label: "Final Arrival", icon: CheckCircle2 },
  { id: "inspection", label: "MILL INSPECTION", icon: ClipboardCheck },
  { id: "material_inspection", label: "INSPECTION CHECKLIST", icon: ShieldCheck },
  { id: "mismatch", label: "Mismatch Case", icon: AlertTriangle },
  { id: "club_po_mr", label: "Club P.O & Arrival", icon: Link },
  { id: "return_lorry", label: "Return Lorry", icon: Truck },
  { id: "payment", label: "Payment", icon: Wallet },
  { id: "mr_settlement", label: "Settlement", icon: FileCheck },
  { id: "issue", label: "Material Issue", icon: PackageCheck },
  { id: "bardana", label: "Godown Master", icon: Store },
  { id: "closing_stock", label: "Stock Inventory", icon: Layers },
  { id: "weight_bridge", label: "Weight Bridge", icon: Scale },
  { id: "reports", label: "Reports", icon: TrendingUp },
  { id: "settings", label: "Config Center", icon: Settings },
  { id: "admindesk", label: "Admin Desk", icon: Lock },
  { id: "satta", label: "Satta", icon: Sparkles },
  { id: "requisition_desk", label: "Requisition Desk", icon: ClipboardList },
  { id: "vyapari", label: "Trade (Traders Directory)", icon: Users },
  { id: "ai_assistant", label: "Jarves AI 2.0", icon: Bot },
  { id: "treds", label: "Trade", icon: Wallet },
];

export function getPageMeta(pageId: string) {
  const item = allSidebarItems.find((i) => i.id === pageId);
  if (item) {
    return { label: item.label, title: item.label, icon: item.icon };
  }

  if (pageId === "main_gate" || pageId === "maingate") {
    return { label: "Main Gate", title: "Main Gate", icon: Truck };
  }
  if (pageId === "amad_entry") {
    return { label: "Amad Entry", title: "Amad Entry", icon: PlusCircle };
  }
  if (pageId === "sauda_entry") {
    return { label: "Sauda Entry", title: "Sauda Entry", icon: PlusCircle };
  }
  if (pageId === "satta_entry") {
    return { label: "Satta Entry", title: "Satta Entry", icon: PlusCircle };
  }
  if (pageId === "vyapari" || pageId === "trade" || pageId === "treds" || pageId === "trades" || pageId === "trede") {
    return { label: "Trade", title: "Trade", icon: Wallet };
  }
  if (pageId === "admindesk") {
    return { label: "Admin Desk", title: "Admin Desk", icon: Settings };
  }
  if (pageId === "payment") {
    return { label: "Payment Module", title: "Payment Module", icon: FileText };
  }

  const fallbackLabel = pageId
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const label = fallbackLabel === "Ai Assistant" ? "AI Assistant" : fallbackLabel;
  return {
    label,
    title: label,
    icon: LayoutDashboard,
  };
}

export const JCI_WORKFLOW_STEPS: {
  stepNumber: number;
  title: string;
  pageId: Page;
  matchPages: Page[];
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
}[] = [
  {
    stepNumber: 1,
    title: "Sauda Entry",
    pageId: "sauda",
    matchPages: ["sauda", "sauda_entry", "sms_sauda"],
    icon: HandCoins,
    desc: "Contract & Rate Booking",
  },
  {
    stepNumber: 2,
    title: "Sauda Check Point",
    pageId: "po",
    matchPages: ["po"],
    icon: FileText,
    desc: "Sauda Check Point & Verification",
  },
  {
    stepNumber: 3,
    title: "Temporary Arrival",
    pageId: "amad",
    matchPages: ["amad", "amad_entry", "main_gate"],
    icon: Archive,
    desc: "Gate Inward & Temporary MR",
  },
  {
    stepNumber: 4,
    title: "Mismatch Section",
    pageId: "material_mismatch",
    matchPages: ["material_mismatch", "mismatch"],
    icon: AlertTriangle,
    desc: "Material & Quality Discrepancies",
  },
  {
    stepNumber: 5,
    title: "Final Arrival",
    pageId: "final_arrival",
    matchPages: ["final_arrival"],
    icon: CheckCircle2,
    desc: "Final Weighbridge Arrival & MR",
  },
  {
    stepNumber: 6,
    title: "Mill Inspection",
    pageId: "inspection",
    matchPages: ["inspection", "material_inspection"],
    icon: ClipboardCheck,
    desc: "Quality Audit & Lab Inspection",
  },
  {
    stepNumber: 7,
    title: "Final P.O.",
    pageId: "final_po",
    matchPages: ["final_po"],
    icon: FileText,
    desc: "Approved Final Purchase Order",
  },
  {
    stepNumber: 8,
    title: "Payment",
    pageId: "payment",
    matchPages: ["payment"],
    icon: Wallet,
    desc: "Payment & Accounts Voucher",
  },
  {
    stepNumber: 9,
    title: "Settlement",
    pageId: "mr_settlement",
    matchPages: ["mr_settlement"],
    icon: FileCheck,
    desc: "Final Accounts & Rate Settlement",
  },
];
