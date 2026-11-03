import React, { useState, useEffect } from 'react';
import LegacyLayout from '../components/LegacyLayout';
import FinalArrivalEntry from './FinalArrivalEntry';
import FinalArrivalReconciliation from '../components/FinalArrivalReconciliation';
import { 
  FinalArrivalRecord, 
  calculateNetWeightVal, 
  getRcptQty, 
  getLowestNetWeight 
} from '../components/final-arrival/finalArrivalTypes';
import { useFinalArrivalRegisterLogic } from '../components/final-arrival/useFinalArrivalRegisterLogic';
import { FinalArrivalStatsRibbon } from '../components/final-arrival/FinalArrivalStatsRibbon';
import { FinalArrivalFilterToolbar } from '../components/final-arrival/FinalArrivalFilterToolbar';
import { FinalArrivalDataTable } from '../components/final-arrival/FinalArrivalDataTable';
import { FinalArrivalDetailSlipModal } from '../components/final-arrival/FinalArrivalDetailSlipModal';
import { FinalArrivalPrintModal } from '../components/final-arrival/FinalArrivalPrintModal';

export { calculateNetWeightVal, getRcptQty, getLowestNetWeight };

interface FinalArrivalProps {
  onClose?: () => void;
  isArchiveView?: boolean;
  initialData?: any;
  onNavigate?: (id: string) => void;
}

export default function FinalArrival({ onClose, isArchiveView = false, initialData }: FinalArrivalProps) {
  // View states
  const [viewState, setViewState] = useState<'list' | 'entry' | 'reconciliation'>(() => initialData ? 'entry' : 'list');
  const [editingRecord, setEditingRecord] = useState<FinalArrivalRecord | null>(() => initialData || null);

  useEffect(() => {
    if (initialData) {
      setEditingRecord(initialData);
      setViewState('entry');
    }
  }, [initialData]);

  const {
    loading,
    records,
    filteredRecords,
    searchQuery,
    setSearchQuery,
    startDateFilter,
    setStartDateFilter,
    endDateFilter,
    setEndDateFilter,
    selectedMonthFilter,
    setSelectedMonthFilter,
    selectedRecordId,
    setSelectedRecordId,
    selectedRecord,
    setSelectedRecord,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    stats,
    totalBales,
    totalWeightMt,
    unitList,
    auditPopoverId,
    setAuditPopoverId,
    fetchRecords,
    handleExportCSV,
    handleDelete,
    handlePreparePrint,
    printData,
    setPrintData,
    isPrintingModalOpen,
    setIsPrintingModalOpen,
    printColumns,
    updatePrintRow,
    backgroundSyncing,
    syncStatusMessage,
    autoSyncEnabled,
    lastSyncTime,
    detectedConflicts,
    showConflictsAlert,
    setShowConflictsAlert,
    runReconcileFix
  } = useFinalArrivalRegisterLogic({ isArchiveView });

  if (viewState === 'reconciliation') {
    return (
      <LegacyLayout
        title="FINAL ARRIVAL QUALITY RECONCILIATION REPORT"
        onClose={onClose}
      >
        <FinalArrivalReconciliation
          onBack={() => {
            setViewState('list');
            fetchRecords();
          }}
          onSelectInspectionForFA={(prefilled) => {
            setEditingRecord(prefilled);
            setViewState('entry');
          }}
        />
      </LegacyLayout>
    );
  }

  if (viewState === 'entry') {
    return (
      <FinalArrivalEntry
        initialData={editingRecord}
        onCancel={() => {
          setViewState('list');
          setEditingRecord(null);
        }}
        onSave={() => {
          setViewState('list');
          setEditingRecord(null);
          fetchRecords();
        }}
      />
    );
  }

  return (
    <LegacyLayout
      title={isArchiveView ? "FINAL M.R ARCHIVE" : "FINAL M.R"}
      onClose={onClose}
      activeNavTab="final_mr"
    >
      <div className="bg-[#FDE7E6] text-slate-800 font-sans flex flex-col selection:bg-[#F7AFA8] selection:text-white p-2 md:p-4 space-y-5 max-w-[1700px] w-full mx-auto">
        {/* KPI CARDS & STATUS BANNER */}
        <FinalArrivalStatsRibbon
          stats={stats}
          filteredLoadsCount={filteredRecords.length}
          totalBales={totalBales}
          totalWeightMt={totalWeightMt}
          autoSyncEnabled={autoSyncEnabled}
          lastSyncTime={lastSyncTime}
          backgroundSyncing={backgroundSyncing}
          syncStatusMessage={syncStatusMessage}
          detectedConflicts={detectedConflicts}
          showConflictsAlert={showConflictsAlert}
          setShowConflictsAlert={setShowConflictsAlert}
          runReconcileFix={runReconcileFix}
        />

        {/* SEARCH, DATE FILTERS & ACTIONS */}
        <FinalArrivalFilterToolbar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          startDateFilter={startDateFilter}
          setStartDateFilter={setStartDateFilter}
          endDateFilter={endDateFilter}
          setEndDateFilter={setEndDateFilter}
          onNewArrival={() => {
            setEditingRecord(null);
            setViewState('entry');
          }}
          onExportCsv={handleExportCSV}
          onPrintSelected={() => {
            if (selectedRecordId) {
              const target = records.find(r => r.final_arrival_id === selectedRecordId);
              if (target) handlePreparePrint(target);
              else alert("Selected record not found.");
            } else {
              alert("Please select a row first.");
            }
          }}
        />

        {/* DATA TABLE & PAGINATION */}
        <FinalArrivalDataTable
          loading={loading}
          filteredRecords={filteredRecords}
          selectedRecordId={selectedRecordId}
          setSelectedRecordId={setSelectedRecordId}
          auditPopoverId={auditPopoverId}
          setAuditPopoverId={setAuditPopoverId}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          pageSize={pageSize}
          setPageSize={setPageSize}
          onEditRecord={(record) => {
            setEditingRecord(record);
            setViewState('entry');
          }}
          onViewSlip={(record) => setSelectedRecord(record)}
          onPrintSlip={(record) => handlePreparePrint(record)}
          onDeleteRecord={(id, code) => handleDelete(id, code)}
        />
      </div>

      {/* DETAIL RECORD SLIP MODAL */}
      <FinalArrivalDetailSlipModal
        selectedRecord={selectedRecord}
        onClose={() => setSelectedRecord(null)}
      />

      {/* CONTINUOUS PRINT SLIP MODAL */}
      <FinalArrivalPrintModal
        isOpen={isPrintingModalOpen}
        onClose={() => setIsPrintingModalOpen(false)}
        printData={printData}
        setPrintData={setPrintData}
        printColumns={printColumns}
        updatePrintRow={updatePrintRow}
        unitList={unitList}
      />
    </LegacyLayout>
  );
}
