import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Generates a Sauda contract slip as a base64 PDF string (no data-URI prefix),
// ready to attach to an email. Shared by the Sauda Desk and the Sauda Register
// so both attach an identical slip.
export function generateSaudaPdfBase64(s: any): string {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Title & Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(42, 48, 136);
    doc.text('Bally Jute Company Limited', 105, 15, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(85, 85, 85);
    doc.text('REGISTERED OFFICE: 5, SREE CHARAN SARANI, BALLY, HOWRAH - 711201', 105, 20, { align: 'center' });

    doc.setLineWidth(0.5);
    doc.setDrawColor(0, 0, 0);
    doc.line(15, 23, 195, 23);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('SLIP NO:', 15, 30);
    doc.setFont('helvetica', 'normal');
    doc.text(`  ${s.sauda_no || ''}`, 35, 30);

    doc.setFont('helvetica', 'bold');
    doc.text('P.O. TYPE:', 120, 30);
    doc.setFont('helvetica', 'normal');
    doc.text(`  ${s.po_type || 'Normal'}`, 142, 30);

    doc.setFont('helvetica', 'bold');
    doc.text('DATE:', 15, 36);
    doc.setFont('helvetica', 'normal');
    doc.text(`  ${s.date || ''}`, 35, 36);

    doc.setFont('helvetica', 'bold');
    doc.text('SESSION:', 120, 36);
    doc.setFont('helvetica', 'normal');
    doc.text(`  ${s.session || '2026-2027'}`, 142, 36);

    doc.rect(15, 42, 180, 26);
    doc.setFont('helvetica', 'bold');
    doc.text('BROKER / VYAPARI:', 18, 48);
    doc.setFont('helvetica', 'normal');
    doc.text(`  ${s.broker || s.trader || ''}`, 58, 48);

    doc.setFont('helvetica', 'bold');
    doc.text('SUPPLIER:', 18, 54);
    doc.setFont('helvetica', 'normal');
    doc.text(`  ${s.supplier || ''}`, 58, 54);

    doc.setFont('helvetica', 'bold');
    doc.text('CHALLAN SUPPLIER:', 18, 60);
    doc.setFont('helvetica', 'normal');
    doc.text(`  ${s.challan_supplier || ''}`, 58, 60);

    doc.setFont('helvetica', 'bold');
    doc.text('AREA / CENTER:', 18, 66);
    doc.setFont('helvetica', 'normal');
    doc.text(`  ${s.area || ''}`, 58, 66);

    doc.setFont('helvetica', 'bold');
    doc.text('NO. OF LORRIES:', 15, 75);
    doc.setFont('helvetica', 'normal');
    doc.text(`  ${s.no_of_lorries || 1}`, 50, 75);

    doc.setFont('helvetica', 'bold');
    doc.text('UNITS/LORRY:', 75, 75);
    doc.setFont('helvetica', 'normal');
    doc.text(`  ${s.units_per_lorry || 'BALES'}`, 110, 75);

    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL UNIT:', 140, 75);
    doc.setFont('helvetica', 'bold');
    doc.text(`  ${s.total_unit || s.bales || 0}`, 168, 75);

    doc.setFont('helvetica', 'bold');
    doc.text('WT/LORRY (MT):', 15, 81);
    doc.setFont('helvetica', 'normal');
    doc.text(`  ${s.wt_per_lorry || 10.28}`, 50, 81);

    doc.setFont('helvetica', 'bold');
    doc.text('UNIT TYPE:', 75, 81);
    doc.setFont('helvetica', 'normal');
    doc.text(`  ${s.unit_type || s.unitType || 'BALES'}`, 110, 81);

    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL WEIGHT (MT):', 140, 81);
    doc.setFont('helvetica', 'bold');
    doc.text(`  ${s.total_wt_tons || 0}`, 180, 81);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(42, 48, 136);
    doc.text('QUALITY / GRADE SPECIFICATION DETAILS:', 15, 90);

    const headers = [['SL.', 'QUALITY / GRADE', 'QUANTITY (BALES)', 'AGENCY', 'MARKA', 'B. RATE (Rs/Qtl)']];
    const rows = (s.quality_details || []).map((q: any, idx: number) => [
      String(idx + 1),
      q.quality || '',
      String(q.qty || 0),
      q.agency || '',
      q.marka || '',
      `Rs ${(q.rs || 0).toLocaleString()}`,
    ]);

    autoTable(doc, {
      startY: 93,
      head: headers,
      body: rows,
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 2 },
      headStyles: {
        fillColor: [42, 48, 136],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { fontStyle: 'bold' },
        2: { halign: 'right', cellWidth: 35 },
        3: { cellWidth: 35 },
        4: { cellWidth: 30 },
        5: { halign: 'right', cellWidth: 35 },
      },
    });

    const finalY = Math.max((doc as any).lastAutoTable?.finalY || 100, 100) + 8;

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('SHIPMENT BY:', 15, finalY);
    doc.setFont('helvetica', 'normal');
    doc.text(`  ${s.shipment_date || ''}`, 55, finalY);

    doc.setFont('helvetica', 'bold');
    doc.text('SHIPMENT DAYS:', 115, finalY);
    doc.setFont('helvetica', 'normal');
    doc.text(`  ${s.shipment_days || 15} Days`, 155, finalY);

    doc.setFont('helvetica', 'bold');
    doc.text('PENALTY (Rs/Qtl/Day):', 15, finalY + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(`  Rs ${s.shipment_penalty || 5}`, 55, finalY + 6);

    doc.setFont('helvetica', 'bold');
    doc.text('MARKS CLAIM (Rs/Qtl):', 115, finalY + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(`  Rs ${s.marks_claim || 0}`, 155, finalY + 6);

    doc.setFont('helvetica', 'bold');
    doc.text('QUANTITY CLAIM (Kg/Bale):', 15, finalY + 12);
    doc.setFont('helvetica', 'normal');
    doc.text(`  ${s.quantity_claim || 0} Kg`, 65, finalY + 12);

    doc.setFont('helvetica', 'bold');
    doc.text('SUPERIOR / NORMAL MARKS:', 115, finalY + 12);
    doc.setFont('helvetica', 'normal');
    doc.text(`  ${s.superior_normal_marks || ''}`, 168, finalY + 12);

    doc.setFont('helvetica', 'bold');
    doc.text('BOOK RATE (Rs/Qtl):', 15, finalY + 18);
    doc.setFont('helvetica', 'bold');
    doc.text(`  Rs ${(s.b_rate || s.rate || 16300).toLocaleString()}`, 55, finalY + 18);

    doc.setFont('helvetica', 'bold');
    doc.text('S. DATE:', 115, finalY + 18);
    doc.setFont('helvetica', 'normal');
    doc.text(`  ${s.b_date || s.date || ''}`, 135, finalY + 18);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(85, 85, 85);
    doc.text('Prepared By: Bally Jute Company Limited PO Desk', 15, finalY + 30);
    doc.text('Authorized Signature: Bally Jute Company Limited Jute Division', 120, finalY + 30);

    const outputString = doc.output('datauristring');
    return outputString.split(',')[1];
  } catch (err) {
    console.error('Failed to generate Sauda PDF Base64:', err);
    return '';
  }
}
