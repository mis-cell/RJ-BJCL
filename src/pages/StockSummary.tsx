import React from 'react';
import LegacyLayout from '../components/LegacyLayout';
import { useStockSummaryData } from '../components/stock-summary/useStockSummaryData';
import { StockCountersRibbon } from '../components/stock-summary/StockCountersRibbon';
import { StockSummaryNavigation } from '../components/stock-summary/StockSummaryNavigation';
import { AreaWiseStockTree } from '../components/stock-summary/AreaWiseStockTree';
import { MonthlyClosingStockView } from '../components/stock-summary/MonthlyClosingStockView';
import { LiveInventoryGrid } from '../components/stock-summary/LiveInventoryGrid';
import {
  StockFormModal,
  StockOpeningPrintModal,
  StockClosingPrintModal,
  StockCapacityAuditModal,
  StockTransferModal,
  StockUpdateGodownModal,
  StockPdfSummaryModal
} from '../components/stock-summary/StockSummaryModals';
import { StockSubTab } from '../components/stock-summary/types';

export interface StockSummaryProps {
  onClose?: () => void;
  initialSubTab?: StockSubTab;
}

export default function StockSummary({ onClose, initialSubTab = 'opening' }: StockSummaryProps) {
  const stockData = useStockSummaryData(initialSubTab);

  return (
    <LegacyLayout title="Inventory" subtitle="" onClose={onClose}>
      <div className="space-y-4">
        {/* Global Counters Ribbon */}
        <StockCountersRibbon
          totalOpeningQty={stockData.totalOpeningQty}
          totalOpeningWt={stockData.totalOpeningWt}
          openingStockDateInfo={stockData.getOpeningStockDateInfo()}
          totalIssuedToGodownBales={stockData.totalIssuedToGodownBales}
          totalIssuedToGodownWeight={stockData.totalIssuedToGodownWeight}
          issuedToGodownDateInfo={stockData.getIssuedToGodownDateInfo()}
          totalIssuedToFactoryBales={stockData.totalIssuedToFactoryBales}
          totalIssuedToFactoryWeight={stockData.totalIssuedToFactoryWeight}
          issuedToFactoryDateInfo={stockData.getIssuedToFactoryDateInfo()}
          currentClosingStockBales={stockData.currentClosingStockBales}
          currentClosingStockWeight={stockData.currentClosingStockWeight}
          currentStockBalanceDateInfo={stockData.getCurrentStockBalanceDateInfo()}
        />

        {/* Windows Classic Tab Selectors & Integrated Period Controls */}
        <StockSummaryNavigation
          activeTab={stockData.activeTab}
          setActiveTab={stockData.setActiveTab}
          stockSubTab={stockData.stockSubTab}
          setStockSubTab={stockData.setStockSubTab}
          startDateFilter={stockData.startDateFilter}
          setStartDateFilter={stockData.setStartDateFilter}
          endDateFilter={stockData.endDateFilter}
          setEndDateFilter={stockData.setEndDateFilter}
          formatDateBeautiful={stockData.formatDateBeautiful}
          metricCalculationMode={stockData.metricCalculationMode}
          setMetricCalculationMode={stockData.setMetricCalculationMode}
        />

        {stockData.activeTab === 'opening' ? (
          stockData.stockSubTab === 'opening' ? (
            /* Tab 1: Area & Grade Hierarchy Tree for Opening Stocks */
            <AreaWiseStockTree
              filteredSavedStocks={stockData.filteredSavedStocks}
              treeHierarchyMode={stockData.treeHierarchyMode}
              setTreeHierarchyMode={stockData.setTreeHierarchyMode}
              expandedAreas={stockData.expandedAreas}
              setExpandedAreas={stockData.setExpandedAreas}
              expandedGrades={stockData.expandedGrades}
              setExpandedGrades={stockData.setExpandedGrades}
              expandedGradesTop={stockData.expandedGradesTop}
              setExpandedGradesTop={stockData.setExpandedGradesTop}
              expandedAreasSub={stockData.expandedAreasSub}
              setExpandedAreasSub={stockData.setExpandedAreasSub}
              selectedStockId={stockData.selectedStockId}
              setSelectedStockId={stockData.setSelectedStockId}
              searchQuery={stockData.searchQuery}
              setSearchQuery={stockData.setSearchQuery}
              onNewRecord={() => {
                stockData.resetForm();
                stockData.setIsEditing(false);
                stockData.setIsFormModalOpen(true);
              }}
              onExportCSV={stockData.handleExportToCSV}
              onPrintSlip={() => {
                if (stockData.selectedStockId) {
                  const target = stockData.openingStocks.find(s => s.id === stockData.selectedStockId);
                  if (target) stockData.handlePreparePrint(target);
                } else {
                  alert("Please select an Opening Stock row first.");
                }
              }}
              onReload={stockData.loadOpeningStocks}
              onEdit={stockData.handleEdit}
              onDelete={stockData.handleDelete}
            />
          ) : (
            /* Tab 2: Monthly Closing Stocks Ledger */
            <MonthlyClosingStockView
              filteredClosingStocks={stockData.filteredClosingStocks}
              dateWiseClosingList={stockData.dateWiseClosingList}
              startDateFilter={stockData.startDateFilter}
              setStartDateFilter={stockData.setStartDateFilter}
              endDateFilter={stockData.endDateFilter}
              setEndDateFilter={stockData.setEndDateFilter}
              selectedClosingStockId={stockData.selectedClosingStockId}
              setSelectedClosingStockId={stockData.setSelectedClosingStockId}
              closingCurrentPage={stockData.closingCurrentPage}
              setClosingCurrentPage={stockData.setClosingCurrentPage}
              closingPageSize={stockData.closingPageSize}
              setClosingPageSize={stockData.setClosingPageSize}
              totalClosingBales={stockData.totalClosingBales}
              totalClosingWt={stockData.totalClosingWt}
              totalClosingValue={stockData.totalClosingValue}
              searchQuery={stockData.searchQuery}
              setSearchQuery={stockData.setSearchQuery}
              onNewRecord={() => {
                stockData.resetClosingForm();
                stockData.setIsEditing(false);
                stockData.setIsFormModalOpen(true);
              }}
              onExportCSV={stockData.handleExportToCSV}
              onPrintSlip={() => {
                if (stockData.selectedClosingStockId) {
                  const target = stockData.closingStocks.find(s => s.id === stockData.selectedClosingStockId);
                  if (target) stockData.handlePrepareClosingPrint(target);
                } else {
                  alert("Please select a Monthly Stock row first.");
                }
              }}
              onReload={stockData.loadClosingStocks}
              onEditClosing={stockData.handleEditClosing}
              onDeleteClosing={stockData.handleDeleteClosing}
            />
          )
        ) : (
          /* Tab 3: Standard Live Valuation summary */
          <LiveInventoryGrid
            searchQuery={stockData.searchQuery}
            setSearchQuery={stockData.setSearchQuery}
            selectedGradeFilter={stockData.selectedGradeFilter}
            setSelectedGradeFilter={stockData.setSelectedGradeFilter}
            selectedAreaFilter={stockData.selectedAreaFilter}
            setSelectedAreaFilter={stockData.setSelectedAreaFilter}
            selectedGodownFilter={stockData.selectedGodownFilter}
            setSelectedGodownFilter={stockData.setSelectedGodownFilter}
            mergedGrades={stockData.mergedGrades}
            areas={stockData.areas}
            godowns={stockData.godowns}
            openingStocks={stockData.openingStocks}
            calculateLiveStocks={stockData.calculateLiveStocks}
            expandedLiveGrades={stockData.expandedLiveGrades}
            setExpandedLiveGrades={stockData.setExpandedLiveGrades}
            liveCurrentPage={stockData.liveCurrentPage}
            setLiveCurrentPage={stockData.setLiveCurrentPage}
            livePageSize={stockData.livePageSize}
            setLivePageSize={stockData.setLivePageSize}
            currentClosingStockWeight={stockData.currentClosingStockWeight}
            onExportCSV={stockData.handleExportLiveStockToCSV}
            onOpenPdfModal={() => stockData.setIsPdfModalOpen(true)}
            onTransfer={(rec: any) => stockData.setTransferRecord(rec)}
            onUpdateGodown={(rec: any) => {
              stockData.setUpdateGodownRecord(rec);
              stockData.setNewGodownName(rec.godown || '');
            }}
          />
        )}
      </div>

      {/* Modals & Popups */}
      <StockFormModal
        isOpen={stockData.isFormModalOpen}
        onClose={() => stockData.setIsFormModalOpen(false)}
        stockSubTab={stockData.stockSubTab}
        isEditing={stockData.isEditing}
        loading={stockData.loading}
        formState={stockData.formState}
        setFormState={stockData.setFormState}
        handleSubmit={stockData.handleSubmit}
        closingFormState={stockData.closingFormState}
        setClosingFormState={stockData.setClosingFormState}
        handleClosingSubmit={stockData.handleClosingSubmit}
        handleClosingFieldChange={stockData.handleClosingFieldChange}
        showCustomGradeClosing={stockData.showCustomGradeClosing}
        setShowCustomGradeClosing={stockData.setShowCustomGradeClosing}
        customGradeValueClosing={stockData.customGradeValueClosing}
        setCustomGradeValueClosing={stockData.setCustomGradeValueClosing}
        mergedGodowns={stockData.mergedGodowns}
        mergedAreas={stockData.mergedAreas}
        mergedGrades={stockData.mergedGrades}
        mergedUnits={stockData.mergedUnits}
      />

      <StockOpeningPrintModal
        isOpen={stockData.isPrintingModalOpen}
        onClose={() => stockData.setIsPrintingModalOpen(false)}
        printData={stockData.printData}
      />

      <StockClosingPrintModal
        isOpen={stockData.isClosingPrintModalOpen}
        onClose={() => stockData.setIsClosingPrintModalOpen(false)}
        printClosingData={stockData.printClosingData}
      />

      <StockCapacityAuditModal
        isOpen={stockData.showCapacityPopup}
        onClose={() => stockData.setShowCapacityPopup(false)}
        filteredSavedStocks={stockData.filteredSavedStocks}
        getGodownCapacityAndName={stockData.getGodownCapacityAndName}
        popupSearchQuery={stockData.popupSearchQuery}
        setPopupSearchQuery={stockData.setPopupSearchQuery}
      />

      <StockTransferModal
        transferRecord={stockData.transferRecord}
        onClose={() => stockData.setTransferRecord(null)}
        godowns={stockData.mergedGodowns}
        transferTargetGodown={stockData.transferTargetGodown}
        setTransferTargetGodown={stockData.setTransferTargetGodown}
        transferBales={stockData.transferBales}
        setTransferBales={stockData.setTransferBales}
        onExecuteTransfer={stockData.handleExecuteTransfer}
      />

      <StockUpdateGodownModal
        updateGodownRecord={stockData.updateGodownRecord}
        onClose={() => stockData.setUpdateGodownRecord(null)}
        newGodownName={stockData.newGodownName}
        setNewGodownName={stockData.setNewGodownName}
        onExecuteUpdateGodown={stockData.handleExecuteUpdateGodown}
      />

      <StockPdfSummaryModal
        isOpen={stockData.isPdfModalOpen}
        onClose={() => stockData.setIsPdfModalOpen(false)}
        liveStocks={stockData.calculateLiveStocks()}
        openingStocks={stockData.filteredSavedStocks}
      />
    </LegacyLayout>
  );
}
