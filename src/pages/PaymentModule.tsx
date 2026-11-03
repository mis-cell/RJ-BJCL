import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, 
  ArrowLeft, 
  Plus, 
  AlertTriangle, 
  CheckCircle2, 
  X 
} from 'lucide-react';
import LegacyLayout, { LegacyButton } from '../components/LegacyLayout';
import { cn } from '../lib/utils';
import { 
  PaymentMaster, 
  PaymentDetailColumn, 
  emptyDetailColumn, 
  initialMaster 
} from "../types/payment.types";
import { 
  getColWtMt, 
  getColQtyQtl, 
  getColSettPct, 
  getColDeduction, 
  getColDeductionExplanation, 
  getColSettRate, 
  getColAmount, 
  parseGridOrItems, 
  findMatchedPoItem, 
  mapItemsToDetailCols, 
  getLinkedMrsForPo, 
  isMrAlreadyProcessed, 
  isPoEligibleForPayment 
} from "../utils/paymentCalculations";

import { usePaymentData } from '../components/payment/usePaymentData';
import { PaymentDashboardView } from '../components/payment/PaymentDashboardView';
import { PartyLedgerView } from '../components/payment/PartyLedgerView';
import { PaymentEntryForm } from '../components/payment/PaymentEntryForm';

export type { PaymentMaster, PaymentDetailColumn };
export { 
  emptyDetailColumn, 
  initialMaster,
  getColWtMt, 
  getColQtyQtl, 
  getColSettPct, 
  getColDeduction, 
  getColDeductionExplanation, 
  getColSettRate, 
  getColAmount, 
  parseGridOrItems, 
  findMatchedPoItem, 
  mapItemsToDetailCols, 
  getLinkedMrsForPo, 
  isMrAlreadyProcessed, 
  isPoEligibleForPayment 
};

export default function PaymentModule({ onClose }: { onClose?: () => void }) {
  const [viewMode, setViewMode] = useState<'dashboard' | 'entry' | 'ledger'>('dashboard');
  const [selectedLedgerParty, setSelectedLedgerParty] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [ledgerCurrentPage, setLedgerCurrentPage] = useState(1);
  const [ledgerPageSize, setLedgerPageSize] = useState(100);

  const {
    loading,
    errorMessage,
    setErrorMessage,
    successMessage,
    setSuccessMessage,
    showSuccessAnim,
    paymentList,
    verifiedArrivals,
    purchaseOrders,
    saudaCheckPoints,
    selectedPoNo,
    setSelectedPoNo,
    selectedPoData,
    selectedMrNo,
    setSelectedMrNo,
    isEdit,
    setIsEdit,
    masterData,
    setMasterData,
    detailCols,
    setDetailCols,
    activePoItems,
    sattaDiffsList,
    gradeMasterList,
    agencyMasterList,
    markaMasterList,
    areaMasterList,
    availableArrivals,
    eligiblePos,
    isPoEligibleForPaymentLocal,
    findMatchingPo,
    initPage,
    handlePoSelection,
    handleMrSelection,
    handleSavePayment,
    handleDeletePayment,
    handleEditPayment,
    handleExportPdf,
    handleExportPartyLedgerPdf
  } = usePaymentData(() => {
    setViewMode('dashboard');
  });

  return (
    <LegacyLayout
      title="Payment Module (payment_master)"
      subtitle="Complete Cash, Bank & Final Bill Payment Operations with Real-Time Database Sync"
      onClose={onClose}
    >
      {/* Top Header Actions Bar */}
      <div className="mb-4 bg-gradient-to-r from-[#8B1E2B] via-[#D94B5A] to-[#8B1E2B] text-white p-3 rounded-xl shadow-md border border-[#F06D6C]/40 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg text-white">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-white">Payment Operations</h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {viewMode === 'entry' ? (
            <LegacyButton
              onClick={() => { setViewMode('dashboard'); setMasterData(initialMaster()); setIsEdit(false); }}
              variant="secondary"
              icon={ArrowLeft}
            >
              Back
            </LegacyButton>
          ) : (
            <LegacyButton
              onClick={() => {
                setMasterData(initialMaster());
                setDetailCols([emptyDetailColumn(1), emptyDetailColumn(2), emptyDetailColumn(3), emptyDetailColumn(4)]);
                setIsEdit(false);
                setViewMode('entry');
              }}
              variant="primary"
              icon={Plus}
            >
              New Payment Voucher
            </LegacyButton>
          )}
        </div>
      </div>

      {/* Global Alerts */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between text-red-800 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="p-1 hover:bg-red-100 rounded cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between text-green-800 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="p-1 hover:bg-green-100 rounded cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* VIEW MODE 1: DASHBOARD VIEW */}
      {viewMode === 'dashboard' && (
        <PaymentDashboardView
          paymentList={paymentList}
          verifiedArrivals={verifiedArrivals}
          purchaseOrders={purchaseOrders}
          saudaCheckPoints={saudaCheckPoints}
          searchFilter={searchFilter}
          setSearchFilter={setSearchFilter}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          pageSize={pageSize}
          setPageSize={setPageSize}
          loading={loading}
          onRefresh={initPage}
          onEdit={p => {
            handleEditPayment(p);
            setViewMode('entry');
          }}
          onViewLedger={partyName => {
            setSelectedLedgerParty(partyName);
            setViewMode('ledger');
          }}
          onDelete={handleDeletePayment}
          onExportPdf={(customList) => handleExportPdf(customList || paymentList)}
        />
      )}

      {/* VIEW MODE 2: PARTY LEDGER ACCOUNTS VIEW */}
      {viewMode === 'ledger' && (
        <PartyLedgerView
          paymentList={paymentList}
          verifiedArrivals={verifiedArrivals}
          selectedLedgerParty={selectedLedgerParty}
          setSelectedLedgerParty={setSelectedLedgerParty}
          ledgerCurrentPage={ledgerCurrentPage}
          setLedgerCurrentPage={setLedgerCurrentPage}
          ledgerPageSize={ledgerPageSize}
          setLedgerPageSize={setLedgerPageSize}
          onExportPartyLedgerPdf={() => {
            const records = paymentList.filter(p => {
              if (!selectedLedgerParty) return true;
              const pName = (p.party_name || p.supplier || '').toLowerCase().trim();
              return pName === selectedLedgerParty.toLowerCase().trim();
            });
            handleExportPartyLedgerPdf(selectedLedgerParty, records);
          }}
          onBack={() => setViewMode('dashboard')}
        />
      )}

      {/* VIEW MODE 3: PAYMENT ENTRY FORM VIEW */}
      {viewMode === 'entry' && (
        <PaymentEntryForm
          masterData={masterData}
          setMasterData={setMasterData}
          detailCols={detailCols}
          setDetailCols={setDetailCols}
          selectedPoNo={selectedPoNo}
          setSelectedPoNo={setSelectedPoNo}
          selectedMrNo={selectedMrNo}
          setSelectedMrNo={setSelectedMrNo}
          selectedPoData={selectedPoData}
          isEdit={isEdit}
          eligiblePos={eligiblePos}
          availableArrivals={availableArrivals}
          verifiedArrivals={verifiedArrivals}
          paymentList={paymentList}
          purchaseOrders={purchaseOrders}
          saudaCheckPoints={saudaCheckPoints}
          gradeMasterList={gradeMasterList}
          areaMasterList={areaMasterList}
          agencyMasterList={agencyMasterList}
          activePoItems={activePoItems}
          sattaDiffsList={sattaDiffsList}
          isPoEligibleForPayment={isPoEligibleForPaymentLocal}
          handlePoSelection={handlePoSelection}
          handleMrSelection={handleMrSelection}
          findMatchingPo={findMatchingPo}
          handleSavePayment={handleSavePayment}
          onCancel={() => {
            setViewMode('dashboard');
            setMasterData(initialMaster());
          }}
          loading={loading}
          errorMessage={errorMessage}
          setErrorMessage={setErrorMessage}
        />
      )}

      {/* Success Animation Modal */}
      <AnimatePresence>
        {showSuccessAnim && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full text-center space-y-3">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-black text-slate-900">Payment Saved Successfully</h3>
              <p className="text-xs text-slate-500">
                Payment Record synced directly to `payment_master` table.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </LegacyLayout>
  );
}
