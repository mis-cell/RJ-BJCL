import React from 'react';
import {
  User,
  ClipboardList,
  Terminal,
  Layers,
  FileText,
  Archive,
  CheckCircle2,
  Box,
  Users,
  MapPin,
  Scale,
  DollarSign,
  Calendar,
  MessageSquare,
  AlertTriangle,
  Mail,
  Database
} from 'lucide-react';

export interface TableDef {
  name: string;
  label: string;
  icon: any;
  pk: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  event: string;
  details: string;
  currentPage: string;
  runningPages: string[];
}

export interface PrintLogEntry {
  id: string;
  timestamp: string;
  user_id: string;
  details: string;
  row_ids?: string[];
  [key: string]: any;
}

export interface PrintQueueItem {
  id: string;
  module: 'po' | 'sauda' | 'amad' | 'material_inspection' | 'stock';
  refNo: string;
  title: string;
  summary: string;
  timestamp: string;
  payload: any;
}

export interface SyncLogEntry {
  id: string;
  timestamp: string;
  user_id: string;
  finalArrivalNo: string;
  mrNo: string;
  originalState: any;
  updatedState: any;
  rawDetails: string;
}

export const TABLES: TableDef[] = [
  // Authentication & System Logs
  { name: "user_master", label: "User Master", icon: User, pk: "user_id" },
  { name: "user_activity_logs", label: "User Activity Logs", icon: ClipboardList, pk: "log_id" },

  // Sauda & Satta Desk
  { name: "sauda_master", label: "Sauda Master", icon: FileText, pk: "sauda_id" },
  { name: "sauda_quality_details", label: "Sauda Quality Details", icon: Layers, pk: "detail_id" },
  { name: "sauda_check_point", label: "Sauda Check Point", icon: CheckCircle2, pk: "id" },
  { name: "sauda_check_point_details", label: "Sauda Check Point Details", icon: Layers, pk: "id" },
  { name: "sauda_check_point_deductions", label: "Sauda Check Point Deductions", icon: DollarSign, pk: "id" },
  { name: "satta_master", label: "Satta Master", icon: FileText, pk: "satta_id" },
  { name: "satta_quality_details", label: "Satta Quality Details", icon: Layers, pk: "id" },
  { name: "satta_base_rates", label: "Satta Base Rates", icon: DollarSign, pk: "id" },
  { name: "satta_base_rate_audit_logs", label: "Satta Base Rate Audit Logs", icon: ClipboardList, pk: "id" },
  { name: "satta_differentials", label: "Satta Differentials", icon: Layers, pk: "id" },
  { name: "satta_calculated_rates", label: "Satta Calculated Rates", icon: FileText, pk: "id" },
  { name: "satta_mismatch", label: "Satta Mismatch", icon: AlertTriangle, pk: "id" },

  // Purchase Order Desk
  { name: "purchase_master", label: "Purchase Master", icon: FileText, pk: "po_id" },
  { name: "purchase_detail_master", label: "Purchase Detail Master", icon: Layers, pk: "item_id" },
  { name: "po_archive", label: "PO Archive", icon: Archive, pk: "id" },

  // Material Inward & Arrival (Amad & Final Arrival)
  { name: "temporary_material_received", label: "Temporary M.R (Current)", icon: Archive, pk: "amad_id" },
  { name: "amad_change_history", label: "Amad Change History", icon: ClipboardList, pk: "id" },
  { name: "final_arrival", label: "Final M.R", icon: CheckCircle2, pk: "final_arrival_id" },

  // Inspection Modules
  { name: "material_inspection", label: "Material Inspection", icon: CheckCircle2, pk: "id" },
  { name: "material_inspection_details", label: "Material Inspection Details", icon: Layers, pk: "id" },
  { name: "material_inspection_deductions", label: "Material Inspection Deductions", icon: DollarSign, pk: "id" },
  { name: "material_mismatch", label: "Material Mismatch", icon: AlertTriangle, pk: "id" },
  { name: "mill_inspection_master", label: "Mill Inspection Master", icon: CheckCircle2, pk: "id" },
  { name: "mill_inspection_detail", label: "Mill Inspection Detail", icon: Layers, pk: "id" },
  { name: "mill_inspection_deduction", label: "Mill Inspection Deduction", icon: DollarSign, pk: "id" },
  { name: "mill_inspection_print_logs", label: "Mill Inspection Print Logs", icon: ClipboardList, pk: "id" },
  { name: "inspection_master", label: "Inspection Master", icon: CheckCircle2, pk: "id" },
  { name: "inspection_details", label: "Inspection Details", icon: Layers, pk: "id" },
  { name: "inspection_checklist_details", label: "Inspection Checklist Details", icon: ClipboardList, pk: "id" },

  // M.R. Settlement & Accounts
  { name: "mr_settlement_master", label: "MR Settlement Master", icon: FileText, pk: "settlement_id" },
  { name: "mr_settlement_detail", label: "MR Settlement Detail", icon: Layers, pk: "detail_id" },
  { name: "m_r_settlement", label: "M.R Settlement (Summary)", icon: FileText, pk: "id" },
  { name: "payment_master", label: "Payment Master", icon: DollarSign, pk: "payment_id" },
  { name: "payment_details", label: "Payment Details", icon: Layers, pk: "id" },
  { name: "party_ledger", label: "Party Ledger", icon: FileText, pk: "id" },

  // Material Issue & Mill Production
  { name: "issue_master", label: "Issue Master", icon: Layers, pk: "amad_id" },
  { name: "mill_issue_master", label: "Mill Issue Master", icon: Layers, pk: "issue_id" },
  { name: "mill_issue_detail", label: "Mill Issue Detail", icon: Layers, pk: "id" },
  { name: "production_records", label: "Production Records", icon: Layers, pk: "id" },

  // Godown & Inventory Management
  { name: "godown_master", label: "Godown Master", icon: Box, pk: "gdn_code" },
  { name: "godown_entry", label: "Godown Entry", icon: FileText, pk: "id" },
  { name: "godown_audit", label: "Godown Audit Logs", icon: ClipboardList, pk: "id" },
  { name: "godown_wise_stock", label: "Godown Wise Stock", icon: Box, pk: "id" },
  { name: "godown_to_factory_master", label: "Godown To Factory Master", icon: Layers, pk: "id" },
  { name: "godown_to_factory_detail", label: "Godown To Factory Detail", icon: Layers, pk: "id" },
  { name: "opening_stock", label: "Opening Stock", icon: CheckCircle2, pk: "id" },
  { name: "closing_stock", label: "Closing Stock", icon: CheckCircle2, pk: "id" },

  // Masters & References
  { name: "supply_master", label: "Supply Master", icon: Users, pk: "supp_code" },
  { name: "customer_master", label: "Customer Master", icon: Users, pk: "id" },
  { name: "broker_master", label: "Broker Master", icon: Users, pk: "brok_code" },
  { name: "area_master", label: "Area Master", icon: MapPin, pk: "area_code" },
  { name: "agency_master", label: "Agency Master", icon: MapPin, pk: "agency_code" },
  { name: "grade_master", label: "Grade Master", icon: Layers, pk: "grade_code" },
  { name: "marka_master", label: "Marka Master", icon: Box, pk: "marka_code" },
  { name: "batch_master", label: "Batch Master", icon: Layers, pk: "code" },
  { name: "unit_master", label: "Unit Master", icon: Layers, pk: "id" },
  { name: "lorry_weighments", label: "Lorry Weighments", icon: Scale, pk: "id" },
  { name: "tolerance_policy", label: "Tolerance Policy", icon: Scale, pk: "id" },
  { name: "deduction_master", label: "Deduction Master", icon: DollarSign, pk: "id" },
  { name: "moisture_logic", label: "Moisture Logic", icon: ClipboardList, pk: "id" },
  { name: "sms_sauda", label: "SMS Sauda", icon: MessageSquare, pk: "id" },
  { name: "requisitions", label: "Requisitions", icon: FileText, pk: "id" },
  { name: "department_master", label: "Department Master", icon: Layers, pk: "dept_code" },
  { name: "financial_year_master", label: "Financial Year Master", icon: Calendar, pk: "year_code" },
  { name: "report_master", label: "Report Master", icon: FileText, pk: "id" },
  { name: "mail_logs", label: "Mail Logs", icon: Mail, pk: "id" },
  { name: "imap_emails", label: "IMAP Emails", icon: Mail, pk: "id" },
];
