import { LucideIcon } from 'lucide-react';

export interface GodownUtil {
  code: string;
  name: string;
  capacity: number;
  stockMt: number;
  weightQtl: number;
  bales: number;
  utilization: number;
  stocks: any[];
}

export interface SmsSaudaItem {
  id: string;
  trader: string;
  supplier?: string;
  unitType?: string;
  status?: 'Active' | 'Partial' | 'Closed' | 'Pending' | 'Completed';
  grade: string;
  bales: number;
  rate: number;
  date: string;
}

export interface SheetSmsItem {
  id: string;
  body: string;
  service_center: string;
  contact_name: string;
  date: string;
}

export interface SettlementStats {
  total: number;
  pending: number;
  settled: number;
  partiallyPaid: number;
  totalWeightMT: number;
  totalScaleNetMT: number;
}

export interface ArrivalsMetrics {
  totalPackets: number;
  totalWeightQtl: number;
}

export interface QuickReportState {
  totalArrivals: number;
  pendingMrSettlements: number;
  totalPackets: number;
  totalWeightQtl: number;
  loading: boolean;
  error: string;
}

export interface DashboardStats {
  arrivals: string;
  sauda: string;
  traders: string;
  po: string;
  godownUtilization: string;
  totalStockMt: number;
}

export interface ProcessStepItem {
  id: string;
  mappedId?: string;
  label: string;
  icon: LucideIcon;
  desc: string;
  step: string;
  start: string;
  end: string;
  textColor?: string;
  descColor?: string;
  badgeColor?: string;
  iconBg?: string;
}

export interface DashboardSection {
  title: string;
  desc: string;
  borderColor: string;
  headerBg: string;
  items: Array<{
    id: string;
    mappedId: string;
    label: string;
    icon: LucideIcon;
    desc: string;
    step: string;
    start: string;
    end: string;
  }>;
}

export interface DashboardProps {
  onNavigate: (page: any, subId?: string) => void | Promise<boolean>;
  isAdmin?: boolean;
  allowedModules?: string[];
  currentTab?: 'menu' | 'mismatch' | 'reports';
  setCurrentTab?: (tab: 'menu' | 'mismatch' | 'reports') => void;
  isActive?: boolean;
}
