import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatIndianCurrency } from '../lib/utils';
import { PaymentMaster } from '../types/payment.types';

export const exportPaymentReportCsv = (filteredPayments: PaymentMaster[]) => {
  if (filteredPayments.length === 0) {
    alert("No payment records to export.");
    return;
  }

  const headers = [
    'M.R No',
    'Supplier Name',
    'Advance Done',
    'Payable Amount',
    'Paid Amount',
    'Pending Amount',
    'Payment From',
    'Payment Settle date',
    'Tenor',
    'Re-Payment Date'
  ];

  const tableData = filteredPayments.map(p => {
    const payablep = Number(p.payable_amt || (p as any).total_amount || 0);
    const paidp = Number((p as any).paid_amount || 0);
    const pendingp = payablep - paidp;

    const isAdvanceYesp =
      (p.advance_payment_done || 'No').toLowerCase() === 'yes';

    const advance_payment_fromp = p.advance_payment_from || '';

    const paymentFrom =
      advance_payment_fromp === '' || advance_payment_fromp === '1'
        ? 'FROM BANK'
        : advance_payment_fromp === '2'
        ? 'RXIL'
        : advance_payment_fromp === '3'
        ? 'TReDS'
        : advance_payment_fromp === '4'
        ? 'Invoice Mart'
        : '';

    return [
      p.mr_no || '',
      p.party_name || p.supplier || '',
      isAdvanceYesp ? 'YES' : 'NO',
      payablep.toFixed(2),
      paidp.toFixed(2),
      pendingp.toFixed(2),
      paymentFrom,
      p.payment_settlementdate
        ? new Date(p.payment_settlementdate).toLocaleDateString('en-IN')
        : '',
      p.tenor || '',
      p.repayment_date
        ? new Date(p.repayment_date).toLocaleDateString('en-IN')
        : ''
    ];
  });

  // Escape CSV values
  const escapeCsvValue = (value: any) => {
    const stringValue = String(value ?? '');
    if (
      stringValue.includes(',') ||
      stringValue.includes('"') ||
      stringValue.includes('\n')
    ) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const csvContent = [
    headers.map(escapeCsvValue).join(','),
    ...tableData.map(row => row.map(escapeCsvValue).join(','))
  ].join('\r\n');

  // Add BOM for proper Excel UTF-8 support
  const blob = new Blob(
    ['\uFEFF' + csvContent],
    { type: 'text/csv;charset=utf-8;' }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Treds_Records_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportPaymentReportPdf = (filteredPayments: PaymentMaster[]) => {
  if (filteredPayments.length === 0) {
    alert("No payment records to export.");
    return;
  }
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text("Treds Report", 14, 15);
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

  const tableData = filteredPayments.map(p => {
    const payablep = Number(p.payable_amt || (p as any).total_amount || 0);
    const paidp = Number((p as any).paid_amount || 0);
    const pendingp = payablep - paidp;

    const isAdvanceYesp =
      (p.advance_payment_done || 'No').toLowerCase() === 'yes';

    const advance_payment_fromp = p.advance_payment_from || '';

    return [
      p.mr_no || '',
      p.party_name || p.supplier || '',
      isAdvanceYesp ? 'YES' : 'NO',
      formatIndianCurrency(payablep),
      formatIndianCurrency(paidp),
      formatIndianCurrency(pendingp),
      advance_payment_fromp === '' || advance_payment_fromp === '1'
        ? 'FROM BANK'
        : advance_payment_fromp === '2'
        ? 'RXIL'
        : advance_payment_fromp === '3'
        ? 'TReDS'
        : advance_payment_fromp === '4'
        ? 'Invoice Mart'
        : '',
      p.payment_settlementdate
        ? new Date(p.payment_settlementdate).toLocaleDateString('en-IN')
        : '',
      p.tenor || '',
      p.repayment_date
        ? new Date(p.repayment_date).toLocaleDateString('en-IN')
        : '',
    ];
  });

  autoTable(doc, {
    startY: 28,
    head: [['M.R No', 'Supplier Name', 'Advance Done', 'Payable Amount', 'Paid Amount', 'Pending Amount', 'Payment From', 'Payment Settle date', 'Tenor', 'Re-Payment Date']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [79, 70, 229] }
  });

  doc.save('Treds_Records.pdf');
};
