import React from 'react';
import { PaymentDashboardView } from '../payment/PaymentDashboardView';
import { PaymentMaster } from '../../types/payment.types';

export interface PaymentReportDashboardProps {
  paymentList: PaymentMaster[];
  filteredPayments?: PaymentMaster[];
  verifiedArrivals?: any[];
  purchaseOrders?: any[];
  saudaCheckPoints?: any[];
  totalPaidSum?: number;
  totalPayableSum?: number;
  totalPendingSum?: number;
  completedCount?: number;
  pendingCount?: number;
  searchFilter: string;
  setSearchFilter: (val: string) => void;
  loading: boolean;
  onRefresh: () => void;
  onExportCsv?: () => void;
  onExportPdf?: (customList?: PaymentMaster[]) => void;
  currentPage: number;
  pageSize: number;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  onEdit?: (p: PaymentMaster) => void;
  onViewLedger?: (partyName: string) => void;
  onDelete?: (voucherNo: string) => void;
}

export const PaymentReportDashboard: React.FC<PaymentReportDashboardProps> = (props) => {
  return (
    <PaymentDashboardView
      paymentList={props.paymentList}
      verifiedArrivals={props.verifiedArrivals || []}
      purchaseOrders={props.purchaseOrders || []}
      saudaCheckPoints={props.saudaCheckPoints || []}
      searchFilter={props.searchFilter}
      setSearchFilter={props.setSearchFilter}
      currentPage={props.currentPage}
      setCurrentPage={props.setCurrentPage}
      pageSize={props.pageSize}
      setPageSize={props.setPageSize}
      loading={props.loading}
      onRefresh={props.onRefresh}
      onEdit={props.onEdit || (() => {})}
      onViewLedger={props.onViewLedger || (() => {})}
      onDelete={props.onDelete || (() => {})}
      onExportPdf={props.onExportPdf || (() => {})}
    />
  );
};

export default PaymentReportDashboard;
