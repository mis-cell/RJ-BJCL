import { jsPDF } from 'jspdf';
import { numberToWords } from './purchaseOrderCalculations';

export const generatePoPdf = (po: any): jsPDF => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Title & Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(42, 48, 136); // Deep blue
  doc.text("Bally Jute Company Limited", 105, 15, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(85, 85, 85);
  doc.text("REGISTERED OFFICE: 5, SREE CHARAN SARANI, BALLY, HOWRAH - 711201", 105, 20, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(220, 38, 38); // Red accent for PO Header
  doc.text("RAW JUTE PURCHASE ORDER", 105, 26, { align: 'center' });

  // Draw divider line
  doc.setLineWidth(0.5);
  doc.setDrawColor(0, 0, 0);
  doc.line(15, 29, 195, 29);

  // Metadata Block
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  
  const poDisplayNo = po.is_ptf ? po.ptf_no : po.no || 'BJCL-MANUAL';
  
  // Format Date Helper
  const formatDateStr = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  doc.text("ORDER NO:", 15, 36);
  doc.setFont('helvetica', 'normal');
  doc.text(`  ${poDisplayNo}`, 40, 36);

  doc.setFont('helvetica', 'bold');
  doc.text("DATE:", 120, 36);
  doc.setFont('helvetica', 'normal');
  doc.text(`  ${formatDateStr(po.date)}`, 145, 36);

  doc.setFont('helvetica', 'bold');
  doc.text("PO IDENTIFICATION:", 15, 42);
  doc.setFont('helvetica', 'normal');
  doc.text(`  ${po.po_identification || 'DR/4-2'}`, 55, 42);

  doc.setFont('helvetica', 'bold');
  doc.text("JC REG NO:", 120, 42);
  doc.setFont('helvetica', 'normal');
  doc.text(`  WBK00S202201929`, 145, 42);

  // Parties Box
  doc.rect(15, 48, 180, 24);
  
  doc.setFont('helvetica', 'bold');
  doc.text("BROKER:", 18, 54);
  doc.setFont('helvetica', 'normal');
  doc.text(`  ${(po.broker || 'N/A').toUpperCase()}`, 55, 54);

  doc.setFont('helvetica', 'bold');
  doc.text("SUPPLIER:", 18, 60);
  doc.setFont('helvetica', 'normal');
  doc.text(`  ${(po.supplier || 'N/A').toUpperCase()}`, 55, 60);

  doc.setFont('helvetica', 'bold');
  doc.text("CHALLAN SUPPLIER:", 18, 66);
  doc.setFont('helvetica', 'normal');
  doc.text(`  ${(po.challan_supplier || po.supplier || 'N/A').toUpperCase()}`, 55, 66);

  // Items Table Header
  doc.setFillColor(240, 240, 240);
  doc.rect(15, 78, 180, 8, 'F');
  doc.rect(15, 78, 180, 8);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text("Lorries", 17, 83);
  doc.text("Crop Year", 32, 83);
  doc.text("Agency", 52, 83);
  doc.text("Marka", 87, 83);
  doc.text("Quality / Grade", 122, 83);
  doc.text("Qty", 162, 83, { align: 'right' });
  doc.text("Rate / QUNTL", 192, 83, { align: 'right' });

  // Items Table Rows
  let currentY = 86;
  const items = po.items || [];
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  // pad items to at least 5 rows
  const padded = [...items];
  while (padded.length < 5) {
    padded.push({
      crop: '',
      agency_name: '',
      marka_name: '',
      grade_name: '',
      qty: '',
      rate: ''
    });
  }

  padded.forEach((item: any, idx: number) => {
    const isFirst = idx === 0;
    doc.rect(15, currentY, 180, 7);
    
    doc.setFont('helvetica', isFirst ? 'bold' : 'normal');
    if (isFirst) {
      doc.text(`${po.total_no_of_lorries || '1'}`, 17, currentY + 5);
      doc.text(`${item.crop || po.financial_year || '2026-27'}`, 32, currentY + 5);
      doc.text(`${(item.agency_name || po.area || '').toUpperCase()}`, 52, currentY + 5);
      doc.text(`${(item.marka_name || 'NO MARK').toUpperCase()}`, 87, currentY + 5);
    }
    
    doc.setFont('helvetica', 'bold');
    doc.text(`${(item.grade_name || '').toUpperCase()}`, 122, currentY + 5);
    
    doc.setFont('helvetica', 'normal');
    doc.text(`${item.qty ? Number(item.qty).toLocaleString() : ''}`, 162, currentY + 5, { align: 'right' });
    
    doc.setFont('helvetica', 'bold');
    const displayRate = item.rate ? Number(item.rate).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '';
    doc.text(displayRate ? `Rs ${displayRate}` : '', 192, currentY + 5, { align: 'right' });
    
    currentY += 7;
  });

  // Unit Summary Block
  currentY += 3;
  doc.rect(15, currentY, 180, 18);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text("UNIT PARAMETERS", 18, currentY + 5);
  
  const totalContractMtNum = Number(po.total_contract_mt || 0);
  const totalLorriesNum = Math.max(1, Number(po.total_no_of_lorries) || 1);
  const resolvedWtPerLorry =
    po.weight_per_lorry !== undefined && po.weight_per_lorry !== null && Number(po.weight_per_lorry) > 0
      ? Number(po.weight_per_lorry)
      : (totalContractMtNum > 0 ? totalContractMtNum / totalLorriesNum : 0);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Unit: ${po.purchase_unit_name || 'BALES'}`, 18, currentY + 10);
  doc.text(`${po.purchase_unit_name || 'BALES'} / Lorry: ${po.units_per_lorry || '0'}`, 60, currentY + 10);
  doc.text(`Total ${po.purchase_unit_name || 'BALES'}: ${po.total_units || '0'}`, 110, currentY + 10);
  doc.text(`Weight/Lorry: ${resolvedWtPerLorry.toFixed(3)} m.T`, 155, currentY + 10);

  doc.text(`Area: ${po.area || 'N/A'}`, 18, currentY + 15);
  doc.text(`Total Lorries: ${po.total_no_of_lorries || '1'} (${numberToWords(totalLorriesNum)})`, 60, currentY + 15);
  doc.text(`Total Contract Wt: ${totalContractMtNum.toFixed(3)} m.T`, 155, currentY + 15);

  // Delivery & Penalties Block
  currentY += 21;
  doc.rect(15, currentY, 180, 18);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text("DELIVERY & PENALTY RULES", 18, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Delivery: ${formatDateStr(po.delivery_from)} To ${formatDateStr(po.delivery_to)}`, 18, currentY + 10);
  doc.text(`Grace Days: ${po.grace_days || '0'}`, 100, currentY + 10);
  doc.text(`Delivery Penalty: Rs ${po.delivery_penalty || '5'}/day`, 145, currentY + 10);

  doc.text(`P.O Marka Type: ${po.marka_type || 'Normal'}`, 18, currentY + 15);
  doc.text(`Marka Penalty: Rs ${po.marka_penalty || '0'}/qntl`, 100, currentY + 15);
  doc.text(`Qty Penalty: Rs ${po.qty_penalty || '0'}/qntl`, 145, currentY + 15);

  // Terms and conditions
  currentY += 21;
  doc.rect(15, currentY, 180, 24);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text("TERMS & CONDITIONS:", 18, currentY + 5);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const termsText = po.terms_condition || 'Penalty Rs.5/day. Standard terms apply.';
  const splitTerms = doc.splitTextToSize(termsText.toUpperCase(), 174);
  doc.text(splitTerms, 18, currentY + 10);

  if (po.remarks) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.text(`Remarks: ${po.remarks}`, 18, currentY + 21);
  }

  // Signature Block
  currentY += 27;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text("For BALLY JUTE COMPANY LIMITED", 15, currentY + 5);
  doc.text("RECEIVED & ACCEPTED", 145, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text("__________________________________", 15, currentY + 16);
  doc.text("__________________________________", 145, currentY + 16);
  doc.text("Authorized Signatory (Raw Jute Dept.)", 15, currentY + 21);
  doc.text("Signature of Supplier / Broker", 145, currentY + 21);

  return doc;
};

export const downloadPoPdfFile = (po: any) => {
  try {
    const doc = generatePoPdf(po);
    const filename = `Purchase_Order_${po.ptf_no || po.no || 'Draft'}.pdf`;
    doc.save(filename);
  } catch (err) {
    console.error("Failed to generate PDF:", err);
    alert("Could not generate PDF download file.");
  }
};
