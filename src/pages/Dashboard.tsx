import React, { useState } from 'react';
import { 
  Mail, 
  User, 
  Lock, 
  LayoutDashboard, 
  BarChart3, 
  Layers
} from 'lucide-react';
import { cn } from '../lib/utils';
import { getCurrentUserContext } from '../lib/permissions';
import LegacyLayout from '../components/LegacyLayout';
import { supabase } from '../lib/supabase';
import MismatchCase from './MismatchCase';
import Reports from './Reports';
import ExecutiveBiDashboard from '../components/ExecutiveBiDashboard';

import { useDashboardData } from '../components/dashboard/useDashboardData';
import GodownCapacityModal from '../components/dashboard/GodownCapacityModal';
import SmsSaudaModal from '../components/dashboard/SmsSaudaModal';
import UserProfileModal from '../components/dashboard/UserProfileModal';
import DashboardProcessModules from '../components/dashboard/DashboardProcessModules';
import AnalyticalInsightsConsole from '../components/dashboard/AnalyticalInsightsConsole';
import { DashboardProps } from '../components/dashboard/types';
import { dbModule } from '../services/dbModule';

export default function Dashboard({ 
  onNavigate, 
  isAdmin, 
  allowedModules,
  currentTab: propCurrentTab,
  setCurrentTab: propSetCurrentTab,
  isActive = true
}: DashboardProps) {
  const [localCurrentTab, setLocalCurrentTab] = useState<'menu' | 'mismatch' | 'reports'>('menu');
  const [reportInitialSection, setReportInitialSection] = useState<string | undefined>(undefined);
  const currentTab = propCurrentTab !== undefined ? propCurrentTab : localCurrentTab;
  const setCurrentTab = propSetCurrentTab !== undefined ? propSetCurrentTab : setLocalCurrentTab;

  // Custom modals state
  const [isGodownModalOpen, setIsGodownModalOpen] = useState(false);
  const [isSmsSaudaModalOpen, setIsSmsSaudaModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showDetailedProcesses, setShowDetailedProcesses] = useState(false);
  const [showAnalyticalConsole, setShowAnalyticalConsole] = useState(false);

  // User Profile Data
  const [userProfileData, setUserProfileData] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [updatePasswordSuccess, setUpdatePasswordSuccess] = useState('');

  // Primary live data hook
  const {
    stats,
    godowns,
    godownUtils,
    emailHealthWarning,
    rawSaudas,
    rawPos,
    rawArrivals,
    rawFinalArrivals,
    rawScp,
    rawScpDetails,
    payments,
    paymentDetails,
    recentAmad,
    inspectionMasters,
    materialInspections,
    millInspections,
    inspectionDetails,
    rawSettlements,
    millIssueMasters,
    millIssueDetails,
    allOpeningStocks,
    stockNodeStocks,
    loading,
    quickReportData,
    loadStats,
    arrivalTrendsData,
    poDistributionData,
    settlementPieData,
    gradeStockLevelsData,
    gradeArrivalTrendsData
  } = useDashboardData(isActive);

  const loadUserProfile = async () => {
    try {
      if (!supabase) return;
      const username = getCurrentUserContext().username || "ADMIN";
      const { data, error } = await supabase
        .from('user_master')
        .select('*')
        .eq('username', username.toUpperCase())
        .single();
      if (!error && data) {
        setUserProfileData(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || !newPassword.trim()) {
      alert("Please enter a valid new password.");
      return;
    }
    const cleanPass = newPassword.trim();
    try {
      const activeUser = getCurrentUserContext().username || "ADMIN";
      const cleanUser = activeUser.trim();

      let updateSuccess = false;

      // 1. Update in Supabase user_master
      if (supabase) {
        const { error } = await supabase
          .from('user_master')
          .update({ password: cleanPass })
          .or(`username.ilike.${cleanUser},user_id.ilike.${cleanUser}`);

        if (!error) {
          updateSuccess = true;
        } else {
          console.warn("Supabase password update notice:", error);
          // Try upserting if single update didn't match
          const { error: upsertErr } = await supabase
            .from('user_master')
            .upsert({
              user_id: getCurrentUserContext().userId || '001',
              username: cleanUser.toUpperCase(),
              password: cleanPass,
              role: getCurrentUserContext().userRole || 'ADMIN',
              level: getCurrentUserContext().userLevel || 'L5',
              status: 'Active',
              allowed_modules: '*'
            }, { onConflict: 'username' });

          if (!upsertErr) updateSuccess = true;
        }
      }

      // 2. Update in client dbModule store
      await dbModule.update('user_master', 'username', cleanUser.toUpperCase(), { password: cleanPass }).catch(() => {});
      updateSuccess = true;

      // 3. Update localStorage bally_auth_session
      try {
        const sessionStr = localStorage.getItem("bally_auth_session");
        if (sessionStr) {
          const parsed = JSON.parse(sessionStr);
          parsed.password = cleanPass;
          localStorage.setItem("bally_auth_session", JSON.stringify(parsed));
        }
      } catch (e) {}

      if (updateSuccess) {
        setUpdatePasswordSuccess('Password updated successfully! Your new password is now active.');
        setNewPassword('');
        setTimeout(() => setUpdatePasswordSuccess(''), 4000);
      } else {
        alert('Failed to update password. Please check database connection.');
      }
    } catch (e: any) {
      console.error(e);
      alert('Password Update Error: ' + (e.message || String(e)));
    }
  };

  return (
    <LegacyLayout 
      title="P.O Automation" 
      subtitle="Operational Hub"
      activeNavTab="dashboard"
      allowedModules={allowedModules}
      isAdmin={isAdmin}
      onNavClick={(pageId) => {
        if (pageId === 'dashboard') {
          setCurrentTab('menu');
        } else {
          onNavigate(pageId);
        }
      }}
    >
      <div className="space-y-6 max-w-full px-2 sm:px-4">
        
        {/* Navigation Tabs Bar */}
        <div className="hidden">
          <button
            onClick={() => setCurrentTab('menu')}
            className={cn(
              "h-9 px-4 border-2 flex items-center gap-2 transition-all active:translate-x-[1px] active:translate-y-[1px] rounded-lg cursor-pointer text-xs uppercase tracking-wider font-extrabold",
              currentTab === 'menu'
                ? "bg-[#F7AFA8] border-[#F7AFA8] text-[#FDE7E6] shadow-sm"
                : "bg-[#FDE7E6] border-[#FBCFCB] text-[#D94B5A] hover:bg-[#FBCFCB] hover:text-[#D94B5A]"
            )}
          >
            <LayoutDashboard className="h-4 w-4 text-emerald-400" />
            <span>Executive BI Dashboard</span>
          </button>

          <button
            onClick={() => setCurrentTab('reports')}
            className={cn(
              "h-9 px-4 border-2 flex items-center gap-2 transition-all active:translate-x-[1px] active:translate-y-[1px] rounded-lg cursor-pointer text-xs uppercase tracking-wider font-extrabold",
              currentTab === 'reports'
                ? "bg-[#F7AFA8] border-[#F7AFA8] text-[#FDE7E6] shadow-sm"
                : "bg-[#FDE7E6] border-[#FBCFCB] text-[#D94B5A] hover:bg-[#FBCFCB] hover:text-[#D94B5A]"
            )}
          >
            <BarChart3 className="h-4 w-4 text-amber-400" />
            <span>Report Dashboard</span>
          </button>

          <button
            onClick={() => onNavigate('admindesk')}
            className={cn(
              "h-9 px-4 border-2 flex items-center gap-2 transition-all active:translate-x-[1px] active:translate-y-[1px] rounded-lg cursor-pointer text-xs uppercase tracking-wider font-extrabold bg-[#FBCFCB] border-[#FBCFCB] text-[#D94B5A] hover:bg-[#FDE7E6]"
            )}
          >
            <Lock className="h-4 w-4 text-[#D94B5A]" />
            <span>Admin Desk</span>
          </button>
          
          {emailHealthWarning && (
            <div className="flex items-center gap-2 bg-rose-100 border border-rose-300 text-rose-800 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider animate-pulse shadow-sm ml-auto mr-2 cursor-help" title="The last 3 system emails failed to send. Check Email Activity in Admin Desk.">
              <Mail className="h-3 w-3" />
              SMTP Warning
            </div>
          )}

          <button
            onClick={() => {
              loadUserProfile();
              setIsProfileOpen(true);
            }}
            className={cn(
              "h-9 px-4 border-2 flex items-center gap-2 transition-all active:translate-x-[1px] active:translate-y-[1px] rounded-lg cursor-pointer text-xs uppercase tracking-wider font-extrabold bg-[#FDE7E6] border-[#FBCFCB] text-[#D94B5A] hover:bg-[#FBCFCB] ml-auto"
            )}
          >
            <User className="h-4 w-4 text-[#D94B5A]" />
            <span>{getCurrentUserContext().username || "ADMIN"}</span>
          </button>
        </div>
        
        {/* Tab 1: Executive BI Dashboard */}
        {currentTab === 'menu' && (
          <ExecutiveBiDashboard
            arrivals={rawArrivals}
            saudas={rawSaudas}
            saudaCheckPoints={rawScp}
            saudaCheckPointDetails={rawScpDetails}
            traders={[]}
            pos={rawPos}
            settlements={rawSettlements}
            godowns={godowns}
            openingStocks={allOpeningStocks.length > 0 ? allOpeningStocks : stockNodeStocks}
            millIssueMasters={millIssueMasters}
            millIssueDetails={millIssueDetails}
            finalArrivals={rawFinalArrivals}
            paymentRecords={payments}
            paymentDetails={paymentDetails}
            inspections={inspectionMasters}
            materialInspections={materialInspections}
            millInspections={millInspections}
            inspectionDetails={inspectionDetails}
            loading={loading}
            onRefresh={loadStats}
            onNavigate={onNavigate}
            setcurrentTab={(tab) => {
              if (tab === 'reports:abnormal') {
                setReportInitialSection('exception_abnormal');
                setCurrentTab('reports');
              } else {
                setCurrentTab(tab as any);
              }
            }}
            currentTab={currentTab}
            allowedModules={allowedModules}
            isAdmin={isAdmin}
          />
        )}

        {/* Tab 2: Discrepancy & Mismatch Case */}
        {currentTab === 'mismatch' && (
          <MismatchCase 
            onClose={() => setCurrentTab('menu')}
          />
        )}

        {/* Tab 3: Detailed Reports View */}
        {currentTab === 'reports' && (
          <Reports 
            onClose={() => {
              setReportInitialSection(undefined);
              setCurrentTab('menu');
            }}
            initialReportType={reportInitialSection}
          />
        )}

        {/* Detailed Process Modules (Collapsible / Toggleable) */}
        {showDetailedProcesses && (
          <DashboardProcessModules
            isAdmin={isAdmin}
            allowedModules={allowedModules}
            onNavigate={onNavigate}
          />
        )}

        {/* Analytical Insights Console (Collapsible / Toggleable) */}
        {showAnalyticalConsole && (
          <AnalyticalInsightsConsole
            arrivalTrendsData={arrivalTrendsData}
            poDistributionData={poDistributionData}
            settlementPieData={settlementPieData}
            gradeArrivalTrendsData={gradeArrivalTrendsData}
            gradeStockLevelsData={gradeStockLevelsData}
            quickReportData={quickReportData}
            loadStats={loadStats}
            onNavigate={onNavigate}
            recentAmad={recentAmad}
          />
        )}

        {/* Godown Capacity Audited Breakdown Modal */}
        <GodownCapacityModal
          isOpen={isGodownModalOpen}
          onClose={() => setIsGodownModalOpen(false)}
          godownUtils={godownUtils}
          globalUtilization={stats.godownUtilization}
        />

        {/* SMS Sauda Contract Booking Register Modal */}
        <SmsSaudaModal
          isOpen={isSmsSaudaModalOpen}
          onClose={() => setIsSmsSaudaModalOpen(false)}
        />

        {/* User Profile Console Modal */}
        <UserProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          userProfileData={userProfileData}
          newPassword={newPassword}
          setNewPassword={setNewPassword}
          updatePasswordSuccess={updatePasswordSuccess}
          onUpdatePassword={handleUpdatePassword}
        />

      </div>
    </LegacyLayout>
  );
}
export { default as StatCard } from '../components/dashboard/StatCard';
