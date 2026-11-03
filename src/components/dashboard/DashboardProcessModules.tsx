import React, { useState } from 'react';
import {
  HandCoins,
  FileText,
  Clock,
  ClipboardCheck,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Link,
  PackageCheck,
  FileCheck,
  Layers,
  Scale,
  BarChart3,
  Lock,
  Sparkles,
  ClipboardList,
  LockKeyhole,
  ArrowRight,
  MessageSquare,
  Wallet
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { hasModulePermission } from '../../lib/permissions';
import { ProcessStepItem, DashboardSection } from './types';

export interface DashboardProcessModulesProps {
  isAdmin?: boolean;
  allowedModules?: string[];
  onNavigate: (page: any, subId?: string) => void | Promise<boolean>;
}

export const processSteps: ProcessStepItem[] = [
  { 
    id: 'sauda', 
    label: 'SAUDA DESK', 
    icon: HandCoins, 
    desc: 'Sauda Contract Bookings', 
    step: '1',
    start: '#6DE195',
    end: '#C4E759',
    textColor: 'text-emerald-950',
    descColor: 'text-emerald-900/80',
    badgeColor: 'bg-emerald-950/10 text-emerald-950 border-emerald-950/20',
    iconBg: 'bg-emerald-950/20 text-emerald-950'
  },
  { 
    id: 'po', 
    label: 'SAUDA CHECK POINT', 
    icon: FileText, 
    desc: 'Verify Active Purchase Orders', 
    step: '2',
    start: '#6CACFF',
    end: '#8DEBFF',
    textColor: 'text-blue-950',
    descColor: 'text-blue-900/80',
    badgeColor: 'bg-blue-950/10 text-blue-950 border-blue-950/20',
    iconBg: 'bg-blue-950/20 text-blue-950'
  },
  { 
    id: 'amad', 
    label: 'TEMPORARY M.R', 
    icon: Clock, 
    desc: 'Log Incoming Lorry Gates', 
    step: '3',
    start: '#41C7AF',
    end: '#54E38E',
    textColor: 'text-teal-950',
    descColor: 'text-teal-900/80',
    badgeColor: 'bg-teal-950/10 text-teal-950 border-teal-950/20',
    iconBg: 'bg-teal-950/20 text-teal-950'
  },
  { 
    id: 'inspection', 
    label: 'MILL INSPECTION', 
    icon: ClipboardCheck, 
    desc: 'Quality Audit Register', 
    step: '4',
    start: '#10B981',
    end: '#059669',
    textColor: 'text-white',
    descColor: 'text-emerald-100/90',
    badgeColor: 'bg-white/15 text-white border-white/20',
    iconBg: 'bg-white/15 text-white'
  },
  { 
    id: 'material_inspection', 
    label: 'INSPECTION CHECKLIST', 
    icon: ShieldCheck, 
    desc: 'Mill Quality & Moisture Inspection', 
    step: '4.1',
    start: '#5583EE',
    end: '#41D8DD',
    textColor: 'text-white',
    descColor: 'text-sky-100/90',
    badgeColor: 'bg-white/15 text-white border-white/20',
    iconBg: 'bg-white/15 text-white'
  },
  { 
    id: 'final_arrival', 
    label: 'FINAL ARRIVAL', 
    icon: CheckCircle2, 
    desc: 'Acceptance & Weighbridge Entry', 
    step: '5',
    start: '#99E5A2',
    end: '#D4FC78',
    textColor: 'text-slate-900',
    descColor: 'text-slate-800/85',
    badgeColor: 'bg-slate-900/10 text-slate-900 border-slate-900/20',
    iconBg: 'bg-slate-950/20 text-slate-950'
  },
  { 
    id: 'mismatch', 
    label: 'MISMATCH CASE', 
    icon: AlertTriangle, 
    desc: 'Discrepant Transactions Audit', 
    step: '6',
    start: '#FF9B42',
    end: '#FF5E62',
    textColor: 'text-white',
    descColor: 'text-rose-50/90',
    badgeColor: 'bg-white/15 text-white border-white/20',
    iconBg: 'bg-white/15 text-white'
  },
  { 
    id: 'club_po_mr', 
    label: 'CLUB P.O & M.R', 
    icon: Link, 
    desc: 'Bind Contracts to Arrivals', 
    step: '7',
    start: '#4E65FF',
    end: '#92EFFD',
    textColor: 'text-white',
    descColor: 'text-sky-50/90',
    badgeColor: 'bg-white/15 text-white border-white/20',
    iconBg: 'bg-white/15 text-white'
  },
  { 
    id: 'issue', 
    label: 'MATERIAL ISSUE', 
    icon: PackageCheck, 
    desc: 'Dispatch Material to Mill Floors', 
    step: '8',
    start: '#A16BFE',
    end: '#DEB0DF',
    textColor: 'text-white',
    descColor: 'text-purple-100/90',
    badgeColor: 'bg-white/15 text-white border-white/20',
    iconBg: 'bg-white/15 text-white'
  },
  { 
    id: 'mr_settlement', 
    label: 'M.R. SETTLEMENT', 
    icon: FileCheck, 
    desc: 'Weighbridge Quantity Settlements', 
    step: '9',
    start: '#D279EE',
    end: '#F8C390',
    textColor: 'text-white',
    descColor: 'text-indigo-950/85',
    badgeColor: 'bg-white/15 text-white border-white/20',
    iconBg: 'bg-white/15 text-white'
  },
  { 
    id: 'closing_stock', 
    label: 'STOCK INVENTORY', 
    icon: Layers, 
    desc: 'Stock Inventory Entry', 
    step: '10',
    start: '#F39C12',
    end: '#F1C40F',
    textColor: 'text-amber-950',
    descColor: 'text-amber-900/80',
    badgeColor: 'bg-amber-950/10 text-amber-950 border-amber-950/20',
    iconBg: 'bg-amber-950/20 text-amber-950'
  },
  { 
    id: 'ledger', 
    label: 'ACCOUNT', 
    icon: Scale, 
    desc: 'Supplier Finance Ledger Balance', 
    step: '12',
    start: '#A43AB2',
    end: '#E13680',
    textColor: 'text-white',
    descColor: 'text-fuchsia-100/90',
    badgeColor: 'bg-white/15 text-white border-white/20',
    iconBg: 'bg-white/15 text-white'
  },
  { 
    id: 'reports', 
    label: 'REPORTS', 
    icon: BarChart3, 
    desc: 'Operational Logs & CSV Audit', 
    step: '13',
    start: '#9D2E7D',
    end: '#E16E93',
    textColor: 'text-white',
    descColor: 'text-pink-100/90',
    badgeColor: 'bg-white/15 text-white border-white/20',
    iconBg: 'bg-white/15 text-white'
  },
  { 
    id: 'admindesk', 
    label: 'ADMIN', 
    icon: Lock, 
    desc: 'Terminal Master Management', 
    step: '14',
    start: '#121317',
    end: '#323B42',
    textColor: 'text-white',
    descColor: 'text-slate-300/90',
    badgeColor: 'bg-white/15 text-white border-white/20',
    iconBg: 'bg-white/15 text-white'
  },
  { 
    id: 'satta', 
    label: 'SATTA', 
    icon: Sparkles, 
    desc: 'Agent Satta Registrations', 
    step: '15',
    start: '#ABC7FF',
    end: '#C1E3FF',
    textColor: 'text-blue-950',
    descColor: 'text-blue-900/80',
    badgeColor: 'bg-blue-950/10 text-blue-950 border-blue-950/20',
    iconBg: 'bg-blue-950/20 text-blue-950'
  },
  { 
    id: 'requisition_desk', 
    label: 'REQUISITION DESK', 
    icon: ClipboardList, 
    desc: 'Operational Requisition Register', 
    step: '16',
    start: '#FFFEE0',
    end: '#E8F5E9',
    textColor: 'text-indigo-950',
    descColor: 'text-slate-700/85',
    badgeColor: 'bg-indigo-950/10 text-indigo-950 border-indigo-950/20',
    iconBg: 'bg-indigo-950/15 text-indigo-950'
  }
];

export const dashboardSections: DashboardSection[] = [
  {
    title: "Sauda To P.O",
    desc: "Contract booking, Satta rates, SMS confirmation, and Purchase Order generation.",
    borderColor: "border-emerald-200",
    headerBg: "from-emerald-950 to-emerald-800",
    items: [
      { 
        id: 'satta', 
        mappedId: 'satta',
        label: 'Satta', 
        icon: Sparkles, 
        desc: 'Agent Satta Registrations', 
        step: '1.1',
        start: '#ABC7FF',
        end: '#C1E3FF'
      },
      { 
        id: 'sms_sauda', 
        mappedId: 'sms_sauda',
        label: 'SMS Sauda Desk', 
        icon: MessageSquare, 
        desc: 'SMS Sauda Contracts Log', 
        step: '1.2',
        start: '#A16BFE',
        end: '#DEB0DF'
      },
      { 
        id: 'sauda', 
        mappedId: 'sauda',
        label: 'Sauda Desk', 
        icon: HandCoins, 
        desc: 'Sauda Contract Bookings', 
        step: '1.3',
        start: '#6DE195',
        end: '#C4E759'
      },
      { 
        id: 'po_temp', 
        mappedId: 'po',
        label: 'Sauda Check Point', 
        icon: FileText, 
        desc: 'Draft Purchase Orders', 
        step: '1.4',
        start: '#FF9B42',
        end: '#FFD38C'
      },
      { 
        id: 'po_final', 
        mappedId: 'final_po',
        label: 'Final P.O', 
        icon: FileText, 
        desc: 'Verify Active Purchase Orders', 
        step: '1.5',
        start: '#6CACFF',
        end: '#8DEBFF'
      }
    ]
  },
  {
    title: "T.M.R To M.R",
    desc: "Incoming lorry register, quality and moisture audits, discrepancy logging, and weighbridge M.R.",
    borderColor: "border-blue-200",
    headerBg: "from-blue-950 to-blue-800",
    items: [
      { 
        id: 'amad', 
        mappedId: 'amad',
        label: 'TEMPORARY M.R', 
        icon: Clock, 
        desc: 'Log Incoming Lorry Gates', 
        step: '2.1',
        start: '#41C7AF',
        end: '#54E38E'
      },
      { 
        id: 'inspection', 
        mappedId: 'inspection',
        label: 'MILL INSPECTION', 
        icon: ClipboardCheck, 
        desc: 'Quality Audit Register', 
        step: '2.2',
        start: '#10B981',
        end: '#059669'
      },
      { 
        id: 'material_inspection', 
        mappedId: 'material_inspection',
        label: 'INSPECTION CHECKLIST', 
        icon: ShieldCheck, 
        desc: 'Mill Quality & Moisture Inspection', 
        step: '2.3',
        start: '#5583EE',
        end: '#41D8DD'
      },
      {
        id: 'mismatch',
        mappedId: 'mismatch',
        label: 'Satta Mismatch',
        icon: AlertTriangle,
        desc: 'Satta contract discrepancies',
        step: '2.3',
        start: '#FF9B42',
        end: '#FF5E62'
      },
      {
        id: 'material_mismatch',
        mappedId: 'material_mismatch',
        label: 'Material Mismatch',
        icon: AlertTriangle,
        desc: 'Material / inspection discrepancies',
        step: '2.4',
        start: '#FB7185',
        end: '#F43F5E'
      },
      {
        id: 'final_arrival',
        mappedId: 'final_arrival',
        label: 'Final M.R',
        icon: CheckCircle2,
        desc: 'Weighbridge Gate Entry Acceptance',
        step: '2.5',
        start: '#99E5A2',
        end: '#D4FC78'
      }
    ]
  },
  {
    title: "Club P.O To Payment",
    desc: "Contract binding, quantity settlements, financial ledger balancing, and payments.",
    borderColor: "border-purple-200",
    headerBg: "from-purple-950 to-purple-800",
    items: [
      { 
        id: 'club_po_mr', 
        mappedId: 'club_po_mr',
        label: 'Club P.O & M.R', 
        icon: Link, 
        desc: 'Bind Contracts to Arrivals', 
        step: '3.1',
        start: '#4E65FF',
        end: '#92EFFD'
      },
      { 
        id: 'payment', 
        mappedId: 'payment',
        label: 'Payment', 
        icon: Wallet, 
        desc: 'Record Cash & Bank Payments', 
        step: '3.2',
        start: '#FB7185',
        end: '#F43F5E'
      },
      { 
        id: 'mr_settlement', 
        mappedId: 'mr_settlement',
        label: 'M.R Settlement', 
        icon: FileCheck, 
        desc: 'Weighbridge Quantity Settlements', 
        step: '3.3',
        start: '#D279EE',
        end: '#F8C390'
      }
    ]
  },
  {
    title: "Material Issue To Inventory",
    desc: "Material floor dispatches, physical stock counts, and storehouse requisitions.",
    borderColor: "border-amber-200",
    headerBg: "from-amber-950 to-amber-800",
    items: [
      { 
        id: 'issue', 
        mappedId: 'issue',
        label: 'Material Issue', 
        icon: PackageCheck, 
        desc: 'Dispatch Material to Mill Floors', 
        step: '4.1',
        start: '#A16BFE',
        end: '#DEB0DF'
      },
      { 
        id: 'closing_stock', 
        mappedId: 'closing_stock',
        label: 'Stock Inventory', 
        icon: Layers, 
        desc: 'Physical Stock Inventory Log', 
        step: '4.2',
        start: '#F39C12',
        end: '#F1C40F'
      },
      { 
        id: 'requisition_desk', 
        mappedId: 'requisition_desk',
        label: 'Requisition Desk', 
        icon: ClipboardList, 
        desc: 'Storehouse Requisition Register', 
        step: '4.3',
        start: '#FFFEE0',
        end: '#E8F5E9'
      }
    ]
  },
  {
    title: "System Administration",
    desc: "Database administration, schema validation, and security override tools.",
    borderColor: "border-slate-300",
    headerBg: "from-slate-900 to-slate-850",
    items: [
      {
        id: 'admindesk',
        mappedId: 'admindesk',
        label: 'Admin Desk',
        icon: Lock,
        desc: 'Terminal Master Database Management',
        step: '5.1',
        start: '#121317',
        end: '#323B42'
      }
    ]
  }
];

export default function DashboardProcessModules({
  isAdmin,
  allowedModules,
  onNavigate
}: DashboardProcessModulesProps) {
  const [activeSectionIndex, setActiveSectionIndex] = useState<number>(0);

  const isModuleAllowed = (id: string, altId?: string) => {
    return hasModulePermission(id, allowedModules, isAdmin) || (altId ? hasModulePermission(altId, allowedModules, isAdmin) : false);
  };

  return (
    <div className="space-y-8 pt-4 border-t border-[#FBCFCB]">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg font-bold text-[#D94B5A] flex items-center gap-2">
          <span>Detailed Process Modules</span>
        </h3>
      </div>

      {!isAdmin ? (
        <div className="space-y-4">
          {(() => {
            const permittedSections = dashboardSections
              .filter(section => section.title !== "System Administration")
              .map(section => ({
                ...section,
                allowedItems: section.items.filter(item => isModuleAllowed(item.mappedId, item.id))
              }))
              .filter(section => section.allowedItems.length > 0);

            if (permittedSections.length === 0) {
              return (
                <div className="bg-[#FDE7E6] border border-[#FBCFCB] rounded-xl p-8 text-center text-[#D94B5A]">
                  <p className="text-sm font-semibold">No dashboard modules are currently assigned to your account.</p>
                  <p className="text-xs text-[#D94B5A]/80 mt-1">Please contact your system administrator to assign module access.</p>
                </div>
              );
            }

            const safeActiveIndex = Math.min(activeSectionIndex, permittedSections.length - 1);
            const activeSection = permittedSections[safeActiveIndex] || permittedSections[0];
            const allowedItems = activeSection.allowedItems;

            return (
              <>
                <div className="bg-[#FDE7E6] border border-[#FBCFCB] rounded-xl shadow-xs p-2 flex flex-wrap gap-2 w-full justify-start items-center">
                  {permittedSections.map((section, secIdx) => (
                    <button 
                      key={secIdx} 
                      onClick={() => setActiveSectionIndex(secIdx)}
                      className={cn(
                        "px-4 py-2 border font-bold text-[10px] uppercase tracking-widest rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer",
                        safeActiveIndex === secIdx
                          ? "bg-[#F7AFA8] border-[#F7AFA8] text-[#FDE7E6] shadow-xs"
                          : "bg-[#FDE7E6] hover:bg-[#FBCFCB] border-[#FBCFCB] text-[#D94B5A] hover:text-[#D94B5A]"
                      )}
                    >
                      <Layers className="h-3.5 w-3.5" />
                      {section.title}
                    </button>
                  ))}
                </div>
                
                {/* Selected Section Content */}
                <div className="bg-[#FDE7E6] border border-[#FBCFCB] rounded-xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="bg-gradient-to-r from-[#D94B5A] via-[#E85A5A] to-[#D94B5A] text-white px-5 py-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-[#F06D6C]">
                    <div>
                      <h2 className="text-xs font-black uppercase tracking-wider italic flex items-center gap-2 text-white">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FDE7E6] animate-pulse" />
                        {activeSection.title}
                      </h2>
                      <p className="text-[10px] text-[#FDE7E6] font-bold uppercase tracking-wider mt-0.5 font-sans">
                        {activeSection.desc}
                      </p>
                    </div>
                    <span className="text-[9px] font-mono font-bold uppercase tracking-widest bg-[#D94B5A] text-[#FDE7E6] border border-[#F06D6C] px-2.5 py-0.5 rounded-md shadow-2xs">
                      {allowedItems.length} PERMITTED MODULES
                    </span>
                  </div>
                  <div className="p-5 bg-[#FDE7E6]/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {allowedItems.map((item, itemIdx) => {
                        const stepItem = processSteps.find(s => s.id === item.id) || 
                                        { step: '00', label: item.label, desc: item.desc, start: '#2e7d32', end: '#1b5e20', icon: item.icon };
                        const IconComp = item.icon;
                        const allowed = isModuleAllowed(item.mappedId);
                        
                        return (
                          <div key={itemIdx} className="relative group">
                            <button
                              onClick={async () => {
                                if (allowed) {
                                  if (item.id === 'sms_sauda') {
                                    await onNavigate('sms_sauda');
                                  } else {
                                    await onNavigate(item.mappedId, item.id);
                                  }
                                } else {
                                  alert(`Access Denied to module [${item.id}]`);
                                }
                              }}
                              className={cn(
                                "w-full text-left bg-[#FDE7E6] border border-[#FBCFCB] rounded-xl p-4 shadow-xs transition-all duration-300 h-full flex flex-col relative overflow-hidden",
                                allowed ? "hover:shadow-md hover:border-[#F7AFA8] hover:-translate-y-0.5 cursor-pointer" : "opacity-75 cursor-not-allowed bg-[#FDE7E6] grayscale-[50%]"
                              )}
                            >
                              {allowed && (
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#F7AFA8]" />
                              )}

                              <div className="flex justify-between items-center w-full pl-1.5">
                                <span className={cn(
                                  "text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-md border",
                                  allowed
                                    ? "bg-[#FBCFCB] text-[#D94B5A] border-[#FBCFCB]"
                                    : "bg-slate-100 text-slate-400 border-slate-200"
                                )}>
                                  CODE {stepItem.step}
                                </span>
                                
                                {!allowed ? (
                                  <span className="text-slate-400 bg-slate-100 p-1 rounded-full" title="Locked">
                                    <LockKeyhole className="h-3.5 w-3.5" />
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-800 flex items-center gap-1 bg-emerald-100/70 px-2 py-0.5 rounded-md border border-emerald-300/60">
                                    <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse" />
                                    <span>READY</span>
                                  </span>
                                )}
                              </div>

                              <div className="my-2.5 min-w-0 pl-1.5 flex-1">
                                <h3 className={cn(
                                  "text-xs font-bold tracking-wide uppercase truncate leading-tight",
                                  allowed ? "text-[#D94B5A]" : "text-slate-400"
                                )}>
                                  {stepItem.label}
                                </h3>
                                <p className={cn(
                                  "text-[10px] font-medium leading-relaxed mt-1 uppercase tracking-tight line-clamp-2",
                                  allowed ? "text-[#D94B5A] group-hover:text-[#D94B5A]" : "text-slate-400/80"
                                )}>
                                  {stepItem.desc}
                                </p>
                              </div>

                              <div className="flex justify-between items-center w-full pt-2 border-t border-[#FBCFCB] pl-1.5 mt-auto">
                                <div className="p-1.5 rounded-lg bg-[#FBCFCB]/60 text-[#D94B5A]">
                                  <IconComp className="h-4 w-4 text-[#D94B5A]" />
                                </div>
                                
                                {allowed && (
                                  <div className="text-[9px] font-bold text-[#D94B5A] group-hover:text-[#D94B5A] group-hover:translate-x-1 transition-all flex items-center gap-0.5 uppercase tracking-wider">
                                    <span>OPEN</span>
                                    <ArrowRight className="h-3 w-3" />
                                  </div>
                                )}
                              </div>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      ) : (
        dashboardSections.filter(section => isAdmin || section.title !== "System Administration").map((section, secIdx) => {
          const allowedItems = section.items.filter(item => isModuleAllowed(item.mappedId, item.id));
          if (!isAdmin && allowedItems.length === 0) return null;
          
          return (
            <div key={secIdx} className="bg-[#FDE7E6] border border-[#FBCFCB] rounded-xl shadow-xs overflow-hidden">
              <div className="bg-gradient-to-r from-[#D94B5A] via-[#E85A5A] to-[#D94B5A] text-white px-5 py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-[#F06D6C]">
                <div>
                  <h2 className="text-xs font-black uppercase tracking-wider italic flex items-center gap-2 text-white">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FDE7E6] animate-pulse" />
                    {section.title}
                  </h2>
                  <p className="text-[10px] text-[#FDE7E6] font-bold uppercase tracking-wider mt-0.5 font-sans">
                    {section.desc}
                  </p>
                </div>
                <span className="text-[9px] font-mono font-bold uppercase tracking-widest bg-[#D94B5A] text-[#FDE7E6] border border-[#F06D6C] px-2.5 py-0.5 rounded-md shadow-2xs">
                  {allowedItems.length} ACTIVE MODULES
                </span>
              </div>

              <div className="p-5 bg-[#FDE7E6]/40">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 relative">
                  {section.items.map((stepItem, index) => {
                    const allowed = isModuleAllowed(stepItem.mappedId);
                    const IconComp = stepItem.icon;
                    
                    return (
                      <div key={index} className="relative flex flex-col justify-between group">
                        <button
                          onClick={async () => {
                            if (allowed) {
                              if (stepItem.id === 'sms_sauda') {
                                await onNavigate('sms_sauda');
                              } else {
                                await onNavigate(stepItem.mappedId, stepItem.id);
                              }
                            } else {
                              alert(`Access Denied: Your Operator profile does not hold permissions for ${stepItem.label}.`);
                            }
                          }}
                          className={cn(
                            "w-full text-left p-4 flex flex-col justify-between h-[154px] rounded-xl relative cursor-pointer transition-all duration-300 border overflow-hidden bg-[#FDE7E6] border-[#FBCFCB]",
                            allowed 
                              ? "shadow-xs hover:shadow-md hover:border-[#F7AFA8] hover:-translate-y-1" 
                              : "bg-[#FDE7E6] border-[#FBCFCB] opacity-60 cursor-not-allowed"
                          )}
                        >
                          {allowed && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#F7AFA8]" />
                          )}

                          <div className="flex justify-between items-center w-full pl-1.5">
                            <span className={cn(
                              "text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-md border",
                              allowed 
                                ? "bg-[#FBCFCB] text-[#D94B5A] border-[#FBCFCB]" 
                                : "bg-slate-100 text-slate-400 border-slate-200"
                            )}>
                              CODE {stepItem.step}
                            </span>
                            
                            {!allowed ? (
                              <span className="text-slate-400 bg-slate-100 p-1 rounded-full" title="Locked">
                                <LockKeyhole className="h-3.5 w-3.5" />
                              </span>
                            ) : (
                              <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-800 flex items-center gap-1 bg-emerald-100/70 px-2 py-0.5 rounded-md border border-emerald-300/60">
                                <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse" />
                                <span>READY</span>
                              </span>
                            )}
                          </div>
                          
                          <div className="my-2 min-w-0 pl-1.5">
                            <h3 className={cn(
                              "text-[12.5px] font-extrabold tracking-wide uppercase truncate leading-tight",
                              allowed ? "text-[#D94B5A]" : "text-slate-400"
                            )}>
                              {stepItem.label}
                            </h3>
                            <p className={cn(
                              "text-[9.5px] font-medium leading-relaxed mt-1 uppercase tracking-tight line-clamp-2",
                              allowed ? "text-[#D94B5A] group-hover:text-[#D94B5A]" : "text-slate-400/80"
                            )}>
                              {stepItem.desc}
                            </p>
                          </div>

                          <div className="flex justify-between items-center w-full pt-2 border-t border-[#FBCFCB] pl-1.5">
                            <div className="p-1.5 rounded-lg bg-[#FBCFCB]/60 text-[#D94B5A]">
                              <IconComp className="h-4 w-4 text-[#D94B5A]" />
                            </div>
                            
                            {allowed && (
                              <div className="text-[9px] font-bold text-[#D94B5A] group-hover:text-[#D94B5A] group-hover:translate-x-1 transition-all flex items-center gap-0.5 uppercase tracking-wider">
                                <span>OPEN</span>
                                <ArrowRight className="h-3 w-3" />
                              </div>
                            )}
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
